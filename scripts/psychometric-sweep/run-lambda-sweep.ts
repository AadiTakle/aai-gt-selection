import process from 'node:process';

import { probabilityCorrect, responseLogLikelihood } from '../../packages/cat-engine/src/irt';
import {
  createPersonaRun,
  dialToTheta,
  samplePersonaCohort,
  type Persona,
  type PersonaTrial,
} from '../../packages/cat-engine/src/persona-sim/index';
import {
  blockHalfContrast,
  estimateLearningCurve,
  trialsToCriterion,
  type LearningTrial,
} from '../../packages/cat-engine/src/psychometric-lab/index';
import { isRapidGuess } from '../../packages/cat-engine/src/rte';
import { learningRate as olsLearningRate } from '../../packages/cat-engine/src/scoring';
import { estimateThetaEap } from '../../packages/cat-engine/src/theta';
import {
  SCORED_DOMAINS,
  type IrtParameters,
  type ScoredDomain,
} from '../../packages/cat-engine/src/types';

import { bias, fmt, mean, pearson, round, sd, spearman } from '../persona-sim/stats';
import {
  CLAIM_HEADER,
  defaultOutDir,
  flagValue,
  mdTable,
  numberFlag,
  scaleCohortLambda,
  sweepDiscrimination,
  sweepItem,
  writeArtifact,
} from './common';

/**
 * EXPERIMENT 1 — learning-rate power curve.
 *
 * QUESTION: what novel-block design, if any, recovers the injected lambda? The
 * recorded baseline (`docs/PERSONA_SIM_RESULTS.md`) reported r = 0.109 for an OLS
 * score slope over a 6-trial ascending block and diagnosed a POWER null. A power
 * null has three possible cures and this sweep separates them: more trials
 * (block length), a schedule that does not spend the signal on a difficulty ramp
 * (difficulty regime), or a bigger effect (lambda scale). A fourth possibility —
 * that the OLS slope is simply a bad estimator — is tested by running four
 * alternatives over the identical response sequences.
 *
 * The deliverable is one decision: the minimum block length, at which regime, that
 * reaches r >= 0.5 — or a clean statement that no cell in the sweep does, with the
 * best cell reported. The sweep grid is FIXED in this file; it is not widened
 * until something correlates.
 *
 * CLAIM BOUNDARY: circular by construction. See `CLAIM_HEADER`. A cell that
 * reaches r >= 0.5 shows only that a design has the statistical power to recover a
 * climb the simulator injected; it says nothing about whether a within-session
 * climb reflects real learning. M-LEARNRATE stays a labelled hypothesis (H-series).
 */

/** Block lengths under test, in trials per domain. */
const BLOCK_LENGTHS = [6, 10, 15, 20, 30, 40] as const;

/** Multipliers on the injected lambda scale (baseline is 0.03 +/- 0.03 theta/trial). */
const LAMBDA_SCALES = [1, 2, 4] as const;

type Regime = 'ascending' | 'constant-at-theta' | 'adaptive';
const REGIMES: readonly Regime[] = ['ascending', 'constant-at-theta', 'adaptive'];

const REGIME_LABEL: Record<Regime, string> = {
  ascending: 'ascending (as today)',
  'constant-at-theta': 'constant at the estimated theta',
  adaptive: 'adaptive (re-target each trial)',
};

/** The recorded baseline's rapid-guess RT floor, kept so the gate behaves as today. */
const RAPID_GUESS_MS = 1500;

/** Standing rungs, matching `scripts/persona-sim/bank.ts`. */
const STANDING_RUNGS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

/**
 * The ascending regime spans the same difficulty range the recorded run used
 * (effort rungs 4..14), stretched over whatever block length is under test. At
 * length 6 it reproduces that ladder exactly, so the length-6 ascending cell is
 * directly comparable to the baseline's r = 0.109.
 */
const ASCENDING_MIN_B = dialToTheta(4);
const ASCENDING_MAX_B = dialToTheta(14);

interface StandingEstimate {
  theta: number;
  se: number;
}

