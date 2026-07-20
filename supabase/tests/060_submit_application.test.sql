begin;

set local search_path = extensions, public, pg_catalog;

select plan(13);

grant usage on schema extensions to authenticated, api_executor;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f201', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select set_config(
  'test.complete_submission_content',
  '{
      "student":{
        "syntheticStudentIdentifier":"STUDENT-SYN-201",
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
      "referralSourceCode":"SYNTHETIC_WEB_SEARCH",
      "syntheticOnly":true
    }',
  true
);

select set_config(
  'test.full_draft_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003001',
    current_setting('test.complete_submission_content')::jsonb,
    0,
    '00000000-0000-4000-8000-000000003101',
    '00000000-0000-4000-8000-000000003201'
  ) #>> '{data,application,applicationVersionId}',
  true
);

select is(
  api.submit_application(
    current_setting('test.full_draft_version_id')::uuid,
    1,
    '00000000-0000-4000-8000-000000003102',
    '00000000-0000-4000-8000-000000003202'
  ) #>> '{data,application,state}',
  'submitted',
  'submission appends a locked submitted successor'
);

select is(
  api.submit_application(
    current_setting('test.full_draft_version_id')::uuid,
    1,
    '00000000-0000-4000-8000-000000003102',
    '00000000-0000-4000-8000-000000003203'
  ) #>> '{data,status,workflowStatus}',
  'awaiting_assessment',
  'submission projects awaiting-assessment status'
);

select is(
  (
    api.submit_application(
      current_setting('test.full_draft_version_id')::uuid,
      1,
      '00000000-0000-4000-8000-000000003102',
      '00000000-0000-4000-8000-000000003204'
    ) #>> '{meta,idempotentReplay}'
  )::boolean,
  true,
  'submission replay is idempotent'
);

reset role;
set local role api_executor;

select is(
  (
    select count(*)::integer
    from app.application_version
    where application_id = '00000000-0000-4000-8000-000000003001'
  ),
  2,
  'submission preserves the draft and adds one immutable successor'
);

reset role;
set local role authenticated;

select throws_ok(
  format(
    $sql$
      select api.submit_application(
        %L::uuid,
        1,
        '00000000-0000-4000-8000-000000003103',
        '00000000-0000-4000-8000-000000003205'
      )
    $sql$,
    current_setting('test.full_draft_version_id')
  ),
  'PT409',
  'SUBMISSION_LOCKED',
  'a new key cannot submit an already submitted application again'
);

select set_config(
  'test.incomplete_draft_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003002',
    '{"student":{"currentGrade":"5"},"syntheticOnly":true}'::jsonb,
    0,
    '00000000-0000-4000-8000-000000003104',
    '00000000-0000-4000-8000-000000003206'
  ) #>> '{data,application,applicationVersionId}',
  true
);

select throws_ok(
  format(
    $sql$
      select api.submit_application(
        %L::uuid,
        1,
        '00000000-0000-4000-8000-000000003105',
        '00000000-0000-4000-8000-000000003207'
      )
    $sql$,
    current_setting('test.incomplete_draft_version_id')
  ),
  'PT400',
  'VALIDATION_FAILED',
  'incomplete autosave content cannot be submitted'
);

select set_config(
  'test.missing_age_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003011',
    current_setting('test.complete_submission_content')::jsonb #- '{student,ageYears}',
    0,
    '00000000-0000-4000-8000-000000003111',
    '00000000-0000-4000-8000-000000003211'
  ) #>> '{data,application,applicationVersionId}',
  true
);
select throws_ok(
  format(
    'select api.submit_application(%L::uuid, 1, %L::uuid, %L::uuid)',
    current_setting('test.missing_age_version_id'),
    '00000000-0000-4000-8000-000000003121',
    '00000000-0000-4000-8000-000000003221'
  ),
  'PT400',
  'VALIDATION_FAILED',
  'submission rejects a near-complete draft missing age'
);

