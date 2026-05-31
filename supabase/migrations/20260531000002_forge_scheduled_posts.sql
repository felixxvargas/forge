-- Wipe all pending scheduled posts and reseed for @forge account.
-- 2 remaining blog posts (Blog 1 already published) + 8 release notes (v0.3.0–v0.3.7).
-- All attributed directly to the @forge profile.

DELETE FROM public.scheduled_posts WHERE status = 'pending';

DO $$
DECLARE
  v_forge_id uuid := (SELECT id FROM public.profiles WHERE handle = 'forge' LIMIT 1);
BEGIN
  IF v_forge_id IS NULL THEN
    RAISE EXCEPTION '@forge profile not found';
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- BLOG 2: Forge on Android — Closed Beta Now Open
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO public.scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge is on Android. 🤖

Six weeks after launch, the Android closed beta is open. Full feed, game-tagged posts, groups, game library — all as a native Android app with system back gestures, native media picker, and a thumb-friendly compose screen.

Sign up at forge-social.app/android-beta to get an invite.

https://www.forge-social.app/blog/android-closed-beta',
    'https://www.forge-social.app/blog/android-closed-beta',
    '2026-06-10T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  -- ─────────────────────────────────────────────────────────────────────────
  -- BLOG 3: 2026 Product Roadmap
  -- ─────────────────────────────────────────────────────────────────────────
  INSERT INTO public.scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Two months of building Forge in public. Our roadmap post covers everything shipped since launch, what''s coming in H2 2026 — open beta, iOS, full-text search, two-way fediverse sync, developer API — and a community poll we need your help with.

https://www.forge-social.app/blog/roadmap-2026',
    'https://www.forge-social.app/blog/roadmap-2026',
    '2026-06-24T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  -- ─────────────────────────────────────────────────────────────────────────
  -- RELEASE NOTES: v0.3.0 – v0.3.7 (Mondays at 10am PST = 17:00 UTC, weekly)
  -- ─────────────────────────────────────────────────────────────────────────

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.0

· Read receipts in DMs and group chats — know when your message lands
· Typing indicators in DMs and group chats
· Emoji reactions on messages; long-press any message to react or delete
· Tag Groups in posts; tapping a group tag navigates to the group page
· Post directly from any game detail page

Google Play Store build submitted. The Android era begins. 🎮',
    '2026-06-01T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.1

· Android closed beta: sign up from Settings or the login page for a Google Play invite
· Post detail pages now show full comment threads with connected reply lines
· Game expansion pages link back to their parent game; expansions shown on parent pages
· Expansion activity now boosts parent game rankings
· Sprout badge now visible on profile pages 🌱',
    '2026-06-08T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.2

· Subscription payments are more reliable with duplicate charge prevention
· Error tracking improvements; fewer false positives when loading posts with certain account states
· Handle lookups and profile matching are now more accurate and consistent
· Performance improvements across data fetching and API calls',
    '2026-06-15T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.3

· DM read receipts: "Read" appears below your last message once it''s been seen
· Real message preview text in the conversation list instead of a generic placeholder
· Composing a post from a Game or Group page now auto-tags that game or group
· New floating compose button on Game Detail pages 💬',
    '2026-06-22T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.4

· Notification bell now shows an unread count with a glowing badge 🔔
· Discover games while editing your lists — no need to leave the editor
· Cleaner game search results: DLCs, season passes, and duplicate editions filtered automatically
· List previews in posts display cleanly on tablet and mobile
· Profile pages now use a wider desktop layout for better use of screen space',
    '2026-06-29T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.5

· Smarter search: fuzzy matching for typos, base games rank higher than editions and ports
· Remasters, remakes, and expansions are now correctly linked on game pages
· Feed skeleton loader updated to mirror the real page structure
· Google Sign-In now available on Android
· Twitch Archive now fetches a full year of VOD history 🔍',
    '2026-07-06T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.6

· Weekly activity digest: get a weekly email summary of your Forge notifications and activity
· Post link previews now render a real post card on iMessage, Discord, and other platforms
· @ mentions now support tagging games; search by name and see cover art in the dropdown
· Show or hide the Gaming Timeline tab on your profile via Edit Profile settings 📧',
    '2026-07-13T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  INSERT INTO public.scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
  VALUES (
    v_forge_id,
    'Forge v0.3.7

· Profile URLs now use your handle: forge-social.app/profile/yourhandle — clean and shareable
· Tapping the comment icon on a post opens the reply tray with a smooth slide-up animation
· Android push notifications: DMs and activity now notify you even when the app is closed (beta)
· Android: fixed the bottom navigation bar appearing transparent for signed-out users
· Alpha Tester badge: founding members who joined during alpha get a ruby flask icon on their profile 🔴',
    '2026-07-20T17:00:00Z', 'pending', '{}', '{}', '{}'
  );

  RAISE NOTICE 'Inserted 10 scheduled posts for @forge (id: %)', v_forge_id;
END
$$;
