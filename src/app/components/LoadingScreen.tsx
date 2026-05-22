'use client';
import ForgeSVG from '../../assets/forge-logo.svg?react';
import { BetaTag } from './ui/BetaTag';
import { ArrowLeft } from 'lucide-react';
import { useColumnCount, splitToColumns } from '../hooks/useColumnCount';

interface LoadingScreenProps {
  path?: string;
}

export function LoadingScreen({ path = '' }: LoadingScreenProps) {
  const numCols = useColumnCount();
  const isCompose      = path === '/new-post';
  const isFeedback     = path === '/feedback';
  const isNotifications = path === '/notifications';
  const isSettings     = path.startsWith('/settings');
  const isMessages     = path === '/messages';
  const isProfile      = path === '/profile' || path.startsWith('/profile/') || /^\/@[^/]/.test(path);
  const isGameDetail   = /^\/game\/[^/]+$/.test(path);
  const isExplore      = path === '/explore';

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
        <BetaTag size="sm" />
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

    /* ── profile ── */
    if (isProfile) {
      const GameListCardSkeleton = () => (
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
      return (
        <div className="min-h-screen">
          {/* ── Mobile skeleton ── */}
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
            <div className="flex border-b border-border/50 mb-4">
              {[36, 40, 32, 40, 44].map((w, i) => (
                <div key={i} className="flex-1 flex justify-center py-3">
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
          {/* ── Desktop skeleton — 2-column layout matching actual profile ── */}
          <div className="hidden lg:flex lg:flex-row lg:gap-6 lg:items-start lg:pt-8 lg:pl-12 lg:pr-6 w-full max-w-7xl mx-auto animate-pulse">
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

    /* ── explore ── */
    if (isExplore) {
      const savedTab = (() => { try { return localStorage.getItem('explore-active-tab') || 'posts'; } catch { return 'posts'; } })();
      const searchBarSkeleton = <div className="h-10 bg-muted/30 rounded-xl mb-4 max-w-5xl mx-auto" />;

      if (savedTab === 'games') {
        return (
          <div className="px-4 lg:px-6 pt-3 pb-6 animate-pulse">
            {searchBarSkeleton}
            <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[3/4] rounded-lg bg-muted/50 mb-2" />
                  <div className="h-3 bg-muted/50 rounded mb-1.5 w-4/5" />
                  <div className="h-2.5 bg-muted/30 rounded w-1/3" />
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (savedTab === 'users') {
        return (
          <div className="px-4 lg:px-6 pt-3 pb-6 animate-pulse">
            {searchBarSkeleton}
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted/50 shrink-0" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <div className="h-4 bg-muted/50 rounded w-32" />
                      <div className="h-3 bg-muted/30 rounded w-20" />
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <div className="h-3 bg-muted/40 rounded w-full" />
                    <div className="h-3 bg-muted/30 rounded w-3/4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 bg-muted/30 rounded w-24" />
                    <div className="h-8 bg-muted/35 rounded-full w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      /* posts / groups / default — column-based post cards */
      const expContentWidths = ['w-full', 'w-5/6', 'w-4/5', 'w-11/12', 'w-3/4', 'w-5/6', 'w-full'];
      const expCards = Array.from({ length: numCols === 1 ? 7 : numCols === 2 ? 10 : 14 }, (_, i) => i);
      const expCols = splitToColumns(expCards, numCols);
      return (
        <div className="px-4 lg:px-6 pt-3 pb-6 animate-pulse">
          {searchBarSkeleton}
          <div className="flex gap-6 items-start">
            {expCols.map((colItems, colIdx) => (
              <div key={colIdx} className="flex-1 flex flex-col gap-6 min-w-0">
                {colItems.map((i) => (
                  <div key={i} className="bg-card rounded-xl p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 mb-2.5">
                          <div className="h-3 bg-muted/50 rounded w-24" />
                          <div className="h-3 bg-muted/30 rounded w-16" />
                        </div>
                        <div className="space-y-2 mb-3">
                          <div className={`h-3 bg-muted/40 rounded ${expContentWidths[i % expContentWidths.length]}`} />
                          <div className="h-3 bg-muted/40 rounded w-5/6" />
                          {i % 3 !== 2 && <div className="h-3 bg-muted/30 rounded w-2/3" />}
                        </div>
                        {(i + colIdx) % 3 === 0 && <div className="h-32 bg-muted/20 rounded-xl mb-3" />}
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
            ))}
          </div>
        </div>
      );
    }

    /* ── game detail ── */
    if (isGameDetail) {
      return (
        <div className="animate-pulse">
          {/* Hero banner */}
          <div className="relative w-full max-w-2xl lg:max-w-5xl mx-auto mb-6 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-muted/20" />
            <div className="relative flex justify-center items-center px-4 pt-8 pb-8 min-h-[320px]">
              <div className="relative z-10 w-48 rounded-xl bg-muted/40" style={{ aspectRatio: '3/4' }} />
            </div>
          </div>
          {/* Content */}
          <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4">
            <div className="lg:flex lg:gap-6 lg:items-start">
              {/* Left col: title + actions */}
              <div className="lg:w-[320px] lg:shrink-0 mb-6">
                <div className="space-y-2 mb-5">
                  <div className="h-8 bg-muted/50 rounded w-52" />
                  <div className="h-4 bg-muted/30 rounded w-20" />
                  <div className="flex gap-1.5 pt-0.5">
                    {['w-16', 'w-20', 'w-14'].map((w, i) => (
                      <div key={i} className={`h-5 bg-muted/25 rounded-full ${w}`} />
                    ))}
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {['w-full', 'w-5/6', 'w-4/5', 'w-3/4'].map((w, i) => (
                      <div key={i} className={`h-3 bg-muted/30 rounded ${w}`} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 h-11 bg-muted/30 rounded-xl" />
                    <div className="flex-1 h-11 bg-muted/30 rounded-xl" />
                  </div>
                  <div className="h-11 bg-muted/30 rounded-xl" />
                  <div className="flex gap-2">
                    <div className="flex-1 h-11 bg-muted/25 rounded-xl" />
                    <div className="w-12 h-11 bg-muted/25 rounded-xl" />
                  </div>
                  <div className="h-11 bg-muted/20 rounded-xl" />
                </div>
              </div>
              {/* Right col: stats + posts */}
              <div className="flex-1 min-w-0">
                <div className="bg-card rounded-2xl p-4 mb-6 flex divide-x divide-border">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 py-2">
                      <div className="h-7 bg-muted/40 rounded w-10" />
                      <div className="h-3 bg-muted/25 rounded w-12" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="bg-card rounded-xl p-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
                        <div className="flex-1 space-y-2 pt-0.5">
                          <div className="flex gap-2">
                            <div className="h-3 bg-muted/50 rounded w-24" />
                            <div className="h-3 bg-muted/30 rounded w-14" />
                          </div>
                          <div className="h-3 bg-muted/35 rounded w-full" />
                          <div className="h-3 bg-muted/35 rounded w-4/5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* ── generic feed (Feed, Explore, and other list paths) ── */
    const contentWidths = ['w-full', 'w-5/6', 'w-full', 'w-4/5', 'w-11/12', 'w-full', 'w-3/4', 'w-5/6', 'w-full'];
    const cardCount = numCols === 1 ? 7 : numCols === 2 ? 10 : 14;
    const cards = Array.from({ length: cardCount }, (_, i) => ({ hasImage: i % 2 === 0, i }));
    const columns = splitToColumns(cards, numCols);
    return (
      <div className="px-4 lg:px-6 pt-3 pb-6 animate-pulse flex gap-6 items-start">
        {columns.map((colCards, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col gap-6 min-w-0">
            {colCards.map(({ hasImage, i }) => (
              <div key={i} className="bg-card rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 mb-2.5">
                      <div className="h-3 bg-muted/50 rounded w-24" />
                      <div className="h-3 bg-muted/30 rounded w-16" />
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className={`h-3 bg-muted/40 rounded ${contentWidths[i % contentWidths.length]}`} />
                      <div className="h-3 bg-muted/40 rounded w-5/6" />
                      {i % 3 !== 2 && <div className="h-3 bg-muted/30 rounded w-2/3" />}
                    </div>
                    {hasImage && <div className="h-32 bg-muted/20 rounded-xl mb-3" />}
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
