begin;

set local search_path = extensions, public, pg_catalog;

select plan(8);

-- Test-only access so assertions execute under the same roles as the statements.
grant usage on schema extensions to api_executor, authenticated;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f001', true);
select set_config('app.user_role', 'family', true);
set local role api_executor;

insert into app.student_profile (
  profile_id,
  owner_user_id,
  synthetic_student_code,
  synthetic_only
)
values (
  '00000000-0000-4000-8000-000000001301',
  '00000000-0000-4000-8000-00000000f001',
  'STUDENT-SYN-RLS-01',
  true
);

insert into app.student_profile_version (
  profile_version_id,
  profile_id,
  version_no,
  supersedes_id,
  content,
  content_hash,
  synthetic_only
)
values (
  '00000000-0000-4000-8000-000000001311',
  '00000000-0000-4000-8000-000000001301',
  1,
  null,
  '{
    "student": {
      "syntheticStudentCode": "STUDENT-SYN-RLS-01",
      "fullName": "Synthetic RLS Student",
      "dateOfBirth": "2016-01-01",
      "genderCode": "SYN_GENDER_UNSPECIFIED",
      "genderVocabularyVersion": "GENDER-SYN-V1"
    },
    "household": {
      "guardianRelationshipCode": "SYN_RELATIONSHIP_PARENT",
      "primaryAddress": {
        "line1": "Synthetic 1 RLS Way",
        "line2": null,
        "city": "Synthetic City",
        "regionCode": "SYN_REGION_TX",
        "postalCode": "00000",
        "countryCode": "US"
      },
      "hasPriorGtRelative": false,
      "priorGtRelativeNames": [],
      "languageSurvey": {
        "homeLanguageCode": "SYN_LANGUAGE_ENGLISH",
        "firstLanguageCode": "SYN_LANGUAGE_ENGLISH",
        "primaryLanguageCode": "SYN_LANGUAGE_ENGLISH",
        "hasAdditionalLanguages": false,
        "additionalLanguageCodes": [],
        "vocabularyVersion": "LANGUAGE-SYN-V1"
      }
    },
    "purpose": {
      "code": "SYN_PROFILE_ACCOUNT_SETUP",
      "version": "PROFILE-PURPOSE-SYN-V1"
    },
    "syntheticOnly": true
  }'::jsonb,
  'sha256:1111111111111111111111111111111111111111111111111111111111111111',
  true
);

insert into app.application (
  application_id,
  owner_user_id,
  cycle_id,
  student_profile_id,
  synthetic_applicant_code,
  synthetic_only
)
values (
  '00000000-0000-4000-8000-000000001001',
  '00000000-0000-4000-8000-00000000f001',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000001301',
  'APPLICANT-SYN-RLS-01',
  true
);

select is(
  (select count(*)::integer from app.application),
  1,
  'family API principal can read its own application'
);

insert into app.application_private_context_version (
  private_context_version_id,
  application_id,
  version_no,
  supersedes_id,
  content,
  content_hash,
  synthetic_only
)
values (
  '00000000-0000-4000-8000-000000001321',
  '00000000-0000-4000-8000-000000001001',
  1,
  null,
  '{
    "purpose": {
      "code": "SYN_PRIVATE_APPLICATION_CONTEXT",
      "version": "PRIVATE-CONTEXT-SYN-V1"
    },
    "syntheticOnly": true
  }'::jsonb,
  'sha256:2222222222222222222222222222222222222222222222222222222222222222',
  true
);

insert into app.application_version (
  application_version_id,
  application_id,
  version_no,
  supersedes_id,
  state,
  content,
  content_hash,
  student_profile_version_id,
  private_context_version_id,
  synthetic_only
)
values (
  '00000000-0000-4000-8000-000000001101',
  '00000000-0000-4000-8000-000000001001',
  1,
  null,
  'draft',
  '{"application":{"currentGradeCode":"SYN_GRADE_05","requestedEntryYear":2027,"requestedGradeCode":"SYN_GRADE_06"},"syntheticOnly":true}'::jsonb,
  'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  '00000000-0000-4000-8000-000000001311',
  '00000000-0000-4000-8000-000000001321',
  true
);

select is(
  (select count(*)::integer from app.application_version),
  1,
  'family API principal can read its own application version'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f002', true);
select set_config('app.user_role', 'family', true);
set local role api_executor;

select is(
  (select count(*)::integer from app.application),
  0,
  'another family cannot discover the application root'
);
select is(
  (select count(*)::integer from app.application_version),
  0,
  'another family cannot discover application versions'
);
select throws_ok(
  $sql$
    insert into app.application (
      application_id,
      owner_user_id,
      cycle_id,
      student_profile_id,
      synthetic_applicant_code,
      synthetic_only
    )
    values (
      '00000000-0000-4000-8000-000000001002',
      '00000000-0000-4000-8000-00000000f001',
      '00000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000001301',
      'APPLICANT-SYN-RLS-02',
      true
    )
  $sql$,
  '42501',
  'new row violates row-level security policy for table "application"',
  'family cannot create an application owned by another user'
);
select throws_ok(
  $sql$
    insert into app.idempotency_record (
      actor_id,
      rpc_name,
      idempotency_key,
      request_hash,
      response_payload,
      synthetic_only
    )
    values (
      '00000000-0000-4000-8000-00000000f001',
      'save_application_draft',
      '00000000-0000-4000-8000-000000001201',
      'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      '{}'::jsonb,
      true
    )
  $sql$,
  '42501',
  'new row violates row-level security policy for table "idempotency_record"',
  'idempotency records cannot be forged for another actor'
);

reset role;
set local role authenticated;

select throws_ok(
  'select * from app.application',
  '42501',
  'permission denied for schema app',
  'authenticated receives a hard denial for direct application reads'
);
select throws_ok(
  'select * from app.application_version',
  '42501',
  'permission denied for schema app',
  'authenticated receives a hard denial for direct version reads'
);

reset role;

select * from finish();

rollback;
