import {
  EXAM_DOMAINS,
  clampDifficulty,
  type ExamDomain,
  type GradeBand,
  type ItemResult,
  type PerAreaScore,
  type ServedItem,
  type SessionScore,
} from './contract';

/**
 * Deterministic scorer (BUILD_PLAN §5).
 *
 * The real scorer ships in `packages/exam-scoring`. Until it resolves, this is a
 * LOCAL STUB with the same contract: accuracy sets the bracket, other metrics
 * position the score within the bracket, output = per-area proficiency (θ on the
 * 1..20 scale) + composite + profile. NO admit/defer/retry decision. Fully
 * reproducible from the stored trace. Swap at integration:
 *
 *   import { scoreSession, DEFAULT_EXAM_POLICY } from '@gt-selection/exam-scoring';
 */

export interface ExamPolicy {
  id: string;
  /** Accuracy cutoffs that split into ordinal brackets (ascending). */
  bracketCutoffs: number[];
  /** Labels; length must be bracketCutoffs.length + 1. */
  bracketLabels: string[];
  /** Weights for positioning within a bracket (need not sum to 1). */
  weights: { diffReach: number; consistency: number; learnRate: number; errType: number };
  /** Proficiency scale ceiling (1..scaleMax). */
  scaleMax: number;
}

/** Defaults now; wired to an admin portal later (BUILD_PLAN §5). */
export const DEFAULT_EXAM_POLICY: ExamPolicy = {
  id: 'default-v0-synthetic',
  bracketCutoffs: [0.4, 0.6, 0.8],
  bracketLabels: ['Emerging', 'Developing', 'Proficient', 'Advanced'],
  weights: { diffReach: 0.45, consistency: 0.15, learnRate: 0.2, errType: 0.2 },
  scaleMax: 20,
};

export interface ScoreSessionInput {
  gradeBand: GradeBand;
  results: ItemResult[];
  servedItems: ServedItem[];
}

function isNum(n: number | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Demo difficulty is reported on a 1..6 rung; scale to the shared 1..20. */
function scaleReach(raw: number, scaleMax: number): number {
  return raw <= 6 ? raw * (scaleMax / 6) : raw;
}

function bracketOf(accuracy: number | null, cutoffs: number[]): number {
  if (accuracy == null) return 0;
  let b = 0;
  for (const cut of cutoffs) if (accuracy >= cut) b += 1;
  return b;
}

function labelAt(labels: string[], index: number): string {
  const clamped = Math.min(labels.length - 1, Math.max(0, index));
  return labels[clamped] ?? 'Unscored';
}

/**
 * Score a completed session from its trace. Server-authoritative and
 * deterministic: the same trace always yields the same score/profile.
 */
export function scoreSession(
  input: ScoreSessionInput,
  policy: ExamPolicy = DEFAULT_EXAM_POLICY,
): SessionScore {
  const { gradeBand, results, servedItems } = input;
  const width = policy.scaleMax / policy.bracketLabels.length;
  const weightSum =
    policy.weights.diffReach +
    policy.weights.consistency +
    policy.weights.learnRate +
    policy.weights.errType || 1;

  const perAreaLearn: number[] = [];
  const perAreaConsist: number[] = [];

  const perArea: PerAreaScore[] = EXAM_DOMAINS.map((area: ExamDomain) => {
    const areaResults = results.filter((r) => r.domain === area);
    const answered = areaResults.filter((r) => !r.skipped);

    // 1. Accuracy → bracket.
    const accuracy = mean(answered.map((r) => r.metrics['M-ACC']).filter(isNum));
    const bracket = bracketOf(accuracy, policy.bracketCutoffs);

    // 2. Positioning metrics.
    const reaches = answered
      .map((r) => r.metrics['M-DIFFREACH'])
      .filter(isNum)
      .map((raw) => scaleReach(raw, policy.scaleMax));
    const servedDiffs = servedItems.filter((s) => s.domain === area).map((s) => s.difficulty);
    const diffReach = Math.max(0, ...reaches, ...servedDiffs);
    const normDiff = Math.min(1, Math.max(0, (diffReach - 1) / (policy.scaleMax - 1)));

    const learnRate = mean(answered.map((r) => r.metrics['M-LEARNRATE']).filter(isNum)) ?? 0;
    const learnNorm = Math.min(1, Math.max(0, learnRate));

    // Consistency proxy: extreme accuracy = steadier placement (stand-in for
    // M-RTVAR inverse / M-CONSIST until per-question RT variance is emitted).
    const consistency = accuracy == null ? 0.5 : Math.min(1, 0.5 + Math.abs(accuracy - 0.5));

    // Error-type quality: none > near-miss > random (M-ERRTYPE 0/1/2).
    const errSignal =
      mean(
        answered
          .map((r) => r.metrics['M-ERRTYPE'])
          .filter(isNum)
          .map((code) => (code === 0 ? 1 : code === 1 ? 0.6 : 0.2)),
      ) ?? 0.6;

    perAreaLearn.push(learnNorm);
    perAreaConsist.push(consistency);

    // 3. Position within the bracket → proficiency θ (1..20).
    const position =
      (policy.weights.diffReach * normDiff +
        policy.weights.consistency * consistency +
        policy.weights.learnRate * learnNorm +
        policy.weights.errType * errSignal) /
      weightSum;
    const low = Math.max(1, bracket * width);
    const high = (bracket + 1) * width;
    const proficiency = clampDifficulty(low + position * (high - low));

    return {
      area,
      accuracy,
      proficiency,
      bracket,
      bracketLabel: labelAt(policy.bracketLabels, bracket),
      diffReach,
      itemsSeen: areaResults.length,
    };
  });

  const composite = clampDifficulty(
    perArea.reduce((sum, a) => sum + a.proficiency, 0) / (perArea.length || 1),
  );
  const compositeBracketLabel = labelAt(
    policy.bracketLabels,
    Math.floor((composite - 1) / width),
  );

  // Strengths = the top cluster (within 1.5 θ of the best area).
  const best = perArea.reduce((m, a) => Math.max(m, a.proficiency), 0);
  const strengths = perArea
    .filter((a) => a.proficiency >= best - 1.5 && a.itemsSeen > 0)
    .sort((a, b) => b.proficiency - a.proficiency)
    .map((a) => a.area);

  const learningRate = mean(perAreaLearn) ?? 0;
  const consistency = mean(perAreaConsist) ?? 0.5;

  return {
    gradeBand,
    perArea,
    composite,
    compositeBracketLabel,
    profile: {
      strengths,
      learningRate,
      consistency,
      note: 'Synthetic screening profile (validated=false): accuracy sets the bracket; difficulty reach, consistency, learning rate, and error type position the score within it.',
    },
    policyId: policy.id,
    syntheticOnly: true,
    validated: false,
  };
}
