-- Nine more per-type answer verifiers in plpgsql (serves R11; decision D-027).
--
-- WHAT THIS IS. The second batch of the D-027 port: nine of the twenty-seven per-type
-- verifiers the foundation migration (20260725170000_exam_verify_plpgsql.sql) left on the app
-- tier, all rated `moderate` in docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md:
--
--   CX-check-01         repetition-signature relabelling + planted-slip recovery
--   FLU-MATRIXBUILD-01  five rule inductions per constructed attribute
--   VER-SENSE-01        strict permutation + adjacent-pair partial credit
--   GB-WORDFORGE-01     set membership against the item's enumerated valid-word set
--   GB-TRACK-01         simultaneous per-phase swap permutation, then set equality
--   SPA-SCENE-01        cross-product comparator sort + O(n^2) pair concordance
--   SPA-MAZE-01         legal-walk replay through the served open edges
--   GB-ROBOPATH-01      turtle-program expansion and execution
--   GB-EXPLORE-01       walk replay + circular mean pointing error
--
-- Additive only: one new function per verifier (plus its private helpers) and one INSERT per
-- type into app.exam_verifier_registry. Nothing existing is altered or dropped, which is what
-- lets the remaining ports land in parallel migrations without conflicting.
--
-- WHAT THIS IS NOT. It is not a scoring-semantics change. Every function below is a faithful
-- port of its TypeScript counterpart in apps/web/src/lib/exam/verifiers/, INCLUDING the early
-- returns that emit no metrics at all, the metric keys each branch does and does not emit, and
-- two behaviours the inventory already reports as suspected defects (see "PRESERVED DEFECTS"
-- below). Changing any of them is a scoring decision only the owner may take, and D-027
-- explicitly does not renegotiate a verdict. Equivalence is proved by `pnpm exam:verify:diff`,
-- which runs real bank items through both implementations and compares the verdict exactly and
-- the metric map to 1e-9 (E-091).
--
-- PRESERVED DEFECTS (inventory section 8, reported and deliberately NOT fixed here):
--   * `verifyWordforge` scores every child wrong when `answer.referenceTarget` is absent:
--     `correct` is `target !== null && credited >= target`, so a missing threshold fails closed
--     rather than falling back to "produced at least one valid word".
--     app.exam_verify_wordforge reproduces that exactly.
--   * `verifyExplore`'s fallback branch takes its move count from the client-reported
--     `response.cost.actual`, contradicting the rule stated at the top of its own file ("never
--     by trusting a count, flag or digest the client computed for itself"). It feeds M-EFF
--     only, never correctness. app.exam_verify_explore reproduces that exactly.
--
-- FIREWALL. Every function here is revoked from public, anon, authenticated and service_role
-- and granted only to api_executor, the same posture app.exam_score_response and the
-- foundation's verifiers have. No key, solution, or derived expected answer appears in any
-- return value; supabase/tests/123 fails a port that forgets either half.
--
-- STABLE, not IMMUTABLE: these build their results with jsonb_build_object, which Postgres
-- itself marks stable, and `supabase db lint` reports the mismatch.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false).

set role app_owner;

-- ===================================================================================
-- 1. CX-check-01 — review a sorter's work and fix the tiles it misplaced
--
-- Port of verifyCheckTwice (verifiers/fluid.ts). Every tile's true bin is recomputed from the
-- visible board rather than read off `answer.trueBin`: canonicalise the tile text to its
-- repetition signature ("NGG" -> "ABB") and take the one bin whose pattern IS that signature.
-- The child is correct when every tile ends in its true bin, whether or not they moved
-- anything. M-ERRTYPE is the share of the sorter's planted slips the child actually caught,
-- which needs a second pass over `tokens[].bin` (where the slips live).
-- ===================================================================================

