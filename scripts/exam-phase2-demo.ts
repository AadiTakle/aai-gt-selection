/**
 * Phase 2 — "how fast does the child pick up something new" — made VISIBLE.
 *
 * Phase 1 (`exam:phase1-demo`) finds where a child already performs. This runs the regime that
 * comes after it: a NOVEL BLOCK of 30 unseen items in ONE area, served at a difficulty that
 * follows the child upward, from which a within-session learning rate is fitted.
 *
 * WHY A SEPARATE BLOCK, which is the whole point of the phase. During Phase 1 the served difficulty
 * climbs as the search closes on the child, so the hardest item they have solved rises across the
 * session EVEN IF THEIR ABILITY NEVER CHANGES. `exam:phase1-demo` shows that ramp directly: a child
 * pinned at one level walks 3, 5, 7, 9, 11, 13, 15 all correct before the estimate brackets. Any
 * growth statistic computed over that trace is reading the algorithm, not the child. The block
 * removes the confound structurally — it starts only once the area's estimate has settled, so the
 * search has finished and the only thing left that can move is the child.
 *
 * To make that visible, the demo runs TWO children through the same block from the same standing
 * level: one who learns and one who does not. The interesting output is not that the learner scores
 * higher; it is that the readout declines to name a band for either of them against an honest
 * reference, and says why.
 *
 * Everything here is born-synthetic against uncalibrated banks (`validated=false`). This
 * demonstrates the MECHANISM — the block administers, the fit recovers, the readout refuses to
 * overclaim — and establishes nothing about real learning or program benefit.
 *
 * Usage: pnpm exam:phase2-demo
 */
import {
  AREAS,
  RECOMMENDED_NOVEL_BLOCK_LENGTH,
  areaEstimateStable,
  blockReadiness,
  novelItems,
  selectNextNovelItem,
  update,
  type Area,
  type EngineConfig,
  type ScoredItem,
} from '../packages/exam-engine/src';
import {
  loadRealBanks,
  respondFromRealBank,
  runRealBankSession,
  type RealBanks,
  type TrueTheta,
} from '../packages/exam-engine/src/testing/real-bank';
import {
  MIN_TRIALS_FOR_RATE,
  estimateLearningCurve,
  learningRateReadout,
  nextTargetTheta,
  type LearningTrial,
} from '../packages/exam-scoring/src';

/** Same engine config the Phase 1 demo and the live portal run. */
const CONFIG: Partial<EngineConfig> = {
  minItemsPerArea: 4,
  evenSpreadTolerance: 1,
  stabilityWindow: 4,
  stabilitySd: 1.5,
  stabilityDrift: 1.0,
  difficultyWindow: 4,
  accWindowSize: 8,
  estWindowSize: 8,
  hardItemCap: 40,
};

const GRADE_BAND = '4-5' as const;
const TRUE_THETA: TrueTheta = {
  fluid_reasoning: 14,
  verbal: 11,
  quantitative: 12,
  spatial: 9,
};

/**
 * The block runs in ONE area, the same one for every child.
 *
 * Fixed rather than chosen per child: a learning rate measured in whichever area a child happens to
 * be strongest in is not comparable to one measured in a different area, and comparability is the
 * only thing the number is currently good for.
 */
const BLOCK_AREA: Area = 'fluid_reasoning';

/**
 * How far above the child's settled standing level the block aims, in scale points.
 * The desirable-difficulty knob: there has to be headroom to climb into.
 */
const TARGET_OFFSET = 1.0;

/** Logistic discrimination per scale point — the same design assumption the standing fit makes. */
const SLOPE = 1.0;

const AREA_LABEL: Record<Area, string> = {
  fluid_reasoning: 'Fluid reasoning',
  verbal: 'Verbal',
  quantitative: 'Quantitative',
  spatial: 'Spatial',
};

function fmt(n: number): string {
  return n.toFixed(2);
}

/** Deterministic wobble in [-1, 1], standing in for attention and item-to-item variation. */
function wobble(seed: number, trial: number): number {
  const x = Math.sin((seed + 1) * 12.9898 + trial * 78.233) * 43758.5453;
  return 2 * (x - Math.floor(x)) - 1;
}

interface BlockResult {
  trials: LearningTrial[];
  served: { difficulty: number; target: number; correct: boolean; effective: number }[];
}

