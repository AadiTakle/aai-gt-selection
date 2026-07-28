// FLU-LADDER-01 "Ranking Ladder" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Replicates the FLU-MATRIX-01 reference
// vertical for a transitive-inference ranking task: a seeded pairwise-comparison
// grammar whose difficulty is DERIVED from the type's declared difficulty_levers and
// mapped onto a FLOAT 1..20 rung.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (relational-complexity model), NOT a calibrated
// IRT parameter (EXAM_ITEM_SCHEMA_SPEC §6.6, RES-012/RES-013). The answer key +
// distractor rationales are server-only and never placed in the renderable content.
//
// Grammar mirrors demos/FLU-LADDER-01.html: a hidden total order over n characters is
// revealed by "A ranks above B" clue cards (all adjacent links, plus redundant
// transitive links at higher difficulty). To fit the deterministic-key contract the
// item is posed as a multiple-choice over candidate full orderings; the child picks the
// one ordering consistent with every clue. Distractors are keyed to the type's error
// taxonomy (adjacent-swap near-miss, one-element chain break, reversed, cyclic shift)
// per Halford relational-complexity + the spec's tail_precision_rationale.
//
// Run:  node research/exam-question-types/generators/FLU-LADDER-01.mjs
//       writes ../banks/FLU-LADDER-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Character space (renderer-agnostic; each ranks by identity, not appearance).
 * Characters differ by SHAPE (not colour alone) per the spec's colour-vision note.
 * ------------------------------------------------------------------ */
export const CHARACTERS = [
  { id: 'tri', shape: 'triangle', color: 'coral' },
  { id: 'pen', shape: 'pentagon', color: 'teal' },
  { id: 'hex', shape: 'hexagon', color: 'blue' },
  { id: 'kit', shape: 'kite', color: 'gold' },
  { id: 'drp', shape: 'drop', color: 'violet' },
  { id: 'str', shape: 'star', color: 'ink' },
];

