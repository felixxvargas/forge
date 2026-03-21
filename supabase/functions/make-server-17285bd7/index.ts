import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Storage bucket configuration
const STORAGE_BUCKETS = {
  AVATARS: 'forge-avatars',           // User profile pictures
  BANNERS: 'forge-banners',           // User profile banners
  POST_MEDIA: 'forge-post-media',     // Post images, videos, gifs
  COMMUNITY_ICONS: 'forge-community-icons',   // Community icons (small)
  COMMUNITY_BANNERS: 'forge-community-banners', // Community banner images
};

// Initialize storage buckets on startup
async function initStorage() {
  try {
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    console.log('[Storage] Existing buckets:', existingBuckets?.map(b => b.name).join(', '));
    
    // Configuration for each bucket type
    const bucketConfigs = [
      {
        name: STORAGE_BUCKETS.AVATARS,
        options: {
          public: true,
          fileSizeLimit: 5242880, // 5MB - avatars should be small
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        }
      },
      {
        name: STORAGE_BUCKETS.BANNERS,
        options: {
          public: true,
          fileSizeLimit: 10485760, // 10MB - banners can be larger
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        }
      },
      {
        name: STORAGE_BUCKETS.POST_MEDIA,
        options: {
          public: true,
          fileSizeLimit: 52428800, // 50MB - videos and gifs can be large
          allowedMimeTypes: ['image/*', 'video/mp4', 'video/webm', 'video/quicktime', 'image/gif']
        }
      },
      {
        name: STORAGE_BUCKETS.COMMUNITY_ICONS,
        options: {
          public: true,
          fileSizeLimit: 2097152, // 2MB - icons are small
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
        }
      },
      {
        name: STORAGE_BUCKETS.COMMUNITY_BANNERS,
        options: {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        }
      }
    ];
    
    // Create missing buckets
    for (const config of bucketConfigs) {
      const exists = existingBuckets?.some(bucket => bucket.name === config.name);
      
      if (!exists) {
        console.log(`[Storage] Creating bucket: ${config.name}`);
        const { error } = await supabase.storage.createBucket(config.name, config.options);
        
        if (error) {
          // Ignore "already exists" errors (409) - this means bucket was created successfully before
          if (error.statusCode === '409' || error.message?.includes('already exists')) {
            console.log(`[Storage] ✓ Bucket already exists: ${config.name}`);
          } else {
            console.error(`[Storage] ❌ Failed to create ${config.name}:`, error);
          }
        } else {
          console.log(`[Storage] ✓ Created bucket: ${config.name}`);
        }
      } else {
        console.log(`[Storage] ✓ Bucket exists: ${config.name}`);
      }
    }
    
    console.log('[Storage] ✅ All buckets initialized');
  } catch (error) {
    console.error('[Storage] Error initializing storage:', error);
  }
}

// Initialize on startup
initStorage();

console.log('🚀 Starting Forge server...');
console.log('📦 Storage buckets initialized');
console.log('✅ All routes registered');

// Health check endpoint
app.get("/make-server-17285bd7/health", (c) => {
  console.log('[Health] Health check requested');
  return c.json({ status: "ok", version: "v2-auth-seed" });
});

// Diagnostic endpoint - check database access
app.get("/make-server-17285bd7/debug/db-access", async (c) => {
  try {
    // Test 1: Can we query the kv_store with service role?
    const { data: kvTest, error: kvError } = await supabase
      .from('kv_store_17285bd7')
      .select('*')
      .limit(1);
    
    // Test 2: Can we list storage buckets?
    const { data: bucketsTest, error: bucketsError } = await supabase.storage.listBuckets();
    
    // Test 3: Check environment variables
    const hasUrl = !!Deno.env.get('SUPABASE_URL');
    const hasServiceKey = !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const hasAnonKey = !!Deno.env.get('SUPABASE_ANON_KEY');
    
    return c.json({
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabaseUrl: hasUrl,
        hasServiceRoleKey: hasServiceKey,
        hasAnonKey: hasAnonKey
      },
      databaseAccess: {
        success: !kvError,
        error: kvError?.message || null,
        rowsReturned: kvTest?.length || 0
      },
      storageAccess: {
        success: !bucketsError,
        error: bucketsError?.message || null,
        bucketsFound: bucketsTest?.length || 0
      }
    });
  } catch (error: any) {
    return c.json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    }, 500);
  }
});

// Storage buckets check endpoint
app.get("/make-server-17285bd7/storage/check", async (c) => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    const requiredBuckets = [
      STORAGE_BUCKETS.AVATARS,
      STORAGE_BUCKETS.BANNERS,
      STORAGE_BUCKETS.POST_MEDIA,
      STORAGE_BUCKETS.COMMUNITY_ICONS,
      STORAGE_BUCKETS.COMMUNITY_BANNERS
    ];
    
    const existingBucketNames = buckets?.map(b => b.name) || [];
    const missingBuckets = requiredBuckets.filter(name => !existingBucketNames.includes(name));
    
    return c.json({
      buckets: existingBucketNames,
      required: requiredBuckets,
      missing: missingBuckets,
      allPresent: missingBuckets.length === 0
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Debug JWT validation endpoint
app.post("/make-server-17285bd7/debug/validate-token", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ success: false, error: 'No token provided' });
    }
    
    // Try with anon client
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user: anonUser }, error: anonError } = await anonClient.auth.getUser(accessToken);
    
    // Try with service role client
    const { data: { user: serviceUser }, error: serviceError } = await supabase.auth.getUser(accessToken);
    
    return c.json({
      success: true,
      tokenLength: accessToken.length,
      tokenPreview: accessToken.substring(0, 50) + '...',
      anonClient: {
        success: !!anonUser,
        userId: anonUser?.id,
        email: anonUser?.email,
        error: anonError?.message,
        errorCode: anonError?.code
      },
      serviceRoleClient: {
        success: !!serviceUser,
        userId: serviceUser?.id,
        email: serviceUser?.email,
        error: serviceError?.message,
        errorCode: serviceError?.code
      }
    });
  } catch (error) {
    console.error('Debug validate token error:', error);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});

// ===== AUTH ENDPOINTS =====

