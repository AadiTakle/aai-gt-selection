# Stage 2 Question Design — Item Types for the Learning-Rate Block

**Status:** Design proposal. **Nothing here is built, and nothing here is ratified.** This document
proposes item types for the Phase 2 novel block and a build plan for them; it does not change any
shipped behaviour, bank, generator, demo, verifier, or engine file. The owner triggers the build
separately.

**Requirements served:** R6 (measure growth without a gifted-student ceiling — this is the whole
point of the block), R5 (a defensible capability standard needs the constructs it claims to
measure to actually be obtainable), R7 (auditable and falsifiable — every design below carries a
named falsification test), R8 (feasible inside a child's session), R10 (state the boundaries),
H1 (broader evidence-backed capability measures), H6 (design for enough statistical information),
H10 (minimise gaming and burden).

**Evidence and assumptions used:** E-073 and E-095 (recovery, attenuation and posterior SE of the
fitted climb by block length), E-094 (key-position imbalance in the born-synthetic banks),
E-074 (banks do not currently satisfy `bankItemSchema`), E-075/E-076 (content-computable items and
response-model leaks), E-079/E-082/E-083 (demo embedding defects that any new demo must not
reintroduce), E-093 (no norm bank exists for originality-style indices). Decisions honoured:
**D-030** (one area, ordinal band or nothing), D-031 (quantitative metric enforcement), D-017
(text-only, reading is a required capability, never audio), D-023/D-025 (bracketing and selection
unchanged).

**In scope tonight:** the design philosophy for a Stage 2 item, one or more proposed types per
reasoning area, the mechanism by which faster learners diverge, the falsification evidence for
each, a shortlist, and the overnight build plan.

**Explicitly out of scope tonight:** difficulty calibration, metric selection and weighting,
reference distributions for λ, any change to the estimator or the readout, and any implementation.
Section 8 states what each design *needs* from calibration and metrics and then stops.

**New assumptions opened by this document:** A-S2-1 through A-S2-6, listed in §10.

---

## 1. Design philosophy — derived from the estimator, not from puzzle taste

### 1.1 What the estimator actually consumes

`estimateLearningCurve` in `packages/exam-scoring/src/learning-curve.ts` fits, by MAP under a
normal prior on both parameters:

```
P(correct | difficulty b, trial t) = logistic( slope * (theta0 + lambda * t - b) )
```

Its input is a list of `{ difficulty, score, trialIndex }`. Its output is `theta0`, `lambda`,
`theta0Se`, `lambdaSe`. `learningRateReadout` then refuses to name a band unless
`lambdaSe < bandHalfWidthSds * sd`.

Five consequences follow directly, and they are the entire design brief. Everything else in this
document is downstream of them.

**(a) λ is not "the child learned the rule". It is the rate at which the difficulty they have an
even chance on rises.** A design in which acquiring the learnable thing does not move the child
*up a difficulty ladder* produces λ ≈ 0 no matter how much learning happened. So a Stage 2 type
must have a difficulty ladder that the learnable thing unlocks.

**(b) Only the outcomes carry information about λ; difficulty is data, not a parameter.** The
observed information is `slope² · p(1−p)` per trial, weighted by `t` and `t²`. Information per
trial is maximised at p = 0.5. This is why the block aims *above* standing
(`LEARNING_BLOCK_TARGET_OFFSET = 1`) and re-targets upward as the fit projects a climb: the
targeting rule is an information-maximising device, and it is also what stops a fast learner from
plateauing where their climb would become invisible.

**(c) The block needs difficulty *headroom*, not just item count.** `poolSupportsBlock` checks
that ≥30 distinct unseen items exist. That is necessary and not sufficient. A child climbing at
λ = 0.10 scale points/trial ends the block wanting items at `standing + 1 + 3.0`; at λ = 0.15,
`standing + 1 + 4.5`. If the pool tops out below that, the served difficulty saturates, the child
goes all-correct, the damping in the fit pushes λ toward its bound, and the SE inflates — the top
of the λ distribution is truncated exactly where the interesting children are. **Design
requirement: ≥6 scale points of usable headroom above `standing + 1`, at ≈0.5-point granularity,
for every standing value a real child can arrive with.** This is a bank-shape requirement, and no
existing bank was built against it.

**(d) Mis-stated difficulty becomes bias in λ, not just noise.** The fit reads `difficulty` as
known. Because the targeting rule serves systematically *different* item subsets early and late,
any difficulty error that correlates with the composition of those subsets correlates with
`trialIndex`, and correlated error in `b` maps straight onto `lambda`. Random labelling error
attenuates; *structured* labelling error biases. **Design requirement: difficulty must be produced
by a generative lever that is monotone by construction and checkable by an independent solver, not
by hand-labelling.**

**(e) `lambdaSe` is the binding constraint, and it is dichotomous.** At 30 trials, E-095 puts the
mean posterior SE at ≈0.047, which is wider than half the plausible between-child spread — hence
`indeterminate` as the honest default. Partial credit is *accepted* by the trial contract
(`score` is `[0,1]`), and it will stabilise the point estimate; but the information term in the
current code is computed from `p` alone under a Bernoulli likelihood, so **graded scoring will not
narrow the reported `lambdaSe` and therefore will not by itself move a readout off
`indeterminate`.** Buying precision from partial credit requires a graded response model. That is a
measurement decision for the owner (§8, §10), not something a question design can deliver.

### 1.2 The central structural tension, and the only shape that resolves it

Two of the owner's hard constraints collide:

- **Novel by construction** — the child must not arrive knowing it, and (per `learning-block.ts`)
  no item may repeat, because a repeat measures item recall.
- **Learnable within ~30 trials** — there must be something acquirable during the block.

Together these forbid the obvious design. You cannot teach the child item 1 and re-test item 1.
Whatever is learned must **transfer across items within the block**, because every item is new.

That leaves exactly one family of designs: a **hidden generative system** whose primitives compose.
Each trial is a fresh instance; the *system* persists. The child who abstracts the system solves
later, harder instances they would have failed at trial 1. The child who treats each item as an
isolated puzzle cannot, because there is no item to remember.

This is the structure of learning-set formation (Harlow's paradigm; in children, reversal
learning-set has been demonstrated in preschoolers — Lionello-DeNolf, McIlvane, Canovas, de Souza &
Barros, 2008, *The Psychological Record*, 58(1), 15–36 — but on 6 children per experiment in a
single-subject design, so treat it as an existence proof, not an effect size), of
artificial-grammar learning, and of rule-family induction. All four designs in §3 are instances of
it. I will call it the **Novel Generative System (NGS)** schema.

### 1.3 Graded induction, not single insight — the most important design decision

A one-rule discovery task ("find the hidden category") produces a **step function**, not a climb:
the child is at chance until insight, then near-ceiling. Fitting a linear λ to a step recovers,
approximately, *how early the step arrived* — which is not worthless, but it is a very lossy use of
30 trials, because every trial before and after the step carries almost no information about λ.
Worse, an early step followed by a plateau produces a flat second half and the linear fit
underestimates.

There is direct reason to expect steps rather than smooth curves. A dissertation on discrimination
learning-set in 7- and 9-year-olds reported that set formation "did not show until the problem on
which criterion was met… indicat[ing] that learning set can be quickly formed" (Fenner, 1977,
*Discrimination Learning Sets in Children*, PhD dissertation, University of North Dakota; N = 54,
all female, average IQ range) — **T3, unrefereed dissertation on a narrow sample, cited only as a
directional caution, not as evidence.**

The fix is structural: **the learnable thing must have depth.** Not one rule to find, but a small
closed vocabulary of primitives that *compose*, so that "having learned it" is a ladder rather than
a switch:

| depth | what the child must have | ≈difficulty |
|---|---|---|
| 1 | know what one primitive does | low |
| 2 | chain two, in the right order | mid |
| 3–4 | chain three or four; hold order and interference | high |
| generalise | apply to a primitive combination never demonstrated | highest |

Then the adaptive re-targeting has somewhere to go after the first insight, the climb continues,
and λ summarises the *rate of successive abstraction* rather than the timing of one event. This
single decision is what makes the difference between a design that produces an identifiable λ and
one that produces a coin-flip.

It is also the reason the existing rule-discovery types are not sufficient as-is: `VER-SORTBOT-01`
and `FLU-CONCEPT-01` are single-rule discovery. They are good types. They are step generators.

### 1.4 Where the interface learning goes

