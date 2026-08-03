-- VER-MORPHO-01 "Word Machines" — the per-type verifier ported in
-- 20260803040200_exam_verify_ver_morpho.sql (D-027, STAGE2_QUESTION_DESIGN §9.2 U7).
--
-- Four things are proved here, in this order:
--   1. FIREWALL POSTURE — the verifier and every helper it calls are reachable only from
--      api_executor. Test 123 asserts this over the whole `app.exam_v%` namespace; this file
--      names them, so a failure says which function forgot its revoke. It is not a formality
--      for `exam_vmorpho_denote`, which takes the hidden mapping as an argument: a caller who
--      could reach it could grade candidate mappings directly.
--   2. DISPATCH — VER-MORPHO-01 resolves to its own function rather than falling through to
--      the keyed default it used before this migration.
--   3. GRADING THE REAL BANK — every fixture below is a VERBATIM item off
--      research/exam-question-types/banks/VER-MORPHO-01.jsonl and its equated control arm, with
--      nothing hand-typed. Nine bank indices are sampled to cover both item directions, every
--      composition depth 1..4, both ends of the difficulty scale, and all four distractor
--      classes; each is taken in BOTH persistence arms, which is what shows the verifier has no
--      arm branch (§4.1.1). Every option of every fixture is graded, so the assertions cover
--      72 item x response pairs rather than a chosen few.
--   4. THE RULES THAT ARE EASY TO GET SUBTLY WRONG — that the key is RE-DERIVED through the
--      server-only mapping rather than read off `answer.correctKey`, that the stored key is
--      still the documented fallback when the mapping is unreadable, and that the four-class
--      error ladder prices each class where the port says it does.
--
-- Parity against the whole bank is not provable in pgTAP, because it needs both implementations
-- in one process. `pnpm exam:verify:diff` does that over every served type, and
-- apps/web/src/lib/exam/verifiers/verbal-verifiers.test.ts runs the app tier over all 468 items
-- of both arms. This file pins the database half of the contract those rely on.
--
-- The last two assertions are anti-vacuity: they prove the fixtures hold real keys and that
-- something actually graded CORRECT, so the assertions above cannot pass by grading everything
-- false.
--
-- GATE STATUS. Born-synthetic fixtures (the banks ship syntheticOnly=true, validated=false).
-- Gate A is NOT cleared for this type and Gate B has not run. Nothing here is evidence that the
-- type measures learning; it is evidence that the database grades it the way the generator says.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(20);

grant usage on schema extensions to api_executor, authenticated;

