import { Suspense } from 'react';
import { PostDetail } from '@/app/pages/PostDetail';
import type { Metadata } from 'next';
import { createSupabaseServer } from '@/app/utils/supabase-server';

async function fetchPost(postId: string) {
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(id, display_name, handle, profile_picture, bio)')
      .eq('id', postId)
      .single();
    if (!data) return null;
    return { ...data, author: data.profiles };
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
  const snippet = (post.content ?? '').slice(0, 150);
  return {
    title: `${author} on Forge`,
    description: snippet || undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const initialPost = await fetchPost(postId);
  return <Suspense><PostDetail initialPost={initialPost ?? undefined} /></Suspense>;
}
