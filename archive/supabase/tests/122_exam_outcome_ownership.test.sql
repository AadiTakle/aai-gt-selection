-- Single source of truth for scoring and the stop rule (D-029 Proposed; BUILD_PLAN §3/§5/§6).
--
-- The defect this file locks down: the database used to compute its own outcome inside
-- api.exam_submit_response, so one trace could yield two disagreeing scores — the DB's
-- "proficiency = final adaptive difficulty" simplification and the §5 bracket-then-position
-- score from packages/exam-scoring. It also owned a stop rule whose convergence branch was
-- effectively unreachable, silently turning the required variable-length battery into a fixed
-- one.
--
-- Proven here, in order:
--   1. DEMOTION      — app.exam_compute_outcome still exists but no api RPC calls it.
--   2. NO AUTO-SCORE — submitting responses creates a trace and NO outcome row.
--   3. VERBATIM      — an externally computed outcome round-trips byte-for-byte.
--   4. AUDITABLE     — the recorded input hash re-derives from the stored trace.
--   5. GUARDS        — ownership, born-synthetic, shape, idempotency, and single-write.
--   6. DEAD KNOBS    — the broken stableDelta/min/max stop-rule knobs are gone; the live
--                      hardItemCap sits above the engine's own cap so it can never truncate
--                      a legitimate battery.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(30);

grant usage on schema extensions to api_executor, authenticated;

-- --- Self-contained synthetic fixtures --------------------------------------------
insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-own',
  jsonb_build_object(
    'policyVersion', 'exam-syn-own',
    'domains', jsonb_build_array('fluid_reasoning'),
    'gradeStart', jsonb_build_object('K-1', 2.5, '2-3', 6, '4-5', 10, '6-8', 14),
    -- Deliberately high: the guard must NOT fire during this two-item battery, so the
    -- session can only be closed by the engine-driven record_outcome path.
    'hardItemCap', 50,
    'stepSize', 0.8,
    'areaWeights', jsonb_build_object('fluid_reasoning', 1),
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values ('FLU-OWNER-01', 'fluid_reasoning', 'Ownership Fixture', 'FLU-OWNER-01.html',
        array['M-ACC', 'M-DIFFREACH'])
on conflict (type_code) do nothing;

insert into app.exam_item (item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring)
values
  (
    '00000000-0000-4000-8000-0000000b0001',
    'FLU-OWNER-01', 'fluid_reasoning', 10.0, array['4-5'],
    jsonb_build_object('prompt', 'p', 'options',
      jsonb_build_array(jsonb_build_object('key', 'A'), jsonb_build_object('key', 'B'))),
    jsonb_build_object('correctKey', 'B'),
    jsonb_build_object('mode', 'deterministic_key')
  ),
  (
    '00000000-0000-4000-8000-0000000b0002',
    'FLU-OWNER-01', 'fluid_reasoning', 11.0, array['4-5'],
    jsonb_build_object('prompt', 'p', 'options',
      jsonb_build_array(jsonb_build_object('key', 'A'), jsonb_build_object('key', 'B'))),
    jsonb_build_object('correctKey', 'A'),
    jsonb_build_object('mode', 'deterministic_key')
  );

-- The scorer output this test records: the shape packages/exam-scoring `scoreExam` returns.
select set_config(
  'test.own_outcome',
  jsonb_build_object(
    'perArea', jsonb_build_object(
      'fluid_reasoning', jsonb_build_object(
        'area', 'fluid_reasoning',
        'proficiency', 12.5,
        'bracket', 3,
        'bracketRange', jsonb_build_array(11, 15),
        'accuracy', 0.4762,
        'positionWithinBracket', 0.375,
        'itemsScored', 2,
        'contributions', jsonb_build_array(jsonb_build_object(
          'metricId', 'M-DIFFREACH', 'value', 10, 'normalized', 0.4737,
          'weight', 3, 'direction', 'higher')),
        'metricCoverage', jsonb_build_object('M-ACC', 2, 'M-RT', 2, 'M-DIFFREACH', 1)
      )
    ),
    'composite', 12.5,
    'profile', jsonb_build_object(
      'strengths', jsonb_build_array(),
      'relativeWeaknesses', jsonb_build_array(),
      'rankedAreas', jsonb_build_array('fluid_reasoning'),
      'learningRate', jsonb_build_object('raw', null, 'normalized', null, 'label', 'unknown'),
      'consistency', jsonb_build_object('raw', null, 'normalized', null, 'label', 'unknown')
    ),
    'policyId', 'exam-scoring-syn-v1',
    'scaleMin', 1,
    'scaleMax', 20,
    'syntheticOnly', true
  )::text,
  true
);

-- --- 1. Demoted, not deleted -------------------------------------------------------
select ok(
  to_regprocedure('app.exam_compute_outcome(uuid)') is not null,
  'the in-database reference scorer is RETAINED (demotion is reversible, not a deletion)'
);                                                                                              -- 1
select ok(
  obj_description(to_regprocedure('app.exam_compute_outcome(uuid)')::oid, 'pg_proc')
    like 'DEMOTED%',
  'the reference scorer is documented as demoted, with the reversal step'
);                                                                                              -- 2
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'api' and p.prosrc like '%exam_compute_outcome%'
  ),
  0,
  'no api RPC calls the reference scorer — it can no longer auto-fire'
);                                                                                              -- 3
select ok(
  not has_function_privilege('authenticated', 'app.exam_compute_outcome(uuid)', 'execute'),
  'the reference scorer stays unreachable from every client role'
);                                                                                              -- 4

