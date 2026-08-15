# Implementation plan: UI-agnostic engines, CogAT-aligned question types, and their banks

**What this is.** The plan for turning what we have built into a system that can drive any testing or
screening scenario: a small set of engines, a set of question types with defensible correspondence to
CogAT, and item banks behind those types, where nothing inside an item dictates how it gets drawn.
The screener in `../proposals/public-screener.md` becomes one consumer of it. So does a full battery,
a game, a voice assistant and a printed form.

**Two audit findings shape everything below, and they point in opposite directions.**

The good one: **the engine is already presentation-free.** It reads exactly three things out of an
item's content, and none of them are sensory. Selection, the posterior, coverage, the stop rules and
the derived metrics all run on `typeCode`, `difficulty`, `domain`, `ageBands` and scored results. So
the expensive-sounding half of this scope is mostly already done.

The bad one: **the CogAT requirement is the real work.** Of 52 wired question types, 9 have direct
CogAT correspondence and they carry 1,132 of 7,199 bank items, which is 16%. Thirty-five types have
no CogAT analogue at all. One CogAT subtest, Verbal Analogies, has no type in the repository, and it
is one of the three subtests Riverside's own screening form is built from.

---

## 0. Why this is not the instrument Joe banned

Worth stating up front, because the surface resemblance is close enough that somebody will raise it.

**This system selects nobody, so it is not a selection instrument.** Joe's ban is on an in-house
cognitive test standing in for the CogAT, and his stated worry is about who gets taken into the
program: *"Who's to say we're not only taking a certain type of person in this program."* That worry
attaches to a gate. Everything built here recommends, suggests and prepares. A child who does badly is
not told so, is not recorded as ineligible, and loses nothing they had before they opened the app.
Nobody is turned down, because there is nothing here to be turned down by.

Crystal described this shape herself, unprompted: *"a drive quiz that doesn't have to be like we don't
have to pretend it's gonna overtake the CogAT, or that it's different than MAP. It can be something a
little more fun that they can do on their own... while they're waiting for the CogAT. It'll have some
prep things on the CogAT."* She separately asked for a portal page covering *"what is a CogAT, what
are you being tested on, here are some sample questions."* Both are this system.

So the sanctioned uses are prep and familiarisation, a screener that suggests applying, and engagement
that produces applicants. The one thing that would change the analysis is using an output to rule
somebody **out**, since a negative result acted upon is the only way a suggestion becomes a gate. Two
small habits keep that from happening by accident, and the code already has both: the screener reports
bands rather than a composite figure, and it says in the interface that nobody can be turned down
because of it.

**One claim to keep straight regardless.** CogAT correspondence is a claim about item *format*, not
about equivalence. "Our Figure Matrices items are Figure Matrices items" is defensible today. "Our
result stands in for a CogAT score" is not, and will not be until some child has taken both.

## 1. What has to be true

Seven requirements, in the order they constrain the design.

1. **An item must not name a sensory fact.** No colour, no coordinate, no pixel, no shape name, no
   animation timing, no option letter. An item names a reasoning problem and the shape of its answer.
2. **The same item must survive any carrier.** Figures on paper, animals in a game, tones over a
   speaker, blocks in Minecraft. If a rendering choice changes what the item *is*, the boundary is in
   the wrong place.
3. **A surface must be able to refuse an item it cannot present.** A voice game cannot show a folded
   sheet of paper. That has to be a checkable fact rather than a bug found by a child.
4. **CogAT correspondence must be declared per type and enforceable per instrument.** Not asserted in
   a document. A field on the type, validated at publish, filterable at selection.
5. **Verification must not depend on presentation.** Grading against option letters or screen
   positions means a renderer that shuffles or relabels silently changes the score.
6. **We reuse the engine, the scoring, the stop rules and the harnesses.** They are the parts with
   real measurement work in them and they are already agnostic.
7. **Editing must stay safe for live instruments.** The authoring-mutable, serving-immutable boundary
   from `screener-library-design.md` carries over unchanged. It is orthogonal to this work.
8. **An item must declare how it is answered.** Not how it looks, but the shape of the interaction:
   choose one of several, place a value on a scale, put things in order. A UI cannot theme what it
   cannot identify, and this is the field it reads to know what to build.

## 2. Where presentation actually lives today

