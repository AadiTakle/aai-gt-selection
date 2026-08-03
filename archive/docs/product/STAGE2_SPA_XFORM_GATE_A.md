# SPA-XFORM-01 — Gate A (U5) and the independent validator (U4)

**Status:** Measurement report for `STAGE2_QUESTION_DESIGN.md` §9.2 units U4 and U5, on the two banks
unit U3 produced. **Gate A is not cleared.** A2 passes; A1, A3 and A4 fail, and §9.4's stop rule
fires. Per that rule the track stops here: no renderer (U6) and no verifier (U7) were built.

**Requirements served:** R5, R6 (measure growth without a gifted-student ceiling — this is the
readout that requirement rests on), R7 (auditable and falsifiable — every figure below is a
command), R8, R10 (state the boundaries of every conclusion), H1, H6, H10.

**Evidence used:** E-074 (the bank/served-item contract), E-075 and E-076 (answer-key derivability),
E-094 (key-position balance), E-095 (the recovery ladder by block length, which §6 is measured
against) and E-200 (the guessing-floor defect and the loop attribution, which §3 turns on). **No new
E or D ID is claimed.** §9.3 puts the governance unit (U9) last and once; minting evidence IDs here
would pre-empt it.

**In scope:** Gate A's four checks on `SPA-XFORM-01` in both persistence modes; the attribution runs
that locate the A1 result against a bank-free bound; and U4, an independent validator that
re-derives the answer key on 100% of both banks without importing anything from the generator.
**Out of scope:** any change to the estimator, readout, harness or any other type's artifacts;
difficulty calibration; the renderer, the verifier, and any wiring into the live learning block;
Gate B.

**Claim boundary, before any number.** Everything here is born-synthetic against banks carrying
`validated: false` and `syntheticOnly: true`. No output is evidence about a real child. Clearing
Gate A would not be clearing the gate D-S2-3 made binding, and Gate A is not cleared here. Whether
this type's climb is induction of the hidden system rather than within-session rotation practice is
the question §3.4 calls this type's most likely failure, it is **untested**, and §10 says what would
test it.

---

## 1. The answer

**This bank has arrived at the bank-free bound. It is the third independent bank to do so, and the
case is now closed: no bank can fix A1.**

At the five-option responder floor that is exact for this bank, over eight seeds and 3,200 simulated
children per cell:

| check | verdict | observed |
| --- | --- | --- |
| **A1** static-child null | **FAIL** | fitted λ̄ = **0.0092 ± 0.0010**, 9.4 Monte-Carlo SEs from zero, for a cohort that learned nothing |
| **A2** false-positive rate | **PASS** | **13.2%** of static children read `above`, against a 30.9% nominal band rate |
| **A3** no saturation | **FAIL** | **4 of 800** fastest learners bank-limited (0.5%), against 99 scale-limited; no block ever exhausted the pool |
| **A4** recovery sanity | **FAIL** | r = **0.329** against E-095's 0.448; mean posterior SE **0.063** against 0.047 |

Both arms return identical figures to four decimal places, for the reason §7 gives.

**The attribution, which is the point of the report.** Run the same λ_true = 0 cohort through the
same estimator on an *idealised 0.5-point grid with no bank involved at all* and it fits
λ̄ = 0.0085 ± 0.0013. Run it on `FLU-OPCHAIN-01` at matched settings and it fits 0.0097 ± 0.0011.
Paired over the same eight seeds:

| paired contrast | mean | SE | t | reading |
| --- | --- | --- | --- | --- |
| `SPA-XFORM-01` − ideal grid (**the bank-free bound**) | +0.0007 | 0.0005 | 1.40 | no difference |
| `SPA-XFORM-01` − `FLU-OPCHAIN-01` | −0.0005 | 0.0003 | −1.55 | no difference |

Freeze the served difficulty so the fit no longer chooses what it sees next, and the same estimator
on the same bank returns **−0.0015 ± 0.0007** — the manufactured climb is gone, and what replaces it
is a small negative residue that the bank-free grid also carries (−0.0028 there). The paired drop
from freezing is **0.0107 ± 0.0011, t = 9.5**.

The same paired comparison against the bank-free grid was run at three different responder floors,
not one: at 0.167, 0.20 and 0.25 the paired differences are +0.0004, +0.0007 and −0.0000, with
t = 1.00, 1.40 and −0.07 (§8.1). The bank tracks the bank-free bound across a factor-of-three change
in the quantity that actually moves it.

