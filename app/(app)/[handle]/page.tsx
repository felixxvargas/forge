import { redirect } from 'next/navigation';

export function generateStaticParams() { return [{ handle: '_' }]; }

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!handle || handle === '_') redirect('/feed');
  redirect(`/profile/${handle.replace(/^@/, '')}`);
}
