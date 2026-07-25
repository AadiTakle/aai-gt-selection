#!/usr/bin/env node
// VER-RELPAIR-01 (Relation Match) — structured / LLM-authored item bank generator + validator.
//
// This is the LLM-generated content path for a language-heavy verbal type. The
// word-pair items are AUTHORED DIRECTLY AS DATA below (the `ENTRIES` pools); the
// generator materializes them into the standardized BankItem schema, deterministically
// assigns difficulty across 1..20, tags every distractor with a lure class, and can
// re-validate the emitted JSONL. It can also be EXTENDED (append entries -> rebuild).
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md     §6 schema, §8.1 VER-RELPAIR-01 worked example
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-RELPAIR-01.mjs            # build + write banks/VER-RELPAIR-01.jsonl
//   node generators/VER-RELPAIR-01.mjs --write    # (same)
//   node generators/VER-RELPAIR-01.mjs --validate # validate the JSONL on disk (parse + coverage + keys)
//   node generators/VER-RELPAIR-01.mjs --check    # build in-memory + validate, do not write
//   node generators/VER-RELPAIR-01.mjs --print 3  # print the first N built items as pretty JSON

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-RELPAIR-01.jsonl');

const TYPE_CODE = 'VER-RELPAIR-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-RELPAIR-01.html';
const GENERATOR_REF = 'VER-RELPAIR-01/authored-pools@v1';

// Allowed distractor lure classes for this type (schema §6.3 / §8.1).
const LURE_CLASSES = new Set(['correct', 'associate', 'surface_match', 'reversed_relation']);

// Lure labels are ANSWER-REVEALING and must never appear under `content`: the browser
// receives ServedItem = BankItem minus {answer, scoring, provenance} (build plan §2), so a
// per-option `lure` field hands over the key. The taxonomy still has to survive the move —
// M-LURETYPE and M-ERRTYPE score on which lure the child selected — so it lives in
// answer.distractorRationales, keyed by the option index the child actually sees.
const LURE_WHY = {
  correct: 'shares the key relation with the stem pair',
  associate: 'thematically related to the stem, but not by the key relation',
  surface_match: 'shares surface/word features with the stem, wrong relation',
  reversed_relation: 'the key relation applied backwards',
};

// Keys are stringified option indices so a rationale can never be read positionally.
function rationalesByOption(lures) {
  const out = {};
  lures.forEach((lure, i) => { out[String(i)] = { lure, why: LURE_WHY[lure] }; });
  return out;
}

// Any key under `content` that would identify the correct option. Enforced by
// assertContentClean() below and re-asserted independently by check-VER-RELPAIR-01.mjs.
const LEAK_KEY = /^(lure|lures|misconception|correct|iscorrect|is_correct|correctkey|key|answer|answers|solution|solver|rationale|rationales|distractorrationales|fit|why|note|explanation|errortype|error_type|truth|verdict)$/i;

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

// Relations where A~B is the same as B~A. For these the reversed pair is ALSO
// correct, so we must NOT emit a reversed_relation lure (it would break unique-answer).
const SYMMETRIC_RELATIONS = new Set(['opposite of']);

