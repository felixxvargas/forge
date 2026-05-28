-- Add category to game_insights for wiki organization
-- categories: characters, objects, locations, extras (misc / deleted content / cinematics / music / art)

ALTER TABLE public.game_insights
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'extras'
  CHECK (category IN ('characters', 'objects', 'locations', 'extras'));

CREATE INDEX IF NOT EXISTS idx_game_insights_category
  ON public.game_insights(game_id, category, status);
