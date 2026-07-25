-- Batch 1 of the per-type verifier port (D-027, E-090,
-- 20260725174500_exam_verify_vbatch1.sql).
--
-- Three things are proved here, in this order:
--   1. FIREWALL POSTURE — the nine new verifiers and their readers are reachable only from
--      api_executor. Test 123 asserts this over the whole `app.exam_v%` namespace; this file
--      names the nine so a failure says which port forgot its revoke.
--   2. DISPATCH — each of the nine type codes resolves to its own function rather than
--      falling through to the keyed default.
--   3. THE RULES THAT ARE EASY TO GET SUBTLY WRONG — the circular heading comparison, the
--      re-derivations that must beat a corrupted stored key, the separation of the two
--      signal-detection channels, and the WM-bubble-01 behaviour the inventory reports as
--      probably wrong and this port deliberately preserves.
--
-- Parity against the REAL banks is not provable in pgTAP, because it needs both
-- implementations in one process. `pnpm exam:verify:diff` does that over every bank item of
-- all nine types; this file pins the contract that harness relies on.
--
-- Assertion 36 proves the fixtures hold real keys, so the leak assertion above it cannot
-- pass vacuously.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(36);

grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures --------------------------------------------
--
-- Every fixture that has a re-derivable answer ships a DELIBERATELY WRONG stored key, so an
-- assertion can only pass if the verifier re-derived the expected response from `content`.

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values
  ('CX-curious-02', 'verbal', 'Curious Gap', 'CX-curious-02.html', array['M-ACC']),
  ('GB-DEBATE-01', 'verbal', 'Debate', 'GB-DEBATE-01.html', array['M-ACC']),
  ('SPA-VIEW-01', 'spatial', 'Viewpoint', 'SPA-VIEW-01.html', array['M-ACC']),
  ('SPA-HIDDENCUBE-01', 'spatial', 'Hidden Cubes', 'SPA-HIDDENCUBE-01.html', array['M-ACC']),
  ('GB-FILTER-01', 'spatial', 'Filter', 'GB-FILTER-01.html', array['M-ACC']),
  ('WM-corsi-01', 'spatial', 'Corsi Span', 'WM-corsi-01.html', array['M-ACC']),
  ('WM-bind-01', 'spatial', 'Binding', 'WM-bind-01.html', array['M-ACC']),
  ('WM-gridflash-01', 'spatial', 'Grid Flash', 'WM-gridflash-01.html', array['M-ACC']),
  ('WM-bubble-01', 'verbal', 'N-Back', 'WM-bubble-01.html', array['M-ACC'])
