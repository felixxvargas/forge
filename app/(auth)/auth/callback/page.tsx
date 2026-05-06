'use client';
import { Suspense } from 'react';
import { AuthCallback } from '@/app/pages/AuthCallback';
export default function Page() {
  return <Suspense><AuthCallback /></Suspense>;
}
