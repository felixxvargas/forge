// Vercel Edge Function — receives inbound emails via Resend webhook and forwards
// them to felixvgiles@gmail.com.
//
// Setup required (one-time, in Resend dashboard):
//   1. Add MX record for moonforge.app:  inbound.resend.com  (priority 10)
//   2. Go to Resend → Domains → moonforge.app → Inbound → Add route
//      Match: admin@moonforge.app
//      Endpoint: https://forge-social.app/api/emails/inbound
//   3. Optionally set INBOUND_WEBHOOK_SECRET in env + pass it as a header for security
//
// Required env vars:
//   RESEND_API_KEY   — your Resend API key
//   RESEND_FROM      — verified sender, e.g. "Forge <no-reply@forge-social.app>"

export const config = { runtime: 'edge' };

const FORWARD_TO = 'felixvgiles@gmail.com';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'Forge Inbound <no-reply@forge-social.app>';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: {
    from?: string;
    to?: string[];
    subject?: string;
    text?: string;
    html?: string;
    attachments?: Array<{ filename?: string; content?: string; contentType?: string }>;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const originalFrom = payload.from ?? 'unknown sender';
  const originalTo = Array.isArray(payload.to) ? payload.to.join(', ') : (payload.to ?? 'admin@moonforge.app');
  const subject = payload.subject ?? '(no subject)';

  // Build forwarded HTML body
  const forwardedHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px;">
  <div style="background:#f0f0f0;border-left:4px solid #7c3aed;padding:12px 16px;margin-bottom:20px;border-radius:4px;font-size:13px;color:#555;">
    <strong>Forwarded from:</strong> ${escHtml(originalFrom)}<br>
    <strong>Originally to:</strong> ${escHtml(originalTo)}<br>
    <strong>Subject:</strong> ${escHtml(subject)}
  </div>
  ${payload.html ?? `<pre style="white-space:pre-wrap;">${escHtml(payload.text ?? '')}</pre>`}
</body>
</html>`;

  // Build attachments array for Resend
  const attachments = (payload.attachments ?? [])
    .filter(a => a.content && a.filename)
    .map(a => ({
      filename: a.filename!,
      content: a.content!,
    }));

  const resendPayload: Record<string, unknown> = {
    from,
    to: [FORWARD_TO],
    subject: `Fwd: ${subject}`,
    html: forwardedHtml,
    reply_to: originalFrom,
  };

  if (attachments.length > 0) {
    resendPayload.attachments = attachments;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Resend forward failed:', data);
    return new Response(JSON.stringify({ error: data }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ forwarded: true, id: data.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
