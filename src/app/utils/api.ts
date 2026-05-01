import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/forge-api`;

/** Strip diacritics so "Pokemon" matches "Pokémon", "Zelda" matches "Zëlda", etc. */
function deAccent(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

interface RequestOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
}

// Decode a JWT and return true if its exp is in the past
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

// Exchange a refresh token for a fresh access token via the Supabase Auth REST API
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://${projectId}.supabase.co/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': publicAnonKey },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('forge-access-token', data.access_token);
      if (data.refresh_token) localStorage.setItem('forge-refresh-token', data.refresh_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

// Returns a valid (non-expired) access token, refreshing silently if needed
async function getValidToken(): Promise<string | null> {
  let token = localStorage.getItem('forge-access-token');

  if (token && !isTokenExpired(token)) return token;

  if (token && isTokenExpired(token)) {
    const refreshToken = localStorage.getItem('forge-refresh-token');
    if (refreshToken) {
      const newToken = await refreshAccessToken(refreshToken);
      if (newToken) return newToken;
    }
  }

  // No localStorage token (e.g. Google OAuth) — fall back to Supabase client session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      localStorage.setItem('forge-access-token', session.access_token);
      localStorage.setItem('forge-user-id', session.user.id);
      if (session.refresh_token) localStorage.setItem('forge-refresh-token', session.refresh_token);
      return session.access_token;
    }
  } catch { /* ignore */ }

  return null;
}

async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, requiresAuth = false } = options;

  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (requiresAuth) {
    const token = localStorage.getItem('forge-access-token');
    if (!token) throw new Error('You need to sign in to continue.');
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }

  const config: RequestInit = { method, headers };
  if (body && method !== 'GET') config.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const msg = (() => {
      switch (response.status) {
        case 400: return error.error || 'Invalid request. Please check your input.';
        case 401: return 'You need to log in to continue.';
        case 403: return "You don't have permission to do that.";
        case 404: return 'Content not found.';
        case 409: return error.error || 'This already exists.';
        case 429: return 'Too many requests. Please wait a moment.';
        case 500:
        case 502:
        case 503: return 'Server error. Please try again in a moment.';
        default: return error.error || 'Something went wrong. Please try again.';
      }
    })();
    throw new Error(msg);
  }

  return response.json();
}

// ===== USER =====

export const userAPI = {
  async checkHandle(handle: string) {
    const hasToken = !!localStorage.getItem('forge-access-token');
    return apiRequest(`/users/check-handle/${handle}`, { requiresAuth: hasToken });
  },
};

// ===== UPLOAD =====

// Maps short bucket identifiers to actual Supabase bucket names
const BUCKET_NAMES: Record<string, string> = {
  'avatar': 'forge-avatars',
  'post': 'forge-post-media',
  'community-icon': 'forge-community-icons',
  'community-banner': 'forge-community-banners',
};

export const uploadAPI = {
  async uploadFile(file: File, bucketType: 'avatar' | 'post' | 'community-icon' | 'community-banner' = 'avatar') {
    const token = await getValidToken();
    if (!token) throw new Error('You need to sign in to upload files.');

    const resolvedBucket = BUCKET_NAMES[bucketType] ?? bucketType;

    // Decode userId from the JWT sub claim
    let userId = 'unknown';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub ?? localStorage.getItem('forge-user-id') ?? 'unknown';
    } catch {
      userId = localStorage.getItem('forge-user-id') ?? 'unknown';
    }

    const ext = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const storagePath = bucketType === 'avatar'
      ? `${userId}/avatar-${timestamp}.${ext}`
      : `${userId}/${timestamp}-${file.name}`;

    const storageUrl = `https://${projectId}.supabase.co/storage/v1/object/${resolvedBucket}/${storagePath}`;

    const response = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: file,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('Your session expired. Please sign out and sign in again.');
      if (response.status === 403) throw new Error('You do not have permission to upload files.');
      if (response.status === 413) throw new Error('File is too large. Please choose a smaller file.');
      throw new Error(error.message || error.error || 'Upload failed');
    }

    return { url: `https://${projectId}.supabase.co/storage/v1/object/public/${resolvedBucket}/${storagePath}` };
  }
};

// ===== GAMES =====

