import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from './supabase';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7`;

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
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('forge-access-token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('forge-refresh-token', data.refresh_token);
      }
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

  // Token expired — try refresh token first
  if (token && isTokenExpired(token)) {
    const refreshToken = localStorage.getItem('forge-refresh-token');
    if (refreshToken) {
      const newToken = await refreshAccessToken(refreshToken);
      if (newToken) return newToken;
    }
  }

  // No localStorage token (e.g. Google OAuth) — try Supabase client session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      localStorage.setItem('forge-access-token', session.access_token);
      localStorage.setItem('forge-user-id', session.user.id);
      if (session.refresh_token) {
        localStorage.setItem('forge-refresh-token', session.refresh_token);
      }
      return session.access_token;
    }
  } catch {}

  return null;
}

// User-friendly error messages
function getUserFriendlyError(error: any, status?: number): string {
  // Check for network errors
  if (error.message?.includes('fetch') || error.message?.includes('NetworkError')) {
    return 'Connection problem. Check your internet and try again.';
  }
  
  // HTTP status-based errors
  if (status) {
    switch (status) {
      case 400:
        return error.error || 'Invalid request. Please check your input.';
      case 401:
        return 'You need to log in to continue.';
      case 403:
        return 'You don\'t have permission to do that.';
      case 404:
        return 'Content not found.';
      case 409:
        return error.error || 'This already exists.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again in a moment.';
      default:
        return error.error || 'Something went wrong. Please try again.';
    }
  }
  
  // Return server message if it's user-friendly (no codes or technical jargon)
  if (error.error && !error.error.match(/[A-Z0-9]{8,}/) && error.error.length < 100) {
    return error.error;
  }
  
  return 'Something went wrong. Please try again.';
}

async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, requiresAuth = false } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Add auth token if required
  if (requiresAuth) {
    const token = localStorage.getItem('forge-access-token');
    if (token) {
      console.log(`[API] Making authenticated ${method} request to ${endpoint}`);
      console.log(`[API] Token (first 50 chars): ${token.substring(0, 50)}...`);
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // No token available for authenticated request
      throw new Error('You need to sign in to continue.');
    }
  } else {
    console.log(`[API] Making public ${method} request to ${endpoint} with anon key`);
    // Use anon key for non-authenticated requests
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }
  
  console.log(`[API] Full URL: ${API_BASE_URL}${endpoint}`);
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    console.log(`[API] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error(`[API] ❌ ${method} ${endpoint} failed with status ${response.status}`);
      console.error(`[API] Error response:`, error);
      const friendlyMessage = getUserFriendlyError(error, response.status);
      throw new Error(friendlyMessage);
    }
    
    console.log(`[API] ✅ ${method} ${endpoint} succeeded`);
    return response.json();
  } catch (error: any) {
    // Network or other errors
    if (error.message && !error.message.includes('Failed to fetch')) {
      throw error; // Re-throw if already a friendly error
    }
    throw new Error(getUserFriendlyError(error));
  }
}

