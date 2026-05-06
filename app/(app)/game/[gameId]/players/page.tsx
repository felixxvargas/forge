'use client';
import { Suspense } from 'react';
import { GamePlayers } from '@/app/pages/GamePlayers';
export default function Page() {
  return <Suspense><GamePlayers /></Suspense>;
}
