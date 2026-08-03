# Stage 2 redesign — per-session systems, reviewable trials, and three new types

**Status:** Proposed. Nothing here is built.
**Requirements served:** R5, R6, R7, R8, R10, H1, H6, H10.
**Evidence relied on:** E-095, E-200, E-205, E-206, E-207; the re-keying measurement in D-206 / PR #51; the anti-leak comparison in `STAGE2_ANTILEAK_COMPARISON.md`.
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

Failure B exists because the **options are baked at build time while the mapping is drawn at serve time**. Nothing reconciles them, so the correct answer is on screen only by luck.

The fix is to stop shipping finished items. A bank record becomes a **template**: the input, the symbol chain, the distractor *rationales*, and the structural facts that price difficulty. The server draws the session mapping, applies the chain, and **materialises the options from the rationales under that mapping**. The correct answer is then on screen by construction, at every depth, for every mapping.

This also closes something re-keying alone did not: the key slot stops being a function of the emission index, which kills the difficulty-ordinal attack that scores 70.5% on the current `FLU-OPCHAIN-01`.

**Cost.** Item difficulty can no longer be a number in a file. It is computed at serve time from the template plus the session mapping, and it must be *recorded* with the served item so scoring and replay agree. Determinism therefore moves from "the bank is fixed" to "the session seed is fixed", which is a change §9 of `STAGE2_QUESTION_DESIGN.md` and the auditability requirements in Category 9 of the test-structure BrainLift both have opinions about. R7 is the binding requirement: a rejected family's result must be reconstructible.

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

**Alternates, if the primary is rejected:**
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

1. The serve-time materialisation path, proved on `FLU-OPCHAIN-01` — the one type that stays. It is the riskiest piece and it is testable against a bank whose behaviour is already measured.
2. The four cross-cutting mechanics, on that same type.
3. Alien Numbers, as the first redesign — the slider is the smallest surface and it resolves two open items.
4. The verbal type, as the one currently unusable.
5. The 3D spatial type, gated on its legibility check.
