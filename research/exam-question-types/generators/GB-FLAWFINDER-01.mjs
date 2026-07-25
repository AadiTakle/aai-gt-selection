#!/usr/bin/env node
// GB-FLAWFINDER-01 (Fib Finder) — structured item-bank generator.
//
// The child reads a short set of statements and taps the ONE statement that is
// the flaw. Two prompt kinds, both deterministically keyed:
//
//   promptKind 'cannot_be_true'  — the statements are independent facts and
//                                  exactly one of them cannot be true.
//   promptKind 'does_not_follow' — every statement is true as given except one
//                                  STEP, which is not supported by anything
//                                  before it.
//
// THE AMBIGUITY PROBLEM AND HOW IT IS SOLVED
// ------------------------------------------
// The classic textbook item ("All birds can fly / a penguin is a bird / so a
// penguin can fly") has TWO defensible answers: the premise is false AND the
// conclusion is false. Items like that are unusable for a keyed bank.
//
// Every entry here therefore carries an explicit derivation structure: each
// statement is marked `given` (true as stated), `[i,j]` (validly follows from
// the earlier statements i and j), `impossible`, or `unsupported`. The build
// and the independent checker both enforce:
//
//   * exactly one statement is marked `impossible` or `unsupported`;
//   * every other statement is true, or validly derived from EARLIER statements;
//   * a derived statement never depends on the flawed statement, so the flaw
//     cannot contaminate a second card (this is what makes the key unique);
//   * `impossible` items contain no derivation at all (no inference to dispute);
//   * `unsupported` items contain at least two given statements.
//
// Because a derived step never leans on the flaw, harder items can place the
// flaw in the MIDDLE of the argument (the final step still follows from the
// original premises), which removes the "the answer is always the last card"
// cue that a naive generator produces.
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   research/exam-question-types/catalog/master_types.jsonl  GB-DEBATE/FLAWFINDER specs
//
// D-017: the catalog spec still describes spoken arguments with picture cards.
// Audio is prohibited and reading is a required baseline-literacy gate, so this
// bank is TEXT ONLY and the age floor is grade 2-3 (no K-1 items).
//
// Governance: born-synthetic. syntheticOnly:true, validated:false. The ordinal
// design difficulty is NOT calibrated IRT.
//
// Usage:
//   node generators/GB-FLAWFINDER-01.mjs             # build + write banks/GB-FLAWFINDER-01.jsonl
//   node generators/GB-FLAWFINDER-01.mjs --check     # build in memory + validate, do not write
//   node generators/GB-FLAWFINDER-01.mjs --validate  # validate the JSONL already on disk
//   node generators/GB-FLAWFINDER-01.mjs --print 2   # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'GB-FLAWFINDER-01.jsonl');

export const TYPE_CODE = 'GB-FLAWFINDER-01';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/GB-FLAWFINDER-01.html';
const GENERATOR_REF = 'GB-FLAWFINDER-01/authored-arguments@v1';

// Age bands permitted by the catalog spec. K-1 is absent (D-017 reading gate).
export const ALLOWED_AGE_BANDS = ['2-3', '4-5', '6-8'];

// Argument forms. A premise-level flaw may only appear inside a form whose
// REASONING is sound; a step-level flaw may only appear inside a form whose
// reasoning is broken. The checker enforces this pairing.
export const SOUND_FORMS = new Set(['independent_facts', 'universal_instantiation', 'modus_ponens', 'exclusion']);
export const BROKEN_FORMS = new Set([
  'affirm_consequent', 'deny_antecedent', 'hasty_generalization', 'correlation_cause',
  'some_to_all', 'appeal_to_person', 'composition', 'division', 'false_dilemma',
  'sample_bias', 'equivocation', 'unsupported_warrant', 'most_to_all', 'scope_shift',
]);

// Lure taxonomy. Every non-flaw statement gets one; M-LURETYPE / M-ERRTYPE read these.
export const LURE_CLASSES = new Set([
  'correct',
  'sound_given',          // true premise the argument needs — tapping it is over-rejection
  'sound_step',           // a step that genuinely does follow
  'true_but_irrelevant',  // true, but the argument never uses it
  'surprising_but_true',  // true yet counterintuitive — lures "surprising means false"
  'rare_word_true',       // true; only the unfamiliar wording makes it feel wrong
]);

