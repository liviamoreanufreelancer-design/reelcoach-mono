-- ════════════════════════════════════════════════════════════════════
--  013 — un moment poate cere si filmare, SI poza
-- ════════════════════════════════════════════════════════════════════
--
--  Decizie de produs (01.08.2026): pozele NU mai intra in reeluri. Ele
--  produc postari separate (carusel, postare single cu caption).
--
--  Dar before, after si detaliul-de-culoare se captureaza in AMBELE feluri,
--  la aceeasi oprire: filmarea intra in reel, poza devine postare.
--  Cu telefonul deja ridicat si cadrul deja ales, poza costa o atingere.
--
--  De ce 'both' pe acelasi moment, si nu doua momente separate:
--  ecranul de filmare e cel mai fragil punct din produs (CLAUDE.md,
--  "Traseul stilistei" pct. 3). Un contor "4/12" descurajeaza mai mult decat
--  "4/9", chiar daca efortul real e identic. Lista ramane la 9 opriri.
--
--  Nu schimba nimic la datele existente: 012 a pus totul pe 'video'.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE shots DROP CONSTRAINT IF EXISTS shots_capture_kind_check;
ALTER TABLE shots ADD CONSTRAINT shots_capture_kind_check
  CHECK (capture_kind IN ('video', 'photo', 'both'));

COMMENT ON COLUMN shots.capture_kind IS
  'video = doar filmare (intra in reel) · photo = doar poza (postare separata) · both = ambele, la aceeasi oprire';
