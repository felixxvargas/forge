import { Suspense } from 'react';
import { EditGameList } from '@/app/pages/EditGameList';

export function generateStaticParams() { return [{ listType: '_' }]; }

export default function Page() {
  return (
    <Suspense>
      <EditGameList />
    </Suspense>
  );
}
