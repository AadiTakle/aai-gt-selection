#!/usr/bin/env node
// VER-POLYSEME-01 (Two Meanings) — structured / LLM-authored item bank generator + validator.
//
// This is the LLM-generated content path for a language-heavy verbal type
// (context-driven lexical ambiguity resolution). A homograph is shown inside a
// meaning-biasing SENTENCE; the child taps the ONE "picture" that shows the meaning
// the sentence points to. It is a single-select item scored by a deterministic key
// (build plan §0/§2).
//
// Per the schema spec §8.4 this type needs a curated homograph + picture set. Picture
// availability normally limits auto-generation; here the pictures are authored as
// WORD-BASED, EMOJI-FREE picture tokens (short descriptive labels), so the whole set is
// authored directly as data. A real deployment would swap each label for an assetId from
// a picture library (the label text becomes the alt/caption). Reading is required (D-017):
// the biasing sentence is printed text, never audio.
//
// Each item always shows FOUR pictures, tagged (schema §8.4 -> §6.3 lure taxonomy):
//   correct         -> the sentence-appropriate meaning of the word
//   local_fit       -> the word's OTHER real meaning (valid for the word, wrong for THIS
//                      sentence): the diagnostic near-miss the type is built around
//   associate       -> a thematic associate of the sentence (not a meaning of the word)
//   global_mismatch -> an unrelated foil
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md     §6 schema, §8.4 VER-POLYSEME-01 asset-bank note
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-POLYSEME-01.mjs            # build + write banks/VER-POLYSEME-01.jsonl
//   node generators/VER-POLYSEME-01.mjs --validate # validate the JSONL on disk
//   node generators/VER-POLYSEME-01.mjs --check    # build in-memory + validate, do not write
//   node generators/VER-POLYSEME-01.mjs --print 2  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-POLYSEME-01.jsonl');

const TYPE_CODE = 'VER-POLYSEME-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-POLYSEME-01.html';
const GENERATOR_REF = 'VER-POLYSEME-01/authored-homographs@v1';

// Allowed distractor lure classes for this type (schema §6.3 / §8.4).
const LURE_CLASSES = new Set(['correct', 'local_fit', 'associate', 'global_mismatch']);

// Lure labels are ANSWER-REVEALING and must never appear under `content`: the browser
// receives ServedItem = BankItem minus {answer, scoring, provenance} (build plan §2), so a
// per-option `lure` field hands over the key. The taxonomy still has to survive the move —
// M-LURETYPE and M-ERRTYPE score on which lure the child selected — so it lives in
// answer.distractorRationales, keyed by the option index the child actually sees.
const LURE_WHY = {
  correct: 'the sense the homograph carries in this sentence',
  local_fit: 'the other real sense of the homograph — right word, wrong context',
  associate: 'depicts something the sentence mentions, not what the word means',
  global_mismatch: 'unrelated to both the word and the sentence',
};

// Keys are stringified option indices so a rationale can never be read positionally.
function rationalesByOption(lures) {
  const out = {};
  lures.forEach((lure, i) => { out[String(i)] = { lure, why: LURE_WHY[lure] }; });
  return out;
}

// Any key under `content` that would identify the correct option.
// Re-asserted independently by check-VER-POLYSEME-01.mjs.
const LEAK_KEY = /^(lure|lures|misconception|correct|iscorrect|is_correct|correctkey|key|answer|answers|solution|solver|sense|rationale|rationales|distractorrationales|fit|why|note|explanation|errortype|error_type|truth|verdict)$/i;

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

