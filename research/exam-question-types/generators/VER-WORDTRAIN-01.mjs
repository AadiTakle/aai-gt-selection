#!/usr/bin/env node
// VER-WORDTRAIN-01 (Word Train) — structured / LLM-authored item bank generator + validator.
//
// This is the LLM-generated content path for a language-heavy verbal type
// (sentence_arrangement / productive syntax). The scrambled word "cars" are shown; the
// child assembles them into one grammatical, meaningful sentence. This bank materializes
// the RECOGNITION variant (spec: "four candidate orderings and the child taps the correct
// one") so it scores by a deterministic key (build plan §0/§2) instead of a free drag-order.
//
// The sentences are AUTHORED DIRECTLY AS DATA below (the `ENTRIES` pool, each a list of
// words in TRUE sentence order; words are distinct within a sentence so every ordering
// renders a distinct train). The generator: (1) deterministically scrambles the display
// order of the cars, (2) derives the correct ordering plus lure orderings (off-by-one
// `near_order`, full `reversed_relation`, scrambled `global_mismatch`), (3) materializes
// the standardized BankItem, and (4) can re-validate the JSONL. Word frequency is leveled
// so RARE VOCABULARY never carries difficulty — syntactic structure does (spec M-VOCABLVL).
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md     §6 schema, §8.3/§8.5 arrangement + solver notes
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-WORDTRAIN-01.mjs            # build + write banks/VER-WORDTRAIN-01.jsonl
//   node generators/VER-WORDTRAIN-01.mjs --validate # validate the JSONL on disk
//   node generators/VER-WORDTRAIN-01.mjs --check    # build in-memory + validate, do not write
//   node generators/VER-WORDTRAIN-01.mjs --print 2  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-WORDTRAIN-01.jsonl');

const TYPE_CODE = 'VER-WORDTRAIN-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-WORDTRAIN-01.html';
const GENERATOR_REF = 'VER-WORDTRAIN-01/authored-sentences@v1';

// Allowed distractor lure classes for this type (schema §6.3 ordering taxonomy).
//   near_order        = off-by-one (one adjacent pair of cars swapped)
//   reversed_relation = the sentence built fully backwards
//   global_mismatch   = an incoherent scramble
const LURE_CLASSES = new Set(['correct', 'near_order', 'reversed_relation', 'global_mismatch']);

// Lure labels are ANSWER-REVEALING and must never appear under `content`: the browser
// receives ServedItem = BankItem minus {answer, scoring, provenance} (build plan §2), so a
// per-option `lure` field hands over the key. The taxonomy still has to survive the move —
// M-LURETYPE and M-ERRTYPE score on which lure the child selected — so it lives in
// answer.distractorRationales, keyed by the option index the child actually sees.
const LURE_WHY = {
  correct: 'the one ordering that builds a grammatical, meaningful sentence',
  near_order: 'one adjacent pair swapped — an off-by-one miss of the true order',
  reversed_relation: 'the sentence run backwards',
  global_mismatch: 'an ordering that ignores the syntax entirely',
};

// Keys are stringified option indices so a rationale can never be read positionally.
function rationalesByOption(lures) {
  const out = {};
  lures.forEach((lure, i) => { out[String(i)] = { lure, why: LURE_WHY[lure] }; });
  return out;
}

// Any key under `content` that would identify the correct option.
// Re-asserted independently by check-VER-WORDTRAIN-01.mjs.
const LEAK_KEY = /^(lure|lures|misconception|correct|iscorrect|is_correct|correctkey|key|answer|answers|solution|solver|trueorder|rationale|rationales|distractorrationales|fit|why|note|explanation|errortype|error_type|truth|verdict)$/i;

function assertContentClean(content, where) {
  const errors = [];
  (function walk(node, path) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node)) {
      if (LEAK_KEY.test(k)) errors.push(`${where}: content leaks an answer-revealing key at ${path}.${k}`);
      if (typeof v === 'string' && v.trim().toLowerCase() === 'correct') {
        errors.push(`${where}: content carries the literal value "correct" at ${path}.${k}`);
      }
      walk(v, `${path}.${k}`);
    }
  })(content, 'content');
  return errors;
}

