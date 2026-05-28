-- insight_conversations: persists multi-turn Gemini refinement sessions before publishing
-- status: drafting (in progress) | published (insight was submitted) | abandoned (discarded)

CREATE TABLE public.insight_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id       text NOT NULL,
  game_title    text NOT NULL,
  messages      jsonb NOT NULL DEFAULT '[]',
  status        text NOT NULL DEFAULT 'drafting'
                CHECK (status IN ('drafting', 'published', 'abandoned')),
  insight_id    uuid REFERENCES public.game_insights(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_insight_conversations_user_game
  ON public.insight_conversations(user_id, game_id, status);

ALTER TABLE public.insight_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations"
  ON public.insight_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
