begin;

set local search_path = extensions, public, pg_catalog;

select plan(3);

grant usage on schema extensions to authenticated, api_executor;

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
  '00000000-0000-4000-8000-000000000521',
  '00000000-0000-4000-8000-000000000520',
  1,
  null,
  'SCHOOL-DIRECTORY-SYN-V1',
  'SYN_DIRECTORY_FIXTURE',
  '{
    "name":"Synthetic Expiring School",
    "typeCode":"SYN_SCHOOL_INDEPENDENT",
    "address":{
      "line1":"Synthetic 520 Expiry Way",
      "line2":null,
      "city":"Synthetic City",
      "regionCode":"SYN_REGION_TX",
      "postalCode":"00000",
      "countryCode":"US"
    },
    "syntheticOnly":true
  }'::jsonb,
  current_date - 1,
  current_date,
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  true
);

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f601', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select set_config(
  'test.expiry_profile_version_id',
  api.save_student_profile(
    '00000000-0000-4000-8000-000000007001',
    '{
      "student":{
        "syntheticStudentCode":"STUDENT-SYN-601",
        "fullName":"Synthetic Expiry Student",
        "dateOfBirth":"2016-04-12",
        "genderCode":"SYN_GENDER_UNSPECIFIED",
        "genderVocabularyVersion":"GENDER-SYN-V1"
      },
      "household":{
        "guardianRelationshipCode":"SYN_RELATIONSHIP_PARENT",
        "primaryAddress":{
          "line1":"Synthetic 601 Profile Way",
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
    '00000000-0000-4000-8000-000000007101',
    '00000000-0000-4000-8000-000000007201'
  ) #>> '{data,profile,profileVersionId}',
  true
);

select set_config(
  'test.expiry_draft',
  '{
    "application":{
      "currentGradeCode":"SYN_GRADE_05",
      "requestedEntryYear":2027,
      "requestedGradeCode":"SYN_GRADE_06"
    },
    "school":{
      "selectionKind":"directory",
      "schoolId":"00000000-0000-4000-8000-000000000520",
      "schoolVersionId":"00000000-0000-4000-8000-000000000521",
      "snapshot":{
        "name":"Synthetic Expiring School",
        "typeCode":"SYN_SCHOOL_INDEPENDENT",
        "address":{
          "line1":"Synthetic 520 Expiry Way",
          "line2":null,
          "city":"Synthetic City",
          "regionCode":"SYN_REGION_TX",
          "postalCode":"00000",
          "countryCode":"US"
        },
        "syntheticOnly":true
      }
    },
    "syntheticOnly":true
  }',
  true
);

select is(
  (
    api.save_application_draft(
      '00000000-0000-4000-8000-000000007002',
      current_setting('test.expiry_profile_version_id')::uuid,
      current_setting('test.expiry_draft')::jsonb,
      0,
      '00000000-0000-4000-8000-000000007102',
      '00000000-0000-4000-8000-000000007202'
    ) #>> '{data,application,version}'
  )::integer,
  1,
  'initial save accepts the currently active school version'
);

reset role;

update app.school_directory_version
set active_to = current_date - 1
where school_version_id = '00000000-0000-4000-8000-000000000521';

set local role authenticated;

select is(
  (
    api.save_application_draft(
      '00000000-0000-4000-8000-000000007002',
      current_setting('test.expiry_profile_version_id')::uuid,
      current_setting('test.expiry_draft')::jsonb,
      0,
      '00000000-0000-4000-8000-000000007102',
      '00000000-0000-4000-8000-000000007203'
    ) #>> '{meta,idempotentReplay}'
  )::boolean,
  true,
  'exact actor-scoped replay survives later directory expiry'
);

reset role;
set local role api_executor;

select is(
  (
    select count(*)::integer
    from app.application_version
    where application_id = '00000000-0000-4000-8000-000000007002'
  ),
  1,
  'directory-expiry replay appends no duplicate application version'
);

reset role;

select * from finish();

rollback;
