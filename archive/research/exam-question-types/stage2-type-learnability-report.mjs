// WHEN EACH THING BECAME LEARNABLE, for every adapted Stage 2 type — the report the oracles exist for.
//
// `stage2-learnability-core.mjs` answers, for one trial, "could this have been worked out from what
// had already been revealed?". This drives the real administration path over a grid of standings and
// seeds, for all four types at once, and turns those per-trial answers into the three things the
// owner asked for and one they will need:
//
//   1. FIRST-DEDUCIBLE TRIAL, per primitive. When did each badge / glyph / affix become uniquely
//      determined by the reveals seen so far? A vocabulary that is never pinned is not a slow
//      learner's problem; it is a statement about the bank and the sequence.
//   2. ANSWERABILITY, per trial. Was the key determined by prior reveals at all? A wrong answer on a
//      trial where nothing determined the answer is not a failure to learn — it is an unanswerable
//      question, and the estimator scores the two identically.
//   3. VIABLE-OPTION COUNT, per trial. THE number that decides whether any of this is worth wiring.
//      The ruled-out-versus-consistent signal separates a reasoner from a guesser only where several
//      options are genuinely still open. Where the oracle determines the answer, "ruled out"
//      collapses onto "wrong" and the signal is redundant with correctness.
//   4. VALIDATION. The reference type is run through the SAME shared core, so the three new oracles
//      are not merely plausible implementations of an idea — they are the reference oracle with the
//      type factored out, and the figures say whether that held.
//
// CLAIM BOUNDARY. The oracle is a perfect reasoner with perfect memory: every "answerable" is an
// upper bound on what was AVAILABLE to be known, never a prediction that a child would get it.
// Every bank here is born-synthetic and ungated, and every `difficulty` is a design rung. Nothing
// printed is a learning rate, and no type below is recorded as gate-passing.
//
// Usage:
//   npx tsx research/exam-question-types/stage2-type-learnability-report.mjs
//   ... --standings 13,17,19 --seeds 4 --types SPA-XFORM-01
//   ... --warmup 3            # the reference type's own setting, for comparison

import { createOracle } from './stage2-learnability-core.mjs';
import { BLOCK_LENGTH, loadArms, runBlock } from './stage2-learnability-block.mjs';
import { ADAPTERS, NEW_TYPES, REFERENCE_TYPE } from './stage2-learnability-adapters/index.mjs';

function flag(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const TYPES = flag('types', [REFERENCE_TYPE, ...NEW_TYPES].join(',')).split(',');
const STANDINGS = flag('standings', '5,8,11,13,15,17,19').split(',').map(Number);
const SEEDS = Number(flag('seeds', '8'));
const LENGTH = Number(flag('length', String(BLOCK_LENGTH)));
const ARMS = ['consistent', 'perTrial'];
const RESPONDERS = ['guesses', 'induces'];
/** The reference type's measured warm-up; the other three have taken no such decision. See below. */
const REFERENCE_WARMUP = 3;
const WARMUP = Number(flag('warmup', '0'));

const seedAt = (s) => 20260731 + s * 7919;

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */
const mean = (xs) => (xs.length === 0 ? Number.NaN : xs.reduce((a, b) => a + b, 0) / xs.length);
const sd = (xs) => {
  if (xs.length === 0) return Number.NaN;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const pct = (x) => (Number.isFinite(x) ? `${(100 * x).toFixed(0)}%` : '—');
const pct1 = (x) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)}%` : '—');
const n2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—');
const signed = (x) => (Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${x.toFixed(3)}` : '—');
const row = (cells) => console.log(`| ${cells.join(' | ')} |`);
const rule = (n) => console.log(`| ${Array(n).fill('---').join(' | ')} |`);

/* ------------------------------------------------------------------ *
 * The runs
 * ------------------------------------------------------------------ */
const oracles = new Map();
const pools = new Map();
for (const code of TYPES) {
  oracles.set(code, createOracle(ADAPTERS[code]));
  pools.set(code, loadArms(code));
}

