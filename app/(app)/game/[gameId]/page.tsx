import { Suspense } from 'react';
import { GameDetail } from '@/app/pages/GameDetail';

export const revalidate = 3600;

export function generateStaticParams() { return [{ gameId: '_' }]; }

export default function Page() {
  return <Suspense><GameDetail /></Suspense>;
}