/**
 * Administer a novel block to a child whose ability is `standing + lambda * t`.
 *
 * The engine picks the item, the scorer's projection picks the difficulty to aim at, and the
 * responder is the same real-bank threshold responder Phase 1 uses — driven here by an ability that
 * moves, plus a seeded wobble so the block produces a realistic mix rather than a clean step.
 */
function runNovelBlock(
  real: RealBanks,
  pool: ReturnType<typeof novelItems>,
  standing: number,
  lambda: number,
  seed: number,
  length = RECOMMENDED_NOVEL_BLOCK_LENGTH,
): BlockResult {
  const trials: LearningTrial[] = [];
  const served: BlockResult['served'] = [];
  const administered: string[] = [];

  for (let t = 0; t < length; t += 1) {
    const target = nextTargetTheta(trials, {
      standingEstimate: standing,
      targetOffset: TARGET_OFFSET,
      slope: SLOPE,
    });

    const item = selectNextNovelItem(pool, administered, target, CONFIG.seed ?? 1);
    if (item === null) break;
    administered.push(item.itemId);

    const effective = standing + lambda * t + wobble(seed, t) * 0.9;
    const scored = respondFromRealBank(item, real, { ...TRUE_THETA, [BLOCK_AREA]: effective });

    trials.push({ difficulty: item.difficulty, score: scored.score, trialIndex: t });
    served.push({ difficulty: item.difficulty, target, correct: scored.correct, effective });
  }

  return { trials, served };
}

function narrateBlock(label: string, block: BlockResult, standing: number): void {
  console.log(`\n### ${label}\n`);
  console.log('   #   aimed-at   served-diff   result   child-level');
  console.log('   -   --------   -----------   ------   -----------');
  block.served.forEach((s, i) => {
    // Print the first six and last six trials; the middle is more of the same.
    if (i >= 6 && i < block.served.length - 6) {
      if (i === 6) console.log('   …          …             …          …             …');
      return;
    }
    console.log(
      `  ${String(i + 1).padStart(2)}   ${fmt(s.target).padStart(8)}   ` +
        `${fmt(s.difficulty).padStart(11)}   ${s.correct ? '  ✓  ' : '  ✗  '}    ${fmt(s.effective).padStart(11)}`,
    );
  });

  const firstTarget = block.served[0]?.target ?? standing;
  const lastTarget = block.served[block.served.length - 1]?.target ?? standing;
  const correct = block.served.filter((s) => s.correct).length;
  console.log(
    `\n  ${block.served.length} trials, ${correct} correct (${Math.round((100 * correct) / block.served.length)}%). ` +
      `Targeting moved ${fmt(firstTarget)} → ${fmt(lastTarget)}.`,
  );
}

// --- Phase 1 first, because Phase 2 needs its result ------------------------

const real = loadRealBanks();
const { state, trace, done } = runRealBankSession(GRADE_BAND, TRUE_THETA, CONFIG, real);

console.log('# Phase 2 — the novel learning block');
console.log(
  `\nPhase 1 ran first: ${trace.length} items, done=${done}. Its per-area standing levels are what ` +
    'Phase 2 builds on.\n',
);
console.log('| area | true level | standing level | settled? |');
console.log('| --- | --- | --- | --- |');
for (const area of AREAS) {
  console.log(
    `| ${AREA_LABEL[area]} | ${TRUE_THETA[area]} | ${fmt(state.areas[area].difficulty)} | ` +
      `${areaEstimateStable(area, state) ? 'yes' : 'no'} |`,
  );
}

// --- can the block run at all? ----------------------------------------------

const readiness = blockReadiness(real.banks.items, BLOCK_AREA, state);
const standing = state.areas[BLOCK_AREA].difficulty;

console.log(`\n\n## Can a block start in ${AREA_LABEL[BLOCK_AREA]}?\n`);
console.log(
  `  estimate settled: ${areaEstimateStable(BLOCK_AREA, state) ? 'yes' : 'no'}\n` +
    `  unseen items available: ${readiness.novelCount} (need ${RECOMMENDED_NOVEL_BLOCK_LENGTH})\n` +
    `  ready: ${readiness.ready}${readiness.reason ? ` — ${readiness.reason}` : ''}`,
);

if (!readiness.ready) {
  console.log(
    '\nThe block does not run, and no rate is reported. That is the designed behaviour: a block ' +
      'begun mid-search, or one that runs short of items, produces a rate that cannot be ' +
      'interpreted. Reporting nothing is the correct output here.',
  );
  process.exit(0);
}

// --- two children, same block, same standing level --------------------------

