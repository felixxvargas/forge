import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { useAppData } from '../context/AppDataContext';

interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  likes: number;
  replyTo?: string;
}

const mockComments: Comment[] = [
  {
    id: 'c1',
    userId: 'user-2',
    content: 'This is so relatable! I had the same experience!',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    likes: 12
  },
  {
    id: 'c2',
    userId: 'user-3',
    content: 'Have you tried the DLC yet? It makes it even better!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    likes: 5
  },
  {
    id: 'c3',
    userId: 'user-1',
    content: 'Not yet! Is it worth it?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    likes: 2,
    replyTo: 'c2'
  }
];

export function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, getUserById, currentUser, likePost, unlikePost, likedPosts } = useAppData();
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const post = posts.find(p => p.id === postId);
  const postUser = post ? getUserById(post.userId) : null;

  const handleLikeToggle = (id: string) => {
    if (likedPosts.has(id)) {
      unlikePost(id);
    } else {
      likePost(id);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `c${Date.now()}`,
      userId: currentUser.id,
      content: newComment,
      timestamp: new Date(),
      likes: 0,
      replyTo: replyingTo || undefined
    };

    setComments([...comments, comment]);
    setNewComment('');
    setReplyingTo(null);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
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
                  Replying to comment
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-sm text-accent hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <img
                src={currentUser.profilePicture}
                alt={currentUser.displayName}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2 bg-secondary rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => {
              const commentUser = getUserById(comment.userId);
              if (!commentUser) return null;

              return (
                <div
                  key={comment.id}
                  className={`flex gap-3 ${comment.replyTo ? 'ml-12' : ''}`}
                >
                  <img
                    src={commentUser.profilePicture}
                    alt={commentUser.displayName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="bg-card rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {commentUser.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {commentUser.handle}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 px-4">
                      <button className="text-xs text-muted-foreground hover:text-accent transition-colors">
                        Like · {comment.likes}
                      </button>
                      <button
                        onClick={() => setReplyingTo(comment.id)}
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

          {comments.length === 0 && (
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