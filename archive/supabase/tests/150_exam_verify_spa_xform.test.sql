-- SPA-XFORM-01's in-database verifier, graded against REAL BANK ITEMS
-- (20260802130000_exam_verify_spa_xform.sql; STAGE2_QUESTION_DESIGN §9.2 U7; serves R11, D-027).
--
-- Four things are proved here, in this order:
--   1. FIREWALL POSTURE — the new verifier and the four lattice helpers it needs are reachable
--      only from api_executor. A new function's ACL is null until something touches it and a null
--      ACL means PUBLIC may execute, so the revoke is what does the work; this is the assertion
--      that catches a port forgetting it.
--   2. DISPATCH — the registry row exists and `app.exam_verify_response` resolves the type to it.
--   3. GRADING THE ACTUAL BANK — nine items lifted verbatim from
--      `research/exam-question-types/banks/SPA-XFORM-01.jsonl`, spanning difficulty 1.02 to 19.98
--      and mark-chain depths 1 to 3. On every one of them the correct key scores 1 and each of the
--      four distractors scores 0, and the metric map is the one the app-tier verifier produces for
--      the same inputs.
--   4. THE KEY IS RE-DERIVED, NOT READ — a synthetic item whose stored `correctKey` disagrees with
--      what the transformation chain actually produces is graded on the transformation. That is
--      the whole point of U7: the stored key is a cross-check, not the authority.
--
-- WHY REAL ITEMS AND NOT A HAND-WRITTEN FIXTURE. The verifier's job is to reproduce the
-- generator's answer key on the bank the exam will serve. A fixture written by the same hand that
-- wrote the verifier proves the two agree with each other and nothing about the bank. These rows
-- are copied unedited, `content` and `answer` alike, so a disagreement between the port and the
-- generator fails here.
--
-- WHAT THIS DOES NOT PROVE. Cross-tier parity across the WHOLE bank and both persistence arms
-- needs both implementations in one process; `pnpm exam:verify:diff` does that. This file pins the
-- contract that harness relies on, on a slice small enough to live in the repo.
--
-- Born-synthetic throughout (syntheticOnly = true, validated = false), and NOT GATED: Gate B needs
-- roughly 128 real children (§4.1.3) and nothing here is evidence about one.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(24);

grant usage on schema extensions to api_executor, authenticated;

-- --- The bank slice, verbatim ------------------------------------------------------

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values ('SPA-XFORM-01', 'spatial', 'Transform Machine', 'SPA-XFORM-01.html',
        array['M-ERRTYPE', 'M-RULEID'])
on conflict (type_code) do nothing;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
select
  (i ->> 'itemId')::uuid,
  'SPA-XFORM-01',
  'spatial',
  (i ->> 'difficulty')::numeric,
  (select array_agg(b) from jsonb_array_elements_text(i -> 'ageBands') b),
  i -> 'content',
  i -> 'answer',
  i -> 'scoring',
  -- `provenance` carries the persistence arm, and the verifier must not read it: one verifier
  -- serves both arms with no branch between them (§4.1.1). Dropping it here is a second lock on
  -- that — a port that started reading the arm would fail on this fixture.
  '{}'::jsonb
