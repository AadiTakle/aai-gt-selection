import { hashSeed, mulberry32 } from '../rng';
import { SCORED_DOMAINS, type ScoredDomain } from '../types';

/**
 * Persona latent-trait generator for the synthetic persona simulator
 * (`PERSONA_SIM_AND_VALIDATION_DESIGN.md` §1).
 *
 * WHY THIS EXISTS: to build and stress the scoring path we need test-takers whose
 * ground truth is KNOWN. A persona is a correlated latent-trait vector; the
 * measurement models in `./measurement.ts` turn those latents into responses, and
 * the recovery loop then asks whether the production estimator gets the injected
 * truth back. Nothing here is a claim about real children: recovering a latent we
 * injected ourselves is CIRCULAR by construction, so this proves code correctness,
 * estimator bias/precision, and item-count/power requirements — never that the
 * metrics measure real ability and never program impact (R10).
 *
 * Traits are drawn as a multivariate normal (Cholesky factor of a plausible
 * correlation matrix) so they are NOT independent: ability, speed, working memory
 * and engagement co-vary the way a positive manifold does, while learning rate is
 * left only weakly related to standing — that partial separation is the thing the
 * two-regime hypothesis (H-series / Stage 2) needs the simulator to be able to
 * exhibit, so it must not be assumed away by making the traits collinear.
 *
 * Every correlation and scale constant below is an OPEN ASSUMPTION [A]: they are
 * plausible design values, not calibrated from any dataset. A reviewer must treat
 * cohort-level numbers as properties of these assumptions.
 *
 * Pure + seeded: all randomness flows through `../rng` so a cohort is bit-for-bit
 * reproducible (R7, D-019). No I/O, no framework, no node-only APIs.
 */

/** The latent dimensions, in the fixed order used by the correlation matrix. */
export const PERSONA_TRAIT_KEYS = [
  'thetaFluidReasoning',
  'thetaVerbal',
  'thetaQuantitative',
  'thetaSpatial',
  'learningRate',
  'speed',
  'consistency',
  'engagement',
  'planfulness',
  'creativity',
  'workingMemory',
] as const;

export type PersonaTraitKey = (typeof PERSONA_TRAIT_KEYS)[number];

/** The raw standardized draw, kept on every persona so a run can be audited. */
export type PersonaLatentVector = Record<PersonaTraitKey, number>;

/** Trait index for the four ability dimensions, in `SCORED_DOMAINS` order. */
const DOMAIN_TRAIT_KEYS: Record<ScoredDomain, PersonaTraitKey> = {
  fluid_reasoning: 'thetaFluidReasoning',
  verbal: 'thetaVerbal',
  quantitative: 'thetaQuantitative',
  spatial: 'thetaSpatial',
};

/**
 * Off-diagonal correlations [A]. Listed once per pair; the builder mirrors them.
 * Ability dimensions share a positive manifold; `learningRate` is deliberately
 * only weakly tied to ability so standing and learning rate remain separable.
 */
