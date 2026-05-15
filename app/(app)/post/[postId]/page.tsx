import { Suspense } from 'react';
import { PostDetail } from '@/app/pages/PostDetail';
import type { Metadata } from 'next';

export const revalidate = 3600;

export function generateStaticParams() { return [{ postId: '_' }]; }

async function fetchPost(postId: string | undefined) {
  if (!postId || postId === '_') return null;
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
    const url = `https://${projectId}.supabase.co/rest/v1/posts?select=*,author:profiles!user_id(id,display_name,handle,profile_picture,bio)&id=eq.${postId}&limit=1`;
    const res = await fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data[0]) return null;
    return data[0];
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ postId: string }> }
): Promise<Metadata> {
  const { postId } = await params;
  const post = await fetchPost(postId);
  if (!post) return { title: 'Post | Forge' };
  const author = (post.author as any)?.display_name ?? 'Forge user';
  const authorHandle = (post.author as any)?.handle ?? '';
  const snippet = (post.content ?? '').slice(0, 150);
  const images: string[] = Array.isArray(post.images) ? post.images : [];
  const firstImage = images.find((img: string) => img && !img.endsWith('.mp4') && !img.endsWith('.webm'));
  const ogImageUrl = firstImage ?? `/api/og?${new URLSearchParams({ type: 'post', content: (post.content ?? '').slice(0, 300), author, handle: authorHandle ? `@${authorHandle.replace(/^@/, '')}` : '' })}`;
  const title = `${author} on Forge`;
  return {
    title,
    description: snippet || undefined,
    openGraph: {
      type: 'article',
      siteName: 'Forge',
      title,
      description: snippet || undefined,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: snippet || undefined,
      images: [ogImageUrl],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const initialPost = await fetchPost(postId);
  return <Suspense><PostDetail initialPost={initialPost ?? undefined} /></Suspense>;
}
