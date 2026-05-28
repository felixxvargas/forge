-- Fix game_insights author join.
-- The original FK pointed to auth.users, which PostgREST cannot traverse to reach
-- public.profiles. Re-point to public.profiles so the embedded select
--   author:profiles!user_id(id,handle,display_name,profile_picture)
-- resolves correctly.

ALTER TABLE public.game_insights
  DROP CONSTRAINT IF EXISTS game_insights_user_id_fkey,
  ADD CONSTRAINT game_insights_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
