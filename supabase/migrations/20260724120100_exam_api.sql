-- Adaptive screening instrument API (AX-04, D-016; serves R11).
-- SECURITY DEFINER RPCs on the `api` schema. The IRT/CAT math runs in the
-- Next.js server (@gt-selection/cat-engine); these RPCs read config/state and
-- persist responses, telemetry, abilities, and the final outcome. Proctor role
-- is `admissions_operator`. All rows born-synthetic.

set role app_owner;

create function app.exam_session_json(p_session_id uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'sessionId', s.session_id,
    'participantId', s.participant_id,
    'status', s.status,
    'ageBand', s.age_band,
    'policyVersion', s.policy_version,
    'startedAt', to_char(s.started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS') || 'Z',
    'abilities', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'domain', d.domain,
            'theta', d.theta,
            'se', d.se,
            'itemsAdministered', d.items_administered,
            'done', d.done
          )
          order by d.domain
        )
        from app.exam_session_domain d
        where d.session_id = s.session_id
      ),
      '[]'::jsonb
    )
  )
  from app.exam_session s
  where s.session_id = p_session_id
$$;

revoke execute on function app.exam_session_json(uuid)
  from public, anon, authenticated, service_role;

reset role;
grant execute on function app.exam_session_json(uuid) to api_executor;

set role api_executor;

-- Read the tunable policy config.
create function api.get_exam_policy(p_policy_version text, p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_config jsonb;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_policy_version is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select config into v_config from app.exam_policy where policy_version = p_policy_version;
  if v_config is null then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('policy', v_config),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', null,
      'idempotentReplay', false
    )
  );
end
$$;

-- List the item bank (with IRT parameters) for a policy's domains + age band.
-- IRT parameters are returned to the trusted server only; never to the browser.
create function api.list_exam_items(
  p_policy_version text,
  p_age_band text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_domains jsonb;
  v_items jsonb;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_policy_version is null or p_age_band is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select config -> 'domains' into v_domains
  from app.exam_policy
  where policy_version = p_policy_version;
  if v_domains is null then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'itemId', i.item_id,
        'typeCode', i.type_code,
        'domain', i.domain,
        'difficultyLevel', i.difficulty_level,
        'ageBands', to_jsonb(i.age_bands),
        'irt', jsonb_build_object(
          'a', i.irt_a,
          'b', i.irt_b,
          'c', i.irt_c,
          'model', i.irt_model
        ),
        'demoPath', qt.demo_path,
        'params', i.params,
        'syntheticOnly', true
      )
      order by i.domain, i.difficulty_level, i.item_id
    ),
    '[]'::jsonb
  )
  into v_items
  from app.exam_item i
  join app.exam_question_type qt on qt.type_code = i.type_code
  where i.domain in (select jsonb_array_elements_text(v_domains))
    and p_age_band = any (i.age_bands);

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('items', v_items),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', null,
      'idempotentReplay', false
    )
  );
end
$$;

