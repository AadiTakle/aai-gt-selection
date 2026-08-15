-- In-database per-item answer verification (serves R11; BUILD_PLAN §2/§5/§6; decision D-027).
--
-- WHY THIS EXISTS. `app.exam_score_response` and the app tier's per-type verifiers grade the
-- same response by different rules and disagree often: measured 15 of 22 items on a real
-- 22-item battery, so recomputing the composite from `app.exam_scorer_input_json` yields
-- 3.775 against a recorded 7.434 (E-081, docs/architecture/EXAM_PERSISTENCE_NOTES.md §4,
-- D-026). The database's whole verification vocabulary was "compare the submitted
-- key/selectedKey/value to answer_key.correctKey (or answer_key.solution for
-- computed_solver)". The banks are not shaped that way: 31 of the served types are graded by
-- a verifier that RE-DERIVES the expected answer from `content` or from a non-key field of
-- `answer`, a further set declare `computed_solver` but store `correctKey` rather than the
-- `solution` the old branch read, and several key by numeric option index that branch never
-- looked at.
--
-- WHAT THIS CHANGES. Verification moves from one naive comparison to a DISPATCHER that
-- resolves a verifier in the same precedence order as
-- `apps/web/src/lib/exam/verifiers/index.ts` `resolveVerifier`:
--
--     1. the per-type verifier registered for the item's `type_code`;
--     2. the generic verifier named by the item's SERVER-ONLY `scoring.rule`
--        (`placement_tolerance`, `constructed_value_equals_optimum`);
--     3. the option-key default.
--
-- D-019 rejected moving verification INTO the app tier precisely because "the answer-key
-- firewall is only meaningful because key comparison happens inside a schema no client role
-- can reach". This migration implements that intent rather than reversing it: the database
-- becomes the single authority on per-item correctness, and the app-tier verifiers become a
-- cross-check. The owner's stated reason is anti-cheat — an in-database verifier cannot leak
-- a key or a derived expected answer to a browser, because no client role can reach the
-- schema it runs in.
--
-- SCOPE OF THIS MIGRATION. Foundation plus a proof of the pattern, NOT the whole port:
-- the dispatcher, all three generic verifiers, and four per-type verifiers (one per domain,
-- deliberately the awkward shape in each). The remaining 27 land in later additive
-- migrations, each of which adds its function plus one row to `app.exam_verifier_registry`.
-- `docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md` holds the per-type inventory and
-- difficulty ratings; `scripts/verifier-differential.ts` reports coverage as N of 31.
--
-- WHAT THIS IS NOT. It is not a scoring-semantics change. Every function below is a faithful
-- port of its TypeScript counterpart, including its early returns and the metric keys it
-- does and does not emit. Where the port found a TypeScript verifier questionable, that is
-- REPORTED (inventory doc §"Reported, not fixed"), never silently corrected. It is also not
-- a relaxation of the answer-key firewall: every new function is revoked from every client
-- role and granted only to api_executor, exactly as `app.exam_score_response` is, and no key,
-- solution, or derived expected answer appears in any return value.
--
-- REVERSIBILITY. Nothing is dropped. `app.exam_score_response` remains callable and
-- unchanged; only its authority is demoted, following the convention
-- `20260725050000_exam_outcome_ownership.sql` established for `app.exam_compute_outcome`. To
-- restore it, change the one call site in `api.exam_submit_response` back to
-- `v_scored := app.exam_score_response(p_item_id, p_raw_answer);` and drop the metric merge.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false).

set role app_owner;

-- ===================================================================================
-- 1. Untrusted-JSON readers
--
-- One per reader in `apps/web/src/lib/exam/verifiers/types.ts` + the per-domain files.
-- Every one returns NULL rather than raising, because a verifier must return
-- `{correct:false}` on a malformed response and never abort a submission.
--
-- Every function here is a pure function of its arguments, but they are declared STABLE
-- rather than IMMUTABLE because they build their results with `jsonb_build_object`, which
-- Postgres itself marks stable. `supabase db lint` reports the mismatch, and claiming
-- IMMUTABLE over a stable callee is exactly the sort of thing that goes wrong quietly later.
--
-- Numbers are read as `double precision`, not `numeric`, on purpose: the TypeScript
-- verifiers compute in IEEE-754 binary64 and several emit an UNROUNDED float as a metric.
-- Using float8 here keeps the two arithmetics the same shape. It does not make them
-- bit-identical in every case (Math.hypot and Math.atan2 are implementation-defined at the
-- last ulp), which is why the differential harness compares float metrics to a tolerance and
-- `correct` verdicts exactly.
-- ===================================================================================

