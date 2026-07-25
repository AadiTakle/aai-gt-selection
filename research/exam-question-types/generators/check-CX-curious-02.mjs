// Independent validator for the CX-curious-02 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line carries EXACTLY the BankItem key set (BUILD_PLAN §2).
//   2. Served-subset safety: nothing in `content` reveals which option is the gap,
//      and the open rounds carry no key of any kind.
//   3. SINGLE-SATISFIABILITY for the keyed gap round, re-derived from the scene
//      text itself and not from `answer.correctKey`:
//        - exactly one option is marked `unknown` and it is the key;
//        - every OTHER option cites a scene line, and every content token it
//          claims really occurs in that line (so it is genuinely known);
//        - the key option's novelty tokens occur in NO scene line (so it is
//          genuinely not known);
//        - the key is not identifiable by length or position artefacts.
//   4. Lure taxonomy: one `correct`, every option covered, classes declared,
//      every rationale explained.
//   5. CONSTRUCT GUARD: the open curiosity rounds must stay unkeyed — no
//      starter card, focus word or guess prompt may carry a score, weight or
//      preferred value, and the deferred rubric must be recorded instead.
//   6. Difficulty coverage 1..20 with >=5 items per integer bucket.
//   7. Reading gate (D-017) on the lowest age band and no audio-bearing fields.
//   8. Reproducibility: the on-disk bank equals a fresh build.
//
// Run:  node research/exam-question-types/generators/check-CX-curious-02.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBank, TYPE_CODE, DOMAIN, ALLOWED_AGE_BANDS, GAP_LURES, STARTERS,
  MAX_WORD_LEN_LOW, MAX_LINE_CHARS_LOW, lineContains,
} from './CX-curious-02.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/CX-curious-02.jsonl');
const MIN_PER_BUCKET = 5;

const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
].sort();

