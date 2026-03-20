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
          background: '#1C1228',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          }}
        />

        {/* Lightning bolt SVG */}
        <svg
          width="90"
          height="90"
          viewBox="0 0 24 24"
          fill="#7C3AED"
          style={{ marginBottom: '24px', filter: 'drop-shadow(0 0 24px rgba(124,58,237,0.7))' }}
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            fontSize: '96px',
            fontWeight: '800',
            color: 'white',
            letterSpacing: '-3px',
            lineHeight: 1,
            marginBottom: '16px',
          }}
        >
          Forge
        </div>

        {/* Accent underline */}
        <div
          style={{
            width: '80px',
            height: '4px',
            background: '#84CC16',
            borderRadius: '2px',
            marginBottom: '20px',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.5px',
          }}
        >
          Gaming Social Network
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