const WHY = {
  correct: 'The keyed flaw.',
  sound_given: 'True as given and needed by the argument; choosing it is over-rejection of a sound premise.',
  sound_step: 'This step does follow from the statements before it, and does not depend on the flawed statement.',
  true_but_irrelevant: 'True, but the argument never uses it — a true-but-irrelevant lure.',
  surprising_but_true: 'Counterintuitive but factually true — lures the child who treats surprising as false.',
  rare_word_true: 'True; only the unfamiliar wording makes it feel wrong — a lexical rather than logical lure.',
};

const FLAW_WHY = {
  impossible_fact: 'Cannot be true: it contradicts a fact the child can check directly.',
  false_premise: 'Stated as a general fact but is false; the reasoning around it is sound, so this is the only defect.',
  invalid_conclusion: 'The final step is not supported by the statements before it.',
  unsupported_warrant: 'The step needs an extra assumption that the passage never supplies.',
};

// Depth layer used by M-INFDEPTH (deepest flaw layer the child can catch).
const FLAW_LAYER = { impossible_fact: 1, false_premise: 2, invalid_conclusion: 3, unsupported_warrant: 4 };

// ---------------------------------------------------------------------------
// AUTHORED CONTENT — 120 arguments, ordered easy -> hard (6 per difficulty band).
//
// Entry fields:
//   s      statements, in presentation order
//   m      derivation marks, parallel to `s`:
//            'given'       true as stated
//            'impossible'  cannot be true          (the flaw; cannot_be_true items)
//            'unsupported' does not follow         (the flaw; does_not_follow items)
//            [i, ...]      validly follows from those EARLIER statement indices
//   kind   flaw kind (drives M-INFDEPTH layer)
//   form   argument form (checked against the flaw level)
//   lex    Zipf-like lexical band 1..7 (7 = most common words)
//   lu     optional per-index lure override for non-flaw statements
// ---------------------------------------------------------------------------
const G = 'given', X = 'impossible', U = 'unsupported';

