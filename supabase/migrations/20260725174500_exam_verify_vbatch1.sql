-- Nine more per-type answer verifiers in plpgsql (serves R11; decision D-027, evidence E-090).
--
-- WHAT THIS IS. Batch 1 of the remaining port catalogued in
-- `docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md`: the five types rated **easy** there
-- (CX-curious-02, GB-DEBATE-01, SPA-VIEW-01, SPA-HIDDENCUBE-01, GB-FILTER-01) plus four of
-- the five **moderate** working-memory types (WM-bubble-01, WM-corsi-01, WM-bind-01,
-- WM-gridflash-01). WM-gate-01 is deliberately NOT here: it belongs to the same family but
-- carries three shells and an OLS slope, and is left to its own batch.
--
-- Additive only, exactly as `20260725170000_exam_verify_plpgsql.sql` designed for: nine new
-- functions plus nine rows in `app.exam_verifier_registry`. Nothing existing is altered or
-- dropped, so this migration cannot conflict with a sibling batch's.
--
-- WHAT THIS IS NOT. Not a scoring-semantics change. Every function below is a faithful port
-- of its TypeScript counterpart in `apps/web/src/lib/exam/verifiers/`, including the early
-- returns that emit NO metrics, the metric ids each branch does and does not emit, and — see
-- `app.exam_verify_bubble` — one rule the inventory already reports as probably wrong. Where
-- the port found a verifier questionable it is REPORTED (inventory §8), never corrected here.
-- It is also not a relaxation of the answer-key firewall: every function is revoked from
-- every client role and granted only to api_executor, and no key, solution or derived
-- expected answer appears in any return value.
--
-- INVENTORY NOTES HONOURED.
--   * SPA-VIEW-01 carries two response shells in one bank and its heading comparison is
--     CIRCULAR, so a 350 degree answer is 20 degrees from a 10 degree target.
--   * GB-DEBATE-01 needs a per-type verifier only because `answer.correctKey` is an OBJECT,
--     which the generic keyed verifier cannot read.
--   * The WM family replays a presentation schedule, and its signal-detection channels stay
--     on SEPARATE metric ids. A hit and a correct rejection are not interchangeable evidence
--     and must never collapse into one accuracy number.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false).

set role app_owner;

-- ===================================================================================
-- 1. Batch-scoped readers
--
-- These three are shared by several verifiers below but are named with a `vb1_` prefix
-- rather than a generic one ON PURPOSE. The remaining per-type ports land in parallel
-- additive migrations, and two batches that both tried to `create function
-- app.exam_vnumlist(jsonb)` would break whichever applied second. A batch-scoped name costs
-- a little duplication and removes the only way these migrations can collide.
--
-- STABLE, not IMMUTABLE, for the reason the foundation migration gives: results are built
-- with `jsonb_build_object`, which Postgres itself marks stable.
-- ===================================================================================

