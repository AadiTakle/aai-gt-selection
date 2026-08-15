#!/usr/bin/env node
// SPA-TANGRAM-01 - Shape-Fill Form Board structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-TANGRAM-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// This is an INTERACTIVE type (like SPA-MAZE-01), not multiple-choice. The child fills a
// target outline exactly by placing tray pieces (rotating as needed); some tray pieces are
// distractors (herrings) that are not part of any exact cover. The deterministic "key" is
// the target AREA, and a submission is correct iff the child's placed pieces cover every
// target square exactly once (an exact tiling). The item is COMPUTED to be solvable - never
// guessed: the real pieces are a connected PARTITION of the target (so they exactly tile it),
// and a concrete referenceSolution is stored. An independent verifier re-runs an exact-cover
// solver over the tray pieces + target to confirm a tiling exists, and validates the stored
// reference solution. Because there are no enumerated options, answer.distractorRationales
// documents the RESPONSE taxonomy a deterministic scorer uses.
//
// Usage:
//   node generators/SPA-TANGRAM-01.mjs            # write bank
//   node generators/SPA-TANGRAM-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// target area, number of pieces, number of herring distractors, and a 3D (two-layer) volume.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-TANGRAM-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-TANGRAM-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'SPA-TANGRAM-01@1';
const COLORS = ['#4f46e5', '#0891b2', '#d97706', '#be185d', '#16a34a', '#7c3aed', '#dc2626', '#0d9488', '#ea580c'];

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
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

