export const config = { runtime: 'edge' };

const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID ?? '';
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

async function countTable(table: string, since?: string): Promise<number> {
  const params = new URLSearchParams({ select: 'id', limit: '1' });
  if (since) params.set('created_at', `gte.${since}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' },
  });
  const cr = res.headers.get('Content-Range') ?? '0-0/0';
  return parseInt(cr.split('/')[1] ?? '0', 10);
}

const STANDARD_LIST_KEYS = ['recentlyPlayed', 'playedBefore', 'favorites', 'wishlist', 'library', 'completed', 'custom', 'lfg'];

interface OnboardingFunnel {
  started: number;
  interests_started: number;
  follow_started: number;
  username_started: number;
  completed: number;
  errors: number;
  completion_rate: number;
}

async function getOnboardingFunnel(since?: string): Promise<OnboardingFunnel> {
  async function countWhere(filters: Record<string, string>): Promise<number> {
    const p = new URLSearchParams({ select: 'id', limit: '1' });
    for (const [k, v] of Object.entries(filters)) p.set(k, v);
    if (since) p.set('created_at', `gte.${since}`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/forge_onboarding_events?${p}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' },
    });
    const cr = res.headers.get('Content-Range') ?? '0-0/0';
    return parseInt(cr.split('/')[1] ?? '0', 10);
  }

  const [started, interests, follow, username, completed, errors] = await Promise.all([
    countWhere({ event: 'eq.onboarding_started' }),
    countWhere({ event: 'eq.step_started', step: 'eq.interests' }),
    countWhere({ event: 'eq.step_started', step: 'eq.follow' }),
    countWhere({ event: 'eq.step_started', step: 'eq.username' }),
    countWhere({ event: 'eq.onboarding_completed' }),
    countWhere({ event: 'eq.onboarding_error' }),
  ]);

  return {
    started,
    interests_started: interests,
    follow_started: follow,
    username_started: username,
    completed,
    errors,
    completion_rate: started > 0 ? Math.round((completed / started) * 100) : 0,
  };
}

async function getListStats(): Promise<{ total: number; customTotal: number; updateCount: number }> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=game_lists`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const data = await res.json();
  if (!Array.isArray(data)) return { total: 0, customTotal: 0, updateCount: 0 };

  let standardTotal = 0, customTotal = 0, updateCount = 0;
  for (const profile of data) {
    const gl = profile.game_lists ?? {};
    for (const key of STANDARD_LIST_KEYS) {
      if (Array.isArray(gl[key]) && gl[key].length > 0) standardTotal++;
    }
    customTotal += (gl.customLists ?? []).length;
    updateCount += gl._updateCount ?? 0;
  }
  return { total: standardTotal + customTotal, customTotal, updateCount };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  if (!SERVICE_KEY || !PROJECT_ID) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate JWT
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  const { id: userId } = await userRes.json();

  // Check is_admin
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const [profile] = await profileRes.json();
  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  const t7 = daysAgo(7), t30 = daysAgo(30), t90 = daysAgo(90), t365 = daysAgo(365);

  const [
    totalUsers, users7, users30, users90, users365,
    totalPosts, posts30, posts90, posts365,
    totalUserGames, games30, games90, games365,
    totalCommunities,
    totalFlares, flares30, flares90, flares365,
    listStats,
    onboardingAll, onboarding30,
    follows30, follows90, follows365,
    groupJoins30, groupJoins90, groupJoins365,
    groupCreations30, groupCreations90, groupCreations365,
  ] = await Promise.all([
    countTable('profiles'), countTable('profiles', t7), countTable('profiles', t30),
    countTable('profiles', t90), countTable('profiles', t365),
    countTable('posts'), countTable('posts', t30), countTable('posts', t90), countTable('posts', t365),
    countTable('user_games'), countTable('user_games', t30),
    countTable('user_games', t90), countTable('user_games', t365),
    countTable('communities'),
    countTable('lfg_flares'), countTable('lfg_flares', t30),
    countTable('lfg_flares', t90), countTable('lfg_flares', t365),
    getListStats(),
    getOnboardingFunnel(),
    getOnboardingFunnel(t30),
    countTable('follows', t30), countTable('follows', t90), countTable('follows', t365),
    countTable('community_members', t30), countTable('community_members', t90), countTable('community_members', t365),
    countTable('communities', t30), countTable('communities', t90), countTable('communities', t365),
  ]);

  const [recentRes, mauRes, sessionRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=handle,display_name,created_at&order=created_at.desc&limit=10`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_auth_user_activity`,
      { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: '{}' }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/forge_session_events?select=platform,duration_s,event&event=in.(session_start,session_end)&created_at=gte.${t30}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    ),
  ]);

  const recentUsers = await recentRes.json();

  let mau = 0, wau = 0, dau = 0;
  if (mauRes.ok) {
    const mauData = await mauRes.json().catch(() => ({}));
    mau = mauData?.mau ?? 0;
    wau = mauData?.wau ?? 0;
    dau = mauData?.dau ?? 0;
  }

  let avgSessionDurationS = 0;
  const platformSplit: Record<string, number> = { web: 0, android: 0 };
  if (sessionRes.ok) {
    const sessionRows: { platform: string; duration_s: number | null; event: string }[] = await sessionRes.json().catch(() => []);
    const durations = sessionRows.filter(r => r.event === 'session_end' && r.duration_s != null).map(r => r.duration_s!);
    if (durations.length > 0) avgSessionDurationS = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    for (const r of sessionRows.filter(r => r.event === 'session_start')) {
      platformSplit[r.platform] = (platformSplit[r.platform] ?? 0) + 1;
    }
  }

  return new Response(JSON.stringify({
    users: { total: totalUsers, last7Days: users7, last30Days: users30, last90Days: users90, last365Days: users365 },
    posts: { total: totalPosts, last30Days: posts30, last90Days: posts90, last365Days: posts365 },
    games: { total: totalUserGames, last30Days: games30, last90Days: games90, last365Days: games365 },
    communities: { total: totalCommunities },
    flares: { total: totalFlares, last30Days: flares30, last90Days: flares90, last365Days: flares365 },
    lists: listStats,
    onboarding: { allTime: onboardingAll, last30Days: onboarding30 },
    engagement: { mau, wau, dau, avgSessionDurationS, platformSplit },
    userActions: {
      follows: { last30Days: follows30, last90Days: follows90, last365Days: follows365 },
      groupJoins: { last30Days: groupJoins30, last90Days: groupJoins90, last365Days: groupJoins365 },
      groupCreations: { last30Days: groupCreations30, last90Days: groupCreations90, last365Days: groupCreations365 },
      posts: { last30Days: posts30, last90Days: posts90, last365Days: posts365 },
    },
    recentUsers: recentUsers ?? [],
    generatedAt: new Date().toISOString(),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
