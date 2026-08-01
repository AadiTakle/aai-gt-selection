# `QUANT-GLYPHNUM-01` — Gate A, and what it says about the bank

**Status:** Measurement report for U5 of the `QUANT-GLYPHNUM-01` track
(`STAGE2_QUESTION_DESIGN.md` §9.2). **A1 FAILS at a realistic five-option guessing floor**, the
§9.4 stop rule applies, and this document reports that rather than working around it. Nothing is
wired, nothing is gated, and no type is recorded as gate-passing.

**What was built:** U2 (spec row), U3 (`generators/QUANT-GLYPHNUM-01.mjs`, both persistence modes),
U4 (`generators/check-QUANT-GLYPHNUM-01.mjs`), U5 (this report). **Not built, and out of scope:**
U6 renderer, U7 verifier, and any wiring into the live learning block.

**Requirements served:** R6 (measure growth without a gifted-student ceiling), R5, R7 (auditable and
falsifiable — every figure below is a command), R8, R10 (state the boundaries), H1, H6, H10.

**Evidence used:** E-095 (the recovery ladder every table is measured against), E-200 (the
guessing-floor defect and the loop attribution), E-094 (key-position imbalance), E-074 (bank
conformance), E-075/E-076 (content-computable items and response-model leaks). **No new E or D ID is
claimed.** §9.3 puts the governance unit (U9) last and once, and minting evidence IDs from a
measurement the owner has not yet read would pre-empt it.

**Open assumption carried, not resolved:** A-S2-2 — the sign-value-over-place-value and
additive-over-multiplicative difficulty orderings this design imports are from **adults only**
(Weiers, Gilmore & Inglis, 2025; Holt & Barner, 2025). That they hold in children is unverified and
is this design's largest evidential gap.

**Re-run everything here with:**

```
node research/exam-question-types/generators/QUANT-GLYPHNUM-01.mjs        # both banks
node research/exam-question-types/generators/check-QUANT-GLYPHNUM-01.mjs  # U4
node research/exam-question-types/gate-a/run-QUANT-GLYPHNUM-01-gate-a.mjs # U5, ~3.5 minutes
```

The last of those contains no measurement logic: it calls `pnpm exam:block-harness` — the shared U0
harness, unmodified — with existing flags and aggregates. §4.1.1 requires both arms to be measured by
the same driver, so a per-type driver would confound the contrast with the driver. Its raw output is
`research/exam-question-types/gate-a/QUANT-GLYPHNUM-01-gate-a.md`.

---

## 1. The answer

**A1 fails, and the failure is not the bank's.**

At a responder guessing floor of 0.2 — a real five-option item — a cohort that learned **nothing at
all** fits λ̄ = **0.0094 ± 0.0008** over 3,200 simulated children, which is **11.0 Monte-Carlo SEs
from zero**. That is an unambiguous A1 failure and the §9.4 stop rule applies: this track stops at
U5, and no renderer is built for it.

What makes the failure interpretable is the paired comparison the harness runs at the same seeds
against an **idealised 0.5-point grid with no bank involved at all**:

| null-cohort λ̄, 30 trials, floor 0.2 | ideal grid (no bank) | `QUANT-GLYPHNUM-01` | `FLU-OPCHAIN-01` |
| --- | --- | --- | --- |
| mean of 8 seeds | 0.0092 | **0.0093** | 0.0101 |
| paired excess over the grid | — | **+0.0001 ± 0.0004 (t = 0.35)** | +0.0009 ± 0.0005 (t = 1.78) |

**The bank contributes nothing measurable.** Its null-cohort mean is statistically indistinguishable
from a bank-free lower bound, so the manufactured λ is the estimator's, not the ladder's — E-200,
reproduced. A1 exists to catch trial-index-correlated difficulty misspecification (§1.1(d)); on this
bank there is none to find, and the residue is a measurement decision that no item design can reach.

The same run at a **zero** floor — the harness default, which is the configuration in which the
estimator is not misspecified — gives λ̄ = **0.0027 ± 0.0006** and A1 passes on 7 of 8 seeds. Both
figures are reported because reporting only the second would be choosing the configuration that
looks good, and reporting only the first would leave the reader unable to tell an estimator defect
from a bank defect.

