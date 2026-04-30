import { useState, useRef, useEffect } from 'react';
import { Home, Search, MessageCircle, User, X, LogOut, ChevronUp, AlertTriangle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAppData } from '../context/AppDataContext';
import { ProfileAvatar } from './ProfileAvatar';
import { LoginModule } from './LoginModule';
import ForgeLogo from '../../assets/forge-logo.svg?react';
import { supabase } from '../utils/supabase';

interface LinkedAccount {
  id: string;
  handle: string;
  display_name: string;
  profile_picture: string | null;
  access_token: string;
  refresh_token: string;
}

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, session, isAuthenticated, signOut } = useAppData();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem('forge-linked-accounts') || '[]'); } catch { return []; }
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showAccountMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAccountMenu]);

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

  const handleSwitchAccount = async (account: LinkedAccount) => {
    if (!currentUser || !session) return;
    // Save current session back into linked accounts list
    const linked: LinkedAccount[] = JSON.parse(localStorage.getItem('forge-linked-accounts') || '[]');
    const currentData: LinkedAccount = {
      id: currentUser.id,
      handle: currentUser.handle,
      display_name: currentUser.display_name,
      profile_picture: currentUser.profile_picture,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
    const idx = linked.findIndex(a => a.id === currentUser.id);
    if (idx >= 0) linked[idx] = currentData; else linked.push(currentData);
    localStorage.setItem('forge-linked-accounts', JSON.stringify(linked));

    setShowAccountMenu(false);
    const { error } = await supabase.auth.setSession({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });
    if (error) {
      // Session stale — remove account, redirect to re-link
      const updated = linked.filter(a => a.id !== account.id);
      setLinkedAccounts(updated.filter(a => a.id !== currentUser.id));
      localStorage.setItem('forge-linked-accounts', JSON.stringify(updated.filter(a => a.id !== currentUser.id)));
      localStorage.setItem('forge-linking-account', 'true');
      navigate('/login');
      return;
    }
    navigate('/feed');
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setShowAccountMenu(false);
    try { await signOut(); } catch {}
    navigate('/feed');
  };

  const otherAccounts = linkedAccounts.filter(a => a.id !== currentUser?.id);

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

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">Log out of Forge?</p>
                <p className="text-sm text-muted-foreground">You'll need to sign in again to access your account.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors text-sm"
              >
                Log Out
              </button>
            </div>
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

          {/* Divider before New Post */}
          {isAuthenticated && (
            <hr className="my-1 border-border mx-1" />
          )}

          {/* Write post button */}
          {isAuthenticated && (
            <button
              onClick={() => navigate('/new-post')}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left w-full
                text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                <line x1="16" y1="8" x2="2" y2="22" />
                <line x1="17.5" y1="15" x2="9" y2="15" />
              </svg>
              <span className="hidden lg:block text-sm whitespace-nowrap">New Post</span>
            </button>
          )}
        </nav>

        {/* User profile at bottom — click to open account menu */}
        {currentUser && (
          <div className="shrink-0 border-t border-border px-2 py-3 relative" ref={menuRef}>
            {/* Account switcher popover */}
            {showAccountMenu && (
              <div className="absolute bottom-full left-2 right-2 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-10">
                {/* Current account */}
                <div className="px-3 py-2.5 flex items-center gap-2.5 bg-secondary/50">
                  {currentUser.profile_picture ? (
                    <img src={currentUser.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{currentUser.display_name || currentUser.handle}</p>
                    <p className="text-[10px] text-muted-foreground truncate">@{(currentUser.handle || '').replace(/^@/, '')}</p>
                  </div>
                  <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full font-medium shrink-0">Active</span>
                </div>

                {/* Other linked accounts */}
                {otherAccounts.length > 0 && (
                  <div className="border-t border-border">
                    {otherAccounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => handleSwitchAccount(account)}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-secondary transition-colors text-left"
                      >
                        {account.profile_picture ? (
                          <img src={account.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{account.display_name || account.handle}</p>
                          <p className="text-[10px] text-muted-foreground truncate">@{(account.handle || '').replace(/^@/, '')}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">Switch</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Log out */}
                <div className="border-t border-border">
                  <button
                    onClick={() => { setShowAccountMenu(false); setShowLogoutConfirm(true); }}
                    className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-destructive/10 transition-colors text-destructive text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">Log Out</span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAccountMenu(v => !v)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 w-full transition-colors hover:bg-secondary"
            >
              <ProfileAvatar
                username={currentUser.display_name || currentUser.handle || '?'}
                profilePicture={currentUser.profile_picture}
                size="sm"
                userId={currentUser.id}
                className="shrink-0"
              />
              <div className="hidden lg:flex flex-1 min-w-0 items-center justify-between gap-1">
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{currentUser.display_name || currentUser.handle}</p>
                  <p className="text-xs text-muted-foreground truncate">@{currentUser.handle}</p>
                </div>
                <ChevronUp className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${showAccountMenu ? '' : 'rotate-180'}`} />
              </div>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
