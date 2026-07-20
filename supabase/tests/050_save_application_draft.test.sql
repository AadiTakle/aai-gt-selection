begin;

set local search_path = extensions, public, pg_catalog;

select plan(15);

grant usage on schema extensions to authenticated;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f101', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select is(
  (
    api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"currentGrade":"5"},"syntheticOnly":true}'::jsonb,
      0,
      '00000000-0000-4000-8000-000000002101',
      '00000000-0000-4000-8000-000000002201'
    ) #>> '{data,application,version}'
  )::integer,
  1,
  'first autosave creates draft version one'
);

select is(
  (
    api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"currentGrade":"5","requestedGrade":"6"},"syntheticOnly":true}'::jsonb,
      1,
      '00000000-0000-4000-8000-000000002102',
      '00000000-0000-4000-8000-000000002202'
    ) #>> '{data,application,version}'
  )::integer,
  2,
  'next autosave appends draft version two'
);

select is(
  (
    api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"currentGrade":"5","requestedGrade":"6"},"syntheticOnly":true}'::jsonb,
      1,
      '00000000-0000-4000-8000-000000002102',
      '00000000-0000-4000-8000-000000002203'
    ) #>> '{meta,idempotentReplay}'
  )::boolean,
  true,
  'same idempotency key and payload returns the stored result'
);

reset role;
set local role api_executor;

select is(
  (
    select count(*)::integer
    from app.application_version
    where application_id = '00000000-0000-4000-8000-000000002001'
  ),
  2,
  'idempotent replay does not append another version'
);

reset role;
set local role authenticated;

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"currentGrade":"4"},"syntheticOnly":true}'::jsonb,
      1,
      '00000000-0000-4000-8000-000000002102',
      '00000000-0000-4000-8000-000000002204'
    )
  $sql$,
  'PT409',
  'IDEMPOTENCY_KEY_REUSED',
  'same idempotency key rejects a different payload'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"currentGrade":"5"},"syntheticOnly":true}'::jsonb,
      0,
      '00000000-0000-4000-8000-000000002103',
      '00000000-0000-4000-8000-000000002205'
    )
  $sql$,
  'PT409',
  'STALE_VERSION',
  'stale expected version cannot overwrite a newer draft'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"householdIncome":100000,"syntheticOnly":true}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002104',
      '00000000-0000-4000-8000-000000002206'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'draft save rejects fields outside the application allowlist'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"currentGrade":"5"}}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002108',
      '00000000-0000-4000-8000-000000002210'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'missing synthetic-only marker fails at the RPC boundary'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"ageYears":"ten"},"syntheticOnly":true}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002107',
      '00000000-0000-4000-8000-000000002209'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'draft save rejects values that violate the typed contract'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"education":{"enrollmentStartDate":"not-a-date"},"syntheticOnly":true}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002109',
      '00000000-0000-4000-8000-000000002211'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'draft save rejects dates outside the Zod contract'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"guardian":{"fullName":"Real Parent","email":"real-family@gmail.com"},"syntheticOnly":true}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002110',
      '00000000-0000-4000-8000-000000002212'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'draft save rejects contact values outside the born-synthetic fixture boundary'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"guardian":{"email":"a..b@example.test"},"syntheticOnly":true}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002112',
      '00000000-0000-4000-8000-000000002214'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'SQL rejects synthetic email shapes that the Zod contract rejects'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"finalSubmission":{"signedAt":"not-a-timestamp"},"syntheticOnly":true}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002111',
      '00000000-0000-4000-8000-000000002213'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'draft save rejects timestamps outside the Zod contract'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f102', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002001',
      '{"student":{"currentGrade":"5"},"syntheticOnly":true}'::jsonb,
      2,
      '00000000-0000-4000-8000-000000002105',
      '00000000-0000-4000-8000-000000002207'
    )
  $sql$,
  'PT404',
  'RESOURCE_NOT_FOUND',
  'another family receives not-found rather than discovering the application'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f103', true);
select set_config('app.user_role', 'reviewer', true);
set local role authenticated;

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000002003',
      '{"student":{"currentGrade":"5"},"syntheticOnly":true}'::jsonb,
      0,
      '00000000-0000-4000-8000-000000002106',
      '00000000-0000-4000-8000-000000002208'
    )
  $sql$,
  'PT403',
  'ROLE_FORBIDDEN',
  'non-family role cannot save an application'
);

reset role;

select * from finish();

rollback;
