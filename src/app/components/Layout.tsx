import { Outlet, Navigate, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { useAppData } from '../context/AppDataContext';
import { LoginModule } from './LoginModule';

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
    <div className="min-h-dvh bg-background">
      <div className={`pb-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)]`}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
