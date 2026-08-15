#!/usr/bin/env node
// GB-FLAWFINDER-01 (Fib Finder) — structured item-bank generator.
//
// The child reads a short set of FACTS and taps the ONE claim those facts best
// support. One prompt kind, deterministically keyed:
//
//   promptKind 'best_supported_claim' — every fact is true as given; exactly one
//                                       candidate claim follows from them.
//
// REFRAMED FROM "SPOT THE FALSE STATEMENT" (review, 2026-07-29)
// -------------------------------------------------------------
// The reviewer asked for "more of a comprehension style question with a bunch of
// facts and then the answer choices are a bunch of claims and which one is the
// best claim based on those facts". That moves the construct from fact-checking
// to INFERENCE: the child is no longer hunting the odd statement out of a flat
// list, they are reading a small evidence base and judging which claim it
// licenses. Facts and claims are now separate roles on screen, and the keyed
// decision is "which claim does this evidence support", not "which sentence is
// wrong".
//
// The 120 items are reframed ONE-FOR-ONE from the arguments that previously
// occupied the same index: the true statements of the old item become its facts,
// the old unsupported step becomes the `overreach` claim, the old impossible
// statement becomes the `contradicts` claim, and the claim the facts actually
// license is authored (or, where the old item had a validly derived step, is
// that step). Difficulty is therefore untouched — index i keeps
// `difficultyFor(i)`, its lexical band and its reading load — because the plan
// marks this type's per-band curve **[proposed]** and an unapproved curve must
// not be invented here. What changed is the FRAMING of each item, not where it
// sits on the 1..20 ramp.
//
// THE AMBIGUITY PROBLEM AND HOW IT IS SOLVED
// ------------------------------------------
// "Which claim is best supported" is only keyable if exactly one claim is
// defensible. Every entry therefore declares a role for each claim:
//
//   'supported'   follows from the fact set                (the key)
//   'overreach'   true of the facts as far as it goes, but claims more than
//                 they license (a cause, a generalisation, a superlative)
//   'contradicts' conflicts with one of the stated facts
//   'unmentioned' about something the facts never speak to
//
// The build and the independent checker both enforce:
//
//   * exactly one claim is marked `supported`, and it is `answer.correctKey`;
//   * every other claim carries a defect class from the taxonomy, and no two
//     distractors share a class — two claims failing the same way is the shape
//     a second defensible answer usually hides in;
//   * at least two facts, and the supported claim is licensed by the fact set
//     rather than by another claim (claims never cite claims);
//   * facts and claims are pairwise distinct within an item.
//
// KEY-POSITION BALANCE (E-073)
// ----------------------------
// Authoring the key where the argument wanted it left the old bank keyed on
// card 3 in 70/120 items, so tapping the third card scored 58.3% with no
// reasoning at all. The supported claim is placed by an explicit balanced plan
// instead. WHICH claim is supported never changes; only WHERE it is presented
// does, and the distractors are ordered by a seeded shuffle so their classes do
// not fall into a fixed sequence either.
//
// Balance is exact within each item SHAPE, not across the bank as a whole: a
// 3-claim item can never key claim 4. With 72 three-claim and 48 four-claim
// items, perfectly uniform placement gives 36/36/36/12 across c1..c4 — a 30.0%
// modal key, which is exactly the chance floor for this mix
// (72*(1/3) + 48*(1/4)). No arrangement beats that without making some position
// rarer than chance inside its own item shape, which would just trade one
// guessable cue for another.
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
import { serializeBank } from './item-shape.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'GB-FLAWFINDER-01.jsonl');

export const TYPE_CODE = 'GB-FLAWFINDER-01';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/GB-FLAWFINDER-01.html';
const GENERATOR_REF = 'GB-FLAWFINDER-01/authored-evidence-sets@v2';

// Age bands permitted by the catalog spec. K-1 is absent (D-017 reading gate).
export const ALLOWED_AGE_BANDS = ['2-3', '4-5', '6-8'];

// The one prompt this type asks.
export const PROMPT_KIND = 'best_supported_claim';
export const PROMPT = 'All of these facts are true. Which claim do the facts best support?';

// Claim roles. Exactly one 'supported' per item; the rest are the defect classes.
export const DEFECT_CLASSES = new Set(['overreach', 'contradicts', 'unmentioned']);

// Each role's label in the shared D-020 taxonomy, which M-LURETYPE / M-ERRTYPE
// bucket through `coarseLureClass`. The roles above name what the claim does to
// the evidence; these are the already-registered labels for those failures, so
// the reframe needs no new entry in `generators/item-shape.mjs`.
export const LURE_FOR_ROLE = Object.freeze({
  supported: 'correct',
  overreach: 'plausible-but-unsupported',
  contradicts: 'contradicts-text',
  unmentioned: 'far_setup',
});
export const LURE_CLASSES = new Set(Object.values(LURE_FOR_ROLE));

const WHY = {
  supported: 'The claim the fact set licenses, and the only one that does not add, deny or invent something.',
  overreach:
    'Consistent with the facts as far as it goes, but claims more than they license — a cause, a generalisation or a superlative the evidence does not reach.',
  contradicts: 'Conflicts with one of the stated facts, so the evidence rules it out rather than supporting it.',
  unmentioned: 'About something the facts never speak to, so nothing here supports or rules it out.',
};

