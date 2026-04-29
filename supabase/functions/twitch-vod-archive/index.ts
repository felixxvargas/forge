import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID") ?? "";
const TWITCH_CLIENT_SECRET = Deno.env.get("TWITCH_CLIENT_SECRET") ?? "";
const MAX_DURATION_SECONDS = 4 * 60 * 60; // 4 hours

app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "OPTIONS"] }));

// Parse Twitch duration string like "4h30m10s" into seconds
function parseTwitchDuration(dur: string): number {
  const h = dur.match(/(\d+)h/)?.[1] ?? "0";
  const m = dur.match(/(\d+)m/)?.[1] ?? "0";
  const s = dur.match(/(\d+)s/)?.[1] ?? "0";
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s);
}

async function refreshTwitchToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function getTwitchVods(userId: string, accessToken: string): Promise<any[]> {
  const res = await fetch(
    `https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=20`,
    { headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

// POST /twitch-vod-archive/oauth-callback
// Exchanges Twitch OAuth code for tokens, stores on profile
app.post("/twitch-vod-archive/oauth-callback", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const { code, redirect_uri, user_id } = await c.req.json().catch(() => ({}));
  if (!code || !redirect_uri || !user_id) return c.json({ error: "Missing params" }, 400);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user || user.id !== user_id) return c.json({ error: "Unauthorized" }, 401);

  // Exchange code for tokens
  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri,
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return c.json({ error: `Twitch token exchange failed: ${err}` }, 500);
  }
  const tokens = await tokenRes.json();

  // Get Twitch user info
  const userRes = await fetch("https://api.twitch.tv/helix/users", {
    headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return c.json({ error: "Failed to fetch Twitch user" }, 500);
  const userData = await userRes.json();
  const twitchUser = userData.data?.[0];
  if (!twitchUser) return c.json({ error: "No Twitch user found" }, 500);

  await supabase.from("profiles").update({
    twitch_user_id: twitchUser.id,
    twitch_display_name: twitchUser.display_name,
    twitch_access_token: tokens.access_token,
    twitch_refresh_token: tokens.refresh_token,
    twitch_token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 14400) * 1000).toISOString(),
    twitch_archive_enabled: true,
  }).eq("id", user_id);

  return c.json({ twitch_user_id: twitchUser.id, twitch_display_name: twitchUser.display_name });
});

// POST /twitch-vod-archive/sync
// Body: { user_id: string }
// Called by the frontend after Twitch OAuth to pull in VODs
app.post("/twitch-vod-archive/sync", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const { user_id } = await c.req.json().catch(() => ({}));
  if (!user_id) return c.json({ error: "Missing user_id" }, 400);

  // Verify caller owns this user_id via JWT
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user || user.id !== user_id) return c.json({ error: "Unauthorized" }, 401);

  // Fetch profile with Twitch tokens
  const { data: profile } = await supabase
    .from("profiles")
    .select("twitch_user_id, twitch_access_token, twitch_refresh_token, twitch_token_expires_at, twitch_archive_enabled")
    .eq("id", user_id)
    .maybeSingle();

  if (!profile?.twitch_user_id || !profile?.twitch_access_token) {
    return c.json({ error: "Twitch not connected" }, 400);
  }
  if (!profile.twitch_archive_enabled) {
    return c.json({ error: "Archive not enabled" }, 400);
  }

  let accessToken = profile.twitch_access_token;

  // Refresh token if expired
  const expiresAt = profile.twitch_token_expires_at ? new Date(profile.twitch_token_expires_at).getTime() : 0;
  if (Date.now() > expiresAt - 60_000) {
    const refreshed = await refreshTwitchToken(profile.twitch_refresh_token ?? "");
    if (!refreshed) return c.json({ error: "Failed to refresh Twitch token" }, 500);
    accessToken = refreshed.access_token;
    await supabase.from("profiles").update({
      twitch_access_token: refreshed.access_token,
      twitch_refresh_token: refreshed.refresh_token,
      twitch_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    }).eq("id", user_id);
  }

  const vods = await getTwitchVods(profile.twitch_user_id, accessToken);
  let synced = 0;
  let skipped = 0;

  for (const vod of vods) {
    const durationSec = parseTwitchDuration(vod.duration ?? "");
    if (durationSec > MAX_DURATION_SECONDS) { skipped++; continue; }

    const thumbnailUrl = (vod.thumbnail_url ?? "").replace("%{width}", "640").replace("%{height}", "360");

    const { error: upsertErr } = await supabase.from("stream_archives").upsert({
      user_id,
      twitch_vod_id: vod.id,
      title: vod.title ?? "Untitled Stream",
      duration_seconds: durationSec,
      thumbnail_url: thumbnailUrl,
      download_status: "pending",
      recorded_at: vod.created_at,
    }, { onConflict: "user_id,twitch_vod_id", ignoreDuplicates: true });

    if (!upsertErr) synced++;
  }

  return c.json({ synced, skipped, total: vods.length });
});

// POST /twitch-vod-archive/disconnect
// Removes Twitch tokens from profile
app.post("/twitch-vod-archive/disconnect", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const { user_id } = await c.req.json().catch(() => ({}));
  if (!user_id) return c.json({ error: "Missing user_id" }, 400);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user || user.id !== user_id) return c.json({ error: "Unauthorized" }, 401);

  await supabase.from("profiles").update({
    twitch_user_id: null,
    twitch_display_name: null,
    twitch_access_token: null,
    twitch_refresh_token: null,
    twitch_token_expires_at: null,
    twitch_archive_enabled: false,
  }).eq("id", user_id);

  return c.json({ ok: true });
});

// POST /twitch-vod-archive/delete-archive
// Soft-deletes a single archive entry
app.post("/twitch-vod-archive/delete-archive", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const { archive_id } = await c.req.json().catch(() => ({}));
  if (!archive_id) return c.json({ error: "Missing archive_id" }, 400);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);

  const { error } = await supabase
    .from("stream_archives")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", archive_id)
    .eq("user_id", user.id);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// POST /twitch-vod-archive/retention-response
// Records that the user interacted with the retention prompt
app.post("/twitch-vod-archive/retention-response", async (c) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const { archive_id, keep } = await c.req.json().catch(() => ({}));
  if (!archive_id) return c.json({ error: "Missing archive_id" }, 400);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) return c.json({ error: "Unauthorized" }, 401);

  if (!keep) {
    await supabase.from("stream_archives")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", archive_id).eq("user_id", user.id);
  } else {
    // Reset the retention clock for another year
    await supabase.from("stream_archives")
      .update({ retention_prompted_at: null, recorded_at: new Date().toISOString() })
      .eq("id", archive_id).eq("user_id", user.id);
  }

  return c.json({ ok: true });
});

Deno.serve(app.fetch);