The owner named this as the most likely failure, and it is. An apparent climb produced by a child
working out where to click is indistinguishable, inside this fit, from a climb produced by
learning. Four mitigations, in descending order of strength:

1. **Put the interface learning in Stage 1, where it is already paid for.** The Stage 2 type must
   use the *same interaction grammar* as an S1 type the child completed earlier in the session. In
   cognitive-load terms this is pre-training: the extraneous load of the interface is discharged
   during bracketing, which is designed around a search that tolerates it, instead of during the
   block, where it lands on λ. (Sweller, van Merriënboer & Paas, 2019, *Educational Psychology
   Review*, 31(2), 261–292; Mayer's pre-training and segmenting principles, Mayer, 2021,
   *Multimedia Learning*, 3rd ed.)
2. **One tap, fixed positions, no construction.** No drag, no free-form build, no multi-step
   manipulation — each of those carries its own motor learning curve, and the brainlift's own
   presentation evidence (4.3) records that tapping is more accessible than drag-and-drop for young
   or low-exposure children. Fixed option positions also remove position-search as a learnable.
3. **An unscored interface gate before trial 0.** A short run at floor difficulty on a *degenerate*
   instance of the system — one where the answer is visible, so it exercises the interface without
   teaching the induction — run to a criterion of *k* consecutive correct. A child who has not got
   the interface does not reach trial 0. This is mastery gating applied to the interface only, never
   to the scored block (Bloom, 1968).
4. **A falsification instrument.** If λ is interface learning, λ should track first-response latency
   on the block's opening trials and should be *larger* when the block runs cold than when it runs
   after a matched-interface S1. Both are cheap to test. §4 makes this an acceptance gate.

### 1.5 Feedback: unavoidable, and its minimal defensible form

A learning block without feedback has nothing to learn from. But this project's own structural
research is against within-test feedback (brainlift 7.8: feedback lowered performance in over a
third of studies and can leak into the ability estimate), and the general result is that roughly a
third of feedback interventions *reduce* performance, worst when they target the self (Kluger &
DeNisi, 1996, *Psychological Bulletin*, 119(2), 254–284; Hattie & Timperley, 2007, *Review of
Educational Research*, 77(1), 81–112).

Three findings resolve the tension into a specific design, rather than a compromise:

- **Show the world, not a verdict.** Feedback must be *informational* — the machine completes its
  action and the correct outcome is simply the next visible state. No "Correct"/"Wrong", no score,
  no streak, no praise, no points. Performance-contingent rewards crowd out intrinsic motivation and
  do so worse in children (Deci, Koestner & Ryan, 1999).
- **Do not lean on negative feedback, especially for the younger bands.** 8–9-year-olds' accuracy on
  the following trial dropped substantially more after negative than after positive feedback, and the
  gap was larger for children than for adults (van Duijvenvoorde, Zanolie, Rombouts, Raijmakers &
  Crone, 2008, *Journal of Neuroscience*, 28(38), 9495–9503). A design whose learning signal is
  error-driven correction will therefore partly measure tolerance of being told you are wrong — and
  will do so *differentially by age*, which is a fairness problem as well as a validity one.
- **Observation is at least as good as feedback for children on rule-based categories.** In 6–7-year-
  olds, feedback training conferred no significant advantage over observational training on a
  conjunctive rule-based task, while adults did benefit from feedback; the authors attribute the
  difference to feedback's higher working-memory and updating demands (Li, Huang, Seger & Liu, 2024,
  *British Journal of Developmental Psychology*, 42(4), 495–510). **Concrete decision:** the block
  may interleave *unscored observation trials* — the system resolves an instance in front of the
  child before the next scored trial — at a fixed, identical cadence for every child. Because the
  cadence is fixed, λ remains per-scored-trial and remains comparable; but note explicitly that
  `trialIndex` then counts scored responses, not learning opportunities.

Retrieval practice survives all of this and is why the ordering matters: the answer is never
revealed before the child commits (Roediger & Karpicke, 2006, *Psychological Science*, 17(3),
249–255). Every trial is a committed retrieval attempt; the informational reveal follows it.

### 1.6 Difficulty must be generated, not labelled

From §1.1(d), difficulty has to come out of the generator. Each design below therefore names
difficulty levers that are **countable from the generator's own parameters** — composition depth,
number of primitives in play, whether the item requires extension to an undemonstrated
combination, distractor distance. A checker can then assert monotonicity of the design difficulty
in those levers without knowing anything about children. That is a much weaker claim than
"calibrated difficulty", and it is the claim actually needed to keep the fit unbiased.

Where an established empirical difficulty ordering exists, use it. For categorisation there is one:
Shepard, Hovland & Jenkins (1961, *Psychological Monographs*, 75(13, Whole No. 517)) established
the ordering Type I < Type II < Types III/IV/V < Type VI over six category structures on three
binary dimensions, and Nosofsky, Gluck, Palmeri, McKinley & Glauthier (1994, *Memory & Cognition*,
22(3), 352–369) replicated the ordering with block-by-block learning curves. **Boundary condition
that changes a design decision:** the ordering is not invariant — with *integral* (non-separable)
dimensions, Type II moves from second-easiest to nearly hardest (Nosofsky & Palmeri, 1996,
*Psychonomic Bulletin & Review*, 3(2), 222–226). So any categorisation-structured item in this
project must use **separable** dimensions (shape, fill, count — not hue-vs-saturation), or the
imported difficulty ordering is wrong, and §1.1(d) says a wrong ordering biases λ.

### 1.7 Learning Science Rationale

**Goal & learner:** a child aged ~5–14, in a single session, must acquire a hidden compositional
system across ~30 unrepeated trials well enough that the difficulty they can handle rises — under
a text-only, no-audio, no-reward, single-tap interface, immediately after a variable-length
bracketing phase, with no prior exposure to the system.

| Principle | Why it applies here | Concrete decision | Source |
|---|---|---|---|
| Cognitive load — extraneous vs germane | An apparent climb from interface learning is the design's most likely failure | S2 type reuses an S1 type's interaction grammar; single tap, fixed option positions; no drag or construction | Sweller, van Merriënboer & Paas (2019) |
| Pre-training / segmenting | Interface competence must exist *before* trial 0 or it lands on λ | Unscored interface gate on a degenerate instance, to *k* consecutive correct, before the block starts | Mayer (2021) |
| Retrieval practice | Every trial must be a scored retrieval, not an exposure | Answer revealed only after the child commits; no "flip to reveal" path | Roediger & Karpicke (2006) |
| Feedback (task-focused, non-evaluative) | Learning needs feedback; evaluative feedback degrades performance and leaks into the estimate | Feedback = the system's next visible state. No verdict, score, streak, praise, or points | Kluger & DeNisi (1996); Hattie & Timperley (2007) |
| Developmental feedback asymmetry | Error-driven designs would measure tolerance of negative feedback, differentially by age | Correct outcome shown as a completed state; no error salience; no error-count display | van Duijvenvoorde et al. (2008) |
| Observational learning in children | Children 6–7 gained nothing from feedback over observation on rule-based categories | Fixed-cadence unscored observation trials interleaved between scored trials; cadence identical for every child | Li, Huang, Seger & Liu (2024) |
| Worked examples → fading | Novices need the system demonstrated; experts are hurt by redundant support | Block opens with fully-worked demonstration instances, then fades to none on a fixed schedule (not performance-contingent, to keep λ comparable) | Sweller & Cooper (1985); Renkl & Atkinson (2003); expertise reversal, Kalyuga et al. (2003) |
| Interleaving | Blocking by depth would make difficulty a deterministic function of trial index | Composition depths and rule sub-families interleaved within the block; target difficulty jittered by a seeded offset around the projection | Rohrer & Taylor (2007) |
| Desirable difficulty | Justifies aiming above standing — *and* is why this belongs only in Stage 2 | Block targets `standing + 1` and follows the child up; the same difficulty is excluded from Stage 1 | Bjork & Bjork (2011); Soderstrom & Bjork (2015) |
| Deliberate practice (edge of ability) | The re-targeting rule is the mechanism, not a motivational slogan | `nextTargetTheta` re-fits every trial so items track the projected level | Ericsson, Krampe & Tesch-Römer (1993) |
| Concreteness fading | The quantitative design must anchor an arbitrary glyph in a depicted quantity before going symbolic | `QUANT-GLYPHNUM-01` opens with glyph-beside-quantity, fades to glyph-only by a fixed trial | Fyfe, McNeil, Son & Goldstone (2014) |
| Mastery gating — interface only | Gating the scored block would destroy comparability; gating the interface protects λ | *k* consecutive correct on the interface gate; never any gate inside the scored block | Bloom (1968) |
| Reward-free engagement | Points/badges crowd out intrinsic motivation, worse in children | No points, badges, streaks, or performance-contingent animation anywhere in the block | Deci, Koestner & Ryan (1999) |

