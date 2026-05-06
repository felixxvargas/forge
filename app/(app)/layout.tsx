'use client';
import { Layout } from '@/app/components/Layout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}
