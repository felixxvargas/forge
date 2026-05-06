'use client';
import { Suspense } from 'react';
import { Messages } from '@/app/pages/Messages';
export default function Page() {
  return <Suspense><Messages /></Suspense>;
}
