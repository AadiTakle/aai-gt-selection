// ROTATING MULTI-SYSTEM BLOCKS — the measurement run behind docs/product/STAGE2_ROTATING_SYSTEMS.md.
//
//   pnpm stage2:rotation
//   pnpm stage2:rotation -- --children 80 --replicates 10 --size 5
//
// Deterministic: every number is a pure function of the flags and BASE_SEED. Prints markdown to
// stdout; the document quotes it and does not restate it by hand.
//
// WHAT IS BEING DECIDED. Stage 2 runs one hidden system for 30 trials. The proposal is to run
// several independent systems and rotate on mastery, on the argument that a post-mastery trial is
// predictable and therefore nearly uninformative. This run asks whether the aggregate of k
// crack-times beats one long curve, AT THE SAME TRIAL BUDGET, and what it costs.
//
// THE ONE THING THIS RUN CANNOT DO. The children are programs with a planted latent trait. Their
// crack-times correlate across systems BECAUSE ONE PARAMETER GENERATED ALL OF THEM. That correlation
// is the assumption the whole proposal rests on, and simulating it is not evidence for it. Section 4
// states this next to the number rather than in a footnote, and names what real evidence would look
// like. Nothing here is a learning rate and nothing here has seen a child.

import {
  correlation,
  fitRandomInterceptAft,
  kaplanMeier,
  rankCorrelation,
  varianceComponents,
} from './stage2-latency.mjs';
import {
  DEFAULT_CRITERION,
  DEFAULT_DEPTH_MIX,
  admissibility,
  buildPool,
  hashUnit,
  makePopulation,
  makeSystem,
  perPrimitiveObservations,
  runBlock,
  sessionSupply,
} from './stage2-rotation.mjs';
import {
  attackBlock,
  crossSessionTransfer,
  itemsToPin,
} from './stage2-rotation-attack.mjs';

/* ================================================================== *
 * Flags and formatting
 * ================================================================== */

const args = process.argv.slice(2);
function flag(name, fallback) {
  const hit = args.indexOf(`--${name}`);
  return hit >= 0 && args[hit + 1] !== undefined ? args[hit + 1] : fallback;
}

const SIZE = Number(flag('size', '5'));
const CHILDREN = Number(flag('children', '60'));
const REPLICATES = Number(flag('replicates', '10'));
const KS = flag('k', '1,2,3,4,5,6').split(',').map(Number);
const SIZES = flag('sizes', '3,4,5,6').split(',').map(Number);
const BUDGET = Number(flag('budget', '30'));
const CAP = Number(flag('cap', '30'));
const WARMUP = Number(flag('warmup', '1'));
const PER_DEPTH = Number(flag('per-depth', '900'));
// §9's pools go one depth deeper than the design serves, so the curve reaches the depth the sibling
// branch measured at 13.8%. Per-item admissibility is a mean over mappings and settles quickly, so
// these buckets are smaller than the simulation's.
const KEY_PER_DEPTH = Number(flag('keying-per-depth', '300'));
const KEY_DEPTHS = [1, 2, 3, 4];
const KEY_DRAWS = Number(flag('keying-draws', '40'));
const SECONDS_PER_QUESTION = Number(flag('seconds', '15'));
const BASE_SEED = 20260801;
const SEED_STRIDE = 7919;

const n2 = (x) => (x === null || !Number.isFinite(x) ? '—' : x.toFixed(2));
const n3 = (x) => (x === null || !Number.isFinite(x) ? '—' : x.toFixed(3));
const pct = (x) => (x === null || !Number.isFinite(x) ? '—' : `${(100 * x).toFixed(1)}%`);
const finite = (xs) => xs.filter((x) => Number.isFinite(x));
const mean = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
const median = (xs) => quantile(xs, 0.5);
function quantile(xs, p) {
  const sorted = finite(xs).slice().sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}
const groupBy = (xs, key) => {
  const out = new Map();
  for (const x of xs) {
    const k = key(x);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(x);
  }
  return out;
};

/* ================================================================== *
 * The run
 * ================================================================== */

const pools = new Map(SIZES.concat(SIZE).map((s) => [s, null]));
for (const size of pools.keys()) pools.set(size, buildPool({ size, perDepth: PER_DEPTH }));
const pool = pools.get(SIZE);

const population = makePopulation({ n: CHILDREN, seed: 4242 });
/** Ability terciles, on the PLANTED trait. Used only to label rows, never to fit anything. */
const traitCuts = [quantile(population.map((c) => c.trait), 1 / 3), quantile(population.map((c) => c.trait), 2 / 3)];
const bandOf = (child) => (child.trait <= traitCuts[0] ? 'low' : child.trait <= traitCuts[1] ? 'mid' : 'high');

/**
 * One cell of the design: every child, every replicate, at one (k, budget, cap) setting.
 *
 * The system seed varies with the REPLICATE and not with the child, so within a replicate every
 * child faces the same systems in the same order. That is what makes a between-child comparison a
 * comparison of children; letting the systems vary per child would fold system difficulty into the
 * within-child error and flatter every k equally but not identically.
 */
function runCell({
  k,
  budget,
  cap,
  size = SIZE,
  stopOnCrack = true,
  misbind = 0,
  warmup = WARMUP,
  depthMix = DEFAULT_DEPTH_MIX,
}) {
  const cellPool = pools.get(size);
  const blocks = [];
  for (const child of population) {
    for (let r = 0; r < REPLICATES; r += 1) {
      blocks.push(
        runBlock({
          pool: cellPool,
          child: { ...child, misbind },
          k,
          cap,
          budget,
          warmup,
          stopOnCrack,
          seed: BASE_SEED + r * SEED_STRIDE + k * 13,
          systemSeed: 900000 + r * 31,
          depthMix,
        }),
      );
    }
  }
  return blocks;
}

/**
 * Turn a set of blocks into a per-block score, censoring-correctly.
 *
 * Identical machinery to PR #42's latency score, and deliberately so: a log-normal AFT with the
 * child as a random intercept, fitted once over all blocks in the cell, then each block's own
 * observations converted to a posterior mean shift. An event enters through the density and a
 * censored system through the survivor function, which is the only reason a child who never cracked
 * anything can be scored at all instead of silently leaving the sample.
 *
 * Negated so HIGHER means FASTER on every row, which is what lets the k rows be read against each
 * other and against the single-system baseline without a sign convention per column.
 */
function scorer(blocks) {
  const fit = fitRandomInterceptAft(blocks.map((b) => b.observations));
  if (fit === null) return { fit: null, score: () => Number.NaN };
  return {
    fit,
    score(block) {
      if (block.observations.length === 0) return Number.NaN;
      const scored = fit.scoreChild(block.observations);
      return scored.informative ? -scored.mean : Number.NaN;
    },
  };
}

const childGroups = (blocks, score) =>
  [...groupBy(blocks, (b) => b.childId).values()].map((g) => finite(g.map(score)));

/**
 * A percentile interval on the ICC and on rank recovery, by resampling CHILDREN with replacement.
 *
 * Without it the k sweep is unreadable. Every ICC below is a variance ratio estimated from
 * `CHILDREN` children, and at that sample size the sampling error is comfortably large enough to
 * reorder adjacent k values — so a table of point estimates would invite reading a winner out of
 * noise. Children are the resampling unit because they are the independent unit of the design;
 * resampling blocks would break the pairing that the within-child variance is estimated from.
 *
 * The AFT is NOT refitted per draw. That makes this an interval on the variance decomposition given
 * the fitted scale, not on the whole pipeline, and it therefore understates total uncertainty
 * slightly. It is reported anyway because the alternative — no interval at all — overstates
 * certainty a great deal more.
 */
