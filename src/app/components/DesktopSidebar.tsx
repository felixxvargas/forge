import { useState } from 'react';
import { Home, Search, MessageCircle, User, X, PenSquare } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';
import { LoginModule } from './LoginModule';
import ForgeLogo from '../../assets/forge-logo.svg?react';

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAppData();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Don't show on these pages
  if (
    location.pathname === '/list' ||
    location.pathname === '/login' ||
    location.pathname === '/onboarding' ||
    location.pathname === '/splash'
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

  const navItems = [
    {
      icon: Home,
      label: 'Feed',
      onClick: () => {
        if (location.pathname === '/feed' || location.pathname === '/') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          navigate('/feed');
        }
      },
      active: isActive('/feed') || location.pathname === '/',
    },
    {
      icon: Search,
      label: 'Explore',
      onClick: () => navigate('/explore'),
      active: isActive('/explore'),
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      onClick: () => handleProtected('/messages'),
      active: isActive('/messages'),
    },
    {
      icon: User,
      label: 'Profile',
      onClick: () => {
        if (!isAuthenticated) { setShowAuthModal(true); return; }
        if (location.pathname === '/profile') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          navigate('/profile');
        }
      },
      active: isActive('/profile'),
    },
  ];

  return (
    <>
      {/* Auth modal */}
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

      {/* Sidebar — hidden on mobile, icon-only at md, full at lg+ */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen z-50 flex-col
        md:w-[60px] lg:w-[220px]
        bg-card border-r border-border">

        {/* Logo */}
        <div className="flex items-center h-14 px-3 border-b border-border shrink-0 overflow-hidden">
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/60 transition-colors min-w-0"
            aria-label="Go to feed"
          >
            <ForgeLogo width="28" height="22" aria-hidden="true" className="shrink-0" />
            <span className="hidden lg:flex items-center gap-1.5 overflow-hidden">
              <span className="font-black text-lg text-accent whitespace-nowrap">Forge</span>
              <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-accent/15 text-accent leading-none whitespace-nowrap">beta</span>
            </span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, onClick, active }) => (
            <button
              key={label}
              onClick={onClick}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left w-full
                ${active
                  ? 'bg-accent/15 text-accent font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm whitespace-nowrap">{label}</span>
            </button>
          ))}

          {/* Write post button */}
          {isAuthenticated && (
            <button
              onClick={() => navigate('/new-post')}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 mt-2 transition-colors text-left w-full
                text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <PenSquare className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block text-sm whitespace-nowrap">New Post</span>
            </button>
          )}
        </nav>

        {/* User profile at bottom */}
        {currentUser && (
          <div className="shrink-0 border-t border-border px-2 py-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 w-full transition-colors hover:bg-secondary"
            >
              <ProfileAvatar
                username={currentUser.display_name || currentUser.handle || '?'}
                profilePicture={currentUser.profile_picture}
                size="sm"
                userId={currentUser.id}
                className="shrink-0"
              />
              <div className="hidden lg:block min-w-0 text-left">
                <p className="text-sm font-semibold truncate">{currentUser.display_name || currentUser.handle}</p>
                <p className="text-xs text-muted-foreground truncate">@{currentUser.handle}</p>
              </div>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