interface CellRow {
  lambdaTrue: number;
  olsRaw: number;
  olsResidual: number;
  mapLambda: number;
  trialsToCriterion: number;
  halfContrast: number;
  /**
   * MAP lambda from ONE domain's block only. Every other estimator here averages
   * four independent blocks, which costs four times the items and cuts estimator
   * noise roughly in half — so the four-domain r is not the r a single-domain
   * novel block would deliver, and quoting it as one would understate the form
   * length by a factor of four.
   */
  mapLambdaSingleDomain: number;
  meanCorrect: number;
}

interface EstimatorSummary {
  key: string;
  label: string;
  pearson: number;
  spearman: number;
}

interface CellSummary {
  regime: Regime;
  blockLength: number;
  lambdaScale: number;
  n: number;
  estimators: EstimatorSummary[];
  /** MAP lambda bias in theta units per trial (the only scale-comparable estimator). */
  mapBias: number;
  mapSd: number;
  /** SD of the per-persona raw OLS slope: the noise floor r is fighting. */
  slopeSd: number;
  /** SD of the injected lambda in this cell: the signal available. */
  lambdaSd: number;
  /** OLS slope change per unit of injected lambda; signal SD is |beta| * lambdaSd. */
  slopeOnLambdaBeta: number;
  meanCorrect: number;
}

function irtAt(b: number, key: string, guessing: number): IrtParameters {
  return { a: sweepDiscrimination(key), b, c: guessing, model: '3PL' };
}

/**
 * One standing phase per persona, shared by every cell so a persona's working
 * ability estimate is a constant of the design rather than a per-cell nuisance.
 * Uses the same 15 rungs, the same guessing floor and the same RT gate as the
 * recorded baseline.
 */
function runStandingPhase(
  persona: Persona,
  seed: string,
  guessing: number,
): Record<ScoredDomain, StandingEstimate> {
  const irtByItemId = new Map<string, IrtParameters>();
  const run = createPersonaRun(persona, `${seed}|standing`, {
    itemIrt: (item) => irtByItemId.get(item.itemId),
  });

  for (const domain of SCORED_DOMAINS) {
    for (const rung of STANDING_RUNGS) {
      const itemId = `SWEEP-STANDING-${domain}-${rung}`;
      const irt = irtAt(dialToTheta(rung), itemId, guessing);
      irtByItemId.set(itemId, irt);
      const item = sweepItem(itemId, domain, 'standing', irt, rung);
      run.respond(item.served, item.bankItem);
    }
  }

  const out = {} as Record<ScoredDomain, StandingEstimate>;
  for (const domain of SCORED_DOMAINS) {
    const gated = run.trials.filter(
      (t) => t.domain === domain && !isRapidGuess(t.rtMs, RAPID_GUESS_MS),
    );
    const estimate = estimateThetaEap(gated.map((t) => ({ irt: t.irt, correct: t.correct })));
    out[domain] = { theta: estimate.theta, se: estimate.se };
  }
  return out;
}

/** Incremental posterior over a fixed grid, for the adaptive regime's re-targeting. */
class RunningAbility {
  private readonly nodes: number[];
  private readonly logWeights: number[];

  constructor(priorMean: number, priorSd: number, gridPoints = 41, min = -4, max = 4) {
    const step = (max - min) / (gridPoints - 1);
    this.nodes = Array.from({ length: gridPoints }, (_, i) => min + i * step);
    this.logWeights = this.nodes.map((node) => {
      const z = (node - priorMean) / priorSd;
      return -0.5 * z * z;
    });
  }

  update(irt: IrtParameters, correct: boolean): void {
    for (let i = 0; i < this.nodes.length; i++) {
      this.logWeights[i] =
        this.logWeights[i]! + responseLogLikelihood(this.nodes[i]!, irt, correct);
    }
  }

  mean(): number {
    let maxLog = Number.NEGATIVE_INFINITY;
    for (const logW of this.logWeights) if (logW > maxLog) maxLog = logW;
    let wSum = 0;
    let wThetaSum = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const w = Math.exp(this.logWeights[i]! - maxLog);
      wSum += w;
      wThetaSum += w * this.nodes[i]!;
    }
    return wSum > 0 ? wThetaSum / wSum : 0;
  }
}