const TRAIT_CORRELATIONS: readonly [PersonaTraitKey, PersonaTraitKey, number][] = [
  // ability positive manifold
  ['thetaFluidReasoning', 'thetaVerbal', 0.55],
  ['thetaFluidReasoning', 'thetaQuantitative', 0.6],
  ['thetaFluidReasoning', 'thetaSpatial', 0.58],
  ['thetaVerbal', 'thetaQuantitative', 0.5],
  ['thetaVerbal', 'thetaSpatial', 0.4],
  ['thetaQuantitative', 'thetaSpatial', 0.52],
  // learning rate: related to, but far from redundant with, standing
  ['learningRate', 'thetaFluidReasoning', 0.3],
  ['learningRate', 'thetaVerbal', 0.2],
  ['learningRate', 'thetaQuantitative', 0.25],
  ['learningRate', 'thetaSpatial', 0.22],
  // processing speed
  ['speed', 'thetaFluidReasoning', 0.3],
  ['speed', 'thetaVerbal', 0.22],
  ['speed', 'thetaQuantitative', 0.28],
  ['speed', 'thetaSpatial', 0.26],
  ['speed', 'learningRate', 0.2],
  // RT consistency
  ['consistency', 'thetaFluidReasoning', 0.18],
  ['consistency', 'thetaVerbal', 0.15],
  ['consistency', 'thetaQuantitative', 0.16],
  ['consistency', 'thetaSpatial', 0.15],
  ['consistency', 'speed', 0.25],
  ['consistency', 'learningRate', 0.1],
  // engagement / effort
  ['engagement', 'thetaFluidReasoning', 0.12],
  ['engagement', 'thetaVerbal', 0.12],
  ['engagement', 'thetaQuantitative', 0.12],
  ['engagement', 'thetaSpatial', 0.12],
  ['engagement', 'learningRate', 0.2],
  ['engagement', 'consistency', 0.35],
  // planfulness (slower first move, better process)
  ['planfulness', 'thetaFluidReasoning', 0.25],
  ['planfulness', 'thetaVerbal', 0.2],
  ['planfulness', 'thetaQuantitative', 0.25],
  ['planfulness', 'thetaSpatial', 0.22],
  ['planfulness', 'speed', -0.15],
  ['planfulness', 'learningRate', 0.2],
  ['planfulness', 'engagement', 0.3],
  // creativity: mostly its own axis
  ['creativity', 'thetaFluidReasoning', 0.32],
  ['creativity', 'thetaVerbal', 0.25],
  ['creativity', 'thetaQuantitative', 0.12],
  ['creativity', 'thetaSpatial', 0.18],
  ['creativity', 'learningRate', 0.28],
  ['creativity', 'planfulness', 0.05],
  // working memory
  ['workingMemory', 'thetaFluidReasoning', 0.55],
  ['workingMemory', 'thetaVerbal', 0.38],
  ['workingMemory', 'thetaQuantitative', 0.45],
  ['workingMemory', 'thetaSpatial', 0.42],
  ['workingMemory', 'learningRate', 0.3],
  ['workingMemory', 'speed', 0.3],
  ['workingMemory', 'consistency', 0.2],
  ['workingMemory', 'engagement', 0.1],
  ['workingMemory', 'planfulness', 0.3],
  ['workingMemory', 'creativity', 0.18],
];

/** Build the full symmetric correlation matrix in `PERSONA_TRAIT_KEYS` order. */
export function personaCorrelationMatrix(): number[][] {
  const n = PERSONA_TRAIT_KEYS.length;
  const index = new Map<PersonaTraitKey, number>(PERSONA_TRAIT_KEYS.map((k, i) => [k, i]));
  const m: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  for (const [a, b, r] of TRAIT_CORRELATIONS) {
    const i = index.get(a)!;
    const j = index.get(b)!;
    m[i]![j] = r;
    m[j]![i] = r;
  }
  return m;
}

/**
 * Cholesky factorization `A = L Lᵗ` for a symmetric positive-definite `A`.
 * Returns the LOWER triangular factor. Throws when `A` is not positive definite,
 * which is the only honest response: a non-PD "correlation" matrix has no
 * multivariate-normal interpretation, so silently ridging it would fabricate a
 * covariance structure the caller never specified.
 */
export function choleskyDecompose(matrix: readonly (readonly number[])[]): number[][] {
  const n = matrix.length;
  for (const row of matrix) {
    if (row.length !== n) throw new Error('choleskyDecompose: matrix must be square');
  }
  const l: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = matrix[i]![j]!;
      for (let k = 0; k < j; k++) sum -= l[i]![k]! * l[j]![k]!;
      if (i === j) {
        if (sum <= 0) {
          throw new Error(
            `choleskyDecompose: matrix is not positive definite (pivot ${sum} at index ${i})`,
          );
        }
        l[i]![j] = Math.sqrt(sum);
      } else {
        l[i]![j] = sum / l[j]![j]!;
      }
    }
  }
  return l;
}

