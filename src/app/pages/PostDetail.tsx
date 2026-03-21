import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Heart, Repeat2, Trash2 } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useAppData } from '../context/AppDataContext';
import { commentsAPI } from '../utils/supabase';
import { formatTimeAgo } from '../utils/formatTimeAgo';

export function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, getUserById, users, currentUser, likePost, unlikePost, likedPosts, createPost, session } = useAppData();
  const commentsRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [comments, setComments] = useState<any[]>([]);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const mentionTriggerIndex = useRef<number>(-1);

  // Find original post (prefer one without repostedBy for detail view)
  const post = posts.find(p => p.id === postId && !p.repostedBy) ?? posts.find(p => p.id === postId);
  const postUser = post?.author ?? (post?.user_id ? getUserById(post.user_id) : null) ?? (post?.userId ? getUserById(post.userId) : null);

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
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleRepostComment = async (comment: any) => {
    if (!session?.user) return;
    const commentUser = comment.author ?? getUserById(comment.user_id);
    const handle = commentUser ? `@${(commentUser.handle || '').replace(/^@/, '')}` : '';
    const content = `${handle}: "${comment.content}"`;
    try {
      await createPost(content);
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

  if (!post || !postUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

  // Strip repostedBy so the reposter header is hidden in detail view
  const detailPost = { ...post, repostedBy: undefined };

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
            user={postUser}
            onLike={handleLikeToggle}
            onComment={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            isDetailView={true}
          />
          {/* Repost count */}
          {((post.repost_count ?? post.reposts ?? 0) > 0) && (
            <div className="mt-2 pt-3 border-t border-border text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {post.repost_count ?? post.reposts}
              </span>{' '}
              Reposts
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="px-4 py-6" ref={commentsRef} id="comments">
          <h2 className="text-lg font-semibold mb-4">
            Comments ({isLoadingComments ? '…' : comments.length})
          </h2>

          {/* Comment Input */}
          {currentUser && (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="flex gap-3 items-center">
                <ProfileAvatar
                  username={currentUser.display_name || currentUser.handle || '?'}
                  profilePicture={currentUser.profile_picture}
                  size="md"
                />
                <div className="flex-1 flex gap-2 relative">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={newComment}
                    onChange={handleCommentChange}
                    placeholder="Write a comment… Use @ to mention"
                    className="flex-1 px-4 py-2 bg-secondary rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="p-2 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  {/* Mention dropdown */}
                  {showMentions && mentionSuggestions.length > 0 && (
                    <div className="absolute bottom-full mb-2 left-0 right-10 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
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
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-green-500 transition-colors"
                          title="Repost as post"
                        >
                          <Repeat2 className="w-3.5 h-3.5" />
                        </button>
                        {currentUser && comment.user_id === currentUser.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
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
    </div>
  );
}