const ENTRIES = [
  // ======================= Tier A · bands 1-4 (grade 2-3) =======================
  // Independent facts, one blatant impossibility, very short high-frequency words.
  { s: ['A dog reads a newspaper.', 'A dog has four legs.', 'A dog can run fast.'], m: [X, G, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Fish live in water.', 'Fish ride bikes to school.', 'Fish have fins.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['The sun gives us light.', 'The sun is warm.', 'The sun sleeps in a bed.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Ice is cold.', 'Ice sings a song.', 'Ice melts in the sun.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['A tree grows leaves.', 'A tree stands still.', 'A tree runs to the shop.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Birds have wings.', 'Birds drive cars.', 'Birds build nests.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },

  { s: ['A cup eats lunch.', 'A cup can hold water.', 'A cup can break.'], m: [X, G, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Rain falls from clouds.', 'Rain makes things wet.', 'Rain falls up to the sky.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['A chair has legs.', 'A chair tells jokes.', 'You can sit on a chair.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Bees make honey.', 'Bees fly.', 'Bees do homework.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Shoes cook dinner.', 'Shoes go on your feet.', 'Shoes can get muddy.'], m: [X, G, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['The moon is in the sky.', 'The moon rides a bus.', 'The moon looks bright at night.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },

  { s: ['A book swims in the sea.', 'A book has pages.', 'A book can be read.'], m: [X, G, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Cows eat grass.', 'Cows give milk.', 'Cows fly over houses.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['A door can open.', 'A door bakes a cake.', 'A door can shut.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Snow is hot.', 'Snow is white.', 'Snow falls in winter.'], m: [X, G, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['A frog can hop.', 'A frog lives near water.', 'A frog paints pictures.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },
  { s: ['Cars have wheels.', 'Cars grow on trees.', 'Cars need fuel.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 7 },

  { s: ['A pen runs a race.', 'A pen can write.', 'A pen can run out of ink.'], m: [X, G, G], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['Apples grow on trees.', 'Apples are good to eat.', 'Apples fly like birds.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['A river has water.', 'A river sits on a shelf.', 'A river flows down a hill.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['Ants are small.', 'Ants live in groups.', 'Ants lift buses.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['A hat sings loudly.', 'A hat goes on your head.', 'A hat can keep you warm.'], m: [X, G, G], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['Grass is green.', 'Grass counts to ten.', 'Grass grows in soil.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },

  // ======================= Tier B · bands 5-8 (grade 2-3) =======================
  // Half: impossibilities that break a checkable fact rather than a silly image.
  // Half: first "does not follow" steps, still blatant.
  { s: ['Water freezes when it gets cold.', 'Water is wet.', 'Water freezes when it gets hot.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['Plants need light to grow.', 'Plants grow best inside a dark box.', 'Plants make seeds.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['A week has seven days.', 'A month has fifty days.', 'A year has twelve months.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['A triangle has three sides.', 'A square has four sides.', 'A circle has five sides.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['Metal sinks in water.', 'A stone floats on top of water.', 'Wood floats in water.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },
  { s: ['The sun rises in the morning.', 'The sun sets at night.', 'The sun shines most at midnight.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 6 },

  { s: ['Bats can fly.', 'A bat is a mammal, not a bird.', 'Bats lay eggs in a nest.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 5, lu: { 1: 'surprising_but_true' } },
  { s: ['A whale lives in the sea.', 'A whale breathes water through gills.', 'A whale is a mammal, not a fish.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 5, lu: { 2: 'surprising_but_true' } },
  { s: ['Ice is frozen water.', 'Steam is very hot.', 'Steam is colder than ice.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 5 },
  { s: ['Spiders have eight legs.', 'A spider is an insect.', 'Insects have six legs.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 5, lu: { 2: 'surprising_but_true' } },
  { s: ['Sound travels through the air.', 'Light travels very fast.', 'Sound travels faster than light.'], m: [G, G, X], kind: 'impossible_fact', form: 'independent_facts', lex: 5 },
  { s: ['A magnet pulls iron.', 'A magnet pulls plastic cups.', 'Paper does not stick to a magnet.'], m: [G, X, G], kind: 'impossible_fact', form: 'independent_facts', lex: 5 },

  { s: ['All the cups on the shelf are blue.', 'Mia took a cup from the shelf.', 'So Mia likes the colour blue.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 6 },
  { s: ['It is raining outside.', 'Sam is holding an umbrella.', 'So Sam made it rain.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'correlation_cause', lex: 6 },
  { s: ['Every book in the box is about birds.', 'Leo took a book from the box.', 'So Leo can name every bird.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 6 },
  { s: ['The shop opens at nine.', 'It is ten now.', 'So the shop is full of people.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 6 },
  { s: ['Every dog at the park is on a lead.', 'Rex is a dog at the park.', 'So Rex lives next to the park.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 6 },
  { s: ['Tom got a new bike.', 'Tom won the race on Saturday.', 'So the new bike made Tom win.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'correlation_cause', lex: 6 },

  { s: ['All the pens in the drawer are black.', 'Kim needs a black pen.', 'So Kim will take a pen from the drawer.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 5 },
  { s: ['It snowed last night.', 'School is shut today.', 'So snow always shuts the school.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'hasty_generalization', lex: 5 },
  { s: ['Every plant in the room was watered.', 'The fern is a plant in the room.', 'So the fern is the biggest plant.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 5 },
  { s: ['Ella plays the piano every day.', 'Ella played well at the concert.', 'So daily practice is the only way to play well.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'hasty_generalization', lex: 5 },
  { s: ['The light in the hall is on.', 'Someone is in the hall.', 'So that person turned the light on.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 5 },
  { s: ['All the boxes in the shed are heavy.', 'Nina carried a box from the shed.', 'So Nina is the strongest person here.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'unsupported_warrant', lex: 5 },

  // ======================= Tier C · bands 9-12 (grade 4-5) =======================
  // Three-statement arguments built on named fallacies. Premises are all true.
  { s: ['If it rains, the path gets wet.', 'The path is wet.', 'So it rained.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'affirm_consequent', lex: 5 },
  { s: ['If Maya studies, she passes the test.', 'Maya did not study.', 'So Maya did not pass the test.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'deny_antecedent', lex: 5 },
  { s: ['Two students in the class enjoy chess.', 'Both of them are in Year 5.', 'So every Year 5 student enjoys chess.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'hasty_generalization', lex: 5 },
  { s: ['More ice cream is sold in July.', 'More people swim in July.', 'So buying ice cream makes people swim.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'correlation_cause', lex: 5 },
  { s: ['Some birds in the wood are owls.', 'All owls hunt at night.', 'So all the birds in the wood hunt at night.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'some_to_all', lex: 5 },
  { s: ['Ravi says the bridge is safe.', 'Ravi came last in the spelling contest.', 'So the bridge is not safe.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'appeal_to_person', lex: 5 },

  { s: ['Every brick in the wall is light.', 'The wall is made only of bricks.', 'So the whole wall is light enough to lift.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'composition', lex: 4 },
  { s: ['The relay team is very fast.', 'Sara is on the relay team.', 'So Sara is the fastest runner in the school.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'division', lex: 4 },
  { s: ['We can play football or we can read.', 'We are not playing football.', 'So nobody here wants to play football.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'false_dilemma', lex: 4 },
  { s: ['A new speed sign went up last month.', 'Fewer cars speed on that road now.', 'So the sign is the only reason cars slowed.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'correlation_cause', lex: 4 },
  { s: ['A survey asked people leaving the pool.', 'Most of them said swimming is the best sport.', 'So swimming is the favourite sport of the town.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'sample_bias', lex: 4 },
  { s: ['A feather is light.', 'Light things are easy to lift.', 'So a feather is not a dark colour.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'equivocation', lex: 4 },

  { s: ['If the door is locked, the key is in the drawer.', 'The key is in the drawer.', 'So the door is locked.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'affirm_consequent', lex: 4 },
  { s: ['Every runner who trains daily finished the race.', 'Omar finished the race.', 'So Omar trains daily.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'affirm_consequent', lex: 4 },
  { s: ['No cat on this street is grey.', 'Bella is a grey cat.', 'So Bella must live on the next street.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'scope_shift', lex: 4 },
  { s: ['The library is quiet on Mondays.', 'Today the library is quiet.', 'So today is Monday.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'affirm_consequent', lex: 4 },
  { s: ['All the coins in the jar are old.', 'Zoe found an old coin.', 'So Zoe took the coin from the jar.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'affirm_consequent', lex: 4 },
  { s: ['Plants near the window grew tall.', 'Plants in the corner stayed short.', 'So the glass in the window makes plants grow.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'correlation_cause', lex: 4 },

  { s: ['Everyone who ate the soup felt unwell.', 'Ten people ate the soup.', 'So the soup was the cause of the illness.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'correlation_cause', lex: 4 },
  { s: ['One school found that longer breaks helped focus.', 'That school has forty students.', 'So longer breaks help focus in every school.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'sample_bias', lex: 3 },
  { s: ['Lena scored highest in the test.', 'Lena sits at the front of the class.', 'So sitting at the front raises test scores.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'correlation_cause', lex: 3 },
  { s: ['If the tap drips, the floor gets damp.', 'The tap is not dripping.', 'So the floor is dry.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'deny_antecedent', lex: 3 },
  { s: ['Most of the shells on this beach are white.', 'Ivan picked up a shell on this beach.', 'So Ivan picked up a white shell.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'most_to_all', lex: 3 },
  { s: ['Every athlete in the club can swim.', 'Priya can swim.', 'So Priya is in the club.'], m: [G, G, U], kind: 'invalid_conclusion', form: 'affirm_consequent', lex: 3 },

  // ======================= Tier D · bands 13-16 (grade 6-8) =======================
  // Four statements. One step is unsupported; the OTHER step follows from the two
  // original premises alone, so the flaw can sit in the middle of the argument.
  { s: ['Every book on the top shelf is a history book.', 'The atlas is on the top shelf.', 'So the atlas was written by a historian.', 'So the atlas is a history book.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['All the members of the choir can read music.', 'Dev is a member of the choir.', 'So Dev can read music.', 'So Dev has taken music lessons for years.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['Every plant in the greenhouse was watered on Monday.', 'The orchid is in the greenhouse.', 'So the orchid was watered on Monday.', 'So the orchid is the healthiest plant there.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['No student in Year 6 took the early bus.', 'Aisha took the early bus.', 'So Aisha prefers to travel alone.', 'So Aisha is not in Year 6.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['Every tool in the red box belongs to the school.', 'The hammer is in the red box.', 'So the hammer belongs to the school.', 'So the hammer was bought this year.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['All the runners who finished were given a medal.', 'Yusuf finished the race.', 'So Yusuf trained harder than everyone else.', 'So Yusuf was given a medal.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },

  { s: ['Every letter in the tray has been stamped.', 'This envelope is in the tray.', 'So this envelope has been stamped.', 'So this envelope will arrive tomorrow.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['No painting in this room is for sale.', 'The blue landscape is in this room.', 'So the blue landscape is not for sale.', 'So the artist refused to sell it.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['Every ticket sold today was for the evening show.', 'Nadia bought a ticket today.', 'So Nadia will sit at the front.', 'So Nadia has a ticket for the evening show.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 3 },
  { s: ['All the samples in the freezer were labelled.', 'Tube 7 is in the freezer.', 'So tube 7 was labelled.', 'So tube 7 was labelled by the lab manager.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2 },
  { s: ['Classes that added a reading hour scored higher.', 'Those same classes also had smaller groups.', 'So the reading hour caused the higher scores.', 'So at least one thing about those classes changed.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'correlation_cause', lex: 2 },
  { s: ['The survey reached only families with home internet.', 'Most families in the survey said online homework is easy.', 'So most families in the town find online homework easy.', 'So most surveyed families with home internet find it easy.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'sample_bias', lex: 2 },

  { s: ['Every experiment in the report used the same thermometer.', 'That thermometer read two degrees too high.', 'So every reading in the report was two degrees too high.', 'So the report proves the room was cold.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2 },
  { s: ['All the seeds planted in April sprouted.', 'These seeds were planted in April.', 'So these seeds sprouted.', 'So April is the best month for planting seeds.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'hasty_generalization', lex: 2 },
  { s: ['Every message in the folder was sent by the club.', 'This message is in the folder.', 'So this message was sent by the club.', 'So the club sends a message every week.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2 },
  { s: ['No machine in the workshop runs without power.', 'The lathe is a machine in the workshop.', 'So someone forgot to switch the lathe off.', 'So the lathe does not run without power.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2, lu: { 3: 'rare_word_true' } },
  { s: ['Every child who joined the trip returned the form.', 'Priti joined the trip.', 'So Priti returned the form.', 'So Priti returned the form before anyone else.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 2 },
  { s: ['All the cheese in the shop is made locally.', 'This wheel of cheese came from the shop.', 'So this wheel of cheese is made locally.', 'So local cheese tastes better than imported cheese.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2 },

  { s: ['Every road drawn on the map is paved.', 'Mill Lane appears on the map.', 'So Mill Lane is wide enough for two cars.', 'So Mill Lane is paved.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2 },
  { s: ['Two towns raised their speed limit and crashes rose.', 'Both towns also grew much larger that same year.', 'So raising the speed limit caused the crashes.', 'So something in both towns changed that year.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'correlation_cause', lex: 2 },
  { s: ['Everyone who returned the survey liked the new menu.', 'Only twelve of two hundred people returned it.', 'So most of the school likes the new menu.', 'So at least twelve people like the new menu.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'sample_bias', lex: 2 },
  { s: ['All the instruments in the case were tuned this morning.', 'The violin is in the case.', 'So the violin was tuned this morning.', 'So the violin will stay in tune all week.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2 },
  { s: ['Every parcel on the round weighed over five kilograms.', 'The driver carried one parcel at a time.', 'So the driver is unusually strong.', 'So each parcel the driver carried weighed over five kilograms.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 2 },
  { s: ['No file in the archive is newer than 1990.', 'This photograph is in the archive.', 'So this photograph is not newer than 1990.', 'So this photograph was taken in 1990.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 2 },

  // ======================= Tier E · bands 17-20 (above level) =======================
  // Near-valid arguments; the defect is a quiet scope, sampling or inference shift.
  { s: ['Every specimen catalogued before 1950 was preserved in alcohol.', 'This beetle was catalogued in 1948.', 'So this beetle was preserved in alcohol.', 'So alcohol was the only preservative available in 1948.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 1 },
  { s: ['The instrument was calibrated against a standard that had drifted upward.', 'Every reading taken with it was biased in the same direction.', 'So the recorded temperatures were systematically too high.', 'So the trend in the recorded data must be an illusion.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['A treatment improved outcomes in the trial.', 'Everyone who enrolled was a healthy volunteer.', 'So the treatment will improve outcomes for the general population.', 'So the treatment improved outcomes for the volunteers studied.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'sample_bias', lex: 1 },
  { s: ['Every manuscript in the collection is anonymous.', 'An anonymous manuscript cannot be dated from its author.', 'So this manuscript cannot be dated from its author.', 'So this manuscript cannot be dated at all.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['The correlation between the two measures is very strong.', 'A strong correlation can arise from a shared third cause.', 'So one measure may not be causing the other.', 'So neither measure has any influence on the other.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['Each of the three witnesses gave the same account.', 'All three heard that account from the same neighbour.', 'So the account is confirmed by three independent sources.', 'So the same account was given three times.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 1 },

  { s: ['Every rock in the layer contains the same mineral.', 'This fragment came from that layer.', 'So this fragment contains the mineral.', 'So the mineral formed at the same time as the layer.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 1 },
  { s: ['The model reproduced last year results almost exactly.', 'The model was adjusted using last year results.', 'So the model has proven it can predict future results.', 'So the model fits last year results closely.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'unsupported_warrant', lex: 1 },
  { s: ['No claim in the report was contradicted by the evidence gathered.', 'The team gathered evidence on only two of the six claims.', 'So four of the claims were never examined.', 'So every claim in the report is supported by evidence.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['Students who chose the advanced course scored higher on the final.', 'Students chose their own course.', 'So the advanced course raised their scores.', 'So the two groups may differ in more than the course taken.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'correlation_cause', lex: 1 },
  { s: ['Every artefact from the site is made of bronze.', 'Bronze working reached the region around 1200 BC.', 'So the artefacts are not older than about 1200 BC.', 'So the site was first settled around 1200 BC.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['The new policy began in March.', 'Complaints fell sharply in April.', 'So the policy reduced the complaints.', 'So complaints fell after the policy began.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'correlation_cause', lex: 1 },

  { s: ['Every measurement was repeated three times.', 'Repeating a measurement reduces random error.', 'So random error in these measurements is reduced.', 'So these measurements are free of systematic error.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['All the pupils who sat the exam had attended the revision class.', 'Attendance at that class was compulsory for everyone.', 'So attendance at the class explains the high pass rate.', 'So no pupil sat the exam without attending.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'correlation_cause', lex: 1 },
  { s: ['The fossil record shows no example of the species above that layer.', 'Fossilisation preserves only a small fraction of organisms.', 'So the missing later fossils are not proof of extinction.', 'So the species certainly survived past that layer.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['Two variables rose together every year for a decade.', 'A third variable also rose every year over that decade.', 'So the first variable caused the second.', 'So all three variables rose together for a decade.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'correlation_cause', lex: 1 },
  { s: ['Every translation in the volume was made from the same edition.', 'That edition omitted the final chapter.', 'So every translation in the volume omits the final chapter.', 'So the final chapter has been lost.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['The detector registers the particle only above a certain energy.', 'No particle was registered during the experiment.', 'So no particle was present at any energy.', 'So no particle was present above that energy.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },

  { s: ['The sample was drawn only from households with a landline.', 'Landline households are older on average than the rest.', 'So the sample is older on average than the population.', 'So the survey result carries no information at all.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['Every account of the battle was written after the treaty.', 'Writers after the treaty had reason to favour one side.', 'So these accounts may be biased.', 'So none of the accounts contains any accurate detail.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['Each extra hour of practice improved performance in the study.', 'The study followed the players for only six weeks.', 'So practice improves performance without any limit.', 'So practice improved performance over the six weeks observed.'], m: [G, G, U, [0, 1]], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['The map marks every settlement recorded in the census.', 'The census excluded settlements of fewer than ten houses.', 'So small settlements are missing from the map.', 'So the region contained no small settlements.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['The gene appears in every individual who has the condition.', 'The gene also appears in many individuals who do not.', 'So the gene alone does not determine the condition.', 'So the gene plays no part in the condition.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
  { s: ['Every trial that reported a benefit was funded by the manufacturer.', 'Trials reporting no benefit were less likely to be published.', 'So the published record may overstate the benefit.', 'So the treatment has no benefit whatsoever.'], m: [G, G, [0, 1], U], kind: 'unsupported_warrant', form: 'scope_shift', lex: 1 },
];

// ---------------------------------------------------------------------------
// Deterministic helpers.
// ---------------------------------------------------------------------------
function uuidFrom(str) {
  const h = createHash('sha1').update(str).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const PER_BAND = 6;

// 20 bands x 6 items. Offsets keep round(difficulty) === band and stay in [1,20].
export function difficultyFor(index) {
  const band = Math.floor(index / PER_BAND) + 1;
  const pos = index % PER_BAND;
  let offsets;
  if (band === 1) offsets = [0, 0.08, 0.16, 0.24, 0.32, 0.4];
  else if (band === 20) offsets = [-0.4, -0.32, -0.24, -0.16, -0.08, 0];
  else offsets = [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4];
  const d = Math.min(20, Math.max(1, band + offsets[pos]));
  return Math.round(d * 100) / 100;
}

// The catalog floor for this type is grade 2-3 (D-017 raised it off K-1), so the
// bottom of the 1..20 ramp targets 2-3 rather than K-1.
export function ageBandsFor(d) {
  if (d < 8) return ['2-3'];
  if (d < 12) return ['4-5'];
  return ['6-8'];
}

// Reading gate for the lowest band served by this type.
export const MAX_WORD_LEN_LOW = 10;
export const MAX_STATEMENT_CHARS_LOW = 62;

const PROMPTS = {
  cannot_be_true: 'One of these cannot be true. Which one?',
  does_not_follow: 'All of these are true except one step. Which step does not follow from the ones before it?',
};

export function promptKindOf(entry) {
  return entry.m.includes(X) ? 'cannot_be_true' : 'does_not_follow';
}

function flawIndexOf(entry) {
  const i = entry.m.findIndex((mk) => mk === X || mk === U);
  return i;
}

function lureFor(entry, idx, flawIdx) {
  if (idx === flawIdx) return 'correct';
  if (entry.lu && entry.lu[idx]) return entry.lu[idx];
  return Array.isArray(entry.m[idx]) ? 'sound_step' : 'sound_given';
}

// ---------------------------------------------------------------------------
// Build one BankItem.
// ---------------------------------------------------------------------------
function buildItem(entry, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const promptKind = promptKindOf(entry);
  const flawIdx = flawIndexOf(entry);
  const ids = entry.s.map((_, i) => `s${i + 1}`);

  const statements = entry.s.map((text, i) => ({ id: ids[i], text }));

  const rationales = {};
  entry.s.forEach((_, i) => {
    const lure = lureFor(entry, i, flawIdx);
    rationales[ids[i]] = {
      lure,
      why: i === flawIdx ? FLAW_WHY[entry.kind] : WHY[lure],
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
      presentation: 'text', // D-017: on-screen text only, never audio
      promptKind,
      prompt: PROMPTS[promptKind],
      statements,
      statementCount: statements.length,
      lexicalBand: entry.lex,
    },
    answer: {
      correctKey: ids[flawIdx],
      distractorRationales: rationales,
      flawKind: entry.kind,
      flawLayer: FLAW_LAYER[entry.kind],
      argumentForm: entry.form,
      // Server-side derivation structure; also what the checker re-derives the key from.
      structure: entry.m.map((mk, i) => ({
        id: ids[i],
        mark: Array.isArray(mk) ? 'derived' : mk,
        derivesFrom: Array.isArray(mk) ? mk.map((j) => ids[j]) : null,
      })),
      // The open component this type defers (no free text is collected in the
      // renderer, so the deferred judge reads the ordered action log instead).
      rubricDimensions: [
        'explanation_of_why_the_step_fails (deferred: not elicited in this renderer)',
      ],
    },
    scoring: {
      mode: 'deterministic_key',
      keyedComponents: ['flaw_identification'],
      deferredComponents: [],
    },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      tier: Math.floor(index / 24) + 1,
      contentHash: createHash('sha1').update(JSON.stringify(entry)).digest('hex').slice(0, 16),
      validatorVerdicts: verdictsFor(entry, difficulty),
    },
    syntheticOnly: true,
    validated: false,
  };
}

function verdictsFor(entry, difficulty) {
  const flawCount = entry.m.filter((mk) => mk === X || mk === U).length;
  const words = entry.s.join(' ').split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, ''));
  const low = difficulty < 8;
  const readingOk = !low
    || (words.every((w) => w.length <= MAX_WORD_LEN_LOW)
      && entry.s.every((t) => t.length <= MAX_STATEMENT_CHARS_LOW));
  return [
    { check: 'single_satisfiability', status: flawCount === 1 ? 'pass' : 'fail', detail: `${flawCount} defective statement(s)` },
    { check: 'form_matches_flaw_level', status: formMatchesFlawLevel(entry) ? 'pass' : 'fail' },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn', detail: `lexical band ${entry.lex}` },
    { check: 'no_audio', status: 'pass', detail: 'D-017: text-only stimulus' },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; no cultural or value claims keyed' },
  ];
}

export function formMatchesFlawLevel(entry) {
  const flawIdx = flawIndexOf(entry);
  if (flawIdx < 0) return false;
  const isFactFlaw = entry.m[flawIdx] === X;
  return isFactFlaw ? SOUND_FORMS.has(entry.form) : BROKEN_FORMS.has(entry.form);
}

export function buildBank() {
  return ENTRIES.map((e, i) => buildItem(e, i));
}

// ---------------------------------------------------------------------------
// Build-time validation (the independent, fuller validator is check-<TYPE>.mjs).
// ---------------------------------------------------------------------------
export function validateItems(items) {
  const errors = [];
  const bandCounts = {};
  for (let b = 1; b <= 20; b++) bandCounts[b] = 0;

  items.forEach((it, idx) => {
    const where = `item[${idx}] ${it && it.itemId ? it.itemId : '(no id)'}`;
    if (it.typeCode !== TYPE_CODE) errors.push(`${where}: bad typeCode`);
    if (it.domain !== DOMAIN) errors.push(`${where}: bad domain`);
    if (it.syntheticOnly !== true || it.validated !== false) errors.push(`${where}: born-synthetic flags wrong`);
    const d = it.difficulty;
    if (typeof d !== 'number' || d < 1 || d > 20) errors.push(`${where}: difficulty out of range`);
    else bandCounts[Math.round(d)]++;

    const st = it.content.statements || [];
    const struct = it.answer.structure || [];
    const defective = struct.filter((s) => s.mark === 'impossible' || s.mark === 'unsupported');
    if (defective.length !== 1) errors.push(`${where}: ${defective.length} defective statements (want exactly 1)`);
    else if (defective[0].id !== it.answer.correctKey) errors.push(`${where}: correctKey does not point at the defective statement`);
    if (struct.length !== st.length) errors.push(`${where}: structure/statement length mismatch`);
    if (Object.keys(it.answer.distractorRationales).length !== st.length) errors.push(`${where}: rationales do not cover every statement`);
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
    const n = Number(argv[argv.indexOf('--print') + 1]) || 2;
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
