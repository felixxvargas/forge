-- forge_session_events: fire-and-forget time-spent tracking
CREATE TABLE IF NOT EXISTS forge_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event text NOT NULL CHECK (event IN ('session_start', 'heartbeat', 'session_end')),
  platform text NOT NULL DEFAULT 'web',
  duration_s integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forge_session_events_user_created
  ON forge_session_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS forge_session_events_created
  ON forge_session_events (created_at);

ALTER TABLE forge_session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own session events"
  ON forge_session_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role reads everything (admin stats)
CREATE POLICY "Service role reads all session events"
  ON forge_session_events FOR SELECT
  USING (true);

-- Admin RPC: count MAU/WAU/DAU from auth.users.last_sign_in_at
CREATE OR REPLACE FUNCTION get_auth_user_activity()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT json_build_object(
    'mau', COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '30 days'),
    'wau', COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '7 days'),
    'dau', COUNT(*) FILTER (WHERE last_sign_in_at >= NOW() - INTERVAL '1 day')
  )
  FROM auth.users;
$$;
