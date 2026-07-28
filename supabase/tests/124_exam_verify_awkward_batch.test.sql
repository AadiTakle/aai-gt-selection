-- The eight awkward per-type verifiers (D-027,
-- 20260725183000_exam_verify_awkward_batch.sql) and the server-only lexicon they needed.
--
-- Four things are proved here, in this order:
--   1. LEXICON FIREWALL — app.exam_lexicon is reachable only from api_executor, by grant AND
--      at runtime, and it is not empty, so the assertions are not vacuous. It carries the
--      judgement GB-WORDLADDER-01 measures, so it has to be exactly as unreachable from a
--      browser as app.exam_item.answer_key is (E-092).
--   2. NO SILENT DRIFT — the seeded rows still hash to lexicon-child-en@v1's own
--      lexiconHash(), 428d7d7227fbf5cd, which is also the hash every GB-WORDLADDER-01 bank
--      item records in answer.equivalence.lexiconHash.
--   3. RESOLUTION — the dispatcher routes all eight type codes to the ported functions.
--   4. SEMANTICS — pinned verdicts and metric maps for each of the eight, including the
--      FLU-GRIDCOPY-01 search agreeing with its own un-memoised transcription, the negative
--      M-UPDATECOST slope, and the SPA-PIPES-01 bug that is reproduced rather than fixed.
--
-- Parity across the REAL banks is not provable in pgTAP, because it needs both
-- implementations in one process. `pnpm exam:verify:diff` does that; this file pins the
-- contract that harness relies on.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(43);

grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures ----------------------------------------------

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values
  ('FLU-GRIDCOPY-01', 'fluid_reasoning', 'Grid Copy', 'FLU-GRIDCOPY-01.html', array['M-ACC']),
  ('WM-gate-01', 'spatial', 'Gate Parade', 'WM-gate-01.html', array['M-ACC']),
  ('SPA-PUNCH-01', 'spatial', 'Fold And Punch', 'SPA-PUNCH-01.html', array['M-ACC']),
  ('SPA-TANGRAM-01', 'spatial', 'Tangram', 'SPA-TANGRAM-01.html', array['M-ACC']),
  ('GB-SHAPEFIT-01', 'spatial', 'Shape Fit', 'GB-SHAPEFIT-01.html', array['M-ACC']),
  ('SPA-PIPES-01', 'spatial', 'Pipes', 'SPA-PIPES-01.html', array['M-ACC']),
  ('GB-PATHFORGE-01', 'spatial', 'Path Forge', 'GB-PATHFORGE-01.html', array['M-ACC']),
  ('GB-WORDLADDER-01', 'verbal', 'Letter Climb', 'GB-WORDLADDER-01.html', array['M-ACC'])
on conflict (type_code) do nothing;

-- FLU-GRIDCOPY-01. Two worked examples of "shift everything up one row" over a 1-colour
-- palette, so the op grammar's consistent programs all predict one probe output and the
-- stored answer.targetGrid is never consulted.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0001',
  'FLU-GRIDCOPY-01', 'fluid_reasoning', 4.0, array['2-3'],
  jsonb_build_object(
    'paletteSize', 1,
    'examples', jsonb_build_array(
      jsonb_build_object(
        'input', '[[0,0,1],[0,0,0],[1,0,0]]'::jsonb,
        'output', '[[0,0,0],[1,0,0],[0,0,0]]'::jsonb
      ),
      jsonb_build_object(
        'input', '[[0,0,0],[0,0,0],[0,1,1]]'::jsonb,
        'output', '[[0,0,0],[0,1,1],[0,0,0]]'::jsonb
      )
    ),
    'probeInput', '[[1,0,0],[0,0,0],[0,0,1]]'::jsonb
  ),
  jsonb_build_object('correctKey', '000/001/000', 'targetGrid', '[[9,9,9],[9,9,9],[9,9,9]]'::jsonb),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- WM-gate-01, numeric_running shell. Two checkpoints with DIFFERENT k, which is what makes
