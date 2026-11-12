-- ════════════════════════════════════════════════════════════════════
--  024 — Momentul REFERA tipul de cadru, nu-l mai copiaza
-- ════════════════════════════════════════════════════════════════════
--
--  PROBLEMA
--
--  Migratia 021 a creat catalogul `shot_types` cu intentia scrisa in
--  comentariul lui: "Instructiunile se scriu o data aici si se importa in
--  sabloane." Importul copiaza. Deci azi:
--
--    partenera imbunatateste propozitia unui tip de cadru
--      -> trebuie sa intre in TOATE scenariile care-l folosesc
--      -> munca ei se inmulteste cu numarul de verticale
--
--  Cu patru verticale si 25 de tipuri, o corectura inseamna pana la 40 de
--  editari manuale. Asta e frana principala pe scalare, si nu e o problema
--  de interfata: e o problema de model de date.
--
--  CE SCHIMBA
--
--  `shots.shot_type_id` e o REFERINTA. Variabilele de filmare se citesc din
--  tip, iar coloanele de pe `shots` devin SUPRASCRIERI OPTIONALE:
--
--    NULL pe moment  -> se moșteneste din tip  (cazul obisnuit)
--    valoare pe moment -> excepția, doar pentru acel moment
--
--  Nimic nu se pierde. Coloanele existente ramân exact unde sunt, cu datele
--  lor. Doar capata un inteles nou: "diferit de tip", nu "singura sursa".
--
--  DE CE E SIGURA ACUM, DESI N-AR FI FOST INAINTE DE 015
--
--  RPC-ul `publish_draft_changes` lista explicit fiecare coloana din `shots`
--  cand copia ciorna peste template-ul publicat. O coloana noua s-ar fi
--  pierdut tacut la fiecare "Publica modificarile" — s-a intamplat cu
--  `text_layers` (migratia 010, reparata de 011).
--
--  Migratia 015 a schimbat publicarea sa MUTE randurile in loc sa le copieze:
--
--    delete from shots where template_id = parinte;
--    update shots set template_id = parinte where template_id = ciorna;
--
--  Fara lista de coloane, deci `shot_type_id` vine automat. NU e nevoie sa
--  actualizezi RPC-ul. Capcana din CLAUDE.md e inchisa de 015 pentru totdeauna.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.shots
  ADD COLUMN IF NOT EXISTS shot_type_id text
    REFERENCES public.shot_types(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shots.shot_type_id IS
  'Tipul de cadru din catalog. Variabilele de filmare se citesc din el; coloanele de pe shots sunt suprascrieri (NULL = moștenește).';

-- Cautarea "ce momente folosesc tipul X" ruleaza la fiecare editare de catalog.
CREATE INDEX IF NOT EXISTS shots_shot_type_id_idx
  ON public.shots (shot_type_id)
  WHERE shot_type_id IS NOT NULL;

-- ── Legarea retroactiva, unde cheia o permite ──────────────────────────
--
--  `slot_key` (012) si `shot_types.id` (021) sunt acelasi vocabular: ambele
--  identifica GLOBAL ce se filmeaza ("before", "aplicare", "dezvaluire").
--  Comentariul din 021 o spune: id-ul e "cheia care leaga cadrul variantei de
--  momentul filmat". Deci momentele cu slot_key care exista in catalog se
--  leaga singure, fara ca partenera sa atinga nimic.
--
--  Restul ramân nelegate si continua sa functioneze din coloanele proprii.
UPDATE public.shots s
   SET shot_type_id = s.slot_key
  FROM public.shot_types t
 WHERE s.shot_type_id IS NULL
   AND s.slot_key IS NOT NULL
   AND t.id = s.slot_key;
