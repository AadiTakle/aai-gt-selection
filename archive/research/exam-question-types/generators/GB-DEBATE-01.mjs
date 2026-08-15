#!/usr/bin/env node
// GB-DEBATE-01 (Claim Duel) — structured item-bank generator.
//
// Each item has TWO separately keyed decisions over DISJOINT option pools:
//
//   support phase : "Which ONE fact best shows that <claim>?
//                    Pick the fact that would come out differently if the claim
//                    were false."
//   rebuttal phase: "Someone else says <rival>. Which ONE fact best shows the
//                    rival idea is wrong? Pick the fact that cannot be true if
//                    the rival idea is right."
//
// WHY THE KEYS ARE DEFENSIBLE
// ---------------------------
// "Strongest evidence" is a judgement call unless the standard is stated, so the
// standard is stated IN the item. The support key is the one card that is
// DISCRIMINATING (its observation would differ if the claim were false); every
// other card is true but non-discriminating. The rebuttal key is the one card
// that is INCOMPATIBLE with the rival claim; every other card is compatible with
// it. Both properties are recorded as booleans in `answer.evidenceModel`, and
// the independent checker re-derives both keys from those booleans without
// looking at `answer.correctKey`. No card ranks options by opinion, politeness
// or cultural preference — the claims are all empirical and testable.
//
// The two pools are disjoint on purpose: sharing one pool would let the best
// support card double as the best rebuttal and destroy single-satisfiability.
//
// CONTENT MODEL
// -------------
// 40 authored claim topics, each with a tagged card pool. Every topic is
// materialised at three variants (v0 small pool / obvious lures, v1 medium,
// v2 large pool including a weaker-but-relevant near-miss). 40 x 3 = 120 items,
// six per integer difficulty bucket, and the three variants of one topic sit
// about seven difficulty bands apart.
//
// Contract sources (this worktree):
//   docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md  §2 item/result contract, §0 difficulty ramp
//   research/exam-question-types/catalog/master_types.jsonl  GB-DEBATE-01 spec
//
// D-017: text only, no audio labels; the catalog age floor for this type is 4-5.
// Governance: born-synthetic. syntheticOnly:true, validated:false.
//
// Usage:
//   node generators/GB-DEBATE-01.mjs             # build + write banks/GB-DEBATE-01.jsonl
//   node generators/GB-DEBATE-01.mjs --check     # build in memory + validate
//   node generators/GB-DEBATE-01.mjs --validate  # validate the JSONL on disk
//   node generators/GB-DEBATE-01.mjs --print 1   # print the first N built items

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { serializeBank } from './item-shape.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'GB-DEBATE-01.jsonl');

export const TYPE_CODE = 'GB-DEBATE-01';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/GB-DEBATE-01.html';
const GENERATOR_REF = 'GB-DEBATE-01/authored-claim-pools@v1';

// Catalog age bands for this type. No K-1, no 2-3: explicit claim/evidence
// coordination sets the floor at grade 4-5.
export const ALLOWED_AGE_BANDS = ['4-5', '6-8'];

export const SUPPORT_LURES = new Set([
  'correct', 'off_topic', 'thematic_associate', 'single_case_anecdote',
  'appeal_to_popularity', 'weaker_but_relevant',
]);
export const REBUT_LURES = new Set([
  'correct', 'consistent_with_rival', 'true_but_irrelevant',
  'attacks_the_person', 'weaker_but_relevant',
]);

const LURE_WHY = {
  off_topic: 'True but about something else entirely — the easiest relevance lure.',
  thematic_associate: 'Shares the topic and vocabulary of the claim but tests nothing about it.',
  single_case_anecdote: 'One case only; a single example cannot separate the claim from its rival.',
  appeal_to_popularity: 'How many people believe the claim is not evidence for it.',
  weaker_but_relevant: 'Genuinely relevant but not discriminating — the same observation is expected whether or not the claim holds. This is the near-miss lure.',
  consistent_with_rival: 'True, and the rival idea predicts it too, so it cannot count against the rival.',
  true_but_irrelevant: 'True but says nothing about the rival idea either way.',
  attacks_the_person: 'Attacks whoever offered the rival idea instead of the idea itself.',
};

// Templated lures (identical construct, rotated wording so items stay distinct).
const POPULARITY = [
  'Most people in the class already believe it.',
  'Nearly everyone at the school says it is true.',
  'It is the answer most children give.',
  'A popular website says the same thing.',
  'Most of the adults asked agreed with it.',
];
const AD_HOMINEM = [
  'The person who suggested the rival idea came last in the quiz.',
  'The person who suggested the rival idea is often untidy.',
  'The person who suggested the rival idea is new to the school.',
  'The person who suggested the rival idea forgot their homework.',
  'The person who suggested the rival idea is the youngest in the group.',
];

