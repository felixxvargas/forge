'use client';
import { Suspense } from 'react';
import { NotFound } from '@/app/pages/NotFound';
export default function Page() {
  return <Suspense><NotFound /></Suspense>;
}
