// Vercel Edge Function — sends Android closed beta confirmation email via Resend.
//
// POST /api/emails/send-beta-confirmation
// Body: { to: string, recipientName?: string }

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

  let body: { to?: string; recipientName?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!body.to) {
    return new Response(JSON.stringify({ error: 'Missing required field: to' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const html = buildEmailHtml(body.recipientName ?? '');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [body.to],
      subject: "You're on the list — Forge Android Beta",
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data }), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function buildEmailHtml(recipientName: string): string {
  const greeting = recipientName ? `<p style="margin:0 0 16px;color:rgba(255,255,255,0.45);font-size:14px;">Hi ${recipientName},</p>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forge Android Beta</title>
</head>
<body style="margin:0;padding:0;background:#0f0a1a;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f0a1a;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0" role="presentation">

        <!-- Wordmark -->
        <tr>
          <td style="padding-bottom:36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:28px;font-weight:800;color:#E7FFC4;letter-spacing:-0.5px;">Forge</p>
            <span style="display:inline-block;background:rgba(231,255,196,0.12);color:#E7FFC4;font-size:10px;font-weight:700;letter-spacing:3px;padding:4px 14px;border-radius:100px;text-transform:uppercase;">Android Beta</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#1c1228;border-radius:20px;padding:36px 32px;border:1px solid rgba(255,255,255,0.06);">
            ${greeting}
            <h2 style="margin:0 0 14px;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">You're on the list! 🎮</h2>
            <p style="margin:0 0 28px;color:rgba(255,255,255,0.65);font-size:15px;line-height:1.7;">
              You've successfully signed up for the Forge Android closed beta. Here's what to expect next:
            </p>

            <!-- Steps -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);">
                  <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                    <td style="width:30px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:22px;height:22px;background:rgba(163,230,53,0.15);border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#a3e635;">1</span>
                    </td>
                    <td style="padding-left:10px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;">
                      Google Play will send you a <strong style="color:#ffffff;">beta invitation email</strong> within a week
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);">
                  <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                    <td style="width:30px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:22px;height:22px;background:rgba(163,230,53,0.15);border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#a3e635;">2</span>
                    </td>
                    <td style="padding-left:10px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;">
                      Accept the invite to become a tester on the <strong style="color:#ffffff;">Google Play Store</strong>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                    <td style="width:30px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:22px;height:22px;background:rgba(163,230,53,0.15);border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#a3e635;">3</span>
                    </td>
                    <td style="padding-left:10px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.6;">
                      Download <strong style="color:#ffffff;">Forge</strong> and start gaming — your feedback shapes the Android experience
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>

            <a href="https://forge-social.app"
               style="display:inline-block;background:#a3e635;color:#0f0a1a;font-weight:700;font-size:14px;padding:14px 30px;border-radius:12px;text-decoration:none;letter-spacing:0.1px;">
              Open Forge
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:28px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.18);font-size:12px;line-height:1.6;">
              You're receiving this because you requested Android beta access on Forge.<br>
              <a href="https://forge-social.app" style="color:rgba(255,255,255,0.28);text-decoration:none;">forge-social.app</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
