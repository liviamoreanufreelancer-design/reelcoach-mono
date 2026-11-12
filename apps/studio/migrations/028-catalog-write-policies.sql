-- ════════════════════════════════════════════════════════════════════
--  028 — Scrierea pe tabelele noi de catalog
-- ════════════════════════════════════════════════════════════════════
--
--  PROBLEMA, gasita dupa aplicarea lui 025-027
--
--  Cele trei tabele noi au RLS activ si DOAR politica de citire. RLS activ
--  fara politica de scriere nu da eroare de configurare: da refuz silentios
--  la fiecare INSERT. Deci Studio ar fi putut citi cataloagele si n-ar fi
--  putut scrie niciun rand in ele, fara niciun mesaj care sa spuna de ce.
--
--  TIPARUL DIN BAZA, pe care il urmeaza
--
--    shot_types_read           SELECT  public
--    shot_types_write          ALL     authenticated
--    outputs_read_published    SELECT  public
--    outputs_write_authenticated ALL   authenticated
--
--  Citire pentru oricine (appul stilistei citeste neautentificat), scriere
--  doar pentru autentificati (partenera, din Studio). Cataloagele sunt
--  aceeasi categorie: date publice de citit, editate de un singur om.
-- ════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'output_patterns'
       AND policyname = 'output_patterns_write_authenticated'
  ) THEN
    CREATE POLICY output_patterns_write_authenticated ON public.output_patterns
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'style_presets'
       AND policyname = 'style_presets_write_authenticated'
  ) THEN
    CREATE POLICY style_presets_write_authenticated ON public.style_presets
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'caption_examples'
       AND policyname = 'caption_examples_write_authenticated'
  ) THEN
    CREATE POLICY caption_examples_write_authenticated ON public.caption_examples
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
