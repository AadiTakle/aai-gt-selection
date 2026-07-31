import type { AgeBand, BurstPolicy, CoreMetricSpec, EngineConfig } from './types';

/**
 * Start difficulty seeded from the requested grade band (BUILD_PLAN §0). Midpoints of the
 * design difficulty ramp: K-1 ≈ 1-4, 2-3 ≈ 4-8, 4-5 ≈ 8-12, 6-8 ≈ 12-16, above-level ≈ 16-20.
 */
export const GRADE_BAND_SEED: Record<AgeBand, number> = {
  'K-1': 3,
  '2-3': 7,
  '4-5': 11,
  '6-8': 15,
  'above-level': 18,
};

/** Full 1..20 difficulty scale bounds. */
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 20;
/** Span of the scale, used to normalise "surprise" in the difficulty update. */
export const DIFFICULTY_RANGE = DIFFICULTY_MAX - DIFFICULTY_MIN;

/**
 * Basic-core metric set (BUILD_PLAN §4). Enforced metrics gate the stop rule; tracked-inert
 * metrics (enforced=false) only bias selection toward coverage variety. `minSamples` and the
 * enforced flags are design-provisional defaults (born-synthetic, validated=false).
 *
 * Each entry declares HOW its samples arrive (`kind`) and WHAT population `minSamples` counts
 * over (`adequacy`):
 *
 * - `observed` metrics are emitted per item by a renderer or by server verification, so a sample
 *   is one emission.
 * - `derived` metrics are session-level aggregates fitted from the trace; a renderer cannot emit
 *   them, so their `minSamples` counts the derivation's inputs (see `derived.ts`).
 * - `session` adequacy is used for the response-time family, whose "how much to collect" in
 *   `MEASUREMENTS.md` is stated per CHILD (a per-child RT distribution), not per construct.
 *
 * An enforced metric that no wired type can supply would make the stop rule unsatisfiable and
 * silently pin the battery to `hardItemCap`. `auditMetricSupply` (coverage.ts) re-derives supply
 * from the live banks and the real-bank tests fail if that ever becomes true again.
 */
