import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Heart, Repeat2, Trash2, AlertTriangle } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useAppData } from '../context/AppDataContext';
import { commentsAPI } from '../utils/supabase';
import { formatTimeAgo } from '../utils/formatTimeAgo';

export function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, getUserById, users, currentUser, likePost, unlikePost, likedPosts, createPost, deletePost, session } = useAppData();
  const commentsRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [repostedComments, setRepostedComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const mentionTriggerIndex = useRef<number>(-1);

  // Bluesky fallback — used when the postId is an AT-URI and not in the Supabase feed
  const [blueskyPost, setBlueskyPost] = useState<any>(null);
  const [loadingBluesky, setLoadingBluesky] = useState(false);

  // Find original post (prefer one without repostedBy for detail view)
  const post = posts.find(p => p.id === postId && !p.repostedBy) ?? posts.find(p => p.id === postId);
  const postUser = post?.author ?? (post?.user_id ? getUserById(post.user_id) : null) ?? (post?.userId ? getUserById(post.userId) : null);

  // Always start at the top when entering a post detail view
  useEffect(() => { window.scrollTo(0, 0); }, [postId]);

  // If the postId looks like a Bluesky AT-URI and wasn't found in context, fetch it live
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

  const activePost = post ?? blueskyPost;
  const activeUser = postUser ?? blueskyPost?.author;

  // Load comments
  useEffect(() => {
    if (!postId) return;
    setIsLoadingComments(true);
    commentsAPI.getByPostId(postId)
      .then(data => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setIsLoadingComments(false));
  }, [postId]);

  // Load liked comment IDs
  useEffect(() => {
    if (!session?.user || !postId) return;
    commentsAPI.getLikedCommentIds(session.user.id, postId)
      .then(ids => setLikedComments(ids))
      .catch(() => {});
  }, [session?.user?.id, postId]);

  // Scroll to comments if navigated with #comments hash
  useEffect(() => {
    if (window.location.hash === '#comments' && commentsRef.current && !isLoadingComments) {
      setTimeout(() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isLoadingComments]);

  const handleLikeToggle = (id: string) => {
    if (likedPosts.has(id)) {
      unlikePost(id);
    } else {
      likePost(id);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewComment(val);
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
    const afterAt = newComment.slice(startIdx + 1);
    const wordEnd = afterAt.search(/[^\w]/);
    const tokenEnd = wordEnd === -1 ? newComment.length : startIdx + 1 + wordEnd;
    setNewComment(newComment.slice(0, startIdx) + handle + ' ' + newComment.slice(tokenEnd));
    mentionTriggerIndex.current = -1;
    setShowMentions(false);
    setMentionSuggestions([]);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user || !postId) return;
    setIsSubmitting(true);
    try {
      const comment = await commentsAPI.create(session.user.id, postId, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!session?.user) return;
    try {
      await commentsAPI.delete(session.user.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleRepostComment = async (comment: any) => {
    if (!session?.user) return;
    if (repostedComments.has(comment.id)) return; // already reposted
    const commentUser = comment.author ?? getUserById(comment.user_id);
    const handle = commentUser ? `@${(commentUser.handle || '').replace(/^@/, '')}` : '';
    const content = `${handle}: "${comment.content}"`;
    try {
      await createPost(content);
      setRepostedComments(prev => new Set([...prev, comment.id]));
    } catch (err) {
      console.error('Failed to repost comment:', err);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!session?.user) return;
    const isLiked = likedComments.has(commentId);
    setLikedComments(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    setComments(prev =>
      prev.map(c => c.id === commentId
        ? { ...c, like_count: Math.max(0, (c.like_count ?? 0) + (isLiked ? -1 : 1)) }
        : c
      )
    );
    try {
      if (isLiked) {
        await commentsAPI.unlike(session.user.id, commentId);
      } else {
        await commentsAPI.like(session.user.id, commentId);
      }
    } catch {
      // Revert
      setLikedComments(prev => {
        const next = new Set(prev);
        isLiked ? next.add(commentId) : next.delete(commentId);
        return next;
      });
      setComments(prev =>
        prev.map(c => c.id === commentId
          ? { ...c, like_count: Math.max(0, (c.like_count ?? 0) + (isLiked ? 1 : -1)) }
          : c
        )
      );
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

  // Strip repostedBy so the reposter header is hidden in detail view
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
        {/* Post */}
        <div className="bg-card px-4 pt-4 pb-4 border-b border-border">
          <PostCard
            post={detailPost}
            user={activeUser}
            onLike={handleLikeToggle}
            onComment={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            onDelete={currentUser && activePost.user_id === currentUser.id ? async (id) => { await deletePost(id); navigate(-1); } : undefined}
            isDetailView={true}
          />
        </div>

        {/* Comments Section */}
        <div className="px-4 py-6" ref={commentsRef} id="comments">
          <h2 className="text-lg font-semibold mb-4">Comments</h2>

          {/* Comment Input */}
          {currentUser && (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="flex gap-3 items-start">
                <ProfileAvatar
                  username={currentUser.display_name || currentUser.handle || '?'}
                  profilePicture={currentUser.profile_picture}
                  size="md"
                />
                <div className="flex-1 relative">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={newComment}
                    onChange={handleCommentChange}
                    placeholder="Write a comment… Use @ to mention"
                    style={{ fontSize: '16px' }}
                    className="w-full px-4 py-2 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  />
                  {/* Mention dropdown */}
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
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!newComment.trim() || isSubmitting}
                      className="px-4 py-1.5 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Comments List */}
          {isLoadingComments ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const commentUser = comment.author ?? getUserById(comment.user_id);
                if (!commentUser) return null;
                const isLiked = likedComments.has(comment.id);

                return (
                  <div key={comment.id} className="flex gap-3">
                    <div
                      className="cursor-pointer shrink-0"
                      onClick={() => navigate(`/profile/${commentUser.id}`)}
                    >
                      <ProfileAvatar
                        username={commentUser.display_name || commentUser.handle || '?'}
                        profilePicture={commentUser.profile_picture}
                        size="md"
                        userId={commentUser.id}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-secondary rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <button
                            onClick={() => navigate(`/profile/${commentUser.id}`)}
                            className="font-semibold text-sm hover:underline"
                          >
                            {commentUser.display_name || commentUser.handle}
                          </button>
                          <span className="text-xs text-muted-foreground">{commentUser.handle}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm break-words">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 px-2">
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${
                            isLiked ? 'text-pink-500' : 'text-muted-foreground hover:text-pink-500'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                          <span>{comment.like_count ?? 0}</span>
                        </button>
                        <button
                          onClick={() => handleRepostComment(comment)}
                          disabled={repostedComments.has(comment.id)}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${
                            repostedComments.has(comment.id) ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'
                          }`}
                          title={repostedComments.has(comment.id) ? 'Reposted' : 'Repost as post'}
                        >
                          <Repeat2 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser && comment.user_id === currentUser.id && (
                          <button
                            onClick={() => setDeleteConfirmId(comment.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Comment Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <h2 className="text-lg font-semibold">Delete comment?</h2>
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
                onClick={() => handleDeleteComment(deleteConfirmId)}
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
