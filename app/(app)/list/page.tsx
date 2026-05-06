'use client';
import { Suspense } from 'react';
import { ListView } from '@/app/pages/ListView';
export default function Page() {
  return <Suspense><ListView /></Suspense>;
}
