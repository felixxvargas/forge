import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as gamesAPI from "./games.tsx";

const app = new Hono();

// Supabase service-role client (server-side only — never exposed to the browser)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Storage bucket names (must match Supabase Storage configuration)
const STORAGE_BUCKETS = {
  AVATARS: "forge-avatars",
  BANNERS: "forge-banners",
  POST_MEDIA: "forge-post-media",
  COMMUNITY_ICONS: "forge-community-icons",
  COMMUNITY_BANNERS: "forge-community-banners",
};

// ===== HEALTH =====

app.get("/forge-api/health", (c) => {
  return c.json({ status: "ok", version: "v3" });
});

// ===== USERS =====

// Check if a handle is available.
// Queries the profiles table (source of truth) — not the legacy KV store.
// If the handle is taken by the authenticated user themselves, still returns available: true.
app.get("/forge-api/users/check-handle/:handle", async (c) => {
  try {
    const raw = c.req.param("handle");
    const handle = raw.replace(/^@/, "").toLowerCase();

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .or(`handle.ilike.${handle},handle.ilike.@${handle}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[check-handle] DB error:", error.message);
      return c.json({ available: true }); // fail open so onboarding is never blocked
    }

    if (!data) {
      return c.json({ available: true });
    }

    // Handle is taken — check if it belongs to the requesting user
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      if (user && user.id === data.id) {
        return c.json({ available: true }); // their own handle
      }
    }

    return c.json({ available: false });
  } catch (err) {
    console.error("[check-handle] error:", err);
    return c.json({ available: true }); // fail open
  }
});

// ===== UPLOAD =====

interface ModerationResult {
  safe: boolean;
  blur: boolean;
  remove: boolean;
  reason: string;
}

async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
  const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");

  if (!apiUser || !apiSecret || apiUser === "placeholder" || apiSecret === "placeholder") {
    return { safe: true, blur: false, remove: false, reason: "" };
  }

  try {
    const params = new URLSearchParams({
      url: imageUrl,
      models: "nudity-2.0,gore,weapon,hate-symbols",
      api_user: apiUser,
      api_secret: apiSecret,
    });

    const response = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`);
    if (!response.ok) {
      console.error("[moderation] Sightengine error:", response.status);
      return { safe: true, blur: false, remove: false, reason: "" };
    }

    const data = await response.json();
    const nudity = data.nudity ?? {};
    const gore = data.gore ?? {};
    const hate = data["hate-symbols"] ?? {};

    const shouldRemove =
      (nudity.sexual_activity ?? 0) > 0.85 ||
      (gore.prob ?? 0) > 0.90 ||
      (hate.prob ?? 0) > 0.85;

    if (shouldRemove) {
      const reasons: string[] = [];
      if ((nudity.sexual_activity ?? 0) > 0.85) reasons.push("explicit sexual content");
      if ((gore.prob ?? 0) > 0.90) reasons.push("graphic gore");
      if ((hate.prob ?? 0) > 0.85) reasons.push("hate symbols");
      return { safe: false, blur: false, remove: true, reason: reasons.join(", ") };
    }

    const shouldBlur =
      (nudity.suggestive ?? 0) > 0.70 ||
      (nudity.partial ?? 0) > 0.75;

    if (shouldBlur) {
      const reasons: string[] = [];
      if ((nudity.suggestive ?? 0) > 0.70) reasons.push("suggestive content");
      if ((nudity.partial ?? 0) > 0.75) reasons.push("partial nudity");
      return { safe: false, blur: true, remove: false, reason: reasons.join(", ") };
    }

    return { safe: true, blur: false, remove: false, reason: "" };
  } catch (err) {
    console.error("[moderation] error:", err);
    return { safe: true, blur: false, remove: false, reason: "" }; // fail open
  }
}

// Upload a file to Supabase Storage with image moderation.
// Frontend can also upload directly to Storage; this endpoint is kept for
// server-side moderation on post media uploads.
app.post("/forge-api/upload", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ code: 401, message: "Unauthorized" }, 401);
    }

    // Validate JWT using anon client (correct for user-issued JWTs)
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ code: 401, message: authError?.message ?? "Invalid JWT" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const bucketType = (formData.get("bucket") as string) || "avatar";

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const bucketMap: Record<string, string> = {
      avatar: STORAGE_BUCKETS.AVATARS,
      banner: STORAGE_BUCKETS.BANNERS,
      post: STORAGE_BUCKETS.POST_MEDIA,
      "community-icon": STORAGE_BUCKETS.COMMUNITY_ICONS,
      "community-banner": STORAGE_BUCKETS.COMMUNITY_BANNERS,
    };
    const bucketName = bucketMap[bucketType] ?? STORAGE_BUCKETS.AVATARS;
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error("[upload] storage error:", error.message);
      return c.json({ error: error.message }, 500);
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    if (file.type.startsWith("image/")) {
      const modResult = await moderateImage(publicUrl);
      if (modResult.remove) {
        await supabase.storage.from(bucketName).remove([fileName]);
        return c.json(
          { error: "This image was removed for violating community guidelines", reason: modResult.reason },
          400,
        );
      }
      if (modResult.blur) {
        return c.json({ path: data.path, url: publicUrl, blurred: true, reason: modResult.reason });
      }
    }

    return c.json({ path: data.path, url: publicUrl, blurred: false });
  } catch (err) {
    console.error("[upload] error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ===== GAMES =====

app.get("/forge-api/games", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const games = await gamesAPI.listGames(limit, offset);
    return c.json({ games });
  } catch (err) {
    console.error("[games/list] error:", err);
    return c.json({ error: "Failed to list games" }, 500);
  }
});

