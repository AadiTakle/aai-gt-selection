// The graded content-only attacker on a FLU-OPCHAIN-01 bank, measured per difficulty slice.
//
// WHY THIS IS A SEPARATE FILE AND NOT A LINE IN THE GENERATOR. The generator prints the same audit
// for the bank it has just written, and check-FLU-OPCHAIN-01.mjs re-derives it from the shipped
// items. Neither can measure a bank the generator no longer builds. A before/after on an anti-leak
// invariant is only worth reading if both sides came out of ONE piece of code, so this probe takes a
// bank path as an argument and knows nothing about which version produced it.
//
// THE ATTACK, STATED EXACTLY. A client holds `content`: the input figure, the badge chain, the badge
// tray and five candidate output figures. It does NOT hold the badge->operator mapping, which lives
// under `answer.system` and which `servedItemSchema` omits wholesale. So it enumerates the mapping.
// A mapping is a badge->operator bijection over six symbols and the badges inside a chain are
// distinct, so guessing it is exactly guessing an ordered selection of `depth` distinct operators
// for the chain's positions — 6·5·4·3 = 360 at depth 4, at most. Each such relabelling produces one
// output figure; if that figure is on screen, the relabelling VOTES for that option. The 720 full
// bijections project onto these with a constant multiplicity of (6 − depth)!, so the vote RATIOS are
// identical and this enumeration is the client's entire posterior over which option is the key.
//
// Three strategies are scored, not one, because an attacker picks whichever works and reporting only
// the weakest would be choosing one's own evidence:
//
//   uniform     guess evenly among the options that survive the brute force. Scores 1/|survivors|,
//               because the true mapping is always in the enumeration so the key always survives.
//   modal       take the survivor the most relabellings point at, splitting ties.
//   anti-modal  take the survivor the fewest point at. This is in the list because forcing the key
//               never to be modal is exactly the over-correction that would make anti-modal win, so
//               a generator that optimised against `modal` alone could report a clean figure while
//               leaking through the other tail.
//
// AND THE ONE THAT MATTERS MOST, because the three above are a hand-picked subset of a family and
// reporting only a subset is choosing one's own evidence:
//
//   shape-conditional  modal and anti-modal are the first and last of FIVE vote ranks, and every one
//               of them is available to a client. Worse, the client also sees the whole sorted vote
//               vector — the SHAPE — so it can run a different rank depending on the shape it is
//               looking at. This strategy groups the slice by exact vote shape and, within each
//               group, takes the rank tier that is the key most often. It is the best any
//               permutation-invariant content-only attacker can do, and it strictly dominates the
//               three above. Where it exceeds them, the residual is a PATTERN in where the key sits
//               among the vote counts, not merely a magnitude — and a pattern is what a browser
//               script can actually exploit.
//
//               It is fitted on the same slice it scores, so on a shape group of one item it reads
//               100% by construction. The group sizes are printed for exactly that reason: read it
//               as an upper bound that tightens as the groups get bigger.
//
// THE AGGREGATION, WHICH IS NOT A DETAIL. The graded figure is the maximum of the three strategy
// MEANS over a slice — not the mean of the per-item maximum. An attacker picks one strategy and runs
// it; it cannot know, item by item, which of the three happens to hit, because knowing that is
// knowing the key. So the honest figure is "the best a single fixed strategy scores over this
// slice", chosen with hindsight across the three. The mean of per-item maxima is reported separately
// below as a per-item ORACLE, clearly labelled, because it is a real upper bound but it credits the
// attacker with a choice it cannot make.
//
// This is the aggregation QUANT-GLYPHNUM-01's audit used, and it is what reproduces the two figures
// already published for this type: 28.2% over the bank and 34.0% in its hardest slice.
//
// The floor is 20.0%: five options, all surviving, all equally backed — the only configuration in
// which the brute force returns nothing at all.
//
// SLICED BY DIFFICULTY, because the learning block serves systematically different slices to
// different children, so a leak concentrated in the hardest slice is invisible in a bank mean and
// lands on exactly the children the measurement is about. The slice edges are the ones
// QUANT-GLYPHNUM-01's audit used, so the figures are comparable across the three Stage 2 types
// without re-deriving anybody's table.
//
// Run:  node research/exam-question-types/gate-a/opchain-attacker-probe.mjs [bank.jsonl ...]
//       defaults to both arms of the shipped bank.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ---- operator semantics, re-implemented rather than imported ---------------- *
 * This is an audit of the shipped bank. Importing the generator's own `applyOp` would make a
 * generator that is wrong about D4 agree with itself, which is the one thing the probe exists to
 * rule out. */
