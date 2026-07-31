/**
 * Why the scrambled-system control returns an exactly zero contrast under simulation.
 *
 * `docs/product/STAGE2_BANK_RECOVERY_MEASUREMENT.md` §7 reports that every Gate A and `--fix-probe`
 * cell is identical between the consistent arm (`banks/FLU-OPCHAIN-01.jsonl`) and the scrambled one
 * (`control-banks/FLU-OPCHAIN-01.perTrial.jsonl`). That is a
 * strong claim about a control D-S2-3 made binding, so it should be a command rather than an
 * inference, and the explanation should be measured rather than argued.
 *
 * The explanation: the two banks are equated item-for-item on difficulty, and `difficulty` is the
 * only item property a simulated child responds to — there is no hidden system inside the simulator
 * for `systemPersistence` to persist or scramble. The banks' item ids DO differ, and `itemId` does
 * reach the administration path, but only as a tie-break inside `selectNextNovelItem` and only when
 * two candidates are EXACTLY equidistant from the target. For the continuous targets
 * `nextTargetTheta` returns, that is a measure-zero event.
 *
 * So this probe replays the real administration path — the same `nextTargetTheta` +
 * `selectNextNovelItem` pair the harness drives — on both banks under identical responses, and
 * compares the served-difficulty sequences under two standing regimes:
 *
 *   * CONTINUOUS standings, which is what the harness draws (`theta0 + N(0, 1.5²)`) and what a real
 *     cohort looks like. Expected: no block differs.
 *   * EXACTLY-INTEGER standings, which manufacture the exact ties the tie-break needs. This is not
 *     a realistic regime; it is the configuration the §8 headroom sweep pins by construction
 *     (`--theta0-sd 0 --standing-noise 0 --theta0-mean N`), and it is the reason that one sweep is
 *     the single place in the findings where the two arms' output is not identical.
 *
 * The second regime is the useful half: it bounds how much of any future between-arm contrast could
 * be an artifact of the two banks' item ids rather than of their persistence mode.
 *
 * CLAIM BOUNDARY. This says nothing about whether the type measures learning. It is a statement
 * about two files and one selection rule.
 *
 * Usage:
 *   pnpm exam:arm-equivalence
 *   pnpm exam:arm-equivalence -- --blocks 40 --length 60
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { selectNextNovelItem, type AgeBand, type BankItem } from '../packages/exam-engine/src';
import {
  DEFAULT_GUESSING,
  nextTargetTheta,
  type LearningTrial,
} from '../packages/exam-scoring/src';

/** `LEARNING_BLOCK_TARGET_OFFSET` in `apps/web/src/lib/exam/phase2.ts`, as the harness uses it. */
const TARGET_OFFSET = 1;
const SLOPE = 1.0;

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 10; depth += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('arm-equivalence probe: could not locate the workspace root');
}

const BANK_DIR = join(repoRoot(), 'research/exam-question-types/banks');
/** The scrambled arm sits outside the served directory; see `generators/FLU-OPCHAIN-01.mjs`. */
const CONTROL_BANK_DIR = join(repoRoot(), 'research/exam-question-types/control-banks');

/**
 * Load a bank down to the three fields the administration path reads.
 *
 * Deliberately the same projection `exam-learning-block-harness.ts` makes, because the point is to
 * reproduce what the harness sees rather than what the bank contains.
 */
function loadBank(stem: string): BankItem[] {
  const served = join(BANK_DIR, `${stem}.jsonl`);
  const path = existsSync(served) ? served : join(CONTROL_BANK_DIR, `${stem}.jsonl`);
  const items: BankItem[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const row = JSON.parse(trimmed) as Record<string, unknown>;
    const itemId = row['itemId'];
    const difficulty = row['difficulty'];
    const typeCode = row['typeCode'];
    if (typeof itemId !== 'string' || typeof typeCode !== 'string') continue;
    if (typeof difficulty !== 'number' || !Number.isFinite(difficulty)) continue;
    items.push({
      itemId,
      typeCode,
      domain: 'fluid_reasoning',
      difficulty,
      ageBands: ['4-5'] as AgeBand[],
      content: {},
      answer: { correctKey: 'A' },
      scoring: { mode: 'deterministic_key' },
      provenance: { generator: 'grammar' },
      syntheticOnly: true,
      validated: false,
    });
  }
  if (items.length === 0) throw new Error(`bank ${path} yielded no usable items`);
  return items;
}

/** Administer one block and return only what the simulated child would have seen. */
function servedDifficulties(
  pool: readonly BankItem[],
  standing: number,
  correctness: readonly boolean[],
  seed: number,
): number[] {
  const trials: LearningTrial[] = [];
  const administered: string[] = [];
  const served: number[] = [];

  for (let t = 0; t < correctness.length; t += 1) {
    const target = nextTargetTheta(trials, {
      standingEstimate: standing,
      targetOffset: TARGET_OFFSET,
      slope: SLOPE,
      guessing: DEFAULT_GUESSING,
    });
    const item = selectNextNovelItem(pool, administered, target, seed);
    if (item === null) break;
    administered.push(item.itemId);
    served.push(item.difficulty);
    trials.push({
      difficulty: item.difficulty,
      score: correctness[t] === true ? 1 : 0,
      trialIndex: t,
    });
  }
  return served;
}

