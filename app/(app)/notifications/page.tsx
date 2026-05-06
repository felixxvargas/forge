'use client';
import { Suspense } from 'react';
import { Notifications } from '@/app/pages/Notifications';
export default function Page() {
  return <Suspense><Notifications /></Suspense>;
}
