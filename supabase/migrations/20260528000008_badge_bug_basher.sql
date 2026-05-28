ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_bug_basher_at timestamptz;
