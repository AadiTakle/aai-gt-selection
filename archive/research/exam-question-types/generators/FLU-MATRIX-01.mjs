// FLU-MATRIX-01 "Machine Matrix" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. This is the REFERENCE VERTICAL other
// domain banks copy: a seeded rule x attribute grammar whose difficulty is DERIVED
// from the type's declared difficulty_levers and mapped onto a FLOAT 1..20 rung.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (relational-complexity model), NOT a
// calibrated IRT parameter (EXAM_ITEM_SCHEMA_SPEC §6.6, RES-012/RES-013). The
// answer key + distractor rationales are server-only and never placed in the
// renderable `content.options`.
//
// Run:  node research/exam-question-types/generators/FLU-MATRIX-01.mjs
//       writes ../banks/FLU-MATRIX-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Attribute space (mirrors demos/FLU-MATRIX-01.html rendering grammar)
 * Colors are stored as NAMED TOKENS (renderer-agnostic); the renderer maps
 * a token -> hex. Shapes are named; counts and rotations are numeric.
 * ------------------------------------------------------------------ */
export const SHAPES = ['triangle', 'pentagon', 'hexagon', 'kite', 'drop', 'star'];
export const COLORS = ['coral', 'teal', 'blue', 'gold', 'violet', 'ink'];

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
 * DIFFICULTY MODEL — difficulty derives from the type's difficulty_levers
 * (types_fluid_reasoning.jsonl FLU-MATRIX-01):
 *   grid size 2x2->3x3 | number of simultaneous rules 1..4 |
 *   rule/attribute type (shape,color,count,rotation) | distractor similarity.
 * Grounded in relational-complexity theory (Halford 1998): difficulty is set by
 * how many relations must be bound at once. We map lever settings onto a raw
 * score, then linearly onto a FLOAT 1..20 rung (gradual ramp, BUILD_PLAN §0).
 * ================================================================== */

// Per-attribute transformation load (cognitive cost of that progression rule).
const TRANSFORM_LOAD = { shape: 1.6, color: 1.6, count: 2.2, rotation: 2.8 };

// Rules are added in a fixed order so R (rule count) => a canonical active set.
const RULE_ORDER = ['shape', 'color', 'count', 'rotation'];
export function canonicalActiveRules(ruleCount) {
  return RULE_ORDER.slice(0, ruleCount);
}

const gridTerm = (gridSize) => (gridSize === 2 ? 0.0 : 2.4); // 3x3 integrates more cells
const transformLoad = (rules) => rules.reduce((s, a) => s + TRANSFORM_LOAD[a], 0);
const interactionTerm = (ruleCount) => 0.9 * (ruleCount - 1); // co-acting rules are superadditive
const DISTRACTOR_SPAN = 3.2; // distractor-similarity lever contributes 0..3.2
const distractorTerm = (similarity) => DISTRACTOR_SPAN * similarity; // similarity in [0,1]

// Theoretical raw bounds of the allowed design space -> fixed 1..20 anchors so
// an item's difficulty is a stable per-item property (not set-dependent).
const RAW_MIN = 1.0 + gridTerm(2) + transformLoad(canonicalActiveRules(1)) + interactionTerm(1) + distractorTerm(0); // 2.6
const RAW_MAX = 1.0 + gridTerm(3) + transformLoad(canonicalActiveRules(4)) + interactionTerm(4) + distractorTerm(1); // 17.5

function rawScore(gridSize, activeRules, similarity) {
  return (
    1.0 +
    gridTerm(gridSize) +
    transformLoad(activeRules) +
    interactionTerm(activeRules.length) +
    distractorTerm(similarity)
  );
}
export function difficultyFromLevers(gridSize, activeRules, similarity) {
  const raw = rawScore(gridSize, activeRules, similarity);
  const d = 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN);
  return clamp(d, 1, 20);
}
// Invert: distractor-similarity that lands (gridSize, activeRules) on targetD.
function solveSimilarity(gridSize, activeRules, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  const base = 1.0 + gridTerm(gridSize) + transformLoad(activeRules) + interactionTerm(activeRules.length);
  return clamp((rawNeeded - base) / DISTRACTOR_SPAN, 0, 1);
}

// Allowed lever configs (grid x ruleCount). 2x2 only carries 1-2 rules (faithful
// to the demo, which uses 2x2 for the easiest single-rule items); 3x3 carries 1-4.
export const ALLOWED_CONFIGS = [
  { gridSize: 2, ruleCount: 1 },
  { gridSize: 3, ruleCount: 1 },
  { gridSize: 2, ruleCount: 2 },
  { gridSize: 3, ruleCount: 2 },
  { gridSize: 3, ruleCount: 3 },
  { gridSize: 3, ruleCount: 4 },
];