-- M-UPDATECOST estimable from one administration.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0002',
  'WM-gate-01', 'spatial', 6.0, array['4-5'],
  jsonb_build_object(
    'shell', 'numeric_running',
    'presentation', jsonb_build_object(
      'events', jsonb_build_array(
        jsonb_build_object('index', 0, 'kind', 'set', 'value', 5),
        jsonb_build_object('index', 1, 'kind', 'add', 'value', 3),
        jsonb_build_object('index', 2, 'kind', 'add', 'value', 1),
        jsonb_build_object('index', 3, 'kind', 'add', 'value', 2)
      ),
      'probes', jsonb_build_array(
        jsonb_build_object('probeIndex', 1, 'afterEventIndex', 1, 'k', 2),
        jsonb_build_object('probeIndex', 2, 'afterEventIndex', 3, 'k', 3)
      )
    )
  ),
  jsonb_build_object('correctKey', 'p1:v8|p2:v11'),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- SPA-PUNCH-01. One horizontal fold on a 4x4 sheet, one punch: the hole at (0,3) mirrors back
-- across the crease at y = 2 to (0,0).
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0003',
  'SPA-PUNCH-01', 'spatial', 5.0, array['2-3'],
  jsonb_build_object(
    'grid', jsonb_build_object('n', 4),
    'folds', jsonb_build_array(jsonb_build_object('op', 'T')),
    'punches', jsonb_build_array(jsonb_build_object('x', 0, 'y', 3))
  ),
  jsonb_build_object('correctKey', '0,0|0,3'),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- SPA-TANGRAM-01. A four-cell outline, a tray of three pieces of which one is a herring.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0004',
  'SPA-TANGRAM-01', 'spatial', 4.0, array['2-3'],
  jsonb_build_object(
    'target', jsonb_build_object('cells', '[[0,0,1],[0,1,1],[0,1,2],[0,2,1]]'::jsonb),
    'tray', jsonb_build_array(
      jsonb_build_object('id', 0, 'offsets', '[[0,0,0],[0,1,0],[0,2,0]]'::jsonb),
      jsonb_build_object('id', 1, 'offsets', '[[0,0,0]]'::jsonb),
      jsonb_build_object('id', 2, 'offsets', '[[0,0,0],[0,0,1],[0,1,1]]'::jsonb)
    )
  ),
  jsonb_build_object('correctKey', '4', 'optimalPlacements', 2),
  jsonb_build_object('mode', 'deterministic_key'),
  '{}'::jsonb
);

-- GB-SHAPEFIT-01. A six-cell silhouette, rotate-only instruction set.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0005',
  'GB-SHAPEFIT-01', 'spatial', 5.0, array['2-3'],
  jsonb_build_object(
    'target', jsonb_build_object('cells', '[[0,2],[0,3],[1,3],[2,1],[2,2],[2,3]]'::jsonb),
    'tray', jsonb_build_array(
      jsonb_build_object('id', 0, 'cells', '[[0,1],[1,0],[1,1]]'::jsonb),
      jsonb_build_object('id', 2, 'cells', '[[0,0],[1,0],[2,0]]'::jsonb)
    ),
    'instructionSet', jsonb_build_object('ops', jsonb_build_array('rotate'))
  ),
  jsonb_build_object('correctKey', '6', 'cost', jsonb_build_object('moves', 6)),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- SPA-PIPES-01. A one-row board: three straight tiles served vertically, each a single
-- quarter turn from the horizontal road that joins the car to the flag.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0006',
  'SPA-PIPES-01', 'spatial', 4.0, array['2-3'],
  jsonb_build_object(
    'grid', jsonb_build_object('R', 1, 'C', 3),
    'start', '[0,0]'::jsonb,
    'goal', '[0,2]'::jsonb,
    'gems', '[]'::jsonb,
    'tiles', jsonb_build_array(
      jsonb_build_object('r', 0, 'c', 0, 'dirs', jsonb_build_array('N', 'S')),
      jsonb_build_object('r', 0, 'c', 1, 'dirs', jsonb_build_array('N', 'S')),
      jsonb_build_object('r', 0, 'c', 2, 'dirs', jsonb_build_array('N', 'S'))
    )
  ),
  jsonb_build_object('correctKey', '3', 'optimalRot', 3),
  jsonb_build_object('mode', 'deterministic_key'),
  '{}'::jsonb
);

