import { Suspense } from 'react';
import { VIPList } from '@/app/pages/VIPList';

export function generateStaticParams() { return [{}]; }

export default function Page() {
  return <Suspense><VIPList /></Suspense>;
}
