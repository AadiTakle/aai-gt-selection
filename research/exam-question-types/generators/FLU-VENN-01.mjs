// FLU-VENN-01 "Double Match" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Replicates the FLU-MATRIX-01 reference
// vertical for a conjunctive-classification task: a left ring whose members share one
// attribute value and a right ring whose members share another; the child picks the
// candidate in the OVERLAP (satisfies BOTH). Difficulty is DERIVED from the type's
// declared difficulty_levers and mapped onto a FLOAT 1..20 rung.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung, NOT a calibrated IRT parameter. The answer key,
// the rule dimensions/values, and distractor rationales are SERVER-ONLY and never
// placed in renderable `content` (so the child must still induce the rules).
//
// Grammar mirrors demos/FLU-VENN-01.html: two rule dimensions, ring exemplars that
// establish each rule, and candidates keyed to the type's error taxonomy (left-only /
// right-only single-attribute near-miss, or neither). A uniqueness audit
// (check-FLU-VENN-01.mjs) confirms exactly one candidate satisfies both rings.
//
// Run:  node research/exam-question-types/generators/FLU-VENN-01.mjs
//       writes ../banks/FLU-VENN-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Attribute space (mirrors demos/FLU-VENN-01.html rendering grammar).
 * Named tokens / ints are renderer-agnostic.
 * ------------------------------------------------------------------ */
export const DOM = {
  shape: ['triangle', 'pentagon', 'kite', 'drop', 'star'],
  color: ['coral', 'teal', 'blue', 'gold', 'violet'],
  fill: ['solid', 'outline', 'hatch'],
  count: [1, 2, 3],
  rot: [0, 90, 180],
  mark: ['top', 'middle', 'bottom'],
};
export const ALLDIMS = ['shape', 'color', 'fill', 'count', 'rot', 'mark'];

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
 * DIFFICULTY MODEL — from the type's difficulty_levers:
 *   conjunction of two attributes (fixed relational complexity = 2) | abstractness
 *   of the ring features (per-dim perceptual load) | number of exemplars (evidence) |
 *   number of candidate options | distractor overlap / surface similarity.
 * Grounded in concept-attainment theory (Bruner 1956; Shepard, Hovland & Jenkins 1961):
 * conjunctive categories separate stronger classifiers.
 * ================================================================== */
export const DIM_LOAD = { color: 1.4, shape: 1.6, count: 2.0, fill: 2.2, rot: 2.6, mark: 2.8 };
const pairLoad = (dims) => DIM_LOAD[dims[0]] + DIM_LOAD[dims[1]];
const exemplarTerm = (exemplarCount) => (exemplarCount >= 3 ? 0 : 1.6); // fewer exemplars => harder induction
const optionTerm = (optionCount) => 0.9 * (optionCount - 4);
const SIM_SPAN = 4.0; // distractor-similarity lever contributes 0..4.0
const distractorTerm = (similarity) => SIM_SPAN * similarity;

// All unordered dimension pairs (both rule dims distinct).
export const ALLOWED_DIMPAIRS = (() => {
  const pairs = [];
  for (let i = 0; i < ALLDIMS.length; i++)
    for (let j = i + 1; j < ALLDIMS.length; j++) pairs.push([ALLDIMS[i], ALLDIMS[j]]);
  return pairs;
})();
export const ALLOWED_EXEMPLARS = [2, 3];
export const ALLOWED_OPTIONCOUNTS = [4, 5, 6];

function baseScore(dims, exemplarCount, optionCount) {
  return 1.0 + pairLoad(dims) + exemplarTerm(exemplarCount) + optionTerm(optionCount);
}
const ALL_BASES = ALLOWED_DIMPAIRS.flatMap((d) =>
  ALLOWED_EXEMPLARS.flatMap((e) => ALLOWED_OPTIONCOUNTS.map((o) => baseScore(d, e, o))),
);
const RAW_MIN = Math.min(...ALL_BASES) + distractorTerm(0);
const RAW_MAX = Math.max(...ALL_BASES) + distractorTerm(1);

