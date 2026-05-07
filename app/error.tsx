'use client';

import { useEffect } from 'react';
import { Home, RefreshCw, ArrowLeft } from 'lucide-react';
import ForgeSVG from '@/assets/forge-logo.svg?react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Forge error]', error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 text-center max-w-sm w-full">
        {/* Logo with glow */}
        <div className="mb-6 flex justify-center">
          <div className="relative w-12 h-[38px] flex items-center justify-center">
            <div className="absolute inset-0 pointer-events-none rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(231,255,196,0.4) 0%, rgba(167,139,250,0.35) 45%, transparent 70%)', filter: 'blur(18px)', transform: 'scale(3)' }} />
            <ForgeSVG className="relative w-full h-full" aria-hidden="true" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          We hit an unexpected snag. Try again — if it keeps happening, our team has been notified.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
            <a
              href="/feed"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </a>
          </div>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground/50">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
