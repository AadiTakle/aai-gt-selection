-- Throwaway evidence probe, corrected for the real response contract:
-- keyed items expect {"selectedKey": <correctKey>} rather than the raw answer_key object.
\echo '=== seeded type codes vs the 30-entry verifier registry ==='
select i.type_code,
       count(*) as items,
       (r.type_code is not null) as in_verifier_registry,
       coalesce(r.verifier_fn, '(falls through to generic)') as resolves_to,
       (array_agg(i.answer_key::text))[1] as sample_key,
       (array_agg(i.scoring::text))[1] as sample_scoring
from app.exam_item i
left join app.exam_verifier_registry r on r.type_code = i.type_code
group by i.type_code, r.type_code, r.verifier_fn
order by 1;

\echo ''
\echo '=== discrimination using the CORRECT response shape ==='
do $$
declare
  r record;
  v_resp jsonb;
  v_right jsonb;
  v_wrong jsonb;
  n int := 0; n_ok int := 0; n_falsepos int := 0;
  n_ungradeable int := 0;
begin
  for r in select item_id, type_code, answer_key from app.exam_item order by item_id loop
    n := n + 1;
    if r.answer_key ? 'correctKey' then
      v_resp := jsonb_build_object('selectedKey', r.answer_key ->> 'correctKey');
    elsif r.answer_key ? 'solution' then
      -- best-effort: try every plausible response field name for a computed solver
      v_resp := jsonb_build_object(
        'value', r.answer_key -> 'solution',
        'solution', r.answer_key -> 'solution',
        'answer', r.answer_key -> 'solution',
        'selectedKey', r.answer_key ->> 'solution'
      );
    else
      v_resp := r.answer_key;
    end if;

    v_right := app.exam_verify_response(r.item_id, v_resp);
    v_wrong := app.exam_verify_response(r.item_id, jsonb_build_object('selectedKey', '__wrong__'));

    if (v_right ->> 'correct')::boolean then
      n_ok := n_ok + 1;
    else
      n_ungradeable := n_ungradeable + 1;
      if n_ungradeable <= 3 then
        raise notice 'NOT-GRADED-CORRECT item=% type=% key=% sent=% verdict=%',
          r.item_id, r.type_code, r.answer_key, v_resp, v_right;
      end if;
    end if;
    if (v_wrong ->> 'correct')::boolean then
      n_falsepos := n_falsepos + 1;
    end if;
  end loop;
  raise notice 'TOTAL=% correct_key_accepted=% correct_key_REJECTED=% wrong_answer_accepted=%',
    n, n_ok, n_ungradeable, n_falsepos;
end $$;

\echo ''
\echo '=== per-type breakdown of the positive path ==='
select i.type_code,
       count(*) as items,
       count(*) filter (
         where (app.exam_verify_response(
                 i.item_id,
                 case when i.answer_key ? 'correctKey'
                      then jsonb_build_object('selectedKey', i.answer_key ->> 'correctKey')
                      else jsonb_build_object('value', i.answer_key -> 'solution')
                 end) ->> 'correct')::boolean
       ) as graded_correct,
       (app.exam_verify_response(min(i.item_id), '{}'::jsonb) ->> 'verifier') as verifier_used
from app.exam_item i
group by i.type_code
order by 1;
