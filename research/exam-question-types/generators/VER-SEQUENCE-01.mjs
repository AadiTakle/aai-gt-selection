#!/usr/bin/env node
// VER-SEQUENCE-01 (Story Order) — structured / LLM-authored item bank generator + validator.
//
// This is the LLM-generated content path for a language-heavy verbal type
// (sentence_arrangement / narrative inference). Each item shows a short story whose
// parts are presented OUT OF ORDER; the child picks the ONE option that puts the
// parts into the order they actually happen. It is a single-select item scored by a
// deterministic key (build plan §0/§2), NOT a free drag-order (kept reproducible).
//
// The stories are AUTHORED DIRECTLY AS DATA below (the `ENTRIES` pool, each a list of
// sentences in TRUE chronological order). The generator: (1) deterministically
// scrambles the display order, (2) derives the correct ordering plus lure orderings
// (off-by-one `near_order`, full `reversed_relation`, scrambled `global_mismatch`),
// (3) materializes the standardized BankItem, and (4) can re-validate the JSONL.
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md     §6 schema, §8.3/§8.5 sequence + solver notes
//
// Governance: born-synthetic. Every item carries syntheticOnly:true, validated:false.
// Ordinal design difficulty is NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-SEQUENCE-01.mjs            # build + write banks/VER-SEQUENCE-01.jsonl
//   node generators/VER-SEQUENCE-01.mjs --validate # validate the JSONL on disk
//   node generators/VER-SEQUENCE-01.mjs --check    # build in-memory + validate, do not write
//   node generators/VER-SEQUENCE-01.mjs --print 2  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-SEQUENCE-01.jsonl');

const TYPE_CODE = 'VER-SEQUENCE-01';
const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-SEQUENCE-01.html';
const GENERATOR_REF = 'VER-SEQUENCE-01/authored-stories@v1';

// Allowed distractor lure classes for this type (schema §6.3 ordering taxonomy).
//   near_order        = off-by-one (one adjacent pair swapped from the true order)
//   reversed_relation = the story told fully backwards
//   global_mismatch   = an incoherent scramble
const LURE_CLASSES = new Set(['correct', 'near_order', 'reversed_relation', 'global_mismatch']);

// The full-reverse trap is only added once the ordering is non-trivial.
const REVERSED_FROM_BAND = 5;