**No tuning was attempted.** The task's instruction and §9.4's stop rule are the same instruction:
a bank that manufactures λ from a static child cannot be fixed downstream. Nothing about the bank
was changed after A1 was measured.

---

## 2. Gate A, all four checks, both arms

8 seeds × 400 children per cell. Harness defaults otherwise: 30 trials, λ ~ N(0.06, 0.03²),
θ₀ ~ N(10.5, 3²), handover-noise SD 1.5, slope 1.0, target offset +1, `DEFAULT_GUESSING = 0.2` in
both the readout fit and `nextTargetTheta`.

### At a five-option responder floor (0.2) — the acceptance configuration

| check | verdict | observed |
| --- | --- | --- |
| **A1** static-child null | **FAIL** | fitted λ̄ = 0.0094 ± 0.0008, **11.0 SEs from zero**; 1/8 seeds pass on their own Monte-Carlo error |
| **A2** false-positive `above` | **PASS** | 12.9% of static children read `above`, against a nominal band rate of 30.9%; 8/8 seeds pass |
| **A3** no saturation | **PASS** | fastest simulated learner (λ = 0.15), 100 children: **0** pinned at the pool maximum with the bank short of what was asked for; 14 pinned by the 20-point scale ceiling, which no bank can fix; **0** blocks exhausted; 8/8 seeds pass |
| **A4** recovery sanity | **FAIL** | r = 0.336 against E-095's 0.448 (tolerance ±0.1, miss 0.112); mean posterior SE 0.063 against 0.047 (tolerance ±0.015, miss 0.016) |

Fitted-λ SD on this bank: **0.0660**. That is the figure U1's power script must use in place of the
design document's 0.06 estimate (§4.1.3); it moves the specified n per arm by a few percent, not by
a tier.

**The two arms are identical on every cell.** That is expected and is not a defect: the simulator has
no hidden system for `systemPersistence` to persist or scramble, and the two banks are equated
item-for-item on difficulty, which is the only item property a simulated child responds to. The same
zero contrast on `FLU-OPCHAIN-01` was traced to the selection rule's exact-tie behaviour by
`pnpm exam:arm-equivalence`. **Only children can make the two arms differ, which is Gate B.**

### At a zero responder floor — the harness default, for attribution only

| check | verdict | observed |
| --- | --- | --- |
| **A1** | **PASS on 7/8 seeds** | fitted λ̄ = 0.0027 ± 0.0006 |
| **A2** | PASS | 3.4% read `above` |
| **A3** | PASS | 0 bank-limited, 9 scale-limited, 0 exhausted |
| **A4** | FAIL, narrowly | r = 0.502 against E-095's 0.448 — **above** the published figure and inside tolerance; mean SE 0.063 against 0.047, missing the ±0.015 band by 0.001 |

**Read A4 with its own tolerance in mind.** The harness documents the ±0.1 / ±0.015 band as
deliberately wide because the sweep behind E-095 is not in the repository and neither its θ₀
distribution nor its handover-noise SD was recorded, so the comparison is a re-implementation from a
published description rather than a re-run. At a zero floor this bank *exceeds* the published
recovery and misses only the SE band, by 0.001. At the realistic floor the gap is the five-option
floor itself: the ideal grid carries r = 0.339 at the same settings, so no bank reaches 0.448 at 30
trials and A4 as written is unreachable for any bank on this estimator.

---

## 3. Item density, and one previously untested conjecture answered

§5 of `STAGE2_BANK_RECOVERY_MEASUREMENT.md` observed that `FLU-OPCHAIN-01` tracks the ideal grid to
about 45 trials and then falls behind it, conjectured pool depth per rung as the cause — the grid
carries 12 items per 0.5-point rung and that bank carries 6 — and recorded the conjecture as
untested. `QUANT-GLYPHNUM-01` is built at **12 per rung, 468 items per arm**, which makes the
conjecture a measurement.