Worth being precise, because the instinct is to assume the coupling is everywhere and it is not.

| Layer | Presentation coupling | Evidence |
| --- | --- | --- |
| Engine (`packages/exam-engine`) | **Almost none.** Reads `options`/`optionCount`, `responseFormat`, and probes six field names to decide if a type is paced | `item-format.ts`, `burst.ts` |
| Item content | **Total.** `content` is `Record<string, unknown>`; 502 distinct field names across 53 banks, 65 of them plainly presentational (`color`, `x`, `y`, `paceMs`, `exposureMs`, `rot`, `palette`, `glyph`) | `assessment-exam-adaptive.ts`, banks |
| Renderers | **They are the presentation.** 52 self-contained HTML files, each parsing raw `content` with its own CSS and interaction logic | `public/exam-demos/*.html` |
| Verification | **Split.** Some verifiers grade abstract values (`placedRatio`, cell grids); most grade `selectedKey` or `selectedIndex` | `lib/exam/verifiers/*.ts` |
| `screener/` contracts | **Partial.** A typed four-kind `ItemContent` union, answer held as `correctOptionId` rather than embedded. Better, but `shape.path` is still coordinates | `screener/packages/contracts/src/index.ts` |

So the work is concentrated in the item model, the response contract and the verifiers. The engine
needs one small change, and it is a simplification rather than a rewrite.

## 3. The move: attributes are opaque, renderers own sensory form

This is the whole design, and it is one idea.

`{ shape: 'star', color: 'teal', rot: 0 }` is a rendering. It has already decided what the child
sees. Whereas `{ form: 1, chroma: 2, turn: 0 }` is a problem, **but only if the renderer is free to
decide what form 1 looks like.** The item's job is to say that two elements differ by one step on
some dimension. It is not the item's job to say which dimension is a colour.

**A reasoning item is about relations. The sensory carrier is arbitrary.** That is why a figure
matrix works equally well with shapes, spaceships, animals or chord voicings, and it is the reason
the same construct can be moved into a game without becoming a different measurement. Once an item
stops naming sensory facts and starts naming differences, "UI agnostic" stops being an aspiration and
becomes a property of the type system.

### Variables are anonymous, and the app decides what they mean

An item declares **variables** with no names and no meanings: `x`, `y`, `z`, taking values `x1`, `x2`,
`x3` and so on. How many variables and how many values each has is a function of difficulty. What any
of them actually *is* is the app's decision.

Here is the matrix type before and after, which is the clearest case.

**Before**, where the item has already designed the screen:

```json
{ "matrix": { "cells": [[{ "shape": "star", "color": "teal", "count": 1, "rot": 0 }]] },
  "options": [{ "key": "A", "tile": { "shape": "star", "color": "teal", "count": 2, "rot": 0 } }] }
```

**After**, where the item states only the reasoning:

```json
{ "frame":     { "kind": "matrix", "rows": 2, "cols": 2, "blank": [1, 1] },
  "variables": { "x": { "values": 3, "order": "ordered" },
                 "y": { "values": 3, "order": "nominal" } },
  "given":     [ { "cell": [0, 0], "x": 1, "y": 1 },
                 { "cell": [0, 1], "x": 2, "y": 1 },
                 { "cell": [1, 0], "x": 1, "y": 2 } ],
  "relation":  [ { "variable": "x", "across": "column", "rule": "increment" },
                 { "variable": "y", "across": "row",    "rule": "constant"  } ],
  "choices":   [ { "id": "c1", "x": 2, "y": 2 }, { "id": "c2", "x": 1, "y": 2 },
                 { "id": "c3", "x": 3, "y": 2 }, { "id": "c4", "x": 2, "y": 1 } ],
  "method":    { "kind": "chooseOne" } }
```

Nothing there is a picture. A fantasy game maps `x` to how many gems a chest holds and `y` to which
faction owns it. A music app maps `x` to how loud a phrase is and `y` to the instrument. A creature
collector maps `x` to size and `y` to species. The item does not know and does not care, and the same
item is a legitimate Figure Matrices item in all three.

### The one thing that cannot be anonymous: whether a variable is ordered

**A variable has to declare its ordering, and this is the only piece of metadata that survives.** Not
its meaning, just whether its values have an order. Three possibilities: `nominal` (values are merely
different), `ordered` (values run low to high), `cyclic` (values wrap, like orientation).

