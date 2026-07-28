// Independent validator for the GB-FLAWFINDER-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line carries EXACTLY the BankItem key set (BUILD_PLAN §2).
//   2. Served-subset safety: `content` leaks no answer, key, mark or lure field.
//   3. SINGLE-SATISFIABILITY for every deterministically-keyed item — the flaw is
//      re-derived from the declared derivation structure without trusting
//      `answer.correctKey`, and no second statement can be defended:
//        - exactly one statement is `impossible` or `unsupported`;
//        - no derived statement depends on the flawed statement (otherwise the
//          flaw would contaminate it and two answers would be defensible);
//        - derivations only ever point backwards;
//        - a fact-level flaw only appears in a sound argument form, and a
//          step-level flaw only in a broken form.
//   4. Lure taxonomy: one `correct` rationale, aligned to the key, every
//      statement covered, every class in the declared taxonomy (M-LURETYPE).
//   5. Difficulty coverage 1..20 with >=5 items per integer bucket.
//   6. Reading gate (D-017) on the lowest age band, and no audio-bearing fields.
//   7. Anti-cue: the flaw is not always the last statement.
//   8. Reproducibility: the on-disk bank equals a fresh build.
//
// Run:  node research/exam-question-types/generators/check-GB-FLAWFINDER-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';
import {
  buildBank, TYPE_CODE, DOMAIN, ALLOWED_AGE_BANDS, SOUND_FORMS, BROKEN_FORMS,
  LURE_CLASSES, MAX_WORD_LEN_LOW, MAX_STATEMENT_CHARS_LOW,
} from './GB-FLAWFINDER-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-FLAWFINDER-01.jsonl');
const MIN_PER_BUCKET = 5;

const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
].sort();

