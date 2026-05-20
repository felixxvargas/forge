create table if not exists scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  game_ids text[] default '{}',
  game_titles text[] default '{}',
  scheduled_at timestamptz not null,
  status text not null default 'pending',
  published_post_id uuid references posts(id),
  created_at timestamptz default now()
);

insert into scheduled_posts (user_id, content, scheduled_at) values
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Big update! Forge v0.3.0 is here. DMs now show read receipts so you know when your message lands. Typing indicators let you see when someone''s writing back. And emoji reactions are now live on all posts and comments. 🎮', '2026-05-21 00:00:00+00'),
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Forge v0.3.1: Android closed beta is open! Sign up from Settings or the login page to get a Google Play invite. Also: threaded comment replies got a big visual upgrade — conversations are easier to follow.', '2026-05-23 00:00:00+00'),
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Forge v0.3.2: reliability update. Subscription payments are more robust with duplicate charge prevention. Error tracking improvements across the board. Handle lookups and profile matching are now more accurate.', '2026-05-25 00:00:00+00'),
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Forge v0.3.3: messaging upgrades. Real message preview text in conversation lists. Composing from a Game or Group page now auto-tags it. New floating compose button on Game Detail pages.', '2026-05-27 00:00:00+00'),
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Forge v0.3.4: smarter notifications and list editing. The notification bell now shows an unread count. Discover games while editing your lists without leaving the editor. DLCs and season passes are filtered from game search automatically.', '2026-05-29 00:00:00+00'),
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Forge v0.3.5: fuzzy game search is live — typos and close matches now work. Remasters and remakes are linked to their base games. Google Sign-In on Android is available. Feed skeleton loader updated.', '2026-05-31 00:00:00+00'),
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Forge v0.3.6: @ game mentions are here. Type @ in a post or reply to search and tag any game. Post link previews now render a real post card on iMessage and Discord. Plus: weekly activity digest emails.', '2026-06-02 00:00:00+00'),
('dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3', 'Forge v0.3.7: profile URLs now use your handle — share your profile as forge-social.app/yourhandle. Founding members get an Alpha Tester badge on their profile. Tapping the comment icon opens the reply tray with a smooth animation. Android push notifications in beta.', '2026-06-04 00:00:00+00');
