set role app_owner;

create function app.current_user_id()
returns uuid
language sql
stable
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create function app.current_user_role()
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.user_role', true), '')
$$;

create table app.application (
  application_id uuid primary key,
  owner_user_id uuid not null,
  cycle_id uuid not null references app.cycle(cycle_id),
  synthetic_applicant_code text not null
    check (synthetic_applicant_code ~ '^[A-Z0-9_-]{1,100}$'),
  synthetic_only boolean not null default true
    check (synthetic_only),
  created_at timestamptz not null default statement_timestamp(),
  unique (cycle_id, synthetic_applicant_code)
);

create table app.application_version (
  application_version_id uuid primary key,
  application_id uuid not null references app.application(application_id),
  version_no integer not null check (version_no > 0),
  supersedes_id uuid,
  state text not null
    check (state in ('draft', 'submitted', 'superseded')),
  content jsonb not null
    check (jsonb_typeof(content) = 'object')
    check (content @> '{"syntheticOnly": true}'::jsonb),
  content_hash text not null
    check (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  synthetic_only boolean not null default true
    check (synthetic_only),
  recorded_at timestamptz not null default statement_timestamp(),
  submitted_at timestamptz,
  unique (application_id, version_no),
  unique (application_version_id, application_id),
  unique (supersedes_id),
  foreign key (supersedes_id, application_id)
    references app.application_version(application_version_id, application_id),
  check (state <> 'submitted' or submitted_at is not null)
);

alter table app.application enable row level security;
alter table app.application force row level security;
alter table app.application_version enable row level security;
alter table app.application_version force row level security;

revoke all on app.application from public, anon, authenticated, service_role;
revoke all on app.application_version from public, anon, authenticated, service_role;
revoke execute on function app.current_user_id() from public, anon, authenticated, service_role;
revoke execute on function app.current_user_role() from public, anon, authenticated, service_role;

create policy cycle_executor_read
on app.cycle
for select
to api_executor
using (
  synthetic_only
  and app.current_user_id() is not null
);

create policy idempotency_executor_read
on app.idempotency_record
for select
to api_executor
using (
  synthetic_only
  and actor_id = app.current_user_id()
);

create policy idempotency_executor_insert
on app.idempotency_record
for insert
to api_executor
with check (
  synthetic_only
  and actor_id = app.current_user_id()
);

create policy application_family_read
on app.application
for select
to api_executor
using (
  synthetic_only
  and app.current_user_role() = 'family'
  and owner_user_id = app.current_user_id()
);

create policy application_family_insert
on app.application
for insert
to api_executor
with check (
  synthetic_only
  and app.current_user_role() = 'family'
  and owner_user_id = app.current_user_id()
);

create policy application_version_family_read
on app.application_version
for select
to api_executor
using (
  synthetic_only
  and app.current_user_role() = 'family'
  and exists (
    select 1
    from app.application application_record
    where application_record.application_id = application_version.application_id
      and application_record.owner_user_id = app.current_user_id()
      and application_record.synthetic_only
  )
);

create policy application_version_family_insert
on app.application_version
for insert
to api_executor
with check (
  synthetic_only
  and app.current_user_role() = 'family'
  and exists (
    select 1
    from app.application application_record
    where application_record.application_id = application_version.application_id
      and application_record.owner_user_id = app.current_user_id()
      and application_record.synthetic_only
  )
);

comment on column app.application_version.content is
  'Strict Zod-validated onboarding content stored as JSONB so incomplete autosave drafts remain versioned; submission RPC enforces required fields.';
comment on table app.application_version is
  'Append-only synthetic application versions. API execution receives SELECT and INSERT only.';

reset role;

grant execute on function app.current_user_id() to api_executor;
grant execute on function app.current_user_role() to api_executor;
grant select on app.cycle to api_executor;
grant select, insert on app.application to api_executor;
grant select, insert on app.application_version to api_executor;
