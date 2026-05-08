-- Maintain repost_count on posts table via a SECURITY DEFINER trigger so that
-- a user who reposts a post they don't own can still increment the count
-- (bypasses RLS which would otherwise block the UPDATE).

-- Drop any pre-existing version to avoid conflicts
DROP TRIGGER IF EXISTS trg_repost_count ON public.reposts;
DROP FUNCTION IF EXISTS public.fn_update_repost_count();

CREATE OR REPLACE FUNCTION public.fn_update_repost_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as the function owner, bypasses RLS
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET repost_count = (
      SELECT COUNT(*) FROM public.reposts WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET repost_count = GREATEST(0, (
      SELECT COUNT(*) FROM public.reposts WHERE post_id = OLD.post_id
    ))
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_repost_count
AFTER INSERT OR DELETE ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.fn_update_repost_count();
