import { useState, useEffect } from 'react';
import { Check, UserPlus, Loader2 } from 'lucide-react';
import { followAPI } from '../utils/api';

interface FollowButtonProps {
  userId: string;
  initialFollowingState?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
}

export function FollowButton({ 
  userId, 
  initialFollowingState = false,
  onFollowChange,
  size = 'md',
  variant = 'default'
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowingState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnfollowText, setShowUnfollowText] = useState(false);

  useEffect(() => {
    setIsFollowing(initialFollowingState);
  }, [initialFollowingState]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isFollowing) {
        await followAPI.unfollowUser(userId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await followAPI.followUser(userId);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      setError('Failed to update follow status');
      // Revert state on error
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base'
  };

  const baseClasses = 'rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const getButtonClasses = () => {
    if (variant === 'outline') {
      return isFollowing
        ? 'border-2 border-accent/50 text-accent hover:border-red-500 hover:text-red-500 hover:bg-red-500/10'
        : 'border-2 border-accent text-accent hover:bg-accent/10';
    }
    
    // Default variant
    return isFollowing
      ? 'bg-secondary text-foreground hover:bg-red-500 hover:text-white'
      : 'bg-accent text-accent-foreground hover:bg-accent/90';
  };

  return (
    <div className="relative">
      <button
        onClick={handleFollowToggle}
        disabled={isLoading}
        onMouseEnter={() => isFollowing && setShowUnfollowText(true)}
        onMouseLeave={() => setShowUnfollowText(false)}
        className={`${baseClasses} ${sizeClasses[size]} ${getButtonClasses()}`}
        title={isFollowing ? 'Click to unfollow' : 'Click to follow'}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
          </>
        ) : isFollowing ? (
          <>
            <Check className="w-4 h-4" />
            <span>{showUnfollowText ? 'Unfollow' : 'Following'}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            <span>Follow</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="absolute top-full mt-1 left-0 right-0 text-xs text-red-500 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