/* ------------------------------------------------------------------ *
 * Seeded RNG (xmur3 -> mulberry32) for reproducible, born-synthetic content.
 * ------------------------------------------------------------------ */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seed) {
  return mulberry32(xmur3(seed)());
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/* ------------------------------------------------------------------ *
 * KEY-POSITION BALANCE (E-073)
 * Shuffling every item's options independently still leaves the correct key's
 * POSITION uneven over a bank, and an uneven pseudo-guessing floor inflates
 * low-ability accuracy (M-ACC) and makes raw accuracy non-comparable across
 * types. The bank builder hands each item a target slot from a least-loaded
 * allocator and the item seats its correct option there. The option SET, the
 * distractors and the difficulty levers are untouched.
 *
 * Slots are allocated uniformly WITHIN each option-count stratum first and only
 * then balanced across the whole bank. Option count is itself a difficulty
 * lever, so balancing the pooled key counts alone would make the last slot of
 * the rarer long items almost always correct — a larger exploit than the one
 * being fixed.
 * ------------------------------------------------------------------ */
function makeSlotAllocator(maxSlots) {
  const globalUse = new Array(maxSlots).fill(0);
  const byOptionCount = new Map();
  let tick = 0;
  return (n) => {
    if (!byOptionCount.has(n)) byOptionCount.set(n, new Array(n).fill(0));
    const localUse = byOptionCount.get(n);
    let best = tick % n;
    for (let k = 1; k < n; k++) {
      const i = (tick + k) % n;
      if (localUse[i] < localUse[best] || (localUse[i] === localUse[best] && globalUse[i] < globalUse[best])) best = i;
    }
    tick++;
    localUse[best]++;
    globalUse[best]++;
    return best;
  };
}
// Seat the correct entry of an already-shuffled list at `slot`, leaving the
// distractors in their shuffled relative order. `slot` is either a resolved
// index or the allocator callback, which is handed this item's option count.
function seatCorrect(list, isCorrect, slot) {
  const ci = list.findIndex(isCorrect);
  const at = typeof slot === 'function' ? slot(list.length) : slot;
  if (ci < 0 || !Number.isInteger(at) || at < 0 || at >= list.length) return { list, slot: ci };
  const rest = list.filter((_, i) => i !== ci);
  return { list: [...rest.slice(0, at), list[ci], ...rest.slice(at)], slot: at };
}

function seededUuid(seed) {
  const rng = makeRng('uuid|' + seed);
  const hex = [];
  for (let i = 0; i < 32; i++) hex.push(Math.floor(rng() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;

/* ================================================================== *
 * DIFFICULTY MODEL — difficulty derives from the type's difficulty_levers
 * (types_fluid_reasoning.jsonl FLU-LADDER-01):
 *   chain length (items in the order) | number of relations integrated |
 *   redundant vs minimal clue sets | adjacent vs non-adjacent | distractor closeness.
 * Grounded in relational-complexity theory (Halford 1998; Andrews & Halford 2002):
 * difficulty is set by how many relations must be bound at once. We map lever
 * settings onto a raw score, then linearly onto a FLOAT 1..20 rung (BUILD_PLAN §0).
 * ================================================================== */
const RC_STEP = 4.0; // relational-complexity cost per extra item beyond 3
const REDUND = 1.2; // integration cost per redundant (transitive) clue
const DISTRACTOR_SPAN = 3.6; // distractor-closeness lever contributes 0..3.6
const chainTerm = (n) => RC_STEP * (n - 3);
const redundancyTerm = (extra) => REDUND * extra;
const distractorTerm = (similarity) => DISTRACTOR_SPAN * similarity;

function baseScore(n, extra) {
  return 1.0 + chainTerm(n) + redundancyTerm(extra);
}

// Max redundant (non-adjacent) clues available for a chain of length n.
export function maxExtra(n) {
  return ((n - 1) * (n - 2)) / 2;
}

// Allowed lever configs (chain length x redundant-clue count), curated so their bases
// tile 1..20 when combined with the continuous distractor-closeness fine-positioner.
export const ALLOWED_CONFIGS = [
  { n: 3, extra: 0 },
  { n: 3, extra: 1 },
  { n: 4, extra: 0 },
  { n: 4, extra: 1 },
  { n: 4, extra: 2 },
  { n: 5, extra: 0 },
  { n: 5, extra: 1 },
  { n: 5, extra: 2 },
  { n: 6, extra: 0 },
  { n: 6, extra: 1 },
  { n: 6, extra: 2 },
  { n: 6, extra: 3 },
];

const RAW_MIN = Math.min(...ALLOWED_CONFIGS.map((c) => baseScore(c.n, c.extra))) + distractorTerm(0);
const RAW_MAX = Math.max(...ALLOWED_CONFIGS.map((c) => baseScore(c.n, c.extra))) + distractorTerm(1);

function rawScore(n, extra, similarity) {
  return baseScore(n, extra) + distractorTerm(similarity);
}
export function difficultyFromLevers(n, extra, similarity) {
  const raw = rawScore(n, extra, similarity);
  const d = 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN);
  return clamp(d, 1, 20);
}
function solveSimilarity(n, extra, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(n, extra)) / DISTRACTOR_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — build the clue set + candidate orderings (mirrors demo semantics).
 * The true total order is a permutation; clues are "above ranks higher than below".
 * ================================================================== */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const sameOrder = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

function swapAdjacent(order, p) {
  const a = order.slice();
  [a[p], a[p + 1]] = [a[p + 1], a[p]];
  return a;
}
function moveOne(order, from, to) {
  const a = order.slice();
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}
const reverseOrder = (order) => order.slice().reverse();
const cyclicShift = (order) => order.slice(1).concat(order.slice(0, 1));

/**
 * Generate ONE structured BankItem.
 * @param {{n:number, extra:number, distractorSimilarity:number, keyPosition:(number|Function), seed:string}} lever
 */
export function genItem({ n, extra, distractorSimilarity, keyPosition, seed }) {
  const rng = makeRng(seed);
  const cast = shuffle(CHARACTERS, rng).slice(0, n); // characters in this item
  const trueOrder = shuffle(cast, rng); // top (index 0) ranks highest
  const trueIds = trueOrder.map((c) => c.id);

  // Clues: every adjacent link (guarantees a UNIQUE total order) + `extra` redundant
  // non-adjacent transitive links (consistent; add integration load, not ambiguity).
  const clues = [];
  for (let i = 0; i < n - 1; i++) clues.push({ above: trueIds[i], below: trueIds[i + 1] });
  const nonAdjacent = [];
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) nonAdjacent.push([i, j]);
  const chosenExtra = shuffle(nonAdjacent, rng).slice(0, clamp(extra, 0, nonAdjacent.length));
  for (const [i, j] of chosenExtra) clues.push({ above: trueIds[i], below: trueIds[j] });
  const shownClues = shuffle(clues, rng); // scrambled so the chain is not read off directly

  // Option pool (candidate orderings) with error-taxonomy lure tags.
  const pool = [];
  const push = (order, lure, detail) => {
    if (pool.some((o) => sameOrder(o.order, order))) return false;
    pool.push({ order: order.slice(), lure, detail: detail ?? null });
    return true;
  };
  push(trueIds, 'correct', null);

  // NEAR foils: violate exactly/nearly one relation (latent ability just below the cut).
  const nearFoils = [];
  for (let p = 0; p < n - 1; p++) nearFoils.push(() => push(swapAdjacent(trueIds, p), 'adjacent_swap', p));
  // one-element chain break: lift the top or bottom and reinsert one slot in.
  nearFoils.push(() => push(moveOne(trueIds, 0, 1), 'chain_break', 'top'));
  nearFoils.push(() => push(moveOne(trueIds, n - 1, n - 2), 'chain_break', 'bottom'));

  // FAR foils: violate many relations (random-order signature).
  const farFoils = [];
  farFoils.push(() => push(reverseOrder(trueIds), 'reversed', null));
  farFoils.push(() => push(cyclicShift(trueIds), 'cyclic_shift', null));
  farFoils.push(() => push(moveOne(trueIds, 0, n - 1), 'chain_break', 'top-to-bottom'));

  const nOptions = 4;
  const wantNear = clamp(Math.round(distractorSimilarity * (nOptions - 1)), 0, nOptions - 1);
  for (const f of nearFoils) {
    if (pool.length - 1 >= wantNear) break;
    f();
  }
  for (const f of farFoils) {
    if (pool.length >= nOptions) break;
    f();
  }
  for (const f of nearFoils) {
    if (pool.length >= nOptions) break;
    f();
  }
  // Safety top-up: additional distinct adjacent swaps / moves until we reach nOptions.
  let guard = 0;
  while (pool.length < nOptions && guard < 40) {
    const p = guard % Math.max(1, n - 1);
    push(swapAdjacent(trueIds, p), 'adjacent_swap', p) || push(moveOne(trueIds, 0, 1 + (guard % (n - 1))), 'chain_break', 'top');
    guard++;
  }

  const seated = seatCorrect(shuffle(pool, rng), (o) => o.lure === 'correct', keyPosition);
  const shuffledPool = seated.list;
  const options = shuffledPool.map((o, i) => ({ key: OPTION_KEYS[i], order: o.order.slice() }));

  // Server-only answer + distractor taxonomy (keyed to ordering errors).
  let correctKey = null;
  const distractorRationales = {};
  shuffledPool.forEach((o, i) => {
    const key = OPTION_KEYS[i];
    if (o.lure === 'correct') {
      correctKey = key;
      distractorRationales[key] = { lure: 'correct', note: `the unique total order consistent with all ${clues.length} relation(s)` };
    } else if (o.lure === 'adjacent_swap') {
      distractorRationales[key] = { lure: 'adjacent_swap', position: o.detail, note: `near-miss: swaps the pair at ranks ${o.detail + 1}/${o.detail + 2} (violates exactly one relation)` };
    } else if (o.lure === 'chain_break') {
      distractorRationales[key] = { lure: 'chain_break', where: o.detail, note: `one element displaced (${o.detail}) — an incomplete integration of the chain` };
    } else if (o.lure === 'reversed') {
      distractorRationales[key] = { lure: 'reversed', note: 'full reversal — every relation violated (misread the direction of the comparison)' };
    } else {
      distractorRationales[key] = { lure: 'cyclic_shift', note: 'cyclic shift of the order — a rotation error violating several relations' };
    }
  });

  const difficulty = round2(difficultyFromLevers(n, extra, distractorSimilarity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-LADDER-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-LADDER-01.html',
    content: {
      typeCode: 'FLU-LADDER-01',
      n,
      chainLength: n,
      relationCount: clues.length,
      characters: cast.map((c) => ({ id: c.id, shape: c.shape, color: c.color })),
      clues: shownClues.map((c) => ({ above: c.above, below: c.below })), // "above" ranks higher
      options, // display order; each option is a full ordering (top -> bottom = highest -> lowest)
    },
    answer: {
      correctKey,
      distractorRationales, // keyed by option key -> ordering-error taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-ladder-01-grammar@1',
      seed,
      levers: {
        n,
        extra,
        relationCount: clues.length,
        keyPosition: seated.slot, // resolved slot; replays the balanced key position
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung. This type EXCLUDES K-1 by design
// (spec age_rationale: transitive integration is fragile before ~age 6-7); declared
// bands are 2-3 | 4-5 | 6-8. Boundary overlap reflects a targeting hint, not a hard cut.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => {
    if (!bands.includes(b)) bands.push(b);
  };
  if (difficulty < 9) add('2-3');
  if (difficulty >= 7.5 && difficulty < 13.5) add('4-5');
  if (difficulty >= 12) add('6-8');
  if (bands.length === 0) add(difficulty < 8 ? '2-3' : '6-8');
  return bands;
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin k=1..20 with >=perBin items
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items in a bin are spread
 * across overlapping lever configs; distractor closeness is the fine-positioner.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  const keyPosition = makeSlotAllocator(OPTION_KEYS.length);
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.n, cfg.extra, 0);
      const dHi = difficultyFromLevers(cfg.n, cfg.extra, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const nHits = hits[segIdx];
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const similarity = solveSimilarity(seg.n, seg.extra, t);
      const seed = `FLU-LADDER-01|bin=${k}|i=${i}|n${seg.n}x${seg.extra}`;
      items.push(genItem({ n: seg.n, extra: seg.extra, distractorSimilarity: similarity, keyPosition, seed }));
    }
  }
  return items;
}

/* ------------------------------------------------------------------ *
 * CLI entrypoint: write the bank + print a coverage summary.
 * ------------------------------------------------------------------ */
function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}
if (isMain()) {
  const perBin = Number(process.env.PER_BIN || 6);
  const items = buildBank({ perBin });
  const outPath = resolve(__dirname, '../banks/FLU-LADDER-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`FLU-LADDER-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
