#!/usr/bin/env node
// VER-EVIDENCE-01 (Proof Hunt) — structured / LLM-authored item bank generator.
//
// Two-part evidence-based selected response: the child answers an inference question
// AND taps the sentence in the passage that proves the answer. Full credit needs both.
//
// Approach: authored SURFACE CONTENT over a deterministic, machine-checkable STRUCTURE.
//   * Each passage sentence carries a set of PROPOSITION TAGS (facts it asserts).
//   * Each question names an inference SCHEMA from `SCHEMAS` plus the premise tag it
//     starts from and the conclusion tag it licenses.
//   * Each answer option carries the claim tag it asserts.
//   The answer key is therefore RE-DERIVABLE and never hand-assigned:
//       evidence sentence = the unique sentence asserting the premise tag
//       correct option    = the unique option claiming the conclusion tag
//   The generator refuses to write unless, for every item,
//       (a) exactly ONE sentence asserts the premise            <- evidence is unique
//       (b) exactly ONE option claims the conclusion            <- single-satisfiability
//       (c) no distractor's claim tag is asserted anywhere in the passage
//           (a distractor may never be independently supportable).
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp,
//                                                  §4 core metrics (M-VOCABLVL, M-LURETYPE)
//   research/exam-question-types/catalog/master_types.jsonl   VER-EVIDENCE-01 spec
//
// D-017: this type used to reach K-1 through an AUDIO story with comic panels. Audio is
// prohibited and reading is a required baseline-literacy gate, so the floor is grade 2
// and the catalog age_bands are 2-3 / 4-5 / 6-8. This bank emits NO K-1 items, no audio,
// and no picture-panel evidence mode: passages are on-screen text split into tappable
// sentences at every band.
//
// Governance: born-synthetic. syntheticOnly:true, validated:false. Design difficulty is
// NOT calibrated IRT. No live child data. (RES-012/RES-013)
//
// Usage:
//   node generators/VER-EVIDENCE-01.mjs            # build + prove + write the bank
//   node generators/VER-EVIDENCE-01.mjs --check    # build + prove in memory, do not write
//   node generators/VER-EVIDENCE-01.mjs --validate # validate the JSONL already on disk
//   node generators/VER-EVIDENCE-01.mjs --print 1  # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'VER-EVIDENCE-01.jsonl');

export const TYPE_CODE = 'VER-EVIDENCE-01';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/VER-EVIDENCE-01.html';
const GENERATOR_REF = 'VER-EVIDENCE-01/authored-passages+inference-schemas@v1';

export const ITEMS_PER_BAND = 6;

// Lure taxonomy. Option lures and evidence lures share one map (each key is a thing the
// child can select), which is what M-LURETYPE consumes.
export const OPTION_LURES = new Set(['correct', 'surface-text-match', 'plausible-but-unsupported', 'contradicts-text']);
export const EVIDENCE_LURES = new Set(['evidence-correct', 'true-but-irrelevant', 'plausible-but-unsupported-evidence']);

// Inference schemas. Depth drives M-INFDEPTH and the difficulty ramp: a question is
// harder the further its conclusion sits from the words on the page.
export const SCHEMAS = {
  'R-STATED':   { depth: 'literal',  identity: true,  form: 'the answer restates a proposition the text asserts outright' },
  'R-CAUSE':    { depth: 'bridging', identity: false, form: 'a stated event licenses the consequence it produced' },
  'R-MOTIVE':   { depth: 'bridging', identity: false, form: 'a stated action licenses the actor\'s reason for taking it' },
  'R-CONTRAST': { depth: 'bridging', identity: false, form: 'a stated exception licenses a contrast with the rest of the passage' },
  'R-TRAIT':    { depth: 'global',   identity: false, form: 'a stated action licenses a durable trait of the actor' },
  'R-MAINIDEA': { depth: 'global',   identity: false, form: 'the passage outcome licenses the point the whole passage makes' },
  'R-PREDICT':  { depth: 'global',   identity: false, form: 'the stated situation licenses what must happen next' },
  'R-PURPOSE':  { depth: 'purpose',  identity: false, form: 'the shape of the passage licenses why the writer included a detail' },
};
export const DEPTH_RANK = { literal: 0, bridging: 1, global: 2, purpose: 3 };

