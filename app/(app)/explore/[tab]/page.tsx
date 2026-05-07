import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Explore } from '@/app/pages/Explore';

const VALID_TABS = new Set(['posts', 'users', 'games', 'groups']);

export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!VALID_TABS.has(tab)) redirect('/explore');
  return <Suspense><Explore /></Suspense>;
}