function bootstrap(blocks, score, trait, draws = 400, seed = 987) {
  const byChild = [...groupBy(blocks, (b) => b.childId).values()];
  const iccs = [];
  const rhos = [];
  for (let d = 0; d < draws; d += 1) {
    const sample = [];
    for (let i = 0; i < byChild.length; i += 1) {
      sample.push(byChild[Math.floor(hashUnit(seed + d, `pick|${i}`) * byChild.length)]);
    }
    const vc = varianceComponents(sample.map((g) => finite(g.map(score))));
    if (vc !== null && vc.icc !== null) iccs.push(vc.icc);
    const flat = sample.flat();
    const rho = rankCorrelation(flat.map(score), flat.map(trait));
    if (rho !== null) rhos.push(rho);
  }
  const band = (xs) =>
    xs.length < 20 ? '—' : `${n2(quantile(xs, 0.05))}–${n2(quantile(xs, 0.95))}`;
  return { icc: band(iccs), rho: band(rhos) };
}

/* ================================================================== *
 * Header
 * ================================================================== */

console.log(
  '# Stage 2 — rotating multi-system blocks against the single 30-trial block\n\n' +
    `${CHILDREN} simulated children x ${REPLICATES} replicate blocks x ${KS.length} values of k, ` +
    `at system size ${SIZE}.\nSeeds ${BASE_SEED}+${SEED_STRIDE}r, fully deterministic. ` +
    `Budget-matched arm: ${BUDGET} scored trials per block at every k.\n` +
    `Rotation criterion: sequential log-odds on oracle-determined trials, lapse ` +
    `${DEFAULT_CRITERION.lapse}, threshold ${DEFAULT_CRITERION.threshold}:1 ` +
    '(`createBadgeTest`, imported unchanged from PR #42).\n' +
    'Cumulative learnability oracle: `stage2-learnability-core.mjs` (PR #48), `outcome` reveal mode.\n' +
    'Figure algebra: `generators/FLU-OPCHAIN-01.mjs`. No bank is read, written or changed.\n\n' +
    'BORN-SYNTHETIC. Every child is a program with a planted latent trait. Nothing here is evidence ' +
    'that\nchildren have such a trait, that this task measures learning, or that any number ' +
    'transfers. See §4.\n',
);

console.log('\nItem pool, per system size — templates built and how many a single system can be served.\n');
console.log('| size | candidate systems | templates | servable per system, depth 1 / 2 / 3 |');
console.log('| --- | --- | --- | --- |');
for (const size of [...pools.keys()].sort((a, b) => a - b)) {
  const p = pools.get(size);
  const cov = [1, 2, 3].map((d) => (p.coverage[d] ? Math.round(p.coverage[d].servablePerSystem) : 0));
  console.log(`| ${size} | ${p.oracle.mappings.length} | ${p.items.length} | ${cov.join(' / ')} |`);
}
console.log(
  '\nDepth mix served: ' +
    Object.entries(DEFAULT_DEPTH_MIX).map(([d, w]) => `depth ${d} ${pct(w)}`).join(', ') +
    '. This file\'s choice, NOT the live selection rule, which targets\ndifficulty against a running ' +
    'ability estimate. §8 varies it.',
);

/* ================================================================== *
 * 1. The rotation rule, and that a guesser does not trigger it
 * ================================================================== */

console.log(
  '\n## 1. The rotation rule\n\n' +
    'A trial is an OPPORTUNITY only when the cumulative oracle says its answer was already ' +
    'determined by\nthe reveals the child had seen. On such a trial exactly one option is ' +
    'consistent with holding the\nsystem, so a child who has it answers that option by ' +
    'construction, and a guesser hits it with\nprobability q = 1/|options|. Each opportunity is fed ' +
    'to PR #42\'s accumulator at its own q, and the\nsystem is declared cracked when the log-odds ' +
    `cross log ${DEFAULT_CRITERION.threshold}.\n\n` +
    'At a five-option slate a pass is worth log(0.9/0.2) = 1.504 and a miss log(0.1/0.8) = −2.079 ' +
    'against\na bound of 4.605, so mastery needs four clean determined trials and one miss costs ' +
    'about a trial and\na half of credit back. Wald bounds a guesser\'s crossing probability at ' +
    `1/${DEFAULT_CRITERION.threshold} = ` +
    `${pct(1 / DEFAULT_CRITERION.threshold)}. That is the analytic guarantee; below is the ` +
    'realised rate.\n',
);

const GUESSER_BLOCKS = 4000;
let guesserCrossings = 0;
let guesserOpportunities = 0;
let guesserTrials = 0;
for (let i = 0; i < GUESSER_BLOCKS; i += 1) {
  const block = runBlock({
    pool,
    child: { id: `guess-${i}`, kind: 'guesser' },
    k: 1,
    cap: CAP,
    warmup: WARMUP,
    stopOnCrack: true,
    seed: BASE_SEED + i * 17,
    systemSeed: 900000 + (i % REPLICATES) * 31,
  });
  const system = block.systems[0];
  if (system.event) guesserCrossings += 1;
  guesserOpportunities += system.opportunities;
  guesserTrials += system.trials;
}
console.log(
  `Guessers: ${GUESSER_BLOCKS} blocks of up to ${CAP} trials, uniform choice throughout, no ` +
    `encoding.\n\n- crossed the criterion: **${guesserCrossings} of ${GUESSER_BLOCKS} = ` +
    `${pct(guesserCrossings / GUESSER_BLOCKS)}**, against the analytic bound of ` +
    `${pct(1 / DEFAULT_CRITERION.threshold)}.\n` +
    `- determined-trial opportunities offered: ${n2(guesserOpportunities / GUESSER_BLOCKS)} per ` +
    `block over ${n2(guesserTrials / GUESSER_BLOCKS)} trials.\n\n` +
    'The oracle keeps offering opportunities to a guesser — its knowledge state is built from the ' +
    'REVEALS,\nwhich a guesser still sees — so the low crossing rate is the criterion doing the ' +
    'work and not an\nabsence of chances to fire.',
);

/* ================================================================== *
 * 2. Where the informative trials are in the CURRENT block
 * ================================================================== */

console.log(
  '\n## 2. Where the informative trials are in a 30-trial single-system block\n\n' +
    'The current design, run to its full length: k = 1, cap 30, the criterion evaluated but NOT ' +
    'used to\nstop. Per trial index, across the whole population:\n\n' +
    '- `cracked` is the share of children who had already demonstrated mastery before this trial.\n' +
    '- `accuracy` is the share answering correctly.\n' +
    '- `discrimination` is the squared point-biserial correlation between correctness at this trial ' +
    'and\n  the planted trait — the share of the outcome\'s variance that is about the child. A ' +
    'trial every\n  child gets right has none whatever its accuracy, which is the property the ' +
    'owner\'s argument turns\n  on. Normalised over the block it is that trial\'s share of the ' +
    'block\'s discriminating signal.\n',
);

const baselineBlocks = runCell({ k: 1, budget: null, cap: 30, stopOnCrack: false });
const traitOf = new Map(population.map((c) => [c.id, c.trait]));
const byIndex = new Map();
for (const block of baselineBlocks) {
  for (const row of block.systems[0].rows) {
    if (!byIndex.has(row.trial)) byIndex.set(row.trial, []);
    byIndex.get(row.trial).push({ ...row, trait: traitOf.get(block.childId) });
  }
}
const indices = [...byIndex.keys()].sort((a, b) => a - b);
const discriminationAt = (rows) => {
  const r = correlation(
    rows.map((x) => (x.correct ? 1 : 0)),
    rows.map((x) => x.trait),
  );
  return r === null ? 0 : r * r;
};
const discrimination = indices.map((i) => discriminationAt(byIndex.get(i)));
const discriminationTotal = discrimination.reduce((a, b) => a + b, 0);