-- TS `repetitionSignature`: first distinct character -> 'A', next -> 'B', and so on. Past 26
-- distinct characters JavaScript's String.fromCharCode(65 + n) walks on into '[', '\', … and
-- chr() does the same, so the two agree even there.
create function app.exam_vcheck_signature(p_text text)
returns text
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_seen jsonb := '{}'::jsonb;
  v_out text := '';
  v_char text;
  v_label text;
begin
  for i in 1 .. char_length(p_text) loop
    v_char := substr(p_text, i, 1);
    v_label := v_seen ->> v_char;
    if v_label is null then
      v_label := chr(65 + (select count(*)::integer from jsonb_object_keys(v_seen)));
      v_seen := v_seen || jsonb_build_object(v_char, v_label);
    end if;
    v_out := v_out || v_label;
  end loop;
  return v_out;
end
$$;

create function app.exam_verify_check_twice(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_bins jsonb := app.exam_varr(v_content -> 'bins');
  v_tokens jsonb := app.exam_varr(v_content -> 'tokens');
  v_by_pattern jsonb := '{}'::jsonb;
  v_true jsonb := null;
  v_entry jsonb;
  v_bin_key text;
  v_pattern text;
  v_id text;
  v_text text;
  v_matches jsonb;
  v_stored jsonb;
  v_final jsonb;
  v_want text;
  v_served text;
  v_size integer;
  v_hits integer := 0;
  v_planted integer := 0;
  v_caught integer := 0;
begin
  -- --- deriveTrueBins ------------------------------------------------------------
  if v_bins is not null and v_tokens is not null and jsonb_array_length(v_tokens) > 0 then
    v_true := '{}'::jsonb;
    for v_entry in select e from jsonb_array_elements(v_bins) as e loop
      v_bin_key := app.exam_vstr(app.exam_vobj(v_entry) -> 'key');
      v_pattern := app.exam_vstr(app.exam_vobj(v_entry) -> 'pattern');
      if v_bin_key is null or v_pattern is null then
        v_true := null;
        exit;
      end if;
      v_by_pattern := v_by_pattern || jsonb_build_object(
        v_pattern,
        coalesce(v_by_pattern -> v_pattern, '[]'::jsonb) || jsonb_build_array(to_jsonb(v_bin_key))
      );
    end loop;
  end if;
  if v_true is not null then
    for v_entry in select e from jsonb_array_elements(v_tokens) as e loop
      v_id := app.exam_vstr(app.exam_vobj(v_entry) -> 'id');
      v_text := app.exam_vstr(app.exam_vobj(v_entry) -> 'text');
      if v_id is null or v_text is null then
        v_true := null;
        exit;
      end if;
      v_matches := v_by_pattern -> app.exam_vcheck_signature(v_text);
      -- An ambiguous board (no bin, or two bins, carrying the tile's signature) is not
      -- gradeable from the stimulus; the stored map is the fallback.
      if v_matches is null or jsonb_array_length(v_matches) <> 1 then
        v_true := null;
        exit;
      end if;
      v_true := v_true || jsonb_build_object(v_id, v_matches -> 0);
    end loop;
  end if;

  if v_true is null then
    v_stored := app.exam_vobj(p_item -> 'answer' -> 'trueBin');
    if v_stored is null then
      return jsonb_build_object('correct', false);
    end if;
    v_true := '{}'::jsonb;
    for v_entry in select jsonb_build_array(to_jsonb(e.key), e.value) from jsonb_each(v_stored) as e loop
      if app.exam_vstr(v_entry -> 1) is null then
        return jsonb_build_object('correct', false);
      end if;
      v_true := v_true || jsonb_build_object(v_entry ->> 0, v_entry -> 1);
    end loop;
  end if;

  v_final := app.exam_vobj(p_response -> 'finalPlacement');
  if v_final is null then
    return jsonb_build_object('correct', false);
  end if;

  select count(*)::integer into v_size from jsonb_object_keys(v_true);
  select count(*)::integer into v_hits
  from jsonb_each(v_true) as e(k, v)
  where app.exam_vstr(v_final -> e.k) is not distinct from app.exam_vstr(e.v);

  -- Planted slips are the tiles the sorter placed away from their true bin; M-ERRTYPE is the
  -- share of those the child caught (0..1, higher is better).
  for v_entry in
    select e from jsonb_array_elements(coalesce(v_tokens, '[]'::jsonb)) as e
  loop
    v_id := app.exam_vstr(app.exam_vobj(v_entry) -> 'id');
    v_served := app.exam_vstr(app.exam_vobj(v_entry) -> 'bin');
    if v_id is null or v_served is null then
      continue;
    end if;
    v_want := app.exam_vstr(v_true -> v_id);
    if v_want is null or v_served = v_want then
      continue;
    end if;
    v_planted := v_planted + 1;
    if app.exam_vstr(v_final -> v_id) is not distinct from v_want then
      v_caught := v_caught + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'correct', v_hits = v_size,
    'metrics', jsonb_build_object(
      'M-POLY', app.exam_vproportion(v_hits, v_size),
      'M-ERRTYPE', case
        when v_planted = 0 then 1::double precision
        else v_caught::double precision / v_planted::double precision
      end
    )
  );
end
$$;

comment on function app.exam_verify_check_twice(jsonb, jsonb) is
  'CX-check-01; port of verifyCheckTwice (verifiers/fluid.ts). Recomputes each tile''s true '
  'bin from its repetition signature, then scores the final placement and the share of the '
  'sorter''s planted slips the child caught.';

-- ===================================================================================
-- 2. FLU-MATRIXBUILD-01 — build the missing tile of a matrix
--
-- Port of verifyMatrixBuild (verifiers/fluid.ts). Per constructed attribute, five rules are
-- induced from the VISIBLE cells (constant row, constant column, Latin-square gap, constant
-- arithmetic delta, and — at size 3 — row sum / row difference); the induction only decides
-- the blank when every surviving rule predicts the same value. Credit is per attribute, so a
-- child who binds two of three rules is separated from one who binds none.
--
-- NaN parity: JavaScript's `numbers()` maps a non-numeric cell to NaN, and NaN !== NaN. SQL
-- NULL stands in for it here because Postgres considers NaN EQUAL to itself, which would make
-- the arithmetic rules fire on unreadable cells. Where JavaScript would push a NaN into the
-- prediction list, this pushes JSON null — readAttrValue never yields JSON null, so the marker
-- cannot collide with a real value, it dedupes against itself the way Set dedupes NaN, and
-- normalizeAttr rejects it exactly as Number.isFinite(NaN) does.
-- ===================================================================================

-- JavaScript `Number.parseInt(text, 10)`; null stands in for NaN.
create function app.exam_vmatrix_parseint(p_text text)
returns double precision
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_digits text := substring(p_text from '^[[:space:]]*[+-]?[0-9]+');
  v_value numeric;
begin
  if v_digits is null then
    return null;
  end if;
  v_value := v_digits::numeric;
  -- JavaScript overflows a very long digit run to Infinity, which Number.isFinite rejects;
  -- float8 would raise instead, so the same case is rejected here before the cast.
  if abs(v_value) > 1.7976931348623157e308::numeric then
    return null;
  end if;
  return v_value::double precision;
end
$$;

-- TS `normalizeAttr`: the comparison form `answer.equivalence.normalization` declares —
-- categorical values trimmed and lowercased, `count` parsed as an integer.
create function app.exam_vmatrix_normalize(p_attribute text, p_value jsonb)
returns jsonb
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_number double precision;
  v_text text;
  v_parsed double precision;
begin
  if p_attribute = 'count' then
    v_number := app.exam_vnum(p_value);
    if v_number is not null then
      return to_jsonb(v_number);
    end if;
    v_text := app.exam_vstr(p_value);
    if v_text is null then
      return null;
    end if;
    v_parsed := app.exam_vmatrix_parseint(v_text);
    return case when v_parsed is not null then to_jsonb(v_parsed) end;
  end if;

  v_text := app.exam_vstr(p_value);
  if v_text is not null then
    return to_jsonb(lower(regexp_replace(regexp_replace(v_text, '^\s+', ''), '\s+$', '')));
  end if;
  v_number := app.exam_vnum(p_value);
  return case when v_number is not null then to_jsonb(v_number) end;
end
$$;

-- JavaScript `[...new Set(xs)]`: order-preserving distinct under `===`.
create function app.exam_vmatrix_uniq(p_array jsonb)
returns jsonb
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_out jsonb := '[]'::jsonb;
  v_entry jsonb;
begin
  for v_entry in select e from jsonb_array_elements(coalesce(p_array, '[]'::jsonb)) as e loop
    if not exists (
      select 1 from jsonb_array_elements(v_out) as s where app.exam_vjseq(s, v_entry)
    ) then
      v_out := v_out || jsonb_build_array(v_entry);
    end if;
  end loop;
  return v_out;
end
$$;

-- TS `induceBlankValues`. `p_values` is a size x size jsonb array whose bottom-right entry is
-- JSON null (the blank). Returns the distinct predictions the surviving rules make.
create function app.exam_vmatrix_induce(p_values jsonb, p_size integer, p_numeric boolean)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_rows jsonb := '[]'::jsonb;
  v_cols jsonb := '[]'::jsonb;
  v_shown jsonb := '[]'::jsonb;
  v_line jsonb;
  v_value jsonb;
  v_preds jsonb := '[]'::jsonb;
  v_alphabet jsonb;
  v_gap_row jsonb;
  v_gap_col jsonb;
  v_ok boolean;
  v_all boolean;
  v_numbers double precision[];
  v_deltas double precision[] := '{}'::double precision[];
  v_distinct double precision[] := '{}'::double precision[];
  v_seen_null boolean := false;
  v_delta double precision;
  v_tail double precision;
  v_a double precision;
  v_b double precision;
  v_c double precision;
begin
  -- shown / row(r) / col(c), all in the row-major order the TypeScript filter produces
  for r in 0 .. p_size - 1 loop
    v_line := '[]'::jsonb;
    for c in 0 .. p_size - 1 loop
      if r = p_size - 1 and c = p_size - 1 then
        continue;
      end if;
      v_value := p_values -> r -> c;
      if v_value is null or jsonb_typeof(v_value) = 'null' then
        return '[]'::jsonb;
      end if;
      v_line := v_line || jsonb_build_array(v_value);
      v_shown := v_shown || jsonb_build_array(v_value);
    end loop;
    v_rows := v_rows || jsonb_build_array(v_line);
  end loop;
  for c in 0 .. p_size - 1 loop
    v_line := '[]'::jsonb;
    for r in 0 .. p_size - 1 loop
      if r = p_size - 1 and c = p_size - 1 then
        continue;
      end if;
      v_line := v_line || jsonb_build_array(p_values -> r -> c);
    end loop;
    v_cols := v_cols || jsonb_build_array(v_line);
  end loop;

  -- rule 1: every row constant
  v_all := true;
  for r in 0 .. p_size - 1 loop
    select coalesce(bool_and(app.exam_vjseq(e, (v_rows -> r) -> 0)), true) into v_ok
    from jsonb_array_elements(v_rows -> r) as e;
    if not v_ok then
      v_all := false;
    end if;
  end loop;
  if v_all then
    v_value := (v_rows -> (p_size - 1)) -> 0;
    if v_value is not null then
      v_preds := v_preds || jsonb_build_array(v_value);
    end if;
  end if;

  -- rule 2: every column constant
  v_all := true;
  for c in 0 .. p_size - 1 loop
    select coalesce(bool_and(app.exam_vjseq(e, (v_cols -> c) -> 0)), true) into v_ok
    from jsonb_array_elements(v_cols -> c) as e;
    if not v_ok then
      v_all := false;
    end if;
  end loop;
  if v_all then
    v_value := (v_cols -> (p_size - 1)) -> 0;
    if v_value is not null then
      v_preds := v_preds || jsonb_build_array(v_value);
    end if;
  end if;

  -- rule 3: Latin square — the one symbol missing from both the last row and the last column
  v_alphabet := app.exam_vmatrix_uniq(v_shown);
  if jsonb_array_length(v_alphabet) = p_size then
    v_all := true;
    for r in 0 .. p_size - 1 loop
      if jsonb_array_length(app.exam_vmatrix_uniq(v_rows -> r))
         <> jsonb_array_length(v_rows -> r)
      then
        v_all := false;
      end if;
    end loop;
    for c in 0 .. p_size - 1 loop
      if jsonb_array_length(app.exam_vmatrix_uniq(v_cols -> c))
         <> jsonb_array_length(v_cols -> c)
      then
        v_all := false;
      end if;
    end loop;
    if v_all then
      select coalesce(jsonb_agg(a order by ord), '[]'::jsonb) into v_gap_row
      from jsonb_array_elements(v_alphabet) with ordinality as t(a, ord)
      where not exists (
        select 1 from jsonb_array_elements(v_rows -> (p_size - 1)) as e
        where app.exam_vjseq(e, a)
      );
      select coalesce(jsonb_agg(a order by ord), '[]'::jsonb) into v_gap_col
      from jsonb_array_elements(v_alphabet) with ordinality as t(a, ord)
      where not exists (
        select 1 from jsonb_array_elements(v_cols -> (p_size - 1)) as e
        where app.exam_vjseq(e, a)
      );
      if jsonb_array_length(v_gap_row) = 1
        and jsonb_array_length(v_gap_col) = 1
        and app.exam_vjseq(v_gap_row -> 0, v_gap_col -> 0)
      then
        v_preds := v_preds || jsonb_build_array(v_gap_row -> 0);
      end if;
    end if;
  end if;

  if not p_numeric then
    return app.exam_vmatrix_uniq(v_preds);
  end if;

  -- rule 4: one constant arithmetic delta along every row
  for r in 0 .. p_size - 1 loop
    select array_agg(app.exam_vnum(e) order by ord) into v_numbers
    from jsonb_array_elements(v_rows -> r) with ordinality as t(e, ord);
    for i in 2 .. coalesce(array_length(v_numbers, 1), 0) loop
      v_deltas := v_deltas || (v_numbers[i] - v_numbers[i - 1]);
    end loop;
  end loop;
  -- `[...new Set(deltas)]`, with SQL NULL standing in for the NaN that Set collapses to one
  foreach v_delta in array v_deltas loop
    if v_delta is null then
      if not v_seen_null then
        v_seen_null := true;
        v_distinct := v_distinct || v_delta;
      end if;
    elsif not exists (select 1 from unnest(v_distinct) as d where d = v_delta) then
      v_distinct := v_distinct || v_delta;
    end if;
  end loop;
  if coalesce(array_length(v_distinct, 1), 0) = 1 then
    v_delta := v_distinct[1];
    if v_delta is not null and v_delta <> 0 then
      select array_agg(app.exam_vnum(e) order by ord) into v_numbers
      from jsonb_array_elements(v_rows -> (p_size - 1)) with ordinality as t(e, ord);
      v_tail := v_numbers[array_length(v_numbers, 1)];
      if v_tail is not null then
        v_preds := v_preds || jsonb_build_array(to_jsonb(v_tail + v_delta));
      end if;
    end if;
  end if;

  -- rule 5: at size 3 only, the third column is the row sum or the row difference
  if p_size = 3 then
    v_all := true;
    for r in 0 .. 1 loop
      if not coalesce(
        app.exam_vnum(p_values -> r -> 2)
          = app.exam_vnum(p_values -> r -> 0) + app.exam_vnum(p_values -> r -> 1),
        false
      ) then
        v_all := false;
      end if;
    end loop;
    if v_all then
      v_a := app.exam_vnum(p_values -> 2 -> 0);
      v_b := app.exam_vnum(p_values -> 2 -> 1);
      v_c := v_a + v_b;
      v_preds := v_preds
        || jsonb_build_array(case when v_c is null then 'null'::jsonb else to_jsonb(v_c) end);
    end if;
    v_all := true;
    for r in 0 .. 1 loop
      if not coalesce(
        app.exam_vnum(p_values -> r -> 2)
          = app.exam_vnum(p_values -> r -> 0) - app.exam_vnum(p_values -> r -> 1),
        false
      ) then
        v_all := false;
      end if;
    end loop;
    if v_all then
      v_a := app.exam_vnum(p_values -> 2 -> 0);
      v_b := app.exam_vnum(p_values -> 2 -> 1);
      v_c := v_a - v_b;
      v_preds := v_preds
        || jsonb_build_array(case when v_c is null then 'null'::jsonb else to_jsonb(v_c) end);
    end if;
  end if;

  return app.exam_vmatrix_uniq(v_preds);
end
$$;

-- TS `deriveMatrixTile`: the expected tile per constructed attribute, or null when the
-- induction does not force exactly one value for every attribute.
create function app.exam_vmatrix_tile(p_content jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_size integer;
  v_raw_size double precision := app.exam_vint(p_content -> 'gridSize');
  v_raw_attrs jsonb := app.exam_varr(p_content -> 'constructedAttributes');
  v_attributes text[];
  v_matrix jsonb := app.exam_vobj(p_content -> 'matrix');
  v_cells jsonb;
  v_blank jsonb;
  v_attribute text;
  v_values jsonb;
  v_line jsonb;
  v_row_cells jsonb;
  v_tile jsonb;
  v_value jsonb;
  v_predicted jsonb;
  v_out jsonb := '{}'::jsonb;
begin
  v_cells := app.exam_varr(v_matrix -> 'cells');
  if v_raw_size is null or v_raw_attrs is null or v_cells is null then
    return null;
  end if;
  v_size := v_raw_size::integer;
  if v_size < 2 then
    return null;
  end if;
  -- TS `.map(asString)` then `.some(a => a === null)`: one unreadable entry rejects the item.
  if exists (
    select 1 from jsonb_array_elements(v_raw_attrs) as e where app.exam_vstr(e) is null
  ) then
    return null;
  end if;
  select coalesce(array_agg(app.exam_vstr(e) order by ord), '{}'::text[]) into v_attributes
  from jsonb_array_elements(v_raw_attrs) with ordinality as t(e, ord);
  if jsonb_array_length(v_cells) <> v_size then
    return null;
  end if;

  -- The induction below reads the blank as the bottom-right cell, as the bank guarantees;
  -- anything else is not a shape this solver can reason about.
  v_blank := app.exam_vobj(v_matrix -> 'blank');
  if app.exam_vint(v_blank -> 'row') is distinct from (v_size - 1)::double precision
    or app.exam_vint(v_blank -> 'col') is distinct from (v_size - 1)::double precision
  then
    return null;
  end if;

  foreach v_attribute in array v_attributes loop
    v_values := '[]'::jsonb;
    for r in 0 .. v_size - 1 loop
      v_row_cells := app.exam_varr(v_cells -> r);
      if v_row_cells is null or jsonb_array_length(v_row_cells) <> v_size then
        return null;
      end if;
      v_line := '[]'::jsonb;
      for c in 0 .. v_size - 1 loop
        if r = v_size - 1 and c = v_size - 1 then
          v_line := v_line || jsonb_build_array('null'::jsonb);
          continue;
        end if;
        v_tile := app.exam_vobj(v_row_cells -> c);
        -- TS `readAttrValue`: a string, or a finite number, else null.
        v_value := case
          when v_tile is null then null
          when jsonb_typeof(v_tile -> v_attribute) in ('string', 'number')
            then v_tile -> v_attribute
        end;
        if v_value is null then
          return null;
        end if;
        v_line := v_line || jsonb_build_array(v_value);
      end loop;
      v_values := v_values || jsonb_build_array(v_line);
    end loop;

    v_predicted := app.exam_vmatrix_induce(v_values, v_size, v_attribute = 'count');
    if jsonb_array_length(v_predicted) <> 1 then
      return null;
    end if;
    v_out := v_out || jsonb_build_object(v_attribute, v_predicted -> 0);
  end loop;

  return v_out;
end
$$;

create function app.exam_verify_matrix_build(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_attributes text[];
  v_attribute text;
  v_derived jsonb;
  v_canonical jsonb;
  v_constructed jsonb;
  v_want jsonb;
  v_got jsonb;
  v_total integer;
  v_hits integer := 0;
  v_correct boolean;
  v_metrics jsonb;
begin
  select coalesce(array_agg(app.exam_vstr(e) order by ord), '{}'::text[]) into v_attributes
  from jsonb_array_elements(coalesce(app.exam_varr(v_content -> 'constructedAttributes'), '[]'::jsonb))
    with ordinality as t(e, ord)
  where app.exam_vstr(e) is not null;
  v_total := coalesce(array_length(v_attributes, 1), 0);
  if v_total = 0 then
    return jsonb_build_object('correct', false);
  end if;

  v_derived := app.exam_vmatrix_tile(v_content);
  v_canonical := app.exam_vobj(p_item -> 'answer' -> 'canonical');
  v_constructed := app.exam_vobj(p_response -> 'constructed');
  if v_constructed is null then
    return jsonb_build_object('correct', false);
  end if;

  foreach v_attribute in array v_attributes loop
    -- TS `derived?.get(attribute) ?? canonical?.[attribute]`: the induced value wins, and the
    -- stored canonical tile is consulted only where the induction produced nothing.
    v_want := app.exam_vmatrix_normalize(
      v_attribute, coalesce(v_derived -> v_attribute, v_canonical -> v_attribute)
    );
    v_got := app.exam_vmatrix_normalize(v_attribute, v_constructed -> v_attribute);
    if v_want is null or v_got is null then
      continue;
    end if;
    if app.exam_vjseq(v_want, v_got) then
      v_hits := v_hits + 1;
    end if;
  end loop;

  v_correct := v_hits = v_total;
  v_metrics := jsonb_build_object('M-POLY', app.exam_vproportion(v_hits, v_total));
  if v_correct then
    -- Halford relational complexity: only a fully correct tile evidences that the child bound
    -- all of the co-acting attribute rules at once.
    v_metrics := v_metrics || jsonb_build_object('M-RULEID', v_total);
  end if;
  return jsonb_build_object('correct', v_correct, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_matrix_build(jsonb, jsonb) is
  'FLU-MATRIXBUILD-01; port of verifyMatrixBuild (verifiers/fluid.ts). Re-induces the blank '
  'tile per constructed attribute from the visible cells under five rules and credits each '
  'attribute separately; M-RULEID is emitted only on a fully correct tile.';

-- ===================================================================================
-- 3. VER-SENSE-01 — put the word cards in the order that makes sense
--
-- Port of verifySense (verifiers/verbal.ts). The target permutation is re-derived by mapping
-- the derivation's true word order back to card indices; the stored "2,0,1" key is the
-- fallback. M-POLY is the ADJACENT-PAIR credit the type declares, not positional overlap: the
-- share of the target's adjacent pairs the child reproduced consecutively and in order, which
-- is why a sentence with one card hung in the wrong place still keeps most of its credit.
--
-- Second reader of `provenance`, after VER-EVIDENCE-01.
-- ===================================================================================

create function app.exam_verify_sense(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_cards jsonb := app.exam_varr(coalesce(p_item -> 'content', '{}'::jsonb) -> 'cards');
  v_texts text[];
  v_readable boolean := false;
  v_derivation jsonb;
  v_true_order jsonb;
  v_expected double precision[];
  v_candidate double precision[];
  v_index integer;
  v_order double precision[];
  v_raw jsonb := app.exam_varr(p_response -> 'order');
  v_part text;
  v_matched integer := 0;
  v_pairs_total integer;
  v_pairs_kept integer := 0;
  v_at integer;
  v_correct boolean;
  v_poly double precision;
  v_len integer;
begin
  if v_cards is not null then
    select
        coalesce(array_agg(app.exam_vstr(app.exam_vobj(e) -> 'text') order by ord), '{}'::text[]),
        coalesce(
          bool_and(app.exam_vstr(app.exam_vobj(e) -> 'text') is not null), true
        )
      into v_texts, v_readable
    from jsonb_array_elements(v_cards) with ordinality as t(e, ord);
  end if;

  if v_readable and v_cards is not null then
    v_derivation := app.exam_vobj(app.exam_vobj(p_item -> 'provenance') -> 'derivation');
    -- TS `strArray()`: one non-string entry makes the whole list unreadable.
    v_true_order := case
      when jsonb_typeof(v_derivation -> 'trueOrder') = 'array'
        and not exists (
          select 1 from jsonb_array_elements(v_derivation -> 'trueOrder') as e
          where jsonb_typeof(e) <> 'string'
        )
      then v_derivation -> 'trueOrder'
    end;
    if v_true_order is not null
      and jsonb_array_length(v_true_order) = coalesce(array_length(v_texts, 1), 0)
      and (select count(distinct t) from unnest(v_texts) as t)
          = coalesce(array_length(v_texts, 1), 0)
    then
      v_candidate := '{}'::double precision[];
      for v_part in select app.exam_vstr(e) from jsonb_array_elements(v_true_order) as e loop
        -- JavaScript indexOf: the FIRST matching card, -1 when the word is not on a card.
        v_index := coalesce(array_position(v_texts, v_part), 0) - 1;
        v_candidate := v_candidate || v_index::double precision;
      end loop;
      if not exists (select 1 from unnest(v_candidate) as i where i < 0) then
        v_expected := v_candidate;
      end if;
    end if;
  end if;

  if v_expected is null then
    v_candidate := '{}'::double precision[];
    -- JavaScript `String(item.answer.correctKey)`: an absent key stringifies to "undefined",
    -- which is not a number, so the item ends up ungradeable rather than silently keyless.
    foreach v_part in array string_to_array(
      coalesce(app.exam_vjsstring(p_item -> 'answer' -> 'correctKey'), 'undefined'), ','
    ) loop
      -- JavaScript Number(part): "" is 0, whitespace is trimmed, anything else is NaN.
      v_candidate := v_candidate || case
        when v_part ~ '^[[:space:]]*[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?[[:space:]]*$'
          then v_part::double precision
        when v_part ~ '^[[:space:]]*$' then 0::double precision
      end;
    end loop;
    -- `Number.isInteger(index) && index >= 0` for every part, else the item is not gradeable.
    if not exists (
      select 1 from unnest(v_candidate) as i
      where i is null or i < 0 or i <> trunc(i)
    ) then
      v_expected := v_candidate;
    else
      return jsonb_build_object('correct', false);
    end if;
  end if;

  v_len := coalesce(array_length(v_expected, 1), 0);
  if v_len = 0 or v_raw is null then
    return jsonb_build_object('correct', false);
  end if;
  -- TS `numArray()`: an array of finite numbers, else null.
  if exists (select 1 from jsonb_array_elements(v_raw) as e where app.exam_vnum(e) is null) then
    return jsonb_build_object('correct', false);
  end if;
  select coalesce(array_agg(app.exam_vnum(e) order by ord), '{}'::double precision[])
    into v_order
  from jsonb_array_elements(v_raw) with ordinality as t(e, ord);

  for i in 1 .. v_len loop
    if i <= coalesce(array_length(v_order, 1), 0) and v_order[i] = v_expected[i] then
      v_matched := v_matched + 1;
    end if;
  end loop;
  v_correct := coalesce(array_length(v_order, 1), 0) = v_len and v_matched = v_len;

  v_pairs_total := v_len - 1;
  for i in 1 .. v_pairs_total loop
    v_at := array_position(v_order, v_expected[i]);
    if v_at is not null
      and v_at + 1 <= coalesce(array_length(v_order, 1), 0)
      and v_order[v_at + 1] = v_expected[i + 1]
    then
      v_pairs_kept := v_pairs_kept + 1;
    end if;
  end loop;

  v_poly := case
    when v_pairs_total > 0 then v_pairs_kept::double precision / v_pairs_total::double precision
    when v_correct then 1
    else 0
  end;
  return jsonb_build_object(
    'correct', v_correct,
    'metrics', jsonb_build_object('M-POLY', app.exam_vround4(v_poly))
  );
end
$$;

comment on function app.exam_verify_sense(jsonb, jsonb) is
  'VER-SENSE-01; port of verifySense (verifiers/verbal.ts). Re-derives the target permutation '
  'from provenance.derivation.trueOrder and grades a strict permutation match, with M-POLY as '
  'the adjacent-pair credit the type declares.';

-- ===================================================================================
-- 4. GB-WORDFORGE-01 — credit every forgeable word
--
-- Port of verifyWordforge (verifiers/quantitative.ts). No lexicon is needed: `answer.
-- validWords` is the exact set of lexicon words the rack affords, enumerated when the bank was
-- built. A submission is credited iff it is in that set case-insensitively, and repeats score
-- once. Full credit is a THRESHOLD (distinct credited >= `answer.referenceTarget`), not
-- "produced one word".
--
-- PRESERVED DEFECT (inventory section 8.3): `correct` is `target is not null and credited >=
-- target`, so an item with no `referenceTarget` scores EVERY child wrong instead of falling
-- back to "produced at least one valid word". Reproduced verbatim; changing it is a scoring
-- decision for the owner.
--
-- M-VOCABLVL is order-sensitive in the original — the running minimum only starts once a
-- band above zero has been seen — so the credited words are walked in submission order here
-- too, which is the order the JavaScript Set preserves.
-- ===================================================================================

create function app.exam_verify_wordforge(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_entries jsonb := app.exam_varr(p_item -> 'answer' -> 'validWords');
  v_submissions jsonb := app.exam_varr(p_response -> 'submissions');
  v_band_of jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_word text;
  v_normalised text;
  v_credited text[] := '{}'::text[];
  v_band double precision;
  v_rarest double precision := 0;
  v_count integer;
  v_target double precision;
  v_metrics jsonb;
begin
  if v_entries is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_entries) as e loop
    v_word := app.exam_vstr(app.exam_vobj(v_entry) -> 'word');
    if v_word is null then
      continue;
    end if;
    v_band_of := v_band_of || jsonb_build_object(
      upper(v_word),
      to_jsonb(coalesce(app.exam_vint(app.exam_vobj(v_entry) -> 'band'), 0::double precision))
    );
  end loop;

  if v_submissions is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_submissions) as e loop
    v_word := coalesce(
      app.exam_vstr(v_entry), app.exam_vstr(app.exam_vobj(v_entry) -> 'word')
    );
    if v_word is null then
      continue;
    end if;
    v_normalised := upper(v_word);
    if (v_band_of ? v_normalised) and not (v_normalised = any (v_credited)) then
      v_credited := v_credited || v_normalised;
    end if;
  end loop;
  v_count := coalesce(array_length(v_credited, 1), 0);

  foreach v_normalised in array v_credited loop
    v_band := coalesce(app.exam_vnum(v_band_of -> v_normalised), 0);
    if v_rarest = 0 or (v_band > 0 and v_band < v_rarest) then
      v_rarest := v_band;
    end if;
  end loop;

  v_target := app.exam_vint(p_item -> 'answer' -> 'referenceTarget');
  v_metrics := jsonb_build_object('M-IDEAFLU', v_count);
  if v_rarest > 0 then
    v_metrics := v_metrics || jsonb_build_object('M-VOCABLVL', v_rarest);
  end if;
  if v_target is not null and v_target > 0 then
    v_metrics := v_metrics || jsonb_build_object(
      'M-EFF', least(1::double precision, v_count::double precision / v_target)
    );
  end if;

  return jsonb_build_object(
    'correct', v_target is not null and v_count >= v_target,
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_wordforge(jsonb, jsonb) is
  'GB-WORDFORGE-01; port of verifyWordforge (verifiers/quantitative.ts). Credits each distinct '
  'submission present in answer.validWords and makes full credit a threshold against '
  'answer.referenceTarget. Preserves the reported defect that a missing referenceTarget scores '
  'every child wrong (inventory section 8.3) — fixing it is the owner''s call, not this port''s.';

-- ===================================================================================
-- 5. GB-TRACK-01 — keep your eyes on the jars while they slide
--
-- Port of verifyTrack (verifiers/quantitative.ts). The final target set is re-derived by
-- applying each phase's swaps to `content.initialTargets`; the client's own `motionDigest` is
-- never consulted.
--
-- SIMULTANEITY. The swaps within ONE phase are a single permutation, not a sequence: every
-- swap reads the slot contents as they were at the START of the phase and writes into a fresh
-- array. Applying them sequentially would give a different permutation whenever two swaps in a
-- phase touch the same slot, so the snapshot is load-bearing rather than stylistic.
-- ===================================================================================

create function app.exam_verify_track(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_jar_count_raw double precision := app.exam_vint(v_content -> 'jarCount');
  v_jar_count integer;
  v_motion jsonb := app.exam_vobj(v_content -> 'motion');
  v_phases jsonb;
  v_initial jsonb := app.exam_varr(v_content -> 'initialTargets');
  v_phase jsonb;
  v_swaps jsonb;
  v_swap jsonb;
  v_jar_in_slot integer[];
  v_next integer[];
  v_slot_of_jar integer[];
  v_a double precision;
  v_b double precision;
  v_jar double precision;
  v_slot integer;
  v_final_slots integer[] := '{}'::integer[];
  v_chosen integer[] := '{}'::integer[];
  v_entry jsonb;
  v_correct boolean;
  v_overlap double precision;
  v_metrics jsonb;
  v_optimum double precision;
  v_actual double precision;
begin
  v_phases := app.exam_varr(v_motion -> 'phases');
  if v_jar_count_raw is null or v_jar_count_raw < 2 or v_phases is null or v_initial is null then
    return jsonb_build_object('correct', false);
  end if;
  v_jar_count := v_jar_count_raw::integer;

  select array_agg(s order by s) into v_jar_in_slot from generate_series(0, v_jar_count - 1) as s;

  for v_phase in select e from jsonb_array_elements(v_phases) as e loop
    v_swaps := app.exam_varr(app.exam_vobj(v_phase) -> 'swaps');
    if v_swaps is null then
      return jsonb_build_object('correct', false);
    end if;
    -- The snapshot: every swap in this phase reads v_jar_in_slot and writes v_next.
    v_next := v_jar_in_slot;
    for v_swap in select e from jsonb_array_elements(v_swaps) as e loop
      if app.exam_varr(v_swap) is null or jsonb_array_length(v_swap) < 2 then
        return jsonb_build_object('correct', false);
      end if;
      v_a := app.exam_vint(v_swap -> 0);
      v_b := app.exam_vint(v_swap -> 1);
      if v_a is null or v_b is null then
        return jsonb_build_object('correct', false);
      end if;
      if v_a < 0 or v_a >= v_jar_count or v_b < 0 or v_b >= v_jar_count then
        return jsonb_build_object('correct', false);
      end if;
      v_next[v_a::integer + 1] := v_jar_in_slot[v_b::integer + 1];
      v_next[v_b::integer + 1] := v_jar_in_slot[v_a::integer + 1];
    end loop;
    v_jar_in_slot := v_next;
  end loop;

  v_slot_of_jar := array_fill(-1, array[v_jar_count]);
  for i in 0 .. v_jar_count - 1 loop
    v_slot_of_jar[v_jar_in_slot[i + 1] + 1] := i;
  end loop;

  for v_entry in select e from jsonb_array_elements(v_initial) as e loop
    v_jar := app.exam_vint(v_entry);
    if v_jar is null or v_jar < 0 or v_jar >= v_jar_count then
      return jsonb_build_object('correct', false);
    end if;
    v_slot := v_slot_of_jar[v_jar::integer + 1];
    if v_slot < 0 then
      return jsonb_build_object('correct', false);
    end if;
    v_final_slots := v_final_slots || v_slot;
  end loop;
  select coalesce(array_agg(s order by s), '{}'::integer[]) into v_final_slots
  from unnest(v_final_slots) as s;

  if app.exam_varr(p_response -> 'selectedSlots') is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(p_response -> 'selectedSlots') as e loop
    v_a := app.exam_vint(v_entry);
    if v_a is null then
      return jsonb_build_object('correct', false);
    end if;
    if not (v_a::integer = any (v_chosen)) then
      v_chosen := v_chosen || v_a::integer;
    end if;
  end loop;
  select coalesce(array_agg(s order by s), '{}'::integer[]) into v_chosen
  from unnest(v_chosen) as s;

  v_correct := v_chosen = v_final_slots;

  -- scoring.partialCredit = true: how much of the target set survived tracking.
  v_overlap := case
    when coalesce(array_length(v_final_slots, 1), 0) = 0 then 0
    else (
      select count(*)::double precision from unnest(v_final_slots) as s where s = any (v_chosen)
    ) / array_length(v_final_slots, 1)::double precision
  end;
  v_metrics := jsonb_build_object('M-PROG', v_overlap);

  v_optimum := app.exam_vint(app.exam_vobj(p_item -> 'answer' -> 'cost') -> 'taps');
  v_actual := app.exam_vint(p_response -> 'taps');
  if v_optimum is not null and v_actual is not null and v_optimum > 0 then
    v_metrics := v_metrics || jsonb_build_object(
      'M-EFF', v_optimum / greatest(v_actual, v_optimum)
    );
  end if;

  return jsonb_build_object('correct', v_correct, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_track(jsonb, jsonb) is
  'GB-TRACK-01; port of verifyTrack (verifiers/quantitative.ts). Replays the motion script, '
  'applying each phase''s swaps as ONE simultaneous permutation against a snapshot, and '
  'compares the submitted slot set. The client''s motionDigest is never consulted.';

-- ===================================================================================
-- 6. SPA-SCENE-01 — order the cards as the robot sees them
--
-- Port of verifyScene (verifiers/spatial.ts). Left-to-right as seen from the robot, by the
-- trig-free cross-product comparator the bank checker uses, then an exact order match (plus
-- the nearest card when the item asks for it). M-POLY grades the concordant pairs, M-MIRRORFA
-- flags the exact left-right reversal — the egocentric-bias foil every item carries.
-- ===================================================================================

-- TS `seenOrder`. JavaScript's Array.prototype.sort is stable, and the comparator
-- `(a, b) => b.x * a.y - b.y * a.x` is a consistent strict weak ordering for a scene whose
-- objects are all in front of the robot (which the bank enforces), so a stable insertion sort
-- reproduces its result exactly. `order by` cannot express a comparator, hence the loop.
create function app.exam_vscene_order(
  p_ids double precision[],
  p_xs double precision[],
  p_ys double precision[]
)
returns double precision[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n integer := coalesce(array_length(p_ids, 1), 0);
  v_ids double precision[] := p_ids;
  v_xs double precision[] := p_xs;
  v_ys double precision[] := p_ys;
  v_id double precision;
  v_x double precision;
  v_y double precision;
  j integer;
begin
  for i in 2 .. v_n loop
    v_id := v_ids[i];
    v_x := v_xs[i];
    v_y := v_ys[i];
    j := i - 1;
    -- comparator(v_ids[j], key) > 0
    while j >= 1 and (v_x * v_ys[j] - v_y * v_xs[j]) > 0 loop
      v_ids[j + 1] := v_ids[j];
      v_xs[j + 1] := v_xs[j];
      v_ys[j + 1] := v_ys[j];
      j := j - 1;
    end loop;
    v_ids[j + 1] := v_id;
    v_xs[j + 1] := v_x;
    v_ys[j + 1] := v_y;
  end loop;
  return v_ids;
end
$$;

create function app.exam_verify_scene(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_scene jsonb := app.exam_vobj(v_content -> 'scene');
  v_raw jsonb;
  v_robot jsonb;
  v_rx double precision;
  v_ry double precision;
  v_entry jsonb;
  v_ids double precision[] := '{}'::double precision[];
  v_xs double precision[] := '{}'::double precision[];
  v_ys double precision[] := '{}'::double precision[];
  v_n integer;
  v_order double precision[] := '{}'::double precision[];
  v_submitted jsonb := app.exam_varr(p_response -> 'order');
  v_expected double precision[];
  v_reversed double precision[];
  v_pairs integer := 0;
  v_concordant integer := 0;
  v_a integer;
  v_b integer;
  v_same_expected boolean;
  v_same_reversed boolean;
  v_metrics jsonb;
  v_nearest double precision;
  v_best double precision;
  v_dist double precision;
begin
  if v_scene is null or v_submitted is null then
    return jsonb_build_object('correct', false);
  end if;
  v_raw := app.exam_varr(v_scene -> 'objects');
  v_robot := app.exam_vobj(v_scene -> 'robot');
  if v_raw is null or v_robot is null then
    return jsonb_build_object('correct', false);
  end if;
  v_rx := app.exam_vnum(v_robot -> 'x');
  v_ry := app.exam_vnum(v_robot -> 'y');
  if v_rx is null or v_ry is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_raw) as e loop
    if app.exam_vobj(v_entry) is null
      or app.exam_vnum(v_entry -> 'id') is null
      or app.exam_vnum(v_entry -> 'x') is null
      or app.exam_vnum(v_entry -> 'y') is null
    then
      return jsonb_build_object('correct', false);
    end if;
    v_ids := v_ids || app.exam_vnum(v_entry -> 'id');
    v_xs := v_xs || app.exam_vnum(v_entry -> 'x');
    v_ys := v_ys || app.exam_vnum(v_entry -> 'y');
  end loop;
  v_n := coalesce(array_length(v_ids, 1), 0);
  -- `sceneObjects` returns null for a scene with fewer than two objects.
  if v_n < 2 then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_submitted) as e loop
    if app.exam_vnum(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_order := v_order || app.exam_vnum(v_entry);
  end loop;

  v_expected := app.exam_vscene_order(
    v_ids,
    (select coalesce(array_agg(x - v_rx order by ord), '{}'::double precision[])
     from unnest(v_xs) with ordinality as t(x, ord)),
    (select coalesce(array_agg(y - v_ry order by ord), '{}'::double precision[])
     from unnest(v_ys) with ordinality as t(y, ord))
  );
  if coalesce(array_length(v_expected, 1), 0) <> v_n then
    select coalesce(array_agg(app.exam_vnum(e) order by ord), '{}'::double precision[])
      into v_expected
    from jsonb_array_elements(coalesce(app.exam_varr(p_item -> 'answer' -> 'correctOrder'), '[]'::jsonb))
      with ordinality as t(e, ord)
    where app.exam_vnum(e) is not null;
    if coalesce(array_length(v_expected, 1), 0) <> v_n then
      return jsonb_build_object('correct', false);
    end if;
  end if;

  -- `new Map(order.map((id, i) => [id, i]))`: on a duplicate id the LAST index wins.
  for i in 1 .. v_n loop
    for j in i + 1 .. v_n loop
      v_pairs := v_pairs + 1;
      select max(ord)::integer - 1 into v_a
      from unnest(v_order) with ordinality as t(id, ord) where id = v_expected[i];
      select max(ord)::integer - 1 into v_b
      from unnest(v_order) with ordinality as t(id, ord) where id = v_expected[j];
      if v_a is not null and v_b is not null and v_a < v_b then
        v_concordant := v_concordant + 1;
      end if;
    end loop;
  end loop;

  select coalesce(array_agg(id order by ord desc), '{}'::double precision[]) into v_reversed
  from unnest(v_expected) with ordinality as t(id, ord);
  v_same_expected := v_order = v_expected;
  v_same_reversed := v_order = v_reversed;

  v_metrics := jsonb_build_object(
    'M-POLY', case
      when v_pairs > 0 then v_concordant::double precision / v_pairs::double precision
      else 0::double precision
    end,
    'M-MIRRORFA', case when (not v_same_expected) and v_same_reversed then 1 else 0 end
  );

  if not v_same_expected then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;

  if (app.exam_vobj(v_content -> 'question') -> 'requireNearest') = 'true'::jsonb then
    for i in 1 .. v_n loop
      v_dist := sqrt((v_xs[i] - v_rx) * (v_xs[i] - v_rx) + (v_ys[i] - v_ry) * (v_ys[i] - v_ry));
      if v_best is null or v_dist < v_best then
        v_best := v_dist;
        v_nearest := v_ids[i];
      end if;
    end loop;
    if app.exam_vnum(p_response -> 'nearestId') is distinct from v_nearest then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
  end if;

  return jsonb_build_object('correct', true, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_scene(jsonb, jsonb) is
  'SPA-SCENE-01; port of verifyScene (verifiers/spatial.ts). Re-derives the robot''s-eye '
  'left-to-right order with the bank checker''s cross-product comparator and grades an exact '
  'order match; M-POLY is the concordant-pair share and M-MIRRORFA the egocentric reversal.';

-- ===================================================================================
-- 7. SPA-MAZE-01 — walk the maze from start to goal, collecting the gems
--
-- Port of verifyMaze (verifiers/spatial.ts). No search: the child submits the route and the
-- server replays it. Correct iff it is a LEGAL WALK — every step 4-adjacent and through an
-- open edge — that starts at `content.start`, ends at `content.goal` and visits every gem.
-- `answer.optimalPath` is deliberately NOT the key (many legal routes exist and the bank's own
-- taxonomy calls a longer one a detour, not an error); efficiency is reported as M-EFF.
--
-- The edge key must be built in the SAME canonical order the bank serialised it in, which is
-- the lexicographically-smaller endpoint first by (row, col).
-- ===================================================================================

create function app.exam_verify_maze(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_start jsonb := app.exam_varr(v_content -> 'start');
  v_goal jsonb := app.exam_varr(v_content -> 'goal');
  v_open_edges jsonb := app.exam_varr(v_content -> 'openEdges');
  v_gems jsonb := app.exam_varr(v_content -> 'gems');
  v_submitted jsonb := app.exam_varr(p_response -> 'path');
  v_start_r double precision;
  v_start_c double precision;
  v_goal_r double precision;
  v_goal_c double precision;
  v_open jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_rs double precision[] := '{}'::double precision[];
  v_cs double precision[] := '{}'::double precision[];
  v_n integer;
  v_steps double precision;
  v_optimal double precision;
  v_eff double precision;
  v_metrics jsonb := '{}'::jsonb;
  v_visited jsonb := '{}'::jsonb;
  v_edge text;
  v_gr double precision;
  v_gc double precision;
begin
  if v_start is null or jsonb_array_length(v_start) < 2
    or v_goal is null or jsonb_array_length(v_goal) < 2
    or v_open_edges is null or v_gems is null
    or v_submitted is null or jsonb_array_length(v_submitted) < 1
  then
    return jsonb_build_object('correct', false);
  end if;
  v_start_r := app.exam_vnum(v_start -> 0);
  v_start_c := app.exam_vnum(v_start -> 1);
  v_goal_r := app.exam_vnum(v_goal -> 0);
  v_goal_c := app.exam_vnum(v_goal -> 1);
  if v_start_r is null or v_start_c is null or v_goal_r is null or v_goal_c is null then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_open_edges) as e loop
    if jsonb_typeof(v_entry) <> 'string' then
      return jsonb_build_object('correct', false);
    end if;
    v_open := v_open || jsonb_build_object(v_entry #>> '{}', true);
  end loop;

  for v_entry in select e from jsonb_array_elements(v_submitted) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 2
      or app.exam_vnum(v_entry -> 0) is null or app.exam_vnum(v_entry -> 1) is null
    then
      return jsonb_build_object('correct', false);
    end if;
    v_rs := v_rs || app.exam_vnum(v_entry -> 0);
    v_cs := v_cs || app.exam_vnum(v_entry -> 1);
  end loop;
  v_n := coalesce(array_length(v_rs, 1), 0);

  -- spatial.ts `efficiency` + `clamp01`, which differ from the quantitative-file variant.
  v_steps := v_n - 1;
  v_optimal := app.exam_vnum(p_item -> 'answer' -> 'optimalLength');
  if v_optimal is not null then
    v_eff := case
      when v_steps <= 0 then (case when v_optimal <= 0 then 1 else 0 end)
      else greatest(0::double precision, least(1::double precision, v_optimal / v_steps))
    end;
    v_metrics := jsonb_build_object('M-EFF', v_eff);
  end if;

  if v_rs[1] <> v_start_r or v_cs[1] <> v_start_c then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;
  if v_rs[v_n] <> v_goal_r or v_cs[v_n] <> v_goal_c then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;

  for i in 2 .. v_n loop
    if abs(v_rs[i - 1] - v_rs[i]) + abs(v_cs[i - 1] - v_cs[i]) <> 1 then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
    v_edge := case
      when v_rs[i - 1] < v_rs[i] or (v_rs[i - 1] = v_rs[i] and v_cs[i - 1] < v_cs[i])
        then app.exam_vjsstring(to_jsonb(v_rs[i - 1])) || ',' || app.exam_vjsstring(to_jsonb(v_cs[i - 1]))
          || '-' || app.exam_vjsstring(to_jsonb(v_rs[i])) || ',' || app.exam_vjsstring(to_jsonb(v_cs[i]))
      else app.exam_vjsstring(to_jsonb(v_rs[i])) || ',' || app.exam_vjsstring(to_jsonb(v_cs[i]))
          || '-' || app.exam_vjsstring(to_jsonb(v_rs[i - 1])) || ',' || app.exam_vjsstring(to_jsonb(v_cs[i - 1]))
    end;
    if not (v_open ? v_edge) then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
  end loop;

  for i in 1 .. v_n loop
    v_visited := v_visited || jsonb_build_object(
      app.exam_vjsstring(to_jsonb(v_rs[i])) || ',' || app.exam_vjsstring(to_jsonb(v_cs[i])), true
    );
  end loop;
  for v_entry in select e from jsonb_array_elements(v_gems) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 2 then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
    v_gr := app.exam_vnum(v_entry -> 0);
    v_gc := app.exam_vnum(v_entry -> 1);
    if v_gr is null or v_gc is null then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
    if not (v_visited ? (app.exam_vjsstring(to_jsonb(v_gr)) || ',' || app.exam_vjsstring(to_jsonb(v_gc)))) then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
  end loop;

  return jsonb_build_object('correct', true, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_maze(jsonb, jsonb) is
  'SPA-MAZE-01; port of verifyMaze (verifiers/spatial.ts). Replays the submitted route as a '
  'legal walk through the served open edges; a longer legal route is correct with a lower '
  'M-EFF, not wrong.';

-- ===================================================================================
-- 8. GB-ROBOPATH-01 — build one program that takes the robot to the door
--
-- Port of verifyRobopath (verifiers/quantitative.ts). The child composes a program; the server
-- EXPANDS and RUNS it. A bump on a wall or the grid edge aborts the run; the robot must step
-- on every key and stop on the door. `answer.cost.actions` is the optimum for efficiency, not
-- the key, and `content.limits.maxProgramTokens` is the renderer's budget, also not the key.
--
-- Note the metric asymmetry the port must keep: a crash returns a verdict with NO metrics at
-- all, while a completed run carries M-EFF whenever the optimum is readable.
-- ===================================================================================

create function app.exam_verify_robopath(p_item jsonb, p_response jsonb)
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
  v_start jsonb := app.exam_vobj(v_content -> 'start');
  v_door jsonb := app.exam_varr(v_content -> 'door');
  v_door_r double precision;
  v_door_c double precision;
  v_walls jsonb := coalesce(nullif(v_content -> 'walls', 'null'::jsonb), '[]'::jsonb);
  v_keys jsonb := coalesce(nullif(v_content -> 'keys', 'null'::jsonb), '[]'::jsonb);
  v_blocked jsonb := '{}'::jsonb;
  v_uncollected jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_r double precision;
  v_c double precision;
  v_heading integer;
  v_start_h text;
  v_repeat jsonb;
  v_max_reps double precision;
  v_max_tokens double precision;
  v_program jsonb := app.exam_varr(p_response -> 'program');
  v_sequence text[] := '{}'::text[];
  v_cmd text;
  v_reps double precision;
  v_nr double precision;
  v_nc double precision;
  v_solved boolean;
  v_optimum double precision;
begin
  v_rows := app.exam_vint(v_grid -> 'R');
  v_cols := app.exam_vint(v_grid -> 'C');
  if v_rows is null or v_cols is null or v_rows < 1 or v_cols < 1 then
    return jsonb_build_object('correct', false);
  end if;
  if v_start is null or v_door is null or jsonb_array_length(v_door) < 2 then
    return jsonb_build_object('correct', false);
  end if;
  v_door_r := app.exam_vint(v_door -> 0);
  v_door_c := app.exam_vint(v_door -> 1);
  if v_door_r is null or v_door_c is null then
    return jsonb_build_object('correct', false);
  end if;
  if app.exam_varr(v_walls) is null or app.exam_varr(v_keys) is null then
    return jsonb_build_object('correct', false);
  end if;

  v_r := app.exam_vint(v_start -> 'r');
  v_c := app.exam_vint(v_start -> 'c');
  v_start_h := app.exam_vstr(v_start -> 'h');
  if v_r is null or v_c is null or v_start_h is null then
    return jsonb_build_object('correct', false);
  end if;
  v_heading := coalesce(array_position(array['N', 'E', 'S', 'W'], v_start_h), 0) - 1;
  if v_heading < 0 then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_walls) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 2
      or app.exam_vint(v_entry -> 0) is null or app.exam_vint(v_entry -> 1) is null
    then
      return jsonb_build_object('correct', false);
    end if;
    v_blocked := v_blocked || jsonb_build_object(
      app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 0))) || ','
      || app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 1))), true
    );
  end loop;
  for v_entry in select e from jsonb_array_elements(v_keys) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 2
      or app.exam_vint(v_entry -> 0) is null or app.exam_vint(v_entry -> 1) is null
    then
      return jsonb_build_object('correct', false);
    end if;
    v_uncollected := v_uncollected || jsonb_build_object(
      app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 0))) || ','
      || app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 1))), true
    );
  end loop;

  v_repeat := app.exam_vobj(app.exam_vobj(v_content -> 'instructionSet') -> 'repeat');
  v_max_reps := case
    when v_repeat is not null then coalesce(app.exam_vint(v_repeat -> 'maxReps'), 1)
    else 1
  end;
  v_max_tokens := case
    when app.exam_vobj(v_content -> 'limits') is not null
      then app.exam_vint(app.exam_vobj(v_content -> 'limits') -> 'maxProgramTokens')
  end;

  if v_program is not null then
    -- TS `expandProgram`: `[{cmd, reps}]` flattened; an illegal token rejects the submission.
    for v_entry in select e from jsonb_array_elements(v_program) as e loop
      if app.exam_vobj(v_entry) is null then
        return jsonb_build_object('correct', false);
      end if;
      v_cmd := app.exam_vstr(v_entry -> 'cmd');
      v_reps := app.exam_vint(v_entry -> 'reps');
      if v_cmd is null or not (v_cmd = any (array['F', 'L', 'R'])) then
        return jsonb_build_object('correct', false);
      end if;
      if v_reps is null or v_reps < 1 or v_reps > v_max_reps then
        return jsonb_build_object('correct', false);
      end if;
      for i in 1 .. v_reps::integer loop
        v_sequence := v_sequence || v_cmd;
      end loop;
    end loop;
    if v_max_tokens is not null and jsonb_array_length(v_program) > v_max_tokens then
      return jsonb_build_object('correct', false);
    end if;
  else
    -- TS `actionSequence`: a flat list of primitive commands.
    if app.exam_varr(p_response -> 'actionSeq') is null then
      return jsonb_build_object('correct', false);
    end if;
    for v_entry in select e from jsonb_array_elements(p_response -> 'actionSeq') as e loop
      v_cmd := app.exam_vstr(v_entry);
      if v_cmd is null or not (v_cmd = any (array['F', 'L', 'R'])) then
        return jsonb_build_object('correct', false);
      end if;
      v_sequence := v_sequence || v_cmd;
    end loop;
  end if;

  v_uncollected := v_uncollected - (
    app.exam_vjsstring(to_jsonb(v_r)) || ',' || app.exam_vjsstring(to_jsonb(v_c))
  );

  foreach v_cmd in array v_sequence loop
    if v_cmd = 'F' then
      v_nr := v_r + (case v_heading when 0 then -1 when 2 then 1 else 0 end);
      v_nc := v_c + (case v_heading when 1 then 1 when 3 then -1 else 0 end);
      -- A bump aborts the run — the child's plan did not survive execution.
      if v_nr < 0 or v_nr >= v_rows or v_nc < 0 or v_nc >= v_cols then
        return jsonb_build_object('correct', false);
      end if;
      if v_blocked ? (app.exam_vjsstring(to_jsonb(v_nr)) || ',' || app.exam_vjsstring(to_jsonb(v_nc))) then
        return jsonb_build_object('correct', false);
      end if;
      v_r := v_nr;
      v_c := v_nc;
      v_uncollected := v_uncollected - (
        app.exam_vjsstring(to_jsonb(v_r)) || ',' || app.exam_vjsstring(to_jsonb(v_c))
      );
    else
      v_heading := case when v_cmd = 'R' then (v_heading + 1) % 4 else (v_heading + 3) % 4 end;
    end if;
  end loop;

  v_solved := (select count(*) from jsonb_object_keys(v_uncollected)) = 0
    and v_r = v_door_r and v_c = v_door_c;

  -- quantitative.ts `efficiency`: optimum / max(actual, optimum), omitted when unreadable.
  v_optimum := app.exam_vint(app.exam_vobj(p_item -> 'answer' -> 'cost') -> 'actions');
  if v_optimum is null or v_optimum <= 0 then
    return jsonb_build_object('correct', v_solved);
  end if;
  return jsonb_build_object(
    'correct', v_solved,
    'metrics', jsonb_build_object(
      'M-EFF',
      v_optimum / greatest(coalesce(array_length(v_sequence, 1), 0)::double precision, v_optimum)
    )
  );
