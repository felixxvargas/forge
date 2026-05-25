alter table scheduled_posts add column if not exists images text[] default '{}';