on conflict (type_code) do nothing;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values
  -- b1001 CX-curious-02. g2 is the only option the scene never supports; the stored key
  -- names g1, so only a verifier that read the evidence model can grade this.
  (
    '00000000-0000-4000-8000-0000000b1001', 'CX-curious-02', 'verbal', 3.0, array['2-3'],
    jsonb_build_object('gapOptions', jsonb_build_array(
      jsonb_build_object('id', 'g1'), jsonb_build_object('id', 'g2'), jsonb_build_object('id', 'g3')
    )),
    jsonb_build_object(
      'correctKey', 'g1',
      'evidenceModel', jsonb_build_object('gapOptions', jsonb_build_array(
        jsonb_build_object('id', 'g1', 'support', 'stated'),
        jsonb_build_object('id', 'g2', 'support', 'unknown'),
        jsonb_build_object('id', 'g3', 'support', 'stated')
      ))
    ),
    jsonb_build_object('mode', 'deterministic_key'), '{}'::jsonb
  ),
  -- b1002 GB-DEBATE-01. The object key the generic keyed verifier cannot read.
  (
    '00000000-0000-4000-8000-0000000b1002', 'GB-DEBATE-01', 'verbal', 5.0, array['4-5'],
    '{}'::jsonb,
    jsonb_build_object('correctKey', jsonb_build_object('support', 'e2', 'rebut', 'r3')),
    jsonb_build_object('mode', 'deterministic_key'), '{}'::jsonb
  ),
  -- b1003 SPA-VIEW-01, heading shell. Target 175 with an 8.13 degree band, so a -179 dial
  -- reading is 6 degrees away going the short way round and 354 going the long way.
  (
    '00000000-0000-4000-8000-0000000b1003', 'SPA-VIEW-01', 'spatial', 9.0, array['6-8'],
    jsonb_build_object('optionKind', 'heading_dial'),
    jsonb_build_object('correctHeadingDeg', 175, 'toleranceDeg', 8.13, 'correctKey', 'HEADING'),
    jsonb_build_object('mode', 'computed_solver', 'rule', 'signed_heading_error_within_tolerance'),
    '{}'::jsonb
  ),
  -- b1004 SPA-VIEW-01, viewpoint shell, same bank and same type code.
  (
    '00000000-0000-4000-8000-0000000b1004', 'SPA-VIEW-01', 'spatial', 4.0, array['2-3'],
    jsonb_build_object('optionKind', 'viewpoint'),
    jsonb_build_object('correctKey', 'A', 'mirrorFoilKey', 'B'),
    jsonb_build_object('mode', 'deterministic_key'), '{}'::jsonb
  ),
  -- b1005 SPA-HIDDENCUBE-01. The stack holds two distinct occupied cells (one is listed
  -- twice); the stored count says 99.
  (
    '00000000-0000-4000-8000-0000000b1005', 'SPA-HIDDENCUBE-01', 'spatial', 4.0, array['2-3'],
    jsonb_build_object(
      'stack', jsonb_build_object(
        'rows', 2, 'cols', 2, 'maxHeight', 2,
        'layers', jsonb_build_array(
          jsonb_build_array(
            jsonb_build_array(0, 0), jsonb_build_array(0, 0), jsonb_build_array(1, 1)
          ),
          jsonb_build_array()
        )
      ),
      'view', jsonb_build_object('canonicalYawDeg', -45)
    ),
    jsonb_build_object('correctCount', 99, 'correctKey', '99'),
    jsonb_build_object('mode', 'deterministic_key'), '{}'::jsonb
  ),
  -- b1006 GB-FILTER-01. A 2x2 board, two red targets, two non-targets, so every rate below
  -- is an exact binary fraction.
  (
    '00000000-0000-4000-8000-0000000b1006', 'GB-FILTER-01', 'spatial', 4.0, array['2-3'],
    jsonb_build_object(
      'grid', jsonb_build_object('R', 2, 'C', 2),
      'cue', jsonb_build_object('mode', 'color', 'color', 'red'),
      'items', jsonb_build_array(
        jsonb_build_object('r', 0, 'c', 0, 'color', 'red', 'shape', 'drop'),
        jsonb_build_object('r', 0, 'c', 1, 'color', 'red', 'shape', 'bolt'),
        jsonb_build_object('r', 1, 'c', 0, 'color', 'blue', 'shape', 'drop'),
        jsonb_build_object('r', 1, 'c', 1, 'color', 'blue', 'shape', 'bolt')
      )
    ),
    jsonb_build_object('correctKey', '0,0', 'targets', jsonb_build_array(
      jsonb_build_array(0, 0), jsonb_build_array(0, 1)
    )),
    jsonb_build_object('mode', 'deterministic_key'), '{}'::jsonb
  ),
  -- b1007 WM-corsi-01, a BACKWARD trial. Replaying the schedule in onset order gives
  -- 5,1,7,3, so the trail to tap back is 3,7,1,5. The stored key says otherwise.
  (
    '00000000-0000-4000-8000-0000000b1007', 'WM-corsi-01', 'spatial', 6.0, array['4-5'],
    jsonb_build_object(
      'mode', 'backward',
      'presentation', jsonb_build_object('schedule', jsonb_build_array(
        jsonb_build_object('cell', 7, 'onsetMs', 300),
        jsonb_build_object('cell', 5, 'onsetMs', 100),
        jsonb_build_object('cell', 3, 'onsetMs', 400),
        jsonb_build_object('cell', 1, 'onsetMs', 200)
      ))
    ),
    jsonb_build_object('expectedSequence', jsonb_build_array(9, 9, 9, 9), 'correctKey', 'nope'),
    jsonb_build_object('mode', 'computed_solver', 'solver', 'wm-span-serial-order@1'), '{}'::jsonb
  ),
  -- b1008 WM-bind-01. c1 is shown twice and the later showing legitimately overwrites, so
  -- the encoded map is c1 -> 5, c2 -> 2. The stored bindings still say c1 -> 1.
  (
    '00000000-0000-4000-8000-0000000b1008', 'WM-bind-01', 'spatial', 6.0, array['4-5'],
    jsonb_build_object('presentation', jsonb_build_object('schedule', jsonb_build_array(
      jsonb_build_object('creatureId', 'c1', 'cell', 1, 'onsetMs', 100),
      jsonb_build_object('creatureId', 'c2', 'cell', 2, 'onsetMs', 200),
      jsonb_build_object('creatureId', 'c1', 'cell', 5, 'onsetMs', 300)
    ))),
    jsonb_build_object('bindings', jsonb_build_object('c1', 1, 'c2', 2)),
    jsonb_build_object('mode', 'computed_solver', 'solver', 'wm-binding-partial-credit@1'),
    '{}'::jsonb
  ),
  -- b1009 WM-gridflash-01, change-detection shell. The probed cell flashed coral and the
  -- test shows gold, so the answer is CHANGED; the stored key says SAME.
  (
    '00000000-0000-4000-8000-0000000b1009', 'WM-gridflash-01', 'spatial', 6.0, array['4-5'],
    jsonb_build_object(
      'grid', jsonb_build_object('cellCount', 9),
      'presentation', jsonb_build_object('array', jsonb_build_array(
        jsonb_build_object('cell', 0, 'hue', 'moss'),
        jsonb_build_object('cell', 8, 'hue', 'coral')
      )),
      'responsePhase', jsonb_build_object(
        'mode', 'two_choice', 'probe', jsonb_build_object('cell', 8, 'hue', 'gold')
      )
    ),
    jsonb_build_object('correctKey', 'SAME'),
    jsonb_build_object('mode', 'computed_solver', 'solver', 'wm-change-detection-sdt@1'),
    '{}'::jsonb
  ),
  -- b100a WM-gridflash-01, the SAME half of the same ladder.
  (
    '00000000-0000-4000-8000-0000000b100a', 'WM-gridflash-01', 'spatial', 6.0, array['4-5'],
    jsonb_build_object(
      'grid', jsonb_build_object('cellCount', 9),
      'presentation', jsonb_build_object('array', jsonb_build_array(
        jsonb_build_object('cell', 8, 'hue', 'coral')
      )),
      'responsePhase', jsonb_build_object(
        'mode', 'two_choice', 'probe', jsonb_build_object('cell', 8, 'hue', 'coral')
      )
    ),
    jsonb_build_object('correctKey', 'CHANGED'),
    jsonb_build_object('mode', 'computed_solver', 'solver', 'wm-change-detection-sdt@1'),
    '{}'::jsonb
  ),
  -- b100b WM-gridflash-01, recognition shell: three lit cells out of nine, so six dark.
  (
    '00000000-0000-4000-8000-0000000b100b', 'WM-gridflash-01', 'spatial', 7.0, array['4-5'],
    jsonb_build_object(
      'grid', jsonb_build_object('cellCount', 9),
      'shell', 'recognition',
      'presentation', jsonb_build_object('array', jsonb_build_array(
        jsonb_build_object('cell', 0, 'hue', 'plum'),
        jsonb_build_object('cell', 5, 'hue', 'gold'),
        jsonb_build_object('cell', 7, 'hue', 'moss')
      )),
      'responsePhase', jsonb_build_object('mode', 'select_set')
    ),
    jsonb_build_object('expectedCells', jsonb_build_array(1, 2, 3), 'correctKey', 'nope'),
    jsonb_build_object('mode', 'computed_solver', 'solver', 'wm-array-recognition-partial-credit@1'),
    '{}'::jsonb
  ),
  -- b100c WM-bubble-01. One channel, n = 1, targets at steps 2 and 4.
  (
    '00000000-0000-4000-8000-0000000b100c', 'WM-bubble-01', 'verbal', 6.0, array['4-5'],
    jsonb_build_object(
      'n', 1, 'streamLength', 5,
      'channels', jsonb_build_array(jsonb_build_object(
        'id', 'w', 'stream', jsonb_build_array('A', 'B', 'B', 'C', 'C')
      ))
    ),
    jsonb_build_object('correctKey', 'w:2,4'),
    jsonb_build_object('mode', 'computed_solver'), '{}'::jsonb
  ),
  -- b100d WM-bubble-01 with a stream that contains no n-back repeat at all. See assertion 31.
  (
    '00000000-0000-4000-8000-0000000b100d', 'WM-bubble-01', 'verbal', 6.0, array['4-5'],
    jsonb_build_object(
      'n', 1, 'streamLength', 4,
      'channels', jsonb_build_array(jsonb_build_object(
        'id', 'w', 'stream', jsonb_build_array('A', 'B', 'C', 'D')
      ))
    ),
    jsonb_build_object('correctKey', 'w:'),
    jsonb_build_object('mode', 'computed_solver'), '{}'::jsonb
  );