**So the third bank lands on the bound, and it is a different domain, a different generator and a
different author from the first two.** Two banks agreeing could be a shared design habit. Three,
one of which is a lattice-permutation task with no lexicon and no arithmetic in it, agreeing with an
idealised grid *that contains no items at all*, is not a property of banks. It is the estimator plus
the targeting loop, arriving unchanged wherever it is pointed. **The direct consequence for the
programme is that building more question types cannot move A1**, and §9.4's stop rule — written on
the premise that "a bank that manufactures λ from a static child cannot be fixed downstream" —
rests on a premise that is now falsified three times over. Whether the rule should fire anyway is
the owner's call; it is flagged rather than worked around, and the track was stopped rather than
tuned until it passed.

**A4 has the same shape and is also at the bound.** 30-trial recovery is 0.329 on this bank, 0.334
on the bank-free grid, 0.332 on `FLU-OPCHAIN-01` and 0.285 on the wired exemplar `FLU-MATRIX-01`.
There is no bank on the other side of this one, so the 0.119 shortfall against E-095 is the
five-option guessing floor and the 30-trial block length, neither of which a bank can change.

**A3 is the exception, and it is the one place a bank property actually shows.** It fails, narrowly:
4 of 800 fastest simulated learners were served the bank's top item while the targeting rule asked
for more. §5 shows every one of them sits at standing 15 or 16, in the 0.02-wide window between this
bank's top item (19.98) and the scale ceiling (20.00), and that the remedy is known and named —
twelve items per 0.5-point rung rather than six, which is what `VER-MORPHO-01` carries and why it
recorded zero.

**What U4 found that the U3 self-check does not test, and what was done about it.** The independent
validator confirms the declared anti-leak invariants exactly — the key is fully determined by
`content` on **0 of 234** items, and at least four of five options survive relabelling on every
item. It also measured a residue nothing in the design bounded: an attacker who *weights* options
by how many badge relabellings point at each, rather than merely eliminating, scored **24.9%**
across the bank against a 20.0% chance floor, **37.8% in the easiest quarter**, **47.7% in the
hardest quarter on the anti-modal tail**, and won outright on **26 of 234** items where the key was
the unique modal option.

**That residue is now closed, and the bank in this report is the rebuilt one.** `chooseDistractors`
chooses the slate by the size of the key's vote TIER instead of filling it greedily on reachability
alone, and the figure is redrawn against that objective. The weighted attack now scores **20.6%**
across the bank against the 20.0% floor, **21.4%** in the easiest quarter and **19.9%** in the
hardest, and the key is the unique modal option on **0 of 234** items — the property `VER-MORPHO-01`
asserts and this type had not. §9 reports it in full and §9.2 records what it cost.

---

## 2. What was run, and how to re-run it

```
bash research/exam-question-types/spa-xform-gate-a-runs.sh [output-dir]        # ~3 minutes
node research/exam-question-types/spa-xform-gate-a-report.mjs [output-dir]
node research/exam-question-types/generators/validate-SPA-XFORM-01.mjs --prove-teeth   # U4
node research/exam-question-types/generators/check-SPA-XFORM-01.mjs                    # U3, for contrast
```

Every figure comes out of those four commands. The runner contains no measurement logic; it calls
`pnpm exam:block-harness` with existing flags. Three conventions hold throughout.

- **`--guessing 0.20` is the simulated child's floor**, because this bank is 234/234 five-option
  (§3.4's tap-one-of-five, the same response grammar as the wired `SPA-ROLL-01`, `SPA-FOLDNET-01`
  and `SPA-SHADOW-01`), so 0.20 is exact for it. **It is also the shipped `DEFAULT_GUESSING`, so on
  this bank the estimator is *correctly specified* in both roles** — which is the material
  difference from `VER-MORPHO-01`, whose four-option format left the shipped estimator wrong by
  0.05. §8 reports the same bank at 0.25 so the cells line up with that type's published figures.
- **0.20 is the floor for a *child*, not for a *client*.** §9 measures a content-only attack that
  reaches 24.6% by elimination. That attack requires brute-forcing up to 120 badge relabellings and
  is not available to an eight-year-old, so it does not belong in the responder model; it is an
  E-075/E-076 property of the bank and is reported there. Conflating the two would silently raise
  the floor and flatter A1.