// Auth API
export const authAPI = {
  async signup(email: string, password: string, displayName: string, handle: string, pronouns?: string) {
    const data = await apiRequest('/auth/signup', {
      method: 'POST',
      body: { email, password, displayName, handle, pronouns }
    });
    
    console.log('[authAPI.signup] Response received:', {
      hasSession: !!data.session,
      hasAccessToken: !!data.session?.access_token,
      hasUser: !!data.user,
      userId: data.user?.id
    });
    
    // Store access token if available
    if (data.session?.access_token) {
      console.log('[authAPI.signup] Storing access token in localStorage');
      localStorage.setItem('forge-access-token', data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem('forge-refresh-token', data.session.refresh_token);
      }
      localStorage.setItem('forge-user-id', data.user.id);
      localStorage.setItem('forge-logged-in', 'true');
      
      // Verify it was stored
      const storedToken = localStorage.getItem('forge-access-token');
      console.log('[authAPI.signup] Token storage verified:', !!storedToken);
    } else if (data.user?.id) {
      // Fallback: store user info even if no session (for older flow)
      console.warn('[authAPI.signup] No session returned, storing user ID only');
      localStorage.setItem('forge-user-id', data.user.id);
      localStorage.setItem('forge-logged-in', 'true');
    }
    
    return data;
  },
  
  async signin(email: string, password: string) {
    const data = await apiRequest('/auth/signin', {
      method: 'POST',
      body: { email, password }
    });
    
    console.log('[authAPI.signin] Response received:', {
      hasSession: !!data.session,
      hasAccessToken: !!data.session?.access_token,
      hasUser: !!data.user,
      userId: data.user?.id
    });
    
    // Store access token
    if (data.session?.access_token) {
      console.log('[authAPI.signin] Storing access token in localStorage');
      localStorage.setItem('forge-access-token', data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem('forge-refresh-token', data.session.refresh_token);
      }
      localStorage.setItem('forge-user-id', data.user.id);
      localStorage.setItem('forge-logged-in', 'true');

      // Verify it was stored
      const storedToken = localStorage.getItem('forge-access-token');
      console.log('[authAPI.signin] Token storage verified:', !!storedToken);
    } else {
      console.error('[authAPI.signin] No access token in response!', data);
    }
    
    return data;
  },
  
  async getCurrentUser() {
    return apiRequest('/auth/me', { requiresAuth: true });
  },
  
  signout() {
    localStorage.removeItem('forge-access-token');
    localStorage.removeItem('forge-refresh-token');
    localStorage.removeItem('forge-user-id');
    localStorage.removeItem('forge-logged-in');
    localStorage.removeItem('forge-onboarding-complete');
  }
};

// User API
export const userAPI = {
  async getUser(userId: string) {
    return apiRequest(`/users/${userId}`);
  },
  
  async getUserByHandle(handle: string) {
    return apiRequest(`/users/handle/${handle}`);
  },
  
  async updateUser(userId: string, updates: any) {
    return apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: updates,
      requiresAuth: true
    });
  },
  
  async checkHandle(handle: string) {
    // Send auth token if available (to allow checking own handle)
    const hasToken = !!localStorage.getItem('forge-access-token');
    console.log('[userAPI.checkHandle] Checking handle:', handle, 'hasToken:', hasToken);
    const result = await apiRequest(`/users/check-handle/${handle}`, {
      requiresAuth: hasToken
    });
    console.log('[userAPI.checkHandle] Result:', result);
    return result;
  },

  async getTopicAccounts() {
    return apiRequest('/users/topic-accounts');
  }
};

// Post API
export const postAPI = {
  async getAllPosts() {
    return apiRequest('/posts');
  },
  
  async getUserPosts(userId: string) {
    return apiRequest(`/posts/user/${userId}`);
  },
  
  async createPost(content: string, images?: string[], url?: string, imageAlts?: string[], communityId?: string) {
    return apiRequest('/posts', {
      method: 'POST',
      body: { content, images, url, imageAlts, communityId },
      requiresAuth: true
    });
  },
  
  async deletePost(postId: string) {
    return apiRequest(`/posts/${postId}`, {
      method: 'DELETE',
      requiresAuth: true
    });
  },
  
  async likePost(postId: string) {
    return apiRequest(`/posts/${postId}/like`, {
      method: 'POST',
      requiresAuth: true
    });
  },
  
  async unlikePost(postId: string) {
    return apiRequest(`/posts/${postId}/like`, {
      method: 'DELETE',
      requiresAuth: true
    });
  },
  
  async getUserLikes(userId: string) {
    return apiRequest(`/users/${userId}/likes`);
  }
};

// Maps short bucket identifiers to actual Supabase bucket names
const BUCKET_NAMES: Record<string, string> = {
  'avatar': 'forge-avatars',
  'banner': 'forge-banners',
  'post': 'forge-post-media',
  'community-icon': 'forge-community-icons',
  'community-banner': 'forge-community-banners',
};

