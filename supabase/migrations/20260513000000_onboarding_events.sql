-- Onboarding funnel telemetry
-- Tracks step entry/completion and errors to identify where users drop off.
-- Anonymous before auth (session_id), linked to user_id after account creation.

CREATE TABLE IF NOT EXISTS forge_onboarding_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event       text NOT NULL,
  step        text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_session ON forge_onboarding_events (session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_created ON forge_onboarding_events (created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_event   ON forge_onboarding_events (event);

ALTER TABLE forge_onboarding_events ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert their own events
CREATE POLICY "insert own onboarding events"
  ON forge_onboarding_events FOR INSERT
  WITH CHECK (true);

-- Only service role can read (enforced via admin API)
CREATE POLICY "service role reads onboarding events"
  ON forge_onboarding_events FOR SELECT
  USING (false);
