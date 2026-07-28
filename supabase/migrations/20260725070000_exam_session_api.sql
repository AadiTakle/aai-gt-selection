-- Durable, account-linked assessment results (screening sessions).
--
-- Until now a completed adaptive screening was POSTed to an in-memory route
-- (apps/web/src/app/api/exam-results), so every restart/redeploy dropped the
-- results and nothing was tied to the family's account. This migration adds a
-- durable, born-synthetic store and a family-only RPC that persists the full
-- per-item metrics plus the server-computed summary against the caller's
-- account.
--
-- Structure & grants mirror the onboarding application API
-- (20260720063000 / 20260720069000): append-only table under RLS, SELECT+INSERT
-- to api_executor only, and a SECURITY DEFINER api.* RPC that binds the
-- synthetic principal and is executable by authenticated.
set role app_owner;

create table app.exam_session (
  exam_session_id uuid primary key,
  owner_user_id uuid not null,
  application_id uuid references app.application(application_id),
  session_id text not null
    check (session_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  participant_code text not null
    check (participant_code ~ '^PART-SYN-[A-Z0-9-]+$'),
  student_name text not null
    check (student_name ~ '^Synthetic([[:space:]]|$)'),
  age_band text not null
    check (age_band ~ '^[A-Za-z0-9-]{1,20}$'),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  items jsonb not null
    check (jsonb_typeof(items) = 'array'),
  summary jsonb not null
    check (jsonb_typeof(summary) = 'object'),
  synthetic_only boolean not null default true
    check (synthetic_only),
  created_at timestamptz not null default statement_timestamp()
);

create index exam_session_owner_created_idx
  on app.exam_session (owner_user_id, created_at desc);

alter table app.exam_session enable row level security;
alter table app.exam_session force row level security;

revoke all on app.exam_session from public, anon, authenticated, service_role;

create policy exam_session_family_read
on app.exam_session
for select
to api_executor
using (
  synthetic_only
  and app.current_user_role() = 'family'
  and owner_user_id = app.current_user_id()
);

create policy exam_session_family_insert
on app.exam_session
for insert
to api_executor
with check (
  synthetic_only
  and app.current_user_role() = 'family'
  and owner_user_id = app.current_user_id()
);

comment on table app.exam_session is
  'Append-only durable screening sessions (D-018). Stores per-item metrics and the server-computed summary for a synthetic participant, account-linked. Screening only — never an admission decision.';

reset role;

grant select, insert on app.exam_session to api_executor;

set role api_executor;

create function api.save_exam_session(
  p_session jsonb,
  p_application_id uuid,
  p_idempotency_key uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  request_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  v_application_id uuid;
  v_exam_session_id uuid;
  v_created_at timestamptz;
  response_payload jsonb;
begin
  perform app.bind_local_synthetic_principal();
  v_actor_id := app.current_user_id();
  v_actor_role := app.current_user_role();

  if v_actor_id is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if v_actor_role is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;

  -- Born-synthetic + shape validation. The table CHECK constraints are the
  -- backstop; these explicit checks return a clean VALIDATION_FAILED instead.
  if p_idempotency_key is null
    or p_correlation_id is null
    or p_session is null
    or jsonb_typeof(p_session) <> 'object'
    or p_session -> 'syntheticOnly' is distinct from 'true'::jsonb
    or coalesce(p_session ->> 'sessionId', '') !~ '^[A-Za-z0-9_-]{1,100}$'
    or coalesce(p_session ->> 'participantCode', '') !~ '^PART-SYN-[A-Z0-9-]+$'
    or coalesce(p_session ->> 'studentName', '') !~ '^Synthetic([[:space:]]|$)'
    or coalesce(p_session ->> 'ageBand', '') !~ '^[A-Za-z0-9-]{1,20}$'
    or coalesce(p_session ->> 'startedAt', '') = ''
    or coalesce(p_session ->> 'finishedAt', '') = ''
    or jsonb_typeof(p_session -> 'items') <> 'array'
    or jsonb_array_length(p_session -> 'items') = 0
    or jsonb_typeof(p_session -> 'summary') <> 'object'
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash :=
    'sha256:' || encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'session', p_session,
            'applicationId', p_application_id
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_actor_id::text || ':save_exam_session:' || p_idempotency_key::text,
      0
    )
  );

  select *
  into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor_id
    and record.rpc_name = 'save_exam_session'
    and record.idempotency_key = p_idempotency_key;

  if found then
    if existing_idempotency.request_hash <> request_hash then
      raise exception using errcode = 'PT409', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_set(
      jsonb_set(
        existing_idempotency.response_payload,
        '{meta,idempotentReplay}',
        'true'::jsonb
      ),
      '{meta,correlationId}',
      to_jsonb(p_correlation_id::text)
    );
  end if;

  -- Only bind the application when it belongs to the caller; otherwise store
  -- the session unlinked rather than leaking/forcing a foreign application.
  if p_application_id is not null then
    select application_record.application_id
    into v_application_id
    from app.application application_record
    where application_record.application_id = p_application_id
      and application_record.owner_user_id = v_actor_id
      and application_record.synthetic_only;
  end if;

  v_exam_session_id := extensions.gen_random_uuid();

  insert into app.exam_session (
    exam_session_id,
    owner_user_id,
    application_id,
    session_id,
    participant_code,
    student_name,
    age_band,
    started_at,
    finished_at,
    items,
    summary,
    synthetic_only
  )
  values (
    v_exam_session_id,
    v_actor_id,
    v_application_id,
    p_session ->> 'sessionId',
    p_session ->> 'participantCode',
    p_session ->> 'studentName',
    p_session ->> 'ageBand',
    (p_session ->> 'startedAt')::timestamptz,
    (p_session ->> 'finishedAt')::timestamptz,
    p_session -> 'items',
    p_session -> 'summary',
    true
  )
  returning created_at into v_created_at;

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'examSessionId', v_exam_session_id,
      'createdAt', v_created_at,
      'summary', p_session -> 'summary'
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', p_idempotency_key,
      'idempotentReplay', false
    )
  );

  insert into app.idempotency_record (
    actor_id,
    rpc_name,
    idempotency_key,
    request_hash,
    response_payload,
    synthetic_only
  )
  values (
    v_actor_id,
    'save_exam_session',
    p_idempotency_key,
    request_hash,
    response_payload,
    true
  );

  return response_payload;
end
$$;

reset role;

revoke execute on function api.save_exam_session(jsonb, uuid, uuid, uuid)
from public, anon, service_role;

grant execute on function api.save_exam_session(jsonb, uuid, uuid, uuid)
to authenticated;

comment on function api.save_exam_session(jsonb, uuid, uuid, uuid) is
  'Family-only durable screening-result save. Persists per-item metrics + server-computed summary for a synthetic participant, optionally linked to the caller''s application. Screening only — validated=false, never an admission decision.';