end
$$;

comment on function app.exam_verify_robopath(jsonb, jsonb) is
  'GB-ROBOPATH-01; port of verifyRobopath (verifiers/quantitative.ts). Expands the submitted '
  'turtle program and runs it against the served grid: a bump aborts, every key must be '
  'stepped on, and the robot must stop on the door.';

-- ===================================================================================
-- 9. GB-EXPLORE-01 — walk the foggy map, point at the landmarks, come home
--
-- Port of verifyExplore (verifiers/quantitative.ts). Correctness is re-derived by replaying
-- `response.actions` step by step — each 4-adjacent, in bounds and unblocked — rather than by
-- trusting the renderer's `landmarksFound` / `reachedHome` flags. No budget bounds
-- correctness; the optimum only feeds M-EFF.
--
-- PRESERVED DEFECT (inventory section 8.4): when `response.actions` is absent the fallback
-- branch takes its move count from `response.cost.actual` — a number the renderer computed —
-- which contradicts the rule stated at the top of the same TypeScript file. It feeds M-EFF
-- only, never correctness. Reproduced verbatim; fixing it is the owner's call.
-- ===================================================================================

-- TS `pointingError` + `circularDelta`, per `answer.bearingRule`: the true bearing of a
-- landmark from the cell the child stood on is atan2(dc, -dr) in degrees clockwise from north,
-- and the metric is the mean absolute CIRCULAR difference from the raw dial angle.
--
-- JavaScript's `%` on doubles is fmod (truncated), which Postgres has no float8 operator for,
-- so it is written out as `x - trunc(x / y) * y`. Every argument here lands in a range where
-- Sterbenz's lemma makes that subtraction exact, so the two agree bit for bit.
create function app.exam_vexplore_pointing_error(p_pointings jsonb, p_landmarks jsonb)
returns double precision
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_list jsonb := app.exam_varr(p_pointings);
  v_entry jsonb;
  v_id text;
  v_stand jsonb;
  v_angle double precision;
  v_target jsonb;
  v_dr double precision;
  v_dc double precision;
  v_bearing double precision;
  v_delta double precision;
  v_total double precision := 0;
  v_counted integer := 0;
