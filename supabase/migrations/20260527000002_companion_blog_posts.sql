-- Companion scheduled posts for the Gaming Timeline and Forge Insights blog posts.
-- Scheduled for 9am UTC on their respective publish dates.
insert into scheduled_posts (user_id, content, scheduled_at, url) values
(
  'dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3',
  'Gaming Timeline won the community poll.' || E'\n\n' ||
  'We''ve already started collecting the data — every game you add to Recently Played is being logged. When the feature ships, your timeline won''t start from today. It starts from whenever you first used Forge.',
  '2026-06-10 09:00:00+00',
  'https://www.forge-social.app/blog/gaming-timeline'
),
(
  'dfa8b7a1-b930-4ee8-a14a-5cb9aa48c5d3',
  'We''ve started building Forge Insights — a community-verified knowledge base for every game on Forge.' || E'\n\n' ||
  'Ask a question, get an AI answer, submit it. The community votes on whether it''s accurate. Approved insights stick around on the game''s page. That''s the foundation. Here''s where we want to take it.',
  '2026-06-17 09:00:00+00',
  'https://www.forge-social.app/blog/forge-insights'
);
