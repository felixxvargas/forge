import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, AlertTriangle, Repeat2, Gamepad2, X as XIcon, Search, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useAppData } from '../context/AppDataContext';
import { posts as postsAPI } from '../utils/supabase';
import { gamesAPI } from '../utils/api';
import { gameSearchCache, gameCoverCache } from '../utils/mentionHighlight';
import { ImageUpload } from '../components/ImageUpload';

export function PostDetail() {
  const { postId: rawPostId } = useParams();
  // Decode URL-encoded external post IDs (at:// URIs encoded as %3A%2F%2F etc.)
  const postId = rawPostId ? decodeURIComponent(rawPostId) : undefined;
  const navigate = useNavigate();
  const {
    posts, getUserById, users, currentUser,
    likePost, unlikePost, likedPosts,
    repostPost, unrepostPost, repostedPosts,
    createPost, deletePost, addPosts, session,
  } = useAppData();

  const repliesRef = useRef<HTMLDivElement>(null);

  const [replies, setReplies] = useState<any[]>([]);
  const [reposters, setReposters] = useState<any[]>([]);
  const [forgeReplies, setForgeReplies] = useState<any[]>([]); // Forge comments on external posts
  const [newReply, setNewReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isLoadingReplies, setIsLoadingReplies] = useState(true);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [standalonePost, setStandalonePost] = useState<any>(null);
  const [showReplyTray, setShowReplyTray] = useState(false);
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [replyLinkUrl, setReplyLinkUrl] = useState('');
  const [showReplyImageUpload, setShowReplyImageUpload] = useState(false);
  const [showReplyLinkInput, setShowReplyLinkInput] = useState(false);
  const mentionTriggerIndex = useRef<number>(-1);

  // Parent post (when the viewed post is itself a reply)
  const [parentPost, setParentPost] = useState<any>(null);
  const [showParentContext, setShowParentContext] = useState(false);

  // Game tagging in reply
  const [replySelectedGames, setReplySelectedGames] = useState<{ id: string; title: string }[]>([]);
  const [showReplyGamePicker, setShowReplyGamePicker] = useState(false);
  const [replyGameQuery, setReplyGameQuery] = useState('');
  const [replyGameResults, setReplyGameResults] = useState<any[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const gameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sub-replies for each top-level reply (replyId → sub-reply posts)
  const [subRepliesMap, setSubRepliesMap] = useState<Record<string, any[]>>({});

  // External post fallback (Bluesky / Mastodon)
  const [blueskyPost, setBlueskyPost] = useState<any>(null);
  const [loadingBluesky, setLoadingBluesky] = useState(false);
  // Native Bluesky thread replies
  const [blueskyReplies, setBlueskyReplies] = useState<any[]>([]);

  const isExternalPost = postId?.startsWith('at://') || postId?.startsWith('mastodon-');

  const post = posts.find(p => p.id === postId && !p.repostedBy) ?? posts.find(p => p.id === postId);
  const postUser = post?.author ?? (post?.user_id ? getUserById(post.user_id) : null) ?? (post?.userId ? getUserById(post.userId) : null);

  useEffect(() => { window.scrollTo(0, 0); setShowParentContext(false); }, [postId]);

  // Fetch post by ID if not in context (e.g. navigating directly to a reply post)
  useEffect(() => {
    if (post || isExternalPost || !postId) return;
    postsAPI.getById(postId).then(p => setStandalonePost(p)).catch(() => {});
  }, [postId, post, isExternalPost]);

  // Bluesky fallback: load post data + native thread replies
  useEffect(() => {
    if (!postId?.startsWith('at://') || post) return;
    setLoadingBluesky(true);
    // Use getPostThread to get post + replies in one call
    fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postId)}&depth=3`)
      .then(r => r.json())
      .then(data => {
        const thread = data.thread;
        if (!thread?.post) return;
        const bp = thread.post;
        const handle = bp.author?.handle ?? '';
        const rkey = bp.uri?.split('/').pop() ?? '';
        setBlueskyPost({
          id: bp.uri,
          content: bp.record?.text ?? '',
          created_at: bp.record?.createdAt ?? bp.indexedAt,
          like_count: bp.likeCount ?? 0,
          repost_count: bp.repostCount ?? 0,
          comment_count: bp.replyCount ?? 0,
          platform: 'bluesky',
          external_url: `https://bsky.app/profile/${handle}/post/${rkey}`,
          images: bp.embed?.images?.map((img: any) => img.fullsize ?? img.thumb) ?? undefined,
          author: {
            id: bp.author?.did ?? handle,
            handle,
            display_name: bp.author?.displayName ?? handle,
            profile_picture: bp.author?.avatar ?? '',
          },
        });
        // Extract native Bluesky replies from thread
        const nativeReplies = (thread.replies ?? []).map((r: any) => {
          if (!r?.post) return null;
          const rp = r.post;
          const rpHandle = rp.author?.handle ?? '';
          const rpRkey = rp.uri?.split('/').pop() ?? '';
          return {
            id: rp.uri,
            content: rp.record?.text ?? '',
            created_at: rp.record?.createdAt ?? rp.indexedAt,
            like_count: rp.likeCount ?? 0,
            repost_count: rp.repostCount ?? 0,
            comment_count: rp.replyCount ?? 0,
            platform: 'bluesky',
            external_url: `https://bsky.app/profile/${rpHandle}/post/${rpRkey}`,
            images: rp.embed?.images?.map((img: any) => img.fullsize ?? img.thumb) ?? undefined,
            author: {
              id: rp.author?.did ?? rpHandle,
              handle: rpHandle,
              display_name: rp.author?.displayName ?? rpHandle,
              profile_picture: rp.author?.avatar ?? '',
            },
          };
        }).filter(Boolean);
        setBlueskyReplies(nativeReplies);
      })
      .catch(() => {})
      .finally(() => setLoadingBluesky(false));
  }, [postId, post]);

  // Mastodon fallback
  useEffect(() => {
    if (!postId?.startsWith('mastodon-') || post) return;
    const mastodonId = postId.replace('mastodon-', '');
    setLoadingBluesky(true);
    fetch(`https://mastodon.social/api/v1/statuses/${mastodonId}`)
      .then(r => r.json())
      .then(data => {
        if (!data?.id) return;
        const text = (data.content || '')
          .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
          .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        setBlueskyPost({
          id: postId,
          content: text,
          created_at: data.created_at,
          like_count: data.favourites_count ?? 0,
          repost_count: data.reblogs_count ?? 0,
          comment_count: data.replies_count ?? 0,
          platform: 'mastodon',
          external_url: data.url,
          images: data.media_attachments?.filter((m: any) => m.type === 'image').map((m: any) => m.url),
          author: {
            id: `mastodon-${data.account?.id}`,
            handle: data.account?.acct ?? '',
            display_name: data.account?.display_name || data.account?.acct,
            profile_picture: data.account?.avatar ?? '',
          },
        });
      })
      .catch(() => {})
      .finally(() => setLoadingBluesky(false));
  }, [postId, post]);

  const activePost = post ?? standalonePost ?? blueskyPost;
  const activeUser = postUser ?? standalonePost?.author ?? blueskyPost?.author;

  // Load parent post when the active post is a reply
  useEffect(() => {
    const replyToId = activePost?.reply_to;
    if (!replyToId || replyToId.startsWith('at://')) { setParentPost(null); return; }
    // Check context first
    const fromContext = posts.find(p => p.id === replyToId && !p.repostedBy);
    if (fromContext) { setParentPost(fromContext); return; }
    postsAPI.getById(replyToId).then(p => setParentPost(p)).catch(() => setParentPost(null));
  }, [activePost?.reply_to]);

  // Load replies for normal Forge posts, then load their sub-replies
  useEffect(() => {
    if (!postId || isExternalPost) { setIsLoadingReplies(false); return; }
    setIsLoadingReplies(true);
    setSubRepliesMap({});
    postsAPI.getByReplyTo(postId)
      .then(async data => {
        setReplies(data);
        if (data.length > 0) {
          addPosts(data);
          // Load sub-replies for each reply in parallel (limit to avoid spam)
          const withReplies = data.filter((r: any) => (r.comment_count ?? 0) > 0);
          if (withReplies.length > 0) {
            const results = await Promise.allSettled(
              withReplies.slice(0, 10).map((r: any) => postsAPI.getByReplyTo(r.id))
            );
            const map: Record<string, any[]> = {};
            results.forEach((res, i) => {
              if (res.status === 'fulfilled' && res.value.length > 0) {
                map[withReplies[i].id] = res.value;
              }
            });
            if (Object.keys(map).length > 0) setSubRepliesMap(map);
          }
        }
      })
      .catch(() => setReplies([]))
      .finally(() => setIsLoadingReplies(false));
  }, [postId, isExternalPost]);

  // Load Forge comments on external posts (stored with url = 'forge-comment:{externalId}')
  useEffect(() => {
    if (!postId || !isExternalPost) return;
    postsAPI.getExternalComments(postId)
      .then(data => {
        setForgeReplies(data);
        if (data.length > 0) addPosts(data);
      })
      .catch(() => setForgeReplies([]));
  }, [postId, isExternalPost]);

  // Load reposters (Forge posts only)
  useEffect(() => {
    if (!postId || isExternalPost) return;
    postsAPI.getPostReposters(postId)
      .then(data => setReposters(data))
      .catch(() => {});
  }, [postId, isExternalPost]);

  // Scroll to replies if navigated with #comments hash
  useEffect(() => {
    if (window.location.hash === '#comments' && repliesRef.current && !isLoadingReplies) {
      setTimeout(() => repliesRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isLoadingReplies]);

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewReply(val);
    const cursorPos = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursorPos);
    const mentionMatch = before.match(/@(\w*)$/);
    if (mentionMatch) {
      mentionTriggerIndex.current = before.lastIndexOf('@');
      const query = mentionMatch[1].toLowerCase();
      const filtered = users
        .filter(u =>
          (u.handle || '').toLowerCase().replace(/^@/, '').includes(query) ||
          (u.display_name || '').toLowerCase().includes(query)
        )
        .slice(0, 5);
      setMentionSuggestions(filtered);
      setShowMentions(filtered.length > 0);
    } else {
      setShowMentions(false);
      setMentionSuggestions([]);
    }
  };

  const handleMentionSelect = (user: any) => {
    const startIdx = mentionTriggerIndex.current;
    if (startIdx < 0) { setShowMentions(false); return; }
    const handle = (user.handle || '').startsWith('@') ? user.handle : `@${user.handle}`;
    const afterAt = newReply.slice(startIdx + 1);
    const wordEnd = afterAt.search(/[^\w]/);
    const tokenEnd = wordEnd === -1 ? newReply.length : startIdx + 1 + wordEnd;
    setNewReply(newReply.slice(0, startIdx) + handle + ' ' + newReply.slice(tokenEnd));
    mentionTriggerIndex.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
  };

  const handleReplyGameSearch = (q: string) => {
    setReplyGameQuery(q);
    if (gameSearchTimer.current) clearTimeout(gameSearchTimer.current);
    if (!q.trim()) { setReplyGameResults([]); return; }
    gameSearchTimer.current = setTimeout(async () => {
      setIsSearchingGames(true);
      try {
        const results = await gamesAPI.searchGames(q, 8);
        setReplyGameResults(Array.isArray(results) ? results : (results as any)?.games ?? []);
      } catch {
        setReplyGameResults([]);
      } finally {
        setIsSearchingGames(false);
      }
    }, 400);
  };

  const handleSelectReplyGame = (game: any) => {
    const gameId = String(game.id ?? game.game_id ?? '');
    setReplySelectedGames(prev => prev.some(g => g.id === gameId) ? prev : [...prev, { id: gameId, title: game.title }]);
    const cover = game.cover ?? game.artwork?.find((a: any) => a.artwork_type === 'cover')?.url ?? game.artwork?.[0]?.url ?? null;
    if (!gameCoverCache.has(gameId)) gameCoverCache.set(gameId, cover);
    setShowReplyGamePicker(false);
    setReplyGameQuery('');
    setReplyGameResults([]);
  };

  const performReplySubmit = async () => {
    if (!newReply.trim() || !session?.user || !postId) return;
    setIsSubmitting(true);
    setReplyError(null);
    try {
      const gameIds = replySelectedGames.map(g => g.id);
      const gameTitles = replySelectedGames.map(g => g.title);
      const urlToStore = isExternalPost
        ? `forge-comment:${postId}`
        : (replyLinkUrl || undefined);
      const imagesToStore = replyImageUrl ? [replyImageUrl] : undefined;
      const replyId = await createPost(
        newReply.trim(),
        imagesToStore,
        urlToStore,
        undefined, undefined,
        gameIds[0], gameTitles[0], gameIds, gameTitles, undefined,
        undefined, undefined,
        isExternalPost ? undefined : postId,
      );
      if (replyId) {
        try {
          const replyPost = await postsAPI.getById(replyId);
          if (isExternalPost) {
            setForgeReplies(prev => [...prev, replyPost]);
          } else {
            setReplies(prev => [...prev, replyPost]);
          }
          addPosts([replyPost]);
        } catch {}
      }
      setNewReply('');
      setReplySelectedGames([]);
      setReplyImageUrl('');
      setReplyLinkUrl('');
      setShowReplyTray(false);
      setShowReplyImageUpload(false);
      setShowReplyLinkInput(false);
    } catch (err) {
      console.error('Failed to post reply:', err);
      setReplyError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    await performReplySubmit();
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      await deletePost(replyId);
      setReplies(prev => prev.filter(r => r.id !== replyId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete reply:', err);
    }
  };

  if (loadingBluesky) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!activePost || !activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

  // Use live reposter count from reposts table — more reliable than posts.repost_count
  // which can lag if the SECURITY DEFINER sync function hasn't been applied yet
  const liveRepostCount = reposters.length > 0 ? reposters.length : (activePost.repost_count ?? 0);

  // Use actual loaded reply count once available (overrides potentially stale DB value)
  const actualCommentCount = isLoadingReplies ? activePost.comment_count : Math.max(activePost.comment_count ?? 0, replies.length);
  const detailPost = { ...activePost, repostedBy: undefined, comment_count: actualCommentCount, repost_count: liveRepostCount };

  const parentUser = parentPost ? (parentPost.author ?? getUserById(parentPost.user_id)) : null;

  const handleReplyToClick = () => {
    setShowParentContext(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="w-full max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Post</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto">
        {/* Parent post context — revealed with animation when "Replying to" is tapped */}
        <AnimatePresence>
          {showParentContext && parentPost && parentUser && (
            <motion.div
              key="parent-context"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="bg-card border-b border-border">
                <div className="px-4 pt-4 pb-4">
                  <PostCard
                    post={parentPost}
                    user={parentUser}
                    onLike={(id) => likedPosts.has(id) ? unlikePost(id) : likePost(id)}
                    onRepost={(id) => repostedPosts.has(id) ? unrepostPost(id) : repostPost(id)}
                    onComment={() => navigate(`/post/${encodeURIComponent(parentPost.id)}#comments`)}
                    isLiked={likedPosts.has(parentPost.id)}
                    isReposted={repostedPosts.has(parentPost.id)}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post + Reposters share the same card background */}
        <div className="bg-card border-b border-border">
          <div className="px-4 pt-4 pb-4">
            <PostCard
              post={detailPost}
              user={activeUser}
              onLike={(id) => likedPosts.has(id) ? unlikePost(id) : likePost(id)}
              onComment={() => repliesRef.current?.scrollIntoView({ behavior: 'smooth' })}
              onDelete={currentUser && activePost.user_id === currentUser.id
                ? async (id) => { await deletePost(id); navigate(-1); }
                : undefined}
              isDetailView={true}
              replyToHandle={
                parentPost
                  ? ((parentPost.author?.handle ?? getUserById(parentPost.user_id)?.handle ?? '').replace(/^@/, '') || undefined)
                  : undefined
              }
              onReplyToClick={parentPost ? handleReplyToClick : undefined}
            />
          </div>

          {/* Reposters */}
          {reposters.length > 0 && (
            <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
              <Repeat2 className="w-4 h-4 text-green-500 shrink-0" />
              <div className="flex -space-x-1">
                {reposters.slice(0, 6).map(u => (
                  <button
                    key={u.id}
                    onClick={() => navigate(`/${(u.handle || '').replace(/^@/, '')}`)}
                    title={u.display_name || u.handle}
                    className="ring-2 ring-card rounded-full"
                  >
                    <ProfileAvatar
                      username={u.display_name || u.handle || '?'}
                      profilePicture={u.profile_picture}
                      userId={u.id}
                      size="sm"
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {reposters.length === 1 ? (
                  <>
                    <button
                      onClick={() => navigate(`/${(reposters[0].handle || '').replace(/^@/, '')}`)}
                      className="font-medium text-foreground hover:underline"
                    >
                      {reposters[0].display_name || reposters[0].handle}
                    </button>{' '}reposted
                  </>
                ) : (
                  <>{reposters.length} reposts</>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Replies Section */}
        <div ref={repliesRef} id="comments">
          {/* Compact reply trigger */}
          {currentUser && (isExternalPost || !activePost.comments_disabled) && (
            <div className="px-4 py-4 border-b border-border">
              <div className="flex gap-3 items-center">
                <ProfileAvatar
                  username={currentUser.display_name || currentUser.handle || '?'}
                  profilePicture={currentUser.profile_picture}
                  size="sm"
                />
                <button
                  onClick={() => setShowReplyTray(true)}
                  className="flex-1 px-4 py-2.5 bg-secondary rounded-xl border border-border text-sm text-muted-foreground text-left cursor-text hover:bg-secondary/80 transition-colors"
                >
                  {isExternalPost ? 'Post a comment…' : 'Post a reply…'}
                </button>
              </div>
            </div>
          )}

          {/* Reply Tray — fullscreen on mobile, centered dialog on desktop */}
          {showReplyTray && (
            <div className="fixed inset-0 z-50 flex flex-col sm:items-end sm:justify-end md:items-center md:justify-center sm:bg-black/60">
              <div className="w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-t-2xl md:rounded-2xl bg-background flex flex-col overflow-hidden shadow-2xl">
                {/* Tray header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => { setShowReplyTray(false); setShowReplyImageUpload(false); setShowReplyLinkInput(false); setShowReplyGamePicker(false); }}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    <XIcon className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={performReplySubmit}
                    disabled={!newReply.trim() || isSubmitting}
                    className="px-5 py-1.5 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Posting…' : isExternalPost ? 'Comment' : 'Reply'}
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex gap-3 px-4 pt-4 pb-2 flex-1 overflow-y-auto min-h-0">
                  <ProfileAvatar
                    username={currentUser.display_name || currentUser.handle || '?'}
                    profilePicture={currentUser.profile_picture}
                    size="md"
                  />
                  <div className="flex-1 min-w-0 relative">
                    {/* Mention suggestions */}
                    {showMentions && mentionSuggestions.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-0 right-0 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                        {mentionSuggestions.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(u); }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary transition-colors text-left"
                          >
                            <ProfileAvatar
                              username={u.display_name || u.handle || '?'}
                              profilePicture={u.profile_picture}
                              userId={u.id}
                              size="sm"
                            />
                            <div>
                              <p className="text-sm font-medium">{u.display_name || u.handle}</p>
                              <p className="text-xs text-muted-foreground">@{(u.handle || '').replace(/^@/, '')}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea
                      autoFocus
                      value={newReply}
                      onChange={handleReplyChange}
                      placeholder={isExternalPost ? 'Post a comment… Use @ to mention' : 'Post a reply… Use @ to mention'}
                      style={{ fontSize: '16px' }}
                      className="w-full bg-transparent outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[120px]"
                      rows={5}
                    />

                    {/* Image preview */}
                    {replyImageUrl && (
                      <div className="relative mt-2 inline-block">
                        <img src={replyImageUrl} alt="" className="max-h-40 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => setReplyImageUrl('')}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Link preview */}
                    {replyLinkUrl && !isExternalPost && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm">
                        <span className="flex-1 truncate text-muted-foreground">{replyLinkUrl}</span>
                        <button type="button" onClick={() => setReplyLinkUrl('')} className="text-muted-foreground hover:text-foreground shrink-0">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Selected game tags */}
                    {replySelectedGames.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {replySelectedGames.map(g => {
                          const cover = gameCoverCache.get(g.id) ?? null;
                          return (
                            <div key={g.id} className="flex items-center gap-1.5">
                              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/60">
                                {cover ? (
                                  <img src={cover} alt={g.title} className="w-6 h-8 rounded object-cover shrink-0" />
                                ) : (
                                  <Gamepad2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <p className="text-xs font-medium truncate max-w-[120px]">{g.title}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setReplySelectedGames(prev => prev.filter(x => x.id !== g.id))}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Image upload panel */}
                {showReplyImageUpload && (
                  <div className="px-4 pb-3 border-t border-border pt-3">
                    <ImageUpload
                      onUpload={(url) => { setReplyImageUrl(url); setShowReplyImageUpload(false); }}
                      onRemove={() => setReplyImageUrl('')}
                      existingUrl={replyImageUrl}
                      accept="image/*,video/*"
                      maxSizeMB={50}
                      bucketType="post"
                    />
                  </div>
                )}

                {/* Link input panel */}
                {showReplyLinkInput && !isExternalPost && (
                  <div className="px-4 pb-3 border-t border-border pt-3">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={replyLinkUrl}
                        onChange={(e) => setReplyLinkUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setShowReplyLinkInput(false); }}
                        placeholder="https://example.com"
                        className="flex-1 bg-secondary px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowReplyLinkInput(false)}
                        className="px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Game picker panel */}
                {showReplyGamePicker && (
                  <div className="px-4 pb-3 border-t border-border pt-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={replyGameQuery}
                        onChange={(e) => handleReplyGameSearch(e.target.value)}
                        placeholder="Search for a game…"
                        className="w-full pl-8 pr-3 py-1.5 bg-secondary rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm"
                        autoFocus
                      />
                    </div>
                    {isSearchingGames && <p className="text-xs text-muted-foreground mt-1.5">Searching…</p>}
                    {replyGameResults.length > 0 && (
                      <div className="mt-1.5 space-y-0.5 max-h-40 overflow-y-auto">
                        {replyGameResults.map((game: any, i) => (
                          <button
                            key={game.id ?? i}
                            type="button"
                            onClick={() => handleSelectReplyGame(game)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-secondary transition-colors text-sm flex items-center gap-2"
                          >
                            <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{game.title}</span>
                            {game.year && <span className="text-muted-foreground text-xs ml-auto shrink-0">{game.year}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center gap-1 px-4 py-3 border-t border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => { setShowReplyImageUpload(v => !v); setShowReplyLinkInput(false); setShowReplyGamePicker(false); }}
                    className={`p-2 rounded-lg transition-colors ${(showReplyImageUpload || replyImageUrl) ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    title="Add image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  {!isExternalPost && (
                    <button
                      type="button"
                      onClick={() => { setShowReplyLinkInput(v => !v); setShowReplyImageUpload(false); setShowReplyGamePicker(false); }}
                      className={`p-2 rounded-lg transition-colors ${(showReplyLinkInput || replyLinkUrl) ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      title="Add link"
                    >
                      <LinkIcon className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowReplyGamePicker(v => !v); setShowReplyImageUpload(false); setShowReplyLinkInput(false); }}
                    className={`p-2 rounded-lg transition-colors ${(showReplyGamePicker || replySelectedGames.length > 0) ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    title="Tag a game"
                  >
                    <Gamepad2 className="w-5 h-5" />
                  </button>
                  {replyError && <p className="ml-2 text-xs text-destructive flex-1">{replyError}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Replies List */}
          {isLoadingReplies ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
          ) : isExternalPost ? (
            // External post: show Forge comments + native platform replies
            <div>
              {/* Forge comments on external post */}
              {forgeReplies.length > 0 && (
                <div>
                  <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground uppercase tracking-wide font-medium">Forge Comments</p>
                  <div className="divide-y divide-border">
                    {forgeReplies.map((reply) => {
                      const replyUser = reply.author ?? getUserById(reply.user_id);
                      if (!replyUser) return null;
                      return (
                        <PostCard
                          key={reply.id}
                          post={reply}
                          user={replyUser}
                          onLike={(id) => likedPosts.has(id) ? unlikePost(id) : likePost(id)}
                          onRepost={(id) => repostedPosts.has(id) ? unrepostPost(id) : repostPost(id)}
                          onComment={() => navigate(`/post/${encodeURIComponent(reply.id)}#comments`)}
                          onDelete={currentUser && reply.user_id === currentUser.id
                            ? async (id) => setDeleteConfirmId(id)
                            : undefined}
                          isLiked={likedPosts.has(reply.id)}
                          isReposted={repostedPosts.has(reply.id)}
                          noBacker={true}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Native Bluesky replies */}
              {blueskyReplies.length > 0 && (
                <div>
                  <p className="px-4 pt-4 pb-1 text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {activePost?.platform === 'bluesky' ? 'Bluesky Replies' : 'Platform Replies'}
                  </p>
                  <div className="divide-y divide-border">
                    {blueskyReplies.map((reply) => (
                      <PostCard
                        key={reply.id}
                        post={reply}
                        user={reply.author}
                        isDetailView={false}
                        noBacker={true}
                      />
                    ))}
                  </div>
                </div>
              )}
              {forgeReplies.length === 0 && blueskyReplies.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No comments yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Be the first to comment from Forge!</p>
                </div>
              )}
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No replies yet</p>
              {!activePost.comments_disabled && (
                <p className="text-sm text-muted-foreground mt-1">Be the first to reply!</p>
              )}
            </div>
          ) : (
            <div>
              {replies.map((reply, index) => {
                const replyUser = reply.author ?? getUserById(reply.user_id);
                if (!replyUser) return null;
                const subReplies = subRepliesMap[reply.id] ?? [];
                return (
                  <div key={reply.id}>
                    {/* Horizontal divider between replies — but NOT between post and first reply */}
                    {index > 0 && <div className="border-t border-border" />}

                    {/* Top-level reply */}
                    <PostCard
                      post={reply}
                      user={replyUser}
                      onLike={(id) => likedPosts.has(id) ? unlikePost(id) : likePost(id)}
                      onRepost={(id) => repostedPosts.has(id) ? unrepostPost(id) : repostPost(id)}
                      onComment={() => navigate(`/post/${encodeURIComponent(reply.id)}#comments`)}
                      onDelete={currentUser && reply.user_id === currentUser.id
                        ? async (id) => setDeleteConfirmId(id)
                        : undefined}
                      isLiked={likedPosts.has(reply.id)}
                      isReposted={repostedPosts.has(reply.id)}
                      noBacker={true}
                    />

                    {/* Sub-replies — connected with a vertical thread line */}
                    {subReplies.length > 0 && (
                      <div className="border-l-2 border-border/60 ml-5">
                        {subReplies.map((sub) => {
                          const subUser = sub.author ?? getUserById(sub.user_id);
                          if (!subUser) return null;
                          return (
                            <div key={sub.id} className="border-t border-border cursor-pointer" onClick={() => navigate(`/post/${encodeURIComponent(sub.id)}`)}>
                              <PostCard
                                post={sub}
                                user={subUser}
                                onLike={(id) => likedPosts.has(id) ? unlikePost(id) : likePost(id)}
                                onRepost={(id) => repostedPosts.has(id) ? unrepostPost(id) : repostPost(id)}
                                onComment={() => navigate(`/post/${encodeURIComponent(sub.id)}#comments`)}
                                isLiked={likedPosts.has(sub.id)}
                                isReposted={repostedPosts.has(sub.id)}
                                noBacker={true}
                              />
                            </div>
                          );
                        })}
                        {/* "More replies" link if there are additional sub-replies beyond what's shown */}
                        {(reply.comment_count ?? 0) > subReplies.length && (
                          <button
                            onClick={() => navigate(`/post/${encodeURIComponent(reply.id)}`)}
                            className="w-full text-left px-4 py-3 text-xs text-accent hover:underline border-t border-border"
                          >
                            View {(reply.comment_count ?? 0) - subReplies.length} more {(reply.comment_count ?? 0) - subReplies.length === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <h2 className="text-lg font-semibold">Delete reply?</h2>
            </div>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReply(deleteConfirmId)}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
