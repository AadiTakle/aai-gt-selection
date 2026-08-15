set role api_executor;

create function api.get_application_status(
  p_application_id uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog
as $$
declare
  v_actor_id uuid := app.current_user_id();
  v_actor_role text := app.current_user_role();
  latest_version app.application_version%rowtype;
  status_projection jsonb;
begin
  if v_actor_id is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;

  if v_actor_role is distinct from 'family' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;

  if p_application_id is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  perform 1
  from app.application
  where application_id = p_application_id;

  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  select *
  into latest_version
  from app.application_version
  where application_id = p_application_id
  order by version_no desc
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

revoke execute on function api.get_application_status(uuid, uuid)
from public, anon, service_role;
grant execute on function api.get_application_status(uuid, uuid)
to authenticated;

comment on function api.get_application_status(uuid, uuid) is
  'Family-owned projection only; exposes no application content, raw scores, reviewer data, or audit records.';