app.get("/forge-api/games/search/:query", async (c) => {
  try {
    const query = c.req.param("query");
    const limit = parseInt(c.req.query("limit") || "20");
    const games = await gamesAPI.searchGames(query, limit);
    return c.json({ games });
  } catch (err) {
    console.error("[games/search] error:", err);
    return c.json({ error: "Failed to search games" }, 500);
  }
});

app.post("/forge-api/games/batch", async (c) => {
  try {
    const { gameIds } = await c.req.json();
    if (!Array.isArray(gameIds)) {
      return c.json({ error: "gameIds must be an array" }, 400);
    }
    const games = await gamesAPI.getGames(gameIds);
    return c.json({ games });
  } catch (err) {
    console.error("[games/batch] error:", err);
    return c.json({ error: "Failed to fetch games" }, 500);
  }
});

// NOTE: /games/search/:query must be registered before /games/:gameId
// to prevent Hono matching "search" as a gameId param.
app.get("/forge-api/games/:gameId", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const game = await gamesAPI.getGame(gameId);
    return c.json({ game });
  } catch (err) {
    console.error("[games/get] error:", err);
    return c.json({ error: "Failed to fetch game" }, 404);
  }
});

app.get("/forge-api/games/:gameId/similar", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const genresParam = c.req.query("genres") || "";
    const genres = genresParam ? genresParam.split(",").map((g) => g.trim()).filter(Boolean) : [];
    const limit = parseInt(c.req.query("limit") || "8");
    const games = await gamesAPI.getSimilarGames(gameId, genres, limit);
    return c.json({ games });
  } catch (err) {
    console.error("[games/similar] error:", err);
    return c.json({ error: "Failed to fetch similar games" }, 500);
  }
});

app.get("/forge-api/games/:gameId/versions", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const title = c.req.query("title") || "";
    const limit = parseInt(c.req.query("limit") || "6");
    const games = await gamesAPI.getGameVersions(gameId, title, limit);
    return c.json({ games });
  } catch (err) {
    console.error("[games/versions] error:", err);
    return c.json({ error: "Failed to fetch game versions" }, 500);
  }
});

app.get("/forge-api/games/:gameId/expansions", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const result = await gamesAPI.getExpansions(gameId);
    return c.json(result);
  } catch (err) {
    console.error("[games/expansions] error:", err);
    return c.json({ error: "Failed to fetch expansions" }, 500);
  }
});

// Players who have this game in their user_games table (played or owned)
app.get("/forge-api/games/:gameId/players", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const { data, error } = await supabase
      .from("user_games")
      .select("status, profile:profiles!user_id(id, handle, display_name, profile_picture)")
      .eq("game_id", gameId);

    if (error) return c.json({ error: error.message }, 500);

    // Deduplicate by user and merge played/owned status
    const byUser: Record<string, any> = {};
    for (const row of data ?? []) {
      const p = (row as any).profile;
      if (!p) continue;
      if (!byUser[p.id]) byUser[p.id] = { ...p, played: false, owned: false };
      if ((row as any).status === "played") byUser[p.id].played = true;
      if ((row as any).status === "owned") byUser[p.id].owned = true;
    }
    return c.json({ players: Object.values(byUser) });
  } catch (err) {
    console.error("[games/players] error:", err);
    return c.json({ error: "Failed to fetch players" }, 500);
  }
});

app.post("/forge-api/games/:gameId/artwork", async (c) => {
  try {
    const gameId = c.req.param("gameId");
    const artworkData = await c.req.json();
    const artwork = await gamesAPI.addGameArtwork({ game_id: gameId, ...artworkData });
    return c.json({ artwork });
  } catch (err) {
    console.error("[games/artwork] error:", err);
    return c.json({ error: "Failed to add artwork" }, 500);
  }
});

app.post("/forge-api/games/moby", async (c) => {
  try {
    const { gameTitle } = await c.req.json();
    if (!gameTitle) {
      return c.json({ error: "gameTitle is required" }, 400);
    }
    const game = await gamesAPI.getOrCreateGame(gameTitle);
    if (!game) {
      return c.json({ error: "Game not found" }, 404);
    }
    return c.json({ game });
  } catch (err) {
    console.error("[games/moby] error:", err);
    return c.json({ error: "Failed to fetch game" }, 500);
  }
});

// Bulk seed top-rated games from IGDB into forge_games_17285bd7
app.post("/forge-api/seed/igdb-games", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const offset = parseInt(body.offset ?? 0);
    const limit = parseInt(body.limit ?? 500);
    const result = await gamesAPI.seedFromIGDB(offset, limit);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[seed/igdb-games] error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

Deno.serve(app.fetch);
