-- The moderate per-type verifiers ported in 20260725181742_exam_verify_moderate_batch.sql
-- (D-027, E-091), less FLU-MATRIXBUILD-01, whose type was retired and whose verifier was
-- dropped in 20260729190000_exam_verify_retire_types.sql.
--
-- Three things are proved here, in this order:
--   1. DISPATCH — each of the eight surviving type codes resolves to its own plpgsql verifier
--      rather than falling through to the keyed default.
--   2. THE PART OF EACH PORT THAT IS EASY TO GET WRONG — the repetition-signature relabelling,
--      adjacent-pair credit (which is NOT positional overlap), the wordforge threshold, the
--      SIMULTANEOUS per-phase swap permutation, the cross-product comparator plus the
--      nearest-card check, a legal detour through a gem, the crash abort that emits NO metrics
--      at all, and the pointing error. Each fixture is chosen so that the obvious wrong
--      implementation gives a different answer.
--   3. THE TWO DEFECTS THIS BATCH PRESERVES ON PURPOSE (inventory section 8.3 and 8.4), pinned
--      so that a later "tidy-up" cannot change scoring semantics without failing a test and
--      going back to the owner.
--
-- Parity across the REAL banks is not provable in pgTAP, because it needs both implementations
-- in one process. `pnpm exam:verify:diff` does that for every served type; this file pins
-- the contract that harness relies on. Assertion 32 keeps the firewall assertions honest.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(34);

grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures ----------------------------------------------

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values
  ('CX-check-01', 'fluid_reasoning', 'Check Twice', 'CX-check-01.html', array['M-ACC']),
  ('VER-SENSE-01', 'verbal', 'Sentence Sense', 'VER-SENSE-01.html', array['M-ACC']),
  ('GB-WORDFORGE-01', 'verbal', 'Word Forge', 'GB-WORDFORGE-01.html', array['M-ACC']),
  ('GB-TRACK-01', 'spatial', 'Firefly Track', 'GB-TRACK-01.html', array['M-ACC']),
  ('SPA-SCENE-01', 'spatial', 'Robot Scene', 'SPA-SCENE-01.html', array['M-ACC']),
  ('SPA-MAZE-01', 'spatial', 'Gem Maze', 'SPA-MAZE-01.html', array['M-ACC']),
  ('GB-ROBOPATH-01', 'spatial', 'Robot Path', 'GB-ROBOPATH-01.html', array['M-ACC']),
  ('GB-EXPLORE-01', 'spatial', 'Foggy Map', 'GB-EXPLORE-01.html', array['M-ACC'])
on conflict (type_code) do nothing;

-- CX-check-01. Four tiles, two bins. `answer.trueBin` is DELIBERATELY ABSENT so the verdict can
-- only come from the repetition signature: "NGG" canonicalises to ABB and therefore belongs in
-- b0, even though the sorter dropped it in b1. That planted slip is the only one.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b2001',
  'CX-check-01', 'fluid_reasoning', 3.0, array['K-1'],
  jsonb_build_object(
    'bins', jsonb_build_array(
      jsonb_build_object('key', 'b0', 'pattern', 'ABB'),
      jsonb_build_object('key', 'b1', 'pattern', 'AAA')
    ),
    'tokens', jsonb_build_array(
      jsonb_build_object('id', 't0', 'text', 'ZRR', 'bin', 'b0'),
      jsonb_build_object('id', 't1', 'text', 'WWW', 'bin', 'b1'),
      jsonb_build_object('id', 't2', 'text', 'NGG', 'bin', 'b1'),
      jsonb_build_object('id', 't3', 'text', 'XXX', 'bin', 'b1')
    )
  ),
  jsonb_build_object('correctKey', 't0:b0|t1:b1|t2:b0|t3:b1'),
  jsonb_build_object('mode', 'deterministic_key'),
  '{}'::jsonb
);

-- VER-SENSE-01. The target permutation is re-derived from the derivation's true word order,
-- so it is [2, 0, 1] whatever the stored key says.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b2003',
  'VER-SENSE-01', 'verbal', 4.0, array['2-3'],
  jsonb_build_object(
    'cards', jsonb_build_array(
      jsonb_build_object('text', 'ate'),
      jsonb_build_object('text', 'bone'),
      jsonb_build_object('text', 'dog')
    )
  ),
  jsonb_build_object('correctKey', '2,0,1'),
  jsonb_build_object('mode', 'computed_solver'),
  jsonb_build_object(
    'derivation', jsonb_build_object('trueOrder', jsonb_build_array('dog', 'ate', 'bone'))
  )
);

