-- Repara publish_draft_changes: copia toate coloanele din `shots` MAI PUTIN
-- `text_layers`, adaugata de migratia 010 (text overlay multi-strat).
--
-- Efect inainte de fix: la fiecare "Publica modificarile", tot textul
-- multi-strat setat de partenera in ciorna era sters in tacere. Lantul din
-- cod (Studio -> DB -> mobile -> renderReelInBrowser) era corect; publicarea
-- distrugea datele inainte sa ajunga pe telefon.
--
-- ATENTIE PENTRU VIITOR: functia listeaza EXPLICIT fiecare coloana. Orice
-- migratie care mai adauga o coloana in `shots` trebuie sa actualizeze si
-- functia asta, altfel coloana noua se pierde tacut la publicare — fara
-- eroare, fara semnal. S-a intamplat deja o data (010).

CREATE OR REPLACE FUNCTION public.publish_draft_changes(draft_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_parent_id text;
begin
  -- gaseste parintele
  select parent_id into v_parent_id from templates where id = draft_id;
  if v_parent_id is null then
    raise exception 'Template % nu e un draft-copy (parent_id lipseste)', draft_id;
  end if;

  -- 1) copiaza campurile editabile din draft peste parinte
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

  -- 2) sterge shots-urile vechi ale parintelui
  delete from shots where template_id = v_parent_id;

  -- 3) copiaza shots-urile din draft catre parinte (id-uri noi)
  --    text_layers ADAUGAT aici (migratia 010) — lipsea si se pierdea.
  insert into shots (
    template_id, sort_order, pattern, title, hook, overlay_text, text_layers,
    recording_duration, final_usage_duration, countdown, transition_type,
    filter_style, effect, hands_busy, instructions, must_show, must_see,
    how_shoot, example_image_url, sample_video_url, text_slot_role,
    caption_position, caption_preset, playback_speed, motion_blur,
    technique_demo_id, diagram_url, diagram_id,
    phone_hold, shot_distance, light_sources, phone_movement, subject_type
  )
  select
    v_parent_id, sort_order, pattern, title, hook, overlay_text, text_layers,
    recording_duration, final_usage_duration, countdown, transition_type,
    filter_style, effect, hands_busy, instructions, must_show, must_see,
    how_shoot, example_image_url, sample_video_url, text_slot_role,
    caption_position, caption_preset, playback_speed, motion_blur,
    technique_demo_id, diagram_url, diagram_id,
    phone_hold, shot_distance, light_sources, phone_movement, subject_type
  from shots where template_id = draft_id
  order by sort_order;

  -- 4) sterge draft-ul (cascade sterge shots-urile lui)
  delete from templates where id = draft_id;
end;
$function$;
