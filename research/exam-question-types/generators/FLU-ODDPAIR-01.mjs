// FLU-ODDPAIR-01 "Odd Pair Out" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Replicates the FLU-MATRIX-01 reference
// vertical for a "relation between relations" task: several before->after pairs all
// apply the SAME transform except one; the child taps the odd pair. Difficulty is
// DERIVED from the type's declared difficulty_levers and mapped onto a FLOAT 1..20 rung.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (relational-complexity model), NOT a calibrated
// IRT parameter (EXAM_ITEM_SCHEMA_SPEC §6.6). The answer key + distractor rationales
// are server-only and never placed in renderable `content`.
//
// Grammar mirrors demos/FLU-ODDPAIR-01.html: each pair's right figure is its left
// figure after a shared transform (turn / resize / add-remove dots / recolor); the odd
// pair swaps ONE transform parameter to a contrasting direction. A uniqueness check
// (check-FLU-ODDPAIR-01.mjs) confirms exactly one pair deviates.
//
// Run:  node research/exam-question-types/generators/FLU-ODDPAIR-01.mjs
//       writes ../banks/FLU-ODDPAIR-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ------------------------------------------------------------------ *
 * Attribute space (mirrors demos/FLU-ODDPAIR-01.html rendering grammar).
 * Named tokens are renderer-agnostic. size is an INDEX 0..2, rot is DEGREES
 * (multiples of 90), dots is an INT 0..3, fill is solid|outline.
 * ------------------------------------------------------------------ */
export const SHAPES = ['arrow', 'bolt', 'flag', 'kite', 'chevron'];
export const COLORS = ['rose', 'azure', 'jade', 'amber', 'purple'];
export const FILLS = ['solid', 'outline'];

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
 * TRANSFORM GRAMMAR — each op acts on a DISTINCT attribute. Every non-odd pair
 * applies the SHARED direction; the odd pair swaps the CONTRAST dimension to the
 * opposite direction (a clean, relational deviation per the spec's requirement
 * that the odd deviation is relational, not a render artifact).
 * ================================================================== */
export const OP_LOAD = { color: 1.6, size: 2.0, count: 2.0, rot: 2.8 };
const SHARED_DIR = { color: +1, size: +1, count: +1, rot: +1 };
const CONTRAST_DIR = { color: +2, size: -1, count: -1, rot: -1 };
const OP_ATTRS = ['color', 'size', 'count', 'rot'];

function applyOp(fig, attr, dir) {
  const f = { ...fig };
  if (attr === 'color') f.color = COLORS[(((COLORS.indexOf(f.color) + dir) % COLORS.length) + COLORS.length) % COLORS.length];
  else if (attr === 'size') f.size = clamp(f.size + dir, 0, 2);
  else if (attr === 'count') f.dots = clamp(f.dots + dir, 0, 3);
  else if (attr === 'rot') f.rot = ((((f.rot / 90 + dir) % 4) + 4) % 4) * 90;
  return f;
}
function transformFig(fig, ops, dirs) {
  let f = { ...fig };
  for (const a of ops) f = applyOp(f, a, dirs[a]);
  return f;
}
function normFig(f) {
  return { shape: f.shape, color: f.color, size: f.size, rot: f.rot, dots: f.dots, fill: f.fill };
}
// Surface-similarity score (how many attributes two figures share) — for lure coding.
function surfaceOverlap(a, b) {
  return (a.shape === b.shape) + (a.color === b.color) + (a.size === b.size) + (a.rot === b.rot) + (a.dots === b.dots) + (a.fill === b.fill);
}

/* ================================================================== *
 * DIFFICULTY MODEL — from the type's difficulty_levers:
 *   number of relational dimensions in the shared rule | op type (per-attr load) |
 *   number of pairs shown | surface similarity between odd and matching pairs
 *   (foil pull). Grounded in relational-complexity theory (Halford 1998).
 * ================================================================== */
const opLoad = (ops) => ops.reduce((s, a) => s + OP_LOAD[a], 0);
const interactionTerm = (nDims) => 0.7 * (nDims - 1);
const rowTerm = (rowCount) => 0.8 * (rowCount - 4);
const FOIL_SPAN = 3.0; // foil-pull lever contributes 0..3.0
const foilTerm = (pull) => FOIL_SPAN * pull;