| recovery r, mean of 8 seeds | ideal grid | `QUANT-GLYPHNUM-01` (12/rung) | `FLU-OPCHAIN-01` (6/rung) |
| --- | --- | --- | --- |
| 30 trials | 0.339 | 0.336 | 0.341 |
| 45 trials | 0.548 | **0.552** | 0.523 |
| 60 trials | 0.712 | **0.706** | 0.659 |

| paired difference against the grid | 30 | 45 | 60 |
| --- | --- | --- | --- |
| `QUANT-GLYPHNUM-01` | −0.003 (t = −0.4) | **+0.004 (t = 1.0)** | **−0.006 (t = −1.8)** |
| `FLU-OPCHAIN-01` | +0.001 (t = 0.1) | −0.024 (t = −4.5) | −0.052 (t = −6.9) |

**The conjecture is confirmed.** At 45 and 60 trials the 12-per-rung bank is on the bank-free bound
while the 6-per-rung bank is 0.024 and 0.052 below it at t = −4.5 and t = −6.9. The remedy for the
longer-block shortfall is item density, and it costs only generation time.

**This changes nothing at 30 trials**, where all three pools agree and the binding constraint is the
estimator. It matters only if the owner ever authorises a 45–60 trial block — which is the first of
the three graded responses §4.1.4 permits under Verdict 2, so it is not a hypothetical.

---

## 4. The answer key is not derivable from `content`

The first Stage 2 type shipped with the key recoverable on 11 of 234 items by brute-forcing every
symbol-to-meaning mapping. That invariant is a build-time constraint here, and it is measured two
ways rather than one, because "the key is not *determined*" is a weaker property than "the key is
not *predictable*".

A mapping is a glyph→role bijection over five glyphs, so the attacker's hypothesis space is 5! = 120,
and the attacker is assumed to know the base and the composition rule — E-075/E-076 judge
derivability from the data, not from who knows the method. For each mapping the attacker computes
value(expression) / value(anchor) and keeps the options whose tick ratio matches.

| difficulty slice | n | mean surviving options | uniform over survivors | most-backed | least-backed |
| --- | --- | --- | --- | --- | --- |
| 1–5 | 100 | 3.79 | 28.0% | 17.3% | 17.8% |
| 5–10 | 122 | 4.17 | 25.4% | 16.0% | 13.0% |
| 10–15 | 119 | 3.88 | 27.5% | 17.4% | 17.1% |
| **15–20** | 127 | **3.74** | **28.6%** | 18.5% | 21.9% |
| whole bank | 468 | 3.90 | **27.4%** | 17.4% | 17.7% |

**Determinacy: 0 of 468 items on either arm** have a single surviving option, against the reference
type's 11 of 234 before its fix. **Graded, in the worst difficulty slice: 28.6% against a 20.0%
five-option chance floor**, and 27.4% over the bank.

For scale, the same methodology applied to `FLU-OPCHAIN-01` as it stands on `dev` — which also has
0 single-survivor items — gives a best attacker of **28.2% over its bank and 34.0% in its hardest
slice**. So the residual here is smaller, and in the slice that matters most it is materially
smaller, but **it is a residual and not zero**: a browser script that enumerates 120 mappings beats
a blind guess by about 7 percentage points at the top of the scale. Closing it further needs either
more options or a larger role vocabulary, both of which have their own costs, and neither is a
change worth making before Gate B says the type is worth having.

Three surface heuristics are closed separately, because none of them needs the mapping, and the
shortcut probe in §5 measures each rather than asserting it: key rank is allocated round-robin
*within each expression length* (not merely across the bank, which would balance the margin and
leave "a longer expression sits further right" intact); the anchor value is itself an admissible
wrong answer, so the end of the line is not a free elimination; and the line's numeric maximum is
never served, because publishing it would give the attacker value(anchor) = max and pin part of the
mapping for nothing.

---

## 5. Prior arithmetic knowledge — the claim, and what a numerate child could actually shortcut

§3.2 calls this type's novelty guarantee its strength. That is a construct-validity claim, so it is
measured. Each row is a solver that has **not** induced the notation, scored on the whole bank
against a 20.0% floor.

