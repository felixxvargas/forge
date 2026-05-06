'use client';
import { Suspense } from 'react';
import { Profile } from '@/app/pages/Profile';
export default function Page() {
  return <Suspense><Profile /></Suspense>;
}
