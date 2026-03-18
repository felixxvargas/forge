-- Forge - Game Data Schema for Supabase
-- This schema stores game information and artwork sourced from IGDB

-- Games table - stores core game information
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

-- Sample data insert (you can add more games later)
-- Note: IGDB artwork URLs will be fetched via API and stored here

COMMENT ON TABLE forge_games_17285bd7 IS 'Stores game information sourced from IGDB and other databases';
COMMENT ON TABLE forge_game_artwork_17285bd7 IS 'Stores game cover art and screenshots with IGDB URLs';