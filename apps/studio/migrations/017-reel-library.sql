-- ════════════════════════════════════════════════════════════════════
--  017 — Biblioteca de reeluri: variante, nu postari
-- ════════════════════════════════════════════════════════════════════
--
--  PROBLEMA: fara varietate, saptamana 4 arata ca saptamana 1. Mai rau,
--  toate stilistele din ReelCoach arata la fel — momentul in care o clienta
--  recunoaste "a, si asta foloseste appul ala" e momentul in care produsul
--  devine un dezavantaj pentru ea. "Chef's choice" e decizia corecta pentru
--  montaj, dar are exact riscul asta ca umbra.
--
--  RASPUNSUL: partenera construieste mai multe VARIANTE ale aceluiasi tip de
--  reel ("before/after", "glow up", "process"), peste acelasi material de
--  proba. Appul alege alta varianta de fiecare data. Varietatea vine din
--  munca ei, nu din controale date stilistei.
--
--  DE CE TABEL SEPARAT si nu `outputs` cu un steag:
--
--    `outputs` e citit de telefon si mutat de publicare. Zece variante acolo
--    ar insemna zece cartonase in pachetul stilistei — si e fix genul de
--    scurgere tacuta care a mancat `text_layers` odata (vezi CLAUDE.md,
--    "CAPCANA: coloane noi in shots se pierd la publicare"). Un tabel separat
--    face scurgerea imposibila, nu doar improbabila.
--
--    Variantele nu sunt continut care ajunge la cineva; sunt unealta de lucru
--    a partenerei. De asta nu au nici sistem de ciorna/publicare.
--
--  FILMARILE nu se incarca aici. `reference_template_id` spune de unde se iau
--  momentele cat timp proiecteaza — exact cum lucreaza deja: 10 variante peste
--  aceleasi filmari de balayage. Legatura se face prin `slot_key`, ca peste
--  tot, deci construind variante peste balayage produce fara sa vrea
--  vocabularul de sloturi de care va fi nevoie ca sa se aplice si la tuns.
--  Descoperit din munca, nu ghicit.
--
--  `reel_type` e TEXT LIBER, nu enum. Partenera inca descopera ce tipuri
--  exista; un enum ar ingheta acum o taxonomie pe care n-a terminat-o.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reel_designs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                       -- "Rapid, text mult"
  -- Tipul al carui variante este. Text liber, cu sugestii din ce exista deja.
  reel_type   text NOT NULL,                       -- "before_after", "glow_up"
  -- Categoria careia i se aplica (coafura). Deocamdata informativ: aplicarea
  -- pe telefon vine intr-o etapa separata, dupa ce se vede ca ideea merge.
  category_id text REFERENCES categories(id) ON DELETE SET NULL,
  -- De unde vin filmarile de proba cat timp proiecteaza.
  reference_template_id text REFERENCES templates(id) ON DELETE SET NULL,

  -- Aceeasi forma ca `outputs` — de asta editorul se refoloseste ca atare,
  -- fara sa fie copiat. O singura implementare, deci fara drift intre ele.
  slots       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{slot, sec, filter, ...}]
  caption     text,
  filter      text,
  transition  text,
  cover_slot  text,

  sort_order  int NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reel_designs_type_idx ON reel_designs (reel_type, sort_order);
CREATE INDEX IF NOT EXISTS reel_designs_ref_idx  ON reel_designs (reference_template_id);

COMMENT ON TABLE reel_designs IS
  'Variante de reel construite de partenera. NU sunt postari — appul nu le citeste inca.';
COMMENT ON COLUMN reel_designs.reel_type IS
  'Tipul al carui varianta este ("before_after"). Text liber: taxonomia inca se descopera.';
COMMENT ON COLUMN reel_designs.reference_template_id IS
  'Sablonul din care se iau filmarile de proba. Legatura reala e prin slots[].slot (slot_key).';

-- RLS: aceleasi reguli ca restul Studio — doar utilizatori autentificati.
ALTER TABLE reel_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reel_designs_all ON reel_designs;
CREATE POLICY reel_designs_all ON reel_designs
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
