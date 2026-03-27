-- Atomic engagement count RPCs with SECURITY DEFINER to bypass RLS
-- These allow any authenticated user to increment/decrement engagement counts
-- on posts they interact with (like, repost, comment), without needing
-- UPDATE permission on the post itself.

CREATE OR REPLACE FUNCTION increment_like_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET like_count = GREATEST(0, COALESCE(like_count, 0) + 1) WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_like_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_repost_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET repost_count = GREATEST(0, COALESCE(repost_count, 0) + 1) WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_repost_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET repost_count = GREATEST(0, COALESCE(repost_count, 0) - 1) WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_comment_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET comment_count = GREATEST(0, COALESCE(comment_count, 0) + 1) WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_comment_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1) WHERE id = post_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_like_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_like_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_repost_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_repost_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_comment_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_comment_count(uuid) TO authenticated;
