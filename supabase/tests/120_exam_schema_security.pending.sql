-- =============================================================================
-- HELD-FOR-REVIEW TEST STUB — NOT AUTO-RUN.
--
-- Named `.pending.sql` on purpose so `supabase test db` (which globs
-- `*.test.sql`) does NOT execute it while the held migration
-- `20260727120000_exam_data_model.sql` is unapplied. To activate after a human
-- has reviewed and applied that migration: rename to
-- `120_exam_schema_security.test.sql` and run `pnpm db:test`.
--
-- Asserts the format-agnostic schema shape and the private-schema security
-- posture (AX-03/AX-04, D-016; R9).
-- =============================================================================

begin;

set local search_path = extensions, public, pg_catalog;

select plan(29);

-- All nine tables exist in the private `app` schema.
select has_table('app', 'exam_policy', 'exam_policy table exists');
select has_table('app', 'exam_question_type', 'exam_question_type table exists');
select has_table('app', 'exam_item', 'exam_item table exists');
select has_table('app', 'exam_participant', 'exam_participant table exists');
select has_table('app', 'exam_session', 'exam_session table exists');
select has_table('app', 'exam_session_progress', 'exam_session_progress table exists');
select has_table('app', 'exam_item_response', 'exam_item_response table exists');
select has_table('app', 'exam_telemetry_event', 'exam_telemetry_event table exists');
select has_table('app', 'exam_session_outcome', 'exam_session_outcome table exists');

-- Forced RLS on representative config/owned/outcome tables.
select ok(
  (select relrowsecurity and relforcerowsecurity
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app' and c.relname = 'exam_item'),
  'exam_item has forced row level security'
);
select ok(
  (select relrowsecurity and relforcerowsecurity
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app' and c.relname = 'exam_session'),
  'exam_session has forced row level security'
);
select ok(
  (select relrowsecurity and relforcerowsecurity
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app' and c.relname = 'exam_session_outcome'),
  'exam_session_outcome has forced row level security'
);

-- Format-agnostic: IRT columns and the difficulty ladder are NULLABLE.
select col_is_null('app', 'exam_item', 'irt_a', 'irt_a is nullable (IRT optional)');
select col_is_null('app', 'exam_item', 'irt_b', 'irt_b is nullable (IRT optional)');
select col_is_null('app', 'exam_item', 'irt_c', 'irt_c is nullable (IRT optional)');
select col_is_null('app', 'exam_item', 'irt_model', 'irt_model is nullable (IRT optional)');
select col_is_null('app', 'exam_item', 'difficulty_level', 'difficulty_level is nullable (no baked ladder)');

-- Structure is carried as tunable config, not baked assumptions.
select has_column('app', 'exam_item', 'scoring_model', 'exam_item declares a scoring_model');
select has_column('app', 'exam_policy', 'delivery_structure', 'policy names its delivery_structure');
select has_column('app', 'exam_session', 'delivery_structure', 'session names its delivery_structure');
select has_column('app', 'exam_session', 'structure_state', 'session carries opaque structure_state seam');

-- Adaptive live ability state is NOT baked into the progress table.
select hasnt_column('app', 'exam_session_progress', 'theta', 'progress does not bake a theta column');
select hasnt_column('app', 'exam_session_progress', 'se', 'progress does not bake an se column');
select has_column('app', 'exam_session_progress', 'state', 'progress keeps engine state in an opaque jsonb');

-- Behavioral timing is retained.
select has_column('app', 'exam_item_response', 'rt_ms', 'response keeps rt_ms');
select has_column('app', 'exam_item_response', 'first_action_ms', 'response keeps first_action_ms');

-- Born-synthetic tags are enforced.
select col_not_null('app', 'exam_policy', 'synthetic_only', 'policy.synthetic_only is not null');
select col_not_null('app', 'exam_session_outcome', 'validated', 'outcome.validated is not null');

-- Private: the exam tables never surface in the exposed `api` schema.
select is(
  (select count(*)::integer from pg_tables where schemaname = 'api' and tablename like 'exam%'),
  0,
  'no exam tables are exposed in the api schema'
);

select * from finish();

rollback;
