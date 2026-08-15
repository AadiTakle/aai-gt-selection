// FLU-ANALOGY-01 "Shape Morph" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Replicates the FLU-MATRIX-01 reference
// vertical for a figural analogy (A:B :: C:?): a seeded transform grammar whose
// difficulty is DERIVED from the type's declared difficulty_levers and mapped onto a
// FLOAT 1..20 rung.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (relational-complexity model), NOT a calibrated
// IRT parameter (EXAM_ITEM_SCHEMA_SPEC §6.6, RES-012/RES-013). The answer key +
// distractor rationales are server-only and never placed in renderable `content`.
//
// Grammar mirrors demos/FLU-ANALOGY-01.html: A morphs into B by a fixed transform set
// (recolor, shade, resize, addcount, rotate); the child applies the SAME transforms to
// C. Distractors are keyed to the type's error taxonomy (literal-copy, wrong-attribute,
// over-/under-application) per the spec's tail_precision_rationale.
//
// Run:  node research/exam-question-types/generators/FLU-ANALOGY-01.mjs
//       writes ../banks/FLU-ANALOGY-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Attribute space (mirrors demos/FLU-ANALOGY-01.html rendering grammar).
 * Shapes/colors are NAMED TOKENS (renderer-agnostic). size is an INDEX 0..2
 * (small/med/large), rot is DEGREES (multiples of 72), fill is solid|outline.
 * ------------------------------------------------------------------ */
export const SHAPES = ['triangle', 'pentagon', 'hexagon', 'kite', 'drop', 'star'];
export const COLORS = ['coral', 'teal', 'blue', 'gold', 'violet', 'ink'];
export const FILLS = ['solid', 'outline'];
export const SIZE_MIN = 0;
export const SIZE_MAX = 2;

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
// Deterministic UUID (v4 layout) derived from the seed, for a reproducible bank.
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
 * TRANSFORM GRAMMAR — each transform acts on a DISTINCT attribute with a fixed
 * forward step (so a net per-attribute delta from A->B recovers the whole set).
 * Loads reflect cognitive cost (rotation hardest), grounded in relational-
 * complexity theory (Halford 1998) and the figure-analogy transform grammar
 * declared for this type.
 * ================================================================== */
export const TRANSFORMS = {
  shade: { attr: 'fill', load: 1.4 },
  recolor: { attr: 'color', load: 1.7 },
  resize: { attr: 'size', load: 2.0 },
  addcount: { attr: 'count', load: 2.3 },
  rotate: { attr: 'rot', load: 2.8 },
};
const TRANSFORM_ATTR = Object.fromEntries(Object.entries(TRANSFORMS).map(([k, v]) => [k, v.attr]));

// Apply ONE transform to a tile `step` times (step may be negative = reverse).
function applyStep(tile, name, step) {
  const t = { ...tile };
  switch (name) {
    case 'shade': {
      const i = FILLS.indexOf(t.fill);
      t.fill = FILLS[(((i + step) % 2) + 2) % 2];
      break;
    }
    case 'recolor': {
      const i = COLORS.indexOf(t.color);
      t.color = COLORS[(((i + step) % COLORS.length) + COLORS.length) % COLORS.length];
      break;
    }
    case 'resize': {
      // forward = shrink (size index down); clamped on the correct path by construction.
      t.size = clamp(t.size - step, SIZE_MIN, SIZE_MAX);
      break;
    }
    case 'addcount': {
      t.count = clamp(t.count + step, 1, 4);
      break;
    }
    case 'rotate': {
      t.rot = ((((t.rot + step * 72) % 360) + 360) % 360);
      break;
    }
  }
  return t;
}
function applyForward(tile, names) {
  let t = { ...tile };
  for (const n of names) t = applyStep(t, n, 1);
  return t;
}
function normTile(a) {
  return { shape: a.shape, color: a.color, count: a.count, size: a.size, rot: a.rot, fill: a.fill };
}
function sameTile(a, b) {
  return a.shape === b.shape && a.color === b.color && a.count === b.count && a.size === b.size && a.rot === b.rot && a.fill === b.fill;
}

// Transforms are added in a fixed order so a "canonical set" of size n is deterministic.
const TRANSFORM_ORDER = ['shade', 'recolor', 'resize', 'addcount', 'rotate'];