/**
 * Standard-normal draws from a uniform stream (Box-Muller, polar rejection form).
 * Rejection keeps the mapping stable without needing trig identities; the caller
 * supplies the seeded uniform so the whole draw stays reproducible.
 */
export function standardNormals(rand: () => number, count: number): number[] {
  const out: number[] = [];
  while (out.length < count) {
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = 2 * rand() - 1;
      v = 2 * rand() - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const factor = Math.sqrt((-2 * Math.log(s)) / s);
    out.push(u * factor);
    if (out.length < count) out.push(v * factor);
  }
  return out;
}

/** Multiply a lower-triangular Cholesky factor by an i.i.d. standard-normal vector. */
export function correlatedNormals(
  cholesky: readonly (readonly number[])[],
  independent: readonly number[],
): number[] {
  const n = cholesky.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k <= i; k++) sum += cholesky[i]![k]! * independent[k]!;
    out.push(sum);
  }
  return out;
}

// --- the 1-20 dial <-> theta mapping (design doc §1) --------------------------

/**
 * Map the product's 1-20 difficulty/ability dial onto the N(0,1) theta scale:
 * `theta = (dial - 10.5) / 3`, so dial 15 is roughly +1.5 SD (~93rd percentile).
 * The ordinal dial is a DESIGN rung, not calibrated IRT difficulty; this mapping
 * is the simulator's assumption that lets ordinal rungs drive a 3PL response.
 */
export function dialToTheta(dial: number): number {
  return (dial - 10.5) / 3;
}

/** Inverse of {@link dialToTheta}: theta back onto the 1-20 dial. */
export function thetaToDial(theta: number): number {
  return theta * 3 + 10.5;
}

// --- archetypes --------------------------------------------------------------

/**
 * The archetypes the design doc calls for. `population` is the unconstrained
 * draw; the rest CONSTRAIN selected traits so a cohort deliberately contains the
 * cases that stress the scoring path (a plateauing high scorer, the moderate /
 * fast-learning "fit" target, and an able but disengaged child that must trip the
 * engagement gate rather than score low on ability).
 */
export const PERSONA_ARCHETYPES = [
  'population',
  'high_standing_low_learning',
  'moderate_standing_high_learning',
  'high_ability_low_effort',
  'high_both',
  'low_both',
] as const;

export type PersonaArchetype = (typeof PERSONA_ARCHETYPES)[number];

/** An affine constraint on a latent trait: `z' = mean + sd * z`. */
interface TraitConstraint {
  mean: number;
  sd: number;
}

interface ArchetypeSpec {
  /** Applied to all four ability traits. */
  standing?: TraitConstraint;
  traits?: Partial<Record<PersonaTraitKey, TraitConstraint>>;
  description: string;
}

const ARCHETYPE_SPECS: Record<PersonaArchetype, ArchetypeSpec> = {
  population: {
    description: 'Unconstrained draw from the correlated latent distribution.',
  },
  high_standing_low_learning: {
    standing: { mean: 1.3, sd: 0.55 },
    traits: { learningRate: { mean: -1.0, sd: 0.6 } },
    description: 'High current standing, low within-session learning rate (gifted-but-plateaus).',
  },
  moderate_standing_high_learning: {
    standing: { mean: 0.15, sd: 0.5 },
    traits: { learningRate: { mean: 1.25, sd: 0.55 } },
    description: 'Moderate standing, high learning rate (the acceleration-fit target).',
  },
  high_ability_low_effort: {
    standing: { mean: 1.2, sd: 0.55 },
    traits: { engagement: { mean: -1.8, sd: 0.5 } },
    description: 'High ability, low effort — the engagement-gate stress test.',
  },
  high_both: {
    standing: { mean: 1.2, sd: 0.5 },
    traits: { learningRate: { mean: 1.2, sd: 0.5 } },
    description: 'High standing and high learning rate.',
  },
  low_both: {
    standing: { mean: -1.05, sd: 0.55 },
    traits: { learningRate: { mean: -1.05, sd: 0.55 } },
    description: 'Low standing and low learning rate.',
  },
};

