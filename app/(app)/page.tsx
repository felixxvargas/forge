'use client';
import { Suspense } from 'react';
import { Feed } from '@/app/pages/Feed';
export default function Page() {
  return <Suspense><Feed /></Suspense>;
}
