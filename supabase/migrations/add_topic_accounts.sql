-- Migration: Add account_type column and gaming studio/platform topic accounts
-- Run this in the Supabase SQL Editor (as postgres superuser)

-- 1. Add account_type column if it doesn't exist
alter table public.profiles
  add column if not exists account_type text default 'user';

-- 2. Temporarily disable FK checks so topic accounts can be inserted
--    without corresponding auth.users rows
set session_replication_role = replica;

insert into public.profiles (id, handle, display_name, bio, account_type, profile_picture)
values
  (
    gen_random_uuid(),
    'blizzard',
    'Blizzard Entertainment',
    'World of Warcraft, Overwatch, Diablo, Hearthstone, StarCraft.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'riotgames',
    'Riot Games',
    'League of Legends, Valorant, Teamfight Tactics, and more.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'larianstudios',
    'Larian Studios',
    'Creators of Baldur''s Gate 3 and the Divinity: Original Sin series.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'koop',
    'KO_OP',
    'Independent game studio behind GNOG, Wobbledogs, and more.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'fromsoftware',
    'FromSoftware',
    'Dark Souls, Elden Ring, Sekiro, Armored Core.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'nintendo',
    'Nintendo',
    'Mario, Zelda, Pokémon, and more beloved gaming franchises.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'playstation',
    'PlayStation',
    'PlayStation 5, PlayStation VR2, and PlayStation Studios games.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'xbox',
    'Xbox',
    'Xbox Series X|S, Xbox Game Pass, and Xbox Game Studios.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'steam',
    'Steam',
    'The world''s largest PC gaming platform by Valve.',
    'topic',
    ''
  ),
  (
    gen_random_uuid(),
    'itchio',
    'itch.io',
    'The indie game marketplace. Thousands of games from independent creators.',
    'topic',
    ''
  )
on conflict (handle) do nothing;

-- 3. Re-enable FK checks
set session_replication_role = default;
