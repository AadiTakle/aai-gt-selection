# Question-bank review — reviewer feedback triaged

**Source:** `2026-08-10-gt-type-review.md` / `.json`, vendored beside this file so the raw comments stay
readable next to what was done about them. 37 of 66 types reviewed, exported 10 Aug 2026.

> **Cross-references to CogAT mappings and engine numbers below come from PR #67, which is not merged to
> `dev` yet.** This branch is deliberately independent of it and touches no code, but the `none` / `loose`
> classifications and the information figures live there. If #67 changes in review, §3 and §5 move with it.

**Nothing in the bank data has been changed by this document.** It is a triage: what the feedback means, what
of it is actionable here, and which parts are measurement problems rather than polish. Deleting item data or
retiring a type is a product decision and is recommended below rather than taken.

---

## 1. The review covers a wider catalogue than we ship

66 types reviewed against **53 in `qbank-library/banks/`**. Of the 37 with comments, **25 are types we
actually serve** and 12 are not in the bank at all.

That reconciliation matters most for the kill list. **14 types are marked "kill" and 12 of them are already
absent from the bank** — `CX-diverge-01`, `CX-figural-01`, `FLU-MATRIXBUILD-01`, `GB-FILTER-01`,
`GB-PATHFORGE-01`, `GB-SHAPEFIT-01`, `QUANT-BUILD-01`, `QUANT-EQUAL-01`, `QUANT-MOBILE-01`,
`QUANT-NUMLINE-01`, `WM-gate-01`, `WM-gridflash-01`. Those verdicts are confirmations of pruning that already
happened, not work.

**Two kills are live:**

| Type | Items | Servable | CogAT | Cost of killing |
|---|---|---|---|---|
| `CX-achieve-02` | 120 | **0** (`model_judge_deferred`) | `none` | Nothing servable. It is also the **only** `model_judge_deferred` type, so killing it removes that entire scoring mode from `1b.6`'s remaining scope. |
| `FLU-DEDUCE-01` | 120 | 120 | `none` | 120 servable items leave the pool. No CogAT coverage lost. |

`CX-achieve-02` is the cheaper decision by a distance: it costs no servable items and *deletes a whole
category of future work*. Worth taking on its own merits.

## 2. "UI / interaction" is doing too much work as a label

Every comment but one arrived tagged `ui`. They are not one kind of problem, and the difference decides who
fixes them and how urgent it is. Of the 25 in-bank types:

| Kind | Types | Why it is not polish |
|---|---|---|
| **Item validity** | 6 | The item admits more than one defensible answer, or none. A child who picks the *other* right answer is marked **wrong**, and the estimate moves against them. This corrupts measurement. |
| **Stimulus discriminability** | 8 | The feature the rule turns on cannot be seen — symbols too small, base of a solid hidden, colours nearly identical, the lit cell not bright enough. An item whose discriminating attribute is imperceptible measures eyesight, not reasoning. |
| **Difficulty calibration** | 4 | "difficulty might be off", "doesn't really scale", "kinda easy". |
| **Guessing** | 2 | "really high guess percentage", "easy to guess, not many options". |
| **Scoring rule** | 1 | `FLU-CONCEPT-01`: efficiency should not be weighted. |
| **Genuine polish** | 2 | Animation quality, player character. |
| **Kill** | 2 | Above. |

**The first two rows are 14 of 25 types and they are measurement defects, not experience defects.** They
belong to whoever authored the items, not to whoever styles them, and an instrument that reports an ability
estimate over an item with two right answers is reporting a number it has not earned.

## 3. Where the feedback independently corroborates the engine work

Several comments describe, from the outside, problems the engine work found from the inside. That agreement is
worth naming, because it means neither was an artefact.

- **`QUANT-DOTS-01` — "really high guess percentage … not very informative."** Exactly right, and now
  modelled. It is a two-option left/right comparison that the engine had been treating as a four-option item
  with a 25% guess floor; the true floor is 50%. Its maximum information at the decision
  threshold is **0.58× that of a four-option item at the same difficulty** (0.203 against 0.348 at a = 1.5) —
  the lowest in the bank, so selection already avoids it. The reviewer
  felt as a player what the model now says.
- **`FLU-STACK-01` — "fairly easy to guess since there aren't many options."** Same mechanism. The suggestion
  to make it constructed-response rather than multiple choice would raise its information sharply — an unguessable constructed
  item carries **1.62×** the information of a four-option one at the same difficulty.
- **`QUANT-SERIES-01`, `QUANT-MIX-01`, `QUANT-MATRIX-01`, `FLU-LADDER-01` — difficulty doubts.** Consistent
  with what the engine already says about itself: the bank's 1–20 difficulty is **a rescaling, not a
  calibration**, and most values are synthetic. Nothing in the repo has met a child, so a reviewer's sense
  that difficulty 20 is trivial is better evidence than the number is.
- **`FLU-ODDPAIR-01` — "sometimes there are multiple odd ones out."** This one has teeth beyond the item: the
  type is mapped `loose` to figure-classification and flagged `needsAuthorReview`. If items genuinely admit
  several answers, the mapping is the smaller problem.

## 4. What could not be verified from the bank data

**`FLU-VENN-01` — "the same symbol appears twice, so they can't be separate venn diagrams."** Checked all 120
items: **no identical exemplar appears on both sides in any of them**, at any difficulty. Exemplars carry six
attributes (shape, colour, fill, count, rotation, mark) and `ruleCount` is 2, so two exemplars sharing a
*shape* while differing on the discriminating attribute is a valid item, not a broken one.

