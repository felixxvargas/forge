-- Postgres trigger to keep follower_count / following_count on profiles
-- perfectly in sync with the follows table, replacing the unreliable
-- app-layer fire-and-forget sync.

CREATE OR REPLACE FUNCTION public.sync_follow_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
      SET follower_count  = (SELECT COUNT(*) FROM public.follows WHERE following_id = NEW.following_id)
      WHERE id = NEW.following_id;
    UPDATE public.profiles
      SET following_count = (SELECT COUNT(*) FROM public.follows WHERE follower_id  = NEW.follower_id)
      WHERE id = NEW.follower_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
      SET follower_count  = (SELECT COUNT(*) FROM public.follows WHERE following_id = OLD.following_id)
      WHERE id = OLD.following_id;
    UPDATE public.profiles
      SET following_count = (SELECT COUNT(*) FROM public.follows WHERE follower_id  = OLD.follower_id)
      WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_follow_counts ON public.follows;

CREATE TRIGGER trg_sync_follow_counts
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.sync_follow_counts();

-- Backfill: fix all stale cached counts to match the follows table right now.
UPDATE public.profiles
  SET follower_count  = (SELECT COUNT(*) FROM public.follows WHERE following_id = profiles.id),
      following_count = (SELECT COUNT(*) FROM public.follows WHERE follower_id  = profiles.id);
