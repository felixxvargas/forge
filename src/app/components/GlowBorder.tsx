'use client';

interface GlowBorderProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  radius?: number;
}

export function GlowBorder({ active, children, className = '', radius = 12 }: GlowBorderProps) {
  if (!active) return <>{children}</>;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ border: '1px solid hsl(55deg 70% 65% / 30%)', borderRadius: radius }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, hsl(38deg 75% 68% / 55%) 0%, transparent 70%)',
          filter: 'blur(24px)',
          animation: 'forge-glow-pulse 2.8s ease-in-out infinite',
          pointerEvents: 'none', zIndex: 0,
        } as React.CSSProperties}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
