import { Outlet, Navigate, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { useAppData } from '../context/AppDataContext';
import { LoginModule } from './LoginModule';
import { WhatsNewModal } from './WhatsNew';

// Pages that require authentication — show login module instead of redirecting
const AUTH_REQUIRED_PATHS = [
  '/settings', '/notifications', '/messages', '/privacy-security',
  '/edit-profile', '/new-post', '/create-group', '/premium',
];

export function Layout() {
  const { isAuthenticated, isLoading, currentUser } = useAppData();
  const location = useLocation();

  if (isLoading) return null;

  // If authenticated but profile not loaded yet, wait
  if (isAuthenticated && !currentUser) return null;

  // If authenticated but no handle set, redirect to onboarding
  const isOnboarding = location.pathname === '/onboarding' || location.pathname === '/splash';
  if (isAuthenticated && currentUser && !currentUser.handle && !isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Auth-required pages: show login module for guests
  const needsAuth = AUTH_REQUIRED_PATHS.some(p => location.pathname.startsWith(p));
  if (!isAuthenticated && needsAuth) {
    return (
      <div className="min-h-dvh bg-background">
        <LoginModule variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background relative">
      {/* Ambient purple forge glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute top-[-15%] left-[20%] w-[700px] h-[600px] rounded-full bg-accent/[0.07] blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[10%] w-[500px] h-[500px] rounded-full bg-accent/[0.05] blur-[120px]" />
        <div className="absolute top-[40%] left-[-5%] w-[400px] h-[400px] rounded-full bg-accent/[0.04] blur-[100px]" />
      </div>
      <DesktopSidebar />
      <div className={`md:ml-[60px] lg:ml-[220px] pb-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)] md:pb-4`}>
        <Outlet />
      </div>
      <BottomNav />
      {isAuthenticated && <WhatsNewModal />}
    </div>
  );
}
