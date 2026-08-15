set role app_owner;

create function app.support_disclosure_is_allowed(content_to_check jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  support_needed boolean;
  other_selected boolean;
  serious_discipline boolean;
  non_health_withdrawal boolean;
  accommodation_count integer;
  support_plan_count integer;
  details_value jsonb;
  explanation_value jsonb;
begin
  if not app.jsonb_object_has_only_keys(
    content_to_check,
    array[
      'supportNeeded',
      'vocabularyVersion',
      'accommodationCodes',
      'supportPlanCodes',
      'otherSelected',
      'details',
      'seriousDisciplineSanction',
      'nonHealthWithdrawal',
      'disclosureExplanation',
      'purposeCode',
      'syntheticOnly'
    ]
  )
    or not content_to_check ?& array[
      'supportNeeded',
      'vocabularyVersion',
      'accommodationCodes',
      'supportPlanCodes',
      'otherSelected',
      'details',
      'seriousDisciplineSanction',
      'nonHealthWithdrawal',
      'disclosureExplanation',
      'purposeCode',
      'syntheticOnly'
    ]
    or content_to_check -> 'syntheticOnly' is distinct from 'true'::jsonb
    or content_to_check ->> 'vocabularyVersion' <> 'SUPPORT-SYN-V1'
    or content_to_check ->> 'purposeCode' <> 'SYN_SUPPORT_OPERATIONS_ONLY'
    or jsonb_typeof(content_to_check -> 'supportNeeded') <> 'boolean'
    or jsonb_typeof(content_to_check -> 'otherSelected') <> 'boolean'
    or jsonb_typeof(content_to_check -> 'seriousDisciplineSanction') <> 'boolean'
    or jsonb_typeof(content_to_check -> 'nonHealthWithdrawal') <> 'boolean'
    or not app.jsonb_string_array_is_allowed(
      content_to_check -> 'accommodationCodes',
      '^SYN_ACCOM_[A-Z0-9_]+$',
      20
    )
    or not app.jsonb_string_array_is_allowed(
      content_to_check -> 'supportPlanCodes',
      '^SYN_PLAN_[A-Z0-9_]+$',
      20
    )
  then
    return false;
  end if;

  details_value := content_to_check -> 'details';
  explanation_value := content_to_check -> 'disclosureExplanation';
  if details_value <> 'null'::jsonb
    and not app.jsonb_is_bounded_string(details_value, 1, 1000)
  then
    return false;
  end if;
  if explanation_value <> 'null'::jsonb
    and not app.jsonb_is_bounded_string(explanation_value, 1, 1000)
  then
    return false;
  end if;

  support_needed := (content_to_check ->> 'supportNeeded')::boolean;
  other_selected := (content_to_check ->> 'otherSelected')::boolean;
  serious_discipline :=
    (content_to_check ->> 'seriousDisciplineSanction')::boolean;
  non_health_withdrawal :=
    (content_to_check ->> 'nonHealthWithdrawal')::boolean;
  accommodation_count :=
    jsonb_array_length(content_to_check -> 'accommodationCodes');
  support_plan_count :=
    jsonb_array_length(content_to_check -> 'supportPlanCodes');

  if support_needed
    and accommodation_count + support_plan_count = 0
    and not other_selected
  then
    return false;
  end if;
  if (support_needed or other_selected) and details_value = 'null'::jsonb then
    return false;
  end if;
  if not support_needed
    and (
      accommodation_count + support_plan_count > 0
      or other_selected
      or details_value <> 'null'::jsonb
    )
  then
    return false;
  end if;
  if (serious_discipline or non_health_withdrawal)
    and explanation_value = 'null'::jsonb
  then
    return false;
  end if;
  if not (serious_discipline or non_health_withdrawal)
    and explanation_value <> 'null'::jsonb
  then
    return false;
  end if;

  return true;
end
$$;

create function app.financial_intake_is_allowed(content_to_check jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  income_value numeric;
  tax_year_value numeric;
  member_count_value numeric;
begin
  if not app.jsonb_object_has_only_keys(
    content_to_check,
    array[
      'annualHouseholdIncomeMinor',
      'currencyCode',
      'taxYear',
      'incomeDefinitionCode',
      'householdMemberCount',
      'householdMemberDefinitionCode',
      'semanticsVersion',
      'purposeCode',
      'syntheticOnly'
    ]
  )
    or not content_to_check ?& array[
      'annualHouseholdIncomeMinor',
      'currencyCode',
      'taxYear',
      'incomeDefinitionCode',
      'householdMemberCount',
      'householdMemberDefinitionCode',
      'semanticsVersion',
      'purposeCode',
      'syntheticOnly'
    ]
    or content_to_check -> 'syntheticOnly' is distinct from 'true'::jsonb
    or jsonb_typeof(content_to_check -> 'annualHouseholdIncomeMinor') <> 'number'
    or jsonb_typeof(content_to_check -> 'taxYear') <> 'number'
    or jsonb_typeof(content_to_check -> 'householdMemberCount') <> 'number'
    or not app.jsonb_string_matches(
      content_to_check -> 'currencyCode',
      '^[A-Z]{3}$',
      3,
      3
    )
    or content_to_check ->> 'incomeDefinitionCode'
      <> 'SYN_INCOME_GROSS_ANNUAL_V1'
    or content_to_check ->> 'householdMemberDefinitionCode'
      <> 'SYN_HOUSEHOLD_MEMBERS_V1'
    or content_to_check ->> 'semanticsVersion' <> 'FINANCE-SYN-V1'
    or content_to_check ->> 'purposeCode'
      <> 'SYN_FINANCIAL_AID_INTAKE_ONLY'
  then
    return false;
  end if;

  income_value := (content_to_check ->> 'annualHouseholdIncomeMinor')::numeric;
  tax_year_value := (content_to_check ->> 'taxYear')::numeric;
  member_count_value := (content_to_check ->> 'householdMemberCount')::numeric;

  return income_value between 0 and 100000000000
    and income_value = trunc(income_value)
    and tax_year_value between 2000 and 2100
    and tax_year_value = trunc(tax_year_value)
    and member_count_value between 1 and 30
    and member_count_value = trunc(member_count_value);
end
$$;

create or replace function app.application_draft_is_allowed(draft_to_check jsonb)
returns boolean
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  application_content jsonb;
  school_content jsonb;
  submission_content jsonb;
  entry_year_value numeric;
  school_id_text text;
  school_version_id_text text;
  signature_statement constant text :=
    'I/We hereby state that the information contained herein is true and complete. I/We acknowledge that supplemental information may be required by the school and understand that our application will not be reviewed until supplement(s), if required, have been submitted.';
begin
  if not app.jsonb_object_has_only_keys(
    draft_to_check,
    array[
      'application',
      'school',
      'supportDisclosure',
      'financialIntake',
      'finalSubmission',
      'syntheticOnly'
    ]
  )
    or draft_to_check -> 'syntheticOnly' is distinct from 'true'::jsonb
  then
    return false;
  end if;

  if draft_to_check ? 'application' then
    application_content := draft_to_check -> 'application';
    if not app.jsonb_object_has_only_keys(
      application_content,
      array['currentGradeCode', 'requestedEntryYear', 'requestedGradeCode']
    )
      or not application_content ?& array[
        'currentGradeCode',
        'requestedEntryYear',
        'requestedGradeCode'
      ]
      or not app.jsonb_string_matches(
        application_content -> 'currentGradeCode',
        '^SYN_GRADE_[A-Z0-9_]+$',
        11,
        100
      )
      or not app.jsonb_string_matches(
        application_content -> 'requestedGradeCode',
        '^SYN_GRADE_[A-Z0-9_]+$',
        11,
        100
      )
      or jsonb_typeof(application_content -> 'requestedEntryYear') <> 'number'
    then
      return false;
    end if;
    entry_year_value :=
      (application_content ->> 'requestedEntryYear')::numeric;
    if entry_year_value < 2026
      or entry_year_value > 2100
      or entry_year_value <> trunc(entry_year_value)
    then
      return false;
    end if;
  end if;

  if draft_to_check ? 'school' then
    school_content := draft_to_check -> 'school';
    if school_content ->> 'selectionKind' = 'directory' then
      if not app.jsonb_object_has_only_keys(
        school_content,
        array['selectionKind', 'schoolId', 'schoolVersionId', 'snapshot']
      )
        or not school_content ?& array[
          'selectionKind',
          'schoolId',
          'schoolVersionId',
          'snapshot'
        ]
      then
        return false;
      end if;
      school_id_text := school_content ->> 'schoolId';
      school_version_id_text := school_content ->> 'schoolVersionId';
      begin
        perform school_id_text::uuid;
        perform school_version_id_text::uuid;
      exception
        when others then
          return false;
      end;
    elsif school_content ->> 'selectionKind' = 'other' then
      if not app.jsonb_object_has_only_keys(
        school_content,
        array['selectionKind', 'snapshot']
      )
        or not school_content ?& array['selectionKind', 'snapshot']
      then
        return false;
      end if;
    else
      return false;
    end if;
    if not app.school_snapshot_is_allowed(school_content -> 'snapshot') then
      return false;
    end if;
  end if;

  if draft_to_check ? 'supportDisclosure'
    and not app.support_disclosure_is_allowed(
      draft_to_check -> 'supportDisclosure'
    )
  then
    return false;
  end if;

  if draft_to_check ? 'financialIntake'
    and not app.financial_intake_is_allowed(draft_to_check -> 'financialIntake')
  then
    return false;
  end if;

  if draft_to_check ? 'finalSubmission' then
    submission_content := draft_to_check -> 'finalSubmission';
    if not app.jsonb_object_has_only_keys(
      submission_content,
      array[
        'completedStepCodes',
        'acknowledgementVersion',
        'acknowledgementStatement',
        'accuracyAcknowledged',
        'acknowledgedAt',
        'referralSourceCode',
        'signatureStatementVersion',
        'signatureStatement',
        'signatureName',
        'signedAt'
      ]
    )
      or not submission_content ?& array[
        'completedStepCodes',
        'acknowledgementVersion',
        'acknowledgementStatement',
        'accuracyAcknowledged',
        'acknowledgedAt',
        'referralSourceCode',
        'signatureStatementVersion',
        'signatureStatement',
        'signatureName',
        'signedAt'
      ]
      or not app.jsonb_string_array_is_allowed(
        submission_content -> 'completedStepCodes',
        '^(STUDENT_PROFILE|EDUCATIONAL_BACKGROUND|SUPPORT_DISCLOSURE|HOUSEHOLD_LANGUAGE|FINANCIAL_INTAKE|REVIEW_SIGNATURE)$',
        6
      )
      or jsonb_array_length(submission_content -> 'completedStepCodes') = 0
      or submission_content ->> 'acknowledgementVersion'
        <> 'ACKNOWLEDGEMENT-SYN-V1'
      or submission_content ->> 'acknowledgementStatement'
        <> signature_statement
      or submission_content -> 'accuracyAcknowledged' is distinct from 'true'::jsonb
      or not app.jsonb_is_iso_datetime(
        submission_content -> 'acknowledgedAt'
      )
      or not app.jsonb_string_matches(
        submission_content -> 'referralSourceCode',
        '^SYN_REFERRAL_[A-Z0-9_]+$',
        13,
        100
      )
      or submission_content ->> 'signatureStatementVersion'
        <> 'SIGNATURE-SYN-V1'
      or submission_content ->> 'signatureStatement' <> signature_statement
      or not app.jsonb_string_matches(
        submission_content -> 'signatureName',
        '^Synthetic([[:space:]]|$)',
        9,
        200
      )
      or not app.jsonb_is_iso_datetime(submission_content -> 'signedAt')
    then
      return false;
    end if;
  end if;

  return true;
end
$$;

create or replace function app.application_submission_is_complete(
  content_to_check jsonb
)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select
    app.application_draft_is_allowed(content_to_check)
    and content_to_check ?& array[
      'application',
      'school',
      'supportDisclosure',
      'financialIntake',
      'finalSubmission',
      'syntheticOnly'
    ]
    and jsonb_array_length(
      content_to_check #> '{finalSubmission,completedStepCodes}'
    ) = 6
    and content_to_check #> '{finalSubmission,completedStepCodes}'
      @> '[
        "STUDENT_PROFILE",
        "EDUCATIONAL_BACKGROUND",
        "SUPPORT_DISCLOSURE",
        "HOUSEHOLD_LANGUAGE",
        "FINANCIAL_INTAKE",
        "REVIEW_SIGNATURE"
      ]'::jsonb
$$;

revoke execute on function app.support_disclosure_is_allowed(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.financial_intake_is_allowed(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.application_draft_is_allowed(jsonb)
from public, anon, authenticated, service_role;
revoke execute on function app.application_submission_is_complete(jsonb)
from public, anon, authenticated, service_role;

reset role;

grant execute on function app.support_disclosure_is_allowed(jsonb) to api_executor;
grant execute on function app.financial_intake_is_allowed(jsonb) to api_executor;
grant execute on function app.application_draft_is_allowed(jsonb) to api_executor;
grant execute on function app.application_submission_is_complete(jsonb) to api_executor;

drop function api.save_application_draft(uuid, jsonb, integer, uuid, uuid);

set role api_executor;

create function api.save_application_draft(
  p_application_id uuid,
  p_student_profile_version_id uuid,
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
  v_actor_id uuid;
  v_actor_role text;
  request_hash text;
  core_content jsonb;
  private_content jsonb;
  content_hash text;
  private_content_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  profile_version app.student_profile_version%rowtype;
  application_root app.application%rowtype;
  latest_version app.application_version%rowtype;
  latest_private_version app.application_private_context_version%rowtype;
  directory_version app.school_directory_version%rowtype;
  profile_id uuid;
  directory_version_id uuid;
  next_version integer;
  new_private_version_id uuid;
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
  if p_application_id is null
    or p_student_profile_version_id is null
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
            'studentProfileVersionId', p_student_profile_version_id,
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
      v_actor_id::text || ':save_application_draft:' ||
        p_idempotency_key::text,
      0
    )
  );

  select *
  into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor_id
    and record.rpc_name = 'save_application_draft'
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

  select version_record.*
  into profile_version
  from app.student_profile_version version_record
  where version_record.profile_version_id = p_student_profile_version_id;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;
  profile_id := profile_version.profile_id;

  if p_draft #>> '{school,selectionKind}' = 'directory' then
    select directory.*
    into directory_version
    from app.school_directory_version directory
    where directory.school_id = (p_draft #>> '{school,schoolId}')::uuid
      and directory.school_version_id =
        (p_draft #>> '{school,schoolVersionId}')::uuid
      and directory.active_from <= current_date
      and (directory.active_to is null or directory.active_to >= current_date)
      and directory.synthetic_only;
    if not found
      or directory_version.content <> p_draft #> '{school,snapshot}'
    then
      raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
    end if;
    directory_version_id := directory_version.school_version_id;
  end if;

  core_content :=
    (p_draft - 'supportDisclosure' - 'financialIntake');
  private_content := jsonb_build_object(
    'purpose',
      jsonb_build_object(
        'code', 'SYN_PRIVATE_APPLICATION_CONTEXT',
        'version', 'PRIVATE-CONTEXT-SYN-V1'
      ),
    'syntheticOnly', true
  );
  if p_draft ? 'supportDisclosure' then
    private_content := private_content || jsonb_build_object(
      'supportDisclosure', p_draft -> 'supportDisclosure'
    );
  end if;
  if p_draft ? 'financialIntake' then
    private_content := private_content || jsonb_build_object(
      'financialIntake', p_draft -> 'financialIntake'
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_application_id::text, 0));

  select *
  into application_root
  from app.application
  where application_id = p_application_id;

  if not found then
    if p_expected_version <> 0 then
      raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
    end if;
    begin
      insert into app.application (
        application_id,
        owner_user_id,
        cycle_id,
        student_profile_id,
        synthetic_applicant_code,
        synthetic_only
      )
      select
        p_application_id,
        v_actor_id,
        cycle.cycle_id,
        profile_id,
        'APPLICANT-SYN-' || upper(replace(p_application_id::text, '-', '')),
        true
      from app.cycle cycle
      where cycle.cycle_code = 'CYCLE-SYN-01'
        and cycle.synthetic_only
      returning * into application_root;
      if not found then
        raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
      end if;
    exception
      when unique_violation then
        raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
    end;
  elsif application_root.student_profile_id <> profile_id then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  select *
  into latest_version
  from app.application_version version_record
  where version_record.application_id = p_application_id
  order by version_record.version_no desc
  limit 1;

  if found and latest_version.state = 'submitted' then
    raise exception using errcode = 'PT409', message = 'SUBMISSION_LOCKED';
  end if;

  next_version := coalesce(latest_version.version_no, 0) + 1;
  if p_expected_version <> next_version - 1 then
    raise exception using errcode = 'PT409', message = 'STALE_VERSION';
  end if;

  select *
  into latest_private_version
  from app.application_private_context_version private_record
  where private_record.application_id = p_application_id
  order by private_record.version_no desc
  limit 1;

  new_private_version_id := extensions.gen_random_uuid();
  new_version_id := extensions.gen_random_uuid();
  content_hash :=
    'sha256:' || encode(
      extensions.digest(convert_to(core_content::text, 'UTF8'), 'sha256'),
      'hex'
    );
  private_content_hash :=
    'sha256:' || encode(
      extensions.digest(convert_to(private_content::text, 'UTF8'), 'sha256'),
      'hex'
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
    new_private_version_id,
    p_application_id,
    next_version,
    latest_private_version.private_context_version_id,
    private_content,
    private_content_hash,
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
    school_directory_version_id,
    school_snapshot,
    final_submission_snapshot,
    synthetic_only
  )
  values (
    new_version_id,
    p_application_id,
    next_version,
    latest_version.application_version_id,
    'draft',
    core_content,
    content_hash,
    p_student_profile_version_id,
    new_private_version_id,
    directory_version_id,
    p_draft #> '{school,snapshot}',
    p_draft -> 'finalSubmission',
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
        'studentProfileVersionId', p_student_profile_version_id,
        'privateContextVersionId', new_private_version_id,
        'version', next_version,
        'supersedesId', latest_version.application_version_id,
        'state', 'draft',
        'contentHash', content_hash,
        'privateContextContentHash', private_content_hash,
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

create function api.get_application(
  p_application_id uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  latest_version app.application_version%rowtype;
  private_version app.application_private_context_version%rowtype;
  profile_version app.student_profile_version%rowtype;
  full_draft jsonb;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_application_id is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select version_record.*
  into latest_version
  from app.application_version version_record
  where version_record.application_id = p_application_id
  order by version_record.version_no desc
  limit 1;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  select *
  into private_version
  from app.application_private_context_version private_record
  where private_record.private_context_version_id =
    latest_version.private_context_version_id;
  select *
  into profile_version
  from app.student_profile_version profile_record
  where profile_record.profile_version_id =
    latest_version.student_profile_version_id;
  if private_version.private_context_version_id is null
    or profile_version.profile_version_id is null
  then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  full_draft :=
    latest_version.content ||
    (private_version.content - 'purpose' - 'syntheticOnly');

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'profile',
      profile_version.content || jsonb_build_object(
        'profileId', profile_version.profile_id,
        'profileVersionId', profile_version.profile_version_id,
        'version', profile_version.version_no,
        'supersedesId', profile_version.supersedes_id,
        'contentHash', profile_version.content_hash
      ),
      'application',
      full_draft || jsonb_build_object(
        'applicationId', latest_version.application_id,
        'applicationVersionId', latest_version.application_version_id,
        'studentProfileVersionId', latest_version.student_profile_version_id,
        'privateContextVersionId', latest_version.private_context_version_id,
        'version', latest_version.version_no,
        'supersedesId', latest_version.supersedes_id,
        'state', latest_version.state,
        'contentHash', latest_version.content_hash,
        'privateContextContentHash', private_version.content_hash,
        'syntheticOnly', true
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

create or replace function api.submit_application(
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
  v_actor_id uuid;
  v_actor_role text;
  request_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  target_version app.application_version%rowtype;
  latest_version app.application_version%rowtype;
  private_version app.application_private_context_version%rowtype;
  full_draft jsonb;
  submitted_version_id uuid;
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
  from app.idempotency_record record
  where record.actor_id = v_actor_id
    and record.rpc_name = 'submit_application'
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

  select *
  into target_version
  from app.application_version version_record
  where version_record.application_version_id = p_application_version_id;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_version.application_id::text, 0)
  );
  select *
  into latest_version
  from app.application_version version_record
  where version_record.application_id = target_version.application_id
  order by version_record.version_no desc
  limit 1;

  if latest_version.state = 'submitted' then
    raise exception using errcode = 'PT409', message = 'SUBMISSION_LOCKED';
  end if;
  if latest_version.application_version_id <> target_version.application_version_id
    or target_version.version_no <> p_expected_version
  then
    raise exception using errcode = 'PT409', message = 'STALE_VERSION';
  end if;

  select *
  into private_version
  from app.application_private_context_version private_record
  where private_record.private_context_version_id =
    target_version.private_context_version_id;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;
  full_draft :=
    target_version.content ||
    (private_version.content - 'purpose' - 'syntheticOnly');
  if not app.application_submission_is_complete(full_draft) then
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
    student_profile_version_id,
    private_context_version_id,
    school_directory_version_id,
    school_snapshot,
    final_submission_snapshot,
    submitted_by_user_id,
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
    target_version.student_profile_version_id,
    target_version.private_context_version_id,
    target_version.school_directory_version_id,
    target_version.school_snapshot,
    target_version.final_submission_snapshot,
    v_actor_id,
    true,
    statement_timestamp()
  );

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'application',
      full_draft || jsonb_build_object(
        'applicationId', target_version.application_id,
        'applicationVersionId', submitted_version_id,
        'studentProfileVersionId', target_version.student_profile_version_id,
        'privateContextVersionId', target_version.private_context_version_id,
        'version', target_version.version_no + 1,
        'supersedesId', target_version.application_version_id,
        'state', 'submitted',
        'contentHash', target_version.content_hash,
        'privateContextContentHash', private_version.content_hash,
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

create or replace function api.get_application_status(
  p_application_id uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  latest_version app.application_version%rowtype;
  status_projection jsonb;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_application_id is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select version_record.*
  into latest_version
  from app.application_version version_record
  where version_record.application_id = p_application_id
  order by version_record.version_no desc
  limit 1;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  if latest_version.state = 'draft' then
    status_projection := jsonb_build_object(
      'workflowStatus', 'application_draft',
      'displayLabelCode', 'STATUS_APPLICATION_DRAFT',
      'phase', 'application',
      'familyActionRequired', true,
      'nextActionCode', 'COMPLETE_APPLICATION',
      'deadline', null,
      'pendingReason', null,
      'claimBoundaryCode', 'ELIGIBILITY_NOT_ADMISSION'
    );
  elsif latest_version.state = 'submitted' then
    status_projection := jsonb_build_object(
      'workflowStatus', 'awaiting_assessment',
      'displayLabelCode', 'STATUS_AWAITING_ASSESSMENT',
      'phase', 'assessment',
      'familyActionRequired', false,
      'nextActionCode', 'AWAIT_ASSESSMENT',
      'deadline', null,
      'pendingReason', null,
      'claimBoundaryCode', 'ELIGIBILITY_NOT_ADMISSION'
    );
  else
    raise exception using errcode = 'PT409', message = 'INVALID_STATE_TRANSITION';
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', status_projection,
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', null,
      'idempotentReplay', false
    )
  );
end
$$;

reset role;

revoke execute on function api.save_application_draft(
  uuid,
  uuid,
  jsonb,
  integer,
  uuid,
  uuid
) from public, anon, service_role;
revoke execute on function api.get_application(uuid, uuid)
from public, anon, service_role;
revoke execute on function api.submit_application(uuid, integer, uuid, uuid)
from public, anon, service_role;
revoke execute on function api.get_application_status(uuid, uuid)
from public, anon, service_role;

grant execute on function api.save_application_draft(
  uuid,
  uuid,
  jsonb,
  integer,
  uuid,
  uuid
) to authenticated;
grant execute on function api.get_application(uuid, uuid) to authenticated;
grant execute on function api.submit_application(uuid, integer, uuid, uuid)
to authenticated;
grant execute on function api.get_application_status(uuid, uuid)
to authenticated;

comment on function api.save_application_draft(
  uuid,
  uuid,
  jsonb,
  integer,
  uuid,
  uuid
) is
  'Family-only D-013 draft save. Stores core/signed snapshots separately from support/disclosure and finance context, and binds exact profile/private versions.';
comment on function api.get_application(uuid, uuid) is
  'Family-only full reload/review projection; returns the exact profile and private context referenced by the latest application version.';
comment on function app.onboarding_decision_projection(jsonb) is
  'Structural firewall seam: emits only current/requested grade pathway fields. Identity, school prestige, support, finance, referral, and signature are absent.';
comment on function app.onboarding_decision_projection_hash(jsonb) is
  'SHA-256 commitment to the grade-only onboarding projection; this is not an eligibility result hash and must not be described as one.';