// Curated shared op-sets (attributes) whose loads span the design space.
export const ALLOWED_OPSETS = [
  ['color'],
  ['size'],
  ['rot'],
  ['color', 'size'],
  ['color', 'rot'],
  ['size', 'count'],
  ['size', 'rot'],
  ['count', 'rot'],
  ['color', 'size', 'count'],
  ['color', 'size', 'rot'],
  ['size', 'count', 'rot'],
];
export const ALLOWED_ROWCOUNTS = [4, 5, 6];

function baseScore(ops, rowCount) {
  return 1.0 + opLoad(ops) + interactionTerm(ops.length) + rowTerm(rowCount);
}
const RAW_MIN = Math.min(...ALLOWED_OPSETS.flatMap((o) => ALLOWED_ROWCOUNTS.map((r) => baseScore(o, r)))) + foilTerm(0);
const RAW_MAX = Math.max(...ALLOWED_OPSETS.flatMap((o) => ALLOWED_ROWCOUNTS.map((r) => baseScore(o, r)))) + foilTerm(1);

export function difficultyFromLevers(ops, rowCount, foilPull) {
  const raw = baseScore(ops, rowCount) + foilTerm(foilPull);
  const d = 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN);
  return clamp(d, 1, 20);
}
function solveFoil(ops, rowCount, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(ops, rowCount)) / FOIL_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — build rows (pairs), pick the odd pair, engineer a surface lure.
 * ================================================================== */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SURFACE_ATTRS = ['shape', 'color', 'rot', 'fill']; // vary freely; not clamp-constrained

function seededBaseFig(rng, ops, i) {
  // Op attributes with clamp (size, count) start at the safe middle so BOTH shared
  // (+1) and contrast (-1) directions stay in range. Others vary for surface variety.
  return {
    shape: SHAPES[i % SHAPES.length],
    color: COLORS[Math.floor(rng() * COLORS.length)],
    size: ops.includes('size') ? 1 : Math.floor(rng() * 3),
    rot: [0, 90, 180, 270][Math.floor(rng() * 4)],
    dots: ops.includes('count') ? 1 : Math.floor(rng() * 4),
    fill: FILLS[Math.floor(rng() * FILLS.length)],
  };
}

/**
 * Generate ONE structured BankItem.
 * @param {{ops:string[], rowCount:number, contrastDim:string, foilPull:number, seed:string}} lever
 */
