-- Fix 1: Reseed scheduled posts using email lookup (handles any handle value)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'felixvgiles@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User felixvgiles@gmail.com not found in auth.users';
  END IF;

  DELETE FROM scheduled_posts WHERE user_id = v_user_id AND status = 'pending';

  INSERT INTO scheduled_posts (user_id, content, game_ids, game_titles, scheduled_at, status, images, url) VALUES
    (v_user_id, 'Excited to announce the next Forge gaming tournament! Who''s in? 🎮', '{}', '{}', NOW() + INTERVAL '2 hours', 'pending', '{}', NULL),
    (v_user_id, 'Weekly gaming recap: what were your top plays this week?', '{}', '{}', NOW() + INTERVAL '1 day', 'pending', '{}', NULL),
    (v_user_id, 'New feature dropping soon — stay tuned 👀', '{}', '{}', NOW() + INTERVAL '2 days', 'pending', '{}', NULL),
    (v_user_id, 'Forge community spotlight: amazing highlights from our players this month!', '{}', '{}', NOW() + INTERVAL '3 days', 'pending', '{}', NULL),
    (v_user_id, 'Hot take: which genre has had the best games this year? Drop your pick below.', '{}', '{}', NOW() + INTERVAL '4 days', 'pending', '{}', NULL),
    (v_user_id, 'Game night is every Friday — join us on Forge and squad up!', '{}', '{}', NOW() + INTERVAL '5 days', 'pending', '{}', NULL),
    (v_user_id, 'Reminder: keep your highlight clips coming. The best ones get featured.', '{}', '{}', NOW() + INTERVAL '6 days', 'pending', '{}', NULL),
    (v_user_id, 'Behind the scenes: how we build Forge for the gaming community 🛠️', '{}', '{}', NOW() + INTERVAL '7 days', 'pending', '{}', NULL),
    (v_user_id, 'What game are you most hyped about right now? Tell us in the comments.', '{}', '{}', NOW() + INTERVAL '8 days', 'pending', '{}', NULL),
    (v_user_id, 'Forge milestone: thousands of posts shared this month. Thank you! 🙏', '{}', '{}', NOW() + INTERVAL '9 days', 'pending', '{}', NULL),
    (v_user_id, 'Patch notes, tier lists, or community clips — what content do you want more of?', '{}', '{}', NOW() + INTERVAL '10 days', 'pending', '{}', NULL);

  RAISE NOTICE 'Inserted 11 scheduled posts for user %', v_user_id;
END
$$;

-- Fix 2: Populate poll column on the embed test post (if not already set)
UPDATE posts
SET poll = '{"options": ["Yes, absolutely!", "Maybe later", "Not my thing", "Already on Forge!"], "end_date": "2026-12-31T23:59:59Z"}'::jsonb
WHERE id = '9acadeca-e87c-4179-b4c2-f25dc9d5b7d6'
  AND (poll IS NULL OR poll = 'null'::jsonb);
