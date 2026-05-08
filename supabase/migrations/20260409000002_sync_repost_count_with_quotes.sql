-- Update sync_repost_count to include quote posts in the repost_count.
-- Quote posts (posts.quote_post_id = p_post_id) count toward repost_count
-- alongside standard reposts (reposts.post_id = p_post_id).
-- Run this in the Supabase dashboard SQL editor to apply.

CREATE OR REPLACE FUNCTION public.sync_repost_count(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET repost_count = (
    SELECT COUNT(*) FROM public.reposts WHERE post_id = p_post_id
  ) + (
    SELECT COUNT(*) FROM public.posts WHERE quote_post_id = p_post_id
  )
  WHERE id = p_post_id;
END;
$$;
