import { Suspense } from 'react';
import { UserFlares } from '@/app/pages/UserFlares';

export function generateStaticParams() { return [{ userId: '_' }]; }

export default function Page() {
  return <Suspense><UserFlares /></Suspense>;
}
