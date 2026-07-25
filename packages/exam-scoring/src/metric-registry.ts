/**
 * Code registry of the BASIC-CORE metric set (BUILD_PLAN §4) plus every other
 * declared measurement kept as TRACKED-INERT.
 *
 * - `basic_core`  : tracked AND influencing selection/scoring now.
 * - `tracked_inert`: declared and (eventually) logged, but it does NOT influence
 *   selection or scoring under the current policy.
 *
 * Rationale strings cite the measurement IDs documented in
 * `research/exam-question-types/MEASUREMENTS.md`. See `METRICS_BASIS.md`.
 */
import { METRIC_IDS, type KnownMetricId } from './metric-ids';

/** Where a metric applies. `all` = cross-cutting; the four domains are area-specific. */
export type MetricScope =
  'all' | 'interactive' | 'open_ended' | 'fluid_reasoning' | 'verbal' | 'quantitative' | 'spatial';

/** What a metric is allowed to influence (BUILD_PLAN §4 "Used for"). */
export type MetricInfluence = 'select' | 'score' | 'track';

/** Whether a metric is part of the active basic-core set or only tracked. */
export type MetricTier = 'basic_core' | 'tracked_inert';

/** A single metric's registry entry. */
export interface MetricSpec {
  readonly id: KnownMetricId;
  readonly name: string;
  readonly scope: MetricScope;
  readonly tier: MetricTier;
  /**
   * Minimum samples (per scope/construct) for a usable estimate, from the
   * "How much" column of MEASUREMENTS.md. Used by the engine stop rule; the
   * scorer surfaces coverage but never blocks on it.
   */
  readonly minSamples: number;
  readonly influences: readonly MetricInfluence[];
  /** true when this metric drives the engine stop rule (M-CONSIST). */
  readonly drivesStopRule?: boolean;
  /** true when this metric feeds the output profile (M-LEARNRATE, M-RTVAR). */
  readonly contributesToProfile?: boolean;
  /** true for gate metrics that are tracked now but NOT enforced yet (M-ENGAGE, M-RAPIDGUESS). */
  readonly trackedNotEnforced?: boolean;
  readonly rationale: string;
}

/**
 * BASIC-CORE metric set — BUILD_PLAN §4 ("~16", 20 rows incl. domain-specific).
 * These are tracked AND influence selection/scoring now.
 */