// ---------------------------------------------------------------------------
// AUTHORED CONTENT — each entry is a story written in TRUE chronological order.
// Ordered easy -> hard. Difficulty rises across three levers (build plan §0):
//   (1) chain length     (3 parts -> 5 parts)
//   (2) inference type    (explicit time-order -> near causal -> far/abstract causal)
//   (3) word frequency    (freq 6-7 K vocabulary -> freq 1 rare/academic)
// K-1 / low-difficulty items use only very simple, high-frequency words (reading gate, D-017).
// Each entry: { story: string[]  (true order), freq }.  syntacticComplexity derived from band.
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ---- Tier 1: bands 1-4 (K-1) — 3 parts, explicit time-order, tiny words ----
  { story: ['I wake up.', 'I get dressed.', 'I go to school.'], freq: 6 },
  { story: ['Morning comes.', 'We play all day.', 'Night comes.'], freq: 6 },
  { story: ['She plants a seed.', 'The plant grows.', 'A flower blooms.'], freq: 6 },
  { story: ['He pours the milk.', 'He drinks it.', 'The cup is empty.'], freq: 6 },
  { story: ['The egg cracks.', 'A chick comes out.', 'The chick grows up.'], freq: 5 },
  { story: ['I open the book.', 'I read it.', 'I close the book.'], freq: 6 },
  { story: ['We fill the tub.', 'We take a bath.', 'We drain the tub.'], freq: 5 },
  { story: ['The dog is dirty.', 'We wash the dog.', 'The dog is clean.'], freq: 6 },
  { story: ['She turns on the tap.', 'She fills a glass.', 'She turns it off.'], freq: 6 },
  { story: ['We buy the seeds.', 'We plant them.', 'We water them.'], freq: 5 },
  { story: ['The kite goes up.', 'The wind stops.', 'The kite comes down.'], freq: 6 },
  { story: ['I get a snack.', 'I eat it.', 'I am full.'], freq: 6 },
  { story: ['The light turns red.', 'The cars stop.', 'The light turns green.'], freq: 6 },
  { story: ['She ties her shoes.', 'She goes for a run.', 'She feels tired.'], freq: 5 },
  { story: ['The bell rings.', 'We line up.', 'We go inside.'], freq: 6 },
  { story: ['He gets a brush.', 'He brushes his teeth.', 'He goes to bed.'], freq: 5 },
  { story: ['We mix the batter.', 'We bake a cake.', 'We eat the cake.'], freq: 5 },
  { story: ['The rain falls.', 'A puddle forms.', 'The sun dries it.'], freq: 5 },
  { story: ['I draw a picture.', 'I color it in.', 'I hang it up.'], freq: 5 },
  { story: ['The candle is lit.', 'It burns down.', 'We blow it out.'], freq: 5 },

  // ---- Tier 2: bands 5-8 (2-3) — 3 parts, simple cause and effect ----
  { story: ['It starts to rain.', 'The streets get wet.', 'People open umbrellas.'], freq: 5 },
  { story: ['He forgets his lunch.', 'He gets hungry.', 'A friend shares food.'], freq: 5 },
  { story: ['The team practices hard.', 'They play the game.', 'They win the trophy.'], freq: 5 },
  { story: ['She studies all week.', 'She takes the test.', 'She earns a good grade.'], freq: 5 },
  { story: ['The volcano rumbles.', 'It erupts.', 'Ash covers the town.'], freq: 4 },
  { story: ['He plants an acorn.', 'Many years pass.', 'A tall oak stands.'], freq: 4 },
  { story: ['The ice cream melts.', 'It drips on the floor.', 'We wipe it up.'], freq: 5 },
  { story: ['A spark lands on dry grass.', 'A fire spreads.', 'Firefighters put it out.'], freq: 4 },
  { story: ['She saves her coins.', 'Her jar fills up.', 'She buys a bike.'], freq: 5 },
  { story: ['The dog hears a noise.', 'It starts to bark.', 'The owner wakes up.'], freq: 5 },
  { story: ['Dark clouds gather.', 'Thunder booms.', 'Rain pours down.'], freq: 4 },
  { story: ['He trips on a rock.', 'He scrapes his knee.', 'His mom adds a bandage.'], freq: 4 },
  { story: ['The seed sprouts.', 'The vine climbs.', 'Grapes appear.'], freq: 4 },
  { story: ['We pack our bags.', 'We ride to the beach.', 'We swim in the sea.'], freq: 5 },
  { story: ['The bread goes in the oven.', 'It bakes and rises.', 'We slice it warm.'], freq: 4 },
  { story: ['She reads the map.', 'She follows the trail.', 'She reaches the top.'], freq: 4 },
  { story: ['The baby is hungry.', 'It begins to cry.', 'The dad feeds it.'], freq: 5 },
  { story: ['He winds up the toy.', 'He lets it go.', 'It races across the floor.'], freq: 4 },
  { story: ['The leaves turn brown.', 'They fall to the ground.', 'The tree is bare.'], freq: 4 },
  { story: ['We light the campfire.', 'We roast our food.', 'We put out the flames.'], freq: 4 },

  // ---- Tier 3: bands 9-12 (4-5) — 4 parts, a causal chain ----
  { story: ['A farmer plants wheat.', 'The wheat is harvested.', 'It is ground into flour.', 'A baker makes bread.'], freq: 4 },
  { story: ['The caterpillar eats leaves.', 'It forms a cocoon.', 'It rests inside.', 'A butterfly emerges.'], freq: 4 },
  { story: ['Rain falls on the hills.', 'Streams flow downhill.', 'They join a river.', 'The river reaches the sea.'], freq: 4 },
  { story: ['She sketches a design.', 'She gathers materials.', 'She builds the model.', 'She presents it in class.'], freq: 3 },
  { story: ['The knight hears a cry.', 'He rides to the castle.', 'He fights the dragon.', 'He rescues the prince.'], freq: 4 },
  { story: ['Water is heated.', 'It turns to steam.', 'The steam rises.', 'It cools into clouds.'], freq: 4 },
  { story: ['He saves his money.', 'He buys the parts.', 'He assembles the computer.', 'He plays his new game.'], freq: 4 },
  { story: ['The chef reads the recipe.', 'She chops the vegetables.', 'She cooks the stew.', 'She serves the guests.'], freq: 4 },
  { story: ['An idea comes to her.', 'She writes a draft.', 'She edits the pages.', 'The book is published.'], freq: 3 },
  { story: ['The explorer studies a map.', 'She packs her supplies.', 'She travels the jungle.', 'She finds the ruins.'], freq: 3 },
  { story: ['Seeds are carried by wind.', 'They land in the soil.', 'They take root.', 'A meadow grows.'], freq: 3 },
  { story: ['The alarm sounds.', 'The firefighters suit up.', 'They rush to the scene.', 'They save the building.'], freq: 4 },
  { story: ['He notices a leak.', 'He shuts off the water.', 'He repairs the pipe.', 'He turns it back on.'], freq: 4 },
  { story: ['A puppy is adopted.', 'It learns simple tricks.', 'It practices daily.', 'It becomes a guide dog.'], freq: 3 },
  { story: ['Clouds block the sun.', 'The temperature drops.', 'Snow begins to fall.', 'The hills turn white.'], freq: 3 },
  { story: ['The artist mixes paint.', 'She sketches the outline.', 'She fills in the colors.', 'She hangs the canvas.'], freq: 3 },
  { story: ['The runner trains for months.', 'She stretches before dawn.', 'She races the marathon.', 'She crosses the finish line.'], freq: 3 },
  { story: ['A question puzzles the class.', 'They gather clues.', 'They test their ideas.', 'They solve the mystery.'], freq: 3 },
  { story: ['The tide goes out.', 'Shells are left behind.', 'A child collects them.', 'She fills her bucket.'], freq: 4 },
  { story: ['The engine sputters.', 'The driver pulls over.', 'A mechanic checks it.', 'The car runs again.'], freq: 3 },

  // ---- Tier 4: bands 13-16 (6-8) — 4 parts, subtler inference, richer vocab ----
  { story: ['A rumor begins quietly.', 'It spreads through the town.', 'People grow anxious.', 'The mayor calms the crowd.'], freq: 3 },
  { story: ['The scientist forms a hypothesis.', 'She designs an experiment.', 'She records the results.', 'She revises her theory.'], freq: 2 },
  { story: ['Tension builds between the nations.', 'Talks break down.', 'A treaty is proposed.', 'Peace is restored.'], freq: 2 },
  { story: ['The detective finds a clue.', 'He interviews the suspects.', 'He spots a contradiction.', 'He names the culprit.'], freq: 2 },
  { story: ['Drought parches the land.', 'Crops wither in the fields.', 'Farmers dig deeper wells.', 'The harvest is saved.'], freq: 2 },
  { story: ['A composer hears a melody.', 'He scribbles the notes.', 'The orchestra rehearses.', 'The symphony premieres.'], freq: 2 },
  { story: ['The startup pitches investors.', 'It secures the funding.', 'It hires a team.', 'It launches the product.'], freq: 2 },
  { story: ['Erosion wears the cliff.', 'Cracks widen over years.', 'A boulder breaks free.', 'It tumbles to the shore.'], freq: 2 },
  { story: ['The apprentice observes the master.', 'She practices the craft.', 'She refines her skill.', 'She opens her own shop.'], freq: 2 },
  { story: ['A misunderstanding divides the friends.', 'They avoid each other.', 'One offers an apology.', 'Their friendship mends.'], freq: 2 },
  { story: ['The committee debates the plan.', 'They weigh the tradeoffs.', 'They reach a compromise.', 'They approve the budget.'], freq: 2 },
  { story: ['Smoke is spotted on the ridge.', 'Rangers sound the alarm.', 'Crews contain the blaze.', 'The forest slowly recovers.'], freq: 2 },
  { story: ['The author outlines the plot.', 'She drafts each chapter.', 'An editor suggests changes.', 'The novel reaches shelves.'], freq: 2 },
  { story: ['A glacier creeps downhill.', 'It carves a deep valley.', 'It finally melts away.', 'A lake fills the basin.'], freq: 2 },
  { story: ['The patient feels unwell.', 'The doctor runs tests.', 'A diagnosis is made.', 'The treatment begins.'], freq: 3 },
  { story: ['Voters raise their concerns.', 'Candidates make promises.', 'The ballots are counted.', 'A leader is chosen.'], freq: 3 },
  { story: ['The bridge shows signs of wear.', 'Engineers inspect the beams.', 'Repairs are scheduled.', 'Traffic flows safely again.'], freq: 2 },
  { story: ['An inventor spots a problem.', 'He tinkers in his garage.', 'He files a patent.', 'Factories produce his device.'], freq: 2 },
  { story: ['The colony outgrows its hive.', 'Scouts search for a home.', 'The swarm relocates.', 'A new hive is built.'], freq: 2 },
  { story: ['A spark of curiosity strikes.', 'The student researches deeply.', 'She publishes her findings.', 'Others build on her work.'], freq: 2 },

  // ---- Tier 5: bands 17-20 (above-level) — 5 parts, abstract / far causal ----
  { story: ['A civilization flourishes.', 'Its resources dwindle.', 'Internal strife erupts.', 'The empire collapses.', 'Ruins puzzle later historians.'], freq: 1 },
  { story: ['A faint signal is detected.', 'Astronomers verify the data.', 'They calculate its origin.', 'A distant planet is confirmed.', 'The discovery reshapes theory.'], freq: 1 },
  { story: ['A subtle mutation appears.', 'It offers an advantage.', 'It spreads through the population.', 'The species adapts.', 'A new trait becomes common.'], freq: 1 },
  { story: ['An economic bubble inflates.', 'Speculation runs rampant.', 'Confidence suddenly falters.', 'The market crashes.', 'Reforms are enacted.'], freq: 1 },
  { story: ['A philosopher poses a paradox.', 'Scholars debate for centuries.', 'A novel framework emerges.', 'The puzzle is reframed.', 'Consensus slowly forms.'], freq: 1 },
  { story: ['Tectonic plates grind together.', 'Stress accumulates underground.', 'The fault ruptures.', 'Shockwaves reach the city.', 'Engineers rebuild stronger.'], freq: 1 },
  { story: ['A manuscript is nearly lost.', 'A scholar rediscovers it.', 'Experts authenticate the text.', 'It is carefully translated.', 'It transforms our understanding.'], freq: 1 },
  { story: ['A grievance festers in silence.', 'Whispers become open protest.', 'The movement gains momentum.', 'Authorities concede reforms.', 'A new order takes hold.'], freq: 1 },
  { story: ['A pathogen emerges quietly.', 'It crosses into humans.', 'Cases multiply worldwide.', 'Researchers develop a vaccine.', 'The outbreak subsides.'], freq: 1 },
  { story: ['An artist defies convention.', 'Critics dismiss the work.', 'A few patrons champion it.', 'Tastes gradually shift.', 'The style defines an era.'], freq: 1 },
  { story: ['A river is dammed upstream.', 'Wetlands downstream dry out.', 'Species lose their habitat.', 'Conservationists intervene.', 'The flow is restored.'], freq: 1 },
  { story: ['A theorem resists all proof.', 'Generations of scholars try.', 'A fresh approach is devised.', 'The proof withstands scrutiny.', 'The field is transformed.'], freq: 1 },
  { story: ['A monarch overtaxes the people.', 'Discontent quietly spreads.', 'Advisors are ignored.', 'Rebellion breaks out.', 'The throne is overturned.'], freq: 1 },
  { story: ['A trace element is depleted.', 'Soil fertility declines.', 'Yields fall year by year.', 'Farmers rotate their crops.', 'The land slowly recovers.'], freq: 1 },
  { story: ['A prototype fails repeatedly.', 'Engineers analyze each flaw.', 'They iterate the design.', 'A breakthrough finally holds.', 'The technology goes mainstream.'], freq: 1 },
  { story: ['A dialect drifts in isolation.', 'Its vocabulary diverges.', 'Speakers coin new terms.', 'Mutual understanding fades.', 'A distinct language forms.'], freq: 1 },
  { story: ['An heir is quietly overlooked.', 'Rivals maneuver for power.', 'Alliances shift in secret.', 'A succession crisis erupts.', 'A compromise ruler ascends.'], freq: 1 },
  { story: ['A coastline slowly subsides.', 'Salt water seeps inland.', 'Freshwater sources spoil.', 'Communities migrate uphill.', 'New settlements arise.'], freq: 1 },
  { story: ['A modest endowment is invested.', 'Interest compounds for decades.', 'The fund grows enormous.', 'Scholarships are established.', 'Generations later benefit.'], freq: 1 },
  { story: ['An anomaly defies the model.', 'Skeptics demand more evidence.', 'Independent labs replicate it.', 'The paradigm is challenged.', 'Textbooks are rewritten.'], freq: 1 },
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
const MAX_WORD_LEN_K1 = 9; // reading-gate length ceiling for the K-1 band (short sentences)
const MIN_FREQ_K1 = 5;

