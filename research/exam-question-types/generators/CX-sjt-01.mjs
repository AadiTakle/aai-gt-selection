#!/usr/bin/env node
// CX-sjt-01 (What Would You Do?) — structured item-bank generator.
//
// HOW THIS TYPE AVOIDS KEYING A PERSONALITY PREFERENCE
// ----------------------------------------------------
// A situational-judgement item is only defensible if the standard the options
// are ranked against is visible to the child. "Expert-consensus effectiveness"
// is not visible, and in practice it smuggles in politeness, compliance and
// cultural norms as right answers. This bank does not use it.
//
// Instead each item states, in the item itself:
//   * the FACTS of the situation (setting lines), and
//   * a numbered list of WHAT HAS TO BE TRUE — concrete goals and constraints.
//
// The key is then a constraint-satisfaction fact, not an opinion: exactly one
// option meets every stated requirement and breaks none. Every other option
// breaks at least one requirement that the child can point to on screen. The
// independent checker re-derives the key from the satisfies/violates tags
// without reading `answer.correctKey`, and fails the build if two options (or
// none) qualify.
//
// Two rules were applied throughout to keep the construct clean:
//   1. NO option is wrong for being blunt, quiet, sociable or self-reliant.
//      Help-seeking in particular is never wrong by default — where "ask an
//      adult" is keyed as failing, a setting line states why (the adult is out
//      of the room, the deadline is before they return, and so on).
//   2. Every constraint is checkable from the text. There are no constraints
//      like "be kind" or "be polite", which would be preferences in disguise.
//
// Difficulty rises with the NUMBER of stated requirements the child must hold
// at once (1 -> 3), the option count (3 -> 5) and how near-miss the distractors
// are: at the easiest variant every distractor breaks the single stated goal
// outright, while at the hardest variant the distractors are chosen to be the
// options that satisfy the most requirements while still breaking one.
//
// KEY-POSITION BALANCE (E-073)
// ----------------------------
// Seeding the option shuffle per item made each item look fair but left the
// bank as a whole lopsided: 38/120 items keyed a2, so always tapping the
// second option scored 31.7% against a 20.0% uniform baseline (+11.7pt). The
// correct option is now dealt to an explicitly balanced position within each
// variant, and the distractors fill the remaining slots in the same seeded
// order as before. WHICH option is correct never changes; only where it sits
// does, and the satisfies/violates tags, rationales and poly scores are all
// derived from the arranged list, so they follow the permutation exactly.
//
// Balance is exact within each variant, which is as far as it can go: variant
// 0 has 3 options, so it can never key a4 or a5. Uniform placement gives
// 14/13/13 (v0), 10 each (v1) and 8 each (v2), i.e. 32/31/31/18/8 across
// a1..a5. That 26.7% modal reads as +6.7pt against the 100/5 = 20% baseline,
// but that baseline is not reachable by ANY fair arrangement: with 40 items at
// each of 3, 4 and 5 options, true chance for a constant-position guesser is
// (1/3 + 1/4 + 1/5)/3 = 26.1%. The bank now sits within 0.6pt of that floor.
// Forcing the printed metric under +5pt would mean keying a4/a5 more often
// than chance, which hands the same advantage back to "always tap the last
// option". See the handoff note for the arithmetic.
//
// D-017: CX-sjt-01 previously reached K-1 through voiced animation. Audio is
// prohibited and reading is a required baseline-literacy gate, so the floor is
// grade 2-3, scenarios are on-screen text, and there are no pictured choices.
// Governance: born-synthetic. syntheticOnly:true, validated:false.
//
// Usage:
//   node generators/CX-sjt-01.mjs             # build + write banks/CX-sjt-01.jsonl
//   node generators/CX-sjt-01.mjs --check     # build in memory + validate
//   node generators/CX-sjt-01.mjs --validate  # validate the JSONL on disk
//   node generators/CX-sjt-01.mjs --print 1

import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_PATH = join(__dirname, '..', 'banks', 'CX-sjt-01.jsonl');

export const TYPE_CODE = 'CX-sjt-01';
export const DOMAIN = 'verbal';
const DEMO_PATH = 'demos/CX-sjt-01.html';
const GENERATOR_REF = 'CX-sjt-01/authored-constraint-scenarios@v1';

// Catalog age bands. K-1 was removed under D-017 (its access depended on audio).
export const ALLOWED_AGE_BANDS = ['2-3', '4-5', '6-8'];

export const OPTION_LURES = new Set([
  'correct',
  'ignores_the_stated_goal',
  'meets_only_some_requirements',
  'breaks_a_stated_requirement',
  'blames_a_person',
  'true_but_irrelevant',
  'too_late_for_the_deadline',
]);

const LURE_WHY = {
  ignores_the_stated_goal: 'Does not even attempt the requirement the item states — the bluntest failure.',
  meets_only_some_requirements: 'Meets the first requirement but breaks a later one; a child who reads only the first line will choose it.',
  breaks_a_stated_requirement: 'Meets most of the list and breaks exactly one — the near-miss lure that separates careful readers.',
  blames_a_person: 'Turns to who is at fault instead of the stated requirement. Attacks the person, not the problem.',
  true_but_irrelevant: 'A reasonable thing to do that does nothing about any requirement the item states.',
  too_late_for_the_deadline: 'Would work, but not inside the time the item states.',
};

const GOAL_HEADING = 'What has to be true';
const QUESTION = 'Which ONE action meets everything on the list and breaks nothing on it?';

// Option counts per variant; variant v also shows constraints c1..c(v+1).
const OPTION_COUNT = [3, 4, 5];

