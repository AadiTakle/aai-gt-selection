-- Adaptive K-8 screener core schema (serves R11; BUILD_PLAN §6 storage contract).
-- Adapted from feat/adaptive-exam-app's exam_core.sql for THIS build:
--   * difficulty is a numeric FLOAT on 1..20 (a proficiency scale), not an integer/IRT b.
--   * per-item measurements are a structured metric map (jsonb, §4 metric IDs).
--   * a full append-only telemetry trace is retained per session.
--   * item answer keys and scoring rules are SERVER-ONLY jsonb (never served/returned).
--   * the session outcome stores a score + profile (jsonb); it carries NO admit/defer/retry
--     label (BUILD_PLAN §0/§5 defer any decision).
-- Born-synthetic only: every row is synthetic_only=true and validated=false.
-- Private `app` tables; access is exclusively through `api` SECURITY DEFINER RPCs.
-- The proctor/admin persona is the existing `admissions_operator` role.
-- Standard PostgreSQL only (Aurora-compatible per D-012); relies on helpers created by
-- earlier migrations: app.current_user_id(), app.current_user_role(),
-- app.bind_local_synthetic_principal(), and roles app_owner / api_executor.

set role app_owner;

-- --- Tunable config: policy, question types, item bank ------------------------

create table app.exam_policy (
  policy_version text primary key check (policy_version ~ '^[A-Za-z0-9._-]{1,64}$'),
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
  -- Core metric IDs (§4) this type is expected to yield; drives coverage-aware selection.
  metric_ids text[] not null default '{}'::text[],
  synthetic_only boolean not null default true check (synthetic_only)
);

create table app.exam_item (
  item_id uuid primary key,
  type_code text not null references app.exam_question_type(type_code),
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  -- Difficulty is a FLOAT on 1..20 (design-estimated, provisional; validated=false).
  difficulty numeric not null check (difficulty >= 1 and difficulty <= 20),
  age_bands text[] not null
    check (
      array_length(age_bands, 1) >= 1
      and age_bands <@ array['K-1', '2-3', '4-5', '6-8']
    ),
  -- Renderer-agnostic stimulus params served to the browser.
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  -- SERVER-ONLY: the answer key. Never returned by get_next_item / list_items.
  answer_key jsonb not null default '{}'::jsonb check (jsonb_typeof(answer_key) = 'object'),
  -- SERVER-ONLY: scoring rule, e.g. {"mode":"deterministic_key"|"computed_solver"|"proxy_bank"|"model_judge_deferred"}.
  scoring jsonb not null default '{}'::jsonb check (jsonb_typeof(scoring) = 'object'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only),
  validated boolean not null default false check (validated = false),
  created_at timestamptz not null default statement_timestamp()
);
create index exam_item_domain_difficulty_idx on app.exam_item (domain, difficulty);
create index exam_item_type_idx on app.exam_item (type_code);

-- --- Owned session state (proctor-owned; pseudonymous participants, no PII) ---

create table app.exam_participant (
  participant_id uuid primary key,
  owner_user_id uuid not null,
  pseudonym_code text not null check (pseudonym_code ~ '^PART-SYN-[A-Z0-9-]+$'),
  age_band text not null check (age_band in ('K-1', '2-3', '4-5', '6-8')),
  synthetic_only boolean not null default true check (synthetic_only),
  created_at timestamptz not null default statement_timestamp(),
  unique (owner_user_id, pseudonym_code)
);