// ---------------------------------------------------------------------------
// Cell / offset geometry ([layer,row,col]). Rotations are in the row-col plane.
// ---------------------------------------------------------------------------
function k3(c) { return c[0] + ',' + c[1] + ',' + c[2]; }
function neighbors6(c) { const [l, r, cc] = c; return [[l, r - 1, cc], [l, r + 1, cc], [l, r, cc - 1], [l, r, cc + 1], [l - 1, r, cc], [l + 1, r, cc]]; }
function inBounds(c, L, R, C) { return c[0] >= 0 && c[0] < L && c[1] >= 0 && c[1] < R && c[2] >= 0 && c[2] < C; }
function normalize(cells) {
  const ml = Math.min(...cells.map(c => c[0])), mr = Math.min(...cells.map(c => c[1])), mc = Math.min(...cells.map(c => c[2]));
  return cells.map(c => [c[0] - ml, c[1] - mr, c[2] - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}
function shapeKey(offs) { return normalize(offs).map(o => o.join(',')).join('|'); }
function rotateOffsets(offs) { return normalize(offs.map(([l, r, c]) => [l, c, -r])); }
function allRotations(offs) { const out = [], seen = new Set(); let cur = normalize(offs); for (let i = 0; i < 4; i++) { const k = shapeKey(cur); if (!seen.has(k)) { seen.add(k); out.push(cur); } cur = rotateOffsets(cur); } return out; }
function allRotationKeys(offs) { return new Set(allRotations(offs).map(shapeKey)); }

// ---------------------------------------------------------------------------
// Target-region + connected-partition generation (seeded).
// ---------------------------------------------------------------------------
function genTargetCells(R, C, L, n, rng) {
  const cells = new Set(), list = [];
  const seed = [0, (R / 2) | 0, (C / 2) | 0];
  cells.add(k3(seed)); list.push(seed);
  let attempts = 0;
  while (cells.size < n && attempts < 6000) {
    attempts++;
    const base = list[Math.floor(rng() * list.length)];
    const nbs = neighbors6(base).filter(p => inBounds(p, L, R, C) && !cells.has(k3(p)));
    if (!nbs.length) continue;
    const pick = nbs[Math.floor(rng() * nbs.length)];
    cells.add(k3(pick)); list.push(pick);
  }
  return list;
}
// Multi-source region growth -> K connected regions covering every target cell exactly once.
function partitionConnected(cellsArr, K, rng) {
  const cellSet = new Set(cellsArr.map(k3));
  const owner = new Map();
  const seeds = shuffle(rng, cellsArr).slice(0, Math.min(K, cellsArr.length));
  const regions = seeds.map((s, i) => { owner.set(k3(s), i); return [s]; });
  let remaining = cellsArr.length - regions.length, guard = 0;
  while (remaining > 0 && guard++ < 100000) {
    let progressed = false;
    for (let p = 0; p < regions.length && remaining > 0; p++) {
      const frontier = [];
      for (const cell of regions[p]) for (const nb of neighbors6(cell)) if (cellSet.has(k3(nb)) && !owner.has(k3(nb))) frontier.push(nb);
      if (frontier.length) { const pk = frontier[Math.floor(rng() * frontier.length)]; owner.set(k3(pk), p); regions[p].push(pk); remaining--; progressed = true; }
    }
    if (!progressed) break;
  }
  return regions.filter(r => r.length > 0);
}
function genPolyomino(area, rng) {
  const cells = [[0, 0, 0]], set = new Set(['0,0,0']); let guard = 0;
  while (cells.length < area && guard++ < 400) {
    const base = cells[Math.floor(rng() * cells.length)];
    const nbs = neighbors6(base).filter(([l, r, c]) => l === 0 && !set.has(k3([l, r, c])));
    if (!nbs.length) continue;
    const pick = nbs[Math.floor(rng() * nbs.length)];
    cells.push(pick); set.add(k3(pick));
  }
  return normalize(cells);
}
function genHerring(realPieces, rng) {
  for (let tries = 0; tries < 60; tries++) {
    const area = 2 + Math.floor(rng() * 3);
    const p = genPolyomino(area, rng);
    const k = shapeKey(p);
    if (!realPieces.some(rp => allRotationKeys(rp).has(k))) return p;
  }
  return genPolyomino(2, rng);
}

// ---------------------------------------------------------------------------
// Exact-cover solver: can a SUBSET of `pieces` (each used once, any rotation) tile `target`?
// Picks the lowest uncovered target cell and only tries placements that cover it.
// ---------------------------------------------------------------------------
function solveCover(targetKeys, pieces) {
  const target = new Set(targetKeys);
  const order = [...targetKeys].sort();
  const rotsById = pieces.map(p => ({ id: p.id, rots: allRotations(p.offsets) }));
  const covered = new Set(); const used = new Set(); const chosen = [];
  function firstUncovered() { for (const c of order) if (!covered.has(c)) return c.split(',').map(Number); return null; }
  function rec(depth) {
    const cell = firstUncovered();
    if (!cell) return true;
    if (depth > 64) return false;
    for (const pr of rotsById) {
      if (used.has(pr.id)) continue;
      for (const rot of pr.rots) {
        for (const o of rot) {                                   // translate so offset o lands on `cell`
          const t = [cell[0] - o[0], cell[1] - o[1], cell[2] - o[2]];
          const abs = rot.map(x => [x[0] + t[0], x[1] + t[1], x[2] + t[2]]);
          if (abs.some(a => !target.has(k3(a)) || covered.has(k3(a)))) continue;
          abs.forEach(a => covered.add(k3(a))); used.add(pr.id); chosen.push({ id: pr.id, cells: abs });
          if (rec(depth + 1)) return true;
          chosen.pop(); used.delete(pr.id); abs.forEach(a => covered.delete(k3(a)));
        }
      }
    }
    return false;
  }
  const ok = rec(0);
  return ok ? chosen.map(c => ({ id: c.id, cells: c.cells })) : null;
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// ---------------------------------------------------------------------------
const LEVELS = {
  1: { R: 3, C: 3, area: 4, pieces: 2, herr: 1, L: 1 }, 2: { R: 3, C: 4, area: 5, pieces: 2, herr: 1, L: 1 },
  3: { R: 4, C: 4, area: 6, pieces: 2, herr: 1, L: 1 }, 4: { R: 4, C: 4, area: 7, pieces: 3, herr: 1, L: 1 },
  5: { R: 4, C: 5, area: 8, pieces: 3, herr: 2, L: 1 }, 6: { R: 4, C: 5, area: 9, pieces: 3, herr: 2, L: 1 },
  7: { R: 5, C: 5, area: 10, pieces: 3, herr: 2, L: 1 }, 8: { R: 5, C: 5, area: 11, pieces: 4, herr: 2, L: 1 },
  9: { R: 5, C: 6, area: 12, pieces: 4, herr: 2, L: 1 }, 10: { R: 5, C: 6, area: 12, pieces: 4, herr: 3, L: 1 },
  11: { R: 6, C: 6, area: 13, pieces: 4, herr: 3, L: 1 }, 12: { R: 6, C: 6, area: 14, pieces: 5, herr: 3, L: 1 },
  13: { R: 6, C: 6, area: 15, pieces: 5, herr: 3, L: 1 }, 14: { R: 6, C: 7, area: 16, pieces: 5, herr: 3, L: 1 },
  15: { R: 3, C: 4, area: 10, pieces: 4, herr: 2, L: 2 }, 16: { R: 3, C: 4, area: 12, pieces: 4, herr: 2, L: 2 },
  17: { R: 4, C: 4, area: 13, pieces: 5, herr: 3, L: 2 }, 18: { R: 4, C: 4, area: 14, pieces: 5, herr: 3, L: 2 },
  19: { R: 4, C: 4, area: 16, pieces: 6, herr: 3, L: 2 }, 20: { R: 4, C: 5, area: 18, pieces: 6, herr: 3, L: 2 },
};
const ITEMS_PER_LEVEL = 5;

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

const RESPONSE_TAXONOMY = [
  { kind: 'exact_tiling', rationale: 'every target square is covered exactly once by non-overlapping in-region pieces (correct)' },
  { kind: 'partial_fill', rationale: 'a legal but incomplete cover: some target squares are still empty at submit' },
  { kind: 'used_distractor', rationale: 'placed a distractor (herring) piece that is not part of any exact cover' },
  { kind: 'overflow_or_overlap', rationale: 'a placement left the target region or overlapped another piece (rejected)' },
];

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const cfg = LEVELS[L];

  // Target region: retry until it reaches the requested area (small grids can stall).
  let cellsArr = [];
  for (let t = 0; t < 40; t++) { const c = genTargetCells(cfg.R, cfg.C, cfg.L, cfg.area, rng); if (c.length > cellsArr.length) cellsArr = c; if (cellsArr.length >= cfg.area) break; }
  const targetArea = cellsArr.length;
  const K = Math.min(cfg.pieces, targetArea);

  const regions = partitionConnected(cellsArr, K, rng);
  const realPieces = regions.map(r => normalize(r));
  const herrings = []; for (let i = 0; i < cfg.herr; i++) herrings.push(genHerring(realPieces, rng));

  // Tray: real + herring pieces, shuffled, each pre-rotated a random amount. No real/herring flag leaks.
  const combined = shuffle(rng, [
    ...regions.map(r => ({ real: true, region: r, offsets: normalize(r) })),
    ...herrings.map(h => ({ real: false, offsets: h })),
  ]);
  const tray = combined.map((p, i) => {
    const rots = allRotations(p.offsets);
    const rot = rots[Math.floor(rng() * rots.length)];
    return { id: i, offsets: rot, color: COLORS[i % COLORS.length], _real: p.real, _region: p.region || null };
  });

  // Reference solution: real regions placed at their true target cells, tied to their tray piece id.
  const referenceSolution = tray.filter(t => t._real).map(t => ({ id: t.id, cells: t._region.map(c => [c[0], c[1], c[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) }));

  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;
  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'fill_form_board',
      is3D: cfg.L > 1,
      prompt: cfg.L > 1
        ? 'Fill every square of both layers using the tray pieces. Some pieces are extra and will not fit.'
        : 'Fill every square of the outline using the tray pieces. Some pieces are extra and will not fit.',
    },
    grid: { R: cfg.R, C: cfg.C, L: cfg.L },
    target: { cells: cellsArr.map(c => [c[0], c[1], c[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]), area: targetArea },
    tray: tray.map(t => ({ id: t.id, offsets: t.offsets, color: t.color })),   // no real/herring flag
    optionKind: 'placement',
    scaffold: { warmup: L <= 2 },
  };
  const answer = {
    correctKey: String(targetArea),          // fill the whole board => cover exactly `area` squares
    targetArea,
    referenceSolution,                        // one exact cover (independently checkable)
    optimalPlacements: referenceSolution.length,
    relation: 'exact_cover_tiling',
    distractorRationales: RESPONSE_TAXONOMY,
  };
  return {
    itemId: seededUuid(seed),
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsForLevel(L),
    content,
    answer,
    scoring: { mode: 'deterministic_key' },
    provenance: { generator: 'grammar', generatorRef: GENERATOR_REF, seed },
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
// Independent verification.
// ---------------------------------------------------------------------------
function offsetsMatchCells(offsets, cells) {          // is `cells` a rotation+translation of `offsets`?
  const target = shapeKey(cells);
  return allRotationKeys(offsets).has(target);
}
function verifyReference(content, answer) {
  const target = new Set(content.target.cells.map(k3));
  const covered = new Set(); const usedIds = new Set();
  const trayById = new Map(content.tray.map(t => [t.id, t.offsets]));
  for (const pl of answer.referenceSolution) {
    if (usedIds.has(pl.id)) return `reference reuses tray piece ${pl.id}`;
    usedIds.add(pl.id);
    const off = trayById.get(pl.id); if (!off) return `reference id ${pl.id} not in tray`;
    if (!offsetsMatchCells(off, pl.cells)) return `reference piece ${pl.id} is not a rotation of its tray shape`;
    for (const c of pl.cells) { const kk = k3(c); if (!target.has(kk)) return `reference cell ${kk} outside target`; if (covered.has(kk)) return `reference overlap at ${kk}`; covered.add(kk); }
  }
  if (covered.size !== target.size) return `reference covers ${covered.size}/${target.size} target cells`;
  return null;
}

function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  const seenIds = new Set();
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (seenIds.has(it.itemId)) problems.push(`${it.itemId}: duplicate itemId`); seenIds.add(it.itemId);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.scoring.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode wrong`);
    // content must NOT leak the solution / which pieces are real.
    for (const leak of ['referenceSolution', 'answer', 'optimalPlacements']) if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    if (it.content.tray.some(t => '_real' in t || 'real' in t)) problems.push(`${it.itemId}: tray leaks real/herring flag`);
    // key == target area
    if (it.answer.correctKey !== String(it.content.target.area)) problems.push(`${it.itemId}: correctKey != target area`);
    // reference solution is a valid exact cover made of tray pieces
    const refErr = verifyReference(it.content, it.answer);
    if (refErr) problems.push(`${it.itemId}: ${refErr}`);
    // INDEPENDENT: an exact cover exists using the tray pieces (solved fresh from content).
    const cover = solveCover(it.content.target.cells.map(k3), it.content.tray);
    const solvable = !!cover;
    if (solvable && !refErr) ok++;
    else { bad++; problems.push(`${it.itemId}: exact-cover ${solvable ? 'ok' : 'NOT FOUND'} / refErr=${refErr || 'none'}`); }
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
  const items = generate();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, serializeBank(items));
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const areas = items.map(it => it.content.target.area);
  console.log(`[${TYPE_CODE}] target area: min ${Math.min(...areas)}, max ${Math.max(...areas)}`);
  const by3d = items.filter(it => it.content.question.is3D).length;
  console.log(`[${TYPE_CODE}] 3D items: ${by3d}`);

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (exact-cover re-solve + reference validation): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: exact cover re-solved from tray + reference validated, coverage satisfied, born-synthetic.`);
}

main();
