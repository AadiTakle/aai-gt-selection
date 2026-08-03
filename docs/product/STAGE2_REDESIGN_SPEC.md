# Stage 2 redesign — per-session systems, reviewable trials, and three new types

**Status:** Proposed, except **§2.1 and §3, which are built on `FLU-OPCHAIN-01` behind `EXAM_SERVE_TIME_MATERIALISATION` (off by default) — see D-210 and E-210.** Everything else here is unbuilt.
**Requirements served:** R5, R6, R7, R8, R10, H1, H6, H10.
**Evidence relied on:** E-095, E-200, E-205, E-206, E-207, E-210; the re-keying measurement in D-206 / PR #51; the anti-leak comparison in `STAGE2_ANTILEAK_COMPARISON.md`.
**Supersedes, if adopted:** `STAGE2_QUESTION_DESIGN.md` §3.2, §3.3, §3.4 — not §3.1, and not §1.2 or §4.1.1, whose constraints this spec inherits unchanged.

---

## 1. What is locked, and why

Four rules apply to every Stage 2 activity. Three are the owner's; the fourth is the constraint that makes the first one buildable.

1. **The symbol→meaning mapping is drawn per session, server-side.** A child who has seen the test before, or been told about it, gains nothing transferable.
2. **The child advances by choosing to.** A Next control, so a trial can be sat with rather than flicked past.
3. **The trial is reviewable in colour** — what the machine actually did, and what the child picked, distinguished. Never text about the child.
4. **Difficulty is priced on properties a relabelling cannot move.** This is not a preference. It is what §2 shows re-keying costs if it is ignored.

### 1.1 What §1's rules cost each other

Rules 1 and 3 are not independent. PR #51 measured the leak channel both ways:

| Channel | Mapping pinned exactly | Median trial | Client accuracy over 30 trials |
| --- | --- | --- | --- |
| On-screen only | 0.0% | — | 48.0% |
| With a post-commit reveal | **100.0%** | **trial 6** | **91.3%** |

Richer feedback makes a block more learnable *and* more attackable — within-session intersection and within-session learning are the same operation performed by different agents, and nothing that keeps the construct learnable can separate them. Per-session keying is what converts a permanent, transferable, bank-wide compromise into a per-session, non-transferable one.

So rule 1 is what pays for rule 3. Adopting rule 3 without rule 1 would publish the mapping to anyone who runs the block once.

---

## 2. Why the current banks cannot take rule 1, and what that implies

Measured in PR #51 over all four shipped banks. Two separate failures, and they need separate fixes.

**Failure A — difficulty drifts.** Every current type prices difficulty on *a count of one operator sub-class* (`geom`, `turns`, `binds`, `scope`). Class membership belongs to the operator, not the symbol, so a free relabelling moves the count on **48.3% / 50.3% / 21.4% / 42.9%** of item×mapping pairs. On `FLU-OPCHAIN-01` that is a mean drift of 0.83 points, p95 2.94, against a bank granularity of 0.5 and a selection tolerance of 0.25.

**Failure B — the answer stops being on screen.** A depth-`d` chain has `P(6,d)` readings and five fixed places to land. Admissibility collapses with depth, and depth is what the ladder is made of:

| Chain depth | Difficulty span | Mappings landing on screen |
| --- | --- | --- |
| 1 | 1.02 – 5.29 | 78.2% |
| 4 | 12.06 – 19.98 | **13.8%** |

A session serves a mean of 28.0% of the bank, tops out at 17.20 rather than 19.98, and **87.8% of rungs fall short of the five items the bank guarantees**, against 0.0% as shipped.

The class-preserving mapping family that would hold difficulty exactly fixed was measured and rejected: 36 systems rather than 720, mean 2.11 reachable options, and a brute-forcing client scores **57.5%** against a 20% floor.

### 2.1 The implication: banks must store templates, not finished items

**Status: BUILT on `FLU-OPCHAIN-01`, behind `EXAM_SERVE_TIME_MATERIALISATION`, off by default. D-210, E-210.**

