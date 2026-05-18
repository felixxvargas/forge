'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { useNavigate } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';
import { PostCard } from '../components/PostCard';
import { savedPostsAPI } from '../utils/supabase';
import { posts as postsAPI } from '../utils/supabase';

export function SavedPosts() {
  const navigate = useNavigate();
  const { currentUser, likePost, unlikePost, likedPosts, repostPost, unrepostPost, repostedPosts, session, savedPostIds, unsavePost } = useAppData() as any;
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return; }
    (async () => {
      try {
        const postIds = await savedPostsAPI.getAll(session.user.id);
        if (postIds.length === 0) { setSavedPosts([]); setLoading(false); return; }
        const fetched = await Promise.allSettled(postIds.map((id: string) => postsAPI.getById(id)));
        const posts = fetched
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && !!r.value)
          .map(r => r.value);
        setSavedPosts(posts);
      } catch { setSavedPosts([]); }
      finally { setLoading(false); }
    })();
  }, [session?.user?.id]);

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Saved Posts</h1>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-3 py-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-muted/50 rounded w-32" />
                    <div className="h-3 bg-muted/30 rounded w-20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted/40 rounded w-full" />
                  <div className="h-3 bg-muted/40 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bookmark className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No saved posts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tap the bookmark icon on any post to save it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPosts.map(post => {
              const postUser = post.author ?? { id: post.user_id, handle: 'user', display_name: 'User' };
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  user={postUser}
                  onLike={(id) => likedPosts.has(id) ? unlikePost(id) : likePost(id)}
                  onRepost={(id) => repostedPosts.has(id) ? unrepostPost(id) : repostPost(id)}
                  onComment={() => navigate(`/post/${encodeURIComponent(post.id)}#comments`)}
                  isLiked={likedPosts.has(post.id)}
                  isReposted={repostedPosts.has(post.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
