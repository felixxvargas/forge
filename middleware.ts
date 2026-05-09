// Vercel Edge Middleware — injects OG meta tags for profile handle URLs.
// All requests to /:handle are proxied to the profile-og edge function, which:
//   - Returns an HTML page with correct OG meta tags (display name, avatar, etc.)
//   - Redirects human browsers back to the SPA via window.location.replace
//   - Uses ?_r=1 to signal the redirect has already happened (breaks the loop)
// This ensures iOS share previews, iMessage, and all social crawlers see correct OG data.

// Known first-path-segments used by the SPA — these should never be treated as profile handles
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

export const config = {
  matcher: ['/((?!_next|api/).*)'],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const hasRedirectFlag = url.searchParams.has('_r');

  // 2-segment routes that get custom OG injection (/post/:id, /game/:id, /group/:id)
  if (segments.length === 2 && !hasRedirectFlag) {
    const isNextNavigation = !!(
      request.headers.get('RSC') ||
      request.headers.get('Next-Router-Prefetch') ||
      request.headers.get('Next-Url')
    );
    if (!isNextNavigation) {
      if (segments[0] === 'post') {
        return fetch(new URL(`/api/post-og/${segments[1]}`, url.origin).toString(), { headers: request.headers });
      }
      if (segments[0] === 'game') {
        return fetch(new URL(`/api/game-og/${segments[1]}`, url.origin).toString(), { headers: request.headers });
      }
      if (segments[0] === 'group') {
        return fetch(new URL(`/api/group-og/${segments[1]}`, url.origin).toString(), { headers: request.headers });
      }
    }
    return undefined;
  }

  // Only continue for single-segment paths (potential profile handles or known pages)
  if (segments.length !== 1) return undefined;

  const segment = segments[0];

  // /android-beta — inject dedicated OG image for the beta sign-up page
  // Skip for Next.js RSC/prefetch navigation to avoid returning HTML to the router
  if (segment === 'android-beta' && !hasRedirectFlag) {
    const isNextNavigation = !!(request.headers.get('RSC') || request.headers.get('Next-Router-Prefetch') || request.headers.get('Next-Url'));
    if (!isNextNavigation) {
      const target = new URL('/api/android-beta-og', url.origin);
      return fetch(target.toString(), { headers: request.headers });
    }
  }

  // /list — inject list OG tags (has userId + type as query params)
  if (segment === 'list' && url.searchParams.has('userId') && !hasRedirectFlag) {
    const isNextNavigation = !!(
      request.headers.get('RSC') ||
      request.headers.get('Next-Router-Prefetch') ||
      request.headers.get('Next-Url')
    );
    if (!isNextNavigation) {
      const target = new URL('/api/list-og', url.origin);
      target.search = url.search;
      return fetch(target.toString(), { headers: request.headers });
    }
  }

  // Skip known app routes and file-like paths
  if (APP_ROUTES.has(segment) || segment.includes('.')) return undefined;

  // Skip if this request was already redirected from profile-og (loop breaker)
  if (hasRedirectFlag) return undefined;

  // Proxy the request to the profile-og edge function for all visitors
  // (bots get OG tags; humans get OG tags + JS redirect back to SPA)
  const target = new URL(`/api/profile-og/${segment}`, url.origin);
  return fetch(target.toString(), { headers: request.headers });
}