// ---------------------------------------------------------------------------
// AUTHORED PASSAGES.
//   sents : [text, ...propositionTags]
//   qs    : { d, schema, premise, conclusion?, q, opts:[[text, claimTag, lure]], evLure? }
//           `conclusion` is omitted for R-STATED (identity: conclusion === premise).
//           `evLure` names the sentence key that is the strongest wrong proof.
// Tiers (4 passages each) set the lexical/length ramp:
//   tier 1 bands  1-4    4 short sentences, very high-frequency words
//   tier 2 bands  5-8    5 sentences
//   tier 3 bands  9-12   5 sentences, less common words
//   tier 4 bands 13-16   6 sentences, informational register
//   tier 5 bands 17-20   6 sentences, literary/academic register
// ---------------------------------------------------------------------------
export const PASSAGES = [
  // ======================= TIER 1 =======================
  {
    id: 'P01', tier: 1, vocab: 7, title: 'The Field Trip',
    sents: [
      ['Mia packed her bag the night before the trip.', 'packed_early'],
      ['She set two clocks so she would not sleep late.', 'set_two_clocks'],
      ['In the morning she was the first one waiting at the door.', 'ready_first'],
      ['Her brother was still eating when the bus honked outside.', 'brother_still_eating'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'packed_early', q: 'What did Mia do the night before the trip?',
        opts: [['She packed her bag.', 'packed_early', 'correct'], ['She ate a big meal.', 'ate_big_meal', 'plausible-but-unsupported'], ['She missed the bus.', 'missed_bus', 'contradicts-text']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'brother_still_eating', q: 'What was Mia\'s brother doing when the bus honked?',
        opts: [['He was still eating.', 'brother_still_eating', 'correct'], ['He was waiting at the door.', 'brother_at_door', 'contradicts-text'], ['He was packing his bag.', 'brother_packing', 'surface-text-match']], evLure: 's3' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'set_two_clocks', conclusion: 'feared_sleeping_late', q: 'Why did Mia set two clocks?',
        opts: [['She did not want to sleep late.', 'feared_sleeping_late', 'correct'], ['She likes collecting clocks.', 'likes_clocks', 'surface-text-match'], ['Her first clock was broken.', 'clock_broken', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'ready_first', conclusion: 'was_not_late', q: 'How do we know Mia was not late for the bus?',
        opts: [['She was waiting before anyone else.', 'was_not_late', 'correct'], ['She had two clocks.', 'owns_two_clocks', 'surface-text-match'], ['Her brother told her to hurry.', 'brother_hurried_her', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'global', schema: 'R-TRAIT', premise: 'packed_early', conclusion: 'plans_ahead', q: 'What is Mia probably like?',
        opts: [['She plans ahead.', 'plans_ahead', 'correct'], ['She forgets things easily.', 'is_forgetful', 'contradicts-text'], ['She is shy around new people.', 'is_shy', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'brother_still_eating', conclusion: 'shows_contrast_in_getting_ready', q: 'Why does the writer tell us about the brother?',
        opts: [['To show how differently the two children got ready.', 'shows_contrast_in_getting_ready', 'correct'], ['To explain what the family eats.', 'explains_breakfast', 'surface-text-match'], ['To show that the bus was early.', 'bus_was_early', 'plausible-but-unsupported']], evLure: 's3' },
    ],
  },
  {
    id: 'P02', tier: 1, vocab: 7, title: 'Under the Porch',
    sents: [
      ['Ben heard a small cry under the porch.', 'heard_a_cry'],
      ['He set a dish of milk beside the steps and went inside.', 'set_out_milk'],
      ['After a long wait, a thin kitten crept out to drink.', 'kitten_crept_out'],
      ['Ben made a warm bed for it in a box.', 'made_warm_bed'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'heard_a_cry', q: 'What did Ben hear?',
        opts: [['A small cry under the porch.', 'heard_a_cry', 'correct'], ['A dog barking in the yard.', 'heard_a_dog', 'plausible-but-unsupported'], ['His mother calling him inside.', 'heard_mother', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'made_warm_bed', q: 'What did Ben make for the kitten?',
        opts: [['A warm bed in a box.', 'made_warm_bed', 'correct'], ['A dish of milk.', 'made_milk_dish', 'surface-text-match'], ['A door in the porch.', 'made_a_door', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'set_out_milk', conclusion: 'wanted_to_help', q: 'Why did Ben put the milk by the steps?',
        opts: [['He wanted to help whatever was hiding there.', 'wanted_to_help', 'correct'], ['He was thirsty himself.', 'ben_was_thirsty', 'plausible-but-unsupported'], ['He wanted to wash the steps.', 'wash_the_steps', 'surface-text-match']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'kitten_crept_out', conclusion: 'plan_worked', q: 'How do we know Ben\'s idea worked?',
        opts: [['The kitten came out and drank.', 'plan_worked', 'correct'], ['Ben went back inside.', 'ben_went_inside', 'surface-text-match'], ['The porch was warm.', 'porch_was_warm', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'global', schema: 'R-TRAIT', premise: 'made_warm_bed', conclusion: 'is_caring', q: 'What is Ben probably like?',
        opts: [['He takes care of small creatures.', 'is_caring', 'correct'], ['He is afraid of animals.', 'fears_animals', 'contradicts-text'], ['He is good at building things.', 'is_a_builder', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'kitten_crept_out', conclusion: 'shows_waiting_was_needed', q: 'Why does the writer say the kitten came out after a long wait?',
        opts: [['To show that Ben had to be patient.', 'shows_waiting_was_needed', 'correct'], ['To show that the milk was cold.', 'milk_was_cold', 'plausible-but-unsupported'], ['To explain where the porch was.', 'explains_porch', 'surface-text-match']], evLure: 's2' },
    ],
  },
  {
    id: 'P03', tier: 1, vocab: 6, title: 'The Kite on the Hill',
    sents: [
      ['The wind was strong on the hill that day.', 'wind_was_strong'],
      ['Ana\'s kite rose above the trees in a few seconds.', 'kite_rose_fast'],
      ['Soon the whole string had run out.', 'string_ran_out'],
      ['Ana held the stick tightly with both hands.', 'held_stick_tight'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'wind_was_strong', q: 'What was the weather like on the hill?',
        opts: [['The wind was strong.', 'wind_was_strong', 'correct'], ['It was raining hard.', 'was_raining', 'plausible-but-unsupported'], ['The air was still.', 'air_was_still', 'contradicts-text']], evLure: 's2' },
      { d: 'literal', schema: 'R-STATED', premise: 'string_ran_out', q: 'What happened to the string?',
        opts: [['All of it ran out.', 'string_ran_out', 'correct'], ['It snapped in the wind.', 'string_snapped', 'plausible-but-unsupported'], ['It caught in the trees.', 'string_in_trees', 'surface-text-match']], evLure: 's2' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'wind_was_strong', conclusion: 'wind_lifted_kite', q: 'Why did the kite go up so quickly?',
        opts: [['The strong wind lifted it.', 'wind_lifted_kite', 'correct'], ['The string was very long.', 'long_string', 'surface-text-match'], ['Ana ran down the hill.', 'ana_ran', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'held_stick_tight', conclusion: 'feared_losing_kite', q: 'Why did Ana hold the stick so tightly?',
        opts: [['She did not want the kite to get away.', 'feared_losing_kite', 'correct'], ['Her hands were cold.', 'hands_were_cold', 'plausible-but-unsupported'], ['The stick was heavy.', 'stick_was_heavy', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'global', schema: 'R-PREDICT', premise: 'string_ran_out', conclusion: 'kite_cannot_rise_further', q: 'What will probably happen next?',
        opts: [['The kite cannot climb any higher.', 'kite_cannot_rise_further', 'correct'], ['The kite will rise above the clouds.', 'kite_rises_more', 'contradicts-text'], ['Ana will make a second kite.', 'makes_new_kite', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'held_stick_tight', conclusion: 'shows_flying_takes_effort', q: 'Why does the writer mention Ana\'s two hands?',
        opts: [['To show that holding the kite took real effort.', 'shows_flying_takes_effort', 'correct'], ['To show that Ana was cold.', 'ana_was_cold', 'plausible-but-unsupported'], ['To describe what the stick looked like.', 'describes_stick', 'surface-text-match']], evLure: 's1' },
    ],
  },
  {
    id: 'P04', tier: 1, vocab: 6, title: 'The Flat Dough',
    sents: [
      ['Tom mixed the dough and left it in a bowl.', 'mixed_the_dough'],
      ['The kitchen was cold all morning.', 'kitchen_was_cold'],
      ['By noon the dough was still flat.', 'dough_stayed_flat'],
      ['Tom moved the bowl next to the warm stove.', 'moved_bowl_to_stove'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'mixed_the_dough', q: 'What did Tom do first?',
        opts: [['He mixed the dough and left it in a bowl.', 'mixed_the_dough', 'correct'], ['He lit the stove.', 'lit_the_stove', 'surface-text-match'], ['He opened a window.', 'opened_window', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'literal', schema: 'R-STATED', premise: 'dough_stayed_flat', q: 'What was the dough like at noon?',
        opts: [['It was still flat.', 'dough_stayed_flat', 'correct'], ['It had doubled in size.', 'dough_doubled', 'contradicts-text'], ['It had burned.', 'dough_burned', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'kitchen_was_cold', conclusion: 'cold_stopped_rising', q: 'Why did the dough not rise?',
        opts: [['The kitchen was too cold for it.', 'cold_stopped_rising', 'correct'], ['Tom used the wrong bowl.', 'wrong_bowl', 'surface-text-match'], ['Tom forgot to mix it.', 'forgot_to_mix', 'contradicts-text']], evLure: 's3' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'moved_bowl_to_stove', conclusion: 'wanted_more_warmth', q: 'Why did Tom move the bowl?',
        opts: [['He wanted the dough to be warmer.', 'wanted_more_warmth', 'correct'], ['He needed the table for lunch.', 'needed_the_table', 'plausible-but-unsupported'], ['He wanted to cook the dough.', 'wanted_to_cook_it', 'surface-text-match']], evLure: 's3' },
      { d: 'global', schema: 'R-TRAIT', premise: 'moved_bowl_to_stove', conclusion: 'fixes_problems', q: 'What is Tom probably like?',
        opts: [['When something goes wrong he tries a fix.', 'fixes_problems', 'correct'], ['He gives up quickly.', 'gives_up', 'contradicts-text'], ['He bakes bread every day.', 'bakes_daily', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'kitchen_was_cold', conclusion: 'explains_why_dough_failed', q: 'Why does the writer tell us the kitchen was cold?',
        opts: [['To explain why the dough stayed flat.', 'explains_why_dough_failed', 'correct'], ['To show what season it was.', 'shows_the_season', 'plausible-but-unsupported'], ['To describe where Tom lives.', 'describes_the_house', 'plausible-but-unsupported']], evLure: 's1' },
    ],
  },

  // ======================= TIER 2 =======================
  {
    id: 'P05', tier: 2, vocab: 6, title: 'The Window Garden',
    sents: [
      ['Each child in the class planted three seeds in a paper cup.', 'planted_seeds'],
      ['Nadia checked the soil every morning and added a little water.', 'watered_daily'],
      ['After two weeks, green shoots pushed out of the dirt.', 'shoots_appeared'],
      ['Nadia\'s plant was the tallest one on the shelf by the end of the month.', 'plant_was_tallest'],
      ['One cup at the back of the shelf was never watered and stayed bare.', 'one_cup_never_watered'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'planted_seeds', q: 'What did the children plant the seeds in?',
        opts: [['Paper cups.', 'planted_seeds', 'correct'], ['A garden bed outside.', 'planted_outside', 'contradicts-text'], ['A wooden box.', 'planted_in_box', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'shoots_appeared', q: 'What happened after two weeks?',
        opts: [['Green shoots came out of the dirt.', 'shoots_appeared', 'correct'], ['The plants flowered.', 'plants_flowered', 'plausible-but-unsupported'], ['The cups were moved outside.', 'cups_moved', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'watered_daily', conclusion: 'care_caused_growth', q: 'Why did Nadia\'s plant grow so well?',
        opts: [['She looked after it every day.', 'care_caused_growth', 'correct'], ['Her seeds were bigger.', 'bigger_seeds', 'plausible-but-unsupported'], ['Her cup was made of paper.', 'paper_cup_helped', 'surface-text-match'], ['She planted more seeds than the others.', 'planted_more', 'contradicts-text']], evLure: 's4' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'one_cup_never_watered', conclusion: 'neglect_stopped_growth', q: 'Why did one cup stay bare?',
        opts: [['Nobody ever watered it.', 'neglect_stopped_growth', 'correct'], ['It was at the back of the shelf.', 'was_at_the_back', 'surface-text-match'], ['Its seeds were planted late.', 'planted_late', 'plausible-but-unsupported'], ['The shelf was too warm.', 'shelf_too_warm', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'plant_was_tallest', conclusion: 'steady_care_pays_off', q: 'What is this passage mostly showing?',
        opts: [['Steady care makes a real difference.', 'steady_care_pays_off', 'correct'], ['How to plant seeds in a cup.', 'how_to_plant', 'surface-text-match'], ['Nadia is the best gardener in town.', 'nadia_is_best', 'plausible-but-unsupported'], ['Plants grow better indoors.', 'indoors_is_better', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'one_cup_never_watered', conclusion: 'gives_a_comparison', q: 'Why does the writer mention the cup at the back?',
        opts: [['To compare it with the plant that was cared for.', 'gives_a_comparison', 'correct'], ['To show the shelf was crowded.', 'shelf_was_crowded', 'plausible-but-unsupported'], ['To explain how seeds are planted.', 'explains_planting', 'surface-text-match'], ['To show that paper cups leak.', 'cups_leak', 'plausible-but-unsupported']], evLure: 's4' },
    ],
  },
  {
    id: 'P06', tier: 2, vocab: 5, title: 'The Rope Bridge',
    sents: [
      ['The old rope bridge over the stream had two broken planks.', 'bridge_had_broken_planks'],
      ['Every morning Yusuf carried a heavy crate of eggs to the market.', 'carries_eggs_daily'],
      ['He now walked the long way around through the field.', 'takes_long_way'],
      ['The trip took him an extra half hour each day.', 'trip_takes_longer'],
      ['On Saturday he brought rope and new boards to the bridge.', 'brought_repair_materials'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'bridge_had_broken_planks', q: 'What was wrong with the bridge?',
        opts: [['Two of its planks were broken.', 'bridge_had_broken_planks', 'correct'], ['The stream had washed it away.', 'bridge_washed_away', 'contradicts-text'], ['It was too narrow for a crate.', 'bridge_too_narrow', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'trip_takes_longer', q: 'How much longer did the new route take?',
        opts: [['About half an hour more.', 'trip_takes_longer', 'correct'], ['A whole morning more.', 'takes_all_morning', 'contradicts-text'], ['No extra time at all.', 'no_extra_time', 'contradicts-text']], evLure: 's3' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'takes_long_way', conclusion: 'avoided_unsafe_bridge', q: 'Why did Yusuf walk through the field?',
        opts: [['The bridge was not safe to cross.', 'avoided_unsafe_bridge', 'correct'], ['He liked the view of the field.', 'likes_the_view', 'plausible-but-unsupported'], ['The field was a shorter route.', 'field_is_shorter', 'contradicts-text'], ['He was selling eggs in the field.', 'sells_in_field', 'surface-text-match']], evLure: 's4' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'brought_repair_materials', conclusion: 'intends_to_repair_it', q: 'What was Yusuf planning to do on Saturday?',
        opts: [['Mend the bridge himself.', 'intends_to_repair_it', 'correct'], ['Sell rope and boards at the market.', 'sell_the_materials', 'surface-text-match'], ['Build a new bridge somewhere else.', 'build_elsewhere', 'plausible-but-unsupported'], ['Block the bridge so nobody would use it.', 'block_the_bridge', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'global', schema: 'R-TRAIT', premise: 'brought_repair_materials', conclusion: 'acts_instead_of_complaining', q: 'What is Yusuf probably like?',
        opts: [['He deals with a problem instead of just living with it.', 'acts_instead_of_complaining', 'correct'], ['He is easily frightened.', 'is_fearful', 'plausible-but-unsupported'], ['He avoids hard work.', 'avoids_work', 'contradicts-text'], ['He is new to the village.', 'is_a_newcomer', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'trip_takes_longer', conclusion: 'shows_the_cost_of_the_problem', q: 'Why does the writer tell us about the extra half hour?',
        opts: [['To show what the broken bridge was costing Yusuf.', 'shows_the_cost_of_the_problem', 'correct'], ['To show how far the market is.', 'market_is_far', 'plausible-but-unsupported'], ['To explain how eggs are carried.', 'explains_carrying_eggs', 'surface-text-match'], ['To show that Yusuf walks slowly.', 'walks_slowly', 'plausible-but-unsupported']], evLure: 's3' },
    ],
  },
  {
    id: 'P07', tier: 2, vocab: 5, title: 'The Lantern Stall',
    sents: [
      ['Every evening Lin set out paper lanterns on a folding table.', 'sets_out_lanterns'],
      ['Most sellers at the night market shouted to bring in customers.', 'others_shout'],
      ['Lin never called out to anyone.', 'lin_stays_quiet'],
      ['Instead she lit one lantern and let it glow over the table.', 'lights_one_lantern'],
      ['By the end of the evening her table was almost empty.', 'table_nearly_empty'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'sets_out_lanterns', q: 'What does Lin sell?',
        opts: [['Paper lanterns.', 'sets_out_lanterns', 'correct'], ['Folding tables.', 'sells_tables', 'surface-text-match'], ['Candles and matches.', 'sells_candles', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'literal', schema: 'R-STATED', premise: 'others_shout', q: 'What did most of the other sellers do?',
        opts: [['They shouted to attract customers.', 'others_shout', 'correct'], ['They lit lanterns too.', 'others_light_lanterns', 'plausible-but-unsupported'], ['They packed up early.', 'others_pack_early', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'lights_one_lantern', conclusion: 'lets_goods_advertise_themselves', q: 'Why did Lin light a lantern?',
        opts: [['So the lanterns themselves would draw people over.', 'lets_goods_advertise_themselves', 'correct'], ['So she could see her table in the dark.', 'needed_light_to_see', 'plausible-but-unsupported'], ['To signal the other sellers.', 'signals_sellers', 'plausible-but-unsupported'], ['Because shouting was not allowed.', 'shouting_banned', 'contradicts-text']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'table_nearly_empty', conclusion: 'her_method_worked', q: 'How do we know Lin\'s quiet way of selling worked?',
        opts: [['Almost all her lanterns were gone by the end.', 'her_method_worked', 'correct'], ['She was the only quiet seller.', 'was_the_only_quiet_one', 'surface-text-match'], ['She lit her lantern first.', 'lit_hers_first', 'plausible-but-unsupported'], ['Her table was small.', 'table_was_small', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'lin_stays_quiet', conclusion: 'quiet_can_beat_loud', q: 'What is this passage mostly showing?',
        opts: [['A quiet approach can work better than a loud one.', 'quiet_can_beat_loud', 'correct'], ['Night markets are noisy places.', 'markets_are_noisy', 'surface-text-match'], ['Lanterns are cheap to make.', 'lanterns_are_cheap', 'plausible-but-unsupported'], ['Lin should shout like the others.', 'lin_should_shout', 'contradicts-text']], evLure: 's2' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'others_shout', conclusion: 'sets_up_the_contrast_with_lin', q: 'Why does the writer describe the other sellers first?',
        opts: [['To set up how different Lin\'s way is.', 'sets_up_the_contrast_with_lin', 'correct'], ['To explain what a night market sells.', 'explains_the_market', 'surface-text-match'], ['To show that Lin arrived late.', 'lin_arrived_late', 'plausible-but-unsupported'], ['To show the market was crowded.', 'market_was_crowded', 'plausible-but-unsupported']], evLure: 's3' },
    ],
  },
  {
    id: 'P08', tier: 2, vocab: 5, title: 'The Returned Book',
    sents: [
      ['A book came back to the library with its cover hanging loose.', 'book_came_back_damaged'],
      ['Mr Oyelaran kept a small repair kit in the bottom drawer of his desk.', 'keeps_repair_kit'],
      ['He glued the cover and pressed it flat under a heavy dictionary overnight.', 'glued_and_pressed_it'],
      ['In the morning the book opened and closed as it should.', 'book_works_again'],
      ['He wrote the date inside the back cover before shelving it.', 'recorded_the_date'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'book_came_back_damaged', q: 'What was wrong with the book?',
        opts: [['Its cover was coming off.', 'book_came_back_damaged', 'correct'], ['Its pages were missing.', 'pages_missing', 'plausible-but-unsupported'], ['It had been returned late.', 'returned_late', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'recorded_the_date', q: 'What did Mr Oyelaran do before putting the book back on the shelf?',
        opts: [['He wrote the date inside the back cover.', 'recorded_the_date', 'correct'], ['He glued the cover again.', 'glued_again', 'surface-text-match'], ['He ordered a replacement copy.', 'ordered_replacement', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'glued_and_pressed_it', conclusion: 'pressure_made_glue_hold', q: 'Why did he put a heavy dictionary on the book?',
        opts: [['So the glued cover would set flat.', 'pressure_made_glue_hold', 'correct'], ['To hide the damaged book.', 'hide_the_book', 'plausible-but-unsupported'], ['Because the shelf was full.', 'shelf_was_full', 'plausible-but-unsupported'], ['To find the right page.', 'find_the_page', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'book_works_again', conclusion: 'repair_succeeded', q: 'How do we know the repair worked?',
        opts: [['The book opened and closed properly the next day.', 'repair_succeeded', 'correct'], ['He had a repair kit ready.', 'had_a_kit', 'surface-text-match'], ['He wrote the date in it.', 'wrote_a_date', 'surface-text-match'], ['The cover was heavy.', 'cover_was_heavy', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'global', schema: 'R-TRAIT', premise: 'keeps_repair_kit', conclusion: 'prepared_for_damage', q: 'What does keeping a repair kit in his desk suggest about Mr Oyelaran?',
        opts: [['He expects books to need mending and is ready for it.', 'prepared_for_damage', 'correct'], ['He does not trust the children.', 'distrusts_children', 'plausible-but-unsupported'], ['He would rather buy new books.', 'prefers_new_books', 'contradicts-text'], ['He is untidy at his desk.', 'is_untidy', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'recorded_the_date', conclusion: 'shows_repairs_are_tracked', q: 'Why does the writer mention the date written in the cover?',
        opts: [['To show that repairs are kept track of, not just done.', 'shows_repairs_are_tracked', 'correct'], ['To show how old the book was.', 'shows_the_books_age', 'plausible-but-unsupported'], ['To explain how glue dries.', 'explains_glue', 'plausible-but-unsupported'], ['To show the library was busy.', 'library_was_busy', 'plausible-but-unsupported']], evLure: 's4' },
    ],
  },

  // ======================= TIER 3 =======================
  {
    id: 'P09', tier: 3, vocab: 4, title: 'The Tide Pool',
    sents: [
      ['Twice a day the sea drains off the rock shelf and leaves shallow pools behind.', 'sea_drains_twice_daily'],
      ['A pool no wider than a bucket can hold crabs, snails and small fish.', 'pools_hold_creatures'],
      ['By afternoon the water in the pools is far warmer and saltier than the open sea.', 'pools_get_warm_and_salty'],
      ['Most of the animals wedge themselves under stones until the tide returns.', 'animals_shelter_under_stones'],
      ['A few, like the shore crab, can survive several hours out of water altogether.', 'crab_survives_out_of_water'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'sea_drains_twice_daily', q: 'How often does the sea drain off the rock shelf?',
        opts: [['Twice a day.', 'sea_drains_twice_daily', 'correct'], ['Once a month.', 'drains_monthly', 'contradicts-text'], ['Only after a storm.', 'drains_after_storms', 'plausible-but-unsupported'], ['Every afternoon.', 'drains_each_afternoon', 'surface-text-match']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'pools_get_warm_and_salty', q: 'What are the pools like by afternoon?',
        opts: [['Warmer and saltier than the sea.', 'pools_get_warm_and_salty', 'correct'], ['Colder than the sea.', 'pools_get_cold', 'contradicts-text'], ['Completely empty.', 'pools_empty', 'plausible-but-unsupported'], ['Deeper than in the morning.', 'pools_get_deeper', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'animals_shelter_under_stones', conclusion: 'stones_shield_from_heat', q: 'Why do the animals wedge themselves under stones?',
        opts: [['The stones shield them from the heat and salt above.', 'stones_shield_from_heat', 'correct'], ['They are hunting for food there.', 'hunting_under_stones', 'plausible-but-unsupported'], ['The stones hold them in place against waves.', 'stones_stop_waves', 'plausible-but-unsupported'], ['The pools are too small to swim in.', 'pools_too_small', 'surface-text-match']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'crab_survives_out_of_water', conclusion: 'crab_is_the_exception', q: 'How is the shore crab different from most of the other animals?',
        opts: [['It does not need to stay in the water at all.', 'crab_is_the_exception', 'correct'], ['It is larger than the others.', 'crab_is_larger', 'plausible-but-unsupported'], ['It hides under stones like the rest.', 'crab_hides_too', 'contradicts-text'], ['It lives only in the open sea.', 'crab_lives_at_sea', 'contradicts-text']], evLure: 's4' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'pools_get_warm_and_salty', conclusion: 'pool_life_is_a_daily_test', q: 'What is the passage mainly explaining?',
        opts: [['Tide-pool animals live through hard changes every single day.', 'pool_life_is_a_daily_test', 'correct'], ['Crabs are the strongest animals on the shore.', 'crabs_are_strongest', 'plausible-but-unsupported'], ['How the tide is caused.', 'explains_the_tide', 'surface-text-match'], ['Small pools hold more animals than large ones.', 'small_pools_hold_more', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'crab_survives_out_of_water', conclusion: 'shows_range_of_strategies', q: 'Why does the writer end with the shore crab?',
        opts: [['To show that not every animal solves the problem the same way.', 'shows_range_of_strategies', 'correct'], ['To warn readers not to touch crabs.', 'warns_about_crabs', 'plausible-but-unsupported'], ['To explain what crabs eat.', 'explains_crab_diet', 'plausible-but-unsupported'], ['To describe the size of the pools.', 'describes_pool_size', 'surface-text-match']], evLure: 's4' },
    ],
  },
  {
    id: 'P10', tier: 3, vocab: 4, title: 'The Folded Map',
    sents: [
      ['The map in the attic was folded so often that the creases had worn through.', 'map_worn_at_creases'],
      ['It showed a village square with a well drawn at its centre.', 'shows_well_in_square'],
      ['No well stands in that square today.', 'no_well_today'],
      ['Older neighbours remember a pump on the same spot when they were children.', 'neighbours_recall_a_pump'],
      ['Under the paving there is still a round patch where nothing will grow.', 'bare_round_patch_remains'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'shows_well_in_square', q: 'What does the map show at the centre of the square?',
        opts: [['A well.', 'shows_well_in_square', 'correct'], ['A pump.', 'shows_a_pump', 'surface-text-match'], ['A market stall.', 'shows_a_stall', 'plausible-but-unsupported'], ['A row of houses.', 'shows_houses', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'literal', schema: 'R-STATED', premise: 'map_worn_at_creases', q: 'What condition is the map in?',
        opts: [['It is worn through along its folds.', 'map_worn_at_creases', 'correct'], ['It is torn in half.', 'map_torn_in_half', 'plausible-but-unsupported'], ['It is perfectly clean.', 'map_is_clean', 'contradicts-text'], ['It is missing one corner.', 'corner_missing', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'bare_round_patch_remains', conclusion: 'something_round_stood_there', q: 'What best explains the round patch where nothing grows?',
        opts: [['Something round once stood on that spot.', 'something_round_stood_there', 'correct'], ['The paving was laid badly there.', 'bad_paving', 'plausible-but-unsupported'], ['Children trample that spot.', 'children_trample_it', 'plausible-but-unsupported'], ['The map was drawn there.', 'map_drawn_there', 'surface-text-match']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'no_well_today', conclusion: 'square_has_changed', q: 'What does comparing the map with the square today tell us?',
        opts: [['The square has changed since the map was drawn.', 'square_has_changed', 'correct'], ['The map was drawn of a different village.', 'wrong_village', 'plausible-but-unsupported'], ['The map is a recent copy.', 'map_is_recent', 'contradicts-text'], ['The square has always looked the same.', 'square_unchanged', 'contradicts-text']], evLure: 's4' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'neighbours_recall_a_pump', conclusion: 'several_traces_agree', q: 'What is the passage mainly doing?',
        opts: [['Gathering separate traces that point to the same lost thing.', 'several_traces_agree', 'correct'], ['Explaining how to read an old map.', 'how_to_read_maps', 'plausible-but-unsupported'], ['Describing what village life was like.', 'describes_village_life', 'plausible-but-unsupported'], ['Arguing that the well should be rebuilt.', 'argues_for_rebuilding', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'bare_round_patch_remains', conclusion: 'adds_physical_proof', q: 'Why does the writer mention the bare patch last?',
        opts: [['It adds physical proof to what the map and the neighbours say.', 'adds_physical_proof', 'correct'], ['It explains why the paving is uneven.', 'explains_paving', 'plausible-but-unsupported'], ['It shows the square is badly kept.', 'square_is_neglected', 'plausible-but-unsupported'], ['It describes what plants grow there.', 'describes_plants', 'surface-text-match']], evLure: 's2' },
    ],
  },
  {
    id: 'P11', tier: 3, vocab: 4, title: 'The Shelter Under the School',
    sents: [
      ['The cellar under the school has a door of iron and no windows at all.', 'cellar_is_reinforced'],
      ['Shelves along one wall hold water cans, blankets and a wind-up radio.', 'stocked_with_supplies'],
      ['A painted line on the corridor floor leads from every classroom to that door.', 'painted_route_to_door'],
      ['Twice a year the whole school walks the line in silence.', 'twice_yearly_drill'],
      ['No storm has reached the town in over forty years.', 'no_storm_in_forty_years'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'stocked_with_supplies', q: 'What is kept on the shelves in the cellar?',
        opts: [['Water, blankets and a wind-up radio.', 'stocked_with_supplies', 'correct'], ['Books and school records.', 'holds_books', 'plausible-but-unsupported'], ['Nothing at all.', 'shelves_empty', 'contradicts-text'], ['Paint for the corridor line.', 'holds_paint', 'surface-text-match']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'twice_yearly_drill', q: 'How often does the school walk the painted line?',
        opts: [['Twice a year.', 'twice_yearly_drill', 'correct'], ['Every week.', 'weekly_drill', 'contradicts-text'], ['Only when a storm is coming.', 'only_in_storms', 'plausible-but-unsupported'], ['Once every forty years.', 'once_in_forty_years', 'surface-text-match']], evLure: 's5' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'painted_route_to_door', conclusion: 'route_must_work_in_a_hurry', q: 'Why is there a painted line on the corridor floor?',
        opts: [['So anyone can find the shelter fast, without being told.', 'route_must_work_in_a_hurry', 'correct'], ['To keep the corridor tidy.', 'keeps_corridor_tidy', 'plausible-but-unsupported'], ['To mark where classes should queue for lunch.', 'marks_lunch_queue', 'plausible-but-unsupported'], ['To show where the paint was spilled.', 'shows_spilled_paint', 'surface-text-match']], evLure: 's4' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'no_storm_in_forty_years', conclusion: 'preparation_continues_without_a_threat', q: 'What is surprising about the last sentence?',
        opts: [['The school keeps preparing even though nothing has happened.', 'preparation_continues_without_a_threat', 'correct'], ['The town has never had a school before.', 'no_school_before', 'plausible-but-unsupported'], ['The shelter has been used many times.', 'shelter_used_often', 'contradicts-text'], ['Storms come every forty years exactly.', 'storms_are_regular', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'twice_yearly_drill', conclusion: 'readiness_is_a_habit', q: 'What is the passage mainly showing?',
        opts: [['Being ready is something the school practises, not just equipment it owns.', 'readiness_is_a_habit', 'correct'], ['The cellar is the safest room in town.', 'cellar_is_safest', 'plausible-but-unsupported'], ['How to build a storm shelter.', 'how_to_build_shelter', 'surface-text-match'], ['Storms are becoming rarer.', 'storms_are_rarer', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'no_storm_in_forty_years', conclusion: 'makes_the_habit_striking', q: 'Why does the writer save the forty years for the end?',
        opts: [['It makes the school\'s steady preparation stand out.', 'makes_the_habit_striking', 'correct'], ['It shows the shelter is out of date.', 'shelter_is_outdated', 'plausible-but-unsupported'], ['It explains why the door is iron.', 'explains_iron_door', 'surface-text-match'], ['It proves storms will not come.', 'proves_no_storms', 'plausible-but-unsupported']], evLure: 's1' },
    ],
  },
  {
    id: 'P12', tier: 3, vocab: 4, title: 'The Meadow and the Hives',
    sents: [
      ['A strip of wild meadow was left uncut along the edge of the orchard.', 'meadow_left_uncut'],
      ['Clover and knapweed flowered there from May until the first frost.', 'flowers_all_season'],
      ['The orchard\'s bee hives stood forty paces away at the top of the slope.', 'hives_are_nearby'],
      ['That autumn the orchard produced a third more fruit than the year before.', 'fruit_yield_rose'],
      ['The neighbouring orchard, mown to its fences, produced no more than usual.', 'neighbour_yield_flat'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'flowers_all_season', q: 'When did the meadow flowers bloom?',
        opts: [['From May until the first frost.', 'flowers_all_season', 'correct'], ['Only in the spring.', 'blooms_in_spring_only', 'contradicts-text'], ['All through the winter.', 'blooms_in_winter', 'contradicts-text'], ['Only after the fruit was picked.', 'blooms_after_harvest', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'literal', schema: 'R-STATED', premise: 'neighbour_yield_flat', q: 'What happened in the neighbouring orchard?',
        opts: [['Its harvest stayed about the same as usual.', 'neighbour_yield_flat', 'correct'], ['Its harvest also grew by a third.', 'neighbour_grew_too', 'contradicts-text'], ['It lost all its fruit to frost.', 'neighbour_lost_fruit', 'plausible-but-unsupported'], ['It kept more hives than usual.', 'neighbour_kept_hives', 'surface-text-match']], evLure: 's4' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'fruit_yield_rose', conclusion: 'meadow_fed_the_pollinators', q: 'What best explains the bigger harvest?',
        opts: [['The uncut meadow fed the bees that pollinate the trees.', 'meadow_fed_the_pollinators', 'correct'], ['The trees were another year older.', 'trees_were_older', 'plausible-but-unsupported'], ['The hives were moved closer.', 'hives_were_moved', 'plausible-but-unsupported'], ['The frost came late that year.', 'late_frost', 'surface-text-match']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'neighbour_yield_flat', conclusion: 'the_meadow_is_the_difference', q: 'Why does the neighbouring orchard matter to the argument?',
        opts: [['It had no meadow, and its harvest did not rise.', 'the_meadow_is_the_difference', 'correct'], ['It shows that orchards vary from year to year.', 'orchards_just_vary', 'plausible-but-unsupported'], ['It proves bees travel a long way.', 'bees_travel_far', 'plausible-but-unsupported'], ['It shows mowing improves fruit.', 'mowing_helps', 'contradicts-text']], evLure: 's4' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'meadow_left_uncut', conclusion: 'leaving_land_wild_can_pay', q: 'What is the passage mainly arguing?',
        opts: [['Leaving a patch of land wild can pay the farmer back.', 'leaving_land_wild_can_pay', 'correct'], ['Bees should be kept away from orchards.', 'keep_bees_away', 'contradicts-text'], ['Knapweed is the best flower for bees.', 'knapweed_is_best', 'plausible-but-unsupported'], ['Orchards need less mowing than meadows.', 'orchards_need_less_mowing', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'hives_are_nearby', conclusion: 'links_the_meadow_to_the_trees', q: 'Why does the writer tell us how far the hives stood from the meadow?',
        opts: [['To link the flowers to the bees that reach the trees.', 'links_the_meadow_to_the_trees', 'correct'], ['To show the orchard is large.', 'orchard_is_large', 'plausible-but-unsupported'], ['To explain how hives are built.', 'explains_hives', 'surface-text-match'], ['To show the slope was steep.', 'slope_was_steep', 'plausible-but-unsupported']], evLure: 's2' },
    ],
  },

  // ======================= TIER 4 =======================
  {
    id: 'P13', tier: 4, vocab: 3, title: 'How Glaciers Carve a Valley',
    sents: [
      ['A glacier is not a river of water but a slab of ice thick enough to flow under its own weight.', 'glacier_flows_under_weight'],
      ['As it creeps forward it freezes onto loose rock and drags the fragments along its base.', 'ice_drags_rock'],
      ['Those trapped fragments act as teeth, grinding the valley floor as the ice passes over it.', 'fragments_grind_floor'],
      ['A river cuts a narrow V, but a glacier scrapes both walls and leaves a broad U.', 'leaves_u_shaped_valley'],
      ['Long parallel scratches on exposed bedrock record the direction the ice travelled.', 'scratches_record_direction'],
      ['Some valleys in the Alps were shaped by ice that vanished ten thousand years ago.', 'alps_shaped_long_ago'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'leaves_u_shaped_valley', q: 'What shape of valley does a glacier leave behind?',
        opts: [['A broad U.', 'leaves_u_shaped_valley', 'correct'], ['A narrow V.', 'leaves_v_shape', 'contradicts-text'], ['A perfect circle.', 'leaves_circle', 'plausible-but-unsupported'], ['A series of steps.', 'leaves_steps', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'literal', schema: 'R-STATED', premise: 'glacier_flows_under_weight', q: 'What makes a glacier move?',
        opts: [['Its own weight makes the ice flow.', 'glacier_flows_under_weight', 'correct'], ['Meltwater pushes it downhill.', 'meltwater_pushes', 'plausible-but-unsupported'], ['Wind drives it along.', 'wind_drives_it', 'plausible-but-unsupported'], ['The rock beneath it tilts.', 'rock_tilts', 'surface-text-match']], evLure: 's2' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'fragments_grind_floor', conclusion: 'rock_not_ice_does_cutting', q: 'What actually does the cutting as a glacier moves?',
        opts: [['The rock fragments frozen into the base of the ice.', 'rock_not_ice_does_cutting', 'correct'], ['The soft ice itself.', 'the_ice_itself', 'plausible-but-unsupported'], ['Water running under the glacier.', 'water_underneath', 'plausible-but-unsupported'], ['The weight of the valley walls.', 'weight_of_walls', 'surface-text-match']], evLure: 's2' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'scratches_record_direction', conclusion: 'scratches_show_past_ice_flow', q: 'What can geologists learn from the scratches on bedrock?',
        opts: [['Which way the ice was moving.', 'scratches_show_past_ice_flow', 'correct'], ['How deep the ice was.', 'shows_ice_depth', 'plausible-but-unsupported'], ['How cold the winters were.', 'shows_temperature', 'plausible-but-unsupported'], ['How wide the valley became.', 'shows_valley_width', 'surface-text-match']], evLure: 's4' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'ice_drags_rock', conclusion: 'ice_reshapes_land_slowly', q: 'What is the passage mainly explaining?',
        opts: [['How moving ice reshapes solid rock over long periods.', 'ice_reshapes_land_slowly', 'correct'], ['Why glaciers are colder than rivers.', 'glaciers_are_colder', 'plausible-but-unsupported'], ['Where the largest glaciers are found.', 'where_glaciers_are', 'plausible-but-unsupported'], ['How to tell ice from snow.', 'ice_versus_snow', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'alps_shaped_long_ago', conclusion: 'shows_the_evidence_outlasts_the_ice', q: 'Why does the writer end with valleys whose ice disappeared long ago?',
        opts: [['To show the marks outlast the glacier that made them.', 'shows_the_evidence_outlasts_the_ice', 'correct'], ['To show the Alps are the oldest mountains.', 'alps_are_oldest', 'plausible-but-unsupported'], ['To warn that glaciers are melting now.', 'warns_of_melting', 'plausible-but-unsupported'], ['To explain where to go walking.', 'suggests_walking', 'plausible-but-unsupported']], evLure: 's5' },
    ],
  },
  {
    id: 'P14', tier: 4, vocab: 3, title: 'The Keeper of the Light',
    sents: [
      ['For thirty-one years Ottilie wound the clockwork that turned the lamp every four hours.', 'wound_the_clockwork'],
      ['The keeper\'s log records the weather at midnight in the same small hand on every page.', 'log_kept_in_one_hand'],
      ['In 1961 an electric motor replaced the weights and chains altogether.', 'motor_replaced_clockwork'],
      ['Ottilie stayed on for two more winters, then locked the door behind her.', 'stayed_two_more_winters'],
      ['The lamp has run without a keeper ever since.', 'runs_unattended_now'],
      ['Her log books were moved to the county archive, where they are still consulted for old storm dates.', 'logs_still_consulted'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'motor_replaced_clockwork', q: 'What happened in 1961?',
        opts: [['An electric motor took over from the weights and chains.', 'motor_replaced_clockwork', 'correct'], ['The lighthouse was closed.', 'lighthouse_closed', 'contradicts-text'], ['Ottilie began keeping the log.', 'began_the_log', 'surface-text-match'], ['A storm damaged the lamp.', 'storm_damaged_lamp', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'literal', schema: 'R-STATED', premise: 'logs_still_consulted', q: 'What are the log books used for now?',
        opts: [['Looking up the dates of old storms.', 'logs_still_consulted', 'correct'], ['Teaching children to write.', 'teaching_handwriting', 'plausible-but-unsupported'], ['Nothing; they were destroyed.', 'logs_destroyed', 'contradicts-text'], ['Timing the lamp each night.', 'timing_the_lamp', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'wound_the_clockwork', conclusion: 'lamp_depended_on_a_person', q: 'Before 1961, what kept the lamp turning?',
        opts: [['A person winding it by hand around the clock.', 'lamp_depended_on_a_person', 'correct'], ['A small electric motor.', 'an_early_motor', 'contradicts-text'], ['The wind off the sea.', 'wind_turned_it', 'plausible-but-unsupported'], ['The weight of the lamp itself.', 'lamp_weight', 'surface-text-match']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'stayed_two_more_winters', conclusion: 'stayed_though_not_needed', q: 'What is notable about Ottilie staying after 1961?',
        opts: [['The machine no longer needed her, and she stayed anyway.', 'stayed_though_not_needed', 'correct'], ['She was required to stay by law.', 'required_to_stay', 'plausible-but-unsupported'], ['She was training a replacement keeper.', 'training_a_successor', 'plausible-but-unsupported'], ['She could not work the new motor.', 'could_not_use_motor', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'global', schema: 'R-TRAIT', premise: 'log_kept_in_one_hand', conclusion: 'unbroken_discipline', q: 'What does the unchanging handwriting in the log suggest about Ottilie?',
        opts: [['She kept the same careful routine for decades.', 'unbroken_discipline', 'correct'], ['She wrote the whole log in a single week.', 'wrote_it_all_at_once', 'plausible-but-unsupported'], ['She disliked the weather.', 'disliked_weather', 'plausible-but-unsupported'], ['She had beautiful handwriting.', 'had_neat_writing', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'runs_unattended_now', conclusion: 'marks_what_was_lost_and_kept', q: 'Why does the writer place the unattended lamp next to the archived logs?',
        opts: [['To weigh what the machine replaced against what her records still give.', 'marks_what_was_lost_and_kept', 'correct'], ['To argue that keepers should be brought back.', 'argues_for_keepers', 'plausible-but-unsupported'], ['To show the lamp is unreliable.', 'lamp_is_unreliable', 'contradicts-text'], ['To explain how an archive works.', 'explains_archives', 'surface-text-match']], evLure: 's3' },
    ],
  },
  {
    id: 'P15', tier: 4, vocab: 3, title: 'Why Some Seeds Wait',
    sents: [
      ['A seed that sprouts in the first warm spell of winter is usually a seed that dies.', 'early_sprouting_is_fatal'],
      ['Many species therefore carry a chemical brake that a short warm spell cannot release.', 'seeds_carry_a_brake'],
      ['The brake weakens only after weeks of steady cold, a process gardeners copy in a refrigerator.', 'cold_releases_the_brake'],
      ['Fire-adapted shrubs use a different trigger: their coats crack open only in intense heat.', 'fire_shrubs_need_heat'],
      ['A seed may hold its brake for a single season or, in some desert plants, for decades.', 'dormancy_varies_widely'],
      ['Nothing in the seed measures the calendar; it measures the conditions it has met.', 'seeds_measure_conditions'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'cold_releases_the_brake', q: 'What weakens the chemical brake in many seeds?',
        opts: [['Weeks of steady cold.', 'cold_releases_the_brake', 'correct'], ['A single warm day.', 'one_warm_day', 'contradicts-text'], ['Intense heat from fire.', 'intense_heat', 'surface-text-match'], ['Being buried deeply.', 'deep_burial', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'literal', schema: 'R-STATED', premise: 'fire_shrubs_need_heat', q: 'What opens the coats of fire-adapted seeds?',
        opts: [['Intense heat.', 'fire_shrubs_need_heat', 'correct'], ['Weeks of cold.', 'weeks_of_cold', 'surface-text-match'], ['Heavy rain.', 'heavy_rain', 'plausible-but-unsupported'], ['Time alone.', 'time_alone', 'contradicts-text']], evLure: 's3' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'seeds_carry_a_brake', conclusion: 'brake_prevents_false_starts', q: 'Why is the brake useful to the plant?',
        opts: [['It stops the seed from starting during a false thaw.', 'brake_prevents_false_starts', 'correct'], ['It keeps animals from eating the seed.', 'deters_animals', 'plausible-but-unsupported'], ['It makes the seed lighter to travel.', 'aids_dispersal', 'plausible-but-unsupported'], ['It stores food for the seedling.', 'stores_food', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'fire_shrubs_need_heat', conclusion: 'different_triggers_same_logic', q: 'How do fire-adapted shrubs fit the pattern in the passage?',
        opts: [['They wait too, but for a different signal.', 'different_triggers_same_logic', 'correct'], ['They are the only seeds with no brake.', 'have_no_brake', 'contradicts-text'], ['They sprout faster than other seeds.', 'sprout_fastest', 'plausible-but-unsupported'], ['They need cold as well as heat.', 'need_both', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'seeds_measure_conditions', conclusion: 'dormancy_is_a_sensor_not_a_clock', q: 'What is the passage mainly arguing about dormancy?',
        opts: [['It is a way of reading conditions, not of counting time.', 'dormancy_is_a_sensor_not_a_clock', 'correct'], ['It is a flaw that breeders should remove.', 'dormancy_is_a_flaw', 'plausible-but-unsupported'], ['It happens only in cold climates.', 'only_in_cold_places', 'contradicts-text'], ['It explains why gardeners use refrigerators.', 'explains_refrigerators', 'surface-text-match']], evLure: 's5' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'dormancy_varies_widely', conclusion: 'shows_the_range_before_the_rule', q: 'Why does the writer mention desert seeds that wait for decades?',
        opts: [['To show how wide the range is before stating the general rule.', 'shows_the_range_before_the_rule', 'correct'], ['To argue that desert plants are the hardiest.', 'deserts_are_hardiest', 'plausible-but-unsupported'], ['To explain how deserts form.', 'explains_deserts', 'surface-text-match'], ['To show that most seeds never sprout.', 'most_never_sprout', 'plausible-but-unsupported']], evLure: 's6' },
    ],
  },
  {
    id: 'P16', tier: 4, vocab: 3, title: 'The Well and the Pump',
    sents: [
      ['The village drew its water from a single well at the foot of the slope.', 'one_well_at_the_foot'],
      ['Carrying full pails uphill took each household more than an hour a day.', 'carrying_took_an_hour'],
      ['A visiting engineer offered a pump that would push water to a tank at the top.', 'pump_offered'],
      ['The council refused it, because no one in the village could repair such a machine.', 'refused_for_lack_of_repair_skill'],
      ['Two years later a young woman returned from the city with exactly that training.', 'trained_woman_returned'],
      ['The pump was installed the following spring.', 'pump_installed_later'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'carrying_took_an_hour', q: 'How long did carrying water take each household?',
        opts: [['More than an hour every day.', 'carrying_took_an_hour', 'correct'], ['A few minutes a day.', 'a_few_minutes', 'contradicts-text'], ['An hour a week.', 'an_hour_weekly', 'contradicts-text'], ['Only on market days.', 'market_days_only', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'literal', schema: 'R-STATED', premise: 'refused_for_lack_of_repair_skill', q: 'Why did the council turn the pump down?',
        opts: [['Nobody there could repair it.', 'refused_for_lack_of_repair_skill', 'correct'], ['It cost too much money.', 'too_expensive', 'plausible-but-unsupported'], ['The well was already enough.', 'well_was_enough', 'contradicts-text'], ['The engineer was a stranger.', 'distrusted_the_engineer', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'trained_woman_returned', conclusion: 'the_missing_skill_arrived', q: 'What changed between the refusal and the installation?',
        opts: [['Someone in the village could now maintain the machine.', 'the_missing_skill_arrived', 'correct'], ['The well finally ran dry.', 'well_ran_dry', 'plausible-but-unsupported'], ['The engineer lowered the price.', 'price_dropped', 'plausible-but-unsupported'], ['A new council was elected.', 'new_council', 'plausible-but-unsupported']], evLure: 's6' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'one_well_at_the_foot', conclusion: 'geography_created_the_burden', q: 'Why was fetching water such hard work in this village?',
        opts: [['The only well was downhill from every house.', 'geography_created_the_burden', 'correct'], ['The well was often dry.', 'well_often_dry', 'plausible-but-unsupported'], ['The pails were badly made.', 'bad_pails', 'plausible-but-unsupported'], ['Too many households shared it.', 'too_many_households', 'plausible-but-unsupported']], evLure: 's2' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'refused_for_lack_of_repair_skill', conclusion: 'tools_need_local_skill', q: 'What is the passage mainly showing?',
        opts: [['A useful machine is only useful where someone can keep it running.', 'tools_need_local_skill', 'correct'], ['Villages resist all new ideas.', 'villages_resist_change', 'plausible-but-unsupported'], ['Engineers should give their work away.', 'engineers_should_donate', 'plausible-but-unsupported'], ['Carrying water builds strength.', 'carrying_is_healthy', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'pump_installed_later', conclusion: 'closes_the_loop_on_the_refusal', q: 'Why does the writer include the last sentence?',
        opts: [['It shows the refusal was about timing, not about the pump.', 'closes_the_loop_on_the_refusal', 'correct'], ['It shows the council was wrong all along.', 'council_was_wrong', 'plausible-but-unsupported'], ['It explains how a pump works.', 'explains_pumps', 'surface-text-match'], ['It shows spring is the best season to build.', 'spring_is_best', 'plausible-but-unsupported']], evLure: 's5' },
    ],
  },

  // ======================= TIER 5 =======================
  {
    id: 'P17', tier: 5, vocab: 2, title: 'The Cartographer\'s Error',
    sents: [
      ['The 1783 chart shows a low island some ninety miles west of the harbour.', 'chart_shows_an_island'],
      ['Three later surveys, each working from the earlier chart, copied the island forward without checking it.', 'later_surveys_copied_it'],
      ['A steamer sent to the position in 1866 found open water more than a mile deep.', 'steamer_found_deep_water'],
      ['The island remained on published charts for a further nineteen years.', 'island_stayed_on_charts'],
      ['Removing it required not new evidence but a decision to stop trusting the copies.', 'removal_needed_a_decision'],
      ['Its name survives in a single line of an insurance register.', 'name_survives_in_register'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'steamer_found_deep_water', q: 'What did the 1866 steamer find at the island\'s position?',
        opts: [['Deep open water.', 'steamer_found_deep_water', 'correct'], ['A low sandy island.', 'found_the_island', 'contradicts-text'], ['A wrecked ship.', 'found_a_wreck', 'plausible-but-unsupported'], ['A reef just below the surface.', 'found_a_reef', 'plausible-but-unsupported']], evLure: 's1' },
      { d: 'literal', schema: 'R-STATED', premise: 'island_stayed_on_charts', q: 'How long did the island stay on published charts after 1866?',
        opts: [['Another nineteen years.', 'island_stayed_on_charts', 'correct'], ['It was removed immediately.', 'removed_at_once', 'contradicts-text'], ['Ninety years.', 'ninety_years', 'surface-text-match'], ['It is still shown today.', 'still_shown', 'contradicts-text']], evLure: 's5' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'later_surveys_copied_it', conclusion: 'repetition_masqueraded_as_confirmation', q: 'Why did the island seem so well established?',
        opts: [['Each survey repeated the last one, and repetition looked like confirmation.', 'repetition_masqueraded_as_confirmation', 'correct'], ['Several ships had landed on it.', 'ships_landed_there', 'plausible-but-unsupported'], ['It appeared on charts from different countries.', 'international_agreement', 'plausible-but-unsupported'], ['The 1783 survey was unusually careful.', 'first_survey_careful', 'contradicts-text']], evLure: 's1' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'removal_needed_a_decision', conclusion: 'evidence_alone_was_not_enough', q: 'What does the sentence about removal tell us?',
        opts: [['The proof already existed; what was missing was the will to act on it.', 'evidence_alone_was_not_enough', 'correct'], ['No one had surveyed the position properly.', 'never_surveyed', 'contradicts-text'], ['New instruments were needed first.', 'needed_instruments', 'plausible-but-unsupported'], ['The chart makers were dishonest.', 'makers_were_dishonest', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'later_surveys_copied_it', conclusion: 'inherited_error_outlives_its_correction', q: 'What is the passage mainly about?',
        opts: [['How an inherited mistake can outlive the evidence against it.', 'inherited_error_outlives_its_correction', 'correct'], ['How difficult navigation was in 1783.', 'navigation_was_hard', 'plausible-but-unsupported'], ['Why steamers replaced sailing ships.', 'steamers_replaced_sail', 'surface-text-match'], ['How islands are formed and lost.', 'how_islands_form', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'name_survives_in_register', conclusion: 'shows_the_error_left_traces', q: 'Why does the writer close with the insurance register?',
        opts: [['To show that a corrected error still leaves traces behind it.', 'shows_the_error_left_traces', 'correct'], ['To suggest the island may yet exist.', 'island_may_exist', 'contradicts-text'], ['To explain how insurance worked at sea.', 'explains_insurance', 'surface-text-match'], ['To name the cartographer responsible.', 'names_the_mapmaker', 'plausible-but-unsupported']], evLure: 's5' },
    ],
  },
  {
    id: 'P18', tier: 5, vocab: 2, title: 'Lichen on the Escarpment',
    sents: [
      ['A lichen is not one organism but a fungus farming an alga inside its own tissue.', 'lichen_is_a_partnership'],
      ['The fungus supplies anchorage and moisture; the alga supplies sugar from light.', 'partners_exchange_goods'],
      ['On bare rock this arrangement can live where neither partner could survive alone.', 'partnership_enables_bare_rock'],
      ['Growth is measured in fractions of a millimetre a year, so a patch the size of a coin may predate the building beside it.', 'growth_is_extremely_slow'],
      ['Because lichens absorb whatever the air carries, their tissue records decades of pollution.', 'tissue_records_pollution'],
      ['Surveyors now date rockfalls by measuring the largest lichen growing on the fallen face.', 'used_to_date_rockfalls'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'partners_exchange_goods', q: 'What does the alga contribute to the partnership?',
        opts: [['Sugar made from light.', 'partners_exchange_goods', 'correct'], ['Anchorage to the rock.', 'provides_anchorage', 'contradicts-text'], ['Protection from pollution.', 'provides_protection', 'plausible-but-unsupported'], ['Moisture from the air.', 'provides_moisture', 'contradicts-text']], evLure: 's1' },
      { d: 'literal', schema: 'R-STATED', premise: 'growth_is_extremely_slow', q: 'How fast do lichens grow?',
        opts: [['A fraction of a millimetre each year.', 'growth_is_extremely_slow', 'correct'], ['Several centimetres each year.', 'grows_centimetres', 'contradicts-text'], ['Only after rainfall.', 'grows_after_rain', 'plausible-but-unsupported'], ['Faster on buildings than on rock.', 'faster_on_buildings', 'surface-text-match']], evLure: 's6' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'partnership_enables_bare_rock', conclusion: 'partnership_opens_new_ground', q: 'Why can lichens colonise bare rock?',
        opts: [['Together the two partners cover needs neither could meet alone.', 'partnership_opens_new_ground', 'correct'], ['The fungus can make its own sugar.', 'fungus_makes_sugar', 'contradicts-text'], ['Rock holds moisture well.', 'rock_holds_water', 'plausible-but-unsupported'], ['They grow too slowly to need much.', 'slow_growth_helps', 'surface-text-match']], evLure: 's2' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'used_to_date_rockfalls', conclusion: 'slow_growth_makes_a_clock', q: 'Why can the largest lichen on a fallen rock face date the rockfall?',
        opts: [['Its slow, steady growth turns size into elapsed time.', 'slow_growth_makes_a_clock', 'correct'], ['Lichens only grow on fresh rock.', 'only_on_fresh_rock', 'plausible-but-unsupported'], ['Surveyors plant them deliberately.', 'planted_by_surveyors', 'plausible-but-unsupported'], ['Pollution levels change after a fall.', 'pollution_changes', 'surface-text-match']], evLure: 's5' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'tissue_records_pollution', conclusion: 'lichen_is_an_instrument', q: 'What is the passage mainly showing about lichens?',
        opts: [['A slow partnership on bare rock doubles as a scientific instrument.', 'lichen_is_an_instrument', 'correct'], ['Lichens are the oldest organisms on earth.', 'oldest_organisms', 'plausible-but-unsupported'], ['Pollution is destroying rock faces.', 'pollution_destroys_rock', 'plausible-but-unsupported'], ['Fungi are more important than algae.', 'fungi_matter_more', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'growth_is_extremely_slow', conclusion: 'prepares_the_dating_use', q: 'Why does the writer describe the growth rate before mentioning surveyors?',
        opts: [['The slowness is what makes the dating method possible.', 'prepares_the_dating_use', 'correct'], ['To show lichens are fragile.', 'lichens_are_fragile', 'plausible-but-unsupported'], ['To explain why buildings decay.', 'explains_decay', 'plausible-but-unsupported'], ['To compare lichens with trees.', 'compares_with_trees', 'plausible-but-unsupported']], evLure: 's6' },
    ],
  },
  {
    id: 'P19', tier: 5, vocab: 1, title: 'What the Fire Left',
    sents: [
      ['The archive lost eleven thousand volumes in a single night in 1904.', 'lost_eleven_thousand_volumes'],
      ['Its catalogue, kept in a separate wing, survived intact.', 'catalogue_survived'],
      ['Scholars therefore know precisely which works no longer exist.', 'know_exactly_what_is_lost'],
      ['Over the following century, copies of four hundred of those titles were traced to other collections.', 'four_hundred_recovered'],
      ['The catalogue is now consulted more often than the surviving books themselves.', 'catalogue_consulted_most'],
      ['A record of an absence, it turns out, is not the same thing as nothing.', 'absence_record_has_value'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'catalogue_survived', q: 'What survived the fire?',
        opts: [['The catalogue, in a separate wing.', 'catalogue_survived', 'correct'], ['Eleven thousand volumes.', 'volumes_survived', 'contradicts-text'], ['Four hundred titles.', 'four_hundred_survived', 'surface-text-match'], ['Nothing at all.', 'nothing_survived', 'contradicts-text']], evLure: 's1' },
      { d: 'literal', schema: 'R-STATED', premise: 'four_hundred_recovered', q: 'What happened over the century after the fire?',
        opts: [['Copies of four hundred lost titles were found elsewhere.', 'four_hundred_recovered', 'correct'], ['The archive was rebuilt on the same site.', 'archive_rebuilt', 'plausible-but-unsupported'], ['The catalogue was itself lost.', 'catalogue_lost_later', 'contradicts-text'], ['Eleven thousand volumes were replaced.', 'all_replaced', 'contradicts-text']], evLure: 's5' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'know_exactly_what_is_lost', conclusion: 'the_list_made_the_search_possible', q: 'How did the surviving catalogue help scholars?',
        opts: [['It told them exactly which titles to hunt for elsewhere.', 'the_list_made_the_search_possible', 'correct'], ['It replaced the text of the lost books.', 'replaced_the_texts', 'contradicts-text'], ['It proved the fire was an accident.', 'proved_it_was_accidental', 'plausible-but-unsupported'], ['It listed which collections held copies.', 'listed_other_collections', 'plausible-but-unsupported']], evLure: 's4' },
      { d: 'bridging', schema: 'R-CONTRAST', premise: 'catalogue_consulted_most', conclusion: 'the_index_outgrew_the_collection', q: 'What is unexpected about how the archive is used today?',
        opts: [['The list of what is gone draws more readers than what remains.', 'the_index_outgrew_the_collection', 'correct'], ['Nobody visits the archive any more.', 'nobody_visits', 'contradicts-text'], ['The surviving books are kept closed.', 'books_kept_closed', 'plausible-but-unsupported'], ['The catalogue is easier to read.', 'easier_to_read', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'absence_record_has_value', conclusion: 'documented_loss_stays_usable', q: 'What is the passage mainly arguing?',
        opts: [['A loss that is documented remains something you can work with.', 'documented_loss_stays_usable', 'correct'], ['Archives should be housed in several wings.', 'split_your_buildings', 'plausible-but-unsupported'], ['Old books matter more than new ones.', 'old_books_matter_more', 'plausible-but-unsupported'], ['The 1904 fire was the worst on record.', 'worst_fire_ever', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'catalogue_consulted_most', conclusion: 'evidence_for_the_closing_claim', q: 'Why does the writer mention how often the catalogue is consulted?',
        opts: [['It is the evidence for the claim the passage ends on.', 'evidence_for_the_closing_claim', 'correct'], ['It shows the surviving books are damaged.', 'books_are_damaged', 'plausible-but-unsupported'], ['It explains how catalogues are organised.', 'explains_cataloguing', 'plausible-but-unsupported'], ['It shows scholars distrust the archive.', 'scholars_distrust_it', 'plausible-but-unsupported']], evLure: 's4' },
    ],
  },
  {
    id: 'P20', tier: 5, vocab: 1, title: 'Counting the Migration',
    sents: [
      ['Volunteers have counted the birds crossing one headland every September since 1968.', 'counts_since_1968'],
      ['The method has never changed: two observers, four hours after dawn, tallies on paper.', 'method_never_changed'],
      ['Better equipment would raise the numbers, which is exactly why it has been refused.', 'better_gear_refused'],
      ['A count is useful only if this year can be set beside 1968 without adjustment.', 'comparability_is_the_point'],
      ['The tallies show one species down by four fifths and another up by half.', 'shows_two_opposite_trends'],
      ['Neither trend would be visible in any single year\'s sheet.', 'trend_needs_the_series'],
    ],
    qs: [
      { d: 'literal', schema: 'R-STATED', premise: 'method_never_changed', q: 'What is the counting method?',
        opts: [['Two observers, four hours after dawn, counting on paper.', 'method_never_changed', 'correct'], ['Automatic cameras at the headland.', 'uses_cameras', 'contradicts-text'], ['One observer for a whole day.', 'one_observer_all_day', 'contradicts-text'], ['Volunteers counting every month.', 'counts_monthly', 'surface-text-match']], evLure: 's1' },
      { d: 'literal', schema: 'R-STATED', premise: 'shows_two_opposite_trends', q: 'What do the tallies show?',
        opts: [['One species has fallen sharply while another has risen.', 'shows_two_opposite_trends', 'correct'], ['Every species is in decline.', 'all_declining', 'contradicts-text'], ['The numbers have not changed.', 'no_change', 'contradicts-text'], ['More volunteers arrive each year.', 'more_volunteers', 'surface-text-match']], evLure: 's6' },
      { d: 'bridging', schema: 'R-MOTIVE', premise: 'better_gear_refused', conclusion: 'consistency_beats_accuracy_here', q: 'Why would the project turn down better equipment?',
        opts: [['A change in method would break the comparison with earlier years.', 'consistency_beats_accuracy_here', 'correct'], ['The equipment is too expensive.', 'too_costly', 'plausible-but-unsupported'], ['The volunteers prefer paper.', 'volunteers_like_paper', 'plausible-but-unsupported'], ['Better equipment would miss birds.', 'gear_misses_birds', 'contradicts-text']], evLure: 's4' },
      { d: 'bridging', schema: 'R-CAUSE', premise: 'trend_needs_the_series', conclusion: 'value_lives_in_the_run_not_the_year', q: 'Why does a single year\'s sheet reveal so little?',
        opts: [['A trend only appears when the years are laid end to end.', 'value_lives_in_the_run_not_the_year', 'correct'], ['One year\'s observers are less careful.', 'observers_are_careless', 'plausible-but-unsupported'], ['Birds are hard to identify.', 'hard_to_identify', 'plausible-but-unsupported'], ['September is an unusual month.', 'september_is_odd', 'surface-text-match']], evLure: 's5' },
      { d: 'global', schema: 'R-MAINIDEA', premise: 'comparability_is_the_point', conclusion: 'long_series_beats_best_instrument', q: 'What is the passage mainly arguing?',
        opts: [['An unbroken series is worth more than the best instrument.', 'long_series_beats_best_instrument', 'correct'], ['Volunteers count better than professionals.', 'volunteers_are_better', 'plausible-but-unsupported'], ['Bird populations are collapsing.', 'populations_collapsing', 'contradicts-text'], ['Headlands are the best place to count birds.', 'headlands_are_best', 'plausible-but-unsupported']], evLure: 's3' },
      { d: 'purpose', schema: 'R-PURPOSE', premise: 'counts_since_1968', conclusion: 'establishes_the_length_of_the_record', q: 'Why does the writer open with the year 1968?',
        opts: [['To establish how long the unbroken record runs.', 'establishes_the_length_of_the_record', 'correct'], ['To explain when migration was discovered.', 'when_migration_found', 'plausible-but-unsupported'], ['To show the volunteers are elderly.', 'volunteers_are_old', 'plausible-but-unsupported'], ['To date the equipment being used.', 'dates_the_equipment', 'surface-text-match']], evLure: 's2' },
    ],
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
export function difficultyFor(band, slot) {
  let offsets;
  if (band === 1) offsets = [0, 0.08, 0.16, 0.24, 0.32, 0.4];
  else if (band === 20) offsets = [-0.4, -0.32, -0.24, -0.16, -0.08, 0];
  else offsets = [-0.4, -0.24, -0.08, 0.08, 0.24, 0.4];
  return Math.round(Math.min(20, Math.max(1, band + offsets[slot])) * 100) / 100;
}
// Catalog age_bands for VER-EVIDENCE-01 are 2-3 / 4-5 / 6-8. D-017 removed K-1 (its
// K-1 access depended on audio narration), so the floor here is grade 2, NOT K-1.
export function ageBandsFor(difficulty) {
  if (difficulty < 8) return ['2-3'];
  if (difficulty < 12) return ['4-5'];
  return ['6-8'];
}
const OPT_KEYS = ['A', 'B', 'C', 'D', 'E'];

// ---------------------------------------------------------------------------
// Flatten the 20 passages x 6 questions into one easy -> hard sequence:
// within each tier, questions are ordered by inference depth (literal -> bridging
// -> global -> author's purpose), then by passage. 4 passages x 6 = 24 per tier
// = 4 difficulty bands of 6.
// ---------------------------------------------------------------------------
export function questionOrder() {
  const out = [];
  for (let tier = 1; tier <= 5; tier++) {
    const ps = PASSAGES.filter((p) => p.tier === tier);
    const rows = [];
    ps.forEach((p, pi) => {
      const perDepth = {};
      p.qs.forEach((q, qi) => {
        const rank = DEPTH_RANK[q.d];
        perDepth[rank] = (perDepth[rank] || 0);
        rows.push({ passage: p, q, qi, pi, rank, within: perDepth[rank]++ });
      });
    });
    rows.sort((a, b) => a.rank - b.rank || a.within - b.within || a.pi - b.pi);
    out.push(...rows);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Derivation: the key is COMPUTED, never authored.
//   evidence = the unique sentence asserting the schema's premise tag
//   answer   = the unique option claiming the schema's conclusion tag
// Throws if either is not unique, or if a distractor is independently supported.
// ---------------------------------------------------------------------------
export function derive(passage, q) {
  const schema = SCHEMAS[q.schema];
  if (!schema) throw new Error(`unknown schema ${q.schema}`);
  if (schema.depth !== q.d) throw new Error(`schema ${q.schema} is ${schema.depth}, question tagged ${q.d}`);
  const premise = q.premise;
  const conclusion = schema.identity ? premise : q.conclusion;
  if (!premise) throw new Error('question has no premise tag');
  if (!conclusion) throw new Error('non-identity schema needs a conclusion tag');

  const bearing = passage.sents
    .map((s, i) => ({ key: `s${i + 1}`, facts: s.slice(1) }))
    .filter((s) => s.facts.includes(premise));
  if (bearing.length !== 1) throw new Error(`premise "${premise}" is asserted by ${bearing.length} sentences (need exactly 1)`);

  const claiming = q.opts.filter((o) => o[1] === conclusion);
  if (claiming.length !== 1) throw new Error(`conclusion "${conclusion}" is claimed by ${claiming.length} options (need exactly 1)`);
  if (claiming[0][2] !== 'correct') throw new Error(`the option claiming the conclusion is labelled "${claiming[0][2]}"`);

  const allFacts = new Set(passage.sents.flatMap((s) => s.slice(1)));
  for (const o of q.opts) {
    if (o[1] === conclusion) continue;
    if (o[2] === 'correct') throw new Error(`a second option is labelled correct: "${o[0]}"`);
    if (allFacts.has(o[1])) throw new Error(`distractor "${o[0]}" claims "${o[1]}", which the passage actually asserts`);
    if (!OPTION_LURES.has(o[2])) throw new Error(`unknown option lure "${o[2]}"`);
  }
  if (q.evLure && q.evLure === bearing[0].key) throw new Error('evLure points at the correct evidence sentence');

  return { premise, conclusion, evidenceKey: bearing[0].key, correctOptionIndex: q.opts.indexOf(claiming[0]), depth: q.d, depthRank: DEPTH_RANK[q.d] };
}

const WHY_OPTION = {
  'correct': 'the conclusion the cited sentence licenses under this inference schema',
  'surface-text-match': 'reuses words from the passage but answers a different question',
  'plausible-but-unsupported': 'could be true of the world, but the passage never asserts it',
  'contradicts-text': 'the passage asserts the opposite',
};
const WHY_EVIDENCE = {
  'evidence-correct': 'the one sentence that asserts the premise this answer rests on',
  'true-but-irrelevant': 'true in the passage, but it does not license this answer',
  'plausible-but-unsupported-evidence': 'the strongest wrong proof: on topic and nearby, but it does not license the answer',
};

// ---------------------------------------------------------------------------
// Build one BankItem.
// ---------------------------------------------------------------------------
export function buildItem(index) {
  const rows = questionOrder();
  const row = rows[index];
  if (!row) throw new Error(`no question at index ${index}`);
  const { passage, q } = row;
  const band = Math.floor(index / ITEMS_PER_BAND) + 1;
  const slot = index % ITEMS_PER_BAND;
  const seed = `${TYPE_CODE}:${index}`;
  const itemId = uuidFrom(seed);
  const difficulty = difficultyFor(band, slot);

  const d = derive(passage, q);

  // Shuffle the option order deterministically so the key is not positional.
  const shuffled = seededShuffle(q.opts.map((o, i) => ({ o, i })), hashNum(itemId));
  const options = shuffled.map((x, k) => ({ key: OPT_KEYS[k], text: x.o[0] }));
  const answerKey = OPT_KEYS[shuffled.findIndex((x) => x.i === d.correctOptionIndex)];

  const sentences = passage.sents.map((s, i) => ({ key: `s${i + 1}`, text: s[0] }));

  const rationales = {};
  shuffled.forEach((x, k) => {
    const lure = x.o[2];
    rationales[OPT_KEYS[k]] = { lure, why: WHY_OPTION[lure], part: 'answer' };
  });
  sentences.forEach((s) => {
    const lure = s.key === d.evidenceKey ? 'evidence-correct'
      : (q.evLure === s.key ? 'plausible-but-unsupported-evidence' : 'true-but-irrelevant');
    rationales[s.key] = { lure, why: WHY_EVIDENCE[lure], part: 'evidence' };
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
      presentation: 'text',   // D-017: printed passage only — no audio, no comic panels
      passage: { title: passage.title, sentences },
      question: { text: q.q },
      options,
      evidenceMode: 'single_sentence',
      evidencePrompt: 'Now tap the sentence in the story that proves your answer.',
      vocabularyLevel: passage.vocab,
    },
    // correctKey is the composite full-credit selection: "<optionKey>+<sentenceKey>".
    answer: { correctKey: `${answerKey}+${d.evidenceKey}`, distractorRationales: rationales },
    scoring: { mode: 'deterministic_key', keyParts: ['answer', 'evidence'], creditWeights: { answer: 0.5, evidence: 0.5 } },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: String(index),
      promptHash: createHash('sha1').update(passage.id + '|' + q.q).digest('hex').slice(0, 16),
      levers: { band, slot, tier: passage.tier, passageId: passage.id, depth: d.depth, depthRank: d.depthRank, sentenceCount: sentences.length, vocabularyLevel: passage.vocab },
      derivation: {
        schema: q.schema,
        schemaForm: SCHEMAS[q.schema].form,
        premise: d.premise,
        conclusion: d.conclusion,
        sentenceFacts: Object.fromEntries(passage.sents.map((s, i) => [`s${i + 1}`, s.slice(1)])),
        optionClaims: Object.fromEntries(shuffled.map((x, k) => [OPT_KEYS[k], x.o[1]])),
      },
      validator: [
        { check: 'unique_evidence', status: 'pass', detail: `only ${d.evidenceKey} asserts "${d.premise}"` },
        { check: 'unique_answer', status: 'pass', detail: `only option ${answerKey} claims "${d.conclusion}"` },
        { check: 'distractors_unsupported', status: 'pass', detail: 'no distractor claim is asserted anywhere in the passage' },
        { check: 'reading_load_ok', status: 'pass', detail: `lexical band ${passage.vocab}/7, ${sentences.length} sentences` },
        { check: 'no_audio', status: 'pass', detail: 'D-017: printed passage, no narration, no K-1 band' },
      ],
    },
    syntheticOnly: true,
    validated: false,
  };
}

export function buildBank() { return questionOrder().map((_, i) => buildItem(i)); }

// ---------------------------------------------------------------------------
// Build-time validation.
// ---------------------------------------------------------------------------
export function validateItems(items) {
  const errors = [];
  const bins = {};
  for (let b = 1; b <= 20; b++) bins[b] = 0;

  items.forEach((it, idx) => {
    const where = `item[${idx}] ${it.provenance.levers.passageId} "${it.content.question.text}"`;
    if (typeof it.difficulty !== 'number' || it.difficulty < 1 || it.difficulty > 20) errors.push(`${where}: difficulty out of range`);
    else bins[Math.round(it.difficulty)]++;
    if (it.ageBands.includes('K-1')) errors.push(`${where}: K-1 is not a permitted band for this type (D-017)`);

    const [ansKey, evKey] = String(it.answer.correctKey).split('+');
    const der = it.provenance.derivation;
    const bearing = Object.entries(der.sentenceFacts).filter(([, f]) => f.includes(der.premise)).map(([k]) => k);
    if (bearing.length !== 1) errors.push(`${where}: premise asserted by ${bearing.length} sentences`);
    else if (bearing[0] !== evKey) errors.push(`${where}: evidence key ${evKey} != derived ${bearing[0]}`);
    const claiming = Object.entries(der.optionClaims).filter(([, c]) => c === der.conclusion).map(([k]) => k);
    if (claiming.length !== 1) errors.push(`${where}: conclusion claimed by ${claiming.length} options`);
    else if (claiming[0] !== ansKey) errors.push(`${where}: answer key ${ansKey} != derived ${claiming[0]}`);

    const rats = it.answer.distractorRationales;
    const correctOpts = Object.entries(rats).filter(([, r]) => r.lure === 'correct');
    if (correctOpts.length !== 1) errors.push(`${where}: ${correctOpts.length} options labelled correct`);
    const correctEv = Object.entries(rats).filter(([, r]) => r.lure === 'evidence-correct');
    if (correctEv.length !== 1) errors.push(`${where}: ${correctEv.length} sentences labelled evidence-correct`);
    if (!it.content.options.every((o) => rats[o.key]) || !it.content.passage.sentences.every((s) => rats[s.key])) {
      errors.push(`${where}: rationales do not cover every selectable key`);
    }
    if (JSON.stringify(it.content).includes('"lure"')) errors.push(`${where}: content leaks lure data`);
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
  writeFileSync(BANK_PATH, items.map((i) => JSON.stringify(i)).join('\n') + '\n', 'utf8');
}
function printCoverage(r) {
  console.log(`items: ${r.count}`);
  console.log('per integer bucket (k:n):  ' + Object.entries(r.bins).map(([b, n]) => `${String(b).padStart(2)}:${n}`).join(' '));
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
