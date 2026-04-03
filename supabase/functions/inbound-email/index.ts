/**
 * inbound-email Edge Function
 *
 * Receives Resend inbound email webhooks and forwards them to felixvgiles@gmail.com.
 *
 * Setup (one-time):
 *   1. Deploy this function:
 *        npx supabase functions deploy inbound-email --project-ref xmxeafjpscgqprrreulh --no-verify-jwt
 *   2. In Resend dashboard → Inbound → set webhook URL to:
 *        https://xmxeafjpscgqprrreulh.supabase.co/functions/v1/inbound-email
 */

import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FORWARD_TO = "felixvgiles@gmail.com";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: {
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string;
    text?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { from, to, subject, html, text } = payload;

  if (!from || !subject) {
    return new Response("Missing required fields", { status: 400 });
  }

  const toAddress = Array.isArray(to) ? to.join(", ") : (to ?? "");

  try {
    const { error } = await resend.emails.send({
      from: "Moonforge Inbound <noreply@moonforge.app>",
      to: [FORWARD_TO],
      reply_to: from,
      subject: `Fwd: ${subject}`,
      html: html
        ? `
          <div style="font-family:sans-serif;color:#888;font-size:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #eee;">
            <strong>From:</strong> ${escapeHtml(from)}<br/>
            <strong>To:</strong> ${escapeHtml(toAddress)}<br/>
            <strong>Subject:</strong> ${escapeHtml(subject)}
          </div>
          ${html}
        `
        : undefined,
      text: text
        ? `From: ${from}\nTo: ${toAddress}\nSubject: ${subject}\n\n${text}`
        : undefined,
    });

    if (error) {
      console.error("Resend forward error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Forward exception:", err);
    return new Response(JSON.stringify({ error: "Failed to forward email" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
