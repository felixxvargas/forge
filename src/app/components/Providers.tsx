'use client';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { AppDataProvider } from '../context/AppDataContext';
import { Toaster } from './ui/sonner';
import { OnboardingTooltip } from './OnboardingTooltip';
import { GlowBackground } from './GlowBackground';

export function Providers({ children }: { children: ReactNode }) {
  return (
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
  );
}