So either the reviewer read a valid item as broken, or the rendering does not make the discriminating
attribute visible — which is the discriminability failure in §2 rather than a data defect. **Reproducing this
needs the rendered item, not the bank.** Worth resolving before anyone edits the generator, because the two
diagnoses have opposite fixes.

## 5. Recommended disposition

1. **Retire `CX-achieve-02`.** Costs no servable items and removes `model_judge_deferred` from `1b.6` entirely.
2. **Decide `FLU-DEDUCE-01`** — 120 servable items, no CogAT coverage. The reviewer's objection ("clues aren't
   clear because you don't know which attributes are being measured") is a validity objection, so this is a
   measurement call rather than a taste one.
3. **Treat the 14 validity and discriminability types as a defect queue, ahead of polish.** A per-item audit
   for multiple-valid-answers on the six validity types is the highest-value item in this document.
4. **Do not recalibrate difficulty from these comments.** They are the right signal that the numbers are
   unearned, but the fix is real response data, not renumbering by impression.
5. **Resolve the `FLU-VENN-01` ambiguity** by rendering the items the reviewer saw.

## 6. Every comment, as received

`✅` marks a type we actually serve. Text is verbatim, including typos — it is evidence, not prose.

| Type | In bank | Kind | Comment |
|---|---|---|---|
| `CX-achieve-02` | ✅ | kill | kill this question type |
| `CX-diverge-01` | — | kill | kill |
| `CX-figural-01` | — | kill | kill |
| `FLU-ANALOGY-01` | ✅ | validity | When rotating 72 degrees, some fgures (like the pentagons, have rotationa symmetry so it is impossible to tell them ap… |
| `FLU-CARPET-01` | ✅ | discriminability | symbols too small, make larger (if sizing is a feature, its not noticeable enough), ie make size differences more noti… |
| `FLU-CONCEPT-01` | ✅ | scoring | efficiency shouldn be weighted bc the child will plan to use all of them not plan to optimize |
| `FLU-DEDUCE-01` | ✅ | kill | cleus arent super clear, because is  you dont know what attributrs are being eeasured. kill this question type |
| `FLU-GRIDCOPY-01` | ✅ | validity | always have two examples, bc for really hard problems it is impossible to determine a clear rule, becomes kinda guessw… |
| `FLU-LADDER-01` | ✅ | difficulty | maybe difficulty doesnt go that high?? |
| `FLU-MATRIXBUILD-01` | — | kill | kill this question typr |
| `FLU-ODDPAIR-01` | ✅ | validity | sometimes there are multiple odd ones out, for example here, the one with only one dot, or the one thatshrinks instead… |
| `FLU-STACK-01` | ✅ | guessing | maybe could be not multiple chocie and you fill it out instad, fairly easy to guess since there arent many options ( a… |
| `FLU-VENN-01` | ✅ | validity | in some questions, the same symbol appears s twice, so they cant be separate venn diagrams, so confusing (especially d… |
| `GB-EXPLORE-01` | ✅ | polish | make a player character, also smal drawing of eadch icon (like home well etc(, also small pause between fidning everyt… |
| `GB-FILTER-01` | — | kill | kill |
| `GB-PATHFORGE-01` | — | kill | kill |
| `GB-SHAPEFIT-01` | — | kill | kill |
| `GB-TRACK-01` | ✅ | discriminability | ui  doesnt sshow all the jars, so hides make sure it is playable |
| `QUANT-BUILD-01` | — | kill | kill |
| `QUANT-DOTS-01` | ✅ | guessing | lowkey really hgoh guess percenage, and very fine margins, not very informative |
| `QUANT-EQUAL-01` | — | kill | kill |
| `QUANT-MATRIX-01` | ✅ | difficulty | lowkey kinda easy lol |
| `QUANT-MIX-01` | ✅ | difficulty | i think difficulty doesnt really scale e the 20 difficulty one you can jst fill to be the same as the other ones (so i… |
| `QUANT-MOBILE-01` | — | kill | kill |
| `QUANT-NUMLINE-01` | — | kill | kill |
| `QUANT-SERIES-01` | ✅ | difficulty | difficulty might be off |
| `QUANT-WORD-01` | ✅ | validity | sometimes you need all the numbers so doesnt make sense lowkey (always introduce distractor, or just if no ditractor t… |
| `SPA-FOLDNET-01` | ✅ | validity | make sure the net is correct should be edges touching edges, not vertices touching edges. |
| `SPA-PUNCH-01` | ✅ | polish | folding animation is bad, try to fix it like the previous one, which is good |
| `SPA-ROLL-01` | ✅ | discriminability | restatrt doesnt let you see the color of ther cube (restart should send you to start, but not start rolling) (and you … |
| `SPA-SCENE-01` | ✅ | discriminability | make sure the icons are flat on the ground or else its unclear, also remove shadows pls |
| `SPA-SHADOW-01` | ✅ | discriminability | make ligth rays parallel to ground pls |
| `SPA-XSCAN-01` | ✅ | discriminability | sometimes it is impossibler to know the shape of answers chocies (or at least very hrd) for example one problem requir… |
| `WM-bind-01` | ✅ | discriminability | some of them have veryslight color differences, make each problem only use one color ( |
| `WM-corsi-01` | ✅ | discriminability | make lighting more bright so it is more noticeble whichlit up (also add replay of lighting up pls) |
| `WM-gate-01` | — | kill | kill |
| `WM-gridflash-01` | — | kill | kill |