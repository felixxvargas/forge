'use client';

import { useState } from 'react';
import { RefreshCw, ArrowLeft, Home, ChevronRight, FileQuestion, Unplug } from 'lucide-react';

interface ErrorScreenProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
  is404?: boolean;
}

export function ErrorScreen({
  error,
  reset,
  title,
  description,
  is404 = false,
}: ErrorScreenProps) {
  const [expanded, setExpanded] = useState(false);

  const headline = title ?? (is404 ? 'Page not found' : 'Something went wrong');
  const body = description ?? (
    is404
      ? "This page doesn't exist or may have been moved."
      : "We hit an unexpected snag. Try again — if it keeps happening, our team has been notified."
  );

  const hasDetails = !is404 && (error?.message || error?.digest);

  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-0" aria-hidden="true">
        <div
          className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
      </div>

      <div className="relative z-10 text-center max-w-sm w-full">
        {/* Decorative 404 text */}
        {is404 && (
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 text-[120px] font-black leading-none select-none pointer-events-none"
            style={{ color: 'rgba(231,255,196,0.12)' }}
            aria-hidden="true"
          >
            404
          </div>
        )}

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div
              className="absolute inset-0 pointer-events-none rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0.15) 50%, transparent 70%)', filter: 'blur(16px)', transform: 'scale(2.5)' }}
            />
            {is404
              ? <FileQuestion className="relative w-10 h-10 text-muted-foreground/60" aria-hidden="true" />
              : <Unplug className="relative w-10 h-10 text-muted-foreground/60" aria-hidden="true" />
            }
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">{headline}</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{body}</p>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {reset && (
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 flex items-center justify-center gap-2 h-11 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
            <a
              href="/feed"
              className="flex-1 flex items-center justify-center gap-2 h-11 bg-secondary hover:bg-secondary/80 rounded-xl text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              Home
            </a>
          </div>
        </div>

        {/* Expandable technical details */}
        {hasDetails && (
          <div className="mt-6">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 mx-auto text-xs text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              Technical details
            </button>
            {expanded && (
              <div className="mt-3 text-left rounded-xl border border-border bg-card/60 p-4 text-xs font-mono text-muted-foreground break-all space-y-2">
                {error?.message && <p>{error.message}</p>}
                {error?.digest && <p className="text-muted-foreground/50">Error ID: {error.digest}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
