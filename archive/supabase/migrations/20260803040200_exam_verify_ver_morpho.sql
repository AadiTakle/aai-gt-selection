-- The plpgsql twin of the VER-MORPHO-01 verifier (serves R11; decision D-027).
--
-- WHAT THIS ADDS. One per-type verifier, `app.exam_verify_ver_morpho`, plus the invented
-- morphology it needs, and one row in `app.exam_verifier_registry`. It is the database half of
-- STAGE2_QUESTION_DESIGN §9.2 U7, whose acceptance is a cross-tier differential agreeing on every
-- item x response across BOTH arms of the type.
--
-- THE TYPE. A child sees one labelled reference picture ("this is a SAZ") and then either a
-- derived word (`saz-kib-pav`) with four candidate pictures, or a target picture with four
-- candidate words. What each three-letter morpheme MEANS is the hidden system — a form->meaning
-- bijection under `answer.system.affixMap`, which never reaches the browser. Six morphemes:
-- `plural`, `dual` and `paucal` each swap two values of a three-valued count, so together they are
-- the three transpositions of S3 and they do NOT commute; `negate`, `resize` and `swapRole` toggle
-- one separable attribute each and commute with everything.
--
-- ONE VERIFIER FOR BOTH ARMS. D-S2-3 makes the scrambled-system control a binding acceptance gate
-- and §4.1.1 makes it a generator MODE rather than a separate artifact: one generator, one
-- renderer, one verifier. The two arms differ only in whether the mapping is re-drawn per item, and
-- this function reads the mapping per item either way, so there is no arm branch anywhere in it.
-- Only the `consistent` arm is ever served to a child — the scrambled bank lives outside
-- `research/exam-question-types/banks/` and both `scripts/sync-exam-demos.mjs` and
-- `apps/web/src/lib/exam/bank-loader.ts` refuse it — but the differential runs both banks through
-- this function, which is what U7 asks for.
--
-- FAITHFUL PORT. This mirrors `verifyMorpho` in `apps/web/src/lib/exam/verifiers/verbal.ts`
-- statement for statement, including its early returns and the metrics it does and does not emit:
--
--   * the key is RE-DERIVED (resolve the word's morphemes through the mapping, walk them over
--     `content.stemPicture` left to right, take the option that lands on the result) and
--     `answer.correctKey` is consulted only when the derivation does not name exactly one option;
--   * an unreadable option aborts the WHOLE derivation rather than only that option, because the
--     claim being made is "exactly one option matches" and that cannot be asserted over a slate
--     one of whose members is unknown;
--   * a response with no string `selectedKey` is `{correct:false}` with no metrics;
--   * a correct answer reports `M-ERRTYPE = 1` and `M-RULEID = ` the number of morphemes in the
--     word the key names, and omits `M-RULEID` when that word is a bare stem;
--   * a wrong answer reports `M-ERRTYPE = 0.9 x` the nearness of the partial rule the chosen option
--     encodes, per `answer.strategyTrace`, and `0` when the trace names no rule it recognises.
--
-- ARITHMETIC. `0.9 * nearness` is evaluated in double precision on both sides from the same two
-- literals, so the two tiers agree bit for bit; the differential compares continuous metrics to
-- 1e-9 regardless.
--
-- REVERSIBILITY. Purely additive: five new functions and one registry row. Deleting the row returns
-- the type to the generic keyed default, which for this bank agrees on the verdict and differs only
-- in the metrics, exactly as it behaved before this migration.
--
-- STABLE, NOT IMMUTABLE: every result is built with `jsonb_build_object`, which Postgres marks
-- stable, and `supabase db lint` reports the mismatch if a caller claims otherwise.
--
-- GATE STATUS, STATED RATHER THAN IMPLIED. Born-synthetic throughout (synthetic_only = true,
-- validated = false). NOT GATED: Gate B needs roughly 128 real children (§4.1.3) and nothing here
-- is evidence about one, and Gate A is NOT cleared for this type — A1 and A4 fail, on this bank and
-- equally on an idealised grid with no bank at all, which is the estimator-plus-targeting-loop
-- property E-200 isolated rather than anything about the items this function grades
-- (docs/product/STAGE2_VER_MORPHO_GATE_A.md §1, §3). Whether the type loads on verbal rather than
-- fluid reasoning is A-S2-3 and is untested. Grading an item correctly is a separate claim from any
-- of those, and it is the only claim this file makes.

