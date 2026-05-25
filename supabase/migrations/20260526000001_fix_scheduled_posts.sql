-- Ensure url column exists (may have been added manually; idempotent).
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS url text;

-- Reseed pending posts. Looks up @forge profile; falls back to @felix.
-- Leaves published/failed rows intact for history.
DO $$
DECLARE
  post_user_id uuid;
BEGIN
  SELECT id INTO post_user_id FROM profiles WHERE handle = 'forge' LIMIT 1;
  IF post_user_id IS NULL THEN
    SELECT id INTO post_user_id FROM profiles WHERE handle = 'felix' LIMIT 1;
  END IF;
  IF post_user_id IS NULL THEN
    RAISE NOTICE 'No @forge or @felix profile found — skipping scheduled post seed.';
    RETURN;
  END IF;

  DELETE FROM scheduled_posts WHERE status = 'pending';

  INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images, url)
  VALUES
    (post_user_id,
     'Forge v0.3.0 is here. DMs now have read receipts, typing indicators, and emoji reactions. Tag Groups in posts, post directly from any game page. We also submitted our first build to the Google Play Store.',
     '2026-05-26T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'Forge v0.3.1 is live. Android closed beta is open — sign up in Settings or the login page for a Google Play invite. Post threads now show connected reply lines, game expansions link back to their parent, and the Sprout badge is live for new members.',
     '2026-06-02T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'Forge v0.3.2: a reliability update. Subscription payments now prevent duplicate charges, error tracking is sharper, profile lookups are more accurate, and data fetching is faster. Quiet release, but the foundation is stronger.',
     '2026-06-09T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'Forge v0.3.3. DMs now show real message previews in the conversation list. Composing a post from a Game or Group page auto-tags it. New floating compose button on every Game Detail page.',
     '2026-06-16T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'Forge v0.3.4. The notification bell now glows when you have unread alerts. Discover games directly inside the list editor. DLCs and season passes are filtered from search results. Profile pages have a wider desktop layout.',
     '2026-06-23T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'Forge v0.3.5. Search got smarter: fuzzy matching for typos, base games rank above versions and editions, and remasters link to their originals. Google Sign-In is now available on Android. The feed skeleton now mirrors the real layout.',
     '2026-06-30T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'Forge v0.3.6 is live. Mention a game with @ in any post and get cover art in the dropdown. Post previews render in iMessage and Discord. Show or hide the Gaming Timeline on your profile. Plus: weekly activity digest emails.',
     '2026-07-07T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'Forge v0.3.7. Your profile URL is now forge-social.app/profile/yourhandle, clean and shareable. Tapping comment icons slides up the reply tray. Android push notifications live in beta. Alpha members get a ruby flask badge.',
     '2026-07-14T17:00:00Z', 'pending', '{}', '{}', '{}', null),

    (post_user_id,
     'We started a blog. Our first post is about why we built Forge, what makes it different, and where we''re taking it. We''re building in public and want you along for the ride. Read it here: https://www.forge-social.app/blog/announcing-forge',
     '2026-06-01T20:00:00Z', 'pending', '{}', '{}', '{}',
     'https://www.forge-social.app/blog/announcing-forge'),

    (post_user_id,
     'Our Android app is in closed beta. Our latest blog post covers what went into building a native app, the challenges we hit, and how to get access. Read more: https://www.forge-social.app/blog/android-closed-beta',
     '2026-06-15T20:00:00Z', 'pending', '{}', '{}', '{}',
     'https://www.forge-social.app/blog/android-closed-beta'),

    (post_user_id,
     'Two months of building Forge in public. Our roadmap post covers what we''ve shipped, what''s coming next, and the features we''re most excited about for the rest of 2026. Read it here: https://www.forge-social.app/blog/roadmap-2026',
     '2026-06-29T20:00:00Z', 'pending', '{}', '{}', '{}',
     'https://www.forge-social.app/blog/roadmap-2026');

  RAISE NOTICE 'Seeded 11 scheduled posts for user_id %', post_user_id;
END $$;
