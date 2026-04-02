export const config = { runtime: 'edge' };

const SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const handle = url.pathname.split('/').pop() ?? '';

  let profile: { display_name?: string; handle?: string; bio?: string; profile_picture?: string } | null = null;

  if (SUPABASE_PROJECT_ID && SUPABASE_ANON_KEY && handle) {
    try {
      const stripped = handle.replace(/^@/, '');
      const apiUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/profiles?handle=ilike.${encodeURIComponent(stripped)}&select=display_name,handle,bio,profile_picture&limit=1`;
      const res = await fetch(apiUrl, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      });
      const data = await res.json();
      profile = Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      // Fall back to generic
    }
  }

  const displayName = profile?.display_name || handle;
  const displayHandle = profile?.handle || handle;
  const bio = profile?.bio || 'Check out this profile on Forge — the gaming social network.';
  const avatar = profile?.profile_picture || '';
  const siteOrigin = `https://${url.host}`;

  const ogImageParams = new URLSearchParams({
    name: displayName,
    handle: displayHandle,
    ...(bio ? { bio } : {}),
    ...(avatar ? { avatar } : {}),
  });
  const ogImage = `${siteOrigin}/api/og?${ogImageParams.toString()}`;
  // ?_r=1 signals the middleware to pass through (loop breaker)
  const profileUrl = `${siteOrigin}/${displayHandle.replace(/^@/, '')}?_r=1`;
  const title = `${displayName} (@${displayHandle.replace(/^@/, '')}) · Forge`;
  const description = bio;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Forge">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:image" content="${escHtml(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escHtml(profileUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${escHtml(ogImage)}">
  <script>window.location.replace("${escHtml(profileUrl)}")</script>
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
