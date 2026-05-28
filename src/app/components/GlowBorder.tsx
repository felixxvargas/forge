'use client';

interface GlowBorderProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  /** Border radius in px — should match the inner element's rounded corner */
  radius?: number;
}

export function GlowBorder({ active, children, className = '', radius = 12 }: GlowBorderProps) {
  if (!active) return <>{children}</>;
  return (
    <div
      className={`forge-glow-border ${className}`}
      style={{ padding: '1.5px', borderRadius: `${radius + 1.5}px` }}
    >
      <div style={{ borderRadius: `${radius}px`, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