**Domain-tailored principles found (step 3):** SHJ category-structure difficulty ordering and its
integral-dimension boundary (Shepard et al., 1961; Nosofsky et al., 1994; Nosofsky & Palmeri, 1996);
artificial numeral-notation learning with demonstrated extension to untrained expressions, and a
sign-value advantage over place-value (Weiers, Gilmore & Inglis, 2025, *Journal of Numerical
Cognition*, 11, e13401 — **adults only**); additive composition rules learned more easily than
multiplicative in artificial number languages (Holt & Barner, 2025, *Cognitive Science*, 49(6),
e70071 — **adults only**); cross-situational word–referent learning in 5–7-year-olds from ambiguous
naming events, with learning modulated by contextual diversity (Suanda, Mugwanya & Namy, 2014,
*Journal of Experimental Child Psychology*, 126, 395–411) and fragile post-delay retention
(Vlach & DeBrock, 2019, *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 45,
700–711); spatial skills are trainable at g = 0.47 (Uttal, Meadow, Tipton, Hand,
Alden, Warren & Newcombe, 2013, *Psychological Bulletin*, 139(2), 352–402) — used here as a
**warning**, see §3.4.

**Tradeoffs and sharp edges:** desirable difficulty depresses current performance, which is exactly
why it must not leak back into Stage 1 (the owner's SPOV 2); worked examples must fade or they hurt
the children who already have the system; interleaving will make the block *feel* harder and look
worse trial-to-trial, and the design must not surface that to the child; observation trials cost
session time for no scored information; and the interface gate adds items that produce no λ.

---

## 2. Why the current Stage 2 pool is thin — and why it was thinner than it looked

The reviewer pass retired 17 of 66 catalogued types (verified: `catalog/master_types.jsonl` has 66
entries, `banks/` has 49). Of the ~11 types classified **pure S2** in
`research/test-structure-research/STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md` §2, six were retired:
`CX-diverge-01`, `CX-figural-01`, `CX-curious-02`, `CX-sjt-01`, `GB-PATHFORGE-01`,
`GB-SHAPEFIT-01`. Spatial lost both of its pure-S2 types (`GB-PATHFORGE-01`, `GB-SHAPEFIT-01`) plus
`GB-FILTER-01`, and is now covered only because the review moved `SPA-VIEW-01` across from S1.

But the deletions are the smaller half of the story. **The old classification called a type "S2"
when it lacked a keyed difficulty ceiling** — creativity, open-ended construction, divergent
planning. For *this* estimator, that is the wrong property, and in fact the opposite of the one
needed. The fit requires a keyed answer, a stated per-item difficulty, and 30 of them at a few
seconds each. So a usable Stage 2 type looks like an S1 type in its *scoring* and unlike one only in
its *learnability*. Screened against the estimator, the surviving pure-S2 set collapses:

| surviving "S2" type | keyed answer | difficulty ladder | plausible in ~20 s/trial × 30 | usable for λ |
|---|---|---|---|---|
| `VER-SORTBOT-01` | yes | yes (category abstractness) | yes (single tap IN/OUT) | **partly** — single-rule discovery, so a step not a climb (§1.3); 100 bank items |
| `SPA-VIEW-01` | yes | yes | marginal (drag / dial) | **partly** — same step problem; dial response has its own motor curve |
| `GB-ROBOPATH-01` | yes | yes | no — multi-step program per trial | no |
| `GB-WORDFORGE-01` | no (generative) | weak | no | no |
| `GB-WORDLADDER-01` | partial | yes | no — multi-move path per trial | no |
| `CX-achieve-02` | rubric | no | no — an investigation per trial | no |
| `CX-check-01` | behavioural | no | no | no |
| quant `DUAL→S2` (`QUANT-BALANCE-01`, `-GRAPH-01`, `-MIX-01`, `-WORD-01`) | yes | yes | no — multi-action systems tasks | no |

*(The time-per-trial column is a reasoned inference from each type's `interaction` field, not a
measurement. It is the single most important thing to check with real timings before trusting this
table — see §10, A-S2-1.)*

Two conclusions. First, the effective Stage 2 pool for a 30-trial block is closer to **one and a
half types than eight**, and both of the survivors are step generators rather than climb
generators. Second, the operational block is already pinned to fluid reasoning
(`LEARNING_BLOCK_AREA = 'fluid_reasoning'` in `apps/web/src/lib/exam/phase2.ts`), where the pure-S2
survivors are `CX-achieve-02` and `CX-check-01` — neither of which can supply λ at all. **Right
now the block runs in the one area with no usable Stage 2 type**, drawing instead on unseen
S1/DUAL fluid items, which are novel-to-the-child but contain nothing learnable across items. That
is the hole, and it is worse than the type counts suggest.

---

## 3. Proposed types, by reasoning area

Each design states: what is learnable; the divergence mechanism; the difficulty levers; how it
resists prior knowledge; how interface learning is absorbed; and what would show it failing.
All four are instances of the NGS schema (§1.2) with graded composition depth (§1.3).

### 3.1 Fluid reasoning — `FLU-OPCHAIN-01` "Machine Chain" *(primary)*

**The item.** A row of 2–4 badges shows the operators a machine will apply, in order, to a small
figure. Operators are drawn from a closed set of 5–6 figural transforms with arbitrary badge
symbols — rotate a quarter turn, mirror, swap fill, add a border, duplicate, drop a feature. The
child taps which of 5 output figures the machine produces. The operator vocabulary is **fixed for
the whole block** and re-drawn per child from a seeded space; which operators a given trial chains,
and in what order, varies every trial.

**What is learnable.** Two things, in sequence: (i) the badge→transform mapping (the vocabulary),
and (ii) that badges *compose in order*, so the same two badges in the other order give a different
figure. (ii) is the deep one, and it is what depth ≥2 items require.

**Divergence mechanism.** Depth-1 items teach the vocabulary; by roughly trial 6–8 nearly every
child should be near-ceiling on depth 1, and if they are not, something other than the construct is
broken (this is a design self-check, not a measurement). Divergence happens on depth ≥2, where the
child must apply operators in sequence to an imagined intermediate figure. A child who has
abstracted "compose in badge order" moves up the depth ladder as the targeting rule raises
difficulty; a child who is matching surface features of the output options cannot, because every
item's figure is new. Over 30 trials the fast learner is answering depth-3 and
undemonstrated-combination items while the slow learner is still on depth 1–2, which is precisely
a rising `theta0 + λt` against rising `b`.

**Difficulty levers (all countable from generator parameters).** Composition depth (1–4); whether
the chained pair has been demonstrated before in this child's block; number of operators in the
active vocabulary; whether order matters for this chain (commuting vs non-commuting pairs);
distractor distance, where each distractor is a *specific* named failure — one operator omitted,
two applied in the wrong order, one applied twice.

**Novel by construction.** The badge symbols are arbitrary and the operator set is seeded per child,
so no prior exposure transfers. **But the honest caveat:** the *transforms* (rotation, mirroring) are
not novel, and a child with more figural-reasoning experience will pick up the vocabulary faster.
λ will therefore correlate with fluid standing. That is expected and is not fixable by design — see
§4.7.

**Interface absorption.** Identical response grammar to `FLU-MATRIX-01` / `FLU-STACK-01` (look at a
stimulus, tap one of five options in fixed positions), both of which every child meets during fluid
bracketing. The interface gate uses depth-0 items where the machine applies no operator at all.

**What would show it failing.** (a) Depth-1 accuracy does not reach ceiling by trial 8 → the badges
are not legible and the block is measuring symbol decoding. (b) Error types stay random across the
block instead of migrating toward omitted-operator and wrong-order errors → accuracy is rising from
guessing or difficulty misspecification, not from induction. (c) λ does not separate from a
scrambled-vocabulary control block (§4.1) → the block is not measuring learning of the system.
(d) λ correlates with opening-trial first-response latency → interface learning.

**Position against existing types.** Closest relatives are `FLU-GRIDCOPY-01` (constructed transform,
drag, per-attribute partial credit) and `FLU-CONCEPT-01` (rule discovery with keyed probes). The
new properties are a *persistent vocabulary across 30 novel trials*, *countable composition depth
as difficulty*, and *single tap*. **Before building, check whether `FLU-CONCEPT-01` can be extended
into this shape instead** — it already has the rule-discovery frame and a keyed probe; what it lacks
is a persistent composable vocabulary and a depth ladder. Extending an existing type would be
cheaper and would inherit its verifier. This is a genuine open question, not a formality (§10).

### 3.2 Quantitative — `QUANT-GLYPHNUM-01` "Alien Numbers" *(primary)*

**The item.** An invented numeral system: three or four arbitrary glyphs, composed by a hidden rule,
in a small base (3 or 4). Trials ask the child to compare two written expressions, order three, or
tap where a written expression sits among six marked positions on a line. The system is fixed for
the block; expressions are new every trial.

**What is learnable.** (i) glyph→value; (ii) the composition rule — whether the system is
*sign-value* (glyphs add, order irrelevant) or *place-value* (position multiplies); (iii) extension
to expressions never shown.

**Why this paradigm, specifically.** It is the best-evidenced difficulty structure available in this
area, and it solves quantitative's worst confound. A normal quantitative item measures arithmetic
the child was *taught*, so λ on it would partly measure schooling. An invented base-3 notation with
invented glyphs cannot be pre-known — the Weiers et al. (2025) study used base 3 explicitly "to
avoid the confound of familiarity with base-10", found learners acquired ordinal meaning **and
extended to untrained expressions**, and found a sign-value advantage over place-value. Holt &
Barner (2025) independently found additive/conjunctive composition easier than multiplicative.
Together those give two *ordered* difficulty levers with published direction. **Both studies are on
adults.** That the ordering holds in children is A-S2-2, an open assumption, and it is the largest
single evidential gap in this design.

**Divergence mechanism.** Early trials are two-glyph comparisons where value ordering alone
suffices. Divergence begins where the expression length exceeds what can be handled
glyph-by-glyph and the composition rule must be used — and again at extension items, where the
expression contains a combination never demonstrated, so only a child holding the *rule* rather
than a lookup table can answer. A child who has the rule keeps pace as expressions lengthen; a
child memorising expressions cannot, because expressions never repeat.

**Difficulty levers.** Number of glyphs in the expression; base; composition type (additive first,
multiplicative later — published direction); whether the expression is an untrained combination;
numerical distance between the compared quantities (a standard ratio-difficulty lever); number of
distinct glyphs in play.

**Interface absorption.** Comparison/ordering by tap matches `QUANT-DOTS-01` and `QUANT-SERIES-01`.
The line-position response is **six fixed tap targets, not a drag** — deliberately, to avoid a motor
learning curve. Concreteness fading: the first demonstration trials show each glyph beside a
depicted quantity, and the depiction is gone by a fixed trial index.

**Bonus that connects to a recorded decision.** The line-position response yields placement error,
which is what `M-PAE` needs. D-031 narrowed `M-PAE` to `enforced: false` in quantitative because
retiring `QUANT-NUMLINE-01`/`QUANT-EQUAL-01` left it with no supplier, and its code comment names "a
number-line placement type" as the re-enforcement trigger. This design would supply it. That is a
side benefit and must not become the reason to build it.

**What would show it failing.** (a) Children never exceed chance on comparison at any expression
length → the glyph system is beyond the age band and the design floors (most likely at K-1 and 2-3;
see A-S2-2). (b) Accuracy on untrained-combination items tracks accuracy on trained ones exactly →
children are doing lookup, not rule use, and there is no compositional ladder to climb.
(c) Additive and multiplicative items show no difficulty difference → the imported ordering does not
transfer, and §1.1(d) says the stated difficulties are then wrong. (d) The scrambled-system control
is not separated (§4.1).

### 3.3 Verbal — `VER-MORPHO-01` "Word Machines" *(primary)*

**The item.** A tiny invented morphology. A stem plus one or more affixes, each affix carrying a
meaning that composes the way natural morphology does — negation, plurality, size, agent/patient
role. Morphemes are 3-letter pronounceable pseudo-syllables in Latin script (`kib`, `tosh`, `zan`),
so no invented orthography and no audio (D-017). The child taps which of four pictures a written
pseudo-word describes, or which pseudo-word describes a shown picture.

**What is learnable.** The morpheme→meaning mapping, and the *combination* rules — affix order,
which affixes stack, what a doubled affix means.

**Divergence mechanism.** Single-affix items establish the mapping. Divergence is at multi-affix
items and, most sharply, at **minimal-pair items** where two options differ by one morpheme, so a
child holding an approximate whole-word association fails while a child holding the decomposition
succeeds. This is the verbal analogue of composition depth, and the ladder continues into affix
combinations never demonstrated.

**Novel by construction — and unusually strongly so.** This is the design that resists prior
knowledge *best* of the four, because the entire lexicon is invented. That matters most in verbal,
where the standing failure mode is that any "learning" measure collapses into crystallized
vocabulary. Suanda, Mugwanya & Namy (2014) is the age-feasibility evidence: 5–7-year-olds learned
word–referent mappings from ambiguous naming events within a session, with performance modulated by
contextual diversity — which is also a difficulty lever.

**The honest tension in this design.** Push the abstraction far enough to guarantee novelty and the
task stops being verbal and becomes figural rule induction. The resolution is to keep the *mappings
semantic* (negation, plurality, role — the things natural morphology encodes) and the *forms*
readable. That is a design stance, not a validated construct claim: whether `VER-MORPHO-01` loads on
verbal rather than fluid is A-S2-3 and would need a real correlational check. **This is the design I
am least confident about**, and it is why it is third on the shortlist.

**Age boundary.** Requires decoding three-letter pseudo-words. Grade-1 decoding accuracy is around
34% (brainlift 6.7), so at K-1 this would largely measure decoding. Recommend bands 2-3 and
up, and report K-1 separately or exclude — consistent with how `SPA-VIEW-01` and `SPA-SCENE-01`
already handle their developmental floor.

**Interface absorption.** Same tap-one-of-four as `VER-CLOZE-01` / `VER-RELPAIR-01`.

**What would show it failing.** (a) Minimal-pair accuracy never separates from whole-word accuracy →
children are not decomposing and there is no ladder. (b) λ correlates strongly with an independent
vocabulary measure → contaminated by crystallized ability after all. (c) Accuracy on
picture→pseudo-word items diverges from pseudo-word→picture items → the item is measuring a
production/recognition asymmetry, not the mapping. (d) Scrambled-system control not separated.

### 3.4 Spatial — `SPA-XFORM-01` "Transform Machine" *(primary; the biggest hole)*

**The item.** A machine applies a hidden spatial transformation to a small block figure. The child
sees the transformation demonstrated on *other* figures earlier in the block, and must now tap which
of five views is the result on a new figure. Depth grows: one transformation, then a chain of two,
then a chain whose order matters.

**Why it is framed as induction rather than rotation, and this is the load-bearing choice.** Spatial
skill is *trainable*: Uttal et al. (2013) report g = 0.47 across 206 studies, transferring to
untrained spatial tasks and stable across delays; and within-session mental-rotation practice
improvement is well enough documented to be treated as a confound in between-session designs
(Jost, 2021, *Mental Rotation: The Test Design, Sex Differences, and the Link to Physical
Activity*, dissertation, University of Regensburg — **T3, unrefereed dissertation, cited for the
methodological point only**). So a spatial block built as "rotate these, faster and better" is close
to *guaranteed* to produce λ > 0 for everyone — and that λ would be practice-and-automatization,
indistinguishable
from the retest artifact the field's own meta-analysis puts at 0.33 SD on a second administration
(Scharfen, Peters & Holling, 2018, *Intelligence*, 67, 44–66). A design that cannot fail to show a
climb is not measuring learning rate; it is measuring warm-up.

Framing it as **induce which transformation the machine applies** puts the learnable thing in the
rule rather than the motor/imagery speed. Two further decisions follow: score **accuracy only**, and
never let RT enter λ; and hold the *set* of candidate transformations fixed for the block so that
what accumulates is knowledge of the machine, not fluency at rotating.

**Divergence mechanism.** Identifying a single transformation from demonstrations is within reach for
most children. Divergence is at chains, where the intermediate figure must be held in working memory
— and fluid reasoning is itself heavily working-memory loaded (brainlift 5.5, r ≈ .80–.90), so
expect this design to load on spatial *and* WM span. That is a construct-purity cost, stated rather
than hidden.

**Difficulty levers.** Chain length; number of candidate transformations in play; whether the queried
face/feature is visible in the input; figure complexity (block count); whether the chain was
previously demonstrated; distractor distance (each distractor = a specific named error, e.g. correct
transformation applied to the wrong axis).

**Interface absorption.** Same tap-one-of-five as `SPA-ROLL-01` / `SPA-FOLDNET-01` / `SPA-SHADOW-01`,
all of which are already S1 spatial types with a deep bank.

**What would show it failing.** (a) λ is positive and similar for everyone including a
scrambled-transformation control → it is practice, not learning (this is the most likely failure of
this design and the control is not optional here). (b) λ correlates with figure complexity handled
rather than with chain depth → the block is measuring visual capacity. (c) Chain-length accuracy
tracks a WM span measure more tightly than it tracks trial index → the design is a span task wearing
a learning-rate costume.

### 3.5 Alternates, deliberately not recommended first

| type | area | idea | why not first |
|---|---|---|---|
| `FLU-SETSHIFT-01` | fluid | Harlow-style serial reversal: same stimuli, rule silently reverses every *n* trials; learning-set = faster recovery per reversal | Elegant and the closest thing to a pure learning-rate paradigm, but it **repeats stimuli**, which `learning-block.ts` forbids on purpose; and recovery-after-reversal is not a difficulty ladder, so it does not map onto this estimator without changing the estimator |
| `VER-XSITU-01` | verbal | cross-situational word learning proper: ambiguous multi-word/multi-object scenes, mapping emerges statistically | Strongest child evidence base (Suanda et al., 2014) but the difficulty lever (contextual diversity) is a property of the *sequence*, not of an item, so per-item difficulty is not well defined — fails §1.1(d) |
| `QUANT-FUNCFAM-01` | quantitative | induce a family of numeric functions, then compose them | Overlaps `QUANT-FUNC-01` heavily; and uses taught arithmetic, so λ partly measures schooling — the exact problem `QUANT-GLYPHNUM-01` avoids |
| `SPA-VIEW-01` (retain) | spatial | keep as the fallback S2 spatial type | Single-rule perspective task → step not climb (§1.3); dial response has its own motor curve. Adequate as a placeholder, not as the measurement |
| `FLU-SHJ-01` | fluid | Import the SHJ category structures wholesale: each trial classifies one of eight stimuli on three **separable** binary dimensions, with structure Type I→VI supplying the difficulty ladder directly | **The strongest difficulty grounding in this document** — a published, replicated *empirical* difficulty ordering (Shepard et al., 1961; Nosofsky et al., 1994) rather than a countable design lever, which is a real advantage under §1.1(d). Not first only because the stimulus space is tiny (8 stimuli per structure), so novelty across 30 trials must come from swapping structures rather than items, which risks re-introducing repeats. Worth costing properly if `FLU-OPCHAIN-01`'s difficulty levers prove hard to order |

---

## 4. Failure modes, and being adversarial about these proposals

### 4.1 The one test that gates everything: the scrambled-system control

Every design above rests on one claim: *accuracy rises because the child acquired the system.* There
is exactly one cheap way to test it, and the retest literature says it is the only design that
works — "you need either a genuine no-training control condition observed on the same schedule, or
non-identical forms, or both" (research shard category 6.7, on Scharfen et al., 2018).

**The control:** run the identical block with the system **re-drawn every trial**. Same interface,
same difficulty ladder, same item counts, same feedback, same session position — but nothing carries
forward. Any λ observed in that condition is the design's contamination floor: practice, warm-up,
interface, guessing, regression to the mean, and difficulty misspecification, summed.

**Acceptance rule I would propose: a type does not enter the battery until λ in the consistent
condition is reliably greater than λ in the scrambled condition, on the same bank and the same
targeting rule.** That is a stronger and much cheaper gate than any validity study, and it is the
difference between "this looks like a learning curve" and "this is a learning curve".

Note honestly what it does *not* establish: it shows the block measures learning **of that system**.
It says nothing about whether that predicts real learning, platform acceleration, or program
benefit. D-030 and E-095 already draw that line and this does not move it.

### 4.2 Practice and motor effects

Covered structurally: no drag or construction, interface absorbed in Stage 1, interface gate to
criterion, accuracy-only scoring, and the §4.1 control quantifies the residual. The spatial design
is the one at real risk (§3.4) and it is the one where the control is mandatory rather than
advisable.

### 4.3 Ceiling and floor

**Ceiling** is the failure that truncates the top of the λ distribution and it is a *pool* problem,
not a child problem: from §1.1(c), ≥6 scale points of headroom above `standing + 1` at ~0.5
granularity. Also relevant: the block's selection rule deliberately does **not** tie-break on age
band (`learning-block.ts`), so the pool must be deep above standing regardless of the child's band —
and existing banks were built to cover 1–20 broadly, not to be deep in a 6-point window above an
arbitrary point.

**Floor** is the failure that produces λ = 0 for the children the screen most wants to distinguish.
Two specific floors are already visible in the literature: Li et al. (2024) found 6–7-year-olds
mostly best-fit by a *random-response* model on an information-integration structure (0.70 of the
feedback group), so **multi-dimensional integration structures must not be used at the young bands**
— unidimensional and low-depth composition only. And `VER-MORPHO-01`'s decoding floor at K-1
(§3.3). Floors should be handled by reporting per band and excluding where the design floors, as the
catalog already does for `SPA-SCENE-01`/`SPA-VIEW-01`.

### 4.4 Regression to the mean at the handover

The block starts from the settled standing estimate. If standing was over-estimated by noise, the
child fails early block items and then appears to "improve" as the fit corrects — λ > 0 from pure
regression. E-095's sweep deliberately included a noisy handover, so the r ≈ 0.448 figure already
absorbs some of this; but the structural protection matters and it is already in the code:
`priorTheta0Sd` defaults wide (6.0) and its comment says why — "a tight `theta0` prior buys
`lambda` apparent precision it has not earned". **Design dependency: pass standing as
`priorTheta0Mean` and leave `priorTheta0Sd` wide.** A future change tightening it would manufacture
λ, and should be treated as a regression, not an optimisation.

### 4.5 The averaging artifact

Individual learning curves fit better as exponentials in all 40 unaveraged datasets tested;
arithmetic averaging over people who differ in rate manufactures a power-law shape (Heathcote, Brown
& Mewhort, 2000, *Psychonomic Bulletin & Review*, 7(2), 185–207; the general point since Estes,
1956, *Psychological Bulletin*, 53(2), 134–140). The project's fit is *linear*, which is neither, and
D-030 already records that as a named limit.

Two design consequences. First, keeping the child near p = 0.5 via re-targeting means the fit
observes a short arc of the true curve, where a linear approximation is least wrong — the adaptive
targeting is doing double duty. Second, and non-negotiable: **never fit a group curve and read an
individual off it.** The right consumer is `learningRateCohortRank` (ordinal, within a cohort
measured the same way), not a band from a population curve.

### 4.6 Strategy switching mid-block, and guessing

Both are real; mixture and HYBRID response-time models establish that mid-test strategy switching is
common enough to bias calibration (research shard category 2.5). The design turns this from an
untestable worry into an instrument: **each distractor encodes a specific incomplete version of the
system**, so every response is classifiable as consistent with rule R1, R2, …, or none. That yields a
per-trial strategy trace, which gives:

- a **falsification test**: in a real learner, errors should migrate from random → partially-correct
  rule → correct. If accuracy rises while the error distribution stays uniform over distractors, the
  rise is guessing or difficulty misspecification;
- an **alternative operationalisation** that does not inherit the difference-score reliability
  penalty at all. The research shard's own Seed A argues that the graduated-prompts family — a count
  of assistance required — may carry most of the incremental validity that survives in the dynamic-
  testing literature, precisely because it is an ordinal measurement rather than a difference between
  two error-laden measurements. A distractor-classified strategy trace is the same kind of quantity.
  **Speculative**, and out of scope tonight, but it is worth building the trace even if λ is the
  headline, because the trace is where the fallback lives.

On guessing specifically: the estimator uses `guessing = 0`, a known misspecification. Lucky early
successes inflate `theta0` and flatten `lambda` — the direction that destroys the measurement. Three
design responses: five or six options rather than four where the band allows; **uniform key
positions by construction**, verified against the bank (E-094 measured imbalances up to +33
percentage points, including +16 on `SPA-VIEW-01`); and distractors that are all *plausible*
system-failures, which raises the effective option count without raising the visual load.

### 4.7 The threat that no design can engineer away

Three results, together, are the strongest case *against* this entire enterprise, and the honest
position is to state them rather than route around them:

- **Learning rate may barely vary between people.** Across 1.3 million observations in 27 datasets,
  student learning rates were "astonishingly similar", with an interquartile range of about 1
  percentage point of accuracy per opportunity against about 20 points of variation in initial
  knowledge — roughly a one-opportunity difference in time to mastery between the faster and slower
  halves, against a ten-opportunity gap from starting point (Koedinger, Carvalho, Liu & McLaughlin,
  2023, *PNAS*, 120(13), e2221311120). Replicated on a larger operational dataset, though by a
  commercially interested team (Simpson, Norberg & Fancsali, 2024 — COI-flagged in the shard).
- **An individual rate parameter is hard to estimate reliably even with 160 trials.** Retest
  reliability of a model-estimated learning-rate parameter was "very poor" under per-person maximum
  likelihood and only reached fair-to-excellent with expectation-maximisation MAP using *empirical
  group-level priors* fitted across both sessions (Waltmann, Schlagenhauf & Deserno, 2022, *Behavior
  Research Methods*, 54(6), 2993–3014).
- **Fast learners are the ones who started higher.** The clearest demonstration of a stable,
  three-year-durable individual difference in learning frames it as a single construct, "learning
  efficiency", entangled with ability and memory rather than orthogonal to it (Zerr et al., 2018,
  *Psychological Science*, 29(9), 1436–1450).

