'use client';
import { useState, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { Link, Navigate, ScrollRestoration, useLocation, useNavigate } from '@/compat/router';
import { useSidebar } from '../context/SidebarContext';
import { X, PenSquare } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { useAppData } from '../context/AppDataContext';
import { LoadingScreen } from './LoadingScreen';
import { OnboardingTooltip } from './OnboardingTooltip';

const LoginModule = dynamic(() => import('./LoginModule').then(m => ({ default: m.LoginModule })), { ssr: false });
const WhatsNewModal = dynamic(() => import('./WhatsNew').then(m => ({ default: m.WhatsNewModal })), { ssr: false });

const DRAFT_KEY = 'forge-post-draft';

function DraftResumeBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOpen } = useSidebar();
  const [draft, setDraft] = useState<{ content: string; replyTo?: string } | null>(null);
  const [isMdPlus, setIsMdPlus] = useState(false);

  useLayoutEffect(() => {
    setIsMdPlus(window.innerWidth >= 768);
    const check = () => setIsMdPlus(window.innerWidth >= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    <motion.div
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-3 md:right-auto md:w-80 z-[45]"
      animate={{ left: isMdPlus ? (isOpen ? 220 : 60) + 16 : 12 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
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
    </motion.div>
  );
}

// Pages that require authentication — show login module instead of redirecting
const AUTH_REQUIRED_PATHS = [
  '/settings', '/notifications', '/messages', '/privacy-security',
  '/edit-profile', '/new-post', '/create-group', '/premium',
];

export function Layout({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading, currentUser } = useAppData();
  const { isOpen } = useSidebar();
  const location = useLocation();
  const [isMdPlus, setIsMdPlus] = useState(false); // SSR-safe: both server and client initial render agree

  useLayoutEffect(() => {
    setIsMdPlus(window.innerWidth >= 768);
    const check = () => setIsMdPlus(window.innerWidth >= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sidebarMargin = isMdPlus ? (isOpen ? 220 : 60) : 0;

  if (isLoading || (isAuthenticated && !currentUser)) {
    return (
      <div className="min-h-dvh relative">
        <DesktopSidebar />
        <div style={{ marginLeft: sidebarMargin }}>
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
  const needsAuth = AUTH_REQUIRED_PATHS.some(p => location.pathname.startsWith(p))
    || location.pathname === '/profile';
  if (!isAuthenticated && needsAuth) {
    return (
      <div className="min-h-dvh relative bg-background">
        <Link
          to="/feed"
          className="fixed top-4 right-4 z-50 p-2 bg-card/80 backdrop-blur-sm rounded-full border border-border hover:bg-secondary transition-colors inline-flex items-center justify-center"
          aria-label="Go to feed"
        >
          <X className="w-5 h-5" />
        </Link>
        <LoginModule variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh relative">
      <ScrollRestoration />
      <DesktopSidebar />
      <div
        className="pb-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)] md:pb-4 transition-[margin-left] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: sidebarMargin }}
      >
        {children}
      </div>
      <BottomNav />
      {isAuthenticated && <WhatsNewModal />}
      {isAuthenticated && <DraftResumeBanner />}
      {isAuthenticated && !location.pathname.startsWith('/admin') && (
        <span className="hidden md:block"><OnboardingTooltip /></span>
      )}
    </div>
  );
}
