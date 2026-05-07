import { cn } from './utils';

interface BetaTagProps {
  size?: 'sm' | 'default';
  className?: string;
}

export function BetaTag({ size = 'default', className }: BetaTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold tracking-widest uppercase bg-accent/15 text-accent',
        size === 'default' ? 'px-2.5 py-1 text-xs' : 'px-1.5 py-1 text-[9px] leading-none',
        className,
      )}
    >
      Beta
    </span>
  );
}
