# Example apps: thirty screeners hiding inside things K-8 kids already like

**What this is.** Thirty concrete app concepts spanning the interest areas children in K-8 actually
spend time on, each one carrying CogAT-aligned items inside a mechanic the child wants to play for its
own sake. It is the motivating list for `ui-agnostic-assessment-system.md`: thirty apps this different
is the reason an item may not name a colour, a coordinate or an option letter.

**None of these judges anybody.** Every app here suggests and prepares. A child who does badly is not
told so, is not recorded, and loses nothing. The output is an invitation to apply plus an aggregate
read on which channels produce applicants who clear the real CogAT bar.

---

## 1. The idea that makes this work: some mechanics already ARE CogAT items

The temptation with a list like this is to bolt a quiz onto a theme. That produces a quiz with a
skin, the child notices, and the whole advantage evaporates.

The better move is to find mechanics that are **already** the item form. A fill-in-the-lyric game is
not "Sentence Completion with a Taylor Swift theme"; it is Sentence Completion, and it has been all
along. Nobody is disguising anything, which is precisely why nobody notices.

Eight of these, and they are the ones to build first.

| Native mechanic | Is literally | CogAT subtest |
| --- | --- | --- |
| Finish the lyric | Choosing the word that completes a sentence | **Sentence Completion** |
| Meme format matching | `format : meaning :: format : ?` | **Verbal Analogies** |
| Creature trait inheritance | `parent : offspring :: parent : ?` | **Verbal / Figure Analogies** |
| Origami and paper craft | Fold it, punch it, predict the unfolding | **Paper Folding** |
| Type matchups (what beats what) | Sorting by a rule you have to infer | **Verbal / Figure Classification** |
| Trading and shop economy | Equations with a missing element, balanced | **Number Puzzles** |
| Recipe scaling | Holding a ratio while quantities change | **Number Analogies** |
| Pattern-completion in a build grid | A 2x2 or 3x3 matrix with a hole in it | **Figure Matrices** |

Everything in section 3 onward is either one of these eight in costume or a deliberate stretch beyond
them, and the tables say which.

## 2. What each surface can and cannot carry

A capability tier caps what an app can measure, no matter how good the theme is. This is
`CapabilityDemand` from the companion document, applied.

| Tier | What it can present | Subtests it can carry |
| --- | --- | --- |
| **T1 Full** | 2D layout, many forms, rotation, animation, timing | All nine |
| **T2 Visual** | Images and choices, no fine spatial work or reliable timing | VA, SC, VC, NA, NP, NS, FC |
| **T3 Audio** | Speech or music in and out, no visuals | VA, SC, VC, NS |
| **T4 Print** | Static, untimed, physical | All nine except paced. Paper Folding is native |
| **T5 Glance** | Seconds of divided attention | One short `chooseOne` per encounter |

**VA** Verbal Analogies, **SC** Sentence Completion, **VC** Verbal Classification, **NA** Number
Analogies, **NP** Number Puzzles, **NS** Number Series, **FM** Figure Matrices, **PF** Paper Folding,
**FC** Figure Classification. Methods are the six from the companion document: `chooseOne`,
`chooseMany`, `order`, `replaySequence`, `placeOnScale`, `produceValue`.

---

## 3. Music and pop fandom

The single best interest area for verbal reasoning, because lyrics are sentences and fandoms are
classification systems that children have already memorised voluntarily.

| # | App | The hook | Tier | Carries | Methods | Native? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Finish the Line** | Complete the lyric before the beat drops | T2/T3 | SC, VA | `chooseOne` | **Yes** |
| 2 | **Era Sorter** | Which album era does this track belong to | T2 | VC, FC | `chooseMany` | **Yes** |
| 3 | **Setlist Builder** | Order the songs for the perfect show | T2 | NS, ordering | `order` | Close |
| 4 | **Riff Back** | Hear the phrase, play it back | T3 | none (working memory) | `replaySequence` | No |
| 5 | **Easter Egg Decoder** | Crack the clue the artist hid in the video | T2 | VA, FC | `chooseOne` | Close |
| 6 | **Tour Router** | Plan the tour across the map with the fewest miles | T1 | spatial, NP | `order` | No |

