import { Suspense } from 'react';
import { FlareDetail } from '@/app/pages/FlareDetail';

export function generateStaticParams() { return [{ flareId: '_' }]; }

export default function Page() {
  return <Suspense><FlareDetail /></Suspense>;
}