-- Create a pseudonymous participant (idempotent by pseudonym code).
create function api.create_exam_participant(
  p_pseudonym_code text,
  p_age_band text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor uuid;
  v_participant app.exam_participant%rowtype;
begin
  perform app.bind_local_synthetic_principal();
  v_actor := app.current_user_id();
  if v_actor is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_pseudonym_code is null
    or p_pseudonym_code !~ '^PART-SYN-[A-Z0-9-]+$'
    or p_age_band not in ('K-1', '2-3', '4-5', '6-8')
    or p_correlation_id is null
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select * into v_participant
  from app.exam_participant
  where pseudonym_code = p_pseudonym_code and owner_user_id = v_actor;

  if not found then
    insert into app.exam_participant (participant_id, owner_user_id, pseudonym_code, age_band)
    values (extensions.gen_random_uuid(), v_actor, p_pseudonym_code, p_age_band)
    returning * into v_participant;
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'participant', jsonb_build_object(
        'participantId', v_participant.participant_id,
        'pseudonymCode', v_participant.pseudonym_code,
        'ageBand', v_participant.age_band,
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

-- Start a session and seed per-domain ability rows from the policy prior.
create function api.start_exam_session(
  p_participant_id uuid,
  p_policy_version text,
  p_idempotency_key uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor uuid;
  v_config jsonb;
  v_age_band text;
  v_prior_mean numeric;
  v_prior_sd numeric;
  v_session_id uuid;
  v_domain text;
  request_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  response_payload jsonb;
begin
  perform app.bind_local_synthetic_principal();
  v_actor := app.current_user_id();
  if v_actor is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_participant_id is null
    or p_policy_version is null
    or p_idempotency_key is null
    or p_correlation_id is null
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash := 'sha256:' || encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'participantId', p_participant_id,
          'policyVersion', p_policy_version
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':start_exam_session:' || p_idempotency_key::text, 0)
  );

  select * into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor
    and record.rpc_name = 'start_exam_session'
    and record.idempotency_key = p_idempotency_key;
  if found then
    if existing_idempotency.request_hash <> request_hash then
      raise exception using errcode = 'PT409', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_set(
      jsonb_set(existing_idempotency.response_payload, '{meta,idempotentReplay}', 'true'::jsonb),
      '{meta,correlationId}',
      to_jsonb(p_correlation_id::text)
    );
  end if;

  select config into v_config from app.exam_policy where policy_version = p_policy_version;
  if v_config is null then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;
  select age_band into v_age_band
  from app.exam_participant
  where participant_id = p_participant_id and owner_user_id = v_actor;
  if v_age_band is null then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  v_prior_mean := coalesce((v_config ->> 'priorMean')::numeric, 0);
  v_prior_sd := coalesce((v_config ->> 'priorSd')::numeric, 1);
  v_session_id := extensions.gen_random_uuid();

  insert into app.exam_session (session_id, owner_user_id, participant_id, policy_version, age_band)
  values (v_session_id, v_actor, p_participant_id, p_policy_version, v_age_band);

  for v_domain in select jsonb_array_elements_text(v_config -> 'domains') loop
    insert into app.exam_session_domain (session_id, owner_user_id, domain, theta, se)
    values (v_session_id, v_actor, v_domain, v_prior_mean, v_prior_sd);
  end loop;

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('session', app.exam_session_json(v_session_id)),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', p_idempotency_key,
      'idempotentReplay', false
    )
  );

  insert into app.idempotency_record (
    actor_id, rpc_name, idempotency_key, request_hash, response_payload, synthetic_only
  )
  values (v_actor, 'start_exam_session', p_idempotency_key, request_hash, response_payload, true);

  return response_payload;
end
$$;

