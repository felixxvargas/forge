import { Outlet, Navigate, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { useAppData } from '../context/AppDataContext';

export function Layout() {
  const { isAuthenticated, isLoading, currentUser } = useAppData();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but profile not loaded yet (auto-create in progress), wait
  if (isAuthenticated && !currentUser) {
    return null;
  }

  // If authenticated but no handle set, redirect to onboarding
  if (!currentUser.handle && location.pathname !== '/onboarding' && location.pathname !== '/splash') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom,0px)+1rem)]">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
