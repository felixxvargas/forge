const SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const groupId = url.pathname.split('/').pop() ?? '';
  const siteOrigin = `https://${url.host}`;
  const pageUrl = `${siteOrigin}/group/${groupId}?_r=1`;

  let group: { name?: string; description?: string; profile_picture?: string; member_count?: number } | null = null;

  if (SUPABASE_PROJECT_ID && SUPABASE_ANON_KEY && groupId) {
    try {
      const res = await fetch(
        `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/communities?id=eq.${encodeURIComponent(groupId)}&select=name,description,profile_picture,member_count&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' } },
      );
      const data = await res.json();
      group = Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch { /* fallback */ }
  }

  const name = group?.name ?? 'A group on Forge';
  const description = group?.description || 'Join this group on Forge — the gaming social network.';
  const memberCount = group?.member_count ?? 0;
  const icon = group?.profile_picture ?? '';

  const pageTitle = `${name} · Forge`;
  const pageDescription = memberCount > 0
    ? `${memberCount.toLocaleString()} members · ${description}`
    : description;

  const ogParams = new URLSearchParams({
    type: 'group',
    name,
    bio: description.slice(0, 120),
    members: String(memberCount),
    ...(icon ? { icon } : {}),
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
