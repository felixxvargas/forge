import { Suspense } from 'react';
import { Profile } from '@/app/pages/Profile';
import type { Metadata } from 'next';

export const revalidate = 3600;

export function generateStaticParams() { return [{ handle: '_' }]; }

async function fetchProfile(handle: string | undefined) {
  if (!handle || handle === '_') return null;
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
    const stripped = handle.replace(/^@/, '');
    const url = `https://${projectId}.supabase.co/rest/v1/profiles?select=*&or=(handle.ilike.${stripped},handle.ilike.@${stripped})&limit=1`;
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
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchProfile(handle);
  if (!profile) return { title: handle && handle !== '_' ? `@${handle} | Forge` : 'Forge' };
  const stripped = (profile.handle ?? handle).replace(/^@/, '');
  const title = `${profile.display_name ?? handle} (@${stripped}) | Forge`;
  const ogImageUrl = `/api/og?${new URLSearchParams({
    name: profile.display_name ?? handle,
    handle: `@${stripped}`,
    ...(profile.bio ? { bio: profile.bio } : {}),
    ...(profile.profile_picture ? { avatar: profile.profile_picture } : {}),
  })}`;
  return {
    title,
    description: profile.bio ?? undefined,
    openGraph: {
      type: 'profile',
      siteName: 'Forge',
      title,
      description: profile.bio ?? undefined,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: profile.bio ?? undefined,
      images: [ogImageUrl],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const initialProfile = await fetchProfile(handle);
  return <Suspense><Profile initialProfile={initialProfile ?? undefined} /></Suspense>;
}
