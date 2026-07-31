-- The plpgsql twin of the FLU-OPCHAIN-01 verifier (serves R11; decision D-027).
--
-- WHAT THIS ADDS. One per-type verifier, `app.exam_verify_opchain`, plus the D4 orientation
-- algebra it needs, and one row in `app.exam_verifier_registry`. It is the database half of
-- STAGE2_QUESTION_DESIGN §9.2 U7, whose acceptance is a cross-tier differential agreeing on every
-- item x response across BOTH arms of the type.
--
-- THE TYPE. A machine wears a row of badges and applies what each badge stands for, in order, to a
-- small figure; the child taps which of five outputs it makes. What a badge DOES is the hidden
-- system — a badge->operator bijection under `answer.system.mapping`, which never reaches the
-- browser. Six operators: `turn`, `flip` and `slant` act on ORIENTATION and generate the dihedral
-- group D4, so they do not commute; `swap`, `ring` and `twin` toggle independent attributes and
-- commute with everything.
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
-- FAITHFUL PORT. This mirrors `verifyOpChain` in `apps/web/src/lib/exam/verifiers/fluid.ts`
-- statement for statement, including its early returns and the metrics it does and does not emit:
--
--   * the key is RE-DERIVED (resolve the badge chain through the mapping, run the operator chain
--     over `content.input`, take the option showing that figure) and `answer.correctKey` is
--     consulted only when the derivation does not name exactly one option;
--   * a response with no string `selectedKey` is `{correct:false}` with no metrics;
--   * a correct answer reports `M-ERRTYPE = 1` and `M-RULEID = ` the badge-chain length, and omits
--     `M-RULEID` when the chain is empty;
--   * a wrong answer reports `M-ERRTYPE = 0.9 x` the nearness of the partial rule the chosen option
--     encodes, per `answer.strategyTrace`, and `0` when the trace names no rule it recognises.
--
-- ARITHMETIC. `0.9 * nearness` is evaluated in double precision on both sides from the same two
-- literals, so the two tiers agree bit for bit; the differential compares continuous metrics to
-- 1e-9 regardless.
--
-- REVERSIBILITY. Purely additive: two new functions and one registry row. Deleting the row returns
-- the type to the generic keyed default, which for this bank agrees on the verdict and differs only
-- in the metrics, exactly as it behaved before this migration.
--
-- STABLE, NOT IMMUTABLE: every result is built with `jsonb_build_object`, which Postgres marks
-- stable, and `supabase db lint` reports the mismatch if a caller claims otherwise.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false). NOT GATED: Gate B needs
-- roughly 128 real children (§4.1.3) and nothing here is evidence about one.

set role app_owner;

-- ===================================================================================
-- 1. The D4 orientation algebra
--
-- An orientation is the group element r^a m^b: `a` quarter turns clockwise and `b` a mirror flag.
-- The product below is the relation m.r = r^-1.m, which is the entire reason `turn` and `flip` fail
-- to commute — and therefore the entire reason "the badges compose IN ORDER" is a real thing for a
-- child to learn rather than a slogan. Getting this product wrong is the single most likely way a
-- port of this type could be wrong about its own answer, so it is its own function with its own
-- name rather than three lines inlined into the verifier.
-- ===================================================================================

create function app.exam_vopchain_orient(
  p_ga integer, p_gb integer, p_oa integer, p_ob integer
)
returns integer[]
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select array[
    ((p_ga + case when p_gb <> 0 then -p_oa else p_oa end) % 4 + 4) % 4,
    (p_gb + p_ob) % 2
  ]
$$;

comment on function app.exam_vopchain_orient(integer, integer, integer, integer) is
  'Left-multiplication in D4 written as r^a m^b under m.r = r^-1.m; port of composeOrient in '
  'apps/web/src/lib/exam/verifiers/fluid.ts. Re-derived independently by '
  'research/exam-question-types/generators/check-FLU-OPCHAIN-01.mjs.';

-- ===================================================================================
-- 2. The verifier
-- ===================================================================================

create function app.exam_verify_opchain(p_item jsonb, p_response jsonb)
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
  v_badge   jsonb;
  v_symbol  text;
  v_op      text;
  v_orient  jsonb;
  v_pair    integer[];
  -- The running figure, mutated one operator at a time.
  v_glyph   text;
  v_a       integer;
  v_b       integer;
  v_shade   text;
  v_border  integer;
  v_twin    integer;
  v_target  text;
  v_option  jsonb;
  v_figure  jsonb;
  v_forient jsonb;
  v_key     text;
  v_hits    text[] := '{}'::text[];
  v_expected text;
  v_depth   integer;
  v_kind    text;
  v_near    double precision;
  v_metrics jsonb;
