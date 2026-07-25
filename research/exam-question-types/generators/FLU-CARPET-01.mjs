// FLU-CARPET-01 "Pattern Carpet" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Replicates the FLU-MATRIX-01 reference
// vertical for a figure-series / progression carpet: a seeded attribute-progression
// grammar whose difficulty is DERIVED from the type's declared difficulty_levers and
// mapped onto a FLOAT 1..20 rung.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (relational-complexity model), NOT a calibrated
// IRT parameter (EXAM_ITEM_SCHEMA_SPEC §6.6, RES-012/RES-013). The answer key +
// distractor rationales are server-only and never placed in the renderable content.
//
// Grammar mirrors demos/FLU-CARPET-01.html: a single row (K-1..4-5) or a 3x3 carpet
// (4-5..6-8) where each row (and, in grid mode, each column/diagonal) is a progression
// on one or more attributes; the child continues the weave into the last (blank) cell.
// Distractors are keyed to the type's error taxonomy (off-by-one step, previous-term
// periodicity slip, wrong attribute, off-pattern) per the spec's tail_precision_rationale.
//
// Run:  node research/exam-question-types/generators/FLU-CARPET-01.mjs
//       writes ../banks/FLU-CARPET-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Attribute space (mirrors demos/FLU-CARPET-01.html rendering grammar).
 * Motifs/colors are NAMED TOKENS (renderer-agnostic); the renderer maps a token
 * -> hex / path. count is 1..5, size is an INDEX 0..2, rot is DEGREES, fill is 0|1.
 * ------------------------------------------------------------------ */
export const MOTIFS = ['leaf', 'bolt', 'chevron', 'petal', 'capsule'];
export const COLORS = ['blue', 'teal', 'coral', 'gold', 'violet'];

// Attribute classification for the positional grammar (documented; used by the
// independent solver in check-FLU-CARPET-01.mjs).
export const LINEAR_ATTRS = ['count', 'size', 'rot']; // arithmetic step across the series
export const PERIODIC_ATTRS = ['motif', 'color', 'fill']; // period-2 cycle across a row

const ROW_STEP = { count: 1, rot: 45 }; // fixed forward steps (row mode, per column)
const ROT_STEP = 45; // grid diagonal rotation step (per r+c)

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
 * (types_fluid_reasoning.jsonl FLU-CARPET-01):
 *   single row vs 3x3 grid | number of parallel progressions 1..~5 |
 *   attribute/progression type | distractor closeness.
 * Grounded in relational-complexity theory (Halford 1998) and the complexity of
 * geometric inductive reasoning (Primi 2001): difficulty rises with how many
 * simultaneous progressions must be tracked. We map lever settings onto a raw
 * score, then linearly onto a FLOAT 1..20 rung (gradual ramp, BUILD_PLAN §0).
 * ================================================================== */

// Per-attribute progression load (cognitive cost of tracking that progression).
const ATTR_LOAD = { motif: 1.5, color: 1.5, fill: 1.3, count: 2.0, size: 1.8, rot: 2.6 };
const modeTerm = (mode) => (mode === 'grid' ? 2.6 : 0.0); // the column/diagonal axis integrates more
const attrLoad = (attrs) => attrs.reduce((s, a) => s + ATTR_LOAD[a], 0);
const interactionTerm = (n) => 0.8 * (n - 1); // co-acting progressions are superadditive
const DISTRACTOR_SPAN = 3.2; // distractor-closeness lever contributes 0..3.2
const distractorTerm = (similarity) => DISTRACTOR_SPAN * similarity; // similarity in [0,1]

function baseScore(mode, attrs) {
  return 1.0 + modeTerm(mode) + attrLoad(attrs) + interactionTerm(attrs.length);
}

// Allowed lever configs (mode x attribute set), curated so their bases tile 1..20 when
// combined with the continuous distractor-closeness fine-positioner. Row mode carries
// 1-3 progressions (K-1..4-5); the 3x3 grid carries 2-5 (4-5..6-8), faithful to the demo.
export const ALLOWED_CONFIGS = [
  { mode: 'row', attrs: ['motif'] },
  { mode: 'row', attrs: ['count'] },
  { mode: 'row', attrs: ['color', 'count'] },
  { mode: 'row', attrs: ['count', 'rot'] },
  { mode: 'row', attrs: ['count', 'rot', 'fill'] },
  { mode: 'grid', attrs: ['count', 'motif'] },
  { mode: 'grid', attrs: ['count', 'size', 'motif'] },
  { mode: 'grid', attrs: ['count', 'size', 'rot'] },
  { mode: 'grid', attrs: ['count', 'size', 'motif', 'rot'] },
  { mode: 'grid', attrs: ['count', 'size', 'motif', 'rot', 'color'] },
];

