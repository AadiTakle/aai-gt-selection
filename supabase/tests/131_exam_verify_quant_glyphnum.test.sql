-- QUANT-GLYPHNUM-01's per-type verifier, on the REBUILT base-6 place-value bank (R11; D-211).
--
-- Replaces this file's base-4 hybrid version wholesale, and the reason is the one thing a verifier test
-- must not let happen quietly. The old assertions 13-19 pinned the RE-DERIVATION by corrupting the
-- stored `targetRatio` and checking the notation overruled it. Against the rebuilt bank the old reader
-- cannot resolve a mapping whose values are integers, so it would abandon, fall through to the stored
-- scalar, and those assertions would fail — which is the correct outcome, because the check they made no
-- longer exists. Rewriting them against the new reader is what keeps it.
--
-- Four groups, the same four the base-4 version had:
--   1. THE NOTATION IS RIGHT — base-6 place value, leftmost mark most significant, and the digit reader
--      refuses anything outside the zero-free set {1,2,3,4,5}.
--   2. THE FUNCTION IS REGISTERED and reached through `app.exam_verify_response`.
--   3. THE BANK IS GRADED CORRECTLY — on ten REAL bank items spanning the ladder, the target grades
--      correct, a placement past the band grades wrong, and M-PAE is EXACTLY zero at the target. Four of
--      the ten come from the scrambled-system CONTROL arm, which is what makes "one verifier, no arm
--      branch" (STAGE2_QUESTION_DESIGN 4.1.1) a checked claim rather than a comment.
--   4. THE RE-DERIVATION IS REAL — a differential on exactly that: the same corrupted ratio is ignored
--      when the mapping is readable and honoured when it is not, and the same tamper is then applied to
--      all ten real items so the check does not rest on one numeral's digits.
--
-- WHAT THE FIXTURES ARE. Verbatim bank items — `content`, `scoring` and `provenance` as generated, and
-- the full `answer` — plus three variants of the first, each deliberately damaged in one way.
--
-- Born-synthetic throughout (synthetic_only = true, validated = false). NOT GATED.

begin;
select plan(18);

set role app_owner;

insert into app.exam_item
  (item_id, type_code, domain, difficulty, age_bands, content, answer, scoring, provenance)
