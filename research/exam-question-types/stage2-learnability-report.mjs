// WHEN EACH THING BECAME LEARNABLE, over blocks — the report the trace exists to produce.
//
// `stage2-learnability.mjs` answers, for one trial, "could this have been worked out from what had
// already been revealed?". This drives the real administration path over a grid of standings and
// seeds and turns those per-trial answers into the two things a bank has to be judged on:
//
//   1. ANSWERABILITY. Per block: the first trial at which each badge became uniquely determined, how
//      many trials were answerable from prior reveals, and how much of the system was knowable at
//      each third. A block whose early trials were not answerable is not a slow learner.
//   2. INTERPRETABILITY. §4.1.1's manipulation check is mean served difficulty over the last third,
//      which must be LOWER in the scrambled arm. When the targeting rule asks for more difficulty
//      than the bank holds, the served difficulty stops being a function of the child, the two arms
//      converge, and no contrast from that run means anything. This counts those trials and says so.
//
// WHAT THE SPLIT IS FOR, AND THE DECISION IT SETTLES. Two kinds of unanswerable trial look identical
// in the response data and are completely different defects:
//
//   inherent   nothing has been revealed yet, so nothing is determinable. NOT a defect. It is the
//              baseline the climb is measured from, and it is half the construct — learning rate is
//              the gap between when a thing became knowable and when the child knew it, so deleting
//              the interval before it was knowable deletes the quantity.
//   avoidable  the chain turns on a badge the child has never once seen. No reasoning could help, and
//              the sequence chose that, not the construct. THIS is the bank defect, and it is what
//              `trialsWithUnseenBadge` counts.
//
// So: unanswerable trials are NOT excluded from the rate fit, and the avoidable half is removed at
// source by the unscored warm-up in `stage2-block-run.js`. Excluding trials would be the wrong repair
// twice over — it deletes the baseline, and it would let a bank keep serving unanswerable items
// because the fit no longer notices.
//
// CLAIM BOUNDARY. The oracle is an upper bound on what was available to be known; it is not a child
// and not a prediction about one. Every number here is a simulation over a born-synthetic, ungated
// bank whose `difficulty` values are design rungs. Nothing printed is a learning rate.
//
// Usage:
//   pnpm stage2:learnability
//   pnpm stage2:learnability -- --standings 8,13,17 --seeds 8 --responder induces

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
const STANDINGS = flag('standings', '5,8,11,13,15,17,19').split(',').map(Number);
const SEEDS = Number(flag('seeds', '8'));
const RESPONDER = flag('responder', 'induces');
const WARMUP = Number(flag('warmup', String(WARMUP_DEMONSTRATIONS)));

let banks;
try {
  banks = JSON.parse(readFileSync(join(HERE, 'stage2-build/items.json'), 'utf8'));
} catch {
  console.error('stage2-learnability-report: run `pnpm stage2:review:build` first.');
  process.exit(1);
}
const arms = banks[TYPE];
if (!arms?.consistent || !arms?.perTrial) {
  console.error(`stage2-learnability-report: ${TYPE} has no two-arm bank in stage2-build/items.json.`);
  process.exit(1);
}

const makeResponder = (id = RESPONDER) =>
  id === 'guesses' ? guessingResponder() : inductionResponder(inspector);

function block(arm, standing, seed, responderId = RESPONDER) {
  const run = createRun({
    engine,
    bank: arms[arm],
    arm,
    standing,
    seed,
    length: LENGTH,
    seenItemIds: [],
    responder: makeResponder(responderId),
    learnability,
    warmupCount: WARMUP,
  });
  playToEnd(run);
  return { ...summariseRun(run), responderId };
}

const mean = (xs) => (xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length);
const pct = (x) => `${(100 * x).toFixed(0)}%`;
const n2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—');

const runs = [];
for (const standing of STANDINGS) {
  for (let s = 0; s < SEEDS; s += 1) {
    const seed = 20260731 + s * 7919;
    for (const arm of ['consistent', 'perTrial']) runs.push(block(arm, standing, seed));
  }
}
const pick = (arm, standing) =>
  runs.filter((r) => r.arm === arm && r.standing === standing);