// Theoretical raw bounds of the allowed design space -> fixed 1..20 anchors so an
// item's difficulty is a stable per-item property (not set-dependent).
const RAW_MIN = Math.min(...ALLOWED_CONFIGS.map((c) => baseScore(c.mode, c.attrs))) + distractorTerm(0);
const RAW_MAX = Math.max(...ALLOWED_CONFIGS.map((c) => baseScore(c.mode, c.attrs))) + distractorTerm(1);

function rawScore(mode, attrs, similarity) {
  return baseScore(mode, attrs) + distractorTerm(similarity);
}
export function difficultyFromLevers(mode, attrs, similarity) {
  const raw = rawScore(mode, attrs, similarity);
  const d = 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN);
  return clamp(d, 1, 20);
}
// Invert: distractor-closeness that lands (mode, attrs) on targetD.
function solveSimilarity(mode, attrs, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(mode, attrs)) / DISTRACTOR_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — build the carpet cells + option tiles (mirrors demo genItem semantics).
 * Each attribute is either CONSTANT (inactive) or follows a fixed positional
 * progression (active). The blank is the last cell (row mode: (0,cols-1);
 * grid mode: (G-1,G-1)); its value is the deterministic continuation.
 * ================================================================== */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROW_COLS = 4; // row-mode sequence length
const GRID_G = 3; // grid-mode side

function baseTile(motifBase, colorBase) {
  return { motif: motifBase[0], count: 1, size: 0, color: colorBase[0], rot: 0, fill: 1 };
}
// Cell value at (r,c) under the active progressions (mirrors demo weave rule).
function cellAt(r, c, mode, attrs, motifBase, colorBase) {
  const t = baseTile(motifBase, colorBase);
  if (mode === 'row') {
    if (attrs.includes('motif')) t.motif = motifBase[c % 2];
    if (attrs.includes('color')) t.color = colorBase[c % 2];
    if (attrs.includes('fill')) t.fill = (1 + c) % 2;
    if (attrs.includes('count')) t.count = 1 + c * ROW_STEP.count;
    if (attrs.includes('rot')) t.rot = (c * ROW_STEP.rot) % 360;
  } else {
    if (attrs.includes('count')) t.count = 1 + c; // column progression
    if (attrs.includes('size')) t.size = r; // row progression
    if (attrs.includes('motif')) t.motif = motifBase[(r + c) % 3]; // diagonal
    if (attrs.includes('rot')) t.rot = ((r + c) * ROT_STEP) % 360;
    if (attrs.includes('color')) t.color = colorBase[r]; // row
  }
  return t;
}
function sameTile(a, b) {
  return (
    a.motif === b.motif &&
    a.count === b.count &&
    a.size === b.size &&
    a.color === b.color &&
    (a.rot || 0) === (b.rot || 0) &&
    (a.fill ?? 1) === (b.fill ?? 1)
  );
}
function attrsThatDiffer(tile, answer) {
  const all = ['motif', 'color', 'fill', 'count', 'size', 'rot'];
  return all.filter((a) => (tile[a] ?? (a === 'fill' ? 1 : 0)) !== (answer[a] ?? (a === 'fill' ? 1 : 0)));
}

