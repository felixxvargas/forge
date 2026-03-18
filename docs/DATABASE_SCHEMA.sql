-- Forge - Database Schema
-- Complete database structure for the Forge gaming social network
-- Last Updated: March 13, 2026

-- ============================================================================
-- KEY-VALUE STORE TABLE
-- ============================================================================
-- This is the main table used for storing all app data in a flexible key-value format

CREATE TABLE IF NOT EXISTS kv_store_17285bd7 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_kv_key_prefix ON kv_store_17285bd7(key text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_kv_created_at ON kv_store_17285bd7(created_at);
CREATE INDEX IF NOT EXISTS idx_kv_updated_at ON kv_store_17285bd7(updated_at);

-- Enable Row Level Security
ALTER TABLE kv_store_17285bd7 ENABLE ROW LEVEL SECURITY;

-- Policies for KV store (public read for most data)
CREATE POLICY "Public read access" ON kv_store_17285bd7
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert" ON kv_store_17285bd7
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON kv_store_17285bd7
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete" ON kv_store_17285bd7
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- KEY-VALUE STORE PATTERNS
-- ============================================================================

-- User Profiles
-- Key: user:{userId}
-- Value: {
--   id: string,
--   handle: string,
--   displayName: string,
--   pronouns?: string,
--   bio: string,
--   about?: string,
--   profilePicture: string,
--   bannerImage?: string,
--   email?: string,
--   platforms: Platform[],
--   platformHandles: Record<Platform, string>,
--   showPlatformHandles: Record<Platform, boolean>,
--   socialPlatforms: SocialPlatform[],
--   socialHandles: Record<SocialPlatform, string>,
--   showSocialHandles: Record<SocialPlatform, boolean>,
--   gameLists: {
--     recentlyPlayed: Game[],
--     library: Game[],
--     favorites: Game[],
--     wishlist: Game[]
--   },
--   followerCount: number,
--   followingCount: number,
--   communities: CommunityMembership[],
--   displayedCommunities: string[],
--   interests: Interest[],
--   accountType?: 'topic' | 'user',
--   authProvider?: 'email' | 'google',
--   blueskyHandle?: string,
--   createdAt: string,
--   updatedAt: string
-- }

-- Handle Lookup
-- Key: user:handle:{@handle}
-- Value: userId (string)

-- Posts
-- Key: post:{postId}
-- Value: {
--   id: string,
--   userId: string,
--   content: string,
--   platform: SocialPlatform | 'forge',
--   timestamp: string,
--   likes: number,
--   reposts: number,
--   comments: number,
--   images?: string[],
--   imageAlts?: string[],
--   url?: string,
--   video?: string,
--   communityId?: string,
--   createdAt: string
-- }

-- Likes
-- Key: like:{userId}:{postId}
-- Value: {
--   userId: string,
--   postId: string,
--   timestamp: string
-- }

-- Follows
-- Key: follow:{followerId}:{followingId}
-- Value: {
--   followerId: string,
--   followingId: string,
--   timestamp: string
-- }

-- Blocks
-- Key: block:{userId}:{blockedId}
-- Value: {
--   userId: string,
--   blockedId: string,
--   timestamp: string
-- }

-- Mutes (Users)
-- Key: mute:{userId}:{mutedId}
-- Value: {
--   userId: string,
--   mutedId: string,
--   timestamp: string
-- }

-- Mutes (Posts)
-- Key: mute-post:{userId}:{postId}
-- Value: {
--   userId: string,
--   postId: string,
--   timestamp: string
-- }

-- Reports
-- Key: report:{reportId}
-- Value: {
--   id: string,
--   reporterId: string,
--   reportedUserId: string,
--   reason: string,
--   description?: string,
--   timestamp: string,
--   status: 'pending' | 'reviewed' | 'resolved'
-- }

-- Communities (Groups)
-- Key: community:{communityId}
-- Value: {
--   id: string,
--   name: string,
--   description: string,
--   type: 'open' | 'request' | 'invite',
--   icon: string,
--   banner?: string,
--   creatorId: string,
--   moderatorIds: string[],
--   memberIds: string[],
--   memberCount: number,
--   createdAt: string
-- }

-- Community Memberships
-- Key: member:{communityId}:{userId}
-- Value: {
--   communityId: string,
--   userId: string,
--   role: 'creator' | 'moderator' | 'member',
--   joinedAt: string
-- }

-- ============================================================================
-- GAMES TABLE (Separate from KV Store)
-- ============================================================================
-- Stores game information and artwork sourced from IGDB

CREATE TABLE IF NOT EXISTS forge_games_17285bd7 (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  igdb_id INTEGER UNIQUE, -- IGDB game ID
  year INTEGER,
  description TEXT,
  genres TEXT[], -- Array of genre names
  platforms TEXT[], -- Array of platform names
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game artwork table - stores cover art and screenshots
CREATE TABLE IF NOT EXISTS forge_game_artwork_17285bd7 (
  id SERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES forge_games_17285bd7(id) ON DELETE CASCADE,
  artwork_type TEXT NOT NULL CHECK (artwork_type IN ('cover', 'screenshot', 'banner')),
  url TEXT NOT NULL,
  platform TEXT, -- Specific platform this artwork is for (optional)
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_igdb_id ON forge_games_17285bd7(igdb_id);
CREATE INDEX IF NOT EXISTS idx_games_title ON forge_games_17285bd7(title);
CREATE INDEX IF NOT EXISTS idx_artwork_game_id ON forge_game_artwork_17285bd7(game_id);
CREATE INDEX IF NOT EXISTS idx_artwork_type ON forge_game_artwork_17285bd7(artwork_type);

-- Enable Row Level Security (RLS)
ALTER TABLE forge_games_17285bd7 ENABLE ROW LEVEL SECURITY;
ALTER TABLE forge_game_artwork_17285bd7 ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (anyone can view games)
CREATE POLICY "Public can read games" ON forge_games_17285bd7
  FOR SELECT USING (true);

CREATE POLICY "Public can read artwork" ON forge_game_artwork_17285bd7
  FOR SELECT USING (true);

-- Only authenticated users can insert/update (for future admin features)
CREATE POLICY "Authenticated can insert games" ON forge_games_17285bd7
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update games" ON forge_games_17285bd7
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert artwork" ON forge_game_artwork_17285bd7
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update artwork" ON forge_game_artwork_17285bd7
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE kv_store_17285bd7 IS 'Main key-value store for all app data (users, posts, follows, etc.)';
COMMENT ON TABLE forge_games_17285bd7 IS 'Stores game information sourced from IGDB and other databases';
COMMENT ON TABLE forge_game_artwork_17285bd7 IS 'Stores game cover art and screenshots with IGDB URLs';

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Get user by ID
-- SELECT value FROM kv_store_17285bd7 WHERE key = 'user:user-123';

-- Get user by handle
-- SELECT value FROM kv_store_17285bd7 WHERE key = 'user:handle:@username';

-- Get all posts (prefix search)
-- SELECT * FROM kv_store_17285bd7 WHERE key LIKE 'post:%';

-- Get all follows for a user
-- SELECT * FROM kv_store_17285bd7 WHERE key LIKE 'follow:user-123:%';

-- Get all likes for a post
-- SELECT * FROM kv_store_17285bd7 WHERE key LIKE 'like:%:post-456';

-- ============================================================================
-- MIGRATIONS & UPDATES
-- ============================================================================

-- This schema file is for reference only
-- Actual migrations should be run through Supabase dashboard or CLI
-- The kv_store table should already exist in your Supabase project

-- To initialize:
-- 1. Ensure kv_store_17285bd7 table exists
-- 2. Run seed endpoint to create topic accounts
-- 3. Create game tables (if not exists)
-- 4. Verify indexes are in place

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to KV store
CREATE TRIGGER update_kv_store_updated_at BEFORE UPDATE ON kv_store_17285bd7
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to games
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON forge_games_17285bd7
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
