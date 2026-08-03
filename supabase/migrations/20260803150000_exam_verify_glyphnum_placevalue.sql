-- QUANT-GLYPHNUM-01's notation reader is replaced: base-6 PLACE VALUE, not the base-4 hybrid.
-- Serves R11; implements D-211. Replaces the reader added in 20260803021000.
--
-- WHY THIS MIGRATION EXISTS AND WHAT WOULD HAVE HAPPENED WITHOUT IT. `app.exam_verify_quant_glyphnum`
-- re-derives the target ratio rather than trusting the stored one, which is the whole reason it exists
-- alongside the generic placement verifier: a `targetRatio` corrupted in the bank, in a migration or in
-- an item row would otherwise be graded against faithfully and silently. That re-derivation resolved
-- `content.expression` through `answer.system.mapping` into ROLE NAMES (`scaleI`, `digitII`, …) and read
-- them under a sign-value/multiplier grammar.
--
-- The rebuilt bank's mapping sends each glyph to an INTEGER digit value, so `app.exam_vstr` on a numeric
-- JSON value returns null, the role loop abandons, and the function falls through to the stored
-- `answer.targetRatio`. It would therefore keep GRADING CORRECTLY while quietly no longer checking
-- anything — the cross-tier differential would still agree, and the one defect this verifier was written
-- to catch would be invisible. That is a worse failure than an error, so the reader is replaced rather
-- than left to degrade.
--
-- THE NOTATION. Five arbitrary marks map bijectively onto the digit values {1,2,3,4,5} of a base-6
-- place-value system, leftmost mark most significant. There is no zero digit: a zero-free digit set in
-- base b has b-1 members, which is why five marks do not announce base 6, and why every digit costs the
-- same to learn (D-211 alternative (c)). A numeral is read `value = value * 6 + digit` across its marks,
-- and the line's maximum is the anchor numeral read the same way.
--
-- WHAT IS AND IS NOT SECRET. `app.exam_vglyphnum_pv_value` holds no key material: the secret is which
-- MARK plays which digit, not what a digit is worth or how places compose. The mapping itself lives in
-- `answer.system.mapping`, which `servedItemSchema` omits.
--
-- ONE VERIFIER FOR BOTH ARMS, unchanged. D-S2-3 makes the scrambled-system control a generator MODE, so
-- the two arms differ only in whether the mapping is re-drawn per item and this function reads the
-- mapping per item either way. There is no arm branch anywhere in it.
--
-- REVERSIBILITY. Purely a redefinition of two functions. Reverting this migration restores the base-4
-- reader, which on the rebuilt bank abandons and falls through to the stored ratio — so the type stays
-- gradeable either way, and what a revert costs is the cross-check rather than correctness.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false). NOT GATED: Gate B needs roughly
-- 128 real children (STAGE2_QUESTION_DESIGN §4.1.3) and nothing here is evidence about one.

set role app_owner;

-- ===================================================================================
-- 1. The notation
-- ===================================================================================

