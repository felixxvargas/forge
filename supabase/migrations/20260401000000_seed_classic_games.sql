-- Seed classic/legacy games that may not appear via IGDB live search.
-- Inserts into forge_games_17285bd7; skips if igdb_id already present.

DO $$
DECLARE
  v_id uuid;
BEGIN
  -- Demon's Souls (PS3, 2009) — IGDB id 101
  IF NOT EXISTS (SELECT 1 FROM forge_games_17285bd7 WHERE igdb_id = 101) THEN
    v_id := gen_random_uuid();
    INSERT INTO forge_games_17285bd7 (id, title, igdb_id, year, genres, platforms)
    VALUES (v_id, 'Demon''s Souls', 101, 2009, ARRAY['Role-playing (RPG)', 'Hack and slash/Beat ''em up'], ARRAY['PlayStation 3']);
    INSERT INTO forge_game_artwork_17285bd7 (game_id, artwork_type, url)
    VALUES (v_id, 'cover', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wkz.jpg')
    ON CONFLICT (game_id, artwork_type) DO NOTHING;
  END IF;

  -- Demon's Souls Remake (PS5, 2020) — IGDB id 119177
  IF NOT EXISTS (SELECT 1 FROM forge_games_17285bd7 WHERE igdb_id = 119177) THEN
    v_id := gen_random_uuid();
    INSERT INTO forge_games_17285bd7 (id, title, igdb_id, year, genres, platforms)
    VALUES (v_id, 'Demon''s Souls', 119177, 2020, ARRAY['Role-playing (RPG)', 'Hack and slash/Beat ''em up'], ARRAY['PlayStation 5']);
    INSERT INTO forge_game_artwork_17285bd7 (game_id, artwork_type, url)
    VALUES (v_id, 'cover', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2uro.jpg')
    ON CONFLICT (game_id, artwork_type) DO NOTHING;
  END IF;

  -- Dark Souls (2011) — IGDB id 354
  IF NOT EXISTS (SELECT 1 FROM forge_games_17285bd7 WHERE igdb_id = 354) THEN
    v_id := gen_random_uuid();
    INSERT INTO forge_games_17285bd7 (id, title, igdb_id, year, genres, platforms)
    VALUES (v_id, 'Dark Souls', 354, 2011, ARRAY['Role-playing (RPG)', 'Hack and slash/Beat ''em up'], ARRAY['PlayStation 3', 'Xbox 360', 'PC (Microsoft Windows)']);
    INSERT INTO forge_game_artwork_17285bd7 (game_id, artwork_type, url)
    VALUES (v_id, 'cover', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2uro.jpg')
    ON CONFLICT (game_id, artwork_type) DO NOTHING;
  END IF;

  -- Bloodborne (2015) — IGDB id 3025
  IF NOT EXISTS (SELECT 1 FROM forge_games_17285bd7 WHERE igdb_id = 3025) THEN
    v_id := gen_random_uuid();
    INSERT INTO forge_games_17285bd7 (id, title, igdb_id, year, genres, platforms)
    VALUES (v_id, 'Bloodborne', 3025, 2015, ARRAY['Role-playing (RPG)', 'Hack and slash/Beat ''em up'], ARRAY['PlayStation 4']);
    INSERT INTO forge_game_artwork_17285bd7 (game_id, artwork_type, url)
    VALUES (v_id, 'cover', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7d.jpg')
    ON CONFLICT (game_id, artwork_type) DO NOTHING;
  END IF;
END $$;
