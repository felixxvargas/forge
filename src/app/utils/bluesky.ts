
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
  cid?: string;
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
    // Fetch more than needed so we still have results after filtering out reposts
    const fetchLimit = Math.min(limit * 5, 100);
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=${fetchLimit}&filter=posts_no_replies`
    );

    if (!response.ok) return [];

    const { feed } = await response.json();
    const transformedPosts: BlueskyPost[] = (feed ?? [])
      .filter((item: any) => item?.post && !item.reason) // skip reposts
      .slice(0, limit)
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
          cid: post.cid,
        };
      });

    postsCache.set(cacheKey, { data: transformedPosts, timestamp: Date.now() });
    return transformedPosts;
  } catch {
    return [];
  }
}

// Fetch posts from MassivelyOP on Mastodon (massivelyop@mastodon.social)
export async function fetchMassivelyOPPosts(limit = 5): Promise<BlueskyPost[]> {
  const cacheKey = 'mastodon-massivelyop';
  const cached = postsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // MassivelyOP Mastodon account ID on mastodon.social: 109515680214374940
    const response = await fetch(
      `https://mastodon.social/api/v1/accounts/109515680214374940/statuses?limit=${limit}&exclude_replies=true`
    );

    if (!response.ok) return [];

    const statuses = await response.json();
    const posts: BlueskyPost[] = statuses
      .filter((s: any) => s.content && !s.reblog)
      .map((s: any) => {
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
  } catch {
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
    // Domain-verified Bluesky handles + PC Gamer
    const gamingMediaHandles = ['ign.com', 'gamespot.com', 'xbox.com', 'itch.io', 'pcgamer.com'];

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

// Topic accounts and their verified Bluesky domain handles.
// Only includes accounts confirmed working via Bluesky domain verification.
// Others (polygon.bsky.social, eurogamer.bsky.social, etc.) returned 404 or
// are unverified subdomains that resolve to inactive/incorrect accounts.
export const topicAccountBlueskyHandles: Record<string, string> = {
  // IGN — verified at ign.com
  'user-ign': 'ign.com',
  'ign': 'ign.com',
  'ignentertainment': 'ign.com',
  // GameSpot — verified at gamespot.com
  'user-gamespot': 'gamespot.com',
  'gamespot': 'gamespot.com',
  // Xbox — verified at xbox.com
  'user-xbox': 'xbox.com',
  'xbox': 'xbox.com',
  // itch.io — verified at itch.io
  'user-itchio': 'itch.io',
  'itchio': 'itch.io',
  // PC Gamer — verified at pcgamer.com
  'user-pcgamer': 'pcgamer.com',
  'pcgamer': 'pcgamer.com',
};

export function getBlueskyHandleForUser(userId: string): string | undefined {
  return topicAccountBlueskyHandles[userId];
}

export interface ExternalUser {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followerCount: number;
  platform: 'bluesky' | 'mastodon';
  externalUrl: string;
}

export async function searchBlueskyUsers(query: string, limit = 5): Promise<ExternalUser[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!res.ok) return [];
    const { actors } = await res.json();
    return (actors ?? []).map((a: any): ExternalUser => ({
      id: `bsky-${a.did}`,
      handle: a.handle,
      displayName: a.displayName || a.handle,
      avatar: a.avatar,
      bio: a.description,
      followerCount: a.followersCount ?? 0,
      platform: 'bluesky',
      externalUrl: `https://bsky.app/profile/${a.handle}`,
    }));
  } catch {
    return [];
  }
}

import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

// Store like/repost AT Proto record URIs so we can delete them later
const bskyInteractionStore = {
  getLikeUri: (postUri: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('forge-bsky-likes') || '{}');
      return map[postUri] as string | undefined;
    } catch { return undefined; }
  },
  setLikeUri: (postUri: string, likeUri: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('forge-bsky-likes') || '{}');
      map[postUri] = likeUri;
      localStorage.setItem('forge-bsky-likes', JSON.stringify(map));
    } catch {}
  },
  deleteLikeUri: (postUri: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('forge-bsky-likes') || '{}');
      delete map[postUri];
      localStorage.setItem('forge-bsky-likes', JSON.stringify(map));
    } catch {}
  },
  getRepostUri: (postUri: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('forge-bsky-reposts') || '{}');
      return map[postUri] as string | undefined;
    } catch { return undefined; }
  },
  setRepostUri: (postUri: string, repostUri: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('forge-bsky-reposts') || '{}');
      map[postUri] = repostUri;
      localStorage.setItem('forge-bsky-reposts', JSON.stringify(map));
    } catch {}
  },
  deleteRepostUri: (postUri: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('forge-bsky-reposts') || '{}');
      delete map[postUri];
      localStorage.setItem('forge-bsky-reposts', JSON.stringify(map));
    } catch {}
  },
};

