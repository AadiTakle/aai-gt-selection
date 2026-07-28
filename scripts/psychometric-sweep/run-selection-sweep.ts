import process from 'node:process';

import { responseLogLikelihood } from '../../packages/cat-engine/src/irt';
import {
  createPersonaRun,
  samplePersonaCohort,
  thetaToDial,
  type Persona,
} from '../../packages/cat-engine/src/persona-sim/index';
import {
  maxInformationIndex,
  posteriorWeightedInformationIndex,
} from '../../packages/cat-engine/src/psychometric-lab/index';
import { isRapidGuess } from '../../packages/cat-engine/src/rte';
import { estimateThetaEap } from '../../packages/cat-engine/src/theta';
import {
  SCORED_DOMAINS,
  type IrtParameters,
  type ScoredDomain,
  type ScoredResponse,
} from '../../packages/cat-engine/src/types';

import { fmt, mean, round } from '../persona-sim/stats';
import {
  CLAIM_HEADER,
  defaultOutDir,
  flagValue,
  mdTable,
  numberFlag,
  sweepDiscrimination,
  sweepItem,
  writeArtifact,
} from './common';

/**
 * EXPERIMENT 2 — adaptive selection and the guessing floor.
 *
 * QUESTION: the recorded baseline hit a per-domain precision wall — no per-domain
 * mean SE at or below 0.50 with 15 items (best ~0.65), and 32 pooled items for
 * SE 0.50. Two candidate causes were never separated: the items were presented in
 * a FIXED ladder that spends most of a short form far from the child's ability,
 * and the items are four-option selected-response with a `c = 0.25` guessing
 * floor. This sweep varies selection rule, pool density, guessing floor, and
 * discrimination independently so the wall can be attributed.
 *
 * WHY BOTH A MATCHED AND AN ENRICHED POOL: on the 15-rung production pool, any
 * selection rule administered 15 items has administered the same 15 items, so
 * adaptive selection can only matter at k < 15 — an artefact of pool size, not a
 * result about adaptive testing. The enriched pool (41 rungs on a 0.15 grid) is
 * what an actual CAT pool would look like and is the fair test of the rule.
 *
 * CLAIM BOUNDARY: circular, and additionally OPTIMISTIC — selection here uses the
 * TRUE item parameters. A real adaptive form selects on estimated parameters and
 * must also handle exposure control and content balance, both of which cost
 * precision. Treat every SE below as a floor, not a forecast.
 */

const RAPID_GUESS_MS = 1500;

/** Production standing rungs (`scripts/persona-sim/bank.ts`), on the theta scale. */
const MATCHED_RUNGS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(
  (rung) => (rung - 10.5) / 3,
);

/** A dense pool: 41 difficulties on a 0.15 grid spanning theta -3 .. +3. */
const ENRICHED_RUNGS = Array.from({ length: 41 }, (_, i) => -3 + i * 0.15);

type PoolId = 'matched' | 'enriched';
type ArmId = 'fixed' | 'bracket' | 'mfi' | 'posterior';

const POOLS: Record<PoolId, { label: string; difficulties: number[] }> = {
  matched: { label: 'matched (15 production rungs)', difficulties: MATCHED_RUNGS },
  enriched: { label: 'enriched (41 rungs, 0.15 grid)', difficulties: ENRICHED_RUNGS },
};

const ARM_LABEL: Record<ArmId, string> = {
  fixed: 'fixed ladder (current)',
  bracket: 'bracketing (two-stage style)',
  mfi: 'maximum Fisher information',
  posterior: 'posterior-weighted information',
};

interface ConfigSpec {
  id: string;
  pool: PoolId;
  arm: ArmId;
  guessing: number;
  /** Multiplier on the pool's `a ~ U(0.9, 1.6)` discrimination band. */
  discriminationMultiplier: number;
  kMax: number;
  part: 'selection' | 'guessing' | 'discrimination';
}

