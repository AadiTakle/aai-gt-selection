-- The scorer input is server-only, owner-scoped, and carries the DATABASE's verdicts (E-084).
--
-- `/api/exam-results` now scores `app.exam_scorer_input_json` instead of the `scoredItems`
-- array the browser posts, and reaches it through `api.exam_get_scoring_inputs`. That read
-- becomes part of the scoring path, so the properties the score now depends on have to be
-- pinned:
--
--   1. FIREWALL      — the underlying app.* derivations stay unreachable from every client
--                      role, so the only way to the trace is the owner-checked api RPC.
--   2. OWNERSHIP     — a session's own owner may read its scorer input, and a SECOND owner
--                      reading the first owner's session gets RESOURCE_NOT_FOUND, not a trace.
--   3. PROVENANCE    — the `correct`/`score` the scorer is handed are the ones
--                      `api.exam_submit_response` derived from the server-only answer key, so
--                      a caller that claims a wrong answer was right is contradicted by the
--                      input the scorer actually reads.
--
-- Assertion 8 exists so 3-7 cannot pass vacuously: the fixture really does contain a
-- correct answer and a wrong one, graded against a real key.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(10);

grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures --------------------------------------------
insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-input',
  jsonb_build_object(
    'policyVersion', 'exam-syn-input',
    'domains', jsonb_build_array('fluid_reasoning'),
    'gradeStart', jsonb_build_object('K-1', 2.5, '2-3', 6, '4-5', 10, '6-8', 14),
    'hardItemCap', 50,
    'stepSize', 0.8,
    'areaWeights', jsonb_build_object('fluid_reasoning', 1),
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values ('FLU-INPUT-01', 'fluid_reasoning', 'Scorer Input Fixture', 'FLU-INPUT-01.html',
        array['M-ACC', 'M-DIFFREACH'])
on conflict (type_code) do nothing;

insert into app.exam_item (item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring)
values
  (
    '00000000-0000-4000-8000-0000000c0001',
    'FLU-INPUT-01', 'fluid_reasoning', 9.0, array['4-5'],
    jsonb_build_object('prompt', 'p', 'options',
      jsonb_build_array(jsonb_build_object('key', 'A'), jsonb_build_object('key', 'B'))),
    jsonb_build_object('correctKey', 'B'),
    jsonb_build_object('mode', 'deterministic_key')
  ),
  (
    '00000000-0000-4000-8000-0000000c0002',
    'FLU-INPUT-01', 'fluid_reasoning', 12.0, array['4-5'],
    jsonb_build_object('prompt', 'p', 'options',
      jsonb_build_array(jsonb_build_object('key', 'A'), jsonb_build_object('key', 'B'))),
    jsonb_build_object('correctKey', 'A'),
    jsonb_build_object('mode', 'deterministic_key')
  );

-- --- 1. Firewall: the derivations themselves are server-only -----------------------
-- The scoring path reads these through api.exam_get_scoring_inputs, which checks ownership.
-- If a client role could call them directly, that check would be decorative.
select ok(
  not has_function_privilege('authenticated', 'app.exam_scorer_input_json(uuid)', 'execute'),
  'app.exam_scorer_input_json is unreachable from the authenticated role'
);                                                                                              -- 1
select ok(
  not has_function_privilege('anon', 'app.exam_scorer_input_hash(uuid)', 'execute'),
  'app.exam_scorer_input_hash is unreachable from anon'
);                                                                                              -- 2

-- --- A two-item battery owned by operator A ----------------------------------------
select set_config('app.user_id', '00000000-0000-4000-8000-00000000c001', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;

select set_config(
  'test.input_session',
  (api.exam_start_session(
    ((api.exam_create_participant('PART-SYN-INP1', '4-5',
      '00000000-0000-4000-8000-00000000c101')::jsonb) #>> '{data,participant,participantId}')::uuid,
    'exam-syn-input', '4-5',
    '00000000-0000-4000-8000-00000000c102',
    '00000000-0000-4000-8000-00000000c103'
  )::jsonb) #>> '{data,session,sessionId}',
  true
);

-- Item 1 answered correctly, item 2 answered wrongly. Both verdicts come from the
-- server-only key inside api.exam_submit_response; nothing the caller sends sets them.
select api.exam_submit_response(
  current_setting('test.input_session')::uuid,
  '00000000-0000-4000-8000-0000000c0001',
  '{"selectedKey":"B"}'::jsonb,
  '{"M-RT":4200}'::jsonb,
  null,
  '00000000-0000-4000-8000-00000000c104',
  '00000000-0000-4000-8000-00000000c105'
);
select api.exam_submit_response(
  current_setting('test.input_session')::uuid,
  '00000000-0000-4000-8000-0000000c0002',
  '{"selectedKey":"B"}'::jsonb,
  '{"M-RT":9100}'::jsonb,
  null,
  '00000000-0000-4000-8000-00000000c106',
  '00000000-0000-4000-8000-00000000c107'
);

select set_config(
  'test.input_read',
  api.exam_get_scoring_inputs(
    current_setting('test.input_session')::uuid,
    '00000000-0000-4000-8000-00000000c108'
  )::text,
  true
);

-- --- 2. The owner reads the canonical scorer input ---------------------------------
select is(
  (current_setting('test.input_read')::jsonb) #>> '{data,itemCount}',
  '2',
  'the session owner reads the whole trace as canonical scorer input'
);                                                                                              -- 3
select is(
  (
    select array_agg(key order by key)
    from jsonb_object_keys(
      (current_setting('test.input_read')::jsonb) #> '{data,items,0}'
    ) as key
  ),
  array['correct', 'difficulty', 'domain', 'itemId', 'metrics', 'score', 'typeCode'],
  'each input item carries exactly the fields packages/exam-scoring ScoredItem consumes'
);                                                                                              -- 4
select ok(
  (current_setting('test.input_read')::jsonb) #>> '{data,inputHash}' ~ '^sha256:[0-9a-f]{64}$',
  'the read carries the hash the outcome row will record, so the two can be compared'
);                                                                                              -- 5

-- --- 3. Provenance: the verdicts are the database's, in administration order -------
select is(
  (current_setting('test.input_read')::jsonb) #>> '{data,items,0,correct}',
  'true',
  'the input reports the key-verified verdict for the correctly answered item'
);                                                                                              -- 6
select is(
  (current_setting('test.input_read')::jsonb) #>> '{data,items,1,correct}',
  'false',
  'a wrong answer stays wrong in the scorer input — this is what a forged trace cannot change'
);                                                                                              -- 7
select is(
  ((current_setting('test.input_read')::jsonb) #>> '{data,items,1,difficulty}')::numeric,
  12.0::numeric,
  'difficulty comes from the registered bank item, not from anything the caller supplied'
);                                                                                              -- 8

-- --- 4. Ownership: a second operator cannot read the first one's input -------------
reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000c002', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;

select throws_ok(
  format(
    'select api.exam_get_scoring_inputs(%L::uuid, %L::uuid)',
    current_setting('test.input_session'),
    '00000000-0000-4000-8000-00000000c109'
  ),
  'PT404', 'RESOURCE_NOT_FOUND',
  'another operator cannot read the scorer input of a session they do not own'
);                                                                                              -- 9

-- The family persona must not reach the scoring path at all, owner or not.
reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000c001', true);
select set_config('app.user_role', 'family_guardian', true);
set local role authenticated;

select throws_ok(
  format(
    'select api.exam_get_scoring_inputs(%L::uuid, %L::uuid)',
    current_setting('test.input_session'),
    '00000000-0000-4000-8000-00000000c110'
  ),
  'PT403', 'ROLE_FORBIDDEN',
  'only the proctor persona may read a scorer input, even for its own user id'
);                                                                                              -- 10

reset role;

select * from finish();

rollback;
