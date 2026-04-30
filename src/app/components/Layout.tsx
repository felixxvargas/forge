import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router';
import { X, PenSquare } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { useAppData } from '../context/AppDataContext';
import { LoginModule } from './LoginModule';
import { WhatsNewModal } from './WhatsNew';
import { LoadingScreen } from './LoadingScreen';

const DRAFT_KEY = 'forge-post-draft';

function DraftResumeBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<{ content: string; replyTo?: string } | null>(null);

  useEffect(() => {
    if (location.pathname.startsWith('/new-post')) { setDraft(null); return; }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { setDraft(null); return; }
      const parsed = JSON.parse(raw);
      if (parsed?.content?.trim()) {
        setDraft({ content: parsed.content, replyTo: parsed.replyTo });
      } else {
        setDraft(null);
      }
    } catch {
      setDraft(null);
    }
  }, [location.pathname]);

  if (!draft) return null;

  const handleResume = () => {
    navigate(draft.replyTo ? `/new-post?replyTo=${draft.replyTo}` : '/new-post');
  };

  const handleDismiss = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
  };

  const preview = draft.content.length > 55 ? draft.content.slice(0, 55) + '…' : draft.content;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-3 md:left-auto md:right-6 md:w-80 z-[45]">
      <div className="flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl">
        <PenSquare className="w-4 h-4 text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">{draft.replyTo ? 'Unsaved reply' : 'Unsaved draft'}</p>
          <p className="text-xs text-muted-foreground truncate">{preview}</p>
        </div>
        <button
          onClick={handleResume}
          className="shrink-0 px-2.5 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-semibold hover:bg-accent/90 transition-colors"
        >
          Resume
        </button>
        <button onClick={handleDismiss} className="shrink-0 p-1 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Pages that require authentication — show login module instead of redirecting
const AUTH_REQUIRED_PATHS = [
  '/settings', '/notifications', '/messages', '/privacy-security',
  '/edit-profile', '/new-post', '/create-group', '/premium',
];

export function Layout() {
  const { isAuthenticated, isLoading, currentUser } = useAppData();
  const location = useLocation();

  if (isLoading || (isAuthenticated && !currentUser)) {
    return (
      <div className="min-h-dvh relative">
        <DesktopSidebar />
        <div className="md:ml-[60px] lg:ml-[220px]">
          <LoadingScreen path={location.pathname} />
        </div>
        <BottomNav />
      </div>
    );
  }

  // If authenticated but no handle set, redirect to onboarding
  const isOnboarding = location.pathname === '/onboarding' || location.pathname === '/splash';
  if (isAuthenticated && currentUser && !currentUser.handle && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Auth-required pages: show login module for guests
  const needsAuth = AUTH_REQUIRED_PATHS.some(p => location.pathname.startsWith(p));
  if (!isAuthenticated && needsAuth) {
    return (
      <div className="min-h-dvh">
        <LoginModule variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative">
      <DesktopSidebar />
      <div className={`md:ml-[60px] lg:ml-[220px] pb-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)] md:pb-4`}>
        <Outlet />
      </div>
      <BottomNav />
      {isAuthenticated && <WhatsNewModal />}
      {isAuthenticated && <DraftResumeBanner />}
    </div>
  );
}