-- GB-WORDFORGE-01, two shells of the same type: one with a threshold, one without.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values
  (
    '00000000-0000-4000-8000-0000000b2004',
    'GB-WORDFORGE-01', 'verbal', 5.0, array['2-3'],
    jsonb_build_object('rack', jsonb_build_array('T', 'E', 'A'), 'minWordLength', 3),
    jsonb_build_object(
      'correctKey', '3',
      'referenceTarget', 2,
      'validWords', jsonb_build_array(
        jsonb_build_object('word', 'ATE', 'band', 6),
        jsonb_build_object('word', 'TEA', 'band', 5),
        jsonb_build_object('word', 'EAT', 'band', 7)
      )
    ),
    jsonb_build_object('mode', 'computed_solver'),
    '{}'::jsonb
  ),
  (
    -- Same rack, NO referenceTarget: the item that exposes the preserved defect.
    '00000000-0000-4000-8000-0000000b2005',
    'GB-WORDFORGE-01', 'verbal', 5.0, array['2-3'],
    jsonb_build_object('rack', jsonb_build_array('T', 'E', 'A'), 'minWordLength', 3),
    jsonb_build_object(
      'correctKey', '3',
      'validWords', jsonb_build_array(
        jsonb_build_object('word', 'ATE', 'band', 6),
        jsonb_build_object('word', 'TEA', 'band', 5),
        jsonb_build_object('word', 'EAT', 'band', 7)
      )
    ),
    jsonb_build_object('mode', 'computed_solver'),
    '{}'::jsonb
  );

-- GB-TRACK-01. One phase whose two swaps SHARE slot 1, which is the only shape that tells the
-- two readings apart. Applied simultaneously against a snapshot of [0,1,2,3] the phase yields
-- [1,2,1,3], so the jar the child was told to watch (jar 1) ends in slot 2. Applied
-- sequentially it would yield [1,2,0,3] and jar 1 would end in slot 0.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b2006',
  'GB-TRACK-01', 'spatial', 6.0, array['2-3'],
  jsonb_build_object(
    'jarCount', 4,
    'initialTargets', jsonb_build_array(1),
    'motion', jsonb_build_object(
      'phases', jsonb_build_array(
        jsonb_build_object('swaps', jsonb_build_array(
          jsonb_build_array(0, 1), jsonb_build_array(1, 2)
        ))
      )
    )
  ),
  jsonb_build_object('correctKey', '1', 'cost', jsonb_build_object('taps', 1)),
  jsonb_build_object('mode', 'computed_solver', 'partialCredit', true),
  '{}'::jsonb
);

-- SPA-SCENE-01. Robot at (0, 2) looking down the -y axis at three cards. The cross-product
-- comparator puts them in the order 0, 2, 1 — which is neither the array order nor the order
-- by x, so a port that skipped the comparator would fail. Card 2 is the nearest.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b2007',
  'SPA-SCENE-01', 'spatial', 8.0, array['4-5'],
  jsonb_build_object(
    'scene', jsonb_build_object(
      'robot', jsonb_build_object('x', 0, 'y', 2),
      'objects', jsonb_build_array(
        jsonb_build_object('id', 0, 'x', -1, 'y', 0),
        jsonb_build_object('id', 1, 'x', 1, 'y', 0),
        jsonb_build_object('id', 2, 'x', 0, 'y', 0)
      )
    ),
    'question', jsonb_build_object('requireNearest', true)
  ),
  jsonb_build_object('correctKey', '0>2>1', 'correctOrder', jsonb_build_array(0, 2, 1), 'nearestId', 2),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- SPA-MAZE-01. A 2x2 maze with a gem off the direct route, so the only legal solving walk
-- doubles back and is LONGER than the direct one. Grading by equality with a stored optimum
-- would mark it wrong; grading it as a legal walk marks it right with full M-EFF.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b2008',
  'SPA-MAZE-01', 'spatial', 4.0, array['2-3'],
  jsonb_build_object(
    'start', jsonb_build_array(0, 0),
    'goal', jsonb_build_array(1, 1),
    'openEdges', jsonb_build_array('0,0-0,1', '0,1-1,1', '0,0-1,0'),
    'gems', jsonb_build_array(jsonb_build_array(1, 0))
  ),
  jsonb_build_object('correctKey', '4', 'optimalLength', 4),
  jsonb_build_object('mode', 'deterministic_key'),
  '{}'::jsonb
);

