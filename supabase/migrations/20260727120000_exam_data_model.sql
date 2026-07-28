-- =============================================================================
-- HELD FOR HUMAN REVIEW — NOT APPLIED.
-- Format-agnostic cognitive-exam data model (AX-03/AX-04, D-016; serves R11/R9).
--
-- This migration file is a deliverable held for human review BEFORE any database
-- apply or merge. It was authored offline and has NOT been applied to any
-- database (shared, live, or otherwise). See
-- `supabase/migrations/README_exam_data_model.md`.
--
-- STRUCTURE-AGNOSTIC by design. The delivery structure (linear/fixed-form,
-- adaptive, two-stage/multistage, or custom) is carried as TUNABLE CONFIG
-- (`delivery_structure`, policy `config`, item `scoring_model`, per-domain
-- `state`, session `structure_state`) rather than baked into the tables. No
-- adaptive-only columns (live theta/SE, EAP priors, SE stop rules, fit
-- composites) are required; such state lives in opaque JSONB the schema does
-- not interpret. IRT columns are retained but NULLABLE so classical, rubric,
-- and rule-based formats are first-class.
--
-- Born-synthetic only: every row is `synthetic_only = true`; tunable config is
-- `validated = false` (D-006/R9). No parameter or cut is calibrated (RES-012).
-- Private `app` tables; access is exclusively through `api` SECURITY DEFINER
-- RPCs (defined by a separate, out-of-scope migration). The proctor/admin
-- persona is the existing `admissions_operator` role claim.
--
-- Adapted from commit `2b458cb` (`supabase/migrations/20260724120000_exam_core.sql`).
-- =============================================================================

set role app_owner;

-- --- Tunable config: policy, question types, item bank ------------------------

create table app.exam_policy (
  policy_version text primary key check (policy_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  -- Structure is named config, never assumed by the schema.
  delivery_structure text not null
    check (delivery_structure in ('linear', 'adaptive', 'two_stage', 'custom')),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only),
  validated boolean not null default false check (validated = false),
  created_at timestamptz not null default statement_timestamp()
);

create table app.exam_question_type (
  type_code text primary key check (type_code ~ '^[A-Z]+-[A-Z0-9]+-[0-9]+$'),
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  name text not null check (char_length(name) between 1 and 200),
  demo_path text not null check (char_length(demo_path) between 1 and 300),
  -- How items of this type are scored; IRT is one option among several.
  scoring_model text not null default 'none'
    check (scoring_model in ('irt_2pl', 'irt_3pl', 'classical', 'rubric', 'rule_based', 'none')),
  synthetic_only boolean not null default true check (synthetic_only)
);

create table app.exam_item (
  item_id uuid primary key,
  type_code text not null references app.exam_question_type(type_code),
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  -- Optional ordinal difficulty rung; NULL when a format has no ladder.
  difficulty_level integer check (difficulty_level is null or difficulty_level between 1 and 20),
  scoring_model text not null default 'none'
    check (scoring_model in ('irt_2pl', 'irt_3pl', 'classical', 'rubric', 'rule_based', 'none')),
  -- IRT parameters retained but NULLABLE (format-agnostic); required only when
  -- the scoring_model is an IRT model (see exam_item_irt_present).
  irt_a numeric check (irt_a is null or irt_a > 0),
  irt_b numeric,
  irt_c numeric check (irt_c is null or (irt_c >= 0 and irt_c < 1)),
  irt_model text check (irt_model is null or irt_model in ('2PL', '3PL')),
  age_bands text[] not null
    check (
      array_length(age_bands, 1) >= 1
      and age_bands <@ array['K-1', '2-3', '4-5', '6-8']
    ),
  params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only),
  constraint exam_item_irt_present check (
    scoring_model not in ('irt_2pl', 'irt_3pl')
    or (irt_a is not null and irt_b is not null and irt_c is not null and irt_model is not null)
  )
);
create index exam_item_domain_difficulty_idx on app.exam_item (domain, difficulty_level);

-- --- Owned session state (proctor-owned; pseudonymous participants, no PII) ---

