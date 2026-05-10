import { Suspense } from 'react';
import { GameLists } from '@/app/pages/GameLists';

export function generateStaticParams() { return [{ gameId: '_' }]; }

export default function Page() {
  return <Suspense><GameLists /></Suspense>;
}
