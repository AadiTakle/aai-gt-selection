-- Born-synthetic seed for the adaptive screening instrument (AX-03, D-016).
-- A default tunable policy and a deterministic item bank with a spread of IRT
-- difficulties per domain. Runs as the migration superuser (bypasses RLS).
-- All parameters are synthetic and validated=false; RES-012 covers real calibration.

insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-v1',
  jsonb_build_object(
    'policyVersion', 'exam-syn-v1',
    'domains', jsonb_build_array('fluid_reasoning', 'verbal', 'quantitative', 'spatial'),
    'minItemsPerDomain', 3,
    'maxItemsPerDomain', 6,
    'targetSe', 0.42,
    'priorMean', 0,
    'priorSd', 1,
    'exposureTopK', 3,
    'fitWeights', jsonb_build_object(
      'fluid_reasoning', 1,
      'verbal', 1,
      'quantitative', 1,
      'spatial', 1
    ),
    'admitCut', 0.8,
    'retryCut', -0.8,
    'learningRateWeight', 0,
    'consistencyWeight', 0,
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_question_type (type_code, domain, name, demo_path)
values
  ('FLU-MATRIX-01', 'fluid_reasoning', 'Machine Matrix', 'FLU-MATRIX-01.html'),
  ('FLU-ANALOGY-01', 'fluid_reasoning', 'Shape Morph', 'FLU-ANALOGY-01.html'),
  ('VER-CLOZE-01', 'verbal', 'Fill the Gap', 'VER-CLOZE-01.html'),
  ('VER-EVIDENCE-01', 'verbal', 'Proof Hunt', 'VER-EVIDENCE-01.html'),
  ('QUANT-SERIES-01', 'quantitative', 'Number Series Stepping Stones', 'QUANT-SERIES-01.html'),
  ('QUANT-FUNCMACHINE-01', 'quantitative', 'Function Machine', 'QUANT-FUNCMACHINE-01.html'),
  ('SPA-ROLL-01', 'spatial', 'Rolling Cube', 'SPA-ROLL-01.html'),
  ('SPA-XSCAN-01', 'spatial', 'Scan Stacker', 'SPA-XSCAN-01.html')
on conflict (type_code) do nothing;

insert into app.exam_item (
  item_id, type_code, domain, difficulty_level,
  irt_a, irt_b, irt_c, irt_model, age_bands, params, synthetic_only
)
select
  extensions.gen_random_uuid(),
  t.type_code,
  t.domain,
  lvl,
  round((1.0 + 0.05 * lvl)::numeric, 3),
  round(((lvl - 4.5) * 0.55)::numeric, 3),
  0,
  '2PL',
  array['K-1', '2-3', '4-5', '6-8'],
  jsonb_build_object('seed', t.type_code || '-' || lvl, 'difficulty', lvl),
  true
from (
  values
    ('FLU-MATRIX-01', 'fluid_reasoning'),
    ('FLU-ANALOGY-01', 'fluid_reasoning'),
    ('VER-CLOZE-01', 'verbal'),
    ('VER-EVIDENCE-01', 'verbal'),
    ('QUANT-SERIES-01', 'quantitative'),
    ('QUANT-FUNCMACHINE-01', 'quantitative'),
    ('SPA-ROLL-01', 'spatial'),
    ('SPA-XSCAN-01', 'spatial')
) as t(type_code, domain)
cross join generate_series(1, 8) as lvl;
