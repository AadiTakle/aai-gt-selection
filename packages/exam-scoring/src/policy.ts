/**
 * Tunable scoring policy (BUILD_PLAN §5: "Weights/cut = a tunable policy;
 * defaults now, wired to an admin portal later").
 *
 * Everything the scorer needs to turn stored item results into a score lives
 * here: bracket edges, per-metric within-bracket weights, and per-area
 * composite weights. Scoring is a pure function of `(items, policy)`, so
 * freezing a policy id makes a score fully reproducible.
 *
 * Admin-portal editing of these values is future work; the defaults below are
 * in code now.
 */
import type { KnownMetricId } from './metric-ids';
import { type Area, DOMAINS, SCALE_MAX, SCALE_MIN } from './types';

/** Normalization + direction for one within-bracket metric term. */
export interface MetricWeight {
  /** Relative weight in the within-bracket weighted average. `0` disables the term. */
  readonly weight: number;
  /** `higher` = larger raw value pushes the score up; `lower` = smaller value pushes it up. */
  readonly direction: 'higher' | 'lower';
  /** Reference range used to map the raw value to [0, 1] before weighting. */
  readonly range: { readonly min: number; readonly max: number };
}

/** One accuracy bracket: an accuracy floor mapped to a θ span on the [1, 20] scale. */
export interface BracketDef {
  readonly index: number;
  /** Inclusive lower bound on (difficulty-weighted) area accuracy for this bracket. */
  readonly accuracyMin: number;
  /**
   * The θ span this bracket occupies on the [1, 20] scale. Under `mode: 'ability'` this span is
   * ALSO the bracket's entry condition: the area lands in the bracket whose span contains the
   * fitted ability, so `accuracyMin` is unused.
   */
  readonly theta: { readonly min: number; readonly max: number };
}

/**
 * Which statistic decides an area's bracket. Both modes keep the two-stage §5 shape — this
 * statistic sets the bracket, the within-bracket metric average positions the child inside it.
 *
 * - `accuracy` (default): (difficulty-weighted) accuracy over the items served, against each
 *   bracket's `accuracyMin`. The shipped contract.
 * - `ability`: the difficulty-adjusted ability fitted from the trace ({@link AbilityBracketing}),
 *   against each bracket's `theta` span. Available for evaluation; NOT the default.
 */
export type BracketingMode = 'accuracy' | 'ability';

/** Knobs for the `ability` bracketing statistic. See `ability.ts` for what they mean. */
export interface AbilityBracketing {
  /** Logistic discrimination per scale point. */
  readonly slope: number;
  /** SD of the weakly-informative prior centred on the scale midpoint; `Infinity` disables it. */
  readonly priorSd: number;
}

/**
 * Defaults used when `bracketing.mode` is `ability` and `bracketing.ability` is omitted.
 *
 * `slope` 1.0 puts the model's transition band at roughly ±2 scale points, which matches the
 * granularity the engine's own step schedule resolves to (D-023); it is a design assumption, not
 * a calibrated discrimination. `priorSd` 6.0 is close to the SD of a uniform draw on [1, 20]
 * (≈5.5), i.e. deliberately about as weak as a proper prior on this scale can be.
 */
export const DEFAULT_ABILITY_BRACKETING: AbilityBracketing = {
  slope: 1.0,
  priorSd: 6.0,
};

/** Coarse-band thresholds (on a normalized [0, 1] signal) for profile labels. */
export interface BandThresholds {
  /** normalized >= this → at least "moderate". */
  readonly moderate: number;
  /** normalized >= this → "high". */
  readonly high: number;
}

/** A complete, tunable scoring policy. */
export interface ExamPolicy {
  /** Version/id echoed into the score for audit + reproducibility. */
  readonly id: string;
  readonly scale: { readonly min: number; readonly max: number };
  readonly bracketing: {
    /** Which statistic picks the bracket. Omitted ⇒ `accuracy` (the shipped default). */
    readonly mode?: BracketingMode;
    /** Weight each item's correctness by its difficulty when computing area accuracy. */
    readonly difficultyWeighted: boolean;
    /** Accuracy brackets, ascending by `accuracyMin`. */
    readonly brackets: readonly BracketDef[];
    /** Fit knobs for `mode: 'ability'`. Omitted ⇒ {@link DEFAULT_ABILITY_BRACKETING}. */
    readonly ability?: AbilityBracketing;
  };
  readonly position: {
    /** Within-bracket position used when an area has no weighted metric data. */
    readonly defaultPosition: number;
    /** Per-metric within-bracket weights. Only entries with `weight > 0` are applied. */
    readonly metricWeights: Readonly<Partial<Record<KnownMetricId, MetricWeight>>>;
  };
  /** Composite weights per area (renormalized over the areas that have data). */
  readonly areaWeights: Readonly<Record<Area, number>>;
  readonly profile: {
    /** θ units above/below the composite for an area to count as a strength/weakness. */
    readonly strengthMargin: number;
    readonly learnRateBands: BandThresholds;
    readonly consistencyBands: BandThresholds;
  };
}