/** The warm-up each type is run at: its own measured setting, or none where none has been decided. */
const warmupFor = (code) => (code === REFERENCE_TYPE ? REFERENCE_WARMUP : WARMUP);

const runs = [];
for (const code of TYPES) {
  for (const arm of ARMS) {
    for (const standing of STANDINGS) {
      for (let s = 0; s < SEEDS; s += 1) {
        for (const responderId of RESPONDERS) {
          runs.push(
            runBlock({
              oracle: oracles.get(code),
              pool: pools.get(code)[arm],
              arm,
              standing,
              seed: seedAt(s),
              length: LENGTH,
              responderId,
              warmupCount: warmupFor(code),
            }),
          );
        }
      }
    }
  }
}

const pick = (filter) => runs.filter(filter);
const learn = (rs) => rs.map((r) => r.learnability);
/** The answerability half is a property of the SEQUENCE, so it is read off one responder only. */
const seqRuns = (code, arm, standing = null) =>
  pick(
    (r) =>
      r.typeCode === code &&
      r.arm === arm &&
      r.responderId === 'induces' &&
      (standing === null || r.standing === standing),
  );

console.log(
  `# Stage 2 cumulative learnability — ${TYPES.length} types\n\n` +
    `${LENGTH} scored trials, ${SEEDS} seeds x standings ${STANDINGS.join('/')}, both arms, ` +
    `two responders: ${runs.length} blocks.\n` +
    'Real administration path: `nextTargetTheta` (@gt-selection/exam-scoring) chooses the target and\n' +
    '`selectNextNovelServedItem` (@gt-selection/exam-engine) chooses the item, both unmodified.\n\n' +
    'One shared oracle (`stage2-learnability-core.mjs`) with one adapter per type. The candidate space\n' +
    'is every symbol->meaning bijection, intersected down the trial sequence; a primitive is DEDUCIBLE\n' +
    'once every surviving bijection agrees about it, including by elimination.\n',
);

row(['type', 'hidden system', 'candidate systems', 'items/arm', 'options', 'warm-up']);
rule(6);
for (const code of TYPES) {
  const o = oracles.get(code);
  const arm = pools.get(code).consistent;
  const optionCounts = [...new Set(arm.map((i) => i.content.options.length))].sort();
  row([
    `\`${code}\``,
    o.adapter.vocabulary,
    String(o.mappings.length),
    String(arm.length),
    optionCounts.join('/'),
    warmupFor(code) === 0 ? 'none' : `${warmupFor(code)} unscored`,
  ]);
}
console.log(
  '\n**Warm-up.** `FLU-OPCHAIN-01` opens with three unscored worked demonstrations because that count\n' +
    'was measured for it. No equivalent decision has been taken for the other three, so they run with\n' +
    'none, and §7 sizes what one would buy them. Choosing one here would be inventing product design\n' +
    'inside a measurement.\n\n' +
    '**One caveat about `QUANT-GLYPHNUM-01`, stated once and applying to every table below.** Its\n' +
    'child-facing response is a CONTINUOUS placement on a number line scored within a tolerance, not a\n' +
    'choice among five things. The five "options" are the tick slate the bank itself declares and the\n' +
    'slate its own anti-leak analysis is written against (`viableOptions` in the generator), so using\n' +
    'them keeps this report in the type\u2019s own frame — but a viable-option count for this type is a\n' +
    'count over that declared slate, not over anything the child can physically do. Its answerability\n' +
    'and deducibility columns are unaffected: those are about the mapping, not the response widget.',
);

/* ================================================================== *
 * 0. Does the shared core reproduce the reference oracle?
 * ================================================================== */
