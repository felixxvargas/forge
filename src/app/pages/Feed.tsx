import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Users, ChevronDown, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { WritePostModal } from '../components/WritePostModal';
import { WritePostButton } from '../components/WritePostButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAppData } from '../context/AppDataContext';
import { communities } from '../data/data';

// Feed v1.0.1 - Context should now be available through Layout
export function Feed() {
  const { posts, currentUser, getUserById, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, deletePost, filteredSocialPlatforms, blockedUsers, mutedUsers, isLoading } = useAppData();
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMutedPosts, setShowMutedPosts] = useState<Set<string>>(new Set());

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
    // In a real app, this would open a comment modal
  };

  const handleShowMutedPost = (postId: string) => {
    setShowMutedPosts(prev => new Set([...prev, postId]));
  };

  // Get user's communities
  const userCommunities = currentUser.communities?.map(membership => {
    const community = communities.find(c => c.id === membership.communityId);
    return community;
  }).filter(Boolean) || [];

  // Filter posts based on selected community, filtered social platforms, and blocked/muted users
  const filteredPosts = posts.filter(post => {
    // Filter out blocked users completely
    if (blockedUsers.has(post.userId)) {
      return false;
    }

    // Filter by social platform preferences
    if (post.platform && post.platform !== 'forge' && filteredSocialPlatforms.has(post.platform as any)) {
      return false;
    }

    // Filter by community
    if (selectedCommunity) {
      return post.communityId === selectedCommunity;
    }
    
    // Show all posts when "Following" is selected (no communityId filter)
    return true;
  });

  // Separate muted posts for special display
  const visiblePosts = filteredPosts.filter(post => !mutedUsers.has(post.userId));
  const mutedPosts = filteredPosts.filter(post => mutedUsers.has(post.userId) && !showMutedPosts.has(post.id));

  const getSelectedName = () => {
    if (!selectedCommunity) return 'Following';
    const community = communities.find(c => c.id === selectedCommunity);
    return community ? community.name : 'Following';
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        {/* Header with Dropdown */}
        <div className="mb-6 relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 text-2xl font-semibold hover:text-accent transition-colors"
          >
            <span>{getSelectedName()}</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setSelectedCommunity(null);
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                >
                  <span className="font-medium">Following</span>
                  {!selectedCommunity && <Check className="w-4 h-4 text-accent" />}
                </button>
                
                <button
                  onClick={() => {
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                >
                  <span className="font-medium">For You</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                >
                  <span className="font-medium">Trending</span>
                </button>
                
                {userCommunities.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Your Communities
                    </div>
                    {userCommunities.map(community => {
                      if (!community) return null;
                      return (
                        <button
                          key={community.id}
                          onClick={() => {
                            setSelectedCommunity(community.id);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span>{community.icon}</span>
                            <span className="font-medium">{community.name}</span>
                          </div>
                          {selectedCommunity === community.id && (
                            <Check className="w-4 h-4 text-accent" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading posts..." />
          </div>
        )}

        {/* Posts */}
        {!isLoading && (
          <div>
            {visiblePosts.map(post => {
              const user = getUserById(post.userId);
              
              if (!user) return null;

              return (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  user={user}
                  onLike={handleLikeToggle}
                  onRepost={handleRepost}
                  onComment={handleComment}
                  onDelete={post.userId === currentUser.id ? deletePost : undefined}
                  showDelete={post.userId === currentUser.id}
                />
              );
            })}
          </div>
        )}

        {/* Muted Posts */}
        {!isLoading && mutedPosts.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">Muted Posts</div>
            {mutedPosts.map(post => {
              const user = getUserById(post.userId);
              
              if (!user) return null;

              return (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  user={user}
                  onLike={handleLikeToggle}
                  onRepost={handleRepost}
                  onComment={handleComment}
                  onDelete={post.userId === currentUser.id ? deletePost : undefined}
                  showDelete={post.userId === currentUser.id}
                  onShowMutedPost={handleShowMutedPost}
                />
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No posts yet</p>
            <p className="text-sm text-muted-foreground">
              {selectedCommunity 
                ? 'Be the first to post in this community!' 
                : 'Follow some gamers to see their posts here'}
            </p>
          </div>
        )}
      </div>

      {/* Write Post Button */}
      <WritePostButton />
    </div>
  );
}