const GEOM = ['turn', 'flip', 'slant'];
const ALL_OPS = [...GEOM, 'swap', 'ring', 'twin'];
const ELEMENT = { turn: { a: 1, b: 0 }, flip: { a: 0, b: 1 }, slant: { a: 1, b: 1 } };

/** D4 as r^a m^b under the relation m r = r^-1 m. */
const dcompose = (g, o) => ({
  a: (((g.a + (g.b ? -o.a : o.a)) % 4) + 4) % 4,
  b: (g.b + o.b) % 2,
});

function step(op, fig) {
  if (GEOM.includes(op)) return { ...fig, orient: dcompose(ELEMENT[op], fig.orient) };
  if (op === 'swap') return { ...fig, shade: fig.shade === 'solid' ? 'hollow' : 'solid' };
  if (op === 'ring') return { ...fig, border: fig.border ? 0 : 1 };
  if (op === 'twin') return { ...fig, pair: fig.pair ? 0 : 1 };
  throw new Error(`unknown operator "${op}"`);
}

const fkey = (f) =>
  `${f.glyph}|${f.orient.a}${f.orient.b}|${f.shade}|${f.border}|${f.pair}`;

/**
 * Every output reachable by relabelling, with the number of relabellings that reach it.
 *
 * Exported so the generator and the checker can state their invariants in the same currency the
 * probe measures them in, and so a mismatch between the three is a test failure rather than a
 * discrepancy nobody notices.
 */
export function relabelVotes(depth, input) {
  const votes = new Map();
  const used = new Set();
  const walk = (position, state) => {
    if (position === depth) {
      const k = fkey(state);
      votes.set(k, (votes.get(k) ?? 0) + 1);
      return;
    }
    for (const op of ALL_OPS) {
      if (used.has(op)) continue;
      used.add(op);
      walk(position + 1, step(op, state));
      used.delete(op);
    }
  };
  walk(0, input);
  return votes;
}

/**
 * The three strategies on one item, given each option's vote count and which option is the key.
 *
 * Returns the per-strategy accuracy AND the maximum, so the report can show which tail a residual
 * sits in rather than only how big it is.
 */
export function attackerAccuracy(backing, keyIndex) {
  const survivors = backing.map((n, i) => ({ n, i })).filter((s) => s.n > 0);
  if (survivors.length === 0) return { uniform: 1, modal: 1, antiModal: 1, best: 1, survivors: 0 };
  const keySurvives = backing[keyIndex] > 0;
  const pick = (target) => {
    const tied = survivors.filter((s) => s.n === target);
    return tied.some((s) => s.i === keyIndex) ? 1 / tied.length : 0;
  };
  const uniform = keySurvives ? 1 / survivors.length : 0;
  const modal = pick(Math.max(...survivors.map((s) => s.n)));
  const antiModal = pick(Math.min(...survivors.map((s) => s.n)));
  return {
    uniform,
    modal,
    antiModal,
    best: Math.max(uniform, modal, antiModal),
    survivors: survivors.length,
  };
}

/**
 * The key's rank TIER among the five sorted vote counts, and how many options share it.
 *
 * Ties are why this is a tier rather than a rank: options backed by the same number of relabellings
 * are indistinguishable to the attacker, so the finest thing it can name is "the t-th distinct vote
 * value, counting down". Picking uniformly inside that tier scores 1/|tier|.
 */
export function keyTier(backing, keyIndex) {
  const distinct = [...new Set(backing)].sort((a, b) => b - a);
  const tier = distinct.indexOf(backing[keyIndex]);
  return { tier, tiers: distinct.length, size: backing.filter((v) => v === backing[keyIndex]).length };
}