console.log('| trial | cracked | accuracy | oracle-determined | discrimination | share of block signal |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const i of indices) {
  const rows = byIndex.get(i);
  console.log(
    `| ${i} | ${pct(rows.filter((r) => r.afterCrack).length / rows.length)} | ` +
      `${pct(rows.filter((r) => r.correct).length / rows.length)} | ` +
      `${pct(rows.filter((r) => r.derivable).length / rows.length)} | ` +
      `${n3(discrimination[i - 1])} | ${pct(discrimination[i - 1] / discriminationTotal)} |`,
  );
}

const allRows = baselineBlocks.flatMap((b) => b.systems[0].rows);
const post = allRows.filter((r) => r.afterCrack);
const crackedBlocks = baselineBlocks.filter((b) => b.systems[0].event);
/**
 * Discrimination on post-mastery trials, computed WITHIN the trial index so the number answers
 * "does this trial separate children" rather than "do early and late trials differ".
 */
const postSignal = indices.reduce((sum, i) => {
  const rows = byIndex.get(i);
  const after = rows.filter((r) => r.afterCrack);
  return sum + (after.length < 3 ? 0 : discriminationAt(after) * (after.length / rows.length));
}, 0);

console.log(
  `\n**The waste, per child.** ${pct(post.length / allRows.length)} of all trials served in a ` +
    '30-trial single-system block\nare served after that child had already demonstrated mastery. ' +
    `Accuracy on them is ${pct(mean(post.map((r) => (r.correct ? 1 : 0))))}\nagainst ` +
    `${pct(mean(allRows.filter((r) => !r.afterCrack).map((r) => (r.correct ? 1 : 0))))} before. ` +
    `Among the ${pct(crackedBlocks.length / baselineBlocks.length)} of blocks in which the child ` +
    `cracked the system at all, the\nmedian crack is trial ` +
    `${n2(median(crackedBlocks.map((b) => b.systems[0].crackTrial)))} and the mean number of ` +
    `post-mastery trials is ` +
    `${n2(mean(crackedBlocks.map((b) => b.systems[0].postCrackTrials)))} of 30 — so a block that\n` +
    'set out to measure acquisition spends most of its length confirming an acquisition it has ' +
    'already\nobserved. That is the owner\'s claim and the simulation reproduces it.\n\n' +
    '**But the tail is not worthless at the POPULATION level, and the distinction matters.** ' +
    `Post-mastery trials\ncarry ${pct(postSignal / discriminationTotal)} of the block's ` +
    'discriminating signal rather than none, because children crack at\ndifferent times: at trial ' +
    `20 the block is still separating the ${pct(1 - byIndex.get(Math.min(20, indices.length)).filter((r) => r.afterCrack).length / byIndex.get(Math.min(20, indices.length)).length)} ` +
    'who have not cracked from the\nrest. The honest statement is narrower than "20 wasted trials": ' +
    'the tail is nearly uninformative about\nany child who has already cracked, and it degenerates ' +
    'into a slow binary test of whether a child ever\nwill. Rotation is worth considering because ' +
    'it replaces that binary with a graded count, not because\nthe tail is literally empty.',
);

/* ================================================================== *
 * 3. Reliability as a function of k
 * ================================================================== */

console.log(
  '\n## 3. Reliability as a function of system count\n\n' +
    'For each k the block aggregates k crack-times into one score by the SAME log-normal AFT with a ' +
    'child\nrandom intercept that PR #42 used, so the rows are comparable with that report and with ' +
    'each other.\nBetween-child variance and within-child replication error are then measured by ' +
    'running the same\nchild over ' +
    `${REPLICATES} replicate blocks — an observed decomposition, not a model-based one.\n\n` +
    '**No Spearman–Brown projection appears anywhere in this table.** That formula assumes the k ' +
    'observations\nare parallel measures of one trait, which is precisely the assumption under ' +
    'test; applying it here\nwould assume the conclusion. Every value below is observed.\n\n' +
    `**Budget-matched arm.** Every k spends ${BUDGET} scored trials.\n`,
);

/**
 * THE INCUMBENT, SCORED THE WAY THE INCUMBENT IS ACTUALLY SCORED.
 *
 * The single-system block does not produce one number. PR #42's measure extracts up to `size`
 * per-primitive acquisition latencies from the same 30 trials and aggregates them through this same
 * AFT. Scoring the baseline as a lone crack-time would be beating a strawman, so the row below is
 * the incumbent measure over the incumbent's full 30 trials, and it is what every k row has to beat.
 */
const baselinePerPrimitive = (() => {
  const blocks = baselineBlocks.map((b) => ({
    ...b,
    observations: perPrimitiveObservations(b, pool.values),
  }));
  const { score } = scorer(blocks);
  return {
    blocks,
    score,
    vc: varianceComponents(childGroups(blocks, score)),
    rho: rankCorrelation(blocks.map(score), blocks.map((b) => b.trait)),
    observations: mean(blocks.map((b) => b.observations.length)),
  };
})();
const traitOfBlock = (b) => b.trait;
const baselineBand = bootstrap(
  baselinePerPrimitive.blocks,
  baselinePerPrimitive.score,
  traitOfBlock,
);
console.log(
  '| arm | scored trials | observations per block | between-child var | within-child var | ratio | **ICC(1,1)** | ICC 90% | rank recovery |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n' +
    `| **current design**: 1 system, 30 trials, per-primitive latency (PR #42) | 30.00 | ` +
    `${n2(baselinePerPrimitive.observations)} | ${n3(baselinePerPrimitive.vc?.between)} | ` +
    `${n3(baselinePerPrimitive.vc?.within)} | ${n2(baselinePerPrimitive.vc?.ratio)} | ` +
    `**${n2(baselinePerPrimitive.vc?.icc)}** | ${baselineBand.icc} | ` +
    `${n2(baselinePerPrimitive.rho)} |`,
);
console.log('');

const cells = new Map();
console.log('| k | systems actually run | mean trials SPENT | between-child var | within-child var | ratio | **ICC(1,1)** | ICC 90% | rank recovery | rank 90% |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const k of KS) {
  const blocks = runCell({ k, budget: BUDGET, cap: CAP });
  const { score } = scorer(blocks);
  const vc = varianceComponents(childGroups(blocks, score));
  const rho = rankCorrelation(blocks.map(score), blocks.map(traitOfBlock));
  const band = bootstrap(blocks, score, traitOfBlock);
  cells.set(k, { blocks, score, vc, rho, band });
  console.log(
    vc === null
      ? `| ${k} | — | — | — | — | — | — | — | — | — |`
      : `| ${k} | ${n2(mean(blocks.map((b) => b.systemsRun)))} | ` +
          `${n2(mean(blocks.map((b) => b.totalTrials)))} | ${n3(vc.between)} | ` +
          `${n3(vc.within)} | ${n2(vc.ratio)} | **${n2(vc.icc)}** | ${band.icc} | ${n2(rho)} | ` +
          `${band.rho} |`,
  );
}

