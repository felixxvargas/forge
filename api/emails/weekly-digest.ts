// Vercel Cron Function — sends weekly notification digests.
// Schedule this in vercel.json: { "crons": [{ "path": "/api/emails/weekly-digest", "schedule": "0 9 * * 1" }] }
// (Every Monday at 9am UTC)
//
// Required env vars: RESEND_API_KEY, RESEND_FROM, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_SERVICE_ROLE_KEY
// (Service role key needed to read auth.users emails — add in Vercel dashboard, NOT in client code)

export const config = { runtime: 'edge' };

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '';
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const FROM = process.env.RESEND_FROM ?? 'Forge <no-reply@forge-social.app>';

async function supabaseQuery(path: string, params?: Record<string, string>) {
  const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' },
  });
  return res.json();
}

export default async function handler(req: Request): Promise<Response> {
  // Allow manual triggers in dev (GET) and Vercel Cron (GET with cron secret)
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  if (!SERVICE_KEY || !RESEND_API_KEY) {
    return new Response('Missing required env vars', { status: 500 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all users with weekly digest enabled
  const profiles: any[] = await supabaseQuery('/profiles', {
    email_notifications: 'eq.weekly',
    select: 'id,handle,display_name,email_notifications',
  });

  let sent = 0;

  for (const profile of profiles ?? []) {
    try {
      // Count unread notifications in the past week
      const notifications: any[] = await supabaseQuery('/notifications', {
        user_id: `eq.${profile.id}`,
        created_at: `gte.${oneWeekAgo}`,
        select: 'id,type',
      });

      if (!notifications || notifications.length === 0) continue;

      // Get email from auth.users (requires service role)
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${profile.id}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const authUser = await authRes.json();
      const email = authUser?.email;
      if (!email) continue;

      const name = profile.display_name || profile.handle || 'Gamer';
      const count = notifications.length;
      const notifText = count === 1 ? '1 new notification' : `${count} new notifications`;

      const html = buildDigestHtml(name, count);

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: `${notifText} on Forge this week`,
          html,
        }),
      });

      sent++;
    } catch {
      // Continue to next user on error
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildDigestHtml(name: string, count: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0a1a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a1a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:800;color:#E7FFC4;letter-spacing:-0.5px;">Forge</span>
        </td></tr>
        <tr><td style="background:#1c1228;border-radius:16px;padding:32px;">
          <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:14px;">Hi ${name},</p>
          <h1 style="margin:0 0 16px;color:#ffffff;font-size:24px;font-weight:700;line-height:1.2;">
            Your weekly digest
          </h1>
          <p style="margin:0 0 24px;color:rgba(255,255,255,0.7);font-size:16px;line-height:1.6;">
            You have <strong style="color:#E7FFC4;">${count} new notification${count !== 1 ? 's' : ''}</strong> this week on Forge.
          </p>
          <a href="https://forge-social.app/notifications"
             style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
            View Notifications
          </a>
        </td></tr>
        <tr><td style="padding-top:24px;">
          <p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;line-height:1.5;">
            Weekly digest from Forge · <a href="https://forge-social.app/settings" style="color:rgba(255,255,255,0.4);">Change email settings</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
