'use client';
import { Suspense } from 'react';
import { EntityWikiPage } from '@/app/pages/EntityWikiPage';

export default function Page() {
  return <Suspense><EntityWikiPage /></Suspense>;
}
