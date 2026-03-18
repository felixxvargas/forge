import { Outlet, Navigate, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { useEffect } from 'react';

// Layout v1.0.7 - Added authentication check for protected routes
export function Layout() {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('forge-logged-in') === 'true';
  const hasToken = !!localStorage.getItem('forge-access-token');
  
  // Log authentication status for debugging
  useEffect(() => {
    console.log('[Layout] Authentication check:', {
      isLoggedIn,
      hasToken,
      path: location.pathname
    });
  }, [isLoggedIn, hasToken, location.pathname]);
  
  // If not logged in, redirect to login page
  if (!isLoggedIn) {
    console.warn('[Layout] User not logged in, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <BottomNav />
    </div>
  );
}

// HMR: Accept updates to this module
if (import.meta.hot) {
  import.meta.hot.accept();
  console.log('[HMR] Layout module updated');
}