/* ================================================================== *
 * DIFFICULTY MODEL — difficulty derives from the type's difficulty_levers:
 *   number of transformations 1..4 | transformation type (per-attribute load) |
 *   distractor design (literal-copy / wrong-attribute / over-under-application).
 * We map lever settings onto a raw score, then linearly onto a FLOAT 1..20 rung
 * (gradual ramp, BUILD_PLAN §0).
 * ================================================================== */
const transformLoad = (names) => names.reduce((s, n) => s + TRANSFORMS[n].load, 0);
const interactionTerm = (nT) => 0.9 * (nT - 1); // co-acting transforms are superadditive
const DISTRACTOR_SPAN = 3.4; // distractor-similarity lever contributes 0..3.4
const distractorTerm = (similarity) => DISTRACTOR_SPAN * similarity;

// Curated canonical transform sets (real transforms) whose bases tile 1..20 when
// combined with the continuous distractor-similarity fine-positioner.
export const ALLOWED_CONFIGS = [
  { transforms: ['shade'] },
  { transforms: ['addcount'] },
  { transforms: ['rotate'] },
  { transforms: ['shade', 'resize'] },
  { transforms: ['recolor', 'rotate'] },
  { transforms: ['shade', 'resize', 'addcount'] },
  { transforms: ['recolor', 'resize', 'rotate'] },
  { transforms: ['shade', 'recolor', 'resize', 'addcount'] },
  { transforms: ['recolor', 'resize', 'addcount', 'rotate'] },
];

function baseScore(names) {
  return 1.0 + transformLoad(names) + interactionTerm(names.length);
}
// Theoretical raw bounds of the allowed design space -> fixed 1..20 anchors so an
// item's difficulty is a stable per-item property (not set-dependent).
const RAW_MIN = Math.min(...ALLOWED_CONFIGS.map((c) => baseScore(c.transforms))) + distractorTerm(0);
const RAW_MAX = Math.max(...ALLOWED_CONFIGS.map((c) => baseScore(c.transforms))) + distractorTerm(1);

function rawScore(names, similarity) {
  return baseScore(names) + distractorTerm(similarity);
}
export function difficultyFromLevers(names, similarity) {
  const raw = rawScore(names, similarity);
  const d = 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN);
  return clamp(d, 1, 20);
}
// Invert: distractor-similarity that lands a transform set on targetD.
function solveSimilarity(names, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(names)) / DISTRACTOR_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — build A->B example, C->? question, and options with error-taxonomy
 * lures (mirrors demo genAnalogy semantics).
 * ================================================================== */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Pick base source tiles A and C: same neutral attributes, DIFFERENT shapes, with
// transformed attributes seeded to avoid clamping on the correct path.
function makeSources(names, rng) {
  const shapes = shuffle(SHAPES, rng);
  const shapeA = shapes[0];
  const shapeC = shapes[1];
  const usesResize = names.includes('resize');
  const usesCount = names.includes('addcount');
  const neutral = {
    color: COLORS[Math.floor(rng() * COLORS.length)],
    // resize forward = shrink; start large so one/two shrinks stay in range.
    size: usesResize ? SIZE_MAX : 1,
    // addcount forward = +1; start at 2 so +1/+2 and -1 stay distinct and in 1..4.
    count: usesCount ? 2 : 1,
    rot: 0,
    fill: 'solid',
  };
  const A = { shape: shapeA, ...neutral };
  const C = { shape: shapeC, ...neutral };
  return { A, C };
}

/**
 * Generate ONE structured BankItem.
 * @param {{transforms:string[], distractorSimilarity:number, seed:string}} lever
 */
