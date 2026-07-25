// Independent validator for the GB-WORDFORGE-01 structured bank.
//
// This file deliberately does NOT import anything from GB-WORDFORGE-01.mjs. It reads only the
// emitted JSONL and the lexicon data file, then re-enumerates from scratch, for every item,
// the set of lexicon words forgeable from the rack, and asserts the stored answer set is
// EXACTLY that set — no missing word (which would silently penalise a correct child) and no
// extra word (which would credit a string the server's own solver would reject).
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a well-formed BankItem (BUILD_PLAN §2 key set + flags).
//   2. SOLVABILITY: every rack affords at least minWordLength-satisfying words, and enough of
//      them for the item to be a fluency measure rather than a coin flip.
//   3. KEY: the stored validWords set is exactly the independently derived set, in order, with
//      matching vocabulary bands, and every word really is a sub-multiset of the rack.
//   4. The accepted-equivalence rule is present and names the lexicon the solver must use.
//   5. LEAK: `content` carries no word list, no answer set and no lexicon, so the renderer
//      cannot decide locally whether a submitted string is a word.
//   6. Reading gate (D-017): K-1 racks are small and afford plenty of band >= 6 words.
//   7. Density: difficulty spans 1..20 with >= 5 items in every integer bucket 1..19 (and in
//      every +/-1 pt band), per BUILD_PLAN §0.
//
// Run:  node research/exam-question-types/generators/check-GB-WORDFORGE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEXICON_ID, ENTRIES, bandOf, lexiconHash } from './lexicon-child-en.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-WORDFORGE-01.jsonl');
const TYPE_CODE = 'GB-WORDFORGE-01';
const DOMAIN = 'verbal';
const ALLOWED_BANDS = ['K-1', '2-3', '4-5', '6-8'];
const MIN_PER_BUCKET = 5;
const MIN_FORGEABLE = 5;      // below this the fluency count stops being a continuous signal
const K1_MIN_COMMON_WORDS = 6;
const K1_MAX_RACK = 6;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const round2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------------------
// Our own rack enumeration (independent of the generator).
// ---------------------------------------------------------------------------
function counts(letters) {
  const m = new Map();
  for (const ch of letters) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}
