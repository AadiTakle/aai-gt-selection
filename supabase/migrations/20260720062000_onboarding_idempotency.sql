set role app_owner;

create table app.idempotency_record (
  actor_id uuid not null,
  rpc_name text not null
    check (rpc_name ~ '^[a-z][a-z0-9_]{0,99}$'),
  idempotency_key uuid not null,
  request_hash text not null
    check (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  response_payload jsonb not null,
  synthetic_only boolean not null default true
    check (synthetic_only),
  created_at timestamptz not null default statement_timestamp(),
  primary key (actor_id, rpc_name, idempotency_key)
);

alter table app.idempotency_record enable row level security;
alter table app.idempotency_record force row level security;

revoke all on app.idempotency_record from public, anon, authenticated, service_role;

comment on table app.idempotency_record is
  'Private per-actor RPC deduplication registry; response payloads contain synthetic API envelopes only.';

reset role;

grant usage on schema app to api_executor;
grant select, insert on app.idempotency_record to api_executor;