export const BASIC_CORE_METRICS: readonly MetricSpec[] = [
  {
    id: 'M-ACC',
    name: 'Item accuracy',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 8,
    influences: ['select', 'score'],
    rationale:
      'Base IRT signal; per-area accuracy-at-difficulty is the score-bracket driver (MEASUREMENTS M-ACC: >=8-12 scored items near ability for a stable theta).',
  },
  {
    id: 'M-DIFFREACH',
    name: 'Ceiling / max difficulty reached',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 6,
    influences: ['select', 'score'],
    rationale:
      'Ceiling via adaptive escalation to failure; the sharpest single tail statistic (float 1-20) and the primary within-bracket driver (MEASUREMENTS M-DIFFREACH).',
  },
  {
    id: 'M-RT',
    name: 'Response time (total)',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 20,
    influences: ['score'],
    rationale:
      'Total response time = efficiency, credited ONLY behind the engagement gate; default within-bracket weight is 0 until M-ENGAGE/M-RAPIDGUESS are enforced (MEASUREMENTS M-RT: >=20 RT samples).',
  },
  {
    id: 'M-RTFIRST',
    name: 'First-action latency',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 15,
    influences: ['score'],
    rationale:
      'Planning/encoding latency; gated like M-RT, default weight 0 until the engagement gate is enforced (MEASUREMENTS M-RTFIRST: >=15 samples for a stable median).',
  },
  {
    id: 'M-RTVAR',
    name: 'Intra-individual RT variability',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 20,
    influences: ['score'],
    contributesToProfile: true,
    rationale:
      'Its INVERSE is the consistency signal that positions within the bracket; low RT variability tracks g better than peak speed (MEASUREMENTS M-RTVAR: >=20-30 samples; never reward raw speed).',
  },
  {
    id: 'M-REV',
    name: 'Revisions / answer changes',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 8,
    influences: ['score'],
    rationale:
      'Few, targeted revisions mark confident tail performers vs guess-and-check; adds process variance beyond right/wrong (MEASUREMENTS M-REV: every item).',
  },
  {
    id: 'M-ERRTYPE',
    name: 'Error type',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 3,
    influences: ['select', 'score'],
    rationale:
      'Near-miss vs random error refines sub-cut placement and sets the adaptive update magnitude (MEASUREMENTS M-ERRTYPE: every incorrect response; needs designed distractors).',
  },
  {
    id: 'M-CONSIST',
    name: 'Cross-item consistency',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 3,
    influences: ['score'],
    drivesStopRule: true,
    rationale:
      'Shrinks the conditional SE at the cut and drives the engine stop rule; inconsistent responders near the cut get more items (MEASUREMENTS M-CONSIST: >=3 matched parallel pairs).',
  },
  {
    id: 'M-LEARNRATE',
    name: 'Within-session learning rate',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 8,
    influences: ['score'],
    contributesToProfile: true,
    rationale:
      'Timeback-fit core: within-session ceiling growth / trials-to-mastery on a novel type (dynamic-assessment learning potential). A SCREENING HYPOTHESIS, not a will-benefit claim (MEASUREMENTS M-LEARNRATE: >=8-12 escalating trials).',
  },
  {
    id: 'M-PATH',
    name: 'Solution path / move sequence',
    scope: 'interactive',
    tier: 'basic_core',
    minSamples: 5,
    influences: ['score'],
    rationale:
      'Strategy signature on constructed/interactive items; scored where present, separates HOW not just WHETHER (MEASUREMENTS M-PATH: >=5 interactive items).',
  },
  {
    id: 'M-EFF',
    name: 'Efficiency vs optimal',
    scope: 'interactive',
    tier: 'basic_core',
    minSamples: 5,
    influences: ['score'],
    rationale:
      'Near-optimal solving at high difficulty is a clean tail separator; scored where an optimal is stored (MEASUREMENTS M-EFF: >=5 items with known optima).',
  },
  {
    id: 'M-PLANFUL',
    name: 'Planfulness / systematicity',
    scope: 'interactive',
    tier: 'basic_core',
    minSamples: 3,
    influences: ['score'],
    rationale:
      'Systematic vs impulsive pre-commit behavior scored from the action log; a strong process marker of high ability (MEASUREMENTS M-PLANFUL: aggregate over >=3 interactive items).',
  },
  {
    id: 'M-ENGAGE',
    name: 'Engagement / off-task',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 1,
    influences: ['track'],
    trackedNotEnforced: true,
    rationale:
      'Off-task/idle gate for every other signal; TRACKED now but NOT enforced yet, so no score weight is applied (MEASUREMENTS M-ENGAGE: continuous background logging).',
  },
  {
    id: 'M-RAPIDGUESS',
    name: 'Rapid-guessing / effort-validity flag',
    scope: 'all',
    tier: 'basic_core',
    minSamples: 8,
    influences: ['track'],
    trackedNotEnforced: true,
    rationale:
      'Per-response effort-validity flag that will gate speed/accuracy; TRACKED now but NOT enforced yet (MEASUREMENTS M-RAPIDGUESS: every scored item).',
  },
  {
    id: 'M-RULEID',
    name: 'Rule dimensionality solved',
    scope: 'fluid_reasoning',
    tier: 'basic_core',
    minSamples: 6,
    influences: ['score'],
    rationale:
      'Relational-complexity bound (Halford): how many co-acting rules the child binds at once; fluid-only positioning (MEASUREMENTS M-RULEID: >=6 orthogonally-keyed items).',
  },
  {
    id: 'M-VOCABLVL',
    name: 'Lexical frequency ceiling',
    scope: 'verbal',
    tier: 'basic_core',
    minSamples: 15,
    influences: ['score'],
    rationale:
      'Lexical ceiling: rarest word-frequency band handled at criterion; verbal-only positioning (MEASUREMENTS M-VOCABLVL: >=15-20 adaptive items). Encoded as an ascending difficulty band (higher = rarer mastered).',
  },
  {
    id: 'M-LURETYPE',
    name: 'Distractor lure profile',
    scope: 'verbal',
    tier: 'basic_core',
    minSamples: 10,
    influences: ['score'],
    rationale:
      'Which lure class pulls errors; category-cousin near-misses at high difficulty indicate latent ability just below the cut; verbal-only (MEASUREMENTS M-LURETYPE: >=10-15 errors). Encoded in [0,1], higher = nearer-miss lures.',
  },
  {
    id: 'M-PAE',
    name: 'Placement error (percent absolute error)',
    scope: 'quantitative',
    tier: 'basic_core',
    minSamples: 10,
    influences: ['score'],
    rationale:
      'Continuous number-line placement error; small consistent PAE separates top reasoners without ceiling; quant-only, LOWER is better (MEASUREMENTS M-PAE: >=10-15 placements).',
  },
  {
    id: 'M-ROTSLOPE',
    name: 'Mental-rotation RT slope',
    scope: 'spatial',
    tier: 'basic_core',
    minSamples: 12,
    influences: ['score'],
    rationale:
      'Shepard-Metzler chronometric signature; a shallow slope at high accuracy is a rate-of-transformation measure; spatial-only, LOWER is better (MEASUREMENTS M-ROTSLOPE: >=12 trials across >=3 disparities).',
  },
  {
    id: 'M-IDEAFLU',
    name: 'Idea fluency',
    scope: 'open_ended',
    tier: 'basic_core',
    minSamples: 3,
    influences: ['track', 'select'],
    rationale:
      'Auto-counted ideation fluency (most reliable single divergent index); participates in selection/coverage now, full originality judge deferred, so no score weight yet (MEASUREMENTS M-IDEAFLU: >=3 prompts).',
  },
];

