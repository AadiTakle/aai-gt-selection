create extension if not exists pgcrypto with schema extensions;

set role app_owner;

create function app.jsonb_object_has_only_keys(
  value_to_check jsonb,
  allowed_keys text[]
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if value_to_check is null or jsonb_typeof(value_to_check) <> 'object' then
    return false;
  end if;

  return not exists (
    select 1
    from jsonb_object_keys(value_to_check) key_name
    where not (key_name = any (allowed_keys))
  );
end
$$;

create function app.jsonb_is_bounded_string(
  value_to_check jsonb,
  minimum_length integer,
  maximum_length integer
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_typeof(value_to_check) = 'string'
      and char_length(btrim(value_to_check #>> '{}'))
        between minimum_length and maximum_length,
    false
  )
$$;

create function app.jsonb_is_nonempty_string(value_to_check jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select app.jsonb_is_bounded_string(value_to_check, 1, 200)
$$;

create function app.jsonb_is_code(value_to_check jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select app.jsonb_is_bounded_string(value_to_check, 1, 100)
    and (value_to_check #>> '{}') ~ '^[A-Z0-9_-]+$'
$$;

create function app.jsonb_string_matches(
  value_to_check jsonb,
  required_pattern text,
  minimum_length integer,
  maximum_length integer
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select app.jsonb_is_bounded_string(
    value_to_check,
    minimum_length,
    maximum_length
  )
    and (value_to_check #>> '{}') ~ required_pattern
$$;

create function app.jsonb_is_iso_date(value_to_check jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  date_text text;
  parsed_date date;
begin
  if not app.jsonb_string_matches(
    value_to_check,
    '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',
    10,
    10
  ) then
    return false;
  end if;

  date_text := value_to_check #>> '{}';
  begin
    parsed_date := date_text::date;
  exception
    when others then
      return false;
  end;

  return to_char(parsed_date, 'YYYY-MM-DD') = date_text;
end
$$;

create function app.jsonb_is_iso_datetime(value_to_check jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  datetime_text text;
  parsed_datetime timestamptz;
begin
  if not app.jsonb_string_matches(
    value_to_check,
    '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,9})?(Z|[+-][0-9]{2}:[0-9]{2})$',
    20,
    35
  ) then
    return false;
  end if;

  datetime_text := value_to_check #>> '{}';
  begin
    parsed_datetime := datetime_text::timestamptz;
  exception
    when others then
      return false;
  end;

  return parsed_datetime is not null;
end
$$;

create function app.application_draft_is_allowed(draft_to_check jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  student_content jsonb;
  education_content jsonb;
  guardian_content jsonb;
  submission_content jsonb;
  prior_school jsonb;
  numeric_value numeric;
begin
  if not app.jsonb_object_has_only_keys(
    draft_to_check,
    array[
      'student',
      'education',
      'guardian',
      'finalSubmission',
      'referralSourceCode',
      'syntheticOnly'
    ]
  ) then
    return false;
  end if;

  if draft_to_check -> 'syntheticOnly' is distinct from 'true'::jsonb then
    return false;
  end if;

  if draft_to_check ? 'student'
    and not app.jsonb_object_has_only_keys(
      draft_to_check -> 'student',
      array[
        'syntheticStudentIdentifier',
        'ageYears',
        'currentGrade',
        'requestedGrade',
        'requestedEntryYear'
      ]
    )
  then
    return false;
  end if;

  student_content := draft_to_check -> 'student';
  if student_content is not null then
    if student_content ? 'syntheticStudentIdentifier'
      and not app.jsonb_string_matches(
        student_content -> 'syntheticStudentIdentifier',
        '^STUDENT-SYN-[A-Z0-9_-]+$',
        13,
        100
      )
    then
      return false;
    end if;

    if student_content ? 'currentGrade'
      and not app.jsonb_is_nonempty_string(student_content -> 'currentGrade')
    then
      return false;
    end if;

    if student_content ? 'requestedGrade'
      and not app.jsonb_is_nonempty_string(student_content -> 'requestedGrade')
    then
      return false;
    end if;

    if student_content ? 'ageYears' then
      if jsonb_typeof(student_content -> 'ageYears') <> 'number' then
        return false;
      end if;
      numeric_value := (student_content ->> 'ageYears')::numeric;
      if numeric_value <= 0 or numeric_value <> trunc(numeric_value) then
        return false;
      end if;
    end if;

    if student_content ? 'requestedEntryYear' then
      if jsonb_typeof(student_content -> 'requestedEntryYear') <> 'number' then
        return false;
      end if;
      numeric_value := (student_content ->> 'requestedEntryYear')::numeric;
      if numeric_value < 2026
        or numeric_value > 2100
        or numeric_value <> trunc(numeric_value)
      then
        return false;
      end if;
    end if;
  end if;

  if draft_to_check ? 'education'
    and not app.jsonb_object_has_only_keys(
      draft_to_check -> 'education',
      array[
        'currentSchoolName',
        'currentSchoolType',
        'enrollmentStartDate',
        'enrollmentEndDate',
        'priorSchools'
      ]
    )
  then
    return false;
  end if;

  education_content := draft_to_check -> 'education';
  if education_content is not null then
    if education_content ? 'currentSchoolName'
      and not app.jsonb_string_matches(
        education_content -> 'currentSchoolName',
        '^Synthetic([[:space:]]|$)',
        9,
        200
      )
    then
      return false;
    end if;

    if education_content ? 'currentSchoolType'
      and not app.jsonb_string_matches(
        education_content -> 'currentSchoolType',
        '^synthetic-[a-z0-9-]+$',
        11,
        200
      )
    then
      return false;
    end if;

    if education_content ? 'enrollmentStartDate'
      and not app.jsonb_is_iso_date(education_content -> 'enrollmentStartDate')
    then
      return false;
    end if;

    if education_content ? 'enrollmentEndDate'
      and education_content -> 'enrollmentEndDate' <> 'null'::jsonb
      and not app.jsonb_is_iso_date(education_content -> 'enrollmentEndDate')
    then
      return false;
    end if;
  end if;

  if draft_to_check #> '{education,priorSchools}' is not null then
    if jsonb_typeof(draft_to_check #> '{education,priorSchools}') <> 'array'
      or jsonb_array_length(draft_to_check #> '{education,priorSchools}') > 10
    then
      return false;
    end if;

    for prior_school in
      select value
      from jsonb_array_elements(draft_to_check #> '{education,priorSchools}')
    loop
      if not app.jsonb_object_has_only_keys(
        prior_school,
        array[
          'schoolName',
          'schoolType',
          'enrollmentStartDate',
          'enrollmentEndDate'
        ]
      ) then
        return false;
      end if;

      if not app.jsonb_string_matches(
        prior_school -> 'schoolType',
        '^synthetic-[a-z0-9-]+$',
        11,
        200
      ) then
        return false;
      end if;

      if prior_school ? 'schoolName'
        and not app.jsonb_string_matches(
          prior_school -> 'schoolName',
          '^Synthetic([[:space:]]|$)',
          9,
          200
        )
      then
        return false;
      end if;

      if prior_school ? 'enrollmentStartDate'
        and not app.jsonb_is_iso_date(prior_school -> 'enrollmentStartDate')
      then
        return false;
      end if;

      if prior_school ? 'enrollmentEndDate'
        and prior_school -> 'enrollmentEndDate' <> 'null'::jsonb
        and not app.jsonb_is_iso_date(prior_school -> 'enrollmentEndDate')
      then
        return false;
      end if;
    end loop;
  end if;

  if draft_to_check ? 'guardian'
    and not app.jsonb_object_has_only_keys(
      draft_to_check -> 'guardian',
      array[
        'fullName',
        'relationshipToChild',
        'hasRelativeInGtProgram',
        'email',
        'phone'
      ]
    )
  then
    return false;
  end if;

  guardian_content := draft_to_check -> 'guardian';
  if guardian_content is not null then
    if guardian_content ? 'fullName'
      and not app.jsonb_string_matches(
        guardian_content -> 'fullName',
        '^Synthetic([[:space:]]|$)',
        9,
        200
      )
    then
      return false;
    end if;

    if guardian_content ? 'relationshipToChild'
      and not app.jsonb_is_nonempty_string(guardian_content -> 'relationshipToChild')
    then
      return false;
    end if;

    if guardian_content ? 'hasRelativeInGtProgram'
      and jsonb_typeof(guardian_content -> 'hasRelativeInGtProgram') <> 'boolean'
    then
      return false;
    end if;

    if guardian_content ? 'email'
      and guardian_content -> 'email' <> 'null'::jsonb
      and not app.jsonb_string_matches(
        guardian_content -> 'email',
        '^[a-z][a-z0-9_-]{0,63}@example[.]test$',
        3,
        254
      )
    then
      return false;
    end if;

    if guardian_content ? 'phone'
      and guardian_content -> 'phone' <> 'null'::jsonb
      and not app.jsonb_string_matches(
        guardian_content -> 'phone',
        '^[+]1[2-9][0-9]{2}55501[0-9]{2}$',
        12,
        12
      )
    then
      return false;
    end if;
  end if;

  if draft_to_check ? 'finalSubmission'
    and not app.jsonb_object_has_only_keys(
      draft_to_check -> 'finalSubmission',
      array[
        'completedStepCodes',
        'accuracyAcknowledged',
        'signatureName',
        'signedAt'
      ]
    )
  then
    return false;
  end if;

  submission_content := draft_to_check -> 'finalSubmission';
  if submission_content is not null then
    if submission_content ? 'completedStepCodes' then
      if jsonb_typeof(submission_content -> 'completedStepCodes') <> 'array'
        or jsonb_array_length(submission_content -> 'completedStepCodes') > 20
        or exists (
          select 1
          from jsonb_array_elements(submission_content -> 'completedStepCodes') step_code
          where not app.jsonb_is_code(step_code)
        )
      then
        return false;
      end if;
    end if;

    if submission_content ? 'accuracyAcknowledged'
      and jsonb_typeof(submission_content -> 'accuracyAcknowledged') <> 'boolean'
    then
      return false;
    end if;

    if submission_content ? 'signatureName'
      and not app.jsonb_string_matches(
        submission_content -> 'signatureName',
        '^Synthetic([[:space:]]|$)',
        9,
        200
      )
    then
      return false;
    end if;

    if submission_content ? 'signedAt'
      and not app.jsonb_is_iso_datetime(submission_content -> 'signedAt')
    then
      return false;
    end if;
  end if;

  if draft_to_check ? 'referralSourceCode'
    and draft_to_check -> 'referralSourceCode' <> 'null'::jsonb
    and not app.jsonb_string_matches(
      draft_to_check -> 'referralSourceCode',
      '^SYNTHETIC_[A-Z0-9_-]+$',
      11,
      100
    )
  then
    return false;
  end if;

  return true;
end
$$;

revoke execute on function app.jsonb_object_has_only_keys(jsonb, text[])
from public, anon, authenticated, service_role;
revoke execute on function app.jsonb_is_bounded_string(jsonb, integer, integer)
from public, anon, authenticated, service_role;
revoke execute on function app.jsonb_is_nonempty_string(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.jsonb_is_code(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.jsonb_string_matches(jsonb, text, integer, integer)
from public, anon, authenticated, service_role;
revoke execute on function app.jsonb_is_iso_date(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.jsonb_is_iso_datetime(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.application_draft_is_allowed(jsonb)
from public, anon, authenticated, service_role;

reset role;

grant execute on function app.jsonb_object_has_only_keys(jsonb, text[]) to api_executor;
grant execute on function app.jsonb_is_bounded_string(jsonb, integer, integer)
to api_executor;
grant execute on function app.jsonb_is_nonempty_string(jsonb) to api_executor;
grant execute on function app.jsonb_is_code(jsonb) to api_executor;
grant execute on function app.jsonb_string_matches(jsonb, text, integer, integer)
to api_executor;
grant execute on function app.jsonb_is_iso_date(jsonb) to api_executor;
grant execute on function app.jsonb_is_iso_datetime(jsonb) to api_executor;
grant execute on function app.application_draft_is_allowed(jsonb) to api_executor;
grant usage on schema extensions to api_executor;
grant execute on function extensions.digest(bytea, text) to api_executor;
grant execute on function extensions.gen_random_uuid() to api_executor;

set role api_executor;

create function api.save_application_draft(
  p_application_id uuid,
  p_draft jsonb,
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
  v_actor_id uuid := app.current_user_id();
  v_actor_role text := app.current_user_role();
  request_hash text;
  content_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  latest_version app.application_version%rowtype;
  cycle_id uuid;
  next_version integer;
  new_version_id uuid;
  response_payload jsonb;
begin
  if v_actor_id is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;

  if v_actor_role is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;

  if p_application_id is null
    or p_expected_version is null
    or p_expected_version < 0
    or p_idempotency_key is null
    or p_correlation_id is null
    or not app.application_draft_is_allowed(p_draft)
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash :=
    'sha256:' || encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'applicationId', p_application_id,
            'draft', p_draft,
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
      v_actor_id::text || ':save_application_draft:' || p_idempotency_key::text,
      0
    )
  );

  select *
  into existing_idempotency
  from app.idempotency_record idempotency_record
  where idempotency_record.actor_id = v_actor_id
    and idempotency_record.rpc_name = 'save_application_draft'
    and idempotency_record.idempotency_key = p_idempotency_key;

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

  perform pg_advisory_xact_lock(hashtextextended(p_application_id::text, 0));

  perform 1
  from app.application
  where application_id = p_application_id;

  if not found then
    if p_expected_version <> 0 then
      raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
    end if;

    select cycle.cycle_id
    into cycle_id
    from app.cycle cycle
    where cycle.cycle_code = 'CYCLE-SYN-01'
      and cycle.synthetic_only;

    if cycle_id is null then
      raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
    end if;

    begin
      insert into app.application (
        application_id,
        owner_user_id,
        cycle_id,
        synthetic_applicant_code,
        synthetic_only
      )
      values (
        p_application_id,
        v_actor_id,
        cycle_id,
        'APPLICANT-SYN-' || upper(replace(p_application_id::text, '-', '')),
        true
      );
    exception
      when unique_violation then
        raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
    end;
  end if;

  select *
  into latest_version
  from app.application_version
  where application_id = p_application_id
  order by version_no desc
  limit 1;

  if found and latest_version.state = 'submitted' then
    raise exception using errcode = 'PT409', message = 'SUBMISSION_LOCKED';
  end if;

  next_version := coalesce(latest_version.version_no, 0) + 1;

  if p_expected_version <> next_version - 1 then
    raise exception using errcode = 'PT409', message = 'STALE_VERSION';
  end if;

  new_version_id := extensions.gen_random_uuid();
  content_hash :=
    'sha256:' || encode(
      extensions.digest(convert_to(p_draft::text, 'UTF8'), 'sha256'),
      'hex'
    );

  insert into app.application_version (
    application_version_id,
    application_id,
    version_no,
    supersedes_id,
    state,
    content,
    content_hash,
    synthetic_only
  )
  values (
    new_version_id,
    p_application_id,
    next_version,
    latest_version.application_version_id,
    'draft',
    p_draft,
    content_hash,
    true
  );

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'application',
      p_draft || jsonb_build_object(
        'applicationId', p_application_id,
        'applicationVersionId', new_version_id,
        'version', next_version,
        'supersedesId', latest_version.application_version_id,
        'state', 'draft',
        'contentHash', content_hash,
        'syntheticOnly', true
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
    'save_application_draft',
    p_idempotency_key,
    request_hash,
    response_payload,
    true
  );

  return response_payload;
end
$$;

reset role;

revoke execute on function api.save_application_draft(uuid, jsonb, integer, uuid, uuid)
from public, anon, service_role;
grant execute on function api.save_application_draft(uuid, jsonb, integer, uuid, uuid)
to authenticated;

comment on function api.save_application_draft(uuid, jsonb, integer, uuid, uuid) is
  'Family-only append autosave. Expects the pending D-012 request adapter to set verified Cognito identity in transaction-local GUCs; SQL tests exercise only the downstream GUC contract.';