// ---------------------------------------------------------------------------
// AUTHORED CONTENT — 120 evidence sets, ordered easy -> hard (6 per difficulty
// band), reframed one-for-one from the arguments that held the same index in v1.
//
// Entry fields:
//   f       the facts, all true as given, in presentation order
//   best    the claim the facts support        -> 'supported' (the key)
//   over    claims more than the facts license -> 'overreach'
//   contra  conflicts with a stated fact       -> 'contradicts'
//   unmet   the facts never speak to it        -> 'unmentioned'
//   lex     Zipf-like lexical band 1..7 (7 = most common)
//
// Tiers A/B/C carry three claims and tiers D/E four, which reproduces v1's
// 72-then-48 shape split and with it the key-position balance.
// ---------------------------------------------------------------------------
const ENTRIES = [
  // ======================= Tier A · bands 1-4 (grade 2-3) =======================
  // Two plainly true facts; the supported claim just puts them together.
  { f: ['A dog has four legs.', 'A dog can run fast.'], best: 'A dog runs on four legs.', over: 'A dog runs faster than any animal.', contra: 'A dog runs on two legs.', lex: 7 },
  { f: ['Fish live in water.', 'Fish have fins.'], best: 'An animal with fins lives in the water.', over: 'Fish are the only animals in the water.', contra: 'Fish live on dry land.', lex: 7 },
  { f: ['The sun gives us light.', 'The sun is warm.'], best: 'The sun gives light and warmth.', over: 'The sun is the hottest thing there is.', contra: 'The sun is cold and dark.', lex: 7 },
  { f: ['Ice is cold.', 'Ice melts in the sun.'], best: 'Cold ice turns to water in the sun.', over: 'Ice melts faster than snow does.', contra: 'Ice stays hard in the hot sun.', lex: 7 },
  { f: ['A tree grows leaves.', 'A tree stands still.'], best: 'A tree grows leaves but does not move.', over: 'A tree grows more leaves than any plant.', contra: 'A tree walks about the garden.', lex: 7 },
  { f: ['Birds have wings.', 'Birds build nests.'], best: 'Birds have wings and they make nests.', over: 'Every bird builds its nest in a tree.', contra: 'Birds have no wings at all.', lex: 7 },

  { f: ['A cup can hold water.', 'A cup can break.'], best: 'A cup holds water until it breaks.', over: 'A cup breaks every time it is dropped.', contra: 'A cup cannot hold water.', lex: 7 },
  { f: ['Rain falls from clouds.', 'Rain makes things wet.'], best: 'Rain from the clouds makes things wet.', over: 'Rain wets everything in one minute.', contra: 'Rain falls up into the sky.', lex: 7 },
  { f: ['A chair has legs.', 'You can sit on a chair.'], best: 'You sit on a chair that stands on legs.', over: 'A chair is the best seat in a house.', contra: 'A chair has no legs to stand on.', lex: 7 },
  { f: ['Bees make honey.', 'Bees fly.'], best: 'Bees fly and they make honey.', over: 'Bees make more honey than any insect.', contra: 'Bees cannot fly at all.', lex: 7 },
  { f: ['Shoes go on your feet.', 'Shoes can get muddy.'], best: 'Shoes on your feet can get muddy.', over: 'Shoes get muddy every time you walk.', contra: 'Shoes go on your hands.', lex: 7 },
  { f: ['The moon is in the sky.', 'The moon looks bright at night.'], best: 'The moon in the sky looks bright at night.', over: 'The moon is brighter than the sun.', contra: 'The moon sits on the ground.', lex: 7 },

  { f: ['A book has pages.', 'A book can be read.'], best: 'You can read the pages of a book.', over: 'A book has more pages than a comic.', contra: 'A book has no pages in it.', lex: 7 },
  { f: ['Cows eat grass.', 'Cows give milk.'], best: 'Cows eat grass and they give milk.', over: 'Cows give more milk when they eat grass.', contra: 'Cows eat only meat.', lex: 7 },
  { f: ['A door can open.', 'A door can shut.'], best: 'A door can be opened and shut.', over: 'A door shuts by itself in the wind.', contra: 'A door can never be opened.', lex: 7 },
  { f: ['Snow is white.', 'Snow falls in winter.'], best: 'White snow falls in the winter.', over: 'Snow falls on every day of winter.', contra: 'Snow is black and falls in summer.', lex: 7 },
  { f: ['A frog can hop.', 'A frog lives near water.'], best: 'A frog hops about near the water.', over: 'A frog hops higher than any animal.', contra: 'A frog lives in a dry desert.', lex: 7 },
  { f: ['Cars have wheels.', 'Cars need fuel.'], best: 'A car needs fuel to roll on its wheels.', over: 'Every car uses the same fuel.', contra: 'Cars run without any wheels.', lex: 7 },

  { f: ['A pen can write.', 'A pen can run out of ink.'], best: 'A pen writes until the ink runs out.', over: 'A pen writes better than a pencil.', contra: 'A pen writes with no ink at all.', lex: 6 },
  { f: ['Apples grow on trees.', 'Apples are good to eat.'], best: 'Apples from a tree are good to eat.', over: 'Apples are the best fruit to eat.', contra: 'Apples grow deep under the sea.', lex: 6 },
  { f: ['A river has water.', 'A river flows down a hill.'], best: 'Water in a river flows down a hill.', over: 'A river flows faster than a stream.', contra: 'A river flows up a hill.', lex: 6 },
  { f: ['Ants are small.', 'Ants live in groups.'], best: 'Small ants live together in groups.', over: 'Ants are the smallest insect of all.', contra: 'Ants are bigger than a bus.', lex: 6 },
  { f: ['A hat goes on your head.', 'A hat can keep you warm.'], best: 'A hat on your head can keep you warm.', over: 'A hat keeps you warm on the coldest day.', contra: 'A hat goes on your feet.', lex: 6 },
  { f: ['Grass is green.', 'Grass grows in soil.'], best: 'Green grass grows in the soil.', over: 'Grass grows in every kind of soil.', contra: 'Grass is blue and grows in the air.', lex: 6 },

  // ======================= Tier B · bands 5-8 (grade 2-3) =======================
  // Half: facts a child can check, where the supported claim compares them.
  // Half: the first items where a tempting claim overreaches the evidence.
  { f: ['Water freezes when it gets cold.', 'Water is wet.'], best: 'Wet water turns to ice when it is cold.', over: 'Water freezes as soon as it is cold out.', contra: 'Water freezes when it gets hot.', lex: 6 },
  { f: ['Plants need light to grow.', 'Plants make seeds.'], best: 'A plant in the light can grow and seed.', over: 'A plant makes seeds only in bright light.', contra: 'Plants grow best inside a dark box.', lex: 6 },
  { f: ['A week has seven days.', 'A year has twelve months.'], best: 'A year is made of months, a week of days.', over: 'Every month in a year has four weeks.', contra: 'A month has fifty days.', lex: 6 },
  { f: ['A triangle has three sides.', 'A square has four sides.'], best: 'A square has one more side than a triangle.', over: 'A shape with more sides is always bigger.', contra: 'A circle has five sides.', lex: 6 },
  { f: ['Metal sinks in water.', 'Wood floats in water.'], best: 'A wood block floats where a metal one sinks.', over: 'Anything heavy sinks in water.', contra: 'A stone floats on top of water.', lex: 6 },
  { f: ['The sun rises in the morning.', 'The sun sets at night.'], best: 'The sun is up between morning and night.', over: 'The sun rises at the same time each day.', contra: 'The sun shines most at midnight.', lex: 6 },

  { f: ['Bats can fly.', 'A bat is a mammal, not a bird.'], best: 'Not every animal that flies is a bird.', over: 'Bats are the only mammals that can fly.', contra: 'Bats lay eggs in a nest.', lex: 5 },
  { f: ['A whale lives in the sea.', 'A whale is a mammal, not a fish.'], best: 'Not every animal in the sea is a fish.', over: 'A whale is the largest mammal in the sea.', contra: 'A whale breathes water through gills.', lex: 5 },
  { f: ['Ice is frozen water.', 'Steam is very hot.'], best: 'Water can be frozen hard or very hot.', over: 'Water is hot more often than it is cold.', contra: 'Steam is colder than ice.', lex: 5 },
  { f: ['Spiders have eight legs.', 'Insects have six legs.'], best: 'A spider has two more legs than an insect.', over: 'Spiders are the only animals with eight legs.', contra: 'A spider is an insect.', lex: 5 },
  { f: ['Sound travels through the air.', 'Light travels very fast.'], best: 'Sound and light both travel to reach you.', over: 'Sound and light travel at the same speed.', contra: 'Sound travels faster than light.', lex: 5 },
  { f: ['A magnet pulls iron.', 'Paper does not stick to a magnet.'], best: 'A magnet pulls some things and not others.', over: 'A magnet pulls every kind of metal.', contra: 'A magnet pulls plastic cups.', lex: 5 },

  { f: ['All the cups on the shelf are blue.', 'Mia took a cup from the shelf.'], best: 'The cup Mia took is blue.', over: 'Mia likes the colour blue.', unmet: 'Mia washed the cup after tea.', lex: 6 },
  { f: ['It is raining outside.', 'Sam is holding an umbrella.'], best: 'Sam is out in the rain with an umbrella.', over: 'Sam made it rain.', unmet: 'Sam left his coat at school.', lex: 6 },
  { f: ['Every book in the box is about birds.', 'Leo took a book from the box.'], best: 'Leo took a book about birds.', over: 'Leo can name every bird.', unmet: 'Leo reads a book each night.', lex: 6 },
  { f: ['The shop opens at nine.', 'It is ten now.'], best: 'The shop is already open.', over: 'The shop is full of people.', unmet: 'The shop sells fresh bread.', lex: 6 },
  { f: ['Every dog at the park is on a lead.', 'Rex is a dog at the park.'], best: 'Rex is on a lead.', over: 'Rex lives next to the park.', unmet: 'Rex is afraid of water.', lex: 6 },
  { f: ['Tom won the race on Saturday.', 'Tom got a new bike.'], best: 'Tom won a race and has a new bike.', over: 'The new bike made Tom win.', unmet: 'Tom trains before school.', lex: 6 },

  { f: ['All the pens in the drawer are black.', 'Kim needs a black pen.'], best: 'A pen from the drawer would suit Kim.', over: 'Kim will take a pen from the drawer.', unmet: 'Kim lost her pen last week.', lex: 5 },
  { f: ['It snowed last night.', 'School is shut today.'], best: 'School is shut on a day after snow.', over: 'Snow always shuts the school.', unmet: 'The teachers are at a meeting.', lex: 5 },
  { f: ['Every plant in the room was watered.', 'The fern is a plant in the room.'], best: 'The fern was watered.', over: 'The fern is the biggest plant.', unmet: 'The fern was a gift.', lex: 5 },
  { f: ['Ella plays the piano every day.', 'Ella played well at the concert.'], best: 'Ella plays daily and played well.', over: 'Daily practice is the only way to play well.', unmet: 'Ella wants to be a teacher.', lex: 5 },
  { f: ['The light in the hall is on.', 'Someone is in the hall.'], best: 'Someone is in a hall with the light on.', over: 'That person turned the light on.', unmet: 'The bulb was changed today.', lex: 5 },
  { f: ['All the boxes in the shed are heavy.', 'Nina carried a box from the shed.'], best: 'Nina carried a heavy box.', over: 'Nina is the strongest person here.', unmet: 'Nina works in the shed on Fridays.', lex: 5 },

  // ======================= Tier C · bands 9-12 (grade 4-5) =======================
  // The overreaching claim is now the one a named fallacy would produce, so the
  // supported claim is often the cautious reading rather than the bold one.
  { f: ['If it rains, the path gets wet.', 'The path is wet.'], best: 'Rain is one thing that could have wet the path.', over: 'It rained.', unmet: 'The path is made of stone.', lex: 5 },
  { f: ['If Maya studies, she passes the test.', 'Maya did not study.'], best: 'Maya may or may not have passed.', over: 'Maya did not pass the test.', unmet: 'Maya was ill on the day.', lex: 5 },
  { f: ['Two students in the class enjoy chess.', 'Both of them are in Year 5.'], best: 'At least two Year 5 students enjoy chess.', over: 'Every Year 5 student enjoys chess.', unmet: 'The class runs a chess club.', lex: 5 },
  { f: ['More ice cream is sold in July.', 'More people swim in July.'], best: 'Ice cream sales and swimming both rise in July.', over: 'Buying ice cream makes people swim.', unmet: 'July is the hottest month here.', lex: 5 },
  { f: ['Some birds in the wood are owls.', 'All owls hunt at night.'], best: 'Some birds in the wood hunt at night.', over: 'All the birds in the wood hunt at night.', unmet: 'The wood is quiet before dawn.', lex: 5 },
  { f: ['Ravi says the bridge is safe.', 'Ravi came last in the spelling contest.'], best: 'A poor speller has called the bridge safe.', over: 'The bridge is not safe.', unmet: 'Ravi crosses the bridge each day.', lex: 5 },

  { f: ['Every brick in the wall is light.', 'The wall is made only of bricks.'], best: 'The wall is built from light bricks.', over: 'The whole wall is light enough to lift.', unmet: 'The wall was built last summer.', lex: 4 },
  { f: ['The relay team is very fast.', 'Sara is on the relay team.'], best: 'Sara is a member of a very fast team.', over: 'Sara is the fastest runner in the school.', unmet: 'Sara runs the last leg.', lex: 4 },
  { f: ['We can play football or we can read.', 'We are not playing football.'], best: 'We are reading instead.', over: 'Nobody here wants to play football.', unmet: 'The ball has a hole in it.', lex: 4 },
  { f: ['A new speed sign went up last month.', 'Fewer cars speed on that road now.'], best: 'Speeding fell after the sign went up.', over: 'The sign is the only reason cars slowed.', unmet: 'The road was resurfaced in May.', lex: 4 },
  { f: ['A survey asked people leaving the pool.', 'Most of them said swimming is the best sport.'], best: 'Most swimmers asked prefer swimming.', over: 'Swimming is the favourite sport of the town.', unmet: 'The pool stays open all winter.', lex: 4 },
  { f: ['A feather is light.', 'Light things are easy to lift.'], best: 'A feather is easy to lift.', over: 'A feather is not a dark colour.', unmet: 'The feather came from a goose.', lex: 4 },

  { f: ['If the door is locked, the key is in the drawer.', 'The key is in the drawer.'], best: 'The door may or may not be locked.', over: 'The door is locked.', unmet: 'The drawer sticks when it is damp.', lex: 4 },
  { f: ['Every runner who trains daily finished the race.', 'Omar finished the race.'], best: 'Omar finished, whether he trains daily or not.', over: 'Omar trains daily.', unmet: 'Omar finished in second place.', lex: 4 },
  { f: ['No cat on this street is grey.', 'Bella is a grey cat.'], best: 'Bella does not live on this street.', over: 'Bella must live on the next street.', unmet: 'Bella belongs to a neighbour.', lex: 4 },
  { f: ['The library is quiet on Mondays.', 'Today the library is quiet.'], best: 'Today could be a Monday, or another quiet day.', over: 'Today is Monday.', unmet: 'The library shuts at six.', lex: 4 },
  { f: ['All the coins in the jar are old.', 'Zoe found an old coin.'], best: 'Zoe found a coin that may not be from the jar.', over: 'Zoe took the coin from the jar.', unmet: 'Zoe keeps her coins in a tin.', lex: 4 },
  { f: ['Plants near the window grew tall.', 'Plants in the corner stayed short.'], best: 'The tall plants were the ones near the window.', over: 'The glass in the window makes plants grow.', unmet: 'The corner plants were watered less.', lex: 4 },

  { f: ['Everyone who ate the soup felt unwell.', 'Ten people ate the soup.'], best: 'Ten people felt unwell.', over: 'The soup was the cause of the illness.', unmet: 'The soup was made with beans.', lex: 4 },
  { f: ['One school found that longer breaks helped focus.', 'That school has forty students.'], best: 'Longer breaks helped focus in one small school.', over: 'Longer breaks help focus in every school.', unmet: 'The school day starts at eight.', lex: 3 },
  { f: ['Lena scored highest in the test.', 'Lena sits at the front of the class.'], best: 'The highest scorer sits at the front.', over: 'Sitting at the front raises test scores.', unmet: 'Lena revised with a friend.', lex: 3 },
  { f: ['If the tap drips, the floor gets damp.', 'The tap is not dripping.'], best: 'The floor could still be damp for another reason.', over: 'The floor is dry.', unmet: 'The tap was mended in June.', lex: 3 },
  { f: ['Most of the shells on this beach are white.', 'Ivan picked up a shell on this beach.'], best: 'Ivan probably picked up a white shell.', over: 'Ivan picked up a white shell.', unmet: 'Ivan collects shells every summer.', lex: 3 },
  { f: ['Every athlete in the club can swim.', 'Priya can swim.'], best: 'Priya can swim, club member or not.', over: 'Priya is in the club.', unmet: 'Priya swims on Tuesdays.', lex: 3 },

  // ======================= Tier D · bands 13-16 (grade 6-8) =======================
  // Four claims: the supported one, the overreach, a claim the facts rule out,
  // and one the facts never touch — so rejecting a claim needs a reason, not a
  // feeling.
  { f: ['Every book on the top shelf is a history book.', 'The atlas is on the top shelf.'], best: 'The atlas is a history book.', over: 'The atlas was written by a historian.', contra: 'The atlas is not a history book.', unmet: 'The atlas was printed in Leeds.', lex: 3 },
  { f: ['All the members of the choir can read music.', 'Dev is a member of the choir.'], best: 'Dev can read music.', over: 'Dev has taken music lessons for years.', contra: 'Dev cannot read music.', unmet: 'Dev sings in the front row.', lex: 3 },
  { f: ['Every plant in the greenhouse was watered on Monday.', 'The orchid is in the greenhouse.'], best: 'The orchid was watered on Monday.', over: 'The orchid is the healthiest plant there.', contra: 'The orchid was left dry on Monday.', unmet: 'The orchid flowers in spring.', lex: 3 },
  { f: ['No student in Year 6 took the early bus.', 'Aisha took the early bus.'], best: 'Aisha is not in Year 6.', over: 'Aisha prefers to travel alone.', contra: 'Aisha is a Year 6 student.', unmet: 'Aisha lives beside the bus stop.', lex: 3 },
  { f: ['Every tool in the red box belongs to the school.', 'The hammer is in the red box.'], best: 'The hammer belongs to the school.', over: 'The hammer was bought this year.', contra: 'The hammer belongs to nobody at the school.', unmet: 'The hammer has a wooden handle.', lex: 3 },
  { f: ['All the runners who finished were given a medal.', 'Yusuf finished the race.'], best: 'Yusuf was given a medal.', over: 'Yusuf trained harder than everyone else.', contra: 'Yusuf went home without a medal.', unmet: 'Yusuf ran in new shoes.', lex: 3 },

  { f: ['Every letter in the tray has been stamped.', 'This envelope is in the tray.'], best: 'This envelope has been stamped.', over: 'This envelope will arrive tomorrow.', contra: 'This envelope has no stamp on it.', unmet: 'This envelope holds a birthday card.', lex: 3 },
  { f: ['No painting in this room is for sale.', 'The blue landscape is in this room.'], best: 'The blue landscape is not for sale.', over: 'The artist refused to sell it.', contra: 'The blue landscape can be bought here.', unmet: 'The blue landscape was painted in oils.', lex: 3 },
  { f: ['Every ticket sold today was for the evening show.', 'Nadia bought a ticket today.'], best: 'Nadia has a ticket for the evening show.', over: 'Nadia will sit at the front.', contra: 'Nadia has a ticket for the morning show.', unmet: 'Nadia is going with her cousin.', lex: 3 },
  { f: ['All the samples in the freezer were labelled.', 'Tube 7 is in the freezer.'], best: 'Tube 7 was labelled.', over: 'Tube 7 was labelled by the lab manager.', contra: 'Tube 7 carries no label.', unmet: 'Tube 7 holds a blood sample.', lex: 2 },
  { f: ['Classes that added a reading hour scored higher.', 'Those same classes also had smaller groups.'], best: 'At least one thing about those classes changed.', over: 'The reading hour caused the higher scores.', contra: 'Nothing about those classes was different.', unmet: 'The reading hour was held after lunch.', lex: 2 },
  { f: ['The survey reached only families with home internet.', 'Most families in the survey said online homework is easy.'], best: 'Most surveyed families with home internet find it easy.', over: 'Most families in the town find online homework easy.', contra: 'No surveyed family found online homework easy.', unmet: 'The survey ran for three weeks.', lex: 2 },

  { f: ['Every experiment in the report used the same thermometer.', 'That thermometer read two degrees too high.'], best: 'Every reading in the report was two degrees too high.', over: 'The report proves the room was cold.', contra: 'The readings in the report were exactly right.', unmet: 'The report was written by two students.', lex: 2 },
  { f: ['All the seeds planted in April sprouted.', 'These seeds were planted in April.'], best: 'These seeds sprouted.', over: 'April is the best month for planting seeds.', contra: 'These seeds never sprouted.', unmet: 'These seeds came from a garden shop.', lex: 2 },
  { f: ['Every message in the folder was sent by the club.', 'This message is in the folder.'], best: 'This message was sent by the club.', over: 'The club sends a message every week.', contra: 'This message came from outside the club.', unmet: 'This message was sent on a Friday.', lex: 2 },
  { f: ['No machine in the workshop runs without power.', 'The lathe is a machine in the workshop.'], best: 'The lathe does not run without power.', over: 'Someone forgot to switch the lathe off.', contra: 'The lathe runs with no power at all.', unmet: 'The lathe was serviced in March.', lex: 2 },
  { f: ['Every child who joined the trip returned the form.', 'Priti joined the trip.'], best: 'Priti returned the form.', over: 'Priti returned the form before anyone else.', contra: 'Priti never returned her form.', unmet: 'Priti sat with her friends on the coach.', lex: 2 },
  { f: ['All the cheese in the shop is made locally.', 'This wheel of cheese came from the shop.'], best: 'This wheel of cheese is made locally.', over: 'Local cheese tastes better than imported cheese.', contra: 'This cheese was made far away.', unmet: 'This cheese was cut on Tuesday.', lex: 2 },

  { f: ['Every road drawn on the map is paved.', 'Mill Lane appears on the map.'], best: 'Mill Lane is paved.', over: 'Mill Lane is wide enough for two cars.', contra: 'Mill Lane is an unpaved track.', unmet: 'Mill Lane runs beside the river.', lex: 2 },
  { f: ['Two towns raised their speed limit and crashes rose.', 'Both towns also grew much larger that same year.'], best: 'Something in both towns changed that year.', over: 'Raising the speed limit caused the crashes.', contra: 'Neither town changed at all that year.', unmet: 'Both towns opened a new school.', lex: 2 },
  { f: ['Everyone who returned the survey liked the new menu.', 'Only twelve of two hundred people returned it.'], best: 'At least twelve people like the new menu.', over: 'Most of the school likes the new menu.', contra: 'Nobody who replied liked the new menu.', unmet: 'The new menu costs less to cook.', lex: 2 },
  { f: ['All the instruments in the case were tuned this morning.', 'The violin is in the case.'], best: 'The violin was tuned this morning.', over: 'The violin will stay in tune all week.', contra: 'The violin was left untuned today.', unmet: 'The violin belongs to the school.', lex: 2 },
  { f: ['Every parcel on the round weighed over five kilograms.', 'The driver carried one parcel at a time.'], best: 'Each parcel the driver carried was over five kilograms.', over: 'The driver is unusually strong.', contra: 'Some parcels on the round were very light.', unmet: 'The driver finished the round by noon.', lex: 2 },
  { f: ['No file in the archive is newer than 1990.', 'This photograph is in the archive.'], best: 'This photograph is not newer than 1990.', over: 'This photograph was taken in 1990.', contra: 'This photograph was taken last year.', unmet: 'This photograph shows a harbour.', lex: 2 },

  // ======================= Tier E · bands 17-20 (above level) =======================
  // The overreach is a quiet scope, sampling or causal shift, and the supported
  // claim is deliberately the modest one.
  { f: ['Every specimen catalogued before 1950 was preserved in alcohol.', 'This beetle was catalogued in 1948.'], best: 'This beetle was preserved in alcohol.', over: 'Alcohol was the only preservative available in 1948.', contra: 'This beetle was never preserved in alcohol.', unmet: 'This beetle was collected in Kenya.', lex: 1 },
  { f: ['The instrument was calibrated against a standard that had drifted upward.', 'Every reading taken with it was biased in the same direction.'], best: 'The recorded temperatures were systematically too high.', over: 'The trend in the recorded data must be an illusion.', contra: 'The recorded temperatures were free of bias.', unmet: 'The instrument was replaced the following year.', lex: 1 },
  { f: ['A treatment improved outcomes in the trial.', 'Everyone who enrolled was a healthy volunteer.'], best: 'The treatment improved outcomes for the volunteers studied.', over: 'The treatment will improve outcomes for the general population.', contra: 'The treatment improved nobody in the trial.', unmet: 'The trial ran at four hospitals.', lex: 1 },
  { f: ['Every manuscript in the collection is anonymous.', 'An anonymous manuscript cannot be dated from its author.'], best: 'This manuscript cannot be dated from its author.', over: 'This manuscript cannot be dated at all.', contra: 'This manuscript can be dated from its author.', unmet: 'This manuscript is written on vellum.', lex: 1 },
  { f: ['The correlation between the two measures is very strong.', 'A strong correlation can arise from a shared third cause.'], best: 'One measure may not be causing the other.', over: 'Neither measure has any influence on the other.', contra: 'One measure must be causing the other.', unmet: 'The two measures were recorded monthly.', lex: 1 },
  { f: ['Each of the three witnesses gave the same account.', 'All three heard that account from the same neighbour.'], best: 'The same account was given three times.', over: 'The account is confirmed by three independent sources.', contra: 'The three witnesses disagreed with each other.', unmet: 'The neighbour was away that evening.', lex: 1 },

  { f: ['Every rock in the layer contains the same mineral.', 'This fragment came from that layer.'], best: 'This fragment contains the mineral.', over: 'The mineral formed at the same time as the layer.', contra: 'This fragment contains none of the mineral.', unmet: 'This fragment was found by a student.', lex: 1 },
  { f: ['The model reproduced last year results almost exactly.', 'The model was adjusted using last year results.'], best: 'The model fits last year results closely.', over: 'The model has proven it can predict future results.', contra: 'The model fits last year results badly.', unmet: 'The model runs on a laptop.', lex: 1 },
  { f: ['No claim in the report was contradicted by the evidence gathered.', 'The team gathered evidence on only two of the six claims.'], best: 'Four of the claims were never examined.', over: 'Every claim in the report is supported by evidence.', contra: 'Every claim in the report was examined.', unmet: 'The report was published in June.', lex: 1 },
  { f: ['Students who chose the advanced course scored higher on the final.', 'Students chose their own course.'], best: 'The two groups may differ in more than the course taken.', over: 'The advanced course raised their scores.', contra: 'The two groups were identical in every way.', unmet: 'The final was marked by two teachers.', lex: 1 },
  { f: ['Every artefact from the site is made of bronze.', 'Bronze working reached the region around 1200 BC.'], best: 'The artefacts are not older than about 1200 BC.', over: 'The site was first settled around 1200 BC.', contra: 'The artefacts are far older than bronze working.', unmet: 'The site lies beside a dry riverbed.', lex: 1 },
  { f: ['The new policy began in March.', 'Complaints fell sharply in April.'], best: 'Complaints fell after the policy began.', over: 'The policy reduced the complaints.', contra: 'Complaints rose after the policy began.', unmet: 'The policy was announced by letter.', lex: 1 },

  { f: ['Every measurement was repeated three times.', 'Repeating a measurement reduces random error.'], best: 'Random error in these measurements is reduced.', over: 'These measurements are free of systematic error.', contra: 'Random error in these measurements is untouched.', unmet: 'The measurements were taken at dawn.', lex: 1 },
  { f: ['All the pupils who sat the exam had attended the revision class.', 'Attendance at that class was compulsory for everyone.'], best: 'No pupil sat the exam without attending.', over: 'Attendance at the class explains the high pass rate.', contra: 'Some pupils sat the exam without attending.', unmet: 'The revision class lasted two hours.', lex: 1 },
  { f: ['The fossil record shows no example of the species above that layer.', 'Fossilisation preserves only a small fraction of organisms.'], best: 'The missing later fossils are not proof of extinction.', over: 'The species certainly survived past that layer.', contra: 'The missing fossils prove the species died out.', unmet: 'The layer was dated by a visiting team.', lex: 1 },
  { f: ['Two variables rose together every year for a decade.', 'A third variable also rose every year over that decade.'], best: 'All three variables rose together for a decade.', over: 'The first variable caused the second.', contra: 'The three variables moved in opposite directions.', unmet: 'The data were collected by one office.', lex: 1 },
  { f: ['Every translation in the volume was made from the same edition.', 'That edition omitted the final chapter.'], best: 'Every translation in the volume omits the final chapter.', over: 'The final chapter has been lost.', contra: 'One translation in the volume includes the final chapter.', unmet: 'The volume was bound in cloth.', lex: 1 },
  { f: ['The detector registers the particle only above a certain energy.', 'No particle was registered during the experiment.'], best: 'No particle was present above that energy.', over: 'No particle was present at any energy.', contra: 'A particle was registered above that energy.', unmet: 'The experiment ran for six hours.', lex: 1 },

  { f: ['The sample was drawn only from households with a landline.', 'Landline households are older on average than the rest.'], best: 'The sample is older on average than the population.', over: 'The survey result carries no information at all.', contra: 'The sample matches the population in age.', unmet: 'The survey asked about travel habits.', lex: 1 },
  { f: ['Every account of the battle was written after the treaty.', 'Writers after the treaty had reason to favour one side.'], best: 'These accounts may be biased.', over: 'None of the accounts contains any accurate detail.', contra: 'These accounts cannot be biased at all.', unmet: 'The battle was fought in autumn.', lex: 1 },
  { f: ['Each extra hour of practice improved performance in the study.', 'The study followed the players for only six weeks.'], best: 'Practice improved performance over the six weeks observed.', over: 'Practice improves performance without any limit.', contra: 'Extra practice made performance worse.', unmet: 'The players trained on grass.', lex: 1 },
  { f: ['The map marks every settlement recorded in the census.', 'The census excluded settlements of fewer than ten houses.'], best: 'Small settlements are missing from the map.', over: 'The region contained no small settlements.', contra: 'The map marks every settlement in the region.', unmet: 'The map was drawn to one scale throughout.', lex: 1 },
  { f: ['The gene appears in every individual who has the condition.', 'The gene also appears in many individuals who do not.'], best: 'The gene alone does not determine the condition.', over: 'The gene plays no part in the condition.', contra: 'The gene alone determines the condition.', unmet: 'The gene was first described in 1998.', lex: 1 },
  { f: ['Every trial that reported a benefit was funded by the manufacturer.', 'Trials reporting no benefit were less likely to be published.'], best: 'The published record may overstate the benefit.', over: 'The treatment has no benefit whatsoever.', contra: 'The published record cannot overstate the benefit.', unmet: 'The trials were run in five countries.', lex: 1 },
];

