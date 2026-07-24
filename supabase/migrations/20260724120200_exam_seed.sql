-- Born-synthetic seed for the adaptive screening instrument (AX-03, D-016).
-- A tunable, GT-owned policy plus a deterministic item bank: 12 question types
-- (3 per reasoning domain), each with a 6-rung IRT difficulty ladder so a 12-15
-- item adaptive session draws across all four domains and visibly escalates.
-- Runs as the migration superuser (bypasses RLS). Every parameter is synthetic
-- and validated=false; RES-012 covers real calibration. The item bank maps 1:1
-- to the wired question-type demos under apps/web/public/exam-demos/<CODE>.html.

insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-v1',
  jsonb_build_object(
    'policyVersion', 'exam-syn-v1',
    'domains', jsonb_build_array('fluid_reasoning', 'verbal', 'quantitative', 'spatial'),
    'minItemsPerDomain', 3,
    'maxItemsPerDomain', 4,
    -- Generous stop SE so most domains finish at 3 items (12) and weaker/uneven
    -- domains take a 4th, keeping the whole battery in the ~12-15 item band.
    'targetSe', 0.8,
    'priorMean', 0,
    'priorSd', 1,
    'exposureTopK', 2,
    'fitWeights', jsonb_build_object(
      'fluid_reasoning', 1,
      'verbal', 1,
      'quantitative', 1,
      'spatial', 1
    ),
    'admitCut', 0.5,
    'retryCut', -0.5,
    -- Timeback-fit micro-shifts: accuracy/theta dominant, small telemetry nudge.
    'learningRateWeight', 0.12,
    'consistencyWeight', 0.12,
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

-- 12 question types (3 per domain). demo_path is the served renderer filename.
insert into app.exam_question_type (type_code, domain, name, demo_path)
values
  ('FLU-MATRIX-01',  'fluid_reasoning', 'Machine Matrix',      'FLU-MATRIX-01.html'),
  ('FLU-CARPET-01',  'fluid_reasoning', 'Pattern Carpet',      'FLU-CARPET-01.html'),
  ('FLU-ANALOGY-01', 'fluid_reasoning', 'Shape Morph',         'FLU-ANALOGY-01.html'),
  ('QUANT-SERIES-01','quantitative',    'Pattern Steps',       'QUANT-SERIES-01.html'),
  ('QUANT-GRAPH-01', 'quantitative',    'Story Graph',         'QUANT-GRAPH-01.html'),
  ('QUANT-FUNC-01',  'quantitative',    'Machine Rule',        'QUANT-FUNC-01.html'),
  ('SPA-ROLL-01',    'spatial',         'Rolling Cube',        'SPA-ROLL-01.html'),
  ('SPA-XSCAN-01',   'spatial',         'Scan Stacker',        'SPA-XSCAN-01.html'),
  ('SPA-PICKFOLD-01','spatial',         'Which Fold Made It?', 'SPA-PICKFOLD-01.html'),
  ('VER-CLOZE-01',   'verbal',          'Fill the Gap',        'VER-CLOZE-01.html'),
  ('VER-EVIDENCE-01','verbal',          'Proof Hunt',          'VER-EVIDENCE-01.html'),
  ('VER-RELPAIR-01', 'verbal',          'Relation Match',      'VER-RELPAIR-01.html')
on conflict (type_code) do nothing;

-- Item bank: each type gets 6 difficulty rungs (levels 1-6). IRT difficulty (b)
-- spans roughly -2.25..+2.25 on the theta scale so max-information selection
-- climbs the ladder as ability rises; discrimination (a) rises gently with rung.
insert into app.exam_item (
  item_id, type_code, domain, difficulty_level,
  irt_a, irt_b, irt_c, irt_model, age_bands, params, synthetic_only
)
select
  extensions.gen_random_uuid(),
  t.type_code,
  t.domain,
  lvl,
  round((1.0 + 0.06 * lvl)::numeric, 3),
  round(((lvl - 3.5) * 0.9)::numeric, 3),
  0,
  '2PL',
  array['K-1', '2-3', '4-5', '6-8'],
  jsonb_build_object('seed', t.type_code || '-' || lvl, 'difficulty', lvl),
  true
from (
  values
    ('FLU-MATRIX-01', 'fluid_reasoning'),
    ('FLU-CARPET-01', 'fluid_reasoning'),
    ('FLU-ANALOGY-01', 'fluid_reasoning'),
    ('QUANT-SERIES-01', 'quantitative'),
    ('QUANT-GRAPH-01', 'quantitative'),
    ('QUANT-FUNC-01', 'quantitative'),
    ('SPA-ROLL-01', 'spatial'),
    ('SPA-XSCAN-01', 'spatial'),
    ('SPA-PICKFOLD-01', 'spatial'),
    ('VER-CLOZE-01', 'verbal'),
    ('VER-EVIDENCE-01', 'verbal'),
    ('VER-RELPAIR-01', 'verbal')
) as t(type_code, domain)
cross join generate_series(1, 6) as lvl;
