-- Allow service_role (cron jobs, admin API) to insert posts on behalf of users.
-- The application layer enforces the correct user_id; auth.uid() is null for
-- service_role JWT in PostgREST, which fails the existing auth.uid() = user_id check.
CREATE POLICY "service_role_insert" ON public.posts
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);
