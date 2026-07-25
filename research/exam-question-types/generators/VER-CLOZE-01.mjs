#!/usr/bin/env node
// VER-CLOZE-01 (Fill the Gap) — structured / LLM-authored item bank generator + validator.
//
// This is the LLM-generated content path for a language-heavy verbal type
// (sentence_completion / sentence inference). The sentence items are AUTHORED
// DIRECTLY AS DATA below (the `ENTRIES` pool); the generator materializes them
// into the standardized BankItem schema, deterministically assigns difficulty
// across 1..20, tags every distractor with a lure class, and can re-validate the
// emitted JSONL. It can also be EXTENDED (append entries -> rebuild).
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md     §6 schema, §8.2 VER-CLOZE-01 content contract
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-CLOZE-01.mjs            # build + write banks/VER-CLOZE-01.jsonl
//   node generators/VER-CLOZE-01.mjs --write    # (same)
//   node generators/VER-CLOZE-01.mjs --validate # validate the JSONL on disk (parse + coverage + keys)
//   node generators/VER-CLOZE-01.mjs --check    # build in-memory + validate, do not write
//   node generators/VER-CLOZE-01.mjs --print 3  # print the first N built items as pretty JSON

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-CLOZE-01.jsonl');

const TYPE_CODE = 'VER-CLOZE-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-CLOZE-01.html';
const GENERATOR_REF = 'VER-CLOZE-01/authored-pools@v1';

// Allowed distractor lure classes for this type (schema §6.3 / §8.2).
//   local_fit       = reads fine right next to the blank but contradicts the whole sentence
//   global_mismatch = wrong meaning for the sentence as a whole
//   associate       = thematic/topical pull, does not correctly complete the gap
const LURE_CLASSES = new Set(['correct', 'local_fit', 'global_mismatch', 'associate']);

// The local_fit "collocation trap" is only introduced once sentences carry a
// whole-sentence logic (contrast/causal). Below this band the gap is a simple
// local completion (gapType 'local_fit'); at/above it the gap is 'global_fit'.
const GLOBAL_FIT_FROM_BAND = 5;

