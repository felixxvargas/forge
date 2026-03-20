import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-17285bd7`;

interface RequestOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
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
    let token = localStorage.getItem('forge-access-token');
    
    // If no token in localStorage, try to get from Supabase session
    if (!token) {
      console.log('[Upload] No token in localStorage, checking for active Supabase session...');
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const { projectId, publicAnonKey } = await import('/utils/supabase/info');
        const supabase = createClient(
          `https://${projectId}.supabase.co`,
          publicAnonKey
        );
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.access_token) {
          console.log('[Upload] Found active Supabase session, using access token');
          token = session.access_token;
          // Store it for future use
          localStorage.setItem('forge-access-token', token);
          localStorage.setItem('forge-user-id', session.user.id);
        } else {
          console.error('[Upload] No active Supabase session found', error);
        }
      } catch (err) {
        console.error('[Upload] Error checking Supabase session:', err);
      }
    }
    
    if (!token) {
      console.error('[Upload] No access token found after all checks');
      throw new Error('You need to sign in to upload files.');
    }
    
    const resolvedBucket = BUCKET_NAMES[bucketType] ?? bucketType;
    console.log('[Upload] Starting upload for file:', file.name, file.size, 'bytes', 'to bucket:', resolvedBucket);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', resolvedBucket);
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('[Upload] Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        
        try {
          const error = await response.json();
          console.error('[Upload] Server error response:', error);
          errorMessage = error.error || error.message || errorMessage;
        } catch (parseError) {
          console.error('[Upload] Could not parse error response');
        }
        
        // Provide more specific error messages based on status
        if (response.status === 401) {
          errorMessage = 'Your session expired. Please sign out and sign in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to upload files.';
        } else if (response.status === 413) {
          errorMessage = 'File is too large. Please choose a smaller file.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again in a moment.';
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('[Upload] Upload successful:', result);
      return result;
    } catch (error: any) {
      console.error('[Upload] Upload error:', error);
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
  async getGame(gameId: string) {
    return apiRequest(`/games/${gameId}`);
  },
  
  async searchGames(query: string, limit = 20) {
    return apiRequest(`/games/search/${query}?limit=${limit}`);
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
  }
};

// Admin API
export const adminAPI = {
  async checkUser(email: string) {
    return apiRequest(`/admin/check-user/${encodeURIComponent(email)}`);
  },
  
  async updatePassword(email: string, newPassword: string) {
    return apiRequest('/admin/update-password', {
      method: 'POST',
      body: { email, newPassword }
    });
  },
  
  async updateProfile(email: string, displayName?: string, handle?: string) {
    return apiRequest('/admin/update-profile', {
      method: 'POST',
      body: { email, displayName, handle }
    });
  },
  
  async createProfile(email: string, displayName?: string, handle?: string) {
    return apiRequest('/admin/create-profile', {
      method: 'POST',
      body: { email, displayName, handle }
    });
  },
  
  async completeOnboarding(email: string) {
    return apiRequest('/admin/complete-onboarding', {
      method: 'POST',
      body: { email }
    });
  },
  
  async seedTopicAccounts() {
    return apiRequest('/seed/topic-accounts', {
      method: 'POST'
    });
  }
};