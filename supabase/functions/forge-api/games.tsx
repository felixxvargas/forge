import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface GameData {
  id: string;
  title: string;
  igdb_id?: number;
  year?: number;
  description?: string;
  genres?: string[];
  platforms?: string[];
  parent_game_id?: string | null;
  game_category?: number | null;
}

interface ArtworkData {
  game_id: string;
  artwork_type: 'cover' | 'screenshot' | 'banner';
  url: string;
  platform?: string;
  width?: number;
  height?: number;
}

/**
 * Get a game by ID
 */
export async function getGame(gameId: string) {
  const { data, error } = await supabase
    .from('forge_games_17285bd7')
    .select(`
      *,
      artwork:forge_game_artwork_17285bd7(*)
    `)
    .eq('id', gameId)
    .single();

  if (error) {
    console.error('Error fetching game:', error);
    throw new Error(`Failed to fetch game: ${error.message}`);
  }

  return data;
}

/**
 * List games (popular first, ordered by ID which reflects IGDB rating order)
 */
export async function listGames(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('forge_games_17285bd7')
    .select(`
      *,
      artwork:forge_game_artwork_17285bd7(*)
    `)
    .or('hidden.is.null,hidden.eq.false')
    .order('id')
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error listing games:', error);
    throw new Error(`Failed to list games: ${error.message}`);
  }

  return data;
}

/**
 * Search games by title — searches local DB first, then falls through to IGDB
 * for any titles not yet in the database (covers retro/handheld games etc.).
 */
export async function searchGames(query: string, limit = 20) {
  const { data: localData, error } = await supabase
    .from('forge_games_17285bd7')
    .select(`*, artwork:forge_game_artwork_17285bd7(*)`)
    .ilike('title', `%${query}%`)
    .or('hidden.is.null,hidden.eq.false')
    .order('title')
    .limit(limit);

  if (error) {
    console.error('Error searching games:', error);
    throw new Error(`Failed to search games: ${error.message}`);
  }

  const local = localData ?? [];

  // If we have enough local results, return early
  if (local.length >= limit) return local;

  // Fall through to IGDB to fill the gap
  try {
    const clientId = Deno.env.get('IGDB_CLIENT_ID');
    const clientSecret = Deno.env.get('IGDB_CLIENT_SECRET');
    if (!clientId || !clientSecret) return local;

    const accessToken = await getIGDBAccessToken();

    // Fetch more results than needed so we can deduplicate
    const igdbLimit = Math.min(limit * 2, 50);
    const body = `
      search "${query}";
      fields name, summary, first_release_date, genres.name, platforms.name, cover.image_id;
      limit ${igdbLimit};
    `;

    const res = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      body,
    });

    if (!res.ok) return local;
    const igdbGames = await res.json() as any[];

    const localIds = new Set(local.map(g => `igdb-${(g as any).igdb_id}`));
    const toInsert = igdbGames.filter(g => !localIds.has(`igdb-${g.id}`));

    const newGames: any[] = [];
    for (const g of toInsert) {
      try {
        const gameId = `igdb-${g.id}`;
        const coverUrl = g.cover?.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
          : null;
        const year = g.first_release_date
          ? new Date(g.first_release_date * 1000).getFullYear()
          : null;

        const { data: upserted } = await supabase
          .from('forge_games_17285bd7')
          .upsert({
            id: gameId,
            title: g.name,
            igdb_id: g.id,
            year,
            description: g.summary ?? null,
            genres: g.genres?.map((x: any) => x.name) ?? [],
            platforms: g.platforms?.map((x: any) => x.name) ?? [],
          }, { onConflict: 'id', ignoreDuplicates: true })
          .select()
          .single();

        if (coverUrl && upserted) {
          await supabase
            .from('forge_game_artwork_17285bd7')
            .upsert({ game_id: gameId, artwork_type: 'cover', url: coverUrl }, { onConflict: 'game_id,artwork_type', ignoreDuplicates: true });
          newGames.push({ ...upserted, artwork: [{ artwork_type: 'cover', url: coverUrl }] });
        } else if (upserted) {
          newGames.push({ ...upserted, artwork: [] });
        }
      } catch (_e) {
        // skip individual failures
      }
    }

    // Merge and return up to limit
    return [...local, ...newGames].slice(0, limit);
  } catch (_e) {
    // IGDB fallthrough failure — return local only
    return local;
  }
}

/**
 * Get multiple games by IDs
 */
export async function getGames(gameIds: string[]) {
  const { data, error } = await supabase
    .from('forge_games_17285bd7')
    .select(`
      *,
      artwork:forge_game_artwork_17285bd7(*)
    `)
    .in('id', gameIds);

  if (error) {
    console.error('Error fetching games:', error);
    throw new Error(`Failed to fetch games: ${error.message}`);
  }

  return data;
}

