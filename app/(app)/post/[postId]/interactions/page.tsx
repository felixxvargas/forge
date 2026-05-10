import { Suspense } from 'react';
import { PostInteractions } from '@/app/pages/PostInteractions';

export function generateStaticParams() { return [{ postId: '_' }]; }

export default function Page() {
  return <Suspense><PostInteractions /></Suspense>;
}
