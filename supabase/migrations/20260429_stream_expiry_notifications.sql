-- Add metadata column to notifications for extra context (used by stream_expiry type)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Enable pg_cron extension (already enabled on most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Daily job at 9 AM UTC: create stream_expiry notifications for archives that are 1+ year old.
-- Uses post_id to store the archive UUID so the notification can link back to it.
-- Won't create a duplicate if an unread notification for the same archive was created in the last 7 days.
SELECT cron.schedule(
  'stream-archive-expiry-notifications',
  '0 9 * * *',
  $$
  INSERT INTO notifications (user_id, actor_id, type, post_id, read, metadata)
  SELECT
    sa.user_id,
    sa.user_id,
    'stream_expiry',
    sa.id::text,
    false,
    jsonb_build_object(
      'archive_id',       sa.id,
      'archive_title',    sa.title,
      'duration_seconds', sa.duration_seconds
    )
  FROM stream_archives sa
  WHERE
    sa.deleted_at IS NULL
    AND sa.recorded_at < now() - INTERVAL '1 year'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id   = sa.user_id
        AND n.type      = 'stream_expiry'
        AND n.post_id   = sa.id::text
        AND n.read      = false
        AND n.created_at > now() - INTERVAL '7 days'
    );
  $$
);
