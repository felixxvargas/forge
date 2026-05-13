-- Stream archives v2
-- Deploy order: 1) this migration, 2) edge function, 3) frontend

-- Add columns that were missing from the original migration
ALTER TABLE stream_archives
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS twitch_vod_url text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS twitch_archive_auto_post boolean DEFAULT false;

-- Rename download_status → publish_status (idempotent)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stream_archives' AND column_name = 'download_status'
  ) THEN
    ALTER TABLE stream_archives RENAME COLUMN download_status TO publish_status;
  END IF;
END $$;

-- Ensure publish_status column exists (if the rename above was a no-op and it also didn't exist)
ALTER TABLE stream_archives ADD COLUMN IF NOT EXISTS publish_status text DEFAULT 'unpublished';
ALTER TABLE stream_archives ALTER COLUMN publish_status SET DEFAULT 'unpublished';

-- Backfill: old pending/downloading/failed → unpublished; old ready → published
UPDATE stream_archives SET publish_status = 'unpublished'
  WHERE publish_status IN ('pending', 'downloading', 'failed') OR publish_status IS NULL;

UPDATE stream_archives SET publish_status = 'published'
  WHERE publish_status = 'ready' OR is_public = true;

-- Allow other users to view public archives (for profile pages)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'stream_archives' AND policyname = 'Public archives viewable by anyone'
  ) THEN
    CREATE POLICY "Public archives viewable by anyone" ON stream_archives
      FOR SELECT USING (is_public = true AND deleted_at IS NULL);
  END IF;
END $$;

-- Index for public archive queries
CREATE INDEX IF NOT EXISTS stream_archives_public_idx
  ON stream_archives(user_id) WHERE is_public = true AND deleted_at IS NULL;
