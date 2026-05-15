import { Suspense } from 'react';
import { GameDetail } from '@/app/pages/GameDetail';
import type { Metadata } from 'next';

export function generateStaticParams() { return [{ gameId: '_' }]; }

async function fetchGame(gameId: string | undefined) {
  if (!gameId || gameId === '_') return null;
  try {
    const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' };
    const [gameRes, artRes] = await Promise.all([
      fetch(`https://${projectId}.supabase.co/rest/v1/forge_games_17285bd7?id=eq.${encodeURIComponent(gameId)}&select=title,first_release_date&limit=1`, { headers }),
      fetch(`https://${projectId}.supabase.co/rest/v1/forge_game_artwork_17285bd7?game_id=eq.${encodeURIComponent(gameId)}&artwork_type=eq.cover&select=url&limit=1`, { headers }),
    ]);
    const [gameData, artData] = await Promise.all([gameRes.json(), artRes.json()]);
    const game = Array.isArray(gameData) && gameData.length > 0 ? gameData[0] : null;
    const art = Array.isArray(artData) && artData.length > 0 ? artData[0] : null;
    return game ? { ...game, coverUrl: art?.url ?? null } : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ gameId: string }> }
): Promise<Metadata> {
  const { gameId } = await params;
  const game = await fetchGame(gameId);
  if (!game) return { title: 'Game | Forge' };
  const year = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null;
  const title = `${game.title}${year ? ` (${year})` : ''} · Forge`;
  const description = `Check out ${game.title} on Forge — the gaming social network.`;
  const ogImageUrl = game.coverUrl ?? `/api/og?${new URLSearchParams({ type: 'game', name: game.title, ...(year ? { content: String(year) } : {}) })}`;
  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'Forge',
      title,
      description,
      images: [{ url: ogImageUrl, width: game.coverUrl ? 600 : 1200, height: game.coverUrl ? 800 : 630 }],
    },
    twitter: {
      card: game.coverUrl ? 'summary' : 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function Page() {
  return <Suspense><GameDetail /></Suspense>;
}
