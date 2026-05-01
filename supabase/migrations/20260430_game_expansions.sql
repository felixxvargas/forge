-- Add parent/expansion relationship columns to games table
ALTER TABLE forge_games_17285bd7
  ADD COLUMN IF NOT EXISTS parent_game_id TEXT REFERENCES forge_games_17285bd7(id),
  ADD COLUMN IF NOT EXISTS game_category INT; -- IGDB category: 0=main, 2=expansion, 4=standalone_expansion

CREATE INDEX IF NOT EXISTS idx_games_parent_game_id ON forge_games_17285bd7(parent_game_id);
