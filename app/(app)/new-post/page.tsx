'use client';
import { Suspense } from 'react';
import { NewPost } from '@/app/pages/NewPost';
export default function Page() {
  return <Suspense><NewPost /></Suspense>;
}