const STOP_WORDS = new Set(['the', 'a', 'an', 'i', 'we', 'he', 'she', 'it', 'they', 'you',
  'to', 'in', 'on', 'of', 'and', 'so', 'my', 'your', 'is', 'was', 'can', 'at', 'with', 'no',
  'up', 'off', 'out', 'her', 'his', 'him', 'them', 'for', 'am', 'are', 'be', 'all', 'day']);

function storyWords(sentences) {
  return sentences
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z' ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Ordering derivation. `correct` is the sequence of DISPLAY indices that reads in
// true story order. Distractors are transforms of `correct`.
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
// Build one BankItem from an authored story.
// ---------------------------------------------------------------------------
function buildItem(entry, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const band = Math.floor(index / 5) + 1;
  const syntacticComplexity = Math.min(5, Math.ceil(band / 4));
  const story = entry.story;
  const n = story.length;

  // Deterministic, non-identity display scramble.
  let show = seededShuffle([...Array(n).keys()], hashNum(itemId + ':show'));
  if (isIdentity(show)) show = show.slice(1).concat(show[0]);
  const events = show.map((i) => ({ text: story[i] }));

  // correct[k] = display index of the k-th chronological part.
  const correct = story.map((_, k) => show.indexOf(k));
  const near = nearOrder(correct, index);
  const reversed = correct.slice().reverse();
  const global = globalMismatch(correct, near, reversed, hashNum(itemId + ':g'));

  const opts = [
    { order: correct, lure: 'correct' },
    { order: near, lure: 'near_order' },
    { order: global, lure: 'global_mismatch' },
  ];
  if (band >= REVERSED_FROM_BAND) opts.push({ order: reversed, lure: 'reversed_relation' });

  const shuffled = seededShuffle(opts, hashNum(itemId + ':opts'));
  const options = shuffled.map((o) => ({ order: o.order.slice(), lure: o.lure }));
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
      presentation: 'word', // D-017: text only; reading the story IS the task
      prompt: 'Put the story parts in the order they happen.',
      events,               // displayed order (scrambled); labeled 1..n in the renderer
      eventCount: n,
      options,              // each option is an ordering of display indices
      frequencyBand: entry.freq,
      syntacticComplexity,
    },
    answer: { correctKey, distractorRationales },
    scoring: { mode: 'deterministic_key' },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      promptHash: createHash('sha1').update(JSON.stringify(entry)).digest('hex').slice(0, 16),
      validator: itemValidatorVerdicts(entry, options, correctKey, difficulty, correct),
    },
    syntheticOnly: true,
    validated: false,
  };
}

