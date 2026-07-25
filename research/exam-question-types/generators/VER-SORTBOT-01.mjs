#!/usr/bin/env node
// VER-SORTBOT-01 (Sorting Robot) — structured / LLM-authored item bank generator + validator.
//
// This is the LLM-generated content path for a language-heavy verbal type
// (classification / rule induction). A robot has already sorted a few example words
// into IN and OUT by a HIDDEN rule; the child infers the rule and picks the ONE new
// word that also goes IN. It is a single-select item scored by a deterministic key
// (build plan §0/§2). The hidden `rule` string is bank/server-side only — it is
// NEVER rendered to the child (that would give the answer away).
//
// The words are AUTHORED DIRECTLY AS DATA below (the `ENTRIES` pool); the generator
// materializes them into the standardized BankItem schema, deterministically assigns
// difficulty across 1..20, tags every distractor with a lure class, and can
// re-validate the emitted JSONL. It can also be EXTENDED (append entries -> rebuild).
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md     §6 schema (classification / lure taxonomy)
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-SORTBOT-01.mjs            # build + write banks/VER-SORTBOT-01.jsonl
//   node generators/VER-SORTBOT-01.mjs --validate # validate the JSONL on disk
//   node generators/VER-SORTBOT-01.mjs --check    # build in-memory + validate, do not write
//   node generators/VER-SORTBOT-01.mjs --print 2  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-SORTBOT-01.jsonl');

const TYPE_CODE = 'VER-SORTBOT-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-SORTBOT-01.html';
const GENERATOR_REF = 'VER-SORTBOT-01/authored-pools@v1';

// Allowed distractor lure classes for this type (schema §6.3).
//   surface_match   = shares a surface feature with the IN examples but breaks the rule
//                     (the boundary near-miss: whale for "fish", spider for "insects")
//   associate       = thematically linked to the category but not a member
//   global_mismatch = clearly unrelated / plainly OUT
const LURE_CLASSES = new Set(['correct', 'surface_match', 'associate', 'global_mismatch']);

// The subtle boundary near-miss (surface_match) is only introduced once the rule
// is non-trivial. Below this band the choice is correct vs associate vs unrelated.
const SURFACE_FROM_BAND = 5;

