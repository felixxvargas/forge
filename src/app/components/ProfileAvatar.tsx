import { useState } from 'react';
import { profileCache } from '../hooks/useTopicAccountProfiles';

interface ProfileAvatarProps {
  username: string;
  profilePicture?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  userId?: string;
}

export function ProfileAvatar({ username, profilePicture, size = 'md', className = '', userId }: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  // If no direct profile picture, check the topic account cache by userId
  const resolvedPicture = profilePicture || (userId ? profileCache.get(userId)?.avatar : undefined);

  // If there's a profile picture and it hasn't errored, show it
  // bg-background ensures PNG transparency shows the theme background colour, not a white/clear hole
  if (resolvedPicture && !imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0 bg-background ${className}`}>
        <img
          src={resolvedPicture}
          alt={username}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // If this is the @forge account, show the Forge logo
  const cleanName = (username ?? '').replace(/^@/, '').toLowerCase();
  if (cleanName === 'forge') {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0 bg-background ${className}`}>
        <img
          src="/forge-avatar.png"
          alt="Forge"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Default: two-letter initials on a fixed deep purple background
  const initials = (username ?? '').replace(/^@/, '').slice(0, 2).toUpperCase() || '??';

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold
        bg-purple-600 text-white dark:bg-purple-700 dark:text-white
        ${className}`}
    >
      {initials}
    </div>
  );
}