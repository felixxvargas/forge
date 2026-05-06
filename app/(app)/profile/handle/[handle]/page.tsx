import { Suspense } from 'react';
import { Profile } from '@/app/pages/Profile';
import type { Metadata } from 'next';
import { createSupabaseServer } from '@/app/utils/supabase-server';

async function fetchProfile(handle: string) {
  try {
    const supabase = await createSupabaseServer();
    const stripped = handle.replace(/^@/, '');
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`handle.ilike.${stripped},handle.ilike.@${stripped}`)
      .limit(1)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchProfile(handle);
  if (!profile) return { title: `@${handle} | Forge` };
  const stripped = (profile.handle ?? handle).replace(/^@/, '');
  return {
    title: `${profile.display_name ?? handle} (@${stripped}) | Forge`,
    description: profile.bio ?? undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const initialProfile = await fetchProfile(handle);
  return <Suspense><Profile initialProfile={initialProfile ?? undefined} /></Suspense>;
}