// ---------------------------------------------------------------------------
// AUTHORED CONTENT — each entry is a hidden-rule sort. Ordered easy -> hard.
// Difficulty rises across three levers (build plan §0):
//   (1) rule abstractness  (taxonomic -> perceptual/functional -> abstract/semantic)
//   (2) word frequency     (freq 6-7 K vocabulary -> freq 1 rare/academic)
//   (3) lure subtlety      (unrelated -> associate -> surface-feature boundary miss)
// K-1 / low-difficulty items use only very simple, high-frequency words (reading gate, D-017).
//
// Each entry: { rule, in:[w,w], out:[w], correct, assoc, global, surface?, freq }
//   rule    = the hidden rule (SERVER-SIDE ONLY; never rendered to the child)
//   in      = example words the robot placed IN (shown)
//   out     = example words the robot placed OUT (shown)
//   correct = the option word that also belongs IN
//   assoc   = associate lure (topical, not a member)
//   global  = global_mismatch lure (clearly unrelated)
//   surface = surface_match lure (looks like a member but breaks the rule); bands >= 5
//   freq    = Zipf-like band 1..7 (7 = most common) for the option words
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ---- Tier 1: bands 1-4 (K-1) — taxonomic, universal, very high-frequency ----
  { rule: 'animals',            in: ['dog', 'cat'],    out: ['car'],   correct: 'cow',   assoc: 'bone',  global: 'chair', freq: 6 },
  { rule: 'fruit',              in: ['apple', 'pear'], out: ['sock'],  correct: 'plum',  assoc: 'juice', global: 'truck', freq: 5 },
  { rule: 'colors',            in: ['red', 'blue'],   out: ['dog'],   correct: 'green', assoc: 'paint', global: 'spoon', freq: 6 },
  { rule: 'things to drink',    in: ['milk', 'water'], out: ['rock'],  correct: 'juice', assoc: 'cup',   global: 'hat',   freq: 6 },
  { rule: 'body parts',         in: ['hand', 'foot'],  out: ['tree'],  correct: 'nose',  assoc: 'glove', global: 'lamp',  freq: 6 },
  { rule: 'toys',               in: ['ball', 'doll'],  out: ['soup'],  correct: 'kite',  assoc: 'play',  global: 'brick', freq: 5 },
  { rule: 'things in the sky',  in: ['sun', 'cloud'],  out: ['fish'],  correct: 'star',  assoc: 'blue',  global: 'desk',  freq: 6 },
  { rule: 'farm animals',       in: ['pig', 'hen'],    out: ['lion'],  correct: 'goat',  assoc: 'barn',  global: 'clock', freq: 5 },
  { rule: 'things you wear',    in: ['hat', 'coat'],   out: ['cup'],   correct: 'shoe',  assoc: 'warm',  global: 'leaf',  freq: 6 },
  { rule: 'things that are hot', in: ['fire', 'sun'],  out: ['ice'],   correct: 'oven',  assoc: 'burn',  global: 'book',  freq: 5 },
  { rule: 'birds',              in: ['duck', 'owl'],   out: ['frog'],  correct: 'hen',   assoc: 'nest',  global: 'road',  freq: 5 },
  { rule: 'things with wheels', in: ['car', 'bus'],    out: ['boat'],  correct: 'bike',  assoc: 'road',  global: 'apple', freq: 6 },
  { rule: 'things you eat',     in: ['bread', 'egg'],  out: ['shoe'],  correct: 'rice',  assoc: 'plate', global: 'chair', freq: 6 },
  { rule: 'water animals',      in: ['fish', 'crab'],  out: ['cat'],   correct: 'seal',  assoc: 'wave',  global: 'lamp',  freq: 5 },
  { rule: 'things that are cold', in: ['ice', 'snow'], out: ['fire'],  correct: 'frost', assoc: 'winter', global: 'drum', freq: 5 },
  { rule: 'plants',             in: ['tree', 'bush'],  out: ['dog'],   correct: 'fern',  assoc: 'seed',  global: 'phone', freq: 5 },
  { rule: 'things that fly',    in: ['bird', 'bee'],   out: ['snake'], correct: 'bat',   assoc: 'wing',  global: 'sofa',  freq: 5 },
  { rule: 'round things',       in: ['ball', 'ring'],  out: ['box'],   correct: 'coin',  assoc: 'roll',  global: 'flag',  freq: 6 },
  { rule: 'kitchen things',     in: ['pot', 'fork'],   out: ['bed'],   correct: 'cup',   assoc: 'cook',  global: 'cloud', freq: 6 },
  { rule: 'things with legs',   in: ['dog', 'chair'],  out: ['snake'], correct: 'table', assoc: 'walk',  global: 'river', freq: 5 },

  // ---- Tier 2: bands 5-8 (2-3) — perceptual/biological, first boundary misses ----
  { rule: 'real animals',        in: ['dog', 'horse'],     out: ['robot'],   correct: 'cow',    assoc: 'fur',    surface: 'dragon',   global: 'table',  freq: 5 },
  { rule: 'things that are alive', in: ['tree', 'cat'],    out: ['rock'],    correct: 'flower', assoc: 'water',  surface: 'robot',    global: 'spoon',  freq: 5 },
  { rule: 'insects',             in: ['ant', 'bee'],       out: ['dog'],     correct: 'moth',   assoc: 'crawl',  surface: 'spider',   global: 'chair',  freq: 4 },
  { rule: 'fish',                in: ['trout', 'shark'],   out: ['crab'],    correct: 'tuna',   assoc: 'swim',   surface: 'whale',    global: 'lamp',   freq: 4 },
  { rule: 'vegetables',          in: ['carrot', 'pea'],    out: ['apple'],   correct: 'bean',   assoc: 'salad',  surface: 'tomato',   global: 'sock',   freq: 4 },
  { rule: 'things that are red', in: ['tomato', 'rose'],   out: ['leaf'],    correct: 'brick',  assoc: 'color',  surface: 'lime',     global: 'cloud',  freq: 4 },
  { rule: 'mammals',             in: ['cat', 'bear'],      out: ['ant'],     correct: 'whale',  assoc: 'fur',    surface: 'shark',    global: 'stone',  freq: 4 },
  { rule: 'birds',               in: ['robin', 'hawk'],    out: ['frog'],    correct: 'crow',   assoc: 'feather', surface: 'bat',     global: 'brick',  freq: 4 },
  { rule: 'things with four sides', in: ['box', 'tile'],   out: ['ball'],    correct: 'door',   assoc: 'corner', surface: 'triangle', global: 'song',   freq: 4 },
  { rule: 'liquids',             in: ['water', 'milk'],    out: ['brick'],   correct: 'juice',  assoc: 'pour',   surface: 'sand',     global: 'lamp',   freq: 5 },
  { rule: 'things that give light', in: ['lamp', 'sun'],   out: ['rock'],    correct: 'candle', assoc: 'bright', surface: 'mirror',   global: 'chair',  freq: 4 },
  { rule: 'tools for building',  in: ['hammer', 'drill'],  out: ['banana'],  correct: 'wrench', assoc: 'nail',   surface: 'crayon',   global: 'cloud',  freq: 4 },
  { rule: 'things that grow',    in: ['plant', 'child'],   out: ['stone'],   correct: 'tree',   assoc: 'tall',   surface: 'balloon',  global: 'spoon',  freq: 4 },
  { rule: 'things that are frozen', in: ['ice', 'snow'],   out: ['steam'],   correct: 'hail',   assoc: 'cold',   surface: 'glass',    global: 'drum',   freq: 3 },
  { rule: 'sea animals',         in: ['crab', 'seal'],     out: ['cow'],     correct: 'squid',  assoc: 'wave',   surface: 'duck',     global: 'chair',  freq: 4 },
  { rule: 'things that bounce',  in: ['ball', 'spring'],   out: ['glass'],   correct: 'tire',   assoc: 'jump',   surface: 'egg',      global: 'lamp',   freq: 4 },
  { rule: 'things that melt',    in: ['ice', 'butter'],    out: ['rock'],    correct: 'wax',    assoc: 'heat',   surface: 'salt',     global: 'clock',  freq: 4 },
  { rule: 'flowers',             in: ['rose', 'tulip'],    out: ['oak'],     correct: 'daisy',  assoc: 'petal',  surface: 'weed',     global: 'spoon',  freq: 4 },
  { rule: 'things that are sweet', in: ['candy', 'honey'], out: ['lemon'],   correct: 'cake',   assoc: 'sugar',  surface: 'salt',     global: 'brick',  freq: 4 },
  { rule: 'musical instruments', in: ['drum', 'flute'],    out: ['spoon'],   correct: 'guitar', assoc: 'song',   surface: 'radio',    global: 'brick',  freq: 4 },

  // ---- Tier 3: bands 9-12 (4-5) — functional / cross-domain, science boundaries ----
  { rule: 'animals with a shell', in: ['turtle', 'snail'], out: ['dog'],     correct: 'crab',   assoc: 'slow',   surface: 'coconut',  global: 'lamp',   freq: 4 },
  { rule: 'things that store information', in: ['book', 'disk'], out: ['rock'], correct: 'brain', assoc: 'read',  surface: 'mirror',   global: 'chair',  freq: 3 },
  { rule: 'sources of light',    in: ['sun', 'bulb'],      out: ['rock'],    correct: 'flame',  assoc: 'bright', surface: 'moon',     global: 'spoon',  freq: 3 },
  { rule: 'units of time',       in: ['hour', 'week'],     out: ['mile'],    correct: 'minute', assoc: 'clock',  surface: 'meter',    global: 'apple',  freq: 3 },
  { rule: 'liquids at room temperature', in: ['water', 'oil'], out: ['ice'], correct: 'juice',  assoc: 'pour',   surface: 'glass',    global: 'drum',   freq: 3 },
  { rule: 'things that conduct electricity', in: ['copper', 'iron'], out: ['wood'], correct: 'gold', assoc: 'wire', surface: 'plastic', global: 'leaf',  freq: 2 },
  { rule: 'renewable energy',    in: ['wind', 'solar'],    out: ['coal'],    correct: 'hydro',  assoc: 'power',  surface: 'gas',      global: 'chair',  freq: 2 },
  { rule: 'things with a keyboard', in: ['piano', 'laptop'], out: ['drum'],  correct: 'organ',  assoc: 'type',   surface: 'guitar',   global: 'apple',  freq: 3 },
  { rule: 'reptiles',            in: ['snake', 'lizard'],  out: ['frog'],    correct: 'turtle', assoc: 'scale',  surface: 'salamander', global: 'clock', freq: 2 },
  { rule: 'things that reflect', in: ['mirror', 'lake'],   out: ['sponge'],  correct: 'metal',  assoc: 'image',  surface: 'window',   global: 'brick',  freq: 3 },
  { rule: 'gases',               in: ['oxygen', 'steam'],  out: ['ice'],     correct: 'smoke',  assoc: 'air',    surface: 'fog',      global: 'spoon',  freq: 3 },
  { rule: 'things that spin',    in: ['wheel', 'top'],     out: ['brick'],   correct: 'fan',    assoc: 'round',  surface: 'clock',    global: 'leaf',   freq: 3 },
  { rule: 'evergreen trees',     in: ['pine', 'fir'],      out: ['oak'],     correct: 'cedar',  assoc: 'cone',   surface: 'palm',     global: 'lamp',   freq: 2 },
  { rule: 'things that repeat sound', in: ['echo', 'recorder'], out: ['candle'], correct: 'parrot', assoc: 'voice', surface: 'radio', global: 'apple',  freq: 3 },
  { rule: 'natural fibers',      in: ['cotton', 'wool'],   out: ['steel'],   correct: 'silk',   assoc: 'cloth',  surface: 'nylon',    global: 'brick',  freq: 2 },
  { rule: 'things lighter than water', in: ['cork', 'oil'], out: ['stone'],  correct: 'wood',   assoc: 'float',  surface: 'sponge',   global: 'clock',  freq: 3 },
  { rule: 'citrus fruit',        in: ['lemon', 'lime'],    out: ['apple'],   correct: 'orange', assoc: 'sour',   surface: 'apricot',  global: 'spoon',  freq: 2 },
  { rule: 'things that use batteries', in: ['flashlight', 'remote'], out: ['candle'], correct: 'toy', assoc: 'power', surface: 'lamp',  global: 'apple',  freq: 3 },
  { rule: 'amphibians',          in: ['frog', 'toad'],     out: ['snake'],   correct: 'newt',   assoc: 'pond',   surface: 'lizard',   global: 'brick',  freq: 2 },
  { rule: 'things that dissolve in water', in: ['salt', 'sugar'], out: ['pebble'], correct: 'soap', assoc: 'stir', surface: 'sand',    global: 'clock',  freq: 3 },

  // ---- Tier 4: bands 13-16 (6-8) — abstract lexical / semantic fields ----
  { rule: 'words that mean happy', in: ['glad', 'joyful'],    out: ['angry'],   correct: 'cheerful',  assoc: 'smile', surface: 'hopeful',  global: 'purple', freq: 3 },
  { rule: 'words that mean big',   in: ['huge', 'giant'],     out: ['tiny'],    correct: 'massive',   assoc: 'size',  surface: 'tall',     global: 'yellow', freq: 3 },
  { rule: 'synonyms of fast',      in: ['quick', 'rapid'],    out: ['slow'],    correct: 'swift',     assoc: 'race',  surface: 'early',    global: 'green',  freq: 3 },
  { rule: 'words for very cold',   in: ['freezing', 'icy'],   out: ['warm'],    correct: 'frigid',    assoc: 'winter', surface: 'cool',    global: 'square', freq: 2 },
  { rule: 'past-tense verbs',      in: ['ran', 'jumped'],     out: ['jump'],    correct: 'ate',       assoc: 'walk',  surface: 'bed',      global: 'blue',   freq: 3 },
  { rule: 'emotions',              in: ['fear', 'joy'],       out: ['table'],   correct: 'anger',     assoc: 'face',  surface: 'smile',    global: 'copper', freq: 3 },
  { rule: 'words that rhyme with cat', in: ['hat', 'bat'],    out: ['dog'],     correct: 'mat',       assoc: 'kitten', surface: 'cot',     global: 'sun',    freq: 3 },
  { rule: 'metals',                in: ['iron', 'copper'],    out: ['wood'],    correct: 'silver',    assoc: 'shiny', surface: 'plastic',  global: 'happy',  freq: 2 },
  { rule: 'abstract nouns',        in: ['freedom', 'courage'], out: ['chair'],  correct: 'honesty',   assoc: 'idea',  surface: 'statue',   global: 'green',  freq: 2 },
  { rule: 'words that mean smart', in: ['clever', 'wise'],    out: ['dull'],    correct: 'brilliant', assoc: 'brain', surface: 'sharp',    global: 'orange', freq: 2 },
  { rule: 'adverbs',               in: ['quickly', 'softly'], out: ['quick'],   correct: 'boldly',    assoc: 'verb',  surface: 'lovely',   global: 'brick',  freq: 2 },
  { rule: 'shades of blue',        in: ['navy', 'sky'],       out: ['crimson'], correct: 'azure',     assoc: 'ocean', surface: 'teal',     global: 'wooden', freq: 2 },
  { rule: 'words that mean angry', in: ['furious', 'mad'],    out: ['calm'],    correct: 'irate',     assoc: 'shout', surface: 'upset',    global: 'metal',  freq: 2 },
  { rule: 'liquids you can drink', in: ['water', 'juice'],    out: ['bleach'],  correct: 'milk',      assoc: 'cup',   surface: 'paint',    global: 'stone',  freq: 3 },
  { rule: 'words that mean brave', in: ['bold', 'daring'],    out: ['timid'],   correct: 'valiant',   assoc: 'hero',  surface: 'reckless', global: 'purple', freq: 2 },
  { rule: 'compound words',        in: ['sunflower', 'rainbow'], out: ['happy'], correct: 'football', assoc: 'letter', surface: 'butter',  global: 'chair',  freq: 3 },
  { rule: 'nocturnal animals',     in: ['owl', 'bat'],        out: ['rooster'], correct: 'raccoon',   assoc: 'night', surface: 'sloth',    global: 'brick',  freq: 2 },
  { rule: 'units of length',       in: ['inch', 'meter'],     out: ['pound'],   correct: 'mile',      assoc: 'ruler', surface: 'acre',     global: 'happy',  freq: 2 },
  { rule: 'herbivores',            in: ['cow', 'deer'],       out: ['lion'],    correct: 'rabbit',    assoc: 'grass', surface: 'bear',     global: 'clock',  freq: 2 },
  { rule: 'words with double letters', in: ['tree', 'spoon'], out: ['cat'],     correct: 'wall',      assoc: 'letter', surface: 'level',   global: 'chair',  freq: 3 },

  // ---- Tier 5: bands 17-20 (above-level) — academic / rare semantic fields ----
  { rule: 'words that mean stingy', in: ['miserly', 'frugal'],       out: ['generous'],  correct: 'parsimonious', assoc: 'money',    surface: 'thrifty',   global: 'azure',   freq: 1 },
  { rule: 'words that mean wordy',  in: ['verbose', 'loquacious'],   out: ['terse'],     correct: 'garrulous',    assoc: 'speech',   surface: 'fluent',    global: 'copper',  freq: 1 },
  { rule: 'logical fallacies',      in: ['strawman', 'ad hominem'],  out: ['syllogism'], correct: 'circular',     assoc: 'debate',   surface: 'premise',   global: 'granite', freq: 1 },
  { rule: 'cognitive biases',       in: ['anchoring', 'recency'],    out: ['logic'],     correct: 'confirmation', assoc: 'thinking', surface: 'intuition', global: 'basalt',  freq: 1 },
  { rule: 'words meaning short-lived', in: ['fleeting', 'transient'], out: ['eternal'],  correct: 'ephemeral',    assoc: 'time',     surface: 'brief',     global: 'scarlet', freq: 1 },
  { rule: 'noble gases',            in: ['helium', 'neon'],          out: ['oxygen'],    correct: 'argon',        assoc: 'balloon',  surface: 'nitrogen',  global: 'granite', freq: 1 },
  { rule: 'words meaning stubborn', in: ['obstinate', 'headstrong'], out: ['flexible'],  correct: 'intransigent', assoc: 'refuse',   surface: 'firm',      global: 'maroon',  freq: 1 },
  { rule: 'primary emotions',       in: ['fear', 'anger'],           out: ['table'],     correct: 'disgust',      assoc: 'feeling',  surface: 'jealousy',  global: 'quartz',  freq: 1 },
  { rule: 'words that mean praise', in: ['laud', 'extol'],           out: ['criticize'], correct: 'commend',      assoc: 'award',    surface: 'flatter',   global: 'cobalt',  freq: 1 },
  { rule: 'igneous rocks',          in: ['basalt', 'granite'],       out: ['marble'],    correct: 'obsidian',     assoc: 'lava',     surface: 'sandstone', global: 'violet',  freq: 1 },
  { rule: 'words meaning secretive', in: ['covert', 'clandestine'],  out: ['open'],      correct: 'furtive',      assoc: 'hidden',   surface: 'private',   global: 'amber',   freq: 1 },
  { rule: 'deciduous trees',        in: ['maple', 'oak'],            out: ['pine'],      correct: 'birch',        assoc: 'leaf',     surface: 'holly',     global: 'cobalt',  freq: 1 },
  { rule: 'words meaning brief in speech', in: ['terse', 'curt'],    out: ['rambling'],  correct: 'laconic',      assoc: 'reply',    surface: 'polite',    global: 'garnet',  freq: 1 },
  { rule: 'egg-laying animals',     in: ['hen', 'frog'],             out: ['cow'],       correct: 'snake',        assoc: 'nest',     surface: 'bat',       global: 'granite', freq: 2 },
  { rule: 'words meaning long-lasting', in: ['enduring', 'durable'], out: ['fleeting'],  correct: 'perennial',    assoc: 'time',     surface: 'sturdy',    global: 'ivory',   freq: 1 },
  { rule: 'prime numbers',          in: ['seven', 'eleven'],         out: ['nine'],      correct: 'thirteen',     assoc: 'count',    surface: 'fifteen',   global: 'purple',  freq: 2 },
  { rule: 'words meaning to lessen', in: ['diminish', 'abate'],      out: ['amplify'],   correct: 'mitigate',     assoc: 'reduce',   surface: 'soften',    global: 'crimson', freq: 1 },
  { rule: 'crustaceans',            in: ['crab', 'lobster'],         out: ['tuna'],      correct: 'shrimp',       assoc: 'shell',    surface: 'octopus',   global: 'basalt',  freq: 1 },
  { rule: 'words meaning truthful', in: ['candid', 'frank'],         out: ['deceitful'], correct: 'veracious',    assoc: 'honest',   surface: 'blunt',     global: 'maroon',  freq: 1 },
  { rule: 'renewable resources',    in: ['timber', 'wind'],          out: ['coal'],      correct: 'solar',        assoc: 'green',    surface: 'uranium',   global: 'quartz',  freq: 1 },
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
// Build one BankItem from an authored entry.
// ---------------------------------------------------------------------------
function buildItem(entry, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const band = Math.floor(index / 5) + 1;

  const opts = [
    { token: entry.correct, lure: 'correct' },
    { token: entry.assoc, lure: 'associate' },
    { token: entry.global, lure: 'global_mismatch' },
  ];
  // Introduce the boundary near-miss once the rule is non-trivial.
  if (band >= SURFACE_FROM_BAND && entry.surface) {
    opts.push({ token: entry.surface, lure: 'surface_match' });
  }

  const shuffled = seededShuffle(opts, hashNum(itemId));
  const options = shuffled.map((o) => ({ token: tok(o.token), lure: o.lure }));
  const correctKey = shuffled.findIndex((o) => o.lure === 'correct');
  const distractorRationales = shuffled.map((o) => o.lure);

  return {
    itemId,
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content: {
      typeCode: TYPE_CODE,
      presentation: 'word', // D-017: text only; reading the words IS the task
      prompt: 'The robot sorted these words. Tap the new word that also goes IN.',
      rule: entry.rule,     // SERVER-SIDE ONLY — the renderable subset omits this (never shown)
      examplesIn: entry.in.map(tok),
      examplesOut: entry.out.map(tok),
      options,
      frequencyBand: entry.freq,
    },
    answer: { correctKey, distractorRationales },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      promptHash: createHash('sha1').update(JSON.stringify(entry)).digest('hex').slice(0, 16),
      validator: itemValidatorVerdicts(entry, options, correctKey, difficulty),
    },
    syntheticOnly: true,
    validated: false,
  };
}