select set_config(
  'test.missing_prior_schools_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003012',
    current_setting('test.complete_submission_content')::jsonb
      #- '{education,priorSchools}',
    0,
    '00000000-0000-4000-8000-000000003112',
    '00000000-0000-4000-8000-000000003212'
  ) #>> '{data,application,applicationVersionId}',
  true
);
select throws_ok(
  format(
    'select api.submit_application(%L::uuid, 1, %L::uuid, %L::uuid)',
    current_setting('test.missing_prior_schools_version_id'),
    '00000000-0000-4000-8000-000000003122',
    '00000000-0000-4000-8000-000000003222'
  ),
  'PT400',
  'VALIDATION_FAILED',
  'submission rejects a near-complete draft missing prior-schools disclosure'
);

select set_config(
  'test.missing_relative_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003013',
    current_setting('test.complete_submission_content')::jsonb
      #- '{guardian,hasRelativeInGtProgram}',
    0,
    '00000000-0000-4000-8000-000000003113',
    '00000000-0000-4000-8000-000000003213'
  ) #>> '{data,application,applicationVersionId}',
  true
);
select throws_ok(
  format(
    'select api.submit_application(%L::uuid, 1, %L::uuid, %L::uuid)',
    current_setting('test.missing_relative_version_id'),
    '00000000-0000-4000-8000-000000003123',
    '00000000-0000-4000-8000-000000003223'
  ),
  'PT400',
  'VALIDATION_FAILED',
  'submission rejects a near-complete draft missing prior-GT-family disclosure'
);

select set_config(
  'test.missing_steps_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003014',
    current_setting('test.complete_submission_content')::jsonb
      #- '{finalSubmission,completedStepCodes}',
    0,
    '00000000-0000-4000-8000-000000003114',
    '00000000-0000-4000-8000-000000003214'
  ) #>> '{data,application,applicationVersionId}',
  true
);
select throws_ok(
  format(
    'select api.submit_application(%L::uuid, 1, %L::uuid, %L::uuid)',
    current_setting('test.missing_steps_version_id'),
    '00000000-0000-4000-8000-000000003124',
    '00000000-0000-4000-8000-000000003224'
  ),
  'PT400',
  'VALIDATION_FAILED',
  'submission rejects a near-complete draft missing its completed-step list'
);

select set_config(
  'test.missing_accuracy_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003015',
    current_setting('test.complete_submission_content')::jsonb
      #- '{finalSubmission,accuracyAcknowledged}',
    0,
    '00000000-0000-4000-8000-000000003115',
    '00000000-0000-4000-8000-000000003215'
  ) #>> '{data,application,applicationVersionId}',
  true
);
select throws_ok(
  format(
    'select api.submit_application(%L::uuid, 1, %L::uuid, %L::uuid)',
    current_setting('test.missing_accuracy_version_id'),
    '00000000-0000-4000-8000-000000003125',
    '00000000-0000-4000-8000-000000003225'
  ),
  'PT400',
  'VALIDATION_FAILED',
  'submission rejects a near-complete draft missing accuracy acknowledgement'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f202', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select throws_ok(
  format(
    $sql$
      select api.submit_application(
        %L::uuid,
        2,
        '00000000-0000-4000-8000-000000003106',
        '00000000-0000-4000-8000-000000003208'
      )
    $sql$,
    current_setting('test.full_draft_version_id')
  ),
  'PT404',
  'RESOURCE_NOT_FOUND',
  'another family cannot discover or submit the version'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f203', true);
select set_config('app.user_role', 'reviewer', true);
set local role authenticated;

select throws_ok(
  format(
    $sql$
      select api.submit_application(
        %L::uuid,
        1,
        '00000000-0000-4000-8000-000000003107',
        '00000000-0000-4000-8000-000000003209'
      )
    $sql$,
    current_setting('test.incomplete_draft_version_id')
  ),
  'PT403',
  'ROLE_FORBIDDEN',
  'non-family role cannot submit an application'
);

reset role;

select * from finish();

rollback;