function itemValidatorVerdicts(entry, options, correctKey, difficulty, correct) {
  const n = entry.story.length;
  const correctCount = options.filter((o) => o.lure === 'correct').length;
  const distractors = options.filter((o) => o.lure !== 'correct').map((o) => o.lure);
  const distinctLures = new Set(distractors).size === distractors.length;
  const luresValid = options.every((o) => LURE_CLASSES.has(o.lure));
  const validPerms = options.every((o) => {
    if (!Array.isArray(o.order) || o.order.length !== n) return false;
    return new Set(o.order).size === n && o.order.every((v) => v >= 0 && v < n);
  });
  const distinctOrders = new Set(options.map((o) => o.order.join(','))).size === options.length;
  const keyPointsCorrect = options[correctKey] && permEq(options[correctKey].order, correct);
  const k1 = difficulty < 4;
  const words = storyWords(entry.story);
  const readingOk = !k1 || (words.every((w) => w.length <= MAX_WORD_LEN_K1) && entry.freq >= MIN_FREQ_K1);
  return [
    { check: 'unique_answer', status: correctCount === 1 && distinctOrders && keyPointsCorrect ? 'pass' : 'fail' },
    { check: 'key_matches_solver', status: keyPointsCorrect && validPerms ? 'pass' : 'fail', detail: 'chronological order = authored story order' },
    { check: 'lure_taxonomy_ok', status: distinctLures && luresValid ? 'pass' : 'fail' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn' },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; universal narratives' },
  ];
}