-- --- Outcome storage carries the audit trail verbatim storage requires -------------
select has_column('app', 'exam_session_outcome', 'outcome_raw',
  'outcomes store the scorer output verbatim');                                                 -- 5
select has_column('app', 'exam_session_outcome', 'scorer_source',
  'outcomes record which implementation scored them');                                          -- 6
select has_column('app', 'exam_session_outcome', 'scorer_input_hash',
  'outcomes record a hash of the exact inputs that produced them');                             -- 7

-- --- Dead / live policy knobs ------------------------------------------------------
select ok(
  not (
    (select config from app.exam_policy where policy_version = 'exam-syn-v1')
      ?| array['stableDelta', 'minItemsPerArea', 'maxItemsPerArea']
  ),
  'the broken stop-rule knobs are gone from the shipped policy (nothing reads them)'
);                                                                                              -- 8
select ok(
  (select config from app.exam_policy where policy_version = 'exam-syn-v1') ? 'stepSize',
  'stepSize STAYS: still live for the fallback difficulty bookkeeping'
);                                                                                              -- 9
select cmp_ok(
  ((select config from app.exam_policy where policy_version = 'exam-syn-v1') ->> 'hardItemCap')::int,
  '>', 60,
  'the database safety cap sits above the engine hardItemCap (60), so it never truncates a battery'
);                                                                                              -- 10

