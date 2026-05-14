'use client';

import { useEffect } from 'react';
import { ErrorScreen } from '@/app/components/ErrorScreen';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Forge error]', error);
  }, [error]);

  return <ErrorScreen error={error} reset={reset} />;
}
