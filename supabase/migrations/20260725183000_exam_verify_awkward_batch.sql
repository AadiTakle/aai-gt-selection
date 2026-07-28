-- Eight more per-type answer verifiers in plpgsql (serves R11; decision D-027).
--
-- WHAT THIS ADDS. The seven types the port inventory
-- (`docs/architecture/EXAM_VERIFIER_PORT_INVENTORY.md`) rates **awkward** and had not yet
-- reached — a program-space search, three response shells with a regression slope, a reverse
-- unfold, two orientation closures and two BFS floods — plus GB-WORDLADDER-01, which needed
-- the one input the database did not hold (§6 of that document).
--
--   FLU-GRIDCOPY-01   fluid_reasoning  op-grammar program search over |single|^2 programs
--   WM-gate-01        spatial          three running-memory shells + an OLS slope on k
--   SPA-PUNCH-01      spatial          reverse unfold through six crease cases
--   SPA-TANGRAM-01    spatial          quarter-turn orientation closure over 3-tuples
--   GB-SHAPEFIT-01    spatial          rotate/flip orientation closure + exact cover
--   SPA-PIPES-01      spatial          rotation legality + connectivity flood
--   GB-PATHFORGE-01   spatial          board legality + omnidirectional-port flood
--   GB-WORDLADDER-01  verbal           one-letter-change ladder over a curated child lexicon
--
-- Each is a FAITHFUL port of its TypeScript counterpart in
-- `apps/web/src/lib/exam/verifiers/`, including its early returns, the metrics it does and
-- does not emit, and its bugs. Nothing here renegotiates a verdict: where a TypeScript
-- verifier looks wrong it is reproduced and reported, never corrected. The one such bug in
-- this batch is marked `TS BUG (preserved)` at the point where it is reproduced.
--
-- THE LEXICON (evidence E-092). GB-WORDLADDER-01's TypeScript verifier decides whether a rung
-- is a real word by reading `research/exam-question-types/generators/lexicon-child-en.mjs` off
-- disk and regex-parsing 4,091 entries out of JavaScript source. That file is not `content`,
-- not `answer`, not `scoring` and not `provenance`, so it is not in `app.exam_item` and the
-- type could not be ported at all. It is not derivable from the bank either: `answer` records
-- one optimal ladder and a count of equally short ones, never the words a DIFFERENT legal
-- ladder may step through, and the rule being graded is exactly "is this rung a word". Under
-- D-027's authority the lexicon therefore moves INTO the database, as `app.exam_lexicon`:
-- server-only, revoked from every client role, RLS-forced and readable only by api_executor,
-- the same posture `app.exam_item.answer_key` has. Section 8 carries the seed and the guards
-- that keep it from drifting away from the source file silently.
--
-- SHARED MACHINERY. Section 1 adds primitives that are deliberately general rather than
-- private to this batch, because five other grid types are being ported in parallel:
-- `app.exam_vgrid_bfs_reach` is a multi-source breadth-first flood over a 4-connected grid
-- driven by an explicit per-edge passability array, which is enough to express a pipe
-- network, a tile road, a maze walk or an open-field walk without any of them knowing about
-- each other.
--
-- REVERSIBILITY. Purely additive: new functions, one table and eight rows in
-- `app.exam_verifier_registry`. Deleting the registry rows returns each type to the generic
-- chain exactly as it behaved before this migration; nothing existing is altered.
--
-- STABLE, NOT IMMUTABLE. Every function here builds its result with `jsonb_build_object`,
-- which Postgres marks stable, and the ladder verifier reads a table. `supabase db lint`
-- reports the mismatch if these claim IMMUTABLE, and claiming it over a stable callee is the
-- sort of thing that goes wrong quietly later.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false).

set role app_owner;

-- ===================================================================================
-- 1. Shared primitives
--
-- Readers the foundation migration did not need, plus the grid flood. Named and shaped for
-- reuse: the flood in particular is written for any 4-connected grid traversal, not for pipes
-- specifically, because SPA-MAZE-01, GB-ROBOPATH-01 and GB-EXPLORE-01 are the same machinery
-- with a different passability rule.
-- ===================================================================================

-- JavaScript `??`. A jsonb reader must distinguish an absent key (SQL NULL) from a JSON null,
-- and `coalesce` alone only catches the first; several verifiers below default one and not
-- the other, and the difference decides a verdict.
create function app.exam_vnullish(p_value jsonb, p_default jsonb)
returns jsonb
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_value is null or jsonb_typeof(p_value) = 'null' then p_default else p_value
  end
$$;

-- TS `pair()`: an [a, b] of finite numbers, else null. A longer array is tolerated, as in TS.
create function app.exam_vpair(p_value jsonb)
returns double precision[]
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when app.exam_varr(p_value) is null then null
    when jsonb_array_length(p_value) < 2 then null
    when app.exam_vnum(p_value -> 0) is null or app.exam_vnum(p_value -> 1) is null then null
    else array[app.exam_vnum(p_value -> 0), app.exam_vnum(p_value -> 1)]
  end
$$;

-- TS `triple()`: an [a, b, c] of finite numbers, else null.
create function app.exam_vtriple(p_value jsonb)
returns double precision[]
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when app.exam_varr(p_value) is null then null
    when jsonb_array_length(p_value) < 3 then null
    when app.exam_vnum(p_value -> 0) is null
      or app.exam_vnum(p_value -> 1) is null
      or app.exam_vnum(p_value -> 2) is null then null
    else array[
      app.exam_vnum(p_value -> 0), app.exam_vnum(p_value -> 1), app.exam_vnum(p_value -> 2)
    ]
  end
$$;

-- TS `cell()` in verifiers/quantitative.ts: an [r, c] of INTEGERS, else null.
create function app.exam_vcell(p_value jsonb)
returns double precision[]
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when app.exam_varr(p_value) is null then null
    when jsonb_array_length(p_value) < 2 then null
    when app.exam_vint(p_value -> 0) is null or app.exam_vint(p_value -> 1) is null then null
    else array[app.exam_vint(p_value -> 0), app.exam_vint(p_value -> 1)]
  end
$$;

-- The `${r},${c}` string the TypeScript verifiers use as a map or set key. Built through the
-- JavaScript number formatter so a fractional coordinate keys identically on both sides;
-- `String(-0)` is '0', and Postgres's jsonb output agrees.
create function app.exam_vcell_key(p_r double precision, p_c double precision)
returns text
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select app.exam_vjsstring(to_jsonb(p_r)) || ',' || app.exam_vjsstring(to_jsonb(p_c))
$$;

-- 1-based flat index of (r, c) in a p_rows x p_cols grid; null when the cell is off the board
-- or is not an integer position. The convention every grid function below shares.
create function app.exam_vgrid_cell_index(
  p_rows integer, p_cols integer, p_r double precision, p_c double precision
)
returns integer
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_rows is null or p_cols is null or p_r is null or p_c is null then null
    when p_r <> trunc(p_r) or p_c <> trunc(p_c) then null
    when p_r < 0 or p_r >= p_rows or p_c < 0 or p_c >= p_cols then null
    else (p_r::integer * p_cols + p_c::integer) + 1
  end
$$;