export function genItem({ transforms, distractorSimilarity, seed }) {
  const rng = makeRng(seed);
  const names = transforms.slice();
  const R = names.length;
  const { A, C } = makeSources(names, rng);
  const B = applyForward(A, names);
  const correct = applyForward(C, names);

  // Option pool with error-taxonomy lure tags. Dedup by attributes; `correct` is
  // pushed first so it is guaranteed unique.
  const pool = [];
  const push = (tile, lure, detail) => {
    if (pool.some((o) => sameTile(o.tile, tile))) return false;
    pool.push({ tile: normTile(tile), lure, detail: detail ?? null });
    return true;
  };
  push(correct, 'correct', null);

  // NEAR foils (subtle, off-by-one-step) — keyed to over/under application.
  const nearFoils = [];
  // over-application: apply the last transform one extra step.
  nearFoils.push(() => push(applyStep(applyForward(C, names), names[R - 1], 1), 'over_application', names[R - 1]));
  // under-application: drop the last transform (missed one relation). For R===1 this
  // collapses to the literal copy and is skipped by dedup.
  nearFoils.push(() => push(applyForward(C, names.slice(0, R - 1)), 'under_application', names[R - 1]));

  // FAR foils (grossly wrong) — keyed to literal-copy and wrong-attribute.
  const farFoils = [];
  farFoils.push(() => push(C, 'literal_copy', null)); // applied no transform at all
  const offAttr = TRANSFORM_ORDER.find((n) => !names.includes(n));
  if (offAttr) farFoils.push(() => push(applyStep(C, offAttr, 1), 'wrong_attribute', offAttr));

  const nOptions = 4;
  const wantNear = clamp(Math.round(distractorSimilarity * (nOptions - 1)), 0, nOptions - 1);

  // Fill NEAR foils up to wantNear, then FAR foils, then top up with whatever remains
  // and finally surface-shape lures so we always reach nOptions with unique tiles.
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
  for (const f of farFoils) {
    if (pool.length >= nOptions) break;
    f();
  }
  // Surface-shape lures: keep the correct transform result but swap the (invariant) shape.
  let guard = 1;
  while (pool.length < nOptions && guard < SHAPES.length + 3) {
    const tile = { ...correct, shape: SHAPES[(SHAPES.indexOf(correct.shape) + guard) % SHAPES.length] };
    push(tile, 'wrong_attribute', 'shape');
    guard++;
  }

  const shuffledPool = shuffle(pool, rng);
  const options = shuffledPool.map((o, i) => ({ key: OPTION_KEYS[i], tile: o.tile }));

  // Server-only answer + distractor taxonomy.
  let correctKey = null;
  const distractorRationales = {};
  shuffledPool.forEach((o, i) => {
    const key = OPTION_KEYS[i];
    if (o.lure === 'correct') {
      correctKey = key;
      distractorRationales[key] = { lure: 'correct', note: `applies all ${R} transform(s) to C: ${names.join(', ')}` };
    } else if (o.lure === 'over_application') {
      distractorRationales[key] = { lure: 'over_application', transform: o.detail, note: `overshoots the ${o.detail} transform (applied one step too far)` };
    } else if (o.lure === 'under_application') {
      distractorRationales[key] = { lure: 'under_application', transform: o.detail, note: `misses the ${o.detail} transform (applied one relation too few)` };
    } else if (o.lure === 'literal_copy') {
      distractorRationales[key] = { lure: 'literal_copy', note: 'copies C unchanged (no transform applied — surface response)' };
    } else {
      distractorRationales[key] = { lure: 'wrong_attribute', attribute: o.detail, note: `changes the wrong attribute (${o.detail}) instead of the mapped relation` };
    }
  });

  const difficulty = round2(difficultyFromLevers(names, distractorSimilarity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-ANALOGY-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-ANALOGY-01.html',
    content: {
      typeCode: 'FLU-ANALOGY-01',
      transforms: names.slice(), // named transforms (renderer-agnostic info)
      transformCount: R,
      example: { source: normTile(A), result: normTile(B) }, // A -> B
      question: { source: normTile(C) }, // C -> ?
      options, // display order; renderable subset (no lure/answer)
    },
    answer: {
      correctKey,
      distractorRationales, // keyed by option key -> error taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-analogy-01-grammar@1',
      seed,
      levers: {
        transforms: names.slice(),
        transformCount: R,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung. This type EXCLUDES K-1 by design
// (spec age_rationale: figural analogy mapping is unstable at ages 5-6); declared
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
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items in a bin are
 * distributed across overlapping transform-set configs; distractor similarity is
 * the continuous fine-positioner within a bin.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    // Reachable sub-segments of [lo,hi] per allowed config.
    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.transforms, 0);
      const dHi = difficultyFromLevers(cfg.transforms, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ transforms: cfg.transforms, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable transform config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const nHits = hits[segIdx];
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const similarity = solveSimilarity(seg.transforms, t);
      const seed = `FLU-ANALOGY-01|bin=${k}|i=${i}|T${seg.transforms.join('+')}`;
      items.push(genItem({ transforms: seg.transforms, distractorSimilarity: similarity, seed }));
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
  const outPath = resolve(__dirname, '../banks/FLU-ANALOGY-01.jsonl');
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
  console.log(`FLU-ANALOGY-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