/** Human-readable description of an archetype (for report headers). */
export function archetypeDescription(archetype: PersonaArchetype): string {
  return ARCHETYPE_SPECS[archetype].description;
}

// --- latent -> interpretable trait scales ------------------------------------

/**
 * Scale constants mapping standardized latents to the units the measurement
 * models consume [A]. Bounded traits go through a logistic so a cohort keeps a
 * smooth distribution instead of piling up on a clamp.
 */
const SCALES = {
  /** theta units gained per trial inside a novel block (M-LEARNRATE). */
  learningRateMean: 0.03,
  learningRateSd: 0.03,
  /** logit intercept/slope for the on-task probability (engagement gate). */
  engagementIntercept: 2.8,
  engagementSlope: 0.9,
  /** logit intercept/slope for RT consistency in (0,1). */
  consistencyIntercept: 0.8,
  consistencySlope: 0.8,
  /** logit intercept/slope for planfulness in (0,1). */
  planfulnessIntercept: 0.4,
  planfulnessSlope: 0.8,
  /** Share of OFF-TASK trials that surface as a rapid guess (rest = slow lapse). */
  rapidGuessIntercept: 1.1,
  rapidGuessSlope: -0.6,
  /** Working-memory span in items. */
  spanMean: 5.5,
  spanSd: 1.2,
  spanMin: 2,
  spanMax: 10,
} as const;