-- A single-source seed for the flood below: all false but the one cell, or all false when
-- that cell is off the board.
create function app.exam_vgrid_seed(
  p_rows integer, p_cols integer, p_r double precision, p_c double precision
)
returns boolean[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_seed boolean[];
  v_index integer;
begin
  if p_rows is null or p_cols is null or p_rows < 1 or p_cols < 1 then
    return null;
  end if;
  v_seed := array_fill(false, array[p_rows * p_cols]);
  v_index := app.exam_vgrid_cell_index(p_rows, p_cols, p_r, p_c);
  if v_index is not null then
    v_seed[v_index] := true;
  end if;
  return v_seed;
end
$$;

-- Breadth-first flood over a 4-connected grid.
--
--   p_seed      length rows*cols, true for every cell the flood starts from. Multi-source so
--               a caller whose true origin is off the board (GB-PATHFORGE-01's hut can be,
--               and its TypeScript verifier still spreads from it) can seed the first ring
--               itself instead of the traversal having to special-case it.
--   p_passable  length rows*cols*4, indexed ((r*cols + c) * 4 + d) + 1 with
--               d = 0 N, 1 E, 2 S, 3 W. True iff a walker standing on (r, c) may move in
--               direction d. The CALLER owns that rule — matching pipe arms, an open maze
--               edge, an unblocked neighbour — so this function has no idea what kind of grid
--               it is walking.
--
-- Returns length rows*cols, true for every reachable cell. The result is a set, so expansion
-- order cannot affect it; the frontier is an array with a moving head, which is the same work
-- queue the TypeScript verifiers use.
create function app.exam_vgrid_bfs_reach(
  p_rows integer, p_cols integer, p_seed boolean[], p_passable boolean[]
)
returns boolean[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_reached boolean[];
  v_queue integer[] := '{}'::integer[];
  v_head integer := 1;
  v_cell integer;
  v_next integer;
  v_r integer;
  v_c integer;
  v_nr integer;
  v_nc integer;
begin
  if p_rows is null or p_cols is null or p_rows < 1 or p_cols < 1 then
    return null;
  end if;
  v_reached := array_fill(false, array[p_rows * p_cols]);
  for i in 1 .. p_rows * p_cols loop
    if coalesce(p_seed[i], false) then
      v_reached[i] := true;
      v_queue := v_queue || i;
    end if;
  end loop;

  while v_head <= coalesce(array_length(v_queue, 1), 0) loop
    v_cell := v_queue[v_head];
    v_head := v_head + 1;
    v_r := (v_cell - 1) / p_cols;
    v_c := (v_cell - 1) % p_cols;
    for d in 0 .. 3 loop
      if not coalesce(p_passable[(v_cell - 1) * 4 + d + 1], false) then
        continue;
      end if;
      v_nr := v_r + case d when 0 then -1 when 2 then 1 else 0 end;
      v_nc := v_c + case d when 1 then 1 when 3 then -1 else 0 end;
      if v_nr < 0 or v_nr >= p_rows or v_nc < 0 or v_nc >= p_cols then
        continue;
      end if;
      v_next := v_nr * p_cols + v_nc + 1;
      if v_reached[v_next] then
        continue;
      end if;
      v_reached[v_next] := true;
      v_queue := v_queue || v_next;
    end loop;
  end loop;
  return v_reached;
end
$$;

comment on function app.exam_vgrid_bfs_reach(integer, integer, boolean[], boolean[]) is
  'Multi-source breadth-first flood over a 4-connected grid. The caller supplies passability '
  'per (cell, direction) with d = 0 N, 1 E, 2 S, 3 W, so one traversal serves a pipe network, '
  'a tile road, a maze walk or an open-field walk. Returns the reachable-cell mask.';

-- `efficiency()` from verifiers/spatial.ts: clamp01(optimal / used), with used <= 0 treated
-- as "nothing spent" rather than as a division. NOT the same function as the quantitative one
-- below, and the difference is visible in M-EFF, so both exist.
create function app.exam_veff_spatial(p_optimal double precision, p_used double precision)
returns double precision
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_optimal is null or p_used is null then null
    when p_used <= 0 then
      case when p_optimal <= 0 then 1::double precision else 0::double precision end
    -- TS clamp01() maps a non-finite ratio to 0, which greatest/least alone would not.
    when (p_optimal / p_used) in ('Infinity'::double precision, '-Infinity'::double precision)
      then 0::double precision
    else greatest(0::double precision, least(1::double precision, p_optimal / p_used))
  end
$$;

-- `efficiency()` from verifiers/quantitative.ts: optimum / max(actual, optimum), and null —
-- so the metric is OMITTED — rather than 0 when there is no optimum to compare against.
create function app.exam_veff_quant(p_optimum double precision, p_actual double precision)
returns double precision
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when p_optimum is null or p_actual is null or p_optimum <= 0 then null
    else p_optimum / greatest(p_actual, p_optimum)
  end
$$;

-- ===================================================================================
-- 2. SPA-PIPES-01 — rotate the tiles until the road connects
--
-- Port of verifyPipes (verifiers/spatial.ts). Every submitted tile must be a genuine rotation
-- of the tile the child was served — a wiring the tray cannot produce is rejected — and then
-- the road must actually carry from the car to the flag through every gem.
-- `answer.optimalRot` is one solution among several, so it grades M-EFF, not correctness.
-- ===================================================================================

-- TS `pipeArms()`: the distinct compass arms, ordered N, E, S, W. Null when the list holds
-- anything that is not one of the four.
create function app.exam_vpipe_arms(p_value jsonb)
returns text[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_arr jsonb := app.exam_varr(p_value);
  v_entry jsonb;
  v_dir text;
  v_seen text[] := '{}'::text[];
  v_out text[];
begin
  if v_arr is null then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(v_arr) as e loop
    v_dir := app.exam_vstr(v_entry);
    if v_dir is null or v_dir not in ('N', 'E', 'S', 'W') then
      return null;
    end if;
    if not (v_dir = any (v_seen)) then
      v_seen := v_seen || v_dir;
    end if;
  end loop;
  select coalesce(array_agg(d order by array_position(array['N', 'E', 'S', 'W'], d)), '{}'::text[])
    into v_out
  from unnest(v_seen) as d;
  return v_out;
end
$$;

-- TS `quarterTurnsBetween()`: how many clockwise quarter turns take `p_from` to `p_to`, or
-- null when `p_to` is not a rotation of `p_from` at all.
create function app.exam_vpipe_quarter_turns(p_from text[], p_to text[])
returns integer
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_current text[] := p_from;
  v_sorted text[];
begin
  if p_from is null or p_to is null then
    return null;
  end if;
  for k in 0 .. 3 loop
    select coalesce(array_agg(d order by array_position(array['N', 'E', 'S', 'W'], d)), '{}'::text[])
      into v_sorted
    from unnest(v_current) as d;
    if v_sorted = p_to then
      return k;
    end if;
    select coalesce(
        array_agg(case d when 'N' then 'E' when 'E' then 'S' when 'S' then 'W' else 'N' end),
        '{}'::text[]
      )
      into v_current
    from unnest(v_current) as d;
  end loop;
  return null;
end
$$;

create function app.exam_verify_pipes(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_grid jsonb := app.exam_vobj(v_content -> 'grid');
  v_tiles jsonb := app.exam_varr(v_content -> 'tiles');
  v_start double precision[] := app.exam_vpair(v_content -> 'start');
  v_goal double precision[] := app.exam_vpair(v_content -> 'goal');
  v_gems jsonb := coalesce(app.exam_varr(v_content -> 'gems'), '[]'::jsonb);
  v_rows_f double precision;
  v_cols_f double precision;
  v_rows integer;
  v_cols integer;
  v_entry jsonb;
  v_r double precision;
  v_c double precision;
  v_key text;
  v_arms text[];
  v_base text[];
  v_turns integer;
  v_served jsonb := '{}'::jsonb;
  v_wiring jsonb := '{}'::jsonb;
  v_submitted jsonb;
  v_rotations double precision := 0;
  v_eff double precision;
  v_metrics jsonb;
  v_here text[];
  v_there text[];
  v_passable boolean[];
  v_reached boolean[];
  v_index integer;
  v_nindex integer;
  v_nr integer;
  v_nc integer;
  v_dir text;
  v_opp text;
  v_gem double precision[];
begin
  if v_grid is null or v_tiles is null or v_start is null or v_goal is null then
    return jsonb_build_object('correct', false);
  end if;
  v_rows_f := app.exam_vnum(v_grid -> 'R');
  v_cols_f := app.exam_vnum(v_grid -> 'C');
  if v_rows_f is null or v_cols_f is null then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_tiles) as e loop
    if app.exam_vobj(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_r := app.exam_vnum(v_entry -> 'r');
    v_c := app.exam_vnum(v_entry -> 'c');
    v_arms := app.exam_vpipe_arms(v_entry -> 'dirs');
    if v_r is null or v_c is null or v_arms is null then
      return jsonb_build_object('correct', false);
    end if;
    v_served := v_served || jsonb_build_object(app.exam_vcell_key(v_r, v_c), to_jsonb(v_arms));
  end loop;

  v_submitted := app.exam_varr(p_response -> 'finalOrients');
  if v_submitted is null then
    return jsonb_build_object('correct', false);
  end if;
  v_wiring := v_served;
  for v_entry in select e from jsonb_array_elements(v_submitted) as e loop
    if app.exam_vobj(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_r := app.exam_vnum(v_entry -> 'r');
    v_c := app.exam_vnum(v_entry -> 'c');
    v_arms := app.exam_vpipe_arms(v_entry -> 'dirs');
    if v_r is null or v_c is null or v_arms is null then
      return jsonb_build_object('correct', false);
    end if;
    v_key := app.exam_vcell_key(v_r, v_c);
    if v_served -> v_key is null then
      return jsonb_build_object('correct', false);
    end if;
    select coalesce(array_agg(app.exam_vstr(e) order by ord), '{}'::text[])
      into v_base
    from jsonb_array_elements(v_served -> v_key) with ordinality as t(e, ord);
    v_turns := app.exam_vpipe_quarter_turns(v_base, v_arms);
    if v_turns is null then
      return jsonb_build_object('correct', false);
    end if;
    v_rotations := v_rotations + v_turns;
    v_wiring := v_wiring || jsonb_build_object(v_key, to_jsonb(v_arms));
  end loop;

  v_eff := app.exam_veff_spatial(app.exam_vnum(p_item -> 'answer' -> 'optimalRot'), v_rotations);
  v_metrics := case
    when v_eff is null then '{}'::jsonb else jsonb_build_object('M-EFF', v_eff)
  end;

  -- TS BUG (preserved, inventory §8.5): verifyPipes hardcodes that the car enters from the
  -- WEST and the flag leaves to the EAST instead of reading the port directions off the item.
  -- Correct for every current bank item; it would silently fail a correct child if a future
  -- item placed the car or the flag anywhere else. Reproduced exactly, because D-027 ports
  -- verdicts and does not renegotiate them.
  if not coalesce(
    v_wiring -> app.exam_vcell_key(v_start[1], v_start[2]) @> '"W"'::jsonb, false
  ) then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;
  if not coalesce(
    v_wiring -> app.exam_vcell_key(v_goal[1], v_goal[2]) @> '"E"'::jsonb, false
  ) then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;

  -- The flood needs a rectangular integer board with the car and the flag on it. Every bank
  -- item is one, and the two checks above already required a SERVED TILE at each of them, so
  -- reaching this guard means the item's own geometry is malformed rather than the child's
  -- answer being wrong; there is no legal wiring to grade in that case.
  if v_rows_f <> trunc(v_rows_f) or v_cols_f <> trunc(v_cols_f)
    or v_rows_f < 1 or v_cols_f < 1 or v_rows_f > 4096 or v_cols_f > 4096
  then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;
  v_rows := v_rows_f::integer;
  v_cols := v_cols_f::integer;
  if app.exam_vgrid_cell_index(v_rows, v_cols, v_start[1], v_start[2]) is null
    or app.exam_vgrid_cell_index(v_rows, v_cols, v_goal[1], v_goal[2]) is null
  then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;

  -- Passability: both cells must present the arm that faces the other. Exactly the neighbour
  -- test the TypeScript BFS applies.
  v_passable := array_fill(false, array[v_rows * v_cols * 4]);
  for r in 0 .. v_rows - 1 loop
    for c in 0 .. v_cols - 1 loop
      v_index := r * v_cols + c + 1;
      select coalesce(array_agg(app.exam_vstr(e) order by ord), '{}'::text[])
        into v_here
      from jsonb_array_elements(
        coalesce(v_wiring -> app.exam_vcell_key(r, c), '[]'::jsonb)
      ) with ordinality as t(e, ord);
      if coalesce(array_length(v_here, 1), 0) = 0 then
        continue;
      end if;
      for d in 0 .. 3 loop
        v_dir := (array['N', 'E', 'S', 'W'])[d + 1];
        v_opp := (array['S', 'W', 'N', 'E'])[d + 1];
        if not (v_dir = any (v_here)) then
          continue;
        end if;
        v_nr := r + case d when 0 then -1 when 2 then 1 else 0 end;
        v_nc := c + case d when 1 then 1 when 3 then -1 else 0 end;
        v_nindex := app.exam_vgrid_cell_index(v_rows, v_cols, v_nr, v_nc);
        if v_nindex is null then
          continue;
        end if;
        select coalesce(array_agg(app.exam_vstr(e) order by ord), '{}'::text[])
          into v_there
        from jsonb_array_elements(
          coalesce(v_wiring -> app.exam_vcell_key(v_nr, v_nc), '[]'::jsonb)
        ) with ordinality as t(e, ord);
        if v_opp = any (v_there) then
          v_passable[(v_index - 1) * 4 + d + 1] := true;
        end if;
      end loop;
    end loop;
  end loop;

  v_reached := app.exam_vgrid_bfs_reach(
    v_rows, v_cols,
    app.exam_vgrid_seed(v_rows, v_cols, v_start[1], v_start[2]),
    v_passable
  );

  if not v_reached[app.exam_vgrid_cell_index(v_rows, v_cols, v_goal[1], v_goal[2])] then
    return jsonb_build_object('correct', false, 'metrics', v_metrics);
  end if;

  for v_entry in select e from jsonb_array_elements(v_gems) as e loop
    v_gem := app.exam_vpair(v_entry);
    if v_gem is null then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
    v_index := app.exam_vgrid_cell_index(v_rows, v_cols, v_gem[1], v_gem[2]);
    if not (
      (v_gem[1] = v_start[1] and v_gem[2] = v_start[2])
      or (v_index is not null and v_reached[v_index])
    ) then
      return jsonb_build_object('correct', false, 'metrics', v_metrics);
    end if;
  end loop;

  return jsonb_build_object('correct', true, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_pipes(jsonb, jsonb) is
  'SPA-PIPES-01; port of verifyPipes (verifiers/spatial.ts). Checks every submitted tile is a '
  'genuine rotation of the served tile, then floods from car to flag over matching arms. '
  'Reproduces the TypeScript verifier''s hardcoded W/E port directions (inventory §8.5).';

-- ===================================================================================
-- 3. GB-PATHFORGE-01 — flood the submitted board
--
-- Port of verifyPathforge (verifiers/quantitative.ts). Illegal boards are rejected outright
-- (a tile on a wall, on the hut, on the flag, or stacked on another tile), then the same
-- flood decides connectivity. The hut and the flag are omnidirectional ports: they join any
-- neighbour whose arm points at them, and a walker standing on one may leave in any
-- direction. `answer.optimalTiles` grades M-EFF only.
-- ===================================================================================

create function app.exam_verify_pathforge(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_grid jsonb := app.exam_vobj(v_content -> 'grid');
  v_rows integer;
  v_cols integer;
  v_start double precision[] := app.exam_vcell(v_content -> 'start');
  v_goal double precision[] := app.exam_vcell(v_content -> 'goal');
  v_blocked_raw jsonb := app.exam_vnullish(v_content -> 'blocked', '[]'::jsonb);
  v_coins_raw jsonb := app.exam_vnullish(v_content -> 'coins', '[]'::jsonb);
  v_budget double precision := app.exam_vint(v_content -> 'tileBudget');
  v_board jsonb;
  v_entry jsonb;
  v_cell double precision[];
  v_blocked boolean[];
  v_has_tile boolean[];
  v_arms boolean[];
  v_r double precision;
  v_c double precision;
  v_dirs jsonb;
  v_dir text;
  v_index integer;
  v_nindex integer;
  v_start_index integer;
  v_goal_index integer;
  v_passable boolean[];
  v_seed boolean[];
  v_reached boolean[];
  v_here boolean;
  v_there boolean;
  v_is_port boolean;
  v_n_is_port boolean;
  v_eff double precision;
  v_board_len integer;
begin
  if v_grid is null or v_start is null or v_goal is null then
    return jsonb_build_object('correct', false);
  end if;
  -- TS `gridOf()`: R and C must be integers and at least 1.
  if app.exam_vint(v_grid -> 'R') is null or app.exam_vint(v_grid -> 'C') is null
    or app.exam_vint(v_grid -> 'R') < 1 or app.exam_vint(v_grid -> 'C') < 1
    or app.exam_vint(v_grid -> 'R') > 4096 or app.exam_vint(v_grid -> 'C') > 4096
  then
    return jsonb_build_object('correct', false);
  end if;
  v_rows := app.exam_vint(v_grid -> 'R')::integer;
  v_cols := app.exam_vint(v_grid -> 'C')::integer;

  -- TS `cellList()` fails the whole verifier when any entry is not an integer [r, c].
  if app.exam_varr(v_blocked_raw) is null or app.exam_varr(v_coins_raw) is null then
    return jsonb_build_object('correct', false);
  end if;

  v_board := app.exam_varr(p_response -> 'finalBoard');
  if v_board is null then
    return jsonb_build_object('correct', false);
  end if;
  v_board_len := jsonb_array_length(v_board);
  if v_budget is not null and v_board_len > v_budget then
    return jsonb_build_object('correct', false);
  end if;

  v_blocked := array_fill(false, array[v_rows * v_cols]);
  for v_entry in select e from jsonb_array_elements(v_blocked_raw) as e loop
    v_cell := app.exam_vcell(v_entry);
    if v_cell is null then
      return jsonb_build_object('correct', false);
    end if;
    v_index := app.exam_vgrid_cell_index(v_rows, v_cols, v_cell[1], v_cell[2]);
    if v_index is not null then
      v_blocked[v_index] := true;
    end if;
  end loop;
  for v_entry in select e from jsonb_array_elements(v_coins_raw) as e loop
    if app.exam_vcell(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
  end loop;

  v_start_index := app.exam_vgrid_cell_index(v_rows, v_cols, v_start[1], v_start[2]);
  v_goal_index := app.exam_vgrid_cell_index(v_rows, v_cols, v_goal[1], v_goal[2]);

  -- Board legality. Every tile must be in bounds, off the walls and the two ports, and no two
  -- tiles may share a cell: an illegal board state, not an inefficient one.
  v_has_tile := array_fill(false, array[v_rows * v_cols]);
  v_arms := array_fill(false, array[v_rows * v_cols * 4]);
  for v_entry in select e from jsonb_array_elements(v_board) as e loop
    if app.exam_vobj(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_r := app.exam_vint(v_entry -> 'r');
    v_c := app.exam_vint(v_entry -> 'c');
    v_dirs := app.exam_varr(v_entry -> 'dirs');
    if v_r is null or v_c is null or v_dirs is null then
      return jsonb_build_object('correct', false);
    end if;
    v_index := app.exam_vgrid_cell_index(v_rows, v_cols, v_r, v_c);
    if v_index is null then
      return jsonb_build_object('correct', false);
    end if;
    if v_blocked[v_index] or v_index = v_start_index or v_index = v_goal_index
      or v_has_tile[v_index]
    then
      return jsonb_build_object('correct', false);
    end if;
    for v_dir in select app.exam_vstr(e) from jsonb_array_elements(v_dirs) as e loop
      if v_dir is null or v_dir not in ('N', 'E', 'S', 'W') then
        return jsonb_build_object('correct', false);
      end if;
      v_arms[(v_index - 1) * 4 + array_position(array['N', 'E', 'S', 'W'], v_dir)] := true;
    end loop;
    v_has_tile[v_index] := true;
  end loop;

  -- Flood. A port needs no arm of its own in either direction; a plain cell needs the arm
  -- that faces its neighbour, and the neighbour needs the arm facing back.
  v_passable := array_fill(false, array[v_rows * v_cols * 4]);
  for r in 0 .. v_rows - 1 loop
    for c in 0 .. v_cols - 1 loop
      v_index := r * v_cols + c + 1;
      v_is_port := v_index = v_start_index or v_index = v_goal_index;
      for d in 0 .. 3 loop
        v_nindex := app.exam_vgrid_cell_index(
          v_rows, v_cols,
          r + case d when 0 then -1 when 2 then 1 else 0 end,
          c + case d when 1 then 1 when 3 then -1 else 0 end
        );
        if v_nindex is null then
          continue;
        end if;
        v_here := v_arms[(v_index - 1) * 4 + d + 1];
        v_there := v_arms[(v_nindex - 1) * 4 + ((d + 2) % 4) + 1];
        v_n_is_port := v_nindex = v_start_index or v_nindex = v_goal_index;
        if (v_is_port or v_here) and (v_n_is_port or v_there) then
          v_passable[(v_index - 1) * 4 + d + 1] := true;
        end if;
      end loop;
    end loop;
  end loop;

  if v_start_index is not null then
    v_seed := app.exam_vgrid_seed(v_rows, v_cols, v_start[1], v_start[2]);
  else
    -- An off-board hut still spreads in the TypeScript verifier, because its own key makes it
    -- a port and only the NEIGHBOUR is bounds-checked. Seed that first ring by hand.
    v_seed := array_fill(false, array[v_rows * v_cols]);
    for d in 0 .. 3 loop
      v_nindex := app.exam_vgrid_cell_index(
        v_rows, v_cols,
        v_start[1] + case d when 0 then -1 when 2 then 1 else 0 end,
        v_start[2] + case d when 1 then 1 when 3 then -1 else 0 end
      );
      if v_nindex is null then
        continue;
      end if;
      if v_nindex = v_goal_index or v_arms[(v_nindex - 1) * 4 + ((d + 2) % 4) + 1] then
        v_seed[v_nindex] := true;
      end if;
    end loop;
  end if;
  v_reached := app.exam_vgrid_bfs_reach(v_rows, v_cols, v_seed, v_passable);

  v_eff := app.exam_veff_quant(
    app.exam_vint(p_item -> 'answer' -> 'optimalTiles'), v_board_len::double precision
  );

  if not (
    (v_goal[1] = v_start[1] and v_goal[2] = v_start[2])
    or (v_goal_index is not null and v_reached[v_goal_index])
  ) then
    return case
      when v_eff is null then jsonb_build_object('correct', false)
      else jsonb_build_object('correct', false, 'metrics', jsonb_build_object('M-EFF', v_eff))
    end;
  end if;

  for v_entry in select e from jsonb_array_elements(v_coins_raw) as e loop
    v_cell := app.exam_vcell(v_entry);
    v_index := app.exam_vgrid_cell_index(v_rows, v_cols, v_cell[1], v_cell[2]);
    if not (
      (v_cell[1] = v_start[1] and v_cell[2] = v_start[2])
      or (v_index is not null and v_reached[v_index])
    ) then
      return case
        when v_eff is null then jsonb_build_object('correct', false)
        else jsonb_build_object('correct', false, 'metrics', jsonb_build_object('M-EFF', v_eff))
      end;
    end if;
  end loop;

  return case
    when v_eff is null then jsonb_build_object('correct', true)
    else jsonb_build_object('correct', true, 'metrics', jsonb_build_object('M-EFF', v_eff))
  end;
end
$$;

comment on function app.exam_verify_pathforge(jsonb, jsonb) is
  'GB-PATHFORGE-01; port of verifyPathforge (verifiers/quantitative.ts). Rejects an illegal '
  'board, then floods from the hut through matching arms; the hut and the flag are '
  'omnidirectional ports. answer.optimalTiles grades M-EFF only, never correctness.';

-- ===================================================================================
-- 4. SPA-TANGRAM-01 and GB-SHAPEFIT-01 — the two orientation closures
--
-- Ported together because they are the same problem twice. TANGRAM works in 3-tuples
-- (layer, row, col) and affords only the quarter turn about the vertical axis; SHAPEFIT works
-- in (row, col) pairs and affords whatever `content.instructionSet.ops` says, which is rotate
-- and sometimes flip. Both normalise a shape to its minimum corner and compare by signature,
-- and both ship herring pieces, so "every piece used" is not the rule in either.
--
-- The two differ in one way that matters and is preserved: TANGRAM accumulates illegality in
-- a flag and still returns its metrics, whereas SHAPEFIT returns `{correct:false}` with NO
-- metrics the moment a placement is illegal.
-- ===================================================================================

-- TS `normalizeShape()`: shift to the minimum corner, then sort ascending by (l, r, c).
create function app.exam_vcell3_normalise(p_cells double precision[])
returns double precision[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n integer := coalesce(array_length(p_cells, 1), 0) / 3;
  v_ml double precision;
  v_mr double precision;
  v_mc double precision;
  v_out double precision[];
begin
  if v_n = 0 then
    return '{}'::double precision[];
  end if;
  select min(p_cells[3 * i + 1]), min(p_cells[3 * i + 2]), min(p_cells[3 * i + 3])
    into v_ml, v_mr, v_mc
  from generate_series(0, v_n - 1) as i;
  select coalesce(array_agg(u.v order by t.l, t.r, t.c, t.ord, u.slot), '{}'::double precision[])
    into v_out
  from (
    select
      p_cells[3 * i + 1] - v_ml as l,
      p_cells[3 * i + 2] - v_mr as r,
      p_cells[3 * i + 3] - v_mc as c,
      i as ord
    from generate_series(0, v_n - 1) as i
  ) t
  cross join lateral (values (1, t.l), (2, t.r), (3, t.c)) as u(slot, v);
  return v_out;
end
$$;

-- TS `shapeKey()`: the normalised cells, each rendered as JavaScript would, joined by '|'.
create function app.exam_vcell3_key(p_cells double precision[])
returns text
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_norm double precision[] := app.exam_vcell3_normalise(p_cells);
  v_n integer := coalesce(array_length(v_norm, 1), 0) / 3;
  v_out text;
begin
  select string_agg(
      app.exam_vjsstring(to_jsonb(v_norm[3 * i + 1])) || ','
        || app.exam_vjsstring(to_jsonb(v_norm[3 * i + 2])) || ','
        || app.exam_vjsstring(to_jsonb(v_norm[3 * i + 3])),
      '|' order by i
    )
    into v_out
  from generate_series(0, v_n - 1) as i;
  return coalesce(v_out, '');
end
$$;

-- TS `rotateShape()`: the quarter turn about the vertical axis, (l, r, c) -> (l, c, -r).
create function app.exam_vcell3_rotate(p_cells double precision[])
returns double precision[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n integer := coalesce(array_length(p_cells, 1), 0) / 3;
  v_turned double precision[] := '{}'::double precision[];
begin
  for i in 0 .. v_n - 1 loop
    v_turned := v_turned || p_cells[3 * i + 1] || p_cells[3 * i + 3] || (-p_cells[3 * i + 2]);
  end loop;
  return app.exam_vcell3_normalise(v_turned);
end
$$;

-- TS `rotationKeys()`: the four quarter turns of a tray shape, as signatures.
create function app.exam_vcell3_rotation_keys(p_cells double precision[])
returns text[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_current double precision[] := app.exam_vcell3_normalise(p_cells);
  v_keys text[] := '{}'::text[];
  v_key text;
begin
  for i in 1 .. 4 loop
    v_key := app.exam_vcell3_key(v_current);
    if not (v_key = any (v_keys)) then
      v_keys := v_keys || v_key;
    end if;
    v_current := app.exam_vcell3_rotate(v_current);
  end loop;
  return v_keys;
end
$$;

create function app.exam_verify_tangram(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_target jsonb := app.exam_vobj(v_content -> 'target');
  v_tray jsonb := app.exam_varr(v_content -> 'tray');
  v_placements jsonb := app.exam_varr(p_response -> 'placements');
  v_target_cells jsonb;
  v_entry jsonb;
  v_cell double precision[];
  v_target_set jsonb := '{}'::jsonb;
  v_target_size integer := 0;
  v_tray_shapes jsonb := '{}'::jsonb;
  v_id double precision;
  v_id_key text;
  v_offsets jsonb;
  v_shape double precision[];
  v_abs double precision[];
  v_covered jsonb := '{}'::jsonb;
  v_covered_size integer := 0;
  v_used jsonb := '{}'::jsonb;
  v_used_size integer := 0;
  v_legal boolean := true;
  v_key text;
  v_eff double precision;
  v_metrics jsonb;
  v_n integer;
begin
  if v_target is null or v_tray is null or v_placements is null then
    return jsonb_build_object('correct', false);
  end if;
  v_target_cells := app.exam_varr(v_target -> 'cells');
  if v_target_cells is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_target_cells) as e loop
    v_cell := app.exam_vtriple(v_entry);
    if v_cell is null then
      return jsonb_build_object('correct', false);
    end if;
    -- TS `cellKey()`, the RAW coordinates. Not `shapeKey()`: a shape signature is normalised
    -- to its own minimum corner, which is the right thing for comparing a piece against its
    -- tray shape and the wrong thing for locating a cell on the board.
    v_key := app.exam_vjsstring(to_jsonb(v_cell[1])) || ','
      || app.exam_vjsstring(to_jsonb(v_cell[2])) || ','
      || app.exam_vjsstring(to_jsonb(v_cell[3]));
    if v_target_set -> v_key is null then
      v_target_size := v_target_size + 1;
      v_target_set := v_target_set || jsonb_build_object(v_key, true);
    end if;
  end loop;

  for v_entry in select e from jsonb_array_elements(v_tray) as e loop
    if app.exam_vobj(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_id := app.exam_vnum(v_entry -> 'id');
    v_offsets := app.exam_varr(v_entry -> 'offsets');
    if v_id is null or v_offsets is null or jsonb_array_length(v_offsets) = 0 then
      return jsonb_build_object('correct', false);
    end if;
    v_shape := '{}'::double precision[];
    for v_cell in select app.exam_vtriple(e) from jsonb_array_elements(v_offsets) as e loop
      if v_cell is null then
        return jsonb_build_object('correct', false);
      end if;
      v_shape := v_shape || v_cell[1] || v_cell[2] || v_cell[3];
    end loop;
    v_tray_shapes := v_tray_shapes
      || jsonb_build_object(app.exam_vjsstring(to_jsonb(v_id)), to_jsonb(v_shape));
  end loop;

  for v_entry in select e from jsonb_array_elements(v_placements) as e loop
    if app.exam_vobj(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_id := app.exam_vnum(v_entry -> 'id');
    v_offsets := app.exam_varr(v_entry -> 'cells');
    if v_id is null or v_offsets is null or jsonb_array_length(v_offsets) = 0 then
      return jsonb_build_object('correct', false);
    end if;
    v_abs := '{}'::double precision[];
    for v_cell in select app.exam_vtriple(e) from jsonb_array_elements(v_offsets) as e loop
      if v_cell is null then
        return jsonb_build_object('correct', false);
      end if;
      v_abs := v_abs || v_cell[1] || v_cell[2] || v_cell[3];
    end loop;

    v_id_key := app.exam_vjsstring(to_jsonb(v_id));
    if v_tray_shapes -> v_id_key is null or v_used -> v_id_key is not null then
      v_legal := false;
    else
      select coalesce(array_agg(e::text::double precision order by ord), '{}'::double precision[])
        into v_shape
      from jsonb_array_elements(v_tray_shapes -> v_id_key) with ordinality as t(e, ord);
      if not (app.exam_vcell3_key(v_abs) = any (app.exam_vcell3_rotation_keys(v_shape))) then
        v_legal := false;
      end if;
    end if;
    if v_used -> v_id_key is null then
      v_used_size := v_used_size + 1;
      v_used := v_used || jsonb_build_object(v_id_key, true);
    end if;

    v_n := coalesce(array_length(v_abs, 1), 0) / 3;
    for i in 0 .. v_n - 1 loop
      v_key := app.exam_vjsstring(to_jsonb(v_abs[3 * i + 1])) || ','
        || app.exam_vjsstring(to_jsonb(v_abs[3 * i + 2])) || ','
        || app.exam_vjsstring(to_jsonb(v_abs[3 * i + 3]));
      if v_target_set -> v_key is null or v_covered -> v_key is not null then
        v_legal := false;
      else
        v_covered := v_covered || jsonb_build_object(v_key, true);
        v_covered_size := v_covered_size + 1;
      end if;
    end loop;
  end loop;

  v_eff := app.exam_veff_spatial(
    app.exam_vnum(p_item -> 'answer' -> 'optimalPlacements'), v_used_size::double precision
  );
  v_metrics := jsonb_build_object(
    'M-POLY',
    case
      when v_target_size > 0 then v_covered_size::double precision / v_target_size
      else 0::double precision
    end
  );
  if v_eff is not null then
    v_metrics := v_metrics || jsonb_build_object('M-EFF', v_eff);
  end if;

  return jsonb_build_object(
    'correct', v_legal and v_covered_size = v_target_size,
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_tangram(jsonb, jsonb) is
  'SPA-TANGRAM-01; port of verifyTangram (verifiers/spatial.ts). Every placement must be a '
  'quarter-turn rotation of its tray shape, inside the outline and overlapping nothing, and '
  'together they must cover the outline. The tray ships herrings, so "every piece used" is '
  'not the rule and answer.referenceSolution is one cover among several.';

-- TS `normalise()` in verifiers/quantitative.ts: (row, col) pairs, min corner, sort by (r, c).
create function app.exam_vpoly_normalise(p_cells integer[])
returns integer[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n integer := coalesce(array_length(p_cells, 1), 0) / 2;
  v_mr integer;
  v_mc integer;
  v_out integer[];
begin
  if v_n = 0 then
    return '{}'::integer[];
  end if;
  select min(p_cells[2 * i + 1]), min(p_cells[2 * i + 2])
    into v_mr, v_mc
  from generate_series(0, v_n - 1) as i;
  select coalesce(array_agg(u.v order by t.r, t.c, t.ord, u.slot), '{}'::integer[])
    into v_out
  from (
    select p_cells[2 * i + 1] - v_mr as r, p_cells[2 * i + 2] - v_mc as c, i as ord
    from generate_series(0, v_n - 1) as i
  ) t
  cross join lateral (values (1, t.r), (2, t.c)) as u(slot, v);
  return v_out;
end
$$;

-- TS `polySignature()`.
create function app.exam_vpoly_key(p_cells integer[])
returns text
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_norm integer[] := app.exam_vpoly_normalise(p_cells);
  v_n integer := coalesce(array_length(v_norm, 1), 0) / 2;
  v_out text;
begin
  select string_agg(v_norm[2 * i + 1] || ',' || v_norm[2 * i + 2], '|' order by i)
    into v_out
  from generate_series(0, v_n - 1) as i;
  return coalesce(v_out, '');
end
$$;

-- TS `rotateCW()`: (r, c) -> (c, -r). TS `mirror()`: (r, c) -> (r, -c).
create function app.exam_vpoly_transform(p_cells integer[], p_kind text)
returns integer[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n integer := coalesce(array_length(p_cells, 1), 0) / 2;
  v_out integer[] := '{}'::integer[];
begin
  for i in 0 .. v_n - 1 loop
    if p_kind = 'rotate' then
      v_out := v_out || p_cells[2 * i + 2] || (-p_cells[2 * i + 1]);
    else
      v_out := v_out || p_cells[2 * i + 1] || (-p_cells[2 * i + 2]);
    end if;
  end loop;
  return app.exam_vpoly_normalise(v_out);
end
$$;

-- TS `orientationSignatures()`: the closure of the base shape under whichever of rotate and
-- flip the ITEM'S OWN instruction set affords, as a breadth-first walk over signatures.
create function app.exam_vpoly_orientation_keys(p_cells integer[], p_ops text[])
returns text[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_seen text[] := array[app.exam_vpoly_key(p_cells)];
  v_frontier jsonb := jsonb_build_array(to_jsonb(app.exam_vpoly_normalise(p_cells)));
  v_head integer := 0;
  v_shape integer[];
  v_image integer[];
  v_kind text;
  v_key text;
begin
  while v_head < jsonb_array_length(v_frontier) loop
    select coalesce(array_agg(e::text::integer order by ord), '{}'::integer[])
      into v_shape
    from jsonb_array_elements(v_frontier -> v_head) with ordinality as t(e, ord);
    v_head := v_head + 1;
    foreach v_kind in array array['rotate', 'flip'] loop
      if not (v_kind = any (coalesce(p_ops, '{}'::text[]))) then
        continue;
      end if;
      v_image := app.exam_vpoly_transform(v_shape, v_kind);
      v_key := app.exam_vpoly_key(v_image);
      if v_key = any (v_seen) then
        continue;
      end if;
      v_seen := v_seen || v_key;
      v_frontier := v_frontier || jsonb_build_array(to_jsonb(v_image));
    end loop;
  end loop;
  return v_seen;
end
$$;

create function app.exam_verify_shapefit(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_target jsonb := app.exam_vobj(v_content -> 'target');
  v_target_cells jsonb;
  v_tray jsonb := app.exam_varr(v_content -> 'tray');
  v_instruction_set jsonb;
  v_ops_raw jsonb;
  v_ops text[] := '{}'::text[];
  v_entry jsonb;
  v_cell double precision[];
  v_outline jsonb := '{}'::jsonb;
  v_outline_size integer := 0;
  v_tray_pieces jsonb := '{}'::jsonb;
  v_piece integer[];
  v_placed integer[];
  v_id_key text;
  v_assembly jsonb;
  v_covered jsonb := '{}'::jsonb;
  v_covered_size integer := 0;
  v_used jsonb := '{}'::jsonb;
  v_key text;
  v_n integer;
  v_eff double precision;
  v_cells jsonb;
  v_op text;
begin
  if v_target is null then
    return jsonb_build_object('correct', false);
  end if;
  v_target_cells := app.exam_varr(v_target -> 'cells');
  if v_target_cells is null or jsonb_array_length(v_target_cells) = 0 or v_tray is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_target_cells) as e loop
    v_cell := app.exam_vcell(v_entry);
    if v_cell is null then
      return jsonb_build_object('correct', false);
    end if;
    v_key := app.exam_vcell_key(v_cell[1], v_cell[2]);
    if v_outline -> v_key is null then
      v_outline_size := v_outline_size + 1;
      v_outline := v_outline || jsonb_build_object(v_key, true);
    end if;
  end loop;

  -- TS: `for (const op of opsRaw ?? ['rotate'])`, so an item with no instruction set still
  -- affords the quarter turn, and a non-string op is dropped rather than rejected.
  v_instruction_set := app.exam_vobj(v_content -> 'instructionSet');
  v_ops_raw := case
    when v_instruction_set is null then null else app.exam_varr(v_instruction_set -> 'ops')
  end;
  if v_ops_raw is null then
    v_ops := array['rotate'];
  else
    for v_op in select app.exam_vstr(e) from jsonb_array_elements(v_ops_raw) as e loop
      if v_op is not null then
        v_ops := v_ops || v_op;
      end if;
    end loop;
  end if;

  for v_entry in select e from jsonb_array_elements(v_tray) as e loop
    if app.exam_vobj(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_cells := app.exam_varr(v_entry -> 'cells');
    if v_cells is null then
      return jsonb_build_object('correct', false);
    end if;
    v_piece := '{}'::integer[];
    for v_cell in select app.exam_vcell(e) from jsonb_array_elements(v_cells) as e loop
      if v_cell is null then
        return jsonb_build_object('correct', false);
      end if;
      v_piece := v_piece || v_cell[1]::integer || v_cell[2]::integer;
    end loop;
    -- TS keys the tray by `String(piece.id)`, so a missing id keys as 'undefined'.
    v_tray_pieces := v_tray_pieces || jsonb_build_object(
      coalesce(app.exam_vjsstring(v_entry -> 'id'), 'undefined'), to_jsonb(v_piece)
    );
  end loop;

  v_assembly := app.exam_varr(p_response -> 'assembly');
  if v_assembly is null then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_assembly) as e loop
    if app.exam_vobj(v_entry) is null then
      return jsonb_build_object('correct', false);
    end if;
    v_cells := app.exam_varr(v_entry -> 'cells');
    if v_cells is null or jsonb_array_length(v_cells) = 0 then
      return jsonb_build_object('correct', false);
    end if;
    v_placed := '{}'::integer[];
    for v_cell in select app.exam_vcell(e) from jsonb_array_elements(v_cells) as e loop
      if v_cell is null then
        return jsonb_build_object('correct', false);
      end if;
      v_placed := v_placed || v_cell[1]::integer || v_cell[2]::integer;
    end loop;

    v_id_key := coalesce(app.exam_vjsstring(v_entry -> 'id'), 'undefined');
    if v_tray_pieces -> v_id_key is null or v_used -> v_id_key is not null then
      return jsonb_build_object('correct', false);
    end if;
    v_used := v_used || jsonb_build_object(v_id_key, true);
    select coalesce(array_agg(e::text::integer order by ord), '{}'::integer[])
      into v_piece
    from jsonb_array_elements(v_tray_pieces -> v_id_key) with ordinality as t(e, ord);
    if coalesce(array_length(v_placed, 1), 0) <> coalesce(array_length(v_piece, 1), 0) then
      return jsonb_build_object('correct', false);
    end if;
    if not (
      app.exam_vpoly_key(v_placed) = any (app.exam_vpoly_orientation_keys(v_piece, v_ops))
    ) then
      return jsonb_build_object('correct', false);
    end if;

    v_n := coalesce(array_length(v_placed, 1), 0) / 2;
    for i in 0 .. v_n - 1 loop
      v_key := v_placed[2 * i + 1] || ',' || v_placed[2 * i + 2];
      if v_outline -> v_key is null or v_covered -> v_key is not null then
        return jsonb_build_object('correct', false);
      end if;
      v_covered := v_covered || jsonb_build_object(v_key, true);
      v_covered_size := v_covered_size + 1;
    end loop;
  end loop;

  v_eff := app.exam_veff_quant(
    app.exam_vint(app.exam_vobj(p_item -> 'answer' -> 'cost') -> 'moves'),
    app.exam_vint(app.exam_vobj(p_response -> 'cost') -> 'moves')
  );
  return case
    when v_eff is null then jsonb_build_object('correct', v_covered_size = v_outline_size)
    else jsonb_build_object(
      'correct', v_covered_size = v_outline_size,
      'metrics', jsonb_build_object('M-EFF', v_eff)
    )
  end;
end
$$;

comment on function app.exam_verify_shapefit(jsonb, jsonb) is
  'GB-SHAPEFIT-01; port of verifyShapefit (verifiers/quantitative.ts). Exact cover in which '
  'every placement must be a tray piece in an orientation the item''s own op set can reach, '
  'so a flip is legal only where content.instructionSet.ops says so. answer.cost.moves is the '
  'efficiency baseline, never the key: a clumsy but complete tiling is still correct.';

-- ===================================================================================
-- 5. SPA-PUNCH-01 — mark every hole the unfolded sheet will carry
--
-- Port of verifyPunch (verifiers/spatial.ts). The folds are replayed forwards to record each
-- crease and the bounding box it acted on, then walked BACKWARDS: at every crease each point
-- found so far contributes its mirror image, so the hole set grows one reflection per fold.
-- Six crease cases — two vertical, two horizontal and two oblique — and an oblique fold may
-- only ever be last, because it leaves the sheet non-rectangular.
-- ===================================================================================

-- TS `punchCreases()`: the crease list, or null when the fold sequence is not replayable.
-- Each crease records its position, its span, and the bounding box BEFORE it was made.
create function app.exam_vpunch_creases(p_n double precision, p_ops text[])
returns jsonb
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_x0 double precision := 0;
  v_y0 double precision := 0;
  v_x1 double precision := p_n - 1;
  v_y1 double precision := p_n - 1;
  v_creases jsonb := '[]'::jsonb;
  v_diagonal boolean := false;
  v_op text;
  v_w double precision;
  v_h double precision;
  v_p double precision;
begin
  foreach v_op in array coalesce(p_ops, '{}'::text[]) loop
    if v_diagonal then
      return null;
    end if;
    v_w := v_x1 - v_x0 + 1;
    v_h := v_y1 - v_y0 + 1;
    if v_op in ('L', 'R') then
      -- TS `w < 2 || w % 2`: an odd or fractional span cannot be halved onto itself.
      if v_w < 2 or v_w <> trunc(v_w) or (v_w::bigint % 2) <> 0 then
        return null;
      end if;
      v_p := v_x0 + v_w / 2;
      v_creases := v_creases || jsonb_build_array(jsonb_build_object(
        'op', v_op, 'p', v_p, 'm', v_w, 'x0', v_x0, 'y0', v_y0, 'x1', v_x1, 'y1', v_y1
      ));
      if v_op = 'L' then v_x0 := v_p; else v_x1 := v_p - 1; end if;
    elsif v_op in ('T', 'B') then
      if v_h < 2 or v_h <> trunc(v_h) or (v_h::bigint % 2) <> 0 then
        return null;
      end if;
      v_p := v_y0 + v_h / 2;
      v_creases := v_creases || jsonb_build_array(jsonb_build_object(
        'op', v_op, 'p', v_p, 'm', v_h, 'x0', v_x0, 'y0', v_y0, 'x1', v_x1, 'y1', v_y1
      ));
      if v_op = 'T' then v_y0 := v_p; else v_y1 := v_p - 1; end if;
    elsif v_op in ('D1', 'D2') then
      if v_w <> v_h or v_w < 2 then
        return null;
      end if;
      v_creases := v_creases || jsonb_build_array(jsonb_build_object(
        'op', v_op, 'p', 0, 'm', v_w, 'x0', v_x0, 'y0', v_y0, 'x1', v_x1, 'y1', v_y1
      ));
      v_diagonal := true;
    else
      return null;
    end if;
  end loop;
  return v_creases;
end
$$;

-- TS `reverseUnfoldPoint()`: walk the creases backwards, adding the mirror image of every
-- point already found. The additions of one crease are collected against a SNAPSHOT of the
-- set and merged afterwards, exactly as the TypeScript does.
create function app.exam_vpunch_unfold(p_creases jsonb, p_x double precision, p_y double precision)
returns jsonb
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_cells jsonb := jsonb_build_object(
    app.exam_vcell_key(p_x, p_y), jsonb_build_array(p_x, p_y)
  );
  v_added jsonb;
  v_crease jsonb;
  v_op text;
  v_p double precision;
  v_m double precision;
  v_x0 double precision;
  v_y0 double precision;
  v_x1 double precision;
  v_y1 double precision;
  v_point jsonb;
  v_x double precision;
  v_y double precision;
  v_mirror double precision;
  v_a double precision;
  v_b double precision;
  v_nx double precision;
  v_ny double precision;
begin
  for i in reverse jsonb_array_length(p_creases) - 1 .. 0 loop
    v_crease := p_creases -> i;
    v_op := v_crease ->> 'op';
    v_p := (v_crease ->> 'p')::double precision;
    v_m := (v_crease ->> 'm')::double precision;
    v_x0 := (v_crease ->> 'x0')::double precision;
    v_y0 := (v_crease ->> 'y0')::double precision;
    v_x1 := (v_crease ->> 'x1')::double precision;
    v_y1 := (v_crease ->> 'y1')::double precision;
    v_added := '{}'::jsonb;
    for v_point in select value from jsonb_each(v_cells) loop
      v_x := (v_point ->> 0)::double precision;
      v_y := (v_point ->> 1)::double precision;
      if v_op = 'L' then
        if v_x >= v_p then
          v_mirror := 2 * v_p - 1 - v_x;
          if v_mirror >= v_x0 and v_mirror < v_p then
            v_added := v_added || jsonb_build_object(
              app.exam_vcell_key(v_mirror, v_y), jsonb_build_array(v_mirror, v_y)
            );
          end if;
        end if;
      elsif v_op = 'R' then
        if v_x < v_p then
          v_mirror := 2 * v_p - 1 - v_x;
          if v_mirror <= v_x1 and v_mirror >= v_p then
            v_added := v_added || jsonb_build_object(
              app.exam_vcell_key(v_mirror, v_y), jsonb_build_array(v_mirror, v_y)
            );
          end if;
        end if;
      elsif v_op = 'T' then
        if v_y >= v_p then
          v_mirror := 2 * v_p - 1 - v_y;
          if v_mirror >= v_y0 and v_mirror < v_p then
            v_added := v_added || jsonb_build_object(
              app.exam_vcell_key(v_x, v_mirror), jsonb_build_array(v_x, v_mirror)
            );
          end if;
        end if;
      elsif v_op = 'B' then
        if v_y < v_p then
          v_mirror := 2 * v_p - 1 - v_y;
          if v_mirror <= v_y1 and v_mirror >= v_p then
            v_added := v_added || jsonb_build_object(
              app.exam_vcell_key(v_x, v_mirror), jsonb_build_array(v_x, v_mirror)
            );
          end if;
        end if;
      elsif v_op = 'D1' then
        v_a := v_x - v_x0;
        v_b := v_y - v_y0;
        if v_a <= v_b then
          v_nx := v_x0 + v_b;
          v_ny := v_y0 + v_a;
          if v_nx <> v_x or v_ny <> v_y then
            v_added := v_added || jsonb_build_object(
              app.exam_vcell_key(v_nx, v_ny), jsonb_build_array(v_nx, v_ny)
            );
          end if;
        end if;
      elsif v_op = 'D2' then
        v_a := v_x - v_x0;
        v_b := v_y - v_y0;
        if v_a + v_b <= v_m - 1 then
          v_nx := v_x0 + (v_m - 1 - v_b);
          v_ny := v_y0 + (v_m - 1 - v_a);
          if v_nx <> v_x or v_ny <> v_y then
            v_added := v_added || jsonb_build_object(
              app.exam_vcell_key(v_nx, v_ny), jsonb_build_array(v_nx, v_ny)
            );
          end if;
        end if;
      end if;
    end loop;
    v_cells := v_cells || v_added;
  end loop;
  return v_cells;
end
$$;

-- TS `punchedCells()`: the hole set, reverse-unfolded from the served folds and punches
-- alone. Null when the item is not replayable, which fails the verifier closed.
create function app.exam_vpunch_cells(p_content jsonb)
returns jsonb
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_grid jsonb := app.exam_vobj(p_content -> 'grid');
  v_folds jsonb := app.exam_varr(p_content -> 'folds');
  v_punches jsonb := app.exam_varr(p_content -> 'punches');
  v_n double precision;
  v_ops text[] := '{}'::text[];
  v_entry jsonb;
  v_op text;
  v_creases jsonb;
  v_holes jsonb := '{}'::jsonb;
  v_x double precision;
  v_y double precision;
begin
  if v_grid is null or v_folds is null or v_punches is null then
    return null;
  end if;
  v_n := app.exam_vnum(v_grid -> 'n');
  if v_n is null or v_n < 2 then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(v_folds) as e loop
    if app.exam_vobj(v_entry) is null then
      return null;
    end if;
    v_op := app.exam_vstr(v_entry -> 'op');
    if v_op is null then
      return null;
    end if;
    v_ops := v_ops || v_op;
  end loop;
  v_creases := app.exam_vpunch_creases(v_n, v_ops);
  if v_creases is null then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(v_punches) as e loop
    if app.exam_vobj(v_entry) is null then
      return null;
    end if;
    v_x := app.exam_vnum(v_entry -> 'x');
    v_y := app.exam_vnum(v_entry -> 'y');
    if v_x is null or v_y is null then
      return null;
    end if;
    v_holes := v_holes || app.exam_vpunch_unfold(v_creases, v_x, v_y);
  end loop;
  return v_holes;
end
$$;

create function app.exam_verify_punch(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_truth jsonb := app.exam_vpunch_cells(v_content);
  v_marked jsonb := app.exam_varr(p_response -> 'markedCells');
  v_entry jsonb;
  v_cell double precision[];
  v_got jsonb := '{}'::jsonb;
  v_got_size integer := 0;
  v_truth_size integer;
  v_hits integer := 0;
  v_union double precision;
  v_metrics jsonb;
  v_n double precision;
  v_mirrored boolean := false;
  v_image jsonb;
  v_image_size integer;
  v_point jsonb;
  v_x double precision;
  v_y double precision;
  v_key text;
  v_all_in boolean;
begin
  if v_truth is null or v_marked is null then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_marked) as e loop
    v_cell := app.exam_vpair(v_entry);
    if v_cell is null then
      return jsonb_build_object('correct', false);
    end if;
    v_key := app.exam_vcell_key(v_cell[1], v_cell[2]);
    if v_got -> v_key is null then
      v_got_size := v_got_size + 1;
      v_got := v_got || jsonb_build_object(v_key, true);
    end if;
  end loop;

  select count(*)::integer into v_truth_size from jsonb_object_keys(v_truth) as k;
  select count(*)::integer into v_hits
  from jsonb_object_keys(v_got) as k
  where v_truth -> k is not null;

  v_union := (v_truth_size + v_got_size - v_hits)::double precision;
  v_metrics := jsonb_build_object(
    'M-POLY',
    case when v_union > 0 then v_hits::double precision / v_union else 0::double precision end
  );

  -- The four reflections of a square sheet. M-MIRRORFA flags a marked set that is the WHOLE
  -- true pattern reflected — a chirality slip rather than a partial answer — which is why it
  -- also requires the overlap to fall short of the truth.
  v_n := app.exam_vnum(app.exam_vobj(v_content -> 'grid') -> 'n');
  if v_n is not null then
    for r in 1 .. 4 loop
      v_image := '{}'::jsonb;
      for v_point in select value from jsonb_each(v_truth) loop
        v_x := (v_point ->> 0)::double precision;
        v_y := (v_point ->> 1)::double precision;
        v_image := v_image || jsonb_build_object(
          case r
            when 1 then app.exam_vcell_key(v_n - 1 - v_x, v_y)
            when 2 then app.exam_vcell_key(v_x, v_n - 1 - v_y)
            when 3 then app.exam_vcell_key(v_y, v_x)
            else app.exam_vcell_key(v_n - 1 - v_y, v_n - 1 - v_x)
          end,
          true
        );
      end loop;
      select count(*)::integer into v_image_size from jsonb_object_keys(v_image) as k;
      if v_image_size <> v_got_size then
        continue;
      end if;
      select coalesce(bool_and(v_got -> k is not null), true)
        into v_all_in
      from jsonb_object_keys(v_image) as k;
      if v_all_in then
        v_mirrored := true;
        exit;
      end if;
    end loop;
    v_metrics := v_metrics || jsonb_build_object(
      'M-MIRRORFA', case when v_mirrored and v_hits <> v_truth_size then 1 else 0 end
    );
  end if;

  return jsonb_build_object(
    'correct', v_got_size = v_truth_size and v_hits = v_truth_size,
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_punch(jsonb, jsonb) is
  'SPA-PUNCH-01; port of verifyPunch (verifiers/spatial.ts). Replays the folds to record each '
  'crease, then walks them backwards mirroring every point found so far; the marked set must '
  'equal the resulting hole set exactly. M-POLY is the Jaccard overlap and M-MIRRORFA flags '
  'the whole pattern reflected.';

-- ===================================================================================
-- 6. WM-gate-01 — running memory with several checkpoints in one administration
--
-- Port of verifyGate (verifiers/verbal.ts, which owns the WM-* entries by file convention,
-- not by domain). The parade is replayed event by event and every checkpoint is answered from
-- scratch under one of three shells; each checkpoint is scored positionally and the units are
-- summed.
--
-- M-UPDATECOST is the OLS slope of per-checkpoint score on that checkpoint's k. Because k
-- varies WITHIN an item it is estimable from one administration, and because it can be
-- NEGATIVE the 4dp rounding has to be JavaScript's half-up-toward-+Infinity Math.round, which
-- Postgres's round() is not. app.exam_vround4 already does exactly that.
-- ===================================================================================

-- TS `olsSlope()`: null when there are fewer than two points or x has no spread, so the
-- caller OMITS the metric rather than reporting a flat slope it did not measure.
create function app.exam_vols_slope(p_xs double precision[], p_ys double precision[])
returns double precision
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_n integer := least(
    coalesce(array_length(p_xs, 1), 0), coalesce(array_length(p_ys, 1), 0)
  );
  v_sx double precision := 0;
  v_sy double precision := 0;
  v_mx double precision;
  v_my double precision;
  v_cov double precision := 0;
  v_varx double precision := 0;
  v_dx double precision;
begin
  if v_n < 2 then
    return null;
  end if;
  for i in 1 .. v_n loop
    v_sx := v_sx + p_xs[i];
    v_sy := v_sy + p_ys[i];
  end loop;
  v_mx := v_sx / v_n;
  v_my := v_sy / v_n;
  for i in 1 .. v_n loop
    v_dx := p_xs[i] - v_mx;
    v_cov := v_cov + v_dx * (p_ys[i] - v_my);
    v_varx := v_varx + v_dx * v_dx;
  end loop;
  if v_varx = 0 then
    return null;
  end if;
  return v_cov / v_varx;
end
$$;

-- TS `strArray()`: a list of strings, or null when ANY entry is not one — never a partial
-- list. Several of the decisions below turn on that difference.
create function app.exam_vstrarray(p_value jsonb)
returns text[]
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select case
    when app.exam_varr(p_value) is null then null
    when exists (
      select 1 from jsonb_array_elements(p_value) as e where jsonb_typeof(e) <> 'string'
    ) then null
    else coalesce(
      (
        select array_agg(e #>> '{}' order by ord)
        from jsonb_array_elements(p_value) with ordinality as t(e, ord)
      ),
      '{}'::text[]
    )
  end
$$;

-- TS `gateReplay()`: the checkpoint answers re-derived from the stream. Null when the stream
-- is unreadable, so the caller can fall back to the stored `answer.probes`.
create function app.exam_vgate_replay(p_item jsonb)
returns jsonb
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_shell text := app.exam_vstr(v_content -> 'shell');
  v_presentation jsonb := app.exam_vobj(v_content -> 'presentation');
  v_events jsonb;
  v_stops jsonb;
  v_response_phase jsonb;
  v_plan jsonb;
  v_asked jsonb := '{}'::jsonb;
  v_family_of jsonb := '{}'::jsonb;
  v_ordered jsonb;
  v_stop_at jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_probe_index double precision;
  v_families text[];
  v_key text;
  v_family text;
  v_after double precision;
  v_history jsonb := '[]'::jsonb;
  v_derived jsonb := '[]'::jsonb;
  v_total double precision := 0;
  v_value double precision;
  v_index double precision;
  v_stop jsonb;
  v_k double precision;
  v_expected text[];
  v_ok boolean;
  v_from integer;
  v_len integer;
  v_token text;
  v_found text;
begin
  if v_presentation is null then
    return null;
  end if;
  v_events := app.exam_varr(v_presentation -> 'events');
  v_stops := app.exam_varr(v_presentation -> 'probes');
  if v_shell is null or v_events is null or v_stops is null then
    return null;
  end if;

  v_response_phase := app.exam_vobj(v_content -> 'responsePhase');
  v_plan := case
    when v_response_phase is null then null else app.exam_varr(v_response_phase -> 'probePlan')
  end;
  for v_entry in select e from jsonb_array_elements(coalesce(v_plan, '[]'::jsonb)) as e loop
    if app.exam_vobj(v_entry) is null then
      continue;
    end if;
    v_probe_index := app.exam_vnum(v_entry -> 'probeIndex');
    v_families := app.exam_vstrarray(v_entry -> 'askedFamilies');
    if v_probe_index is not null and v_families is not null then
      v_asked := v_asked || jsonb_build_object(
        app.exam_vjsstring(to_jsonb(v_probe_index)), to_jsonb(v_families)
      );
    end if;
  end loop;

  for v_entry in
    select e
    from jsonb_array_elements(
      coalesce(app.exam_varr(v_content -> 'palette'), '[]'::jsonb)
    ) as e
  loop
    if app.exam_vobj(v_entry) is null then
      continue;
    end if;
    v_key := app.exam_vstr(v_entry -> 'key');
    v_family := app.exam_vstr(v_entry -> 'family');
    if v_key is not null and v_family is not null then
      v_family_of := v_family_of || jsonb_build_object(v_key, to_jsonb(v_family));
    end if;
  end loop;

  -- TS filters the stream to records, sorts by `index`, then compares the filtered length
  -- with the original: a stream carrying a non-object event is not replayable at all. The
  -- sort is stable, so events sharing an index keep their served order.
  if exists (
    select 1 from jsonb_array_elements(v_events) as e where app.exam_vobj(e) is null
  ) then
    return null;
  end if;
  select coalesce(jsonb_agg(e order by coalesce(app.exam_vnum(e -> 'index'), 0), ord), '[]'::jsonb)
    into v_ordered
  from jsonb_array_elements(v_events) with ordinality as t(e, ord);

  for v_entry in select e from jsonb_array_elements(v_stops) as e loop
    if app.exam_vobj(v_entry) is null then
      return null;
    end if;
    v_after := app.exam_vnum(v_entry -> 'afterEventIndex');
    if v_after is null then
      return null;
    end if;
    v_stop_at := v_stop_at || jsonb_build_object(app.exam_vjsstring(to_jsonb(v_after)), v_entry);
  end loop;

  for v_entry in select e from jsonb_array_elements(v_ordered) as e loop
    v_history := v_history || jsonb_build_array(v_entry);
    if v_shell = 'numeric_running' then
      v_value := app.exam_vnum(v_entry -> 'value');
      if v_value is null then
        return null;
      end if;
      v_total := case
        when app.exam_vstr(v_entry -> 'kind') = 'set' then v_value else v_total + v_value
      end;
    end if;
    v_index := app.exam_vnum(v_entry -> 'index');
    if v_index is null then
      return null;
    end if;
    v_stop := v_stop_at -> app.exam_vjsstring(to_jsonb(v_index));
    if v_stop is null then
      continue;
    end if;

    v_probe_index := app.exam_vnum(v_stop -> 'probeIndex');
    v_k := app.exam_vnum(v_stop -> 'k');
    if v_probe_index is null or v_k is null then
      return null;
    end if;

    v_expected := null;
    if v_shell = 'creature_lastk' then
      -- `history.slice(-k)` under ECMAScript's own rules: a positive k takes the last k
      -- (clamped at the start), k = 0 takes the WHOLE history rather than an empty window,
      -- and a negative k drops that many from the front.
      v_len := jsonb_array_length(v_history);
      v_from := case
        when trunc(v_k) > 0 then greatest(0, v_len - trunc(v_k))
        else least(-trunc(v_k), v_len)
      end;
      select coalesce(bool_and(app.exam_vstr(e -> 'tokenKey') is not null), true)
        into v_ok
      from jsonb_array_elements(v_history) with ordinality as t(e, ord)
      where ord > v_from;
      if v_ok then
        select coalesce(array_agg(app.exam_vstr(e -> 'tokenKey') order by ord), '{}'::text[])
          into v_expected
        from jsonb_array_elements(v_history) with ordinality as t(e, ord)
        where ord > v_from;
      end if;
    elsif v_shell = 'keep_track' then
      if v_asked -> app.exam_vjsstring(to_jsonb(v_probe_index)) is not null then
        v_families := app.exam_vstrarray(
          v_asked -> app.exam_vjsstring(to_jsonb(v_probe_index))
        );
        v_expected := '{}'::text[];
        foreach v_family in array v_families loop
          v_found := null;
          for i in reverse jsonb_array_length(v_history) - 1 .. 0 loop
            v_token := app.exam_vstr(v_history -> i -> 'tokenKey');
            if v_token is not null and (v_family_of -> v_token) = to_jsonb(v_family) then
              v_found := v_token;
              exit;
            end if;
          end loop;
          if v_found is null then
            v_expected := null;
            exit;
          end if;
          v_expected := v_expected || v_found;
        end loop;
      end if;
    elsif v_shell = 'numeric_running' then
      v_expected := array['v' || app.exam_vjsstring(to_jsonb(v_total))];
    end if;

    if v_expected is null then
      return null;
    end if;
    v_derived := v_derived || jsonb_build_array(jsonb_build_object(
      'probeIndex', v_probe_index, 'k', v_k, 'expectedKeys', to_jsonb(v_expected)
    ));
  end loop;

  return case when jsonb_array_length(v_derived) > 0 then v_derived end;
end
$$;

-- TS `gateStoredProbes()`: the stored checkpoint answers, used only when the stream cannot be
-- replayed.
create function app.exam_vgate_stored(p_item jsonb)
returns jsonb
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_stored jsonb := app.exam_varr(p_item -> 'answer' -> 'probes');
  v_entry jsonb;
  v_probe_index double precision;
  v_k double precision;
  v_keys text[];
  v_out jsonb := '[]'::jsonb;
begin
  if v_stored is null then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(v_stored) as e loop
    if app.exam_vobj(v_entry) is null then
      return null;
    end if;
    v_probe_index := app.exam_vnum(v_entry -> 'probeIndex');
    v_k := app.exam_vnum(v_entry -> 'k');
    v_keys := app.exam_vstrarray(v_entry -> 'expectedKeys');
    if v_probe_index is null or v_k is null or v_keys is null then
      return null;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'probeIndex', v_probe_index, 'k', v_k, 'expectedKeys', to_jsonb(v_keys)
    ));
  end loop;
  return case when jsonb_array_length(v_out) > 0 then v_out end;
end
$$;

create function app.exam_verify_gate(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_expected jsonb := coalesce(app.exam_vgate_replay(p_item), app.exam_vgate_stored(p_item));
  v_submitted jsonb := app.exam_varr(p_response -> 'probes');
  v_by_index jsonb := '{}'::jsonb;
  v_entry jsonb;
  v_probe_index double precision;
  v_keys text[];
  v_answered jsonb;
  v_expected_keys jsonb;
  v_units_total integer := 0;
  v_units_correct integer := 0;
  v_credited integer;
  v_complete boolean := true;
  v_ks double precision[] := '{}'::double precision[];
  v_scores double precision[] := '{}'::double precision[];
  v_metrics jsonb;
  v_slope double precision;
  v_len integer;
begin
  if v_expected is null or v_submitted is null then
    return jsonb_build_object('correct', false);
  end if;

  for v_entry in select e from jsonb_array_elements(v_submitted) as e loop
    if app.exam_vobj(v_entry) is null then
      continue;
    end if;
    v_probe_index := app.exam_vnum(v_entry -> 'probeIndex');
    v_keys := app.exam_vstrarray(v_entry -> 'keys');
    if v_probe_index is null or v_keys is null then
      continue;
    end if;
    v_by_index := v_by_index
      || jsonb_build_object(app.exam_vjsstring(to_jsonb(v_probe_index)), to_jsonb(v_keys));
  end loop;

  for v_entry in select e from jsonb_array_elements(v_expected) as e loop
    v_answered := coalesce(
      v_by_index -> app.exam_vjsstring(v_entry -> 'probeIndex'), '[]'::jsonb
    );
    v_expected_keys := v_entry -> 'expectedKeys';
    v_len := jsonb_array_length(v_expected_keys);
    v_credited := 0;
    for i in 0 .. v_len - 1 loop
      if (v_answered -> i) is not null and (v_answered -> i) = (v_expected_keys -> i) then
        v_credited := v_credited + 1;
      end if;
    end loop;
    v_units_total := v_units_total + v_len;
    v_units_correct := v_units_correct + v_credited;
    if jsonb_array_length(v_answered) <> v_len then
      v_complete := false;
    end if;
    v_ks := v_ks || app.exam_vnum(v_entry -> 'k');
    -- A checkpoint that asked for nothing would divide by zero here, which JavaScript answers
    -- with NaN and jsonb cannot hold at all. No bank item has one; the guard keeps a
    -- malformed item from aborting a submission, which is the contract every verifier owes.
    v_scores := v_scores || case
      when v_len > 0 then v_credited::double precision / v_len else 0::double precision
    end;
  end loop;
  if v_units_total = 0 then
    return jsonb_build_object('correct', false);
  end if;

  v_metrics := jsonb_build_object(
    'M-POLY', app.exam_vround4(v_units_correct::double precision / v_units_total)
  );
  v_slope := app.exam_vols_slope(v_ks, v_scores);
  if v_slope is not null then
    v_metrics := v_metrics || jsonb_build_object('M-UPDATECOST', app.exam_vround4(v_slope));
  end if;

  return jsonb_build_object(
    'correct', v_complete and v_units_correct = v_units_total,
    'metrics', v_metrics
  );
end
$$;

comment on function app.exam_verify_gate(jsonb, jsonb) is
  'WM-gate-01; port of verifyGate (verifiers/verbal.ts). Replays the parade and answers every '
  'checkpoint from scratch under one of three shells (last-k keys, most-recent-of-each-asked '
  'family, running total). M-UPDATECOST is the OLS slope of checkpoint score on k and is '
  'OMITTED, not zeroed, when k does not vary.';

-- ===================================================================================
-- 7. FLU-GRIDCOPY-01 — copy the demonstrated transform onto a probe grid
--
-- Port of verifyGridCopy (verifiers/fluid.ts). The key is not so much stored as SEARCHED FOR:
-- build the op grammar's whole program space, keep every program consistent with all the
-- worked examples, and when they all predict the same probe output, that output IS the key.
-- `answer.targetGrid` is only the fallback.
--
-- THE SEARCH, AND HOW IT IS BOUNDED. The space is every single op plus every ORDERED PAIR of
-- singles. For the bank's largest palette (3) that is 29 singles and so 29 + 841 = 870
-- programs, each of which the TypeScript re-runs from the original grid over every worked
-- example: up to 1,740 grid rewrites per example per response, on grids of up to 25 cells.
--
-- The port applies ONE change, and it is a memoisation rather than a heuristic: for a two-op
-- program [a, b] the first stage depends only on `a`, so `apply(a, input)` is computed once
-- per single op per example and reused for all 29 continuations. Every program in the space
-- is still tested against every example — nothing is skipped, ranked, or cut off early — so
-- the set of consistent programs, and therefore the derived target, is IDENTICAL by
-- construction: the ops are pure functions of the grid, so a cached first stage and a
-- recomputed one cannot differ. `app.exam_vgridcopy_target_unpruned` below is the literal,
-- un-memoised transcription, kept so the claim is checked rather than asserted;
-- `supabase/tests/124_exam_verify_awkward_batch.test.sql` holds the two together and
-- `pnpm exam:verify:diff --items=120` compares the memoised search against the TypeScript
-- original over every item in the bank.
--
-- Grids travel as a PACKED integer[]: at `p_offset` the row count, then the column count,
-- then the cells in row-major order. The offset lets a caller keep several grids end to end
-- in one array and hand any of them on without slicing. Postgres expands a plpgsql array
-- variable in place, so writing a cell is O(1) and a rewrite costs one pass.
-- ===================================================================================

-- TS `readGrid()`: a non-empty rectangle of non-negative integers, else null.
create function app.exam_vgridcopy_read(p_value jsonb)
returns integer[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_rows jsonb := app.exam_varr(p_value);
  v_row jsonb;
  v_cell double precision;
  v_cols integer := -1;
  v_row_len integer;
  v_out integer[] := '{}'::integer[];
  v_count integer := 0;
begin
  if v_rows is null or jsonb_array_length(v_rows) = 0 then
    return null;
  end if;
  for v_row in select e from jsonb_array_elements(v_rows) as e loop
    if app.exam_varr(v_row) is null or jsonb_array_length(v_row) = 0 then
      return null;
    end if;
    v_row_len := jsonb_array_length(v_row);
    for v_cell in select app.exam_vint(e) from jsonb_array_elements(v_row) as e loop
      if v_cell is null or v_cell < 0 then
        return null;
      end if;
      v_out := v_out || v_cell::integer;
    end loop;
    -- TS compares each row against the FIRST row's width only.
    if v_cols < 0 then
      v_cols := v_row_len;
    elsif v_row_len <> v_cols then
      return null;
    end if;
    v_count := v_count + 1;
  end loop;
  return array[v_count, v_cols] || v_out;
end
$$;

-- TS `serializeGrid()`: rows concatenated cell by cell, rows joined by '/'.
create function app.exam_vgridcopy_key(p_grid integer[], p_offset integer)
returns text
language sql
stable
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(string_agg(row_text, '/' order by r), '')
  from (
    select
      r,
      string_agg(
        p_grid[p_offset + 2 + r * p_grid[p_offset + 2] + c + 1]::text, '' order by c
      ) as row_text
    from generate_series(0, p_grid[p_offset + 1] - 1) as r,
         generate_series(0, p_grid[p_offset + 2] - 1) as c
    group by r
  ) t
$$;

-- TS `applyGridOp()`, over the same six-case grammar `gridProgramSpace()` enumerates:
--   1 shift(dx = p1, dy = p2) | 2 reflectH | 3 reflectV | 4 rot180
--   5 recolor(from = p1, to = p2) | 6 shiftColor(colour = p1, dx = p2, dy = p3)
create function app.exam_vgridcopy_apply(
  p_grid integer[], p_offset integer,
  p_kind integer, p_p1 integer, p_p2 integer, p_p3 integer
)
returns integer[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_rows integer := p_grid[p_offset + 1];
  v_cols integer := p_grid[p_offset + 2];
  v_base integer := p_offset + 2;
  v_next integer[];
  v_here integer;
  v_sr integer;
  v_sc integer;
  v_tr integer;
  v_tc integer;
begin
  v_next := array_fill(0, array[v_rows * v_cols]);
  for r in 0 .. v_rows - 1 loop
    for c in 0 .. v_cols - 1 loop
      v_here := p_grid[v_base + r * v_cols + c + 1];
      if p_kind = 1 then
        v_sr := r - p_p2;
        v_sc := c - p_p1;
        v_next[r * v_cols + c + 1] := case
          when v_sr >= 0 and v_sr < v_rows and v_sc >= 0 and v_sc < v_cols
            then p_grid[v_base + v_sr * v_cols + v_sc + 1]
          else 0
        end;
      elsif p_kind = 2 then
        v_next[r * v_cols + c + 1] := p_grid[v_base + r * v_cols + (v_cols - 1 - c) + 1];
      elsif p_kind = 3 then
        v_next[r * v_cols + c + 1] := p_grid[v_base + (v_rows - 1 - r) * v_cols + c + 1];
      elsif p_kind = 4 then
        v_next[r * v_cols + c + 1] :=
          p_grid[v_base + (v_rows - 1 - r) * v_cols + (v_cols - 1 - c) + 1];
      elsif p_kind = 5 then
        v_next[r * v_cols + c + 1] := case when v_here = p_p1 then p_p2 else v_here end;
      else
        -- The chosen colour leaves its cell here and is re-placed in the second pass.
        v_next[r * v_cols + c + 1] := case when v_here = p_p1 then 0 else v_here end;
      end if;
    end loop;
  end loop;
  if p_kind = 6 then
    for r in 0 .. v_rows - 1 loop
      for c in 0 .. v_cols - 1 loop
        if p_grid[v_base + r * v_cols + c + 1] <> p_p1 then
          continue;
        end if;
        v_tr := r + p_p3;
        v_tc := c + p_p2;
        if v_tr >= 0 and v_tr < v_rows and v_tc >= 0 and v_tc < v_cols then
          v_next[v_tr * v_cols + v_tc + 1] := p_p1;
        end if;
      end loop;
    end loop;
  end if;
  return array[v_rows, v_cols] || v_next;
end
$$;

-- TS `gridProgramSpace()`'s SINGLE ops, in the order it generates them, flattened four
-- integers per op (kind, p1, p2, p3). The ordered pairs are this list crossed with itself,
-- which each caller forms for itself.
create function app.exam_vgridcopy_singles(p_palette_size integer)
returns integer[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_out integer[] := '{}'::integer[];
  v_dx integer;
  v_dy integer;
  v_steps integer[] := array[1, 0, -1, 0, 0, 1, 0, -1];
begin
  foreach v_dx in array array[-1, 0, 1] loop
    foreach v_dy in array array[-1, 0, 1] loop
      if v_dx <> 0 or v_dy <> 0 then
        v_out := v_out || 1 || v_dx || v_dy || 0;
      end if;
    end loop;
  end loop;
  v_out := v_out || array[2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0];
  for a in 1 .. p_palette_size loop
    for b in 1 .. p_palette_size loop
      if a <> b then
        v_out := v_out || 5 || a || b || 0;
      end if;
    end loop;
  end loop;
  for colour in 1 .. p_palette_size loop
    for s in 0 .. 3 loop
      v_out := v_out || 6 || colour || v_steps[2 * s + 1] || v_steps[2 * s + 2];
    end loop;
  end loop;
  return v_out;
end
$$;

-- TS `deriveGridTarget()`, with the shared first stage of each two-op program memoised.
-- Returns the packed probe output every example-consistent program agrees on, or null when
-- the worked examples do not identify exactly one.
create function app.exam_vgridcopy_target(p_content jsonb)
returns integer[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_probe integer[] := app.exam_vgridcopy_read(p_content -> 'probeInput');
  v_raw_examples jsonb := app.exam_varr(p_content -> 'examples');
  v_palette double precision := app.exam_vint(p_content -> 'paletteSize');
  v_entry jsonb;
  v_inputs integer[] := '{}'::integer[];
  v_input_at integer[] := '{}'::integer[];
  v_want text[] := '{}'::text[];
  v_input integer[];
  v_output integer[];
  v_examples integer := 0;
  v_singles integer[];
  v_count integer;
  v_mids integer[];
  v_mid_at integer[];
  v_probe_mid integer[];
  v_stage integer[];
  v_consistent boolean;
  v_prediction integer[];
  v_key text;
  v_found_key text;
  v_found integer[];
begin
  if v_probe is null or v_raw_examples is null or jsonb_array_length(v_raw_examples) = 0
    or v_palette is null
  then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(v_raw_examples) as e loop
    v_input := app.exam_vgridcopy_read(app.exam_vobj(v_entry) -> 'input');
    v_output := app.exam_vgridcopy_read(app.exam_vobj(v_entry) -> 'output');
    if v_input is null or v_output is null then
      return null;
    end if;
    v_input_at := v_input_at || coalesce(array_length(v_inputs, 1), 0);
    v_inputs := v_inputs || v_input;
    v_want := v_want || app.exam_vgridcopy_key(v_output, 0);
    v_examples := v_examples + 1;
  end loop;

  v_singles := app.exam_vgridcopy_singles(greatest(0, least(v_palette, 64))::integer);
  v_count := coalesce(array_length(v_singles, 1), 0) / 4;

  -- The whole space, single ops first. `v_found_key` collects the DISTINCT predictions; the
  -- moment a second one appears the worked examples do not identify an answer.
  for a in 0 .. v_count - 1 loop
    v_consistent := true;
    for e in 0 .. v_examples - 1 loop
      v_stage := app.exam_vgridcopy_apply(
        v_inputs, v_input_at[e + 1],
        v_singles[4 * a + 1], v_singles[4 * a + 2], v_singles[4 * a + 3], v_singles[4 * a + 4]
      );
      if app.exam_vgridcopy_key(v_stage, 0) <> v_want[e + 1] then
        v_consistent := false;
        exit;
      end if;
    end loop;
    if v_consistent then
      v_prediction := app.exam_vgridcopy_apply(
        v_probe, 0,
        v_singles[4 * a + 1], v_singles[4 * a + 2], v_singles[4 * a + 3], v_singles[4 * a + 4]
      );
      v_key := app.exam_vgridcopy_key(v_prediction, 0);
      if v_found_key is null then
        v_found_key := v_key;
        v_found := v_prediction;
      elsif v_found_key <> v_key then
        return null;
      end if;
    end if;
  end loop;

  -- Every ordered pair. The first stage is computed once per outer op and reused across all
  -- of its continuations; that is the ONLY difference from the un-memoised transcription.
  for a in 0 .. v_count - 1 loop
    v_mids := '{}'::integer[];
    v_mid_at := '{}'::integer[];
    for e in 0 .. v_examples - 1 loop
      v_mid_at := v_mid_at || coalesce(array_length(v_mids, 1), 0);
      v_mids := v_mids || app.exam_vgridcopy_apply(
        v_inputs, v_input_at[e + 1],
        v_singles[4 * a + 1], v_singles[4 * a + 2], v_singles[4 * a + 3], v_singles[4 * a + 4]
      );
    end loop;
    v_probe_mid := app.exam_vgridcopy_apply(
      v_probe, 0,
      v_singles[4 * a + 1], v_singles[4 * a + 2], v_singles[4 * a + 3], v_singles[4 * a + 4]
    );

    for b in 0 .. v_count - 1 loop
      v_consistent := true;
      for e in 0 .. v_examples - 1 loop
        v_stage := app.exam_vgridcopy_apply(
          v_mids, v_mid_at[e + 1],
          v_singles[4 * b + 1], v_singles[4 * b + 2], v_singles[4 * b + 3], v_singles[4 * b + 4]
        );
        if app.exam_vgridcopy_key(v_stage, 0) <> v_want[e + 1] then
          v_consistent := false;
          exit;
        end if;
      end loop;
      if not v_consistent then
        continue;
      end if;
      v_prediction := app.exam_vgridcopy_apply(
        v_probe_mid, 0,
        v_singles[4 * b + 1], v_singles[4 * b + 2], v_singles[4 * b + 3], v_singles[4 * b + 4]
      );
      v_key := app.exam_vgridcopy_key(v_prediction, 0);
      if v_found_key is null then
        v_found_key := v_key;
        v_found := v_prediction;
      elsif v_found_key <> v_key then
        return null;
      end if;
    end loop;
  end loop;

  return v_found;
end
$$;

comment on function app.exam_vgridcopy_target(jsonb) is
  'FLU-GRIDCOPY-01''s derived key: the probe output every example-consistent program in the '
  'op grammar agrees on, or null when the worked examples do not force one. Enumerates the '
  'same space as deriveGridTarget() in verifiers/fluid.ts, memoising only the shared first '
  'stage of each two-op program; app.exam_vgridcopy_target_unpruned is the un-memoised '
  'transcription the tests hold it against.';

-- The literal transcription of deriveGridTarget(): every program re-run from the original
-- grid, nothing cached. Never called in production; it exists so the memoised search above is
-- CHECKED against the shape it claims to reproduce rather than merely asserted to be it.
create function app.exam_vgridcopy_target_unpruned(p_content jsonb)
returns integer[]
language plpgsql
stable
parallel safe
set search_path = pg_catalog
as $$
declare
  v_probe integer[] := app.exam_vgridcopy_read(p_content -> 'probeInput');
  v_raw_examples jsonb := app.exam_varr(p_content -> 'examples');
  v_palette double precision := app.exam_vint(p_content -> 'paletteSize');
  v_entry jsonb;
  v_inputs integer[] := '{}'::integer[];
  v_input_at integer[] := '{}'::integer[];
  v_want text[] := '{}'::text[];
  v_input integer[];
  v_output integer[];
  v_examples integer := 0;
  v_singles integer[];
  v_count integer;
  v_programs integer[] := '{}'::integer[];
  v_steps integer;
  v_grid integer[];
  v_consistent boolean;
  v_key text;
  v_found_key text;
  v_found integer[];
  v_at integer;
begin
  if v_probe is null or v_raw_examples is null or jsonb_array_length(v_raw_examples) = 0
    or v_palette is null
  then
    return null;
  end if;
  for v_entry in select e from jsonb_array_elements(v_raw_examples) as e loop
    v_input := app.exam_vgridcopy_read(app.exam_vobj(v_entry) -> 'input');
    v_output := app.exam_vgridcopy_read(app.exam_vobj(v_entry) -> 'output');
    if v_input is null or v_output is null then
      return null;
    end if;
    v_input_at := v_input_at || coalesce(array_length(v_inputs, 1), 0);
    v_inputs := v_inputs || v_input;
    v_want := v_want || app.exam_vgridcopy_key(v_output, 0);
    v_examples := v_examples + 1;
  end loop;

  v_singles := app.exam_vgridcopy_singles(greatest(0, least(v_palette, 64))::integer);
  v_count := coalesce(array_length(v_singles, 1), 0) / 4;

  -- Programs as [step count, then 4 ints per step], in the order gridProgramSpace() builds.
  for a in 0 .. v_count - 1 loop
    v_programs := v_programs || 1 || v_singles[4 * a + 1 : 4 * a + 4];
  end loop;
  for a in 0 .. v_count - 1 loop
    for b in 0 .. v_count - 1 loop
      v_programs := v_programs || 2
        || v_singles[4 * a + 1 : 4 * a + 4] || v_singles[4 * b + 1 : 4 * b + 4];
    end loop;
  end loop;

  v_at := 1;
  while v_at <= coalesce(array_length(v_programs, 1), 0) loop
    v_steps := v_programs[v_at];
    v_consistent := true;
    for e in 0 .. v_examples - 1 loop
      v_grid := app.exam_vgridcopy_apply(
        v_inputs, v_input_at[e + 1],
        v_programs[v_at + 1], v_programs[v_at + 2], v_programs[v_at + 3], v_programs[v_at + 4]
      );
      for s in 1 .. v_steps - 1 loop
        v_grid := app.exam_vgridcopy_apply(
          v_grid, 0,
          v_programs[v_at + 4 * s + 1], v_programs[v_at + 4 * s + 2],
          v_programs[v_at + 4 * s + 3], v_programs[v_at + 4 * s + 4]
        );
      end loop;
      if app.exam_vgridcopy_key(v_grid, 0) <> v_want[e + 1] then
        v_consistent := false;
        exit;
      end if;
    end loop;
    if v_consistent then
      v_grid := app.exam_vgridcopy_apply(
        v_probe, 0,
        v_programs[v_at + 1], v_programs[v_at + 2], v_programs[v_at + 3], v_programs[v_at + 4]
      );
      for s in 1 .. v_steps - 1 loop
        v_grid := app.exam_vgridcopy_apply(
          v_grid, 0,
          v_programs[v_at + 4 * s + 1], v_programs[v_at + 4 * s + 2],
          v_programs[v_at + 4 * s + 3], v_programs[v_at + 4 * s + 4]
        );
      end loop;
      v_key := app.exam_vgridcopy_key(v_grid, 0);
      if v_found_key is null then
        v_found_key := v_key;
        v_found := v_grid;
      elsif v_found_key <> v_key then
        return null;
      end if;
    end if;
    v_at := v_at + 1 + 4 * v_steps;
  end loop;

  return v_found;
end
$$;

create function app.exam_verify_gridcopy(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_target integer[] := coalesce(
    app.exam_vgridcopy_target(coalesce(p_item -> 'content', '{}'::jsonb)),
    app.exam_vgridcopy_read(p_item -> 'answer' -> 'targetGrid')
  );
  v_submitted integer[] := app.exam_vgridcopy_read(p_response -> 'finalGrid');
  v_key text;
  v_rows jsonb := '[]'::jsonb;
  v_row jsonb;
  v_line text;
  v_cells integer;
  v_hits integer := 0;
begin
  if v_target is null then
    return jsonb_build_object('correct', false);
  end if;

  -- The renderer may report the grid as the '000/001/000' string instead. Each character is
  -- parsed on its own, so a non-digit makes the whole grid unreadable, exactly as
  -- `Number.parseInt(ch, 10)` returning NaN does on the TypeScript side.
  if v_submitted is null then
    v_key := app.exam_vstr(p_response -> 'finalGridKey');
    if v_key is null then
      return jsonb_build_object('correct', false);
    end if;
    foreach v_line in array string_to_array(v_key, '/') loop
      v_row := '[]'::jsonb;
      for i in 1 .. char_length(v_line) loop
        v_row := v_row || case
          when substr(v_line, i, 1) between '0' and '9'
            then jsonb_build_array(substr(v_line, i, 1)::integer)
          else jsonb_build_array(null::integer)
        end;
      end loop;
      v_rows := v_rows || jsonb_build_array(v_row);
    end loop;
    v_submitted := app.exam_vgridcopy_read(v_rows);
    if v_submitted is null then
      return jsonb_build_object('correct', false);
    end if;
  end if;

  -- TS checks the row count, then each row's width against the target's. Both grids are
  -- rectangles by construction, so the two checks are the two dimensions.
  if v_submitted[1] <> v_target[1] or v_submitted[2] <> v_target[2] then
    return jsonb_build_object('correct', false);
  end if;

  v_cells := v_target[1] * v_target[2];
  for i in 1 .. v_cells loop
    if v_submitted[2 + i] = v_target[2 + i] then
      v_hits := v_hits + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'correct', v_hits = v_cells,
    'metrics', jsonb_build_object('M-POLY', app.exam_vproportion(v_hits, v_cells))
  );
end
$$;

comment on function app.exam_verify_gridcopy(jsonb, jsonb) is
  'FLU-GRIDCOPY-01; port of verifyGridCopy (verifiers/fluid.ts). Re-derives the probe output '
  'by searching the op grammar for every program consistent with the worked examples, and '
  'falls back to answer.targetGrid only when they do not force one. See the migration section '
  'header on how the search is bounded and on the un-memoised function it is checked against.';

reset role;

-- ===================================================================================
-- 8. app.exam_lexicon — the one input the database did not have (E-092)
--
-- WHY IT IS HERE. GB-WORDLADDER-01 grades "is this rung a real word", and its TypeScript
-- verifier answers that by reading a 4,091-entry curated child lexicon off disk
-- (`research/exam-question-types/generators/lexicon-child-en.mjs`). None of `content`,
-- `answer`, `scoring` or `provenance` carries it, so `app.exam_item` cannot: the item records
-- ONE optimal ladder and a count of equally short ones, never the words some other legal
-- ladder might climb through. The inventory (§6) offered three ways out and the owner chose
-- this one, under D-027's authority: leaving the type on the app tier would reopen exactly
-- the split D-027 closes, and enumerating the legal words into `answer` would mean
-- regenerating the banks.
--
-- HOW IT IS LOCKED DOWN. Identically to `app.exam_item.answer_key`, which is the point:
--   * it lives in `app`, a schema no client role holds USAGE on;
--   * every privilege is revoked from public, anon, authenticated and service_role, and only
--     api_executor is granted SELECT;
--   * row-level security is enabled AND forced, with one policy that admits api_executor and
--     nobody else, so a future blanket grant cannot quietly open it;
--   * nothing in `api` returns a word or a band, and the verifier's verdict carries neither.
-- `supabase/tests/124_exam_verify_awkward_batch.test.sql` asserts all of that, including that
-- anon and authenticated are hard-denied at runtime.
--
-- HOW DRIFT IS PREVENTED. Two independent locks:
--   * the DO block at the end of this section recomputes the source module's OWN
--     `lexiconHash()` — sha1 over `WORD:BAND` pairs in word order, first 16 hex digits — over
--     the rows this migration actually inserted, and REFUSES TO APPLY if it is not
--     428d7d7227fbf5cd. That is the same hash every GB-WORDLADDER-01 bank item records in
--     `answer.equivalence.lexiconHash`, so the table, the generator and the banks are pinned
--     to one another by a value none of them can change alone;
--   * `apps/web/src/lib/exam/verifiers/lexicon-parity.test.ts` re-parses the source file with
--     the app tier's own reader and compares it word for word against the seed below, so
--     editing the source without re-seeding fails the unit suite instead of silently
--     splitting the two tiers.
--
-- The seed is idempotent: two sibling agents share one local database, and re-running it must
-- never depend on the table being empty first.
-- ===================================================================================

set role app_owner;

create table app.exam_lexicon (
  -- Upper-cased on the way in, which is how both the source module and the TypeScript
  -- verifier normalise before any lookup.
  word text primary key check (word ~ '^[A-Z]+$'),
  -- Vocabulary band 1..7, 7 = earliest/most frequent. A DESIGN ESTIMATE, not a corpus
  -- measurement (RES-012/RES-013), and the source of M-VOCABLVL.
  band smallint not null check (band between 1 and 7)
);

comment on table app.exam_lexicon is
  'SERVER-ONLY curated child lexicon (lexicon-child-en@v1, hash 428d7d7227fbf5cd), seeded '
  'from research/exam-question-types/generators/lexicon-child-en.mjs. Reached only by '
  'app.exam_verify_wordladder, which needs it to decide whether a ladder rung is a real '
  'word — the judgement the type measures, so it is held behind the same firewall as '
  'app.exam_item.answer_key and no client role can read it. Evidence E-092.';
comment on column app.exam_lexicon.band is
  'Vocabulary band 1..7 (7 = earliest/most frequent). Provisional design estimate, not '
  'validated against child data. Feeds M-VOCABLVL as the rarest band a ladder reached.';

alter table app.exam_lexicon enable row level security;
alter table app.exam_lexicon force row level security;

create policy exam_lexicon_read on app.exam_lexicon
  for select to api_executor
  using (true);

reset role;

revoke all on app.exam_lexicon from public, anon, authenticated, service_role;
grant select on app.exam_lexicon to api_executor;

-- --- The seed, one statement per vocabulary band ------------------------------------
-- Transcribed from the source module by the same parse the app-tier verifier applies to it
-- (`childLexicon()` in apps/web/src/lib/exam/verifiers/quantitative.ts), so what is stored
-- here is what that verifier reads, not a second interpretation of the file.

insert into app.exam_lexicon (word, band)
select w, 7
from unnest(regexp_split_to_array($lex$
ABOUT AFTER AGAIN AND ARE BACK BAD BED BEEN BELOW BEST BIG BLACK BLUE BOOK BOX BOY BRING
BROWN BUS BUT CALL CAME CAN CAR CAT CHECK CLEAN CLEAR CLOSE COLOR COME COOL COULD CUP DARK
DAY DEEP DID DOES DOG DONE DOWN EACH EARLY EARTH EAT EIGHT END EVEN EVER EVERY EYE FACE FALL
FAST FEEL FEET FIELD FIND FINE FIRE FIRST FISH FIVE FOOD FOOT FOR FOUND FOUR FREE FROM FRONT
FULL FUN GAME GAVE GET GIRL GIVE GIVEN GOES GOLD GONE GOOD GOT GREAT GREEN GROUP GROW HAD
HAND HARD HAS HAT HAVE HEAD HEAR HEARD HEART HEAVY HELP HER HERE HIGH HIM HIS HOLD HOME HOPE
HORSE HOT HOUR HOUSE HOW IDEA IMAGE INTO ITS JUST KEEP KIND KNEW KNOW LAND LARGE LAST LATE
LEARN LEFT LESS LET LIFE LIGHT LIKE LINE LIST LIVE LONG LOOK LOST LOVE MAD MADE MAKE MAN
MANY MEAN MEET MIGHT MILE MIND MISS MONEY MONTH MORE MOST MOUSE MOUTH MOVE MUCH MUSIC MUST
NAME NEAR NEED NEVER NEW NEXT NICE NIGHT NINE NONE NORTH NOT NOTE NOW OFTEN OLD ONE ONLY
OPEN ORDER OTHER OUR OUT OVER PAGE PAPER PART PARTY PAST PEACE PICK PIECE PLACE PLANT PLAY
POINT POWER PRESS PRICE PUT QUICK QUIET READ REAL RED REST RIDE RIGHT RIVER ROAD ROCK ROOM
ROUND RUN SAD SAID SAME SAW SAY SCENE SEAT SEE SEEM SEEN SENT SET SEVEN SHALL SHARE SHE
SHEET SHINE SHIP SHOE SHOP SHORT SHOW SHOWN SIDE SINCE SING SIT SIZE SLEEP SLOW SMALL SMILE
SNOW SOLD SOME SONG SOON SORT SOUND SOUTH SPACE SPEAK STAND START STATE STAY STEP STILL
STONE STOOD STOP STORE STORY STUDY SUCH SUGAR SUN SURE SWEET TABLE TAKE TALK TALL TEACH TEAM
TELL THAN THANK THAT THE THEM THEN THERE THESE THEY THIN THING THINK THIRD THIS THOSE THREE
TIGHT TIME TIMES TINY TODAY TOLD TOO TOOK TOP TOTAL TOUCH TRADE TRAIN TREE TRIP TRUCK TRUE
TURN TWO UNDER UNTIL USE USED USUAL VALUE VERY VISIT VOICE WALK WALL WANT WARM WAS WASH
WASTE WATCH WATER WAY WEEK WELL WENT WERE WHAT WHEEL WHEN WHERE WHICH WHILE WHITE WHO WHOLE
WHOSE WILL WIND WISH WITH WOMEN WOOD WORD WORK WORLD WOULD WRITE WRONG YEAR YES YOU YOUNG
YOUR
$lex$, '\s+')) as w
where w <> ''
on conflict (word) do update set band = excluded.band;

insert into app.exam_lexicon (word, band)
select w, 6
from unnest(regexp_split_to_array($lex$
ABLE ABOVE ADD AGE AIR ALL ALONE ALONG ALSO ANGRY ANIMAL ANSWER ANT ANY APPLE ARM ARMY
AROUND ARROW ART ASIDE ASK ATE AWARD AWAY BABY BACON BADGE BAG BAKER BALL BAND BANK BARN
BASE BASKET BAT BATH BEACH BEAR BEARD BEAST BEAT BEAUTY BEFORE BEGIN BEHIND BEING BELL BELLY
BELT BENCH BEND BERRY BETTER BIRD BIRTH BIT BITE BLADE BLAME BLANK BLAST BLAZE BLEND BLIND
BLOCK BLOOD BLOOM BLOW BLOWN BOARD BOAST BOAT BODY BONE BONUS BORN BOTH BOTTLE BOTTOM BOUND
BOW BOWL BRAIN BRAKE BRAND BRAVE BREAD BREAK BREED BRICK BRIDE BRIDGE BRIEF BRIGHT BROKEN
BRUSH BUG BUILD BUILT BUNCH BURST BUSY BUTTON BYE CABIN CABLE CAGE CAKE CAMERA CAMP CANDLE
CANDY CAP CARD CARE CARGO CARPET CARRY CART CASE CASH CASTLE CATCH CAUSE CAVE CELL CENTER
CHAIN CHAIR CHALK CHANGE CHARM CHASE CHEAP CHEEK CHEER CHESS CHEST CHIEF CHILD CHILL CHIN
CHOKE CHOOSE CHOSE CHUNK CHURCH CHURN CIRCLE CITY CLAIM CLASH CLAY CLERK CLICK CLIFF CLIMB
CLING CLOAK CLOCK CLOSED CLOTH CLOUD CLOWN CLUB COACH COAST COAT COFFEE COLD CORAL CORN
CORNER COST COTTON COUNT COUPLE COURSE COURT COUSIN COVER COW CRACK CRAFT CRANE CRASH CRAWL
CRAZY CREAM CREEK CREEP CREST CRISP CROP CROSS CROWD CROWN CRUMB CRUSH CURE CURVE CUT CYCLE
DAD DAILY DAIRY DANCE DANGER DEAR DEATH DECIDE DEER DELAY DENSE DEPTH DESERT DESIRE DESK
DETAIL DIARY DINNER DIRTY DISH DITCH DIVE DIZZY DOCK DOCTOR DODGE DOLL DOLLAR DOOR DOUBLE
DOUBT DOZEN DRAFT DRAGON DRAIN DRAMA DRANK DREAM DRESS DRIED DRIFT DRILL DRINK DRIVE DROP
DROVE DROWN DRUM DUCK DURING DUST DWELL EAGER EAGLE EAR EARN EASILY EAST EASY EATING EDGE
EGG ELBOW ELEVEN EMPTY ENEMY ENERGY ENGINE ENJOY ENOUGH ENTER EQUAL ESCAPE EVENT EXACT
EXPECT EXTRA FACT FAINT FAIR FAIRY FAITH FALSE FAMILY FAMOUS FANCY FAR FARM FARMER FAT
FATHER FAULT FAVOR FEAR FEAST FEED FELL FELLOW FELT FENCE FEVER FEW FIBER FIFTY FIGHT FIGURE
FILE FILL FILM FINAL FINGER FINISH FIT FIX FLAG FLAME FLASH FLAT FLEET FLESH FLEW FLICK
FLIGHT FLING FLOAT FLOCK FLOOD FLOOR FLOUR FLOW FLOWER FLOWN FLUID FLUTE FLY FLYING FOCUS
FOGGY FOLD FOLLOW FORCE FOREST FORGET FORGOT FORK FORM FORTY FOX FRAME FRESH FRIED FRIEND
FROST FRUIT FUEL FUNNY GARAGE GARDEN GATE GATHER GENTLE GIANT GIFT GLAD GLASS GLEAM GLOBE
GLORY GLOVE GLUE GOAT GOING GOLDEN GRAB GRACE GRADE GRAIN GRAND GRAPE GRAPH GRASS GRAVE GRAY
GRAZE GREET GREW GRIEF GRILL GRIND GROAN GROOM GROUND GROVE GROWL GUARD GUESS GUEST GUIDE
GUITAR HABIT HAIR HALF HALL HAM HANDLE HANG HAPPEN HAPPY HARSH HASTE HATCH HATE HAUNT HEALTH
HEAT HEDGE HELD HELLO HERS HIDDEN HIDE HILL HINT HIT HOBBY HOLE HOLLOW HONEST HONEY HONOR
HOP HOTEL HUG HUMAN HUMOR HUNT HURRY HURT ICE IDEAL ILL INCH INDEED INDEX INNER INPUT INSIDE
IRON ISLAND ISSUE ITEM IVORY JACKET JAM JAZZ JELLY JEWEL JOB JOIN JOINT JOKE JUDGE JUICE
JUMP JUNGLE KEY KID KING KITTEN KNOWN LABEL LABOR LACE LADDER LAKE LAMP LAUGH LAUNCH LAWN
LAWYER LAYER LAZY LEADER LEAF LEAN LEAP LEASH LEAST LEAVE LEG LEGAL LEGEND LEMON LEND LESSON
LETTER LEVEL LIFT LIMIT LINEN LINER LION LISTEN LITTLE LIVER LIVING LOAN LOCAL LOCK LODGE
LOG LOGIC LONELY LOOSE LOT LOUD LOVELY LOW LUCK LUCKY LUNCH LUNG MAGIC MAIL MAIN MAJOR MAKER
MANAGE MAP MAPLE MARCH MARK MARKET MASK MATCH MATTER MAYBE MAYOR MEADOW MEAL MEANT MEAT
MEDAL MEDIA MELON MELT MEMBER MEMORY MEN MENU MERCY MERGE MERRY METAL METER MICE MIDDLE MILD
MILK MINE MINUTE MIRROR MIX MIXED MODEL MOIST MOM MOMENT MONKEY MOON MOTHER MOTION MOTOR
MOUNT MOVIE MUD MUDDY MUSCLE MUSEUM MYSELF MYTH NAIL NAPKIN NARROW NASTY NATURE NEARBY NECK
NEPHEW NERVE NEST NET NEWLY NEWS NICKEL NOBLE NOISE NOON NORMAL NOSE NOTCH NOTICE NOVEL
NUMBER NURSE NUT OAK OBJECT OCEAN OFF OFFER OFFICE OIL OLIVE ONCE ONION ONLINE OPERA ORANGE
ORBIT ORGAN OTHERS OUGHT OUNCE OUTPUT OWL OWN OWNER PACE PACK PACKET PAID PAIN PAINT PAIR
PALACE PALM PAN PANEL PANIC PANTS PARADE PARENT PARK PARROT PASTEL PATCH PATH PATROL PAUSE
PAY PEACH PEAR PEARL PEDAL PEN PENCIL PENNY PEOPLE PEPPER PERCH PERIOD PERSON PET PHASE
PHONE PHOTO PIANO PICNIC PIG PILE PILLOW PILOT PIN PINCH PINK PIPE PITCH PIZZA PLAIN PLAN
PLANE PLANET PLATE PLAYER PLAZA PLEAD PLEASE PLUS POCKET POEM POET POETRY POLAR POLE POLICE
POLISH POND POOL POOR PORCH PORK POST POT POTATO POUND POWDER PRAISE PRANK PREFER PRETTY
PRIDE PRIME PRINCE PRINT PRISON PRIZE PROMPT PROOF PROPER PROUD PROVE PUBLIC PULL PULSE PUMP
PUNCH PUPIL PUPPET PUPPY PURE PURPLE PURSE PUZZLE QUART QUEEN QUEST QUILT QUITE RABBIT RACE
RACKET RADIO RAIL RAIN RAISE RAN RANCH RANDOM RANGE RANK RAPID RARE RAT RATE RATHER RATIO
REACH READY REALM REASON REBEL RECESS RECORD REDUCE REFER REGION RELAX REMAIN REMIND REMOTE
REPAIR REPEAT REPLY REPORT RESCUE RESULT RETURN REWARD RIBBON RICH RIDDLE RIDER RIDGE RIFLE
RIGID RING RINSE RISE RISK RIVAL ROAST ROBOT ROCKET ROCKY ROLE ROOF ROOT ROPE ROSE ROUGH ROW
ROYAL RUB RUBBER RULE RULER RURAL RUSH SADDLE SADLY SAFETY SAIL SAINT SALAD SALMON SALT
SAMPLE SAND SANDAL SANDY SAUCE SAUCER SAVE SCALE SCARE SCARF SCENT SCHOOL SCOOP SCORE SCOUT
SCRAP SCREAM SCREEN SCREW SEA SEAL SEARCH SEASON SECOND SECRET SEED SEEK SEIZE SELF SELL
SEND SENIOR SENSE SENSOR SERIES SERVE SETTLE SEVERE SHADE SHADOW SHADY SHAKE SHAME SHAPE
SHARK SHARP SHAVE SHED SHELF SHELL SHIELD SHIFT SHIRT SHOCK SHOOT SHORE SHOT SHOULD SHOUT
SHOVE SHOVEL SHOWER SHRUG SICK SIEGE SIGHT SIGN SIGNAL SILENT SILK SILLY SILVER SIMPLE
SINGER SINK SIREN SISTER SIX SIXTH SKATE SKETCH SKILL SKIN SKIRT SKULL SKY SLATE SLAVE SLEET
SLICE SLIDE SLIGHT SLIME SLIP SLOPE SMART SMASH SMELL SMOKE SMOOTH SNACK SNAIL SNAKE SNAP
SNEAK SNIFF SNORE SOAP SOCCER SOCK SOCKET SOFT SOFTLY SOIL SOLAR SOLID SOLVE SON SORROW
SORRY SOUR SPADE SPARE SPARK SPEED SPELL SPEND SPICE SPIDER SPIKE SPILL SPIN SPINE SPIRIT
SPITE SPOKE SPOKEN SPOON SPORT SPOT SPRAY SPRING SQUAD SQUARE STABLE STACK STAFF STAGE STAIN
STAIR STAKE STALE STALK STALL STAMP STAR STARE STATUE STEADY STEAL STEAM STEEL STEEP STEER
STEM STERN STICK STIFF STING STINK STIR STITCH STOCK STOLE STOLEN STONY STOOL STORM STORMY
STOVE STRAIN STRAND STRAP STRAW STREAM STREET STRESS STRICT STRIKE STRING STRIP STRIPE
STROKE STRONG STUCK STUDIO STUFF STUMP STUPID STYLE SUBMIT SUBWAY SUDDEN SUFFER SUIT SUMMER
SUNNY SUNSET SUPER SUPPER SUPPLY SURVEY SWAMP SWARM SWEAR SWEAT SWEEP SWEPT SWIFT SWIM SWING
SWITCH SWORD SYMBOL SYSTEM TAIL TALE TALENT TANK TAPE TARGET TASK TASTE TEA TEAPOT TEEN
TEETH TEMPLE TEMPO TEN TENDER TENNIS TENSE TENT TENTH TERM TEST TEXT THEORY THICK THIEF
THIGH THIRTY THORN THREAD THREAT THROAT THRONE THROW THUMB THUS TICKET TICKLE TIDE TIE TIGER
TILE TIMBER TIMER TIN TIRED TISSUE TITLE TOAD TOAST TOE TOKEN TOMATO TONE TONGUE TOOL TOOTH
TOPIC TORCH TORN TOUGH TOUR TOWARD TOWEL TOWER TOWN TOY TRACE TRACK TRAIL TRAIT TRAMP TRASH
TRAVEL TREAT TREATY TREND TRIAL TRIBE TRICK TRIED TRIPLE TROOP TROUT TRULY TRUNK TRUST TRUTH
TRY TUBE TULIP TUNE TUNNEL TURKEY TURTLE TUTOR TWELVE TWENTY TWICE TWIN TWIST TYPE UNABLE
UNCLE UNIQUE UNIT UNITE UNLESS UPSET URBAN USAGE USEFUL VAGUE VALID VALLEY VALVE VAN VAPOR
VAST VAULT VELVET VERSE VESSEL VICTIM VICTOR VIDEO VILLA VINYL VIOLET VIOLIN VIRTUE VISION
VITAL VIVID VOCAL VOLUME VOTE VOTER VOYAGE WAGE WAGON WAIST WAIT WAKE WALNUT WANDER WAR
WARMTH WAVE WEALTH WEAPON WEAR WEARY WEAVE WEDGE WEEKLY WEIGH WEIGHT WEIRD WEST WET WHALE
WHEAT WHINE WHIRL WHISK WIDE WIDOW WIDTH WIFE WILD WIN WINDOW WINDY WING WINTER WIPE WIRE
WISDOM WISE WITCH WITHIN WOLF WONDER WOODEN WORKER WORRY WORSE WORST WORTH WOUND WOVEN
WREATH WRIST WRITER YACHT YARD YEAST YELL YELLOW YIELD YOUTH ZEBRA ZERO ZONE ZOO
$lex$, '\s+')) as w
where w <> ''
on conflict (word) do update set band = excluded.band;

insert into app.exam_lexicon (word, band)
select w, 5
from unnest(regexp_split_to_array($lex$
ACE ACID ACORN ACT ADOPT ADORE AGED AID AIM AISLE ALARM ALBUM ALERT ALGAE ALIEN ALLEY ALLOW
ALOFT ALTER AMBER AMPLE AMUSE ANGEL ANGLE ANKLE ANVIL APART APE APRON ARENA ARGUE ARISE
ARMOR ASPEN ATLAS ATTIC AUDIO AUNT AWAIT AWAKE AWARE BADLY BAKE BALD BANJO BAR BARE BARGE
BARK BASIN BATCH BAY BEAM BEAN BEE BEEF BEEP BEET BEG BEIGE BIKE BILL BIN BIND BLAND BLEAK
BLEAT BLESS BLIMP BLINK BLISS BLOAT BLOND BLOT BLUNT BLUR BOGUS BOIL BOLD BOLT BOMB BOND
BOOM BOOT BOOTH BORE BOSS BOUGH BOXER BRACE BRAG BRAID BRAN BRAWL BREW BRIBE BRINE BRINK
BROAD BROIL BROKE BROOD BROOK BROOM BROTH BROW BRUTE BUCK BUD BUGGY BUGLE BULB BULGE BULK
BULKY BULL BUMP BUMPY BUN BUNK BUNNY BURN BURNT BURY BUSH BUSHY BUST BUY BUYER CAB CADET
CAMEL CANAL CANE CANOE CANON CAPE CAPER CAROL CARP CARVE CATER CEASE CEDAR CHANT CHAOS CHART
CHAT CHEAT CHEF CHEW CHIME CHIP CHIRP CHOIR CHOP CHORD CHORE CHUCK CHUTE CIDER CIVIC CIVIL
CLACK CLAMP CLANG CLANK CLAP CLASP CLAW CLEAT CLEFT CLINK CLIP CLOVE CLUE COAL COBRA COCOA
COIL COIN COLON COMET COMIC CONE COOK COPE CORD CORK CORNY COUCH COUGH COVE CRAB CRANK CRATE
CRAVE CREAK CREPT CREW CRIB CRIMP CROAK CROCK CROW CRUDE CRUEL CRUST CRY CUB CUBE CUBIC CURL
CURLY CURSE CUTE DAMP DANDY DARE DART DASH DAWN DAZED DEAL DEAN DEBT DECAL DECAY DECK DECOY
DEED DEFER DELTA DEMON DEN DENT DEPOT DIAL DICE DIET DIG DIGIT DIME DINE DINER DINGO DINGY
DIP DIRT DIVER DONOR DOOM DOSE DOT DOUGH DOVE DOWEL DOWNY DRAG DRAKE DRAPE DRAW DRAWL DREAD
DREGS DREW DRIER DRIP DRONE DROOP DRY DUAL DUG DULL DUNE DUSK DWARF DYING EASE EATEN EBONY
ECHO EERIE EGRET EJECT ELDER ELECT EMBER ENVY EQUIP ERASE ERECT ERUPT ESSAY EVADE EXCEL
EXERT EXILE EXIST EXPEL FABLE FADE FAKE FAME FAN FANG FARE FATAL FATE FAWN FED FEE FELON
FETCH FEWER FIERY FIFTH FIG FILTH FIN FINCH FINER FIRM FIST FLAIR FLAKE FLANK FLAP FLARE
FLEA FLECK FLED FLEE FLIER FLINT FLIP FLIRT FLOP FLORA FLOSS FOAM FOAMY FOCAL FOLLY FORAY
FORGE FORTH FOUL FOYER FRAIL FRANK FRAUD FREAK FREED FRISK FROCK FROWN FROZE FUDGE FUME FUND
FUSE FUSSY GABLE GAIN GALE GANG GAP GAS GASP GAUGE GAUNT GAZE GEAR GENIE GERM GHOST GIDDY
GIRTH GLADE GLAND GLARE GLAZE GLIDE GLINT GLOAT GLOOM GLOSS GLOW GNAW GNOME GOAL GOOSE GORGE
GOURD GOWN GRASP GRATE GREED GRIM GRIME GRIN GRIP GRIPE GRUNT GUILD GULLY GULP GUM GUN GUST
GUSTY HARDY HARE HARM HARP HASTY HAUL HAVEN HAVOC HAWK HAZEL HAZY HEAL HEAP HEAVE HEEL HEFTY
HEN HERD HERO HERON HID HINGE HIVE HOARD HOIST HOLLY HOMER HOOF HOOK HOOP HORN HOSE HOUND
HOVER HOWL HUMID HUSH HUSKY HUT HYENA IDIOM IGLOO IMPLY INFER INK INLET IRONY JAIL JAR JEEP
JET JETTY JIFFY JOG JOLLY JOLT JOY JUMPY KAYAK KEEL KEEN KICK KISS KIT KITE KNEE KNEEL KNELT
KNIFE KNOCK KNOLL KNOT KOALA LACK LADLE LAMB LANCE LANE LANKY LAP LAPSE LARCH LASH LASSO
LATCH LAW LAY LEAK LEAKY LEAPT LEDGE LEECH LEMUR LENS LEVER LID LILAC LIMB LIME LIMP LINK
LIP LITHE LLAMA LOBBY LOFTY LOTUS LOUSY LOWER LOYAL LUCID LUMP LUMPY LUNAR LURCH LURE LUSH
LYRIC MACAW MADLY MAID MAIZE MANE MANGO MANOR MARSH MASH MASON MAST MAT MATE MAZE MEDIC MEND
MERIT MESH MIDST MILL MIMIC MINER MINOR MINT MISER MIST MOAN MOAT MOLAR MOLD MOLDY MOLE MONK
MOOD MOODY MOOSE MOP MORAL MOSS MOSSY MOTEL MOTH MOUND MOURN MUG MUGGY MULCH MULE MUMMY
MURAL MURKY MUSHY MUSTY MUTE NAP NAVAL NAVY NEAT NEEDY NICHE NICK NIFTY NINTH NOD NODE NOMAD
NOOSE NUDGE NUMB NUTTY OASIS OATH OBESE OCCUR OMEGA ONSET OPTIC OTTER OUTDO OUTER OVEN OVERT
OXIDE OZONE PAD PAGAN PAL PALE PANE PANSY PANT PARCH PARKA PASTA PASTY PATIO PAVE PAW PEAK
PECAN PEEL PERIL PERKY PESKY PEST PETAL PETTY PHONY PICKY PIE PINTO PIPER PIT PITY PIVOT
PIXEL PLAID PLANK PLEAT PLOT PLOW PLUCK PLUG PLUM PLUMB PLUME PLUMP PLUSH POACH POISE POLL
PONY POP POPE POPPY POSE POSER POSSE POUCH POUR PRAWN PRAY PREEN PREY PROBE PRONG PROP PROSE
PROWL PRUNE PUDGY PUFF PUFFY PULP PUNT PURGE PUTTY QUACK QUAIL QUAKE QUERY QUEUE QUILL QUIRK
QUIT QUOTA QUOTE RABID RADAR RAFT RAG RAGE RAID RALLY RAMP RASH RASPY RATTY RAVEN REAP REED
REEF REEL REIGN RELAY RELIC RELY RENEW RENT REPAY REPEL RESET RESIN RETRO REVEL RHINO RID
RIP RIPE RIPEN RISKY RIVET ROACH ROAR ROB ROBE ROBIN ROD RODE RODEO ROGUE ROOMY ROOST ROTOR
ROUGE ROUSE ROWDY RUG RUGBY RUMOR RUNNY RUST RUSTY SABLE SACK SAGE SALSA SALTY SANE SASSY
SATIN SAUNA SAVOR SCALD SCALY SCAMP SCAN SCANT SCAR SCARY SCOLD SCONE SCOOT SCORN SCOUR
SCOWL SCRUB SCUBA SEAM SEDAN SEEDY SEEP SERUM SEW SHACK SHALE SHARD SHAWL SHEAF SHEAR SHEEN
SHEEP SHEER SHINY SHOAL SHONE SHOOK SHORN SHREW SHRUB SHUT SHYLY SIEVE SILKY SINEW SINUS SIP
SIR SITE SKIFF SKIMP SKUNK SLAB SLACK SLAIN SLAM SLANG SLANT SLAP SLASH SLED SLEEK SLEPT
SLICK SLID SLIM SLIMY SLING SLINK SLIT SLOOP SLOSH SLOT SLOTH SLUG SLUMP SLUNG SLURP SLUSH
SMACK SMEAR SMELT SMIRK SMOCK SMOG SMOKY SNARL SNEER SNIPE SNOOP SNORT SNOUT SNOWY SNUG SOAK
SOAPY SOAR SOBER SOGGY SOLE SOLO SONIC SOOT SOOTY SORE SPAR SPASM SPAWN SPEAR SPECK SPIKY
SPINY SPIRE SPLAT SPOIL SPOOL SPORE SPRIG SPUN SPUR SPURT SQUAT SQUID STAB STASH STEAD STEED
STEW STILT STINT STOIC STOKE STOMP STOOP STORK STOUT STRAY STRUT STUB STUN STUNG STUNT SUB
SULKY SUM SURGE SURLY SWAN SWAP SWAY SWELL SWINE SWIRL SWOOP SYRUP TABBY TABOO TACK TACKY
TAFFY TAG TALLY TALON TAME TAN TANGO TANGY TAP TAPIR TAR TARDY TART TAUNT TAWNY TEARY TEMPT
TENOR TEPID TERSE THAW THEFT THREW THROB THUD THUMP THYME TIARA TICK TIDAL TILT TIMID TINT
TIPSY TITAN TOLL TOMB TON TONIC TOPAZ TORSO TOTEM TOXIN TRACT TRAP TRAWL TRAY TREAD TRIAD
TRILL TRIM TROT TROVE TRUCE TRUMP TUB TUCK TUG TUMOR TUNIC TURBO TUSK TWEAK TWEED TWEET TWIG
TWINE TWIRL UDDER UNFIT UNION UNTIE USHER UTTER VALET VALOR VASE VEIL VEIN VENOM VENT VENUE
VERGE VEST VICAR VIGIL VIGOR VINE VIPER VIRUS VISOR VIXEN VOID VOUCH VOWEL WACKY WADE WADER
WAFER WAG WAGER WAIL WALTZ WAND WART WEB WEED WEEDY WEEPY WELD WHARF WHELP WHIFF WHIP WICK
WIDEN WIDER WIELD WIG WILT WIMPY WINCE WINK WIPER WISPY WITTY WOKEN WOMB WON WOOL WORDY WORM
WRAP WRATH WRECK WRING WROTE YARN YAWN YEARN YET YODEL YOLK ZESTY ZIP ZIPPY ZOOM
$lex$, '\s+')) as w
where w <> ''
on conflict (word) do update set band = excluded.band;

insert into app.exam_lexicon (word, band)
select w, 4
from unnest(regexp_split_to_array($lex$
ABILITY ABROAD ABSENCE ABSORB ACADEMY ACCENT ACCEPT ACCESS ACCOUNT ACROBAT ADDRESS ADJUST
ADMIRE ADVANCE ADVICE ADVISE AFFAIR AFFORD AGAINST AGENCY AIRPORT ALCOHOL ALMOND ALREADY
AMAZED AMAZING AMOUNT ANCHOR ANCIENT ANOTHER ANTHEM ANTLER ANYBODY ANYONE APPEAL APPEAR
APPLAUD APRICOT ARCH ARCHER ARCTIC ARREST ARRIVAL ARRIVE ARTICLE ARTIST ASCENT ASPECT ASSIGN
ASSIST ATHLETE ATOM ATTACH ATTACK ATTAIN ATTEMPT ATTEND ATTRACT AUTHOR AVENUE AVERAGE AWAKEN
AWKWARD BADGER BAKERY BALANCE BALCONY BALE BALLAD BALLET BAMBOO BANANA BANDAGE BANDIT BANNER
BANQUET BARB BARGAIN BARREL BARRIER BASS BATHTUB BATTER BATTERY BEACON BEAD BEAK BEAKER
BEDROOM BEEHIVE BEETLE BEGGAR BELIEF BELIEVE BELONG BELOVED BENEATH BESIDE BETRAY BEYOND BIB
BICYCLE BID BIOLOGY BISHOP BITTER BIZARRE BLANKET BLAZER BLEACH BLENDER BLESSED BLIGHT
BLISTER BLOB BLONDE BLOSSOM BLOUSE BLUNDER BOG BOILER BOILING BONNET BOOKLET BORDER BORROW
BOULDER BOUNCE BOUNTY BOUT BOXING BRACKET BRANCH BRANDY BRAT BRAVERY BREACH BREAST BREATH
BREATHE BREEZE BRIDAL BRIDLE BRIGADE BRIM BRISTLE BRITTLE BROADEN BRONZE BROOCH BROWNIE
BRUISE BUBBLE BUCKET BUDGET BUFFALO BUFFET BUILDER BULLDOG BULLET BUMPER BUNDLE BUNKER
BURDEN BUREAU BURGLAR BURROW BUTCHER BUTLER BUTTER CABBAGE CABOOSE CACTUS CALCIUM CALF
CALORIE CAMPER CAMPING CANARY CANCEL CANDID CANINE CANNON CANVAS CANYON CAPABLE CAPITAL
CAPSULE CAPTION CAPTURE CARAMEL CARAVAN CARBON CAREER CAREFUL CARING CARROT CARTON CARTOON
CASCADE CASHIER CASINO CASKET CASUAL CATALOG CATCHER CATTLE CAUGHT CAUTION CAVITY CEILING
CELERY CELLAR CEMENT CENTRAL CENTURY CERAMIC CEREAL CERTAIN CHAMBER CHANCE CHANNEL CHAP
CHAPEL CHAPTER CHAR CHARGE CHARITY CHARTER CHATTER CHECKER CHEESE CHEMIST CHERISH CHERRY
CHICKEN CHILLY CHIMNEY CHISEL CHOICE CHORUS CHROME CHUM CINDER CIRCUS CITIZEN CITRUS CLAM
CLAN CLARITY CLASSIC CLAUSE CLEANER CLEARLY CLEVER CLIENT CLIMATE CLIMAX CLINIC CLIPPER CLOD
CLOG CLOT CLOTHES CLOUDY CLOVER CLUMSY CLUSTER COASTER COAX COB COBALT COBBLER COBWEB
COCONUT COD COFFIN COG COLLAGE COLLAR COLLECT COLLEGE COLLIDE COLONY COLORED COLUMN COMA
COMBAT COMEDY COMFORT COMMAND COMMENT COMMIT COMMON COMMUTE COMPACT COMPANY COMPARE COMPASS
COMPETE COMPLEX COMPOSE COMPOST CON CONCEPT CONCERN CONCERT CONDOR CONDUCT CONFER CONFESS
CONFIRM CONFUSE CONNECT CONQUER CONSENT CONSIST CONSOLE CONSULT CONTACT CONTAIN CONTENT
CONTEST CONTROL CONVERT CONVEY CONVICT CONVOY COOLING COPPER CORRAL CORRECT COSMIC COSTLY
COSTUME COT COTTAGE COUGAR COUNCIL COUNTER COUNTRY COUNTY COURAGE COWARD COWBOY CRACKER
CRADLE CRAFTY CRAG CRAM CRAMPED CRANKY CRATER CRAYON CREATE CREATOR CREDIT CRICKET CRIMSON
CRINGE CRISIS CRITIC CROOKED CROUCH CROWDED CRUMBLE CRUNCH CRUNCHY CRUTCH CRYSTAL CUCKOO
CUDDLE CULTURE CUNNING CUPCAKE CURIOUS CURRENT CURSOR CUSHION CUSTARD CUSTOM CUTTER CYCLIST
CYMBAL DAFT DAGGER DAM DAMAGE DAMPEN DAMPER DANCER DANCING DANGLE DANK DARING DARN DASHING
DAZE DAZZLE DEALER DEALING DEBATE DEBRIS DECADE DECEIVE DECENT DECIDED DECIMAL DECLARE
DECLINE DECODE DECREE DEFEAT DEFECT DEFEND DEFIANT DEFINE DEFLATE DEFLECT DEGRADE DEGREE
DELETE DELIGHT DELIVER DEMAND DENIAL DENTAL DENTIST DEPART DEPEND DEPLOY DEPOSIT DEPRESS
DEPRIVE DESCEND DESERVE DESIGN DESPAIR DESPITE DESSERT DETACH DETECT DETOUR DEVICE DEVOTE
DEW DIAGRAM DIALECT DIAMOND DIAPER DICTATE DIESEL DIFFER DIGEST DIGNITY DILEMMA DILUTE
DIMPLE DING DINING DIPLOMA DIRE DIRECT DISABLE DISARM DISCARD DISCUSS DISEASE DISGUST
DISLIKE DISMAY DISMISS DISPLAY DISPOSE DISPUTE DISTANT DISTORT DISTURB DIVERSE DIVERT DIVIDE
DIVINE DOE DOLPHIN DOMAIN DONATE DONKEY DOORWAY DOTE DOZE DRAB DRASTIC DRAWER DREAMER DREAMY
DREARY DRENCH DRIBBLE DRIZZLE DROUGHT DRUMMER DUNGEON DURABLE DYNAMIC EAGERLY EARLIER
EARNEST EARRING EARTHY EASIER EASTERN ECLIPSE ECOLOGY ECONOMY EDIBLE EDITION EDITOR EDUCATE
EFFORT EIGHTH EITHER ELDEST ELEGANT ELEMENT ELEVATE EMBARK EMBLEM EMBRACE EMERALD EMERGE
EMOTION EMPEROR EMPLOY ENABLE ENAMEL ENCHANT ENCLOSE ENCODE ENDLESS ENDURE ENGAGE ENGRAVE
ENHANCE ENIGMA ENLARGE ENLIST ENSURE ENTIRE ENVELOP EPISODE EQUALLY EQUATOR ERRAND ESCORT
ESTATE ETERNAL EVENING EVENLY EVIDENT EVOLVE EXACTLY EXAMINE EXAMPLE EXCEED EXCESS EXCITE
EXCLAIM EXCLUDE EXCUSE EXECUTE EXHALE EXHIBIT EXOTIC EXPAND EXPENSE EXPERT EXPIRE EXPLAIN
EXPLODE EXPLORE EXPOSE EXPRESS EXTEND EXTRACT EXTREME EYEBROW FABRIC FACING FACTOR FACTORY
FADING FAILURE FAIRLY FALCON FALLEN FALLING FAMINE FANTASY FARMING FASHION FASTEN FATHOM
FATIGUE FAUCET FEATHER FEATURE FEDERAL FEEBLE FELINE FEMALE FENCING FERN FERRET FERTILE FEUD
FIASCO FICKLE FICTION FIDDLE FIDGET FIERCE FIESTA FIFTEEN FIGHTER FILLING FILTER FINALE
FINALLY FINANCE FINDING FINITE FIREMAN FIRING FIRMLY FISHING FITNESS FIXTURE FLANNEL FLASHY
FLATTEN FLAVOR FLAX FLEECE FLICKER FLIMSY FLINCH FLIPPER FLIT FLORAL FLORIST FLUENT FLUFFY
FLURRY FLUTTER FOAL FOE FOLDER FOLIAGE FOND FOOTAGE FORBID FORD FORE FOREARM FOREVER FORFEIT
FORGIVE FORMAL FORMAT FORMER FORMULA FORTUNE FORWARD FOSSIL FOSTER FOUNDER FOWL FRAGILE
FRANTIC FRECKLE FREEDOM FREELY FREEZE FREIGHT FRENZY FRET FRIDGE FRIGHT FRINGE FRISKY
FRITTER FROLIC FROSTY FROZEN FRUGAL FULFILL FUMBLE FUNERAL FUNNEL FURNACE FURNISH FURROW
FURTHER FUSION FUTILE FUTURE GADGET GAIT GALLERY GALLON GALLOP GAMBLE GAPE GARB GARBAGE
GARGLE GARLAND GARLIC GARMENT GARNET GARNISH GASH GATEWAY GAZEBO GEM GENDER GENERAL GENIUS
GENTLY GENUINE GERBIL GESTURE GIFTED GIGGLE GINGER GIRAFFE GLACIER GLADLY GLAMOUR GLANCE
GLASSY GLEN GLIDER GLIMMER GLIMPSE GLISTEN GLITTER GLOOMY GLOSSY GNAT GOBLET GOBLIN GOGGLES
GOODBYE GOPHER GORE GORILLA GOSPEL GOSSIP GOVERN GRADUAL GRAMMAR GRANITE GRANNY GRAPHIC
GRAVEL GRAVITY GREASE GREASY GREEDY GRENADE GRIDDLE GRIMACE GRINDER GRIT GRITTY GRIZZLY
GROCER GROCERY GROOVE GROWTH GRUDGE GRUMBLE GRUMPY GUILTY GULL GURGLE GUTTER GYMNAST HABITAT
HAIRCUT HALLWAY HAMSTER HANDBAG HANDFUL HARMONY HARNESS HARVEST HATCHET HAUNTED HAZE HEALTHY
HEARING HEAVILY HEED HELM HELPFUL HEROINE HERRING HEXAGON HIDEOUS HIGHWAY HIMSELF HOAX HOE
HOLIDAY HONE HONESTY HOPEFUL HORIZON HOSTAGE HOSTILE HOWEVER HUB HULK HULL HUNDRED HURRIED
HUSBAND HYDRANT HYGIENE HYMN ICEBERG IDLE ILLEGAL ILLNESS IMAGINE IMITATE IMPLANT IMPRESS
IMPRINT IMPROVE IMPULSE INCENSE INCLINE INCLUDE INFLATE INHABIT INHERIT INITIAL INQUIRE
INSIGHT INSPECT INSPIRE INSTALL INSTANT INSTEAD INTENSE INVOLVE JADE JANITOR JASMINE JAY
JEALOUS JEST JEWELRY JINX JOURNAL JOURNEY JUG JUNIPER JUSTICE KEG KELP KETCHUP KEYHOLE KILN
KINGDOM KITCHEN KNOB LAD LAG LAIR LANTERN LARD LARK LAUNDRY LEAFLET LEATHER LECTURE LEEK
LEISURE LENGTHY LEOPARD LETTUCE LIBERTY LIBRARY LICENSE LIGHTER LINT LIONESS LOAF LOBE
LOBSTER LOFT LOGICAL LOOM LOON LORE LOTTERY LUGGAGE LULL LULLABY LURK MACE MACHINE MAGICAL
MAGNIFY MAILBOX MAJESTY MANAGER MANKIND MANSION MARRIED MASSIVE MAXIMUM MEASURE MEDICAL MEEK
MEETING MENTION MERCURY MERMAID MESA MESSAGE MILLION MINERAL MINIMUM MIRACLE MIRE MISLEAD
MISSILE MISSION MISTAKE MITE MOB MONARCH MONITOR MONSTER MONTHLY MOOR MORNING MUCK MUSE MUSK
MUSTARD MYSTERY NAG NAPE NATURAL NAUGHTY NECKTIE NEITHER NERVOUS NETWORK NEUTRAL NEWT
NONSTOP NOOK NOSTRIL NOTABLE NOTHING NUCLEAR NUMERAL NUN NURSERY NURTURE OAR OATMEAL OBSCURE
OBSERVE OBVIOUS OCTAGON OCTOPUS ODOR OFFENSE OKRA ONGOING OPAL OPENING OPERATE OPINION
OPOSSUM OPTICAL ORCHARD ORGANIC OSTRICH OUTCOME OUTDOOR OUTLINE OUTLOOK OUTRAGE OUTSIDE
OVERALL OVERDUE OVERLAP PACKAGE PACT PAGEANT PAINTER PAJAMAS PALETTE PANCAKE PANG PANTHER
PARE PARKING PARSLEY PARTIAL PARTNER PASSAGE PASSION PASTURE PATHWAY PATIENT PATTERN PAYMENT
PEACOCK PEASANT PEAT PECK PEEP PELICAN PELT PENALTY PENDANT PENGUIN PENT PERCENT PERFECT
PERFUME PERHAPS PERK PERSIST PHOENIX PHYSICS PIANIST PICTURE PIGMENT PIKE PILGRIM PIONEER
PITCHER PLANTER PLASTER PLASTIC PLATEAU PLATTER PLAYFUL PLEA PLOY PLUMBER POD POLLUTE
POPCORN POPULAR PORE PORTION POSSESS POSTURE POTTERY POULTRY POVERTY PRAIRIE PRECISE PREDICT
PRELUDE PREMIUM PREPARE PRESENT PRESUME PRETEND PREVAIL PREVENT PREVIEW PRIMARY PRIMATE
PRINTER PRIVACY PRIVATE PROBLEM PROCEED PROCESS PROD PRODUCE PRODUCT PROFILE PROGRAM PROJECT
PROMISE PROMOTE PRONOUN PROPOSE PROTECT PROTEST PROVERB PROVIDE PUB PUBLISH PUDDING PUMPKIN
PUP PURPOSE PYRAMID QUALITY QUARREL QUARTER QUICKEN QUIETLY RACCOON RACK RADIANT RADICAL
RAINBOW RAM RAPIDLY RASP REALITY REALIZE REBOUND REBUILD RECEIPT RECEIVE RECITAL RECLAIM
RECOUNT RECOVER RECRUIT RECYCLE REFEREE REFLECT REFRESH REFUGEE REGULAR REIN REJOICE RELATED
RELEASE RELIEVE REMORSE REMOVAL REPLACE REPTILE REQUEST REQUIRE RESERVE RESOLVE RESPECT
RESPOND RESTORE RETREAT REUNION REVENGE REVERSE RIFT RIM RIND ROADWAY ROAM ROMANCE ROOFTOP
ROOK ROOSTER ROUTINE ROYALTY RUBBISH RUNAWAY RUNNING SAG SALVAGE SANDBOX SAP SAPLING SARDINE
SASH SATCHEL SATISFY SAUSAGE SAWDUST SCAB SCAM SCARLET SCATTER SCENERY SCHOLAR SCIENCE
SCOOTER SCRATCH SCRAWNY SCREECH SCUFFLE SEAFOOD SEAGULL SEASIDE SECTION SELFISH SEMINAR
SENATOR SERPENT SERVANT SERVICE SESSION SEVENTH SEVERAL SHALLOW SHAMPOO SHARPEN SHATTER
SHELTER SHERIFF SHINGLE SHINING SHOOTER SHRIVEL SHUDDER SHUFFLE SHUTTER SILENCE SILO SIMILAR
SINCERE SIXTEEN SKATING SKEW SKIPPER SKYLINE SLAVERY SLEEPER SLENDER SLITHER SLUMBER SMOTHER
SNEAKER SNIFFLE SNORKEL SNOWMAN SNUGGLE SOB SOCIETY SOLDIER SOMEDAY SOMEHOW SOMEONE SOWN SOY
SPANIEL SPARKLE SPARROW SPATULA SPEAKER SPECIAL SPECIES SPINACH SPINDLE SPINNER SPONSOR
SQUEEZE STADIUM STAGGER STAMINA STARTLE STATION STEALTH STEAMER STEEPLE STELLAR STENCIL
STERILE STICKER STIFFEN STINGER STOMACH STOPPER STORAGE STRANGE STRETCH STUDENT STUMBLE
STYLISH SUBJECT SUCCEED SUCCESS SUDS SUGGEST SUMMARY SUNBEAM SUNDIAL SUNRISE SUPPORT SUPPOSE
SUPREME SURFACE SURFING SURGEON SURGERY SURPASS SURPLUS SURVIVE SUSPECT SUSPEND SUSTAIN SWAB
SWAGGER SWALLOW SWEATER SWEEPER SWIFTLY SWIMMER SWOLLEN SYMPTOM TARP TEAK TOIL TOT TOTE TREK
TUFT VANE VAT VEER VET VIAL VICE VILE VOLE WANE WARD WARY WED WEE WHIM WISP WREN YAM YOKE
ZEAL
$lex$, '\s+')) as w
where w <> ''
on conflict (word) do update set band = excluded.band;

insert into app.exam_lexicon (word, band)
select w, 3
from unnest(regexp_split_to_array($lex$
APEX BARD BOON CUE DIM DIN DUD EEL ELF ELM FIR FONT GAL GLEE HAG HUSK JAB JIG JOT KALE KIN
LOAM MEAD MOW NAB NIP OBOE PEA PEG PUN RUNE RUSE RUT SILT SLY SOW TOW WAX WOE YAK YAP ZAP
ZEST
$lex$, '\s+')) as w
where w <> ''
on conflict (word) do update set band = excluded.band;

insert into app.exam_lexicon (word, band)
select w, 2
from unnest(regexp_split_to_array($lex$
AWE CUD FEN GNU HUE IRE OAF ORE RYE SOD TAD TUX URN YEN
$lex$, '\s+')) as w
where w <> ''
on conflict (word) do update set band = excluded.band;

-- --- Lock 1: refuse to apply a drifted seed -----------------------------------------

do $$
declare
  v_count integer;
  v_hash text;
begin
  select count(*),
         substr(
           encode(
             extensions.digest(
               convert_to(
                 coalesce(string_agg(word || ':' || band, ',' order by word collate "C"), ''),
                 'UTF8'
               ),
               'sha1'
             ),
             'hex'
           ),
           1, 16
         )
    into v_count, v_hash
  from app.exam_lexicon;

  if v_count <> 4091 or v_hash <> '428d7d7227fbf5cd' then
    raise exception
      'app.exam_lexicon seed does not match lexicon-child-en@v1 (% rows, hash %); '
      'expected 4091 rows and hash 428d7d7227fbf5cd',
      v_count, v_hash;
  end if;
end
$$;

set role app_owner;

-- ===================================================================================
-- 9. GB-WORDLADDER-01 — walk the submitted ladder
--
-- Port of verifyWordladder (verifiers/quantitative.ts). A ladder is legal iff it starts at
-- `content.start`, ends at `content.goal`, every rung is a lexicon word of the item's length,
-- and each consecutive pair differs in exactly one position. The bank's credit table is full
-- at `optimalRungs` and PARTIAL for a longer legal ladder, so a long legal climb is correct
-- with M-EFF below 1 — grading by equality with the stored optimum would mark correct
-- children wrong.
-- ===================================================================================

create function app.exam_verify_wordladder(p_item jsonb, p_response jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_content jsonb := coalesce(p_item -> 'content', '{}'::jsonb);
  v_start text := app.exam_vstr(v_content -> 'start');
  v_goal text := app.exam_vstr(v_content -> 'goal');
  v_word_length double precision := app.exam_vint(v_content -> 'wordLength');
  v_step_limit double precision := app.exam_vint(v_content -> 'stepLimit');
  v_submitted jsonb;
  v_entry jsonb;
  v_ladder text[] := '{}'::text[];
  v_rungs integer;
  v_word text;
  v_previous text;
  v_band smallint;
  v_rarest smallint := 7;
  v_changed integer;
  v_eff double precision;
  v_metrics jsonb;
begin
  -- TS: a lexicon that cannot be read fails CLOSED — no rung can be judged, so nothing can be
  -- credited. An empty table is that same condition.
  if not exists (select 1 from app.exam_lexicon) then
    return jsonb_build_object('correct', false);
  end if;

  if v_start is null or v_goal is null or v_word_length is null then
    return jsonb_build_object('correct', false);
  end if;

  v_submitted := app.exam_varr(p_response -> 'path');
  if v_submitted is null or jsonb_array_length(v_submitted) < 2 then
    return jsonb_build_object('correct', false);
  end if;
  for v_entry in select e from jsonb_array_elements(v_submitted) as e loop
    v_word := app.exam_vstr(v_entry);
    if v_word is null then
      return jsonb_build_object('correct', false);
    end if;
    v_ladder := v_ladder || upper(v_word);
  end loop;

  v_rungs := array_length(v_ladder, 1) - 1;
  if v_step_limit is not null and v_rungs > v_step_limit then
    return jsonb_build_object('correct', false);
  end if;
  if v_ladder[1] <> upper(v_start) then
    return jsonb_build_object('correct', false);
  end if;
  if v_ladder[v_rungs + 1] <> upper(v_goal) then
    return jsonb_build_object('correct', false);
  end if;

  for i in 1 .. array_length(v_ladder, 1) loop
    v_word := v_ladder[i];
    if char_length(v_word) <> v_word_length then
      return jsonb_build_object('correct', false);
    end if;
    select l.band into v_band from app.exam_lexicon l where l.word = v_word;
    if v_band is null then
      return jsonb_build_object('correct', false);
    end if;
    if v_band < v_rarest then
      v_rarest := v_band;
    end if;
    if i = 1 then
      continue;
    end if;
    v_previous := v_ladder[i - 1];
    v_changed := 0;
    for k in 1 .. v_word_length::integer loop
      if substr(v_previous, k, 1) <> substr(v_word, k, 1) then
        v_changed := v_changed + 1;
      end if;
    end loop;
    if v_changed <> 1 then
      return jsonb_build_object('correct', false);
    end if;
  end loop;

  v_metrics := jsonb_build_object('M-VOCABLVL', v_rarest);
  v_eff := app.exam_veff_quant(
    app.exam_vint(p_item -> 'answer' -> 'optimalRungs'), v_rungs::double precision
  );
  if v_eff is not null then
    v_metrics := v_metrics || jsonb_build_object('M-EFF', v_eff);
  end if;

  return jsonb_build_object('correct', true, 'metrics', v_metrics);
end
$$;

comment on function app.exam_verify_wordladder(jsonb, jsonb) is
  'GB-WORDLADDER-01; port of verifyWordladder (verifiers/quantitative.ts). Judges every rung '
  'against the server-only app.exam_lexicon (E-092) and every step for a single-letter '
  'change. A longer legal ladder is still CORRECT, with M-EFF below 1; only an illegal step, '
  'a non-word rung or a ladder that never reaches the goal scores zero.';

reset role;

-- ===================================================================================
-- 10. Grants: the same posture every other verifier has
--
-- pgTAP 123 treats a NULL proacl as a violation, so a function added here without both lines
-- fails the suite rather than shipping reachable by PUBLIC.
-- ===================================================================================

revoke execute on function app.exam_vnullish(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpair(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vtriple(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vcell(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vstrarray(jsonb) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vcell_key(double precision, double precision)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgrid_cell_index(
  integer, integer, double precision, double precision
) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgrid_seed(
  integer, integer, double precision, double precision
) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgrid_bfs_reach(integer, integer, boolean[], boolean[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_veff_spatial(double precision, double precision)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_veff_quant(double precision, double precision)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpipe_arms(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpipe_quarter_turns(text[], text[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_pipes(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_pathforge(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vcell3_normalise(double precision[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vcell3_key(double precision[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vcell3_rotate(double precision[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vcell3_rotation_keys(double precision[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_tangram(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpoly_normalise(integer[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpoly_key(integer[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpoly_transform(integer[], text)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpoly_orientation_keys(integer[], text[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_shapefit(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpunch_creases(double precision, text[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpunch_unfold(jsonb, double precision, double precision)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vpunch_cells(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_punch(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vols_slope(double precision[], double precision[])
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgate_replay(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgate_stored(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_gate(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgridcopy_read(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgridcopy_key(integer[], integer)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgridcopy_apply(
  integer[], integer, integer, integer, integer, integer
) from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgridcopy_singles(integer)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgridcopy_target(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_vgridcopy_target_unpruned(jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_gridcopy(jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_verify_wordladder(jsonb, jsonb)
  from public, anon, authenticated, service_role;

grant execute on function app.exam_vnullish(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vpair(jsonb) to api_executor;
grant execute on function app.exam_vtriple(jsonb) to api_executor;
grant execute on function app.exam_vcell(jsonb) to api_executor;
grant execute on function app.exam_vstrarray(jsonb) to api_executor;
grant execute on function app.exam_vcell_key(double precision, double precision) to api_executor;
grant execute on function app.exam_vgrid_cell_index(
  integer, integer, double precision, double precision
) to api_executor;
grant execute on function app.exam_vgrid_seed(
  integer, integer, double precision, double precision
) to api_executor;
grant execute on function app.exam_vgrid_bfs_reach(integer, integer, boolean[], boolean[])
  to api_executor;
grant execute on function app.exam_veff_spatial(double precision, double precision)
  to api_executor;
grant execute on function app.exam_veff_quant(double precision, double precision)
  to api_executor;
grant execute on function app.exam_vpipe_arms(jsonb) to api_executor;
grant execute on function app.exam_vpipe_quarter_turns(text[], text[]) to api_executor;
grant execute on function app.exam_verify_pipes(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_pathforge(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vcell3_normalise(double precision[]) to api_executor;
grant execute on function app.exam_vcell3_key(double precision[]) to api_executor;
grant execute on function app.exam_vcell3_rotate(double precision[]) to api_executor;
grant execute on function app.exam_vcell3_rotation_keys(double precision[]) to api_executor;
grant execute on function app.exam_verify_tangram(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vpoly_normalise(integer[]) to api_executor;
grant execute on function app.exam_vpoly_key(integer[]) to api_executor;
grant execute on function app.exam_vpoly_transform(integer[], text) to api_executor;
grant execute on function app.exam_vpoly_orientation_keys(integer[], text[]) to api_executor;
grant execute on function app.exam_verify_shapefit(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vpunch_creases(double precision, text[]) to api_executor;
grant execute on function app.exam_vpunch_unfold(jsonb, double precision, double precision)
  to api_executor;
grant execute on function app.exam_vpunch_cells(jsonb) to api_executor;
grant execute on function app.exam_verify_punch(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vols_slope(double precision[], double precision[])
  to api_executor;
grant execute on function app.exam_vgate_replay(jsonb) to api_executor;
grant execute on function app.exam_vgate_stored(jsonb) to api_executor;
grant execute on function app.exam_verify_gate(jsonb, jsonb) to api_executor;
grant execute on function app.exam_vgridcopy_read(jsonb) to api_executor;
grant execute on function app.exam_vgridcopy_key(integer[], integer) to api_executor;
grant execute on function app.exam_vgridcopy_apply(
  integer[], integer, integer, integer, integer, integer
) to api_executor;
grant execute on function app.exam_vgridcopy_singles(integer) to api_executor;
grant execute on function app.exam_vgridcopy_target(jsonb) to api_executor;
grant execute on function app.exam_vgridcopy_target_unpruned(jsonb) to api_executor;
grant execute on function app.exam_verify_gridcopy(jsonb, jsonb) to api_executor;
grant execute on function app.exam_verify_wordladder(jsonb, jsonb) to api_executor;

-- ===================================================================================
-- 11. Registry rows
--
-- One INSERT per ported type. Additive and conflict-free with any sibling migration, which is
-- exactly why the registry is a table rather than a CASE.
-- ===================================================================================

insert into app.exam_verifier_registry (type_code, verifier_fn, ported_from) values
  ('FLU-GRIDCOPY-01', 'exam_verify_gridcopy',
   'apps/web/src/lib/exam/verifiers/fluid.ts verifyGridCopy'),
  ('WM-gate-01', 'exam_verify_gate',
   'apps/web/src/lib/exam/verifiers/verbal.ts verifyGate'),
  ('SPA-PUNCH-01', 'exam_verify_punch',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyPunch'),
  ('SPA-TANGRAM-01', 'exam_verify_tangram',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyTangram'),
  ('GB-SHAPEFIT-01', 'exam_verify_shapefit',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyShapefit'),
  ('SPA-PIPES-01', 'exam_verify_pipes',
   'apps/web/src/lib/exam/verifiers/spatial.ts verifyPipes'),
  ('GB-PATHFORGE-01', 'exam_verify_pathforge',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyPathforge'),
  ('GB-WORDLADDER-01', 'exam_verify_wordladder',
   'apps/web/src/lib/exam/verifiers/quantitative.ts verifyWordladder')
on conflict (type_code) do nothing;
