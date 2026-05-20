/**
 * send-push-notification Edge Function
 *
 * Called by a Supabase database webhook on notifications table INSERT.
 * Sends an FCM push notification via the HTTP v1 API using a service account.
 *
 * Setup: Database → Webhooks → New webhook
 *   Table: notifications, Event: INSERT, Function: send-push-notification
 *
 * Required secret: FCM_SERVICE_ACCOUNT (full service account JSON from Firebase Console
 *   → Project Settings → Service Accounts → Generate new private key)
 *
 * Deploy:
 *   npx supabase functions deploy send-push-notification --project-ref xmxeafjpscgqprrreulh
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const TYPE_BODY: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  mention: "mentioned you in a post",
  follow: "started following you",
  top_friend_request: "sent you a Top 8 request",
  reply: "replied to your post",
  repost: "reposted your post",
};

// Build a signed JWT and exchange it for an FCM OAuth access token.
async function getFcmAccessToken(sa: {
  client_email: string;
  private_key: string;
  project_id: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(claim)}`;

  // Strip PEM headers and decode
  const pemContent = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----\n?/, "")
    .replace(/\n?-----END PRIVATE KEY-----\n?/, "")
    .replace(/\n/g, "");
  const keyBytes = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const enc = new TextEncoder();
  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    enc.encode(signingInput),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) throw new Error("Failed to get FCM access token");
  return tokenData.access_token;
}

async function sendFcmPush(
  sa: { client_email: string; private_key: string; project_id: string },
  fcmToken: string,
  title: string,
  body: string,
  dataUrl: string,
): Promise<void> {
  const accessToken = await getFcmAccessToken(sa);
  const fcmRes = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          data: { url: dataUrl },
          android: { priority: "high" },
        },
      }),
    },
  );
  if (!fcmRes.ok) {
    const err = await fcmRes.text();
    throw new Error(`FCM v1 error: ${err}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let payload: { record?: { user_id?: string; actor_id?: string; type?: string } };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const record = payload.record;
  if (!record?.user_id || !record?.actor_id || !record?.type) {
    return new Response(JSON.stringify({ skipped: true, reason: "missing fields" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (record.user_id === record.actor_id) {
    return new Response(JSON.stringify({ skipped: true, reason: "self-action" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const saRaw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!saRaw) {
    console.warn("FCM_SERVICE_ACCOUNT not set — push skipped");
    return new Response(JSON.stringify({ skipped: true, reason: "no-key" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: tokenRow } = await supabase
    .from("device_tokens")
    .select("token")
    .eq("user_id", record.user_id)
    .maybeSingle();

  if (!tokenRow?.token) {
    return new Response(JSON.stringify({ skipped: true, reason: "no token" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", record.actor_id)
    .maybeSingle();

  const handle = (actor?.handle ?? "").replace(/^@/, "");
  const title = actor?.display_name || (handle ? `@${handle}` : "Someone");
  const body = TYPE_BODY[record.type] ?? "sent you a notification";

  try {
    const sa = JSON.parse(saRaw);
    await sendFcmPush(sa, tokenRow.token, title, body, "/notifications");
  } catch (err) {
    console.error("FCM send failed:", err);
    return new Response(JSON.stringify({ error: "FCM send failed" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