/** The sorted vote vector — everything a permutation-invariant attacker can condition on. */
export const voteShape = (backing) => [...backing].sort((a, b) => b - a).join(',');

/**
 * The best permutation-invariant content-only attacker over a set of items.
 *
 * For each vote shape, the attacker picks one rank tier and guesses uniformly inside it. The best
 * choice for that shape is the tier maximising the expected hit rate over the items carrying it.
 */
export function shapeConditionalAttack(entries) {
  const groups = new Map();
  for (const e of entries) {
    const g = groups.get(e.shape) ?? { n: 0, byTier: new Map(), sizes: new Map() };
    g.n += 1;
    g.byTier.set(e.tier, (g.byTier.get(e.tier) ?? 0) + 1);
    g.sizes.set(e.tier, e.size);
    groups.set(e.shape, g);
  }
  let hits = 0;
  for (const g of groups.values()) {
    let best = 0;
    for (const [tier, count] of g.byTier) best = Math.max(best, count / g.sizes.get(tier));
    hits += best;
  }
  return { accuracy: entries.length === 0 ? 0 : hits / entries.length, groups: groups.size };
}

/** QUANT-GLYPHNUM-01's slice edges, kept identical so the three types' tables can be compared. */
const SLICES = [
  [1, 5],
  [5, 10],
  [10, 15],
  [15, 20.01],
];

export function auditBank(items) {
  const rows = SLICES.map(([lo, hi]) => ({
    lo,
    hi,
    n: 0,
    sole: 0,
    survivors: 0,
    uniform: 0,
    modal: 0,
    antiModal: 0,
    oracle: 0,
    certain: 0,
    entries: [],
  }));

  for (const item of items) {
    const row = rows.find((r) => item.difficulty >= r.lo && item.difficulty < r.hi);
    if (!row) throw new Error(`difficulty ${item.difficulty} falls outside every slice`);

    const input = item.content.input;
    const options = item.content.options;
    const votes = relabelVotes(item.content.chain.length, input);
    const backing = options.map((o) => votes.get(fkey(o.figure)) ?? 0);
    const keyIndex = options.findIndex((o) => o.key === item.answer.correctKey);
    if (keyIndex < 0) throw new Error(`correctKey ${item.answer.correctKey} names no option`);
    // The true mapping is one of the relabellings enumerated, so the key must be reachable. If it
    // is not, the bank's own answer key disagrees with the operator semantics re-implemented here.
    if (backing[keyIndex] === 0) {
      throw new Error(`item ${item.itemId}: the key is not reachable under any relabelling`);
    }

    const score = attackerAccuracy(backing, keyIndex);
    row.n += 1;
    row.survivors += score.survivors;
    if (score.survivors < 2) row.sole += 1;
    row.uniform += score.uniform;
    row.modal += score.modal;
    row.antiModal += score.antiModal;
    row.oracle += score.best;
    // An item on which SOME single strategy is certain. Not a determined item — the key still has
    // rivals — but an attacker running that one strategy takes it every time, so it is the per-item
    // residue the slice mean averages away.
    if (score.best >= 1 - 1e-9) row.certain += 1;
    row.entries.push({ shape: voteShape(backing), ...keyTier(backing, keyIndex) });
  }

  return rows.filter((r) => r.n > 0);
}

const pct = (x) => `${(100 * x).toFixed(1)}%`;

/**
 * The published figure: the best a single FIXED strategy scores over the slice, now including the
 * shape-conditional family that dominates the other three.
 */
const gradedFigure = (r) =>
  Math.max(
    r.uniform / r.n,
    r.modal / r.n,
    r.antiModal / r.n,
    shapeConditionalAttack(r.entries).accuracy,
  );

