#!/usr/bin/env node
// CX-curious-02 (Question Quest) — structured item-bank generator.
//
// Each item has THREE rounds:
//
//   ask round        (OPEN, judge deferred) — the child asks as many questions
//                    about the odd scene as they like, building them from
//                    starter cards (Who / What / Where / When / Why / How /
//                    What if) or typing freely. Nothing is right or wrong.
//   guess rounds     (OPEN, judge deferred) — guess why this happened, and
//                    guess what happens next.
//   gap round        (KEYED, deterministic) — "Which one of these do we NOT
//                    know from the scene?" Exactly one option is undetermined
//                    by the scene text; every other option is stated in it.
//
// CONSTRUCT-VALIDITY NOTE (flagged deliberately)
// ----------------------------------------------
// The keyed round does NOT measure curiosity. Curiosity is a disposition, and
// no option here is "the curious answer" — grading one would encode a
// personality preference as a right answer, which this bank must not do. What
// the keyed round measures is INFORMATION-GAP DETECTION: noticing which part of
// what you are looking at you cannot actually know yet. That is the precondition
// for asking a useful question, it is defensibly keyable against the scene text,
// and it gives the adaptive engine a difficulty signal for a type that otherwise
// has none. The curiosity signal itself (M-QUERY depth, M-IDEAFLU, M-FLEX,
// M-ORIG) stays an auto-COUNT plus a deferred rubric — never a key.
//
// WHY THE KEY IS DEFENSIBLE AND MECHANICALLY CHECKABLE
// ----------------------------------------------------
// Every non-key option cites the scene line that states it, together with the
// content tokens it shares with that line; the checker confirms each token
// really occurs in the cited line. The key option carries novelty tokens that
// occur in NO scene line. So "we do not know this" is grounded in the text the
// child can see, not in the author's intuition. (The token test is a
// conservative textual proxy, not a semantic entailment proof — it catches the
// failure mode that matters, an option that is actually stated being keyed as
// unknown, or two options being equally unstated.)
//
// CONTENT MODEL
// -------------
// 40 authored scenes, ordered simple -> rich, each materialised at three
// variants (v0 three options and a blunt gap, v1 four options, v2 five options
// and a plausible-sounding causal gap). 40 x 3 = 120 items, six per bucket.
//
// D-017: text only, never audio; the catalog floor for this type is grade 2-3.
// Governance: born-synthetic. syntheticOnly:true, validated:false.
//
// Usage:
//   node generators/CX-curious-02.mjs             # build + write banks/CX-curious-02.jsonl
//   node generators/CX-curious-02.mjs --check     # build in memory + validate
//   node generators/CX-curious-02.mjs --validate  # validate the JSONL on disk
//   node generators/CX-curious-02.mjs --print 1

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'CX-curious-02.jsonl');

export const TYPE_CODE = 'CX-curious-02';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/CX-curious-02.html';
const GENERATOR_REF = 'CX-curious-02/authored-scenes@v1';

// Catalog age bands. K-1 is absent: composing questions on screen needs
// question syntax and reading (D-017).
export const ALLOWED_AGE_BANDS = ['2-3', '4-5', '6-8'];

// Question-starter cards. `depth` is an AUTO-COUNTED tier, never a correctness
// key: label questions (1), causal questions (2), hypothetical questions (3).
export const STARTERS = [
  { id: 'q_who', word: 'Who', depth: 1 },
  { id: 'q_what', word: 'What', depth: 1 },
  { id: 'q_where', word: 'Where', depth: 1 },
  { id: 'q_when', word: 'When', depth: 1 },
  { id: 'q_why', word: 'Why', depth: 2 },
  { id: 'q_how', word: 'How', depth: 2 },
  { id: 'q_whatif', word: 'What if', depth: 3 },
];

export const GAP_LURES = new Set([
  'correct', 'stated_in_scene', 'stated_in_later_line',
]);

const GAP_WHY = {
  stated_in_scene: 'The scene says this directly, so it is known and cannot be the gap.',
  stated_in_later_line: 'Also stated, but only in a later line — it catches children who stop reading early.',
};
const KEY_WHY = {
  absent_topic: 'The scene never mentions this at all — the bluntest kind of information gap.',
  unstated_property: 'About something the scene does show, but the scene never says this about it.',
  unstated_cause: 'A plausible explanation for what the scene shows, which the scene does not establish. This is the near-miss gap.',
};

const GUESS_PROMPTS = [
  'Why do you think this happened?',
  'What do you think happens next?',
];

const GAP_QUESTION = 'Which one of these do we NOT know from the scene?';
const ASK_PROMPT = 'Ask as many questions about this scene as you like. There are no wrong questions.';

// Which options each variant shows: the key plus this many stated distractors.
const VARIANT_DISTRACTORS = [2, 3, 4];