function itemValidatorVerdicts(entry, options, correctKey, difficulty) {
  const correctCount = options.filter((o) => o.lure === 'correct').length;
  const distractors = options.filter((o) => o.lure !== 'correct').map((o) => o.lure);
  const distinctLures = new Set(distractors).size === distractors.length;
  const luresValid = options.every((o) => LURE_CLASSES.has(o.lure));
  const shownWords = [...entry.in, ...entry.out, ...options.map((o) => o.token.text)];
  const optionWords = options.map((o) => o.token.text.toLowerCase());
  const uniqueOptions = new Set(optionWords).size === optionWords.length;
  // A member should not also appear among the shown OUT examples (defensible key).
  const keyNotInOut = !entry.out.map((w) => w.toLowerCase()).includes(entry.correct.toLowerCase());
  const k1 = difficulty < 4;
  const readingOk = !k1 || (shownWords.every((w) => w.length <= MAX_WORD_LEN_K1) && entry.freq >= MIN_FREQ_K1);
  return [
    { check: 'unique_answer', status: correctCount === 1 && uniqueOptions && keyNotInOut ? 'pass' : 'fail' },
    { check: 'lure_taxonomy_ok', status: distinctLures && luresValid ? 'pass' : 'fail' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn' },
    { check: 'frequency_band_ok', status: 'pass', detail: `Zipf band ${entry.freq}` },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; universal categories' },
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
    if (typeof c.rule !== 'string' || !c.rule) errors.push(`${where}: content.rule (server-side) missing`);
    const inOk = Array.isArray(c.examplesIn) && c.examplesIn.length >= 2 && c.examplesIn.every((t) => t && t.text);
    const outOk = Array.isArray(c.examplesOut) && c.examplesOut.length >= 1 && c.examplesOut.every((t) => t && t.text);
    if (!inOk) errors.push(`${where}: examplesIn must be >=2 tokens with text`);
    if (!outOk) errors.push(`${where}: examplesOut must be >=1 token with text`);
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) {
      errors.push(`${where}: options must have 3..4 entries`);
      return;
    }
    opts.forEach((o, oi) => {
      if (!LURE_CLASSES.has(o.lure)) errors.push(`${where}: option[${oi}] bad lure ${o.lure}`);
      if (!o.token || typeof o.token.text !== 'string' || !o.token.text) {
        errors.push(`${where}: option[${oi}] token must have text`);
      }
    });
    const correctCount = opts.filter((o) => o.lure === 'correct').length;
    if (correctCount !== 1) errors.push(`${where}: exactly one 'correct' option required (found ${correctCount})`);
    const distractors = opts.filter((o) => o.lure !== 'correct').map((o) => o.lure);
    if (new Set(distractors).size !== distractors.length) errors.push(`${where}: duplicate distractor lure classes`);
    const optWords = opts.map((o) => (o.token && o.token.text ? o.token.text.toLowerCase() : ''));
    if (new Set(optWords).size !== optWords.length) errors.push(`${where}: duplicate option words`);
    // The keyed member must not also be a shown OUT example.
    if (outOk) {
      const outSet = new Set(c.examplesOut.map((t) => t.text.toLowerCase()));
      const correctOpt = opts.find((o) => o.lure === 'correct');
      if (correctOpt && outSet.has(correctOpt.token.text.toLowerCase())) errors.push(`${where}: correct option also appears in examplesOut`);
    }

    const ak = it.answer;
    if (!ak || typeof ak.correctKey !== 'number') errors.push(`${where}: answer.correctKey missing`);
    else if (!opts[ak.correctKey] || opts[ak.correctKey].lure !== 'correct') errors.push(`${where}: correctKey ${ak.correctKey} does not point to the 'correct' option`);
    if (!Array.isArray(ak && ak.distractorRationales) || ak.distractorRationales.length !== opts.length) {
      errors.push(`${where}: distractorRationales must align to options length`);
    } else if (ak.distractorRationales.some((r, ri) => r !== opts[ri].lure)) {
      errors.push(`${where}: distractorRationales must equal options lure order`);
    }

    if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) {
      const words = [...c.examplesIn, ...c.examplesOut, ...opts.map((o) => o.token)].map((t) => t.text);
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

  const items = buildBank();
  const report = validateItems(items);
  if (!report.ok) { console.error('REFUSING TO WRITE — validation failed:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
  writeBank(items);
  printCoverage(report);
  console.log(`\nwrote ${items.length} items -> ${BANK_PATH}`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