// Upload API
export const uploadAPI = {
  async uploadFile(file: File, bucketType: 'avatar' | 'banner' | 'post' | 'community-icon' | 'community-banner' = 'avatar') {
    // getValidToken() refreshes silently if the stored token has expired
    const token = await getValidToken();

    if (!token) {
      throw new Error('You need to sign in to upload files.');
    }
    
    const resolvedBucket = BUCKET_NAMES[bucketType] ?? bucketType;
    // Decode userId from the JWT `sub` claim — always authoritative, never stale
    let userId = 'unknown';
    try {
      const payload = JSON.parse(atob(token!.split('.')[1]));
      userId = payload.sub ?? localStorage.getItem('forge-user-id') ?? 'unknown';
    } catch {
      userId = localStorage.getItem('forge-user-id') ?? 'unknown';
    }
    const ext = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();

    // Build a per-bucket path using userId as folder prefix (matches RLS policy pattern)
    let storagePath: string;
    if (bucketType === 'avatar') {
      storagePath = `${userId}/avatar-${timestamp}.${ext}`;
    } else if (bucketType === 'banner') {
      storagePath = `${userId}/banner-${timestamp}.${ext}`;
    } else {
      storagePath = `${userId}/${timestamp}-${file.name}`;
    }

    console.log('[Upload] Uploading directly to Supabase Storage:', resolvedBucket, storagePath);

    // Upload directly to the Supabase Storage REST API — bypasses the edge
    // function (which was hanging) while still authenticating with the user JWT.
    const storageUrl = `https://${projectId}.supabase.co/storage/v1/object/${resolvedBucket}/${storagePath}`;

    try {
      const response = await fetch(storageUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: file,
      });

      console.log('[Upload] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[Upload] Storage error:', error);
        if (response.status === 401) throw new Error('Your session expired. Please sign out and sign in again.');
        if (response.status === 403) throw new Error('You do not have permission to upload files.');
        if (response.status === 413) throw new Error('File is too large. Please choose a smaller file.');
        throw new Error(error.message || error.error || 'Upload failed');
      }

      const publicUrl = `https://${projectId}.supabase.co/storage/v1/object/public/${resolvedBucket}/${storagePath}`;
      console.log('[Upload] Upload successful, url:', publicUrl);
      return { url: publicUrl };
    } catch (error: any) {
      console.error('[Upload] Upload error:', error?.message ?? error);
      throw error;
    }
  }
};

// User Safety API
export const safetyAPI = {
  async blockUser(targetUserId: string) {
    return apiRequest(`/users/${targetUserId}/block`, {
      method: 'POST',
      requiresAuth: true
    });
  },
  
  async unblockUser(targetUserId: string) {
    return apiRequest(`/users/${targetUserId}/block`, {
      method: 'DELETE',
      requiresAuth: true
    });
  },
  
  async muteUser(targetUserId: string) {
    return apiRequest(`/users/${targetUserId}/mute`, {
      method: 'POST',
      requiresAuth: true
    });
  },
  
  async unmuteUser(targetUserId: string) {
    return apiRequest(`/users/${targetUserId}/mute`, {
      method: 'DELETE',
      requiresAuth: true
    });
  },
  
  async reportUser(targetUserId: string, reason: string, description?: string) {
    return apiRequest(`/users/${targetUserId}/report`, {
      method: 'POST',
      body: { reason, description },
      requiresAuth: true
    });
  },
  
  async getBlockedUsers() {
    return apiRequest('/users/me/blocks', { requiresAuth: true });
  },
  
  async getMutedUsers() {
    return apiRequest('/users/me/mutes', { requiresAuth: true });
  },
  
  async mutePost(postId: string) {
    return apiRequest(`/posts/${postId}/mute`, {
      method: 'POST',
      requiresAuth: true
    });
  },
  
  async unmutePost(postId: string) {
    return apiRequest(`/posts/${postId}/mute`, {
      method: 'DELETE',
      requiresAuth: true
    });
  },
  
  async getMutedPosts() {
    return apiRequest('/users/me/muted-posts', { requiresAuth: true });
  }
};