-- GB-ROBOPATH-01. 3x3, robot at (1,0) facing east, one key at (1,1), door at (0,2).
-- F F L F is the four-action optimum; a fifth F runs off the east edge.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b2009',
  'GB-ROBOPATH-01', 'spatial', 5.0, array['2-3'],
  jsonb_build_object(
    'grid', jsonb_build_object('R', 3, 'C', 3),
    'start', jsonb_build_object('r', 1, 'c', 0, 'h', 'E'),
    'door', jsonb_build_array(0, 2),
    'walls', jsonb_build_array(),
    'keys', jsonb_build_array(jsonb_build_array(1, 1)),
    'instructionSet', jsonb_build_object('repeat', jsonb_build_object('enabled', true, 'maxReps', 2)),
    'limits', jsonb_build_object('maxProgramTokens', 36)
  ),
  jsonb_build_object('correctKey', '4', 'cost', jsonb_build_object('actions', 4, 'tokens', 3)),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- GB-EXPLORE-01. 2x2, home (0,0), one landmark at (0,1). Out and back is two moves, the
-- optimum. The landmark lies due east of home, so its true bearing is 90 degrees.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000b2010',
  'GB-EXPLORE-01', 'spatial', 5.0, array['2-3'],
  jsonb_build_object(
    'grid', jsonb_build_object('R', 2, 'C', 2),
    'home', jsonb_build_array(0, 0),
    'blocked', jsonb_build_array(),
    'landmarks', jsonb_build_array(jsonb_build_object('id', 'L1', 'label', 'TREE', 'r', 0, 'c', 1))
  ),
  jsonb_build_object('correctKey', '2', 'optimalTotalMoves', 2),
  jsonb_build_object('mode', 'computed_solver'),
  '{}'::jsonb
);

-- --- 1. Dispatch: eight type codes, eight verifiers ----------------------------------

select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2001', '{}'::jsonb) ->> 'verifier',
  'exam_verify_check_twice', 'CX-check-01 resolves to its own verifier');            -- 1
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2003', '{}'::jsonb) ->> 'verifier',
  'exam_verify_sense', 'VER-SENSE-01 resolves to its own verifier');                 -- 2
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2004', '{}'::jsonb) ->> 'verifier',
  'exam_verify_wordforge', 'GB-WORDFORGE-01 resolves to its own verifier');          -- 3
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2006', '{}'::jsonb) ->> 'verifier',
  'exam_verify_track', 'GB-TRACK-01 resolves to its own verifier');                  -- 4
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2007', '{}'::jsonb) ->> 'verifier',
  'exam_verify_scene', 'SPA-SCENE-01 resolves to its own verifier');                 -- 5
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2008', '{}'::jsonb) ->> 'verifier',
  'exam_verify_maze', 'SPA-MAZE-01 resolves to its own verifier');                   -- 6
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2009', '{}'::jsonb) ->> 'verifier',
  'exam_verify_robopath', 'GB-ROBOPATH-01 resolves to its own verifier');            -- 7
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b2010', '{}'::jsonb) ->> 'verifier',
  'exam_verify_explore', 'GB-EXPLORE-01 resolves to its own verifier');              -- 8

-- --- 2. CX-check-01: the repetition signature decides, not the served bin ------------

select set_config(
  'test.check_fixed',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2001',
    '{"finalPlacement":{"t0":"b0","t1":"b1","t2":"b0","t3":"b1"}}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.check_fixed')::jsonb) ->> 'correct', 'true',
  'CX-check-01: moving the ABB tile out of the AAA bin is correct, with no stored trueBin'
);                                                                                     -- 9
select is(
  (current_setting('test.check_fixed')::jsonb) #>> '{metrics,M-ERRTYPE}', '1',
  'CX-check-01: M-ERRTYPE is 1 when the one planted slip was caught'
);                                                                                     -- 10

select set_config(
  'test.check_missed',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2001',
    '{"finalPlacement":{"t0":"b0","t1":"b1","t2":"b1","t3":"b1"}}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.check_missed')::jsonb) #>> '{metrics,M-POLY}', '0.75',
  'CX-check-01: turning the board in untouched still credits the three tiles already right'
);                                                                                     -- 11
select is(
  (current_setting('test.check_missed')::jsonb) #>> '{metrics,M-ERRTYPE}', '0',
  'CX-check-01: M-ERRTYPE is 0 when the planted slip was missed'
);                                                                                     -- 12