-- --- 1. Firewall posture -----------------------------------------------------------

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname in (
        'exam_verify_curious', 'exam_verify_debate', 'exam_verify_view',
        'exam_verify_hiddencube', 'exam_verify_filter', 'exam_verify_corsi',
        'exam_verify_bind', 'exam_verify_gridflash', 'exam_verify_bubble',
        'exam_vb1_numlist', 'exam_vb1_strlist', 'exam_vb1_wrap180', 'exam_vb1_jsnumber'
      )
      and (
        p.proacl is null
        or exists (
          select 1
          from aclexplode(p.proacl) a
          left join pg_roles r on r.oid = a.grantee
          where a.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role')
        )
      )
  ),
  0,
  'none of the nine new verifiers or their four readers is reachable by a client role'
);                                                                                      -- 1
select is(
  (
    select count(*)::integer
    from app.exam_verifier_registry r
    where r.type_code in (
      'CX-curious-02', 'GB-DEBATE-01', 'SPA-VIEW-01', 'SPA-HIDDENCUBE-01', 'GB-FILTER-01',
      'WM-corsi-01', 'WM-bind-01', 'WM-gridflash-01', 'WM-bubble-01'
    )
      and has_function_privilege(
        'api_executor', format('app.%I(jsonb,jsonb)', r.verifier_fn), 'execute'
      )
  ),
  9,
  'api_executor can execute all nine, so the dispatcher never dead-ends on one of them'
);                                                                                      -- 2

