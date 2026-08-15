#!/usr/bin/env node
// GB-SHAPEFIT-01 - Shape Smith structured bank generator (grammar, game-based delivery).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/GB-SHAPEFIT-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// GAME-BASED / INTERACTIVE spatial-packing type. The child selects a tray piece, reorients it
// with the rotate (and, from the mid rungs, flip) button, and drops it into the silhouette
// until the outline is exactly filled. Some tray pieces are RED HERRINGS. The scored process
// signal is efficiency: the total MOVE COST of the child's assembly (one move per orientation
// button press plus one per placement) against the true minimum.
//
// The optimum is COMPUTED, never guessed. Every tray piece is expanded into its reachable
// orientations under the item's own instruction set (C4 when only rotate is offered, the full
// dihedral D4 when flip is offered), each tagged with the minimum number of button presses
// that reaches it. A branch-and-bound min-cost EXACT COVER over those placements returns both
// the cheapest assembly and its cost. Solvability is structural: the real pieces are a
// connected partition of the silhouette, so at least one exact cover always exists, and the
// generator additionally re-solves every item before writing it.
//
// Usage:
//   node generators/GB-SHAPEFIT-01.mjs            # write bank
//   node generators/GB-SHAPEFIT-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// PIECE COUNT and RED-HERRING COUNT (the two named levers), silhouette area, whether mirror
// (flip) transforms are required rather than rotations alone, how far each tray piece is
// pre-turned from its solution orientation, and near-miss herrings that differ from a real
// piece by a single cell.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/GB-SHAPEFIT-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'GB-SHAPEFIT-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'gb-shapefit-01-grammar@1';
const DEMO_PATH = 'demos/GB-SHAPEFIT-01.html';
const SOLVER_ID = 'gb-shapefit-01-mincost-cover@1';
const COLORS = ['#4f46e5', '#0891b2', '#d97706', '#be185d', '#16a34a', '#7c3aed', '#dc2626', '#0d9488', '#ea580c', '#2563eb', '#9333ea', '#059669', '#b45309', '#e11d48'];

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) + string hashing.
// ---------------------------------------------------------------------------
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr) { return mulberry32(hashStr(seedStr)); }
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
const round2 = (x) => Math.round(x * 100) / 100;
const rnd = (rng, n) => Math.floor(rng() * n);
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------------------------------------------------------------------------
// Polyomino geometry ([row, col]) and the orientation group.
// rotate = one clockwise quarter turn, flip = mirror across the vertical axis. Both are
// exactly one button press for the child, so a group element's minimal WORD LENGTH in
// {rotate, flip} is the number of presses it costs.
// ---------------------------------------------------------------------------
export function normalize(cells) {
  const mr = Math.min(...cells.map(c => c[0])), mc = Math.min(...cells.map(c => c[1]));
  return cells.map(c => [c[0] - mr, c[1] - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
export function shapeKey(cells) { return normalize(cells).map(c => c.join(',')).join('|'); }
export function rotateCW(cells) { return normalize(cells.map(([r, c]) => [c, -r])); }
export function flipH(cells) { return normalize(cells.map(([r, c]) => [r, -c])); }
export function applyOps(cells, ops) {
  let cur = normalize(cells);
  for (const op of ops) cur = op === 'rotate' ? rotateCW(cur) : flipH(cur);
  return cur;
}
// Minimal-word representatives of the orientation group offered by the instruction set.
const PROBE = [[0, 0], [1, 0], [2, 0], [2, 1]];      // chiral + asymmetric: 8 distinct images
export function buildGroup(allowFlip) {
  const gens = allowFlip ? ['rotate', 'flip'] : ['rotate'];
  const seen = new Map([[shapeKey(PROBE), []]]);
  const queue = [[]];
  while (queue.length) {
    const word = queue.shift();
    for (const g of gens) {
      const next = word.concat(g);
      const k = shapeKey(applyOps(PROBE, next));
      if (!seen.has(k)) { seen.set(k, next); queue.push(next); }
    }
  }
  return [...seen.values()].sort((a, b) => a.length - b.length);
}

// ---------------------------------------------------------------------------
// Min-cost exact cover: fill the silhouette with tray pieces, each used at most once, paying
// (orientation button presses + 1 placement) per piece. Branch and bound on the lowest
// uncovered cell. Returns { moves, placements:[{id,cells,orientOps}] } or null.
// ---------------------------------------------------------------------------
export function minCostCover(targetCells, tray, group) {
  const N = targetCells.length;
  const index = new Map(targetCells.map((c, i) => [c[0] + ',' + c[1], i]));
  const FULL = N === 31 ? 0x7fffffff : (1 << N) - 1;

  const placements = [];               // {pid, mask, cost, cells, orientOps}
  let maxPiece = 1;
  tray.forEach((p) => {
    maxPiece = Math.max(maxPiece, p.cells.length);
    const orient = new Map();          // shapeKey -> {ops, cells}
    for (const word of group) {
      const img = applyOps(p.cells, word);
      const k = shapeKey(img);
      const prev = orient.get(k);
      if (!prev || prev.ops > word.length) orient.set(k, { ops: word.length, cells: img });
    }
    for (const { ops, cells } of orient.values()) {
      const seenMask = new Set();
      for (const anchor of targetCells) {
        const dr = anchor[0] - cells[0][0], dc = anchor[1] - cells[0][1];
        let mask = 0, ok = true; const abs = [];
        for (const [r, c] of cells) {
          const i = index.get((r + dr) + ',' + (c + dc));
          if (i === undefined) { ok = false; break; }
          mask |= (1 << i); abs.push([r + dr, c + dc]);
        }
        if (!ok || seenMask.has(mask)) continue;
        seenMask.add(mask);
        placements.push({ pid: p.id, mask, cost: ops + 1, cells: abs, orientOps: ops });
      }
    }
  });

  // Bucket placements by their lowest covered cell so the search only ever extends the
  // first hole - the standard exact-cover branching rule.
  const byFirst = Array.from({ length: N }, () => []);
  for (const pl of placements) {
    let i = 0; while (!((pl.mask >> i) & 1)) i++;
    byFirst[i].push(pl);
  }
  byFirst.forEach(list => list.sort((a, b) => a.cost - b.cost));

  let best = Infinity, bestPick = null;
  const used = new Set(); const pick = [];
  const popcount = (x) => { let n = 0; while (x) { x &= x - 1; n++; } return n; };

  function rec(covered, cost) {
    if (covered === FULL) { if (cost < best) { best = cost; bestPick = pick.slice(); } return; }
    const remaining = N - popcount(covered);
    if (cost + Math.ceil(remaining / maxPiece) >= best) return;      // admissible bound
    let i = 0; while ((covered >> i) & 1) i++;
    for (const pl of byFirst[i]) {
      if (used.has(pl.pid)) continue;
      if (covered & pl.mask) continue;
      used.add(pl.pid); pick.push(pl);
      rec(covered | pl.mask, cost + pl.cost);
      pick.pop(); used.delete(pl.pid);
    }
  }
  rec(0, 0);
  if (bestPick === null) return null;
  return {
    moves: best,
    placements: bestPick.map(p => ({ id: p.pid, cells: p.cells, orientOps: p.orientOps })),
  };
}

// ---------------------------------------------------------------------------
// Silhouette + connected partition + herrings.
// ---------------------------------------------------------------------------
function neighbors4(r, c) { return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]; }
function genTarget(R, C, area, rng) {
  const start = [rnd(rng, R), rnd(rng, C)];
  const have = new Set([start.join(',')]); const list = [start];
  let guard = 0;
  while (list.length < area && guard++ < 4000) {
    const base = list[rnd(rng, list.length)];
    const opts = neighbors4(base[0], base[1]).filter(([r, c]) => r >= 0 && r < R && c >= 0 && c < C && !have.has(r + ',' + c));
    if (!opts.length) continue;
    const pickCell = opts[rnd(rng, opts.length)];
    have.add(pickCell.join(',')); list.push(pickCell);
  }
  return list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
function partitionConnected(cells, K, rng) {
  const cellSet = new Set(cells.map(c => c.join(',')));
  const owner = new Map();
  const seeds = shuffle(rng, cells).slice(0, Math.min(K, cells.length));
  const regions = seeds.map((s, i) => { owner.set(s.join(','), i); return [s]; });
  let remaining = cells.length - regions.length, guard = 0;
  while (remaining > 0 && guard++ < 20000) {
    let progressed = false;
    for (let p = 0; p < regions.length && remaining > 0; p++) {
      const frontier = [];
      for (const cell of regions[p]) for (const nb of neighbors4(cell[0], cell[1])) {
        const k = nb.join(',');
        if (cellSet.has(k) && !owner.has(k)) frontier.push(nb);
      }
      if (!frontier.length) continue;
      const take = frontier[rnd(rng, frontier.length)];
      owner.set(take.join(','), p); regions[p].push(take); remaining--; progressed = true;
    }
    if (!progressed) break;
  }
  return regions.filter(r => r.length);
}
function genPolyomino(size, rng) {
  const cells = [[0, 0]]; const have = new Set(['0,0']);
  let guard = 0;
  while (cells.length < size && guard++ < 200) {
    const base = cells[rnd(rng, cells.length)];
    const opts = neighbors4(base[0], base[1]).filter(n => !have.has(n.join(',')));
    if (!opts.length) continue;
    const take = opts[rnd(rng, opts.length)];
    cells.push(take); have.add(take.join(','));
  }
  return normalize(cells);
}
// A herring must not be congruent (under the item's own group) to any real piece, otherwise
// it would be a silent duplicate rather than a distractor. Where possible it is also chosen so
// that it FITS NOWHERE inside the outline - matching the on-screen promise that some pieces do
// not belong, and keeping the true optimum a statement about the real pieces.
function congruentKeys(cells, group) { return new Set(group.map(w => shapeKey(applyOps(cells, w)))); }
function fitsAnywhere(cells, targetCells, group) {
  const target = new Set(targetCells.map(c => c.join(',')));
  const seen = new Set();
  for (const word of group) {
    const img = applyOps(cells, word);
    const k = shapeKey(img); if (seen.has(k)) continue; seen.add(k);
    for (const anchor of targetCells) {
      const dr = anchor[0] - img[0][0], dc = anchor[1] - img[0][1];
      if (img.every(([r, c]) => target.has((r + dr) + ',' + (c + dc)))) return true;
    }
  }
  return false;
}
function genHerring(realPieces, targetCells, group, rng, nearMiss) {
  const realKeys = new Set();
  realPieces.forEach(p => congruentKeys(p, group).forEach(k => realKeys.add(k)));
  const avg = Math.max(2, Math.round(realPieces.reduce((a, p) => a + p.length, 0) / Math.max(1, realPieces.length)));
  let fallback = null;
  for (let tries = 0; tries < 90; tries++) {
    let cand;
    if (nearMiss && realPieces.length) {
      // near-miss: a real piece plus or minus one cell (looks usable, is not the same shape)
      const base = realPieces[rnd(rng, realPieces.length)];
      if (base.length > 2 && rng() < 0.5) cand = normalize(base.slice(0, base.length - 1));
      else {
        const grow = [];
        for (const cell of base) for (const nb of neighbors4(cell[0], cell[1])) if (!base.some(b => b[0] === nb[0] && b[1] === nb[1])) grow.push(nb);
        if (!grow.length) continue;
        cand = normalize(base.concat([grow[rnd(rng, grow.length)]]));
      }
    } else cand = genPolyomino(Math.max(2, avg - 1 + rnd(rng, 3)), rng);
    if (cand.length < 2 || realKeys.has(shapeKey(cand))) continue;
    if (!fallback) fallback = cand;
    if (!fitsAnywhere(cand, targetCells, group)) return cand;      // a true "will not fit" piece
  }
  return fallback || genPolyomino(2, rng);
}

// ---------------------------------------------------------------------------
// Difficulty ramp. Named levers: piece count + red-herring count, plus area, the flip
// requirement and how far tray pieces are pre-turned from their solution orientation.
// ---------------------------------------------------------------------------
// Piece SIZE is held near four cells as the piece COUNT rises: a tray of many tiny pieces
// tiles almost any outline without turning anything, which would delete the manipulation
// construct. Herrings stay a modest, capped distractor set for the same reason.
const LEVELS = {
  1:  { R: 3, C: 4, area: 6,  pieces: 2, herrings: 1, flip: false, minTurn: 1, nearMiss: false },
  2:  { R: 4, C: 4, area: 7,  pieces: 2, herrings: 1, flip: false, minTurn: 1, nearMiss: false },
  3:  { R: 4, C: 4, area: 8,  pieces: 2, herrings: 2, flip: false, minTurn: 2, nearMiss: false },
  4:  { R: 4, C: 5, area: 10, pieces: 3, herrings: 2, flip: false, minTurn: 1, nearMiss: false },
  5:  { R: 4, C: 5, area: 11, pieces: 3, herrings: 2, flip: false, minTurn: 2, nearMiss: false },
  6:  { R: 5, C: 5, area: 12, pieces: 3, herrings: 2, flip: false, minTurn: 2, nearMiss: true },
  7:  { R: 5, C: 5, area: 13, pieces: 3, herrings: 3, flip: false, minTurn: 2, nearMiss: true },
  8:  { R: 5, C: 6, area: 15, pieces: 4, herrings: 3, flip: true,  minTurn: 1, nearMiss: false },
  9:  { R: 5, C: 6, area: 16, pieces: 4, herrings: 3, flip: true,  minTurn: 2, nearMiss: true },
  10: { R: 6, C: 6, area: 17, pieces: 4, herrings: 3, flip: true,  minTurn: 2, nearMiss: true },
  11: { R: 6, C: 6, area: 18, pieces: 4, herrings: 4, flip: true,  minTurn: 3, nearMiss: true },
  12: { R: 6, C: 6, area: 19, pieces: 5, herrings: 3, flip: true,  minTurn: 2, nearMiss: true },
  13: { R: 6, C: 7, area: 20, pieces: 5, herrings: 3, flip: true,  minTurn: 2, nearMiss: true },
  14: { R: 6, C: 7, area: 21, pieces: 5, herrings: 4, flip: true,  minTurn: 3, nearMiss: true },
  15: { R: 7, C: 7, area: 22, pieces: 5, herrings: 4, flip: true,  minTurn: 3, nearMiss: true },
  16: { R: 7, C: 7, area: 23, pieces: 6, herrings: 4, flip: true,  minTurn: 2, nearMiss: true },
  17: { R: 7, C: 7, area: 24, pieces: 6, herrings: 4, flip: true,  minTurn: 3, nearMiss: true },
  18: { R: 7, C: 8, area: 25, pieces: 6, herrings: 5, flip: true,  minTurn: 3, nearMiss: true },
  19: { R: 7, C: 8, area: 26, pieces: 7, herrings: 4, flip: true,  minTurn: 3, nearMiss: true },
  20: { R: 8, C: 8, area: 28, pieces: 7, herrings: 5, flip: true,  minTurn: 3, nearMiss: true },
};
const ITEMS_PER_LEVEL = 6;
const ATTEMPTS = 24;        // seeded attempts scanned per item; the hardest optimum wins

// Move budget: a pure function of the tray size only, so it cannot leak the optimum.
export function maxMovesFor(trayCount) { return 12 * trayCount; }

// Age-band targeting hint from the difficulty rung. This type declares only 2-3 | 4-5 | 6-8 in
// catalog/master_types.jsonl, so the BUILD_PLAN ladder's bottom rungs target the lowest
// declared band rather than inventing K-1: the D-017 reading gate raises an age floor, it
// never lowers one. Boundary overlap is a targeting hint, not a hard cut.
export function ageBandsFor(difficulty) {
  const bands = [];
  const add = (b) => { if (!bands.includes(b)) bands.push(b); };
  if (difficulty < 8.5) add('2-3');
  if (difficulty >= 7.5 && difficulty < 12.5) add('4-5');
  if (difficulty >= 11.5) add('6-8');
  if (bands.length === 0) add(difficulty < 8 ? '2-3' : '6-8');
  return bands;
}

const RESPONSE_TAXONOMY = [
  { kind: 'exact_fill_optimal', rationale: 'the silhouette is covered exactly once with no gaps or overlaps AND the total move cost equals the minimum (correct + maximally efficient)' },
  { kind: 'exact_fill_costly', rationale: 'a valid exact fill reached with more turns/placements than the minimum (rotate-and-try rather than pre-visualising; M-EFF < 1)' },
  { kind: 'partial_fill', rationale: 'submitted with target cells still empty (incomplete decomposition)' },
  { kind: 'herring_used', rationale: 'a red-herring piece was placed and kept; it cannot belong to a cheapest cover of this silhouette' },
  { kind: 'misfit_attempt', rationale: 'a placement that would leave the outline or overlap an existing piece; rejected by the renderer and logged as a revision' },
  { kind: 'over_rotation', rationale: 'orientation presses far above the minimum for the pieces actually placed (mental-rotation load exceeded)' },
];

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
// One attempt at a silhouette + partition + herring tray. Returns null when the attempt is
// degenerate, i.e. when the cheapest cover needs fewer pieces than the level's piece lever
// (a herring or a lucky pair happens to tile the outline on its own). Rejecting those is what
// keeps PIECE COUNT - the type's headline difficulty lever - actually driving the optimum.
function attemptItem(rng, cfg, group) {
  let targetCells = [];
  for (let t = 0; t < 40; t++) {
    const cand = genTarget(cfg.R, cfg.C, cfg.area, rng);
    if (cand.length > targetCells.length) targetCells = cand;
    if (targetCells.length >= cfg.area) break;
  }
  const area = targetCells.length;
  const K = Math.min(cfg.pieces, Math.max(1, Math.floor(area / 2)));
  const regions = partitionConnected(targetCells, K, rng);
  if (regions.length !== K) return null;
  const realShapes = regions.map(r => normalize(r));

  const herrings = [];
  for (let i = 0; i < cfg.herrings; i++) herrings.push(genHerring(realShapes, targetCells, group, rng, cfg.nearMiss && i % 2 === 1));

  // Tray orientation: pre-turn each real piece away from its solution orientation by at least
  // cfg.minTurn presses where the piece's symmetry allows it (a 1x1 or a square cannot be).
  const entries = shuffle(rng, [
    ...realShapes.map(s => ({ real: true, shape: s })),
    ...herrings.map(s => ({ real: false, shape: s })),
  ]);
  const tray = entries.map((e, i) => {
    const distinct = group.filter(w => shapeKey(applyOps(e.shape, w)) !== shapeKey(e.shape));
    const far = distinct.filter(w => w.length >= cfg.minTurn);
    const pool = far.length ? far : (distinct.length ? distinct : [[]]);
    const word = pool[rnd(rng, pool.length)];
    return { id: i, cells: applyOps(e.shape, word), color: COLORS[i % COLORS.length] };
  });

  const solved = minCostCover(targetCells, tray, group);
  if (!solved) return null;
  return { targetCells, area, K, realShapes, herrings, tray, solved };
}

function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const cfg = LEVELS[L];
  const group = buildGroup(cfg.flip);

  // Keep the attempt whose TRUE optimum is hardest: first that it needs the full piece count
  // (so the piece-count lever bites), then that it needs the most orientation presses (so the
  // silhouette cannot be filled by dropping tray pieces in as-given - the manipulation
  // construct). Scanning a fixed number of seeded attempts keeps this deterministic.
  let chosen = null, bestScore = -1;
  for (let t = 0; t < ATTEMPTS; t++) {
    const cand = attemptItem(rng, cfg, group);
    if (!cand) continue;
    const turns = cand.solved.moves - cand.solved.placements.length;
    const score = (cand.solved.placements.length === cand.K ? 10000 : 0) + turns * 10 + cand.solved.placements.length;
    if (score > bestScore) { bestScore = score; chosen = cand; }
  }
  if (!chosen) throw new Error(`${TYPE_CODE} L${L}#${idx}: no coverable silhouette after ${ATTEMPTS} attempts`);
  const { targetCells, area, realShapes, herrings, tray, solved } = chosen;

  const difficulty = round2(Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35))));
  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'fill_silhouette',
      canFlip: cfg.flip,
      prompt: cfg.flip
        ? 'Fill the whole outline with tray pieces. Turn or flip a piece to make it fit. Some pieces do not belong. Use as few turns and drops as you can.'
        : 'Fill the whole outline with tray pieces. Turn a piece to make it fit. Some pieces do not belong. Use as few turns and drops as you can.',
    },
    grid: { R: cfg.R, C: cfg.C },
    target: { cells: targetCells.map(c => [c[0], c[1]]), area },
    tray: tray.map(t => ({ id: t.id, cells: t.cells.map(c => [c[0], c[1]]), color: t.color })),  // no real/herring flag
    instructionSet: { ops: cfg.flip ? ['rotate', 'flip'] : ['rotate'], rotateStep: 90, flipAxis: 'vertical' },
    limits: { maxMoves: maxMovesFor(tray.length) },
    optionKind: 'placement',
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: String(area),                 // a correct fill covers exactly `area` cells once
    targetArea: area,
    canonicalSolution: {
      placements: solved.placements,          // one cheapest assembly: piece id, cells, turns
      moves: solved.moves,
      pieces: solved.placements.length,
    },
    cost: { moves: solved.moves, placements: solved.placements.length },
    relation: 'min_move_exact_cover',
    acceptedEquivalence: {
      rule: 'any_exact_cover_of_equal_move_cost',
      note: 'Several distinct assemblies can tie (symmetric pieces, interchangeable congruent pieces, '
        + 'and herrings that happen to fit). A submission is CORRECT iff its placements cover every '
        + 'target cell exactly once with no cell outside the outline. It is OPTIMAL iff, in addition, '
        + 'its total move cost (one per orientation press, one per placement) equals cost.moves.',
      efficiency: 'M-EFF = cost.moves / totalMovesSpent (1.0 = optimal, capped at 1.0)',
    },
    distractorRationales: RESPONSE_TAXONOMY,
  };

  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content,
    answer,
    scoring: { mode: 'computed_solver', solverId: SOLVER_ID, partialCredit: true },
    provenance: {
      generator: 'grammar',
      generatorRef: GENERATOR_REF,
      seed,
      levers: { level: L, area, realPieces: realShapes.length, herrings: herrings.length, trayCount: tray.length, flip: cfg.flip, minTurn: cfg.minTurn, optimalMoves: solved.moves },
    },
    syntheticOnly: true,
    validated: false,
  };
}

