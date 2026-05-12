'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-accent/10 p-4 rounded-full">
            <AlertCircle className="w-10 h-10 text-accent" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          An unexpected error occurred. Our team has been notified.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-xl font-medium hover:bg-accent/90 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <button
            onClick={() => { window.location.href = '/feed'; }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl font-medium hover:bg-secondary transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
