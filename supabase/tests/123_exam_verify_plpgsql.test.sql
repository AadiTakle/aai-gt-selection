-- In-database per-item verification (D-027, 20260725170000_exam_verify_plpgsql.sql).
--
-- Three things are proved here, in this order:
--   1. FIREWALL POSTURE — the dispatcher, every verifier and the registry are reachable only
--      from api_executor, exactly as the demoted app.exam_score_response is. The port widened
--      what the database can grade; it must not have widened who can ask.
--   2. RESOLUTION ORDER — registered per-type verifier, then the generic named by the item's
--      server-only scoring.rule, then the option-key default. Same order as resolveVerifier()
--      in apps/web/src/lib/exam/verifiers/index.ts.
--   3. PARITY ON THE FOUR PORTED TYPES — the verdicts and metric maps these fixtures expect
--      are the ones the TypeScript verifiers produce for the same inputs.
--
-- Parity across the REAL banks is not provable in pgTAP, because it needs both
-- implementations in one process. `pnpm exam:verify:diff` does that against every served
-- type and every bank; this file pins the contract that harness relies on.
--
-- Assertion 29 deliberately proves the fixtures hold real keys, so the firewall assertions
-- above cannot pass vacuously.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(29);

grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures --------------------------------------------

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values
  ('FLU-CONCEPT-01', 'fluid_reasoning', 'Concept Gate', 'FLU-CONCEPT-01.html', array['M-ACC']),
  ('VER-EVIDENCE-01', 'verbal', 'Evidence Citation', 'VER-EVIDENCE-01.html', array['M-ACC']),
  ('QUANT-MIX-01', 'quantitative', 'Ratio Mix', 'QUANT-MIX-01.html', array['M-ACC']),
  ('SPA-XPLANE-01', 'spatial', 'Cross Section', 'SPA-XPLANE-01.html', array['M-ACC']),
  ('QUANT-NUMLINE-01', 'quantitative', 'Number Line', 'QUANT-NUMLINE-01.html', array['M-ACC']),
  ('QUANT-BUILD-01', 'quantitative', 'Build A Number', 'QUANT-BUILD-01.html', array['M-ACC']),
  ('FLU-DISPATCH-01', 'fluid_reasoning', 'Dispatch Fixture', 'FLU-DISPATCH-01.html', array['M-ACC'])
on conflict (type_code) do nothing;

-- FLU-CONCEPT-01. Two dimensions with two values each, so maxArity is 1 and the hypothesis
-- space is the four single-atom rules. Only `color = red` reproduces the whole gate oracle,
-- so the probe verdicts it forces ("YN") are the key — the stored correctKey is never needed.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000e0001',
  'FLU-CONCEPT-01', 'fluid_reasoning', 8.0, array['4-5'],
  jsonb_build_object(
    'varyDims', jsonb_build_array('shape', 'color'),
    'gateOracle', jsonb_build_array(
      jsonb_build_object('figure', jsonb_build_object('shape', 'triangle', 'color', 'red'), 'accepts', true),
      jsonb_build_object('figure', jsonb_build_object('shape', 'triangle', 'color', 'blue'), 'accepts', false),
      jsonb_build_object('figure', jsonb_build_object('shape', 'circle', 'color', 'red'), 'accepts', true),
      jsonb_build_object('figure', jsonb_build_object('shape', 'circle', 'color', 'blue'), 'accepts', false)
    ),
    'probes', jsonb_build_array(
      jsonb_build_object('key', 'P1', 'figure', jsonb_build_object('shape', 'square', 'color', 'red')),
      jsonb_build_object('key', 'P2', 'figure', jsonb_build_object('shape', 'circle', 'color', 'green'))
    )
  ),
  jsonb_build_object('correctKey', 'YN'),
  jsonb_build_object('mode', 'deterministic_key'),
  '{}'::jsonb
);