-- Digit value of one mark under the session mapping, as a plain integer in 1..5.
--
-- NULL for anything outside the closed digit set, which is how an unreadable mapping aborts the
-- derivation instead of silently valuing a mark at zero. `jsonb_typeof` is checked rather than relying on
-- a cast, so a mapping that stored `"3"` as a string is treated as unreadable rather than coerced — a
-- silent coercion is exactly how a corrupted bank would slip past the cross-check this function is for.
create or replace function app.exam_vglyphnum_digit(p_value jsonb)
returns integer
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_value is null then null
    when jsonb_typeof(p_value) <> 'number' then null
    when (p_value #>> '{}')::numeric <> trunc((p_value #>> '{}')::numeric) then null
    when (p_value #>> '{}')::numeric < 1 or (p_value #>> '{}')::numeric > 5 then null
    else (p_value #>> '{}')::integer
  end
$$;

comment on function app.exam_vglyphnum_digit(jsonb) is
  'QUANT-GLYPHNUM-01: one mark''s digit value under the session mapping, or NULL when it is outside the '
  'zero-free digit set {1,2,3,4,5}. Port of the digit set in '
  'research/exam-question-types/generators/QUANT-GLYPHNUM-01.mjs. Holds no key material: the secret is '
  'which mark plays which digit, not what a digit is worth.';

-- The grammar: leftmost mark most significant, base 6, every place occupied.
create or replace function app.exam_vglyphnum_pv_value(p_digits integer[])
returns integer
language plpgsql
immutable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n     integer := coalesce(array_length(p_digits, 1), 0);
  v_i     integer;
  v_total integer := 0;
begin
  if v_n = 0 then
    return null;
  end if;

  for v_i in 1..v_n loop
    if p_digits[v_i] is null then
      return null;
    end if;
    v_total := v_total * 6 + p_digits[v_i];
  end loop;

  return v_total;
end
$$;

comment on function app.exam_vglyphnum_pv_value(integer[]) is
  'Reads a QUANT-GLYPHNUM-01 numeral as a base-6 place-value number, leftmost digit most significant. '
  'Port of valueOf() in research/exam-question-types/generators/QUANT-GLYPHNUM-01.mjs, re-derived '
  'independently by generators/check-QUANT-GLYPHNUM-01.mjs. NULL when the numeral is empty or names a '
  'digit outside the closed set.';

-- ===================================================================================
-- 2. The verifier
--
-- Same contract, same metric map, same fall-through discipline as the version it replaces. What changed
-- is the reader in the middle and the fact that the anchor is now read HERE rather than taken from
-- `answer.lineMax`: the whole point of re-deriving is to depend on as little stored scalar as possible,
-- and the anchor is available as a glyph string in `content`.
-- ===================================================================================

create or replace function app.exam_verify_quant_glyphnum(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content    jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer     jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_expression jsonb := app.exam_varr(v_content -> 'expression');
  v_anchor     jsonb := app.exam_varr(app.exam_vobj(v_content -> 'line') -> 'maxExpression');
  v_mapping    jsonb := app.exam_vobj(app.exam_vobj(v_answer -> 'system') -> 'mapping');
  v_placed     double precision := app.exam_vnum(p_response -> 'placedRatio');
  v_tolerance  double precision := app.exam_vnum(v_answer -> 'tolerance');
  v_glyph_json jsonb;
  v_glyph      text;
  v_digit      integer;
  v_numeral    integer[] := '{}'::integer[];
  v_anchor_d   integer[] := '{}'::integer[];
  v_value      integer;
  v_line_max   integer;
  v_target     double precision;
  v_pae        double precision;
begin
  -- ---- re-derive the target ratio ---------------------------------------------------
  -- Every abandonment below drops through to the stored `answer.targetRatio`, so an item this function
  -- cannot read is still graded by the generic contract rather than refused.
  if v_expression is not null
     and jsonb_array_length(v_expression) > 0
     and v_anchor is not null
     and jsonb_array_length(v_anchor) > 0
     and v_mapping is not null
  then
    for v_glyph_json in select value from jsonb_array_elements(v_expression) loop
      v_glyph := app.exam_vstr(v_glyph_json);
      v_digit := case when v_glyph is null then null else app.exam_vglyphnum_digit(v_mapping -> v_glyph) end;
      if v_digit is null then
        v_numeral := null;
        exit;
      end if;
      v_numeral := v_numeral || v_digit;
    end loop;

    for v_glyph_json in select value from jsonb_array_elements(v_anchor) loop
      v_glyph := app.exam_vstr(v_glyph_json);
      v_digit := case when v_glyph is null then null else app.exam_vglyphnum_digit(v_mapping -> v_glyph) end;
      if v_digit is null then
        v_anchor_d := null;
        exit;
      end if;
      v_anchor_d := v_anchor_d || v_digit;
    end loop;

    if v_numeral is not null and v_anchor_d is not null then
      v_value := app.exam_vglyphnum_pv_value(v_numeral);
      v_line_max := app.exam_vglyphnum_pv_value(v_anchor_d);
      if v_value is not null and v_line_max is not null and v_line_max > 0 then
        -- round6() through exact integer arithmetic, for the reason the previous migration records:
        -- reproducing `Math.round(x * 1e6) / 1e6` in float8 is a coin flip at the seventh decimal
        -- because `round(double precision)` rounds half to EVEN. Dividing two exact integers as
        -- `numeric` and rounding at scale 6 rounds half away from zero, which for a positive ratio is
        -- the rule JavaScript applies.
        v_target := round(v_value::numeric / v_line_max::numeric, 6)::double precision;
      end if;
    end if;
  end if;

  if v_target is null then
    v_target := app.exam_vnum(v_answer -> 'targetRatio');
  end if;

  -- ---- grade ------------------------------------------------------------------------
  -- Identical shape to app.exam_verify_placement_tolerance and to verifyPlacementTolerance in
  -- apps/web/src/lib/exam/verifiers/generic.ts: no placement, no target or no band is a fail-closed
  -- `{correct:false}` with NO metrics, because there is no placement error to report.
  if v_placed is null or v_target is null or v_tolerance is null then
    return jsonb_build_object('correct', false);
  end if;

  v_pae := abs(v_placed - v_target);
  return jsonb_build_object(
    'correct', v_pae <= v_tolerance,
    'metrics', jsonb_build_object('M-PAE', v_pae)
  );
end
$$;

comment on function app.exam_verify_quant_glyphnum(jsonb, jsonb) is
  'QUANT-GLYPHNUM-01; grades the same contract as verifyPlacementTolerance '
  '(apps/web/src/lib/exam/verifiers/generic.ts) but RE-DERIVES answer.targetRatio by resolving both '
  'content.expression and content.line.maxExpression through the server-only answer.system.mapping and '
  'reading each as a base-6 place-value numeral, falling back to the stored ratio only when that '
  'derivation cannot run. Returns pae = |placedRatio - targetRatio| as M-PAE and nothing else, so the '
  'two tiers agree exactly. Serves BOTH persistence arms with no branch between them, which is what '
  'makes the scrambled-system control a control (STAGE2_QUESTION_DESIGN 4.1.1). Returns no key material: '
  'the ratio a response is compared against never appears in the verdict.';

reset role;

-- ===================================================================================
-- 3. Grants for the one NEW function
--
-- `create or replace` preserves the ACL of an existing function, so the two redefinitions above keep the
-- posture 20260803021000 set. `app.exam_vglyphnum_digit` is new, and a new function's ACL is null, which
-- means PUBLIC may execute — so the revoke is what does the work here.
--
-- `app.exam_vglyphnum_role` and `app.exam_vglyphnum_value` are deliberately left in place rather than
-- dropped: `supabase/tests/131_exam_verify_quant_glyphnum.test.sql` asserts against the base-4 reader as
-- the record of what this type used to be, and dropping them would make a revert of this migration
-- unable to restore the old verifier body.
-- ===================================================================================

revoke execute on function app.exam_vglyphnum_digit(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function app.exam_vglyphnum_digit(jsonb) to api_executor;
