import { useState, useEffect } from 'react';
import { Search, MessageSquare, User as UserIcon, Gamepad2, UserPlus, Users, Lock, X, Plus } from 'lucide-react';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { UserCard } from '../components/UserCard';
import { useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { sampleGames, type User, type Community } from '../data/data';
import { posts as postsAPI } from '../utils/supabase';

type ExploreTab = 'posts' | 'users' | 'games' | 'groups';

export function Explore() {
  const { posts, users, getUserById, followingIds, currentUser, communities, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, blockedUsers, mutedUsers, isLoading } = useAppData();
  
  // Retrieve saved tab from localStorage, default to 'posts'
  const [activeTab, setActiveTab] = useState<ExploreTab>(() => {
    const saved = localStorage.getItem('explore-active-tab');
    return (saved as ExploreTab) || 'posts';
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [topicPosts, setTopicPosts] = useState<any[]>([]);
  const [loadingTopicPosts, setLoadingTopicPosts] = useState(false);
  const [showMutedPosts, setShowMutedPosts] = useState<Set<string>>(new Set());
  const [hideSearchBar, setHideSearchBar] = useState(false);
  const navigate = useNavigate();

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('explore-active-tab', activeTab);
  }, [activeTab]);

  // Handle scroll to hide/show search bar on Games tab
  useEffect(() => {
    // Reset search bar visibility when switching tabs
    setHideSearchBar(false);

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide search bar when scrolling down, show when scrolling up or at top
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHideSearchBar(true);
      } else if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setHideSearchBar(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  // Fetch topic account posts from Supabase
  useEffect(() => {
    if (activeTab !== 'posts') return;
    setLoadingTopicPosts(true);
    postsAPI.getTopicPosts(100)
      .then(setTopicPosts)
      .catch(() => {})
      .finally(() => setLoadingTopicPosts(false));
  }, [activeTab]);

  const handleLikeToggle = (postId: string) => {
    if (likedPosts.has(postId)) {
      unlikePost(postId);
    } else {
      likePost(postId);
    }
  };

  const handleRepost = (postId: string) => {
    if (repostedPosts.has(postId)) {
      unrepostPost(postId);
    } else {
      repostPost(postId);
    }
  };

  const handleComment = (postId: string) => {
    console.log('Comment on post:', postId);
  };

  const handleShowMutedPost = (postId: string) => {
    setShowMutedPosts(prev => new Set([...prev, postId]));
  };

  const handleUserClick = (userId: string) => {
    const user = getUserById(userId);
    if (user) {
      navigate(`/profile/${userId}`);
    }
  };

  // Combine Supabase topic posts with any topic account posts already in the feed
  const seenPostIds = new Set<string>();
  const gamingMediaPosts = [
    ...topicPosts,
    ...posts.filter(p => p.author?.account_type === 'topic' || p.platform === 'bluesky' || p.platform === 'mastodon'),
  ].filter(post => {
    if (!post.content?.trim()) return false;
    if (seenPostIds.has(post.id)) return false;
    seenPostIds.add(post.id);
    const uid = post.user_id || post.userId || '';
    if (blockedUsers.has(uid)) return false;
    if (mutedUsers.has(uid) && !showMutedPosts.has(post.id)) return false;
    return true;
  }).sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());

  // Filter users - exclude current user, blocked users, and apply search
  const filteredUsers = users
    .filter(user => {
      if (user.id === currentUser?.id) return false;
      if (blockedUsers.has(user.id)) return false;
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        (user.display_name || user.displayName || '').toLowerCase().includes(query) ||
        user.handle.toLowerCase().includes(query) ||
        (user.bio || '').toLowerCase().includes(query)
      );
    });

  // Filter communities based on search
  const filteredCommunities = communities.filter(community => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      community.name.toLowerCase().includes(query) ||
      community.description.toLowerCase().includes(query)
    );
  });

  // Filter games based on search
  const filteredGames = sampleGames.filter(game => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      game.title.toLowerCase().includes(query) ||
      (game.genres && game.genres.some(genre => genre.toLowerCase().includes(query)))
    );
  });

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Header title="Explore" />
      
      {/* Search Bar */}
      <div className={`sticky top-14 z-20 bg-black border-b border-gray-800 transition-all duration-300 ${hideSearchBar ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search users, communities, games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-800 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`sticky z-10 transition-all duration-300 border-b border-gray-800 bg-black ${hideSearchBar ? 'top-14' : 'top-[118px]'}`}>
        <div className="max-w-2xl mx-auto w-full flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium transition-colors min-h-[60px] ${
              activeTab === 'posts'
                ? 'text-purple-500 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium transition-colors min-h-[60px] ${
              activeTab === 'users'
                ? 'text-purple-500 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-xs">Users</span>
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium transition-colors min-h-[60px] ${
              activeTab === 'games'
                ? 'text-purple-500 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-xs">Games</span>
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 font-medium transition-colors min-h-[60px] ${
              activeTab === 'groups'
                ? 'text-purple-500 border-b-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs">Groups</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {loadingTopicPosts ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="mt-4 text-gray-400">Loading gaming news...</p>
              </div>
            ) : gamingMediaPosts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No posts to display</p>
              </div>
            ) : (
              gamingMediaPosts.map(post => {
                const user = post.author;
                if (!user) return null;
                const uid = post.user_id || post.userId || '';
                const isMuted = mutedUsers.has(uid);
                const isShown = showMutedPosts.has(post.id);
                
                if (isMuted && !isShown) {
                  return (
                    <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-2">Post from muted user</p>
                      <button
                        onClick={() => handleShowMutedPost(post.id)}
                        className="text-purple-500 text-sm hover:text-purple-400"
                      >
                        Show anyway
                      </button>
                    </div>
                  );
                }
                
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={user!}
                    onLike={() => handleLikeToggle(post.id)}
                    onRepost={() => handleRepost(post.id)}
                    onComment={() => handleComment(post.id)}
                    isLiked={likedPosts.has(post.id)}
                    isReposted={repostedPosts.has(post.id)}
                  />
                );
              })
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </div>
        )}

        {activeTab === 'games' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredGames.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No games found</p>
              </div>
            ) : (
              filteredGames.map(game => (
                <div
                  key={game.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  <div className="aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-gray-900">
                    <img
                      src={game.coverArt}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-purple-400 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{game.year}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/create-group')}
              className="w-full flex items-center gap-3 p-4 bg-accent/10 border-2 border-dashed border-accent/40 rounded-lg hover:bg-accent/15 hover:border-accent/60 transition-colors text-accent"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="font-medium">Create a new group</span>
            </button>
            {filteredCommunities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No communities found</p>
              </div>
            ) : (
              filteredCommunities.map(community => (
                <CommunityCard key={community.id} community={community} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface CommunityCardProps {
  community: Community;
}

function CommunityCard({ community }: CommunityCardProps) {
  const { currentUser } = useAppData();
  const navigate = useNavigate();
  
  const isMember = currentUser?.communities?.some(
    membership => membership.community_id === community.id
  );

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Join community:', community.id);
  };

  const getTypeIcon = () => {
    switch (community.type) {
      case 'invite':
        return <Lock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => navigate(`/community/${community.id}`)}
      className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-purple-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{community.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{community.name}</h3>
            {getTypeIcon()}
          </div>
          <p className="text-sm text-gray-400 line-clamp-2 mb-2">{community.description}</p>
          <p className="text-xs text-gray-500">
            {(community.member_count ?? community.memberCount ?? 0).toLocaleString()} members
          </p>
        </div>
        {!isMember && (
          <button
            onClick={handleJoinClick}
            className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors flex-shrink-0"
          >
            <UserPlus className="w-4 h-4 inline-block mr-1" />
            Join
          </button>
        )}
      </div>
    </div>
  );
}