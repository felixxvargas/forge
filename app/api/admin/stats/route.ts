import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const runtime = 'nodejs';

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(request: NextRequest) {
  if (!SERVICE_KEY || !process.env.VITE_SUPABASE_PROJECT_ID) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validate JWT and resolve user
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check is_admin on the profile — the only gate
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const t7 = daysAgo(7);
  const t30 = daysAgo(30);
  const t90 = daysAgo(90);
  const t365 = daysAgo(365);

  const countIn = (table: string, since: string) =>
    admin.from(table).select('*', { count: 'exact', head: true }).gte('created_at', since);

  const [
    { count: totalUsers },
    { count: users7 },
    { count: users30 },
    { count: users90 },
    { count: users365 },
    { count: totalPosts },
    { count: posts30 },
    { count: posts90 },
    { count: posts365 },
    { count: totalUserGames },
    { count: games30 },
    { count: games90 },
    { count: games365 },
    { count: totalCommunities },
    { count: totalFlares },
    { count: flares30 },
    { count: flares90 },
    { count: flares365 },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    countIn('profiles', t7),
    countIn('profiles', t30),
    countIn('profiles', t90),
    countIn('profiles', t365),
    admin.from('posts').select('*', { count: 'exact', head: true }),
    countIn('posts', t30),
    countIn('posts', t90),
    countIn('posts', t365),
    admin.from('user_games').select('*', { count: 'exact', head: true }),
    countIn('user_games', t30),
    countIn('user_games', t90),
    countIn('user_games', t365),
    admin.from('communities').select('*', { count: 'exact', head: true }),
    admin.from('lfg_flares').select('*', { count: 'exact', head: true }),
    countIn('lfg_flares', t30),
    countIn('lfg_flares', t90),
    countIn('lfg_flares', t365),
    admin.from('profiles')
      .select('handle, display_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    users: { total: totalUsers ?? 0, last7Days: users7 ?? 0, last30Days: users30 ?? 0, last90Days: users90 ?? 0, last365Days: users365 ?? 0 },
    posts: { total: totalPosts ?? 0, last30Days: posts30 ?? 0, last90Days: posts90 ?? 0, last365Days: posts365 ?? 0 },
    games: { total: totalUserGames ?? 0, last30Days: games30 ?? 0, last90Days: games90 ?? 0, last365Days: games365 ?? 0 },
    communities: { total: totalCommunities ?? 0 },
    flares: { total: totalFlares ?? 0, last30Days: flares30 ?? 0, last90Days: flares90 ?? 0, last365Days: flares365 ?? 0 },
    recentUsers: recentUsers ?? [],
    generatedAt: new Date().toISOString(),
  });
}
