import { useState } from 'react';
import { Heart, MessageCircle, Trash2, Repeat2, Upload, MoreHorizontal, BellOff, Bell, Gamepad2, ExternalLink, Pin, PinOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Post, User, SocialPlatform } from '../data/data';
import { LinkifyMentions } from '../utils/linkify';
import { PlatformIcon } from './PlatformIcon';
import { formatTimeAgo } from '../utils/formatTimeAgo';
import { formatNumber } from '../utils/formatNumber';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';
import { ShareModal } from './ShareModal';
import { LinkPreview } from './LinkPreview';
import { BlurredImage } from './BlurredImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface PostCardProps {
  post: Post;
  user: User;
  onLike?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onPin?: (postId: string) => void;
  isPinned?: boolean;
  showDelete?: boolean;
  isDetailView?: boolean;
  explorePurpleMode?: boolean;
  onShowMutedPost?: (postId: string) => void;
  isLiked?: boolean;
  isReposted?: boolean;
  onUserClick?: (e: React.MouseEvent) => void;
}

export function PostCard({ post, user, onLike, onRepost, onComment, onDelete, onPin, isPinned = false, showDelete = false, isDetailView = false, explorePurpleMode = false, onShowMutedPost, isLiked: isLikedProp, isReposted: isRepostedProp, onUserClick }: PostCardProps) {
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

  const sourceUrl = post.external_url || post.externalUrl;

  const handlePostClick = () => {
    if (isDetailView) return;
    navigate(`/post/${post.id}`);
  };

  const handleReposterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.repostedBy) navigate(`/profile/${post.repostedBy}`);
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

  // Guard against undefined user
  if (!user) return null;

  // If user is muted and has onShowMutedPost callback, show collapsed version
  if (isMutedUser && onShowMutedPost) {
    return (
      <div className="mb-4 p-4 bg-secondary/30 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground mb-2">
          Post from muted user @{(user.handle || '').replace('@', '')}
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
      {/* Pinned post indicator */}
      {isPinned && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
          <Pin className="w-3 h-3" />
          <span>Pinned post</span>
        </div>
      )}

      {/* Repost header */}
      {reposter && (
        <button
          onClick={handleReposterClick}
          className="flex items-center gap-2 mb-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          <Repeat2 className="w-4 h-4 shrink-0" />
          <span>{reposter.display_name || reposter.handle} reposted</span>
        </button>
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
              {user.handle ? (user.handle.startsWith('@') ? user.handle : `@${user.handle}`) : ''}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>{formatTimeAgo(post.created_at || post.timestamp)}</span>
            {post.platform && post.platform !== 'forge' && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                post.platform === 'bluesky' ? 'bg-sky-500/15 text-sky-400' :
                post.platform === 'mastodon' ? 'bg-purple-500/15 text-purple-400' :
                'bg-secondary text-muted-foreground'
              }`}>
                <PlatformIcon platform={post.platform as SocialPlatform} className="w-3 h-3" />
                {' '}via {post.platform === 'bluesky' ? 'Bluesky' : post.platform === 'mastodon' ? 'Mastodon' : post.platform}
              </span>
            )}
          </div>
        </div>
        {/* Post menu */}
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
            {onPin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onPin(post.id); }}
                >
                  {isPinned ? (
                    <><PinOff className="w-4 h-4 mr-2" />Unpin from profile</>
                  ) : (
                    <><Pin className="w-4 h-4 mr-2" />Pin to profile</>
                  )}
                </DropdownMenuItem>
              </>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content — strip the attached URL from text so the preview isn't duplicated */}
      {(() => {
        const displayContent = post.url
          ? post.content.replace(post.url, '').trimEnd()
          : post.content;
        return displayContent ? (
          <p className="mb-3 whitespace-pre-wrap">
            <LinkifyMentions text={displayContent} />
          </p>
        ) : null;
      })()}

      {/* Link Preview */}
      {post.url && (
        <LinkPreview url={post.url} />
      )}

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className="mb-3 relative">
          <BlurredImage
            src={post.images[0]}
            alt={post.image_alts?.[0] || 'Post image'}
            isBlurred={post.is_blurred ?? false}
          />
          {/* ALT badge if alt text exists */}
          {post.image_alts?.[0] && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-medium pointer-events-none">
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

      {/* Game tag */}
      {post.game_title && (
        <div className="mb-3">
          <button
            onClick={(e) => { e.stopPropagation(); if (post.game_id) navigate(`/game/${post.game_id}`); }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            {post.game_title}
          </button>
        </div>
      )}

      {/* Source link card for third-party posts */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`mb-3 flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors text-sm ${
            post.platform === 'bluesky'
              ? 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400'
              : post.platform === 'mastodon'
              ? 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400'
              : 'border-border bg-secondary/50 hover:bg-secondary text-muted-foreground'
          }`}
        >
          <PlatformIcon platform={post.platform as SocialPlatform} className="w-4 h-4 shrink-0" />
          <span className="flex-1 font-medium">
            View on {post.platform === 'bluesky' ? 'Bluesky' : post.platform === 'mastodon' ? 'Mastodon' : 'source'}
          </span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
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
          <span>{formatNumber(post.like_count ?? post.likes ?? 0)}</span>
        </button>

        {onRepost && (
          <button
            onClick={handleRepost}
            className={`flex items-center gap-2 text-sm transition-colors ${
              isReposted ? 'text-accent' : 'text-muted-foreground hover:text-accent'
            }`}
          >
            <Repeat2 className="w-5 h-5" />
            <span>{formatNumber(post.repost_count ?? post.reposts ?? 0)}</span>
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isDetailView) {
              onComment?.(post.id);
            } else {
              navigate(`/post/${post.id}#comments`);
            }
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{formatNumber(post.comment_count ?? post.comments ?? 0)}</span>
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