export function difficultyFromLevers(dims, exemplarCount, optionCount, similarity) {
  const raw = baseScore(dims, exemplarCount, optionCount) + distractorTerm(similarity);
  const d = 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN);
  return clamp(d, 1, 20);
}
function solveSimilarity(dims, exemplarCount, optionCount, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(dims, exemplarCount, optionCount)) / SIM_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — build ring exemplars + candidates (mirrors demo genItem semantics).
 * ================================================================== */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

function figKey(f) {
  return ALLDIMS.map((d) => f[d]).join('|');
}

// Exemplars for one ring: `dim`=val is the shared rule; the OTHER rule dim is forced
// off (!= otherVal) so the exemplar is single-ring; every non-`dim` dim varies so
// `dim` is the UNIQUE constant (=> the rule is inducible from the exemplars alone).
function makeExemplars(dim, val, otherDim, otherVal, neutral, count) {
  const altsOther = DOM[otherDim].filter((v) => v !== otherVal);
  const exs = [];
  for (let j = 0; j < count; j++) {
    const f = {};
    for (const d of ALLDIMS) {
      if (d === dim) f[d] = val;
      else if (d === otherDim) f[d] = altsOther[j % altsOther.length];
      else f[d] = DOM[d][(neutral[d + '_off'] + j + 1) % DOM[d].length];
    }
    exs.push(f);
  }
  return exs;
}

/**
 * Generate ONE structured BankItem.
 * @param {{leftDim,rightDim,exemplarCount,optionCount,distractorSimilarity,keyPosition,seed}} lever
 */
