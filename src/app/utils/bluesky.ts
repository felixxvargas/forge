
interface BlueskyProfile {
  handle: string;
  displayName: string;
  avatar: string;
  description: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
}

interface BlueskyPost {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  likes: number;
  reposts: number;
  comments: number;
  images?: string[];
  platform: 'bluesky' | 'mastodon';
  externalUrl: string;
}

// Cache for Bluesky data to avoid excessive API calls
const profileCache = new Map<string, { data: BlueskyProfile; timestamp: number }>();
const postsCache = new Map<string, { data: BlueskyPost[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchBlueskyProfile(handle: string): Promise<BlueskyProfile | null> {
  const cached = profileCache.get(handle);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`
    );

    if (!response.ok) return null;

    const raw = await response.json();
    const data: BlueskyProfile = {
      handle: raw.handle,
      displayName: raw.displayName ?? raw.handle,
      avatar: raw.avatar || undefined,
      description: raw.description ?? '',
      followersCount: raw.followersCount ?? 0,
      followsCount: raw.followsCount ?? 0,
      postsCount: raw.postsCount ?? 0,
    };
    profileCache.set(handle, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}

export async function fetchBlueskyPosts(handle: string, limit = 10): Promise<BlueskyPost[]> {
  const cacheKey = `${handle}-${limit}`;
  const cached = postsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=${limit}&filter=posts_no_replies`
    );

    if (!response.ok) return [];

    const { feed } = await response.json();
    const transformedPosts: BlueskyPost[] = (feed ?? [])
      .filter((item: any) => item?.post && !item.reason) // skip reposts
      .map((item: any) => {
        const post = item.post;
        const record = post.record ?? {};
        const images: string[] | undefined = post.embed?.images
          ?.map((img: any) => img.fullsize ?? img.thumb)
          .filter(Boolean);

        // Extract article URL from external embed (e.g. Kotaku/RPS article links)
        const articleUrl: string | undefined =
          post.embed?.external?.uri ??
          post.embed?.media?.external?.uri ??
          undefined;

        return {
          id: post.uri,
          userId: handle,
          content: record.text ?? '',
          timestamp: new Date(record.createdAt ?? post.indexedAt),
          likes: post.likeCount ?? 0,
          reposts: post.repostCount ?? 0,
          comments: post.replyCount ?? 0,
          images: images?.length ? images : undefined,
          platform: 'bluesky' as const,
          url: articleUrl,
          externalUrl: `https://bsky.app/profile/${post.author?.handle ?? handle}/post/${post.uri.split('/').pop()}`,
        };
      });

    postsCache.set(cacheKey, { data: transformedPosts, timestamp: Date.now() });
    return transformedPosts;
  } catch {
    return [];
  }
}

// Fetch posts from MassivelyOP on Mastodon
async function fetchMassivelyOPPosts(limit = 5): Promise<BlueskyPost[]> {
  const cacheKey = 'mastodon-massivelyop';
  const cached = postsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // MassivelyOP Mastodon account ID: 109515680214374940
    const response = await fetch(
      `https://mastodon.social/api/v1/accounts/109515680214374940/statuses?limit=${limit}&exclude_replies=true`
    );

    if (!response.ok) return [];

    const statuses = await response.json();
    const posts: BlueskyPost[] = statuses
      .filter((s: any) => s.content && !s.reblog) // skip boosts and empty
      .map((s: any) => {
        // Strip HTML tags from content
        const text = s.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        const images = s.media_attachments
          ?.filter((m: any) => m.type === 'image')
          .map((m: any) => m.url) || undefined;

        return {
          id: `mastodon-${s.id}`,
          userId: 'user-massivelyop',
          content: text,
          timestamp: new Date(s.created_at),
          likes: s.favourites_count ?? 0,
          reposts: s.reblogs_count ?? 0,
          comments: s.replies_count ?? 0,
          images: images?.length ? images : undefined,
          platform: 'mastodon' as const,
          url: s.card?.url ?? undefined,
          externalUrl: s.url,
        };
      });

    postsCache.set(cacheKey, { data: posts, timestamp: Date.now() });
    return posts;
  } catch (error) {
    console.error('Failed to fetch MassivelyOP Mastodon posts:', error);
    return [];
  }
}

