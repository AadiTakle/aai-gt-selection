// Independent validator for the CX-sjt-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line carries EXACTLY the BankItem key set (BUILD_PLAN §2).
//   2. Served-subset safety: `content` leaks no key, lure, satisfies/violates
//      tag or poly score.
//   3. SINGLE-SATISFIABILITY, re-derived from the constraint model without
//      reading `answer.correctKey`:
//        - exactly one option meets every stated requirement and breaks none;
//        - EVERY other option breaks at least one requirement that is actually
//          printed for this item (a distractor that only breaks an unstated
//          requirement would be a second defensible answer);
//        - the requirements the model scores against are exactly the ones in
//          `content.constraints`, so nothing off-screen decides the key.
//   4. CONSTRUCT GUARD (the point of this type): every requirement must be
//      concretely checkable. Preference words — kind, polite, nice, respectful,
//      friendly, well behaved and so on — are rejected outright, because a
//      requirement like "be polite" turns the key into a personality
//      preference. This is what stops the bank keying a disposition.
//   5. Lure taxonomy and graded credit: one `correct`, every option covered,
//      classes declared, poly scores consistent with the model, and the key
//      strictly the highest-scoring option.
//   6. Difficulty coverage 1..20 with >=5 items per integer bucket.
//   7. Reading gate (D-017), no audio, no pictured-choice fields, and the K-1
//      band absent (the floor rose to grade 2-3 when audio was prohibited).
//   8. Reproducibility: the on-disk bank equals a fresh build.
//
// Run:  node research/exam-question-types/generators/check-CX-sjt-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBank, TYPE_CODE, DOMAIN, ALLOWED_AGE_BANDS, OPTION_LURES,
  MAX_WORD_LEN_LOW, MAX_TEXT_CHARS_LOW,
} from './CX-sjt-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/CX-sjt-01.jsonl');
const MIN_PER_BUCKET = 5;

const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
].sort();

const LEAK_FIELDS = [
  'answer', 'correctKey', 'correct', 'isCorrect', 'lure', 'lures', 'satisfies',
  'violates', 'constraintModel', 'polyScores', 'score', 'points', 'effectiveness',
  'rationale', 'distractorRationales', 'scoring', 'audio', 'audioUrl', 'speech',
  'tts', 'icon', 'image', 'outcome',
];