**What this means for these designs.** It means λ will correlate with θ and **no item design can
prevent that** — a design claiming to have made λ orthogonal to standing has not been tested. It
means the useful question is never "what is this child's learning rate" but "does λ add anything
over θ", and the best-controlled figure in the adjacent literature is a median of about 5% unique
variance after static predictors (Dixon, Oxley, Gellert & Nash, 2023, *Reading and Writing*, 36(3),
673–698). And it means the Waltmann result points at a concrete future dependency: **an operational
λ for an individual would need hierarchical estimation with empirical priors from a real normative
sample**, which is exactly what E-095 records as not existing.

None of that is a reason not to build these types. It is the reason the readout must stay ordinal,
`indeterminate` must stay a first-class answer, and λ must stay out of the scored decision — all of
which D-030 already requires. What these designs can honestly promise is a block on which λ is
*identifiable* and *falsifiable*. Whether it is *useful* is a later, empirical question, and it
cannot be answered by better puzzles.

---

## 5. The one-area tension (D-030), addressed rather than avoided

D-030 fixes the block to a single area for every child, and the app already sets that area to
`fluid_reasoning`. Designing types for all four areas is still right, for three reasons that are not
"future flexibility" hand-waving:

1. **The policy area is a choice that has to be re-choosable.** It was chosen on pool depth and
   "leans least on taught content" (comment in `phase2.ts`). §2 shows fluid currently has *no*
   usable S2 type, so the premise of that choice is weaker than it looks. Re-examining it requires
   having candidates in more than one area.