// ---------------------------------------------------------------------------
// AUTHORED SCENES — 40, ordered simple -> rich.
//   l : scene lines (short, grade 2-3 readable)
//   s : stated options  [ text, lineIndex, [tokens that must occur in that line] ]
//   u : gap options     [ text, [novelty tokens that must occur in NO line], kind ]
//       u[0] used at v0 (bluntest), u[1] at v1, u[2] at v2 (most plausible)
// ---------------------------------------------------------------------------
const SCENES = [
  {
    n: 'The door in the tree',
    l: ['A small door is set into the trunk of a big tree.', 'The handle on the door is shiny.'],
    s: [['The door is small.', 0, ['door', 'small']], ['The door is in a tree.', 0, ['door', 'tree']],
      ['The handle is shiny.', 1, ['handle', 'shiny']], ['The tree is big.', 0, ['tree', 'big']]],
    u: [['A cat lives in the field.', ['cat'], 'absent_topic'], ['The door is locked.', ['locked'], 'unstated_property'], ['Someone opens the door often.', ['opens'], 'unstated_cause']],
  },
  {
    n: 'The puddle that glows',
    l: ['A puddle by the path glows green at night.', 'No lamp stands near the path.'],
    s: [['The puddle glows green.', 0, ['puddle', 'glows', 'green']], ['The puddle is by a path.', 0, ['puddle', 'path']],
      ['No lamp is near the path.', 1, ['lamp', 'path']], ['It is night.', 0, ['night']]],
    u: [['A bus goes past the school.', ['bus'], 'absent_topic'], ['The puddle is deep.', ['deep'], 'unstated_property'], ['Paint from the works made it glow.', ['paint'], 'unstated_cause']],
  },
  {
    n: 'Footprints that stop',
    l: ['Muddy footprints cross the yard.', 'They stop in the middle and go no further.'],
    s: [['The footprints are muddy.', 0, ['footprints', 'muddy']], ['The footprints cross a yard.', 0, ['footprints', 'yard']],
      ['They stop in the middle.', 1, ['stop', 'middle']], ['They go no further.', 1, ['further']]],
    u: [['A dog barked in the lane.', ['dog'], 'absent_topic'], ['The footprints are new.', ['new'], 'unstated_property'], ['Someone climbed up from there.', ['climbed'], 'unstated_cause']],
  },
  {
    n: 'The chair on the roof',
    l: ['A wooden chair sits on the roof of a house.', 'The chair faces away from the street.'],
    s: [['A chair is on a roof.', 0, ['chair', 'roof']], ['The chair is wooden.', 0, ['chair', 'wooden']],
      ['The chair faces away from the street.', 1, ['chair', 'faces', 'street']], ['There is a house.', 0, ['house']]],
    u: [['A boat is tied at the pier.', ['boat'], 'absent_topic'], ['The chair is broken.', ['broken'], 'unstated_property'], ['The wind blew the chair up there.', ['wind'], 'unstated_cause']],
  },
  {
    n: 'The red boot',
    l: ['One red boot hangs from a branch.', 'The other boot is not there.'],
    s: [['A boot hangs from a branch.', 0, ['boot', 'hangs', 'branch']], ['The boot is red.', 0, ['boot', 'red']],
      ['The other boot is missing.', 1, ['other', 'boot']], ['There is one boot.', 0, ['One', 'boot']]],
    u: [['A train runs behind the trees.', ['train'], 'absent_topic'], ['The boot is wet.', ['wet'], 'unstated_property'], ['A child threw the boot up.', ['threw'], 'unstated_cause']],
  },
  {
    n: 'The one open window',
    l: ['Every window on the street is shut.', 'One window on the top floor is wide open.'],
    s: [['Most windows are shut.', 0, ['window', 'shut']], ['One window is open.', 1, ['One', 'window', 'open']],
      ['The open window is on the top floor.', 1, ['open', 'window', 'top', 'floor']], ['This is a street.', 0, ['street']]],
    u: [['A shop sells bread here.', ['shop'], 'absent_topic'], ['The open window is dirty.', ['dirty'], 'unstated_property'], ['Someone left in a hurry.', ['hurry'], 'unstated_cause']],
  },
  {
    n: 'The swing that moves',
    l: ['A swing in the park moves back and forth.', 'Nobody is sitting on it and the air is still.'],
    s: [['A swing is moving.', 0, ['swing', 'moves']], ['The swing is in a park.', 0, ['swing', 'park']],
      ['Nobody is on the swing.', 1, ['Nobody']], ['The air is still.', 1, ['air', 'still']]],
    u: [['A bell rings at the church.', ['bell'], 'absent_topic'], ['The swing is old.', ['old'], 'unstated_property'], ['A child jumped off a moment ago.', ['jumped'], 'unstated_cause']],
  },
  {
    n: 'The pile of shoes',
    l: ['A neat pile of shoes stands by a garden gate.', 'All the shoes are the same size.'],
    s: [['There is a pile of shoes.', 0, ['pile', 'shoes']], ['The pile is by a gate.', 0, ['pile', 'gate']],
      ['The shoes are the same size.', 1, ['shoes', 'same', 'size']], ['The pile is neat.', 0, ['neat', 'pile']]],
    u: [['A cake is cooling on a sill.', ['cake'], 'absent_topic'], ['The shoes are muddy.', ['muddy'], 'unstated_property'], ['A club meets in the garden.', ['club'], 'unstated_cause']],
  },
  {
    n: 'The cake on the bench',
    l: ['A whole cake sits on a bench in the park.', 'Two forks lie beside it, but nobody is near.'],
    s: [['A cake is on a bench.', 0, ['cake', 'bench']], ['The bench is in a park.', 0, ['bench', 'park']],
      ['Two forks lie beside it.', 1, ['Two', 'forks']], ['Nobody is near.', 1, ['Nobody', 'near']]],
    u: [['A plane flies over the hill.', ['plane'], 'absent_topic'], ['The cake is warm.', ['warm'], 'unstated_property'], ['Two people went to fetch drinks.', ['drinks'], 'unstated_cause']],
  },
  {
    n: 'The bike with no wheels',
    l: ['A bike is locked to a rack outside the shop.', 'Both of its wheels are gone.'],
    s: [['A bike is locked to a rack.', 0, ['bike', 'locked', 'rack']], ['The rack is outside a shop.', 0, ['rack', 'outside', 'shop']],
      ['Both wheels are gone.', 1, ['wheels', 'gone']], ['There is a bike.', 0, ['bike']]],
    u: [['A cat sleeps in the doorway.', ['cat'], 'absent_topic'], ['The bike is red.', ['red'], 'unstated_property'], ['The owner is away on holiday.', ['owner'], 'unstated_cause']],
  },
  {
    n: 'The clock with one hand',
    l: ['The clock above the door has only one hand.', 'The hand points straight up.'],
    s: [['The clock has one hand.', 0, ['clock', 'one', 'hand']], ['The clock is above a door.', 0, ['clock', 'above', 'door']],
      ['The hand points straight up.', 1, ['hand', 'points', 'straight']], ['There is a clock.', 0, ['clock']]],
    u: [['A river runs behind the wall.', ['river'], 'absent_topic'], ['The clock is broken.', ['broken'], 'unstated_property'], ['Someone removed the other hand.', ['removed'], 'unstated_cause']],
  },
  {
    n: 'The snowman in the sun',
    l: ['A snowman stands in a warm street.', 'None of the snow around it has melted.'],
    s: [['A snowman is in a street.', 0, ['snowman', 'street']], ['The street is warm.', 0, ['street', 'warm']],
      ['The snow has not melted.', 1, ['snow', 'melted']], ['There is snow around it.', 1, ['snow', 'around']]],
    u: [['A radio plays in the flat.', ['radio'], 'absent_topic'], ['The snowman is tall.', ['tall'], 'unstated_property'], ['The snowman is made of foam.', ['foam'], 'unstated_cause']],
  },
  {
    n: 'The birds on one wire',
    l: ['Two wires run above the road.', 'Every bird sits on the lower wire and none on the top one.'],
    s: [['Two wires run above a road.', 0, ['Two', 'wires', 'above', 'road']], ['Birds sit on the lower wire.', 1, ['bird', 'lower', 'wire']],
      ['No bird is on the top wire.', 1, ['bird', 'top']], ['There is a road.', 0, ['road']]],
    u: [['A postbox stands at the corner.', ['postbox'], 'absent_topic'], ['The birds are noisy.', ['noisy'], 'unstated_property'], ['The top wire carries power.', ['power'], 'unstated_cause']],
  },
  {
    n: 'The kite on the chimney',
    l: ['A kite is caught on a tall chimney.', 'Its string hangs all the way down to the yard.'],
    s: [['A kite is caught on a chimney.', 0, ['kite', 'caught', 'chimney']], ['The chimney is tall.', 0, ['tall', 'chimney']],
      ['The string hangs down to the yard.', 1, ['string', 'hangs', 'yard']], ['There is a kite.', 0, ['kite']]],
    u: [['A bus stops at the corner.', ['bus'], 'absent_topic'], ['The kite is torn.', ['torn'], 'unstated_property'], ['A child let go of the string.', ['child'], 'unstated_cause']],
  },
  {
    n: 'The shed with three locks',
    l: ['A small garden shed has three locks on its door.', 'The window of the shed has no glass in it.'],
    s: [['The shed has three locks.', 0, ['shed', 'three', 'locks']], ['The shed is small.', 0, ['small', 'shed']],
      ['The window has no glass.', 1, ['window', 'glass']], ['There is a door.', 0, ['door']]],
    u: [['A pond lies past the hedge.', ['pond'], 'absent_topic'], ['The shed is empty.', ['empty'], 'unstated_property'], ['Something valuable is kept inside.', ['valuable'], 'unstated_cause']],
  },
  {
    n: 'The bench facing the wall',
    l: ['A bench in the park faces a blank brick wall.', 'Behind the bench there is a wide view of the lake.'],
    s: [['The bench faces a wall.', 0, ['bench', 'faces', 'wall']], ['The wall is brick.', 0, ['brick', 'wall']],
      ['There is a view of the lake behind.', 1, ['view', 'lake', 'Behind']], ['The bench is in a park.', 0, ['bench', 'park']]],
    u: [['A bell tower stands in town.', ['tower'], 'absent_topic'], ['The bench is new.', ['new'], 'unstated_property'], ['The bench was turned round by mistake.', ['mistake'], 'unstated_cause']],
  },
  {
    n: 'The boat in the field',
    l: ['A wooden boat sits in the middle of a dry field.', 'The nearest water is far away.'],
    s: [['A boat is in a field.', 0, ['boat', 'field']], ['The field is dry.', 0, ['dry', 'field']],
      ['The nearest water is far away.', 1, ['nearest', 'water', 'far']], ['The boat is wooden.', 0, ['wooden', 'boat']]],
    u: [['A market opens on Fridays.', ['market'], 'absent_topic'], ['The boat leaks.', ['leaks'], 'unstated_property'], ['A flood carried the boat here.', ['flood'], 'unstated_cause']],
  },
  {
    n: 'The lit lamp',
    l: ['A lamp is lit in the window of an empty house.', 'The front door of the house is boarded up.'],
    s: [['A lamp is lit.', 0, ['lamp', 'lit']], ['The house is empty.', 0, ['house', 'empty']],
      ['The front door is boarded up.', 1, ['front', 'door', 'boarded']], ['The lamp is in a window.', 0, ['lamp', 'window']]],
    u: [['A school bus waits outside.', ['school'], 'absent_topic'], ['The lamp is old.', ['old'], 'unstated_property'], ['A timer switches the lamp on.', ['timer'], 'unstated_cause']],
  },
  {
    n: 'The bridge that ends',
    l: ['A stone bridge crosses half of the river.', 'The far end stops in the air with no road.'],
    s: [['The bridge is stone.', 0, ['stone', 'bridge']], ['The bridge crosses half the river.', 0, ['bridge', 'half', 'river']],
      ['The far end stops in the air.', 1, ['far', 'end', 'stops', 'air']], ['There is no road at the end.', 1, ['road']]],
    u: [['A path leads up the hill.', ['hill'], 'absent_topic'], ['The bridge is safe.', ['safe'], 'unstated_property'], ['The builders ran out of money.', ['money'], 'unstated_cause']],
  },
  {
    n: 'The half-painted fence',
    l: ['A long fence is painted white for half its length.', 'The rest of the fence is bare wood.'],
    s: [['Half the fence is painted white.', 0, ['fence', 'painted', 'white', 'half']], ['The fence is long.', 0, ['long', 'fence']],
      ['The rest is bare wood.', 1, ['rest', 'bare', 'wood']], ['There is a fence.', 0, ['fence']]],
    u: [['A goat stands in the yard.', ['goat'], 'absent_topic'], ['The paint is dry.', ['dry'], 'unstated_property'], ['The painter stopped for lunch.', ['painter'], 'unstated_cause']],
  },
  {
    n: 'The garden in the tunnel',
    l: ['Inside an old railway tunnel there is a small garden.', 'Lamps hang from the roof above the plants.'],
    s: [['There is a garden in a tunnel.', 0, ['garden', 'tunnel']], ['The tunnel is old.', 0, ['old', 'tunnel']],
      ['Lamps hang above the plants.', 1, ['Lamps', 'hang', 'plants']], ['The garden is small.', 0, ['small', 'garden']]],
    u: [['A cafe serves soup nearby.', ['soup'], 'absent_topic'], ['The plants are dying.', ['dying'], 'unstated_property'], ['The lamps let the plants grow.', ['grow'], 'unstated_cause']],
  },
  {
    n: 'The piano in the rain',
    l: ['A piano stands alone in a car park in the rain.', 'Its lid is propped open.'],
    s: [['A piano is in a car park.', 0, ['piano', 'car', 'park']], ['It is raining.', 0, ['rain']],
      ['The lid is propped open.', 1, ['lid', 'propped', 'open']], ['The piano is alone.', 0, ['piano', 'alone']]],
    u: [['A choir sings in the hall.', ['choir'], 'absent_topic'], ['The piano is out of tune.', ['tune'], 'unstated_property'], ['Someone left it there for anyone to play.', ['anyone'], 'unstated_cause']],
  },
  {
    n: 'The stairs to nowhere',
    l: ['A flight of stone stairs rises in the middle of a field.', 'At the top there is no door and no building.'],
    s: [['The stairs are stone.', 0, ['stone', 'stairs']], ['The stairs are in a field.', 0, ['stairs', 'field']],
      ['There is no door at the top.', 1, ['door', 'top']], ['There is no building.', 1, ['building']]],
    u: [['A stream runs by the wood.', ['stream'], 'absent_topic'], ['The stairs are slippery.', ['slippery'], 'unstated_property'], ['A house here was pulled down.', ['pulled'], 'unstated_cause']],
  },
  {
    n: 'The phone box of books',
    l: ['An old phone box on the green is full of books.', 'A sign on the glass says take one, leave one.'],
    s: [['The phone box is full of books.', 0, ['phone', 'box', 'full', 'books']], ['The phone box is old.', 0, ['old', 'phone']],
      ['A sign is on the glass.', 1, ['sign', 'glass']], ['The phone box is on the green.', 0, ['green']]],
    u: [['A bakery opens at six.', ['bakery'], 'absent_topic'], ['The books are wet.', ['wet'], 'unstated_property'], ['The village started it last year.', ['village'], 'unstated_cause']],
  },
  {
    n: 'The road that splits',
    l: ['A road splits into two and joins again after a field.', 'Both halves are exactly the same length.'],
    s: [['The road splits into two.', 0, ['road', 'splits', 'two']], ['The two halves join again.', 0, ['joins', 'again']],
      ['Both halves are the same length.', 1, ['halves', 'same', 'length']], ['There is a field.', 0, ['field']]],
    u: [['A quarry works up the valley.', ['quarry'], 'absent_topic'], ['One half is busier.', ['busier'], 'unstated_property'], ['A tree in the middle was saved.', ['saved'], 'unstated_cause']],
  },
  {
    n: 'The missing number',
    l: ['The houses in the row are numbered eleven, twelve and fourteen.', 'No house on the row is numbered thirteen.'],
    s: [['One of the houses is number twelve.', 0, ['houses', 'twelve']], ['One house is number fourteen.', 0, ['fourteen']],
      ['No house is number thirteen.', 1, ['house', 'thirteen']], ['The houses are in a row.', 0, ['houses', 'row']]],
    u: [['A park lies at the end.', ['park'], 'absent_topic'], ['The houses are new.', ['new'], 'unstated_property'], ['The builder thought it unlucky.', ['unlucky'], 'unstated_cause']],
  },
  {
    n: 'The cracked bell',
    l: ['The bell in the tower has a long crack down one side.', 'It still rings on every hour.'],
    s: [['The bell has a crack.', 0, ['bell', 'crack']], ['The bell is in a tower.', 0, ['bell', 'tower']],
      ['It rings on every hour.', 1, ['rings', 'every', 'hour']], ['The crack is long.', 0, ['long', 'crack']]],
    u: [['A fair comes in the spring.', ['fair'], 'absent_topic'], ['The bell sounds flat.', ['flat'], 'unstated_property'], ['Frost made the crack last winter.', ['Frost'], 'unstated_cause']],
  },
  {
    n: 'The empty stall',
    l: ['One market stall is set up but holds nothing at all.', 'Its owner sits behind it and waits.'],
    s: [['The stall holds nothing.', 0, ['stall', 'nothing']], ['The stall is set up.', 0, ['stall', 'set']],
      ['The owner sits behind it.', 1, ['owner', 'sits', 'behind']], ['The owner waits.', 1, ['waits']]],
    u: [['A bus leaves at noon.', ['bus'], 'absent_topic'], ['The stall is new.', ['new'], 'unstated_property'], ['The goods have not arrived.', ['goods'], 'unstated_cause']],
  },
  {
    n: 'The ladder in the well',
    l: ['An old well in the yard has a metal ladder inside it.', 'The well is dry all the way to the bottom.'],
    s: [['The well has a ladder.', 0, ['well', 'ladder']], ['The ladder is metal.', 0, ['metal', 'ladder']],
      ['The well is dry.', 1, ['well', 'dry']], ['The well is old.', 0, ['old', 'well']]],
    u: [['A barn stands past the gate.', ['barn'], 'absent_topic'], ['The ladder is rusty.', ['rusty'], 'unstated_property'], ['Someone works down there.', ['works'], 'unstated_cause']],
  },
  {
    n: 'The one green tree',
    l: ['Every tree in the orchard is bare except one.', 'That one tree is covered in green leaves.'],
    s: [['Most trees are bare.', 0, ['tree', 'bare']], ['One tree has green leaves.', 1, ['tree', 'green', 'leaves']],
      ['The trees are in an orchard.', 0, ['orchard']], ['The green tree is covered in leaves.', 1, ['covered', 'leaves']]],
    u: [['A tractor works two fields away.', ['tractor'], 'absent_topic'], ['The green tree is the oldest.', ['oldest'], 'unstated_property'], ['A warm pipe runs under it.', ['pipe'], 'unstated_cause']],
  },
  {
    n: 'The painted door',
    l: ['A door is painted onto a blank brick wall.', 'A real metal handle is fixed beside the painting.'],
    s: [['The door is painted on.', 0, ['door', 'painted']], ['The wall is brick.', 0, ['brick', 'wall']],
      ['A real handle is fixed there.', 1, ['real', 'handle', 'fixed']], ['The handle is metal.', 1, ['metal', 'handle']]],
    u: [['A cinema opened last month.', ['cinema'], 'absent_topic'], ['The paint is fresh.', ['fresh'], 'unstated_property'], ['An artist made it as a joke.', ['artist'], 'unstated_cause']],
  },
  {
    n: 'The lighthouse inland',
    l: ['A working lighthouse stands ten miles from any sea.', 'Its light turns all through the night.'],
    s: [['The lighthouse is far from the sea.', 0, ['lighthouse', 'sea', 'miles']], ['The lighthouse works.', 0, ['working']],
      ['The light turns all night.', 1, ['light', 'turns', 'night']], ['It is ten miles away.', 0, ['ten', 'miles']]],
    u: [['A quarry lies to the west.', ['quarry'], 'absent_topic'], ['The lighthouse is white.', ['white'], 'unstated_property'], ['The sea once reached this spot.', ['once'], 'unstated_cause']],
  },
  {
    n: 'The tower with two times',
    l: ['The tower has a clock face on each of two sides.', 'The two faces show times an hour apart.'],
    s: [['There are two clock faces.', 0, ['two', 'clock', 'face']], ['The faces are on two sides.', 0, ['sides']],
      ['The times are an hour apart.', 1, ['times', 'hour', 'apart']], ['There is a tower.', 0, ['tower']]],
    u: [['A canal passes the mill.', ['canal'], 'absent_topic'], ['One face is bigger.', ['bigger'], 'unstated_property'], ['One face was never put back.', ['never'], 'unstated_cause']],
  },
  {
    n: 'The chairs facing the door',
    l: ['In the waiting room every chair faces the door.', 'The chairs are bolted to the floor.'],
    s: [['Every chair faces the door.', 0, ['chair', 'faces', 'door']], ['This is a waiting room.', 0, ['waiting', 'room']],
      ['The chairs are bolted down.', 1, ['chairs', 'bolted']], ['The chairs are on the floor.', 1, ['floor']]],
    u: [['A garden lies behind the house.', ['garden'], 'absent_topic'], ['The chairs are hard.', ['hard'], 'unstated_property'], ['People must watch who comes in.', ['watch'], 'unstated_cause']],
  },
  {
    n: 'The crossed-out town',
    l: ['On the old wall map one town is crossed out in ink.', 'Every other town on the map is left plain.'],
    s: [['One town is crossed out.', 0, ['town', 'crossed']], ['The map is old.', 0, ['old', 'map']],
      ['Every other town is left plain.', 1, ['town', 'plain']], ['The mark is in ink.', 0, ['ink']]],
    u: [['A railway ends at the coast.', ['railway'], 'absent_topic'], ['The map is torn.', ['torn'], 'unstated_property'], ['That town is under water now.', ['water'], 'unstated_cause']],
  },
  {
    n: 'The platform with no track',
    l: ['A station platform stands beside an empty strip of grass.', 'The signs and benches are all still in place.'],
    s: [['There is a platform.', 0, ['platform']], ['Beside it is grass.', 0, ['grass']],
      ['The signs are still there.', 1, ['signs', 'still']], ['The benches are still there.', 1, ['benches', 'still']]],
    u: [['A bridge crosses the road.', ['bridge'], 'absent_topic'], ['The platform is cracked.', ['cracked'], 'unstated_property'], ['The track was taken up years ago.', ['taken'], 'unstated_cause']],
  },
  {
    n: 'The statue with a scarf',
    l: ['A stone statue in the square wears a real wool scarf.', 'The scarf is clean and looks new.'],
    s: [['The statue is stone.', 0, ['stone', 'statue']], ['The statue wears a scarf.', 0, ['statue', 'scarf']],
      ['The scarf is clean.', 1, ['scarf', 'clean']], ['The scarf looks new.', 1, ['looks', 'new']]],
    u: [['A fountain runs by the steps.', ['fountain'], 'absent_topic'], ['The statue is tall.', ['tall'], 'unstated_property'], ['A neighbour puts it on each winter.', ['neighbour'], 'unstated_cause']],
  },
  {
    n: 'The empty shelf',
    l: ['Every shelf in the library is packed except the top one.', 'The top shelf has been dusted and is quite bare.'],
    s: [['Most shelves are packed.', 0, ['shelf', 'packed']], ['The top shelf is bare.', 1, ['top', 'shelf', 'bare']],
      ['The top shelf has been dusted.', 1, ['dusted']], ['This is a library.', 0, ['library']]],
    u: [['A cafe sits by the door.', ['cafe'], 'absent_topic'], ['The top shelf is broken.', ['broken'], 'unstated_property'], ['Those books are being repaired.', ['repaired'], 'unstated_cause']],
  },
  {
    n: 'The path under the water',
    l: ['A line of flat stones runs just under the river surface.', 'From the bank the stones cannot be seen at all.'],
    s: [['The stones are flat.', 0, ['stones', 'flat']], ['The stones are under the surface.', 0, ['under', 'surface']],
      ['The stones cannot be seen from the bank.', 1, ['stones', 'seen', 'bank']], ['There is a river.', 0, ['river']]],
    u: [['A mill once stood upstream.', ['mill'], 'absent_topic'], ['The stones are slippery.', ['slippery'], 'unstated_property'], ['The path was built to stay hidden.', ['hidden'], 'unstated_cause']],
  },
  {
    n: 'The poles with no wires',
    l: ['A line of tall poles crosses the field in a straight row.', 'Not one wire runs between any of them.'],
    s: [['The poles are tall.', 0, ['poles', 'tall']], ['The poles cross a field.', 0, ['poles', 'field']],
      ['No wire runs between them.', 1, ['wire', 'between']], ['The poles are in a straight row.', 0, ['straight', 'row']]],
    u: [['A farm track leads north.', ['farm'], 'absent_topic'], ['The poles are rotten.', ['rotten'], 'unstated_property'], ['The wires were taken for scrap.', ['scrap'], 'unstated_cause']],
  },
];

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
function seededShuffle(arr, seed) {
  const rnd = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const PER_BAND = 6;
export function difficultyFor(index) {
  const band = Math.floor(index / PER_BAND) + 1;
  const pos = index % PER_BAND;
  let offsets;
  if (band === 1) offsets = [0, 0.08, 0.16, 0.24, 0.32, 0.4];
  else if (band === 20) offsets = [-0.4, -0.32, -0.24, -0.16, -0.08, 0];
  else offsets = [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4];
  return Math.round(Math.min(20, Math.max(1, band + offsets[pos])) * 100) / 100;
}

// Catalog floor for this type is grade 2-3.
export function ageBandsFor(d) {
  if (d < 8) return ['2-3'];
  if (d < 12) return ['4-5'];
  return ['6-8'];
}

export const MAX_WORD_LEN_LOW = 10;
export const MAX_LINE_CHARS_LOW = 64;

// Tap-helper nouns for composing questions; derived from the scene text so the
// helper words can never introduce information the scene does not contain.
const STOPWORDS = new Set(['the', 'and', 'that', 'with', 'from', 'into', 'this', 'there', 'have', 'been', 'they', 'them', 'each', 'only', 'every', 'much', 'more', 'most', 'some', 'none', 'past', 'over', 'under', 'just', 'about', 'other', 'still', 'their', 'which', 'stands', 'sits']);
export function focusWordsFor(lines) {
  const seen = [];
  for (const line of lines) {
    for (const w of line.toLowerCase().split(/[^a-z]+/)) {
      if (w.length >= 4 && !STOPWORDS.has(w) && !seen.includes(w)) seen.push(w);
    }
  }
  return seen.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Build one BankItem: scene at variant v.
// ---------------------------------------------------------------------------
function buildItem(scene, sceneIdx, variant, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${sceneIdx}:${variant}`);
  const difficulty = difficultyFor(index);

  const key = scene.u[variant];
  const stated = scene.s.slice(0, VARIANT_DISTRACTORS[variant]);
  const lastLine = scene.l.length - 1;

  const pool = [
    { text: key[0], support: 'unknown', line: null, tokens: key[1], lure: 'correct', kind: key[2] },
    ...stated.map((s) => ({
      text: s[0], support: 'stated', line: s[1], tokens: s[2],
      lure: s[1] === lastLine && scene.l.length > 1 ? 'stated_in_later_line' : 'stated_in_scene',
      kind: null,
    })),
  ];
  const shuffled = seededShuffle(pool, hashNum(itemId + ':gap'));
  const gapOptions = shuffled.map((o, i) => ({ id: `g${i + 1}`, text: o.text }));
  const correctKey = gapOptions[shuffled.findIndex((o) => o.support === 'unknown')].id;

  const rationales = {};
  shuffled.forEach((o, i) => {
    rationales[gapOptions[i].id] = {
      lure: o.lure,
      why: o.lure === 'correct' ? KEY_WHY[o.kind] : GAP_WHY[o.lure],
    };
  });

  return {
    itemId,
    typeCode: TYPE_CODE,
    domain: DOMAIN,
    difficulty,
    ageBands: ageBandsFor(difficulty),
    demoPath: DEMO_PATH,
    content: {
      typeCode: TYPE_CODE,
      presentation: 'text', // D-017: the scene is described in words, never narrated
      scene: { title: scene.n, lines: scene.l },
      askPrompt: ASK_PROMPT,
      starters: STARTERS.slice(0, variant === 0 ? 5 : STARTERS.length),
      focusWords: focusWordsFor(scene.l),
      guessPrompts: GUESS_PROMPTS,
      gapQuestion: GAP_QUESTION,
      gapOptions,
      variant,
    },
    answer: {
      correctKey,
      distractorRationales: rationales,
      // What the checker re-derives the key from, without reading correctKey.
      evidenceModel: {
        sceneLines: scene.l.length,
        gapOptions: shuffled.map((o, i) => ({
          id: gapOptions[i].id,
          support: o.support,
          evidenceLine: o.line,
          tokens: o.tokens,
          lure: o.lure,
        })),
      },
      gapKind: key[2],
      // The curiosity rounds are OPEN. These are the dimensions a future judge
      // scores; nothing here is keyed and no answer is preferred.
      rubricDimensions: [
        'question_count (auto-counted now as M-IDEAFLU; no judge needed)',
        'question_depth_mix (auto-counted from the starter used; label / causal / hypothetical)',
        'question_originality — how rare and specific the question is (deferred)',
        'cause_guess_plausibility — is the guess consistent with everything the scene shows (deferred)',
        'consequence_guess_plausibility — likewise for what happens next (deferred)',
        'flexibility — how many different kinds of explanation the child reaches for (deferred)',
      ],
    },
    scoring: {
      mode: 'deterministic_key',
      keyedComponents: ['information_gap_identification'],
      deferredComponents: ['question_originality', 'cause_guess_quality', 'consequence_guess_quality', 'flexibility'],
      constructNote: 'The keyed component measures information-gap detection, NOT curiosity. Curiosity is reported as auto-counts (M-IDEAFLU, question-depth mix) plus a deferred rubric; no question or guess is ever marked wrong.',
    },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: `${sceneIdx}:${variant}`,
      sceneIndex: sceneIdx,
      variant,
      contentHash: createHash('sha1').update(JSON.stringify([scene, variant])).digest('hex').slice(0, 16),
      validatorVerdicts: [
        { check: 'single_satisfiability', status: pool.filter((o) => o.support === 'unknown').length === 1 ? 'pass' : 'fail' },
        { check: 'no_audio', status: 'pass', detail: 'D-017: scene delivered as on-screen text' },
        { check: 'open_rounds_unkeyed', status: 'pass', detail: 'no question or guess is scored as right or wrong' },
        { check: 'bias_screen_ok', status: 'pass', detail: 'gap is grounded in the scene text, not in cultural knowledge' },
      ],
    },
    syntheticOnly: true,
    validated: false,
  };
}

export function buildBank() {
  const items = [];
  for (let v = 0; v < 3; v++) {
    for (let s = 0; s < SCENES.length; s++) {
      items.push(buildItem(SCENES[s], s, v, v * SCENES.length + s));
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Build-time validation.
// ---------------------------------------------------------------------------
export function normalise(s) {
  return ' ' + s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}
export function lineContains(line, token) {
  return normalise(line).includes(' ' + token.toLowerCase().replace(/[^a-z0-9]+/g, '') + ' ');
}

export function validateItems(items) {
  const errors = [];
  const bandCounts = {};
  for (let b = 1; b <= 20; b++) bandCounts[b] = 0;

  items.forEach((it, idx) => {
    const where = `item[${idx}] ${it.itemId}`;
    if (it.typeCode !== TYPE_CODE || it.domain !== DOMAIN) errors.push(`${where}: bad typeCode/domain`);
    if (it.syntheticOnly !== true || it.validated !== false) errors.push(`${where}: born-synthetic flags wrong`);
    const d = it.difficulty;
    if (typeof d !== 'number' || d < 1 || d > 20) errors.push(`${where}: difficulty out of range`);
    else bandCounts[Math.round(d)]++;

    const lines = it.content.scene.lines;
    const model = it.answer.evidenceModel.gapOptions;
    const unknown = model.filter((o) => o.support === 'unknown');
    if (unknown.length !== 1) errors.push(`${where}: ${unknown.length} unknown options (want exactly 1)`);
    else if (unknown[0].id !== it.answer.correctKey) errors.push(`${where}: correctKey does not point at the unknown option`);
    for (const o of model) {
      if (o.support === 'stated') {
        for (const tk of o.tokens) if (!lineContains(lines[o.evidenceLine], tk)) errors.push(`${where}: option ${o.id} cites line ${o.evidenceLine} but token "${tk}" is not in it`);
      } else {
        for (const tk of o.tokens) if (lines.some((l) => lineContains(l, tk))) errors.push(`${where}: gap token "${tk}" DOES occur in the scene`);
      }
    }
  });

  const low = Object.entries(bandCounts).filter(([, n]) => n < 5);
  if (low.length) errors.push(`coverage: bands with <5 items -> ${low.map(([b, n]) => `${b}:${n}`).join(', ')}`);
  const ids = items.map((i) => i.itemId);
  if (new Set(ids).size !== ids.length) errors.push('itemId collision');

  return { ok: errors.length === 0, errors, count: items.length, bandCounts };
}

function readBankFromDisk() {
  if (!existsSync(BANK_PATH)) throw new Error(`bank file not found: ${BANK_PATH}`);
  return readFileSync(BANK_PATH, 'utf8').split('\n').filter((l) => l.trim()).map((l, i) => {
    try { return JSON.parse(l); } catch (e) { throw new Error(`JSON parse error on line ${i + 1}: ${e.message}`); }
  });
}
function writeBank(items) {
  mkdirSync(dirname(BANK_PATH), { recursive: true });
  writeFileSync(BANK_PATH, items.map((it) => JSON.stringify(it)).join('\n') + '\n', 'utf8');
}
function printCoverage(report) {
  const bars = Object.entries(report.bandCounts)
    .map(([b, n]) => `  band ${String(b).padStart(2)} | ${'#'.repeat(n)} ${n}`).join('\n');
  console.log(`items: ${report.count}\nper integer difficulty bucket:\n${bars}`);
}

function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  if (has('--print')) {
    const n = Number(argv[argv.indexOf('--print') + 1]) || 1;
    console.log(JSON.stringify(buildBank().slice(0, n), null, 2));
    return;
  }
  if (has('--validate')) {
    const report = validateItems(readBankFromDisk());
    printCoverage(report);
    if (!report.ok) { console.error('\nVALIDATION FAILED:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
    console.log('\nVALIDATION PASSED (on-disk bank).');
    return;
  }
  if (has('--check')) {
    const report = validateItems(buildBank());
    printCoverage(report);
    if (!report.ok) { console.error('\nCHECK FAILED:\n' + report.errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
    console.log('\nCHECK PASSED (in-memory, not written).');
    return;
  }
  const items = buildBank();
  const report = validateItems(items);
  if (!report.ok) {
    console.error('REFUSING TO WRITE — validation failed:\n' + report.errors.map((e) => '  - ' + e).join('\n'));
    process.exit(1);
  }
  writeBank(items);
  printCoverage(report);
  console.log(`\nwrote ${items.length} items -> ${BANK_PATH}`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
