/**
 * Module-level ranking cache for top-1000 games on Forge.
 * Rankings are based on: post tags + unique list adds per game.
 * Fetched once and cached for 5 minutes.
 */
import { supabase } from './supabase';
import { gamesAPI } from './api';

export interface RankedGame {
  id: string;
  title: string;
  score: number;
  rank: number;
  cover: string | null;
  year?: number;
}

let rankedGames: RankedGame[] = [];
const rankMap = new Map<string, number>();
let lastFetched = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let loadPromise: Promise<RankedGame[]> | null = null;

export async function loadTrendingRankings(): Promise<RankedGame[]> {
  if (Date.now() - lastFetched < CACHE_TTL && rankedGames.length > 0) {
    return rankedGames;
  }
  // Deduplicate concurrent calls
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const [gamesRes, postRes, listRes] = await Promise.all([
        gamesAPI.listGames(1000, 0),
        supabase.from('posts').select('game_id').not('game_id', 'is', null),
        supabase.from('user_games').select('game_id, user_id'),
      ]);

      const games: any[] = Array.isArray(gamesRes) ? gamesRes : (gamesRes as any)?.games ?? [];

      const postCounts: Record<string, number> = {};
      for (const row of postRes.data ?? []) {
        if (row.game_id) postCounts[row.game_id] = (postCounts[row.game_id] ?? 0) + 1;
      }

      const listCounts: Record<string, number> = {};
      const byGame: Record<string, Set<string>> = {};
      for (const row of listRes.data ?? []) {
        if (!row.game_id) continue;
        if (!byGame[row.game_id]) byGame[row.game_id] = new Set();
        byGame[row.game_id].add(row.user_id);
      }
      for (const [gId, users] of Object.entries(byGame)) {
        listCounts[gId] = users.size;
      }

      const scored = games.map((g: any) => ({
        id: String(g.id),
        title: g.title,
        year: g.year,
        score: (postCounts[String(g.id)] ?? 0) + (listCounts[String(g.id)] ?? 0),
        cover: g.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
          ?? g.artwork?.[0]?.url
          ?? g.coverArt
          ?? null,
      }));

      scored.sort((a, b) => b.score - a.score || (b.year ?? 0) - (a.year ?? 0));

      rankedGames = scored.slice(0, 1000).map((g, i) => ({ ...g, rank: i + 1 }));
      rankMap.clear();
      for (const g of rankedGames) rankMap.set(g.id, g.rank);
      lastFetched = Date.now();
      return rankedGames;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/** Returns the rank (1-based) of a game if cached, else null. */
export function getGameRank(gameId: string): number | null {
  return rankMap.get(String(gameId)) ?? null;
}

export function getCachedRankings(): RankedGame[] {
  return rankedGames;
}
