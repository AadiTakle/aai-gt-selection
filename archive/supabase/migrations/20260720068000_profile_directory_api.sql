set role app_owner;

create function app.bind_local_synthetic_principal()
returns void
language plpgsql
set search_path = pg_catalog
as $$
declare
  claims_text text;
  claims jsonb;
  claim_subject text;
  claim_role text;
  claim_issuer text;
begin
  if nullif(current_setting('app.user_id', true), '') is not null
    and nullif(current_setting('app.user_role', true), '') is not null
  then
    return;
  end if;

  claims_text := nullif(current_setting('request.jwt.claims', true), '');
  if claims_text is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;

  begin
    claims := claims_text::jsonb;
  exception
    when others then
      raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end;

  claim_subject := claims ->> 'sub';
  claim_role := claims #>> '{app_metadata,user_role}';
  claim_issuer := claims ->> 'iss';

  if claim_subject is null
    or claim_subject !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or claim_role is null
  then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;

  if claims #> '{app_metadata,synthetic_only}' is distinct from 'true'::jsonb
    or claim_issuer !~ '^http://(127[.]0[.]0[.]1|localhost):65421/auth/v1$'
    or claim_role not in (
      'family',
      'admissions_operator',
      'reviewer',
      'review_supervisor',
      'decision_service',
      'auditor',
      'privacy_steward'
    )
  then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;

  perform set_config('app.user_id', claim_subject, true);
  perform set_config('app.user_role', claim_role, true);
end
$$;