set role app_owner;

-- ===================================================================================
-- 1. The morphology
--
-- A picture is `{kind, count, size, mark, role}`. Every morpheme is an involution, so "a doubled
-- morpheme undoes itself" is one uniform rule rather than six special cases. The three NUMBER
-- morphemes are the three transpositions of S3 on {one, two, many}, which is the entire reason
-- "the morphemes compose IN THE ORDER WRITTEN" is a real thing for a child to learn rather than a
-- convention — and therefore the single most likely way a port of this type could be wrong about
-- its own answer. It is its own function with its own name rather than five lines inlined into the
-- verifier.
-- ===================================================================================

create function app.exam_vmorpho_step(p_meaning text, p_picture jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_lo    integer;
  v_hi    integer;
  v_count double precision;
begin
  if p_meaning in ('plural', 'dual', 'paucal') then
    -- plural swaps one<->many, dual one<->two, paucal two<->many.
    v_lo := case p_meaning when 'plural' then 1 when 'dual' then 1 else 2 end;
    v_hi := case p_meaning when 'plural' then 3 when 'dual' then 2 else 3 end;
    v_count := app.exam_vnum(p_picture -> 'count');
    if v_count is null then
      return null;
    end if;
    if v_count = v_lo then
      return p_picture || jsonb_build_object('count', v_hi);
    elsif v_count = v_hi then
      return p_picture || jsonb_build_object('count', v_lo);
    end if;
    -- A transposition acting where neither of its two counts is present is the identity.
    return p_picture;
  end if;

  if p_meaning = 'negate' then
    return p_picture || jsonb_build_object(
      'mark', case when app.exam_vstr(p_picture -> 'mark') = 'none' then 'cross' else 'none' end);
  end if;
  if p_meaning = 'resize' then
    return p_picture || jsonb_build_object(
      'size', case when app.exam_vstr(p_picture -> 'size') = 'small' then 'big' else 'small' end);
  end if;
  if p_meaning = 'swapRole' then
    return p_picture || jsonb_build_object(
      'role', case when app.exam_vstr(p_picture -> 'role') = 'doer' then 'target' else 'doer' end);
  end if;

  -- A meaning this port does not know. TS returns null from applyMorphoMeaning here.
  return null;
end
$$;

comment on function app.exam_vmorpho_step(text, jsonb) is
  'One morpheme applied to one picture: the three transpositions of S3 on a three-valued count '
  'plus three attribute toggles. Port of applyMorphoMeaning in '
  'apps/web/src/lib/exam/verifiers/verbal.ts. Re-derived independently by '
  'research/exam-question-types/generators/check-VER-MORPHO-01.mjs.';

-- The picture identity both tiers compare on. Null when any attribute is missing, which is TS's
-- readMorphoPicture() returning null and aborts whatever derivation asked for it.
create function app.exam_vmorpho_sig(p_picture jsonb)
returns text
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when app.exam_vstr(p_picture -> 'kind') is null
      or app.exam_vnum(p_picture -> 'count') is null
      or app.exam_vstr(p_picture -> 'size') is null
      or app.exam_vstr(p_picture -> 'mark') is null
      or app.exam_vstr(p_picture -> 'role') is null
    then null
    else concat_ws('|',
      app.exam_vstr(p_picture -> 'kind'),
      -- Through exam_vjsstring so the count formats the way JavaScript's String() would, which is
      -- what the TypeScript side concatenates.
      app.exam_vjsstring(p_picture -> 'count'),
      app.exam_vstr(p_picture -> 'size'),
      app.exam_vstr(p_picture -> 'mark'),
      app.exam_vstr(p_picture -> 'role'))
  end
$$;

-- How many morphemes a word carries. Position 0 is the stem and never carries a meaning, and the
-- generator hyphen-separates the morphemes so the child decodes syllables rather than a blob.
create function app.exam_vmorpho_affixcount(p_word text)
returns integer
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select greatest(coalesce(array_length(string_to_array(coalesce(p_word, ''), '-'), 1), 1) - 1, 0)
$$;

-- What a written word denotes: its morphemes resolved through the hidden mapping and applied to
-- the reference picture, in the order written.
create function app.exam_vmorpho_denote(p_word text, p_affixmap jsonb, p_base jsonb)
returns text
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_parts   text[];
  v_state   jsonb := p_base;
  v_next    jsonb;
  v_meaning text;
begin
  if p_word is null or p_affixmap is null or p_base is null then
    return null;
  end if;
  v_parts := string_to_array(p_word, '-');
  for v_i in 2 .. coalesce(array_length(v_parts, 1), 0) loop
    v_meaning := app.exam_vstr(p_affixmap -> v_parts[v_i]);
    if v_meaning is null then
      return null;
    end if;
    v_next := app.exam_vmorpho_step(v_meaning, v_state);
    if v_next is null then
      return null;
    end if;
    v_state := v_next;
  end loop;
  return app.exam_vmorpho_sig(v_state);
end
$$;

-- Morphemes in the word the key names — the same count in either direction, because every option
-- word in a picture->word item carries the same number of morphemes by construction.
create function app.exam_vmorpho_depth(p_content jsonb, p_key text)
returns integer
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_option jsonb;
begin
  if coalesce(app.exam_vstr(p_content -> 'direction') = 'pictureToWord', false) then
    for v_option in
      select value
      from jsonb_array_elements(coalesce(app.exam_varr(p_content -> 'options'), '[]'::jsonb))
    loop
      if app.exam_vstr(app.exam_vobj(v_option) -> 'key') = p_key then
        return app.exam_vmorpho_affixcount(app.exam_vstr(app.exam_vobj(v_option) -> 'word'));
      end if;
    end loop;
    return 0;
  end if;
  return app.exam_vmorpho_affixcount(app.exam_vstr(p_content -> 'word'));
end
$$;

-- ===================================================================================
-- 2. The verifier
-- ===================================================================================

create function app.exam_verify_ver_morpho(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content  jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer   jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_base     jsonb := app.exam_vobj(v_content -> 'stemPicture');
  v_options  jsonb := app.exam_varr(v_content -> 'options');
  v_affixmap jsonb := app.exam_vobj(app.exam_vobj(v_answer -> 'system') -> 'affixMap');
  -- Which way round the item runs. `wordToPicture` is the default for anything else, exactly as
  -- the TypeScript reads `direction === 'pictureToWord'`.
  v_toword   boolean := coalesce(app.exam_vstr(v_content -> 'direction') = 'pictureToWord', false);
  v_chosen   text  := app.exam_vstr(p_response -> 'selectedKey');
  v_target   text;
  v_option   jsonb;
  v_word     text;
  v_key      text;
  v_shown    text;
  v_hits     text[] := '{}'::text[];
  v_expected text;
  v_depth    integer;
  v_kind     text;
  v_near     double precision;
  v_metrics  jsonb;
begin
  -- ---- re-derive the key -----------------------------------------------------------
  -- Every early exit below mirrors a `return null` in deriveMorphoKey(); the caller then falls
  -- back to the stored key, so an unreadable item is graded rather than refused.
  if v_base is null or app.exam_vmorpho_sig(v_base) is null
     or v_options is null or jsonb_array_length(v_options) = 0
     or v_affixmap is null
  then
    v_target := null;
  elsif v_toword then
    -- picture->word: the stimulus IS the target, and each candidate word is walked to see which
    -- one denotes it.
    v_target := app.exam_vmorpho_sig(app.exam_vobj(v_content -> 'targetPicture'));
  else
    -- word->picture: the stimulus word is walked once, and the options are read as pictures.
    v_word := app.exam_vstr(v_content -> 'word');
    v_target := case
      when v_word is null then null
      else app.exam_vmorpho_denote(v_word, v_affixmap, v_base)
    end;
  end if;

  if v_target is not null then
    for v_option in select value from jsonb_array_elements(v_options) loop
      v_key := app.exam_vstr(app.exam_vobj(v_option) -> 'key');
      if v_toword then
        v_word := app.exam_vstr(app.exam_vobj(v_option) -> 'word');
        v_shown := case
          when v_word is null then null
          else app.exam_vmorpho_denote(v_word, v_affixmap, v_base)
        end;
      else
        v_shown := app.exam_vmorpho_sig(app.exam_vobj(v_option) -> 'picture');
      end if;
      if v_key is null or v_shown is null then
        -- An unreadable option aborts the whole derivation in TS, not just this option.
        v_hits := '{}';
        exit;
      end if;
      if v_shown = v_target then
        v_hits := v_hits || v_key;
      end if;
    end loop;
    if array_length(v_hits, 1) = 1 then
      v_expected := v_hits[1];
    end if;
  end if;

  -- `?? asString(item.answer.correctKey)`: the stored key is the cross-check, not the authority.
  if v_expected is null then
    v_expected := app.exam_vstr(v_answer -> 'correctKey');
  end if;
  if v_expected is null or v_chosen is null then
    return jsonb_build_object('correct', false);
  end if;

  -- ---- grade -----------------------------------------------------------------------
  if v_chosen = v_expected then
    v_depth := app.exam_vmorpho_depth(v_content, v_expected);
    v_metrics := jsonb_build_object('M-ERRTYPE', 1::double precision);
    if v_depth > 0 then
      v_metrics := v_metrics || jsonb_build_object('M-RULEID', v_depth::double precision);
    end if;
    return jsonb_build_object('correct', true, 'metrics', v_metrics);
  end if;

  -- The named partial rule the chosen option encodes (§4.6's strategy trace), ordered by how much
  -- of the system the error still holds: `order_error` has every meaning right and only the order
  -- wrong; `near_miss` reads one morpheme as the other member of its OWN family, so the family
  -- structure survives; `wrong_operator` reads one as a morpheme from the other family; and
  -- `wrong_family` gets two wrong at once. The two classes shared with FLU-OPCHAIN-01 keep that
  -- type's values so the metric means the same thing across a child's two Stage 2 blocks. Capped
  -- so no wrong answer can tie a correct one at 1.
  v_kind := app.exam_vstr(app.exam_vobj(app.exam_vobj(v_answer -> 'strategyTrace') -> v_chosen) -> 'kind');
  v_near := case v_kind
    when 'order_error'    then 1.0
    when 'near_miss'      then 0.7
    when 'wrong_operator' then 0.55
    when 'wrong_family'   then 0.25
    else null
  end;
  return jsonb_build_object(
    'correct', false,
    'metrics', jsonb_build_object(
      'M-ERRTYPE', case when v_near is null then 0::double precision else 0.9::double precision * v_near end
    )
  );
end
$$;

comment on function app.exam_verify_ver_morpho(jsonb, jsonb) is
  'VER-MORPHO-01; port of verifyMorpho (verifiers/verbal.ts). Re-derives the key by resolving the '
  'word''s morphemes through the server-only answer.system.affixMap and walking them over '
  'content.stemPicture in the order written, in both item directions, falling back to '
  'answer.correctKey only when that names no single option. Serves BOTH persistence arms with no '
  'branch between them, which is what makes the scrambled-system control a control '
  '(STAGE2_QUESTION_DESIGN 4.1.1). Returns no key material.';

reset role;

-- ===================================================================================
-- 3. Grants: identical posture to every other verifier
--
-- Same block 20260725170000 applies to each of its own functions. A verifier answers "is this
-- response correct" against the server-only key, so any role that can call it can walk the key
-- out one query at a time — which would route around the anti-leak invariant the generator
-- enforces on `content`. The helpers are locked down for the same reason and it is not a
-- formality here: `exam_vmorpho_denote` takes the mapping as an argument, so a caller who could
-- reach it could grade candidate mappings directly. A new function's ACL is null until something
-- touches it, and a null ACL means PUBLIC may execute, so the revoke is what does the work here
-- and the grant is what keeps api.exam_submit_response able to grade.
-- ===================================================================================

revoke execute on function app.exam_vmorpho_step(text, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmorpho_sig(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmorpho_affixcount(text)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmorpho_denote(text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmorpho_depth(jsonb, text)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_ver_morpho(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vmorpho_step(text, jsonb) to api_executor;
grant execute on function app.exam_vmorpho_sig(jsonb) to api_executor;
grant execute on function app.exam_vmorpho_affixcount(text) to api_executor;
grant execute on function app.exam_vmorpho_denote(text, jsonb, jsonb) to api_executor;
grant execute on function app.exam_vmorpho_depth(jsonb, text) to api_executor;
grant execute on function app.exam_verify_ver_morpho(jsonb, jsonb) to api_executor;

-- ===================================================================================
-- 4. Registration
-- ===================================================================================

insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('VER-MORPHO-01', 'exam_verify_ver_morpho',
   'apps/web/src/lib/exam/verifiers/verbal.ts verifyMorpho')
on conflict (type_code) do nothing;
