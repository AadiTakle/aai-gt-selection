// Independent validator for the GB-FLAWFINDER-01 structured bank.
//
// The bank was reframed from "spot the false statement" to "which claim do these
// facts best support" (review, 2026-07-29), so the headline check moved with it:
// an inference item is only keyable if exactly ONE candidate claim is defensible
// given the facts.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line carries EXACTLY the BankItem key set (BUILD_PLAN §2).
//   2. Served-subset safety: `content` leaks no answer, key, mark or lure field.
//   3. SINGLE-DEFENSIBLE-CLAIM for every deterministically-keyed item — the key
//      is re-derived from the declared claim structure without trusting
//      `answer.correctKey`, and no second claim can be defended:
//        - exactly one claim is marked `supported`;
//        - every other claim carries a defect class from the taxonomy, and no
//          two distractors fail the same way (two claims failing identically is
//          where a second defensible answer hides);
//        - the supported claim is licensed by FACTS only — no claim ever cites
//          another claim, so a defect cannot propagate into the key;
//        - at least two facts, so "best supported" is a judgement about
//          evidence rather than a restatement of a single sentence.
//   4. Lure taxonomy: one `correct` rationale, aligned to the key, every claim
//      covered, every class in the declared taxonomy (M-LURETYPE).
//   5. Difficulty coverage 1..20 with >=5 items per integer bucket.
//   6. Reading gate (D-017) on the lowest age band, and no audio-bearing fields.
//   7. Anti-cue: the supported claim is not always in the same position.
//   8. Reproducibility: the on-disk bank equals a fresh build.
//
// Run:  node research/exam-question-types/generators/check-GB-FLAWFINDER-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';
import {
  buildBank, TYPE_CODE, DOMAIN, ALLOWED_AGE_BANDS, PROMPT_KIND, DEFECT_CLASSES,
  LURE_CLASSES, LURE_FOR_ROLE, MAX_WORD_LEN_LOW, MAX_STATEMENT_CHARS_LOW,
} from './GB-FLAWFINDER-01.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-FLAWFINDER-01.jsonl');
const MIN_PER_BUCKET = 5;
/** No single claim position may carry more than this share of the keys. */
const MAX_KEY_POSITION_SHARE = 0.4;

const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
].sort();

