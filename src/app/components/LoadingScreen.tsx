import ForgeSVG from '../../assets/forge-logo.svg?react';

interface LoadingScreenProps {
  path?: string;
}

// LoadingScreen — shown while the app initialises or Suspense is waiting
export function LoadingScreen({ path = '' }: LoadingScreenProps) {
  const isCompose = path === '/new-post';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fake header */}
      <div className="h-14 border-b border-border flex items-center justify-center shrink-0">
        {isCompose ? (
          <div className="w-full max-w-2xl mx-auto px-4 flex items-center justify-between">
            <div className="h-5 bg-muted/40 rounded w-16 animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-5 bg-muted/30 rounded w-20 animate-pulse" />
              <div className="h-8 bg-accent/30 rounded-full w-14 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <ForgeSVG width="28" height="22" aria-hidden="true" className="opacity-70" />
            <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-accent/15 text-accent leading-none">beta</span>
          </div>
        )}
      </div>

      {isCompose ? (
        /* Compose post skeleton */
        <div className="w-full max-w-2xl mx-auto px-4 py-4 animate-pulse flex-1 flex flex-col">
          {/* Avatar + textarea area */}
          <div className="flex gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3 pt-0.5">
              {/* Textarea placeholder lines */}
              <div className="h-4 bg-muted/40 rounded w-1/2" />
              <div className="h-3.5 bg-muted/30 rounded w-full" />
              <div className="h-3.5 bg-muted/30 rounded w-4/5" />
              <div className="h-3.5 bg-muted/20 rounded w-3/5" />
              {/* Char count */}
              <div className="h-3 bg-muted/20 rounded w-10 mt-auto" />
            </div>
          </div>
          {/* Toolbar */}
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-9 h-9 bg-muted/30 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        /* Generic feed skeleton */
        <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-pulse">
          <div className="h-6 bg-muted/40 rounded w-32 mb-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-4 border-b border-border/50">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex gap-2">
                    <div className="h-3 bg-muted/40 rounded w-24" />
                    <div className="h-3 bg-muted/25 rounded w-16" />
                  </div>
                  <div className="h-3 bg-muted/40 rounded w-full" />
                  <div className="h-3 bg-muted/40 rounded w-5/6" />
                  <div className="h-3 bg-muted/25 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
