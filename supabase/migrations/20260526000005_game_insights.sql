-- Game Insights / Wiki system
-- Tables: game_insights, game_insight_votes, gemini_usage

CREATE TABLE IF NOT EXISTS game_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  game_title text NOT NULL,
  query text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approve_count int NOT NULL DEFAULT 0,
  reject_count int NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_insight_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid NOT NULL REFERENCES game_insights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (insight_id, user_id)
);

CREATE TABLE IF NOT EXISTS gemini_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  query_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS game_insights_game_id_idx ON game_insights(game_id);
CREATE INDEX IF NOT EXISTS game_insights_user_id_idx ON game_insights(user_id);
CREATE INDEX IF NOT EXISTS game_insights_status_idx ON game_insights(status);
CREATE INDEX IF NOT EXISTS game_insight_votes_insight_id_idx ON game_insight_votes(insight_id);
CREATE INDEX IF NOT EXISTS gemini_usage_user_date_idx ON gemini_usage(user_id, usage_date);

-- RLS
ALTER TABLE game_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_insight_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_insights_read_all" ON game_insights FOR SELECT USING (true);
CREATE POLICY "game_insights_insert_auth" ON game_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "game_insights_update_own" ON game_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "game_insights_service_all" ON game_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "game_insight_votes_read_all" ON game_insight_votes FOR SELECT USING (true);
CREATE POLICY "game_insight_votes_insert_auth" ON game_insight_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "game_insight_votes_update_own" ON game_insight_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "game_insight_votes_service_all" ON game_insight_votes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "gemini_usage_own" ON gemini_usage FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gemini_usage_service_all" ON gemini_usage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to check and approve insights after voting
CREATE OR REPLACE FUNCTION check_insight_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total int;
  v_approves int;
  v_submitted_at timestamptz;
BEGIN
  SELECT approve_count, reject_count, submitted_at
  INTO v_approves, v_total, v_submitted_at
  FROM game_insights WHERE id = NEW.insight_id;

  v_total := v_approves + (SELECT COUNT(*) FROM game_insight_votes WHERE insight_id = NEW.insight_id AND vote = 'reject');

  -- Auto-approve: 70%+ approve after at least 24 hours and at least 3 total votes
  IF v_total >= 3
    AND v_approves::float / v_total >= 0.7
    AND v_submitted_at < now() - INTERVAL '24 hours'
  THEN
    UPDATE game_insights
    SET status = 'approved', approved_at = now(), updated_at = now()
    WHERE id = NEW.insight_id AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER insight_vote_approval_trigger
  AFTER INSERT OR UPDATE ON game_insight_votes
  FOR EACH ROW EXECUTE FUNCTION check_insight_approval();
