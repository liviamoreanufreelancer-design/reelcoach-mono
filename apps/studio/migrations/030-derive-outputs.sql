-- ════════════════════════════════════════════════════════════════════
--  030 — Derivarea rezultatelor din sabloane
-- ════════════════════════════════════════════════════════════════════
--
--  DE CE IN BAZA, NU IN TYPESCRIPT
--
--  "Ce rezultate ies din ce s-a filmat" e o operatie pe mulțimi: incluziune de
--  tablouri. Postgres o face nativ (`<@`). Scrisa in TS ar trebui duplicata in
--  Studio si in appul stilistei, iar doua copii ale aceleiasi reguli se
--  desincronizeaza — exact felul de drift pe care regula "preview = export" il
--  interzice la randare.
--
--  CE RAMANE CONTRACTUL DE RULARE
--
--  `outputs`. Appul citeste exact ce citea si inainte, deci nu se schimba
--  nimic in el. Derivarea doar MATERIALIZEAZA randuri lipsa, marcate cu
--  `pattern_id`. Rezultatele scrise de mana (pattern_id NULL) nu sunt atinse.
--
--  `slot` emite slot_key-ul MOMENTULUI, nu id-ul tipului: potrivirea la rulare
--  se face pe slot_key (vezi 014), iar un moment poate avea slot_key diferit
--  de tipul lui.
-- ════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS outputs_template_pattern_uniq
  ON public.outputs (template_id, pattern_id)
  WHERE pattern_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.derive_outputs(p_template_id text)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $function$
declare
  v_inserted integer := 0;
  v_have     text[];
begin
  select array_agg(distinct s.shot_type_id)
    into v_have
    from public.shots s
   where s.template_id = p_template_id
     and s.shot_type_id is not null;

  if v_have is null then
    return 0;
  end if;

  with acoperite as (
    select p.* from public.output_patterns p where p.slot_roles <@ v_have
  ),
  noi as (
    insert into public.outputs
      (template_id, name, kind, slots, pattern_id, style_preset_id, sort_order)
    select
      p_template_id, a.name, a.kind,
      coalesce(
        (select jsonb_agg(
                  jsonb_build_object(
                    'slot', s.slot_key,
                    'sec',  coalesce(s.final_usage_duration, s.recording_duration, 4)
                  ) order by r.ord)
           from unnest(a.slot_roles) with ordinality as r(role, ord)
           join public.shots s
             on s.template_id = p_template_id
            and s.shot_type_id = r.role),
        '[]'::jsonb
      ),
      a.id, a.style_preset_id, a.sort_order
      from acoperite a
     where not exists (
       select 1 from public.outputs o
        where o.template_id = p_template_id and o.pattern_id = a.id
     )
    returning 1
  )
  select count(*) into v_inserted from noi;

  return v_inserted;
end;
$function$;

COMMENT ON FUNCTION public.derive_outputs(text) IS
  'Materializează rezultatele lipsă din șabloanele acoperite de tipurile serviciului. Nu atinge rezultatele scrise de mână (pattern_id NULL).';

-- ── Reversul: ce lipseste, pentru indemnul din app ─────────────────────
CREATE OR REPLACE FUNCTION public.missing_for_patterns(p_template_id text)
  RETURNS TABLE (
    pattern_id    text,
    pattern_name  text,
    kind          text,
    missing_ids   text[],
    missing_names text[],
    missing_count integer
  )
  LANGUAGE sql
  SECURITY INVOKER
  SET search_path = public, pg_temp
AS $function$
  with have as (
    select coalesce(array_agg(distinct s.shot_type_id), '{}'::text[]) as ids
      from public.shots s
     where s.template_id = p_template_id and s.shot_type_id is not null
  ),
  lipsa as (
    select p.id, p.name, p.kind, p.sort_order,
           array(select r from unnest(p.slot_roles) r, have where r <> all(have.ids)) as missing
      from public.output_patterns p, have
     where not (p.slot_roles <@ have.ids)
  )
  select l.id, l.name, l.kind, l.missing,
         array(select st.name from public.shot_types st where st.id = any(l.missing)),
         cardinality(l.missing)
    from lipsa l
   order by cardinality(l.missing), l.sort_order;
$function$;

COMMENT ON FUNCTION public.missing_for_patterns(text) IS
  'Ce tipuri de cadru lipsesc pentru fiecare șablon neacoperit, ordonate după cât de aproape e. Sursa îndemnului din app.';
