-- Governance carve-out from the born-synthetic policy for two specific fields:
--   1. Address postalCode may be a real US ZIP (5-digit or ZIP+4), not just the
--      synthetic sentinel '00000'. '00000' still validates (back-compat), and
--      line1/city/regionCode remain born-synthetic. This relaxation is shared by
--      the school snapshot address (school_snapshot_is_allowed calls this).
--   2. household.guardianName holds the parent/guardian's real name verbatim
--      (no "Synthetic" prefix). It is optional for back-compat with profiles
--      saved before this field existed.
--
-- Both changes are `create or replace` of existing validator functions that back
-- CHECK constraints; signatures are unchanged so the constraints keep working.
-- Existing rows are not re-validated by replacing a function.

create or replace function app.synthetic_address_is_allowed(address_to_check jsonb)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select
    app.jsonb_object_has_only_keys(
      address_to_check,
      array['line1', 'line2', 'city', 'regionCode', 'postalCode', 'countryCode']
    )
    and address_to_check ?& array[
      'line1',
      'line2',
      'city',
      'regionCode',
      'postalCode',
      'countryCode'
    ]
    and app.jsonb_string_matches(
      address_to_check -> 'line1',
      '^Synthetic([[:space:]]|$)',
      9,
      200
    )
    and (
      address_to_check -> 'line2' = 'null'::jsonb
      or app.jsonb_string_matches(
        address_to_check -> 'line2',
        '^Synthetic([[:space:]]|$)',
        9,
        200
      )
    )
    and app.jsonb_string_matches(
      address_to_check -> 'city',
      '^Synthetic([[:space:]]|$)',
      9,
      100
    )
    and app.jsonb_string_matches(
      address_to_check -> 'regionCode',
      '^SYN_REGION_[A-Z0-9_]+$',
      12,
      100
    )
    -- real ZIP (5-digit or ZIP+4); '00000' still matches
    and app.jsonb_string_matches(
      address_to_check -> 'postalCode',
      '^[0-9]{5}([-][0-9]{4})?$',
      5,
      10
    )
    and address_to_check ->> 'countryCode' = 'US'
$$;

