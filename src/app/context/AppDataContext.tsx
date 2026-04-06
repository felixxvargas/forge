import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { type User, type Post, type GameListType, type SocialPlatform, topicAccounts } from '../data/data';
import { auth, profiles, posts as postsAPI, groups as groupsAPI, notifications as notificationsAPI, userGamesAPI, supabase } from '../utils/supabase';
import { fetchBlueskyPosts, fetchMassivelyOPPosts, topicAccountBlueskyHandles, likeAtProtoPost, unlikeAtProtoPost, repostAtProtoPost, unrepostAtProtoPost, followAtProtoAccount, fetchBlueskyPosts as fetchBskyPostsForHandle, getAtProtoSession } from '../utils/bluesky';
import { favouriteMastodonPost, unfavouriteMastodonPost, boostMastodonPost, unboostMastodonPost, fetchMastodonAccountPosts, getStoredMastodonToken, followMastodonAccount } from '../utils/mastodonAuth';

// Quick lookup: topicId → User object (for attaching author to external posts)
const topicAccountById: Record<string, User> = Object.fromEntries(
  topicAccounts.map(u => [u.id, u])
);

// Maps topic account synthetic IDs to their Bluesky/Mastodon fetcher
const TOPIC_BLUESKY_MAP: Record<string, string> = {
  'user-ign': 'ign.com',
  'user-gamespot': 'gamespot.com',
  'user-xbox': 'xbox.com',
  'user-itchio': 'itch.io',
  'user-pcgamer': 'pcgamer.com',
};
const MASTODON_TOPIC_IDS = new Set(['user-massivelyop']);

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
  isAuthenticated: boolean;
  hasUnreadNotifications: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateCurrentUser: (data: Partial<any>) => Promise<void>;
  createPost: (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string, gameIds?: string[], gameTitles?: string[], flareId?: string, commentsDisabled?: boolean, repostsDisabled?: boolean, replyTo?: string) => Promise<string | undefined>;
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
  refreshFeed: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  markNotificationsAsRead: () => void;
  followGame: (gameId: string) => Promise<void>;
  unfollowGame: (gameId: string) => Promise<void>;
  externalFollowIds: Set<string>;
  followExternalUser: (user: { id: string; platform: string; handle: string; displayName: string; avatar?: string; instance?: string; accountId?: string; did?: string }) => Promise<void>;
  unfollowExternalUser: (id: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
AppDataContext.displayName = 'AppDataContext';

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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const normalizedUser = { ...normalizeProfile(profile), communities: memberships };
      currentUserRef.current = normalizedUser;
      setCurrentUser(normalizedUser);
      setLikedPosts(new Set(likedIds));
      setRepostedPosts(new Set(repostedIds));
      setBlockedUsers(new Set(blockedIds));
      setMutedUsers(new Set(mutedIds));
      // Also restore topic account follows stored in game_lists._topicFollows
      const topicFollows: string[] = (profile?.game_lists?._topicFollows) ?? [];
      setFollowingIds(new Set([...followingIdList, ...topicFollows]));
      setHasUnreadNotifications(unreadCount > 0);
      const externalFollowsList: any[] = (profile?.game_lists?._externalFollows) ?? [];
      setExternalFollows(externalFollowsList);
      return { topicFollows, externalFollows: externalFollowsList };
    } catch (e) {
      console.error('Error loading user data:', e);
      return { topicFollows: [], externalFollows: [] };
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
    try {
      const userId = sessionRef.current?.user?.id;
      const feed = userId
        ? await postsAPI.getFollowingFeed(userId, 50, 0, followedGameIdsRef.current)
        : await postsAPI.getFeed(50);
      setPostList(feed);
    } catch (e) {
      console.error('Error loading feed:', e);
    }
    try {
      const allUsers = await profiles.getAll();
      setUsers(allUsers.map(normalizeProfile));
    } catch (e) {
      console.error('Error loading users:', e);
    }
    try {
      const allGroups = await groupsAPI.getAll();
      setGroupsList(allGroups);
    } catch (e) {
      console.error('[AppData] Error loading groups:', e);
    }
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

  // Load data when session changes
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshFeed();
        if (session?.user) {
          const loadResult = await loadUserData(session.user.id);
          const topicFollows = loadResult?.topicFollows ?? [];
          const loadedExternalFollows = loadResult?.externalFollows ?? [];
          // Append posts from followed topic accounts into the following feed
          if (topicFollows && topicFollows.length > 0) {
            try {
              const fetchPairs = topicFollows.map((topicId: string) => {
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
                return (r as any).value.map((post: any) => ({
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
        } else {
          setCurrentUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [session, loadUserData, refreshFeed]);

  const signIn = async (email: string, password: string) => {
    await auth.signIn(email, password);
  };

  const signUp = async (email: string, password: string) => {
    await auth.signUp(email, password);
  };

  const signInWithGoogle = async () => {
    await auth.signInWithGoogle();
  };

  const signOut = async () => {
    await auth.signOut();
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

  const createPost = async (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string, gameIds?: string[], gameTitles?: string[], flareId?: string, commentsDisabled?: boolean, repostsDisabled?: boolean, replyTo?: string): Promise<string | undefined> => {
    if (!session?.user) return undefined;
    const post = await postsAPI.create(session.user.id, content, { images, url, imageAlts, communityId, gameId, gameTitle, gameIds, gameTitles, flareId, commentsDisabled, repostsDisabled, replyTo });
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
        const original = prev.find(p => p.id === postId && !p.repostedBy);
        const newCount = (original?.repost_count ?? 0) + 1;
        const updated = prev.map(p => p.id === postId && !p.repostedBy ? { ...p, repost_count: newCount } : p);
        if (original) {
          // Repost copy uses the same new count so both instances display identically
          return [{ ...original, repost_count: newCount, repostedBy: session.user.id, repostedAt: new Date().toISOString() }, ...updated];
        }
        return updated;
      });
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
        .map(p => p.id === postId && !p.repostedBy ? { ...p, repost_count: Math.max(0, (p.repost_count ?? 0) - 1) } : p)
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

  const followUser = async (userId: string) => {
    if (!session?.user) return;
    if (isTopicId(userId)) {
      const existing = (currentUser?.game_lists ?? {}) as any;
      const prev: string[] = existing._topicFollows ?? [];
      if (!prev.includes(userId)) {
        const updated = [...prev, userId];
        await profiles.update(session.user.id, { game_lists: { ...existing, _topicFollows: updated } });
        setCurrentUser((u: any) => u ? { ...u, game_lists: { ...(u.game_lists ?? {}), _topicFollows: updated } } : u);
        // Immediately fetch posts for the newly followed topic account
        try {
          const bskyHandle = TOPIC_BLUESKY_MAP[userId] ?? topicAccountBlueskyHandles[userId];
          const rawPosts = bskyHandle
            ? await fetchBlueskyPosts(bskyHandle, 10)
            : MASTODON_TOPIC_IDS.has(userId)
              ? await fetchMassivelyOPPosts(10)
              : [];
          if (rawPosts.length > 0) {
            const author = topicAccountById[userId];
            const newPosts = rawPosts.map((post: any) => ({
              ...post,
              user_id: userId,
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
          console.error('Error fetching posts for newly followed topic account:', userId, e);
        }
      }
    } else {
      await profiles.follow(session.user.id, userId);
    }
    setFollowingIds(prev => new Set([...prev, userId]));
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, follower_count: (u.follower_count ?? 0) + 1 } : u
    ));
    setCurrentUser((prev: any) => prev ? { ...prev, following_count: (prev.following_count ?? 0) + 1 } : prev);
  };

  const unfollowUser = async (userId: string) => {
    if (!session?.user) return;
    if (isTopicId(userId)) {
      const existing = (currentUser?.game_lists ?? {}) as any;
      const updated = (existing._topicFollows ?? []).filter((id: string) => id !== userId);
      await profiles.update(session.user.id, { game_lists: { ...existing, _topicFollows: updated } });
      setCurrentUser((u: any) => u ? { ...u, game_lists: { ...(u.game_lists ?? {}), _topicFollows: updated } } : u);
    } else {
      await profiles.unfollow(session.user.id, userId);
    }
    setFollowingIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, follower_count: Math.max(0, (u.follower_count ?? 0) - 1) } : u
    ));
    setCurrentUser((prev: any) => prev ? { ...prev, following_count: Math.max(0, (prev.following_count ?? 0) - 1) } : prev);
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

  const getUserById = (userId: string) => users.find(u => u.id === userId);
  const getUserByHandle = (handle: string) => {
    const normalized = handle.replace(/^@/, '').toLowerCase();
    return users.find(u => (u.handle || '').replace(/^@/, '').toLowerCase() === normalized);
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
    };
    const key = keyMap[listType];
    const existing = currentUser.game_lists ?? {} as any;
    // Auto-hide lists when they're first populated programmatically (e.g. via game detail buttons).
    // The user can explicitly show them again via the "Create a game list" selector on their profile.
    const wasEmpty = (existing[key] ?? []).length === 0;
    const hiddenLists: string[] = existing.hiddenLists ?? [];
    const newHiddenLists = wasEmpty && games.length > 0 && !hiddenLists.includes(key)
      ? [...hiddenLists, key]
      : hiddenLists;
    const updatedLists = { ...existing, [key]: games, hiddenLists: newHiddenLists };
    const updated = await profiles.update(session.user.id, { game_lists: updatedLists });
    setCurrentUser(normalizeProfile(updated));

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
      supabase
        .from('user_games')
        .upsert(entries, { onConflict: 'user_id,game_id,status', ignoreDuplicates: true })
        .then(() => {})
        .catch(() => {}); // non-critical — fire and forget
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

  // Merge DB posts with topic account posts (kept separate so refreshFeed doesn't wipe topic posts)
  const mergedPosts = useMemo(() => {
    if (topicPosts.length === 0) return postList;
    const existingIds = new Set(postList.map((p: any) => p.id + (p.repostedBy || '')));
    const newTopics = topicPosts.filter((p: any) => !existingIds.has(p.id));
    return [...postList, ...newTopics].sort((a: any, b: any) =>
      new Date(b.created_at ?? b.timestamp).getTime() - new Date(a.created_at ?? a.timestamp).getTime()
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
