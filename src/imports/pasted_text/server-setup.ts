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

// Health check endpoint
app.get("/make-server-17285bd7/health", (c) => {
  return c.json({ status: "ok" });
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
    const userId = await kv.get(`user:handle:${handle}`);
    
    return c.json({ available: !userId });
  } catch (error) {
    console.error('Check handle error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all topic accounts
app.get("/make-server-17285bd7/users/topic-accounts", async (c) => {
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

// Get blocked users
app.get("/make-server-17285bd7/users/blocked", async (c) => {
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
    const blockedUserIds = blocks.map((block: any) => block.blockedId);
    
    return c.json(blockedUserIds);
  } catch (error) {
    console.error('Get blocked users error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== COMMUNITY ENDPOINTS =====

// Get all communities
app.get("/make-server-17285bd7/communities", async (c) => {
  try {
    const communities = await kv.getByPrefix('community:');
    return c.json(communities);
  } catch (error) {
    console.error('Get communities error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get community by ID
app.get("/make-server-17285bd7/communities/:communityId", async (c) => {
  try {
    const communityId = c.req.param('communityId');
    const community = await kv.get(`community:${communityId}`);
    
    if (!community) {
      return c.json({ error: 'Community not found' }, 404);
    }
    
    return c.json(community);
  } catch (error) {
    console.error('Get community error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create community
app.post("/make-server-17285bd7/communities", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const { name, description, type, icon, banner } = await c.req.json();
    
    const communityId = crypto.randomUUID();
    const community = {
      id: communityId,
      name,
      description,
      type: type || 'open',
      icon: icon || '🎮',
      banner: banner || '',
      creatorId: user.id,
      moderatorIds: [],
      memberIds: [user.id],
      memberCount: 1,
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`community:${communityId}`, community);
    
    return c.json(community);
  } catch (error) {
    console.error('Create community error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Join community
app.post("/make-server-17285bd7/communities/:communityId/join", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const communityId = c.req.param('communityId');
    const community = await kv.get(`community:${communityId}`);
    
    if (!community) {
      return c.json({ error: 'Community not found' }, 404);
    }
    
    // Check if already a member
    if (community.memberIds.includes(user.id)) {
      return c.json({ error: 'Already a member' }, 400);
    }
    
    // Add user to community
    community.memberIds.push(user.id);
    community.memberCount = community.memberIds.length;
    await kv.set(`community:${communityId}`, community);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Join community error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Leave community
app.post("/make-server-17285bd7/communities/:communityId/leave", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const communityId = c.req.param('communityId');
    const community = await kv.get(`community:${communityId}`);
    
    if (!community) {
      return c.json({ error: 'Community not found' }, 404);
    }
    
    // Remove user from community
    community.memberIds = community.memberIds.filter((id: string) => id !== user.id);
    community.memberCount = community.memberIds.length;
    await kv.set(`community:${communityId}`, community);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Leave community error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get posts in community
app.get("/make-server-17285bd7/communities/:communityId/posts", async (c) => {
  try {
    const communityId = c.req.param('communityId');
    const allPosts = await kv.getByPrefix('post:');
    const communityPosts = allPosts.filter((post: any) => post.communityId === communityId);
    
    return c.json(communityPosts.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  } catch (error) {
    console.error('Get community posts error:', error);
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
    
    // Can't follow yourself
    if (user.id === targetUserId) {
      return c.json({ error: 'Cannot follow yourself' }, 400);
    }
    
    const followKey = `follow:${user.id}:${targetUserId}`;
    
    // Check if already following
    const existingFollow = await kv.get(followKey);
    if (existingFollow) {
      return c.json({ error: 'Already following' }, 400);
    }
    
    // Create follow relationship
    await kv.set(followKey, {
      followerId: user.id,
      followingId: targetUserId,
      timestamp: new Date().toISOString()
    });
    
    // Update follower counts
    const currentUser = await kv.get(`user:${user.id}`);
    const targetUser = await kv.get(`user:${targetUserId}`);
    
    if (currentUser) {
      currentUser.followingCount = (currentUser.followingCount || 0) + 1;
      await kv.set(`user:${user.id}`, currentUser);
    }
    
    if (targetUser) {
      targetUser.followerCount = (targetUser.followerCount || 0) + 1;
      await kv.set(`user:${targetUserId}`, targetUser);
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
    
    // Update follower counts
    const currentUser = await kv.get(`user:${user.id}`);
    const targetUser = await kv.get(`user:${targetUserId}`);
    
    if (currentUser) {
      currentUser.followingCount = Math.max((currentUser.followingCount || 0) - 1, 0);
      await kv.set(`user:${user.id}`, currentUser);
    }
    
    if (targetUser) {
      targetUser.followerCount = Math.max((targetUser.followerCount || 0) - 1, 0);
      await kv.set(`user:${targetUserId}`, targetUser);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get followers
app.get("/make-server-17285bd7/users/:userId/followers", async (c) => {
  try {
    const userId = c.req.param('userId');
    const allFollows = await kv.getByPrefix('follow:');
    
    // Find all follows where this user is being followed
    const followers = allFollows
      .filter((follow: any) => follow.followingId === userId)
      .map((follow: any) => follow.followerId);
    
    return c.json(followers);
  } catch (error) {
    console.error('Get followers error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get following
app.get("/make-server-17285bd7/users/:userId/following", async (c) => {
  try {
    const userId = c.req.param('userId');
    const follows = await kv.getByPrefix(`follow:${userId}:`);
    
    const following = follows.map((follow: any) => follow.followingId);
    
    return c.json(following);
  } catch (error) {
    console.error('Get following error:', error);
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
    console.error('Check if following error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== REPOST ENDPOINTS =====

// Repost
app.post("/make-server-17285bd7/posts/:postId/repost", async (c) => {
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
    const repostKey = `repost:${user.id}:${postId}`;
    
    // Check if already reposted
    const existingRepost = await kv.get(repostKey);
    if (existingRepost) {
      return c.json({ error: 'Already reposted' }, 400);
    }
    
    // Add repost
    await kv.set(repostKey, { userId: user.id, postId, timestamp: new Date().toISOString() });
    
    // Update post repost count
    const post = await kv.get(`post:${postId}`);
    if (post) {
      post.reposts = (post.reposts || 0) + 1;
      await kv.set(`post:${postId}`, post);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Repost error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Unrepost
app.delete("/make-server-17285bd7/posts/:postId/repost", async (c) => {
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
    const repostKey = `repost:${user.id}:${postId}`;
    
    await kv.del(repostKey);
    
    // Update post repost count
    const post = await kv.get(`post:${postId}`);
    if (post) {
      post.reposts = Math.max((post.reposts || 0) - 1, 0);
      await kv.set(`post:${postId}`, post);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Unrepost error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user's reposts
app.get("/make-server-17285bd7/users/:userId/reposts", async (c) => {
  try {
    const userId = c.req.param('userId');
    const reposts = await kv.getByPrefix(`repost:${userId}:`);
    
    return c.json(reposts.map((repost: any) => repost.postId));
  } catch (error) {
    console.error('Get reposts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== BLUESKY INTEGRATION =====

// Get Bluesky posts for a handle
app.get("/make-server-17285bd7/bluesky/posts/:handle", async (c) => {
  try {
    const handle = c.req.param('handle');
    
    // Fetch from Bluesky API
    const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=10`);
    
    if (!response.ok) {
      console.error('Bluesky API error:', response.status, response.statusText);
      return c.json({ posts: [] });
    }
    
    const data = await response.json();
    
    // Transform Bluesky posts to Forge format
    const posts = data.feed?.map((item: any) => {
      const post = item.post;
      return {
        id: `bluesky-${post.cid}`,
        content: post.record.text || '',
        platform: 'bluesky',
        timestamp: post.record.createdAt,
        likes: post.likeCount || 0,
        reposts: post.repostCount || 0,
        comments: post.replyCount || 0,
        url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
        images: post.embed?.images?.map((img: any) => img.fullsize) || [],
        author: {
          handle: post.author.handle,
          displayName: post.author.displayName,
          avatar: post.author.avatar
        }
      };
    }) || [];
    
    return c.json({ posts });
  } catch (error) {
    console.error('Bluesky fetch error:', error);
    return c.json({ posts: [] });
  }
});

// ===== GAME ENDPOINTS =====

// Search games via IGDB
app.get("/make-server-17285bd7/games/search", async (c) => {
  try {
    const query = c.req.query('q');
    
    if (!query) {
      return c.json({ games: [] });
    }
    
    const clientId = Deno.env.get('IGDB_CLIENT_ID');
    const clientSecret = Deno.env.get('IGDB_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.error('IGDB credentials not configured');
      return c.json({ error: 'IGDB integration not configured' }, 500);
    }
    
    // Get access token
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    
    if (!tokenResponse.ok) {
      console.error('Failed to get IGDB token');
      return c.json({ error: 'Failed to authenticate with IGDB' }, 500);
    }
    
    const { access_token } = await tokenResponse.json();
    
    // Search games
    const gamesResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'text/plain'
      },
      body: `search "${query}"; fields name,cover.url,first_release_date,platforms.name,genres.name; limit 20;`
    });
    
    if (!gamesResponse.ok) {
      console.error('IGDB search failed');
      return c.json({ games: [] });
    }
    
    const games = await gamesResponse.json();
    
    return c.json({ games });
  } catch (error) {
    console.error('Game search error:', error);
    return c.json({ games: [] });
  }
});
// Get game details via IGDB
app.get("/make-server-17285bd7/games/:gameId", async (c) => {
  try {
    const gameId = c.req.param('gameId');
    
    const clientId = Deno.env.get('IGDB_CLIENT_ID');
    const clientSecret = Deno.env.get('IGDB_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.error('IGDB credentials not configured');
      return c.json({ error: 'IGDB integration not configured' }, 500);
    }
    
    // Get access token
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    );
    
    if (!tokenResponse.ok) {
      console.error('Failed to get IGDB token');
      return c.json({ error: 'Failed to authenticate with IGDB' }, 500);
    }
    
    const { access_token } = await tokenResponse.json();
    
    // Get game details
    const gameResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'text/plain'
      },
      body: `where id = ${gameId}; fields name,cover.url,first_release_date,platforms.name,genres.name,summary,storyline,screenshots.url; limit 1;`
    });
    
    if (!gameResponse.ok) {
      console.error('IGDB game fetch failed');
      return c.json({ error: 'Game not found' }, 404);
    }
    
    const games = await gameResponse.json();
    
    if (games.length === 0) {
      return c.json({ error: 'Game not found' }, 404);
    }
    
    return c.json(games[0]);
  } catch (error) {
    console.error('Game details error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== NOTIFICATION ENDPOINTS =====

// Get notifications for user
app.get("/make-server-17285bd7/notifications", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const notifications = await kv.getByPrefix(`notification:${user.id}:`);
    
    return c.json(notifications.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  } catch (error) {
    console.error('Get notifications error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Mark notification as read
app.put("/make-server-17285bd7/notifications/:notificationId/read", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const notificationId = c.req.param('notificationId');
    const notification = await kv.get(`notification:${user.id}:${notificationId}`);
    
    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }
    
    notification.read = true;
    await kv.set(`notification:${user.id}:${notificationId}`, notification);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== ADMIN ENDPOINTS =====

// Get all users (admin only)
app.get("/make-server-17285bd7/admin/users", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // For now, just return all users - in production you'd check admin role
    const users = await kv.getByPrefix('user:');
    
    // Filter out the handle mapping keys
    const actualUsers = users.filter((item: any) => 
      typeof item === 'object' && item.id && item.handle
    );
    
    return c.json(actualUsers);
  } catch (error) {
    console.error('Get all users error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get database stats (admin only)
app.get("/make-server-17285bd7/admin/stats", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const allKeys = await kv.getByPrefix('');
    
    const stats = {
      totalKeys: allKeys.length,
      users: allKeys.filter((k: any) => typeof k === 'object' && k.id?.startsWith('user-')).length,
      posts: allKeys.filter((k: any) => typeof k === 'object' && k.id?.startsWith('post-')).length,
      communities: allKeys.filter((k: any) => typeof k === 'object' && k.id?.startsWith('community-')).length,
      follows: allKeys.filter((k: any) => typeof k === 'object' && k.followerId).length,
      likes: allKeys.filter((k: any) => typeof k === 'object' && k.postId && !k.followerId).length,
    };
    
    return c.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete user (admin only)
app.delete("/make-server-17285bd7/admin/users/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = c.req.param('userId');
    
    // Get user to find their handle
    const user = await kv.get(`user:${userId}`);
    
    if (user && user.handle) {
      // Delete handle mapping
      await kv.del(`user:handle:${user.handle}`);
    }
    
    // Delete user
    await kv.del(`user:${userId}`);
    
    // Delete user's posts
    const posts = await kv.getByPrefix(`post:`);
    for (const post of posts) {
      if (post.userId === userId) {
        await kv.del(`post:${post.id}`);
      }
    }
    
    // Delete follows
    const follows = await kv.getByPrefix(`follow:${userId}:`);
    for (const follow of follows) {
      await kv.del(`follow:${follow.followerId}:${follow.followingId}`);
    }
    
    // Delete blocks
    const blocks = await kv.getByPrefix(`block:${userId}:`);
    for (const block of blocks) {
      await kv.del(`block:${block.blockerId}:${block.blockedId}`);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Reset database (admin only - DANGEROUS)
app.post("/make-server-17285bd7/admin/reset-database", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get all keys
    const allKeys = await kv.getByPrefix('');
    
    // Delete all non-system keys
    for (const item of allKeys) {
      if (typeof item === 'object' && item.id) {
        const keyPrefix = item.id.split('-')[0];
        const keyId = item.id;
        
        if (keyPrefix === 'user') {
          await kv.del(`user:${keyId}`);
        } else if (keyPrefix === 'post') {
          await kv.del(`post:${keyId}`);
        } else if (keyPrefix === 'community') {
          await kv.del(`community:${keyId}`);
        }
      } else if (typeof item === 'object' && item.followerId) {
        await kv.del(`follow:${item.followerId}:${item.followingId}`);
      } else if (typeof item === 'object' && item.blockerId) {
        await kv.del(`block:${item.blockerId}:${item.blockedId}`);
      }
    }
    
    return c.json({ success: true, message: 'Database reset successfully' });
  } catch (error) {
    console.error('Reset database error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== SHARE ENDPOINT =====

// Get share preview data
app.get("/make-server-17285bd7/share/:type/:id", async (c) => {
  try {
    const type = c.req.param('type');
    const id = c.req.param('id');
    
    if (type === 'post') {
      const post = await kv.get(`post:${id}`);
      if (!post) {
        return c.json({ error: 'Post not found' }, 404);
      }
      
      const user = await kv.get(`user:${post.userId}`);
      
      return c.json({
        title: `${user?.displayName || 'User'} on Forge`,
        description: post.content,
        image: post.images?.[0] || user?.profilePicture || '',
        url: `${c.req.url.replace('/make-server-17285bd7/share/', '/share/')}`
      });
    } else if (type === 'user') {
      const user = await kv.get(`user:${id}`);
      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }
      
      return c.json({
        title: `${user.displayName} (${user.handle}) on Forge`,
        description: user.bio || 'Check out this gamer on Forge!',
        image: user.profilePicture || '',
        url: `${c.req.url.replace('/make-server-17285bd7/share/', '/share/')}`
      });
    } else if (type === 'community') {
      const community = await kv.get(`community:${id}`);
      if (!community) {
        return c.json({ error: 'Community not found' }, 404);
      }
      
      return c.json({
        title: `${community.icon} ${community.name} on Forge`,
        description: community.description || 'Join this gaming community on Forge!',
        image: community.banner || '',
        url: `${c.req.url.replace('/make-server-17285bd7/share/', '/share/')}`
      });
    }
    
    return c.json({ error: 'Invalid share type' }, 400);
  } catch (error) {
    console.error('Share preview error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== MESSAGE ENDPOINTS =====

// Get conversations for user
app.get("/make-server-17285bd7/messages/conversations", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    // Get all messages involving this user
    const allMessages = await kv.getByPrefix('message:');
    const userMessages = allMessages.filter((msg: any) => 
      msg.senderId === user.id || msg.recipientId === user.id
    );
    
    // Group by conversation partner
    const conversationMap = new Map();
    
    for (const msg of userMessages) {
      const partnerId = msg.senderId === user.id ? msg.recipientId : msg.senderId;
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, []);
      }
      conversationMap.get(partnerId).push(msg);
    }
    
    // Create conversation objects
    const conversations = [];
    for (const [partnerId, messages] of conversationMap.entries()) {
      const partner = await kv.get(`user:${partnerId}`);
      const sortedMessages = messages.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      conversations.push({
        partnerId,
        partner,
        lastMessage: sortedMessages[0],
        unreadCount: sortedMessages.filter((m: any) => 
          m.recipientId === user.id && !m.read
        ).length
      });
    }
    
    // Sort by most recent message
    conversations.sort((a, b) => 
      new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );
    
    return c.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get messages in a conversation
app.get("/make-server-17285bd7/messages/conversation/:partnerId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const partnerId = c.req.param('partnerId');
    
    // Get all messages between these two users
    const allMessages = await kv.getByPrefix('message:');
    const conversationMessages = allMessages.filter((msg: any) => 
      (msg.senderId === user.id && msg.recipientId === partnerId) ||
      (msg.senderId === partnerId && msg.recipientId === user.id)
    );
    
    // Sort by timestamp
    conversationMessages.sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Mark received messages as read
    for (const msg of conversationMessages) {
      if (msg.recipientId === user.id && !msg.read) {
        msg.read = true;
        await kv.set(`message:${msg.id}`, msg);
      }
    }
    
    return c.json(conversationMessages);
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Send message
app.post("/make-server-17285bd7/messages", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const { recipientId, content } = await c.req.json();
    
    const messageId = crypto.randomUUID();
    const message = {
      id: messageId,
      senderId: user.id,
      recipientId,
      content,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    await kv.set(`message:${messageId}`, message);
    
    return c.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== COMMENT ENDPOINTS =====

// Get comments for a post
app.get("/make-server-17285bd7/posts/:postId/comments", async (c) => {
  try {
    const postId = c.req.param('postId');
    const comments = await kv.getByPrefix(`comment:${postId}:`);
    
    return c.json(comments.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create comment
app.post("/make-server-17285bd7/posts/:postId/comments", async (c) => {
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
    const { content } = await c.req.json();
    
    const commentId = crypto.randomUUID();
    const comment = {
      id: commentId,
      postId,
      userId: user.id,
      content,
      timestamp: new Date().toISOString(),
      likes: 0
    };
    
    await kv.set(`comment:${postId}:${commentId}`, comment);
    
    // Update post comment count
    const post = await kv.get(`post:${postId}`);
    if (post) {
      post.comments = (post.comments || 0) + 1;
      await kv.set(`post:${postId}`, post);
    }
    
    return c.json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete comment
app.delete("/make-server-17285bd7/posts/:postId/comments/:commentId", async (c) => {
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
    const commentId = c.req.param('commentId');
    const comment = await kv.get(`comment:${postId}:${commentId}`);
    
    if (!comment) {
      return c.json({ error: 'Comment not found' }, 404);
    }
    
    // Ensure user can only delete their own comments
    if (comment.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    await kv.del(`comment:${postId}:${commentId}`);
    
    // Update post comment count
    const post = await kv.get(`post:${postId}`);
    if (post) {
      post.comments = Math.max((post.comments || 0) - 1, 0);
      await kv.set(`post:${postId}`, post);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== SETTINGS ENDPOINTS =====

// Get user settings
app.get("/make-server-17285bd7/settings", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const settings = await kv.get(`settings:${user.id}`);
    
    // Return default settings if none exist
    if (!settings) {
      const defaultSettings = {
        userId: user.id,
        theme: 'dark',
        notifications: {
          likes: true,
          comments: true,
          follows: true,
          reposts: true,
          messages: true
        },
        privacy: {
          profileVisibility: 'public',
          messageRequests: true
        },
        hiddenPlatforms: []
      };
      
      await kv.set(`settings:${user.id}`, defaultSettings);
      return c.json(defaultSettings);
    }
    
    return c.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user settings
app.put("/make-server-17285bd7/settings", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const updates = await c.req.json();
    const currentSettings = await kv.get(`settings:${user.id}`) || { userId: user.id };
    
    const updatedSettings = { ...currentSettings, ...updates, userId: user.id };
    await kv.set(`settings:${user.id}`, updatedSettings);
    
    return c.json(updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== GAME LIST ENDPOINTS =====

// Update user's game list
app.put("/make-server-17285bd7/users/:userId/game-list/:listType", async (c) => {
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
    const listType = c.req.param('listType');
    
    // Ensure user can only update their own game lists
    if (user.id !== userId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const { games } = await c.req.json();
    
    const userProfile = await kv.get(`user:${userId}`);
    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update the specific game list
    if (!userProfile.gameLists) {
      userProfile.gameLists = {
        recentlyPlayed: [],
        library: [],
        favorites: [],
        wishlist: []
      };
    }
    
    userProfile.gameLists[listType] = games;
    await kv.set(`user:${userId}`, userProfile);
    
    return c.json(userProfile);
  } catch (error) {
    console.error('Update game list error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== COMMUNITY MANAGEMENT ENDPOINTS =====

// Update community
app.put("/make-server-17285bd7/communities/:communityId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const communityId = c.req.param('communityId');
    const community = await kv.get(`community:${communityId}`);
    
    if (!community) {
      return c.json({ error: 'Community not found' }, 404);
    }
    
    // Only creator or moderators can update community
    if (community.creatorId !== user.id && !community.moderatorIds.includes(user.id)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const updates = await c.req.json();
    const updatedCommunity = { ...community, ...updates, id: communityId };
    await kv.set(`community:${communityId}`, updatedCommunity);
    
    return c.json(updatedCommunity);
  } catch (error) {
    console.error('Update community error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete community
app.delete("/make-server-17285bd7/communities/:communityId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const communityId = c.req.param('communityId');
    const community = await kv.get(`community:${communityId}`);
    
    if (!community) {
      return c.json({ error: 'Community not found' }, 404);
    }
    
    // Only creator can delete community
    if (community.creatorId !== user.id) {
      return c.json({ error: 'Forbidden - Only creator can delete community' }, 403);
    }
    
    await kv.del(`community:${communityId}`);
    
    // Delete community posts
    const posts = await kv.getByPrefix('post:');
    for (const post of posts) {
      if (post.communityId === communityId) {
        await kv.del(`post:${post.id}`);
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete community error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add moderator to community
app.post("/make-server-17285bd7/communities/:communityId/moderators/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const communityId = c.req.param('communityId');
    const targetUserId = c.req.param('userId');
    const community = await kv.get(`community:${communityId}`);
    
    if (!community) {
      return c.json({ error: 'Community not found' }, 404);
    }
    
    // Only creator can add moderators
    if (community.creatorId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    if (!community.moderatorIds.includes(targetUserId)) {
      community.moderatorIds.push(targetUserId);
      await kv.set(`community:${communityId}`, community);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Add moderator error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Remove moderator from community
app.delete("/make-server-17285bd7/communities/:communityId/moderators/:userId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const communityId = c.req.param('communityId');
    const targetUserId = c.req.param('userId');
    const community = await kv.get(`community:${communityId}`);
    
    if (!community) {
      return c.json({ error: 'Community not found' }, 404);
    }
    
    // Only creator can remove moderators
    if (community.creatorId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    community.moderatorIds = community.moderatorIds.filter((id: string) => id !== targetUserId);
    await kv.set(`community:${communityId}`, community);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Remove moderator error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ===== HEALTH CHECK =====

app.get("/make-server-17285bd7/health", (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Forge API is running'
  });
});

// ===== 404 HANDLER =====

app.all("*", (c) => {
  console.log('[404] Unmatched route:', c.req.method, c.req.url);
  return c.json({ 
    error: 'Not found',
    path: c.req.path,
    method: c.req.method 
  }, 404);
});

// ===== START SERVER =====

console.log('🚀 Starting Forge server...');
console.log('📦 Storage buckets initialized');
console.log('🔥 All routes registered');

Deno.serve(app.fetch);