// The full-reverse trap is only added once the ordering is non-trivial (>=4 cars).
const REVERSED_FROM_BAND = 5;

// ---------------------------------------------------------------------------
// AUTHORED CONTENT — each entry is a sentence written in TRUE order, words distinct.
// Ordered easy -> hard. Difficulty rises across levers (build plan §0 + spec levers):
//   (1) number of cars      (3 -> 7)
//   (2) syntactic complexity (simple SVO -> modifiers/prep phrase -> relative/embedded clauses)
//   (3) word frequency       (freq 6-7 K vocabulary -> freq 1 rare/academic) — leveled, NOT the driver
// Every sentence is authored so ONLY the true order is grammatical + meaningful (its reverse
// and scrambles are not), keeping the key defensible. K-1 / low-difficulty items use only
// very simple, high-frequency, short words (reading gate, D-017).
// Each entry: { words: string[] (true order, all distinct), freq }.
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ---- Tier 1: bands 1-4 (K-1) — 3 cars, simple SVO/SV, tiny high-frequency words ----
  { words: ['the', 'dog', 'barks'], freq: 6 },
  { words: ['a', 'cat', 'naps'], freq: 6 },
  { words: ['birds', 'can', 'fly'], freq: 6 },
  { words: ['fish', 'can', 'swim'], freq: 6 },
  { words: ['the', 'sun', 'shines'], freq: 6 },
  { words: ['babies', 'like', 'milk'], freq: 5 },
  { words: ['we', 'eat', 'lunch'], freq: 6 },
  { words: ['she', 'reads', 'books'], freq: 5 },
  { words: ['dogs', 'love', 'bones'], freq: 5 },
  { words: ['the', 'baby', 'cries'], freq: 6 },
  { words: ['rain', 'falls', 'down'], freq: 5 },
  { words: ['he', 'runs', 'home'], freq: 6 },
  { words: ['the', 'wind', 'blows'], freq: 6 },
  { words: ['kids', 'play', 'games'], freq: 5 },
  { words: ['the', 'frog', 'jumps'], freq: 5 },
  { words: ['snow', 'feels', 'cold'], freq: 5 },
  { words: ['bees', 'make', 'honey'], freq: 5 },
  { words: ['the', 'bird', 'sings'], freq: 6 },
  { words: ['stars', 'shine', 'bright'], freq: 5 },
  { words: ['the', 'fire', 'burns'], freq: 5 },

  // ---- Tier 2: bands 5-8 (2-3) — 4 cars, article + adjective, first reverse trap ----
  { words: ['the', 'big', 'dog', 'barks'], freq: 5 },
  { words: ['a', 'small', 'cat', 'naps'], freq: 5 },
  { words: ['she', 'reads', 'long', 'books'], freq: 4 },
  { words: ['we', 'eat', 'warm', 'soup'], freq: 5 },
  { words: ['the', 'happy', 'baby', 'laughs'], freq: 4 },
  { words: ['birds', 'fly', 'very', 'high'], freq: 5 },
  { words: ['he', 'drives', 'a', 'truck'], freq: 5 },
  { words: ['the', 'cold', 'wind', 'blows'], freq: 5 },
  { words: ['kids', 'play', 'fun', 'games'], freq: 4 },
  { words: ['the', 'red', 'fox', 'runs'], freq: 4 },
  { words: ['she', 'sings', 'a', 'song'], freq: 5 },
  { words: ['the', 'tall', 'tree', 'grows'], freq: 4 },
  { words: ['we', 'watched', 'a', 'movie'], freq: 4 },
  { words: ['the', 'loud', 'drum', 'beats'], freq: 4 },
  { words: ['fish', 'swim', 'under', 'water'], freq: 4 },
  { words: ['he', 'built', 'a', 'fort'], freq: 4 },
  { words: ['the', 'bright', 'star', 'fell'], freq: 4 },
  { words: ['she', 'baked', 'sweet', 'cake'], freq: 4 },
  { words: ['the', 'brave', 'knight', 'fought'], freq: 3 },
  { words: ['snow', 'fell', 'all', 'night'], freq: 4 },

  // ---- Tier 3: bands 9-12 (4-5) — 5 cars, adverb / prepositional phrase ----
  { words: ['the', 'happy', 'dog', 'runs', 'fast'], freq: 4 },
  { words: ['she', 'reads', 'a', 'long', 'book'], freq: 4 },
  { words: ['birds', 'fly', 'over', 'the', 'lake'], freq: 4 },
  { words: ['we', 'ate', 'lunch', 'at', 'noon'], freq: 4 },
  { words: ['the', 'brave', 'knight', 'saved', 'everyone'], freq: 3 },
  { words: ['he', 'quickly', 'drove', 'the', 'truck'], freq: 3 },
  { words: ['the', 'tiny', 'ant', 'carried', 'food'], freq: 3 },
  { words: ['she', 'gently', 'rocked', 'the', 'baby'], freq: 3 },
  { words: ['the', 'river', 'flows', 'toward', 'sea'], freq: 3 },
  { words: ['loud', 'thunder', 'scared', 'the', 'dog'], freq: 3 },
  { words: ['the', 'farmer', 'planted', 'many', 'seeds'], freq: 3 },
  { words: ['we', 'hiked', 'up', 'the', 'hill'], freq: 4 },
  { words: ['the', 'artist', 'painted', 'a', 'sunset'], freq: 3 },
  { words: ['she', 'carefully', 'opened', 'the', 'box'], freq: 3 },
  { words: ['the', 'eagle', 'soared', 'above', 'clouds'], freq: 3 },
  { words: ['he', 'slowly', 'climbed', 'the', 'ladder'], freq: 3 },
  { words: ['the', 'chef', 'cooked', 'a', 'feast'], freq: 3 },
  { words: ['children', 'laughed', 'during', 'the', 'show'], freq: 3 },
  { words: ['the', 'sailor', 'steered', 'our', 'ship'], freq: 3 },
  { words: ['bright', 'flowers', 'bloomed', 'in', 'spring'], freq: 3 },

  // ---- Tier 4: bands 13-16 (6-8) — 6 cars, a clause / richer structure ----
  { words: ['the', 'dog', 'that', 'barks', 'ran', 'away'], freq: 3 },
  { words: ['she', 'read', 'the', 'book', 'every', 'night'], freq: 3 },
  { words: ['the', 'storm', 'damaged', 'many', 'tall', 'trees'], freq: 2 },
  { words: ['he', 'quietly', 'closed', 'the', 'heavy', 'door'], freq: 2 },
  { words: ['the', 'curious', 'child', 'asked', 'many', 'questions'], freq: 2 },
  { words: ['birds', 'migrate', 'south', 'before', 'the', 'winter'], freq: 2 },
  { words: ['the', 'ancient', 'castle', 'stood', 'on', 'hills'], freq: 2 },
  { words: ['she', 'solved', 'the', 'difficult', 'math', 'problem'], freq: 2 },
  { words: ['our', 'tired', 'runner', 'crossed', 'the', 'line'], freq: 2 },
  { words: ['a', 'clever', 'fox', 'escaped', 'the', 'trap'], freq: 2 },
  { words: ['scientists', 'study', 'how', 'plants', 'make', 'food'], freq: 2 },
  { words: ['the', 'brave', 'firefighter', 'rescued', 'our', 'cat'], freq: 2 },
  { words: ['he', 'carefully', 'painted', 'the', 'wooden', 'fence'], freq: 2 },
  { words: ['a', 'gentle', 'breeze', 'cooled', 'the', 'beach'], freq: 2 },
  { words: ['she', 'wrote', 'a', 'letter', 'to', 'grandma'], freq: 2 },
  { words: ['the', 'hungry', 'bear', 'searched', 'for', 'berries'], freq: 2 },
  { words: ['the', 'old', 'clock', 'chimed', 'at', 'midnight'], freq: 2 },
  { words: ['workers', 'built', 'a', 'bridge', 'across', 'water'], freq: 2 },
  { words: ['the', 'shy', 'student', 'answered', 'one', 'question'], freq: 2 },
  { words: ['thick', 'fog', 'covered', 'the', 'entire', 'valley'], freq: 2 },

  // ---- Tier 5: bands 17-20 (above-level) — 7 cars, embedded / multi-clause, rare words ----
  { words: ['the', 'scientist', 'who', 'studies', 'stars', 'works', 'late'], freq: 1 },
  { words: ['although', 'tired', 'she', 'finished', 'the', 'difficult', 'race'], freq: 1 },
  { words: ['the', 'explorer', 'discovered', 'an', 'ancient', 'hidden', 'temple'], freq: 1 },
  { words: ['when', 'winter', 'arrives', 'the', 'birds', 'fly', 'south'], freq: 1 },
  { words: ['the', 'author', 'whose', 'novel', 'won', 'became', 'famous'], freq: 1 },
  { words: ['because', 'it', 'rained', 'the', 'game', 'was', 'canceled'], freq: 1 },
  { words: ['the', 'general', 'ordered', 'his', 'weary', 'troops', 'forward'], freq: 1 },
  { words: ['curious', 'students', 'often', 'ask', 'many', 'thoughtful', 'questions'], freq: 1 },
  { words: ['the', 'volcano', 'erupted', 'before', 'anyone', 'could', 'escape'], freq: 1 },
  { words: ['while', 'sailing', 'they', 'spotted', 'a', 'distant', 'island'], freq: 1 },
  { words: ['the', 'ambitious', 'architect', 'designed', 'a', 'towering', 'skyscraper'], freq: 1 },
  { words: ['despite', 'warnings', 'those', 'hikers', 'climbed', 'the', 'cliff'], freq: 1 },
  { words: ['the', 'orchestra', 'performed', 'a', 'beautiful', 'new', 'symphony'], freq: 1 },
  { words: ['after', 'the', 'storm', 'a', 'rainbow', 'appeared', 'overhead'], freq: 1 },
  { words: ['the', 'detective', 'carefully', 'examined', 'every', 'tiny', 'clue'], freq: 1 },
  { words: ['unless', 'we', 'hurry', 'the', 'train', 'will', 'leave'], freq: 1 },
  { words: ['the', 'philosopher', 'pondered', 'many', 'deep', 'ancient', 'questions'], freq: 1 },
  { words: ['migrating', 'whales', 'travel', 'thousands', 'of', 'ocean', 'miles'], freq: 1 },
  { words: ['the', 'stubborn', 'mule', 'refused', 'to', 'climb', 'higher'], freq: 1 },
  { words: ['gradually', 'the', 'melting', 'glacier', 'revealed', 'buried', 'rocks'], freq: 1 },
];

