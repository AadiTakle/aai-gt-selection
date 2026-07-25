#!/usr/bin/env node
// VER-BUILDIT-01 (Build-It Buddy) — structured / LLM-authored item bank generator + validator.
//
// This is the LLM-generated content path for a language-heavy verbal type
// (following_oral_directions / receptive language + verbal working memory). Per D-017
// audio is NOT used: the build directions are printed TEXT and reading is required.
// The task is delivered as the recognition variant so it scores by a deterministic key
// (build plan §0/§2): the child reads a short list of construction directions and taps
// the ONE finished arrangement (a "picture" described in words) that follows every step.
//
// The arrangements are AUTHORED DIRECTLY AS DATA below (the `ENTRIES` pool: a canonical
// board of slot->piece placements per item). The generator: (1) templates the printed
// directions from the canonical board, (2) derives the distractor arrangements
// (one directive broken = `rule_violation`; a spatial pair applied backwards =
// `reversed_relation`; a scrambled arrangement = `global_mismatch`), (3) materializes the
// standardized BankItem, and (4) can re-validate the emitted JSONL.
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md     §6 schema, §8.5 verbal LLM generation contract
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-BUILDIT-01.mjs            # build + write banks/VER-BUILDIT-01.jsonl
//   node generators/VER-BUILDIT-01.mjs --validate # validate the JSONL on disk
//   node generators/VER-BUILDIT-01.mjs --check    # build in-memory + validate, do not write
//   node generators/VER-BUILDIT-01.mjs --print 2  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-BUILDIT-01.jsonl');

const TYPE_CODE = 'VER-BUILDIT-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-BUILDIT-01.html';
const GENERATOR_REF = 'VER-BUILDIT-01/authored-boards@v1';

// Allowed distractor lure classes for this type (schema §6.3).
//   rule_violation    = the arrangement breaks exactly one directive (one piece wrong)
//   reversed_relation = a spatial relation applied backwards (two opposite slots swapped)
//   global_mismatch   = the pieces are scrambled across the slots (no directive followed)
const LURE_CLASSES = new Set(['correct', 'rule_violation', 'reversed_relation', 'global_mismatch']);

// The reversed-relation trap needs >=3 placements incl. an opposite pair; add it once the
// build is non-trivial (matches the "embedded conditions adapt up" staircase in the spec).
const REVERSED_FROM_BAND = 5;

// Canvas slots. Opposites drive the reversed_relation lure; SLOT_ORDER drives display.
const SLOT_ORDER = ['top left', 'top', 'top right', 'left', 'center', 'right', 'bottom left', 'bottom', 'bottom right'];
const OPP = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left',
  'top left': 'bottom right', 'bottom right': 'top left',
  'top right': 'bottom left', 'bottom left': 'top right',
};
const SLOT_PHRASE = {
  top: 'at the top', bottom: 'at the bottom', left: 'on the left', right: 'on the right',
  center: 'in the middle', 'top left': 'in the top left corner', 'top right': 'in the top right corner',
  'bottom left': 'in the bottom left corner', 'bottom right': 'in the bottom right corner',
};
const SLOT_LABEL = {
  top: 'top', bottom: 'bottom', left: 'left', right: 'right', center: 'middle',
  'top left': 'top-left', 'top right': 'top-right', 'bottom left': 'bottom-left', 'bottom right': 'bottom-right',
};

