-- Link posts to the insight they share.
-- Nullable so existing posts are unaffected.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS insight_id uuid REFERENCES public.game_insights(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_insight_id ON public.posts (insight_id) WHERE insight_id IS NOT NULL;
