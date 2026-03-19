import { X } from 'lucide-react';
import { useEffect } from 'react';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfilePictureLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  profilePicture: string | undefined;
  username: string;
}

export function ProfilePictureLightbox({ isOpen, onClose, profilePicture, username }: ProfilePictureLightboxProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Profile picture - prevent click from closing */}
      <div 
        className="relative max-w-2xl max-h-[80vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {profilePicture ? (
          <img 
            src={profilePicture} 
            alt={`${username}'s profile picture`}
            className="max-w-full max-h-[80vh] rounded-lg object-contain"
          />
        ) : (
          <div className="w-96 h-96 flex items-center justify-center">
            <ProfileAvatar 
              username={username}
              profilePicture={profilePicture}
              size="xl"
              className="!w-96 !h-96 !text-9xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
