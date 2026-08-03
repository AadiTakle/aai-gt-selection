-- The plpgsql twin of the SPA-XFORM-01 verifier (serves R11; decision D-027).
--
-- WHAT THIS ADDS. One per-type verifier, `app.exam_verify_spa_xform`, plus the lattice algebra it
-- needs, and one row in `app.exam_verifier_registry`. It is the database half of
-- STAGE2_QUESTION_DESIGN §9.2 U7 for the Stage 2 SPATIAL learning-block type, whose acceptance is
-- a cross-tier differential agreeing on every item x response across BOTH arms of the type.
--
-- THE TYPE. A machine wears a row of marks and applies what each mark stands for, in order, to a
-- pattern of blocks on a 4x4 lattice; the child taps which of five patterns it makes. What a mark
-- DOES is the hidden system — a mark->transformation bijection under `answer.system.mapping`, which
-- never reaches the browser. Six transformations: `pivot` (a quarter turn) and `mirror` (a
-- reflection) re-orient the lattice; `braid`, `stagger`, `drift` and `shunt` rearrange it without
-- re-orienting it. None of them commutes with all of the others, which is what makes "the marks
-- compose IN ORDER" a real thing for a child to learn rather than a slogan.
--
-- WHY THIS PORT IS SHORTER THAN THE FLUID ONE. Every transformation is a PERMUTATION OF THE SIXTEEN
-- CELLS: nothing is added, removed, enclosed or recoloured, so a pattern is a set of occupied cells
-- and nothing else. Applying a transformation is therefore one table lookup per block, and comparing
-- two patterns is comparing two sorted cell lists — there is no attribute algebra to port and no
-- dihedral product to get wrong. That is the generator's anti-chrome guarantee showing up as a
-- simpler verifier rather than as a comment.
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
-- FAITHFUL PORT. This mirrors `verifyXform` in `apps/web/src/lib/exam/verifiers/spatial.ts`
-- statement for statement, including its early returns and the metrics it does and does not emit:
--
--   * the key is RE-DERIVED (resolve the mark chain through the mapping, run the resulting
--     transformation chain over `content.input.blocks`, take the option showing that pattern) and
--     `answer.correctKey` is consulted only when the derivation does not name exactly one option;
--   * a response with no string `selectedKey` is `{correct:false}` with no metrics;
--   * a correct answer reports `M-ERRTYPE = 1` and `M-RULEID = ` the mark-chain length, and omits
--     `M-RULEID` when the chain is empty;
--   * a wrong answer reports `M-ERRTYPE = 0.9 x` the nearness of the partial rule the chosen option
--     encodes, per `answer.strategyTrace`, and `0` when the trace names no rule it recognises.
--
-- No timing quantity is read or emitted. §3.4 rejects a spatial block scored on speed, because
-- within-session rotation practice improves latency for every child and would manufacture a climb
-- that owes nothing to the hidden system.
--
-- ARITHMETIC. `0.9 * nearness` is evaluated in double precision on both sides from the same two
-- literals, so the two tiers agree bit for bit; the differential compares continuous metrics to
-- 1e-9 regardless.
--
-- REVERSIBILITY. Purely additive: four new functions and one registry row. Deleting the row returns
-- the type to the generic keyed default, which for this bank agrees on the verdict and differs only
-- in the metrics.
--
-- STABLE, NOT IMMUTABLE: every result is built with `jsonb_build_object`, which Postgres marks
-- stable, and `supabase db lint` reports the mismatch if a caller claims otherwise.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false). NOT GATED: Gate B needs
-- roughly 128 real children (§4.1.3) and nothing here is evidence about one.

set role app_owner;

-- ===================================================================================
-- 1. The lattice algebra
--
-- A cell is indexed `r * 4 + c`. Each transformation is re-typed here from the coordinate map the
-- generator documents, rather than transcribed as a sixteen-element table, so that the port and the
-- generator can be read against each other line for line. Getting one of these maps wrong is the
-- single most likely way a port of this type could be confidently wrong about its own answer, so it
-- is its own function with its own name rather than six expressions inlined into the verifier.
--
-- Returns NULL for a transformation this port does not know, which is how the verifier detects a
-- mapping it cannot resolve.
-- ===================================================================================

