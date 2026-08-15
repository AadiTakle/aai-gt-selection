begin;

set local search_path = extensions, public, pg_catalog;

select plan(64);

grant usage on schema extensions to authenticated, api_executor;

create function pg_temp.firewall_probe_result(projected_input jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'probeOutcome', 'SYNTHETIC_GRADE_PATHWAY_INPUT',
    'currentGradeCode', projected_input -> 'currentGradeCode',
    'requestedEntryYear', projected_input -> 'requestedEntryYear',
    'requestedGradeCode', projected_input -> 'requestedGradeCode',
    'syntheticOnly', true
  )
$$;

create function pg_temp.firewall_probe_hash(projected_input jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, extensions
as $$
  select
    'sha256:' ||
    encode(
      extensions.digest(
        convert_to(pg_temp.firewall_probe_result(projected_input)::text, 'UTF8'),
        'sha256'
      ),
      'hex'
    )
$$;

create function pg_temp.firewall_mutation_assertions(
  field_class text,
  mutation_path text[],
  replacement jsonb
)
returns setof text
language plpgsql
set search_path = pg_catalog, extensions, pg_temp
as $$
declare
  baseline_projection jsonb;
  mutated_projection jsonb;
begin
  baseline_projection := app.onboarding_decision_projection(
    current_setting('test.firewall_input')::jsonb
  );
  mutated_projection := app.onboarding_decision_projection(
    jsonb_set(
      current_setting('test.firewall_input')::jsonb,
      mutation_path,
      replacement
    )
  );

  return next extensions.is(
    mutated_projection,
    baseline_projection,
    field_class || ' mutation changes zero eligibility-projection fields'
  );
  return next extensions.is(
    pg_temp.firewall_probe_result(mutated_projection),
    pg_temp.firewall_probe_result(baseline_projection),
    field_class || ' mutation changes zero deterministic probe-result fields'
  );
  return next extensions.is(
    pg_temp.firewall_probe_hash(mutated_projection),
    pg_temp.firewall_probe_hash(baseline_projection),
    field_class || ' mutation changes zero deterministic probe-result hash bytes'
  );
end
$$;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f501', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select set_config(
  'test.roundtrip_profile_version_id',
  api.save_student_profile(
    '00000000-0000-4000-8000-000000006001',
    '{
      "student":{
        "syntheticStudentCode":"STUDENT-SYN-501",
        "fullName":"Synthetic Roundtrip Student",
        "dateOfBirth":"2016-04-12",
        "genderCode":"SYN_GENDER_NONBINARY_FIXTURE",
        "genderVocabularyVersion":"GENDER-SYN-V1"
      },
      "household":{
        "guardianRelationshipCode":"SYN_RELATIONSHIP_GUARDIAN",
        "primaryAddress":{
          "line1":"Synthetic 500 Roundtrip Way",
          "line2":"Synthetic Unit 5",
          "city":"Synthetic City",
          "regionCode":"SYN_REGION_TX",
          "postalCode":"00000",
          "countryCode":"US"
        },
        "hasPriorGtRelative":true,
        "priorGtRelativeNames":["Synthetic Relative One"],
        "languageSurvey":{
          "homeLanguageCode":"SYN_LANGUAGE_SPANISH",
          "firstLanguageCode":"SYN_LANGUAGE_SPANISH",
          "primaryLanguageCode":"SYN_LANGUAGE_ENGLISH",
          "hasAdditionalLanguages":true,
          "additionalLanguageCodes":["SYN_LANGUAGE_FRENCH"],
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
    '00000000-0000-4000-8000-000000006101',
    '00000000-0000-4000-8000-000000006201'
  ) #>> '{data,profile,profileVersionId}',
  true
);

select set_config(
  'test.full_roundtrip_draft',
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
      "supportNeeded":true,
      "vocabularyVersion":"SUPPORT-SYN-V1",
      "accommodationCodes":["SYN_ACCOM_EXTENDED_TIME"],
      "supportPlanCodes":["SYN_PLAN_504"],
      "otherSelected":true,
      "details":"Synthetic support details for the private operations context.",
      "seriousDisciplineSanction":true,
      "nonHealthWithdrawal":true,
      "disclosureExplanation":"Synthetic bounded disclosure explanation.",
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
  'test.roundtrip_draft_version_id',
  api.save_application_draft(
    '00000000-0000-4000-8000-000000006002',
    current_setting('test.roundtrip_profile_version_id')::uuid,
    current_setting('test.full_roundtrip_draft')::jsonb,
    0,
    '00000000-0000-4000-8000-000000006102',
    '00000000-0000-4000-8000-000000006202'
  ) #>> '{data,application,applicationVersionId}',
  true
);

select is(
  (
    api.get_application(
      '00000000-0000-4000-8000-000000006002',
      '00000000-0000-4000-8000-000000006203'
    ) #>> '{data,application,version}'
  )::integer,
  1,
  'full application draft saves at version one'
);
select is(
  api.get_application(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006204'
  ) #>> '{data,profile,student,fullName}',
  'Synthetic Roundtrip Student',
  'application reload includes the exact referenced profile'
);
select is(
  api.get_application(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006205'
  ) #>> '{data,application,supportDisclosure,details}',
  'Synthetic support details for the private operations context.',
  'application reload restores private support details'
);
select is(
  (
    api.get_application(
      '00000000-0000-4000-8000-000000006002',
      '00000000-0000-4000-8000-000000006206'
    ) #>> '{data,application,financialIntake,annualHouseholdIncomeMinor}'
  )::bigint,
  12500000::bigint,
  'application reload restores synthetic financial intake'
);
select is(
  api.get_application(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006207'
  ) #>> '{data,application,finalSubmission,signatureStatement}',
  'I/We hereby state that the information contained herein is true and complete. I/We acknowledge that supplemental information may be required by the school and understand that our application will not be reviewed until supplement(s), if required, have been submitted.',
  'reload returns the exact D-013 signature statement'
);
select is(
  api.get_application(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006208'
  ) #>> '{data,application,school,snapshot,name}',
  'Synthetic Learning Academy',
  'reload returns the school display snapshot'
);

reset role;
set local role api_executor;

select is(
  (
    select (
      content ? 'supportDisclosure'
      or content ? 'financialIntake'
    )
    from app.application_version
    where application_version_id =
      current_setting('test.roundtrip_draft_version_id')::uuid
  ),
  false,
  'application core physically excludes support and finance'
);
select is(
  (
    select private_record.content ?& array['supportDisclosure', 'financialIntake']
    from app.application_private_context_version private_record
    join app.application_version version_record
      on version_record.private_context_version_id =
        private_record.private_context_version_id
    where version_record.application_version_id =
      current_setting('test.roundtrip_draft_version_id')::uuid
  ),
  true,
  'private context physically contains support and finance'
);

reset role;
set local role authenticated;

select is(
  (
    select count(*)::integer
    from jsonb_object_keys(
      api.get_application_status(
        '00000000-0000-4000-8000-000000006002',
        '00000000-0000-4000-8000-000000006209'
      ) -> 'data'
    )
  ),
  8,
  'status remains the minimized eight-field projection'
);
select ok(
  api.get_application_status(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006210'
  )::text !~ '(supportDisclosure|annualHouseholdIncomeMinor|signatureName)',
  'status exposes no private or signature fields'
);

reset role;
set local role api_executor;

select set_config(
  'test.firewall_input',
  (
    current_setting('test.full_roundtrip_draft')::jsonb ||
    jsonb_build_object(
      'profile',
      (
        select content
        from app.student_profile_version
        where profile_version_id =
          current_setting('test.roundtrip_profile_version_id')::uuid
      )
    )
  )::text,
  true
);

select is(
  app.onboarding_decision_projection(
    current_setting('test.firewall_input')::jsonb
  ),
  '{
    "currentGradeCode":"SYN_GRADE_05",
    "requestedEntryYear":2027,
    "requestedGradeCode":"SYN_GRADE_06",
    "syntheticOnly":true
  }'::jsonb,
  'eligibility projection exposes exactly the grade-pathway allowlist'
);

select is(
  pg_temp.firewall_probe_result(
    app.onboarding_decision_projection(
      current_setting('test.firewall_input')::jsonb
    )
  ),
  '{
    "probeOutcome":"SYNTHETIC_GRADE_PATHWAY_INPUT",
    "currentGradeCode":"SYN_GRADE_05",
    "requestedEntryYear":2027,
    "requestedGradeCode":"SYN_GRADE_06",
    "syntheticOnly":true
  }'::jsonb,
  'deterministic firewall probe consumes only the eligibility allowlist'
);