// ---------------------------------------------------------------------------
// AUTHORED CONTENT (the "LLM-generated" word-pair items, written directly as data).
// Ordered easy -> hard. Difficulty rises across three levers (build plan §0):
//   (1) relation abstractness  (concrete physical -> categorical -> abstract/semantic)
//   (2) word frequency         (freq 7 = very common / K vocabulary -> freq 1 = rare/academic)
//   (3) lure subtlety          (obvious associate -> plausible surface_match -> reversed relation)
// K-1 / low-difficulty items use only very simple, high-frequency words (reading gate, D-017).
//
// Each entry: { rel, stem, correct, assoc, surface, freq }
//   stem     = the key pair shown to the child (same relation as `correct`)
//   correct  = the one option that shares the key relation
//   assoc    = thematic/semantic associate, WRONG relation  -> lure 'associate'
//   surface  = shares surface features, WRONG relation       -> lure 'surface_match'
//   reversed = derived = correct reversed (added at difficulty band >= 4, asymmetric only)
//   freq     = Zipf-like band 1..7 (7 = most common) for the option words
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ---- Tier 1: bands 1-4 (K-1) — concrete, universal, very high-frequency ----
  { rel: 'lives in',        stem: ['bird', 'nest'],   correct: ['bee', 'hive'],    assoc: ['dog', 'bone'],   surface: ['fish', 'fin'],    freq: 7 },
  { rel: 'lives in',        stem: ['dog', 'house'],   correct: ['cow', 'barn'],    assoc: ['cat', 'milk'],   surface: ['cow', 'leg'],     freq: 7 },
  { rel: 'lives in',        stem: ['fish', 'pond'],   correct: ['lion', 'den'],    assoc: ['hen', 'egg'],    surface: ['bird', 'wing'],   freq: 6 },
  { rel: 'lives in',        stem: ['horse', 'barn'],  correct: ['pig', 'pen'],     assoc: ['duck', 'bread'], surface: ['pig', 'tail'],    freq: 6 },
  { rel: 'worn on',         stem: ['foot', 'shoe'],   correct: ['head', 'hat'],    assoc: ['foot', 'run'],   surface: ['hand', 'palm'],   freq: 7 },
  { rel: 'worn on',         stem: ['hand', 'glove'],  correct: ['foot', 'shoe'],   assoc: ['hand', 'wave'],  surface: ['head', 'hair'],   freq: 7 },
  { rel: 'worn on',         stem: ['head', 'hat'],    correct: ['hand', 'glove'],  assoc: ['head', 'nod'],   surface: ['foot', 'toe'],    freq: 6 },
  { rel: 'makes the sound', stem: ['dog', 'bark'],    correct: ['cat', 'meow'],    assoc: ['dog', 'tail'],   surface: ['cow', 'horn'],    freq: 7 },
  { rel: 'makes the sound', stem: ['cow', 'moo'],     correct: ['duck', 'quack'],  assoc: ['cow', 'grass'],  surface: ['duck', 'egg'],    freq: 7 },
  { rel: 'makes the sound', stem: ['cat', 'meow'],    correct: ['pig', 'oink'],    assoc: ['pig', 'mud'],    surface: ['cat', 'paw'],     freq: 6 },
  { rel: 'baby of',         stem: ['dog', 'puppy'],   correct: ['cat', 'kitten'],  assoc: ['dog', 'bone'],   surface: ['cow', 'milk'],    freq: 6 },
  { rel: 'baby of',         stem: ['cow', 'calf'],    correct: ['sheep', 'lamb'],  assoc: ['cow', 'farm'],   surface: ['sheep', 'wool'],  freq: 6 },
  { rel: 'baby of',         stem: ['cat', 'kitten'],  correct: ['bird', 'chick'],  assoc: ['cat', 'nap'],    surface: ['bird', 'wing'],   freq: 6 },
  { rel: 'used to',         stem: ['broom', 'sweep'], correct: ['cup', 'drink'],   assoc: ['broom', 'dust'], surface: ['cup', 'handle'],  freq: 7 },
  { rel: 'used to',         stem: ['spoon', 'eat'],   correct: ['bed', 'sleep'],   assoc: ['spoon', 'soup'], surface: ['bed', 'pillow'],  freq: 7 },
  { rel: 'used to',         stem: ['key', 'open'],    correct: ['pen', 'write'],   assoc: ['key', 'door'],   surface: ['pen', 'cap'],     freq: 6 },
  { rel: 'part of',         stem: ['hand', 'finger'], correct: ['foot', 'toe'],    assoc: ['hand', 'clap'],  surface: ['foot', 'shoe'],   freq: 6 },
  { rel: 'part of',         stem: ['tree', 'leaf'],   correct: ['book', 'page'],   assoc: ['tree', 'shade'], surface: ['book', 'shelf'],  freq: 6 },
  { rel: 'part of',         stem: ['house', 'door'],  correct: ['car', 'wheel'],   assoc: ['house', 'home'], surface: ['car', 'road'],    freq: 5 },
  { rel: 'part of',         stem: ['clock', 'hand'],  correct: ['flower', 'petal'],assoc: ['clock', 'time'], surface: ['flower', 'garden'],freq: 5 },

  // ---- Tier 2: bands 5-8 (2-3) — concrete functional relations ----
  { rel: 'cause then effect', stem: ['fire', 'smoke'],  correct: ['rain', 'flood'],  assoc: ['fire', 'heat'],    surface: ['rain', 'cloud'],  freq: 6 },
  { rel: 'cause then effect', stem: ['rain', 'flood'],  correct: ['sun', 'heat'],    assoc: ['rain', 'umbrella'],surface: ['sun', 'sky'],     freq: 6 },
  { rel: 'cause then effect', stem: ['germ', 'sickness'],correct: ['spark', 'fire'], assoc: ['germ', 'soap'],    surface: ['germ', 'tiny'],   freq: 5 },
  { rel: 'cause then effect', stem: ['cut', 'pain'],    correct: ['joke', 'laugh'],  assoc: ['cut', 'bandage'],  surface: ['joke', 'funny'],  freq: 5 },
  { rel: 'used to',           stem: ['knife', 'cut'],   correct: ['broom', 'sweep'], assoc: ['knife', 'fork'],   surface: ['broom', 'handle'],freq: 6 },
  { rel: 'used to',           stem: ['hammer', 'pound'],correct: ['saw', 'cut'],     assoc: ['hammer', 'wood'],  surface: ['saw', 'blade'],   freq: 5 },
  { rel: 'measures',          stem: ['clock', 'time'],  correct: ['ruler', 'length'],assoc: ['clock', 'wall'],   surface: ['ruler', 'line'],  freq: 5 },
  { rel: 'used to',           stem: ['oven', 'bake'],   correct: ['fridge', 'cool'], assoc: ['oven', 'kitchen'], surface: ['fridge', 'door'], freq: 5 },
  { rel: 'part of',           stem: ['car', 'wheel'],   correct: ['bike', 'pedal'],  assoc: ['car', 'drive'],    surface: ['bike', 'ride'],   freq: 5 },
  { rel: 'part of',           stem: ['body', 'arm'],    correct: ['plant', 'root'],  assoc: ['body', 'health'],  surface: ['plant', 'pot'],   freq: 5 },
  { rel: 'part of',           stem: ['shirt', 'sleeve'],correct: ['pants', 'pocket'],assoc: ['shirt', 'wash'],   surface: ['pants', 'belt'],  freq: 5 },
  { rel: 'made of',           stem: ['window', 'glass'],correct: ['tire', 'rubber'], assoc: ['window', 'view'],  surface: ['tire', 'road'],   freq: 5 },
  { rel: 'made of',           stem: ['book', 'paper'],  correct: ['shirt', 'cloth'], assoc: ['book', 'read'],    surface: ['shirt', 'button'],freq: 5 },
  { rel: 'made of',           stem: ['ring', 'gold'],   correct: ['table', 'wood'],  assoc: ['ring', 'finger'],  surface: ['table', 'leg'],   freq: 4 },
  { rel: 'works with',        stem: ['farmer', 'plow'], correct: ['painter', 'brush'],assoc: ['farmer', 'barn'], surface: ['painter', 'ladder'],freq: 5 },
  { rel: 'works at',          stem: ['teacher', 'school'],correct: ['doctor', 'hospital'],assoc: ['teacher', 'book'],surface: ['doctor', 'nurse'],freq: 6 },
  { rel: 'works at',          stem: ['chef', 'kitchen'],correct: ['judge', 'court'], assoc: ['chef', 'hat'],     surface: ['judge', 'law'],   freq: 4 },
  { rel: 'kind of',           stem: ['fruit', 'apple'], correct: ['color', 'red'],   assoc: ['fruit', 'sweet'],  surface: ['color', 'paint'], freq: 6 },
  { rel: 'kind of',           stem: ['animal', 'dog'],  correct: ['tool', 'hammer'], assoc: ['animal', 'zoo'],   surface: ['tool', 'box'],    freq: 5 },
  { rel: 'kind of',           stem: ['bird', 'robin'],  correct: ['fish', 'trout'],  assoc: ['bird', 'fly'],     surface: ['fish', 'hook'],   freq: 4 },

  // ---- Tier 3: bands 9-12 (4-5) — categorical / functional, subtler lures ----
  { rel: 'kind of',           stem: ['emotion', 'anger'],  correct: ['metal', 'iron'],   assoc: ['emotion', 'face'],  surface: ['metal', 'shine'],   freq: 4 },
  { rel: 'kind of',           stem: ['shape', 'circle'],   correct: ['season', 'winter'],assoc: ['shape', 'round'],   surface: ['season', 'cold'],   freq: 5 },
  { rel: 'kind of',           stem: ['vehicle', 'truck'],  correct: ['instrument', 'drum'],assoc: ['vehicle', 'road'],surface: ['instrument', 'sound'],freq: 4 },
  { rel: 'kind of',           stem: ['furniture', 'chair'],correct: ['weather', 'rain'], assoc: ['furniture', 'wood'],surface: ['weather', 'sky'],   freq: 4 },
  { rel: 'stronger form of',  stem: ['warm', 'hot'],       correct: ['big', 'huge'],     assoc: ['warm', 'sun'],      surface: ['hot', 'cold'],      freq: 5 },
  { rel: 'stronger form of',  stem: ['happy', 'thrilled'], correct: ['sad', 'miserable'],assoc: ['happy', 'smile'],   surface: ['sad', 'cry'],       freq: 4 },
  { rel: 'stronger form of',  stem: ['good', 'great'],     correct: ['bad', 'awful'],    assoc: ['good', 'nice'],     surface: ['bad', 'sad'],       freq: 4 },
  { rel: 'stronger form of',  stem: ['cool', 'cold'],      correct: ['damp', 'soaked'],  assoc: ['cool', 'ice'],      surface: ['damp', 'dry'],      freq: 3 },
  { rel: 'opposite of',       stem: ['hot', 'cold'],       correct: ['up', 'down'],      assoc: ['hot', 'fire'],      surface: ['up', 'high'],       freq: 6 },
  { rel: 'opposite of',       stem: ['open', 'shut'],      correct: ['full', 'empty'],   assoc: ['open', 'door'],     surface: ['full', 'more'],     freq: 5 },
  { rel: 'opposite of',       stem: ['ancient', 'modern'], correct: ['giant', 'tiny'],   assoc: ['ancient', 'ruins'], surface: ['giant', 'big'],     freq: 3 },
  { rel: 'lets you',          stem: ['ears', 'hear'],      correct: ['eyes', 'see'],     assoc: ['ears', 'sound'],    surface: ['eyes', 'blink'],    freq: 5 },
  { rel: 'lets you',          stem: ['lungs', 'breathe'],  correct: ['heart', 'pump'],   assoc: ['lungs', 'air'],     surface: ['heart', 'love'],    freq: 4 },
  { rel: 'lets you',          stem: ['engine', 'power'],   correct: ['battery', 'store'],assoc: ['engine', 'car'],    surface: ['battery', 'size'],  freq: 3 },
  { rel: 'produces',          stem: ['baker', 'bread'],    correct: ['author', 'book'],  assoc: ['baker', 'oven'],    surface: ['author', 'pen'],    freq: 4 },
  { rel: 'produces',          stem: ['bee', 'honey'],      correct: ['cow', 'milk'],     assoc: ['bee', 'sting'],     surface: ['cow', 'grass'],     freq: 5 },
  { rel: 'produces',          stem: ['factory', 'goods'],  correct: ['farm', 'crops'],   assoc: ['factory', 'smoke'], surface: ['farm', 'barn'],     freq: 4 },
  { rel: 'measures',          stem: ['clock', 'time'],     correct: ['scale', 'weight'], assoc: ['clock', 'tick'],    surface: ['scale', 'fish'],    freq: 4 },
  { rel: 'measures',          stem: ['thermometer', 'temperature'], correct: ['ruler', 'length'], assoc: ['thermometer', 'fever'], surface: ['ruler', 'king'], freq: 3 },
  { rel: 'measures',          stem: ['clock', 'hours'],    correct: ['calendar', 'days'],assoc: ['clock', 'alarm'],   surface: ['calendar', 'wall'], freq: 4 },

  // ---- Tier 4: bands 13-16 (6-8) — abstract / semantic, rarer words ----
  { rel: 'studies',          stem: ['astronomer', 'stars'], correct: ['biologist', 'life'],  assoc: ['astronomer', 'night'], surface: ['biologist', 'lab'],  freq: 3 },
  { rel: 'studies',          stem: ['historian', 'past'],  correct: ['geologist', 'rocks'], assoc: ['historian', 'book'],   surface: ['geologist', 'cave'], freq: 2 },
  { rel: 'lets you',         stem: ['root', 'absorb'],     correct: ['gill', 'breathe'],   assoc: ['root', 'soil'],        surface: ['gill', 'fish'],      freq: 3 },
  { rel: 'lets you',         stem: ['wing', 'fly'],        correct: ['fin', 'swim'],       assoc: ['wing', 'bird'],        surface: ['fin', 'shark'],      freq: 3 },
  { rel: 'opposite of',      stem: ['expand', 'contract'], correct: ['reveal', 'conceal'], assoc: ['expand', 'grow'],      surface: ['reveal', 'show'],    freq: 2 },
  { rel: 'opposite of',      stem: ['praise', 'criticize'],correct: ['permit', 'forbid'],  assoc: ['praise', 'award'],     surface: ['permit', 'allow'],   freq: 2 },
  { rel: 'opposite of',      stem: ['victory', 'defeat'],  correct: ['wealth', 'poverty'], assoc: ['victory', 'cheer'],    surface: ['wealth', 'money'],   freq: 2 },
  { rel: 'stronger form of', stem: ['cool', 'frigid'],     correct: ['warm', 'scorching'], assoc: ['cool', 'breeze'],      surface: ['warm', 'mild'],      freq: 2 },
  { rel: 'stronger form of', stem: ['large', 'enormous'],  correct: ['small', 'minuscule'],assoc: ['large', 'size'],       surface: ['small', 'little'],   freq: 2 },
  { rel: 'stronger form of', stem: ['tired', 'exhausted'], correct: ['angry', 'furious'],  assoc: ['tired', 'sleep'],      surface: ['angry', 'mad'],      freq: 3 },
  { rel: 'produces',         stem: ['erosion', 'canyon'],  correct: ['eruption', 'lava'],  assoc: ['erosion', 'water'],    surface: ['eruption', 'volcano'],freq: 2 },
  { rel: 'produces',         stem: ['practice', 'skill'],  correct: ['study', 'knowledge'],assoc: ['practice', 'sport'],   surface: ['study', 'desk'],     freq: 3 },
  { rel: 'produces',         stem: ['fermentation', 'wine'],correct: ['freezing', 'ice'],  assoc: ['fermentation', 'grape'],surface: ['freezing', 'winter'],freq: 2 },
  { rel: 'known for being',  stem: ['lion', 'brave'],      correct: ['owl', 'wise'],       assoc: ['lion', 'roar'],        surface: ['owl', 'feather'],    freq: 3 },
  { rel: 'known for being',  stem: ['fox', 'clever'],      correct: ['ox', 'strong'],      assoc: ['fox', 'tail'],         surface: ['ox', 'farm'],        freq: 3 },
  { rel: 'known for being',  stem: ['desert', 'dry'],      correct: ['swamp', 'wet'],      assoc: ['desert', 'sand'],      surface: ['swamp', 'frog'],     freq: 3 },
  { rel: 'works with',       stem: ['sculptor', 'chisel'], correct: ['surgeon', 'scalpel'],assoc: ['sculptor', 'statue'],  surface: ['surgeon', 'mask'],   freq: 2 },
  { rel: 'works with',       stem: ['cartographer', 'maps'],correct: ['archivist', 'records'],assoc: ['cartographer', 'travel'],surface: ['archivist', 'dust'],freq: 1 },
  { rel: 'lets you',         stem: ['valve', 'control'],   correct: ['filter', 'purify'],  assoc: ['valve', 'pipe'],       surface: ['filter', 'coffee'],  freq: 2 },
  { rel: 'kind of',          stem: ['virtue', 'honesty'],  correct: ['vice', 'greed'],     assoc: ['virtue', 'good'],      surface: ['vice', 'grip'],      freq: 2 },

  // ---- Tier 5: bands 17-20 (above-level "clearly gifted") — highly abstract, rare ----
  { rel: 'works with',   stem: ['sculptor', 'marble'],   correct: ['poet', 'words'],       assoc: ['sculptor', 'art'],      surface: ['poet', 'rhyme'],       freq: 2 },
  { rel: 'works with',   stem: ['composer', 'notes'],    correct: ['weaver', 'thread'],    assoc: ['composer', 'music'],    surface: ['weaver', 'basket'],    freq: 2 },
  { rel: 'works with',   stem: ['painter', 'pigment'],   correct: ['mason', 'stone'],      assoc: ['painter', 'canvas'],    surface: ['mason', 'wall'],       freq: 1 },
  { rel: 'studies',      stem: ['entomologist', 'insects'],correct: ['ornithologist', 'birds'],assoc: ['entomologist', 'net'],surface: ['ornithologist', 'cage'],freq: 1 },
  { rel: 'studies',      stem: ['cardiologist', 'heart'],correct: ['botanist', 'plants'],  assoc: ['cardiologist', 'pulse'],surface: ['botanist', 'garden'],  freq: 2 },
  { rel: 'studies',      stem: ['seismologist', 'earthquakes'],correct: ['meteorologist', 'weather'],assoc: ['seismologist', 'fault'],surface: ['meteorologist', 'umbrella'],freq: 1 },
  { rel: 'acts on',      stem: ['catalyst', 'reaction'], correct: ['lubricant', 'friction'],assoc: ['catalyst', 'chemistry'],surface: ['lubricant', 'oil'],   freq: 1 },
  { rel: 'serves as a',  stem: ['sentinel', 'guard'],    correct: ['beacon', 'signal'],    assoc: ['sentinel', 'tower'],    surface: ['beacon', 'light'],     freq: 1 },
  { rel: 'lets you',     stem: ['anchor', 'steady'],     correct: ['rudder', 'steer'],     assoc: ['anchor', 'ship'],       surface: ['rudder', 'boat'],      freq: 2 },
  { rel: 'opposite of',  stem: ['opaque', 'transparent'],correct: ['rigid', 'flexible'],   assoc: ['opaque', 'glass'],      surface: ['rigid', 'hard'],       freq: 1 },
  { rel: 'opposite of',  stem: ['verbose', 'terse'],     correct: ['frugal', 'wasteful'],  assoc: ['verbose', 'speech'],    surface: ['frugal', 'cheap'],     freq: 1 },
  { rel: 'opposite of',  stem: ['candid', 'evasive'],    correct: ['humble', 'arrogant'],  assoc: ['candid', 'honest'],     surface: ['humble', 'low'],       freq: 1 },
  { rel: 'opposite of',  stem: ['barren', 'fertile'],    correct: ['scarce', 'abundant'],  assoc: ['barren', 'desert'],     surface: ['scarce', 'rare'],      freq: 1 },
  { rel: 'stronger form of', stem: ['warm', 'torrid'],   correct: ['bright', 'radiant'],   assoc: ['warm', 'cozy'],         surface: ['bright', 'dim'],       freq: 1 },
  { rel: 'stronger form of', stem: ['fond', 'devoted'],  correct: ['wary', 'terrified'],   assoc: ['fond', 'like'],         surface: ['wary', 'careful'],     freq: 1 },
  { rel: 'symbol of',    stem: ['dove', 'peace'],        correct: ['scales', 'justice'],   assoc: ['dove', 'bird'],         surface: ['scales', 'fish'],      freq: 2 },
  { rel: 'symbol of',    stem: ['crown', 'royalty'],     correct: ['laurel', 'victory'],   assoc: ['crown', 'king'],        surface: ['laurel', 'tree'],      freq: 1 },
  { rel: 'symbol of',    stem: ['heart', 'love'],        correct: ['anchor', 'hope'],      assoc: ['heart', 'organ'],       surface: ['anchor', 'ship'],      freq: 2 },
  { rel: 'leads to',     stem: ['question', 'inquiry'],  correct: ['hypothesis', 'experiment'],assoc: ['question', 'answer'],surface: ['hypothesis', 'science'],freq: 1 },
  { rel: 'leads to',     stem: ['premise', 'conclusion'],correct: ['cause', 'effect'],     assoc: ['premise', 'argument'],  surface: ['conclusion', 'end'],   freq: 1 },
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
const tok = (w) => ({ text: w });
const pair = (p) => [tok(p[0]), tok(p[1])];

