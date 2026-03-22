-- Migration: Add lfg_flares table for structured Looking For Group flares
-- Run in Supabase SQL Editor

create table if not exists public.lfg_flares (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_id text not null,
  game_title text not null,
  flare_type text not null default 'lfg' check (flare_type in ('lfg', 'lfm')),
  players_needed int not null default 1,
  group_size int,
  game_mode text default '',
  scheduled_for timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz default now()
);

-- Index for fast per-game and per-user lookups
create index if not exists lfg_flares_game_id_idx on public.lfg_flares(game_id);
create index if not exists lfg_flares_user_id_idx on public.lfg_flares(user_id);
create index if not exists lfg_flares_expires_at_idx on public.lfg_flares(expires_at);

-- RLS: anyone can read, only owner can write
alter table public.lfg_flares enable row level security;

create policy "lfg_flares_select" on public.lfg_flares
  for select using (true);

create policy "lfg_flares_insert" on public.lfg_flares
  for insert with check (auth.uid() = user_id);

create policy "lfg_flares_delete" on public.lfg_flares
  for delete using (auth.uid() = user_id);
