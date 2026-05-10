import { Suspense } from 'react';
import { FollowersList } from '@/app/pages/FollowersList';

export function generateStaticParams() { return [{ userId: '_' }]; }

export default function Page() {
  return <Suspense><FollowersList /></Suspense>;
}