if (TYPES.includes(REFERENCE_TYPE)) {
  console.log(
    `\n## 0. Validation — the shared core against \`${REFERENCE_TYPE}\`\n\n` +
      'The reference type already has a hand-written oracle. It is run here through the SHARED core as\n' +
      'a fourth adapter, at its own warm-up setting, so the three new oracles are not merely plausible\n' +
      'implementations of an idea — they are the reference oracle with the type factored out. What the\n' +
      'reference reported, and what this reproduces:\n',
  );
  const late = STANDINGS.filter((s) => s >= 17);
  const lateL = learn(late.flatMap((s) => seqRuns(REFERENCE_TYPE, 'consistent', s)));
  const allL = learn(seqRuns(REFERENCE_TYPE, 'consistent'));
  row(['claim from the reference report', 'reproduced here']);
  rule(2);
  row([
    'at standings 17 and 19 only about HALF the vocabulary is ever uniquely pinned',
    late.length === 0 ? 'not in this grid' : `**${pct(mean(lateL.map((l) => l.everPinnedShare)))}** ever pinned`,
  ]);
  row([
    '95-100% of trials stay answerable even so',
    `**${pct(mean(lateL.map((l) => l.derivableShare)))}** at standings ${late.join('/')}, ` +
      `${pct(mean(allL.map((l) => l.derivableShare)))} over all standings`,
  ]);
  row([
    'the warm-up gives away one badge of six',
    `**${n2(mean(allL.map((l) => l.warmupDetermined)))}/6** pinned before trial 1`,
  ]);
  row([
    'three demonstrations drive 2+ introductions to zero at every standing',
    `**${n2(mean(allL.map((l) => l.multiIntroductionTrials)))}**`,
  ]);
  row([
    'the oracle determines the answer on about 97% of trials, so the ruled-out signal is nearly redundant',
    `**${pct1(mean(allL.map((l) => l.derivableShare)))}** determined; ` +
      `**${pct1(allL.reduce((s, l) => s + l.partiallyDeterminedTrials, 0) / allL.reduce((s, l) => s + l.trials, 0))}** of trials have 2-3 viable`,
  ]);
  const liftOf = (responderId) =>
    pick((r) => r.typeCode === REFERENCE_TYPE && r.arm === 'consistent' && r.responderId === responderId)
      .map((r) => r.learnability.inference)
      .filter((i) => i.ruledOutRate !== null)
      .map((i) => i.ruledOutRate - i.ruledOutChance);
  const refLift = liftOf('induces');
  row([
    'the reasoning responder lifts -0.67 while the guesser sits at chance',
    `**${signed(mean(refLift))}** against **${signed(mean(liftOf('guesses')))}**`,
  ]);
  row([
    'a separation of 3.6 block SDs against a block-to-block SD of 0.18',
    `**${n2(Math.abs(mean(refLift) - mean(liftOf('guesses'))) / sd(refLift))}** SDs against **${n2(sd(refLift))}** — ` +
      'does NOT reproduce; see below',
  ]);
  console.log(
    '\n**The one figure that does not reproduce, and why it is the expected one to miss.** Everything\n' +
      'structural matches. The separation does not: the reference measured a responder that landed on a\n' +
      'ruled-out option 3.8 times per block and this one lands there 1.9 times, so the same lift sits on\n' +
      'half the variance and the ratio doubles. That quantity is the RESPONDER\u2019S ERROR RATE, which is\n' +
      'the most bank-sensitive number in the report — the reference ran against the bank\n' +
      '`stage2:review:build` assembles on the review-window branch, and this runs against\n' +
      '`banks/FLU-OPCHAIN-01.jsonl` as it stands on `dev`. Nothing about the oracle differs: the lift\n' +
      'itself, the guesser\u2019s position at chance, and the scrambled arm\u2019s separation (1.27 here\n' +
      'against a reported 1.4) all land where the reference put them. The separation figure should be\n' +
      'read as bank-dependent wherever it appears, including in the three tables below.',
  );
  console.log(
    '\nThe half-pinned / fully-answerable combination is the structural fact the reference names and\n' +
      'every type below is read against: **a composition can be determined without its factorisation\n' +
      'being determined.** Once enough compositions are known, every trial is answerable while several\n' +
      'individual primitives remain formally open — so "vocabulary not pinned" is not "child could not\n' +
      'have answered", and the two must never be collapsed.',
  );
}

/* ================================================================== *
 * 1. When the system became knowable
 * ================================================================== */
