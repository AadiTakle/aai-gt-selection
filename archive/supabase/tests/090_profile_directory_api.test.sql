begin;

set local search_path = extensions, public, pg_catalog;

select plan(18);

grant usage on schema extensions to authenticated, api_executor;

select set_config('app.user_id', '00000000-0000-4000-8000-00000000f401', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select set_config(
  'test.profile_one',
  '{
    "student":{
      "syntheticStudentCode":"STUDENT-SYN-401",
      "fullName":"Synthetic Profile One",
      "dateOfBirth":"2016-04-12",
      "genderCode":"SYN_GENDER_UNSPECIFIED",
      "genderVocabularyVersion":"GENDER-SYN-V1"
    },
    "household":{
      "guardianRelationshipCode":"SYN_RELATIONSHIP_PARENT",
      "primaryAddress":{
        "line1":"Synthetic 401 Profile Way",
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
  }',
  true
);

select is(
  (
    api.save_student_profile(
      '00000000-0000-4000-8000-000000005001',
      current_setting('test.profile_one')::jsonb,
      0,
      '00000000-0000-4000-8000-000000005101',
      '00000000-0000-4000-8000-000000005201'
    ) #>> '{data,profile,version}'
  )::integer,
  1,
  'first reusable profile starts at version one'
);

select set_config(
  'test.profile_two',
  jsonb_set(
    jsonb_set(
      jsonb_set(
        current_setting('test.profile_one')::jsonb,
        '{student,syntheticStudentCode}',
        '"STUDENT-SYN-402"'::jsonb
      ),
      '{student,fullName}',
      '"Synthetic Profile Two"'::jsonb
    ),
    '{student,dateOfBirth}',
    '"2017-08-21"'::jsonb
  )::text,
  true
);

select is(
  (
    api.save_student_profile(
      '00000000-0000-4000-8000-000000005002',
      current_setting('test.profile_two')::jsonb,
      0,
      '00000000-0000-4000-8000-000000005102',
      '00000000-0000-4000-8000-000000005202'
    ) #>> '{data,profile,version}'
  )::integer,
  1,
  'one guardian can create a second student profile'
);

do $$
declare
  profile_number integer;
  profile_content jsonb;
begin
  for profile_number in 3..21 loop
    profile_content := jsonb_set(
      jsonb_set(
        current_setting('test.profile_one')::jsonb,
        '{student,syntheticStudentCode}',
        to_jsonb(
          'STUDENT-SYN-' || lpad(profile_number::text, 3, '0')
        )
      ),
      '{student,fullName}',
      to_jsonb('Synthetic Profile ' || profile_number::text)
    );
    perform api.save_student_profile(
      extensions.gen_random_uuid(),
      profile_content,
      0,
      extensions.gen_random_uuid(),
      extensions.gen_random_uuid()
    );
  end loop;
end
$$;

select is(
  jsonb_array_length(
    api.list_student_profiles(
      '00000000-0000-4000-8000-000000005203'
    ) #> '{data,profiles}'
  ),
  21,
  'family profile list returns every owned student without a speculative cap'
);

select is(
  api.get_student_profile(
    '00000000-0000-4000-8000-000000005001',
    '00000000-0000-4000-8000-000000005204'
  ) #>> '{data,profile,student,dateOfBirth}',
  '2016-04-12',
  'profile reload returns date of birth and all profile content'
);

select is(
  (
    api.save_student_profile(
      '00000000-0000-4000-8000-000000005001',
      current_setting('test.profile_one')::jsonb,
      0,
      '00000000-0000-4000-8000-000000005101',
      '00000000-0000-4000-8000-000000005205'
    ) #>> '{meta,idempotentReplay}'
  )::boolean,
  true,
  'profile save replay is idempotent'
);

reset role;
set local role api_executor;

select is(
  (
    select count(*)::integer
    from app.student_profile_version
    where profile_id = '00000000-0000-4000-8000-000000005001'
  ),
  1,
  'profile replay appends no duplicate version'
);

reset role;
set local role authenticated;

select throws_ok(
  $sql$
    select api.save_student_profile(
      '00000000-0000-4000-8000-000000005001',
      current_setting('test.profile_one')::jsonb,
      0,
      '00000000-0000-4000-8000-000000005103',
      '00000000-0000-4000-8000-000000005206'
    )
  $sql$,
  'PT409',
  'STALE_VERSION',
  'stale profile version cannot overwrite the latest profile'
);

select throws_ok(
  $sql$
    select api.save_student_profile(
      '00000000-0000-4000-8000-000000005001',
      jsonb_set(
        current_setting('test.profile_one')::jsonb,
        '{student,fullName}',
        '"Synthetic Changed Name"'::jsonb
      ),
      0,
      '00000000-0000-4000-8000-000000005101',
      '00000000-0000-4000-8000-000000005207'
    )
  $sql$,
  'PT409',
  'IDEMPOTENCY_KEY_REUSED',
  'profile idempotency key rejects a changed payload'
);

select throws_ok(
  $sql$
    select api.save_student_profile(
      '00000000-0000-4000-8000-000000005003',
      jsonb_set(
        current_setting('test.profile_one')::jsonb,
        '{household,hasPriorGtRelative}',
        'true'::jsonb
      ),
      0,
      '00000000-0000-4000-8000-000000005104',
      '00000000-0000-4000-8000-000000005208'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'prior-GT flag yes requires at least one synthetic relative name'
);

select throws_ok(
  $sql$
    select api.save_student_profile(
      '00000000-0000-4000-8000-000000005004',
      jsonb_set(
        current_setting('test.profile_one')::jsonb,
        '{household,languageSurvey,hasAdditionalLanguages}',
        'true'::jsonb
      ),
      0,
      '00000000-0000-4000-8000-000000005105',
      '00000000-0000-4000-8000-000000005209'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'additional-language flag yes requires at least one synthetic language code'
);

select throws_ok(
  $sql$
    select api.save_student_profile(
      '00000000-0000-4000-8000-000000005005',
      jsonb_set(
        current_setting('test.profile_one')::jsonb,
        '{student,fullName}',
        '"Real Child"'::jsonb
      ),
      0,
      '00000000-0000-4000-8000-000000005106',
      '00000000-0000-4000-8000-000000005210'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'profile rejects a non-synthetic student name'
);

select throws_ok(
  $sql$
    select api.save_student_profile(
      '00000000-0000-4000-8000-000000005006',
      current_setting('test.profile_one')::jsonb ||
        '{"w2DocumentId":"00000000-0000-4000-8000-000000005999"}'::jsonb,
      0,
      '00000000-0000-4000-8000-000000005107',
      '00000000-0000-4000-8000-000000005211'
    )
  $sql$,
  'PT400',
  'VALIDATION_FAILED',
  'profile rejects proof-document fields'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f402', true);
select set_config('app.user_role', 'family', true);
set local role authenticated;

select throws_ok(
  $sql$
    select api.get_student_profile(
      '00000000-0000-4000-8000-000000005001',
      '00000000-0000-4000-8000-000000005212'
    )
  $sql$,
  'PT404',
  'RESOURCE_NOT_FOUND',
  'wrong-owner profile read is indistinguishable from missing'
);
select throws_ok(
  $sql$
    select api.get_student_profile(
      '00000000-0000-4000-8000-000000005099',
      '00000000-0000-4000-8000-000000005213'
    )
  $sql$,
  'PT404',
  'RESOURCE_NOT_FOUND',
  'absent profile returns the same not-found response'
);
select is(
  jsonb_array_length(
    api.list_student_profiles(
      '00000000-0000-4000-8000-000000005214'
    ) #> '{data,profiles}'
  ),
  0,
  'another family profile list reveals no owned profiles'
);

select is(
  jsonb_array_length(
    api.list_active_schools(
      '00000000-0000-4000-8000-000000005215'
    ) #> '{data,schools}'
  ),
  2,
  'active school read returns the two fictional fixtures'
);
select is(
  (
    select count(*)::integer
    from jsonb_object_keys(
      api.list_active_schools(
        '00000000-0000-4000-8000-000000005216'
      ) #> '{data,schools,0}'
    )
  ),
  8,
  'school list exposes only the minimized display and version fields'
);

reset role;
select set_config('app.user_id', '00000000-0000-4000-8000-00000000f403', true);
select set_config('app.user_role', 'reviewer', true);
set local role authenticated;

select throws_ok(
  $sql$
    select api.list_active_schools(
      '00000000-0000-4000-8000-000000005217'
    )
  $sql$,
  'PT403',
  'ROLE_FORBIDDEN',
  'reviewer cannot use the family school-directory read'
);

reset role;

select * from finish();

rollback;
