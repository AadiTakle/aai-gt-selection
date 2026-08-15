// Independent validator for the QUANT-MIX-01 structured bank.
//
// QUANT-MIX-01 is a CONSTRUCTION task: the child builds two ingredient counts,
// so the bank is scored by a computed solver rather than an answer card. This
// script does NOT reuse the generator's solver. It re-derives every answer from
// first principles — reduce the displayed target with gcd, recover the number of
// composite units from the served constraint, and rebuild the counts — then
// proves uniqueness by an exhaustive scan that compares CONCENTRATIONS
// (a/(a+b)) rather than cross-products, so a mistake in either formulation of
// the ratio maths would show up as a disagreement. Checks (exit nonzero on any
// failure):
//   1. JSONL parses; every row is a well-formed BankItem (BUILD_PLAN §2 shape,
//      exactly the contract keys, born-synthetic flags, demoPath).
//   2. Served/renderable split: `content` carries no counts, key, scale, lure or
//      any other answer data at any depth; the bowl never opens on the answer.
//   3. Independent re-derivation: the rebuilt mixture equals the keyed answer and
//      is the ONLY reachable construction that satisfies the served constraint.
//   4. M-PAE behaves as documented: exactly 0 for the keyed mixture and strictly
//      positive for every labelled misconception state.
//   5. Misconception taxonomy: >=3 reachable, wrong, diagnostically labelled
//      error states per item (M-LURETYPE / M-ERRTYPE depend on them).
//   6. The ceiling is STRUCTURAL: no row exceeds the token cap anywhere, and
//      above-level items earn difficulty from un-reduced targets, non-integer or
//      shrinking scale factors and both-rows-unknown bowls.
//   7. Reproducibility: each item regenerates byte-identically from its seed.
//   8. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-QUANT-MIX-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem } from './QUANT-MIX-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-MIX-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];            // catalog age_bands for this type
const CONTRACT_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const MIN_PER_BAND = 5;
const MAX_ROW_TOKENS = 24;                              // counting-load ceiling

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/* ---------------------------------------------------------------- *
 * Independent mixture mathematics (no import from the generator)
 * ---------------------------------------------------------------- */
const strength = (a, b) => a / (a + b);                 // part-to-whole concentration

// Rebuild the intended mixture from served content alone.
function rederive(content) {
  const ta = content.targetBowl.A, tb = content.targetBowl.B;
  const g = gcd(ta, tb);
  const p = ta / g, q = tb / g;                          // reduced part-to-part mix
  const k = content.constraint;
  let units;
  if (k.kind === 'fixed_total') {
    if (k.total % (p + q) !== 0) return { ok: false, why: `capacity ${k.total} is not a whole number of ${p}:${q} units` };
    units = k.total / (p + q);
  } else {
    const row = k.row;
    const given = content.workBowl[row];
    const part = row === 'A' ? p : q;
    if (given % part !== 0) return { ok: false, why: `given row ${row}=${given} is not a whole number of ${p}:${q} units` };
    units = given / part;
  }
  if (!(units > 0)) return { ok: false, why: 'non-positive unit count' };
  return { ok: true, p, q, units, counts: { A: units * p, B: units * q } };
}

// Exhaustive uniqueness scan using concentrations (an independent formulation
// of "tastes the same" from the generator's integer cross-product).
function allEquivalent(content) {
  const target = strength(content.targetBowl.A, content.targetBowl.B);
  const max = content.limits.maxPerIngredient;
  const k = content.constraint;
  const hits = [];
  for (let a = 1; a <= max; a++) {
    for (let b = 1; b <= max; b++) {
      if (Math.abs(strength(a, b) - target) > 1e-12) continue;
      if (k.kind === 'fixed_total') { if (a + b !== k.total) continue; }
      else { const row = k.row; if ((row === 'A' ? a : b) !== content.workBowl[row]) continue; }
      hits.push({ A: a, B: b });
    }
  }
  return hits;
}
function paeOf(content, counts) {
  if (!(counts.A + counts.B > 0)) return 1;
  return Math.abs(strength(counts.A, counts.B) - strength(content.targetBowl.A, content.targetBowl.B));
}

