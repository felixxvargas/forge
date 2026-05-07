import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { FollowButton } from '../components/FollowButton';
import { profiles } from '../utils/supabase';
import { useTopicAccountProfiles } from '../hooks/useTopicAccountProfiles';
import useSWR from 'swr';

export function FollowingList() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { currentUser } = useAppData();

  const viewingUserId = userId || currentUser?.id || '';

  const { data: followingData, isLoading: swrLoading, error: swrError } = useSWR(
    viewingUserId ? `following:${viewingUserId}` : null,
    async () => {
      const [userResult, followingResult] = await Promise.allSettled([
        profiles.getById(viewingUserId),
        profiles.getFollowing(viewingUserId),
      ]);
      return {
        handle: userResult.status === 'fulfilled'
          ? (userResult.value?.display_name || userResult.value?.handle || '')
          : '',
        following: (followingResult.status === 'fulfilled' ? followingResult.value : []) as any[],
      };
    },
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const following = followingData?.following ?? [];
  const loading = swrLoading && !followingData;
  const error = swrError ? (swrError?.message || 'Failed to load following') : null;
  const targetHandle = followingData?.handle ?? '';

  // For topic accounts, derive the synthetic ID used as profileCache key
  const topicIdFor = (u: any) =>
    u.account_type === 'topic'
      ? `user-${(u.handle || '').replace(/^@/, '').toLowerCase()}`
      : u.id;

  // Pre-populate Bluesky avatar cache for any topic accounts in the list
  useTopicAccountProfiles(following.map(topicIdFor));

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="w-full px-4 h-14 flex items-center gap-3">
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
            {(['w-36', 'w-28', 'w-40', 'w-32', 'w-36'] as const).map((nw, i) => (
              <div key={i} className="bg-card rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted/50 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className={`h-3.5 bg-muted/50 rounded ${nw}`} />
                  <div className="h-3 bg-muted/30 rounded w-24" />
                  {i % 2 === 0 && <div className="h-3 bg-muted/20 rounded w-48 mt-0.5" />}
                </div>
                <div className="h-8 bg-muted/30 rounded-full w-20 shrink-0" />
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
                    userId={topicIdFor(user)}
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