function logistic(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** A generated synthetic test-taker with fully known ground truth. */
export interface Persona {
  personaId: string;
  archetype: PersonaArchetype;
  /** True per-domain ability on the N(0,1) theta scale (the recovery target). */
  theta: Record<ScoredDomain, number>;
  /** Unweighted mean of the four domain thetas — the "standing" summary. */
  thetaMean: number;
  /** lambda: theta units gained per trial inside a novel block (M-LEARNRATE). */
  learningRate: number;
  /** tau: standardized processing speed; higher = faster baseline RT. */
  speed: number;
  /** RT consistency in (0,1); higher = steadier (drives the log-normal spread). */
  consistency: number;
  /** e: probability a trial is on-task before any within-session drift. */
  engagement: number;
  /** Share of off-task trials that surface as rapid guesses. */
  rapidGuessPropensity: number;
  /** p: planfulness in (0,1) (M-PLANFUL / M-EFF; out of this slice's scope). */
  planfulness: number;
  /** kappa: standardized creativity (M-IDEAFLU family; out of this slice's scope). */
  creativity: number;
  /** w: working-memory span in items (M-SPAN family; out of this slice's scope). */
  workingMemorySpan: number;
  /** The raw correlated standardized draw, retained for audit / replay. */
  latent: PersonaLatentVector;
  syntheticOnly: true;
  validated: false;
}

export interface SamplePersonaOptions {
  /** Seed string; the same seed + index always yields the same persona. */
  seed: string;
  /** Index within the cohort (part of the per-persona substream key). */
  index: number;
  archetype?: PersonaArchetype;
  /** Pre-computed Cholesky factor, to avoid refactorizing per persona. */
  cholesky?: readonly (readonly number[])[];
}

/** Draw one persona. Deterministic in `(seed, index, archetype)`. */
export function samplePersona(options: SamplePersonaOptions): Persona {
  const { seed, index, archetype = 'population' } = options;
  const cholesky = options.cholesky ?? choleskyDecompose(personaCorrelationMatrix());
  const rand = mulberry32(hashSeed(`${seed}|persona|${archetype}|${index}`));
  const z = correlatedNormals(cholesky, standardNormals(rand, PERSONA_TRAIT_KEYS.length));

  const latent = {} as PersonaLatentVector;
  PERSONA_TRAIT_KEYS.forEach((key, i) => {
    latent[key] = z[i]!;
  });

  const spec = ARCHETYPE_SPECS[archetype];
  if (spec.standing) {
    for (const key of Object.values(DOMAIN_TRAIT_KEYS)) {
      latent[key] = spec.standing.mean + spec.standing.sd * latent[key];
    }
  }
  for (const [key, constraint] of Object.entries(spec.traits ?? {})) {
    const traitKey = key as PersonaTraitKey;
    latent[traitKey] = constraint.mean + constraint.sd * latent[traitKey];
  }

  const theta = {} as Record<ScoredDomain, number>;
  for (const domain of SCORED_DOMAINS) theta[domain] = latent[DOMAIN_TRAIT_KEYS[domain]];
  const thetaMean = SCORED_DOMAINS.reduce((s, d) => s + theta[d], 0) / SCORED_DOMAINS.length;

  return {
    personaId: `PERSONA-SYN-${archetype}-${String(index).padStart(6, '0')}`,
    archetype,
    theta,
    thetaMean,
    learningRate: SCALES.learningRateMean + SCALES.learningRateSd * latent.learningRate,
    speed: latent.speed,
    consistency: logistic(
      SCALES.consistencyIntercept + SCALES.consistencySlope * latent.consistency,
    ),
    engagement: logistic(SCALES.engagementIntercept + SCALES.engagementSlope * latent.engagement),
    rapidGuessPropensity: logistic(
      SCALES.rapidGuessIntercept + SCALES.rapidGuessSlope * latent.engagement,
    ),
    planfulness: logistic(
      SCALES.planfulnessIntercept + SCALES.planfulnessSlope * latent.planfulness,
    ),
    creativity: latent.creativity,
    workingMemorySpan: clamp(
      SCALES.spanMean + SCALES.spanSd * latent.workingMemory,
      SCALES.spanMin,
      SCALES.spanMax,
    ),
    latent,
    syntheticOnly: true,
    validated: false,
  };
}

export interface SampleCohortOptions {
  seed: string;
  n: number;
  /**
   * Relative shares per archetype; REPLACES the default mix rather than merging
   * into it, so an omitted archetype is genuinely absent. The default is a
   * mostly-population cohort with every stress-test archetype guaranteed present,
   * because a pure population draw almost never contains the extreme cases the
   * engagement gate has to survive.
   */
  mix?: Partial<Record<PersonaArchetype, number>>;
}

const DEFAULT_MIX: Record<PersonaArchetype, number> = {
  population: 0.5,
  high_standing_low_learning: 0.1,
  moderate_standing_high_learning: 0.1,
  high_ability_low_effort: 0.1,
  high_both: 0.1,
  low_both: 0.1,
};

/**
 * Draw a cohort of `n` personas. Archetype assignment is DETERMINISTIC (largest
 * remainder over the mix, then a fixed archetype order) rather than sampled, so a
 * cohort of a given size always contains exactly the same composition — the
 * per-archetype recovery numbers in a report are then comparable across runs.
 */
export function samplePersonaCohort(options: SampleCohortOptions): Persona[] {
  const { seed, n } = options;
  const mix: Partial<Record<PersonaArchetype, number>> = options.mix ?? DEFAULT_MIX;
  const total = PERSONA_ARCHETYPES.reduce((s, a) => s + Math.max(0, mix[a] ?? 0), 0);
  if (n <= 0) return [];
  if (total <= 0) throw new Error('samplePersonaCohort: archetype mix must have positive weight');

  const exact = PERSONA_ARCHETYPES.map((a) => ((mix[a] ?? 0) / total) * n);
  const counts = exact.map((x) => Math.floor(x));
  let remaining = n - counts.reduce((s, x) => s + x, 0);
  const byRemainder = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of byRemainder) {
    if (remaining <= 0) break;
    counts[i] = counts[i]! + 1;
    remaining -= 1;
  }

  const cholesky = choleskyDecompose(personaCorrelationMatrix());
  const cohort: Persona[] = [];
  PERSONA_ARCHETYPES.forEach((archetype, ai) => {
    for (let k = 0; k < counts[ai]!; k++) {
      cohort.push({ ...samplePersona({ seed, index: cohort.length, archetype, cholesky }) });
    }
  });
  return cohort;
}
