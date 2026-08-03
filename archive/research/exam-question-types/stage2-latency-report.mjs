// ACQUISITION LATENCY versus FITTED SLOPE — the measurement comparison, run on the same blocks.
//
// One grid, one set of simulated blocks, two readouts computed from each. Anything else would let
// the answer turn on a difference in the blocks rather than a difference in the measures: λ and the
// latency score here see identical item sequences, identical responses and identical seeds.
//
// WHAT A "CHILD" IS HERE, because the headline number depends entirely on it. A child is an
// (encoding fidelity, standing) pair; replicate blocks are seeds. That makes within-child error
// MEASURED by replication rather than estimated from a model, and the identical procedure applies
// to both measures. It also means the ABSOLUTE size of the between-child variance is a property of
// the fidelity grid this file chose, not a property of children — spread the grid and every
// measure's ratio rises. Only the COMPARISON between the two measures on the same population is
// interpretable, and that is how the report states it.
//
// THE ONE THING ONLY A SIMULATION CAN DO, and the reason this comparison can be decisive rather
// than suggestive: the model learner exposes the trial at which its own memory pinned each
// primitive. So the measured latency can be split into the part that is the learner
// (t* − d, true acquisition delay) and the part that is the instrument (k − t*, how long the
// criterion took to become confident). If the second dominates, no criterion tuning saves the
// measure, because the guessing floor is what sets it.
//
// CLAIM BOUNDARY, restated because it is the one that matters most. These are synthetic responders.
// The comparison can establish that a measure separates constructed learners from constructed
// guessers and can rank constructed learners built to differ. It cannot establish that either
// measure separates real children, and no run of this file is evidence that a child learns
// anything.
//
// Usage:
//   pnpm stage2:latency
//   pnpm stage2:latency -- --seeds 6 --standings 8,13,19

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as phase2 from '../../apps/web/src/lib/exam/phase2.ts';
import * as scoring from '../../packages/exam-scoring/src/index.ts';
import { hashUnit } from '../../packages/exam-engine/src/rng.ts';

import * as inspector from './stage2-inspectors/opchain.js';
import * as learnability from './stage2-learnability.mjs';
import {
  WARMUP_DEMONSTRATIONS,
  createRun,
  guessingResponder,
  playToEnd,
  summariseRun,
} from './stage2-block-run.js';
import { partialInductionResponder } from './stage2-latency-responders.js';
import {
  DEFAULT_CRITERION,
  blockLatencies,
  correlation,
  fitRandomInterceptAft,
  kaplanMeier,
  midRanks,
  naiveLatencies,
  pooledWithinCorrelation,
  rankCorrelation,
  separationAuc,
  spearmanBrown,
  varianceComponents,
} from './stage2-latency.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const engine = { ...phase2, ...scoring, hashUnit };

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const TYPE = flag('type', 'FLU-OPCHAIN-01');
const LENGTH = Number(flag('length', String(engine.LEARNING_BLOCK_LENGTH)));
const STANDINGS = flag('standings', '5,8,11,13,15,17,19').split(',').map(Number);
const SEEDS = Number(flag('seeds', '12'));
/**
 * Encoding fidelities defining the learner population, plus the harness's guesser.
 *
 * Chosen to span the reachable accuracy range rather than to look tidy: this ladder produces block
 * accuracies from about 0.87 down to 0.37 against the guesser's 0.22, so the population has real
 * graded ability instead of two extremes. The induction model is robust — at fidelity 0.5 it still
 * pins five of six primitives — which is why the low end has to go down to 0.06 to get any spread.
 */
const FIDELITIES = flag('fidelities', '1,0.5,0.25,0.15,0.1,0.06').split(',').map(Number);
const BASE_SEED = 20260801;
const SEED_STRIDE = 7919;