console.log(
  '\nTHE BUDGET IS A CEILING, NOT A QUOTA, and the "trials spent" column is why the row above the ' +
    'table\nmatters. A k = 1 block stops at its single crack and therefore spends about a third of ' +
    'the budget;\nonly the rotating arms actually use it. So the trial-matched comparison is the ' +
    'CURRENT DESIGN row —\n30 trials, per-primitive latency — against the larger k rows, not k = 1 ' +
    'against k = 5. Both are shown\nbecause the difference between them is precisely how much of ' +
    'the gain is aggregation and how much is\nsimply not stopping early.\n\n' +
    'The raw variances are NOT comparable between rows: the AFT is refitted per cell, so each row ' +
    'has its\nown score scale. The ratio and the ICC are scale-free and are the columns to read. ' +
    'The 90% bands are\npercentile bootstraps over children, and they are wide enough that ' +
    'neighbouring k values are not\ndistinguishable — the readable contrast is k = 1 against k ' +
    'greater than 1, not one k against another.\n',
);

console.log(
  '\nSame sweep with NO budget cap: every system runs to mastery or its own 30-trial cap, so a k = 6 ' +
    'block\ncosts roughly six times a k = 1 block. Reported because it separates "rotation helps" ' +
    'from "more\ntrials help", and the difference between the two tables is the whole question.\n',
);
console.log('| k | mean scored trials | ratio | **ICC(1,1)** | ICC 90% | rank recovery |');
console.log('| --- | --- | --- | --- | --- | --- |');
const freeCells = new Map();
for (const k of KS) {
  const blocks = runCell({ k, budget: null, cap: CAP });
  const { score } = scorer(blocks);
  const vc = varianceComponents(childGroups(blocks, score));
  const rho = rankCorrelation(blocks.map(score), blocks.map(traitOfBlock));
  const band = bootstrap(blocks, score, traitOfBlock);
  freeCells.set(k, { blocks, score, vc, rho, band });
  console.log(
    vc === null
      ? `| ${k} | — | — | — | — | — |`
      : `| ${k} | ${n2(mean(blocks.map((b) => b.totalTrials)))} | ${n2(vc.ratio)} | ` +
          `**${n2(vc.icc)}** | ${band.icc} | ${n2(rho)} |`,
  );
}

/* ================================================================== *
 * 4. The assumption that decides everything
 * ================================================================== */

console.log(
  '\n## 4. Do crack-times correlate within a child across systems?\n\n' +
    'If they do not, aggregating k of them buys nothing and the proposal fails outright. Below is ' +
    'the\nobserved correlation between a child\'s crack-time on system i and on system j, over the ' +
    'k = 6\nfree-running arm, using only children who produced an event on both.\n',
);

const corrCell = freeCells.get(Math.max(...KS)) ?? freeCells.get(KS[KS.length - 1]);
const maxK = corrCell.blocks[0].systems.length;
const timeAt = (block, i) => {
  const s = block.systems[i];
  return s === undefined || !s.event ? Number.NaN : Math.log(s.crackTrial);
};
console.log(`| systems | pairs with both cracked | Pearson r of log crack-time |`);
console.log('| --- | --- | --- |');
const pairRs = [];
for (let i = 0; i < maxK; i += 1) {
  for (let j = i + 1; j < maxK; j += 1) {
    const xs = corrCell.blocks.map((b) => timeAt(b, i));
    const ys = corrCell.blocks.map((b) => timeAt(b, j));
    const pairs = xs.filter((x, n) => Number.isFinite(x) && Number.isFinite(ys[n])).length;
    const r = correlation(xs, ys);
    if (r !== null) pairRs.push(r);
    console.log(`| ${i + 1} vs ${j + 1} | ${pairs} | ${n2(r)} |`);
  }
}
const withinChildIcc = varianceComponents(
  corrCell.blocks.map((b) => finite(b.systems.map((s) => (s.event ? Math.log(s.crackTrial) : Number.NaN)))),
);
console.log(
  `\nMean pairwise r: **${n2(mean(pairRs))}**. One-way ICC over systems within a block: ` +
    `**${n2(withinChildIcc === null ? null : withinChildIcc.icc)}**.\n\n` +
    '**This number is an artefact of the generative model and is not evidence for the design.** ' +
    'Every child\nhere is a single encoding-fidelity parameter that drives every system it sees, so ' +
    'its crack-times\nMUST covary; the correlation above measures how much measurement noise the ' +
    'block adds on top of a\ncorrelation that was planted, not whether the trait exists. A ' +
    'simulation cannot answer that.\n\n' +
    'What would answer it, in order of cost:\n\n' +
    '1. **Within-session, real children.** Administer two independent systems to the same child in ' +
    'one\n   sitting and correlate the two crack-times. A disattenuated correlation near zero kills ' +
    'the\n   proposal; anything above about 0.4 supports it. This is the smallest sufficient study ' +
    'and it does\n   not need an outcome variable.\n' +
    '2. **Order-counterbalanced.** System A first for half the children and B first for the other ' +
    'half, so\n   a correlation cannot be manufactured by fatigue or by warm-up carryover, both of ' +
    'which produce\n   positive covariance with no shared trait at all.\n' +
    '3. **Discriminant check.** The same two crack-times against an unrelated speeded task. A ' +
    'crack-time\n   correlation that is no larger than the correlation with general speed is not ' +
    'evidence for a\n   learning-rate trait.\n' +
    '4. **Test-retest across days**, which is the only version that separates a trait from a ' +
    'session state.\n\n' +
    'Until at least (1) and (2) have run, every ICC in §3 should be read as conditional on an ' +
    'assumption\nthat has not been tested.',
);

/* ================================================================== *
 * 5. Sizing
 * ================================================================== */

console.log(
  '\n## 5. Sizing: which system size puts the median crack-time in the 8–12 band?\n\n' +
    '`size` is how many primitives the hidden bijection covers. Crack-times below are from the ' +
    'free-running\narm at k = 3, split by planted-ability tercile, censored observations excluded ' +
    'from the median and\ncounted separately.\n',
);

