# `VER-ROLES-01` "Who Did What" — the verbal Stage 2 type, specified

**Status:** Specified and built through U4. **Not gated, and Gate A has not been run on it.** Nothing
here is wired into the live learning block, and neither arm is served.

**What this document is.** The U2 unit of `STAGE2_QUESTION_DESIGN.md` §9.2 for the verbal slot,
written in the shape of that document's §3.1 because §3.1 is the one type spec the project has
executed end to end. It expands `STAGE2_REDESIGN_SPEC.md` §5.3's primary proposal into something a
builder can take to U5 without further decisions.

**Requirements served.** R6 (measure growth without a gifted-student ceiling — the verbal slot of
the learning block has no usable type, so the block currently cannot observe growth in verbal at
all), R5 (a defensible capability standard needs the constructs it claims to measure to be
obtainable — §5.3 records that the incumbent verbal type is not measuring verbal reasoning), R7
(auditable and falsifiable — every claim below has a command that produces it, and the falsification
tests are named in §7), R8 (feasible inside a child's session — one tap, four fixed positions, the
response grammar already paid for in Stage 1), R10 (state the boundaries — §8), H1 (broader
evidence-backed capability measures), H6 (design for enough statistical information), H10 (minimise
gaming and burden — §6 is the whole of it).

**Evidence and assumptions used.** E-095 and E-200 (recovery and the guessing floor), E-094
(key-position balance), E-075/E-076 (content-computable items and response-model leaks), E-212 (the
per-type floor machinery reads option count off the bank record, which is what lets a *template*
carry `optionCount` and be read correctly), the re-keying measurement in D-206/PR #51 and
`STAGE2_ANTILEAK_COMPARISON.md`. Decisions honoured: D-017 (text-only, never audio), D-S2-3 (the
scrambled control is a binding gate and a generator *mode*), D-030, D-207. **New evidence:** E-208,
the U3/U4 measurement below. **New assumption:** A-S2-7, the sign of the marking lever. **New
decision:** D-209.

**In scope:** U2 (this document plus the catalog rows), U3 (`generators/VER-ROLES-01.mjs`, both
persistence modes) and U4 (`generators/check-VER-ROLES-01.mjs`).

**Explicitly out of scope:** U5 Gate A, U6 renderer, U7 verifier, any wiring into the live block,
difficulty calibration, and Gate B. The four other Stage 2 types are untouched.

---

## 1. The item

The child sees a **scene** and a **sentence in an invented language**, and taps one of four options.
Two directions, balanced across the bank:

- `sentence_to_scene` — one sentence, four candidate scenes. Which scene does it describe?
- `scene_to_sentence` — one scene, four candidate sentences. Which sentence describes it?

A **scene** is a predicate and an assignment of participants to thematic roles: `push(agent=circle,
patient=square, goal=triangle)`. It is rendered schematically and in text only, per D-017 — labelled
outlines and role labels, never a picture and never a word the child must already know.

A **sentence** is a verb form and two or three argument forms. Every noun and verb form is a
three-letter CVC pseudo-syllable; every role particle is a two-letter CV, hyphenated to the noun it
marks. `ta-neb bo-dif mi-rom nav` and `zik dif neb nav` are both sentences of this language.

The hidden system is a **grammar**, drawn server-side per session and never sent to the browser:

| part | what it is | load-bearing? |
| --- | --- | --- |
| `nouns`, `verbs` | entity → CVC form, predicate → CVC form | Yes — but learnable from the scenes alone, so it is the cheap tier |
| `particleForms` | the three case markers, in slot order | Yes |
| `particleRoles` | which role each slot marks | Yes — this is the case system |
| `baseRoleOrder` | the order arguments appear in when the sentence carries no particles | Yes — this is the positional system |
| `particlePlacement`, `verbSlot` | whether particles lead or trail, whether the verb is initial or final | **No.** Particles are two letters and nouns three, so placement is recoverable from the string; the verb is identifiable by lexicon. Both are drawn so a re-drawn grammar *looks* different to a child who has seen one, and neither is priced |

**The parse rule, in full, because it is the language.** The verb is the bare token the verb lexicon
recognises. Every argument carrying a particle takes that particle's role. Every remaining argument
takes a remaining role, matched by surface order against `baseRoleOrder`.

**Two marking regimes, uniform within an item.** Under `particle`, every argument is marked and word
order carries nothing. Under `position`, no argument is marked and order carries everything. The
regime is a declared lever; §3 records why it is binary rather than a count.

## 2. What is learnable

Three things, in the order a child gets them:

1. **The lexicon** — which form names which participant, and which names which action. Available from
   the scenes alone: a form that appears whenever the circle is in the scene names the circle. This
   is cheap and it is *supposed* to be cheap; §6's Tier 2 measures exactly how little it buys.
