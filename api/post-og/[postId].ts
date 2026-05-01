export const config = { runtime: 'edge' };

const SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID ?? '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const postId = url.pathname.split('/').pop() ?? '';
  const siteOrigin = `https://${url.host}`;
  const pageUrl = `${siteOrigin}/post/${postId}?_r=1`;

  let post: { content?: string; images?: string[]; user_id?: string } | null = null;
  let author: { display_name?: string; handle?: string; profile_picture?: string } | null = null;

  if (SUPABASE_PROJECT_ID && SUPABASE_ANON_KEY && postId) {
    try {
      const apiUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/posts?id=eq.${encodeURIComponent(postId)}&select=content,images,user_id&limit=1`;
      const res = await fetch(apiUrl, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      });
      const data = await res.json();
      post = Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch { /* fallback */ }

    if (post?.user_id) {
      try {
        const profileUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/profiles?id=eq.${encodeURIComponent(post.user_id)}&select=display_name,handle,profile_picture&limit=1`;
        const res = await fetch(profileUrl, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Accept: 'application/json',
          },
        });
        const data = await res.json();
        author = Array.isArray(data) && data.length > 0 ? data[0] : null;
      } catch { /* fallback */ }
    }
  }

  const content = post?.content ?? '';
  const images: string[] = Array.isArray(post?.images) ? post!.images : [];
  const firstImage = images.find(img => img && !img.endsWith('.mp4') && !img.endsWith('.webm'));

  const authorName = author?.display_name || author?.handle || 'Forge User';
  const authorHandle = author?.handle ? `@${author.handle.replace(/^@/, '')}` : '';
  const postTitle = content
    ? (content.length > 80 ? content.slice(0, 77).trimEnd() + '…' : content) + ' · Forge'
    : 'A post on Forge';
  const postDescription = content
    ? (content.length > 200 ? content.slice(0, 197).trimEnd() + '…' : content)
    : 'Check out this post on Forge — the gaming social network.';

  // Use the post's own image if available; otherwise generate a text card
  let ogImage: string;
  if (firstImage) {
    ogImage = firstImage;
  } else {
    const ogParams = new URLSearchParams({
      type: 'post',
      content: content.slice(0, 300),
      author: authorName,
      handle: authorHandle,
    });
    ogImage = `${siteOrigin}/api/og?${ogParams.toString()}`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(postTitle)}</title>
  <meta name="description" content="${escHtml(postDescription)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Forge">
  <meta property="og:title" content="${escHtml(postTitle)}">
  <meta property="og:description" content="${escHtml(postDescription)}">
  <meta property="og:image" content="${escHtml(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escHtml(pageUrl)}">
  <meta name="twitter:card" content="${firstImage ? 'summary_large_image' : 'summary_large_image'}">
  <meta name="twitter:title" content="${escHtml(postTitle)}">
  <meta name="twitter:description" content="${escHtml(postDescription)}">
  <meta name="twitter:image" content="${escHtml(ogImage)}">
  <script>window.location.replace("${escHtml(pageUrl)}")</script>
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