/**
 * TRACKED-INERT metrics — every other declared measurement. Logged/declared but
 * NOT influencing selection or scoring under the current policy.
 */
export const TRACKED_INERT_METRICS: readonly MetricSpec[] = [
  {
    id: 'M-POLY',
    name: 'Partial-credit (polytomous) score',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 4,
    influences: ['track'],
    rationale:
      'Tracked-inert: graded score for multi-step items; extra tail info per rich item (MEASUREMENTS M-POLY).',
  },
  {
    id: 'M-LAPSE',
    name: 'Lapse rate',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 25,
    influences: ['track'],
    rationale:
      'Tracked-inert: worst-performance rule; the slowest responses are most diagnostic (MEASUREMENTS M-LAPSE).',
  },
  {
    id: 'M-HINT',
    name: 'Scaffold / hint usage',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 8,
    influences: ['track'],
    rationale:
      'Tracked-inert: hint-free solving is stronger evidence; dynamic-assessment adjunct (MEASUREMENTS M-HINT).',
  },
  {
    id: 'M-PERSIST',
    name: 'Persistence / time-on-task',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 6,
    influences: ['track'],
    rationale: 'Tracked-inert: task commitment on hard items (Renzulli) (MEASUREMENTS M-PERSIST).',
  },
  {
    id: 'M-CONF',
    name: 'Confidence / wager',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 8,
    influences: ['track'],
    rationale:
      'Tracked-inert: metacognitive calibration; down-weights lucky guesses (MEASUREMENTS M-CONF).',
  },
  {
    id: 'M-EXPLORE',
    name: 'Exploration behavior',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 5,
    influences: ['track'],
    rationale:
      'Tracked-inert: options/states sampled before commit; strategic vs flailing (MEASUREMENTS M-EXPLORE).',
  },
  {
    id: 'M-PROG',
    name: 'Progress trajectory',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 4,
    influences: ['track'],
    rationale:
      'Tracked-inert: partial-progress curve over a multi-step item (MEASUREMENTS M-PROG).',
  },
  {
    id: 'M-SPEEDACC',
    name: 'Speed-accuracy tradeoff',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 20,
    influences: ['track'],
    rationale:
      'Tracked-inert: joint RT x accuracy operating point; gate-dependent (MEASUREMENTS M-SPEEDACC).',
  },
  {
    id: 'M-DRIFT',
    name: 'Performance drift (fatigue/engagement)',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 30,
    influences: ['track'],
    rationale:
      'Tracked-inert: within-session fatigue slope; part of the future engagement gate (MEASUREMENTS M-DRIFT).',
  },
  {
    id: 'M-RESUME',
    name: 'Post-failure resumption',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 6,
    influences: ['track'],
    rationale:
      'Tracked-inert: retry/latency/voluntary-quit after failure = task commitment (MEASUREMENTS M-RESUME).',
  },
  {
    id: 'M-FLEX',
    name: 'Category flexibility',
    scope: 'open_ended',
    tier: 'tracked_inert',
    minSamples: 3,
    influences: ['track'],
    rationale:
      'Tracked-inert: distinct semantic categories touched in divergent tasks (MEASUREMENTS M-FLEX).',
  },
  {
    id: 'M-ORIG',
    name: 'Statistical originality',
    scope: 'open_ended',
    tier: 'tracked_inert',
    minSamples: 3,
    influences: ['track'],
    rationale:
      'Tracked-inert: response infrequency vs a per-prompt norm bank; bank not yet built/normed (MEASUREMENTS M-ORIG).',
  },
  {
    id: 'M-ELAB',
    name: 'Elaboration',
    scope: 'open_ended',
    tier: 'tracked_inert',
    minSamples: 3,
    influences: ['track'],
    rationale:
      'Tracked-inert: detail/embellishment added to an idea or figure (MEASUREMENTS M-ELAB).',
  },
  {
    id: 'M-QUERY',
    name: 'Information-seeking / question count',
    scope: 'open_ended',
    tier: 'tracked_inert',
    minSamples: 1,
    influences: ['track'],
    rationale: 'Tracked-inert: epistemic curiosity via questions asked (MEASUREMENTS M-QUERY).',
  },
  {
    id: 'M-UNCERT',
    name: 'Uncertainty preference',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 10,
    influences: ['track'],
    rationale:
      'Tracked-inert: preference for informative uncertainty; curiosity marker (MEASUREMENTS M-UNCERT).',
  },
  {
    id: 'M-CHOICE',
    name: 'Free-choice engagement',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 1,
    influences: ['track'],
    rationale:
      'Tracked-inert: voluntary time on task after the required portion ends; intrinsic motivation (MEASUREMENTS M-CHOICE).',
  },
  {
    id: 'M-DELAY',
    name: 'Delay-of-gratification wait time',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 1,
    influences: ['track'],
    rationale: 'Tracked-inert: self-regulation / future orientation (MEASUREMENTS M-DELAY).',
  },
  {
    id: 'M-EFFALLOC',
    name: 'Effort allocation ratio',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 1,
    influences: ['track'],
    rationale:
      'Tracked-inert: diligent-task vs distraction time ratio; academic diligence (MEASUREMENTS M-EFFALLOC).',
  },
  {
    id: 'M-HYP',
    name: 'Hypothesis-search efficiency',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 3,
    influences: ['track'],
    rationale:
      'Tracked-inert: informativeness of exploratory tests in rule discovery (MEASUREMENTS M-HYP).',
  },
  {
    id: 'M-COMBO',
    name: 'Accuracy-gated speed combo',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 30,
    influences: ['track'],
    rationale:
      'Tracked-inert: sustained joint speed+accuracy streak; gate-dependent (MEASUREMENTS M-COMBO).',
  },
  {
    id: 'M-FALSEALARM',
    name: 'Commission / false-alarm rate',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 40,
    influences: ['track'],
    rationale: 'Tracked-inert: impulsive fast-but-wrong responding (MEASUREMENTS M-FALSEALARM).',
  },
  {
    id: 'M-HICKSLOPE',
    name: "Hick's-law RT slope",
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 45,
    influences: ['track'],
    rationale:
      'Tracked-inert: device-robust processing-rate slope; speed adjunct (MEASUREMENTS M-HICKSLOPE).',
  },
  {
    id: 'M-ITTHRESH',
    name: 'Inspection-time threshold',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 40,
    influences: ['track'],
    rationale:
      'Tracked-inert: near motor-free perceptual intake speed; speed adjunct (MEASUREMENTS M-ITTHRESH).',
  },
  {
    id: 'M-WEBER',
    name: 'ANS acuity (Weber fraction)',
    scope: 'quantitative',
    tier: 'tracked_inert',
    minSamples: 30,
    influences: ['track'],
    rationale:
      'Tracked-inert: finest numerical ratio discriminable; low-literacy K-1 signal (MEASUREMENTS M-WEBER).',
  },
  {
    id: 'M-EQREL',
    name: 'Relational-vs-operational equivalence signature',
    scope: 'quantitative',
    tier: 'tracked_inert',
    minSamples: 4,
    influences: ['track'],
    rationale:
      'Tracked-inert: relational vs operational reading of "=" (algebra-ready) (MEASUREMENTS M-EQREL).',
  },
  {
    id: 'M-PROPSTRAT',
    name: 'Proportional strategy signature',
    scope: 'quantitative',
    tier: 'tracked_inert',
    minSamples: 4,
    influences: ['track'],
    rationale:
      'Tracked-inert: multiplicative vs additive proportional reasoning (MEASUREMENTS M-PROPSTRAT).',
  },
  {
    id: 'M-MIRRORFA',
    name: 'Mirror false-alarm rate',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 8,
    influences: ['track'],
    rationale:
      'Tracked-inert: enantiomorph foils vs true rotation; genuine 3D rotation (MEASUREMENTS M-MIRRORFA).',
  },
  {
    id: 'M-VIEWANG',
    name: 'Perspective-taking angular error',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 10,
    influences: ['track'],
    rationale: 'Tracked-inert: signed heading error and egocentric bias (MEASUREMENTS M-VIEWANG).',
  },
  {
    id: 'M-INFDEPTH',
    name: 'Inference depth level reached',
    scope: 'verbal',
    tier: 'tracked_inert',
    minSamples: 4,
    influences: ['track'],
    rationale:
      'Tracked-inert: deepest comprehension layer reached (literal->evaluative) (MEASUREMENTS M-INFDEPTH).',
  },
  {
    id: 'M-ORALSPAN',
    name: 'Oral-direction condition span',
    scope: 'verbal',
    tier: 'tracked_inert',
    minSamples: 12,
    influences: ['track'],
    rationale:
      'Tracked-inert: simultaneous spoken conditions integrated; language + verbal WM (MEASUREMENTS M-ORALSPAN).',
  },
  {
    id: 'M-SPAN',
    name: 'Memory span threshold',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 6,
    influences: ['track'],
    rationale:
      'Tracked-inert: working-memory profile signal, housed in visuospatial WM games (MEASUREMENTS M-SPAN).',
  },
  {
    id: 'M-MANIPCOST',
    name: 'Manipulation cost',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 6,
    influences: ['track'],
    rationale:
      'Tracked-inert: forward-minus-backward span = central-executive manipulation (WM profile) (MEASUREMENTS M-MANIPCOST).',
  },
  {
    id: 'M-DPRIME',
    name: 'Signal-detection sensitivity (d-prime)',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 20,
    influences: ['track'],
    rationale:
      'Tracked-inert: separates sensitivity from response bias in continuous tasks (MEASUREMENTS M-DPRIME).',
  },
  {
    id: 'M-UPDATECOST',
    name: 'Updating cost',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 4,
    influences: ['track'],
    rationale:
      'Tracked-inert: accuracy/RT decrement per added WM update; executive signal (WM profile) (MEASUREMENTS M-UPDATECOST).',
  },
  {
    id: 'M-POSTERR',
    name: 'Post-error adjustment',
    scope: 'all',
    tier: 'tracked_inert',
    minSamples: 10,
    influences: ['track'],
    rationale:
      'Tracked-inert: post-error slowing/recovery = performance monitoring (MEASUREMENTS M-POSTERR).',
  },
  {
    id: 'M-COMM',
    name: 'Commission-error rate',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 15,
    influences: ['track'],
    rationale:
      'Tracked-inert: no-go/stop failures = prepotent-response inhibition (MEASUREMENTS M-COMM).',
  },
  {
    id: 'M-SSRT',
    name: 'Stop-signal reaction time',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 30,
    influences: ['track'],
    rationale:
      'Tracked-inert: covert inhibitory-process latency; least coachable executive metric (MEASUREMENTS M-SSRT).',
  },
  {
    id: 'M-CONGEFF',
    name: 'Congruency/interference effect',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 20,
    influences: ['track'],
    rationale:
      'Tracked-inert: flanker/Stroop interference control independent of baseline speed (MEASUREMENTS M-CONGEFF).',
  },
  {
    id: 'M-SWITCHCOST',
    name: 'Task-switch cost',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 15,
    influences: ['track'],
    rationale:
      'Tracked-inert: set-shifting efficiency (switch minus repeat) (MEASUREMENTS M-SWITCHCOST).',
  },
  {
    id: 'M-PERSEV',
    name: 'Perseverative-error rate',
    scope: 'interactive',
    tier: 'tracked_inert',
    minSamples: 6,
    influences: ['track'],
    rationale:
      'Tracked-inert: applying the old rule after a switch = failure to update task set (MEASUREMENTS M-PERSEV).',
  },
  {
    id: 'M-PROCACC',
    name: 'Processing-task accuracy (complex-span gate)',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 15,
    influences: ['track'],
    rationale:
      'Tracked-inert: gate on complex-span storage validity (WM profile) (MEASUREMENTS M-PROCACC).',
  },
  {
    id: 'M-BETWEENERR',
    name: 'Between-search errors',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 6,
    influences: ['track'],
    rationale:
      'Tracked-inert: revisits to spent locations = failure to update spatial WM (MEASUREMENTS M-BETWEENERR).',
  },
  {
    id: 'M-SEARCHSTRAT',
    name: 'Search strategy score',
    scope: 'spatial',
    tier: 'tracked_inert',
    minSamples: 6,
    influences: ['track'],
    rationale:
      'Tracked-inert: systematic self-ordered search strategy (MEASUREMENTS M-SEARCHSTRAT).',
  },
];

