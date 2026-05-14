-- Phase 3 search: popularity_score column + child-game inheritance
-- Adds a precomputed score to forge_games_17285bd7 that is used by search
-- and trending to rank parent games above their children.
--
-- Score formula per game:
--   base = (posts_tagged × 3) + (library_entries × 2)
--   final = base + SUM(child.base × 0.5)  [parent inherits half of each child's score]
--
-- Refreshed daily at 03:00 UTC by pg_cron (requires cron extension — see NOTE below).
-- If pg_cron is not enabled on your plan, call SELECT refresh_game_popularity_scores()
-- manually or wire a Supabase Edge Function cron instead.

ALTER TABLE forge_games_17285bd7
  ADD COLUMN IF NOT EXISTS popularity_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_games_popularity
  ON forge_games_17285bd7 (popularity_score DESC);

-- ──────────────────────────────────────────────────────────────
-- SQL function that recomputes all scores in one pass
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_game_popularity_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH
  -- Posts: game_ids array (current) or legacy game_id column
  post_tags AS (
    SELECT unnest(game_ids) AS game_id
    FROM posts
    WHERE game_ids IS NOT NULL AND cardinality(game_ids) > 0
    UNION ALL
    SELECT game_id
    FROM posts
    WHERE game_id IS NOT NULL
      AND (game_ids IS NULL OR cardinality(game_ids) = 0)
  ),
  post_scores AS (
    SELECT game_id, count(*)::integer * 3 AS score
    FROM post_tags
    GROUP BY game_id
  ),
  -- Library: every row in user_games represents one player
  library_scores AS (
    SELECT game_id, count(*)::integer * 2 AS score
    FROM user_games
    GROUP BY game_id
  ),
  -- Base score per game
  base AS (
    SELECT
      g.id,
      COALESCE(p.score, 0) + COALESCE(l.score, 0) AS base_score
    FROM forge_games_17285bd7 g
    LEFT JOIN post_scores   p ON p.game_id = g.id
    LEFT JOIN library_scores l ON l.game_id = g.id
  ),
  -- Parent bonus: sum of 50 % of each child's base score
  parent_bonus AS (
    SELECT
      g.parent_game_id                       AS parent_id,
      (sum(b.base_score) * 0.5)::integer     AS bonus
    FROM forge_games_17285bd7 g
    JOIN base b ON b.id = g.id
    WHERE g.parent_game_id IS NOT NULL
    GROUP BY g.parent_game_id
  )
  UPDATE forge_games_17285bd7 gm
  SET    popularity_score = COALESCE(b.base_score, 0) + COALESCE(pb.bonus, 0)
  FROM   base b
  LEFT   JOIN parent_bonus pb ON pb.parent_id = b.id
  WHERE  gm.id = b.id;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- pg_trgm-aware search RPC used by the edge function
-- Returns games ordered by: similarity DESC, popularity DESC
-- Falls back gracefully if similarity is low (threshold 0.1).
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_games_ranked(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id               text,
  title            text,
  year             integer,
  description      text,
  genres           text[],
  platforms        text[],
  igdb_id          integer,
  game_category    integer,
  parent_game_id   text,
  hidden           boolean,
  popularity_score integer,
  sim              real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    g.id, g.title, g.year, g.description, g.genres, g.platforms,
    g.igdb_id, g.game_category, g.parent_game_id, g.hidden,
    g.popularity_score,
    similarity(g.title, p_query) AS sim
  FROM forge_games_17285bd7 g
  WHERE
    (g.hidden IS NULL OR g.hidden = false)
    AND (
      g.title ILIKE '%' || p_query || '%'          -- exact substring (fast, catches short queries)
      OR similarity(g.title, p_query) > 0.1         -- trigram fuzzy match
    )
  ORDER BY
    similarity(g.title, p_query) DESC,
    g.popularity_score              DESC,
    g.title                         ASC
  LIMIT p_limit;
$$;

-- ──────────────────────────────────────────────────────────────
-- Seed initial scores so search is useful right away
-- ──────────────────────────────────────────────────────────────
SELECT refresh_game_popularity_scores();

-- ──────────────────────────────────────────────────────────────
-- pg_cron daily schedule (needs cron extension enabled)
-- On Supabase Pro: Extensions → pg_cron → enable, then this runs.
-- If the extension isn't present this block is skipped via DO.
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'refresh-game-popularity',
      '0 3 * * *',
      'SELECT refresh_game_popularity_scores()'
    );
  END IF;
END;
$$;