2. **Insurance against a floor.** If the chosen area floors in a band — and §4.3 gives two concrete
   mechanisms by which it might — the whole learning-rate output is lost for that band. A second
   built area is the only remedy that does not require a redesign.
3. **The domain-generality question is unanswered in this project's own research.** The shard records
   it as a gap: "no evidence was located on whether learning rate measured in one domain predicts
   learning rate in another," with the nearest indirect evidence pointing toward domain-specificity
   (task-specific variance grows across learning trials, Ackerman, 1987; the best-fitting model in
   the classic preschool dynamic-assessment study maintained *separate* verbal and spatial domains,
   Day, Engelhardt, Maxwell & Bolig, 1997). Four built types are the instrument that could answer it.

**What it would take to justify a per-area rate.** The arithmetic is unforgiving and already in
hand. E-095: r ≈ 0.183 at 15 trials, ≈ 0.448 at 30. So four per-area rates at a usable length is
**120 trials**, and there is no shortcut — Willett (1989) and Rast & Hofer (2014) both identify
occasions as the lever the researcher controls, and growth-rate reliability as a function of true
slope heterogeneity, error variance, and wave count. Nothing about better items changes that.
A per-area λ is therefore a **research administration on a consenting subsample**, not an
operational feature, and it should be scoped as one.

