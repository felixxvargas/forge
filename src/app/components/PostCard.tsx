import { useState } from 'react';
import { Heart, MessageCircle, Trash2, Repeat2, Upload, MoreHorizontal, BellOff, Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Post, User, SocialPlatform } from '../data/data';
import { LinkifyMentions } from '../utils/linkify';
import { PlatformIcon } from './PlatformIcon';
import { formatTimeAgo } from '../utils/formatTimeAgo';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';
import { ShareModal } from './ShareModal';
import { LinkPreview } from './LinkPreview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface PostCardProps {
  post: Post;
  user: User;
  onLike?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  showDelete?: boolean;
  isDetailView?: boolean;
  explorePurpleMode?: boolean;
  onShowMutedPost?: (postId: string) => void;
  isLiked?: boolean;
  isReposted?: boolean;
  onUserClick?: (e: React.MouseEvent) => void;
}

export function PostCard({ post, user, onLike, onRepost, onComment, onDelete, showDelete = false, isDetailView = false, explorePurpleMode = false, onShowMutedPost, isLiked: isLikedProp, isReposted: isRepostedProp, onUserClick }: PostCardProps) {
  const navigate = useNavigate();
  const context = useAppData();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Safely destructure with fallbacks
  const {
    getUserById,
    repostedPosts = new Set(),
    mutedUsers = new Set(),
    mutedPosts = new Set(),
    mutePost = async () => {},
    unmutePost = async () => {},
    likedPosts = new Set()
  } = context || {};

  const isMutedUser = mutedUsers.has(post.user_id);
  const isMutedPost = mutedPosts.has(post.id);
  
  // Use prop value if provided, otherwise use context
  const isLiked = isLikedProp !== undefined ? isLikedProp : (likedPosts.has(post.id) || post.isLiked);
  const isReposted = isRepostedProp !== undefined ? isRepostedProp : (repostedPosts.has(post.id) || post.isReposted);

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick) {
      onUserClick(e);
    } else {
      navigate(`/profile/${user.id}`);
    }
  };

  const handlePostClick = () => {
    if (!isDetailView) {
      navigate(`/post/${post.id}`);
    }
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRepost) {
      onRepost(post.id);
    }
  };

  const handleMutePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await mutePost(post.id);
    } catch (error) {
      console.error('Error muting post:', error);
    }
  };

  const handleUnmutePost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unmutePost(post.id);
    } catch (error) {
      console.error('Error unmuting post:', error);
    }
  };

  // Get reposter info if this post was reposted
  const reposter = post.repostedBy ? getUserById(post.repostedBy) : null;

  // If user is muted and has onShowMutedPost callback, show collapsed version
  if (isMutedUser && onShowMutedPost) {
    return (
      <div className="mb-4 p-4 bg-secondary/30 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground mb-2">
          Post from muted user @{user.handle.replace('@', '')}
        </p>
        <button
          onClick={() => onShowMutedPost(post.id)}
          className="text-sm text-accent hover:underline"
        >
          Show anyway
        </button>
      </div>
    );
  }

  // If post itself is muted, show collapsed version
  if (isMutedPost && onShowMutedPost) {
    return (
      <div className="mb-4 p-4 bg-secondary/30 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground mb-2">
          You've muted this post
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onShowMutedPost(post.id)}
            className="text-sm text-accent hover:underline"
          >
            Show anyway
          </button>
          <button
            onClick={handleUnmutePost}
            className="text-sm text-accent hover:underline"
          >
            Unmute
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-card p-4 ${!isDetailView ? 'rounded-xl mb-3 cursor-pointer hover:bg-card/80 transition-colors' : ''}`}
      onClick={handlePostClick}
    >
      {/* Repost header */}
      {reposter && (
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <Repeat2 className="w-4 h-4" />
          <span>Reposted by {reposter.display_name}</span>
        </div>
      )}

      {/* User header */}
      <div className="flex items-start gap-3 mb-3">
        <div onClick={handleUserClick} className="cursor-pointer hover:opacity-80 transition-opacity">
          <ProfileAvatar
            username={user.display_name || user.handle || '?'}
            profilePicture={user.profile_picture}
            size="md"
            userId={user.id}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleUserClick}
              className="font-medium hover:underline truncate max-w-[200px]"
            >
              {user.display_name || user.handle}
            </button>
            <button
              onClick={handleUserClick}
              className="text-sm text-muted-foreground hover:underline shrink-0"
            >
              {user.handle}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTimeAgo(post.created_at || post.timestamp)}</span>
            {post.platform && post.platform !== 'forge' && (
              <span className="text-xs text-muted-foreground capitalize">
                via {post.platform === 'x' ? 'X' : post.platform}
              </span>
            )}
          </div>
        </div>
        {showDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(post.id);
            }}
            className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
            title="Delete post"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        )}
        {/* Post menu */}
        {!showDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isMutedPost ? (
                <DropdownMenuItem onClick={handleUnmutePost}>
                  <Bell className="w-4 h-4 mr-2" />
                  Unmute this post
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleMutePost}>
                  <BellOff className="w-4 h-4 mr-2" />
                  Mute this post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      <p className="mb-3 whitespace-pre-wrap">
        <LinkifyMentions text={post.content} />
      </p>

      {/* Link Preview */}
      {post.url && (
        <LinkPreview url={post.url} />
      )}

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className="mb-3 rounded-lg overflow-hidden relative">
          <img 
            src={post.images[0]} 
            alt={post.image_alts?.[0] || "Post content"}
            className="w-full object-cover max-h-80"
          />
          {/* ALT badge if alt text exists */}
          {post.image_alts?.[0] && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium">
              ALT
            </div>
          )}
        </div>
      )}

      {/* Video */}
      {post.video && (
        <div className="mb-3 rounded-lg overflow-hidden bg-black relative">
          <img 
            src={post.video} 
            alt="Video thumbnail"
            className="w-full object-cover max-h-96"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[20px] border-l-black border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike?.(post.id);
          }}
          className={`flex items-center gap-2 text-sm transition-colors ${
            isLiked ? 'text-purple-400' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{post.like_count ?? post.likes ?? 0}</span>
        </button>

        {onRepost && (
          <button
            onClick={handleRepost}
            className={`flex items-center gap-2 text-sm transition-colors ${
              isReposted ? 'text-accent' : 'text-muted-foreground hover:text-accent'
            }`}
          >
            <Repeat2 className="w-5 h-5" />
            <span>{post.repost_count ?? post.reposts ?? 0}</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onComment?.(post.id);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{post.comment_count ?? post.comments ?? 0}</span>
        </button>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShareModalOpen(true);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          <Upload className="w-5 h-5" />
        </button>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        post={post}
      />
    </div>
  );
}