/**
 * Create or update a game
 */
export async function upsertGame(gameData: GameData) {
  const { data, error } = await supabase
    .from('forge_games_17285bd7')
    .upsert(gameData, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting game:', error);
    throw new Error(`Failed to upsert game: ${error.message}`);
  }

  return data;
}

/**
 * Add artwork for a game
 */
export async function addGameArtwork(artworkData: ArtworkData) {
  const { data, error } = await supabase
    .from('forge_game_artwork_17285bd7')
    .insert(artworkData)
    .select()
    .single();

  if (error) {
    console.error('Error adding artwork:', error);
    throw new Error(`Failed to add artwork: ${error.message}`);
  }

  return data;
}

/**
 * Get artwork for a game
 */
export async function getGameArtwork(gameId: string, artworkType?: string) {
  let query = supabase
    .from('forge_game_artwork_17285bd7')
    .select('*')
    .eq('game_id', gameId);

  if (artworkType) {
    query = query.eq('artwork_type', artworkType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching artwork:', error);
    throw new Error(`Failed to fetch artwork: ${error.message}`);
  }

  return data;
}

/**
 * Get games with similar genres (for "Similar Games" module)
 */
export async function getSimilarGames(gameId: string, genres: string[], limit = 8) {
  if (genres.length === 0) {
    // Fallback: just return some recent games
    const { data } = await supabase
      .from('forge_games_17285bd7')
      .select('*, artwork:forge_game_artwork_17285bd7(*)')
      .neq('id', gameId)
      .or('hidden.is.null,hidden.eq.false')
      .order('year', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  // Try matching on first genre
  const { data } = await supabase
    .from('forge_games_17285bd7')
    .select('*, artwork:forge_game_artwork_17285bd7(*)')
    .contains('genres', [genres[0]])
    .neq('id', gameId)
    .or('hidden.is.null,hidden.eq.false')
    .order('year', { ascending: false })
    .limit(limit);

  if ((data ?? []).length >= 3) return data ?? [];

  // Fallback: second genre or keyword match on title
  const { data: fallback } = await supabase
    .from('forge_games_17285bd7')
    .select('*, artwork:forge_game_artwork_17285bd7(*)')
    .neq('id', gameId)
    .or('hidden.is.null,hidden.eq.false')
    .order('year', { ascending: false })
    .limit(limit);
  return fallback ?? [];
}

/**
 * Get other platform versions of a game (same/similar title, different entries)
 */
export async function getGameVersions(gameId: string, title: string, limit = 6) {
  // Use first 2-3 significant words of the title
  const words = title
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3)
    .join(' ');

  if (!words) return [];

  const { data } = await supabase
    .from('forge_games_17285bd7')
    .select('*, artwork:forge_game_artwork_17285bd7(*)')
    .ilike('title', `%${words}%`)
    .neq('id', gameId)
    .or('hidden.is.null,hidden.eq.false')
    .limit(limit);
  return data ?? [];
}

/**
 * Upsert a game fetched from IGDB into the local DB and return it with artwork.
 */
async function upsertIGDBGame(g: any): Promise<any> {
  const gameId = `igdb-${g.id}`;
  const coverUrl = g.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
    : null;
  const year = g.first_release_date
    ? new Date(g.first_release_date * 1000).getFullYear()
    : null;

  const { data: upserted } = await supabase
    .from('forge_games_17285bd7')
    .upsert({
      id: gameId,
      title: g.name,
      igdb_id: g.id,
      year,
      description: g.summary ?? null,
      genres: g.genres?.map((x: any) => x.name) ?? [],
      platforms: g.platforms?.map((x: any) => x.name) ?? [],
      game_category: g.category ?? null,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (coverUrl && upserted) {
    await supabase
      .from('forge_game_artwork_17285bd7')
      .upsert({ game_id: gameId, artwork_type: 'cover', url: coverUrl }, { onConflict: 'game_id,artwork_type', ignoreDuplicates: true });
    return { ...upserted, artwork: [{ artwork_type: 'cover', url: coverUrl }] };
  }
  return upserted ? { ...upserted, artwork: [] } : null;
}

/**
 * Get expansions of a game, and (if this game is an expansion) its parent game.
 * Uses IGDB when available; falls back to DB-only for games without an igdb_id.
 */
export async function getExpansions(gameId: string): Promise<{ expansions: any[]; parentGame: any | null }> {
  const { data: dbGame } = await supabase
    .from('forge_games_17285bd7')
    .select('*, artwork:forge_game_artwork_17285bd7(*)')
    .eq('id', gameId)
    .single();

  if (!dbGame) return { expansions: [], parentGame: null };

  // Check DB-stored relationships first
  const { data: dbExpansions } = await supabase
    .from('forge_games_17285bd7')
    .select('*, artwork:forge_game_artwork_17285bd7(*)')
    .eq('parent_game_id', gameId)
    .or('hidden.is.null,hidden.eq.false');

  let parentGame: any | null = null;
  if (dbGame.parent_game_id) {
    const { data: p } = await supabase
      .from('forge_games_17285bd7')
      .select('*, artwork:forge_game_artwork_17285bd7(*)')
      .eq('id', dbGame.parent_game_id)
      .single();
    parentGame = p ?? null;
  }

  if (dbExpansions && dbExpansions.length > 0 && (parentGame || !dbGame.parent_game_id)) {
    return { expansions: dbExpansions ?? [], parentGame };
  }

  // Fall through to IGDB for richer data
  const igdbId = dbGame.igdb_id;
  if (!igdbId) return { expansions: dbExpansions ?? [], parentGame };

  try {
    const clientId = Deno.env.get('IGDB_CLIENT_ID');
    const clientSecret = Deno.env.get('IGDB_CLIENT_SECRET');
    if (!clientId || !clientSecret) return { expansions: dbExpansions ?? [], parentGame };

    const accessToken = await getIGDBAccessToken();
    const headers = {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    };

    // Fetch the game itself to get category + parent_game
    const selfRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers,
      body: `fields category, parent_game; where id = ${igdbId};`,
    });
    const [selfData] = selfRes.ok ? (await selfRes.json() as any[]) : [null];

    const category = selfData?.category ?? null;
    const igdbParentId = selfData?.parent_game ?? null;

    // Update local record with category
    if (category !== null && category !== dbGame.game_category) {
      await supabase
        .from('forge_games_17285bd7')
        .update({ game_category: category })
        .eq('id', gameId);
    }

    // Fetch parent game from IGDB if this is an expansion
    if (igdbParentId && !parentGame) {
      const parentRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers,
        body: `fields name, summary, first_release_date, genres.name, platforms.name, cover.image_id, category; where id = ${igdbParentId};`,
      });
      if (parentRes.ok) {
        const [parentData] = (await parentRes.json()) as any[];
        if (parentData) {
          const upserted = await upsertIGDBGame(parentData);
          if (upserted) {
            // Link parent_game_id on the current game
            await supabase
              .from('forge_games_17285bd7')
              .update({ parent_game_id: upserted.id })
              .eq('id', gameId);
            parentGame = upserted;
          }
        }
      }
    }

    // Fetch expansions of this game from IGDB (category 2=expansion, 4=standalone_expansion)
    const expansionsRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers,
      body: `fields name, summary, first_release_date, genres.name, platforms.name, cover.image_id, category, parent_game; where parent_game = ${igdbId} & category = (2, 4); limit 20;`,
    });
    const igdbExpansions: any[] = expansionsRes.ok ? (await expansionsRes.json()) : [];

    const upsertedExpansions: any[] = [];
    for (const exp of igdbExpansions) {
      try {
        const upserted = await upsertIGDBGame(exp);
        if (upserted) {
          // Set parent_game_id on the expansion
          await supabase
            .from('forge_games_17285bd7')
            .update({ parent_game_id: gameId, game_category: exp.category ?? null })
            .eq('id', upserted.id);
          upsertedExpansions.push(upserted);
        }
      } catch { /* skip */ }
    }

    return {
      expansions: upsertedExpansions.length > 0 ? upsertedExpansions : (dbExpansions ?? []),
      parentGame,
    };
  } catch {
    return { expansions: dbExpansions ?? [], parentGame };
  }
}

