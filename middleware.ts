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
  'api', 'handle', 'privacy', 'terms', 'privacy-security',
]);

export const config = {
  matcher: ['/((?!_next|api/).*)'],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);

  // Only intercept single-segment paths (potential profile handles)
  if (segments.length !== 1) return undefined;

  const segment = segments[0];

  // Skip known app routes and file-like paths
  if (APP_ROUTES.has(segment) || segment.includes('.')) return undefined;

  // Skip if this request was already redirected from profile-og (loop breaker)
  if (url.searchParams.has('_r')) return undefined;

  // Proxy the request to the profile-og edge function for all visitors
  // (bots get OG tags; humans get OG tags + JS redirect back to SPA)
  const target = new URL(`/api/profile-og/${segment}`, url.origin);
  return fetch(target.toString(), { headers: request.headers });
}