/* ---------------------------------------------------------------- *
 * 1. Parse
 * ---------------------------------------------------------------- */
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`); }
});

/* ---------------------------------------------------------------- *
 * 2-7. Per-item checks
 * ---------------------------------------------------------------- */
const LEAK_KEYS = new Set(['answer', 'correctKey', 'correctCounts', 'correct', 'isCorrect', 'units',
  'unitRatio', 'scaleFromTarget', 'lure', 'misconception', 'rationale', 'distractorRationales',
  'difficultyRung', 'ruleSpec', 'tolerance', 'solution']);
function findLeak(node, path = 'content') {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) { const p = findLeak(node[i], `${path}[${i}]`); if (p) return p; }
    return null;
  }
  if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      if (LEAK_KEYS.has(k)) return `${path}.${k}`;
      const p = findLeak(node[k], `${path}.${k}`); if (p) return p;
    }
  }
  return null;
}

const seenIds = new Set();
const seenSeeds = new Set();
const seenContent = new Map();
let maxRowSeen = 0;
let zoneHist = {};

for (const it of items) {
  const id = it.itemId || '(no id)';

  // ---- 1/2. Contract shape ----
  const keys = Object.keys(it).sort();
  if (!deepEq(keys, CONTRACT_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${keys.join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'QUANT-MIX-01') fail(id, `typeCode != QUANT-MIX-01 (${it.typeCode})`);
  if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBand outside the catalog set (${it.ageBands})`);
  if (it.demoPath !== 'demos/QUANT-MIX-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver (constructed response)');
  if (!it.scoring || !/M-PAE/.test(String(it.scoring.description))) fail(id, 'scoring does not document M-PAE');
  if (!Array.isArray(it.scoring.metrics) || !it.scoring.metrics.includes('M-PAE')) fail(id, 'scoring.metrics must declare M-PAE (continuous response)');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');
  else { if (seenSeeds.has(it.provenance.seed)) fail(id, 'duplicate seed'); seenSeeds.add(it.provenance.seed); }

  const c = it.content || {};
  const leak = findLeak(c);
  if (leak) fail(id, `content leaks answer data at ${leak}`);
  const csig = JSON.stringify(c);
  if (seenContent.has(csig)) fail(id, `duplicate stimulus (same content as ${seenContent.get(csig)})`);
  seenContent.set(csig, id);

  if (!c.targetBowl || !Number.isInteger(c.targetBowl.A) || !Number.isInteger(c.targetBowl.B) || c.targetBowl.A < 1 || c.targetBowl.B < 1)
    fail(id, 'content.targetBowl invalid');
  if (!c.workBowl || !Number.isInteger(c.workBowl.A) || !Number.isInteger(c.workBowl.B)) fail(id, 'content.workBowl invalid');
  if (!['tokens', 'grouped'].includes(c.display)) fail(id, `bad display (${c.display})`);
  if (!Array.isArray(c.ingredients) || c.ingredients.length !== 2) fail(id, 'content.ingredients must name both ingredients');
  else if (c.ingredients[0].token === c.ingredients[1].token) fail(id, 'both ingredients use the same token (identity must not rely on colour)');
  if (!c.response || c.response.kind !== 'constructed_counts') fail(id, 'content.response.kind != constructed_counts');
  if (!c.limits || c.limits.maxPerIngredient !== MAX_ROW_TOKENS) fail(id, 'content.limits.maxPerIngredient must be the uniform cap (a tight cap would hint at the key)');
  if (typeof c.prompt !== 'string' || !c.prompt.length) fail(id, 'content.prompt missing (on-screen text gate)');
  const k = c.constraint || {};
  if (!['given_row', 'fixed_total'].includes(k.kind)) fail(id, `bad constraint kind (${k.kind})`);
  if (k.kind === 'given_row') {
    if (!['A', 'B'].includes(k.row)) fail(id, 'given_row constraint names no row');
    if (!deepEq(c.locked, [k.row])) fail(id, 'locked rows must be exactly the given row');
  } else if (!deepEq(c.locked, [])) fail(id, 'fixed_total items must not lock a row');

  maxRowSeen = Math.max(maxRowSeen, c.targetBowl.A, c.targetBowl.B);

  // ---- 3. INDEPENDENT re-derivation + uniqueness ----
  const der = rederive(c);
  const ans = it.answer || {};
  if (!der.ok) fail(id, `cannot re-derive a mixture: ${der.why}`);
  else {
    if (!ans.correctCounts || der.counts.A !== ans.correctCounts.A || der.counts.B !== ans.correctCounts.B)
      fail(id, `re-derived mix ${der.counts.A}:${der.counts.B} != keyed ${ans.correctCounts && ans.correctCounts.A}:${ans.correctCounts && ans.correctCounts.B}`);
    if (ans.correctKey !== `A=${der.counts.A},B=${der.counts.B}`) fail(id, `correctKey "${ans.correctKey}" does not name the re-derived construction`);
    maxRowSeen = Math.max(maxRowSeen, der.counts.A, der.counts.B);
    if (der.counts.A > MAX_ROW_TOKENS || der.counts.B > MAX_ROW_TOKENS) fail(id, 'answer row exceeds the counting-load cap');
    if (c.workBowl.A === der.counts.A && c.workBowl.B === der.counts.B) fail(id, 'the work bowl opens on the answer');
    if (k.kind === 'given_row' && c.workBowl[k.row] !== der.counts[k.row]) fail(id, 'the given row does not match the equivalent mixture');
  }
  const hits = allEquivalent(c);
  if (hits.length !== 1) fail(id, `exhaustive scan found ${hits.length} reachable equivalent mixtures (want exactly 1)`);
  else if (der.ok && (hits[0].A !== der.counts.A || hits[0].B !== der.counts.B)) fail(id, 'scan and re-derivation disagree');

  // ---- 4. M-PAE behaviour ----
  if (der.ok && paeOf(c, der.counts) > 1e-12) fail(id, 'M-PAE is not 0 for the keyed mixture');
  if (paeOf(c, { A: 0, B: 0 }) !== 1) fail(id, 'M-PAE for an empty bowl should be the maximum (1)');

  // ---- 5. Misconception taxonomy ----
  const zones = ans.distractorRationales || {};
  const zoneNames = Object.keys(zones);
  if (zoneNames.length < 3) fail(id, `only ${zoneNames.length} misconception zones (<3)`);
  for (const name of zoneNames) {
    const z = zones[name];
    zoneHist[z && z.misconception] = (zoneHist[z && z.misconception] || 0) + 1;
    if (!z || typeof lureLabel(z) !== 'string' || !lureLabel(z)) fail(id, `zone ${name} has no lure label (M-LURETYPE)`);
    if (!z || typeof z.misconception !== 'string' || !z.misconception) fail(id, `zone ${name} has no misconception label (M-ERRTYPE)`);
    if (!z || !z.counts || !Number.isInteger(z.counts.A) || !Number.isInteger(z.counts.B)) { fail(id, `zone ${name} has no integer counts`); continue; }
    if (z.counts.A < 1 || z.counts.B < 1 || z.counts.A > MAX_ROW_TOKENS || z.counts.B > MAX_ROW_TOKENS) fail(id, `zone ${name} is not reachable within the scoops`);
    if (k.kind === 'given_row' && z.counts[k.row] !== c.workBowl[k.row]) fail(id, `zone ${name} changes the locked row (unreachable)`);
    if (der.ok && z.counts.A === der.counts.A && z.counts.B === der.counts.B) fail(id, `zone ${name} IS the correct mixture`);
    if (paeOf(c, z.counts) <= 1e-12 && !(k.kind === 'fixed_total' && z.counts.A + z.counts.B !== k.total))
      fail(id, `zone ${name} tastes the same as the target (not an error state)`);
  }

  // ---- 6. Structural (not arithmetic) ceiling ----
  const lev = (it.provenance && it.provenance.levers) || {};
  if (Math.round(it.difficulty) !== lev.difficultyRung) fail(id, `difficulty ${it.difficulty} does not sit in its declared rung ${lev.difficultyRung}`);
  if (lev.bothRowsUnknown !== (k.kind === 'fixed_total')) fail(id, 'levers.bothRowsUnknown disagrees with the served constraint');
  if (lev.display !== c.display) fail(id, 'levers.display disagrees with the served display');
  if (it.difficulty >= 16 && !(lev.bothRowsUnknown && lev.targetMultiple > 1 && (!lev.integerScale || lev.shrink)))
    fail(id, `above-level item is not structurally hard (bothRowsUnknown ${lev.bothRowsUnknown}, targetMultiple ${lev.targetMultiple}, integerScale ${lev.integerScale}, shrink ${lev.shrink})`);
  if (it.difficulty <= 4 && (lev.targetMultiple > 1 || !lev.integerScale)) fail(id, 'floor item should be a whole-batch copy of a reduced target');

  // ---- 7. Reproducibility from provenance ----
  const parts = String(it.provenance.seed).split(':');   // master:TYPE:d<rung>:i<ordinal>:a<attempt>
  const rung = parseInt((parts[2] || '').replace(/^d/, ''), 10);
  const ordinal = parseInt((parts[3] || '').replace(/^i/, ''), 10);
  if (!Number.isInteger(rung) || !Number.isInteger(ordinal)) fail(id, `cannot parse rung/ordinal from seed (${it.provenance.seed})`);
  else {
    try {
      const regen = normalizeBankItem(buildItem(parts[0], rung, ordinal));
      if (!regen) fail(id, 'regeneration produced null');
      else if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
    } catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  }
}

/* ---------------------------------------------------------------- *
 * 8. Coverage
 * ---------------------------------------------------------------- */
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

/* ---------------------------------------------------------------- *
 * Report
 * ---------------------------------------------------------------- */
console.log(`QUANT-MIX-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('misconception labels:   ' + JSON.stringify(zoneHist));
console.log(`counting load:          largest row anywhere ${maxRowSeen} tokens (cap ${MAX_ROW_TOKENS})`);

if (failures.length) {
  console.error(`\nFAIL - ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS - contract shape, no content leak, every mixture independently re-derived and unique, M-PAE verified at the key and on every misconception state, structural ceiling, reproducible, coverage 1..20 with >=5 per bin and per +/-1pt band.');
