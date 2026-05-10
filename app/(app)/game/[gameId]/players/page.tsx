import { Suspense } from 'react';
import { GamePlayers } from '@/app/pages/GamePlayers';

export function generateStaticParams() { return [{ gameId: '_' }]; }

export default function Page() {
  return <Suspense><GamePlayers /></Suspense>;
}
