// Independent validator for the QUANT-GRAPH-01 structured bank.
//
// The point of this file is DISTRUST: it rebuilds every keyed graph from the
// served story with its own arithmetic (identity / running total / successive
// difference) and never reads `answer.correctKey` until it has a key of its own.
// It also refuses a bank whose upper rungs could be solved by copying the numbers
// straight off the animation, or whose options are drawn on different scales.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every row carries exactly the BankItem keys (BUILD_PLAN §2).
//   2. Story and graph are internally consistent; served content leaks no answer.
//   3. INDEPENDENT KEY: re-derive the target series from content.story +
//      content.question, require exactly one option to carry it, and require that
//      option to be the declared correctKey.
//   4. Every foil differs from the key and from every sibling foil, and carries a
//      named graph misconception.
//   5. Construct guards: one fixed y-scale for all options (no deceptive
//      autoscaling), the key varies over time, and from rung 13 up the key is NOT
//      the animation's own numbers — the child must transform the story.
//   6. Item is reproducible from its provenance seed (grammar has not drifted).
//   7. Difficulty coverage: spans 1..20 with >=5 items per integer bin AND
//      >=5 items per +/-1 pt band (BUILD_PLAN §0).
//
// Run:  node research/exam-question-types/generators/check-QUANT-GRAPH-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem } from './QUANT-GRAPH-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/QUANT-GRAPH-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8'];          // master_types.jsonl QUANT-GRAPH-01
const QUESTIONS = ['amount', 'compare', 'total', 'step'];
const MODES = ['bars', 'line', 'twoline'];
const ALLOWED_LURES = [
  'slope_as_level', 'constant_rate', 'direction_reversal', 'temporal_shift', 'near_height',
  'start_offset', 'rate_as_total', 'amount_as_rate', 'track_swap', 'intersection_error',
];
const BANK_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const MIN_PER_BAND = 5;
const LEVEL_CAP = 12, RATE_CAP = 4;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

/* ---------------------------------------------------------------- *
 * INDEPENDENT story arithmetic (deliberately re-implemented here).
 * ---------------------------------------------------------------- */
