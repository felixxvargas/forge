-- Users can register/update their own device token
create policy "Users can upsert own device token"
  on device_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own device token"
  on device_tokens for update
  using (auth.uid() = user_id);

-- Only service role can read tokens (for push sending)
-- No anon/user select policy needed
