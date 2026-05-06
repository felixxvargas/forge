'use client';
import { Suspense } from 'react';
import { GameLists } from '@/app/pages/GameLists';
export default function Page() {
  return <Suspense><GameLists /></Suspense>;
}