begin
  -- ---- re-derive the key -----------------------------------------------------------
  -- Every early return below mirrors a `return null` in deriveOpChainKey(); the caller then falls
  -- back to the stored key, so an unreadable item is graded rather than refused.
  v_orient := case when v_input is null then null else app.exam_vobj(v_input -> 'orient') end;
  v_glyph  := case when v_input is null then null else app.exam_vstr(v_input -> 'glyph') end;
  v_shade  := case when v_input is null then null else app.exam_vstr(v_input -> 'shade') end;
  v_a      := case when v_orient is null then null else app.exam_vint(v_orient -> 'a') end;
  v_b      := case when v_orient is null then null else app.exam_vint(v_orient -> 'b') end;
  v_border := case when v_input is null then null else app.exam_vint(v_input -> 'border') end;
  v_twin   := case when v_input is null then null else app.exam_vint(v_input -> 'pair') end;

  if v_glyph is null or v_shade is null or v_a is null or v_b is null
     or v_border is null or v_twin is null
     or v_chain is null or jsonb_array_length(v_chain) = 0
     or v_options is null or v_mapping is null
  then
    v_expected := null;
  else
    v_expected := '';  -- a non-null sentinel: the derivation is still running
    for v_badge in select value from jsonb_array_elements(v_chain) loop
      v_symbol := app.exam_vstr(v_badge);
      v_op := case when v_symbol is null then null else app.exam_vstr(v_mapping -> v_symbol) end;
      if v_op is null then
        v_expected := null;
        exit;
      end if;
      if v_op in ('turn', 'flip', 'slant') then
        v_pair := app.exam_vopchain_orient(
          case v_op when 'turn' then 1 when 'flip' then 0 else 1 end,
          case v_op when 'turn' then 0 else 1 end,
          v_a, v_b
        );
        v_a := v_pair[1];
        v_b := v_pair[2];
      elsif v_op = 'swap' then
        v_shade := case when v_shade = 'solid' then 'hollow' else 'solid' end;
      elsif v_op = 'ring' then
        v_border := case when v_border <> 0 then 0 else 1 end;
      elsif v_op = 'twin' then
        v_twin := case when v_twin <> 0 then 0 else 1 end;
      else
        -- An operator this port does not know. TS returns null from applyOpChainStep here.
        v_expected := null;
        exit;
      end if;
    end loop;
  end if;

  if v_expected is not null then
    v_target := concat_ws('|', v_glyph, v_a::text || v_b::text, v_shade, v_border::text, v_twin::text);
    v_expected := null;
    for v_option in select value from jsonb_array_elements(v_options) loop
      v_key := app.exam_vstr(app.exam_vobj(v_option) -> 'key');
      v_figure := app.exam_vobj(app.exam_vobj(v_option) -> 'figure');
      v_forient := case when v_figure is null then null else app.exam_vobj(v_figure -> 'orient') end;
      if v_key is null or v_figure is null or v_forient is null
         or app.exam_vstr(v_figure -> 'glyph') is null
         or app.exam_vstr(v_figure -> 'shade') is null
         or app.exam_vint(v_forient -> 'a') is null
         or app.exam_vint(v_forient -> 'b') is null
         or app.exam_vint(v_figure -> 'border') is null
         or app.exam_vint(v_figure -> 'pair') is null
      then
        -- readOpFigure() returning null aborts the whole derivation in TS, not just this option.
        v_hits := '{}';
        exit;
      end if;
      if concat_ws('|',
           app.exam_vstr(v_figure -> 'glyph'),
           app.exam_vint(v_forient -> 'a')::text || app.exam_vint(v_forient -> 'b')::text,
           app.exam_vstr(v_figure -> 'shade'),
           app.exam_vint(v_figure -> 'border')::text,
           app.exam_vint(v_figure -> 'pair')::text
         ) = v_target
      then
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
  -- own nearness axis, capped so no wrong answer can tie a correct one at 1.
  v_kind := app.exam_vstr(app.exam_vobj(app.exam_vobj(v_answer -> 'strategyTrace') -> v_chosen) -> 'kind');
  v_near := case v_kind
    when 'order_error'      then 1.0
    when 'over_application' then 0.85
    when 'omission'         then 0.7
    when 'wrong_operator'   then 0.55
    when 'first_step_only'  then 0.25
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

comment on function app.exam_verify_opchain(jsonb, jsonb) is
  'FLU-OPCHAIN-01; port of verifyOpChain (verifiers/fluid.ts). Re-derives the key by resolving '
  'content.chain through the server-only answer.system.mapping and running the resulting operator '
  'chain over content.input in D4, falling back to answer.correctKey only when that names no '
  'single option. Serves BOTH persistence arms with no branch between them, which is what makes '
  'the scrambled-system control a control (STAGE2_QUESTION_DESIGN 4.1.1). Returns no key material.';

reset role;

-- ===================================================================================
-- 3. Grants: identical posture to every other verifier
--
-- Same block 20260725170000 applies to each of its own functions. A verifier answers "is this
-- response correct" against the server-only key, so any role that can call it can walk the key
-- out one query at a time — which would route around the anti-leak invariant the generator
-- enforces on `content`. A new function's ACL is null until something touches it, and a null ACL
-- means PUBLIC may execute, so the revoke is what does the work here and the grant is what keeps
-- api.exam_submit_response able to grade.
-- ===================================================================================

revoke execute on function app.exam_vopchain_orient(integer, integer, integer, integer)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_opchain(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vopchain_orient(integer, integer, integer, integer)
  to api_executor;
grant execute on function app.exam_verify_opchain(jsonb, jsonb) to api_executor;

-- ===================================================================================
-- 4. Registration
-- ===================================================================================

insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('FLU-OPCHAIN-01', 'exam_verify_opchain',
   'apps/web/src/lib/exam/verifiers/fluid.ts verifyOpChain')
on conflict (type_code) do nothing;
