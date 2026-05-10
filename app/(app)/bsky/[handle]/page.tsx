import { Suspense } from 'react';
import { BlueskyProfilePage } from '@/app/pages/BlueskyProfilePage';

export function generateStaticParams() { return [{ handle: '_' }]; }

export default function Page() {
  return <Suspense><BlueskyProfilePage /></Suspense>;
}
