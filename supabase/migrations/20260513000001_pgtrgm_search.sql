-- Phase 2 search: pg_trgm fuzzy matching
-- Enables similarity() function for typo-tolerant game title search.
-- GIN index makes similarity queries fast even on large tables.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on game titles for fast similarity search
CREATE INDEX IF NOT EXISTS idx_games_title_trgm
  ON forge_games_17285bd7
  USING GIN (title gin_trgm_ops);

-- Also index on lower(title) for case-insensitive prefix queries
CREATE INDEX IF NOT EXISTS idx_games_title_lower
  ON forge_games_17285bd7 ((lower(title)));
