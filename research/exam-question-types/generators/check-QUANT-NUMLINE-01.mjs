// Tiny validator for the QUANT-NUMLINE-01 structured bank.
//
// QUANT-NUMLINE-01 is a PLACEMENT task: the child releases a jumper at a
// continuous position on a bounded line and the server scores it against a
// target position with a tolerance. Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 shape).
//   2. Server/renderable split: served content carries NO tolerance/answer leak.
//   3. Key is reproducible: an independent solver re-derives the target position
//      from the served line+target alone and matches answer.targetRatio.
//   4. The documented deterministic scorer behaves as specified (placing AT the
//      target scores 1; placing a hair past the tolerance scores 0).
//   5. Item is reproducible from its provenance seed (grammar has not drifted).
//   6. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-QUANT-NUMLINE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem, derivePlacement, drawnMarkRatios } from './QUANT-NUMLINE-01.mjs';
import { normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-NUMLINE-01.jsonl');
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
const MIN_PER_BAND = 5;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

// The documented deterministic scorer (mirrors scoring.description). Given the
// item and a raw placed ratio, returns {pae, correct}. Server-authoritative.
function scorePlacement(item, placedRatio) {
  const pae = Math.abs(placedRatio - item.answer.targetRatio);
  return { pae, correct: pae <= item.answer.tolerance };
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');

const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`); }
});

// ---- 2 + 3 + 4 + 5. Per-item checks ----
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  if (typeof it.itemId !== 'string' || it.itemId.length < 8) fail(id, 'itemId missing/short');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== 'QUANT-NUMLINE-01') fail(id, `typeCode != QUANT-NUMLINE-01 (${it.typeCode})`);
  if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand (${it.ageBands})`);

  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  if (!c.line || !isNum(c.line.min) || !isNum(c.line.max) || !(c.line.max > c.line.min)) fail(id, 'content.line bounds invalid');
  if (!c.target) fail(id, 'content.target missing');
  if (!['dots', 'groups', 'fraction', 'numeral'].includes(c.display)) fail(id, `bad display (${c.display})`);
  // SERVED-SUBSET SAFETY: the pass tolerance must never reach the browser.
  if (c.tolerance != null) fail(id, 'content leaks scoring tolerance');
  if (c.answer != null || c.targetRatio != null) fail(id, 'content leaks answer');

  // Answer block.
  const ans = it.answer || {};
  if (ans.correctKey !== 'target') fail(id, `correctKey != "target" (${ans.correctKey})`);
  if (!isNum(ans.targetRatio) || !isNum(ans.tolerance)) fail(id, 'answer.targetRatio/tolerance missing');
  const rats = ans.distractorRationales || {};
  if (Object.keys(rats).length < 3) fail(id, 'fewer than 3 misconception rationales');
  for (const k of Object.keys(rats)) if (!rats[k] || typeof rats[k].misconception !== 'string') fail(id, `rationale ${k} missing misconception`);

  // 2/3. NO-LEAK re-derivation: recover the target ratio from served content only.
  const solved = derivePlacement(c);
  if (Math.abs(solved.ratio - ans.targetRatio) > 0.0005) fail(id, `solver ratio ${solved.ratio} != answer.targetRatio ${ans.targetRatio}`);

  // Unique correct region must sit strictly inside (0,1) (band cannot touch an endpoint).
  if (!(ans.targetRatio - ans.tolerance > 0 && ans.targetRatio + ans.tolerance < 1)) fail(id, 'tolerance band escapes [0,1]');

  // Off-anchor items must genuinely require estimation (target held off every drawn mark).
  if (it.provenance.levers && it.provenance.levers.offAnchor) {
    const marks = drawnMarkRatios(c).filter((m) => m > 0.0001 && m < 0.9999);
    const gap = marks.length ? Math.min(...marks.map((m) => Math.abs(m - ans.targetRatio))) : 1;
    if (gap < 1.35 * ans.tolerance - 1e-6) fail(id, `off-anchor item too close to a drawn mark (gap ${round2(gap)} < ${round2(1.35 * ans.tolerance)})`);
  }

  // 4. Documented scorer behaves as specified.
  const atTarget = scorePlacement(it, ans.targetRatio);
  if (!atTarget.correct || atTarget.pae > 1e-9) fail(id, 'scorer does not credit an exact-target placement');
  const justPast = ans.targetRatio + ans.tolerance + 1e-4;
  if (justPast < 1 && scorePlacement(it, justPast).correct) fail(id, 'scorer credits a placement beyond tolerance');
  const atEndpoint = scorePlacement(it, ans.targetRatio > 0.5 ? 0 : 1);
  if (atEndpoint.correct) fail(id, 'scorer credits an endpoint placement (target not genuinely interior)');

  // 5. Reproducibility from provenance: regenerate with the same master/rung/ordinal.
  const parts = it.provenance.seed.split(':'); // masterSeed:TYPE:d<rung>:i<ordinal>:a<attempt>
  const masterSeed = parts[0];
  const rung = parseInt((parts[2] || '').replace(/^d/, ''), 10);
  const ordinal = parseInt((parts[3] || '').replace(/^i/, ''), 10);
  if (!Number.isInteger(rung) || !Number.isInteger(ordinal)) fail(id, `cannot parse rung/ordinal from seed (${it.provenance.seed})`);
  else {
    try {
      const regen = normalizeBankItem(buildItem(masterSeed, rung, ordinal));
      if (!regen) fail(id, 'regeneration produced null');
      else if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
    } catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  }
}

// ---- 6. Coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (does not reach the ceiling)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
binCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `integer bin k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });
bandCounts.forEach((n, i) => { if (n < MIN_PER_BAND) fail('coverage', `+/-1pt band around k=${i + 1} has ${n} items (<${MIN_PER_BAND})`); });

// ---- Report ----
console.log(`QUANT-NUMLINE-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — parses, placement key reproducible + no-leak, deterministic tolerance scorer verified, coverage 1..20 with >=5 per bin and per +/-1pt band.');