-- VER-EVIDENCE-01. The two-part key is re-derived from the inference derivation in
-- provenance: s1 is the only sentence asserting the premise, B the only option claiming the
-- conclusion.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000e0002',
  'VER-EVIDENCE-01', 'verbal', 6.0, array['4-5'],
  jsonb_build_object('presentation', 'text'),
  jsonb_build_object('correctKey', 'B+s1'),
  jsonb_build_object(
    'mode', 'deterministic_key',
    'creditWeights', jsonb_build_object('answer', 0.5, 'evidence', 0.5)
  ),
  jsonb_build_object(
    'levers', jsonb_build_object('depthRank', 2),
    'derivation', jsonb_build_object(
      'premise', 'p1',
      'conclusion', 'c1',
      'sentenceFacts', jsonb_build_object('s1', jsonb_build_array('p1'), 's2', jsonb_build_array('p2')),
      'optionClaims', jsonb_build_object('A', 'c0', 'B', 'c1')
    )
  )
);

-- QUANT-MIX-01. 1:2 target, the A row locked at the served 2, so 2:4 is the one reachable
-- equivalent mix and 3:6 is equivalent but off-protocol.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000e0003',
  'QUANT-MIX-01', 'quantitative', 5.0, array['2-3'],
  jsonb_build_object(
    'targetBowl', jsonb_build_object('A', 1, 'B', 2),
    'workBowl', jsonb_build_object('A', 2, 'B', 0),
    'constraint', jsonb_build_object('kind', 'given_row', 'row', 'A'),
    'limits', jsonb_build_object('maxPerIngredient', 24)
  ),
  jsonb_build_object('correctKey', 'A=2,B=4', 'correctCounts', jsonb_build_object('A', 2, 'B', 4)),
  jsonb_build_object('mode', 'computed_solver', 'rule', 'ratio_equivalence_with_constraint'),
  '{}'::jsonb
);

-- SPA-XPLANE-01. A tetrahedron is enough solid to get past readSolid; the geometry itself is
-- exercised against the real bank by the differential harness, so what is pinned here is that
-- the dispatcher routes to the ported verifier and that it fails closed on a missing plane.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000e0004',
  'SPA-XPLANE-01', 'spatial', 12.0, array['6-8'],
  jsonb_build_object(
    'solid', jsonb_build_object(
      'verts', jsonb_build_array(
        jsonb_build_array(0, 0, 0), jsonb_build_array(1, 0, 0),
        jsonb_build_array(0, 1, 0), jsonb_build_array(0, 0, 1)
      ),
      'faces', jsonb_build_array(
        jsonb_build_array(0, 1, 2), jsonb_build_array(0, 1, 3),
        jsonb_build_array(0, 2, 3), jsonb_build_array(1, 2, 3)
      )
    ),
    'planeModel', jsonb_build_object(
      'controlRange', jsonb_build_array(0, 100),
      'tiltMaxRad', 1.0, 'twistMaxRad', 1.0, 'offsetBase', 0.1, 'offsetSpan', 0.8
    ),
    'controls', jsonb_build_object('height', true, 'tilt', false, 'twist', false)
  ),
  jsonb_build_object(
    'correctKey', 'PLANE', 'vertexCount', 3, 'shapeToleranceRms', 0.3,
    'targetSignature', jsonb_build_array(
      jsonb_build_array(0, 0), jsonb_build_array(1, 0), jsonb_build_array(0, 1)
    )
  ),
  jsonb_build_object('mode', 'computed_solver', 'solver', 'cross_section_shape_match'),
  '{}'::jsonb
);

-- Three dispatch fixtures: rule -> placement, rule -> constructed value, neither -> keyed.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values
  (
    '00000000-0000-4000-8000-0000000e0005',
    'QUANT-NUMLINE-01', 'quantitative', 7.0, array['4-5'], '{}'::jsonb,
    jsonb_build_object('correctKey', 'MARK', 'targetRatio', 0.5, 'tolerance', 0.05),
    jsonb_build_object('mode', 'deterministic_key', 'rule', 'placement_tolerance'),
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-0000000e0006',
    'QUANT-BUILD-01', 'quantitative', 7.0, array['4-5'], '{}'::jsonb,
    jsonb_build_object('correctKey', '42', 'optimalValue', 42),
    jsonb_build_object('mode', 'computed_solver', 'rule', 'constructed_value_equals_optimum'),
    '{}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-0000000e0007',
    'FLU-DISPATCH-01', 'fluid_reasoning', 7.0, array['4-5'], '{}'::jsonb,
    jsonb_build_object('correctKey', 'C'),
    jsonb_build_object('mode', 'deterministic_key'),
    '{}'::jsonb
  );

-- --- 1. Firewall posture -----------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'app.exam_verify_response(uuid,jsonb)', 'execute'),
  'anon cannot execute the verification dispatcher');                                   -- 1
