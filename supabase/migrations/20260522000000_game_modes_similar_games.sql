ALTER TABLE forge_games_17285bd7
  ADD COLUMN IF NOT EXISTS game_modes text[],
  ADD COLUMN IF NOT EXISTS igdb_similar_game_ids integer[];