create function app.jsonb_string_array_is_allowed(
  value_to_check jsonb,
  required_pattern text,
  maximum_count integer
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_typeof(value_to_check) = 'array'
      and jsonb_array_length(value_to_check) <= maximum_count
      and not exists (
        select 1
        from jsonb_array_elements(value_to_check) element
        where jsonb_typeof(element) <> 'string'
          or char_length(btrim(element #>> '{}')) not between 1 and 200
          or (element #>> '{}') !~ required_pattern
      )
      and (
        select count(*)
        from jsonb_array_elements_text(value_to_check)
      ) = (
        select count(distinct element)
        from jsonb_array_elements_text(value_to_check) element
      ),
    false
  )
$$;

create function app.synthetic_address_is_allowed(address_to_check jsonb)
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
    and address_to_check ->> 'postalCode' = '00000'
    and address_to_check ->> 'countryCode' = 'US'
$$;

create function app.student_profile_content_is_allowed(content_to_check jsonb)
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

create function app.school_snapshot_is_allowed(snapshot_to_check jsonb)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select
    app.jsonb_object_has_only_keys(
      snapshot_to_check,
      array['name', 'typeCode', 'address', 'syntheticOnly']
    )
    and snapshot_to_check ?& array['name', 'typeCode', 'address', 'syntheticOnly']
    and snapshot_to_check -> 'syntheticOnly' = 'true'::jsonb
    and app.jsonb_string_matches(
      snapshot_to_check -> 'name',
      '^Synthetic([[:space:]]|$)',
      9,
      200
    )
    and app.jsonb_string_matches(
      snapshot_to_check -> 'typeCode',
      '^SYN_SCHOOL_[A-Z0-9_]+$',
      12,
      100
    )
    and app.synthetic_address_is_allowed(snapshot_to_check -> 'address')
$$;

create function app.onboarding_decision_projection(draft_to_project jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'currentGradeCode',
    draft_to_project #> '{application,currentGradeCode}',
    'requestedEntryYear',
    draft_to_project #> '{application,requestedEntryYear}',
    'requestedGradeCode',
    draft_to_project #> '{application,requestedGradeCode}',
    'syntheticOnly',
    true
  )
$$;

reset role;
grant usage on schema extensions to app_owner;
grant execute on function extensions.digest(bytea, text) to app_owner;
set role app_owner;

create function app.onboarding_decision_projection_hash(draft_to_project jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, extensions
as $$
  select
    'sha256:' ||
    encode(
      extensions.digest(
        convert_to(
          app.onboarding_decision_projection(draft_to_project)::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
$$;

revoke execute on function app.bind_local_synthetic_principal()
from public, anon, authenticated, service_role;
revoke execute on function app.jsonb_string_array_is_allowed(jsonb, text, integer)
from public, anon, authenticated, service_role;
revoke execute on function app.synthetic_address_is_allowed(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.student_profile_content_is_allowed(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.school_snapshot_is_allowed(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.onboarding_decision_projection(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.onboarding_decision_projection_hash(jsonb)
from public, anon, authenticated, service_role;

reset role;

grant execute on function app.bind_local_synthetic_principal() to api_executor;
grant execute on function app.jsonb_string_array_is_allowed(jsonb, text, integer)
to api_executor;
grant execute on function app.synthetic_address_is_allowed(jsonb) to api_executor;
grant execute on function app.student_profile_content_is_allowed(jsonb) to api_executor;
grant execute on function app.school_snapshot_is_allowed(jsonb) to api_executor;
grant execute on function app.onboarding_decision_projection(jsonb) to api_executor;
grant execute on function app.onboarding_decision_projection_hash(jsonb)
to api_executor;

set role api_executor;

create function api.save_student_profile(
  p_profile_id uuid,
  p_profile jsonb,
  p_expected_version integer,
  p_idempotency_key uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  request_hash text;
  content_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  profile_root app.student_profile%rowtype;
  latest_version app.student_profile_version%rowtype;
  next_version integer;
  new_version_id uuid;
  response_payload jsonb;
begin
  perform app.bind_local_synthetic_principal();
  v_actor_id := app.current_user_id();
  v_actor_role := app.current_user_role();

  if v_actor_id is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if v_actor_role is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_profile_id is null
    or p_expected_version is null
    or p_expected_version < 0
    or p_idempotency_key is null
    or p_correlation_id is null
    or not app.student_profile_content_is_allowed(p_profile)
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash :=
    'sha256:' || encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'profileId', p_profile_id,
            'profile', p_profile,
            'expectedVersion', p_expected_version
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_actor_id::text || ':save_student_profile:' || p_idempotency_key::text,
      0
    )
  );

  select *
  into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor_id
    and record.rpc_name = 'save_student_profile'
    and record.idempotency_key = p_idempotency_key;

  if found then
    if existing_idempotency.request_hash <> request_hash then
      raise exception using errcode = 'PT409', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_set(
      jsonb_set(
        existing_idempotency.response_payload,
        '{meta,idempotentReplay}',
        'true'::jsonb
      ),
      '{meta,correlationId}',
      to_jsonb(p_correlation_id::text)
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_profile_id::text, 0));

  select *
  into profile_root
  from app.student_profile
  where profile_id = p_profile_id;

  if not found then
    if p_expected_version <> 0 then
      raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
    end if;
    begin
      insert into app.student_profile (
        profile_id,
        owner_user_id,
        synthetic_student_code,
        synthetic_only
      )
      values (
        p_profile_id,
        v_actor_id,
        p_profile #>> '{student,syntheticStudentCode}',
        true
      )
      returning * into profile_root;
    exception
      when unique_violation then
        raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
    end;
  elsif profile_root.synthetic_student_code
    <> p_profile #>> '{student,syntheticStudentCode}'
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select *
  into latest_version
  from app.student_profile_version version_record
  where version_record.profile_id = p_profile_id
  order by version_no desc
  limit 1;

  next_version := coalesce(latest_version.version_no, 0) + 1;
  if p_expected_version <> next_version - 1 then
    raise exception using errcode = 'PT409', message = 'STALE_VERSION';
  end if;

  new_version_id := extensions.gen_random_uuid();
  content_hash :=
    'sha256:' || encode(
      extensions.digest(convert_to(p_profile::text, 'UTF8'), 'sha256'),
      'hex'
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
    new_version_id,
    p_profile_id,
    next_version,
    latest_version.profile_version_id,
    p_profile,
    content_hash,
    true
  );

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'profile',
      p_profile || jsonb_build_object(
        'profileId', p_profile_id,
        'profileVersionId', new_version_id,
        'version', next_version,
        'supersedesId', latest_version.profile_version_id,
        'contentHash', content_hash
      )
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', p_idempotency_key,
      'idempotentReplay', false
    )
  );

  insert into app.idempotency_record (
    actor_id,
    rpc_name,
    idempotency_key,
    request_hash,
    response_payload,
    synthetic_only
  )
  values (
    v_actor_id,
    'save_student_profile',
    p_idempotency_key,
    request_hash,
    response_payload,
    true
  );

  return response_payload;
end
$$;

create function api.get_student_profile(
  p_profile_id uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  latest_version app.student_profile_version%rowtype;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_profile_id is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select version_record.*
  into latest_version
  from app.student_profile_version version_record
  where version_record.profile_id = p_profile_id
  order by version_record.version_no desc
  limit 1;

  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'profile',
      latest_version.content || jsonb_build_object(
        'profileId', latest_version.profile_id,
        'profileVersionId', latest_version.profile_version_id,
        'version', latest_version.version_no,
        'supersedesId', latest_version.supersedes_id,
        'contentHash', latest_version.content_hash
      )
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', null,
      'idempotentReplay', false
    )
  );
end
$$;

create function api.list_student_profiles(p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  profiles jsonb;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'profileId', latest.profile_id,
        'profileVersionId', latest.profile_version_id,
        'version', latest.version_no,
        'syntheticStudentCode',
          latest.content #>> '{student,syntheticStudentCode}',
        'fullName', latest.content #>> '{student,fullName}',
        'syntheticOnly', true
      )
      order by latest.content #>> '{student,fullName}', latest.profile_id
    ),
    '[]'::jsonb
  )
  into profiles
  from (
    select distinct on (version_record.profile_id)
      version_record.*
    from app.student_profile_version version_record
    order by version_record.profile_id, version_record.version_no desc
  ) latest;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('profiles', profiles),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', null,
      'idempotentReplay', false
    )
  );
end
$$;

create function api.list_active_schools(p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  schools jsonb;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select coalesce(
    jsonb_agg(
      latest.content || jsonb_build_object(
        'schoolId', latest.school_id,
        'schoolVersionId', latest.school_version_id,
        'version', latest.version_no,
        'directoryVersion', latest.directory_version
      )
      order by latest.content #>> '{name}', latest.school_id
    ),
    '[]'::jsonb
  )
  into schools
  from (
    select distinct on (directory.school_id)
      directory.*
    from app.school_directory_version directory
    where directory.active_from <= current_date
      and (directory.active_to is null or directory.active_to >= current_date)
      and directory.synthetic_only
    order by directory.school_id, directory.version_no desc
  ) latest;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('schools', schools),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', null,
      'idempotentReplay', false
    )
  );
end
$$;

reset role;

revoke execute on function api.save_student_profile(uuid, jsonb, integer, uuid, uuid)
from public, anon, service_role;
revoke execute on function api.get_student_profile(uuid, uuid)
from public, anon, service_role;
revoke execute on function api.list_student_profiles(uuid)
from public, anon, service_role;
revoke execute on function api.list_active_schools(uuid)
from public, anon, service_role;

grant execute on function api.save_student_profile(uuid, jsonb, integer, uuid, uuid)
to authenticated;
grant execute on function api.get_student_profile(uuid, uuid) to authenticated;
grant execute on function api.list_student_profiles(uuid) to authenticated;
grant execute on function api.list_active_schools(uuid) to authenticated;

comment on function app.bind_local_synthetic_principal() is
  'B11B-only binding: derives local identity and admin-controlled role from verified PostgREST JWT claims, requires a local synthetic issuer, then sets transaction-local D-012 GUCs. Existing trusted GUCs from a future B11A adapter take precedence.';
comment on function api.save_student_profile(uuid, jsonb, integer, uuid, uuid) is
  'Family-only append save for one reusable born-synthetic student/household profile.';
comment on function api.list_active_schools(uuid) is
  'Family-only minimized read of latest active fictional school fixtures; E-063 remains unresolved.';