create or replace function app.student_profile_content_is_allowed(content_to_check jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  student_content jsonb;
  household_content jsonb;
  address_content jsonb;
  language_content jsonb;
  relative_names jsonb;
  additional_languages jsonb;
  has_relative boolean;
  has_additional_languages boolean;
begin
  if not app.jsonb_object_has_only_keys(
    content_to_check,
    array['student', 'household', 'purpose', 'syntheticOnly']
  )
    or not content_to_check ?& array['student', 'household', 'purpose', 'syntheticOnly']
    or content_to_check -> 'syntheticOnly' is distinct from 'true'::jsonb
    or content_to_check #>> '{purpose,code}' <> 'SYN_PROFILE_ACCOUNT_SETUP'
    or content_to_check #>> '{purpose,version}' <> 'PROFILE-PURPOSE-SYN-V1'
    or not app.jsonb_object_has_only_keys(
      content_to_check -> 'purpose',
      array['code', 'version']
    )
  then
    return false;
  end if;

  student_content := content_to_check -> 'student';
  if not app.jsonb_object_has_only_keys(
    student_content,
    array[
      'syntheticStudentCode',
      'fullName',
      'dateOfBirth',
      'genderCode',
      'genderVocabularyVersion'
    ]
  )
    or not student_content ?& array[
      'syntheticStudentCode',
      'fullName',
      'dateOfBirth',
      'genderCode',
      'genderVocabularyVersion'
    ]
    or not app.jsonb_string_matches(
      student_content -> 'syntheticStudentCode',
      '^STUDENT-SYN-[A-Z0-9_-]+$',
      13,
      100
    )
    or not app.jsonb_string_matches(
      student_content -> 'fullName',
      '^Synthetic([[:space:]]|$)',
      9,
      200
    )
    or not app.jsonb_is_iso_date(student_content -> 'dateOfBirth')
    or not app.jsonb_string_matches(
      student_content -> 'genderCode',
      '^SYN_GENDER_[A-Z0-9_]+$',
      12,
      100
    )
    or student_content ->> 'genderVocabularyVersion' <> 'GENDER-SYN-V1'
  then
    return false;
  end if;

  household_content := content_to_check -> 'household';
  if not app.jsonb_object_has_only_keys(
    household_content,
    array[
      'guardianName',
      'guardianRelationshipCode',
      'primaryAddress',
      'hasPriorGtRelative',
      'priorGtRelativeNames',
      'languageSurvey'
    ]
  )
    or not household_content ?& array[
      'guardianRelationshipCode',
      'primaryAddress',
      'hasPriorGtRelative',
      'priorGtRelativeNames',
      'languageSurvey'
    ]
    -- guardianName is optional; when present it is a real name stored verbatim
    -- (bounded string, no "Synthetic" prefix)
    or (
      household_content ? 'guardianName'
      and not app.jsonb_string_matches(household_content -> 'guardianName', '.', 1, 120)
    )
    or not app.jsonb_string_matches(
      household_content -> 'guardianRelationshipCode',
      '^SYN_RELATIONSHIP_[A-Z0-9_]+$',
      18,
      100
    )
    or jsonb_typeof(household_content -> 'hasPriorGtRelative') <> 'boolean'
  then
    return false;
  end if;

  address_content := household_content -> 'primaryAddress';
  if not app.synthetic_address_is_allowed(address_content) then
    return false;
  end if;

  relative_names := household_content -> 'priorGtRelativeNames';
  if not app.jsonb_string_array_is_allowed(
    relative_names,
    '^Synthetic([[:space:]]|$)',
    10
  ) then
    return false;
  end if;

  has_relative := (household_content ->> 'hasPriorGtRelative')::boolean;
  if (has_relative and jsonb_array_length(relative_names) = 0)
    or (not has_relative and jsonb_array_length(relative_names) > 0)
  then
    return false;
  end if;

  language_content := household_content -> 'languageSurvey';
  if not app.jsonb_object_has_only_keys(
    language_content,
    array[
      'homeLanguageCode',
      'firstLanguageCode',
      'primaryLanguageCode',
      'hasAdditionalLanguages',
      'additionalLanguageCodes',
      'vocabularyVersion'
    ]
  )
    or not language_content ?& array[
      'homeLanguageCode',
      'firstLanguageCode',
      'primaryLanguageCode',
      'hasAdditionalLanguages',
      'additionalLanguageCodes',
      'vocabularyVersion'
    ]
    or not app.jsonb_string_matches(
      language_content -> 'homeLanguageCode',
      '^SYN_LANGUAGE_[A-Z0-9_]+$',
      13,
      100
    )
    or not app.jsonb_string_matches(
      language_content -> 'firstLanguageCode',
      '^SYN_LANGUAGE_[A-Z0-9_]+$',
      13,
      100
    )
    or not app.jsonb_string_matches(
      language_content -> 'primaryLanguageCode',
      '^SYN_LANGUAGE_[A-Z0-9_]+$',
      13,
      100
    )
    or jsonb_typeof(language_content -> 'hasAdditionalLanguages') <> 'boolean'
    or language_content ->> 'vocabularyVersion' <> 'LANGUAGE-SYN-V1'
  then
    return false;
  end if;

  additional_languages := language_content -> 'additionalLanguageCodes';
  if not app.jsonb_string_array_is_allowed(
    additional_languages,
    '^SYN_LANGUAGE_[A-Z0-9_]+$',
    10
  ) then
    return false;
  end if;

  has_additional_languages :=
    (language_content ->> 'hasAdditionalLanguages')::boolean;
  if (has_additional_languages and jsonb_array_length(additional_languages) = 0)
    or (
      not has_additional_languages
      and jsonb_array_length(additional_languages) > 0
    )
  then
    return false;
  end if;

  return true;
end
$$;

-- Re-assert grants (create or replace preserves them, but be explicit).
grant execute on function app.synthetic_address_is_allowed(jsonb) to api_executor;
grant execute on function app.student_profile_content_is_allowed(jsonb) to api_executor;
