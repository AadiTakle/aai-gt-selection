// Independent validator for the QUANT-EQUAL-01 structured bank.
//
// The point of this file is DISTRUST: it re-derives every answer key from the
// served `content` with its own implementation of the equivalence math and never
// reads `answer.correctKey` until it has an answer of its own. It also refuses a
// bank whose top band is hard only because the numbers got bigger.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every row carries exactly the BankItem keys (BUILD_PLAN §2).
//   2. Term lists are well formed and renderable; served content leaks no answer.
//   3. INDEPENDENT KEY: solve each side as (m*x + c) from scratch, require the
//      unknown to be uniquely pinned (mLeft != mRight), require an integer key,
//      require exactly one option to carry it, and require that option to be the
//      declared correctKey.
//   4. Every distractor value is re-derived to be a genuinely wrong quantity
//      (both sides do NOT balance) and carries a lure + misconception label.
//   5. Construct guard: rungs 16+ are structurally hard (repeated groups and/or
//      the same unknown on both sides) and keep every visible quantity small, so
//      the ceiling measures equivalence reasoning rather than arithmetic load.
//   6. Item is reproducible from its provenance seed (grammar has not drifted).
//   7. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-QUANT-EQUAL-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem } from './QUANT-EQUAL-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-EQUAL-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];          // master_types.jsonl QUANT-EQUAL-01
const ALLOWED_DISPLAYS = ['dots', 'dots_bar', 'numeral_bar', 'numeral'];
const ALLOWED_LURES = [
  'operational_total_all', 'operational_answer_after_equals', 'side_confusion',
  'inverse_operation', 'group_structure', 'partial_structure', 'surface_match', 'near_order',
];
const BANK_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const MIN_PER_BAND = 5;
const CEILING_VALUE_CAP = 20;   // no visible quantity above this in the top band

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---------------------------------------------------------------- *
 * INDEPENDENT equivalence math (deliberately re-implemented here).
 * A side is a list of signed, optionally repeated terms, so it is an
 * affine function of the unknown: value(side) = slope*x + offset.
 * ---------------------------------------------------------------- */
function affine(side) {
  let slope = 0, offset = 0;
  for (const t of side) {
    const sign = t.op === '-' ? -1 : 1;
    const reps = t.times === undefined ? 1 : t.times;
    if (t.kind === 'slot') slope += sign * reps;
    else offset += sign * reps * t.value;
  }
  return { slope, offset };
}
function evaluate(side, x) { const a = affine(side); return a.slope * x + a.offset; }
/** Returns {ok, x, reason}: the unknown that balances the two sides, or why not. */
function solveIndependently(left, right) {
  const L = affine(left), R = affine(right);
  const denom = L.slope - R.slope;
  if (denom === 0) return { ok: false, reason: 'the unknown cancels: no unique balancing quantity' };
  const numer = R.offset - L.offset;
  if (numer % denom !== 0) return { ok: false, reason: `balancing quantity ${numer}/${denom} is not a whole tile` };
  return { ok: true, x: numer / denom };
}

/* ---- 1. Parse ---- */
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');

