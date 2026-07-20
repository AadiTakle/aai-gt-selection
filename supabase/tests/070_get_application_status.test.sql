begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

grant usage on schema extensions to authenticated;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f301', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select set_config(
  'test.status_draft_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000004001',
    '{"student":{"currentGrade":"5"},"syntheticOnly":true}'::jsonb,
    0,
    '00000000-0000-4000-8000-000000004101',
    '00000000-0000-4000-8000-000000004201'
  ) #>> '{data,application,applicationVersionId}',
  true
);

select is(
  api.get_application_status(
    '00000000-0000-4000-8000-000000004001',
    '00000000-0000-4000-8000-000000004202'
  ) #>> '{data,workflowStatus}',
  'application_draft',
  'draft application projects application-draft status'
);
select is(
  api.get_application_status(
    '00000000-0000-4000-8000-000000004001',
    '00000000-0000-4000-8000-000000004203'
  ) #>> '{data,nextActionCode}',
  'COMPLETE_APPLICATION',
  'draft projection tells the family to complete the application'
);
select is(
  (
    select count(*)::integer
    from jsonb_object_keys(
      api.get_application_status(
        '00000000-0000-4000-8000-000000004001',
        '00000000-0000-4000-8000-000000004204'
      ) -> 'data'
    )
  ),
  8,
  'status response exposes only the eight approved projection fields'
);

select set_config(
  'test.status_full_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000004002',
    '{
      "student":{
        "syntheticStudentIdentifier":"STUDENT-SYN-301",
        "ageYears":10,
        "currentGrade":"5",
        "requestedGrade":"6",
        "requestedEntryYear":2027
      },
      "education":{
        "currentSchoolType":"synthetic-independent",
        "enrollmentStartDate":"2025-08-15",
        "priorSchools":[]
      },
      "guardian":{
        "fullName":"Synthetic Guardian",
        "relationshipToChild":"parent",
        "hasRelativeInGtProgram":false,
        "email":"guardian@example.test",
        "phone":null
      },
      "finalSubmission":{
        "completedStepCodes":["STUDENT","EDUCATION","GUARDIAN"],
        "accuracyAcknowledged":true,
        "signatureName":"Synthetic Guardian",
        "signedAt":"2026-07-20T06:00:00.000Z"
      },
      "syntheticOnly":true
    }'::jsonb,
    0,
    '00000000-0000-4000-8000-000000004102',
    '00000000-0000-4000-8000-000000004205'
  ) #>> '{data,application,applicationVersionId}',
  true
);

select api.submit_application(
  current_setting('test.status_full_version_id')::uuid,
  1,
  '00000000-0000-4000-8000-000000004103',
  '00000000-0000-4000-8000-000000004206'
);

select is(
  api.get_application_status(
    '00000000-0000-4000-8000-000000004002',
    '00000000-0000-4000-8000-000000004207'
  ) #>> '{data,workflowStatus}',
  'awaiting_assessment',
  'submitted application projects awaiting-assessment status'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f302', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select throws_ok(
  $sql$
    select api.get_application_status(
      '00000000-0000-4000-8000-000000004002',
      '00000000-0000-4000-8000-000000004208'
    )
  $sql$,
  'PT404',
  'RESOURCE_NOT_FOUND',
  'another family receives not-found for status'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f303', true);
select set_config('app.user_role', 'reviewer', true);
set local role authenticated;

select throws_ok(
  $sql$
    select api.get_application_status(
      '00000000-0000-4000-8000-000000004002',
      '00000000-0000-4000-8000-000000004209'
    )
  $sql$,
  'PT403',
  'ROLE_FORBIDDEN',
  'non-family role cannot read family status'
);

reset role;

select * from finish();

rollback;
