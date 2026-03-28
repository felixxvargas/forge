import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Repeat2 } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { posts as postsAPI } from '../utils/supabase';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';

type Tab = 'likes' | 'reposts';

export function PostInteractions() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'likes';

  const { currentUser, followingIds } = useAppData();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [likers, setLikers] = useState<any[]>([]);
  const [reposters, setReposters] = useState<any[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingReposts, setLoadingReposts] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [repostCount, setRepostCount] = useState<number | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoadingLikes(true);
    postsAPI.getPostLikers(postId)
      .then(data => { setLikers(data); setLikeCount(data.length); })
      .catch(() => setLikers([]))
      .finally(() => setLoadingLikes(false));
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    setLoadingReposts(true);
    postsAPI.getPostReposters(postId)
      .then(data => { setReposters(data); setRepostCount(data.length); })
      .catch(() => setReposters([]))
      .finally(() => setLoadingReposts(false));
  }, [postId]);

  const users = tab === 'likes' ? likers : reposters;
  const loading = tab === 'likes' ? loadingLikes : loadingReposts;

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
              tab === 'likes'
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`w-4 h-4 ${tab === 'likes' ? 'text-purple-400' : ''}`} />
            <span>Likes</span>
            {likeCount !== null && (
              <span className="text-xs text-muted-foreground">
                {likeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('reposts')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'reposts'
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Repeat2 className={`w-4 h-4 ${tab === 'reposts' ? 'text-accent' : ''}`} />
            <span>Reposts</span>
            {repostCount !== null && (
              <span className="text-xs text-muted-foreground">
                {repostCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-accent" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">
              {tab === 'likes' ? 'No likes yet' : 'No reposts yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user: any) => (
              <div key={user.id} className="bg-card rounded-xl p-4 flex items-center gap-3">
                <div
                  onClick={() => navigate(`/profile/${user.id}`)}
                  className="cursor-pointer shrink-0"
                >
                  <ProfileAvatar
                    username={user.display_name || user.handle || '?'}
                    profilePicture={user.profile_picture}
                    size="lg"
                    userId={user.id}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="font-medium hover:underline block truncate text-left"
                  >
                    {user.display_name || user.handle}
                  </button>
                  <button
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="text-sm text-muted-foreground hover:underline block truncate text-left"
                  >
                    @{(user.handle || '').replace(/^@/, '')}
                  </button>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>
                  )}
                </div>
                {user.id !== currentUser?.id && (
                  <FollowButton
                    userId={user.id}
                    initialFollowingState={followingIds.has(user.id)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
