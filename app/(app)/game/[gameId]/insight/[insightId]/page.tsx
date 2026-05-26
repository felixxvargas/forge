import { Suspense } from 'react';
import { InsightDetail } from '@/app/pages/InsightDetail';

export function generateStaticParams() { return [{ gameId: '_', insightId: '_' }]; }

export default function Page() {
  return <Suspense><InsightDetail /></Suspense>;
}