select ok(
  not has_function_privilege('authenticated', 'app.exam_verify_response(uuid,jsonb)', 'execute'),
  'authenticated cannot execute the verification dispatcher');                          -- 2
select ok(
  not has_function_privilege('service_role', 'app.exam_verify_response(uuid,jsonb)', 'execute'),
  'service_role cannot execute the verification dispatcher');                           -- 3
select ok(
  has_function_privilege('api_executor', 'app.exam_verify_response(uuid,jsonb)', 'execute'),
  'api_executor CAN execute it — the same posture app.exam_score_response has');         -- 4

-- A function left with its default ACL is executable by PUBLIC, so a NULL proacl counts as a
-- violation here just as an explicit client-role grant does. This is the assertion that
-- catches a future port forgetting its revoke.
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname like 'exam_v%'
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
  'no verifier or reader function is reachable by PUBLIC, anon, authenticated or service_role'
);                                                                                      -- 5
select is(
  (
    select count(*)::integer
    from pg_class c
    cross join lateral aclexplode(c.relacl) a
    left join pg_roles r on r.oid = a.grantee
    where c.oid = 'app.exam_verifier_registry'::regclass
      and (a.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
  ),
  0,
  'the verifier registry grants nothing to PUBLIC, anon, authenticated or service_role'
);                                                                                      -- 6
select ok(
  has_table_privilege('api_executor', 'app.exam_verifier_registry', 'select'),
  'api_executor can read the registry, so the dispatcher can resolve a per-type verifier'
);                                                                                      -- 7
select ok(
  has_function_privilege('api_executor', 'app.exam_score_response(uuid,jsonb)', 'execute'),
  'the demoted app.exam_score_response is retained and still callable (D-027 is reversible)'
);                                                                                      -- 8

-- --- 2. Resolution order -----------------------------------------------------------

select is(
  (select count(*)::integer from app.exam_verifier_registry),
  4,
  'four per-type verifiers are registered — the port is deliberately partial'
);                                                                                      -- 9
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000e0001', '{}'::jsonb) ->> 'verifier',
  'exam_verify_concept',
  'step 1: a registered per-type verifier wins'
);                                                                                      -- 10
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000e0005', '{}'::jsonb) ->> 'verifier',
  'exam_verify_placement_tolerance',
  'step 2: scoring.rule = placement_tolerance resolves to the placement verifier'
);                                                                                      -- 11
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000e0006', '{}'::jsonb) ->> 'verifier',
  'exam_verify_constructed_value',
  'step 2: scoring.rule = constructed_value_equals_optimum resolves to the value verifier'
);                                                                                      -- 12
select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000e0007', '{}'::jsonb) ->> 'verifier',
  'exam_verify_keyed',
  'step 3: a type with no per-type verifier and no rule falls through to the keyed default'
);                                                                                      -- 13
select is(
  app.exam_verify_response('00000000-0000-4000-8000-00000000dead', '{}'::jsonb)::text,
  '{"mode": "unknown", "score": 0, "correct": false, "metrics": {}, "verifier": "none"}',
  'an unknown item is incorrect and says so, rather than raising mid-submission'
);                                                                                      -- 14

-- A skip is scored incorrect WITHOUT grading, mirroring /api/exam-submit. The body here is
-- the fully correct one, so this fails if the short-circuit is missing.
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0003',
    '{"counts":{"A":2,"B":4},"skipped":true}'::jsonb
  ) ->> 'correct'),
  'false',
  'a skipped item is incorrect even when the response body is the correct one'
);                                                                                      -- 15
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0003',
    '{"counts":{"A":2,"B":4},"skipped":true}'::jsonb
  ) -> 'metrics')::text,
  '{}',
  'a skipped item carries no metrics, as the submit route drops them'
);                                                                                      -- 16

-- --- 3. Parity on the four ported types --------------------------------------------

