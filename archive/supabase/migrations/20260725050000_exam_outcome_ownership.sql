-- Single source of truth for selection and scoring (serves R11; BUILD_PLAN §3/§5/§6).
--
-- BUILD_PLAN already allocates ownership; this migration makes the database match it:
--   * §3 assigns the selection engine and the STOP RULE to `packages/exam-engine`.
--   * §5 assigns the final score (accuracy brackets, metric positioning) to `packages/exam-scoring`.
--   * §6 scopes `supabase/` to STORAGE plus RPCs. It never grants the database scoring authority.
--
-- WHAT THE DATABASE KEEPS (unchanged): the answer keys, per-item answer verification
-- (app.exam_score_response, behind a schema no client role can reach), the full trace
-- (responses + metrics + telemetry), and outcome STORAGE.
--
-- WHAT THE DATABASE GIVES UP:
--   1. It no longer auto-computes a competing outcome. api.exam_submit_response previously
--      called app.exam_compute_outcome when its stop rule fired, so one session could yield two
--      disagreeing scores for the same trace (the DB reported per-area proficiency as simply the
--      final adaptive difficulty; scorer.ts implements the §5 bracket-then-position contract).
--      Outcomes now arrive through api.exam_record_outcome and are stored VERBATIM.
--   2. It no longer decides when the battery ends. The previous rule was
--      `attempts >= minItemsPerArea and (attempts >= maxItemsPerArea or abs(delta) <= stableDelta)`
--      with seeded stepSize = 0.8 and stableDelta = 0.5. abs(delta) is 0.8 on a correct answer and
--      0.8 on a wrong one (0.4 only on a near miss), so the convergence branch was nearly
--      unreachable and every area ran to maxItemsPerArea, silently converting the REQUIRED
--      variable-length battery (BUILD_PLAN §0) into a fixed-length one. The stop rule now lives
--      where §3 puts it. The database retains only a hard safety cap (see `hardItemCap` below).
--
-- REVERSIBILITY: nothing is dropped. app.exam_compute_outcome and the difficulty-stepping logic
-- both remain callable; only the automatic call site and the convergence branch are removed. See
-- `supabase/EXAM_BACKEND_STATUS.md` §6 for the exact steps to reverse.
--
-- Recorded as decision D-019 (Proposed, not ratified). Born-synthetic throughout
-- (synthetic_only = true, validated = false).

set role app_owner;

-- --- Outcome storage grows the audit trail that verbatim storage requires ----------
-- The database stores a score it did not compute, so it must persist enough to recompute and
-- check that score from the trace: who scored it, under which scoring policy, and a hash of the
-- exact canonical inputs the scorer was given (derived server-side, never client-supplied).

alter table app.exam_session_outcome
  add column outcome_raw jsonb not null default '{}'::jsonb
    check (jsonb_typeof(outcome_raw) = 'object'),
  add column scorer_source text not null default 'app.exam_compute_outcome'
    check (char_length(scorer_source) between 1 and 120),
  add column scorer_version text check (scorer_version is null or char_length(scorer_version) between 1 and 120),
  add column scoring_policy_id text check (scoring_policy_id is null or char_length(scoring_policy_id) between 1 and 120),
  add column scorer_input_hash text check (scorer_input_hash is null or scorer_input_hash ~ '^sha256:[0-9a-f]{64}$'),
  add column scorer_input_count integer not null default 0 check (scorer_input_count >= 0);

comment on column app.exam_session_outcome.outcome_raw is
  'The scorer output stored VERBATIM (packages/exam-scoring ExamScore). The typed columns are a '
  'projection of this object for querying; this column is the authoritative record.';
comment on column app.exam_session_outcome.scorer_source is
  'Which implementation produced the score. ''packages/exam-scoring'' is the BUILD_PLAN §5 '
  'authority; ''app.exam_compute_outcome'' marks a row from the demoted in-database reference.';
comment on column app.exam_session_outcome.scorer_input_hash is
  'sha256 over app.exam_scorer_input_json(session_id), computed by the database at record time. '
  'Re-derive it later to prove the stored score still matches the stored trace.';

-- --- The canonical scorer input, derived from the stored trace ---------------------
-- Exactly the fields packages/exam-scoring consumes per item (ScoredItem), in administration
-- order. This is what makes a verbatim-stored score auditable: (trace, policy) -> score is pure,
-- so anyone can re-run scoreExam over this array and compare.

create function app.exam_scorer_input_json(p_session_id uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'itemId', r.item_id,
        'typeCode', r.type_code,
        'domain', r.domain,
        'difficulty', r.difficulty,
        'correct', r.correct,
        'score', r.score,
        'metrics', r.metrics
      )
      order by r.order_no
    ),
    '[]'::jsonb
  )
  from app.exam_item_response r
  where r.session_id = p_session_id