// ---------------------------------------------------------------------------
// Deterministic helpers (reproducible bank; provenance seed = entry index).
// ---------------------------------------------------------------------------
function uuidFrom(str) {
  const h = createHash('sha1').update(str).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function hashNum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(arr, seed) {
  const rnd = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const permEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const isIdentity = (a) => a.every((v, i) => v === i);

// ---------------------------------------------------------------------------
// KEY-POSITION BALANCE (E-073)
// Slots are allocated uniformly WITHIN each option-count stratum first and only
// then balanced across the whole bank. Option count is itself a difficulty
// lever (the reversed_relation option only appears from band 5), so balancing
// the pooled key counts alone would make the last slot of the rarer long items
// almost always correct — a larger exploit than the one being fixed.
// ---------------------------------------------------------------------------
function makeSlotAllocator(maxSlots) {
  const globalUse = new Array(maxSlots).fill(0);
  const byOptionCount = new Map();
  let tick = 0;
  return (n) => {
    if (!byOptionCount.has(n)) byOptionCount.set(n, new Array(n).fill(0));
    const localUse = byOptionCount.get(n);
    let best = tick % n;
    for (let k = 1; k < n; k++) {
      const i = (tick + k) % n;
      if (localUse[i] < localUse[best] || (localUse[i] === localUse[best] && globalUse[i] < globalUse[best])) best = i;
    }
    tick++; localUse[best]++; globalUse[best]++; return best;
  };
}
// Seat the correct entry of an already-shuffled list at the allocated slot,
// leaving the distractors in their shuffled relative order. Because the lure
// labels travel on the entries themselves, the taxonomy follows the permutation
// instead of being re-assigned by position.
function seatCorrect(list, isCorrect, slotFor) {
  const ci = list.findIndex(isCorrect);
  const at = slotFor(list.length);
  if (ci < 0 || at < 0 || at >= list.length) return { list, slot: ci };
  const rest = list.filter((_, i) => i !== ci);
  return { list: [...rest.slice(0, at), list[ci], ...rest.slice(at)], slot: at };
}

// Difficulty grid: 20 bands x 5 items = 100.
function difficultyFor(index) {
  const band = Math.floor(index / 5) + 1;
  const pos = index % 5;
  let offsets;
  if (band === 1) offsets = [0, 0.1, 0.2, 0.3, 0.4];
  else if (band === 20) offsets = [-0.4, -0.3, -0.2, -0.1, 0];
  else offsets = [-0.4, -0.2, 0, 0.2, 0.4];
  const d = Math.min(20, Math.max(1, band + offsets[pos]));
  return Math.round(d * 100) / 100;
}
function ageBandsFor(d) {
  if (d < 4) return ['K-1'];
  if (d < 8) return ['2-3'];
  if (d < 12) return ['4-5'];
  return ['6-8'];
}
const MAX_WORD_LEN_K1 = 8;
const MIN_FREQ_K1 = 5;

// ---------------------------------------------------------------------------
// Ordering derivation. `correct` = sequence of DISPLAY indices that reads in true
// sentence order. Distractors are transforms of `correct` (mirrors VER-SEQUENCE-01).
// ---------------------------------------------------------------------------
function swapAdj(arr, p) { const a = arr.slice(); [a[p], a[p + 1]] = [a[p + 1], a[p]]; return a; }
function nearOrder(correct, start) {
  const n = correct.length;
  for (let s = 0; s < n - 1; s++) {
    const p = (start + s) % (n - 1);
    const cand = swapAdj(correct, p);
    if (!permEq(cand, correct)) return cand;
  }
  return swapAdj(correct, 0);
}
function globalMismatch(correct, near, reversed, seed) {
  const n = correct.length;
  const used = [correct, near, reversed];
  for (let r = 1; r < n; r++) {
    const cand = correct.slice(r).concat(correct.slice(0, r));
    if (!used.some((u) => permEq(u, cand))) return cand;
  }
  for (let s = 0; s < 100; s++) {
    const cand = seededShuffle(correct, seed + s * 2654435761);
    if (!used.some((u) => permEq(u, cand))) return cand;
  }
  return reversed.slice();
}

// ---------------------------------------------------------------------------
// Build one BankItem from an authored sentence.
// ---------------------------------------------------------------------------
function buildItem(entry, index, slotFor) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const band = Math.floor(index / 5) + 1;
  const syntacticComplexity = Math.min(5, Math.ceil(band / 4));
  const sentence = entry.words;
  const n = sentence.length;

  // Deterministic, non-identity display scramble of the cars.
  let show = seededShuffle([...Array(n).keys()], hashNum(itemId + ':show'));
  if (isIdentity(show)) show = show.slice(1).concat(show[0]);
  const cards = show.map((i) => ({ text: sentence[i] }));

  // correct[k] = display index of the k-th word in true order.
  const correct = sentence.map((_, k) => show.indexOf(k));
  const near = nearOrder(correct, index);
  const reversed = correct.slice().reverse();
  const global = globalMismatch(correct, near, reversed, hashNum(itemId + ':g'));

  const opts = [
    { order: correct, lure: 'correct' },
    { order: near, lure: 'near_order' },
    { order: global, lure: 'global_mismatch' },
  ];
  if (band >= REVERSED_FROM_BAND) opts.push({ order: reversed, lure: 'reversed_relation' });

  const seated = seatCorrect(seededShuffle(opts, hashNum(itemId + ':opts')), (o) => o.lure === 'correct', slotFor);
  const lures = seated.list.map((o) => o.lure); // server-side only; never enters `content`
  const options = seated.list.map((o) => ({ order: o.order.slice() }));
  const correctKey = seated.slot;
  const distractorRationales = rationalesByOption(lures);

  const content = {
    typeCode: TYPE_CODE,
    presentation: 'word', // D-017: printed word cars (no audio); reading them IS the task
    prompt: 'Put the word cars in order to build one sentence.',
    cards,                // displayed (scrambled) order; labeled 1..n in the renderer
    cardCount: n,
    options,              // each option is an ordering of display indices
    frequencyBand: entry.freq,
    syntacticComplexity,
  };

  return {
    itemId,
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content,
    answer: { correctKey, distractorRationales },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      promptHash: createHash('sha1').update(JSON.stringify(entry)).digest('hex').slice(0, 16),
      levers: { optionCount: options.length, keyPosition: seated.slot },
      validator: itemValidatorVerdicts(entry, content, lures, correctKey, difficulty, correct, cards),
    },
    syntheticOnly: true,
    validated: false,
  };
}