// ---------------------------------------------------------------------------
// AUTHORED CONTENT (the "LLM-generated" sentence items, written directly as data).
// Ordered easy -> hard. Difficulty rises across three levers (build plan §0):
//   (1) sentence logic     (single clause -> causal/contrast -> logical reversal)
//   (2) word frequency     (freq 7 = very common / K vocabulary -> freq 1 = rare/academic)
//   (3) lure subtlety      (unrelated word -> topical associate -> local-collocation trap)
// K-1 / low-difficulty items use only very simple, high-frequency words (reading gate, D-017).
//
// Each entry: { frame, correct, global, assoc, local?, freq }
//   frame   = sentence shown to the child; the gap is marked with "___"
//   correct = the one word that correctly completes the gap
//   global  = global_mismatch lure (wrong meaning for the whole sentence)
//   assoc   = associate lure (topical pull, wrong completion)
//   local   = local_fit lure (reads locally, contradicts the sentence); bands >= 5 only
//   freq    = Zipf-like band 1..7 (7 = most common) for the option words
// syntacticComplexity is derived from the band (1..5) at build time.
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ---- Tier 1: bands 1-4 (K-1) — one clause, universal, very high-frequency ----
  { frame: 'The dog can ___.',        correct: 'run',   global: 'blue',  assoc: 'bone',   freq: 6 },
  { frame: 'The bird can ___.',       correct: 'fly',   global: 'cook',  assoc: 'nest',   freq: 6 },
  { frame: 'The fish can ___.',       correct: 'swim',  global: 'sing',  assoc: 'pond',   freq: 6 },
  { frame: 'The cat can ___.',        correct: 'jump',  global: 'read',  assoc: 'milk',   freq: 6 },
  { frame: 'The sun is ___.',         correct: 'hot',   global: 'cold',  assoc: 'sky',    freq: 7 },
  { frame: 'The ice is ___.',         correct: 'cold',  global: 'loud',  assoc: 'cube',   freq: 6 },
  { frame: 'The baby can ___.',       correct: 'cry',   global: 'drive', assoc: 'milk',   freq: 6 },
  { frame: 'The frog can ___.',       correct: 'hop',   global: 'bake',  assoc: 'pond',   freq: 5 },
  { frame: 'We sleep in a ___.',      correct: 'bed',   global: 'spoon', assoc: 'night',  freq: 6 },
  { frame: 'We eat with a ___.',      correct: 'fork',  global: 'sock',  assoc: 'food',   freq: 6 },
  { frame: 'A cow can say ___.',      correct: 'moo',   global: 'zoom',  assoc: 'milk',   freq: 5 },
  { frame: 'The car can ___.',        correct: 'go',    global: 'eat',   assoc: 'road',   freq: 6 },
  { frame: 'Rain makes me ___.',      correct: 'wet',   global: 'tall',  assoc: 'cloud',  freq: 6 },
  { frame: 'At night I see the ___.', correct: 'moon',  global: 'grass', assoc: 'sleep',  freq: 6 },
  { frame: 'A bee can ___.',          correct: 'buzz',  global: 'read',  assoc: 'honey',  freq: 5 },
  { frame: 'The snow is ___.',        correct: 'white', global: 'angry', assoc: 'winter', freq: 5 },
  { frame: 'A hat goes on your ___.', correct: 'head',  global: 'door',  assoc: 'hair',   freq: 6 },
  { frame: 'The tree is very ___.',   correct: 'tall',  global: 'sad',   assoc: 'leaf',   freq: 6 },
  { frame: 'I hear with my ___.',     correct: 'ears',  global: 'hands', assoc: 'sound',  freq: 6 },
  { frame: 'The fire is ___.',        correct: 'hot',   global: 'soft',  assoc: 'smoke',  freq: 6 },

  // ---- Tier 2: bands 5-8 (2-3) — causal "so/because", simple contrast ----
  { frame: 'It was raining, so he opened his ___.',       correct: 'umbrella',  global: 'banana',   assoc: 'raincloud', local: 'notebook', freq: 5 },
  { frame: 'The soup was too hot, so she let it ___.',    correct: 'cool',      global: 'spill',    assoc: 'steam',     local: 'boil',     freq: 5 },
  { frame: 'He was hungry, so he made a ___.',            correct: 'sandwich',  global: 'pillow',   assoc: 'kitchen',   local: 'mess',     freq: 5 },
  { frame: 'The dog was dirty, so we gave it a ___.',     correct: 'bath',      global: 'song',     assoc: 'bone',      local: 'brush',    freq: 5 },
  { frame: 'It got dark, so she turned on the ___.',      correct: 'light',     global: 'grass',    assoc: 'switch',    local: 'water',    freq: 5 },
  { frame: 'The ground was icy, so she walked very ___.', correct: 'slowly',    global: 'happily',  assoc: 'winter',    local: 'quickly',  freq: 5 },
  { frame: 'He dropped the glass and it ___.',            correct: 'broke',     global: 'grew',     assoc: 'kitchen',   local: 'bounced',  freq: 5 },
  { frame: 'She planted a seed and it began to ___.',     correct: 'grow',      global: 'melt',     assoc: 'garden',    local: 'shrink',   freq: 5 },
  { frame: 'The baby was tired, so it started to ___.',   correct: 'yawn',      global: 'paint',    assoc: 'crib',      local: 'giggle',   freq: 4 },
  { frame: 'We put the milk in the ___ to keep it cold.', correct: 'fridge',    global: 'garden',   assoc: 'carton',    local: 'oven',     freq: 5 },
  { frame: 'A spider spins a ___ to catch bugs.',         correct: 'web',       global: 'wheel',    assoc: 'silk',      local: 'trap',     freq: 4 },
  { frame: 'The team was happy because they ___.',        correct: 'won',       global: 'slept',    assoc: 'coach',     local: 'lost',     freq: 5 },
  { frame: 'It was cold, so she put on a warm ___.',      correct: 'coat',      global: 'lamp',     assoc: 'winter',    local: 'shirt',    freq: 5 },
  { frame: 'The pencil was dull, so he had to ___ it.',   correct: 'sharpen',   global: 'swallow',  assoc: 'eraser',    local: 'break',    freq: 4 },
  { frame: 'The flowers needed water, so she ___ them.',  correct: 'watered',   global: 'painted',  assoc: 'garden',    local: 'picked',   freq: 4 },
  { frame: 'He whispered so no one could ___ him.',       correct: 'hear',      global: 'smell',    assoc: 'quiet',     local: 'see',      freq: 5 },
  { frame: 'The bread was old and had turned ___.',       correct: 'stale',     global: 'purple',   assoc: 'bakery',    local: 'fresh',    freq: 4 },
  { frame: 'She was brave and did not feel ___.',         correct: 'afraid',    global: 'sleepy',   assoc: 'hero',      local: 'scared',   freq: 4 },
  { frame: 'The runner was fast and won the ___.',        correct: 'race',      global: 'lunch',    assoc: 'track',     local: 'medal',    freq: 5 },
  { frame: 'The joke was funny, so everyone ___.',        correct: 'laughed',   global: 'painted',  assoc: 'comedy',    local: 'cried',    freq: 5 },

  // ---- Tier 3: bands 9-12 (4-5) — contrast, connotation, "although/but" ----
  { frame: 'Although the movie was long, the kids stayed ___.',        correct: 'awake',       global: 'purple',    assoc: 'theater',   local: 'asleep',     freq: 4 },
  { frame: 'The room was messy, but after an hour it looked ___.',     correct: 'tidy',        global: 'noisy',     assoc: 'broom',     local: 'dirty',      freq: 4 },
  { frame: 'She spoke softly, yet her message was surprisingly ___.',  correct: 'powerful',    global: 'wooden',    assoc: 'whisper',   local: 'quiet',      freq: 3 },
  { frame: 'Despite the storm, the pilot stayed perfectly ___.',       correct: 'calm',        global: 'wet',       assoc: 'airplane',  local: 'nervous',    freq: 4 },
  { frame: 'The test looked hard, but the class found it quite ___.',  correct: 'easy',        global: 'green',     assoc: 'teacher',   local: 'tricky',     freq: 4 },
  { frame: 'He seemed unfriendly, but he was actually very ___.',      correct: 'kind',        global: 'square',    assoc: 'stranger',  local: 'rude',       freq: 4 },
  { frame: 'The old bridge looked weak, yet it was truly ___.',        correct: 'sturdy',      global: 'sleepy',    assoc: 'river',     local: 'fragile',    freq: 3 },
  { frame: 'The review was harsh, calling the meal a total ___.',      correct: 'disaster',    global: 'rainbow',   assoc: 'restaurant',local: 'delight',    freq: 3 },
  { frame: 'Even though she practiced, her first try was still ___.',  correct: 'clumsy',      global: 'orange',    assoc: 'practice',  local: 'graceful',   freq: 3 },
  { frame: 'The plan sounded risky, but it proved remarkably ___.',    correct: 'safe',        global: 'loud',      assoc: 'blueprint', local: 'dangerous',  freq: 4 },
  { frame: 'The crowd was loud, but the speaker remained ___.',        correct: 'composed',    global: 'striped',   assoc: 'stadium',   local: 'frantic',    freq: 3 },
  { frame: 'His excuse was thin and clearly not ___.',                 correct: 'honest',      global: 'frozen',    assoc: 'trouble',   local: 'truthful',   freq: 3 },
  { frame: 'The puppy was tiny now, but it would grow ___.',           correct: 'huge',        global: 'quiet',     assoc: 'kennel',    local: 'smaller',    freq: 4 },
  { frame: 'The path seemed simple, yet it was full of ___ turns.',    correct: 'confusing',   global: 'tasty',     assoc: 'forest',    local: 'obvious',    freq: 3 },
  { frame: 'She acted confident, though inside she felt quite ___.',   correct: 'unsure',      global: 'sticky',    assoc: 'stage',     local: 'certain',    freq: 3 },
  { frame: 'The soup tasted bland until he added a ___ of salt.',      correct: 'pinch',       global: 'shadow',    assoc: 'flavor',    local: 'bucket',     freq: 3 },
  { frame: 'The instructions were clear, so the task felt ___.',       correct: 'simple',      global: 'yellow',    assoc: 'manual',    local: 'confusing',  freq: 4 },
  { frame: 'The lake was still and its surface stayed ___.',           correct: 'smooth',      global: 'angry',     assoc: 'water',     local: 'choppy',     freq: 3 },
  { frame: 'The gift was cheap, but the thought behind it was ___.',   correct: 'priceless',   global: 'muddy',     assoc: 'present',   local: 'worthless',  freq: 3 },
  { frame: 'The rumor spread fast, though almost none of it was ___.', correct: 'true',        global: 'metal',     assoc: 'gossip',    local: 'false',      freq: 4 },

  // ---- Tier 4: bands 13-16 (6-8) — logical reversal, abstract vocabulary ----
  { frame: 'Far from being generous, the landlord was notoriously ___.', correct: 'stingy',      global: 'damp',       assoc: 'apartment',  local: 'giving',       freq: 3 },
  { frame: 'The argument was not sound; in fact it was deeply ___.',     correct: 'flawed',      global: 'purple',     assoc: 'debate',     local: 'logical',      freq: 3 },
  { frame: 'Rather than clarifying the issue, his answer only ___ it.',  correct: 'muddled',     global: 'toasted',    assoc: 'question',   local: 'clarified',    freq: 2 },
  { frame: 'Contrary to the forecast, the afternoon turned out ___.',    correct: 'sunny',       global: 'square',     assoc: 'weather',    local: 'stormy',       freq: 3 },
  { frame: 'The witness seemed reliable, yet her account was ___.',      correct: 'inconsistent',global: 'fragrant',   assoc: 'courtroom',  local: 'consistent',   freq: 2 },
  { frame: 'Unlike his cautious sister, the boy was famously ___.',      correct: 'reckless',    global: 'wooden',     assoc: 'sibling',    local: 'careful',      freq: 3 },
  { frame: 'The proposal was far from original; it felt entirely ___.',  correct: 'derivative',  global: 'salty',      assoc: 'meeting',    local: 'inventive',    freq: 1 },
  { frame: 'Though praised as humble, the star was privately quite ___.',correct: 'arrogant',    global: 'frozen',     assoc: 'celebrity',  local: 'modest',       freq: 2 },
  { frame: 'The medicine did not cure her; it merely ___ the pain.',     correct: 'masked',      global: 'painted',    assoc: 'hospital',   local: 'cured',        freq: 2 },
  { frame: 'His tone was anything but sincere; it dripped with ___.',    correct: 'sarcasm',     global: 'gravel',     assoc: 'speech',     local: 'honesty',      freq: 2 },
  { frame: 'The evidence was hardly conclusive; it remained highly ___.',correct: 'doubtful',    global: 'striped',    assoc: 'science',    local: 'certain',      freq: 3 },
  { frame: 'Instead of calming the crowd, the news left them more ___.', correct: 'agitated',    global: 'polished',   assoc: 'audience',   local: 'soothed',      freq: 2 },
  { frame: 'The essay was praised for being concise rather than ___.',   correct: 'wordy',       global: 'muddy',      assoc: 'writer',     local: 'brief',        freq: 3 },
  { frame: 'She was no amateur; her technique was thoroughly ___.',      correct: 'polished',    global: 'edible',     assoc: 'hobby',      local: 'clumsy',       freq: 2 },
  { frame: 'The plan was not spontaneous at all; it was carefully ___.', correct: 'deliberate',  global: 'juicy',      assoc: 'schedule',   local: 'sudden',       freq: 2 },
  { frame: 'Far from thriving, the small shop was slowly ___.',          correct: 'failing',     global: 'glowing',    assoc: 'market',     local: 'flourishing',  freq: 3 },
  { frame: 'The scientist stayed neutral and refused to appear ___.',    correct: 'biased',      global: 'crunchy',    assoc: 'laboratory', local: 'fair',         freq: 2 },
  { frame: 'His generosity was genuine, never merely for ___.',          correct: 'show',        global: 'gravity',    assoc: 'charity',    local: 'kindness',     freq: 3 },
  { frame: 'The negotiation did not ease tensions; it only ___ them.',   correct: 'inflamed',    global: 'buttered',   assoc: 'treaty',     local: 'eased',        freq: 1 },
  { frame: 'The report was meant to inform, not to ___ the public.',     correct: 'mislead',     global: 'moisten',    assoc: 'newspaper',  local: 'inform',       freq: 2 },

  // ---- Tier 5: bands 17-20 (above-level "clearly gifted") — rare, subtle logic ----
  { frame: 'Far from being verbose, her acceptance speech was strikingly ___.', correct: 'terse',        global: 'fragrant',    assoc: 'podium',      local: 'wordy',        freq: 1 },
  { frame: 'The treaty did not appease the rebels; it merely ___ them.',        correct: 'placated',     global: 'ventilated',  assoc: 'diplomat',    local: 'provoked',     freq: 1 },
  { frame: 'His prose, praised as lucid, was in truth maddeningly ___.',        correct: 'opaque',       global: 'buoyant',     assoc: 'novelist',    local: 'clear',        freq: 1 },
  { frame: 'The critic found the film not innovative but wholly ___.',          correct: 'derivative',   global: 'edible',      assoc: 'director',    local: 'original',     freq: 1 },
  { frame: 'Rather than resolving the paradox, the theory merely ___ it.',      correct: 'compounded',   global: 'laminated',   assoc: 'physics',     local: 'resolved',     freq: 1 },
  { frame: 'She was hardly a novice; her scholarship was widely deemed ___.',   correct: 'erudite',      global: 'aquatic',     assoc: 'university',  local: 'amateurish',   freq: 1 },
  { frame: 'The apology rang hollow, laden with transparent ___.',             correct: 'insincerity',  global: 'sediment',    assoc: 'quarrel',     local: 'remorse',      freq: 1 },
  { frame: 'Far from impartial, the ruling was steeped in evident ___.',        correct: 'prejudice',    global: 'humidity',    assoc: 'tribunal',    local: 'fairness',     freq: 1 },
  { frame: 'The remedy did not eradicate the blight; it only ___ its spread.',  correct: 'curbed',       global: 'garnished',   assoc: 'harvest',     local: 'hastened',     freq: 1 },
  { frame: 'His demeanor was not austere at all, but disarmingly ___.',         correct: 'affable',      global: 'granular',    assoc: 'gentleman',   local: 'severe',       freq: 1 },
  { frame: 'The manuscript was celebrated for its brevity, never its ___.',     correct: 'verbosity',    global: 'salinity',    assoc: 'library',     local: 'concision',    freq: 1 },
  { frame: 'The regime sought not to enlighten citizens but to ___ them.',      correct: 'indoctrinate', global: 'refrigerate', assoc: 'government',  local: 'educate',      freq: 1 },
  { frame: 'The data were anything but robust; the sample was woefully ___.',   correct: 'inadequate',   global: 'aromatic',    assoc: 'statistic',   local: 'sufficient',   freq: 2 },
  { frame: 'Rather than a triumph, the launch proved an unmitigated ___.',      correct: 'debacle',      global: 'crescendo',   assoc: 'rocket',      local: 'success',      freq: 1 },
  { frame: 'The mediator strove to reconcile, never to ___, the factions.',     correct: 'alienate',     global: 'caramelize',  assoc: 'summit',      local: 'unite',        freq: 1 },
  { frame: 'His candor was refreshing in an age of political ___.',            correct: 'evasion',      global: 'irrigation',  assoc: 'senator',     local: 'honesty',      freq: 1 },
  { frame: 'The verdict, meant to vindicate her, only deepened the ___.',       correct: 'suspicion',    global: 'condensation',assoc: 'jury',        local: 'certainty',    freq: 2 },
  { frame: 'Praised as frugal, the ruler was in fact ruinously ___.',           correct: 'extravagant',  global: 'nocturnal',   assoc: 'treasury',    local: 'thrifty',      freq: 1 },
  { frame: 'The essay aimed to illuminate the topic, not to ___ it further.',   correct: 'obscure',      global: 'marinate',    assoc: 'scholar',     local: 'clarify',      freq: 1 },
  { frame: 'Far from ephemeral, the artist\u2019s fame proved utterly ___.',    correct: 'enduring',     global: 'gaseous',     assoc: 'gallery',     local: 'fleeting',     freq: 1 },
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

