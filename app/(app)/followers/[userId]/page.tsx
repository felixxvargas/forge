'use client';
import { Suspense } from 'react';
import { FollowersList } from '@/app/pages/FollowersList';
export default function Page() {
  return <Suspense><FollowersList /></Suspense>;
}