The reason is a failure that is easy to miss. In the item above, the rule on `x` is `increment`. If an
app maps `x` to three unordered colours, red then blue then green, then "the next one along" is not a
thing the child can see, and the item becomes unanswerable while still looking fine. Whereas if the app
maps `x` to one gem, two gems, three gems, the increment is visible and the item works.

So `order` is not a description of the variable, it is a **constraint on the mapping**, and an app that
maps an `ordered` variable onto an unordered channel has produced a broken item rather than a themed
one. That is checkable: a legend declares which of its channels are ordered, cyclic or nominal, and
validation refuses a mapping that loses an ordering the relation depends on.

Everything else stays the app's business. A legend is just a mapping from each variable to a channel
the app can render.

### Difficulty falls out of the variable structure

Which is a side benefit worth stating, because it makes difficulty authorable rather than guessed.

| Lever | Easier | Harder |
| --- | --- | --- |
| Variables in play | 1 | 3 or more |
| Values per variable | 2 | 5 or more |
| Rules involved | `constant` only | `increment` plus `cycle` plus `alternate` together |
| Distractors | Differ on every variable | Differ on one variable by one step |

That last row is the one that actually separates strong reasoners, since a distractor one step away on
a single variable cannot be eliminated by noticing that it looks wrong.

### The item model: what it asks, what the choices are, how it is answered

Three things, and they are the three a UI needs in order to build itself.

```ts
/** A question. Contains no sensory facts and no answer key. */
interface Item {
  /** WHAT IT ASKS. The relation to work out, plus the material to work it out from. */
  readonly ask: Ask;
  /** WHAT THE CHOICES ARE. Described semantically; a UI decides what they look like. */
  readonly choices: readonly Choice[];
  /** HOW IT IS ANSWERED. The interaction shape. This is what a UI switches on. */
  readonly method: ResponseMethod;
  /** What a surface must be able to express before it may serve this item. */
  readonly demands: CapabilityDemand;
}

interface Ask {
  /** The instruction, in plain language, authored once and re-voiced per theme. */
  readonly prompt: string;
  /** The frame the relation lives in: matrix, series, pair-of-pairs, fold sequence, set. */
  readonly frame: Frame;
  /** The material, as abstract attribute-valued elements. */
  readonly given: readonly Element[];
  /** What varies across the frame and how, which is the thing being reasoned about. */
  readonly relation: RelationSpec;
}

interface Choice {
  readonly id: ChoiceId;
  /** What this choice IS, not what it looks like. Either an element or a plain value. */
  readonly value: Element | { readonly literal: string | number };
}

interface Element {
  readonly id: ElementId;
  /** Dimension name to ordinal value. Values are opaque; only differences carry meaning. */
  readonly attributes: Readonly<Record<DimensionName, number>>;
}

/** What a surface must be able to do before this item may be served on it. */
interface CapabilityDemand {
  readonly dimensions: readonly DimensionName[];
  readonly identityCardinality: number;      // distinguishable forms needed
  readonly simultaneousElements: number;     // how many co-present at once
  readonly requiresTiming: boolean;          // paced or exposure-limited
  readonly requiresSpatialLayout: boolean;   // a 2D frame with addressable slots
  readonly readingLoad: ReadingLoad;         // words, sentences, longest word
}
```

`requiresTiming` is worth noticing, because it replaces something that exists today. The engine
currently decides whether a type can be served in bursts by probing six field names inside `content`
(`timeBudgetSec`, `paceMs`, `responseWindowMs`, `streamLength`, `responseUntimed`, `instructionSet`).
That is a sniff test standing in for a declaration. With `demands.requiresTiming` it becomes the
declaration, and `burst.ts` gets shorter rather than longer.

### The six response methods

A closed set of six covers every type in the current library. Each one is a *logical* interaction, and
each maps to many themed presentations, which is the whole point of naming them.

```ts
type ResponseMethod =
  /** Pick exactly one of the choices. */
  | { kind: 'chooseOne' }
  /** Pick a subset, optionally of a stated size. */
  | { kind: 'chooseMany'; exactly?: number }
  /** Arrange the choices into a sequence. */
  | { kind: 'order' }
  /** Reproduce a sequence that was shown or played. */
  | { kind: 'replaySequence' }
  /** Put a value somewhere on a bounded scale. */
  | { kind: 'placeOnScale'; min: number; max: number }
  /** Produce a value rather than pick one: a number, a word, an arrangement. */
  | { kind: 'produceValue'; valueKind: 'integer' | 'word' | 'arrangement' };
```

