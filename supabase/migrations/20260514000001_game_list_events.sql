-- game_list_events: immutable event log for gaming timeline (Option A)
CREATE TABLE IF NOT EXISTS game_list_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  list_type text NOT NULL,
  event text NOT NULL CHECK (event IN ('added', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_list_events_user_created
  ON game_list_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS game_list_events_user_game_list
  ON game_list_events (user_id, game_id, list_type);

CREATE INDEX IF NOT EXISTS game_list_events_created
  ON game_list_events (created_at);

ALTER TABLE game_list_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own game list events"
  ON game_list_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own game list events"
  ON game_list_events FOR SELECT
  USING (auth.uid() = user_id);
