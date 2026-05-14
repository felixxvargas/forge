import { Suspense } from 'react';
import { GameDetail } from '@/app/pages/GameDetail';

export function generateStaticParams() { return [{ gameId: '_' }]; }

export default function Page() {
  return <Suspense><GameDetail /></Suspense>;
}