The answer key sits beside it, server-side, and never crosses into a UI:

```ts
type AnswerKey =
  | { kind: 'chooseOne';      correct: ChoiceId }
  | { kind: 'chooseMany';     correct: readonly ChoiceId[] }
  | { kind: 'order';          correct: readonly ChoiceId[] }
  | { kind: 'replaySequence'; correct: readonly ElementId[] }
  | { kind: 'placeOnScale';   target: number; tolerance: number }
  | { kind: 'produceValue';   correct: string | number };
```

**One method, many presentations.** This is the table a UI author actually works from, and it is the
reason the method is logical rather than visual.

| Method | Plain form | In an adventure game | In a music app | In a collecting game |
| --- | --- | --- | --- | --- |
| `chooseOne` | Multiple choice | Which path to walk down | Which track comes next | Which creature hatches |
| `chooseMany` | Checkboxes | Which items to pack | Which songs fit the vibe | Which cards complete the set |
| `order` | Drag to rank | Plan the route in order | Build the setlist | Rank the tier list |
| `replaySequence` | Tap in order | Repeat the door code | Play back the riff | Copy the dance |
| `placeOnScale` | Slider | Aim the throw | Set the tempo | Price the trade |
| `produceValue` | Text or number entry | Spell the password | Name the key | Bid an amount |

A UI may lay the choices out in any order, label them anything, and animate them however it likes,
because it returns choice ids. So option order and option letters stop being load-bearing, which they
currently are for roughly twenty types.

### What each type needs from a UI, and the tool that computes it

Built and runnable: `screener/packages/ui-contract`. Run `npm run ui -- --help` from the repo root or
from `screener/`.

An item declaring no sensory facts is only useful if an app can find out **what it must be able to do**
before committing to a type. So there is a vocabulary of seventeen UI elements, split between how the
child acts and what the app must show, and every type's requirements are **derived from its own bank**
rather than tabulated by hand, because a hand-written table of 53 rows is wrong the first time a bank
is regenerated.

| How the child acts | What the app must show |
| --- | --- |
| `choiceList` pick one of several | `nominalChannel(n)` *n* merely-different variants |
| `multiSelect` pick several | `orderedChannel(n)` *n* variants that read low to high |
| `reorderable` arrange into an order | `cyclicChannel(n)` *n* variants that wrap, like orientation |
| `sequenceTap` reproduce a remembered order | `gridLayout` addressable 2D cells |
| `analogControl` slider, dial, aim | `coPresent(n)` *n* things at once |
| `valueEntry` produce a number or word | `timedReveal` control onset and duration |
| `canvasPlacement` place things into positions | `motion` animate between states |
| | `depthCue` depth or perspective |
| | `richText` sentences at a reading band |
| | `audioOut` sound |

**The headline result, measured rather than estimated.**

| Set | Types | UI elements needed |
| --- | --- | --- |
| The whole library | 53 | **15** |
| The CogAT-aligned set | 10 | **6** |

Six elements carry every CogAT subtest we can currently serve: `choiceList`, `multiSelect`,
`gridLayout`, `nominalChannel(4)`, `orderedChannel(5)`, and `richText` at a 2-3 reading band. **That is
inside what a themed mobile app or a game menu can already do.** The other nine elements exist for the
working-memory, game-based and extended-spatial types, which is a reasonable thing to learn before
committing to build them.

The tool also names elements paid for by a single type, which is the column to read when trimming
scope. In the CogAT set, `multiSelect` exists only for `SPA-PUNCH-01` and `richText` only for
`VER-CLOZE-01`, so a first version that skipped Paper Folding and Sentence Completion would need four
elements rather than six.

**It answers the reverse question too, which is the one that actually gets asked**, since an app
usually exists before anybody asks it to carry a screener. Given a capability profile it reports what
is servable and groups the refusals by what is missing:

| App shape | Types it can serve |
| --- | --- |
| Full client | 53 of 53 |
| Themed visual, no timing or fine spatial work | 16 |
| Voice only | 8 |
| Glance, a few seconds of divided attention | 4 |