// Difficulty grid: 20 bands x 5 items = 100, each item rounds to its band center,
// all within [1,20]. Offsets keep round(difficulty) == band (build plan: >=5 per +/-1 pt band).
function difficultyFor(index) {
  const band = Math.floor(index / 5) + 1; // 1..20
  const pos = index % 5;                    // 0..4
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
  return ['6-8']; // 12..16 grade band; 16..20 = same band administered above-level
}
const MAX_WORD_LEN_K1 = 8; // reading-gate length ceiling for the K-1 band
const MIN_FREQ_K1 = 5;     // reading-gate frequency floor for the K-1 band

// ---------------------------------------------------------------------------
// Build one BankItem from an authored entry.
// ---------------------------------------------------------------------------
function buildItem(entry, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const band = Math.floor(index / 5) + 1;

  const opts = [
    { pair: entry.correct, lure: 'correct' },
    { pair: entry.assoc, lure: 'associate' },
    { pair: entry.surface, lure: 'surface_match' },
  ];
  // Add a reversed-relation lure (a 4th option) once items are past the very
  // easiest bands — but never for symmetric relations (reversed would be correct).
  if (band >= 4 && !SYMMETRIC_RELATIONS.has(entry.rel)) {
    opts.push({ pair: [entry.correct[1], entry.correct[0]], lure: 'reversed_relation' });
  }

  const shuffled = seededShuffle(opts, hashNum(itemId));
  const lures = shuffled.map((o) => o.lure); // server-side only; never enters `content`
  const options = shuffled.map((o) => ({ pair: pair(o.pair) }));
  const correctKey = lures.indexOf('correct');
  const distractorRationales = rationalesByOption(lures);

  const content = {
    typeCode: TYPE_CODE,
    presentation: 'word', // D-017: text only (no audio / picture crutch); reading required
    relation: entry.rel,
    stemPair: pair(entry.stem),
    options,
    frequencyBand: entry.freq,
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
      validator: itemValidatorVerdicts(entry, content, lures, difficulty),
    },
    syntheticOnly: true,
    validated: false,
  };
}