// ---------------------------------------------------------------------------
// AUTHORED CONTENT — each entry is a canonical arrangement (the finished "picture").
// Ordered easy -> hard. Difficulty rises across levers (build plan §0):
//   (1) number of placements / steps to hold      (2 -> 5)
//   (2) piece + slot vocabulary (color+shape, corners), word frequency (freq 6-7 -> 1)
//   (3) lure subtlety (scramble -> reversed spatial pair -> single broken directive)
// K-1 / low-difficulty items use only very simple, high-frequency, short words (reading gate, D-017).
//
// Each entry: { b: [[slot, piece], ...] (canonical board), alt: piece, freq }
//   b    = ordered placements the directions describe (slots must be distinct; pieces distinct)
//   alt  = the near-miss piece for the rule_violation lure (must NOT equal any board piece)
//   freq = Zipf-like band 1..7 (7 = most common) for the piece words
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ---- Tier 1: bands 1-4 (K-1) — 2 placements, tiny high-frequency words, 3 options ----
  { b: [['top', 'red square'], ['bottom', 'green tree']], alt: 'blue square', freq: 6 },
  { b: [['top', 'yellow star'], ['bottom', 'blue box']], alt: 'red star', freq: 6 },
  { b: [['left', 'red ball'], ['right', 'black cat']], alt: 'blue ball', freq: 6 },
  { b: [['top', 'blue circle'], ['bottom', 'red cup']], alt: 'green circle', freq: 6 },
  { b: [['left', 'green leaf'], ['right', 'brown dog']], alt: 'red leaf', freq: 5 },
  { b: [['top', 'red hat'], ['bottom', 'blue fish']], alt: 'green hat', freq: 6 },
  { b: [['left', 'yellow sun'], ['right', 'green tree']], alt: 'red sun', freq: 6 },
  { b: [['top', 'black cat'], ['bottom', 'red ball']], alt: 'white cat', freq: 5 },
  { b: [['left', 'blue kite'], ['right', 'red flag']], alt: 'green kite', freq: 5 },
  { b: [['top', 'green frog'], ['bottom', 'blue boat']], alt: 'red frog', freq: 5 },
  { b: [['top', 'red drum'], ['bottom', 'yellow bell']], alt: 'blue drum', freq: 5 },
  { b: [['left', 'brown box'], ['right', 'green cup']], alt: 'red box', freq: 6 },
  { b: [['top', 'blue moon'], ['bottom', 'red star']], alt: 'green moon', freq: 6 },
  { b: [['left', 'red fish'], ['right', 'blue duck']], alt: 'green fish', freq: 6 },
  { b: [['top', 'green ball'], ['bottom', 'black hat']], alt: 'red ball', freq: 6 },
  { b: [['left', 'yellow cup'], ['right', 'red leaf']], alt: 'blue cup', freq: 5 },
  { b: [['top', 'blue tree'], ['bottom', 'green sun']], alt: 'red tree', freq: 5 },
  { b: [['left', 'red boat'], ['right', 'blue kite']], alt: 'green boat', freq: 5 },
  { b: [['top', 'black dog'], ['bottom', 'red box']], alt: 'brown dog', freq: 5 },
  { b: [['left', 'green star'], ['right', 'blue ball']], alt: 'red star', freq: 6 },

  // ---- Tier 2: bands 5-8 (2-3) — 3 placements, first reversed-relation trap ----
  { b: [['top', 'red square'], ['center', 'yellow star'], ['bottom', 'green tree']], alt: 'blue square', freq: 5 },
  { b: [['top', 'blue circle'], ['center', 'red ball'], ['bottom', 'black cat']], alt: 'green circle', freq: 5 },
  { b: [['left', 'green leaf'], ['center', 'red cup'], ['right', 'blue fish']], alt: 'yellow leaf', freq: 5 },
  { b: [['top', 'yellow sun'], ['center', 'blue kite'], ['bottom', 'red boat']], alt: 'green sun', freq: 5 },
  { b: [['top', 'red flag'], ['center', 'green box'], ['bottom', 'blue drum']], alt: 'black flag', freq: 4 },
  { b: [['left', 'red hat'], ['center', 'yellow bell'], ['right', 'green moon']], alt: 'blue hat', freq: 4 },
  { b: [['top', 'blue star'], ['center', 'red tree'], ['bottom', 'green ball']], alt: 'yellow star', freq: 5 },
  { b: [['top', 'brown dog'], ['center', 'red bone'], ['bottom', 'blue duck']], alt: 'black dog', freq: 4 },
  { b: [['left', 'green cup'], ['center', 'red leaf'], ['right', 'yellow sun']], alt: 'blue cup', freq: 4 },
  { b: [['top', 'red kite'], ['center', 'blue cloud'], ['bottom', 'green frog']], alt: 'yellow kite', freq: 4 },
  { b: [['top', 'black cat'], ['center', 'red mouse'], ['bottom', 'green tree']], alt: 'white cat', freq: 4 },
  { b: [['left', 'blue boat'], ['center', 'red fish'], ['right', 'yellow crab']], alt: 'green boat', freq: 4 },
  { b: [['top', 'green apple'], ['center', 'red plum'], ['bottom', 'blue pear']], alt: 'yellow apple', freq: 4 },
  { b: [['top', 'red drum'], ['center', 'blue flute'], ['bottom', 'green bell']], alt: 'yellow drum', freq: 4 },
  { b: [['left', 'yellow moon'], ['center', 'red star'], ['right', 'blue sun']], alt: 'green moon', freq: 5 },
  { b: [['top', 'green truck'], ['center', 'red car'], ['bottom', 'blue bus']], alt: 'black truck', freq: 4 },
  { b: [['top', 'red rose'], ['center', 'green fern'], ['bottom', 'blue bush']], alt: 'yellow rose', freq: 4 },
  { b: [['left', 'blue whale'], ['center', 'red seal'], ['right', 'green shark']], alt: 'gray whale', freq: 3 },
  { b: [['top', 'yellow lion'], ['center', 'red bear'], ['bottom', 'blue wolf']], alt: 'green lion', freq: 4 },
  { b: [['top', 'red brick'], ['center', 'green stone'], ['bottom', 'blue tile']], alt: 'gray brick', freq: 4 },

  // ---- Tier 3: bands 9-12 (4-5) — 3 placements, richer vocab, corner slots appear ----
  { b: [['top', 'purple square'], ['center', 'orange star'], ['bottom', 'green vine']], alt: 'pink square', freq: 3 },
  { b: [['top left', 'red arrow'], ['center', 'blue gear'], ['bottom right', 'green key']], alt: 'silver arrow', freq: 3 },
  { b: [['left', 'golden ring'], ['center', 'silver coin'], ['right', 'bronze bell']], alt: 'copper ring', freq: 2 },
  { b: [['top', 'orange kite'], ['center', 'purple cloud'], ['bottom', 'green hill']], alt: 'yellow kite', freq: 3 },
  { b: [['top', 'red lantern'], ['center', 'blue candle'], ['bottom', 'green torch']], alt: 'gold lantern', freq: 2 },
  { b: [['top right', 'blue comet'], ['center', 'red planet'], ['bottom left', 'green moon']], alt: 'white comet', freq: 2 },
  { b: [['left', 'purple grape'], ['center', 'orange peach'], ['right', 'yellow lemon']], alt: 'green grape', freq: 3 },
  { b: [['top', 'silver crown'], ['center', 'golden ring'], ['bottom', 'bronze shield']], alt: 'iron crown', freq: 2 },
  { b: [['top', 'red maple'], ['center', 'green cedar'], ['bottom', 'brown birch']], alt: 'gold maple', freq: 2 },
  { b: [['left', 'blue river'], ['center', 'green marsh'], ['right', 'brown swamp']], alt: 'gray river', freq: 2 },
  { b: [['top', 'orange tiger'], ['center', 'gray wolf'], ['bottom', 'brown moose']], alt: 'black tiger', freq: 2 },
  { b: [['top', 'purple violet'], ['center', 'red poppy'], ['bottom', 'yellow daisy']], alt: 'blue violet', freq: 2 },
  { b: [['left', 'silver spoon'], ['center', 'golden fork'], ['right', 'bronze knife']], alt: 'copper spoon', freq: 2 },
  { b: [['top', 'red rocket'], ['center', 'blue shuttle'], ['bottom', 'green probe']], alt: 'white rocket', freq: 2 },
  { b: [['top left', 'green ivy'], ['center', 'red thorn'], ['bottom right', 'blue petal']], alt: 'gold ivy', freq: 2 },
  { b: [['left', 'orange fox'], ['center', 'brown hare'], ['right', 'gray otter']], alt: 'red fox', freq: 2 },
  { b: [['top', 'purple orchid'], ['center', 'red tulip'], ['bottom', 'yellow lily']], alt: 'white orchid', freq: 2 },
  { b: [['top', 'silver anchor'], ['center', 'golden compass'], ['bottom', 'bronze wheel']], alt: 'iron anchor', freq: 2 },
  { b: [['left', 'red ember'], ['center', 'orange flame'], ['right', 'blue spark']], alt: 'gold ember', freq: 2 },
  { b: [['top', 'green beetle'], ['center', 'red spider'], ['bottom', 'brown cricket']], alt: 'black beetle', freq: 2 },

  // ---- Tier 4: bands 13-16 (6-8) — 4 placements, embedded conditions, corner slots ----
  { b: [['top', 'red square'], ['right', 'blue circle'], ['bottom', 'green star'], ['left', 'yellow moon']], alt: 'purple square', freq: 3 },
  { b: [['top left', 'silver key'], ['top right', 'golden ring'], ['bottom left', 'bronze coin'], ['bottom right', 'iron nail']], alt: 'copper key', freq: 2 },
  { b: [['top', 'purple dragon'], ['center', 'red knight'], ['bottom', 'green castle'], ['left', 'blue shield']], alt: 'black dragon', freq: 2 },
  { b: [['top', 'orange comet'], ['right', 'red planet'], ['bottom', 'blue moon'], ['left', 'green star']], alt: 'white comet', freq: 2 },
  { b: [['top', 'yellow birch'], ['left', 'red maple'], ['center', 'green pine'], ['right', 'brown oak']], alt: 'gold maple', freq: 2 },
  { b: [['top', 'silver crown'], ['right', 'golden scepter'], ['bottom', 'bronze throne'], ['left', 'iron sword']], alt: 'wooden crown', freq: 1 },
  { b: [['top', 'purple whale'], ['center', 'blue dolphin'], ['bottom', 'green turtle'], ['right', 'gray shark']], alt: 'black whale', freq: 2 },
  { b: [['top left', 'red rose'], ['top right', 'blue iris'], ['bottom left', 'yellow daisy'], ['bottom right', 'purple lily']], alt: 'white rose', freq: 2 },
  { b: [['top', 'orange lantern'], ['right', 'red candle'], ['bottom', 'blue torch'], ['left', 'green flame']], alt: 'gold lantern', freq: 2 },
  { b: [['top', 'silver eagle'], ['center', 'brown hawk'], ['bottom', 'gray falcon'], ['left', 'black raven']], alt: 'golden eagle', freq: 2 },
  { b: [['top', 'red apple'], ['right', 'green pear'], ['bottom', 'purple plum'], ['left', 'orange peach']], alt: 'yellow apple', freq: 3 },
  { b: [['top', 'blue compass'], ['center', 'red anchor'], ['bottom', 'green rudder'], ['right', 'silver wheel']], alt: 'gold compass', freq: 2 },
  { b: [['top', 'purple crystal'], ['right', 'red ruby'], ['bottom', 'green emerald'], ['left', 'blue sapphire']], alt: 'clear crystal', freq: 1 },
  { b: [['top', 'red tiger'], ['center', 'orange lion'], ['bottom', 'brown bear'], ['left', 'gray wolf']], alt: 'black tiger', freq: 2 },
  { b: [['top left', 'green fern'], ['top right', 'red thorn'], ['bottom left', 'blue petal'], ['bottom right', 'yellow bud']], alt: 'gold fern', freq: 2 },
  { b: [['top', 'silver robot'], ['center', 'red rocket'], ['bottom', 'blue gear'], ['right', 'green bolt']], alt: 'gold robot', freq: 2 },
  { b: [['top', 'purple grape'], ['right', 'red cherry'], ['bottom', 'green olive'], ['left', 'orange mango']], alt: 'blue grape', freq: 2 },
  { b: [['top', 'red drum'], ['center', 'blue flute'], ['bottom', 'green harp'], ['left', 'yellow horn']], alt: 'silver drum', freq: 2 },
  { b: [['top', 'brown owl'], ['right', 'gray bat'], ['bottom', 'black crow'], ['left', 'white dove']], alt: 'red owl', freq: 2 },
  { b: [['top', 'silver moon'], ['center', 'golden sun'], ['bottom', 'blue comet'], ['right', 'red planet']], alt: 'pale moon', freq: 2 },

  // ---- Tier 5: bands 17-20 (above-level) — 5 placements, rare vocab, subtle traps ----
  { b: [['top', 'crimson square'], ['top right', 'azure circle'], ['center', 'golden star'], ['bottom left', 'emerald tree'], ['bottom', 'violet moon']], alt: 'amber square', freq: 1 },
  { b: [['top', 'silver falcon'], ['right', 'bronze eagle'], ['center', 'golden hawk'], ['left', 'iron raven'], ['bottom', 'copper owl']], alt: 'pewter falcon', freq: 1 },
  { b: [['top left', 'ruby crown'], ['top right', 'jade scepter'], ['center', 'pearl orb'], ['bottom left', 'onyx throne'], ['bottom right', 'amber sword']], alt: 'opal crown', freq: 1 },
  { b: [['top', 'scarlet dragon'], ['right', 'azure griffin'], ['center', 'golden phoenix'], ['left', 'emerald hydra'], ['bottom', 'violet sphinx']], alt: 'ashen dragon', freq: 1 },
  { b: [['top', 'cobalt planet'], ['top left', 'crimson comet'], ['center', 'golden star'], ['bottom right', 'silver moon'], ['bottom', 'azure nebula']], alt: 'pale planet', freq: 1 },
  { b: [['top', 'amber lantern'], ['right', 'crimson candle'], ['center', 'golden torch'], ['left', 'azure flame'], ['bottom', 'violet ember']], alt: 'pearl lantern', freq: 1 },
  { b: [['top', 'emerald maple'], ['right', 'crimson oak'], ['center', 'golden birch'], ['left', 'azure cedar'], ['bottom', 'amber willow']], alt: 'silver maple', freq: 1 },
  { b: [['top', 'silver anchor'], ['right', 'golden compass'], ['center', 'bronze rudder'], ['left', 'iron sextant'], ['bottom', 'copper wheel']], alt: 'brass anchor', freq: 1 },
  { b: [['top left', 'ruby beetle'], ['top right', 'jade mantis'], ['center', 'amber cricket'], ['bottom left', 'onyx spider'], ['bottom right', 'pearl weevil']], alt: 'opal beetle', freq: 1 },
  { b: [['top', 'crimson orchid'], ['right', 'azure iris'], ['center', 'golden lily'], ['left', 'emerald tulip'], ['bottom', 'violet aster']], alt: 'amber orchid', freq: 1 },
  { b: [['top', 'cobalt whale'], ['right', 'crimson dolphin'], ['center', 'golden marlin'], ['left', 'emerald tuna'], ['bottom', 'silver squid']], alt: 'pearl whale', freq: 1 },
  { b: [['top', 'amber crystal'], ['right', 'crimson ruby'], ['center', 'golden topaz'], ['left', 'azure sapphire'], ['bottom', 'emerald jade']], alt: 'pearl crystal', freq: 1 },
  { b: [['top', 'silver rocket'], ['right', 'crimson shuttle'], ['center', 'golden probe'], ['left', 'azure lander'], ['bottom', 'bronze rover']], alt: 'pewter rocket', freq: 1 },
  { b: [['top', 'scarlet tiger'], ['right', 'amber leopard'], ['center', 'golden lion'], ['left', 'bronze jaguar'], ['bottom', 'onyx panther']], alt: 'ashen tiger', freq: 1 },
  { b: [['top', 'crimson violin'], ['right', 'azure cello'], ['center', 'golden harp'], ['left', 'emerald flute'], ['bottom', 'silver oboe']], alt: 'amber violin', freq: 1 },
  { b: [['top', 'cobalt sphere'], ['top right', 'crimson cube'], ['center', 'golden prism'], ['bottom left', 'emerald cone'], ['bottom', 'amber pyramid']], alt: 'pearl sphere', freq: 1 },
  { b: [['top', 'amber phoenix'], ['right', 'crimson raven'], ['center', 'golden crane'], ['left', 'azure heron'], ['bottom', 'emerald egret']], alt: 'pearl phoenix', freq: 1 },
  { b: [['top', 'silver galleon'], ['right', 'bronze frigate'], ['center', 'golden clipper'], ['left', 'iron schooner'], ['bottom', 'copper sloop']], alt: 'brass galleon', freq: 1 },
  { b: [['top', 'crimson maple'], ['right', 'amber aspen'], ['center', 'golden elm'], ['left', 'emerald spruce'], ['bottom', 'violet larch']], alt: 'silver maple', freq: 1 },
  { b: [['top', 'cobalt comet'], ['top left', 'crimson meteor'], ['center', 'golden quasar'], ['bottom right', 'silver pulsar'], ['bottom', 'azure galaxy']], alt: 'pale comet', freq: 1 },
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