// Follow API
export const followAPI = {
  async followUser(targetUserId: string) {
    return apiRequest(`/users/${targetUserId}/follow`, {
      method: 'POST',
      requiresAuth: true
    });
  },
  
  async unfollowUser(targetUserId: string) {
    return apiRequest(`/users/${targetUserId}/follow`, {
      method: 'DELETE',
      requiresAuth: true
    });
  },
  
  async getFollowing(userId: string) {
    return apiRequest(`/users/${userId}/following`);
  },
  
  async getFollowers(userId: string) {
    return apiRequest(`/users/${userId}/followers`);
  },
  
  async isFollowing(targetUserId: string) {
    return apiRequest(`/users/${targetUserId}/is-following`, { requiresAuth: true });
  }
};

// Bluesky API
export const blueskyAPI = {
  async getProfile(handle: string) {
    return apiRequest(`/bluesky/profile/${handle}`);
  },
  
  async getPosts(handle: string, limit = 10) {
    return apiRequest(`/bluesky/posts/${handle}?limit=${limit}`);
  }
};

// Games API
export const gamesAPI = {
  async listGames(limit = 50, offset = 0) {
    return apiRequest(`/games?limit=${limit}&offset=${offset}`);
  },

  async getGame(gameId: string) {
    return apiRequest(`/games/${gameId}`);
  },

  async searchGames(query: string, limit = 20) {
    return apiRequest(`/games/search/${encodeURIComponent(query)}?limit=${limit}`);
  },
  
  async getGames(gameIds: string[]) {
    return apiRequest('/games/batch', {
      method: 'POST',
      body: { gameIds }
    });
  },
  
  async getOrCreateGameFromMoby(gameTitle: string) {
    return apiRequest('/games/moby', {
      method: 'POST',
      body: { gameTitle }
    });
  },
  
  async addGameArtwork(gameId: string, artworkData: any) {
    return apiRequest(`/games/${gameId}/artwork`, {
      method: 'POST',
      body: artworkData
    });
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
  }
};

// RAWG Game Database API (https://rawg.io/apiv2)
// Set VITE_RAWG_API_KEY in your .env file to enable
export const rawgAPI = {
  async searchGames(query: string, limit = 20): Promise<any[]> {
    const key = import.meta.env.VITE_RAWG_API_KEY;
    if (!key || !query.trim()) return [];
    try {
      // exclude_additions=true removes patches and DLC. We also filter client-side on
      // parents_count: if a game has parent games it is an expansion/edition of another
      // title (e.g. "WoW TWW: Undermined") and should be excluded from results.
      const url = `https://api.rawg.io/api/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(query)}&page_size=${limit * 2}&search_exact=false&exclude_additions=true`;
      const res = await fetch(url);
      if (!res.ok) return [];
      // Title patterns that indicate passes, bundles, or year subscriptions rather than games
      const ADDON_RE = /\b(season pass|annual pass|year pass|expansion pass|battle pass|premium pass|content pack|complete pack|supporter pack|founder pack|deluxe edition pass|upgrade pack)\b/i;
      const { results } = await res.json();
      return (results ?? [])
        .filter((g: any) => !g.parents_count && !ADDON_RE.test(g.name))
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

// Admin API
export const adminAPI = {
  async checkUser(email: string) {
    return apiRequest(`/admin/check-user/${encodeURIComponent(email)}`, {
      requiresAuth: true,
    });
  },

  async updatePassword(email: string, newPassword: string) {
    return apiRequest('/admin/update-password', {
      method: 'POST',
      body: { email, newPassword },
      requiresAuth: true,
    });
  },

  async upsertProfile(email: string, displayName?: string, handle?: string) {
    return apiRequest('/admin/update-profile', {
      method: 'POST',
      body: { email, displayName, handle },
      requiresAuth: true,
    });
  },

  async completeOnboarding(email: string) {
    return apiRequest('/admin/complete-onboarding', {
      method: 'POST',
      body: { email },
      requiresAuth: true,
    });
  },

  async seedTopicAccounts() {
    return apiRequest('/seed/topic-accounts', {
      method: 'POST',
      requiresAuth: true,
    });
  }
};