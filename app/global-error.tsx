'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Stale chunk from a previous deployment — reload silently instead of showing error UI
    const msg = error?.message ?? '';
    if (
      msg.includes('dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes("Cannot read properties of undefined (reading 'call')")
    ) {
      window.location.reload();
      return;
    }
    Sentry.captureException(error);
  }, [error]);

  const hasDetails = error?.message || error?.digest;

  return (
    <html lang="en" className="dark">
      <body style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', background: '#0d0a14', color: '#f1f0f2', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        {/* Glow */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 360, width: '100%' }}>
          {/* Anvil logo mark */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 48, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(231,255,196,0.4) 0%, rgba(167,139,250,0.35) 45%, transparent 70%)', filter: 'blur(18px)', transform: 'scale(3)', pointerEvents: 'none' }} />
              <svg viewBox="-1 -1 32 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', position: 'relative' }}>
                <path d="M23.3168 23.1893C23.174 23.6423 23.0854 23.9468 22.6499 23.9468C21.8526 23.9624 15.0233 23.9616 14.5619 23.9494C14.0802 23.9366 13.9313 23.6917 14.1127 22.9562C14.294 22.2207 14.4044 22.0416 13.336 22.0416C12.4854 22.0416 12.1756 22.0208 11.2042 22.0208C10.4301 22.0208 10.4341 22.0416 10.163 22.8243C9.97585 23.3647 9.95713 24 9.33328 24C8.51517 24 1.45421 24 0.673422 24C-0.248027 24 -0.00329824 23.1991 0.141902 22.7318C1.14299 19.5097 2.32954 15.6394 3.37756 12.1772C3.56349 11.5629 3.61803 11.1504 5.75938 10.704C7.90072 10.2576 7.66381 10.2154 9.77344 9.73687C11.317 9.38668 11.2998 9.27085 11.5416 8.44507C12.1336 6.42287 11.5416 8.44507 12.1336 6.42287C12.3377 5.72591 12.1484 5.62541 9.77344 5.28711C8.81228 5.15022 9.82291 5.29026 7.64084 4.94895C5.45881 4.60765 5.27506 4.61079 5.37426 4.06278C5.44308 3.68264 6.1701 0.908732 6.28084 0.626812C6.55427 -0.0636058 6.65486 0.00164845 9.54312 0.00164974C15.1159 0.00165223 21.814 0.00164974 27.3775 0.00164974C30.1385 0.00164974 30.1681 0.0016497 29.8818 0.978496C29.2614 3.09538 29.8818 0.978496 29.0652 3.76493C28.7059 4.99088 27.5661 4.99903 25.2803 5.32093C22.0446 5.77664 25.2803 5.32093 22.0446 5.77664C20.5928 5.98109 20.688 6.00356 20.3954 6.90982C20.1027 7.8161 20.1551 7.89047 19.8939 8.81026C19.7329 9.37761 19.6725 9.78949 20.8896 10.1088C23.1583 10.704 24.8256 11.1369 25.7852 11.3803C26.7448 11.6238 26.4629 12.5701 26.2523 13.3281C26.0417 14.086 23.9565 21.1603 23.3168 23.1893Z" fill="#E7FFC4" />
              </svg>
            </div>
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: '0.875rem', color: '#9792a4', marginBottom: 32, lineHeight: 1.6 }}>
            We hit an unexpected snag. Try again — if it keeps happening, our team has been notified.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={reset}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 44, background: '#E7FFC4', color: '#0d0a14', borderRadius: 12, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', border: 'none' }}
            >
              Try again
            </button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => window.history.back()}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: '#1e1827', color: '#f1f0f2', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', border: '1px solid #2a2236' }}
              >
                Go back
              </button>
              <a
                href="/feed"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: '#1e1827', color: '#f1f0f2', borderRadius: 12, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', border: '1px solid #2a2236' }}
              >
                Home
              </a>
            </div>
          </div>

          {hasDetails && (
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto', fontSize: '0.75rem', color: 'rgba(151,146,164,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                Technical details
              </button>
              {expanded && (
                <div style={{ marginTop: 12, textAlign: 'left', borderRadius: 12, border: '1px solid #2a2236', background: 'rgba(255,255,255,0.03)', padding: 16, fontSize: '0.75rem', fontFamily: 'monospace', color: '#9792a4', wordBreak: 'break-all' }}>
                  {error?.message && <p style={{ margin: 0 }}>{error.message}</p>}
                  {error?.digest && <p style={{ margin: '8px 0 0', opacity: 0.5 }}>Error ID: {error.digest}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
