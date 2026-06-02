// Merged: inbound + send-beta-confirmation + send-notification + weekly-digest
// Routes dispatched by last URL segment
export const config = { runtime: 'edge' };

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '';

function jsonRes(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// ─── Inbound ─────────────────────────────────────────────────────────────────
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function handleInbound(req: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'Forge Inbound <no-reply@forge-social.app>';
  if (!apiKey) return jsonRes({ error: 'RESEND_API_KEY not configured' }, 500);

  let payload: { from?: string; to?: string[]; subject?: string; text?: string; html?: string; attachments?: Array<{ filename?: string; content?: string; contentType?: string }> };
  try { payload = await req.json(); } catch { return jsonRes({ error: 'Invalid JSON payload' }, 400); }

  const originalFrom = payload.from ?? 'unknown sender';
  const originalTo = Array.isArray(payload.to) ? payload.to.join(', ') : (payload.to ?? 'admin@moonforge.app');
  const subject = payload.subject ?? '(no subject)';
  const forwardedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:system-ui,sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px;"><div style="background:#f0f0f0;border-left:4px solid #7c3aed;padding:12px 16px;margin-bottom:20px;border-radius:4px;font-size:13px;color:#555;"><strong>Forwarded from:</strong> ${escHtml(originalFrom)}<br><strong>Originally to:</strong> ${escHtml(originalTo)}<br><strong>Subject:</strong> ${escHtml(subject)}</div>${payload.html ?? `<pre style="white-space:pre-wrap;">${escHtml(payload.text ?? '')}</pre>`}</body></html>`;

  const attachments = (payload.attachments ?? []).filter(a => a.content && a.filename).map(a => ({ filename: a.filename!, content: a.content! }));
  const resendPayload: Record<string, unknown> = { from, to: ['felixvgiles@gmail.com'], subject: `Fwd: ${subject}`, html: forwardedHtml, reply_to: originalFrom };
  if (attachments.length > 0) resendPayload.attachments = attachments;

  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(resendPayload) });
  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data }, res.status);
  return jsonRes({ forwarded: true, id: data.id });
}

// ─── Send Beta Confirmation ───────────────────────────────────────────────────
async function handleSendBetaConfirmation(req: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'Forge <no-reply@forge-social.app>';
  if (!apiKey) return jsonRes({ error: 'RESEND_API_KEY not configured' }, 500);

  let body: { to?: string; recipientName?: string };
  try { body = await req.json(); } catch { return jsonRes({ error: 'Invalid JSON' }, 400); }
  if (!body.to) return jsonRes({ error: 'Missing required field: to' }, 400);

  const greeting = body.recipientName ? `<p style="margin:0 0 16px;color:rgba(255,255,255,0.45);font-size:14px;">Hi ${body.recipientName},</p>` : '';
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Forge Android Beta</title></head><body style="margin:0;padding:0;background:#0f0a1a;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f0a1a;padding:48px 16px;"><tr><td align="center"><table width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="padding-bottom:36px;text-align:center;"><p style="margin:0 0 10px;font-size:28px;font-weight:800;color:#E7FFC4;letter-spacing:-0.5px;">Forge</p><span style="display:inline-block;background:rgba(231,255,196,0.12);color:#E7FFC4;font-size:10px;font-weight:700;letter-spacing:3px;padding:4px 14px;border-radius:100px;text-transform:uppercase;">Android Beta</span></td></tr><tr><td style="background:#1c1228;border-radius:20px;padding:36px 32px;border:1px solid rgba(255,255,255,0.06);">${greeting}<h2 style="margin:0 0 14px;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">You're on the list! 🎮</h2><p style="margin:0 0 28px;color:rgba(255,255,255,0.65);font-size:15px;line-height:1.7;">You've successfully signed up for the Forge Android closed beta. Google Play will send you a beta invitation email within a week.</p><a href="https://forge-social.app" style="display:inline-block;background:#a3e635;color:#0f0a1a;font-weight:700;font-size:14px;padding:14px 30px;border-radius:12px;text-decoration:none;">Open Forge</a></td></tr><tr><td style="padding-top:28px;text-align:center;"><p style="margin:0;color:rgba(255,255,255,0.18);font-size:12px;line-height:1.6;">You're receiving this because you requested Android beta access on Forge.<br><a href="https://forge-social.app" style="color:rgba(255,255,255,0.28);text-decoration:none;">forge-social.app</a></p></td></tr></table></td></tr></table></body></html>`;

  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [body.to], subject: "You're on the list — Forge Android Beta", html }) });
  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data }, res.status);
  return jsonRes({ id: data.id });
}