// A tile that changes exactly ONE progressing attribute by one step (near-miss).
function offByOneStep(answer, attr, motifBase, colorBase) {
  const t = { ...answer };
  if (attr === 'count') t.count = answer.count > 1 ? answer.count - 1 : answer.count + 1;
  else if (attr === 'size') t.size = answer.size > 0 ? answer.size - 1 : answer.size + 1;
  else if (attr === 'rot') t.rot = (answer.rot + 360 - ROT_STEP) % 360;
  else if (attr === 'motif') t.motif = motifBase[(motifBase.indexOf(answer.motif) + 1) % motifBase.length];
  else if (attr === 'color') t.color = colorBase[(colorBase.indexOf(answer.color) + 1) % colorBase.length];
  else if (attr === 'fill') t.fill = answer.fill ? 0 : 1;
  return t;
}
// A tile that changes an attribute NOT governed by a progression (wrong attribute).
function wrongAttribute(answer, attrs, motifBase, colorBase) {
  const t = { ...answer };
  const off = ['color', 'fill', 'motif', 'rot'].find((a) => !attrs.includes(a));
  if (off === 'color') t.color = colorBase[(colorBase.indexOf(answer.color) + 2) % colorBase.length];
  else if (off === 'fill') t.fill = answer.fill ? 0 : 1;
  else if (off === 'motif') t.motif = motifBase[(motifBase.indexOf(answer.motif) + 2) % motifBase.length];
  else if (off === 'rot') t.rot = (answer.rot + 2 * ROT_STEP) % 360;
  else t.count = answer.count > 1 ? answer.count - 1 : answer.count + 2; // fallback
  return { tile: t, attr: off || 'count' };
}
// An off-pattern tile that violates >=2 attributes (obviously wrong far distractor).
function offPattern(answer, motifBase, colorBase, k) {
  const t = { ...answer };
  t.motif = motifBase[(motifBase.indexOf(answer.motif) + 2 + k) % motifBase.length];
  t.color = colorBase[(colorBase.indexOf(answer.color) + 1 + k) % colorBase.length];
  return t;
}

/**
 * Generate ONE structured BankItem.
 * @param {{mode:'row'|'grid', attrs:string[], distractorSimilarity:number, keyPosition:(number|Function), seed:string}} lever
 */
