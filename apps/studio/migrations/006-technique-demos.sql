-- Valul 2: biblioteca de demo-uri VIDEO de tehnica de filmare.
-- Partenera filmeaza ~20 demo-uri universale o data, refolosite in sute de scene.
-- Plus slot pentru diagrama vizuala (designul diagramelor vine separat).

-- 1. Biblioteca de demo-uri de tehnica (refolosibile intre scene/retete)
CREATE TABLE IF NOT EXISTS technique_demos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                 -- ex: "Macro 15cm", "Cadru fix frontal"
  description text,                           -- scurt: ce arata demo-ul
  video_url   text NOT NULL,                  -- bucket 'demos'
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Scena pointeaza la un demo din biblioteca (optional) + slot diagrama
ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS technique_demo_id uuid REFERENCES technique_demos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS diagram_url text;

-- 3. RLS pe technique_demos
ALTER TABLE technique_demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technique_demos_select_authenticated"
  ON technique_demos FOR SELECT TO authenticated USING (true);

CREATE POLICY "technique_demos_insert_authenticated"
  ON technique_demos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "technique_demos_update_authenticated"
  ON technique_demos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "technique_demos_delete_authenticated"
  ON technique_demos FOR DELETE TO authenticated USING (true);