/**
 * A fixed correctness pattern, identical across arms.
 *
 * The responses must NOT depend on the served difficulty: if they did, an arm difference and a
 * response difference would be confounded and the probe would not isolate the selection rule.
 */
function pattern(salt: number, length: number): boolean[] {
  let h = salt >>> 0;
  return Array.from({ length }, () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) ^ 0x9e3779b9) >>> 0;
    return h / 4294967296 < 0.6;
  });
}

function compare(
  a: readonly BankItem[],
  b: readonly BankItem[],
  standings: readonly number[],
  blocksPerStanding: number,
  length: number,
  seed: number,
): { compared: number; differing: number; firstDivergence: string | null } {
  let compared = 0;
  let differing = 0;
  let firstDivergence: string | null = null;

  for (const standing of standings) {
    for (let rep = 0; rep < blocksPerStanding; rep += 1) {
      const responses = pattern(Math.round(standing * 7919) + rep * 104729, length);
      const left = servedDifficulties(a, standing, responses, seed);
      const right = servedDifficulties(b, standing, responses, seed);
      compared += 1;
      if (left.length === right.length && left.every((d, i) => d === right[i])) continue;
      differing += 1;
      if (firstDivergence === null) {
        const i = left.findIndex((d, k) => d !== right[k]);
        firstDivergence =
          `standing ${standing}, block ${rep}: first divergence at trial ${i} — ` +
          `consistent served ${left[i]}, perTrial served ${right[i]}`;
      }
    }
  }
  return { compared, differing, firstDivergence };
}

function main(): void {
  const argv = process.argv.slice(2);
  const num = (name: string, fallback: number): number => {
    const index = argv.indexOf(`--${name}`);
    if (index < 0) return fallback;
    const parsed = Number(argv[index + 1]);
    if (!Number.isFinite(parsed)) throw new Error(`--${name} expects a number`);
    return parsed;
  };
  const blocks = num('blocks', 40);
  const length = num('length', 60);
  const seed = num('seed', 20260730);

  const consistent = loadBank('FLU-OPCHAIN-01');
  const perTrial = loadBank('FLU-OPCHAIN-01.perTrial');

  console.log('# FLU-OPCHAIN-01 arm equivalence under simulation\n');

  const sameDifficulty =
    consistent.length === perTrial.length &&
    consistent.every((item, i) => item.difficulty === perTrial[i]?.difficulty);
  const sameIds = consistent.filter((item, i) => item.itemId === perTrial[i]?.itemId).length;
  console.log(
    `Banks: ${consistent.length} items each. Difficulty identical item-for-item: ` +
      `${sameDifficulty ? 'YES' : 'NO'}. Item ids shared: ${sameIds}/${consistent.length}.`,
  );
  console.log(
    `Replaying the real administration path (nextTargetTheta + selectNextNovelItem), ` +
      `${blocks} blocks per standing of ${length} trials, identical responses across arms.\n`,
  );

  const integers = [4, 8, 10, 12, 13, 14, 15, 16, 17, 19];
  // Offsets chosen only to be non-terminating in the difficulty grid's 0.02 spacing; any
  // non-degenerate standings do. The harness draws these continuously and never lands on integers.
  const continuous = [4.37, 8.21, 10.06, 12.44, 13.19, 14.73, 15.28, 16.61, 17.09, 19.02];

  console.log('| standing regime | blocks compared | served-difficulty sequences that differ |');
  console.log('| --- | --- | --- |');
  const rows: { label: string; result: ReturnType<typeof compare> }[] = [
    {
      label: 'continuous (what the harness draws)',
      result: compare(consistent, perTrial, continuous, blocks, length, seed),
    },
    {
      label: 'exactly integer (manufactures exact ties)',
      result: compare(consistent, perTrial, integers, blocks, length, seed),
    },
  ];
  for (const { label, result } of rows) {
    console.log(`| ${label} | ${result.compared} | **${result.differing}** |`);
  }

  for (const { label, result } of rows) {
    if (result.firstDivergence !== null) console.log(`\n  ${label} — ${result.firstDivergence}`);
  }

  console.log(
    '\nReading: `itemId` reaches the administration path only as a tie-break on an EXACT distance\n' +
      'tie, so the arms are indistinguishable wherever the target is continuous. The integer row is\n' +
      'not a realistic regime — it is the one the headroom sweep pins by construction, and it is why\n' +
      'that sweep is the only place the two arms produce different output.',
  );
}

main();
