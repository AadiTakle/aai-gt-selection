// Independent validator for the SPA-PICKFOLD-01 structured bank.
//
// This checker does NOT import the generator. It recomputes each item's key with a
// DIFFERENT algorithm than the generator's forward per-cell transform: it REVERSE-UNFOLDS
// each punched cell of the final folded region back through the crease reflections to
// enumerate the original punched cells, then matches that unfolded signature to the target.
// Exactly one option must match, and it must equal the declared correctKey.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Born-synthetic + server/renderable split: content carries NO correct key / sequence.
//   3. Key is COMPUTED + UNIQUE: reverse-unfolding exactly one option reproduces the target,
//      and it is the declared correctKey; a forward re-sim cross-checks the target itself.
//   4. Difficulty is a float 1..20 with >=5 items per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-SPA-PICKFOLD-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/SPA-PICKFOLD-01.jsonl');
const N = 8;
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- reverse-unfold model (independent of the generator's forward transform) ----
// Region-only forward pass records each crease so we can reflect punches back outward.
function foldRegions(seq) {
  let r = { x0: 0, x1: N - 1, y0: 0, y1: N - 1 };
  const folds = [];
  for (const op of seq) {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    if (op === 'L' || op === 'R') {
      if (w < 2) return null; const p = r.x0 + w / 2; folds.push({ op, p, before: { ...r } });
      r = (op === 'L') ? { ...r, x0: p } : { ...r, x1: p - 1 };
    } else {
      if (h < 2) return null; const p = r.y0 + h / 2; folds.push({ op, p, before: { ...r } });
      r = (op === 'T') ? { ...r, y0: p } : { ...r, y1: p - 1 };
    }
  }
  return { folds, region: r };
}
// Enumerate original cells that map to one punched cell of the final region.
function unfoldCell(seq, px, py) {
  const info = foldRegions(seq); if (!info) return null;
  let S = new Set([px + ',' + py]);
  for (let i = info.folds.length - 1; i >= 0; i--) {
    const f = info.folds[i]; const add = [];
    for (const key of S) {
      const [x, y] = key.split(',').map(Number);
      if (f.op === 'L') { if (x >= f.p) { const m = 2 * f.p - 1 - x; if (m >= f.before.x0 && m < f.p) add.push(m + ',' + y); } }
      else if (f.op === 'R') { if (x < f.p) { const m = 2 * f.p - 1 - x; if (m <= f.before.x1 && m >= f.p) add.push(m + ',' + y); } }
      else if (f.op === 'T') { if (y >= f.p) { const m = 2 * f.p - 1 - y; if (m >= f.before.y0 && m < f.p) add.push(x + ',' + m); } }
      else { if (y < f.p) { const m = 2 * f.p - 1 - y; if (m <= f.before.y1 && m >= f.p) add.push(x + ',' + m); } }
    }
    add.forEach(a => S.add(a));
  }
  return { S, region: info.region };
}
// Full unfolded punch signature via reverse-unfold, keyed by punch index (first punch wins ties).
function reverseSignature(seq, punches) {
  const info = foldRegions(seq); if (!info) return '';
  const r = info.region, w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
  const map = new Map();
  punches.forEach((pt, i) => {
    const px = r.x0 + Math.round(pt[0] * (w - 1)), py = r.y0 + Math.round(pt[1] * (h - 1));
    const u = unfoldCell(seq, px, py); if (!u) return;
    for (const k of u.S) if (!map.has(k)) map.set(k, i);
  });
  return [...map].map(([k, i]) => { const [x, y] = k.split(',').map(Number); return `${x},${y}:${i}`; }).sort().join('|');
}

// ---- forward model (fresh reimplementation) used only to cross-check the target ----
function forwardSignature(seq, punches) {
  const cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push({ ox: x, oy: y, x, y });
  let r = { x0: 0, x1: N - 1, y0: 0, y1: N - 1 };
  for (const op of seq) {
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1;
    if (op === 'L' || op === 'R') {
      if (w < 2) return ''; const p = r.x0 + w / 2;
      if (op === 'L') { cells.forEach(q => { if (q.x < p) q.x = 2 * p - 1 - q.x; }); r.x0 = p; }
      else { cells.forEach(q => { if (q.x >= p) q.x = 2 * p - 1 - q.x; }); r.x1 = p - 1; }
    } else {
      if (h < 2) return ''; const p = r.y0 + h / 2;
      if (op === 'T') { cells.forEach(q => { if (q.y < p) q.y = 2 * p - 1 - q.y; }); r.y0 = p; }
      else { cells.forEach(q => { if (q.y >= p) q.y = 2 * p - 1 - q.y; }); r.y1 = p - 1; }
    }
  }
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1, map = new Map();
  punches.forEach((pt, i) => {
    const px = r.x0 + Math.round(pt[0] * (w - 1)), py = r.y0 + Math.round(pt[1] * (h - 1));
    cells.forEach(q => { if (q.x === px && q.y === py && !map.has(`${q.ox},${q.oy}`)) map.set(`${q.ox},${q.oy}`, i); });
  });
  return [...map].map(([k, i]) => `${k}:${i}`).sort().join('|');
}
function targetSignature(cells) { return cells.map(c => `${c.x},${c.y}:${c.p}`).sort().join('|'); }

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} not valid JSON: ${e.message}`); } });

// ---- 2 + 3. Per-item structural + independent key recompute ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';
  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId'); seenIds.add(it.itemId);
  if (it.typeCode !== 'SPA-PICKFOLD-01') fail(id, `typeCode != SPA-PICKFOLD-01 (${it.typeCode})`);
  if (it.domain !== 'spatial') fail(id, `domain != spatial (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  for (const leak of ['correctKey', 'correctSeq', 'answer']) if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length < 2) fail(id, `options too few (${opts.length})`);
  const keys = opts.map((o) => o && o.key);
  if (new Set(keys).size !== keys.length) fail(id, 'option keys not unique');
  for (const o of opts) { if (!o || typeof o.key !== 'string' || !Array.isArray(o.seq) || o.seq.length === 0) fail(id, 'option malformed'); }
  if (!c.target || !Array.isArray(c.target.cells) || c.target.cells.length === 0) fail(id, 'target pattern missing');
  const punches = c.punches || [];
  if (!Array.isArray(punches) || punches.length === 0) fail(id, 'punches missing');

  const ans = it.answer || {};
  if (!keys.includes(ans.correctKey)) fail(id, `correctKey "${ans.correctKey}" not an option key`);
  const rats = ans.distractorRationales || [];
  if (!Array.isArray(rats) || rats.length !== opts.length) fail(id, 'distractorRationales length != options');
  else if (rats.filter((r) => r === 'correct').length !== 1) fail(id, 'expected exactly 1 "correct" rationale');

  // Independent recompute: reverse-unfold each option; exactly one must match the target.
  const tgt = targetSignature(c.target.cells);
  const matches = opts.filter((o) => reverseSignature(o.seq.join(''), punches) === tgt).map((o) => o.key);
  if (matches.length !== 1) fail(id, `reverse-unfold: ${matches.length} options match the target (want exactly 1)`);
  else if (matches[0] !== ans.correctKey) fail(id, `reverse-unfold key ${matches[0]} != declared correctKey ${ans.correctKey}`);
  // Cross-check the target itself was built from the declared correct sequence (forward re-sim).
  if (Array.isArray(ans.correctSeq)) {
    if (forwardSignature(ans.correctSeq.join(''), punches) !== tgt) fail(id, 'forward re-sim of correctSeq != stored target pattern');
    const optForKey = opts.find((o) => o.key === ans.correctKey);
    if (optForKey && optForKey.seq.join('') !== ans.correctSeq.join('')) fail(id, 'correctKey option sequence != answer.correctSeq');
  }
}

// ---- 4. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (floor not reached)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ceiling not reached)`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d); if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`SPA-PICKFOLD-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - parses, structure valid, key reverse-unfolds uniquely to the declared correctKey, coverage 1..20 with >=5 per bin and per +/-1pt band.');
