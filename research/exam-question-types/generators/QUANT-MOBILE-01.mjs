#!/usr/bin/env node
/**
 * QUANT-MOBILE-01 — "Hanging Mobile" structured bank generator (Bucket A: grammar).
 *
 * Emits a JSONL bank of BankItem rows conforming to the Adaptive Exam item
 * contract (docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md §2 and
 * docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md). Every item is born-synthetic
 * (syntheticOnly:true, validated:false); difficulty is a design rung (FLOAT
 * 1..20), NOT a calibrated IRT parameter.
 *
 * TASK. A mobile hangs from the ceiling: a tree of beams, each beam carrying a
 * load on a LEFT arm of length armL and a RIGHT arm of length armR. Every beam
 * hangs level, so for every beam
 *
 *     weight(left subtree) * armL  ==  weight(right subtree) * armR
 *
 * (the lever/torque relation). Repeated figures carry consistent hidden
 * weights, so the level beams themselves are the only clues to those weights.
 * One hook is empty; the child picks which of four candidate clusters keeps
 * EVERY arm level. Response is one option key -> scoring.mode
 * 'deterministic_key'.
 *
 * DIFFICULTY IS STRUCTURAL, NOT ARITHMETIC. The ladder grows the number of
 * beams, the tree depth, the number of distinct hidden figure weights, whether
 * the missing load must be reached by substitution rather than copying, and —
 * at the top — how many beams have UNEQUAL arms, which forces genuine inverse
 * proportional reasoning (a short arm needs a proportionally heavier load).
 * Figure weights stay in 1..7 and clusters stay at =<6 pieces at every rung, so
 * the ceiling is relational complexity, not computation.
 *
 * UNIQUE-ANSWER GATE. A solver reads ONLY served content (tree geometry, the
 * visible clusters, the options) and solves the linear system formed by the
 * beam equations, anchoring the first visible figure to weight 1 (scale is
 * arbitrary and cancels). It rejects any item whose beams do not FULLY
 * determine every figure weight AND the missing load, then requires exactly one
 * served option to match that load, and that it equals the intended key.
 * Because it never reads `answer`, it doubles as the no-leak validator.
 *
 * Usage:  node QUANT-MOBILE-01.mjs [--seed=<str>] [--per=<n>] [--out=<path>]
 * Default: seed "quant-mobile-01-v1", 6 items per difficulty rung (1..20) -> ~120.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPE_CODE = 'QUANT-MOBILE-01';
const DOMAIN = 'quantitative';
const GENERATOR_REF = 'QUANT-MOBILE-01-grammar@1';
const DEMO_PATH = 'demos/QUANT-MOBILE-01.html';
const SHAPE_NAMES = ['moon', 'star', 'diamond', 'triangle']; // base -> heavier; base anchored to 1
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/* ------------------------------------------------------------------ *
 * Seeded PRNG (deterministic, reproducible per provenance.seed)
 * ------------------------------------------------------------------ */
