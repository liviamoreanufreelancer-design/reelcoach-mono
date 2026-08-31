-- ════════════════════════════════════════════════════════════════════
--  022 — O variantă poate fi reel, carusel sau povești
-- ════════════════════════════════════════════════════════════════════
--
--  Biblioteca stia sa faca doar reeluri. Modelul cere insa bazine de cate
--  ~10 din FIECARE tip per serviciu: telefonul alege 3 reeluri, 1 carusel si
--  cateva povesti, evitand ce a folosit ultima data.
--
--  CE E DIFERIT LA POVESTI, si de ce nu sunt un reel mai scurt:
--
--    Un reel e UN fisier montat din mai multe momente. O varianta de povesti
--    e MAI MULTE fisiere, cate unul per moment, fara montaj intre ele — asa
--    se si posteaza, una dupa alta. Deci: fara tranzitii (n-au intre ce sa
--    fie), fara randare (momentul brut e rezultatul), si fiecare slot e un
--    output separat, nu o bucata dintr-unul.
--
--    Consecinta practica: poveștile sunt cel mai ieftin tip de rezultat din
--    tot produsul. Nu costa nimic la randare, si sunt singurele care nu
--    depind de sunetul trending — vezi decizia despre publicarea automata din
--    CLAUDE.md, unde story-urile erau numite ca primele care s-ar putea
--    automatiza vreodata.
--
--  Implicitul e 'reel', deci variantele existente raman ce sunt.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE reel_designs
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'reel';

COMMENT ON COLUMN reel_designs.kind IS
  'reel = un montaj | carousel = imagini | stories = cate un fisier per moment, fara montaj.';

CREATE INDEX IF NOT EXISTS reel_designs_kind_idx ON reel_designs (kind, reel_type, sort_order);