with prohibited_mutations(name, path, replacement) as (
  values
    (
      'identity',
      array['profile', 'student', 'fullName'],
      '"Synthetic Different Identity"'::jsonb
    ),
    (
      'household',
      array['profile', 'household', 'primaryAddress', 'line1'],
      '"Synthetic Different Household"'::jsonb
    ),
    (
      'language',
      array['profile', 'household', 'languageSurvey', 'primaryLanguageCode'],
      '"SYN_LANGUAGE_DIFFERENT"'::jsonb
    ),
    (
      'school',
      array['school', 'snapshot', 'name'],
      '"Synthetic Different School"'::jsonb
    ),
    (
      'support',
      array['supportDisclosure', 'details'],
      '"Synthetic Different Support"'::jsonb
    ),
    (
      'disclosure',
      array['supportDisclosure', 'seriousDisciplineSanction'],
      'false'::jsonb
    ),
    (
      'finance',
      array['financialIntake', 'annualHouseholdIncomeMinor'],
      '1'::jsonb
    ),
    (
      'referral',
      array['finalSubmission', 'referralSourceCode'],
      '"SYN_REFERRAL_DIFFERENT"'::jsonb
    ),
    (
      'signature',
      array['finalSubmission', 'signatureName'],
      '"Synthetic Different Signer"'::jsonb
    )
)
select assertion
from prohibited_mutations
cross join lateral pg_temp.firewall_mutation_assertions(
  name,
  path,
  replacement
) assertion;