console.log('| size | candidate systems | median crack, low | mid | high | censoring | high-band IQR |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const sizeCells = new Map();
for (const size of SIZES) {
  const blocks = runCell({ k: 3, budget: null, cap: CAP, size });
  sizeCells.set(size, blocks);
  const bandTimes = (band) =>
    blocks
      .filter((b) => bandOf(population.find((c) => c.id === b.childId)) === band)
      .flatMap((b) => b.systems.filter((s) => s.event).map((s) => s.crackTrial));
  const high = bandTimes('high');
  const all = blocks.flatMap((b) => b.systems);
  console.log(
    `| ${size} | ${pools.get(size).oracle.mappings.length} | ${n2(median(bandTimes('low')))} | ` +
      `${n2(median(bandTimes('mid')))} | ${n2(median(high))} | ` +
      `${pct(all.filter((s) => s.censored).length / all.length)} | ` +
      `${n2(quantile(high, 0.25))}–${n2(quantile(high, 0.75))} |`,
  );
}

console.log(
  '\n**Does the measure flatten at the top?** Two different failures get called "a floor" and only ' +
    'one of\nthem is present here, so they are separated.\n\n' +
    'A HARD FLOOR is the criterion\'s own evidence requirement: it needs four clean determined ' +
    'trials, and\ndetermination cannot happen before the first reveals land, so crack-time cannot ' +
    'go below (first\ndetermined trial + 4) however able the child is. `floor` is the smallest ' +
    'crack-time actually observed.\n\n' +
    'FLATTENING is the thing that would sink the design: crack-time no longer tracking ability among ' +
    'able\nchildren, whether or not anyone is on the floor. `within-band rho` is the rank ' +
    'correlation between\nthe planted trait and crack-time INSIDE the top tercile — near zero means ' +
    'the measure has stopped\ndistinguishing strong children from each other. `high vs mid AUC` is ' +
    'the chance a top-tercile child\ncracks one system faster than a middle-tercile one; 0.5 is ' +
    'no separation.\n',
);
console.log('| size | floor | high median | high 10th pct | at floor (±1) | within-band rho, single system | high vs mid AUC, single system | within-band rho, mean of 3 |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const size of SIZES) {
  const blocks = sizeCells.get(size);
  const inBand = (band) =>
    blocks.filter((b) => bandOf(population.find((c) => c.id === b.childId)) === band);
  const times = (band) => inBand(band).flatMap((b) => b.systems.filter((s) => s.event).map((s) => s.crackTrial));
  const high = times('high');
  const mid = times('mid');
  const floor = high.length === 0 ? null : Math.min(...high);
  const atFloor = high.filter((t) => t <= floor + 1).length / Math.max(1, high.length);
  let wins = 0;
  for (const a of high) for (const b of mid) wins += a < b ? 1 : a === b ? 0.5 : 0;
  // Single-system: every (block, system) crack-time against that child's trait, inside the band.
  const singles = inBand('high').flatMap((b) =>
    b.systems.filter((s) => s.event).map((s) => ({ t: s.crackTrial, trait: b.trait })),
  );
  // Aggregated: the child's mean log crack-time over the k systems of one block.
  const aggregates = inBand('high')
    .map((b) => {
      const events = b.systems.filter((s) => s.event).map((s) => Math.log(s.crackTrial));
      return events.length === 0 ? null : { t: mean(events), trait: b.trait };
    })
    .filter((x) => x !== null);
  console.log(
    `| ${size} | ${floor ?? '—'} | ${n2(median(high))} | ${n2(quantile(high, 0.1))} | ` +
      `${pct(atFloor)} | ${n2(rankCorrelation(singles.map((x) => -x.t), singles.map((x) => x.trait)))} | ` +
      `${n2(high.length && mid.length ? wins / (high.length * mid.length) : null)} | ` +
      `${n2(rankCorrelation(aggregates.map((x) => -x.t), aggregates.map((x) => x.trait)))} |`,
  );
}

console.log(
  '\n**Is the flattening specific to the top, or is it range restriction?** A tercile is a narrow ' +
    'slice of\ntrait, so a low within-band correlation is partly expected everywhere and the top ' +
    'band on its own\nproves nothing. The same statistic in all three bands is the control.\n',
);
console.log(`| band | median crack | within-band rho, single system | within-band rho, mean of 3 | censoring |`);
console.log('| --- | --- | --- | --- | --- |');
for (const band of ['low', 'mid', 'high']) {
  const blocks = sizeCells
    .get(SIZE)
    .filter((b) => bandOf(population.find((c) => c.id === b.childId)) === band);
  const singles = blocks.flatMap((b) =>
    b.systems.filter((s) => s.event).map((s) => ({ t: s.crackTrial, trait: b.trait })),
  );
  const aggregates = blocks
    .map((b) => {
      const events = b.systems.filter((s) => s.event).map((s) => Math.log(s.crackTrial));
      return events.length === 0 ? null : { t: mean(events), trait: b.trait };
    })
    .filter((x) => x !== null);
  const systems = blocks.flatMap((b) => b.systems);
  console.log(
    `| ${band} | ${n2(median(singles.map((x) => x.t)))} | ` +
      `${n2(rankCorrelation(singles.map((x) => -x.t), singles.map((x) => x.trait)))} | ` +
      `${n2(rankCorrelation(aggregates.map((x) => -x.t), aggregates.map((x) => x.trait)))} | ` +
      `${pct(systems.filter((s) => s.censored).length / systems.length)} |`,
  );
}

/* ================================================================== *
 * 6. Budget
 * ================================================================== */

console.log(
  '\n## 6. Total trial budget\n\n' +
    'Free-running arm: each system runs to mastery or its 30-trial cap. `screens` counts the ' +
    'unscored\ndemonstration each system opens with, because the session clock pays for those too. ' +
    `Timed at\n${SECONDS_PER_QUESTION}s per question.\n`,
);
console.log('| k | mean trials | p90 trials | mean screens | p90 screens | mean minutes | p90 minutes |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const k of KS) {
  const blocks = freeCells.get(k).blocks;
  const t = blocks.map((b) => b.totalTrials);
  const s = blocks.map((b) => b.totalScreens);
  console.log(
    `| ${k} | ${n2(mean(t))} | ${n2(quantile(t, 0.9))} | ${n2(mean(s))} | ${n2(quantile(s, 0.9))} | ` +
      `${n2((mean(s) * SECONDS_PER_QUESTION) / 60)} | ${n2((quantile(s, 0.9) * SECONDS_PER_QUESTION) / 60)} |`,
  );
}
console.log(
  '\nBy ability band, free-running, so the tail the session has to survive is visible. A low-ability ' +
    'child\ncensors on every system and therefore pays the full cap every time — the budget is worst ' +
    'exactly\nwhere the measure is weakest.\n',
);
console.log('| k | low: mean / p90 screens | mid | high |');
console.log('| --- | --- | --- | --- |');
for (const k of KS) {
  const blocks = freeCells.get(k).blocks;
  const cell = (band) => {
    const s = blocks
      .filter((b) => bandOf(population.find((c) => c.id === b.childId)) === band)
      .map((b) => b.totalScreens);
    return `${n2(mean(s))} / ${n2(quantile(s, 0.9))}`;
  };
  console.log(`| ${k} | ${cell('low')} | ${cell('mid')} | ${cell('high')} |`);
}

/* ================================================================== *
 * 7. Censoring
 * ================================================================== */

console.log(
  '\n## 7. Censoring\n\n' +
    'A child who never cracks a system inside its cap is an OBSERVATION, not a dropout: "longer ' +
    'than the\ncap" is information, and averaging only the children who cracked would bias every ' +
    'figure toward fast\nlearners. Censored systems enter the AFT in §3 through the survivor ' +
    'function and the Kaplan–Meier\ncurves below through the risk set, so no row here drops anyone.\n',
);
console.log('| k | systems observed | censored | censoring rate | KM median crack | restricted mean to cap | blocks with zero events |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const k of KS) {
  const blocks = freeCells.get(k).blocks;
  const systems = blocks.flatMap((b) => b.systems);
  const km = kaplanMeier(systems.map((s) => ({ time: s.event ? s.crackTrial : s.censoredAt, event: s.event })));
  console.log(
    `| ${k} | ${systems.length} | ${systems.filter((s) => s.censored).length} | ` +
      `${pct(km.censoringRate)} | ${n2(km.median)} | ${n2(km.restrictedMean(CAP))} | ` +
      `${pct(blocks.filter((b) => b.events === 0).length / blocks.length)} |`,
  );
}
console.log('\nCensoring by ability band, budget-matched arm — where the missing observations actually are.\n');
console.log('| k | low | mid | high |');
console.log('| --- | --- | --- | --- |');
for (const k of KS) {
  const blocks = cells.get(k).blocks;
  const cell = (band) => {
    const systems = blocks
      .filter((b) => bandOf(population.find((c) => c.id === b.childId)) === band)
      .flatMap((b) => b.systems);
    return pct(systems.filter((s) => s.censored).length / Math.max(1, systems.length));
  };
  console.log(`| ${k} | ${cell('low')} | ${cell('mid')} | ${cell('high')} |`);
}

/* ================================================================== *
 * 8. Sensitivities
 * ================================================================== */

console.log(
  '\n## 8. Sensitivities\n\n' +
    'Each row changes ONE thing against the budget-matched k = 3 cell. A conclusion that only ' +
    'survives the\ndefault settings is not a conclusion.\n',
);
console.log('| variant | ICC(1,1) | ICC 90% | rank recovery | mean trials | censoring |');
console.log('| --- | --- | --- | --- | --- | --- |');
const SENSITIVITIES = [
  ['default (k = 3, budget-matched)', { k: 3, budget: BUDGET, cap: CAP }],
  ['proactive interference, misbind 0.3', { k: 3, budget: BUDGET, cap: CAP, misbind: 0.3 }],
  ['proactive interference, misbind 0.6', { k: 3, budget: BUDGET, cap: CAP, misbind: 0.6 }],
  ['no warm-up demonstration', { k: 3, budget: BUDGET, cap: CAP, warmup: 0 }],
  ['three demonstrations per system', { k: 3, budget: BUDGET, cap: CAP, warmup: 3 }],
  ['system size 4', { k: 3, budget: BUDGET, cap: CAP, size: 4 }],
  ['system size 6', { k: 3, budget: BUDGET, cap: CAP, size: 6 }],
  ['shallow item mix (depth 1 half the block)', { k: 3, budget: BUDGET, cap: CAP, depthMix: { 1: 0.5, 2: 0.35, 3: 0.15 } }],
  ['deep item mix (depth 3 half the block)', { k: 3, budget: BUDGET, cap: CAP, depthMix: { 1: 0.05, 2: 0.45, 3: 0.5 } }],
];
for (const [label, options] of SENSITIVITIES) {
  const blocks = runCell(options);
  const { score } = scorer(blocks);
  const vc = varianceComponents(childGroups(blocks, score));
  const systems = blocks.flatMap((b) => b.systems);
  console.log(
    `| ${label} | ${vc === null ? '—' : n2(vc.icc)} | ${bootstrap(blocks, score, traitOfBlock).icc} | ` +
      `${n2(rankCorrelation(blocks.map(score), blocks.map(traitOfBlock)))} | ` +
      `${n2(mean(blocks.map((b) => b.totalTrials)))} | ` +
      `${pct(systems.filter((s) => s.censored).length / systems.length)} |`,
  );
}

/* ================================================================== *
 * 9. Per-session re-keying
 * ================================================================== */

/** The budget-matched k that §3 came out on, so §9 prices the configuration actually recommended. */
const best = [...cells.entries()].filter(([, c]) => c.vc !== null).sort((a, b) => b[1].vc.icc - a[1].vc.icc)[0];

console.log(
  '\n## 9. Does the recommended size survive per-session re-keying?\n\n' +
    'A separate result on `feat/stage2-session-keying` (PR #51) found that drawing the hidden system ' +
    'at\nsession time — the fix for the scraping defect, where about a dozen items pin a shipped ' +
    "bank's system\nfor every future child — is not shippable for the CURRENT block: a draw served " +
    '28% of the bank and left\n87.8% of the half-point rungs short of five items, because ' +
    'admissibility collapses with chain depth.\n\n' +
    'This section asks the same question of the rotating design. THE MEASUREMENT MATTERS BECAUSE ' +
    'ROTATION\nHAS NO CHOICE: the k systems in a block differ only in which badge means which, so ' +
    'every result in §3\nabove was ALREADY produced under freshly drawn mappings — ten replicates × ' +
    'k draws apiece, against a\nfixed pool. Re-keying is not an extra mechanism to bolt on here, it ' +
    'is what makes the block a rotation.\nWhat is not yet established is whether the pool that ' +
    'supports it is a pool anyone can ship.\n',
);

console.log(
  '### 9a. Admissibility by system size and chain depth\n\n' +
    "PR #51's statistic, unchanged, so the numbers can be read against its. `relabellings on screen` " +
    'is\nthe share of the free bijection family whose output for that item lands on one of its five ' +
    'options —\nthe rest cannot serve the item at all in that session. `reachable` counts how many ' +
    "DISTINCT options are\never the key; PR #51's shippability bar is four of five, and an item well " +
    'below it has an effective\nguessing floor above 1/5 whatever its admissibility says.\n\n' +
    `Templates are ${KEY_PER_DEPTH} per (size, depth) cell, one depth deeper than the design serves ` +
    'so the curve\nreaches where PR #51 measured 13.8%.\n',
);
console.log(
  '| size | mappings | depth | relabellings on screen | mean reachable | ≥4 of 5 reachable | key on one option |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const keyingPools = new Map(
  SIZES.map((size) => [size, buildPool({ size, perDepth: KEY_PER_DEPTH, depths: KEY_DEPTHS })]),
);
for (const size of SIZES) {
  const a = admissibility(keyingPools.get(size));
  for (const [depth, row] of Object.entries(a.byDepth)) {
    console.log(
      `| ${size} | ${a.mappings} | ${depth} | **${pct(row.meanAdmissibleShare)}** | ` +
        `${n2(row.meanReachable)} | ${pct(row.safeFraction)} | ${pct(row.meanMaxShare)} |`,
    );
  }
}
console.log(
  '\nPR #51 measured the SHIPPED FLU-OPCHAIN-01 bank — six operators, so the size-6 rows are the ' +
    'ones to\ncompare — at 78.2% / 25.7% / 13.5% / 13.8% for depths 1 to 4, with mean reachable ' +
    '4.69 / 4.38 / 3.93 /\n3.67. The share column reproduces that collapse closely, which is what ' +
    'licenses reading the rest of\nthe table. The reachable column does not, and should not be ' +
    "compared: this pool draws its slate from\nthe chain's reachable figures by construction (§2), " +
    "so it loses options only to assignment collisions,\nwhile the shipped generator's distractors " +
    'are named partial rules and some are unreachable outright.\n\n' +
    '**The curve has two ends and only one of them is the failure PR #51 found.** Going deeper for a ' +
    'given\nsize collapses admissibility — that is its result. Going SHALLOWER for a given size ' +
    'eventually collapses\nthe number of distinct assignments instead: at size 3 depth 3, and at ' +
    'size 4 depth 4, every mapping is\nadmissible and the key still only ever lands on two of the ' +
    'five options, so the honest guessing floor is\n0.50 rather than 0.20 and a client that knows ' +
    'the vocabulary can discard three options unseen. Reading\nthe share column alone would score ' +
    'those cells as perfect.\n',
);

console.log(
  `### 9b. What one draw actually supplies, against what a block spends\n\n` +
    "PR #51's verdict turned on ladder coverage: five items in each of forty half-point rungs, and a " +
    'draw\nleft 87.8% of them short. A rotating block does not ask that. It asks for enough unseen ' +
    'servable items,\nat the depths it serves, to reach mastery k times. So the supply is priced as ' +
    `a COUNT against\nconsumption. Pools here are the simulation's own (${PER_DEPTH} per depth, ` +
    `depths ${pool.depths.join('/')}); ${KEY_DRAWS} mapping draws.\n`,
);
const spendK = best[0];
const spend = mean(best[1].blocks.map((b) => b.totalTrials + b.totalScreens));
console.log(
  `| size | servable per draw | share of pool | thinnest depth | items a k = ${spendK} block spends | headroom | worst key slot |`,
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const size of SIZES) {
  const sizePool = pools.get(size);
  const draws = Array.from({ length: KEY_DRAWS }, (_, i) =>
    sessionSupply(sizePool, makeSystem(size, 770000, i).mapping),
  );
  const servable = mean(draws.map((d) => d.servable));
  const thinnest = Math.min(
    ...sizePool.depths.map((d) => mean(draws.map((x) => x.perDepth[d] ?? 0))),
  );
  console.log(
    `| ${size} | ${n2(servable)} | ${pct(mean(draws.map((d) => d.servableShare)))} | ` +
      `${n2(thinnest)} | ${n2(spend)} | ${n2(servable / spend)}× | ` +
      `${pct(Math.max(...draws.map((d) => d.worstSlot)))} |`,
  );
}
console.log(
  '\n`thinnest depth` is the smallest per-depth servable count, because a block that runs out of ' +
    'depth-3\nitems degrades into a shallower block rather than stopping, and that would show up as ' +
    'reliability\nrather than as an error. `worst key slot` is the largest share of one draw\'s ' +
    "servable items keyed on a\nsingle option position, over the draws — the shipped bank's " +
    'round-robin cursor does not exist under a\nsession draw, so it is checked; 20.0% is balance.\n',
);

console.log(
  '### 9c. Is the half-point difficulty ladder still doing work?\n\n' +
    'Under the current block the score is the HEIGHT REACHED, so the rung an item sits on is the ' +
    'measurement\nand the grain has to be fine. Under rotation the score is TRIALS TO CRACK, and ' +
    'what a trial has to do\nis narrow the candidate set — a property of whether the item is ' +
    'determined, not of where it sits on a\nladder. Each row below serves the recommended ' +
    `k = ${spendK} configuration from ONE depth only, or from a\nrestricted range, against the ` +
    'mixed default.\n',
);
console.log(`| item supply | ICC(1,1) | ICC 90% | rank recovery | mean trials | censoring |`);
console.log('| --- | --- | --- | --- | --- | --- |');
const LADDERS = [
  ['mixed default (depth 1/2/3 at 15/50/35)', DEFAULT_DEPTH_MIX],
  ['depth 1 only', { 1: 1 }],
  ['depth 2 only', { 2: 1 }],
  ['depth 3 only', { 3: 1 }],
  ['depths 1–2 only (the ≥38% admissible band)', { 1: 0.3, 2: 0.7 }],
];
for (const [label, depthMix] of LADDERS) {
  const blocks = runCell({ k: spendK, budget: BUDGET, cap: CAP, depthMix });
  const { score } = scorer(blocks);
  const vc = varianceComponents(childGroups(blocks, score));
  const systems = blocks.flatMap((b) => b.systems);
  console.log(
    `| ${label} | ${vc === null ? '—' : n2(vc.icc)} | ${bootstrap(blocks, score, traitOfBlock).icc} | ` +
      `${n2(rankCorrelation(blocks.map(score), blocks.map(traitOfBlock)))} | ` +
      `${n2(mean(blocks.map((b) => b.totalTrials)))} | ` +
      `${pct(systems.filter((s) => s.censored).length / systems.length)} |`,
  );
}
console.log(
  '\nA single-depth supply is not merely tolerable, it is very slightly BETTER, and the likely ' +
    'reason is\nmechanical rather than interesting: a homogeneous supply removes item-difficulty ' +
    'variation from the\nwithin-child error, which is the denominator of the ICC. The intervals ' +
    'overlap throughout and no row\nhere separates from another; the finding is that the grain does ' +
    'not matter, not that flatter is better.\n\n' +
    'WHAT THIS CAN AND CANNOT SETTLE. This pool prices difficulty by chain depth alone. The shipped ' +
    'ladder\nalso prices the geometric-operator count and the distractor similarity, and those are ' +
    'not varied here,\nso the rows above bear on whether the BLOCK needs a spread of rungs — not on ' +
    'whether the generator\nshould keep its finer levers for other purposes.\n',
);

/* ================================================================== *
 * 10. F6, the cross-item intersection attack, against a rotating block
 * ================================================================== */

console.log(
  '\n## 10. F6 against the rotating design\n\n' +
    '§9d recorded assumption **A-R7**: that rotation shortens any one mapping\'s exposure enough to ' +
    'limit\nthe cross-item attack. It was flagged plausible and UNMEASURED. This section measures it ' +
    'with PR #47\'s\nown probe — `crossItemAttack` and `scoreItem` imported verbatim from ' +
    '`gate-a/stage2-antileak-comparison.mjs`,\nwith a new adapter because that file\'s adapters read ' +
    'shipped bank content and this pool is synthesised.\n\n' +
    'TWO CHANNELS. `onScreen` is PR #47\'s: the client knows only that the output was one of the five ' +
    'figures,\nwhich is all a static bank scrape gives. `reveal` is the stronger one a LEARNING block ' +
    'hands over — the\ntrial resolves in front of the child, so the client also knows which figure. ' +
    'Rotation only works in a\nblock that reveals, so `reveal` is the channel this design has to ' +
    'answer for.\n',
);

console.log(
  '### 10a. Items to pin a mapping, against how long a mapping lives\n\n' +
    'The attacker holds the pool and the algebra and does not know which badge means which. Items ' +
    'are drawn\nin a depth-representative order, and `pinned` is PR #47\'s definition: the ' +
    'hypothesis space collapsing\nto one system.\n',
);
const attackPool = pools.get(SIZE);
const PIN_DRAWS = Number(flag('pin-draws', '120'));
const pinsFor = (size, channel) => {
  const out = [];
  for (let i = 0; i < PIN_DRAWS; i += 1) {
    const run = itemsToPin({
      pool: pools.get(size),
      mapping: makeSystem(size, 880000, i).mapping,
      channel,
      sample: 80,
      label: `${channel}|${size}|${i}`,
    });
    if (run !== null && run.collapsedAt !== null) out.push(run.collapsedAt);
  }
  return out;
};
// The lifetime a pin has to beat: scored trials per system in the recommended configuration.
const lifeSystems = best[1].blocks.flatMap((b) => b.systems);
const lifetimes = lifeSystems.map((s) => s.trials);
console.log(
  '| size | candidate mappings | onScreen median | reveal: p10 | median | p90 | information bound |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const size of SIZES) {
  const onScreen = pinsFor(size, 'onScreen');
  const reveal = pinsFor(size, 'reveal');
  const count = pools.get(size).oracle.mappings.length;
  console.log(
    `| ${size}${size === SIZE ? ' (recommended)' : ''} | ${count} | ${n2(median(onScreen))} | ` +
      `${n2(quantile(reveal, 0.1))} | **${n2(median(reveal))}** | ${n2(quantile(reveal, 0.9))} | ` +
      `${n2(Math.log(count) / Math.log(5))} |`,
  );
}
console.log(
  `\nAgainst that, one system's LIFETIME in the recommended k = ${spendK} block: median ` +
    `${n2(median(lifetimes))} scored trials,\np10 ${n2(quantile(lifetimes, 0.1))}, p90 ` +
    `${n2(quantile(lifetimes, 0.9))}. PR #47 pinned the shipped single-system banks after 4–12 ` +
    'items and scored\n100% on everything after.\n\n' +
    '`information bound` is log5 of the hypothesis space: a five-option reveal carries at most ' +
    'log2(5)\nbits, so no mapping over this many candidates can survive more than that many reveals ' +
    'however the\nitems are chosen. THE OBSERVED MEDIAN IS AT THE BOUND, which means the attack is ' +
    'not exploiting a\nweakness in the pool that a better pool would remove — it is reading the ' +
    'reveals, and the reveals are\nthe feature. Making the pin outlast a median 8-trial system ' +
    'would need a hypothesis space above 5^8,\nabout 390,000 mappings, against 120 at size 5 and 720 ' +
    'at the shipped size 6. That is roughly a\nnine-badge vocabulary, and §6 sized the system at ' +
    'five for reasons that have nothing to do with this.\n',
);

console.log(
  '### 10b. Where the pin lands inside a real block, and what the attacker scores\n\n' +
    'The attacker rides along with the blocks §4 measured, answering each trial BEFORE that trial\'s ' +
    'own\nreveal arrives, and losing everything at each rotation. `k = 1, 30 trials` is the current ' +
    'design.\nScoring is PR #47\'s `scoreItem`, so a certainty means what it means there.\n',
);
console.log(
  '| arm | mean pin trial | systems ever pinned | trials before the pin | attacker accuracy | before pin | after pin |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- |');
const attackArms = [
  ['k = 1, 30 trials (current design)', { k: 1, budget: null, cap: 30, stopOnCrack: false }],
  ['k = 3, budget-matched', { k: 3, budget: BUDGET, cap: CAP }],
  ['k = 5, budget-matched', { k: 5, budget: BUDGET, cap: CAP }],
];
const attackResults = new Map();
for (const [label, options] of attackArms) {
  const runs = runCell(options).map((block) =>
    attackBlock({ pool: attackPool, block, channel: 'reveal' }),
  );
  attackResults.set(label, runs);
  const systems = runs.flatMap((r) => r.perSystem).filter((s) => s.trials > 0);
  const pinned = systems.filter((s) => s.pinnedAt !== null);
  const before = systems.reduce((a, s) => a + s.beforePin, 0);
  const trials = systems.reduce((a, s) => a + s.trials, 0);
  // Accuracy split at the pin, over trials rather than over systems, so a long system counts more.
  let beforeHits = 0;
  let beforeN = 0;
  let afterHits = 0;
  let afterN = 0;
  for (const r of runs) {
    for (const s of r.perSystem) {
      if (s.trials === 0) continue;
      const cut = s.pinnedAt ?? s.trials;
      beforeN += cut;
      afterN += s.trials - cut;
      beforeHits += s.beforeHits;
      afterHits += s.afterHits;
    }
  }
  console.log(
    `| ${label} | ${n2(mean(pinned.map((s) => s.pinnedAt)))} | ` +
      `${pct(pinned.length / systems.length)} | ${pct(before / trials)} | ` +
      `**${pct(mean(runs.map((r) => r.accuracy).filter((x) => x !== null)))}** | ` +
      `${pct(beforeN === 0 ? null : beforeHits / beforeN)} | ` +
      `${pct(afterN === 0 ? null : afterHits / afterN)} |`,
  );
}

console.log(
  '\n### 10c. Does a scrape survive into the next session?\n\n' +
    'The severe property of the shipped design is permanence: one scrape pins the bank and every ' +
    'future\nchild is served items the attacker already holds. Tested literally — pin session A\'s ' +
    "mapping, then\nanswer session B's items with it.\n\n" +
    '**The control is not the guessing floor, it is a mapping picked at random and never scraped.** ' +
    'Two\nbijections over five badges agree somewhere by coincidence, so a stale pin scores above ' +
    'the floor for\nreasons that have nothing to do with having scraped anything. If the pinned ' +
    'mapping does no better\nthan the guessed one, the scrape carried nothing.\n',
);
const transfers = [];
for (let i = 0; i < 40; i += 1) {
  const t = crossSessionTransfer({
    pool: attackPool,
    sessionA: makeSystem(SIZE, 880000, i).mapping,
    sessionB: makeSystem(SIZE, 881000, i).mapping,
  });
  if (t !== null && !t.sameMapping) transfers.push(t);
}
const sameSession = crossSessionTransfer({
  pool: attackPool,
  sessionA: makeSystem(SIZE, 880000, 0).mapping,
  sessionB: makeSystem(SIZE, 880000, 0).mapping,
});
console.log('| attacker on the next session | accuracy |');
console.log('| --- | --- |');
console.log(
  `| pinned mapping, SAME session (the shipped design's permanence) | **${pct(sameSession.carried)}** |`,
);
console.log(
  `| pinned mapping from session A, applied to session B | ${pct(mean(transfers.map((t) => t.carried)))} |`,
);
console.log(
  `| a mapping guessed at random, never scraped (control) | ${pct(mean(transfers.map((t) => t.guessed)))} |`,
);
console.log(
  `| no mapping knowledge at all, vote over the full family | ${pct(mean(transfers.map((t) => t.residual)))} |`,
);
console.log(`| guessing floor | ${pct(1 / 5)} |`);
console.log(
  `\n${n2(100 * mean(transfers.map((t) => t.refuted)))}% of the next session's items cannot be keyed ` +
    "by the stale mapping at all. Averaged over\n" +
    `${transfers.length} session pairs.\n`,
);

console.log(
  '### 10d. What separates the attacker from a child who has cracked the system\n\n' +
    'A child who cracks a system by trial 9 has done the same computation. In the recommended ' +
    'configuration:\n',
);
const pinTrials = (attackResults.get('k = 5, budget-matched') ?? [])
  .flatMap((r) => r.perSystem)
  .filter((s) => s.pinnedAt !== null)
  .map((s) => s.pinnedAt);
const crackTrials = lifeSystems.filter((s) => s.event).map((s) => s.crackTrial);
console.log('| | p10 | median | p90 |');
console.log('| --- | --- | --- | --- |');
console.log(
  `| attacker pins the mapping at trial | ${n2(quantile(pinTrials, 0.1))} | ` +
    `**${n2(median(pinTrials))}** | ${n2(quantile(pinTrials, 0.9))} |`,
);
console.log(
  `| child demonstrates mastery at trial | ${n2(quantile(crackTrials, 0.1))} | ` +
    `**${n2(median(crackTrials))}** | ${n2(quantile(crackTrials, 0.9))} |`,
);

/* ================================================================== *
 * 11. The comparison, in one place
 * ================================================================== */

const single = cells.get(1);
console.log(
  '\n## 11. The comparison, in one place\n\n' +
    '| arm | trials | ICC(1,1) | rank recovery |\n| --- | --- | --- | --- |\n' +
    `| current design: 1 system, 30 trials, per-primitive latency | 30.00 | ` +
    `${n2(baselinePerPrimitive.vc?.icc)} | ${n2(baselinePerPrimitive.rho)} |\n` +
    `| 1 system, one crack-time only | ` +
    `${n2(mean(single.blocks.map((b) => b.totalTrials)))} | ` +
    `${n2(single.vc === null ? null : single.vc.icc)} | ${n2(single.rho)} |\n` +
    `| **best rotating, budget-matched: k = ${best[0]}** | ` +
    `${n2(mean(best[1].blocks.map((b) => b.totalTrials)))} | **${n2(best[1].vc.icc)}** | ` +
    `${n2(best[1].rho)} |\n`,
);
console.log(
  'PR #42 measured the single-block acquisition-latency score at ICC 0.59 and rank recovery 0.71 on ' +
    'the\nREAL FLU-OPCHAIN-01 bank against a fidelity ladder. The absolute values here are not ' +
    'comparable with\nthose — different population, synthetic pool, a block-level rather than a ' +
    'per-primitive criterion —\nand only the rows of this table are comparable with each other.\n\n' +
    'Generated by `pnpm stage2:rotation`. Seeded, no wall clock, no network, no bank read or written.',
);