Failure B exists because the **options are baked at build time while the mapping is drawn at serve time**. Nothing reconciles them, so the correct answer is on screen only by luck.

The fix is to stop shipping finished items. A bank record becomes a **template**: the input, the symbol chain, the distractor *rationales*, and the structural facts that price difficulty. The server draws the session mapping, applies the chain, and **materialises the options from the rationales under that mapping**. The correct answer is then on screen by construction, at every depth, for every mapping.

This also closes something re-keying alone did not: the key slot stops being a function of the emission index, which kills the difficulty-ordinal attack that scores 70.5% on the current `FLU-OPCHAIN-01`.

**Cost.** Item difficulty can no longer be a number in a file. It is computed at serve time from the template plus the session mapping, and it must be *recorded* with the served item so scoring and replay agree. Determinism therefore moves from "the bank is fixed" to "the session seed is fixed", which is a change §9 of `STAGE2_QUESTION_DESIGN.md` and the auditability requirements in Category 9 of the test-structure BrainLift both have opinions about. R7 is the binding requirement: a rejected family's result must be reconstructible.

#### 2.1.1 The template contract, as built

Three sibling type redesigns are being built against this, so it is stated as a contract rather than as a description. It is defined once for all four types in `research/exam-question-types/stage2-item-template.mjs`; `FLU-OPCHAIN-01` is the only implementation today.

A template carries four things:

| Carries | Form | Why this form |
| --- | --- | --- |
| **the input state** | type-specific and opaque to the contract | the four types have no `input` in common |
| **the chain** | references to symbol **slots** — `[0, 3, 1]` — never to meanings | what a slot means, and which badge the child sees for it, are both session facts |
| **distractor rationales** | transformations of the chain, in a fixed **priority order**: `reorder`, `drop`, `repeat`, `substitute`, `prefix`, `reverse` | expressible before any operator is known, so the same rationale yields a valid wrong option under every mapping instead of under 18.4% of them |
| **structural facts** | slot count, chain length, the slot set, glyph, band, reachable-figure count | the levers §3 prices, all relabelling-invariant |

And it carries three things by their **absence**: no `answer`, no `difficulty`, and **no name of any hidden meaning anywhere in the record**. The third is the rule that makes the whole thing work, and it is executable — `assertNoMeaningNames` runs over every template the emitter writes, so a type that mentions `turn` fails at build time rather than three measurements later.

Two properties of the priority order are load-bearing. It is **class-interleaved**, so the first four rationales span four lure classes rather than being three reorders and a drop, which keeps §4.6's strategy trace informative. And it is **fixed in the file**, so the server walks the same list under every mapping and the slate is reproducible from the seed. The list is deliberately long: collisions are the normal case, not the exception — five of the six operators are involutions, so `repeat@0` and `drop@0` produce the same figure whenever slot 0 means one of them.

#### 2.1.3 The contract has already diverged once, and it needs an owner decision

`VER-ROLES-01` (D-208) writes to the same `templates/` directory from a different reading of this section, and its records do not satisfy the contract above. Two fields:

| Field | §2.1 as written | `VER-ROLES-01` | Why it did it |
| --- | --- | --- | --- |
| `difficulty` | forbidden — "item difficulty can no longer be a number in a file" | a stored design rung | the engine's selection index carries a difficulty, and there is no session yet when the index is built |
| `answer.correctKey` | forbidden — which option is correct is a session fact | a build-time reference key | the true key is re-derived from the materialised sentence under the drawn grammar; the stored one is a cross-check |

Neither is a defect in that type on its own terms, and the second is arguably the stronger design — a stored key that the materialisation must *agree with* is a check the `FLU-OPCHAIN-01` path does not have. But two banks in one directory answering to two contracts is how a shared format stops being one, so this needs a decision rather than a convention:

1. **The contract holds and `VER-ROLES-01` moves to it.** It then needs the index problem solved the way `FLU-OPCHAIN-01` solved it — re-price per trial — which is a change to how the runner fetches items, not just to a generator.
2. **The contract admits both fields as optional.** Cheaper, and it gives up the property that makes the format worth having: a reader can no longer tell whether a `difficulty` in a template is authoritative.
3. **The two are different artifacts with different names.** Honest, and it means "template" stops meaning one thing across the four types, which is what §2.1 set out to make it mean.

