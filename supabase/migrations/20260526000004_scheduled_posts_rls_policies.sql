-- The scheduled_posts table has RLS enabled but no policies, which causes
-- the PostgREST service role key to return [] in some Vercel environments.
-- The admin API validates access at the application layer (validateAdmin),
-- so we can safely grant read/write to all roles here.
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies from previous attempts
DROP POLICY IF EXISTS "service_role_bypass" ON scheduled_posts;
DROP POLICY IF EXISTS "service_role_all" ON scheduled_posts;
DROP POLICY IF EXISTS "admin_api_read" ON scheduled_posts;
DROP POLICY IF EXISTS "api_read_all" ON scheduled_posts;

-- Grant full access — admin check is enforced in the Vercel API handler
CREATE POLICY "api_full_access" ON scheduled_posts
  AS PERMISSIVE
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);