// ─── Send Notification ────────────────────────────────────────────────────────
async function handleSendNotification(req: Request): Promise<Response> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'Forge <no-reply@forge-social.app>';
  if (!apiKey) return jsonRes({ error: 'RESEND_API_KEY not configured' }, 500);

  let body: { to?: string; subject?: string; recipientName?: string; body?: string };
  try { body = await req.json(); } catch { return jsonRes({ error: 'Invalid JSON' }, 400); }
  if (!body.to || !body.subject) return jsonRes({ error: 'Missing required fields: to, subject' }, 400);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Forge Notification</title></head><body style="margin:0;padding:0;background:#0f0a1a;font-family:system-ui,-apple-system,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a1a;padding:40px 16px;"><tr><td align="center"><table width="100%" style="max-width:560px;"><tr><td style="padding-bottom:32px;"><span style="font-size:22px;font-weight:800;color:#E7FFC4;letter-spacing:-0.5px;">Forge</span></td></tr><tr><td style="background:#1c1228;border-radius:16px;padding:32px;">${body.recipientName ? `<p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:14px;">Hi ${body.recipientName},</p>` : ''}<p style="margin:0 0 24px;color:#ffffff;font-size:16px;line-height:1.6;">${body.body ?? body.subject}</p><a href="https://forge-social.app/notifications" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">View on Forge</a></td></tr><tr><td style="padding-top:24px;"><p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;line-height:1.5;">You're receiving this because you have email notifications enabled on Forge.<br><a href="https://forge-social.app/settings" style="color:rgba(255,255,255,0.4);">Manage notification settings</a></p></td></tr></table></td></tr></table></body></html>`;

  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [body.to], subject: body.subject, html }) });
  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data }, res.status);
  return jsonRes({ id: data.id });
}

// ─── Weekly Digest ────────────────────────────────────────────────────────────
const NOTIF_LABELS: Record<string, string> = { like: 'like', comment: 'comment', follow: 'new follower', mention: 'mention', reply: 'reply', repost: 'repost', reaction: 'reaction' };

async function supabaseQuery(path: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${SUPABASE_URL}/rest/v1${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' } });
  return res.json();
}

async function handleWeeklyDigest(req: Request): Promise<Response> {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
  const FROM = process.env.RESEND_FROM ?? 'Forge <no-reply@forge-social.app>';
  if (!SERVICE_KEY || !RESEND_API_KEY) return new Response('Missing required env vars', { status: 500 });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const profiles: any[] = await supabaseQuery('/profiles', { email_notifications: 'eq.weekly', select: 'id,email,display_name,handle' });

  let sent = 0, skipped = 0;
  for (const profile of profiles ?? []) {
    if (!profile.email) { skipped++; continue; }
    const notifications: any[] = await supabaseQuery('/notifications', { user_id: `eq.${profile.id}`, created_at: `gte.${oneWeekAgo}`, is_read: 'eq.false', select: 'type,created_at', order: 'created_at.desc', limit: '20' });
    if (!notifications?.length) { skipped++; continue; }

    const counts: Record<string, number> = {};
    for (const n of notifications) { counts[n.type] = (counts[n.type] ?? 0) + 1; }
    const rows = Object.entries(counts).map(([type, count]) => `<tr><td style="padding:8px 0;color:rgba(255,255,255,0.65);font-size:14px;border-bottom:1px solid rgba(255,255,255,0.06);">${NOTIF_LABELS[type] ?? type}</td><td style="padding:8px 0;text-align:right;color:#ffffff;font-weight:600;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.06);">${count}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0f0a1a;font-family:system-ui,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a1a;padding:40px 16px;"><tr><td align="center"><table width="100%" style="max-width:560px;"><tr><td style="padding-bottom:24px;"><span style="font-size:22px;font-weight:800;color:#E7FFC4;">Forge</span></td></tr><tr><td style="background:#1c1228;border-radius:16px;padding:32px;"><p style="margin:0 0 8px;color:rgba(255,255,255,0.45);font-size:14px;">Hi ${profile.display_name || profile.handle},</p><h2 style="margin:0 0 24px;color:#ffffff;font-size:20px;font-weight:700;">Your weekly activity</h2><table width="100%" cellpadding="0" cellspacing="0">${rows}</table><br><a href="https://forge-social.app/notifications" style="display:inline-block;background:#7c3aed;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-top:16px;">View all notifications</a></td></tr><tr><td style="padding-top:24px;"><p style="margin:0;color:rgba(255,255,255,0.25);font-size:12px;">You're receiving this weekly digest from Forge. <a href="https://forge-social.app/settings" style="color:rgba(255,255,255,0.4);">Manage preferences</a></p></td></tr></table></td></tr></table></body></html>`;

    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: FROM, to: [profile.email], subject: `Your Forge activity this week`, html }) });
    if (r.ok) sent++; else skipped++;
  }
  return new Response(JSON.stringify({ sent, skipped }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  const resource = new URL(req.url).pathname.split('/').pop();
  if (resource === 'inbound') return req.method === 'POST' ? handleInbound(req) : new Response('Method not allowed', { status: 405 });
  if (resource === 'send-beta-confirmation') return req.method === 'POST' ? handleSendBetaConfirmation(req) : new Response('Method not allowed', { status: 405 });
  if (resource === 'send-notification') return req.method === 'POST' ? handleSendNotification(req) : new Response('Method not allowed', { status: 405 });
  if (resource === 'weekly-digest') return handleWeeklyDigest(req);
  return new Response('Not found', { status: 404 });
}