/**
 * Administer one domain's novel block and return its trials in order.
 *
 * The adaptive regime re-targets `b` at the posterior mean of the block responses
 * so far. That estimate LAGS a genuine climb, because it pools every trial under a
 * constant-ability model — which is exactly what a real adaptive engine that does
 * not already believe in the climb would do. Assuming a climbing target here would
 * hand the design the answer it is being asked to detect.
 */
function runBlock(
  respond: ReturnType<typeof createPersonaRun>['respond'],
  trialLog: readonly PersonaTrial[],
  irtByItemId: Map<string, IrtParameters>,
  domain: ScoredDomain,
  regime: Regime,
  blockLength: number,
  standing: StandingEstimate,
  guessing: number,
): void {
  const running =
    regime === 'adaptive' ? new RunningAbility(standing.theta, Math.max(0.4, standing.se)) : null;

  for (let t = 0; t < blockLength; t++) {
    let b: number;
    if (regime === 'ascending') {
      b =
        blockLength === 1
          ? ASCENDING_MIN_B
          : ASCENDING_MIN_B + ((ASCENDING_MAX_B - ASCENDING_MIN_B) * t) / (blockLength - 1);
    } else if (regime === 'constant-at-theta') {
      b = standing.theta;
    } else {
      b = running!.mean();
    }

    const itemId = `SWEEP-BLOCK-${domain}-${t}`;
    const irt = irtAt(b, `${domain}|block|${t}`, guessing);
    irtByItemId.set(itemId, irt);
    const item = sweepItem(itemId, domain, 'effort', irt, 10.5 + 3 * b);
    respond(item.served, item.bankItem);

    if (running) {
      const last = trialLog[trialLog.length - 1]!;
      running.update(irt, last.correct);
    }
  }
}

function cellRowFor(
  persona: Persona,
  seed: string,
  regime: Regime,
  blockLength: number,
  lambdaScale: number,
  standingByDomain: Record<ScoredDomain, StandingEstimate>,
  guessing: number,
): CellRow {
  const irtByItemId = new Map<string, IrtParameters>();
  const run = createPersonaRun(persona, `${seed}|block|${regime}|${lambdaScale}|${blockLength}`, {
    itemIrt: (item) => irtByItemId.get(item.itemId),
  });

  for (const domain of SCORED_DOMAINS) {
    runBlock(
      run.respond,
      run.trials,
      irtByItemId,
      domain,
      regime,
      blockLength,
      standingByDomain[domain],
      guessing,
    );
  }

  const olsRaw: number[] = [];
  const olsResidual: number[] = [];
  const mapLambda: number[] = [];
  const ttc: number[] = [];
  const halves: number[] = [];
  let correctCount = 0;
  let trialCount = 0;

  for (const domain of SCORED_DOMAINS) {
    const block = run.trials.filter((t) => t.domain === domain);
    if (block.length < 3) continue;
    const standing = standingByDomain[domain];
    const order = block.map((_, i) => i + 1);
    const scores: number[] = block.map((t) => (t.correct ? 1 : 0));
    const residuals = block.map((t, i) => scores[i]! - probabilityCorrect(standing.theta, t.irt));
    correctCount += scores.reduce((a, b) => a + b, 0);
    trialCount += scores.length;

    const raw = olsLearningRate(order, scores);
    if (raw != null) olsRaw.push(raw);
    const residual = olsLearningRate(order, residuals);
    if (residual != null) olsResidual.push(residual);

    const learningTrials: LearningTrial[] = block.map((t, i) => ({
      irt: t.irt,
      correct: t.correct,
      trialIndex: i,
    }));
    mapLambda.push(
      estimateLearningCurve(learningTrials, {
        priorTheta0Mean: standing.theta,
        priorTheta0Sd: Math.max(0.3, standing.se),
      }).lambda,
    );

    // A censored block is scored at `length + 1`: "never reached criterion" is
    // information, and dropping those personas would select on the outcome.
    ttc.push(
      trialsToCriterion(
        block.map((t) => t.correct),
        3,
      ) ?? block.length + 1,
    );
    const half = blockHalfContrast(residuals);
    if (half != null) halves.push(half);
  }

  return {
    lambdaTrue: persona.learningRate,
    olsRaw: mean(olsRaw),
    olsResidual: mean(olsResidual),
    mapLambda: mean(mapLambda),
    trialsToCriterion: mean(ttc),
    halfContrast: mean(halves),
    mapLambdaSingleDomain: mapLambda[0] ?? Number.NaN,
    meanCorrect: trialCount === 0 ? Number.NaN : correctCount / trialCount,
  };
}

