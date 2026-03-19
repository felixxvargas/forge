-- ============================================================
-- FORGE DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  handle text unique,
  display_name text,
  pronouns text,
  bio text default '',
  about text default '',
  profile_picture text default '',
  banner_image text default '',
  platforms text[] default '{}',
  platform_handles jsonb default '{}',
  social_platforms text[] default '{}',
  social_handles jsonb default '{}',
  interests jsonb default '[]',
  game_lists jsonb default '{"recentlyPlayed":[],"library":[],"favorites":[],"wishlist":[]}',
  follower_count int default 0,
  following_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  images text[] default '{}',
  image_alts text[] default '{}',
  url text,
  community_id uuid,
  like_count int default 0,
  repost_count int default 0,
  comment_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- FOLLOWS
-- ============================================================
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- ============================================================
-- LIKES
-- ============================================================
create table if not exists public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ============================================================
-- REPOSTS
-- ============================================================
create table if not exists public.reposts (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- ============================================================
-- COMMUNITIES
-- ============================================================
create table if not exists public.communities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default '',
  icon text default '🎮',
  type text default 'open' check (type in ('open', 'request', 'invite')),
  creator_id uuid references public.profiles(id) on delete set null,
  member_count int default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- COMMUNITY MEMBERSHIPS
-- ============================================================
create table if not exists public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('creator', 'moderator', 'member')),
  joined_at timestamptz default now(),
  primary key (community_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'follow', 'repost', 'comment', 'mention')),
  post_id uuid references public.posts(id) on delete cascade,
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- BLOCKED USERS
-- ============================================================
create table if not exists public.blocked_users (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- ============================================================
-- MUTED USERS
-- ============================================================
create table if not exists public.muted_users (
  muter_id uuid references public.profiles(id) on delete cascade,
  muted_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (muter_id, muted_id)
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- UPDATE FOLLOWER COUNTS AUTOMATICALLY
-- ============================================================
create or replace function update_follower_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = NEW.follower_id;
    update profiles set follower_count = follower_count + 1 where id = NEW.following_id;
  elsif TG_OP = 'DELETE' then
    update profiles set following_count = following_count - 1 where id = OLD.follower_id;
    update profiles set follower_count = follower_count - 1 where id = OLD.following_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_change on public.follows;
create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute procedure update_follower_counts();

-- ============================================================
-- UPDATE LIKE COUNTS AUTOMATICALLY
-- ============================================================
create or replace function update_like_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set like_count = like_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set like_count = like_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure update_like_count();

-- ============================================================
-- UPDATE REPOST COUNTS AUTOMATICALLY
-- ============================================================
create or replace function update_repost_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set repost_count = repost_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set repost_count = repost_count - 1 where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_repost_change on public.reposts;
create trigger on_repost_change
  after insert or delete on public.reposts
  for each row execute procedure update_repost_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.reposts enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.notifications enable row level security;
alter table public.blocked_users enable row level security;
alter table public.muted_users enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Posts: anyone can read, authenticated users can create, owners can delete
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Authenticated users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);
create policy "Users can update own posts" on public.posts for update using (auth.uid() = user_id);

-- Follows: anyone can read, authenticated users can follow/unfollow
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Authenticated users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Likes
create policy "Likes are viewable by everyone" on public.likes for select using (true);
create policy "Authenticated users can like" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.likes for delete using (auth.uid() = user_id);

-- Reposts
create policy "Reposts are viewable by everyone" on public.reposts for select using (true);
create policy "Authenticated users can repost" on public.reposts for insert with check (auth.uid() = user_id);
create policy "Users can unrepost" on public.reposts for delete using (auth.uid() = user_id);

-- Communities
create policy "Communities are viewable by everyone" on public.communities for select using (true);
create policy "Authenticated users can create communities" on public.communities for insert with check (auth.uid() = creator_id);
create policy "Creators can update communities" on public.communities for update using (auth.uid() = creator_id);

-- Community members
create policy "Memberships are viewable by everyone" on public.community_members for select using (true);
create policy "Users can join communities" on public.community_members for insert with check (auth.uid() = user_id);
create policy "Users can leave communities" on public.community_members for delete using (auth.uid() = user_id);

-- Notifications: only owner can see their own
create policy "Users can see own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "System can create notifications" on public.notifications for insert with check (true);
create policy "Users can mark own as read" on public.notifications for update using (auth.uid() = user_id);

-- Blocked/Muted
create policy "Users can see own blocks" on public.blocked_users for select using (auth.uid() = blocker_id);
create policy "Users can block" on public.blocked_users for insert with check (auth.uid() = blocker_id);
create policy "Users can unblock" on public.blocked_users for delete using (auth.uid() = blocker_id);

create policy "Users can see own mutes" on public.muted_users for select using (auth.uid() = muter_id);
create policy "Users can mute" on public.muted_users for insert with check (auth.uid() = muter_id);
create policy "Users can unmute" on public.muted_users for delete using (auth.uid() = muter_id);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
create index if not exists posts_user_id_idx on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_community_id_idx on public.posts(community_id);
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists profiles_handle_idx on public.profiles(handle);
