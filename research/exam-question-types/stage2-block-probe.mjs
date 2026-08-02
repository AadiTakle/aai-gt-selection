// Headless driver for the Stage 2 review window's block loop.
//
// No browser is installed in this environment, so "play the block in both arms and report what
// happened" cannot be done by clicking. This runs the SAME loop the window runs — it imports
// `stage2-block-run.js`, the identical module `stage2-review.js` imports — over the SAME item data
// the window fetches (`stage2-build/items.json`). It is a different loader, not a different
// implementation: a discrepancy between what this prints and what the window shows for the same
// standing, seed, responder and length would be a bug in one of them, not a difference of method.
//
// What it is FOR: the two-arm contrast. The repository's existing simulated responder
// (`pnpm exam:arm-equivalence`) reads item `difficulty` and nothing else, so for it the consistent
// and scrambled banks are the same bank and the contrast is exactly zero by construction. The
// inspector's model learner is the first responder in this repository that reads the badge chain,
// which is the only way the arms can come apart at all under simulation.
//
// CLAIM BOUNDARY. Every number this prints is a simulation over a born-synthetic, ungated bank
// (`syntheticOnly: true`, `validated: false`) whose `difficulty` values are design rungs, not
// calibrated IRT parameters, answered by a model learner rather than a child. It can show that the
// machinery produces (or fails to produce) a two-arm contrast. It cannot show that children learn
// here, and nothing it prints is a learning rate.
//
// Usage:
//   pnpm exec tsx research/exam-question-types/stage2-block-probe.mjs
//   pnpm exec tsx research/exam-question-types/stage2-block-probe.mjs --standings 8,13,17 --seeds 5

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as phase2 from '../../apps/web/src/lib/exam/phase2.ts';
import * as scoring from '../../packages/exam-scoring/src/index.ts';
import { hashUnit } from '../../packages/exam-engine/src/rng.ts';

import * as inspector from './stage2-inspectors/opchain.js';
import * as learnability from './stage2-learnability.mjs';
import {
  createRun,
  guessingResponder,
  inductionResponder,
  playToEnd,
  summariseRun,
} from './stage2-block-run.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const engine = { ...phase2, ...scoring, hashUnit };

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const TYPE = flag('type', 'FLU-OPCHAIN-01');
const LENGTH = Number(flag('length', String(engine.LEARNING_BLOCK_LENGTH)));
const STANDINGS = flag('standings', '8,13,17').split(',').map(Number);
const SEEDS = Number(flag('seeds', '8'));
const RESPONDERS = {
  induces: () => inductionResponder(inspector),
  guesses: () => guessingResponder(),
};

let banks;
try {
  banks = JSON.parse(readFileSync(join(HERE, 'stage2-build/items.json'), 'utf8'));
} catch {
  console.error('stage2-block-probe: run `node research/exam-question-types/build-stage2-review.mjs` first.');
  process.exit(1);
}

const arms = banks[TYPE];
if (!arms?.consistent || !arms?.perTrial) {
  console.error(`stage2-block-probe: ${TYPE} has no two-arm bank in stage2-build/items.json.`);
  process.exit(1);
}

function block(arm, standing, seed, responderId) {
  const run = createRun({
    engine,
    bank: arms[arm],
    arm,
    standing,
    seed,
    length: LENGTH,
    seenItemIds: [],
    responder: RESPONDERS[responderId](),
    learnability,
  });
  playToEnd(run);
  return summariseRun(run);
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const pct = (x) => `${(x * 100).toFixed(0)}%`;
const n4 = (x) => (x >= 0 ? ' ' : '') + x.toFixed(4);

console.log(
  `Stage 2 block probe — ${TYPE}, ${LENGTH} trials, ` +
    `${SEEDS} seeds x standings ${STANDINGS.join('/')}\n` +
    `real code: apps/web/src/lib/exam/phase2.ts + @gt-selection/exam-{engine,scoring}\n`,
);

for (const responderId of Object.keys(RESPONDERS)) {
  console.log(`\n=== responder: ${responderId} ===`);
  console.log(
    'stand  arm         acc   1st/3  3rd/3   servedM  last   lambda      95% interval        ' +
      'excl0  resets pinned',
  );
  const deltas = [];
  const perArm = { consistent: [], perTrial: [] };

  for (const standing of STANDINGS) {
    for (let s = 0; s < SEEDS; s += 1) {
      const seed = 20260731 + s * 7919;
      const rows = {};
      for (const arm of ['consistent', 'perTrial']) {
        const r = block(arm, standing, seed, responderId);
        rows[arm] = r;
        perArm[arm].push(r);
        if (s === 0) {
          console.log(
            `${String(standing).padStart(5)}  ${arm.padEnd(10)} ${pct(r.accuracy).padStart(4)}  ` +
              `${pct(r.firstThird).padStart(5)} ${pct(r.lastThird).padStart(5)}   ` +
              `${r.meanServed.toFixed(2).padStart(6)} ${r.lastServed.toFixed(2).padStart(6)}  ` +
              `${n4(r.lambda)}   [${n4(r.lo)}, ${n4(r.hi)}]  ` +
              `${(r.excludesZero ? 'YES' : 'no').padStart(4)}   ` +
              `${String(r.resets ?? '-').padStart(5)} ${String(r.pinned ?? '-').padStart(5)}`,
          );
        }
      }
      deltas.push(rows.consistent.lambda - rows.perTrial.lambda);
    }
  }

  const lamA = perArm.consistent.map((r) => r.lambda);
  const lamB = perArm.perTrial.map((r) => r.lambda);
  const accA = perArm.consistent.map((r) => r.accuracy);
  const accB = perArm.perTrial.map((r) => r.accuracy);
  const gainA = perArm.consistent.map((r) => r.lastThird - r.firstThird);
  const gainB = perArm.perTrial.map((r) => r.lastThird - r.firstThird);
  const exclA = perArm.consistent.filter((r) => r.excludesZero).length;
  const exclB = perArm.perTrial.filter((r) => r.excludesZero).length;
  const n = perArm.consistent.length;
  // Paired over (standing, seed): the two arms see the same standing, the same seed and an
  // item-for-item difficulty-matched bank, so the pairing removes everything except persistence.
  const seDelta = sd(deltas) / Math.sqrt(deltas.length);

  console.log(
    `\n  over ${n} blocks per arm\n` +
      `  accuracy        consistent ${pct(mean(accA))}   scrambled ${pct(mean(accB))}\n` +
      `  last-first third consistent ${(mean(gainA) * 100).toFixed(1)}pp   ` +
      `scrambled ${(mean(gainB) * 100).toFixed(1)}pp\n` +
      `  lambda mean     consistent ${n4(mean(lamA))}   scrambled ${n4(mean(lamB))}\n` +
      `  interval excludes zero      ${exclA}/${n}                ${exclB}/${n}\n` +
      `  paired dlambda  ${n4(mean(deltas))} +/- ${sd(deltas).toFixed(4)} (SE ${seDelta.toFixed(4)}, ` +
      `${Math.abs(mean(deltas) / (seDelta || 1)).toFixed(1)} SE from zero)`,
  );
}

console.log(
  '\nNothing above is a learning rate. E-200 measures a contamination floor of roughly ' +
    '0.01-0.02 scale points per trial for a responder that learned nothing, because the fit picks ' +
    'the next difficulty and then reads its own walk; any lambda near that floor is the loop, not ' +
    'the child. Banding requires a reference distribution that Gate B has not produced.',
);