begin
  if v_list is null or jsonb_array_length(v_list) = 0 then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(v_list) as e loop
    v_id := app.exam_vstr(app.exam_vobj(v_entry) -> 'landmarkId');
    v_stand := app.exam_varr(app.exam_vobj(v_entry) -> 'standCell');
    v_angle := app.exam_vnum(app.exam_vobj(v_entry) -> 'angleDeg');
    v_target := case when v_id is not null then p_landmarks -> v_id end;
    if v_stand is null or jsonb_array_length(v_stand) < 2
      or app.exam_vint(v_stand -> 0) is null or app.exam_vint(v_stand -> 1) is null
      or v_angle is null or v_target is null
    then
      continue;
    end if;
    v_dr := app.exam_vnum(v_target -> 0) - app.exam_vint(v_stand -> 0);
    v_dc := app.exam_vnum(v_target -> 1) - app.exam_vint(v_stand -> 1);
    v_bearing := atan2(v_dc, -v_dr) * 180 / pi();
    v_bearing := v_bearing - trunc(v_bearing / 360) * 360;
    v_bearing := v_bearing + 360;
    v_bearing := v_bearing - trunc(v_bearing / 360) * 360;
    v_delta := v_angle - v_bearing;
    v_delta := v_delta - trunc(v_delta / 360) * 360;
    v_delta := abs(v_delta + 360);
    v_delta := v_delta - trunc(v_delta / 360) * 360;
    v_total := v_total + least(v_delta, 360 - v_delta);
    v_counted := v_counted + 1;
  end loop;
  return case when v_counted > 0 then v_total / v_counted::double precision end;
