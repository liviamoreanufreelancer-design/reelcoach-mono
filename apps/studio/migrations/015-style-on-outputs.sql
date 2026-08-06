-- ════════════════════════════════════════════════════════════════════
--  015 — Stilul apartine POSTARII, nu momentului
--        + publicarea nu mai poate pierde coloane
-- ════════════════════════════════════════════════════════════════════
--
--  PARTEA 1 — de ce se muta stilul
--
--  Pana acum filtrul, tranzitia, viteza si textul stateau pe `shots`. Asta
--  functiona cand un template insemna UN reel. Cu mai multe postari din
--  aceleasi momente, nu mai are sens — se vede pe datele reale:
--
--    "miscarea parului"  in Transformarea -> urmata de after
--                        in Procesul      -> ultima
--                        in Rezultatul    -> PRIMA
--
--  Acelasi moment, trei roluri. O tranzitie setata pe moment nu poate fi
--  corecta in toate trei. La fel textul: "Transformarea" scrie ZIUA 1 peste
--  before, "Procesul" scrie Pasul 2 peste acelasi cadru.
--
--  Model: IMPLICIT pe postare + EXCEPTII pe slot.
--    outputs.filter / outputs.transition   o singura decizie per postare
--    slots[].filter / .transition / .speed / .motionBlur / .textLayers
--                                          doar unde vrea altceva
--
--  Suprascrierile stau in `slots` (jsonb), deci NU cer migratie acum si nici
--  la urmatoarele. Important pentru economia muncii partenerei: cazul obisnuit
--  ramane o decizie per postare, nu una per moment (ar fi ~24 in loc de 9).
--
--  `shots` PASTREAZA coloanele de stil: raman implicitele de nivel moment
--  (ex. `effect`, care vine din pattern) si compatibilitatea cu template-urile
--  existente. Nu stergem nimic in migratia asta.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE outputs
  ADD COLUMN IF NOT EXISTS filter     text,
  ADD COLUMN IF NOT EXISTS transition text;

COMMENT ON COLUMN outputs.filter IS
  'Filtrul implicit al postarii. Un slot il poate suprascrie prin slots[].filter.';
COMMENT ON COLUMN outputs.transition IS
  'Tranzitia implicita intre momente. Un slot o poate suprascrie prin slots[].transition.';


-- ════════════════════════════════════════════════════════════════════
--  PARTEA 2 — publicarea MUTA randurile, nu le mai copiaza
--
--  Pana acum functia lista EXPLICIT fiecare coloana din shots si outputs.
--  Consecinta: orice migratie care adauga o coloana trebuia sa actualizeze si
--  functia, altfel coloana se pierdea TACUT la fiecare "Publica modificarile".
--  S-a intamplat deja o data (010, text_layers, tot textul multi-strat sters)
--  si a trebuit evitat manual inca de trei ori (012, 014, si aici).
--
--  Verificat inainte de schimbare: NIMIC nu refera shots(id) sau outputs(id).
--  Outputurile leaga momentele prin `slot_key` (text), tocmai ca sa nu depinda
--  de id-uri. Deci randurile pot fi MUTATE la parinte in loc de copiate:
--
--    delete from shots where template_id = parinte;
--    update shots set template_id = parinte where template_id = ciorna;
--
--  Fara lista de coloane => coloanele viitoare sunt incluse automat.
--  Capcana dispare definitiv, nu doar pentru migratia asta.
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

  -- Campurile template-ului raman copiate explicit: aici parintele NU poate fi
  -- inlocuit (isi pastreaza id-ul, ca sa ramana valide favoritele si linkurile).
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

  -- Momentele: mutate, nu copiate. Toate coloanele vin automat.
  delete from shots where template_id = v_parent_id;
  update shots set template_id = v_parent_id where template_id = draft_id;

  -- Postarile: la fel.
  delete from outputs where template_id = v_parent_id;
  update outputs set template_id = v_parent_id where template_id = draft_id;

  -- Ciorna nu mai are randuri atasate, deci CASCADE nu mai sterge nimic util.
  delete from templates where id = draft_id;
end;
$function$;