- **Everything else is the harness default:** 400 children per cell, λ ~ N(0.06, 0.03²),
  θ0 ~ N(10.5, 3²), handover-noise SD 1.5, slope 1.0, target offset +1.

**Eight seeds everywhere it matters.** `STAGE2_BANK_RECOVERY_MEASUREMENT.md` §9 found the harness's
default seed unrepresentative in both directions, with single-seed cells carrying roughly ±0.04 of
noise on `r`. A3 below is the clearest case yet: it passes on four of the eight seeds and fails on
the other four, so a single-seed Gate A run on this bank would have reported either verdict.

**The attribution runs are paired by construction.** `--fix-probe` prices the bank-free grid, this
bank and the frozen-difficulty diagnostic inside one invocation, so looping it over the seeds puts
all three on identical cohorts. The differences in §1 and §3 are therefore within-seed differences
with paired standard errors, not two independently pooled means differenced after the fact.

---

## 3. A1 — the check that earns its keep, and the attribution

λ_true = 0 for every child. Any fitted climb is manufactured by the pipeline.

| pool | null λ̄ | ± SE | SEs from 0 | A1 |
| --- | --- | --- | --- | --- |
| ideal 0.5-point grid, **no bank at all** | 0.0085 | 0.0013 | 6.5 | fails |
| **`SPA-XFORM-01`**, both arms | **0.0092** | **0.0010** | **9.4** | **fails** |
| `FLU-OPCHAIN-01`, matched settings | 0.0097 | 0.0011 | 8.6 | fails |
| `SPA-XFORM-01`, served difficulty **frozen** | −0.0015 | 0.0007 | 2.3 | fails, in the other direction |
| ideal grid, served difficulty **frozen** | −0.0028 | 0.0005 | 5.1 | fails, in the other direction |

The frozen rows are the mechanism, and it is E-200's: the estimator's assumed floor and the
responder's floor interact with a loop that chooses what it serves next from its own fit, the served
difficulty walks across trials, and the fit reads its own walk back as learning. Take the loop away
and the climb goes to zero. **Nothing a bank contains can intervene in that loop**, which is why
three banks and an idealised grid all land within one Monte-Carlo SE of each other.

**The frozen rows are reported at their real strength, which is not "passes".** Freezing removes the
manufactured climb and replaces it with a small *negative* bias, −0.0015 here and −0.0028 with no
bank at all, both distinguishable from zero. A frozen-difficulty block is not a remedy anybody
proposed — it would give up adaptive targeting entirely — and it does not return an unbiased
estimator either. It is a diagnostic that isolates the loop, and that is all it is claimed as.

**Stopping rather than tuning.** Two knobs would have made A1 pass and both were rejected, for the
same reasons they were rejected on the previous two types. Running the responder at the harness's
default `--guessing 0` returns λ̄ = 0.0017 and a nominal PASS, but a floorless responder is a claim
that a child who knows nothing scores zero on a five-option item, which is false. And there is no
estimator correction available to try here even in principle: unlike `VER-MORPHO-01`, this bank's
option count already matches the shipped default exactly, so **A1 fails at 9.4 SEs with the
estimator correctly specified**. That is the strongest form of the finding this project has
produced — the previous two failures could still be read as misspecification, and this one cannot.

For contrast, the pre-D-200 configuration on this same bank — `guessing = 0` in both estimator
roles against the same 0.20 responder — returns **0.0370 ± 0.0016** with a 31.5% false-`above`
rate. D-200 bought a four-fold reduction in the manufactured rate and it is still 9.4 SEs from zero.

---

## 4. A2 — would the readout call these non-learners fast?

**13.2%** of the static cohort reads `above`, against a **30.9%** nominal rate. A2 passes.