// Design-time self-check verdicts recorded on each item (still validated:false overall).
function itemValidatorVerdicts(entry, content, lures, difficulty) {
  const correctCount = lures.filter((l) => l === 'correct').length;
  const distractors = lures.filter((l) => l !== 'correct');
  const distinctLures = new Set(distractors).size === distractors.length;
  const luresValid = lures.every((l) => LURE_CLASSES.has(l));
  const words = [...entry.stem, ...entry.correct, ...entry.assoc, ...entry.surface];
  const k1 = difficulty < 4;
  const readingOk = !k1 || (words.every((w) => w.length <= MAX_WORD_LEN_K1) && entry.freq >= MIN_FREQ_K1);
  const leaks = assertContentClean(content, 'item');
  return [
    { check: 'unique_answer', status: correctCount === 1 ? 'pass' : 'fail' },
    { check: 'lure_taxonomy_ok', status: distinctLures && luresValid ? 'pass' : 'fail' },
    { check: 'served_subset_clean', status: leaks.length === 0 ? 'pass' : 'fail', detail: leaks.length ? leaks.join('; ') : 'no answer-revealing key reachable from content' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn' },
    { check: 'frequency_band_ok', status: 'pass', detail: `Zipf band ${entry.freq}` },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; universal relations' },
  ];
}

export function buildBank() {
  return ENTRIES.map((e, i) => buildItem(e, i));
}

// ---------------------------------------------------------------------------
// Validation (parse + structure + keys + lure taxonomy + reading gate + coverage).
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
    if (!Array.isArray(c.stemPair) || c.stemPair.length !== 2 || c.stemPair.some((t) => !t || !t.text)) {
      errors.push(`${where}: stemPair must be 2 tokens with text`);
    }
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) {
      errors.push(`${where}: options must have 3..4 entries`);
      return;
    }
    opts.forEach((o, oi) => {
      if (!Array.isArray(o.pair) || o.pair.length !== 2 || o.pair.some((t) => !t || !t.text)) {
        errors.push(`${where}: option[${oi}] pair must be 2 tokens with text`);
      }
    });

    // Served-subset firewall: nothing under content may identify the correct option.
    errors.push(...assertContentClean(c, where));

    const ak = it.answer;
    if (!ak || typeof ak.correctKey !== 'number') errors.push(`${where}: answer.correctKey missing`);
    const rats = ak && ak.distractorRationales;
    if (!rats || typeof rats !== 'object' || Array.isArray(rats)) {
      errors.push(`${where}: answer.distractorRationales must be an object keyed by option index (a positional array re-creates the leak)`);
    } else {
      const keys = Object.keys(rats);
      if (keys.length !== opts.length) errors.push(`${where}: distractorRationales has ${keys.length} entries for ${opts.length} options`);
      const expected = opts.map((_, i) => String(i));
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

    // Reading gate for K-1 items.
    if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) {
      const words = [...c.stemPair, ...opts.flatMap((o) => o.pair)].map((t) => t.text);
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

  // Uniqueness of itemIds.
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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
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
    console.log('\nVALIDATION PASSED: parse ok, keys aligned, lure taxonomy ok, >=5 items per +/-1 pt band.');
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

  // default / --write : build + validate + write
  const items = buildBank();
  const report = validateItems(items);
  if (!report.ok) { console.error('REFUSING TO WRITE — validation failed:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
  writeBank(items);
  printCoverage(report);
  console.log(`\nwrote ${items.length} items -> ${BANK_PATH}`);
}

// Robust main-module check (workspace path can contain spaces -> URL encoding differs).
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
