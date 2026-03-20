import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7`;

interface BlueskyProfile {
  handle: string;
  displayName: string;
  avatar: string;
  banner?: string;
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
    const response = await fetch(`${API_BASE}/bluesky/profile/${handle}`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });

    if (!response.ok) return null;

    const data = await response.json();
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
    const response = await fetch(`${API_BASE}/bluesky/posts/${handle}?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });

    if (!response.ok) return [];

    const { posts } = await response.json();
    const transformedPosts = posts.map((post: any) => ({
      ...post,
      timestamp: new Date(post.timestamp)
    }));

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
    const [blueskyResponse, mastodonPosts] = await Promise.all([
      fetch(`${API_BASE}/bluesky/posts/all/gaming-media?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      }),
      fetchMassivelyOPPosts(limit),
    ]);

    let blueskyPosts: BlueskyPost[] = [];
    if (blueskyResponse.ok) {
      const { posts } = await blueskyResponse.json();
      blueskyPosts = posts.map((post: any) => ({
        ...post,
        timestamp: new Date(post.timestamp)
      }));
    }

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
export const topicAccountBlueskyHandles: Record<string, string> = {
  'user-ign': 'ign.com',
  'user-gamespot': 'gamespot.bsky.social',
  'user-polygon': 'polygon.bsky.social',
  'user-kotaku': 'kotaku.bsky.social',
  'user-eurogamer': 'eurogamer.bsky.social',
  'user-nintendolife': 'nintendolife.com',
  'user-pcgamer': 'pcgamer.bsky.social',
  'user-destructoid': 'destructoid.bsky.social',
  'user-rockpapershotgun': 'rockpapershotgun.bsky.social',
  'user-massivelyop': 'massivelyop.bsky.social',
  'user-theverge': 'theverge.com',
  'user-xbox': 'xbox.com',
  'user-playstation': 'playstation.com',
  'user-nintendo': 'nintendo.com',
  'user-steam': 'steampowered.com',
  'user-epicgames': 'epicgames.com'
};

export function getBlueskyHandleForUser(userId: string): string | undefined {
  return topicAccountBlueskyHandles[userId];
}
