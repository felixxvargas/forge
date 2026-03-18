import { ForgeLogo, getForgeLogoDataURL } from './ForgeLogo';
import { useState } from 'react';

// Forge account avatar — served from /public
const forgeProfilePic = '/forge-avatar.png';

interface ProfileAvatarProps {
  username: string;
  profilePicture?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  userId?: string; // Add userId to detect @forge account
}

// Accessible colors for avatar backgrounds (good contrast with white text)
const AVATAR_COLORS = [
  'bg-purple-600',
  'bg-blue-600',
  'bg-green-600',
  'bg-orange-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-red-600',
  'bg-cyan-600',
  'bg-amber-600',
];

function getColorForUsername(username: string): string {
  // Simple hash function to consistently get same color for same username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ProfileAvatar({ username, profilePicture, size = 'md', className = '', userId }: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
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

  // If this is the @forge account, show Forge logo
  if (userId === 'user-forge') {
    return (
      <img
        src={forgeProfilePic}
        alt="Forge Logo"
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  // Otherwise, show placeholder with first letter
  const firstLetter = username.charAt(0).toUpperCase();
  const bgColor = getColorForUsername(username);

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
    >
      {firstLetter}
    </div>
  );
}