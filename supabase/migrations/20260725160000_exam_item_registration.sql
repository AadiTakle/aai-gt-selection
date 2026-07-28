-- Register a served bank item so a real session can be traced (serves R7/R11; BUILD_PLAN §6).
--
-- WHY THIS EXISTS. `api.exam_submit_response` records a response against
-- `app.exam_item.item_id`, and raises PT400 when the item is unknown. The only items in
-- `app.exam_item` are the 80 placeholder rows from `20260724130200_exam_adaptive_seed.sql`,
-- whose ids are generated at migration time. The runner serves from the 63 generated banks
-- in `research/exam-question-types/banks/`, which carry their own item ids. Those two sets
-- are disjoint, so before this migration NOT ONE real served item could be recorded and no
-- exam trace could be persisted at all.
--
-- WHAT THIS IS NOT. It is not a second selection path, not a scoring path, and not a
-- relaxation of the answer-key firewall. The registered key lands in
-- `app.exam_item.answer_key`, which is revoked from every client role and excluded from
-- `app.exam_served_item_json`; the answer never becomes reachable from a browser. D-019's
-- split is unchanged: the database still holds the keys and still verifies each response
-- through `app.exam_score_response`, and `packages/exam-engine` / `packages/exam-scoring`
-- still own selection and the final score.
--
-- ALTERNATIVE CONSIDERED: bulk-load all 7,900 bank items in a migration (or an ops script)
-- so the database owns the whole bank up front, as BUILD_PLAN §6 describes. Rejected for
-- this change: it is ~22 MB of generated content, it makes persistence depend on an
-- out-of-band load step that must be re-run whenever a bank is regenerated, and bank
-- syncing is a separate workstream. Lazy registration records exactly the items a session
-- actually served, which is what the trace needs. The bulk load remains available and this
-- RPC is a no-op for an item that is already present, so the two do not conflict.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false).

set role app_owner;

-- --- Type codes: match the vocabulary the banks actually use (D-020(a)) ------------
-- The original check required an all-caps middle segment. Eleven wired types use a
-- mixed-case one (CX-check-01, WM-bubble-01, ...), which D-020(a) ratifies as the
-- catalog's vocabulary. Widened rather than renamed, per D-020's rejected alternative (4).
alter table app.exam_question_type
  drop constraint if exists exam_question_type_type_code_check;
alter table app.exam_question_type
  add constraint exam_question_type_type_code_check
  check (type_code ~ '^[A-Z]+-[A-Za-z0-9]+-[0-9]+$');

-- --- Write policies for the two bank tables ----------------------------------------
-- RLS is FORCED on these tables, so a SECURITY DEFINER function cannot insert without a
-- policy even though it runs as the owning role. Insert only, never update or delete: the
-- bank stays append-only, so a registered item's key can never be rewritten mid-session.
create policy exam_question_type_insert on app.exam_question_type
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
  );

create policy exam_item_insert on app.exam_item
  for insert to api_executor
  with check (
    synthetic_only
    and app.current_user_role() = 'admissions_operator'
  );

comment on policy exam_item_insert on app.exam_item is
  'Lets api.exam_register_item admit a served bank item. INSERT only: an item already in '
  'the bank is immutable, so a caller cannot swap an answer key after a response was scored.';

reset role;

grant insert on app.exam_question_type to api_executor;
grant insert on app.exam_item to api_executor;

set role api_executor;

