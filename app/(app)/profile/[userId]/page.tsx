import { Suspense } from 'react';
import { Profile } from '@/app/pages/Profile';
import type { Metadata } from 'next';
import { createSupabaseServer } from '@/app/utils/supabase-server';

async function fetchProfile(userId: string) {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data ?? null;
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
