-- Allow authenticated users to delete their own posts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'posts' AND policyname = 'Users delete own posts'
  ) THEN
    CREATE POLICY "Users delete own posts"
      ON public.posts
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