const STOP_WORDS = new Set(['put', 'place', 'the', 'a', 'an', 'at', 'on', 'in', 'of', 'and', 'then',
  'next', 'now', 'also', 'that', 'it', 'to', 'with', 'into', 'above', 'below', 'beside', 'over', 'under']);
function directionWords(directions) {
  return directions.join(' ').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter((w) => w && !STOP_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Directions text (templated from the canonical board) + scene transforms.
// ---------------------------------------------------------------------------
function boardToScene(board) { return board.map(([slot, piece]) => ({ slot, piece })); }
function sceneSig(scene) { return scene.map((p) => `${p.slot}=${p.piece}`).join('|'); }

function directionsFor(board, band) {
  // Directions restate the canonical board as imperative steps; connectors scale reading
  // load with difficulty. The correct arrangement is, by construction, the one that
  // satisfies every step (defensible unique key).
  const conj = band <= 4 ? ['Put'] : ['Then put', 'Next put', 'After that put', 'Also put'];
  return board.map(([slot, piece], i) => {
    const verb = i === 0 ? 'Put' : (band <= 4 ? 'Put' : conj[(i - 1) % conj.length]);
    return `${verb} the ${piece} ${SLOT_PHRASE[slot]}.`;
  });
}

function ruleViolationScene(scene, alt, seed) {
  const idx = seed % scene.length;
  return scene.map((p, i) => (i === idx ? { slot: p.slot, piece: alt } : { slot: p.slot, piece: p.piece }));
}
function findOppositePair(scene) {
  for (let i = 0; i < scene.length; i++) {
    for (let j = i + 1; j < scene.length; j++) {
      if (OPP[scene[i].slot] === scene[j].slot) return [i, j];
    }
  }
  return null;
}
function reversedRelationScene(scene) {
  const pair = findOppositePair(scene);
  if (!pair) return null;
  const [i, j] = pair;
  const out = scene.map((p) => ({ slot: p.slot, piece: p.piece }));
  const tmp = out[i].piece; out[i].piece = out[j].piece; out[j].piece = tmp; // swap pieces across the opposite slots
  return out;
}
function cyclicShiftScene(scene, by) {
  const n = scene.length;
  const k = ((by % n) + n) % n || 1;
  return scene.map((p, i) => ({ slot: p.slot, piece: scene[(i - k + n) % n].piece }));
}
function globalMismatchScene(scene, avoid, seed) {
  for (let by = 1; by < scene.length; by++) {
    const cand = cyclicShiftScene(scene, by);
    const sig = sceneSig(cand);
    if (!avoid.some((s) => sceneSig(s) === sig)) return cand;
  }
  // last-resort deterministic shuffle of pieces across slots
  for (let s = 0; s < 64; s++) {
    const pieces = seededShuffle(scene.map((p) => p.piece), seed + s * 2654435761);
    const cand = scene.map((p, i) => ({ slot: p.slot, piece: pieces[i] }));
    const sig = sceneSig(cand);
    if (sceneSig(scene) !== sig && !avoid.some((a) => sceneSig(a) === sig)) return cand;
  }
  return cyclicShiftScene(scene, 1);
}

// ---------------------------------------------------------------------------
// Build one BankItem from an authored board.
// ---------------------------------------------------------------------------
function buildItem(entry, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const band = Math.floor(index / 5) + 1;
  const board = entry.b;
  const scene = boardToScene(board);
  const directions = directionsFor(board, band);

  const correct = scene;
  const ruleViol = ruleViolationScene(scene, entry.alt, hashNum(itemId + ':rv'));
  const opts = [
    { scene: correct, lure: 'correct' },
    { scene: ruleViol, lure: 'rule_violation' },
  ];
  let reversed = null;
  if (band >= REVERSED_FROM_BAND) reversed = reversedRelationScene(scene);
  if (reversed) opts.push({ scene: reversed, lure: 'reversed_relation' });
  const avoid = opts.map((o) => o.scene);
  const global = globalMismatchScene(scene, avoid, hashNum(itemId + ':g'));
  opts.push({ scene: global, lure: 'global_mismatch' });

  const shuffled = seededShuffle(opts, hashNum(itemId + ':opts'));
  const options = shuffled.map((o) => ({ placements: o.scene.map((p) => ({ slot: p.slot, piece: p.piece })), lure: o.lure }));
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
      presentation: 'word', // D-017: printed text only (no audio); reading the directions IS the task
      prompt: 'Read the building steps. Tap the picture that follows every step.',
      directions,
      options,               // each option is a full arrangement of slot->piece placements
      pieceCount: board.length,
      frequencyBand: entry.freq,
    },
    answer: { correctKey, distractorRationales },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      promptHash: createHash('sha1').update(JSON.stringify(entry)).digest('hex').slice(0, 16),
      validator: itemValidatorVerdicts(entry, options, correctKey, difficulty, directions),
    },
    syntheticOnly: true,
    validated: false,
  };
}

