# Question-Type Improvement Plan

Derived from the reviewer pass exported 2026-07-29 (`gt-type-review.md`, 55 of 66 types).
Every quoted instruction below is the reviewer's. Anything marked **[proposed]** is not — it is a
design suggestion filling a gap the review left, and needs a yes/no.

## 1. What the review actually says

| | Count |
|---|---|
| Types reviewed | 55 of 66 |
| Marked for deletion | 17 |
| To modify | 38 |
| Wired types never reviewed | 11 |

The bank drops from **63 wired types to 48**:

| Domain | Before | After | Lost |
|---|---|---|---|
| fluid_reasoning | 12 | 11 | −1 |
| quantitative | 12 | 8 | −4 |
| spatial | 23 | 18 | −5 |
| verbal | 16 | 11 | −5 |

## 2. Two structural consequences, before any individual type

These are not style points; they change whether the two-phase design still runs.

**The Stage-2 pool halves, 16 → 8, and spatial loses every pure-S2 type it had.**
`GB-PATHFORGE-01` and `GB-SHAPEFIT-01` were spatial's only S2 types and both are deleted, leaving
spatial with 12 S1 + 4 DUAL + 2 unreviewed and **zero** S2. Stage 2 is the learning-rate regime, so
a domain with no S2 material can only ever contribute standing, never learning. Partially self-
healing: the reviewer moves `SPA-VIEW-01` to S2, which restores exactly one.

**Phase 2 itself is safe.** The novel block runs in fluid reasoning and needs 30 unseen items;
11 fluid types survive carrying 1,320 items, of which 5 are S2/DUAL (`CX-check-01`,
`FLU-CONCEPT-01`, `FLU-DEDUCE-01`, `FLU-GRIDCOPY-01`, `FLU-LADDER-01`). No action needed.

**Watch:** fluid reasoning's surviving S1 coverage rests entirely on the six types nobody has
reviewed yet (`FLU-ANALOGY`, `FLU-CARPET`, `FLU-MATRIX`, `FLU-ODDPAIR`, `FLU-STACK`, `FLU-VENN`).
If a later pass deletes several, Phase 1's fluid standing estimate loses its base.

## 3. Cross-cutting rules

The reviewer stated some of these against a single type, but each is really a rule for the whole
bank. Applying them once, centrally, is cheaper and more consistent than 38 separate fixes.

**R1 — Ready when you are.** *"FOR ANY GAME THAT HAS A TIMER, add a play button so the student is
ensured to be ready by the time the question starts."* Nine surviving types run a timer:
`FLU-ANALOGY-01`, `FLU-CARPET-01`, `FLU-LADDER-01`, `FLU-MATRIX-01`, `FLU-STACK-01`,
`GB-WORDFORGE-01`, `QUANT-WORD-01`, `VER-EVIDENCE-01`, `VER-SENSE-01`. Five of those were never
reviewed — the rule still applies. `WM-corsi-01` asks for the same thing independently.

**R2 — The interaction must not do the reasoning.** The sharpest theme in the review, and a
construct-validity issue rather than a UI one: if the child can *act out* the transformation, the
task stops measuring their ability to *imagine* it. Affects `SPA-FOLDNET-01` (can fold the net),
`SPA-SHADOW-01` (shadow is drawn for them), `SPA-ROLL-01` (faces stay visible while rolling),
`SPA-HIDDENCUBE-01` (ambiguous hidden backs).

**R3 — Direct manipulation over multiple choice.** `SPA-TANGRAM-01`, `VER-SEQUENCE-01`,
`VER-SENSE-01`, `GB-WORDLADDER-01`. Recognising a correct arrangement among options is an easier
task than producing it, and the option set leaks information.

**R4 — Never show the child the difficulty.** *"there shouldn't be an 'easy to hard' bar to show to
the user."* The bar also appears on `VER-RELPAIR-01` and `GB-FLAWFINDER-01`. Beyond UI: telling a
child an item is hard changes the effort they bring, which is part of what Stage 2 measures.

