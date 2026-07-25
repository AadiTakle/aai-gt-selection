// Independent validator for the VER-SENSE-01 structured bank.
//
// This file imports ONLY the curated LEXICON (the shared linguistic data) from the
// generator. The grammar and the plausibility model are RE-IMPLEMENTED here from the
// documented definitions, so a bug in the generator's model cannot validate itself.
//
// Checks (exit nonzero on any failure):
//   1. JSONL parses; every line is a BankItem with EXACTLY the contract key set (§2).
//   2. Served-subset safety: nothing in `content` exposes the key, the true order, or
//      the part-of-speech / semantic features a client could solve with.
//   3. SINGLE-SATISFIABILITY (the headline check for a verbal type): every ordering of
//      the item's cards is enumerated; exactly ONE may be grammatical AND plausible,
//      and it must be the ordering the recorded correctKey spells. At least one
//      ordering must be grammatical-but-absurd (the construct's required lure).
//   4. Every recorded lure label is re-derived here and must agree (M-LURETYPE).
//   5. Band density: >=5 items per integer difficulty bucket 1..19, span 1..20.
//   6. D-017: no audio anywhere in the item; vocabularyLevel present (M-VOCABLVL).
//
// Run:  node research/exam-question-types/generators/check-VER-SENSE-01.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEXICON, buildItem, LURE_CLASSES } from './VER-SENSE-01.mjs';
import { lureLabel, normalizeBankItem } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK = resolve(__dirname, '../banks/VER-SENSE-01.jsonl');
const ALLOWED_BANDS = ['2-3', '4-5', '6-8']; // catalog age_bands for VER-SENSE-01 (no K-1)
const MIN_PER_BUCKET = 5;
const CONTRACT_KEYS = ['itemId', 'typeCode', 'domain', 'difficulty', 'ageBands', 'demoPath',
  'content', 'answer', 'scoring', 'provenance', 'syntheticOnly', 'validated'];
const LEAK_NAMES = /^(answer|answers|correct|correctkey|iscorrect|key|keys|lure|lures|rationale|rationales|solution|solver|trueorder|order|pos|feats|features|rank|weight|strength|diet|eatenby)$/i;
const AUDIO_NAMES = /(\baudio|\bspeech|\bspeak|\butterance|\btts\b|\bsound\b|\bchime|\btones?\b|\bnarrat|\bvoice|\blisten)/i;

const failures = [];
const fail = (id, msg) => failures.push(`[${id}] ${msg}`);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const round2 = (x) => Math.round(x * 100) / 100;

// ===========================================================================
// Independent grammar + plausibility model (re-implemented from the documented
// rules; only the LEXICON word data is shared).
//   S  -> NP VP ;  NP -> ADJ? N ;  VP -> ADV? V NP? PP? ;  PP -> PREP NP
// ===========================================================================
function entry(w) { return LEXICON[w]; }
function feats(w) { return (entry(w) && entry(w).feats) || []; }

function parseSeq(words) {
  const tags = words.map((w) => (entry(w) ? entry(w).pos : null));
  if (tags.includes(null)) return null;
  let k = 0;
  function noun() {
    let adj = null;
    if (tags[k] === 'ADJ') adj = words[k++];
    if (tags[k] !== 'N') return null;
    return { adj, head: words[k++] };
  }
  const subject = noun();
  if (!subject) return null;
  let adverb = null;
  if (tags[k] === 'ADV') adverb = words[k++];
  if (tags[k] !== 'V') return null;
  const verb = words[k++];
  const vspec = entry(verb);
  let object = null;
  if (vspec.frame === 'tr') { object = noun(); if (!object) return null; }
  let prepPhrase = null;
  if (tags[k] === 'PREP') {
    const prep = words[k++];
    const inner = noun();
    if (!inner) return null;
    prepPhrase = { prep, np: inner };
  }
  return k === words.length ? { subject, adverb, verb, object, prepPhrase } : null;
}

