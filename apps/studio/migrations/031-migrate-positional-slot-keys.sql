-- ════════════════════════════════════════════════════════════════════
--  031 — Cheile pozitionale devin chei de inteles
-- ════════════════════════════════════════════════════════════════════
--
--  `cadru-1/2/3` erau generate dupa POZITIA in varianta — exact bugul descris
--  de migratia 021: aceeasi cheie poate insemna momente diferite in variante
--  diferite, iar derivarea le-ar uni gresit. Au ramas din perioada de dinainte.
--
--  Potrivirile sunt confirmate de partenera:
--    cadru-1 "vopsit"       -> aplicare    (Aplicarea)
--    cadru-2 "transformare" -> dezvaluire  (Dezvaluirea)
--    cadru-3 "reactie"      -> reactia     (Reacția clientei)
--
--  CHEIA SE SCHIMBA IN DOUA LOCURI SIMULTAN
--
--  `outputs.slots[].slot` refera slot_key-ul. Schimbata doar pe moment, reelul
--  ar cauta un slot inexistent si ar pierde scena — fara eroare, ca de obicei.
--  De asta ambele tabele in aceeasi tranzactie.
--
--  `ELSE e.elem` nu e decor: clauza WHERE prinde si rezultate care au "cadru-"
--  doar in `demoUrl` (numele fisierelor din storage). Pentru ele rescrierea
--  trebuie sa fie identica, nu aproximativa.
-- ════════════════════════════════════════════════════════════════════

CREATE TEMP TABLE _harta (vechi text, nou text) ON COMMIT DROP;
INSERT INTO _harta VALUES
  ('cadru-1', 'aplicare'),
  ('cadru-2', 'dezvaluire'),
  ('cadru-3', 'reactia');

-- 1 · Momentele: cheia si legatura cu catalogul, deodata.
UPDATE public.shots s
   SET slot_key     = h.nou,
       shot_type_id = h.nou
  FROM _harta h
 WHERE s.slot_key = h.vechi
   AND s.shot_type_id IS NULL
   AND EXISTS (SELECT 1 FROM public.shot_types t WHERE t.id = h.nou);

-- 2 · Rezultatele care le refera, pastrand ordinea si restul campurilor
--     (textLayers, efecte, fxParams, demoUrl raman neatinse).
UPDATE public.outputs o
   SET slots = sub.noi
  FROM (
    SELECT o2.id,
           jsonb_agg(
             CASE WHEN h.nou IS NOT NULL
                  THEN jsonb_set(e.elem, '{slot}', to_jsonb(h.nou))
                  ELSE e.elem
             END
             ORDER BY e.ord
           ) AS noi
      FROM public.outputs o2
      CROSS JOIN LATERAL jsonb_array_elements(o2.slots) WITH ORDINALITY AS e(elem, ord)
      LEFT JOIN _harta h ON h.vechi = e.elem->>'slot'
     WHERE o2.slots::text LIKE '%cadru-%'
     GROUP BY o2.id
  ) AS sub
 WHERE o.id = sub.id;