**R5 — Vary the surface so repetition cannot be memorised.** `QUANT-BALANCE-01` (*"after enough
repetitions, you will just memorize their value rather than deduce it"*), `GB-TRACK-01`
(*"for replays, make sure the sequence is randomized"*).

**R6 — Difficulty must come from the construct, not the presentation.** `SPA-XSCAN-01`
(*"you cannot make the difference between certain answers the sizing of the shapes because that is
ambiguous"*), `SPA-MAZE-01`, `SPA-PIPES-01`, `VER-RELPAIR-01`, `QUANT-SERIES-01`.

## 4. Difficulty bands

The five bands from the build plan, on the 1–20 scale. Every curve below names the variable that
actually changes across them — which is the point, because difficulty is currently assigned
mechanically and carries no information about how hard an item is.

| Band | Scale |
|---|---|
| K-1 | 1–4 |
| 2-3 | 4–8 |
| 4-5 | 8–12 |
| 6-8 | 12–16 |
| Above level | 16–20 |

---

## 5. Deletions (17)

| Type | Name | Stage | Domain |
|---|---|---|---|
| `CX-curious-02` | Question Quest | S2 | verbal |
| `CX-diverge-01` | Brainstorm Blaster | S2 | fluid | 
| `CX-figural-01` | Squiggle Studio | S2 | fluid |
| `CX-sjt-01` | What Would You Do? | S2 | verbal |
| `FLU-MATRIXBUILD-01` | Build the Tile | DUAL | fluid |
| `GB-DEBATE-01` | Claim Duel | DUAL | verbal |
| `GB-FILTER-01` | Star Filter | S1 | spatial |
| `GB-PATHFORGE-01` | Path Forge | S2 | spatial |
| `GB-SHAPEFIT-01` | Shape Smith | S2 | spatial |
| `QUANT-BUILD-01` | Biggest Number | S2 | quantitative |
| `QUANT-EQUAL-01` | Make It Equal | DUAL | quantitative |
| `QUANT-MOBILE-01` | Hanging Mobile | S2 | quantitative |
| `QUANT-NUMLINE-01` | Number Line Jump | DUAL | quantitative |
| `VER-BUILDIT-01` | Build-It Buddy | DUAL | verbal |
| `VER-WORDTRAIN-01` | Word Train | S1 | verbal |
| `WM-gate-01` | Gatekeeper | S1 | spatial |
| `WM-gridflash-01` | Star Grid | S1 | spatial |

`CX-diverge-01` and `CX-figural-01` were never wired into the bank, so only 15 of these are live
removals. Deleting a type means removing its bank rows, its demo, and its registry entry — the
sync script regenerates the registry, so the operation is one command plus a bank migration.

---

## 6. Per-type proposals

### 6.1 Fluid reasoning

#### `FLU-DEDUCE-01` — Clue Detective (DUAL)
**Reviewer:** *"it should not have the clue right beneath in text… just the shape and the assumption
is that it fits the rule. given options, eliminate false options based on objects that fit criteria.
each step is graded by what's eliminated vs. not."*

**Change:** Remove the written clue. The child sees only the exemplar shape(s) and eliminates
candidates that cannot fit the implied rule. Scoring moves from one final answer to **per-step
elimination accuracy** — which is a scoring-contract change, not just a UI one, and gives a much
denser signal per item.

| Band | What changes |
|---|---|
| K-1 | 1 rule (one attribute), 3 candidates, 1 elimination step |
| 2-3 | 1 rule, 4–5 candidates, 2 steps |
| 4-5 | 2 conjunctive rules, 5–6 candidates |
| 6-8 | 2–3 rules including a negation ("not red") |
| Above | 3 rules, one only inferable from a prior elimination |

#### `FLU-GRIDCOPY-01` — Copy the Change (DUAL)
**Reviewer (curve given verbatim):** *"for k-1, focus on translations. 2-3, make it multi-color. 4-5,
add rotations. in 6-8, combine these different rules."*

| Band | What changes |
|---|---|
| K-1 | Translation only, single colour |
| 2-3 | Translation, multi-colour |
| 4-5 | Rotation introduced |
| 6-8 | Translation + colour + rotation combined |
| Above | **[proposed]** Two chained transformations, or reflection added |

#### `FLU-LADDER-01` — Ranking Ladder (DUAL)
**Reviewer:** *"make this exclusive to k-3… k-1 can have 2-3 symbols with easy order, 2-3 has 3-5
symbols with reordering necessary/more rules. grades 4-5 you can add red herrings…"*

⚠ **Contradiction to resolve:** "exclusive to K-3" excludes the 4-5 band the same comment then
specifies. The curve below assumes the type runs K-1 → 4-5 and stops (no 6-8 / above-level), which
matches the described content; confirm.

| Band | What changes |
|---|---|
| K-1 | 2–3 symbols, order directly given |
| 2-3 | 3–5 symbols, reordering required, more rules |
| 4-5 | Red herrings: rules already inferable, present only to clutter the clue space |
| 6-8 | Not served |
| Above | Not served |

#### `FLU-CONCEPT-01` — Mystery Gate (S2 → DUAL)
**Reviewer:** *"make this a dual question instead of just s2. grades 4-8 could do this but not the
younger kids."*

**Change:** Stage becomes DUAL; band coverage restricted to 4-5 and up. Note this *adds* a fluid
DUAL type, which slightly offsets the S2 thinning in §2.

| Band | What changes |
|---|---|
| K-1 / 2-3 | Not served |
| 4-5 | Single-attribute gate rule |
| 6-8 | Conjunctive rule (two attributes) |
| Above | Disjunctive or negated rule; more probes needed before the rule is inferable |

#### `CX-check-01` — Check It Twice (S2)
**Reviewer:** *"you cannot uncheck a box, and it's hard to determine what can/cannot be moved."*

**Change:** Make the checkbox state reversible and mark movable items distinctly (affordance, not
colour alone). UI only — but "cannot undo" is scoring-relevant, because an accidental tap currently
becomes a permanent wrong answer.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 2 groups, 4 tiles, 1 misplaced |
| 2-3 | 2 groups, 6 tiles, 2 misplaced |
| 4-5 | 3 groups, 1 misplaced per group |
| 6-8 | 3 groups + a tile that fits two groups |
| Above | 4 groups, a tile fitting none (must be rejected outright) |

#### `CX-achieve-02` — Investigation Station (S2)
**Reviewer:** *"there is no 'Record what I found' button as suggested so the question is unusable."*

**Change:** Broken, and **not currently wired into the bank**, so nothing in the running exam serves
it. Either build the missing control and wire it, or drop it with the other deletions. Needs a call.

### 6.2 Quantitative

#### `QUANT-DOTS-01` — More or Fewer (S1)
**Reviewer:** *"change this to more of a spatial reasoning question… instead of a plethora of
circles, it's a box diagram and you see which one could hold more volume… increase the amount of
time the flashes occur."*

⚠ **This changes the construct, and therefore the domain.** Comparing volumes of box diagrams is
spatial reasoning, not numerosity. Quantitative is already the thinnest domain after deletions
(8 types); moving this makes it 7 while spatial goes to 19. Recommend confirming the intent: keep
it quantitative by comparing *quantity* in containers, or accept the move to spatial.

| Band | What changes |
|---|---|
| K-1 | Two boxes, large volume difference, long exposure |
| 2-3 | Two boxes, smaller difference |
| 4-5 | Three boxes; one dimension traded against another |
| 6-8 | Non-cuboid or partially filled containers |
| Above | Near-equal volumes; requires multiplying all three dimensions |

#### `QUANT-MATRIX-01` — Number Web (DUAL)
**Reviewer:** *"make this grades 2-5."*

| Band | What changes |
|---|---|
| K-1 | Not served |
| 2-3 | Single operation (+ or −), small integers |
| 4-5 | Two operations, or one with a larger range |
| 6-8 / Above | Not served |

#### `QUANT-SERIES-01` — Pattern Steps (DUAL)
**Reviewer:** *"make harder patterns for the higher difficulty. use other operations besides"* —
⚠ **the sentence is truncated in the export.** The curve below assumes "besides addition"; confirm
which operations you want.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | +1 / +2 constant step |
| 2-3 | Constant step, larger; simple subtraction |
| 4-5 | Multiplicative step |
| 6-8 | Alternating or two-step rule |
| Above | Second-order (step size itself changes) |

#### `QUANT-BALANCE-01` — Balance Lab (S2)
**Reviewer:** *"be more varied on what the values of the shapes are because after enough
repetitions, you will just memorize their value rather than deduce it."*

**Change:** Re-randomise shape→value mapping per item (rule R5). Without this the task decays from
deduction to recall as the session goes on — which matters most in Stage 2, where the whole point is
watching someone *learn* rather than recall.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 2 shapes, one balance shown |
| 2-3 | 2 shapes, two balances |
| 4-5 | 3 shapes, chained substitution |
| 6-8 | 3 shapes, one relation given only as an inequality |
| Above | 4 shapes; a redundant relation that must be recognised as redundant |

#### `QUANT-MIX-01` — Fair Share (S2)
**Reviewer:** *"redesign the UI because it makes no sense to constantly switch the sides the buttons
are on, otherwise it looks like you edit both when really you're only editing your bowl."*

**Change:** Fix the button side permanently to the child's own bowl and label the target bowl as
read-only. UI only; curve unchanged **[proposed]**: ratio complexity (1:1 → 2:1 → 3:2 → non-integer
→ two simultaneous ratios).

#### `QUANT-WORD-01` — Story Model (S2)
**Reviewer:** *"you should have this in steps rather than having to be able to go back to see what
numbers are useful and what the answer is simultaneously."*

**Change:** Split into staged screens (read → select the numbers that matter → answer), so
identifying the relevant quantities is scored separately from computing with them. Also a timed
type, so rule R1 applies.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 2 numbers, both relevant, one step |
| 2-3 | 3 numbers, one irrelevant |
| 4-5 | Two steps |
| 6-8 | Two steps + a distractor number |
| Above | Multi-step with an intermediate value never stated |

### 6.3 Spatial

#### `SPA-FOLDNET-01` — Fold-the-Net (S1)
**Reviewer:** *"you shouldn't be able to fold it otherwise it defeats the whole purpose of the
spatial reasoning. get rid of it entirely and just have the net."*

**Change:** Remove the fold interaction and the 3D viewport; present the flat net only. This is the
clearest instance of rule R2 — the current build lets the child *watch* the answer instead of
imagining it.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | Cube, cross net, "which solid?" |
| 2-3 | Cube, non-cross net variant |
| 4-5 | Opposite-face question |
| 6-8 | Prisms/pyramids; adjacent-face question |
| Above | Irregular solid, symbol orientation matters |

#### `SPA-SHADOW-01` — Shadow Play (S1)
**Reviewer:** *"an actual light shining on the object from each direction to better visualize the
concept. however, the actual shadow should NOT be there so the student can imagine for themselves,
just the light to help guide the direction."*

**Change:** Render the light source and its direction; never render the cast shadow. Rule R2.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | Single primitive, light directly above |
| 2-3 | Single primitive, light from a side |
| 4-5 | Two stacked solids |
| 6-8 | Oblique light angle |
| Above | Composite solid where the silhouette differs from every face |

#### `SPA-ROLL-01` — Rolling Cube (S1)
**Reviewer:** *"you should be hiding the faces once the cube starts rolling."* · *"track the number
of times the student replays the sequence and factor that into the metrics."*

**Change:** Hide face labels during motion (R2). Add a replay counter as a scored process metric —
repeated replays indicate the child is offloading the mental rotation onto the animation.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 1 roll |
| 2-3 | 2 rolls, one axis |
| 4-5 | 3 rolls, two axes |
| 6-8 | 4 rolls |
| Above | 4+ rolls, answer requires a face never shown face-up |

#### `SPA-HIDDENCUBE-01` — X-Ray Cubes (S1)
**Reviewer:** *"some of the x-ray cubes are ambiguous in the back. we will have to manually choose
which configurations are okay to use."*

**Change:** A bank-curation task rather than a code change: enumerate configurations, keep only those
whose hidden portion is uniquely determined. Ambiguous items are worse than hard ones — they punish
the child who reasons correctly. Curve = number of hidden cubes and whether the arrangement is
convex **[proposed]**.

#### `SPA-PICKFOLD-01` — Which Fold Made It? (S1)
**Reviewer:** *"the folding animation should be a lot smoother… it keeps the paper flat, has a piece
sticking out when folding, and then folds over itself in a confusing manner. fix the animation. also
remove the black star when folding."*

**Change:** Animation correctness fix; remove the star artefact. Curve unchanged **[proposed]**:
number of folds (1 → 2 → 3) then fold-then-punch combinations.

#### `SPA-PUNCH-01` — Fold & Punch (S1)
**Reviewer:** *"add a grid onto the paper because the placements of the holes can become ambiguous."*

**Change:** Add a reference grid, so a correct mental model maps to an unambiguous answer (R6 —
removes *positional* ambiguity without making the reasoning easier).

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 1 fold, 1 punch |
| 2-3 | 1 fold, 2 punches |
| 4-5 | 2 folds, 1 punch |
| 6-8 | 2 folds, 2 punches |
| Above | 3 folds, punch near a fold line |

#### `SPA-SCENE-01` — What the Robot Sees (S1)
**Reviewer:** *"for higher grade levels, add obstacles such as walls, barriers, and windows so the
student must reason about what is actually visible behind blockers."*

| Band | What changes |
|---|---|
| K-1 | 2 objects, no occlusion |
| 2-3 | 3 objects, no occlusion |
| 4-5 | One opaque wall introduced |
| 6-8 | Multiple barriers |
| Above | Windows — partial visibility must be reasoned about, not just blocked |

#### `SPA-VIEW-01` — What Do They See (S1 → **S2**)
**Reviewer:** *"make this a S2 question with the intent that What the Robot Sees is a S1 question
that the student can learn from to improve their understanding of this level."*

**Change:** A deliberate **learning pair**: `SPA-SCENE-01` teaches perspective-taking in Stage 1, and
`SPA-VIEW-01` measures whether the child picked it up in Stage 2. This is the only place in the bank
where transfer between two types is designed on purpose, and it restores spatial's sole S2 type
(§2). Worth confirming that's the intent, because it means the two must stay paired.

| Band | What changes **[proposed]** |
|---|---|
| 4-5 | Two viewpoints, distinct scenes |
| 6-8 | Three viewpoints |
| Above | Viewpoint not marked; must be inferred from the described view |

#### `SPA-XSCAN-01` — Scan Stacker (S1)
**Reviewer:** *"for more difficulty, change the shapes to be more abstract, such as blob shapes
rather than primitives."* · *"you cannot make the difference between certain answers the sizing of
the shapes because that is ambiguous."*

**Change:** Options must differ in cross-sectional *shape*, never in size alone (R6); introduce
irregular blob solids at the top bands.

| Band | What changes |
|---|---|
| K-1 | Primitive, slice perpendicular to an axis |
| 2-3 | Primitive, off-axis slice |
| 4-5 | Compound of two primitives |
| 6-8 | Irregular blob |
| Above | Blob, oblique slice |

#### `SPA-MAZE-01` — Plan-the-Path (DUAL)
**Reviewer:** *"for the higher difficulties, there should be more closely competitive alternative
paths to the shortest path, not one obvious path that the user can take."*

| Band | What changes |
|---|---|
| K-1 | One viable path |
| 2-3 | Two paths, clearly different lengths |
| 4-5 | Two paths differing by 2 steps |
| 6-8 | Three paths differing by 1 step |
| Above | Several equal-looking paths; only one is shortest |

#### `SPA-PIPES-01` — Path Connect (DUAL)
**Reviewer:** *"to increase difficulty, have multiple endpoints to connect to, making T-branches
useful."*

| Band | What changes |
|---|---|
| K-1 | 1 source, 1 endpoint |
| 2-3 | 1 source, 1 endpoint, longer route |
| 4-5 | 2 endpoints |
| 6-8 | 3 endpoints, T-branches required |
| Above | 3+ endpoints with a limited pipe inventory |

#### `SPA-TANGRAM-01` — Shape-Fill Form Board (DUAL)
**Reviewer:** *"change this to a drag and drop UI. also while the object is still in the answer
bank, make it to where you can tap on it and that's how you rotate it."*

**Change:** Drag-and-drop placement; tap-to-rotate while in the bank (R3). Curve **[proposed]**:
piece count (2 → 3 → 4 → 5) and whether rotation is required, then reflection at above-level.

#### `GB-EXPLORE-01` — Explorer's Map (DUAL)
**Reviewer:** *"the exploration phase should end when all of the landmarks are found. This should be
obvious to the user and the next phase should only start when the user interacts with the next
button. you can keep the big dial there, but have another one connected to the player on the grid
that updates as they move but the big one is the interactable answer."*

**Change:** Explicit phase completion and a user-initiated transition (same principle as R1), plus a
second slaved dial showing current heading while the large dial stays the answer control.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 2 landmarks, small grid |
| 2-3 | 3 landmarks |
| 4-5 | 4 landmarks, larger grid |
| 6-8 | Landmarks requiring backtracking |
| Above | Heading asked relative to a landmark, not to the grid |

#### `GB-TRACK-01` — Firefly Jars (S1)
**Reviewer:** *"for replays, make sure the sequence is randomized."* (R5)
Curve **[proposed]**: number of jars tracked (2 → 3 → 4 → 5) and motion speed.

#### `WM-bind-01` — Home Again (S1)
**Reviewer:** *"The difficulty curve of this question is too steep. It should prioritize speed
increase before increasing the number of objects to memorize… but if there are more objects, it
should give more time (so we have a pattern where you have 2 objects, speed increases, then 3 and
speed resets, etc.)"*

**Change:** This is the one type where the reviewer specifies the *shape* of the curve rather than
its content: a sawtooth. Set size increases only after speed has been pushed at the current size,
and each set-size increase resets exposure time.

| Band | Set size | Exposure |
|---|---|---|
| K-1 | 2 | long → short |
| 2-3 | 3 | reset long → short |
| 4-5 | 4 | reset long → short |
| 6-8 | 5 | reset long → short |
| Above | 6 | reset long → shortest |

#### `WM-corsi-01` — Firefly Trail (S1)
**Reviewer:** *"the order instruction should be much more obvious and clear. it also shouldn't start
automatically, the user should be able to press play whenever they are ready."* (R1)
Curve unchanged **[proposed]**: span length 2 → 3 → 4 → 5 → 6, forward then reverse at above-level.

### 6.4 Verbal

#### `VER-CLOZE-01` — Fill the Gap (S1)
**Reviewer:** *"there shouldn't be an 'easy to hard' bar to show to the user."* (R4)
Curve **[proposed]**: sentence length and whether the answer is fixed by local collocation (easy) or
only by whole-sentence meaning (hard).

#### `VER-POLYSEME-01` — Two Meanings (S1)
**Reviewer:** *"changing the description to 'tap the sentence that shows what the word means here'."*
Copy change only. Curve **[proposed]**: how far apart the two senses are — distant senses (bat the
animal / bat the object) easiest, near senses (run a race / run a shop) hardest.

#### `VER-RELPAIR-01` — Relation Match (S1)
**Reviewer:** *"there should be more difficulty in the actual association between the words for the
harder difficulties."* (R6 — difficulty from the relation, not from rarer vocabulary)

| Band | What changes |
|---|---|
| K-1 | Category membership (dog : animal) |
| 2-3 | Part–whole |
| 4-5 | Function or purpose |
| 6-8 | Degree or causal relation |
| Above | Second-order: the relation itself is analogous, not the words |

#### `VER-SENSE-01` — Sentence Sense (DUAL)
**Reviewer:** *"there are also no articles (a, the, etc.) so add a sidebar with articles that users
can add as they please. because of that, it will not be slots but rather inserting them in order."*
· *"it should accept all grammatically correct answers or at least not have any ambiguous answers."*

**Change:** Replace fixed slots with ordered insertion plus an article sidebar (R3), and — the
substantive part — the **answer key must accept every grammatical ordering**. Today a child who
produces a correct-but-unanticipated sentence is marked wrong, which is a scoring defect, not a UI
one. Also timed, so R1 applies.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 3 words, one valid order |
| 2-3 | 4–5 words |
| 4-5 | Clause with a modifier |
| 6-8 | Two clauses |
| Above | Subordinate clause; multiple valid orders that must all be accepted |

#### `VER-SEQUENCE-01` — Story Order (DUAL)
**Reviewer:** *"it should be drag and drop rearranging rather than multiple choice answers."* (R3)

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 3 events, explicit time words |
| 2-3 | 4 events, explicit markers |
| 4-5 | 4–5 events, markers removed |
| 6-8 | 5 events, causal rather than temporal order |
| Above | Events out of narrative order (flashback) |

#### `VER-EVIDENCE-01` — Proof Hunt (DUAL)
**Reviewer:** *"make it clearer to choose proof and claims. it should pop up to tell you to choose
evidence back in the passage."*

**Change:** Explicit two-step flow — pick the claim, then be prompted back into the passage to select
the supporting span. Also timed, so R1 applies.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | Claim restates one sentence verbatim |
| 2-3 | Claim paraphrases one sentence |
| 4-5 | Evidence spans two sentences |
| 6-8 | A plausible but unsupported claim is offered |
| Above | Evidence supports the claim only in combination |

#### `WM-bubble-01` — Bubble Pop Memory (S1)
**Reviewer:** *"it shouldn't be automatic. take reference from the interaction format from the Human
Benchmark test to where it's not automatic and instead you have a 'seen' and 'new' option that
accumulates throughout the entire thing."*

**Change:** Replace the automatic timed pop with explicit **seen / new** responses per stimulus. This
turns a go/no-go task into a two-alternative judgement, which also yields a cleaner accuracy signal
(hits and false alarms separately, rather than one merged miss rate).

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 1-back |
| 2-3 | 2-back |
| 4-5 | 2-back, longer run |
| 6-8 | 3-back |
| Above | 3-back with lures at n±1 |

#### `GB-FLAWFINDER-01` — Fib Finder (DUAL)
**Reviewer:** *"make this more of a comprehension style question with a bunch of facts and then the
answer choices are a bunch of claims and which one is the best claim based on those facts."*

**Change:** Reframe from "spot the false statement" to "which claim do these facts best support" —
inference rather than fact-checking. Also carries the Easy→Hard bar (R4).

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 2 facts, claim restates one |
| 2-3 | 3 facts, claim combines two |
| 4-5 | 4 facts, one irrelevant |
| 6-8 | A claim that overreaches the facts is offered |
| Above | Two defensible claims; one is better supported |

#### `GB-WORDFORGE-01` — Word Forge (S2)
**Reviewer:** *"take off points for words that don't exist and MAKE IT CLEAR that it'll happen if the
student is randomly inputting words."* · the R1 play-button rule.

**Change:** Penalise non-words and state the penalty **before** play. Unannounced penalties measure
whether a child guessed the rules, not their vocabulary.

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 3 letters, common words |
| 2-3 | 4 letters |
| 4-5 | 5 letters |
| 6-8 | 6 letters, constrained letter set |
| Above | Constrained set with a required letter |

#### `GB-WORDLADDER-01` — Letter Climb (S2)
**Reviewer:** *"you should be able to write out the word rather than having to press each letter and
change it individually."* (R3) · *"more complex/uncommon words should be accounted for as a sign of
higher giftedness."*

**Change:** Free text entry, and a **word-rarity term** in scoring. Rarity is a real signal but needs
a frequency list to be defensible — otherwise "uncommon" is just "unusual to whoever wrote the key".

| Band | What changes **[proposed]** |
|---|---|
| K-1 | 3-letter ladder, 2 steps |
| 2-3 | 3-letter, 3 steps |
| 4-5 | 4-letter, 3 steps |
| 6-8 | 4-letter, 4 steps |
| Above | 5-letter, shortest path not obvious |

---

## 7. Decisions needed

1. **`FLU-LADDER-01`** — "exclusive to K-3" contradicts the 4-5 red-herring band described in the
   same comment. Which is it?
2. **`QUANT-SERIES-01`** — the instruction ends mid-sentence ("use other operations besides"). Which
   operations?
3. **`QUANT-DOTS-01`** — the reframe turns a numerosity task into a volume-comparison task, moving it
   from quantitative (already the thinnest domain, 8 types) to spatial. Intended?
4. **`SPA-VIEW-01` / `SPA-SCENE-01`** — confirm these become a designed learning pair; it is the only
   cross-type transfer in the bank and constrains both.
5. **`CX-achieve-02`** — broken and not wired. Build the missing control, or delete it?
6. **The 11 unreviewed wired types** — `FLU-ANALOGY`, `FLU-CARPET`, `FLU-MATRIX`, `FLU-ODDPAIR`,
   `FLU-STACK`, `FLU-VENN`, `GB-ROBOPATH`, `QUANT-FUNC`, `QUANT-GRAPH`, `SPA-XPLANE`, `VER-SORTBOT`.
   Six of them are fluid reasoning's entire surviving S1 base (§2), so their review matters more than
   the others.
7. **Stage-2 thinning** — 16 → 8, spatial to zero pure-S2 before `SPA-VIEW-01` moves. Accept, or
   promote some DUAL types to cover it?

## 8. Suggested order of work

1. Cross-cutting rules R1 and R4 — mechanical, affect many types, no design decisions.
2. Deletions — shrinks the surface everything else has to be applied to.
3. Scoring-contract changes, which are the ones that can silently produce wrong scores:
   `VER-SENSE-01` (accept all grammatical answers), `FLU-DEDUCE-01` (per-step scoring),
   `GB-WORDFORGE-01` (declared penalty), `SPA-ROLL-01` (replay metric).
4. Construct-validity fixes (R2): `SPA-FOLDNET-01`, `SPA-SHADOW-01`, `SPA-ROLL-01`,
   `SPA-HIDDENCUBE-01`.
5. Interaction rewrites (R3), which are the largest per-type effort.
6. Difficulty-curve implementation, once the decisions in §7 are settled — this is also what gives
   the 1–20 scale real meaning, which it currently lacks.