| solver | accuracy |
| --- | --- |
| **additive only — has the glyph values and the sign-value layer, not the multiplicative binding** | **57.1%** |
| knows the base and the rule, not the glyph assignment (120-mapping brute force, per-item best strategy) | 28.9% |
| "the first part of the expression is the answer" | 21.4% |
| always tap the middle mark | 19.9% |
| always tap the far end of the line | 19.7% |
| biggest glyph only | 19.7% |
| reads the notation as place-value (the other published regime) | 17.9% |
| counts the glyphs — "longer means bigger" | **11.3%** |

**The novelty guarantee holds, with one honest qualification.** Every strategy that imports school
arithmetic without inducing the notation sits at or below chance, and the length heuristic sits
*well* below it: a child who reasons "more glyphs, bigger number" scores 11.3%, worse than guessing,
because that reading is one of the named distractors and therefore an attractive wrong mark rather
than an absent one. The strongest non-inducing solver is not a child at all — it is the 120-mapping
brute force, and it caps at 28.9%.

**The 57.1% row is the design working, not a leak.** It is what a child holding half the system can
already answer, and the number that matters is how it falls:

| additive-only solver, by difficulty | 1–5 | 5–10 | 10–15 | 15–20 |
| --- | --- | --- | --- | --- |
| accuracy | 100.0% | 94.3% | **43.7%** | **0.0%** |

That is the divergence mechanism as a curve. A child with the sign-value layer ceilings around
difficulty 10; everything above it requires the multiplicative binding. This is §1.3's graded ladder
rather than a single-insight step, and it is what gives the adaptive target somewhere to go after
the first insight.

### What a numerate 8-year-old could still shortcut, stated plainly

Four residues, none of them removed by the design:

1. **The base ladder.** The three scale roles are worth 1, 4 and 16. A child who notices that each is
   four times the last can predict the third value from the first two instead of learning it. This
   shortens the vocabulary half of the induction and not the binding half, and the 28.9% brute-force
   bound is its ceiling: a solver that knows the base and the rule and lacks only the assignment
   still cannot get far.
2. **Place-value transfer, in the wrong direction.** A child who knows decimal place value has a
   ready-made hypothesis for what a string of glyphs means, and it is the wrong one here — the
   place-value solver scores 17.9%, below chance. So decimal experience is a mild *handicap* on this
   notation at first contact, which is the opposite of the usual confound and should be said out
   loud, because a child penalised for having the wrong prior is as much a validity problem as one
   rewarded for having the right one.
3. **The number line itself, and this is the largest residue.** Placing a known quantity at a
   position is a *taught* skill, on the curriculum from about grade 2. A child who has never met a
   number line pays a cost that has nothing to do with the notation. The interface gate (U6) is the
   mitigation and it is not built; until it is, this is the part of the response format most likely
   to import schooling, and results should be reported per band.
4. **The additive-before-multiplicative ordering may partly reproduce the order the two operations
   are taught in.** The imported ordering is from adults (A-S2-2). In children, "add" precedes
   "times" in the curriculum by roughly two years, so some of the difficulty difference this design
   prices as compositional load could be schooling. Nothing here separates the two, and §4.1.2's
   falsification test (c) — additive and multiplicative items showing no difficulty difference — is
   the check that would catch the ordering being wrong, not the check that would catch it being
   right for the wrong reason.

---

## 6. `M-PAE` — supplied, not declared

D-031 narrowed `M-PAE` to `enforced: false` in quantitative because the question-type review retired
`QUANT-NUMLINE-01`, the only number-line placement type ever wired, and
`packages/exam-engine/src/config.ts` names "a placement type wired again" as the re-enforcement
trigger. `QUANT-MIX-01`'s verifier does emit an `M-PAE` key today, but it is a mixture-concentration
error, not the "continuous number-line placement error" the metric registry's own rationale
describes — so the metric id has an emitter while the construct it names has no supplier.

