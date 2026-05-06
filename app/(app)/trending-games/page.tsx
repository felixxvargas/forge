'use client';
import { Suspense } from 'react';
import { TrendingGames } from '@/app/pages/TrendingGames';
export default function Page() {
  return <Suspense><TrendingGames /></Suspense>;
}