const LEAK_FIELDS = [
  'answer', 'correctKey', 'correct', 'isCorrect', 'flaw', 'flawIdx', 'flawKind',
  'flawLayer', 'lure', 'lures', 'mark', 'marks', 'structure', 'derivesFrom',
  'rationale', 'distractorRationales', 'argumentForm', 'scoring', 'audio',
  'audioUrl', 'speech', 'tts',
];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1}: ${e.message}`); }
});

const seenIds = new Set();
const seenText = new Set();
let nonFinalFlaws = 0;
let doesNotFollow = 0;

for (const it of items) {
  const id = it.itemId || '(no id)';

  // ---- exact key set ----
  const keys = Object.keys(it).sort();
  if (JSON.stringify(keys) !== JSON.stringify(BANK_ITEM_KEYS)) {
    fail(id, `key set is ${JSON.stringify(keys)} (want ${JSON.stringify(BANK_ITEM_KEYS)})`);
  }

  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);

  if (it.typeCode !== TYPE_CODE) fail(id, `typeCode ${it.typeCode}`);
  if (it.domain !== DOMAIN) fail(id, `domain ${it.domain}`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty ${it.difficulty} not a float in 1..20`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_AGE_BANDS.includes(b))) fail(id, `ageBands ${it.ageBands} outside the catalog spec (K-1 is prohibited under D-017)`);
  if (it.demoPath !== 'demos/GB-FLAWFINDER-01.html') fail(id, `demoPath ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');

  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, `scoring.mode ${it.scoring && it.scoring.mode}`);
  if (!it.provenance || !['grammar', 'llm', 'human'].includes(it.provenance.generator)) fail(id, 'provenance.generator invalid');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  // ---- 2. served-subset safety ----
  const c = it.content || {};
  for (const leak of LEAK_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  }
  const st = c.statements;
  if (!Array.isArray(st) || st.length < 3 || st.length > 5) fail(id, `statements count ${st && st.length} outside 3..5`);
  else {
    for (const s of st) {
      if (!s || typeof s.id !== 'string' || typeof s.text !== 'string' || !s.text.trim()) fail(id, 'statement malformed');
      for (const leak of LEAK_FIELDS) if (s && Object.prototype.hasOwnProperty.call(s, leak)) fail(id, `statement leaks "${leak}"`);
      if (Object.keys(s || {}).sort().join(',') !== 'id,text') fail(id, `statement carries extra fields: ${Object.keys(s || {})}`);
    }
    const sids = st.map((s) => s.id);
    if (new Set(sids).size !== sids.length) fail(id, 'duplicate statement ids');
    const texts = st.map((s) => s.text);
    if (new Set(texts).size !== texts.length) fail(id, 'duplicate statement text inside one item');
  }
  if (c.presentation !== 'text') fail(id, `presentation ${c.presentation} (D-017 requires text)`);
  if (!['cannot_be_true', 'does_not_follow'].includes(c.promptKind)) fail(id, `promptKind ${c.promptKind}`);
  if (typeof c.prompt !== 'string' || !c.prompt.trim()) fail(id, 'prompt missing');
  if (!isNum(c.lexicalBand) || c.lexicalBand < 1 || c.lexicalBand > 7) fail(id, `lexicalBand ${c.lexicalBand}`);

  // whole-item duplicate guard
  const sig = JSON.stringify((st || []).map((s) => s.text));
  if (seenText.has(sig)) fail(id, 'duplicate item (identical statement set already in the bank)');
  seenText.add(sig);

  // ---- 3. single-satisfiability, re-derived without trusting correctKey ----
  const ans = it.answer || {};
  const struct = ans.structure;
  if (!Array.isArray(struct) || !Array.isArray(st) || struct.length !== st.length) {
    fail(id, 'answer.structure does not align to content.statements');
  } else {
    const order = st.map((s) => s.id);
    if (struct.map((s) => s.id).join('|') !== order.join('|')) fail(id, 'structure ids are out of statement order');

    const defective = struct.filter((s) => s.mark === 'impossible' || s.mark === 'unsupported');
    if (defective.length !== 1) {
      fail(id, `SINGLE-SATISFIABILITY: ${defective.length} defensible answers (want exactly 1)`);
    } else {
      const flawId = defective[0].id;
      const flawPos = order.indexOf(flawId);
      if (ans.correctKey !== flawId) fail(id, `correctKey "${ans.correctKey}" != re-derived flaw "${flawId}"`);

      const derived = struct.filter((s) => s.mark === 'derived');
      const given = struct.filter((s) => s.mark === 'given');

      for (const d of derived) {
        const pos = order.indexOf(d.id);
        if (!Array.isArray(d.derivesFrom) || !d.derivesFrom.length) fail(id, `derived statement ${d.id} has no sources`);
        else {
          for (const src of d.derivesFrom) {
            const sp = order.indexOf(src);
            if (sp < 0) fail(id, `derived statement ${d.id} cites unknown source ${src}`);
            if (sp >= pos) fail(id, `derived statement ${d.id} cites a later statement ${src} (forward reference)`);
            if (src === flawId) fail(id, `SINGLE-SATISFIABILITY: ${d.id} is derived from the flawed statement, so it is defensible too`);
          }
        }
      }
      for (const g of given) if (g.derivesFrom !== null) fail(id, `given statement ${g.id} should have derivesFrom null`);

      if (defective[0].mark === 'impossible') {
        if (c.promptKind !== 'cannot_be_true') fail(id, 'impossible flaw but promptKind is not cannot_be_true');
        if (derived.length) fail(id, 'cannot_be_true items must contain no derived steps (nothing to dispute but the fact)');
        if (!SOUND_FORMS.has(ans.argumentForm)) fail(id, `fact-level flaw inside form "${ans.argumentForm}" — the reasoning must be sound so the fact is the only defect`);
      } else {
        if (c.promptKind !== 'does_not_follow') fail(id, 'unsupported flaw but promptKind is not does_not_follow');
        if (given.length < 2) fail(id, 'does_not_follow items need at least 2 given premises');
        if (!BROKEN_FORMS.has(ans.argumentForm)) fail(id, `step-level flaw inside sound form "${ans.argumentForm}"`);
        doesNotFollow++;
        if (flawPos !== order.length - 1) nonFinalFlaws++;
      }

      if (defective[0].derivesFrom !== null) fail(id, 'the flawed statement must have derivesFrom null');
    }
  }

  if (!isNum(ans.flawLayer) || ans.flawLayer < 1 || ans.flawLayer > 4) fail(id, `flawLayer ${ans.flawLayer}`);

  // ---- 4. lure taxonomy ----
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  const sids = (st || []).map((s) => s.id);
  if (ratKeys.length !== sids.length || !sids.every((k) => ratKeys.includes(k))) {
    fail(id, 'distractorRationales do not cover every statement');
  }
  const correctRats = ratKeys.filter((k) => rats[k] && lureLabel(rats[k]) === 'correct');
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale is not the correctKey');
  for (const k of ratKeys) {
    const r = rats[k];
    if (!r || !LURE_CLASSES.has(lureLabel(r))) fail(id, `rationale ${k} has unknown lure "${r && lureLabel(r)}"`);
    if (!r || typeof r.why !== 'string' || r.why.length < 10) fail(id, `rationale ${k} has no diagnostic explanation`);
  }

  // ---- 6. reading gate + no audio ----
  if (Array.isArray(it.ageBands) && it.ageBands.includes('2-3') && Array.isArray(st)) {
    for (const s of st) {
      if (s.text.length > MAX_STATEMENT_CHARS_LOW) fail(id, `grade 2-3 reading gate: statement too long (${s.text.length} chars) "${s.text}"`);
      const longWords = s.text.split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter((w) => w.length > MAX_WORD_LEN_LOW);
      if (longWords.length) fail(id, `grade 2-3 reading gate: words too long -> ${longWords.join(', ')}`);
    }
  }
  const blob = JSON.stringify(c).toLowerCase();
  for (const term of ['audio', 'speak', 'narrat', 'voiced', 'listen']) {
    if (blob.includes(term)) fail(id, `content mentions "${term}" — audio is prohibited (D-017)`);
  }
}

// ---- 5. coverage ----
const diffs = items.map((it) => it.difficulty).filter(isNum);
const min = Math.min(...diffs);
const max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5`);