Nothing in the serve-time materialisation path depends on the answer: it reads `templates/FLU-OPCHAIN-01.jsonl` by name. `assertNoMeaningNames` and `templateProblems` in `stage2-item-template.mjs` encode option 1, and are reported rather than enforced on any type but the one they were written for.

#### 2.1.2 What it fixed, and what it cost

Measured over all 720 bijections; one command, `stage2-serve-time-materialisation-probe.mjs`.

| | shipped bank, re-keyed | materialised |
| --- | --- | --- |
| key on screen, chain depth 1 | 83.3% | **100.0%** |
| depth 2 | 29.9% | **100.0%** |
| depth 3 | 18.0% | **100.0%** |
| depth 4 | **18.4%** | **100.0%** |
| templates excluded, depth 4 | — | 10.8% |
| F7b ordinal slot attack, over its own permutation null | **+38.5 points** | **−0.83** |
| difficulty drift across mappings, structural levers | mean 0.83 / p95 2.94 | **0.000** |
| session replay from the seed | not applicable | exact, 8 of 8 seeds |

The 18.4% and 83.3% figures are this branch's own implementation and read about 5 points higher than the 13.8% / 78.2% on the register; E-210 records that the two are not interchangeable and that the recorded pair is authoritative.

Exclusion is the price of the guarantee, and it is the two guards the shipped generator applies at build time and a template cannot: under some mappings the drawn operators make the chain a no-op on its input, or make its orientation operators cancel in D4. Both make the item easier than its chain length, so both are excluded from that session rather than served mislabelled.

**What did not survive.** The bank's promise of ">=5 items on every 0.5-point rung" has no successor, because an item has no difficulty until a session prices it. What replaced it is measured per trial and is weaker: see §3.1.

---

---

## 3. A difficulty model that survives relabelling

Difficulty must be a function of the template and the child's evidence so far — never of which operator a symbol happens to mean this session.

Four levers, all relabelling-invariant:

| Lever | Definition | Invariant because |
| --- | --- | --- |
| **Chain length** | how many symbols are applied | a count of positions, not of meanings |
| **Vocabulary in play** | how many distinct symbols have appeared so far this block | a count of symbols, not of what they do |
| **Evidence** | how many prior trials constrain the symbols in this item | a property of the trial history |
| **Residual ambiguity** | how many readings remain consistent with everything revealed so far | computed under the session mapping, so it moves *with* it rather than against it |

Residual ambiguity is the one that replaces class-counting, and it is strictly better: it is what actually makes an item hard for *this child at this point in the block*, which is what an adaptive block wants to target. The learnability oracles built in PR #48 already compute exactly this quantity — they were written to report when a primitive becomes deducible. This spec reuses them as the difficulty function rather than as a report.

**Consequence for operator sets.** All operators within a type must be equal in intrinsic cost, or difficulty leaks back to which operator was drawn. Type designs in §5 are constrained accordingly.

### 3.1 As built on `FLU-OPCHAIN-01`, and the two things it costs

**Status: BUILT. D-210, E-210.** The oracle is imported and used as the difficulty function — `stage2-learnability-core.mjs`'s `createOracle` with the existing `flu-opchain` adapter — so the difficulty model and the learnability report cannot disagree about what a reveal rules out. Residual ambiguity is read as *the readings still consistent with every reveal so far **and** still landing on some option of this item*: both halves matter, because a reading predicting a figure that is not on screen tells the child nothing here.

The levers land where the table says. Measured across 8 drawn mappings on 336 templates, the **structural levers moved on 0.0% of templates, max drift 0.000**, against the shipped `geom` model's mean 0.83 / p95 2.94 on this same type. The total moves by mean 0.27 / p95 0.48 — all of it through residual ambiguity, which is what this section asks of it. That the drift is *attributable* rather than merely *bounded* is the property under test: prices are grouped by the residual ambiguity they were computed at, and within a group they must be identical, because the only thing left varying is which operators the mapping drew.

