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
      style={{ '--forge-glow-radius': `${radius}px` } as React.CSSProperties}
    >
      <span className="forge-glow-edge-light" />
      <div className="forge-glow-inner">
        {children}
      </div>
    </div>
  );
}