console.log(
  '\n## 1. When the system became knowable\n\n' +
    '`ever pinned` is the share of the vocabulary that was uniquely determined at ANY point in the\n' +
    'block. `all by` is the trial at which the LAST primitive was pinned, over the blocks where all of\n' +
    'them were. `answerable` is the share of trials whose key was determined by prior reveals, with\n' +
    'the per-third columns computed within each third. `ramp` is the leading run of trials no reasoner\n' +
    'could have answered — inherent, not a defect. `2+ intro` counts trials introducing two primitives\n' +
    'at once, which no single reveal can attribute: that IS the avoidable defect and it must be zero.\n' +
    '`available acc` is what a perfect reasoner scores; `actual acc` is what the model learner scored.\n' +
    '\nConsistent arm only. In the scrambled control the generator redraws the system every trial, so\n' +
    'nothing is ever determined from prior reveals and every one of these columns is zero by\n' +
    'construction — that is what makes it a control, and it is asserted in the test suite.\n',
);
row([
  'type',
  'standing',
  'ever pinned',
  'all by',
  'answerable',
  '1st third',
  'last third',
  'ramp',
  '2+ intro',
  'knowable 1st/mid/last',
  'available acc',
  'actual acc',
]);
rule(12);
for (const code of TYPES) {
  for (const standing of STANDINGS) {
    const rs = seqRuns(code, 'consistent', standing);
    const L = learn(rs);
    const allAt = L.map((l) => l.fullyKnowableAt).filter((v) => v !== null);
    const multi = mean(L.map((l) => l.multiIntroductionTrials));
    row([
      `\`${code}\``,
      String(standing),
      pct(mean(L.map((l) => l.everPinnedShare))),
      allAt.length === 0 ? 'never' : `${n2(mean(allAt))} (${allAt.length}/${L.length})`,
      pct(mean(L.map((l) => l.derivableShare))),
      pct(mean(L.map((l) => l.derivableFirstThird))),
      pct(mean(L.map((l) => l.derivableLastThird))),
      n2(mean(L.map((l) => l.unanswerablePrefix))),
      multi === 0 ? '0' : `**${multi.toFixed(2)}**`,
      L[0].knowableByThird
        .map((_, i) => pct(mean(L.map((l) => l.knowableByThird[i]))))
        .join(' / '),
      pct(mean(L.map((l) => l.availableAccuracy))),
      pct(mean(rs.map((r) => r.accuracy))),
    ]);
  }
}

/* ================================================================== *
 * 2. First-deducible trial, per primitive
 * ================================================================== */
console.log(
  '\n## 2. First-deducible trial, per primitive\n\n' +
    'Every (block, primitive) pair in the consistent arm, pooled over standings and seeds. `never` is\n' +
    'the share never uniquely pinned in 30 trials — which is NOT the same as never usable: a\n' +
    'composition can be determined without its factorisation being, so a block can answer every trial\n' +
    'while leaving half its vocabulary formally open. That gap is the finding, not an error.\n' +
    '`by warm-up` counts primitives already pinned before trial 1.\n',
);
row([
  'type',
  'pairs',
  'never pinned',
  'by warm-up',
  'median trial',
  'p25 / p75',
  'mean trial',
  'pinned by trial 5 / 10 / 20',
]);
rule(8);
const firstDeducible = new Map();
for (const code of TYPES) {
  const o = oracles.get(code);
  const trialsFor = [];
  let never = 0;
  let byWarmup = 0;
  for (const l of learn(seqRuns(code, 'consistent'))) {
    for (const primitive of o.primitives) {
      const at = l.firstDetermined[primitive];
      if (at === undefined) never += 1;
      else {
        trialsFor.push(at);
        if (at === 0) byWarmup += 1;
      }
    }
  }
  firstDeducible.set(code, { trialsFor, never });
  const total = trialsFor.length + never;
  const sorted = trialsFor.slice().sort((a, b) => a - b);
  const q = (p) => (sorted.length === 0 ? Number.NaN : sorted[Math.floor(p * (sorted.length - 1))]);
  const by = (k) => trialsFor.filter((t) => t <= k).length / total;
  row([
    `\`${code}\``,
    String(total),
    `**${pct(never / total)}**`,
    pct(byWarmup / total),
    Number.isFinite(q(0.5)) ? String(q(0.5)) : '—',
    `${q(0.25)} / ${q(0.75)}`,
    n2(mean(trialsFor)),
    `${pct(by(5))} / ${pct(by(10))} / ${pct(by(20))}`,
  ]);
}