2. **The case system** — which particle marks which role. This is the deep one and it is what the
   type exists to measure.
3. **The positional system** — which order unmarked arguments appear in, and that it is an
   *alternative route to the same fact* rather than a second vocabulary.

A child who has (1) and neither (2) nor (3) is at the type's residual-ambiguity floor and scores
`1/(roleOnlyDistractors + 1)`. A child who has (2) and (3) scores 1.0 at every difficulty. The gap
between those is the whole measurement.

## 3. Divergence mechanism

Two-argument, particle-marked items with one role-only distractor establish the case system: there is
one particle to read and one binding to place. Divergence begins where the item asks for something
the lexicon cannot supply:

- **at three arguments**, where three bindings must be right at once and getting two of them right
  scores zero;
- **at positional marking**, where there is no per-argument cue at all, so a partly-induced grammar
  earns no partial credit — and where the English word-order prior does its damage, because the base
  order is drawn uniformly and is agent-first on only one session in six;
- **and most sharply at `roleOnlyDistractors: 3`**, where all three wrong options show the *same
  participants and the same predicate* as the key and differ only in who fills which role. A child
  holding "these three are involved somehow" has nothing to eliminate. A child holding the assignment
  has a unique answer.

Over 30 trials the fast learner is answering three-argument positional items whose entire slate is
role permutations while the slow learner is still on two-argument marked ones, which is a rising
`theta0 + λt` against rising `b`.

## 4. Difficulty levers

§5.3 names four. Three are independent and the fourth is *identically* determined by the third,
which is a property of this design worth stating rather than a lever to price twice.

| lever | range | invariant because |
| --- | --- | --- |
| **argument count** | 2, 3 | a count of argument positions |
| **marking** | `particle`, `position` | a property of the sentence's form, not of which morpheme was drawn |
| **role-only distractors** | 1–3 | a count of options |
| **residual ambiguity** | 2–4 | `= roleOnlyDistractors + 1`, verified per item — see below |
| *slate proximity* | continuous [0,1] | the within-rung positioner: mean option distance from the key, where distance counts participants whose role changed |

**Why residual ambiguity is not priced separately.** An option survives a client that knows the
vocabulary but not the role system exactly when it is a role permutation of the key — that is what
"role-only" means. So the surviving-option count *is* `roleOnlyDistractors + 1`, and the checker
asserts the identity on every item rather than assuming it. Pricing both would double-count one
structural fact, which is the §1.1(d) labelling error.

**What is deliberately NOT priced, and balanced instead.** Direction, key position, and the
role-to-surface-rank layout. A lever balanced across every rung is orthogonal to trial index and
therefore to λ; a lever *priced* on an untested ordering biases λ. Direction is balanced because
whether the two diverge is this design's named failure mode (§7c). The role layout is balanced
because it is the quota that holds every order strategy at the guessing floor (§6).

**Difficulty is computed from the template alone, and the checker proves it does not move under a
re-draw.** That is the property §2 of the redesign spec says the four shipped banks do not have: on
them a free relabelling moves the difficulty count on 21.4%–50.3% of item × mapping pairs.

**Band ladder.** K-1 is **excluded**, not capped — the stimulus is text and Grade-1 decoding accuracy
is around 34% (gifted-assessment BrainLift 6.7), the same evidence and the same treatment §3.3 and
§4.3 give the incumbent verbal type. Above it the cap is on argument count: 2 at band 2-3, 3 at 4-5
and 6-8, because argument count is the dimensionality the developmental evidence constrains (Li et
al., 2024, on 6–7-year-olds and information-integration structures).

## 5. Novel by construction, and why this design is the strong case for it

The lexicon, the case system and the base order are all drawn per session, so nothing about a
previous sitting transfers. That is true of every Stage 2 type. What is specific to this one:

**The participants are semantically inert.** Nothing about a square makes it a likelier agent than a
circle. This closes the standing failure of thematic-role items built from real-world nouns: "the dog
chased the ball" has one sensible reading, so a child who answers it has used world knowledge and the
item has measured vocabulary. Every reading of every item here is equally plausible, so only the
grammar separates them.

**Prior-knowledge resistance is the design's stated purpose, and it is the property "culture-fair"
tests do not deliver.** Subcategory 2.4 of the gifted-assessment BrainLift records English-language
learners scoring 0.5–0.67 SD lower on Raven's, the NNAT and CogAT-Nonverbal, and 9.2 gives the
instrument-by-instrument version: nonverbal tests are "neither culture free nor culture fair", and
the NNAT3 did not identify more underrepresented students than CogAT-Nonverbal. Switching to shapes
does not remove the language advantage. A constructed language can, because there is no vocabulary to
have been exposed to. *(The redesign spec cites these as Categories 8.4 and 8.5; that numbering is
stale — the live subcategories are 2.4/9.2 and 2.5/4.7.)*

