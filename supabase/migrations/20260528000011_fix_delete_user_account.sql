-- Fix delete_user_account: add missing insight_comments and insight_conversations
-- deletes before profiles (FK constraints blocked the profile delete for users with comments)

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.insight_comments      WHERE user_id = _uid;
  DELETE FROM public.insight_conversations WHERE user_id = _uid;
  DELETE FROM public.follows               WHERE follower_id = _uid OR following_id = _uid;
  DELETE FROM public.notifications         WHERE user_id = _uid OR actor_id = _uid;
  DELETE FROM public.posts                 WHERE user_id = _uid;
  DELETE FROM public.community_members     WHERE user_id = _uid;
  DELETE FROM public.user_games            WHERE user_id = _uid;
  DELETE FROM public.lfg_flares            WHERE user_id = _uid;
  DELETE FROM public.dm_messages           WHERE sender_id = _uid OR recipient_id = _uid;
  DELETE FROM public.dm_conversations      WHERE user1_id = _uid OR user2_id = _uid;
  DELETE FROM public.blocked_users         WHERE blocker_id = _uid OR blocked_id = _uid;
  DELETE FROM public.muted_users           WHERE muter_id = _uid OR muted_id = _uid;
  DELETE FROM public.stream_archives       WHERE user_id = _uid;
  DELETE FROM public.top8_members          WHERE user_id = _uid OR member_id = _uid;
  DELETE FROM public.saved_posts           WHERE user_id = _uid;
  DELETE FROM public.forge_onboarding_events       WHERE user_id = _uid;
  DELETE FROM public.forge_session_events          WHERE user_id = _uid;
  DELETE FROM public.game_list_events              WHERE user_id = _uid;
  DELETE FROM public.gaming_monthly_summaries      WHERE user_id = _uid;
  DELETE FROM public.gemini_usage          WHERE user_id = _uid;
  DELETE FROM public.game_insights         WHERE user_id = _uid;
  DELETE FROM public.game_insight_votes    WHERE user_id = _uid;
  DELETE FROM public.device_tokens         WHERE user_id = _uid;
  DELETE FROM public.scheduled_posts       WHERE user_id = _uid;
  DELETE FROM public.group_invites         WHERE inviter_id = _uid OR invitee_id = _uid;

  DELETE FROM public.profiles WHERE id = _uid;
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
