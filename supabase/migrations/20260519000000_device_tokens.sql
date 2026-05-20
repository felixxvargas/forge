create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  created_at timestamptz default now(),
  unique(user_id, platform)
);

alter table device_tokens enable row level security;
