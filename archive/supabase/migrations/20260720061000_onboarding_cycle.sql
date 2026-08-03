set role app_owner;

create table app.cycle (
  cycle_id uuid primary key,
  cycle_code text not null unique,
  data_class text not null default 'synthetic'
    check (data_class = 'synthetic'),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  synthetic_only boolean not null default true
    check (synthetic_only),
  created_at timestamptz not null default statement_timestamp(),
  check (closes_at > opens_at)
);

alter table app.cycle enable row level security;
alter table app.cycle force row level security;

revoke all on app.cycle from public, anon, authenticated, service_role;

comment on table app.cycle is
  'Version-independent synthetic application cycle registry; dates are fixtures, not GT policy.';

reset role;
