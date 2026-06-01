-- Add 'quest' to the allowed categories for game_insights
ALTER TABLE public.game_insights
  DROP CONSTRAINT IF EXISTS game_insights_category_check;

ALTER TABLE public.game_insights
  ADD CONSTRAINT game_insights_category_check
  CHECK (category IN ('characters', 'objects', 'locations', 'extras', 'enemies', 'quest'));