const pool = novelItems(real.banks.items, BLOCK_AREA, state);

console.log(
  `\n\n## The block: ${RECOMMENDED_NOVEL_BLOCK_LENGTH} unseen ${AREA_LABEL[BLOCK_AREA].toLowerCase()} ` +
    `items, aimed ${TARGET_OFFSET} point(s) above a standing level of ${fmt(standing)}`,
);

const LEARNER_LAMBDA = 0.15;
const learner = runNovelBlock(real, pool, standing, LEARNER_LAMBDA, 11);
const flat = runNovelBlock(real, pool, standing, 0, 11);

narrateBlock(`Child A — ability climbs ${LEARNER_LAMBDA} points per trial`, learner, standing);
narrateBlock('Child B — ability does not change', flat, standing);

// --- what the fit says ------------------------------------------------------

/**
 * Two references, on purpose.
 *
 * `narrow` is the spread synthetic work actually explored. `wide` is the smallest spread at which a
 * band becomes separable at this block length (half-width 0.075 against an SE around 0.045),
 * included only to show that the band logic discriminates when it is allowed to — NOT as a claim
 * that children differ that much. Nothing establishes which of the two is closer to the truth.
 */
const NARROW_REFERENCE = { mean: 0.06, sd: 0.03 };
const WIDE_REFERENCE = { mean: 0, sd: 0.15 };

console.log('\n\n## The fitted climb\n');
console.log(
  '| child | true climb | fitted climb | posterior SE | band (honest ref) | band (wide ref) |',
);
console.log('| --- | --- | --- | --- | --- | --- |');

for (const [label, block, trueLambda] of [
  ['A (learner)', learner, LEARNER_LAMBDA],
  ['B (flat)', flat, 0],
] as const) {
  const fit = estimateLearningCurve(block.trials, { slope: SLOPE, priorTheta0Mean: standing });
  const narrow = learningRateReadout(block.trials, { reference: NARROW_REFERENCE });
  const wide = learningRateReadout(block.trials, { reference: WIDE_REFERENCE });
  console.log(
    `| ${label} | ${trueLambda.toFixed(3)} | ${fit.lambda.toFixed(4)} | ${fit.lambdaSe.toFixed(4)} | ` +
      `${narrow.band} | ${wide.band} |`,
  );
}

const narrowReadout = learningRateReadout(learner.trials, { reference: NARROW_REFERENCE });
console.log(`\nWhy the honest reference gives no band:\n  ${narrowReadout.reason}`);

// --- and what a short block does --------------------------------------------

const short = runNovelBlock(real, pool, standing, LEARNER_LAMBDA, 11, 12);
const shortReadout = learningRateReadout(short.trials, { reference: WIDE_REFERENCE });
console.log(`\nA 12-trial block, for contrast:\n  ${shortReadout.band} — ${shortReadout.reason}`);

// --- the marker that keeps the two regimes apart ----------------------------

let marked = state;
const firstBlockItem = selectNextNovelItem(pool, [], standing + TARGET_OFFSET, 1);
if (firstBlockItem !== null) {
  const scored: ScoredItem = {
    ...respondFromRealBank(firstBlockItem, real, TRUE_THETA),
    stage: 'learning',
  };
  marked = update(marked, scored);
  const traceForArea = marked.areas[BLOCK_AREA].trace;
  const standingCount = traceForArea.filter((o) => o.stage === 'standing').length;
  const learningCount = traceForArea.filter((o) => o.stage === 'learning').length;
  console.log(
    `\n\n## Keeping the two regimes apart\n\n  ${AREA_LABEL[BLOCK_AREA]} trace now holds ` +
      `${standingCount} standing item(s) and ${learningCount} learning item(s).\n` +
      '  Every item records which regime served it, so the learning-rate fit reads the block alone ' +
      'and\n  never the search that preceded it.',
  );
}

console.log(
  `\n\nSummary: the block administers ${RECOMMENDED_NOVEL_BLOCK_LENGTH} unseen items whose difficulty ` +
    'follows the child, the fit separates a learner from a flat child in the right direction, and the ' +
    `readout refuses to name a band at ${MIN_TRIALS_FOR_RATE} trials against a realistic reference. ` +
    "That refusal is the finding, not a gap to tune away: at this block length one child's estimate " +
    'is less precise than the differences between children are thought to be, so the rate can order ' +
    'a cohort it measured but cannot place an individual on a scale.',
);