const ESTIMATORS: readonly { key: keyof CellRow; label: string }[] = [
  { key: 'olsRaw', label: 'raw OLS score slope (baseline estimator)' },
  { key: 'olsResidual', label: '3PL residual slope (difficulty removed)' },
  { key: 'mapLambda', label: 'joint MAP lambda (3PL learning curve)' },
  { key: 'trialsToCriterion', label: 'trials-to-criterion (3 in a row)' },
  { key: 'halfContrast', label: 'block-half residual contrast' },
  { key: 'mapLambdaSingleDomain', label: 'joint MAP lambda, ONE domain block only' },
];

function summarizeCell(
  regime: Regime,
  blockLength: number,
  lambdaScale: number,
  rows: readonly CellRow[],
): CellSummary {
  const truth = rows.map((r) => r.lambdaTrue);
  const estimators = ESTIMATORS.map(({ key, label }) => {
    const values = rows.map((r) => r[key] as number);
    return {
      key: String(key),
      label,
      pearson: pearson(truth, values),
      spearman: spearman(truth, values),
    };
  });
  const slopes = rows.map((r) => r.olsRaw);
  const lambdaVariance = sd(truth) ** 2;
  const covariance =
    truth.length < 2
      ? Number.NaN
      : truth.reduce((acc, t, i) => acc + (t - mean(truth)) * (slopes[i]! - mean(slopes)), 0) /
        (truth.length - 1);

  return {
    regime,
    blockLength,
    lambdaScale,
    n: rows.length,
    estimators,
    mapBias: bias(
      truth,
      rows.map((r) => r.mapLambda),
    ),
    mapSd: sd(rows.map((r) => r.mapLambda)),
    slopeSd: sd(slopes),
    lambdaSd: sd(truth),
    slopeOnLambdaBeta: lambdaVariance === 0 ? Number.NaN : covariance / lambdaVariance,
    meanCorrect: mean(rows.map((r) => r.meanCorrect)),
  };
}

function bestEstimator(cell: CellSummary): EstimatorSummary {
  // Ranked on |r|: trials-to-criterion is negatively related to lambda by
  // construction (a faster learner hits criterion sooner), so a signed comparison
  // would score a working estimator as the worst one in the table.
  return cell.estimators.reduce((best, e) =>
    Math.abs(e.pearson) > Math.abs(best.pearson) ? e : best,
  );
}