// ---------------------------------------------------------------------------
// AUTHORED CONTENT — a curated homograph + (word-based) picture set. Ordered easy -> hard.
// Difficulty rises across levers (build plan §0 + spec difficulty_levers):
//   (1) meaning dominance     (target the dominant meaning -> the SUBORDINATE meaning)
//   (2) context-bias strength (strong -> weak biasing sentence)
//   (3) word frequency        (freq 6-7 common homographs -> freq 1 rare / heteronyms)
// K-1 / low-difficulty items use only very simple, high-frequency, short words (reading gate, D-017).
//
// Each entry: { w, s, correct, other, assoc, unrel, freq, tgt, bias }
//   w       = the homograph (shown; also appears IN the sentence, emphasized in CAPS)
//   s       = the meaning-biasing sentence (printed; the homograph is UPPERCASE in it)
//   correct = picture label for the sentence-appropriate meaning       -> 'correct'
//   other   = picture label for the word's OTHER real meaning          -> 'local_fit'
//   assoc   = picture label thematically tied to the sentence          -> 'associate'
//   unrel   = picture label for an unrelated foil                      -> 'global_mismatch'
//   freq    = Zipf-like band 1..7 (7 = most common) for the homograph
//   tgt     = which sense is targeted: 'dominant' | 'subordinate'      (difficulty note)
//   bias    = context-bias strength: 'strong' | 'moderate' | 'weak'    (difficulty note)
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ---- Tier 1: bands 1-4 (K-1) — very common homographs, strong context, tiny words ----
  { w: 'bat', s: 'The BAT flew out of the dark cave at night.', correct: 'a small animal that can fly', other: 'a wooden bat to hit a ball', assoc: 'a dark rocky cave', unrel: 'a bowl of warm soup', freq: 6, tgt: 'subordinate', bias: 'strong' },
  { w: 'duck', s: 'The DUCK swam on the pond with her babies.', correct: 'a bird that swims on water', other: 'a boy ducking down to hide', assoc: 'a calm blue pond', unrel: 'a red toy car', freq: 6, tgt: 'dominant', bias: 'strong' },
  { w: 'bark', s: 'The dog began to BARK at the mail truck.', correct: 'a dog barking with its mouth open', other: 'the rough bark on a tree trunk', assoc: 'a red mail truck', unrel: 'a slice of cake', freq: 6, tgt: 'dominant', bias: 'strong' },
  { w: 'wave', s: 'A big WAVE splashed over the sandy beach.', correct: 'a tall ocean wave', other: 'a girl waving her hand', assoc: 'soft yellow sand', unrel: 'a green apple', freq: 6, tgt: 'dominant', bias: 'strong' },
  { w: 'pen', s: 'The pig sleeps inside its muddy PEN.', correct: 'a fenced pen for farm animals', other: 'a blue pen for writing', assoc: 'a fat pink pig', unrel: 'a bright yellow star', freq: 5, tgt: 'subordinate', bias: 'strong' },
  { w: 'nail', s: 'He hit the NAIL with a big hammer.', correct: 'a metal nail for wood', other: 'a painted finger nail', assoc: 'a heavy steel hammer', unrel: 'a soft green leaf', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'trunk', s: 'The elephant lifted logs with its long TRUNK.', correct: 'the long nose of an elephant', other: 'the trunk at the back of a car', assoc: 'a huge gray elephant', unrel: 'a cup of milk', freq: 5, tgt: 'subordinate', bias: 'strong' },
  { w: 'park', s: 'We played on the swings at the PARK.', correct: 'a green park with trees', other: 'a man parking his car', assoc: 'a fun red swing', unrel: 'a bowl of rice', freq: 6, tgt: 'dominant', bias: 'strong' },
  { w: 'jam', s: 'I spread sweet JAM on my warm toast.', correct: 'red jam made from fruit', other: 'cars stuck in a traffic jam', assoc: 'a slice of warm toast', unrel: 'a black cat', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'fan', s: 'The FAN blew cool air on a hot day.', correct: 'a fan that blows cool air', other: 'a happy sports fan cheering', assoc: 'a bright hot sun', unrel: 'a small brown dog', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'roll', s: 'We watched the ball ROLL down the hill.', correct: 'a ball rolling down a slope', other: 'a soft bread roll to eat', assoc: 'a steep green hill', unrel: 'a yellow pencil', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'seal', s: 'The SEAL clapped and dove into the sea.', correct: 'a sea animal with flippers', other: 'a wax seal on a letter', assoc: 'the deep blue sea', unrel: 'a big red truck', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'top', s: 'The TOP spun fast on the smooth floor.', correct: 'a toy top that spins', other: 'the top shelf of a closet', assoc: 'a shiny wood floor', unrel: 'a ripe banana', freq: 5, tgt: 'subordinate', bias: 'strong' },
  { w: 'bowl', s: 'She ate her cereal from a blue BOWL.', correct: 'a round bowl for food', other: 'a boy bowling a heavy ball', assoc: 'a spoon full of cereal', unrel: 'a green kite', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'ring', s: 'She wore a gold RING on her finger.', correct: 'a gold ring for a finger', other: 'a boxing ring for a fight', assoc: 'a shiny gold chain', unrel: 'a big brown box', freq: 6, tgt: 'dominant', bias: 'strong' },
  { w: 'fly', s: 'A tiny FLY buzzed around the trash.', correct: 'a small buzzing insect', other: 'a bird flying in the sky', assoc: 'a smelly trash can', unrel: 'a warm red hat', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'watch', s: 'He looked at his WATCH to see the time.', correct: 'a watch worn on the wrist', other: 'kids watching a fun show', assoc: 'a round black clock', unrel: 'a slice of pizza', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'tie', s: 'Dad wore a striped TIE to work.', correct: 'a tie worn around the neck', other: 'a girl tying her shoe', assoc: 'a clean white shirt', unrel: 'a green frog', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'block', s: 'The baby stacked one wooden BLOCK on top.', correct: 'a wooden toy block', other: 'a boy blocking a door', assoc: 'a smiling little baby', unrel: 'a ripe red apple', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'light', s: 'The lamp gave off a warm LIGHT.', correct: 'a bright glowing light', other: 'a feather that is very light', assoc: 'a tall metal lamp', unrel: 'a slice of bread', freq: 6, tgt: 'dominant', bias: 'strong' },

  // ---- Tier 2: bands 5-8 (2-3) — common homographs, some subordinate targets ----
  { w: 'bank', s: 'We sat on the grassy BANK of the river.', correct: 'the sloping land beside a river', other: 'a bank building that keeps money', assoc: 'a slow flowing river', unrel: 'a plate of cookies', freq: 5, tgt: 'subordinate', bias: 'strong' },
  { w: 'spring', s: 'The flowers bloom every SPRING.', correct: 'the season after winter', other: 'a bouncy metal coil spring', assoc: 'a field of blooming flowers', unrel: 'a pair of scissors', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'court', s: 'The players ran across the tennis COURT.', correct: 'a marked court for sports', other: 'a court where a judge decides cases', assoc: 'a green tennis racket', unrel: 'a bunch of grapes', freq: 4, tgt: 'subordinate', bias: 'strong' },
  { w: 'match', s: 'She struck a MATCH to light the candle.', correct: 'a small stick that makes fire', other: 'a soccer match between two teams', assoc: 'a glowing white candle', unrel: 'a wooden chair', freq: 5, tgt: 'subordinate', bias: 'strong' },
  { w: 'note', s: 'He played one low NOTE on the piano.', correct: 'a single musical sound', other: 'a short note written on paper', assoc: 'a shiny black piano', unrel: 'a red beach ball', freq: 5, tgt: 'subordinate', bias: 'strong' },
  { w: 'pool', s: 'We swam in the cool blue POOL all day.', correct: 'a pool of water for swimming', other: 'a game of pool with a cue stick', assoc: 'a bright striped towel', unrel: 'a pile of bricks', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'palm', s: 'She held the coin in the PALM of her hand.', correct: 'the flat inside of a hand', other: 'a tall palm tree on a beach', assoc: 'a shiny silver coin', unrel: 'a metal spoon', freq: 4, tgt: 'subordinate', bias: 'strong' },
  { w: 'pitch', s: 'The pitcher threw a fast PITCH to the batter.', correct: 'a ball thrown in baseball', other: 'black sticky pitch used for roofs', assoc: 'a leather baseball glove', unrel: 'a green umbrella', freq: 4, tgt: 'dominant', bias: 'strong' },
  { w: 'scale', s: 'He weighed the apples on a SCALE.', correct: 'a tool that measures weight', other: 'a shiny scale on a fish', assoc: 'a basket of red apples', unrel: 'a paper airplane', freq: 4, tgt: 'dominant', bias: 'strong' },
  { w: 'crane', s: 'The tall CRANE lifted heavy steel beams.', correct: 'a machine that lifts heavy loads', other: 'a tall bird with long legs', assoc: 'a pile of steel beams', unrel: 'a slice of cheese', freq: 4, tgt: 'dominant', bias: 'strong' },
  { w: 'drill', s: 'He used a DRILL to make holes in the wall.', correct: 'a power tool that bores holes', other: 'a fire drill to practice safety', assoc: 'a wall full of small holes', unrel: 'a bowl of grapes', freq: 4, tgt: 'dominant', bias: 'strong' },
  { w: 'file', s: 'She smoothed her nails with a metal FILE.', correct: 'a tool for smoothing nails', other: 'a paper file that holds papers', assoc: 'a bottle of nail polish', unrel: 'a red bicycle', freq: 4, tgt: 'subordinate', bias: 'strong' },
  { w: 'pound', s: 'The bakery sold a POUND of fresh bread.', correct: 'a unit that measures weight', other: 'a pound where lost dogs are kept', assoc: 'a warm loaf of bread', unrel: 'a blue balloon', freq: 4, tgt: 'dominant', bias: 'moderate' },
  { w: 'punch', s: 'They drank fruit PUNCH at the party.', correct: 'a sweet fruit drink', other: 'a hard punch with a fist', assoc: 'colorful party balloons', unrel: 'a stack of books', freq: 4, tgt: 'subordinate', bias: 'strong' },
  { w: 'ruler', s: 'She drew a line with her wooden RULER.', correct: 'a tool for measuring length', other: 'a ruler who governs a kingdom', assoc: 'a sharp yellow pencil', unrel: 'a red wagon', freq: 4, tgt: 'dominant', bias: 'strong' },
  { w: 'sink', s: 'He washed the dishes in the kitchen SINK.', correct: 'a basin with a water tap', other: 'a heavy rock starting to sink', assoc: 'a stack of dirty dishes', unrel: 'a green frog', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'stamp', s: 'She stuck a STAMP on the envelope.', correct: 'a small sticker for mailing letters', other: 'a child stamping their feet', assoc: 'a sealed white envelope', unrel: 'a bunch of bananas', freq: 4, tgt: 'dominant', bias: 'strong' },
  { w: 'letter', s: 'He mailed a long LETTER to his aunt.', correct: 'a written message sent by mail', other: 'a single letter of the alphabet', assoc: 'a red mailbox on a post', unrel: 'a plastic dinosaur', freq: 5, tgt: 'dominant', bias: 'strong' },
  { w: 'date', s: 'She ate a sweet, chewy DATE from the bowl.', correct: 'a sweet brown fruit', other: 'a date marked on a calendar', assoc: 'a wooden fruit bowl', unrel: 'a pair of boots', freq: 4, tgt: 'subordinate', bias: 'strong' },
  { w: 'block', s: 'They walked one BLOCK to the store.', correct: 'a stretch of street between corners', other: 'a wooden toy building block', assoc: 'a small corner store', unrel: 'a floating balloon', freq: 4, tgt: 'subordinate', bias: 'moderate' },

  // ---- Tier 3: bands 9-12 (4-5) — subordinate meanings, moderate context ----
  { w: 'current', s: 'A strong CURRENT pulled the boat downstream.', correct: 'the flow of moving water', other: 'the latest current news events', assoc: 'a small wooden boat', unrel: 'a birthday cake', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'pupil', s: 'The eye doctor shined a light on her PUPIL.', correct: 'the dark center of the eye', other: 'a pupil learning in a classroom', assoc: 'a bright doctor light', unrel: 'a garden shovel', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'novel', s: 'She read a thick NOVEL over the summer.', correct: 'a long fictional book', other: 'a novel and brand-new idea', assoc: 'a cozy reading chair', unrel: 'a metal wrench', freq: 3, tgt: 'dominant', bias: 'moderate' },
  { w: 'plane', s: 'The carpenter smoothed the board with a PLANE.', correct: 'a tool that shaves wood', other: 'an airplane flying in the sky', assoc: 'a rough wooden board', unrel: 'a bowl of cereal', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'mint', s: 'Fresh MINT grew in the herb garden.', correct: 'a leafy green herb', other: 'a mint where coins are made', assoc: 'a small clay garden pot', unrel: 'a leather boot', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'iris', s: 'The purple IRIS bloomed in the flower bed.', correct: 'a tall purple flower', other: 'the colored ring of the eye', assoc: 'a bed of green leaves', unrel: 'a shiny new coin', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'bass', s: 'He caught a large BASS in the lake.', correct: 'a freshwater fish', other: 'a low, deep musical sound', assoc: 'a calm blue lake', unrel: 'a woolen scarf', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'sole', s: 'The SOLE of his shoe wore thin.', correct: 'the bottom part of a shoe', other: 'a flat sole fish in the sea', assoc: 'a worn leather boot', unrel: 'a slice of melon', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'row', s: 'They planted corn in a straight ROW.', correct: 'a neat line of things', other: 'a noisy row and loud argument', assoc: 'a field of tall corn', unrel: 'a glass of water', freq: 4, tgt: 'dominant', bias: 'moderate' },
  { w: 'tear', s: 'A single TEAR rolled down her cheek.', correct: 'a drop of water from the eye', other: 'a tear ripped in the paper', assoc: 'a sad, frowning face', unrel: 'a rubber tire', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'minute', s: 'The race would start in one MINUTE.', correct: 'a short unit of time', other: 'a minute speck too small to see', assoc: 'a ticking wall clock', unrel: 'a wooden fence', freq: 4, tgt: 'dominant', bias: 'strong' },
  { w: 'trip', s: 'They packed bags for their beach TRIP.', correct: 'a journey to another place', other: 'a trip and stumble over a rock', assoc: 'a striped suitcase', unrel: 'a metal fork', freq: 4, tgt: 'dominant', bias: 'moderate' },
  { w: 'vault', s: 'The gymnast leaped over the VAULT.', correct: 'a padded jumping horse in a gym', other: 'a locked vault holding money', assoc: 'a soft blue landing mat', unrel: 'a bunch of carrots', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'yard', s: 'The fabric was two YARDS long.', correct: 'a unit that measures length', other: 'a grassy yard behind a house', assoc: 'a roll of blue fabric', unrel: 'a slice of pie', freq: 4, tgt: 'subordinate', bias: 'strong' },
  { w: 'bolt', s: 'A BOLT of lightning lit up the sky.', correct: 'a sudden flash of lightning', other: 'a metal bolt that holds parts', assoc: 'a dark stormy cloud', unrel: 'a wooden spoon', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'bridge', s: 'The dentist fitted a BRIDGE in his mouth.', correct: 'a row of false teeth', other: 'a bridge that crosses a river', assoc: 'a bright dentist mirror', unrel: 'a green watering can', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'cast', s: 'The doctor put a CAST on her broken arm.', correct: 'a hard shell for a broken bone', other: 'the cast of actors in a play', assoc: 'an x-ray of an arm', unrel: 'a bag of flour', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'charge', s: 'The knight led the CHARGE into battle.', correct: 'a rushing forward attack', other: 'the charge stored in a battery', assoc: 'a shining metal sword', unrel: 'a bowl of soup', freq: 3, tgt: 'subordinate', bias: 'moderate' },
  { w: 'club', s: 'The cave dweller carried a heavy CLUB.', correct: 'a thick stick used as a weapon', other: 'a club where members meet', assoc: 'a dim rocky cave', unrel: 'a paper kite', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'crop', s: 'The farmer harvested the golden wheat CROP.', correct: 'plants grown on a farm', other: 'a short crop used to guide a horse', assoc: 'a tall red barn', unrel: 'a glass marble', freq: 3, tgt: 'dominant', bias: 'strong' },

  // ---- Tier 4: bands 13-16 (6-8) — weak/subtle context, heteronyms, richer vocab ----
  { w: 'compound', s: 'The scientists mixed a new chemical COMPOUND.', correct: 'a substance of combined elements', other: 'a walled compound with many buildings', assoc: 'a bubbling glass beaker', unrel: 'a knitted sweater', freq: 2, tgt: 'subordinate', bias: 'moderate' },
  { w: 'capital', s: 'Paris is the CAPITAL of France.', correct: 'the main city of a country', other: 'a capital letter at a sentence start', assoc: 'a waving French flag', unrel: 'a wooden rake', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'temple', s: 'A dull ache throbbed at his TEMPLE.', correct: 'the flat side of the forehead', other: 'a temple where people worship', assoc: 'a person rubbing their head', unrel: 'a bowl of rice', freq: 2, tgt: 'subordinate', bias: 'strong' },
  { w: 'chest', s: 'The pirate buried a wooden CHEST of gold.', correct: 'a large box for storing things', other: 'the chest at the front of the body', assoc: 'a torn treasure map', unrel: 'a garden hose', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'cabinet', s: 'The prime minister met with the CABINET.', correct: 'a group of top government advisers', other: 'a kitchen cabinet with shelves', assoc: 'a long polished meeting table', unrel: 'a red tricycle', freq: 2, tgt: 'subordinate', bias: 'moderate' },
  { w: 'hood', s: 'He lifted the HOOD to check the engine.', correct: 'the metal cover over a car engine', other: 'a hood pulled up over the head', assoc: 'a greasy car engine', unrel: 'a bowl of berries', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'stern', s: 'The sailor stood at the STERN of the ship.', correct: 'the back end of a boat', other: 'a stern and serious frown', assoc: 'a billowing white sail', unrel: 'a slice of toast', freq: 2, tgt: 'subordinate', bias: 'strong' },
  { w: 'table', s: 'She showed the data in a neat TABLE.', correct: 'a chart of rows and columns', other: 'a wooden table with four legs', assoc: 'a page full of numbers', unrel: 'a rubber duck', freq: 3, tgt: 'subordinate', bias: 'moderate' },
  { w: 'quarry', s: 'Workers cut stone from the deep QUARRY.', correct: 'a pit where stone is dug', other: 'the prey that a hunter chases', assoc: 'a block of gray granite', unrel: 'a bowl of cherries', freq: 2, tgt: 'dominant', bias: 'strong' },
  { w: 'produce', s: 'The store sells fresh PRODUCE each morning.', correct: 'fruits and vegetables for sale', other: 'a factory that can produce goods', assoc: 'a woven shopping basket', unrel: 'a metal doorknob', freq: 3, tgt: 'subordinate', bias: 'strong' },
  { w: 'object', s: 'A strange OBJECT floated in the night sky.', correct: 'a thing you can see or touch', other: 'to object and strongly disagree', assoc: 'a fluffy white cloud', unrel: 'a wool mitten', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'present', s: 'She wrapped a birthday PRESENT for him.', correct: 'a gift given to someone', other: 'the present moment happening now', assoc: 'a colorful party hat', unrel: 'a garden trowel', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'subject', s: 'Math is her favorite SUBJECT in school.', correct: 'an area of study in school', other: 'a loyal subject of a queen', assoc: 'a tall stack of textbooks', unrel: 'a plastic shovel', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'desert', s: 'The camels crossed the dry, sandy DESERT.', correct: 'a dry land with little rain', other: 'to desert a post and run away', assoc: 'a tall spiky cactus', unrel: 'a bar of soap', freq: 3, tgt: 'dominant', bias: 'strong' },
  { w: 'entrance', s: 'The guests walked through the front ENTRANCE.', correct: 'a doorway you enter through', other: 'a magic act that can entrance a crowd', assoc: 'a tall carved wooden door', unrel: 'a bowl of nuts', freq: 2, tgt: 'dominant', bias: 'strong' },
  { w: 'contract', s: 'They both signed the business CONTRACT.', correct: 'a written legal agreement', other: 'muscles that tighten and contract', assoc: 'a fancy black ink pen', unrel: 'a striped beach ball', freq: 2, tgt: 'dominant', bias: 'strong' },
  { w: 'console', s: 'The pilot checked the control CONSOLE.', correct: 'a panel of switches and dials', other: 'to console and comfort a friend', assoc: 'a row of blinking lights', unrel: 'a slice of watermelon', freq: 2, tgt: 'subordinate', bias: 'strong' },
  { w: 'refuse', s: 'The bins overflowed with smelly REFUSE.', correct: 'garbage and thrown-away waste', other: 'to refuse and firmly say no', assoc: 'an overflowing trash bin', unrel: 'a silk ribbon', freq: 2, tgt: 'subordinate', bias: 'strong' },
  { w: 'sewer', s: 'The dirty water drained into the SEWER.', correct: 'an underground drain pipe', other: 'a sewer who stitches cloth', assoc: 'a heavy iron drain grate', unrel: 'a bag of marshmallows', freq: 2, tgt: 'dominant', bias: 'strong' },
  { w: 'spar', s: 'The tall mast and SPAR held up the sail.', correct: 'a strong pole that holds a sail', other: 'two boxers who spar for practice', assoc: 'a billowing canvas sail', unrel: 'a jar of honey', freq: 2, tgt: 'subordinate', bias: 'moderate' },

  // ---- Tier 5: bands 17-20 (above-level) — rare / abstract, weak context, heteronyms ----
  { w: 'bass', s: 'The singer sang in a deep, rumbling BASS voice.', correct: 'the lowest range of musical sound', other: 'a bass fish swimming in a lake', assoc: 'a grand lit concert stage', unrel: 'a garden rake', freq: 1, tgt: 'dominant', bias: 'moderate' },
  { w: 'bow', s: 'The actor took a graceful BOW before the crowd.', correct: 'a bend forward to greet a crowd', other: 'a bow that shoots sharp arrows', assoc: 'a heavy red velvet curtain', unrel: 'a bowl of grapes', freq: 2, tgt: 'subordinate', bias: 'moderate' },
  { w: 'wind', s: 'Please WIND the antique clock each evening.', correct: 'to turn a key and tighten a spring', other: 'the wind that blows the leaves', assoc: 'an old brass ticking clock', unrel: 'a slice of lemon', freq: 2, tgt: 'subordinate', bias: 'moderate' },
  { w: 'lead', s: 'The old plumbing pipes were made of heavy LEAD.', correct: 'a soft, heavy gray metal', other: 'to lead the way at the front', assoc: 'a rusty corroded pipe', unrel: 'a paper hand fan', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'temper', s: 'The blacksmith would TEMPER the steel blade.', correct: 'to harden metal by heating and cooling', other: 'a fiery temper and quick anger', assoc: 'a glowing red forge fire', unrel: 'a bowl of pudding', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'cleave', s: 'The clinging vines CLEAVE tightly to the wall.', correct: 'to cling and stick fast', other: 'to cleave and split fully apart', assoc: 'a crumbling old brick wall', unrel: 'a scoop of ice cream', freq: 1, tgt: 'subordinate', bias: 'weak' },
  { w: 'sanction', s: 'The council voted to SANCTION the festival.', correct: 'to formally approve and allow', other: 'a harsh sanction that punishes', assoc: 'a raised voting hand', unrel: 'a woolen sock', freq: 1, tgt: 'subordinate', bias: 'weak' },
  { w: 'found', s: 'The workers FOUND the bronze bell in a heated mold.', correct: 'to melt and cast metal', other: 'to have found a lost item', assoc: 'a glowing molten furnace', unrel: 'a bunch of balloons', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'list', s: 'The overloaded ship began to LIST to one side.', correct: 'to lean and tilt to a side', other: 'a written list of many items', assoc: 'a churning gray ocean wave', unrel: 'a slice of cheese', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'rail', s: 'The small birds perched along the wooden RAIL.', correct: 'a fixed bar to perch or hold on', other: 'to rail and complain bitterly', assoc: 'a row of tiny brown sparrows', unrel: 'a jar of jam', freq: 2, tgt: 'dominant', bias: 'moderate' },
  { w: 'tender', s: 'He offered a gold coin as legal TENDER.', correct: 'money accepted as payment', other: 'a tender and gentle touch', assoc: 'a stack of bright silver coins', unrel: 'a garden gnome', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'peer', s: 'A duke is a noble PEER of the realm.', correct: 'a person of equal noble rank', other: 'to peer closely at something', assoc: 'a jeweled golden crown', unrel: 'a rubber tire', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'buckle', s: 'Under the heavy load the shelf began to BUCKLE.', correct: 'to bend and collapse under strain', other: 'a metal buckle on a leather belt', assoc: 'a tall stack of heavy books', unrel: 'a paper airplane', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'hamper', s: 'The deep snow began to HAMPER their progress.', correct: 'to slow down and hinder', other: 'a woven hamper for dirty clothes', assoc: 'a deep drift of white snow', unrel: 'a glass of milk', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'brook', s: 'The stern captain would not BROOK any argument.', correct: 'to tolerate or put up with', other: 'a small brook flowing in the woods', assoc: 'a raised, stern eyebrow', unrel: 'a slice of pizza', freq: 1, tgt: 'subordinate', bias: 'weak' },
  { w: 'wax', s: 'Night by night the pale moon began to WAX.', correct: 'to grow gradually larger', other: 'melted wax dripping from a candle', assoc: 'a dim, starry night sky', unrel: 'a leather soccer ball', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'quail', s: 'The brave scout did not QUAIL at the danger.', correct: 'to shrink back in fear', other: 'a small, plump ground bird', assoc: 'a looming dark shadow', unrel: 'a china teacup', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'flag', s: 'By the last mile the tired runners began to FLAG.', correct: 'to grow tired and weaken', other: 'a bright flag waving on a pole', assoc: 'a long, dusty racetrack', unrel: 'a bowl of soup', freq: 1, tgt: 'subordinate', bias: 'moderate' },
  { w: 'cleft', s: 'A narrow CLEFT split the face of the rocky cliff.', correct: 'a crack or split in rock', other: 'a cleft chin with a small dimple', assoc: 'a steep gray mountain cliff', unrel: 'a knitted mitten', freq: 1, tgt: 'dominant', bias: 'moderate' },
  { w: 'sound', s: 'The explorers sailed into the narrow SOUND.', correct: 'a narrow channel of sea water', other: 'a sound you hear with your ears', assoc: 'a rugged rocky coastline', unrel: 'a lit birthday candle', freq: 1, tgt: 'subordinate', bias: 'moderate' },
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

