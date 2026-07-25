// FLU-STACK-01 "Stack the Panel" — structured bank generator (Bucket A: grammar).
//
// Emits a STRUCTURED item bank (JSONL) conforming to EXAM_ADAPTIVE_BUILD_PLAN.md §2
// (BankItem) and EXAM_ITEM_SCHEMA_SPEC.md. Replicates the FLU-MATRIX-01 reference
// vertical for a logical-combination (figure addition/subtraction) matrix: a seeded
// operator x layer grammar whose difficulty is DERIVED from the type's declared
// difficulty_levers and mapped onto a FLOAT 1..20 rung.
//
// Governance: born-synthetic only (syntheticOnly:true, validated:false). The
// `difficulty` float is a DESIGN rung (relational-complexity model), NOT a calibrated
// IRT parameter (EXAM_ITEM_SCHEMA_SPEC §6.6, RES-012/RES-013). The answer key +
// distractor rationales are server-only and never placed in the renderable content.
//
// Grammar mirrors demos/FLU-STACK-01.html: each row's third panel is the per-layer
// logical combination (OR / XOR / AND) of the first two panels' marks on a small grid.
// Two complete rows reveal the rule; the child completes the last row. Every item is
// audited so the two shown rows UNIQUELY identify the operator per layer. Distractors
// are keyed to the type's error taxonomy (union-for-XOR / wrong operator, dropped
// source, one-layer-wrong) per Carpenter/Just/Shell + the spec's tail_precision_rationale.
//
// Run:  node research/exam-question-types/generators/FLU-STACK-01.mjs
//       writes ../banks/FLU-STACK-01.jsonl and prints a coverage summary.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const OPS = ['OR', 'XOR', 'AND'];

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

/* ------------------------------------------------------------------ *
 * Logical combination on bitmask panels (renderer-agnostic; a mark is a set bit).
 * ------------------------------------------------------------------ */
export function applyOp(a, b, op) {
  return op === 'OR' ? a | b : op === 'XOR' ? a ^ b : a & b;
}
const samePanel = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/* ================================================================== *
 * DIFFICULTY MODEL — difficulty derives from the type's difficulty_levers
 * (types_fluid_reasoning.jsonl FLU-STACK-01):
 *   combination rule OR->XOR->AND | number of marks per cell |
 *   single vs two stacked attribute grids | distractor similarity.
 * Grounded in relational-complexity theory (Halford 1998) and the RPM
 * figure-addition/subtraction process account (Carpenter/Just/Shell 1990):
 * difficulty rises with operator abstraction, grid density, and how many logical
 * relations are combined at once. We map lever settings onto a raw score, then
 * linearly onto a FLOAT 1..20 rung (BUILD_PLAN §0).
 * ================================================================== */
const OP_LOAD = { OR: 1.4, AND: 2.2, XOR: 2.8 }; // XOR is the hardest combination rule
const gridTerm = (bits) => (bits === 4 ? 0.0 : 2.4); // a 3x3 mark grid integrates more marks
const layerInteraction = (layers) => (layers === 2 ? 2.0 : 0.0); // stacking a 2nd grid is superadditive
const DISTRACTOR_SPAN = 3.4; // distractor-similarity lever contributes 0..3.4
const opsLoad = (ops) => ops.reduce((s, o) => s + OP_LOAD[o], 0);
const distractorTerm = (similarity) => DISTRACTOR_SPAN * similarity;

function baseScore(bits, ops) {
  return 1.0 + gridTerm(bits) + opsLoad(ops) + layerInteraction(ops.length);
}

// Allowed lever configs (bits x operator stack), curated so their bases tile 1..20 when
// combined with the continuous distractor-similarity fine-positioner. Single-layer OR on
// a 2x2 grid is the floor (2-3); two stacked XOR grids on a 3x3 grid is the ceiling (6-8).
export const ALLOWED_CONFIGS = [
  { bits: 4, ops: ['OR'] },
  { bits: 4, ops: ['XOR'] },
  { bits: 9, ops: ['OR'] },
  { bits: 9, ops: ['AND'] },
  { bits: 4, ops: ['OR', 'OR'] },
  { bits: 9, ops: ['XOR'] },
  { bits: 4, ops: ['XOR', 'OR'] },
  { bits: 9, ops: ['OR', 'OR'] },
  { bits: 4, ops: ['XOR', 'XOR'] },
  { bits: 9, ops: ['AND', 'OR'] },
  { bits: 9, ops: ['OR', 'XOR'] },
  { bits: 9, ops: ['AND', 'AND'] },
  { bits: 9, ops: ['XOR', 'AND'] },
  { bits: 9, ops: ['XOR', 'XOR'] },
];