function buildConfigs(): ConfigSpec[] {
  const configs: ConfigSpec[] = [];
  const arms: ArmId[] = ['fixed', 'bracket', 'mfi', 'posterior'];
  for (const pool of ['matched', 'enriched'] as PoolId[]) {
    for (const arm of arms) {
      configs.push({
        id: `${pool}/${arm}/c0.25/a1.0`,
        pool,
        arm,
        guessing: 0.25,
        discriminationMultiplier: 1,
        kMax: pool === 'matched' ? 15 : 40,
        part: 'selection',
      });
    }
  }
  for (const guessing of [0.33, 0.2, 0]) {
    for (const arm of ['fixed', 'mfi'] as ArmId[]) {
      configs.push({
        id: `enriched/${arm}/c${guessing}/a1.0`,
        pool: 'enriched',
        arm,
        guessing,
        discriminationMultiplier: 1,
        kMax: 40,
        part: 'guessing',
      });
    }
  }
  for (const multiplier of [1.25, 1.5, 2]) {
    for (const arm of ['fixed', 'mfi'] as ArmId[]) {
      configs.push({
        id: `enriched/${arm}/c0.25/a${multiplier}`,
        pool: 'enriched',
        arm,
        guessing: 0.25,
        discriminationMultiplier: multiplier,
        kMax: 40,
        part: 'discrimination',
      });
    }
  }
  return configs;
}

/**
 * Incremental EAP over a fixed grid. Equivalent to `estimateThetaEap` but keeps a
 * running log-likelihood, so tracing an SE-vs-item-count curve costs one grid pass
 * per item instead of re-scoring the whole string at every k. The runner asserts
 * the agreement rather than assuming it.
 */
class GridPosterior {
  private readonly nodes: number[];
  private readonly logWeights: number[];

  constructor(gridPoints = 61, min = -4, max = 4, priorMean = 0, priorSd = 1) {
    const step = (max - min) / (gridPoints - 1);
    this.nodes = Array.from({ length: gridPoints }, (_, i) => min + i * step);
    this.logWeights = this.nodes.map((node) => {
      const z = (node - priorMean) / priorSd;
      return -0.5 * z * z;
    });
  }

  add(irt: IrtParameters, correct: boolean): void {
    for (let i = 0; i < this.nodes.length; i++) {
      this.logWeights[i] =
        this.logWeights[i]! + responseLogLikelihood(this.nodes[i]!, irt, correct);
    }
  }

  estimate(): { theta: number; se: number } {
    let maxLog = Number.NEGATIVE_INFINITY;
    for (const logW of this.logWeights) if (logW > maxLog) maxLog = logW;
    let wSum = 0;
    let wThetaSum = 0;
    const weights = this.logWeights.map((logW) => Math.exp(logW - maxLog));
    for (let i = 0; i < weights.length; i++) {
      wSum += weights[i]!;
      wThetaSum += weights[i]! * this.nodes[i]!;
    }
    if (wSum === 0) return { theta: 0, se: 1 };
    const theta = wThetaSum / wSum;
    let varSum = 0;
    for (let i = 0; i < weights.length; i++) {
      const d = this.nodes[i]! - theta;
      varSum += weights[i]! * d * d;
    }
    return { theta, se: Math.sqrt(varSum / wSum) };
  }

  grid(): { nodes: number[]; weights: number[] } {
    let maxLog = Number.NEGATIVE_INFINITY;
    for (const logW of this.logWeights) if (logW > maxLog) maxLog = logW;
    const raw = this.logWeights.map((logW) => Math.exp(logW - maxLog));
    const sum = raw.reduce((a, b) => a + b, 0);
    return { nodes: this.nodes, weights: sum > 0 ? raw.map((w) => w / sum) : raw };
  }
}

/**
 * Bracketing selection, mirroring the two-stage sequencer's rung search: start in
 * the middle, and after each response move to the midpoint of the surviving
 * known-correct / known-incorrect bracket. Reimplemented over IRT difficulties
 * rather than imported because the demo sequencer walks ordinal design rungs
 * inside a bank; this needs the same behaviour over an arbitrary pool.
 */
