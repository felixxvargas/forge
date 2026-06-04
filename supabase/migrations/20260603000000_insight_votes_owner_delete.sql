-- Allow insight owners to delete all votes on their own insights.
-- Needed so edit-content and re-review can clear votes using the user JWT
-- instead of relying on service_role, which was silently failing for PATCHes.
create policy "insight_owner_delete_votes"
  on game_insight_votes for delete
  using (
    exists (
      select 1 from game_insights
      where game_insights.id = game_insight_votes.insight_id
        and game_insights.user_id = auth.uid()
    )
  );