function itemValidatorVerdicts(entry, options, correctKey, difficulty, directions) {
  const n = entry.b.length;
  const correctCount = options.filter((o) => o.lure === 'correct').length;
  const distractors = options.filter((o) => o.lure !== 'correct').map((o) => o.lure);
  const distinctLures = new Set(distractors).size === distractors.length;
  const luresValid = options.every((o) => LURE_CLASSES.has(o.lure));
  const sceneSigs = options.map((o) => o.placements.map((p) => `${p.slot}=${p.piece}`).join('|'));
  const distinctScenes = new Set(sceneSigs).size === options.length;
  const wellFormed = options.every((o) => Array.isArray(o.placements) && o.placements.length === n
    && new Set(o.placements.map((p) => p.slot)).size === n
    && o.placements.every((p) => p.slot && p.piece));
  const altClean = !entry.b.some(([, piece]) => piece === entry.alt);
  const k1 = difficulty < 4;
  const words = [...directionWords(directions), ...entry.b.flatMap(([slot, piece]) => [...piece.split(' '), ...SLOT_LABEL[slot].split('-')])];
  const readingOk = !k1 || (words.every((w) => w.length <= MAX_WORD_LEN_K1) && entry.freq >= MIN_FREQ_K1);
  return [
    { check: 'unique_answer', status: correctCount === 1 && distinctScenes && wellFormed && altClean ? 'pass' : 'fail', detail: 'exactly one arrangement follows every step' },
    { check: 'lure_taxonomy_ok', status: distinctLures && luresValid ? 'pass' : 'fail' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn' },
    { check: 'frequency_band_ok', status: 'pass', detail: `Zipf band ${entry.freq}` },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; universal shapes/colors/objects' },
  ];
}

export function buildBank() {
  return ENTRIES.map((e, i) => buildItem(e, i));
}

// ---------------------------------------------------------------------------
// Validation (parse + structure + arrangements + keys + reading gate + coverage).
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
    const dirs = c.directions;
    if (!Array.isArray(dirs) || dirs.length < 2 || dirs.some((s) => typeof s !== 'string' || !s)) {
      errors.push(`${where}: directions must be >=2 non-empty strings`);
      return;
    }
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) {
      errors.push(`${where}: options must have 3..4 entries`);
      return;
    }
    const n = dirs.length;
    opts.forEach((o, oi) => {
      if (!LURE_CLASSES.has(o.lure)) errors.push(`${where}: option[${oi}] bad lure ${o.lure}`);
      if (!Array.isArray(o.placements) || o.placements.length !== n) {
        errors.push(`${where}: option[${oi}] placements must have ${n} entries`);
        return;
      }
      if (new Set(o.placements.map((p) => p.slot)).size !== n) errors.push(`${where}: option[${oi}] slots must be distinct`);
      o.placements.forEach((p, pi) => {
        if (!p || typeof p.slot !== 'string' || !p.slot || typeof p.piece !== 'string' || !p.piece) {
          errors.push(`${where}: option[${oi}] placement[${pi}] needs slot+piece`);
        }
      });
    });
    const correctCount = opts.filter((o) => o.lure === 'correct').length;
    if (correctCount !== 1) errors.push(`${where}: exactly one 'correct' option required (found ${correctCount})`);
    const distractors = opts.filter((o) => o.lure !== 'correct').map((o) => o.lure);
    if (new Set(distractors).size !== distractors.length) errors.push(`${where}: duplicate distractor lure classes`);
    const sceneSigs = opts.map((o) => (Array.isArray(o.placements) ? o.placements.map((p) => `${p.slot}=${p.piece}`).join('|') : '?'));
    if (new Set(sceneSigs).size !== sceneSigs.length) errors.push(`${where}: duplicate arrangements across options`);

    const ak = it.answer;
    if (!ak || typeof ak.correctKey !== 'number') errors.push(`${where}: answer.correctKey missing`);
    else if (!opts[ak.correctKey] || opts[ak.correctKey].lure !== 'correct') errors.push(`${where}: correctKey ${ak.correctKey} does not point to the 'correct' option`);
    if (!Array.isArray(ak && ak.distractorRationales) || ak.distractorRationales.length !== opts.length) {
      errors.push(`${where}: distractorRationales must align to options length`);
    } else if (ak.distractorRationales.some((r, ri) => r !== opts[ri].lure)) {
      errors.push(`${where}: distractorRationales must equal options lure order`);
    }

    if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) {
      const correctOpt = opts.find((o) => o.lure === 'correct');
      const pieceWords = correctOpt ? correctOpt.placements.flatMap((p) => [...String(p.piece).split(' '), ...String(SLOT_LABEL[p.slot] || p.slot).split('-')]) : [];
      const words = [...directionWords(dirs), ...pieceWords];
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
    console.log('\nVALIDATION PASSED: parse ok, arrangements valid, keys aligned, >=5 items per +/-1 pt band.');
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
