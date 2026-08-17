-- ════════════════════════════════════════════════════════════════════
--  020 — Rezultatele se importa din biblioteca, momentele se genereaza
-- ════════════════════════════════════════════════════════════════════
--
--  Sablonul nu mai e locul unde se construiesc rezultate. Se importa variante
--  din biblioteca, iar momentele de filmat se genereaza din cadrele lor.
--
--  DE CE SE COPIAZA, NU SE REFERA
--
--  Prima varianta ar fi fost ca sablonul sa arate spre variante, iar o
--  modificare in biblioteca sa se propage peste tot. Suna curat, dar se bate
--  cap in cap cu sistemul de ciorna: un sablon PUBLICAT are dreptul sa nu se
--  schimbe sub picioarele stilistelor. Daca partenera schimba ritmul unei
--  variante marti seara, reelurile de miercuri n-au voie sa iasa altfel fara
--  ca nimeni sa fi apasat "Publica".
--
--  Deci importul copiaza. `from_design_id` pastreaza proveninenta, ca sa se
--  poata arata din ce varianta a venit rezultatul si sa se poata reimporta
--  cand partenera vrea ea versiunea noua. Legatura e informativa: stergerea
--  variantei din biblioteca NU strica sablonul.
--
--  MOMENTELE NU SE MAI SCRIU DE MANA
--
--  Se genereaza ca reuniune a cadrelor cerute de rezultatele importate:
--  un `shots` per slot_key distinct, cu durata = maximul cerut de vreun
--  rezultat (stilista filmeaza o data, deci filmeaza cat cere cel mai
--  pretentios; fiecare rezultat taie din el).
--
--  Ce NU se genereaza sunt instructiunile de filmare — pozitia telefonului,
--  distanta, miscarea, lumina, propozitia de actiune. Alea raman scrise pe
--  moment, si se PASTREAZA la regenerare: potrivirea se face pe slot_key,
--  deci reimportarea nu sterge munca partenerei. Urmatorul pas al modelului
--  le va urca intr-un catalog de tipuri de cadru, ca sa nu se rescrie la
--  fiecare serviciu.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS from_design_id uuid
    REFERENCES reel_designs(id) ON DELETE SET NULL;

COMMENT ON COLUMN outputs.from_design_id IS
  'Varianta din biblioteca din care a fost importat. Informativ: rezultatul e o copie.';