select set_config(
  'test.concept_ok',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0001',
    jsonb_build_object(
      'probeAnswers', jsonb_build_array(
        jsonb_build_object('key', 'P1', 'opens', true),
        jsonb_build_object('key', 'P2', 'opens', false)
      ),
      'tests', jsonb_build_array(
        jsonb_build_object('figure', jsonb_build_object('shape', 'triangle', 'color', 'red'))
      )
    )
  )::text,
  true
);
select is(
  (current_setting('test.concept_ok')::jsonb) ->> 'correct',
  'true',
  'FLU-CONCEPT-01: the probe verdicts the gate evidence forces score correct'
);                                                                                      -- 17
select is(
  (current_setting('test.concept_ok')::jsonb) #>> '{metrics,M-POLY}',
  '1',
  'FLU-CONCEPT-01: M-POLY is 1 when every probe is classified right'
);                                                                                      -- 18
select is(
  (current_setting('test.concept_ok')::jsonb) #>> '{metrics,M-HYP}',
  '0.5',
  'FLU-CONCEPT-01: M-HYP reports the share of the rule space the child''s own test removed'
);                                                                                      -- 19
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0001',
    '{"answerKeyString":"NN"}'::jsonb
  ) #>> '{metrics,M-POLY}'),
  '0.5',
  'FLU-CONCEPT-01: a half-right classification is incorrect but keeps half the poly credit'
);                                                                                      -- 20

select set_config(
  'test.evidence_ok',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0002',
    '{"answerKey":"B","evidenceKey":"s1"}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.evidence_ok')::jsonb) ->> 'correct',
  'true',
  'VER-EVIDENCE-01: the option and the sentence re-derived from provenance both land'
);                                                                                      -- 21
select is(
  (current_setting('test.evidence_ok')::jsonb) #>> '{metrics,M-INFDEPTH}',
  '2',
  'VER-EVIDENCE-01: M-INFDEPTH records the depth actually PROVED, so only on full credit'
);                                                                                      -- 22
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0002',
    '{"answerKey":"A","evidenceKey":"s1"}'::jsonb
  )::jsonb #>> '{metrics,M-POLY}'),
  '0.5',
  'VER-EVIDENCE-01: the right sentence under the wrong option is half credit, not zero'
);                                                                                      -- 23

select set_config(
  'test.mix_ok',
  app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0003',
    '{"counts":{"A":2,"B":4}}'::jsonb
  )::text,
  true
);
select is(
  (current_setting('test.mix_ok')::jsonb) ->> 'correct',
  'true',
  'QUANT-MIX-01: the one reachable equivalent mix scores correct'
);                                                                                      -- 24
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-0000000e0003',
    '{"counts":{"A":3,"B":6}}'::jsonb
  ) ->> 'correct'),
  'false',
  'QUANT-MIX-01: an equivalent ratio that breaks the served constraint is incorrect'
);                                                                                      -- 25

select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000e0004', '{}'::jsonb) ->> 'verifier',
  'exam_verify_xplane',
  'SPA-XPLANE-01: the dispatcher routes to the ported cross-section verifier'
);                                                                                      -- 26
select is(
  (app.exam_verify_response('00000000-0000-4000-8000-0000000e0004', '{}'::jsonb) -> 'metrics')::text,
  '{}',
  'SPA-XPLANE-01: a response with no plane fails closed before any geometry is graded'
);                                                                                      -- 27

-- --- The verdict payload carries no key material -----------------------------------

select ok(
  (
    app.exam_verify_response(
      '00000000-0000-4000-8000-0000000e0002', '{"answerKey":"B","evidenceKey":"s1"}'::jsonb
    )::text
    || app.exam_verify_response(
      '00000000-0000-4000-8000-0000000e0003', '{"counts":{"A":2,"B":4}}'::jsonb
    )::text
    || app.exam_verify_response(
      '00000000-0000-4000-8000-0000000e0001', '{"answerKeyString":"NN"}'::jsonb
    )::text
  ) !~ '(answer_key|answerKey|correctKey|correctCounts|targetSignature|distractorRationales|solution|provenance|B\+s1|YN)',
  'no verdict returns a key, a solution, or a derived expected answer'
);                                                                                      -- 28

select is(
  (
    select count(*)::integer from app.exam_item
    where item_id in (
      '00000000-0000-4000-8000-0000000e0001', '00000000-0000-4000-8000-0000000e0002',
      '00000000-0000-4000-8000-0000000e0003', '00000000-0000-4000-8000-0000000e0004'
    )
      and answer_key ? 'correctKey'
  ),
  4,
  'the fixtures DO hold real answer keys server-side (assertion 28 is not vacuous)'
);                                                                                      -- 29

select * from finish();

rollback;