export function reportBank(label, items) {
  const rows = auditBank(items);
  const total = rows.reduce((a, r) => a + r.n, 0);
  const agg = (f) => rows.reduce((a, r) => a + f(r), 0);
  const whole = {
    n: total,
    sole: agg((r) => r.sole),
    survivors: agg((r) => r.survivors),
    uniform: agg((r) => r.uniform),
    modal: agg((r) => r.modal),
    antiModal: agg((r) => r.antiModal),
    oracle: agg((r) => r.oracle),
    certain: agg((r) => r.certain),
    entries: rows.flatMap((r) => r.entries),
  };

  console.log(`\n${label} — ${total} items`);
  console.log(
    '| difficulty slice | n | determined | mean survivors | uniform | modal | anti-modal | shape-cond. | GRADED | per-item oracle |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const line = (name, r) => {
    const shaped = shapeConditionalAttack(r.entries);
    console.log(
      `| ${name} | ${r.n} | ${r.sole} | ${(r.survivors / r.n).toFixed(2)} / 5 | ` +
        `${pct(r.uniform / r.n)} | ${pct(r.modal / r.n)} | ${pct(r.antiModal / r.n)} | ` +
        `${pct(shaped.accuracy)} (${shaped.groups} shapes) | **${pct(gradedFigure(r))}** | ` +
        `${pct(r.oracle / r.n)} |`,
    );
  };
  for (const r of rows) line(`${r.lo}–${r.hi === 20.01 ? 20 : r.hi}`, r);
  line('**whole bank**', whole);

  const worst = rows.reduce((a, r) => (gradedFigure(r) > gradedFigure(a) ? r : a));
  console.log(
    `\n  determined items (a single surviving option): ${whole.sole} / ${total}\n` +
      `  items on which one strategy is CERTAIN: ${whole.certain} / ${total}\n` +
      `  GRADED attacker, whole bank: ${pct(gradedFigure(whole))} against a 20.0% five-option floor\n` +
      `  GRADED attacker, HARDEST slice (${worst.lo}–${worst.hi === 20.01 ? 20 : worst.hi}): ` +
      `${pct(gradedFigure(worst))}`,
  );

  // The shape table is where a residual is diagnosable rather than merely visible: a shape whose key
  // sits in one tier every time is an exploitable pattern, and one whose key spreads across tiers in
  // proportion to tier size is not.
  const byShape = new Map();
  for (const e of whole.entries) {
    const g = byShape.get(e.shape) ?? { n: 0, tiers: e.tiers, byTier: new Map() };
    g.n += 1;
    g.byTier.set(e.tier, (g.byTier.get(e.tier) ?? 0) + 1);
    byShape.set(e.shape, g);
  }
  const informative = [...byShape.entries()].filter(([, g]) => g.tiers > 1);
  console.log(
    `\n  vote shapes: ${byShape.size} distinct, of which ${informative.length} carry more than one ` +
      `rank tier (a single-tier shape is zero information — every option equally backed).`,
  );
  for (const [shape, g] of informative.sort((a, b) => b[1].n - a[1].n)) {
    console.log(
      `    [${shape}] n=${g.n}  key tier counts ${JSON.stringify(
        [...g.byTier.entries()].sort((a, b) => a[0] - b[0]),
      )}`,
    );
  }

  return {
    total,
    sole: whole.sole,
    certain: whole.certain,
    bank: gradedFigure(whole),
    worstSlice: gradedFigure(worst),
    worstSliceLabel: `${worst.lo}–${worst.hi === 20.01 ? 20 : worst.hi}`,
    rows,
  };
}

function readBank(path) {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isMain()) {
  const paths =
    process.argv.slice(2).length > 0
      ? process.argv.slice(2)
      : [
          resolve(__dirname, '../banks/FLU-OPCHAIN-01.jsonl'),
          resolve(__dirname, '../control-banks/FLU-OPCHAIN-01.perTrial.jsonl'),
        ];
  console.log(
    'FLU-OPCHAIN-01 — graded content-only attacker (every badge->operator relabelling brute-forced).\n' +
      'GRADED is the best a single FIXED strategy scores over the slice, which is the figure to hold\n' +
      'the design to. The per-item oracle credits the attacker with picking the winning strategy item\n' +
      'by item, which requires knowing the key; it is an upper bound, not an achievable score.\n' +
      'Floor: 20.0% (five options, all surviving, all equally backed).',
  );
  for (const path of paths) reportBank(path.replace(/^.*\//, ''), readBank(path));
}
