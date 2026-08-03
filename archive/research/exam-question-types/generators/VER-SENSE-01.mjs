#!/usr/bin/env node
// VER-SENSE-01 (Sentence Sense) — structured / LLM-authored item bank generator.
//
// The child drags scrambled word cards into a track to build the sentence that MAKES
// SENSE. The same cards can be ordered in other GRAMMATICAL ways, but only one order
// is also plausible against world knowledge (the Verbal Absurdities construct).
//
// Approach: deterministic STRUCTURE over curated SURFACE CONTENT.
//   * `LEXICON` is a curated, level-graded word list carrying part of speech, semantic
//     features and the numeric roles (chase rank, strength, weight, diet) that the
//     plausibility model needs.
//   * `SENTENCES` are authored directly as data, in TRUE order, easy -> hard.
//   * The generator scrambles the cards deterministically and then PROVES the item by
//     brute force: it enumerates EVERY permutation of the cards, parses each against
//     the grammar (§ parse) and evaluates each parse against the plausibility model
//     (§ sensible). It REFUSES TO WRITE unless
//        (a) exactly ONE permutation is grammatical AND plausible  <- single-satisfiability
//        (b) at least one permutation is grammatical but NOT plausible <- the required
//            grammatical-but-absurd lure the construct depends on.
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp,
//                                                  §4 core metrics (M-VOCABLVL, M-LURETYPE)
//   research/exam-question-types/catalog/master_types.jsonl   VER-SENSE-01 spec
//
// D-017: reading is a required baseline-literacy gate. The spec's picture-plus-audio
// card mode for young bands is NOT built: cards are printed words only, no audio.
// Function words (articles) are omitted so that no two cards are identical and so a
// determiner cannot attach ambiguously — difficulty comes from structure and plausibility.
//
// Governance: born-synthetic. syntheticOnly:true, validated:false. Design difficulty is
// NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-SENSE-01.mjs            # build + prove + write banks/VER-SENSE-01.jsonl
//   node generators/VER-SENSE-01.mjs --check    # build + prove in memory, do not write
//   node generators/VER-SENSE-01.mjs --validate # validate the JSONL already on disk
//   node generators/VER-SENSE-01.mjs --print 2  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { lureLabel, serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-SENSE-01.jsonl');

export const TYPE_CODE = 'VER-SENSE-01';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-SENSE-01.html';
const GENERATOR_REF = 'VER-SENSE-01/authored-sentences+plausibility-model@v1';

export const ITEMS_PER_BAND = 6;

export const LURE_CLASSES = new Set([
  'correct',
  'grammatical-but-absurd',     // parses, but breaks the rules of the world (semantic near-miss)
  'ungrammatical-near-order',   // one adjacent pair swapped — a shuffle, not a reading
  'ungrammatical-reversal',     // the whole sentence backwards
]);

// ---------------------------------------------------------------------------
// CURATED LEXICON. `lvl` is a Zipf-like band (7 = most common) and drives
// content.vocabularyLevel so M-VOCABLVL is derivable per item.
//
// Noun roles used by the plausibility model:
//   rank     pursuit rank      (chase: chaser rank must exceed the chased)
//   strength carrying capacity (carry: strength must be >= weight)
//   weight   how heavy it is
//   diet     what this eater eats        }  eat: diet of the eater must intersect
//   eatenBy  who eats this               }  eatenBy of the eaten
// ---------------------------------------------------------------------------
const N = (lvl, feats, ex = {}) => ({ pos: 'N', lvl, feats, ...ex });
const V = (lvl, spec) => ({ pos: 'V', lvl, adv: true, ...spec });
const A = (lvl, fits, blocks = []) => ({ pos: 'ADJ', lvl, fits, blocks });
const D = (lvl, verbs) => ({ pos: 'ADV', lvl, verbs });
const P = (lvl, objAny) => ({ pos: 'PREP', lvl, objAny });

