-- Comments ("lore") on individual game insights
CREATE TABLE IF NOT EXISTS insight_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid NOT NULL REFERENCES game_insights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insight_comments_insight_id_idx ON insight_comments(insight_id);
CREATE INDEX IF NOT EXISTS insight_comments_user_id_idx ON insight_comments(user_id);

ALTER TABLE insight_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read lore comments
CREATE POLICY "insight_comments_select" ON insight_comments
  FOR SELECT USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "insight_comments_insert" ON insight_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "insight_comments_delete" ON insight_comments
  FOR DELETE USING (auth.uid() = user_id);
