-- Community edits to Game Wiki Entities, with approval voting

CREATE TABLE IF NOT EXISTS public.game_wiki_entity_edits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES public.game_wiki_entities(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Proposed changes as a partial content object
  content       JSONB NOT NULL DEFAULT '{}',
  -- 'pending' | 'approved' | 'rejected'
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approve_count INT NOT NULL DEFAULT 0,
  reject_count  INT NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_wiki_entity_edit_votes (
  edit_id  UUID NOT NULL REFERENCES public.game_wiki_entity_edits(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote     TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  PRIMARY KEY (edit_id, user_id)
);

CREATE INDEX game_wiki_entity_edits_entity_idx ON public.game_wiki_entity_edits (entity_id, status);
CREATE INDEX game_wiki_entity_edits_user_idx   ON public.game_wiki_entity_edits (user_id);

-- RLS for edits
ALTER TABLE public.game_wiki_entity_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_wiki_entity_edit_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_edits_select"
  ON public.game_wiki_entity_edits FOR SELECT
  USING (true);

CREATE POLICY "entity_edits_insert"
  ON public.game_wiki_entity_edits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "entity_edits_update_service"
  ON public.game_wiki_entity_edits FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "entity_edit_votes_select"
  ON public.game_wiki_entity_edit_votes FOR SELECT
  USING (true);

CREATE POLICY "entity_edit_votes_insert"
  ON public.game_wiki_entity_edit_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "entity_edit_votes_update"
  ON public.game_wiki_entity_edit_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "entity_edit_votes_delete"
  ON public.game_wiki_entity_edit_votes FOR DELETE
  USING (auth.uid() = user_id);