Number 1 is the strongest single concept on this list. **Fandom lyric knowledge is enormous, entirely
voluntary, and structurally identical to a CogAT verbal item.** It also solves the hardest problem in
verbal screening, which is that a reading-load-heavy item measures reading. A lyric a child already
knows by heart carries no reading burden at all, so what is left is the reasoning.

Number 2 is worth noticing for a different reason: children maintain elaborate, self-taught
classification systems about the things they love, and Verbal Classification is a test of exactly that
capacity applied to novel material. Sorting by an era rule the app never states is the subtest.

## 4. Game worlds and characters

The deepest well, and the one where above-level items need no explanation, since a game getting harder
is what a game is for.

| # | App | The hook | Tier | Carries | Methods | Native? |
| --- | --- | --- | --- | --- | --- | --- |
| 7 | **Hatchery** | Breed creatures; predict what the egg produces | T1 | **VA, FM, NA** | `chooseOne` | **Yes** |
| 8 | **Type Table** | Work out what beats what, then win the fight | T2 | VC, FC | `chooseOne` | **Yes** |
| 9 | **Circuit Shed** | Build the redstone contraption that opens the door | T1 | NP, FM | `produceValue` | Close |
| 10 | **Obby Gates** | Each door needs a pattern solved to pass | T1 | FM, PF, FC | `chooseOne` | **Yes** |
| 11 | **Deck Synergy** | Build a deck where the cards combo | T2 | NA, VC | `chooseMany` | Close |
| 12 | **Tower Placement** | Place defences to cover every lane | T1 | spatial, NP | `placeOnScale` | No |
| 13 | **Who's Lying** | Deduce the impostor from what each crew member said | T2 | deduction | `chooseOne` | No |
| 14 | **Speedrun Ladder** | Climb the weekly leaderboard of harder puzzles | T1 | FM, PF, NA | `chooseOne` | **Yes** |

Number 7 is the best structural match in the whole document. **Trait inheritance is an analogy.** A
child reasoning "these two parents gave a small spotted one, so those two will give…" is completing
`A:B::C:?` on figural attributes, which is Verbal Analogies and Figure Matrices at once. Breeding and
collecting mechanics are also self-motivating over weeks, which is where repeated measurement comes
from.

Number 14 is where above-level testing belongs. Serving a fourth grader eighth-grade items usually
needs a justification; on a ladder that explicitly gets harder as you climb, it is the product.

## 5. Trends and memes

Short shelf life, very high engagement, and one exact structural match.

| # | App | The hook | Tier | Carries | Methods | Native? |
| --- | --- | --- | --- | --- | --- | --- |
| 15 | **Format Match** | This format means that; find the pair that works the same way | T2 | **VA** | `chooseOne` | **Yes** |
| 16 | **Trend Timeline** | Put the trends in the order they happened | T2 | NS, ordering | `order` | Close |
| 17 | **Copy the Dance** | Repeat the step sequence | T1 | none (working memory) | `replaySequence` | No |
| 18 | **Tier List** | Rank them and defend the ranking | T2 | ordering, VC | `order` | No |
| 19 | **Vibe Check** | Sort these into the two aesthetics | T2 | VC, FC | `chooseMany` | **Yes** |

Number 15 is the sleeper. **A meme format is a relation between a template and a meaning, and matching
two formats that share a relation is the Verbal Analogies item form exactly.** It also has a property
no vocabulary item has: the material is current, so it cannot be drilled from a prep book, and it
tests relational reasoning over content the child acquired for fun rather than through instruction.

The obvious cost is shelf life. Format banks would need refreshing every few months, which is an
argument for generators rather than fixed items and is how the library already works.

## 6. Sports, competition and collecting

| # | App | The hook | Tier | Carries | Methods | Native? |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | **Fantasy Lineup** | Pick a lineup inside the salary cap | T2 | **NP**, NA | `chooseMany` | **Yes** |
| 21 | **Bracket Logic** | Fill the bracket from the clues about who beat whom | T2 | deduction, ordering | `order` | No |
| 22 | **Playbook** | Read the diagram and say where the player ends up | T1 | spatial | `chooseOne` | No |
| 23 | **Album Complete** | Finish the sticker set; scan codes to unlock puzzles | T4 → T2 | VA, NA, FM | `chooseOne` | Close |
| 24 | **Trade Floor** | Trade cards at fair value in a live market | T2 | **NP, NA** | `placeOnScale`, `produceValue` | **Yes** |

