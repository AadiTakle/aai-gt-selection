begin;

set local search_path = extensions, public, pg_catalog;

select plan(35);

select has_table('app', 'student_profile', 'guardian-owned student profile root exists');
select has_table('app', 'student_profile_version', 'student profile versions exist');
select has_table('app', 'school_directory_version', 'versioned synthetic schools exist');
select has_table(
  'app',
  'application_private_context_version',
  'purpose-separated private application context exists'
);

select has_column(
  'app',
  'application',
  'student_profile_id',
  'application root binds one reusable student profile'
);
select has_column(
  'app',
  'application_version',
  'student_profile_version_id',
  'application version binds an exact profile version'
);
select has_column(
  'app',
  'application_version',
  'private_context_version_id',
  'application version binds an exact private context version'
);
select has_column(
  'app',
  'application_version',
  'school_directory_version_id',
  'application version may bind an exact directory version'
);
select has_column(
  'app',
  'application_version',
  'school_snapshot',
  'application version stores the displayed school snapshot'
);
select has_column(
  'app',
  'application_version',
  'final_submission_snapshot',
  'application version stores the final signed snapshot'
);
select has_column(
  'app',
  'application_version',
  'submitted_by_user_id',
  'submitted version binds the trusted guardian principal'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'app.student_profile'::regclass),
  'student profile enables RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'app.student_profile'::regclass),
  'student profile forces RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'app.student_profile_version'::regclass),
  'student profile version enables RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'app.student_profile_version'::regclass),
  'student profile version forces RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'app.school_directory_version'::regclass),
  'school directory enables RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'app.school_directory_version'::regclass),
  'school directory forces RLS'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'app.application_private_context_version'::regclass
  ),
  'private application context enables RLS'
);
select ok(
  (
    select relforcerowsecurity
    from pg_class
    where oid = 'app.application_private_context_version'::regclass
  ),
  'private application context forces RLS'
);

select ok(
  not has_table_privilege('authenticated', 'app.student_profile', 'select'),
  'authenticated has no direct profile reads'
);
select ok(
  not has_table_privilege('authenticated', 'app.student_profile_version', 'select'),
  'authenticated has no direct profile-version reads'
);
select ok(
  not has_table_privilege('authenticated', 'app.school_directory_version', 'select'),
  'authenticated has no direct school-directory reads'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'app.application_private_context_version',
    'select'
  ),
  'authenticated has no direct private-context reads'
);

select ok(
  to_regprocedure('api.save_student_profile(uuid,jsonb,integer,uuid,uuid)') is not null,
  'profile save RPC is explicit'
);
select ok(
  to_regprocedure('api.get_student_profile(uuid,uuid)') is not null,
  'profile read RPC is explicit'
);
select ok(
  to_regprocedure('api.list_student_profiles(uuid)') is not null,
  'profile list RPC is explicit'
);
select ok(
  to_regprocedure('api.list_active_schools(uuid)') is not null,
  'active-school read RPC is explicit'
);
select ok(
  to_regprocedure(
    'api.save_application_draft(uuid,uuid,jsonb,integer,uuid,uuid)'
  ) is not null,
  'expanded draft-save RPC is explicit'
);
select ok(
  to_regprocedure('api.get_application(uuid,uuid)') is not null,
  'full family application read RPC is explicit'
);
select ok(
  to_regprocedure('api.submit_application(uuid,integer,uuid,uuid)') is not null,
  'immutable submit RPC remains explicit'
);
select ok(
  to_regprocedure('api.get_application_status(uuid,uuid)') is not null,
  'minimized status RPC remains explicit'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema in ('app', 'api')
      and column_name ~* '(w2|document|upload|essay)'
  ),
  'onboarding storage contains no essay or proof-document columns'
);

select is(
  (
    select count(*)::integer
    from pg_proc procedure_record
    join pg_namespace schema_record
      on schema_record.oid = procedure_record.pronamespace
    where schema_record.nspname = 'api'
      and procedure_record.proname in (
        'save_student_profile',
        'get_student_profile',
        'list_student_profiles',
        'list_active_schools',
        'save_application_draft',
        'get_application',
        'submit_application',
        'get_application_status'
      )
      and procedure_record.prosecdef
  ),
  8,
  'all Milestone A API RPCs are SECURITY DEFINER'
);
select is(
  (
    select count(*)::integer
    from pg_proc procedure_record
    join pg_namespace schema_record
      on schema_record.oid = procedure_record.pronamespace
    join pg_roles owner_role
      on owner_role.oid = procedure_record.proowner
    where schema_record.nspname = 'api'
      and procedure_record.proname in (
        'save_student_profile',
        'get_student_profile',
        'list_student_profiles',
        'list_active_schools',
        'save_application_draft',
        'get_application',
        'submit_application',
        'get_application_status'
      )
      and owner_role.rolname = 'api_executor'
  ),
  8,
  'all Milestone A API RPCs have the constrained executor owner'
);
select is(
  (
    select count(*)::integer
    from pg_proc procedure_record
    join pg_namespace schema_record
      on schema_record.oid = procedure_record.pronamespace
    where schema_record.nspname = 'api'
      and procedure_record.proname in (
        'save_student_profile',
        'get_student_profile',
        'list_student_profiles',
        'list_active_schools',
        'save_application_draft',
        'get_application',
        'submit_application',
        'get_application_status'
      )
      and procedure_record.proconfig @> array['search_path=pg_catalog, extensions']
  ),
  8,
  'all Milestone A API RPCs pin a safe search path'
);

select * from finish();

rollback;
