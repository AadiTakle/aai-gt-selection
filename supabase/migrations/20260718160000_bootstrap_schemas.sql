-- Synthetic prototype infrastructure only. No admissions entities or policies live here yet.

create extension if not exists pgtap with schema extensions;

do $$
begin
  create role app_owner
    nologin
    nosuperuser
    nocreatedb
    nocreaterole
    noinherit
    noreplication
    nobypassrls;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create role api_executor
    nologin
    nosuperuser
    nocreatedb
    nocreaterole
    noinherit
    noreplication
    nobypassrls;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  execute format('grant app_owner to %I', current_user);
  execute format('grant api_executor to %I', current_user);
end
$$;

create schema if not exists app authorization app_owner;
create schema if not exists api authorization api_executor;

revoke all on schema app from public, anon, authenticated, service_role;
revoke all on schema api from public, anon, authenticated, service_role;
grant usage on schema api to authenticated;

alter default privileges for role app_owner in schema app
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role app_owner in schema app
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role api_executor in schema api
  revoke execute on functions from public, anon, authenticated, service_role;

comment on schema app is
  'Private synthetic application boundary; never exposed through PostgREST.';
comment on schema api is
  'Explicit RPC boundary for the synthetic prototype; contains no writable tables.';
