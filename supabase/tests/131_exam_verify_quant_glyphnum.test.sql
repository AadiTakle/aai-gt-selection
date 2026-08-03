-- The QUANT-GLYPHNUM-01 per-type verifier (20260803021000_exam_verify_quant_glyphnum.sql).
--
-- Four things are proved here, in this order:
--   1. FIREWALL POSTURE — the verifier and its two notation readers are reachable only from
--      api_executor. Test 123 asserts this over the whole `app.exam_v%` namespace; this file names
--      them so a failure says which port forgot its revoke.
--   2. DISPATCH — the type code resolves to its own function rather than falling through to the
--      `scoring.rule = placement_tolerance` generic it shares a contract with.
--   3. THE BANK IS GRADED CORRECTLY — on twelve REAL bank items spanning the whole difficulty
--      ladder, the placement the item's own key names scores 1 and the NEAREST wrong tick scores 0,
--      with M-PAE emitted on every one and exactly zero at the key. Four of the twelve come from
--      the scrambled-system CONTROL arm, which is what makes "one verifier, no arm branch"
--      (STAGE2_QUESTION_DESIGN §4.1.1) a checked claim rather than a comment.
--   4. THE RE-DERIVATION IS REAL — the whole reason this type has a per-type verifier at all is
--      that it re-derives `answer.targetRatio` from the server-only glyph->role mapping instead of
--      trusting the stored scalar. Assertions 13-16 are a differential on exactly that: the same
--      corrupted ratio is ignored when the mapping is readable and honoured when it is not.
--      Assertions 17-19 widen that from the one variant item to the whole sampled bank, because
--      13-16 exercise only the three SCALE roles and a verifier that could not value a DIGIT role
--      passed this file; see the note above assertion 17.
--
-- WHAT THE FIXTURES ARE. Rows 1-12 are verbatim bank items — `content`, `scoring` and `provenance`
-- exactly as generated, and the full `answer` less `distractorRationales`, which is per-option
-- prose for a human, is 60% of the blob's bytes, and is not reachable from this verifier. Rows
-- 13-15 are variants derived from one of them, marked `provenance.generator = 'test-fixture'` so
-- the bank sweep in assertions 8-12 excludes them.
--
-- Parity against BOTH banks in full is not provable in pgTAP, because it needs the app tier and
-- the database in one process. `pnpm exam:verify:diff` does that; this file pins the contract that
-- harness relies on, and does so without a running web app.
--
-- Assertion 21 proves the fixtures hold real keys and a real mapping, so assertion 20 cannot pass
-- vacuously.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(24);

grant usage on schema extensions to api_executor, authenticated;

-- --- Fixtures: real bank items ------------------------------------------------------

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
values ('QUANT-GLYPHNUM-01', 'quantitative', 'Alien Numbers', 'QUANT-GLYPHNUM-01.html',
        array['M-ACC', 'M-PAE'])
