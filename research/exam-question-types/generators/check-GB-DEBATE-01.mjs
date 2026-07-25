// Independent validator for the GB-DEBATE-01 structured bank.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line carries EXACTLY the BankItem key set (BUILD_PLAN §2).
//   2. Served-subset safety: neither `content` nor any option leaks a key, lure,
//      strength or evidence-model field.
//   3. SINGLE-SATISFIABILITY for BOTH keyed decisions, re-derived from the
//      semantic evidence model without reading `answer.correctKey`:
//        - exactly one support card is `discriminating` (its observation would
//          differ if the claim were false) and it is the support key;
//        - exactly one rebuttal card is `incompatibleWithRival` and it is the
//          rebuttal key;
//        - the support and rebuttal pools are DISJOINT, so the same card can
//          never be defensible for both questions;
//        - the standard used to rank the options is stated in the item text
//          (this is what makes "best evidence" a defensible key rather than an
//          opinion), so both goal strings must contain it.
//   4. Lure taxonomy per pool: one `correct`, every option covered, classes in
//      the declared taxonomy, every rationale explained (M-LURETYPE).
//   5. Difficulty coverage 1..20 with >=5 items per integer bucket.
//   6. Reading gate (D-017) on the lowest age band and no audio-bearing fields.
//   7. Topic reuse discipline: the three variants of one claim are far apart on
//      the difficulty scale and never repeat a card text.
//   8. Reproducibility: the on-disk bank equals a fresh build.
//
// Run:  node research/exam-question-types/generators/check-GB-DEBATE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildBank, TYPE_CODE, DOMAIN, ALLOWED_AGE_BANDS, SUPPORT_LURES, REBUT_LURES,
  MAX_WORD_LEN_LOW, MAX_CARD_CHARS_LOW,
} from './GB-DEBATE-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/GB-DEBATE-01.jsonl');
const MIN_PER_BUCKET = 5;

const BANK_ITEM_KEYS = [
  'itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated',
].sort();

const LEAK_FIELDS = [
  'answer', 'correctKey', 'correct', 'isCorrect', 'lure', 'lures', 'strength',
  'str', 'discriminating', 'incompatibleWithRival', 'evidenceModel', 'rationale',
  'distractorRationales', 'scoring', 'audio', 'audioUrl', 'speech', 'tts', 'icon',
];

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round2 = (x) => Math.round(x * 100) / 100;

// ---- 1. parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1}: ${e.message}`); }
});

const seenIds = new Set();
const byClaim = new Map();