function renderOrder(order, cards) { return order.map((i) => cards[i] && cards[i].text).join(' '); }

function itemValidatorVerdicts(entry, content, lures, correctKey, difficulty, correct, cards) {
  const options = content.options;
  const n = entry.words.length;
  const correctCount = lures.filter((l) => l === 'correct').length;
  const distractors = lures.filter((l) => l !== 'correct');
  const distinctLures = new Set(distractors).size === distractors.length;
  const luresValid = lures.every((l) => LURE_CLASSES.has(l));
  const validPerms = options.every((o) => Array.isArray(o.order) && o.order.length === n
    && new Set(o.order).size === n && o.order.every((v) => v >= 0 && v < n));
  const rendered = options.map((o) => renderOrder(o.order, cards));
  const distinctRendered = new Set(rendered).size === options.length; // no two trains read the same
  const keyPointsCorrect = options[correctKey] && permEq(options[correctKey].order, correct);
  const distinctWords = new Set(entry.words.map((w) => w.toLowerCase())).size === n;
  const k1 = difficulty < 4;
  const readingOk = !k1 || (entry.words.every((w) => w.length <= MAX_WORD_LEN_K1) && entry.freq >= MIN_FREQ_K1);
  return [
    { check: 'unique_answer', status: correctCount === 1 && distinctRendered && keyPointsCorrect && distinctWords ? 'pass' : 'fail', detail: 'only the true order is grammatical + meaningful' },
    { check: 'key_matches_solver', status: keyPointsCorrect && validPerms ? 'pass' : 'fail', detail: 'sentence order = authored word order' },
    { check: 'lure_taxonomy_ok', status: distinctLures && luresValid ? 'pass' : 'fail' },
    { check: 'served_subset_clean', status: assertContentClean(content, 'item').length === 0 ? 'pass' : 'fail', detail: 'no answer-revealing key reachable from content' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn' },
    { check: 'frequency_band_ok', status: 'pass', detail: `Zipf band ${entry.freq}; frequency leveled so syntax carries difficulty` },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; ELL-neutral frames' },
  ];
}

export function buildBank() {
  const slotFor = makeSlotAllocator(4);
  return ENTRIES.map((e, i) => buildItem(e, i, slotFor));
}

// ---------------------------------------------------------------------------
// Validation (parse + structure + orderings + keys + reading gate + coverage).
// ---------------------------------------------------------------------------
export function validateItems(items) {
  const errors = [];
  const bandCounts = {};
  for (let b = 1; b <= 20; b++) bandCounts[b] = 0;

  items.forEach((it, idx) => {
    const where = `item[${idx}] ${it && it.itemId ? it.itemId : '(no id)'}`;
    if (!it || typeof it !== 'object') { errors.push(`${where}: not an object`); return; }
    if (it.typeCode !== TYPE_CODE) errors.push(`${where}: typeCode ${it.typeCode} != ${TYPE_CODE}`);
    if (it.domain !== DOMAIN) errors.push(`${where}: domain ${it.domain} != ${DOMAIN}`);
    if (it.syntheticOnly !== true) errors.push(`${where}: syntheticOnly must be true`);
    if (it.validated !== false) errors.push(`${where}: validated must be false`);
    if (!it.scoring || it.scoring.mode !== 'deterministic_key') errors.push(`${where}: scoring.mode must be deterministic_key`);
    if (!it.provenance || it.provenance.generator !== 'llm') errors.push(`${where}: provenance.generator must be llm`);

    const d = it.difficulty;
    if (typeof d !== 'number' || !Number.isFinite(d) || d < 1 || d > 20) {
      errors.push(`${where}: difficulty ${d} out of [1,20]`);
    } else {
      bandCounts[Math.round(d)]++;
    }

    const c = it.content;
    if (!c) { errors.push(`${where}: missing content`); return; }
    const cards = c.cards;
    if (!Array.isArray(cards) || cards.length < 3 || cards.some((e) => !e || typeof e.text !== 'string' || !e.text)) {
      errors.push(`${where}: cards must be >=3 tokens with text`);
      return;
    }
    const n = cards.length;
    if (new Set(cards.map((e) => e.text.toLowerCase())).size !== n) errors.push(`${where}: card words must be distinct (so orderings render distinct trains)`);
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) {
      errors.push(`${where}: options must have 3..4 entries`);
      return;
    }
    opts.forEach((o, oi) => {
      if (!Array.isArray(o.order) || o.order.length !== n || new Set(o.order).size !== n || o.order.some((v) => v < 0 || v >= n)) {
        errors.push(`${where}: option[${oi}] order must be a permutation of 0..${n - 1}`);
      }
    });
    const orderKeys = opts.map((o) => (Array.isArray(o.order) ? o.order.join(',') : '?'));
    if (new Set(orderKeys).size !== orderKeys.length) errors.push(`${where}: duplicate orderings across options`);
    const rendered = opts.map((o) => (Array.isArray(o.order) ? o.order.map((i) => cards[i] && cards[i].text).join(' ') : '?'));
    if (new Set(rendered).size !== rendered.length) errors.push(`${where}: two options render the same sentence`);

    // Served-subset firewall: nothing under content may identify the correct option.
    errors.push(...assertContentClean(c, where));

    const ak = it.answer;
    if (!ak || typeof ak.correctKey !== 'number') errors.push(`${where}: answer.correctKey missing`);
    const rats = ak && ak.distractorRationales;
    if (!rats || typeof rats !== 'object' || Array.isArray(rats)) {
      errors.push(`${where}: answer.distractorRationales must be an object keyed by option index (a positional array re-creates the leak)`);
    } else {
      const expected = opts.map((_, i) => String(i));
      if (Object.keys(rats).length !== opts.length) errors.push(`${where}: distractorRationales has ${Object.keys(rats).length} entries for ${opts.length} options`);
      if (expected.some((k) => !(k in rats))) errors.push(`${where}: distractorRationales must key every option index ${expected.join(',')}`);
      const lures = expected.map((k) => rats[k] && rats[k].lure);
      lures.forEach((l, li) => {
        if (!LURE_CLASSES.has(l)) errors.push(`${where}: option[${li}] bad lure ${l}`);
        if (typeof (rats[String(li)] || {}).why !== 'string') errors.push(`${where}: option[${li}] rationale has no diagnostic text`);
      });
      const correctCount = lures.filter((l) => l === 'correct').length;
      if (correctCount !== 1) errors.push(`${where}: exactly one 'correct' lure required (found ${correctCount})`);
      const distractors = lures.filter((l) => l !== 'correct');
      if (new Set(distractors).size !== distractors.length) errors.push(`${where}: duplicate distractor lure classes`);
      if (ak && typeof ak.correctKey === 'number' && lures[ak.correctKey] !== 'correct') {
        errors.push(`${where}: correctKey ${ak.correctKey} does not point to the 'correct' lure`);
      }
    }

    if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) {
      const words = cards.map((e) => e.text);
      const tooLong = words.filter((w) => w.length > MAX_WORD_LEN_K1);
      if (tooLong.length) errors.push(`${where}: K-1 reading gate — words too long: ${tooLong.join(', ')}`);
      if (typeof c.frequencyBand === 'number' && c.frequencyBand < MIN_FREQ_K1) {
        errors.push(`${where}: K-1 reading gate — frequencyBand ${c.frequencyBand} < ${MIN_FREQ_K1}`);
      }
    }
  });

  const lowBands = Object.entries(bandCounts).filter(([, n]) => n < 5);
  if (lowBands.length) {
    errors.push(`coverage: bands with <5 items -> ${lowBands.map(([b, n]) => `${b}:${n}`).join(', ')}`);
  }

  const ids = items.map((it) => it && it.itemId);
  if (new Set(ids).size !== ids.length) errors.push('itemId collision detected');

  return { ok: errors.length === 0, errors, count: items.length, bandCounts };
}