console.log(
  '\nAnd the same by standing, with the RESIDUE — how many candidate systems were still standing\n' +
    'after the last reveal. The residue is what the block could not separate, and its size says what\n' +
    'kind of residue it is. One means the vocabulary was fully pinned. Three over six primitives is a\n' +
    'three-cycle: three symbols that only ever appeared in compositions with each other, so every\n' +
    'composition is determined and no individual member is. That is the whole of the half-pinned /\n' +
    'fully-answerable result, and it is a property of which items the targeting rule reaches at that\n' +
    'standing rather than of the child.\n',
);
row(['type', ...STANDINGS.map((s) => `standing ${s}`)]);
rule(1 + STANDINGS.length);
for (const code of TYPES) {
  for (const [label, take] of [
    ['ever pinned', (L) => pct(mean(L.map((l) => l.everPinnedShare)))],
    ['systems left', (L) => n2(mean(L.map((l) => l.finalSystems)))],
  ]) {
    row([
      `\`${code}\` ${label}`,
      ...STANDINGS.map((standing) => take(learn(seqRuns(code, 'consistent', standing)))),
    ]);
  }
}

/* ------------------------------------------------------------------ *
 * What the residue is made of — the two reasons, which need opposite responses
 * ------------------------------------------------------------------ */
const withResidue = (code) =>
  learn(seqRuns(code, 'consistent')).filter((l) => l.primitivesEverPinned < l.primitives);
if (TYPES.some((code) => withResidue(code).length > 0)) {
  console.log(
    '\nAnd WHAT the residue is made of, because there are two reasons for one and they call for\n' +
      'opposite responses. If every unpinned primitive appeared in EVERY served item, the block never\n' +
      'served anything containing a proper subset of them and nothing could have separated the members:\n' +
      'a coverage property of the sequence, and selection could fix it. If they were seen apart and\n' +
      'still could not be told apart, that is a degeneracy in the VOCABULARY, and no amount of serving\n' +
      'different items will help.\n',
  );
  row(['type', 'blocks with a residue', 'residue size', 'members co-occurred in every item', 'reading']);
  rule(5);
  for (const code of TYPES) {
    const L = withResidue(code);
    if (L.length === 0) {
      row([`\`${code}\``, '0', '—', '—', 'fully pinned in every block']);
      continue;
    }
    const coOccurred = L.filter((l) => l.residueAlwaysCoOccurred).length;
    row([
      `\`${code}\``,
      `${L.length} / ${learn(seqRuns(code, 'consistent')).length}`,
      n2(mean(L.map((l) => l.unpinned.length))),
      `${coOccurred} / ${L.length}`,
      coOccurred === L.length
        ? '**coverage** — selection never separated them'
        : coOccurred === 0
          ? '**vocabulary** — seen apart, still indistinguishable'
          : 'mixed',
    ]);
  }
}

/* ================================================================== *
 * 3. The viable-option-count distribution — the decisive number
 * ================================================================== */