-- GB-PATHFORGE-01. A 1x3 board: one straight tile between the hut and the flag.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0007',
  'GB-PATHFORGE-01', 'spatial', 5.0, array['2-3'],
  jsonb_build_object(
    'grid', jsonb_build_object('R', 1, 'C', 3),
    'start', '[0,0]'::jsonb,
    'goal', '[0,2]'::jsonb,
    'blocked', '[]'::jsonb,
    'coins', '[]'::jsonb,
    'tileBudget', 4
  ),
  jsonb_build_object('correctKey', '1', 'optimalTiles', 1),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- GB-WORDLADDER-01. The shortest ladder in the bank: one rung.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0008',
  'GB-WORDLADDER-01', 'verbal', 4.0, array['4-5'],
  jsonb_build_object('start', 'CAR', 'goal', 'CAT', 'wordLength', 3, 'stepLimit', 20),
  jsonb_build_object('correctKey', '1', 'optimalRungs', 1),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- --- 1. The lexicon firewall (E-092) -------------------------------------------------

select ok(
  not has_column_privilege('anon', 'app.exam_lexicon', 'word', 'select'),
  'anon holds no SELECT on app.exam_lexicon.word');                                     -- 1
select ok(
  not has_column_privilege('authenticated', 'app.exam_lexicon', 'word', 'select'),
  'authenticated holds no SELECT on app.exam_lexicon.word');                            -- 2
select ok(
  not has_column_privilege('service_role', 'app.exam_lexicon', 'band', 'select'),
  'service_role holds no SELECT on app.exam_lexicon.band');                             -- 3
select ok(
  has_table_privilege('api_executor', 'app.exam_lexicon', 'select'),
  'api_executor CAN read the lexicon — the same posture app.exam_item.answer_key has');  -- 4
select is(
  (
    select count(*)::integer
    from pg_class c
    cross join lateral aclexplode(c.relacl) a
    left join pg_roles r on r.oid = a.grantee
    where c.oid = 'app.exam_lexicon'::regclass
      and (a.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
  ),
  0,
  'the lexicon ACL grants nothing to PUBLIC, anon, authenticated or service_role'
);                                                                                      -- 5
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class
   where oid = 'app.exam_lexicon'::regclass),
  'row-level security is enabled AND forced on the lexicon, so the owner is bound too'
);                                                                                      -- 6
select is(
  (
    select array_agg(polname order by polname)::text
    from pg_policy where polrelid = 'app.exam_lexicon'::regclass
  ),
  '{exam_lexicon_read}',
  'the lexicon carries exactly one policy, the api_executor read'
);                                                                                      -- 7

set local role anon;
select throws_ok(
  'select word from app.exam_lexicon',
  '42501', 'permission denied for schema app',
  'anon is hard-denied a direct read of the lexicon at runtime'
);                                                                                      -- 8
reset role;
set local role authenticated;
select throws_ok(
  'select word from app.exam_lexicon',
  '42501', 'permission denied for schema app',
  'authenticated is hard-denied a direct read of the lexicon at runtime'
);                                                                                      -- 9
reset role;

-- --- 2. Anti-vacuity and the drift lock ----------------------------------------------

select is(
  (select count(*)::integer from app.exam_lexicon),
  4091,
  'the lexicon really is seeded (assertions 1-9 are not passing against an empty table)'
);                                                                                      -- 10
select is(
  (
    select substr(
      encode(
        extensions.digest(
          convert_to(string_agg(word || ':' || band, ',' order by word collate "C"), 'UTF8'),
          'sha1'
        ),
        'hex'
      ),
      1, 16
    )
    from app.exam_lexicon
  ),
  '428d7d7227fbf5cd',
  'the seed still hashes to lexicon-child-en@v1, the hash the banks themselves record'
);                                                                                      -- 11

-- --- 3. Resolution: the dispatcher reaches all eight ported verifiers -----------------

select is(
  (
    select array_agg(verifier_fn order by verifier_fn)::text
    from app.exam_verifier_registry
    where type_code in (
      'FLU-GRIDCOPY-01', 'WM-gate-01', 'SPA-PUNCH-01', 'SPA-TANGRAM-01',
      'GB-SHAPEFIT-01', 'SPA-PIPES-01', 'GB-PATHFORGE-01', 'GB-WORDLADDER-01'
    )
  ),
  '{exam_verify_gate,exam_verify_gridcopy,exam_verify_pathforge,exam_verify_pipes,'
    || 'exam_verify_punch,exam_verify_shapefit,exam_verify_tangram,exam_verify_wordladder}',
  'all eight type codes are registered to their ported plpgsql verifier'
);                                                                                      -- 12
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b0001', '{}'::jsonb) ->> 'verifier',
  'exam_verify_gridcopy',
  'FLU-GRIDCOPY-01 resolves to the ported program-search verifier'
);                                                                                      -- 13
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b0008', '{}'::jsonb) ->> 'verifier',
  'exam_verify_wordladder',
  'GB-WORDLADDER-01 resolves to the ported ladder verifier'
);                                                                                      -- 14

