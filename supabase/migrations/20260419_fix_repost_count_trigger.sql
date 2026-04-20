-- Fix repost_count trigger to include quote posts in the count, matching sync_repost_count RPC.
-- Also adds triggers on posts (INSERT/DELETE of quote posts) to keep repost_count accurate.
-- Run this in the Supabase dashboard SQL editor.

-- Step 1: Update the reposts trigger function to include quote posts
CREATE OR REPLACE FUNCTION public.fn_update_repost_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
BEGIN
  v_post_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.post_id ELSE NEW.post_id END;
  UPDATE public.posts
  SET repost_count = (
    SELECT COUNT(*) FROM public.reposts WHERE post_id = v_post_id
  ) + (
    SELECT COUNT(*) FROM public.posts WHERE quote_post_id = v_post_id
  )
  WHERE id = v_post_id;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Step 2: Add triggers on posts to update repost_count when a quote post is created/deleted.
-- Note: TG_OP cannot be used in the WHEN clause of CREATE TRIGGER, so we use two separate triggers.

DROP TRIGGER IF EXISTS trg_quote_repost_count_insert ON public.posts;
DROP TRIGGER IF EXISTS trg_quote_repost_count_delete ON public.posts;
DROP TRIGGER IF EXISTS trg_quote_repost_count ON public.posts;
DROP FUNCTION IF EXISTS public.fn_update_repost_count_on_quote();

CREATE OR REPLACE FUNCTION public.fn_update_repost_count_on_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quoted_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_quoted_id := NEW.quote_post_id;
  ELSE
    v_quoted_id := OLD.quote_post_id;
  END IF;

  IF v_quoted_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  UPDATE public.posts
  SET repost_count = (
    SELECT COUNT(*) FROM public.reposts WHERE post_id = v_quoted_id
  ) + (
    SELECT COUNT(*) FROM public.posts WHERE quote_post_id = v_quoted_id
  )
  WHERE id = v_quoted_id;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Separate INSERT trigger (WHEN clause can only reference NEW for INSERT triggers)
CREATE TRIGGER trg_quote_repost_count_insert
AFTER INSERT ON public.posts
FOR EACH ROW
WHEN (NEW.quote_post_id IS NOT NULL)
EXECUTE FUNCTION public.fn_update_repost_count_on_quote();

-- Separate DELETE trigger (WHEN clause can only reference OLD for DELETE triggers)
CREATE TRIGGER trg_quote_repost_count_delete
AFTER DELETE ON public.posts
FOR EACH ROW
WHEN (OLD.quote_post_id IS NOT NULL)
EXECUTE FUNCTION public.fn_update_repost_count_on_quote();

-- Step 3: Resync all existing repost counts to fix any stale values
UPDATE public.posts p
SET repost_count = (
  SELECT COUNT(*) FROM public.reposts WHERE post_id = p.id
) + (
  SELECT COUNT(*) FROM public.posts q WHERE q.quote_post_id = p.id
);
