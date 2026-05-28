-- Fix Kingdom Hearts II cover art not appearing on posts.
-- Reassigns the game_id on affected posts to match whatever ID is in
-- forge_games_17285bd7, so PostCard's getGame() lookup finds the artwork row.

DO $$
DECLARE
  correct_id   text;
  correct_title text;
BEGIN
  SELECT id, title INTO correct_id, correct_title
  FROM forge_games_17285bd7
  WHERE lower(title) IN ('kingdom hearts ii', 'kingdom hearts 2')
  ORDER BY (id LIKE 'igdb-%') DESC
  LIMIT 1;

  IF correct_id IS NULL THEN
    RAISE NOTICE 'Kingdom Hearts II not found in forge_games — skipping';
    RETURN;
  END IF;

  UPDATE public.posts
  SET
    game_id     = correct_id,
    game_title  = correct_title,
    game_ids    = ARRAY[correct_id],
    game_titles = ARRAY[correct_title]
  WHERE
    (
      lower(game_title) IN ('kingdom hearts ii', 'kingdom hearts 2')
      OR lower(game_titles::text) LIKE '%kingdom hearts ii%'
      OR lower(game_titles::text) LIKE '%kingdom hearts 2%'
    )
    AND game_id IS DISTINCT FROM correct_id;

  RAISE NOTICE 'Updated KH2 posts to use game_id=%', correct_id;
END $$;
