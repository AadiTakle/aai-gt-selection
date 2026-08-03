-- FLU-OPCHAIN-01's in-database verifier, graded against REAL BANK ITEMS
-- (20260731120000_exam_verify_opchain.sql; STAGE2_QUESTION_DESIGN §9.2 U7; serves R11, D-027).
--
-- WHY THIS FILE EXISTS AT ALL. It did not, until this audit. FLU-OPCHAIN-01 was the first of the
-- four Stage 2 learning-block types to get a plpgsql verifier and the only one that never got a
-- pgTAP file of its own; `123_exam_verify_plpgsql.test.sql` swept its ACLs along with every other
-- `app.exam_v%` function, so the firewall posture was covered, but nothing in the database tier
-- ever checked that `app.exam_verify_opchain` produces the right answer. The app tier did
-- (`verifiers/fluid-verifiers.test.ts` grades both whole banks), so the gap was invisible from
-- either side on its own.
--
-- Five things are proved here, in this order:
--   1. FIREWALL POSTURE — the verifier and the D4 helper it needs are reachable only from
--      api_executor. A new function's ACL is null until something touches it and a null ACL means
--      PUBLIC may execute, so the revoke is what does the work.
--   2. DISPATCH — the registry row exists and `app.exam_verify_response` resolves the type to it.
--   3. GRADING THE ACTUAL BANK — eleven items lifted from
--      `research/exam-question-types/banks/FLU-OPCHAIN-01.jsonl` and its equated control arm,
--      chosen to cover all six operators, all four badge-chain depths, both ends of the difficulty
--      ladder, and all six named distractor classes. On every one of them the correct key scores 1
--      and each of the four distractors scores 0, with the metric map the app-tier verifier
--      produces for the same inputs.
--   4. THE KEY IS RE-DERIVED, NOT READ — assertions 18 and 19, which are the reason this file was
--      written the way it was. See the note above them.
--   5. THE VERDICT LEAKS NOTHING — no key, no hidden mapping, no operator vocabulary.
--
-- WHAT THE FIXTURES ARE. `content` and `scoring` verbatim, and the full `answer` less
-- `distractorRationales` — per-option prose written for a human, unreachable from this verifier,
-- and the majority of the blob's bytes. `provenance` is replaced by the arm and depth this file
-- groups on, which also drops the generator's `levers` blob: the verifier must not read the arm,
-- because one verifier serves both arms with no branch between them (§4.1.1), and a port that
-- started reading it would fail on this fixture.
--
-- WHY REAL ITEMS AND NOT A HAND-WRITTEN FIXTURE. The verifier's job is to reproduce the
-- generator's answer key on the bank the exam will serve. A fixture written by the same hand that
-- wrote the verifier proves the two agree with each other and nothing about the bank.
--
-- WHAT THIS DOES NOT PROVE. Cross-tier parity across the WHOLE bank and both persistence arms
-- needs both implementations in one process; `pnpm exam:verify:diff` does that. This file pins the
-- contract that harness relies on, on a slice small enough to live in the repo.
--
-- Born-synthetic throughout (syntheticOnly = true, validated = false), and NOT GATED: Gate B needs
-- roughly 128 real children (§4.1.3) and nothing here is evidence about one.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(22);

grant usage on schema extensions to api_executor, authenticated;

-- --- The bank slice ----------------------------------------------------------------

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values ('FLU-OPCHAIN-01', 'fluid_reasoning', 'Machine Chain', 'FLU-OPCHAIN-01.html',
        array['M-ERRTYPE', 'M-RULEID'])
