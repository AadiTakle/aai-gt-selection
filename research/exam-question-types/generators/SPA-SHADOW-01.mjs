#!/usr/bin/env node
// SPA-SHADOW-01 - Shadow-Play structured bank generator (grammar, Bucket A).
//
// Emits a JSONL bank of BankItem rows (research/exam-question-types/banks/SPA-SHADOW-01.jsonl)
// conforming to the item/result contract in docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md (2)
// and docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md. Born-synthetic: syntheticOnly=true,
// validated=false. Deterministic given BASE_SEED.
//
// A voxel object casts a flat shadow (orthographic projection) along a light direction
// (top / front / side). The correct silhouette is COMPUTED by projecting the voxel set
// along the light axis - never guessed. Distractors are the OTHER-axis projections
// (direction confusion) and one/two-cell silhouette perturbations (feature collapse),
// deduped so exactly one option equals the true shadow.
//
// Usage:
//   node generators/SPA-SHADOW-01.mjs            # write bank
//   node generators/SPA-SHADOW-01.mjs --verify   # write bank + independent self-check
//
// Difficulty is a FLOAT 1..20 (a design rung, provisional; not calibrated). It rises via
// voxel-grid size (dim 2->4), voxel count, number of options, light-axis variety
// (top -> front -> side), and distractor tightness (other-axis -> 1-cell -> 2-cell edits).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../banks/SPA-SHADOW-01.jsonl');
const BASE_SEED = 20260724;
const TYPE_CODE = 'SPA-SHADOW-01';
const DOMAIN = 'spatial';
const GENERATOR_REF = 'SPA-SHADOW-01@1';

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
function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
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
// Voxel object + orthographic shadow projections.
// The shadow along an axis is the set of grid cells hit by the object when
// flattened along that axis. This is the physically correct cast shadow.
// ---------------------------------------------------------------------------
const K = (x, y, z) => x + ',' + y + ',' + z;

function genBlob(dim, cells, rng) {
  const vox = new Set();
  const sx = Math.floor(rng() * dim), sz = Math.floor(rng() * dim);
  vox.add(K(sx, 0, sz));                                  // seed sits on the floor (y=0)
  let guard = 0;
  while (vox.size < cells && guard++ < 2000) {
    const arr = [...vox];
    const [x, y, z] = arr[Math.floor(rng() * arr.length)].split(',').map(Number);
    const dirs = shuffle(rng, [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]);
    let added = false;
    for (const [dx, dy, dz] of dirs) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx >= 0 && nx < dim && ny >= 0 && ny < dim && nz >= 0 && nz < dim && !vox.has(K(nx, ny, nz))) {
        vox.add(K(nx, ny, nz)); added = true; break;
      }
    }
    if (!added && vox.size >= 3 && guard > cells * 6) break;
  }
  return vox;
}