export const CORE_METRICS: CoreMetricSpec[] = [
  // --- per-item observed, per-area ---
  { id: 'M-ACC', scope: 'all', minSamples: 5, enforced: true, kind: 'observed' },
  { id: 'M-ERRTYPE', scope: 'all', minSamples: 3, enforced: true, kind: 'observed' },
  /*
   * M-REV is declared per area rather than once with `scope:'all'`, because after the
   * question-type review retired `QUANT-EQUAL-01` no quantitative type declares it — and
   * `QUANT-EQUAL-01` was its only quantitative supplier. Enforcing a metric with zero suppliers
   * in an area makes `areaMetricsCovered` permanently false there, which pins every battery to
   * `hardItemCap` instead of ending on the stop rule. So it stays enforced in the three areas
   * whose banks supply it and is tracked-only in quantitative, where it still biases selection
   * toward coverage variety but cannot block completion. Re-enforce it for quantitative when a
   * quantitative type declares a revision count.
   */
  {
    id: 'M-REV',
    scope: 'fluid_reasoning',
    minSamples: 3,
    enforced: true,
    kind: 'observed',
    supplyNote: 'Five fluid types supply it; thin, so selection luck matters if banks shrink.',
  },
  { id: 'M-REV', scope: 'verbal', minSamples: 3, enforced: true, kind: 'observed' },
  { id: 'M-REV', scope: 'spatial', minSamples: 3, enforced: true, kind: 'observed' },
  { id: 'M-REV', scope: 'quantitative', minSamples: 3, enforced: false, kind: 'observed' },
  {
    id: 'M-RULEID',
    scope: 'fluid_reasoning',
    minSamples: 3,
    enforced: true,
    kind: 'observed',
    supplyNote: 'Four fluid types supply it; thin, so selection luck matters if banks shrink.',
  },
  { id: 'M-VOCABLVL', scope: 'verbal', minSamples: 3, enforced: true, kind: 'observed' },
  { id: 'M-LURETYPE', scope: 'verbal', minSamples: 3, enforced: true, kind: 'observed' },
  /*
   * M-PAE is DECLARED but NOT enforced. Proportional absolute error is a number-line placement
   * statistic, and `QUANT-NUMLINE-01` — the only number-line placement type ever wired — was
   * retired by the question-type review. No surviving quantitative type can emit it, so
   * enforcing it made the quantitative area permanently uncoverable. The engine still counts it
   * wherever a type supplies it; re-enforce it when a placement type is wired again.
   */
  { id: 'M-PAE', scope: 'quantitative', minSamples: 3, enforced: false, kind: 'observed' },

  // --- per-item observed, session-level adequacy (per-child RT distribution) ---
  {
    id: 'M-RT',
    scope: 'all',
    minSamples: 20,
    enforced: true,
    kind: 'observed',
    adequacy: 'session',
    supplyNote:
      'Sole source in quantitative (QUANT-DOTS-01); session adequacy keeps that non-blocking.',
  },
  {
    id: 'M-RTFIRST',
    scope: 'all',
    minSamples: 15,
    enforced: true,
    kind: 'observed',
    adequacy: 'session',
  },

  // --- derived from the trace (see derived.ts) ---
  { id: 'M-DIFFREACH', scope: 'all', minSamples: 6, enforced: true, kind: 'derived' },
  { id: 'M-CONSIST', scope: 'all', minSamples: 3, enforced: true, kind: 'derived' },
  /*
   * M-LEARNRATE is DERIVED but NOT enforced, and its minimum is the novel-block length rather than
   * a per-area item count.
   *
   * It was enforced at 8 samples per area, which had two costs. The stop rule could not end a
   * session until all four areas had accumulated 8 growth trials, and having spent those items the
   * scorer then reported a number that does not survive its own measurement: simulated recovery of
   * an injected climb on this scale is about r = 0.07 at 8 trials, with the estimate attenuated to
   * roughly a fifth of its true size. That is not a weak signal, it is no signal, bought at four
   * areas' worth of items.
   *
   * A per-area growth statistic also cannot be separated from the search that produced it. While an
   * area is still bracketing, the hardest difficulty solved rises as the estimate converges on a
   * child who was seeded away from their level, so `deriveLearningRate`'s own claim boundary notes
   * that a large early climb partly reflects seed distance rather than learning. Enforcing it meant
   * requiring every area to produce a number that conflates the two.
   *
   * The rate is therefore measured once per session over a dedicated novel block in ONE area, after
   * that area's estimate has settled (`learning-block.ts`, and `learning-rate-readout.ts` in
   * `@gt-selection/exam-scoring`). `minSamples` is set to that block length so the adequacy check
   * states the honest threshold; because the metric is derived and unenforced, the value does not
   * steer type selection (`underCoveredWeights` skips derived metrics) or area neediness
   * (`enforcedShortfallCount` counts only enforced ones), so it blocks nothing. Re-enforcing it
   * per area would require both a validated reference distribution and evidence that a per-area
   * block can be separated from its own bracketing. (D-030; measurements in E-095.)
   */
  { id: 'M-LEARNRATE', scope: 'all', minSamples: 30, enforced: false, kind: 'derived' },
  {
    id: 'M-RTVAR',
    scope: 'all',
    minSamples: 20,
    enforced: true,
    kind: 'derived',
    adequacy: 'session',
  },
  /*
   * M-ROTSLOPE is DERIVED but NOT enforced. It is fittable — SPA-VIEW-01 and SPA-XSCAN-01 record
   * `answer.angularDisparityDeg` per item — but not adequately within a proportionate spatial
   * block: a stable Shepard-Metzler slope needs >=12 correct trials across >=3 disparities
   * (MEASUREMENTS.md), zero of the 66 catalog types declare it, SPA-XSCAN-01 supplies a disparity
   * on only 38 of 140 items and all of those sit at difficulty >=14.6, and forcing 12 trials from
   * one or two types would both crowd out spatial construct breadth and push the battery into the
   * safety cap. Enforcing it made the spatial area permanently uncoverable. The engine still
   * derives its value whenever the trace happens to contain enough disparity trials; re-enforce it
   * when a dedicated mental-rotation type is wired with disparity across the difficulty ramp.
   */
  { id: 'M-ROTSLOPE', scope: 'spatial', minSamples: 12, enforced: false, kind: 'derived' },

  // Tracked-inert now: bias selection but do not block completion.
  { id: 'M-PATH', scope: 'interactive', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-EFF', scope: 'interactive', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-PLANFUL', scope: 'interactive', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-ENGAGE', scope: 'all', minSamples: 3, enforced: false, kind: 'observed' },
  /* No catalog type declares M-RAPIDGUESS yet; it is a host-side effort flag, tracked only. */
  { id: 'M-RAPIDGUESS', scope: 'all', minSamples: 3, enforced: false, kind: 'observed' },
  { id: 'M-IDEAFLU', scope: 'open_ended', minSamples: 3, enforced: false, kind: 'observed' },
];

/**
 * Default burst policy: OFF.
 *
 * Bursting changes how many instruction-readings a battery costs, which is a session-design
 * decision rather than an engine default, so the engine ships with it disabled and a caller opts in.
 * `maxOptions: 6` is the widest choice any wired bank offers (`FLU-MATRIX-01` runs 4, 5 and 6), so
 * at this setting the option count never by itself disqualifies a wired type — the bound exists so
 * that a future type offering a long candidate list is excluded without anyone editing a list.
 */
export const DEFAULT_BURST_POLICY: BurstPolicy = {
  maxLength: 1,
  minLength: 2,
  maxOptions: 6,
};

/** Bonus added to a type's selection score when its age bands include the current grade band. */
export const AGE_BAND_BONUS = 1.5;
/** Selection weight for an under-covered enforced core metric. */
export const ENFORCED_METRIC_WEIGHT = 2;
/** Selection weight for an under-covered tracked-inert metric. */
export const TRACKED_METRIC_WEIGHT = 1;

/**
 * Default, tunable engine configuration.
 *
 * Step-schedule defaults (`initialStep`, `minUpdate`, `stepDecayExponent`, `stepBurnInReversals`,
 * `surpriseGain`) are sized against the 1..20 difficulty scale and the grade-band seeds above:
 * `initialStep` 2.0 crosses the widest seed-to-ability gap the screener must handle (a '4-5'
 * child seeded at 11 whose true ability is 18, or 1) inside about four items per area, while the
 * `minUpdate` asymptote of 0.25 is finer than the 0.4 fixed floor it replaces, so the tail of the
 * scale is measured MORE precisely, not less. Every one of these is a policy knob, not a constant:
 * see `docs/governance/DECISION_LOG.md` D-023.
 *
 * `ageBandBias` 0.5 prices the age-band content preference at half a difficulty point, so the band
 * decides between comparably targeted items but cannot buy the 2-3 point targeting error that used
 * to bias the estimate wherever the band's item supply ran out (D-025). Anything from 0 to 0.75
 * holds the same accuracy — better than before, in fact, since capping tracked-inert coverage gain
 * (D-201) took the ability sweep's worst error from 1.20 down to 0.77 — and the plateau's upper edge
 * now sits between 0.75 and 1.0 rather than at 1.0. It still decays smoothly rather than snapping:
 * at 1.0 one of the sweep's 72 ability × area cells lands 1.84 off, on one seed in five.
 * `real-bank.test.ts` asserts both the plateau and the softness of its edge.
 *
 * `typeSelectionTolerance` 0.5 and `itemSelectionTolerance` 0.25 are randomesque exposure control.
 * Without them selection is a strict argmax whose only variation was a +-0.1 jitter — too small to
 * outweigh a metric weight (1 or 2) or the age bonus (1.5) — so every session served the same types
 * in the same order (D-202).
 *
 * The type tolerance MUST stay below `trackedCoverageCap`, and that is what took it from the 1.0 it
 * was first calibrated at down to 0.5 (D-203). The tolerance was derived against the UNCAPPED
 * coverage sum, where a type could earn four tracked-metric points and the spread inside an area was
 * correspondingly wide. Capping the tracked total at one point (D-201) compressed that spread, so a
 * tolerance of 1.0 became exactly the value at which the whole tracked contribution stops deciding
 * anything — the type carrying a tracked shortfall and the type carrying none fall within tolerance
 * of each other, cancelling the tilt the cap was left in place to preserve — and at which a type
 * closing an ENFORCED shortfall (weight 2) comes within reach of a rival closing none but holding a
 * tracked gap (2 - 1 = 1.0). Measured over 80 sittings on the wired bank, 1.0 cost 1.9 items per
 * session against 0.5 and bought 0.3 of a distinct type. Below about 1/3 the knob stops doing
 * anything at all, because no score gap is smaller than the narrowest recency step.
 *
 * The item tolerance MUST stay below `ageBandBias`, or it cancels the age-band preference outright:
 * a non-matching item carries exactly `ageBandBias` of penalty, so a tolerance of 0.5 makes it
 * indistinguishable from a matching item at the same difficulty and D-025's content preference
 * stops applying. 0.25 keeps the band decisive while still admitting a quarter-point of variety.
 *
 * `selectionRule` ships as `mepv`: a belief over the child's standing is maintained from the trace,
 * and each candidate is scored by simulating both answers and averaging the variance that would
 * remain. `mfi` is the cheaper rule that maximises information at the belief's mean; `staircase`
 * restores the previous up-down rule exactly; `cut` aims at a decision point instead of at the
 * child. Knobs belonging to one rule are inert under the others.
 *
 * `mepv` OVER `mfi` DESPITE `mfi` WINNING THE OBVIOUS METRIC, because the two metrics disagree and
 * one of them is partly circular. Over 60 sittings, `mfi` reaches a stated SE sooner (6.4 items to
 * SE <= 1.25 against 7.0, and 195 of 240 areas ever reaching it against 147) and ends with a
 * narrower interval (mean SE 1.14 against 1.29). But its estimates are further from the planted
 * ability: refitted RMSE 1.74 against 1.30. So `mfi` reports +-1.14 while erring +-1.74 — an
 * interval about half again too narrow — where `mepv` reports 1.29 and errs 1.30, which is
 * calibrated. An interval shown to a family has to mean what it says, so the arm that is honest
 * about its own uncertainty wins over the arm that reaches a threshold sooner.
 *
 * The circularity is worth naming: `mfi` selects items to maximise information at the estimate,
 * and the SE is one over the square root of exactly that information. Judging the two criteria by
 * SE therefore scores `mfi` on its own objective, while RMSE against a planted ability is outcome-
 * based and favours no rule by construction. The literature's finding that sophisticated criteria
 * add little past ten items reproduces here on precision and does NOT reproduce on accuracy; the
 * cost that made `mepv` questionable is also not biting, since a whole 60-sitting four-arm sweep
 * runs in about six seconds on this bank. Revisit if either changes: the knob is the whole change.
 *
 * `decisionCut` is `null`: no cut is assumed, because a real selection threshold is a district
 * fact with a defined authority and consequences for real children, not something this repository
 * may invent. `cut` selection is supported and measured, not enabled — and the measurements say
 * it is a different product, not a better one. Against an illustrative cut of 15 it decides more
 * areas faster (2.3 items, 223 of 240 areas against 3.0 and 183), and pays for it with an ability
 * estimate that is worthless away from the cut (refitted RMSE 3.40 against 1.30, mean SE 3.20
 * against 1.29), with the child's experience (47.8% of items at least 3 points above them against
 * 7.6%, worst run of consecutive misses 5.4 against 2.2), and with exposure control: it draws on
 * 265 distinct bank items where `mepv` draws on 1,329.
 *
 * `guessingFloor` 0.2 is the five-option item every wired bank is mostly made of. It is an
 * ASSUMPTION, not a measurement — `FLU-MATRIX-01` alone mixes four-, five- and six-option items,
 * and a plausible distractor set effectively raises the option count while a disengaged child
 * lowers it. It is set positive rather than left at 0 because 0 is the one value known to be
 * wrong: it is what made the standing estimate read above the child, and under `mepv` it would
 * also aim every item at an even chance when a five-option item's information peaks at about 0.65.
 *
 * Swept against children who guess at their item's own option count, the penalty either side is
 * real and asymmetric — signed error of the reported standing level runs +1.32 at a floor of 0,
 * +0.35 at 0.1, +0.12 at 0.2, -0.06 at 0.25 and -0.46 at 0.35, so overstating the floor
 * ATTENUATES a child just as understating it inflates them. 0.2 also minimises RMSE (1.40) and
 * keeps 39/40 sittings concluding on evidence, where 0.25 drops that to 36/40.
 *
 * `responseSlope` 1.0 and `posteriorPriorSd` 6.0 deliberately match the scoring package's ability
 * fit, so selection and reporting assume one response curve rather than two. `posterior.test.ts`
 * pins that the belief and that fit agree.
 *
 * `mepvTolerance` 0.05 admits any item within 5% of the best expected posterior variance — about
 * 2.5% on the SE scale — as an equivalent substitute, which the age-band preference then decides
 * between. It is the `mepv` counterpart of `itemSelectionTolerance` and is set far tighter in
 * relative terms, because under `mepv` the tolerance is what the age band is allowed to spend
 * rather than what it is charged. Swept over 40 sittings on the wired bank: 0.15 costs both error
 * and precision outright (refit RMSE 1.52 against 1.26, mean SE 1.41 against 1.27), and 0 buys the
 * narrowest intervals but stops deserving them — RMSE 1.40 against a mean SE of 1.22, i.e. an
 * interval about 15% tighter than the error it is meant to describe. 0.05 is where the two agree.
 *
 * `typeNoveltyBonus` 0.5 prices a task format the area has not drawn from yet at a third of the
 * age-band content match and a quarter of an enforced coverage shortfall. It must stay below
 * `ENFORCED_METRIC_WEIGHT`, or a novel type outranks the type that unblocks the stop rule. The
 * sweep is the reason it is 0.5 rather than 1.0: at 1.0 it buys about 1.6 more distinct types per
 * session and costs 0.26 of refitted RMSE, and it takes the reported interval back out of
 * calibration (RMSE 1.53 against a mean SE of 1.31). Variety is worth paying for out of slack, not
 * out of the estimate.
 *
 * `areaSpreadSlack` ships at 0, so uncertainty decides between areas TIED for fewest items seen and
 * never overrides the count itself. The knob supports looking further, and is clamped against
 * `evenSpreadTolerance` where it is read so the even-spread gate the stop rule depends on cannot be
 * breached however it is set — but 0 is what the measurements were taken at and what the browser
 * runs. The portal's `evenSpreadTolerance` of 1 already forces the clamp to 0, so any larger
 * default would be inert in production while quietly changing behaviour under the engine's own
 * defaults; at 1 that showed up as a within-session type-repeat regression in
 * `selection-variety.test.ts`, an area held two items in a row being two items not spent
 * elsewhere. Uncertainty-ranked TIE-BREAKING is where the measured gain was, and it costs nothing.
 */
export const DEFAULT_CONFIG: EngineConfig = {
  seed: 0xc0ffee,
  selectionRule: 'mepv',
  decisionCut: null,
  responseSlope: 1.0,
  guessingFloor: 0.2,
  posteriorPriorSd: 6.0,
  mepvTolerance: 0.05,
  difficultyWindow: 3,
  ageBandBias: 0.5,
  typeSelectionTolerance: 0.5,
  itemSelectionTolerance: 0.25,
  typeRecencyPenalty: 1.0,
  typeRecencyWindow: 3,
  typeNoveltyBonus: 0.5,
  accWindowSize: 10,
  estWindowSize: 10,
  minUpdate: 0.25,
  maxUpdate: 3.0,
  initialStep: 2.0,
  stepDecayExponent: 1.0,
  stepBurnInReversals: 0,
  surpriseGain: 1.0,
  nearMissSoften: 0.5,
  evenSpreadTolerance: 2,
  areaSpreadSlack: 0,
  minItemsPerArea: 6,
  /*
   * Two, the weakest form of the requirement that means anything: an area's estimate may not rest
   * entirely on one task format. Every wired area supplies at least eight types, so this costs at
   * most one extra selection per area and only when bursting has narrowed one.
   */
  minTypesPerArea: 2,
  stabilityWindow: 6,
  stabilitySd: 1.2,
  stabilityDrift: 0.8,
  hardItemCap: 60,
  burst: DEFAULT_BURST_POLICY,
  /*
   * One tracked-inert metric's worth, total. Tracked metrics cannot block completion, so a type
   * that declares four of them is not four times as useful as one that declares one — but the
   * uncapped sum made it four times as attractive, which is a bigger margin than the age-band
   * content match (1.5) and enough to win the same area's selection several items running. See
   * `coverageGain` and D-201.
   */
  trackedCoverageCap: TRACKED_METRIC_WEIGHT,
  consistencyPairTolerance: 1.0,
  rotationMinDistinctDisparities: 3,
  coreMetrics: CORE_METRICS,
};
