-- Create the Forge Support account profile
-- Note: this inserts into profiles only. An Auth user must be created separately
-- via the Supabase dashboard (Authentication → Users → Invite user)
-- using support@forge-social.app, then link it by updating the id below.

-- Insert profile only if the auth user exists (must be created manually first via Supabase dashboard)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000002') THEN
    INSERT INTO public.profiles (id, handle, display_name, bio, profile_picture, created_at)
    VALUES (
      'a0000000-0000-0000-0000-000000000002',
      'forgesupport',
      'Forge Support',
      'Official Forge support account. Having trouble with the app? Send us a message and we''ll help you out.',
      'https://www.forge-social.app/apple-touch-icon.png',
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      handle          = EXCLUDED.handle,
      display_name    = EXCLUDED.display_name,
      bio             = EXCLUDED.bio,
      profile_picture = EXCLUDED.profile_picture;
  END IF;
END $$;