function runningTotal(rates) {
  const out = [];
  let carried = 0;
  for (const r of rates) { carried += r; out.push(carried); }
  return out;
}
function perBeatChange(levels) {
  const out = [];
  for (let i = 1; i < levels.length; i++) out.push(levels[i] - levels[i - 1]);
  return out;
}
function keyedSeries(content) {
  const byId = Object.fromEntries(content.story.tracks.map((t) => [t.id, t.values]));
  if (content.question === 'amount') return { A: byId.A.slice() };
  if (content.question === 'compare') return { A: byId.A.slice(), B: byId.B.slice() };
  if (content.question === 'total') return { A: runningTotal(byId.A) };
  if (content.question === 'step') return { A: perBeatChange(byId.A) };
  return null;
}
const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
const sameSeries = (a, b) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) if (!sameList(a[k], b[k])) return false;
  return true;
};

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
  if (it.typeCode !== 'QUANT-GRAPH-01') fail(id, `typeCode != QUANT-GRAPH-01 (${it.typeCode})`);
  if (it.domain !== 'quantitative') fail(id, `domain != quantitative (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float in 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || it.ageBands.length === 0) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBand outside the type spec (${it.ageBands})`);
  if (it.demoPath !== 'demos/QUANT-GRAPH-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, 'scoring.mode != deterministic_key');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  if (!QUESTIONS.includes(c.question)) { fail(id, `bad question (${c.question})`); continue; }
  if (typeof c.prompt !== 'string' || c.prompt.length < 8) fail(id, 'content.prompt missing (reading gate D-017)');

  // --- story ---
  const story = c.story || {};
  const tracks = story.tracks || [];
  if (!Array.isArray(tracks) || tracks.length < 1) { fail(id, 'story has no tracks'); continue; }
  if (story.replayable !== true) fail(id, 'story must be replayable (working memory is not the construct)');
  const wantTracks = c.question === 'compare' ? 2 : 1;
  if (tracks.length !== wantTracks) fail(id, `${tracks.length} story tracks for question ${c.question} (want ${wantTracks})`);
  for (const t of tracks) {
    if (!['amount', 'rate'].includes(t.kind)) fail(id, `bad track kind (${t.kind})`);
    if (!Array.isArray(t.values) || t.values.length !== story.beats) fail(id, `track ${t.id} length != beats (${story.beats})`);
    if (!t.values.every((v) => Number.isInteger(v) && v >= 0)) fail(id, `track ${t.id} has non-whole or negative values`);
    const cap = t.kind === 'rate' ? RATE_CAP : LEVEL_CAP;
    if (t.values.some((v) => v > cap)) fail(id, `track ${t.id} exceeds the ${t.kind} cap (${cap}) — arithmetic load, not graph sense`);
  }
  if (c.question === 'total' && tracks[0].kind !== 'rate') fail(id, 'accumulation item must show rate strips, not a filled tank');
  if (['amount', 'compare', 'step'].includes(c.question) && tracks.some((t) => t.kind !== 'amount'))
    fail(id, `question ${c.question} needs amount tracks`);

  // --- graph frame ---
  const g = c.graph || {};
  if (!MODES.includes(g.mode)) fail(id, `bad graph mode (${g.mode})`);
  if ((g.mode === 'twoline') !== (c.question === 'compare')) fail(id, 'twoline mode must pair with the compare question');
  if (!Number.isInteger(g.yMax) || g.yMax < 2) fail(id, `bad graph.yMax (${g.yMax})`);
  if (!Array.isArray(g.series) || g.series.length !== wantTracks) fail(id, 'graph.series does not match the story tracks');

  // --- served-subset safety ---
  const contentJson = JSON.stringify(c);
  for (const leak of ['correctKey', 'lure', 'misconception', 'answer', 'isCorrect', 'correct', 'solution', 'rationale'])
    if (contentJson.includes(`"${leak}"`)) fail(id, `content leaks answer field "${leak}"`);

  // --- options ---
  const opts = c.options || [];
  if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) fail(id, `options count out of 3..4 (${opts.length})`);
  const optKeys = opts.map((o) => o && o.key);
  if (new Set(optKeys).size !== optKeys.length) fail(id, 'option keys not unique');
  for (const o of opts) {
    if (!o || typeof o.key !== 'string' || !o.series) { fail(id, 'malformed option'); continue; }
    if (Object.keys(o).length !== 2) fail(id, `option carries extra fields (${Object.keys(o).join(',')})`);
    const sKeys = Object.keys(o.series).sort();
    if (!deepEq(sKeys, g.series.slice().sort())) fail(id, `option ${o.key} series keys != graph.series`);
    for (const list of Object.values(o.series)) {
      if (!Array.isArray(list) || list.length !== g.xCount) fail(id, `option ${o.key} series length != graph.xCount`);
      if (!list.every((v) => Number.isInteger(v) && v >= 0)) fail(id, `option ${o.key} has non-whole or negative points`);
      // 5. one fixed scale: every option must be drawable without rescaling.
      if (list.some((v) => v > g.yMax)) fail(id, `option ${o.key} exceeds graph.yMax — options would be drawn on different scales`);
    }
  }

  // --- 3. INDEPENDENT KEY DERIVATION ---
  const derived = keyedSeries(c);
  if (!derived) { fail(id, 'cannot derive a key for this question'); continue; }
  if (derived.A.length !== g.xCount) fail(id, `derived series length ${derived.A.length} != graph.xCount ${g.xCount}`);
  if (derived.A.some((v) => v < 0)) fail(id, 'derived key contains a negative quantity');
  if (new Set(derived.A).size < 2) fail(id, 'derived key is flat — nothing to comprehend');
  const carriers = opts.filter((o) => sameSeries(o.series, derived));
  if (carriers.length !== 1) { fail(id, `${carriers.length} options carry the independently derived series (want exactly 1)`); continue; }
  if (carriers[0].key !== it.answer.correctKey)
    fail(id, `independent key is option ${carriers[0].key} but the bank declares ${it.answer.correctKey}`);

  // --- 4. foils distinct, wrong, and labelled ---
  const rats = it.answer.distractorRationales || {};
  const wrongKeys = optKeys.filter((k) => k !== it.answer.correctKey);
  if (Object.keys(rats).length !== wrongKeys.length) fail(id, `rationale count ${Object.keys(rats).length} != foil count ${wrongKeys.length}`);
  if (rats[it.answer.correctKey]) fail(id, 'the correct key must not carry a distractor rationale');
  for (const k of wrongKeys) {
    const r = rats[k];
    if (!r) { fail(id, `missing rationale for ${k}`); continue; }
    if (!ALLOWED_LURES.includes(r.lure)) fail(id, `unknown lure "${r.lure}" on ${k}`);
    if (typeof r.misconception !== 'string' || !r.misconception) fail(id, `rationale ${k} missing misconception`);
    const foil = opts.find((o) => o.key === k).series;
    if (sameSeries(foil, derived)) fail(id, `foil ${k} is actually the correct graph`);
  }
  for (let i = 0; i < opts.length; i++) {
    for (let j = i + 1; j < opts.length; j++) {
      if (sameSeries(opts[i].series, opts[j].series)) fail(id, `options ${opts[i].key} and ${opts[j].key} draw the same graph`);
    }
  }

  // --- 5. construct guards ---
  const rung = it.provenance.levers && it.provenance.levers.difficultyRung;
  if (rung <= 4 && !(c.question === 'amount' && g.mode === 'bars'))
    fail(id, `rung ${rung} floor item should be direct bar reading (got ${c.question}/${g.mode})`);
  if (rung >= 13 && !['total', 'step'].includes(c.question))
    fail(id, `rung ${rung} should require accumulation or rate-of-change (got ${c.question})`);
  if (rung >= 9 && rung <= 12 && c.question !== 'compare')
    fail(id, `rung ${rung} should require two-quantity covariation (got ${c.question})`);
  if (['total', 'step'].includes(c.question) && sameList(derived.A, tracks[0].values.slice(0, derived.A.length)))
    fail(id, 'key equals the animation numbers: the item can be solved by copying, not transforming');
  if (rung >= 11 && c.question === 'compare') {
    const signs = new Set(derived.A.map((v, i) => Math.sign(v - derived.B[i])).filter((s) => s !== 0));
    if (signs.size < 2) fail(id, `rung ${rung} compare item has no crossing (the intersection is the construct)`);
  }
  if (rung >= 16 && Math.max(...tracks.flatMap((t) => t.values)) > LEVEL_CAP)
    fail(id, `rung ${rung} leans on bigger numbers rather than a deeper relation`);

  // --- 6. reproducibility from provenance ---
  const parts = it.provenance.seed.split(':');   // masterSeed:TYPE:d<rung>:i<ordinal>:a<attempt>
  const masterSeed = parts[0];
  const seedRung = parseInt((parts[2] || '').replace(/^d/, ''), 10);
  const ordinal = parseInt((parts[3] || '').replace(/^i/, ''), 10);
  if (!Number.isInteger(seedRung) || !Number.isInteger(ordinal)) fail(id, `cannot parse rung/ordinal from seed (${it.provenance.seed})`);
  else {
    try {
      const regen = buildItem(masterSeed, seedRung, ordinal);
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

const relations = new Set(items.map((it) => it.content.question));
for (const q of QUESTIONS) if (!relations.has(q)) fail('coverage', `no items ask the "${q}" graph relation`);
const lureKinds = new Set();
for (const it of items) for (const r of Object.values(it.answer.distractorRationales)) lureKinds.add(r.lure);
if (lureKinds.size < 6) fail('coverage', `only ${lureKinds.size} lure kinds across the bank (M-ERRTYPE needs breadth)`);

/* ---- Report ---- */
console.log(`QUANT-GRAPH-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bin (k:n):  ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band (k:n):  ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`graph relations: ${[...relations].join(', ')} · lure kinds: ${lureKinds.size}`);
console.log(`min density: integer bin ${Math.min(...binCounts)} · +/-1pt band ${Math.min(...bandCounts)}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — every key re-derived independently from the served story, foils distinct and labelled, one fixed scale per item, upper rungs require transforming the story, items reproducible, coverage 1..20 with >=5 per bin and per +/-1pt band.');