on conflict (type_code) do nothing;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
values
  -- consistent arm, real bank item 1 of 8
  -- difficulty 1.01; length 1, 0 binding(s), 1 distinct glyph(s); key A at rank 0
  (
    '517c6778-44de-4f8f-9a43-01de2dd63435', 'QUANT-GLYPHNUM-01', 'quantitative', 1.01, array['K-1'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["crescent"],"line":{"minValue":0,"maxExpression":["spiral","notch","arc","crescent"]},"options":[{"key":"A","ratio":0.027027},{"key":"B","ratio":0.054054},{"key":"C","ratio":0.081081},{"key":"D","ratio":0.108108},{"key":"E","ratio":0.432432}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"A","targetRatio":0.027027,"tolerance":0.010811,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["scaleI"],"anchorRoles":["digitII","scaleIII","scaleII","scaleI"],"lineMax":37,"trueValue":1,"optionValues":{"A":1,"B":2,"C":3,"D":4,"E":16},"strategyTrace":{"A":{"ruleId":"full:scaleI","kind":"correct"},"B":{"ruleId":"phantom@0=digitII:digitII+scaleI","kind":"phantom_bind"},"C":{"ruleId":"phantom@0=digitIII:digitIII+scaleI","kind":"phantom_bind"},"D":{"ruleId":"misread@0=scaleII:scaleII","kind":"glyph_confusion"},"E":{"ruleId":"misread@0=scaleIII:scaleIII","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=1|i=0|L1B0D1","levers":{"length":1,"binds":0,"distinct":1,"orderSensitive":0,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":0,"distractorNearness":0.0027067669172932607}}'::jsonb
  ),
  -- consistent arm, real bank item 2 of 8
  -- difficulty 3.56; length 1, 0 binding(s), 1 distinct glyph(s); key B at rank 1
  (
    '540632e0-2cc7-4bbc-87f4-66f8a031b692', 'QUANT-GLYPHNUM-01', 'quantitative', 3.56, array['K-1'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["arc"],"line":{"minValue":0,"maxExpression":["spiral","notch","arc"]},"options":[{"key":"A","ratio":0.083333},{"key":"B","ratio":0.111111},{"key":"C","ratio":0.222222},{"key":"D","ratio":0.333333},{"key":"E","ratio":0.444444}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"B","targetRatio":0.111111,"tolerance":0.011111,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["scaleII"],"anchorRoles":["digitII","scaleIII","scaleII"],"lineMax":36,"trueValue":4,"optionValues":{"A":3,"B":4,"C":8,"D":12,"E":16},"strategyTrace":{"A":{"ruleId":"misread@0=digitIII:digitIII","kind":"glyph_confusion"},"B":{"ruleId":"full:scaleII","kind":"correct"},"C":{"ruleId":"phantom@0=digitII:digitII+scaleII","kind":"phantom_bind"},"D":{"ruleId":"phantom@0=digitIII:digitIII+scaleII","kind":"phantom_bind"},"E":{"ruleId":"misread@0=scaleIII:scaleIII","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=3.5|i=7|L1B0D1","levers":{"length":1,"binds":0,"distinct":1,"orderSensitive":0,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":1,"distractorNearness":0.6929323308270677}}'::jsonb
  ),
  -- consistent arm, real bank item 3 of 8
  -- difficulty 6.32; length 2, 0 binding(s), 2 distinct glyph(s); key D at rank 3
  (
    '9875da0d-791e-4faf-b289-067e1f5ad6a8', 'QUANT-GLYPHNUM-01', 'quantitative', 6.32, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["arc","notch"],"line":{"minValue":0,"maxExpression":["chevron","notch","chevron","crescent"]},"options":[{"key":"A","ratio":0.039216},{"key":"B","ratio":0.098039},{"key":"C","ratio":0.117647},{"key":"D","ratio":0.392157},{"key":"E","ratio":0.627451}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"D","targetRatio":0.392157,"tolerance":0.007843,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["scaleII","scaleIII"],"anchorRoles":["digitIII","scaleIII","digitIII","scaleI"],"lineMax":51,"trueValue":20,"optionValues":{"A":2,"B":5,"C":6,"D":20,"E":32},"strategyTrace":{"A":{"ruleId":"count:2","kind":"token_count"},"B":{"ruleId":"misread@1=scaleI:scaleII+scaleI","kind":"glyph_confusion"},"C":{"ruleId":"misread@1=digitII:scaleII+digitII","kind":"glyph_confusion"},"D":{"ruleId":"full:scaleII+scaleIII","kind":"correct"},"E":{"ruleId":"placevalue:scaleII+scaleIII","kind":"place_value_read"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=6.5|i=1|L2B0D2","levers":{"length":2,"binds":0,"distinct":2,"orderSensitive":0,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":3,"distractorNearness":0.36857142857142894}}'::jsonb
  ),
  -- consistent arm, real bank item 4 of 8
  -- difficulty 9.12; length 3, 0 binding(s), 3 distinct glyph(s); key B at rank 1
  (
    'a6ed76f0-b600-4201-9d1f-5e3093edb981', 'QUANT-GLYPHNUM-01', 'quantitative', 9.12, array['4-5'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","crescent","arc"],"line":{"minValue":0,"maxExpression":["spiral","notch","spiral","arc"]},"options":[{"key":"A","ratio":0.4},{"key":"B","ratio":0.525},{"key":"C","ratio":0.6},{"key":"D","ratio":0.7},{"key":"E","ratio":1}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"B","targetRatio":0.525,"tolerance":0.03,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["scaleIII","scaleI","scaleII"],"anchorRoles":["digitII","scaleIII","digitII","scaleII"],"lineMax":40,"trueValue":21,"optionValues":{"A":16,"B":21,"C":24,"D":28,"E":40},"strategyTrace":{"A":{"ruleId":"firstUnit:scaleIII","kind":"first_unit_only"},"B":{"ruleId":"full:scaleIII+scaleI+scaleII","kind":"correct"},"C":{"ruleId":"misread@1=scaleII:scaleIII+scaleII+scaleII","kind":"glyph_confusion"},"D":{"ruleId":"misread@1=digitIII:scaleIII+digitIII+scaleII","kind":"glyph_confusion"},"E":{"ruleId":"anchor:40","kind":"anchor_echo"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=9|i=9|L3B0D3","levers":{"length":3,"binds":0,"distinct":3,"orderSensitive":0,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":1,"distractorNearness":0.1978947368421058}}'::jsonb
  ),
  -- consistent arm, real bank item 5 of 8
  -- difficulty 12.06; length 3, 1 binding(s), 3 distinct glyph(s); key C at rank 2
  (
    'ce20e88c-8cc5-4f8a-b0b1-c8df3bb0bd23', 'QUANT-GLYPHNUM-01', 'quantitative', 12.06, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","chevron","crescent"],"line":{"minValue":0,"maxExpression":["spiral","notch","spiral","arc"]},"options":[{"key":"A","ratio":0.1},{"key":"B","ratio":0.175},{"key":"C","ratio":0.475},{"key":"D","ratio":0.55},{"key":"E","ratio":0.7}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"C","targetRatio":0.475,"tolerance":0.03,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["scaleIII","digitIII","scaleI"],"anchorRoles":["digitII","scaleIII","digitII","scaleII"],"lineMax":40,"trueValue":19,"optionValues":{"A":4,"B":7,"C":19,"D":22,"E":28},"strategyTrace":{"A":{"ruleId":"misread@0=scaleI:scaleI+digitIII+scaleI","kind":"glyph_confusion"},"B":{"ruleId":"misread@0=scaleII:scaleII+digitIII+scaleI","kind":"glyph_confusion"},"C":{"ruleId":"full:scaleIII+digitIII+scaleI","kind":"correct"},"D":{"ruleId":"misread@2=digitIII:scaleIII+digitIII+digitIII","kind":"glyph_confusion"},"E":{"ruleId":"misread@2=scaleII:scaleIII+digitIII+scaleII","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=12|i=3|L3B1D3","levers":{"length":3,"binds":1,"distinct":3,"orderSensitive":1,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":2,"distractorNearness":0.029398496240602742}}'::jsonb
  ),
  -- consistent arm, real bank item 6 of 8
  -- difficulty 14.62; length 4, 2 binding(s), 2 distinct glyph(s); key A at rank 0
  (
    '78f58303-6b4c-4dc7-938b-37176b14e01a', 'QUANT-GLYPHNUM-01', 'quantitative', 14.62, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["spiral","crescent","spiral","crescent"],"line":{"minValue":0,"maxExpression":["chevron","notch","chevron","crescent"]},"options":[{"key":"A","ratio":0.078431},{"key":"B","ratio":0.098039},{"key":"C","ratio":0.137255},{"key":"D","ratio":0.196078},{"key":"E","ratio":0.372549}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"A","targetRatio":0.078431,"tolerance":0.007843,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["digitII","scaleI","digitII","scaleI"],"anchorRoles":["digitIII","scaleIII","digitIII","scaleI"],"lineMax":51,"trueValue":4,"optionValues":{"A":4,"B":5,"C":7,"D":10,"E":19},"strategyTrace":{"A":{"ruleId":"full:digitII+scaleI+digitII+scaleI","kind":"correct"},"B":{"ruleId":"misread@0=digitIII:digitIII+scaleI+digitII+scaleI","kind":"glyph_confusion"},"C":{"ruleId":"misread@0=scaleII:scaleII+scaleI+digitII+scaleI","kind":"glyph_confusion"},"D":{"ruleId":"misread@1=scaleII:digitII+scaleII+digitII+scaleI","kind":"glyph_confusion"},"E":{"ruleId":"misread@0=scaleIII:scaleIII+scaleI+digitII+scaleI","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=14.5|i=9|L4B2D2","levers":{"length":4,"binds":2,"distinct":2,"orderSensitive":1,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":0,"distractorNearness":0.11518796992481231}}'::jsonb
  ),
  -- consistent arm, real bank item 7 of 8
  -- difficulty 17.38; length 4, 2 binding(s), 4 distinct glyph(s); key A at rank 0
  (
    '91a71afe-90a8-4829-9751-c152f835106e', 'QUANT-GLYPHNUM-01', 'quantitative', 17.38, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["chevron","crescent","spiral","arc"],"line":{"minValue":0,"maxExpression":["chevron","notch","notch"]},"options":[{"key":"A","ratio":0.171875},{"key":"B","ratio":0.203125},{"key":"C","ratio":0.21875},{"key":"D","ratio":0.234375},{"key":"E","ratio":0.3125}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"A","targetRatio":0.171875,"tolerance":0.00625,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["digitIII","scaleI","digitII","scaleII"],"anchorRoles":["digitIII","scaleIII","scaleIII"],"lineMax":64,"trueValue":11,"optionValues":{"A":11,"B":13,"C":14,"D":15,"E":20},"strategyTrace":{"A":{"ruleId":"full:digitIII+scaleI+digitII+scaleII","kind":"correct"},"B":{"ruleId":"misread@0=scaleII:scaleII+scaleI+digitII+scaleII","kind":"glyph_confusion"},"C":{"ruleId":"misread@1=digitIII:digitIII+digitIII+digitII+scaleII","kind":"glyph_confusion"},"D":{"ruleId":"misread@2=digitIII:digitIII+scaleI+digitIII+scaleII","kind":"glyph_confusion"},"E":{"ruleId":"misread@1=scaleII:digitIII+scaleII+digitII+scaleII","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=17.5|i=4|L4B2D4","levers":{"length":4,"binds":2,"distinct":4,"orderSensitive":1,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":0,"distractorNearness":0.29082706766917393}}'::jsonb
  ),
  -- consistent arm, real bank item 8 of 8
  -- difficulty 19.99; length 4, 2 binding(s), 4 distinct glyph(s); key C at rank 2
  (
    'da7d1a9a-36f3-4824-bda5-39e899e4c0d3', 'QUANT-GLYPHNUM-01', 'quantitative', 19.99, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["spiral","arc","chevron","crescent"],"line":{"minValue":0,"maxExpression":["spiral","notch"]},"options":[{"key":"A","ratio":0.25},{"key":"B","ratio":0.3125},{"key":"C","ratio":0.34375},{"key":"D","ratio":0.4375},{"key":"E","ratio":0.46875}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"C","targetRatio":0.34375,"tolerance":0.0125,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["digitII","scaleII","digitIII","scaleI"],"anchorRoles":["digitII","scaleIII"],"lineMax":32,"trueValue":11,"optionValues":{"A":8,"B":10,"C":11,"D":14,"E":15},"strategyTrace":{"A":{"ruleId":"misread@0=scaleI:scaleI+scaleII+digitIII+scaleI","kind":"glyph_confusion"},"B":{"ruleId":"additive:digitII+scaleII+digitIII+scaleI","kind":"additive_only"},"C":{"ruleId":"full:digitII+scaleII+digitIII+scaleI","kind":"correct"},"D":{"ruleId":"misread@3=digitIII:digitII+scaleII+digitIII+digitIII","kind":"glyph_confusion"},"E":{"ruleId":"misread@0=digitIII:digitIII+scaleII+digitIII+scaleI","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=20|i=11|L4B2D4","levers":{"length":4,"binds":2,"distinct":4,"orderSensitive":1,"systemPersistence":"consistent","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":2,"distractorNearness":0.9972932330827066}}'::jsonb
  ),
  -- perTrial CONTROL arm, real item 1 of 4 — one verifier, no arm branch
  -- difficulty 1.01; length 1, 0 binding(s), 1 distinct glyph(s); key A at rank 0
  (
    '778e49c5-6755-4608-9ba0-da0b706dce8f', 'QUANT-GLYPHNUM-01', 'quantitative', 1.01, array['K-1'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["chevron"],"line":{"minValue":0,"maxExpression":["spiral","crescent","notch","chevron"]},"options":[{"key":"A","ratio":0.027027},{"key":"B","ratio":0.054054},{"key":"C","ratio":0.081081},{"key":"D","ratio":0.108108},{"key":"E","ratio":0.432432}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"A","targetRatio":0.027027,"tolerance":0.010811,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1|QUANT-GLYPHNUM-01|rung=1|i=0|L1B0D1","mapping":{"arc":"digitIII","chevron":"scaleI","crescent":"scaleIII","notch":"scaleII","spiral":"digitII"}},"expressionRoles":["scaleI"],"anchorRoles":["digitII","scaleIII","scaleII","scaleI"],"lineMax":37,"trueValue":1,"optionValues":{"A":1,"B":2,"C":3,"D":4,"E":16},"strategyTrace":{"A":{"ruleId":"full:scaleI","kind":"correct"},"B":{"ruleId":"phantom@0=digitII:digitII+scaleI","kind":"phantom_bind"},"C":{"ruleId":"phantom@0=digitIII:digitIII+scaleI","kind":"phantom_bind"},"D":{"ruleId":"misread@0=scaleII:scaleII","kind":"glyph_confusion"},"E":{"ruleId":"misread@0=scaleIII:scaleIII","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=1|i=0|L1B0D1","levers":{"length":1,"binds":0,"distinct":1,"orderSensitive":0,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":0,"distractorNearness":0.0027067669172932607}}'::jsonb
  ),
  -- perTrial CONTROL arm, real item 2 of 4 — one verifier, no arm branch
  -- difficulty 7.32; length 2, 0 binding(s), 1 distinct glyph(s); key C at rank 2
  (
    '311a50cd-e6a8-4db6-bb7a-35dbb3a008d8', 'QUANT-GLYPHNUM-01', 'quantitative', 7.32, array['2-3'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["chevron","chevron"],"line":{"minValue":0,"maxExpression":["notch","spiral","crescent"]},"options":[{"key":"A","ratio":0.222222},{"key":"B","ratio":0.333333},{"key":"C","ratio":0.444444},{"key":"D","ratio":0.666667},{"key":"E","ratio":0.888889}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"C","targetRatio":0.444444,"tolerance":0.044444,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1|QUANT-GLYPHNUM-01|rung=7.5|i=0|L2B0D1","mapping":{"arc":"digitIII","chevron":"scaleII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["scaleII","scaleII"],"anchorRoles":["scaleIII","digitII","scaleI"],"lineMax":18,"trueValue":8,"optionValues":{"A":4,"B":6,"C":8,"D":12,"E":16},"strategyTrace":{"A":{"ruleId":"drop@0:scaleII","kind":"token_omitted"},"B":{"ruleId":"misread@1=digitII:scaleII+digitII","kind":"glyph_confusion"},"C":{"ruleId":"full:scaleII+scaleII","kind":"correct"},"D":{"ruleId":"phantom@0=digitII:digitII+scaleII+scaleII","kind":"phantom_bind"},"E":{"ruleId":"overbind@0:scaleII+scaleII","kind":"over_binding"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=7.5|i=0|L2B0D1","levers":{"length":2,"binds":0,"distinct":1,"orderSensitive":0,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":2,"distractorNearness":0.9239348370927319}}'::jsonb
  ),
  -- perTrial CONTROL arm, real item 3 of 4 — one verifier, no arm branch
  -- difficulty 13.66; length 4, 1 binding(s), 2 distinct glyph(s); key B at rank 1
  (
    '31beeff3-0742-44fa-a914-ededc35863ed', 'QUANT-GLYPHNUM-01', 'quantitative', 13.66, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","crescent","crescent","crescent"],"line":{"minValue":0,"maxExpression":["spiral","chevron"]},"options":[{"key":"A","ratio":0.1},{"key":"B","ratio":0.2},{"key":"C","ratio":0.25},{"key":"D","ratio":0.35},{"key":"E","ratio":0.5}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"B","targetRatio":0.2,"tolerance":0.02,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1|QUANT-GLYPHNUM-01|rung=13.5|i=11|L4B1D2","mapping":{"arc":"digitIII","chevron":"scaleII","crescent":"scaleI","notch":"digitII","spiral":"scaleIII"}},"expressionRoles":["digitII","scaleI","scaleI","scaleI"],"anchorRoles":["scaleIII","scaleII"],"lineMax":20,"trueValue":4,"optionValues":{"A":2,"B":4,"C":5,"D":7,"E":10},"strategyTrace":{"A":{"ruleId":"unique:digitII+scaleI","kind":"repeats_ignored"},"B":{"ruleId":"full:digitII+scaleI+scaleI+scaleI","kind":"correct"},"C":{"ruleId":"additive:digitII+scaleI+scaleI+scaleI","kind":"additive_only"},"D":{"ruleId":"misread@0=scaleII:scaleII+scaleI+scaleI+scaleI","kind":"glyph_confusion"},"E":{"ruleId":"misread@1=scaleII:digitII+scaleII+scaleI+scaleI","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=13.5|i=11|L4B1D2","levers":{"length":4,"binds":1,"distinct":2,"orderSensitive":1,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":1,"distractorNearness":0.24819548872180522}}'::jsonb
  ),
  -- perTrial CONTROL arm, real item 4 of 4 — one verifier, no arm branch
  -- difficulty 19.99; length 4, 2 binding(s), 4 distinct glyph(s); key C at rank 2
  (
    '1dcd6288-880c-4a97-8b90-3d3f4f2033e4', 'QUANT-GLYPHNUM-01', 'quantitative', 19.99, array['6-8'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["chevron","spiral","crescent","notch"],"line":{"minValue":0,"maxExpression":["chevron","arc"]},"options":[{"key":"A","ratio":0.25},{"key":"B","ratio":0.3125},{"key":"C","ratio":0.34375},{"key":"D","ratio":0.4375},{"key":"E","ratio":0.46875}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"C","targetRatio":0.34375,"tolerance":0.0125,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1|QUANT-GLYPHNUM-01|rung=20|i=11|L4B2D4","mapping":{"arc":"scaleIII","chevron":"digitII","crescent":"digitIII","notch":"scaleI","spiral":"scaleII"}},"expressionRoles":["digitII","scaleII","digitIII","scaleI"],"anchorRoles":["digitII","scaleIII"],"lineMax":32,"trueValue":11,"optionValues":{"A":8,"B":10,"C":11,"D":14,"E":15},"strategyTrace":{"A":{"ruleId":"misread@0=scaleI:scaleI+scaleII+digitIII+scaleI","kind":"glyph_confusion"},"B":{"ruleId":"additive:digitII+scaleII+digitIII+scaleI","kind":"additive_only"},"C":{"ruleId":"full:digitII+scaleII+digitIII+scaleI","kind":"correct"},"D":{"ruleId":"misread@3=digitIII:digitII+scaleII+digitIII+digitIII","kind":"glyph_confusion"},"E":{"ruleId":"misread@0=digitIII:digitIII+scaleII+digitIII+scaleI","kind":"glyph_confusion"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"grammar","generatorRef":"quant-glyphnum-01-grammar@1","seed":"QUANT-GLYPHNUM-01|rung=20|i=11|L4B2D4","levers":{"length":4,"binds":2,"distinct":4,"orderSensitive":1,"systemPersistence":"perTrial","systemSeed":"QUANT-GLYPHNUM-01|v1","keyRank":2,"distractorNearness":0.9972932330827066}}'::jsonb
  ),
  -- VARIANT of a6ed76f0: answer.targetRatio DELIBERATELY corrupted to 0.05, mapping intact
  -- difficulty 9.12; length 3, 0 binding(s), 3 distinct glyph(s); key B at rank 1
  (
    '00000000-0000-4000-8000-0000000c9001', 'QUANT-GLYPHNUM-01', 'quantitative', 9.12, array['4-5'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","crescent","arc"],"line":{"minValue":0,"maxExpression":["spiral","notch","spiral","arc"]},"options":[{"key":"A","ratio":0.4},{"key":"B","ratio":0.525},{"key":"C","ratio":0.6},{"key":"D","ratio":0.7},{"key":"E","ratio":1}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"B","targetRatio":0.05,"tolerance":0.03,"system":{"systemId":"sys-QUANT-GLYPHNUM-01|v1","mapping":{"arc":"scaleII","chevron":"digitIII","crescent":"scaleI","notch":"scaleIII","spiral":"digitII"}},"expressionRoles":["scaleIII","scaleI","scaleII"],"anchorRoles":["digitII","scaleIII","digitII","scaleII"],"lineMax":40,"trueValue":21,"optionValues":{"A":16,"B":21,"C":24,"D":28,"E":40},"strategyTrace":{"A":{"ruleId":"firstUnit:scaleIII","kind":"first_unit_only"},"B":{"ruleId":"full:scaleIII+scaleI+scaleII","kind":"correct"},"C":{"ruleId":"misread@1=scaleII:scaleIII+scaleII+scaleII","kind":"glyph_confusion"},"D":{"ruleId":"misread@1=digitIII:scaleIII+digitIII+scaleII","kind":"glyph_confusion"},"E":{"ruleId":"anchor:40","kind":"anchor_echo"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"test-fixture","derivedFrom":"a6ed76f0-b600-4201-9d1f-5e3093edb981"}'::jsonb
  ),
  -- VARIANT of a6ed76f0: answer.system REMOVED, stored ratio intact
  -- difficulty 9.12; length 3, 0 binding(s), 3 distinct glyph(s); key B at rank 1
  (
    '00000000-0000-4000-8000-0000000c9002', 'QUANT-GLYPHNUM-01', 'quantitative', 9.12, array['4-5'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","crescent","arc"],"line":{"minValue":0,"maxExpression":["spiral","notch","spiral","arc"]},"options":[{"key":"A","ratio":0.4},{"key":"B","ratio":0.525},{"key":"C","ratio":0.6},{"key":"D","ratio":0.7},{"key":"E","ratio":1}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"B","targetRatio":0.525,"tolerance":0.03,"expressionRoles":["scaleIII","scaleI","scaleII"],"anchorRoles":["digitII","scaleIII","digitII","scaleII"],"lineMax":40,"trueValue":21,"optionValues":{"A":16,"B":21,"C":24,"D":28,"E":40},"strategyTrace":{"A":{"ruleId":"firstUnit:scaleIII","kind":"first_unit_only"},"B":{"ruleId":"full:scaleIII+scaleI+scaleII","kind":"correct"},"C":{"ruleId":"misread@1=scaleII:scaleIII+scaleII+scaleII","kind":"glyph_confusion"},"D":{"ruleId":"misread@1=digitIII:scaleIII+digitIII+scaleII","kind":"glyph_confusion"},"E":{"ruleId":"anchor:40","kind":"anchor_echo"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"test-fixture","derivedFrom":"a6ed76f0-b600-4201-9d1f-5e3093edb981"}'::jsonb
  ),
  -- VARIANT of a6ed76f0: answer.system REMOVED and the ratio corrupted to 0.05
  -- difficulty 9.12; length 3, 0 binding(s), 3 distinct glyph(s); key B at rank 1
  (
    '00000000-0000-4000-8000-0000000c9003', 'QUANT-GLYPHNUM-01', 'quantitative', 9.12, array['4-5'],
    '{"typeCode":"QUANT-GLYPHNUM-01","glyphTray":["arc","chevron","crescent","notch","spiral"],"expression":["notch","crescent","arc"],"line":{"minValue":0,"maxExpression":["spiral","notch","spiral","arc"]},"options":[{"key":"A","ratio":0.4},{"key":"B","ratio":0.525},{"key":"C","ratio":0.6},{"key":"D","ratio":0.7},{"key":"E","ratio":1}],"responseField":"placedRatio"}'::jsonb,
    '{"correctKey":"B","targetRatio":0.05,"tolerance":0.03,"expressionRoles":["scaleIII","scaleI","scaleII"],"anchorRoles":["digitII","scaleIII","digitII","scaleII"],"lineMax":40,"trueValue":21,"optionValues":{"A":16,"B":21,"C":24,"D":28,"E":40},"strategyTrace":{"A":{"ruleId":"firstUnit:scaleIII","kind":"first_unit_only"},"B":{"ruleId":"full:scaleIII+scaleI+scaleII","kind":"correct"},"C":{"ruleId":"misread@1=scaleII:scaleIII+scaleII+scaleII","kind":"glyph_confusion"},"D":{"ruleId":"misread@1=digitIII:scaleIII+digitIII+scaleII","kind":"glyph_confusion"},"E":{"ruleId":"anchor:40","kind":"anchor_echo"}},"strategyTraceRules":["additive_only","over_binding","phantom_bind","place_value_read","token_omitted","glyph_confusion","repeats_ignored","first_unit_only","largest_glyph_only","token_count","anchor_echo"]}'::jsonb,
    '{"mode":"deterministic_key","rule":"placement_tolerance","description":"pae = |response.placedRatio - answer.targetRatio|; correct when pae <= answer.tolerance, which the generator sets below half the smallest gap between neighbouring ticks so the band contains exactly the keyed tick. pae is emitted as M-PAE (lower is better)."}'::jsonb,
    '{"generator":"test-fixture","derivedFrom":"a6ed76f0-b600-4201-9d1f-5e3093edb981"}'::jsonb
  )
;

-- The two responses each real item is graded on, derived from the item's own stored key so the
-- sweep below cannot drift out of step with the bank: the placement the key names, and the wrong
-- tick NEAREST to it, which is the hardest case the tolerance band has to separate.
create temporary table glyphnum_probe as
with opt as (
  select
    i.item_id,
    i.answer_key ->> 'correctKey' as correct_key,
    o.value ->> 'key' as opt_key,
    (o.value ->> 'ratio')::double precision as ratio
  from app.exam_item i
  cross join lateral jsonb_array_elements(i.content -> 'options') o
  where i.type_code = 'QUANT-GLYPHNUM-01'
    and i.provenance ->> 'generator' = 'grammar'
),
keyed as (
  select item_id, ratio as keyed_ratio from opt where opt_key = correct_key
)
select
  k.item_id,
  k.keyed_ratio,
  (
    select o.ratio
    from opt o
    where o.item_id = k.item_id and o.opt_key <> o.correct_key
    order by abs(o.ratio - k.keyed_ratio), o.ratio
    limit 1
  ) as nearest_wrong_ratio
from keyed k;

-- --- 1. Firewall posture ------------------------------------------------------------

select ok(
  not has_function_privilege('anon', 'app.exam_verify_quant_glyphnum(jsonb,jsonb)', 'execute'),
  'anon cannot execute the QUANT-GLYPHNUM-01 verifier');                                -- 1
select ok(
  not has_function_privilege(
    'authenticated', 'app.exam_verify_quant_glyphnum(jsonb,jsonb)', 'execute'),
  'authenticated cannot execute the QUANT-GLYPHNUM-01 verifier');                       -- 2
select ok(
  not has_function_privilege(
    'service_role', 'app.exam_verify_quant_glyphnum(jsonb,jsonb)', 'execute'),
  'service_role cannot execute the QUANT-GLYPHNUM-01 verifier');                        -- 3
select ok(
  has_function_privilege('api_executor', 'app.exam_verify_quant_glyphnum(jsonb,jsonb)', 'execute'),
  'api_executor CAN — a placement verifier is a membership oracle on the target band, so any '
  'other caller could binary-search the key out of it');                                -- 4
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname in ('exam_vglyphnum_role', 'exam_vglyphnum_value')
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
  'both notation readers are revoked from PUBLIC and every client role'
);                                                                                      -- 5

-- --- 2. Dispatch --------------------------------------------------------------------

select is(
  (select verifier_fn from app.exam_verifier_registry where type_code = 'QUANT-GLYPHNUM-01'),
  'exam_verify_quant_glyphnum',
  'the registry routes QUANT-GLYPHNUM-01 to its own verifier'
);                                                                                      -- 6
select is(
  (
    select distinct app.exam_verify_response(
      p.item_id, jsonb_build_object('placedRatio', p.keyed_ratio)
    ) ->> 'verifier'
    from glyphnum_probe p
  ),
  'exam_verify_quant_glyphnum',
  'step 1 wins: the per-type verifier outranks the placement_tolerance generic these items declare'
);                                                                                      -- 7

-- --- 3. The bank is graded correctly ------------------------------------------------

select is(
  (
    select count(*)::integer
    from glyphnum_probe p
    where (app.exam_verify_response(
             p.item_id, jsonb_build_object('placedRatio', p.keyed_ratio)
           ) ->> 'score')::integer = 1
  ),
  12,
  'all 12 real bank items score 1 for the placement their own key names'
);                                                                                      -- 8
select is(
  (
    select count(*)::integer
    from glyphnum_probe p
    where (app.exam_verify_response(
             p.item_id, jsonb_build_object('placedRatio', p.nearest_wrong_ratio)
           ) ->> 'score')::integer = 0
  ),
  12,
  'all 12 score 0 for the NEAREST wrong tick — the tolerance band holds exactly the keyed one'
);                                                                                      -- 9
-- Zero, not merely small: the verifier re-derived the ratio from the mapping and landed on the
-- same double the generator wrote, so `round(numeric, 6)` and `Math.round(x * 1e6) / 1e6` agree
-- on this bank. A drift of one unit in the sixth decimal fails here.
select is(
  (
    select count(*)::integer
    from glyphnum_probe p
    where (app.exam_verify_response(
             p.item_id, jsonb_build_object('placedRatio', p.keyed_ratio)
           ) -> 'metrics' ->> 'M-PAE')::double precision = 0
  ),
  12,
  'M-PAE is exactly 0 at the keyed tick on every item, so the re-derived ratio is bit-identical '
  'to the one the generator stored'
);                                                                                      -- 10
select is(
  (
    select count(*)::integer
    from app.exam_item i
    cross join lateral jsonb_array_elements(i.content -> 'options') o
    cross join lateral (
      select app.exam_verify_response(
        i.item_id, jsonb_build_object('placedRatio', (o.value ->> 'ratio')::double precision)
      ) as verdict
    ) v
    where i.type_code = 'QUANT-GLYPHNUM-01'
      and i.provenance ->> 'generator' = 'grammar'
      and (
        v.verdict -> 'metrics' -> 'M-PAE' is null
        or (v.verdict -> 'metrics' ->> 'M-PAE')::double precision < 0
        or (v.verdict -> 'metrics' ->> 'M-PAE')::double precision > 0.5
      )
  ),
  0,
  'every option of every item emits M-PAE inside the [0, 0.5] range the metric registry declares'
);                                                                                      -- 11
-- One verifier, both arms, no branch between them (STAGE2_QUESTION_DESIGN §4.1.1). The scrambled
-- arm re-draws the glyph->role mapping every item, so an implementation that had cached or
-- assumed one mapping would grade these four and only these four wrong.
select is(
  (
    select count(*)::integer
    from glyphnum_probe p
    join app.exam_item i on i.item_id = p.item_id
    where i.provenance -> 'levers' ->> 'systemPersistence' = 'perTrial'
      and (app.exam_verify_response(
             p.item_id, jsonb_build_object('placedRatio', p.keyed_ratio)
           ) ->> 'score')::integer = 1
  ),
  4,
  'the same function grades the scrambled-system CONTROL arm, whose mapping is redrawn per item'
);                                                                                      -- 12

-- --- 4. The re-derivation is real ---------------------------------------------------
--
-- c9001 and c9003 are the same bank item carrying the same corrupted `targetRatio` of 0.05. The
-- only difference between them is whether `answer.system` is present. If the verifier were reading
-- the stored scalar, the two would grade identically.

select ok(
  (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000c9001', '{"placedRatio":0.525}'::jsonb
   ) ->> 'correct')::boolean,
  'a corrupted stored targetRatio is ignored: the keyed tick is still correct because the ratio '
  'was re-derived from the glyph->role mapping'
);                                                                                      -- 13
select ok(
  not (app.exam_verify_response(
         '00000000-0000-4000-8000-0000000c9001', '{"placedRatio":0.05}'::jsonb
       ) ->> 'correct')::boolean,
  'and placing at the corrupted ratio itself is WRONG — assertion 13 is not passing by accident'
);                                                                                      -- 14
select ok(
  (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000c9002', '{"placedRatio":0.525}'::jsonb
   ) ->> 'correct')::boolean,
  'with no readable mapping the verifier falls back to the stored ratio and still grades the item'
);                                                                                      -- 15
select ok(
  (app.exam_verify_response(
     '00000000-0000-4000-8000-0000000c9003', '{"placedRatio":0.05}'::jsonb
   ) ->> 'correct')::boolean,
  'the fallback is a real fallback, not dead code: with the mapping gone the same corrupted ratio '
  'from assertion 14 is now the one that grades correct'
);                                                                                      -- 16

-- Assertions 13 and 14 corrupt the stored ratio on ONE item, whose expression is
-- `notch, crescent, arc` — three SCALE roles and no digit. So they pin the scale ladder and say
-- nothing about `digitII` or `digitIII`. That is a real hole rather than a tidiness point: a role
-- the reader cannot value at all aborts the derivation, and the derivation aborting drops through
-- to `answer.targetRatio`, which on a real bank item is correct. Assertions 8-12 then pass on a
-- verifier that never read the mapping.
--
-- Measured, before the assertions below existed: of the ten single-role mutations (five roles x
-- {unknown, wrong value}), the two that made a DIGIT role unknown passed this file. The other
-- eight failed, because a role that still has a value produces a wrong ratio rather than no ratio.
--
-- So the re-derivation is pinned on ALL TWELVE real bank items, both arms, the same way
-- SPA-XFORM-01 rotates its stored key (`150_exam_verify_spa_xform.test.sql` assertions 18-19).
-- The stored `targetRatio` is rotated to the NEAREST WRONG TICK, which assertion 9 has already
-- shown lies outside the tolerance band: if the notation decides, the keyed tick still grades
-- correct; if the fallback decided, the rotated tick does instead. There is no third outcome.
create temporary table glyphnum_tamper as
select
  md5(p.item_id::text || '|tampered')::uuid as item_id,
  p.keyed_ratio,
  p.nearest_wrong_ratio as rotated_ratio,
  i.content,
  jsonb_set(i.answer_key, '{targetRatio}', to_jsonb(p.nearest_wrong_ratio)) as answer_key,
  i.scoring,
  i.difficulty,
  i.age_bands
from glyphnum_probe p
join app.exam_item i on i.item_id = p.item_id;

-- `provenance.generator` is 'test-fixture', which keeps these copies out of the bank sweeps in
-- assertions 8-12, 20 and 21 — every one of them filters on `generator = 'grammar'`.
insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
select t.item_id, 'QUANT-GLYPHNUM-01', 'quantitative', t.difficulty, t.age_bands,
       t.content, t.answer_key, t.scoring,
       '{"generator":"test-fixture","derivedFrom":"ratio-rotation"}'::jsonb
from glyphnum_tamper t;

select is(
  (
    select count(*)::integer from glyphnum_tamper t
    where (app.exam_verify_response(
             t.item_id, jsonb_build_object('placedRatio', t.keyed_ratio)
           ) ->> 'correct')::boolean
  ),
  12,
  'the notation decides on every real bank item: the keyed tick survives a rotated stored ratio'
);                                                                                      -- 17
select is(
  (
    select count(*)::integer from glyphnum_tamper t
    where (app.exam_verify_response(
             t.item_id, jsonb_build_object('placedRatio', t.rotated_ratio)
           ) ->> 'correct')::boolean
  ),
  0,
  'and the rotated ratio never grades correct, so 8-12 were not riding the stored-ratio fallback'
);                                                                                      -- 18
-- Anti-vacuity for 17 and 18: rotating a ratio proves nothing about a role the sampled
-- expressions never use. All five must appear in the roles these twelve items actually read.
select is(
  (
    select count(distinct r)::integer
    from app.exam_item i,
         lateral jsonb_array_elements_text(i.answer_key -> 'expressionRoles') r
    where i.type_code = 'QUANT-GLYPHNUM-01'
      and i.provenance ->> 'generator' = 'grammar'
  ),
  5,
  'the twelve items read all five roles, so assertions 17-18 cover both digits and all three scales'
);                                                                                      -- 19

-- --- 5. Fail-closed on a response the renderer cannot produce -----------------------

select is(
  app.exam_verify_quant_glyphnum(
    jsonb_build_object(
      'content', jsonb_build_object('expression', jsonb_build_array('crescent')),
      'answer', jsonb_build_object(
        'targetRatio', 0.5, 'tolerance', 0.05, 'lineMax', 4,
        'system', jsonb_build_object('mapping', jsonb_build_object('crescent', 'scaleII'))
      )
    ),
    '{}'::jsonb
  )::text,
  '{"correct": false}',
  'a response with no placedRatio is incorrect with NO metrics — there is no placement error to '
  'report, which is exactly how the generic placement verifier behaves'
);                                                                                      -- 20
select ok(
  not (app.exam_verify_response(
         (select item_id from glyphnum_probe order by item_id limit 1),
         '{"placedRatio":"middle"}'::jsonb
       ) ->> 'correct')::boolean,
  'a non-numeric placement is incorrect rather than coerced'
);                                                                                      -- 21
select is(
  (
    select app.exam_verify_response(
      p.item_id, jsonb_build_object('placedRatio', p.keyed_ratio, 'skipped', true)
    ) ->> 'verifier'
    from glyphnum_probe p order by p.item_id limit 1
  ),
  'skipped',
  'a skipped item is not credited even when the body carries the keyed placement'
);                                                                                      -- 22

-- --- 6. The verdict carries no key material -----------------------------------------

select ok(
  (
    select string_agg(
      app.exam_verify_response(
        p.item_id, jsonb_build_object('placedRatio', p.nearest_wrong_ratio)
      )::text,
      ' '
    )
    from glyphnum_probe p
  ) !~ (
    '(correctKey|targetRatio|tolerance|lineMax|trueValue|mapping|systemId'
    || '|scaleI|scaleII|scaleIII|digitII|digitIII|arc|chevron|crescent|notch|spiral)'
  ),
  'no verdict returns the key, the target ratio, the tolerance band, the line maximum or any part '
  'of the glyph->role mapping'
);                                                                                      -- 23
select is(
  (
    select count(*)::integer
    from app.exam_item
    where type_code = 'QUANT-GLYPHNUM-01'
      and provenance ->> 'generator' = 'grammar'
      and answer_key ? 'correctKey'
      and answer_key ? 'targetRatio'
      and answer_key ? 'lineMax'
      and answer_key -> 'system' ? 'mapping'
  ),
  12,
  'the fixtures DO hold the real key and the real mapping server-side (assertion 23 is not vacuous)'
);                                                                                      -- 24

select * from finish();

rollback;