/** Every metric spec (core first, then tracked-inert). */
export const ALL_METRIC_SPECS: readonly MetricSpec[] = [
  ...BASIC_CORE_METRICS,
  ...TRACKED_INERT_METRICS,
];

const SPEC_BY_ID: ReadonlyMap<string, MetricSpec> = new Map(
  ALL_METRIC_SPECS.map((spec) => [spec.id, spec]),
);

/**
 * Registry invariant: every canonical measurement ID appears exactly once and
 * nothing extra is declared. Thrown at module load if the registry drifts from
 * `metric-ids.ts`. (Also asserted directly in the test suite.)
 */
function assertRegistryComplete(): void {
  if (ALL_METRIC_SPECS.length !== SPEC_BY_ID.size) {
    throw new Error('exam-scoring metric registry: duplicate metric id detected.');
  }
  const missing = METRIC_IDS.filter((id) => !SPEC_BY_ID.has(id));
  if (missing.length > 0) {
    throw new Error(`exam-scoring metric registry: missing specs for ${missing.join(', ')}.`);
  }
  const extra = ALL_METRIC_SPECS.map((s) => s.id).filter(
    (id) => !(METRIC_IDS as readonly string[]).includes(id),
  );
  if (extra.length > 0) {
    throw new Error(`exam-scoring metric registry: unknown metric id(s) ${extra.join(', ')}.`);
  }
}
assertRegistryComplete();

/** Look up a metric spec by id (undefined if not registered). */
export function getMetricSpec(id: string): MetricSpec | undefined {
  return SPEC_BY_ID.get(id);
}

/** True when `id` is part of the active basic-core set. */
export function isBasicCore(id: string): boolean {
  return SPEC_BY_ID.get(id)?.tier === 'basic_core';
}

/** All specs that carry a given influence (e.g. `'score'`). */
export function metricsWithInfluence(influence: MetricInfluence): readonly MetricSpec[] {
  return ALL_METRIC_SPECS.filter((spec) => spec.influences.includes(influence));
}
