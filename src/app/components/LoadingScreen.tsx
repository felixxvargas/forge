import ForgeSVG from '../../assets/forge-logo.svg?react';

// LoadingScreen — shown while the app initialises or Suspense is waiting
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fake header */}
      <div className="h-14 border-b border-border flex items-center justify-center shrink-0">
        <div className="flex items-center gap-1.5">
          <ForgeSVG width="28" height="22" aria-hidden="true" className="opacity-70" />
          <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-accent/15 text-accent leading-none">beta</span>
        </div>
      </div>

      {/* Skeleton feed */}
      <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-pulse">
        {/* Heading row */}
        <div className="h-6 bg-muted/40 rounded w-32 mb-6" />
        {/* Post skeletons */}
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
    </div>
  );
}
