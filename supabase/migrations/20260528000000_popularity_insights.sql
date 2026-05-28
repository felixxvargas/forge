-- Add game_insights to the popularity score formula.
-- Approved insights contribute 5 points; pending contribute 1.
-- Replaces the existing refresh_game_popularity_scores() function.

CREATE OR REPLACE FUNCTION refresh_game_popularity_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH
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
  library_scores AS (
    SELECT game_id, count(*)::integer * 2 AS score
    FROM user_games
    GROUP BY game_id
  ),
  insight_scores AS (
    SELECT
      game_id,
      (count(*) FILTER (WHERE status = 'approved') * 5
       + count(*) FILTER (WHERE status = 'pending') * 1)::integer AS score
    FROM game_insights
    GROUP BY game_id
  ),
  base AS (
    SELECT
      g.id,
      COALESCE(p.score, 0) + COALESCE(l.score, 0) + COALESCE(i.score, 0) AS base_score
    FROM forge_games_17285bd7 g
    LEFT JOIN post_scores    p ON p.game_id = g.id
    LEFT JOIN library_scores l ON l.game_id = g.id
    LEFT JOIN insight_scores i ON i.game_id = g.id
  ),
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

SELECT refresh_game_popularity_scores();