export const gamesAPI = {
  async listGames(limit = 50, offset = 0) {
    return apiRequest(`/games?limit=${limit}&offset=${offset}`);
  },

  async getGame(gameId: string) {
    return apiRequest(`/games/${gameId}`);
  },

  async searchGames(query: string, limit = 20) {
    const normalizedQuery = deAccent(query).trim() || query.trim();
    const raw: any = await apiRequest(`/games/search/${encodeURIComponent(normalizedQuery)}?limit=${limit}`);
    const list: any[] = Array.isArray(raw) ? raw : raw?.games ?? [];

    // IGDB categories:
    //   0=main_game, 1=dlc_addon, 2=expansion, 3=bundle, 4=standalone_expansion,
    //   5=mod, 6=episode, 7=season, 8=remake, 9=remaster, 10=expanded_game,
    //   11=port, 12=fork, 13=pack, 14=update
    const EXCLUDED_CATEGORIES = new Set([1, 3, 5, 6, 7, 13, 14]);
    const MAIN_CATEGORIES = new Set([0, 4, 8, 9, 10, 11, 12]);
    const NOISE_RE = /\b(dlc|season pass|annual pass|year pass|expansion pass|battle pass|premium pass|content pack|complete pack|supporter pack|founder pack|upgrade pack|game pack|booster pack|weapon pack|skin pack|cosmetic pack|points pack|randomizer|randomiser|mod pack|fan edit|fan made|fan-made|texture pack|sound pack|voice pack)\b/i;

    const filtered = list.filter((g: any) => {
      const cat = g.category ?? g.game_type ?? g.type;
      if (cat !== undefined && cat !== null && EXCLUDED_CATEGORIES.has(Number(cat))) return false;
      if (NOISE_RE.test(g.title ?? g.name ?? '')) return false;
      return true;
    });

    const queryWords = deAccent(query).split(/\s+/).filter(Boolean);
    const titleScore = (title: string) => {
      const t = deAccent(title);
      return queryWords.filter(w => t.includes(w)).length;
    };
    filtered.sort((a: any, b: any) => {
      const catA = a.category ?? a.game_type ?? a.type ?? 0;
      const catB = b.category ?? b.game_type ?? b.type ?? 0;
      const mainA = MAIN_CATEGORIES.has(Number(catA)) ? 0 : 1;
      const mainB = MAIN_CATEGORIES.has(Number(catB)) ? 0 : 1;
      if (mainA !== mainB) return mainA - mainB;
      return titleScore(b.title ?? '') - titleScore(a.title ?? '');
    });

    if (Array.isArray(raw)) return filtered;
    return { ...raw, games: filtered };
  },

  async getGames(gameIds: string[]) {
    return apiRequest('/games/batch', { method: 'POST', body: { gameIds } });
  },

  async getOrCreateGameFromMoby(gameTitle: string) {
    return apiRequest('/games/moby', { method: 'POST', body: { gameTitle } });
  },

  async addGameArtwork(gameId: string, artworkData: any) {
    return apiRequest(`/games/${gameId}/artwork`, { method: 'POST', body: artworkData });
  },

  async getGamePlayers(gameId: string) {
    return apiRequest(`/games/${gameId}/players`);
  },

  async getSimilarGames(gameId: string, genres: string[], limit = 8) {
    const genresParam = genres.length ? `&genres=${encodeURIComponent(genres.join(','))}` : '';
    return apiRequest(`/games/${gameId}/similar?limit=${limit}${genresParam}`);
  },

  async getGameVersions(gameId: string, title: string, limit = 6) {
    return apiRequest(`/games/${gameId}/versions?title=${encodeURIComponent(title)}&limit=${limit}`);
  },

  async getExpansions(gameId: string): Promise<{ expansions: any[]; parentGame: any | null }> {
    const res: any = await apiRequest(`/games/${gameId}/expansions`);
    return { expansions: res?.expansions ?? [], parentGame: res?.parentGame ?? null };
  },
};

// ===== RAWG (fallback game search) =====

export const rawgAPI = {
  async searchGames(query: string, limit = 20): Promise<any[]> {
    const key = import.meta.env.VITE_RAWG_API_KEY;
    if (!key || !query.trim()) return [];
    try {
      const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(query)}&page_size=${limit * 2}&search_exact=false&exclude_additions=true`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const NOISE_RE = /\b(season pass|annual pass|year pass|expansion pass|battle pass|premium pass|content pack|complete pack|supporter pack|founder pack|deluxe edition pass|upgrade pack|randomizer|randomiser|mod pack|fan edit|texture pack)\b/i;
      const queryWords = deAccent(query).split(/\s+/).filter(Boolean);
      const titleScore = (name: string) => {
        const t = deAccent(name);
        return queryWords.filter(w => t.includes(w)).length;
      };
      const { results } = await res.json();
      return (results ?? [])
        .filter((g: any) => !NOISE_RE.test(g.name))
        .sort((a: any, b: any) => titleScore(b.name) - titleScore(a.name))
        .slice(0, limit)
        .map((g: any) => ({
          id: `rawg-${g.id}`,
          title: g.name,
          platform: (g.platforms?.[0]?.platform?.slug ?? 'pc') as any,
          year: g.released ? parseInt(g.released.split('-')[0]) : undefined,
          coverArt: g.background_image ?? '',
          genres: g.genres?.map((genre: any) => genre.name) ?? [],
        }));
    } catch {
      return [];
    }
  },
};