// ---------------------------------------------------------------------------
// AUTHORED SCENARIOS — 40, ordered simple -> complex.
//   l : setting lines (facts; ALL are shown at every variant)
//   c : the three stated requirements, in the order they are revealed
//   b : the one option that meets all three and breaks none
//   x : five distractors [ text, satisfiedConstraintIndices, violatedIndices, lure ]
//       x[0] and x[1] must both break requirement 0, so the easiest variant
//       still has two usable distractors.
// ---------------------------------------------------------------------------
const SCENARIOS = [
  {
    n: 'The poster before the bell',
    l: ['Sam has ten minutes left to finish a poster.', 'The last part needs glue.', 'The table is shared with the next class.'],
    c: ['The poster is finished before the bell.', 'The table is left clean.', 'The table is left free for the next class.'],
    b: 'Glue it on scrap paper, then bin the scrap and wipe the table.',
    x: [
      ['Stop working and read a book, then hand the poster in unfinished.', [], [0], 'ignores_the_stated_goal'],
      ['Say the last class left the mess, then wait for them to clear it.', [], [0, 1], 'blames_a_person'],
      ['Glue the part straight onto the table and leave it there.', [0], [1], 'meets_only_some_requirements'],
      ['Finish it, wipe the table, then leave the poster spread out to dry.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Finish fast and leave the glue and brush out.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Two at the sink',
    l: ['Four children need to wash paint pots.', 'A sign says only two people at the sink.', 'The lesson ends in five minutes.'],
    c: ['Every pot is washed before the lesson ends.', 'Never more than two people are at the sink.', 'Nobody is left with nothing to do.'],
    b: 'Two wash while two scrape the pots ready, then the pairs swap.',
    x: [
      ['Leave the pots for tomorrow and stack them back on the shelf dirty.', [], [0], 'ignores_the_stated_goal'],
      ['Point out who used the most paint and wait for them to wash up.', [], [0], 'blames_a_person'],
      ['All four crowd round the sink to be quick.', [0], [1], 'meets_only_some_requirements'],
      ['Two wash everything while the other two sit and wait.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['One person washes them all alone.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'The library book',
    l: ['Ada has one library book due today.', 'The library shuts at lunch.', 'She has a lesson right up to lunch.'],
    c: ['The book is returned today.', 'No lesson time is missed.', 'The book is not left somewhere it can be lost.'],
    b: 'Drop the book in the returns box on the way to the lesson.',
    x: [
      ['Keep the book at home and take it back some time next week.', [], [0], 'ignores_the_stated_goal'],
      ['Tell the teacher the library should open longer, and keep the book.', [], [0], 'true_but_irrelevant'],
      ['Walk out of the lesson to the library desk.', [0], [1], 'meets_only_some_requirements'],
      ['Return it on the way past but leave it on the front step.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Wait until after lunch and then go to the library.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'One microscope',
    l: ['Three children share one microscope.', 'Each needs to draw what they see.', 'There are fifteen minutes of lesson left.'],
    c: ['All three get a turn at the microscope.', 'All three finish a drawing.', 'The microscope is not left unattended.'],
    b: 'Take five minutes each, drawing while the next person looks.',
    x: [
      ['Argue about who should go first until the bell ends the lesson.', [], [0], 'ignores_the_stated_goal'],
      ['Say the person who booked the scope should not have, then wait.', [], [0], 'blames_a_person'],
      ['One person looks for the whole lesson and tells the others.', [], [0, 1], 'ignores_the_stated_goal'],
      ['Take turns, then leave the scope out while everyone draws.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Everyone looks quickly, then nobody has time to draw.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Rain on the seedlings',
    l: ['Heavy rain is due in ten minutes.', 'Twenty seedling trays are outside.', 'The shed holds only ten trays.'],
    c: ['No tray is left out in the heavy rain.', 'No tray is stacked so the plants are crushed.', 'The shed door still shuts.'],
    b: 'Put ten trays in the shed and ten under the covered bench.',
    x: [
      ['Leave all the trays out where they are and check them afterwards.', [], [0], 'ignores_the_stated_goal'],
      ['Say the rota person should have read the forecast, then go inside.', [], [0], 'blames_a_person'],
      ['Stack all twenty trays inside the shed on top of each other.', [0], [1], 'meets_only_some_requirements'],
      ['Fit all twenty in and wedge the shed door open.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Carry ten in and leave the rest out on the grass.', [1], [0], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The last three chairs',
    l: ['Five children need to sit for the reading.', 'Only three chairs are left.', 'The floor mat seats two.'],
    c: ['Everyone has somewhere to sit.', 'Nobody sits where they cannot see the book.', 'No chair is taken from another class.'],
    b: 'Three sit on the chairs and two sit on the mat at the front.',
    x: [
      ['Let two children stand at the back for the whole of the reading.', [], [0], 'ignores_the_stated_goal'],
      ['Ask who took the missing chairs and wait until they turn up.', [], [0], 'blames_a_person'],
      ['Put two children on the mat behind the chairs.', [0], [1], 'meets_only_some_requirements'],
      ['Everyone sits well, using two chairs borrowed next door.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Share the three chairs, two children per chair.', [], [0, 1], 'ignores_the_stated_goal'],
    ],
  },
  {
    n: 'The shared laptop',
    l: ['Two children must each print one page.', 'One laptop is free for twenty minutes.', 'The printer needs five minutes to warm up.'],
    c: ['Both pages are printed inside the twenty minutes.', 'Neither child loses their work.', 'The laptop is logged out at the end.'],
    b: 'Warm the printer up, work ten minutes each, save, then log out.',
    x: [
      ['Wait to see whether a second laptop comes free later in the day.', [], [0], 'too_late_for_the_deadline'],
      ['Say the other class always hogs the laptop, then give up on it.', [], [0], 'blames_a_person'],
      ['Work twenty minutes each and print tomorrow.', [], [0], 'ignores_the_stated_goal'],
      ['Both print in time, save the work, and walk away logged in.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Type fast, print both, and close the lid without saving.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The pencil case',
    l: ['Ben has left his pencil case at home.', 'The test starts in two minutes.', 'A spare pencil tub sits by the door.'],
    c: ['Ben has a pencil when the test starts.', 'Nobody else loses test time.', 'The spare tub is put back for the next class.'],
    b: 'Take a pencil from the tub on the way to his seat, and return it.',
    x: [
      ['Go home to fetch the pencil case and come back once he has it.', [], [0], 'ignores_the_stated_goal'],
      ['Tell everyone his sister hid the case, then sit down with nothing.', [], [0], 'blames_a_person'],
      ['Ask three friends in turn for a spare pencil.', [0], [1], 'meets_only_some_requirements'],
      ['Take a pencil and keep it in his bag afterwards.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Borrow a pencil halfway through the test.', [], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'Sorting the recycling',
    l: ['The recycling lorry comes in fifteen minutes.', 'Paper and plastic must go in different bins.', 'One bin is already full of paper.'],
    c: ['All the recycling is out before the lorry.', 'Paper and plastic are not mixed.', 'No bin is filled past its lid.'],
    b: 'Put plastic in the empty bin, take the paper bin out, shut the lids.',
    x: [
      ['Leave the recycling inside until the lorry has already driven off.', [], [0], 'ignores_the_stated_goal'],
      ['Say the class next door filled the bin and leave it for them.', [], [0], 'blames_a_person'],
      ['Tip the plastic on top of the paper to save time.', [0], [1], 'meets_only_some_requirements'],
      ['Sort it all properly and press the lid down hard on the full bin.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Sort it carefully and finish just after the lorry leaves.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'Feeding the class fish',
    l: ['The fish need feeding across the weekend.', 'Too much food makes the water cloudy.', 'The room is locked from Friday to Monday.'],
    c: ['The fish are fed over the weekend.', 'The water does not go cloudy.', 'Nobody has to enter the locked room.'],
    b: 'Drop in one slow-release block, which feeds a little each day.',
    x: [
      ['Leave the fish unfed until the room is unlocked again on Monday.', [], [0], 'ignores_the_stated_goal'],
      ['Say the rota was written wrong and leave the tank as it is.', [], [0], 'blames_a_person'],
      ['Tip in three days of food on Friday.', [0], [1], 'meets_only_some_requirements'],
      ['Feed the right amount by coming in each morning.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Ask the caretaker to sprinkle a big handful in on Sunday.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The art trolley',
    l: ['The art trolley must be tidy in ten minutes.', 'Wet brushes cannot go in the closed box.', 'The trolley must roll through the door.'],
    c: ['The trolley is tidy in ten minutes.', 'No wet brush is shut in the box.', 'Nothing sticks out past the trolley edge.'],
    b: 'Stand the wet brushes in a jar and box only the dry ones.',
    x: [
      ['Leave the trolley exactly as it is and push it into the corner.', [], [0], 'ignores_the_stated_goal'],
      ['Point out who left the brushes wet, then wait for them to tidy.', [], [0], 'blames_a_person'],
      ['Pack every brush into the box and shut the lid.', [0], [1], 'meets_only_some_requirements'],
      ['Tidy it fully and lay the long rulers across the top.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Wash and dry every brush, finishing after the bell.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'One ladder, two jobs',
    l: ['A poster must go up and a bulb must be changed.', 'There is one ladder.', 'The ladder may only be used with a second person holding it.'],
    c: ['Both jobs are done today.', 'Somebody always holds the ladder.', 'The ladder is put back in the store.'],
    b: 'Do one job at a time with a partner holding, then return the ladder.',
    x: [
      ['Put up the poster only and leave the bulb for some other day.', [], [0], 'ignores_the_stated_goal'],
      ['Say the caretaker should have done both jobs, and leave them.', [], [0], 'blames_a_person'],
      ['Work quickly on the ladder alone to save time.', [0], [1], 'meets_only_some_requirements'],
      ['Do both jobs safely and leave the ladder by the wall.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Stand on a chair for one job so the ladder is free.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The printer queue',
    l: ['Six people are waiting to print.', 'Mia needs one page for the next lesson.', 'The others need long documents later today.'],
    c: ['Mia has her page before the next lesson.', 'Nobody is pushed out of the queue unfairly.', 'The printer is not left jammed.'],
    b: 'Ask the queue if the one-page job can go first, then clear the tray.',
    x: [
      ['Give up on printing and go to the lesson without the page.', [], [0], 'ignores_the_stated_goal'],
      ['Complain that long documents should be banned from this printer.', [], [0], 'true_but_irrelevant'],
      ['Step to the front of the queue without asking.', [0], [1], 'meets_only_some_requirements'],
      ['Ask to go first, print, and leave the crumpled sheet inside.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Wait for all six and print after the lesson starts.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'Water by the socket',
    l: ['A jug of water has spilled near a plug socket.', 'The socket is switched on.', 'The mop is in the next room.'],
    c: ['Nobody steps in the water near the live socket.', 'The socket is made safe before anyone mops.', 'The floor is dry before the next class.'],
    b: 'Switch the socket off, warn people off, then fetch the mop.',
    x: [
      ['Ignore the spill and let the water dry out on its own by break.', [], [0], 'ignores_the_stated_goal'],
      ['Ask who was carrying the jug and wait for them to clear it up.', [], [0], 'blames_a_person'],
      ['Run straight through for the mop and start mopping.', [], [0, 1], 'ignores_the_stated_goal'],
      ['Switch the socket off, warn people, and mop up after break.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Stand guard by the spill and let nobody near all lesson.', [0], [2], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The locker key',
    l: ['Rae has left the locker key at home.', 'Her kit is in the locker and PE starts in ten minutes.', 'The office keeps a spare key and is open now.'],
    c: ['Rae has her kit when PE starts.', 'The locker is not damaged.', 'The spare key goes back to the office.'],
    b: 'Sign the spare key out, get the kit, and hand the key back.',
    x: [
      ['Sit out of PE today and leave the kit locked in the locker.', [], [0], 'ignores_the_stated_goal'],
      ['Say her brother must have taken the key, then miss the lesson.', [], [0], 'blames_a_person'],
      ['Force the locker door open with a ruler.', [0], [1], 'meets_only_some_requirements'],
      ['Borrow the spare key and keep it for the rest of the week.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Go to the office after PE has started.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'Twenty minutes in the practice room',
    l: ['The practice room is booked for twenty minutes.', 'Two pieces must be practised.', 'The next booking starts on time.'],
    c: ['Both pieces get some practice.', 'The room is free at the end of twenty minutes.', 'The piano lid is closed before leaving.'],
    b: 'Spend ten minutes on each piece, then close the lid and go.',
    x: [
      ['Practise the first piece for the whole twenty minutes instead.', [], [0], 'ignores_the_stated_goal'],
      ['Say the booking sheet is unfair and practise nothing at all.', [], [0], 'true_but_irrelevant'],
      ['Practise both and carry on into the next booking.', [0], [1], 'meets_only_some_requirements'],
      ['Practise both, leave on time, and leave the lid up.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Set up for ten minutes, then rush one piece.', [], [0], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Five minutes to the bus',
    l: ['The bus leaves in five minutes and is the last one.', 'A borrowed book must go back to the classroom.', 'The classroom is two minutes away.'],
    c: ['The bus is caught.', 'The book is returned today.', 'Nothing is left on the classroom floor.'],
    b: 'Run the book to the shelf in the classroom, then catch the bus.',
    x: [
      ['Wait at the bus stop and take the borrowed book home again.', [], [1], 'ignores_the_stated_goal'],
      ['Say the teacher should have collected the books, then run for it.', [], [0, 1], 'blames_a_person'],
      ['Take the book back slowly and miss the bus.', [1], [0], 'meets_only_some_requirements'],
      ['Drop the book just inside the classroom door and dash off.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Give the book to someone else to hand in next week.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'One pair of scissors',
    l: ['Two children need to cut card.', 'One pair of scissors is left.', 'Both pieces must be cut before the glue dries.'],
    c: ['Both pieces are cut before the glue dries.', 'The scissors are not pulled between two people.', 'The scissors are passed handle first.'],
    b: 'One cuts while the other holds, then swap, passing handle first.',
    x: [
      ['Both wait for another pair of scissors to be found somewhere.', [], [0], 'too_late_for_the_deadline'],
      ['Argue that the other one had the scissors last time, then stop.', [], [0], 'blames_a_person'],
      ['Both hold the scissors and cut together.', [0], [1], 'meets_only_some_requirements'],
      ['Take turns properly, then throw the scissors across the table.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Tear the card by hand instead.', [], [0], 'ignores_the_stated_goal'],
    ],
  },
  {
    n: 'The jammed door',
    l: ['A heavy box must go into the store.', 'The store door swings shut on its own.', 'Nothing may be used to prop the door.'],
    c: ['The box gets into the store.', 'Nothing is used to prop the door.', 'Nobody carries the box one handed.'],
    b: 'One holds the door while the other carries the box two handed.',
    x: [
      ['Leave the heavy box out in the corridor by the store door.', [], [0], 'ignores_the_stated_goal'],
      ['Say the door should have been fixed last term, and give up.', [], [0], 'true_but_irrelevant'],
      ['Wedge the door with a chair and carry the box in.', [0], [1], 'meets_only_some_requirements'],
      ['Hold the door open and drag the box in with one hand.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Push the box through with a foot and let the door swing.', [0], [1, 2], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The plant that needs shade',
    l: ['A fern must stay out of direct sun.', 'The only free space is the sunny window.', 'A shelf by the door is shaded but narrow.'],
    c: ['The fern is out of direct sun.', 'The pot cannot fall off its shelf.', 'The doorway stays clear.'],
    b: 'Move the fern to the shaded shelf, pot pushed back to the wall.',
    x: [
      ['Put the fern on the sunny window sill with the other pots.', [], [0], 'ignores_the_stated_goal'],
      ['Say whoever bought a fern chose badly, then leave it in the sun.', [], [0], 'blames_a_person'],
      ['Leave the fern in the sun but water it more.', [], [0], 'meets_only_some_requirements'],
      ['Put it on the shaded shelf with the pot half over the edge.', [0], [1], 'meets_only_some_requirements'],
      ['Stand the fern on the floor just inside the doorway.', [0, 1], [2], 'breaks_a_stated_requirement'],
    ],
  },
  {
    n: 'Two clubs at once',
    l: ['Chess club and choir both meet on Tuesday at four.', 'Chess runs for an hour, choir for thirty minutes.', 'Choir will not let anyone join halfway.'],
    c: ['Both clubs are attended this term.', 'No club is joined halfway through.', 'No club is dropped altogether.'],
    b: 'Go to choir this Tuesday and chess the next, week about.',
    x: [
      ['Drop chess club for the term and go to choir every Tuesday.', [], [0, 2], 'ignores_the_stated_goal'],
      ['Say the timetable was written badly and sign up for neither club.', [], [0], 'true_but_irrelevant'],
      ['Go to chess first and slip into choir at the end.', [0], [1], 'meets_only_some_requirements'],
      ['Do choir every week and chess only in the holidays.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Sign up for both and go to neither.', [], [0], 'ignores_the_stated_goal'],
    ],
  },
  {
    n: 'The missing game piece',
    l: ['A board game is missing one counter.', 'Four children want to play now.', 'Nothing may be taken from another game box.'],
    c: ['All four can play now.', 'Nothing is taken from another box.', 'The stand-in piece is easy to tell apart.'],
    b: 'Use a coloured button from the craft tin as the fourth counter.',
    x: [
      ['Play with three counters and leave the fourth child watching.', [], [0], 'ignores_the_stated_goal'],
      ['Ask who lost the counter last time and wait for an answer.', [], [0], 'blames_a_person'],
      ['Take a counter from the other board game.', [0], [1], 'meets_only_some_requirements'],
      ['Use a second counter of a colour already in play.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Wait until a new game is bought.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'Snack for four',
    l: ['One pack holds six identical bars.', 'Four children are sharing it.', 'Nothing may be thrown away.'],
    c: ['Every child gets the same amount.', 'Nothing is thrown away.', 'No bar is left half open in the bag.'],
    b: 'Give one bar each, cut the last two in half, and share the halves.',
    x: [
      ['Give one bar to each child and put the last two in the bin.', [0], [1], 'meets_only_some_requirements'],
      ['Say the biggest person should get more, then hand out the bars.', [], [0], 'blames_a_person'],
      ['Give two bars to two children and one to the others.', [], [0], 'ignores_the_stated_goal'],
      ['Share every bar fairly and put the open wrapper back in the bag.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Keep the last two bars for tomorrow, unwrapped.', [0], [2], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Charging the tablet',
    l: ['One tablet is at five per cent.', 'The lesson using it starts in thirty minutes.', 'Only one charger works and it is in the office.'],
    c: ['The tablet is usable when the lesson starts.', 'The charger goes back to the office.', 'The tablet is not left charging unwatched.'],
    b: 'Fetch the charger, charge it beside you, then take it back.',
    x: [
      ['Use the tablet now until the battery dies completely.', [], [0], 'ignores_the_stated_goal'],
      ['Say the last user should have charged it, then leave it flat.', [], [0], 'blames_a_person'],
      ['Start charging it after the lesson has begun.', [1], [0], 'too_late_for_the_deadline'],
      ['Charge it fully and keep the charger in the classroom.', [0, 2], [1], 'breaks_a_stated_requirement'],
      ['Plug it in in the corridor and come back later.', [0], [2], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The bike chain',
    l: ['The chain has come off before school.', 'School starts in twenty minutes and is a ten minute ride.', 'Hands must be clean for the first lesson.'],
    c: ['School is reached on time.', 'Hands are clean for the first lesson.', 'The bike is not left blocking the path.'],
    b: 'Refit the chain with the spare glove, wash up, and use the rack.',
    x: [
      ['Sit by the bike and wait for someone else to fix the chain.', [], [0], 'too_late_for_the_deadline'],
      ['Say the bike shop did a bad repair, then wait by the gate.', [], [0], 'blames_a_person'],
      ['Refit the chain by hand and ride straight to the lesson.', [0], [1], 'meets_only_some_requirements'],
      ['Fix it cleanly, arrive on time, and lean the bike across the path.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Walk the bike all the way and arrive late but clean.', [1], [0], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Notes before the bell',
    l: ['Five lines of notes are on the board.', 'There are four minutes of lesson left.', 'The board is wiped at the bell.'],
    c: ['All five lines are recorded before the bell.', 'The record can be read later.', 'Nobody else is stopped from copying.'],
    b: 'Copy the headings and photograph the rest from one side.',
    x: [
      ['Try to memorise all five lines before the board is wiped.', [], [1], 'meets_only_some_requirements'],
      ['Say the teacher wrote too much and copy none of it down.', [], [0], 'true_but_irrelevant'],
      ['Copy every word slowly and get through two lines.', [1], [0], 'meets_only_some_requirements'],
      ['Photograph the board while standing right in front of it.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Scribble all five lines so fast they cannot be read.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The washing-up rota',
    l: ['The rota says two people wash up.', 'One of the two is off sick today.', 'The kitchen must be clear before the next group at one.'],
    c: ['The washing-up is done before one.', 'No more than two people are in the small kitchen.', 'The rota is corrected for next week.'],
    b: 'Get one stand-in, finish before one, and note it on the rota.',
    x: [
      ['Leave the washing-up in the sink for the next group at one.', [], [0], 'ignores_the_stated_goal'],
      ['Say the sick person should have come in anyway, and wait.', [], [0], 'blames_a_person'],
      ['Get four people in to finish it faster.', [0], [1], 'meets_only_some_requirements'],
      ['Find a stand-in, finish in time, and leave the rota unchanged.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Do it alone and finish at half past one.', [1], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'The wobbly shelf',
    l: ['A shelf holding heavy books is wobbling.', 'The caretaker is away until Thursday.', 'The books are needed every day this week.'],
    c: ['Nobody is under the shelf while it is loose.', 'The books stay available all week.', 'The shelf is reported for a proper repair.'],
    b: 'Move the books to a low table, tape off the shelf, log a repair.',
    x: [
      ['Leave the shelf and the books exactly as they are until Thursday.', [], [0], 'ignores_the_stated_goal'],
      ['Say whoever loaded the shelf overfilled it, then walk away.', [], [0], 'blames_a_person'],
      ['Take the books away and lock them in the store all week.', [0], [1], 'meets_only_some_requirements'],
      ['Move the books and tape off the shelf, and tell nobody.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Push the shelf back against the wall and carry on using it.', [], [0], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Marking out the field',
    l: ['The field must be marked before break in twenty minutes.', 'The line marker holds paint for one pitch only.', 'Two pitches are needed.'],
    c: ['Two pitches are usable at break.', 'The marker is not run dry mid-line.', 'The paint store is left locked.'],
    b: 'Mark one pitch, refill and lock the store, then mark the second.',
    x: [
      ['Mark one pitch only and let the two classes share it at break.', [], [0], 'ignores_the_stated_goal'],
      ['Say the marker should have been filled yesterday, then stop.', [], [0], 'blames_a_person'],
      ['Mark both pitches thinly and hope the paint lasts.', [0], [1], 'meets_only_some_requirements'],
      ['Mark both properly and leave the paint store open.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Refill first, then mark slowly and finish after break starts.', [1, 2], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'The cold classroom',
    l: ['The room is cold and the window is stuck open.', 'The glue drying on the table needs moving air.', 'Coats are in the corridor.'],
    c: ['Nobody is sitting in the cold draught.', 'Air still moves over the drying glue.', 'The corridor is not blocked by coats.'],
    b: 'Move the desks off the draught, glue by the window, coats on pegs.',
    x: [
      ['Sit where you are in the draught and put up with the cold.', [], [0], 'ignores_the_stated_goal'],
      ['Say the caretaker never fixes anything, then carry on shivering.', [], [0], 'blames_a_person'],
      ['Block the window with card so no air gets in.', [0], [1], 'meets_only_some_requirements'],
      ['Move the desks and the glue, and pile the coats on the floor outside.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Move everyone including the glue to the far corner.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The noisy fan',
    l: ['A loud fan makes reading time hard.', 'Without the fan the room gets too warm by noon.', 'Reading time lasts thirty minutes.'],
    c: ['Reading time is quiet enough to read.', 'The room is not too warm by noon.', 'Nobody has to sit right beside the fan.'],
    b: 'Turn the fan off for the thirty minutes, then straight back on.',
    x: [
      ['Read for thirty minutes with the fan running as loudly as it is.', [], [0], 'ignores_the_stated_goal'],
      ['Say the fan was a bad purchase and read with it running.', [], [0], 'true_but_irrelevant'],
      ['Turn the fan off for the whole morning.', [0], [1], 'meets_only_some_requirements'],
      ['Turn it off for reading, then seat one child next to it after.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Move the readers into the corridor for thirty minutes.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'A message during a test',
    l: ['A message must reach the teacher in room 4.', 'Room 4 is in the middle of a silent test.', 'The message is needed within the hour.'],
    c: ['The message reaches the teacher within the hour.', 'The silent test is not interrupted.', 'The message is not left where others can read it.'],
    b: 'Fold the note and hand it in at the door without speaking.',
    x: [
      ['Wait until tomorrow morning to pass the message on in person.', [], [0], 'too_late_for_the_deadline'],
      ['Say the office should deliver its own messages, and drop it.', [], [0], 'true_but_irrelevant'],
      ['Walk in and say the message out loud.', [0], [1], 'meets_only_some_requirements'],
      ['Hand over a folded note and read it aloud to check.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Leave the open note on the room 4 door.', [0], [2], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Wet paint in the corridor',
    l: ['A strip of corridor floor has just been painted.', 'It is the only route to the hall.', 'Assembly starts in ten minutes.'],
    c: ['Everyone reaches the hall in ten minutes.', 'Nobody walks on the wet paint.', 'The route is marked so the next class knows.'],
    b: 'Send everyone by the side door and sign both ends of the strip.',
    x: [
      ['Walk along the very edge of the wet painted strip to the hall.', [0], [1], 'meets_only_some_requirements'],
      ['Say the painter picked a silly time, then wait in the corridor.', [], [0], 'blames_a_person'],
      ['Cancel assembly for today.', [1], [0], 'ignores_the_stated_goal'],
      ['Use the side door and put a sign at one end only.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Lay paper over the wet paint and walk across it.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Two experiments, one timer',
    l: ['Two experiments both need timing.', 'One runs for three minutes, the other for eight.', 'There is one timer and one clock on the wall.'],
    c: ['Both experiments are timed accurately.', 'Neither experiment is left unwatched.', 'The timer is returned to the tray.'],
    b: 'Time the short run on the timer and the long one on the clock.',
    x: [
      ['Guess both times by counting the seconds under your breath.', [], [0], 'ignores_the_stated_goal'],
      ['Say the school should buy more timers, then start both runs.', [], [0], 'true_but_irrelevant'],
      ['Run the eight minute one first and start the other late.', [0], [1], 'meets_only_some_requirements'],
      ['Time both accurately and leave the timer on the bench.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Time one properly and leave the other running alone.', [0, 2], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'Weeding before the frost',
    l: ['Frost is forecast tonight.', 'Weeding the bed takes an hour, fleecing it takes ten minutes.', 'There are twenty minutes of daylight left.'],
    c: ['The bed is protected before the frost.', 'The work is finished in the daylight left.', 'The fleece is weighted so it cannot blow off.'],
    b: 'Skip the weeding, lay the fleece now, weigh the edges down.',
    x: [
      ['Start the weeding now and leave the fleece until tomorrow.', [], [0], 'ignores_the_stated_goal'],
      ['Say the forecast is usually wrong and leave the bed uncovered.', [], [0], 'true_but_irrelevant'],
      ['Weed as much as possible in twenty minutes.', [1], [0], 'meets_only_some_requirements'],
      ['Lay the fleece quickly and leave the edges loose.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Weed the whole bed by torchlight, then fleece it.', [0], [1], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The recorder battery',
    l: ['The recorder shows a low battery.', 'A forty minute interview starts in five minutes.', 'The battery lasts fifteen minutes and spares are in the cupboard.'],
    c: ['The whole forty minutes is recorded.', 'The interview starts on time.', 'The used battery is put in the recycling box.'],
    b: 'Fit a spare from the cupboard, old one in the recycling box.',
    x: [
      ['Record on the low battery and hope that it lasts the interview.', [1], [0], 'meets_only_some_requirements'],
      ['Say the last user drained the battery, then start recording.', [], [0], 'blames_a_person'],
      ['Fetch a battery from the shop and start late.', [0], [1], 'meets_only_some_requirements'],
      ['Fit a spare on time and drop the old battery in the bin.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Take notes by hand instead of recording.', [1], [0], 'ignores_the_stated_goal'],
    ],
  },
  {
    n: 'Returning the equipment',
    l: ['The equipment store shuts in fifteen minutes.', 'Six items are signed out to this group.', 'Anything unsigned stays on the group record.'],
    c: ['All six items are back before the store shuts.', 'Every item is signed back in.', 'Nothing is left outside the store door.'],
    b: 'Carry all six in one trip, sign each line off at the counter.',
    x: [
      ['Bring all six items back to the store tomorrow morning.', [], [0], 'too_late_for_the_deadline'],
      ['Say the store hours are too short and keep the six items.', [], [0], 'true_but_irrelevant'],
      ['Get all six back in time without signing anything off.', [0], [1], 'meets_only_some_requirements'],
      ['Return and sign off all six, stacking two by the door.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Sign off all six and bring back only four.', [1], [0], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'One spare tent pole',
    l: ['Two tents each have a broken pole.', 'There is one spare pole and a roll of strong tape.', 'Both tents must stand before dark.'],
    c: ['Both tents stand before dark.', 'The spare pole is not cut in half.', 'No repair uses more tape than is on the roll.'],
    b: 'Put the spare in one tent and splint the other broken pole with tape.',
    x: [
      ['Put both groups in the one tent that still has all its poles.', [], [0], 'ignores_the_stated_goal'],
      ['Say whoever packed the poles was careless, then stop working.', [], [0], 'blames_a_person'],
      ['Saw the spare pole in half and use a piece in each tent.', [0], [1], 'meets_only_some_requirements'],
      ['Use the spare in one tent and wrap the whole roll round the other.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Wait until morning and repair both properly.', [1, 2], [0], 'too_late_for_the_deadline'],
    ],
  },
  {
    n: 'The leaking bottle',
    l: ['A water bottle is leaking inside a full bag.', 'The bag holds a library book and a laptop.', 'The next lesson starts in three minutes.'],
    c: ['Nothing else in the bag gets wet.', 'The bag is ready for the lesson in three minutes.', 'The leaking bottle is not simply left in a corridor.'],
    b: 'Empty the bottle at the fountain, then use an outside pocket.',
    x: [
      ['Leave the leaking bottle in the bag and sort it out later.', [], [0], 'ignores_the_stated_goal'],
      ['Say the bottle was faulty when it was bought, and repack it.', [], [0], 'true_but_irrelevant'],
      ['Empty the whole bag on the floor and repack it slowly.', [0], [1], 'meets_only_some_requirements'],
      ['Take out the bottle, empty it, and stand it by the corridor wall.', [0, 1], [2], 'breaks_a_stated_requirement'],
      ['Wrap the bottle in the library book jacket.', [1], [0], 'meets_only_some_requirements'],
    ],
  },
  {
    n: 'The closed bridge',
    l: ['The usual route to the museum crosses a bridge that is shut.', 'The detour adds twenty minutes on foot.', 'The booking is in twenty-five minutes and a bus runs every ten.'],
    c: ['The group arrives before the booking time.', 'The group stays together.', 'Nobody crosses the closed bridge.'],
    b: 'Take the next bus round together and arrive with time to spare.',
    x: [
      ['Cross the closed bridge quickly and keep walking to the museum.', [0], [2], 'meets_only_some_requirements'],
      ['Say the council should have warned the school, then wait about.', [], [0], 'true_but_irrelevant'],
      ['Walk the detour and arrive after the booking.', [1, 2], [0], 'too_late_for_the_deadline'],
      ['Send the fast walkers ahead and let the rest take the bus.', [0, 2], [1], 'breaks_a_stated_requirement'],
      ['Cancel the visit for today.', [1, 2], [0], 'ignores_the_stated_goal'],
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

// One target option position per item in a variant (E-073). Positions are
// dealt out in cycles of `slots`, so every consecutive run of `slots` items
// uses each position exactly once: the plan is balanced overall AND spread
// across the difficulty ramp instead of clustering. Each cycle is shuffled
// from a fixed seed so the sequence is reproducible without being a bare
// 1,2,3,1,2,3. When `count` is not a whole number of cycles the remainder
// falls where the last partial cycle puts it.
export function keyPositionPlan(count, slots, seedKey) {
  const rnd = mulberry32(hashNum(seedKey));
  const plan = [];
  let cycle = [];
  for (let i = 0; i < count; i++) {
    if (i % slots === 0) cycle = seededShuffle(Array.from({ length: slots }, (_, j) => j), Math.floor(rnd() * 2 ** 32));
    plan.push(cycle[i % slots]);
  }
  return plan;
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

// Catalog floor for this type is grade 2-3 (raised off K-1 by D-017).
export function ageBandsFor(d) {
  if (d < 8) return ['2-3'];
  if (d < 12) return ['4-5'];
  return ['6-8'];
}

export const MAX_WORD_LEN_LOW = 11;
export const MAX_TEXT_CHARS_LOW = 80;

// ---------------------------------------------------------------------------
// Build one BankItem: scenario at variant v.
// ---------------------------------------------------------------------------
function buildItem(sc, scIdx, variant, index, keyPos) {
  const itemId = uuidFrom(`${TYPE_CODE}:${scIdx}:${variant}`);
  const difficulty = difficultyFor(index);

  const inScope = [];
  for (let i = 0; i <= variant; i++) inScope.push(i);
  const constraints = inScope.map((i) => ({ id: `c${i + 1}`, text: sc.c[i] }));

  const best = { text: sc.b, sat: [0, 1, 2], vio: [], lure: 'correct' };
  const distractors = sc.x.map((d) => ({ text: d[0], sat: d[1], vio: d[2], lure: d[3] }));

  // A distractor is usable at this variant only if it breaks a requirement the
  // child can actually see; otherwise it would be a second defensible answer.
  const eligible = distractors.filter((d) => d.vio.some((v) => inScope.includes(v)));
  const need = OPTION_COUNT[variant] - 1;
  if (eligible.length < need) {
    throw new Error(`${TYPE_CODE} scenario ${scIdx} ("${sc.n}") variant ${variant}: only ${eligible.length} distractors break a visible requirement, need ${need}`);
  }
  // Prefer the near-misses: distractors satisfying the most visible requirements.
  const ranked = eligible
    .map((d, i) => ({ d, i, score: d.sat.filter((s) => inScope.includes(s)).length }))
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .slice(0, need)
    .map((e) => e.d);

  // The key goes to its planned slot; the distractors keep the seeded order
  // they have always had and fill the rest.
  if (!Number.isInteger(keyPos) || keyPos < 0 || keyPos > need) {
    throw new Error(`${TYPE_CODE} scenario ${scIdx} variant ${variant}: key position ${keyPos} outside 0..${need}`);
  }
  const spread = seededShuffle(ranked, hashNum(itemId + ':opt'));
  const shuffled = [];
  for (let i = 0, d = 0; i <= need; i++) shuffled.push(i === keyPos ? best : spread[d++]);
  const options = shuffled.map((o, i) => ({ id: `a${i + 1}`, text: o.text }));

  const qualifying = shuffled
    .map((o, i) => ({ o, id: options[i].id }))
    .filter(({ o }) => inScope.every((ci) => o.sat.includes(ci)) && !o.vio.some((v) => inScope.includes(v)));
  if (qualifying.length !== 1) {
    throw new Error(`${TYPE_CODE} scenario ${scIdx} ("${sc.n}") variant ${variant}: ${qualifying.length} options satisfy every visible requirement (want exactly 1)`);
  }
  const correctKey = qualifying[0].id;

  const rationales = {};
  const polyScores = {};
  const model = shuffled.map((o, i) => {
    const id = options[i].id;
    const satisfies = inScope.filter((ci) => o.sat.includes(ci)).map((ci) => `c${ci + 1}`);
    const violates = inScope.filter((ci) => o.vio.includes(ci)).map((ci) => `c${ci + 1}`);
    rationales[id] = {
      lure: o.lure,
      why: o.lure === 'correct'
        ? `The only option that meets every stated requirement (${constraints.map((c) => c.id).join(', ')}) and breaks none.`
        : `${LURE_WHY[o.lure]} Breaks ${violates.join(', ') || 'a requirement'}; meets ${satisfies.join(', ') || 'none'}.`,
    };
    // Graded credit (M-POLY): one point per requirement met, minus one per break.
    polyScores[id] = satisfies.length - violates.length;
    return { id, satisfies, violates, lure: o.lure };
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
      presentation: 'text', // D-017: read on screen; no narration, no pictured choices
      situation: { title: sc.n, lines: sc.l },
      goalHeading: GOAL_HEADING,
      constraints,
      question: QUESTION,
      options,
      variant,
    },
    answer: {
      correctKey,
      distractorRationales: rationales,
      // What the checker re-derives the key from, without reading correctKey.
      constraintModel: {
        constraintIds: constraints.map((c) => c.id),
        options: model,
      },
      polyScores,
      rubricDimensions: [
        'reasoning_for_the_choice — why this action meets the list (deferred: not elicited in this renderer)',
        'trade_off_awareness — whether the child notices which requirement each rejected option breaks (deferred)',
      ],
    },
    scoring: {
      mode: 'deterministic_key',
      keyedComponents: ['constraint_satisfaction_choice'],
      deferredComponents: ['reasoning_for_the_choice', 'trade_off_awareness'],
      polyCredit: 'polyScores gives graded credit: requirements met minus requirements broken.',
      constructNote: 'The key is constraint satisfaction against requirements STATED in the item, not expert-consensus effectiveness. No option is wrong for being blunt, quiet, sociable or self-reliant, and help-seeking is only keyed as failing where a setting line states why it cannot work.',
    },
    provenance: {
      generator: 'llm',
      generatorRef: GENERATOR_REF,
      seed: `${scIdx}:${variant}`,
      scenarioIndex: scIdx,
      variant,
      contentHash: createHash('sha1').update(JSON.stringify([sc, variant])).digest('hex').slice(0, 16),
      validatorVerdicts: [
        { check: 'single_satisfiability', status: 'pass', detail: 'exactly one option meets every stated requirement' },
        { check: 'standard_stated_in_item', status: 'pass', detail: 'requirements are printed for the child' },
        { check: 'no_audio', status: 'pass', detail: 'D-017: text-only scenario, no pictured choices' },
        { check: 'no_preference_keyed', status: 'pass', detail: 'no option is keyed on politeness, compliance or cultural norm' },
      ],
    },
    syntheticOnly: true,
    validated: false,
  };
}

export function buildBank() {
  const items = [];
  for (let v = 0; v < 3; v++) {
    const plan = keyPositionPlan(SCENARIOS.length, OPTION_COUNT[v], `${TYPE_CODE}:keypos:v${v}`);
    for (let s = 0; s < SCENARIOS.length; s++) {
      items.push(buildItem(SCENARIOS[s], s, v, v * SCENARIOS.length + s, plan[s]));
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Build-time validation.
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

    const cm = it.answer.constraintModel;
    const all = cm.constraintIds;
    const qual = cm.options.filter((o) => all.every((c) => o.satisfies.includes(c)) && !o.violates.length);
    if (qual.length !== 1) errors.push(`${where}: ${qual.length} options satisfy every requirement`);
    else if (qual[0].id !== it.answer.correctKey) errors.push(`${where}: correctKey mismatch`);
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
