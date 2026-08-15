-- ════════════════════════════════════════════════════════════════════
--  018 — Varianta nu mai apartine unui sablon de referinta
-- ════════════════════════════════════════════════════════════════════
--
--  Migratia 017 cerea la creare un "sablon de referinta", de unde sa vina
--  filmarile de proba. Era o intrebare in plus la un moment in care partenera
--  nu se gandeste la sabloane, se gandeste la reelul pe care vrea sa-l faca.
--
--  Si era si redundanta. Legatura reala a fost mereu `slots[].slot`, adica
--  slot_key-ul momentului — nu sablonul. Un moment etichetat "before" are
--  acelasi inteles oriunde apare, iar filmarea lui de proba se poate lua de
--  la orice moment cu aceeasi eticheta. Sablonul era doar un filtru pus peste
--  ceva ce nu avea nevoie de filtru.
--
--  Consecinta e chiar directia in care mergem: varianta nu mai e legata de un
--  serviciu anume, e o compozitie peste NUME DE MOMENTE. Exact forma de care
--  e nevoie ca "glow up" construit peste balayage sa se aplice la tuns.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE reel_designs DROP COLUMN IF EXISTS reference_template_id;