-- --- Real bank fixtures ------------------------------------------------------------

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values ('VER-MORPHO-01', 'verbal', 'Word Machines', 'VER-MORPHO-01.html', array['M-ACC'])
on conflict (type_code) do nothing;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values
  -- #0 consistent: wordToPicture, depth 1, scope 0, difficulty 1.01, key B
  (
    '315d853c-2203-40b0-94e0-8586b453749b', 'VER-MORPHO-01', 'verbal', 1.01, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"saz","stemPicture":{"kind":"blob","count":2,"size":"small","mark":"none","role":"target"},"word":"saz-kib","wordMorphemes":["kib"],"options":[{"key":"A","picture":{"kind":"blob","count":1,"size":"small","mark":"none","role":"target"}},{"key":"B","picture":{"kind":"blob","count":2,"size":"big","mark":"none","role":"target"}},{"key":"C","picture":{"kind":"blob","count":2,"size":"small","mark":"cross","role":"target"}},{"key":"D","picture":{"kind":"blob","count":3,"size":"small","mark":"none","role":"target"}}]}'::jsonb,
    '{"correctKey":"B","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["resize"],"morphemeChain":["kib"],"keyPicture":{"kind":"blob","count":2,"size":"big","mark":"none","role":"target"},"strategyTrace":{"A":{"ruleId":"sub@0:dual","kind":"wrong_operator"},"B":{"ruleId":"full:resize","kind":"correct"},"C":{"ruleId":"sub@0:negate","kind":"near_miss"},"D":{"ruleId":"sub@0:paucal","kind":"wrong_operator"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":1,"relabelling":{"optionVotes":[1,1,1,1],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:dual","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"B":{"lureClass":"correct","ruleId":"full:resize","note":"every morpheme applied once, in the order written"},"C":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@0:negate","partialRuleKind":"near_miss","note":"read morpheme 1 as the other morpheme of its family","attributesFromKey":2},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":1,"pair":0}}'::jsonb
  ),
  -- #0 perTrial: wordToPicture, depth 1, scope 0, difficulty 1.01, key B
  (
    'ff6f4872-bcad-452e-b8b7-a3af34ff6a61', 'VER-MORPHO-01', 'verbal', 1.01, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"vaf","stemPicture":{"kind":"blob","count":2,"size":"small","mark":"none","role":"target"},"word":"vaf-dez","wordMorphemes":["dez"],"options":[{"key":"A","picture":{"kind":"blob","count":1,"size":"small","mark":"none","role":"target"}},{"key":"B","picture":{"kind":"blob","count":2,"size":"big","mark":"none","role":"target"}},{"key":"C","picture":{"kind":"blob","count":2,"size":"small","mark":"cross","role":"target"}},{"key":"D","picture":{"kind":"blob","count":3,"size":"small","mark":"none","role":"target"}}]}'::jsonb,
    '{"correctKey":"B","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=1|i=0|D1S0","affixMap":{"dez":"resize","fov":"negate","kib":"plural","pav":"swapRole","pef":"paucal","pog":"dual"},"stemMap":{"saz":"drop","tas":"star","vaf":"blob","zam":"leaf"}},"meaningChain":["resize"],"morphemeChain":["dez"],"keyPicture":{"kind":"blob","count":2,"size":"big","mark":"none","role":"target"},"strategyTrace":{"A":{"ruleId":"sub@0:dual","kind":"wrong_operator"},"B":{"ruleId":"full:resize","kind":"correct"},"C":{"ruleId":"sub@0:negate","kind":"near_miss"},"D":{"ruleId":"sub@0:paucal","kind":"wrong_operator"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":1,"relabelling":{"optionVotes":[1,1,1,1],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:dual","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"B":{"lureClass":"correct","ruleId":"full:resize","note":"every morpheme applied once, in the order written"},"C":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@0:negate","partialRuleKind":"near_miss","note":"read morpheme 1 as the other morpheme of its family","attributesFromKey":2},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":1,"pair":0}}'::jsonb
  ),
  -- #1 consistent: pictureToWord, depth 1, scope 0, difficulty 1.03, key D
  (
    '1218f2e2-7639-49b3-a550-ce5611237075', 'VER-MORPHO-01', 'verbal', 1.03, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"tas","stemPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"targetPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"doer"},"options":[{"key":"A","word":"tas-pef","morphemes":["pef"]},{"key":"B","word":"tas-pav","morphemes":["pav"]},{"key":"C","word":"tas-dez","morphemes":["dez"]},{"key":"D","word":"tas-fov","morphemes":["fov"]}]}'::jsonb,
    '{"correctKey":"D","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["swapRole"],"morphemeChain":["fov"],"keyPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub@0:negate","kind":"near_miss"},"B":{"ruleId":"sub@0:paucal","kind":"wrong_operator"},"C":{"ruleId":"sub@0:plural","kind":"wrong_operator"},"D":{"ruleId":"full:swapRole","kind":"correct"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":1,"relabelling":{"optionVotes":[1,1,1,1],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@0:negate","partialRuleKind":"near_miss","note":"read morpheme 1 as the other morpheme of its family","attributesFromKey":2},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:plural","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"D":{"lureClass":"correct","ruleId":"full:swapRole","note":"every morpheme applied once, in the order written"}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":1,"pair":1}}'::jsonb
  ),
  -- #1 perTrial: pictureToWord, depth 1, scope 0, difficulty 1.03, key D
  (
    'ac6e31f0-9301-4351-bc2c-aecd0b633caa', 'VER-MORPHO-01', 'verbal', 1.03, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"zam","stemPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"targetPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"doer"},"options":[{"key":"A","word":"zam-kib","morphemes":["kib"]},{"key":"B","word":"zam-dez","morphemes":["dez"]},{"key":"C","word":"zam-pog","morphemes":["pog"]},{"key":"D","word":"zam-pef","morphemes":["pef"]}]}'::jsonb,
    '{"correctKey":"D","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=1|i=1|D1S0","affixMap":{"dez":"paucal","fov":"dual","kib":"negate","pav":"resize","pef":"swapRole","pog":"plural"},"stemMap":{"saz":"blob","tas":"drop","vaf":"leaf","zam":"star"}},"meaningChain":["swapRole"],"morphemeChain":["pef"],"keyPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub@0:negate","kind":"near_miss"},"B":{"ruleId":"sub@0:paucal","kind":"wrong_operator"},"C":{"ruleId":"sub@0:plural","kind":"wrong_operator"},"D":{"ruleId":"full:swapRole","kind":"correct"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":1,"relabelling":{"optionVotes":[1,1,1,1],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@0:negate","partialRuleKind":"near_miss","note":"read morpheme 1 as the other morpheme of its family","attributesFromKey":2},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"C":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:plural","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"D":{"lureClass":"correct","ruleId":"full:swapRole","note":"every morpheme applied once, in the order written"}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":1,"pair":1}}'::jsonb
  ),
  -- #86 consistent: wordToPicture, depth 2, scope 0, difficulty 4.51, key A
  (
    '98a8f2c9-1bb9-46c7-a866-be7a62f82df7', 'VER-MORPHO-01', 'verbal', 4.51, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"zam","stemPicture":{"kind":"leaf","count":1,"size":"small","mark":"cross","role":"target"},"word":"zam-fov-pef","wordMorphemes":["fov","pef"],"options":[{"key":"A","picture":{"kind":"leaf","count":1,"size":"small","mark":"none","role":"doer"}},{"key":"B","picture":{"kind":"leaf","count":2,"size":"big","mark":"cross","role":"target"}},{"key":"C","picture":{"kind":"leaf","count":3,"size":"big","mark":"cross","role":"target"}},{"key":"D","picture":{"kind":"leaf","count":1,"size":"big","mark":"cross","role":"target"}}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["swapRole","negate"],"morphemeChain":["fov","pef"],"keyPicture":{"kind":"leaf","count":1,"size":"small","mark":"none","role":"doer"},"strategyTrace":{"A":{"ruleId":"full:swapRole>negate","kind":"correct"},"B":{"ruleId":"sub2@0,1:dual>resize","kind":"wrong_family"},"C":{"ruleId":"sub2@0,1:plural>resize","kind":"wrong_family"},"D":{"ruleId":"sub2@0,1:paucal>resize","kind":"wrong_family"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":2,"relabelling":{"optionVotes":[2,2,2,2],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"correct","ruleId":"full:swapRole>negate","note":"every morpheme applied once, in the order written"},"B":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"D":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:paucal>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":2,"pair":86}}'::jsonb
  ),
  -- #86 perTrial: wordToPicture, depth 2, scope 0, difficulty 4.51, key A
  (
    'd7c70701-98d5-4ed8-a729-8c1a6119f7ad', 'VER-MORPHO-01', 'verbal', 4.51, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"tas","stemPicture":{"kind":"leaf","count":1,"size":"small","mark":"cross","role":"target"},"word":"tas-kib-fov","wordMorphemes":["kib","fov"],"options":[{"key":"A","picture":{"kind":"leaf","count":1,"size":"small","mark":"none","role":"doer"}},{"key":"B","picture":{"kind":"leaf","count":2,"size":"big","mark":"cross","role":"target"}},{"key":"C","picture":{"kind":"leaf","count":3,"size":"big","mark":"cross","role":"target"}},{"key":"D","picture":{"kind":"leaf","count":1,"size":"big","mark":"cross","role":"target"}}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=4.5|i=2|D2S0","affixMap":{"dez":"plural","fov":"negate","kib":"swapRole","pav":"paucal","pef":"resize","pog":"dual"},"stemMap":{"saz":"drop","tas":"leaf","vaf":"star","zam":"blob"}},"meaningChain":["swapRole","negate"],"morphemeChain":["kib","fov"],"keyPicture":{"kind":"leaf","count":1,"size":"small","mark":"none","role":"doer"},"strategyTrace":{"A":{"ruleId":"full:swapRole>negate","kind":"correct"},"B":{"ruleId":"sub2@0,1:dual>resize","kind":"wrong_family"},"C":{"ruleId":"sub2@0,1:plural>resize","kind":"wrong_family"},"D":{"ruleId":"sub2@0,1:paucal>resize","kind":"wrong_family"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":2,"relabelling":{"optionVotes":[2,2,2,2],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"correct","ruleId":"full:swapRole>negate","note":"every morpheme applied once, in the order written"},"B":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"D":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:paucal>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":2,"pair":86}}'::jsonb
  ),
  -- #89 consistent: pictureToWord, depth 2, scope 0, difficulty 4.58, key A
  (
    '1401321d-fd6b-44ce-8057-06e038d3a17a', 'VER-MORPHO-01', 'verbal', 4.58, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"tas","stemPicture":{"kind":"star","count":3,"size":"big","mark":"cross","role":"doer"},"targetPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"options":[{"key":"A","word":"tas-kib-fov","morphemes":["kib","fov"]},{"key":"B","word":"tas-pav-pef","morphemes":["pav","pef"]},{"key":"C","word":"tas-dez-pef","morphemes":["dez","pef"]},{"key":"D","word":"tas-pog-pef","morphemes":["pog","pef"]}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["resize","swapRole"],"morphemeChain":["kib","fov"],"keyPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"strategyTrace":{"A":{"ruleId":"full:resize>swapRole","kind":"correct"},"B":{"ruleId":"sub2@0,1:paucal>negate","kind":"wrong_family"},"C":{"ruleId":"sub2@0,1:plural>negate","kind":"wrong_family"},"D":{"ruleId":"sub2@0,1:dual>negate","kind":"wrong_family"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":2,"relabelling":{"optionVotes":[2,2,2,2],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"correct","ruleId":"full:resize>swapRole","note":"every morpheme applied once, in the order written"},"B":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:paucal>negate","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>negate","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"D":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>negate","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":2,"pair":89}}'::jsonb
  ),
  -- #89 perTrial: pictureToWord, depth 2, scope 0, difficulty 4.58, key A
  (
    '4a0080fc-0191-4ad3-88f3-5beacbf9c32b', 'VER-MORPHO-01', 'verbal', 4.58, array['2-3'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"tas","stemPicture":{"kind":"star","count":3,"size":"big","mark":"cross","role":"doer"},"targetPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"options":[{"key":"A","word":"tas-pav-pog","morphemes":["pav","pog"]},{"key":"B","word":"tas-dez-pef","morphemes":["dez","pef"]},{"key":"C","word":"tas-kib-pef","morphemes":["kib","pef"]},{"key":"D","word":"tas-fov-pef","morphemes":["fov","pef"]}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=4.5|i=5|D2S0","affixMap":{"dez":"paucal","fov":"dual","kib":"plural","pav":"resize","pef":"negate","pog":"swapRole"},"stemMap":{"saz":"drop","tas":"star","vaf":"blob","zam":"leaf"}},"meaningChain":["resize","swapRole"],"morphemeChain":["pav","pog"],"keyPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"strategyTrace":{"A":{"ruleId":"full:resize>swapRole","kind":"correct"},"B":{"ruleId":"sub2@0,1:paucal>negate","kind":"wrong_family"},"C":{"ruleId":"sub2@0,1:plural>negate","kind":"wrong_family"},"D":{"ruleId":"sub2@0,1:dual>negate","kind":"wrong_family"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":2,"relabelling":{"optionVotes":[2,2,2,2],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"correct","ruleId":"full:resize>swapRole","note":"every morpheme applied once, in the order written"},"B":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:paucal>negate","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>negate","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":4},"D":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>negate","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":2,"pair":89}}'::jsonb
  ),
  -- #170 consistent: wordToPicture, depth 3, scope 0, difficulty 8.03, key C
  (
    'bd8e7347-7e9e-4b7d-89d3-795f8d83a975', 'VER-MORPHO-01', 'verbal', 8.03, array['4-5'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"zam","stemPicture":{"kind":"leaf","count":2,"size":"small","mark":"none","role":"target"},"word":"zam-kib-fov-pef","wordMorphemes":["kib","fov","pef"],"options":[{"key":"A","picture":{"kind":"leaf","count":1,"size":"small","mark":"cross","role":"doer"}},{"key":"B","picture":{"kind":"leaf","count":3,"size":"small","mark":"cross","role":"doer"}},{"key":"C","picture":{"kind":"leaf","count":2,"size":"big","mark":"cross","role":"doer"}},{"key":"D","picture":{"kind":"leaf","count":1,"size":"big","mark":"cross","role":"target"}}]}'::jsonb,
    '{"correctKey":"C","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["resize","swapRole","negate"],"morphemeChain":["kib","fov","pef"],"keyPicture":{"kind":"leaf","count":2,"size":"big","mark":"cross","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub@0:dual>swapRole>negate","kind":"wrong_operator"},"B":{"ruleId":"sub@0:paucal>swapRole>negate","kind":"wrong_operator"},"C":{"ruleId":"full:resize>swapRole>negate","kind":"correct"},"D":{"ruleId":"sub@1:resize>dual>negate","kind":"wrong_operator"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":3,"relabelling":{"optionVotes":[6,6,6,6],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:dual>swapRole>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal>swapRole>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"C":{"lureClass":"correct","ruleId":"full:resize>swapRole>negate","note":"every morpheme applied once, in the order written"},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@1:resize>dual>negate","partialRuleKind":"wrong_operator","note":"read morpheme 2 as a morpheme from the other family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":3,"pair":170}}'::jsonb
  ),
  -- #170 perTrial: wordToPicture, depth 3, scope 0, difficulty 8.03, key C
  (
    'c7b058c9-390b-4a51-afb6-c975bba9b4ea', 'VER-MORPHO-01', 'verbal', 8.03, array['4-5'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"zam","stemPicture":{"kind":"leaf","count":2,"size":"small","mark":"none","role":"target"},"word":"zam-dez-pav-fov","wordMorphemes":["dez","pav","fov"],"options":[{"key":"A","picture":{"kind":"leaf","count":1,"size":"small","mark":"cross","role":"doer"}},{"key":"B","picture":{"kind":"leaf","count":3,"size":"small","mark":"cross","role":"doer"}},{"key":"C","picture":{"kind":"leaf","count":2,"size":"big","mark":"cross","role":"doer"}},{"key":"D","picture":{"kind":"leaf","count":1,"size":"big","mark":"cross","role":"target"}}]}'::jsonb,
    '{"correctKey":"C","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=8|i=2|D3S0","affixMap":{"dez":"resize","fov":"negate","kib":"plural","pav":"swapRole","pef":"dual","pog":"paucal"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["resize","swapRole","negate"],"morphemeChain":["dez","pav","fov"],"keyPicture":{"kind":"leaf","count":2,"size":"big","mark":"cross","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub@0:dual>swapRole>negate","kind":"wrong_operator"},"B":{"ruleId":"sub@0:paucal>swapRole>negate","kind":"wrong_operator"},"C":{"ruleId":"full:resize>swapRole>negate","kind":"correct"},"D":{"ruleId":"sub@1:resize>dual>negate","kind":"wrong_operator"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":3,"relabelling":{"optionVotes":[6,6,6,6],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:dual>swapRole>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal>swapRole>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"C":{"lureClass":"correct","ruleId":"full:resize>swapRole>negate","note":"every morpheme applied once, in the order written"},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@1:resize>dual>negate","partialRuleKind":"wrong_operator","note":"read morpheme 2 as a morpheme from the other family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":3,"pair":170}}'::jsonb
  ),
  -- #173 consistent: pictureToWord, depth 3, scope 0, difficulty 8.09, key C
  (
    '6d84549f-183e-43c7-ac9a-1491963b451d', 'VER-MORPHO-01', 'verbal', 8.09, array['4-5'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"tas","stemPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"targetPicture":{"kind":"star","count":3,"size":"big","mark":"none","role":"doer"},"options":[{"key":"A","word":"tas-pav-kib-pef","morphemes":["pav","kib","pef"]},{"key":"B","word":"tas-dez-kib-pef","morphemes":["dez","kib","pef"]},{"key":"C","word":"tas-fov-kib-pef","morphemes":["fov","kib","pef"]},{"key":"D","word":"tas-fov-pav-pef","morphemes":["fov","pav","pef"]}]}'::jsonb,
    '{"correctKey":"C","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["swapRole","resize","negate"],"morphemeChain":["fov","kib","pef"],"keyPicture":{"kind":"star","count":3,"size":"big","mark":"none","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub@0:paucal>resize>negate","kind":"wrong_operator"},"B":{"ruleId":"sub@0:plural>resize>negate","kind":"wrong_operator"},"C":{"ruleId":"full:swapRole>resize>negate","kind":"correct"},"D":{"ruleId":"sub@1:swapRole>paucal>negate","kind":"wrong_operator"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":3,"relabelling":{"optionVotes":[6,6,6,6],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal>resize>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:plural>resize>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"C":{"lureClass":"correct","ruleId":"full:swapRole>resize>negate","note":"every morpheme applied once, in the order written"},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@1:swapRole>paucal>negate","partialRuleKind":"wrong_operator","note":"read morpheme 2 as a morpheme from the other family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":3,"pair":173}}'::jsonb
  ),
  -- #173 perTrial: pictureToWord, depth 3, scope 0, difficulty 8.09, key C
  (
    'a19211a4-36ea-4179-8962-3a7ab8a60d88', 'VER-MORPHO-01', 'verbal', 8.09, array['4-5'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"vaf","stemPicture":{"kind":"star","count":3,"size":"small","mark":"cross","role":"target"},"targetPicture":{"kind":"star","count":3,"size":"big","mark":"none","role":"doer"},"options":[{"key":"A","word":"vaf-kib-pef-dez","morphemes":["kib","pef","dez"]},{"key":"B","word":"vaf-fov-pef-dez","morphemes":["fov","pef","dez"]},{"key":"C","word":"vaf-pog-pef-dez","morphemes":["pog","pef","dez"]},{"key":"D","word":"vaf-pog-kib-dez","morphemes":["pog","kib","dez"]}]}'::jsonb,
    '{"correctKey":"C","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=8|i=5|D3S0","affixMap":{"dez":"negate","fov":"plural","kib":"paucal","pav":"dual","pef":"resize","pog":"swapRole"},"stemMap":{"saz":"leaf","tas":"blob","vaf":"star","zam":"drop"}},"meaningChain":["swapRole","resize","negate"],"morphemeChain":["pog","pef","dez"],"keyPicture":{"kind":"star","count":3,"size":"big","mark":"none","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub@0:paucal>resize>negate","kind":"wrong_operator"},"B":{"ruleId":"sub@0:plural>resize>negate","kind":"wrong_operator"},"C":{"ruleId":"full:swapRole>resize>negate","kind":"correct"},"D":{"ruleId":"sub@1:swapRole>paucal>negate","kind":"wrong_operator"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":3,"relabelling":{"optionVotes":[6,6,6,6],"viableOptions":4,"maxVoteShare":0.25},"distractorRationales":{"A":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:paucal>resize>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"B":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@0:plural>resize>negate","partialRuleKind":"wrong_operator","note":"read morpheme 1 as a morpheme from the other family","attributesFromKey":2},"C":{"lureClass":"correct","ruleId":"full:swapRole>resize>negate","note":"every morpheme applied once, in the order written"},"D":{"lureClass":"rule_violation","lureDetail":"wrong_operator","ruleId":"sub@1:swapRole>paucal>negate","partialRuleKind":"wrong_operator","note":"read morpheme 2 as a morpheme from the other family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":3,"pair":173}}'::jsonb
  ),
  -- #290 consistent: wordToPicture, depth 4, scope 1, difficulty 12.82, key B
  (
    '30d289e1-f21d-40d9-a3f5-e0cc6a488a3d', 'VER-MORPHO-01', 'verbal', 12.82, array['6-8'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"zam","stemPicture":{"kind":"leaf","count":3,"size":"big","mark":"cross","role":"doer"},"word":"zam-kib-pef-pav-fov","wordMorphemes":["kib","pef","pav","fov"],"options":[{"key":"A","picture":{"kind":"leaf","count":1,"size":"big","mark":"cross","role":"target"}},{"key":"B","picture":{"kind":"leaf","count":2,"size":"small","mark":"none","role":"target"}},{"key":"C","picture":{"kind":"leaf","count":3,"size":"big","mark":"cross","role":"target"}},{"key":"D","picture":{"kind":"leaf","count":1,"size":"small","mark":"none","role":"target"}}]}'::jsonb,
    '{"correctKey":"B","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["resize","negate","paucal","swapRole"],"morphemeChain":["kib","pef","pav","fov"],"keyPicture":{"kind":"leaf","count":2,"size":"small","mark":"none","role":"target"},"strategyTrace":{"A":{"ruleId":"sub2@0,1:dual>plural>paucal>swapRole","kind":"wrong_family"},"B":{"ruleId":"full:resize>negate>paucal>swapRole","kind":"correct"},"C":{"ruleId":"sub2@0,1:plural>dual>paucal>swapRole","kind":"wrong_family"},"D":{"ruleId":"sub@2:resize>negate>plural>swapRole","kind":"near_miss"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":4,"relabelling":{"optionVotes":[8,24,8,24],"viableOptions":4,"maxVoteShare":0.38},"distractorRationales":{"A":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>plural>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"B":{"lureClass":"correct","ruleId":"full:resize>negate>paucal>swapRole","note":"every morpheme applied once, in the order written"},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>dual>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"D":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@2:resize>negate>plural>swapRole","partialRuleKind":"near_miss","note":"read morpheme 3 as the other morpheme of its family","attributesFromKey":1}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":4,"pair":290}}'::jsonb
  ),
  -- #290 perTrial: wordToPicture, depth 4, scope 1, difficulty 12.82, key B
  (
    'f8944460-df7a-4f61-a625-27f891d66370', 'VER-MORPHO-01', 'verbal', 12.82, array['6-8'],
    '{"typeCode":"VER-MORPHO-01","direction":"wordToPicture","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"tas","stemPicture":{"kind":"leaf","count":3,"size":"big","mark":"cross","role":"doer"},"word":"tas-pog-pav-kib-pef","wordMorphemes":["pog","pav","kib","pef"],"options":[{"key":"A","picture":{"kind":"leaf","count":1,"size":"big","mark":"cross","role":"target"}},{"key":"B","picture":{"kind":"leaf","count":2,"size":"small","mark":"none","role":"target"}},{"key":"C","picture":{"kind":"leaf","count":3,"size":"big","mark":"cross","role":"target"}},{"key":"D","picture":{"kind":"leaf","count":1,"size":"small","mark":"none","role":"target"}}]}'::jsonb,
    '{"correctKey":"B","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=13|i=2|D4S1","affixMap":{"dez":"dual","fov":"plural","kib":"paucal","pav":"negate","pef":"swapRole","pog":"resize"},"stemMap":{"saz":"star","tas":"leaf","vaf":"drop","zam":"blob"}},"meaningChain":["resize","negate","paucal","swapRole"],"morphemeChain":["pog","pav","kib","pef"],"keyPicture":{"kind":"leaf","count":2,"size":"small","mark":"none","role":"target"},"strategyTrace":{"A":{"ruleId":"sub2@0,1:dual>plural>paucal>swapRole","kind":"wrong_family"},"B":{"ruleId":"full:resize>negate>paucal>swapRole","kind":"correct"},"C":{"ruleId":"sub2@0,1:plural>dual>paucal>swapRole","kind":"wrong_family"},"D":{"ruleId":"sub@2:resize>negate>plural>swapRole","kind":"near_miss"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":4,"relabelling":{"optionVotes":[8,24,8,24],"viableOptions":4,"maxVoteShare":0.38},"distractorRationales":{"A":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>plural>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"B":{"lureClass":"correct","ruleId":"full:resize>negate>paucal>swapRole","note":"every morpheme applied once, in the order written"},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>dual>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"D":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@2:resize>negate>plural>swapRole","partialRuleKind":"near_miss","note":"read morpheme 3 as the other morpheme of its family","attributesFromKey":1}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":4,"pair":290}}'::jsonb
  ),
  -- #293 consistent: pictureToWord, depth 4, scope 1, difficulty 12.94, key A
  (
    '8a5705b7-ff03-44c9-aa80-c9240e4b7809', 'VER-MORPHO-01', 'verbal', 12.94, array['6-8'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"tas","stemPicture":{"kind":"star","count":3,"size":"small","mark":"none","role":"target"},"targetPicture":{"kind":"star","count":2,"size":"big","mark":"cross","role":"doer"},"options":[{"key":"A","word":"tas-kib-pef-pav-fov","morphemes":["kib","pef","pav","fov"]},{"key":"B","word":"tas-pog-dez-pav-fov","morphemes":["pog","dez","pav","fov"]},{"key":"C","word":"tas-dez-pog-pav-fov","morphemes":["dez","pog","pav","fov"]},{"key":"D","word":"tas-kib-pef-dez-fov","morphemes":["kib","pef","dez","fov"]}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["resize","negate","paucal","swapRole"],"morphemeChain":["kib","pef","pav","fov"],"keyPicture":{"kind":"star","count":2,"size":"big","mark":"cross","role":"doer"},"strategyTrace":{"A":{"ruleId":"full:resize>negate>paucal>swapRole","kind":"correct"},"B":{"ruleId":"sub2@0,1:dual>plural>paucal>swapRole","kind":"wrong_family"},"C":{"ruleId":"sub2@0,1:plural>dual>paucal>swapRole","kind":"wrong_family"},"D":{"ruleId":"sub@2:resize>negate>plural>swapRole","kind":"near_miss"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":4,"relabelling":{"optionVotes":[24,8,8,24],"viableOptions":4,"maxVoteShare":0.38},"distractorRationales":{"A":{"lureClass":"correct","ruleId":"full:resize>negate>paucal>swapRole","note":"every morpheme applied once, in the order written"},"B":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>plural>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>dual>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"D":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@2:resize>negate>plural>swapRole","partialRuleKind":"near_miss","note":"read morpheme 3 as the other morpheme of its family","attributesFromKey":1}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":4,"pair":293}}'::jsonb
  ),
  -- #293 perTrial: pictureToWord, depth 4, scope 1, difficulty 12.94, key A
  (
    'a2b7d61d-7165-45f1-ac44-c7e25c48eabf', 'VER-MORPHO-01', 'verbal', 12.94, array['6-8'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"saz","stemPicture":{"kind":"star","count":3,"size":"small","mark":"none","role":"target"},"targetPicture":{"kind":"star","count":2,"size":"big","mark":"cross","role":"doer"},"options":[{"key":"A","word":"saz-pog-pav-kib-dez","morphemes":["pog","pav","kib","dez"]},{"key":"B","word":"saz-pef-fov-kib-dez","morphemes":["pef","fov","kib","dez"]},{"key":"C","word":"saz-fov-pef-kib-dez","morphemes":["fov","pef","kib","dez"]},{"key":"D","word":"saz-pog-pav-fov-dez","morphemes":["pog","pav","fov","dez"]}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=13|i=5|D4S1","affixMap":{"dez":"swapRole","fov":"plural","kib":"paucal","pav":"negate","pef":"dual","pog":"resize"},"stemMap":{"saz":"star","tas":"leaf","vaf":"blob","zam":"drop"}},"meaningChain":["resize","negate","paucal","swapRole"],"morphemeChain":["pog","pav","kib","dez"],"keyPicture":{"kind":"star","count":2,"size":"big","mark":"cross","role":"doer"},"strategyTrace":{"A":{"ruleId":"full:resize>negate>paucal>swapRole","kind":"correct"},"B":{"ruleId":"sub2@0,1:dual>plural>paucal>swapRole","kind":"wrong_family"},"C":{"ruleId":"sub2@0,1:plural>dual>paucal>swapRole","kind":"wrong_family"},"D":{"ruleId":"sub@2:resize>negate>plural>swapRole","kind":"near_miss"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":4,"relabelling":{"optionVotes":[24,8,8,24],"viableOptions":4,"maxVoteShare":0.38},"distractorRationales":{"A":{"lureClass":"correct","ruleId":"full:resize>negate>paucal>swapRole","note":"every morpheme applied once, in the order written"},"B":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:dual>plural>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"C":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:plural>dual>paucal>swapRole","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":3},"D":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@2:resize>negate>plural>swapRole","partialRuleKind":"near_miss","note":"read morpheme 3 as the other morpheme of its family","attributesFromKey":1}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":4,"pair":293}}'::jsonb
  ),
  -- #467 consistent: pictureToWord, depth 4, scope 2, difficulty 19.99, key B
  (
    'cd1995e9-fb73-4f40-ac5f-5caeebe44ae8', 'VER-MORPHO-01', 'verbal', 19.99, array['6-8'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"vaf","stemPicture":{"kind":"drop","count":3,"size":"big","mark":"none","role":"target"},"targetPicture":{"kind":"drop","count":2,"size":"small","mark":"none","role":"doer"},"options":[{"key":"A","word":"vaf-pav-pef-fov-kib","morphemes":["pav","pef","fov","kib"]},{"key":"B","word":"vaf-dez-pog-fov-kib","morphemes":["dez","pog","fov","kib"]},{"key":"C","word":"vaf-pog-dez-fov-kib","morphemes":["pog","dez","fov","kib"]},{"key":"D","word":"vaf-dez-pog-pef-kib","morphemes":["dez","pog","pef","kib"]}]}'::jsonb,
    '{"correctKey":"B","system":{"systemId":"sys-VER-MORPHO-01|v1","affixMap":{"dez":"plural","fov":"swapRole","kib":"resize","pav":"paucal","pef":"negate","pog":"dual"},"stemMap":{"saz":"blob","tas":"star","vaf":"drop","zam":"leaf"}},"meaningChain":["plural","dual","swapRole","resize"],"morphemeChain":["dez","pog","fov","kib"],"keyPicture":{"kind":"drop","count":2,"size":"small","mark":"none","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub2@0,1:paucal>negate>swapRole>resize","kind":"wrong_family"},"B":{"ruleId":"full:plural>dual>swapRole>resize","kind":"correct"},"C":{"ruleId":"swap@0,1:dual>plural>swapRole>resize","kind":"order_error"},"D":{"ruleId":"sub@2:plural>dual>negate>resize","kind":"near_miss"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":3,"relabelling":{"optionVotes":[24,36,36,36],"viableOptions":4,"maxVoteShare":0.27},"distractorRationales":{"A":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:paucal>negate>swapRole>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":1},"B":{"lureClass":"correct","ruleId":"full:plural>dual>swapRole>resize","note":"every morpheme applied once, in the order written"},"C":{"lureClass":"near_order","lureDetail":"order_error","ruleId":"swap@0,1:dual>plural>swapRole>resize","partialRuleKind":"order_error","note":"applied morpheme 1 and morpheme 2 in the wrong order","attributesFromKey":1},"D":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@2:plural>dual>negate>resize","partialRuleKind":"near_miss","note":"read morpheme 3 as the other morpheme of its family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":4,"pair":467}}'::jsonb
  ),
  -- #467 perTrial: pictureToWord, depth 4, scope 2, difficulty 19.99, key B
  (
    '66c1d43d-13e7-44d6-9661-be7d905f7353', 'VER-MORPHO-01', 'verbal', 19.99, array['6-8'],
    '{"typeCode":"VER-MORPHO-01","direction":"pictureToWord","morphemeTray":["dez","fov","kib","pav","pef","pog"],"stem":"vaf","stemPicture":{"kind":"drop","count":3,"size":"big","mark":"none","role":"target"},"targetPicture":{"kind":"drop","count":2,"size":"small","mark":"none","role":"doer"},"options":[{"key":"A","word":"vaf-dez-fov-pef-pav","morphemes":["dez","fov","pef","pav"]},{"key":"B","word":"vaf-pog-kib-pef-pav","morphemes":["pog","kib","pef","pav"]},{"key":"C","word":"vaf-kib-pog-pef-pav","morphemes":["kib","pog","pef","pav"]},{"key":"D","word":"vaf-pog-kib-fov-pav","morphemes":["pog","kib","fov","pav"]}]}'::jsonb,
    '{"correctKey":"B","system":{"systemId":"sys-VER-MORPHO-01|v1|VER-MORPHO-01|rung=20|i=11|D4S2","affixMap":{"dez":"paucal","fov":"negate","kib":"dual","pav":"resize","pef":"swapRole","pog":"plural"},"stemMap":{"saz":"leaf","tas":"star","vaf":"drop","zam":"blob"}},"meaningChain":["plural","dual","swapRole","resize"],"morphemeChain":["pog","kib","pef","pav"],"keyPicture":{"kind":"drop","count":2,"size":"small","mark":"none","role":"doer"},"strategyTrace":{"A":{"ruleId":"sub2@0,1:paucal>negate>swapRole>resize","kind":"wrong_family"},"B":{"ruleId":"full:plural>dual>swapRole>resize","kind":"correct"},"C":{"ruleId":"swap@0,1:dual>plural>swapRole>resize","kind":"order_error"},"D":{"ruleId":"sub@2:plural>dual>negate>resize","kind":"near_miss"}},"strategyTraceRules":["order_error","near_miss","wrong_operator","wrong_family"],"keyDistanceFromStem":3,"relabelling":{"optionVotes":[24,36,36,36],"viableOptions":4,"maxVoteShare":0.27},"distractorRationales":{"A":{"lureClass":"global_mismatch","lureDetail":"wrong_family","ruleId":"sub2@0,1:paucal>negate>swapRole>resize","partialRuleKind":"wrong_family","note":"read morphemes 1 and 2 as two different morphemes","attributesFromKey":1},"B":{"lureClass":"correct","ruleId":"full:plural>dual>swapRole>resize","note":"every morpheme applied once, in the order written"},"C":{"lureClass":"near_order","lureDetail":"order_error","ruleId":"swap@0,1:dual>plural>swapRole>resize","partialRuleKind":"order_error","note":"applied morpheme 1 and morpheme 2 in the wrong order","attributesFromKey":1},"D":{"lureClass":"near_order","lureDetail":"near_miss","ruleId":"sub@2:plural>dual>negate>resize","partialRuleKind":"near_miss","note":"read morpheme 3 as the other morpheme of its family","attributesFromKey":2}}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":4,"pair":467}}'::jsonb
  )
;

-- Two derived fixtures, built from a real item so `content` stays untouched.
--   ff01 ships a DELIBERATELY WRONG stored key, so an assertion can only pass if the verifier
--        re-derived the answer from the mapping.
--   ff02 has the hidden system removed, so there is nothing to re-derive from and the stored
--        key is the documented fallback. Without it, the assertion above could pass on a
--        verifier that simply returned false for anything with a corrupted key.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
select
  '00000000-0000-4000-8000-00000000ff01'::uuid, i.type_code, i.domain, i.difficulty, i.age_bands,
  i.content,
  jsonb_set(
    i.answer_key, '{correctKey}',
    to_jsonb((
      select o.value ->> 'key'
      from jsonb_array_elements(i.content -> 'options') o
      where o.value ->> 'key' <> i.answer_key ->> 'correctKey'
      order by o.value ->> 'key'
      limit 1
    ))
  ),
  i.scoring, '{}'::jsonb
from app.exam_item i
where i.item_id = '315d853c-2203-40b0-94e0-8586b453749b';

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
select
  '00000000-0000-4000-8000-00000000ff02'::uuid, i.type_code, i.domain, i.difficulty, i.age_bands,
  i.content, i.answer_key - 'system', i.scoring, '{}'::jsonb
from app.exam_item i
where i.item_id = '315d853c-2203-40b0-94e0-8586b453749b';

-- Every (fixture, option) pair, with the verdict the database returns for tapping that option.
create temporary table morpho_graded on commit drop as
select
  i.item_id,
  i.provenance #>> '{levers,arm}'                       as arm,
  (i.provenance #>> '{levers,pair}')::integer           as pair,
  o.value ->> 'key'                                     as option_key,
  o.value ->> 'key' = i.answer_key ->> 'correctKey'     as is_key,
  (i.provenance #>> '{levers,depth}')::integer          as depth,
  i.answer_key #>> array['strategyTrace', o.value ->> 'key', 'kind'] as trace_kind,
  app.exam_verify_response(i.item_id, jsonb_build_object('selectedKey', o.value ->> 'key'))
                                                        as verdict
from app.exam_item i
cross join lateral jsonb_array_elements(i.content -> 'options') o
where i.type_code = 'VER-MORPHO-01'
  and i.provenance ? 'levers';

-- --- 1. Firewall posture -----------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'app.exam_verify_ver_morpho(jsonb,jsonb)', 'execute'),
  'anon cannot execute the VER-MORPHO-01 verifier');                                    -- 1
select ok(
  not has_function_privilege('authenticated', 'app.exam_verify_ver_morpho(jsonb,jsonb)', 'execute'),
  'authenticated cannot execute the VER-MORPHO-01 verifier');                           -- 2
select ok(
  not has_function_privilege('service_role', 'app.exam_verify_ver_morpho(jsonb,jsonb)', 'execute'),
  'service_role cannot execute the VER-MORPHO-01 verifier');                            -- 3
select ok(
  has_function_privilege('api_executor', 'app.exam_verify_ver_morpho(jsonb,jsonb)', 'execute'),
  'api_executor CAN execute it — the same posture every other verifier has');           -- 4

-- A null ACL means PUBLIC may execute, so it counts as a violation exactly as an explicit
-- client-role grant does. `exam_vmorpho_denote` is the one that matters most: it takes the
-- hidden form->meaning mapping as an argument.
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname like 'exam_vmorpho%'
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
  'no morphology helper is reachable by PUBLIC, anon, authenticated or service_role'
);                                                                                      -- 5
select is(
  (
    select count(*)::integer from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app' and p.proname like 'exam_vmorpho%'
  ),
  5,
  'all five morphology helpers exist, so assertion 5 is not counting an empty set'
);                                                                                      -- 6

-- --- 2. Dispatch -------------------------------------------------------------------

select is(
  app.exam_verify_response('315d853c-2203-40b0-94e0-8586b453749b', '{}'::jsonb) ->> 'verifier',
  'exam_verify_ver_morpho',
  'the dispatcher routes VER-MORPHO-01 to its own verifier, not the keyed default'
);                                                                                      -- 7

-- --- 3. Grading the real bank ------------------------------------------------------

select is(
  (select count(*)::integer from morpho_graded),
  72,
  '18 real bank items x 4 options are graded below (9 bank indices in both arms)'
);                                                                                      -- 8
select is(
  (
    select count(*)::integer from morpho_graded
    where (verdict ->> 'correct')::boolean is distinct from is_key
  ),
  0,
  'every keyed option grades correct and every other option grades incorrect, on every item'
);                                                                                      -- 9
select is(
  (
    select count(*)::integer from morpho_graded
    where is_key and (verdict #>> '{metrics,M-ERRTYPE}')::double precision is distinct from 1
  ),
  0,
  'a correct answer reports M-ERRTYPE = 1'
);                                                                                      -- 10
select is(
  (
    select count(*)::integer from morpho_graded
    where is_key and (verdict #>> '{metrics,M-RULEID}')::integer is distinct from depth
  ),
  0,
  'M-RULEID is the composition depth the bank declares for the item'
);                                                                                      -- 11
select is(
  (
    select count(*)::integer from morpho_graded
    where not is_key and verdict #> '{metrics,M-RULEID}' is not null
  ),
  0,
  'a wrong answer binds an unknown number of rules, so it reports no M-RULEID'
);                                                                                      -- 12

-- --- 4. The error ladder, and the re-derivation ------------------------------------

-- 0.9 x the nearness of the named partial rule the chosen option encodes, ordered by how much of
-- the system the error still holds. Compared to 1e-9 because both tiers compute it in binary64.
select is(
  (
    select count(*)::integer from morpho_graded
    where not is_key
      and abs(
        (verdict #>> '{metrics,M-ERRTYPE}')::double precision
        - 0.9::double precision * (case trace_kind
            when 'order_error'    then 1.0
            when 'near_miss'      then 0.7
            when 'wrong_operator' then 0.55
            when 'wrong_family'   then 0.25
          end)
      ) > 1e-9
  ),
  0,
  'every wrong option is priced at 0.9 x the nearness of the partial rule it encodes'
);                                                                                      -- 13
select is(
  (select count(distinct trace_kind)::integer from morpho_graded where not is_key),
  4,
  'the fixtures exercise all four distractor classes, so assertion 13 covers the whole ladder'
);                                                                                      -- 14
select ok(
  (
    select max((verdict #>> '{metrics,M-ERRTYPE}')::double precision)
    from morpho_graded where not is_key
  ) < 1,
  'no wrong answer can tie a correct one at 1'
);                                                                                      -- 15

select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-00000000ff01',
    '{"selectedKey":"B"}'::jsonb
  ) ->> 'correct'),
  'true',
  'the key is re-derived through the hidden mapping, so a corrupted stored key changes nothing'
);                                                                                      -- 16
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-00000000ff01',
    '{"selectedKey":"A"}'::jsonb
  ) ->> 'correct'),
  'false',
  'and the corrupted key itself is not credited'
);                                                                                      -- 17
select is(
  (app.exam_verify_response(
    '00000000-0000-4000-8000-00000000ff02',
    '{"selectedKey":"B"}'::jsonb
  ) ->> 'correct'),
  'true',
  'with the hidden system removed there is nothing to re-derive, so the stored key is the fallback'
);                                                                                      -- 18

-- --- The verdict payload carries no key material -----------------------------------

select ok(
  (
    select string_agg(verdict::text, '') from morpho_graded
  ) !~ '(answer_key|answerKey|correctKey|affixMap|stemMap|meaningChain|keyPicture|strategyTrace|distractorRationales|relabelling|provenance)',
  'no verdict returns a key, a mapping, or a derived expected answer'
);                                                                                      -- 19

select is(
  (
    select count(*)::integer from morpho_graded
    where is_key and (verdict ->> 'correct')::boolean
  ),
  18,
  'one option per fixture actually graded CORRECT, so the assertions above are not vacuous'
);                                                                                      -- 20

select * from finish();

rollback;