Every item here carries `scoring.rule = 'placement_tolerance'` with `answer.targetRatio` and
`answer.tolerance`. That is the contract the **shipped generic verifiers already implement in both
tiers** — `verifyPlacementTolerance` in `apps/web/src/lib/exam/verifiers/generic.ts` and
`app.exam_verify_placement_tolerance` in `supabase/migrations/20260725170000_exam_verify_plpgsql.sql`
— so `pae = |placedRatio − targetRatio|` is emitted as `M-PAE` with no new verifier code.

Four properties, checked rather than asserted, in
`apps/web/src/lib/exam/stage2-glyphnum-mpae.test.ts` (which runs the real bank through the real
dispatcher) and again independently in the U4 checker:

- the shipped `resolveVerifier` routes **every** item to the generic placement verifier;
- `M-PAE` is present on every verdict, and `pae <= tolerance` selects **exactly** the keyed tick on
  every item × every option — the generator sets the tolerance below half the smallest gap between
  neighbouring ticks;
- the emitted values are inside the `[0, 0.5]` range `policy.ts` declares, with **263 distinct
  values** across 1,872 wrong-option placements, so "continuous" is not a figure of speech; a
  30-trial block yields 30 placements against the registry's `minSamples` of 10;
- **the value is graded rather than a relabelled "which wrong tick"**, which is the property that
  makes it a partial/approximate-error signal at all. Every wrong mark is the value of a named
  incomplete reading, so the distance between the tap and the key is the *size* of the child's
  decoding error:

| failure class (nearest to mastery first) | mean `M-PAE` |
| --- | --- |
| over-applied the binding where nothing was written | 0.104 |
| bound a phantom digit to a bare scale | 0.118 |
| added across the binding — has the additive layer, not the multiplicative one | 0.168 |
| dropped a glyph | 0.189 |
| read one glyph as another | 0.204 |
| read it as place-value | 0.215 |
| ignored repeated glyphs | 0.293 |
| counted the glyphs | 0.265 |
| took the biggest glyph only | 0.248 |
| tapped the end of the line | 0.351 |

**Verdict: genuinely satisfied, with one boundary.** The emission is real, in range, selective and
graded. What it is *not* is calibrated — these are design quantities on a synthetic bank, and
whether small consistent placement error separates strong reasoners in children is exactly the kind
of claim `validated: false` exists to withhold. Re-enforcing `M-PAE` in `engine-config.ts` is a
wiring decision that belongs with U6/U7 and is not taken here.

---

## 7. Boundaries, and what is not established

- **Gate A is not a gate.** It shows the pipeline does not manufacture λ out of nothing on this
  bank. It says nothing about whether the block measures learning; a synthetic child's climb is
  written by the simulator, and recovering it would be circular. **Gate B needs ~128 real children
  (§4.1.3) and no synthetic run substitutes.** No type is recorded as gate-passing.
- **A1 failed and the track stops at U5** (§9.4). The failure is attributed to the estimator rather
  than the bank on a paired comparison, and that attribution is an argument the owner may reject; if
  it is rejected, the correct reading is that no bank can pass A1 on this estimator, which is a
  measurement decision (§8.4's "decision on the guessing floor") and not a question design.
- **Both banks ship `validated: false`, `syntheticOnly: true`**, and the scrambled arm lives outside
  `banks/` in `control-banks/`, a directory no application code names, so it cannot be served by
  accident.
- **Difficulty is a design rung, not a calibrated IRT parameter.** It is monotone in every declared
  lever and re-derived per item by an independent checker; that is a much weaker claim than
  calibration and it is the claim actually needed to keep the fit unbiased (§1.1(d)).
- **The anti-leak residual is real.** 28.6% against a 20% floor in the hardest slice is better than
  the reference type's 34.0% and is not zero.
- **A-S2-2 is untouched.** Both difficulty orderings this design imports are from adults.
- **The K-1 floor has a small expression vocabulary.** With no bindings and at most two glyphs there
  are few distinct expressions, so variety at the floor comes from the line and the option slate.
  The *response* is not recallable, because the marks move; the *expression* does recur. Whether
  that is acceptable at K-1 is a question for Gate B's per-band reporting, not one this document
  settles.
