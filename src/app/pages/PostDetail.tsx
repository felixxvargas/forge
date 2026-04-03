import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, AlertTriangle, Repeat2, Gamepad2, X as XIcon, Search } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useAppData } from '../context/AppDataContext';
import { posts as postsAPI } from '../utils/supabase';
import { gamesAPI } from '../utils/api';
import { gameSearchCache, gameCoverCache } from '../utils/mentionHighlight';

export function PostDetail() {
  const { postId } = useParams();
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
  const [newReply, setNewReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(true);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [standalonePost, setStandalonePost] = useState<any>(null);
  const mentionTriggerIndex = useRef<number>(-1);

  // Game tagging in reply
  const [replySelectedGames, setReplySelectedGames] = useState<{ id: string; title: string }[]>([]);
  const [showReplyGamePicker, setShowReplyGamePicker] = useState(false);
  const [replyGameQuery, setReplyGameQuery] = useState('');
  const [replyGameResults, setReplyGameResults] = useState<any[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const gameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bluesky fallback
  const [blueskyPost, setBlueskyPost] = useState<any>(null);
  const [loadingBluesky, setLoadingBluesky] = useState(false);

  const post = posts.find(p => p.id === postId && !p.repostedBy) ?? posts.find(p => p.id === postId);
  const postUser = post?.author ?? (post?.user_id ? getUserById(post.user_id) : null) ?? (post?.userId ? getUserById(post.userId) : null);

  useEffect(() => { window.scrollTo(0, 0); }, [postId]);

  // Fetch post by ID if not in context (e.g. navigating directly to a reply post)
  useEffect(() => {
    if (post || postId?.startsWith('at://') || !postId) return;
    postsAPI.getById(postId).then(p => setStandalonePost(p)).catch(() => {});
  }, [postId, post]);

  // Bluesky fallback
  useEffect(() => {
    if (!postId?.startsWith('at://') || post) return;
    setLoadingBluesky(true);
    fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(postId)}`)
      .then(r => r.json())
      .then(data => {
        const bp = data.posts?.[0];
        if (!bp) return;
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
      })
      .catch(() => {})
      .finally(() => setLoadingBluesky(false));
  }, [postId, post]);

  const activePost = post ?? standalonePost ?? blueskyPost;
  const activeUser = postUser ?? standalonePost?.author ?? blueskyPost?.author;

  // Load replies (posts with reply_to = postId)
  useEffect(() => {
    if (!postId || postId.startsWith('at://')) return;
    setIsLoadingReplies(true);
    postsAPI.getByReplyTo(postId)
      .then(data => {
        setReplies(data);
        if (data.length > 0) addPosts(data);
      })
      .catch(() => setReplies([]))
      .finally(() => setIsLoadingReplies(false));
  }, [postId]);

  // Load reposters
  useEffect(() => {
    if (!postId || postId.startsWith('at://')) return;
    postsAPI.getPostReposters(postId)
      .then(data => setReposters(data))
      .catch(() => {});
  }, [postId]);

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

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !session?.user || !postId) return;
    setIsSubmitting(true);
    try {
      const gameIds = replySelectedGames.map(g => g.id);
      const gameTitles = replySelectedGames.map(g => g.title);
      const replyId = await createPost(
        newReply.trim(),
        undefined, undefined, undefined, undefined,
        gameIds[0], gameTitles[0], gameIds, gameTitles, undefined,
        undefined, undefined,
        postId,
      );
      if (replyId) {
        try {
          const replyPost = await postsAPI.getById(replyId);
          setReplies(prev => [...prev, replyPost]);
          addPosts([replyPost]);
        } catch {}
      }
      setNewReply('');
      setReplySelectedGames([]);
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setIsSubmitting(false);
    }
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

  const detailPost = { ...activePost, repostedBy: undefined };

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
          <div className="px-4 pt-6 pb-2">
            <h2 className="text-lg font-semibold">Replies</h2>
          </div>

          {/* Reply Input */}
          {currentUser && !activePost.comments_disabled && (
            <form onSubmit={handleSubmitReply} className="px-4 pb-4 border-b border-border">
              <div className="flex gap-3 items-start">
                <ProfileAvatar
                  username={currentUser.display_name || currentUser.handle || '?'}
                  profilePicture={currentUser.profile_picture}
                  size="md"
                />
                <div className="flex-1 relative">
                  <textarea
                    value={newReply}
                    onChange={handleReplyChange}
                    placeholder="Post a reply… Use @ to mention"
                    rows={2}
                    style={{ fontSize: '16px' }}
                    className="w-full px-4 py-2 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
                  />
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

                  {/* Game picker panel */}
                  {showReplyGamePicker && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded-xl border border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          value={replyGameQuery}
                          onChange={(e) => handleReplyGameSearch(e.target.value)}
                          placeholder="Search for a game…"
                          className="w-full pl-8 pr-3 py-1.5 bg-background rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm"
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

                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowReplyGamePicker(v => !v)}
                      className={`p-1.5 rounded-lg transition-colors ${(showReplyGamePicker || replySelectedGames.length > 0) ? 'text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                      title="Tag a game"
                    >
                      <Gamepad2 className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={!newReply.trim() || isSubmitting}
                      className="px-4 py-1.5 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Posting…' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Replies List */}
          {isLoadingReplies ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No replies yet</p>
              {!activePost.comments_disabled && (
                <p className="text-sm text-muted-foreground mt-1">Be the first to reply!</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {replies.map((reply) => {
                const replyUser = reply.author ?? getUserById(reply.user_id);
                if (!replyUser) return null;
                return (
                  <PostCard
                    key={reply.id}
                    post={reply}
                    user={replyUser}
                    onLike={(id) => likedPosts.has(id) ? unlikePost(id) : likePost(id)}
                    onRepost={(id) => repostedPosts.has(id) ? unrepostPost(id) : repostPost(id)}
                    onComment={() => navigate(`/post/${reply.id}#comments`)}
                    onDelete={currentUser && reply.user_id === currentUser.id
                      ? async (id) => setDeleteConfirmId(id)
                      : undefined}
                    isLiked={likedPosts.has(reply.id)}
                    isReposted={repostedPosts.has(reply.id)}
                  />
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