// Fetch posts from all gaming media topic accounts (Bluesky + Mastodon)
export async function fetchAllGamingMediaPosts(limit = 5): Promise<BlueskyPost[]> {
  const cacheKey = 'all-gaming-media';
  const cached = postsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Fetch from each gaming media handle directly via Public API + Mastodon
    const gamingMediaHandles = [
      'ign.com', 'gamespot.com', 'polygon.bsky.social', 'kotaku.com',
      'eurogamer.bsky.social', 'nintendolife.com', 'pcgamer.bsky.social',
      'destructoid.bsky.social', 'rockpapershotgun.bsky.social',
    ];

    const [blueskyResults, mastodonPosts] = await Promise.all([
      Promise.allSettled(gamingMediaHandles.map(h => fetchBlueskyPosts(h, limit))),
      fetchMassivelyOPPosts(limit),
    ]);

    const blueskyPosts = blueskyResults.flatMap(r =>
      r.status === 'fulfilled' ? r.value : []
    );

    const allPosts = [...blueskyPosts, ...mastodonPosts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    postsCache.set(cacheKey, { data: allPosts, timestamp: Date.now() });
    return allPosts;
  } catch (error) {
    console.error('Error fetching all gaming media posts:', error);
    return [];
  }
}

// Topic accounts and their Bluesky handles
// Keyed by both old user-xxx IDs and Supabase profile handle slugs
export const topicAccountBlueskyHandles: Record<string, string> = {
  // Gaming media — ID-based keys (legacy)
  'user-ign': 'ign.com',
  'user-gamespot': 'gamespot.com',
  'user-polygon': 'polygon.bsky.social',
  'user-kotaku': 'kotaku.com',
  'user-eurogamer': 'eurogamer.bsky.social',
  'user-nintendolife': 'nintendolife.com',
  'user-pcgamer': 'pcgamer.bsky.social',
  'user-destructoid': 'destructoid.bsky.social',
  'user-rockpapershotgun': 'rockpapershotgun.bsky.social',
  'user-massivelyop': 'massivelyop.bsky.social',
  // Gaming media — handle-slug keys (and display_name-derived slugs)
  'ign': 'ign.com',
  'gamespot': 'gamespot.com',
  'kotaku': 'kotaku.com',
  'eurogamer': 'eurogamer.bsky.social',
  'rockpapershotgun': 'rockpapershotgun.bsky.social',
  'massivelyop': 'massivelyop.bsky.social',
  'pcgamer': 'pcgamer.bsky.social',
  'polygon': 'polygon.bsky.social',
  'destructoid': 'destructoid.bsky.social',
  'nintendolife': 'nintendolife.com',
  // display_name-derived slugs for resilience
  'ignentertainment': 'ign.com',
  // Gaming studios & platforms — ID-based keys (legacy user-* IDs)
  'user-blizzard': 'blizzard.com',
  'user-larian': 'larianstudios.bsky.social',
  'user-koop': 'koopmode.bsky.social',
  'user-fromsoft': 'fromsoftware.bsky.social',
  'user-nintendo': 'nintendo.com',
  'user-playstation': 'playstation.bsky.social',
  'user-xbox': 'xbox.com',
  'user-steam': 'steampowered.bsky.social',
  'user-itchio': 'itch.io',
  // Gaming studios & platforms — seeded studio-* IDs
  'studio-koopmode': 'koopmode.bsky.social',
  'studio-fromsoft': 'fromsoftware.bsky.social',
  'studio-capcom': 'capcomusa.bsky.social',
  'studio-nintendo': 'nintendo.bsky.social',
  'studio-xbox': 'xbox.bsky.social',
  'studio-sega': 'sega.bsky.social',
  'studio-insomniac': 'insomniacgames.bsky.social',
  // Gaming studios & platforms — handle-slug keys (and display_name-derived slugs)
  'blizzard': 'blizzard.com',
  'blizzardentertainment': 'blizzard.com',
  'larian': 'larianstudios.bsky.social',
  'larianstudios': 'larianstudios.bsky.social',
  'koop': 'koopmode.bsky.social',
  'koopmode': 'koopmode.bsky.social',
  'fromsoft': 'fromsoftware.bsky.social',
  'fromsoftware': 'fromsoftware.bsky.social',
  'nintendo': 'nintendo.com',
  'playstation': 'playstation.bsky.social',
  'xbox': 'xbox.com',
  'steam': 'steampowered.bsky.social',
  'steampowered': 'steampowered.bsky.social',
  'itchio': 'itch.io',
};

export function getBlueskyHandleForUser(userId: string): string | undefined {
  return topicAccountBlueskyHandles[userId];
}
