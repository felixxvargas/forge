'use client';
import { useEffect, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { ThemeProvider } from '../context/ThemeContext';
import { AppDataProvider } from '../context/AppDataContext';
import { SidebarProvider } from '../context/SidebarContext';
import { Toaster } from './ui/sonner';
import { GlowBackground } from './GlowBackground';
import { initAnalytics } from '../utils/analytics';

function isChunkError(msg: string) {
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes("Cannot read properties of undefined (reading 'call')") ||
    (msg.includes('is not an object') && msg.includes('.call'))
  );
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Strip OG redirect marker (?_r=1) added by middleware loop-breaker
    if (new URLSearchParams(window.location.search).has('_r')) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('_r');
      window.history.replaceState({}, '', clean.pathname + (clean.search || '') + (clean.hash || ''));
    }
    initAnalytics();

    // Reload once when a stale or race-conditioned chunk can't be loaded
    const reloadOnce = () => {
      if (!sessionStorage.getItem('chunk-reload')) {
        sessionStorage.setItem('chunk-reload', '1');
        window.location.reload();
      }
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason?.message ?? '')) reloadOnce();
    };
    const handleError = (e: ErrorEvent) => {
      if (isChunkError(e.message ?? '')) reloadOnce();
    };
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <SWRConfig value={{ revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false, dedupingInterval: 60000 }}>
    <SidebarProvider>
    <ThemeProvider>
      <AppDataProvider>
        <GlowBackground />
        {/* z:1 so all page content stacks above the z:0 glow layer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
          <Toaster />
        </div>
      </AppDataProvider>
    </ThemeProvider>
    </SidebarProvider>
    </SWRConfig>
  );
}
