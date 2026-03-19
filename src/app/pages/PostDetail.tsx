import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Heart, Trash2 } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useAppData } from '../context/AppDataContext';
import { commentAPI } from '../utils/api';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';

interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  timestamp: string;
  likes: number;
  replyTo: string | null;
}

export function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, getUserById, currentUser, likePost, unlikePost, likedPosts } = useAppData();
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; displayName: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const post = posts.find(p => p.id === postId);
  const postUser = post ? getUserById(post.userId) : null;

  const loadComments = useCallback(async () => {
    if (!postId) return;
    try {
      setIsLoading(true);
      const data = await commentAPI.getComments(postId);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Load user's liked comments
  useEffect(() => {
    if (!currentUser?.id) return;
    commentAPI.getUserCommentLikes(currentUser.id)
      .then((ids: string[]) => setLikedComments(new Set(ids)))
      .catch(() => {});
  }, [currentUser?.id]);

  const handleLikeToggle = (id: string) => {
    if (likedPosts.has(id)) {
      unlikePost(id);
    } else {
      likePost(id);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await commentAPI.createComment(
        postId!,
        newComment.trim(),
        replyingTo?.id
      );
      setComments(prev => [...prev, created]);
      setNewComment('');
      setReplyingTo(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentAPI.deleteComment(postId!, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete comment');
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    const isLiked = likedComments.has(comment.id);
    try {
      if (isLiked) {
        await commentAPI.unlikeComment(postId!, comment.id);
        setLikedComments(prev => { const n = new Set(prev); n.delete(comment.id); return n; });
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: Math.max(0, c.likes - 1) } : c));
      } else {
        await commentAPI.likeComment(postId!, comment.id);
        setLikedComments(prev => new Set([...prev, comment.id]));
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: c.likes + 1 } : c));
      }
    } catch {
      // Silently ignore like errors
    }
  };

  const formatTime = (ts: string) => {
    try {
      return formatDistanceToNowStrict(new Date(ts), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (!post || !postUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

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
        <div className="bg-card px-4 pt-4 pb-4">
          <PostCard
            post={post}
            user={postUser}
            onLike={handleLikeToggle}
            onComment={() => {}}
            isDetailView={true}
          />
        </div>

        {/* Comments Section */}
        <div className="px-4 py-6">
          <h2 className="text-lg font-semibold mb-4">
            Comments ({comments.length})
          </h2>

          {/* Comment Input */}
          <form onSubmit={handleSubmitComment} className="mb-6">
            {replyingTo && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Replying to <span className="text-accent">{replyingTo.displayName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <ProfileAvatar user={currentUser} size="sm" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  maxLength={500}
                  className="flex-1 px-4 py-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Comments List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-secondary flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded w-1/3" />
                    <div className="h-3 bg-secondary rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const commentUser = getUserById(comment.userId);
                const isOwn = comment.userId === currentUser.id;
                const isLiked = likedComments.has(comment.id);

                return (
                  <div
                    key={comment.id}
                    className={`flex gap-3 ${comment.replyTo ? 'ml-12' : ''}`}
                  >
                    <div
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => commentUser && navigate(`/profile/${comment.userId}`)}
                    >
                      <ProfileAvatar
                        user={commentUser || { profilePicture: undefined, displayName: 'User', handle: '@user' } as any}
                        size="sm"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-card rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="font-semibold text-sm truncate cursor-pointer hover:underline"
                              onClick={() => commentUser && navigate(`/profile/${comment.userId}`)}
                            >
                              {commentUser?.displayName || 'Unknown User'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {commentUser?.handle}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(comment.timestamp)}
                            </span>
                          </div>
                          {isOwn && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 px-4">
                        <button
                          onClick={() => handleLikeComment(comment)}
                          className={`flex items-center gap-1 text-xs transition-colors ${isLiked ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                          {comment.likes > 0 && <span>{comment.likes}</span>}
                        </button>
                        <button
                          onClick={() => setReplyingTo({ id: comment.id, displayName: commentUser?.displayName || 'User' })}
                          className="text-xs text-muted-foreground hover:text-accent transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && comments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to comment!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