And it reports a build order, which element unlocks the most types next. Five elements reach 12 types,
seven reach 25, and the last four elements are worth about two types each. That curve is the argument
for building the CogAT set first and treating the rest as optional.

One honest limitation. Two things cannot be derived from a legacy bank and are declared instead:
**how many channels a type needs and whether they must be ordered**, and **the interaction shape**,
since "tap every square with a hole" and "pick one of four" look identical in the JSON. Both sets of
declarations are migration scaffolding that disappears once items carry the `variables` and `method`
fields above, at which point the tool just reads them.

### Templates a context fills, and the two words that are not interchangeable

The banks must not be contexted. A context gives them form. So the question every marketing or
admissions person will ask is "how much work is it to put this in our app", and there are three very
different answers. Lumping them together is what makes "just re-skin it" sound cheap for the types
where it is not.

| Cost | What a context does | Per what | Changes the instrument? |
| --- | --- | --- | --- |
| `legend-only` | Map the variables to things in your world | Once per theme | No |
| `revoice` | The legend, plus rewriting the instruction | Once per type | No |
| `reauthor` | The legend, plus writing new material | **Per item** | **Yes** |

**The line that matters is between re-voicing and re-authoring.** Re-voicing turns "Which shape
completes the pattern?" into "Which chest finishes the row?". It is one sentence, it happens once per
type, and it cannot change what is measured because the reasoning lives in the structure. Re-authoring
writes new material for every item, because in a Sentence Completion item the sentence *is* the item.
A themed version is therefore a new question at a new difficulty, and a re-authored bank is a
different instrument that needs its own review rather than a coat of paint.

**Measured across the library: 40 of 53 types need no new questions written. Thirteen do.** And for the
CogAT-aligned set the split is better still: **8 of 10 are legend-only**, with only Sentence Completion
and Verbal Classification needing themed material, which is exactly where you would expect it, since
those two are the ones whose construct is language.

`npm run ui -- --context` prints the breakdown with a reason per type, and for the expensive ones it
prints what a person has to write, for instance "sentence with one gap; the correct word; three
near-miss words".

**What a context fills in.** A theme pack, and it is deliberately a JSON file with no code in it.
`screener/packages/ui-contract/themes/gem-collector.example.json` is a working one to copy:

```json
{
  "theme": "gem-collector",
  "legend": {
    "x": { "label": "how many gems the chest holds", "order": "ordered",
           "values": ["1 gem", "2 gems", "3 gems", "4 gems", "5 gems"] },
    "y": { "label": "which faction owns it", "order": "nominal",
           "values": ["Fire", "Water", "Leaf", "Storm"] }
  },
  "voice":    { "FLU-MATRIX-01": { "prompt": "Which chest finishes the row?" } },
  "material": { "VER-CLOZE-01": [ { "sentence": "The dragon guards its hoard because it is very ___.",
                                    "correct": "greedy",
                                    "distractors": ["sleepy", "gentle", "small"] } ] }
}
```

**And it is checked before it ships**, with `npm run ui -- --theme <file>`, which reports how many
types the theme is ready to serve and what is wrong with the rest. The check that earns its keep is the
ordering one: a theme mapping every variable onto unordered colours is rejected for each type whose
rule is a progression, with the reason spelled out, because that mistake produces items which look
completely fine and cannot be solved. A theme missing material for a `reauthor` type is refused too,
and one missing a voice entry for a scenario type gets a warning rather than a refusal.

### What this costs, stated plainly

**Some items become unservable on some surfaces, and that is the design working.** An item demanding
five distinguishable identities and a rotation channel cannot run on a surface offering three
identities and no rotation. The bank is therefore filtered per surface before selection ever sees it,
which means every surface has a smaller effective bank than the total, and a thin surface may not be
able to fill a blueprint at all. That has to be measured per surface rather than assumed.

**Difficulty is not invariant across renderers.** A paper-folding item shown as an animation is
easier than the same item shown as two static frames. So `difficulty` stays what it already is, a
design rung rather than a calibration, and each surface carries its own thresholds. This is the same
position the screener and battery split already took, and it is the reason that split exists.

