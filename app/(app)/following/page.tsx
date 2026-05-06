'use client';
import { Suspense } from 'react';
import { FollowingList } from '@/app/pages/FollowingList';
export default function Page() {
  return <Suspense><FollowingList /></Suspense>;
}