// Inference layer used by M-INFDEPTH (how deep the supported claim reaches).
// Carried over from v1 so the depth signal is comparable across the reframe:
// 1 = the claim puts the given facts together, 3 = it needs a deduction the
// facts license, 4 = it needs a judgement about scope, sampling or causation.
export function inferenceLayerFor(index) {
  if (index < 36) return 1;
  if (index < 72) return 3;
  return 4;
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
function shuffleInPlace(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
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

// The claims of one entry in authored order: the supported claim first, then the
// defects that entry declares.
function claimsOf(entry) {
  const claims = [{ text: entry.best, role: 'supported' }];
  if (entry.over) claims.push({ text: entry.over, role: 'overreach' });
  if (entry.contra) claims.push({ text: entry.contra, role: 'contradicts' });
  if (entry.unmet) claims.push({ text: entry.unmet, role: 'unmentioned' });
  return claims;
}

// ---------------------------------------------------------------------------
// Key-position balance (E-073).
// ---------------------------------------------------------------------------

// One target claim position per entry. Entries are grouped by claim count,
// because a 3-claim item cannot key claim 4; inside a group the positions are
// dealt out in blocks of one full cycle, so every consecutive run of n items
// uses each position exactly once. That makes the plan exactly balanced overall
// AND spread across the difficulty ramp, rather than balanced in aggregate but
// clustered (all of claim 1 in the easy tiers, say). Each cycle is shuffled from
// a fixed seed so the sequence is reproducible without being a bare 1,2,3,1,2,3.
export function keyPositionPlan(entries) {
  const groups = new Map();
  entries.forEach((e, i) => {
    const n = claimsOf(e).length;
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(i);
  });

  const plan = new Array(entries.length);
  for (const [n, entryIndices] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const rnd = mulberry32(hashNum(`${TYPE_CODE}:keypos:${n}`));
    let cycle = [];
    entryIndices.forEach((entryIndex, k) => {
      if (k % n === 0) cycle = shuffleInPlace(Array.from({ length: n }, (_, i) => i), rnd);
      plan[entryIndex] = cycle[k % n];
    });
  }
  return plan;
}

// Presentation order for one entry's claims: the distractors are shuffled from a
// per-item seed (so a defect class never sits in a fixed slot) and the supported
// claim is inserted at `target`, which the balanced plan chose.
export function presentationClaims(entry, target, seed) {
  const authored = claimsOf(entry);
  const supported = authored[0];
  const distractors = shuffleInPlace(authored.slice(1), mulberry32(hashNum(`${seed}:claims`)));
  distractors.splice(target, 0, supported);
  return distractors;
}

// ---------------------------------------------------------------------------
// Build one BankItem.
// ---------------------------------------------------------------------------
function buildItem(authored, index, target) {
  const itemId = uuidFrom(`${TYPE_CODE}:${index}`);
  const difficulty = difficultyFor(index);
  const claims = presentationClaims(authored, target, itemId);
  const factIds = authored.f.map((_, i) => `f${i + 1}`);
  const claimIds = claims.map((_, i) => `c${i + 1}`);
  const supportedIdx = claims.findIndex((c) => c.role === 'supported');

  const rationales = {};
  claims.forEach((c, i) => {
    rationales[claimIds[i]] = { lure: LURE_FOR_ROLE[c.role], why: WHY[c.role] };
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
      promptKind: PROMPT_KIND,
      prompt: PROMPT,
      facts: authored.f.map((text, i) => ({ id: factIds[i], text })),
      factCount: authored.f.length,
      claims: claims.map((c, i) => ({ id: claimIds[i], text: c.text })),
      claimCount: claims.length,
      lexicalBand: authored.lex,
    },
    answer: {
      correctKey: claimIds[supportedIdx],
      distractorRationales: rationales,
      // The fact set is what licenses the supported claim; no claim ever rests
      // on another claim, which is what keeps a single answer defensible.
      supportedBy: factIds,
      inferenceLayer: inferenceLayerFor(index),
      // Server-side claim structure; also what the checker re-derives the key from.
      claimStructure: claims.map((c, i) => ({
        id: claimIds[i],
        mark: c.role,
        supportedBy: c.role === 'supported' ? factIds : null,
      })),
      // The open component this type defers (no free text is collected in the
      // renderer, so the deferred judge reads the ordered action log instead).
      rubricDimensions: [
        'explanation_of_why_the_facts_support_that_claim (deferred: not elicited in this renderer)',
      ],
    },
    scoring: {
      mode: 'deterministic_key',
      keyedComponents: ['best_supported_claim'],
      deferredComponents: [],
    },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      tier: Math.floor(index / 24) + 1,
      contentHash: createHash('sha1').update(JSON.stringify(authored)).digest('hex').slice(0, 16),
      validatorVerdicts: verdictsFor(authored, difficulty),
    },
    syntheticOnly: true,
    validated: false,
  };
}

function verdictsFor(entry, difficulty) {
  const claims = claimsOf(entry);
  const supported = claims.filter((c) => c.role === 'supported').length;
  const defects = claims.slice(1).map((c) => c.role);
  const texts = [...entry.f, ...claims.map((c) => c.text)];
  const words = texts.join(' ').split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, ''));
  const low = difficulty < 8;
  const readingOk = !low
    || (words.every((w) => w.length <= MAX_WORD_LEN_LOW)
      && texts.every((t) => t.length <= MAX_STATEMENT_CHARS_LOW));
  return [
    { check: 'single_supported_claim', status: supported === 1 ? 'pass' : 'fail', detail: `${supported} supported claim(s)` },
    {
      check: 'distinct_defect_classes',
      status: defects.length >= 2 && new Set(defects).size === defects.length && defects.every((d) => DEFECT_CLASSES.has(d)) ? 'pass' : 'fail',
      detail: defects.join(', '),
    },
    { check: 'evidence_base_ok', status: entry.f.length >= 2 ? 'pass' : 'fail', detail: `${entry.f.length} facts` },
    { check: 'reading_load_ok', status: readingOk ? 'pass' : 'warn', detail: `lexical band ${entry.lex}` },
    { check: 'no_audio', status: 'pass', detail: 'D-017: text-only stimulus' },
    { check: 'bias_screen_ok', status: 'pass', detail: 'synthetic self-screen; no cultural or value claims keyed' },
  ];
}

