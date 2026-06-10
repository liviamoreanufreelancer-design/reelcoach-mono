-- ============================================================================
-- Migration 004: Concepts library + content pools (Faza 1)
-- ============================================================================
-- concepts ──1:N──> templates (recipe variants) ──1:N──> shots
--    └──1:N──> concept_pool_items (substanta: tips/hooks/etc.)
-- NON-DESTRUCTIVE: doar CREATE / ADD COLUMN IF NOT EXISTS. Fara DROP.
-- RLS: gestionat in Supabase dashboard, nu aici.
-- ============================================================================

-- 1. concepts
CREATE TABLE IF NOT EXISTS public.concepts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  vertical      TEXT NOT NULL,
  concept_type  TEXT NOT NULL,
  blurb         TEXT,
  cover_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.concepts DROP CONSTRAINT IF EXISTS concepts_vertical_check;
ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_vertical_check
  CHECK (vertical IN ('par', 'machiaj', 'unghii', 'gene', 'sprancene'));

ALTER TABLE public.concepts DROP CONSTRAINT IF EXISTS concepts_type_check;
ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_type_check
  CHECK (concept_type IN ('tips','mistakes','transformation','trend','before_after','tutorial','other'));

ALTER TABLE public.concepts DROP CONSTRAINT IF EXISTS concepts_status_check;
ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_status_check
  CHECK (status IN ('draft','in_review','published'));

CREATE INDEX IF NOT EXISTS concepts_feed_idx
  ON public.concepts (vertical, status, is_active);

-- 2. concept_pool_items
CREATE TABLE IF NOT EXISTS public.concept_pool_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id  UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  slot_role   TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.concept_pool_items DROP CONSTRAINT IF EXISTS pool_slot_role_check;
ALTER TABLE public.concept_pool_items
  ADD CONSTRAINT pool_slot_role_check
  CHECK (slot_role IN ('hook','tip','step','reveal','cta','context'));

CREATE INDEX IF NOT EXISTS pool_lookup_idx
  ON public.concept_pool_items (concept_id, slot_role, is_approved);

-- 3. templates: concept_id + global_filter
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS concept_id    UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS global_filter TEXT;

CREATE INDEX IF NOT EXISTS templates_concept_idx
  ON public.templates (concept_id);

-- 4. shots: sample_video_url + text_slot_role
ALTER TABLE public.shots
  ADD COLUMN IF NOT EXISTS sample_video_url TEXT,
  ADD COLUMN IF NOT EXISTS text_slot_role   TEXT;

ALTER TABLE public.shots DROP CONSTRAINT IF EXISTS shots_text_slot_role_check;
ALTER TABLE public.shots
  ADD CONSTRAINT shots_text_slot_role_check
  CHECK (text_slot_role IS NULL OR text_slot_role IN ('hook','tip','step','reveal','cta','context'));

-- ============================================================================
-- RLS pentru tabelele noi
-- ============================================================================
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_pool_items ENABLE ROW LEVEL SECURITY;

-- Helper: e utilizatorul admin?
-- (presupune ca profiles.role = 'admin' pentru admin)

-- CONCEPTS --------------------------------------------------------------
-- Citire: orice utilizator autentificat (admin + editor) vede conceptele.
DROP POLICY IF EXISTS concepts_select ON public.concepts;
CREATE POLICY concepts_select ON public.concepts
  FOR SELECT TO authenticated
  USING (true);

-- Inserare: orice utilizator autentificat poate crea (ca draft).
DROP POLICY IF EXISTS concepts_insert ON public.concepts;
CREATE POLICY concepts_insert ON public.concepts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update: editorii pot edita doar draft/in_review; adminii pot orice.
DROP POLICY IF EXISTS concepts_update ON public.concepts;
CREATE POLICY concepts_update ON public.concepts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR status IN ('draft','in_review')
  );

-- Stergere: doar admin.
DROP POLICY IF EXISTS concepts_delete ON public.concepts;
CREATE POLICY concepts_delete ON public.concepts
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- POOL ITEMS ------------------------------------------------------------
DROP POLICY IF EXISTS pool_select ON public.concept_pool_items;
CREATE POLICY pool_select ON public.concept_pool_items
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS pool_insert ON public.concept_pool_items;
CREATE POLICY pool_insert ON public.concept_pool_items
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS pool_update ON public.concept_pool_items;
CREATE POLICY pool_update ON public.concept_pool_items
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS pool_delete ON public.concept_pool_items;
CREATE POLICY pool_delete ON public.concept_pool_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