export function genItem({ leftDim, rightDim, exemplarCount, optionCount, distractorSimilarity, keyPosition, seed }) {
  const rng = makeRng(seed);
  const leftVal = DOM[leftDim][Math.floor(rng() * DOM[leftDim].length)];
  const rightVal = DOM[rightDim][Math.floor(rng() * DOM[rightDim].length)];

  // Neutral (non-rule) attributes shared by all CANDIDATES, so candidates differ only
  // in the two rule dims (clean conjunctive keying, no third-feature ambiguity).
  const neutral = {};
  for (const d of ALLDIMS) {
    if (d !== leftDim && d !== rightDim) neutral[d] = DOM[d][Math.floor(rng() * DOM[d].length)];
    neutral[d + '_off'] = Math.floor(rng() * DOM[d].length); // per-dim exemplar variation offset
  }

  const leftEx = makeExemplars(leftDim, leftVal, rightDim, rightVal, neutral, exemplarCount);
  const rightEx = makeExemplars(rightDim, rightVal, leftDim, leftVal, neutral, exemplarCount);

  const mk = (lv, rv) => {
    const f = {};
    for (const d of ALLDIMS) f[d] = d === leftDim ? lv : d === rightDim ? rv : neutral[d];
    return f;
  };
  const altLefts = DOM[leftDim].filter((v) => v !== leftVal);
  const altRights = DOM[rightDim].filter((v) => v !== rightVal);

  // Candidate pool with error-taxonomy tags. Correct pushed first => unique conjunction.
  const pool = [];
  const push = (fig, lure) => {
    if (pool.some((o) => figKey(o.fig) === figKey(fig))) return false;
    pool.push({ fig, lure });
    return true;
  };
  push(mk(leftVal, rightVal), 'correct');

  // NEAR foils = single-ring near-misses (satisfy exactly one rule). FAR foil = neither.
  const nearMakers = [];
  altRights.forEach((rv) => nearMakers.push(() => push(mk(leftVal, rv), 'left_only')));
  altLefts.forEach((lv) => nearMakers.push(() => push(mk(lv, rightVal), 'right_only')));
  const farMakers = [];
  altLefts.forEach((lv) => altRights.forEach((rv) => farMakers.push(() => push(mk(lv, rv), 'neither'))));

  const wantNear = clamp(Math.round(distractorSimilarity * (optionCount - 1)), 0, optionCount - 1);
  for (const f of nearMakers) {
    if (pool.length - 1 >= wantNear) break;
    f();
  }
  for (const f of farMakers) {
    if (pool.length >= optionCount) break;
    f();
  }
  for (const f of nearMakers) {
    if (pool.length >= optionCount) break;
    f();
  }

  const order = [];
  for (let i = 0; i < pool.length; i++) order.push(i);
  // Deterministic shuffle of candidate display order.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const seated = seatCorrect(order.map((i) => pool[i]).slice(0, optionCount), (o) => o.lure === 'correct', keyPosition);
  const shuffled = seated.list;

  const options = shuffled.map((o, i) => ({ key: OPTION_KEYS[i], figure: o.fig }));
  let correctKey = null;
  const distractorRationales = {};
  shuffled.forEach((o, i) => {
    const key = OPTION_KEYS[i];
    if (o.lure === 'correct') {
      correctKey = key;
      distractorRationales[key] = { lure: 'correct', rulesSatisfied: 2, note: 'satisfies BOTH ring rules (the conjunction)' };
    } else if (o.lure === 'left_only') {
      distractorRationales[key] = { lure: 'left_only', rulesSatisfied: 1, note: 'single-attribute near-miss: matches the left ring only' };
    } else if (o.lure === 'right_only') {
      distractorRationales[key] = { lure: 'right_only', rulesSatisfied: 1, note: 'single-attribute near-miss: matches the right ring only' };
    } else {
      distractorRationales[key] = { lure: 'neither', rulesSatisfied: 0, note: 'matches neither ring rule' };
    }
  });

  const difficulty = round2(difficultyFromLevers([leftDim, rightDim], exemplarCount, optionCount, distractorSimilarity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-VENN-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-VENN-01.html',
    content: {
      typeCode: 'FLU-VENN-01',
      ruleCount: 2, // conjunction arity (inherent to the type; NOT the answer)
      exemplarCount,
      optionCount,
      leftExemplars: leftEx, // establish the left rule (child must induce it)
      rightExemplars: rightEx, // establish the right rule
      options, // candidates; renderable subset (no rule dims/values, no lure/answer)
    },
    answer: {
      correctKey,
      leftDim,
      leftVal,
      rightDim,
      rightVal,
      distractorRationales, // keyed by option key -> conjunctive error taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-venn-01-grammar@1',
      seed,
      levers: {
        leftDim,
        rightDim,
        exemplarCount,
        optionCount,
        keyPosition: seated.slot, // resolved slot; replays the balanced key position
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint. This type EXCLUDES K-1 by design (spec age_rationale:
// a two-attribute conjunction is unreliable in K-1); declared bands are 2-3|4-5|6-8.
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
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items spread across
 * (dim-pair x exemplarCount x optionCount) configs; distractor similarity is the
 * continuous fine-positioner within a bin.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  const keyPosition = makeSlotAllocator(OPTION_KEYS.length);
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const dims of ALLOWED_DIMPAIRS) {
      for (const ex of ALLOWED_EXEMPLARS) {
        for (const oc of ALLOWED_OPTIONCOUNTS) {
          const dLo = difficultyFromLevers(dims, ex, oc, 0);
          const dHi = difficultyFromLevers(dims, ex, oc, 1);
          const a = Math.max(lo, dLo);
          const b = Math.min(hi, dHi);
          if (b > a + 1e-6) segments.push({ dims, ex, oc, tLo: a, tHi: b });
        }
      }
    }
    if (segments.length === 0) throw new Error(`no reachable config for difficulty bin k=${k}`);

    // Spread across a diverse subset (stride through the many segments) for variety.
    const stride = Math.max(1, Math.floor(segments.length / perBin));
    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[(i * stride) % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = (i * stride) % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const nHits = hits[segIdx];
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const similarity = solveSimilarity(seg.dims, seg.ex, seg.oc, t);
      const seed = `FLU-VENN-01|bin=${k}|i=${i}|D${seg.dims.join('+')}|E${seg.ex}|O${seg.oc}`;
      items.push(genItem({ leftDim: seg.dims[0], rightDim: seg.dims[1], exemplarCount: seg.ex, optionCount: seg.oc, distractorSimilarity: similarity, keyPosition, seed }));
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
  const outPath = resolve(__dirname, '../banks/FLU-VENN-01.jsonl');
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
  console.log(`FLU-VENN-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
