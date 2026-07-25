-- Born-synthetic seed for the adaptive K-8 screener (serves R11; BUILD_PLAN §0/§6).
-- A default tunable policy plus a deterministic item bank spanning a FLOAT difficulty
-- ramp (~1.45..19.5) for one reference type per domain, each with a SERVER-ONLY answer
-- key + scoring rule. Runs as the migration superuser (bypasses RLS).
-- Every parameter is synthetic and validated=false; real calibration is out of scope here.

insert into app.exam_policy (policy_version, config)
values (
  'exam-syn-v1',
  jsonb_build_object(
    'policyVersion', 'exam-syn-v1',
    'domains', jsonb_build_array('fluid_reasoning', 'verbal', 'quantitative', 'spatial'),
    -- Per-grade-band start difficulty (float 1..20), mid-points of the ramp bands.
    'gradeStart', jsonb_build_object('K-1', 2.5, '2-3', 6, '4-5', 10, '6-8', 14),
    'minItemsPerArea', 3,
    'maxItemsPerArea', 8,
    'maxItems', 40,
    -- Difficulty-update magnitude and convergence threshold (gradual ramp, §3).
    'stepSize', 0.8,
    'stableDelta', 0.5,
    'areaWeights', jsonb_build_object(
      'fluid_reasoning', 1, 'verbal', 1, 'quantitative', 1, 'spatial', 1
    ),
    'coreMetrics', jsonb_build_array(
      'M-ACC', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-RTVAR',
      'M-REV', 'M-ERRTYPE', 'M-CONSIST', 'M-LEARNRATE'
    ),
    'syntheticOnly', true,
    'validated', false
  )
)
on conflict (policy_version) do nothing;

insert into app.exam_question_type (type_code, domain, name, demo_path, metric_ids)
select
  t.type_code, t.domain, t.name, t.demo_path, t.metric_ids
from (
  values
    ('FLU-MATRIX-01', 'fluid_reasoning', 'Machine Matrix', 'FLU-MATRIX-01.html',
      array['M-ACC', 'M-DIFFREACH', 'M-RT', 'M-RTFIRST', 'M-REV', 'M-ERRTYPE', 'M-RULEID']),
    ('VER-ANALOGY-01', 'verbal', 'Word Bridge', 'VER-ANALOGY-01.html',
      array['M-ACC', 'M-DIFFREACH', 'M-RT', 'M-VOCABLVL', 'M-LURETYPE']),
    ('QUANT-SERIES-01', 'quantitative', 'Number Series Stepping Stones', 'QUANT-SERIES-01.html',
      array['M-ACC', 'M-DIFFREACH', 'M-RT', 'M-PAE']),
    ('SPA-FOLDNET-01', 'spatial', 'Fold the Net', 'SPA-FOLDNET-01.html',
      array['M-ACC', 'M-DIFFREACH', 'M-RT', 'M-ROTSLOPE'])
) as t(type_code, domain, name, demo_path, metric_ids)
on conflict (type_code) do nothing;

insert into app.exam_item (
  item_id, type_code, domain, difficulty, age_bands, content, answer_key, scoring, provenance
)
select
  extensions.gen_random_uuid(),
  g.type_code,
  g.domain,
  g.difficulty,
  case
    when g.difficulty < 4 then array['K-1']
    when g.difficulty < 8 then array['K-1', '2-3']
    when g.difficulty < 12 then array['2-3', '4-5']
    when g.difficulty < 16 then array['4-5', '6-8']
    else array['6-8']
  end,
  case g.mode
    when 'computed_solver' then jsonb_build_object(
      'prompt', 'Continue the number pattern.',
      'sequence', to_jsonb(array[g.lvl, g.lvl * 2, g.lvl * 3, g.lvl * 4]),
      'step', g.lvl,
      'difficulty', g.difficulty
    )
    else jsonb_build_object(
      'prompt', 'Choose the option that completes the pattern.',
      'options', jsonb_build_array(
        jsonb_build_object('key', 'A'),
        jsonb_build_object('key', 'B'),
        jsonb_build_object('key', 'C'),
        jsonb_build_object('key', 'D')
      ),
      'difficulty', g.difficulty
    )
  end,
  -- SERVER-ONLY answer key.
  case g.mode
    when 'computed_solver' then jsonb_build_object('solution', g.lvl * 5)
    else jsonb_build_object('correctKey', (array['A', 'B', 'C', 'D'])[1 + (g.lvl % 4)])
  end,
  jsonb_build_object('mode', g.mode),
  jsonb_build_object(
    'generator', 'grammar',
    'seed', g.type_code || '-' || g.lvl,
    'validatorVerdicts', jsonb_build_array()
  )
from (
  select
    t.type_code,
    t.domain,
    t.mode,
    lvl,
    round((lvl * 19.0 / 20.0 + 0.5)::numeric, 2) as difficulty
  from (
    values
      ('FLU-MATRIX-01', 'fluid_reasoning', 'deterministic_key'),
      ('VER-ANALOGY-01', 'verbal', 'deterministic_key'),
      ('QUANT-SERIES-01', 'quantitative', 'computed_solver'),
      ('SPA-FOLDNET-01', 'spatial', 'deterministic_key')
  ) as t(type_code, domain, mode)
  cross join generate_series(1, 20) as lvl
) g;
