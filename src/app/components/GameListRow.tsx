import { cn } from './ui/utils';

interface GameListRowProps {
  children: React.ReactNode;
  /** Horizontal inset matching profile section padding (default). False inside padded cards (e.g. LFG). */
  inset?: boolean;
  className?: string;
  gap?: '2' | '3';
}

/**
 * Shared horizontal row for portrait game cards (profile lists, top games, etc.).
 * overflow-visible avoids clipping hover/scale and keeps stacked lists from fighting
 * scroll containers on mobile; use on every profile-style game strip.
 */
export function GameListRow({ children, inset = true, className, gap = '3' }: GameListRowProps) {
  return (
    <div
      className={cn(
        'flex pb-2 overflow-visible scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
        gap === '2' ? 'gap-2' : 'gap-3',
        inset && 'px-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