end
$$;

create function app.exam_verify_explore(p_item jsonb, p_response jsonb)
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
  v_home jsonb := app.exam_varr(v_content -> 'home');
  v_home_r double precision;
  v_home_c double precision;
  v_blocked_raw jsonb := coalesce(nullif(v_content -> 'blocked', 'null'::jsonb), '[]'::jsonb);
  v_landmarks jsonb := app.exam_varr(v_content -> 'landmarks');
  v_landmark_keys text[] := '{}'::text[];
  v_landmark_at jsonb := '{}'::jsonb;
  v_blocked jsonb := '{}'::jsonb;
  v_visited jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_r double precision;
  v_c double precision;
  v_at_r double precision;
  v_at_c double precision;
  v_moves double precision := 0;
  v_actions jsonb := app.exam_varr(p_response -> 'actions');
  v_kind text;
  v_to jsonb;
  v_to_r double precision;
  v_to_c double precision;
  v_trail jsonb;
  v_end jsonb;
  v_cost jsonb;
  v_text text;
  v_solved boolean;
  v_metrics jsonb := '{}'::jsonb;
  v_optimum double precision;
  v_view double precision;
  v_key text;
begin
  v_rows := app.exam_vint(v_grid -> 'R');
  v_cols := app.exam_vint(v_grid -> 'C');
  if v_rows is null or v_cols is null or v_rows < 1 or v_cols < 1 then
    return jsonb_build_object('correct', false);
  end if;
  if v_home is null or jsonb_array_length(v_home) < 2 then
    return jsonb_build_object('correct', false);
  end if;
  v_home_r := app.exam_vint(v_home -> 0);
  v_home_c := app.exam_vint(v_home -> 1);
  if v_home_r is null or v_home_c is null then
    return jsonb_build_object('correct', false);
  end if;
  if app.exam_varr(v_blocked_raw) is null
    or v_landmarks is null or jsonb_array_length(v_landmarks) = 0
  then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_landmarks) as e loop
    v_r := app.exam_vint(app.exam_vobj(v_entry) -> 'r');
    v_c := app.exam_vint(app.exam_vobj(v_entry) -> 'c');
    if v_r is null or v_c is null then
      return jsonb_build_object('correct', false);
    end if;
    v_landmark_keys := v_landmark_keys
      || (app.exam_vjsstring(to_jsonb(v_r)) || ',' || app.exam_vjsstring(to_jsonb(v_c)));
    v_text := app.exam_vstr(app.exam_vobj(v_entry) -> 'id');
    if v_text is not null then
      v_landmark_at := v_landmark_at
        || jsonb_build_object(v_text, jsonb_build_array(to_jsonb(v_r), to_jsonb(v_c)));
    end if;
  end loop;

  for v_entry in select e from jsonb_array_elements(v_blocked_raw) as e loop
    if app.exam_varr(v_entry) is null or jsonb_array_length(v_entry) < 2
      or app.exam_vint(v_entry -> 0) is null or app.exam_vint(v_entry -> 1) is null
    then
      return jsonb_build_object('correct', false);
    end if;
    v_blocked := v_blocked || jsonb_build_object(
      app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 0))) || ','
      || app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 1))), true
    );
  end loop;

  v_at_r := v_home_r;
  v_at_c := v_home_c;
  v_visited := jsonb_build_object(
    app.exam_vjsstring(to_jsonb(v_home_r)) || ',' || app.exam_vjsstring(to_jsonb(v_home_c)), true
  );

  if v_actions is not null then
    for v_entry in select e from jsonb_array_elements(v_actions) as e loop
      if app.exam_vobj(v_entry) is null then
        return jsonb_build_object('correct', false);
      end if;
      v_kind := app.exam_vstr(v_entry -> 'kind');
      -- Blocked tries and pointings are logged but are not moves.
      if v_kind is null
        or not (v_kind = any (array['move', 'landmark_found', 'shortcut_move']))
      then
        continue;
      end if;
      v_to := case
        when app.exam_varr(v_entry -> 'to') is not null
          and jsonb_array_length(v_entry -> 'to') >= 2
          and app.exam_vint(v_entry -> 'to' -> 0) is not null
          and app.exam_vint(v_entry -> 'to' -> 1) is not null
        then v_entry -> 'to'
        when app.exam_varr(v_entry -> 'cell') is not null
          and jsonb_array_length(v_entry -> 'cell') >= 2
          and app.exam_vint(v_entry -> 'cell' -> 0) is not null
          and app.exam_vint(v_entry -> 'cell' -> 1) is not null
        then v_entry -> 'cell'
      end;
      if v_to is null then
        return jsonb_build_object('correct', false);
      end if;
      v_to_r := app.exam_vint(v_to -> 0);
      v_to_c := app.exam_vint(v_to -> 1);
      if v_to_r < 0 or v_to_r >= v_rows or v_to_c < 0 or v_to_c >= v_cols then
        return jsonb_build_object('correct', false);
      end if;
      v_key := app.exam_vjsstring(to_jsonb(v_to_r)) || ',' || app.exam_vjsstring(to_jsonb(v_to_c));
      if v_blocked ? v_key then
        return jsonb_build_object('correct', false);
      end if;
      if abs(v_to_r - v_at_r) + abs(v_to_c - v_at_c) <> 1 then
        return jsonb_build_object('correct', false);
      end if;
      v_at_r := v_to_r;
      v_at_c := v_to_c;
      v_visited := v_visited || jsonb_build_object(v_key, true);
      v_moves := v_moves + 1;
    end loop;
  else
    -- No action log: fall back to the reported trail, still re-deriving the verdict from
    -- cells rather than from the renderer's own booleans.
    v_trail := app.exam_varr(p_response -> 'cellsVisited');
    v_end := app.exam_varr(p_response -> 'endCell');
    if v_trail is null or v_end is null or jsonb_array_length(v_end) < 2
      or app.exam_vint(v_end -> 0) is null or app.exam_vint(v_end -> 1) is null
    then
      return jsonb_build_object('correct', false);
    end if;
    for v_entry in select e from jsonb_array_elements(v_trail) as e loop
      v_text := app.exam_vstr(v_entry);
      if v_text is null then
        if app.exam_varr(v_entry) is not null and jsonb_array_length(v_entry) >= 2
          and app.exam_vint(v_entry -> 0) is not null
          and app.exam_vint(v_entry -> 1) is not null
        then
          v_text := app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 0))) || ','
            || app.exam_vjsstring(to_jsonb(app.exam_vint(v_entry -> 1)));
        else
          return jsonb_build_object('correct', false);
        end if;
      end if;
      v_visited := v_visited || jsonb_build_object(v_text, true);
    end loop;
    v_at_r := app.exam_vint(v_end -> 0);
    v_at_c := app.exam_vint(v_end -> 1);
    -- PRESERVED DEFECT: the move count comes from the CLIENT-reported cost here.
    v_cost := app.exam_vobj(p_response -> 'cost');
    v_moves := case
      when v_cost is not null then coalesce(app.exam_vint(v_cost -> 'actual'), 0)
      else 0
    end;
  end if;

  v_solved := not exists (
    select 1 from unnest(v_landmark_keys) as k where not (v_visited ? k)
  ) and v_at_r = v_home_r and v_at_c = v_home_c;

  v_optimum := app.exam_vint(p_item -> 'answer' -> 'optimalTotalMoves');
  if v_optimum is not null and v_optimum > 0 then
    v_metrics := v_metrics || jsonb_build_object(
      'M-EFF', v_optimum / greatest(v_moves, v_optimum)
    );
  end if;
  v_view := app.exam_vexplore_pointing_error(p_response -> 'pointings', v_landmark_at);
  if v_view is not null then
    v_metrics := v_metrics || jsonb_build_object('M-VIEWANG', v_view);
  end if;

  if (select count(*) from jsonb_object_keys(v_metrics)) > 0 then
    return jsonb_build_object('correct', v_solved, 'metrics', v_metrics);
  end if;
  return jsonb_build_object('correct', v_solved);
