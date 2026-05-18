'use client';

import { useEffect } from 'react';
import { ErrorScreen } from '@/app/components/ErrorScreen';

function isChunkLoadError(error: Error): boolean {
  return (
    error.message.includes('dynamically imported module') ||
    error.message.includes('Importing a module script') ||
    error.name === 'ChunkLoadError'
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      // Stale chunk after a deploy — hard reload to fetch current bundles.
      window.location.reload();
      return;
    }
    console.error('[Forge error]', error);
  }, [error]);

  return <ErrorScreen error={error} reset={reset} />;
}
