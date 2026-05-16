// Vercel Cron Function — sends weekly notification digests.
// Schedule: vercel.json { "crons": [{ "path": "/api/emails/weekly-digest", "schedule": "0 9 * * 1" }] }
// (Every Monday at 9 am UTC)
//
// Required env vars: RESEND_API_KEY, RESEND_FROM, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_SERVICE_ROLE_KEY

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

const NOTIF_LABELS: Record<string, string> = {
  like: 'like',
  comment: 'comment',
  follow: 'new follower',
  mention: 'mention',
  reply: 'reply',
  repost: 'repost',
  reaction: 'reaction',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (!SERVICE_KEY || !RESEND_API_KEY) return new Response('Missing required env vars', { status: 500 });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const profiles: any[] = await supabaseQuery('/profiles', {
    email_notifications: 'eq.weekly',
    select: 'id,handle,display_name',
  });

  let sent = 0;

  for (const profile of profiles ?? []) {
    try {
      const notifications: any[] = await supabaseQuery('/notifications', {
        user_id: `eq.${profile.id}`,
        created_at: `gte.${oneWeekAgo}`,
        select: 'id,type',
      });

      if (!notifications || notifications.length === 0) continue;

      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${profile.id}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });
      const authUser = await authRes.json();
      const email = authUser?.email;
      if (!email) continue;

      // Count by type
      const counts: Record<string, number> = {};
      for (const n of notifications) {
        const key = n.type ?? 'other';
        counts[key] = (counts[key] ?? 0) + 1;
      }

      const name = profile.display_name || profile.handle || 'Gamer';
      const total = notifications.length;
      const subject = total === 1
        ? 'You have 1 new notification on Forge this week'
        : `You have ${total} new notifications on Forge this week`;

      const html = buildDigestHtml(name, total, counts);

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [email], subject, html }),
      });

      sent++;
    } catch {
      // Continue to next user on error
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
}

function buildDigestHtml(name: string, total: number, counts: Record<string, number>): string {
  // Build notification breakdown chips
  const CHIP_ORDER = ['follow', 'like', 'comment', 'reply', 'mention', 'repost', 'reaction'];
  const chips = CHIP_ORDER
    .filter(k => counts[k])
    .map(k => {
      const n = counts[k];
      const label = n === 1 ? `1 ${NOTIF_LABELS[k] ?? k}` : `${n} ${NOTIF_LABELS[k] ?? k}s`;
      return `<span style="display:inline-block;background:rgba(231,255,196,0.12);color:#E7FFC4;border:1px solid rgba(231,255,196,0.20);border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600;margin:4px 4px 0 0;">${label}</span>`;
    })
    .join('');

  // Remaining unknown types
  const knownTotal = CHIP_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0);
  const otherCount = total - knownTotal;
  const otherChip = otherCount > 0
    ? `<span style="display:inline-block;background:rgba(231,255,196,0.12);color:#E7FFC4;border:1px solid rgba(231,255,196,0.20);border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600;margin:4px 4px 0 0;">${otherCount} other</span>`
    : '';

  const FORGE_LOGO = `
    <svg width="28" height="22" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.8546 22.0745C23.7979 22.282 23.7454 22.5338 23.5728 22.7707C23.5288 23.1602 15.1934 22.7982 14.7127 22.7861C14.2111 22.7735 14.1341 22.1925 14.2267 21.8101C14.4018 21.0873 14.3769 20.9666 13.4012 20.9113C12.5315 20.862 12.1966 20.8773 11.1815 20.8909C10.5502 20.8993 10.3816 20.9074 10.1126 21.6804C9.99697 22.0128 9.64876 22.8544 9.27062 22.8359C8.44573 22.7954 4.60944 23.0175 3.78419 23.0361C2.63975 23.062 1.45237 23.1342 0.410346 22.9347C-0.760071 22.6379 0.894435 18.5131 1.39725 16.955C1.90006 15.3969 2.56631 12.3622 4.16834 11.5331C6.34674 10.4057 9.05856 10.4719 10.9357 8.62745C11.583 7.99141 11.6584 7.36046 11.7806 6.62056C11.8589 6.14617 11.5027 5.70097 11.0902 5.39449C10.8029 5.18109 10.5792 5.00749 9.59795 4.65701C8.70017 4.33633 8.3743 4.21834 7.18528 4.01055C6.3735 3.86869 4.77876 4.05397 4.77876 3.24283C4.77876 2.87926 5.36739 0.899542 5.47746 0.622489C5.47741 -0.174039 6.13479 0.0211001 9.17101 0.0211077C14.9725 0.0211221 20.6141 0.0731651 26.4059 0.0732023C27.31 0.0732081 28.5337 0.0732023 29.2956 0.0732023C28.8365 2.44179 28.4822 3.21115 27.3705 3.38842C26.0435 3.60001 23.1275 4.35326 21.7334 4.95082C21.1549 5.25938 20.7193 5.52426 20.2956 5.78788C19.4622 6.30628 19.2417 7.64898 19.3112 8.67594C19.4076 10.101 23.3879 10.5443 25.071 11.5331C26.6525 11.8949 25.2559 16.7747 25.071 17.3973C24.5922 19.0097 24.2238 20.7229 23.8546 22.0745Z" fill="#E7FFC4"/>
    </svg>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>Your weekly Forge digest</title>
</head>
<body style="margin:0;padding:0;background:#1c1228;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1228;padding:48px 16px 40px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;">

        <!-- Header: logo + wordmark -->
        <tr><td style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">${FORGE_LOGO}</td>
              <td style="vertical-align:middle;">
                <span style="font-size:22px;font-weight:800;color:#E7FFC4;letter-spacing:-0.5px;">Forge</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#2d1f47;border-radius:20px;padding:36px 40px;">

          <!-- Greeting -->
          <p style="margin:0 0 6px;color:rgba(240,244,248,0.55);font-size:14px;">Hey ${name},</p>
          <h1 style="margin:0 0 24px;color:#f0f4f8;font-size:26px;font-weight:700;line-height:1.2;">
            Your weekly digest
          </h1>

          <!-- Summary line -->
          <p style="margin:0 0 16px;color:rgba(240,244,248,0.75);font-size:16px;line-height:1.6;">
            You have <strong style="color:#E7FFC4;">${total} new notification${total !== 1 ? 's' : ''}</strong> on Forge this week.
          </p>

          <!-- Notification chips -->
          <div style="margin-bottom:32px;line-height:1;">
            ${chips}${otherChip}
          </div>

          <!-- Divider -->
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 32px;">

          <!-- CTA -->
          <a href="https://forge-social.app"
             style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.1px;">
            Open Forge
          </a>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;">
          <p style="margin:0;color:rgba(255,255,255,0.22);font-size:12px;line-height:1.6;">
            Weekly digest from Forge &nbsp;·&nbsp;
            <a href="https://forge-social.app/settings/notifications" style="color:rgba(255,255,255,0.35);text-decoration:underline;">Change email settings</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