**Is it worth wanting?** Two things follow whichever way that goes, and one of them should be
adopted now regardless. If λ is domain-general, one area suffices and the other three types are
insurance. If λ is domain-specific — which the indirect evidence mildly favours — then a
single-area λ *may never be labelled* "this child's learning rate", only "this child's learning rate
in fluid reasoning". **That labelling constraint costs nothing and should be adopted immediately,
because the current wording risks a domain-general claim the design cannot support.** The
domain-generality study itself is worth wanting mainly because it is the cheapest available test of
whether the construct exists at all — but it needs four built types first, which is an argument for
building them, not for lengthening the operational battery.

---

## 6. Should the `SPA-SCENE-01` → `SPA-VIEW-01` "learning pair" pattern generalise?

The owner flagged one deliberate pair: an S1 type that teaches perspective-taking, and an S2 type
that measures whether it transferred.

**Recommendation: generalise the *interface* pairing to all four areas; do not generalise the
*teaching* pairing without a fixed dose.**

The reason is specific and I do not think it has been noticed yet. Stage 1 stops on a **confident
stop, not a fixed length** (`areaEstimateStable`; D-023; brainlift Insight 2). So how many
`SPA-SCENE-01` items a child sees before the block — the *teaching dose* — varies per child, and
varies *systematically with their ability*, since a child whose estimate settles fast sees fewer.
A transfer measure whose dose is confounded with ability is not comparable across children, and
comparability is the only thing D-030 says λ is currently good for. The teaching pair, as
described, quietly reintroduces exactly the class of confound the separate block was built to
remove.

The interface pairing has no dose problem: interface competence is acquired once and does not
accumulate meaningfully with additional items, so any child who met the grammar in Stage 1 arrives
with it. That is the version worth generalising, and §3 does — every design names its S1
interface partner.

**Cost of each option.**

- *Interface pairing (recommended).* Costs a design constraint: the S2 type's response format is
  dictated by an existing S1 type rather than chosen freely. Cheap. Also buys verifier and demo
  reuse.
- *Teaching pairing (not recommended as-is).* To be comparable it needs a **fixed number of S1
  teaching items for every child**, which conflicts with the confident-stop design and lengthens
  Stage 1 for the children who least need it. If the owner wants it anyway, the minimum honest
  version is: fix the dose, log it per child, and report λ conditional on it. That is a real
  measurement design, not a configuration change.
- *Keep `SPA-SCENE-01` → `SPA-VIEW-01`.* Fine to keep, but **re-label the rationale** in the
  classification doc from "measures whether teaching transferred" to "shares an interaction grammar
  with a Stage 1 type", which is what it actually delivers. The transfer claim is not currently
  supported by the administration.

---

## 7. Shortlist — what I would build first

Build order is driven by one fact: the operational block runs in **fluid reasoning** today.

| # | type | area | why here |
|---|---|---|---|
| 1 | `FLU-OPCHAIN-01` | fluid | The only one that is *operationally* load-bearing right now. Fluid is the policy area and has no usable S2 type (§2). Everything else is coverage until this exists. **First check whether `FLU-CONCEPT-01` can be extended into this shape** — cheaper, and inherits a verifier. |
| 2 | `SPA-XFORM-01` | spatial | Biggest coverage hole (spatial lost every pure-S2 type), deepest existing S1 interface partners to borrow from, and it is the design whose failure mode is most instructive: if the scrambled control does *not* separate here, that result generalises to the others and should change the whole programme. |
| 3 | `QUANT-GLYPHNUM-01` | quantitative | Best-evidenced difficulty structure of the four, strongest novelty guarantee, and it would restore a `M-PAE` supplier (D-031). Held to third only because quantitative is not the policy area; **promote to #1 if the policy area moves to quantitative**, which §5 argues is worth reconsidering. |
| 4 | `VER-MORPHO-01` | verbal | Best prior-knowledge resistance but the weakest construct claim — whether it loads verbal rather than fluid is untested (A-S2-3). Build last, when the pattern is proven and the construct question can be checked against three existing types. |

**If only one is built:** `FLU-OPCHAIN-01`, plus the shared control-block harness from §9. One type
with a passing scrambled-system control is worth more than four types without one.

