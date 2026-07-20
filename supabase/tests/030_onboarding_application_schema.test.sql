begin;

set local search_path = extensions, public, pg_catalog;

select plan(20);

select has_table('app', 'application', 'private application root exists');
select has_table('app', 'application_version', 'immutable application versions exist');
select has_column('app', 'application', 'owner_user_id', 'application binds a family owner');
select has_column('app', 'application', 'cycle_id', 'application binds a synthetic cycle');
select has_column('app', 'application_version', 'content', 'version stores the typed draft content');
select has_column('app', 'application_version', 'content_hash', 'version stores a content commitment');
select has_column('app', 'application_version', 'state', 'version stores workflow state');
select ok(
  (select relrowsecurity from pg_class where oid = 'app.application'::regclass),
  'application enables RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'app.application'::regclass),
  'application forces RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'app.application_version'::regclass),
  'application version enables RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'app.application_version'::regclass),
  'application version forces RLS'
);
select ok(
  not has_table_privilege('authenticated', 'app.application', 'select'),
  'authenticated has no direct application reads'
);
select ok(
  not has_table_privilege('authenticated', 'app.application', 'insert'),
  'authenticated has no direct application writes'
);
select ok(
  not has_table_privilege('authenticated', 'app.application_version', 'select'),
  'authenticated has no direct version reads'
);
select ok(
  not has_table_privilege('authenticated', 'app.application_version', 'insert'),
  'authenticated has no direct version writes'
);
select ok(
  not has_table_privilege('api_executor', 'app.application', 'update'),
  'API executor cannot mutate application roots'
);
select ok(
  not has_table_privilege('api_executor', 'app.application', 'delete'),
  'API executor cannot delete application roots'
);
select ok(
  not has_table_privilege('api_executor', 'app.application_version', 'update'),
  'API executor cannot mutate application versions'
);
select ok(
  not has_table_privilege('api_executor', 'app.application_version', 'delete'),
  'API executor cannot delete application versions'
);
select ok(
  exists (
    select 1
    from pg_constraint constraint_record
    join pg_class table_record
      on table_record.oid = constraint_record.conrelid
    join pg_namespace schema_record
      on schema_record.oid = table_record.relnamespace
    where schema_record.nspname = 'app'
      and table_record.relname = 'application_version'
      and constraint_record.contype = 'u'
      and pg_get_constraintdef(constraint_record.oid)
        = 'UNIQUE (application_id, version_no)'
  ),
  'version numbers are unique within an application'
);

select * from finish();

rollback;
