-- Throwaway evidence probe.
-- (1) Does the client-visible projection ever embed the answer key?
-- (2) Does app.exam_verify_response DISCRIMINATE, i.e. return correct=true for the real key
--     and correct=false for a wrong answer? Executability alone would be satisfied by a
--     verifier that always says false, so this is the claim that matters.
\echo '=== seeded item inventory ==='
select count(*) as items, count(distinct type_code) as type_codes,
       count(*) filter (where answer_key is not null and answer_key <> '{}'::jsonb) as with_keys
from app.exam_item;

\echo ''
\echo '=== (1) does the served projection leak any answer_key value? ==='
select count(*) as items_whose_served_json_contains_key_text
from app.exam_item i
where i.answer_key is not null
  and i.answer_key <> '{}'::jsonb
  and app.exam_served_item_json(i.item_id)::text like '%' || replace(trim(both '{}' from i.answer_key::text), '"', '') || '%';

\echo ''
\echo '=== (1b) explicit key-name check: does served json expose answer/scoring keys? ==='
select count(*) as items_with_answer_or_scoring_field
from app.exam_item i
where (app.exam_served_item_json(i.item_id)) ?| array['answer', 'answer_key', 'answerKey', 'scoring'];

\echo ''
\echo '=== (2) discrimination: verify each keyed item with its REAL key vs a WRONG answer ==='
do $$
declare
  r record;
  v_right jsonb;
  v_wrong jsonb;
  n_right_correct int := 0;
  n_wrong_correct int := 0;
  n_total int := 0;
begin
  for r in
    select item_id, type_code, answer_key
    from app.exam_item
    where answer_key is not null and answer_key <> '{}'::jsonb
    order by item_id
  loop
    n_total := n_total + 1;
    -- Submit the item's own answer key as the response (contract: the verifier reads the
    -- same field names from the response that the key uses).
    v_right := app.exam_verify_response(r.item_id, r.answer_key);
    -- Submit a response that cannot be right for any type.
    v_wrong := app.exam_verify_response(r.item_id, '{"selectedOptionId":"__definitely_wrong__"}'::jsonb);
    if (v_right ->> 'correct')::boolean then
      n_right_correct := n_right_correct + 1;
    end if;
    if (v_wrong ->> 'correct')::boolean then
      n_wrong_correct := n_wrong_correct + 1;
      raise notice 'WRONG-ANSWER-ACCEPTED item=% type=% verdict=%', r.item_id, r.type_code, v_wrong;
    end if;
  end loop;
  raise notice 'DISCRIMINATION: keyed_items=% real_key_graded_correct=% wrong_answer_graded_correct=%',
    n_total, n_right_correct, n_wrong_correct;
end $$;