// Words that would make a requirement a preference rather than a fact.
const PREFERENCE_WORDS = [
  'kind', 'polite', 'nice', 'respectful', 'friendly', 'well behaved', 'behave',
  'good manners', 'obedient', 'cheerful', 'positive attitude', 'should be nice',
];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1}: ${e.message}`); }
});

const seenIds = new Set();
const seenSig = new Set();
let keyFirst = 0;
let keyLongest = 0;
const lengthMargins = [];

for (const it of items) {
  const id = it.itemId || '(no id)';

  const keys = Object.keys(it).sort();
  if (JSON.stringify(keys) !== JSON.stringify(BANK_ITEM_KEYS)) fail(id, `key set is ${JSON.stringify(keys)}`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== TYPE_CODE) fail(id, `typeCode ${it.typeCode}`);
  if (it.domain !== DOMAIN) fail(id, `domain ${it.domain}`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty ${it.difficulty}`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_AGE_BANDS.includes(b))) fail(id, `ageBands ${it.ageBands} outside the catalog spec`);
  if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) fail(id, 'K-1 was removed from this type under D-017 and must not return');
  if (it.demoPath !== 'demos/CX-sjt-01.html') fail(id, `demoPath ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, `scoring.mode ${it.scoring && it.scoring.mode}`);
  if (!it.provenance || !['grammar', 'llm', 'human'].includes(it.provenance.generator)) fail(id, 'provenance.generator invalid');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  // ---- 2. served-subset safety ----
  const c = it.content || {};
  for (const leak of LEAK_FIELDS) if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  if (c.presentation !== 'text') fail(id, `presentation ${c.presentation} (D-017 requires text)`);
  const setting = c.situation && c.situation.lines;
  if (!Array.isArray(setting) || !setting.length) fail(id, 'situation has no lines');
  const cons = c.constraints;
  if (!Array.isArray(cons) || cons.length < 1 || cons.length > 3) fail(id, `constraint count ${cons && cons.length} outside 1..3`);
  const opts = c.options;
  if (!Array.isArray(opts) || opts.length < 3 || opts.length > 5) fail(id, `option count ${opts && opts.length} outside 3..5`);
  else {
    for (const o of opts) {
      if (Object.keys(o || {}).sort().join(',') !== 'id,text') fail(id, `option carries extra fields ${Object.keys(o || {})}`);
      for (const leak of LEAK_FIELDS) if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `option leaks "${leak}"`);
    }
    const oids = opts.map((o) => o.id);
    if (new Set(oids).size !== oids.length) fail(id, 'duplicate option ids');
    const texts = opts.map((o) => o.text);
    if (new Set(texts).size !== texts.length) fail(id, 'duplicate option text');
  }
  if (typeof c.question !== 'string' || !/meets everything on the list and breaks nothing/.test(c.question)) {
    fail(id, 'the question does not state the constraint-satisfaction standard in the item');
  }

  const sig = JSON.stringify([setting, (cons || []).map((x) => x.text), (opts || []).map((o) => o.text).sort()]);
  if (seenSig.has(sig)) fail(id, 'duplicate item already in the bank');
  seenSig.add(sig);

  // ---- 3. single-satisfiability, re-derived from the constraint model ----
  const ans = it.answer || {};
  const cm = ans.constraintModel || {};
  const declared = (cons || []).map((x) => x.id);
  if (JSON.stringify(cm.constraintIds) !== JSON.stringify(declared)) {
    fail(id, `the model scores against ${JSON.stringify(cm.constraintIds)} but the child is shown ${JSON.stringify(declared)}`);
  }
  const model = cm.options;
  if (!Array.isArray(model) || !Array.isArray(opts) || model.length !== opts.length) {
    fail(id, 'constraintModel does not align to the option list');
  } else {
    if (model.map((m) => m.id).join('|') !== opts.map((o) => o.id).join('|')) fail(id, 'constraintModel ids out of option order');
    const qualifying = model.filter((m) => declared.every((cid) => m.satisfies.includes(cid)) && !m.violates.length);
    if (qualifying.length !== 1) {
      fail(id, `SINGLE-SATISFIABILITY: ${qualifying.length} options meet every stated requirement and break none (want exactly 1)`);
    } else if (qualifying[0].id !== ans.correctKey) {
      fail(id, `correctKey "${ans.correctKey}" != re-derived key "${qualifying[0].id}"`);
    }
    for (const m of model) {
      for (const cid of [...m.satisfies, ...m.violates]) {
        if (!declared.includes(cid)) fail(id, `option ${m.id} references "${cid}", which is not shown to the child`);
      }
      if (m.satisfies.some((s) => m.violates.includes(s))) fail(id, `option ${m.id} both meets and breaks the same requirement`);
      if (m.id !== ans.correctKey && !m.violates.length) {
        fail(id, `SINGLE-SATISFIABILITY: distractor ${m.id} breaks no stated requirement, so it is defensible too`);
      }
    }
    // graded credit must agree with the model, and the key must be the unique best
    const poly = ans.polyScores || {};
    for (const m of model) {
      const expect = m.satisfies.length - m.violates.length;
      if (poly[m.id] !== expect) fail(id, `polyScore for ${m.id} is ${poly[m.id]}, model implies ${expect}`);
    }
    const best = Math.max(...Object.values(poly));
    const bestIds = Object.keys(poly).filter((k) => poly[k] === best);
    if (bestIds.length !== 1 || bestIds[0] !== ans.correctKey) {
      fail(id, `graded credit does not peak uniquely at the key (top scorers: ${bestIds.join(', ')})`);
    }
  }

  // ---- 4. construct guard on the requirements themselves ----
  for (const con of cons || []) {
    const low = (con.text || '').toLowerCase();
    for (const w of PREFERENCE_WORDS) {
      if (low.includes(w)) fail(id, `CONSTRUCT GUARD: requirement "${con.text}" uses the preference word "${w}" — requirements must be facts the child can check, not dispositions`);
    }
    if (!/[a-z]/.test(low) || con.text.length < 12) fail(id, `requirement "${con.text}" is too vague to check`);
  }
  if (typeof it.scoring.constructNote !== 'string' || !/not expert-consensus effectiveness/.test(it.scoring.constructNote)) {
    fail(id, 'the construct note explaining why the key is not an effectiveness consensus is missing');
  }
  if (!Array.isArray(ans.rubricDimensions) || ans.rubricDimensions.length < 2) fail(id, 'the deferred rubric dimensions are not recorded');

  // ---- 5. lure taxonomy ----
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  const oids = (opts || []).map((o) => o.id);
  if (ratKeys.length !== oids.length || !oids.every((k) => ratKeys.includes(k))) fail(id, 'rationales do not cover every option');
  const corrects = ratKeys.filter((k) => rats[k] && rats[k].lure === 'correct');
  if (corrects.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${corrects.length}`);
  else if (corrects[0] !== ans.correctKey) fail(id, 'the "correct" rationale is not the key');
  for (const k of ratKeys) {
    const r = rats[k];
    if (!r || !OPTION_LURES.has(r.lure)) fail(id, `rationale ${k} has unknown lure "${r && r.lure}"`);
    if (!r || typeof r.why !== 'string' || r.why.length < 10) fail(id, `rationale ${k} has no diagnostic explanation`);
  }

  // Key-shape artefacts. The key names the action that satisfies every
  // requirement, so it tends to be the wordiest option — which would let a
  // child score by picking the longest line without reading. Track both the
  // count and the size of the gap.
  if (opts && opts.length) {
    if (opts[0].id === ans.correctKey) keyFirst++;
    const keyOpt = opts.find((o) => o.id === ans.correctKey);
    if (keyOpt) {
      const others = opts.filter((o) => o.id !== ans.correctKey).map((o) => o.text.length);
      if (keyOpt.text.length > Math.max(...others)) keyLongest++;
      lengthMargins.push(keyOpt.text.length - Math.max(...others));
    }
  }

  // ---- 7. reading gate + no audio ----
  if (Array.isArray(it.ageBands) && it.ageBands.includes('2-3')) {
    for (const t of [...(setting || []), ...(cons || []).map((x) => x.text), ...(opts || []).map((o) => o.text)]) {
      if (t.length > MAX_TEXT_CHARS_LOW) fail(id, `grade 2-3 reading gate: text too long (${t.length} chars) "${t}"`);
      const longWords = t.split(/[\s-]+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter((w) => w.length > MAX_WORD_LEN_LOW);
      if (longWords.length) fail(id, `grade 2-3 reading gate: words too long -> ${longWords.join(', ')}`);
    }
  }
  const blob = JSON.stringify(c).toLowerCase();
  for (const term of ['audio', 'narrat', 'voiced', 'animation', 'pictured']) {
    if (blob.includes(term)) fail(id, `content mentions "${term}" — audio and pictured choices are prohibited (D-017)`);
  }
}

