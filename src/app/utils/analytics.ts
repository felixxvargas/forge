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
  // ── Posts ──
  postCreated: (
    hasGame: boolean,
    hasImage: boolean,
    extra?: { post_type?: string; has_community?: boolean; has_link?: boolean; is_poll?: boolean; is_thread?: boolean }
  ) => trackEvent('post_created', { has_game: hasGame, has_image: hasImage, ...extra }),

  // ── Game Lists ──
  listUpdated: (listType: string, totalGames: number, gamesAdded: number, gamesRemoved: number) =>
    trackEvent('list_updated', { list_type: listType, total_games: totalGames, games_added: gamesAdded, games_removed: gamesRemoved }),

  gameAddedToList: (gameId: string, gameTitle: string, listType: string) =>
    trackEvent('game_added_to_list', { game_id: gameId, game_title: gameTitle, list_type: listType }),

  // ── Games ──
  gameFollowed: (gameId: string, gameTitle: string) =>
    trackEvent('game_followed', { game_id: gameId, game_title: gameTitle }),

  gameUnfollowed: (gameId: string) =>
    trackEvent('game_unfollowed', { game_id: gameId }),

  // ── Groups ──
  groupCreated: (groupId: string, groupType: string) =>
    trackEvent('group_created', { group_id: groupId, group_type: groupType }),

  groupJoined: (groupId: string) =>
    trackEvent('group_joined', { group_id: groupId }),

  // ── LFG Flares ──
  flareCreated: (gameId: string, gameTitle: string, flareType: string, playersNeeded: number) =>
    trackEvent('flare_created', { game_id: gameId, game_title: gameTitle, flare_type: flareType, players_needed: playersNeeded }),

  // ── Settings ──
  settingsFeatureToggled: (featureName: string, newValue: string | boolean) =>
    trackEvent('settings_feature_toggled', { feature_name: featureName, new_value: String(newValue) }),

  settingsPageViewed: (section: string) =>
    trackEvent('settings_page_viewed', { section }),

  // ── Discovery ──
  profileViewed: (profileId: string) =>
    trackEvent('profile_viewed', { profile_id: profileId }),

  gameDetailViewed: (gameId: string, gameTitle: string) =>
    trackEvent('game_detail_viewed', { game_id: gameId, game_title: gameTitle }),

  searchPerformed: (query: string, resultCount: number) =>
    trackEvent('search', { search_term: query, result_count: resultCount }),

  // ── Social ──
  followUser: (targetUserId: string) =>
    trackEvent('follow_user', { target_user_id: targetUserId }),

  // ── Auth ──
  signUp: (method: 'email' | 'google') =>
    trackEvent('sign_up', { method }),

  login: (method: 'email' | 'google') =>
    trackEvent('login', { method }),
};
