-- =============================================================================
-- HELD FOR HUMAN REVIEW — NOT APPLIED.
-- Born-synthetic seed for the format-agnostic exam data model (AX-03, D-016).
--
-- This file is a deliverable held for human review BEFORE any database apply or
-- merge. It has NOT been applied to any database. See
-- `supabase/migrations/README_exam_data_model.md`.
--
-- Seeds TWO tunable policies to demonstrate that the SAME schema expresses
-- different delivery structures with config alone:
--   * `exam-syn-linear-v1`   — linear/fixed-form, classical scoring (the neutral default)
--   * `exam-syn-adaptive-v1` — adaptive, IRT scoring, expressed purely via config
-- plus a deterministic item bank (IRT-scored) and one classical item that
-- proves the NULLABLE IRT / no-difficulty-ladder path.
--
-- Everything is synthetic and validated=false; RES-012 covers real calibration.
-- Runs as the migration superuser (bypasses RLS).
-- =============================================================================

insert into app.exam_policy (policy_version, delivery_structure, config)
values (
  'exam-syn-linear-v1',
  'linear',
  jsonb_build_object(
    'policyVersion', 'exam-syn-linear-v1',
    'deliveryStructure', 'linear',
    'domains', jsonb_build_array('fluid_reasoning', 'verbal', 'quantitative', 'spatial'),
    'scoringModel', 'classical',
    'itemSelection', jsonb_build_object('strategy', 'fixed_order', 'params', jsonb_build_object()),
    'stopRule', jsonb_build_object('kind', 'fixed_count', 'params', jsonb_build_object('count', 8)),
    'decision', jsonb_build_object('advanceCut', 0.8, 'retryFloor', -0.8),
    'structureConfig', jsonb_build_object(),
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_policy (policy_version, delivery_structure, config)
values (
  'exam-syn-adaptive-v1',
  'adaptive',
  jsonb_build_object(
    'policyVersion', 'exam-syn-adaptive-v1',
    'deliveryStructure', 'adaptive',
    'domains', jsonb_build_array('fluid_reasoning', 'verbal', 'quantitative', 'spatial'),
    'scoringModel', 'irt_2pl',
    'itemSelection', jsonb_build_object(
      'strategy', 'max_information',
      'params', jsonb_build_object('exposureTopK', 3)
    ),
    'stopRule', jsonb_build_object(
      'kind', 'target_precision',
      'params', jsonb_build_object('targetSe', 0.42, 'minItems', 3, 'maxItems', 6)
    ),
    'decision', jsonb_build_object('advanceCut', 0.8, 'retryFloor', -0.8),
    'structureConfig', jsonb_build_object('priorMean', 0, 'priorSd', 1),
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_question_type (type_code, domain, name, demo_path, scoring_model)
values
  ('FLU-MATRIX-01', 'fluid_reasoning', 'Machine Matrix', 'FLU-MATRIX-01.html', 'irt_2pl'),
  ('FLU-ANALOGY-01', 'fluid_reasoning', 'Shape Morph', 'FLU-ANALOGY-01.html', 'irt_2pl'),
  ('VER-CLOZE-01', 'verbal', 'Fill the Gap', 'VER-CLOZE-01.html', 'classical'),
  ('VER-EVIDENCE-01', 'verbal', 'Proof Hunt', 'VER-EVIDENCE-01.html', 'irt_2pl'),
  ('QUANT-SERIES-01', 'quantitative', 'Number Series Stepping Stones', 'QUANT-SERIES-01.html', 'irt_2pl'),
  ('QUANT-FUNCMACHINE-01', 'quantitative', 'Function Machine', 'QUANT-FUNCMACHINE-01.html', 'irt_2pl'),
  ('SPA-ROLL-01', 'spatial', 'Rolling Cube', 'SPA-ROLL-01.html', 'irt_2pl'),
  ('SPA-XSCAN-01', 'spatial', 'Scan Stacker', 'SPA-XSCAN-01.html', 'irt_2pl')
on conflict (type_code) do nothing;

-- IRT-scored bank: deterministic spread of difficulties per type.
insert into app.exam_item (
  item_id, type_code, domain, difficulty_level, scoring_model,
  irt_a, irt_b, irt_c, irt_model, age_bands, params, synthetic_only
)
select
  extensions.gen_random_uuid(),
  t.type_code,
  t.domain,
  lvl,
  'irt_2pl',
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
    ('VER-EVIDENCE-01', 'verbal'),
    ('QUANT-SERIES-01', 'quantitative'),
    ('QUANT-FUNCMACHINE-01', 'quantitative'),
    ('SPA-ROLL-01', 'spatial'),
    ('SPA-XSCAN-01', 'spatial')
) as t(type_code, domain)
cross join generate_series(1, 8) as lvl;

-- Non-IRT item: proves the format-agnostic NULLABLE IRT / no-ladder path.
insert into app.exam_item (
  item_id, type_code, domain, difficulty_level, scoring_model,
  irt_a, irt_b, irt_c, irt_model, age_bands, params, synthetic_only
)
values (
  extensions.gen_random_uuid(),
  'VER-CLOZE-01',
  'verbal',
  null,
  'classical',
  null,
  null,
  null,
  null,
  array['2-3', '4-5'],
  jsonb_build_object('seed', 'VER-CLOZE-01-classical'),
  true
);