const RAW_MIN = Math.min(...ALLOWED_CONFIGS.map((c) => baseScore(c.bits, c.ops))) + distractorTerm(0);
const RAW_MAX = Math.max(...ALLOWED_CONFIGS.map((c) => baseScore(c.bits, c.ops))) + distractorTerm(1);

function rawScore(bits, ops, similarity) {
  return baseScore(bits, ops) + distractorTerm(similarity);
}
export function difficultyFromLevers(bits, ops, similarity) {
  const raw = rawScore(bits, ops, similarity);
  const d = 1 + ((raw - RAW_MIN) * 19) / (RAW_MAX - RAW_MIN);
  return clamp(d, 1, 20);
}
function solveSimilarity(bits, ops, targetD) {
  const rawNeeded = RAW_MIN + ((targetD - 1) * (RAW_MAX - RAW_MIN)) / 19;
  return clamp((rawNeeded - baseScore(bits, ops)) / DISTRACTOR_SPAN, 0, 1);
}

/* ================================================================== *
 * GRAMMAR — build the 3 rows + option panels (mirrors demo genItem semantics).
 * Per layer we sample (a,b) for 3 rows and set c = op(a,b), rejecting degenerate
 * cells and any assignment where the two SHOWN rows do not uniquely fix the operator.
 * ================================================================== */
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Build 3 rows {a,b,c} for ONE layer under operator `op`, with a UNIQUE-operator audit
// on the two shown rows (rows 0 and 1) so the checker can re-infer the rule.
function mkLayerRows(op, bits, rng) {
  const max = (1 << bits) - 1;
  for (let attempt = 0; attempt < 500; attempt++) {
    const rowsL = [];
    let good = true;
    for (let r = 0; r < 3; r++) {
      let a = 0;
      let b = 0;
      let c = 0;
      let g = 0;
      do {
        a = 1 + Math.floor(rng() * max);
        b = 1 + Math.floor(rng() * max);
        c = applyOp(a, b, op);
        g++;
      } while (
        (c === 0 || a === b || c === a || c === b || ((op === 'OR' || op === 'XOR') && (a & b) === 0)) &&
        g < 200
      );
      if (c === 0 || a === b || c === a || c === b) {
        good = false;
        break;
      }
      rowsL.push({ a, b, c });
    }
    if (!good) continue;
    // Uniqueness: `op` must be the ONLY operator fitting BOTH shown rows (0 and 1).
    const shown = [rowsL[0], rowsL[1]];
    const fits = (o) => shown.every((rw) => applyOp(rw.a, rw.b, o) === rw.c);
    if (OPS.filter((o) => o !== op).some((o) => fits(o))) continue; // ambiguous -> resample
    return rowsL;
  }
  throw new Error(`mkLayerRows: could not satisfy uniqueness for op ${op} bits ${bits}`);
}
function mkRows(bits, ops, rng) {
  const layerRows = ops.map((op) => mkLayerRows(op, bits, rng)); // per layer: 3x {a,b,c}
  const rows = [];
  for (let r = 0; r < 3; r++) {
    rows.push({
      a: layerRows.map((lr) => lr[r].a),
      b: layerRows.map((lr) => lr[r].b),
      c: layerRows.map((lr) => lr[r].c),
    });
  }
  return rows;
}

/**
 * Generate ONE structured BankItem.
 * @param {{bits:number, ops:string[], distractorSimilarity:number, seed:string}} lever
 */