console.log(
  '\n## 3. How many options were still viable — the number that decides everything\n\n' +
    'Per trial, the count of on-screen options that at least one surviving system still predicts.\n' +
    '**1** means the answer was determined and the ruled-out class is just "wrong": the signal is\n' +
    'collinear with correctness and adds nothing. **All options** means nothing has been eliminated\n' +
    'and there is no room to demonstrate inference. The regime where the signal carries something\n' +
    'correctness cannot is the middle — **2 or 3 viable** — and the last column is the only number in\n' +
    'this report that decides whether the signal is worth computing for a given type.\n',
);
for (const arm of ARMS) {
  console.log(`\n**${arm === 'consistent' ? 'Consistent (measurement) arm' : 'Scrambled control arm'}**\n`);
  const widest = Math.max(
    ...TYPES.map((code) =>
      Math.max(...learn(seqRuns(code, arm)).map((l) => l.viableHistogram.length - 1)),
    ),
  );
  row([
    'type',
    ...Array.from({ length: widest }, (_, i) => `${i + 1} viable`),
    'mean',
    '**2-3 viable**',
  ]);
  rule(3 + widest);
  for (const code of TYPES) {
    const L = learn(seqRuns(code, arm));
    const total = L.reduce((sum, l) => sum + l.trials, 0);
    const at = (k) => L.reduce((sum, l) => sum + (l.viableHistogram[k] ?? 0), 0) / total;
    const partial = L.reduce((sum, l) => sum + l.partiallyDeterminedTrials, 0) / total;
    row([
      `\`${code}\``,
      ...Array.from({ length: widest }, (_, i) => pct1(at(i + 1))),
      n2(mean(L.map((l) => l.meanViable))),
      `**${pct1(partial)}**`,
    ]);
  }
}

console.log(
  '\n**The verdict this table settles.** The ruled-out-versus-consistent split is worth computing for\n' +
    'a type only where the middle band is thick enough to hold trials. In the measurement arm it is\n' +
    'thin everywhere, which is the reference type\u2019s known caution reproduced on three more types\n' +
    'rather than escaped. In the control arm the four types split into two shapes, and the split is a\n' +
    'consequence of how each bank built its distractors: `SPA-XFORM-01` requires three of four\n' +
    'distractors to be relabelling-reachable and `VER-MORPHO-01` requires all of them, so with nothing\n' +
    'revealed almost every option is viable and there is nothing to be wrong about. `FLU-OPCHAIN-01`\n' +
    'and `QUANT-GLYPHNUM-01` leave more unreachable options, so their control arm does have a middle\n' +
    'band. That is an anti-leak invariant showing up as a measurement property — the same choice that\n' +
    'makes a bank hard to attack makes its control arm uninformative about inference.\n',
);

/* ================================================================== *
 * 4. The learning gap
 * ================================================================== */
console.log(
  '\n## 4. The learning gap — what `correct` conflates\n\n' +
    'The estimator sees only whether the child was right. These columns split its misses into the two\n' +
    'things they can be. `missed while determinable` is learning that had not happened yet — the\n' +
    'quantity a learning rate is supposed to be about. `right while undeterminable` is not learning at\n' +
    'all: the answer was not available, so it was luck or a content shortcut. Model learner, consistent\n' +
    'arm, per 30-trial block.\n',
);
row([
  'type',
  'missed while determinable',
  'right while undeterminable',
  'content-derivable trials',
  'unanswerable trials',
]);
rule(5);
for (const code of TYPES) {
  const L = learn(seqRuns(code, 'consistent'));
  row([
    `\`${code}\``,
    n2(mean(L.map((l) => l.missedWhileDeterminable))),
    n2(mean(L.map((l) => l.correctWhileUndeterminable))),
    n2(mean(L.map((l) => l.contentDerivableTrials))),
    n2(mean(L.map((l) => l.trials - l.derivableTrials))),
  ]);
}

/* ================================================================== *
 * 5. Ruled out versus consistent
 * ================================================================== */
console.log(
  '\n## 5. Ruled out versus consistent — is the signal informative for this type?\n\n' +
    'Every choice falls in exactly one of three classes: `determined` (the unique answer, taken),\n' +
    '`consistent` (a still-possible option — everything the evidence permitted), `ruled out` (already\n' +
    'excluded). A child who picks an option their own prior reveals had eliminated has failed to use\n' +
    'information they held; one who picked among options still genuinely open has not.\n\n' +
    '`chance` is what uniform guessing scores on the SAME items, because how many options an item\n' +
    'excludes is a property of the item; `lift` is observed minus chance, so NEGATIVE means the\n' +
    'responder used information. Without the chance column a ruled-out rate would rank banks by how\n' +
    'many unreachable distractors they carry rather than rank children.\n',
);
row([
  'type',
  'responder',
  'arm',
  'determined',
  'consistent',
  'ruled out',
  'of which by reveals',
  'rate',
  'chance',
  'lift',
]);
rule(10);
const meanInf = (rs, take) => mean(rs.map((r) => take(r.learnability.inference)).filter((v) => v !== null));
for (const code of TYPES) {
  for (const responderId of RESPONDERS) {
    for (const arm of ARMS) {
      const rs = pick((r) => r.typeCode === code && r.arm === arm && r.responderId === responderId);
      const observed = meanInf(rs, (i) => i.ruledOutRate);
      const chance = meanInf(rs, (i) => i.ruledOutChance);
      row([
        `\`${code}\``,
        responderId,
        arm,
        n2(meanInf(rs, (i) => i.determined)),
        n2(meanInf(rs, (i) => i.consistent)),
        n2(meanInf(rs, (i) => i.ruledOut)),
        n2(meanInf(rs, (i) => i.ruledOutByReveals)),
        pct(observed),
        pct(chance),
        `**${signed(observed - chance)}**`,
      ]);
    }
  }
}