---

## 8. What each design needs from calibration and metrics — then stops

Calibration and metrics are the owner's. Stated as requirements, not choices:

1. **A difficulty grid with headroom.** ≥6 scale points above `standing + 1` at ~0.5 granularity, for
   every standing a real child arrives with (§1.1(c)). This is a bank-shape requirement that
   precedes any calibration.
2. **Difficulty monotone in a countable lever, and checked.** Each design names its levers; what is
   needed is the mapping from lever tuple → `[1,20]` value, plus an automated monotonicity assertion.
   Until then, `validated: false` and `syntheticOnly: true` stand.
3. **A decision on graded scoring.** Partial credit will stabilise λ but will **not** narrow the
   reported `lambdaSe` under the current dichotomous information calculation (§1.1(e)), so it cannot
   move a readout off `indeterminate` by itself. Whether to move to a graded response model is a
   measurement decision. Designs are built to supply either.
4. **A decision on the guessing floor.** `guessing = 0` biases `theta0` up and `lambda` flat at the
   low end. The designs reduce the exposure (more options, plausible distractors, balanced keys) but
   cannot remove it.
5. **Metric declarations.** Each type will declare `M-ACC`, `M-LEARNRATE`, `M-ERRTYPE`, `M-RTFIRST`,
   `M-ENGAGE`, `M-RAPIDGUESS`, plus the distractor-classified strategy trace of §4.6 (which needs
   either an existing metric ID or a new one — owner's call). `QUANT-GLYPHNUM-01` would additionally
   supply `M-PAE`. No originality-style index is proposed anywhere, per E-093.
6. **A reference distribution, or continued refusal.** No reference for λ exists (E-095). Until one
   does, `learningRateReadout` returns `indeterminate` and `learningRateCohortRank` is the supported
   question. Nothing in these designs changes that, and none of them should be built on the
   expectation that it will.

---

## 9. The overnight-loop build plan

**Precondition (human, blocking):** the owner ratifies the design philosophy (§1) and confirms the
shortlist and the policy area. Without that, step 1 is guessing.

**Shared, built once, first — and the most valuable single artifact here.** `S0: the control-block
harness.` A synthetic driver that runs a candidate bank through `nextTargetTheta` +
`selectNextNovelItem` + `estimateLearningCurve` under two conditions — system consistent across
trials, and system re-drawn every trial — for a simulated cohort, and reports the λ distributions.
*Produces:* a script under `research/` or `scripts/` plus a results table. *Acceptance:* reproduces
E-095's published figures at 30 trials on an existing bank (r ≈ 0.448, attenuation ≈ 0.98, mean
SE ≈ 0.047) before it is trusted on a new one. *Parallelisable with:* step 1 of type #1.

Then, **per type, strictly sequential** (S1 → S5), and the four types are **fully parallel with each
other** once S0 exists:

| step | produces | acceptance evidence |
|---|---|---|
| **S1 spec** | one row in `catalog/master_types.jsonl` + `specs/types_<area>.jsonl` (`interaction`, `self_teach`, `adaptive.difficulty_levers`, `measurements`, `age_bands`, `construct_irrelevant_risks`, `learning_science`) | Row is schema-valid; every difficulty lever is countable from a generator parameter; the named S1 interface partner exists and is served; D-017 satisfied (text-only, no audio) |
| **S2 generator** | `generators/<CODE>.mjs` → `banks/<CODE>.jsonl` | (a) items parse against `bankItemSchema` — note E-074 records 0/63 currently passing, so this is a *raise* on the status quo and may need the contract reconciled first; (b) key positions uniform within a stated tolerance (E-094); (c) leak scan clean — the key must not be derivable from `content` (E-075/E-076), and for these designs the *system* must not be shippable to the client; (d) difficulty monotone in the declared levers, asserted by a checker; (e) ≥6 points of headroom coverage at 0.5 granularity (§1.1(c)); (f) every distractor tagged with the incomplete rule it encodes (§4.6) |
| **S3 checker** | `generators/check-<CODE>.mjs` | Independent re-derivation of the key agrees on 100% of the bank |
| **S4 demo** | `demos/<CODE>.html` (+ published copy) | Embedded-safe: no standalone-timer fallback (E-079), no telemetry sidebar (E-082), `ready` handshake honoured (E-083); single tap, fixed option positions; informational-only feedback (no verdict/score/streak/praise); interface gate to *k* consecutive correct; fixed-cadence observation trials if used |
| **S5 verifier** | app-tier verifier + plpgsql twin | Cross-tier differential agrees on every bank item × response (the pattern in `apps/web/scripts/verifier-differential.ts` and `supabase/tests/*exam_verify*`) |

Then, **per type, after S5:**

| step | produces | acceptance evidence |
|---|---|---|
| **S6 scrambled-system control** | a results table from S0 on the new bank | **λ(consistent) reliably > λ(scrambled), on the same bank and targeting rule.** This is the gate: a type that fails it does not enter the battery, whatever else passes (§4.1) |
| **S7 recovery sweep** | recovery table on the new bank's actual difficulty grid | Injected-λ recovery, attenuation and mean SE at 30 trials within a stated band of E-095's figures; explicit check that the pool never saturated for the fastest simulated learner |

Finally, **once, after all built types pass S6/S7:**

| step | produces | acceptance evidence |
|---|---|---|
| **S8 governance** | DECISION_LOG entry (new types + any classification change), ASSUMPTIONS_AND_EVIDENCE entries for S6/S7 results and A-S2-1…6, TRACEABILITY_MATRIX and FEATURE_TO_REQUIREMENT_MAP updates, `STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md` correction (§2 and §6) | Every claim in the entries traces to an S6/S7 artifact or is labelled an open assumption |

**What can be parallelised:** the four type tracks (S1→S5), once S0 exists. Within a track, nothing —
each step consumes the previous step's artifact.

**What cannot be parallelised or reordered:** S0 must precede every S6, because S6 is S0 pointed at a
new bank. S6 must precede S7, because a type that fails the control does not need a recovery sweep —
running them the other way round spends the expensive step on types that are about to be rejected.
S8 runs last and once, so the governance record describes what was actually measured rather than what
was planned.

**Named risks in this plan.** S2(a) may be blocked by E-074's contract mismatch, which is a
pre-existing repo-wide condition and could turn into its own task. S6's "reliably greater" needs a
margin the owner sets. And the plan produces **no** difficulty calibration — that is deliberate and
out of scope; banks ship `validated: false`.

---

## 10. Open questions for the owner

Clearly separated from the recommendations above. The first three are blocking.

1. **Which area is the block's fixed area, and is `fluid_reasoning` still the right choice?** The app
   sets it; D-030 does not name it. §2 shows fluid currently has no usable S2 type, which weakens the
   stated rationale. This determines build order (§7).
2. **Extend `FLU-CONCEPT-01`, or build `FLU-OPCHAIN-01` new?** Extension is cheaper and inherits a
   verifier; a new type is cleaner and does not disturb a type already classified DUAL. I lean
   extension-if-feasible, but the feasibility check is a real task, not a formality.
3. **Is the scrambled-system control accepted as a *gate* rather than a nice-to-have?** Everything in
   §9 is arranged around it. If a type may enter the battery without passing it, the plan changes
   shape and the honesty claim weakens considerably.
4. **Does the teaching-pair rationale get re-labelled?** §6 argues the variable Stage 1 dose makes a
   transfer claim non-comparable. Either fix the dose or re-label the rationale.
5. **Graded response model: yes or no, and when?** §1.1(e) — partial credit cannot narrow
   `lambdaSe` without it, so this decides whether the block can ever return anything but
   `indeterminate` at 30 trials.
6. **Is a per-area λ wanted enough to fund a 120-trial research administration on a subsample?**
   (§5.) If not, the four types are coverage and insurance, and the labelling constraint in §5
   should be adopted now.
7. **Where does the distractor-classified strategy trace live** — an existing metric ID, or a new
   one? §4.6 argues it is worth building even if λ is the headline, because it is the fallback
   operationalisation.

**Open assumptions opened by this document** (candidates for
`docs/research/ASSUMPTIONS_AND_EVIDENCE.md` at S8):

- **A-S2-1** — that a Stage 2 trial of any of these designs is answerable in ≈20 s or less by the
  target bands, so 30 trials fit the session. The §2 table rests on this and it is currently a
  reasoned inference from `interaction` text, not a measurement.
