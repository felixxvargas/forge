import { Suspense } from 'react';
import { CommunityDetail } from '@/app/pages/CommunityDetail';
import type { Metadata } from 'next';

export function generateStaticParams() { return [{ groupId: '_' }]; }

async function fetchGroup(groupId: string | undefined) {
  if (!groupId || groupId === '_') return null;
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
    const res = await fetch(
      `https://${projectId}.supabase.co/rest/v1/communities?id=eq.${encodeURIComponent(groupId)}&select=name,description,profile_picture,member_count&limit=1`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ groupId: string }> }
): Promise<Metadata> {
  const { groupId } = await params;
  const group = await fetchGroup(groupId);
  if (!group) return { title: 'Group | Forge' };
  const title = `${group.name} · Forge`;
  const description = group.member_count > 0
    ? `${(group.member_count as number).toLocaleString()} members · ${group.description || 'Join this group on Forge.'}`
    : (group.description || 'Join this group on Forge — the gaming social network.');
  const ogImageUrl = `/api/og?${new URLSearchParams({
    type: 'group',
    name: group.name,
    bio: (group.description ?? '').slice(0, 120),
    members: String(group.member_count ?? 0),
    ...(group.profile_picture ? { icon: group.profile_picture } : {}),
  })}`;
  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'Forge',
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Page() {
  return <Suspense><CommunityDetail /></Suspense>;
}
