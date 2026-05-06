'use client';
import { Suspense } from 'react';
import { AccountSettings } from '@/app/pages/AccountSettings';
export default function Page() {
  return <Suspense><AccountSettings /></Suspense>;
}