-- --- 3. VER-SENSE-01: adjacent-pair credit, which is not positional overlap ----------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2003', '{"order":[2,0,1]}'::jsonb
  ) ->> 'correct',
  'true',
  'VER-SENSE-01: the permutation re-derived from provenance.derivation.trueOrder is correct'
);                                                                                     -- 13
-- [1,2,0] gets NOTHING positionally, but keeps the "dog ate" pair consecutive, which is the
-- whole reason the type scores adjacent pairs rather than positions.
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2003', '{"order":[1,2,0]}'::jsonb
  ) #>> '{metrics,M-POLY}',
  '0.5',
  'VER-SENSE-01: M-POLY is the adjacent-pair share, so a rotation keeps half the credit'
);                                                                                     -- 14

-- --- 4. GB-WORDFORGE-01: a threshold, and the defect this batch preserves ------------

select set_config(
  'test.forge_ok',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2004',
    '{"submissions":["ate","TEA","ate","zzzqx"]}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.forge_ok')::jsonb) ->> 'correct', 'true',
  'GB-WORDFORGE-01: two distinct credited words meet a referenceTarget of two'
);                                                                                     -- 15
select is(
  (current_setting('test.forge_ok')::jsonb) #>> '{metrics,M-IDEAFLU}', '2',
  'GB-WORDFORGE-01: a repeat scores once and a nonword scores nothing'
);                                                                                     -- 16
select is(
  (current_setting('test.forge_ok')::jsonb) #>> '{metrics,M-VOCABLVL}', '5',
  'GB-WORDFORGE-01: M-VOCABLVL reports the rarest band among the credited words'
);                                                                                     -- 17
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2004', '{"submissions":["ate"]}'::jsonb
  ) ->> 'correct',
  'false',
  'GB-WORDFORGE-01: one valid word is NOT full credit — the bank makes it a threshold'
);                                                                                     -- 18
-- PRESERVED DEFECT (inventory section 8.3). Every valid word the rack affords, and still
-- wrong, because the item ships no threshold. Reported, not fixed: changing it is a scoring
-- decision for the owner, and this assertion is what stops it being changed by accident.
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2005', '{"submissions":["ATE","TEA","EAT"]}'::jsonb
  ) ->> 'correct',
  'false',
  'GB-WORDFORGE-01: a missing referenceTarget fails EVERY child closed (defect preserved)'
);                                                                                     -- 19

-- --- 5. GB-TRACK-01: the swaps in one phase are simultaneous, not sequential ---------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2006', '{"selectedSlots":[2],"taps":1}'::jsonb
  ) ->> 'correct',
  'true',
  'GB-TRACK-01: applying the phase against a snapshot lands the watched jar in slot 2'
);                                                                                     -- 20
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2006', '{"selectedSlots":[0],"taps":1}'::jsonb
  ) ->> 'correct',
  'false',
  'GB-TRACK-01: slot 0 is what SEQUENTIAL swaps would give, and it is not the answer'
);                                                                                     -- 21
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2006', '{"selectedSlots":[0],"taps":1}'::jsonb
  ) #>> '{metrics,M-PROG}',
  '0',
  'GB-TRACK-01: M-PROG is the share of the target set recovered, not the verdict'
);                                                                                     -- 22

-- --- 6. SPA-SCENE-01: comparator order, concordant pairs, and the nearest card -------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2007', '{"order":[0,2,1],"nearestId":2}'::jsonb
  ) ->> 'correct',
  'true',
  'SPA-SCENE-01: the robot''s-eye order is 0, 2, 1 — neither the array order nor sorted x'
);                                                                                     -- 23
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2007', '{"order":[1,2,0],"nearestId":2}'::jsonb
  ) #>> '{metrics,M-MIRRORFA}',
  '1',
  'SPA-SCENE-01: the exact left-right reversal is flagged as the egocentric foil'
);                                                                                     -- 24
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2007', '{"order":[0,2,1],"nearestId":0}'::jsonb
  ) ->> 'correct',
  'false',
  'SPA-SCENE-01: the right order with the wrong nearest card is not full credit'
);                                                                                     -- 25

