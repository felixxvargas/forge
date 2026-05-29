-- Game Wiki Entities: AI-extracted lore entities surfaced from approved insights

CREATE TABLE IF NOT EXISTS public.game_wiki_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         TEXT NOT NULL,
  game_title      TEXT NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('character', 'location', 'item', 'mechanic', 'lore')),
  description     TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  source_insight_id UUID REFERENCES public.game_insights(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive dedup per game: same name + type → one entity
CREATE UNIQUE INDEX game_wiki_entities_unique_name
  ON public.game_wiki_entities (game_id, lower(name), type);

CREATE INDEX game_wiki_entities_game_id_idx ON public.game_wiki_entities (game_id);
CREATE INDEX game_wiki_entities_type_idx ON public.game_wiki_entities (game_id, type);

-- RLS
ALTER TABLE public.game_wiki_entities ENABLE ROW LEVEL SECURITY;

-- Anyone can read active entities
CREATE POLICY "game_wiki_entities_select"
  ON public.game_wiki_entities FOR SELECT
  USING (status = 'active');

-- Only service role (server-side functions) may insert/update/delete
CREATE POLICY "game_wiki_entities_insert_service"
  ON public.game_wiki_entities FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "game_wiki_entities_update_service"
  ON public.game_wiki_entities FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "game_wiki_entities_delete_service"
  ON public.game_wiki_entities FOR DELETE
  USING (auth.role() = 'service_role');
