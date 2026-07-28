-- =============================================================================
-- HELD-FOR-REVIEW TEST STUB — NOT AUTO-RUN.
--
-- Named `.pending.sql` on purpose so `supabase test db` does NOT execute it
-- while the held migrations `20260727120000_exam_data_model.sql` /
-- `20260727120100_exam_data_model_seed.sql` are unapplied. To activate after a
-- human has reviewed and applied them: rename to
-- `130_exam_rls_noninterference.test.sql` and run `pnpm db:test`.
--
-- Asserts (1) per-operator ownership isolation on the exam tables and (2)
-- NON-INTERFERENCE: the additive exam schema neither reaches the teammates'
-- family onboarding data nor relaxes the existing api/RLS boundary (R9).
-- =============================================================================

begin;

set local search_path = extensions, public, pg_catalog;

select plan(15);

-- Operator A creates and owns a full synthetic session graph.
select set_config('app.user_id', '00000000-0000-4000-8000-0000000ad001', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role api_executor;

insert into app.exam_participant (participant_id, owner_user_id, pseudonym_code, age_band, synthetic_only)
values ('00000000-0000-4000-8000-0000000ad101', '00000000-0000-4000-8000-0000000ad001', 'PART-SYN-RLS-01', '4-5', true);

insert into app.exam_session (
  session_id, owner_user_id, participant_id, policy_version, delivery_structure, age_band, status, synthetic_only
)
values (
  '00000000-0000-4000-8000-0000000ad111', '00000000-0000-4000-8000-0000000ad001',
  '00000000-0000-4000-8000-0000000ad101', 'exam-syn-linear-v1', 'linear', '4-5', 'active', true
);

insert into app.exam_session_progress (session_id, owner_user_id, domain, items_administered, done, synthetic_only)
values ('00000000-0000-4000-8000-0000000ad111', '00000000-0000-4000-8000-0000000ad001', 'verbal', 1, false, true);

insert into app.exam_item_response (
  response_id, session_id, owner_user_id, item_id, domain, order_no,
  correct, score, rt_ms, first_action_ms, revisions, engaged, synthetic_only
)
values (
  '00000000-0000-4000-8000-0000000ad121', '00000000-0000-4000-8000-0000000ad111',
  '00000000-0000-4000-8000-0000000ad001',
  (select item_id from app.exam_item where type_code = 'FLU-MATRIX-01' order by difficulty_level limit 1),
  'fluid_reasoning', 1, true, 1, 8200, 1400, 0, true, true
);

insert into app.exam_telemetry_event (
  event_id, session_id, owner_user_id, item_id, kind, t_offset_ms, synthetic_only
)
values (
  '00000000-0000-4000-8000-0000000ad131', '00000000-0000-4000-8000-0000000ad111',
  '00000000-0000-4000-8000-0000000ad001', null, 'session_start', 0, true
);

insert into app.exam_session_outcome (
  session_id, owner_user_id, composite, composite_scale, decision, engagement_valid,
  domain_scores, policy_version, claim_boundary, synthetic_only, validated
)
values (
  '00000000-0000-4000-8000-0000000ad111', '00000000-0000-4000-8000-0000000ad001', 71, 'percent',
  'advance', true, '[]'::jsonb, 'exam-syn-linear-v1',
  'A reliable screen is not program-impact evidence (R10).', true, false
);

select is((select count(*)::integer from app.exam_participant), 1, 'operator A reads its own participant');
select is((select count(*)::integer from app.exam_session), 1, 'operator A reads its own session');
select is((select count(*)::integer from app.exam_session_progress), 1, 'operator A reads its own progress');
select is((select count(*)::integer from app.exam_item_response), 1, 'operator A reads its own response');
select is((select count(*)::integer from app.exam_telemetry_event), 1, 'operator A reads its own telemetry');
select is((select count(*)::integer from app.exam_session_outcome), 1, 'operator A reads its own outcome');

-- Operator B is a different owner and must be fully isolated from A.
reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-0000000ad002', true);
select set_config('app.user_role', 'admissions_operator', true);
set local role api_executor;

select is((select count(*)::integer from app.exam_participant), 0, 'operator B cannot discover A participants');
select is((select count(*)::integer from app.exam_session), 0, 'operator B cannot discover A sessions');
select is((select count(*)::integer from app.exam_session_outcome), 0, 'operator B cannot discover A outcomes');
select throws_ok(
  $sql$
    insert into app.exam_participant (participant_id, owner_user_id, pseudonym_code, age_band, synthetic_only)
    values ('00000000-0000-4000-8000-0000000ad102', '00000000-0000-4000-8000-0000000ad001', 'PART-SYN-RLS-02', '4-5', true)
  $sql$,
  '42501',
  'new row violates row-level security policy for table "exam_participant"',
  'operator B cannot forge a participant owned by operator A'
);

-- Non-interference: the exam operator cannot reach family onboarding data.
select is(
  (select count(*)::integer from app.application),
  0,
  'admissions_operator claim cannot read family application rows'
);

-- Hard denial for direct table access by the exposed `authenticated` role.
reset role;
set local role authenticated;
select throws_ok(
  'select * from app.exam_item',
  '42501',
  'permission denied for schema app',
  'authenticated receives a hard denial for direct exam_item reads'
);

reset role;

-- Non-interference: exam tables are additive; the api boundary stays writable-table-free.
select is(
  (select count(*)::integer from pg_tables where schemaname = 'api'),
  0,
  'api schema still contains no writable tables after the exam migration'
);

select * from finish();

rollback;
