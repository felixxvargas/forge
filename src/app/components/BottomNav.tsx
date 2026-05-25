import { useRouter } from 'next/navigation';
import { Home, Search, MessageCircle, User } from 'lucide-react';
import { useLocation, Link, useNavigate } from '@/compat/router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const { currentUser, isAuthenticated } = useAppData();

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 md:hidden" style={{ backgroundColor: 'var(--sidebar, #2d1f47)' }}>
      <div className="w-full max-w-2xl mx-auto flex justify-around items-center h-16 px-6">
        <button
          onMouseEnter={() => router.prefetch('/feed')}
          onTouchStart={() => router.prefetch('/feed')}
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
          onMouseEnter={() => router.prefetch('/explore')}
          onTouchStart={() => router.prefetch('/explore')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            isActive('/explore') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="w-6 h-6" />
        </Link>

        <button
          onMouseEnter={() => router.prefetch('/messages')}
          onTouchStart={() => router.prefetch('/messages')}
          onClick={() => navigate('/messages')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            isActive('/messages') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        <button
          onMouseEnter={() => router.prefetch('/profile')}
          onTouchStart={() => router.prefetch('/profile')}
          onClick={() => {
            if (isAuthenticated && location.pathname === '/profile') {
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
      <div className="bg-sidebar" style={{ height: 'env(safe-area-inset-bottom, 0px)', minHeight: '0px', backgroundColor: 'var(--sidebar, #2d1f47)' }} />
    </nav>
  );
}
