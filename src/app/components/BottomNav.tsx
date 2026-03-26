import { Home, Search, MessageCircle, User, ZapIcon } from 'lucide-react';
import { useLocation, Link } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';

export function BottomNav() {
  const location = useLocation();
  const { currentUser } = useAppData(); // Must call hooks before any conditional returns
  
  // Hide bottom nav on certain pages
  if (location.pathname === '/list' || 
      location.pathname === '/login' || 
      location.pathname === '/onboarding' ||
      location.pathname === '/admin') {
    return null;
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-2xl mx-auto flex justify-around items-center h-16 px-6">
        <Link
          to="/feed"
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            isActive('/feed') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="w-6 h-6" />
        </Link>
        
        <Link
          to="/explore"
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            isActive('/explore') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="w-6 h-6" />
        </Link>

        <Link
          to="/messages"
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
            isActive('/messages') ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageCircle className="w-6 h-6" />
        </Link>
        
        <Link
          to="/profile"
          onClick={() => { if (isActive('/profile')) window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
        </Link>
      </div>
    </nav>
  );
}