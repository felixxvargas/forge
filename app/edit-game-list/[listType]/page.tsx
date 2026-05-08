'use client';
import { Suspense } from 'react';
import { EditGameList } from '@/app/pages/EditGameList';

export default function Page() {
  return (
    <Suspense>
      <EditGameList />
    </Suspense>
  );
}
