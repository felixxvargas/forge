import { useState, useEffect } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ProfileAvatar } from './ProfileAvatar';
import { PlatformIcon } from './PlatformIcon';
import { formatNumber } from '../utils/formatNumber';
import type { User } from '../data/data';

interface UserCardProps {
  user: User;
  onFollowToggle?: (userId: string, isFollowing: boolean) => void;
}

export function UserCard({ user, onFollowToggle }: UserCardProps) {
  const navigate = useNavigate();
  
  const handleFollowChange = (isFollowing: boolean) => {
    onFollowToggle?.(user.id, isFollowing);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the follow button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/profile/${user.id}`);
  };

  return (
    <div 
      className="bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <ProfileAvatar
          username={user.display_name || user.displayName || user.handle || '?'}
          profilePicture={user.profile_picture || user.profilePicture}
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
        {user.platforms.slice(0, 6).map((platform) => (
          <PlatformIcon key={platform} platform={platform} />
        ))}
      </div>

      {/* Stats & Follow */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {formatNumber(user.follower_count ?? user.followerCount ?? 0)} followers
        </span>
        <button
          className={`btn btn-sm ${user.isFollowing ? 'btn-secondary' : 'btn-outline'}`}
          onClick={() => handleFollowChange(!user.isFollowing)}
        >
          {user.isFollowing ? <UserMinus /> : <UserPlus />}
        </button>
      </div>
    </div>
  );
}