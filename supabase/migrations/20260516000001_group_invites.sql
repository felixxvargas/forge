-- Track group invites sent by admins so they can view invite history
create table if not exists group_invites (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references communities(id) on delete cascade,
  invited_user_id   uuid not null references profiles(id) on delete cascade,
  invited_by_id     uuid not null references profiles(id) on delete cascade,
  invited_at        timestamptz not null default now(),
  unique(group_id, invited_user_id)
);

create index if not exists idx_group_invites_group
  on group_invites(group_id, invited_at desc);

alter table group_invites enable row level security;

-- Any authenticated user can see invites for groups they admin (joined check done in app)
create policy "Authenticated users can view group invites"
  on group_invites for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert group invites"
  on group_invites for insert
  with check (auth.role() = 'authenticated');
