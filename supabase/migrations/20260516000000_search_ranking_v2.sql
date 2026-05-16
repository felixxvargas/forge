-- Search ranking v2: prioritise word-boundary matches and games with cover art
-- Replaces the original search_games_ranked function in 20260513000002.

CREATE OR REPLACE FUNCTION search_games_ranked(
  p_query text,
  p_limit integer DEFAULT 40
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
      g.title ILIKE '%' || p_query || '%'
      OR similarity(g.title, p_query) > 0.1
    )
  ORDER BY
    -- Tier 1: title starts with the query word (e.g. "World of Warcraft" for "world")
    CASE WHEN lower(g.title) LIKE lower(p_query) || '%' THEN 0 ELSE 1 END,
    -- Tier 2: query appears as a whole word anywhere in the title
    CASE WHEN lower(g.title) ~* ('\m' || lower(p_query) || '\M') THEN 0 ELSE 1 END,
    -- Tier 3: trigram similarity descending
    similarity(g.title, p_query) DESC,
    -- Tier 4: games with cover art rank above art-less entries
    CASE WHEN EXISTS (
      SELECT 1 FROM forge_game_artwork_17285bd7 a WHERE a.game_id = g.id
    ) THEN 0 ELSE 1 END,
    -- Tier 5: popularity score
    g.popularity_score DESC,
    g.title ASC
  LIMIT p_limit;
$$;
