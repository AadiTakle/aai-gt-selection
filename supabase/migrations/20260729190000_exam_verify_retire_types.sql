-- Reconcile the verifier registry with the app-tier question-type retirement
-- (QUESTION_IMPROVEMENT_PLAN section 5, "Deletions").
--
-- Eight retired types still had a row in app.exam_verifier_registry and a plpgsql verifier
-- behind it. Each row's `ported_from` named an apps/web verifier function that no longer
-- exists, so the database was claiming provenance from deleted code and the dispatcher was
-- still willing to grade a type the exam no longer serves.
--
-- This is a forward reconciliation. The migrations that created these rows and functions
-- (20260725174500, 20260725181742, 20260725183000) are left exactly as applied; they are the
-- record of what the database once did.
--
-- NOT dropped here, deliberately:
--   * app.exam_verify_keyed, app.exam_verify_placement_tolerance,
--     app.exam_verify_constructed_value and app.exam_verify_response are generic and are how
--     every surviving type without a per-type verifier is graded.
--   * the private readers behind the dropped verifiers (app.exam_vmatrix_*, app.exam_vgate_*,
--     app.exam_vols_slope, app.exam_vpoly_*) are now unreachable but still revoked from every
--     client role. Removing them is a separate tidy-up, not part of this reconciliation.

-- ===================================================================================
-- 1. Registry rows
-- ===================================================================================

delete from app.exam_verifier_registry
where type_code in (
  'CX-curious-02',
  'FLU-MATRIXBUILD-01',
  'GB-DEBATE-01',
  'GB-FILTER-01',
  'GB-PATHFORGE-01',
  'GB-SHAPEFIT-01',
  'WM-gate-01',
  'WM-gridflash-01'
);

-- ===================================================================================
-- 2. Safety gate
--
-- Postgres does not record which plpgsql body calls which function, so a DROP cannot fail
-- for a caller the way a foreign key would. The registry is the one place a surviving type
-- can still reach a verifier by name, so it is checked explicitly before anything is
-- dropped: if a survivor were pointing at one of these, the migration aborts rather than
-- leaving the dispatcher to raise mid-submission.
-- ===================================================================================

do $$
declare
  still_referenced text;
begin
  select string_agg(type_code || ' -> ' || verifier_fn, ', ' order by type_code)
  into still_referenced
  from app.exam_verifier_registry
  where verifier_fn in (
    'exam_verify_curious',
    'exam_verify_matrix_build',
    'exam_verify_debate',
    'exam_verify_filter',
    'exam_verify_pathforge',
    'exam_verify_shapefit',
    'exam_verify_gate',
    'exam_verify_gridflash'
  );

  if still_referenced is not null then
    raise exception
      'refusing to drop a verifier a surviving type still resolves to: %', still_referenced;
  end if;
end
$$;

-- ===================================================================================
-- 3. The eight retired verifiers
-- ===================================================================================

drop function app.exam_verify_curious(jsonb, jsonb);
drop function app.exam_verify_matrix_build(jsonb, jsonb);
drop function app.exam_verify_debate(jsonb, jsonb);
drop function app.exam_verify_filter(jsonb, jsonb);
drop function app.exam_verify_pathforge(jsonb, jsonb);
drop function app.exam_verify_shapefit(jsonb, jsonb);
drop function app.exam_verify_gate(jsonb, jsonb);
drop function app.exam_verify_gridflash(jsonb, jsonb);
