-- ════════════════════════════════════════════════════════════════════
--  023 — Momentele se împart pe verticale: păr, machiaj, amândouă
-- ════════════════════════════════════════════════════════════════════
--
--  Cu 23 de momente într-o singură listă, alegerea momentului potrivit când
--  construiești o variantă înseamnă citit tot. Împărțirea le taie la jumătate.
--
--  DAR NU SUNT DOUA CATEGORII, SUNT TREI.
--
--  `before`, `dezvaluire`, `reactia`, `after` si `detaliu` apar in AMANDOUA
--  verticalele — si exact asta face catalogul mic: 23 de momente acopera 23 de
--  servicii tocmai fiindca cele comune nu se dubleaza. O impartire stricta in
--  doua ar fi cerut `before-par` si `before-machiaj`, adica exact duplicarea
--  pe care catalogul exista s-o evite.
--
--  Deci: `par`, `machiaj`, `ambele`. Cele din `ambele` apar in ambele filtre
--  cand alegi, si intr-o sectiune proprie cand editezi — la editare, un moment
--  aratat de doua ori ar pune intrebarea "pe care il modific?".
--
--  CORECTEZ SI DOUA GRESELI din seed-ul initial: `uscare` si `miscare-par`
--  erau marcate „comun", dar sunt evident de par. Un machiaj n-are uscare.
--
--  Coloana ramane `family` (text), nu devine enum: la fel ca `reel_type`,
--  vocabularul se poate largi — daca vreodata intra unghiile, e o valoare in
--  plus, nu o migratie de tip.
-- ════════════════════════════════════════════════════════════════════

UPDATE shot_types SET family = 'ambele' WHERE id IN
  ('before', 'consultatie', 'pregatire', 'detaliu', 'dezvaluire', 'reactia', 'after');

UPDATE shot_types SET family = 'par' WHERE id IN
  ('mixare-culoare', 'aplicare', 'aplicare-prim-plan', 'folii', 'procesare',
   'spalare', 'taiere', 'taiere-prim-plan', 'uscare', 'styling', 'ondulare',
   'miscare-par');

UPDATE shot_types SET family = 'machiaj' WHERE id IN
  ('baza-machiaj', 'ochi', 'gene-sprancene', 'buze');

-- Orice tip adaugat intre timp, fara verticala: intra in „ambele", ca sa fie
-- vizibil oriunde. Un moment ascuns din greseala e mai rau decat unul in plus.
UPDATE shot_types SET family = 'ambele'
  WHERE family IS NULL OR family NOT IN ('par', 'machiaj', 'ambele');

COMMENT ON COLUMN shot_types.family IS
  'Verticala: par | machiaj | ambele. Cele din ambele apar in ambele filtre.';
