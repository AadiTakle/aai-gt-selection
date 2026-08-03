-- The per-type verifier for QUANT-GLYPHNUM-01 "Alien Numbers" (serves R11; decision D-027).
--
-- WHAT THIS ADDS. One per-type verifier, `app.exam_verify_quant_glyphnum`, plus the two-layer
-- notation reader it needs, and one row in `app.exam_verifier_registry`. It is the database half
-- of STAGE2_QUESTION_DESIGN §9.2 U7 for the quantitative Stage 2 type, whose acceptance is a
-- cross-tier differential agreeing on every item x response across BOTH arms of the type.
--
-- THE TYPE. A written expression of one to four glyphs sits above a number line whose right-hand
-- end is labelled with another expression in the same invented notation; the child taps which of
-- five marked positions the expression belongs at, and the renderer posts back the RATIO of the
-- mark it tapped. What a glyph is worth is the hidden system — a glyph->role bijection under
-- `answer.system.mapping`, which never reaches the browser. Five roles in a base-4 notation:
-- `scaleI`/`scaleII`/`scaleIII` are worth 1/4/16 and ADD, so a run of them is order-free;
-- `digitII`/`digitIII` are worth 2/3 and MULTIPLY the scale immediately after them. An expression
-- is read left to right as a sum of units, where a unit is either a bare scale or a digit bound to
-- the scale that follows it.
--
-- WHY A PER-TYPE VERIFIER AT ALL, WHEN THE GENERIC PLACEMENT ONE ALREADY GRADES THIS BANK.
-- `scoring.rule = 'placement_tolerance'` already routes these items to
-- `app.exam_verify_placement_tolerance`, which reads the stored `answer.targetRatio` and compares.
-- That is correct and it is what the app tier does. What it cannot do is CHECK the stored scalar:
-- a `targetRatio` corrupted in the bank, in a migration, or in the item row would be graded
-- against faithfully and silently. This function instead RE-DERIVES the target from the hidden
-- system every time — resolve `content.expression` through `answer.system.mapping`, read the
-- resulting role sequence under the notation's own grammar, and divide by `answer.lineMax` — and
-- consults `answer.targetRatio` only when that derivation cannot run at all. It is the same
-- discipline `app.exam_verify_opchain` applies to `answer.correctKey`, and the same reason: the
-- stored key is the cross-check, not the authority.
--
-- IT EMITS EXACTLY `M-PAE`, AND THAT IS DELIBERATE. The app tier keeps the generic placement
-- verifier for this type — `apps/web/src/lib/exam/stage2-glyphnum-mpae.test.ts` pins
-- `resolveVerifier` to `verifyPlacementTolerance` — because `content` gives a browser no way to
-- derive the target, so a TypeScript re-derivation would have nothing extra to read. The two
-- tiers must therefore return the same verdict AND the same metric map, which is what
-- `apps/web/scripts/verifier-differential.ts` compares (a type with no app-tier per-type verifier
-- is reported GENERIC, and GENERIC types have their metrics compared exactly). So this function
-- returns `{'M-PAE': |placedRatio - targetRatio|}` and nothing else. Adding a strategy-trace
-- metric here would be a cross-tier divergence dressed up as extra information.
--
-- ARITHMETIC, AND WHY THE RATIO GOES THROUGH `numeric`. The generator writes
-- `targetRatio = round6(trueValue / lineMax)` where `round6(x) = Math.round(x * 1e6) / 1e6`.
-- Reproducing that in float8 would be a coin flip at the seventh decimal, because
-- `round(double precision)` rounds half to EVEN while `Math.round` rounds half up. Dividing two
-- exact integers as `numeric` and rounding at scale 6 rounds half away from zero, which for a
-- positive ratio is the same rule JavaScript applies, and it removes the double-rounding question
-- entirely. The two can only disagree on an exact half at the seventh digit, which needs
-- `128 | lineMax`; the generator's line candidates top out at 96, so no such item exists and none
-- can be built. Verified rather than assumed: assertion 10 of
-- `supabase/tests/131_exam_verify_quant_glyphnum.test.sql` requires M-PAE to be EXACTLY zero at
-- the keyed tick of every sampled bank item from both arms, which holds only if the derived ratio
-- is the same double the generator wrote.
--
-- ONE VERIFIER FOR BOTH ARMS. D-S2-3 makes the scrambled-system control a binding acceptance gate
-- and §4.1.1 makes it a generator MODE rather than a separate artifact: one generator, one
-- renderer, one verifier. The two arms differ only in whether the glyph->role mapping is re-drawn
-- per item, and this function reads the mapping per item either way, so there is no arm branch
-- anywhere in it. Only the `consistent` arm is ever served to a child — the scrambled bank lives
-- outside `research/exam-question-types/banks/` and both `scripts/sync-exam-demos.mjs` and
-- `apps/web/src/lib/exam/bank-loader.ts` refuse it — but the differential and the pgTAP test run
-- both banks through this function, which is what U7 asks for.
--
-- REVERSIBILITY. Purely additive: three new functions and one registry row. Deleting the row
-- returns the type to `scoring.rule = placement_tolerance` and therefore to
-- `app.exam_verify_placement_tolerance`, which agrees with this function on every item of both
-- banks — exactly how the type behaved before this migration.
--
-- STABLE, NOT IMMUTABLE: the verdict is built with `jsonb_build_object`, which Postgres marks
-- stable, and `supabase db lint` reports the mismatch if a caller claims otherwise. The two
-- notation readers are pure and are marked immutable.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false). NOT GATED: Gate B needs
-- roughly 128 real children (§4.1.3) and nothing here is evidence about one.