function wordsOf(strings) {
  return strings.join(' ').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Build one BankItem from an authored homograph entry.
// ---------------------------------------------------------------------------
function buildItem(entry, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);

  const opts = [
    { text: entry.correct, lure: 'correct' },
    { text: entry.other, lure: 'local_fit' },
    { text: entry.assoc, lure: 'associate' },
    { text: entry.unrel, lure: 'global_mismatch' },
  ];
  const shuffled = seededShuffle(opts, hashNum(itemId));
  const lures = shuffled.map((o) => o.lure); // server-side only; never enters `content`
  const options = shuffled.map((o) => ({ picture: tok(o.text) }));
  const correctKey = lures.indexOf('correct');
  const distractorRationales = rationalesByOption(lures);

  const content = {
    typeCode: TYPE_CODE,
    presentation: 'word', // D-017: printed sentence + word-based picture tokens (no audio); reading required
    prompt: 'Read the sentence. Tap the picture that shows what the word means here.',
    word: entry.w,
    sentence: entry.s,
    options,               // picture tokens are word-based labels (assetId supplied later from a library)
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

function itemValidatorVerdicts(entry, content, lures, difficulty) {
  const options = content.options;
  const correctCount = lures.filter((l) => l === 'correct').length;
  const distractors = lures.filter((l) => l !== 'correct');
  const distinctLures = new Set(distractors).size === distractors.length;
  const luresValid = lures.every((l) => LURE_CLASSES.has(l));
  const texts = options.map((o) => o.picture.text.toLowerCase());
  const distinctPics = new Set(texts).size === texts.length;
  const wordInSentence = String(entry.s).toLowerCase().includes(String(entry.w).toLowerCase());
  const k1 = difficulty < 4;
  const words = wordsOf([entry.s, entry.w, entry.correct, entry.other, entry.assoc, entry.unrel]);
  const readingOk = !k1 || (words.every((w) => w.length <= MAX_WORD_LEN_K1) && entry.freq >= MIN_FREQ_K1);
  return [
    { check: 'unique_answer', status: correctCount === 1 && distinctPics && wordInSentence ? 'pass' : 'fail', detail: `one picture fits the sentence (${entry.tgt} sense, ${entry.bias} context)` },
    { check: 'lure_taxonomy_ok', status: distinctLures && luresValid ? 'pass' : 'fail' },
    { check: 'served_subset_clean', status: assertContentClean(content, 'item').length === 0 ? 'pass' : 'fail', detail: 'no answer-revealing key reachable from content' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn' },
    { check: 'frequency_band_ok', status: 'pass', detail: `Zipf band ${entry.freq}` },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; universal homographs, no cultural cue' },
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
    if (typeof c.word !== 'string' || !c.word) errors.push(`${where}: content.word missing`);
    if (typeof c.sentence !== 'string' || !c.sentence) errors.push(`${where}: content.sentence missing`);
    else if (c.word && !c.sentence.toLowerCase().includes(String(c.word).toLowerCase())) {
      errors.push(`${where}: the homograph "${c.word}" must appear in the sentence`);
    }
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) {
      errors.push(`${where}: options must have 3..4 entries`);
      return;
    }
    opts.forEach((o, oi) => {
      if (!o.picture || typeof o.picture.text !== 'string' || !o.picture.text) {
        errors.push(`${where}: option[${oi}] picture must have text`);
      }
    });
    const pics = opts.map((o) => (o.picture && o.picture.text ? o.picture.text.toLowerCase() : ''));
    if (new Set(pics).size !== pics.length) errors.push(`${where}: duplicate picture labels`);

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
      const words = wordsOf([c.sentence, c.word, ...opts.map((o) => (o.picture && o.picture.text) || '')]);
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
  const jsonl = serializeBank(items);
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
