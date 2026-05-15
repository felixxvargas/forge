export const config = { runtime: 'edge' };

const SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const gameId = url.pathname.split('/').pop() ?? '';
  const siteOrigin = `https://${url.host}`;
  const pageUrl = `${siteOrigin}/game/${gameId}?_r=1`;

  let game: { title?: string; first_release_date?: number } | null = null;
  let coverUrl = '';

  if (SUPABASE_PROJECT_ID && SUPABASE_ANON_KEY && gameId) {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    };
    try {
      const [gameRes, artRes] = await Promise.all([
        fetch(
          `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/forge_games_17285bd7?id=eq.${encodeURIComponent(gameId)}&select=title,first_release_date&limit=1`,
          { headers },
        ),
        fetch(
          `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/forge_game_artwork_17285bd7?game_id=eq.${encodeURIComponent(gameId)}&artwork_type=eq.cover&select=url&limit=1`,
          { headers },
        ),
      ]);
      const [gameData, artData] = await Promise.all([gameRes.json(), artRes.json()]);
      game = Array.isArray(gameData) && gameData.length > 0 ? gameData[0] : null;
      const art = Array.isArray(artData) && artData.length > 0 ? artData[0] : null;
      coverUrl = art?.url ?? '';
    } catch { /* fallback */ }
  }

  const title = game?.title ?? 'A game on Forge';
  const year = game?.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;
  const pageTitle = `${title}${year ? ` (${year})` : ''} · Forge`;
  const description = `Check out ${title} on Forge — the gaming social network.`;

  // Use cover art directly when available; it's portrait but platforms handle it fine
  let ogImage: string;
  if (coverUrl) {
    ogImage = coverUrl;
  } else {
    const params = new URLSearchParams({ type: 'game', name: title, ...(year ? { content: String(year) } : {}) });
    ogImage = `${siteOrigin}/api/og?${params}`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(pageTitle)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Forge">
  <meta property="og:title" content="${escHtml(pageTitle)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:image" content="${escHtml(ogImage)}">
  <meta property="og:image:width" content="${coverUrl ? '600' : '1200'}">
  <meta property="og:image:height" content="${coverUrl ? '800' : '630'}">
  <meta property="og:url" content="${escHtml(pageUrl)}">
  <meta name="twitter:card" content="${coverUrl ? 'summary' : 'summary_large_image'}">
  <meta name="twitter:title" content="${escHtml(pageTitle)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${escHtml(ogImage)}">
  <script>window.location.replace("${escHtml(pageUrl)}")</script>
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