-- --- 4a. FLU-GRIDCOPY-01: the search, and that memoising it changed nothing ----------

select is(
  app.exam_vgridcopy_key(
    app.exam_vgridcopy_target(
      (select content from app.exam_item where item_id = '00000000-0000-4000-8000-0000000b0001')
    ),
    0
  ),
  '000/001/000',
  'the op-grammar search derives the probe output the worked examples force'
);                                                                                      -- 15
select is(
  app.exam_vgridcopy_key(
    app.exam_vgridcopy_target_unpruned(
      (select content from app.exam_item where item_id = '00000000-0000-4000-8000-0000000b0001')
    ),
    0
  ),
  '000/001/000',
  'the un-memoised transcription of deriveGridTarget derives the same output'
);                                                                                      -- 16

-- The memoisation is a cache of each two-op program's first stage, so it can only be sound if
-- the two agree on EVERY shape of item, not just the one above. Palette sizes 1, 2 and 3 span
-- the bank, and the last case is deliberately UNIDENTIFIABLE — a symmetric worked example
-- every reflection reproduces, so the consistent programs disagree about the probe and both
-- functions must answer null rather than pick one.
select is(
  (
    select count(*)::integer
    from (values
      (('{"paletteSize":1,"probeInput":[[1,0],[0,0]],'
        || '"examples":[{"input":[[0,1],[0,0]],"output":[[1,0],[0,0]]}]}')::jsonb),
      (('{"paletteSize":2,"probeInput":[[1,2],[0,0]],'
        || '"examples":[{"input":[[1,2],[0,0]],"output":[[2,1],[0,0]]},'
        || '{"input":[[0,1],[2,0]],"output":[[1,0],[0,2]]}]}')::jsonb),
      (('{"paletteSize":3,"probeInput":[[1,0,3],[0,2,0],[0,0,0]],'
        || '"examples":[{"input":[[1,0,0],[0,2,0],[0,0,3]],'
        || '"output":[[0,0,1],[0,2,0],[3,0,0]]}]}')::jsonb),
      (('{"paletteSize":2,"probeInput":[[1,0],[0,0]],'
        || '"examples":[{"input":[[1,1],[1,1]],"output":[[1,1],[1,1]]}]}')::jsonb)
    ) as t(content)
    where app.exam_vgridcopy_target(content)
      is not distinct from app.exam_vgridcopy_target_unpruned(content)
  ),
  4,
  'memoised and un-memoised search agree on every palette size, identified or not'
);                                                                                      -- 17
select is(
  app.exam_vgridcopy_target(
    ('{"paletteSize":2,"probeInput":[[1,0],[0,0]],'
      || '"examples":[{"input":[[1,1],[1,1]],"output":[[1,1],[1,1]]}]}')::jsonb
  )::text,
  null,
  'a worked example that every reflection satisfies identifies nothing, and the search '
    'says so instead of picking one — which is what makes answer.targetGrid a fallback'
);                                                                                      -- 18

select set_config(
  'test.gridcopy',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0001',
    '{"finalGrid":[[0,0,0],[0,0,1],[0,0,0]]}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.gridcopy')::jsonb) ->> 'correct',
  'true',
  'FLU-GRIDCOPY-01: the derived grid scores correct, and the stored targetGrid is not used'
);                                                                                      -- 19
select is(
  (current_setting('test.gridcopy')::jsonb) #>> '{metrics,M-POLY}',
  '1',
  'FLU-GRIDCOPY-01: M-POLY is 1 on an exact copy'
);                                                                                      -- 20
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0001', '{"finalGridKey":"000/001/000"}'::jsonb
  ) ->> 'correct',
  'true',
  'FLU-GRIDCOPY-01: the serialised grid string is read the same way as the array'
);                                                                                      -- 21
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0001', '{"finalGridKey":"00x/001/000"}'::jsonb
  ) ->> 'correct',
  'false',
  'FLU-GRIDCOPY-01: one non-digit makes the whole submitted grid unreadable'
);                                                                                      -- 22

-- --- 4b. WM-gate-01: the running total, and a NEGATIVE update-cost slope --------------

