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
        className="relative flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {profilePicture ? (
          <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/10">
            <img
              src={profilePicture}
              alt={`${username}'s profile picture`}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center">
            <ProfileAvatar
              username={username}
              profilePicture={profilePicture}
              size="xl"
              className="!w-72 !h-72 sm:!w-96 sm:!h-96 !text-9xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