function bracketIndex(
  available: readonly number[],
  lo: number,
  hi: number,
  sortedIndexOf: ReadonlyMap<number, number>,
): number {
  const target = (lo + hi) / 2;
  let best = available[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const index of available) {
    const distance = Math.abs(sortedIndexOf.get(index)! - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

interface DomainCurvePoint {
  se: number;
  error: number;
}

/** Administer one domain under a config; return the running SE/error at each k. */
function runDomain(
  persona: Persona,
  respond: ReturnType<typeof createPersonaRun>['respond'],
  trials: ReturnType<typeof createPersonaRun>['trials'],
  irtByItemId: Map<string, IrtParameters>,
  domain: ScoredDomain,
  config: ConfigSpec,
  poolIrt: readonly IrtParameters[],
): {
  curve: DomainCurvePoint[];
  gated: ScoredResponse[];
  /** Per ADMINISTERED slot: the response if it survived the gate, else `null`. */
  administered: (ScoredResponse | null)[];
} {
  const sortedIndexOf = new Map<number, number>(poolIrt.map((_, i) => [i, i]));
  const available = poolIrt.map((_, i) => i);
  const posterior = new GridPosterior();
  const curve: DomainCurvePoint[] = [];
  const gated: ScoredResponse[] = [];
  const administered: (ScoredResponse | null)[] = [];
  const truth = persona.theta[domain];

  // The fixed ladder walks evenly-spaced difficulties in ascending order, which is
  // what the production FixedSequencer does over the 15-rung pool and the only
  // faithful generalization of it to a denser pool.
  const fixedOrder =
    config.arm === 'fixed'
      ? Array.from({ length: config.kMax }, (_, i) =>
          Math.min(
            poolIrt.length - 1,
            Math.round(config.kMax === 1 ? 0 : (i * (poolIrt.length - 1)) / (config.kMax - 1)),
          ),
        )
      : [];

  let bracketLo = 0;
  let bracketHi = poolIrt.length - 1;

  for (let k = 0; k < config.kMax && available.length > 0; k++) {
    let chosen: number;
    if (config.arm === 'fixed') {
      const preferred = fixedOrder[k]!;
      chosen = available.includes(preferred) ? preferred : available[0]!;
    } else if (config.arm === 'bracket') {
      chosen = bracketIndex(available, bracketLo, bracketHi, sortedIndexOf);
    } else if (config.arm === 'mfi') {
      const theta = posterior.estimate().theta;
      const local = maxInformationIndex(
        available.map((i) => ({ irt: poolIrt[i]! })),
        theta,
      );
      chosen = available[local ?? 0]!;
    } else {
      const local = posteriorWeightedInformationIndex(
        available.map((i) => ({ irt: poolIrt[i]! })),
        posterior.grid(),
      );
      chosen = available[local ?? 0]!;
    }
    available.splice(available.indexOf(chosen), 1);

    const itemId = `SEL-${config.id}-${domain}-${chosen}`;
    const irt = poolIrt[chosen]!;
    irtByItemId.set(itemId, irt);
    const item = sweepItem(itemId, domain, 'standing', irt, thetaToDial(irt.b));
    respond(item.served, item.bankItem);
    const trial = trials[trials.length - 1]!;

    if (config.arm === 'bracket') {
      const rung = sortedIndexOf.get(chosen)!;
      if (trial.correct) bracketLo = Math.min(poolIrt.length - 1, rung + 1);
      else bracketHi = Math.max(0, rung - 1);
      if (bracketLo > bracketHi) {
        bracketLo = Math.max(0, Math.min(bracketLo, bracketHi));
        bracketHi = Math.min(poolIrt.length - 1, Math.max(bracketLo, bracketHi));
      }
    }

    // The x-axis is ADMINISTERED items, exactly as in the recorded baseline: a
    // response the gate rejects still costs a slot on the form, so hiding it would
    // make every form look shorter than it is.
    if (isRapidGuess(trial.rtMs, RAPID_GUESS_MS)) {
      administered.push(null);
    } else {
      const response: ScoredResponse = { irt, correct: trial.correct };
      posterior.add(irt, trial.correct);
      gated.push(response);
      administered.push(response);
    }
    const estimate = posterior.estimate();
    curve.push({ se: estimate.se, error: estimate.theta - truth });
  }

  return { curve, gated, administered };
}

interface ConfigSummary {
  config: ConfigSpec;
  /** Per-domain curve: index `k-1` holds the stats after k administered items. */
  perDomain: { k: number; meanSe: number; rmse: number; bias: number }[];
  pooled: { k: number; meanSe: number; rmse: number; bias: number }[];
  /** Largest posterior-vs-`estimateThetaEap` disagreement observed, in theta units. */
  maxEstimatorDrift: number;
}

function summarize(config: ConfigSpec, cohort: readonly Persona[], seed: string): ConfigSummary {
  const poolIrt: IrtParameters[] = POOLS[config.pool].difficulties.map((b, i) => ({
    a: sweepDiscrimination(`${config.pool}|${i}`) * config.discriminationMultiplier,
    b,
    c: config.guessing,
    model: '3PL',
  }));

  const perDomainSe: number[][] = Array.from({ length: config.kMax }, () => []);
  const perDomainErr: number[][] = Array.from({ length: config.kMax }, () => []);
  const pooledSe: number[][] = Array.from({ length: config.kMax }, () => []);
  const pooledErr: number[][] = Array.from({ length: config.kMax }, () => []);
  let maxEstimatorDrift = 0;

  for (const persona of cohort) {
    const irtByItemId = new Map<string, IrtParameters>();
    const run = createPersonaRun(persona, `${seed}|sel|${config.id}`, {
      itemIrt: (item) => irtByItemId.get(item.itemId),
    });

    const administeredByDomain: (ScoredResponse | null)[][] = [];
    for (const domain of SCORED_DOMAINS) {
      const { curve, gated, administered } = runDomain(
        persona,
        run.respond,
        run.trials,
        irtByItemId,
        domain,
        config,
        poolIrt,
      );
      administeredByDomain.push(administered);
      curve.forEach((point, i) => {
        perDomainSe[i]!.push(point.se);
        perDomainErr[i]!.push(point.error);
      });

      // One independent check per persona-domain that the incremental posterior
      // agrees with the production estimator it stands in for.
      const reference = estimateThetaEap(gated);
      const incremental = curve[curve.length - 1]!;
      maxEstimatorDrift = Math.max(maxEstimatorDrift, Math.abs(reference.se - incremental.se));
    }

    // Pooled at per-domain DEPTH k: the child has been ADMINISTERED 4k items, one
    // more from each domain, and whichever of them survived the gate are in the
    // estimate. Indexing on administered rather than surviving items keeps the
    // pooled curve on the same axis as the per-domain curves and as the recorded
    // baseline, so precision lost to the gate stays visible instead of censored.
    const pooled = new GridPosterior();
    for (let k = 0; k < config.kMax; k++) {
      for (const administered of administeredByDomain) {
        const response = administered[k];
        if (response) pooled.add(response.irt, response.correct);
      }
      const estimate = pooled.estimate();
      pooledSe[k]!.push(estimate.se);
      pooledErr[k]!.push(estimate.theta - persona.thetaMean);
    }
  }

  const collapse = (ses: number[][], errs: number[][]) =>
    ses.map((se, i) => ({
      k: i + 1,
      meanSe: mean(se),
      rmse: Math.sqrt(mean(errs[i]!.map((e) => e * e))),
      bias: mean(errs[i]!),
    }));

  return {
    config,
    perDomain: collapse(perDomainSe, perDomainErr),
    pooled: collapse(pooledSe, pooledErr),
    maxEstimatorDrift,
  };
}

function itemsForTarget(
  curve: readonly { k: number; meanSe: number }[],
  target: number,
): number | null {
  for (const point of curve) if (point.meanSe <= target) return point.k;
  return null;
}

function main(): void {
  const argv = process.argv.slice(2);
  const n = numberFlag(argv, '--n', 1000);
  const seed = flagValue(argv, '--seed') ?? 'psychometric-sweep-2026-07-28';
  const outDir = flagValue(argv, '--out') ?? defaultOutDir();
  const startedAt = new Date().toISOString();

  const cohort = samplePersonaCohort({ seed, n });
  const configs = buildConfigs();
  const summaries = configs.map((config) => summarize(config, cohort, seed));
  const byId = new Map(summaries.map((s) => [s.config.id, s]));

  const lines: string[] = [];
  lines.push('# Experiment 2 — Adaptive selection and the guessing floor (SYNTHETIC)', '');
  lines.push(CLAIM_HEADER, '');
  lines.push(
    `Run: N=${n} personas · seed \`${seed}\` · ${configs.length} configurations · ` +
      `RT gate at ${RAPID_GUESS_MS} ms · x-axis is ADMINISTERED items · ${startedAt}`,
    '',
  );
  lines.push(
    `Incremental-posterior vs \`estimateThetaEap\` maximum SE disagreement across every ` +
      `persona-domain in every configuration: ${fmt(
        Math.max(...summaries.map((s) => s.maxEstimatorDrift)),
        9,
      )} theta units.`,
    '',
  );

  const row = (summary: ConfigSummary): string[] => {
    const perDomain15 = summary.perDomain[14];
    const pooled15 = summary.pooled[14];
    const pooledDepth = itemsForTarget(summary.pooled, 0.5);
    return [
      POOLS[summary.config.pool].label,
      ARM_LABEL[summary.config.arm],
      String(summary.config.guessing),
      `x${summary.config.discriminationMultiplier}`,
      perDomain15 ? fmt(perDomain15.meanSe) : 'n/a',
      perDomain15 ? fmt(perDomain15.rmse) : 'n/a',
      pooled15 ? fmt(pooled15.meanSe) : 'n/a',
      pooled15 ? fmt(pooled15.rmse) : 'n/a',
      String(itemsForTarget(summary.perDomain, 0.5) ?? `not reached (<=${summary.config.kMax})`),
      pooledDepth == null ? `not reached (<=${4 * summary.config.kMax})` : String(4 * pooledDepth),
    ];
  };

  const headers = [
    'pool',
    'selection',
    'c',
    'a',
    'per-domain SE @15',
    'per-domain RMSE @15',
    'pooled SE @60 admin',
    'pooled RMSE @60 admin',
    'per-domain items for SE<=0.50',
    'pooled admin items for SE<=0.50',
  ];

  lines.push('## Part A — selection rule at the production item format (c = 0.25)', '');
  lines.push(mdTable(headers, summaries.filter((s) => s.config.part === 'selection').map(row)), '');
  lines.push(
    'The `matched` rows administer the SAME 15 rungs the production bank holds, so at k = 15 every ' +
      'selection rule has administered the identical item set and the columns must agree to sampling ' +
      'noise — that agreement is the check that the arms differ only in ORDER. The `enriched` rows ' +
      'are the fair test of adaptive selection: a 41-rung pool is what a real CAT pool looks like.',
    '',
  );

  lines.push('### Per-domain SE vs administered items (c = 0.25)', '');
  const curveConfigs = [
    'matched/fixed/c0.25/a1.0',
    'enriched/fixed/c0.25/a1.0',
    'enriched/bracket/c0.25/a1.0',
    'enriched/mfi/c0.25/a1.0',
    'enriched/posterior/c0.25/a1.0',
  ];
  const curveKs = [3, 5, 8, 10, 12, 15, 20, 25, 30, 40];
  lines.push(
    mdTable(
      ['items per domain', ...curveConfigs.map((id) => `${id.split('/')[0]}/${id.split('/')[1]}`)],
      curveKs.map((k) => [
        String(k),
        ...curveConfigs.map((id) => {
          const point = byId.get(id)!.perDomain[k - 1];
          return point ? fmt(point.meanSe) : '—';
        }),
      ]),
    ),
    '',
  );

  lines.push('## Part B — guessing sensitivity (enriched pool, a x1.0)', '');
  lines.push(mdTable(headers, summaries.filter((s) => s.config.part === 'guessing').map(row)), '');
  lines.push(
    'Read against the `enriched` c = 0.25 rows in Part A. `c = 0` is a constructed-response item ' +
      'with no guessing floor; 0.20 / 0.25 / 0.33 are five-, four- and three-option selected ' +
      'response. Nothing else changes between these rows.',
    '',
  );

  lines.push('## Part C — discrimination sensitivity (enriched pool, c = 0.25)', '');
  lines.push(
    mdTable(headers, summaries.filter((s) => s.config.part === 'discrimination').map(row)),
    '',
  );
  lines.push(
    "The multiplier scales the pool's `a ~ U(0.9, 1.6)` band. `x2.0` is an `a` of 1.8-3.2, which is " +
      'a very strong item pool — quoted as an upper bound on what item quality alone can buy, not as ' +
      'a pool anyone has built.',
    '',
  );

  const { mdPath, jsonPath } = writeArtifact({
    outDir,
    name: 'experiment-2-selection-guessing',
    lines,
    seed,
    json: {
      experiment: 'adaptive selection and the guessing floor',
      startedAt,
      n,
      rapidGuessThresholdMs: RAPID_GUESS_MS,
      configs: summaries.map((s) => ({
        ...s.config,
        maxEstimatorDrift: round(s.maxEstimatorDrift, 12),
        perDomainItemsForSe050: itemsForTarget(s.perDomain, 0.5),
        pooledAdministeredItemsForSe050: (() => {
          const depth = itemsForTarget(s.pooled, 0.5);
          return depth == null ? null : 4 * depth;
        })(),
        perDomain: s.perDomain.map((p) => ({
          k: p.k,
          meanSe: round(p.meanSe, 4),
          rmse: round(p.rmse, 4),
          bias: round(p.bias, 4),
        })),
        pooled: s.pooled.map((p) => ({
          k: p.k,
          meanSe: round(p.meanSe, 4),
          rmse: round(p.rmse, 4),
          bias: round(p.bias, 4),
        })),
      })),
    },
  });

  console.log(lines.join('\n'));
  console.log('');
  console.log(`report (md):   ${mdPath}`);
  console.log(`report (json): ${jsonPath}`);
}

main();
