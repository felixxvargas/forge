-- Top 8 Friends & Games feature

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS top_friends jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS top_games  jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS top_friend_requests (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status        text DEFAULT 'pending',
  created_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE(requester_id, recipient_id)
);

ALTER TABLE top_friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties view own requests" ON top_friend_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Requester inserts" ON top_friend_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Parties update" ON top_friend_requests
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Parties delete" ON top_friend_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
