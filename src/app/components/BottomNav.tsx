import { useState } from 'react';
import { Home, Search, MessageCircle, User, X } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';
import { LoginModule } from './LoginModule';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAppData();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Hide bottom nav on certain pages
  if (
    location.pathname === '/list' ||
    location.pathname === '/login' ||
    location.pathname === '/onboarding'
  ) {
    return null;
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleProtected = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      {/* Auth modal for guests */}
      {/* Auth modal — mobile: slide-up sheet; desktop: full-screen overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:block bg-black/60 md:bg-transparent">
          <div className="relative w-full md:h-full md:overflow-y-auto rounded-t-2xl md:rounded-none overflow-hidden bg-background">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <LoginModule variant="page" onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
        <div className="w-full max-w-2xl mx-auto flex justify-around items-center h-16 px-6">
          <button
            onClick={() => {
              if (location.pathname === '/feed' || location.pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                navigate('/feed');
              }
            }}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isActive('/feed') || location.pathname === '/'
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="w-6 h-6" />
          </button>

          <Link
            to="/explore"
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isActive('/explore') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="w-6 h-6" />
          </Link>

          <button
            onClick={() => handleProtected('/messages')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isActive('/messages') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              if (!isAuthenticated) { setShowAuthModal(true); return; }
              if (location.pathname === '/profile') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                navigate('/profile');
              }
            }}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
              isActive('/profile') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {currentUser ? (
              <ProfileAvatar
                username={currentUser.display_name || currentUser.handle || '?'}
                profilePicture={currentUser.profile_picture}
                size="sm"
                userId={currentUser.id}
              />
            ) : (
              <User className="w-6 h-6" />
            )}
          </button>
        </div>
        {/* Safe-area extension */}
        <div className="bg-card" style={{ height: 'env(safe-area-inset-bottom, 0px)', minHeight: '0px' }} />
      </nav>
    </>
  );
}
