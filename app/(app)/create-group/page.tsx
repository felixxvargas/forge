'use client';
import { Suspense } from 'react';
import { CreateGroup } from '@/app/pages/CreateGroup';
export default function Page() {
  return <Suspense><CreateGroup /></Suspense>;
}
