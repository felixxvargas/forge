'use client';
import { Suspense } from 'react';
import { BlueskyProfilePage } from '@/app/pages/BlueskyProfilePage';
export default function Page() {
  return <Suspense><BlueskyProfilePage /></Suspense>;
}
