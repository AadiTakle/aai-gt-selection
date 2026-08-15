begin;

set local search_path = extensions, public, pg_catalog;

select plan(13);

grant usage on schema extensions to authenticated, api_executor;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f201', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select set_config(
  'test.profile_content',
  '{
    "student": {
      "syntheticStudentCode": "STUDENT-SYN-201",
      "fullName": "Synthetic Submission Student",
      "dateOfBirth": "2016-04-12",
      "genderCode": "SYN_GENDER_UNSPECIFIED",
      "genderVocabularyVersion": "GENDER-SYN-V1"
    },
    "household": {
      "guardianRelationshipCode": "SYN_RELATIONSHIP_PARENT",
      "primaryAddress": {
        "line1": "Synthetic 200 Submission Way",
        "line2": null,
        "city": "Synthetic City",
        "regionCode": "SYN_REGION_TX",
        "postalCode": "00000",
        "countryCode": "US"
      },
      "hasPriorGtRelative": true,
      "priorGtRelativeNames": ["Synthetic Relative One"],
      "languageSurvey": {
        "homeLanguageCode": "SYN_LANGUAGE_ENGLISH",
        "firstLanguageCode": "SYN_LANGUAGE_ENGLISH",
        "primaryLanguageCode": "SYN_LANGUAGE_ENGLISH",
        "hasAdditionalLanguages": true,
        "additionalLanguageCodes": ["SYN_LANGUAGE_SPANISH"],
        "vocabularyVersion": "LANGUAGE-SYN-V1"
      }
    },
    "purpose": {
      "code": "SYN_PROFILE_ACCOUNT_SETUP",
      "version": "PROFILE-PURPOSE-SYN-V1"
    },
    "syntheticOnly": true
  }',
  true
);
select set_config(
  'test.profile_version_id',
  api.save_student_profile(
    '00000000-0000-4000-8000-000000003301',
    current_setting('test.profile_content')::jsonb,
    0,
    '00000000-0000-4000-8000-000000003401',
    '00000000-0000-4000-8000-000000003501'
  ) #>> '{data,profile,profileVersionId}',
  true
);

select set_config(
  'test.complete_submission_content',
  '{
      "application":{
        "currentGradeCode":"SYN_GRADE_05",
        "requestedEntryYear":2027,
        "requestedGradeCode":"SYN_GRADE_06"
      },
      "school":{
        "selectionKind":"directory",
        "schoolId":"00000000-0000-4000-8000-000000000501",
        "schoolVersionId":"00000000-0000-4000-8000-000000000511",
        "snapshot":{
          "name":"Synthetic Learning Academy",
          "typeCode":"SYN_SCHOOL_INDEPENDENT",
          "address":{
            "line1":"Synthetic 100 Example Way",
            "line2":null,
            "city":"Synthetic City",
            "regionCode":"SYN_REGION_TX",
            "postalCode":"00000",
            "countryCode":"US"
          },
          "syntheticOnly":true
        }
      },
      "supportDisclosure":{
        "supportNeeded":false,
        "vocabularyVersion":"SUPPORT-SYN-V1",
        "accommodationCodes":[],
        "supportPlanCodes":[],
        "otherSelected":false,
        "details":null,
        "seriousDisciplineSanction":false,
        "nonHealthWithdrawal":false,
        "disclosureExplanation":null,
        "purposeCode":"SYN_SUPPORT_OPERATIONS_ONLY",
        "syntheticOnly":true
      },
      "financialIntake":{
        "annualHouseholdIncomeMinor":12500000,
        "currencyCode":"USD",
        "taxYear":2025,
        "incomeDefinitionCode":"SYN_INCOME_GROSS_ANNUAL_V1",
        "householdMemberCount":4,
        "householdMemberDefinitionCode":"SYN_HOUSEHOLD_MEMBERS_V1",
        "semanticsVersion":"FINANCE-SYN-V1",
        "purposeCode":"SYN_FINANCIAL_AID_INTAKE_ONLY",
        "syntheticOnly":true
      },
      "finalSubmission":{
        "completedStepCodes":[
          "STUDENT_PROFILE",
          "EDUCATIONAL_BACKGROUND",
          "SUPPORT_DISCLOSURE",
          "HOUSEHOLD_LANGUAGE",
          "FINANCIAL_INTAKE",
          "REVIEW_SIGNATURE"
        ],
        "acknowledgementVersion":"ACKNOWLEDGEMENT-SYN-V1",
        "acknowledgementStatement":"I/We hereby state that the information contained herein is true and complete. I/We acknowledge that supplemental information may be required by the school and understand that our application will not be reviewed until supplement(s), if required, have been submitted.",
        "accuracyAcknowledged":true,
        "acknowledgedAt":"2026-07-20T16:00:00.000Z",
        "referralSourceCode":"SYN_REFERRAL_WEB_SEARCH",
        "signatureStatementVersion":"SIGNATURE-SYN-V1",
        "signatureStatement":"I/We hereby state that the information contained herein is true and complete. I/We acknowledge that supplemental information may be required by the school and understand that our application will not be reviewed until supplement(s), if required, have been submitted.",
        "signatureName":"Synthetic Guardian One",
        "signedAt":"2026-07-20T16:01:00.000Z"
      },
      "syntheticOnly":true
    }',
  true
);

select set_config(
  'test.full_draft_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003001',
    current_setting('test.profile_version_id')::uuid,
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
    current_setting('test.profile_version_id')::uuid,
    '{"application":{"currentGradeCode":"SYN_GRADE_05","requestedEntryYear":2027,"requestedGradeCode":"SYN_GRADE_06"},"syntheticOnly":true}'::jsonb,
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
    current_setting('test.profile_version_id')::uuid,
    current_setting('test.complete_submission_content')::jsonb
      - 'application',
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
  'submission rejects a near-complete draft missing application core'
);

select set_config(
  'test.missing_prior_schools_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003012',
    current_setting('test.profile_version_id')::uuid,
    current_setting('test.complete_submission_content')::jsonb
      - 'school',
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
  'submission rejects a near-complete draft missing current school'
);

select set_config(
  'test.missing_relative_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003013',
    current_setting('test.profile_version_id')::uuid,
    current_setting('test.complete_submission_content')::jsonb
      - 'supportDisclosure',
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
  'submission rejects a near-complete draft missing support disclosure'
);

select set_config(
  'test.missing_steps_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003014',
    current_setting('test.profile_version_id')::uuid,
    current_setting('test.complete_submission_content')::jsonb
      - 'finalSubmission',
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
  'submission rejects a near-complete draft missing final submission'
);

select set_config(
  'test.missing_accuracy_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000003015',
    current_setting('test.profile_version_id')::uuid,
    current_setting('test.complete_submission_content')::jsonb
      - 'financialIntake',
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
  'submission rejects a near-complete draft missing financial intake'
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