on conflict (type_code) do nothing;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values
  -- consistent arm, difficulty 1.01, depth 1, chain twin, key A
  (
    'd10e5283-a90b-433e-ba3e-2e61ab56dcdc', 'FLU-OPCHAIN-01', 'fluid_reasoning', 1.01,
    array['K-1'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"hollow","border":0,"pair":1},"chain":["circle"],"options":[{"key":"A","figure":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"hollow","border":0,"pair":0}},{"key":"B","figure":{"glyph":"flag","orient":{"a":0,"b":0},"shade":"hollow","border":0,"pair":1}},{"key":"C","figure":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"hollow","border":1,"pair":1}},{"key":"D","figure":{"glyph":"flag","orient":{"a":1,"b":0},"shade":"hollow","border":0,"pair":1}},{"key":"E","figure":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"solid","border":0,"pair":1}}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-FLU-OPCHAIN-01|v1","mapping":{"circle":"twin","square":"swap","triangle":"ring","diamond":"turn","hexagon":"flip","star":"slant"}},"operatorChain":["twin"],"badgeChain":["circle"],"strategyTrace":{"A":{"ruleId":"full:twin","kind":"correct"},"B":{"ruleId":"sub@0=flip:flip","kind":"wrong_operator"},"C":{"ruleId":"sub@0=ring:ring","kind":"wrong_operator"},"D":{"ruleId":"sub@0=slant:slant","kind":"wrong_operator"},"E":{"ruleId":"sub@0=swap:swap","kind":"wrong_operator"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":1,"relabelling":{"optionVotes":[1,1,1,1,1],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":1}}'::jsonb
  ),
  -- perTrial arm, difficulty 1.01, depth 1, chain twin, key A
  (
    'ed585101-3842-4c40-99d5-6a10b6471f59', 'FLU-OPCHAIN-01', 'fluid_reasoning', 1.01,
    array['K-1'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"hollow","border":0,"pair":1},"chain":["circle"],"options":[{"key":"A","figure":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"hollow","border":0,"pair":0}},{"key":"B","figure":{"glyph":"flag","orient":{"a":0,"b":0},"shade":"hollow","border":0,"pair":1}},{"key":"C","figure":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"hollow","border":1,"pair":1}},{"key":"D","figure":{"glyph":"flag","orient":{"a":1,"b":0},"shade":"hollow","border":0,"pair":1}},{"key":"E","figure":{"glyph":"flag","orient":{"a":0,"b":1},"shade":"solid","border":0,"pair":1}}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-FLU-OPCHAIN-01|v1|FLU-OPCHAIN-01|rung=1|i=0|D1G0","mapping":{"circle":"twin","square":"flip","triangle":"slant","diamond":"ring","hexagon":"turn","star":"swap"}},"operatorChain":["twin"],"badgeChain":["circle"],"strategyTrace":{"A":{"ruleId":"full:twin","kind":"correct"},"B":{"ruleId":"sub@0=flip:flip","kind":"wrong_operator"},"C":{"ruleId":"sub@0=ring:ring","kind":"wrong_operator"},"D":{"ruleId":"sub@0=slant:slant","kind":"wrong_operator"},"E":{"ruleId":"sub@0=swap:swap","kind":"wrong_operator"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":1,"relabelling":{"optionVotes":[1,1,1,1,1],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":1}}'::jsonb
  ),
  -- consistent arm, difficulty 4.03, depth 2, chain twin>swap, key E
  (
    '372abeac-d94e-4f41-af8a-6119e8d54c03', 'FLU-OPCHAIN-01', 'fluid_reasoning', 4.03,
    array['2-3'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"solid","border":1,"pair":0},"chain":["circle","square"],"options":[{"key":"A","figure":{"glyph":"boot","orient":{"a":3,"b":1},"shade":"hollow","border":1,"pair":0}},{"key":"B","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"hollow","border":0,"pair":0}},{"key":"C","figure":{"glyph":"boot","orient":{"a":0,"b":1},"shade":"hollow","border":1,"pair":0}},{"key":"D","figure":{"glyph":"boot","orient":{"a":2,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"E","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"hollow","border":1,"pair":1}}]}'::jsonb,
    '{"correctKey":"E","system":{"systemId":"sys-FLU-OPCHAIN-01|v1","mapping":{"circle":"twin","square":"swap","triangle":"ring","diamond":"turn","hexagon":"flip","star":"slant"}},"operatorChain":["twin","swap"],"badgeChain":["circle","square"],"strategyTrace":{"A":{"ruleId":"sub@0=flip:flip>swap","kind":"wrong_operator"},"B":{"ruleId":"sub@0=ring:ring>swap","kind":"wrong_operator"},"C":{"ruleId":"sub@0=slant:slant>swap","kind":"wrong_operator"},"D":{"ruleId":"sub@0=turn:turn>swap","kind":"wrong_operator"},"E":{"ruleId":"full:twin>swap","kind":"correct"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":2,"relabelling":{"optionVotes":[2,2,2,2,2],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":2}}'::jsonb
  ),
  -- perTrial arm, difficulty 4.03, depth 2, chain twin>swap, key E
  (
    'bf9b1d5f-e0ea-4165-b618-6a620d5af89f', 'FLU-OPCHAIN-01', 'fluid_reasoning', 4.03,
    array['2-3'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"solid","border":1,"pair":0},"chain":["triangle","hexagon"],"options":[{"key":"A","figure":{"glyph":"boot","orient":{"a":3,"b":1},"shade":"hollow","border":1,"pair":0}},{"key":"B","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"hollow","border":0,"pair":0}},{"key":"C","figure":{"glyph":"boot","orient":{"a":0,"b":1},"shade":"hollow","border":1,"pair":0}},{"key":"D","figure":{"glyph":"boot","orient":{"a":2,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"E","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"hollow","border":1,"pair":1}}]}'::jsonb,
    '{"correctKey":"E","system":{"systemId":"sys-FLU-OPCHAIN-01|v1|FLU-OPCHAIN-01|rung=4|i=2|D2G0","mapping":{"circle":"flip","square":"slant","triangle":"twin","diamond":"turn","hexagon":"swap","star":"ring"}},"operatorChain":["twin","swap"],"badgeChain":["triangle","hexagon"],"strategyTrace":{"A":{"ruleId":"sub@0=flip:flip>swap","kind":"wrong_operator"},"B":{"ruleId":"sub@0=ring:ring>swap","kind":"wrong_operator"},"C":{"ruleId":"sub@0=slant:slant>swap","kind":"wrong_operator"},"D":{"ruleId":"sub@0=turn:turn>swap","kind":"wrong_operator"},"E":{"ruleId":"full:twin>swap","kind":"correct"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":2,"relabelling":{"optionVotes":[2,2,2,2,2],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":2}}'::jsonb
  ),
  -- perTrial arm, difficulty 9.66, depth 3, chain slant>ring>swap, key A
  (
    '4101f614-5c13-498a-9314-063df74f9d70', 'FLU-OPCHAIN-01', 'fluid_reasoning', 9.66,
    array['4-5'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"solid","border":0,"pair":0},"chain":["star","diamond","triangle"],"options":[{"key":"A","figure":{"glyph":"comma","orient":{"a":3,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"B","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"solid","border":0,"pair":0}},{"key":"C","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"hollow","border":1,"pair":1}},{"key":"D","figure":{"glyph":"comma","orient":{"a":3,"b":0},"shade":"hollow","border":0,"pair":1}},{"key":"E","figure":{"glyph":"comma","orient":{"a":3,"b":0},"shade":"solid","border":1,"pair":1}}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-FLU-OPCHAIN-01|v1|FLU-OPCHAIN-01|rung=9.5|i=11|D3G1","mapping":{"circle":"flip","square":"twin","triangle":"swap","diamond":"ring","hexagon":"turn","star":"slant"}},"operatorChain":["slant","ring","swap"],"badgeChain":["star","diamond","triangle"],"strategyTrace":{"A":{"ruleId":"full:slant>ring>swap","kind":"correct"},"B":{"ruleId":"identity:none","kind":"identity_copy"},"C":{"ruleId":"sub@0=twin:twin>ring>swap","kind":"wrong_operator"},"D":{"ruleId":"sub@1=twin:slant>twin>swap","kind":"wrong_operator"},"E":{"ruleId":"sub@2=twin:slant>ring>twin","kind":"wrong_operator"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":3,"relabelling":{"optionVotes":[6,3,6,6,6],"viableOptions":5,"maxVoteShare":0.22,"minVoteShare":0.11}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":3}}'::jsonb
  ),
  -- perTrial arm, difficulty 15.18, depth 4, chain twin>flip>slant>ring, key C
  (
    '83e20c5c-1ce3-4213-9f10-03eddb47c636', 'FLU-OPCHAIN-01', 'fluid_reasoning', 15.18,
    array['6-8'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"comma","orient":{"a":1,"b":1},"shade":"hollow","border":1,"pair":0},"chain":["hexagon","triangle","star","diamond"],"options":[{"key":"A","figure":{"glyph":"comma","orient":{"a":1,"b":1},"shade":"hollow","border":1,"pair":1}},{"key":"B","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"solid","border":0,"pair":0}},{"key":"C","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"hollow","border":0,"pair":1}},{"key":"D","figure":{"glyph":"comma","orient":{"a":3,"b":1},"shade":"hollow","border":0,"pair":0}},{"key":"E","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"solid","border":1,"pair":1}}]}'::jsonb,
    '{"correctKey":"C","system":{"systemId":"sys-FLU-OPCHAIN-01|v1|FLU-OPCHAIN-01|rung=15|i=11|D4G2","mapping":{"circle":"swap","square":"turn","triangle":"flip","diamond":"ring","hexagon":"twin","star":"slant"}},"operatorChain":["twin","flip","slant","ring"],"badgeChain":["hexagon","triangle","star","diamond"],"strategyTrace":{"A":{"ruleId":"firstOnly:twin","kind":"first_step_only"},"B":{"ruleId":"sub@0=swap:swap>flip>slant>ring","kind":"wrong_operator"},"C":{"ruleId":"full:twin>flip>slant>ring","kind":"correct"},"D":{"ruleId":"sub@0=turn:turn>flip>slant>ring","kind":"wrong_operator"},"E":{"ruleId":"sub@3=swap:twin>flip>slant>swap","kind":"wrong_operator"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":3,"relabelling":{"optionVotes":[12,12,12,12,12],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":4}}'::jsonb
  ),
  -- consistent arm, difficulty 15.18, depth 4, chain twin>flip>slant>ring, key C
  (
    '89f65b66-38d1-47f1-b8be-77489dd61927', 'FLU-OPCHAIN-01', 'fluid_reasoning', 15.18,
    array['6-8'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"comma","orient":{"a":1,"b":1},"shade":"hollow","border":1,"pair":0},"chain":["circle","hexagon","star","triangle"],"options":[{"key":"A","figure":{"glyph":"comma","orient":{"a":1,"b":1},"shade":"hollow","border":1,"pair":1}},{"key":"B","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"solid","border":0,"pair":0}},{"key":"C","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"hollow","border":0,"pair":1}},{"key":"D","figure":{"glyph":"comma","orient":{"a":3,"b":1},"shade":"hollow","border":0,"pair":0}},{"key":"E","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"solid","border":1,"pair":1}}]}'::jsonb,
    '{"correctKey":"C","system":{"systemId":"sys-FLU-OPCHAIN-01|v1","mapping":{"circle":"twin","square":"swap","triangle":"ring","diamond":"turn","hexagon":"flip","star":"slant"}},"operatorChain":["twin","flip","slant","ring"],"badgeChain":["circle","hexagon","star","triangle"],"strategyTrace":{"A":{"ruleId":"firstOnly:twin","kind":"first_step_only"},"B":{"ruleId":"sub@0=swap:swap>flip>slant>ring","kind":"wrong_operator"},"C":{"ruleId":"full:twin>flip>slant>ring","kind":"correct"},"D":{"ruleId":"sub@0=turn:turn>flip>slant>ring","kind":"wrong_operator"},"E":{"ruleId":"sub@3=swap:twin>flip>slant>swap","kind":"wrong_operator"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":3,"relabelling":{"optionVotes":[12,12,12,12,12],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":4}}'::jsonb
  ),
  -- perTrial arm, difficulty 15.54, depth 4, chain ring>twin>turn>flip, key A
  (
    '40428d3f-463e-40da-b1df-bc8014c1f868', 'FLU-OPCHAIN-01', 'fluid_reasoning', 15.54,
    array['6-8'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"comma","orient":{"a":3,"b":1},"shade":"hollow","border":0,"pair":1},"chain":["star","hexagon","triangle","diamond"],"options":[{"key":"A","figure":{"glyph":"comma","orient":{"a":0,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"B","figure":{"glyph":"comma","orient":{"a":1,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"C","figure":{"glyph":"comma","orient":{"a":2,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"D","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"hollow","border":1,"pair":0}},{"key":"E","figure":{"glyph":"comma","orient":{"a":3,"b":0},"shade":"hollow","border":1,"pair":0}}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-FLU-OPCHAIN-01|v1|FLU-OPCHAIN-01|rung=15.5|i=7|D4G2","mapping":{"circle":"swap","square":"slant","triangle":"turn","diamond":"flip","hexagon":"twin","star":"ring"}},"operatorChain":["ring","twin","turn","flip"],"badgeChain":["star","hexagon","triangle","diamond"],"strategyTrace":{"A":{"ruleId":"full:ring>twin>turn>flip","kind":"correct"},"B":{"ruleId":"drop@2:ring>twin>flip","kind":"omission"},"C":{"ruleId":"reorder@2:ring>twin>flip>turn","kind":"order_error"},"D":{"ruleId":"sub@2=slant:ring>twin>slant>flip","kind":"wrong_operator"},"E":{"ruleId":"twice@2:ring>twin>turn>turn>flip","kind":"over_application"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":3,"relabelling":{"optionVotes":[12,12,12,12,12],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":4}}'::jsonb
  ),
  -- consistent arm, difficulty 15.54, depth 4, chain ring>twin>turn>flip, key A
  (
    'ab943323-be46-47ee-ac28-d65aace1f827', 'FLU-OPCHAIN-01', 'fluid_reasoning', 15.54,
    array['6-8'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"comma","orient":{"a":3,"b":1},"shade":"hollow","border":0,"pair":1},"chain":["triangle","circle","diamond","hexagon"],"options":[{"key":"A","figure":{"glyph":"comma","orient":{"a":0,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"B","figure":{"glyph":"comma","orient":{"a":1,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"C","figure":{"glyph":"comma","orient":{"a":2,"b":0},"shade":"hollow","border":1,"pair":0}},{"key":"D","figure":{"glyph":"comma","orient":{"a":2,"b":1},"shade":"hollow","border":1,"pair":0}},{"key":"E","figure":{"glyph":"comma","orient":{"a":3,"b":0},"shade":"hollow","border":1,"pair":0}}]}'::jsonb,
    '{"correctKey":"A","system":{"systemId":"sys-FLU-OPCHAIN-01|v1","mapping":{"circle":"twin","square":"swap","triangle":"ring","diamond":"turn","hexagon":"flip","star":"slant"}},"operatorChain":["ring","twin","turn","flip"],"badgeChain":["triangle","circle","diamond","hexagon"],"strategyTrace":{"A":{"ruleId":"full:ring>twin>turn>flip","kind":"correct"},"B":{"ruleId":"drop@2:ring>twin>flip","kind":"omission"},"C":{"ruleId":"reorder@2:ring>twin>flip>turn","kind":"order_error"},"D":{"ruleId":"sub@2=slant:ring>twin>slant>flip","kind":"wrong_operator"},"E":{"ruleId":"twice@2:ring>twin>turn>turn>flip","kind":"over_application"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":3,"relabelling":{"optionVotes":[12,12,12,12,12],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":4}}'::jsonb
  ),
  -- consistent arm, difficulty 19.02, depth 4, chain slant>swap>turn>flip, key D
  (
    '969ffedb-67ec-4ea9-a2fd-2543292a262d', 'FLU-OPCHAIN-01', 'fluid_reasoning', 19.02,
    array['6-8'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"boot","orient":{"a":3,"b":0},"shade":"hollow","border":0,"pair":1},"chain":["star","square","diamond","hexagon"],"options":[{"key":"A","figure":{"glyph":"boot","orient":{"a":3,"b":0},"shade":"solid","border":0,"pair":1}},{"key":"B","figure":{"glyph":"boot","orient":{"a":0,"b":1},"shade":"solid","border":1,"pair":1}},{"key":"C","figure":{"glyph":"boot","orient":{"a":0,"b":1},"shade":"solid","border":0,"pair":0}},{"key":"D","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"solid","border":0,"pair":1}},{"key":"E","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"hollow","border":1,"pair":1}}]}'::jsonb,
    '{"correctKey":"D","system":{"systemId":"sys-FLU-OPCHAIN-01|v1","mapping":{"circle":"twin","square":"swap","triangle":"ring","diamond":"turn","hexagon":"flip","star":"slant"}},"operatorChain":["slant","swap","turn","flip"],"badgeChain":["star","square","diamond","hexagon"],"strategyTrace":{"A":{"ruleId":"reorder@2:slant>swap>flip>turn","kind":"order_error"},"B":{"ruleId":"sub@0=ring:ring>swap>turn>flip","kind":"wrong_operator"},"C":{"ruleId":"sub@0=twin:twin>swap>turn>flip","kind":"wrong_operator"},"D":{"ruleId":"full:slant>swap>turn>flip","kind":"correct"},"E":{"ruleId":"sub@1=ring:slant>ring>turn>flip","kind":"wrong_operator"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":2,"relabelling":{"optionVotes":[12,12,12,12,12],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"consistent","depth":4}}'::jsonb
  ),
  -- perTrial arm, difficulty 19.02, depth 4, chain slant>swap>turn>flip, key D
  (
    'd0a09f11-c6b7-477e-9e84-a04b1b7aeb3c', 'FLU-OPCHAIN-01', 'fluid_reasoning', 19.02,
    array['6-8'],
    '{"typeCode":"FLU-OPCHAIN-01","badgeTray":["circle","square","triangle","diamond","hexagon","star"],"input":{"glyph":"boot","orient":{"a":3,"b":0},"shade":"hollow","border":0,"pair":1},"chain":["star","hexagon","square","triangle"],"options":[{"key":"A","figure":{"glyph":"boot","orient":{"a":3,"b":0},"shade":"solid","border":0,"pair":1}},{"key":"B","figure":{"glyph":"boot","orient":{"a":0,"b":1},"shade":"solid","border":1,"pair":1}},{"key":"C","figure":{"glyph":"boot","orient":{"a":0,"b":1},"shade":"solid","border":0,"pair":0}},{"key":"D","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"solid","border":0,"pair":1}},{"key":"E","figure":{"glyph":"boot","orient":{"a":1,"b":0},"shade":"hollow","border":1,"pair":1}}]}'::jsonb,
    '{"correctKey":"D","system":{"systemId":"sys-FLU-OPCHAIN-01|v1|FLU-OPCHAIN-01|rung=19|i=6|D4G3","mapping":{"circle":"twin","square":"turn","triangle":"flip","diamond":"ring","hexagon":"swap","star":"slant"}},"operatorChain":["slant","swap","turn","flip"],"badgeChain":["star","hexagon","square","triangle"],"strategyTrace":{"A":{"ruleId":"reorder@2:slant>swap>flip>turn","kind":"order_error"},"B":{"ruleId":"sub@0=ring:ring>swap>turn>flip","kind":"wrong_operator"},"C":{"ruleId":"sub@0=twin:twin>swap>turn>flip","kind":"wrong_operator"},"D":{"ruleId":"full:slant>swap>turn>flip","kind":"correct"},"E":{"ruleId":"sub@1=ring:slant>ring>turn>flip","kind":"wrong_operator"}},"strategyTraceRules":["order_error","over_application","omission","wrong_operator","first_step_only","identity_copy"],"keyDistanceFromInput":2,"relabelling":{"optionVotes":[12,12,12,12,12],"viableOptions":5,"maxVoteShare":0.2,"minVoteShare":0.2}}'::jsonb,
    '{"mode":"deterministic_key"}'::jsonb,
    '{"levers":{"arm":"perTrial","depth":4}}'::jsonb
  )
;

-- Every option of every sampled item, with the verdict the dispatcher returns for choosing it.
-- Materialised BEFORE the tampered copies below are inserted, so the aggregates that follow are
-- over the real bank slice only.
create temporary table opchain_option as
select
  i.item_id,
  (i.answer_key ->> 'correctKey')                                    as correct_key,
  i.provenance #>> '{levers,arm}'                                    as arm,
  o.value ->> 'key'                                                  as option_key,
  i.answer_key #>> array['strategyTrace', o.value ->> 'key', 'kind'] as kind,
  jsonb_array_length(i.content -> 'chain')                           as depth,
  i.difficulty,
  app.exam_verify_response(i.item_id, jsonb_build_object('selectedKey', o.value ->> 'key'))
                                                                     as verdict
from app.exam_item i
cross join lateral jsonb_array_elements(i.content -> 'options') o
where i.type_code = 'FLU-OPCHAIN-01'
  and i.provenance ? 'levers';

-- The generator's own nearness axis, re-stated here rather than read from the verifier, so the
-- two have to agree. Six classes: this grammar has no `wrong_axis` or `wrong_family`, which are
-- SPA-XFORM-01's two extra.
create temporary table opchain_nearness (kind text primary key, nearness double precision);
insert into opchain_nearness (kind, nearness) values
  ('order_error', 1.0),
  ('over_application', 0.85),
  ('omission', 0.7),
  ('wrong_operator', 0.55),
  ('first_step_only', 0.25),
  ('identity_copy', 0.0);

-- --- 1. Firewall posture -----------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'app.exam_verify_opchain(jsonb,jsonb)', 'execute'),
  'anon cannot execute the FLU-OPCHAIN-01 verifier');                                   -- 1
select ok(
  not has_function_privilege('authenticated', 'app.exam_verify_opchain(jsonb,jsonb)', 'execute'),
  'authenticated cannot execute the FLU-OPCHAIN-01 verifier');                          -- 2
select ok(
  not has_function_privilege('service_role', 'app.exam_verify_opchain(jsonb,jsonb)', 'execute'),
  'service_role cannot execute the FLU-OPCHAIN-01 verifier');                           -- 3
select ok(
  has_function_privilege('api_executor', 'app.exam_verify_opchain(jsonb,jsonb)', 'execute'),
  'api_executor CAN execute it, so api.exam_submit_response still grades');              -- 4

-- A verifier answers "is this response correct" against the server-only key, so any role that can
-- call it can walk the key out one query at a time. `exam_vopchain_orient` is the D4 product —
-- the orientation half of the operator vocabulary itself.
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and (p.proname like 'exam_vopchain%' or p.proname = 'exam_verify_opchain')
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
  (select verifier_fn from app.exam_verifier_registry where type_code = 'FLU-OPCHAIN-01'),
  'exam_verify_opchain',
  'the registry routes FLU-OPCHAIN-01 to the ported verifier'
);                                                                                      -- 6
select is(
  (select count(distinct (verdict ->> 'verifier'))::integer from opchain_option),
  1,
  'every graded response went through one verifier, not a mix of the per-type and the default'
);                                                                                      -- 7

-- --- 3. Grading the real bank ------------------------------------------------------

-- Anti-vacuity: the aggregates below say nothing if the slice is empty, one item wide, at one
-- rung, or drawn from one arm. The bank ladder runs 1..20 over depths 1..4 and this slice spans it
-- in both arms.
select ok(
  (select count(distinct item_id) from opchain_option) = 11
    and (select count(*) from opchain_option) = 55
    and (select count(distinct depth) from opchain_option) = 4
    and (select count(distinct arm) from opchain_option) = 2
    and (select min(difficulty) from opchain_option) < 2
    and (select max(difficulty) from opchain_option) > 19,
  'the slice is 11 real bank items x 5 options, spanning depths 1-4, both arms and the 1..20 ladder'
);                                                                                      -- 8

select is(
  (select count(*)::integer from opchain_option
   where option_key = correct_key and (verdict ->> 'correct') = 'true'),
  11,
  'the key the operator chain produces scores CORRECT on every sampled bank item'
);                                                                                      -- 9
select is(
  (select count(*)::integer from opchain_option
   where option_key = correct_key and (verdict ->> 'score') = '1'),
  11,
  'and scores 1'
);                                                                                      -- 10
select is(
  (select count(*)::integer from opchain_option
   where option_key <> correct_key and (verdict ->> 'correct') = 'false'),
  44,
  'every one of the four distractors on every sampled item scores INCORRECT'
);                                                                                      -- 11
select is(
  (select count(*)::integer from opchain_option
   where option_key <> correct_key and (verdict ->> 'score') = '0'),
  44,
  'and scores 0'
);                                                                                      -- 12

-- One verifier, both arms, no branch between them (§4.1.1). The control arm re-draws the
-- badge->operator mapping every item, so an implementation that had cached or assumed one mapping
-- would grade those and only those wrong.
select is(
  (select count(*)::integer from opchain_option
   where arm = 'perTrial' and option_key = correct_key and (verdict ->> 'correct') = 'true'),
  6,
  'the same function grades the scrambled-system CONTROL arm, whose mapping is redrawn per item'
);                                                                                      -- 13

select is(
  (select count(*)::integer from opchain_option
   where option_key = correct_key and (verdict #>> '{metrics,M-ERRTYPE}') = '1'),
  11,
  'M-ERRTYPE is exactly 1 on a correct answer, so no wrong answer can tie it'
);                                                                                      -- 14
select is(
  (select count(*)::integer from opchain_option
   where option_key = correct_key
     and (verdict #>> '{metrics,M-RULEID}')::integer = depth),
  11,
  'M-RULEID reports the badge-chain length the child bound, on a correct answer'
);                                                                                      -- 15
select is(
  (select count(*)::integer from opchain_option
   where option_key <> correct_key and (verdict -> 'metrics') ? 'M-RULEID'),
  0,
  'a wrong answer bound an unknown number of rules, so it reports no M-RULEID'
);                                                                                      -- 16

select is(
  (select count(*)::integer
   from opchain_option o
   join opchain_nearness n on n.kind = o.kind
   where o.option_key <> o.correct_key
     and abs((o.verdict #>> '{metrics,M-ERRTYPE}')::double precision - 0.9 * n.nearness) > 1e-9),
  0,
  'M-ERRTYPE is 0.9 x the generator''s own nearness for the partial rule each distractor encodes'
);                                                                                      -- 17
select is(
  (select count(distinct kind)::integer from opchain_option where option_key <> correct_key),
  6,
  'assertion 17 is not vacuous: the slice exercises all 6 named failure classes'
);                                                                                      -- 18

-- --- 4. The key is re-derived, not read --------------------------------------------

-- Assertions 9 to 18 CANNOT tell a correct derivation from a failed one, and that is not a
-- hypothetical: the port falls back to `answer.correctKey` when the derivation names no single
-- option, which is a faithful port of the TypeScript and is what keeps an unreadable item graded
-- rather than refused. A verifier whose D4 product is wrong, or whose operator vocabulary has a
-- hole, derives nothing, drops through to the stored key, and passes all ten.
--
-- So the derivation is pinned separately, on the same real items, by ROTATING THE STORED KEY to
-- another option. If the operator chain is what decides, the true key still wins; if the fallback
-- is what decided, the rotated key wins instead. There is no third outcome. Measured: with these
-- two assertions in place, breaking any one of the six operators fails this file, and without
-- them, ten of the twelve single-operator mutations pass it.
create temporary table opchain_tamper as
select
  md5(o.item_id::text || '|tampered')::uuid as item_id,
  o.correct_key,
  (
    select e.value ->> 'key'
    from jsonb_array_elements(i2.content -> 'options') e
    where e.value ->> 'key' <> o.correct_key
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
  ) as answer_key,
  i2.difficulty,
  i2.age_bands
from (select distinct item_id, correct_key from opchain_option) o
join app.exam_item i2 on i2.item_id = o.item_id;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
select t.item_id, 'FLU-OPCHAIN-01', 'fluid_reasoning', t.difficulty, t.age_bands,
       t.content, t.answer_key, jsonb_build_object('mode', 'deterministic_key'), '{}'::jsonb
from opchain_tamper t;

select is(
  (select count(*)::integer from opchain_tamper t
   where (app.exam_verify_response(t.item_id, jsonb_build_object('selectedKey', t.correct_key))
          ->> 'correct') = 'true'),
  11,
  'the operator chain decides on every sampled bank item: the true key wins over a rotated one'
);                                                                                      -- 19
select is(
  (select count(*)::integer from opchain_tamper t
   where (app.exam_verify_response(t.item_id, jsonb_build_object('selectedKey', t.rotated_key))
          ->> 'correct') = 'true'),
  0,
  'and the rotated key never wins, so assertions 9-18 were not riding the stored-key fallback'
);                                                                                      -- 20

-- --- 5. Failing closed, and saying nothing ------------------------------------------

select is(
  app.exam_verify_response(
    (select item_id from opchain_option order by item_id limit 1), '{}'::jsonb
  )::jsonb - 'verifier' - 'mode',
  '{"score": 0, "correct": false, "metrics": {}}'::jsonb,
  'a response naming no option is incorrect and carries no metrics'
);                                                                                      -- 21

-- The verdict is the only thing that crosses back out of the schema the key lives in, so it must
-- name neither the key, nor the hidden system, nor the operator vocabulary.
select ok(
  (select string_agg(verdict::text, ' ') from opchain_option)
    !~ '(correctKey|answer_key|strategyTrace|distractorRationales|operatorChain|mapping|systemId|\y(turn|flip|slant|swap|ring|twin)\y)',
  'no verdict returns a key, the hidden mapping, or the operator vocabulary'
);                                                                                      -- 22

select * from finish();

rollback;
