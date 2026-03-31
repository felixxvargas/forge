-- Visibility settings and account state columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lists_public   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS posts_public   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS suspended      boolean NOT NULL DEFAULT false;

-- RPC: permanently delete the calling user's own auth account.
-- Cascade deletes on profiles and related tables will clean up all user data.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