function checkPool(id, label, options, model, key, rationales, allowedLures, flagField) {
  if (!Array.isArray(options) || options.length < 3 || options.length > 6) {
    fail(id, `${label}: option count ${options && options.length} outside 3..6`);
    return [];
  }
  const ids = options.map((o) => o && o.id);
  if (new Set(ids).size !== ids.length) fail(id, `${label}: duplicate option ids`);
  const texts = options.map((o) => o && o.text);
  if (new Set(texts).size !== texts.length) fail(id, `${label}: duplicate option text inside one pool`);
  for (const o of options) {
    if (!o || typeof o.id !== 'string' || typeof o.text !== 'string' || !o.text.trim()) fail(id, `${label}: option malformed`);
    if (Object.keys(o || {}).sort().join(',') !== 'id,text') fail(id, `${label}: option carries extra fields ${Object.keys(o || {})}`);
    for (const leak of LEAK_FIELDS) if (o && Object.prototype.hasOwnProperty.call(o, leak)) fail(id, `${label}: option leaks "${leak}"`);
  }

  // single-satisfiability, re-derived from the semantic model
  if (!Array.isArray(model) || model.length !== options.length) {
    fail(id, `${label}: evidenceModel does not align to the option pool`);
    return texts;
  }
  if (model.map((m) => m.id).join('|') !== ids.join('|')) fail(id, `${label}: evidenceModel ids out of option order`);
  const flagged = model.filter((m) => m[flagField] === true);
  if (flagged.length !== 1) {
    fail(id, `${label}: SINGLE-SATISFIABILITY — ${flagged.length} options satisfy "${flagField}" (want exactly 1)`);
  } else if (flagged[0].id !== key) {
    fail(id, `${label}: key "${key}" != re-derived key "${flagged[0].id}"`);
  }

  // lure taxonomy
  const ratKeys = Object.keys(rationales || {});
  if (ratKeys.length !== ids.length || !ids.every((k) => ratKeys.includes(k))) fail(id, `${label}: rationales do not cover every option`);
  const corrects = ratKeys.filter((k) => rationales[k] && lureLabel(rationales[k]) === 'correct');
  if (corrects.length !== 1) fail(id, `${label}: expected exactly 1 "correct" rationale, got ${corrects.length}`);
  else if (corrects[0] !== key) fail(id, `${label}: the "correct" rationale is not the key`);
  for (const k of ratKeys) {
    const r = rationales[k];
    if (!r || !allowedLures.has(lureLabel(r))) fail(id, `${label}: rationale ${k} has unknown lure "${r && lureLabel(r)}"`);
    if (!r || typeof r.why !== 'string' || r.why.length < 10) fail(id, `${label}: rationale ${k} has no diagnostic explanation`);
    // the model and the rationale must agree on the lure class
    const m = model.find((x) => x.id === k);
    // `model` holds the generator's raw cards, which still carry `lure`; only
    // the committed rationale has been through the normalizer.
    if (m && m.lure !== (r && lureLabel(r))) fail(id, `${label}: lure disagreement on ${k} (${m.lure} vs ${r && lureLabel(r)})`);
  }
  return texts;
}

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
  else if (!it.ageBands.every((b) => ALLOWED_AGE_BANDS.includes(b))) fail(id, `ageBands ${it.ageBands} outside the catalog spec (floor is 4-5)`);
  if (it.demoPath !== 'demos/GB-DEBATE-01.html') fail(id, `demoPath ${it.demoPath}`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'deterministic_key') fail(id, `scoring.mode ${it.scoring && it.scoring.mode}`);
  if (!it.provenance || !['grammar', 'llm', 'human'].includes(it.provenance.generator)) fail(id, 'provenance.generator invalid');
  if (!it.provenance || typeof it.provenance.seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};
  for (const leak of LEAK_FIELDS) if (Object.prototype.hasOwnProperty.call(c, leak)) fail(id, `content leaks "${leak}"`);
  if (c.presentation !== 'text') fail(id, `presentation ${c.presentation} (D-017 requires text)`);
  if (typeof c.claim !== 'string' || !c.claim.trim()) fail(id, 'claim missing');
  if (typeof c.rival !== 'string' || !c.rival.trim()) fail(id, 'rival missing');

  // The ranking standard MUST be stated in the item, otherwise "best evidence"
  // is an opinion and the key is not defensible.
  if (typeof c.supportGoal !== 'string' || !/would come out differently if the claim were false/.test(c.supportGoal)) {
    fail(id, 'supportGoal does not state the discrimination standard in the item');
  }
  if (typeof c.rebutGoal !== 'string' || !/cannot be true if the rival idea is right/.test(c.rebutGoal)) {
    fail(id, 'rebutGoal does not state the incompatibility standard in the item');
  }

  const ans = it.answer || {};
  const ck = ans.correctKey || {};
  if (typeof ck.support !== 'string' || typeof ck.rebut !== 'string') fail(id, 'correctKey must carry a support and a rebut key');

  const supTexts = checkPool(id, 'support', c.supportOptions, ans.evidenceModel && ans.evidenceModel.support,
    ck.support, ans.distractorRationales && ans.distractorRationales.support, SUPPORT_LURES, 'discriminating');
  const rebTexts = checkPool(id, 'rebut', c.rebutOptions, ans.evidenceModel && ans.evidenceModel.rebut,
    ck.rebut, ans.distractorRationales && ans.distractorRationales.rebut, REBUT_LURES, 'incompatibleWithRival');

  // pools must be disjoint — a shared card would be defensible in both phases
  const overlap = supTexts.filter((t) => rebTexts.includes(t));
  if (overlap.length) fail(id, `SINGLE-SATISFIABILITY: ${overlap.length} card(s) appear in both pools -> ${overlap[0]}`);

  // reading gate + no audio
  if (Array.isArray(it.ageBands) && it.ageBands.includes('4-5')) {
    for (const t of [...supTexts, ...rebTexts, c.claim, c.rival]) {
      if (typeof t !== 'string') continue;
      if (t.length > MAX_CARD_CHARS_LOW) fail(id, `grade 4-5 reading gate: text too long (${t.length} chars) "${t}"`);
      const longWords = t.split(/[\s-]+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter((w) => w.length > MAX_WORD_LEN_LOW);
      if (longWords.length) fail(id, `grade 4-5 reading gate: words too long -> ${longWords.join(', ')}`);
    }
  }
  const blob = JSON.stringify(c).toLowerCase();
  for (const term of ['audio', 'narrat', 'voiced', 'spoken label']) {
    if (blob.includes(term)) fail(id, `content mentions "${term}" — audio is prohibited (D-017)`);
  }

  if (!byClaim.has(c.claim)) byClaim.set(c.claim, []);
  byClaim.get(c.claim).push({
    id,
    d: it.difficulty,
    sig: JSON.stringify([supTexts.slice().sort(), rebTexts.slice().sort()]),
  });
}

// ---- 5. coverage ----
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

// ---- 7. topic reuse discipline ----
let minClaimGap = Infinity;
for (const [claim, group] of byClaim) {
  const short = claim.slice(0, 32);
  const ds = group.map((g) => g.d).sort((a, b) => a - b);
  for (let i = 1; i < ds.length; i++) minClaimGap = Math.min(minClaimGap, ds[i] - ds[i - 1]);
  if (ds.length > 1 && ds[1] - ds[0] < 4) {
    fail('topic-reuse', `"${short}..." has variants only ${round2(ds[1] - ds[0])} difficulty points apart`);
  }
  // Variants of one claim deliberately draw from the same authored card pool,
  // so overlap is expected; what must never happen is two items presenting the
  // IDENTICAL option set (that would be the same item served twice).
  const sigs = group.map((g) => g.sig);
  if (new Set(sigs).size !== sigs.length) fail('topic-reuse', `"${short}..." has two variants with an identical option set`);
}

// ---- 8. reproducibility ----
const rebuilt = buildBank().map(normalizeBankItem);
if (rebuilt.length !== items.length) fail('repro', `fresh build has ${rebuilt.length} items, disk has ${items.length}`);
else {
  for (let i = 0; i < items.length; i++) {
    if (JSON.stringify(rebuilt[i]) !== JSON.stringify(items[i])) { fail('repro', `item ${i} differs from a fresh build`); break; }
  }
}

console.log(`GB-DEBATE-01 bank check: ${items.length} items (${byClaim.size} claim topics x 3 variants)`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n):  ' + buckets.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min bucket density 1..19:  ${Math.min(...buckets.slice(0, 19))}`);
console.log(`smallest difficulty gap between two variants of one claim: ${round2(minClaimGap)}`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — schema exact, no key leak in content, both keys re-derived and single-satisfiable for all 120 items, pools disjoint, ranking standard stated in-item, coverage 1..20 with >=5 per bucket, reading gate and no-audio hold, bank reproducible.');
