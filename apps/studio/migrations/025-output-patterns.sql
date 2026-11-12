-- ════════════════════════════════════════════════════════════════════
--  025 — Sabloane de rezultat: "Transformarea" se scrie o data
-- ════════════════════════════════════════════════════════════════════
--
--  PROBLEMA
--
--  `outputs` (014) sunt randuri per sablon. Deci "Transformarea" — before,
--  proces, dezvaluire — se recreeaza de mana la balayage, la tuns, la machiaj,
--  la unghii. Acelasi fel de postare, rescris de patru ori, si de fiecare data
--  cu riscul sa iasa un pic altfel.
--
--  CE SCHIMBA
--
--  Un `output_pattern` e FELUL de postare, independent de serviciu:
--
--    transformarea  reel      [before, aplicare, dezvaluire]
--    procesul       reel      [aplicare, detaliu, dezvaluire]
--    pas-cu-pas     carousel  [before, aplicare, detaliu, dezvaluire]
--
--  Un serviciu nu mai DEFINESTE rezultate — doar declara ce tipuri de cadru
--  are. Rezultatele se DEDUC: fiecare sablon ale carui roluri sunt acoperite
--  de tipurile serviciului devine un rezultat.
--
--  Regula "niciodata zero" iese automat din asta. Daca stilista a filmat 5
--  din 8 momente, sabloanele acoperite de cele 5 produc rezultate, restul nu.
--  Nu se programeaza separat; e o consecinta a modelului.
--
--  DE CE `slot_roles` SUNT ID-URI DE TIPURI, NU UN VOCABULAR NOU
--
--  `shots.slot_key` (012) si `shot_types.id` (021) sunt deja acelasi lucru:
--  identitatea globala a ceea ce se filmeaza. Un al treilea vocabular ar
--  trebui mapat la primele doua, si orice mapare se desincronizeaza.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.output_patterns (
  -- Slug stabil: 'transformarea'. Intra in `outputs.pattern_id`, deci nu se
  -- schimba dupa creare. Numele afisat, da.
  id          text PRIMARY KEY,
  name        text NOT NULL,
  kind        text NOT NULL DEFAULT 'reel',   -- reel | carousel | stories

  -- Tipurile de cadru cerute, IN ORDINE. Sunt id-uri din `shot_types`.
  -- Un serviciu produce acest rezultat doar daca le are pe toate.
  slot_roles  text[] NOT NULL DEFAULT '{}',

  -- Stilul implicit (migratia 026). NULL = stilul de casa marcat default.
  style_preset_id text,

  -- Ce fel de text merge pe el. Nu e captionul, e indrumarea pentru generare:
  -- "transformare, inainte-dupa, mirare" vs "proces, tehnic, calm".
  caption_hint text,

  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.output_patterns IS
  'Felurile de postare, independente de serviciu. Rezultatele unui serviciu se deduc din ele, nu se scriu de mână.';
COMMENT ON COLUMN public.output_patterns.slot_roles IS
  'Id-uri din shot_types, în ordine. Serviciul produce rezultatul doar dacă are toate tipurile.';

ALTER TABLE public.output_patterns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'output_patterns'
       AND policyname = 'output_patterns_read_all'
  ) THEN
    CREATE POLICY output_patterns_read_all ON public.output_patterns
      FOR SELECT USING (true);
  END IF;
END $$;

-- ── Legatura dinspre rezultatele existente ─────────────────────────────
--
--  `outputs` rămân acolo unde sunt, cu `slots` si `caption` proprii. Capata
--  doar o referinta: din ce sablon provin. Rezultatele vechi, scrise de mana,
--  au NULL si continua sa functioneze neatinse.
ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS pattern_id text
    REFERENCES public.output_patterns(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.outputs.pattern_id IS
  'Șablonul din care provine. NULL = rezultat scris de mână, dinainte de 025.';

CREATE INDEX IF NOT EXISTS outputs_pattern_id_idx
  ON public.outputs (pattern_id)
  WHERE pattern_id IS NOT NULL;