select set_config(
  'test.gate_ok',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0002',
    '{"probes":[{"probeIndex":1,"keys":["v8"]},{"probeIndex":2,"keys":["v11"]}]}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.gate_ok')::jsonb) ->> 'correct',
  'true',
  'WM-gate-01: the running total replayed from the stream is the key'
);                                                                                      -- 23
select is(
  (current_setting('test.gate_ok')::jsonb) #>> '{metrics,M-UPDATECOST}',
  '0',
  'WM-gate-01: two checkpoints answered equally well give a flat slope, not no slope'
);                                                                                      -- 24
select set_config(
  'test.gate_slip',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0002',
    '{"probes":[{"probeIndex":1,"keys":["v8"]},{"probeIndex":2,"keys":["v9"]}]}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.gate_slip')::jsonb) #>> '{metrics,M-POLY}',
  '0.5',
  'WM-gate-01: one checkpoint of two is half the summed units, not a failure'
);                                                                                      -- 25
select is(
  (current_setting('test.gate_slip')::jsonb) #>> '{metrics,M-UPDATECOST}',
  '-1',
  'WM-gate-01: accuracy falling as k widens is a NEGATIVE slope, rounded JavaScript-style'
);                                                                                      -- 26

-- --- 4c. SPA-PUNCH-01: the reverse unfold and the mirror flag -------------------------

select set_config(
  'test.punch_ok',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0003', '{"markedCells":[[0,3],[0,0]]}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.punch_ok')::jsonb) ->> 'correct',
  'true',
  'SPA-PUNCH-01: the punch reverse-unfolds across the crease to a second hole'
);                                                                                      -- 27
select is(
  (current_setting('test.punch_ok')::jsonb) #>> '{metrics,M-MIRRORFA}',
  '0',
  'SPA-PUNCH-01: the exactly right set is never a mirror false alarm'
);                                                                                      -- 28
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0003', '{"markedCells":[[3,0],[0,0]]}'::jsonb
  ) #>> '{metrics,M-MIRRORFA}',
  '1',
  'SPA-PUNCH-01: the whole pattern reflected in the diagonal is flagged as a chirality slip'
);                                                                                      -- 29

-- --- 4d. SPA-TANGRAM-01 and GB-SHAPEFIT-01: the orientation closures ------------------

select set_config(
  'test.tangram',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0004',
    ('{"placements":[{"id":0,"cells":[[0,0,1],[0,1,1],[0,2,1]]},'
      || '{"id":1,"cells":[[0,1,2]]}]}')::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.tangram')::jsonb) ->> 'correct',
  'true',
  'SPA-TANGRAM-01: a cover that leaves the herring piece in the tray is still correct'
);                                                                                      -- 30
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0004',
    '{"placements":[{"id":0,"cells":[[0,0,1],[0,1,1],[0,2,1]]}]}'::jsonb
  ) #>> '{metrics,M-POLY}',
  '0.75',
  'SPA-TANGRAM-01: an incomplete but legal cover keeps its covered fraction'
);                                                                                      -- 31
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0005',
    ('{"assembly":[{"id":0,"cells":[[0,2],[0,3],[1,3]]},'
      || '{"id":2,"cells":[[2,1],[2,2],[2,3]]}],"cost":{"moves":6}}')::jsonb
  ) ->> 'correct',
  'true',
  'GB-SHAPEFIT-01: an exact cover in orientations the rotate-only op set can reach'
);                                                                                      -- 32
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0005',
    '{"assembly":[{"id":2,"cells":[[0,2],[0,3],[1,3]]}],"cost":{"moves":6}}'::jsonb
  ) -> 'metrics')::text,
  '{}',
  'GB-SHAPEFIT-01: a shape no rotation of the piece can reach fails closed, with no metrics'
);                                                                                      -- 33

-- --- 4e. SPA-PIPES-01 and GB-PATHFORGE-01: the shared flood ---------------------------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0006',
    ('{"finalOrients":[{"r":0,"c":0,"dirs":["E","W"]},{"r":0,"c":1,"dirs":["E","W"]},'
      || '{"r":0,"c":2,"dirs":["E","W"]}]}')::jsonb
  ) ->> 'correct',
  'true',
  'SPA-PIPES-01: three legal quarter turns connect the car to the flag'
);                                                                                      -- 34