function main(): void {
  const argv = process.argv.slice(2);
  const n = numberFlag(argv, '--n', 1000);
  const seed = flagValue(argv, '--seed') ?? 'psychometric-sweep-2026-07-28';
  const guessing = numberFlag(argv, '--guessing', 0.25);
  const outDir = flagValue(argv, '--out') ?? defaultOutDir();
  const startedAt = new Date().toISOString();

  const baseCohort = samplePersonaCohort({ seed, n });
  const standingByPersona = baseCohort.map((persona) => runStandingPhase(persona, seed, guessing));

  const cells: CellSummary[] = [];
  for (const lambdaScale of LAMBDA_SCALES) {
    const cohort = scaleCohortLambda(baseCohort, lambdaScale);
    for (const regime of REGIMES) {
      for (const blockLength of BLOCK_LENGTHS) {
        const rows = cohort.map((persona, i) =>
          cellRowFor(
            persona,
            seed,
            regime,
            blockLength,
            lambdaScale,
            standingByPersona[i]!,
            guessing,
          ),
        );
        cells.push(summarizeCell(regime, blockLength, lambdaScale, rows));
      }
    }
  }

  const target = 0.5;

  /** Shortest block in a (regime, scale) column whose named estimator clears the target. */
  const minimumLength = (
    regime: Regime,
    lambdaScale: number,
    estimatorKey: string | null,
  ): CellSummary | null => {
    const column = cells
      .filter((c) => c.regime === regime && c.lambdaScale === lambdaScale)
      .sort((a, b) => a.blockLength - b.blockLength);
    for (const cell of column) {
      const r =
        estimatorKey == null
          ? Math.abs(bestEstimator(cell).pearson)
          : Math.abs(cell.estimators.find((e) => e.key === estimatorKey)!.pearson);
      if (r >= target) return cell;
    }
    return null;
  };

  const atCurrentScale = cells.filter((c) => c.lambdaScale === 1);
  const currentScaleWinners = atCurrentScale
    .filter((c) => Math.abs(bestEstimator(c).pearson) >= target)
    .sort((a, b) => a.blockLength - b.blockLength);
  const shortestCurrent = currentScaleWinners[0] ?? null;
  const bestAtShortest = shortestCurrent
    ? atCurrentScale
        .filter((c) => c.blockLength === shortestCurrent.blockLength)
        .reduce((acc, c) =>
          Math.abs(bestEstimator(c).pearson) > Math.abs(bestEstimator(acc).pearson) ? c : acc,
        )
    : null;

  const lines: string[] = [];
  lines.push('# Experiment 1 — Learning-rate power curve (SYNTHETIC)', '');
  lines.push(CLAIM_HEADER, '');
  lines.push(
    `Run: N=${n} personas per cell · seed \`${seed}\` · guessing c=${guessing} · ` +
      `${BLOCK_LENGTHS.length} block lengths x ${REGIMES.length} regimes x ${LAMBDA_SCALES.length} ` +
      `lambda scales = ${cells.length} cells · ${startedAt}`,
    '',
  );

  lines.push('## Headline', '');
  if (shortestCurrent == null) {
    lines.push(
      `**No cell at the CURRENT lambda scale (1x) reaches r >= ${target}.** ` +
        `Best 1x cell: ${describeBestAtScale(cells, 1)}.`,
      '',
    );
  } else {
    const winner = bestAtShortest!;
    const estimator = bestEstimator(winner);
    lines.push(
      `At the CURRENT injected lambda scale (1x, SD 0.03 theta/trial), the minimum block length ` +
        `reaching r >= ${target} is **${shortestCurrent.blockLength} trials per domain**. At that ` +
        `length the strongest regime is **${REGIME_LABEL[winner.regime]}** ` +
        `(r = ${fmt(estimator.pearson)}, ${estimator.label}); the regimes reaching the target at ` +
        `${shortestCurrent.blockLength} trials are ` +
        `${currentScaleWinners
          .filter((c) => c.blockLength === shortestCurrent.blockLength)
          .map((c) => `${REGIME_LABEL[c.regime]} (r = ${fmt(bestEstimator(c).pearson)})`)
          .join(', ')}. ` +
        `Best 1x cell overall: ${describeBestAtScale(cells, 1)}.`,
      '',
    );
  }

  lines.push(
    `Shortest block reaching r >= ${target}, by regime and lambda scale — **joint MAP lambda** ` +
      '(the best-powered estimator in this sweep):',
    '',
  );
  lines.push(
    mdTable(
      ['regime', ...LAMBDA_SCALES.map((s) => `${s}x lambda`)],
      REGIMES.map((regime) => [
        REGIME_LABEL[regime],
        ...LAMBDA_SCALES.map((scale) => {
          const cell = minimumLength(regime, scale, 'mapLambda');
          return cell
            ? `${cell.blockLength} (r ${fmt(cell.estimators.find((e) => e.key === 'mapLambda')!.pearson, 2)})`
            : 'not reached (<=40)';
        }),
      ]),
    ),
    '',
  );
  lines.push(
    'The same tables read per DOMAIN rather than averaged over four. Every other number in this ' +
      'report averages four independent blocks, so it costs four times the items; this is what one ' +
      'novel block alone delivers:',
    '',
  );
  lines.push(
    mdTable(
      ['regime', ...LAMBDA_SCALES.map((s) => `${s}x lambda`)],
      REGIMES.map((regime) => [
        REGIME_LABEL[regime],
        ...LAMBDA_SCALES.map((scale) => {
          const cell = minimumLength(regime, scale, 'mapLambdaSingleDomain');
          return cell
            ? `${cell.blockLength} (r ${fmt(
                cell.estimators.find((e) => e.key === 'mapLambdaSingleDomain')!.pearson,
                2,
              )})`
            : 'not reached (<=40)';
        }),
      ]),
    ),
    '',
  );
  lines.push(
    'Same question for the estimator the recorded baseline used — **raw OLS score slope**:',
    '',
  );
  lines.push(
    mdTable(
      ['regime', ...LAMBDA_SCALES.map((s) => `${s}x lambda`)],
      REGIMES.map((regime) => [
        REGIME_LABEL[regime],
        ...LAMBDA_SCALES.map((scale) => {
          const cell = minimumLength(regime, scale, 'olsRaw');
          return cell
            ? `${cell.blockLength} (r ${fmt(cell.estimators.find((e) => e.key === 'olsRaw')!.pearson, 2)})`
            : 'not reached (<=40)';
        }),
      ]),
    ),
    '',
  );

  for (const lambdaScale of LAMBDA_SCALES) {
    lines.push(`## Lambda scale ${lambdaScale}x (injected SD ${fmt(0.03 * lambdaScale, 4)})`, '');
    lines.push(
      mdTable(
        [
          'regime',
          'trials',
          'n',
          'r OLS',
          'rho OLS',
          'r resid slope',
          'r MAP lambda',
          'r trials-to-crit',
          'r half-contrast',
          'r MAP, 1 domain',
        ],
        cells
          .filter((c) => c.lambdaScale === lambdaScale)
          .map((c) => [
            REGIME_LABEL[c.regime],
            String(c.blockLength),
            String(c.n),
            fmt(c.estimators[0]!.pearson),
            fmt(c.estimators[0]!.spearman),
            fmt(c.estimators[1]!.pearson),
            fmt(c.estimators[2]!.pearson),
            fmt(c.estimators[3]!.pearson),
            fmt(c.estimators[4]!.pearson),
            fmt(c.estimators[5]!.pearson),
          ]),
      ),
      '',
    );
    lines.push('Noise floor and estimator bias for the same cells:', '');
    lines.push(
      mdTable(
        [
          'regime',
          'trials',
          'per-persona OLS slope SD',
          'slope per unit lambda',
          'implied signal SD',
          'injected lambda SD',
          'MAP lambda bias',
          'MAP lambda SD',
          'mean block accuracy',
        ],
        cells
          .filter((c) => c.lambdaScale === lambdaScale)
          .map((c) => [
            REGIME_LABEL[c.regime],
            String(c.blockLength),
            fmt(c.slopeSd, 4),
            fmt(c.slopeOnLambdaBeta, 3),
            fmt(Math.abs(c.slopeOnLambdaBeta) * c.lambdaSd, 4),
            fmt(c.lambdaSd, 4),
            fmt(c.mapBias, 4),
            fmt(c.mapSd, 4),
            fmt(c.meanCorrect, 3),
          ]),
      ),
      '',
    );
  }

  const { mdPath, jsonPath } = writeArtifact({
    outDir,
    name: 'experiment-1-lambda-power',
    lines,
    seed,
    json: {
      experiment: 'learning-rate power curve',
      startedAt,
      n,
      guessing,
      blockLengths: BLOCK_LENGTHS,
      regimes: REGIMES,
      lambdaScales: LAMBDA_SCALES,
      targetPearson: target,
      reachedTargetAtCurrentScale: shortestCurrent != null,
      minimumBlockLengthAtCurrentScale: shortestCurrent?.blockLength ?? null,
      cells: cells.map((c) => ({
        ...c,
        estimators: c.estimators.map((e) => ({
          ...e,
          pearson: round(e.pearson, 4),
          spearman: round(e.spearman, 4),
        })),
      })),
    },
  });

  console.log(lines.join('\n'));
  console.log('');
  console.log(`report (md):   ${mdPath}`);
  console.log(`report (json): ${jsonPath}`);
}

function describeBestAtScale(cells: readonly CellSummary[], scale: number): string {
  const atScale = cells.filter((c) => c.lambdaScale === scale);
  const best = atScale.reduce((acc, cell) =>
    Math.abs(bestEstimator(cell).pearson) > Math.abs(bestEstimator(acc).pearson) ? cell : acc,
  );
  const estimator = bestEstimator(best);
  return (
    `${REGIME_LABEL[best.regime]} at ${best.blockLength} trials, ` +
    `r = ${fmt(estimator.pearson)} (${estimator.label})`
  );
}

main();