-- --- 7. SPA-MAZE-01: a legal walk, not equality with the stored optimum --------------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2008',
    '{"path":[[0,0],[1,0],[0,0],[0,1],[1,1]]}'::jsonb
  ) ->> 'correct',
  'true',
  'SPA-MAZE-01: doubling back through the gem is a legal solving walk'
);                                                                                     -- 26
-- The failure paths still report M-EFF: efficiency is measured even when the route is wrong,
-- and the differential harness compares the metric map, not only the verdict.
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2008', '{"path":[[0,0],[0,1],[1,1]]}'::jsonb
  ) -> 'metrics')::text,
  '{"M-EFF": 1}',
  'SPA-MAZE-01: skipping the gem is wrong but still carries M-EFF'
);                                                                                     -- 27
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2008', '{"path":[[0,0],[0,1],[1,1]]}'::jsonb
  ) ->> 'correct',
  'false',
  'SPA-MAZE-01: a route that reaches the goal without the gem is not a solution'
);                                                                                     -- 28

-- --- 8. GB-ROBOPATH-01: the program is RUN, and a bump emits no metrics at all -------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2009',
    '{"program":[{"cmd":"F","reps":2},{"cmd":"L","reps":1},{"cmd":"F","reps":1}]}'::jsonb
  ) ->> 'correct',
  'true',
  'GB-ROBOPATH-01: the expanded program collects the key and stops on the door'
);                                                                                     -- 29
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2009',
    '{"program":[{"cmd":"F","reps":2},{"cmd":"F","reps":1},{"cmd":"L","reps":1},{"cmd":"F","reps":1}]}'::jsonb
  )::text,
  '{"mode": "computed_solver", "score": 0, "correct": false, "metrics": {}, "verifier": "exam_verify_robopath"}',
  'GB-ROBOPATH-01: a bump aborts the run and emits NO metrics, not a zero one'
);                                                                                     -- 30

-- --- 9. GB-EXPLORE-01: the pointing error, and the defect this batch preserves -------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2010',
    ('{"actions":[{"kind":"move","to":[0,1]},{"kind":"move","to":[0,0]}],'
      || '"pointings":[{"landmarkId":"L1","standCell":[0,0],"angleDeg":100}]}')::jsonb
  ) #>> '{metrics,M-VIEWANG}',
  '10',
  'GB-EXPLORE-01: M-VIEWANG is the circular error against the landmark''s true bearing of 90'
);                                                                                     -- 31
-- PRESERVED DEFECT (inventory section 8.4). With no action log the move count is taken from
-- the CLIENT-reported response.cost.actual, so a renderer claiming eight moves for a two-move
-- tour drops M-EFF to 0.25 while the verdict stays correct. Reported, not fixed.
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b2010',
    '{"cellsVisited":[[0,0],[0,1]],"endCell":[0,0],"cost":{"actual":8}}'::jsonb
  ) #>> '{metrics,M-EFF}',
  '0.25',
  'GB-EXPLORE-01: the fallback branch trusts the client''s own move count (defect preserved)'
);                                                                                     -- 32

-- --- 10. Firewall posture for the eight surviving verifiers --------------------------
-- 123 asserts this generically over every app.exam_v% function, including the helpers these
-- verifiers call. Naming the eight explicitly means a future rename cannot quietly drop one
-- out of that pattern and take its revoke with it.

select is(
  (
    select count(*)::integer
    from unnest(array[
      'exam_verify_check_twice', 'exam_verify_sense',
      'exam_verify_wordforge', 'exam_verify_track', 'exam_verify_scene',
      'exam_verify_maze', 'exam_verify_robopath', 'exam_verify_explore'
    ]) as fn
    cross join unnest(array['anon', 'authenticated', 'service_role', 'public']) as who
    where has_function_privilege(who, 'app.' || fn || '(jsonb,jsonb)', 'execute')
  ),
  0,
  'no client role can execute any of the eight surviving verifiers'
);                                                                                     -- 33
select is(
  (
    select count(*)::integer
    from unnest(array[
      'exam_verify_check_twice', 'exam_verify_sense',
      'exam_verify_wordforge', 'exam_verify_track', 'exam_verify_scene',
      'exam_verify_maze', 'exam_verify_robopath', 'exam_verify_explore'
    ]) as fn
    where has_function_privilege('api_executor', 'app.' || fn || '(jsonb,jsonb)', 'execute')
  ),
  8,
  'api_executor can execute all eight — the same posture app.exam_score_response has'
);                                                                                     -- 34

select * from finish();

rollback;