$$;

-- jsonb::text is canonical (sorted keys, normalised whitespace), so this hash is stable for a
-- given trace and reproducible by any reader of the same rows.
create function app.exam_scorer_input_hash(p_session_id uuid)
returns text
language sql
stable
set search_path = pg_catalog, extensions
as $$
  select 'sha256:' || encode(
    extensions.digest(
      convert_to(app.exam_scorer_input_json(p_session_id)::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  )
$$;

-- Single projection of a stored outcome, shared by every read path.
create function app.exam_outcome_json(p_session_id uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'compositeScore', o.composite_score,
    'areaScores', o.area_scores,
    'profile', o.profile,
    'policyVersion', o.policy_version,
    'claimBoundary', o.claim_boundary,
    'scoredBy', o.scorer_source,
    'scorerVersion', o.scorer_version,
    'scoringPolicyId', o.scoring_policy_id,
    'scorerInputHash', o.scorer_input_hash,
    'scorerInputCount', o.scorer_input_count,
    'scorerOutput', o.outcome_raw,
    'recordedAt', to_char(o.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS') || 'Z',
    'syntheticOnly', true,
    'validated', false
  )
  from app.exam_session_outcome o
  where o.session_id = p_session_id
$$;

-- --- Demote, do not delete --------------------------------------------------------

comment on function app.exam_compute_outcome(uuid) is
  'DEMOTED (D-019, Proposed): reference implementation only. NOT an authority and no longer '
  'auto-fired by api.exam_submit_response. It reports per-area proficiency as simply the final '
  'adaptive difficulty, which contradicts BUILD_PLAN §5 (accuracy sets the bracket, metrics '
  'position within it) and disagrees with packages/exam-scoring on the same trace. Retained so '
  'the decision is cheaply reversible: to restore database authority, re-add the '
  '`if v_session_done then v_outcome := app.exam_compute_outcome(p_session_id); end if;` call to '
  'api.exam_submit_response. Still revoked from every client role.';

comment on function app.exam_score_response(uuid, jsonb) is
  'RETAINED AUTHORITY: per-item answer verification against the server-only answer key. This is '
  'the reason the answer-key firewall (supabase/tests/121) is meaningful, and it does not move '
  'to the application tier.';

reset role;

grant execute on function app.exam_scorer_input_json(uuid) to api_executor;
grant execute on function app.exam_scorer_input_hash(uuid) to api_executor;
grant execute on function app.exam_outcome_json(uuid) to api_executor;

revoke execute on function app.exam_scorer_input_json(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_scorer_input_hash(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function app.exam_outcome_json(uuid)
  from public, anon, authenticated, service_role;

set role api_executor;

-- --- submit_response: verify + persist, but decide nothing -------------------------
-- Same signature, so existing grants and the PostgREST surface are unchanged. Two behavioural
-- changes: no outcome is computed, and the per-area convergence stop rule is gone.

create or replace function api.exam_submit_response(
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
  v_total integer;
  v_hard_cap integer;
  v_hard_cap_reached boolean;
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

  -- RETAINED AUTHORITY: verification against the server-only answer key.
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

  -- Per-area float difficulty: gradual ± (correctness x magnitude), clamped 1..20. RETAINED, but
  -- only as bookkeeping for the in-database FALLBACK selection in api.exam_get_next_item. The
  -- authoritative per-area estimate lives in packages/exam-engine (BUILD_PLAN §3).
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

  -- NO STOP DECISION HERE. `done` is left false for the engine to own; the removed rule
  -- (`attempts >= minItemsPerArea and (attempts >= maxItemsPerArea or abs(delta) <= stableDelta)`)
  -- could effectively never take its convergence branch, so it forced a fixed-length battery.
  v_state := v_state || jsonb_build_object(v_domain, jsonb_build_object(
    'difficulty', v_new_diff,
    'attemptCount', v_attempt,
    'correctCount', v_correct_count,
    'itemsSeen', v_attempt,
    'accWindow', v_acc,
    'metricCounts', v_metric_counts,
    'done', false
  ));

  select coalesce(items_administered, 0) + 1 into v_total
  from app.exam_session where session_id = p_session_id;

  -- HARD SAFETY CAP, NOT THE STOP RULE. This is a runaway guard: it bounds how many items one
  -- session can ever record so a looping or malicious caller cannot grow a trace without limit.
  -- It must sit ABOVE the engine's own hardItemCap so it never binds during a normal battery.
  -- Reaching it force-closes the session and means "something went wrong", NOT "adequate data
  -- was collected". Deciding that the battery is finished is packages/exam-engine's job
  -- (BUILD_PLAN §3: metric coverage, minItemsPerArea, even spread, estimate stability).
  v_hard_cap := coalesce((v_config ->> 'hardItemCap')::int, 120);
  v_hard_cap_reached := v_total >= v_hard_cap;

  update app.exam_session
     set area_state = v_state,
         items_administered = v_total,
         status = case when v_hard_cap_reached then 'completed' else status end,
         completed_at = case when v_hard_cap_reached then statement_timestamp() else completed_at end
   where session_id = p_session_id;

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
      'itemsAdministered', v_total,
      'hardItemCap', v_hard_cap,
      'hardCapReached', v_hard_cap_reached,
      'stopRuleOwner', 'packages/exam-engine',
      'session', app.exam_session_state_json(p_session_id)
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

-- --- The canonical scorer input, as a client-reachable read ------------------------
-- What a caller feeds to packages/exam-scoring `scoreExam`, plus the hash the database will
-- record. Fetching this instead of assembling a trace locally is what keeps the recorded
-- scorer_input_hash meaningful.

create function api.exam_get_scoring_inputs(p_session_id uuid, p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_actor uuid;
  v_status text;
  v_policy text;
  v_grade text;
  v_items jsonb;
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

  select s.status, s.policy_version, s.grade_band
    into v_status, v_policy, v_grade
  from app.exam_session s
  where s.session_id = p_session_id and s.owner_user_id = v_actor;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;

  v_items := app.exam_scorer_input_json(p_session_id);

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'sessionId', p_session_id,
      'status', v_status,
      'policyVersion', v_policy,
      'gradeBand', v_grade,
      'items', v_items,
      'itemCount', jsonb_array_length(v_items),
      'inputHash', app.exam_scorer_input_hash(p_session_id),
      'scoringOwner', 'packages/exam-scoring',
      'outcomeRecorded', exists (
        select 1 from app.exam_session_outcome o where o.session_id = p_session_id
      )
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
  );
end
$$;

-- --- Outcome persistence: store what packages/exam-scoring computed, verbatim ------
-- The database validates shape, ownership, and born-synthetic status; it does not re-derive or
-- adjust the score. Recording an outcome is the terminal act of a session and closes it, which is
-- how an engine-driven (variable-length) battery ends.

create function api.exam_record_outcome(
  p_session_id uuid,
  p_outcome jsonb,
  p_scoring_policy_id text,
  p_scorer_version text,
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
  v_policy text;
  v_composite numeric;
  v_area_scores jsonb;
  v_profile jsonb;
  v_claim text;
  v_input_count integer;
  v_input_hash text;
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
    or p_idempotency_key is null
    or p_correlation_id is null
    or p_outcome is null
    or jsonb_typeof(p_outcome) <> 'object'
    or jsonb_typeof(p_outcome -> 'perArea') is distinct from 'object'
    or jsonb_typeof(p_outcome -> 'profile') is distinct from 'object'
    or jsonb_typeof(p_outcome -> 'composite') is distinct from 'number'
    or p_scoring_policy_id is null
    or p_scoring_policy_id !~ '^[A-Za-z0-9._-]{1,120}$'
    or (p_scorer_version is not null and p_scorer_version !~ '^[A-Za-z0-9._+-]{1,120}$')
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;
  -- Born-synthetic is a storage precondition, not a courtesy flag.
  if coalesce((p_outcome ->> 'syntheticOnly')::boolean, false) is not true then
    raise exception using errcode = 'PT400', message = 'SYNTHETIC_ONLY_REQUIRED';
  end if;

  request_hash := 'sha256:' || encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'sessionId', p_session_id,
          'outcome', p_outcome,
          'scoringPolicyId', p_scoring_policy_id,
          'scorerVersion', p_scorer_version
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':exam_record_outcome:' || p_idempotency_key::text, 0)
  );

  select * into existing_idempotency
  from app.idempotency_record record
  where record.actor_id = v_actor
    and record.rpc_name = 'exam_record_outcome'
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

  select s.status, s.policy_version
    into v_status, v_policy
  from app.exam_session s
  where s.session_id = p_session_id and s.owner_user_id = v_actor;
  if not found then
    raise exception using errcode = 'PT404', message = 'RESOURCE_NOT_FOUND';
  end if;
  if v_status = 'abandoned' then
    raise exception using errcode = 'PT409', message = 'SESSION_NOT_ACTIVE';
  end if;

  perform 1 from app.exam_session_outcome where session_id = p_session_id;
  if found then
    raise exception using errcode = 'PT409', message = 'OUTCOME_ALREADY_RECORDED';
  end if;

  -- A score with no trace behind it cannot be audited, so it cannot be stored.
  v_input_count := jsonb_array_length(app.exam_scorer_input_json(p_session_id));
  if v_input_count = 0 then
    raise exception using errcode = 'PT409', message = 'SESSION_HAS_NO_RESPONSES';
  end if;
  v_input_hash := app.exam_scorer_input_hash(p_session_id);

  -- Typed columns are a PROJECTION of the verbatim object, for querying only.
  v_composite := (p_outcome ->> 'composite')::numeric;
  v_profile := p_outcome -> 'profile';
  select coalesce(jsonb_agg(area.value order by area.key), '[]'::jsonb)
    into v_area_scores
  from jsonb_each(p_outcome -> 'perArea') as area;

  v_claim := 'SYNTHETIC_SCREENER_PROTOTYPE: born-synthetic (validated=false); score computed by '
    || 'packages/exam-scoring (BUILD_PLAN §5) and stored verbatim; recomputable from the stored '
    || 'trace via app.exam_scorer_input_json; predictive validity NOT established; not an '
    || 'admissions decision.';

  insert into app.exam_session_outcome (
    session_id, owner_user_id, composite_score, area_scores, profile, policy_version,
    claim_boundary, outcome_raw, scorer_source, scorer_version, scoring_policy_id,
    scorer_input_hash, scorer_input_count
  )
  values (
    p_session_id, v_actor, v_composite, v_area_scores, v_profile, v_policy,
    v_claim, p_outcome, 'packages/exam-scoring', p_scorer_version, p_scoring_policy_id,
    v_input_hash, v_input_count
  );

  -- Recording the outcome ends the session. This is the engine-driven stop: the app asked the
  -- engine (BUILD_PLAN §3) whether the battery was done, scored the trace, and persisted it.
  update app.exam_session
     set status = 'completed',
         completed_at = coalesce(completed_at, statement_timestamp())
   where session_id = p_session_id;

  response_payload := jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'session', app.exam_session_state_json(p_session_id),
      'outcome', app.exam_outcome_json(p_session_id)
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
  values (v_actor, 'exam_record_outcome', p_idempotency_key, request_hash, response_payload, true);

  return response_payload;
end
$$;

-- --- Read paths pick up the verbatim outcome + its audit fields --------------------

create or replace function api.exam_get_session_state(p_session_id uuid, p_correlation_id uuid)
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
      'scorerInputHash', app.exam_scorer_input_hash(p_session_id),
      'outcome', app.exam_outcome_json(p_session_id)
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
  );
end
$$;

create or replace function api.exam_get_outcome(p_session_id uuid, p_correlation_id uuid)
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

  v_outcome := app.exam_outcome_json(p_session_id);

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'status', v_status,
      -- `complete` now means "an outcome has been recorded", never "the database scored it".
      'complete', v_outcome is not null,
      'outcome', v_outcome
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', false)
  );
end
$$;

comment on function api.exam_get_next_item(uuid, uuid) is
  'FALLBACK selection only (D-019, Proposed). BUILD_PLAN §3 assigns selection to '
  'packages/exam-engine, whose seeded RNG and tie-breaking differ from this ordering CTE. Use it '
  'for a database-only smoke path; do not mix it with engine-driven selection in one session, or '
  'the two will serve different sequences from identical state.';

reset role;

revoke execute on function api.exam_get_scoring_inputs(uuid, uuid)
  from public, anon, service_role;
revoke execute on function api.exam_record_outcome(uuid, jsonb, text, text, uuid, uuid)
  from public, anon, service_role;

grant execute on function api.exam_get_scoring_inputs(uuid, uuid) to authenticated;
grant execute on function api.exam_record_outcome(uuid, jsonb, text, text, uuid, uuid) to authenticated;

-- --- Retire the dead policy knobs --------------------------------------------------
-- `minItemsPerArea`, `maxItemsPerArea`, and `stableDelta` were read ONLY by the stop rule that
-- this migration removes, so they are now dead. `stableDelta` (0.5) was also the broken half of
-- the pair: convergence required abs(delta) <= stableDelta while stepSize (0.8) made abs(delta)
-- 0.8 or 0.4, so the branch was nearly unreachable. Rather than retune a knob nothing reads, the
-- knobs are removed; minItemsPerArea and the stability thresholds live in packages/exam-engine.
-- `stepSize` STAYS because it is still live: it drives the per-area difficulty bookkeeping that
-- feeds the fallback selection. `maxItems` (40) is replaced by `hardItemCap` (120) — renamed
-- because it is a runaway guard, not a battery length, and raised so it sits well above the
-- engine's own hardItemCap (60) and can never truncate a legitimate engine-driven battery.
-- Runs unprivileged of RLS as the migration superuser, matching the seed migration.
update app.exam_policy
   set config = (config - 'minItemsPerArea' - 'maxItemsPerArea' - 'stableDelta' - 'maxItems')
     || jsonb_build_object(
          'hardItemCap', 120,
          'stopRuleOwner', 'packages/exam-engine',
          'scoringOwner', 'packages/exam-scoring'
        )
 where policy_version = 'exam-syn-v1';
