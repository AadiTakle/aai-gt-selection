# Can `VER-SORTBOT-01` be made good for third to fifth graders?

12 Aug 2026. Prompted by the owner answering 0 of 4 on it and saying it felt impossible. It was.

**Yes, and the fix is to stop drawing pictures.** The presentation was built correctly for a different audience
than this app now targets, and the bank has said so all along: every item declares `presentation: "word"`.

## What went wrong, separated into two problems that look like one

### Problem one: the pictures, which is a presentation defect and fully fixable

`SortingGate.tsx` draws every word as a glyph through `tokenGlyph`, because the app promised
`maxReadingBand: 'none'` — no reading at all — and its own note explains the reasoning: "the bank's
`presentation` is `"word"` and its content is literally single words, so a faithful rendering would be a
vocabulary test wearing a reasoning test's clothes."

That is sound reasoning for a pre-reader. It fails badly on this bank:

| | |
|---|---|
| items in the bank | 100 |
| items that pass `sortingGateServes` | **27** |
| fail: undrawable words *and* duplicate glyphs | 57 |
| fail: duplicate glyphs only | 10 |
| fail: undrawable words only | 6 |
| items where the **keyed answer draws as the same shape as the OUT counter-example** | **8** |

That last row is the serious one. Those eight are not hard items, they are **anti-informative**: the only
visible evidence points away from the correct answer. A child reasoning perfectly from what is on screen gets
them wrong.

The four the owner met, as they were actually rendered:

| words | drawn as | outcome |
|---|---|---|
| IN clever, wise · OUT dull · options brain, orange, brilliant, sharp | IN feather, shell · OUT **leaf** · options shell, pebbles, **leaf**, acorn | keyed answer `brilliant` drew as **leaf — the same shape as the OUT example** |
| IN furious, mad · OUT calm · options metal, shout, upset, irate | IN **feather**, shell · OUT **feather** · options feather, leaf, feather, feather | `furious` (IN) and `calm` (OUT) drew as the **same shape**; three of four options were identical |
| IN bold, daring · OUT timid · options valiant, reckless, hero, purple | IN mushroom, mushroom · OUT feather · options leaf, acorn, acorn, pebbles | keyed answer had **no visual relation** to the IN examples |
| IN hat, bat · OUT dog · options mat, cot, kitten, sun | IN **crown**, bat · OUT dog · options pebbles, shell, feather, sun | rule is "rhymes with cat" — **rhyme is not visible in a picture**, and `hat` drew as a crown |

The gate that would have caught all four exists and is correct. It was applied at pool level in
`server-plugin.ts`, and the platform integration replaced that file without reimplementing it. The note left in
`sites.ts` understated the scale as "10 of its 37 small-band items"; it is 73 of 100.

### Problem two: fifteen synonym items, which is an item defect and not fixable by rendering

Classifying the hidden rules:

| rule kind | items | age bands |
|---|---|---|
| **category** — crustaceans, prime numbers, egg-laying animals, renewable resources | **83** | K-1 17, 2-3 20, 4-5 19, 6-8 27 |
| **synonym** — "words meaning truthful", "words meaning to lessen" | 15 | all 6-8 |
| **phonological** — rhyme, initial sound | 2 | 4-5 1, 6-8 1 |

The 83 category items are sound. The answer is determinate, the reasoning is genuinely categorical, and
`cogat.ts` maps this type to **verbal-classification** at strength `direct` — one of the three real CogAT
Verbal subtests, which is the argument for saving it rather than retiring it.

**The 15 synonym items have more than one defensible answer.** Reading the hardest ones:

- IN `candid, frank` · OUT `deceitful` · keyed **`veracious`** — but `honest` is also an option, and `honest`
  also means truthful.
- IN `diminish, abate` · OUT `amplify` · keyed **`mitigate`** — but `soften` and `reduce` are both options and
  both mean to lessen.
- IN `enduring, durable` · OUT `fleeting` · keyed **`perennial`** — `sturdy` is an option and is arguably
  long-lasting.

Showing those as text does not help: "honest is also truthful" is true in every medium. An automated check for
this found nothing, because it can only catch collisions the bank itself demonstrates — which is exactly why
these need a human read rather than a script.

## The fix

1. **Render the words as words for this audience.** Third to fifth graders read fluently; single common words
   are not a barrier. Real CogAT presents Verbal Classification as words from grade 3 upward. This makes all
   100 items renderable, and it removes every glyph collision and all eight anti-informative items at a
   stroke — no glyph table can ever be complete enough to beat it.
2. **Serve the 83 category items.** For a grade 3-5 child tested above level, the relevant slice is the 19
   items banded `4-5` and the 27 banded `6-8`, with the 20 at `2-3` as a floor.
3. **Hold the 15 synonym items back** pending a human pass over their distractors. They are all `6-8`, so
   holding them costs the pool nothing at grade level.
4. **Drop the 2 phonological items** on construct grounds. As text a rhyme is legible, so the presentation
   objection disappears — but rhyming is not categorical reasoning and does not belong in this subtest.
5. **Keep `SortingGate.tsx`.** It is good work and the right presentation for a pre-reading audience. The
   pictorial path should become a choice keyed on the app's reading band rather than the only option.

## What this costs, stated plainly

**`maxReadingBand: 'none'` stops being true**, and that is the real price. It has to become an honest value,
because the platform intersects that field against item requirements to decide what may be served, and a
declaration that is true of one layer and false of another will eventually be trusted by something.

Worth noting the 83 category items are mostly concrete nouns — crab, lobster, hen, frog, timber, coal — which
sit well inside third-grade reading. The hard vocabulary is concentrated in the synonym items being held back.

**Vocabulary knowledge becomes part of what is measured.** For CogAT Verbal that is not a contamination, it is
the construct: all three Verbal subtests ask what a word means relative to other words. It is still worth
saying out loud, because it means a child who reads late will score lower on this battery for a reason that is
not reasoning — which is an argument for the disjunctive pass route, not against the subtest.

## Not yet done

This is a determination, not an implementation. Rendering words needs a text path in `SortingGate`, the app's
reading band needs to change, and per-item selection needs a way to exclude the 17 held-back items — which the
platform cannot currently express, since `RegistryItem.validated` exists but selection does not read it and no
item sets it.