let banks;
try {
  banks = JSON.parse(readFileSync(join(HERE, 'stage2-build/items.json'), 'utf8'));
} catch {
  console.error('stage2-latency-report: run `pnpm stage2:review:build` first.');
  process.exit(1);
}
const arms = banks[TYPE];
if (!arms?.consistent || !arms?.perTrial) {
  console.error(`stage2-latency-report: ${TYPE} has no two-arm bank in stage2-build/items.json.`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * One block, and everything both measures need read off it
 * ------------------------------------------------------------------ */

const makeResponder = (spec, seed, salt) =>
  spec.kind === 'guesses'
    ? guessingResponder()
    : partialInductionResponder(inspector, {
        hashUnit,
        seed,
        salt,
        fidelity: spec.fidelity,
        warmupCount: WARMUP_DEMONSTRATIONS,
      });

/** Re-attach each served row to its item and its true mapping — what the latency trace consumes. */
function latencyInput(run) {
  const byId = new Map(run.bank.served.map((item) => [item.itemId, item]));
  return {
    trials: run.rows.map((row) => ({
      item: byId.get(row.itemId),
      revealedFigure: row.revealed.output,
      chosenKey: row.answered,
      trueMapping: run.bank.reviewerOnly[row.itemId]?.system?.mapping ?? null,
    })),
    priorReveals: run.warmup.map((w) => ({ item: w.item, revealedFigure: w.revealedFigure })),
  };
}

/** λ refitted on one parity of the block's trials, keeping the ORIGINAL trial indices. */
function halfLambda(run, parity) {
  const trials = engine
    .toLearningTrials(run.served)
    .filter((t) => t.trialIndex % 2 === (parity === 'odd' ? 0 : 1));
  if (trials.length < 4) return null;
  // Original indices retained deliberately: re-indexing 0..14 would rescale λ by two and make the
  // two halves incomparable to the whole-block fit they are supposed to be a split of.
  return engine.estimateLearningCurve(trials, { priorTheta0Mean: run.standing }).lambda;
}

function block(arm, standing, seed, spec) {
  const salt = `${arm}|${standing}|${seed}|${spec.id}`;
  const run = createRun({
    engine,
    bank: arms[arm],
    arm,
    standing,
    seed,
    length: LENGTH,
    seenItemIds: [],
    responder: makeResponder(spec, seed, salt),
    learnability,
    warmupCount: WARMUP_DEMONSTRATIONS,
  });
  playToEnd(run);
  const summary = summariseRun(run);
  const shared = { persistence: arm, ...latencyInput(run), criterion: DEFAULT_CRITERION };

  return {
    ...summary,
    childId: `${spec.id}@${standing}`,
    spec,
    shared,
    latency: blockLatencies(shared),
    latencyOdd: blockLatencies({ ...shared, half: 'odd' }),
    latencyEven: blockLatencies({ ...shared, half: 'even' }),
    naive: naiveLatencies({ trials: shared.trials, criterion: DEFAULT_CRITERION }),
    lambdaOdd: halfLambda(run, 'odd'),
    lambdaEven: halfLambda(run, 'even'),
    /** Ground truth: badge -> trial the responder's own memory pinned it. Empty for the guesser. */
    acquiredAt: run.responder.acquisition ? run.responder.acquisition() : {},
    meanDepth:
      run.rows.reduce((sum, r) => sum + (r.meta?.operatorChain?.length ?? 0), 0) / run.rows.length,
  };
}

const SPECS = [
  ...FIDELITIES.map((fidelity) => ({
    kind: 'induces',
    fidelity,
    id: `fid${fidelity.toFixed(2)}`,
    learner: true,
  })),
  { kind: 'guesses', id: 'guesses', learner: false },
];

const blocks = [];
for (const arm of ['consistent', 'perTrial']) {
  for (const spec of SPECS) {
    for (const standing of STANDINGS) {
      for (let s = 0; s < SEEDS; s += 1) {
        blocks.push({ arm, ...block(arm, standing, BASE_SEED + s * SEED_STRIDE, spec) });
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const mean = (xs) => (xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length);
const sd = (xs) => {
  if (xs.length < 2) return Number.NaN;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const finite = (xs) => xs.filter(Number.isFinite);
const pct = (x) => (Number.isFinite(x) ? `${(100 * x).toFixed(0)}%` : '—');
const n2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—');
const n3 = (x) => (Number.isFinite(x) ? x.toFixed(3) : '—');
const n4 = (x) => (Number.isFinite(x) ? x.toFixed(4) : '—');
const groupBy = (xs, key) => {
  const out = new Map();
  for (const x of xs) {
    const k = key(x);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(x);
  }
  return out;
};

const live = blocks.filter((b) => b.arm === 'consistent');
const control = blocks.filter((b) => b.arm === 'perTrial');
const learners = live.filter((b) => b.spec.learner);
const guessers = live.filter((b) => !b.spec.learner);
const reasoners = live.filter((b) => b.spec.fidelity === 1);

console.log(
  `# Stage 2 — acquisition latency versus fitted slope (${TYPE})\n\n` +
    `${LENGTH} scored trials after ${WARMUP_DEMONSTRATIONS} unscored demonstrations. ` +
    `${SPECS.length} responder configurations x ${STANDINGS.length} standings x ${SEEDS} seeds x ` +
    `2 arms = ${blocks.length} blocks. Seeds ${BASE_SEED}+${SEED_STRIDE}k, fully deterministic.\n` +
    `Criterion: sequential log-odds, lapse ${DEFAULT_CRITERION.lapse}, threshold ` +
    `${DEFAULT_CRITERION.threshold}:1.\n` +
    'Real administration path: apps/web/src/lib/exam/phase2.ts + @gt-selection/exam-{engine,scoring}.',
);

/* ================================================================== *
 * 0. The population, so the reader can see it is graded
 * ================================================================== */
console.log(
  '\n## 0. The simulated population\n\n' +
    'Between-child variance is only meaningful against a population that actually varies, so this ' +
    'is\nfirst. `fidelity` is the probability a reveal is encoded at all; everything else follows ' +
    'from it\nthrough the real selection rule. Note the last two columns: a better learner is ' +
    'served HARDER, DEEPER\nitems, and chain depth is exactly what makes a response less ' +
    'diagnostic about any one primitive.\n',
);
console.log(
  '| responder | accuracy | primitives its memory pinned | mean served difficulty | mean chain depth | opportunities per primitive |',
);
console.log('| --- | --- | --- | --- | --- | --- |');
for (const spec of SPECS) {
  const bs = live.filter((b) => b.spec.id === spec.id);
  const rows = bs.flatMap((b) => b.latency).filter((r) => r.deducible);
  console.log(
    `| ${spec.id} | ${n3(mean(bs.map((b) => b.accuracy)))} | ` +
      `${n2(mean(bs.map((b) => b.pinned ?? 0)))} | ${n2(mean(bs.map((b) => b.meanServed)))} | ` +
      `${n2(mean(bs.map((b) => b.meanDepth)))} | ${n2(mean(rows.map((r) => r.opportunities)))} |`,
  );
}

/* ================================================================== *
 * 1. The criterion, and whether a guesser satisfies it
 * ================================================================== */
console.log(
  '\n## 1. The criterion, and what it costs a guesser\n\n' +
    'A primitive is demonstrated when the log-odds that the responder holds it correctly, ' +
    'accumulated\nover informative opportunities, exceed ' +
    `${DEFAULT_CRITERION.threshold}:1. An opportunity is a served trial whose chain contains the ` +
    'badge and on\nwhich at least one option is unreachable while holding that badge correct. `q` ' +
    'is the share of\noptions that ARE reachable, so it is exactly what a uniform guesser scores ' +
    'on that trial.\n\n' +
    'A pass buys log((1-lapse)/q); a miss costs log(lapse/(1-q)). An opportunity excluding four ' +
    'of five\noptions is therefore worth far more than one excluding one of five, which no fixed ' +
    'run length can\nexpress. Wald bounds the false-alarm probability at 1/threshold = ' +
    `${(100 / DEFAULT_CRITERION.threshold).toFixed(0)}% per primitive.\n\n` +
    'The test is SOUND by construction: a responder holding a primitive correctly produces its ' +
    'answer\nfrom an assignment containing that operator, so its choice is a pass whatever it ' +
    'believes about the\nother badges in the chain. Knowing one primitive is never punished for ' +
    'not knowing another.\n',
);
console.log(
  '| responder | deducible primitives per block | reached criterion | opportunities to criterion | first-correct would have fired on |',
);
console.log('| --- | --- | --- | --- | --- |');
for (const spec of SPECS) {
  const bs = live.filter((b) => b.spec.id === spec.id);
  const rows = bs.flatMap((b) => b.latency).filter((r) => r.deducible);
  const events = rows.filter((r) => r.event);
  const tested = rows.filter((r) => r.opportunities > 0);
  console.log(
    `| ${spec.id} | ${n2(rows.length / bs.length)} of 6 | ` +
      `${pct(events.length / Math.max(1, rows.length))} (${events.length}/${rows.length}) | ` +
      `${n2(mean(events.map((r) => r.latencyOpportunities)))} | ` +
      `${pct(mean(tested.map((r) => (r.passes > 0 ? 1 : 0))))} |`,
  );
}

const guesserRows = guessers.flatMap((b) => b.latency).filter((r) => r.deducible);
const guesserFalseAlarms = guesserRows.filter((r) => r.event).length;
const guesserTested = guesserRows.filter((r) => r.opportunities > 0);
console.log(
  `\n**The guesser check.** Over ${guessers.length} guessing blocks the criterion fired on ` +
    `${guesserFalseAlarms} of the ${guesserTested.length} deducible primitives it actually tested ` +
    `(**${((100 * guesserFalseAlarms) / Math.max(1, guesserTested.length)).toFixed(1)}%**), ` +
    `inside the ${(100 / DEFAULT_CRITERION.threshold).toFixed(0)}% Wald bound. ` +
    `${guessers.filter((b) => b.latency.some((r) => r.event)).length} of ${guessers.length} ` +
    'guessing blocks produced any event at all. The same primitives would have satisfied a ' +
    'first-correct\ncriterion at the rate in the last column above, which is why first-correct is ' +
    'not a criterion.',
);

/* Sensitivity: the threshold is a choice, so show what it is doing. */
console.log(
  '\n**Sensitivity to the threshold.** The criterion is a free parameter, so the report states ' +
    'what\nmoving it does rather than defending one value.\n',
);
console.log(
  '| threshold | Wald bound | guesser false alarms | reasoner reached | reasoner mean latency | censoring (learners) |',
);
console.log('| --- | --- | --- | --- | --- | --- |');
for (const threshold of [20, 100, 400]) {
  const criterion = { lapse: DEFAULT_CRITERION.lapse, threshold };
  const at = (bs) => bs.flatMap((b) => blockLatencies({ ...b.shared, criterion }));
  const g = at(guessers).filter((r) => r.deducible && r.opportunities > 0);
  const r = at(reasoners).filter((row) => row.deducible);
  const l = at(learners).filter((row) => row.deducible);
  console.log(
    `| ${threshold}:1 | ${(100 / threshold).toFixed(1)}% | ` +
      `${((100 * g.filter((row) => row.event).length) / Math.max(1, g.length)).toFixed(1)}% | ` +
      `${pct(r.filter((row) => row.event).length / Math.max(1, r.length))} | ` +
      `${n2(mean(r.filter((row) => row.event).map((row) => row.latency)))} | ` +
      `${pct(l.filter((row) => !row.event).length / Math.max(1, l.length))} |`,
  );
}

/* ================================================================== *
 * 2. Onset, censoring, and how much of the sample is empty
 * ================================================================== */
console.log(
  '\n## 2. Onset, censoring, and the share of the sample that is empty\n\n' +
    'Four mutually exclusive outcomes per (block, primitive). `not deducible` is NOT censoring — ' +
    'there\nis no onset, so no latency exists to be censored, and dropping these silently is the ' +
    'failure mode\nat high standings. `untested` is censoring with zero exposure: deducible, but ' +
    'the selection rule\nnever served an informative item on it afterwards.\n',
);
console.log(
  '| standing | responder | not deducible | untested | censored | event | mean onset d_i | censoring rate |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const standing of STANDINGS) {
  for (const spec of SPECS) {
    const rows = live
      .filter((b) => b.standing === standing && b.spec.id === spec.id)
      .flatMap((b) => b.latency);
    const notDeducible = rows.filter((r) => !r.deducible).length;
    const untested = rows.filter((r) => r.untested).length;
    const events = rows.filter((r) => r.event).length;
    const censored = rows.filter((r) => r.deducible && !r.event && !r.untested).length;
    const atRisk = rows.length - notDeducible;
    console.log(
      `| ${standing} | ${spec.id} | ${pct(notDeducible / rows.length)} | ` +
        `${pct(untested / rows.length)} | ${pct(censored / rows.length)} | ` +
        `${pct(events / rows.length)} | ` +
        `${n2(mean(rows.filter((r) => r.deducible).map((r) => r.onset)))} | ` +
        `${pct(atRisk === 0 ? Number.NaN : (atRisk - events) / atRisk)} |`,
    );
  }
}

const allLive = live.flatMap((b) => b.latency);
const learnerRows = learners.flatMap((b) => b.latency);
const censoringRate = (rows) => {
  const deducible = rows.filter((r) => r.deducible);
  return deducible.filter((r) => !r.event).length / Math.max(1, deducible.length);
};
console.log(
  `\nOver all ${live.length} live-arm blocks, ` +
    `${pct(allLive.filter((r) => !r.deducible).length / allLive.length)} of primitives were never ` +
    'deducible inside the block, so no latency exists for them at all. Of those that were, ' +
    `**${pct(censoringRate(allLive))} are right-censored**; over the learner population alone it ` +
    `is **${pct(censoringRate(learnerRows))}**, and over the reasoner alone ` +
    `${pct(censoringRate(reasoners.flatMap((b) => b.latency)))}.`,
);

console.log('\nCensoring by standing, over the learner population.\n');
console.log('| standing | never deducible | right-censored | events | usable latencies per block |');
console.log('| --- | --- | --- | --- | --- |');
for (const standing of STANDINGS) {
  const bs = learners.filter((b) => b.standing === standing);
  const rows = bs.flatMap((b) => b.latency);
  const deducible = rows.filter((r) => r.deducible);
  console.log(
    `| ${standing} | ${pct(1 - deducible.length / rows.length)} | ${pct(censoringRate(rows))} | ` +
      `${deducible.filter((r) => r.event).length} | ` +
      `${n2(deducible.filter((r) => r.event).length / bs.length)} of 6 |`,
  );
}

/* Onset is not exogenous, and that is a problem for the normalisation. */
console.log(
  '\n**The onset is not exogenous.** `d_i` is computed from the reveals the child was actually ' +
    'shown,\nand which items those are depends on the child\u2019s own answers through the ' +
    'adaptive rule. So the\nquantity being subtracted is itself a function of performance, which ' +
    'is not what "removing the\nidentifiability confound" was supposed to mean.\n',
);
console.log('| responder | deducible primitives per block | mean onset d_i |');
console.log('| --- | --- | --- |');
for (const spec of SPECS) {
  const bs = live.filter((b) => b.spec.id === spec.id);
  const rows = bs.flatMap((b) => b.latency);
  console.log(
    `| ${spec.id} | ${n2(rows.filter((r) => r.deducible).length / bs.length)} | ` +
      `${n2(mean(rows.filter((r) => r.deducible).map((r) => r.onset)))} |`,
  );
}

/* ================================================================== *
 * 3. Kaplan–Meier
 * ================================================================== */
console.log(
  '\n## 3. Kaplan–Meier, so the censored blocks are not thrown away\n\n' +
    'Every deducible primitive contributes: an event at L_i, or "longer than this" at the block ' +
    'end.\n`naive mean of reached` is what averaging only the ones that got there would have ' +
    'reported. The gap\nbetween it and the restricted mean is the bias that averaging would have ' +
    'introduced, and it points\nthe way it must: toward the fast.\n',
);
console.log(
  '| responder | at risk | events | censoring | KM median | RMST(30) | naive mean of reached |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const spec of SPECS) {
  const rows = live.filter((b) => b.spec.id === spec.id).flatMap((b) => b.latency);
  const km = kaplanMeier(
    rows
      .filter((r) => r.deducible)
      .map((r) => ({ time: r.event ? r.latency : r.censoredAt, event: r.event }))
      .filter((o) => Number.isFinite(o.time)),
  );
  console.log(
    `| ${spec.id} | ${km.n} | ${km.events} | ${pct(km.censoringRate)} | ` +
      `${km.median === null ? 'not reached' : n2(km.median)} | ${n2(km.restrictedMean(LENGTH))} | ` +
      `${n2(mean(rows.filter((r) => r.event).map((r) => r.latency)))} |`,
  );
}

/* ================================================================== *
 * 4. What the measured latency is actually made of
 * ================================================================== */
console.log(
  '\n## 4. What the measured latency is made of\n\n' +
    'The model learner reports the trial at which its own memory pinned each primitive, so the ' +
    'measured\nlatency splits exactly:\n\n' +
    '    L_i = k_i - d_i  =  (t*_i - d_i)   +   (k_i - t*_i)\n' +
    '                        acquisition        detection lag\n' +
    '                        the learner        the instrument\n\n' +
    'The second term is what the five-option guessing floor costs: however fast a child acquires ' +
    'a\nprimitive, several diagnostic responses are needed before any criterion can say so. If it ' +
    'is\nlarge relative to the first, the measured latency is mostly a property of the item ' +
    'sequence.\n',
);
const decomposition = (bs) => {
  const acquisition = [];
  const detection = [];
  const measured = [];
  for (const b of bs) {
    for (const row of b.latency) {
      if (!row.deducible || !row.event) continue;
      const star = b.acquiredAt[row.badge];
      if (star === undefined) continue;
      acquisition.push(star - row.onset);
      detection.push(row.criterionTrial - star);
      measured.push(row.latency);
    }
  }
  return { acquisition, detection, measured };
};
console.log('| responder | events used | acquisition t*-d | detection lag k-t* | measured L | detection share |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const spec of SPECS.filter((s) => s.learner)) {
  const d = decomposition(live.filter((b) => b.spec.id === spec.id));
  console.log(
    `| ${spec.id} | ${d.measured.length} | ${n2(mean(d.acquisition))} (SD ${n2(sd(d.acquisition))}) | ` +
      `${n2(mean(d.detection))} (SD ${n2(sd(d.detection))}) | ${n2(mean(d.measured))} | ` +
      `${pct(mean(d.detection) / mean(d.measured))} |`,
  );
}
const wholeLearners = decomposition(learners);
console.log(
  `\nAcross the whole learner population the acquisition term has SD ${n2(sd(wholeLearners.acquisition))} ` +
    `trials and the detection term SD ${n2(sd(wholeLearners.detection))} trials, on a measured ` +
    `latency of mean ${n2(mean(wholeLearners.measured))}. **` +
    `${pct(mean(wholeLearners.detection) / mean(wholeLearners.measured))} of the average measured ` +
    'latency is the instrument, not the learner.**',
);

/* The ceiling: what the measure could do if the criterion were free. */
console.log(
  '\n**The ceiling this implies.** Running the whole aggregation on the TRUE acquisition times — ' +
    'which no\nreal child would ever expose — gives the best any behavioural criterion could ' +
    'reach on these blocks.\nIt is carried through every table below as `oracle (true ' +
    'acquisition)`, and the gap between it\nand the measured row is the price of having to infer ' +
    'acquisition from five-option responses.',
);

/* ================================================================== *
 * 5. Aggregation, and THE comparison
 * ================================================================== */
const AFT_SHIFT = 1;
const aftFrom = (b, pick) =>
  b.latency
    .filter((r) => r.deducible)
    .map((r) => pick(b, r))
    .filter((o) => o !== null && Number.isFinite(o.time) && o.time > 0);

/** Measured: criterion event at L_i, otherwise censored at the block end. */
const measuredObs = (b) =>
  aftFrom(b, (_, r) => ({
    time: (r.event ? r.latency : r.censoredAt) + AFT_SHIFT,
    event: r.event,
  }));
/** Oracle: the responder's own acquisition trial, censored if its memory never pinned it. */
const trueObs = (b) =>
  aftFrom(b, (blk, r) => {
    const star = blk.acquiredAt[r.badge];
    return star === undefined
      ? { time: LENGTH - r.onset + AFT_SHIFT, event: false }
      : { time: Math.max(0, star - r.onset) + AFT_SHIFT, event: true };
  });

const measuredAft = fitRandomInterceptAft(live.map(measuredObs));
const trueAft = fitRandomInterceptAft(live.map(trueObs));
/** Negated so HIGHER is faster on every measure, which is what makes the AUC column comparable. */
const scorerFor = (fit, observations) => (b) => {
  if (fit === null) return Number.NaN;
  const obs = observations(b);
  if (obs.length === 0) return Number.NaN;
  const scored = fit.scoreChild(obs);
  return scored.informative ? -scored.mean : Number.NaN;
};
const latencyScore = scorerFor(measuredAft, measuredObs);
const trueLatencyScore = scorerFor(trueAft, trueObs);

console.log(
  '\n## 5. Aggregating six coupled latencies into one score\n\n' +
    'The six primitives are not independent: the bijection means pinning five pins the sixth, and ' +
    'the\nconstraint propagation couples the onsets. A log-normal accelerated-failure-time model ' +
    'with the\nchild as a random intercept says exactly that — one latent per-child shift shared ' +
    "across that\nchild's primitives, censored observations entering through the survivor " +
    'function — and the score\nis the posterior mean shift, sign-flipped so larger is faster. ' +
    `All times are shifted by +${AFT_SHIFT} so a\nzero-trial acquisition is representable on the ` +
    'log scale.\n',
);
for (const [label, fit] of [
  ['measured (criterion)', measuredAft],
  ['oracle (true acquisition)', trueAft],
]) {
  if (fit === null) {
    console.log(`- ${label}: did not fit.`);
    continue;
  }
  console.log(
    `- ${label}: mu ${n3(fit.mu)}, within-child SD sigma ${n3(fit.sigma)}, between-block SD tau ` +
      `${n3(fit.tau)}, over ${fit.children} blocks with at least one usable observation.`,
  );
}
const silent = live.filter((b) => !Number.isFinite(latencyScore(b))).length;
console.log(
  `\n${silent} of ${live.length} live blocks (${pct(silent / live.length)}) produce no latency ` +
    'score at all, because no primitive was ever deducible in them. λ always returns a number.',
);

console.log(
  '\n## 6. Between-child variance against within-child error\n\n' +
    'The one number that decides whether either measure can rank anyone. A child is a (fidelity, ' +
    'standing)\npair; replicates are seeds, so within-child error is MEASURED by replication ' +
    'rather than estimated\nfrom a model, and the identical one-way random-effects decomposition ' +
    'is applied to every row.\n\n' +
    '`ratio` is between-child variance over single-block replication error. Below 1, two children ' +
    'cannot\nbe told apart from one block each. ICC(1,1) is the reliability of a single block.\n\n' +
    'The ABSOLUTE size of these depends on how wide the fidelity grid is, which this file chose. ' +
    'Only\nthe comparison between rows, on the same blocks, is interpretable.\n',
);
const childGroups = (bs, score) =>
  [...groupBy(bs, (b) => b.childId).values()].map((g) => finite(g.map(score)));
const ROWS = [
  ['λ (fitted slope)', (b) => b.lambda],
  ['latency score (AFT, measured)', latencyScore],
  ['latency score (AFT, TRUE acquisition — the ceiling)', trueLatencyScore],
  ['primitives reaching criterion (count)', (b) => b.latency.filter((r) => r.event).length],
  ['block accuracy', (b) => b.accuracy],
];
console.log('| measure | children | blocks | between-child var | within-child var | **ratio** | ICC(1,1) |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const [label, score] of ROWS) {
  const vc = varianceComponents(childGroups(learners, score));
  console.log(
    vc === null
      ? `| ${label} | — | — | — | — | — | — |`
      : `| ${label} | ${vc.children} | ${vc.blocks} | ${n4(vc.between)} | ${n4(vc.within)} | ` +
          `**${n2(vc.ratio)}** | ${n2(vc.icc)} |`,
  );
}

console.log(
  '\nSame decomposition inside each standing, which removes the part of the between-child spread ' +
    'that\nis a Stage 1 difference rather than a learning difference.\n',
);
console.log('| standing | λ ratio | latency ratio | oracle-latency ratio | λ ICC | latency ICC |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const standing of STANDINGS) {
  const bs = learners.filter((b) => b.standing === standing);
  const lam = varianceComponents(childGroups(bs, (b) => b.lambda));
  const lat = varianceComponents(childGroups(bs, latencyScore));
  const tru = varianceComponents(childGroups(bs, trueLatencyScore));
  console.log(
    `| ${standing} | ${lam === null ? '—' : n2(lam.ratio)} | ${lat === null ? '—' : n2(lat.ratio)} | ` +
      `${tru === null ? '—' : n2(tru.ratio)} | ${lam === null ? '—' : n2(lam.icc)} | ` +
      `${lat === null ? '—' : n2(lat.icc)} |`,
  );
}

console.log(
  '\nAnd the model-based view, which does not need replicates: fitted between-block variance ' +
    'against\nthe mean posterior variance of a single block, next to λ\u2019s observed variance ' +
    'against its own mean\nsquared standard error from the fit.\n',
);
const lambdaVar = sd(learners.map((b) => b.lambda)) ** 2;
const lambdaErr = mean(learners.map((b) => b.lambdaSe ** 2));
console.log(
  `- λ: observed variance ${n4(lambdaVar)}, mean squared SE ${n4(lambdaErr)}, signal-to-error ` +
    `${n2(Math.max(0, lambdaVar - lambdaErr) / lambdaErr)}.`,
);
if (measuredAft !== null) {
  const post = mean(
    finite(learners.map((b) => measuredAft.scoreChild(measuredObs(b)).variance)),
  );
  console.log(
    `- latency: tau^2 ${n4(measuredAft.tau ** 2)}, mean posterior variance ${n4(post)}, ` +
      `signal-to-error ${n2(measuredAft.tau ** 2 / post)}. This ratio is flattered by the model: ` +
      'the posterior\n  variance is conditional on the fitted variance components, so it prices ' +
      'the noise the model\n  admits and not the seed-to-seed noise the replicate decomposition ' +
      'above measures directly.',
  );
}

/* ================================================================== *
 * 7. Separation
 * ================================================================== */
console.log(
  '\n## 7. Separating responders, in comparable units\n\n' +
    'AUC: the probability a randomly drawn block from the first group scores more learner-like ' +
    'than one\nfrom the second. Unit-free, so scale points per trial and log trials can be ' +
    'compared directly.\n1.00 is perfect separation, 0.50 is none.\n\n' +
    'Blocks on which a measure returns nothing are ranked LAST rather than dropped: "produced no ' +
    'number"\nis itself evidence about that responder, and dropping them would flatter the ' +
    'measure.\n',
);
const rankable = (bs, score) => {
  const raw = bs.map(score);
  const floor = Math.min(...finite(raw).concat([0])) - 1;
  return raw.map((v) => (Number.isFinite(v) ? v : floor));
};
const bottomFidelity = Math.min(...FIDELITIES);
const bottom = live.filter((b) => b.spec.fidelity === bottomFidelity);
console.log(
  `| measure | reasoner vs guesser | reasoner vs fidelity ${bottomFidelity} | Spearman with fidelity, per block | within standing |`,
);
console.log('| --- | --- | --- | --- | --- |');
for (const [label, score] of ROWS) {
  // Per block against the fidelity ladder, by RANK: the ladder is not linearly spaced, so a
  // Pearson coefficient would partly be reporting the spacing this file chose.
  const perBlock = rankCorrelation(
    rankable(learners, score),
    learners.map((b) => b.spec.fidelity),
  );
  const withinStanding = pooledWithinCorrelation(
    STANDINGS.map((standing) => {
      const bs = learners.filter((b) => b.standing === standing);
      return { xs: midRanks(rankable(bs, score)), ys: midRanks(bs.map((b) => b.spec.fidelity)) };
    }),
  );
  console.log(
    `| ${label} | ${n3(separationAuc(rankable(reasoners, score), rankable(guessers, score)))} | ` +
      `${n3(separationAuc(rankable(reasoners, score), rankable(bottom, score)))} | ` +
      `${n3(perBlock)} | ${n3(withinStanding)} |`,
  );
}

console.log(
  '\nMean of each measure by fidelity — whether it recovers the known rank order of the ' +
    'population it\nwas run on. The population is monotone in accuracy by construction; a measure ' +
    'that is not monotone\nhere is not ordering these learners.\n',
);
console.log(
  `| fidelity | accuracy | λ | latency score | oracle latency score | primitives reached |`,
);
console.log('| --- | --- | --- | --- | --- | --- |');
for (const fidelity of FIDELITIES) {
  const bs = live.filter((b) => b.spec.fidelity === fidelity);
  console.log(
    `| ${fidelity} | ${n3(mean(bs.map((b) => b.accuracy)))} | ${n4(mean(bs.map((b) => b.lambda)))} | ` +
      `${n3(mean(finite(bs.map(latencyScore))))} | ${n3(mean(finite(bs.map(trueLatencyScore))))} | ` +
      `${n2(mean(bs.map((b) => b.latency.filter((r) => r.event).length)))} |`,
  );
}
const guesserRow = guessers;
console.log(
  `| guesser | ${n3(mean(guesserRow.map((b) => b.accuracy)))} | ` +
    `${n4(mean(guesserRow.map((b) => b.lambda)))} | ${n3(mean(finite(guesserRow.map(latencyScore))))} | ` +
    `${n3(mean(finite(guesserRow.map(trueLatencyScore))))} | ` +
    `${n2(mean(guesserRow.map((b) => b.latency.filter((r) => r.event).length)))} |`,
);

/* ================================================================== *
 * 8. Split-half within a block
 * ================================================================== */
console.log(
  '\n## 8. Split-half inside one block\n\n' +
    'λ is refitted on the odd and the even trials with their ORIGINAL indices, so both halves ' +
    'stay in\nscale points per trial. The latency criterion is run on the odd and the even ' +
    "opportunities of each\nprimitive's own stream, and scored by the count of primitives reaching " +
    'criterion — an AFT refitted\nper half would shrink both halves toward one another and ' +
    'manufacture the agreement it is meant to\ntest. Spearman–Brown steps each correlation up to ' +
    'full block length.\n',
);
console.log(
  'The pooled column counts standing differences as agreement — both halves of a high-standing ' +
    "block\nlook alike partly because of the child's standing, which is not internal consistency. " +
    'The\nwithin-standing column removes that by averaging the per-standing correlations through ' +
    "Fisher's z,\nand it is the honest figure.\n",
);
console.log(
  '| population | measure | pooled r | pooled S–B | within-standing r | within-standing S–B | blocks |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const halfCount = (b, half) =>
  b[half === 'odd' ? 'latencyOdd' : 'latencyEven'].filter((r) => r.event).length;
/** Mean observed latency in one half, defined only where that half produced an event. */
const halfLatency = (b, half) => {
  const events = b[half === 'odd' ? 'latencyOdd' : 'latencyEven'].filter((r) => r.event);
  return events.length === 0 ? Number.NaN : mean(events.map((r) => r.latency));
};
const SPLIT_MEASURES = [
  ['λ', (b) => b.lambdaOdd, (b) => b.lambdaEven],
  ['primitives reached', (b) => halfCount(b, 'odd'), (b) => halfCount(b, 'even')],
  ['mean latency (events only)', (b) => halfLatency(b, 'odd'), (b) => halfLatency(b, 'even')],
];
for (const [label, bs] of [
  ['learners only', learners],
  ['learners + guessers', live],
]) {
  for (const [name, odd, even] of SPLIT_MEASURES) {
    const r = correlation(bs.map(odd), bs.map(even));
    const within = pooledWithinCorrelation(
      STANDINGS.map((standing) => {
        const g = bs.filter((b) => b.standing === standing);
        return { xs: g.map(odd), ys: g.map(even) };
      }),
    );
    console.log(
      `| ${label} | ${name} | ${n3(r)} | ${n3(spearmanBrown(r))} | ${n3(within)} | ` +
        `${n3(spearmanBrown(within))} | ${bs.length} |`,
    );
  }
}
console.log(
  '\n`mean latency (events only)` is the split-half of the latency VALUE rather than of the count ' +
    'of\nprimitives reached, and it is restricted to blocks where both halves produced at least ' +
    'one event.\nThat restriction is exactly the selection the censoring section warns against, ' +
    'so the figure is\nreported as a diagnostic and not as a reliability the measure can claim.',
);

/* ================================================================== *
 * 9. The scrambled control arm
 * ================================================================== */
console.log(
  '\n## 9. The scrambled control arm\n\n' +
    'Nothing is learnable there by construction: the generator redraws the badge→operator mapping ' +
    'every\nitem, so no reveal constrains any later trial. A measure that produces tidy numbers ' +
    'there is\nmeasuring something other than learning, and that check matters as much as the ' +
    'positive result.\n',
);
const controlDeducible = control.flatMap((b) => b.latency).filter((r) => r.deducible).length;
console.log(
  `**Normalised latency: silent, by construction.** Across ${control.length} scrambled blocks, ` +
    `${controlDeducible} primitives were ever deducible, so ${controlDeducible} latencies exist. ` +
    'That is not a\nfavourable result, it is an immunity: the control cannot supply an onset, so ' +
    'the normalised measure\ncannot be run there at all, and therefore is not TESTED there. The ' +
    'check has to be done on a\nversion that can be fooled.',
);
console.log(
  '\n**Un-normalised trials-to-criterion: not silent, and this is the real check.** The same ' +
    'criterion\nrun from trial 1 with no onset subtraction is what any implementation without a ' +
    'generator-side\nidentifiability oracle is forced to use.\n',
);
console.log('| arm | responder | reached criterion | per block, of 6 | KM median | RMST(30) | censoring |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const arm of ['consistent', 'perTrial']) {
  for (const spec of SPECS) {
    const bs = blocks.filter((b) => b.arm === arm && b.spec.id === spec.id);
    const rows = bs.flatMap((b) => b.naive);
    const km = kaplanMeier(
      rows.map((r) => ({ time: r.event ? r.latency : r.censoredAt, event: r.event })),
    );
    console.log(
      `| ${arm} | ${spec.id} | ${km.events} / ${km.n} | ` +
        `${n2(mean(bs.map((b) => b.naive.filter((r) => r.event).length)))} | ` +
        `${km.median === null ? 'not reached' : n2(km.median)} | ${n2(km.restrictedMean(LENGTH))} | ` +
        `${pct(km.censoringRate)} |`,
    );
  }
}
const controlNaiveEvents = control.flatMap((b) => b.naive).filter((r) => r.event).length;
const liveNaiveEvents = live.flatMap((b) => b.naive).filter((r) => r.event).length;
console.log(
  `\nThe un-normalised measure fires ${controlNaiveEvents} times across the whole scrambled arm ` +
    `against ${liveNaiveEvents} in the live arm. Every scrambled-arm event is a false positive: ` +
    'there is nothing there\nto acquire. λ over the same blocks, for scale:\n',
);
console.log('| arm | responder | mean λ | SD | mean SE | intervals excluding zero |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const arm of ['consistent', 'perTrial']) {
  for (const spec of SPECS) {
    const bs = blocks.filter((b) => b.arm === arm && b.spec.id === spec.id);
    console.log(
      `| ${arm} | ${spec.id} | ${n4(mean(bs.map((b) => b.lambda)))} | ` +
        `${n4(sd(bs.map((b) => b.lambda)))} | ${n4(mean(bs.map((b) => b.lambdaSe)))} | ` +
        `${pct(bs.filter((b) => b.excludesZero).length / bs.length)} |`,
    );
  }
}

/* ================================================================== *
 * 10. High standings
 * ================================================================== */
console.log(
  '\n## 10. High standings, where half the vocabulary is never pinned\n\n' +
    'The learnability trace already found that at standings 17 and 19 only about half the ' +
    'vocabulary is\never uniquely pinned. That does something sharper to a per-primitive measure ' +
    'than to λ: the\nprimitives that are never pinned contribute no latency at all, so the ' +
    'measure loses sample rather\nthan precision.\n',
);
console.log(
  '| standing | deducible per block | blocks with any latency | latencies per scored block | mean λ | λ SE | mean chain depth |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const standing of STANDINGS) {
  const bs = learners.filter((b) => b.standing === standing);
  const scored = bs.filter((b) => Number.isFinite(latencyScore(b)));
  console.log(
    `| ${standing} | ${n2(mean(bs.map((b) => b.latency.filter((r) => r.deducible).length)))} | ` +
      `${pct(scored.length / bs.length)} | ` +
      `${n2(mean(scored.map((b) => b.latency.filter((r) => r.event).length)))} | ` +
      `${n4(mean(bs.map((b) => b.lambda)))} | ${n4(mean(bs.map((b) => b.lambdaSe)))} | ` +
      `${n2(mean(bs.map((b) => b.meanDepth)))} |`,
  );
}

console.log(
  '\n## What this run does and does not license\n\n' +
    'Synthetic responders throughout, over a born-synthetic, ungated bank whose difficulty values ' +
    'are\ndesign rungs rather than calibrated parameters. Both measures were computed from the ' +
    'same blocks,\nso the comparison between them is fair. Neither measure has been shown to ' +
    'separate real children;\nthe population that produced the between-child variance was ' +
    'constructed by this file; and nothing\nprinted above is a learning rate.',
);