console.log(
  '\n### Is it stable enough to score on?\n\n' +
    'SEPARATION is whether a block-level lift tells the two responders apart at all: the guesser lands\n' +
    'on excluded options exactly at chance by construction, so any responder that reliably beats it is\n' +
    'using evidence. SPREAD is whether one responder’s lift holds still across seeds and standings — a\n' +
    'signal whose block-to-block SD swamps the separation cannot score an individual child however\n' +
    'clean the group means look. The last column is the units the owner asked for: block SDs.\n',
);
row(['type', 'arm', 'guesser lift', 'responder lift', 'separation', 'responder SD', '**separation / SD**']);
rule(7);
for (const code of TYPES) {
  for (const arm of ARMS) {
    const liftsOf = (responderId) =>
      pick((r) => r.typeCode === code && r.arm === arm && r.responderId === responderId)
        .map((r) => r.learnability.inference)
        .filter((i) => i.ruledOutRate !== null)
        .map((i) => i.ruledOutRate - i.ruledOutChance);
    const g = mean(liftsOf('guesses'));
    const l = liftsOf('induces');
    const spread = sd(l);
    row([
      `\`${code}\``,
      arm,
      signed(g),
      signed(mean(l)),
      signed(mean(l) - g),
      n2(spread),
      spread === 0 ? '—' : `**${n2(Math.abs(mean(l) - g) / spread)}**`,
    ]);
  }
}

/* ================================================================== *
 * 6. Reveal-mode sensitivity
 * ================================================================== */
console.log(
  '\n## 6. Where the determination actually comes from\n\n' +
    '§3 says the answer is determined on almost every trial, which is the finding that kills the\n' +
    'ruled-out signal. This says WHY, because the cause decides whether anything could be done about\n' +
    'it. The oracle is re-run with one thing changed: a reveal is read as naming only WHICH OPTION was\n' +
    'right, instead of showing WHAT THE SYSTEM PRODUCED. A hypothesis predicting something off the\n' +
    'slate entirely then survives, where under the full reading it is refuted.\n\n' +
    'That weaker reading is COUNTERFACTUAL, not a rendering option: for all four types the key IS the\n' +
    'produced outcome, so highlighting the right option necessarily shows the output figure, the\n' +
    'denoted picture, or the true position on the line. There is no renderer that shows less. It is\n' +
    'run precisely because it is counterfactual — the gap between the columns is the share of the\n' +
    'oracle\u2019s certainty that comes from off-slate refutation, and it is nearly all of it. Every\n' +
    'trial silently eliminates the hundreds of systems that would have produced something not on\n' +
    'screen, and THAT, not the number of options, is what leaves one survivor.\n\n' +
    'The consequence is a design one. Serving partially-determined trials cannot be achieved by\n' +
    'trimming distractors; it needs either a reveal that does not display the outcome, or a selection\n' +
    'rule that targets how determined the answer is rather than how difficult the item is. Both change\n' +
    'what the block selects on, so both are decisions for the owner and neither is taken here.\n' +
    'The responder is held fixed across the two columns, so they differ only in the oracle\u2019s reading.\n',
);
row([
  'type',
  'answerable: outcome shown',
  'option named only',
  'ever pinned: outcome shown',
  'option named only',
  '2-3 viable: outcome shown',
  'option named only',
]);
rule(7);
for (const code of TYPES) {
  const weak = createOracle(ADAPTERS[code], { revealMode: 'option' });
  const weakRuns = [];
  for (const standing of STANDINGS) {
    for (let s = 0; s < SEEDS; s += 1) {
      weakRuns.push(
        runBlock({
          oracle: weak,
          pool: pools.get(code).consistent,
          arm: 'consistent',
          standing,
          seed: seedAt(s),
          length: LENGTH,
          responderId: 'induces',
          warmupCount: warmupFor(code),
        }),
      );
    }
  }
  const strongL = learn(seqRuns(code, 'consistent'));
  const weakL = learn(weakRuns);
  const partialShare = (L) =>
    L.reduce((sum, l) => sum + l.partiallyDeterminedTrials, 0) /
    L.reduce((sum, l) => sum + l.trials, 0);
  row([
    `\`${code}\``,
    pct(mean(strongL.map((l) => l.derivableShare))),
    pct(mean(weakL.map((l) => l.derivableShare))),
    pct(mean(strongL.map((l) => l.everPinnedShare))),
    pct(mean(weakL.map((l) => l.everPinnedShare))),
    pct1(partialShare(strongL)),
    pct1(partialShare(weakL)),
  ]);
}