reset role;
set local role authenticated;

select is(
  (
    api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      current_setting('test.full_roundtrip_draft')::jsonb,
      0,
      '00000000-0000-4000-8000-000000006102',
      '00000000-0000-4000-8000-000000006211'
    ) #>> '{meta,idempotentReplay}'
  )::boolean,
  true,
  'full draft save replay is idempotent'
);

reset role;
set local role api_executor;

select is(
  (
    select count(*)::integer
    from app.application_version
    where application_id = '00000000-0000-4000-8000-000000006002'
  ),
  1,
  'draft replay appends no application version'
);
select is(
  (
    select count(*)::integer
    from app.application_private_context_version
    where application_id = '00000000-0000-4000-8000-000000006002'
  ),
  1,
  'draft replay appends no private-context version'
);

reset role;
set local role authenticated;

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      current_setting('test.full_roundtrip_draft')::jsonb,
      0,
      '00000000-0000-4000-8000-000000006103',
      '00000000-0000-4000-8000-000000006212'
    )
  $sql$,
  'PT409',
  'STALE_VERSION',
  'stale application save cannot overwrite version one'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      jsonb_set(
        current_setting('test.full_roundtrip_draft')::jsonb,
        '{application,requestedEntryYear}',
        '2028'::jsonb
      ),
      0,
      '00000000-0000-4000-8000-000000006102',
      '00000000-0000-4000-8000-000000006213'
    )
  $sql$,
  'PT409',
  'IDEMPOTENCY_KEY_REUSED',
  'application idempotency key rejects a changed payload'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      jsonb_set(
        current_setting('test.full_roundtrip_draft')::jsonb,
        '{school,snapshot,name}',
        '"Synthetic Forged School Name"'::jsonb
      ),
      1,
      '00000000-0000-4000-8000-000000006104',
      '00000000-0000-4000-8000-000000006214'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'directory selection rejects a mismatched display snapshot'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      jsonb_set(
        current_setting('test.full_roundtrip_draft')::jsonb,
        '{supportDisclosure,details}',
        'null'::jsonb
      ),
      1,
      '00000000-0000-4000-8000-000000006105',
      '00000000-0000-4000-8000-000000006215'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'support-needed yes requires bounded details'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      jsonb_set(
        current_setting('test.full_roundtrip_draft')::jsonb,
        '{supportDisclosure,disclosureExplanation}',
        'null'::jsonb
      ),
      1,
      '00000000-0000-4000-8000-000000006106',
      '00000000-0000-4000-8000-000000006216'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'discipline or withdrawal yes requires bounded explanation'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      jsonb_set(
        jsonb_set(
          current_setting('test.full_roundtrip_draft')::jsonb,
          '{supportDisclosure,seriousDisciplineSanction}',
          'false'::jsonb
        ),
        '{supportDisclosure,nonHealthWithdrawal}',
        'false'::jsonb
      ),
      1,
      '00000000-0000-4000-8000-000000006107',
      '00000000-0000-4000-8000-000000006217'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'disclosure explanation must be empty when both disclosure flags are no'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      jsonb_set(
        current_setting('test.full_roundtrip_draft')::jsonb,
        '{financialIntake,w2DocumentId}',
        '"00000000-0000-4000-8000-000000006999"'::jsonb
      ),
      1,
      '00000000-0000-4000-8000-000000006108',
      '00000000-0000-4000-8000-000000006218'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'financial intake rejects W-2 document fields'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      current_setting('test.full_roundtrip_draft')::jsonb ||
        '{"essayOne":"Synthetic excluded prose"}'::jsonb,
      1,
      '00000000-0000-4000-8000-000000006109',
      '00000000-0000-4000-8000-000000006219'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'application rejects essays'
);
select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      jsonb_set(
        current_setting('test.full_roundtrip_draft')::jsonb,
        '{school,enrollmentDate}',
        '"2025-08-15"'::jsonb
      ),
      1,
      '00000000-0000-4000-8000-000000006110',
      '00000000-0000-4000-8000-000000006220'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'application rejects current-school enrollment date and prior-history shape'
);