set role app_owner;

-- ===================================================================================
-- 1. The notation
--
-- Two functions rather than three lines inlined into the verifier, for the reason
-- `app.exam_vopchain_orient` is its own function: getting the composition rule wrong is the single
-- most likely way a port of this type could be confidently wrong about its own answer, so the rule
-- is named, commented and independently testable.
-- ===================================================================================

-- Role -> value. NULL for anything outside the closed vocabulary, which is how an unreadable
-- mapping aborts the derivation instead of silently valuing a role at zero.
create function app.exam_vglyphnum_role(p_role text)
returns integer
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select case p_role
    when 'scaleI'   then 1
    when 'scaleII'  then 4
    when 'scaleIII' then 16
    when 'digitII'  then 2
    when 'digitIII' then 3
  end
$$;

comment on function app.exam_vglyphnum_role(text) is
  'QUANT-GLYPHNUM-01 role values in the base-4 notation: the sign-value ladder 1/4/16 and the two '
  'multipliers 2/3. Port of SCALE_ROLES/DIGIT_ROLES in '
  'research/exam-question-types/generators/QUANT-GLYPHNUM-01.mjs. Holds no key material: the '
  'secret is which GLYPH plays which role, not what a role is worth.';

-- The grammar: an expression is a sum of units, and a unit is a bare scale or a digit bound to the
-- scale after it.
create function app.exam_vglyphnum_value(p_roles text[])
returns integer
language plpgsql
immutable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n     integer := coalesce(array_length(p_roles, 1), 0);
  v_i     integer := 1;
  v_total integer := 0;
  v_here  text;
  v_next  text;
  v_here_value integer;
  v_next_value integer;
begin
  if v_n = 0 then
    return null;
  end if;

  while v_i <= v_n loop
    v_here := p_roles[v_i];
    v_here_value := app.exam_vglyphnum_role(v_here);
    if v_here_value is null then
      return null;
    end if;

    v_next := case when v_i < v_n then p_roles[v_i + 1] else null end;
    v_next_value := app.exam_vglyphnum_role(v_next);

    if v_here in ('digitII', 'digitIII')
       and v_next in ('scaleI', 'scaleII', 'scaleIII')
       and v_next_value is not null
    then
      v_total := v_total + v_here_value * v_next_value;
      v_i := v_i + 2;
    else
      -- TOTAL by design, matching `valueOf` in the generator: a digit with no scale after it —
      -- which the grammar never emits but a wrong mapping can produce — falls back to its own face
      -- value rather than making the whole expression unreadable.
      v_total := v_total + v_here_value;
      v_i := v_i + 1;
    end if;
  end loop;

  return v_total;
end
$$;