-- TS `num()`: a finite JSON number, else null. jsonb cannot hold NaN/Infinity.
create function app.exam_vnum(p_value jsonb)
returns double precision
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case when jsonb_typeof(p_value) = 'number' then (p_value #>> '{}')::double precision end
$$;

-- TS `int()` / `asInt()`: a finite JSON number that is an integer, else null.
create function app.exam_vint(p_value jsonb)
returns double precision
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(p_value) = 'number'
      and (p_value #>> '{}')::double precision = trunc((p_value #>> '{}')::double precision)
    then (p_value #>> '{}')::double precision
  end
$$;

-- TS `str()` / `asString()`: a JSON string, else null. `#>> '{}'` unwraps without quoting.
create function app.exam_vstr(p_value jsonb)
returns text
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case when jsonb_typeof(p_value) = 'string' then p_value #>> '{}' end
$$;

-- TS `recordOf()` / `obj()`: a JSON object, else null (an array is NOT a record).
create function app.exam_vobj(p_value jsonb)
returns jsonb
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case when jsonb_typeof(p_value) = 'object' then p_value end
$$;

-- TS `arrayOf()` / `arr()`: a JSON array, else null.
create function app.exam_varr(p_value jsonb)
returns jsonb
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case when jsonb_typeof(p_value) = 'array' then p_value end
$$;

-- JavaScript `String(x)` for a JSON scalar. A number goes through float8 so that
-- `String(12)` is '12' and not the '12.0' a raw jsonb cast would produce.
create function app.exam_vjsstring(p_value jsonb)
returns text
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case jsonb_typeof(p_value)
    when 'string' then p_value #>> '{}'
    when 'number' then to_jsonb((p_value #>> '{}')::double precision)::text
    when 'null' then 'null'
    when 'boolean' then p_value #>> '{}'
    else p_value::text
  end
$$;

-- JavaScript `===` for two JSON scalars: same type AND same value. jsonb `=` alone would
-- call 1 and 1.0 equal but also compares across types, so the type guard is explicit.
create function app.exam_vjseq(p_left jsonb, p_right jsonb)
returns boolean
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select p_left is not null
    and p_right is not null
    and jsonb_typeof(p_left) = jsonb_typeof(p_right)
    and case
      when jsonb_typeof(p_left) = 'number'
        then (p_left #>> '{}')::double precision = (p_right #>> '{}')::double precision
      else p_left = p_right
    end
$$;

-- JavaScript `Math.round(v * 1e4) / 1e4`, the 4dp the solver specs round to. Math.round is
-- half-up toward +Infinity, which `floor(x + 0.5)` reproduces and `round()` does not.
create function app.exam_vround4(p_value double precision)
returns double precision
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case when p_value is null then null else floor(p_value * 1e4 + 0.5) / 1e4 end
$$;

-- TS `proportion(hits, total)`: 0 when there is nothing to score, never a division by zero.
create function app.exam_vproportion(p_hits double precision, p_total double precision)
returns double precision
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case when p_total > 0 then p_hits / p_total else 0::double precision end
$$;

comment on function app.exam_vnum(jsonb) is
  'Untrusted-JSON reader shared by the plpgsql verifiers (port of verifiers/types.ts num()). '
  'Returns null rather than raising so a malformed response yields {correct:false}.';

-- ===================================================================================
-- 2. The per-type verifier registry
--
-- One row per type code that has a PORTED plpgsql verifier. A type absent from this table
-- falls through to the `scoring.rule` generic and then to the option-key default, exactly as
-- `resolveVerifier` does for a type absent from `perTypeVerifiers`.
--
-- It is a table rather than a CASE or a jsonb constant so the remaining 27 ports can land in
-- parallel: each future migration adds its own function and INSERTs its own row, and two such
-- migrations can never conflict. It holds no key material and no participant data — only the
-- name of the function that grades a type.
-- ===================================================================================

create table app.exam_verifier_registry (
  -- Deliberately NOT a foreign key to app.exam_question_type: type rows are created lazily by
  -- api.exam_register_item when a session first serves the type, so a registry row normally
  -- predates its type row. The format check is the same one that table applies (D-020(a)).
  type_code text primary key check (type_code ~ '^[A-Z]+-[A-Za-z0-9]+-[0-9]+$'),
  -- Constrained to the verifier namespace so the dispatcher's dynamic call can never be
  -- pointed at an arbitrary function, even by a future migration.
  verifier_fn text not null check (verifier_fn ~ '^exam_verify_[a-z0-9_]+$'),
  -- Which app-tier verifier this is a port of, so the two can be diffed by name.
  ported_from text not null check (char_length(ported_from) between 1 and 200),
  created_at timestamptz not null default statement_timestamp()
);

comment on table app.exam_verifier_registry is
  'type_code -> plpgsql per-type verifier. Step 1 of app.exam_verify_response''s resolution '
  'order, mirroring perTypeVerifiers in apps/web/src/lib/exam/verifiers/index.ts. A type with '
  'no row here falls through to the scoring.rule generic and then to the keyed default. '
  'Holds no answer-key material.';
comment on column app.exam_verifier_registry.verifier_fn is
  'Unqualified name of an app-schema function (jsonb, jsonb) -> jsonb. The check constraint '
  'pins it to the exam_verify_* namespace so dynamic dispatch cannot reach anything else.';

alter table app.exam_verifier_registry enable row level security;
alter table app.exam_verifier_registry force row level security;

-- Readable by the executor in every context the dispatcher can be called from. Unlike the
-- bank tables this carries no operator-owned rows and no key material, so the read is not
-- gated on the proctor persona — gating it would only create a way for the dispatcher to
-- silently fall back to the keyed default.
create policy exam_verifier_registry_read on app.exam_verifier_registry
  for select to api_executor
  using (true);

-- ===================================================================================
-- 3. Generic verifiers (port of apps/web/src/lib/exam/verifiers/generic.ts)
--
-- Signature is `(p_item jsonb, p_response jsonb) -> jsonb`, mirroring the TypeScript
-- `Verifier` type one for one. `p_item` is the whole item — `content`, the full `answer`
-- block, `scoring` and `provenance` — so a verifier can re-derive the expected answer rather
-- than trust a stored key, which is what makes the app-tier verifiers portable at all.
--
-- The return value is a `Verdict`: `{"correct": boolean}` plus an optional `"metrics"`
-- object. The dispatcher, not the verifier, adds `score` and `mode`.
-- ===================================================================================

-- Option-key verifier. `correctKey` is a string option key ("B") or a numeric option index.
create function app.exam_verify_keyed(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_selected_key text := app.exam_vstr(p_response -> 'selectedKey');
  v_selected_index double precision := app.exam_vnum(p_response -> 'selectedIndex');
  v_correct_key jsonb := p_item -> 'answer' -> 'correctKey';
begin
  if jsonb_typeof(v_correct_key) = 'number' then
    return jsonb_build_object(
      'correct',
      v_selected_index is not null
        and v_selected_index = (v_correct_key #>> '{}')::double precision
    );
  end if;

  if jsonb_typeof(v_correct_key) = 'string' then
    if v_selected_key is not null then
      return jsonb_build_object('correct', v_selected_key = (v_correct_key #>> '{}'));
    end if;
    -- Some banks key by string while the demo reports an index (e.g. "3").
    if v_selected_index is not null then
      return jsonb_build_object(
        'correct', to_jsonb(v_selected_index)::text = (v_correct_key #>> '{}')
      );
    end if;
  end if;

  return jsonb_build_object('correct', false);
end
$$;

comment on function app.exam_verify_keyed(jsonb, jsonb) is
  'Generic option-key verifier; port of verifyKeyed. Reads only selectedKey/selectedIndex, '
  'the two fields the runner actually sends. Resolution step 3 (the default).';

-- Continuous-placement verifier (`scoring.rule = placement_tolerance`, QUANT-NUMLINE-01).
-- Correct iff the placement-absolute error is within the item's server-only tolerance band.
create function app.exam_verify_placement_tolerance(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_answer jsonb := p_item -> 'answer';
  v_placed double precision := app.exam_vnum(p_response -> 'placedRatio');
  v_target double precision := app.exam_vnum(v_answer -> 'targetRatio');
  v_tolerance double precision := app.exam_vnum(v_answer -> 'tolerance');
  v_pae double precision;
begin
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

comment on function app.exam_verify_placement_tolerance(jsonb, jsonb) is
  'Generic continuous-placement verifier; port of verifyPlacementTolerance. The tolerance '
  'band is server-only, so the renderer can never show correctness. Resolution step 2.';

-- Constructed-value verifier (`scoring.rule = constructed_value_equals_optimum`,
-- QUANT-BUILD-01). The child arranges cards; the response carries the numeric value of the
-- final arrangement, which must equal the unique constrained optimum held server-side.
create function app.exam_verify_constructed_value(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_answer jsonb := p_item -> 'answer';
  v_value double precision := app.exam_vnum(p_response -> 'value');
  v_optimal double precision := app.exam_vnum(v_answer -> 'optimalValue');
begin
  if v_value is null then
    return jsonb_build_object('correct', false);
  end if;
  if v_optimal is not null then
    return jsonb_build_object('correct', v_value = v_optimal);
  end if;
  return jsonb_build_object(
    'correct', to_jsonb(v_value)::text = app.exam_vjsstring(v_answer -> 'correctKey')
  );
end
$$;

comment on function app.exam_verify_constructed_value(jsonb, jsonb) is
  'Generic constructed-value verifier; port of verifyConstructedValue. Resolution step 2.';

-- ===================================================================================
-- 4. The dispatcher
-- ===================================================================================

create function app.exam_verify_response(p_item_id uuid, p_raw_answer jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_type_code text;
  v_mode text;
  v_rule text;
  v_item jsonb;
  v_response jsonb;
  v_fn text;
  v_verdict jsonb;
  v_correct boolean;
begin
  select
      i.type_code,
      coalesce(i.scoring ->> 'mode', 'deterministic_key'),
      i.scoring ->> 'rule',
      -- The same fields a `RawBankItem` carries, under the same names, so a plpgsql verifier
      -- and its TypeScript counterpart read identical paths. `answer_key` is exposed to the
      -- verifier as `answer`, which is the contract name BUILD_PLAN §2 uses.
      jsonb_build_object(
        'itemId', i.item_id,
        'typeCode', i.type_code,
        'domain', i.domain,
        'difficulty', i.difficulty,
        'content', i.content,
        'answer', i.answer_key,
        'scoring', i.scoring,
        'provenance', i.provenance
      )
    into v_type_code, v_mode, v_rule, v_item
  from app.exam_item i
  where i.item_id = p_item_id;

  if not found then
    return jsonb_build_object(
      'correct', false, 'score', 0, 'mode', 'unknown',
      'metrics', '{}'::jsonb, 'verifier', 'none'
    );
  end if;

  -- A skipped or timed-out item is scored incorrect WITHOUT grading, mirroring
  -- `/api/exam-submit`, which short-circuits `verify()` on `skipped` and drops the verdict's
  -- metrics. The route stamps `skipped: true` into the raw answer it persists, so this is the
  -- only signal the database gets, and honouring it is what keeps a partially-built artefact
  -- submitted at timeout from grading as correct here while the app tier calls it wrong.
  if (p_raw_answer -> 'skipped') = 'true'::jsonb then
    return jsonb_build_object(
      'correct', false, 'score', 0, 'mode', v_mode,
      'metrics', '{}'::jsonb, 'verifier', 'skipped'
    );
  end if;

  -- The route coerces a non-object response to `{}` before verifying; match it, so a string
  -- or array raw answer reaches the verifiers as the empty response rather than as garbage.
  v_response := case
    when jsonb_typeof(p_raw_answer) = 'object' then p_raw_answer
    else '{}'::jsonb
  end;

  -- RESOLUTION ORDER, identical to resolveVerifier():
  --   1. the per-type verifier registered for this type code, then
  select r.verifier_fn into v_fn
  from app.exam_verifier_registry r
  where r.type_code = v_type_code;

  if v_fn is null then
    v_fn := case v_rule
      --   2. the generic verifier named by the item's server-only scoring.rule, then
      when 'placement_tolerance' then 'exam_verify_placement_tolerance'
      when 'constructed_value_equals_optimum' then 'exam_verify_constructed_value'
      --   3. the option-key default.
      else 'exam_verify_keyed'
    end;
  end if;

  -- `format('%I')` quotes the identifier, and the registry's check constraint pins it to the
  -- exam_verify_* namespace, so this can only ever reach a verifier.
  execute format('select app.%I($1, $2)', v_fn)
    into v_verdict
    using v_item, v_response;

  v_correct := coalesce((v_verdict ->> 'correct')::boolean, false);

  return jsonb_build_object(
    'correct', v_correct,
    'score', case when v_correct then 1 else 0 end,
    'mode', v_mode,
    'metrics', coalesce(v_verdict -> 'metrics', '{}'::jsonb),
    'verifier', v_fn
  );
end
$$;

comment on function app.exam_verify_response(uuid, jsonb) is
  'RETAINED AND WIDENED AUTHORITY (D-027): per-item answer verification against the '
  'server-only answer key, content and scoring rule. Resolves a verifier in the same '
  'precedence order as resolveVerifier() in apps/web/src/lib/exam/verifiers/index.ts: '
  'registered per-type verifier, then the generic named by scoring.rule, then keyed. Returns '
  '{correct, score, mode, metrics, verifier} and NEVER any key, solution, or derived expected '
  'answer. Revoked from every client role.';

-- --- Demote, do not delete --------------------------------------------------------
-- Same convention as app.exam_compute_outcome in 20260725050000: the old implementation stays
-- callable and unchanged so the decision is cheaply reversible.

comment on function app.exam_score_response(uuid, jsonb) is
  'DEMOTED (D-027): reference implementation only. NOT the authority and no longer called by '
  'api.exam_submit_response. Its entire verification vocabulary is "compare the submitted '
  'key/selectedKey/value to answer_key.correctKey, or value to answer_key.solution for '
  'computed_solver", which the banks are not shaped for: it disagreed with the app-tier '
  'verifiers on 15 of 22 items in a real battery (E-081, D-026). Superseded by '
  'app.exam_verify_response. Retained so the decision is cheaply reversible: to restore it, '
  'change the one call site in api.exam_submit_response back to '
  '`v_scored := app.exam_score_response(p_item_id, p_raw_answer);` and drop the metric merge. '
  'Still revoked from every client role.';

reset role;

-- --- Grants: identical posture to app.exam_score_response --------------------------
-- (see 20260724130100_exam_adaptive_api.sql lines 212-221). Every verifier is reachable only
-- from api_executor, which is the whole reason the answer-key firewall means anything.

revoke all on app.exam_verifier_registry from public, anon, authenticated, service_role;
grant select on app.exam_verifier_registry to api_executor;

revoke execute on function app.exam_vnum(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vint(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vstr(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vobj(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_varr(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vjsstring(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vjseq(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vround4(double precision)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vproportion(double precision, double precision)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_keyed(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_placement_tolerance(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_constructed_value(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_response(uuid, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vnum(jsonb) to api_executor;
grant execute on function app.exam_vint(jsonb) to api_executor;
grant execute on function app.exam_vstr(jsonb) to api_executor;
grant execute on function app.exam_vobj(jsonb) to api_executor;
grant execute on function app.exam_varr(jsonb) to api_executor;
grant execute on function app.exam_vjsstring(jsonb) to api_executor;
grant execute on function app.exam_vjseq(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vround4(double precision) to api_executor;
grant execute on function app.exam_vproportion(double precision, double precision) to api_executor;
grant execute on function app.exam_verify_keyed(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_placement_tolerance(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_constructed_value(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_response(uuid, jsonb) to api_executor;

-- ===================================================================================
-- 5. Per-type verifiers — the proof of the pattern
--
-- Four types, one per bank domain, each chosen as the AWKWARD shape in its domain rather
-- than the convenient one, so that what the remaining 27 ports will cost is measured against
-- the hard cases and not the easy ones:
--
--   fluid_reasoning  FLU-CONCEPT-01   rebuilds a hypothesis space and eliminates over it
--   verbal           VER-EVIDENCE-01  compound two-part key + weighted partial credit
--   quantitative     QUANT-MIX-01     ratio arithmetic under a branching served constraint
--   spatial          SPA-XPLANE-01    3-D plane section + Procrustes shape distance
--
-- quantitative has exactly one per-type verifier in the app tier, so QUANT-MIX-01 is that
-- domain's hardest by construction.
-- ===================================================================================

set role app_owner;

-- -----------------------------------------------------------------------------------
-- 5a. FLU-CONCEPT-01 — find the gate's hidden rule, then classify three probes
--
-- Port of verifyConcept (verifiers/fluid.ts). The child tests figures against a gate and
-- then says whether each of three unbuildable probes opens it. `content.gateOracle` is the
-- complete accept-set over the buildable palette, so the rules consistent with it are
-- enumerable and (by construction) agree on all three probes: that agreement is the key. The
-- stored `answer.correctKey` is only the fallback when the evidence does not force one
-- verdict string.
--
-- The oracle is in `content` because the child has to be able to run tests; the type is
-- recorded as knowingly stimulus-derivable in qa/NOT_SERVABLE.json (E-075) and is not
-- blocked.
-- -----------------------------------------------------------------------------------

-- TS `readFigure`: keep the four hypothesis dimensions whose value is a string or a finite
-- number. Returns null only when the input is not an object, matching `asRecord`.
create function app.exam_vconcept_figure(p_value jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_record jsonb := app.exam_vobj(p_value);
  v_out jsonb := '{}'::jsonb;
  v_dim text;
begin
  if v_record is null then
    return null;
  end if;
  foreach v_dim in array array['shape', 'color', 'count', 'size'] loop
    if jsonb_typeof(v_record -> v_dim) in ('string', 'number') then
      v_out := v_out || jsonb_build_object(v_dim, v_record -> v_dim);
    end if;
  end loop;
  return v_out;
end
$$;

-- TS `figureKey`: the four dimensions joined by '|', with a missing one rendered the way
-- `String(undefined)` renders it, because that is what the JavaScript map keys on.
create function app.exam_vconcept_figure_key(p_figure jsonb)
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select coalesce(app.exam_vjsstring(p_figure -> 'shape'), 'undefined')
    || '|' || coalesce(app.exam_vjsstring(p_figure -> 'color'), 'undefined')
    || '|' || coalesce(app.exam_vjsstring(p_figure -> 'count'), 'undefined')
    || '|' || coalesce(app.exam_vjsstring(p_figure -> 'size'), 'undefined')
$$;

-- TS `atomHolds`. `gte` needs both sides numeric; `eq` is JavaScript `===`.
create function app.exam_vconcept_atom_holds(p_atom jsonb, p_figure jsonb)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select case
    when p_figure -> (p_atom ->> 'dim') is null then false
    when (p_atom ->> 'kind') = 'gte' then
      jsonb_typeof(p_figure -> (p_atom ->> 'dim')) = 'number'
      and jsonb_typeof(p_atom -> 'value') = 'number'
      and app.exam_vnum(p_figure -> (p_atom ->> 'dim')) >= app.exam_vnum(p_atom -> 'value')
    else app.exam_vjseq(p_figure -> (p_atom ->> 'dim'), p_atom -> 'value')
  end
$$;

-- TS `ruleAccepts`: a conjunction, so an empty rule accepts (as `[].every()` does).
create function app.exam_vconcept_rule_accepts(p_rule jsonb, p_figure jsonb)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select coalesce(bool_and(app.exam_vconcept_atom_holds(atom, p_figure)), true)
  from jsonb_array_elements(p_rule) as atom
$$;

-- TS `buildConceptModel`: the hypothesis space, the oracle, and the one probe-verdict string
-- the evidence forces. Returns null when the item is not gradeable this way.
create function app.exam_vconcept_model(p_item jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_vary text[];
  v_raw_oracle jsonb;
  v_raw_probes jsonb;
  v_entry jsonb;
  v_figure jsonb;
  v_oracle jsonb := '[]'::jsonb;
  v_values jsonb := '{}'::jsonb;
  v_probe_keys jsonb := '[]'::jsonb;
  v_probes jsonb := '[]'::jsonb;
  v_key text;
  v_dim text;
  v_value jsonb;
  v_seen jsonb;
  v_max_arity integer;
  v_atoms jsonb := '[]'::jsonb;
  v_numbers double precision[];
  v_number double precision;
  v_hypotheses jsonb := '[]'::jsonb;
  v_count integer;
  v_consistent jsonb := '[]'::jsonb;
  v_rule jsonb;
  v_ok boolean;
  v_verdicts text[] := '{}'::text[];
  v_verdict text;
  v_expected text;
begin
  select coalesce(array_agg(app.exam_vstr(e) order by ord), '{}'::text[])
    into v_vary
  from jsonb_array_elements(coalesce(app.exam_varr(v_content -> 'varyDims'), '[]'::jsonb))
    with ordinality as t(e, ord)
  where app.exam_vstr(e) is not null;

  v_raw_oracle := app.exam_varr(v_content -> 'gateOracle');
  v_raw_probes := app.exam_varr(v_content -> 'probes');
  if coalesce(array_length(v_vary, 1), 0) = 0
    or v_raw_oracle is null
    or v_raw_probes is null
    or jsonb_array_length(v_raw_probes) = 0
  then
    return null;
  end if;

  -- Oracle entries, plus the per-dimension value alphabet in first-seen order.
  for v_entry in select e from jsonb_array_elements(v_raw_oracle) as e loop
    v_figure := app.exam_vconcept_figure(app.exam_vobj(v_entry) -> 'figure');
    if v_figure is null or jsonb_typeof(app.exam_vobj(v_entry) -> 'accepts') <> 'boolean' then
      return null;
    end if;
    v_oracle := v_oracle || jsonb_build_array(
      jsonb_build_object('figure', v_figure, 'accepts', v_entry -> 'accepts')
    );
    foreach v_dim in array v_vary loop
      v_value := v_figure -> v_dim;
      if v_value is null then
        continue;
      end if;
      v_seen := coalesce(v_values -> v_dim, '[]'::jsonb);
      if not exists (
        select 1 from jsonb_array_elements(v_seen) as s where app.exam_vjseq(s, v_value)
      ) then
        v_seen := v_seen || jsonb_build_array(v_value);
      end if;
      v_values := v_values || jsonb_build_object(v_dim, v_seen);
    end loop;
  end loop;

  for v_entry in select e from jsonb_array_elements(v_raw_probes) as e loop
    v_key := app.exam_vstr(app.exam_vobj(v_entry) -> 'key');
    v_figure := app.exam_vconcept_figure(app.exam_vobj(v_entry) -> 'figure');
    if v_key is null or v_figure is null then
      return null;
    end if;
    v_probe_keys := v_probe_keys || jsonb_build_array(to_jsonb(v_key));
    v_probes := v_probes || jsonb_build_array(v_figure);
  end loop;

  v_max_arity := least(3, greatest(1, array_length(v_vary, 1) - 1));

  -- TS `conceptHypotheses`: eq atoms per dimension in value order, then the count dimension's
  -- gte atoms over its numeric values ascending, dropping the smallest (which is vacuous).
  foreach v_dim in array v_vary loop
    for v_value in
      select e from jsonb_array_elements(coalesce(v_values -> v_dim, '[]'::jsonb)) as e
    loop
      v_atoms := v_atoms || jsonb_build_array(
        jsonb_build_object('kind', 'eq', 'dim', v_dim, 'value', v_value)
      );
    end loop;
    if v_dim = 'count' then
      select coalesce(array_agg(app.exam_vnum(e) order by app.exam_vnum(e)), '{}'::double precision[])
        into v_numbers
      from jsonb_array_elements(coalesce(v_values -> 'count', '[]'::jsonb)) as e
      where jsonb_typeof(e) = 'number';
      for i in 2 .. coalesce(array_length(v_numbers, 1), 0) loop
        v_number := v_numbers[i];
        v_atoms := v_atoms || jsonb_build_array(
          jsonb_build_object('kind', 'gte', 'dim', 'count', 'value', to_jsonb(v_number))
        );
      end loop;
    end if;
  end loop;

  -- Every conjunction of 1..maxArity atoms with pairwise-distinct dimensions. maxArity is at
  -- most 3, so the TS recursion unrolls into three bounded loops.
  v_count := jsonb_array_length(v_atoms);
  for i in 0 .. v_count - 1 loop
    v_hypotheses := v_hypotheses || jsonb_build_array(jsonb_build_array(v_atoms -> i));
    if v_max_arity < 2 then
      continue;
    end if;
    for j in i + 1 .. v_count - 1 loop
      if (v_atoms -> j ->> 'dim') = (v_atoms -> i ->> 'dim') then
        continue;
      end if;
      v_hypotheses := v_hypotheses
        || jsonb_build_array(jsonb_build_array(v_atoms -> i, v_atoms -> j));
      if v_max_arity < 3 then
        continue;
      end if;
      for k in j + 1 .. v_count - 1 loop
        if (v_atoms -> k ->> 'dim') in ((v_atoms -> i ->> 'dim'), (v_atoms -> j ->> 'dim')) then
          continue;
        end if;
        v_hypotheses := v_hypotheses
          || jsonb_build_array(jsonb_build_array(v_atoms -> i, v_atoms -> j, v_atoms -> k));
      end loop;
    end loop;
  end loop;

  -- Rules that reproduce the whole oracle, and the probe verdicts they agree on.
  for v_rule in select e from jsonb_array_elements(v_hypotheses) as e loop
    select coalesce(
      bool_and(
        app.exam_vconcept_rule_accepts(v_rule, o -> 'figure') = (o ->> 'accepts')::boolean
      ),
      true
    )
      into v_ok
    from jsonb_array_elements(v_oracle) as o;
    if v_ok then
      v_consistent := v_consistent || jsonb_build_array(v_rule);
      select string_agg(
          case when app.exam_vconcept_rule_accepts(v_rule, p) then 'Y' else 'N' end, ''
          order by ord
        )
        into v_verdict
      from jsonb_array_elements(v_probes) with ordinality as t(p, ord);
      if not (v_verdict = any (v_verdicts)) then
        v_verdicts := v_verdicts || v_verdict;
      end if;
    end if;
  end loop;

  v_expected := case when array_length(v_verdicts, 1) = 1 then v_verdicts[1] end;
  if v_expected is null then
    v_expected := app.exam_vstr(p_item -> 'answer' -> 'correctKey');
  end if;
  if v_expected is null or char_length(v_expected) <> jsonb_array_length(v_probes) then
    return null;
  end if;

  return jsonb_build_object(
    'probeKeys', v_probe_keys,
    'expected', v_expected,
    'hypotheses', v_hypotheses,
    'oracle', v_oracle
  );
end
$$;

-- TS `hypothesisSearchEfficiency`: the mean share of the viable-rule space each of the
-- child's own tests eliminated. Null when no test could be scored, so the caller omits M-HYP
-- rather than reporting a zero it did not measure.
create function app.exam_vconcept_search_efficiency(p_model jsonb, p_response jsonb)
returns double precision
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_tests jsonb := app.exam_varr(p_response -> 'tests');
  v_oracle_map jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_figure jsonb;
  v_outcome jsonb;
  v_viable jsonb := p_model -> 'hypotheses';
  v_next jsonb;
  v_before integer;
  v_reductions double precision := 0;
  v_counted integer := 0;
begin
  if v_tests is null or jsonb_array_length(v_tests) = 0 then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(p_model -> 'oracle') as e loop
    v_oracle_map := v_oracle_map || jsonb_build_object(
      app.exam_vconcept_figure_key(v_entry -> 'figure'), v_entry -> 'accepts'
    );
  end loop;

  for v_entry in select e from jsonb_array_elements(v_tests) as e loop
    v_figure := app.exam_vconcept_figure(app.exam_vobj(v_entry) -> 'figure');
    if v_figure is null then
      continue;
    end if;
    v_outcome := v_oracle_map -> app.exam_vconcept_figure_key(v_figure);
    if v_outcome is null then
      continue;
    end if;
    v_before := jsonb_array_length(v_viable);
    if v_before = 0 then
      exit;
    end if;
    select coalesce(jsonb_agg(rule order by ord), '[]'::jsonb)
      into v_next
    from jsonb_array_elements(v_viable) with ordinality as t(rule, ord)
    where app.exam_vconcept_rule_accepts(rule, v_figure) = (v_outcome #>> '{}')::boolean;
    v_viable := v_next;
    v_reductions := v_reductions
      + (v_before - jsonb_array_length(v_viable))::double precision / v_before::double precision;
    v_counted := v_counted + 1;
  end loop;

  return case when v_counted > 0 then v_reductions / v_counted end;
end
$$;

create function app.exam_verify_concept(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_model jsonb := app.exam_vconcept_model(p_item);
  v_expected text;
  v_answers jsonb;
  v_entry jsonb;
  v_key text;
  v_by_key jsonb := '{}'::jsonb;
  v_broken boolean := false;
  v_submitted text;
  v_probe_count integer;
  v_hits integer := 0;
  v_metrics jsonb;
  v_hyp double precision;
begin
  if v_model is null then
    return jsonb_build_object('correct', false);
  end if;
  v_expected := v_model ->> 'expected';
  v_probe_count := jsonb_array_length(v_model -> 'probeKeys');

  -- `probeAnswers` carries the probe key with each verdict; `answerKeyString` is the same
  -- thing positionally, and is the fallback when the array is absent or unreadable.
  v_answers := app.exam_varr(p_response -> 'probeAnswers');
  if v_answers is not null and jsonb_array_length(v_answers) = v_probe_count then
    for v_entry in select e from jsonb_array_elements(v_answers) as e loop
      v_key := app.exam_vstr(app.exam_vobj(v_entry) -> 'key');
      if v_key is null or jsonb_typeof(app.exam_vobj(v_entry) -> 'opens') <> 'boolean' then
        v_by_key := '{}'::jsonb;
        v_broken := true;
        exit;
      end if;
      v_by_key := v_by_key || jsonb_build_object(v_key, v_entry -> 'opens');
    end loop;
    if not v_broken and (select count(*) from jsonb_object_keys(v_by_key)) = v_probe_count then
      select string_agg(
          case when (v_by_key -> (key #>> '{}')) = 'true'::jsonb then 'Y' else 'N' end, ''
          order by ord
        )
        into v_submitted
      from jsonb_array_elements(v_model -> 'probeKeys') with ordinality as t(key, ord);
    end if;
  end if;
  if v_submitted is null then
    v_submitted := app.exam_vstr(p_response -> 'answerKeyString');
  end if;
  if v_submitted is null or char_length(v_submitted) <> char_length(v_expected) then
    return jsonb_build_object('correct', false);
  end if;

  for i in 1 .. char_length(v_expected) loop
    if substr(v_submitted, i, 1) = substr(v_expected, i, 1) then
      v_hits := v_hits + 1;
    end if;
  end loop;

  v_metrics := jsonb_build_object(
    'M-POLY', app.exam_vproportion(v_hits, char_length(v_expected))
  );
  v_hyp := app.exam_vconcept_search_efficiency(v_model, p_response);
  if v_hyp is not null then
    v_metrics := v_metrics || jsonb_build_object('M-HYP', v_hyp);
  end if;

  return jsonb_build_object(
    'correct', v_hits = char_length(v_expected),
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_concept(jsonb, jsonb) is
  'FLU-CONCEPT-01; port of verifyConcept (verifiers/fluid.ts). Re-derives the probe-verdict '
  'string by enumerating every conjunctive rule consistent with content.gateOracle, and falls '
  'back to the stored key only when the evidence does not force one verdict.';

-- -----------------------------------------------------------------------------------
-- 5b. VER-EVIDENCE-01 — two-part key, weighted partial credit
--
-- Port of verifyEvidence (verifiers/verbal.ts). The child picks an answer option AND taps the
-- sentence that proves it. Both parts are re-derived independently of the stored composite
-- `"<option>+<sentence>"` key, from the item's own inference derivation in `provenance`:
-- the evidence sentence is the ONE sentence whose facts assert the premise, and the answer
-- option is the ONE option whose claim is the conclusion.
--
-- This is the verifier that settles whether the port has the inputs it needs:
-- `app.exam_item.provenance` is populated by api.exam_register_item from the bank item's own
-- provenance block, so the derivation IS reachable in the database and no schema change is
-- required.
-- -----------------------------------------------------------------------------------

create function app.exam_vevidence_expected(p_item jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_derivation jsonb := app.exam_vobj(app.exam_vobj(p_item -> 'provenance') -> 'derivation');
  v_premise text;
  v_conclusion text;
  v_sentence_facts jsonb;
  v_option_claims jsonb;
  v_bearing text[];
  v_claiming text[];
  v_parts text[];
begin
  if v_derivation is not null then
    v_premise := app.exam_vstr(v_derivation -> 'premise');
    v_conclusion := app.exam_vstr(v_derivation -> 'conclusion');
    v_sentence_facts := app.exam_vobj(v_derivation -> 'sentenceFacts');
    v_option_claims := app.exam_vobj(v_derivation -> 'optionClaims');
    if v_premise is not null
      and v_conclusion is not null
      and v_sentence_facts is not null
      and v_option_claims is not null
    then
      -- TS `strArray(facts) ?? []`: a facts list with any non-string entry reads as empty,
      -- so it can never bear the premise.
      select coalesce(array_agg(e.key), '{}'::text[])
        into v_bearing
      from jsonb_each(v_sentence_facts) as e(key, value)
      where jsonb_typeof(e.value) = 'array'
        and (
          select coalesce(bool_and(jsonb_typeof(x) = 'string'), true)
          from jsonb_array_elements(e.value) as x
        )
        and e.value ? v_premise;

      select coalesce(array_agg(e.key), '{}'::text[])
        into v_claiming
      from jsonb_each(v_option_claims) as e(key, value)
      where app.exam_vstr(e.value) = v_conclusion;

      if array_length(v_bearing, 1) = 1 and array_length(v_claiming, 1) = 1 then
        return jsonb_build_object('answer', v_claiming[1], 'evidence', v_bearing[1]);
      end if;
    end if;
  end if;

  v_parts := string_to_array(app.exam_vjsstring(p_item -> 'answer' -> 'correctKey'), '+');
  if coalesce(v_parts[1], '') = '' or coalesce(v_parts[2], '') = '' then
    return null;
  end if;
  return jsonb_build_object('answer', v_parts[1], 'evidence', v_parts[2]);
end
$$;

create function app.exam_verify_evidence(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_expected jsonb := app.exam_vevidence_expected(p_item);
  v_answer_key text := app.exam_vstr(p_response -> 'answerKey');
  v_evidence_key text := app.exam_vstr(p_response -> 'evidenceKey');
  v_weights jsonb;
  v_answer_weight double precision;
  v_evidence_weight double precision;
  v_total double precision;
  v_answer_ok boolean;
  v_evidence_ok boolean;
  v_credit double precision;
  v_correct boolean;
  v_metrics jsonb;
  v_depth double precision;
begin
  if v_expected is null or v_answer_key is null or v_evidence_key is null then
    return jsonb_build_object('correct', false);
  end if;

  v_weights := app.exam_vobj(app.exam_vobj(p_item -> 'scoring') -> 'creditWeights');
  v_answer_weight := coalesce(app.exam_vnum(v_weights -> 'answer'), 0.5);
  v_evidence_weight := coalesce(app.exam_vnum(v_weights -> 'evidence'), 0.5);
  v_total := v_answer_weight + v_evidence_weight;
  if v_total <= 0 then
    return jsonb_build_object('correct', false);
  end if;

  v_answer_ok := v_answer_key = (v_expected ->> 'answer');
  v_evidence_ok := v_evidence_key = (v_expected ->> 'evidence');
  v_credit := (
    (case when v_answer_ok then v_answer_weight else 0 end)
    + (case when v_evidence_ok then v_evidence_weight else 0 end)
  ) / v_total;

  v_correct := v_answer_ok and v_evidence_ok;
  v_metrics := jsonb_build_object('M-POLY', app.exam_vround4(v_credit));
  if v_correct then
    -- M-INFDEPTH records the inference depth actually PROVED, so it is emitted only when
    -- both parts land.
    v_depth := app.exam_vnum(
      app.exam_vobj(app.exam_vobj(p_item -> 'provenance') -> 'levers') -> 'depthRank'
    );
    if v_depth is not null then
      v_metrics := v_metrics || jsonb_build_object('M-INFDEPTH', v_depth);
    end if;
  end if;

  return jsonb_build_object('correct', v_correct, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_evidence(jsonb, jsonb) is
  'VER-EVIDENCE-01; port of verifyEvidence (verifiers/verbal.ts). Grades a compound '
  '"<option>+<sentence>" key as two independently re-derived parts weighted by the item''s '
  'own scoring.creditWeights. Reads app.exam_item.provenance, which api.exam_register_item '
  'already populates.';

-- -----------------------------------------------------------------------------------
-- 5c. QUANT-MIX-01 — ratio equivalence under the served constraint
--
-- Port of verifyQuantMix (verifiers/quantitative.ts), which takes the rule straight from the
-- bank's own scoring description: correct iff `counts.A * targetBowl.B = counts.B *
-- targetBowl.A` with both counts > 0 AND the served constraint holds. M-PAE is the continuous
-- concentration error, 0 for an equivalent mix.
--
-- The early returns matter as much as the rule: everything that fails before the mix is read
-- returns a verdict with NO metrics at all, and the port preserves that exactly, because the
-- differential harness compares the metric map and not only the boolean.
-- -----------------------------------------------------------------------------------

create function app.exam_verify_quant_mix(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_target jsonb := app.exam_vobj(v_content -> 'targetBowl');
  v_work jsonb := app.exam_vobj(v_content -> 'workBowl');
  v_constraint jsonb := app.exam_vobj(v_content -> 'constraint');
  v_limits jsonb := app.exam_vobj(v_content -> 'limits');
  v_target_a double precision;
  v_target_b double precision;
  v_counts jsonb;
  v_a double precision;
  v_b double precision;
  v_cap double precision;
  v_pae double precision;
  v_kind text;
  v_row text;
  v_served double precision;
  v_submitted double precision;
  v_total double precision;
  v_holds boolean := false;
  v_equivalent boolean;
begin
  if v_target is null or v_work is null or v_constraint is null then
    return jsonb_build_object('correct', false);
  end if;

  v_target_a := app.exam_vint(v_target -> 'A');
  v_target_b := app.exam_vint(v_target -> 'B');
  if v_target_a is null or v_target_b is null or v_target_a + v_target_b <= 0 then
    return jsonb_build_object('correct', false);
  end if;

  v_counts := app.exam_vobj(p_response -> 'counts');
  v_a := app.exam_vint(v_counts -> 'A');
  v_b := app.exam_vint(v_counts -> 'B');
  if v_a is null or v_b is null or v_a < 0 or v_b < 0 then
    return jsonb_build_object('correct', false);
  end if;

  v_cap := app.exam_vint(v_limits -> 'maxPerIngredient');
  if v_cap is not null and (v_a > v_cap or v_b > v_cap) then
    return jsonb_build_object('correct', false);
  end if;

  v_pae := case
    when v_a + v_b > 0 then abs(v_a / (v_a + v_b) - v_target_a / (v_target_a + v_target_b))
    else 1
  end;

  v_kind := app.exam_vstr(v_constraint -> 'kind');
  if v_kind = 'given_row' then
    v_row := app.exam_vstr(v_constraint -> 'row');
    v_served := case when v_row is not null then app.exam_vint(v_work -> v_row) end;
    v_submitted := case v_row when 'A' then v_a when 'B' then v_b end;
    v_holds := v_served is not null and v_submitted is not null and v_submitted = v_served;
  elsif v_kind = 'fixed_total' then
    v_total := app.exam_vint(v_constraint -> 'total');
    v_holds := v_total is not null and v_a + v_b = v_total;
  end if;

  v_equivalent := v_a > 0 and v_b > 0 and v_a * v_target_b = v_b * v_target_a;

  return jsonb_build_object(
    'correct', v_equivalent and v_holds,
    'metrics', jsonb_build_object('M-PAE', v_pae)
  );
end
$$;

comment on function app.exam_verify_quant_mix(jsonb, jsonb) is
  'QUANT-MIX-01; port of verifyQuantMix (verifiers/quantitative.ts). The only per-type '
  'verifier the quantitative domain has, so it is that domain''s hardest by construction.';

reset role;

revoke execute on function app.exam_vconcept_figure(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vconcept_figure_key(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vconcept_atom_holds(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vconcept_rule_accepts(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vconcept_model(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vconcept_search_efficiency(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_concept(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vevidence_expected(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_evidence(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_quant_mix(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vconcept_figure(jsonb) to api_executor;
grant execute on function app.exam_vconcept_figure_key(jsonb) to api_executor;
grant execute on function app.exam_vconcept_atom_holds(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vconcept_rule_accepts(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vconcept_model(jsonb) to api_executor;
grant execute on function app.exam_vconcept_search_efficiency(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_concept(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vevidence_expected(jsonb) to api_executor;
grant execute on function app.exam_verify_evidence(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_quant_mix(jsonb, jsonb) to api_executor;

-- -----------------------------------------------------------------------------------
-- 5d. SPA-XPLANE-01 — cut the solid so the section matches the outline
--
-- Port of verifyXPlane (verifiers/spatial.ts), and the hardest shape in the whole set: it
-- derives a cutting plane from the child's three dial settings via `content.planeModel`'s
-- published formulas, clips every face of the solid against it, chains the cut segments into
-- a section loop, projects that loop into the plane's own right-handed frame, and compares it
-- to `answer.targetSignature` by RMS vertex distance minimised over cyclic shifts after a
-- closed-form Procrustes rotation. The comparison is rotation invariant but scale- AND
-- chirality-sensitive, which is what lets the bank's `mirrored_twist` foil be rejected and
-- reported as M-MIRRORFA.
--
-- FLOAT PARITY. All arithmetic is `double precision`, which is the same IEEE-754 binary64 the
-- TypeScript runs in, and the operations are applied in the same order. Two primitives are
-- still implementation-defined at the last unit in the last place: JavaScript's `Math.hypot`
-- scales its arguments to avoid overflow where this uses a plain `sqrt(x*x + y*y + z*z)`, and
-- `Math.atan2`/`**` may round differently from Postgres's. Both feed the CONTINUOUS metric
-- (M-POLY carries the raw shape distance), not the boolean, and both are far below the
-- item's own `shapeToleranceRms`. The differential harness therefore compares `correct`
-- exactly and float metrics to a stated tolerance; see its header for the measured result.
--
-- Geometry is carried in flattened `double precision[]` (3 slots per 3-D point, 2 per 2-D
-- point) because Postgres multidimensional arrays cannot be appended to element-wise.
-- -----------------------------------------------------------------------------------

set role app_owner;

-- TS `shapeDistance`: RMS vertex distance minimised over cyclic shifts after the closed-form
-- Procrustes rotation. Null stands in for the TypeScript `Infinity`.
create function app.exam_vshape_distance(p_a double precision[], p_b double precision[])
returns double precision
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_n integer := coalesce(array_length(p_a, 1), 0) / 2;
  v_best double precision;
  v_sc double precision;
  v_ss double precision;
  v_th double precision;
  v_ct double precision;
  v_st double precision;
  v_sum double precision;
  v_ax double precision;
  v_ay double precision;
  v_bx double precision;
  v_by double precision;
  v_rx double precision;
  v_ry double precision;
  m integer;
begin
  if v_n = 0 or coalesce(array_length(p_b, 1), 0) / 2 <> v_n then
    return null;
  end if;
  for k in 0 .. v_n - 1 loop
    v_sc := 0;
    v_ss := 0;
    for i in 0 .. v_n - 1 loop
      m := (i + k) % v_n;
      v_ax := p_a[2 * i + 1];
      v_ay := p_a[2 * i + 2];
      v_bx := p_b[2 * m + 1];
      v_by := p_b[2 * m + 2];
      v_sc := v_sc + (v_ax * v_bx + v_ay * v_by);
      v_ss := v_ss + (v_ay * v_bx - v_ax * v_by);
    end loop;
    v_th := atan2(v_ss, v_sc);
    v_ct := cos(v_th);
    v_st := sin(v_th);
    v_sum := 0;
    for i in 0 .. v_n - 1 loop
      m := (i + k) % v_n;
      v_ax := p_a[2 * i + 1];
      v_ay := p_a[2 * i + 2];
      v_bx := p_b[2 * m + 1];
      v_by := p_b[2 * m + 2];
      v_rx := v_bx * v_ct - v_by * v_st;
      v_ry := v_bx * v_st + v_by * v_ct;
      v_sum := v_sum + (v_ax - v_rx) * (v_ax - v_rx) + (v_ay - v_ry) * (v_ay - v_ry);
    end loop;
    -- least() ignores nulls, so the first candidate seeds the minimum.
    v_best := least(v_best, sqrt(v_sum / v_n));
  end loop;
  return v_best;
end
$$;

create function app.exam_verify_xplane(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_solid jsonb;
  v_raw jsonb;
  v_entry jsonb;
  v_verts double precision[] := '{}'::double precision[];
  v_nv integer := 0;
  v_faces jsonb := '[]'::jsonb;
  v_face jsonb;
  v_face_clean jsonb;
  v_index double precision;
  v_plane_model jsonb;
  v_tilt_max double precision;
  v_twist_max double precision;
  v_offset_base double precision;
  v_offset_span double precision;
  v_controls jsonb;
  v_plane jsonb;
  v_h double precision;
  v_t double precision;
  v_w double precision;
  v_range jsonb;
  v_lo double precision;
  v_hi double precision;
  v_start_plane jsonb;
  v_signature double precision[] := '{}'::double precision[];
  v_sig_n integer := 0;
  v_vertex_count double precision;
  v_tolerance double precision;
  -- plane frame
  v_nx double precision;
  v_ny double precision;
  v_nz double precision;
  v_len double precision;
  v_a double precision;
  v_b double precision;
  v_dmin double precision;
  v_dmax double precision;
  v_dot double precision;
  v_d double precision;
  v_refx double precision;
  v_refy double precision;
  v_refz double precision;
  v_ux double precision;
  v_uy double precision;
  v_uz double precision;
  v_vx double precision;
  v_vy double precision;
  v_vz double precision;
  -- section
  v_segments double precision[] := '{}'::double precision[];
  v_nseg integer := 0;
  v_hits double precision[];
  v_nhits integer;
  v_unique double precision[];
  v_nunique integer;
  v_ax double precision;
  v_ay double precision;
  v_az double precision;
  v_bx double precision;
  v_by double precision;
  v_bz double precision;
  v_da double precision;
  v_db double precision;
  v_px double precision;
  v_py double precision;
  v_pz double precision;
  v_used boolean[];
  v_loop double precision[] := '{}'::double precision[];
  v_nloop integer := 0;
  v_advanced boolean;
  v_endx double precision;
  v_endy double precision;
  v_endz double precision;
  -- outline
  v_outline double precision[] := '{}'::double precision[];
  v_nout integer := 0;
  v_cx double precision;
  v_cy double precision;
  v_area double precision;
  v_reflected double precision[] := '{}'::double precision[];
  v_distance double precision;
  v_mirror_distance double precision;
  v_correct boolean;
  v_mirrored boolean;
  v_metrics jsonb := '{}'::jsonb;
  v_face_len integer;
  v_vi integer;
  v_vj integer;
begin
  -- --- readSolid ---------------------------------------------------------------
  v_solid := app.exam_vobj(v_content -> 'solid');
  if v_solid is null then
    return jsonb_build_object('correct', false);
  end if;
  v_raw := app.exam_varr(v_solid -> 'verts');
  if v_raw is null or app.exam_varr(v_solid -> 'faces') is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_raw) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 3
      or app.exam_vnum(v_entry -> 0) is null
      or app.exam_vnum(v_entry -> 1) is null
      or app.exam_vnum(v_entry -> 2) is null
    then
      return jsonb_build_object('correct', false);
    end if;
    v_verts := v_verts
      || app.exam_vnum(v_entry -> 0) || app.exam_vnum(v_entry -> 1) || app.exam_vnum(v_entry -> 2);
    v_nv := v_nv + 1;
  end loop;
  for v_entry in select e from jsonb_array_elements(app.exam_varr(v_solid -> 'faces')) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 3 then
      return jsonb_build_object('correct', false);
    end if;
    v_face_clean := '[]'::jsonb;
    for i in 0 .. jsonb_array_length(v_entry) - 1 loop
      v_index := app.exam_vint(v_entry -> i);
      if v_index is null or v_index < 0 or v_index >= v_nv then
        return jsonb_build_object('correct', false);
      end if;
      v_face_clean := v_face_clean || jsonb_build_array(to_jsonb(v_index::integer));
    end loop;
    v_faces := v_faces || jsonb_build_array(v_face_clean);
  end loop;
  if v_nv < 4 or jsonb_array_length(v_faces) < 4 then
    return jsonb_build_object('correct', false);
  end if;

  -- --- readPlaneModel + controls + the child's dial settings ---------------------
  v_plane_model := app.exam_vobj(v_content -> 'planeModel');
  v_tilt_max := app.exam_vnum(v_plane_model -> 'tiltMaxRad');
  v_twist_max := app.exam_vnum(v_plane_model -> 'twistMaxRad');
  v_offset_base := app.exam_vnum(v_plane_model -> 'offsetBase');
  v_offset_span := app.exam_vnum(v_plane_model -> 'offsetSpan');
  v_controls := app.exam_vobj(v_content -> 'controls');
  v_plane := app.exam_vobj(p_response -> 'plane');
  if v_tilt_max is null or v_twist_max is null or v_offset_base is null
    or v_offset_span is null or v_controls is null or v_plane is null
  then
    return jsonb_build_object('correct', false);
  end if;

  v_h := app.exam_vnum(v_plane -> 'h');
  v_t := app.exam_vnum(v_plane -> 't');
  v_w := app.exam_vnum(v_plane -> 'w');
  if v_h is null or v_t is null or v_w is null then
    return jsonb_build_object('correct', false);
  end if;

  v_range := app.exam_varr(v_plane_model -> 'controlRange');
  v_lo := coalesce(app.exam_vnum(v_range -> 0), 0);
  v_hi := coalesce(app.exam_vnum(v_range -> 1), 100);
  if v_h < v_lo or v_h > v_hi or v_t < v_lo or v_t > v_hi or v_w < v_lo or v_w > v_hi then
    return jsonb_build_object('correct', false);
  end if;

  -- A locked control cannot be moved by the child; a response that moved one is off-protocol,
  -- not a cut worth grading.
  v_start_plane := app.exam_vobj(v_controls -> 'startPlane');
  if v_start_plane is not null then
    if (v_controls -> 'tilt') is distinct from 'true'::jsonb
      and app.exam_vnum(v_start_plane -> 't') is distinct from v_t
    then
      return jsonb_build_object('correct', false);
    end if;
    if (v_controls -> 'twist') is distinct from 'true'::jsonb
      and app.exam_vnum(v_start_plane -> 'w') is distinct from v_w
    then
      return jsonb_build_object('correct', false);
    end if;
  end if;

  -- --- the target the cut is graded against (server-only) ------------------------
  v_raw := app.exam_varr(v_answer -> 'targetSignature');
  if v_raw is null or jsonb_array_length(v_raw) < 3 then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_raw) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 2
      or app.exam_vnum(v_entry -> 0) is null or app.exam_vnum(v_entry -> 1) is null
    then
      return jsonb_build_object('correct', false);
    end if;
    v_signature := v_signature || app.exam_vnum(v_entry -> 0) || app.exam_vnum(v_entry -> 1);
    v_sig_n := v_sig_n + 1;
  end loop;
  v_vertex_count := app.exam_vnum(v_answer -> 'vertexCount');
  v_tolerance := app.exam_vnum(v_answer -> 'shapeToleranceRms');
  if v_vertex_count is null or v_tolerance is null then
    return jsonb_build_object('correct', false);
  end if;

  -- --- planeFor: content.planeModel's published normal + offset formulas, verbatim -
  v_a := (v_t / 100) * v_tilt_max;
  v_b := (v_w / 100) * v_twist_max;
  v_nx := sin(v_a) * cos(v_b);
  v_ny := cos(v_a);
  v_nz := sin(v_a) * sin(v_b);
  v_len := sqrt(v_nx * v_nx + v_ny * v_ny + v_nz * v_nz);
  if v_len = 0 then
    v_len := 1;  -- TS `|| 1`
  end if;
  v_nx := v_nx / v_len;
  v_ny := v_ny / v_len;
  v_nz := v_nz / v_len;

  for i in 0 .. v_nv - 1 loop
    v_dot := v_nx * v_verts[3 * i + 1] + v_ny * v_verts[3 * i + 2] + v_nz * v_verts[3 * i + 3];
    v_dmin := least(v_dmin, v_dot);
    v_dmax := greatest(v_dmax, v_dot);
  end loop;
  v_d := v_dmin + (v_offset_base + v_offset_span * (v_h / 100)) * (v_dmax - v_dmin);

  -- (u, v, n) right-handed: the comparison is rotation invariant, and this is what makes it
  -- chirality-sensitive.
  if abs(v_nx) < 0.9 then
    v_refx := 1; v_refy := 0; v_refz := 0;
  else
    v_refx := 0; v_refy := 0; v_refz := 1;
  end if;
  v_ux := v_ny * v_refz - v_nz * v_refy;
  v_uy := v_nz * v_refx - v_nx * v_refz;
  v_uz := v_nx * v_refy - v_ny * v_refx;
  v_len := sqrt(v_ux * v_ux + v_uy * v_uy + v_uz * v_uz);
  if v_len = 0 then
    v_len := 1;
  end if;
  v_ux := v_ux / v_len; v_uy := v_uy / v_len; v_uz := v_uz / v_len;
  v_vx := v_ny * v_uz - v_nz * v_uy;
  v_vy := v_nz * v_ux - v_nx * v_uz;
  v_vz := v_nx * v_uy - v_ny * v_ux;
  v_len := sqrt(v_vx * v_vx + v_vy * v_vy + v_vz * v_vz);
  if v_len = 0 then
    v_len := 1;
  end if;
  v_vx := v_vx / v_len; v_vy := v_vy / v_len; v_vz := v_vz / v_len;

  -- --- sectionLoop: clip each face, then chain the cut segments ------------------
  for v_face in select e from jsonb_array_elements(v_faces) as e loop
    v_face_len := jsonb_array_length(v_face);
    v_hits := '{}'::double precision[];
    v_nhits := 0;
    for i in 0 .. v_face_len - 1 loop
      v_vi := (v_face -> i)::text::integer;
      v_vj := (v_face -> ((i + 1) % v_face_len))::text::integer;
      v_ax := v_verts[3 * v_vi + 1]; v_ay := v_verts[3 * v_vi + 2]; v_az := v_verts[3 * v_vi + 3];
      v_bx := v_verts[3 * v_vj + 1]; v_by := v_verts[3 * v_vj + 2]; v_bz := v_verts[3 * v_vj + 3];
      v_da := (v_nx * v_ax + v_ny * v_ay + v_nz * v_az) - v_d;
      v_db := (v_nx * v_bx + v_ny * v_by + v_nz * v_bz) - v_d;
      if abs(v_da) < 1e-9 then
        v_hits := v_hits || v_ax || v_ay || v_az;
        v_nhits := v_nhits + 1;
      elsif v_da * v_db < 0 then
        v_hits := v_hits
          || (v_ax + (v_bx - v_ax) * (v_da / (v_da - v_db)))
          || (v_ay + (v_by - v_ay) * (v_da / (v_da - v_db)))
          || (v_az + (v_bz - v_az) * (v_da / (v_da - v_db)));
        v_nhits := v_nhits + 1;
      end if;
    end loop;

    -- order-preserving dedupe by v3near (< 1e-6), first occurrence wins
    v_unique := '{}'::double precision[];
    v_nunique := 0;
    for i in 0 .. v_nhits - 1 loop
      v_px := v_hits[3 * i + 1]; v_py := v_hits[3 * i + 2]; v_pz := v_hits[3 * i + 3];
      v_advanced := false;
      for j in 0 .. v_nunique - 1 loop
        if sqrt(
             (v_px - v_unique[3 * j + 1]) * (v_px - v_unique[3 * j + 1])
             + (v_py - v_unique[3 * j + 2]) * (v_py - v_unique[3 * j + 2])
             + (v_pz - v_unique[3 * j + 3]) * (v_pz - v_unique[3 * j + 3])
           ) < 1e-6
        then
          v_advanced := true;
          exit;
        end if;
      end loop;
      if not v_advanced then
        v_unique := v_unique || v_px || v_py || v_pz;
        v_nunique := v_nunique + 1;
      end if;
    end loop;

    if v_nunique >= 2 then
      v_segments := v_segments
        || v_unique[1] || v_unique[2] || v_unique[3]
        || v_unique[3 * (v_nunique - 1) + 1]
        || v_unique[3 * (v_nunique - 1) + 2]
        || v_unique[3 * (v_nunique - 1) + 3];
      v_nseg := v_nseg + 1;
    end if;
  end loop;

  if v_nseg >= 3 then
    v_used := array_fill(false, array[v_nseg]);
    v_used[1] := true;
    v_loop := array[
      v_segments[1], v_segments[2], v_segments[3],
      v_segments[4], v_segments[5], v_segments[6]
    ];
    v_nloop := 2;
    for k in 1 .. v_nseg loop
      v_endx := v_loop[3 * (v_nloop - 1) + 1];
      v_endy := v_loop[3 * (v_nloop - 1) + 2];
      v_endz := v_loop[3 * (v_nloop - 1) + 3];
      v_advanced := false;
      for i in 0 .. v_nseg - 1 loop
        if v_used[i + 1] then
          continue;
        end if;
        v_ax := v_segments[6 * i + 1]; v_ay := v_segments[6 * i + 2]; v_az := v_segments[6 * i + 3];
        v_bx := v_segments[6 * i + 4]; v_by := v_segments[6 * i + 5]; v_bz := v_segments[6 * i + 6];
        if sqrt(
             (v_ax - v_endx) * (v_ax - v_endx) + (v_ay - v_endy) * (v_ay - v_endy)
             + (v_az - v_endz) * (v_az - v_endz)
           ) < 1e-6
        then
          v_loop := v_loop || v_bx || v_by || v_bz;
          v_nloop := v_nloop + 1;
          v_used[i + 1] := true;
          v_advanced := true;
          exit;
        end if;
        if sqrt(
             (v_bx - v_endx) * (v_bx - v_endx) + (v_by - v_endy) * (v_by - v_endy)
             + (v_bz - v_endz) * (v_bz - v_endz)
           ) < 1e-6
        then
          v_loop := v_loop || v_ax || v_ay || v_az;
          v_nloop := v_nloop + 1;
          v_used[i + 1] := true;
          v_advanced := true;
          exit;
        end if;
      end loop;
      if not v_advanced then
        exit;
      end if;
    end loop;

    if v_nloop > 2 and sqrt(
         (v_loop[3 * (v_nloop - 1) + 1] - v_loop[1]) * (v_loop[3 * (v_nloop - 1) + 1] - v_loop[1])
         + (v_loop[3 * (v_nloop - 1) + 2] - v_loop[2]) * (v_loop[3 * (v_nloop - 1) + 2] - v_loop[2])
         + (v_loop[3 * (v_nloop - 1) + 3] - v_loop[3]) * (v_loop[3 * (v_nloop - 1) + 3] - v_loop[3])
       ) < 1e-6
    then
      v_loop := v_loop[1 : 3 * (v_nloop - 1)];
      v_nloop := v_nloop - 1;
    end if;

    -- final order-preserving dedupe of the chained loop
    v_unique := '{}'::double precision[];
    v_nunique := 0;
    for i in 0 .. v_nloop - 1 loop
      v_px := v_loop[3 * i + 1]; v_py := v_loop[3 * i + 2]; v_pz := v_loop[3 * i + 3];
      v_advanced := false;
      for j in 0 .. v_nunique - 1 loop
        if sqrt(
             (v_px - v_unique[3 * j + 1]) * (v_px - v_unique[3 * j + 1])
             + (v_py - v_unique[3 * j + 2]) * (v_py - v_unique[3 * j + 2])
             + (v_pz - v_unique[3 * j + 3]) * (v_pz - v_unique[3 * j + 3])
           ) < 1e-6
        then
          v_advanced := true;
          exit;
        end if;
      end loop;
      if not v_advanced then
        v_unique := v_unique || v_px || v_py || v_pz;
        v_nunique := v_nunique + 1;
      end if;
    end loop;
    if v_nunique < 3 then
      v_nunique := 0;
    end if;
  else
    v_nunique := 0;
  end if;

  -- --- outlineOf: project, centre, force counter-clockwise -----------------------
  if v_nunique >= 3 then
    v_cx := 0;
    v_cy := 0;
    for i in 0 .. v_nunique - 1 loop
      v_outline := v_outline
        || (v_unique[3 * i + 1] * v_ux + v_unique[3 * i + 2] * v_uy + v_unique[3 * i + 3] * v_uz)
        || (v_unique[3 * i + 1] * v_vx + v_unique[3 * i + 2] * v_vy + v_unique[3 * i + 3] * v_vz);
    end loop;
    v_nout := v_nunique;
    for i in 0 .. v_nout - 1 loop
      v_cx := v_cx + v_outline[2 * i + 1];
    end loop;
    v_cx := v_cx / v_nout;
    for i in 0 .. v_nout - 1 loop
      v_cy := v_cy + v_outline[2 * i + 2];
    end loop;
    v_cy := v_cy / v_nout;
    for i in 0 .. v_nout - 1 loop
      v_outline[2 * i + 1] := v_outline[2 * i + 1] - v_cx;
      v_outline[2 * i + 2] := v_outline[2 * i + 2] - v_cy;
    end loop;
    v_area := 0;
    for i in 0 .. v_nout - 1 loop
      v_vj := (i + 1) % v_nout;
      v_area := v_area
        + (v_outline[2 * i + 1] * v_outline[2 * v_vj + 2]
           - v_outline[2 * v_vj + 1] * v_outline[2 * i + 2]);
    end loop;
    if v_area < 0 then
      v_unique := '{}'::double precision[];
      for i in reverse v_nout - 1 .. 0 loop
        v_unique := v_unique || v_outline[2 * i + 1] || v_outline[2 * i + 2];
      end loop;
      v_outline := v_unique;
    end if;
  end if;

  -- --- grade ---------------------------------------------------------------------
  v_distance := case
    when v_nout = v_sig_n then app.exam_vshape_distance(v_outline, v_signature)
  end;
  if v_distance is not null then
    v_metrics := v_metrics || jsonb_build_object('M-POLY', v_distance);
  end if;

  v_correct := v_nout = v_vertex_count and coalesce(v_distance <= v_tolerance, false);

  v_mirrored := false;
  if not v_correct and v_nout = v_sig_n then
    -- reflectOutline: mirror in y, then reverse, so a mirrored cut face is caught rather than
    -- accepted.
    for i in reverse v_sig_n - 1 .. 0 loop
      v_reflected := v_reflected || v_signature[2 * i + 1] || (-v_signature[2 * i + 2]);
    end loop;
    v_mirror_distance := app.exam_vshape_distance(v_outline, v_reflected);
    v_mirrored := coalesce(v_mirror_distance <= v_tolerance, false);
  end if;
  v_metrics := v_metrics
    || jsonb_build_object('M-MIRRORFA', case when v_mirrored then 1 else 0 end);

  return jsonb_build_object('correct', v_correct, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_xplane(jsonb, jsonb) is
  'SPA-XPLANE-01; port of verifyXPlane (verifiers/spatial.ts). Derives the cutting plane from '
  'the child''s dial settings, sections the solid, and compares the outline to the '
  'server-only target signature by chirality-sensitive Procrustes RMS. The hardest shape in '
  'the set: see the migration header on float parity.';

reset role;

revoke execute on function app.exam_vshape_distance(double precision[], double precision[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_xplane(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vshape_distance(double precision[], double precision[])
  to api_executor;
grant execute on function app.exam_verify_xplane(jsonb, jsonb) to api_executor;


insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('FLU-CONCEPT-01', 'exam_verify_concept', 'apps/web/src/lib/exam/verifiers/fluid.ts verifyConcept'),
  ('VER-EVIDENCE-01', 'exam_verify_evidence', 'apps/web/src/lib/exam/verifiers/verbal.ts verifyEvidence'),
  ('QUANT-MIX-01', 'exam_verify_quant_mix', 'apps/web/src/lib/exam/verifiers/quantitative.ts verifyQuantMix'),
  ('SPA-XPLANE-01', 'exam_verify_xplane', 'apps/web/src/lib/exam/verifiers/spatial.ts verifyXPlane');


-- ===================================================================================
-- 6. api.exam_submit_response now verifies through the dispatcher
--
-- Unchanged in every other respect: same signature (so grants and the PostgREST surface are
-- untouched), same idempotency, same telemetry, same difficulty stepping, same absence of a
-- stop decision. Two lines differ, both marked D-027 below.
-- ===================================================================================

set role api_executor;

create or replace function api.exam_submit_response(
  p_session_id uuid,
  p_item_id uuid,
  p_raw_answer jsonb,
  p_metrics jsonb,
  p_telemetry jsonb,
  p_idempotency_key uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor uuid;
  v_status text;
  v_config jsonb;
  v_state jsonb;
  v_domain text;
  v_type text;
  v_difficulty numeric;
  v_order integer;
  v_response_id uuid;
  v_scored jsonb;
  v_correct boolean;
  v_score numeric;
  v_metrics jsonb;
  v_area jsonb;
  v_area_diff numeric;
  v_step numeric;
  v_errtype numeric;
  v_delta numeric;
  v_new_diff numeric;
  v_attempt integer;
  v_correct_count integer;
  v_acc jsonb;
  v_metric_counts jsonb;
  v_total integer;
  v_hard_cap integer;
  v_hard_cap_reached boolean;
  request_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  response_payload jsonb;
begin
  perform app.bind_local_synthetic_principal();
  v_actor := app.current_user_id();
  if v_actor is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_session_id is null
    or p_item_id is null
    or p_raw_answer is null
    or jsonb_typeof(p_raw_answer) not in ('object', 'array', 'string', 'number', 'boolean')
    or p_idempotency_key is null
    or p_correlation_id is null
    or (p_metrics is not null and jsonb_typeof(p_metrics) <> 'object')
    or (p_telemetry is not null and jsonb_typeof(p_telemetry) <> 'array')
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash := 'sha256:' || encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'sessionId', p_session_id, 'itemId', p_item_id, 'rawAnswer', p_raw_answer
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':exam_submit_response:' || p_idempotency_key::text, 0)
  );

  select * into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor
    and record.rpc_name = 'exam_submit_response'
    and record.idempotency_key = p_idempotency_key;
  if found then
    if existing_idempotency.request_hash <> request_hash then
      raise exception using errcode = 'PT409', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_set(
      jsonb_set(existing_idempotency.response_payload, '{meta,idempotentReplay}', 'true'::jsonb),
      '{meta,correlationId}',
      to_jsonb(p_correlation_id::text)
    );
  end if;

  select s.status, s.area_state, p.config
    into v_status, v_state, v_config
  from app.exam_session s
  join app.exam_policy p on p.policy_version = s.policy_version
  where s.session_id = p_session_id and s.owner_user_id = v_actor;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;
  if v_status <> 'active' then
    raise exception using errcode = 'PT409', message = 'SESSION_NOT_ACTIVE';
  end if;

  select i.domain, i.type_code, i.difficulty
    into v_domain, v_type, v_difficulty
  from app.exam_item i
  where i.item_id = p_item_id and i.synthetic_only;
  if v_domain is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;
  if not (v_state ? v_domain) then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  perform 1 from app.exam_item_response
  where session_id = p_session_id and item_id = p_item_id;
  if found then
    raise exception using errcode = 'PT409', message = 'ITEM_ALREADY_ANSWERED';
  end if;

  -- D-027: verification now resolves a per-type / rule / keyed verifier instead of running
  -- one naive key comparison. app.exam_score_response is demoted, not removed.
  v_scored := app.exam_verify_response(p_item_id, p_raw_answer);
  v_correct := (v_scored ->> 'correct')::boolean;
  v_score := (v_scored ->> 'score')::numeric;

  -- Merge client-tracked metrics with server-authoritative ones (client cannot set
  -- correctness). D-027 adds the verifier's own key-dependent metrics in the middle: they
  -- override anything the client reported for the same id, and M-ACC still wins over both.
  v_metrics := coalesce(p_metrics, '{}'::jsonb)
    || coalesce(v_scored -> 'metrics', '{}'::jsonb)
    || jsonb_build_object('M-ACC', v_score);
  if v_correct then
    v_metrics := v_metrics || jsonb_build_object('M-DIFFREACH', v_difficulty);
  end if;

  select coalesce(max(order_no), 0) + 1 into v_order
  from app.exam_item_response where session_id = p_session_id;

  v_response_id := extensions.gen_random_uuid();
  insert into app.exam_item_response (
    response_id, session_id, owner_user_id, item_id, type_code, domain, order_no,
    difficulty, raw_answer, correct, score, metrics
  )
  values (
    v_response_id, p_session_id, v_actor, p_item_id, v_type, v_domain, v_order,
    v_difficulty, p_raw_answer, v_correct, v_score, v_metrics
  );

  -- Full telemetry trace (append-only), linked to the scored response.
  if p_telemetry is not null then
    insert into app.exam_telemetry_event (
      event_id, session_id, owner_user_id, item_id, response_id, kind, seq, t_offset_ms, payload
    )
    select
      extensions.gen_random_uuid(),
      p_session_id,
      v_actor,
      coalesce(nullif(ev ->> 'itemId', '')::uuid, p_item_id),
      v_response_id,
      coalesce(nullif(ev ->> 'kind', ''), 'event'),
      nullif(ev ->> 'seq', '')::integer,
      coalesce((ev ->> 'tOffsetMs')::integer, 0),
      coalesce(ev -> 'payload', '{}'::jsonb)
    from jsonb_array_elements(p_telemetry) ev;
  end if;

  -- Per-area float difficulty: gradual ± (correctness x magnitude), clamped 1..20. RETAINED,
  -- but only as bookkeeping for the in-database FALLBACK selection in api.exam_get_next_item.
  -- The authoritative per-area estimate lives in packages/exam-engine (BUILD_PLAN §3).
  v_area := v_state -> v_domain;
  v_area_diff := coalesce((v_area ->> 'difficulty')::numeric, 6);
  v_step := coalesce((v_config ->> 'stepSize')::numeric, 0.8);
  v_errtype := coalesce((v_metrics ->> 'M-ERRTYPE')::numeric, 0);  -- 1 = near miss softens a drop
  if v_correct then
    v_delta := v_step * (1 + greatest(0, v_difficulty - v_area_diff) * 0.10);
  else
    v_delta := -1 * v_step * (1 - 0.5 * least(1, greatest(0, v_errtype)));
  end if;
  v_new_diff := round(least(20, greatest(1, v_area_diff + v_delta)), 4);

  v_attempt := coalesce((v_area ->> 'attemptCount')::int, 0) + 1;
  v_correct_count := coalesce((v_area ->> 'correctCount')::int, 0) + case when v_correct then 1 else 0 end;
  v_acc := coalesce(v_area -> 'accWindow', '[]'::jsonb) || to_jsonb(v_score);

  v_metric_counts := coalesce(v_area -> 'metricCounts', '{}'::jsonb);
  v_metric_counts := v_metric_counts || coalesce((
    select jsonb_object_agg(mk.metric_key, coalesce((v_metric_counts ->> mk.metric_key)::int, 0) + 1)
    from jsonb_object_keys(v_metrics) as mk(metric_key)
  ), '{}'::jsonb);

  -- NO STOP DECISION HERE. `done` is left false for the engine to own.
  v_state := v_state || jsonb_build_object(v_domain, jsonb_build_object(
    'difficulty', v_new_diff,
    'attemptCount', v_attempt,
    'correctCount', v_correct_count,
    'itemsSeen', v_attempt,
    'accWindow', v_acc,
    'metricCounts', v_metric_counts,
    'done', false
  ));

  select coalesce(items_administered, 0) + 1 into v_total
  from app.exam_session where session_id = p_session_id;

  -- HARD SAFETY CAP, NOT THE STOP RULE. A runaway guard: it bounds how many items one session
  -- can ever record so a looping or malicious caller cannot grow a trace without limit.
  v_hard_cap := coalesce((v_config ->> 'hardItemCap')::int, 120);
  v_hard_cap_reached := v_total >= v_hard_cap;

  update app.exam_session
     set area_state = v_state,
         items_administered = v_total,
         status = case when v_hard_cap_reached then 'completed' else status end,
         completed_at = case when v_hard_cap_reached then statement_timestamp() else completed_at end
   where session_id = p_session_id;

  -- `verifier` is deliberately NOT echoed: which function graded the item is server-side
  -- bookkeeping, and the client-facing payload stays exactly as it was.
  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'scored', jsonb_build_object(
        'itemId', p_item_id,
        'typeCode', v_type,
        'domain', v_domain,
        'orderNo', v_order,
        'difficulty', v_difficulty,
        'correct', v_correct,
        'score', v_score,
        'metrics', v_metrics
      ),
      'itemsAdministered', v_total,
      'hardItemCap', v_hard_cap,
      'hardCapReached', v_hard_cap_reached,
      'stopRuleOwner', 'packages/exam-engine',
      'session', app.exam_session_state_json(p_session_id)
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', p_idempotency_key,
      'idempotentReplay', false
    )
  );

  insert into app.idempotency_record (
    actor_id, rpc_name, idempotency_key, request_hash, response_payload, synthetic_only
  )
  values (v_actor, 'exam_submit_response', p_idempotency_key, request_hash, response_payload, true);

  return response_payload;
end
$$;

reset role;
