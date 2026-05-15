CREATE TABLE IF NOT EXISTS gaming_monthly_summaries (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  game_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

CREATE INDEX IF NOT EXISTS gaming_monthly_summaries_user_month
  ON gaming_monthly_summaries (user_id, month DESC);

ALTER TABLE gaming_monthly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monthly summaries"
  ON gaming_monthly_summaries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read monthly summaries"
  ON gaming_monthly_summaries FOR SELECT
  USING (true);
