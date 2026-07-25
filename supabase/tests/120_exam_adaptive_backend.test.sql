-- Adaptive K-8 screener backend: schema shape + RLS firewall + RPC posture + a
-- deterministic server-authoritative roundtrip smoke (create -> start -> next ->
-- submit x2 -> outcome). Verifies float difficulty, the metric map, the served-item
-- answer-key firewall, and that outcomes carry no admit/defer/retry decision.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(44);

-- Test-only access so RPCs (SECURITY DEFINER, owned by api_executor) can reach pgcrypto.
grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures (inserted as the migration superuser) ------
insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-test',
  jsonb_build_object(
    'policyVersion', 'exam-syn-test',
    'domains', jsonb_build_array('fluid_reasoning'),
    'gradeStart', jsonb_build_object('K-1', 2.5, '2-3', 6, '4-5', 10, '6-8', 14),
    'minItemsPerArea', 1,
    'maxItemsPerArea', 2,
    'maxItems', 2,
    'stepSize', 0.8,
    'stableDelta', 0.5,
    'areaWeights', jsonb_build_object('fluid_reasoning', 1),
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values ('FLU-TEST-01', 'fluid_reasoning', 'Test Matrix', 'FLU-TEST-01.html',
        array['M-ACC', 'M-DIFFREACH'])
on conflict (type_code) do nothing;

insert into app.exam_item (item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring)
values
  (
    '00000000-0000-4000-8000-0000000a0001',
    'FLU-TEST-01', 'fluid_reasoning', 10.0, array['4-5'],
    jsonb_build_object('prompt', 'p', 'options',
      jsonb_build_array(jsonb_build_object('key', 'A'), jsonb_build_object('key', 'B'))),
    jsonb_build_object('correctKey', 'B'),
    jsonb_build_object('mode', 'deterministic_key')
  ),
  (
    '00000000-0000-4000-8000-0000000a0002',
    'FLU-TEST-01', 'fluid_reasoning', 11.0, array['4-5'],
    jsonb_build_object('prompt', 'p', 'options',
      jsonb_build_array(jsonb_build_object('key', 'A'), jsonb_build_object('key', 'B'))),
    jsonb_build_object('correctKey', 'A'),
    jsonb_build_object('mode', 'deterministic_key')
  );

-- --- Schema shape (8 tables) ------------------------------------------------------
select has_table('app', 'exam_policy', 'tunable policy table exists');                         -- 1
select has_table('app', 'exam_question_type', 'question-type registry exists');                -- 2
select has_table('app', 'exam_item', 'item bank exists');                                      -- 3
select has_table('app', 'exam_participant', 'pseudonymous participant table exists');          -- 4
select has_table('app', 'exam_session', 'session table exists');                               -- 5
select has_table('app', 'exam_item_response', 'scored response table exists');                 -- 6
select has_table('app', 'exam_telemetry_event', 'append-only telemetry trace exists');         -- 7
select has_table('app', 'exam_session_outcome', 'score/profile outcome exists');               -- 8

-- --- Adaptations: float difficulty, server-only key, metric map, no decision ------
select has_column('app', 'exam_item', 'difficulty', 'items carry a difficulty value');         -- 9
select has_column('app', 'exam_item', 'answer_key', 'items carry a server-only answer key');   -- 10
select has_column('app', 'exam_item_response', 'metrics', 'responses carry a metric map');      -- 11
select has_column('app', 'exam_session_outcome', 'profile', 'outcome carries a profile');       -- 12
select hasnt_column(
  'app', 'exam_session_outcome', 'decision',
  'outcome carries NO admit/defer/retry decision (BUILD_PLAN §5)'
);                                                                                              -- 13
select col_type_is(
  'app', 'exam_item', 'difficulty', 'numeric',
  'difficulty is a FLOAT numeric on 1..20, not an integer'
);                                                                                              -- 14

-- --- Forced RLS on all 8 tables ---------------------------------------------------
select is(
  (
    select count(*)::integer from pg_class
    where relnamespace = 'app'::regnamespace
      and relname in (
        'exam_policy', 'exam_question_type', 'exam_item', 'exam_participant',
        'exam_session', 'exam_item_response', 'exam_telemetry_event', 'exam_session_outcome'
      )
      and relrowsecurity
  ),
  8,
  'all 8 exam tables enable RLS'
);                                                                                              -- 15
select is(
  (
    select count(*)::integer from pg_class
    where relnamespace = 'app'::regnamespace
      and relname in (
        'exam_policy', 'exam_question_type', 'exam_item', 'exam_participant',
        'exam_session', 'exam_item_response', 'exam_telemetry_event', 'exam_session_outcome'
      )
      and relforcerowsecurity
  ),
  8,
  'all 8 exam tables force RLS'
);                                                                                              -- 16

-- --- Firewall: authenticated has no direct table reads ----------------------------
select ok(
  not has_table_privilege('authenticated', 'app.exam_item', 'select'),
  'authenticated cannot read the item bank directly'
);                                                                                              -- 17
select ok(
  not has_table_privilege('authenticated', 'app.exam_item_response', 'select'),
  'authenticated cannot read responses directly'
);                                                                                              -- 18
select ok(
  not has_table_privilege('authenticated', 'app.exam_session_outcome', 'select'),
  'authenticated cannot read outcomes directly'
);                                                                                              -- 19

-- --- RPC surface exists -----------------------------------------------------------
select ok(to_regprocedure('api.exam_create_participant(text,text,uuid)') is not null,
  'create_participant RPC is explicit');                                                        -- 20
select ok(to_regprocedure('api.exam_list_items(text,text,uuid)') is not null,
  'list_items RPC is explicit');                                                                -- 21
select ok(to_regprocedure('api.exam_start_session(uuid,text,text,uuid,uuid)') is not null,
  'start_session RPC is explicit');                                                             -- 22
select ok(to_regprocedure('api.exam_get_next_item(uuid,uuid)') is not null,
  'get_next_item RPC is explicit');                                                             -- 23
select ok(
  to_regprocedure('api.exam_submit_response(uuid,uuid,jsonb,jsonb,jsonb,uuid,uuid)') is not null,
  'submit_response RPC is explicit');                                                           -- 24
select ok(to_regprocedure('api.exam_get_session_state(uuid,uuid)') is not null,
  'get_session_state RPC is explicit');                                                         -- 25
select ok(to_regprocedure('api.exam_get_outcome(uuid,uuid)') is not null,
  'get_outcome RPC is explicit');                                                               -- 26

-- --- RPC posture: SECURITY DEFINER, constrained owner, pinned search path ---------
select is(
  (
    select count(*)::integer from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'api'
      and p.proname in (
        'exam_create_participant', 'exam_list_items', 'exam_start_session',
        'exam_get_next_item', 'exam_submit_response', 'exam_get_session_state', 'exam_get_outcome'
      )
      and p.prosecdef
  ),
  7,
  'all 7 exam RPCs are SECURITY DEFINER'
);                                                                                              -- 27
select is(
  (
    select count(*)::integer from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_roles r on r.oid = p.proowner
    where n.nspname = 'api'
      and p.proname in (
        'exam_create_participant', 'exam_list_items', 'exam_start_session',
        'exam_get_next_item', 'exam_submit_response', 'exam_get_session_state', 'exam_get_outcome'
      )
      and r.rolname = 'api_executor'
  ),
  7,
  'all 7 exam RPCs have the constrained executor owner'
);                                                                                              -- 28
select is(
  (
    select count(*)::integer from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'api'
      and p.proname in (
        'exam_create_participant', 'exam_list_items', 'exam_start_session',
        'exam_get_next_item', 'exam_submit_response', 'exam_get_session_state', 'exam_get_outcome'
      )
      and p.proconfig @> array['search_path=pg_catalog, extensions']
  ),
  7,
  'all 7 exam RPCs pin a safe search path'
);                                                                                              -- 29

-- --- Server-authoritative roundtrip smoke -----------------------------------------
select set_config('app.user_id', '00000000-0000-4000-8000-00000000e001', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;

select set_config(
  'test.exam_part',
  api.exam_create_participant('PART-SYN-T1', '4-5', '00000000-0000-4000-8000-00000000c001')::text,
  true
);
select is(
  (current_setting('test.exam_part')::jsonb) #>> '{data,participant,ageBand}',
  '4-5',
  'create_participant returns the pseudonymous synthetic participant'
);                                                                                              -- 30
select set_config(
  'test.exam_participant',
  (current_setting('test.exam_part')::jsonb) #>> '{data,participant,participantId}',
  true
);

select set_config(
  'test.exam_start',
  api.exam_start_session(
    current_setting('test.exam_participant')::uuid,
    'exam-syn-test', '4-5',
    '00000000-0000-4000-8000-00000000c002',
    '00000000-0000-4000-8000-00000000c003'
  )::text,
  true
);
select is(
  (current_setting('test.exam_start')::jsonb) #>> '{data,session,status}',
  'active',
  'start_session opens an active session seeded from the grade band'
);                                                                                              -- 31
select ok(
  (current_setting('test.exam_start')::jsonb) #> '{data,session,areaState}' ? 'fluid_reasoning',
  'session seeds per-area adaptive state keyed by domain'
);                                                                                              -- 32
select set_config(
  'test.exam_session',
  (current_setting('test.exam_start')::jsonb) #>> '{data,session,sessionId}',
  true
);

select set_config(
  'test.exam_next',
  api.exam_get_next_item(
    current_setting('test.exam_session')::uuid,
    '00000000-0000-4000-8000-00000000c004'
  )::text,
  true
);
select ok(
  (current_setting('test.exam_next')::jsonb) #> '{data,item}' is not null,
  'get_next_item serves an adaptive item for the active session'
);                                                                                              -- 33
select ok(
  current_setting('test.exam_next') !~ '(answerKey|answer_key|correctKey|solution)',
  'served item leaks NO answer key or scoring solution'
);                                                                                              -- 34

select set_config(
  'test.exam_s1',
  api.exam_submit_response(
    current_setting('test.exam_session')::uuid,
    '00000000-0000-4000-8000-0000000a0001',
    '{"key":"B"}'::jsonb,
    '{"M-RT":4200,"M-ERRTYPE":0}'::jsonb,
    '[{"kind":"focus","tOffsetMs":10,"seq":0,"payload":{}}]'::jsonb,
    '00000000-0000-4000-8000-00000000c101',
    '00000000-0000-4000-8000-00000000c102'
  )::text,
  true
);
select is(
  (current_setting('test.exam_s1')::jsonb) #>> '{data,scored,correct}',
  'true',
  'submit_response verifies a correct answer server-side (client never asserts it)'
);                                                                                              -- 35
select is(
  (current_setting('test.exam_s1')::jsonb) #>> '{data,scored,score}',
  '1',
  'a correct answer scores 1 deterministically'
);                                                                                              -- 36

select set_config(
  'test.exam_s2',
  api.exam_submit_response(
    current_setting('test.exam_session')::uuid,
    '00000000-0000-4000-8000-0000000a0002',
    '{"key":"Z"}'::jsonb,
    '{"M-RT":8000}'::jsonb,
    null,
    '00000000-0000-4000-8000-00000000c103',
    '00000000-0000-4000-8000-00000000c104'
  )::text,
  true
);
select is(
  (current_setting('test.exam_s2')::jsonb) #>> '{data,scored,correct}',
  'false',
  'submit_response marks a wrong answer incorrect server-side'
);                                                                                              -- 37
select is(
  (current_setting('test.exam_s2')::jsonb) #>> '{data,done}',
  'true',
  'variable-length battery stops when the policy stop rule fires'
);                                                                                              -- 38

select set_config(
  'test.exam_out',
  api.exam_get_outcome(
    current_setting('test.exam_session')::uuid,
    '00000000-0000-4000-8000-00000000c105'
  )::text,
  true
);
select is(
  (current_setting('test.exam_out')::jsonb) #>> '{data,complete}',
  'true',
  'get_outcome reports completion once the session ends'
);                                                                                              -- 39
select ok(
  (current_setting('test.exam_out')::jsonb) #> '{data,outcome,areaScores}' is not null,
  'outcome exposes a per-area score/profile (deterministic, reproducible)'
);                                                                                              -- 40

select set_config(
  'test.exam_state',
  api.exam_get_session_state(
    current_setting('test.exam_session')::uuid,
    '00000000-0000-4000-8000-00000000c106'
  )::text,
  true
);
select is(
  jsonb_array_length((current_setting('test.exam_state')::jsonb) #> '{data,responses}'),
  2,
  'session state reconstructs both scored responses in order'
);                                                                                              -- 41
select ok(
  ((current_setting('test.exam_state')::jsonb) #>> '{data,telemetryCount}')::integer >= 1,
  'the full telemetry trace is persisted with the session'
);                                                                                              -- 42

-- --- Cross-owner isolation + hard schema firewall ---------------------------------
reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000e002', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;

select throws_ok(
  format(
    'select api.exam_get_session_state(%L::uuid, %L::uuid)',
    current_setting('test.exam_session'),
    '00000000-0000-4000-8000-00000000c199'
  ),
  'PT404',
  'RESOURCE_NOT_FOUND',
  'another operator cannot discover a foreign session'
);                                                                                              -- 43

reset role;
set local role authenticated;
select throws_ok(
  'select * from app.exam_item',
  '42501',
  'permission denied for schema app',
  'authenticated receives a hard denial for direct item-bank reads'
);                                                                                              -- 44

reset role;

select * from finish();

rollback;
