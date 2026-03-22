import { useState, useEffect } from 'react';
import { Plus, TrendingUp, Users, ChevronDown, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Header } from '../components/Header';
import { PostCard } from '../components/PostCard';
import { WritePostModal } from '../components/WritePostModal';
import { WritePostButton } from '../components/WritePostButton';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAppData } from '../context/AppDataContext';

// Feed v1.0.1 - Context should now be available through Layout
export function Feed() {
  const { posts, currentUser, groups, getUserById, likePost, unlikePost, likedPosts, repostedPosts, repostPost, unrepostPost, deletePost, blockedUsers, mutedUsers, isLoading } = useAppData();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
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

  // Get user's groups
  const userGroups = currentUser?.communities?.map(membership => {
    const group = groups.find(c => c.id === membership.community_id);
    return group;
  }).filter(Boolean) || [];

  // Filter posts based on selected group, filtered social platforms, and blocked/muted users
  const filteredPosts = posts.filter(post => {
    // Filter out posts with no content
    if (!post.content?.trim()) return false;

    // Filter out blocked users completely
    if (blockedUsers.has(post.user_id)) {
      return false;
    }

    // Filter by group
    if (selectedGroup) {
      return post.community_id === selectedGroup;
    }

    // Show all posts when "Following" is selected (no community_id filter)
    return true;
  });

  // Separate muted posts for special display
  const visiblePosts = filteredPosts.filter(post => !mutedUsers.has(post.user_id));
  const mutedPosts = filteredPosts.filter(post => mutedUsers.has(post.user_id) && !showMutedPosts.has(post.id));

  const getSelectedName = () => {
    if (!selectedGroup) return 'Following';
    const group = groups.find(c => c.id === selectedGroup);
    return group ? group.name : 'Following';
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
                    setSelectedGroup(null);
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                >
                  <span className="font-medium">Following</span>
                  {!selectedGroup && <Check className="w-4 h-4 text-accent" />}
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
                
                {userGroups.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                      Your Groups
                    </div>
                    {userGroups.map(group => {
                      if (!group) return null;
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            setSelectedGroup(group.id);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span>{group.icon}</span>
                            <span className="font-medium">{group.name}</span>
                          </div>
                          {selectedGroup === group.id && (
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
              const user = post.author;

              if (!user) return null;

              return (
                <PostCard
                  key={post.id}
                  post={post}
                  user={user}
                  onLike={handleLikeToggle}
                  onRepost={handleRepost}
                  onComment={handleComment}
                  onDelete={post.user_id === currentUser?.id ? deletePost : undefined}
                  showDelete={post.user_id === currentUser?.id}
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
              const user = post.author;

              if (!user) return null;

              return (
                <PostCard
                  key={post.id}
                  post={post}
                  user={user}
                  onLike={handleLikeToggle}
                  onRepost={handleRepost}
                  onComment={handleComment}
                  onDelete={post.user_id === currentUser?.id ? deletePost : undefined}
                  showDelete={post.user_id === currentUser?.id}
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
              {selectedGroup
                ? 'Be the first to post in this group!'
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