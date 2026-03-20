import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { type User, type Post, type GameListType, type SocialPlatform } from '../data/data';
import { auth, profiles, posts as postsAPI, communities as communitiesAPI, notifications as notificationsAPI, supabase } from '../utils/supabase';

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
  createPost: (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string) => Promise<void>;
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
  getUserById: (userId: string) => any | undefined;
  refreshFeed: () => Promise<void>;
  markNotificationsAsRead: () => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const isAuthenticated = !!session;

  // Keep a ref to session so refreshFeed can always read the latest value
  // without needing session in its dependency array (avoids double-fetch loops)
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      let profile = await profiles.getById(userId);

      // No profile row yet (e.g. first Google OAuth login, trigger didn't fire).
      // Auto-create a minimal profile so the app doesn't crash.
      if (!profile) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const meta = authUser?.user_metadata ?? {};
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            handle: null,
            display_name: meta.full_name || meta.name || authUser?.email?.split('@')[0] || null,
            profile_picture: meta.avatar_url || meta.picture || null,
          })
          .select()
          .single();
        if (createError) {
          console.error('Error auto-creating profile:', createError.message);
        } else {
          profile = created;
        }
      }

      const [likedIds, repostedIds, blockedIds, mutedIds] = await Promise.all([
        postsAPI.getLikedIds(userId),
        postsAPI.getRepostedIds(userId),
        profiles.getBlockedIds(userId),
        profiles.getMutedIds(userId),
      ]);
      setCurrentUser(normalizeProfile(profile));
      setLikedPosts(new Set(likedIds));
      setRepostedPosts(new Set(repostedIds));
      setBlockedUsers(new Set(blockedIds));
      setMutedUsers(new Set(mutedIds));
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }, []);

  const refreshFeed = useCallback(async () => {
    try {
      const userId = sessionRef.current?.user?.id;
      const feed = userId
        ? await postsAPI.getFollowingFeed(userId, 50)
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
    setCurrentUser(updated);
  };

  const createPost = async (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string, gameId?: string, gameTitle?: string) => {
    if (!session?.user) return;
    const post = await postsAPI.create(session.user.id, content, { images, url, imageAlts, communityId, gameId, gameTitle });
    setPostList(prev => [post, ...prev]);
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
    setPostList(prev => prev.map(p => p.id === postId ? { ...p, repost_count: (p.repost_count ?? 0) + 1 } : p));
  };

  const unrepostPost = async (postId: string) => {
    if (!session?.user) return;
    await postsAPI.unrepost(session.user.id, postId);
    setRepostedPosts(prev => { const s = new Set(prev); s.delete(postId); return s; });
    setPostList(prev => prev.map(p => p.id === postId ? { ...p, repost_count: Math.max(0, (p.repost_count ?? 0) - 1) } : p));
  };

  const followUser = async (userId: string) => {
    if (!session?.user) return;
    await profiles.follow(session.user.id, userId);
    // Optimistic count updates
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, follower_count: (u.follower_count ?? 0) + 1 } : u
    ));
    setCurrentUser((prev: any) => prev ? { ...prev, following_count: (prev.following_count ?? 0) + 1 } : prev);
  };

  const unfollowUser = async (userId: string) => {
    if (!session?.user) return;
    await profiles.unfollow(session.user.id, userId);
    // Optimistic count updates
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
      getUserById,
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
