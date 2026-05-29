import { Suspense } from 'react';
import { EntityWikiPage } from '@/app/pages/EntityWikiPage';

export function generateStaticParams() { return [{ gameId: '_', entityId: '_' }]; }

export default function Page() {
  return <Suspense><EntityWikiPage /></Suspense>;
}
