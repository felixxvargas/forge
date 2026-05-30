-- Allow insight authors to delete their own insights
CREATE POLICY "game_insights_delete_own"
  ON game_insights FOR DELETE
  USING (auth.uid() = user_id);
