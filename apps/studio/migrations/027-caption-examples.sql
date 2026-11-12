-- ════════════════════════════════════════════════════════════════════
--  027 — Exemplele de caption: vocea partenerei, intr-un tabel
-- ════════════════════════════════════════════════════════════════════
--
--  LA CE FOLOSESC
--
--  Partenera scrie cateva captions bune per fel de postare. Ele NU antreneaza
--  niciun model: intra in cerere de fiecare data, ca exemple. Diferenta conteaza:
--
--    - un exemplu nou schimba rezultatul IMEDIAT, fara reantrenare
--    - vocea ramane a ei; modelul recombina, nu inventeaza un stil
--    - costa fractiuni de cent per postare
--
--  DE CE SUNT LEGATE DE SABLON, NU DE SERVICIU
--
--  O "Transformare" se scrie la fel la balayage si la machiaj: mirare, inainte
--  si dupa, rezultat. Un "Proces" e tehnic si calm in ambele. Felul postarii
--  dicteaza tonul, nu verticala. Deci exemplele stau pe `output_patterns`, si
--  se refolosesc automat in fiecare serviciu nou.
--
--  `service_id` exista pentru excepții: cand o verticala are un fel de a vorbi
--  pe care celelalte nu-l au.
--
--  BUCLA CARE SE INCHIDE SINGURA
--
--  `source` spune de unde vine exemplul:
--
--    written — scris de partenera
--    kept    — generat, si pastrat NEMODIFICAT de stilista
--
--  Cand stilista nu schimba un caption generat, asta e cel mai curat semnal
--  ca a fost bun — mai curat decat orice evaluare, fiindca vine din uz, nu
--  dintr-o presupunere. Exemplele se imbunatatesc fara ca partenera sa mai
--  scrie niciunul.
--
--  Aceeasi idee ca "scrie DE CE respingi" din notele de produs: cunoasterea
--  tacita iese din capul ei si intra in sistem. Aici se intampla de la sine.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.caption_examples (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Felul postarii. Exemplele se refolosesc in toate serviciile care produc
  -- acest fel de rezultat.
  pattern_id  text NOT NULL
    REFERENCES public.output_patterns(id) ON DELETE CASCADE,

  -- Optional: exemplu valabil doar pentru un serviciu anume.
  service_id  text,

  text        text NOT NULL,

  -- 'written' = scris de partenera · 'kept' = generat si pastrat nemodificat
  source      text NOT NULL DEFAULT 'written',

  -- Exemplele proaste se sting, nu se sterg: vrem sa ramana urma deciziei.
  is_active   boolean NOT NULL DEFAULT true,

  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.caption_examples IS
  'Exemple de caption în vocea partenerei. Intră în cerere ca exemple — nu antrenează nimic.';
COMMENT ON COLUMN public.caption_examples.source IS
  'written = scris de parteneră; kept = generat și păstrat nemodificat de stilistă (semnal de uz).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'caption_examples_source_chk'
  ) THEN
    ALTER TABLE public.caption_examples
      ADD CONSTRAINT caption_examples_source_chk
      CHECK (source IN ('written', 'kept'));
  END IF;
END $$;

-- Cererea de generare citeste exemplele active ale unui sablon la fiecare reel.
CREATE INDEX IF NOT EXISTS caption_examples_pattern_idx
  ON public.caption_examples (pattern_id, is_active);

ALTER TABLE public.caption_examples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'caption_examples'
       AND policyname = 'caption_examples_read_all'
  ) THEN
    CREATE POLICY caption_examples_read_all ON public.caption_examples
      FOR SELECT USING (true);
  END IF;
END $$;