-- --- 2. Registration and dispatch --------------------------------------------------
--
-- Scoped to this batch's nine type codes rather than sweeping the whole registry: sibling
-- batches add their own rows to the same table, and a test should fail for its own reasons.

select is(
  (
    select count(*)::integer from app.exam_verifier_registry
    where type_code in (
      'CX-curious-02', 'GB-DEBATE-01', 'SPA-VIEW-01', 'SPA-HIDDENCUBE-01', 'GB-FILTER-01',
      'WM-corsi-01', 'WM-bind-01', 'WM-gridflash-01', 'WM-bubble-01'
    )
  ),
  9,
  'all nine of this batch''s type codes are registered'
);                                                                                      -- 3
select is(
  (
    select count(*)::integer
    from app.exam_verifier_registry r
    where r.type_code in (
      'CX-curious-02', 'GB-DEBATE-01', 'SPA-VIEW-01', 'SPA-HIDDENCUBE-01', 'GB-FILTER-01',
      'WM-corsi-01', 'WM-bind-01', 'WM-gridflash-01', 'WM-bubble-01'
    )
      and to_regprocedure(format('app.%I(jsonb,jsonb)', r.verifier_fn)) is null
  ),
  0,
  'each of the nine registry rows names a function that actually exists'
);                                                                                      -- 4