create table app.exam_participant (
  participant_id uuid primary key,
  owner_user_id uuid not null,
  pseudonym_code text not null unique check (pseudonym_code ~ '^PART-SYN-[A-Z0-9-]+$'),
  age_band text not null check (age_band in ('K-1', '2-3', '4-5', '6-8')),
  synthetic_only boolean not null default true check (synthetic_only),
  created_at timestamptz not null default statement_timestamp()
);

create table app.exam_session (
  session_id uuid primary key,
  owner_user_id uuid not null,
  participant_id uuid not null references app.exam_participant(participant_id),
  policy_version text not null references app.exam_policy(policy_version),
  delivery_structure text not null
    check (delivery_structure in ('linear', 'adaptive', 'two_stage', 'custom')),
  age_band text not null check (age_band in ('K-1', '2-3', '4-5', '6-8')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  -- Opaque, engine-owned live state (adaptive theta/SE, stage index, ...) or NULL.
  -- The schema never interprets this; it is the structure-agnostic seam.
  structure_state jsonb check (structure_state is null or jsonb_typeof(structure_state) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only),
  started_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz
);

-- Structure-neutral per-domain progress. Holds NO baked theta/SE; any live
-- ability state lives in `state` (jsonb) and is engine-owned.
create table app.exam_session_progress (
  session_id uuid not null references app.exam_session(session_id),
  owner_user_id uuid not null,
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  items_administered integer not null default 0 check (items_administered >= 0),
  done boolean not null default false,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only),
  primary key (session_id, domain)
);

create table app.exam_item_response (
  response_id uuid primary key,
  session_id uuid not null references app.exam_session(session_id),
  owner_user_id uuid not null,
  item_id uuid not null references app.exam_item(item_id),
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  order_no integer not null check (order_no > 0),
  correct boolean not null,
  score numeric not null check (score >= 0 and score <= 1),
  rt_ms integer not null check (rt_ms >= 0),
  first_action_ms integer check (first_action_ms is null or first_action_ms >= 0),
  revisions integer not null default 0 check (revisions >= 0),
  engaged boolean not null default true,
  measurements jsonb not null default '{}'::jsonb
    check (jsonb_typeof(measurements) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only),
  created_at timestamptz not null default statement_timestamp(),
  unique (session_id, item_id),
  unique (session_id, order_no)
);

create table app.exam_telemetry_event (
  event_id uuid primary key,
  session_id uuid not null references app.exam_session(session_id),
  owner_user_id uuid not null,
  item_id uuid,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{0,39}$'),
  t_offset_ms integer not null check (t_offset_ms >= 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only),
  created_at timestamptz not null default statement_timestamp()
);
create index exam_telemetry_session_idx on app.exam_telemetry_event (session_id);

create table app.exam_session_outcome (
  session_id uuid primary key references app.exam_session(session_id),
  owner_user_id uuid not null,
  -- Generic composite point estimate + named scale (theta is only one option).
  composite numeric not null,
  composite_scale text not null
    check (composite_scale in ('theta', 'percent', 'raw', 'logit', 'custom')),
  -- Tunable, GT-owned SCREENING routing signal — never admission (R10).
  decision text not null check (decision in ('advance', 'hold', 'retry')),
  engagement_valid boolean not null,
  domain_scores jsonb not null check (jsonb_typeof(domain_scores) = 'array'),
  -- Structure-specific composite signals (fitIndex, compositeTheta, ...).
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  policy_version text not null,
  claim_boundary text not null check (char_length(claim_boundary) between 1 and 500),
  synthetic_only boolean not null default true check (synthetic_only),
  validated boolean not null default false check (validated = false),
  created_at timestamptz not null default statement_timestamp()
);

-- --- Forced RLS on every table ------------------------------------------------