export function genItem({ mode, attrs, distractorSimilarity, keyPosition, seed }) {
  const rng = makeRng(seed);
  const activeAttrs = attrs.slice();
  const motifBase = shuffle(MOTIFS, rng);
  const colorBase = shuffle(COLORS, rng);
  const rows = mode === 'grid' ? GRID_G : 1;
  const cols = mode === 'grid' ? GRID_G : ROW_COLS;

  // Build the carpet; last cell is the blank the child continues.
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (r === rows - 1 && c === cols - 1) row.push(null);
      else row.push(cellAt(r, c, mode, activeAttrs, motifBase, colorBase));
    }
    cells.push(row);
  }
  const answer = cellAt(rows - 1, cols - 1, mode, activeAttrs, motifBase, colorBase);
  const prevTile = cellAt(rows - 1, cols - 2, mode, activeAttrs, motifBase, colorBase); // previous term in the weave

  // Option pool with error-taxonomy lure tags. distractorSimilarity controls the mix:
  // high similarity -> more single-step near-misses (hard to discriminate);
  // low similarity  -> more off-pattern far distractors (obviously wrong).
  const nOptions = clamp(activeAttrs.length + 2, 4, 5);
  const pool = [];
  const push = (tile, lure, detail) => {
    if (pool.some((o) => sameTile(o.tile, tile))) return false;
    pool.push({ tile: { ...tile }, lure, detail: detail ?? null });
    return true;
  };
  push(answer, 'correct', null);

  // NEAR foils: single-step slip on a progressing attribute + previous-term slip.
  const linearActive = activeAttrs.filter((a) => LINEAR_ATTRS.includes(a));
  const nearFoils = [];
  for (const a of linearActive) nearFoils.push(() => push(offByOneStep(answer, a, motifBase, colorBase), 'off_by_one_step', a));
  nearFoils.push(() => push(prevTile, 'previous_term', null));
  for (const a of activeAttrs.filter((x) => PERIODIC_ATTRS.includes(x)))
    nearFoils.push(() => push(offByOneStep(answer, a, motifBase, colorBase), 'wrong_cycle', a));

  // FAR foils: wrong (non-progressing) attribute + off-pattern combinations.
  const farFoils = [];
  farFoils.push(() => {
    const w = wrongAttribute(answer, activeAttrs, motifBase, colorBase);
    return push(w.tile, 'wrong_attribute', w.attr);
  });
  for (let k = 0; k < 4; k++) farFoils.push(() => push(offPattern(answer, motifBase, colorBase, k), 'off_pattern', null));

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
  for (const f of farFoils) {
    if (pool.length >= nOptions) break;
    f();
  }

  const seated = seatCorrect(shuffle(pool, rng), (o) => o.lure === 'correct', keyPosition);
  const shuffledPool = seated.list;

  // Renderable options (safe subset): key + tile ONLY. No lure/answer leak.
  const options = shuffledPool.map((o, i) => ({ key: OPTION_KEYS[i], tile: o.tile }));

  // Server-only answer + distractor taxonomy (keyed to progression errors).
  let correctKey = null;
  const distractorRationales = {};
  shuffledPool.forEach((o, i) => {
    const key = OPTION_KEYS[i];
    if (o.lure === 'correct') {
      correctKey = key;
      distractorRationales[key] = { lure: 'correct', note: `continues every active progression: ${activeAttrs.join(', ')}` };
    } else if (o.lure === 'off_by_one_step') {
      distractorRationales[key] = { lure: 'off_by_one_step', attribute: o.detail, note: `near-miss: ${o.detail} progression off by one step` };
    } else if (o.lure === 'previous_term') {
      distractorRationales[key] = { lure: 'previous_term', note: 'repeats the previous term (periodicity / repeat-last slip)' };
    } else if (o.lure === 'wrong_cycle') {
      distractorRationales[key] = { lure: 'wrong_cycle', attribute: o.detail, note: `near-miss: wrong phase of the ${o.detail} cycle` };
    } else if (o.lure === 'wrong_attribute') {
      distractorRationales[key] = { lure: 'wrong_attribute', attribute: o.detail, note: `changes a non-progressing attribute (${o.detail})` };
    } else {
      distractorRationales[key] = { lure: 'off_pattern', attributesViolated: attrsThatDiffer(o.tile, answer), note: 'off-pattern: violates more than one progression' };
    }
  });

  const difficulty = round2(difficultyFromLevers(mode, activeAttrs, distractorSimilarity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-CARPET-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-CARPET-01.html',
    content: {
      typeCode: 'FLU-CARPET-01',
      mode,
      rows,
      cols,
      activeAttrs: activeAttrs.slice(),
      progressionCount: activeAttrs.length,
      carpet: {
        rows,
        cols,
        cells, // row-major; blank cell is null
        blank: { row: rows - 1, col: cols - 1 },
      },
      options, // display order; renderable subset (no lure/answer)
    },
    answer: {
      correctKey,
      distractorRationales, // keyed by option key -> progression-error taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-carpet-01-grammar@1',
      seed,
      levers: {
        mode,
        attrs: activeAttrs.slice(),
        progressionCount: activeAttrs.length,
        keyPosition: seated.slot, // resolved slot; replays the balanced key position
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung (declared bands: K-1 | 2-3 | 4-5 |
// 6-8; the K-8 tag reflects the shell spanning the full range). Boundary overlap
// reflects a targeting hint, not a hard cut.
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
 * (BUILD_PLAN §0: >=5 per +/-1 pt band, gradual 1..20). Items in a bin are spread
 * across overlapping lever configs for variety; distractor closeness is the
 * continuous fine-positioner within a bin.
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
      const dLo = difficultyFromLevers(cfg.mode, cfg.attrs, 0);
      const dHi = difficultyFromLevers(cfg.mode, cfg.attrs, 1);
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
      const similarity = solveSimilarity(seg.mode, seg.attrs, t);
      const seed = `FLU-CARPET-01|bin=${k}|i=${i}|${seg.mode}:${seg.attrs.join('+')}`;
      items.push(genItem({ mode: seg.mode, attrs: seg.attrs, distractorSimilarity: similarity, keyPosition, seed }));
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
  const outPath = resolve(__dirname, '../banks/FLU-CARPET-01.jsonl');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, items.map((it) => JSON.stringify(it)).join('\n') + '\n');

  const bins = Array.from({ length: 20 }, () => 0);
  let min = Infinity;
  let max = -Infinity;
  for (const it of items) {
    const k = Math.round(it.difficulty);
    if (k >= 1 && k <= 20) bins[k - 1]++;
    min = Math.min(min, it.difficulty);
    max = Math.max(max, it.difficulty);
  }
  console.log(`FLU-CARPET-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
