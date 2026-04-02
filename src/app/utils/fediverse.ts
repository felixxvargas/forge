import type { ExternalUser } from './bluesky';

// Search Mastodon for users via mastodon.social (the largest public instance)
// Results include accounts on any federated instance that mastodon.social knows about.
export async function searchMastodonUsers(query: string, limit = 5): Promise<ExternalUser[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://mastodon.social/api/v2/search?q=${encodeURIComponent(query)}&type=accounts&limit=${limit}&resolve=false`
    );
    if (!res.ok) return [];
    const { accounts } = await res.json();
    return (accounts ?? []).map((a: any): ExternalUser => {
      const instance = a.url ? new URL(a.url).hostname : 'mastodon.social';
      return {
        id: `mastodon-${a.id}`,
        handle: `@${a.acct.includes('@') ? a.acct : `${a.acct}@${instance}`}`,
        displayName: a.display_name || a.username,
        avatar: a.avatar,
        bio: a.note
          ? a.note
              .replace(/<br\s*\/?>/gi, ' ')
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .trim()
          : undefined,
        followerCount: a.followers_count ?? 0,
        platform: 'mastodon',
        externalUrl: a.url,
      };
    });
  } catch {
    return [];
  }
}
