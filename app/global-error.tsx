'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', background: '#0d0a14', color: '#f1f0f2' }}>
        <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Something went wrong</h1>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', background: '#E7FFC4', color: '#0d0a14', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', border: 'none' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
