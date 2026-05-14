import { Suspense } from 'react';
import { GameDetail } from '@/app/pages/GameDetail';

export default function Page() {
  return <Suspense><GameDetail /></Suspense>;
}
