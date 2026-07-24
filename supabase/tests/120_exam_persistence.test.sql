-- Exam persistence e2e (AX-04, D-016; serves R11). Proves the adaptive-screening
-- write surface durably persists a scored response, its raw telemetry, and the
-- final outcome through the SECURITY DEFINER RPCs under the synthetic proctor
-- principal, and marks the session completed. Born-synthetic; rolls back.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);

-- Act as the synthetic admissions_operator (proctor) principal.
select set_config('app.user_id', '00000000-0000-4000-8000-0000000000a1', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role authenticated;

-- Create a pseudonymous participant.
select set_config(
  'test.participant_id',
  api.create_exam_participant(
    'PART-SYN-E2E1',
    '4-5',
    '00000000-0000-4000-8000-0000000000b1'
  ) #>> '{data,participant,participantId}',
  true
);

-- Start a session against the seeded synthetic policy.
select set_config(
  'test.session_id',
  api.start_exam_session(
    current_setting('test.participant_id')::uuid,
    'exam-syn-v1',
    '00000000-0000-4000-8000-0000000000c1',
    '00000000-0000-4000-8000-0000000000c2'
  ) #>> '{data,session,sessionId}',
  true
);

select is(
  (
    api.get_exam_session(
      current_setting('test.session_id')::uuid,
      '00000000-0000-4000-8000-0000000000c3'
    ) #>> '{data,session,status}'
  ),
  'active',
  'a fresh session starts active'
);

-- Grab a real seeded item id (read as superuser; bypasses RLS for the fixture).
reset role;
select set_config(
  'test.item_id',
  (
    select item_id::text
    from app.exam_item
    where domain = 'fluid_reasoning'
    order by difficulty_level
    limit 1
  ),
  true
);
set local role authenticated;

-- Submit one scored response with telemetry, engine abilities, and a final
-- outcome (completing the session in a single durable write).
select api.submit_exam_response(
  current_setting('test.session_id')::uuid,
  jsonb_build_object(
    'itemId', current_setting('test.item_id'),
    'correct', true,
    'score', 1,
    'rtMs', 5200,
    'firstActionMs', 1400,
    'revisions', 0,
    'engaged', true,
    'measurements', jsonb_build_object(
      'M-ACC', 1, 'M-RT', 5200, 'M-RTFIRST', 1400, 'M-REV', 0, 'M-DIFFREACH', 3
    ),
    'syntheticOnly', true
  ),
  jsonb_build_array(
    jsonb_build_object(
      'kind', 'item_shown', 'itemId', current_setting('test.item_id'),
      'tOffsetMs', 0, 'payload', jsonb_build_object('difficulty', 3)
    ),
    jsonb_build_object(
      'kind', 'first_action', 'itemId', current_setting('test.item_id'),
      'tOffsetMs', 1400, 'payload', '{}'::jsonb
    )
  ),
  jsonb_build_array(
    jsonb_build_object('domain', 'fluid_reasoning', 'theta', 0.8, 'se', 0.4, 'itemsAdministered', 1, 'done', true),
    jsonb_build_object('domain', 'verbal', 'theta', 0.0, 'se', 1.0, 'itemsAdministered', 0, 'done', true),
    jsonb_build_object('domain', 'quantitative', 'theta', 0.0, 'se', 1.0, 'itemsAdministered', 0, 'done', true),
    jsonb_build_object('domain', 'spatial', 'theta', 0.0, 'se', 1.0, 'itemsAdministered', 0, 'done', true)
  ),
  jsonb_build_object(
    'compositeTheta', 0.8,
    'fitIndex', 0.75,
    'engagementValid', true,
    'decision', 'admit',
    'domainScores', jsonb_build_array(
      jsonb_build_object(
        'domain', 'fluid_reasoning', 'theta', 0.8, 'se', 0.4, 'percentile', 78,
        'itemsAdministered', 1, 'maxDifficultyReached', 3, 'learningRate', null, 'consistency', null
      )
    ),
    'policyVersion', 'exam-syn-v1',
    'claimBoundary', 'Synthetic screening result (validated=false).',
    'syntheticOnly', true,
    'validated', false
  ),
  '00000000-0000-4000-8000-0000000000d1',
  '00000000-0000-4000-8000-0000000000d2'
);

-- Assert durable persistence as the superuser (fixture-level, RLS-independent).
reset role;

select is(
  (select count(*)::integer from app.exam_item_response where session_id = current_setting('test.session_id')::uuid),
  1,
  'the scored response row persisted'
);

select is(
  (select count(*)::integer from app.exam_telemetry_event where session_id = current_setting('test.session_id')::uuid),
  2,
  'both raw telemetry events persisted'
);

select is(
  (select count(*)::integer from app.exam_session_outcome where session_id = current_setting('test.session_id')::uuid),
  1,
  'the final outcome row persisted'
);

select is(
  (select decision from app.exam_session_outcome where session_id = current_setting('test.session_id')::uuid),
  'admit',
  'the outcome decision persisted'
);

select is(
  (select round(fit_index, 2)::text from app.exam_session_outcome where session_id = current_setting('test.session_id')::uuid),
  '0.75',
  'the tunable fit index persisted'
);

select is(
  (select status from app.exam_session where session_id = current_setting('test.session_id')::uuid),
  'completed',
  'submitting the final outcome completes the session'
);

select * from finish();

rollback;
