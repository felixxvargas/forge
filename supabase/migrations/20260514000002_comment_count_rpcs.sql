CREATE OR REPLACE FUNCTION increment_comment_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET comment_count = COALESCE(comment_count, 0) + 1 WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_comment_count(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE posts SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) WHERE id = post_id;
END;
$$;