-- Read full session state for reconstruction / results.
create function api.get_exam_session(p_session_id uuid, p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_exists boolean;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_session_id is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select true into v_exists
  from app.exam_session
  where session_id = p_session_id and owner_user_id = app.current_user_id();
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'session', app.exam_session_json(p_session_id),
      'responses', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'itemId', r.item_id,
              'domain', r.domain,
              'orderNo', r.order_no,
              'correct', r.correct,
              'score', r.score,
              'rtMs', r.rt_ms,
              'firstActionMs', r.first_action_ms,
              'revisions', r.revisions,
              'engaged', r.engaged,
              'measurements', r.measurements
            )
            order by r.order_no
          )
          from app.exam_item_response r
          where r.session_id = p_session_id
        ),
        '[]'::jsonb
      ),
      'outcome', (
        select jsonb_build_object(
          'compositeTheta', o.composite_theta,
          'fitIndex', o.fit_index,
          'engagementValid', o.engagement_valid,
          'decision', o.decision,
          'domainScores', o.domain_scores,
          'policyVersion', o.policy_version,
          'claimBoundary', o.claim_boundary,
          'syntheticOnly', true,
          'validated', false
        )
        from app.exam_session_outcome o
        where o.session_id = p_session_id
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

-- Persist one scored response + telemetry + engine-computed abilities, and (when
-- the session completes) the final outcome. Adaptive selection/scoring happen in
-- the server engine; this RPC is the durable write surface.
create function api.submit_exam_response(
  p_session_id uuid,
  p_response jsonb,
  p_telemetry jsonb,
  p_abilities jsonb,
  p_outcome jsonb,
  p_idempotency_key uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor uuid;
  v_status text;
  v_item_id uuid;
  v_domain text;
  v_order integer;
  request_hash text;
  existing_idempotency app.idempotency_record%rowtype;
  ability jsonb;
  response_payload jsonb;
begin
  perform app.bind_local_synthetic_principal();
  v_actor := app.current_user_id();
  if v_actor is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_session_id is null
    or p_response is null
    or p_idempotency_key is null
    or p_correlation_id is null
    or (p_response ->> 'itemId') is null
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash := 'sha256:' || encode(
    extensions.digest(
      convert_to(
        jsonb_build_object('sessionId', p_session_id, 'response', p_response)::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':submit_exam_response:' || p_idempotency_key::text, 0)
  );

  select * into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor
    and record.rpc_name = 'submit_exam_response'
    and record.idempotency_key = p_idempotency_key;
  if found then
    if existing_idempotency.request_hash <> request_hash then
      raise exception using errcode = 'PT409', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_set(
      jsonb_set(existing_idempotency.response_payload, '{meta,idempotentReplay}', 'true'::jsonb),
      '{meta,correlationId}',
      to_jsonb(p_correlation_id::text)
    );
  end if;

  select status into v_status
  from app.exam_session
  where session_id = p_session_id and owner_user_id = v_actor;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;
  if v_status <> 'active' then
    raise exception using errcode = 'PT409', message = 'SESSION_NOT_ACTIVE';
  end if;

  v_item_id := (p_response ->> 'itemId')::uuid;
  select domain into v_domain from app.exam_item where item_id = v_item_id;
  if v_domain is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select coalesce(max(order_no), 0) + 1 into v_order
  from app.exam_item_response
  where session_id = p_session_id;

  insert into app.exam_item_response (
    response_id, session_id, owner_user_id, item_id, domain, order_no,
    correct, score, rt_ms, first_action_ms, revisions, engaged, measurements
  )
  values (
    extensions.gen_random_uuid(), p_session_id, v_actor, v_item_id, v_domain, v_order,
    (p_response ->> 'correct')::boolean,
    (p_response ->> 'score')::numeric,
    (p_response ->> 'rtMs')::integer,
    (p_response ->> 'firstActionMs')::integer,
    coalesce((p_response ->> 'revisions')::integer, 0),
    coalesce((p_response ->> 'engaged')::boolean, true),
    coalesce(p_response -> 'measurements', '{}'::jsonb)
  );

  if p_telemetry is not null and jsonb_typeof(p_telemetry) = 'array' then
    insert into app.exam_telemetry_event (
      event_id, session_id, owner_user_id, item_id, kind, t_offset_ms, payload
    )
    select
      extensions.gen_random_uuid(),
      p_session_id,
      v_actor,
      nullif(event ->> 'itemId', '')::uuid,
      event ->> 'kind',
      (event ->> 'tOffsetMs')::integer,
      coalesce(event -> 'payload', '{}'::jsonb)
    from jsonb_array_elements(p_telemetry) event;
  end if;

  if p_abilities is not null and jsonb_typeof(p_abilities) = 'array' then
    for ability in select jsonb_array_elements(p_abilities) loop
      update app.exam_session_domain d
      set theta = (ability ->> 'theta')::numeric,
          se = (ability ->> 'se')::numeric,
          items_administered = (ability ->> 'itemsAdministered')::integer,
          done = (ability ->> 'done')::boolean
      where d.session_id = p_session_id and d.domain = (ability ->> 'domain');
    end loop;
  end if;

  if p_outcome is not null and p_outcome <> 'null'::jsonb then
    insert into app.exam_session_outcome (
      session_id, owner_user_id, composite_theta, fit_index, engagement_valid,
      decision, domain_scores, policy_version, claim_boundary
    )
    values (
      p_session_id, v_actor,
      (p_outcome ->> 'compositeTheta')::numeric,
      (p_outcome ->> 'fitIndex')::numeric,
      (p_outcome ->> 'engagementValid')::boolean,
      p_outcome ->> 'decision',
      p_outcome -> 'domainScores',
      p_outcome ->> 'policyVersion',
      p_outcome ->> 'claimBoundary'
    );
    update app.exam_session
    set status = 'completed', completed_at = statement_timestamp()
    where session_id = p_session_id;
  end if;

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('session', app.exam_session_json(p_session_id)),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', p_idempotency_key,
      'idempotentReplay', false
    )
  );

  insert into app.idempotency_record (
    actor_id, rpc_name, idempotency_key, request_hash, response_payload, synthetic_only
  )
  values (v_actor, 'submit_exam_response', p_idempotency_key, request_hash, response_payload, true);

  return response_payload;
end
$$;

reset role;

revoke execute on function api.get_exam_policy(text, uuid) from public, anon, service_role;
revoke execute on function api.list_exam_items(text, text, uuid) from public, anon, service_role;
revoke execute on function api.create_exam_participant(text, text, uuid) from public, anon, service_role;
revoke execute on function api.start_exam_session(uuid, text, uuid, uuid) from public, anon, service_role;
revoke execute on function api.get_exam_session(uuid, uuid) from public, anon, service_role;
revoke execute on function api.submit_exam_response(uuid, jsonb, jsonb, jsonb, jsonb, uuid, uuid)
  from public, anon, service_role;

grant execute on function api.get_exam_policy(text, uuid) to authenticated;
grant execute on function api.list_exam_items(text, text, uuid) to authenticated;
grant execute on function api.create_exam_participant(text, text, uuid) to authenticated;
grant execute on function api.start_exam_session(uuid, text, uuid, uuid) to authenticated;
grant execute on function api.get_exam_session(uuid, uuid) to authenticated;
grant execute on function api.submit_exam_response(uuid, jsonb, jsonb, jsonb, jsonb, uuid, uuid)
  to authenticated;
