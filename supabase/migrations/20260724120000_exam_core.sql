-- Adaptive screening instrument core schema (AX-03/AX-04, D-016; serves R11).
-- Born-synthetic only: every row is synthetic_only=true and validated=false.
-- Private `app` tables; access is exclusively through `api` SECURITY DEFINER RPCs.
-- The proctor/admin persona is the existing `admissions_operator` role.

set role app_owner;

-- --- Tunable config: policy, question types, item bank (with IRT params) ------

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
  synthetic_only boolean not null default true check (synthetic_only)
);

create table app.exam_item (
  item_id uuid primary key,
  type_code text not null references app.exam_question_type(type_code),
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  difficulty_level integer not null check (difficulty_level between 1 and 20),
  irt_a numeric not null check (irt_a > 0),
  irt_b numeric not null,
  irt_c numeric not null check (irt_c >= 0 and irt_c < 1),
  irt_model text not null check (irt_model in ('2PL', '3PL')),
  age_bands text[] not null
    check (
      array_length(age_bands, 1) >= 1
      and age_bands <@ array['K-1', '2-3', '4-5', '6-8']
    ),
  params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  synthetic_only boolean not null default true check (synthetic_only)
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
  age_band text not null check (age_band in ('K-1', '2-3', '4-5', '6-8')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz
);

create table app.exam_session_domain (
  session_id uuid not null references app.exam_session(session_id),
  owner_user_id uuid not null,
  domain text not null
    check (domain in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')),
  theta numeric not null default 0,
  se numeric not null default 1,
  items_administered integer not null default 0 check (items_administered >= 0),
  done boolean not null default false,
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
  first_action_ms integer check (first_action_ms >= 0),
  revisions integer not null default 0 check (revisions >= 0),
  engaged boolean not null default true,
  measurements jsonb not null default '{}'::jsonb
    check (jsonb_typeof(measurements) = 'object'),
  created_at timestamptz not null default statement_timestamp(),
  unique (session_id, item_id),
  unique (session_id, order_no)
);

create table app.exam_telemetry_event (
  event_id uuid primary key,
  session_id uuid not null references app.exam_session(session_id),
  owner_user_id uuid not null,
  item_id uuid,
  kind text not null check (char_length(kind) between 1 and 40),
  t_offset_ms integer not null check (t_offset_ms >= 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default statement_timestamp()
);
create index exam_telemetry_session_idx on app.exam_telemetry_event (session_id);

create table app.exam_session_outcome (
  session_id uuid primary key references app.exam_session(session_id),
  owner_user_id uuid not null,
  composite_theta numeric not null,
  fit_index numeric not null,
  engagement_valid boolean not null,
  decision text not null check (decision in ('admit', 'defer', 'retry')),
  domain_scores jsonb not null check (jsonb_typeof(domain_scores) = 'array'),
  policy_version text not null,
  claim_boundary text not null,
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
alter table app.exam_session_domain enable row level security;
alter table app.exam_session_domain force row level security;
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
revoke all on app.exam_session_domain from public, anon, authenticated, service_role;
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

create policy exam_session_domain_read on app.exam_session_domain
  for select to api_executor
  using (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_domain_insert on app.exam_session_domain
  for insert to api_executor
  with check (
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );
create policy exam_session_domain_update on app.exam_session_domain
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
    app.current_user_role() = 'admissions_operator'
    and owner_user_id = app.current_user_id()
  );

comment on table app.exam_item is
  'Born-synthetic item bank with per-item IRT parameters; tunable policy config (validated=false, D-016).';
comment on table app.exam_item_response is
  'Append-only scored responses plus automatically-derived measurements (AX-04).';
comment on table app.exam_telemetry_event is
  'Append-only raw interaction telemetry streamed from embedded demos (AX-04).';

reset role;

grant select on app.exam_policy to api_executor;
grant select on app.exam_question_type to api_executor;
grant select on app.exam_item to api_executor;
grant select, insert on app.exam_participant to api_executor;
grant select, insert, update on app.exam_session to api_executor;
grant select, insert, update on app.exam_session_domain to api_executor;
grant select, insert on app.exam_item_response to api_executor;
grant select, insert on app.exam_telemetry_event to api_executor;
grant select, insert on app.exam_session_outcome to api_executor;
