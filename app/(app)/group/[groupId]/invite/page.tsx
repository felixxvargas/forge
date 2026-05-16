import { Suspense } from 'react';
import { GroupInvite } from '@/app/pages/GroupInvite';

export function generateStaticParams() { return [{ groupId: '_' }]; }

export default function Page() {
  return <Suspense><GroupInvite /></Suspense>;
}
