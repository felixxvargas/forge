import { Suspense } from 'react';
import { CommunityMembers } from '@/app/pages/CommunityMembers';

export function generateStaticParams() { return [{ groupId: '_' }]; }

export default function Page() {
  return <Suspense><CommunityMembers /></Suspense>;
}