select set_config(
  'test.roundtrip_submitted_version_id',
  api.submit_application(
    current_setting('test.roundtrip_draft_version_id')::uuid,
    1,
    '00000000-0000-4000-8000-000000006111',
    '00000000-0000-4000-8000-000000006221'
  ) #>> '{data,application,applicationVersionId}',
  true
);

select is(
  api.get_application(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006222'
  ) #>> '{data,application,state}',
  'submitted',
  'full application submits as an immutable successor'
);
select is(
  api.get_application_status(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006223'
  ) #>> '{data,workflowStatus}',
  'awaiting_assessment',
  'submitted status is awaiting assessment, not admission'
);

reset role;
set local role api_executor;

select is(
  (
    select student_profile_version_id::text
    from app.application_version
    where application_version_id =
      current_setting('test.roundtrip_submitted_version_id')::uuid
  ),
  current_setting('test.roundtrip_profile_version_id'),
  'submitted application retains the exact profile version'
);
select is(
  (
    select submitted_by_user_id::text
    from app.application_version
    where application_version_id =
      current_setting('test.roundtrip_submitted_version_id')::uuid
  ),
  '00000000-0000-4000-8000-00000000f501',
  'submitted signature is bound to the trusted session principal'
);

reset role;

insert into app.school_directory_version (
  school_version_id,
  school_id,
  version_no,
  supersedes_id,
  directory_version,
  source_code,
  content,
  active_from,
  active_to,
  content_hash,
  synthetic_only
)
values (
  '00000000-0000-4000-8000-000000000513',
  '00000000-0000-4000-8000-000000000501',
  2,
  '00000000-0000-4000-8000-000000000511',
  'SCHOOL-DIRECTORY-SYN-V1',
  'SYN_DIRECTORY_FIXTURE',
  '{
    "name":"Synthetic Renamed Directory School",
    "typeCode":"SYN_SCHOOL_INDEPENDENT",
    "address":{
      "line1":"Synthetic 101 Updated Way",
      "line2":null,
      "city":"Synthetic City",
      "regionCode":"SYN_REGION_TX",
      "postalCode":"00000",
      "countryCode":"US"
    },
    "syntheticOnly":true
  }'::jsonb,
  '2026-01-01',
  null,
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  true
);

