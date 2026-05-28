'use client';

interface GlowBorderProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  /** Border radius in px — should match the inner element's rounded corner */
  radius?: number;
}

export function GlowBorder({ active, children, className = '', radius = 12 }: GlowBorderProps) {
  return (
    <div className={`relative ${className}`}>
      {active && (
        <div
          className="forge-glow-border absolute -inset-[1.5px]"
          style={{ borderRadius: `${radius + 1.5}px`, zIndex: 0 }}
          aria-hidden="true"
        />
      )}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