comment on function app.exam_vglyphnum_value(text[]) is
  'Reads a QUANT-GLYPHNUM-01 role sequence as a number: glyphs ADD, except that a digit role '
  'MULTIPLIES the scale role immediately after it. Port of valueOf() in '
  'research/exam-question-types/generators/QUANT-GLYPHNUM-01.mjs, re-derived independently by '
  'generators/check-QUANT-GLYPHNUM-01.mjs. NULL when the sequence is empty or names a role '
  'outside the closed vocabulary.';

-- ===================================================================================
-- 2. The verifier
-- ===================================================================================

create function app.exam_verify_quant_glyphnum(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content    jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer     jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_expression jsonb := app.exam_varr(v_content -> 'expression');
  v_mapping    jsonb := app.exam_vobj(app.exam_vobj(v_answer -> 'system') -> 'mapping');
  v_line_max   double precision := app.exam_vint(v_answer -> 'lineMax');
  v_placed     double precision := app.exam_vnum(p_response -> 'placedRatio');
  v_tolerance  double precision := app.exam_vnum(v_answer -> 'tolerance');
  v_glyph_json jsonb;
  v_glyph      text;
  v_role       text;
  v_roles      text[] := '{}'::text[];
  v_value      integer;
  v_target     double precision;
  v_pae        double precision;
begin
  -- ---- re-derive the target ratio ---------------------------------------------------
  -- Every abandonment below drops through to the stored `answer.targetRatio`, so an item this
  -- function cannot read is still graded by the generic contract rather than refused.
  if v_expression is not null
     and jsonb_array_length(v_expression) > 0
     and v_mapping is not null
     and v_line_max is not null
     and v_line_max > 0
  then
    for v_glyph_json in select value from jsonb_array_elements(v_expression) loop
      v_glyph := app.exam_vstr(v_glyph_json);
      v_role := case when v_glyph is null then null else app.exam_vstr(v_mapping -> v_glyph) end;
      if v_role is null then
        v_roles := null;
        exit;
      end if;
      v_roles := v_roles || v_role;
    end loop;

    if v_roles is not null then
      v_value := app.exam_vglyphnum_value(v_roles);
      if v_value is not null then
        -- round6() through exact integer arithmetic. See the header on why this is not float8.
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
  '(apps/web/src/lib/exam/verifiers/generic.ts) but RE-DERIVES answer.targetRatio by resolving '
  'content.expression through the server-only answer.system.mapping and reading the resulting '
  'role sequence under the notation grammar, falling back to the stored ratio only when that '
  'derivation cannot run. Returns pae = |placedRatio - targetRatio| as M-PAE and nothing else, so '
  'the two tiers agree exactly. Serves BOTH persistence arms with no branch between them, which is '
  'what makes the scrambled-system control a control (STAGE2_QUESTION_DESIGN 4.1.1). Returns no '
  'key material: the ratio a response is compared against never appears in the verdict.';

reset role;

-- ===================================================================================
-- 3. Grants: identical posture to every other verifier
--
-- Same block 20260725170000 applies to each of its own functions. A verifier answers "is this
-- response correct" against the server-only key, so any role that can call it can walk the key
-- out one query at a time — and here that is unusually literal, because a placement verifier is a
-- membership oracle on a numeric band: binary-searching `placedRatio` recovers `targetRatio` to
-- the width of the tolerance, and with the target and the served ratios in hand the glyph->role
-- mapping follows. A new function's ACL is null until something touches it, and a null ACL means
-- PUBLIC may execute, so the revoke is what does the work here and the grant is what keeps
-- api.exam_submit_response able to grade.
-- ===================================================================================

revoke execute on function app.exam_vglyphnum_role(text)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vglyphnum_value(text[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_quant_glyphnum(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vglyphnum_role(text) to api_executor;
grant execute on function app.exam_vglyphnum_value(text[]) to api_executor;
grant execute on function app.exam_verify_quant_glyphnum(jsonb, jsonb) to api_executor;

-- ===================================================================================
-- 4. Registration
-- ===================================================================================

insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('QUANT-GLYPHNUM-01', 'exam_verify_quant_glyphnum',
   'apps/web/src/lib/exam/verifiers/generic.ts verifyPlacementTolerance')
on conflict (type_code) do nothing;