set local role authenticated;

select is(
  api.list_active_schools(
    '00000000-0000-4000-8000-000000006224'
  ) #>> '{data,schools,1,name}',
  'Synthetic Renamed Directory School',
  'active directory read advances to the appended school version'
);
select is(
  api.get_application(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006225'
  ) #>> '{data,application,school,snapshot,name}',
  'Synthetic Learning Academy',
  'signed school snapshot remains immutable after directory change'
);
select is(
  api.get_application(
    '00000000-0000-4000-8000-000000006002',
    '00000000-0000-4000-8000-000000006226'
  ) #>> '{data,application,school,schoolVersionId}',
  '00000000-0000-4000-8000-000000000511',
  'signed application keeps the exact original school-version reference'
);

select throws_ok(
  $sql$
    select api.save_application_draft(
      '00000000-0000-4000-8000-000000006002',
      current_setting('test.roundtrip_profile_version_id')::uuid,
      current_setting('test.full_roundtrip_draft')::jsonb,
      2,
      '00000000-0000-4000-8000-000000006112',
      '00000000-0000-4000-8000-000000006227'
    )
  $sql$,
  'PT409',
  'SUBMISSION_LOCKED',
  'submitted application rejects later draft saves'
);
select throws_ok(
  format(
    'select api.submit_application(%L::uuid, 2, %L::uuid, %L::uuid)',
    current_setting('test.roundtrip_submitted_version_id'),
    '00000000-0000-4000-8000-000000006113',
    '00000000-0000-4000-8000-000000006228'
  ),
  'PT409',
  'SUBMISSION_LOCKED',
  'submitted application rejects a second submission'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f502', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select throws_ok(
  $sql$
    select api.get_application(
      '00000000-0000-4000-8000-000000006002',
      '00000000-0000-4000-8000-000000006229'
    )
  $sql$,
  'PT404',
  'RESOURCE_NOT_FOUND',
  'wrong-owner full read is indistinguishable from missing'
);
select throws_ok(
  $sql$
    select api.get_application(
      '00000000-0000-4000-8000-000000006099',
      '00000000-0000-4000-8000-000000006230'
    )
  $sql$,
  'PT404',
  'RESOURCE_NOT_FOUND',
  'missing full read returns the same not-found response'
);
select throws_ok(
  format(
    'select api.submit_application(%L::uuid, 1, %L::uuid, %L::uuid)',
    current_setting('test.roundtrip_draft_version_id'),
    '00000000-0000-4000-8000-000000006114',
    '00000000-0000-4000-8000-000000006231'
  ),
  'PT404',
  'RESOURCE_NOT_FOUND',
  'wrong-owner submit cannot discover the version'
);
select throws_ok(
  $sql$
    select api.get_application_status(
      '00000000-0000-4000-8000-000000006002',
      '00000000-0000-4000-8000-000000006232'
    )
  $sql$,
  'PT404',
  'RESOURCE_NOT_FOUND',
  'wrong-owner status path cannot expose private fields'
);

reset role;

select * from finish();

rollback;
