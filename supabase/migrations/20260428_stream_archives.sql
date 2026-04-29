-- Twitch VOD archive feature

-- Stream archives table
CREATE TABLE IF NOT EXISTS stream_archives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  twitch_vod_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  duration_seconds integer NOT NULL DEFAULT 0,
  thumbnail_url text,
  storage_path text,
  download_status text DEFAULT 'pending',
  recorded_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  retention_prompted_at timestamptz,
  deleted_at timestamptz,
  UNIQUE(user_id, twitch_vod_id)
);

ALTER TABLE stream_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own archives" ON stream_archives
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users delete own archives" ON stream_archives
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users update own archives" ON stream_archives
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role insert archives" ON stream_archives
  FOR INSERT WITH CHECK (true);

-- Twitch integration columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS twitch_user_id text,
  ADD COLUMN IF NOT EXISTS twitch_display_name text,
  ADD COLUMN IF NOT EXISTS twitch_access_token text,
  ADD COLUMN IF NOT EXISTS twitch_refresh_token text,
  ADD COLUMN IF NOT EXISTS twitch_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS twitch_archive_enabled boolean DEFAULT false;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS stream_archives_user_id_idx ON stream_archives(user_id);
CREATE INDEX IF NOT EXISTS stream_archives_recorded_at_idx ON stream_archives(recorded_at DESC);
