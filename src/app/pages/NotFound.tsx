import { ErrorScreen } from '@/app/components/ErrorScreen';

export function NotFound() {
  return (
    <ErrorScreen
      is404
      title="Page not found"
      description="This page doesn't exist or may have been moved."
    />
  );
}
