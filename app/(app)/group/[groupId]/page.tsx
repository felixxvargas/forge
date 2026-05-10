import { Suspense } from 'react';
import { CommunityDetail } from '@/app/pages/CommunityDetail';

export function generateStaticParams() { return [{ groupId: '_' }]; }

export default function Page() {
  return <Suspense><CommunityDetail /></Suspense>;
}
