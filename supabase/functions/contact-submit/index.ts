/**
 * contact-submit Edge Function
 *
 * Stores moonforge.app contact form submissions in the `contact_submissions`
 * table and sends an email notification via Resend.
 *
 * Setup (one-time):
 *   1. Sign up at https://resend.com and get an API key.
 *   2. Add your sending domain (or use the Resend sandbox for testing).
 *   3. Set the secret:
 *        npx supabase secrets set RESEND_API_KEY=re_... --project-ref xmxeafjpscgqprrreulh
 *   4. Deploy this function:
 *        npx supabase functions deploy contact-submit --project-ref xmxeafjpscgqprrreulh --no-verify-jwt
 *   5. Run the migration:
 *        npx supabase db push --project-ref xmxeafjpscgqprrreulh
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
    maxAge: 600,
  }),
);

app.post("/contact-submit", async (c) => {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { name, email, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return c.json({ error: "name, email, and message are required" }, 400);
  }

  // 1. Persist to database
  const { error: dbError } = await supabase
    .from("contact_submissions")
    .insert({ name: name.trim(), email: email.trim(), message: message.trim() });

  if (dbError) {
    console.error("DB insert error:", dbError.message);
    return c.json({ error: "Failed to save submission" }, 500);
  }

  // 2. Send email notification via Resend
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Moonforge Contact <noreply@moonforge.app>",
          to: ["felixvgiles@gmail.com"],
          reply_to: email.trim(),
          subject: `New contact from ${name.trim()} — moonforge.app`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
              <h2 style="color:#0e0e0e;margin-bottom:24px;">New Contact Form Submission</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;font-weight:600;width:80px;color:#555;">Name</td>
                  <td style="padding:8px 0;">${escapeHtml(name.trim())}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#555;">Email</td>
                  <td style="padding:8px 0;">
                    <a href="mailto:${escapeHtml(email.trim())}">${escapeHtml(email.trim())}</a>
                  </td>
                </tr>
              </table>
              <hr style="margin:20px 0;border:none;border-top:1px solid #eee;" />
              <p style="font-weight:600;color:#555;margin-bottom:8px;">Message</p>
              <p style="white-space:pre-wrap;color:#222;">${escapeHtml(message.trim())}</p>
            </div>
          `,
        }),
      });
      if (!emailRes.ok) {
        const err = await emailRes.text();
        console.error("Resend error:", err);
      }
    } catch (err) {
      // Email failure is non-fatal — submission is already saved
      console.error("Email send exception:", err);
    }
  } else {
    console.warn("RESEND_API_KEY not set — email notification skipped");
  }

  return c.json({ success: true });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(app.fetch);