alter table app.exam_policy enable row level security;
alter table app.exam_policy force row level security;
alter table app.exam_question_type enable row level security;
alter table app.exam_question_type force row level security;
alter table app.exam_item enable row level security;
alter table app.exam_item force row level security;
alter table app.exam_participant enable row level security;
alter table app.exam_participant force row level security;
alter table app.exam_session enable row level security;
alter table app.exam_session force row level security;
alter table app.exam_session_progress enable row level security;
alter table app.exam_session_progress force row level security;
alter table app.exam_item_response enable row level security;
alter table app.exam_item_response force row level security;
alter table app.exam_telemetry_event enable row level security;
alter table app.exam_telemetry_event force row level security;
alter table app.exam_session_outcome enable row level security;
alter table app.exam_session_outcome force row level security;

revoke all on app.exam_policy from public, anon, authenticated, service_role;
revoke all on app.exam_question_type from public, anon, authenticated, service_role;
revoke all on app.exam_item from public, anon, authenticated, service_role;
revoke all on app.exam_participant from public, anon, authenticated, service_role;
revoke all on app.exam_session from public, anon, authenticated, service_role;
revoke all on app.exam_session_progress from public, anon, authenticated, service_role;
revoke all on app.exam_item_response from public, anon, authenticated, service_role;
revoke all on app.exam_telemetry_event from public, anon, authenticated, service_role;
revoke all on app.exam_session_outcome from public, anon, authenticated, service_role;

-- Config tables: read-only to the operator (seeded by migration as superuser).
create policy exam_policy_read on app.exam_policy
  for select to api_executor
  using (synthetic_only and app.current_user_role() = 'admissions_operator');
create policy exam_question_type_read on app.exam_question_type
  for select to api_executor
  using (synthetic_only and app.current_user_role() = 'admissions_operator');
create policy exam_item_read on app.exam_item
  for select to api_executor
  using (synthetic_only and app.current_user_role() = 'admissions_operator');

-- Owned tables: operator may read/write only its own synthetic rows.
create policy exam_participant_read on app.exam_participant
  for select to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_participant_insert on app.exam_participant
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_session_read on app.exam_session
  for select to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_insert on app.exam_session
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_update on app.exam_session
  for update to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  )
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_session_progress_read on app.exam_session_progress
  for select to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_progress_insert on app.exam_session_progress
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_progress_update on app.exam_session_progress
  for update to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  )
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_item_response_read on app.exam_item_response
  for select to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_item_response_insert on app.exam_item_response
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_telemetry_read on app.exam_telemetry_event
  for select to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_telemetry_insert on app.exam_telemetry_event
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_outcome_read on app.exam_session_outcome
  for select to api_executor
  using (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_outcome_insert on app.exam_session_outcome
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

comment on table app.exam_policy is
  'Born-synthetic, structure-agnostic tunable screening policy; delivery_structure + config carry all structure-specific tuning (validated=false, D-016).';
comment on column app.exam_policy.config is
  'Opaque tunable config the schema does not interpret (item selection params, stop-rule params, adaptive priors, routing tables). Empty-ish for linear.';
comment on table app.exam_item is
  'Born-synthetic item bank. IRT columns are optional; scoring_model declares how each item is scored so non-IRT formats are first-class (D-016).';
comment on column app.exam_session.structure_state is
  'Opaque engine-owned live state (adaptive theta/SE, stage index, ...). The structure-agnostic seam; never interpreted by the schema.';
comment on table app.exam_session_progress is
  'Structure-neutral per-domain progress. Live ability state, if any, lives in state (jsonb); no theta/SE is baked as a column.';
comment on table app.exam_item_response is
  'Append-only scored responses plus automatically-derived measurements (AX-04).';
comment on table app.exam_telemetry_event is
  'Append-only raw interaction telemetry streamed from embedded demos (AX-04).';
comment on table app.exam_session_outcome is
  'Screening outcome (screening only, R10). decision is advance/hold/retry, never an admission decision.';

reset role;

grant select on app.exam_policy to api_executor;
grant select on app.exam_question_type to api_executor;
grant select on app.exam_item to api_executor;
grant select, insert on app.exam_participant to api_executor;
grant select, insert, update on app.exam_session to api_executor;
grant select, insert, update on app.exam_session_progress to api_executor;
grant select, insert on app.exam_item_response to api_executor;
grant select, insert on app.exam_telemetry_event to api_executor;
grant select, insert on app.exam_session_outcome to api_executor;
