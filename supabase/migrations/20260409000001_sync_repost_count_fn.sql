-- SECURITY DEFINER RPC function to sync repost_count on the posts table.
-- Bypasses RLS which prevents users from updating posts they don't own.
-- Called from the client via supabase.rpc('sync_repost_count', { p_post_id: ... })
-- after every repost insert or delete.

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
  )
  WHERE id = p_post_id;
END;
$$;