create function app.exam_vxform_cell(p_op text, p_cell integer)
returns integer
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_cell is null or p_cell < 0 or p_cell > 15 then null
    -- quarter turn clockwise about the lattice centre: (r,c) -> (c, 3-r)
    when p_op = 'pivot' then (p_cell % 4) * 4 + (3 - p_cell / 4)
    -- reflection left to right: (r,c) -> (r, 3-c)
    when p_op = 'mirror' then (p_cell / 4) * 4 + (3 - p_cell % 4)
    -- neighbouring columns trade places: (r,c) -> (r, c xor 1)
    when p_op = 'braid' then (p_cell / 4) * 4 + ((p_cell % 4) # 1)
    -- neighbouring rows trade places: (r,c) -> (r xor 1, c)
    when p_op = 'stagger' then ((p_cell / 4) # 1) * 4 + (p_cell % 4)
    -- the four quarters trade places diagonally: (r,c) -> ((r+2) mod 4, (c+2) mod 4)
    when p_op = 'drift' then ((p_cell / 4 + 2) % 4) * 4 + ((p_cell % 4 + 2) % 4)
    -- every block steps one column right, wrapping: (r,c) -> (r, (c+1) mod 4)
    when p_op = 'shunt' then (p_cell / 4) * 4 + ((p_cell % 4 + 1) % 4)
  end
$$;

comment on function app.exam_vxform_cell(text, integer) is
  'Where one lattice cell goes under one SPA-XFORM-01 transformation, on the 4x4 lattice indexed '
  'r*4+c; port of OPERATOR_PERMUTATION in research/exam-question-types/generators/SPA-XFORM-01.mjs '
  'and of XFORM_PERMUTATION in apps/web/src/lib/exam/verifiers/spatial.ts. Re-derived independently '
  'by research/exam-question-types/generators/check-SPA-XFORM-01.mjs. NULL for an unknown '
  'transformation, which is how a mapping this port cannot resolve is detected.';

-- TS `xformBlocks()`: an array of lattice cell indices, else null. A pattern that names a cell off
-- the lattice is malformed, not a pattern with a stray block, and aborts the derivation the same
-- way the TypeScript reader does.
create function app.exam_vxform_blocks(p_value jsonb)
returns integer[]
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(p_value) <> 'array' then null
    when exists (
      select 1
      from jsonb_array_elements(p_value) e
      where app.exam_vint(e.value) is null
         or app.exam_vint(e.value) < 0
         or app.exam_vint(e.value) > 15
    ) then null
    -- array_agg over an empty array is NULL, which would be indistinguishable from malformed.
    else coalesce(
      (select array_agg(app.exam_vint(e.value)::integer) from jsonb_array_elements(p_value) e),
      '{}'::integer[]
    )
  end
$$;

-- TS `state.map(cell => table[cell])`: one transformation applied to a whole pattern.
create function app.exam_vxform_apply(p_op text, p_blocks integer[])
returns integer[]
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_blocks is null then null
    -- Cell 0 is on every lattice, so a NULL here can only mean an unknown transformation. Probing
    -- it keeps the vocabulary itself defined in exactly one place.
    when app.exam_vxform_cell(p_op, 0) is null then null
    else coalesce(
      (select array_agg(app.exam_vxform_cell(p_op, cell)) from unnest(p_blocks) as cell),
      '{}'::integer[]
    )
  end
$$;

-- TS `xformFigureKey()`: the occupied cells in canonical order, so pattern equality is textual.
create function app.exam_vxform_key(p_blocks integer[])
returns text
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_blocks is null then null
    else coalesce(
      (select string_agg(cell::text, '.' order by cell) from unnest(p_blocks) as cell),
      ''
    )
  end
$$;

-- ===================================================================================
-- 2. The verifier
-- ===================================================================================

create function app.exam_verify_spa_xform(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer  jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_input   jsonb := app.exam_vobj(v_content -> 'input');
  v_chain   jsonb := app.exam_varr(v_content -> 'chain');
  v_options jsonb := app.exam_varr(v_content -> 'options');
  v_mapping jsonb := app.exam_vobj(app.exam_vobj(v_answer -> 'system') -> 'mapping');
  v_chosen  text  := app.exam_vstr(p_response -> 'selectedKey');
  v_mark    jsonb;
  v_symbol  text;
  v_op      text;
  -- The running pattern, mutated one transformation at a time.
  v_state   integer[];
  v_target  text;
  v_option  jsonb;
  v_blocks  integer[];
  v_key     text;
  v_hits    text[] := '{}'::text[];
  v_expected text;
  v_depth   integer;
  v_kind    text;
  v_near    double precision;
  v_metrics jsonb;
begin
  -- ---- re-derive the key -----------------------------------------------------------
  -- Every early return below mirrors a `return null` in deriveXformKey(); the caller then falls
  -- back to the stored key, so an unreadable item is graded rather than refused.
  v_state := case when v_input is null then null else app.exam_vxform_blocks(v_input -> 'blocks') end;

  if v_state is null
     or v_chain is null or jsonb_array_length(v_chain) = 0
     or v_options is null or v_mapping is null
  then
    v_expected := null;
  else
    v_expected := '';  -- a non-null sentinel: the derivation is still running
    for v_mark in select value from jsonb_array_elements(v_chain) loop
      v_symbol := app.exam_vstr(v_mark);
      v_op := case when v_symbol is null then null else app.exam_vstr(v_mapping -> v_symbol) end;
      v_state := case when v_op is null then null else app.exam_vxform_apply(v_op, v_state) end;
      if v_state is null then
        v_expected := null;
        exit;
      end if;
    end loop;
  end if;

  if v_expected is not null then
    v_target := app.exam_vxform_key(v_state);
    v_expected := null;
    for v_option in select value from jsonb_array_elements(v_options) loop
      v_key := app.exam_vstr(app.exam_vobj(v_option) -> 'key');
      v_blocks := app.exam_vxform_blocks(app.exam_vobj(v_option) -> 'blocks');
      if v_key is null or v_blocks is null then
        -- A malformed option aborts the whole derivation in TS, not just this option.
        v_hits := '{}';
        exit;
      end if;
      if app.exam_vxform_key(v_blocks) = v_target then
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
    v_depth := jsonb_array_length(coalesce(v_chain, '[]'::jsonb));
    v_metrics := jsonb_build_object('M-ERRTYPE', 1::double precision);
    if v_depth > 0 then
      v_metrics := v_metrics || jsonb_build_object('M-RULEID', v_depth::double precision);
    end if;
    return jsonb_build_object('correct', true, 'metrics', v_metrics);
  end if;

  -- The named partial rule the chosen option encodes (§4.6's strategy trace), on the generator's
  -- own nearness axis, capped so no wrong answer can tie a correct one at 1. Eight classes rather
  -- than the fluid type's six: this grammar also admits `wrong_axis` and `wrong_family`.
  v_kind := app.exam_vstr(app.exam_vobj(app.exam_vobj(v_answer -> 'strategyTrace') -> v_chosen) -> 'kind');
  v_near := case v_kind
    when 'order_error'      then 1.0
    when 'wrong_axis'       then 0.8
    when 'over_application' then 0.65
    when 'wrong_operator'   then 0.5
    when 'omission'         then 0.35
    when 'wrong_family'     then 0.2
    when 'first_step_only'  then 0.1
    when 'identity_copy'    then 0.0
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

comment on function app.exam_verify_spa_xform(jsonb, jsonb) is
  'SPA-XFORM-01; port of verifyXform (verifiers/spatial.ts). Re-derives the key by resolving '
  'content.chain through the server-only answer.system.mapping and running the resulting '
  'transformation chain over content.input.blocks on the 4x4 lattice, falling back to '
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
-- enforces on `content`. A new function's ACL is null until something touches it, and a null ACL
-- means PUBLIC may execute, so the revoke is what does the work here and the grant is what keeps
-- api.exam_submit_response able to grade. `supabase/tests/123_exam_verify_plpgsql.test.sql`
-- assertion 5 fails if any `app.exam_v%` function is left with its default ACL.
-- ===================================================================================

revoke execute on function app.exam_vxform_cell(text, integer)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vxform_blocks(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vxform_apply(text, integer[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vxform_key(integer[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_spa_xform(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vxform_cell(text, integer) to api_executor;
grant execute on function app.exam_vxform_blocks(jsonb) to api_executor;
grant execute on function app.exam_vxform_apply(text, integer[]) to api_executor;
grant execute on function app.exam_vxform_key(integer[]) to api_executor;
grant execute on function app.exam_verify_spa_xform(jsonb, jsonb) to api_executor;

-- ===================================================================================
-- 4. Registration
-- ===================================================================================

insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('SPA-XFORM-01', 'exam_verify_spa_xform',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyXform')
on conflict (type_code) do nothing;
