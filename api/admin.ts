// Merged: stats + scheduled-posts + push-broadcast
// Routes dispatched by last URL path segment.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const FCM_SA_RAW = process.env.FCM_SERVICE_ACCOUNT ?? '';

// ─── Shared helpers ───────────────────────────────────────────────────────────
async function sb<T = unknown>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json', Prefer: 'return=representation' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : ([] as unknown as T);
}

async function validateAdmin(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` } });
  if (!userRes.ok) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const { id: userId } = await userRes.json();
  const [profile] = await sb<Array<{ is_admin: boolean }>>('GET', `/profiles?id=eq.${userId}&select=is_admin&limit=1`);
  if (!profile?.is_admin) { res.status(403).json({ error: 'Forbidden' }); return null; }
  return userId;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString(); }

async function countTable(table: string, since?: string): Promise<number> {
  const params = new URLSearchParams({ select: 'id', limit: '1' });
  if (since) params.set('created_at', `gte.${since}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' } });
  return parseInt((res.headers.get('Content-Range') ?? '0-0/0').split('/')[1] ?? '0', 10);
}

const STANDARD_LIST_KEYS = ['recentlyPlayed', 'playedBefore', 'favorites', 'wishlist', 'library', 'completed', 'custom', 'lfg'];

async function getListStats() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=game_lists`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  const data = await res.json();
  if (!Array.isArray(data)) return { total: 0, customTotal: 0, updateCount: 0 };
  let standardTotal = 0, customTotal = 0, updateCount = 0;
  for (const profile of data) {
    const gl = profile.game_lists ?? {};
    for (const key of STANDARD_LIST_KEYS) { if (Array.isArray(gl[key]) && gl[key].length > 0) standardTotal++; }
    customTotal += (gl.customLists ?? []).length;
    updateCount += gl._updateCount ?? 0;
  }
  return { total: standardTotal + customTotal, customTotal, updateCount };
}

async function getOnboardingFunnel(since?: string) {
  async function countWhere(filters: Record<string, string>): Promise<number> {
    const p = new URLSearchParams({ select: 'id', limit: '1' });
    for (const [k, v] of Object.entries(filters)) p.set(k, v);
    if (since) p.set('created_at', `gte.${since}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/forge_onboarding_events?${p}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' } });
    return parseInt((res.headers.get('Content-Range') ?? '0-0/0').split('/')[1] ?? '0', 10);
  }
  const [started, interests, follow, username, completed, errors] = await Promise.all([
    countWhere({ event: 'eq.onboarding_started' }), countWhere({ event: 'eq.step_started', step: 'eq.interests' }),
    countWhere({ event: 'eq.step_started', step: 'eq.follow' }), countWhere({ event: 'eq.step_started', step: 'eq.username' }),
    countWhere({ event: 'eq.onboarding_completed' }), countWhere({ event: 'eq.onboarding_error' }),
  ]);
  return { started, interests_started: interests, follow_started: follow, username_started: username, completed, errors, completion_rate: started > 0 ? Math.round((completed / started) * 100) : 0 };
}