const equalAreaWeights: Record<Area, number> = DOMAINS.reduce(
  (acc, area) => {
    acc[area] = 0.25;
    return acc;
  },
  {} as Record<Area, number>,
);

/**
 * Default policy (v1). Sensible starting values; every number here is a knob.
 *
 * Design notes:
 * - Brackets tile the [1, 20] scale in 5 steps that line up with the grade-band
 *   difficulty ramp (K-1≈1-4, 2-3≈4-8, 4-5≈8-12, 6-8≈12-16, above-level≈16-20).
 * - `M-DIFFREACH` is the dominant within-bracket driver (§5); consistency
 *   (inverse `M-RTVAR`), `M-LEARNRATE`, and `M-ERRTYPE` follow.
 * - Speed terms (`M-RT`, `M-RTFIRST`) are wired but weight 0 by default: speed is
 *   evidence only behind the engagement gate (M-ENGAGE/M-RAPIDGUESS), which is
 *   tracked-but-not-enforced for now. Admins can raise these once the gate ships.
 * - `bracketing.mode` is `accuracy`: the shipped contract, unchanged. The measured
 *   case for the alternative is in D-024; switching the default is the owner's call,
 *   not this policy's.
 */
export const DEFAULT_EXAM_POLICY: ExamPolicy = {
  id: 'exam-scoring-default-v1',
  scale: { min: SCALE_MIN, max: SCALE_MAX },
  bracketing: {
    mode: 'accuracy',
    difficultyWeighted: true,
    brackets: [
      { index: 0, accuracyMin: 0.0, theta: { min: 1, max: 4 } },
      { index: 1, accuracyMin: 0.35, theta: { min: 4, max: 8 } },
      { index: 2, accuracyMin: 0.55, theta: { min: 8, max: 12 } },
      { index: 3, accuracyMin: 0.7, theta: { min: 12, max: 16 } },
      { index: 4, accuracyMin: 0.85, theta: { min: 16, max: 20 } },
    ],
  },
  position: {
    defaultPosition: 0.5,
    metricWeights: {
      'M-DIFFREACH': { weight: 0.3, direction: 'higher', range: { min: 1, max: 20 } },
      'M-RTVAR': { weight: 0.2, direction: 'lower', range: { min: 0.05, max: 0.9 } },
      'M-LEARNRATE': { weight: 0.2, direction: 'higher', range: { min: 0, max: 1 } },
      'M-ERRTYPE': { weight: 0.12, direction: 'higher', range: { min: 0, max: 1 } },
      'M-CONSIST': { weight: 0.08, direction: 'higher', range: { min: 0, max: 1 } },
      'M-PATH': { weight: 0.04, direction: 'higher', range: { min: 0, max: 1 } },
      'M-EFF': { weight: 0.04, direction: 'higher', range: { min: 0, max: 1 } },
      'M-PLANFUL': { weight: 0.04, direction: 'higher', range: { min: 0, max: 1 } },
      'M-RULEID': { weight: 0.06, direction: 'higher', range: { min: 1, max: 4 } },
      'M-VOCABLVL': { weight: 0.06, direction: 'higher', range: { min: 1, max: 8 } },
      'M-LURETYPE': { weight: 0.06, direction: 'higher', range: { min: 0, max: 1 } },
      'M-PAE': { weight: 0.06, direction: 'lower', range: { min: 0, max: 0.5 } },
      'M-ROTSLOPE': { weight: 0.06, direction: 'lower', range: { min: 0, max: 30 } },
      'M-REV': { weight: 0.03, direction: 'lower', range: { min: 0, max: 10 } },
      'M-RT': { weight: 0, direction: 'lower', range: { min: 1000, max: 20000 } },
      'M-RTFIRST': { weight: 0, direction: 'lower', range: { min: 500, max: 15000 } },
    },
  },
  areaWeights: equalAreaWeights,
  profile: {
    strengthMargin: 1.0,
    learnRateBands: { moderate: 0.4, high: 0.7 },
    consistencyBands: { moderate: 0.4, high: 0.7 },
  },
};

/**
 * The default policy with the bracket driven by fitted ability instead of accuracy (D-024).
 *
 * NOT the default and NOT ratified: it exists so the alternative can be scored, compared, and
 * chosen (or rejected) on evidence. Every other knob — bracket spans, within-bracket weights,
 * area weights, profile bands — is identical to {@link DEFAULT_EXAM_POLICY}, so a difference
 * between the two scores is attributable to the bracketing statistic and nothing else.
 *
 * The bracket spans are reused unchanged as the ability cut points, which is what makes them
 * directly comparable: `[1,4] [4,8] [8,12] [12,16] [16,20]` are already the grade-band difficulty
 * ramp, so "the bracket whose span contains the child's fitted ability" needs no new table.
 */
export const ABILITY_BRACKET_POLICY: ExamPolicy = {
  ...DEFAULT_EXAM_POLICY,
  id: 'exam-scoring-ability-bracket-v1',
  bracketing: {
    ...DEFAULT_EXAM_POLICY.bracketing,
    mode: 'ability',
    ability: DEFAULT_ABILITY_BRACKETING,
  },
};