**The honest limit.** Being invented removes *vocabulary* transfer. It does not remove the English
word-order prior, and a child whose first language marks roles by case rather than by order arrives
with a different prior again. The design's answer is to make no order right more often than chance
(§6), which equalises the *item*, not the child. Whether λ here still correlates with verbal standing
is untested and is the same open question §4.7 records for every type.

## 6. Anti-leak, measured in two tiers plus a derived bound

All figures from `node research/exam-question-types/generators/check-VER-ROLES-01.mjs` on both arms,
468 templates each. Recorded as E-208.

**Key containment.** `content` names no role, no participant, no predicate, no plan and no arm, and
carries **no option list at all** — a template's content is the sentence's shape and the option count,
nothing else. It is `content.optionCount` rather than `content.options`, which `itemOptionCount`
already accepts (E-212), so the per-type guessing-floor machinery reads a template correctly with no
change to it.

**Key re-derivation: 11,232 / 11,232 materialisations per arm, 100%.** The checker builds its own 24
grammars by enumeration — four lexicons crossed with six role systems, no shared RNG — and re-derives
the key under each. That is a stronger claim than a baked bank can make: a bank of finished items has
exactly one grammar under which its key is coherent, so its checker can only confirm that one.

| tier | what the client knows | invariant | measured |
| --- | --- | --- | --- |
| **1** | nothing | every option reachable by *some* grammar, so nothing can be eliminated | **468/468 templates, all 4 options reachable.** Elimination sits exactly on the 25.0% four-option floor |
| **2** | the vocabulary; not the role system | ≥ 2 options survive, and the count equals `roleOnlyDistractors + 1` | survivor counts 2:176, 3:123, 4:169; **minimum 2**, identity holds on every item. A vocabulary-only client tops out at 50.0% |

**Order strategies, against a derived bound rather than a round ceiling.** Every assumed
role-to-surface-rank mapping — the English reading "the first noun is the agent" included — scored
over the **exact 36-member role-system family**, which is the position a client without the session
grammar is in. The bound is derived, not chosen:

```
1/n + (n − 1 − roleOnly) / (n · R)        n = 4 options, R = 6 readings
```

| slice | measured | derived bound |
| --- | --- | --- |
| `roleOnly = 1` (2 args / 3 args) | 33.3% / 33.3% | 33.3% / 33.3% |
| `roleOnly = 2` | 29.2% / 29.2% | 29.2% / 29.2% |
| `roleOnly = 3` | **25.0% / 25.0%** | 25.0% / 25.0% |

Every slice sits **exactly on** its bound, so the entire excess over the floor is the intrinsic
multiple-choice asymmetry — the key is on screen with probability 1 and each rival reading with
probability `roleOnly/(R−1)` — and none of it is anything the grammar leaks.

**The residual is 8.3 points at `roleOnly = 1` and it is not closed. That is a decision.** Three ways
to close it, each costing more than it saves: pinning `roleOnly` at 3 deletes §5.3's third lever and
leaves raw-scale gaps at 3.4–4.2 and 6.8–9.2 that no other lever reaches; a fourth thematic role
halves the excess but doubles the induction space at band 2-3, which is the band §4.3 says to protect;
more options makes the *ratio* worse and breaks the S1 response-grammar match. Where it lands is why
that is defensible: difficulty rises with `roleOnly`, so the excess is largest on the **easiest**
items and exactly zero on the hardest. That is the opposite of `FLU-OPCHAIN-01`'s measured failure,
which scored 34.0% in its hardest slice against a 20% floor — on the children the measurement is
about. It is also the conservative direction: inflating early-trial accuracy flattens the fitted climb
and biases λ *down*. Neither makes it harmless. It is difficulty-correlated error, §1.1(d) says that
biases λ rather than attenuating it, and it is the first term to interrogate if Gate A's A1 fails.

**Other balances.** Key positions A/B/C/D at 117 each — exactly 25.0%, zero modal advantage over the
floor. One option-count stratum, so E-094's prohibition on pooling formats is satisfied trivially.
Directions 234/234. Coverage 1.01–19.99 with 12 items in every one of the 39 half-point rungs. No two
templates are the same question. Reading load, longest key sentence: band 2-3, **3 tokens / 13
letters**; bands 4-5 and 6-8, 4 tokens / 18 letters.

## 7. What would show it failing

- **(a)** Two-argument particle-marked accuracy does not reach ceiling by trial 8 → the particles are
  not legible and the block is measuring decoding, not role assignment.
- **(b)** Accuracy on `roleOnlyDistractors: 3` items tracks accuracy on `roleOnlyDistractors: 1`
  items exactly → children are not doing role assignment at all; they are eliminating on participants
  and predicates, and there is no ladder to climb.
