-- ════════════════════════════════════════════════════════════════════
--  029 — Randurile de pornire pentru cataloage
-- ════════════════════════════════════════════════════════════════════
--
--  NIMIC INVENTAT. Fiecare rand vine din ce exista deja in baza:
--
--    stilurile  = filtrele pe care partenera le-a ALES (honey pe reeluri,
--                 daylight pe carusel), citite din `outputs.filter`
--    exemplul   = propria ei propozitie din `outputs.caption`
--    sabloanele = vocabularul din notele de produs ("Transformarea ← before
--                 → aplicare → dezvaluire"), cu id-uri care exista in
--                 `shot_types`
--
--  De asta catalogul nu are cold-start: porneste din munca ei, nu de la zero.
--  Era obiectia principala impotriva sistemelor compozitionale, si aici nu se
--  aplica.
--
--  Tot ce e aici se poate edita din Studio dupa aceea. Sunt puncte de pornire,
--  nu decizii inchise.
-- ════════════════════════════════════════════════════════════════════

-- ── Stiluri de casa ────────────────────────────────────────────────────
-- Un singur implicit: indexul partial din 026 il impune, ca randarea sa nu
-- depinda de ordinea randurilor.
INSERT INTO public.style_presets (id, name, filter, is_default, sort_order)
VALUES
  ('miere',        'Miere',        'honey',    true,  1),
  ('lumina-de-zi', 'Lumină de zi', 'daylight', false, 2)
ON CONFLICT (id) DO NOTHING;

-- ── Sabloane de rezultat ───────────────────────────────────────────────
-- `slot_roles` sunt id-uri din shot_types. Un serviciu produce rezultatul doar
-- daca are TOATE tipurile cerute — de aici iese "niciodata zero" automat, fara
-- sa fie programat separat.
INSERT INTO public.output_patterns
  (id, name, kind, slot_roles, style_preset_id, caption_hint, sort_order)
VALUES
  ('transformarea', 'Transformarea', 'reel',
   ARRAY['before','aplicare','dezvaluire'], 'miere',
   'Inainte si dupa. Mirare, rezultat, scurt.', 1),

  ('procesul', 'Procesul', 'reel',
   ARRAY['pregatire','aplicare','detaliu'], 'miere',
   'Tehnic si calm. Cum se lucreaza, nu cat de spectaculos e.', 2),

  ('reactia', 'Reacția', 'reel',
   ARRAY['dezvaluire','reactia'], 'miere',
   'Momentul in care clienta se vede. Emotie, nu descriere.', 3),

  ('pas-cu-pas', 'Pas cu pas', 'carousel',
   ARRAY['before','aplicare','spalare','dezvaluire'], 'lumina-de-zi',
   'Etapele, pe rand. Explicativ, util, fara graba.', 4),

  ('povesti-sesiune', 'Povești', 'stories',
   ARRAY['before','aplicare','dezvaluire'], 'miere',
   'Scurt, direct, ca un mesaj. Textul e deja pe imagine.', 5)
ON CONFLICT (id) DO NOTHING;

-- ── Primul exemplu de caption: propria ei propozitie ───────────────────
INSERT INTO public.caption_examples (pattern_id, text, source)
SELECT 'pas-cu-pas', o.caption, 'written'
  FROM public.outputs o
 WHERE o.caption IS NOT NULL
   AND o.kind = 'carousel'
   AND NOT EXISTS (
     SELECT 1 FROM public.caption_examples ce
      WHERE ce.pattern_id = 'pas-cu-pas' AND ce.text = o.caption
   );