-- --- 2. A full battery produces a trace and NO outcome -----------------------------
select set_config('app.user_id', '00000000-0000-4000-8000-00000000b001', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;

select set_config(
  'test.own_session',
  (api.exam_start_session(
    ((api.exam_create_participant('PART-SYN-OWN1', '4-5',
      '00000000-0000-4000-8000-00000000b101')::jsonb) #>> '{data,participant,participantId}')::uuid,
    'exam-syn-own', '4-5',
    '00000000-0000-4000-8000-00000000b102',
    '00000000-0000-4000-8000-00000000b103'
  )::jsonb) #>> '{data,session,sessionId}',
  true
);

select set_config(
  'test.own_s1',
  api.exam_submit_response(
    current_setting('test.own_session')::uuid,
    '00000000-0000-4000-8000-0000000b0001',
    '{"key":"B"}'::jsonb,
    '{"M-RT":4200,"M-ERRTYPE":0}'::jsonb,
    '[{"kind":"focus","tOffsetMs":10,"seq":0,"payload":{}}]'::jsonb,
    '00000000-0000-4000-8000-00000000b104',
    '00000000-0000-4000-8000-00000000b105'
  )::text,
  true
);
select set_config(
  'test.own_s2',
  api.exam_submit_response(
    current_setting('test.own_session')::uuid,
    '00000000-0000-4000-8000-0000000b0002',
    '{"key":"Z"}'::jsonb,
    '{"M-RT":8000}'::jsonb,
    null,
    '00000000-0000-4000-8000-00000000b106',
    '00000000-0000-4000-8000-00000000b107'
  )::text,
  true
);

select is(
  (current_setting('test.own_s2')::jsonb) #>> '{data,hardCapReached}',
  'false',
  'the safety cap does not fire on a normal battery'
);                                                                                              -- 11
select is(
  (current_setting('test.own_s2')::jsonb) #>> '{data,stopRuleOwner}',
  'packages/exam-engine',
  'submit_response tells the caller who owns the stop decision'
);                                                                                              -- 12
select is(
  (current_setting('test.own_s2')::jsonb) #>> '{data,session,status}',
  'active',
  'the session stays open: the database does not decide the battery is finished'
);                                                                                              -- 13
select is(
  (current_setting('test.own_s2')::jsonb) #>> '{data,scored,correct}',
  'false',
  'per-item verification against the server-only key is UNCHANGED'
);                                                                                              -- 14

reset role;
select is(
  (
    select count(*)::integer from app.exam_session_outcome
    where session_id = current_setting('test.own_session')::uuid
  ),
  0,
  'submitting responses creates NO outcome row — the competing score is gone'
);                                                                                              -- 15
select is(
  (
    select count(*)::integer from app.exam_item_response
    where session_id = current_setting('test.own_session')::uuid
  ),
  2,
  'the full trace is still persisted (storage authority is retained)'
);                                                                                              -- 16

-- --- 3/4. Record an externally computed outcome: verbatim + auditable --------------
set local role authenticated;

select set_config(
  'test.own_inputs',
  api.exam_get_scoring_inputs(
    current_setting('test.own_session')::uuid,
    '00000000-0000-4000-8000-00000000b108'
  )::text,
  true
);
select is(
  (current_setting('test.own_inputs')::jsonb) #>> '{data,itemCount}',
  '2',
  'get_scoring_inputs returns the canonical scorer input for the whole trace'
);                                                                                              -- 17
select ok(
  (current_setting('test.own_inputs')::jsonb) #>> '{data,inputHash}' ~ '^sha256:[0-9a-f]{64}$',
  'the canonical scorer input is hashed, so a stored score can be checked against it'
);                                                                                              -- 18
select is(
  (current_setting('test.own_inputs')::jsonb) #>> '{data,items,0,domain}',
  'fluid_reasoning',
  'scorer inputs carry the per-item fields packages/exam-scoring consumes'
);                                                                                              -- 19

select set_config(
  'test.own_rec',
  api.exam_record_outcome(
    current_setting('test.own_session')::uuid,
    current_setting('test.own_outcome')::jsonb,
    'exam-scoring-syn-v1',
    '0.1.0',
    '00000000-0000-4000-8000-00000000b109',
    '00000000-0000-4000-8000-00000000b110'
  )::text,
  true
);

select is(
  (current_setting('test.own_rec')::jsonb) #> '{data,outcome,scorerOutput}',
  current_setting('test.own_outcome')::jsonb,
  'the externally computed outcome round-trips EXACTLY (stored verbatim, not re-derived)'
);                                                                                              -- 20
select is(
  (current_setting('test.own_rec')::jsonb) #>> '{data,outcome,scoredBy}',
  'packages/exam-scoring',
  'the stored outcome names its scoring authority'
);                                                                                              -- 21
select is(
  (current_setting('test.own_rec')::jsonb) #>> '{data,outcome,scorerInputHash}',
  (current_setting('test.own_inputs')::jsonb) #>> '{data,inputHash}',
  'the recorded input hash matches the inputs the caller was served'
);                                                                                              -- 22
select is(
  (current_setting('test.own_rec')::jsonb) #>> '{data,session,status}',
  'completed',
  'recording the outcome is what ends an engine-driven, variable-length battery'
);                                                                                              -- 23

-- Idempotent replay of the same request returns the same payload.
select is(
  (api.exam_record_outcome(
    current_setting('test.own_session')::uuid,
    current_setting('test.own_outcome')::jsonb,
    'exam-scoring-syn-v1',
    '0.1.0',
    '00000000-0000-4000-8000-00000000b109',
    '00000000-0000-4000-8000-00000000b110'
  )::jsonb) #>> '{meta,idempotentReplay}',
  'true',
  'record_outcome replays idempotently instead of writing a second score'
);                                                                                              -- 24

-- A different key on an already-scored session is a conflict, not a silent overwrite.
select throws_ok(
  format(
    'select api.exam_record_outcome(%L::uuid, %L::jsonb, %L, %L, %L::uuid, %L::uuid)',
    current_setting('test.own_session'), current_setting('test.own_outcome'),
    'exam-scoring-syn-v1', '0.1.0',
    '00000000-0000-4000-8000-00000000b111', '00000000-0000-4000-8000-00000000b112'
  ),
  'PT409', 'OUTCOME_ALREADY_RECORDED',
  'an outcome is write-once: a second score for one trace is refused'
);                                                                                              -- 25

select is(
  (api.exam_get_outcome(
    current_setting('test.own_session')::uuid,
    '00000000-0000-4000-8000-00000000b113'
  )::jsonb) #> '{data,outcome,scorerOutput}',
  current_setting('test.own_outcome')::jsonb,
  'get_outcome reads back the same verbatim scorer output'
);                                                                                              -- 26

-- --- 5. Guards ---------------------------------------------------------------------
-- A score with no trace behind it cannot be audited, so it cannot be stored.
select set_config(
  'test.own_empty',
  (api.exam_start_session(
    ((api.exam_create_participant('PART-SYN-OWN2', '4-5',
      '00000000-0000-4000-8000-00000000b114')::jsonb) #>> '{data,participant,participantId}')::uuid,
    'exam-syn-own', '4-5',
    '00000000-0000-4000-8000-00000000b115',
    '00000000-0000-4000-8000-00000000b116'
  )::jsonb) #>> '{data,session,sessionId}',
  true
);
select throws_ok(
  format(
    'select api.exam_record_outcome(%L::uuid, %L::jsonb, %L, %L, %L::uuid, %L::uuid)',
    current_setting('test.own_empty'), current_setting('test.own_outcome'),
    'exam-scoring-syn-v1', '0.1.0',
    '00000000-0000-4000-8000-00000000b117', '00000000-0000-4000-8000-00000000b118'
  ),
  'PT409', 'SESSION_HAS_NO_RESPONSES',
  'an unauditable score (no stored trace) is refused'
);                                                                                              -- 27
select throws_ok(
  format(
    'select api.exam_record_outcome(%L::uuid, %L::jsonb, %L, %L, %L::uuid, %L::uuid)',
    current_setting('test.own_empty'),
    (current_setting('test.own_outcome')::jsonb || '{"syntheticOnly":false}'::jsonb)::text,
    'exam-scoring-syn-v1', '0.1.0',
    '00000000-0000-4000-8000-00000000b119', '00000000-0000-4000-8000-00000000b120'
  ),
  'PT400', 'SYNTHETIC_ONLY_REQUIRED',
  'born-synthetic is a storage precondition, not a courtesy flag'
);                                                                                              -- 28

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000b002', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;
select throws_ok(
  format(
    'select api.exam_record_outcome(%L::uuid, %L::jsonb, %L, %L, %L::uuid, %L::uuid)',
    current_setting('test.own_session'), current_setting('test.own_outcome'),
    'exam-scoring-syn-v1', '0.1.0',
    '00000000-0000-4000-8000-00000000b121', '00000000-0000-4000-8000-00000000b122'
  ),
  'PT404', 'RESOURCE_NOT_FOUND',
  'another operator cannot attach a score to a foreign session'
);                                                                                              -- 29

-- --- 4 (continued). The audit actually closes: re-derive the hash from the trace ---
reset role;
select is(
  (
    select scorer_input_hash from app.exam_session_outcome
    where session_id = current_setting('test.own_session')::uuid
  ),
  app.exam_scorer_input_hash(current_setting('test.own_session')::uuid),
  'the recorded hash re-derives from the stored trace, so the score stays checkable'
);                                                                                              -- 30

select * from finish();

rollback;