console.log(
  `# Stage 2 learnability and interpretability — ${TYPE}\n\n` +
    `${LENGTH} scored trials after ${WARMUP} unscored worked demonstration(s), responder "${RESPONDER}", ` +
    `${SEEDS} seeds x standings ${STANDINGS.join('/')}, both arms.\n` +
    'Real administration path: apps/web/src/lib/exam/phase2.ts + @gt-selection/exam-{engine,scoring}.\n' +
    `Bank: ${arms.consistent.served.length} items per arm, difficulty ` +
    `${n2(Math.min(...arms.consistent.served.map((i) => i.difficulty)))}..` +
    `${n2(Math.max(...arms.consistent.served.map((i) => i.difficulty)))}.`,
);

/* ------------------------------------------------------------------ *
 * 1. Answerability — when the system became knowable
 * ------------------------------------------------------------------ */
console.log(
  '\n## 1. When the system became knowable\n\n' +
    '`pinned by` is the trial at which the LAST badge became uniquely determined by the reveals seen so\n' +
    'far — after which a perfect reasoner has the whole system. `answerable` is the share of trials\n' +
    'whose key was determined by prior reveals, with the per-third columns computed within each third.\n' +
    '`ramp` is the leading run of trials no reasoner could have answered: inherent, not a defect.\n' +
    '`intro` counts trials that showed a badge for the first time (unavoidable); `2+ intro` counts\n' +
    'trials that showed two at once, which is the avoidable defect and must be zero.\n',
);
console.log(
  '| standing | arm | warm-up pinned | pinned by | answerable | 1st third | last third | ramp | intro | 2+ intro | knowable (1st/mid/last) | available acc | actual acc |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const standing of STANDINGS) {
  for (const arm of ['consistent', 'perTrial']) {
    const rs = pick(arm, standing);
    const L = rs.map((r) => r.learnability);
    const pinnedAt = L.map((l) => l.fullyKnowableAt).filter((v) => v !== null);
    const multi = mean(L.map((l) => l.multiIntroductionTrials));
    console.log(
      `| ${standing} | ${arm} | ${n2(mean(L.map((l) => l.warmupDetermined)))}/6 | ` +
        `${pinnedAt.length === 0 ? 'never' : `${n2(mean(pinnedAt))} (${pinnedAt.length}/${rs.length})`} | ` +
        `${pct(mean(L.map((l) => l.derivableShare)))} | ` +
        `${pct(mean(L.map((l) => l.derivableFirstThird)))} | ` +
        `${pct(mean(L.map((l) => l.derivableLastThird)))} | ` +
        `${n2(mean(L.map((l) => l.unanswerablePrefix)))} | ` +
        `${n2(mean(L.map((l) => l.badgeIntroductions)))} | ` +
        `${multi === 0 ? '0' : `**${multi.toFixed(2)}**`} | ` +
        `${L[0].knowableByThird.map((_, i) => pct(mean(L.map((l) => l.knowableByThird[i])))).join(' / ')} | ` +
        `${pct(mean(L.map((l) => l.availableAccuracy)))} | ${pct(mean(rs.map((r) => r.accuracy)))} |`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 2. The learning gap — the construct, stated honestly
 * ------------------------------------------------------------------ */
console.log(
  '\n## 2. The learning gap\n\n' +
    'The estimator sees only whether the child was right. These two columns split its misses into the\n' +
    'two things they can be. `missed while determinable` is learning that had not happened yet — the\n' +
    'quantity a learning rate is supposed to be about. `right while undeterminable` is not learning at\n' +
    'all: the answer was not available, so it was a lucky guess or a content shortcut.\n',
);
console.log(
  '| standing | arm | missed while determinable | right while undeterminable | content-derivable trials |',
);
console.log('| --- | --- | --- | --- | --- |');
for (const standing of STANDINGS) {
  for (const arm of ['consistent', 'perTrial']) {
    const L = pick(arm, standing).map((r) => r.learnability);
    console.log(
      `| ${standing} | ${arm} | ${n2(mean(L.map((l) => l.missedWhileDeterminable)))} | ` +
        `${n2(mean(L.map((l) => l.correctWhileUndeterminable)))} | ` +
        `${n2(mean(L.map((l) => l.contentDerivableTrials)))} |`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 3. Behaviour under genuine uncertainty
 *
 * The signal that survives on trials nobody could answer. Every rate is
 * printed against the rate uniform guessing produces on the SAME items,
 * because how many options an item excludes is a property of the item.
 * ------------------------------------------------------------------ */
console.log(
  '\n## 3. Behaviour under genuine uncertainty\n\n' +
    'On a trial whose answer was not yet determinable, being right is luck and carries nothing about the\n' +
    'child. Selecting an option that no system consistent with the reveals ALREADY SEEN can produce is\n' +
    'not luck: it is information held and not used. Every choice falls in exactly one of three classes —\n' +
    '`determined` (the unique answer, and it was taken), `consistent` (a still-possible option, which is\n' +
    'everything the evidence permitted), `ruled out` (already excluded).\n\n' +
    '`chance` is what uniform guessing scores on the same items, and `lift` is observed minus chance, so\n' +
    'NEGATIVE means the responder used information. Without the chance column a ruled-out rate would\n' +
    'rank banks by how many unreachable distractors they happen to carry rather than rank children.\n\n' +
    '`open` restricts to trials that were NOT determinable — the undiluted signal.\n',
);
console.log(
  '| responder | arm | determined | consistent | ruled out | of which by reveals | ruled-out rate | chance | lift | open n | open ruled out | open chance | open lift |',
);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');

const inferenceRuns = [];
for (const responderId of ['guesses', 'induces']) {
  for (const standing of STANDINGS) {
    for (let s = 0; s < SEEDS; s += 1) {
      for (const arm of ['consistent', 'perTrial']) {
        inferenceRuns.push(block(arm, standing, 20260731 + s * 7919, responderId));
      }
    }
  }
}
const signed = (x) => (Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${x.toFixed(3)}` : '—');
const meanOf = (rs, pick) => mean(rs.map((r) => pick(r.learnability.inference)).filter((v) => v !== null));

for (const responderId of ['guesses', 'induces']) {
  for (const arm of ['consistent', 'perTrial']) {
    const rs = inferenceRuns.filter((r) => r.responderId === responderId && r.arm === arm);
    const observed = meanOf(rs, (i) => i.ruledOutRate);
    const chance = meanOf(rs, (i) => i.ruledOutChance);
    const openObs = meanOf(rs, (i) => i.openRuledOutRate);
    const openChance = meanOf(rs, (i) => i.openRuledOutChance);
    console.log(
      `| ${responderId} | ${arm} | ${n2(meanOf(rs, (i) => i.determined))} | ` +
        `${n2(meanOf(rs, (i) => i.consistent))} | ${n2(meanOf(rs, (i) => i.ruledOut))} | ` +
        `${n2(meanOf(rs, (i) => i.ruledOutByReveals))} | ${pct(observed)} | ${pct(chance)} | ` +
        `**${signed(observed - chance)}** | ${n2(meanOf(rs, (i) => i.openTrials))} | ${pct(openObs)} | ` +
        `${pct(openChance)} | **${signed(openObs - openChance)}** |`,
    );
  }
}

/* Is a block-level lift stable enough to be a score? Two questions, both answered here. */
const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
console.log(
  '\n### Is it stable enough to score on?\n\n' +
    'Two separate questions. SEPARATION is whether a block-level lift tells two responders apart at all:\n' +
    'the guesser lands on excluded options exactly at chance by construction, so any responder that\n' +
    'reliably beats it is using evidence. SPREAD is whether one responder\u2019s lift holds still across\n' +
    'seeds and standings; a signal whose block-to-block SD swamps the separation cannot be a score for\n' +
    'an individual child however clean the group means look. Split-half is the same block\u2019s odd and\n' +
    'even trials, which is the cheapest internal-consistency check available without a second block.\n',
);
console.log('| arm | guesser lift | responder lift | separation | responder SD across blocks | separation / SD |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const arm of ['consistent', 'perTrial']) {
  const g = inferenceRuns.filter((r) => r.responderId === 'guesses' && r.arm === arm);
  const l = inferenceRuns.filter((r) => r.responderId === 'induces' && r.arm === arm);
  const liftOf = (rs) =>
    rs
      .map((r) => r.learnability.inference)
      .filter((i) => i.ruledOutRate !== null)
      .map((i) => i.ruledOutRate - i.ruledOutChance);
  const gl = mean(liftOf(g));
  const ll = liftOf(l);
  const spread = sd(ll);
  console.log(
    `| ${arm} | ${signed(gl)} | ${signed(mean(ll))} | ${signed(mean(ll) - gl)} | ${n2(spread)} | ` +
      `${n2(Math.abs(mean(ll) - gl) / spread)} |`,
  );
}

console.log(
  '\n**What the two arms make of this signal, and why they disagree.** The class split is only\n' +
    'informative where several options are genuinely still possible, and neither arm spends much time\n' +
    'there. In the CONSISTENT arm the oracle determines the answer on nearly every trial, so\n' +
    '`consistent` almost never fires and `ruled out` collapses onto "wrong": the split is close to\n' +
    'collinear with accuracy and adds little. In the SCRAMBLED arm every trial is open, but nothing has\n' +
    'been eliminated by reveals, so only the item itself excludes anything and the room to demonstrate\n' +
    'inference is small — hence a separation of a fraction of a block SD.\n\n' +
    'The regime where the signal would carry real information is the middle one: trials whose viable\n' +
    'set holds two or three options. Those are rare here because the selection rule targets DIFFICULTY\n' +
    'and is indifferent to how determined the answer is. Deliberately serving partially-determined\n' +
    'trials would change what the block selects on, so it is a design decision and not a bug fix, and\n' +
    'it is recorded here rather than taken.',
);

/* ------------------------------------------------------------------ *
 * 4. Interpretability — does the manipulation check still have anything to read?
 * ------------------------------------------------------------------ */
console.log(
  '\n## 4. Is the arm contrast interpretable at this standing?\n\n' +
    '§4.1.1: the correct manipulation check is mean served difficulty over the LAST THIRD, which must\n' +
    'be lower in the scrambled arm — accuracy is held near p = 0.5 by the targeting rule, so accuracy\n' +
    'is not expected to separate. `clamped` is the share of trials on which the rule asked for more\n' +
    'difficulty than the bank holds; on those the served difficulty is whatever was left at the top\n' +
    'and no longer a function of this child. When the two late means converge, the control has\n' +
    'stopped being a control and no contrast from that standing is interpretable.\n',
);
console.log(
  '| standing | late difficulty, consistent | late difficulty, scrambled | separation | clamped C / S | verdict |',
);
console.log('| --- | --- | --- | --- | --- | --- |');
let uninterpretable = 0;
for (const standing of STANDINGS) {
  const a = pick('consistent', standing);
  const b = pick('perTrial', standing);
  const lateA = mean(a.map((r) => r.lateServed));
  const lateB = mean(b.map((r) => r.lateServed));
  const separation = lateA - lateB;
  // Half a scale point is the bank's own rung width, so a separation under it is below the
  // resolution the difficulty ladder has to offer and cannot be read as a manipulation effect.
  const ok = separation >= 0.5;
  if (!ok) uninterpretable += 1;
  console.log(
    `| ${standing} | ${n2(lateA)} | ${n2(lateB)} | ${separation >= 0 ? '+' : ''}${n2(separation)} | ` +
      `${pct(mean(a.map((r) => r.clampedShare)))} / ${pct(mean(b.map((r) => r.clampedShare)))} | ` +
      `${ok ? 'interpretable' : '**NOT interpretable**'} |`,
  );
}

console.log(
  `\n${uninterpretable} of ${STANDINGS.length} standings fail the manipulation check. A failure there is a\n` +
    'statement about the BANK and the scale, not about either arm: the difficulty ladder ran out\n' +
    'before the targeting rule did, so the two arms were served the same difficulty profile and the\n' +
    'design has nothing left to contrast. λ from such a run must not be read as evidence either way.',
);

console.log(
  '\n## What this does and does not license\n\n' +
    'The oracle is a perfect reasoner with perfect memory. Every "answerable" above is an upper bound\n' +
    'on what was available, never a prediction that a child would get it — so a gap between\n' +
    '`available acc` and `actual acc` is the responder failing to exploit what it had, which for the\n' +
    'model learner is a tie-breaking artefact and for a child would be the thing worth measuring.\n\n' +
    'Nothing here is a learning rate. E-200 puts the contamination floor at roughly 0.01-0.02 scale\n' +
    'points per trial for a responder that learned nothing, because the loop picks the next difficulty\n' +
    'and then reads its own walk. Banding requires a reference distribution Gate B has not produced.',
);
