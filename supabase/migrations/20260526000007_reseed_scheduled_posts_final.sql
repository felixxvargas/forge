-- Wipe all pending scheduled posts (replacing placeholder copy with real content)
DELETE FROM scheduled_posts WHERE status = 'pending';

-- Real scheduled posts — 17 total:
--   9 blog promotion posts (3 per blog entry) with URL unfurl cards
--   8 release-note posts (v0.3.0 → v0.3.7) with actual changelog copy
--
-- Schedule: Wednesdays at 1pm PST (21:00 UTC), every 2 weeks from 2026-05-28
-- User: felixvgiles@gmail.com (resolved via auth.users subquery)

DO $$
DECLARE
  v_uid uuid := (SELECT id FROM auth.users WHERE email = 'felixvgiles@gmail.com' LIMIT 1);
BEGIN

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOG 1: "Introducing Forge: The Social Platform Built for Gamers"
-- URL: https://www.forge-social.app/blog/announcing-forge
-- ─────────────────────────────────────────────────────────────────────────────

-- Post 1 of 3 — intro (Wed May 28, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'We started a blog. 👋

Our first post is about why we built Forge — a social platform built for the gaming community that puts the games first and the algorithm second.

It covers what Forge is, what launched on day one, and how to get access.

https://www.forge-social.app/blog/announcing-forge',
  'https://www.forge-social.app/blog/announcing-forge',
  '2026-05-28T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- Post 2 of 3 — highlights (Wed Jun 11, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'On Forge, your profile is your gaming library.

Favorites, wishlist, recently played, completed, and custom lists — your full gaming history in one place. Every post is tagged to a real game from the full IGDB library with cover art and metadata.

Read the full post: https://www.forge-social.app/blog/announcing-forge',
  'https://www.forge-social.app/blog/announcing-forge',
  '2026-06-11T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- Post 3 of 3 — CTA (Wed Jun 25, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Gaming deserves its own social space. One that doesn''t treat your gaming activity as an afterthought buried in a general-purpose feed.

We built Forge for that. Sign up at forge-social.app — the web beta is free and open to everyone.

https://www.forge-social.app/blog/announcing-forge',
  'https://www.forge-social.app/blog/announcing-forge',
  '2026-06-25T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOG 2: "Forge on Android: Closed Beta Now Open"
-- URL: https://www.forge-social.app/blog/android-closed-beta
-- ─────────────────────────────────────────────────────────────────────────────

-- Post 1 of 3 — intro (Wed Jul 9, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge is on Android. 🤖

Six weeks after launch, the Android closed beta is open. The full Forge experience — feed, game-tagged posts, groups, game library, and notifications — as a native Android app.

Read the full announcement: https://www.forge-social.app/blog/android-closed-beta',
  'https://www.forge-social.app/blog/android-closed-beta',
  '2026-07-09T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- Post 2 of 3 — native app highlights (Wed Jul 23, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'The Forge Android app uses native system back gestures, integrates with the share sheet, and has a thumb-friendly compose screen redesigned for mobile.

The reply experience uses a sticky bottom bar that expands in-place — no navigating away from the post.

More on what went into the build: https://www.forge-social.app/blog/android-closed-beta',
  'https://www.forge-social.app/blog/android-closed-beta',
  '2026-07-23T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- Post 3 of 3 — how to join (Wed Aug 6, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Want to test Forge on Android?

Head to forge-social.app/android-beta and sign up with your email. We''ll send you an invite as we expand access. Current web users are being prioritized.

Push notifications are in active development and landing in an upcoming update.

https://www.forge-social.app/blog/android-closed-beta',
  'https://www.forge-social.app/blog/android-closed-beta',
  '2026-08-06T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOG 3: "2026 Product Roadmap: Where We've Been and Where We're Going"
-- URL: https://www.forge-social.app/blog/roadmap-2026
-- ─────────────────────────────────────────────────────────────────────────────

-- Post 1 of 3 — intro (Wed Aug 20, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Two months of building Forge in public. Here''s where we''ve been and where we''re going.

Our roadmap post covers everything shipped since launch, what''s coming in H2 2026, and a community poll we need your help with.

https://www.forge-social.app/blog/roadmap-2026',
  'https://www.forge-social.app/blog/roadmap-2026',
  '2026-08-20T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- Post 2 of 3 — H2 roadmap highlights (Wed Sep 3, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'What''s coming for Forge in H2 2026:

→ Android open beta (early June)
→ iOS in development
→ Full-text search across posts, games, and people
→ Two-way Bluesky & Mastodon sync (replies, follows, notifications)
→ Developer API — read-only first, then writes
→ Moderation and safety tooling for open beta

Full roadmap: https://www.forge-social.app/blog/roadmap-2026',
  'https://www.forge-social.app/blog/roadmap-2026',
  '2026-09-03T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- Post 3 of 3 — poll CTA (Wed Sep 17, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, url, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'We''re planning the 2027 roadmap and want your input before anything gets locked in.

What should we prioritize? What''s missing that you need every day? What''s working better than you expected?

Vote in the poll or reply with your thoughts — every response gets read by the team.

https://www.forge-social.app/blog/roadmap-2026',
  'https://www.forge-social.app/blog/roadmap-2026',
  '2026-09-17T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RELEASE NOTES: v0.3.0 → v0.3.7 (one post each, Wednesdays every 2 weeks)
-- ─────────────────────────────────────────────────────────────────────────────

-- v0.3.0 (Wed Oct 1, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.0

· Read receipts in DMs and group chats — know when your message lands
· Typing indicators in DMs and group chats
· Emoji reactions on messages; long-press any message to react or delete
· Tag Groups in posts; tapping a group tag navigates to the group page
· Post directly from any game detail page

Google Play Store build submitted. The Android era begins. 🎮',
  '2026-10-01T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- v0.3.1 (Wed Oct 15, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.1

· Android closed beta: sign up from Settings or the login page for a Google Play invite
· Post detail pages now show full comment threads with connected reply lines
· Game expansion pages link back to their parent game; expansions shown on parent pages
· Expansion activity now boosts parent game rankings
· Sprout badge now visible on profile pages 🌱',
  '2026-10-15T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- v0.3.2 (Wed Oct 29, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.2

· Subscription payments are more reliable with duplicate charge prevention
· Error tracking improvements; fewer false positives when loading posts with certain account states
· Handle lookups and profile matching are now more accurate and consistent
· Performance improvements across data fetching and API calls',
  '2026-10-29T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- v0.3.3 (Wed Nov 12, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.3

· DM read receipts: "Read" appears below your last message once it''s been seen
· Real message preview text in the conversation list instead of a generic placeholder
· Composing a post from a Game or Group page now auto-tags that game or group
· New floating compose button on Game Detail pages 💬',
  '2026-11-12T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- v0.3.4 (Wed Nov 26, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.4

· Notification bell now shows an unread count with a glowing badge 🔔
· Discover games while editing your lists — no need to leave the editor
· Cleaner game search results: DLCs, season passes, and duplicate editions filtered automatically
· List previews in posts display cleanly on tablet and mobile
· Profile pages now use a wider desktop layout for better use of screen space',
  '2026-11-26T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- v0.3.5 (Wed Dec 10, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.5

· Smarter search: fuzzy matching for typos, base games rank higher than editions and ports
· Remasters, remakes, and expansions are now correctly linked on game pages
· Feed skeleton loader updated to mirror the real page structure
· Google Sign-In now available on Android
· Twitch Archive now fetches a full year of VOD history 🔍',
  '2026-12-10T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- v0.3.6 (Wed Dec 24, 2026 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.6

· Weekly activity digest: get a weekly email summary of your Forge notifications and activity
· Post link previews now render a real post card on iMessage, Discord, and other platforms
· @ mentions now support tagging games; search by name and see cover art in the dropdown
· Show or hide the Gaming Timeline tab on your profile via Edit Profile settings 📧',
  '2026-12-24T21:00:00Z', 'pending', '{}', '{}', '{}'
);

-- v0.3.7 (Wed Jan 7, 2027 @ 1pm PST)
INSERT INTO scheduled_posts (user_id, content, scheduled_at, status, game_ids, game_titles, images)
VALUES (
  v_uid,
  'Forge v0.3.7

· Profile URLs now use your handle: forge-social.app/profile/yourhandle — clean and shareable
· Tapping the comment icon on a post opens the reply tray with a smooth slide-up animation
· Android push notifications: DMs and activity now notify you even when the app is closed (beta)
· Android: fixed the bottom navigation bar appearing transparent for signed-out users
· Alpha Tester badge: founding members who joined during alpha get a ruby flask icon on their profile 🔴',
  '2027-01-07T21:00:00Z', 'pending', '{}', '{}', '{}'
);

RAISE NOTICE 'Inserted 17 scheduled posts for user %', v_uid;
END
$$;