/**
 * Get IGDB access token using OAuth
 */
async function getIGDBAccessToken(): Promise<string> {
  const clientId = Deno.env.get('IGDB_CLIENT_ID');
  const clientSecret = Deno.env.get('IGDB_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('IGDB credentials not configured');
  }

  const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
  
  const response = await fetch(tokenUrl, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`IGDB OAuth error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch game data from IGDB API and store it
 */
export async function fetchFromIGDB(gameName: string) {
  const clientId = Deno.env.get('IGDB_CLIENT_ID');
  
  if (!clientId) {
    throw new Error('IGDB Client ID not configured');
  }

  const accessToken = await getIGDBAccessToken();

  // Search for the game on IGDB
  const searchUrl = 'https://api.igdb.com/v4/games';
  const searchBody = `
    search "${gameName}";
    fields name, summary, first_release_date, genres.name, platforms.name, cover.url, cover.image_id, screenshots.url, screenshots.image_id;
    limit 1;
  `;
  
  const searchResponse = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain'
    },
    body: searchBody
  });

  if (!searchResponse.ok) {
    throw new Error(`IGDB API error: ${searchResponse.statusText}`);
  }

  const games = await searchResponse.json();
  
  if (!games || games.length === 0) {
    return null;
  }

  const game = games[0];
  
  // Convert IGDB cover URL to high-res (t_cover_big or t_1080p)
  let coverArtUrl = null;
  if (game.cover?.image_id) {
    coverArtUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`;
  }

  // Get screenshots if available
  const screenshots = game.screenshots?.map((s: any) => 
    `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${s.image_id}.jpg`
  ) || [];

  // Extract release year
  const releaseYear = game.first_release_date 
    ? new Date(game.first_release_date * 1000).getFullYear() 
    : undefined;

  return {
    igdb_id: game.id,
    title: game.name,
    year: releaseYear,
    description: game.summary,
    genres: game.genres?.map((g: any) => g.name) || [],
    platforms: game.platforms?.map((p: any) => p.name) || [],
    coverArtUrl,
    screenshots
  };
}

