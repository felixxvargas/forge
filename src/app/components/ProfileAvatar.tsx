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
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  const resolvedPicture = profilePicture || (userId ? profileCache.get(userId)?.avatar : undefined);
  const cleanName = (username ?? '').replace(/^@/, '').toLowerCase();
  const imgSrc = cleanName === 'forge' ? '/forge-avatar.png' : (resolvedPicture ?? null);
  const showImage = !!imgSrc && !imageError;
  const initials = (username ?? '').replace(/^@/, '').slice(0, 2).toUpperCase() || '??';

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0 relative ${className}`}>
      {/* Initials always present as the base layer — never a blank state */}
      <div className="absolute inset-0 flex items-center justify-center font-semibold bg-[#6b5a7e] text-white/90">
        {initials}
      </div>
      {/* Image fades in on top once loaded; falls back to initials on error */}
      {showImage && (
        <img
          src={imgSrc}
          alt={username}
          className={`absolute inset-0 w-full h-full object-cover bg-background transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
}