select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1001', '{}'::jsonb) ->> 'verifier',
  'exam_verify_curious', 'CX-curious-02 dispatches to its own verifier');               -- 5
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1002', '{}'::jsonb) ->> 'verifier',
  'exam_verify_debate', 'GB-DEBATE-01 dispatches to its own verifier');                 -- 6
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1003', '{}'::jsonb) ->> 'verifier',
  'exam_verify_view', 'SPA-VIEW-01 dispatches to its own verifier');                    -- 7
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1005', '{}'::jsonb) ->> 'verifier',
  'exam_verify_hiddencube', 'SPA-HIDDENCUBE-01 dispatches to its own verifier');        -- 8
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1006', '{}'::jsonb) ->> 'verifier',
  'exam_verify_filter', 'GB-FILTER-01 dispatches to its own verifier');                 -- 9
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1007', '{}'::jsonb) ->> 'verifier',
  'exam_verify_corsi', 'WM-corsi-01 dispatches to its own verifier');                   -- 10
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1008', '{}'::jsonb) ->> 'verifier',
  'exam_verify_bind', 'WM-bind-01 dispatches to its own verifier');                     -- 11
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b1009', '{}'::jsonb) ->> 'verifier',
  'exam_verify_gridflash', 'WM-gridflash-01 dispatches to its own verifier');           -- 12
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000b100c', '{}'::jsonb) ->> 'verifier',
  'exam_verify_bubble', 'WM-bubble-01 dispatches to its own verifier');                 -- 13

-- --- 3. CX-curious-02 --------------------------------------------------------------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1001', '{"gapKey":"g2"}'::jsonb
  ) ->> 'correct',
  'true',
  'CX-curious-02: the option the evidence model marks unknown is the gap, not the stored key'
);                                                                                      -- 14
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1001', '{"gapKey":"g1"}'::jsonb
  )::text,
  '{"mode": "deterministic_key", "score": 0, "correct": false, "metrics": {}, "verifier": "exam_verify_curious"}',
  'CX-curious-02: an option the scene states is wrong, and the type emits no metrics at all'
);                                                                                      -- 15

-- --- 4. GB-DEBATE-01 ---------------------------------------------------------------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1002', '{"supportKey":"e2","rebutKey":"r3"}'::jsonb
  ) ->> 'correct',
  'true',
  'GB-DEBATE-01: both halves of the object key land'
);                                                                                      -- 16
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1002', '{"supportKey":"e2","rebutKey":"r1"}'::jsonb
  ) #>> '{metrics,M-PROG}',
  '0.5',
  'GB-DEBATE-01: one of two decisions is partial progress, not a discarded zero'
);                                                                                      -- 17

-- --- 5. SPA-VIEW-01, both shells ---------------------------------------------------
--
-- The assertion the inventory singles out: -179 is SIX degrees from a 175 degree target
-- going the short way and 354 going the long way. A linear comparison fails this child.

select set_config(
  'test.view_seam',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1003', '{"headingDeg":-179}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.view_seam')::jsonb) ->> 'correct',
  'true',
  'SPA-VIEW-01: a dial reading across the +/-180 seam is graded by its true angular distance'
);                                                                                      -- 18
select is(
  (current_setting('test.view_seam')::jsonb) #>> '{metrics,M-VIEWANG}',
  '6',
  'SPA-VIEW-01: M-VIEWANG is the SIGNED circular error, so the seam does not inflate it'
);                                                                                      -- 19
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1003', '{"headingDeg":-5}'::jsonb
  ) ->> 'correct',
  'false',
  'SPA-VIEW-01: half a turn out is still wrong, circular comparison or not'
);                                                                                      -- 20
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1004', '{"selectedKey":"B"}'::jsonb
  ) #>> '{metrics,M-MIRRORFA}',
  '1',
  'SPA-VIEW-01: the viewpoint shell flags the mirrored station on the same type code'
);                                                                                      -- 21
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1004', '{"selectedKey":"A"}'::jsonb
  )::text,
  '{"mode": "deterministic_key", "score": 1, "correct": true, "metrics": {"M-MIRRORFA": 0}, "verifier": "exam_verify_view"}',
  'SPA-VIEW-01: the keyed station is correct and carries no heading metric'
);                                                                                      -- 22

