/**
 * Google Analytics 4 utility
 * Requires VITE_GA_MEASUREMENT_ID in environment variables.
 * Dynamically loads the gtag script when the ID is present.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

/** Call once at app startup. Injects the GA4 script tag if a measurement ID is configured. */
export function initAnalytics() {
  if (!GA_ID) return;

  // Bootstrap the dataLayer + gtag function
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer!.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false }); // manual page views via trackPageView

  // Inject the GA4 script tag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

function gtag(...args: any[]) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

/** Track a page view. Called automatically on route changes. */
export function trackPageView(path: string, title?: string) {
  if (!GA_ID) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    send_to: GA_ID,
  });
}

/** Track a custom event. */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (!GA_ID) return;
  gtag('event', eventName, { ...params, send_to: GA_ID });
}

// ─── Forge-specific event helpers ────────────────────────────────────────────

export const analytics = {
  postCreated: (hasGame: boolean, hasImage: boolean) =>
    trackEvent('post_created', { has_game: hasGame, has_image: hasImage }),

  gameFollowed: (gameId: string, gameTitle: string) =>
    trackEvent('game_followed', { game_id: gameId, game_title: gameTitle }),

  gameUnfollowed: (gameId: string) =>
    trackEvent('game_unfollowed', { game_id: gameId }),

  profileViewed: (profileId: string) =>
    trackEvent('profile_viewed', { profile_id: profileId }),

  gameDetailViewed: (gameId: string, gameTitle: string) =>
    trackEvent('game_detail_viewed', { game_id: gameId, game_title: gameTitle }),

  searchPerformed: (query: string, resultCount: number) =>
    trackEvent('search', { search_term: query, result_count: resultCount }),

  signUp: (method: 'email' | 'google') =>
    trackEvent('sign_up', { method }),

  login: (method: 'email' | 'google') =>
    trackEvent('login', { method }),
};