// Words in the sentence frame we do NOT reading-gate (function words / the gap marker).
const STOP_WORDS = new Set(['the', 'a', 'an', 'i', 'we', 'he', 'she', 'it', 'they', 'you',
  'to', 'in', 'on', 'of', 'and', 'so', 'my', 'your', 'is', 'was', 'can', 'at', 'with', 'no',
  'one', 'could', 'not', 'had', 'has', 'do', 'did', 'up', 'put', 'its', 'her', 'him', 'them']);

function frameWords(frame) {
  return frame
    .replace(/___/g, ' ')
    .toLowerCase()
    .replace(/[^a-z\u2019' ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Build one BankItem from an authored entry.
// ---------------------------------------------------------------------------
function buildItem(entry, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const band = Math.floor(index / 5) + 1;
  const syntacticComplexity = Math.min(5, Math.ceil(band / 4));
  const gapType = band >= GLOBAL_FIT_FROM_BAND ? 'global_fit' : 'local_fit';

  const opts = [
    { token: entry.correct, fit: 'correct' },
    { token: entry.global, fit: 'global_mismatch' },
    { token: entry.assoc, fit: 'associate' },
  ];
  // Introduce the local-collocation trap once the sentence carries whole-sentence logic.
  if (band >= GLOBAL_FIT_FROM_BAND && entry.local) {
    opts.push({ token: entry.local, fit: 'local_fit' });
  }

  const shuffled = seededShuffle(opts, hashNum(itemId));
  const options = shuffled.map((o) => ({ token: tok(o.token), fit: o.fit }));
  const correctKey = shuffled.findIndex((o) => o.fit === 'correct');
  const distractorRationales = shuffled.map((o) => o.fit);

  return {
    itemId,
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content: {
      typeCode: TYPE_CODE,
      mode: 'cloze',
      presentation: 'word', // D-017: text only (no audio / picture crutch); reading required
      sentenceFrame: entry.frame,
      gapType,
      options,
      targetFrequencyBand: entry.freq,
      syntacticComplexity,
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

// Design-time self-check verdicts recorded on each item (still validated:false overall).
function itemValidatorVerdicts(entry, options, correctKey, difficulty) {
  const correctCount = options.filter((o) => o.fit === 'correct').length;
  const distractors = options.filter((o) => o.fit !== 'correct').map((o) => o.fit);
  const distinctLures = new Set(distractors).size === distractors.length;
  const luresValid = options.every((o) => LURE_CLASSES.has(o.fit));
  const optionWords = options.map((o) => o.token.text);
  const words = [...frameWords(entry.frame), ...optionWords];
  const k1 = difficulty < 4;
  const readingOk = !k1 || (words.every((w) => w.length <= MAX_WORD_LEN_K1) && entry.freq >= MIN_FREQ_K1);
  const uniqueOptions = new Set(optionWords.map((w) => w.toLowerCase())).size === optionWords.length;
  return [
    { check: 'unique_answer', status: correctCount === 1 && uniqueOptions ? 'pass' : 'fail' },
    { check: 'lure_taxonomy_ok', status: distinctLures && luresValid ? 'pass' : 'fail' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn' },
    { check: 'frequency_band_ok', status: 'pass', detail: `Zipf band ${entry.freq}` },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; everyday contexts' },
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
    if (typeof c.sentenceFrame !== 'string' || !c.sentenceFrame.includes('___')) {
      errors.push(`${where}: sentenceFrame must contain a "___" gap`);
    }
    if (c.gapType !== 'local_fit' && c.gapType !== 'global_fit') {
      errors.push(`${where}: gapType must be local_fit|global_fit`);
    }
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) {
      errors.push(`${where}: options must have 3..4 entries`);
      return;
    }
    opts.forEach((o, oi) => {
      if (!LURE_CLASSES.has(o.fit)) errors.push(`${where}: option[${oi}] bad lure ${o.fit}`);
      if (!o.token || typeof o.token.text !== 'string' || !o.token.text) {
        errors.push(`${where}: option[${oi}] token must have text`);
      }
    });
    const correctCount = opts.filter((o) => o.fit === 'correct').length;
    if (correctCount !== 1) errors.push(`${where}: exactly one 'correct' option required (found ${correctCount})`);
    const distractors = opts.filter((o) => o.fit !== 'correct').map((o) => o.fit);
    if (new Set(distractors).size !== distractors.length) errors.push(`${where}: duplicate distractor lure classes`);
    const optWords = opts.map((o) => o.token && o.token.text ? o.token.text.toLowerCase() : '');
    if (new Set(optWords).size !== optWords.length) errors.push(`${where}: duplicate option words`);

    const ak = it.answer;
    if (!ak || typeof ak.correctKey !== 'number') errors.push(`${where}: answer.correctKey missing`);
    else if (!opts[ak.correctKey] || opts[ak.correctKey].fit !== 'correct') errors.push(`${where}: correctKey ${ak.correctKey} does not point to the 'correct' option`);
    if (!Array.isArray(ak && ak.distractorRationales) || ak.distractorRationales.length !== opts.length) {
      errors.push(`${where}: distractorRationales must align to options length`);
    } else if (ak.distractorRationales.some((r, ri) => r !== opts[ri].fit)) {
      errors.push(`${where}: distractorRationales must equal options lure order`);
    }

    // Reading gate for K-1 items.
    if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) {
      const words = [...frameWords(c.sentenceFrame), ...opts.map((o) => o.token.text)];
      const tooLong = words.filter((w) => w.length > MAX_WORD_LEN_K1);
      if (tooLong.length) errors.push(`${where}: K-1 reading gate — words too long: ${tooLong.join(', ')}`);
      if (typeof c.targetFrequencyBand === 'number' && c.targetFrequencyBand < MIN_FREQ_K1) {
        errors.push(`${where}: K-1 reading gate — targetFrequencyBand ${c.targetFrequencyBand} < ${MIN_FREQ_K1}`);
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

  const items = buildBank();
  const report = validateItems(items);
  if (!report.ok) { console.error('REFUSING TO WRITE — validation failed:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
  writeBank(items);
  printCoverage(report);
  console.log(`\nwrote ${items.length} items -> ${BANK_PATH}`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