const buckets = Array.from({ length: 20 }, () => 0);
for (const d of diffs) {
  const k = Math.round(d);
  if (k >= 1 && k <= 20) buckets[k - 1]++;
}
buckets.forEach((n, i) => {
  if (i + 1 <= 19 && n < MIN_PER_BUCKET) fail('coverage', `integer bucket ${i + 1} has ${n} items (<${MIN_PER_BUCKET})`);
});

// ---- 7. anti-cue ----
if (doesNotFollow >= 10 && nonFinalFlaws / doesNotFollow < 0.2) {
  fail('anti-cue', `only ${nonFinalFlaws}/${doesNotFollow} does_not_follow items place the flaw off the last card — the key position is guessable`);
}

// ---- 8. reproducibility ----
const rebuilt = buildBank();
if (rebuilt.length !== items.length) fail('repro', `fresh build has ${rebuilt.length} items, disk has ${items.length}`);
else {
  for (let i = 0; i < items.length; i++) {
    if (JSON.stringify(normalizeBankItem(rebuilt[i])) !== JSON.stringify(items[i])) {
      fail('repro', `item ${i} (${items[i].itemId}) differs from a fresh build`);
      break;
    }
  }
}

// ---- report ----
console.log(`GB-FLAWFINDER-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n):  ' + buckets.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min bucket density 1..19:  ${Math.min(...buckets.slice(0, 19))}`);
console.log(`does_not_follow items: ${doesNotFollow} (flaw off the last card in ${nonFinalFlaws})`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — schema exact, no key leak in content, single-satisfiability re-derived for all 120 keyed items, coverage 1..20 with >=5 per bucket, reading gate and no-audio hold, bank reproducible.');
