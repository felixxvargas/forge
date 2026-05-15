export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const siteOrigin = `https://${url.host}`;
  const pageUrl = `${siteOrigin}/android-beta?_r=1`;

  const title = 'Join the Forge Android Closed Beta';
  const description =
    "Be among the first to experience Forge natively on Android. Sign up and we'll send you a Google Play invite within a week.";
  const image = `${siteOrigin}/android-beta.png`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Forge">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:image" content="${escHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escHtml(pageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${escHtml(image)}">
  <script>window.location.replace("${escHtml(pageUrl)}")</script>
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
