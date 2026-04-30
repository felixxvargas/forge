import ForgeSVG from '../../assets/forge-logo.svg?react';
import { ArrowLeft } from 'lucide-react';

interface LoadingScreenProps {
  path?: string;
}

export function LoadingScreen({ path = '' }: LoadingScreenProps) {
  const isCompose      = path === '/new-post';
  const isFeedback     = path === '/feedback';
  const isNotifications = path === '/notifications';
  const isSettings     = path.startsWith('/settings');
  const isMessages     = path === '/messages';

  /* ─────────────────────────── header ─────────────────────────── */
  const header = (() => {
    if (isCompose) {
      return (
        <div className="w-full max-w-2xl mx-auto px-4 flex items-center justify-between">
          <div className="h-5 bg-muted/40 rounded w-16 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 bg-muted/30 rounded w-20 animate-pulse" />
            <div className="h-8 bg-accent/30 rounded-full w-14 animate-pulse" />
          </div>
        </div>
      );
    }
    if (isFeedback) {
      return (
        <div className="w-full max-w-2xl mx-auto px-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-muted/30 animate-pulse flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-muted/40" />
          </div>
          <div className="h-5 bg-muted/40 rounded w-36 animate-pulse" />
        </div>
      );
    }
    if (isMessages) {
      return (
        <div className="w-full max-w-2xl mx-auto px-4 flex items-center justify-between">
          <div className="h-6 bg-muted/50 rounded w-24 animate-pulse" />
          <div className="flex gap-1">
            <div className="w-9 h-9 bg-muted/30 rounded-lg animate-pulse" />
            <div className="w-9 h-9 bg-muted/30 rounded-lg animate-pulse" />
          </div>
        </div>
      );
    }
    /* default: forge logo centred (matches <Header /> with no title) */
    return (
      <div className="flex items-center gap-1.5">
        <ForgeSVG width="28" height="22" aria-hidden="true" className="opacity-70" />
        <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-accent/15 text-accent leading-none">beta</span>
      </div>
    );
  })();

  /* ─────────────────────────── body ─────────────────────────── */
  const body = (() => {
    /* ── compose ── */
    if (isCompose) {
      return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 animate-pulse flex-1 flex flex-col">
          <div className="flex gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-3 pt-0.5">
              <div className="h-4 bg-muted/40 rounded w-1/2" />
              <div className="h-3.5 bg-muted/30 rounded w-full" />
              <div className="h-3.5 bg-muted/30 rounded w-4/5" />
              <div className="h-3.5 bg-muted/20 rounded w-3/5" />
              <div className="h-3 bg-muted/20 rounded w-10 mt-auto" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-9 h-9 bg-muted/30 rounded-lg" />
            ))}
          </div>
        </div>
      );
    }

    /* ── feedback form ── */
    if (isFeedback) {
      return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-pulse space-y-6">
          {/* type selector */}
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-[68px] bg-muted/30 rounded-xl" />
            ))}
          </div>
          {/* helper text */}
          <div className="h-3 bg-muted/25 rounded w-56" />
          {/* title field */}
          <div className="space-y-1.5">
            <div className="h-3.5 bg-muted/40 rounded w-10" />
            <div className="h-10 bg-muted/30 rounded-lg" />
          </div>
          {/* description field */}
          <div className="space-y-1.5">
            <div className="h-3.5 bg-muted/40 rounded w-28" />
            <div className="h-[140px] bg-muted/30 rounded-lg" />
            <div className="h-3 bg-muted/20 rounded w-12 ml-auto" />
          </div>
          {/* submit button */}
          <div className="h-12 bg-muted/30 rounded-xl" />
        </div>
      );
    }

    /* ── notifications list ── */
    if (isNotifications) {
      const widths = ['w-3/4', 'w-2/3', 'w-5/6', 'w-3/5', 'w-4/5', 'w-2/3', 'w-3/4'];
      return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-pulse">
          <div className="h-7 bg-muted/50 rounded w-40 mb-6" />
          <div className="space-y-1">
            {widths.map((w, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-5 h-5 rounded-full bg-muted/40 shrink-0 mt-0.5" />
                <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5 pt-1">
                  <div className={`h-3 bg-muted/50 rounded ${w}`} />
                  <div className="h-2.5 bg-muted/30 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ── settings ── */
    if (isSettings) {
      return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-pulse">
          {/* page heading */}
          <div className="h-7 bg-muted/50 rounded w-24 mb-6" />

          {/* active account card */}
          <div className="bg-card rounded-xl p-4 mb-3 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted/40 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted/50 rounded w-32" />
              <div className="h-3 bg-muted/30 rounded w-20" />
            </div>
            <div className="h-6 bg-muted/25 rounded-full w-14" />
          </div>

          {/* account actions */}
          <div className="bg-card rounded-xl overflow-hidden mb-8">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-5 h-5 rounded bg-muted/30 shrink-0" />
              <div className="h-3.5 bg-muted/40 rounded w-36" />
            </div>
          </div>

          {/* Appearance section */}
          <div className="mb-8 space-y-3">
            <div className="h-3 bg-muted/30 rounded w-24" />
            <div className="bg-card rounded-xl px-4 py-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-muted/30 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted/40 rounded w-16" />
                <div className="h-3 bg-muted/25 rounded w-24" />
              </div>
            </div>
          </div>

          {/* Settings sections */}
          {([4, 3, 3] as const).map((count, s) => (
            <div key={s} className="mb-8 space-y-3">
              <div className="h-3 bg-muted/30 rounded w-28" />
              <div className="bg-card rounded-xl overflow-hidden divide-y divide-border/50">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-5 h-5 rounded bg-muted/30 shrink-0" />
                    <div className="h-3.5 bg-muted/40 rounded w-32" />
                    <div className="w-4 h-4 rounded bg-muted/20 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* ── messages ── */
    if (isMessages) {
      const nameWidths = ['w-28', 'w-32', 'w-24', 'w-36', 'w-28', 'w-32'];
      const previewWidths = ['w-48', 'w-40', 'w-52', 'w-44', 'w-36', 'w-48'];
      return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 animate-pulse space-y-2">
          {nameWidths.map((nw, i) => (
            <div key={i} className="bg-card rounded-xl flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-full bg-muted/40 shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className={`h-3.5 bg-muted/50 rounded ${nw}`} />
                  <div className="h-3 bg-muted/25 rounded w-10 shrink-0" />
                </div>
                <div className={`h-3 bg-muted/30 rounded ${previewWidths[i]}`} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    /* ── generic feed (all other paths) ── */
    const contentWidths = ['w-full', 'w-5/6', 'w-full', 'w-4/5', 'w-11/12', 'w-full', 'w-3/4', 'w-5/6'];
    return (
      <div className="w-full max-w-2xl mx-auto px-4 pt-3 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl mb-3 p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 mb-2.5">
                  <div className="h-3 bg-muted/50 rounded w-24" />
                  <div className="h-3 bg-muted/30 rounded w-16" />
                </div>
                <div className="space-y-2 mb-3">
                  <div className={`h-3 bg-muted/40 rounded ${contentWidths[i]}`} />
                  <div className="h-3 bg-muted/40 rounded w-5/6" />
                  {i % 3 !== 2 && <div className="h-3 bg-muted/30 rounded w-2/3" />}
                </div>
                {i % 2 === 0 && (
                  <div className="h-32 bg-muted/20 rounded-xl mb-3" />
                )}
                <div className="flex gap-4 pt-1">
                  <div className="h-3 bg-muted/25 rounded w-8" />
                  <div className="h-3 bg-muted/25 rounded w-8" />
                  <div className="h-3 bg-muted/25 rounded w-8" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-14 border-b border-border flex items-center justify-center shrink-0">
        {header}
      </div>
      {body}
    </div>
  );
}
