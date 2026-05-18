-- saved_posts: users bookmark posts for later
create table if not exists saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  post_id text not null,
  saved_at timestamptz not null default now(),
  unique(user_id, post_id)
);
create index if not exists idx_saved_posts_user on saved_posts(user_id, saved_at desc);
alter table saved_posts enable row level security;
create policy "saved_posts_own" on saved_posts for all using (auth.uid() = user_id);

-- handle_visibility_permissions: VIP List
-- owner_id = user who controls their handle visibility
-- viewer_id = user granted permission to see owner's handles
create table if not exists handle_visibility_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(owner_id, viewer_id)
);
create index if not exists idx_hvp_owner on handle_visibility_permissions(owner_id);
create index if not exists idx_hvp_viewer on handle_visibility_permissions(viewer_id);
alter table handle_visibility_permissions enable row level security;
create policy "hvp_owner_manages" on handle_visibility_permissions for all using (auth.uid() = owner_id);
create policy "hvp_viewer_reads" on handle_visibility_permissions for select using (auth.uid() = viewer_id);

-- platform_tags_visibility on profiles
-- values: ['all'] = public, or any combo of ['following','followers','vip_list']
alter table profiles
  add column if not exists platform_tags_visibility text[] not null default array['all'];
