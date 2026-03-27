-- Add handle_changed_at column for 2-week handle change restriction
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS handle_changed_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure increment_member_count RPC exists
CREATE OR REPLACE FUNCTION increment_member_count(community_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE communities
  SET member_count = GREATEST(0, COALESCE(member_count, 0) + 1)
  WHERE id = community_id;
END;
$$;

-- SECURITY DEFINER function for admins/creators to invite users into a group.
-- Bypasses the RLS policy on community_members (which only allows self-insert).
-- Validates that the calling user is a creator or moderator first.
CREATE OR REPLACE FUNCTION add_community_member_invite(p_community_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only allow if caller is creator or moderator of the community
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id
      AND user_id = auth.uid()
      AND role IN ('creator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Only group admins can invite members';
  END IF;

  -- Insert only if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = p_community_id AND user_id = p_user_id
  ) THEN
    INSERT INTO community_members (community_id, user_id, role)
    VALUES (p_community_id, p_user_id, 'member');

    UPDATE communities
    SET member_count = GREATEST(0, COALESCE(member_count, 0) + 1)
    WHERE id = p_community_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_member_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_community_member_invite(uuid, uuid) TO authenticated;
