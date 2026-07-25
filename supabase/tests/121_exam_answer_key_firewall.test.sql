-- Answer-key firewall for the adaptive K-8 screener (BUILD_PLAN §0/§2/§6).
--
-- The single most important security property of this backend: an item's answer key
-- and scoring rule must NEVER be reachable by a client. This file proves that from
-- three independent directions:
--   1. ACL/grant posture   — no client-facing role holds any privilege on the columns.
--   2. Runtime denial      — anon and authenticated get a hard 42501 on a direct read.
--   3. Projection contents — the item-serving RPCs return an enumerated, key-free
--                            field set, and their payloads match no key-material pattern.
--
-- Assertions 11-12 deliberately prove the key IS present server-side, so the
-- firewall assertions above cannot pass vacuously against an empty column.
--
-- Note on naming: BUILD_PLAN §2 calls the contract field `answer`; the physical
-- column is `app.exam_item.answer_key`. Both it and `scoring` are covered here.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(26);

-- Test-only access, mirroring the sibling suites (api_executor already holds this
-- permanently from 20260720064000; authenticated needs it to resolve pgTAP itself).
grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures --------------------------------------------
insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-fw',
  jsonb_build_object(
    'policyVersion', 'exam-syn-fw',
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
values ('FLU-FIREWALL-01', 'fluid_reasoning', 'Firewall Fixture', 'FLU-FIREWALL-01.html',
        array['M-ACC', 'M-DIFFREACH'])
on conflict (type_code) do nothing;

insert into app.exam_item (item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring)
values (
  '00000000-0000-4000-8000-0000000f0001',
  'FLU-FIREWALL-01', 'fluid_reasoning', 10.0, array['4-5'],
  jsonb_build_object('prompt', 'p', 'options',
    jsonb_build_array(jsonb_build_object('key', 'A'), jsonb_build_object('key', 'B'))),
  jsonb_build_object('correctKey', 'B', 'distractorRationales', jsonb_build_object('A', 'lure')),
  jsonb_build_object('mode', 'deterministic_key')
);

-- --- 1. Grant posture: no client-facing role can reach the private schema ----------
select ok(not has_schema_privilege('anon', 'app', 'usage'),
  'anon has no USAGE on the private app schema');                                       -- 1
select ok(not has_schema_privilege('authenticated', 'app', 'usage'),
  'authenticated has no USAGE on the private app schema');                              -- 2
select ok(not has_schema_privilege('service_role', 'app', 'usage'),
  'service_role has no USAGE on the private app schema');                               -- 3
select is(
  (
    select count(*)::integer
    from pg_class c
    cross join lateral aclexplode(c.relacl) a
    left join pg_roles r on r.oid = a.grantee
    where c.oid = 'app.exam_item'::regclass
      and (a.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role'))
  ),
  0,
  'app.exam_item ACL grants nothing to PUBLIC, anon, authenticated, or service_role'
);                                                                                      -- 4

-- --- Column-level privilege on the two server-only columns ------------------------
select ok(not has_column_privilege('anon', 'app.exam_item', 'answer_key', 'select'),
  'anon holds no SELECT on app.exam_item.answer_key');                                  -- 5
select ok(not has_column_privilege('authenticated', 'app.exam_item', 'answer_key', 'select'),
  'authenticated holds no SELECT on app.exam_item.answer_key');                         -- 6
select ok(not has_column_privilege('service_role', 'app.exam_item', 'answer_key', 'select'),
  'service_role holds no SELECT on app.exam_item.answer_key');                          -- 7
select ok(not has_column_privilege('anon', 'app.exam_item', 'scoring', 'select'),
  'anon holds no SELECT on app.exam_item.scoring');                                     -- 8
select ok(not has_column_privilege('authenticated', 'app.exam_item', 'scoring', 'select'),
  'authenticated holds no SELECT on app.exam_item.scoring');                            -- 9
select ok(not has_column_privilege('service_role', 'app.exam_item', 'scoring', 'select'),
  'service_role holds no SELECT on app.exam_item.scoring');                             -- 10

-- --- 2. Anti-vacuity: the key really is stored server-side -------------------------
select is(
  (select answer_key ->> 'correctKey' from app.exam_item
   where item_id = '00000000-0000-4000-8000-0000000f0001'),
  'B',
  'the item DOES hold a real answer key server-side (firewall tests are not vacuous)'
);                                                                                      -- 11
select is(
  (select scoring ->> 'mode' from app.exam_item
   where item_id = '00000000-0000-4000-8000-0000000f0001'),
  'deterministic_key',
  'the item DOES hold a real scoring rule server-side'
);                                                                                      -- 12

-- --- Runtime denial for a direct read of each server-only column -------------------
set local role anon;
select throws_ok(
  'select answer_key from app.exam_item',
  '42501', 'permission denied for schema app',
  'anon is hard-denied a direct read of exam_item.answer_key'
);                                                                                      -- 13
select throws_ok(
  'select scoring from app.exam_item',
  '42501', 'permission denied for schema app',
  'anon is hard-denied a direct read of exam_item.scoring'
);                                                                                      -- 14

reset role;
set local role authenticated;
select throws_ok(
  'select answer_key from app.exam_item',
  '42501', 'permission denied for schema app',
  'authenticated is hard-denied a direct read of exam_item.answer_key'
);                                                                                      -- 15
select throws_ok(
  'select scoring from app.exam_item',
  '42501', 'permission denied for schema app',
  'authenticated is hard-denied a direct read of exam_item.scoring'
);                                                                                      -- 16
reset role;

-- --- No PostgREST-visible relation can expose the bank -----------------------------
-- config.toml exposes only the `api` schema, and `api` holds functions exclusively.
select is(
  (select count(*)::integer from information_schema.tables where table_schema = 'api'),
  0,
  'the PostgREST-exposed api schema contains no tables'
);                                                                                      -- 17
select is(
  (select count(*)::integer from information_schema.views where table_schema = 'api'),
  0,
  'the PostgREST-exposed api schema contains no views'
);                                                                                      -- 18
select ok(
  not has_function_privilege('anon', 'api.exam_get_next_item(uuid,uuid)', 'execute'),
  'anon cannot execute the item-serving RPC');                                          -- 19
select ok(
  not has_function_privilege('anon', 'api.exam_list_items(text,text,uuid)', 'execute'),
  'anon cannot execute the bank-listing RPC');                                          -- 20
select ok(
  not has_function_privilege(
    'anon', 'api.exam_submit_response(uuid,uuid,jsonb,jsonb,jsonb,uuid,uuid)', 'execute'),
  'anon cannot execute the response-submission RPC');                                   -- 21

-- --- 3. The served projection is key-free ------------------------------------------
select is(
  (
    select array_agg(k order by k)::text
    from jsonb_object_keys(
      app.exam_served_item_json('00000000-0000-4000-8000-0000000f0001')
    ) k
  ),
  '{ageBands,content,demoPath,difficulty,domain,itemId,syntheticOnly,typeCode,validated}',
  'the served projection exposes exactly the presentation fields (no answer_key/scoring/provenance)'
);                                                                                      -- 22

-- Same guarantee through the actual client-facing RPC, as an operator.
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f101', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;

select set_config(
  'test.fw_part',
  api.exam_create_participant('PART-SYN-FW1', '4-5', '00000000-0000-4000-8000-00000000f102')::text,
  true
);
select set_config(
  'test.fw_start',
  api.exam_start_session(
    ((current_setting('test.fw_part')::jsonb) #>> '{data,participant,participantId}')::uuid,
    'exam-syn-fw', '4-5',
    '00000000-0000-4000-8000-00000000f103',
    '00000000-0000-4000-8000-00000000f104'
  )::text,
  true
);
select set_config(
  'test.fw_next',
  api.exam_get_next_item(
    ((current_setting('test.fw_start')::jsonb) #>> '{data,session,sessionId}')::uuid,
    '00000000-0000-4000-8000-00000000f105'
  )::text,
  true
);

select is(
  (
    select array_agg(k order by k)::text
    from jsonb_object_keys((current_setting('test.fw_next')::jsonb) #> '{data,item}') k
  ),
  '{ageBands,content,demoPath,difficulty,domain,itemId,syntheticOnly,typeCode,validated}',
  'exam_get_next_item returns exactly the key-free presentation fields'
);                                                                                      -- 23
select ok(
  current_setting('test.fw_next')
    !~ '(answer_key|answerKey|correctKey|distractorRationales|solution|provenance)',
  'the exam_get_next_item payload matches no answer-key or scoring-rule pattern'
);                                                                                      -- 24

select set_config(
  'test.fw_list',
  api.exam_list_items('exam-syn-fw', '4-5', '00000000-0000-4000-8000-00000000f106')::text,
  true
);
select cmp_ok(
  jsonb_array_length((current_setting('test.fw_list')::jsonb) #> '{data,items}'),
  '>=', 1,
  'exam_list_items actually returned bank items (payload scan below is not vacuous)'
);                                                                                      -- 25
select ok(
  current_setting('test.fw_list')
    !~ '(answer_key|answerKey|correctKey|distractorRationales|solution|provenance)',
  'the exam_list_items payload matches no answer-key or scoring-rule pattern'
);                                                                                      -- 26

reset role;

select * from finish();

rollback;