// Sign up with email/password
app.post("/make-server-17285bd7/auth/signup", async (c) => {
  try {
    const { email, password, displayName, handle, pronouns } = await c.req.json();
    
    // Validate required fields
    if (!email || !password || !displayName || !handle) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Check if handle is already taken
    const existingUser = await kv.get(`user:handle:${handle}`);
    if (existingUser) {
      return c.json({ error: 'Handle already taken' }, 400);
    }
    
    // Create auth user with Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since email server not configured
      user_metadata: { displayName, handle, pronouns: pronouns || '' }
    });
    
    if (error) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already been registered') || 
          error.code === 'email_exists' ||
          error.code === '422' ||
          error.status === 422) {
        return c.json({ error: 'An account with this email already exists. Please sign in instead.' }, 400);
      }
      
      return c.json({ error: error.message || 'Failed to create account' }, 400);
    }
    
    // Create user profile in KV store
    const userId = data.user.id;
    const userProfile = {
      id: userId,
      handle,
      displayName,
      pronouns: pronouns || '',
      bio: '',
      about: '',
      email, // Add email to profile
      profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop',
      platforms: [],
      platformHandles: {},
      showPlatformHandles: {},
      socialPlatforms: [],
      socialHandles: {},
      showSocialHandles: {},
      gameLists: {
        recentlyPlayed: [],
        library: [],
        favorites: [],
        wishlist: []
      },
      followerCount: 0,
      followingCount: 0,
      communities: [],
      displayedCommunities: [],
      interests: [],
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`user:${userId}`, userProfile);
    await kv.set(`user:handle:${handle}`, userId);
    
    // Sign in the user immediately after signup to get a session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (sessionError) {
      console.error('Error creating session after signup:', sessionError);
      // Still return success for signup, but without session
      return c.json({ 
        user: data.user,
        profile: userProfile
      });
    }
    
    console.log('[Signup] User created and signed in successfully');
    
    return c.json({ 
      user: data.user,
      profile: userProfile,
      session: sessionData.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Sign in with email/password
app.post("/make-server-17285bd7/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return c.json({ error: error.message }, 401);
    }
    
    // Get user profile from KV store
    let profile = await kv.get(`user:${data.user.id}`);
    
    // If profile doesn't exist, create one automatically
    if (!profile) {
      console.log(`No profile found for user ${data.user.id}, creating new profile...`);
      
      // Extract name from email or user metadata
      const displayName = data.user.user_metadata?.full_name || 
                         data.user.user_metadata?.name || 
                         data.user.email?.split('@')[0] || 
                         'User';
      
      // Generate a default handle from email
      const baseHandle = `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      
      // Check if handle is available, if not append numbers
      let handle = baseHandle;
      let counter = 1;
      while (await kv.get(`user:handle:${handle}`)) {
        handle = `${baseHandle}${counter}`;
        counter++;
      }
      
      // Create new profile
      profile = {
        id: data.user.id,
        handle,
        displayName,
        pronouns: '',
        bio: '',
        about: '',
        email, // Add email to profile
        profilePicture: data.user.user_metadata?.avatar_url || 
                       `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7C3AED&color=fff&size=200`,
        platforms: [],
        platformHandles: {},
        showPlatformHandles: {},
        socialPlatforms: [],
        socialHandles: {},
        showSocialHandles: {},
        gameLists: {
          recentlyPlayed: [],
          library: [],
          favorites: [],
          wishlist: []
        },
        followerCount: 0,
        followingCount: 0,
        communities: [],
        displayedCommunities: [],
        interests: [], // Empty interests means onboarding incomplete
        createdAt: new Date().toISOString()
      };
      
      // Save profile to KV store
      await kv.set(`user:${data.user.id}`, profile);
      await kv.set(`user:handle:${handle}`, data.user.id);
      
      console.log(`Created profile for user ${data.user.id} with handle ${handle}`);
    } else {
      console.log(`Found existing profile for user ${data.user.id} with handle ${profile.handle}`);
    }
    
    console.log('[Signin] Returning response with session:', {
      hasSession: !!data.session,
      hasAccessToken: !!data.session?.access_token,
      hasUser: !!data.user,
      userId: data.user?.id
    });
    
    return c.json({ 
      session: data.session,
      user: data.user,
      profile
    });
  } catch (error) {
    console.error('Signin error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get current user
app.get("/make-server-17285bd7/auth/me", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    let profile = await kv.get(`user:${user.id}`);
    
    // If profile doesn't exist (new Google OAuth user), create a minimal profile
    if (!profile) {
      // Extract info from Google OAuth
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      const email = user.email || '';
      
      // Create basic profile - user will complete onboarding
      profile = {
        id: user.id,
        handle: '', // Will be set during onboarding
        displayName,
        pronouns: '',
        bio: '',
        about: '',
        profilePicture: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7C3AED&color=fff&size=200`,
        platforms: [],
        platformHandles: {},
        showPlatformHandles: {},
        socialPlatforms: [],
        socialHandles: {},
        showSocialHandles: {},
        gameLists: {
          recentlyPlayed: [],
          library: [],
          favorites: [],
          wishlist: []
        },
        followerCount: 0,
        followingCount: 0,
        communities: [],
        displayedCommunities: [],
        interests: [],
        email,
        authProvider: 'google',
        createdAt: new Date().toISOString()
      };
      
      await kv.set(`user:${user.id}`, profile);
    }
    
    return c.json({ user, profile });
  } catch (error) {
    console.error('Auth me error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== USER ENDPOINTS =====

// Get user by ID
app.get("/make-server-17285bd7/users/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user by handle
app.get("/make-server-17285bd7/users/handle/:handle", async (c) => {
  try {
    const handle = c.req.param('handle');
    const userId = await kv.get(`user:handle:${handle}`);
    
    if (!userId) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const user = await kv.get(`user:${userId}`);
    return c.json(user);
  } catch (error) {
    console.error('Get user by handle error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user profile
app.put("/make-server-17285bd7/users/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const userId = c.req.param('userId');
    
    // Ensure user can only update their own profile
    if (user.id !== userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const updates = await c.req.json();
    const currentProfile = await kv.get(`user:${userId}`);
    
    if (!currentProfile) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // If handle is changing, update the handle mapping
    if (updates.handle && updates.handle !== currentProfile.handle) {
      // Remove old handle mapping if it exists
      if (currentProfile.handle) {
        await kv.del(`user:handle:${currentProfile.handle}`);
      }
      
      // Set new handle mapping
      await kv.set(`user:handle:${updates.handle}`, userId);
    }
    
    // Update profile
    const updatedProfile = { ...currentProfile, ...updates, id: userId };
    await kv.set(`user:${userId}`, updatedProfile);
    
    return c.json(updatedProfile);
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check if handle is available
app.get("/make-server-17285bd7/users/check-handle/:handle", async (c) => {
  try {
    const handle = c.req.param('handle');
    console.log('[Check Handle] Checking handle:', handle);
    
    const userId = await kv.get(`user:handle:${handle}`);
    console.log('[Check Handle] Handle mapped to user ID:', userId);
    
    // If handle is not taken, it's available
    if (!userId) {
      console.log('[Check Handle] Handle not taken, returning available: true');
      return c.json({ available: true });
    }
    
    // If handle is taken, check if it belongs to the current user
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('[Check Handle] Has auth token:', !!accessToken);
    
    if (accessToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
      console.log('[Check Handle] Auth check - user ID:', user?.id, 'error:', authError?.message);
      
      // If this is the current user's handle, it's "available" (they can keep it)
      if (!authError && user && user.id === userId) {
        console.log('[Check Handle] Handle belongs to current user, returning available: true');
        return c.json({ available: true });
      }
    }
    
    // Handle is taken by someone else
    console.log('[Check Handle] Handle taken by someone else, returning available: false');
    return c.json({ available: false });
  } catch (error) {
    console.error('Check handle error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all topic accounts
app.get("/make-server-17285bd7/users/topic-accounts", async (c) => {
  console.log('[Server] GET /make-server-17285bd7/users/topic-accounts - Route handler called!');
  
  // Always return static fallback data - we don't need to query the database for topic accounts
  // since they are pre-defined and don't change
  const fallbackTopicAccounts = [
    {
      id: 'user-ign',
      handle: '@ign',
      displayName: 'IGN',
      bio: 'The ultimate gaming and entertainment resource',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'instagram', 'tiktok', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-gamespot',
      handle: '@gamespot',
      displayName: 'GameSpot',
      bio: 'The world in play',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'instagram', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-pcgamer',
      handle: '@pcgamer',
      displayName: 'PC Gamer',
      bio: 'The global authority on PC games',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'threads', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-polygon',
      handle: '@polygon',
      displayName: 'Polygon',
      bio: 'Gaming news, reviews, and more',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-kotaku',
      handle: '@kotaku',
      displayName: 'Kotaku',
      bio: 'Gaming reviews and news',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-eurogamer',
      handle: '@eurogamer',
      displayName: 'Eurogamer',
      bio: 'The leading European video games media',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-destructoid',
      handle: '@destructoid',
      displayName: 'Destructoid',
      bio: 'Independent gaming news and views',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-rockpapershotgun',
      handle: '@rockpapershotgun',
      displayName: 'Rock Paper Shotgun',
      bio: 'PC gaming news and reviews',
      profilePicture: '',
      platforms: [],
      socialPlatforms: ['x', 'bluesky'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-massivelyop',
      handle: '@massivelyop',
      displayName: 'MassivelyOP',
      bio: 'MMORPG news and culture',
      profilePicture: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=200&h=200&fit=crop',
      platforms: [],
      socialPlatforms: ['mastodon'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    },
    {
      id: 'user-forge',
      handle: '@forge',
      displayName: 'Forge',
      bio: 'The gaming social network for everyone. Share your gaming adventures across all platforms. 🎮⚡',
      profilePicture: 'https://api.dicebear.com/7.x/shapes/svg?seed=forge&backgroundColor=7c3aed&radius=50',
      platforms: [],
      socialPlatforms: ['x', 'bluesky', 'threads'],
      gameLists: { recentlyPlayed: [], library: [], favorites: [], wishlist: [] },
      followerCount: 0,
      accountType: 'topic'
    }
  ];

  return c.json(fallbackTopicAccounts);
});

// ===== POST ENDPOINTS =====

// Get all posts
app.get("/make-server-17285bd7/posts", async (c) => {
  try {
    const posts = await kv.getByPrefix('post:');
    return c.json(posts.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  } catch (error) {
    console.error('Get posts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get posts by user
app.get("/make-server-17285bd7/posts/user/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const allPosts = await kv.getByPrefix('post:');
    const userPosts = allPosts.filter((post: any) => post.userId === userId);
    
    return c.json(userPosts.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  } catch (error) {
    console.error('Get user posts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create post
app.post("/make-server-17285bd7/posts", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('[POST /posts] Authorization header:', authHeader ? 'Present' : 'Missing');
    
    const accessToken = authHeader?.split(' ')[1];
    if (!accessToken) {
      console.log('[POST /posts] No access token found in Authorization header');
      return c.json({ error: 'No authorization token provided. Please sign in.' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.log('[POST /posts] Token validation failed:', authError?.message);
      return c.json({ error: 'Invalid or expired session. Please sign in again.' }, 401);
    }
    
    console.log('[POST /posts] User authenticated:', user.id);
    
    const { content, images, url, imageAlts, communityId } = await c.req.json();
    
    const postId = crypto.randomUUID();
    const post = {
      id: postId,
      userId: user.id,
      content,
      images: images || [],
      imageAlts: imageAlts || [],
      url: url || null,
      communityId: communityId || null,
      platform: 'forge',
      timestamp: new Date().toISOString(),
      likes: 0,
      reposts: 0,
      comments: 0
    };
    
    await kv.set(`post:${postId}`, post);
    
    return c.json(post);
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete post
app.delete("/make-server-17285bd7/posts/:postId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const postId = c.req.param('postId');
    const post = await kv.get(`post:${postId}`);
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    // Ensure user can only delete their own posts
    if (post.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    await kv.del(`post:${postId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Like post
app.post("/make-server-17285bd7/posts/:postId/like", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const postId = c.req.param('postId');
    const likeKey = `like:${user.id}:${postId}`;
    
    // Check if already liked
    const existingLike = await kv.get(likeKey);
    if (existingLike) {
      return c.json({ error: 'Already liked' }, 400);
    }
    
    // Add like
    await kv.set(likeKey, { userId: user.id, postId, timestamp: new Date().toISOString() });
    
    // Update post like count
    const post = await kv.get(`post:${postId}`);
    if (post) {
      post.likes = (post.likes || 0) + 1;
      await kv.set(`post:${postId}`, post);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Like post error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unlike post
app.delete("/make-server-17285bd7/posts/:postId/like", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const postId = c.req.param('postId');
    const likeKey = `like:${user.id}:${postId}`;
    
    await kv.del(likeKey);
    
    // Update post like count
    const post = await kv.get(`post:${postId}`);
    if (post) {
      post.likes = Math.max((post.likes || 0) - 1, 0);
      await kv.set(`post:${postId}`, post);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unlike post error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user's liked posts
app.get("/make-server-17285bd7/users/:userId/likes", async (c) => {
  try {
    const userId = c.req.param('userId');
    const likes = await kv.getByPrefix(`like:${userId}:`);
    
    return c.json(likes.map((like: any) => like.postId));
  } catch (error) {
    console.error('Get likes error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== CONTENT UPLOAD ENDPOINTS =====

// Upload content (images, videos, gifs)
app.post("/make-server-17285bd7/upload", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('[Upload] Authorization header:', authHeader ? 'Present' : 'Missing');
    
    const accessToken = authHeader?.split(' ')[1];
    if (!accessToken) {
      console.log('[Upload] No access token found');
      return c.json({ code: 401, message: 'Unauthorized - No token provided' }, 401);
    }
    
    console.log('[Upload] Token length:', accessToken.length);
    console.log('[Upload] Token preview:', accessToken.substring(0, 50) + '...');
    
    // Create a client with ANON key to validate user JWT properly
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    console.log('[Upload] Attempting to validate JWT...');
    
    // Verify JWT and get user using anon client (this validates user JWTs correctly)
    const { data: { user }, error: authError } = await anonClient.auth.getUser(accessToken);
    
    console.log('[Upload] Validation result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasError: !!authError,
      errorMessage: authError?.message,
      errorCode: authError?.code,
      errorStatus: authError?.status
    });
    
    if (authError || !user) {
      console.error('[Upload] Token validation failed - Full error:', JSON.stringify(authError, null, 2));
      return c.json({ code: 401, message: authError?.message || 'Invalid JWT' }, 401);
    }
    
    console.log('[Upload] ✓ User authenticated successfully:', user.id, user.email);
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const bucketType = formData.get('bucket') as string || 'avatar'; // Default to avatar
    
    if (!file) {
      console.log('[Upload] No file in formData');
      return c.json({ error: 'No file provided' }, 400);
    }
    
    console.log('[Upload] File received:', file.name, file.size, 'bytes', 'for bucket type:', bucketType);
    
    // Map bucket type to actual bucket name
    const bucketMap: Record<string, string> = {
      'avatar': STORAGE_BUCKETS.AVATARS,
      'banner': STORAGE_BUCKETS.BANNERS,
      'post': STORAGE_BUCKETS.POST_MEDIA,
      'community-icon': STORAGE_BUCKETS.COMMUNITY_ICONS,
      'community-banner': STORAGE_BUCKETS.COMMUNITY_BANNERS,
    };
    
    const bucketName = bucketMap[bucketType] || STORAGE_BUCKETS.AVATARS;
    console.log('[Upload] Mapped to bucket:', bucketName);
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    
    console.log('[Upload] Uploading to path:', fileName);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      console.error('[Upload] Storage upload error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log('[Upload] File uploaded successfully:', data.path);
    
    // Get public URL (all buckets are public)
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    console.log('[Upload] Public URL generated:', publicUrlData.publicUrl);
    
    return c.json({ 
      path: data.path,
      url: publicUrlData.publicUrl
    });
  } catch (error) {
    console.error('[Upload] Upload error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== USER SAFETY ENDPOINTS =====

// Block user
app.post("/make-server-17285bd7/users/:targetUserId/block", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const targetUserId = c.req.param('targetUserId');
    const blockKey = `block:${user.id}:${targetUserId}`;
    
    await kv.set(blockKey, {
      blockerId: user.id,
      blockedId: targetUserId,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Block user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unblock user
app.delete("/make-server-17285bd7/users/:targetUserId/block", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const targetUserId = c.req.param('targetUserId');
    const blockKey = `block:${user.id}:${targetUserId}`;
    
    await kv.del(blockKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unblock user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mute user
app.post("/make-server-17285bd7/users/:targetUserId/mute", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const targetUserId = c.req.param('targetUserId');
    const muteKey = `mute:${user.id}:${targetUserId}`;
    
    await kv.set(muteKey, {
      muterId: user.id,
      mutedId: targetUserId,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mute user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unmute user
app.delete("/make-server-17285bd7/users/:targetUserId/mute", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const targetUserId = c.req.param('targetUserId');
    const muteKey = `mute:${user.id}:${targetUserId}`;
    
    await kv.del(muteKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unmute user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Report user
app.post("/make-server-17285bd7/users/:targetUserId/report", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const targetUserId = c.req.param('targetUserId');
    const { reason, description } = await c.req.json();
    
    const reportId = crypto.randomUUID();
    await kv.set(`report:${reportId}`, {
      id: reportId,
      reporterId: user.id,
      targetUserId,
      reason,
      description: description || '',
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    
    return c.json({ success: true, reportId });
  } catch (error) {
    console.error('Report user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get blocked users
app.get("/make-server-17285bd7/users/me/blocks", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const blocks = await kv.getByPrefix(`block:${user.id}:`);
    
    return c.json(blocks.map((block: any) => block.blockedId));
  } catch (error) {
    console.error('Get blocks error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get muted users
app.get("/make-server-17285bd7/users/me/mutes", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const mutes = await kv.getByPrefix(`mute:${user.id}:`);
    
    return c.json(mutes.map((mute: any) => mute.mutedId));
  } catch (error) {
    console.error('Get mutes error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mute post
app.post("/make-server-17285bd7/posts/:postId/mute", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const postId = c.req.param('postId');
    const mutePostKey = `mute-post:${user.id}:${postId}`;
    
    // Check if already muted
    const existingMute = await kv.get(mutePostKey);
    if (existingMute) {
      return c.json({ error: 'Post already muted' }, 400);
    }
    
    await kv.set(mutePostKey, {
      userId: user.id,
      postId: postId,
      timestamp: new Date().toISOString()
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mute post error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unmute post
app.delete("/make-server-17285bd7/posts/:postId/mute", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const postId = c.req.param('postId');
    const mutePostKey = `mute-post:${user.id}:${postId}`;
    
    await kv.del(mutePostKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unmute post error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get muted posts
app.get("/make-server-17285bd7/users/me/muted-posts", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const mutedPosts = await kv.getByPrefix(`mute-post:${user.id}:`);
    
    return c.json(mutedPosts.map((mute: any) => mute.postId));
  } catch (error) {
    console.error('Get muted posts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== FOLLOW ENDPOINTS =====

// Follow user
app.post("/make-server-17285bd7/users/:targetUserId/follow", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const targetUserId = c.req.param('targetUserId');
    const followKey = `follow:${user.id}:${targetUserId}`;
    
    // Check if already following
    const existingFollow = await kv.get(followKey);
    if (existingFollow) {
      return c.json({ error: 'Already following' }, 400);
    }
    
    await kv.set(followKey, {
      followerId: user.id,
      followingId: targetUserId,
      timestamp: new Date().toISOString()
    });
    
    // Update follower/following counts
    const follower = await kv.get(`user:${user.id}`);
    const following = await kv.get(`user:${targetUserId}`);
    
    if (follower) {
      follower.followingCount = (follower.followingCount || 0) + 1;
      await kv.set(`user:${user.id}`, follower);
    }
    
    if (following) {
      following.followerCount = (following.followerCount || 0) + 1;
      await kv.set(`user:${targetUserId}`, following);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Follow user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unfollow user
app.delete("/make-server-17285bd7/users/:targetUserId/follow", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const targetUserId = c.req.param('targetUserId');
    const followKey = `follow:${user.id}:${targetUserId}`;
    
    await kv.del(followKey);
    
    // Update follower/following counts
    const follower = await kv.get(`user:${user.id}`);
    const following = await kv.get(`user:${targetUserId}`);
    
    if (follower) {
      follower.followingCount = Math.max((follower.followingCount || 0) - 1, 0);
      await kv.set(`user:${user.id}`, follower);
    }
    
    if (following) {
      following.followerCount = Math.max((following.followerCount || 0) - 1, 0);
      await kv.set(`user:${targetUserId}`, following);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get following list
app.get("/make-server-17285bd7/users/:userId/following", async (c) => {
  try {
    const userId = c.req.param('userId');
    const follows = await kv.getByPrefix(`follow:${userId}:`);
    
    return c.json(follows.map((follow: any) => follow.followingId));
  } catch (error) {
    console.error('Get following error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get followers list
app.get("/make-server-17285bd7/users/:userId/followers", async (c) => {
  try {
    const userId = c.req.param('userId');
    // Get all follow relationships and filter for ones where this user is being followed
    const allFollows = await kv.getByPrefix(`follow:`);
    const followers = allFollows
      .filter((follow: any) => follow.followingId === userId)
      .map((follow: any) => follow.followerId);
    
    return c.json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check if following
app.get("/make-server-17285bd7/users/:targetUserId/is-following", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ isFollowing: false });
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ isFollowing: false });
    }
    
    const targetUserId = c.req.param('targetUserId');
    const followKey = `follow:${user.id}:${targetUserId}`;
    
    const follow = await kv.get(followKey);
    
    return c.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Check following error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== BLUESKY INTEGRATION FOR TOPIC ACCOUNTS =====

// Fetch Bluesky profile data
app.get("/make-server-17285bd7/bluesky/profile/:handle", async (c) => {
  try {
    const handle = c.req.param('handle');
    
    // Fetch profile from Bluesky API
    const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Bluesky profile fetch failed for ${handle}: ${response.status} - ${errorText}`);
      return c.json({ error: 'Failed to fetch Bluesky profile', details: errorText }, response.status);
    }
    
    const profile = await response.json();
    
    return c.json({
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
      banner: profile.banner,
      description: profile.description,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount
    });
  } catch (error) {
    console.error('Fetch Bluesky profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Fetch Bluesky posts
app.get("/make-server-17285bd7/bluesky/posts/:handle", async (c) => {
  try {
    const handle = c.req.param('handle');
    const limit = c.req.query('limit') || '10';
    
    // Fetch posts from Bluesky API
    const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=${limit}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Bluesky posts fetch failed for ${handle}: ${response.status} - ${errorText}`);
      return c.json({ error: 'Failed to fetch Bluesky posts', details: errorText }, response.status);
    }
    
    const data = await response.json();
    
    // Transform Bluesky posts to Forge format
    const posts = data.feed.map((item: any) => {
      const post = item.post;
      const record = post.record;
      
      return {
        id: post.uri,
        content: record.text || '',
        timestamp: new Date(record.createdAt),
        likes: post.likeCount || 0,
        reposts: post.repostCount || 0,
        comments: post.replyCount || 0,
        images: post.embed?.images?.map((img: any) => img.thumb) || [],
        platform: 'bluesky',
        externalUrl: `https://bsky.app/profile/${handle}/post/${post.uri.split('/').pop()}`
      };
    });
    
    return c.json({ posts });
  } catch (error) {
    console.error('Error fetching Bluesky posts:', error);
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// Fetch posts from all topic accounts
app.get("/make-server-17285bd7/bluesky/posts/all/gaming-media", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '5');
    
    // Gaming media handles with their user IDs
    const handleToUserId: Record<string, string> = {
      'ign.bsky.social': 'user-ign',
      'polygon.bsky.social': 'user-polygon',
      'kotaku.bsky.social': 'user-kotaku',
      'eurogamer.bsky.social': 'user-eurogamer',
      'destructoid.bsky.social': 'user-destructoid',
      'rockpapershotgun.bsky.social': 'user-rockpapershotgun',
      'massivelyop.com': 'user-massivelyop' // Mastodon handle
    };
    
    // Fetch posts from each handle
    const allPosts: any[] = [];
    
    for (const [handle, userId] of Object.entries(handleToUserId)) {
      // Skip Mastodon for now (would need different API)
      if (handle.includes('mastodon') || handle === 'massivelyop.com') {
        continue;
      }
      
      try {
        const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=${limit}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch posts from ${handle}`);
          continue;
        }
        
        const data = await response.json();
        
        // Transform and add posts
        const posts = data.feed.map((item: any) => {
          const post = item.post;
          const record = post.record;
          
          return {
            id: post.uri,
            userId: userId, // Use proper user ID
            content: record.text || '',
            timestamp: new Date(record.createdAt),
            likes: post.likeCount || 0,
            reposts: post.repostCount || 0,
            comments: post.replyCount || 0,
            images: post.embed?.images?.map((img: any) => img.thumb) || [],
            platform: 'bluesky',
            externalUrl: `https://bsky.app/profile/${handle}/post/${post.uri.split('/').pop()}`
          };
        });
        
        allPosts.push(...posts);
      } catch (error) {
        console.error(`Error fetching posts from ${handle}:`, error);
      }
    }
    
    // Sort by timestamp (newest first)
    allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json({ posts: allPosts });
  } catch (error) {
    console.error('Error fetching all Bluesky posts:', error);
    return c.json({ error: 'Failed to fetch posts' }, 500);
  }
});

// ===== GAMES & MOBYGAMES INTEGRATION =====

import * as gamesAPI from './games.tsx';

// Get a single game by ID
app.get("/make-server-17285bd7/games/:gameId", async (c) => {
  try {
    const gameId = c.req.param('gameId');
    const game = await gamesAPI.getGame(gameId);
    
    return c.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    return c.json({ error: 'Failed to fetch game' }, 404);
  }
});

// Search games
app.get("/make-server-17285bd7/games/search/:query", async (c) => {
  try {
    const query = c.req.param('query');
    const limit = parseInt(c.req.query('limit') || '20');
    
    const games = await gamesAPI.searchGames(query, limit);
    
    return c.json({ games });
  } catch (error) {
    console.error('Error searching games:', error);
    return c.json({ error: 'Failed to search games' }, 500);
  }
});

// Get multiple games by IDs
app.post("/make-server-17285bd7/games/batch", async (c) => {
  try {
    const { gameIds } = await c.req.json();
    
    if (!Array.isArray(gameIds)) {
      return c.json({ error: 'gameIds must be an array' }, 400);
    }
    
    const games = await gamesAPI.getGames(gameIds);
    
    return c.json({ games });
  } catch (error) {
    console.error('Error fetching games batch:', error);
    return c.json({ error: 'Failed to fetch games' }, 500);
  }
});

// Get or create game from MobyGames
app.post("/make-server-17285bd7/games/moby", async (c) => {
  try {
    const { gameTitle } = await c.req.json();
    
    if (!gameTitle) {
      return c.json({ error: 'gameTitle is required' }, 400);
    }
    
    const game = await gamesAPI.getOrCreateGame(gameTitle);
    
    if (!game) {
      return c.json({ error: 'Game not found in MobyGames' }, 404);
    }
    
    return c.json({ game });
  } catch (error) {
    console.error('Error fetching from MobyGames:', error);
    return c.json({ error: 'Failed to fetch game from MobyGames' }, 500);
  }
});

// Add game artwork
app.post("/make-server-17285bd7/games/:gameId/artwork", async (c) => {
  try {
    const gameId = c.req.param('gameId');
    const artworkData = await c.req.json();

    const artwork = await gamesAPI.addGameArtwork({
      game_id: gameId,
      ...artworkData
    });

    return c.json({ artwork });
  } catch (error) {
    console.error('Error adding game artwork:', error);
    return c.json({ error: 'Failed to add artwork' }, 500);
  }
});

// Seed games from IGDB in bulk
app.post("/make-server-17285bd7/seed/igdb-games", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const offset = parseInt(body.offset ?? 0);
    const limit = parseInt(body.limit ?? 500);
    const result = await gamesAPI.seedFromIGDB(offset, limit);
    return c.json({ success: true, ...result });
  } catch (error: any) {
    console.error('IGDB seed error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// One-time migration endpoint to update user handle
app.post("/make-server-17285bd7/admin/update-handle", async (c) => {
  try {
    const { email, newHandle } = await c.req.json();
    
    if (!email || !newHandle) {
      return c.json({ error: 'Email and newHandle are required' }, 400);
    }

    // Find user by email (this requires searching through auth users)
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ error: 'Failed to find user' }, 500);
    }

    const authUser = authUsers.users.find((u: any) => u.email === email);
    
    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get current profile
    const currentProfile = await kv.get(`user:${authUser.id}`);
    
    if (!currentProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const oldHandle = currentProfile.handle;

    // Check if new handle is available (unless it's the same user)
    const existingHandleUserId = await kv.get(`user:handle:${newHandle}`);
    if (existingHandleUserId && existingHandleUserId !== authUser.id) {
      return c.json({ error: 'Handle already taken' }, 400);
    }

    // Update profile with new handle
    currentProfile.handle = newHandle;
    await kv.set(`user:${authUser.id}`, currentProfile);

    // Update handle lookup
    if (oldHandle) {
      await kv.del(`user:handle:${oldHandle}`);
    }
    await kv.set(`user:handle:${newHandle}`, authUser.id);

    return c.json({
      success: true,
      message: `Handle updated from ${oldHandle} to ${newHandle}`,
      profile: currentProfile
    });
  } catch (error) {
    console.error('Error updating handle:', error);
    return c.json({ error: 'Failed to update handle' }, 500);
  }
});

// ===== ADMIN ENDPOINTS =====

// Complete onboarding for user (admin)
app.post("/make-server-17285bd7/admin/complete-onboarding", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // List all auth users to find by email
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ error: 'Failed to find user' }, 500);
    }

    const authUser = authUsers.users.find((u: any) => u.email === email);
    
    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get current profile
    const currentProfile = await kv.get(`user:${authUser.id}`);
    
    if (!currentProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Set some default interests to complete onboarding
    const defaultInterests = [
      { id: 'nintendo', label: 'Nintendo', category: 'platform' },
      { id: 'rpg', label: 'RPG', category: 'genre' },
      { id: 'adventure', label: 'Adventure', category: 'genre' }
    ];

    currentProfile.interests = defaultInterests;
    await kv.set(`user:${authUser.id}`, currentProfile);

    return c.json({
      success: true,
      message: 'Onboarding completed for user',
      profile: currentProfile
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check if user exists by email (admin)
app.get("/make-server-17285bd7/admin/check-user/:email", async (c) => {
  try {
    const email = c.req.param('email');
    
    // List all auth users
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ error: 'Failed to check user' }, 500);
    }

    const authUser = authUsers.users.find((u: any) => u.email === email);
    
    if (!authUser) {
      return c.json({ exists: false, message: 'User not found' });
    }

    // Get user profile
    const profile = await kv.get(`user:${authUser.id}`);
    
    return c.json({ 
      exists: true, 
      user: {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        profile: profile
      }
    });
  } catch (error) {
    console.error('Error checking user:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user password by email (admin)
app.post("/make-server-17285bd7/admin/update-password", async (c) => {
  try {
    const { email, newPassword } = await c.req.json();
    
    if (!email || !newPassword) {
      return c.json({ error: 'Email and newPassword are required' }, 400);
    }

    // List all auth users to find by email
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ error: 'Failed to find user' }, 500);
    }

    const authUser = authUsers.users.find((u: any) => u.email === email);
    
    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Update password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );
    
    if (error) {
      console.error('Error updating password:', error);
      return c.json({ error: error.message || 'Failed to update password' }, 500);
    }

    return c.json({ 
      success: true, 
      message: `Password updated successfully for ${email}`,
      userId: authUser.id
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user profile by email (admin) - for display name and handle
app.post("/make-server-17285bd7/admin/update-profile", async (c) => {
  try {
    const { email, displayName, handle } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // List all auth users to find by email
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ error: 'Failed to find user' }, 500);
    }

    const authUser = authUsers.users.find((u: any) => u.email === email);
    
    if (!authUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get current profile
    const currentProfile = await kv.get(`user:${authUser.id}`);
    
    if (!currentProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const updates: any = {};
    const oldHandle = currentProfile.handle;

    // Update display name if provided
    if (displayName !== undefined && displayName !== currentProfile.displayName) {
      updates.displayName = displayName;
    }

    // Update handle if provided
    if (handle !== undefined && handle !== currentProfile.handle) {
      // Ensure handle starts with @ symbol
      let normalizedHandle = handle;
      if (!normalizedHandle.startsWith('@')) {
        normalizedHandle = '@' + normalizedHandle;
      }
      
      // Check if new handle is available (unless it's the same user)
      const existingHandleUserId = await kv.get(`user:handle:${normalizedHandle}`);
      if (existingHandleUserId && existingHandleUserId !== authUser.id) {
        return c.json({ error: 'Handle already taken' }, 400);
      }
      updates.handle = normalizedHandle;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const updatedProfile = { ...currentProfile, ...updates };
      await kv.set(`user:${authUser.id}`, updatedProfile);

      // Update handle lookup if handle changed
      if (updates.handle) {
        if (oldHandle) {
          await kv.del(`user:handle:${oldHandle}`);
        }
        await kv.set(`user:handle:${updates.handle}`, authUser.id);
      }

      return c.json({
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } else {
      return c.json({
        success: true,
        message: 'No changes to update',
        profile: currentProfile
      });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create profile for existing auth user (admin)
app.post("/make-server-17285bd7/admin/create-profile", async (c) => {
  try {
    const { email, displayName, handle } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // List all auth users to find by email
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ error: 'Failed to find user' }, 500);
    }

    const authUser = authUsers.users.find((u: any) => u.email === email);
    
    if (!authUser) {
      return c.json({ error: 'Auth user not found. Please sign up first.' }, 404);
    }

    // Check if profile already exists
    const existingProfile = await kv.get(`user:${authUser.id}`);
    if (existingProfile) {
      return c.json({ error: 'Profile already exists for this user. Use update instead.' }, 400);
    }

    // Generate handle if not provided
    let finalHandle = handle || `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    
    // Ensure handle starts with @ symbol
    if (!finalHandle.startsWith('@')) {
      finalHandle = '@' + finalHandle;
    }
    
    // Ensure handle is unique
    let counter = 1;
    let tempHandle = finalHandle;
    while (await kv.get(`user:handle:${tempHandle}`)) {
      tempHandle = `${finalHandle}${counter}`;
      counter++;
    }
    finalHandle = tempHandle;

    // Generate display name if not provided
    const finalDisplayName = displayName || 
                            authUser.user_metadata?.full_name || 
                            authUser.user_metadata?.name || 
                            email.split('@')[0] || 
                            'User';

    // Create new profile
    const profile = {
      id: authUser.id,
      handle: finalHandle,
      displayName: finalDisplayName,
      pronouns: '',
      bio: '',
      about: '',
      email, // Add email to profile
      profilePicture: authUser.user_metadata?.avatar_url || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(finalDisplayName)}&background=7C3AED&color=fff&size=200`,
      platforms: [],
      platformHandles: {},
      showPlatformHandles: {},
      socialPlatforms: [],
      socialHandles: {},
      showSocialHandles: {},
      gameLists: {
        recentlyPlayed: [],
        library: [],
        favorites: [],
        wishlist: []
      },
      followerCount: 0,
      followingCount: 0,
      communities: [],
      displayedCommunities: [],
      interests: [], // Empty means onboarding incomplete
      createdAt: new Date().toISOString()
    };

    // Save profile to KV store
    await kv.set(`user:${authUser.id}`, profile);
    await kv.set(`user:handle:${finalHandle}`, authUser.id);

    return c.json({
      success: true,
      message: `Profile created successfully with handle ${finalHandle}`,
      userId: authUser.id,
      profile: profile
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete handle mapping (admin) - useful for cleaning up partial signups
app.delete("/make-server-17285bd7/admin/delete-handle/:handle", async (c) => {
  try {
    const handle = c.req.param('handle');
    
    console.log(`[Admin] Deleting handle mapping for: ${handle}`);
    
    // Get the user ID for this handle
    const userId = await kv.get(`user:handle:${handle}`);
    
    if (!userId) {
      return c.json({ error: 'Handle not found' }, 404);
    }
    
    // Delete the handle mapping
    await kv.del(`user:handle:${handle}`);
    
    // Optionally also clear the handle from the user profile
    const userProfile = await kv.get(`user:${userId}`);
    if (userProfile && userProfile.handle === handle) {
      userProfile.handle = '';
      await kv.set(`user:${userId}`, userProfile);
    }
    
    console.log(`[Admin] Successfully deleted handle mapping for: ${handle}`);
    
    return c.json({ 
      success: true, 
      message: `Handle "${handle}" has been deleted`,
      userId: userId
    });
  } catch (error) {
    console.error('Error deleting handle:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== SEED TOPIC ACCOUNTS ENDPOINT =====

// Seed topic accounts into database
app.post("/make-server-17285bd7/seed/topic-accounts", async (c) => {
  try {
    // Topic accounts data
    const topicAccounts = [
      {
        id: 'user-ign',
        handle: '@ign',
        displayName: 'IGN',
        bio: 'The ultimate gaming and entertainment resource',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'instagram', 'tiktok', 'bluesky'],
      },
      {
        id: 'user-gamespot',
        handle: '@gamespot',
        displayName: 'GameSpot',
        bio: 'The world in play',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'instagram', 'bluesky'],
      },
      {
        id: 'user-pcgamer',
        handle: '@pcgamer',
        displayName: 'PC Gamer',
        bio: 'The global authority on PC games',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'threads', 'bluesky'],
      },
      {
        id: 'user-polygon',
        handle: '@polygon',
        displayName: 'Polygon',
        bio: 'Gaming news, reviews, and more',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'bluesky'],
      },
      {
        id: 'user-kotaku',
        handle: '@kotaku',
        displayName: 'Kotaku',
        bio: 'Gaming reviews and news',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'bluesky'],
      },
      {
        id: 'user-eurogamer',
        handle: '@eurogamer',
        displayName: 'Eurogamer',
        bio: 'The leading European video games media',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'bluesky'],
      },
      {
        id: 'user-destructoid',
        handle: '@destructoid',
        displayName: 'Destructoid',
        bio: 'Independent gaming news and views',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'bluesky'],
      },
      {
        id: 'user-rockpapershotgun',
        handle: '@rockpapershotgun',
        displayName: 'Rock Paper Shotgun',
        bio: 'PC gaming news and reviews',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'bluesky'],
      },
      {
        id: 'user-massivelyop',
        handle: '@massivelyop',
        displayName: 'MassivelyOP',
        bio: 'MMORPG news and culture',
        profilePicture: '', // Mastodon avatar may have CORS issues, using fallback
        platforms: [],
        socialPlatforms: [],
      },
      {
        id: 'user-forge',
        handle: '@forge',
        displayName: 'Forge',
        bio: 'The gaming social network for everyone. Share your gaming adventures across all platforms. 🎮⚡',
        email: 'admin@forge.com',
        profilePicture: '',
        platforms: [],
        socialPlatforms: ['x', 'bluesky', 'threads'],
      }
    ];

    const created = [];
    const errors = [];

    // Fetch existing auth users once to avoid repeated listUsers() calls
    const { data: { users: existingAuthUsers } } = await supabase.auth.admin.listUsers();
    const authUsersByEmail = new Map((existingAuthUsers ?? []).map((u: any) => [u.email, u]));

    for (const account of topicAccounts) {
      try {
        // Derive a stable email for the topic account
        const handleSlug = account.handle.replace(/^@/, '').replace(/[^a-z0-9]/g, '-');
        const email = account.email || `${handleSlug}@topic.forge.gg`;

        // Check if a Supabase auth user with this email already exists
        const existingAuthUser = authUsersByEmail.get(email);

        let authUserId: string;

        if (existingAuthUser) {
          authUserId = existingAuthUser.id;
          console.log(`Auth user already exists for ${account.handle}: ${authUserId}`);
        } else {
          // Create auth user with service role (no email confirmation needed)
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: crypto.randomUUID(), // random password — account is managed, not user-facing
            email_confirm: true,
            user_metadata: {
              handle: account.handle.replace(/^@/, ''),
              display_name: account.displayName,
              account_type: 'topic',
            },
          });

          if (authError) {
            throw new Error(`Auth user creation failed: ${authError.message}`);
          }
          authUserId = authData.user.id;
          console.log(`Created auth user for ${account.handle}: ${authUserId}`);
        }

        // Upsert profile row in Supabase profiles table
        const cleanHandle = account.handle.replace(/^@/, '');
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUserId,
            handle: cleanHandle,
            display_name: account.displayName,
            bio: account.bio,
            profile_picture: account.profilePicture || null,
            interests: [],
          }, { onConflict: 'id' });

        if (profileError) {
          throw new Error(`Profile upsert failed: ${profileError.message}`);
        }

        // Also keep KV store in sync (maps old string IDs to new UUID)
        const userProfile = {
          id: authUserId,
          legacyId: account.id,
          handle: account.handle,
          displayName: account.displayName,
          pronouns: '',
          bio: account.bio,
          about: '',
          profilePicture: account.profilePicture,
          email,
          platforms: account.platforms,
          socialPlatforms: account.socialPlatforms,
          interests: [],
          accountType: 'topic',
          createdAt: new Date().toISOString()
        };

        await kv.set(`user:${account.id}`, userProfile);
        await kv.set(`user:handle:${account.handle}`, authUserId);

        created.push({ handle: account.handle, id: authUserId });
        console.log(`Seeded topic account: ${account.handle} (${authUserId})`);
      } catch (error) {
        console.error(`Error seeding topic account ${account.handle}:`, error);
        errors.push({ handle: account.handle, error: error.message });
      }
    }

    // After creating all accounts, make @forge follow @felix
    try {
      const forgeUser = await kv.get('user:user-forge');
      const felixUserId = await kv.get('user:handle:@felix');
      
      if (forgeUser && felixUserId) {
        // Add follow relationship
        await kv.set('follow:user-forge:' + felixUserId, {
          followerId: 'user-forge',
          followingId: felixUserId,
          createdAt: new Date().toISOString()
        });
        
        // Update follower counts
        const felixUser = await kv.get('user:' + felixUserId);
        if (felixUser) {
          felixUser.followerCount = (felixUser.followerCount || 0) + 1;
          await kv.set('user:' + felixUserId, felixUser);
        }
        
        forgeUser.followingCount = (forgeUser.followingCount || 0) + 1;
        await kv.set('user:user-forge', forgeUser);
        
        console.log('✅ Made @forge follow @felix');
      }
    } catch (error) {
      console.error('Error making @forge follow @felix:', error);
    }

    // Create welcome post from @forge in Supabase posts table
    try {
      const forgeKv = await kv.get('user:user-forge');
      const forgeAuthId = forgeKv?.id;

      if (forgeAuthId) {
        // Check if welcome post already exists
        const { data: existingPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', forgeAuthId)
          .limit(1);

        if (!existingPosts || existingPosts.length === 0) {
          const { error: postError } = await supabase
            .from('posts')
            .insert({
              user_id: forgeAuthId,
              content: "Welcome to Forge! 🎮⚡\n\nWe're excited to have you here. Forge is where gamers from all platforms come together to share their gaming adventures, discover new games, and connect with fellow players.\n\nShare your favorite gaming moments, join communities, and let's build something amazing together!",
            });

          if (postError) {
            console.error('Error creating welcome post in Supabase:', postError.message);
          } else {
            console.log('✅ Created @forge welcome post in Supabase');
          }
        } else {
          console.log('@forge already has posts, skipping welcome post');
        }
      } else {
        console.log('Could not find @forge auth ID for welcome post');
      }
    } catch (error) {
      console.error('Error creating welcome post:', error);
    }

    return c.json({
      success: true,
      created,
      errors,
      version: 'v2-supabase-auth',
      message: `Seeded ${created.length} topic accounts in Supabase auth + profiles table`
    });
  } catch (error) {
    console.error('Seed topic accounts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /seed/bluesky-posts
app.post('/make-server-17285bd7/seed/bluesky-posts', async (c) => {
  try {
    const BLUESKY_HANDLES: Record<string, string> = {
      ign: 'ign.bsky.social',
      gamespot: 'gamespot.com',
      kotaku: 'kotaku.com',
      eurogamer: 'eurogamer.bsky.social',
      rockpapershotgun: 'rockpapershotgun.bsky.social',
      massivelyop: 'massivelyop.bsky.social',
    };

    let totalInserted = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const [slug, bskyHandle] of Object.entries(BLUESKY_HANDLES)) {
      try {
        // Look up the forge profile by handle (try with and without @)
        let profileId: string | null = null;
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id')
          .or(`handle.ilike.${slug},handle.ilike.@${slug}`)
          .limit(1);
        if (profileRows && profileRows.length > 0) {
          profileId = profileRows[0].id;
        }

        if (!profileId) {
          errors.push(`No profile found for handle: ${slug}`);
          continue;
        }

        // Fetch Bluesky profile to get avatar and update profile_picture
        const profileApiUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(bskyHandle)}`;
        const profileApiRes = await fetch(profileApiUrl);
        if (profileApiRes.ok) {
          const profileApiData = await profileApiRes.json();
          if (profileApiData.avatar) {
            await supabase.from('profiles').update({ profile_picture: profileApiData.avatar }).eq('id', profileId);
          }
        }

        // Fetch posts from Bluesky public API
        const feedUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(bskyHandle)}&limit=20`;
        const feedRes = await fetch(feedUrl);
        if (!feedRes.ok) {
          errors.push(`Bluesky API error for ${bskyHandle}: ${feedRes.status}`);
          continue;
        }
        const feedData = await feedRes.json();
        const feedItems: any[] = feedData.feed ?? [];

        let inserted = 0;
        let skipped = 0;

        for (const item of feedItems) {
          // Skip reposts
          if (item.reason && item.reason.$type === 'app.bsky.feed.defs#reasonRepost') {
            skipped++;
            continue;
          }

          const record = item.post?.record;
          if (!record) { skipped++; continue; }

          const text: string = record.text ?? '';
          // Skip posts with no text content
          if (!text.trim()) { skipped++; continue; }

          const createdAt: string = record.createdAt ?? new Date().toISOString();

          // Build external URL: https://bsky.app/profile/{handle}/post/{rkey}
          const postUri: string = item.post?.uri ?? '';
          const rkey = postUri.split('/').pop();
          const externalUrl = rkey ? `https://bsky.app/profile/${bskyHandle}/post/${rkey}` : null;

          // Extract images from both embed shapes
          const embed = item.post?.embed;
          const images: string[] = [];
          if (embed?.images) {
            for (const img of embed.images) {
              if (img.fullsize) images.push(img.fullsize);
            }
          } else if (embed?.media?.images) {
            for (const img of embed.media.images) {
              if (img.fullsize) images.push(img.fullsize);
            }
          }

          const content = text.slice(0, 500);

          const { error: insertError } = await supabase
            .from('posts')
            .insert({
              user_id: profileId,
              content,
              created_at: createdAt,
              platform: 'bluesky',
              images: images.length > 0 ? images : null,
              external_url: externalUrl,
            });

          if (!insertError) {
            inserted++;
          } else if (insertError.code === '23505') {
            // Duplicate — unique constraint violation, expected
            skipped++;
          } else {
            errors.push(`Insert error for ${bskyHandle}: ${insertError.message}`);
          }
        }

        totalInserted += inserted;
        totalSkipped += skipped;
      } catch (err: any) {
        errors.push(`Error processing ${slug}: ${err.message}`);
      }
    }

    return c.json({
      success: true,
      inserted: totalInserted,
      skipped: totalSkipped,
      errors,
    });
  } catch (error: any) {
    console.error('seed/bluesky-posts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

Deno.serve(app.fetch);