values
  -- consistent arm, difficulty 4: numeral 12 over anchor 54 (target 0.235294)
  (
    'e50f500a-f050-4cd8-aec8-4f51d6d83f2d', 'QUANT-GLYPHNUM-01', 'quantitative', 4, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["crescent","arc"],"line":{"minValue":0,"maxExpression":["chevron","notch"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.235294,"targetRatio":0.235294,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2","mapping":{"arc":2,"chevron":5,"crescent":1,"notch":4,"spiral":3}},"expressionDigits":[1,2],"anchorDigits":[5,4],"lineMax":34,"trueValue":8,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=4|i=0|N12|A54|L2V4","levers":{"length":2,"anchorLength":2,"vocabularyInPlay":4,"repeatedPlace":"none","anchorRepeatedPlace":0,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- consistent arm, difficulty 7: numeral 351 over anchor 415 (target 0.896774)
  (
    '578172ea-fda1-4288-9ccd-de051e0142fb', 'QUANT-GLYPHNUM-01', 'quantitative', 7, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["spiral","chevron","crescent"],"line":{"minValue":0,"maxExpression":["notch","crescent","chevron"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.896774,"targetRatio":0.896774,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2","mapping":{"arc":2,"chevron":5,"crescent":1,"notch":4,"spiral":3}},"expressionDigits":[3,5,1],"anchorDigits":[4,1,5],"lineMax":155,"trueValue":139,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=7|i=11|N351|A415|L3V4","levers":{"length":3,"anchorLength":3,"vocabularyInPlay":4,"repeatedPlace":"none","anchorRepeatedPlace":0,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- consistent arm, difficulty 10.5: numeral 514 over anchor 1345 (target 0.538244)
  (
    'e59c5715-86b6-46de-a42c-d5b84ad753b8', 'QUANT-GLYPHNUM-01', 'quantitative', 10.5, array['4-5'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["chevron","crescent","notch"],"line":{"minValue":0,"maxExpression":["crescent","spiral","notch","chevron"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.538244,"targetRatio":0.538244,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2","mapping":{"arc":2,"chevron":5,"crescent":1,"notch":4,"spiral":3}},"expressionDigits":[5,1,4],"anchorDigits":[1,3,4,5],"lineMax":353,"trueValue":190,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=10.5|i=5|N514|A1345|L3V4","levers":{"length":3,"anchorLength":4,"vocabularyInPlay":4,"repeatedPlace":"none","anchorRepeatedPlace":0,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- consistent arm, difficulty 13.5: numeral 554 over anchor 1122 (target 0.804511)
  (
    'd0651c32-0f80-487e-b4f7-23a0799fe85f', 'QUANT-GLYPHNUM-01', 'quantitative', 13.5, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["chevron","chevron","notch"],"line":{"minValue":0,"maxExpression":["crescent","crescent","arc","arc"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.804511,"targetRatio":0.804511,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2","mapping":{"arc":2,"chevron":5,"crescent":1,"notch":4,"spiral":3}},"expressionDigits":[5,5,4],"anchorDigits":[1,1,2,2],"lineMax":266,"trueValue":214,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=13.5|i=11|N554|A1122|L3V4","levers":{"length":3,"anchorLength":4,"vocabularyInPlay":4,"repeatedPlace":"adjacent","anchorRepeatedPlace":1,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- consistent arm, difficulty 17: numeral 1524 over anchor 3221 (target 0.562074)
  (
    '0c6026a5-bbb5-4e40-a13b-58e621c00a33', 'QUANT-GLYPHNUM-01', 'quantitative', 17, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["crescent","chevron","arc","notch"],"line":{"minValue":0,"maxExpression":["spiral","arc","arc","crescent"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.562074,"targetRatio":0.562074,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2","mapping":{"arc":2,"chevron":5,"crescent":1,"notch":4,"spiral":3}},"expressionDigits":[1,5,2,4],"anchorDigits":[3,2,2,1],"lineMax":733,"trueValue":412,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=17|i=5|N1524|A3221|L4V5","levers":{"length":4,"anchorLength":4,"vocabularyInPlay":5,"repeatedPlace":"none","anchorRepeatedPlace":1,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- consistent arm, difficulty 20: numeral 4535 over anchor 5112 (target 0.949288)
  (
    'e346ae44-f600-494a-8461-5c4b4a13894e', 'QUANT-GLYPHNUM-01', 'quantitative', 20, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","chevron","spiral","chevron"],"line":{"minValue":0,"maxExpression":["chevron","crescent","crescent","arc"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.949288,"targetRatio":0.949288,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2","mapping":{"arc":2,"chevron":5,"crescent":1,"notch":4,"spiral":3}},"expressionDigits":[4,5,3,5],"anchorDigits":[5,1,1,2],"lineMax":1124,"trueValue":1067,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=20|i=11|N4535|A5112|L4V5","levers":{"length":4,"anchorLength":4,"vocabularyInPlay":5,"repeatedPlace":"separated","anchorRepeatedPlace":1,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- perTrial arm, difficulty 4: numeral 12 over anchor 54 (target 0.235294)
  (
    '2fbd4ce1-9d95-4fb1-8e85-9205c63f0bf2', 'QUANT-GLYPHNUM-01', 'quantitative', 4, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["spiral","crescent"],"line":{"minValue":0,"maxExpression":["notch","arc"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.235294,"targetRatio":0.235294,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2|QUANT-GLYPHNUM-01|rung=4|i=0|N12|A54|L2V4","mapping":{"arc":4,"chevron":3,"crescent":2,"notch":5,"spiral":1}},"expressionDigits":[1,2],"anchorDigits":[5,4],"lineMax":34,"trueValue":8,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=4|i=0|N12|A54|L2V4","levers":{"length":2,"anchorLength":2,"vocabularyInPlay":4,"repeatedPlace":"none","anchorRepeatedPlace":0,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- perTrial arm, difficulty 9.5: numeral 115 over anchor 312 (target 0.405172)
  (
    'd3656787-ba24-4c7c-8d46-2bcb3e0be196', 'QUANT-GLYPHNUM-01', 'quantitative', 9.5, array['4-5'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["arc","arc","crescent"],"line":{"minValue":0,"maxExpression":["spiral","arc","chevron"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.405172,"targetRatio":0.405172,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2|QUANT-GLYPHNUM-01|rung=9.5|i=3|N115|A312|L3V4","mapping":{"arc":1,"chevron":2,"crescent":5,"notch":4,"spiral":3}},"expressionDigits":[1,1,5],"anchorDigits":[3,1,2],"lineMax":116,"trueValue":47,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=9.5|i=3|N115|A312|L3V4","levers":{"length":3,"anchorLength":3,"vocabularyInPlay":4,"repeatedPlace":"adjacent","anchorRepeatedPlace":0,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- perTrial arm, difficulty 15: numeral 535 over anchor 2114 (target 0.424686)
  (
    '722cdb9d-a6f9-41a5-89d3-9729e4868a8b', 'QUANT-GLYPHNUM-01', 'quantitative', 15, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","chevron","notch"],"line":{"minValue":0,"maxExpression":["crescent","arc","arc","spiral"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.424686,"targetRatio":0.424686,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2|QUANT-GLYPHNUM-01|rung=15|i=1|N535|A2114|L3V5","mapping":{"arc":1,"chevron":3,"crescent":2,"notch":5,"spiral":4}},"expressionDigits":[5,3,5],"anchorDigits":[2,1,1,4],"lineMax":478,"trueValue":203,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=15|i=1|N535|A2114|L3V5","levers":{"length":3,"anchorLength":4,"vocabularyInPlay":5,"repeatedPlace":"separated","anchorRepeatedPlace":1,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- perTrial arm, difficulty 20: numeral 4535 over anchor 5112 (target 0.949288)
  (
    '40741559-5530-45d6-b9a3-5dad7fc67310', 'QUANT-GLYPHNUM-01', 'quantitative', 20, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","crescent","arc","crescent"],"line":{"minValue":0,"maxExpression":["crescent","chevron","chevron","spiral"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.949288,"targetRatio":0.949288,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2|QUANT-GLYPHNUM-01|rung=20|i=11|N4535|A5112|L4V5","mapping":{"arc":3,"chevron":1,"crescent":5,"notch":4,"spiral":2}},"expressionDigits":[4,5,3,5],"anchorDigits":[5,1,1,2],"lineMax":1124,"trueValue":1067,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-template@1","seed":"QUANT-GLYPHNUM-01|rung=20|i=11|N4535|A5112|L4V5","levers":{"length":4,"anchorLength":4,"vocabularyInPlay":5,"repeatedPlace":"separated","anchorRepeatedPlace":1,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v2"}}'::jsonb
  ),
  -- VARIANT: targetRatio corrupted to 0.05, mapping intact
  (
    '00000000-0000-4000-8000-0000000d9001', 'QUANT-GLYPHNUM-01', 'quantitative', 4, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["crescent","arc"],"line":{"minValue":0,"maxExpression":["chevron","notch"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.235294,"targetRatio":0.05,"tolerance":0.025,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v2","mapping":{"arc":2,"chevron":5,"crescent":1,"notch":4,"spiral":3}},"expressionDigits":[1,2],"anchorDigits":[5,4],"lineMax":34,"trueValue":8,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"test-fixture","derivedFrom":"e50f500a-f050-4cd8-aec8-4f51d6d83f2d"}'::jsonb
  ),
  -- VARIANT: answer.system removed, stored ratio intact
  (
    '00000000-0000-4000-8000-0000000d9002', 'QUANT-GLYPHNUM-01', 'quantitative', 4, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["crescent","arc"],"line":{"minValue":0,"maxExpression":["chevron","notch"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.235294,"targetRatio":0.235294,"tolerance":0.025,"expressionDigits":[1,2],"anchorDigits":[5,4],"lineMax":34,"trueValue":8,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"test-fixture","derivedFrom":"e50f500a-f050-4cd8-aec8-4f51d6d83f2d"}'::jsonb
  ),
  -- VARIANT: answer.system removed AND the ratio corrupted to 0.05
  (
    '00000000-0000-4000-8000-0000000d9003', 'QUANT-GLYPHNUM-01', 'quantitative', 4, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["crescent","arc"],"line":{"minValue":0,"maxExpression":["chevron","notch"]},"responseFormat":"continuous_placement","responseField":"placedRatio"}'::jsonb,
    '{"correctKey":0.235294,"targetRatio":0.05,"tolerance":0.025,"expressionDigits":[1,2],"anchorDigits":[5,4],"lineMax":34,"trueValue":8,"chanceFloor":0.06666666666666667}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance. The band is a fixed fraction of the line and every target sits at least a tolerance from both ends, so the accepting interval has measure 2 * tolerance on every item and that is the chance floor a uniformly-random placement scores. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"test-fixture","derivedFrom":"e50f500a-f050-4cd8-aec8-4f51d6d83f2d"}'::jsonb
  );

reset role;

-- --- 1. The notation ----------------------------------------------------------------
-- Base 6, leftmost most significant: 12 (base 6) is 8, and 54 (base 6) is 34.
select is(app.exam_vglyphnum_pv_value(array[1, 2]), 8,
  'a two-mark numeral reads as base-6 place value, leftmost mark most significant');       -- 1
select is(app.exam_vglyphnum_pv_value(array[5, 4]), 34,
  'and so does the anchor that labels the end of the line');                               -- 2
select is(app.exam_vglyphnum_pv_value(array[3]), 3,
  'a one-mark numeral is its own digit, so the place rule does not misfire at length 1');  -- 3
select is(app.exam_vglyphnum_pv_value(array[1, 1, 1, 1]), 259,
  'the same mark in four places is worth four different amounts — the place-value probe');  -- 4
select is(app.exam_vglyphnum_pv_value('{}'::integer[]), null,
  'an empty numeral is unreadable rather than zero');                                      -- 5
select is(app.exam_vglyphnum_digit('3'::jsonb), 3,
  'a mapping value inside the zero-free digit set reads as that digit');                   -- 6
select is(app.exam_vglyphnum_digit('0'::jsonb), null,
  'zero is NOT a digit of this system: a zero-free set is why five marks do not give base 6'); -- 7
select is(app.exam_vglyphnum_digit('"scaleII"'::jsonb), null,
  'and the retired base-4 role names are unreadable, so a stale bank aborts rather than mis-grades'); -- 8

-- --- 2. Registration ----------------------------------------------------------------
select is(
  (select verifier_fn from app.exam_verifier_registry where type_code = 'QUANT-GLYPHNUM-01'),
  'exam_verify_quant_glyphnum',
  'the type is registered to its own verifier, so exam_verify_response dispatches to it');  -- 9

-- --- 3. The bank is graded correctly -------------------------------------------------
create temporary table glyphnum_probe as
select
  i.item_id,
  (i.answer -> 'targetRatio')::text::double precision as target,
  (i.answer -> 'tolerance')::text::double precision as tolerance
from app.exam_item i
where i.type_code = 'QUANT-GLYPHNUM-01'
  and i.provenance ->> 'generator' = 'grammar';

select is((select count(*)::integer from glyphnum_probe), 10,
  'ten real bank items are under test, spanning the difficulty ladder in both arms');       -- 10
select is(
  (select count(*)::integer from glyphnum_probe p
   where (app.exam_verify_response(p.item_id, jsonb_build_object('placedRatio', p.target)) ->> 'score')::integer = 1),
  10,
  'placing exactly at the target scores 1 on all ten');                                     -- 11
select is(
  (select count(*)::integer from glyphnum_probe p
   where (app.exam_verify_response(p.item_id, jsonb_build_object('placedRatio', p.target + 1.5 * p.tolerance)) ->> 'score')::integer = 0),
  10,
  'and a placement one and a half tolerances away scores 0 — the band is the band');         -- 12
-- Zero, not merely small: the verifier re-derived the ratio from the mapping and landed on the same
-- double the generator wrote, so `round(numeric, 6)` and `Math.round(x * 1e6) / 1e6` agree on this bank.
select is(
  (select count(*)::integer from glyphnum_probe p
   where (app.exam_verify_response(p.item_id, jsonb_build_object('placedRatio', p.target)) -> 'metrics' ->> 'M-PAE')::double precision = 0),
  10,
  'M-PAE is exactly 0 at the target on every item, so the re-derived ratio is bit-identical to the stored one'); -- 13
select is(
  (select count(*)::integer from app.exam_item i
   join glyphnum_probe p on p.item_id = i.item_id
   where i.provenance -> 'levers' ->> 'systemPersistence' = 'perTrial'
     and (app.exam_verify_response(i.item_id, jsonb_build_object('placedRatio', p.target)) ->> 'score')::integer = 1),
  4,
  'the same function grades the scrambled-system CONTROL arm, whose mapping is redrawn per item');  -- 14

-- --- 4. The re-derivation is real ---------------------------------------------------
--
-- d9001 and d9003 carry the same corrupted `targetRatio` of 0.05. The only difference between them is
-- whether `answer.system` is present, so if the verifier were reading the stored scalar they would grade
-- identically.
select ok(
  (app.exam_verify_response('00000000-0000-4000-8000-0000000d9001', '{"placedRatio":0.235294}'::jsonb) ->> 'correct')::boolean,
  'a corrupted stored targetRatio is ignored: the target is still correct because the ratio was re-derived from the mapping'); -- 15
select ok(
  not (app.exam_verify_response('00000000-0000-4000-8000-0000000d9001', '{"placedRatio":0.05}'::jsonb) ->> 'correct')::boolean,
  'and placing at the corrupted ratio itself is WRONG — assertion 15 is not passing by accident');   -- 16
select ok(
  (app.exam_verify_response('00000000-0000-4000-8000-0000000d9003', '{"placedRatio":0.05}'::jsonb) ->> 'correct')::boolean,
  'the fallback is a real fallback, not dead code: with the mapping gone the same corrupted ratio grades correct'); -- 17

-- Assertions 15-17 corrupt one item, whose numeral uses two of the five marks. So they say nothing about
-- the other three, and a reader that could not value one of them would abort, fall through to the stored
-- ratio, and pass assertions 11-14 without ever reading the mapping. The tamper below therefore rotates
-- the stored ratio on ALL TEN real items to a value assertion 12 has already shown lies outside the band:
-- if the notation decides, the target still grades correct; if the fallback decided, it does not. There is
-- no third outcome.
create temporary table glyphnum_tamper as
select p.item_id, p.target, p.tolerance from glyphnum_probe p;

set role app_owner;
update app.exam_item i
set answer = jsonb_set(i.answer, '{targetRatio}',
      to_jsonb(round((t.target + 3 * t.tolerance)::numeric, 6)::double precision))
from glyphnum_tamper t
where i.item_id = t.item_id;
reset role;

select is(
  (select count(*)::integer from glyphnum_tamper t
   where (app.exam_verify_response(t.item_id, jsonb_build_object('placedRatio', t.target)) ->> 'correct')::boolean),
  10,
  'the notation decides on every real bank item: the target survives a rotated stored ratio');        -- 18

select * from finish();
rollback;
