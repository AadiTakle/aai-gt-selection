-- Adaptive K-8 screener API (serves R11; BUILD_PLAN §1/§3/§5).
-- SECURITY DEFINER RPCs on the `api` schema, owned by api_executor. Unlike the
-- harvested base (which kept the CAT math in the Next.js server), this backend is
-- SELF-CONTAINED and SERVER-AUTHORITATIVE:
--   * get_next_item runs the adaptive selection (even area spread + metric-coverage +
--     age-band preference + nearest float difficulty) and returns a ServedItem with NO key.
--   * submit_response VERIFIES the raw answer against the server-only answer_key, computes a
--     deterministic score, persists the response + full telemetry, updates the per-area float
--     difficulty, and (when the stop rule fires) computes the score + profile outcome.
-- All rows are born-synthetic. Proctor persona is the `admissions_operator` role.
-- Reuses app.bind_local_synthetic_principal(), app.current_user_id/role(),
-- app.idempotency_record, and the PTxxx error-code envelope from earlier migrations.

set role app_owner;

-- Served projection of a bank item: excludes answer_key / scoring / provenance.
create function app.exam_served_item_json(p_item_id uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'itemId', i.item_id,
    'typeCode', i.type_code,
    'domain', i.domain,
    'difficulty', i.difficulty,
    'ageBands', to_jsonb(i.age_bands),
    'content', i.content,
    'demoPath', qt.demo_path,
    'syntheticOnly', true,
    'validated', false
  )
  from app.exam_item i
  join app.exam_question_type qt on qt.type_code = i.type_code
  where i.item_id = p_item_id
$$;

