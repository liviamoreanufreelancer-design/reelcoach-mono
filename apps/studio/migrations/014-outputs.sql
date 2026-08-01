-- ════════════════════════════════════════════════════════════════════
--  014 — Modelul de sesiune, partea 2: OUTPUTURILE
-- ════════════════════════════════════════════════════════════════════
--
--  Pana acum un template = un reel. De acum un template = o SESIUNE:
--  un set de momente capturate din care ies MAI MULTE postari.
--
--  Din sesiunea reala a partenerei (balayage, 9 momente):
--    Reel "Transformarea"  before -> prima trasatura -> ... -> after
--    Reel "Procesul"       mixare -> prima trasatura -> ... (fara before)
--    Reel "Rezultatul"     miscarea parului -> detaliu -> after
--    Carusel               before -> detaliu -> after
--    Story-uri             fiecare clip brut, fara montaj
--
--  Momentele se refera prin `slot_key`, NU prin `shots.id`: publicarea
--  recreeaza randurile din shots cu id-uri noi, deci o cheie straina ar
--  ramane orfana tacut. Vezi migratia 012.
--
--  `slots` e jsonb ORDONAT — ordinea din array E ordinea din montaj:
--    [{"slot":"before","sec":1.5},{"slot":"prima-trasatura","sec":2}]
--
--  `sec` e durata in ACEST output. Acelasi moment are durate diferite in
--  outputuri diferite (prima trasatura: 2s in "Transformarea", 3s in
--  "Procesul") — de asta durata sta aici si nu pe shot.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outputs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name        text NOT NULL,                       -- "Transformarea"
  kind        text NOT NULL DEFAULT 'reel',        -- reel | carousel | stories
  slots       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{slot, sec}] ordonat
  caption     text,                                -- caption implicit, editabil
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outputs DROP CONSTRAINT IF EXISTS outputs_kind_check;
ALTER TABLE outputs ADD CONSTRAINT outputs_kind_check
  CHECK (kind IN ('reel', 'carousel', 'stories'));

CREATE INDEX IF NOT EXISTS outputs_template_idx ON outputs (template_id, sort_order);

-- Acelasi RLS ca pe restul: mobilul citeste doar ce e publicat.
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outputs_read_published ON outputs;
CREATE POLICY outputs_read_published ON outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM templates t
       WHERE t.id = outputs.template_id
         AND t.status = 'published'
    )
  );

DROP POLICY IF EXISTS outputs_write_authenticated ON outputs;
CREATE POLICY outputs_write_authenticated ON outputs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════
--  publish_draft_changes — copiaza si OUTPUTURILE
-- ════════════════════════════════════════════════════════════════════
--  CRITIC. Outputurile apartin ciornei (template_id = draft_id), iar pasul
--  final al functiei sterge ciorna — deci fara blocul de mai jos, tot ce
--  defineste partenera ar disparea la fiecare "Publica modificarile",
--  prin ON DELETE CASCADE. Tacut, ca la text_layers in migratia 010.
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

  -- OUTPUTURILE: aceeasi logica, altfel se pierd la stergerea ciornei.
  delete from outputs where template_id = v_parent_id;

  insert into outputs (template_id, name, kind, slots, caption, sort_order)
  select v_parent_id, name, kind, slots, caption, sort_order
  from outputs where template_id = draft_id
  order by sort_order;

  delete from templates where id = draft_id;
end;
$function$;
