-- Valul 2: biblioteca GLOBALA de diagrame vizuale de filmare.
-- Diagrama = imagine generata (ChatGPT/Blueprint) + etichete pentru filtrare.
-- Refolosibila cross-reel: o diagrama "frontal machiaj naturala" se foloseste
-- in orice reel de machiaj care cere acea combinatie. Stocata o data, refolosita oriunde.

CREATE TABLE IF NOT EXISTS diagrams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                 -- ex: "Frontal machiaj naturala"
  image_url   text NOT NULL,                 -- diagrama generata (bucket 'diagrams')

  -- Etichete pentru sortare/filtrare (valori fixe in UI; coloane simple text)
  category    text NOT NULL DEFAULT 'general',   -- machiaj | par | unghii | gene | sprancene | general
  position    text,                              -- frontal | de sus | lateral | deasupra zonei de lucru
  lighting    text[] NOT NULL DEFAULT '{}',      -- LISTA: poate avea mai multe surse simultan
  distance    text,                              -- foarte aproape | la un brat | la doi pasi

  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Scena pointeaza la o diagrama din biblioteca (refolosibila)
ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS diagram_id uuid REFERENCES diagrams(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagrams_select_authenticated"
  ON diagrams FOR SELECT TO authenticated USING (true);
CREATE POLICY "diagrams_insert_authenticated"
  ON diagrams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "diagrams_update_authenticated"
  ON diagrams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "diagrams_delete_authenticated"
  ON diagrams FOR DELETE TO authenticated USING (true);

-- Index pe category (filtrarea cea mai frecventa)
CREATE INDEX IF NOT EXISTS diagrams_category_idx ON diagrams (category);