- **A-S2-2** — that the adult-derived composition-difficulty orderings (sign-value over place-value;
  additive over multiplicative) transfer to children 5–14. Both source studies are adult-only.
- **A-S2-3** — that `VER-MORPHO-01` loads on verbal rather than fluid reasoning.
- **A-S2-4** — that interface competence acquired during Stage 1 transfers to the block well enough
  that residual interface learning does not appear in λ. §4.1's control is what would test it.
- **A-S2-5** — that composition depth produces a graded climb rather than a step in children, i.e.
  that §1.3's fix works. The one directional source located (Fenner, 1970) is an unrefereed thesis
  and points the *wrong* way.
- **A-S2-6** — that λ measured on one of these types carries any information beyond θ. The adjacent
  literature's best-controlled figure is a median ≈5% unique variance (Dixon et al., 2023), and
  nothing in a question design can raise it.

---

## Appendix — source register

Tier convention follows the research shards: `T1` meta-analysis or systematic review, `T2`
peer-reviewed primary study or authoritative book, `T3` unrefereed or vendor source.

| source | tier | used for |
|---|---|---|
| Shepard, Hovland & Jenkins (1961), *Psychological Monographs*, 75(13, Whole No. 517) | T2 | Six category structures; original difficulty ordering |
| Nosofsky, Gluck, Palmeri, McKinley & Glauthier (1994), *Memory & Cognition*, 22(3), 352–369, doi:10.3758/BF03200862 | T2 | Replication of the ordering with block-by-block learning curves |
| Nosofsky & Palmeri (1996), *Psychonomic Bulletin & Review*, 3(2), 222–226, doi:10.3758/BF03212422 | T2 | Boundary condition: ordering changes with integral dimensions → use separable dimensions |
| Li, Huang, Seger & Liu (2024), *British Journal of Developmental Psychology*, 42(4), 495–510, doi:10.1111/bjdp.12509 | T2 | Children 6–7 gained nothing from feedback over observation on rule-based categories; mostly random-responding on information-integration |
| van Duijvenvoorde, Zanolie, Rombouts, Raijmakers & Crone (2008), *Journal of Neuroscience*, 28(38), 9495–9503, doi:10.1523/JNEUROSCI.1485-08.2008 | T2 | Children learn less from negative than positive feedback; gap larger than in adults |
| Weiers, Gilmore & Inglis (2025), *Journal of Numerical Cognition*, 11, e13401, doi:10.5964/jnc.13401 | T2 | Artificial base-3 notation learnable and extensible to untrained expressions; sign-value advantage. **Adults only** |
| Holt & Barner (2025), *Cognitive Science*, 49(6), e70071, doi:10.1111/cogs.70071 | T2 | Additive/conjunctive composition easier than multiplicative in artificial number languages. **Adults only** |
| Suanda, Mugwanya & Namy (2014), *Journal of Experimental Child Psychology*, 126, 395–411, doi:10.1016/j.jecp.2014.06.003 | T2 | 5–7-year-olds learn word–referent mappings cross-situationally within a session; contextual diversity as a lever |
| Vlach & DeBrock (2019), *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 45, 700–711, doi:10.1037/xlm0000611 | T2 | Post-delay retention of cross-situational learning is fragile in young children |
| Uttal, Meadow, Tipton, Hand, Alden, Warren & Newcombe (2013), *Psychological Bulletin*, 139(2), 352–402, doi:10.1037/a0028446 | T1 | Spatial skills trainable, g = 0.47, transfers and persists — cited as a *practice-effect warning* |
| Scharfen, Peters & Holling (2018), *Intelligence*, 67, 44–66 | T1 | Retest gain ≈0.33 SD first-to-second, decelerating — the contamination floor under any within-person climb |
| Koedinger, Carvalho, Liu & McLaughlin (2023), *PNAS*, 120(13), e2221311120 | T2 | Near-constant learning rate across 1.3M observations; IQR ≈1pt/opportunity vs ≈20pts in initial knowledge |
| Waltmann, Schlagenhauf & Deserno (2022), *Behavior Research Methods*, 54(6), 2993–3014 | T2 | Individual learning-rate parameter reliability requires hierarchical empirical priors |
| Zerr et al. (2018), *Psychological Science*, 29(9), 1436–1450 | T2 | Stable "learning efficiency" is entangled with ability, not orthogonal to it |
| Dixon, Oxley, Gellert & Nash (2023), *Reading and Writing*, 36(3), 673–698 | T1 | Median ≈5% unique variance for dynamic assessment after static predictors |
| Heathcote, Brown & Mewhort (2000), *Psychonomic Bulletin & Review*, 7(2), 185–207 | T2 | Exponential beats power in all 40 unaveraged datasets; averaging manufactures power-law shape |
| Estes (1956), *Psychological Bulletin*, 53(2), 134–140 | T2 | Group mean curves do not determine individual curve form |
| Willett (1989); Rast & Hofer (2014) | T2 | Reliability of a growth estimate as a function of slope heterogeneity, error variance, and wave count |
| Ackerman (1987), *Psychological Bulletin*, 102(1), 3–27 | T2 | Task-specific variance grows across learning trials; small ability–gain correlations |
| Day, Engelhardt, Maxwell & Bolig (1997), *Journal of Educational Psychology*, 89(2), 358–368 | T2 | Best-fitting dynamic-assessment model maintained separate verbal and spatial domains |
| Sweller, van Merriënboer & Paas (2019), *Educational Psychology Review*, 31(2), 261–292 | T2 | Intrinsic / extraneous / germane load |
| Mayer (2021), *Multimedia Learning*, 3rd ed. | T2 | Pre-training, segmenting, signalling, contiguity |
| Kluger & DeNisi (1996), *Psychological Bulletin*, 119(2), 254–284; Hattie & Timperley (2007), *Review of Educational Research*, 77(1), 81–112 | T1/T2 | Feedback is double-edged; worst when self-directed |
| Roediger & Karpicke (2006), *Psychological Science*, 17(3), 249–255 | T2 | Retrieval before reveal |
| Rohrer & Taylor (2007), *Instructional Science*, 35, 481–498 | T2 | Interleaving |
| Bjork & Bjork (2011); Soderstrom & Bjork (2015) | T2 | Desirable difficulties raise later learning, depress current performance |
| Sweller & Cooper (1985); Renkl & Atkinson (2003); Kalyuga et al. (2003) | T2 | Worked examples, fading, expertise reversal |
| Ericsson, Krampe & Tesch-Römer (1993), *Psychological Review*, 100(3), 363–406 | T2 | Practice at the edge of ability with feedback |
| Fyfe, McNeil, Son & Goldstone (2014), *Educational Psychology Review*, 26, 9–25 | T2 | Concreteness fading |
| Bloom (1968) | T2 | Mastery gating (applied to the interface only) |
| Deci, Koestner & Ryan (1999) | T1 | Performance-contingent rewards crowd out intrinsic motivation, worse in children |
| Lionello-DeNolf, McIlvane, Canovas, de Souza & Barros (2008), *The Psychological Record*, 58(1), 15–36, doi:10.1007/bf03395600 | T2 | Reversal learning-set demonstrated in preschoolers (6 children per experiment, single-subject design) |
| Fenner (1977), *Discrimination Learning Sets in Children*, PhD dissertation, University of North Dakota | **T3** | Learning set may form abruptly rather than gradually — directional caution only; N = 54, all female |
| Jost (2021), *Mental Rotation: The Test Design, Sex Differences, and the Link to Physical Activity*, dissertation, University of Regensburg | **T3** | Within-session mental-rotation practice effects large enough to confound between-session designs — methodological point only |
| Simpson, Norberg & Fancsali (2024), EDM 2024 | **T3, COI** | Replication of near-constant learning rate by a commercially interested team |

Internal sources: `packages/exam-scoring/src/learning-curve.ts`,
`learning-rate-readout.ts`, `packages/exam-engine/src/learning-block.ts`,
`apps/web/src/lib/exam/phase2.ts`, `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md` §5.5,
`docs/governance/DECISION_LOG.md` D-030/D-031, `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`
E-073/E-074/E-075/E-076/E-079/E-082/E-083/E-093/E-094/E-095,
`research/shards/category-2-disengagement-effort.md`,
`research/shards/category-6-learning-rate-measurement.md`,
`research/test-structure-research/STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md`,
`brainlifting/test-structure-brainlift/brainlift-test-structure.md`,
`research/exam-question-types/catalog/master_types.jsonl`.