/**
 * Get or create a game from IGDB
 */
export async function getOrCreateGame(gameTitle: string) {
  // First, try to find existing game
  const { data: existing } = await supabase
    .from('forge_games_17285bd7')
    .select('*')
    .ilike('title', gameTitle)
    .limit(1)
    .single();

  if (existing) {
    // Get artwork
    const artwork = await getGameArtwork(existing.id, 'cover');
    return { ...existing, artwork };
  }

  // If not found, try to fetch from IGDB
  try {
    const igdbData = await fetchFromIGDB(gameTitle);
    
    if (!igdbData) {
      return null;
    }

    // Create game ID from title
    const gameId = `game-${igdbData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    // Create game record
    const gameData: GameData = {
      id: gameId,
      title: igdbData.title,
      igdb_id: igdbData.igdb_id,
      year: igdbData.year,
      description: igdbData.description,
      genres: igdbData.genres,
      platforms: igdbData.platforms
    };

    const game = await upsertGame(gameData);

    // Add cover art if available
    if (igdbData.coverArtUrl) {
      await addGameArtwork({
        game_id: gameId,
        artwork_type: 'cover',
        url: igdbData.coverArtUrl
      });
    }

    // Add screenshots if available
    if (igdbData.screenshots && igdbData.screenshots.length > 0) {
      for (const screenshotUrl of igdbData.screenshots.slice(0, 5)) {
        await addGameArtwork({
          game_id: gameId,
          artwork_type: 'screenshot',
          url: screenshotUrl
        });
      }
    }

    // Return with artwork
    const artwork = await getGameArtwork(gameId, 'cover');
    return { ...game, artwork };
  } catch (error) {
    console.error('Error fetching from IGDB:', error);
    return null;
  }
}

/**
 * Bulk seed games from IGDB — fetches top-rated games in batches
 */
export async function seedFromIGDB(offset = 0, limit = 500): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const clientId = Deno.env.get('IGDB_CLIENT_ID');
  if (!clientId) throw new Error('IGDB_CLIENT_ID not configured');

  const accessToken = await getIGDBAccessToken();
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  const body = `
    fields name, summary, first_release_date, genres.name, platforms.name, cover.image_id, aggregated_rating, aggregated_rating_count;
    where cover != null & aggregated_rating_count > 3;
    sort aggregated_rating desc;
    limit ${Math.min(limit, 500)};
    offset ${offset};
  `;

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!res.ok) throw new Error(`IGDB error: ${res.status} ${await res.text()}`);
  const games = await res.json() as any[];

  for (const g of games) {
    try {
      const gameId = `igdb-${g.id}`;
      const coverUrl = g.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : null;
      const year = g.first_release_date
        ? new Date(g.first_release_date * 1000).getFullYear()
        : null;

      const { error: upsertErr } = await supabase
        .from('forge_games_17285bd7')
        .upsert({
          id: gameId,
          title: g.name,
          igdb_id: g.id,
          year,
          description: g.summary ?? null,
          genres: g.genres?.map((x: any) => x.name) ?? [],
          platforms: g.platforms?.map((x: any) => x.name) ?? [],
        }, { onConflict: 'id', ignoreDuplicates: true });

      if (upsertErr) { errors.push(`${g.name}: ${upsertErr.message}`); continue; }

      if (coverUrl) {
        await supabase
          .from('forge_game_artwork_17285bd7')
          .upsert({ game_id: gameId, artwork_type: 'cover', url: coverUrl }, { onConflict: 'game_id,artwork_type', ignoreDuplicates: true });
      }
      inserted++;
    } catch (e: any) {
      errors.push(`${g.name}: ${e.message}`);
      skipped++;
    }
  }

  return { inserted, skipped, errors };
}