export async function getAtProtoSession(): Promise<{ agent: Agent; did: string } | null> {
  try {
    const IS_DEV = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const CLIENT_ID = IS_DEV ? 'http://localhost' : 'https://forge-social.app/client-metadata.json';
    const client = new BrowserOAuthClient({ clientId: CLIENT_ID, handleResolver: 'https://bsky.social' });
    const result = await client.init();
    if (!result) return null;
    const agent = new Agent(result.session);
    return { agent, did: result.session.did };
  } catch {
    return null;
  }
}

export async function likeAtProtoPost(uri: string, cid: string): Promise<void> {
  const sess = await getAtProtoSession();
  if (!sess) return;
  const { agent, did } = sess;
  try {
    const resp = await (agent as any).api.com.atproto.repo.createRecord({
      repo: did,
      collection: 'app.bsky.feed.like',
      record: { $type: 'app.bsky.feed.like', subject: { uri, cid }, createdAt: new Date().toISOString() },
    });
    bskyInteractionStore.setLikeUri(uri, resp.data.uri);
  } catch (e) {
    console.warn('[bsky] like failed:', e);
  }
}

export async function unlikeAtProtoPost(uri: string): Promise<void> {
  const likeUri = bskyInteractionStore.getLikeUri(uri);
  if (!likeUri) return;
  const sess = await getAtProtoSession();
  if (!sess) return;
  const { agent, did } = sess;
  try {
    const [, , rkey] = likeUri.replace('at://', '').split('/');
    await (agent as any).api.com.atproto.repo.deleteRecord({
      repo: did,
      collection: 'app.bsky.feed.like',
      rkey,
    });
    bskyInteractionStore.deleteLikeUri(uri);
  } catch (e) {
    console.warn('[bsky] unlike failed:', e);
  }
}

export async function repostAtProtoPost(uri: string, cid: string): Promise<void> {
  const sess = await getAtProtoSession();
  if (!sess) return;
  const { agent, did } = sess;
  try {
    const resp = await (agent as any).api.com.atproto.repo.createRecord({
      repo: did,
      collection: 'app.bsky.feed.repost',
      record: { $type: 'app.bsky.feed.repost', subject: { uri, cid }, createdAt: new Date().toISOString() },
    });
    bskyInteractionStore.setRepostUri(uri, resp.data.uri);
  } catch (e) {
    console.warn('[bsky] repost failed:', e);
  }
}

export async function unrepostAtProtoPost(uri: string): Promise<void> {
  const repostUri = bskyInteractionStore.getRepostUri(uri);
  if (!repostUri) return;
  const sess = await getAtProtoSession();
  if (!sess) return;
  const { agent, did } = sess;
  try {
    const [, , rkey] = repostUri.replace('at://', '').split('/');
    await (agent as any).api.com.atproto.repo.deleteRecord({
      repo: did,
      collection: 'app.bsky.feed.repost',
      rkey,
    });
    bskyInteractionStore.deleteRepostUri(uri);
  } catch (e) {
    console.warn('[bsky] unrepost failed:', e);
  }
}

export async function replyToAtProtoPost(
  parentUri: string, parentCid: string,
  rootUri: string, rootCid: string,
  text: string
): Promise<void> {
  const sess = await getAtProtoSession();
  if (!sess) return;
  const { agent, did } = sess;
  try {
    await (agent as any).api.com.atproto.repo.createRecord({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text,
        reply: { root: { uri: rootUri, cid: rootCid }, parent: { uri: parentUri, cid: parentCid } },
        createdAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn('[bsky] reply failed:', e);
  }
}

export async function followAtProtoAccount(did: string): Promise<void> {
  const sess = await getAtProtoSession();
  if (!sess) return;
  const { agent, did: myDid } = sess;
  try {
    await (agent as any).api.com.atproto.repo.createRecord({
      repo: myDid,
      collection: 'app.bsky.graph.follow',
      record: { $type: 'app.bsky.graph.follow', subject: did, createdAt: new Date().toISOString() },
    });
  } catch (e) {
    console.warn('[bsky] follow failed:', e);
  }
}