function forgeable(word, rackCounts) {
  const need = counts(word);
  for (const [ch, n] of need) if ((rackCounts.get(ch) || 0) < n) return false;
  return true;
}
/** Every lexicon word of length >= minLen spellable from `rack`. Sorted by length then A-Z. */
function deriveValidSet(rack, minLen) {
  const rc = counts(rack);
  const out = [];
  for (const [w, band] of ENTRIES) {
    if (w.length < minLen || w.length > rack.length) continue;
    if (forgeable(w, rc)) out.push({ word: w, length: w.length, band });
  }
  out.sort((a, b) => (a.length - b.length) || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
  return out;
}

// ---------------------------------------------------------------------------
// 1. Parse.
// ---------------------------------------------------------------------------
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (lines.length === 0) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1} is not valid JSON: ${e.message}`); }
});

const REQUIRED_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const LEXICON_LEAK_KEYS = ['lexicon', 'words', 'wordList', 'validWords', 'dictionary',
  'answer', 'solution', 'key', 'optimalCount', 'referenceTarget', 'seedWord'];

// ---------------------------------------------------------------------------
// 2-6. Per-item checks.
// ---------------------------------------------------------------------------
const seenIds = new Set();
const seenRacks = new Set();
let exactKeys = 0;
let forgeableOk = 0;

for (const it of items) {
  const id = (it && it.itemId) || '(no id)';

  for (const k of REQUIRED_KEYS) if (!(k in it)) fail(id, `missing required key "${k}"`);
  const extra = Object.keys(it).filter((k) => !REQUIRED_KEYS.includes(k));
  if (extra.length) fail(id, `unexpected top-level key(s): ${extra.join(', ')}`);

  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== TYPE_CODE) fail(id, `typeCode != ${TYPE_CODE}`);
  if (it.domain !== DOMAIN) fail(id, `domain != ${DOMAIN}`);
  if (it.demoPath !== `demos/${TYPE_CODE}.html`) fail(id, `demoPath is ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty ${it.difficulty} not a float in 1..20`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `bad ageBand ${JSON.stringify(it.ageBands)}`);

  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'grammar') fail(id, 'provenance.generator != grammar');
  if (!it.provenance || typeof it.provenance.seed !== 'string' || !it.provenance.seed) fail(id, 'provenance.seed missing');
  if (!it.provenance || it.provenance.lexiconHash !== lexiconHash()) {
    fail(id, `provenance.lexiconHash ${it.provenance && it.provenance.lexiconHash} != current ${lexiconHash()} — bank is stale, regenerate`);
  }
  if (!it.provenance || it.provenance.lexiconId !== LEXICON_ID) fail(id, 'provenance.lexiconId mismatch');

  const c = it.content || {};
  const a = it.answer || {};

  // ---- 5. leak screen ----
  for (const k of LEXICON_LEAK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(c, k)) fail(id, `content leaks "${k}" — a renderer could judge validity locally`);
  }
  const contentBlob = JSON.stringify(c);
  for (const v of a.validWords || []) {
    if (contentBlob.includes(`"${v.word}"`)) fail(id, `content mentions the answer word ${v.word}`);
  }
  if (it.provenance && it.provenance.seedWord && contentBlob.includes(it.provenance.seedWord)) {
    fail(id, `content spells out the seed word ${it.provenance.seedWord}`);
  }

  // ---- content shape ----
  if (!Array.isArray(c.rack) || c.rack.length < 4 || c.rack.length > 8
    || !c.rack.every((t) => typeof t === 'string' && /^[A-Z]$/.test(t))) {
    fail(id, 'content.rack must be 4..8 single uppercase letters');
    continue;
  }
  if (c.rackSize !== c.rack.length) fail(id, 'content.rackSize disagrees with content.rack');
  if (c.presentation !== 'word') fail(id, 'content.presentation must be "word" (D-017: text only, never audio)');
  if (![3, 4, 5].includes(c.minWordLength)) fail(id, `content.minWordLength ${c.minWordLength} not 3/4/5`);
  if (!isNum(c.timeBudgetSec) || c.timeBudgetSec < 20 || c.timeBudgetSec > 120) fail(id, `content.timeBudgetSec ${c.timeBudgetSec} out of 20..120`);
  if (c.tileReuseWithinWord !== false) fail(id, 'content.tileReuseWithinWord must be false (the answer set is a sub-multiset enumeration)');

  const rk = c.rack.slice().sort().join('');
  if (seenRacks.has(rk)) fail(id, `duplicate rack ${rk}`);
  seenRacks.add(rk);

  // The rack must not display a forgeable word spelled straight across.
  const spelled = c.rack.join('');
  if ((a.validWords || []).some((v) => v.word === spelled)) fail(id, `the rack spells the answer word ${spelled} in display order`);

  // ---- 3. the stored key IS the derivable set ----
  const derived = deriveValidSet(c.rack, c.minWordLength);
  const stored = a.validWords || [];
  const dWords = derived.map((v) => v.word);
  const sWords = stored.map((v) => v.word);
  const missing = dWords.filter((w) => !sWords.includes(w));
  const surplus = sWords.filter((w) => !dWords.includes(w));
  if (missing.length) fail(id, `answer set is MISSING ${missing.length} forgeable word(s): ${missing.slice(0, 6).join(', ')}`);
  if (surplus.length) fail(id, `answer set has ${surplus.length} word(s) NOT forgeable from the rack: ${surplus.slice(0, 6).join(', ')}`);
  if (new Set(sWords).size !== sWords.length) fail(id, 'answer set contains duplicates');
  if (!missing.length && !surplus.length) exactKeys++;

  for (const v of stored) {
    if (bandOf(v.word) !== v.band) fail(id, `"${v.word}" band ${v.band} disagrees with the lexicon (${bandOf(v.word)})`);
    if (v.length !== v.word.length) fail(id, `"${v.word}" length field is wrong`);
    if (v.length < c.minWordLength) fail(id, `"${v.word}" is shorter than minWordLength`);
  }

  if (a.correctKey !== String(derived.length)) fail(id, `answer.correctKey "${a.correctKey}" != derived count ${derived.length}`);
  if (a.optimalCount !== derived.length) fail(id, `answer.optimalCount ${a.optimalCount} != derived count ${derived.length}`);
  const dBands = derived.map((v) => v.band);
  if (dBands.length && a.rarestBand !== Math.min(...dBands)) fail(id, 'answer.rarestBand disagrees with the derived set (M-VOCABLVL would be wrong)');
  if (dBands.length && a.longestLength !== Math.max(...derived.map((v) => v.length))) fail(id, 'answer.longestLength disagrees with the derived set');
  if (!isNum(a.referenceTarget) || a.referenceTarget < 1 || a.referenceTarget > derived.length) {
    fail(id, `answer.referenceTarget ${a.referenceTarget} is not a reachable M-EFF denominator (set size ${derived.length})`);
  }

  // ---- 2. the rack is a usable fluency task ----
  if (derived.length < MIN_FORGEABLE) fail(id, `rack affords only ${derived.length} word(s) (< ${MIN_FORGEABLE}) — too thin for M-IDEAFLU`);
  else forgeableOk++;

  // ---- 4. accepted-equivalence rule ----
  if (!a.equivalence || a.equivalence.rule !== 'any_word_in_valid_set') {
    fail(id, 'answer.equivalence.rule must be any_word_in_valid_set (every forgeable word must be credited)');
  }
  if (!a.equivalence || a.equivalence.lexiconHash !== lexiconHash()) fail(id, 'answer.equivalence.lexiconHash is stale');
  if (!a.equivalence || a.equivalence.minWordLength !== c.minWordLength) fail(id, 'answer.equivalence.minWordLength disagrees with content');
  if (!a.equivalence || a.equivalence.rackMultiset.slice().sort().join('') !== rk) fail(id, 'answer.equivalence.rackMultiset disagrees with content.rack');
  if (!Object.keys(a.distractorRationales || {}).includes('valid_word')) {
    fail(id, 'answer.distractorRationales must document the response taxonomy');
  }

  // ---- 6. reading gate (D-017) ----
  if (it.ageBands.includes('K-1')) {
    if (c.rack.length > K1_MAX_RACK) fail(id, `K-1 reading gate: ${c.rack.length}-tile rack`);
    const common = derived.filter((v) => v.band >= 6).length;
    if (common < K1_MIN_COMMON_WORDS) fail(id, `K-1 reading gate: only ${common} band>=6 words available (need >= ${K1_MIN_COMMON_WORDS})`);
  }
}

// ---------------------------------------------------------------------------
// 7. Difficulty density.
// ---------------------------------------------------------------------------
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5 (ramp does not reach the floor)`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5 (ramp does not reach the ceiling)`);

const binCounts = Array.from({ length: 20 }, () => 0);
const bandCounts = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) binCounts[k - 1]++;
  for (let kk = 1; kk <= 20; kk++) if (Math.abs(d - kk) <= 1.0) bandCounts[kk - 1]++;
}
for (let k = 1; k <= 19; k++) {
  if (binCounts[k - 1] < MIN_PER_BUCKET) fail('coverage', `integer bucket ${k} has ${binCounts[k - 1]} items (< ${MIN_PER_BUCKET})`);
  if (bandCounts[k - 1] < MIN_PER_BUCKET) fail('coverage', `+/-1pt band around ${k} has ${bandCounts[k - 1]} items (< ${MIN_PER_BUCKET})`);
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const setSizes = items.map((it) => (it.answer && it.answer.optimalCount)).filter(isNum);
console.log(`${TYPE_CODE} bank check: ${items.length} items`);
console.log(`lexicon: ${LEXICON_ID} hash=${lexiconHash()}`);
console.log(`answer set re-derived EXACTLY (no missing, no surplus): ${exactKeys}/${items.length} = ${items.length ? round2(100 * exactKeys / items.length) : 0}%`);
console.log(`racks affording >= ${MIN_FORGEABLE} words (solvable as a fluency task): ${forgeableOk}/${items.length}`);
console.log(`forgeable words per rack: ${Math.min(...setSizes)}..${Math.max(...setSizes)}`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n): ' + binCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log('per +/-1pt band  (k:n): ' + bandCounts.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bucket density (1..19): ${Math.min(...binCounts.slice(0, 19))}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — every answer set is exactly the rack-derivable set, every rack is forgeable, no word list reachable from content, reading gate held, >=5 items per integer bucket 1..19.');
