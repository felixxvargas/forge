// Vercel Edge Middleware — injects OG meta tags for social crawlers.
// Human browsers go directly to Next.js (generateMetadata handles OG).
// Crawlers are proxied through OG handlers for social preview cards.
// If an OG handler fails, falls through to Next.js rather than serving a 500.
// /storybook is protected by HTTP Basic Auth (STORYBOOK_USER / STORYBOOK_PASS env vars).

const APP_ROUTES = new Set([
  'feed', 'explore', 'profile', 'edit-profile', 'settings', 'notifications',
  'post', 'gaming-platforms', 'social-integrations', 'social-filtering',
  'messages', 'group', 'user-groups', 'followers', 'following', 'game',
  'submit-indie-game', 'review-submissions', 'create-group', 'premium',
  'create-custom-list', 'trending-games', 'flare', 'flares', 'list',
  'new-post', 'onboarding', 'splash', 'login', 'signup', 'auth', 'admin',
  'api', 'handle', 'privacy', 'terms', 'privacy-security', 'data-deletion',
  'android-beta',
]);

const CRAWLER_RE = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|discord|telegram|embedly|applebot|pinterest/i;

export const config = {
  matcher: ['/((?!_next|api/).*)'],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  // ── Storybook: HTTP Basic Auth ───────────────────────────────────────────────
  if (segments[0] === 'storybook') {
    const validUser = process.env.STORYBOOK_USER;
    const validPass = process.env.STORYBOOK_PASS;
    if (validUser && validPass) {
      const expected = btoa(`${validUser}:${validPass}`);
      // Check 30-day cookie first — avoids re-prompting on every visit
      const cookies = request.headers.get('cookie') ?? '';
      const cookieMatch = cookies.match(/(?:^|;\s*)sb_auth=([^;]+)/);
      if (cookieMatch?.[1] === expected) return undefined;
      // Fall back to Basic Auth header
      const authHeader = request.headers.get('authorization') ?? '';
      if (authHeader.startsWith('Basic ')) {
        const [user, pass] = atob(authHeader.slice(6)).split(':');
        if (user === validUser && pass === validPass) {
          // Set cookie and redirect so subsequent requests skip the prompt
          return new Response(null, {
            status: 302,
            headers: {
              'Location': request.url,
              'Set-Cookie': `sb_auth=${expected}; Path=/storybook; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Secure; SameSite=Lax`,
            },
          });
        }
      }
      return new Response('Access to Forge Design System requires authentication.', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Forge Design System", charset="UTF-8"' },
      });
    }
  }
  // ────────────────────────────────────────────────────────────────────────────
  const hasRedirectFlag = url.searchParams.has('_r');

  const ua = request.headers.get('user-agent') ?? '';
  const isCrawler = CRAWLER_RE.test(ua);

  const isNextNavigation = !!(
    request.headers.get('RSC') ||
    request.headers.get('Next-Router-Prefetch') ||
    request.headers.get('Next-Url')
  );

  // 2-segment content routes: /post/:id, /game/:id, /group/:id, /profile/:handle
  // Only proxy social crawlers; humans go directly to Next.js
  if (segments.length === 2 && !hasRedirectFlag) {
    if (isCrawler && !isNextNavigation) {
      if (segments[0] === 'post') {
        try {
          const res = await fetch(new URL(`/api/post-og/${segments[1]}`, url.origin).toString(), { headers: request.headers });
          if (res.ok) return res;
        } catch { /* fall through */ }
      }
      if (segments[0] === 'game') {
        try {
          const res = await fetch(new URL(`/api/game-og/${segments[1]}`, url.origin).toString(), { headers: request.headers });
          if (res.ok) return res;
        } catch { /* fall through */ }
      }
      if (segments[0] === 'group') {
        try {
          const res = await fetch(new URL(`/api/group-og/${segments[1]}`, url.origin).toString(), { headers: request.headers });
          if (res.ok) return res;
        } catch { /* fall through */ }
      }
      if (segments[0] === 'profile' && segments[1] && !APP_ROUTES.has(segments[1])) {
        try {
          const res = await fetch(new URL(`/api/profile-og/${segments[1]}`, url.origin).toString(), { headers: request.headers });
          if (res.ok) return res;
        } catch { /* fall through */ }
      }
    }
    return undefined;
  }

  // Only continue for single-segment paths
  if (segments.length !== 1) return undefined;

  const segment = segments[0];

  // /android-beta — inject OG image for crawlers only
  if (segment === 'android-beta' && !hasRedirectFlag && isCrawler && !isNextNavigation) {
    try {
      const res = await fetch(new URL('/api/android-beta-og', url.origin).toString(), { headers: request.headers });
      if (res.ok) return res;
    } catch { /* fall through */ }
  }

  // /list — inject list OG tags for crawlers only (has userId + type as query params)
  if (segment === 'list' && url.searchParams.has('userId') && !hasRedirectFlag && isCrawler && !isNextNavigation) {
    try {
      const target = new URL('/api/list-og', url.origin);
      target.search = url.search;
      const res = await fetch(target.toString(), { headers: request.headers });
      if (res.ok) return res;
    } catch { /* fall through */ }
  }

  // Skip known app routes and file-like paths
  if (APP_ROUTES.has(segment) || segment.includes('.')) return undefined;

  // Skip if already redirected from profile-og (loop breaker for crawlers)
  if (hasRedirectFlag) return undefined;

  // Profile handles: proxy crawlers to profile-og; humans go to Next.js
  if (isCrawler && !isNextNavigation) {
    try {
      const res = await fetch(new URL(`/api/profile-og/${segment}`, url.origin).toString(), { headers: request.headers });
      if (res.ok) return res;
    } catch { /* fall through */ }
  }
  return undefined;
}
