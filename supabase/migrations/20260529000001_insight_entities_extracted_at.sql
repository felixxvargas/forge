-- Track which approved insights have had entities auto-extracted by Gemini
ALTER TABLE public.game_insights
  ADD COLUMN IF NOT EXISTS entities_extracted_at TIMESTAMPTZ DEFAULT NULL;

-- Index so the daily cron only scans unprocessed rows efficiently
CREATE INDEX IF NOT EXISTS game_insights_entities_extracted_at_idx
  ON public.game_insights (entities_extracted_at)
  WHERE status = 'approved' AND entities_extracted_at IS NULL;
