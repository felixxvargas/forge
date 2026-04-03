/**
 * Module-level ranking cache for top-1000 games on Forge.
 * Rankings are based on: post tags + unique list adds per game.
 * Fetched once and cached for 5 minutes.
 *
 * Scores are derived directly from Supabase activity tables so every game
 * with any activity gets a rank — regardless of paginated listGames limits.
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
let rankMapPromise: Promise<void> | null = null;

/**
 * Fast path: only computes the rank map (no game detail fetch).
 * Use this in GameDetail so the rank shows immediately without waiting
 * for the cover-art batch fetch that loadTrendingRankings requires.
 */
export async function loadRankMapOnly(): Promise<void> {
  if (rankMap.size > 0 && Date.now() - lastFetched < CACHE_TTL) return;
  if (rankMapPromise) return rankMapPromise;
  if (loadPromise) { await loadPromise; return; }

  rankMapPromise = (async () => {
    try {
      const [postRes, listRes] = await Promise.all([
        supabase.from('posts').select('game_id').not('game_id', 'is', null),
        supabase.from('user_games').select('game_id, user_id'),
      ]);
      const scoredMap: Record<string, number> = {};
      for (const row of postRes.data ?? []) {
        if (row.game_id) scoredMap[row.game_id] = (scoredMap[row.game_id] ?? 0) + 1;
      }
      const byGame: Record<string, Set<string>> = {};
      for (const row of listRes.data ?? []) {
        if (!row.game_id) continue;
        if (!byGame[row.game_id]) byGame[row.game_id] = new Set();
        byGame[row.game_id].add(row.user_id);
      }
      for (const [gId, users] of Object.entries(byGame)) {
        scoredMap[gId] = (scoredMap[gId] ?? 0) + users.size;
      }
      const sorted = Object.entries(scoredMap)
        .filter(([, s]) => s > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 1000);
      rankMap.clear();
      sorted.forEach(([id], i) => rankMap.set(id, i + 1));
      lastFetched = Date.now();
    } finally {
      rankMapPromise = null;
    }
  })();
  return rankMapPromise;
}

export async function loadTrendingRankings(): Promise<RankedGame[]> {
  if (Date.now() - lastFetched < CACHE_TTL && rankedGames.length > 0) {
    return rankedGames;
  }
  // Deduplicate concurrent calls
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const [postRes, listRes] = await Promise.all([
        supabase.from('posts').select('game_id').not('game_id', 'is', null),
        supabase.from('user_games').select('game_id, user_id'),
      ]);

      // Compute scores per game from activity data
      const scoredMap: Record<string, number> = {};
      for (const row of postRes.data ?? []) {
        if (row.game_id) scoredMap[row.game_id] = (scoredMap[row.game_id] ?? 0) + 1;
      }
      const byGame: Record<string, Set<string>> = {};
      for (const row of listRes.data ?? []) {
        if (!row.game_id) continue;
        if (!byGame[row.game_id]) byGame[row.game_id] = new Set();
        byGame[row.game_id].add(row.user_id);
      }
      for (const [gId, users] of Object.entries(byGame)) {
        scoredMap[gId] = (scoredMap[gId] ?? 0) + users.size;
      }

      // Sort all active game IDs by score descending, take top 1000
      const sorted = Object.entries(scoredMap)
        .filter(([, s]) => s > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 1000);

      // Build rank map immediately so getGameRank() is available before game detail fetch
      rankMap.clear();
      sorted.forEach(([id], i) => rankMap.set(id, i + 1));

      // Batch-fetch game details for TrendingGames display (top 100 at most)
      const top100Ids = sorted.slice(0, 100).map(([id]) => id);
      let gamesData: Record<string, any> = {};
      if (top100Ids.length > 0) {
        try {
          const batch: any = await gamesAPI.getGames(top100Ids);
          const list: any[] = Array.isArray(batch) ? batch : batch?.games ?? [];
          for (const g of list) {
            if (g?.id != null) gamesData[String(g.id)] = g;
          }
        } catch {
          // Details unavailable — ranks still work, display will show IDs
        }
      }

      rankedGames = sorted.map(([id, score], i) => {
        const g = gamesData[id];
        return {
          id,
          title: g?.title ?? '',
          year: g?.year ?? g?.release_year,
          score,
          rank: i + 1,
          cover: g?.artwork?.find((a: any) => a.artwork_type === 'cover')?.url
            ?? g?.artwork?.[0]?.url
            ?? g?.coverArt
            ?? null,
        };
      });

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