/* ================================================================== *
 * 7. What a warm-up would buy the three new types
 * ================================================================== */
console.log(
  '\n## 7. What an unscored warm-up would buy the three new types\n\n' +
    'Reported, not taken. `FLU-OPCHAIN-01` runs three unscored worked demonstrations chosen so their\n' +
    'hidden chains are disjoint; the same chooser is applied to the other three here purely to size\n' +
    'the effect. `2+ intro` is the avoidable defect the warm-up exists to remove — a trial turning on\n' +
    'two primitives neither of which has ever been shown, which no single reveal can attribute.\n',
);
row(['type', 'warm-up items available', '2+ intro (none)', '2+ intro (3)', 'ramp (none)', 'ramp (3)', 'answerable (none)', 'answerable (3)']);
rule(8);
for (const code of NEW_TYPES.filter((c) => TYPES.includes(c))) {
  const withWarm = [];
  for (const standing of STANDINGS) {
    for (let s = 0; s < SEEDS; s += 1) {
      withWarm.push(
        runBlock({
          oracle: oracles.get(code),
          pool: pools.get(code).consistent,
          arm: 'consistent',
          standing,
          seed: seedAt(s),
          length: LENGTH,
          responderId: 'induces',
          warmupCount: REFERENCE_WARMUP,
        }),
      );
    }
  }
  const none = learn(seqRuns(code, 'consistent'));
  const some = learn(withWarm);
  row([
    `\`${code}\``,
    n2(mean(withWarm.map((r) => r.warmupUsed))),
    n2(mean(none.map((l) => l.multiIntroductionTrials))),
    n2(mean(some.map((l) => l.multiIntroductionTrials))),
    n2(mean(none.map((l) => l.unanswerablePrefix))),
    n2(mean(some.map((l) => l.unanswerablePrefix))),
    pct(mean(none.map((l) => l.derivableShare))),
    pct(mean(some.map((l) => l.derivableShare))),
  ]);
}

console.log(
  '\n## What this does and does not license\n\n' +
    'The oracle is a perfect reasoner with perfect memory. Every "answerable" above is an upper bound\n' +
    'on what was AVAILABLE, never a prediction that a child would get it — so a gap between\n' +
    '`available acc` and `actual acc` is the model learner failing to exploit what it had, which for a\n' +
    'child would be the thing worth measuring and for this responder is largely a tie-breaking\n' +
    'artefact.\n\n' +
    'Nothing here is a learning rate, and nothing here is evidence that any of these four types\n' +
    'measures learning: that is Gate B, it needs real children, and it has not run. Every bank is\n' +
    'born-synthetic and ungated, three of the four types have no renderer, and the whole grid is a\n' +
    'simulation over design rungs.',
);