end
$$;

comment on function app.exam_verify_explore(jsonb, jsonb) is
  'GB-EXPLORE-01; port of verifyExplore (verifiers/quantitative.ts). Replays response.actions '
  'cell by cell and requires every landmark to be stood on and the walk to finish at home. '
  'Preserves the reported defect that the no-action-log fallback takes its move count from the '
  'client-reported response.cost.actual (inventory section 8.4); it feeds M-EFF only.';

reset role;

-- --- Grants: identical posture to the foundation's verifiers ------------------------
-- Every function is reachable only from api_executor. supabase/tests/123 assertion 5 treats a
-- NULL proacl as a violation, so a forgotten revoke fails the suite rather than shipping.

revoke execute on function app.exam_vcheck_signature(text)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_check_twice(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmatrix_parseint(text)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmatrix_normalize(text, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmatrix_uniq(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmatrix_induce(jsonb, integer, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vmatrix_tile(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_matrix_build(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_sense(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_wordforge(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_track(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vscene_order(double precision[], double precision[], double precision[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_scene(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_maze(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_robopath(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vexplore_pointing_error(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_explore(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vcheck_signature(text) to api_executor;
grant execute on function app.exam_verify_check_twice(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vmatrix_parseint(text) to api_executor;
grant execute on function app.exam_vmatrix_normalize(text, jsonb) to api_executor;
grant execute on function app.exam_vmatrix_uniq(jsonb) to api_executor;
grant execute on function app.exam_vmatrix_induce(jsonb, integer, boolean) to api_executor;
grant execute on function app.exam_vmatrix_tile(jsonb) to api_executor;
grant execute on function app.exam_verify_matrix_build(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_sense(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_wordforge(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_track(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vscene_order(double precision[], double precision[], double precision[])
  to api_executor;
grant execute on function app.exam_verify_scene(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_maze(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_robopath(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vexplore_pointing_error(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_explore(jsonb, jsonb) to api_executor;

-- --- Registry rows: one per ported type ---------------------------------------------
-- Additive by design (see the registry's own comment): another batch's migration adds its own
-- rows and the two can never conflict.

insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('CX-check-01', 'exam_verify_check_twice',
   'apps/web/src/lib/exam/verifiers/fluid.ts verifyCheckTwice'),
  ('FLU-MATRIXBUILD-01', 'exam_verify_matrix_build',
   'apps/web/src/lib/exam/verifiers/fluid.ts verifyMatrixBuild'),
  ('VER-SENSE-01', 'exam_verify_sense',
   'apps/web/src/lib/exam/verifiers/verbal.ts verifySense'),
  ('GB-WORDFORGE-01', 'exam_verify_wordforge',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyWordforge'),
  ('GB-TRACK-01', 'exam_verify_track',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyTrack'),
  ('SPA-SCENE-01', 'exam_verify_scene',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyScene'),
  ('SPA-MAZE-01', 'exam_verify_maze',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyMaze'),
  ('GB-ROBOPATH-01', 'exam_verify_robopath',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyRobopath'),
  ('GB-EXPLORE-01', 'exam_verify_explore',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyExplore');
