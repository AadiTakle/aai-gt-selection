// Independent validator for the WM-bubble-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem with EXACTLY the
//      contract key set (BUILD_PLAN §2).
//   2. Served-subset safety: nothing in `content` names or exposes the key
//      (deep scan for answer-ish field names).
//   3. Single-satisfiability: the required response at every step is re-derived
//      from `content` alone (stream + n) and must match the recorded key exactly —
//      no step may be ambiguous, and every declared lure label must be the label
//      this validator independently computes.
//   4. Band density: >=5 items per integer difficulty bucket 1..19, span 1..20.
//   5. Reproducibility: regenerating from provenance.levers deep-equals the item.
//   6. D-017: no audio anywhere in the item.
//
// Run:  node research/exam-question-types/generators/check-WM-bubble-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildItem, targetsOf, LURE_CLASSES, BAND_LEVERS } from './WM-bubble-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/WM-bubble-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // catalog age_bands for WM-bubble-01 (no K-1)
const MIN_PER_BUCKET = 5;
const CONTRACT_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const LEAK_NAMES = /^(answer|answers|correct|correctkey|iscorrect|key|keys|target|targets|istarget|lure|lures|rationale|rationales|distractorrationales|solution|solver)$/i;
const AUDIO_NAMES = /(\baudio|\bspeech|\bspeak|\butterance|\btts\b|\bsound\b|\bchime|\btones?\b|\bnarrat|\bvoice|\blisten)/i;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1}: ${e.message}`); }
});

// Deep scan helper: walks any value, reporting (path, key, stringValue).
function walk(node, path, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, visit)); return; }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) { visit(k, v, `${path}.${k}`); walk(v, `${path}.${k}`, visit); }
    return;
  }
}

// Independent re-implementation of the lure taxonomy (deliberately written from the
// definition, not imported, so a generator bug cannot validate itself).
function labelAt(stream, n, i) {
  if (i < n) return 'lead-in-no-target';
  if (stream[i] === stream[i - n]) return 'correct';
  if (n >= 2 && stream[i] === stream[i - n + 1]) return 'lure-n-minus-1';
  if (i - n - 1 >= 0 && stream[i] === stream[i - n - 1]) return 'lure-n-plus-1';
  return stream.slice(0, i).includes(stream[i]) ? 'familiar-but-off-position' : 'novel-foil';
}
function parseKey(key) {
  const out = {};
  for (const part of String(key).split('|')) {
    const [id, list] = part.split(':');
    out[id] = list && list.length ? list.split(',').map(Number) : [];
  }
  return out;
}

const seenIds = new Set();
for (const it of items) {
  const id = it.itemId || '(no id)';

  // ---- contract shape ----
  const keys = Object.keys(it).sort();
  if (!deepEq(keys, CONTRACT_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${keys.join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'WM-bubble-01') fail(id, `typeCode != WM-bubble-01 (${it.typeCode})`);
  if (it.domain !== 'verbal') fail(id, `domain != verbal (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBand outside catalog spec (${it.ageBands})  [D-017: no K-1]`);
  if (it.demoPath !== 'demos/WM-bubble-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (typeof (it.provenance || {}).seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};

  // ---- 2. served-subset safety: no answer data reachable from content ----
  walk(c, 'content', (k, v, path) => {
    if (LEAK_NAMES.test(k)) fail(id, `content leaks an answer-shaped field at ${path}`);
  });
  if (JSON.stringify(c).includes(String(it.answer.correctKey))) fail(id, 'content embeds the literal correctKey');

  // ---- 6. D-017: no audio ----
  walk(it, 'item', (k, v, path) => {
    if (AUDIO_NAMES.test(k)) fail(id, `audio-shaped field at ${path} (D-017 prohibits audio)`);
    if (typeof v === 'string' && AUDIO_NAMES.test(v) && !/no_audio|never audio|prohibit|printed/i.test(v)) {
      fail(id, `audio-shaped value at ${path}: "${v}"`);
    }
  });
  if (c.presentation !== 'text') fail(id, `content.presentation must be 'text' (${c.presentation})`);

  // ---- 3. single-satisfiability, re-derived from content alone ----
  if (!isNum(c.n) || c.n < 1) { fail(id, 'content.n missing'); continue; }
  if (!Array.isArray(c.channels) || !c.channels.length) { fail(id, 'content.channels missing'); continue; }
  if (c.leadInSteps !== c.n) fail(id, 'content.leadInSteps must equal n');
  if (!isNum(c.paceMs) || c.paceMs < 800) fail(id, `pace too fast / missing (${c.paceMs})`);
  if (!isNum(c.vocabularyLevel) || c.vocabularyLevel < 1 || c.vocabularyLevel > 7) fail(id, 'content.vocabularyLevel missing (M-VOCABLVL not derivable)');

  const declared = parseKey(it.answer.correctKey);
  if (Object.keys(declared).length !== c.channels.length) fail(id, 'correctKey does not cover every channel');
  const rats = it.answer.distractorRationales || {};
  let ratKeyCount = 0;

  for (const ch of c.channels) {
    if (!Array.isArray(ch.stream) || ch.stream.length !== c.streamLength) { fail(id, `channel ${ch.id}: stream length != content.streamLength`); continue; }
    if (ch.stream.some((s) => typeof s !== 'string' || !s.length)) fail(id, `channel ${ch.id}: non-string stimulus`);

    const derivedTargets = targetsOf(ch.stream, c.n);
    if (!deepEq(derivedTargets, declared[ch.id] || [])) {
      fail(id, `channel ${ch.id}: key ${JSON.stringify(declared[ch.id])} != targets re-derived from the stream ${JSON.stringify(derivedTargets)}`);
    }
    if (derivedTargets.length < 2) fail(id, `channel ${ch.id}: fewer than 2 targets — block carries no signal`);
    const decidable = ch.stream.length - c.n;
    const rate = derivedTargets.length / decidable;
    if (rate < 0.18 || rate > 0.42) fail(id, `channel ${ch.id}: target rate ${rate.toFixed(2)} outside 0.18..0.42`);

    // Every step gets exactly one independently-computed label, and the recorded
    // label must agree. This is the n-back form of "exactly one option satisfies":
    // at each step POP-vs-hold is uniquely determined by the stream and n.
    ch.stream.forEach((_, i) => {
      const k = `${ch.id}:${i}`;
      const r = rats[k];
      ratKeyCount++;
      if (!r) { fail(id, `missing lure label for step ${k} (M-LURETYPE incomplete)`); return; }
      if (!LURE_CLASSES.has(r.lure)) fail(id, `step ${k}: unknown lure class "${r.lure}"`);
      const expect = labelAt(ch.stream, c.n, i);
      if (r.lure !== expect) fail(id, `step ${k}: label "${r.lure}" != independently derived "${expect}"`);
      if (r.lure === 'correct' && !derivedTargets.includes(i)) fail(id, `step ${k}: labelled correct but is not a target`);
      if (r.lure !== 'correct' && derivedTargets.includes(i)) fail(id, `step ${k}: target not labelled correct`);
    });
    // A lure-free block above band 2 would make false alarms uninterpretable.
    if (it.difficulty >= 3) {
      const lures = ch.stream.filter((_, i) => /^lure-n/.test(labelAt(ch.stream, c.n, i))).length;
      if (lures < 1) fail(id, `channel ${ch.id}: no n+/-1 lures at difficulty ${it.difficulty}`);
    }
  }
  if (Object.keys(rats).length !== ratKeyCount) fail(id, 'distractorRationales contain keys outside the streams');

  // ---- 5. reproducibility ----
  const lev = (it.provenance || {}).levers || {};
  try {
    const regen = buildItem(lev.band, lev.slot);
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from provenance.levers (generator drift)');
  } catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  const bandLev = BAND_LEVERS[lev.band];
  if (!bandLev) fail(id, `unknown band ${lev.band}`);
  else if (bandLev.n !== c.n) fail(id, `content.n != band lever n`);
  else if (Math.round(it.difficulty) !== lev.band) fail(id, `round(difficulty) ${Math.round(it.difficulty)} != band ${lev.band}`);
}

// ---- 4. Coverage ----
const diffs = items.map((i) => i.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5`);
const bins = Array.from({ length: 20 }, () => 0);
for (const d of diffs) { const k = Math.round(d); if (k >= 1 && k <= 20) bins[k - 1]++; }
bins.slice(0, 19).forEach((n, i) => { if (n < MIN_PER_BUCKET) fail('coverage', `integer bucket k=${i + 1} has ${n} items (<${MIN_PER_BUCKET})`); });

console.log(`WM-bubble-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n):  ' + bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bucket density (1..19): ${Math.min(...bins.slice(0, 19))}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — contract keys exact, no answer data in content, every step uniquely');
console.log('       satisfiable and re-derived from the stream, lure labels independently');
console.log('       confirmed, no audio (D-017), coverage 1..20 with >=5 per bucket.');
