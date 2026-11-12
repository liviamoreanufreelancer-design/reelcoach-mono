-- ════════════════════════════════════════════════════════════════════
--  026 — Stilurile de casa: aprobate o data, pe material de proba
-- ════════════════════════════════════════════════════════════════════
--
--  PROBLEMA
--
--  Migratia 015 a mutat filtrul si tranzitia pe `outputs`, ceea ce a fost
--  corect — stilul apartine postarii, nu momentului. Dar le-a lasat per RAND:
--  partenera alege filtru si tranzitie pentru fiecare rezultat al fiecarui
--  serviciu. Patru rezultate × cinci verticale = douazeci de alegeri de gust,
--  care ar trebui sa fie trei.
--
--  CE SCHIMBA
--
--  Trei-cinci combinatii, aprobate O DATA. Un rezultat arata spre una din ele.
--  Coloanele `outputs.filter` si `outputs.transition` ramân ca excepții.
--
--  DE CE SE APROBA PE STOCK, NU PE FOOTAGE PROPRIU
--
--  Cand seteaza efectele, ea nu evalueaza continutul — evalueaza daca tranzitia
--  e prea rapida, filtrul prea saturat, viteza buna. Pentru asta nu conteaza ce
--  e in cadru, conteaza durata si miscarea. Un clip static face orice tranzitie
--  sa para curata; unul cu miscare rapida scoate problemele la iveala.
--
--  De aceea ecranul de Stiluri din Studio arata aceeasi combinatie pe doua-trei
--  clipuri neutre comutabile, alese dupa TIPUL DE MISCARE, nu dupa subiect.
--
--  Efectele se aplica prin acelasi cod de randare ca pe footage real, deci nu
--  se aproximeaza nimic. Aceeasi disciplina ca "preview = export", cu alt input.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.style_presets (
  -- Slug stabil: 'lux-cald'. Intra in output_patterns si outputs.
  id             text PRIMARY KEY,
  name           text NOT NULL,

  -- Aceleasi valori ca pe `outputs` (015) si `shots` (003), ca sa nu existe
  -- doua vocabulare de stil in sistem.
  filter         text,
  transition     text,
  playback_speed numeric(4,2) NOT NULL DEFAULT 1.0,
  motion_blur    boolean NOT NULL DEFAULT false,
  effect         text,

  -- Presetul de text (font, mărime, poziție) — ecranul Texte din Studio.
  caption_preset text,

  -- Unul singur e implicit. Rezultatele fara stil propriu il primesc.
  is_default     boolean NOT NULL DEFAULT false,

  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.style_presets IS
  'Stilurile de casă. Aprobate o dată pe material de probă, refolosite în toate verticalele.';

-- Un singur implicit. Fara asta, "stilul implicit" devine ambiguu si randarea
-- ar depinde de ordinea rândurilor.
CREATE UNIQUE INDEX IF NOT EXISTS style_presets_single_default
  ON public.style_presets ((true))
  WHERE is_default;

ALTER TABLE public.style_presets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'style_presets'
       AND policyname = 'style_presets_read_all'
  ) THEN
    CREATE POLICY style_presets_read_all ON public.style_presets
      FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE public.outputs
  ADD COLUMN IF NOT EXISTS style_preset_id text
    REFERENCES public.style_presets(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.outputs.style_preset_id IS
  'Stilul de casă folosit. outputs.filter / outputs.transition rămân ca excepții punctuale.';

ALTER TABLE public.output_patterns
  ADD CONSTRAINT output_patterns_style_preset_fk
  FOREIGN KEY (style_preset_id) REFERENCES public.style_presets(id) ON DELETE SET NULL;