-- --- 6. SPA-HIDDENCUBE-01 ----------------------------------------------------------

select set_config(
  'test.cube',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1005', '{"count":2,"finalYawDeg":350}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.cube')::jsonb) ->> 'correct',
  'true',
  'SPA-HIDDENCUBE-01: the recount of the served stack beats the stored count, duplicates and all'
);                                                                                      -- 23
select is(
  (current_setting('test.cube')::jsonb) #>> '{metrics,M-VIEWANG}',
  '35',
  'SPA-HIDDENCUBE-01: M-VIEWANG folds the yaw offset circularly (350 vs -45 is 35, not 395)'
);                                                                                      -- 24
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1005', '{"count":99}'::jsonb
  ) ->> 'correct',
  'false',
  'SPA-HIDDENCUBE-01: the stored count is not the answer when the stack can be recounted'
);                                                                                      -- 25

-- --- 7. GB-FILTER-01 ---------------------------------------------------------------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1006',
    '{"selectedCells":[[0,1],[0,0]],"taps":4}'::jsonb
  )::text,
  '{"mode": "deterministic_key", "score": 1, "correct": true, "metrics": {"M-EFF": 0.5, "M-PROG": 1, "M-FALSEALARM": 0}, "verifier": "exam_verify_filter"}',
  'GB-FILTER-01: the cue re-applied to the array, order-free, with the waste reported as M-EFF'
);                                                                                      -- 26
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1006', '{"selectedCells":[[0,0],[1,0]]}'::jsonb
  )::text,
  '{"mode": "deterministic_key", "score": 0, "correct": false, "metrics": {"M-PROG": 0, "M-FALSEALARM": 0.5}, "verifier": "exam_verify_filter"}',
  'GB-FILTER-01: one hit traded for one false alarm cancels the progress credit exactly'
);                                                                                      -- 27

-- --- 8. WM-corsi-01 ----------------------------------------------------------------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1007', '{"tappedCells":[3,7,1,5]}'::jsonb
  )::text,
  '{"mode": "computed_solver", "score": 1, "correct": true, "metrics": {"M-POLY": 1, "M-PROG": 1}, "verifier": "exam_verify_corsi"}',
  'WM-corsi-01: the schedule is replayed in onset order and reversed for a backward trial'
);                                                                                      -- 28
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1007', '{"tappedCells":[3,7,1,5,2]}'::jsonb
  )::text,
  '{"mode": "computed_solver", "score": 0, "correct": false, "metrics": {"M-POLY": 1, "M-PROG": 1}, "verifier": "exam_verify_corsi"}',
  'WM-corsi-01: a fifth tap on a four-cell trail is not full credit even with four right'
);                                                                                      -- 29

-- --- 9. WM-bind-01 -----------------------------------------------------------------

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b1008', '{"placements":{"c2":2,"c1":5}}'::jsonb
  )::text,
  '{"mode": "computed_solver", "score": 1, "correct": true, "metrics": {"M-POLY": 1}, "verifier": "exam_verify_bind"}',
  'WM-bind-01: credit is order-free and a creature''s later showing overwrites the earlier one'
);                                                                                      -- 30

-- --- 10. WM-gridflash-01: the two SDT channels stay apart --------------------------