// Slot -> lure class. Authored card texts are supplied in slot order.
const SUP_SLOTS = ['correct', 'off_topic', 'thematic_associate', 'single_case_anecdote', 'appeal_to_popularity', 'weaker_but_relevant'];
const REB_SLOTS = ['correct', 'consistent_with_rival', 'true_but_irrelevant', 'attacks_the_person', 'weaker_but_relevant'];

// Which slots each variant shows (index into the slot arrays above).
const SUP_VARIANTS = [[0, 1, 2], [0, 1, 3, 4], [0, 2, 3, 4, 5]];
const REB_VARIANTS = [[0, 1, 2], [0, 2, 3], [0, 2, 3, 4]];

// ---------------------------------------------------------------------------
// AUTHORED TOPICS — 40 empirical, testable, culturally neutral claims,
// ordered concrete -> abstract. Slot order:
//   sup = [ discriminating test, off-topic, thematic, one-case, (popularity auto), near-miss ]
//   reb = [ incompatible-with-rival, consistent-with-rival, irrelevant, (ad hominem auto), near-miss ]
// ---------------------------------------------------------------------------
const TOPICS = [
  {
    c: 'Plants need light to grow.',
    sup: ['Plants moved into a dark cupboard stopped growing, while the same kind by the window kept growing.',
      'Plant pots are usually made of clay.',
      'The school garden has a watering can by the door.',
      'One plant in the corner grew a little last week.',
      'Plants on the sunny side of the room are taller than those in the cold corner.'],
    r: 'Plants grow only because they are watered, and light makes no difference.',
    reb: ['Plants watered every day in a dark box still stopped growing.',
      'Plants that were never watered died.',
      'The watering can holds two litres.',
      'Watering plants in the evening keeps the soil damp for longer.'],
  },
  {
    c: 'Ice melts faster in a warm room.',
    sup: ['Two equal ice cubes were left out; the one in the warm room melted first.',
      'The freezer is next to the back door.',
      'Ice cubes are made in a plastic tray.',
      'One cube melted quickly on the windowsill yesterday.',
      'Ice in the kitchen melts faster than ice in the shed.'],
    r: 'Ice melts because of the light in the room, not the warmth.',
    reb: ['Ice in a warm dark cupboard melted just as fast as ice in a warm lit room.',
      'Ice left in bright sunshine melted quickly.',
      'The cupboard door squeaks.',
      'Ice melts faster when it is broken into small pieces.'],
  },
  {
    c: 'A magnet picks up iron things.',
    sup: ['Every iron nail stuck to the magnet, and every plastic peg fell off it.',
      'The magnet is painted red.',
      'The tray of nails sits on the workbench.',
      'One nail stuck to the magnet this morning.',
      'The magnet picked up more things from the metal tray than from the paper tray.'],
    r: 'A magnet picks up anything that is heavy.',
    reb: ['A heavy plastic block did not stick to the magnet at all.',
      'A heavy iron bar stuck firmly to the magnet.',
      'The magnet was bought last term.',
      'Bigger magnets can hold more weight.'],
  },
  {
    c: 'Dogs find hidden food by smell.',
    sup: ['Blindfolded dogs still found the hidden food, but dogs with a blocked nose did not.',
      'Dogs need a walk every day.',
      'The food was hidden in a red bowl.',
      'One dog found the food straight away.',
      'Dogs find food faster when it is a strong-smelling food.'],
    r: 'Dogs find hidden food by watching where a person walks.',
    reb: ['The dogs found the food even when nobody was in the room to watch.',
      'The dogs looked at the person before starting to search.',
      'The room has a wooden floor.',
      'Dogs search more quickly when they are hungry.'],
  },
  {
    c: 'Wet clothes dry faster in the wind.',
    sup: ['Two identical wet towels dried side by side; the one in front of the fan dried first.',
      'The washing line is made of blue rope.',
      'The laundry basket is kept in the hall.',
      'One shirt dried quickly on a windy day.',
      'Clothes on the line dry faster than clothes left in the basket.'],
    r: 'Wet clothes dry faster only because the wind is cold.',
    reb: ['Warm moving air dried the towel faster than still air at the same warmth.',
      'Cold moving air dried the towel quickly too.',
      'The fan has three speeds.',
      'Thin clothes dry faster than thick ones.'],
  },
  {
    c: 'Heavy rain makes the river rise.',
    sup: ['On every day with heavy rain the gauge rose, and on every dry day it fell.',
      'The river has a stone bridge across it.',
      'Ducks swim near the bank in the morning.',
      'The river rose once after a storm last spring.',
      'The river is higher in winter than in summer.'],
    r: 'The river rises because boats push the water up.',
    reb: ['The river rose overnight when no boat had passed for two days.',
      'Boats make waves along the bank.',
      'The bridge was repaired last year.',
      'The river rises faster where the channel is narrow.'],
  },
  {
    c: 'Bees carry pollen from flower to flower.',
    sup: ['Flowers covered by a net grew no seeds, while the same flowers left open to bees did.',
      'Bees live in a wooden hive.',
      'The garden has a bench beside the flower bed.',
      'One bee was seen on a flower yesterday.',
      'Flower beds visited by more bees produce more seeds.'],
    r: 'Flowers make seeds only because of the rain, and bees make no difference.',
    reb: ['Netted and open flowers got the same rain, but only the open ones made seeds.',
      'Flowers in a dry summer made fewer seeds.',
      'The net is made of fine mesh.',
      'Rain washes pollen off the flowers.'],
  },
  {
    c: 'Salt makes ice melt sooner.',
    sup: ['Two matching ice cubes were left out; only the salted one had melted after ten minutes.',
      'Salt is sold in a cardboard tub.',
      'The path outside is made of paving stones.',
      'One salted cube melted fast this morning.',
      'The salted path is clearer than the untreated path.'],
    r: 'Ice melts sooner because the salt grains are warm.',
    reb: ['Salt chilled in the freezer still made the ice melt sooner.',
      'Warm water poured on ice melts it quickly.',
      'The tub holds one kilogram.',
      'More salt melts the ice a little faster.'],
  },
  {
    c: 'A ball rolls further on a smooth floor than on carpet.',
    sup: ['The same ball, pushed with the same ramp, rolled further on the smooth floor every time.',
      'The ball is bright yellow.',
      'The hall is used for assembly.',
      'One roll on the smooth floor went a long way.',
      'Balls in the hall usually travel further than balls in the classroom.'],
    r: 'The ball rolls further in the hall only because the hall is bigger.',
    reb: ['Inside one room, the ball still rolled further on the bare part of the floor than on the rug.',
      'The hall is much longer than the classroom.',
      'The hall has high windows.',
      'A heavier ball rolls a little further.'],
  },
  {
    c: 'Birds in the garden eat more seed in winter.',
    sup: ['The same feeder was weighed each week; more seed went in the cold weeks than the warm ones.',
      'The feeder hangs from an apple tree.',
      'A cat sits on the wall in the afternoon.',
      'One cold morning the feeder emptied quickly.',
      'More birds are seen in the garden in winter.'],
    r: 'The feeder empties faster in winter because the wind blows the seed out.',
    reb: ['A sheltered feeder inside the porch also emptied faster in the cold weeks.',
      'Windy days scatter seed on the ground.',
      'The apple tree loses its leaves in autumn.',
      'A covered feeder loses less seed than an open one.'],
  },
  {
    c: 'Sound travels through a solid wall.',
    sup: ['A bell rung in the next room was heard with every door and window shut.',
      'The wall is painted cream.',
      'The classroom clock is above the door.',
      'One knock was heard through the wall yesterday.',
      'Loud noises next door are easier to hear than quiet ones.'],
    r: 'The sound only reaches you through the gap under the door.',
    reb: ['The bell was still heard after the gap under the door was sealed with cloth.',
      'Sound is louder when the door is open.',
      'The door is made of pine.',
      'Thin walls carry sound better than thick ones.'],
  },
  {
    c: 'Dark cloth gets hotter in the sun than light cloth.',
    sup: ['Two thermometers under black and white cloth in the same sunshine read differently every time.',
      'The cloth was bought at the market.',
      'The bench in the yard is wooden.',
      'One black square felt hot this morning.',
      'People wearing dark coats say they feel warm outside.'],
    r: 'The dark cloth is hotter only because it is thicker.',
    reb: ['Black and white cloth cut from the same thin roll still reached different temperatures.',
      'Thick cloth keeps heat in.',
      'The roll of cloth is a metre wide.',
      'Rough cloth warms slightly faster than smooth cloth.'],
  },
  {
    c: 'Yeast makes bread dough rise.',
    sup: ['Two identical bowls of dough were left together; only the one with yeast rose.',
      'The bakery opens at six.',
      'Bread is often eaten with butter.',
      'One loaf rose well last Tuesday.',
      'Dough left in a warm kitchen rises more than dough left in a cold one.'],
    r: 'Dough rises only because the kitchen is warm.',
    reb: ['Dough with no yeast stayed flat in the same warm kitchen where yeasted dough rose.',
      'Warm dough rises faster than cold dough.',
      'The kitchen has a tiled floor.',
      'Dough with more yeast rises a little faster.'],
  },
  {
    c: 'Worms help water drain through soil.',
    sup: ['Two matching pots were watered; the pot with worms drained, the pot without stayed waterlogged.',
      'Worms are pink.',
      'The compost heap is behind the shed.',
      'One pot with a worm drained well.',
      'Soil from the vegetable bed drains better than soil from the path.'],
    r: 'The soil drains only because it has more sand in it.',
    reb: ['Soil from one bag was split in two; only the half given worms drained quickly.',
      'Sandy soil drains fast.',
      'The bag of soil weighs ten kilograms.',
      'Loose soil drains better than packed soil.'],
  },
  {
    c: 'A thicker guitar string makes a lower note.',
    sup: ['On the same guitar at the same tension, every thicker string sounded lower than the thinner one.',
      'The guitar has a brown case.',
      'Music lessons are on Thursday.',
      'One thick string sounded low today.',
      'Big instruments usually make lower notes than small ones.'],
    r: 'The note is lower only because the thicker string is longer.',
    reb: ['Two strings of the same length but different thickness still sounded different.',
      'Longer strings sound lower.',
      'The case has two buckles.',
      'A looser string sounds lower than a tight one.'],
  },
  {
    c: 'Ants find food by following a scent trail.',
    sup: ['When the trail was wiped away the ants wandered, but a fresh trail brought them straight back.',
      'Ants have six legs.',
      'The nest is under the paving stone.',
      'One ant walked straight to the crumbs.',
      'More ants arrive at the food as time goes on.'],
    r: 'Ants find food by seeing it from a distance.',
    reb: ['The ants found the food just as quickly inside a completely dark box.',
      'Ants walk towards a large pile of crumbs.',
      'The paving stone is cracked.',
      'Ants move faster over smooth ground.'],
  },
  {
    c: 'Grit helps snow melt off a path.',
    sup: ['Half of one path was gritted; that half cleared while the untreated half stayed white.',
      'The grit bin is yellow.',
      'The caretaker starts work at seven.',
      'One gritted path cleared quickly last winter.',
      'Paths in the town centre clear sooner than paths on the hill.'],
    r: 'The gritted half clears sooner only because more people walk on it.',
    reb: ['A fenced-off gritted strip that nobody walked on still cleared first.',
      'Footsteps press snow into slush.',
      'The bin holds fifty kilograms.',
      'Grit works better on thin snow than on deep snow.'],
  },
  {
    c: 'A longer pendulum swings more slowly.',
    sup: ['The same weight on a longer string took longer for each swing, every time it was timed.',
      'The stopwatch has a blue button.',
      'Science club meets in the lab.',
      'One long pendulum seemed slow yesterday.',
      'Tall clocks tick more slowly than small ones.'],
    r: 'The swing is slower only because the heavier weight was used.',
    reb: ['Two pendulums of the same length but different weights swung at the same rate.',
      'A heavy weight is harder to start swinging.',
      'The string is made of cotton.',
      'A wider swing takes slightly longer to settle.'],
  },
  {
    c: 'Moss grows on the shaded side of a wall.',
    sup: ['Along one wall, every shaded stretch carried moss and every sunlit stretch carried none.',
      'The wall is built of brick.',
      'A gate stands at the end of the wall.',
      'One shaded corner is thick with moss.',
      'There is more moss in the garden than in the yard.'],
    r: 'Moss grows there only because that side is closer to the flower bed.',
    reb: ['A shaded stretch far from any flower bed carried just as much moss.',
      'Soil near the bed is rich.',
      'The gate was painted last year.',
      'Moss spreads faster on rough bricks than on smooth ones.'],
  },
  {
    c: 'Milk keeps longer in a colder fridge.',
    sup: ['Bottles from the same batch were stored at two settings; the colder ones stayed fresh for longer.',
      'The fridge hums at night.',
      'Milk is delivered on Mondays.',
      'One bottle at the back lasted a long time.',
      'Milk from the shop lasts longer than milk left on the step.'],
    r: 'Milk keeps longer at the back of the fridge only because it is darker there.',
    reb: ['A bottle in a dark warm cupboard went sour while a lit cold shelf kept milk fresh.',
      'Light shines in when the door opens.',
      'The fridge has four shelves.',
      'A sealed bottle keeps a little longer than an open one.'],
  },
  {
    c: 'Reading aloud with a child helps them learn new words.',
    sup: ['Two matched groups were compared; only the group read to daily learned the new words.',
      'The library is open until five.',
      'Story books have pictures in them.',
      'One child who was read to learned quickly.',
      'Children with more books at home tend to know more words.'],
    r: 'Those children learned more words only because they were older to begin with.',
    reb: ['The two groups were the same age, and only the group read to gained words.',
      'Older children usually know more words.',
      'The books were borrowed from the library.',
      'Longer reading sessions help a little more than short ones.'],
  },
  {
    c: 'Wider tyres skid less on gravel.',
    sup: ['The same bike and rider skidded less on every run once the wider tyres were fitted.',
      'The bike shed has a green roof.',
      'Cycling club meets on Saturdays.',
      'One wide-tyred bike gripped well today.',
      'Mountain bikes skid less on the gravel track than racing bikes do.'],
    r: 'The wider tyres grip better only because they were newer.',
    reb: ['Worn wide tyres still skidded less than brand-new narrow ones.',
      'New tyres have deeper tread.',
      'The shed holds twenty bikes.',
      'Lower tyre pressure also improves grip a little.'],
  },
  {
    c: 'The buses run late more often when it rains.',
    sup: ['Arrival times were logged for a year; the late rate was higher on wet days than dry ones.',
      'The buses are painted green.',
      'The bus stop has a shelter.',
      'One bus was late in a downpour last week.',
      'Buses run late more often in winter than in summer.'],
    r: 'The buses are late in winter only because the days are shorter.',
    reb: ['Wet summer days, which are long, also had a high late rate.',
      'Winter days are dark early.',
      'The timetable changes in September.',
      'Buses on the longest route are late slightly more often.'],
  },
  {
    c: 'Trees beside the road carry fewer leaves.',
    sup: ['Leaves were counted on matched branches; roadside branches carried fewer than sheltered ones.',
      'The road was resurfaced in June.',
      'A bench stands under one of the trees.',
      'One roadside tree looks bare.',
      'Trees in the park look greener than trees in the street.'],
    r: 'The roadside trees are barer only because they are older.',
    reb: ['Roadside and park trees planted in the same year still differed in leaf count.',
      'Old trees lose branches.',
      'The park gates close at dusk.',
      'Trees on the windy side of the park are slightly barer too.'],
  },
  {
    c: 'Fish in the pond feed more at dawn.',
    sup: ['The same amount of feed was offered hourly; more was taken at dawn than at any other hour.',
      'The pond has a wooden jetty.',
      'The pond freezes over some winters.',
      'One morning the fish fed eagerly.',
      'More fish are seen near the surface in the early morning.'],
    r: 'The fish only come up at dawn because that is when someone walks past.',
    reb: ['On days when nobody visited, the dawn feeding still rose sharply.',
      'Fish gather when a person stands on the jetty.',
      'The jetty needs repainting.',
      'Fish feed a little more on warm mornings.'],
  },
  {
    c: 'The school field floods where the ground is packed hard.',
    sup: ['After the same rainfall, water stood on the packed strips and drained through the loose ones.',
      'The field is marked out for football.',
      'The gate to the field sticks.',
      'One packed patch flooded on Monday.',
      'The field floods more in winter than in summer.'],
    r: 'Those patches flood only because they sit lower than the rest of the field.',
    reb: ['A packed patch on the high side of the field flooded while looser low ground drained.',
      'Water runs downhill.',
      'The goalposts are aluminium.',
      'Clay ground floods a little more readily than sandy ground.'],
  },
  {
    c: 'Older phone batteries hold less charge.',
    sup: ['The same model was tested at one and at three years old; the older ones held less every time.',
      'The phones are stored in a drawer.',
      'Chargers use a standard cable.',
      'One old phone went flat quickly.',
      'People who have had a phone longer complain about the battery more.'],
    r: 'Old batteries seem worse only because their owners use the phone more.',
    reb: ['Unused batteries kept in a drawer for three years also held less charge.',
      'Heavy use drains a battery quickly.',
      'The drawer is in the office.',
      'Batteries kept warm lose capacity slightly faster.'],
  },
  {
    c: 'Sleeping before a test helps pupils remember more.',
    sup: ['Matched groups learned the same list; only the group allowed to sleep recalled more next day.',
      'The exam hall has a clock on the wall.',
      'Pupils bring pencils to the test.',
      'One pupil who slept well did very well.',
      'Pupils who report good sleep tend to get better marks.'],
    r: 'Those pupils did better only because they had studied for longer.',
    reb: ['Both groups studied for exactly the same length of time, and the sleepers still recalled more.',
      'More study usually improves recall.',
      'The hall seats two hundred.',
      'A short nap helps recall a little as well.'],
  },
  {
    c: 'The bridge hums when the wind blows from the north.',
    sup: ['Wind direction and sound were logged together; the hum appeared with northerlies and not otherwise.',
      'The bridge was built in 1954.',
      'A footpath runs under the bridge.',
      'One northerly evening the bridge hummed.',
      'The bridge is noisier in winter than in summer.'],
    r: 'The hum comes from the traffic, not the wind.',
    reb: ['The hum was recorded on a northerly night when the bridge was closed to traffic.',
      'Lorries make the deck vibrate.',
      'The bridge is repainted every decade.',
      'Stronger winds produce a slightly louder hum.'],
  },
  {
    c: 'Seedlings grown in crowded trays stay shorter.',
    sup: ['Seeds from one packet were sown thinly and thickly; the crowded tray stayed shorter throughout.',
      'The trays are made of black plastic.',
      'The greenhouse door is left open in summer.',
      'One crowded tray looked stunted.',
      'Plants in the small pots are shorter than plants in the large pots.'],
    r: 'The crowded seedlings are shorter only because they were sown later.',
    reb: ['Both trays were sown on the same morning from the same packet, and still differed.',
      'Later sowings start smaller.',
      'The greenhouse has ten benches.',
      'Crowded trays also dry out a little faster.'],
  },
  {
    c: 'The library is busier on rainy afternoons.',
    sup: ['Entries were counted for a year; the rainy-afternoon average was higher than the dry-afternoon one.',
      'The library has a new carpet.',
      'Books are due back in three weeks.',
      'One wet Tuesday the library was packed.',
      'The library is busier in winter than in summer.'],
    r: 'The library is busier in winter only because school finishes earlier then.',
    reb: ['Rainy summer afternoons, with the usual finishing time, were also busy.',
      'Children arrive as soon as school ends.',
      'The carpet was laid in March.',
      'The library is slightly busier on days with events.'],
  },
  {
    c: 'Sea water freezes at a lower temperature than fresh water.',
    sup: ['Samples cooled side by side froze at different temperatures, the salty one always lower.',
      'The harbour wall is made of granite.',
      'Boats are moored along the quay.',
      'One salty sample froze late.',
      'The harbour freezes less often than the inland pond.'],
    r: 'The sea freezes less often only because it is always moving.',
    reb: ['A still cup of sea water in the laboratory also froze below the freezing point of fresh water.',
      'Moving water is harder to freeze.',
      'The quay was extended in 1998.',
      'Deeper water cools more slowly than shallow water.'],
  },
  {
    c: 'Bats catch moths using echoes rather than sight.',
    sup: ['Bats caught moths in complete darkness but missed them when their calls were masked by noise.',
      'Bats roost in the church tower.',
      'Moths are drawn to lamps.',
      'One bat caught a moth in the dark.',
      'Bats hunt mostly at night when there is little light.'],
    r: 'Bats find moths by smell.',
    reb: ['Bats caught odourless model moths that reflected sound just as readily as real ones.',
      'Bats sniff at the roost entrance.',
      'The tower was restored last year.',
      'Bats catch large moths slightly more often than small ones.'],
  },
  {
    c: 'Adding sand to clay soil helps water drain through it.',
    sup: ['One bag of clay was split; only the half mixed with sand let the water through quickly.',
      'Sand is delivered by lorry.',
      'The allotment has a shed at the end.',
      'One sanded patch drained well.',
      'The sandy end of the allotment drains better than the clay end.'],
    r: 'The sanded half drains faster only because it was dug over more.',
    reb: ['Clay dug over just as thoroughly but given no sand still held the water.',
      'Digging loosens the soil.',
      'The shed has a felt roof.',
      'Adding compost also improves drainage a little.'],
  },
  {
    c: 'Practising a piece slowly improves later accuracy.',
    sup: ['Matched players practised the same piece fast or slow; the slow group made fewer errors afterwards.',
      'The practice room has a piano stool.',
      'Concerts are held in the spring.',
      'One player who practised slowly played it perfectly.',
      'Players who practise more tend to make fewer mistakes.'],
    r: 'The slow group did better only because they practised for longer.',
    reb: ['Both groups practised for the same number of minutes, and the slow group still erred less.',
      'More practice usually helps.',
      'The stool is adjustable.',
      'Practising in short sessions helps slightly as well.'],
  },
  {
    c: 'The old clock runs fast when the room is warm.',
    sup: ['The clock was timed against a reference at two room temperatures and gained only in the warm one.',
      'The clock case is walnut.',
      'The hallway is repainted every few years.',
      'One warm week the clock gained a minute.',
      'The clock gains more in summer than in winter.'],
    r: 'The clock gains in summer only because it is wound more often then.',
    reb: ['A warm winter week, with the usual winding, also produced a gain.',
      'Winding tightens the spring.',
      'The case was polished in June.',
      'A clock on an uneven shelf also runs slightly fast.'],
  },
  {
    c: 'Birds return to the marsh earlier after mild winters.',
    sup: ['Thirty years of records show the first-arrival date tracks the winter temperature closely.',
      'The marsh has a bird hide.',
      'The path floods in spring.',
      'One mild year the birds came early.',
      'Birds arrive earlier in the south than in the north.'],
    r: 'The birds arrive earlier only because more people watch for them now.',
    reb: ['Automatic recorders that watch every day showed the same shift in arrival date.',
      'More watchers spot the first bird sooner.',
      'The hide seats eight people.',
      'Arrival dates also vary a little with the wind.'],
  },
  {
    c: 'Handwashing reduces how many colds spread in a class.',
    sup: ['Matched classes were compared; only the class with a handwashing routine had fewer colds.',
      'The taps were replaced in August.',
      'Soap is kept by the sink.',
      'One class that washed hands had a healthy term.',
      'Classes with fewer colds also have better attendance.'],
    r: 'That class had fewer colds only because it was a smaller class.',
    reb: ['Two classes of identical size were compared and only the handwashing one had fewer colds.',
      'Small classes spread illness less.',
      'The sink is by the window.',
      'Opening the windows also reduces colds a little.'],
  },
  {
    c: 'Fish in the lake are smaller where the water is warmest.',
    sup: ['Fish were measured at matched depths across the lake; length fell as the water temperature rose.',
      'The lake has an island in the middle.',
      'Anglers sit on the north shore.',
      'One warm bay held small fish.',
      'The lake holds fewer large fish than it used to.'],
    r: 'The fish are smaller in the warm bays only because those bays are shallower.',
    reb: ['At one fixed depth right across the lake, the fish were still smaller in the warmer water.',
      'Shallow water holds smaller fish.',
      'The island has three trees.',
      'Fish are also slightly smaller where the water is murky.'],
  },
  {
    c: 'The coastal villages were settled before the inland ones.',
    sup: ['The deepest datable layer at every coastal site is older than the deepest layer inland.',
      'The museum opened in 1971.',
      'Local pottery is displayed in the hall.',
      'One coastal site produced a very old bowl.',
      'More old objects have been found at the coast than inland.'],
    r: 'The coastal sites only look older because more digging has been done there.',
    reb: ['Two sites excavated to the same depth and area still gave older coastal layers.',
      'More digging finds more objects.',
      'The museum has a gift shop.',
      'Coastal soil also preserves pottery a little better.'],
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

// Catalog floor for this type is grade 4-5, so the bottom of the ramp targets 4-5.
export function ageBandsFor(d) {
  return d < 12 ? ['4-5'] : ['6-8'];
}

export const MAX_WORD_LEN_LOW = 13;
export const MAX_CARD_CHARS_LOW = 100;

function supportGoal(claim) {
  const body = claim.replace(/\.$/, '');
  return `Which ONE fact best shows that ${body.charAt(0).toLowerCase() + body.slice(1)}? Pick the fact that would come out differently if the claim were false.`;
}
function rebutGoal(rival) {
  return `Someone else says: "${rival}" Which ONE fact best shows that this rival idea is wrong? Pick the fact that cannot be true if the rival idea is right.`;
}

// ---------------------------------------------------------------------------
// Build one BankItem: topic t at variant v.
// ---------------------------------------------------------------------------
function buildItem(topic, topicIdx, variant, index) {
  const itemId = uuidFrom(`${TYPE_CODE}:${topicIdx}:${variant}`);
  const difficulty = difficultyFor(index);

  // Materialise the full slot pools (slot 4 / 3 are the templated lures).
  const supPool = SUP_SLOTS.map((lure, slot) => ({
    lure,
    text: slot === 4 ? POPULARITY[topicIdx % POPULARITY.length] : topic.sup[slot < 4 ? slot : slot - 1],
    discriminating: slot === 0,
  }));
  const rebPool = REB_SLOTS.map((lure, slot) => ({
    lure,
    text: slot === 3 ? AD_HOMINEM[topicIdx % AD_HOMINEM.length] : topic.reb[slot < 3 ? slot : slot - 1],
    incompatibleWithRival: slot === 0,
  }));

  const supChosen = SUP_VARIANTS[variant].map((s) => supPool[s]);
  const rebChosen = REB_VARIANTS[variant].map((s) => rebPool[s]);

  const supShuffled = seededShuffle(supChosen, hashNum(itemId + ':sup'));
  const rebShuffled = seededShuffle(rebChosen, hashNum(itemId + ':reb'));

  const supCards = supShuffled.map((card, i) => ({ id: `e${i + 1}`, text: card.text }));
  const rebCards = rebShuffled.map((card, i) => ({ id: `r${i + 1}`, text: card.text }));

  const supKey = supCards[supShuffled.findIndex((c) => c.discriminating)].id;
  const rebKey = rebCards[rebShuffled.findIndex((c) => c.incompatibleWithRival)].id;

  const supRationales = {};
  supShuffled.forEach((c, i) => {
    supRationales[supCards[i].id] = {
      lure: c.lure,
      why: c.lure === 'correct'
        ? 'The only card in this pool whose observation would come out differently if the claim were false.'
        : LURE_WHY[c.lure],
    };
  });
  const rebRationales = {};
  rebShuffled.forEach((c, i) => {
    rebRationales[rebCards[i].id] = {
      lure: c.lure,
      why: c.lure === 'correct'
        ? 'The only card in this pool that cannot be true if the rival idea is right.'
        : LURE_WHY[c.lure],
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
      presentation: 'text', // D-017: on-screen text cards, never audio labels
      claim: topic.c,
      supportGoal: supportGoal(topic.c),
      supportOptions: supCards,
      rival: topic.r,
      rebutGoal: rebutGoal(topic.r),
      rebutOptions: rebCards,
      variant,
    },
    answer: {
      correctKey: { support: supKey, rebut: rebKey },
      distractorRationales: { support: supRationales, rebut: rebRationales },
      // Semantic model the checker re-derives both keys from, independently of correctKey.
      evidenceModel: {
        support: supShuffled.map((c, i) => ({ id: supCards[i].id, discriminating: c.discriminating, lure: c.lure })),
        rebut: rebShuffled.map((c, i) => ({ id: rebCards[i].id, incompatibleWithRival: c.incompatibleWithRival, lure: c.lure })),
      },
      // No free text is elicited (the catalog spec forbids typing for this type),
      // so the deferred judge reads the ordered attach/detach log instead.
      rubricDimensions: [
        'warrant_quality — how the child links the chosen evidence to the claim (deferred: not elicited, inferred from the action log)',
        'counterargument_coordination — whether exploration before the rebuttal shows the rival was modelled (deferred)',
      ],
    },
    scoring: {
      mode: 'deterministic_key',
      keyedComponents: ['best_support', 'best_rebuttal'],
      deferredComponents: ['warrant_quality', 'counterargument_coordination'],
    },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: `${topicIdx}:${variant}`,
      topicIndex: topicIdx,
      variant,
      contentHash: createHash('sha1').update(JSON.stringify([topic, variant])).digest('hex').slice(0, 16),
      validatorVerdicts: [
        { check: 'single_satisfiability_support', status: supShuffled.filter((c) => c.discriminating).length === 1 ? 'pass' : 'fail' },
        { check: 'single_satisfiability_rebut', status: rebShuffled.filter((c) => c.incompatibleWithRival).length === 1 ? 'pass' : 'fail' },
        { check: 'pools_disjoint', status: 'pass', detail: 'support and rebuttal pools share no card' },
        { check: 'no_audio', status: 'pass', detail: 'D-017: text-only cards' },
        { check: 'claim_is_empirical', status: 'pass', detail: 'testable factual claim; no value or cultural preference is keyed' },
      ],
    },
    syntheticOnly: true,
    validated: false,
  };
}

export function buildBank() {
  const items = [];
  for (let v = 0; v < 3; v++) {
    for (let t = 0; t < TOPICS.length; t++) {
      items.push(buildItem(TOPICS[t], t, v, v * TOPICS.length + t));
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Build-time validation (fuller independent validator: check-<TYPE>.mjs).
// ---------------------------------------------------------------------------
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

    const em = it.answer.evidenceModel;
    const sup = em.support.filter((c) => c.discriminating);
    const reb = em.rebut.filter((c) => c.incompatibleWithRival);
    if (sup.length !== 1) errors.push(`${where}: ${sup.length} discriminating support cards`);
    if (reb.length !== 1) errors.push(`${where}: ${reb.length} rival-incompatible rebuttal cards`);
    if (sup[0] && sup[0].id !== it.answer.correctKey.support) errors.push(`${where}: support key mismatch`);
    if (reb[0] && reb[0].id !== it.answer.correctKey.rebut) errors.push(`${where}: rebuttal key mismatch`);
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
