'use client';
import { useRef, useState, useEffect } from 'react';

interface GlowBorderProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  radius?: number;
}

function makeRoundedRectPath(w: number, h: number, r: number): string {
  const cr = Math.min(r, w / 2, h / 2);
  return [
    `M ${cr},0`,
    `H ${w - cr}`,
    `Q ${w},0 ${w},${cr}`,
    `V ${h - cr}`,
    `Q ${w},${h} ${w - cr},${h}`,
    `H ${cr}`,
    `Q 0,${h} 0,${h - cr}`,
    `V ${cr}`,
    `Q 0,0 ${cr},0`,
    'Z',
  ].join(' ');
}

export function GlowBorder({ active, children, className = '', radius = 12 }: GlowBorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [orbitPath, setOrbitPath] = useState('');

  useEffect(() => {
    if (!active) { setOrbitPath(''); return; }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setOrbitPath(makeRoundedRectPath(width, height, radius));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active, radius]);

  if (!active) return <>{children}</>;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ border: '1px solid hsl(55deg 70% 65% / 30%)', borderRadius: radius }}
    >
      {orbitPath && (
        <span
          aria-hidden
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, borderRadius: radius }}
        >
          <span style={{
            display: 'block', width: 20, height: 20, borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(38deg 75% 68% / 70%) 0%, transparent 70%)',
            filter: 'blur(5px)',
            offsetPath: `path("${orbitPath}")`,
            offsetAnchor: '50% 50%',
            offsetRotate: '0deg',
            animation: 'forge-orbit 2.5s linear infinite',
            animationDelay: '-0.3s',
          } as React.CSSProperties} />
          <span style={{
            display: 'block', width: 12, height: 12, borderRadius: '50%',
            background: 'radial-gradient(circle, hsl(82deg 80% 85%) 0%, hsl(38deg 75% 68%) 55%, transparent 100%)',
            filter: 'blur(2.5px)',
            offsetPath: `path("${orbitPath}")`,
            offsetAnchor: '50% 50%',
            offsetRotate: '0deg',
            animation: 'forge-orbit 2.5s linear infinite',
          } as React.CSSProperties} />
        </span>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
