import { Header } from './Header';

function GameListCardSkeleton() {
  return (
    <div className="rounded-xl overflow-visible bg-card space-y-3">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="h-4 bg-muted/40 rounded w-32" />
        <div className="h-4 bg-muted/20 rounded w-12" />
      </div>
      <div className="flex gap-2 overflow-visible px-4">
        {Array.from({ length: 6 }).map((_, j) => (
          <div key={j} className="shrink-0 rounded-lg bg-muted/30" style={{ width: 68, aspectRatio: '3/4' }} />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <Header />
      {/* Mobile skeleton */}
      <div className="lg:hidden animate-pulse">
        <div className="bg-card px-5 pt-5 pb-4 rounded-b-2xl mb-3">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 shrink-0" />
            <div className="flex-1 pt-1 space-y-2">
              <div className="h-5 bg-muted/50 rounded w-36" />
              <div className="h-3.5 bg-muted/30 rounded w-24" />
            </div>
            <div className="w-9 h-9 rounded-lg bg-muted/30 shrink-0" />
          </div>
          <div className="space-y-1.5 mb-4">
            <div className="h-3.5 bg-muted/35 rounded w-full" />
            <div className="h-3.5 bg-muted/35 rounded w-2/3" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-5">
              <div className="space-y-1">
                <div className="h-5 bg-muted/50 rounded w-8" />
                <div className="h-3 bg-muted/25 rounded w-16" />
              </div>
              <div className="space-y-1">
                <div className="h-5 bg-muted/50 rounded w-8" />
                <div className="h-3 bg-muted/25 rounded w-16" />
              </div>
            </div>
            <div className="h-9 bg-muted/35 rounded-xl w-24" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-muted/25" />
            ))}
          </div>
        </div>
        <div className="flex border-b border-border/50 mb-4 pl-4 overflow-x-auto">
          {[36, 40, 32, 40, 44].map((w, i) => (
            <div key={i} className="shrink-0 flex justify-center py-3 px-4">
              <div className="h-4 bg-muted/25 rounded" style={{ width: w }} />
            </div>
          ))}
        </div>
        <div className="px-4 space-y-4 pb-20">
          {Array.from({ length: 3 }).map((_, i) => (
            <GameListCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className="hidden lg:flex lg:flex-row lg:gap-6 lg:items-start lg:pt-8 lg:px-6 w-full max-w-7xl mx-auto animate-pulse">
        <div className="w-[340px] shrink-0 sticky top-[72px] self-start space-y-4">
          <div className="rounded-2xl bg-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted/50 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted/50 rounded w-32" />
                <div className="h-3.5 bg-muted/30 rounded w-20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3.5 bg-muted/35 rounded w-full" />
              <div className="h-3.5 bg-muted/35 rounded w-4/5" />
            </div>
            <div className="flex gap-5">
              <div className="space-y-1">
                <div className="h-5 bg-muted/50 rounded w-8" />
                <div className="h-3 bg-muted/25 rounded w-16" />
              </div>
              <div className="space-y-1">
                <div className="h-5 bg-muted/50 rounded w-8" />
                <div className="h-3 bg-muted/25 rounded w-16" />
              </div>
            </div>
            <div className="h-9 bg-muted/35 rounded-xl w-full" />
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-muted/25" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-card px-5 py-4 space-y-3">
            <div className="h-4 bg-muted/40 rounded w-16" />
            <div className="space-y-1.5">
              <div className="h-3.5 bg-muted/25 rounded w-full" />
              <div className="h-3.5 bg-muted/25 rounded w-4/5" />
              <div className="h-3.5 bg-muted/25 rounded w-3/5" />
            </div>
            <div className="flex gap-2 flex-wrap pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-7 bg-muted/20 rounded-full w-20" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex border-b border-border/50 mb-5">
            {[36, 40, 32, 44, 40].map((w, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-4 bg-muted/25 rounded" style={{ width: w }} />
              </div>
            ))}
          </div>
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <GameListCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