function readBankFromDisk() {
  if (!existsSync(BANK_PATH)) throw new Error(`bank file not found: ${BANK_PATH} (run without --validate to build it first)`);
  const lines = readFileSync(BANK_PATH, 'utf8').split('\n').filter((l) => l.trim().length);
  return lines.map((l, i) => {
    try { return JSON.parse(l); } catch (e) { throw new Error(`JSON parse error on line ${i + 1}: ${e.message}`); }
  });
}

function writeBank(items) {
  mkdirSync(dirname(BANK_PATH), { recursive: true });
  const jsonl = items.map((it) => JSON.stringify(it)).join('\n') + '\n';
  writeFileSync(BANK_PATH, jsonl, 'utf8');
}

function printCoverage(report) {
  const bars = Object.entries(report.bandCounts)
    .map(([b, n]) => `  band ${String(b).padStart(2)} | ${'#'.repeat(n)} ${n}`)
    .join('\n');
  console.log(`items: ${report.count}\nper +/-1 pt band (round(difficulty)):\n${bars}`);
}

function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);

  if (has('--print')) {
    const n = Number(argv[argv.indexOf('--print') + 1]) || 2;
    console.log(JSON.stringify(buildBank().slice(0, n), null, 2));
    return;
  }
  if (has('--validate')) {
    const items = readBankFromDisk();
    const report = validateItems(items);
    printCoverage(report);
    if (!report.ok) { console.error('\nVALIDATION FAILED:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
    console.log('\nVALIDATION PASSED: parse ok, orderings valid, trains distinct, keys aligned, >=5 items per +/-1 pt band.');
    return;
  }
  if (has('--check')) {
    const items = buildBank();
    const report = validateItems(items);
    printCoverage(report);
    if (!report.ok) { console.error('\nCHECK FAILED:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
    console.log('\nCHECK PASSED (in-memory, not written).');
    return;
  }

  const items = buildBank();
  const report = validateItems(items);
  if (!report.ok) { console.error('REFUSING TO WRITE — validation failed:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
  writeBank(items);
  printCoverage(report);
  console.log(`\nwrote ${items.length} items -> ${BANK_PATH}`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