-- Reconstructable session state (per-area float difficulty + counts live in area_state).
create function app.exam_session_state_json(p_session_id uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'sessionId', s.session_id,
    'participantId', s.participant_id,
    'policyVersion', s.policy_version,
    'gradeBand', s.grade_band,
    'status', s.status,
    'itemsAdministered', s.items_administered,
    'areaState', s.area_state,
    'startedAt', to_char(s.started_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS') || 'Z',
    'completedAt', case
      when s.completed_at is null then null
      else to_char(s.completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS') || 'Z'
    end,
    'syntheticOnly', true,
    'validated', false
  )
  from app.exam_session s
  where s.session_id = p_session_id
$$;

-- SERVER-ONLY deterministic scoring. Reads the item's answer_key + scoring rule and
-- returns {correct, score, mode}. The key itself is never returned or logged.
create function app.exam_score_response(p_item_id uuid, p_raw_answer jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog
as $$
declare
  v_mode text;
  v_answer_key jsonb;
  v_correct boolean := false;
  v_score numeric := 0;
  v_submitted text;
begin
  select coalesce(i.scoring ->> 'mode', 'deterministic_key'), i.answer_key
    into v_mode, v_answer_key
  from app.exam_item i
  where i.item_id = p_item_id;

  if not found then
    return jsonb_build_object('correct', false, 'score', 0, 'mode', 'unknown');
  end if;

  if v_mode in ('deterministic_key', 'proxy_bank') then
    v_submitted := coalesce(
      p_raw_answer ->> 'key',
      p_raw_answer ->> 'selectedKey',
      p_raw_answer ->> 'value',
      case when jsonb_typeof(p_raw_answer) = 'string' then (p_raw_answer #>> '{}') end
    );
    v_correct := v_submitted is not null
      and v_submitted is not distinct from (v_answer_key ->> 'correctKey');
  elsif v_mode = 'computed_solver' then
    v_correct := (p_raw_answer -> 'value') is not null
      and (p_raw_answer -> 'value') is not distinct from (v_answer_key -> 'solution');
  else
    -- model_judge_deferred / unknown: no deterministic verification yet (tracked-inert).
    v_correct := false;
  end if;

  v_score := case when v_correct then 1 else 0 end;
  return jsonb_build_object('correct', v_correct, 'score', v_score, 'mode', v_mode);
end
$$;

-- Deterministic score + per-area profile (BUILD_PLAN §5). Idempotent: inserts the
-- outcome once and returns it. Reads the (already-updated) area_state and the trace.
-- Carries NO admit/defer/retry decision.
create function app.exam_compute_outcome(p_session_id uuid)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_actor uuid;
  v_config jsonb;
  v_state jsonb;
  v_policy text;
  v_area_scores jsonb;
  v_composite numeric;
  v_profile jsonb;
  v_claim text;
begin
  v_actor := app.current_user_id();

  select o.composite_score, o.area_scores, o.profile, o.policy_version, o.claim_boundary
    into v_composite, v_area_scores, v_profile, v_policy, v_claim
  from app.exam_session_outcome o
  where o.session_id = p_session_id;
  if found then
    return jsonb_build_object(
      'compositeScore', v_composite, 'areaScores', v_area_scores, 'profile', v_profile,
      'policyVersion', v_policy, 'claimBoundary', v_claim, 'syntheticOnly', true, 'validated', false
    );
  end if;

  select s.area_state, s.policy_version, p.config
    into v_state, v_policy, v_config
  from app.exam_session s
  join app.exam_policy p on p.policy_version = s.policy_version
  where s.session_id = p_session_id;

  select
    coalesce(jsonb_agg(ar.area_obj order by ar.ord), '[]'::jsonb),
    case when sum(ar.w) > 0 then round(sum(ar.prof * ar.w) / sum(ar.w), 3) else 0 end
  into v_area_scores, v_composite
  from (
    select
      d.ord,
      coalesce((v_config -> 'areaWeights' ->> d.domain)::numeric, 1) as w,
      round(coalesce((v_state -> d.domain ->> 'difficulty')::numeric, 1), 2) as prof,
      jsonb_build_object(
        'domain', d.domain,
        'proficiency', round(coalesce((v_state -> d.domain ->> 'difficulty')::numeric, 1), 2),
        'attempts', coalesce((v_state -> d.domain ->> 'attemptCount')::int, 0),
        'correct', coalesce((v_state -> d.domain ->> 'correctCount')::int, 0),
        'accuracy', case
          when coalesce((v_state -> d.domain ->> 'attemptCount')::int, 0) > 0
          then round(
                 coalesce((v_state -> d.domain ->> 'correctCount')::numeric, 0)
                 / nullif((v_state -> d.domain ->> 'attemptCount')::numeric, 0), 4)
          else 0 end,
        'reached', coalesce((
          select max(r.difficulty) from app.exam_item_response r
          where r.session_id = p_session_id and r.domain = d.domain and r.correct), 0),
        'metricCoverage', coalesce(v_state -> d.domain -> 'metricCounts', '{}'::jsonb)
      ) as area_obj
    from jsonb_array_elements_text(v_config -> 'domains') with ordinality as d(domain, ord)
  ) ar;

  select jsonb_build_object(
      'strengths', coalesce(jsonb_agg((a ->> 'domain') order by (a ->> 'proficiency')::numeric desc), '[]'::jsonb),
      'areaProficiency', v_area_scores,
      'note', 'Deterministic screener profile; strengths ordered by provisional proficiency. No decision label.'
    )
    into v_profile
  from jsonb_array_elements(v_area_scores) a;

  v_claim := 'SYNTHETIC_SCREENER_PROTOTYPE: born-synthetic (validated=false); deterministic and '
    || 'reproducible from the stored trace; predictive validity NOT established; not an admissions decision.';

  insert into app.exam_session_outcome (
    session_id, owner_user_id, composite_score, area_scores, profile, policy_version, claim_boundary
  )
  values (
    p_session_id, v_actor, coalesce(v_composite, 0), coalesce(v_area_scores, '[]'::jsonb),
    coalesce(v_profile, '{}'::jsonb), v_policy, v_claim
  );

  return jsonb_build_object(
    'compositeScore', coalesce(v_composite, 0),
    'areaScores', coalesce(v_area_scores, '[]'::jsonb),
    'profile', coalesce(v_profile, '{}'::jsonb),
    'policyVersion', v_policy,
    'claimBoundary', v_claim,
    'syntheticOnly', true,
    'validated', false
  );
end
$$;

revoke execute on function app.exam_served_item_json(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_session_state_json(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_score_response(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_compute_outcome(uuid)
  from public, anon, authenticated, service_role;

reset role;

grant execute on function app.exam_served_item_json(uuid) to api_executor;
grant execute on function app.exam_session_state_json(uuid) to api_executor;
grant execute on function app.exam_score_response(uuid, jsonb) to api_executor;
grant execute on function app.exam_compute_outcome(uuid) to api_executor;

set role api_executor;

-- Create a pseudonymous participant (idempotent by pseudonym code + owner).
create function api.exam_create_participant(
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
    'data', jsonb_build_object('participant', jsonb_build_object(
      'participantId', v_participant.participant_id,
      'pseudonymCode', v_participant.pseudonym_code,
      'ageBand', v_participant.age_band,
      'syntheticOnly', true
    )),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false
    )
  );
end
$$;

-- List the served item bank for a policy's domains + age band. Never returns keys.
create function api.exam_list_items(
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
  if p_policy_version is null
    or p_age_band not in ('K-1', '2-3', '4-5', '6-8')
    or p_correlation_id is null
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select config -> 'domains' into v_domains
  from app.exam_policy where policy_version = p_policy_version;
  if v_domains is null then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  select coalesce(
    jsonb_agg(app.exam_served_item_json(i.item_id) order by i.domain, i.difficulty, i.item_id),
    '[]'::jsonb
  )
  into v_items
  from app.exam_item i
  where i.synthetic_only
    and i.domain in (select jsonb_array_elements_text(v_domains))
    and p_age_band = any (i.age_bands);

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('items', v_items),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false
    )
  );
end
$$;

-- Start a session; seed per-area float difficulty from the requested grade band.
create function api.exam_start_session(
  p_participant_id uuid,
  p_policy_version text,
  p_grade_band text,
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
  v_start numeric;
  v_session_id uuid;
  v_domain text;
  v_state jsonb := '{}'::jsonb;
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
    or p_grade_band not in ('K-1', '2-3', '4-5', '6-8')
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
          'policyVersion', p_policy_version,
          'gradeBand', p_grade_band
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':exam_start_session:' || p_idempotency_key::text, 0)
  );

  select * into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor
    and record.rpc_name = 'exam_start_session'
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

  perform 1 from app.exam_participant
  where participant_id = p_participant_id and owner_user_id = v_actor;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  v_start := coalesce(
    (v_config #>> array['gradeStart', p_grade_band])::numeric,
    case p_grade_band
      when 'K-1' then 2.5
      when '2-3' then 6
      when '4-5' then 10
      when '6-8' then 14
      else 6
    end
  );
  v_start := least(20, greatest(1, v_start));

  for v_domain in select jsonb_array_elements_text(v_config -> 'domains') loop
    v_state := v_state || jsonb_build_object(v_domain, jsonb_build_object(
      'difficulty', v_start,
      'attemptCount', 0,
      'correctCount', 0,
      'itemsSeen', 0,
      'accWindow', '[]'::jsonb,
      'metricCounts', '{}'::jsonb,
      'done', false
    ));
  end loop;

  v_session_id := extensions.gen_random_uuid();
  insert into app.exam_session (
    session_id, owner_user_id, participant_id, policy_version, grade_band, area_state
  )
  values (v_session_id, v_actor, p_participant_id, p_policy_version, p_grade_band, v_state);

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object('session', app.exam_session_state_json(v_session_id)),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', p_idempotency_key,
      'idempotentReplay', false
    )
  );

  insert into app.idempotency_record (
    actor_id, rpc_name, idempotency_key, request_hash, response_payload, synthetic_only
  )
  values (v_actor, 'exam_start_session', p_idempotency_key, request_hash, response_payload, true);

  return response_payload;
end
$$;

-- Adaptive selection: return the next ServedItem (no key) for an active session, or
-- signal completion. Side-effect free; "seen" is derived from recorded responses.
create function api.exam_get_next_item(p_session_id uuid, p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor uuid;
  v_config jsonb;
  v_state jsonb;
  v_grade text;
  v_status text;
  v_item_id uuid;
  v_area text;
  v_target numeric;
begin
  perform app.bind_local_synthetic_principal();
  v_actor := app.current_user_id();
  if v_actor is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_session_id is null or p_correlation_id is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  select s.area_state, s.grade_band, s.status, p.config
    into v_state, v_grade, v_status, v_config
  from app.exam_session s
  join app.exam_policy p on p.policy_version = s.policy_version
  where s.session_id = p_session_id and s.owner_user_id = v_actor;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  if v_status <> 'active' then
    return jsonb_build_object(
      'apiVersion', 'v1', 'syntheticOnly', true,
      'data', jsonb_build_object('item', null, 'done', true, 'reason', 'session_' || v_status),
      'meta', jsonb_build_object(
        'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
    );
  end if;

  with areas as (
    select
      d.domain,
      d.ord,
      coalesce((v_state -> d.domain ->> 'attemptCount')::int, 0) as attempts,
      coalesce((v_state -> d.domain ->> 'done')::boolean, false) as done,
      coalesce((v_state -> d.domain ->> 'difficulty')::numeric, 6) as diff
    from jsonb_array_elements_text(v_config -> 'domains') with ordinality as d(domain, ord)
  ),
  cand as (
    select
      a.domain,
      a.attempts,
      a.ord,
      a.diff as area_diff,
      i.item_id,
      (case when v_grade = any (i.age_bands) then 0 else 1 end) as band_rank,
      abs(i.difficulty - a.diff) as diff_gap,
      (
        select count(*) from unnest(qt.metric_ids) m
        where coalesce((v_state -> a.domain -> 'metricCounts' ->> m)::int, 0) = 0
      ) as coverage_bonus
    from areas a
    join app.exam_item i on i.domain = a.domain and i.synthetic_only
    join app.exam_question_type qt on qt.type_code = i.type_code
    where not a.done
      and not exists (
        select 1 from app.exam_item_response r
        where r.session_id = p_session_id and r.item_id = i.item_id
      )
  )
  select cand.item_id, cand.domain, cand.area_diff
    into v_item_id, v_area, v_target
  from cand
  order by cand.attempts asc, cand.ord asc, cand.band_rank asc,
           cand.coverage_bonus desc, cand.diff_gap asc, cand.item_id asc
  limit 1;

  if v_item_id is null then
    return jsonb_build_object(
      'apiVersion', 'v1', 'syntheticOnly', true,
      'data', jsonb_build_object('item', null, 'done', true, 'reason', 'bank_exhausted_or_complete'),
      'meta', jsonb_build_object(
        'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
    );
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1', 'syntheticOnly', true,
    'data', jsonb_build_object(
      'item', app.exam_served_item_json(v_item_id),
      'done', false,
      'area', v_area,
      'targetDifficulty', v_target
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
  );
end
$$;

-- Server verifies + scores + persists one response, its telemetry trace, and the updated
-- per-area float difficulty; computes the outcome when the stop rule fires. Idempotent.
create function api.exam_submit_response(
  p_session_id uuid,
  p_item_id uuid,
  p_raw_answer jsonb,
  p_metrics jsonb,
  p_telemetry jsonb,
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
  v_config jsonb;
  v_state jsonb;
  v_domain text;
  v_type text;
  v_difficulty numeric;
  v_order integer;
  v_response_id uuid;
  v_scored jsonb;
  v_correct boolean;
  v_score numeric;
  v_metrics jsonb;
  v_area jsonb;
  v_area_diff numeric;
  v_step numeric;
  v_errtype numeric;
  v_delta numeric;
  v_new_diff numeric;
  v_attempt integer;
  v_correct_count integer;
  v_acc jsonb;
  v_metric_counts jsonb;
  v_min integer;
  v_max_area integer;
  v_max_items integer;
  v_stable numeric;
  v_area_done boolean;
  v_total integer;
  v_all_done boolean;
  v_session_done boolean;
  v_outcome jsonb;
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
  if p_session_id is null
    or p_item_id is null
    or p_raw_answer is null
    or jsonb_typeof(p_raw_answer) not in ('object', 'array', 'string', 'number', 'boolean')
    or p_idempotency_key is null
    or p_correlation_id is null
    or (p_metrics is not null and jsonb_typeof(p_metrics) <> 'object')
    or (p_telemetry is not null and jsonb_typeof(p_telemetry) <> 'array')
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  request_hash := 'sha256:' || encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'sessionId', p_session_id, 'itemId', p_item_id, 'rawAnswer', p_raw_answer
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':exam_submit_response:' || p_idempotency_key::text, 0)
  );

  select * into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor
    and record.rpc_name = 'exam_submit_response'
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

  select s.status, s.area_state, p.config
    into v_status, v_state, v_config
  from app.exam_session s
  join app.exam_policy p on p.policy_version = s.policy_version
  where s.session_id = p_session_id and s.owner_user_id = v_actor;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;
  if v_status <> 'active' then
    raise exception using errcode = 'PT409', message = 'SESSION_NOT_ACTIVE';
  end if;

  select i.domain, i.type_code, i.difficulty
    into v_domain, v_type, v_difficulty
  from app.exam_item i
  where i.item_id = p_item_id and i.synthetic_only;
  if v_domain is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;
  if not (v_state ? v_domain) then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  perform 1 from app.exam_item_response
  where session_id = p_session_id and item_id = p_item_id;
  if found then
    raise exception using errcode = 'PT409', message = 'ITEM_ALREADY_ANSWERED';
  end if;

  -- SERVER-AUTHORITATIVE verification + scoring.
  v_scored := app.exam_score_response(p_item_id, p_raw_answer);
  v_correct := (v_scored ->> 'correct')::boolean;
  v_score := (v_scored ->> 'score')::numeric;

  -- Merge client-tracked metrics with server-authoritative ones (client cannot set correctness).
  v_metrics := coalesce(p_metrics, '{}'::jsonb) || jsonb_build_object('M-ACC', v_score);
  if v_correct then
    v_metrics := v_metrics || jsonb_build_object('M-DIFFREACH', v_difficulty);
  end if;

  select coalesce(max(order_no), 0) + 1 into v_order
  from app.exam_item_response where session_id = p_session_id;

  v_response_id := extensions.gen_random_uuid();
  insert into app.exam_item_response (
    response_id, session_id, owner_user_id, item_id, type_code, domain, order_no,
    difficulty, raw_answer, correct, score, metrics
  )
  values (
    v_response_id, p_session_id, v_actor, p_item_id, v_type, v_domain, v_order,
    v_difficulty, p_raw_answer, v_correct, v_score, v_metrics
  );

  -- Full telemetry trace (append-only), linked to the scored response.
  if p_telemetry is not null then
    insert into app.exam_telemetry_event (
      event_id, session_id, owner_user_id, item_id, response_id, kind, seq, t_offset_ms, payload
    )
    select
      extensions.gen_random_uuid(),
      p_session_id,
      v_actor,
      coalesce(nullif(ev ->> 'itemId', '')::uuid, p_item_id),
      v_response_id,
      coalesce(nullif(ev ->> 'kind', ''), 'event'),
      nullif(ev ->> 'seq', '')::integer,
      coalesce((ev ->> 'tOffsetMs')::integer, 0),
      coalesce(ev -> 'payload', '{}'::jsonb)
    from jsonb_array_elements(p_telemetry) ev;
  end if;

  -- Update per-area float difficulty: gradual ± (correctness x magnitude), clamped 1..20.
  v_area := v_state -> v_domain;
  v_area_diff := coalesce((v_area ->> 'difficulty')::numeric, 6);
  v_step := coalesce((v_config ->> 'stepSize')::numeric, 0.8);
  v_errtype := coalesce((v_metrics ->> 'M-ERRTYPE')::numeric, 0);  -- 1 = near miss softens a drop
  if v_correct then
    v_delta := v_step * (1 + greatest(0, v_difficulty - v_area_diff) * 0.10);
  else
    v_delta := -1 * v_step * (1 - 0.5 * least(1, greatest(0, v_errtype)));
  end if;
  v_new_diff := round(least(20, greatest(1, v_area_diff + v_delta)), 4);

  v_attempt := coalesce((v_area ->> 'attemptCount')::int, 0) + 1;
  v_correct_count := coalesce((v_area ->> 'correctCount')::int, 0) + case when v_correct then 1 else 0 end;
  v_acc := coalesce(v_area -> 'accWindow', '[]'::jsonb) || to_jsonb(v_score);

  v_metric_counts := coalesce(v_area -> 'metricCounts', '{}'::jsonb);
  v_metric_counts := v_metric_counts || coalesce((
    select jsonb_object_agg(mk.metric_key, coalesce((v_metric_counts ->> mk.metric_key)::int, 0) + 1)
    from jsonb_object_keys(v_metrics) as mk(metric_key)
  ), '{}'::jsonb);

  v_min := coalesce((v_config ->> 'minItemsPerArea')::int, 3);
  v_max_area := coalesce((v_config ->> 'maxItemsPerArea')::int, 8);
  v_stable := coalesce((v_config ->> 'stableDelta')::numeric, 0.5);
  v_area_done := (v_attempt >= v_min) and (v_attempt >= v_max_area or abs(v_delta) <= v_stable);

  v_state := v_state || jsonb_build_object(v_domain, jsonb_build_object(
    'difficulty', v_new_diff,
    'attemptCount', v_attempt,
    'correctCount', v_correct_count,
    'itemsSeen', v_attempt,
    'accWindow', v_acc,
    'metricCounts', v_metric_counts,
    'done', v_area_done
  ));

  select coalesce(items_administered, 0) + 1 into v_total
  from app.exam_session where session_id = p_session_id;
  v_max_items := coalesce((v_config ->> 'maxItems')::int, 40);

  select coalesce(bool_and(coalesce((v_state -> dom.domain ->> 'done')::boolean, false)), false)
    into v_all_done
  from jsonb_array_elements_text(v_config -> 'domains') as dom(domain);
  v_session_done := v_all_done or v_total >= v_max_items;

  update app.exam_session
     set area_state = v_state,
         items_administered = v_total,
         status = case when v_session_done then 'completed' else status end,
         completed_at = case when v_session_done then statement_timestamp() else completed_at end
   where session_id = p_session_id;

  if v_session_done then
    v_outcome := app.exam_compute_outcome(p_session_id);
  end if;

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'scored', jsonb_build_object(
        'itemId', p_item_id,
        'typeCode', v_type,
        'domain', v_domain,
        'orderNo', v_order,
        'difficulty', v_difficulty,
        'correct', v_correct,
        'score', v_score,
        'metrics', v_metrics
      ),
      'done', v_session_done,
      'session', app.exam_session_state_json(p_session_id),
      'outcome', v_outcome
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id,
      'idempotencyKey', p_idempotency_key,
      'idempotentReplay', false
    )
  );

  insert into app.idempotency_record (
    actor_id, rpc_name, idempotency_key, request_hash, response_payload, synthetic_only
  )
  values (v_actor, 'exam_submit_response', p_idempotency_key, request_hash, response_payload, true);

  return response_payload;
end
$$;

-- Full session state for reconstruction / mid-test resume: session + trace + outcome.
create function api.exam_get_session_state(p_session_id uuid, p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
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

  perform 1 from app.exam_session
  where session_id = p_session_id and owner_user_id = app.current_user_id();
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'session', app.exam_session_state_json(p_session_id),
      'responses', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'itemId', r.item_id,
            'typeCode', r.type_code,
            'domain', r.domain,
            'orderNo', r.order_no,
            'difficulty', r.difficulty,
            'correct', r.correct,
            'score', r.score,
            'metrics', r.metrics,
            'rawAnswer', r.raw_answer
          )
          order by r.order_no
        )
        from app.exam_item_response r
        where r.session_id = p_session_id
      ), '[]'::jsonb),
      'telemetryCount', (
        select count(*) from app.exam_telemetry_event where session_id = p_session_id
      ),
      'outcome', (
        select jsonb_build_object(
          'compositeScore', o.composite_score,
          'areaScores', o.area_scores,
          'profile', o.profile,
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
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
  );
end
$$;

-- Read the computed outcome (score + profile). Returns a pending shape until complete.
create function api.exam_get_outcome(p_session_id uuid, p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_status text;
  v_outcome jsonb;
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

  select status into v_status
  from app.exam_session
  where session_id = p_session_id and owner_user_id = app.current_user_id();
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  select jsonb_build_object(
    'compositeScore', o.composite_score,
    'areaScores', o.area_scores,
    'profile', o.profile,
    'policyVersion', o.policy_version,
    'claimBoundary', o.claim_boundary,
    'syntheticOnly', true,
    'validated', false
  )
  into v_outcome
  from app.exam_session_outcome o
  where o.session_id = p_session_id;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'status', v_status,
      'complete', v_outcome is not null,
      'outcome', v_outcome
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
  );
end
$$;

reset role;

revoke execute on function api.exam_create_participant(text, text, uuid)
  from public, anon, service_role;
revoke execute on function api.exam_list_items(text, text, uuid)
  from public, anon, service_role;
revoke execute on function api.exam_start_session(uuid, text, text, uuid, uuid)
  from public, anon, service_role;
revoke execute on function api.exam_get_next_item(uuid, uuid)
  from public, anon, service_role;
revoke execute on function api.exam_submit_response(uuid, uuid, jsonb, jsonb, jsonb, uuid, uuid)
  from public, anon, service_role;
revoke execute on function api.exam_get_session_state(uuid, uuid)
  from public, anon, service_role;
revoke execute on function api.exam_get_outcome(uuid, uuid)
  from public, anon, service_role;

grant execute on function api.exam_create_participant(text, text, uuid) to authenticated;
grant execute on function api.exam_list_items(text, text, uuid) to authenticated;
grant execute on function api.exam_start_session(uuid, text, text, uuid, uuid) to authenticated;
grant execute on function api.exam_get_next_item(uuid, uuid) to authenticated;
grant execute on function api.exam_submit_response(uuid, uuid, jsonb, jsonb, jsonb, uuid, uuid) to authenticated;
grant execute on function api.exam_get_session_state(uuid, uuid) to authenticated;
grant execute on function api.exam_get_outcome(uuid, uuid) to authenticated;
