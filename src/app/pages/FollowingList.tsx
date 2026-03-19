import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';
import { useState, useEffect } from 'react';
import { followAPI, userAPI } from '../utils/api';
import type { User } from '../data/mockData';

export function FollowingList() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { currentUser } = useAppData();
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);

  // Determine which user's following to show
  const viewingUserId = userId || currentUser?.id || '';

  useEffect(() => {
    async function loadFollowing() {
      try {
        setLoading(true);
        setError(null);

        // Load target user info
        const userData = await userAPI.getUser(viewingUserId);
        setTargetUser(userData);

        // Get following IDs
        const followingIds = await followAPI.getFollowing(viewingUserId);
        
        // If not following anyone, set empty array
        if (!followingIds || followingIds.length === 0) {
          setFollowing([]);
          setLoading(false);
          return;
        }

        // Fetch each followed user's full profile
        const followingProfiles = await Promise.all(
          followingIds.map(async (id: string) => {
            try {
              return await userAPI.getUser(id);
            } catch (err) {
              console.error(`Failed to load user ${id}:`, err);
              return null;
            }
          })
        );

        // Filter out any null results from failed fetches
        setFollowing(followingProfiles.filter((p): p is User => p !== null));
      } catch (err) {
        console.error('Failed to load following:', err);
        setError('Failed to load following. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadFollowing();
  }, [viewingUserId]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border z-10">
        <div className="w-full max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">Following</h1>
            <p className="text-sm text-muted-foreground">
              {targetUser?.display_name || targetUser?.displayName || 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Following List */}
      <div className="w-full max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        ) : following.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Not following anyone yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((user) => (
              <div
                key={user.id}
                className="bg-card rounded-xl p-4 flex items-center gap-3"
              >
                <div 
                  onClick={() => navigate(`/profile/${user.id}`)}
                  className="cursor-pointer"
                >
                  <ProfileAvatar
                    username={user.display_name || user.displayName || user.handle || '?'}
                    profilePicture={user.profile_picture || user.profilePicture}
                    size="lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="font-medium hover:underline block truncate"
                  >
                    {user.display_name || user.displayName || user.handle}
                  </button>
                  <button
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="text-sm text-muted-foreground hover:underline block truncate"
                  >
                    {user.handle}
                  </button>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {user.bio}
                    </p>
                  )}
                </div>
                {user.id !== currentUser?.id && (
                  <FollowButton userId={user.id} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}