const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`); }
});

/* ---- 2..6. Per-item checks ---- */
const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  // --- contract shape ---
  const keys = Object.keys(it).sort();
  if (!deepEq(keys, BANK_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${keys.join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(it.itemId))
    fail(id, 'itemId is not a uuid v4');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'QUANT-EQUAL-01') fail(id, `typeCode != QUANT-EQUAL-01 (${it.typeCode})`);
  if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBand outside the type spec (${it.ageBands})`);
  if (it.demoPath !== 'demos/QUANT-EQUAL-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  if (!ALLOWED_DISPLAYS.includes(c.display)) fail(id, `bad display (${c.display})`);
  if (!['canonical', 'non_canonical'].includes(c.layout)) fail(id, `bad layout (${c.layout})`);
  if (typeof c.prompt !== 'string' || c.prompt.length < 8) fail(id, 'content.prompt missing (reading gate D-017)');

  // --- term lists renderable ---
  const sides = [c.left, c.right];
  if (!sides.every((s) => Array.isArray(s) && s.length >= 1)) { fail(id, 'left/right term lists malformed'); continue; }
  let slotTotal = 0, maxVisible = 0, maxReps = 1;
  for (const side of sides) {
    for (const t of side) {
      if (!['num', 'slot'].includes(t.kind)) fail(id, `bad term kind (${t.kind})`);
      if (!['+', '-'].includes(t.op)) fail(id, `bad term op (${t.op})`);
      const reps = t.times === undefined ? 1 : t.times;
      if (!Number.isInteger(reps) || reps < 1 || reps > 4) fail(id, `bad term times (${t.times})`);
      maxReps = Math.max(maxReps, reps);
      if (t.kind === 'slot') {
        slotTotal += reps;
        if (t.value !== undefined) fail(id, 'slot term carries a value (answer leak)');
      } else {
        if (!Number.isInteger(t.value) || t.value < 1) fail(id, `bad term value (${t.value})`);
        maxVisible = Math.max(maxVisible, t.value);
      }
    }
  }
  if (slotTotal < 1) fail(id, 'no slot to fill');
  if (c.slotCount !== slotTotal) fail(id, `content.slotCount ${c.slotCount} != actual ${slotTotal}`);
  const declaredSide = c.left.some((t) => t.kind === 'slot')
    ? (c.right.some((t) => t.kind === 'slot') ? 'both' : 'left') : 'right';
  if (c.slotSide !== declaredSide) fail(id, `content.slotSide ${c.slotSide} != actual ${declaredSide}`);

  // --- served-subset safety: nothing in content may reveal the key ---
  const contentJson = JSON.stringify(c);
  for (const leak of ['correctKey', 'lure', 'misconception', 'answer', 'isCorrect', 'correct', 'solution', 'rationale'])
    if (contentJson.includes(`"${leak}"`)) fail(id, `content leaks answer field "${leak}"`);
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length < 4 || opts.length > 6) fail(id, `options count out of 4..6 (${opts.length})`);
  for (const o of opts) {
    if (!o || typeof o.key !== 'string') fail(id, 'option missing key');
    if (!Number.isInteger(o.value) || o.value < 1) fail(id, `option value not a positive whole tile (${o && o.value})`);
    if (Object.keys(o).length !== 2) fail(id, `option carries extra fields (${Object.keys(o).join(',')})`);
  }
  const optKeys = opts.map((o) => o.key);
  if (new Set(optKeys).size !== optKeys.length) fail(id, 'option keys not unique');
  if (new Set(opts.map((o) => o.value)).size !== opts.length) fail(id, 'duplicate option values');

  // --- 3. INDEPENDENT KEY DERIVATION (does not read answer.correctKey first) ---
  const solved = solveIndependently(c.left, c.right);
  if (!solved.ok) { fail(id, `no independently derivable key: ${solved.reason}`); continue; }
  const derivedX = solved.x;
  if (derivedX < 1) fail(id, `derived key ${derivedX} is not a placeable quantity`);
  if (evaluate(c.left, derivedX) !== evaluate(c.right, derivedX)) fail(id, 'derived key does not balance the sides');
  const carriers = opts.filter((o) => o.value === derivedX);
  if (carriers.length !== 1) { fail(id, `${carriers.length} options carry the derived key ${derivedX} (want exactly 1)`); continue; }
  if (carriers[0].key !== it.answer.correctKey)
    fail(id, `independent key is option ${carriers[0].key} (=${derivedX}) but the bank declares ${it.answer.correctKey}`);

  // --- 4. distractors are wrong, labelled, and complete ---
  const rats = it.answer.distractorRationales || {};
  const wrongKeys = optKeys.filter((k) => k !== it.answer.correctKey);
  if (Object.keys(rats).length !== wrongKeys.length) fail(id, `rationale count ${Object.keys(rats).length} != distractor count ${wrongKeys.length}`);
  for (const k of wrongKeys) {
    const r = rats[k];
    if (!r) { fail(id, `missing rationale for ${k}`); continue; }
    if (!ALLOWED_LURES.includes(lureLabel(r))) fail(id, `unknown lure "${lureLabel(r)}" on ${k}`);
    if (typeof r.misconception !== 'string' || !r.misconception) fail(id, `rationale ${k} missing misconception`);
    const v = opts.find((o) => o.key === k).value;
    if (evaluate(c.left, v) === evaluate(c.right, v)) fail(id, `distractor ${k} (=${v}) actually balances the equation`);
  }
  if (rats[it.answer.correctKey]) fail(id, 'the correct key must not carry a distractor rationale');

  // --- 5. construct guard: the ceiling must be structural, not arithmetical ---
  const rung = it.provenance.levers && it.provenance.levers.difficultyRung;
  if (rung >= 16) {
    if (!(slotTotal > 1 || maxReps > 1)) fail(id, `rung ${rung} has no repeated group and no shared unknown (not structurally hard)`);
    if (maxVisible > CEILING_VALUE_CAP) fail(id, `rung ${rung} leans on arithmetic load (visible quantity ${maxVisible} > ${CEILING_VALUE_CAP})`);
    if (derivedX > CEILING_VALUE_CAP) fail(id, `rung ${rung} key ${derivedX} exceeds the small-number ceiling`);
  }
  if (rung <= 4 && (c.display !== 'dots' || maxVisible > 12)) fail(id, `rung ${rung} floor item is not concrete/countable (display ${c.display}, max ${maxVisible})`);
  if (rung >= 3 && c.layout !== 'non_canonical') fail(id, `rung ${rung} should use a non-canonical layout (McNeil & Alibali)`);

  // --- 6. reproducibility from provenance ---
  const parts = it.provenance.seed.split(':');   // masterSeed:TYPE:d<rung>:i<ordinal>:a<attempt>
  const masterSeed = parts[0];
  const seedRung = parseInt((parts[2] || '').replace(/^d/, ''), 10);
  const ordinal = parseInt((parts[3] || '').replace(/^i/, ''), 10);
  if (!Number.isInteger(seedRung) || !Number.isInteger(ordinal)) fail(id, `cannot parse rung/ordinal from seed (${it.provenance.seed})`);
  else {
    try {
      const regen = normalizeBankItem(buildItem(masterSeed, seedRung, ordinal));
      if (!regen) fail(id, 'regeneration produced null');
      else if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from its provenance (grammar drift)');
    } catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  }
}

/* ---- 7. Coverage ---- */
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
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

// A gradual ramp needs the whole structural repertoire, not one family repeated.
const families = new Set(items.map((it) => it.provenance.structureFamily));
if (families.size < 12) fail('coverage', `only ${families.size} structure families in the bank (want >=12)`);
const lureKinds = new Set();
for (const it of items) for (const r of Object.values(it.answer.distractorRationales)) lureKinds.add(lureLabel(r));
if (lureKinds.size < 5) fail('coverage', `only ${lureKinds.size} lure kinds across the bank (M-ERRTYPE needs breadth)`);

/* ---- Report ---- */
console.log(`QUANT-EQUAL-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`structure families: ${families.size} · lure kinds: ${lureKinds.size}`);
console.log(`min density: integer bin ${Math.min(...binCounts)} · +/-1pt band ${Math.min(...bandCounts)}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — every key re-derived independently from served content, distractors verified wrong and labelled, ceiling is structural not arithmetical, items reproducible, coverage 1..20 with >=5 per bin and per +/-1pt band.');