const LEAK_FIELDS = [
  'answer', 'correctKey', 'correct', 'isCorrect', 'supported', 'supportedBy',
  'claimStructure', 'inferenceLayer', 'lure', 'lures', 'mark', 'marks',
  'structure', 'role', 'roles', 'rationale', 'distractorRationales', 'scoring',
  'audio', 'audioUrl', 'speech', 'tts',
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
const keyPositions = {};

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

  const facts = c.facts;
  const claims = c.claims;
  if (!Array.isArray(facts) || facts.length < 2 || facts.length > 5) fail(id, `fact count ${facts && facts.length} outside 2..5`);
  if (!Array.isArray(claims) || claims.length < 3 || claims.length > 5) fail(id, `claim count ${claims && claims.length} outside 3..5`);

  for (const [label, list] of [['fact', facts], ['claim', claims]]) {
    if (!Array.isArray(list)) continue;
    for (const s of list) {
      if (!s || typeof s.id !== 'string' || typeof s.text !== 'string' || !s.text.trim()) fail(id, `${label} malformed`);
      for (const leak of LEAK_FIELDS) if (s && Object.prototype.hasOwnProperty.call(s, leak)) fail(id, `${label} leaks "${leak}"`);
      if (Object.keys(s || {}).sort().join(',') !== 'id,text') fail(id, `${label} carries extra fields: ${Object.keys(s || {})}`);
    }
    const ids = list.map((s) => s.id);
    if (new Set(ids).size !== ids.length) fail(id, `duplicate ${label} ids`);
  }
  if (Array.isArray(facts) && Array.isArray(claims)) {
    const texts = [...facts, ...claims].map((s) => s.text);
    if (new Set(texts).size !== texts.length) fail(id, 'a fact and a claim share the same text');
  }
  if (isNum(c.factCount) && Array.isArray(facts) && c.factCount !== facts.length) fail(id, 'factCount disagrees with facts');
  if (isNum(c.claimCount) && Array.isArray(claims) && c.claimCount !== claims.length) fail(id, 'claimCount disagrees with claims');

  if (c.presentation !== 'text') fail(id, `presentation ${c.presentation} (D-017 requires text)`);
  if (c.promptKind !== PROMPT_KIND) fail(id, `promptKind ${c.promptKind}`);
  if (typeof c.prompt !== 'string' || !c.prompt.trim()) fail(id, 'prompt missing');
  if (!isNum(c.lexicalBand) || c.lexicalBand < 1 || c.lexicalBand > 7) fail(id, `lexicalBand ${c.lexicalBand}`);

  // whole-item duplicate guard
  const sig = JSON.stringify([...(facts || []), ...(claims || [])].map((s) => s.text));
  if (seenText.has(sig)) fail(id, 'duplicate item (identical fact/claim set already in the bank)');
  seenText.add(sig);

  // ---- 3. single defensible claim, re-derived without trusting correctKey ----
  const ans = it.answer || {};
  const struct = ans.claimStructure;
  if (!Array.isArray(struct) || !Array.isArray(claims) || struct.length !== claims.length) {
    fail(id, 'answer.claimStructure does not align to content.claims');
  } else {
    const order = claims.map((s) => s.id);
    const factIds = (facts || []).map((f) => f.id);
    if (struct.map((s) => s.id).join('|') !== order.join('|')) fail(id, 'claimStructure ids are out of claim order');

    const supported = struct.filter((s) => s.mark === 'supported');
    if (supported.length !== 1) {
      fail(id, `SINGLE-DEFENSIBLE-CLAIM: ${supported.length} supported claims (want exactly 1)`);
    } else {
      const keyId = supported[0].id;
      if (ans.correctKey !== keyId) fail(id, `correctKey "${ans.correctKey}" != re-derived supported claim "${keyId}"`);
      keyPositions[order.indexOf(keyId)] = (keyPositions[order.indexOf(keyId)] || 0) + 1;

      const sources = supported[0].supportedBy;
      if (!Array.isArray(sources) || !sources.length) fail(id, 'the supported claim cites no facts');
      else {
        for (const src of sources) {
          if (!factIds.includes(src)) {
            fail(id, `SINGLE-DEFENSIBLE-CLAIM: the supported claim cites "${src}", which is not a fact — a claim resting on a claim can inherit its defect`);
          }
        }
      }
      if (!Array.isArray(factIds) || factIds.length < 2) fail(id, 'fewer than 2 facts, so "best supported" is a restatement rather than a judgement');

      const defects = struct.filter((s) => s.mark !== 'supported');
      for (const d of defects) {
        if (!DEFECT_CLASSES.has(d.mark)) fail(id, `claim ${d.id} carries defect class "${d.mark}" outside the taxonomy`);
        if (d.supportedBy !== null) fail(id, `claim ${d.id} is not supported but cites ${JSON.stringify(d.supportedBy)}`);
      }
      const classes = defects.map((d) => d.mark);
      if (new Set(classes).size !== classes.length) {
        fail(id, `SINGLE-DEFENSIBLE-CLAIM: two distractors fail the same way (${classes.join(', ')})`);
      }
      if (classes.length < 2) fail(id, `only ${classes.length} distractor(s)`);
    }
  }

  if (!isNum(ans.inferenceLayer) || ans.inferenceLayer < 1 || ans.inferenceLayer > 4) fail(id, `inferenceLayer ${ans.inferenceLayer}`);

  // ---- 4. lure taxonomy ----
  const rats = ans.distractorRationales || {};
  const ratKeys = Object.keys(rats);
  const cids = (claims || []).map((s) => s.id);
  if (ratKeys.length !== cids.length || !cids.every((k) => ratKeys.includes(k))) {
    fail(id, 'distractorRationales do not cover every claim');
  }
  const correctRats = ratKeys.filter((k) => rats[k] && lureLabel(rats[k]) === LURE_FOR_ROLE.supported);
  if (correctRats.length !== 1) fail(id, `expected exactly 1 "correct" rationale, got ${correctRats.length}`);
  else if (correctRats[0] !== ans.correctKey) fail(id, 'the "correct" rationale is not the correctKey');
  for (const k of ratKeys) {
    const r = rats[k];
    if (!r || !LURE_CLASSES.has(lureLabel(r))) fail(id, `rationale ${k} has unknown lure "${r && lureLabel(r)}"`);
    if (!r || typeof r.why !== 'string' || r.why.length < 10) fail(id, `rationale ${k} has no diagnostic explanation`);
  }
  // The lure label on every claim must match the role its structure declares,
  // or the taxonomy and the key would disagree about how a claim fails.
  if (Array.isArray(struct)) {
    for (const s of struct) {
      const want = LURE_FOR_ROLE[s.mark];
      const got = rats[s.id] ? lureLabel(rats[s.id]) : undefined;
      if (want && got !== want) fail(id, `claim ${s.id} is marked "${s.mark}" but labelled "${got}" (want "${want}")`);
    }
  }

  // ---- 6. reading gate + no audio ----
  if (Array.isArray(it.ageBands) && it.ageBands.includes('2-3') && Array.isArray(facts) && Array.isArray(claims)) {
    for (const s of [...facts, ...claims]) {
      if (s.text.length > MAX_STATEMENT_CHARS_LOW) fail(id, `grade 2-3 reading gate: line too long (${s.text.length} chars) "${s.text}"`);
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
{
  const total = Object.values(keyPositions).reduce((a, b) => a + b, 0);
  const modal = total ? Math.max(...Object.values(keyPositions)) / total : 0;
  if (Object.keys(keyPositions).length <= 1) {
    fail('anti-cue', 'the supported claim is always in the same position');
  } else if (modal > MAX_KEY_POSITION_SHARE) {
    fail('anti-cue', `the supported claim sits in one position ${(modal * 100).toFixed(0)}% of the time (${JSON.stringify(keyPositions)})`);
  }
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
console.log(`supported-claim position:  ${JSON.stringify(keyPositions)}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — schema exact, no key leak in content, exactly one defensible claim re-derived for all 120 keyed items, coverage 1..20 with >=5 per bucket, reading gate and no-audio hold, key position balanced, bank reproducible.');