export function genItem({ bits, ops, distractorSimilarity, seed }) {
  const rng = makeRng(seed);
  const layers = ops.length;
  const rows = mkRows(bits, ops, rng);
  const A2 = rows[2].a;
  const B2 = rows[2].b;
  const C2 = rows[2].c; // the (blank) answer panel

  const pool = [];
  const push = (panel, lure, detail) => {
    if (pool.some((o) => samePanel(o.panel, panel))) return false;
    pool.push({ panel: panel.slice(), lure, detail: detail ?? null });
    return true;
  };
  push(C2, 'correct', null);

  // NEAR foils: apply the WRONG combination rule (subtle, rule-level near-miss).
  const nearFoils = [];
  for (const alt of OPS) {
    nearFoils.push(() => {
      if (ops.every((op) => op === alt)) return false;
      return push(A2.map((a, l) => applyOp(a, B2[l], alt)), 'wrong_operator', alt);
    });
  }
  if (layers === 2) {
    for (const alt of OPS) {
      nearFoils.push(() => {
        if (alt === ops[1]) return false;
        return push([C2[0], applyOp(A2[1], B2[1], alt)], 'one_layer_wrong', alt);
      });
    }
  }

  // FAR foils: dropped a whole source panel, or an unrelated (random) panel.
  const farFoils = [];
  farFoils.push(() => push(A2.slice(), 'dropped_source', 'B'));
  farFoils.push(() => push(B2.slice(), 'dropped_source', 'A'));
  const max = (1 << bits) - 1;
  for (let k = 0; k < 8; k++) farFoils.push(() => push(A2.map(() => 1 + Math.floor(rng() * max)), 'random', null));

  const nOptions = layers === 2 ? 5 : 4;
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

  const shuffledPool = shuffle(pool, rng);
  const options = shuffledPool.map((o, i) => ({ key: OPTION_KEYS[i], panel: o.panel.slice() }));

  // Server-only answer + distractor taxonomy (keyed to combination errors).
  let correctKey = null;
  const distractorRationales = {};
  shuffledPool.forEach((o, i) => {
    const key = OPTION_KEYS[i];
    if (o.lure === 'correct') {
      correctKey = key;
      distractorRationales[key] = { lure: 'correct', note: `applies the row rule (${ops.join(' + ')}) to combine the last row` };
    } else if (o.lure === 'wrong_operator') {
      distractorRationales[key] = { lure: 'wrong_operator', operator: o.detail, note: `combines with ${o.detail} instead of the row rule (${ops.join(' + ')})` };
    } else if (o.lure === 'one_layer_wrong') {
      distractorRationales[key] = { lure: 'one_layer_wrong', operator: o.detail, note: `correct on layer 1 but uses ${o.detail} on layer 2 (partial rule)` };
    } else if (o.lure === 'dropped_source') {
      distractorRationales[key] = { lure: 'dropped_source', dropped: o.detail, note: `copies one source panel (dropped ${o.detail}) instead of combining both` };
    } else {
      distractorRationales[key] = { lure: 'random', note: 'unrelated panel (off-rule)' };
    }
  });

  const difficulty = round2(difficultyFromLevers(bits, ops, distractorSimilarity));

  return {
    itemId: seededUuid(seed),
    typeCode: 'FLU-STACK-01',
    domain: 'fluid_reasoning',
    difficulty, // FLOAT 1..20 — DESIGN rung, not calibrated (validated:false)
    ageBands: ageBandsFor(difficulty),
    demoPath: 'demos/FLU-STACK-01.html',
    content: {
      typeCode: 'FLU-STACK-01',
      bits,
      gridSide: Math.round(Math.sqrt(bits)),
      layers,
      ops: ops.slice(), // the combination rule (inferable from the complete rows)
      rows: rows.map((r, ri) =>
        ri === 2 ? { a: r.a.slice(), b: r.b.slice(), c: null } : { a: r.a.slice(), b: r.b.slice(), c: r.c.slice() },
      ),
      blank: { row: 2 },
      options, // display order; renderable subset (no lure/answer)
    },
    answer: {
      correctKey,
      distractorRationales, // keyed by option key -> combination-error taxonomy
    },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'grammar',
      generatorRef: 'flu-stack-01-grammar@1',
      seed,
      levers: {
        bits,
        ops: ops.slice(),
        layers,
        // Full precision (not rounded): enables exact, reproducible regeneration.
        distractorSimilarity,
      },
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Age-band targeting hint from the difficulty rung. This type EXCLUDES K-1 by design
// (spec age_rationale: combining two whole cells exceeds K-1 working memory); declared
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
 * across overlapping lever configs; distractor similarity is the fine-positioner.
 * ================================================================== */
export function buildBank({ perBin = 6 } = {}) {
  const items = [];
  for (let k = 1; k <= 20; k++) {
    const lo = Math.max(1, k - 0.45);
    const hi = Math.min(20, k + 0.45);

    const segments = [];
    for (const cfg of ALLOWED_CONFIGS) {
      const dLo = difficultyFromLevers(cfg.bits, cfg.ops, 0);
      const dHi = difficultyFromLevers(cfg.bits, cfg.ops, 1);
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
      const similarity = solveSimilarity(seg.bits, seg.ops, t);
      const seed = `FLU-STACK-01|bin=${k}|i=${i}|b${seg.bits}o${seg.ops.join('+')}`;
      items.push(genItem({ bits: seg.bits, ops: seg.ops, distractorSimilarity: similarity, seed }));
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
  const outPath = resolve(__dirname, '../banks/FLU-STACK-01.jsonl');
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
  console.log(`FLU-STACK-01 bank: ${items.length} items -> ${outPath}`);
  console.log(`difficulty span: ${round2(min)} .. ${round2(max)}  (target 1..20)`);
  console.log('per-bin counts (k: n):');
  console.log(bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join('  '));
  const short = bins.map((n, i) => ({ k: i + 1, n })).filter((b) => b.n < 5);
  console.log(short.length ? `SHORT BINS (<5): ${short.map((b) => b.k).join(',')}` : 'all bins >=5 OK');
}