**Some current types will not survive the translation honestly.** The working-memory span tasks encode
their stimulus schedule in `content.presentation` with onset and offset times per element. A timing
schedule is not a reasoning relation, and pretending otherwise by relabelling it would produce an
item that claims to be carrier-independent while being nothing of the sort. Those types keep an
explicit `requiresTiming` demand and a declared pacing block, and they are excluded from surfaces that
cannot pace.

## 4. Packages

```
packages/
  constructs/    # attribute vocabulary, Frame, Problem, ResponseContract, CogAT taxonomy
  itembank/      # generators, validation, snapshots, per-surface filtering
  engines/       # selection, posterior, coverage, stop rules       (existing, near-unchanged)
  scoring/       # verification against abstract responses, metrics (existing logic, new inputs)
  surfaces/      # capability profiles, legends, per-surface thresholds
adapters/
  dom/  canvas/  voice/  print/  game-sdk/    # renderers; none of them imported by the library
```

The one rule that keeps this honest: **nothing under `packages/` may import anything under
`adapters/`.** The existing repository already has a workspace-boundary checker
(`scripts/check-workspace-boundaries.ts`), so this is enforceable on the same machinery rather than by
convention.

## 5. CogAT alignment

CogAT Form 8 is the current form: three batteries, nine subtests, confirmed against Riverside's own
test descriptions. The mapping below is what we actually have, audited against the banks rather than
inferred from type names.

| CogAT subtest | Our direct analogue | Items | Verdict |
| --- | --- | --- | --- |
| Verbal Analogies | none | **0** | **Missing. Build first.** |
| Sentence Completion | `VER-CLOZE-01` | 100 | Covered, thin |
| Verbal Classification | `VER-SORTBOT-01` | 100 | Covered, thin |
| Number Analogies | `QUANT-MATRIX-01` | 72 | **Thinnest bank in the set** |
| Number Series | `QUANT-SERIES-01` | 120 | Covered |
| Number Puzzles | `QUANT-BALANCE-01` | 120 | Covered; no classic missing-element equation form |
| Figure Matrices | `FLU-MATRIX-01`, `FLU-CARPET-01`, `FLU-STACK-01` | 360 | Well covered |
| Paper Folding | `SPA-PUNCH-01` | 140 | Covered; canonical fold, punch, unfold |
| Figure Classification | `FLU-VENN-01` | 120 | Covered, thin |

**The build order comes free, from CogAT itself.** Riverside sells a screening form, and it is made
of the analogies portion of each battery: Verbal or Picture Analogies, Number Analogies, and Figure
Matrices. That is a published blueprint for the exact instrument we are building, from the vendor
whose test GT already gates on. Our coverage of those three is 0 items, 72 items and 360 items. So
the first three jobs are not a judgement call.

1. **Verbal Analogies.** A:B::C:? completion. `VER-RELPAIR-01` matches a *relationship* between pairs
   rather than completing one, and its own catalogue entry says so, so it does not substitute.
   Picture Analogies is the same item with a non-reading carrier, which under the model above is the
   same `Problem` on a surface with a different legend rather than a second type.
2. **Number Analogies.** 72 items is not enough to avoid repeats across a cohort. Expand.
3. **Figure Matrices.** Already the strongest. Leave it and use it to validate the migration.

Then the remaining six subtests, then everything else.

**Declaring it.** Every type carries `cogatSubtest: CogatSubtest | 'none'`. `'none'` stays legal,
because the 35 unmapped types include the working-memory, executive-function and game-based work that
exists on purpose and has its own argument in the talent-screening brainlift. But an instrument
declares whether it is CogAT-aligned, and a CogAT-aligned instrument may not draw from a `'none'`
type. That is a filter at selection and a validation at publish, so the claim cannot drift from the
content.

**What correspondence does and does not buy.** A type sharing CogAT's item format is a defensible
claim about *format*. It is not evidence of correlation with CogAT scores, and nothing in this
repository can be evidence of that yet, because no child has taken both. The correlation study is
named in the public screener proposal as the thing that turns the format claim into a validity claim,
and it needs paired data we do not have.

## 6. What we keep, adapt and retire

