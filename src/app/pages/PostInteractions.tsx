import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Repeat2, Quote } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { posts as postsAPI } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';
import { PostCard } from '../components/PostCard';

type Tab = 'likes' | 'reposts' | 'quotes';

export function PostInteractions() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'likes';

  const { currentUser, followingIds, likedPosts, repostedPosts, likePost, unlikePost, repostPost, unrepostPost, getUserById } = useAppData() as any;

  const [tab, setTab] = useState<Tab>(initialTab);
  const [likers, setLikers] = useState<any[]>([]);
  const [reposters, setReposters] = useState<any[]>([]);
  const [quotePosts, setQuotePosts] = useState<any[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingReposts, setLoadingReposts] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setLoadingLikes(true);
    postsAPI.getPostLikers(postId)
      .then(data => setLikers(data))
      .catch(() => setLikers([]))
      .finally(() => setLoadingLikes(false));
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    setLoadingReposts(true);
    postsAPI.getPostReposters(postId)
      .then(data => setReposters(data))
      .catch(() => setReposters([]))
      .finally(() => setLoadingReposts(false));
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    setLoadingQuotes(true);
    (postsAPI as any).getQuotePosts(postId)
      .then((data: any[]) => setQuotePosts(data))
      .catch(() => setQuotePosts([]))
      .finally(() => setLoadingQuotes(false));
  }, [postId]);

  const loading = tab === 'likes' ? loadingLikes : tab === 'reposts' ? loadingReposts : loadingQuotes;

  const UserList = ({ users }: { users: any[] }) => (
    <div className="space-y-2">
      {users.map((user: any) => (
        <div key={user.id} className="bg-card rounded-xl p-4 flex items-center gap-3">
          <div onClick={() => navigate(`/profile/${user.id}`)} className="cursor-pointer shrink-0">
            <ProfileAvatar
              username={user.display_name || user.handle || '?'}
              profilePicture={user.profile_picture}
              size="lg"
              userId={user.id}
            />
          </div>
          <div className="flex-1 min-w-0">
            <button onClick={() => navigate(`/profile/${user.id}`)} className="font-medium hover:underline block truncate text-left">
              {user.display_name || user.handle}
            </button>
            <button onClick={() => navigate(`/profile/${user.id}`)} className="text-sm text-muted-foreground hover:underline block truncate text-left">
              @{(user.handle || '').replace(/^@/, '')}
            </button>
            {user.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>}
          </div>
          {user.id !== currentUser?.id && (
            <FollowButton userId={user.id} initialFollowingState={followingIds?.has(user.id)} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">Post interactions</h1>
        </div>

        {/* Tabs */}
        <div className="w-full max-w-2xl mx-auto flex">
          <button
            onClick={() => setTab('likes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'likes' ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`w-4 h-4 ${tab === 'likes' ? 'text-purple-400' : ''}`} />
            <span>Likes</span>
            {likers.length > 0 && <span className="text-xs text-muted-foreground">{likers.length}</span>}
          </button>

          <button
            onClick={() => setTab('reposts')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'reposts' ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Repeat2 className={`w-4 h-4 ${tab === 'reposts' ? 'text-accent' : ''}`} />
            <span>Reposts</span>
            {reposters.length > 0 && <span className="text-xs text-muted-foreground">{reposters.length}</span>}
          </button>

          <button
            onClick={() => setTab('quotes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'quotes' ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Quote className={`w-4 h-4 ${tab === 'quotes' ? 'text-accent' : ''}`} />
            <span>Quotes</span>
            {quotePosts.length > 0 && <span className="text-xs text-muted-foreground">{quotePosts.length}</span>}
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-accent" />
          </div>
        ) : tab === 'likes' ? (
          likers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No likes yet</p></div>
          ) : (
            <UserList users={likers} />
          )
        ) : tab === 'reposts' ? (
          reposters.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No reposts yet</p></div>
          ) : (
            <UserList users={reposters} />
          )
        ) : (
          quotePosts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><p className="text-sm">No quote posts yet</p></div>
          ) : (
            <div>
              {quotePosts.map((qp: any) => {
                const qUser = qp.author ?? getUserById?.(qp.user_id) ?? { handle: qp.user_id, display_name: qp.user_id };
                return (
                  <PostCard
                    key={qp.id}
                    post={qp}
                    user={qUser}
                    onLike={(id) => likedPosts?.has(id) ? unlikePost(id) : likePost(id)}
                    onRepost={(id) => repostedPosts?.has(id) ? unrepostPost(id) : repostPost(id)}
                    onComment={() => navigate(`/post/${encodeURIComponent(qp.id)}#comments`)}
                    isLiked={likedPosts?.has(qp.id)}
                    isReposted={repostedPosts?.has(qp.id)}
                  />
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
