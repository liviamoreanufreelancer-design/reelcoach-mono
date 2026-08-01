-- ════════════════════════════════════════════════════════════════════
--  012 — Modelul de sesiune, partea 1: momentele capturate
-- ════════════════════════════════════════════════════════════════════
--
--  Un template devine o SESIUNE: un set de capturi din care ies mai multe
--  outputuri. Migratia asta pregateste doar CAPTURILE. Tabelul `outputs`
--  (Etapa B) vine separat, ca sa putem testa pozele independent.
--
--  Doua coloane pe `shots`:
--
--  capture_kind — 'video' sau 'photo'. Din planul real al partenerei, 3 din 9
--    momente sunt poze (before, after, detaliu culoare) si 3 din 4 montaje
--    depind de ele. Un cadru extras dintr-un video iese neclar, de asta se
--    captureaza separat. Motorul le suporta deja (LoadedClip.source).
--
--  slot_key — identitatea STABILA a momentului in sesiune ("before",
--    "mixare", "dezvaluire"). Outputurile vor referi momentele prin cheia
--    asta, NU prin shots.id.
--
--    De ce: publish_draft_changes face delete + insert pe shots, deci
--    fiecare publicare genereaza id-uri NOI. Orice cheie straina catre
--    shots.id ar ramane orfana la prima publicare — tacut, ca la text_layers.
--    Cheia text supravietuieste pentru ca e doar o coloana copiata.
--
--    Se genereaza automat din pattern/pozitie in Studio; partenera o poate
--    suprascrie. Costul per scena ramane zero in cazul obisnuit.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE shots
  ADD COLUMN IF NOT EXISTS capture_kind text NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS slot_key     text;

-- Doar cele doua valori au sens; orice altceva e o eroare de scriere.
ALTER TABLE shots DROP CONSTRAINT IF EXISTS shots_capture_kind_check;
ALTER TABLE shots ADD CONSTRAINT shots_capture_kind_check
  CHECK (capture_kind IN ('video', 'photo'));

-- Cheia trebuie sa fie unica in cadrul unui template: doua momente cu
-- acelasi slot_key ar face slot-matching-ul ambiguu.
-- Partial (WHERE slot_key IS NOT NULL) ca sa nu blocheze scenele necompletate.
CREATE UNIQUE INDEX IF NOT EXISTS shots_template_slot_key_uniq
  ON shots (template_id, slot_key)
  WHERE slot_key IS NOT NULL;

-- Backfill: momentele existente sunt filmari, si primesc o cheie derivata din
-- pattern + pozitie (ex. "before-1", "process-3"). Stabila si lizibila.
UPDATE shots
   SET slot_key = COALESCE(NULLIF(pattern, ''), 'moment') || '-' || sort_order
 WHERE slot_key IS NULL;


-- ════════════════════════════════════════════════════════════════════
--  publish_draft_changes — ADAUGA cele doua coloane noi
-- ════════════════════════════════════════════════════════════════════
--  CRITIC. Functia listeaza EXPLICIT fiecare coloana. Daca nu le adaugam
--  aici, capture_kind si slot_key se pierd tacut la fiecare "Publica
--  modificarile" — exact bug-ul reparat de migratia 011 pentru text_layers.
--  Vezi CLAUDE.md, sectiunea "CAPCANA: coloane noi in shots".
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.publish_draft_changes(draft_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_parent_id text;
begin
  select parent_id into v_parent_id from templates where id = draft_id;
  if v_parent_id is null then
    raise exception 'Template % nu e un draft-copy (parent_id lipseste)', draft_id;
  end if;

  update templates p set
    title            = d.title,
    promise          = d.promise,
    emotional_pitch  = d.emotional_pitch,
    category_id      = d.category_id,
    cover_url        = d.cover_url,
    preview_reel_url = d.preview_reel_url,
    example_video_url = d.example_video_url,
    concept_id       = d.concept_id,
    global_filter    = d.global_filter,
    is_recommended   = d.is_recommended,
    difficulty       = d.difficulty,
    updated_at       = now(),
    published_at     = now()
  from templates d
  where p.id = v_parent_id and d.id = draft_id;

  delete from shots where template_id = v_parent_id;

  insert into shots (
    template_id, sort_order, pattern, title, hook, overlay_text, text_layers,
    capture_kind, slot_key,
    recording_duration, final_usage_duration, countdown, transition_type,
    filter_style, effect, hands_busy, instructions, must_show, must_see,
    how_shoot, example_image_url, sample_video_url, text_slot_role,
    caption_position, caption_preset, playback_speed, motion_blur,
    technique_demo_id, diagram_url, diagram_id,
    phone_hold, shot_distance, light_sources, phone_movement, subject_type
  )
  select
    v_parent_id, sort_order, pattern, title, hook, overlay_text, text_layers,
    capture_kind, slot_key,
    recording_duration, final_usage_duration, countdown, transition_type,
    filter_style, effect, hands_busy, instructions, must_show, must_see,
    how_shoot, example_image_url, sample_video_url, text_slot_role,
    caption_position, caption_preset, playback_speed, motion_blur,
    technique_demo_id, diagram_url, diagram_id,
    phone_hold, shot_distance, light_sources, phone_movement, subject_type
  from shots where template_id = draft_id
  order by sort_order;

  delete from templates where id = draft_id;
end;
$function$;
