begin;

set local search_path = extensions, public, pg_catalog;

select plan(11);

select has_schema('app', 'private app schema exists');
select has_schema('api', 'exposed api schema exists');
select ok(
  not has_schema_privilege('anon', 'app', 'USAGE'),
  'anon cannot use the private app schema'
);
select ok(
  not has_schema_privilege('authenticated', 'app', 'USAGE'),
  'authenticated cannot use the private app schema'
);
select ok(
  has_schema_privilege('authenticated', 'api', 'USAGE'),
  'authenticated can resolve explicit api RPCs'
);
select is(
  (select count(*)::integer from pg_tables where schemaname = 'api'),
  0,
  'api contains no writable tables'
);
select ok(not exists (select 1 from pg_namespace where nspname = 'finance'), 'finance absent');
select ok(
  not exists (select 1 from pg_namespace where nspname = 'allocation'),
  'allocation absent'
);
select ok(
  not exists (select 1 from pg_namespace where nspname = 'evaluation'),
  'evaluation absent'
);
select ok(
  not (select rolbypassrls from pg_roles where rolname = 'app_owner'),
  'app owner cannot bypass RLS'
);
select ok(
  not (select rolbypassrls from pg_roles where rolname = 'api_executor'),
  'api executor cannot bypass RLS'
);

select * from finish();

rollback;