**Two costs. Both are consequences of this section as written, and neither is mentioned above.**

**(a) The model is coarser than the ladder it replaces.** Three of the four levers saturate — chain length is a small integer, vocabulary in play is a *block* fact and so identical across every candidate at a given trial, and residual ambiguity goes to 1 for every item the moment the system is pinned, which on a seeded 30-trial run happened at trial 12. Evidence is the only lever that both varies across candidates late in a block and does not saturate, so its resolution is the pool's resolution. Even read at full resolution, the pool lands within the 0.25 `itemSelectionTolerance` on **46.7% of trials** (mean error 0.38, p95 0.97) and **11 of 39 half-point rungs are unreachable at any trial of any session**. The shipped bank guarantees five items on every rung.

**(b) Two of the four levers are monotone in trial index by construction.** Evidence only accumulates and residual ambiguity only shrinks, so an unchanged item's price *falls* as the block runs: measured on the whole unserved pool, which contains no selection, the mean price goes from **14.17 at trial 1 to 8.90 at trial 30, r = −0.794**. That is the intended reading of this section — an item genuinely is easier once you know the system — and it collides with how the climb is fitted. `estimateLearningCurve` takes difficulty as the item covariate, and a covariate that declines with trial index by construction absorbs part of the climb it conditions on. This is §1.1(d)'s structured-labelling error arriving from the opposite direction: not a difficulty that is wrong, but one that is right and correlated with the thing being estimated.

The implementation records `levers.structural` — the two levers a file *could* have held, with no evidence term — as an evidence-free covariate a fit can use instead. **Whether the fit should use it, and whether this section should be amended to say so, is an owner decision and is not settled here.**

---

## 4. The four cross-cutting mechanics

### 4.1 Per-session systems
Drawn server-side per session, never sent to the browser, and derived into the key at grade time. Items whose template admits fewer than two reachable options under the drawn mapping are excluded from that session. Difficulty is computed per session and recorded on the served item.

### 4.2 Self-paced advance
A Next control replaces auto-advance. The reveal is shown, the child chooses when to continue.

**Watch:** this adds an unbounded self-paced gap to a 120-trial session. Time-to-next must be recorded per trial — both because the session budget needs it and because dwell-on-reveal is itself a process signal worth having. It must not be scored, per SPOV 3 on effort telemetry.

### 4.3 Reviewable, coloured trials
On commit, the trial shows: what the machine actually produced, and which option the child chose, visually distinguished. No text about the child, no running score, no streak.

This is a deliberate departure from the current outcome-free reveal, and it is justified: a learning block that never tells a child what happened gives them nothing to learn *from*, which undercuts the construct it is measuring. Category 7.8 of the test-structure BrainLift found feedback made performance worse in over a third of studies and worst when it points at the child — so this points at the work.

### 4.4 Reversed mode — production, not recognition
When the block's estimate says the child has the system, it switches: **given the start and end states, name the symbols that were used.**

- **Why it is stronger.** Recognition ("which output?") is passable by elimination. Production ("which chain?") is not. The guessing floor falls from 1/5 to about `1/P(v, d)` for a `d`-length chain over `v` symbols in play — at depth 2 over 6 symbols that is 1/30 rather than 1/5.
- **Weighting.** Correct production is worth more than correct recognition, per the owner's instruction.
- **Failure is diagnostic, not punitive.** Repeated failure in reversed mode does not accumulate penalty. It falsifies the mastery estimate that triggered the switch, and the block returns to forward trials. The child has not learned it yet, which is a fact about the estimate, not a fact to charge them for.
- **What this changes in scoring.** Each activity becomes a two-phase adaptive block with a reversible gate. The estimator must therefore model two response formats with different floors in one block — `item-format.ts` already reads option count per item, so the per-type floor work extends to this rather than being bypassed.

**Open:** the trigger. "The engine thinks they have it" needs a defined statistic and threshold. The learnability oracles give the natural candidate — switch when the child's answers have been consistent with the uniquely-determined reading for `k` consecutive trials — but `k` is unset and must be justified rather than picked.

---

## 5. The three type redesigns

