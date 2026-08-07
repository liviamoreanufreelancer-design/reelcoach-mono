-- ════════════════════════════════════════════════════════════════════
--  016 — Coperta unei postari: CARE moment, nu ce fisier
-- ════════════════════════════════════════════════════════════════════
--
--  Rezultatele se vad acum ca niste cartonase cu forma formatului lor.
--  Fiecare cartonas are nevoie de o imagine, altfel grila e o insiruire de
--  dreptunghiuri gri si n-ai castigat nimic fata de o lista de nume.
--
--  Imaginea NU se incarca. Se DESENEAZA, cu `renderPreviewFrame`, dintr-un
--  cadru al unui moment pe care postarea il contine deja — cu filtrul si
--  textul postarii aplicate. Deci arata exact ca postarea, costa milisecunde
--  si se actualizeaza singura cand partenera schimba filtrul.
--
--  De ce nu un `cover_url`:
--    - urcarea unei imagini per rezultat = zeci de fisiere de ales si urcat,
--      un cost care creste cu numarul de rezultate (vezi "economia muncii
--      partenerei" din CLAUDE.md)
--    - un fisier urcat ingheata: schimbi filtrul postarii, coperta minte
--    - e munca degeaba — coperta corecta a unui reel E primul lui cadru
--
--  Ramane doar alegerea, cand primul moment nu e cel mai bun cadru: care
--  moment da coperta. O apasare, nu un fisier.
--
--  NULL = primul moment din `slots`. Valoarea e un `slot_key`, ca peste tot
--  in `slots` — nu un `shots.id`, fiindca publicarea recreeaza momentele.
--
--  Publicarea: migratia 015 a facut-o sa MUTE randurile, nu sa le copieze
--  coloana cu coloana. Coloana asta noua ajunge deci pe template-ul publicat
--  fara nicio modificare in `publish_draft_changes` — capcana care a inghitit
--  `text_layers` nu mai exista.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS cover_slot text;

COMMENT ON COLUMN outputs.cover_slot IS
  'slot_key-ul momentului care da cadrul de coperta. NULL = primul din slots.';
