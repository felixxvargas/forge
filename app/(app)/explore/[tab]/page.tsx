import { Suspense } from 'react';
import { Explore } from '@/app/pages/Explore';

export function generateStaticParams() { return [{ tab: '_' }]; }

export default function Page() {
  return <Suspense><Explore /></Suspense>;
}