async function handleStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const t7 = daysAgo(7), t30 = daysAgo(30), t90 = daysAgo(90), t365 = daysAgo(365);
  const [totalUsers, users7, users30, users90, users365, totalPosts, posts30, posts90, posts365, totalUserGames, games30, games90, games365, totalCommunities, totalFlares, flares30, flares90, flares365, listStats, onboardingAll, onboarding30, follows30, follows90, follows365, groupJoins30, groupJoins90, groupJoins365, groupCreations30, groupCreations90, groupCreations365, totalInsights, totalEdits, insightAuthorRows, insightContribRows] = await Promise.all([
    countTable('profiles'), countTable('profiles', t7), countTable('profiles', t30), countTable('profiles', t90), countTable('profiles', t365),
    countTable('posts'), countTable('posts', t30), countTable('posts', t90), countTable('posts', t365),
    countTable('user_games'), countTable('user_games', t30), countTable('user_games', t90), countTable('user_games', t365),
    countTable('communities'),
    countTable('lfg_flares'), countTable('lfg_flares', t30), countTable('lfg_flares', t90), countTable('lfg_flares', t365),
    getListStats(), getOnboardingFunnel(), getOnboardingFunnel(t30),
    countTable('follows', t30), countTable('follows', t90), countTable('follows', t365),
    countTable('community_members', t30), countTable('community_members', t90), countTable('community_members', t365),
    countTable('communities', t30), countTable('communities', t90), countTable('communities', t365),
    countTable('game_insights'), countTable('insight_edits'),
    fetch(`${SUPABASE_URL}/rest/v1/game_insights?select=user_id`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }).then(r => r.ok ? r.json() : []).catch(() => []),
    fetch(`${SUPABASE_URL}/rest/v1/insight_edits?select=user_id&status=eq.accepted`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }).then(r => r.ok ? r.json() : []).catch(() => []),
  ]);
  const insightAuthors = new Set((insightAuthorRows as any[]).map((r: any) => r.user_id)).size;
  const insightContributors = new Set((insightContribRows as any[]).map((r: any) => r.user_id)).size;
  const [recentRes, mauRes, sessionRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/profiles?select=handle,display_name,created_at&order=created_at.desc&limit=10`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }),
    fetch(`${SUPABASE_URL}/rest/v1/rpc/get_auth_user_activity`, { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: '{}' }),
    fetch(`${SUPABASE_URL}/rest/v1/forge_session_events?select=platform,duration_s,event&event=in.(session_start,session_end)&created_at=gte.${t30}`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }),
  ]);
  const recentUsers = await recentRes.json();
  let mau = 0, wau = 0, dau = 0;
  if (mauRes.ok) { const d = await mauRes.json().catch(() => ({})); mau = d?.mau ?? 0; wau = d?.wau ?? 0; dau = d?.dau ?? 0; }
  let avgSessionDurationS = 0;
  const platformSplit: Record<string, number> = { web: 0, android: 0 };
  if (sessionRes.ok) {
    const rows: any[] = await sessionRes.json().catch(() => []);
    const durations = rows.filter((r: any) => r.event === 'session_end' && r.duration_s != null).map((r: any) => r.duration_s);
    if (durations.length > 0) avgSessionDurationS = Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length);
    for (const r of rows.filter((r: any) => r.event === 'session_start')) { platformSplit[r.platform] = (platformSplit[r.platform] ?? 0) + 1; }
  }
  return res.json({ users: { total: totalUsers, last7Days: users7, last30Days: users30, last90Days: users90, last365Days: users365 }, posts: { total: totalPosts, last30Days: posts30, last90Days: posts90, last365Days: posts365 }, games: { total: totalUserGames, last30Days: games30, last90Days: games90, last365Days: games365 }, communities: { total: totalCommunities }, flares: { total: totalFlares, last30Days: flares30, last90Days: flares90, last365Days: flares365 }, lists: listStats, insights: { total: totalInsights, edits: totalEdits, authors: insightAuthors, contributors: insightContributors }, onboarding: { allTime: onboardingAll, last30Days: onboarding30 }, engagement: { mau, wau, dau, avgSessionDurationS, platformSplit }, userActions: { follows: { last30Days: follows30, last90Days: follows90, last365Days: follows365 }, groupJoins: { last30Days: groupJoins30, last90Days: groupJoins90, last365Days: groupJoins365 }, groupCreations: { last30Days: groupCreations30, last90Days: groupCreations90, last365Days: groupCreations365 }, posts: { last30Days: posts30, last90Days: posts90, last365Days: posts365 } }, recentUsers: recentUsers ?? [], generatedAt: new Date().toISOString() });
}

// ─── Scheduled Posts ──────────────────────────────────────────────────────────
async function handleScheduledPosts(req: VercelRequest, res: VercelResponse, adminUserId: string) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const posts = await sb<Array<{ user_id: string; [key: string]: unknown }>>('GET', '/scheduled_posts?select=*&order=scheduled_at.desc');
    if (!posts.length) return res.json(posts);
    const uniqueIds = [...new Set(posts.map(p => p.user_id))];
    const profiles = await sb<Array<{ id: string; handle: string; display_name: string }>>('GET', `/profiles?id=in.(${uniqueIds.join(',')})&select=id,handle,display_name`);
    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    return res.json(posts.map(p => ({ ...p, author: profileMap[p.user_id] ?? null })));
  }
  if (req.method === 'PATCH') {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const { content, scheduled_at, url } = req.body ?? {};
    const [post] = await sb<Array<{ status: string }>>('GET', `/scheduled_posts?id=eq.${id}&select=status&limit=1`);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.status === 'published') return res.status(409).json({ error: 'Published posts cannot be edited' });
    const patch: Record<string, unknown> = {};
    if (content !== undefined) patch.content = content;
    if (scheduled_at !== undefined) patch.scheduled_at = new Date(scheduled_at).toISOString();
    if (url !== undefined) patch.url = url || null;
    if (post.status === 'failed') patch.status = 'pending';
    const [updated] = await sb<Array<object>>('PATCH', `/scheduled_posts?id=eq.${id}`, patch);
    return res.json(updated);
  }
  if (req.method === 'POST') {
    const { action, content, scheduled_at, game_ids, game_titles } = req.body ?? {};
    if (action === 'trigger') {
      const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://forge-social.app';
      const r = await fetch(`${origin}/api/cron/publish-scheduled-posts`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
      return res.json(await r.json());
    }
    if (action === 'run_selected') {
      const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
      if (!ids.length) return res.status(400).json({ error: 'ids required' });
      let published = 0; const errors: string[] = [];
      for (const id of ids) {
        try {
          const [post] = await sb<Array<{ user_id: string; content: string; game_ids: string[]; game_titles: string[]; images: string[]; url: string | null; status: string }>>('GET', `/scheduled_posts?id=eq.${id}&status=in.(pending,failed)&select=*&limit=1`);
          if (!post) { errors.push(`${id}: not found or wrong status`); continue; }
          const gameIds = post.game_ids ?? [], gameTitles = post.game_titles ?? [];
          const [newPost] = await sb<Array<{ id: string }>>('POST', '/rpc/create_scheduled_post', { p_user_id: post.user_id, p_content: post.content, p_images: post.images ?? [], p_image_alts: [], p_game_ids: gameIds, p_game_titles: gameTitles, p_game_id: gameIds[0] ?? null, p_game_title: gameTitles[0] ?? null, p_url: post.url ?? null });
          await sb('PATCH', `/scheduled_posts?id=eq.${id}`, { status: 'published', published_post_id: newPost.id });
          published++;
        } catch (err) { const msg = String(err); errors.push(`${id}: ${msg}`); }
      }
      return res.json({ published, errors });
    }
    if (action === 'create') {
      if (!content || !scheduled_at) return res.status(400).json({ error: 'content and scheduled_at are required' });
      const { url } = req.body ?? {};
      const ids: string[] = Array.isArray(game_ids) ? game_ids : [], titles: string[] = Array.isArray(game_titles) ? game_titles : [];
      const [created] = await sb<Array<object>>('POST', '/scheduled_posts', { user_id: adminUserId, content, scheduled_at, url: url ?? null, game_ids: ids, game_titles: titles, status: 'pending', images: [] });
      return res.status(201).json(created);
    }
    return res.status(400).json({ error: 'Unknown action' });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id is required' });
    const [post] = await sb<Array<{ status: string }>>('GET', `/scheduled_posts?id=eq.${id}&select=status&limit=1`);
    if (!post) return res.status(404).json({ error: 'Not found' });
    await sb('DELETE', `/scheduled_posts?id=eq.${id}`);
    return res.status(204).end();
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ─── Push Broadcast ───────────────────────────────────────────────────────────
async function getFcmAccessToken(sa: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, sub: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600, scope: 'https://www.googleapis.com/auth/firebase.messaging' })}`;
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256'); sign.update(unsigned);
  const jwt = `${unsigned}.${sign.sign(sa.private_key, 'base64url')}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  if (!tokenRes.ok) throw new Error(`OAuth token exchange failed: ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();
  return access_token as string;
}

