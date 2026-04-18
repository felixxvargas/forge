import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';
import { useState, useEffect, useMemo } from 'react';
import { profiles } from '../utils/supabase';

export function FollowersList() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightFollowing = searchParams.get('highlight') === 'following';

  const { currentUser, followingIds } = useAppData();
  const [followers, setFollowers] = useState<any[]>([]);
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

    profiles.getFollowers(viewingUserId)
      .then(setFollowers)
      .catch((err: any) => setError(err?.message || 'Failed to load followers'))
      .finally(() => setLoading(false));
  }, [viewingUserId]);

  // Sort: when coming from social-proof link, put people currentUser follows at the top
  const sortedFollowers = useMemo(() => {
    if (!highlightFollowing || !followingIds.size) return followers;
    return [
      ...followers.filter(u => followingIds.has(u.id)),
      ...followers.filter(u => !followingIds.has(u.id)),
    ];
  }, [followers, highlightFollowing, followingIds]);

  const youFollowCount = followers.filter(u => followingIds.has(u.id)).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">Followers</h1>
            {targetHandle && <p className="text-sm text-muted-foreground">{targetHandle}</p>}
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {/* Section header when people you follow are sorted to top */}
        {highlightFollowing && youFollowCount > 0 && !loading && (
          <p className="text-sm text-muted-foreground mb-3 font-medium">
            {youFollowCount} follower{youFollowCount !== 1 ? 's' : ''} you follow
          </p>
        )}

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
        ) : sortedFollowers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No followers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedFollowers.map((user, idx) => {
              const isFirstNonFollowing =
                highlightFollowing &&
                youFollowCount > 0 &&
                idx === youFollowCount;

              return (
                <div key={user.id}>
                  {isFirstNonFollowing && (
                    <p className="text-sm text-muted-foreground mb-3 mt-4 font-medium">
                      Other followers
                    </p>
                  )}
                  <div className="bg-card rounded-xl p-4 flex items-center gap-3">
                    <div onClick={() => navigate(`/profile/${user.id}`)} className="cursor-pointer">
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
                      <FollowButton
                        userId={user.id}
                        initialFollowingState={followingIds.has(user.id)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
