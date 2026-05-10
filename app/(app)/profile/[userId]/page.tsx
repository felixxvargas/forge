import { Suspense } from 'react';
import { Profile } from '@/app/pages/Profile';
import type { Metadata } from 'next';

export function generateStaticParams() { return [{ userId: '_' }]; }

async function fetchProfile(userId: string | undefined) {
  if (!userId || userId === '_') return null;
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
    const url = `https://${projectId}.supabase.co/rest/v1/profiles?select=*&id=eq.${userId}&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ userId: string }> }
): Promise<Metadata> {
  const { userId } = await params;
  const profile = await fetchProfile(userId);
  if (!profile) return { title: 'Profile | Forge' };
  const handle = (profile.handle ?? '').replace(/^@/, '');
  return {
    title: `${profile.display_name ?? handle} (@${handle}) | Forge`,
    description: profile.bio ?? undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const initialProfile = await fetchProfile(userId);
  return <Suspense><Profile initialProfile={initialProfile ?? undefined} /></Suspense>;
}