create table app.exam_session (
  session_id uuid primary key,
  owner_user_id uuid not null,
  participant_id uuid not null references app.exam_participant(participant_id),
  policy_version text not null references app.exam_policy(policy_version),
  -- The requested grade band used to seed per-area start difficulty.
  grade_band text not null check (grade_band in ('K-1', '2-3', '4-5', '6-8')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  -- Per-area adaptive state keyed by domain, e.g.
  -- {"fluid_reasoning":{"difficulty":6.0,"attemptCount":0,"correctCount":0,"itemsSeen":0,
  --   "accWindow":[],"metricCounts":{},"done":false}, ...}
  area_state jsonb not null default '{}'::jsonb check (jsonb_typeof(area_state) = 'object'),
  items_administered integer not null default 0 check (items_administered >= 0),
  started_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz
);

create table app.exam_item_response (
  response_id uuid primary key,
  session_id uuid not null references app.exam_session(session_id),
  owner_user_id uuid not null,
  item_id uuid not null references app.exam_item(item_id),
  type_code text not null,
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  order_no integer not null check (order_no > 0),
  -- The item difficulty (float 1..20) at serve time, copied for reproducibility.
  difficulty numeric not null check (difficulty >= 1 and difficulty <= 20),
  -- Raw child choice/actions exactly as submitted; NO correctness comes from the client.
  raw_answer jsonb not null
    check (jsonb_typeof(raw_answer) in ('object', 'array', 'string', 'number', 'boolean')),
  -- Server-verified correctness and server-computed deterministic score.
  correct boolean not null,
  score numeric not null check (score >= 0 and score <= 1),
  -- Structured per-item metric map (§4): {"M-ACC":1,"M-RT":4200,"M-ERRTYPE":0, ...}.
  -- Server injects the authoritative M-ACC / M-DIFFREACH; other keys are client-tracked.
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  unique (session_id, item_id),
  unique (session_id, order_no)
);
create index exam_item_response_session_idx on app.exam_item_response (session_id);

create table app.exam_telemetry_event (
  event_id uuid primary key,
  session_id uuid not null references app.exam_session(session_id),
  owner_user_id uuid not null,
  item_id uuid,
  -- Optional link to the scored response this event belongs to.
  response_id uuid references app.exam_item_response(response_id),
  kind text not null check (char_length(kind) between 1 and 40),
  -- Client-provided ordering within the stream (append-only trace).
  seq integer check (seq >= 0),
  t_offset_ms integer not null check (t_offset_ms >= 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default statement_timestamp()
);
create index exam_telemetry_session_idx on app.exam_telemetry_event (session_id);

create table app.exam_session_outcome (
  session_id uuid primary key references app.exam_session(session_id),
  owner_user_id uuid not null,
  -- Composite proficiency on the 1..20 scale (deterministic, reproducible from the trace).
  composite_score numeric not null,
  -- Per-area proficiency + supporting stats, e.g.
  -- [{"domain":"verbal","proficiency":8.4,"accuracy":0.7,"reached":10,"attempts":5}, ...]
  area_scores jsonb not null check (jsonb_typeof(area_scores) = 'array'),
  -- Strengths, learning rate, consistency, coverage; NO admit/defer/retry decision.
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  policy_version text not null,
  claim_boundary text not null,
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
revoke all on app.exam_item_response from public, anon, authenticated, service_role;
revoke all on app.exam_telemetry_event from public, anon, authenticated, service_role;
revoke all on app.exam_session_outcome from public, anon, authenticated, service_role;

-- Config tables: read-only to the operator; seeded by migration as superuser.
create policy exam_policy_read on app.exam_policy
  for select to api_executor
  using (synthetic_only and app.current_user_role() = 'admissions_operator');
create policy exam_question_type_read on app.exam_question_type
  for select to api_executor
  using (synthetic_only and app.current_user_role() = 'admissions_operator');
create policy exam_item_read on app.exam_item
  for select to api_executor
  using (synthetic_only and app.current_user_role() = 'admissions_operator');

-- Owned tables: operator may touch only its own synthetic rows.
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
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_insert on app.exam_session
  for insert to api_executor
  with check (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_update on app.exam_session
  for update to api_executor
  using (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  )
  with check (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_item_response_read on app.exam_item_response
  for select to api_executor
  using (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_item_response_insert on app.exam_item_response
  for insert to api_executor
  with check (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_telemetry_read on app.exam_telemetry_event
  for select to api_executor
  using (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_telemetry_insert on app.exam_telemetry_event
  for insert to api_executor
  with check (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

create policy exam_outcome_read on app.exam_session_outcome
  for select to api_executor
  using (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_outcome_insert on app.exam_session_outcome
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

comment on table app.exam_item is
  'Born-synthetic item bank; difficulty is a FLOAT 1..20. answer_key and scoring are '
  'SERVER-ONLY and never leave the api RPC boundary (validated=false).';
comment on column app.exam_item.answer_key is
  'SERVER-ONLY answer key; excluded from every served/list projection.';
comment on column app.exam_item.difficulty is
  'Design-estimated difficulty on a continuous 1..20 proficiency scale (provisional).';
comment on table app.exam_item_response is
  'Append-only scored responses: raw child answer + server-verified correctness/score + '
  'structured §4 metric map. Correctness is never taken from the client.';
comment on table app.exam_telemetry_event is
  'Append-only full interaction trace streamed from embedded demos (grant excludes update/delete).';
comment on table app.exam_session_outcome is
  'Deterministic score + per-area profile (jsonb). Carries NO admit/defer/retry decision (BUILD_PLAN §5).';

reset role;

grant select on app.exam_policy to api_executor;
grant select on app.exam_question_type to api_executor;
grant select on app.exam_item to api_executor;
grant select, insert on app.exam_participant to api_executor;
grant select, insert, update on app.exam_session to api_executor;
grant select, insert on app.exam_item_response to api_executor;
grant select, insert on app.exam_telemetry_event to api_executor;
grant select, insert on app.exam_session_outcome to api_executor;