select is(
  (
    select string_agg(k, ',' order by k)
    from jsonb_object_keys(
      app.exam_verify_response(
        '00000000-0000-4000-8000-0000000b1009', '{"selectedKey":"SAME"}'::jsonb
      ) -> 'metrics'
    ) as k
  ),
  'M-DPRIME',
  'WM-gridflash-01: a MISS reports only the hit channel — it is not a false alarm'
);                                                                                      -- 31
select is(
  (
    select string_agg(k, ',' order by k)
    from jsonb_object_keys(
      app.exam_verify_response(
        '00000000-0000-4000-8000-0000000b100a', '{"selectedKey":"CHANGED"}'::jsonb
      ) -> 'metrics'
    ) as k
  ),
  'M-FALSEALARM',
  'WM-gridflash-01: a FALSE ALARM reports only the false-alarm channel'
);                                                                                      -- 32
select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b100b',
    '{"shell":"select_set","selectedCells":[0,5,1]}'::jsonb
  )::text,
  '{"mode": "computed_solver", "score": 0, "correct": false, "metrics": {"M-POLY": 0.6667, "M-DPRIME": 0.6667, "M-FALSEALARM": 0.1667}, "verifier": "exam_verify_gridflash"}',
  'WM-gridflash-01: the recognition shell splits two hits from one false alarm over six dark cells'
);                                                                                      -- 33

-- --- 11. WM-bubble-01, including the behaviour reported but NOT fixed ---------------
--
-- The child popped nothing, and there was nothing to pop: every decidable step was decided
-- correctly, M-POLY says 1, and the verdict is still WRONG, because verifyBubble requires
-- `targets > 0`. That is EXAM_VERIFIER_PORT_INVENTORY.md §8 item 2, and this assertion exists
-- so the behaviour is pinned rather than drifted into or quietly repaired: changing it is a
-- scoring-semantics decision for the owner, which D-027 does not grant.

select is(
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000b100d', '{"pops":[],"stepsShown":4}'::jsonb
  )::text,
  '{"mode": "computed_solver", "score": 0, "correct": false, "metrics": {"M-POLY": 1, "M-FALSEALARM": 0}, "verifier": "exam_verify_bubble"}',
  'WM-bubble-01: a block with no n-back repeat is unpassable (inventory §8 item 2, ported as written)'
);                                                                                      -- 34

-- --- 12. The verdict payload still carries no key material -------------------------

select ok(
  (
    app.exam_verify_response(
      '00000000-0000-4000-8000-0000000b1001', '{"gapKey":"g2"}'::jsonb
    )::text
    || app.exam_verify_response(
      '00000000-0000-4000-8000-0000000b1005', '{"count":2}'::jsonb
    )::text
    || app.exam_verify_response(
      '00000000-0000-4000-8000-0000000b1006', '{"selectedCells":[[0,0],[0,1]]}'::jsonb
    )::text
    || app.exam_verify_response(
      '00000000-0000-4000-8000-0000000b1007', '{"tappedCells":[3,7,1,5]}'::jsonb
    )::text
    || app.exam_verify_response(
      '00000000-0000-4000-8000-0000000b1009', '{"selectedKey":"CHANGED"}'::jsonb
    )::text
  ) !~ (
    '(answer_key|answerKey|correctKey|correctCount|correctHeadingDeg|mirrorFoilKey'
    || '|expectedSequence|expectedCells|evidenceModel|bindings|targets|gapOptions)'
  ),
  'no verdict returns a key, a target set, or a derived expected answer'
);                                                                                      -- 35
select is(
  (
    select count(*)::integer from app.exam_item
    where item_id in (
      '00000000-0000-4000-8000-0000000b1001', '00000000-0000-4000-8000-0000000b1005',
      '00000000-0000-4000-8000-0000000b1006', '00000000-0000-4000-8000-0000000b1007',
      '00000000-0000-4000-8000-0000000b1009'
    )
      and (
        answer_key ? 'correctKey' or answer_key ? 'correctCount'
        or answer_key ? 'expectedSequence' or answer_key ? 'targets'
      )
  ),
  5,
  'the fixtures DO hold real answer keys server-side (assertion 35 is not vacuous)'
);                                                                                      -- 36

select * from finish();

rollback;
