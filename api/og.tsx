import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'hsl(270 50% 6%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow behind the icon */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(132,204,22,0.12) 0%, transparent 65%)',
          }}
        />

        {/* Zap icon — matches login screen */}
        <div
          style={{
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
          }}
        >
          <svg
            width="100"
            height="100"
            viewBox="0 0 24 24"
            fill="#84CC16"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: '88px',
            fontWeight: '800',
            color: 'white',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: '20px',
          }}
        >
          Forge
        </div>

        {/* Tagline — matches login subtitle */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.2px',
          }}
        >
          Your gaming social network awaits
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
