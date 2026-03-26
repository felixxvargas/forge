import { useState } from 'react';

interface ProfileAvatarProps {
  username: string;
  profilePicture?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  userId?: string;
}

export function ProfileAvatar({ username, profilePicture, size = 'md', className = '' }: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  // If there's a profile picture and it hasn't errored, show it
  if (profilePicture && !imageError) {
    return (
      <img
        src={profilePicture}
        alt={username}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // If this is the @forge account, show the Forge logo
  const cleanName = (username ?? '').replace(/^@/, '').toLowerCase();
  if (cleanName === 'forge') {
    return (
      <img
        src="/forge-avatar.png"
        alt="Forge"
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
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