async function sendFcm(accessToken: string, projectId: string, token: string, title: string, body: string, url: string): Promise<boolean> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { token, notification: { title, body }, data: { url }, android: { priority: 'high', notification: { sound: 'default' } } } }) });
  return res.ok;
}

async function handlePushBroadcast(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { title, body: bodyText, url = '/feed' } = req.body ?? {};
  if (!title?.trim() || !bodyText?.trim()) return res.status(400).json({ error: 'title and body are required' });
  if (!FCM_SA_RAW) return res.status(500).json({ error: 'FCM_SERVICE_ACCOUNT not configured' });
  let sa: Record<string, string>;
  try { sa = JSON.parse(FCM_SA_RAW); } catch { return res.status(500).json({ error: 'FCM_SERVICE_ACCOUNT is not valid JSON' }); }
  const tokens = await sb<Array<{ token: string; user_id: string }>>('GET', '/device_tokens?select=token,user_id&order=created_at.desc');
  if (!tokens.length) return res.json({ sent: 0, failed: 0, message: 'No device tokens registered' });
  const accessToken = await getFcmAccessToken(sa);
  let sent = 0, failed = 0;
  const BATCH = 50;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const results = await Promise.allSettled(tokens.slice(i, i + BATCH).map(({ token: t }) => sendFcm(accessToken, sa.project_id, t, title.trim(), bodyText.trim(), url)));
    for (const r of results) { if (r.status === 'fulfilled' && r.value) sent++; else failed++; }
  }
  return res.json({ sent, failed, total: tokens.length });
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server misconfigured' });
  const resource = (req.url ?? '').split('?')[0].split('/').pop() ?? '';

  // Stats uses its own admin validation (edge-style, inline)
  if (resource === 'stats') {
    const adminId = await validateAdmin(req, res);
    if (!adminId) return;
    return handleStats(req, res);
  }

  if (resource === 'scheduled-posts') {
    const adminId = await validateAdmin(req, res);
    if (!adminId) return;
    return handleScheduledPosts(req, res, adminId);
  }

  if (resource === 'push-broadcast') {
    const adminId = await validateAdmin(req, res);
    if (!adminId) return;
    return handlePushBroadcast(req, res);
  }

  return res.status(404).json({ error: 'Not found' });
}
