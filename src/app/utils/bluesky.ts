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
  platform: 'bluesky';
  externalUrl: string;
}

// Cache for Bluesky data to avoid excessive API calls
const profileCache = new Map<string, { data: BlueskyProfile; timestamp: number }>();
const postsCache = new Map<string, { data: BlueskyPost[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchBlueskyProfile(handle: string): Promise<BlueskyProfile | null> {
  // Check cache
  const cached = profileCache.get(handle);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${API_BASE}/bluesky/profile/${handle}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      // Silently fail - account may not exist on Bluesky
      return null;
    }

    const data = await response.json();
    
    // Cache the result
    profileCache.set(handle, { data, timestamp: Date.now() });
    
    return data;
  } catch (error) {
    // Silently fail - network error or account doesn't exist
    return null;
  }
}

export async function fetchBlueskyPosts(handle: string, limit = 10): Promise<BlueskyPost[]> {
  // Check cache
  const cacheKey = `${handle}-${limit}`;
  const cached = postsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${API_BASE}/bluesky/posts/${handle}?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      // Silently fail - account may not exist on Bluesky
      return [];
    }

    const { posts } = await response.json();
    
    // Transform timestamps to Date objects
    const transformedPosts = posts.map((post: any) => ({
      ...post,
      timestamp: new Date(post.timestamp)
    }));
    
    // Cache the result
    postsCache.set(cacheKey, { data: transformedPosts, timestamp: Date.now() });
    
    return transformedPosts;
  } catch (error) {
    // Silently fail - network error or account doesn't exist
    return [];
  }
}

// Fetch posts from all gaming media topic accounts
export async function fetchAllGamingMediaPosts(limit = 5): Promise<BlueskyPost[]> {
  // Check cache
  const cacheKey = 'all-gaming-media';
  const cached = postsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${API_BASE}/bluesky/posts/all/gaming-media?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch all gaming media Bluesky posts');
      return [];
    }

    const { posts } = await response.json();
    
    // Transform timestamps to Date objects
    const transformedPosts = posts.map((post: any) => ({
      ...post,
      timestamp: new Date(post.timestamp)
    }));
    
    // Cache the result
    postsCache.set(cacheKey, { data: transformedPosts, timestamp: Date.now() });
    
    return transformedPosts;
  } catch (error) {
    console.error('Error fetching all gaming media Bluesky posts:', error);
    return [];
  }
}

// Topic accounts and their Bluesky handles
export const topicAccountBlueskyHandles: Record<string, string> = {
  'user-ign': 'ign.bsky.social',
  'user-gamespot': 'gamespot.bsky.social',
  'user-polygon': 'polygon.bsky.social',
  'user-kotaku': 'kotaku.bsky.social',
  'user-eurogamer': 'eurogamer.bsky.social',
  'user-nintendolife': 'nintendolife.com',
  'user-pcgamer': 'pcgamer.bsky.social',
  'user-destructoid': 'destructoid.bsky.social',
  'user-rockpapershotgun': 'rockpapershotgun.bsky.social',
  'user-massivelyop': 'mastodon.social/@massivelyop', // Mastodon handle
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