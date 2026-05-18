import { Suspense } from 'react';
import { SavedPosts } from '@/app/pages/SavedPosts';

export function generateStaticParams() { return [{}]; }

export default function Page() {
  return <Suspense><SavedPosts /></Suspense>;
}