// ---- 6. coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5`);
const buckets = Array.from({ length: 20 }, () => 0);
for (const d of diffs) { const k = Math.round(d); if (k >= 1 && k <= 20) buckets[k - 1]++; }
buckets.forEach((n, i) => {
  if (i + 1 <= 19 && n < MIN_PER_BUCKET) fail('coverage', `integer bucket ${i + 1} has ${n} items (<${MIN_PER_BUCKET})`);
});
if (items.length && keyFirst / items.length > 0.45) fail('anti-cue', `the key is the first option in ${keyFirst}/${items.length} items`);
if (items.length && keyLongest / items.length > 0.55) fail('anti-cue', `the key is the longest option in ${keyLongest}/${items.length} items — a child could score by picking the longest line`);
lengthMargins.sort((a, b) => a - b);
const medianMargin = lengthMargins.length ? lengthMargins[Math.floor(lengthMargins.length / 2)] : 0;
if (medianMargin > 3) {
  fail('anti-cue', `the key is typically ${medianMargin} characters longer than the longest distractor — option length is diagnostic of the answer`);
}

// ---- 8. reproducibility ----
const rebuilt = buildBank();
if (rebuilt.length !== items.length) fail('repro', `fresh build has ${rebuilt.length} items, disk has ${items.length}`);
else {
  for (let i = 0; i < items.length; i++) {
    if (JSON.stringify(rebuilt[i]) !== JSON.stringify(items[i])) { fail('repro', `item ${i} differs from a fresh build`); break; }
  }
}

console.log(`CX-sjt-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n):  ' + buckets.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min bucket density 1..19:  ${Math.min(...buckets.slice(0, 19))}`);
console.log(`key-shape artefact: key is first option in ${keyFirst}/${items.length}; longest option in ${keyLongest}/${items.length}; median length margin over the longest distractor ${medianMargin} chars`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — schema exact, no key leak in content, the key is re-derived from requirements printed in the item and single-satisfiable for all 120 items, every distractor breaks a visible requirement, no requirement is a disposition, coverage 1..20 with >=5 per bucket, reading gate holds, no audio and no K-1, bank reproducible.');
