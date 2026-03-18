import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { currentUser as initialCurrentUser, topicAccounts, initialPosts as initialPosts, type User, type Post, type Game, type GameListType, type SocialPlatform } from '../data/data';
import { authAPI, userAPI, postAPI, safetyAPI } from '../utils/api';

// AppDataContext v1.0.6 - Fixed HMR stability with module acceptance
interface AppDataContextType {
  currentUser: User;
  users: User[];
  posts: Post[];
  likedPosts: Set<string>;
  repostedPosts: Set<string>;
  filteredSocialPlatforms: Set<SocialPlatform>;
  blockedUsers: Set<string>;
  mutedUsers: Set<string>;
  mutedPosts: Set<string>;
  isLoading: boolean;
  hasUnreadNotifications: boolean;
  updateCurrentUser: (data: Partial<User>) => Promise<void>;
  updateGameList: (listType: GameListType, games: Game[]) => Promise<void>;
  createPost: (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  repostPost: (postId: string) => void;
  unrepostPost: (postId: string) => void;
  getUserById: (userId: string) => User | undefined;
  getUserByHandle: (handle: string) => User | undefined;
  toggleSocialPlatformFilter: (platform: SocialPlatform) => void;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  muteUser: (userId: string) => Promise<void>;
  unmuteUser: (userId: string) => Promise<void>;
  mutePost: (postId: string) => Promise<void>;
  unmutePost: (postId: string) => Promise<void>;
  reportUser: (userId: string, reason: string, description?: string) => Promise<void>;
  refreshData: () => Promise<void>;
  markNotificationsAsRead: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

// Add display name for better debugging
AppDataContext.displayName = 'AppDataContext';

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Log mount for debugging HMR issues
  useEffect(() => {
    console.log('✅ AppDataProvider mounted successfully');
    return () => {
      console.log('🔄 AppDataProvider unmounting');
    };
  }, []);
  
  // Initialize with mock data, will be replaced with backend data if authenticated
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('forge-current-user');
    return saved ? JSON.parse(saved) : { ...initialCurrentUser, followingCount: 0 };
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('forge-users');
    return saved ? JSON.parse(saved) : topicAccounts;
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem('forge-posts');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((post: Post) => ({
        ...post,
        timestamp: new Date(post.timestamp),
        reposts: post.reposts ?? 0
      }));
    }
    return initialPosts;
  });

  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('forge-liked-posts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('forge-reposted-posts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [filteredSocialPlatforms, setFilteredSocialPlatforms] = useState<Set<SocialPlatform>>(() => {
    const saved = localStorage.getItem('forge-filtered-social-platforms');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [mutedPosts, setMutedPosts] = useState<Set<string>>(new Set());
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // Define refreshData first so it can be used in initialization
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load current user from backend
      const loadCurrentUser = async () => {
        try {
          console.log('[AppData] Loading current user from backend...');
          const data = await authAPI.getCurrentUser();
          console.log('[AppData] Current user loaded:', {
            hasUser: !!data.user,
            hasProfile: !!data.profile,
            userId: data.user?.id,
            handle: data.profile?.handle
          });
          setCurrentUser(data.profile);
        } catch (error: any) {
          console.error('Could not load current user from backend:', error.message);
        }
      };
      await loadCurrentUser();

      // Load all posts
      try {
        const backendPosts = await postAPI.getAllPosts();
        const formattedPosts = backendPosts.map((post: any) => ({
          ...post,
          timestamp: new Date(post.timestamp)
        }));
        setPosts([...formattedPosts, ...initialPosts]); // Mix backend + mock posts
        localStorage.setItem('forge-posts', JSON.stringify(formattedPosts));
      } catch (error: any) {
        console.log('Could not load posts from backend:', error.message);
      }

      // Load user's liked posts (only if we have a user ID)
      const userId = localStorage.getItem('forge-user-id');
      if (userId) {
        try {
          console.log('[AppData] Loading liked posts for user:', userId);
          const likedPostIds = await postAPI.getUserLikes(userId);
          setLikedPosts(new Set(likedPostIds));
          localStorage.setItem('forge-liked-posts', JSON.stringify(likedPostIds));
        } catch (error: any) {
          console.error('[AppData] Could not load liked posts:', error.message);
        }

        // Load blocked users
        try {
          console.log('[AppData] Loading blocked users for user:', userId);
          const blockedUserIds = await safetyAPI.getBlockedUsers();
          setBlockedUsers(new Set(blockedUserIds));
        } catch (error: any) {
          console.error('[AppData] Could not load blocked users:', error.message);
        }

        // Load muted users
        try {
          console.log('[AppData] Loading muted users for user:', userId);
          const mutedUserIds = await safetyAPI.getMutedUsers();
          setMutedUsers(new Set(mutedUserIds));
        } catch (error: any) {
          console.error('[AppData] Could not load muted users:', error.message);
        }

        // Load muted posts
        try {
          console.log('[AppData] Loading muted posts for user:', userId);
          const mutedPostIds = await safetyAPI.getMutedPosts();
          setMutedPosts(new Set(mutedPostIds));
        } catch (error: any) {
          console.error('[AppData] Could not load muted posts:', error.message);
        }
      }
    } catch (error) {
      console.error('Error loading data from backend:', error);
      // Fall back to localStorage/mock data
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data from backend on mount if authenticated
  useEffect(() => {
    const initializeData = async () => {
      const isLoggedIn = localStorage.getItem('forge-logged-in') === 'true';
      const hasToken = !!localStorage.getItem('forge-access-token');

      console.log('[AppDataProvider] Auth check:', { isLoggedIn, hasToken });

      // Always try to load topic accounts (they're public data and always available)
      try {
        const topicAccountsData = await userAPI.getTopicAccounts();
        if (topicAccountsData && topicAccountsData.length > 0) {
          setUsers(topicAccountsData);
          localStorage.setItem('forge-users', JSON.stringify(topicAccountsData));
        }
      } catch (error: any) {
        console.log('Could not load topic accounts from backend, using cached data:', error.message);
        // Fall back to cached or static data
        const saved = localStorage.getItem('forge-users');
        if (saved) {
          setUsers(JSON.parse(saved));
        } else {
          setUsers(topicAccounts);
        }
      }

      if (isLoggedIn && hasToken) {
        console.log('[AppDataProvider] User is authenticated, loading backend data...');
        setIsAuthenticated(true);
        await refreshData();
      } else {
        console.log('[AppDataProvider] User not authenticated, using local data only');
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    initializeData();
  }, [refreshData]);

  // Save to localStorage whenever data changes (for offline support)
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('forge-current-user', JSON.stringify(currentUser));
    }
  }, [currentUser, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('forge-users', JSON.stringify(users));
    }
  }, [users, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('forge-posts', JSON.stringify(posts));
    }
  }, [posts, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('forge-liked-posts', JSON.stringify([...likedPosts]));
    }
  }, [likedPosts, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('forge-reposted-posts', JSON.stringify([...repostedPosts]));
    }
  }, [repostedPosts, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('forge-filtered-social-platforms', JSON.stringify([...filteredSocialPlatforms]));
    }
  }, [filteredSocialPlatforms, isLoading]);

  const updateCurrentUser = async (data: Partial<User>) => {
    // Optimistically update UI
    setCurrentUser(prev => ({ ...prev, ...data }));

    // Sync with backend if authenticated
    if (isAuthenticated) {
      try {
        const updated = await userAPI.updateUser(currentUser.id, data);
        setCurrentUser(updated);
      } catch (error) {
        console.error('Error updating user:', error);
        // Revert on error
        setCurrentUser(prev => prev);
        throw error;
      }
    }
  };

  const updateGameList = async (listType: GameListType, games: Game[]) => {
    const listKey = listType === 'recently-played' 
      ? 'recentlyPlayed' 
      : listType === 'favorite'
      ? 'favorites'
      : listType === 'wishlist'
      ? 'wishlist'
      : 'library';

    const updatedGameLists = {
      ...currentUser.gameLists,
      [listKey]: games
    };

    await updateCurrentUser({ gameLists: updatedGameLists });
  };

  const createPost = async (content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string) => {
    console.log('[AppDataProvider] createPost called, isAuthenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      try {
        console.log('[AppDataProvider] Creating post on backend...');
        // Create post on backend
        const newPost = await postAPI.createPost(content, images, url, imageAlts, communityId);
        
        console.log('[AppDataProvider] Post created successfully:', newPost);
        // Add to local state
        const formattedPost = {
          ...newPost,
          timestamp: new Date(newPost.timestamp)
        };
        setPosts(prev => [formattedPost, ...prev]);
      } catch (error) {
        console.error('Error creating post:', error);
        throw error;
      }
    } else {
      console.log('[AppDataProvider] NOT authenticated - creating local-only post (THIS SHOULD NOT HAPPEN WHEN LOGGED IN!)');
      // Fallback to local-only post
      const newPost: Post = {
        id: `post-${Date.now()}`,
        userId: currentUser.id,
        content,
        platform: 'forge',
        timestamp: new Date(),
        likes: 0,
        reposts: 0,
        comments: 0,
        isLiked: false,
        images,
        imageAlts,
        url,
        communityId
      };
      setPosts(prev => [newPost, ...prev]);
    }
  };

  const deletePost = async (postId: string) => {
    // Optimistically remove from UI
    setPosts(prev => prev.filter(post => post.id !== postId));

    // Delete from backend if authenticated
    if (isAuthenticated) {
      try {
        await postAPI.deletePost(postId);
      } catch (error) {
        console.error('Error deleting post:', error);
        // Revert on error - reload posts
        await refreshData();
        throw error;
      }
    }
  };

  const likePost = async (postId: string) => {
    // Optimistically update UI
    setLikedPosts(prev => new Set([...prev, postId]));
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: true,
            likes: post.likes + 1
          }
        : post
    ));

    // Sync with backend if authenticated
    if (isAuthenticated) {
      try {
        await postAPI.likePost(postId);
      } catch (error) {
        console.error('Error liking post:', error);
        // Revert on error
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: false,
                likes: Math.max(0, post.likes - 1)
              }
            : post
        ));
      }
    }
  };

  const unlikePost = async (postId: string) => {
    // Optimistically update UI
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: false,
            likes: Math.max(0, post.likes - 1)
          }
        : post
    ));

    // Sync with backend if authenticated
    if (isAuthenticated) {
      try {
        await postAPI.unlikePost(postId);
      } catch (error) {
        console.error('Error unliking post:', error);
        // Revert on error
        setLikedPosts(prev => new Set([...prev, postId]));
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: true,
                likes: post.likes + 1
              }
            : post
        ));
      }
    }
  };

  const repostPost = (postId: string) => {
    setRepostedPosts(prev => new Set([...prev, postId]));
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            reposts: post.reposts + 1
          }
        : post
    ));
    // TODO: Implement repost backend when endpoint is added
  };

  const unrepostPost = (postId: string) => {
    setRepostedPosts(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            reposts: Math.max(0, post.reposts - 1)
          }
        : post
    ));
    // TODO: Implement unrepost backend when endpoint is added
  };

  const toggleSocialPlatformFilter = (platform: SocialPlatform) => {
    setFilteredSocialPlatforms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  };

  const blockUser = async (userId: string) => {
    // Optimistically update
    setBlockedUsers(prev => new Set([...prev, userId]));

    if (isAuthenticated) {
      try {
        await safetyAPI.blockUser(userId);
      } catch (error) {
        console.error('Error blocking user:', error);
        // Revert on error
        setBlockedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        throw error;
      }
    }
  };

  const unblockUser = async (userId: string) => {
    // Optimistically update
    setBlockedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });

    if (isAuthenticated) {
      try {
        await safetyAPI.unblockUser(userId);
      } catch (error) {
        console.error('Error unblocking user:', error);
        // Revert on error
        setBlockedUsers(prev => new Set([...prev, userId]));
        throw error;
      }
    }
  };

  const muteUser = async (userId: string) => {
    // Optimistically update
    setMutedUsers(prev => new Set([...prev, userId]));

    if (isAuthenticated) {
      try {
        await safetyAPI.muteUser(userId);
      } catch (error) {
        console.error('Error muting user:', error);
        // Revert on error
        setMutedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        throw error;
      }
    }
  };

  const unmuteUser = async (userId: string) => {
    // Optimistically update
    setMutedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });

    if (isAuthenticated) {
      try {
        await safetyAPI.unmuteUser(userId);
      } catch (error) {
        console.error('Error unmuting user:', error);
        // Revert on error
        setMutedUsers(prev => new Set([...prev, userId]));
        throw error;
      }
    }
  };

  const mutePost = async (postId: string) => {
    // Optimistically update
    setMutedPosts(prev => new Set([...prev, postId]));

    if (isAuthenticated) {
      try {
        await safetyAPI.mutePost(postId);
      } catch (error) {
        console.error('Error muting post:', error);
        // Revert on error
        setMutedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        throw error;
      }
    }
  };

  const unmutePost = async (postId: string) => {
    // Optimistically update
    setMutedPosts(prev => {
      const newSet = new Set(prev);
      newSet.delete(postId);
      return newSet;
    });

    if (isAuthenticated) {
      try {
        await safetyAPI.unmutePost(postId);
      } catch (error) {
        console.error('Error unmuting post:', error);
        // Revert on error
        setMutedPosts(prev => new Set([...prev, postId]));
        throw error;
      }
    }
  };

  const reportUser = async (userId: string, reason: string, description?: string) => {
    if (isAuthenticated) {
      try {
        await safetyAPI.reportUser(userId, reason, description);
      } catch (error) {
        console.error('Error reporting user:', error);
        throw error;
      }
    }
  };

  const getUserById = (userId: string) => {
    if (userId === currentUser.id) return currentUser;
    const found = users.find(u => u.id === userId);
    if (!found) {
      return {
        id: userId,
        handle: '@unknown',
        displayName: 'Unknown User',
        bio: '',
        profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
        platforms: [],
        socialPlatforms: [],
        gameLists: {
          recentlyPlayed: [],
          library: [],
          favorites: [],
          wishlist: []
        }
      };
    }
    return found;
  };

  const getUserByHandle = (handle: string) => {
    const normalizedHandle = handle.startsWith('@') ? handle.toLowerCase() : `@${handle.toLowerCase()}`;
    
    if (currentUser.handle.toLowerCase() === normalizedHandle) {
      return currentUser;
    }
    
    const found = users.find(u => u.handle.toLowerCase() === normalizedHandle);
    if (!found) {
      return undefined;
    }
    return found;
  };

  const markNotificationsAsRead = () => {
    setHasUnreadNotifications(false);
  };

  return (
    <AppDataContext.Provider value={{
      currentUser,
      users,
      posts,
      likedPosts,
      repostedPosts,
      filteredSocialPlatforms,
      blockedUsers,
      mutedUsers,
      mutedPosts,
      isLoading,
      hasUnreadNotifications,
      updateCurrentUser,
      updateGameList,
      createPost,
      deletePost,
      likePost,
      unlikePost,
      repostPost,
      unrepostPost,
      getUserById,
      getUserByHandle,
      toggleSocialPlatformFilter,
      blockUser,
      unblockUser,
      muteUser,
      unmuteUser,
      mutePost,
      unmutePost,
      reportUser,
      refreshData,
      markNotificationsAsRead
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

AppDataProvider.displayName = 'AppDataProvider';

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    // During HMR (Hot Module Reload), context can temporarily be undefined
    // Log detailed error info for debugging
    console.error('useAppData called outside of AppDataProvider.');
    console.error('Current location:', window.location.href);
    console.error('This may be caused by:');
    console.error('1. Component rendered outside AppDataProvider');
    console.error('2. Hot Module Replacement (HMR) temporarily breaking context');
    console.error('Try: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
    
    // Check if we're in development mode and this might be an HMR issue
    if (import.meta.env.DEV) {
      console.warn('⚠️ Development mode: This might be a temporary HMR issue. Try refreshing the page.');
    }
    
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}

useAppData.displayName = 'useAppData';

// HMR: Accept updates to this module
if (import.meta.hot) {
  import.meta.hot.accept();
  console.log('[HMR] AppDataContext module updated');
}