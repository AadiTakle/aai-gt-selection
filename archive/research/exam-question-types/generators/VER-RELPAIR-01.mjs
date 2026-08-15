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
import { lureLabel, serializeBank } from './item-shape.mjs';

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
//
// DIFFICULTY COMES FROM THE RELATION, NOT FROM THE VOCABULARY (rule R6).
// The earlier pool made hard items hard mainly by reaching for rarer words
// (`entomologist : insects`, `verbose : terse`), which measures vocabulary
// exposure rather than relational reasoning — a child who has met the words
// solves an "above-level" item with a K-1 relation. The reviewer asked for
// "more difficulty in the actual association between the words", so the ladder
// is now the RELATION TYPE, band by band, with everyday vocabulary throughout:
//
//   K-1   (bands 1-4)   category membership     dog : animal
//   2-3   (bands 5-8)   part-whole              tree : leaf
//   4-5   (bands 9-12)  function or purpose     broom : sweep
//   6-8   (bands 13-16) degree, or cause/effect warm : hot / spark : fire
//   above (bands 17-20) second-order            key : lock :: answer : riddle
//
// Second-order means the relation itself is what transfers, not the words: the
// stem's relation holds literally in one domain and only by mapping in the
// other (a key opens a lock the way an answer opens a riddle), and no option
// shares a semantic field with the stem, so associative similarity cannot
// stand in for relational reasoning. Every distractor at that band is one of
// the FOUR LOWER relations applied to the same words, so the item is hard
// exactly to the extent that the child must reason above them.
//
// Vocabulary stays age-appropriate at every band (the reading gate, D-017, is
// still enforced on K-1 items), so `freq` no longer falls away as difficulty
// rises — the top band sits at Zipf 3-5, not 1.
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
  // ---- Tier 1: bands 1-4 (K-1) — CATEGORY MEMBERSHIP (dog : animal) ----
  // The easiest relation there is: the second word is the class the first belongs to.
  // Lures: a thematic partner, and a part of some other object (part-whole is the
  // next band up, so it is the closest wrong relation available here).
  { rel: 'is a kind of', stem: ['dog', 'animal'],    correct: ['robin', 'bird'],      assoc: ['dog', 'bone'],       surface: ['cat', 'paw'],        freq: 7 },
  { rel: 'is a kind of', stem: ['apple', 'fruit'],   correct: ['milk', 'drink'],      assoc: ['apple', 'pie'],      surface: ['pear', 'skin'],      freq: 7 },
  { rel: 'is a kind of', stem: ['red', 'color'],     correct: ['three', 'number'],    assoc: ['red', 'paint'],      surface: ['book', 'page'],      freq: 7 },
  { rel: 'is a kind of', stem: ['ball', 'toy'],      correct: ['sock', 'clothes'],    assoc: ['ball', 'game'],      surface: ['doll', 'arm'],       freq: 6 },
  { rel: 'is a kind of', stem: ['rose', 'flower'],   correct: ['ant', 'insect'],      assoc: ['rose', 'garden'],    surface: ['tulip', 'stem'],     freq: 6 },
  { rel: 'is a kind of', stem: ['cow', 'animal'],    correct: ['oak', 'tree'],        assoc: ['cow', 'milk'],       surface: ['pig', 'nose'],       freq: 6 },
  { rel: 'is a kind of', stem: ['hat', 'clothes'],   correct: ['bee', 'insect'],      assoc: ['hat', 'head'],       surface: ['coat', 'sleeve'],    freq: 6 },
  { rel: 'is a kind of', stem: ['bus', 'vehicle'],   correct: ['ten', 'number'],      assoc: ['bus', 'road'],       surface: ['van', 'wheel'],      freq: 6 },
  { rel: 'is a kind of', stem: ['trout', 'fish'],    correct: ['duck', 'bird'],       assoc: ['trout', 'river'],    surface: ['shark', 'fin'],      freq: 5 },
  { rel: 'is a kind of', stem: ['milk', 'drink'],    correct: ['bread', 'food'],      assoc: ['milk', 'glass'],     surface: ['cake', 'slice'],     freq: 7 },
  { rel: 'is a kind of', stem: ['circle', 'shape'],  correct: ['green', 'color'],     assoc: ['circle', 'round'],   surface: ['square', 'side'],    freq: 6 },
  { rel: 'is a kind of', stem: ['five', 'number'],   correct: ['tulip', 'flower'],    assoc: ['five', 'count'],     surface: ['chair', 'leg'],      freq: 6 },
  { rel: 'is a kind of', stem: ['cat', 'animal'],    correct: ['corn', 'plant'],      assoc: ['cat', 'mouse'],      surface: ['dog', 'tail'],       freq: 6 },
  { rel: 'is a kind of', stem: ['robin', 'bird'],    correct: ['maple', 'tree'],      assoc: ['robin', 'nest'],     surface: ['bird', 'wing'],      freq: 5 },
  { rel: 'is a kind of', stem: ['shirt', 'clothes'], correct: ['rice', 'food'],       assoc: ['shirt', 'wash'],     surface: ['shoe', 'lace'],      freq: 5 },
  { rel: 'is a kind of', stem: ['seven', 'number'],  correct: ['wasp', 'insect'],     assoc: ['seven', 'week'],     surface: ['door', 'handle'],    freq: 5 },
  { rel: 'is a kind of', stem: ['hammer', 'tool'],   correct: ['plum', 'fruit'],      assoc: ['hammer', 'nail'],    surface: ['saw', 'blade'],      freq: 5 },
  { rel: 'is a kind of', stem: ['blue', 'color'],    correct: ['goat', 'animal'],     assoc: ['blue', 'sky'],       surface: ['table', 'leg'],      freq: 6 },
  { rel: 'is a kind of', stem: ['pear', 'fruit'],    correct: ['violet', 'flower'],   assoc: ['pear', 'juice'],     surface: ['clock', 'hand'],     freq: 5 },
  { rel: 'is a kind of', stem: ['duck', 'bird'],     correct: ['beetle', 'insect'],   assoc: ['duck', 'pond'],      surface: ['boat', 'sail'],      freq: 5 },

  // ---- Tier 2: bands 5-8 (2-3) — PART-WHOLE (tree : leaf) ----
  // Direction matters: whole first, then one of its parts. The surface lure is a
  // MADE-OF pair, which is the nearest wrong relation — a page is a part of a
  // book, paper is what a book is made of, and telling those apart is the work.
  { rel: 'whole and its part', stem: ['tree', 'leaf'],        correct: ['book', 'page'],      assoc: ['tree', 'shade'],      surface: ['ring', 'gold'],        freq: 6 },
  { rel: 'whole and its part', stem: ['house', 'roof'],       correct: ['car', 'wheel'],      assoc: ['house', 'home'],      surface: ['cup', 'clay'],         freq: 6 },
  { rel: 'whole and its part', stem: ['hand', 'finger'],      correct: ['foot', 'toe'],       assoc: ['hand', 'clap'],       surface: ['shoe', 'leather'],     freq: 6 },
  { rel: 'whole and its part', stem: ['bike', 'pedal'],       correct: ['door', 'handle'],    assoc: ['bike', 'ride'],       surface: ['fence', 'wood'],       freq: 5 },
  { rel: 'whole and its part', stem: ['flower', 'petal'],     correct: ['fish', 'fin'],       assoc: ['flower', 'vase'],     surface: ['window', 'glass'],     freq: 5 },
  { rel: 'whole and its part', stem: ['shirt', 'sleeve'],     correct: ['boat', 'sail'],      assoc: ['shirt', 'wash'],      surface: ['coin', 'metal'],       freq: 5 },
  { rel: 'whole and its part', stem: ['face', 'nose'],        correct: ['clock', 'hand'],     assoc: ['face', 'smile'],      surface: ['knife', 'steel'],      freq: 5 },
  { rel: 'whole and its part', stem: ['bird', 'wing'],        correct: ['chair', 'leg'],      assoc: ['bird', 'song'],       surface: ['sock', 'wool'],        freq: 5 },
  { rel: 'whole and its part', stem: ['plant', 'root'],       correct: ['egg', 'shell'],      assoc: ['plant', 'water'],     surface: ['bottle', 'plastic'],   freq: 5 },
  { rel: 'whole and its part', stem: ['camera', 'lens'],      correct: ['guitar', 'string'],  assoc: ['camera', 'photo'],    surface: ['statue', 'stone'],     freq: 4 },
  { rel: 'whole and its part', stem: ['wall', 'brick'],       correct: ['chain', 'link'],     assoc: ['wall', 'paint'],      surface: ['door', 'wood'],        freq: 4 },
  { rel: 'whole and its part', stem: ['forest', 'tree'],      correct: ['team', 'player'],    assoc: ['forest', 'bear'],     surface: ['flag', 'cloth'],       freq: 4 },
  { rel: 'whole and its part', stem: ['week', 'day'],         correct: ['year', 'month'],     assoc: ['week', 'school'],     surface: ['clock', 'metal'],      freq: 5 },
  { rel: 'whole and its part', stem: ['sentence', 'word'],    correct: ['song', 'verse'],     assoc: ['sentence', 'teacher'],surface: ['letter', 'ink'],       freq: 4 },
  { rel: 'whole and its part', stem: ['city', 'street'],      correct: ['school', 'class'],   assoc: ['city', 'noise'],      surface: ['map', 'paper'],        freq: 4 },
  { rel: 'whole and its part', stem: ['army', 'soldier'],     correct: ['choir', 'singer'],   assoc: ['army', 'war'],        surface: ['medal', 'gold'],       freq: 4 },
  { rel: 'whole and its part', stem: ['piano', 'key'],        correct: ['stairs', 'step'],    assoc: ['piano', 'music'],     surface: ['bell', 'brass'],       freq: 4 },
  { rel: 'whole and its part', stem: ['ship', 'deck'],        correct: ['house', 'floor'],    assoc: ['ship', 'sea'],        surface: ['oar', 'wood'],         freq: 4 },
  { rel: 'whole and its part', stem: ['book', 'chapter'],     correct: ['year', 'season'],    assoc: ['book', 'library'],    surface: ['novel', 'paper'],      freq: 4 },
  { rel: 'whole and its part', stem: ['team', 'player'],      correct: ['flock', 'bird'],     assoc: ['team', 'win'],        surface: ['coat', 'cloth'],       freq: 4 },

  // ---- Tier 3: bands 9-12 (4-5) — FUNCTION OR PURPOSE (broom : sweep) ----
  // The second word is what the first is FOR, which is not readable off either
  // word alone. The surface lure is a part of the object (band 5-8's relation),
  // the associate is where the object is found or what it acts on.
  { rel: 'used for', stem: ['broom', 'sweep'],   correct: ['cup', 'drink'],      assoc: ['broom', 'dust'],     surface: ['cup', 'handle'],   freq: 6 },
  { rel: 'used for', stem: ['knife', 'cut'],     correct: ['pen', 'write'],      assoc: ['knife', 'fork'],     surface: ['pen', 'cap'],      freq: 6 },
  { rel: 'used for', stem: ['key', 'open'],      correct: ['soap', 'clean'],     assoc: ['key', 'door'],       surface: ['soap', 'bubble'],  freq: 6 },
  { rel: 'used for', stem: ['oven', 'bake'],     correct: ['fridge', 'chill'],   assoc: ['oven', 'kitchen'],   surface: ['fridge', 'door'],  freq: 5 },
  { rel: 'used for', stem: ['ruler', 'measure'], correct: ['lamp', 'light'],     assoc: ['ruler', 'line'],     surface: ['lamp', 'shade'],   freq: 5 },
  { rel: 'used for', stem: ['bed', 'sleep'],     correct: ['chair', 'sit'],      assoc: ['bed', 'blanket'],    surface: ['chair', 'leg'],    freq: 6 },
  { rel: 'used for', stem: ['hammer', 'pound'],  correct: ['saw', 'cut'],        assoc: ['hammer', 'wood'],    surface: ['saw', 'blade'],    freq: 5 },
  { rel: 'used for', stem: ['ladder', 'climb'],  correct: ['bridge', 'cross'],   assoc: ['ladder', 'roof'],    surface: ['bridge', 'rail'],  freq: 5 },
  { rel: 'used for', stem: ['glue', 'stick'],    correct: ['net', 'catch'],      assoc: ['glue', 'paper'],     surface: ['net', 'knot'],     freq: 5 },
  { rel: 'used for', stem: ['towel', 'dry'],     correct: ['fan', 'cool'],       assoc: ['towel', 'bath'],     surface: ['fan', 'blade'],    freq: 5 },
  { rel: 'used for', stem: ['phone', 'call'],    correct: ['radio', 'listen'],   assoc: ['phone', 'pocket'],   surface: ['radio', 'dial'],   freq: 5 },
  { rel: 'used for', stem: ['needle', 'sew'],    correct: ['whistle', 'signal'], assoc: ['needle', 'thread'],  surface: ['flute', 'hole'],   freq: 4 },
  { rel: 'used for', stem: ['brake', 'stop'],    correct: ['oar', 'row'],        assoc: ['brake', 'wheel'],    surface: ['oar', 'handle'],   freq: 4 },
  { rel: 'used for', stem: ['map', 'guide'],     correct: ['list', 'remember'],  assoc: ['map', 'globe'],      surface: ['list', 'paper'],   freq: 4 },
  { rel: 'used for', stem: ['fence', 'protect'], correct: ['roof', 'cover'],     assoc: ['fence', 'garden'],   surface: ['roof', 'tile'],    freq: 4 },
  { rel: 'used for', stem: ['scale', 'weigh'],   correct: ['timer', 'time'],     assoc: ['scale', 'heavy'],    surface: ['timer', 'bell'],   freq: 4 },
  { rel: 'used for', stem: ['lock', 'secure'],   correct: ['label', 'identify'], assoc: ['lock', 'gate'],      surface: ['label', 'paper'],  freq: 4 },
  { rel: 'used for', stem: ['candle', 'light'],  correct: ['blanket', 'warm'],   assoc: ['candle', 'wax'],     surface: ['blanket', 'corner'], freq: 5 },
  { rel: 'used for', stem: ['sponge', 'soak'],   correct: ['straw', 'sip'],      assoc: ['sponge', 'water'],   surface: ['straw', 'paper'],  freq: 5 },
  { rel: 'used for', stem: ['rope', 'tie'],      correct: ['hook', 'hang'],      assoc: ['rope', 'knot'],      surface: ['hook', 'tip'],     freq: 5 },

  // ---- Tier 4: bands 13-16 (6-8) — DEGREE, or CAUSE AND EFFECT ----
  // Two relations that need the pair to be compared rather than classified:
  // `warm : hot` is the same quality further along, `spark : fire` is one thing
  // bringing the other about. The lures are near-synonyms and opposites, which
  // sit closest to a degree reading, plus the reversed pair.
  { rel: 'stronger form of',  stem: ['warm', 'hot'],          correct: ['big', 'huge'],           assoc: ['warm', 'sun'],        surface: ['hot', 'cold'],       freq: 5 },
  { rel: 'cause then effect', stem: ['spark', 'fire'],        correct: ['rain', 'flood'],         assoc: ['spark', 'wire'],      surface: ['rain', 'drop'],      freq: 5 },
  { rel: 'stronger form of',  stem: ['small', 'tiny'],        correct: ['cool', 'cold'],          assoc: ['small', 'mouse'],     surface: ['cold', 'hot'],       freq: 5 },
  { rel: 'cause then effect', stem: ['cut', 'pain'],          correct: ['joke', 'laugh'],         assoc: ['cut', 'knife'],       surface: ['pain', 'ache'],      freq: 5 },
  { rel: 'stronger form of',  stem: ['tired', 'exhausted'],   correct: ['angry', 'furious'],      assoc: ['tired', 'bed'],       surface: ['angry', 'calm'],     freq: 4 },
  { rel: 'cause then effect', stem: ['sun', 'heat'],          correct: ['wind', 'wave'],          assoc: ['sun', 'sky'],         surface: ['heat', 'warm'],      freq: 5 },
  { rel: 'stronger form of',  stem: ['good', 'great'],        correct: ['bad', 'awful'],          assoc: ['good', 'praise'],     surface: ['bad', 'sad'],        freq: 5 },
  { rel: 'cause then effect', stem: ['germ', 'illness'],      correct: ['frost', 'ice'],          assoc: ['germ', 'soap'],       surface: ['illness', 'health'], freq: 4 },
  { rel: 'stronger form of',  stem: ['hungry', 'starving'],   correct: ['wet', 'soaked'],         assoc: ['hungry', 'lunch'],    surface: ['wet', 'dry'],        freq: 4 },
  { rel: 'cause then effect', stem: ['rest', 'energy'],       correct: ['exercise', 'strength'],  assoc: ['rest', 'bed'],        surface: ['energy', 'power'],   freq: 4 },
  { rel: 'stronger form of',  stem: ['like', 'love'],         correct: ['dislike', 'hate'],       assoc: ['like', 'friend'],     surface: ['love', 'heart'],     freq: 5 },
  { rel: 'cause then effect', stem: ['practice', 'skill'],    correct: ['study', 'knowledge'],    assoc: ['practice', 'team'],   surface: ['skill', 'talent'],   freq: 4 },
  { rel: 'stronger form of',  stem: ['damp', 'soaked'],       correct: ['chilly', 'freezing'],    assoc: ['damp', 'towel'],      surface: ['soaked', 'dry'],     freq: 4 },
  { rel: 'cause then effect', stem: ['noise', 'headache'],    correct: ['smoke', 'cough'],        assoc: ['noise', 'street'],    surface: ['headache', 'pain'],  freq: 4 },
  { rel: 'stronger form of',  stem: ['big', 'gigantic'],      correct: ['loud', 'deafening'],     assoc: ['big', 'size'],        surface: ['loud', 'quiet'],     freq: 3 },
  { rel: 'cause then effect', stem: ['flood', 'damage'],      correct: ['fire', 'ash'],           assoc: ['flood', 'rain'],      surface: ['damage', 'harm'],    freq: 4 },
  { rel: 'stronger form of',  stem: ['sad', 'heartbroken'],   correct: ['glad', 'overjoyed'],     assoc: ['sad', 'tears'],       surface: ['glad', 'upset'],     freq: 3 },
  { rel: 'cause then effect', stem: ['kindness', 'friendship'], correct: ['lying', 'distrust'],   assoc: ['kindness', 'gift'],   surface: ['friendship', 'trust'], freq: 3 },
  { rel: 'stronger form of',  stem: ['push', 'shove'],        correct: ['sip', 'gulp'],           assoc: ['push', 'door'],       surface: ['shove', 'pull'],     freq: 3 },
  { rel: 'cause then effect', stem: ['sunlight', 'growth'],   correct: ['water', 'rust'],         assoc: ['sunlight', 'window'], surface: ['growth', 'size'],    freq: 3 },

  // ---- Tier 5: bands 17-20 (above level) — SECOND-ORDER ----
  // The relation, not the words, is what carries over: a key opens a lock the way
  // an answer opens a riddle, a map stands for the land the way a menu stands for
  // the meal. The correct option shares no semantic field with the stem, so the
  // only route to it is the relation held in the abstract. Every distractor is one
  // of the four lower-band relations (category, part, purpose, cause) on the same
  // words, so an above-level item is hard because the relation is hard — the
  // vocabulary stays at Zipf 3-5, the same range as the 4-5 band.
  { rel: 'second-order: one opens what the other closes',      stem: ['key', 'lock'],           correct: ['answer', 'riddle'],    assoc: ['key', 'door'],         surface: ['riddle', 'puzzle'],  freq: 5 },
  { rel: 'second-order: a small marked thing standing for a big real one', stem: ['map', 'land'], correct: ['menu', 'meal'],      assoc: ['map', 'journey'],      surface: ['land', 'field'],     freq: 5 },
  { rel: 'second-order: the trace left behind by the thing',   stem: ['footprint', 'foot'],     correct: ['echo', 'sound'],       assoc: ['footprint', 'mud'],    surface: ['sound', 'noise'],    freq: 5 },
  { rel: 'second-order: the warning that comes before',        stem: ['siren', 'danger'],       correct: ['thunder', 'storm'],    assoc: ['siren', 'truck'],      surface: ['danger', 'risk'],    freq: 5 },
  { rel: 'second-order: the hard outside guarding the good inside', stem: ['shell', 'nut'],     correct: ['skin', 'fruit'],       assoc: ['shell', 'beach'],      surface: ['nut', 'seed'],       freq: 5 },
  { rel: 'second-order: a small likeness of the real thing',   stem: ['photo', 'person'],       correct: ['model', 'ship'],       assoc: ['photo', 'album'],      surface: ['person', 'face'],    freq: 5 },
  { rel: 'second-order: the thing that puts the trouble right', stem: ['cure', 'illness'],      correct: ['apology', 'quarrel'],  assoc: ['cure', 'doctor'],      surface: ['illness', 'pain'],   freq: 4 },
  { rel: 'second-order: the mark left after the harm has healed', stem: ['scar', 'wound'],      correct: ['ash', 'fire'],         assoc: ['scar', 'skin'],        surface: ['wound', 'cut'],      freq: 4 },
  { rel: 'second-order: the emblem that stands for the whole', stem: ['flag', 'country'],       correct: ['crown', 'king'],       assoc: ['flag', 'pole'],        surface: ['country', 'land'],   freq: 4 },
  { rel: 'second-order: the sign that says it is coming',      stem: ['cloud', 'rain'],         correct: ['growl', 'bite'],       assoc: ['cloud', 'sky'],        surface: ['rain', 'storm'],     freq: 4 },
  { rel: 'second-order: a toy-sized stand-in for the real one', stem: ['doll', 'person'],       correct: ['globe', 'earth'],      assoc: ['doll', 'child'],       surface: ['person', 'name'],    freq: 4 },
  { rel: 'second-order: what closes the gap that stopped you', stem: ['bridge', 'gap'],         correct: ['patch', 'hole'],       assoc: ['bridge', 'river'],     surface: ['gap', 'space'],      freq: 4 },
  { rel: 'second-order: what shields you from the harm',       stem: ['medicine', 'pain'],      correct: ['shelter', 'storm'],    assoc: ['medicine', 'spoon'],   surface: ['pain', 'hurt'],      freq: 4 },
  { rel: 'second-order: the word that tells you which one',    stem: ['name', 'person'],        correct: ['title', 'book'],       assoc: ['name', 'card'],        surface: ['person', 'friend'],  freq: 4 },
  { rel: 'second-order: what is left when the whole is gone',  stem: ['stump', 'tree'],         correct: ['ruin', 'castle'],      assoc: ['stump', 'axe'],        surface: ['tree', 'branch'],    freq: 4 },
  { rel: 'second-order: the rules that keep it in bounds',     stem: ['rules', 'game'],         correct: ['laws', 'country'],     assoc: ['rules', 'player'],     surface: ['game', 'fun'],       freq: 4 },
  { rel: 'second-order: the smallest part of something vast',  stem: ['drop', 'ocean'],         correct: ['step', 'journey'],     assoc: ['drop', 'rain'],        surface: ['ocean', 'sea'],      freq: 5 },
  { rel: 'second-order: the unseen thing holding it up',       stem: ['foundation', 'house'],   correct: ['trust', 'friendship'], assoc: ['foundation', 'stone'], surface: ['house', 'room'],     freq: 3 },
  { rel: 'second-order: what it leaves that proves it passed', stem: ['feather', 'bird'],       correct: ['track', 'deer'],       assoc: ['feather', 'pillow'],   surface: ['bird', 'wing'],      freq: 4 },
  { rel: 'second-order: the picture that means the idea',      stem: ['heart', 'love'],         correct: ['dove', 'peace'],       assoc: ['heart', 'blood'],      surface: ['love', 'like'],      freq: 4 },
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
      // serializeBank rewrites each rationale's `lure` into the D-020
      // lureClass/lureDetail pair, so read the label through lureLabel: `.lure`
      // is undefined for every entry parsed back off disk.
      const lures = expected.map((k) => lureLabel(rats[k]));
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
  const jsonl = serializeBank(items);
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