`FLU-OPCHAIN-01` is unchanged and becomes the reference for the fluid slot.

### 5.1 Alien Numbers — quantitative, rebuilt

An invented **place-value system in a non-decimal base**, with symbols for digits and left-to-right significance retained. The child induces the base and the digit values.

- **Why left-to-right stays.** It is the one convention that is genuinely intuitive and carries no information we want to measure. Confusing it would test convention-breaking rather than quantitative reasoning.
- **Response is a slider on the number line**, not five options. The child places the value anywhere between bounds. This removes the hint structure that wrong options leak, and it is the freedom-of-expression argument the owner made.
- **Measurement consequence, material.** A continuous response has **no guessing floor** — it drops from 0.2 to effectively 0. That is a large improvement in information per trial, and it means the per-type floor machinery must handle a continuous type rather than assuming `1/n`. Grading is already placement-tolerance with `M-PAE`, so the machinery exists.
- **Resolves two open items.** The "§3.2 says six positions, the generator emits five" discrepancy disappears with the options. Concreteness fading becomes possible: a demonstration schedule can show early glyphs beside depicted quantities without the renderer needing the key, because the *server* emits the schedule.
- **Explaining the format without leaking.** The instructions may state that the marks are digits, that the leftmost is most significant, and that the line runs from nothing to a maximum. They may not state the base, any digit's value, or how many digits the system has — those are the graded inferences.

### 5.2 A genuinely spatial type — 3D solids under hidden transformations

`SPA-XFORM-01` permutes sixteen cells of a flat grid. That is rule induction over abstract tokens with a spatial surface — closer to fluid reasoning than to spatial ability. It should be reconsidered for the fluid slot, and the spatial slot filled properly.

**Proposal.** A small solid built of unit cubes, drawn isometrically. Hidden operations act on the solid in three dimensions: rotation about a named axis, reflection through a plane, removal or addition of a layer, translation of a sub-block. The child sees before and after and induces what each symbol does.

- **Why this is spatial and the grid version is not.** It requires maintaining and transforming a three-dimensional representation — the operation that mental rotation, paper folding and cross-section tasks all measure, and which Category 8.5 of the gifted-assessment BrainLift identifies as the biggest coverage gap in the whole screen: **70% of the top 1% in spatial ability miss the top-1% cut on math or verbal.**
- **Equal-cost operator set,** per §3: all operations are rigid motions or single-layer edits, so no symbol is intrinsically harder than another.
- **Risk to check before building.** Isometric rendering can make some transformations visually ambiguous — two different operations producing indistinguishable projections. This needs the same legibility gate `SPA-HIDDENCUBE-01` required, run before any bank is generated.

### 5.3 A genuinely verbal type — alien sentences with thematic roles

`VER-MORPHO-01` is the same compose-hidden-operators task as the other three, with word-shaped tokens. It is not verbal reasoning, and the owner is right to reject it.

**Primary proposal — who did what to whom.** The child sees a scene and a sentence in an invented language. The language marks thematic roles by particles or word order that differ from English. The child induces the grammar, then answers which scene a sentence describes, or which sentence describes a scene.

- **Why this is verbal reasoning.** Assigning agent and patient from grammatical marking is syntactic and semantic inference. It is not spatial, not numeric, and not reducible to symbol composition — the same three words in a different order mean something different, which is a property no operator chain has.
- **Precedent.** This is the Linguistics-Olympiad genre. It is deliberately prior-knowledge-resistant: the language is invented, so vocabulary and schooling cannot help, which is exactly the property Category 8.4 shows "culture-fair" nonverbal tests fail to deliver.
- **Text-only**, per D-017. The scene can be schematic rather than pictorial.
- **Difficulty levers, all relabelling-invariant:** number of arguments in the sentence, whether role marking is by particle or position, whether a distractor differs only in role assignment, and residual ambiguity per §3.

**The primary is now specified and built through U4, as `VER-ROLES-01` "Who Did What" —
`docs/product/STAGE2_VER_ROLES_01_SPEC.md`.** That document is the buildable spec; this section
remains the proposal it came from. Three things about it are worth reading back into this spec,
because they bear on §2 and §3 rather than only on the verbal slot:

