-- Add is_admin column to profiles (was referenced in API code but never created via migration)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Grant admin to the Forge owner account
UPDATE profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'felixvgiles@gmail.com'
);