function generate() {
  const items = [];
  for (let L = 1; L <= 20; L++) for (let i = 0; i < ITEMS_PER_LEVEL; i++) items.push(buildItem(L, i));
  return items;
}

// ---------------------------------------------------------------------------
// Independent self-verification (the standalone checker re-does this from the JSONL).
// ---------------------------------------------------------------------------
function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`); seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.scoring.mode !== 'computed_solver') problems.push(`${it.itemId}: scoring mode wrong`);
    const c = it.content, a = it.answer;
    for (const leak of ['answer', 'canonicalSolution', 'cost', 'solution']) if (leak in c) problems.push(`${it.itemId}: content leaks ${leak}`);
    if (c.tray.some(t => 'real' in t || '_real' in t)) problems.push(`${it.itemId}: tray leaks the real/herring flag`);

    const group = buildGroup(c.instructionSet.ops.includes('flip'));
    const re = minCostCover(c.target.cells, c.tray, group);
    if (!re) { bad++; problems.push(`${it.itemId}: NO EXACT COVER`); continue; }
    if (re.moves !== a.cost.moves) { bad++; problems.push(`${it.itemId}: recomputed ${re.moves} moves != ${a.cost.moves}`); continue; }
    // stored assembly must be a real exact cover at exactly that cost
    const target = new Set(c.target.cells.map(x => x.join(',')));
    const covered = new Set(); const used = new Set(); let cost = 0, err = null;
    const trayById = new Map(c.tray.map(t => [t.id, t.cells]));
    for (const pl of a.canonicalSolution.placements) {
      if (used.has(pl.id)) { err = `reuses piece ${pl.id}`; break; }
      used.add(pl.id);
      const base = trayById.get(pl.id); if (!base) { err = `unknown piece ${pl.id}`; break; }
      const reach = group.filter(w => shapeKey(applyOps(base, w)) === shapeKey(pl.cells)).map(w => w.length);
      if (!reach.length) { err = `piece ${pl.id} cannot be turned into its placed orientation`; break; }
      if (Math.min(...reach) !== pl.orientOps) { err = `piece ${pl.id} orientOps ${pl.orientOps} != minimum ${Math.min(...reach)}`; break; }
      cost += pl.orientOps + 1;
      for (const cell of pl.cells) {
        const k = cell.join(',');
        if (!target.has(k)) { err = `cell ${k} outside the outline`; break; }
        if (covered.has(k)) { err = `overlap at ${k}`; break; }
        covered.add(k);
      }
      if (err) break;
    }
    if (!err && covered.size !== target.size) err = `covers ${covered.size}/${target.size}`;
    if (!err && cost !== a.cost.moves) err = `stored assembly costs ${cost} != ${a.cost.moves}`;
    if (err) { bad++; problems.push(`${it.itemId}: ${err}`); continue; }
    ok++;
    for (let L = 1; L <= 20; L++) if (it.difficulty >= L - 1 && it.difficulty <= L + 1) bands[L]++;
  }
  return { ok, bad, problems, bands };
}

function coverageReport(bands) {
  const lines = []; let minBand = Infinity;
  for (let L = 1; L <= 20; L++) { lines.push(`  band ${String(L).padStart(2)} (+/-1pt): ${bands[L]}`); minBand = Math.min(minBand, bands[L]); }
  return { text: lines.join('\n'), minBand };
}

function main() {
  const doVerify = process.argv.includes('--verify');
  const t0 = Date.now();
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, serializeBank(items));
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT} (${Date.now() - t0} ms)`);
  const areas = items.map(it => it.content.target.area);
  const moves = items.map(it => it.answer.cost.moves);
  const tray = items.map(it => it.content.tray.length);
  console.log(`[${TYPE_CODE}] silhouette area: min ${Math.min(...areas)}, max ${Math.max(...areas)}`);
  console.log(`[${TYPE_CODE}] optimal moves:   min ${Math.min(...moves)}, max ${Math.max(...moves)}`);
  console.log(`[${TYPE_CODE}] tray pieces:     min ${Math.min(...tray)}, max ${Math.max(...tray)}`);
  console.log(`[${TYPE_CODE}] items offering flip: ${items.filter(it => it.content.question.canFlip).length}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (min-cost cover re-solve + assembly validation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min +/-1pt band count = ${cov.minBand}, need >= 5):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < 5) { console.error(`[${TYPE_CODE}] FAIL: coverage below 5 in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: every silhouette exactly coverable, optimum re-derived, coverage satisfied, born-synthetic.`);
}

if (process.argv[1] && process.argv[1].endsWith('GB-SHAPEFIT-01.mjs')) main();