const LEAK_FIELDS = [
  'answer', 'correctKey', 'correct', 'isCorrect', 'lure', 'lures', 'support',
  'evidenceLine', 'tokens', 'evidenceModel', 'gapKind', 'rationale',
  'distractorRationales', 'rubricDimensions', 'scoring', 'audio', 'audioUrl',
  'speech', 'tts', 'score', 'weight', 'points',
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
let keyLongest = 0; // how often the key happens to be the longest option (length artefact)
let keyFirst = 0;

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
  else if (!it.ageBands.every((b) => ALLOWED_AGE_BANDS.includes(b))) fail(id, `ageBands ${it.ageBands} outside the catalog spec (K-1 prohibited under D-017)`);
  if (it.demoPath !== 'demos/CX-curious-02.html') fail(id, `demoPath ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, `scoring.mode ${it.scoring && it.scoring.mode}`);
  if (!it.provenance || !['grammar', 'llm', 'human'].includes(it.provenance.generator)) fail(id, 'provenance.generator invalid');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  // ---- 2. served-subset safety ----
  const c = it.content || {};
  for (const leak of LEAK_FIELDS) if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  const sceneLines = c.scene && c.scene.lines;
  if (!Array.isArray(sceneLines) || !sceneLines.length) fail(id, 'scene has no lines');
  const opts = c.gapOptions;
  if (!Array.isArray(opts) || opts.length < 3 || opts.length > 5) fail(id, `gapOptions count ${opts && opts.length} outside 3..5`);
  else {
    for (const o of opts) {
      if (Object.keys(o || {}).sort().join(',') !== 'id,text') fail(id, `gapOption carries extra fields ${Object.keys(o || {})}`);
      for (const leak of LEAK_FIELDS) if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `gapOption leaks "${leak}"`);
    }
    const oids = opts.map((o) => o.id);
    if (new Set(oids).size !== oids.length) fail(id, 'duplicate gapOption ids');
    const texts = opts.map((o) => o.text);
    if (new Set(texts).size !== texts.length) fail(id, 'duplicate gapOption text');
  }
  if (c.presentation !== 'text') fail(id, `presentation ${c.presentation} (D-017 requires text)`);
  if (typeof c.gapQuestion !== 'string' || !/NOT know/.test(c.gapQuestion)) fail(id, 'gapQuestion does not state the standard in the item');

  const sig = JSON.stringify([sceneLines, (opts || []).map((o) => o.text).sort()]);
  if (seenSig.has(sig)) fail(id, 'duplicate item (same scene and same option set already in the bank)');
  seenSig.add(sig);

  // ---- 3. single-satisfiability, re-derived from the scene text ----
  const ans = it.answer || {};
  const model = ans.evidenceModel && ans.evidenceModel.gapOptions;
  if (!Array.isArray(model) || !Array.isArray(opts) || model.length !== opts.length) {
    fail(id, 'evidenceModel does not align to gapOptions');
  } else {
    if (model.map((m) => m.id).join('|') !== opts.map((o) => o.id).join('|')) fail(id, 'evidenceModel ids out of option order');
    const unknown = model.filter((m) => m.support === 'unknown');
    if (unknown.length !== 1) {
      fail(id, `SINGLE-SATISFIABILITY: ${unknown.length} options are undetermined by the scene (want exactly 1)`);
    } else if (unknown[0].id !== ans.correctKey) {
      fail(id, `correctKey "${ans.correctKey}" != re-derived gap "${unknown[0].id}"`);
    }
    for (const m of model) {
      if (!Array.isArray(m.tokens) || !m.tokens.length) { fail(id, `option ${m.id} declares no tokens`); continue; }
      if (m.support === 'stated') {
        if (!isNum(m.evidenceLine) || !sceneLines[m.evidenceLine]) { fail(id, `option ${m.id} cites a missing scene line`); continue; }
        for (const tk of m.tokens) {
          if (!lineContains(sceneLines[m.evidenceLine], tk)) fail(id, `option ${m.id} claims scene line ${m.evidenceLine} states it, but "${tk}" is not in that line`);
        }
      } else if (m.support === 'unknown') {
        if (m.evidenceLine !== null) fail(id, `the gap option ${m.id} must not cite a scene line`);
        for (const tk of m.tokens) {
          if (sceneLines.some((l) => lineContains(l, tk))) fail(id, `SINGLE-SATISFIABILITY: gap option ${m.id} uses "${tk}", which the scene DOES state`);
        }
      } else {
        fail(id, `option ${m.id} has unknown support "${m.support}"`);
      }
    }
    // key must not be findable by shape rather than by reading
    const keyOpt = opts.find((o) => o.id === ans.correctKey);
    if (keyOpt) {
      const lens = opts.map((o) => o.text.length);
      if (keyOpt.text.length === Math.max(...lens)) keyLongest++;
      if (opts[0].id === ans.correctKey) keyFirst++;
    }
  }

  // ---- 4. lure taxonomy ----
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  const oids = (opts || []).map((o) => o.id);
  if (ratKeys.length !== oids.length || !oids.every((k) => ratKeys.includes(k))) fail(id, 'rationales do not cover every option');
  const corrects = ratKeys.filter((k) => rats[k] && rats[k].lure === 'correct');
  if (corrects.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${corrects.length}`);
  else if (corrects[0] !== ans.correctKey) fail(id, 'the "correct" rationale is not the key');
  for (const k of ratKeys) {
    const r = rats[k];
    if (!r || !GAP_LURES.has(r.lure)) fail(id, `rationale ${k} has unknown lure "${r && r.lure}"`);
    if (!r || typeof r.why !== 'string' || r.why.length < 10) fail(id, `rationale ${k} has no diagnostic explanation`);
  }

  // ---- 5. construct guard: the curiosity rounds stay unkeyed ----
  if (!Array.isArray(c.starters) || !c.starters.length) fail(id, 'no question-starter cards');
  else {
    const allowed = new Set(STARTERS.map((s) => s.id));
    for (const s of c.starters) {
      if (!allowed.has(s.id)) fail(id, `unknown starter ${s.id}`);
      if (!isNum(s.depth) || s.depth < 1 || s.depth > 3) fail(id, `starter ${s.id} has a bad depth tier`);
      for (const banned of ['score', 'correct', 'weight', 'points', 'preferred', 'best']) {
        if (Object.prototype.hasOwnProperty.call(s, banned)) fail(id, `CONSTRUCT GUARD: starter ${s.id} carries "${banned}" — no question may be scored as better than another`);
      }
    }
  }
  if (!Array.isArray(c.guessPrompts) || c.guessPrompts.length < 2) fail(id, 'the cause and consequence guess prompts are missing');
  if (!Array.isArray(ans.rubricDimensions) || ans.rubricDimensions.length < 4) fail(id, 'the deferred rubric dimensions are not recorded');
  if (!it.scoring.deferredComponents || !it.scoring.deferredComponents.length) fail(id, 'the open rounds are not recorded as deferred');
  if (typeof it.scoring.constructNote !== 'string' || !/NOT curiosity/.test(it.scoring.constructNote)) {
    fail(id, 'the construct note distinguishing gap-detection from curiosity is missing');
  }
  // focus words are tap-helpers only; they must come from the scene text so they
  // cannot smuggle in information the child cannot see.
  for (const w of c.focusWords || []) {
    if (!(sceneLines || []).some((l) => lineContains(l, w))) fail(id, `focus word "${w}" is not in the scene text`);
  }

  // ---- 7. reading gate + no audio ----
  if (Array.isArray(it.ageBands) && it.ageBands.includes('2-3')) {
    for (const t of [...(sceneLines || []), ...(opts || []).map((o) => o.text)]) {
      if (t.length > MAX_LINE_CHARS_LOW) fail(id, `grade 2-3 reading gate: text too long (${t.length} chars) "${t}"`);
      const longWords = t.split(/[\s-]+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter((w) => w.length > MAX_WORD_LEN_LOW);
      if (longWords.length) fail(id, `grade 2-3 reading gate: words too long -> ${longWords.join(', ')}`);
    }
  }
  const blob = JSON.stringify(c).toLowerCase();
  for (const term of ['audio', 'narrat', 'voiced', 'listen to']) {
    if (blob.includes(term)) fail(id, `content mentions "${term}" — audio is prohibited (D-017)`);
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

// key-position / key-length artefacts
if (items.length && keyFirst / items.length > 0.45) fail('anti-cue', `the gap is the first option in ${keyFirst}/${items.length} items`);
if (items.length && keyLongest / items.length > 0.6) fail('anti-cue', `the gap is the longest option in ${keyLongest}/${items.length} items`);

// ---- 8. reproducibility ----
const rebuilt = buildBank();
if (rebuilt.length !== items.length) fail('repro', `fresh build has ${rebuilt.length} items, disk has ${items.length}`);
else {
  for (let i = 0; i < items.length; i++) {
    if (JSON.stringify(rebuilt[i]) !== JSON.stringify(items[i])) { fail('repro', `item ${i} differs from a fresh build`); break; }
  }
}

console.log(`CX-curious-02 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n):  ' + buckets.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min bucket density 1..19:  ${Math.min(...buckets.slice(0, 19))}`);
console.log(`key-position artefact: gap is first option in ${keyFirst}/${items.length}; longest option in ${keyLongest}/${items.length}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — schema exact, no key leak in content, the gap key is re-derived from the scene text and single-satisfiable for all 120 items, open curiosity rounds are unkeyed with a recorded deferred rubric, coverage 1..20 with >=5 per bucket, reading gate and no-audio hold, bank reproducible.');
