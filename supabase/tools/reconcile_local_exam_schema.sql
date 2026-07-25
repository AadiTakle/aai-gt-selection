-- Local-development reconciliation for the adaptive-exam schema. NOT a migration.
--
-- Why this exists: all git worktrees in this repo share ONE local Supabase instance
-- and one Postgres port. The shared local database had the superseded
-- `feat/adaptive-exam-app` exam_core objects applied (migrations 20260724120000 /
-- 120100 / 120200), which are not part of the `feat/exam-backend` migration set and
-- which collide on all eight `app.exam_*` table names. This script removes them
-- surgically so that `supabase migration up --local` can apply
-- 20260724130000 / 130100 / 130200 without a destructive `supabase db reset`
-- (a reset would also wipe the teammate's local auth users and application data).
--
-- It also tears down this branch's own exam objects so the script is re-runnable:
-- run it, then run `supabase migration up --local` to rebuild from the migration files.
--
-- Usage (from a worktree on feat/exam-backend):
--   docker exec -i supabase_db_gt-selection-capstone psql -U postgres -d postgres \
--     --single-transaction -v ON_ERROR_STOP=1 -f - < supabase/tools/reconcile_local_exam_schema.sql
--   supabase migration up --local
--
-- Everything it touches is born-synthetic prototype data (synthetic_only = true).

-- --- Superseded feat/adaptive-exam-app RPCs (20260724120100) -------------------
drop function if exists api.create_exam_participant(text, text, uuid);
drop function if exists api.get_exam_policy(text, uuid);
drop function if exists api.get_exam_session(uuid, uuid);
drop function if exists api.list_exam_items(text, text, uuid);
drop function if exists api.start_exam_session(uuid, text, uuid, uuid);
drop function if exists api.submit_exam_response(uuid, jsonb, jsonb, jsonb, jsonb, uuid, uuid);
drop function if exists app.exam_session_json(uuid);

-- --- This branch's RPCs (20260724130100) --------------------------------------
drop function if exists api.exam_create_participant(text, text, uuid);
drop function if exists api.exam_list_items(text, text, uuid);
drop function if exists api.exam_start_session(uuid, text, text, uuid, uuid);
drop function if exists api.exam_get_next_item(uuid, uuid);
drop function if exists api.exam_submit_response(uuid, uuid, jsonb, jsonb, jsonb, uuid, uuid);
drop function if exists api.exam_get_session_state(uuid, uuid);
drop function if exists api.exam_get_outcome(uuid, uuid);
drop function if exists app.exam_served_item_json(uuid);
drop function if exists app.exam_session_state_json(uuid);
drop function if exists app.exam_score_response(uuid, jsonb);
drop function if exists app.exam_compute_outcome(uuid);

-- --- Tables from either generation (child tables first) -----------------------
drop table if exists app.exam_session_outcome cascade;
drop table if exists app.exam_telemetry_event cascade;
drop table if exists app.exam_item_response cascade;
drop table if exists app.exam_session_domain cascade;  -- 20260724120000 only
drop table if exists app.exam_session cascade;
drop table if exists app.exam_participant cascade;
drop table if exists app.exam_item cascade;
drop table if exists app.exam_question_type cascade;
drop table if exists app.exam_policy cascade;

-- --- Idempotency records written by exam RPCs ---------------------------------
delete from app.idempotency_record
where rpc_name in (
  'exam_start_session', 'exam_submit_response',
  'start_exam_session', 'submit_exam_response'
);

-- --- Migration ledger ---------------------------------------------------------
-- 1200xx: removed permanently (not on this branch). 1300xx: removed so
-- `supabase migration up --local` re-applies them from the migration files.
delete from supabase_migrations.schema_migrations
where version in (
  '20260724120000', '20260724120100', '20260724120200',
  '20260724130000', '20260724130100', '20260724130200'
);
