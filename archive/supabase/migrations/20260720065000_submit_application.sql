set role app_owner;

create function app.application_submission_is_complete(content_to_check jsonb)
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
  age_value numeric;
  entry_year_value numeric;
begin
  if not app.application_draft_is_allowed(content_to_check) then
    return false;
  end if;

  student_content := content_to_check -> 'student';
  education_content := content_to_check -> 'education';
  guardian_content := content_to_check -> 'guardian';
  submission_content := content_to_check -> 'finalSubmission';

  if student_content is null
    or education_content is null
    or guardian_content is null
    or submission_content is null
  then
    return false;
  end if;

  if not (
    student_content ?& array[
      'syntheticStudentIdentifier',
      'ageYears',
      'currentGrade',
      'requestedGrade',
      'requestedEntryYear'
    ]
  ) then
    return false;
  end if;

  if not app.jsonb_is_nonempty_string(student_content -> 'syntheticStudentIdentifier')
    or not app.jsonb_is_nonempty_string(student_content -> 'currentGrade')
    or not app.jsonb_is_nonempty_string(student_content -> 'requestedGrade')
    or jsonb_typeof(student_content -> 'ageYears') is distinct from 'number'
    or jsonb_typeof(student_content -> 'requestedEntryYear') is distinct from 'number'
  then
    return false;
  end if;

  age_value := (student_content ->> 'ageYears')::numeric;
  entry_year_value := (student_content ->> 'requestedEntryYear')::numeric;

  if age_value <= 0
    or age_value <> trunc(age_value)
    or entry_year_value < 2026
    or entry_year_value > 2100
    or entry_year_value <> trunc(entry_year_value)
  then
    return false;
  end if;

  if not (
    education_content ?& array[
      'currentSchoolType',
      'enrollmentStartDate',
      'priorSchools'
    ]
  ) then
    return false;
  end if;

  if not app.jsonb_is_nonempty_string(education_content -> 'currentSchoolType')
    or not app.jsonb_is_nonempty_string(education_content -> 'enrollmentStartDate')
    or jsonb_typeof(education_content -> 'priorSchools') is distinct from 'array'
  then
    return false;
  end if;

  if not (
    guardian_content ?& array[
      'fullName',
      'relationshipToChild',
      'hasRelativeInGtProgram'
    ]
  ) then
    return false;
  end if;

  if not app.jsonb_is_nonempty_string(guardian_content -> 'fullName')
    or not app.jsonb_is_nonempty_string(guardian_content -> 'relationshipToChild')
    or jsonb_typeof(guardian_content -> 'hasRelativeInGtProgram') is distinct from 'boolean'
    or (
      not app.jsonb_is_nonempty_string(guardian_content -> 'email')
      and not app.jsonb_is_nonempty_string(guardian_content -> 'phone')
    )
  then
    return false;
  end if;

  if not (
    submission_content ?& array[
      'completedStepCodes',
      'accuracyAcknowledged',
      'signatureName',
      'signedAt'
    ]
  ) then
    return false;
  end if;

  if jsonb_typeof(submission_content -> 'completedStepCodes') is distinct from 'array'
    or not ((submission_content -> 'completedStepCodes') @> '["STUDENT"]'::jsonb)
    or not ((submission_content -> 'completedStepCodes') @> '["EDUCATION"]'::jsonb)
    or not ((submission_content -> 'completedStepCodes') @> '["GUARDIAN"]'::jsonb)
    or submission_content -> 'accuracyAcknowledged' is distinct from 'true'::jsonb
    or not app.jsonb_is_nonempty_string(submission_content -> 'signatureName')
    or not app.jsonb_is_nonempty_string(submission_content -> 'signedAt')
    or submission_content ->> 'signatureName'
      is distinct from guardian_content ->> 'fullName'
  then
    return false;
  end if;

  return true;
end
$$;

revoke execute on function app.application_submission_is_complete(jsonb)
from public, anon, authenticated, service_role;

reset role;

grant execute on function app.application_submission_is_complete(jsonb) to api_executor;

set role api_executor;

create function api.submit_application(
  p_application_version_id uuid,
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
  existing_idempotency app.idempotency_record%rowtype;
  target_version app.application_version%rowtype;
  latest_version app.application_version%rowtype;
  submitted_version_id uuid;
  response_payload jsonb;
begin
  if v_actor_id is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;

  if v_actor_role is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;

  if p_application_version_id is null
    or p_expected_version is null
    or p_expected_version < 1
    or p_idempotency_key is null
    or p_correlation_id is null
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash :=
    'sha256:' || encode(
      extensions.digest(
        convert_to(
          jsonb_build_object(
            'applicationVersionId', p_application_version_id,
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
      v_actor_id::text || ':submit_application:' || p_idempotency_key::text,
      0
    )
  );

  select *
  into existing_idempotency
  from app.idempotency_record idempotency_record
  where idempotency_record.actor_id = v_actor_id
    and idempotency_record.rpc_name = 'submit_application'
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

  select *
  into target_version
  from app.application_version
  where application_version_id = p_application_version_id;

  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_version.application_id::text, 0));

  select *
  into latest_version
  from app.application_version
  where application_id = target_version.application_id
  order by version_no desc
  limit 1;

  if latest_version.state = 'submitted' then
    raise exception using errcode = 'PT409', message = 'SUBMISSION_LOCKED';
  end if;

  if latest_version.application_version_id <> target_version.application_version_id
    or target_version.version_no <> p_expected_version
  then
    raise exception using errcode = 'PT409', message = 'STALE_VERSION';
  end if;

  if not app.application_submission_is_complete(target_version.content) then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  submitted_version_id := extensions.gen_random_uuid();

  insert into app.application_version (
    application_version_id,
    application_id,
    version_no,
    supersedes_id,
    state,
    content,
    content_hash,
    synthetic_only,
    submitted_at
  )
  values (
    submitted_version_id,
    target_version.application_id,
    target_version.version_no + 1,
    target_version.application_version_id,
    'submitted',
    target_version.content,
    target_version.content_hash,
    true,
    statement_timestamp()
  );

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'application',
      target_version.content || jsonb_build_object(
        'applicationId', target_version.application_id,
        'applicationVersionId', submitted_version_id,
        'version', target_version.version_no + 1,
        'supersedesId', target_version.application_version_id,
        'state', 'submitted',
        'contentHash', target_version.content_hash,
        'syntheticOnly', true
      ),
      'status', jsonb_build_object(
        'workflowStatus', 'awaiting_assessment',
        'displayLabelCode', 'STATUS_AWAITING_ASSESSMENT',
        'phase', 'assessment',
        'familyActionRequired', false,
        'nextActionCode', 'AWAIT_ASSESSMENT',
        'deadline', null,
        'pendingReason', null,
        'claimBoundaryCode', 'ELIGIBILITY_NOT_ADMISSION'
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
    'submit_application',
    p_idempotency_key,
    request_hash,
    response_payload,
    true
  );

  return response_payload;
end
$$;

reset role;

revoke execute on function api.submit_application(uuid, integer, uuid, uuid)
from public, anon, service_role;
grant execute on function api.submit_application(uuid, integer, uuid, uuid)
to authenticated;

comment on function api.submit_application(uuid, integer, uuid, uuid) is
  'Family-only immutable submission transition. Returns awaiting_assessment, never eligibility or admission.';
