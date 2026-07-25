#!/usr/bin/env node
// SPA-PICKFOLD-01 - Which-Fold-Made-It structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-PICKFOLD-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// This is a MULTIPLE-CHOICE type. The child sees an UNFOLDED cut pattern (the holes an
// 8x8 sheet shows after it was folded, punched, and re-opened) and must pick which of the
// candidate FOLD SEQUENCES produced it. The correct option is COMPUTED - never guessed -
// by simulating each candidate fold sequence over the punch set (`foldModel`) and comparing
// its unfolded hole SIGNATURE to the target. Exactly one candidate matches (options are
// de-duplicated by signature), and that candidate is the declared correctKey. Reuses the
// exact geometry of demos/SPA-PICKFOLD-01.html (foldModel / allSeq / signature).
//
// Usage:
//   node generators/SPA-PICKFOLD-01.mjs            # write bank
//   node generators/SPA-PICKFOLD-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// fold count (1 -> 4), number of punches (1 -> 2), and number of candidate options (2 -> 5).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-PICKFOLD-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-PICKFOLD-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'SPA-PICKFOLD-01@1';
const GRID_N = 8;

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
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function seededUuid(seedStr) {
  const b = new Uint8Array(16);
  let h = hashStr(seedStr);
  for (let i = 0; i < 16; i++) { h = (Math.imul(h ^ (h >>> 13), 0x5bd1e995) + i * 0x9e3779b1) >>> 0; b[i] = h & 0xff; }
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

// ---------------------------------------------------------------------------
// Fold / punch / unfold simulation (ported verbatim from demos/SPA-PICKFOLD-01.html).
// foldModel(seq, punches) returns a Map "ox,oy" -> punchIndex for every original cell
// that ends up punched, or null if a fold cannot be applied (region too small).
// ---------------------------------------------------------------------------
function foldModel(seq, punches) {
  const N = GRID_N, cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push({ ox: x, oy: y, x, y });
  let r = { x0: 0, x1: N - 1, y0: 0, y1: N - 1 };
  for (const op of seq) {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    if (op === 'L' || op === 'R') {
      if (w < 2) return null; const p = r.x0 + w / 2;
      if (op === 'L') { cells.forEach(q => { if (q.x < p) q.x = 2 * p - 1 - q.x; }); r.x0 = p; }
      else { cells.forEach(q => { if (q.x >= p) q.x = 2 * p - 1 - q.x; }); r.x1 = p - 1; }
    } else {
      if (h < 2) return null; const p = r.y0 + h / 2;
      if (op === 'T') { cells.forEach(q => { if (q.y < p) q.y = 2 * p - 1 - q.y; }); r.y0 = p; }
      else { cells.forEach(q => { if (q.y >= p) q.y = 2 * p - 1 - q.y; }); r.y1 = p - 1; }
    }
  }
  const out = new Map(), w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  punches.forEach((pt, i) => {
    const px = r.x0 + Math.round(pt[0] * (w - 1)), py = r.y0 + Math.round(pt[1] * (h - 1));
    cells.forEach(q => { if (q.x === px && q.y === py) out.set(`${q.ox},${q.oy}`, i); });
  });
  return out;
}
function allSeq(n, p = '') { if (!n) return [p]; return ['L', 'R', 'T', 'B'].flatMap(x => allSeq(n - 1, p + x)); }
function signature(seq, punches) { const m = foldModel(seq, punches); return m ? [...m].sort().map(x => x.join(':')).join('|') : ''; }
function patternCells(seq, punches) {
  const m = foldModel(seq, punches); if (!m) return null;
  return [...m.entries()].map(([k, p]) => { const [x, y] = k.split(',').map(Number); return { x, y, p }; })
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

// ---------------------------------------------------------------------------
// Distractor lure taxonomy: how a wrong fold sequence differs from the correct one
// (ported from the demo's errType, computed from the two sequences).
// ---------------------------------------------------------------------------
function errType(a, b) {
  if (a.length !== b.length) return 'fold_count_mismatch';
  const axes = s => [...s].map(x => ('LR'.includes(x) ? 'V' : 'H')).join('');
  if (axes(a) === axes(b)) return 'right_axes_wrong_direction';
  let same = 0; for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++;
  return same === a.length - 1 ? 'single_fold_swapped' : 'wrong_fold_path';
}

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20.
// punchSet indexes are normalized [nx,ny] corners of the folded region.
// ---------------------------------------------------------------------------
const PUNCH_1A = [[0, 0]];
const PUNCH_1B = [[1, 1]];
const PUNCH_1C = [[1, 0]];
const PUNCH_2A = [[0, 0], [1, 1]];
const PUNCH_2B = [[1, 0], [0, 1]];
const PROFILES = {
  1: { folds: 1, punches: PUNCH_1A, nOpts: 2 },
  2: { folds: 1, punches: PUNCH_1C, nOpts: 3 },
  3: { folds: 2, punches: PUNCH_1A, nOpts: 3 },
  4: { folds: 2, punches: PUNCH_1B, nOpts: 3 },
  5: { folds: 2, punches: PUNCH_1C, nOpts: 4 },
  6: { folds: 2, punches: PUNCH_2A, nOpts: 4 },
  7: { folds: 3, punches: PUNCH_1A, nOpts: 3 },
  8: { folds: 3, punches: PUNCH_1B, nOpts: 4 },
  9: { folds: 3, punches: PUNCH_1C, nOpts: 4 },
  10: { folds: 3, punches: PUNCH_2A, nOpts: 4 },
  11: { folds: 3, punches: PUNCH_2B, nOpts: 5 },
  12: { folds: 4, punches: PUNCH_1A, nOpts: 4 },
  13: { folds: 4, punches: PUNCH_1B, nOpts: 4 },
  14: { folds: 4, punches: PUNCH_1C, nOpts: 4 },
  15: { folds: 4, punches: PUNCH_2A, nOpts: 4 },
  16: { folds: 4, punches: PUNCH_2B, nOpts: 5 },
  17: { folds: 4, punches: PUNCH_2A, nOpts: 5 },
  18: { folds: 4, punches: PUNCH_2B, nOpts: 5 },
  19: { folds: 4, punches: PUNCH_2A, nOpts: 5 },
  20: { folds: 4, punches: PUNCH_2B, nOpts: 5 },
};
const ITEMS_PER_LEVEL = 5;
const OPT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

// Distinct-signature fold-sequence pool for a given (folds, punches).
function distinctSeqPool(folds, punches) {
  const seen = new Set(), pool = [];
  for (const s of allSeq(folds)) {
    const sig = signature(s, punches);
    if (sig && !seen.has(sig)) { seen.add(sig); pool.push({ seq: s, sig }); }
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];
  const punches = prof.punches;

  const pool = distinctSeqPool(prof.folds, punches);
  const nOpts = Math.min(prof.nOpts, pool.length);
  const chosen = shuffle(rng, pool).slice(0, nOpts);          // distinct signatures => distinct patterns
  const correctEntry = chosen[Math.floor(rng() * chosen.length)];
  const correctSeq = correctEntry.seq;

  // Options in a shuffled order; the correct option is placed among them.
  const ordered = shuffle(rng, chosen);
  const options = ordered.map((e, i) => ({ key: OPT_KEYS[i], seq: [...e.seq] }));
  const correctKey = options.find(o => o.seq.join('') === correctSeq).key;
  const distractorRationales = options.map(o =>
    o.seq.join('') === correctSeq ? 'correct' : errType(o.seq, correctSeq));

  const target = patternCells(correctSeq, punches);            // the unfolded cut pattern shown to the child
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;

  const content = {
    typeCode: TYPE_CODE,
    question: {
      mode: 'pick_fold_sequence',
      prompt: 'This sheet was folded, punched, and unfolded. Which fold order made this hole pattern?',
    },
    grid: { n: GRID_N },
    punches: punches.map(p => [p[0], p[1]]),
    target: { cells: target },
    optionKind: 'fold_sequence',
    options,
    scaffold: { preview: L <= 6, warmup: L <= 2 },
  };
  const answer = {
    correctKey,
    correctSeq: [...correctSeq],
    relation: 'fold_punch_unfold_signature',
    distractorRationales,
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
// Independent verification: recompute the key by re-simulating every option's fold
// sequence over the item's punches and matching its unfolded signature to the target.
// ---------------------------------------------------------------------------
function targetSignature(cells) {
  return cells.map(c => `${c.x},${c.y}:${c.p}`).sort().join('|');
}
function independentKey(item) {
  const c = item.content;
  const tgtSig = targetSignature(c.target.cells);
  const matches = c.options.filter(o => signature(o.seq.join(''), c.punches) === tgtSig);
  return matches.length === 1 ? matches[0].key : `AMBIGUOUS(${matches.length})`;
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
    if (it.provenance.generator !== 'grammar' || typeof it.provenance.seed !== 'string') problems.push(`${it.itemId}: provenance wrong`);
    // content must NOT leak which option is correct
    for (const leak of ['correctKey', 'correctSeq', 'answer']) if (leak in it.content) problems.push(`${it.itemId}: content leaks ${leak}`);
    // rationale bookkeeping
    const nCorrect = it.answer.distractorRationales.filter(r => r === 'correct').length;
    if (nCorrect !== 1) problems.push(`${it.itemId}: expected 1 correct rationale, got ${nCorrect}`);
    if (it.answer.distractorRationales.length !== it.content.options.length) problems.push(`${it.itemId}: rationale/option length mismatch`);
    // key recomputed independently from the fold geometry
    const k = independentKey(it);
    if (k === it.answer.correctKey) ok++;
    else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${k} (folds ${it.answer.correctSeq.length})`); }
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
  writeFileSync(OUT, items.map(it => JSON.stringify(it)).join('\n') + '\n');
  console.log(`[${TYPE_CODE}] wrote ${items.length} items -> ${OUT}`);
  const byFolds = {}; for (const it of items) { const f = it.answer.correctSeq.length; byFolds[f] = (byFolds[f] || 0) + 1; }
  console.log(`[${TYPE_CODE}] folds:`, JSON.stringify(byFolds));
  const byOpts = {}; for (const it of items) { const n = it.content.options.length; byOpts[n] = (byOpts[n] || 0) + 1; }
  console.log(`[${TYPE_CODE}] options:`, JSON.stringify(byOpts));

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check (re-simulate folds + match signature): ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: keys computed from fold geometry, unique match per item, coverage satisfied, born-synthetic.`);
}

main();