- **§2.1's template shape is executable, and it removes both failures rather than mitigating them.**
  A record is a surface plan plus distractor rationales, and the key reading is *what the parser says
  the sentence means under the session grammar* — not a stated fact the grammar has to agree with.
  Measured over 468 templates × 24 grammars: difficulty, option count and key slot move on **none**,
  the key reading moves on **all**, and every template materialises. Failure A and Failure B are not
  reduced here; they are unconstructible.
- **§3's fourth lever collapses into its third in this type, and that is a property rather than a
  gap.** An option survives a vocabulary-knowing, grammar-free client exactly when it is a role
  permutation of the key, so residual ambiguity *is* `roleOnlyDistractors + 1`. Pricing both would
  double-count one structural fact.
- **The leak that remains is derived rather than measured, which is a stronger statement than a
  ceiling.** Every order strategy sits exactly on `1/n + (n−1−roleOnly)/(n·R)`, so the whole excess
  over the guessing floor is the intrinsic "the key is always on screen" asymmetry and none of it is
  the grammar. It is 8.3 points at one role-only distractor and **zero** at three — largest on the
  easiest items, which is the opposite of `FLU-OPCHAIN-01`'s 34.0% in its hardest slice.

The two alternates below are **not built** and are recorded as they were. The second is partly
absorbed: an earlier draft of `VER-ROLES-01` gave each verb a hidden argument frame, which made the
role set undeterminable from the surface and broke the parse; the shipped design recovers the same
six-reading space from the base-order rule with no extra hidden parameter.

- **Semantic-field induction.** An invented vocabulary clustered by relation — part-of, kind-of, opposite. Given labelled examples, infer the relation and extend it. Tests relational and analogical reasoning.
- **Predicate-argument frames.** Invented verbs take different argument structures; the child induces which frame each verb takes and judges well-formedness.

---

## 6. What this costs, honestly

- **Three new banks, generators, checkers, renderers and verifiers.** The U2–U7 track each of the current types took, times three, plus a legibility gate for the 3D type.
- **A serve-time materialisation path** that does not exist: templates, session mapping, option generation, per-session difficulty, and the recording needed for R7 replay.
- **Gate A must be re-run per type**, and the figures in E-095/E-200/E-205/E-207 describe the *current* pipeline. A continuous-response type with no guessing floor is outside every cell measured so far.
- **Gate B still needs roughly 128 real children** and is untouched by any of this.
- **None of it makes a learning rate reportable.** A 30-trial block does not support a reportable absolute rate, before or after. `learningRateCohortRank` remains the supported question.

## 7. What is still undecided

1. **The reversed-mode trigger** — which statistic, and what threshold, counts as "has the system". Must be justified, not picked.
2. **Whether `SPA-XFORM-01` moves to the fluid slot** or is retired. If it moves, the fluid slot has two types and one must be chosen per session or per child.
3. **The threat model** PR #51 put to the owner and which is still open: per-session keying does not stop a child solving their own block, and nothing that keeps the construct learnable can.
4. **Session budget.** Four activities, self-paced advance, and a reversed phase make the 30-minute Stage 2 estimate obsolete. Needs re-estimating before it is built.
5. **Whether the scrambled control arm** is crossed for Gate B — still fenced by a deliberate guard in `bank-loader.ts`, and an applicant-ethics question, not an implementation one.

## 8. Suggested sequence

1. ~~The serve-time materialisation path, proved on `FLU-OPCHAIN-01`~~ — **done, D-210/E-210.** Two things it left behind: the §3.1(a) granularity loss and the §3.1(b) trial-index confound, both owner decisions. One thing it left unbuilt: the runner still fetches the selection index once per session, and on this path it must re-fetch per trial, because an item's price is a function of the evidence.
2. The four cross-cutting mechanics, on that same type.
3. Alien Numbers, as the first redesign — the slider is the smallest surface and it resolves two open items.
4. The verbal type, as the one currently unusable.
5. The 3D spatial type, gated on its legibility check.