This is the check to be least pleased about, and the reason is the one
`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §3 sets out: A2's pass condition asks only that the readout
does not *exceed* its own nominal rate on a cohort the pipeline is already manufacturing a climb
for. The honest reading of A1 and A2 together is that **roughly one static child in eight would be
called an above-average learner**, and A2 does not test that. It is lower than either sibling type
(18.2% for `VER-MORPHO-01`, 20.0% for the four-option cell of this bank) for one uninteresting
reason: the five-option floor is lower, so the loop has less to work with.

---

## 5. A3 — the one check where the bank actually matters, and the one this bank fails on its merits

§1.1(c) asks for ≥6 scale points of usable headroom above `standing + 1`. A3 separates the two
reasons a child pins at the top of the pool: the **bank** stopping below what the targeting rule
asked for, which is the §1.1(c) defect, and `nextTargetTheta` clamping the projection to the
20-point scale, which no bank can fix.

Over the eight primary seeds, fastest simulated learner (λ = 0.15), 100 children per seed:

| cause | count | share |
| --- | --- | --- |
| **bank-limited** — the bank stopped short of what was asked for | **4 / 800** | **0.5%** |
| scale-limited — the projection hit the 20-point ceiling | 99 / 800 | 12.4% |
| blocks that exhausted the pool | 0 / 800 | 0% |

**A3 fails, and the failure is real rather than a rounding artifact of one seed** — but it is
marginal, and it is seed-dependent in a way worth recording: four seeds return 0 bank-limited and
pass, and four return 1, 1, 2 and 1 and fail. A single-seed Gate A run had even odds of reporting
either verdict, which is the clearest vindication yet of the eight-seed convention.

The headroom sweep, with the population spread collapsed so `standing` is exactly the swept value
(40 fastest learners per cell), locates every one of them:

| standing | bank-limited | scale-limited | blocks exhausted |
| --- | --- | --- | --- |
| 6 – 12 | 0 / 40 at every standing | 0 / 40 | 0 |
| 13 | 0 / 40 | 4 / 40 | 0 |
| 14 | 0 / 40 | 17 / 40 | 0 |
| **15** | **1 / 40** | 34 / 40 | 0 |
| **16** | **1 / 40** | 39 / 40 | 0 |
| 17 | 0 / 40 | 40 / 40 | 0 |

**Bank-limited truncation is zero at every standing from 6 to 14 and appears only at 15 and 16**,
where the projection is asking for something between this bank's top item at 19.98 and the scale
ceiling at 20.00. That is a 0.02-wide window, and it is the same window `VER-MORPHO-01`'s report
described from the other side when it noted that its top rung landing at 19.99 rather than 19.98
narrowed the interval in which a projection is charged to the bank — and said plainly that this was
luck rather than a design decision. This bank is on the unlucky side of the same coin.

**The substantive remedy is known, named and not applied here.** `VER-MORPHO-01` recorded zero
bank-limited truncation at every standing, and it carries **twelve items per 0.5-point rung**; this
bank carries **six** (234 items across 39 rungs), the same density as `FLU-OPCHAIN-01`, which
recorded 1, 7, 10 and 7 at standings 13–16 on its older bank. So the ordering across the three banks
is monotone in rung density, and this bank sits between them. Regenerating at `perRung = 12` is a
one-parameter change to `buildBank`, would roughly double the bank to 468 items, and is **not done
here**: it is a U3 change, every Gate A figure would have to be re-measured against it, and §9.4's
stop rule has already fired on A1 — spending the work to fix A3 on a track that is stopped for a
reason A3 cannot touch would be the wrong order.

**The ceiling itself is unchanged and is not a bank problem.** From standing 16 essentially the whole
fast cohort truncates against the 20-point scale. §1.1(c) needs the pool to reach `standing + 7`,
which on a bounded [1, 20] scale exists only for standing ≤ 13. Deepening the composition would not
move this: the design already reaches 19.98 at depth 3 with density 7, and there is no lever left
that lands above the scale rather than above the ceiling. The remedy, if one is wanted, is a scale
change or a targeting-rule change. Neither is in scope here.

---

## 6. A4 — the recovery ladder on this bank's actual grid

Mean over 8 seeds, five-option responder floor.

| trials | recovery r | mean posterior SE | null λ̄ | fitted-λ SD | E-095 r | E-095 SE |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | 0.051 | 0.144 | 0.0085 | 0.0382 | 0.066 | 0.138 |
| 15 | 0.183 | 0.118 | 0.0118 | 0.0717 | 0.183 | 0.101 |
| **30** | **0.329** | **0.063** | **0.0092** | **0.0652** | **0.448** | **0.047** |
| 45 | 0.538 | 0.039 | 0.0089 | 0.0506 | 0.746 | 0.026 |
| 60 | 0.660 | 0.028 | 0.0093 | 0.0413 | 0.862 | 0.017 |

And the pool comparison at 30 trials, same floor, same eight seeds:

| pool | recovery r | mean posterior SE |
| --- | --- | --- |
| ideal 0.5-point grid, no bank | 0.334 | 0.063 |
| **`SPA-XFORM-01`** | **0.329** | **0.063** |
| `FLU-OPCHAIN-01` | 0.332 | 0.063 |
| `FLU-MATRIX-01`, the wired exemplar | 0.285 | 0.072 |

E-095's column was measured against a child with **no** guessing floor, so it is a ceiling rather
than a target for any multiple-choice bank. A4's failure is a statement about the estimator at 30
trials with a realistic floor, not about this grid — the grid is within 0.005 of the bank-free
bound, which is inside the seed-to-seed noise.

**The floor does not fall with block length and the posterior SE does.** From 30 to 60 trials the
manufactured rate goes 0.0092 → 0.0089 → 0.0093 — flat — while the posterior SE more than halves,
0.063 → 0.028. Block length buys down random error and leaves the systematic error exactly where it
is. On this bank the systematic term is *more* stubborn than on `VER-MORPHO-01`, where it at least
declined from 0.0166 to 0.0109 over the same range.

**The figure U1's power script needs.** The fitted-λ SD on this bank at 30 trials is **0.0652**, not
the 0.06 §4.1.3 estimates, and not the 0.0707 `VER-MORPHO-01` measured. On §4.1.3's own arithmetic
(n per arm ≈ 15.7/*g*²) a given *absolute* λ separation corresponds to a standardised effect smaller
by 0.06/0.0652, so the sample size for the same absolute separation rises by a factor of
**(0.0652/0.06)² ≈ 1.18** — roughly 75 per arm rather than 63, against 88 on the sibling bank. That
is arithmetic on the document's own formula, not a new power analysis. **The load-bearing point is
not the value but the spread**: three measurements now exist (0.0652, 0.0707, and §4.1.3's assumed
0.06) and they disagree by 18% in the sample size they imply, so §4.1.3's instruction to U1 to
*recompute rather than inherit* should be read as recomputing **per type**, not once.

---

## 7. The two arms return identical numbers, and that is expected

Every cell above is the same to four decimal places in `consistent` and `perTrial`. That is not a
rounding statement and it is not a defect.

The two banks are equated item-for-item on every scored property — U4 re-verifies this on all 234
pairs — and differ only in which badge symbols label the operator chain. The harness's simulated
child responds to `difficulty` and nothing else; there is no hidden system in the simulator to
persist or scramble, so the two arms present it with the same difficulty vector.

**What that establishes, at its real strength:** the pipeline does not manufacture a between-arm
difference out of the arm label. **What it does not:** anything about whether the type measures
learning, and in particular nothing about §3.4's stated worry that this type's climb is
within-session rotation practice. **At Gate A the scrambled bank is arithmetically identical to A1.**
Its value is entirely at Gate B, with real children, where the two arms can finally differ in the
only way that matters — and for this type that contrast is the whole design, because rotation
practice accrues equally in both arms and is the thing the difference is meant to remove. Building
it now was still correct: §4.1.1's argument that a control from a different code path would confound
the contrast with the code path stands.

---

## 8. Comparability — the same bank at other responder floors, and the three-bank convergence

| responder floor | null λ̄ | ± SE | SEs from 0 | false `above` | recovery r | A1 |
| --- | --- | --- | --- | --- | --- | --- |
| **0.20 — five options, exact for this bank** | **0.0092** | 0.0010 | 9.4 | 13.2% | 0.329 | FAIL |
| 0.25 — four options, exact for `VER-MORPHO-01` | 0.0166 | 0.0013 | 13.2 | 18.3% | 0.280 | FAIL |
| 0.00 — the harness default, 1 seed | 0.0017 | n/a | n/a | 3.8% | 0.474 | pass |

The 0.25 row is the one to compare against the sibling's published figures, and it lands **exactly**
on them: `VER-MORPHO-01`'s measured eight-seed null λ̄ at that floor is **0.0166** and this bank
returns **0.0166**. At the five-option floor, `FLU-OPCHAIN-01`'s published figure is 0.0097 and this
bank returns 0.0092.

### 8.1 The convergence, measured against the bank-free grid at three different floors

The grid and this bank are re-measured here over the same eight seeds and paired within seed; the
two sibling banks are quoted from their own reports and were not re-run.

| responder floor | ideal grid, **no bank** | `SPA-XFORM-01` | paired difference | t | `FLU-OPCHAIN-01` | `VER-MORPHO-01` |
| --- | --- | --- | --- | --- | --- | --- |
| 0.167 (six-option) | 0.0057 ± 0.0009 | 0.0061 ± 0.0009 | +0.0004 ± 0.0004 | 1.00 | — | — |
| **0.20 (five-option, exact here)** | 0.0085 ± 0.0013 | **0.0092 ± 0.0010** | +0.0007 ± 0.0005 | 1.40 | 0.0097 | 0.0088 |
| 0.25 (four-option) | 0.0166 ± 0.0010 | 0.0166 ± 0.0012 | −0.0000 ± 0.0003 | −0.07 | 0.0171 | 0.0166 |

**Every cell in a row agrees within Monte-Carlo error, and the rows differ by a factor of three.**
The manufactured rate is a function of the option count and the estimator, and it is not a function
of the bank — not at any of the three floors, and not for any of the three banks. That is the
cleanest statement of the finding this report can make, and it needed a third bank to make it: with
two, "both banks were designed by people reading the same document" is a live alternative
explanation. A lattice-permutation task, an invented-morphology task and a symbolic-operator task
converging on an idealised grid *containing no items at all*, at three separate floors, is not that.

**One correction to a sibling figure, made in passing.** `STAGE2_VER_MORPHO_GATE_A.md` §3 reports
the bank-free grid at the four-option floor as 0.0176 ± 0.0036 and reads it as sitting slightly
above the banks. That cell came from a single `--fix-probe` call — one seed, 400 children — and its
own stated SE covers the difference. Re-measured over eight seeds it is **0.0166 ± 0.0010**, sitting
on the banks rather than above them. Nothing in that report's argument depends on the direction of
that gap, and this measurement strengthens it: the grid is not slightly worse than the banks, it is
indistinguishable from them.

---

## 9. U4 — the independent validator, and the residue it found

`check-SPA-XFORM-01.mjs` is the U3 self-check: it imports `BANK_PATHS` from the generator and
re-types the lattice algebra from the *same* documented coordinate maps the generator uses. That
catches a bank which disagrees with its own generator; it cannot catch a generator that is
confidently wrong, because a transcription error in the coordinate map would be copied verbatim into
the check.

`validate-SPA-XFORM-01.mjs` imports **nothing** from the generator — not the algebra, not the
difficulty model, not the bank paths — and types the six permutations a different way, as literal
16-entry index tables written out cell by cell from each operator's prose description. A coordinate
map and a hand-written table are two independent transcriptions of the same geometry, so the
validator cross-checks them against each other, and against each operator's implied order
(pivot⁴ = mirror² = braid² = stagger² = drift² = shunt⁴ = identity), **before reading a single
item**. On 100% of both banks, with no sampling:

- **The key is re-derived, not trusted.** The badge chain is mapped through the hidden mapping, the
  resulting operator chain is applied to the input figure, and the figure it produces must be
  exactly the option `correctKey` names and no other. **468 / 468 items re-derive correctly.**
- **Every distractor is the partial rule it claims to be.** The operator chain is parsed out of the
  option's own `ruleId` *and* re-derived a second time from that ruleId's prefix against the key
  chain; both must reproduce the option's figure. This catches a label moved between two options,
  which a figure-only check accepts.
- Difficulty, the band ladder, the lever/figure agreement, key-position balance, arm equating and
  the ink invariant are all re-derived from independently typed formulae.

### 9.1 The declared invariants hold, and the attack nobody bounded is now bounded too

| difficulty slice | items | key fully determined | mean viable options | elimination attack | modal attack | key uniquely modal |
| --- | --- | --- | --- | --- | --- | --- |
| Q1 (1.02–5.50) | 59 | **0** | 4.73 / 5 | 21.4% | 21.4% | **0** |
| Q2 (5.50–10.50) | 59 | **0** | 4.88 / 5 | 20.6% | 20.6% | **0** |
| Q3 (10.50–15.50) | 59 | **0** | 4.92 / 5 | 20.4% | 20.6% | **0** |
| Q4 (15.50–19.98) | 57 | **0** | 4.96 / 5 | 20.2% | 19.9% | **0** |
| **whole bank** | 234 | **0** | 4.87 / 5 | 20.6% | **20.6%** | **0** |

Identical in both arms. By composition depth, which is where the structure actually lives:

| depth | items | elimination attack | modal attack | key uniquely modal |
| --- | --- | --- | --- | --- |
| 1 | 78 | 21.5% | 21.5% | **0** |
| 2 | 84 | 20.4% | 20.5% | **0** |
| 3 | 72 | 20.1% | 19.8% | **0** |

- **The two declared invariants hold exactly.** The key is fully determined by `content` on **0 of
  234** items, against the 11 of 234 `FLU-OPCHAIN-01` shipped with; and at least four of five
  options survive relabelling on **every** item. The declared bound was 1-in-4; the bank now sits at
  1-in-4.87, because a slate chosen for an equal-vote tier reaches five reachable options on 204 of
  234 items rather than the four the invariant asks for.
- **The residue the first build left, and where it went.** The build this report first covered was
  measured by the validator at **24.9%** bank-wide and **37.8%** in the easiest quarter on the
  weighted attack, with the key the unique modal option on **26 of 234** items; and
  `STAGE2_ANTILEAK_COMPARISON` §5.1 found the other tail worse still, **47.7% anti-modal in Q4**,
  which is the signature of a generator pushing the key away from modal at depth. Bounding one tail
  hands the other the certainty it lost, so neither is bounded directly: the slate is now chosen to
  maximise the number of options carrying the SAME vote count as the key. A tier is
  indistinguishable from inside, so every rank policy — modal, anti-modal and the three between —
  collapses to 1/|tier| at once. Both tails now sit on the floor and the outright wins are gone.
- **The depth trend is gone with it.** The first build scored 33.9% at depth 1 and 10.1% at depth 3
  — both away from the floor, in opposite directions, which is what made the two tails trade places
  across the difficulty range. The rebuilt bank reads 21.5% / 20.5% / 19.8% across the three
  depths, so the attack no longer carries information about where in the ladder an item sits.
- **The key slot no longer follows the difficulty order either.** `keyPosition = n % 5` walked with
  the emission index, and items are emitted rung by rung in increasing difficulty with `difficulty`
  served: `STAGE2_ANTILEAK_COMPARISON` §7.2 read the answer slot straight off the difficulty rank at
  **38.5%** against the 20.0% floor, and **62.2%** cross-validated in the hardest slice. The slot is
  now a balanced multiset inside each chain depth, permuted there from the seeded stream, so the
  same probe reads **23.9%**. Key positions remain 47/47/47/46/47.
- **Neither attack is available to a child.** Both require brute-forcing up to 120 relabellings.
  They are E-075/E-076 properties of what a *client holding `content`* can compute, which is why
  they do not enter the responder model in §2.

### 9.2 What the rebuild cost

Two things, and neither is free.

- **The `identity_copy` failure class is gone from the slate.** It appeared on 12 of 234 slates in
  the first build. An option no relabelling reaches carries zero votes and can never join the key's
  tier, so an equal-vote slate evicts the unreachable classes first, and `identity_copy` — the
  figure the machine was never applied to — is the one that is never reachable. A tie-break placed
  strictly after the objective keeps the rest of that family wherever it is free, and
  `over_application` in fact rose from 210 slates to 91 items' worth of them; but the "did not
  engage" extreme of the nearness axis is no longer represented. §4.6's error-migration test and the
  §4.1.4 Verdict-2 fallback read that register, so this is a construct decision for the owner rather
  than something the anti-leak change should settle. Recovering it means accepting a 1-in-4 tier on
  those items instead of 1-in-5.
- **Realised nearness error rose from 0.205 to 0.244** on `|realised − declared|` over the four
  distractors. The anti-leak objective may move a slate by at most 0.1 per distractor, which is the
  smallest gap between two adjacent classes on the nearness axis, so no distractor moves more than
  one step. The quantity that matters for §1.1(d) is not the level but the TREND, because random
  labelling error attenuates lambda while error correlated with difficulty biases it — and the
  trend is flatter than before: 0.311 → 0.220 across the four slices, against 0.294 → 0.169.

### 9.3 Proving the validator has teeth

A validator nobody has seen fail is a validator nobody has tested. `--prove-teeth` injects nine
defects into in-memory copies of the banks — one per independent check, nothing written to disk —
and a defect counts as caught only when the check that **owns** it fires, because a defect caught by
some unrelated check means the owning check is asleep.

| # | injected defect | check that must fire | failures raised | verdict |
| --- | --- | --- | --- | --- |
| 1 | the key is moved to another slot | `KEY` | 4 (1 owned) | CAUGHT |
| 2 | two badges trade meanings in the hidden mapping | `KEY` | 5 (2 owned) | CAUGHT |
| 3 | a stated difficulty is understated by a rung | `DIFFICULTY` | 4 (1 owned) | CAUGHT |
| 4 | a distractor is relabelled with another partial rule | `DISTRACTOR` | 1 (1 owned) | CAUGHT |
| 5 | an option is replaced by a figure no relabelling reaches | `LEAK-RELABEL` | 4 (2 owned) | CAUGHT |
| 6 | a high-difficulty item is given the K-1 band | `BAND` | 2 (1 owned) | CAUGHT |
| 7 | one item's figures are copied over another's | `EQUATING` | 13 (1 owned) | CAUGHT |
| 8 | the stated key displacement is moved off the true one | `LEAK-DISP` | 1 (1 owned) | CAUGHT |
| 9 | an option gains a block, breaking the shared ink count | `INK` | 5 (1 owned) | CAUGHT |

**Nine of nine caught by their owning check, 39 failures raised in total, and the unmodified banks
raise 0.** Defect 4 is the one worth singling out: it moves only a *label*, leaving every figure in
the item valid and every other check clean, and exactly one check fires. That is the check that
distinguishes an independent validator from a schema check.

---

## 10. Boundaries, and what remains open

**What this report establishes.** The two banks are well-formed against the repo's own contract and
against an independently typed re-derivation of every scored property; the answer key is not
derivable from `content` on any item; the difficulty ladder is monotone in every declared lever; and
the pipeline's manufactured λ on this bank is statistically indistinguishable from what it
manufactures with no bank at all, at the exact chance floor, with the estimator correctly specified.

**What it does not.**

- That the type measures learning in children. Gate B, ~128 children, and no synthetic run
  substitutes.
- **That the climb this type would produce is induction of the hidden system rather than
  within-session mental-rotation practice.** §3.4 names this the most likely failure of the four
  Stage 2 types and nothing here bears on it. The design's four mitigations — rotation is one
  operator of six, `turns = 0` is reachable at every depth so **35.9% of the bank needs no
  re-orientation at all**, the mapping-blind ceiling is held near chance, and both arms serve
  identical figures — are all *verified as built* by U4. Whether they are *sufficient* is the
  scrambled-arm contrast at Gate B, and only that.
- That the residual 0.0092 can be removed. This report isolates it as an estimator-plus-loop
  property and shows it survives a correctly specified estimator; it does not cost a remedy, and
  E-200 already rejected an estimated 3PL floor as unidentifiable from 30 dichotomous responses.
- That A3 would pass at twelve items per rung. That is the reading the three-bank ordering supports
  and it is untested here (§5).
- That the modal-attack residue matters behaviourally. It bounds what a *client* can compute; no
  child can run it (§9.1).

**If the owner accepts these figures, the governance record would need** (all deferred to U9, none
done here, per §9.3's "last and once"): an E-family entry for the Gate A table and the measured
contamination floor of 0.0092 ± 0.0010 at 30 trials; the fitted-λ SD of **0.0652** alongside the
sibling's 0.0707, with §4.1.3's "recompute rather than inherit" clarified to mean per type; the A3
bank-limited result and the `perRung` conjecture; the modal-attack residue and whether the
invariant `VER-MORPHO-01` asserts should be required of every Stage 2 type; and — the decision this
report exists to force — **whether §9.4's A1 stop rule fires when three independent banks and a
bank-free grid have now all returned the same value, which is to say when the failure is
demonstrably not attributable to any bank and cannot be fixed by building more of them.**

**No type is recorded as gate-passing.** Both banks ship `validated: false` and `syntheticOnly:
true`, neither is wired into the live learning block, and Gate B has not run.
