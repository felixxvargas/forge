import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Profile } from '@/app/pages/Profile';
import type { Metadata } from 'next';

export const revalidate = 3600;

export function generateStaticParams() { return [{ slug: '_' }]; }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchProfileByHandle(handle: string) {
  if (!handle || handle === '_') return null;
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
    const stripped = handle.replace(/^@/, '');
    const url = `https://${projectId}.supabase.co/rest/v1/profiles?select=*&or=(handle.ilike.${stripped},handle.ilike.@${stripped})&limit=1`;
    const res = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] ?? null;
  } catch { return null; }
}

async function fetchProfileByUserId(userId: string) {
  if (!userId || userId === '_') return null;
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
    const url = `https://${projectId}.supabase.co/rest/v1/profiles?select=*&id=eq.${userId}&limit=1`;
    const res = await fetch(url, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] ?? null;
  } catch { return null; }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const profile = UUID_RE.test(slug)
    ? await fetchProfileByUserId(slug)
    : await fetchProfileByHandle(slug);
  if (!profile) return { title: slug && slug !== '_' ? `@${slug} | Forge` : 'Forge' };
  const stripped = (profile.handle ?? slug).replace(/^@/, '');
  const title = `${profile.display_name ?? slug} (@${stripped}) | Forge`;
  const ogImageUrl = `/api/og?${new URLSearchParams({
    name: profile.display_name ?? slug,
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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug || slug === '_') redirect('/feed');

  // UUID — look up by ID, redirect to handle URL
  if (UUID_RE.test(slug)) {
    const profile = await fetchProfileByUserId(slug);
    if (profile?.handle) {
      redirect(`/profile/${(profile.handle as string).replace(/^@/, '')}`);
    }
    return <Suspense><Profile initialProfile={profile ?? undefined} /></Suspense>;
  }

  // Handle — render directly
  const initialProfile = await fetchProfileByHandle(slug);
  return <Suspense><Profile initialProfile={initialProfile ?? undefined} /></Suspense>;
}