Numbers 20 and 24 are the same insight twice. **A salary cap and a fair trade are both equations with
a missing element that has to balance, which is the Number Puzzles item form.** Quantitative reasoning
is the hardest battery to make fun, and an economy is the one mechanic where children do arithmetic
reasoning voluntarily and at length.

## 7. Animals, nature, making and building

| # | App | The hook | Tier | Carries | Methods | Native? |
| --- | --- | --- | --- | --- | --- | --- |
| 25 | **Paper Zoo** | Fold the animal, then guess where the cuts land | T4/T1 | **PF** | `chooseOne` | **Yes** |
| 26 | **Habitat Match** | Put each creature where it belongs and say why | T2 | VC, FC | `chooseOne` | **Yes** |
| 27 | **Fossil Rebuild** | Reassemble the skeleton from the fragments | T1 | FM, PF, spatial | `order`, `chooseOne` | Close |
| 28 | **Scale the Recipe** | Cook for eight instead of four, keep it tasting the same | T2 | **NA**, NP | `placeOnScale` | **Yes** |
| 29 | **Blueprint Build** | Build the thing from the flat plan | T1 | PF, spatial, FM | `produceValue` | Close |

Number 25 matters because **Paper Folding is the one CogAT subtest with a real-world activity behind
it.** Origami is a craft children already do, it is native to print as well as screen, and it is the
subtest most obviously untouched by the prep market.

## 8. Reward systems, which sit over all of the above

Reward and progression are not a separate app so much as the layer that makes any of the previous
twenty-nine get opened twice. Repeat encounters are the most valuable property on the list, since
measurement spread over weeks beats one long sitting and a bored child abandons a long sitting anyway.

| # | Layer | What it does | Caveat |
| --- | --- | --- | --- |
| 30 | **Season pass, streaks and rarity** | Daily reasoning quests, escalating cosmetic rewards, collection sets that need many days to complete | Reward participation, never accuracy |

**That caveat is load-bearing and it is the one thing on this page I would not compromise on.**
Performance-contingent rewards reliably undermine intrinsic motivation in children, and a child working
for a prize is not producing the ordinary behaviour the whole covert design exists to capture. Paying
for accuracy would also import exactly the incentive that makes the CogAT coachable. So the streak
advances for showing up and the rare item drops for turning up seven days running, and nothing in the
reward layer ever reads whether the answer was right.

## 9. Using somebody else's characters

Most of the interest areas above are somebody's intellectual property, and the named ones are the most
valuable and the least available. Two workable patterns, neither of which is "use it and hope".

**Partner where GT can.** A creator or a mid-size franchise reaches more K-8 children than any ad spend
GT could buy, and companion apps for creators are an established format.

**Build the genre, not the brand, everywhere else.** A creature-collector with inheritance mechanics
does not need to be Pokémon to work, because the reasoning lives in the mechanic and not in the
character. This is the same argument as the rest of the design: the carrier is arbitrary, so the
carrier can be one we own.

## 10. What these contexts cost us in measurement

Four problems, all real, none fatal, all worse than a proctored room.

**Conditions are uncontrolled.** Device, input method, interruptions, and whether an older sibling was
helping. The engine already has rapid-guess and disengagement filters, and process metrics catch some
of it, but most is unobserved variance.

**Self-selection is severe and it cuts against us.** Whoever opens a creature-collector is not a random
sample, and correlations computed inside a self-selected group are attenuated by range restriction. So
the first numbers will understate the true relationship for statistical rather than substantive
reasons, and that should be said before the numbers arrive rather than after.

**Repeat exposure is the main advantage and a real risk.** Items get seen twice. Generators plus seeds
handle it, but only if every app draws on one shared exposure ledger, which argues for a single bank
service rather than a copy per app.

**Identity is usually absent.** Most of these produce an anonymous session, and linking it to an
application needs the parent to do something. The sticker-album scan code in number 23 and the
print-to-phone handoff are the patterns for that, and it is where most of the funnel will be lost.

---

Companion document: `ui-agnostic-assessment-system.md`. The tiers in section 2 are the requirement its
`CapabilityDemand` model exists to satisfy, and its Phase 0 bank-sufficiency report is what will say
which of these thirty can actually fill a blueprint.
