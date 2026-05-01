import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { toast } from 'sonner';
import { type User, type Post, type GameListType, type SocialPlatform, topicAccounts } from '../data/data';
import { auth, profiles, posts as postsAPI, groups as groupsAPI, notifications as notificationsAPI, userGamesAPI, supabase, streamArchivesAPI } from '../utils/supabase';
import { fetchBlueskyPosts, fetchMassivelyOPPosts, topicAccountBlueskyHandles, likeAtProtoPost, unlikeAtProtoPost, repostAtProtoPost, unrepostAtProtoPost, followAtProtoAccount, fetchBlueskyPosts as fetchBskyPostsForHandle, getAtProtoSession } from '../utils/bluesky';
import { favouriteMastodonPost, unfavouriteMastodonPost, boostMastodonPost, unboostMastodonPost, fetchMastodonAccountPosts, getStoredMastodonToken, followMastodonAccount } from '../utils/mastodonAuth';

// Quick lookup: topicId → User object (for attaching author to external posts)
const topicAccountById: Record<string, User> = Object.fromEntries(
  topicAccounts.map(u => [u.id, u])
);

// Maps topic account synthetic IDs to their Bluesky fetcher
const TOPIC_BLUESKY_MAP: Record<string, string> = {
  'user-ign': 'ign.com',
  'user-gamespot': 'gamespot.com',
  'user-xbox': 'xbox.com',
  'user-itchio': 'itch.io',
  'user-pcgamer': 'pcgamer.com',
  'user-massivelyop': 'massivelyop.bsky.social',
};
const MASTODON_TOPIC_IDS = new Set<string>(); // MassivelyOP migrated to Bluesky

