'use client';
import { Suspense } from 'react';
import { UserCommunities } from '@/app/pages/UserCommunities';
export default function Page() {
  return <Suspense><UserCommunities /></Suspense>;
}