-- TS `numArray()` / `numList`: an array whose every entry is a finite JSON number.
-- Returns `{}` for the empty array and NULL for anything that is not such an array — the
-- distinction matters, because `[]` is truthy in JavaScript and several verifiers go on to
-- emit metrics for an empty selection while returning no metrics at all for a malformed one.
create function app.exam_vb1_numlist(p_value jsonb)
returns double precision[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_out double precision[] := '{}'::double precision[];
  v_entry jsonb;
  v_number double precision;
begin
  if app.exam_varr(p_value) is null then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(p_value) as e loop
    v_number := app.exam_vnum(v_entry);
    if v_number is null then
      return null;
    end if;
    v_out := v_out || v_number;
  end loop;
  return v_out;
end
$$;

-- TS `strArray()`: an array whose every entry is a JSON string. Same empty/NULL contract.
create function app.exam_vb1_strlist(p_value jsonb)
returns text[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_out text[] := '{}'::text[];
  v_entry jsonb;
begin
  if app.exam_varr(p_value) is null then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(p_value) as e loop
    if jsonb_typeof(v_entry) <> 'string' then
      return null;
    end if;
    v_out := v_out || (v_entry #>> '{}');
  end loop;
  return v_out;
end
$$;

-- TS `wrap180()`: signed degrees folded into (-180, 180]. Used by SPA-VIEW-01 (the heading
-- shell) and SPA-HIDDENCUBE-01 (the viewing-angle metric).
--
-- The remainder goes through `numeric` because Postgres has no `%` operator for
-- `double precision`. JavaScript's `%` and numeric `mod()` both truncate toward zero, so the
-- sign convention already matches; routing through numeric additionally makes the fold
-- EXACT, where the obvious `x - 360 * trunc(x / 360)` would misfold an argument sitting
-- within one ulp of a multiple of 360.
create function app.exam_vb1_wrap180(p_deg double precision)
returns double precision
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_d double precision;
begin
  if p_deg is null then
    return null;
  end if;
  v_d := mod((p_deg + 180)::numeric, 360::numeric)::double precision - 180;
  if v_d <= -180 then
    v_d := v_d + 360;
  end if;
  return v_d;
end
$$;

comment on function app.exam_vb1_numlist(jsonb) is
  'Batch-scoped untrusted-JSON reader (port of numArray in verifiers/types.ts). Returns {} '
  'for an empty array and NULL for a non-array or a non-numeric entry; the two are NOT '
  'interchangeable, because an empty selection still earns a metric map.';

-- ===================================================================================
-- 2. CX-curious-02 — spot what the scene does NOT tell us
--
-- Port of verifyCurious (verifiers/fluid.ts). Only the information-gap pick is keyed: the
-- questions the child asks and the guesses they make are counted elsewhere and are never
-- right or wrong, so nothing here scores them. The gap option is re-derived as the single
-- offered option whose evidence model records `support = 'unknown'`; the stored key is the
-- fallback, and is itself rejected unless it names an offered option.
--
-- Emits no metrics at all, in either direction. That is the whole verdict shape and the
-- differential harness compares the metric map, so adding one here would be a behaviour
-- change dressed up as an improvement.
-- ===================================================================================

create function app.exam_verify_curious(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_options jsonb := app.exam_varr(coalesce(p_item -> 'content', '{}'::jsonb) -> 'gapOptions');
  v_answer jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_entry jsonb;
  v_id text;
  v_offered text[] := '{}'::text[];
  v_evidence jsonb;
  v_unknown text[];
  v_expected text;
begin
  if v_options is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_options) as e loop
    v_id := app.exam_vstr(app.exam_vobj(v_entry) -> 'id');
    if v_id is null then
      return jsonb_build_object('correct', false);
    end if;
    v_offered := v_offered || v_id;
  end loop;

  v_evidence := app.exam_varr(app.exam_vobj(v_answer -> 'evidenceModel') -> 'gapOptions');
  if v_evidence is not null then
    select coalesce(array_agg(app.exam_vstr(app.exam_vobj(e) -> 'id') order by ord), '{}'::text[])
      into v_unknown
    from jsonb_array_elements(v_evidence) with ordinality as t(e, ord)
    where app.exam_vstr(app.exam_vobj(e) -> 'support') = 'unknown'
      and app.exam_vstr(app.exam_vobj(e) -> 'id') is not null
      and app.exam_vstr(app.exam_vobj(e) -> 'id') = any (v_offered);
    if array_length(v_unknown, 1) = 1 then
      v_expected := v_unknown[1];
    end if;
  end if;

  if v_expected is null then
    v_expected := app.exam_vstr(v_answer -> 'correctKey');
    if v_expected is null or not (v_expected = any (v_offered)) then
      return jsonb_build_object('correct', false);
    end if;
  end if;

  return jsonb_build_object(
    'correct', app.exam_vstr(p_response -> 'gapKey') is not distinct from v_expected
  );
end
$$;

comment on function app.exam_verify_curious(jsonb, jsonb) is
  'CX-curious-02; port of verifyCurious (verifiers/fluid.ts). Re-derives the information gap '
  'as the one offered option the scene never supports. Emits no metrics, by design.';

-- ===================================================================================
-- 3. GB-DEBATE-01 — two keyed decisions in one item
--
-- Port of verifyDebate (verifiers/quantitative.ts). This type needs a per-type verifier for
-- one reason only: `answer.correctKey` is an OBJECT (`{support, rebut}`), and the generic
-- keyed verifier compares a single scalar option key. Both decisions are graded; the item is
-- correct only when both land, and one-of-two is reported as partial progress rather than
-- discarded.
-- ===================================================================================

create function app.exam_verify_debate(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_key jsonb := app.exam_vobj(coalesce(p_item -> 'answer', '{}'::jsonb) -> 'correctKey');
  v_support text;
  v_rebut text;
  v_hits integer := 0;
begin
  if v_key is null then
    return jsonb_build_object('correct', false);
  end if;
  v_support := app.exam_vstr(v_key -> 'support');
  v_rebut := app.exam_vstr(v_key -> 'rebut');
  if v_support is null or v_rebut is null then
    return jsonb_build_object('correct', false);
  end if;

  if app.exam_vstr(p_response -> 'supportKey') = v_support then
    v_hits := v_hits + 1;
  end if;
  if app.exam_vstr(p_response -> 'rebutKey') = v_rebut then
    v_hits := v_hits + 1;
  end if;

  return jsonb_build_object(
    'correct', v_hits = 2,
    'metrics', jsonb_build_object('M-PROG', v_hits::double precision / 2)
  );
end
$$;

comment on function app.exam_verify_debate(jsonb, jsonb) is
  'GB-DEBATE-01; port of verifyDebate (verifiers/quantitative.ts). Exists only because '
  'answer.correctKey is an object, which app.exam_verify_keyed cannot read.';

-- ===================================================================================
-- 4. SPA-VIEW-01 — see the scene from where the other person stands
--
-- Port of verifyView (verifiers/spatial.ts). One bank, TWO response shells, decided per item
-- rather than per type:
--
--   viewpoint     — the child taps the station whose left-to-right view is the strip;
--                   `M-MIRRORFA` flags the station that sees it exactly reversed.
--   heading_dial  — the child turns a dial; correct iff the signed error is within the
--                   item's server-only tolerance. `M-VIEWANG` is that signed error and can
--                   only be computed here, which is why the demo can show the raw dial angle
--                   but never the error.
--
-- The heading comparison is CIRCULAR. Grading it linearly would fail correct children whose
-- answer straddles the dial's +/-180 degree seam.
-- ===================================================================================

create function app.exam_verify_view(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_target double precision := app.exam_vnum(v_answer -> 'correctHeadingDeg');
  v_heading double precision;
  v_tolerance double precision;
  v_error double precision;
  v_selected text;
  v_correct_key jsonb;
  v_mirror text;
  v_metrics jsonb;
begin
  -- The shell is read off the ITEM, not the type code, and either signal alone is enough.
  if (v_content -> 'optionKind') = '"heading_dial"'::jsonb or v_target is not null then
    v_heading := app.exam_vnum(p_response -> 'headingDeg');
    v_tolerance := app.exam_vnum(v_answer -> 'toleranceDeg');
    if v_heading is null or v_target is null or v_tolerance is null then
      return jsonb_build_object('correct', false);
    end if;
    v_error := app.exam_vb1_wrap180(v_heading - v_target);
    return jsonb_build_object(
      'correct', abs(v_error) <= v_tolerance,
      'metrics', jsonb_build_object('M-VIEWANG', v_error)
    );
  end if;

  v_selected := app.exam_vstr(p_response -> 'selectedKey');
  v_correct_key := v_answer -> 'correctKey';
  v_mirror := app.exam_vstr(v_answer -> 'mirrorFoilKey');
  v_metrics := case
    when v_mirror is null then '{}'::jsonb
    else jsonb_build_object(
      'M-MIRRORFA', case when v_selected is not distinct from v_mirror then 1 else 0 end
    )
  end;
  if v_selected is null or jsonb_typeof(v_correct_key) <> 'string' then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;
  return jsonb_build_object(
    'correct', v_selected = (v_correct_key #>> '{}'),
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_view(jsonb, jsonb) is
  'SPA-VIEW-01; port of verifyView (verifiers/spatial.ts). Two response shells in one bank, '
  'decided per item. The heading comparison is circular, so an answer across the +/-180 '
  'degree seam is graded by its true angular distance.';

-- ===================================================================================
-- 5. SPA-HIDDENCUBE-01 — count every cube, including the occluded ones
--
-- Port of verifyHiddenCube (verifiers/spatial.ts). The total is RECOUNTED from
-- `content.stack.layers` as one cube per distinct in-bounds (layer, row, col) cell — an
-- occupancy popcount, mirroring the bank's own checker — and the stored count is only the
-- fallback. `M-VIEWANG` reports the signed offset of the viewpoint the child settled on from
-- the canonical three-quarter view the answer is keyed to, and is emitted even when the
-- count itself cannot be graded.
-- ===================================================================================

-- JavaScript `Number(x)` for a JSON value, used only by verifyHiddenCube's second fallback
-- (`num(Number(item.answer.correctKey))`). Decimal and exponent string forms, the empty
-- string, booleans and JSON null are reproduced exactly. Hexadecimal/binary/octal string
-- literals and 'Infinity' are NOT, and read as NULL: no bank item keys a cube count that
-- way, and the path is unreachable at all while `content.stack` stays readable.
create function app.exam_vb1_jsnumber(p_value jsonb)
returns double precision
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_text text;
begin
  case jsonb_typeof(p_value)
    when 'number' then return (p_value #>> '{}')::double precision;
    when 'boolean' then return case when p_value = 'true'::jsonb then 1 else 0 end;
    when 'null' then return 0;
    when 'string' then
      v_text := btrim(p_value #>> '{}', E' \t\n\r\f\u000b\u00a0\ufeff');
      if v_text = '' then
        return 0;
      end if;
      if v_text ~ '^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then
        return v_text::double precision;
      end if;
      return null;
    else return null;
  end case;
end
$$;

create function app.exam_verify_hiddencube(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_stack jsonb := app.exam_vobj(v_content -> 'stack');
  v_rows double precision;
  v_cols double precision;
  v_max_height double precision;
  v_layers jsonb;
  v_cells jsonb;
  v_cell jsonb;
  v_r double precision;
  v_c double precision;
  v_keys text[] := '{}'::text[];
  v_recounted double precision;
  v_total double precision;
  v_count double precision := app.exam_vnum(p_response -> 'count');
  v_view jsonb := app.exam_vobj(v_content -> 'view');
  v_final_yaw double precision := app.exam_vnum(p_response -> 'finalYawDeg');
  v_canonical_yaw double precision;
  v_metrics jsonb := '{}'::jsonb;
begin
  -- --- cubeTotal: recount the occupancy, or give up entirely -----------------------
  if v_stack is not null then
    v_rows := app.exam_vnum(v_stack -> 'rows');
    v_cols := app.exam_vnum(v_stack -> 'cols');
    v_max_height := app.exam_vnum(v_stack -> 'maxHeight');
    v_layers := app.exam_varr(v_stack -> 'layers');
    if v_rows is not null and v_cols is not null and v_max_height is not null
      and v_layers is not null
    then
      v_recounted := 0;
      for i in 0 .. jsonb_array_length(v_layers) - 1 loop
        if i >= v_max_height then
          v_recounted := null;
          exit;
        end if;
        v_cells := app.exam_varr(v_layers -> i);
        if v_cells is null then
          v_recounted := null;
          exit;
        end if;
        for v_cell in select e from jsonb_array_elements(v_cells) as e loop
          if app.exam_varr(v_cell) is null or jsonb_array_length(v_cell) < 2 then
            v_recounted := null;
            exit;
          end if;
          v_r := app.exam_vnum(v_cell -> 0);
          v_c := app.exam_vnum(v_cell -> 1);
          if v_r is null or v_c is null
            or v_r < 0 or v_r >= v_rows or v_c < 0 or v_c >= v_cols
          then
            v_recounted := null;
            exit;
          end if;
          v_keys := v_keys
            || (i::text || ',' || to_jsonb(v_r)::text || ',' || to_jsonb(v_c)::text);
        end loop;
        if v_recounted is null then
          exit;
        end if;
      end loop;
      if v_recounted is not null then
        select count(distinct k) into v_recounted from unnest(v_keys) as k;
      end if;
    end if;
  end if;

  v_total := coalesce(
    v_recounted,
    app.exam_vnum(v_answer -> 'correctCount'),
    app.exam_vb1_jsnumber(v_answer -> 'correctKey')
  );

  if v_view is not null then
    v_canonical_yaw := app.exam_vnum(v_view -> 'canonicalYawDeg');
  end if;
  if v_final_yaw is not null and v_canonical_yaw is not null then
    v_metrics := jsonb_build_object(
      'M-VIEWANG', app.exam_vb1_wrap180(v_final_yaw - v_canonical_yaw)
    );
  end if;

  if v_count is null or v_total is null then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;
  return jsonb_build_object('correct', v_count = v_total, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_hiddencube(jsonb, jsonb) is
  'SPA-HIDDENCUBE-01; port of verifyHiddenCube (verifiers/spatial.ts). Recounts the pile from '
  'content.stack.layers rather than reading the key, and reports the viewing angle the child '
  'settled on even when the count cannot be graded.';

-- ===================================================================================
-- 6. GB-FILTER-01 — set equality against the re-applied cue rule
--
-- Port of verifyFilter (verifiers/quantitative.ts). The target set is re-derived by
-- re-applying `content.cue` to the displayed array (colour, or colour AND shape on a
-- conjunction level) rather than read out of `answer.targets`, and only the FINAL selected
-- set is scored: tap order is irrelevant and a de-selected cell is a revision, not a false
-- alarm.
-- ===================================================================================

create function app.exam_verify_filter(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_grid jsonb := app.exam_vobj(v_content -> 'grid');
  v_rows double precision;
  v_cols double precision;
  v_cue jsonb := app.exam_vobj(v_content -> 'cue');
  v_shapes jsonb := app.exam_varr(v_content -> 'items');
  v_cue_color text;
  v_cue_shape text;
  v_conjunction boolean;
  v_entry jsonb;
  v_shape jsonb;
  v_r double precision;
  v_c double precision;
  v_matches boolean;
  v_targets text[] := '{}'::text[];
  v_selected text[] := '{}'::text[];
  v_pair jsonb;
  v_target_count integer;
  v_selected_count integer;
  v_hits integer;
  v_false_alarms integer;
  v_non_targets double precision;
  v_metrics jsonb;
  v_taps double precision;
  v_optimum double precision;
begin
  if v_grid is not null then
    v_rows := app.exam_vint(v_grid -> 'R');
    v_cols := app.exam_vint(v_grid -> 'C');
    if v_rows is null or v_cols is null or v_rows < 1 or v_cols < 1 then
      v_grid := null;
    end if;
  end if;
  if v_grid is null or v_cue is null or v_shapes is null then
    return jsonb_build_object('correct', false);
  end if;

  v_cue_color := app.exam_vstr(v_cue -> 'color');
  v_cue_shape := app.exam_vstr(v_cue -> 'shape');
  v_conjunction := app.exam_vstr(v_cue -> 'mode') is not distinct from 'color_shape';
  if v_cue_color is null or (v_conjunction and v_cue_shape is null) then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_shapes) as e loop
    v_shape := app.exam_vobj(v_entry);
    v_r := app.exam_vint(v_shape -> 'r');
    v_c := app.exam_vint(v_shape -> 'c');
    if v_shape is null or v_r is null or v_c is null then
      return jsonb_build_object('correct', false);
    end if;
    v_matches := case
      when v_conjunction then
        app.exam_vstr(v_shape -> 'color') is not distinct from v_cue_color
        and app.exam_vstr(v_shape -> 'shape') is not distinct from v_cue_shape
      else app.exam_vstr(v_shape -> 'color') is not distinct from v_cue_color
    end;
    if v_matches then
      v_targets := v_targets || (to_jsonb(v_r)::text || ',' || to_jsonb(v_c)::text);
    end if;
  end loop;

  -- TS `cellList()`: every entry must be an [r, c] pair of integers, else the whole response
  -- is unreadable and the verdict carries no metrics.
  if app.exam_varr(p_response -> 'selectedCells') is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_pair in select e from jsonb_array_elements(p_response -> 'selectedCells') as e loop
    if app.exam_varr(v_pair) is null or jsonb_array_length(v_pair) < 2 then
      return jsonb_build_object('correct', false);
    end if;
    v_r := app.exam_vint(v_pair -> 0);
    v_c := app.exam_vint(v_pair -> 1);
    if v_r is null or v_c is null then
      return jsonb_build_object('correct', false);
    end if;
    v_selected := v_selected || (to_jsonb(v_r)::text || ',' || to_jsonb(v_c)::text);
  end loop;

  select count(distinct t) into v_target_count from unnest(v_targets) as t;
  select count(distinct s) into v_selected_count from unnest(v_selected) as s;
  select count(*) into v_hits
  from (select distinct t from unnest(v_targets) as t) as d
  where d.t = any (v_selected);
  v_false_alarms := v_selected_count - v_hits;
  v_non_targets := greatest(1, v_rows * v_cols - v_target_count);

  v_metrics := jsonb_build_object('M-FALSEALARM', v_false_alarms / v_non_targets);
  if v_target_count > 0 then
    v_metrics := v_metrics || jsonb_build_object(
      'M-PROG',
      greatest(
        0,
        v_hits::double precision / v_target_count - v_false_alarms / v_non_targets
      )
    );
    -- TS `efficiency(optimum, actual)`: optimum / max(actual, optimum), omitted when the
    -- response did not report a tap count.
    v_taps := app.exam_vint(p_response -> 'taps');
    v_optimum := v_target_count;
    if v_taps is not null and v_optimum > 0 then
      v_metrics := v_metrics
        || jsonb_build_object('M-EFF', v_optimum / greatest(v_taps, v_optimum));
    end if;
  end if;

  return jsonb_build_object(
    'correct',
    v_target_count > 0 and v_hits = v_target_count and v_false_alarms = 0,
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_filter(jsonb, jsonb) is
  'GB-FILTER-01; port of verifyFilter (verifiers/quantitative.ts). Re-applies content.cue to '
  'the displayed array and requires exact set equality with the final selection.';

-- ===================================================================================
-- 7. The working-memory family — schedule replay
--
-- WM-corsi-01, WM-bind-01, WM-gridflash-01 and WM-bubble-01 all live in
-- `apps/web/src/lib/exam/verifiers/verbal.ts`, which owns them for file-parallelism reasons
-- rather than by domain; `index.ts` merges every domain file into one type-code lookup, so
-- which file an entry sits in has no effect on resolution.
--
-- Three of the four replay a presentation schedule to re-derive what the child actually saw,
-- and the sort is by onset with the SCHEDULE'S OWN ORDER breaking ties, because
-- `Array.prototype.sort` is stable and a plain `order by onset` is not.
--
-- SDT CHANNELS. WM-gridflash-01 and WM-bubble-01 emit hit-rate evidence on `M-DPRIME` and
-- false-alarm-rate evidence on `M-FALSEALARM`, never one merged accuracy number. Averaging
-- each channel over the items that carry it is what d-prime and Cowan's K need; collapsing
-- them would make a cautious child and a guesser look identical.
-- ===================================================================================

-- --- 7a. WM-corsi-01 — serial-order span -------------------------------------------
--
-- Credit is strictly POSITIONAL: unit i counts only when tap i is the cell the trail holds
-- at i. Full credit additionally needs the response to be exactly as long as the trail, so a
-- sixth tap on a five-cell trail is not full credit even when the first five are right.
-- `M-PROG` carries the longest correct prefix, which is the per-item span contribution and
-- is lost if only the dichotomous verdict is kept.

create function app.exam_verify_corsi(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_presentation jsonb := app.exam_vobj(v_content -> 'presentation');
  v_schedule jsonb;
  v_object_steps integer;
  v_cells double precision[];
  v_mode text;
  v_expected double precision[];
  v_tapped double precision[];
  v_len integer;
  v_units integer := 0;
  v_prefix integer := 0;
begin
  -- --- corsiExpectedSequence: the schedule is primary, the stored key the fallback ---
  if v_presentation is not null then
    v_schedule := app.exam_varr(v_presentation -> 'schedule');
  end if;
  if v_schedule is not null and jsonb_array_length(v_schedule) > 0 then
    select count(*) into v_object_steps
    from jsonb_array_elements(v_schedule) as e
    where jsonb_typeof(e) = 'object';
    if v_object_steps = jsonb_array_length(v_schedule) then
      -- Stable sort: onset first, then the schedule's own order, matching Array#sort.
      select array_agg(app.exam_vnum(e -> 'cell') order by coalesce(app.exam_vnum(e -> 'onsetMs'), 0), ord)
        into v_cells
      from jsonb_array_elements(v_schedule) with ordinality as t(e, ord);
      if not exists (select 1 from unnest(v_cells) as c where c is null) then
        v_mode := coalesce(app.exam_vstr(v_content -> 'mode'), app.exam_vstr(v_answer -> 'mode'));
        if v_mode = 'backward' then
          select array_agg(c order by ord desc) into v_expected
          from unnest(v_cells) with ordinality as t(c, ord);
        else
          v_expected := v_cells;
        end if;
      end if;
    end if;
  end if;
  if v_expected is null then
    v_expected := app.exam_vb1_numlist(v_answer -> 'expectedSequence');
  end if;

  v_tapped := app.exam_vb1_numlist(p_response -> 'tappedCells');
  v_len := coalesce(array_length(v_expected, 1), 0);
  if v_expected is null or v_len = 0 or v_tapped is null then
    return jsonb_build_object('correct', false);
  end if;

  for i in 1 .. v_len loop
    if v_tapped[i] is not distinct from v_expected[i] then
      v_units := v_units + 1;
    end if;
  end loop;
  while v_prefix < v_len and v_tapped[v_prefix + 1] is not distinct from v_expected[v_prefix + 1] loop
    v_prefix := v_prefix + 1;
  end loop;

  return jsonb_build_object(
    'correct', coalesce(array_length(v_tapped, 1), 0) = v_len and v_units = v_len,
    'metrics', jsonb_build_object(
      'M-POLY', app.exam_vround4(v_units::double precision / v_len),
      'M-PROG', app.exam_vround4(v_prefix::double precision / v_len)
    )
  );
end
$$;

comment on function app.exam_verify_corsi(jsonb, jsonb) is
  'WM-corsi-01; port of verifyCorsi (verifiers/verbal.ts). Replays the flash schedule in '
  'onset order, reverses it on a backward trial, and credits strictly by position.';

-- --- 7b. WM-bind-01 — object-to-location binding ------------------------------------
--
-- Same replay shape as corsi with MAP semantics instead of positional ones: a creature is
-- credited when it is back in the house it occupied during encoding, no matter when the
-- child put it there. A later showing of the same creature legitimately overwrites. Full
-- credit needs every creature placed AND every placement right, so an omission can never
-- reach 1 even when the surviving placements are all correct.

create function app.exam_verify_bind(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_presentation jsonb := app.exam_vobj(v_content -> 'presentation');
  v_schedule jsonb;
  v_object_steps integer;
  v_step jsonb;
  v_creature text;
  v_cell double precision;
  v_bindings jsonb;
  v_readable boolean := true;
  v_stored jsonb;
  v_pair record;
  v_placements jsonb;
  v_creatures integer;
  v_placed integer := 0;
  v_units integer := 0;
  v_value double precision;
begin
  -- --- bindExpectedBindings ---------------------------------------------------------
  if v_presentation is not null then
    v_schedule := app.exam_varr(v_presentation -> 'schedule');
  end if;
  if v_schedule is not null and jsonb_array_length(v_schedule) > 0 then
    select count(*) into v_object_steps
    from jsonb_array_elements(v_schedule) as e
    where jsonb_typeof(e) = 'object';
    if v_object_steps = jsonb_array_length(v_schedule) then
      v_bindings := '{}'::jsonb;
      for v_step in
        select e
        from jsonb_array_elements(v_schedule) with ordinality as t(e, ord)
        order by coalesce(app.exam_vnum(e -> 'onsetMs'), 0), ord
      loop
        v_creature := app.exam_vstr(v_step -> 'creatureId');
        v_cell := app.exam_vnum(v_step -> 'cell');
        if v_creature is null or v_cell is null then
          v_readable := false;
          exit;
        end if;
        v_bindings := v_bindings || jsonb_build_object(v_creature, to_jsonb(v_cell));
      end loop;
      if not v_readable or v_bindings = '{}'::jsonb then
        v_bindings := null;
      end if;
    end if;
  end if;

  if v_bindings is null then
    v_stored := app.exam_vobj(v_answer -> 'bindings');
    if v_stored is null then
      return jsonb_build_object('correct', false);
    end if;
    v_bindings := '{}'::jsonb;
    for v_pair in select key, value from jsonb_each(v_stored) loop
      v_value := app.exam_vnum(v_pair.value);
      if v_value is null then
        return jsonb_build_object('correct', false);
      end if;
      v_bindings := v_bindings || jsonb_build_object(v_pair.key, to_jsonb(v_value));
    end loop;
    if v_bindings = '{}'::jsonb then
      return jsonb_build_object('correct', false);
    end if;
  end if;

  v_placements := app.exam_vobj(p_response -> 'placements');
  if v_placements is null then
    return jsonb_build_object('correct', false);
  end if;

  select count(*) into v_creatures from jsonb_object_keys(v_bindings);
  for v_pair in select key, value from jsonb_each(v_bindings) loop
    v_value := app.exam_vnum(v_placements -> v_pair.key);
    if v_value is null then
      continue;
    end if;
    v_placed := v_placed + 1;
    if v_value = app.exam_vnum(v_pair.value) then
      v_units := v_units + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'correct', v_placed = v_creatures and v_units = v_creatures,
    'metrics', jsonb_build_object(
      'M-POLY', app.exam_vround4(v_units::double precision / v_creatures)
    )
  );
end
$$;

comment on function app.exam_verify_bind(jsonb, jsonb) is
  'WM-bind-01; port of verifyBind (verifiers/verbal.ts). Replays the encoding schedule into '
  'the creature -> house map it establishes and credits order-free, per binding.';

-- --- 7c. WM-gridflash-01 — change detection and array recognition -------------------
--
-- Two shells share one difficulty ladder, so one verifier grades both and branches on the
-- response's own `shell` tag, cross-checked against `content.responsePhase.mode`.
--
-- Which SDT channel is emitted is the part that matters:
--   two_choice  — a CHANGED probe can produce a hit, so it reports `M-DPRIME` only; a SAME
--                 probe can produce a false alarm, so it reports `M-FALSEALARM` only. A miss
--                 must never land on the false-alarm channel. No `M-POLY`: the spec is
--                 explicit that a single two-choice probe is dichotomous.
--   select_set  — the lit cells carry the hit rate, the dark cells the false-alarm rate, and
--                 `M-FALSEALARM` is omitted rather than zeroed when there are no dark cells.

create function app.exam_verify_gridflash(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_answer jsonb := coalesce(p_item -> 'answer', '{}'::jsonb);
  v_presentation jsonb := app.exam_vobj(v_content -> 'presentation');
  v_response_phase jsonb := app.exam_vobj(v_content -> 'responsePhase');
  v_array jsonb;
  v_shell text;
  v_probe jsonb;
  v_probe_cell double precision;
  v_probe_hue text;
  v_original_hue text;
  v_expected_key text;
  v_selected_key text;
  v_correct boolean;
  v_expected double precision[];
  v_object_stars integer;
  v_selected double precision[];
  v_expected_size integer;
  v_selected_size integer;
  v_hits integer;
  v_false_alarms integer;
  v_cell_count double precision;
  v_dark double precision;
  v_grid jsonb;
  v_metrics jsonb;
begin
  if v_presentation is not null then
    v_array := app.exam_varr(v_presentation -> 'array');
  end if;
  v_shell := coalesce(
    app.exam_vstr(p_response -> 'shell'),
    case when v_response_phase is not null then app.exam_vstr(v_response_phase -> 'mode') end
  );

  if v_shell = 'two_choice' then
    if v_response_phase is not null then
      v_probe := app.exam_vobj(v_response_phase -> 'probe');
    end if;
    v_probe_cell := app.exam_vnum(v_probe -> 'cell');
    v_probe_hue := app.exam_vstr(v_probe -> 'hue');

    -- Re-derive SAME/CHANGED from the colour the probed cell carried in the flash. The
    -- stored key is only the fallback.
    if v_array is not null and v_probe_cell is not null and v_probe_hue is not null then
      select app.exam_vstr(e -> 'hue') into v_original_hue
      from jsonb_array_elements(v_array) with ordinality as t(e, ord)
      where jsonb_typeof(e) = 'object' and app.exam_vnum(e -> 'cell') = v_probe_cell
      order by ord
      limit 1;
      if v_original_hue is not null then
        v_expected_key := case when v_original_hue = v_probe_hue then 'SAME' else 'CHANGED' end;
      end if;
    end if;
    v_expected_key := coalesce(v_expected_key, app.exam_vstr(v_answer -> 'correctKey'));
    v_selected_key := app.exam_vstr(p_response -> 'selectedKey');
    if v_expected_key is null or v_selected_key is null then
      return jsonb_build_object('correct', false);
    end if;

    v_correct := v_selected_key = v_expected_key;
    return jsonb_build_object(
      'correct', v_correct,
      'metrics', case
        when v_expected_key = 'CHANGED'
          then jsonb_build_object('M-DPRIME', case when v_correct then 1 else 0 end)
        else jsonb_build_object('M-FALSEALARM', case when v_correct then 0 else 1 end)
      end
    );
  end if;

  if v_shell = 'select_set' then
    if v_array is not null and jsonb_array_length(v_array) > 0 then
      select count(*) into v_object_stars
      from jsonb_array_elements(v_array) as e
      where jsonb_typeof(e) = 'object';
      if v_object_stars = jsonb_array_length(v_array) then
        select array_agg(app.exam_vnum(e -> 'cell') order by ord) into v_expected
        from jsonb_array_elements(v_array) with ordinality as t(e, ord);
        if exists (select 1 from unnest(v_expected) as c where c is null) then
          v_expected := null;
        end if;
      end if;
    end if;
    if v_expected is null then
      v_expected := app.exam_vb1_numlist(v_answer -> 'expectedCells');
    end if;
    v_selected := app.exam_vb1_numlist(p_response -> 'selectedCells');
    if v_expected is null or coalesce(array_length(v_expected, 1), 0) = 0 or v_selected is null
    then
      return jsonb_build_object('correct', false);
    end if;

    select count(distinct c) into v_expected_size from unnest(v_expected) as c;
    select count(distinct c) into v_selected_size from unnest(v_selected) as c;
    select count(*) into v_hits
    from (select distinct c from unnest(v_selected) as c) as s
    where s.c = any (v_expected);
    v_false_alarms := v_selected_size - v_hits;

    v_grid := app.exam_vobj(v_content -> 'grid');
    if v_grid is not null then
      v_cell_count := app.exam_vnum(v_grid -> 'cellCount');
    end if;
    v_dark := case when v_cell_count is not null then v_cell_count - v_expected_size else 0 end;

    v_metrics := jsonb_build_object(
      'M-POLY', app.exam_vround4(v_hits::double precision / v_expected_size),
      'M-DPRIME', app.exam_vround4(v_hits::double precision / v_expected_size)
    );
    if v_dark > 0 then
      v_metrics := v_metrics
        || jsonb_build_object('M-FALSEALARM', app.exam_vround4(v_false_alarms / v_dark));
    end if;

    return jsonb_build_object(
      'correct', v_hits = v_expected_size and v_false_alarms = 0,
      'metrics', v_metrics
    );
  end if;

  return jsonb_build_object('correct', false);
end
$$;

comment on function app.exam_verify_gridflash(jsonb, jsonb) is
  'WM-gridflash-01; port of verifyGridflash (verifiers/verbal.ts). Two shells in one bank. '
  'Hit-rate and false-alarm-rate evidence stay on SEPARATE metric channels: a hit and a '
  'correct rejection are not interchangeable and must not collapse into one accuracy number.';

-- --- 7d. WM-bubble-01 — n-back ------------------------------------------------------
--
-- The target steps are re-derived from the stream itself (step i is a target iff
-- `stream[i] === stream[i - n]`) rather than read off `answer.correctKey`. The first n steps
-- are the lead-in, so no pop there is defensible and the renderer blocks it. Only steps the
-- child actually saw are scored, but full credit still needs the whole stream administered.
--
-- REPORTED, NOT FIXED (inventory §8 item 2). `correct` requires `targets > 0`, so a
-- legitimate stream that happens to contain no n-back repeat scores the child wrong no
-- matter what they do. That is a correctness rule, not a guard, and it is ported AS WRITTEN:
-- changing it is a scoring-semantics decision only the owner may take, and D-027 explicitly
-- does not renegotiate a verdict.
--
-- The step counter is `double precision`, not an integer, because the TypeScript loop runs
-- over whatever `content.n` and `response.stepsShown` hold. A non-integer index reads
-- `undefined` off the stream, and `undefined === undefined` is true in JavaScript, which is
-- what `is not distinct from` reproduces here.

create function app.exam_verify_bubble(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_n double precision := app.exam_vnum(v_content -> 'n');
  v_channels jsonb := app.exam_varr(v_content -> 'channels');
  v_pops jsonb := app.exam_varr(p_response -> 'pops');
  v_pop jsonb;
  v_channel_id text;
  v_step_index double precision;
  v_popped text[] := '{}'::text[];
  v_declared double precision := app.exam_vnum(v_content -> 'streamLength');
  v_steps_shown double precision := app.exam_vnum(p_response -> 'stepsShown');
  v_full boolean := true;
  v_targets integer := 0;
  v_hits integer := 0;
  v_non_targets integer := 0;
  v_false_alarms integer := 0;
  v_channel jsonb;
  v_stream text[];
  v_stream_len integer;
  v_length double precision;
  v_shown double precision;
  v_i double precision;
  v_now text;
  v_back text;
  v_decidable integer;
  v_metrics jsonb;
begin
  if v_n is null or v_n < 1 or v_channels is null or jsonb_array_length(v_channels) = 0
    or v_pops is null
  then
    return jsonb_build_object('correct', false);
  end if;

  for v_pop in select e from jsonb_array_elements(v_pops) as e loop
    if app.exam_vobj(v_pop) is null then
      continue;
    end if;
    v_channel_id := app.exam_vstr(v_pop -> 'channel');
    v_step_index := app.exam_vnum(v_pop -> 'stepIndex');
    if v_channel_id is not null and v_step_index is not null then
      v_popped := v_popped || (v_channel_id || ':' || to_jsonb(v_step_index)::text);
    end if;
  end loop;

  for v_channel in select e from jsonb_array_elements(v_channels) as e loop
    if app.exam_vobj(v_channel) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_channel_id := app.exam_vstr(v_channel -> 'id');
    v_stream := app.exam_vb1_strlist(v_channel -> 'stream');
    if v_channel_id is null or v_stream is null then
      return jsonb_build_object('correct', false);
    end if;
    v_stream_len := coalesce(array_length(v_stream, 1), 0);

    v_length := coalesce(v_declared, v_stream_len);
    if v_stream_len < v_length then
      return jsonb_build_object('correct', false);
    end if;
    v_shown := case when v_steps_shown is not null then least(v_steps_shown, v_length) else v_length end;
    if v_shown < v_length then
      v_full := false;
    end if;

    v_i := v_n;
    while v_i < v_shown loop
      v_now := case
        when v_i = trunc(v_i) and v_i >= 0 and v_i < v_stream_len then v_stream[v_i::integer + 1]
      end;
      v_back := case
        when (v_i - v_n) = trunc(v_i - v_n) and (v_i - v_n) >= 0 and (v_i - v_n) < v_stream_len
          then v_stream[(v_i - v_n)::integer + 1]
      end;
      if v_now is not distinct from v_back then
        v_targets := v_targets + 1;
        if (v_channel_id || ':' || to_jsonb(v_i)::text) = any (v_popped) then
          v_hits := v_hits + 1;
        end if;
      else
        v_non_targets := v_non_targets + 1;
        if (v_channel_id || ':' || to_jsonb(v_i)::text) = any (v_popped) then
          v_false_alarms := v_false_alarms + 1;
        end if;
      end if;
      v_i := v_i + 1;
    end loop;
  end loop;

  v_decidable := v_targets + v_non_targets;
  if v_decidable = 0 then
    return jsonb_build_object('correct', false);
  end if;

  v_metrics := jsonb_build_object(
    'M-POLY',
    app.exam_vround4((v_hits + (v_non_targets - v_false_alarms))::double precision / v_decidable)
  );
  if v_targets > 0 then
    v_metrics := v_metrics || jsonb_build_object(
      'M-DPRIME', app.exam_vround4(v_hits::double precision / v_targets)
    );
  end if;
  if v_non_targets > 0 then
    v_metrics := v_metrics || jsonb_build_object(
      'M-FALSEALARM', app.exam_vround4(v_false_alarms::double precision / v_non_targets)
    );
  end if;

  return jsonb_build_object(
    'correct',
    v_full and v_targets > 0 and v_hits = v_targets and v_false_alarms = 0,
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_bubble(jsonb, jsonb) is
  'WM-bubble-01; port of verifyBubble (verifiers/verbal.ts). Re-derives the n-back targets '
  'from the stream and keeps hits and false alarms on separate SDT channels. Reproduces the '
  'behaviour reported in EXAM_VERIFIER_PORT_INVENTORY.md §8 item 2, where a block with no '
  'n-back repeat is unpassable: that is a scoring-semantics question for the owner, not '
  'something this port may quietly fix.';

reset role;

-- --- Grants: identical posture to the foundation's verifiers ------------------------
-- Every function is reachable only from api_executor. pgTAP test 123 assertion 5 treats a
-- NULL proacl as a violation, so a port that forgot this would fail there rather than
-- silently widen the answer-key firewall.

revoke execute on function app.exam_vb1_numlist(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vb1_strlist(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vb1_wrap180(double precision)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vb1_jsnumber(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_curious(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_debate(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_view(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_hiddencube(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_filter(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_corsi(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_bind(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_gridflash(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_bubble(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vb1_numlist(jsonb) to api_executor;
grant execute on function app.exam_vb1_strlist(jsonb) to api_executor;
grant execute on function app.exam_vb1_wrap180(double precision) to api_executor;
grant execute on function app.exam_vb1_jsnumber(jsonb) to api_executor;
grant execute on function app.exam_verify_curious(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_debate(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_view(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_hiddencube(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_filter(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_corsi(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_bind(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_gridflash(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_bubble(jsonb, jsonb) to api_executor;

-- --- Registration -------------------------------------------------------------------
-- One row per type. A type absent from this table still falls through to the scoring.rule
-- generic and then to the keyed default, so these nine INSERTs are the whole switch-over.

insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('CX-curious-02', 'exam_verify_curious',
   'apps/web/src/lib/exam/verifiers/fluid.ts verifyCurious'),
  ('GB-DEBATE-01', 'exam_verify_debate',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyDebate'),
  ('SPA-VIEW-01', 'exam_verify_view',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyView'),
  ('SPA-HIDDENCUBE-01', 'exam_verify_hiddencube',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyHiddenCube'),
  ('GB-FILTER-01', 'exam_verify_filter',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyFilter'),
  ('WM-corsi-01', 'exam_verify_corsi',
   'apps/web/src/lib/exam/verifiers/verbal.ts verifyCorsi'),
  ('WM-bind-01', 'exam_verify_bind',
   'apps/web/src/lib/exam/verifiers/verbal.ts verifyBind'),
  ('WM-gridflash-01', 'exam_verify_gridflash',
   'apps/web/src/lib/exam/verifiers/verbal.ts verifyGridflash'),
  ('WM-bubble-01', 'exam_verify_bubble',
   'apps/web/src/lib/exam/verifiers/verbal.ts verifyBubble');