function crop(g) {
  let r0 = g.length, r1 = -1, c0 = g[0].length, c1 = -1;
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) if (g[r][c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  if (r1 < 0) return [[0]];
  const out = [];
  for (let r = r0; r <= r1; r++) { const row = []; for (let c = c0; c <= c1; c++) row.push(g[r][c] ? 1 : 0); out.push(row); }
  return out;
}
// axis: 'top' (flatten Y), 'front' (flatten Z), 'side' (flatten X). Rows go top-down.
function project(vox, axis, dim) {
  const g = [];
  if (axis === 'top') {
    for (let z = 0; z < dim; z++) { const row = []; for (let x = 0; x < dim; x++) { let on = false; for (let y = 0; y < dim; y++) if (vox.has(K(x, y, z))) on = true; row.push(on); } g.push(row); }
  } else if (axis === 'front') {
    for (let y = dim - 1; y >= 0; y--) { const row = []; for (let x = 0; x < dim; x++) { let on = false; for (let z = 0; z < dim; z++) if (vox.has(K(x, y, z))) on = true; row.push(on); } g.push(row); }
  } else {
    for (let y = dim - 1; y >= 0; y--) { const row = []; for (let z = 0; z < dim; z++) { let on = false; for (let x = 0; x < dim; x++) if (vox.has(K(x, y, z))) on = true; row.push(on); } g.push(row); }
  }
  return crop(g);
}
function bitsKey(b) { return b.length + 'x' + b[0].length + ':' + b.map(r => r.map(v => v ? 1 : 0).join('')).join('|'); }
function toggle(b, n, rng) {
  let cur = b;
  for (let t = 0; t < n; t++) {
    const h = cur.length, w = cur[0].length;
    const pad = cur.map(r => [0, ...r, 0]); pad.unshift(new Array(w + 2).fill(0)); pad.push(new Array(w + 2).fill(0));
    const r = Math.floor(rng() * (h + 2)), c = Math.floor(rng() * (w + 2));
    pad[r][c] = pad[r][c] ? 0 : 1;
    const cr = crop(pad); let cnt = 0; cr.forEach(row => row.forEach(v => { if (v) cnt++; }));
    if (cnt === 0) return null;
    cur = cr;
  }
  return cur;
}

const LIGHTS = {
  top: { em: 'TOP', label: 'Light from above - shadow on the floor' },
  front: { em: 'FRONT', label: 'Light from the front - shadow behind' },
  side: { em: 'SIDE', label: 'Light from the side - shadow on the wall' },
};

// ---------------------------------------------------------------------------
// Difficulty ramp: one hand-authored profile per level 1..20 (levers rise together).
// ---------------------------------------------------------------------------
const PROFILES = {
  1: { dim: 2, cells: 3, nOpt: 3, axisPool: ['top'], edit: 1, distinct: false, scaffold: true },
  2: { dim: 2, cells: 4, nOpt: 3, axisPool: ['top'], edit: 1, distinct: false, scaffold: true },
  3: { dim: 2, cells: 4, nOpt: 3, axisPool: ['top', 'front'], edit: 1, distinct: false, scaffold: true },
  4: { dim: 2, cells: 5, nOpt: 3, axisPool: ['top', 'front'], edit: 1, distinct: false, scaffold: true },
  5: { dim: 3, cells: 5, nOpt: 3, axisPool: ['top', 'front'], edit: 1, distinct: true, scaffold: true },
  6: { dim: 3, cells: 6, nOpt: 4, axisPool: ['top', 'front'], edit: 1, distinct: true, scaffold: true },
  7: { dim: 3, cells: 7, nOpt: 4, axisPool: ['top', 'front', 'side'], edit: 1, distinct: true, scaffold: false },
  8: { dim: 3, cells: 8, nOpt: 4, axisPool: ['top', 'front', 'side'], edit: 1, distinct: true, scaffold: false },
  9: { dim: 3, cells: 9, nOpt: 4, axisPool: ['top', 'front', 'side'], edit: 1, distinct: true, scaffold: false },
  10: { dim: 3, cells: 10, nOpt: 4, axisPool: ['top', 'front', 'side'], edit: 1, distinct: true, scaffold: false },
  11: { dim: 4, cells: 10, nOpt: 4, axisPool: ['top', 'front', 'side'], edit: 1, distinct: true, scaffold: false },
  12: { dim: 4, cells: 12, nOpt: 4, axisPool: ['top', 'front', 'side'], edit: 1, distinct: true, scaffold: false },
  13: { dim: 4, cells: 13, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
  14: { dim: 4, cells: 14, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
  15: { dim: 4, cells: 15, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
  16: { dim: 4, cells: 16, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
  17: { dim: 4, cells: 17, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
  18: { dim: 4, cells: 18, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
  19: { dim: 4, cells: 19, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
  20: { dim: 4, cells: 20, nOpt: 5, axisPool: ['top', 'front', 'side'], edit: 2, distinct: true, scaffold: false },
};
const ITEMS_PER_LEVEL = 5;
const OPT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

function ageBandsForLevel(L) {
  if (L <= 3) return ['2-3'];
  if (L <= 7) return ['2-3', '4-5'];
  if (L <= 12) return ['4-5', '6-8'];
  return ['6-8'];
}

// ---------------------------------------------------------------------------
// Build one item.
// ---------------------------------------------------------------------------
function genObject(prof, rng) {
  let best = null;
  for (let t = 0; t < 400; t++) {
    const vox = genBlob(prof.dim, prof.cells, rng);
    const shadows = { top: project(vox, 'top', prof.dim), front: project(vox, 'front', prof.dim), side: project(vox, 'side', prof.dim) };
    best = { vox, shadows };
    if (!prof.distinct) break;
    const keys = prof.axisPool.map(a => bitsKey(shadows[a]));
    if (new Set(keys).size === prof.axisPool.length) break;    // axis shadows distinct enough for wrong-axis lures
  }
  return best;
}

function buildOptions(shadows, axis, prof, rng) {
  const correct = shadows[axis];
  const seen = new Set([bitsKey(correct)]);
  const distractors = [];
  // 1) other-axis projections = direction confusion
  for (const ax of shuffle(rng, prof.axisPool.filter(a => a !== axis))) {
    if (distractors.length >= prof.nOpt - 1) break;
    const b = shadows[ax]; const k = bitsKey(b);
    if (!seen.has(k)) { seen.add(k); distractors.push({ bits: b, lure: 'wrong_axis' }); }
  }
  // 2) tight silhouette edits = feature collapse near-miss
  let guard = 0;
  while (distractors.length < prof.nOpt - 1 && guard++ < 200) {
    const b = toggle(correct, 1, rng);
    if (b) { const k = bitsKey(b); if (!seen.has(k)) { seen.add(k); distractors.push({ bits: b, lure: 'near_miss' }); } }
  }
  // 3) looser edits (larger perturbation) = random-ish
  guard = 0;
  while (distractors.length < prof.nOpt - 1 && guard++ < 200) {
    const src = shadows[pick(rng, prof.axisPool)] || correct;
    const b = toggle(src, prof.edit + 1, rng);
    if (b) { const k = bitsKey(b); if (!seen.has(k)) { seen.add(k); distractors.push({ bits: b, lure: 'random' }); } }
  }
  const chosen = shuffle(rng, [{ bits: correct, lure: 'correct' }, ...distractors]);
  const options = chosen.map((c, i) => ({ key: OPT_KEYS[i], bits: c.bits, rows: c.bits.length, cols: c.bits[0].length }));
  const distractorRationales = chosen.map(c => c.lure);
  const correctKey = chosen.map((c, i) => ({ c, key: OPT_KEYS[i] })).find(o => o.c.lure === 'correct').key;
  return { options, distractorRationales, correctKey, bitsK: bitsKey(correct) };
}

function buildItem(L, idx) {
  const seed = `${TYPE_CODE}|L${L}|#${idx}|${BASE_SEED}`;
  const rng = makeRng(seed);
  const prof = PROFILES[L];
  const { vox, shadows } = genObject(prof, rng);
  const axis = pick(rng, prof.axisPool);
  const { options, distractorRationales, correctKey, bitsK } = buildOptions(shadows, axis, prof, rng);

  const voxels = [...vox].map(s => s.split(',').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const difficulty = Math.round((Math.min(20, Math.max(1, L + (rng() * 0.7 - 0.35)))) * 100) / 100;

  const content = {
    typeCode: TYPE_CODE,
    question: { mode: 'cast_shadow', light: axis, lightEm: LIGHTS[axis].em, prompt: `Which shadow does the ${LIGHTS[axis].em.toLowerCase()} light throw?`, lightLabel: LIGHTS[axis].label },
    object: { dim: prof.dim, voxels },
    optionKind: 'silhouette',
    options,
    scaffold: { peek: prof.scaffold, warmup: prof.scaffold },
  };
  const answer = { correctKey, correctLight: axis, bitsKey: bitsK, relation: 'orthographic_projection', distractorRationales };
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
// Independent verification: re-project the voxels, match against options, check coverage.
// ---------------------------------------------------------------------------
function independentKey(item) {
  const c = item.content;
  const vox = new Set(c.object.voxels.map(v => K(v[0], v[1], v[2])));
  const bits = project(vox, c.question.light, c.object.dim);
  const key = bitsKey(bits);
  const matches = c.options.filter(o => bitsKey(o.bits) === key);
  return matches.length === 1 ? matches[0].key : `AMBIGUOUS(${matches.length})`;
}

function verify(items) {
  let ok = 0, bad = 0; const problems = [];
  const bands = {}; for (let L = 1; L <= 20; L++) bands[L] = 0;
  for (const it of items) {
    const req = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
    for (const k of req) if (!(k in it)) problems.push(`${it.itemId}: missing ${k}`);
    if (it.syntheticOnly !== true || it.validated !== false) problems.push(`${it.itemId}: born-synthetic flags wrong`);
    if (it.difficulty < 1 || it.difficulty > 20) problems.push(`${it.itemId}: difficulty out of range`);
    if (it.scoring.mode !== 'deterministic_key') problems.push(`${it.itemId}: scoring mode wrong`);
    // renderable options must NOT leak which is correct
    for (const o of it.content.options) if ('lure' in o || 'correct' in o) problems.push(`${it.itemId}: option leaks answer`);
    const nCorrect = it.answer.distractorRationales.filter(r => r === 'correct').length;
    if (nCorrect !== 1) problems.push(`${it.itemId}: expected 1 correct rationale, got ${nCorrect}`);
    if (it.answer.distractorRationales.length !== it.content.options.length) problems.push(`${it.itemId}: rationale/option length mismatch`);
    const k = independentKey(it);
    if (k === it.answer.correctKey) ok++; else { bad++; problems.push(`${it.itemId}: key ${it.answer.correctKey} != recomputed ${k} (${it.content.question.light}/dim${it.content.object.dim})`); }
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
  const byLight = {}; for (const it of items) byLight[it.content.question.light] = (byLight[it.content.question.light] || 0) + 1;
  console.log(`[${TYPE_CODE}] light:`, JSON.stringify(byLight));
  const byOpts = {}; for (const it of items) { const n = it.content.options.length; byOpts[n] = (byOpts[n] || 0) + 1; }
  console.log(`[${TYPE_CODE}] option counts:`, JSON.stringify(byOpts));

  const v = verify(items);
  const cov = coverageReport(v.bands);
  console.log(`[${TYPE_CODE}] key check: ${v.ok} ok, ${v.bad} bad`);
  console.log(`[${TYPE_CODE}] coverage (min band count = ${cov.minBand}, need >= ${ITEMS_PER_LEVEL}):`);
  if (doVerify) console.log(cov.text);
  if (v.problems.length) {
    console.error(`[${TYPE_CODE}] FAIL: ${v.problems.length} problem(s):`);
    v.problems.slice(0, 20).forEach(p => console.error('  - ' + p));
    process.exit(1);
  }
  if (cov.minBand < ITEMS_PER_LEVEL) { console.error(`[${TYPE_CODE}] FAIL: coverage below ${ITEMS_PER_LEVEL} in some band`); process.exit(1); }
  console.log(`[${TYPE_CODE}] OK: keys computed from geometry, coverage satisfied, born-synthetic.`);
}

main();
