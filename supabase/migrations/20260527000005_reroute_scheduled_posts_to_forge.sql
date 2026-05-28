-- Reassign all pending/failed scheduled posts from @felix to @forge.
UPDATE public.scheduled_posts
SET user_id = (SELECT id FROM public.profiles WHERE handle = 'forge')
WHERE status IN ('pending', 'failed');

-- For the scheduled post that was already published from @felix:
-- 1. Insert an identical post attributed to @forge
-- 2. Update the scheduled_post record to point to the new post + set the correct user
-- 3. Delete the original @felix post
WITH
felix_post AS (
  SELECT p.id, p.content, p.images, p.image_alts,
         p.game_ids, p.game_titles, p.game_id, p.game_title, p.url
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE pr.handle = 'felix'
    AND p.id IN (
      SELECT published_post_id
      FROM public.scheduled_posts
      WHERE status = 'published' AND published_post_id IS NOT NULL
    )
  ORDER BY p.created_at DESC
  LIMIT 1
),
new_post AS (
  INSERT INTO public.posts (user_id, content, images, image_alts,
                            game_ids, game_titles, game_id, game_title, url)
  SELECT
    (SELECT id FROM public.profiles WHERE handle = 'forge'),
    content, images, image_alts,
    game_ids, game_titles, game_id, game_title, url
  FROM felix_post
  RETURNING id
),
update_scheduled AS (
  UPDATE public.scheduled_posts
  SET user_id       = (SELECT id FROM public.profiles WHERE handle = 'forge'),
      published_post_id = (SELECT id FROM new_post)
  WHERE published_post_id = (SELECT id FROM felix_post)
)
DELETE FROM public.posts WHERE id = (SELECT id FROM felix_post);
