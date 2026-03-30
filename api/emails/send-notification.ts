// Vercel Edge Function — sends notification emails via Resend.
// Triggered server-side (e.g. from a Supabase webhook or background job).
//
// Required env vars:
//   RESEND_API_KEY   — your Resend API key (resend.com → API Keys)
//   RESEND_FROM      — verified sender address, e.g. "Forge <notifications@forge-social.app>"
//
// Usage:
//   POST /api/emails/send-notification
//   Body: { to: string, subject: string, recipientName: string, body: string }

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'Forge <no-reply@forge-social.app>';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { to?: string; subject?: string; recipientName?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!body.to || !body.subject) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const html = buildEmailHtml(body.recipientName ?? '', body.body ?? body.subject);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [body.to],
      subject: body.subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data }), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function buildEmailHtml(recipientName: string, notificationBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forge Notification</title>
</head>
<body style="margin:0;padding:0;background:#0f0a1a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a1a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">
        <!-- Logo -->
        <tr>
          <td style="padding-bottom:32px;">
            <span style="font-size:22px;font-weight:800;color:#E7FFC4;letter-spacing:-0.5px;">Forge</span>
          </td>
        </tr>
        <!-- Card -->
        <tr>
          <td style="background:#1c1228;border-radius:16px;padding:32px;">
            ${recipientName ? `<p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:14px;">Hi ${recipientName},</p>` : ''}
            <p style="margin:0 0 24px;color:#ffffff;font-size:16px;line-height:1.6;">${notificationBody}</p>
            <a href="https://forge-social.app/notifications"
               style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
              View on Forge
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;">
            <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;line-height:1.5;">
              You're receiving this because you have email notifications enabled on Forge.<br>
              <a href="https://forge-social.app/settings" style="color:rgba(255,255,255,0.4);">Manage notification settings</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
