import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { type User, type Post, type GameListType, type SocialPlatform } from '../data/data';
import { auth, profiles, posts as postsAPI, groups as groupsAPI, notifications as notificationsAPI, userGamesAPI, supabase } from '../utils/supabase';

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
  createPost: (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string, gameIds?: string[], gameTitles?: string[]) => Promise<void>;
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
  groups: any[];
  getUserById: (userId: string) => any | undefined;
  getUserByHandle: (handle: string) => any | undefined;
  updateGameList: (listType: GameListType, games: any[]) => Promise<void>;
  createGroup: (name: string, description: string, icon: string, type: string) => Promise<any>;
  refreshFeed: () => Promise<void>;
  markNotificationsAsRead: () => void;
  followGame: (gameId: string) => Promise<void>;
  unfollowGame: (gameId: string) => Promise<void>;
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

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

      const [likedIds, repostedIds, blockedIds, mutedIds, followingIdList, unreadCount, memberships, followedGameIds] = await Promise.all([
        postsAPI.getLikedIds(userId),
        postsAPI.getRepostedIds(userId),
        profiles.getBlockedIds(userId),
        profiles.getMutedIds(userId),
        profiles.getFollowingIds(userId),
        notificationsAPI.getUnreadCount(userId),
        groupsAPI.getUserMemberships(userId),
        userGamesAPI.getFollowedGameIds(userId),
      ]);
      followedGameIdsRef.current = followedGameIds;
      setFollowedGameIds(new Set(followedGameIds));
      setCurrentUser({ ...normalizeProfile(profile), communities: memberships });
      setLikedPosts(new Set(likedIds));
      setRepostedPosts(new Set(repostedIds));
      setBlockedUsers(new Set(blockedIds));
      setMutedUsers(new Set(mutedIds));
      // Also restore topic account follows stored in game_lists._topicFollows
      const topicFollows: string[] = (profile?.game_lists?._topicFollows) ?? [];
      setFollowingIds(new Set([...followingIdList, ...topicFollows]));
      setHasUnreadNotifications(unreadCount > 0);
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }, []);

  const followGame = useCallback(async (gameId: string) => {
    const userId = sessionRef.current?.user?.id;
    if (!userId) return;
    await userGamesAPI.add(userId, gameId, 'followed');
    const next = [...followedGameIdsRef.current, gameId];
    followedGameIdsRef.current = next;
    setFollowedGameIds(new Set(next));
  }, []);

  const unfollowGame = useCallback(async (gameId: string) => {
    const userId = sessionRef.current?.user?.id;
    if (!userId) return;
    await userGamesAPI.remove(userId, gameId, 'followed');
    const next = followedGameIdsRef.current.filter(id => id !== gameId);
    followedGameIdsRef.current = next;
    setFollowedGameIds(new Set(next));
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

  // Load data when session changes
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshFeed();
        if (session?.user) {
          await loadUserData(session.user.id);
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
    setLikedPosts(new Set());
    setRepostedPosts(new Set());
  };

  const updateCurrentUser = async (data: Partial<any>) => {
    if (!session?.user) return;
    const updated = await profiles.update(session.user.id, data);
    // Preserve communities (group memberships) and topic follows — both live outside
    // the profiles row returned by the update call, or may not yet be committed.
    setCurrentUser((prev: any) => ({
      ...updated,
      communities: prev?.communities,
      game_lists: {
        ...(updated?.game_lists ?? {}),
        // Keep in-memory _topicFollows if the DB row doesn't have it yet (race condition safety)
        _topicFollows:
          updated?.game_lists?._topicFollows ??
          prev?.game_lists?._topicFollows ??
          [],
      },
    }));
  };

  const createPost = async (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string, gameIds?: string[], gameTitles?: string[]) => {
    if (!session?.user) return;
    const post = await postsAPI.create(session.user.id, content, { images, url, imageAlts, communityId, gameId, gameTitle, gameIds, gameTitles });
    setPostList(prev => [post, ...prev]);
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
  };

  const deletePost = async (postId: string) => {
    await postsAPI.delete(postId);
    setPostList(prev => prev.filter(p => p.id !== postId));
  };

  const likePost = async (postId: string) => {
    if (!session?.user) return;
    await postsAPI.like(session.user.id, postId);
    setLikedPosts(prev => new Set([...prev, postId]));
    setPostList(prev => prev.map(p => p.id === postId ? { ...p, like_count: (p.like_count ?? 0) + 1 } : p));
  };

  const unlikePost = async (postId: string) => {
    if (!session?.user) return;
    await postsAPI.unlike(session.user.id, postId);
    setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    setPostList(prev => prev.map(p => p.id === postId ? { ...p, like_count: Math.max(0, (p.like_count ?? 0) - 1) } : p));
  };

  const repostPost = async (postId: string) => {
    if (!session?.user) return;
    await postsAPI.repost(session.user.id, postId);
    setRepostedPosts(prev => new Set([...prev, postId]));
    setPostList(prev => {
      const original = prev.find(p => p.id === postId && !p.repostedBy);
      const updated = prev.map(p => p.id === postId && !p.repostedBy ? { ...p, repost_count: (p.repost_count ?? 0) + 1 } : p);
      if (original) {
        return [{ ...original, repostedBy: session.user.id, repostedAt: new Date().toISOString() }, ...updated];
      }
      return updated;
    });
  };

  const unrepostPost = async (postId: string) => {
    if (!session?.user) return;
    const uid = session.user.id;
    await postsAPI.unrepost(uid, postId);
    setRepostedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    setPostList(prev =>
      prev
        .filter(p => !(p.id === postId && p.repostedBy === uid))
        .map(p => p.id === postId && !p.repostedBy ? { ...p, repost_count: Math.max(0, (p.repost_count ?? 0) - 1) } : p)
    );
  };

  // Topic account IDs are local synthetic IDs (e.g. 'user-koop') not in the Supabase profiles table.
  // They can't use the follows table (FK constraint). We persist them in game_lists._topicFollows instead.
  const isTopicId = (id: string) => id.startsWith('user-');

  const followUser = async (userId: string) => {
    if (!session?.user) return;
    if (isTopicId(userId)) {
      const existing = (currentUser?.game_lists ?? {}) as any;
      const prev: string[] = existing._topicFollows ?? [];
      if (!prev.includes(userId)) {
        const updated = [...prev, userId];
        await profiles.update(session.user.id, { game_lists: { ...existing, _topicFollows: updated } });
        setCurrentUser((u: any) => u ? { ...u, game_lists: { ...(u.game_lists ?? {}), _topicFollows: updated } } : u);
      }
    } else {
      await profiles.follow(session.user.id, userId);
      // Create follow notification (DB trigger also does this, code is a fallback)
      notificationsAPI.create('follow', userId, session.user.id).catch(() => {});
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
      'favorite': 'favorites',
      'wishlist': 'wishlist',
      'library': 'library',
    };
    const key = keyMap[listType];
    const updatedLists = { ...(currentUser.game_lists ?? {}), [key]: games };
    const updated = await profiles.update(session.user.id, { game_lists: updatedLists });
    setCurrentUser(normalizeProfile(updated));
  };

  const createGroup = async (name: string, description: string, icon: string, type: string) => {
    if (!session?.user) throw new Error('Not authenticated');
    const group = await groupsAPI.create(session.user.id, name, description, icon, type);
    setGroupsList(prev => [...prev, group]);
    return group;
  };

  const markNotificationsAsRead = async () => {
    if (!session?.user) return;
    await notificationsAPI.markAllRead(session.user.id);
    setHasUnreadNotifications(false);
  };

  return (
    <AppDataContext.Provider value={{
      currentUser,
      session,
      users,
      posts: postList,
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
      followGame,
      unfollowGame,
      groups: groupsList,
      getUserById,
      getUserByHandle,
      updateGameList,
      createGroup,
      refreshFeed,
      markNotificationsAsRead,
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
