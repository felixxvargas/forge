/**
 * notify-dm Edge Function
 *
 * Sends an email to a user when they receive a new direct message,
 * provided their DM email notifications are enabled.
 *
 * Deploy:
 *   npx supabase functions deploy notify-dm --project-ref xmxeafjpscgqprrreulh
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: {
    recipientId?: string;
    senderId?: string;
    senderName?: string;
    senderHandle?: string;
    messagePreview?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { recipientId, senderId, senderName, senderHandle, messagePreview } = body;
  if (!recipientId || !senderId) {
    return new Response(
      JSON.stringify({ error: "recipientId and senderId are required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // Check recipient's DM email notification preference
  const { data: profile } = await supabase
    .from("profiles")
    .select("dm_email_notifications, display_name, handle")
    .eq("id", recipientId)
    .single();

  // Opt-out: if explicitly set to false, skip
  if (profile?.dm_email_notifications === false) {
    return new Response(JSON.stringify({ skipped: true, reason: "opt-out" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Get recipient's email via admin API
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(recipientId);
  if (userError || !userData?.user?.email) {
    return new Response(JSON.stringify({ error: "Recipient not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const recipientEmail = userData.user.email;
  const recipientName = profile?.display_name || profile?.handle || "there";
  const senderDisplay = senderName || (senderHandle ? `@${senderHandle}` : "Someone");
  const previewText = messagePreview
    ? `"${messagePreview.slice(0, 120)}${messagePreview.length > 120 ? "…" : ""}"`
    : "a new message";

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set — DM email notification skipped");
    return new Response(JSON.stringify({ skipped: true, reason: "no-key" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Forge <notifications@forge-social.app>",
      to: [recipientEmail],
      subject: `${senderDisplay} sent you a message on Forge`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0a0612;color:#f0f0f0;padding:32px 28px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
          <div style="margin-bottom:24px;">
            <img src="https://www.forge-social.app/apple-touch-icon.png" width="48" height="48" alt="Forge" style="border-radius:12px;" />
          </div>
          <h2 style="color:#e2e2f0;margin:0 0 6px;font-size:20px;font-weight:700;">New message</h2>
          <p style="color:#9090a8;margin:0 0 20px;font-size:15px;">
            Hey ${escapeHtml(recipientName)}, <strong style="color:#c0c0d8;">${escapeHtml(senderDisplay)}</strong> sent you ${previewText === "a new message" ? "a message" : "a message on Forge"}.
          </p>
          ${
            messagePreview
              ? `<div style="background:#1a1228;border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:16px 18px;margin:0 0 24px;">
              <p style="margin:0;color:#d0d0e8;font-style:italic;font-size:15px;line-height:1.5;">${escapeHtml(previewText)}</p>
            </div>`
              : ""
          }
          <a href="https://www.forge-social.app/messages?to=${encodeURIComponent(senderId)}"
             style="display:inline-block;background:#7c3aed;color:#ffffff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
            Reply on Forge
          </a>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:28px 0 18px;" />
          <p style="margin:0;color:#55556a;font-size:12px;line-height:1.6;">
            You received this because you have DM email notifications enabled on Forge.
            <a href="https://www.forge-social.app/settings/notifications" style="color:#8b6fd4;text-decoration:none;">Manage notifications</a>
          </p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text();
    console.error("Resend error:", errText);
    return new Response(JSON.stringify({ error: "Email send failed" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