from jsonb_array_elements($fixture$
[
  {"itemId":"778fbb0c-1853-4eab-8097-b446deac3126","difficulty":1.02,"ageBands":["K-1"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[1,2]},"chain":["leaf"],"options":[{"key":"A","blocks":[8,11]},{"key":"B","blocks":[0,3]},{"key":"C","blocks":[7,11]},{"key":"D","blocks":[2,3]},{"key":"E","blocks":[1,2]}]},"answer":{"correctKey":"B","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["braid"],"badgeChain":["leaf"],"orderSensitive":0,"strategyTrace":{"A":{"ruleId":"sub@0=drift:drift","kind":"wrong_operator"},"B":{"ruleId":"full:braid","kind":"correct"},"C":{"ruleId":"sub@0=pivot:pivot","kind":"wrong_operator"},"D":{"ruleId":"sub@0=shunt:shunt","kind":"wrong_operator"},"E":{"ruleId":"twice@0:braid>braid","kind":"over_application"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":2,"relabelReachableOptions":5,"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=drift:drift","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"B":{"lureClass":"correct","ruleId":"full:braid","note":"every badge applied once, in badge order"},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=pivot:pivot","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=shunt:shunt","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"E":{"lureClass":"near_order","lureDetail":"over_application","ruleId":"twice@0:braid>braid","partialRuleKind":"over_application","note":"applied badge 1 twice"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"741dcdb2-2e2f-4f24-95c4-8b1703a67054","difficulty":2.63,"ageBands":["K-1"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[11,12,13]},"chain":["trefoil"],"options":[{"key":"A","blocks":[11,12,13]},{"key":"B","blocks":[10,12,13]},{"key":"C","blocks":[1,6,7]},{"key":"D","blocks":[8,13,14]},{"key":"E","blocks":[0,4,13]}]},"answer":{"correctKey":"D","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["shunt"],"badgeChain":["trefoil"],"orderSensitive":0,"strategyTrace":{"A":{"ruleId":"drop@0:none","kind":"omission"},"B":{"ruleId":"sub@0=braid:braid","kind":"wrong_operator"},"C":{"ruleId":"sub@0=drift:drift","kind":"wrong_operator"},"D":{"ruleId":"full:shunt","kind":"correct"},"E":{"ruleId":"sub@0=pivot:pivot","kind":"wrong_operator"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":2,"relabelReachableOptions":4,"distractorRationales":{"A":{"lureClass":"near_order","lureDetail":"omission","ruleId":"drop@0:none","partialRuleKind":"omission","note":"skipped badge 1"},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=braid:braid","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=drift:drift","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"D":{"lureClass":"correct","ruleId":"full:shunt","note":"every badge applied once, in badge order"},"E":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=pivot:pivot","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"6353ae5f-5b54-47a0-acb1-a2120ec7736a","difficulty":4.12,"ageBands":["2-3"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[11,13]},"chain":["crescent","zigzag"],"options":[{"key":"A","blocks":[0,9]},{"key":"B","blocks":[3,5]},{"key":"C","blocks":[11,13]},{"key":"D","blocks":[1,8]},{"key":"E","blocks":[0,6]}]},"answer":{"correctKey":"B","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["stagger","drift"],"badgeChain":["crescent","zigzag"],"orderSensitive":0,"strategyTrace":{"A":{"ruleId":"pair@0=braid+pivot:braid>pivot","kind":"wrong_family"},"B":{"ruleId":"full:stagger>drift","kind":"correct"},"C":{"ruleId":"pair@0=braid+shunt:braid>shunt","kind":"wrong_family"},"D":{"ruleId":"pair@0=mirror+pivot:mirror>pivot","kind":"wrong_family"},"E":{"ruleId":"sub@0=braid:braid>drift","kind":"wrong_operator"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":2,"relabelReachableOptions":5,"distractorRationales":{"A":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"pair@0=braid+pivot:braid>pivot","partialRuleKind":"wrong_family","note":"read badges 1 and 2 as a different pair of transformations"},"B":{"lureClass":"correct","ruleId":"full:stagger>drift","note":"every badge applied once, in badge order"},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"pair@0=braid+shunt:braid>shunt","partialRuleKind":"wrong_family","note":"read badges 1 and 2 as a different pair of transformations"},"D":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"pair@0=mirror+pivot:mirror>pivot","partialRuleKind":"wrong_family","note":"read badges 1 and 2 as a different pair of transformations"},"E":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=braid:braid>drift","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"003cd94b-7616-40c4-9da0-78b4054d0b5e","difficulty":4.65,"ageBands":["2-3"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[4,6,9,12]},"chain":["spiral"],"options":[{"key":"A","blocks":[5,7,8,13]},{"key":"B","blocks":[3,6,12,14]},{"key":"C","blocks":[5,7,10,13]},{"key":"D","blocks":[5,7,10,15]},{"key":"E","blocks":[0,2,5,10]}]},"answer":{"correctKey":"D","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["mirror"],"badgeChain":["spiral"],"orderSensitive":0,"strategyTrace":{"A":{"ruleId":"sub@0=braid:braid","kind":"wrong_operator"},"B":{"ruleId":"sub@0=drift:drift","kind":"wrong_operator"},"C":{"ruleId":"sub@0=shunt:shunt","kind":"wrong_operator"},"D":{"ruleId":"full:mirror","kind":"correct"},"E":{"ruleId":"axis@0=pivot:pivot","kind":"wrong_axis"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":4,"relabelReachableOptions":5,"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=braid:braid","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=drift:drift","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=shunt:shunt","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"D":{"lureClass":"correct","ruleId":"full:mirror","note":"every badge applied once, in badge order"},"E":{"lureClass":"rule_violation","lureDetail":"wrong_axis","ruleId":"axis@0=pivot:pivot","partialRuleKind":"wrong_axis","note":"re-oriented the figure the other way at badge 1"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"276fc306-83a8-49a3-87e1-0d3cdae10c9e","difficulty":8.5,"ageBands":["4-5"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[1,2,7,11]},"chain":["zigzag","trefoil"],"options":[{"key":"A","blocks":[3,9,10,15]},{"key":"B","blocks":[0,1,7,11]},{"key":"C","blocks":[2,3,5,9]},{"key":"D","blocks":[0,6,7,12]},{"key":"E","blocks":[2,8,9,14]}]},"answer":{"correctKey":"E","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["drift","shunt"],"badgeChain":["zigzag","trefoil"],"orderSensitive":0,"strategyTrace":{"A":{"ruleId":"twice@1:drift>shunt>shunt","kind":"over_application"},"B":{"ruleId":"sub@0=braid:braid>shunt","kind":"wrong_operator"},"C":{"ruleId":"sub@0=mirror:mirror>shunt","kind":"wrong_operator"},"D":{"ruleId":"sub@0=stagger:stagger>shunt","kind":"wrong_operator"},"E":{"ruleId":"full:drift>shunt","kind":"correct"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":3,"relabelReachableOptions":5,"distractorRationales":{"A":{"lureClass":"near_order","lureDetail":"over_application","ruleId":"twice@1:drift>shunt>shunt","partialRuleKind":"over_application","note":"applied badge 2 twice"},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=braid:braid>shunt","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=mirror:mirror>shunt","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=stagger:stagger>shunt","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"E":{"lureClass":"correct","ruleId":"full:drift>shunt","note":"every badge applied once, in badge order"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"b5bb7505-e463-41c7-8ba1-2ef951ffba24","difficulty":12.48,"ageBands":["6-8"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[1,6,8,14]},"chain":["teardrop","spiral"],"options":[{"key":"A","blocks":[2,4,10,13]},{"key":"B","blocks":[3,4,10,12]},{"key":"C","blocks":[2,4,9,11]},{"key":"D","blocks":[1,7,8,15]},{"key":"E","blocks":[1,4,10,12]}]},"answer":{"correctKey":"C","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["pivot","mirror"],"badgeChain":["teardrop","spiral"],"orderSensitive":1,"strategyTrace":{"A":{"ruleId":"twice@0:pivot>pivot>mirror","kind":"over_application"},"B":{"ruleId":"sub@0=braid:braid>mirror","kind":"wrong_operator"},"C":{"ruleId":"full:pivot>mirror","kind":"correct"},"D":{"ruleId":"sub@0=drift:drift>mirror","kind":"wrong_operator"},"E":{"ruleId":"sub@0=shunt:shunt>mirror","kind":"wrong_operator"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":4,"relabelReachableOptions":4,"distractorRationales":{"A":{"lureClass":"near_order","lureDetail":"over_application","ruleId":"twice@0:pivot>pivot>mirror","partialRuleKind":"over_application","note":"applied badge 1 twice"},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=braid:braid>mirror","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"C":{"lureClass":"correct","ruleId":"full:pivot>mirror","note":"every badge applied once, in badge order"},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=drift:drift>mirror","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"E":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=shunt:shunt>mirror","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"785ee7e0-29ba-4d9f-a825-6754c4741045","difficulty":16.38,"ageBands":["6-8"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[2,4,5,7,11,14,15]},"chain":["trefoil","spiral","zigzag"],"options":[{"key":"A","blocks":[3,6,7,10,12,13,15]},{"key":"B","blocks":[2,3,6,8,9,10,15]},{"key":"C","blocks":[1,2,6,8,10,11,13]},{"key":"D","blocks":[1,5,6,10,12,13,15]},{"key":"E","blocks":[3,4,7,8,13,14,15]}]},"answer":{"correctKey":"D","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["shunt","mirror","drift"],"badgeChain":["trefoil","spiral","zigzag"],"orderSensitive":1,"strategyTrace":{"A":{"ruleId":"sub@0=braid:braid>mirror>drift","kind":"wrong_operator"},"B":{"ruleId":"sub@0=stagger:stagger>mirror>drift","kind":"wrong_operator"},"C":{"ruleId":"sub@1=stagger:shunt>stagger>drift","kind":"wrong_operator"},"D":{"ruleId":"full:shunt>mirror>drift","kind":"correct"},"E":{"ruleId":"reorder@0:mirror>shunt>drift","kind":"order_error"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":5,"relabelReachableOptions":5,"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=braid:braid>mirror>drift","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=stagger:stagger>mirror>drift","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@1=stagger:shunt>stagger>drift","partialRuleKind":"wrong_operator","note":"read badge 2 as a different transformation"},"D":{"lureClass":"correct","ruleId":"full:shunt>mirror>drift","note":"every badge applied once, in badge order"},"E":{"lureClass":"near_order","lureDetail":"order_error","ruleId":"reorder@0:mirror>shunt>drift","partialRuleKind":"order_error","note":"applied badge 1 and badge 2 in the wrong order"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"2df2e3e6-2fc6-4d09-9cdb-e17ced399c03","difficulty":16.5,"ageBands":["6-8"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[0,5,7,11,13,14]},"chain":["crescent","spiral","teardrop"],"options":[{"key":"A","blocks":[0,3,5,9,11,14]},{"key":"B","blocks":[0,2,6,8,11,13]},{"key":"C","blocks":[3,5,6,8,12,14]},{"key":"D","blocks":[1,3,4,9,10,15]},{"key":"E","blocks":[0,5,6,11,12,14]}]},"answer":{"correctKey":"A","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["stagger","mirror","pivot"],"badgeChain":["crescent","spiral","teardrop"],"orderSensitive":1,"strategyTrace":{"A":{"ruleId":"full:stagger>mirror>pivot","kind":"correct"},"B":{"ruleId":"pair@0=drift+shunt:drift>shunt>pivot","kind":"wrong_family"},"C":{"ruleId":"pair@0=shunt+braid:shunt>braid>pivot","kind":"wrong_family"},"D":{"ruleId":"firstOnly:stagger","kind":"first_step_only"},"E":{"ruleId":"sub@0=braid:braid>mirror>pivot","kind":"wrong_operator"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":2,"relabelReachableOptions":5,"distractorRationales":{"A":{"lureClass":"correct","ruleId":"full:stagger>mirror>pivot","note":"every badge applied once, in badge order"},"B":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"pair@0=drift+shunt:drift>shunt>pivot","partialRuleKind":"wrong_family","note":"read badges 1 and 2 as a different pair of transformations"},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"pair@0=shunt+braid:shunt>braid>pivot","partialRuleKind":"wrong_family","note":"read badges 1 and 2 as a different pair of transformations"},"D":{"lureClass":"local_fit","lureDetail":"first_step_only","ruleId":"firstOnly:stagger","partialRuleKind":"first_step_only","note":"applied only the first badge and stopped"},"E":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=braid:braid>mirror>pivot","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"}}},"scoring":{"mode":"deterministic_key"}},
  {"itemId":"0df71f5f-6109-40e0-a2be-43a2798852ab","difficulty":19.98,"ageBands":["6-8"],"content":{"typeCode":"SPA-XFORM-01","grid":{"rows":4,"cols":4},"badgeTray":["crescent","spiral","trefoil","zigzag","teardrop","leaf"],"input":{"blocks":[1,2,3,6,8,9,13]},"chain":["crescent","teardrop","spiral"],"options":[{"key":"A","blocks":[0,2,3,6,8,12,13]},{"key":"B","blocks":[2,6,7,8,9,10,12]},{"key":"C","blocks":[2,3,6,8,12,13,14]},{"key":"D","blocks":[3,5,6,7,8,9,13]},{"key":"E","blocks":[1,5,6,7,8,11,15]}]},"answer":{"correctKey":"D","system":{"systemId":"sys-SPA-XFORM-01|v1","mapping":{"crescent":"stagger","spiral":"mirror","trefoil":"shunt","zigzag":"drift","teardrop":"pivot","leaf":"braid"}},"operatorChain":["stagger","pivot","mirror"],"badgeChain":["crescent","teardrop","spiral"],"orderSensitive":1,"strategyTrace":{"A":{"ruleId":"reorder@0:pivot>stagger>mirror","kind":"order_error"},"B":{"ruleId":"reorder@1:stagger>mirror>pivot","kind":"order_error"},"C":{"ruleId":"sub@0=drift:drift>pivot>mirror","kind":"wrong_operator"},"D":{"ruleId":"full:stagger>pivot>mirror","kind":"correct"},"E":{"ruleId":"sub@2=shunt:stagger>pivot>shunt","kind":"wrong_operator"}},"strategyTraceRules":["order_error","wrong_axis","over_application","wrong_operator","omission","wrong_family","first_step_only","identity_copy"],"keyDisplacementFromInput":2,"relabelReachableOptions":5,"distractorRationales":{"A":{"lureClass":"near_order","lureDetail":"order_error","ruleId":"reorder@0:pivot>stagger>mirror","partialRuleKind":"order_error","note":"applied badge 1 and badge 2 in the wrong order"},"B":{"lureClass":"near_order","lureDetail":"order_error","ruleId":"reorder@1:stagger>mirror>pivot","partialRuleKind":"order_error","note":"applied badge 2 and badge 3 in the wrong order"},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0=drift:drift>pivot>mirror","partialRuleKind":"wrong_operator","note":"read badge 1 as a different transformation"},"D":{"lureClass":"correct","ruleId":"full:stagger>pivot>mirror","note":"every badge applied once, in badge order"},"E":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@2=shunt:stagger>pivot>shunt","partialRuleKind":"wrong_operator","note":"read badge 3 as a different transformation"}}},"scoring":{"mode":"deterministic_key"}}
]
$fixture$::jsonb) i;

-- Every option of every sampled item, with the verdict the dispatcher returns for choosing it.
-- Materialised BEFORE the synthetic items below are inserted, so the aggregates that follow are
-- over the real bank slice only.
create temporary table xform_option as
select
  i.item_id,
  (i.answer_key ->> 'correctKey') as correct_key,
  t.key as option_key,
  (t.value ->> 'kind') as kind,
  jsonb_array_length(i.content -> 'chain') as depth,
  i.difficulty,
  app.exam_verify_response(i.item_id, jsonb_build_object('selectedKey', t.key)) as verdict
from app.exam_item i
cross join lateral jsonb_each(i.answer_key -> 'strategyTrace') t
where i.type_code = 'SPA-XFORM-01';

-- The generator's own nearness axis, re-stated here rather than read from the verifier, so the
-- two have to agree. `identity_copy` is in the axis and does not occur in this bank — the slate
-- search evicts it wherever an equally-cheap reachable failure exists — so it is exercised on the
-- synthetic item below instead of being quietly untested.
create temporary table xform_nearness (kind text primary key, nearness double precision);
insert into xform_nearness (kind, nearness) values
  ('order_error', 1.0),
  ('wrong_axis', 0.8),
  ('over_application', 0.65),
  ('wrong_operator', 0.5),
  ('omission', 0.35),
  ('wrong_family', 0.2),
  ('first_step_only', 0.1),
  ('identity_copy', 0.0);

-- --- 1. Firewall posture -----------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'app.exam_verify_spa_xform(jsonb,jsonb)', 'execute'),
  'anon cannot execute the SPA-XFORM-01 verifier');                                     -- 1
select ok(
  not has_function_privilege('authenticated', 'app.exam_verify_spa_xform(jsonb,jsonb)', 'execute'),
  'authenticated cannot execute the SPA-XFORM-01 verifier');                            -- 2
select ok(
  not has_function_privilege('service_role', 'app.exam_verify_spa_xform(jsonb,jsonb)', 'execute'),
  'service_role cannot execute the SPA-XFORM-01 verifier');                             -- 3
select ok(
  has_function_privilege('api_executor', 'app.exam_verify_spa_xform(jsonb,jsonb)', 'execute'),
  'api_executor CAN execute it, so api.exam_submit_response still grades');              -- 4

-- A verifier answers "is this response correct" against the server-only key, so any role that can
-- call it can walk the key out one query at a time. The lattice helpers are the same exposure:
-- `exam_vxform_apply` plus `exam_vxform_key` is the transformation vocabulary itself.
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and (p.proname like 'exam_vxform%' or p.proname = 'exam_verify_spa_xform')
      and (
        p.proacl is null
        or exists (
          select 1
          from aclexplode(p.proacl) a
          left join pg_roles r on r.oid = a.grantee
          where a.grantee = 0 or r.rolname in ('anon', 'authenticated', 'service_role')
        )
      )
  ),
  0,
  'no function this migration adds is reachable by PUBLIC, anon, authenticated or service_role'
);                                                                                      -- 5

-- --- 2. Registration and dispatch --------------------------------------------------

select is(
  (select verifier_fn from app.exam_verifier_registry where type_code = 'SPA-XFORM-01'),
  'exam_verify_spa_xform',
  'the registry routes SPA-XFORM-01 to the ported verifier'
);                                                                                      -- 6
select is(
  (select count(distinct (verdict ->> 'verifier'))::integer from xform_option),
  1,
  'every graded response went through one verifier, not a mix of the per-type and the default'
);                                                                                      -- 7

-- --- 3. Grading the real bank ------------------------------------------------------

-- Anti-vacuity: the aggregates below say nothing if the slice is empty, one item wide, or all at
-- one rung. The bank ladder runs 1..20 over depths 1..3 and this slice has to span it.
select ok(
  (select count(distinct item_id) from xform_option) = 9
    and (select count(*) from xform_option) = 45
    and (select count(distinct depth) from xform_option) = 3
    and (select min(difficulty) from xform_option) < 2
    and (select max(difficulty) from xform_option) > 19,
  'the slice is 9 real bank items x 5 options, spanning depths 1-3 and the whole 1..20 ladder'
);                                                                                      -- 8

select is(
  (select count(*)::integer from xform_option
   where option_key = correct_key and (verdict ->> 'correct') = 'true'),
  9,
  'the key the transformation chain produces scores CORRECT on every sampled bank item'
);                                                                                      -- 9
select is(
  (select count(*)::integer from xform_option
   where option_key = correct_key and (verdict ->> 'score') = '1'),
  9,
  'and scores 1'
);                                                                                      -- 10
select is(
  (select count(*)::integer from xform_option
   where option_key <> correct_key and (verdict ->> 'correct') = 'false'),
  36,
  'every one of the four distractors on every sampled item scores INCORRECT'
);                                                                                      -- 11
select is(
  (select count(*)::integer from xform_option
   where option_key <> correct_key and (verdict ->> 'score') = '0'),
  36,
  'and scores 0'
);                                                                                      -- 12

select is(
  (select count(*)::integer from xform_option
   where option_key = correct_key and (verdict #>> '{metrics,M-ERRTYPE}') = '1'),
  9,
  'M-ERRTYPE is exactly 1 on a correct answer, so no wrong answer can tie it'
);                                                                                      -- 13
select is(
  (select count(*)::integer from xform_option
   where option_key = correct_key
     and (verdict #>> '{metrics,M-RULEID}')::integer = depth),
  9,
  'M-RULEID reports the mark-chain length the child bound, on a correct answer'
);                                                                                      -- 14
select is(
  (select count(*)::integer from xform_option
   where option_key <> correct_key and (verdict -> 'metrics') ? 'M-RULEID'),
  0,
  'a wrong answer bound an unknown number of rules, so it reports no M-RULEID'
);                                                                                      -- 15

select is(
  (select count(*)::integer
   from xform_option o
   join xform_nearness n on n.kind = o.kind
   where o.option_key <> o.correct_key
     and abs((o.verdict #>> '{metrics,M-ERRTYPE}')::double precision - 0.9 * n.nearness) > 1e-9),
  0,
  'M-ERRTYPE is 0.9 x the generator''s own nearness for the partial rule each distractor encodes'
);                                                                                      -- 16
select is(
  (select count(distinct kind)::integer from xform_option where option_key <> correct_key),
  7,
  'assertion 16 is not vacuous: the slice exercises 7 distinct named failure classes'
);                                                                                      -- 17

-- --- 4. The key is re-derived, not read --------------------------------------------

-- Assertions 9 to 17 CANNOT tell a correct derivation from a failed one, and that is not a
-- hypothetical: the port falls back to `answer.correctKey` when the derivation names no single
-- option, which is a faithful port of the TypeScript and is what keeps an unreadable item graded
-- rather than refused. Measured — a deliberately broken lattice map passes every one of them.
--
-- So the derivation is pinned separately, on the same real items, by ROTATING THE STORED KEY to
-- another option. If the transformation chain is what decides, the true key still wins; if the
-- fallback is what decided, the rotated key wins instead. There is no third outcome.
create temporary table xform_tamper as
select
  md5(o.item_id::text || '|tampered')::uuid as item_id,
  o.correct_key,
  (
    select e.value ->> 'key'
    from app.exam_item i, jsonb_array_elements(i.content -> 'options') e
    where i.item_id = o.item_id and e.value ->> 'key' <> o.correct_key
    order by e.value ->> 'key'
    limit 1
  ) as rotated_key,
  i2.content,
  jsonb_set(
    i2.answer_key,
    '{correctKey}',
    to_jsonb((
      select e.value ->> 'key'
      from jsonb_array_elements(i2.content -> 'options') e
      where e.value ->> 'key' <> o.correct_key
      order by e.value ->> 'key'
      limit 1
    ))
  ) as answer_key
from (select distinct item_id, correct_key from xform_option) o
join app.exam_item i2 on i2.item_id = o.item_id;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
select t.item_id, 'SPA-XFORM-01', 'spatial', 5.0, array['4-5'], t.content, t.answer_key,
       jsonb_build_object('mode', 'deterministic_key'), '{}'::jsonb
from xform_tamper t;

select is(
  (select count(*)::integer from xform_tamper t
   where (app.exam_verify_response(t.item_id, jsonb_build_object('selectedKey', t.correct_key))
          ->> 'correct') = 'true'),
  9,
  'the transformation decides on every sampled bank item: the true key wins over a rotated one'
);                                                                                      -- 18
select is(
  (select count(*)::integer from xform_tamper t
   where (app.exam_verify_response(t.item_id, jsonb_build_object('selectedKey', t.rotated_key))
          ->> 'correct') = 'true'),
  0,
  'and the rotated key never wins, so assertions 9-17 were not riding the stored-key fallback'
);                                                                                      -- 19

-- Two synthetic items, and they are synthetic on purpose: no real bank item can carry a stored key
-- that disagrees with its own transformation chain, because the generator writes both, and an
-- unrecognised failure class cannot occur for the same reason. Both branches exist in the port and
-- both would otherwise ship untested.
--
-- `crescent` maps to the transformation that swaps neighbouring columns, so the pattern at cells
-- {0, 2} becomes {1, 3} — option A. The stored key says C.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values (
  '00000000-0000-4000-8000-0000000f0001',
  'SPA-XFORM-01', 'spatial', 5.0, array['2-3'],
  jsonb_build_object(
    'typeCode', 'SPA-XFORM-01',
    'grid', jsonb_build_object('rows', 4, 'cols', 4),
    'badgeTray', jsonb_build_array('crescent', 'spiral', 'trefoil', 'zigzag', 'teardrop', 'leaf'),
    'input', jsonb_build_object('blocks', jsonb_build_array(0, 2)),
    'chain', jsonb_build_array('crescent'),
    'options', jsonb_build_array(
      jsonb_build_object('key', 'A', 'blocks', jsonb_build_array(1, 3)),
      jsonb_build_object('key', 'B', 'blocks', jsonb_build_array(0, 2)),
      jsonb_build_object('key', 'C', 'blocks', jsonb_build_array(4, 6)),
      jsonb_build_object('key', 'D', 'blocks', jsonb_build_array(8, 10)),
      jsonb_build_object('key', 'E', 'blocks', jsonb_build_array(12, 14))
    )
  ),
  jsonb_build_object(
    'correctKey', 'C',
    'system', jsonb_build_object(
      'systemId', 'sys-fixture',
      'mapping', jsonb_build_object(
        'crescent', 'braid', 'spiral', 'mirror', 'trefoil', 'shunt',
        'zigzag', 'drift', 'teardrop', 'pivot', 'leaf', 'stagger'
      )
    ),
    'strategyTrace', jsonb_build_object(
      'B', jsonb_build_object('ruleId', 'identity:none', 'kind', 'identity_copy'),
      'C', jsonb_build_object('ruleId', 'fixture', 'kind', 'not_a_declared_failure'),
      'E', jsonb_build_object('ruleId', 'sub@0=pivot:pivot', 'kind', 'wrong_operator')
    )
  ),
  jsonb_build_object('mode', 'deterministic_key'),
  '{}'::jsonb
);

select ok(
  (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000f0001', '{"selectedKey":"A"}'::jsonb) ->> 'correct') = 'true'
  and (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000f0001', '{"selectedKey":"C"}'::jsonb) ->> 'correct') = 'false',
  'the transformation decides: the option the chain produces wins over a stored key that disagrees'
);                                                                                      -- 20

select ok(
  (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000f0001', '{"selectedKey":"B"}'::jsonb)
     #>> '{metrics,M-ERRTYPE}')::double precision = 0
  and (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000f0001', '{"selectedKey":"C"}'::jsonb)
     #>> '{metrics,M-ERRTYPE}')::double precision = 0
  and (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000f0001', '{"selectedKey":"D"}'::jsonb)
     #>> '{metrics,M-ERRTYPE}')::double precision = 0
  and abs((app.exam_verify_response(
     '00000000-0000-4000-8000-0000000f0001', '{"selectedKey":"E"}'::jsonb)
     #>> '{metrics,M-ERRTYPE}')::double precision - 0.45) < 1e-9,
  'the M-ERRTYPE floor covers identity_copy, an unrecognised class and an untraced option alike'
);                                                                                      -- 21

-- --- 5. Failing closed, and saying nothing ------------------------------------------

select is(
  app.exam_verify_response('00000000-0000-4000-8000-0000000f0001', '{}'::jsonb)::jsonb
    - 'verifier' - 'mode',
  '{"score": 0, "correct": false, "metrics": {}}'::jsonb,
  'a response naming no option is incorrect and carries no metrics'
);                                                                                      -- 22
select is(
  (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000f0001',
     '{"selectedKey":"A","skipped":true}'::jsonb) ->> 'correct'),
  'false',
  'a skipped item is incorrect even when the body names the option the machine made'
);                                                                                      -- 23

-- The verdict is the only thing that crosses back out of the schema the key lives in, so it must
-- name neither the key, nor the hidden system, nor the transformation vocabulary.
select ok(
  (select string_agg(verdict::text, ' ') from xform_option)
    !~ '(correctKey|answer_key|strategyTrace|distractorRationales|mapping|systemId|pivot|mirror|braid|stagger|drift|shunt)',
  'no verdict returns a key, the hidden mapping, or the transformation vocabulary'
);                                                                                      -- 24

select * from finish();

rollback;