-- REPRODUCED, NOT FIXED (inventory §8.5). verifyPipes requires a W arm at the car and an E
-- arm at the flag no matter where the item put them, so a road that genuinely connects TOP TO
-- BOTTOM is graded wrong. The port has to agree with the app tier, and this assertion is what
-- would notice if someone quietly "fixed" one side.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b0009',
  'SPA-PIPES-01', 'spatial', 4.0, array['2-3'],
  jsonb_build_object(
    'grid', jsonb_build_object('R', 3, 'C', 1),
    'start', '[0,0]'::jsonb, 'goal', '[2,0]'::jsonb, 'gems', '[]'::jsonb,
    'tiles', jsonb_build_array(
      jsonb_build_object('r', 0, 'c', 0, 'dirs', jsonb_build_array('N', 'S')),
      jsonb_build_object('r', 1, 'c', 0, 'dirs', jsonb_build_array('N', 'S')),
      jsonb_build_object('r', 2, 'c', 0, 'dirs', jsonb_build_array('N', 'S'))
    )
  ),
  jsonb_build_object('correctKey', '0', 'optimalRot', 0),
  jsonb_build_object('mode', 'deterministic_key'),
  '{}'::jsonb
);
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0009',
    ('{"finalOrients":[{"r":0,"c":0,"dirs":["N","S"]},{"r":1,"c":0,"dirs":["N","S"]},'
      || '{"r":2,"c":0,"dirs":["N","S"]}]}')::jsonb
  ) ->> 'correct',
  'false',
  'SPA-PIPES-01: a connected NORTH-SOUTH road is graded wrong, reproducing the TS bug'
);                                                                                      -- 35

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0007',
    '{"finalBoard":[{"r":0,"c":1,"dirs":["E","W"]}]}'::jsonb
  ) ->> 'correct',
  'true',
  'GB-PATHFORGE-01: one tile between two omnidirectional ports joins the hut to the flag'
);                                                                                      -- 36
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0007',
    '{"finalBoard":[{"r":0,"c":0,"dirs":["E","W"]}]}'::jsonb
  ) -> 'metrics')::text,
  '{}',
  'GB-PATHFORGE-01: a tile dropped on the hut is an illegal board, rejected with no metrics'
);                                                                                      -- 37

-- --- 4f. GB-WORDLADDER-01, and that no verdict leaks a lexicon word -------------------

select set_config(
  'test.ladder_ok',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0008', '{"path":["CAR","CAT"]}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.ladder_ok')::jsonb) #>> '{metrics,M-EFF}',
  '1',
  'GB-WORDLADDER-01: the optimal ladder is full credit at M-EFF 1'
);                                                                                      -- 38
select set_config(
  'test.ladder_long',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0008', '{"path":["CAR","CAT","BAT","CAT"]}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.ladder_long')::jsonb) ->> 'correct',
  'true',
  'GB-WORDLADDER-01: a LONGER legal climb is still correct, not a failure'
);                                                                                      -- 39
select is(
  (current_setting('test.ladder_long')::jsonb) #>> '{metrics,M-VOCABLVL}',
  '6',
  'GB-WORDLADDER-01: M-VOCABLVL is the RAREST band the ladder stepped through'
);                                                                                      -- 40
select cmp_ok(
  ((current_setting('test.ladder_long')::jsonb) #>> '{metrics,M-EFF}')::numeric,
  '<', 1::numeric,
  'GB-WORDLADDER-01: the detour costs efficiency, which is where the length is scored'
);                                                                                      -- 41
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b0008', '{"path":["CAR","CAZ","CAT"]}'::jsonb
  ) ->> 'correct',
  'false',
  'GB-WORDLADDER-01: a rung the lexicon does not hold scores zero'
);                                                                                      -- 42

-- The verdict is the only thing that crosses back out of the schema, so it must not carry a
-- word, a band, or anything else recoverable from the lexicon.
select ok(
  (
    app.exam_verify_response(
      '00000000-0000-4000-8000-0000000b0008', '{"path":["CAR","CAT"]}'::jsonb
    )::text
    || app.exam_verify_response(
      '00000000-0000-4000-8000-0000000b0008', '{"path":["CAR","CAZ","CAT"]}'::jsonb
    )::text
  ) !~ '(CAR|CAT|BAT|lexicon|optimalPath|optimalRungs|correctKey)',
  'no ladder verdict returns a lexicon word, the stored ladder, or the key'
);                                                                                      -- 43

select * from finish();

rollback;
