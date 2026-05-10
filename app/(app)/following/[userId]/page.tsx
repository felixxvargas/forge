import { Suspense } from 'react';
import { FollowingList } from '@/app/pages/FollowingList';

export function generateStaticParams() { return [{ userId: '_' }]; }

export default function Page() {
  return <Suspense><FollowingList /></Suspense>;
}
