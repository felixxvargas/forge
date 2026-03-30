// Vercel Edge Middleware — intercepts bot crawlers on profile handle URLs
// and rewrites them to the profile-og edge function so they get proper OG meta tags.
// Regular browser requests pass through to the SPA (index.html).

const BOT_RE = /bot|crawler|spider|slackbot|discordbot|telegrambot|whatsapp|facebookexternalhit|twitterbot|linkedinbot|pinterest|baiduspider|googlebot|applebot|semrushbot|ahrefsbot|ia_archiver/i;

// Known first-path-segments used by the SPA — these should never be treated as profile handles
const APP_ROUTES = new Set([
  'feed', 'explore', 'profile', 'edit-profile', 'settings', 'notifications',
  'post', 'gaming-platforms', 'social-integrations', 'social-filtering',
  'messages', 'group', 'user-groups', 'followers', 'following', 'game',
  'submit-indie-game', 'review-submissions', 'create-group', 'premium',
  'create-custom-list', 'trending-games', 'flare', 'flares', 'list',
  'new-post', 'onboarding', 'splash', 'login', 'signup', 'auth', 'admin',
  'api', 'handle',
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

  // Only rewrite for bot/social-preview crawlers
  const ua = request.headers.get('user-agent') ?? '';
  if (!BOT_RE.test(ua)) return undefined;

  // Proxy the request to the profile-og edge function
  const target = new URL(`/api/profile-og/${segment}`, url.origin);
  return fetch(target.toString(), { headers: request.headers });
}
