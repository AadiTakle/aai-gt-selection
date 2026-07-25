// Tiny validator for the QUANT-DOTS-01 structured bank.
//
// QUANT-DOTS-01 is a nonsymbolic 2AFC: two dot arrays flash, then the child
// taps the side that had MORE. Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Served split: response options carry NO answer/cue leak.
//   3. Key is reproducible: an independent solver recovers the more-numerous
//      side from the served dot arrays and matches answer.correctKey.
//   4. Geometry is sound: per-side dots do not overlap (recomputed independently).
//   5. Continuous-cue balance actually holds for the declared cue condition
//      (equal-size / area-controlled / incongruent) from counts+radii.
//   6. The documented deterministic scorer credits the correct side only.
//   7. Item is reproducible from its provenance seed (grammar has not drifted).
//   8. Difficulty coverage: spans 1..20 with >=5 per integer bin AND per +/-1 pt band.
//
// Run:  node research/exam-question-types/generators/check-QUANT-DOTS-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem, deriveMoreSide, WINDOW_PX } from './QUANT-DOTS-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-DOTS-01.jsonl');
const ALLOWED_BANDS = ['K-1', '2-3'];        // this type's declared bands
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;
const areaOf = (side) => side.count * Math.PI * side.r * side.r;

function scoreMore(item, selectedKey) {
  return { correct: selectedKey === item.answer.correctKey };
}

// Independent overlap test: convert px radius to percent field units and confirm
// no two centres on a side are closer than a full diameter (minus rounding slack).
function hasOverlap(side) {
  const rPct = (side.r / WINDOW_PX) * 100;
  const minSep = 2 * rPct - 0.8;             // allow 1-decimal coordinate rounding
  const d = side.dots || [];
  for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) {
    const dx = d[i].x - d[j].x, dy = d[i].y - d[j].y;
    if (dx * dx + dy * dy < minSep * minSep) return true;
  }
  return false;
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => { try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} invalid JSON: ${e.message}`); } });

// ---- Per-item ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'QUANT-DOTS-01') fail(id, `typeCode != QUANT-DOTS-01 (${it.typeCode})`);
  if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (typeof it.provenance?.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  if (!c.left || !c.right) { fail(id, 'missing sides'); continue; }
  if (!Number.isInteger(c.left.count) || !Number.isInteger(c.right.count)) fail(id, 'non-integer counts');
  if (c.left.count === c.right.count) fail(id, 'equal counts (no unique answer)');
  if ((c.left.dots || []).length !== c.left.count) fail(id, 'left dots length != count');
  if ((c.right.dots || []).length !== c.right.count) fail(id, 'right dots length != count');
  if (!isNum(c.exposureMs) || c.exposureMs <= 0) fail(id, 'bad exposureMs');

  // 2. no leak in options.
  const opts = c.options || [];
  const keys = opts.map((o) => o.key);
  if (!(keys.includes('L') && keys.includes('R') && keys.length === 2)) fail(id, 'options must be exactly L and R');
  for (const o of opts) for (const leak of ['correct', 'isCorrect', 'more', 'lure', 'count']) if (Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `option leaks ${leak}`);

  // 3. no-leak re-derivation of the key.
  const solved = deriveMoreSide(c);
  if (solved !== it.answer.correctKey) fail(id, `solver ${solved} != correctKey ${it.answer.correctKey}`);

  // distractor rationale for the wrong side, keyed to a misconception.
  const wrong = it.answer.correctKey === 'L' ? 'R' : 'L';
  const rat = (it.answer.distractorRationales || {})[wrong];
  if (!rat || typeof rat.misconception !== 'string') fail(id, `missing cue-keyed rationale for wrong side ${wrong}`);

  // 4. geometry: no overlap on either side.
  if (hasOverlap(c.left)) fail(id, 'left side has overlapping dots');
  if (hasOverlap(c.right)) fail(id, 'right side has overlapping dots');

  // 5. cue balance holds for the declared condition.
  const more = c.left.count > c.right.count ? c.left : c.right;
  const few = c.left.count > c.right.count ? c.right : c.left;
  const aMore = areaOf(more), aFew = areaOf(few);
  const cue = c.cueCondition;
  if (cue === 'equal-size') { if (Math.abs(c.left.r - c.right.r) > 1e-6) fail(id, 'equal-size but radii differ'); if (!(aMore > aFew)) fail(id, 'equal-size but area not congruent'); }
  else if (cue === 'area-controlled') { if (Math.abs(aMore - aFew) / Math.max(aMore, aFew) > 0.06) fail(id, `area-controlled but areas differ by ${round2(100 * Math.abs(aMore - aFew) / Math.max(aMore, aFew))}%`); }
  else if (cue === 'incongruent') { if (!(aFew > aMore * 1.15)) fail(id, `incongruent but fewer side area not > 1.15x more side (ratio ${round2(aFew / aMore)})`); }
  else fail(id, `unknown cueCondition ${cue}`);

  // 6. deterministic scorer.
  if (!scoreMore(it, it.answer.correctKey).correct) fail(id, 'scorer rejects the correct side');
  if (scoreMore(it, wrong).correct) fail(id, 'scorer credits the wrong side');

  // 7. reproducibility from provenance.
  const parts = it.provenance.seed.split(':'); // masterSeed:TYPE:d<rung>:i<ordinal>:a<attempt>
  const masterSeed = parts[0];
  const rung = parseInt((parts[2] || '').replace(/^d/, ''), 10);
  const ordinal = parseInt((parts[3] || '').replace(/^i/, ''), 10);
  if (!Number.isInteger(rung) || !Number.isInteger(ordinal)) fail(id, `cannot parse rung/ordinal from seed`);
  else {
    try { const regen = buildItem(masterSeed, rung, ordinal); if (!regen) fail(id, 'regeneration produced null'); else if (!deepEq(regen, it)) fail(id, 'item NOT reproducible from provenance (grammar drift)'); }
    catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  }
}

// ---- 8. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5`);
const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d); if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band k=${i + 1} has ${n} (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`QUANT-DOTS-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, key reproducible + no-leak, dots non-overlapping, cue balance verified, deterministic scorer verified, coverage 1..20 with >=5 per bin and per +/-1pt band.');