| Asset | Disposition |
| --- | --- |
| Selection, posterior, update, coverage, stop rules, derived metrics, replay | **Keep.** Already presentation-free |
| Burst planning | **Simplify.** Read `demands.requiresTiming` instead of sniffing six content fields |
| Simulation harnesses, sizing script, engine tests | **Keep.** They are how the migration gets checked |
| Surface split (`lib/exam/surfaces.ts`) | **Keep and generalise** into `packages/surfaces` with capability profiles |
| Authoring/serving immutability boundary | **Keep unchanged** |
| Generator architecture from `screener/packages/item-library` | **Keep as the pattern.** Seeded, deterministic, validated at publish |
| Verifier grading logic | **Adapt.** The reasoning inside each verifier is sound; the inputs change from option keys to element ids |
| 52 HTML demos | **Demote.** They stop being the canonical carrier and become one adapter. Keep them working during migration |
| 7,199 bank items | **Regenerate, do not hand-migrate.** They came from generators; the generators are what get ported |
| `content` as an open record | **Retire.** Replaced by `Problem` |

The regeneration point matters. Hand-migrating 7,199 rows of 502-field JSON is the kind of job that
looks tractable and is not. The banks are generator output, so porting a generator regenerates its
whole bank, and correctness is checkable by construction rather than by inspection.

## 7. Phases

Each phase ends in something runnable, because a migration that cannot be checked halfway is a
rewrite wearing a plan.

**Phase 0. Freeze and characterise.** Snapshot the current banks. Extend the sizing and simulation
harnesses to report per-surface bank sufficiency. *Done when* the existing screener and battery both
still pass their tests and we can print, for any candidate surface, how many items survive its
capability profile.

**Phase 1. `packages/constructs`.** The attribute vocabulary, `Frame`, `Problem`,
`ResponseContract`, `AnswerKey`, `CapabilityDemand`, the CogAT taxonomy. No behaviour. *Done when*
one type is expressed in it by hand and a test proves the round trip through a legend.

**Phase 2. Figure Matrices as the vertical slice.** Port `FLU-MATRIX-01`: generator, bank,
verifier, and two adapters that share nothing (DOM and print). Chosen because it is our strongest
CogAT coverage, so a failure is a failure of the model and not of the bank. *Done when* the same
generated item scores identically through both adapters and the engine cannot tell them apart.

**Phase 3. Build Verbal Analogies.** The missing subtest, as the first type authored natively in the
new model. Its reading-load and picture-carrier variants exercise legends properly, since Picture
Analogies is the same problem on a non-reading surface. *Done when* it passes generator validation,
fills a blueprint slot, and runs on both a reading and a picture surface.

**Phase 4. Port the remaining CogAT-direct types and expand the thin banks.** Seven types, with
Number Analogies expanded off 72 items. *Done when* a CogAT-aligned instrument can be assembled that
draws only from `cogatSubtest !== 'none'` types and satisfies its blueprint without repeats.

**Phase 5. Everything else, or a decision not to.** The 35 unmapped types get ported, kept on the
old carrier, or retired. This is a product call and not an engineering one, and it should be made with
the CogAT-aligned instrument already working so the question is what to add rather than what to save.

## 8. Honest limits

**Nothing here is calibrated.** Every item in the repository is `syntheticOnly: true` and
`validated: false`, difficulty is a design rung rather than an IRT parameter, and this plan does not
change that. A UI-agnostic bank of uncalibrated items is a UI-agnostic bank of uncalibrated items.

**The capability model is new and unproven.** Per-surface bank filtering could easily turn out to
leave thin surfaces unable to fill a blueprint, and the first real test of that is Phase 0's
sufficiency report. If a voice surface cannot fill four areas, the honest answer is that a voice
surface measures fewer areas, not that the blueprint should shrink.

**Two surfaces still will not produce comparable numbers**, for the same reason as before: game
familiarity predicts performance on game-delivered tasks without predicting ability, and interface
handling consumes the working memory the reasoning needs. Making items carrier-independent removes a
source of *construct drift*. It does not make the carriers equivalent, and each one still needs its
own thresholds.

**CogAT format correspondence is not CogAT validity.** Stated again because it is the claim most
likely to get overstated in a room. We will be able to say our Figure Matrices items are Figure
Matrices items. We will not be able to say what they predict until somebody has taken both.

---

Companion document: `embedded-screening-contexts.md` catalogues the surfaces this system is meant to
reach, and is the reason the capability profile is part of the model rather than an afterthought.
