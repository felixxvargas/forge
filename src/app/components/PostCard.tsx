import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Trash2, Repeat2, Upload, MoreHorizontal, BellOff, Bell, Gamepad2, ExternalLink, Pin, PinOff, Flame, CornerUpLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Post, User, SocialPlatform } from '../data/data';
import { LinkifyMentions } from '../utils/linkify';
import { PlatformIcon } from './PlatformIcon';
import { formatTimeAgo } from '../utils/formatTimeAgo';
import { formatNumber } from '../utils/formatNumber';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';
import { useBlueskyData } from '../hooks/useBlueskyData';
import { ShareModal } from './ShareModal';
import { gameCoverCache } from '../utils/mentionHighlight';
import { gamesAPI } from '../utils/api';
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
  const isAuthenticated = (context as any)?.isAuthenticated ?? false;

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    action();
  };
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showRepostTray, setShowRepostTray] = useState(false);

  // External posts (AT Proto / ActivityPub) — engagement is read-only
  const isExternalPost = post.platform === 'bluesky' || post.platform === 'mastodon';

  // Build the full list of tagged games (multi-tag array takes priority; falls back to single field)
  const taggedGames: { id: string; title: string }[] = (() => {
    const ids: string[] = post.game_ids?.length > 0 ? post.game_ids : post.game_id ? [post.game_id] : [];
    const titles: string[] = post.game_titles?.length > 0 ? post.game_titles : post.game_title ? [post.game_title] : [];
    return ids.map((id: string, i: number) => ({ id, title: titles[i] || '' })).filter((g: { id: string; title: string }) => g.id);
  })();

  // Lazy-load cover art for all tagged games
  const [gameCovers, setGameCovers] = useState<Map<string, string | null>>(() => {
    const m = new Map<string, string | null>();
    taggedGames.forEach(g => { if (gameCoverCache.has(g.id)) m.set(g.id, gameCoverCache.get(g.id) ?? null); });
    return m;
  });
  useEffect(() => {
    taggedGames.forEach(g => {
      if (gameCoverCache.has(g.id)) return;
      gamesAPI.getGame(g.id).then((data: any) => {
        const game = data?.game ?? data;
        const url = game?.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game?.artwork?.[0]?.url ?? null;
        gameCoverCache.set(g.id, url);
        setGameCovers(prev => new Map(prev).set(g.id, url));
      }).catch(() => { gameCoverCache.set(g.id, null); });
    });
  }, [post.game_ids?.join(',') ?? post.game_id]);

  // Resolve profile picture: Bluesky avatar (topic accounts), then snake_case (Supabase),
  // then camelCase (topic account User objects from data.ts), then undefined.
  const blueskyData = useBlueskyData(user);
  const resolvedProfilePicture = blueskyData.avatar
    || user?.profile_picture
    || (user as any)?.profilePicture
    || undefined;

  // Safely destructure with fallbacks
  const {
    getUserById,
    posts: contextPosts = [],
    repostedPosts = new Set(),
    mutedUsers = new Set(),
    mutedPosts = new Set(),
    mutePost = async () => {},
    unmutePost = async () => {},
    likedPosts = new Set(),
    followedGameIds = new Set()
  } = context || {};

  // Games in this post that the user follows (drives the "following" indicator)
  const followedTaggedGames = taggedGames.filter(g => (followedGameIds as Set<string>).has(g.id));

  // "Replying to" — resolve parent post author from context for feed indicator
  const parentPostInContext = (post as any).reply_to
    ? (contextPosts as any[]).find((p: any) => p.id === (post as any).reply_to)
    : null;
  const parentAuthorHandle = parentPostInContext
    ? ((parentPostInContext.author ?? getUserById?.(parentPostInContext.user_id))?.handle ?? '').replace(/^@/, '')
    : null;

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

  // Flare post detection
  const flareId = post.flare_id;
  const isFlarePost = !!flareId || /^🔥 (Looking for Group|Looking for More):/.test(post.content ?? '');
  const flareTypeMatch = (post.content ?? '').match(/^🔥 (Looking for Group|Looking for More):/);
  const flareLabel = flareTypeMatch?.[1] ?? 'LFG Flare';

  const handlePostClick = () => {
    if (isDetailView) return;
    if (isFlarePost && flareId) {
      navigate(`/flare/${flareId}`);
    } else {
      // Encode external IDs (at:// URIs, mastodon- prefixed) so they survive URL routing
      navigate(`/post/${encodeURIComponent(post.id)}`);
    }
  };

  const handleReposterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.repostedBy) navigate(`/profile/${post.repostedBy}`);
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    requireAuth(() => setShowRepostTray(true));
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
      className={`${
        isFlarePost
          ? 'relative overflow-hidden border border-orange-500/30 bg-gradient-to-br from-orange-950/60 via-red-950/30 to-card'
          : 'bg-card'
      } p-4 ${!isDetailView ? 'rounded-xl mb-3 cursor-pointer transition-colors' : ''} ${
        isFlarePost && !isDetailView ? 'hover:from-orange-950/70 hover:via-red-950/40' : !isFlarePost && !isDetailView ? 'hover:bg-card/80' : ''
      }`}
      onClick={handlePostClick}
    >
      {/* Flare header banner */}
      {isFlarePost && (
        <div className="flex items-center gap-2 -mx-4 -mt-4 mb-3 px-4 py-2 bg-gradient-to-r from-orange-500/25 via-red-500/15 to-transparent border-b border-orange-500/25">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
            <Flame className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-orange-400 tracking-wide uppercase">{flareLabel}</span>
          {flareId && !isDetailView && (
            <span className="ml-auto text-xs text-orange-400/60 font-medium">View Flare →</span>
          )}
        </div>
      )}

      {/* Following game indicator */}
      {followedTaggedGames.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-accent/70">
          <Bell className="w-3 h-3" />
          <span>Following {followedTaggedGames.map(g => g.title).join(', ')}</span>
        </div>
      )}

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
          className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
        >
          <Repeat2 className="w-3.5 h-3.5 shrink-0" />
          <span>{reposter.display_name || reposter.handle} reposted</span>
        </button>
      )}

      {/* Reply indicator */}
      {!isDetailView && (post as any).reply_to && (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/post/${(post as any).reply_to}`); }}
          className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <CornerUpLeft className="w-3.5 h-3.5 shrink-0" />
          <span>Replying to {parentAuthorHandle ? `@${parentAuthorHandle}` : 'a post'}</span>
        </button>
      )}

      {/* User header */}
      <div className="flex items-start gap-3 mb-3">
        <div onClick={handleUserClick} className="cursor-pointer hover:opacity-80 transition-opacity">
          <ProfileAvatar
            username={user.display_name || user.handle || '?'}
            profilePicture={resolvedProfilePicture}
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

      {/* Content — strip the preview URL from text so it isn't duplicated */}
      {(() => {
        // Use explicit url field first; fall back to first https URL found in content
        const contentUrl = post.content?.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/)?.[0];
        const previewUrl = post.url || contentUrl;
        const displayContent = previewUrl
          ? (post.content || '').replace(previewUrl, '').trimEnd()
          : post.content;
        return (
          <>
            {displayContent ? (
              <p className="mb-3 whitespace-pre-wrap">
                <LinkifyMentions text={displayContent} gameId={post.game_id} gameTitle={post.game_title} />
              </p>
            ) : null}
            {previewUrl && <LinkPreview url={previewUrl} />}
          </>
        );
      })()}

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

      {/* Game tags */}
      {taggedGames.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {taggedGames.map(g => {
            const cover = gameCovers.get(g.id) ?? null;
            return (
              <button
                key={g.id}
                onClick={(e) => { e.stopPropagation(); navigate(`/game/${g.id}`); }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors max-w-[260px] text-left"
              >
                {cover ? (
                  <img src={cover} alt={g.title} className="w-8 h-10 rounded-md object-cover shrink-0" />
                ) : (
                  <Gamepad2 className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide leading-none mb-0.5">Game</p>
                  <p className="text-sm font-semibold truncate leading-tight">{g.title}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Source link card for third-party posts */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`mb-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
            post.platform === 'bluesky'
              ? 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400'
              : post.platform === 'mastodon'
              ? 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400'
              : 'border-border bg-secondary/50 hover:bg-secondary text-muted-foreground'
          }`}
        >
          <PlatformIcon platform={post.platform as SocialPlatform} className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            View on {post.platform === 'bluesky' ? 'Bluesky' : post.platform === 'mastodon' ? 'Mastodon' : 'source'}
          </span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      )}

      {/* Attached list card */}
      {post.attached_list && (() => {
        const list = post.attached_list as any;
        return (
          <div
            className="mb-3 rounded-xl border border-accent/25 bg-accent/5 p-3 cursor-pointer hover:bg-accent/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/list?type=${list.listType}&userId=${list.userId}`);
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1 shrink-0">
                {list.covers && list.covers.length > 0 ? (
                  list.covers.slice(0, 4).map((c: string, i: number) => (
                    <img key={i} src={c} alt="" className="w-10 h-14 object-cover rounded" />
                  ))
                ) : (
                  <div className="w-10 h-14 rounded bg-secondary flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-accent font-medium mb-0.5 uppercase tracking-wide">Game List</p>
                <p className="font-semibold text-sm">{list.title}</p>
                <p className="text-xs text-muted-foreground">{list.gameCount} games</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        );
      })()}

      {/* Quoted post embed */}
      {post.quotedPost && (() => {
        const qp = post.quotedPost;
        const qUser = getUserById?.(qp.user_id ?? qp.userId) ?? { handle: qp.user_id, display_name: qp.user_id } as any;
        return (
          <div
            className="mb-3 rounded-xl border border-border bg-secondary/30 p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${encodeURIComponent(qp.id)}`); }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold truncate">{qUser.display_name || qUser.handle}</span>
              <span className="text-xs text-muted-foreground shrink-0">@{(qUser.handle || '').replace(/^@/, '')}</span>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-wrap">{qp.content}</p>
            {qp.images && qp.images.length > 0 && (
              <img src={qp.images[0]} alt="" className="mt-2 w-full max-h-40 object-cover rounded-lg" />
            )}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex items-center gap-6 pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isExternalPost) requireAuth(() => onLike?.(post.id));
          }}
          disabled={isExternalPost}
          title={isExternalPost ? 'Engagement is read-only for imported posts' : undefined}
          className={`flex items-center gap-2 text-sm transition-colors ${
            isExternalPost ? 'opacity-40 cursor-not-allowed' :
            isLiked ? 'text-purple-400' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked && !isExternalPost ? 'fill-current' : ''}`} />
          <span>{formatNumber(post.like_count ?? post.likes ?? 0)}</span>
        </button>

        {onRepost && !post.reposts_disabled && (
          <button
            onClick={isExternalPost ? (e) => e.stopPropagation() : handleRepost}
            disabled={isExternalPost}
            title={isExternalPost ? 'Engagement is read-only for imported posts' : undefined}
            className={`flex items-center gap-2 text-sm transition-colors ${
              isExternalPost ? 'opacity-40 cursor-not-allowed' :
              isReposted ? 'text-accent' : 'text-muted-foreground hover:text-accent'
            }`}
          >
            <Repeat2 className="w-5 h-5" />
            <span>{formatNumber(post.repost_count ?? post.reposts ?? 0)}</span>
          </button>
        )}

        {!post.comments_disabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isExternalPost) requireAuth(() => {
                if (isDetailView) {
                  onComment?.(post.id);
                } else {
                  navigate(`/post/${encodeURIComponent(post.id)}#comments`);
                }
              });
            }}
            disabled={isExternalPost}
            title={isExternalPost ? 'Engagement is read-only for imported posts' : undefined}
            className={`flex items-center gap-2 text-sm transition-colors ${
              isExternalPost ? 'opacity-40 cursor-not-allowed text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{formatNumber(post.comment_count ?? post.comments ?? 0)}</span>
          </button>
        )}

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

      {/* Repost tray */}
      {showRepostTray && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={(e) => { e.stopPropagation(); setShowRepostTray(false); }}
        >
          <div
            className="w-full max-w-lg bg-card rounded-t-2xl p-4 pb-8 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <button
              onClick={() => {
                setShowRepostTray(false);
                if (!isReposted) onRepost?.(post.id);
              }}
              disabled={isReposted}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isReposted ? 'opacity-50 cursor-not-allowed bg-secondary/30' : 'hover:bg-secondary'
              }`}
            >
              <Repeat2 className="w-5 h-5 text-accent shrink-0" />
              <div className="text-left">
                <p className="font-medium">{isReposted ? 'Already reposted' : 'Repost'}</p>
                <p className="text-xs text-muted-foreground">Share to your followers instantly</p>
              </div>
            </button>
            <button
              onClick={() => {
                setShowRepostTray(false);
                navigate(`/new-post?quotePostId=${encodeURIComponent(post.id)}`);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-accent shrink-0" />
              <div className="text-left">
                <p className="font-medium">Quote Post</p>
                <p className="text-xs text-muted-foreground">Add your own commentary</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        post={post}
      />
    </div>
  );
}