interface AppDataContextType {
  currentUser: any | null;
  session: any | null;
  users: any[];
  posts: any[];
  likedPosts: Set<string>;
  repostedPosts: Set<string>;
  blockedUsers: Set<string>;
  mutedUsers: Set<string>;
  isLoading: boolean;
  topicPostsReady: boolean;
  isAuthenticated: boolean;
  hasUnreadNotifications: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateCurrentUser: (data: Partial<any>) => Promise<void>;
  createPost: (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string, gameIds?: string[], gameTitles?: string[], flareId?: string, commentsDisabled?: boolean, repostsDisabled?: boolean, replyTo?: string, quotePostId?: string, attachedList?: object, poll?: object) => Promise<string | undefined>;
  addPosts: (newPosts: any[]) => void;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  repostPost: (postId: string) => Promise<void>;
  unrepostPost: (postId: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  muteUser: (userId: string) => Promise<void>;
  unmuteUser: (userId: string) => Promise<void>;
  followingIds: Set<string>;
  followedGameIds: Set<string>;
  filteredSocialPlatforms: Set<string>;
  toggleSocialPlatformFilter: (platform: string) => void;
  groups: any[];
  getUserById: (userId: string) => any | undefined;
  getUserByHandle: (handle: string) => any | undefined;
  updateGameList: (listType: GameListType, games: any[]) => Promise<void>;
  createGroup: (name: string, description: string, icon: string, type: string) => Promise<any>;
  refreshFeed: () => Promise<any>;
  refreshGroups: () => Promise<void>;
  markNotificationsAsRead: () => void;
  followGame: (gameId: string) => Promise<void>;
  unfollowGame: (gameId: string) => Promise<void>;
  externalFollowIds: Set<string>;
  followExternalUser: (user: { id: string; platform: string; handle: string; displayName: string; avatar?: string; instance?: string; accountId?: string; did?: string }) => Promise<void>;
  unfollowExternalUser: (id: string) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
AppDataContext.displayName = 'AppDataContext';

// ─── Client-side data cache (localStorage, per-user, 15-min TTL) ─────────────
// Lets the app show content immediately on mobile "return to app" without a
// loading screen, while a background refresh keeps data fresh.

const DATA_CACHE_KEY = 'forge-data-v1';
const DATA_CACHE_TTL = 15 * 60 * 1000;

interface DataCache {
  userId: string;
  ts: number;
  currentUser: any;
  posts: any[];
  users: any[];
  groups: any[];
  likedPosts: string[];
  repostedPosts: string[];
  followingIds: string[];
  followedGameIds: string[];
  memberGroupIds: string[];
  externalFollows: any[];
}

function readDataCache(userId: string): DataCache | null {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as DataCache;
    if (cache.userId !== userId) return null;
    if (Date.now() - cache.ts > DATA_CACHE_TTL) return null;
    return cache;
  } catch { return null; }
}

function writeDataCache(data: DataCache): void {
  try { localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function clearDataCache(): void {
  try { localStorage.removeItem(DATA_CACHE_KEY); } catch { /* ignore */ }
}
// ─────────────────────────────────────────────────────────────────────────────

/** Ensure profile objects never carry null/undefined on fields the UI depends on. */
function normalizeProfile(profile: any): any {
  if (!profile) return profile;
  return {
    ...profile,
    display_name: profile.display_name || profile.handle || 'Gamer',
    handle: profile.handle || 'user',
    profile_picture: profile.profile_picture ?? null,
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [postList, setPostList] = useState<any[]>([]);
  const [topicPosts, setTopicPosts] = useState<any[]>([]);
  const pendingReposts = useRef<Set<string>>(new Set());
  // Ref so followGame/unfollowGame can access currentUser without stale closures
  const currentUserRef = useRef<any>(null);
  // Ref to capture the users array loaded during refreshFeed, used by the init effect
  // to detect topic accounts in the follows table without relying on async state updates
  const lastLoadedUsersRef = useRef<any[]>([]);
  // Refs for sync access to user interaction sets (used for cache writes)
  const likedPostsRef = useRef<string[]>([]);
  const repostedPostsRef = useRef<string[]>([]);
  const followingIdsRef = useRef<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicPostsReady, setTopicPostsReady] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [filteredSocialPlatforms, setFilteredSocialPlatforms] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('forge-filtered-platforms');
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [externalFollows, setExternalFollows] = useState<any[]>([]);
  const externalFollowIds = useMemo(() => new Set(externalFollows.map((f: any) => f.id)), [externalFollows]);

  const isAuthenticated = !!session;

  // Keep a ref to session so refreshFeed can always read the latest value
  // without needing session in its dependency array (avoids double-fetch loops)
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Both a state (exposed to UI) and a ref (used in refreshFeed closure)
  const [followedGameIds, setFollowedGameIds] = useState<Set<string>>(new Set());
  const followedGameIdsRef = useRef<string[]>([]);
  const memberGroupIdsRef = useRef<string[]>([]);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      let profile = await profiles.getById(userId);

      // No profile row found — upsert with ignoreDuplicates so we never overwrite
      // an existing row (handles timing races where getById returned null transiently).
      // ON CONFLICT (id) DO NOTHING preserves any existing display_name / profile_picture.
      if (!profile) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const meta = authUser?.user_metadata ?? {};
        await supabase.from('profiles').upsert({
          id: userId,
          handle: null,
          display_name: meta.full_name || meta.name || authUser?.email?.split('@')[0] || null,
          profile_picture: meta.avatar_url || meta.picture || null,
        }, { onConflict: 'id', ignoreDuplicates: true });

        // Re-fetch unconditionally — gets the real DB state whether newly created or pre-existing
        const { data: fetched } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!fetched) {
          console.error('Failed to load or create profile for user:', userId);
          return;
        }
        profile = fetched;
      }

      const [likedIds, repostedIds, blockedIds, mutedIds, followingIdList, unreadCount, memberships] = await Promise.all([
        postsAPI.getLikedIds(userId),
        postsAPI.getRepostedIds(userId),
        profiles.getBlockedIds(userId),
        profiles.getMutedIds(userId),
        profiles.getFollowingIds(userId),
        notificationsAPI.getUnreadCount(userId),
        groupsAPI.getUserMemberships(userId),
      ]);
      // Followed game IDs are stored in game_lists._followedGames (reliable, uses profiles table)
      const followedGameIds: string[] = profile?.game_lists?._followedGames ?? [];
      followedGameIdsRef.current = followedGameIds;
      setFollowedGameIds(new Set(followedGameIds));
      memberGroupIdsRef.current = (memberships ?? []).map((m: any) => m.community_id).filter(Boolean);
      const normalizedUser = { ...normalizeProfile(profile), communities: memberships };
      currentUserRef.current = normalizedUser;
      setCurrentUser(normalizedUser);
      likedPostsRef.current = likedIds;
      setLikedPosts(new Set(likedIds));
      repostedPostsRef.current = repostedIds;
      setRepostedPosts(new Set(repostedIds));
      setBlockedUsers(new Set(blockedIds));
      setMutedUsers(new Set(mutedIds));
      // Also restore topic account follows stored in game_lists._topicFollows
      const topicFollows: string[] = (profile?.game_lists?._topicFollows) ?? [];
      const mergedFollowingIds = [...followingIdList, ...topicFollows];
      followingIdsRef.current = mergedFollowingIds;
      setFollowingIds(new Set(mergedFollowingIds));
      setHasUnreadNotifications(unreadCount > 0);
      const externalFollowsList: any[] = (profile?.game_lists?._externalFollows) ?? [];
      setExternalFollows(externalFollowsList);
      return { topicFollows, externalFollows: externalFollowsList, followingIdList, likedIds, repostedIds };
    } catch (e) {
      console.error('Error loading user data:', e);
      return { topicFollows: [], externalFollows: [], followingIdList: [] };
    }
  }, []);

  const followGame = useCallback(async (gameId: string) => {
    const userId = sessionRef.current?.user?.id;
    if (!userId) return;
    // Store in game_lists._followedGames (same pattern as _topicFollows — reliable, no RLS issues)
    const existing = currentUserRef.current?.game_lists ?? {};
    const prev: string[] = existing._followedGames ?? [];
    if (!prev.includes(gameId)) {
      const updated = [...prev, gameId];
      await profiles.update(userId, { game_lists: { ...existing, _followedGames: updated } });
      const merged = { ...(currentUserRef.current ?? {}), game_lists: { ...existing, _followedGames: updated } };
      currentUserRef.current = merged;
      setCurrentUser(merged);
    }
    const next = [...followedGameIdsRef.current, gameId];
    followedGameIdsRef.current = next;
    setFollowedGameIds(new Set(next));
  }, []);

  const unfollowGame = useCallback(async (gameId: string) => {
    const userId = sessionRef.current?.user?.id;
    if (!userId) return;
    const existing = currentUserRef.current?.game_lists ?? {};
    const updated = (existing._followedGames ?? []).filter((id: string) => id !== gameId);
    await profiles.update(userId, { game_lists: { ...existing, _followedGames: updated } });
    const merged = { ...(currentUserRef.current ?? {}), game_lists: { ...existing, _followedGames: updated } };
    currentUserRef.current = merged;
    setCurrentUser(merged);
    const next = followedGameIdsRef.current.filter(id => id !== gameId);
    followedGameIdsRef.current = next;
    setFollowedGameIds(new Set(next));
  }, []);

  const refreshGroups = useCallback(async () => {
    try {
      const allGroups = await groupsAPI.getAll();
      setGroupsList(allGroups);
    } catch (e) {
      console.error('[AppData] Error refreshing groups:', e);
    }
  }, []);

  const refreshFeed = useCallback(async () => {
    let loadedUsers: any[] = [];
    let loadedPosts: any[] = [];
    let loadedGroups: any[] = [];
    try {
      const userId = sessionRef.current?.user?.id;
      const feed = userId
        ? await postsAPI.getFollowingFeed(userId, 50, 0, followedGameIdsRef.current, memberGroupIdsRef.current)
        : await postsAPI.getFeed(50);
      setPostList(feed);
      loadedPosts = feed;
    } catch (e) {
      console.error('Error loading feed:', e);
    }
    try {
      const allUsers = await profiles.getAll();
      loadedUsers = allUsers.map(normalizeProfile);
      lastLoadedUsersRef.current = loadedUsers;
      setUsers(loadedUsers);
    } catch (e) {
      console.error('Error loading users:', e);
    }
    try {
      const allGroups = await groupsAPI.getAll();
      setGroupsList(allGroups);
      loadedGroups = allGroups;
    } catch (e) {
      console.error('[AppData] Error loading groups:', e);
    }
    return { posts: loadedPosts, users: loadedUsers, groups: loadedGroups };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Poll for unread notifications every 60s so the badge updates while the user is active
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const poll = async () => {
      try {
        const count = await notificationsAPI.getUnreadCount(userId);
        setHasUnreadNotifications(count > 0);
      } catch { /* ignore */ }
    };
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, [session?.user?.id]);

  // Client-side replacement for pg_cron: check for expiring stream archives on login.
  // Runs once per session. Creates stream_expiry notifications for archives that are
  // 1+ year old and don't already have a recent unread notification.
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const THROTTLE_KEY = `forge-stream-expiry-checked-${userId}`;
    const lastChecked = localStorage.getItem(THROTTLE_KEY);
    // Only run once per 24 hours to avoid hammering the DB on every page load
    if (lastChecked && Date.now() - parseInt(lastChecked, 10) < 24 * 60 * 60 * 1000) return;

    const check = async () => {
      try {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        // Fetch archives that are 1+ year old and not deleted
        const { data: archives } = await supabase
          .from('stream_archives')
          .select('id, title, duration_seconds')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .lt('recorded_at', oneYearAgo);
        if (!archives?.length) return;

        // Fetch existing unread stream_expiry notifications so we don't duplicate
        const archiveIds = archives.map((a: any) => a.id);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from('notifications')
          .select('post_id')
          .eq('user_id', userId)
          .eq('type', 'stream_expiry')
          .eq('read', false)
          .gte('created_at', sevenDaysAgo)
          .in('post_id', archiveIds);

        const alreadyNotified = new Set((existing ?? []).map((n: any) => n.post_id));
        const toNotify = archives.filter((a: any) => !alreadyNotified.has(a.id));
        if (!toNotify.length) return;

        const rows = toNotify.map((a: any) => ({
          user_id: userId,
          actor_id: userId,
          type: 'stream_expiry',
          post_id: a.id,
          read: false,
          metadata: { archive_id: a.id, archive_title: a.title, duration_seconds: a.duration_seconds },
        }));
        await supabase.from('notifications').insert(rows);
        setHasUnreadNotifications(true);
        localStorage.setItem(THROTTLE_KEY, String(Date.now()));
      } catch { /* ignore */ }
    };
    check();
  }, [session?.user?.id]);

  // Real-time notification toasts via Supabase Realtime
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          setHasUnreadNotifications(true);
          // Check user preference before showing toast
          if (localStorage.getItem('forge-toast-notifications') === 'false') return;
          const notif = payload.new as any;
          const typeLabels: Record<string, string> = {
            like: 'liked your post',
            follow: 'followed you',
            mention: 'mentioned you',
            comment: 'commented on your post',
            repost: 'reposted your post',
          };
          const label = typeLabels[notif.type] ?? 'sent you a notification';
          // Fetch actor name for a friendlier message
          let actorName = 'Someone';
          try {
            const { data } = await supabase
              .from('profiles')
              .select('display_name, handle')
              .eq('id', notif.actor_id)
              .single();
            if (data) actorName = data.display_name || data.handle || 'Someone';
          } catch { /* fallback to generic */ }
          toast(`${actorName} ${label}`, {
            action: {
              label: 'View',
              onClick: () => { window.location.href = '/notifications'; },
            },
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // Load data when session changes
  useEffect(() => {
    const init = async () => {
      const userId = session?.user?.id;

      // Hydrate from client-side cache instantly so the loading screen is skipped
      // when the user returns to the app (e.g. after backgrounding on mobile).
      // A background refresh always runs to keep data current.
      const cache = userId ? readDataCache(userId) : null;
      if (cache) {
        setCurrentUser(cache.currentUser);
        currentUserRef.current = cache.currentUser;
        setPostList(cache.posts);
        setUsers(cache.users);
        setGroupsList(cache.groups);
        likedPostsRef.current = cache.likedPosts;
        setLikedPosts(new Set(cache.likedPosts));
        repostedPostsRef.current = cache.repostedPosts;
        setRepostedPosts(new Set(cache.repostedPosts));
        followingIdsRef.current = cache.followingIds;
        setFollowingIds(new Set(cache.followingIds));
        setFollowedGameIds(new Set(cache.followedGameIds));
        followedGameIdsRef.current = cache.followedGameIds;
        memberGroupIdsRef.current = cache.memberGroupIds ?? [];
        setExternalFollows(cache.externalFollows ?? []);
        lastLoadedUsersRef.current = cache.users;
        setIsLoading(false); // Show cached content, no loading screen
        setTopicPostsReady(true);
      } else {
        setIsLoading(true);
        setTopicPostsReady(false);
      }

      try {
        let feedData = await refreshFeed();
        const loadedUsers: any[] = lastLoadedUsersRef.current;
        if (session?.user) {
          const loadResult = await loadUserData(session.user.id);
          // Re-fetch the feed now that game/group IDs are populated in refs
          if (followedGameIdsRef.current.length > 0 || memberGroupIdsRef.current.length > 0) {
            feedData = await refreshFeed();
          }
          const topicFollows = loadResult?.topicFollows ?? [];
          const rawFollowingIdList = loadResult?.followingIdList ?? [];
          const loadedExternalFollows = loadResult?.externalFollows ?? [];

          // Also detect topic accounts that are in the follows table (UUID-based follows from before
          // the _topicFollows migration). Convert their UUID → synthetic ID so posts get fetched.
          const topicFollowPairs: { uuid: string; syntheticId: string }[] = rawFollowingIdList
            .map((uuid: string) => {
              const u = loadedUsers.find((u: any) => u.id === uuid);
              if ((u as any)?.account_type !== 'topic') return null;
              const handle = (u?.handle || '').replace(/^@/, '').toLowerCase();
              return handle ? { uuid, syntheticId: `user-${handle}` } : null;
            })
            .filter((p): p is { uuid: string; syntheticId: string } => p !== null);
          const additionalTopicSyntheticIds = topicFollowPairs.map(p => p.syntheticId);

          // Merge, deduplicate, and persist any newly discovered topic follows back to _topicFollows.
          // Also remove the UUID-based rows from the follows table so future sessions don't re-add them.
          const allTopicFollows = [...new Set([...topicFollows, ...additionalTopicSyntheticIds])];
          if (additionalTopicSyntheticIds.length > 0) {
            try {
              const existing = currentUserRef.current?.game_lists ?? {};
              await profiles.update(session.user.id, {
                game_lists: { ...existing, _topicFollows: allTopicFollows },
              });
              // Clean up UUID-based topic follows so this migration path doesn't run again
              for (const { uuid } of topicFollowPairs) {
                profiles.unfollow(session.user.id, uuid).catch(() => {});
              }
            } catch { /* best-effort */ }
          }

          // Append posts from followed topic accounts into the following feed
          if (allTopicFollows.length > 0) {
            try {
              const fetchPairs = allTopicFollows.map((topicId: string) => {
                const bskyHandle = TOPIC_BLUESKY_MAP[topicId] ?? topicAccountBlueskyHandles[topicId];
                const fetchJob = bskyHandle
                  ? fetchBlueskyPosts(bskyHandle, 10)
                  : MASTODON_TOPIC_IDS.has(topicId)
                    ? fetchMassivelyOPPosts(10)
                    : Promise.resolve([]);
                return { topicId, fetchJob };
              });
              const results = await Promise.allSettled(fetchPairs.map((p: any) => p.fetchJob));
              const topicPosts = results.flatMap((r, i) => {
                if (r.status !== 'fulfilled') return [];
                const { topicId } = fetchPairs[i];
                const author = topicAccountById[topicId];
                return (r as any).value
                  .filter((post: any) => {
                    // Drop URL-only posts that have no images — they render as blank/broken
                    const hasImages = (post.images?.length ?? 0) > 0 || (post.image_urls?.length ?? 0) > 0;
                    const text = (post.content ?? '').trim();
                    const hasRealText = text.length >= 5 && !/^https?:\/\/\S+\s*$/.test(text);
                    return hasImages || hasRealText;
                  })
                  .map((post: any) => ({
                    ...post,
                    user_id: topicId,
                    created_at: post.timestamp instanceof Date
                      ? post.timestamp.toISOString()
                      : (post.timestamp ?? post.created_at),
                    author,
                  }));
              });
              if (topicPosts.length > 0) {
                setTopicPosts(topicPosts);
              }
            } catch (e) {
              console.error('Error loading topic account posts for feed:', e);
            }
          }
          // Load posts for followed external Bluesky/Mastodon accounts
          if (loadedExternalFollows.length > 0) {
            try {
              const externalPosts: any[] = [];
              await Promise.allSettled(
                loadedExternalFollows.map(async (ef: any) => {
                  let rawPosts: any[] = [];
                  if (ef.platform === 'bluesky') {
                    rawPosts = await fetchBskyPostsForHandle(ef.handle, 10).catch(() => []);
                  } else if (ef.platform === 'mastodon' && ef.instance && ef.accountId) {
                    rawPosts = await fetchMastodonAccountPosts(ef.instance, ef.accountId, 10).catch(() => []);
                  }
                  const syntheticAuthor = {
                    id: ef.id,
                    handle: ef.handle,
                    display_name: ef.displayName,
                    profile_picture: ef.avatar ?? null,
                  };
                  for (const post of rawPosts) {
                    externalPosts.push({
                      ...post,
                      user_id: ef.id,
                      created_at: post.timestamp instanceof Date ? post.timestamp.toISOString() : (post.timestamp ?? post.created_at),
                      author: syntheticAuthor,
                    });
                  }
                })
              );
              if (externalPosts.length > 0) {
                setTopicPosts(prev => {
                  const existingIds = new Set(prev.map((p: any) => p.id));
                  const toAdd = externalPosts.filter((p: any) => !existingIds.has(p.id));
                  return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
                });
              }
            } catch (e) {
              console.error('Error loading external follow posts:', e);
            }
          }
          // Write fresh data to client-side cache for instant hydration on next load
          if (userId && currentUserRef.current) {
            writeDataCache({
              userId,
              ts: Date.now(),
              currentUser: currentUserRef.current,
              posts: feedData.posts,
              users: feedData.users,
              groups: feedData.groups,
              likedPosts: likedPostsRef.current,
              repostedPosts: repostedPostsRef.current,
              followingIds: followingIdsRef.current,
              followedGameIds: followedGameIdsRef.current,
              memberGroupIds: memberGroupIdsRef.current,
              externalFollows: loadResult?.externalFollows ?? [],
            });
          }
        } else {
          setCurrentUser(null);
        }
      } finally {
        setTopicPostsReady(true);
        setIsLoading(false);
      }
    };
    init();
  }, [session, loadUserData, refreshFeed]);

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    await auth.signIn(email, password, captchaToken);
  };

  const signUp = async (email: string, password: string) => {
    await auth.signUp(email, password);
  };

  const signInWithGoogle = async () => {
    await auth.signInWithGoogle();
  };

  const signOut = async () => {
    await auth.signOut();
    clearDataCache();
    setCurrentUser(null);
    setPostList([]);
    setTopicPosts([]);
    setLikedPosts(new Set());
    setRepostedPosts(new Set());
  };

  const updateCurrentUser = async (data: Partial<any>) => {
    if (!session?.user) return;
    const updated = await profiles.update(session.user.id, data);
    // Preserve communities (group memberships), topic follows, and followed games — these live
    // outside the profiles row returned by the update call, or may not yet be committed.
    setCurrentUser((prev: any) => {
      const merged = {
        ...updated,
        communities: prev?.communities,
        game_lists: {
          ...(updated?.game_lists ?? {}),
          _topicFollows:
            updated?.game_lists?._topicFollows ??
            prev?.game_lists?._topicFollows ??
            [],
          _followedGames:
            updated?.game_lists?._followedGames ??
            prev?.game_lists?._followedGames ??
            [],
          _externalFollows:
            updated?.game_lists?._externalFollows ??
            prev?.game_lists?._externalFollows ??
            [],
        },
      };
      currentUserRef.current = merged;
      return merged;
    });
  };

  const addPosts = (newPosts: any[]) => {
    setPostList(prev => {
      const existingIds = new Set(prev.map((p: any) => p.id));
      const toAdd = newPosts.filter(p => !existingIds.has(p.id));
      return toAdd.length === 0 ? prev : [...prev, ...toAdd];
    });
  };

  const createPost = async (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string, gameIds?: string[], gameTitles?: string[], flareId?: string, commentsDisabled?: boolean, repostsDisabled?: boolean, replyTo?: string, quotePostId?: string, attachedList?: object, poll?: object): Promise<string | undefined> => {
    if (!session?.user) return undefined;
    const post = await postsAPI.create(session.user.id, content, { images, url, imageAlts, communityId, gameId, gameTitle, gameIds, gameTitles, flareId, commentsDisabled, repostsDisabled, replyTo, quotePostId, attachedList, poll });
    if (!replyTo) {
      setPostList(prev => [post, ...prev]);
    } else {
      // Optimistically increment comment_count on the parent post
      setPostList(prev => prev.map(p => p.id === replyTo ? { ...p, comment_count: (p.comment_count ?? 0) + 1 } : p));
    }
    // Send notifications for @mentions
    const mentionMatches = content.match(/@(\w+)/g) ?? [];
    for (const mention of mentionMatches) {
      const handle = mention.slice(1);
      try {
        const mentioned = await profiles.getByHandle(handle);
        if (mentioned && mentioned.id !== session.user.id) {
          await notificationsAPI.createMention(mentioned.id, session.user.id, post.id);
        }
      } catch { /* silently ignore */ }
    }
    return post.id;
  };

  const deletePost = async (postId: string) => {
    await postsAPI.delete(postId);
    setPostList(prev => prev.filter(p => p.id !== postId));
  };

  const likePost = async (postId: string) => {
    if (!session?.user) return;
    const actorId = session.user.id;
    // Optimistic: update UI immediately so count responds on tap
    setLikedPosts(prev => new Set([...prev, postId]));
    setPostList(prev => prev.map(p => p.id === postId ? { ...p, like_count: (p.like_count ?? 0) + 1 } : p));
    try {
      await postsAPI.like(actorId, postId);
      // Notify the post owner (fire-and-forget, skip self-likes)
      setPostList(prev => {
        const post = prev.find(p => p.id === postId);
        if (post?.user_id && post.user_id !== actorId) {
          notificationsAPI.create('like', post.user_id, actorId, postId).catch(() => {});
        }
        return prev;
      });
      // Also like on AT Protocol if this is a Bluesky post
      if (postId.startsWith('at://')) {
        const allPosts = [...postList, ...topicPosts];
        const targetPost = allPosts.find((p: any) => p.id === postId);
        if (targetPost?.cid) {
          likeAtProtoPost(postId, targetPost.cid).catch(() => {});
        }
      }
      // Also favourite on Mastodon if this is a Mastodon post
      if (postId.startsWith('mastodon-')) {
        const statusId = postId.replace('mastodon-', '');
        const allPosts = [...postList, ...topicPosts];
        const targetPost = allPosts.find((p: any) => p.id === postId);
        const instance = targetPost?.externalUrl ? (() => { try { return new URL(targetPost.externalUrl).hostname; } catch { return null; } })() : null;
        if (instance) {
          const token = getStoredMastodonToken(instance);
          if (token) favouriteMastodonPost(instance, token, statusId).catch(() => {});
        }
      }
    } catch {
      // Rollback on error
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setPostList(prev => prev.map(p => p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) - 1) } : p));
    }
  };

  const unlikePost = async (postId: string) => {
    if (!session?.user) return;
    // Optimistic: update UI immediately
    setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    setPostList(prev => prev.map(p => p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) - 1) } : p));
    try {
      await postsAPI.unlike(session.user.id, postId);
      if (postId.startsWith('at://')) {
        unlikeAtProtoPost(postId).catch(() => {});
      }
      if (postId.startsWith('mastodon-')) {
        const statusId = postId.replace('mastodon-', '');
        const allPosts = [...postList, ...topicPosts];
        const targetPost = allPosts.find((p: any) => p.id === postId);
        const instance = targetPost?.externalUrl ? (() => { try { return new URL(targetPost.externalUrl).hostname; } catch { return null; } })() : null;
        if (instance) {
          const token = getStoredMastodonToken(instance);
          if (token) unfavouriteMastodonPost(instance, token, statusId).catch(() => {});
        }
      }
    } catch {
      // Rollback on error
      setLikedPosts(prev => new Set([...prev, postId]));
      setPostList(prev => prev.map(p => p.id === postId ? { ...p, like_count: (p.like_count ?? 0) + 1 } : p));
    }
  };

  const repostPost = async (postId: string) => {
    if (!session?.user || repostedPosts.has(postId) || pendingReposts.current.has(postId)) return;
    pendingReposts.current.add(postId);
    try {
      await postsAPI.repost(session.user.id, postId);
      setRepostedPosts(prev => new Set([...prev, postId]));
      setPostList(prev => {
        // Find the canonical original (no repostedBy). If only a repost copy exists, use that
        // to derive the current count — avoids count staying 0 when original isn't in postList.
        const original = prev.find(p => p.id === postId && !p.repostedBy)
          ?? prev.find(p => p.id === postId);
        const newCount = (original?.repost_count ?? 0) + 1;
        // Update count on every copy of this post (original + any existing repost copies)
        const updated = prev.map(p => p.id === postId ? { ...p, repost_count: newCount } : p);
        if (original && !original.repostedBy) {
          // Prepend the current user's repost copy for immediate feed display
          return [{ ...original, repost_count: newCount, repostedBy: session.user.id, repostedAt: new Date().toISOString() }, ...updated];
        }
        return updated;
      });
      // Also update count for posts that live in topicPosts (external/Bluesky/Mastodon)
      setTopicPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, repost_count: (p.repost_count ?? 0) + 1 } : p
      ));
      if (postId.startsWith('at://')) {
        const allPosts = [...postList, ...topicPosts];
        const targetPost = allPosts.find((p: any) => p.id === postId);
        if (targetPost?.cid) repostAtProtoPost(postId, targetPost.cid).catch(() => {});
      }
      if (postId.startsWith('mastodon-')) {
        const statusId = postId.replace('mastodon-', '');
        const allPosts = [...postList, ...topicPosts];
        const targetPost = allPosts.find((p: any) => p.id === postId);
        const instance = targetPost?.externalUrl ? (() => { try { return new URL(targetPost.externalUrl).hostname; } catch { return null; } })() : null;
        if (instance) {
          const token = getStoredMastodonToken(instance);
          if (token) boostMastodonPost(instance, token, statusId).catch(() => {});
        }
      }
    } finally {
      pendingReposts.current.delete(postId);
    }
  };

  const unrepostPost = async (postId: string) => {
    if (!session?.user) return;
    const uid = session.user.id;
    // Optimistic update — remove repost copy and decrement count immediately
    setRepostedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    setPostList(prev =>
      prev
        .filter(p => !(p.id === postId && p.repostedBy === uid))
        .map(p => p.id === postId ? { ...p, repost_count: Math.max(0, (p.repost_count ?? 0) - 1) } : p)
    );
    try {
      await postsAPI.unrepost(uid, postId);
      if (postId.startsWith('at://')) unrepostAtProtoPost(postId).catch(() => {});
      if (postId.startsWith('mastodon-')) {
        const statusId = postId.replace('mastodon-', '');
        const allPosts = [...postList, ...topicPosts];
        const targetPost = allPosts.find((p: any) => p.id === postId);
        const instance = targetPost?.externalUrl ? (() => { try { return new URL(targetPost.externalUrl).hostname; } catch { return null; } })() : null;
        if (instance) {
          const token = getStoredMastodonToken(instance);
          if (token) unboostMastodonPost(instance, token, statusId).catch(() => {});
        }
      }
    } catch {
      // Revert on error
      setRepostedPosts(prev => new Set([...prev, postId]));
    }
  };

  // Topic account IDs are synthetic slugs (e.g. 'user-koop', 'studio-koopmode'), not real Supabase UUIDs.
  // They can't use the follows table (FK constraint). We persist them in game_lists._topicFollows instead.
  // Any ID that isn't a UUID format is treated as a topic/synthetic account.
  const isTopicId = (id: string) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Resolve a topic account's canonical synthetic ID (e.g. 'user-ign') from either its synthetic ID
  // or its Supabase UUID (by deriving from the handle stored in the users array).
  const resolveTopicSyntheticId = (userId: string): string | null => {
    if (isTopicId(userId)) return userId; // already a synthetic ID
    const userObj = (users as any[]).find(u => u.id === userId);
    if ((userObj as any)?.account_type !== 'topic') return null;
    const handle = (userObj?.handle || '').replace(/^@/, '').toLowerCase();
    return handle ? `user-${handle}` : null;
  };

  const followUser = async (userId: string) => {
    if (!session?.user) return;
    const syntheticId = resolveTopicSyntheticId(userId);
    if (syntheticId !== null) {
      // Topic account — store in game_lists._topicFollows (avoids follows table FK/RLS issues)
      const existing = (currentUser?.game_lists ?? {}) as any;
      const prev: string[] = existing._topicFollows ?? [];
      if (!prev.includes(syntheticId)) {
        const updated = [...prev, syntheticId];
        await profiles.update(session.user.id, { game_lists: { ...existing, _topicFollows: updated } });
        setCurrentUser((u: any) => u ? { ...u, game_lists: { ...(u.game_lists ?? {}), _topicFollows: updated } } : u);
        // Immediately fetch posts for the newly followed topic account
        try {
          const bskyHandle = TOPIC_BLUESKY_MAP[syntheticId] ?? topicAccountBlueskyHandles[syntheticId];
          const rawPosts = bskyHandle
            ? await fetchBlueskyPosts(bskyHandle, 10)
            : MASTODON_TOPIC_IDS.has(syntheticId)
              ? await fetchMassivelyOPPosts(10)
              : [];
          if (rawPosts.length > 0) {
            const author = topicAccountById[syntheticId];
            const newPosts = rawPosts.map((post: any) => ({
              ...post,
              user_id: syntheticId,
              created_at: post.timestamp instanceof Date
                ? post.timestamp.toISOString()
                : (post.timestamp ?? post.created_at),
              author,
            }));
            setTopicPosts(prev => {
              const existingIds = new Set(prev.map((p: any) => p.id));
              const toAdd = newPosts.filter((p: any) => !existingIds.has(p.id));
              return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
            });
          }
        } catch (e) {
          console.error('Error fetching posts for newly followed topic account:', syntheticId, e);
        }
      }
      // Add both the synthetic ID and the UUID to followingIds so the Profile page button is correct
      setFollowingIds(prev => {
        const updated = new Set(prev);
        updated.add(syntheticId);
        if (userId !== syntheticId) updated.add(userId);
        return updated;
      });
      setCurrentUser((prev: any) => prev ? { ...prev, following_count: (prev.following_count ?? 0) + 1 } : prev);
    } else {
      await profiles.follow(session.user.id, userId);
      setFollowingIds(prev => new Set([...prev, userId]));
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, follower_count: (u.follower_count ?? 0) + 1 } : u
      ));
      setCurrentUser((prev: any) => prev ? { ...prev, following_count: (prev.following_count ?? 0) + 1 } : prev);
    }
  };

  const unfollowUser = async (userId: string) => {
    if (!session?.user) return;
    const syntheticId = resolveTopicSyntheticId(userId);
    if (syntheticId !== null) {
      const existing = (currentUser?.game_lists ?? {}) as any;
      const updated = (existing._topicFollows ?? []).filter((id: string) => id !== syntheticId);
      await profiles.update(session.user.id, { game_lists: { ...existing, _topicFollows: updated } });
      // Also remove any UUID-based follow row for this topic account so the migration
      // doesn't re-add it on the next session load.
      const syntheticHandle = syntheticId.replace(/^user-/, '');
      const topicUser = users.find((u: any) =>
        u.account_type === 'topic' &&
        (u.handle || '').replace(/^@/, '').toLowerCase() === syntheticHandle
      );
      if (topicUser) {
        profiles.unfollow(session.user.id, topicUser.id).catch(() => {});
      }
      setCurrentUser((u: any) => u ? { ...u, game_lists: { ...(u.game_lists ?? {}), _topicFollows: updated } } : u);
      setFollowingIds(prev => {
        const s = new Set(prev);
        s.delete(syntheticId);
        if (userId !== syntheticId) s.delete(userId);
        return s;
      });
      setCurrentUser((prev: any) => prev ? { ...prev, following_count: Math.max(0, (prev.following_count ?? 0) - 1) } : prev);
    } else {
      await profiles.unfollow(session.user.id, userId);
      notificationsAPI.deleteFollowNotification(session.user.id, userId).catch(() => {});
      setFollowingIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, follower_count: Math.max(0, (u.follower_count ?? 0) - 1) } : u
      ));
      setCurrentUser((prev: any) => prev ? { ...prev, following_count: Math.max(0, (prev.following_count ?? 0) - 1) } : prev);
    }
  };

  const followExternalUser = async (user: { id: string; platform: string; handle: string; displayName: string; avatar?: string; instance?: string; accountId?: string; did?: string }) => {
    if (!session?.user) return;
    const existing = (currentUser?.game_lists ?? {}) as any;
    const prev: any[] = existing._externalFollows ?? [];
    if (prev.find((f: any) => f.id === user.id)) return; // already following

    const updated = [...prev, user];
    await profiles.update(session.user.id, { game_lists: { ...existing, _externalFollows: updated } });
    setExternalFollows(updated);
    setCurrentUser((u: any) => u ? { ...u, game_lists: { ...(u.game_lists ?? {}), _externalFollows: updated } } : u);
    currentUserRef.current = { ...(currentUserRef.current ?? {}), game_lists: { ...(currentUserRef.current?.game_lists ?? {}), _externalFollows: updated } };

    // Add to followingIds for UI consistency
    setFollowingIds(prev => new Set([...prev, user.id]));

    // Fetch their posts and inject into feed
    try {
      let rawPosts: any[] = [];
      if (user.platform === 'bluesky') {
        rawPosts = await fetchBskyPostsForHandle(user.handle, 10);
        // Only follow on AT Proto if the current Forge user has an active Bluesky OAuth session
        if (user.did) {
          getAtProtoSession().then(sess => {
            if (sess) followAtProtoAccount(user.did!).catch(() => {});
          }).catch(() => {});
        }
      } else if (user.platform === 'mastodon' && user.instance && user.accountId) {
        rawPosts = await fetchMastodonAccountPosts(user.instance, user.accountId, 10);
        // Only follow on Mastodon if the current Forge user has a stored Mastodon token for this instance
        const token = getStoredMastodonToken(user.instance);
        if (token) {
          followMastodonAccount(user.instance, token, user.accountId).catch(() => {});
        }
      }
      if (rawPosts.length > 0) {
        const syntheticAuthor = { id: user.id, handle: user.handle, display_name: user.displayName, profile_picture: user.avatar ?? null };
        const newPosts = rawPosts.map((post: any) => ({
          ...post,
          user_id: user.id,
          created_at: post.timestamp instanceof Date ? post.timestamp.toISOString() : (post.timestamp ?? post.created_at),
          author: syntheticAuthor,
        }));
        setTopicPosts(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id));
          const toAdd = newPosts.filter((p: any) => !existingIds.has(p.id));
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
      }
    } catch (e) {
      console.error('Error fetching posts for followed external account:', e);
    }
  };

  const unfollowExternalUser = async (id: string) => {
    if (!session?.user) return;
    const existing = (currentUser?.game_lists ?? {}) as any;
    const updated = (existing._externalFollows ?? []).filter((f: any) => f.id !== id);
    await profiles.update(session.user.id, { game_lists: { ...existing, _externalFollows: updated } });
    setExternalFollows(updated);
    setCurrentUser((u: any) => u ? { ...u, game_lists: { ...(u.game_lists ?? {}), _externalFollows: updated } } : u);
    currentUserRef.current = { ...(currentUserRef.current ?? {}), game_lists: { ...(currentUserRef.current?.game_lists ?? {}), _externalFollows: updated } };
    setFollowingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    setTopicPosts(prev => prev.filter((p: any) => p.user_id !== id));
  };

  const blockUser = async (userId: string) => {
    if (!session?.user) return;
    await profiles.block(session.user.id, userId);
    setBlockedUsers(prev => new Set([...prev, userId]));
  };

  const unblockUser = async (userId: string) => {
    if (!session?.user) return;
    await profiles.unblock(session.user.id, userId);
    setBlockedUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
  };

  const muteUser = async (userId: string) => {
    if (!session?.user) return;
    await profiles.mute(session.user.id, userId);
    setMutedUsers(prev => new Set([...prev, userId]));
  };

  const unmuteUser = async (userId: string) => {
    if (!session?.user) return;
    await profiles.unmute(session.user.id, userId);
    setMutedUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
  };

  const getUserById = (userId: string) =>
    users.find(u => u.id === userId) ?? topicAccountById[userId] ?? undefined;
  const getUserByHandle = (handle: string) => {
    const normalized = handle.replace(/^@/, '').toLowerCase();
    return (
      users.find(u => (u.handle || '').replace(/^@/, '').toLowerCase() === normalized) ??
      topicAccounts.find(u => (u.handle || '').replace(/^@/, '').toLowerCase() === normalized)
    );
  };

  const updateGameList = async (listType: GameListType, games: any[]) => {
    if (!session?.user || !currentUser) return;
    const keyMap: Record<string, string> = {
      'recently-played': 'recentlyPlayed',
      'played-before': 'playedBefore',
      'favorite': 'favorites',
      'wishlist': 'wishlist',
      'library': 'library',
      'completed': 'completed',
      'lfg': 'lfg',
    };
    const key = keyMap[listType];
    const existing = currentUser.game_lists ?? {} as any;
    // Auto-show lists when they receive their first games (newly created list becomes visible).
    const wasEmpty = (existing[key] ?? []).length === 0;
    const hiddenLists: string[] = existing.hiddenLists ?? [];
    const newHiddenLists = wasEmpty && games.length > 0
      ? hiddenLists.filter((k: string) => k !== key)
      : hiddenLists;
    const updatedLists = { ...existing, [key]: games, hiddenLists: newHiddenLists };
    const updated = await profiles.update(session.user.id, { game_lists: updatedLists });
    const normalized = normalizeProfile(updated);
    currentUserRef.current = { ...normalized, communities: currentUserRef.current?.communities };
    setCurrentUser((prev: any) => ({ ...normalized, communities: prev?.communities }));

    // Sync to user_games table so game popularity rankings reflect list additions
    const statusMap: Record<string, 'played' | 'owned'> = {
      'recently-played': 'played',
      'completed': 'played',
      'favorite': 'owned',
      'library': 'owned',
      'wishlist': 'owned',
    };
    const status = statusMap[listType] ?? 'owned';
    const userId = session.user.id;
    const entries = games
      .filter((g: any) => g?.id)
      .map((g: any) => ({ user_id: userId, game_id: String(g.id), status }));
    if (entries.length > 0) {
      void supabase
        .from('user_games')
        .upsert(entries, { onConflict: 'user_id,game_id,status', ignoreDuplicates: true }); // non-critical — fire and forget
    }
  };

  const createGroup = async (name: string, description: string, icon: string, type: string) => {
    if (!session?.user) throw new Error('Not authenticated');
    const group = await groupsAPI.create(session.user.id, name, description, icon, type);
    setGroupsList(prev => [...prev, group]);
    return group;
  };

  const toggleSocialPlatformFilter = (platform: string) => {
    setFilteredSocialPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform); else next.add(platform);
      localStorage.setItem('forge-filtered-platforms', JSON.stringify([...next]));
      return next;
    });
  };

  const markNotificationsAsRead = async () => {
    if (!session?.user) return;
    await notificationsAPI.markAllRead(session.user.id);
    setHasUnreadNotifications(false);
  };

  // Re-fetch the current user's profile from DB and sync to React state.
  // Used after onboarding completes to ensure the context reflects the correct
  // handle/display_name set by finishOnboarding, not the stale email-derived values.
  const refreshCurrentUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const profile = await profiles.getById(authUser.id);
    if (!profile) return;
    setCurrentUser((prev: any) => ({
      ...normalizeProfile(profile),
      communities: prev?.communities,
      game_lists: {
        ...(normalizeProfile(profile).game_lists ?? {}),
        _topicFollows: prev?.game_lists?._topicFollows ?? [],
        _followedGames: prev?.game_lists?._followedGames ?? [],
        _externalFollows: prev?.game_lists?._externalFollows ?? [],
      },
    }));
  };

  // Merge DB posts with topic account posts (kept separate so refreshFeed doesn't wipe topic posts)
  const mergedPosts = useMemo(() => {
    const combined = topicPosts.length === 0 ? postList : (() => {
      const existingIds = new Set(postList.map((p: any) => p.id + (p.repostedBy || '')));
      const newTopics = topicPosts.filter((p: any) => !existingIds.has(p.id));
      return [...postList, ...newTopics].sort((a: any, b: any) =>
        new Date(b.repostedAt ?? b.created_at ?? b.timestamp).getTime() - new Date(a.repostedAt ?? a.created_at ?? a.timestamp).getTime()
      );
    })();

    // Deduplicate by post id — keep the most-recent entry per post
    // (prevents original + repost of same post both appearing in the feed)
    const seenIds = new Set<string>();
    const deduped = combined.filter((p: any) => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    // Resolve quotedPost for any post that has quote_post_id
    const byId = new Map(combined.map((p: any) => [p.id, p]));
    return deduped.map((p: any) =>
      p.quote_post_id && !p.quotedPost
        ? { ...p, quotedPost: byId.get(p.quote_post_id) }
        : p
    );
  }, [postList, topicPosts]);

  return (
    <AppDataContext.Provider value={{
      currentUser,
      session,
      users,
      posts: mergedPosts,
      likedPosts,
      repostedPosts,
      blockedUsers,
      mutedUsers,
      isLoading,
      topicPostsReady,
      isAuthenticated,
      hasUnreadNotifications,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateCurrentUser,
      createPost,
      addPosts,
      deletePost,
      likePost,
      unlikePost,
      repostPost,
      unrepostPost,
      followUser,
      unfollowUser,
      blockUser,
      unblockUser,
      muteUser,
      unmuteUser,
      followingIds,
      followedGameIds,
      filteredSocialPlatforms,
      toggleSocialPlatformFilter,
      followGame,
      unfollowGame,
      groups: groupsList,
      getUserById,
      getUserByHandle,
      updateGameList,
      createGroup,
      refreshFeed,
      refreshGroups,
      markNotificationsAsRead,
      externalFollowIds,
      followExternalUser,
      unfollowExternalUser,
      refreshCurrentUser,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