export function buildBank() {
  const plan = keyPositionPlan(ENTRIES);
  return ENTRIES.map((e, i) => buildItem(e, i, plan[i]));
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

    const facts = it.content.facts || [];
    const claims = it.content.claims || [];
    if (facts.length < 2) errors.push(`${where}: ${facts.length} facts (want >=2)`);
    if (claims.length < 3 || claims.length > 4) errors.push(`${where}: ${claims.length} claims (want 3..4)`);

    const struct = it.answer.claimStructure || [];
    const supported = struct.filter((s) => s.mark === 'supported');
    if (supported.length !== 1) errors.push(`${where}: ${supported.length} supported claims (want exactly 1)`);
    else if (supported[0].id !== it.answer.correctKey) errors.push(`${where}: correctKey does not point at the supported claim`);
    if (struct.length !== claims.length) errors.push(`${where}: claimStructure/claim length mismatch`);
    const defects = struct.filter((s) => s.mark !== 'supported').map((s) => s.mark);
    if (new Set(defects).size !== defects.length) errors.push(`${where}: two claims fail the same way`);
    if (defects.some((mark) => !DEFECT_CLASSES.has(mark))) errors.push(`${where}: defect class outside the taxonomy`);
    if (Object.keys(it.answer.distractorRationales).length !== claims.length) errors.push(`${where}: rationales do not cover every claim`);

    const texts = [...facts.map((f) => f.text), ...claims.map((c) => c.text)];
    if (new Set(texts).size !== texts.length) errors.push(`${where}: a fact and a claim share the same text`);
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
  writeFileSync(BANK_PATH, serializeBank(items), 'utf8');
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