- **(c)** `sentence_to_scene` and `scene_to_sentence` accuracy diverge → the item is measuring a
  comprehension/production asymmetry rather than the grammar. This is why both directions are carried
  and balanced within every rung; a bank with one direction could not test it.
- **(d)** Errors stay spread across the option classes instead of concentrating on
  `reversed_relation` → accuracy is rising from guessing or difficulty misspecification, not from
  induction. Every wrong option carries its named transform, so this is computable per trial.
- **(e)** Positional items are not harder than particle-marked ones, or are *easier* → A-S2-7's sign
  is wrong, and §1.1(d) says a wrong ordering biases λ rather than adding noise.
- **(f)** λ does not separate from the scrambled control arm → the block is not measuring learning of
  the system. This is D-S2-3's binding gate and it needs children.
- **(g)** λ correlates with opening-trial first-response latency → interface learning.

## 8. Position against the incumbent, and the irreducibility claim

§5.3's charge against `VER-MORPHO-01` is that it is the same compose-hidden-operators task as the
other three types with word-shaped tokens. It is a fair charge: a morpheme there is a unary function
on a picture state, a word is a composition, and the answer is the resulting state.

**This design is not reducible to operator composition, and the claim is checked rather than
argued.** Three properties, none of which an operator chain has:

1. **The options are permutations of one another's bindings.** On a `roleOnlyDistractors: 3` item all
   four options show the same participants and the same predicate and differ only in the assignment.
   An operator chain cannot construct that item: its options differ in the *value* of a composition,
   and "same value, different assignment" is not expressible in a system with no bindings.
2. **Rearranging the same words means something else.** `468/468` templates admit a rearrangement of
   their own word forms that denotes a different scene — reordering the arguments under positional
   marking, re-pairing the particles with the nouns under particle marking. Non-commuting operators
   change an *output* when reordered; they do not change *who did it*, because there is no who.
3. **The hidden system is not a symbol table.** A grammar is a particle→role bijection *and* a base
   order, and they are alternative routes to the same fact. The same particle inventory with a
   different base order parses a bare sentence differently and a marked sentence identically — a
   property no assignment of meanings to symbols has.

If a future change collapses any of these — in particular if the option slate stops being role
permutations over one participant set — the type has been rebuilt as `VER-MORPHO-01` and should be
stopped rather than shipped. The checker fails on (2) directly; (1) and (3) are structural and are
what the two-tier audit measures.

**What this does not settle.** Whether the type loads on verbal rather than fluid reasoning is
untested, exactly as A-S2-3 records for the incumbent. The argument that it does is that assigning
agent and patient from grammatical marking is syntactic and semantic inference, and that argument is
a design stance, not a correlational result. It needs the same real-children check A-S2-3 needs, and
nothing in U3 or U4 provides it.

## 9. Where the artifacts are, and why not in `banks/`

| unit | artifact |
| --- | --- |
| U2 | this document; rows in `catalog/master_types.jsonl` and `specs/types_verbal.jsonl` |
| U3 | `research/exam-question-types/generators/VER-ROLES-01.mjs` → `templates/VER-ROLES-01.jsonl` (measurement arm) and `control-templates/VER-ROLES-01.perTrial.jsonl` (scrambled control) |
| U4 | `research/exam-question-types/generators/check-VER-ROLES-01.mjs` |

**Neither arm is in `banks/`, and that is deliberate.** `banks/` is the served directory:
`bank-loader.ts` builds every path it reads inside it, `sync-exam-demos.mjs` globs it to decide what
is wired, and `bank-conformance.test.ts` validates every file in it against `bankItemSchema`. A
template has no `content.options`, so it is not a servable item — putting one there would either fail
that test or, worse, pass it and be served. The serve-time materialisation path is what will turn a
template into something `banks/` can hold; until it lands, nothing in the app can reach these files.

**The two arms differ in exactly one field.** `answer.grammarRef`: one grammar for the whole
measurement arm, a fresh one per item in the control arm. Everything else is byte-identical, because
a template mentions no word and no role. That is a stronger equating than any bank of finished items
can reach — §4.1.1 requires the arms to differ *only* in whether the system persists, and here there
is nothing left over that could differ.

## 10. Status, stated plainly

**Specced, generated and checked. Unexamined by any gate.** Gate A has not been run on this type at
all — U5 is the next unit and it is out of this scope. Gate B needs roughly 128 real children
(§4.1.3) and no synthetic run substitutes for them. Both banks ship `syntheticOnly: true` and
`validated: false`; `difficulty` is a design rung computed from the levers, not a calibrated IRT
parameter. There is no renderer and no verifier. Nothing here makes a learning rate reportable —
`learningRateCohortRank` remains the supported question, before and after.