/* ================================================================== *
 * GRAMMAR — build the matrix + option tiles (mirrors demo genItem semantics).
 * ================================================================== */
function makeTile(shape, color, count, rot) {
  return { shape, color, count, rot };
}
function sameTile(a, b) {
  return a.shape === b.shape && a.color === b.color && a.count === b.count && (a.rot || 0) === (b.rot || 0);
}
// Cell value at (r,c) under the active co-acting rules (mirrors demo grid rule).
function cellAt(r, c, gridSize, activeRules, shapes, colors) {
  return makeTile(
    shapes[(r + c) % gridSize],
    activeRules.includes('color') ? colors[r] : colors[0],
    activeRules.includes('count') ? c + 1 : 1,
    activeRules.includes('rotation') ? ((2 * r + c) % 3) * 120 : 0,
  );
}
// A tile that violates exactly ONE named rule (minimal near-miss).
function violateOne(answer, rule, shapes, colors) {
  const t = { ...answer };
  if (rule === 'shape') t.shape = SHAPES[(SHAPES.indexOf(answer.shape) + 1) % SHAPES.length];
  else if (rule === 'color') t.color = colors[(colors.indexOf(answer.color) + 1) % colors.length];
  else if (rule === 'count') t.count = answer.count === 1 ? 2 : answer.count - 1;
  else if (rule === 'rotation') t.rot = (answer.rot + 120) % 360;
  return t;
}
// A tile that violates >=2 rules (an "obviously wrong" far distractor).
function farDistractor(answer, activeRules, shapes, colors, k) {
  const t = { ...answer };
  t.shape = SHAPES[(SHAPES.indexOf(answer.shape) + 2 + k) % SHAPES.length];
  if (activeRules.includes('color')) t.color = colors[(colors.indexOf(answer.color) + 1) % colors.length];
  else if (activeRules.includes('count')) t.count = answer.count >= 2 ? answer.count - 1 : answer.count + 1;
  else if (activeRules.includes('rotation')) t.rot = (answer.rot + 240) % 360;
  return t;
}
function rulesSatisfiedBy(tile, answer, activeRules) {
  return activeRules.filter((a) => {
    if (a === 'shape') return tile.shape === answer.shape;
    if (a === 'color') return tile.color === answer.color;
    if (a === 'count') return tile.count === answer.count;
    if (a === 'rotation') return (tile.rot || 0) === (answer.rot || 0);
    return false;
  }).length;
}
function rulesViolatedBy(tile, answer, activeRules) {
  return activeRules.filter((a) => {
    if (a === 'shape') return tile.shape !== answer.shape;
    if (a === 'color') return tile.color !== answer.color;
    if (a === 'count') return tile.count !== answer.count;
    if (a === 'rotation') return (tile.rot || 0) !== (answer.rot || 0);
    return false;
  });
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Generate ONE structured BankItem.
 * @param {{gridSize:number, activeRules:string[], distractorSimilarity:number, keyPosition:(number|Function), seed:string}} lever
 */
export function genItem({ gridSize, activeRules, distractorSimilarity, keyPosition, seed }) {
  const rng = makeRng(seed);
  const R = activeRules.length;
  const shapes = shuffle(SHAPES, rng).slice(0, gridSize);
  const colors = shuffle(COLORS, rng).slice(0, gridSize);

  // Build the grid; bottom-right cell is the blank the child completes.
  const cells = [];
  for (let r = 0; r < gridSize; r++) {
    const row = [];
    for (let c = 0; c < gridSize; c++) {
      if (r === gridSize - 1 && c === gridSize - 1) row.push(null);
      else row.push(cellAt(r, c, gridSize, activeRules, shapes, colors));
    }
    cells.push(row);
  }
  const answer = cellAt(gridSize - 1, gridSize - 1, gridSize, activeRules, shapes, colors);

  // Option pool with lure tags. distractorSimilarity controls the near-miss mix:
  // high similarity -> more single-rule near-misses (hard to discriminate);
  // low similarity  -> more multi-rule "far" distractors (obviously wrong).
  const nOptions = Math.max(4, Math.min(6, R + 2));
  const pool = [];
  const push = (tile, lure, ruleViolated) => {
    if (pool.some((o) => sameTile(o.tile, tile))) return false;
    pool.push({ tile, lure, ruleViolated: ruleViolated ?? null });
    return true;
  };
  push({ ...answer }, 'correct', null);

  const wantNear = clamp(Math.round(distractorSimilarity * R), 0, Math.min(R, nOptions - 1));
  for (let i = 0; i < activeRules.length && pool.length - 1 < wantNear; i++) {
    push(violateOne(answer, activeRules[i], shapes, colors), 'rule_violation', activeRules[i]);
  }
  let guard = 0;
  while (pool.length < nOptions && guard < 80) {
    push(farDistractor(answer, activeRules, shapes, colors, guard), 'distractor_other', null);
    guard++;
  }
  // If dedupe left us short, top up with additional single-rule near-misses.
  for (let i = 0; i < activeRules.length && pool.length < nOptions; i++) {
    push(violateOne(answer, activeRules[i], shapes, colors), 'rule_violation', activeRules[i]);
  }

  const seated = seatCorrect(shuffle(pool, rng), (o) => o.lure === 'correct', keyPosition);
  const shuffledPool = seated.list;

  // Renderable options (safe subset): key + tile ONLY. No lure/answer leak.
  const options = shuffledPool.map((o, i) => ({ key: OPTION_KEYS[i], tile: o.tile }));

  // Server-only answer + distractor taxonomy (keyed to rule violations).
  let correctKey = null;
  const distractorRationales = {};
  shuffledPool.forEach((o, i) => {
    const key = OPTION_KEYS[i];
    const satisfied = rulesSatisfiedBy(o.tile, answer, activeRules);
    const violated = rulesViolatedBy(o.tile, answer, activeRules);
    if (o.lure === 'correct') {
      correctKey = key;
      distractorRationales[key] = {
        lure: 'correct',
        rulesViolated: [],
        rulesSatisfied: R,
        note: 'satisfies all co-acting row/column rules',
      };
    } else if (o.lure === 'rule_violation') {
      distractorRationales[key] = {
        lure: 'rule_violation',
        rulesViolated: [o.ruleViolated],
        rulesSatisfied: satisfied,
        note: `near-miss: violates the ${o.ruleViolated} rule only (satisfies ${satisfied}/${R})`,
      };
    } else {
      distractorRationales[key] = {
        lure: 'distractor_other',
        rulesViolated: violated,
        rulesSatisfied: satisfied,
        note: `violates ${violated.length} rules (${violated.join(', ') || 'off-pattern'})`,
      };
    }
  });

  const difficulty = round2(difficultyFromLevers(gridSize, activeRules, distractorSimilarity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-MATRIX-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-MATRIX-01.html',
    content: {
      typeCode: 'FLU-MATRIX-01',
      gridSize,
      activeRules: activeRules.slice(),
      ruleCount: R,
      matrix: {
        rows: gridSize,
        cols: gridSize,
        cells, // row-major; blank cell is null
        blank: { row: gridSize - 1, col: gridSize - 1 },
      },
      options, // display order; renderable subset (no lure/answer)
    },
    answer: {
      correctKey,
      distractorRationales, // keyed by option key -> rule-violation taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-matrix-01-grammar@1',
      seed,
      levers: {
        gridSize,
        ruleCount: R,
        activeRules: activeRules.slice(),
        keyPosition: seated.slot, // resolved slot; replays the balanced key position
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung (type's declared bands only:
// K-1 | 2-3 | 4-5 | 6-8). Boundary overlap reflects a targeting hint, not a hard cut.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => {
    if (!bands.includes(b)) bands.push(b);
  };
  if (difficulty < 4.5) add('K-1');
  if (difficulty >= 3.5 && difficulty < 8.5) add('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) add('4-5');
  if (difficulty >= 11.5) add('6-8');
  if (bands.length === 0) add(difficulty < 3 ? 'K-1' : '6-8');
  return bands;
}

/* ================================================================== *
 * BANK BUILDER — fill each integer difficulty bin k=1..20 with >=perBin items
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items in a bin are
 * distributed across overlapping lever configs for variety; distractor
 * similarity is the continuous fine-positioner within a bin.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  const keyPosition = makeSlotAllocator(OPTION_KEYS.length);
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    // Reachable sub-segments of [lo,hi] per allowed config.
    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const active = canonicalActiveRules(cfg.ruleCount);
      const dLo = difficultyFromLevers(cfg.gridSize, active, 0);
      const dHi = difficultyFromLevers(cfg.gridSize, active, 1);
      const a = Math.max(lo, dLo);
      const b = Math.min(hi, dHi);
      if (b > a + 1e-6) segments.push({ ...cfg, active, tLo: a, tHi: b });
    }
    if (segments.length === 0) throw new Error(`no reachable lever config for difficulty bin k=${k}`);

    // How many items land on each segment (round-robin), so we can spread within.
    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const nHits = hits[segIdx];
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const similarity = solveSimilarity(seg.gridSize, seg.active, t);
      const seed = `FLU-MATRIX-01|bin=${k}|i=${i}|G${seg.gridSize}R${seg.ruleCount}`;
      items.push(genItem({ gridSize: seg.gridSize, activeRules: seg.active, distractorSimilarity: similarity, keyPosition, seed }));
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
  const outPath = resolve(__dirname, '../banks/FLU-MATRIX-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeBank(items));

  // Coverage summary (per integer bin).
  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`FLU-MATRIX-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
