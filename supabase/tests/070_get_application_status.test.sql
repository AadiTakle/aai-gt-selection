begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

grant usage on schema extensions to authenticated;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f301', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select set_config(
  'test.status_profile_version_id',
  api.save_student_profile(
    '00000000-0000-4000-8000-000000004301',
    '{
      "student":{
        "syntheticStudentCode":"STUDENT-SYN-301",
        "fullName":"Synthetic Status Student",
        "dateOfBirth":"2016-04-12",
        "genderCode":"SYN_GENDER_UNSPECIFIED",
        "genderVocabularyVersion":"GENDER-SYN-V1"
      },
      "household":{
        "guardianRelationshipCode":"SYN_RELATIONSHIP_PARENT",
        "primaryAddress":{
          "line1":"Synthetic 300 Status Way",
          "line2":null,
          "city":"Synthetic City",
          "regionCode":"SYN_REGION_TX",
          "postalCode":"00000",
          "countryCode":"US"
        },
        "hasPriorGtRelative":false,
        "priorGtRelativeNames":[],
        "languageSurvey":{
          "homeLanguageCode":"SYN_LANGUAGE_ENGLISH",
          "firstLanguageCode":"SYN_LANGUAGE_ENGLISH",
          "primaryLanguageCode":"SYN_LANGUAGE_ENGLISH",
          "hasAdditionalLanguages":false,
          "additionalLanguageCodes":[],
          "vocabularyVersion":"LANGUAGE-SYN-V1"
        }
      },
      "purpose":{
        "code":"SYN_PROFILE_ACCOUNT_SETUP",
        "version":"PROFILE-PURPOSE-SYN-V1"
      },
      "syntheticOnly":true
    }'::jsonb,
    0,
    '00000000-0000-4000-8000-000000004401',
    '00000000-0000-4000-8000-000000004501'
  ) #>> '{data,profile,profileVersionId}',
  true
);

select set_config(
  'test.status_draft_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000004001',
    current_setting('test.status_profile_version_id')::uuid,
    '{"application":{"currentGradeCode":"SYN_GRADE_05","requestedEntryYear":2027,"requestedGradeCode":"SYN_GRADE_06"},"syntheticOnly":true}'::jsonb,
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
    current_setting('test.status_profile_version_id')::uuid,
    '{
      "application":{
        "currentGradeCode":"SYN_GRADE_05",
        "requestedEntryYear":2027,
        "requestedGradeCode":"SYN_GRADE_06"
      },
      "school":{
        "selectionKind":"other",
        "snapshot":{
          "name":"Synthetic Other School",
          "typeCode":"SYN_SCHOOL_OTHER",
          "address":{
            "line1":"Synthetic 999 Other Way",
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