function specOk(word, spec) {
  if (!spec) return true;
  const f = feats(word);
  if (spec.all && spec.all.some((t) => !f.includes(t))) return false;
  if (spec.any && !spec.any.some((t) => f.includes(t))) return false;
  if (spec.not && spec.not.some((t) => f.includes(t))) return false;
  return true;
}
function adjOk(adj, noun) {
  if (!adj) return true;
  const a = entry(adj), f = feats(noun);
  if ((a.blocks || []).some((t) => f.includes(t))) return false;
  return (a.fits || []).some((t) => f.includes(t));
}
// RELATION_RULES, re-stated independently:
//   chase  -> pursuer rank must exceed the pursued
//   eat    -> eater's diet must intersect the eaten's eatenBy
//   carry  -> carrier strength >= object weight
function relOk(rel, s, o) {
  if (!rel) return true;
  const S = entry(s), O = entry(o);
  if (rel === 'chase') return (S.rank || 0) > (O.rank || 0);
  if (rel === 'eat') return (S.diet || []).some((d) => (O.eatenBy || []).includes(d));
  if (rel === 'carry') return (S.strength || 0) >= (O.weight || 0);
  return true;
}
function plausible(tree) {
  if (!tree) return false;
  const v = entry(tree.verb);
  if (!adjOk(tree.subject.adj, tree.subject.head)) return false;
  if (!specOk(tree.subject.head, v.subj)) return false;
  if (tree.object) {
    if (!adjOk(tree.object.adj, tree.object.head)) return false;
    if (!specOk(tree.object.head, v.obj)) return false;
    if (tree.object.head === tree.subject.head) return false;
    if (!relOk(v.rel, tree.subject.head, tree.object.head)) return false;
  }
  if (tree.adverb && v.adv === false) return false;
  if (tree.prepPhrase) {
    const pp = tree.prepPhrase;
    if (!v.pp) return false;
    if (!v.pp.preps.includes(pp.prep)) return false;
    if (!specOk(pp.np.head, { any: v.pp.objAny })) return false;
    if (!specOk(pp.np.head, { any: entry(pp.prep).objAny })) return false;
    if (!adjOk(pp.np.adj, pp.np.head)) return false;
    if (pp.np.head === tree.subject.head) return false;
    if (tree.object && pp.np.head === tree.object.head) return false;
  }
  return true;
}
function permute(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    for (const rest of permute(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([arr[i], ...rest]);
  }
  return out;
}
function classify(words) {
  const tree = parseSeq(words);
  if (!tree) return 'ungrammatical';
  return plausible(tree) ? 'sensible' : 'absurd';
}

function walk(node, path, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`, visit)); return; }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) { visit(k, v, `${path}.${k}`); walk(v, `${path}.${k}`, visit); }
  }
}

// ---- 1. Parse ----
const raw = readFileSync(BANK, 'utf8').trim();
const lines = raw.length ? raw.split('\n') : [];
if (!lines.length) fail('parse', 'bank is empty');
const items = [];
lines.forEach((line, i) => {
  try { items.push(JSON.parse(line)); } catch (e) { fail('parse', `line ${i + 1}: ${e.message}`); }
});

const seenIds = new Set();
let ambiguous = 0, provedUnique = 0;

for (const it of items) {
  const id = it.itemId || '(no id)';

  // ---- contract shape ----
  if (!deepEq(Object.keys(it).sort(), CONTRACT_KEYS.slice().sort())) fail(id, `BankItem keys != contract set (${Object.keys(it).join(',')})`);
  if (typeof it.itemId !== 'string' || !/^[0-9a-f-]{36}$/.test(it.itemId)) fail(id, 'itemId is not a uuid');
  if (seenIds.has(it.itemId)) fail(id, 'duplicate itemId');
  seenIds.add(it.itemId);
  if (it.typeCode !== 'VER-SENSE-01') fail(id, `typeCode != VER-SENSE-01 (${it.typeCode})`);
  if (it.domain !== 'verbal') fail(id, `domain != verbal (${it.domain})`);
  if (!isNum(it.difficulty) || it.difficulty < 1 || it.difficulty > 20) fail(id, `difficulty not a float 1..20 (${it.difficulty})`);
  if (!Array.isArray(it.ageBands) || !it.ageBands.length) fail(id, 'ageBands empty');
  else if (!it.ageBands.every((b) => ALLOWED_BANDS.includes(b))) fail(id, `ageBand outside catalog spec (${it.ageBands})  [no K-1]`);
  if (it.demoPath !== 'demos/VER-SENSE-01.html') fail(id, `demoPath wrong (${it.demoPath})`);
  if (it.syntheticOnly !== true) fail(id, 'syntheticOnly must be true');
  if (it.validated !== false) fail(id, 'validated must be false');
  if (!it.scoring || it.scoring.mode !== 'computed_solver') fail(id, 'scoring.mode != computed_solver');
  if (!it.provenance || it.provenance.generator !== 'llm') fail(id, 'provenance.generator != llm');
  if (typeof (it.provenance || {}).seed !== 'string') fail(id, 'provenance.seed missing');

  const c = it.content || {};

  // ---- 2. served-subset safety ----
  walk(c, 'content', (k, v, path) => {
    if (LEAK_NAMES.test(k)) fail(id, `content leaks an answer/model field at ${path}`);
  });
  if (!Array.isArray(c.cards) || !c.cards.length) { fail(id, 'content.cards missing'); continue; }
  for (const card of c.cards) {
    if (!card || typeof card.text !== 'string') fail(id, 'card missing text');
    if (Object.keys(card).some((k) => k !== 'text')) fail(id, `card carries extra fields (${Object.keys(card)})`);
  }
  const cards = c.cards.map((x) => x.text);
  if (new Set(cards).size !== cards.length) fail(id, 'cards are not distinct (permutations would collide)');
  if (c.cardCount !== cards.length) fail(id, 'content.cardCount mismatch');
  if (!isNum(c.vocabularyLevel) || c.vocabularyLevel < 1 || c.vocabularyLevel > 7) fail(id, 'content.vocabularyLevel missing (M-VOCABLVL not derivable)');
  if (c.presentation !== 'word') fail(id, `content.presentation must be 'word' (${c.presentation})`);
  const answerSentence = it.answer.correctKey.split(',').map((i) => cards[Number(i)]).join(' ');
  if (JSON.stringify(c).includes(answerSentence)) fail(id, 'content embeds the assembled answer sentence');

  // ---- 6. D-017 audio scan ----
  walk(it, 'item', (k, v, path) => {
    if (AUDIO_NAMES.test(k)) fail(id, `audio-shaped field at ${path} (D-017 prohibits audio)`);
    if (typeof v === 'string' && AUDIO_NAMES.test(v) && !/no_audio|never audio|prohibit|printed/i.test(v)) fail(id, `audio-shaped value at ${path}: "${v}"`);
  });

  // ---- 3. SINGLE-SATISFIABILITY over every ordering of the cards ----
  const sensibleOrders = [], absurdOrders = [];
  for (const p of permute(cards)) {
    const kind = classify(p);
    if (kind === 'sensible') sensibleOrders.push(p);
    else if (kind === 'absurd') absurdOrders.push(p);
  }
  if (sensibleOrders.length !== 1) {
    ambiguous++;
    fail(id, `${sensibleOrders.length} defensible orderings (need exactly 1): ${sensibleOrders.map((p) => p.join(' ')).join(' | ') || '(none)'}`);
  } else {
    provedUnique++;
    if (sensibleOrders[0].join(' ') !== answerSentence) {
      fail(id, `the unique defensible ordering is "${sensibleOrders[0].join(' ')}" but correctKey spells "${answerSentence}"`);
    }
  }
  if (!absurdOrders.length) fail(id, 'no grammatical-but-absurd ordering exists — the plausibility contrast is missing');

  // ---- 4. lure labels re-derived ----
  const rats = it.answer.distractorRationales || {};
  let correctLabels = 0;
  for (const [key, r] of Object.entries(rats)) {
    if (!LURE_CLASSES.has(lureLabel(r))) { fail(id, `unknown lure class "${lureLabel(r)}"`); continue; }
    const idxs = key.split(',').map(Number);
    if (idxs.length !== cards.length || new Set(idxs).size !== cards.length || idxs.some((i) => !(i >= 0 && i < cards.length))) {
      fail(id, `rationale key "${key}" is not a permutation of the cards`);
      continue;
    }
    const order = idxs.map((i) => cards[i]);
    const kind = classify(order);
    if (lureLabel(r) === 'correct') {
      correctLabels++;
      if (kind !== 'sensible') fail(id, `key "${key}" labelled correct but the model says ${kind}`);
    } else if (lureLabel(r) === 'grammatical-but-absurd') {
      if (kind !== 'absurd') fail(id, `"${order.join(' ')}" labelled grammatical-but-absurd but the model says ${kind}`);
    } else if (kind !== 'ungrammatical') {
      fail(id, `"${order.join(' ')}" labelled ${lureLabel(r)} but it does parse (${kind})`);
    }
    if (typeof r.why !== 'string' || r.why.length < 8) fail(id, `rationale "${key}" has no usable diagnostic text`);
  }
  if (correctLabels !== 1) fail(id, `${correctLabels} rationales labelled correct (need exactly 1)`);
  if (!Object.values(rats).some((r) => lureLabel(r) === 'grammatical-but-absurd')) fail(id, 'no grammatical-but-absurd lure recorded (M-LURETYPE)');
  if (Object.keys(rats).length < 3) fail(id, `only ${Object.keys(rats).length} labelled orderings (want the answer + >=2 lures)`);

  // ---- reproducibility ----
  try {
    const regen = normalizeBankItem(buildItem(Number(it.provenance.seed)));
    if (!deepEq(regen, it)) fail(id, 'item is NOT reproducible from provenance.seed (generator drift)');
  } catch (e) { fail(id, `regeneration threw: ${e.message}`); }
  if (Math.round(it.difficulty) !== it.provenance.levers.band) fail(id, 'round(difficulty) != recorded band');
}

// ---- 5. Coverage ----
const diffs = items.map((i) => i.difficulty).filter(isNum);
const min = Math.min(...diffs), max = Math.max(...diffs);
if (!(min <= 1.5)) fail('coverage', `min difficulty ${round2(min)} > 1.5`);
if (!(max >= 19.5)) fail('coverage', `max difficulty ${round2(max)} < 19.5`);
const bins = Array.from({ length: 20 }, () => 0);
for (const d of diffs) { const k = Math.round(d); if (k >= 1 && k <= 20) bins[k - 1]++; }
bins.slice(0, 19).forEach((n, i) => { if (n < MIN_PER_BUCKET) fail('coverage', `integer bucket k=${i + 1} has ${n} items (<${MIN_PER_BUCKET})`); });

console.log(`VER-SENSE-01 bank check: ${items.length} items`);
console.log(`difficulty span: ${round2(min)} .. ${round2(max)}`);
console.log('per integer bucket (k:n):  ' + bins.map((n, i) => `${String(i + 1).padStart(2)}:${n}`).join(' '));
console.log(`min per-bucket density (1..19): ${Math.min(...bins.slice(0, 19))}`);
console.log(`single-satisfiability: ${provedUnique}/${items.length} items proved to have exactly one defensible ordering (${ambiguous} ambiguous)`);

if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures.slice(0, 40)) console.error('  - ' + f);
  if (failures.length > 40) console.error(`  ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('\nPASS — contract keys exact, no answer/model data in content, exactly one');
console.log('       defensible ordering per item (brute-forced over all permutations),');
console.log('       an absurd lure always present, labels re-derived, no audio (D-017),');
console.log('       coverage 1..20 with >=5 per bucket.');