export function genItem({ ops, rowCount, contrastDim, foilPull, seed }) {
  const rng = makeRng(seed);
  const nDims = ops.length;

  // Balanced odd position + a distinct lure row (position bias mitigated by seed).
  const oddIndex = Math.floor(rng() * rowCount);
  let lureIndex = Math.floor(rng() * rowCount);
  let g = 0;
  while (lureIndex === oddIndex && g++ < 10) lureIndex = Math.floor(rng() * rowCount);

  // Build each pair.
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const left = seededBaseFig(rng, ops, i);
    const dirs = {};
    for (const a of ops) dirs[a] = i === oddIndex && a === contrastDim ? CONTRAST_DIR[a] : SHARED_DIR[a];
    rows.push({ left, right: transformFig(left, ops, dirs) });
  }

  // Engineer the surface lure: copy a foil-scaled subset of the odd pair's LEFT
  // attributes into the lure pair's LEFT (it still uses the SHARED transform), so its
  // RIGHT figure resembles the odd pair's RIGHT (stronger pull at higher foilPull).
  const overlap = clamp(Math.round(foilPull * SURFACE_ATTRS.length), 0, SURFACE_ATTRS.length);
  if (overlap > 0) {
    const oddLeft = rows[oddIndex].left;
    const lureLeft = { ...rows[lureIndex].left };
    for (let a = 0; a < overlap; a++) lureLeft[SURFACE_ATTRS[a]] = oddLeft[SURFACE_ATTRS[a]];
    const sharedDirs = {};
    for (const a of ops) sharedDirs[a] = SHARED_DIR[a];
    rows[lureIndex] = { left: lureLeft, right: transformFig(lureLeft, ops, sharedDirs) };
  }

  // Renderable rows/options (safe subset): key + left + right ONLY.
  const options = rows.map((r, i) => ({ key: OPTION_KEYS[i], left: normFig(r.left), right: normFig(r.right) }));
  const correctKey = OPTION_KEYS[oddIndex];

  // Post-hoc surface-lure coding: among SHARED pairs, the one whose right figure most
  // resembles the odd pair's right figure is the surface lure (matches demo semantics).
  const oddRight = rows[oddIndex].right;
  let bestLure = -1;
  let bestScore = -1;
  for (let i = 0; i < rowCount; i++) {
    if (i === oddIndex) continue;
    const s = surfaceOverlap(rows[i].right, oddRight);
    if (s > bestScore) {
      bestScore = s;
      bestLure = i;
    }
  }

  const distractorRationales = {};
  for (let i = 0; i < rowCount; i++) {
    const key = OPTION_KEYS[i];
    if (i === oddIndex) {
      distractorRationales[key] = { lure: 'correct', deviation: contrastDim, note: `the odd pair: applies the contrasting ${contrastDim} transform (breaks the shared rule)` };
    } else if (i === bestLure) {
      distractorRationales[key] = { lure: 'surface_lure', note: `applies the shared transform, but its result most resembles the odd pair (surface foil)` };
    } else {
      distractorRationales[key] = { lure: 'shared_pair', note: 'applies the shared transform (consistent with the majority rule)' };
    }
  }

  const difficulty = round2(difficultyFromLevers(ops, rowCount, foilPull));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-ODDPAIR-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-ODDPAIR-01.html',
    content: {
      typeCode: 'FLU-ODDPAIR-01',
      sharedOps: ops.slice(), // shared transform dimensions (renderer-agnostic info)
      dims: nDims,
      rowCount,
      rows: options, // display order; each row is a tappable pair (renderable subset)
    },
    answer: {
      correctKey,
      distractorRationales, // keyed by row key -> lure taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-oddpair-01-grammar@1',
      seed,
      levers: {
        ops: ops.slice(),
        dims: nDims,
        rowCount,
        contrastDim,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        foilPull,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint. This type EXCLUDES K-1 by design (spec age_rationale:
// comparing a change across pairs is fragile in K-1); declared bands are 2-3|4-5|6-8.
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
 * (op-set x rowCount) configs; foil pull is the continuous fine-positioner.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const ops of ALLOWED_OPSETS) {
      for (const rowCount of ALLOWED_ROWCOUNTS) {
        const dLo = difficultyFromLevers(ops, rowCount, 0);
        const dHi = difficultyFromLevers(ops, rowCount, 1);
        const a = Math.max(lo, dLo);
        const b = Math.min(hi, dHi);
        if (b > a + 1e-6) segments.push({ ops, rowCount, tLo: a, tHi: b });
      }
    }
    if (segments.length === 0) throw new Error(`no reachable config for difficulty bin k=${k}`);

    const hits = segments.map(() => 0);
    for (let i = 0; i < perBin; i++) hits[i % segments.length]++;
    const localSeen = segments.map(() => 0);

    for (let i = 0; i < perBin; i++) {
      const segIdx = i % segments.length;
      const seg = segments[segIdx];
      const li = localSeen[segIdx]++;
      const nHits = hits[segIdx];
      const t = seg.tLo + (seg.tHi - seg.tLo) * ((li + 0.5) / nHits);
      const foilPull = solveFoil(seg.ops, seg.rowCount, t);
      // Rotate the contrast dimension across the op-set for variety.
      const contrastDim = seg.ops[i % seg.ops.length];
      const seed = `FLU-ODDPAIR-01|bin=${k}|i=${i}|O${seg.ops.join('+')}|R${seg.rowCount}|c${contrastDim}`;
      items.push(genItem({ ops: seg.ops, rowCount: seg.rowCount, contrastDim, foilPull, seed }));
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
  const outPath = resolve(__dirname, '../banks/FLU-ODDPAIR-01.jsonl');
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
  console.log(`FLU-ODDPAIR-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