-- Idempotent registration of one bank item, including its SERVER-ONLY answer key.
-- Returns { registered, alreadyPresent } so the caller can tell a first write from a
-- replay. Never returns the key or any part of it.
create function api.exam_register_item(p_item jsonb, p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions
as $$
declare
  v_item_id uuid;
  v_type_code text;
  v_domain text;
  v_difficulty numeric;
  v_age_bands text[];
  v_already boolean;
begin
  perform app.bind_local_synthetic_principal();
  if app.current_user_id() is null then
    raise exception using errcode = 'PT401', message = 'AUTH_REQUIRED';
  end if;
  if app.current_user_role() is distinct from 'admissions_operator' then
    raise exception using errcode = 'PT403', message = 'ROLE_FORBIDDEN';
  end if;
  if p_item is null
    or jsonb_typeof(p_item) <> 'object'
    or p_correlation_id is null
    or (p_item ->> 'itemId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or (p_item ->> 'typeCode') !~ '^[A-Z]+-[A-Za-z0-9]+-[0-9]+$'
    or (p_item ->> 'domain') not in ('fluid_reasoning', 'verbal', 'quantitative', 'spatial')
    or jsonb_typeof(p_item -> 'difficulty') <> 'number'
    or jsonb_typeof(p_item -> 'ageBands') <> 'array'
    or jsonb_typeof(p_item -> 'content') <> 'object'
    or jsonb_typeof(p_item -> 'answer') <> 'object'
  then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;
  -- Born-synthetic is a storage precondition, matching api.exam_record_outcome.
  if coalesce((p_item ->> 'syntheticOnly')::boolean, false) is not true
    or coalesce((p_item ->> 'validated')::boolean, false) is not false
  then
    raise exception using errcode = 'PT400', message = 'SYNTHETIC_ONLY_REQUIRED';
  end if;

  v_item_id := (p_item ->> 'itemId')::uuid;
  v_type_code := p_item ->> 'typeCode';
  v_domain := p_item ->> 'domain';
  v_difficulty := (p_item ->> 'difficulty')::numeric;

  select coalesce(array_agg(band), '{}'::text[]) into v_age_bands
  from jsonb_array_elements_text(p_item -> 'ageBands') as band
  where band in ('K-1', '2-3', '4-5', '6-8');
  if array_length(v_age_bands, 1) is null then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;
  if v_difficulty < 1 or v_difficulty > 20 then
    raise exception using errcode = 'PT400', message = 'VALIDATION_FAILED';
  end if;

  perform 1 from app.exam_item where item_id = v_item_id;
  v_already := found;

  if not v_already then
    -- The type row carries the metric ids the coverage-aware fallback selection reads.
    insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
    values (
      v_type_code,
      v_domain,
      coalesce(nullif(p_item ->> 'typeName', ''), v_type_code),
      coalesce(nullif(p_item ->> 'demoPath', ''), v_type_code || '.html'),
      coalesce((
        select array_agg(m) from jsonb_array_elements_text(
          case when jsonb_typeof(p_item -> 'metricIds') = 'array'
            then p_item -> 'metricIds' else '[]'::jsonb end
        ) as m
      ), '{}'::text[])
    )
    on conflict (type_code) do nothing;

    insert into app.exam_item (
      item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
    )
    values (
      v_item_id,
      v_type_code,
      v_domain,
      v_difficulty,
      v_age_bands,
      p_item -> 'content',
      p_item -> 'answer',
      case when jsonb_typeof(p_item -> 'scoring') = 'object'
        then p_item -> 'scoring' else '{}'::jsonb end,
      case when jsonb_typeof(p_item -> 'provenance') = 'object'
        then p_item -> 'provenance' else '{}'::jsonb end
    )
    on conflict (item_id) do nothing;
  end if;

  return jsonb_build_object(
    'apiVersion', 'v1',
    'syntheticOnly', true,
    'data', jsonb_build_object(
      'itemId', v_item_id,
      'typeCode', v_type_code,
      'registered', not v_already,
      'alreadyPresent', v_already
    ),
    'meta', jsonb_build_object(
      'correlationId', p_correlation_id, 'idempotencyKey', null, 'idempotentReplay', v_already)
  );
end
$$;

comment on function api.exam_register_item(jsonb, uuid) is
  'Admits one generated bank item (with its SERVER-ONLY answer key) so a served item can be '
  'traced by api.exam_submit_response. Idempotent by item_id and INSERT-only, so a key can '
  'never be rewritten. Does not select, score, or return any part of the key.';

reset role;

revoke execute on function api.exam_register_item(jsonb, uuid)
  from public, anon, service_role;
grant execute on function api.exam_register_item(jsonb, uuid) to authenticated;