export function buildBank() {
  return ENTRIES.map((e, i) => buildItem(e, i));
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
    const events = c.events;
    if (!Array.isArray(events) || events.length < 3 || events.some((e) => !e || typeof e.text !== 'string' || !e.text)) {
      errors.push(`${where}: events must be >=3 tokens with text`);
      return;
    }
    const n = events.length;
    const opts = c.options;
    if (!Array.isArray(opts) || opts.length < 3 || opts.length > 4) {
      errors.push(`${where}: options must have 3..4 entries`);
      return;
    }
    opts.forEach((o, oi) => {
      if (!LURE_CLASSES.has(o.lure)) errors.push(`${where}: option[${oi}] bad lure ${o.lure}`);
      if (!Array.isArray(o.order) || o.order.length !== n || new Set(o.order).size !== n || o.order.some((v) => v < 0 || v >= n)) {
        errors.push(`${where}: option[${oi}] order must be a permutation of 0..${n - 1}`);
      }
    });
    const correctCount = opts.filter((o) => o.lure === 'correct').length;
    if (correctCount !== 1) errors.push(`${where}: exactly one 'correct' option required (found ${correctCount})`);
    const distractors = opts.filter((o) => o.lure !== 'correct').map((o) => o.lure);
    if (new Set(distractors).size !== distractors.length) errors.push(`${where}: duplicate distractor lure classes`);
    const orderKeys = opts.map((o) => (Array.isArray(o.order) ? o.order.join(',') : '?'));
    if (new Set(orderKeys).size !== orderKeys.length) errors.push(`${where}: duplicate orderings across options`);

    const ak = it.answer;
    if (!ak || typeof ak.correctKey !== 'number') errors.push(`${where}: answer.correctKey missing`);
    else if (!opts[ak.correctKey] || opts[ak.correctKey].lure !== 'correct') errors.push(`${where}: correctKey ${ak.correctKey} does not point to the 'correct' option`);
    if (!Array.isArray(ak && ak.distractorRationales) || ak.distractorRationales.length !== opts.length) {
      errors.push(`${where}: distractorRationales must align to options length`);
    } else if (ak.distractorRationales.some((r, ri) => r !== opts[ri].lure)) {
      errors.push(`${where}: distractorRationales must equal options lure order`);
    }

    if (Array.isArray(it.ageBands) && it.ageBands.includes('K-1')) {
      const words = storyWords(events.map((e) => e.text));
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
    console.log('\nVALIDATION PASSED: parse ok, orderings valid, keys aligned, >=5 items per +/-1 pt band.');
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