function xfnv1a(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
class Rng {
  constructor(seedStr) { this.seed = seedStr; this._r = mulberry32(xfnv1a(seedStr)); }
  next() { return this._r(); }
  int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = this.int(0, i);[a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  uuid() {
    const b = Array.from({ length: 16 }, () => this.int(0, 255));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = b.map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
}

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const clusterSig = (c) => c.slice().sort().join('+');

/* ------------------------------------------------------------------ *
 * Linear solver over the beam equations (Gauss-Jordan). Returns a map
 * var -> positive integer value, or null when the system is inconsistent,
 * under-determined, or not positive-integral.
 * ------------------------------------------------------------------ */
function solveLinear(vars, equations) {
  const n = vars.length;
  const m = equations.map((e) => [...e.coef, e.rhs]);
  const pivotRowForCol = Array(n).fill(-1);
  let r = 0;
  for (let col = 0; col < n; col++) {
    let piv = -1;
    for (let rr = r; rr < m.length; rr++) if (Math.abs(m[rr][col]) > 1e-9) { piv = rr; break; }
    if (piv < 0) continue;
    [m[r], m[piv]] = [m[piv], m[r]];
    const pv = m[r][col];
    for (let c = 0; c <= n; c++) m[r][c] /= pv;
    for (let rr = 0; rr < m.length; rr++) {
      if (rr !== r && Math.abs(m[rr][col]) > 1e-12) {
        const f = m[rr][col];
        for (let c = 0; c <= n; c++) m[rr][c] -= f * m[r][c];
      }
    }
    pivotRowForCol[col] = r; r++;
  }
  for (let rr = 0; rr < m.length; rr++) {                  // consistency: no 0 = nonzero
    let z = true; for (let c = 0; c < n; c++) if (Math.abs(m[rr][c]) > 1e-9) { z = false; break; }
    if (z && Math.abs(m[rr][n]) > 1e-9) return null;
  }
  for (let col = 0; col < n; col++) if (pivotRowForCol[col] < 0) return null;   // under-determined
  const out = {};
  for (let col = 0; col < n; col++) {
    const val = m[pivotRowForCol[col]][n];
    const rv = Math.round(val);
    if (Math.abs(val - rv) > 1e-6 || rv <= 0) return null;
    out[vars[col]] = rv;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Served-content solver: recover every figure weight + the missing load
 * from the mobile geometry alone, then find the unique balancing option.
 * Reads NOTHING from `answer` (this is the no-leak gate).
 * ------------------------------------------------------------------ */
const HOLE_VAR = '#missing';

export function visibleShapes(tree) {
  const seen = new Set();
  (function walk(n) {
    if (n.kind === 'beam') { walk(n.left); walk(n.right); }
    else if (n.kind === 'leaf') for (const s of n.cluster) seen.add(s);
  })(tree);
  return seen;
}

export function analyzeMobile(content) {
  const vars = [...content.shapes, HOLE_VAR];
  const idx = new Map(vars.map((v, i) => [v, i]));
  let holes = 0;

  // Subtree weight as a coefficient vector over [shapes..., missing load].
  const coefOf = (node) => {
    const v = Array(vars.length).fill(0);
    let bad = false;
    (function walk(n) {
      if (n.kind === 'beam') { walk(n.left); walk(n.right); }
      else if (n.kind === 'hole') v[idx.get(HOLE_VAR)] += 1;
      else for (const s of n.cluster) { if (!idx.has(s)) { bad = true; return; } v[idx.get(s)] += 1; }
    })(node);
    return bad ? null : v;
  };

  (function countHoles(n) {
    if (n.kind === 'beam') { countHoles(n.left); countHoles(n.right); }
    else if (n.kind === 'hole') holes++;
  })(content.tree);
  if (holes !== 1) return { unique: false, reason: 'expected exactly one empty hook' };

  const equations = [];
  let malformed = false;
  (function collect(n) {
    if (n.kind !== 'beam') return;
    const cl = coefOf(n.left), cr = coefOf(n.right);
    if (!cl || !cr) { malformed = true; return; }
    equations.push({ coef: cl.map((x, i) => x * n.armL - cr[i] * n.armR), rhs: 0 });
    collect(n.left); collect(n.right);
  })(content.tree);
  if (malformed) return { unique: false, reason: 'option/leaf uses an undeclared figure' };
  if (!equations.length) return { unique: false, reason: 'no beams' };

  // Scale is arbitrary: anchor the first declared figure that is actually
  // visible on the mobile to weight 1. Every ratio (and the answer) is invariant.
  const visible = visibleShapes(content.tree);
  const anchor = content.shapes.find((s) => visible.has(s));
  if (!anchor) return { unique: false, reason: 'no visible figure to anchor' };
  const ac = Array(vars.length).fill(0); ac[idx.get(anchor)] = 1;
  equations.push({ coef: ac, rhs: 1 });

  const sol = solveLinear(vars, equations);
  if (!sol) return { unique: false, reason: 'beams do not determine every weight' };

  const missing = sol[HOLE_VAR];
  const optWeight = (cluster) => cluster.reduce((s, x) => s + (sol[x] ?? NaN), 0);
  const matching = (content.options || []).filter((o) => optWeight(o.cluster) === missing);
  return {
    weights: Object.fromEntries(content.shapes.map((s) => [s, sol[s]])),
    missing,
    anchor,
    unique: matching.length === 1,
    correctKey: matching.length === 1 ? matching[0].key : null,
  };
}

/* ------------------------------------------------------------------ *
 * Mobile construction
 * ------------------------------------------------------------------ */
function shapeWeights(rng, count) {
  const w = { moon: 1 };
  if (count >= 2) w.star = rng.pick([2, 3]);
  if (count >= 3) w.diamond = w.star + rng.pick([1, 2]);
  if (count >= 4) w.triangle = w.diamond + rng.pick([1, 2]);
  return w;
}

// All clusters of 1..maxPieces figures, indexed by total weight.
function clusterTable(shapes, w, maxPieces) {
  const table = new Map();
  const cur = [];
  (function rec(start, sum) {
    if (cur.length) {
      if (!table.has(sum)) table.set(sum, []);
      table.get(sum).push(cur.slice());
    }
    if (cur.length >= maxPieces) return;
    for (let i = start; i < shapes.length; i++) { cur.push(shapes[i]); rec(i, sum + w[shapes[i]]); cur.pop(); }
  })(0, 0);
  return table;
}

function buildSkeleton(rng, beams, maxDepth) {
  const root = { kind: 'leaf', depth: 0 };
  const leaves = [root];
  for (let b = 0; b < beams; b++) {
    const cands = leaves.filter((l) => l.depth < maxDepth);
    if (!cands.length) return null;
    const node = rng.pick(cands);
    leaves.splice(leaves.indexOf(node), 1);
    node.kind = 'beam';
    node.left = { kind: 'leaf', depth: node.depth + 1, parent: node, side: 'left' };
    node.right = { kind: 'leaf', depth: node.depth + 1, parent: node, side: 'right' };
    leaves.push(node.left, node.right);
  }
  return root;
}
const collect = (node, pred, out = []) => {
  if (pred(node)) out.push(node);
  if (node.kind === 'beam') { collect(node.left, pred, out); collect(node.right, pred, out); }
  return out;
};
const allBeams = (n) => collect(n, (x) => x.kind === 'beam');
const allLeaves = (n) => collect(n, (x) => x.kind !== 'beam');

// Minimal root weight that lets every beam split into positive integers.
function minMultiple(node) {
  if (node.kind !== 'beam') return 1;
  const mL = minMultiple(node.left), mR = minMultiple(node.right);
  const s = node.armL + node.armR;
  const kNeed = lcm(mL / gcd(mL, node.armR), mR / gcd(mR, node.armL));
  return s * kNeed;
}
function assignWeights(node, W) {
  node.weight = W;
  if (node.kind !== 'beam') return Number.isInteger(W) && W >= 1;
  const s = node.armL + node.armR;
  if (W % s) return false;
  const k = W / s;
  return assignWeights(node.left, k * node.armR) && assignWeights(node.right, k * node.armL);
}

function toContentNode(node, hole) {
  if (node === hole) return { kind: 'hole' };
  if (node.kind === 'beam') {
    return { kind: 'beam', armL: node.armL, armR: node.armR, left: toContentNode(node.left, hole), right: toContentNode(node.right, hole) };
  }
  return { kind: 'leaf', cluster: node.cluster.slice() };
}

function genMobile(rng, cfg) {
  const shapes = SHAPE_NAMES.slice(0, cfg.shapeCount);
  const w = shapeWeights(rng, cfg.shapeCount);

  const root = buildSkeleton(rng, cfg.beams, cfg.maxDepth);
  if (!root) return null;
  const beams = allBeams(root);
  const leaves = allLeaves(root);
  if (leaves.length < 2) return null;

  // The empty hook. Deeper hooks force the child to propagate a solved lower
  // arm up through its parents.
  const deepest = Math.max(...leaves.map((l) => l.depth));
  const holePool = cfg.deepHole ? leaves.filter((l) => l.depth >= deepest - 1) : leaves;
  const hole = rng.pick(holePool);

  // Arms. Unequal arms make the load inversely proportional to arm length.
  beams.forEach((b) => { b.armL = 1; b.armR = 1; });
  let unequalPicks = [];
  if (cfg.unequal > 0) {
    const ordered = cfg.holeUnequal
      ? [hole.parent, ...rng.shuffle(beams.filter((b) => b !== hole.parent))]
      : rng.shuffle(beams);
    unequalPicks = ordered.slice(0, Math.min(cfg.unequal, beams.length));
    for (const b of unequalPicks) { const [x, y] = rng.pick(cfg.armPool); b.armL = x; b.armR = y; }
  }
  if (cfg.holeUnequal && hole.parent.armL === hole.parent.armR) return null;

  // Weights top-down; the whole mobile must stay physically small.
  const base = minMultiple(root);
  if (base > cfg.maxLeafWeight * 6) return null;
  const scale = rng.int(1, cfg.scaleMax);
  if (!assignWeights(root, base * scale)) return null;
  if (leaves.some((l) => l.weight < 1 || l.weight > cfg.maxLeafWeight)) return null;

  // Visible clusters.
  const table = clusterTable(shapes, w, cfg.maxPieces);
  for (const leaf of leaves) {
    if (leaf === hole) continue;
    const pool = table.get(leaf.weight);
    if (!pool || !pool.length) return null;
    leaf.cluster = rng.pick(pool).slice();
  }
  const usedVisible = new Set();
  for (const leaf of leaves) if (leaf !== hole) leaf.cluster.forEach((s) => usedVisible.add(s));
  if (usedVisible.size !== shapes.length) return null;      // every declared figure must be inferable

  const X = hole.weight;
  const sibling = hole.side === 'left' ? hole.parent.right : hole.parent.left;
  const aHole = hole.side === 'left' ? hole.parent.armL : hole.parent.armR;
  const aSib = hole.side === 'left' ? hole.parent.armR : hole.parent.armL;
  const siblingWeight = sibling.weight;
  const siblingCluster = sibling.kind === 'leaf' ? sibling.cluster : null;

  // ---- correct cluster: weight X; a substitution (new composition) when required ----
  const exact = (table.get(X) || []).filter((c) => c.every((s) => usedVisible.has(s)));
  if (!exact.length) return null;
  let correctPool = exact;
  if (cfg.substitute && siblingCluster) {
    const filtered = exact.filter((c) => clusterSig(c) !== clusterSig(siblingCluster));
    if (filtered.length) correctPool = filtered;
  }
  const correct = rng.pick(correctPool).slice();

  // ---- distractors: never weight X; each keyed to a named misconception ----
  const everything = [];
  for (const [weight, list] of table) for (const c of list) {
    if (c.every((s) => usedVisible.has(s))) everything.push({ cluster: c, weight, pieces: c.length });
  }
  everything.sort((a, b) => a.pieces - b.pieces || clusterSig(a.cluster).localeCompare(clusterSig(b.cluster)));

  const used = new Set([clusterSig(correct)]);
  const usedWeights = new Set([X]);
  const distract = [];
  const take = (pred, lure, misconception, note) => {
    if (distract.length >= 3) return;
    const c = everything.find((p) => !used.has(clusterSig(p.cluster)) && p.weight !== X && !usedWeights.has(p.weight) && pred(p));
    if (c) { used.add(clusterSig(c.cluster)); usedWeights.add(c.weight); distract.push({ ...c, lure, misconception, note }); }
  };
  // 1. copies the other side of the beam, ignoring that the arms differ in length
  take((p) => p.weight === siblingWeight, 'proportional_lure', 'ignored_lever_ratio',
    `matches the other arm's load (${siblingWeight}) instead of scaling it by the arm ratio ${aSib}:${aHole}`);
  // 2. applies the arm ratio the wrong way round
  const inverted = (siblingWeight * aHole) / aSib;
  take((p) => Number.isInteger(inverted) && p.weight === inverted, 'proportional_lure', 'inverted_lever_ratio',
    `scales by ${aHole}:${aSib} instead of ${aSib}:${aHole}`);
  // 3. counts figures instead of weighing them (matches the sibling's piece count)
  if (siblingCluster) {
    take((p) => p.pieces === siblingCluster.length, 'surface_match', 'matched_count_not_weight',
      `same number of figures as the other arm (${siblingCluster.length}) but a different load`);
  }
  // 4. treats every figure as one unit, so it brings X figures of any kind
  take((p) => p.pieces === X, 'surface_match', 'all_figures_weigh_the_same',
    `brings ${X} figures as if each figure weighed one unit`);
  // 5. near miss: one unit off
  take((p) => Math.abs(p.weight - X) === 1, 'near_order', 'off_by_one_unit', 'one unit heavier or lighter than the balancing load');
  // 6. solved only the arm it can see, ignoring the beams above it
  take((p) => Math.abs(p.weight - X) >= 2, 'rule_violation', 'solved_one_relation_only', 'satisfies no beam once the chain is followed up');
  take(() => true, 'distractor_other', 'other_load', 'off-balance load');
  if (distract.length < 3) return null;

  return {
    shapes, weights: w, root, hole, correct, distract,
    meta: {
      beams: beams.length,
      depth: deepest,
      shapeCount: shapes.length,
      unequalBeams: beams.filter((b) => b.armL !== b.armR).length,
      holeArms: `${aHole}:${aSib}`,
      holeDepth: hole.depth,
      missingLoad: X,
      rootLoad: root.weight,
      substitution: !!(cfg.substitute && siblingCluster && clusterSig(correct) !== clusterSig(siblingCluster)),
      family: beams.filter((b) => b.armL !== b.armR).length
        ? 'lever-ratio'
        : (cfg.substitute ? 'substitution-chain' : 'direct-equivalence'),
    },
  };
}

/* ------------------------------------------------------------------ *
 * Difficulty schedule: rung (1..20) -> generator config.
 * Rungs 1-3 are one beam with a single figure type (count and match).
 * Mid rungs add beams, depth, figure types and substitution chains.
 * Rungs 11+ add UNEQUAL ARMS: the missing load is inversely proportional to
 * its arm length, which is the structural (not arithmetic) ceiling.
 * ------------------------------------------------------------------ */
const A12 = [[1, 2], [2, 1]];
const A123 = [[1, 2], [2, 1], [2, 3], [3, 2]];
function configFor(d) {
  const table = {
    1: { beams: 1, maxDepth: 1, shapeCount: 1, unequal: 0, armPool: A12, holeUnequal: false, substitute: false, deepHole: false, maxPieces: 5, maxLeafWeight: 4, scaleMax: 3 },
    2: { beams: 1, maxDepth: 1, shapeCount: 1, unequal: 0, armPool: A12, holeUnequal: false, substitute: false, deepHole: false, maxPieces: 6, maxLeafWeight: 5, scaleMax: 5 },
    3: { beams: 2, maxDepth: 2, shapeCount: 1, unequal: 0, armPool: A12, holeUnequal: false, substitute: false, deepHole: false, maxPieces: 4, maxLeafWeight: 6, scaleMax: 3 },
    4: { beams: 2, maxDepth: 2, shapeCount: 2, unequal: 0, armPool: A12, holeUnequal: false, substitute: false, deepHole: false, maxPieces: 4, maxLeafWeight: 8, scaleMax: 3 },
    5: { beams: 2, maxDepth: 2, shapeCount: 2, unequal: 0, armPool: A12, holeUnequal: false, substitute: true, deepHole: false, maxPieces: 4, maxLeafWeight: 9, scaleMax: 3 },
    6: { beams: 3, maxDepth: 2, shapeCount: 2, unequal: 0, armPool: A12, holeUnequal: false, substitute: true, deepHole: false, maxPieces: 4, maxLeafWeight: 10, scaleMax: 3 },
    7: { beams: 3, maxDepth: 3, shapeCount: 2, unequal: 0, armPool: A12, holeUnequal: false, substitute: true, deepHole: true, maxPieces: 5, maxLeafWeight: 12, scaleMax: 3 },
    8: { beams: 3, maxDepth: 3, shapeCount: 3, unequal: 0, armPool: A12, holeUnequal: false, substitute: true, deepHole: false, maxPieces: 5, maxLeafWeight: 14, scaleMax: 3 },
    9: { beams: 4, maxDepth: 3, shapeCount: 3, unequal: 0, armPool: A12, holeUnequal: false, substitute: true, deepHole: true, maxPieces: 5, maxLeafWeight: 16, scaleMax: 3 },
    10: { beams: 4, maxDepth: 3, shapeCount: 3, unequal: 0, armPool: A12, holeUnequal: false, substitute: true, deepHole: true, maxPieces: 5, maxLeafWeight: 18, scaleMax: 4 },
    11: { beams: 4, maxDepth: 3, shapeCount: 3, unequal: 1, armPool: A12, holeUnequal: false, substitute: true, deepHole: true, maxPieces: 5, maxLeafWeight: 20, scaleMax: 2 },
    12: { beams: 4, maxDepth: 3, shapeCount: 3, unequal: 1, armPool: A12, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 5, maxLeafWeight: 20, scaleMax: 2 },
    13: { beams: 5, maxDepth: 3, shapeCount: 3, unequal: 1, armPool: A12, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 5, maxLeafWeight: 22, scaleMax: 2 },
    14: { beams: 5, maxDepth: 4, shapeCount: 3, unequal: 1, armPool: A123, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 6, maxLeafWeight: 24, scaleMax: 2 },
    15: { beams: 5, maxDepth: 4, shapeCount: 4, unequal: 1, armPool: A123, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 6, maxLeafWeight: 26, scaleMax: 2 },
    16: { beams: 6, maxDepth: 4, shapeCount: 4, unequal: 2, armPool: A123, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 6, maxLeafWeight: 28, scaleMax: 2 },
    17: { beams: 6, maxDepth: 4, shapeCount: 4, unequal: 2, armPool: A123, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 6, maxLeafWeight: 30, scaleMax: 2 },
    18: { beams: 6, maxDepth: 5, shapeCount: 4, unequal: 3, armPool: A123, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 6, maxLeafWeight: 32, scaleMax: 1 },
    19: { beams: 7, maxDepth: 5, shapeCount: 4, unequal: 3, armPool: A123, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 6, maxLeafWeight: 34, scaleMax: 1 },
    20: { beams: 7, maxDepth: 5, shapeCount: 4, unequal: 4, armPool: A123, holeUnequal: true, substitute: true, deepHole: true, maxPieces: 6, maxLeafWeight: 36, scaleMax: 1 },
  };
  return table[d];
}

/* ------------------------------------------------------------------ *
 * Age bands. The catalog declares only 2-3 | 4-5 | 6-8 for this type (K-1 is
 * served by the single-scale QUANT-BALANCE-01), so the 1..20 design ladder is
 * mapped onto the three declared bands: the sub-rung floor targets the
 * youngest declared band rather than inventing a K-1 target.
 * ------------------------------------------------------------------ */
function ageBandsFor(rung) {
  if (rung <= 7) return ['2-3'];
  if (rung === 8) return ['2-3', '4-5'];
  if (rung <= 11) return ['4-5'];
  if (rung === 12) return ['4-5', '6-8'];
  return ['6-8'];
}

/* ------------------------------------------------------------------ */
export function buildItem(masterSeed, rung, ordinal) {
  const MAX_TRIES = 1200;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const seed = `${masterSeed}:${TYPE_CODE}:d${rung}:i${ordinal}:a${attempt}`;
    const rng = new Rng(seed);
    const cfg = configFor(rung);
    const built = genMobile(rng, cfg);
    if (!built) continue;
    const { shapes, weights, root, hole, correct, distract, meta } = built;

    const optDefs = rng.shuffle([
      { cluster: correct, _correct: true },
      ...distract.map((d) => ({ cluster: d.cluster, lure: d.lure, misconception: d.misconception, note: d.note })),
    ]);
    const options = optDefs.map((o, i) => ({ key: OPTION_KEYS[i], cluster: o.cluster.slice() }));
    const correctKey = OPTION_KEYS[optDefs.findIndex((o) => o._correct)];
    const distractorRationales = {};
    optDefs.forEach((o, i) => {
      if (o._correct) return;
      distractorRationales[OPTION_KEYS[i]] = { lure: o.lure, misconception: o.misconception, note: o.note };
    });

    const content = {
      typeCode: TYPE_CODE,
      display: 'mobile',
      shapes,                                    // declared figures (anchor = first visible one)
      tree: toContentNode(root, hole),           // beams carry armL/armR; one leaf is {kind:'hole'}
      options,                                   // 4 candidate clusters (weights NOT served)
      prompt: 'Tap the group of figures that keeps every arm of the mobile level.',
    };

    // UNIQUE-answer gate: solve from served content only, never from `answer`.
    const verdict = analyzeMobile(content);
    if (!verdict.unique || verdict.correctKey !== correctKey) continue;
    if (verdict.missing !== meta.missingLoad) continue;

    // options must be distinct as multisets
    const sigs = new Set(options.map((o) => clusterSig(o.cluster)));
    if (sigs.size !== options.length) continue;

    const jitter = (rng.next() - 0.5) * 0.84;
    const difficulty = Math.min(20, Math.max(1, Math.round((rung + jitter) * 100) / 100));

    return {
      itemId: rng.uuid(),
      typeCode: TYPE_CODE,
      domain: DOMAIN,
      difficulty,
      ageBands: ageBandsFor(rung),
      demoPath: DEMO_PATH,
      content,
      answer: { correctKey, distractorRationales },
      scoring: { mode: 'deterministic_key' },
      provenance: {
        generator: 'grammar',
        generatorRef: GENERATOR_REF,
        seed,
        ruleFamily: meta.family,
        levers: {
          beams: meta.beams, depth: meta.depth, shapeCount: meta.shapeCount,
          unequalBeams: meta.unequalBeams, holeArms: meta.holeArms, holeDepth: meta.holeDepth,
          substitution: meta.substitution, difficultyRung: rung, aboveLevel: rung >= 16,
        },
        ruleSpec: { weights, missingLoad: meta.missingLoad, rootLoad: meta.rootLoad },
        validator: [
          { check: 'unique_answer', status: 'pass', detail: `beams determine ${JSON.stringify(weights)}; missing load ${verdict.missing}; one balancing option (${correctKey})` },
          { check: 'key_matches_solver', status: 'pass', detail: `analyzeMobile -> ${verdict.correctKey}` },
          { check: 'weights_fully_determined', status: 'pass', detail: `${meta.beams} level beam(s) pin ${shapes.length} figure weight(s) + the missing load` },
          { check: 'lure_taxonomy_ok', status: 'pass', detail: Object.values(distractorRationales).map((r) => r.misconception).join(', ') },
          { check: 'reading_load_ok', status: 'pass', detail: 'single on-screen instruction line; no prose stimulus' },
        ],
      },
      syntheticOnly: true,
      validated: false,
    };
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Post-write verification: parse + structure + no-leak re-derivation +
 * coverage (>=5 per +/-1pt band)
 * ------------------------------------------------------------------ */
const LEAK_KEYS = ['weight', 'weights', 'answer', 'correctKey', 'correct', 'isCorrect', 'lure',
  'misconception', 'missingLoad', 'rootLoad', 'tolerance', 'difficultyRung'];
function leakedKey(node) {
  if (Array.isArray(node)) { for (const x of node) { const k = leakedKey(x); if (k) return k; } return null; }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (LEAK_KEYS.includes(k)) return k;
      const inner = leakedKey(node[k]); if (inner) return inner;
    }
  }
  return null;
}

function verifyBank(path) {
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());
  const items = [];
  const problems = [];
  lines.forEach((line, i) => {
    let it; try { it = JSON.parse(line); } catch (e) { problems.push(`line ${i + 1}: JSON parse error`); return; }
    items.push(it);
    if (it.typeCode !== TYPE_CODE) problems.push(`${it.itemId}: bad typeCode`);
    if (it.domain !== DOMAIN) problems.push(`${it.itemId}: bad domain`);
    if (!(it.difficulty >= 1 && it.difficulty <= 20)) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.scoring?.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode`);
    if (it.demoPath !== DEMO_PATH) problems.push(`${it.itemId}: demoPath`);
    const opts = it.content?.options || [];
    if (opts.length !== 4) problems.push(`${it.itemId}: expected 4 options`);
    const keys = opts.map((o) => o.key);
    if (!keys.includes(it.answer?.correctKey)) problems.push(`${it.itemId}: correctKey not an option`);
    for (const k of keys.filter((k) => k !== it.answer.correctKey)) {
      if (!it.answer.distractorRationales?.[k]) problems.push(`${it.itemId}: missing rationale for ${k}`);
    }
    const leak = leakedKey(it.content);
    if (leak) problems.push(`${it.itemId}: content leaks "${leak}"`);
    const verdict = analyzeMobile(it.content);
    if (!verdict.unique) problems.push(`${it.itemId}: solver: ${verdict.reason || 'non-unique balance'}`);
    else if (verdict.correctKey !== it.answer.correctKey) problems.push(`${it.itemId}: solver key != keyed answer`);
  });

  const bands = {};
  for (let p = 1; p <= 20; p++) bands[p] = 0;
  const rounded = {};
  for (const it of items) {
    for (let p = 1; p <= 20; p++) if (Math.abs(it.difficulty - p) <= 1) bands[p]++;
    const r = Math.round(it.difficulty); rounded[r] = (rounded[r] || 0) + 1;
  }
  const thinBands = Object.entries(bands).filter(([, c]) => c < 5).map(([p]) => p);
  return { count: items.length, bands, rounded, thinBands, problems, items };
}

/* ------------------------------------------------------------------ */
function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }));
  const masterSeed = args.seed || 'quant-mobile-01-v1';
  const perRung = parseInt(args.per || '6', 10);
  const outPath = resolve(HERE, args.out || '../banks/QUANT-MOBILE-01.jsonl');

  mkdirSync(dirname(outPath), { recursive: true });

  const items = [];
  const perRungCount = {};
  for (let rung = 1; rung <= 20; rung++) {
    let made = 0;
    for (let ordinal = 0; ordinal < perRung; ordinal++) {
      const it = buildItem(masterSeed, rung, ordinal);
      if (it) { items.push(it); made++; }
    }
    perRungCount[rung] = made;
  }

  writeFileSync(outPath, serializeBank(items), 'utf8');
  const v = verifyBank(outPath);

  console.log(`\nQUANT-MOBILE-01 bank written: ${outPath}`);
  console.log(`items: ${v.count}  (target ${perRung}/rung x 20 rungs)`);
  console.log('\nrung -> made:');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${perRungCount[i + 1]}`).join('  '));
  console.log('\ninteger bucket (rounded difficulty):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.rounded[i + 1] || 0}`).join('  '));
  console.log('\n+/-1pt band coverage (need >=5):');
  console.log('  ' + Array.from({ length: 20 }, (_, i) => `${i + 1}:${v.bands[i + 1]}`).join('  '));
  const fams = {};
  for (const it of v.items) fams[it.provenance.ruleFamily] = (fams[it.provenance.ruleFamily] || 0) + 1;
  console.log('\nrule families:', JSON.stringify(fams));

  if (v.thinBands.length) console.log(`\nWARN thin +/-1pt bands (<5): ${v.thinBands.join(', ')}`);
  if (v.problems.length) {
    console.log(`\nFAIL ${v.problems.length} validation problem(s):`);
    v.problems.slice(0, 25).forEach((p) => console.log('  - ' + p));
    process.exitCode = 1;
    return;
  }
  if (v.thinBands.length) { process.exitCode = 1; return; }
  console.log('\nOK: JSONL parses, coverage >=5 per +/-1pt band, and the solver re-derives every figure weight + balancing key from served content (no leak).');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
