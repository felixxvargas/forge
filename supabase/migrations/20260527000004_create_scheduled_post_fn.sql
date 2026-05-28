-- SECURITY DEFINER function for publishing scheduled posts.
-- Runs as the function owner (postgres), bypassing RLS on the posts table.
-- Used by both the cron job and the admin run_selected action.
CREATE OR REPLACE FUNCTION public.create_scheduled_post(
  p_user_id    uuid,
  p_content    text,
  p_images     text[],
  p_image_alts text[],
  p_game_ids   text[],
  p_game_titles text[],
  p_game_id    text,
  p_game_title text,
  p_url        text
) RETURNS TABLE (id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.posts (
    user_id, content, images, image_alts,
    game_ids, game_titles, game_id, game_title, url
  )
  VALUES (
    p_user_id, p_content, p_images, p_image_alts,
    p_game_ids, p_game_titles, p_game_id, p_game_title, p_url
  )
  RETURNING posts.id;
END;
$$;
