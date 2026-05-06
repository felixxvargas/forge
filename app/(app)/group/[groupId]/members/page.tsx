'use client';
import { Suspense } from 'react';
import { CommunityMembers } from '@/app/pages/CommunityMembers';
export default function Page() {
  return <Suspense><CommunityMembers /></Suspense>;
}
