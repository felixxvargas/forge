const SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const LIST_LABELS: Record<string, string> = {
  library: 'Library',
  wishlist: 'Wishlist',
  playing: 'Currently Playing',
  'want-to-play': 'Want to Play',
  completed: 'Completed',
  dropped: 'Dropped',
  'recently-played': 'Recently Played',
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const listType = url.searchParams.get('type') || 'library';
  const userId = url.searchParams.get('userId') || '';
  const siteOrigin = `https://${url.host}`;

  const redirectSearch = new URLSearchParams({ type: listType, ...(userId ? { userId } : {}), _r: '1' });
  const pageUrl = `${siteOrigin}/list?${redirectSearch}`;

  let profile: { display_name?: string; handle?: string; profile_picture?: string; game_lists?: any } | null = null;
  let coverUrls: string[] = [];

  if (SUPABASE_PROJECT_ID && SUPABASE_ANON_KEY && userId) {
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' };
    try {
      const profileRes = await fetch(
        `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=display_name,handle,profile_picture,game_lists&limit=1`,
        { headers },
      );
      const profileData = await profileRes.json();
      profile = Array.isArray(profileData) && profileData.length > 0 ? profileData[0] : null;
    } catch { /* fallback */ }

    if (profile?.game_lists) {
      try {
        const listGames: any[] = Array.isArray(profile.game_lists[listType]) ? profile.game_lists[listType] : [];
        const gameIds = listGames.slice(0, 4).map((g: any) => String(g.id ?? g)).filter(Boolean);
        if (gameIds.length > 0) {
          const inClause = `(${gameIds.join(',')})`;
          const artRes = await fetch(
            `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/forge_game_artwork_17285bd7?game_id=in.${encodeURIComponent(inClause)}&artwork_type=eq.cover&select=game_id,url`,
            { headers },
          );
          const artData = await artRes.json();
          if (Array.isArray(artData)) {
            const artMap: Record<string, string> = Object.fromEntries(artData.map((a: any) => [String(a.game_id), a.url]));
            coverUrls = gameIds.map(id => artMap[id]).filter(Boolean);
          }
        }
      } catch { /* fallback */ }
    }
  }

  const listLabel = LIST_LABELS[listType] ?? 'Game List';
  const displayName = profile?.display_name || profile?.handle || 'A Forge user';
  const handle = profile?.handle ? `@${profile.handle.replace(/^@/, '')}` : '';
  const avatar = profile?.profile_picture ?? '';

  const pageTitle = profile ? `${displayName}'s ${listLabel} · Forge` : `${listLabel} · Forge`;
  const pageDescription = `Check out this game list on Forge — the gaming social network.`;

  const ogParams = new URLSearchParams({
    type: 'list',
    name: displayName,
    handle,
    listType: listLabel,
    ...(avatar ? { avatar } : {}),
    ...Object.fromEntries(coverUrls.map((u, i) => [`cover${i + 1}`, u])),
  });
  const ogImage = `${siteOrigin}/api/og?${ogParams}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(pageTitle)}</title>
  <meta name="description" content="${escHtml(pageDescription)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Forge">
  <meta property="og:title" content="${escHtml(pageTitle)}">
  <meta property="og:description" content="${escHtml(pageDescription)}">
  <meta property="og:image" content="${escHtml(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escHtml(pageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(pageTitle)}">
  <meta name="twitter:description" content="${escHtml(pageDescription)}">
  <meta name="twitter:image" content="${escHtml(ogImage)}">
  <script>window.location.replace("${escHtml(pageUrl)}")</script>
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