export const LEXICON = {
  // ---- animals -----------------------------------------------------------
  dog:     N(7, ['animate', 'animal', 'creature'], { rank: 6, strength: 2, diet: ['canine'] }),
  cat:     N(7, ['animate', 'animal', 'creature'], { rank: 5, strength: 1, diet: ['feline'], eatenBy: [] }),
  mouse:   N(6, ['animate', 'animal', 'creature'], { rank: 2, strength: 0, eatenBy: ['feline', 'raptor', 'carnivore'] }),
  bird:    N(7, ['animate', 'animal', 'creature'], { rank: 4, strength: 1, diet: ['insectivore'] }),
  fox:     N(6, ['animate', 'animal', 'creature'], { rank: 7, strength: 2, diet: ['canine', 'carnivore'] }),
  rabbit:  N(6, ['animate', 'animal', 'creature'], { rank: 3, strength: 1, eatenBy: ['canine', 'raptor', 'carnivore'] }),
  owl:     N(5, ['animate', 'animal', 'creature'], { rank: 7, strength: 1, diet: ['raptor'] }),
  horse:   N(6, ['animate', 'animal', 'creature'], { rank: 6, strength: 6, diet: ['herbivore'] }),
  cow:     N(6, ['animate', 'animal', 'creature'], { rank: 5, strength: 5, diet: ['herbivore'] }),
  goat:    N(5, ['animate', 'animal', 'creature'], { rank: 4, strength: 2, diet: ['herbivore'] }),
  bear:    N(6, ['animate', 'animal', 'creature'], { rank: 9, strength: 7, diet: ['carnivore', 'herbivore'] }),
  wolf:    N(5, ['animate', 'animal', 'creature'], { rank: 8, strength: 4, diet: ['carnivore'] }),
  deer:    N(5, ['animate', 'animal', 'creature'], { rank: 4, strength: 3, diet: ['herbivore'], eatenBy: ['carnivore'] }),
  frog:    N(6, ['animate', 'animal', 'creature'], { rank: 3, strength: 0, diet: ['insectivore'] }),
  fish:    N(7, ['food', 'portable'], { weight: 1, eatenBy: ['feline', 'raptor', 'human', 'carnivore'] }),
  worm:    N(6, ['animate', 'animal', 'creature', 'food'], { rank: 1, strength: 0, weight: 1, eatenBy: ['insectivore'] }),
  moth:    N(4, ['animate', 'animal', 'creature', 'food'], { rank: 1, strength: 0, weight: 1, eatenBy: ['insectivore'] }),
  crow:    N(5, ['animate', 'animal', 'creature'], { rank: 4, strength: 1, diet: ['insectivore', 'herbivore'] }),
  camel:   N(4, ['animate', 'animal', 'creature'], { rank: 5, strength: 6, diet: ['herbivore'] }),
  otter:   N(4, ['animate', 'animal', 'creature'], { rank: 5, strength: 2, diet: ['carnivore'] }),
  heron:   N(3, ['animate', 'animal', 'creature'], { rank: 6, strength: 1, diet: ['raptor'] }),
  falcon:  N(3, ['animate', 'animal', 'creature'], { rank: 8, strength: 1, diet: ['raptor'] }),
  badger:  N(3, ['animate', 'animal', 'creature'], { rank: 6, strength: 2, diet: ['carnivore', 'insectivore'] }),
  lynx:    N(2, ['animate', 'animal', 'creature'], { rank: 7, strength: 3, diet: ['carnivore'] }),
  marmot:  N(1, ['animate', 'animal', 'creature'], { rank: 2, strength: 1, diet: ['herbivore'], eatenBy: ['carnivore', 'raptor'] }),
  ibex:    N(1, ['animate', 'animal', 'creature'], { rank: 4, strength: 4, diet: ['herbivore'] }),

  // ---- people ------------------------------------------------------------
  boy:      N(7, ['animate', 'human', 'creature'], { rank: 6, strength: 2, diet: ['human'] }),
  girl:     N(7, ['animate', 'human', 'creature'], { rank: 6, strength: 2, diet: ['human'] }),
  child:    N(7, ['animate', 'human', 'creature'], { rank: 5, strength: 1, diet: ['human'] }),
  farmer:   N(6, ['animate', 'human', 'creature'], { rank: 6, strength: 4, diet: ['human'] }),
  baker:    N(5, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  teacher:  N(6, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  painter:  N(5, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  sailor:   N(4, ['animate', 'human', 'creature'], { rank: 6, strength: 4, diet: ['human'] }),
  hiker:    N(4, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  gardener: N(5, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  mason:    N(2, ['animate', 'human', 'creature'], { rank: 6, strength: 5, diet: ['human'] }),
  weaver:   N(2, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  blacksmith: N(2, ['animate', 'human', 'creature'], { rank: 6, strength: 5, diet: ['human'] }),
  surveyor: N(2, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  botanist: N(2, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  geologist: N(2, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  cartographer: N(1, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),
  archivist: N(1, ['animate', 'human', 'creature'], { rank: 6, strength: 3, diet: ['human'] }),

  // ---- plants + food -----------------------------------------------------
  bone:    N(6, ['food', 'portable'], { weight: 1, eatenBy: ['canine', 'carnivore'] }),
  grass:   N(6, ['food', 'plant'], { weight: 1, eatenBy: ['herbivore'] }),
  hay:     N(5, ['food', 'plant', 'portable'], { weight: 2, eatenBy: ['herbivore'] }),
  apple:   N(7, ['food', 'plant', 'portable'], { weight: 1, eatenBy: ['human', 'herbivore'] }),
  bread:   N(6, ['food', 'portable'], { weight: 1, eatenBy: ['human'] }),
  berries: N(5, ['food', 'plant', 'portable'], { weight: 1, eatenBy: ['human', 'herbivore'] }),
  seeds:   N(5, ['food', 'plant', 'portable', 'sowable'], { weight: 1, eatenBy: ['herbivore', 'insectivore'] }),
  acorn:   N(4, ['food', 'plant', 'portable'], { weight: 1, eatenBy: ['herbivore'] }),
  roses:   N(5, ['plant', 'sowable', 'growing'], { weight: 1 }),
  lichen:  N(1, ['plant', 'food', 'growing'], { weight: 1, eatenBy: ['herbivore'] }),
  saplings: N(2, ['plant', 'sowable', 'growing'], { weight: 2 }),

  // ---- artifacts / portable things --------------------------------------
  ball:    N(7, ['artifact', 'portable', 'kickable'], { weight: 1 }),
  basket:  N(5, ['artifact', 'portable', 'container'], { weight: 1 }),
  bucket:  N(5, ['artifact', 'portable', 'container'], { weight: 1 }),
  lantern: N(4, ['artifact', 'portable'], { weight: 1 }),
  rope:    N(5, ['artifact', 'portable', 'pullable'], { weight: 2 }),
  ladder:  N(5, ['artifact', 'portable', 'wood', 'climbable'], { weight: 3 }),
  cart:    N(5, ['artifact', 'vehicle', 'pullable'], { weight: 4 }),
  book:    N(6, ['artifact', 'portable', 'readable'], { weight: 1 }),
  map:     N(5, ['artifact', 'portable', 'readable'], { weight: 1 }),
  nest:    N(6, ['artifact', 'structure'], { weight: 1 }),
  fence:   N(5, ['artifact', 'structure', 'wood'], { weight: 5 }),
  gate:    N(5, ['artifact', 'structure', 'wood'], { weight: 4 }),
  hammer:  N(6, ['artifact', 'portable', 'tool', 'metal'], { weight: 2 }),
  chain:   N(4, ['artifact', 'portable', 'metal', 'pullable'], { weight: 3 }),
  canvas:  N(3, ['artifact', 'portable', 'cloth'], { weight: 1 }),
  cloth:   N(4, ['artifact', 'portable', 'cloth'], { weight: 1 }),
  compass: N(3, ['artifact', 'portable', 'tool', 'metal'], { weight: 1 }),
  satchel: N(3, ['artifact', 'portable', 'container'], { weight: 1 }),
  anvil:   N(2, ['artifact', 'tool', 'metal', 'portable'], { weight: 8 }),
  stone:   N(5, ['artifact', 'portable'], { weight: 5 }),
  sextant: N(1, ['artifact', 'portable', 'tool', 'metal', 'readable'], { weight: 1 }),
  manuscript: N(1, ['artifact', 'portable', 'readable'], { weight: 1 }),
  telescope: N(3, ['artifact', 'portable', 'tool', 'metal'], { weight: 2 }),
  lattice: N(2, ['artifact', 'structure', 'wood'], { weight: 3 }),

  // ---- places ------------------------------------------------------------
  barn:      N(6, ['place', 'structure'], {}),
  garden:    N(6, ['place'], {}),
  kitchen:   N(6, ['place'], {}),
  field:     N(6, ['place', 'crossable'], {}),
  hill:      N(6, ['place', 'crossable', 'climbable'], {}),
  pond:      N(6, ['place', 'liquid', 'crossable'], {}),
  market:    N(5, ['place', 'crossable'], {}),
  forest:    N(5, ['place', 'crossable'], {}),
  river:     N(5, ['place', 'liquid', 'crossable'], {}),
  bridge:    N(5, ['place', 'structure', 'surface', 'crossable'], {}),
  village:   N(5, ['place', 'crossable'], {}),
  desert:    N(5, ['place', 'crossable'], {}),
  cellar:    N(4, ['place'], {}),
  meadow:    N(4, ['place', 'crossable'], {}),
  orchard:   N(4, ['place', 'crossable'], {}),
  harbor:    N(4, ['place', 'crossable'], {}),
  canyon:    N(4, ['place', 'crossable', 'climbable'], {}),
  workshop:  N(4, ['place'], {}),
  cabin:     N(4, ['place', 'structure'], {}),
  thicket:   N(4, ['place'], {}),
  hedge:     N(4, ['place'], {}),
  marsh:     N(4, ['place', 'crossable'], {}),
  library:   N(4, ['place', 'structure'], {}),
  greenhouse: N(3, ['place', 'structure'], {}),
  courtyard: N(3, ['place', 'crossable'], {}),
  glacier:   N(3, ['place', 'crossable', 'climbable'], {}),
  quarry:    N(3, ['place'], {}),
  plateau:   N(2, ['place', 'crossable', 'climbable'], {}),
  tundra:    N(2, ['place', 'crossable'], {}),
  vault:     N(2, ['place', 'structure'], {}),
  estuary:   N(1, ['place', 'liquid', 'crossable'], {}),
  escarpment: N(1, ['place', 'climbable'], {}),

  // ---- time --------------------------------------------------------------
  dawn:     N(4, ['time'], {}),
  dusk:     N(3, ['time'], {}),
  noon:     N(5, ['time'], {}),
  midnight: N(4, ['time'], {}),
  nightfall: N(2, ['time'], {}),
  daybreak: N(2, ['time'], {}),

  // ---- verbs -------------------------------------------------------------
  ate:      V(7, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['food'] }, rel: 'eat', pp: { preps: ['in', 'beside', 'under'], objAny: ['place'] } }),
  chased:   V(6, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['animate'] }, rel: 'chase', pp: { preps: ['across', 'through', 'around'], objAny: ['place'] } }),
  carried:  V(6, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['portable'], not: ['creature'] }, rel: 'carry', pp: { preps: ['into', 'across', 'through', 'to', 'beside'], objAny: ['place'] } }),
  pulled:   V(6, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['pullable'] }, rel: 'carry', pp: { preps: ['across', 'through', 'to'], objAny: ['place'] } }),
  kicked:   V(6, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['kickable'] }, pp: { preps: ['across', 'into'], objAny: ['place'] } }),
  built:    V(6, { frame: 'tr', subj: { any: ['human', 'animal'] }, obj: { any: ['structure'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  planted:  V(5, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['sowable'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  watered:  V(5, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['growing'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  read:     V(6, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['readable'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  painted:  V(5, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['structure', 'cloth'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  fixed:    V(5, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['artifact'], not: ['place'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  filled:   V(5, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['container'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  climbed:  V(5, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['climbable'] }, pp: { preps: ['at', 'before', 'after'], objAny: ['time'] } }),
  crossed:  V(5, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['crossable'] }, pp: { preps: ['at', 'before', 'after'], objAny: ['time'] } }),
  hid:      V(5, { frame: 'tr', subj: { any: ['animate'] }, obj: { any: ['portable'], not: ['creature'] }, pp: { preps: ['under', 'beside', 'in'], objAny: ['place'] } }),
  forged:   V(2, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['metal'] }, pp: { preps: ['in', 'beside'], objAny: ['place'] } }),
  sketched: V(2, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['place'] }, pp: { preps: ['at', 'before', 'after'], objAny: ['time'] } }),
  mapped:   V(2, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['place'] }, pp: { preps: ['at', 'before', 'after'], objAny: ['time'] } }),
  studied:  V(3, { frame: 'tr', subj: { any: ['human'] }, obj: { any: ['plant', 'place'] }, pp: { preps: ['at', 'before', 'after'], objAny: ['time'] } }),

  // ---- adjectives (class-exclusive on purpose: an adjective may attach to only
  //      one of an item's nouns, so adjective placement is never ambiguous) -----
  hungry:  A(6, ['animate']),
  thirsty: A(5, ['animate']),
  sleepy:  A(5, ['animate']),
  brave:   A(5, ['animate']),
  weary:   A(4, ['animate']),
  clever:  A(5, ['animate']),
  wooden:  A(5, ['wood'], ['animate']),
  rusty:   A(4, ['metal'], ['animate']),
  broken:  A(5, ['artifact'], ['animate', 'place']),
  empty:   A(5, ['container'], ['animate']),
  heavy:   A(5, ['portable'], ['animate', 'place', 'time']),
  brittle: A(2, ['artifact'], ['animate', 'place']),
  ripe:    A(5, ['food', 'plant'], ['animate']),
  fresh:   A(5, ['food'], ['animate', 'place']),
  wilted:  A(3, ['plant'], ['animate']),
  frozen:  A(4, ['liquid'], ['animate']),
  muddy:   A(5, ['place'], ['animate', 'time']),
  quiet:   A(5, ['place'], ['animate', 'time']),
  narrow:  A(5, ['place'], ['animate', 'time']),
  rocky:   A(4, ['place'], ['animate', 'time']),
  crowded: A(4, ['place'], ['animate', 'time']),
  distant: A(3, ['place'], ['animate', 'time']),
  windswept: A(1, ['place'], ['animate', 'time']),

  // ---- adverbs (pre-verbal only) ----------------------------------------
  quickly:   D(5, null),
  slowly:    D(5, null),
  quietly:   D(4, null),
  carefully: D(4, null),
  patiently: D(2, null),
  steadily:  D(2, null),

  // ---- prepositions ------------------------------------------------------
  in:      P(7, ['place']),
  into:    P(6, ['place']),
  under:   P(6, ['place']),
  across:  P(5, ['place']),
  through: P(5, ['place']),
  around:  P(5, ['place']),
  beside:  P(5, ['place']),
  to:      P(7, ['place']),
  at:      P(7, ['time']),
  before:  P(6, ['time']),
  after:   P(6, ['time']),
};

// ---------------------------------------------------------------------------
// AUTHORED SENTENCES — true word order, ordered easy -> hard.
// 5 tiers x 24 = 120 items; each tier fills 4 difficulty bands (6 items per band).
//   tier A  bands  1-4   3 cards   N V N
//   tier B  bands  5-8   4 cards   ADJ N V N
//   tier C  bands  9-12  5 cards   N V N PREP N
//   tier D  bands 13-16  6 cards   ADJ N V N PREP N
//   tier E  bands 17-20  7 cards   ADJ N (ADV|ADJ) V N PREP N   + rare vocabulary
// ---------------------------------------------------------------------------
export const SENTENCES = [
  // ---- tier A : bands 1-4 -------------------------------------------------
  ['dog', 'ate', 'bone'],
  ['cat', 'chased', 'mouse'],
  ['boy', 'kicked', 'ball'],
  ['bird', 'ate', 'worm'],
  ['girl', 'carried', 'basket'],
  ['cow', 'ate', 'grass'],
  ['fox', 'chased', 'rabbit'],
  ['horse', 'pulled', 'cart'],
  ['child', 'ate', 'apple'],
  ['baker', 'carried', 'bread'],
  ['farmer', 'planted', 'seeds'],
  ['cat', 'ate', 'fish'],
  ['dog', 'chased', 'cat'],
  ['boy', 'carried', 'bucket'],
  ['girl', 'watered', 'roses'],
  ['bird', 'built', 'nest'],
  ['farmer', 'built', 'barn'],
  ['horse', 'ate', 'hay'],
  ['owl', 'chased', 'mouse'],
  ['teacher', 'read', 'book'],
  ['painter', 'painted', 'fence'],
  ['goat', 'ate', 'berries'],
  ['wolf', 'chased', 'deer'],
  ['frog', 'ate', 'moth'],

  // ---- tier B : bands 5-8 -------------------------------------------------
  ['hungry', 'dog', 'ate', 'bone'],
  ['sleepy', 'horse', 'pulled', 'cart'],
  ['brave', 'boy', 'climbed', 'hill'],
  ['clever', 'fox', 'hid', 'bone'],
  ['child', 'ate', 'ripe', 'apple'],
  ['thirsty', 'horse', 'ate', 'hay'],
  ['farmer', 'carried', 'wooden', 'ladder'],
  ['girl', 'filled', 'empty', 'bucket'],
  ['horse', 'crossed', 'muddy', 'field'],
  ['deer', 'crossed', 'quiet', 'meadow'],
  ['hungry', 'bear', 'ate', 'berries'],
  ['farmer', 'fixed', 'broken', 'gate'],
  ['boy', 'crossed', 'frozen', 'pond'],
  ['sleepy', 'goat', 'ate', 'grass'],
  ['horse', 'crossed', 'narrow', 'bridge'],
  ['brave', 'sailor', 'pulled', 'rope'],
  ['goat', 'climbed', 'rocky', 'hill'],
  ['baker', 'carried', 'fresh', 'bread'],
  ['crow', 'carried', 'ripe', 'acorn'],
  ['painter', 'painted', 'wooden', 'fence'],
  ['thirsty', 'camel', 'crossed', 'desert'],
  ['hungry', 'owl', 'ate', 'fish'],
  ['gardener', 'watered', 'wilted', 'roses'],
  ['weary', 'hiker', 'carried', 'satchel'],

  // ---- tier C : bands 9-12 ------------------------------------------------
  ['baker', 'carried', 'bread', 'into', 'kitchen'],
  ['farmer', 'planted', 'seeds', 'in', 'field'],
  ['girl', 'carried', 'lantern', 'into', 'cellar'],
  ['hiker', 'carried', 'satchel', 'through', 'forest'],
  ['sailor', 'pulled', 'rope', 'across', 'harbor'],
  ['boy', 'hid', 'acorn', 'under', 'bridge'],
  ['goat', 'climbed', 'hill', 'at', 'dawn'],
  ['deer', 'crossed', 'meadow', 'before', 'dusk'],
  ['farmer', 'pulled', 'cart', 'through', 'orchard'],
  ['child', 'carried', 'bucket', 'to', 'pond'],
  ['painter', 'carried', 'canvas', 'into', 'workshop'],
  ['teacher', 'read', 'map', 'in', 'library'],
  ['camel', 'crossed', 'desert', 'before', 'noon'],
  ['gardener', 'planted', 'roses', 'beside', 'greenhouse'],
  ['otter', 'carried', 'fish', 'across', 'river'],
  ['fox', 'hid', 'bone', 'under', 'thicket'],
  ['sailor', 'carried', 'compass', 'into', 'cabin'],
  ['heron', 'crossed', 'marsh', 'at', 'daybreak'],
  ['painter', 'climbed', 'ladder', 'at', 'noon'],
  ['badger', 'hid', 'acorn', 'under', 'hedge'],
  ['gardener', 'carried', 'basket', 'through', 'orchard'],
  ['hiker', 'climbed', 'canyon', 'before', 'dusk'],
  ['falcon', 'chased', 'rabbit', 'across', 'meadow'],
  ['farmer', 'fixed', 'gate', 'beside', 'barn'],

  // ---- tier D : bands 13-16 -----------------------------------------------
  ['weary', 'hiker', 'carried', 'satchel', 'through', 'canyon'],
  ['falcon', 'chased', 'rabbit', 'across', 'quiet', 'meadow'],
  ['clever', 'otter', 'carried', 'fish', 'across', 'river'],
  ['brave', 'sailor', 'pulled', 'chain', 'across', 'harbor'],
  ['sleepy', 'badger', 'hid', 'acorn', 'under', 'thicket'],
  ['thirsty', 'camel', 'crossed', 'plateau', 'before', 'dusk'],
  ['blacksmith', 'carried', 'rusty', 'hammer', 'into', 'workshop'],
  ['painter', 'carried', 'empty', 'bucket', 'into', 'courtyard'],
  ['gardener', 'planted', 'ripe', 'seeds', 'beside', 'greenhouse'],
  ['mason', 'carried', 'heavy', 'stone', 'into', 'courtyard'],
  ['weary', 'weaver', 'carried', 'cloth', 'into', 'market'],
  ['surveyor', 'carried', 'rusty', 'compass', 'across', 'quarry'],
  ['clever', 'crow', 'hid', 'acorn', 'under', 'hedge'],
  ['botanist', 'studied', 'roses', 'before', 'nightfall'],
  ['lynx', 'chased', 'marmot', 'through', 'rocky', 'tundra'],
  ['blacksmith', 'forged', 'broken', 'chain', 'in', 'workshop'],
  ['geologist', 'studied', 'quarry', 'before', 'nightfall'],
  ['weary', 'hiker', 'climbed', 'glacier', 'before', 'daybreak'],
  ['mason', 'fixed', 'broken', 'lattice', 'beside', 'courtyard'],
  ['sailor', 'carried', 'brittle', 'sextant', 'into', 'cabin'],
  ['botanist', 'planted', 'saplings', 'beside', 'greenhouse'],
  ['weaver', 'carried', 'heavy', 'loom', 'into', 'workshop'],
  ['surveyor', 'mapped', 'escarpment', 'before', 'nightfall'],
  ['clever', 'lynx', 'crossed', 'tundra', 'before', 'daybreak'],

  // ---- tier E : bands 17-20 -----------------------------------------------
  ['weary', 'cartographer', 'carefully', 'sketched', 'harbor', 'before', 'dusk'],
  ['clever', 'archivist', 'quietly', 'carried', 'manuscript', 'into', 'vault'],
  ['lynx', 'quickly', 'chased', 'marmot', 'across', 'windswept', 'tundra'],
  ['weary', 'surveyor', 'patiently', 'mapped', 'escarpment', 'before', 'nightfall'],
  ['brave', 'mason', 'steadily', 'carried', 'stone', 'into', 'courtyard'],
  ['thirsty', 'ibex', 'slowly', 'climbed', 'escarpment', 'before', 'daybreak'],
  ['clever', 'botanist', 'carefully', 'studied', 'lichen', 'before', 'nightfall'],
  ['weary', 'geologist', 'patiently', 'mapped', 'plateau', 'after', 'nightfall'],
  ['brave', 'sailor', 'steadily', 'pulled', 'chain', 'across', 'estuary'],
  ['falcon', 'quickly', 'chased', 'marmot', 'across', 'distant', 'plateau'],
  ['clever', 'archivist', 'carefully', 'read', 'manuscript', 'in', 'vault'],
  ['weary', 'cartographer', 'slowly', 'mapped', 'estuary', 'after', 'daybreak'],
  ['sleepy', 'marmot', 'quietly', 'hid', 'acorn', 'under', 'hedge'],
  ['brave', 'blacksmith', 'steadily', 'forged', 'anvil', 'in', 'workshop'],
  ['weary', 'weaver', 'patiently', 'carried', 'brittle', 'loom', 'into', 'workshop'],
  ['clever', 'surveyor', 'carefully', 'carried', 'brittle', 'sextant', 'across', 'plateau'],
  ['hungry', 'lynx', 'slowly', 'crossed', 'windswept', 'tundra', 'before', 'daybreak'],
  ['weary', 'botanist', 'quietly', 'studied', 'wilted', 'saplings', 'after', 'nightfall'],
  ['brave', 'ibex', 'steadily', 'climbed', 'windswept', 'escarpment', 'before', 'dusk'],
  ['clever', 'cartographer', 'patiently', 'sketched', 'distant', 'estuary', 'after', 'daybreak'],
  ['weary', 'archivist', 'carefully', 'carried', 'brittle', 'manuscript', 'into', 'vault'],
  ['sleepy', 'heron', 'quietly', 'crossed', 'windswept', 'marsh', 'before', 'daybreak'],
  ['brave', 'geologist', 'steadily', 'climbed', 'distant', 'escarpment', 'after', 'dusk'],
  ['brave', 'cartographer', 'steadily', 'sketched', 'windswept', 'estuary', 'after', 'daybreak'],
];

// A couple of tier-D/E sentences need words not in the core pools above.
LEXICON.loom = N(2, ['artifact', 'portable', 'wood'], { weight: 3 });

// ---------------------------------------------------------------------------
// THE MODEL.  parse() decides GRAMMATICAL; sensible() decides PLAUSIBLE.
// A permutation is a defensible answer only if both hold.
//
//   S  -> NP VP
//   NP -> ADJ? N
//   VP -> ADV? V NP? PP?          (NP present iff the verb is transitive)
//   PP -> PREP NP
// Every permutation admits at most one parse, so "how many orders are defensible"
// is exactly "how many permutations survive parse() + sensible()".
// ---------------------------------------------------------------------------
export function posOf(word) {
  const e = LEXICON[word];
  return e ? e.pos : null;
}
export function parse(words) {
  const pos = words.map(posOf);
  if (pos.some((p) => p === null)) return null;
  let i = 0;
  const np = () => {
    let adj = null;
    if (pos[i] === 'ADJ') { adj = words[i]; i++; }
    if (pos[i] !== 'N') return null;
    const head = words[i]; i++;
    return { adj, head };
  };
  const subj = np();
  if (!subj) return null;
  let adv = null;
  if (pos[i] === 'ADV') { adv = words[i]; i++; }
  if (pos[i] !== 'V') return null;
  const verb = words[i]; i++;
  const spec = LEXICON[verb];
  let obj = null;
  if (spec.frame === 'tr') { obj = np(); if (!obj) return null; }
  let pp = null;
  if (i < words.length && pos[i] === 'PREP') {
    const prep = words[i]; i++;
    const ppNp = np();
    if (!ppNp) return null;
    pp = { prep, np: ppNp };
  }
  if (i !== words.length) return null;
  return { subj, adv, verb, obj, pp };
}

function featsOf(word) { return (LEXICON[word] && LEXICON[word].feats) || []; }
function matches(feats, spec) {
  if (!spec) return true;
  if (spec.all && !spec.all.every((t) => feats.includes(t))) return false;
  if (spec.any && !spec.any.some((t) => feats.includes(t))) return false;
  if (spec.not && spec.not.some((t) => feats.includes(t))) return false;
  return true;
}
function adjFits(adj, noun) {
  if (!adj) return true;
  const a = LEXICON[adj], f = featsOf(noun);
  if (a.blocks && a.blocks.some((t) => f.includes(t))) return false;
  return a.fits.some((t) => f.includes(t));
}
// Named relational rules — documented here and re-implemented independently in
// check-VER-SENSE-01.mjs, so a bug in one implementation is caught by the other.
export const RELATION_RULES = {
  chase: 'the pursuer must outrank the pursued (LEXICON rank)',
  eat: 'the eater\'s diet must intersect what the eaten is eatenBy',
  carry: 'the carrier\'s strength must be at least the object\'s weight',
};
function relationHolds(rel, subj, obj) {
  if (!rel) return true;
  const s = LEXICON[subj], o = LEXICON[obj];
  if (rel === 'chase') return (s.rank || 0) > (o.rank || 0);
  if (rel === 'eat') return ((s.diet || []).some((d) => (o.eatenBy || []).includes(d)));
  if (rel === 'carry') return (s.strength || 0) >= (o.weight || 0);
  return true;
}
export function sensible(tree) {
  if (!tree) return false;
  const v = LEXICON[tree.verb];
  if (!adjFits(tree.subj.adj, tree.subj.head)) return false;
  if (!matches(featsOf(tree.subj.head), v.subj)) return false;
  if (tree.obj) {
    if (!adjFits(tree.obj.adj, tree.obj.head)) return false;
    if (!matches(featsOf(tree.obj.head), v.obj)) return false;
    if (tree.subj.head === tree.obj.head) return false;
    if (!relationHolds(v.rel, tree.subj.head, tree.obj.head)) return false;
  }
  if (tree.adv && v.adv === false) return false;
  if (tree.pp) {
    if (!v.pp) return false;
    if (!v.pp.preps.includes(tree.pp.prep)) return false;
    if (!matches(featsOf(tree.pp.np.head), { any: v.pp.objAny })) return false;
    if (!matches(featsOf(tree.pp.np.head), { any: LEXICON[tree.pp.prep].objAny })) return false;
    if (!adjFits(tree.pp.np.adj, tree.pp.np.head)) return false;
    if (tree.pp.np.head === tree.subj.head) return false;
    if (tree.obj && tree.pp.np.head === tree.obj.head) return false;
  }
  return true;
}
export function isSensible(words) { return sensible(parse(words)); }
export function isGrammatical(words) { return parse(words) !== null; }

// Enumerate every ordering of the cards (cards are distinct words by construction).
export function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}
export function surveyOrderings(words) {
  const grammatical = [], plausible = [];
  for (const p of permutations(words)) {
    if (!isGrammatical(p)) continue;
    grammatical.push(p);
    if (sensible(parse(p))) plausible.push(p);
  }
  return { grammatical, plausible };
}

// ---------------------------------------------------------------------------
// Deterministic helpers.
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
export function difficultyFor(band, slot) {
  let offsets;
  if (band === 1) offsets = [0, 0.08, 0.16, 0.24, 0.32, 0.4];
  else if (band === 20) offsets = [-0.4, -0.32, -0.24, -0.16, -0.08, 0];
  else offsets = [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4];
  return Math.round(Math.min(20, Math.max(1, band + offsets[slot])) * 100) / 100;
}
// Spec age_bands for VER-SENSE-01 are 2-3 / 4-5 / 6-8 — there is no K-1 band.
export function ageBandsFor(difficulty) {
  if (difficulty < 8) return ['2-3'];
  if (difficulty < 12) return ['4-5'];
  return ['6-8'];
}
const orderKey = (idxs) => idxs.join(',');
// Index of each true-order word inside the scrambled display array.
function orderIndices(display, order) { return order.map((w) => display.indexOf(w)); }

// ---------------------------------------------------------------------------
// Build one BankItem.
// ---------------------------------------------------------------------------
export function buildItem(index) {
  const words = SENTENCES[index];
  const band = Math.floor(index / ITEMS_PER_BAND) + 1;
  const slot = index % ITEMS_PER_BAND;
  const seed = `${TYPE_CODE}:${index}`;
  const itemId = uuidFrom(seed);
  const difficulty = difficultyFor(band, slot);

  if (new Set(words).size !== words.length) throw new Error(`item ${index}: duplicate card text`);
  for (const w of words) if (!LEXICON[w]) throw new Error(`item ${index}: "${w}" is not in the LEXICON`);

  // Scramble the display order; never show the sensible order already assembled.
  const rnd = mulberry32(hashNum(seed));
  let display = words.slice();
  for (let attempt = 0; attempt < 40; attempt++) {
    const a = words.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.join(' ') !== words.join(' ')) { display = a; break; }
  }

  // PROOF: enumerate every ordering of the cards.
  const survey = surveyOrderings(display);
  const plausible = survey.plausible.map((p) => p.join(' '));
  const absurdOrders = survey.grammatical.filter((g) => !isSensible(g));

  const correctIdx = orderIndices(display, words);
  const rationales = {};
  rationales[orderKey(correctIdx)] = {
    lure: 'correct',
    why: 'the only ordering that is both grammatical and possible in the world',
  };
  // Closest grammatical-but-absurd ordering (fewest positions moved from the answer).
  if (absurdOrders.length) {
    const dist = (o) => o.reduce((n, w, i) => n + (w === words[i] ? 0 : 1), 0);
    const closest = absurdOrders.slice().sort((x, y) => dist(x) - dist(y) || x.join(' ').localeCompare(y.join(' ')))[0];
    rationales[orderKey(orderIndices(display, closest))] = {
      lure: 'grammatical-but-absurd',
      why: `"${closest.join(' ')}" obeys the grammar but breaks the rules of the world — the semantic near-miss`,
    };
  }
  // One adjacent swap of the answer: a shuffle, not a reading.
  const near = words.slice();
  [near[0], near[1]] = [near[1], near[0]];
  const nearK = orderKey(orderIndices(display, near));
  if (!rationales[nearK]) {
    rationales[nearK] = {
      lure: isGrammatical(near) ? 'grammatical-but-absurd' : 'ungrammatical-near-order',
      why: 'one adjacent pair of cards swapped — an off-by-one shuffle of the answer',
    };
  }
  // The whole sentence backwards.
  const rev = words.slice().reverse();
  const revK = orderKey(orderIndices(display, rev));
  if (!rationales[revK]) {
    rationales[revK] = {
      lure: isGrammatical(rev) ? 'grammatical-but-absurd' : 'ungrammatical-reversal',
      why: 'the cards read backwards — no syntactic plan at all',
    };
  }

  const vocabularyLevel = Math.min(...words.map((w) => LEXICON[w].lvl));
  const syntacticComplexity = 1 + (words.some((w) => posOf(w) === 'ADJ') ? 1 : 0)
    + (words.some((w) => posOf(w) === 'PREP') ? 1 : 0)
    + (words.some((w) => posOf(w) === 'ADV') ? 1 : 0);

  return {
    itemId,
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content: {
      typeCode: TYPE_CODE,
      presentation: 'word',   // D-017: printed word cards only, never audio
      prompt: 'Put the word cards in order to build the sentence that makes sense.',
      cards: display.map((w) => ({ text: w })),
      cardCount: display.length,
      trackSlots: display.length,
      vocabularyLevel,
      syntacticComplexity,
    },
    answer: { correctKey: orderKey(correctIdx), distractorRationales: rationales },
    scoring: { mode: 'computed_solver' },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      promptHash: createHash('sha1').update(words.join(' ')).digest('hex').slice(0, 16),
      levers: { band, slot, cardCount: words.length, vocabularyLevel, syntacticComplexity },
      derivation: {
        trueOrder: words.slice(),
        grammaticalOrderings: survey.grammatical.length,
        plausibleOrderings: plausible.length,
        absurdOrderings: absurdOrders.length,
        model: 'parse() + plausibility model over LEXICON; see RELATION_RULES',
      },
      validator: [
        { check: 'unique_answer', status: plausible.length === 1 ? 'pass' : 'fail', detail: `${plausible.length} of ${survey.grammatical.length} grammatical orderings are plausible` },
        { check: 'absurd_lure_present', status: absurdOrders.length >= 1 ? 'pass' : 'fail', detail: `${absurdOrders.length} grammatical-but-absurd orderings` },
        { check: 'reading_load_ok', status: 'pass', detail: `min lexical band ${vocabularyLevel}/7` },
        { check: 'no_audio', status: 'pass', detail: 'D-017: printed word cards only' },
      ],
    },
    syntheticOnly: true,
    validated: false,
  };
}

export function buildBank() { return SENTENCES.map((_, i) => buildItem(i)); }

// ---------------------------------------------------------------------------
// Build-time validation (refuses to write a bank with an ambiguous item).
// ---------------------------------------------------------------------------
export function validateItems(items) {
  const errors = [];
  const bins = {};
  for (let b = 1; b <= 20; b++) bins[b] = 0;

  items.forEach((it, idx) => {
    const where = `item[${idx}] "${it.provenance.derivation.trueOrder.join(' ')}"`;
    if (typeof it.difficulty !== 'number' || it.difficulty < 1 || it.difficulty > 20) errors.push(`${where}: difficulty out of range`);
    else bins[Math.round(it.difficulty)]++;

    const cards = it.content.cards.map((c) => c.text);
    const survey = surveyOrderings(cards);
    if (survey.plausible.length !== 1) {
      errors.push(`${where}: ${survey.plausible.length} plausible orderings (need exactly 1) -> ${survey.plausible.map((p) => p.join(' ')).join(' | ')}`);
    } else if (survey.plausible[0].join(' ') !== it.provenance.derivation.trueOrder.join(' ')) {
      errors.push(`${where}: the unique plausible ordering is "${survey.plausible[0].join(' ')}", not the authored order`);
    }
    if (survey.grammatical.length - survey.plausible.length < 1) {
      errors.push(`${where}: no grammatical-but-absurd lure exists (construct requires one)`);
    }
    const key = it.answer.correctKey.split(',').map(Number);
    if (key.map((i) => cards[i]).join(' ') !== it.provenance.derivation.trueOrder.join(' ')) {
      errors.push(`${where}: correctKey does not spell the authored sentence`);
    }
    // serializeBank rewrites each rationale's `lure` into the D-020
    // lureClass/lureDetail pair, so read the label through lureLabel: `.lure`
    // is undefined for every entry parsed back off disk.
    const labels = Object.values(it.answer.distractorRationales).map(lureLabel);
    const correctCount = labels.filter((l) => l === 'correct').length;
    if (correctCount !== 1) errors.push(`${where}: ${correctCount} rationales labelled correct`);
    if (!labels.some((l) => l === 'grammatical-but-absurd')) {
      errors.push(`${where}: no grammatical-but-absurd rationale recorded (M-LURETYPE)`);
    }
    for (const l of labels) {
      if (!LURE_CLASSES.has(l)) errors.push(`${where}: unknown lure class ${l}`);
    }
  });

  const short = Object.entries(bins).filter(([b, n]) => Number(b) <= 19 && n < 5);
  if (short.length) errors.push(`coverage: buckets with <5 items -> ${short.map(([b, n]) => `${b}:${n}`).join(', ')}`);
  const ids = items.map((i) => i.itemId);
  if (new Set(ids).size !== ids.length) errors.push('itemId collision');

  return { ok: errors.length === 0, errors, count: items.length, bins };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function writeBank(items) {
  mkdirSync(dirname(BANK_PATH), { recursive: true });
  writeFileSync(BANK_PATH, serializeBank(items), 'utf8');
}
function printCoverage(r) {
  console.log(`items: ${r.count}`);
  console.log('per integer bucket (k:n):  ' + Object.entries(r.bins).map(([b, n]) => `${String(b).padStart(2)}:${n}`).join(' '));
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
    if (!existsSync(BANK_PATH)) { console.error(`bank not found: ${BANK_PATH}`); process.exit(1); }
    const items = readFileSync(BANK_PATH, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    const r = validateItems(items);
    printCoverage(r);
    if (!r.ok) { console.error('\nVALIDATION FAILED:\n' + r.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
    console.log('\nVALIDATION PASSED (on-disk bank).');
    return;
  }
  const items = buildBank();
  const r = validateItems(items);
  printCoverage(r);
  if (!r.ok) { console.error(`\nREFUSING TO WRITE — ${r.errors.length} problem(s):\n` + r.errors.slice(0, 40).map((e) => '  - ' + e).join('\n')); process.exit(1); }
  if (has('--check')) { console.log('\nCHECK PASSED (in-memory, not written).'); return; }
  writeBank(items);
  console.log(`\nwrote ${items.length} items -> ${BANK_PATH}`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
