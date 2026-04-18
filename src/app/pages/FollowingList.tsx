import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';
import { useState, useEffect } from 'react';
import { profiles } from '../utils/supabase';

export function FollowingList() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { currentUser } = useAppData();
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetHandle, setTargetHandle] = useState('');

  const viewingUserId = userId || currentUser?.id || '';

  useEffect(() => {
    if (!viewingUserId) return;
    setLoading(true);
    setError(null);

    profiles.getById(viewingUserId)
      .then(u => setTargetHandle(u?.display_name || u?.handle || ''))
      .catch(() => {});

    profiles.getFollowing(viewingUserId)
      .then(setFollowing)
      .catch((err: any) => setError(err?.message || 'Failed to load following'))
      .finally(() => setLoading(false));
  }, [viewingUserId]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">Following</h1>
            {targetHandle && <p className="text-sm text-muted-foreground">{targetHandle}</p>}
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted/50 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted/50 rounded w-32" />
                  <div className="h-3 bg-muted/30 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm">
              Try Again
            </button>
          </div>
        ) : following.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Not following anyone yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map(user => (
              <div key={user.id} className="bg-card rounded-xl p-4 flex items-center gap-3">
                <div onClick={() => navigate(`/profile/${user.id}`)} className="cursor-pointer">
                  <ProfileAvatar
                    username={user.display_name || user.handle || '?'}
                    profilePicture={user.profile_picture}
                    size="lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <button onClick={() => navigate(`/profile/${user.id}`)} className="font-medium hover:underline block truncate">
                    {user.display_name || user.handle}
                  </button>
                  <button onClick={() => navigate(`/profile/${user.id}`)} className="text-sm text-muted-foreground hover:underline block truncate">
                    @{(user.handle || '').replace(/^@/, '')}
                  </button>
                  {user.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{user.bio}</p>}
                </div>
                {user.id !== currentUser?.id && <FollowButton userId={user.id} initialFollowingState={true} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
