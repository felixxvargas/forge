'use client';
import { useEffect, type ReactNode } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { AppDataProvider } from '../context/AppDataContext';
import { SidebarProvider } from '../context/SidebarContext';
import { Toaster } from './ui/sonner';
import { OnboardingTooltip } from './OnboardingTooltip';
import { GlowBackground } from './GlowBackground';
import { initAnalytics } from '../utils/analytics';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Strip OG redirect marker (?_r=1) added by middleware loop-breaker
    if (new URLSearchParams(window.location.search).has('_r')) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete('_r');
      window.history.replaceState({}, '', clean.pathname + (clean.search || '') + (clean.hash || ''));
    }
    initAnalytics();
  }, []);

  return (
    <SidebarProvider>
    <ThemeProvider>
      <AppDataProvider>
        <GlowBackground />
        {/* z:1 so all page content stacks above the z:0 glow layer */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
          <Toaster />
          <OnboardingTooltip />
        </div>
      </AppDataProvider>
    </ThemeProvider>
    </SidebarProvider>
  );
}
