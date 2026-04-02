import { useNavigate } from 'react-router';
import { ProfileAvatar } from './ProfileAvatar';
import { PlatformIcon } from './PlatformIcon';
import { FollowButton } from './FollowButton';
import { formatNumber } from '../utils/formatNumber';
import { useAppData } from '../context/AppDataContext';
import { useBlueskyData } from '../hooks/useBlueskyData';
import type { User } from '../data/data';

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  const navigate = useNavigate();
  const { currentUser, followingIds } = useAppData();

  const isTopicAccount = (user as any).account_type === 'topic';
  const blueskyData = useBlueskyData(user);
  const resolvedPicture = (isTopicAccount ? blueskyData.avatar : undefined)
    || user.profile_picture || user.profilePicture;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    navigate(`/profile/${user.id}`);
  };

  if (user.id === currentUser?.id) return null;

  return (
    <div
      className="bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <ProfileAvatar
          username={user.display_name || user.displayName || user.handle || '?'}
          profilePicture={resolvedPicture}
          size="md"
          userId={user.id}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium">{user.display_name || user.displayName || user.handle}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{user.handle}</p>
          {user.pronouns && (
            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">
              {user.pronouns}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm mb-3 line-clamp-2">{user.bio}</p>

      {/* Platforms */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(user.platforms || []).slice(0, 6).map((platform) => (
          <PlatformIcon key={platform} platform={platform} />
        ))}
      </div>

      {/* Stats & Follow */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {formatNumber(user.follower_count ?? user.followerCount ?? 0)} followers
        </span>
        <FollowButton
          userId={user.id}
          initialFollowingState={followingIds?.has(user.id) ?? false}
          size="sm"
        />
      </div>
    </div>
  );
}
