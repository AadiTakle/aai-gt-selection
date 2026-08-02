# FLU-OPCHAIN-01 at twelve items per rung — the density rebuild, and Gate A re-measured

**Status:** Measurement report for `STAGE2_QUESTION_DESIGN.md` §9.2, on a regenerated
`FLU-OPCHAIN-01`. **Gate A is not cleared.** A2 and A3 pass; A1 and A4 fail, on both arms, and §9.4's
stop rule fires. §4 below shows the A1 failure is bank-free and localises it to the estimator's
guessing-floor handling — which is a change to `packages/exam-scoring`, is not made here, and needs
its own decision.

**Requirements served:** R5, R6 (measure growth without a gifted-student ceiling), R7 (auditable and
falsifiable — every figure below is a command), R8, R10 (state the boundaries of every conclusion),
H1, H6, H10.

**Evidence used:** E-074 (the bank/served-item contract), E-075 and E-076 (answer-key derivability,
which §3 turns on), E-094 (key-position balance), E-095 (the recovery ladder by block length, which
§2 is measured against) and E-200 (the guessing-floor defect and the loop attribution, which §4
turns on). **No new E or D ID is claimed.** §9.3 puts the governance unit (U9) last and once.

**In scope:** regenerating `FLU-OPCHAIN-01` at 12 items per 0.5-point rung across the same 39-rung,
0.5-grain, 1–20 range; strengthening the anti-leak invariant; re-running Gate A on both arms and the
paired bank-free comparison at 30, 45 and 60 trials.
**Out of scope:** any change to the estimator, the readout, the harness, or any other type's
artifacts; chain depth (see §3.4); difficulty calibration; Gate B.

**Claim boundary, before any number.** Everything here is born-synthetic against banks carrying
`validated: false` and `syntheticOnly: true`. No output is evidence about a real child. Clearing
Gate A would not be clearing the gate D-S2-3 made binding (§4.1.5), and Gate A is not cleared here.

---

## 1. The answer

**Two things were measured and both moved. Neither is Gate A.**

| | 6/rung, on `dev` | 12/rung, this work |
| --- | --- | --- |
| items per arm | 234 | **468** |
| on the bank-free recovery bound at 30 trials | yes (t = −0.4) | **yes (t = 0.1)** |
| at 45 trials | **no — off by 0.020 (t = −4.6)** | **yes (t = 0.5)** |
| at 60 trials | **no — off by 0.041 (t = −7.0)** | **yes (t = −0.6)** |
| items whose key is determined by `content` | 0 / 234 | **0 / 468** |
| graded content-only attacker, hardest slice | 34.0% | **22.4%** |
| the same, against the dominating attack (§3.2) | 38.2% | **23.4%** |
| items where one attack strategy is certain | 16 / 234 | **0 / 468** |

**The density claim is confirmed and it is specific.** Pool density per rung, not bank size, is what
costs recovery at longer blocks: the 6/rung bank falls measurably off the bank-free bound as the
block lengthens, and the 12/rung bank does not, at any of the three lengths. The direct paired
contrast is **+0.002 (t = 0.7) at 30 trials, +0.022 (t = 3.6) at 45, and +0.038 (t = 6.7) at 60** —
nothing at the length the block currently runs, and a real gain at the lengths a four-block Stage 2
would reach.

**The anti-leak figure came down further than the sibling types', and one of the two numbers behind
that is not the number that was published.** Measured on `dev` with the methodology
`QUANT-GLYPHNUM-01` used, this type scored 28.2% over its bank and 34.0% in its hardest slice, and
those reproduce exactly here. But that methodology scores three fixed strategies, and an attacker has
more than three: it can condition on the sorted vote vector, which is content, and run whichever rank
tier suits the shape in front of it. Under that strictly stronger attack the `dev` bank scored
**32.9% over the bank and 38.2% in its hardest slice** — so the published figure understated the leak
by about four points. The rebuild is measured against both, and against the stronger one it is at
**21.6% / 23.4%**.

**Gate A still fails on A1 and A4, on both arms, and the bank is measurably not the cause of
either.** A1 fits λ̄ = **0.0088 ± 0.0010** for a cohort that learned nothing — 8.5 Monte-Carlo SEs
from zero over 3,200 simulated children. §4 puts that where it belongs.

---

## 2. What was run, and how to re-run it

```
bash research/exam-question-types/gate-a/opchain-density-runs.sh [output-dir]   # ~3 minutes
node research/exam-question-types/gate-a/opchain-density-report.mjs [output-dir]
node research/exam-question-types/generators/FLU-OPCHAIN-01.mjs                # writes both arms
node research/exam-question-types/generators/check-FLU-OPCHAIN-01.mjs          # U4, re-derives §3
node research/exam-question-types/gate-a/opchain-attacker-probe.mjs [bank ...] # §3, either version
```

The runner contains no measurement logic; it calls `pnpm exam:block-harness` with existing flags. The
harness, the estimator (`packages/exam-scoring/src/learning-curve.ts`) and the readout are
byte-identical to their state on `origin/dev`.

Three conventions hold throughout and they are what make the comparison a comparison.

- **`--guessing 0.2` is the simulated child's floor**, because this bank is 468/468 five-option, so
  0.2 is exact for it. The estimator is left at the shipped `DEFAULT_GUESSING = 0.2` in both roles,
  because that is the configuration a real administration would run. §4 reports the 0.25 and 0.00
  variants.
- **Eight seeds everywhere it matters** — 20260730, 11, 22, 33, 44, 55, 66, 77, at 400 children per
  cell, so 3,200 per figure. `STAGE2_BANK_RECOVERY_MEASUREMENT.md` §9 found the harness's default
  seed unrepresentative in both directions, with single-seed cells carrying roughly ±0.04 of noise on
  `r` — larger than most of the differences reported here.
- **The 6/rung side of every before/after is the shipped `origin/dev` artifact**, read from a file
  extracted by `git show` rather than regenerated, so the two sides differ in the bank and in nothing
  else. Every pool at a given seed is built by the same `cohortOptionsFor` call, so **the contrasts
  are paired** and are much tighter than the columns they are computed from.

### 2.1 The paired bank-free comparison — the headline table

The bound is the harness's own `gridPool(0.5, 12)`: an idealised 0.5-point pool with **no bank at
all**, which carries twelve items per rung and is therefore exactly the density this rebuild adopts.
No bank can beat it; the only question is whether a bank has arrived at it.

| trials | pool | recovery r (mean of 8 seeds) | paired Δ vs grid | SE | t | reading |
| --- | --- | --- | --- | --- | --- | --- |
| 30 | ideal grid, no bank | 0.334 | — | — | — | the bound |
| 30 | **12/rung** | **0.335** | +0.000 | 0.005 | 0.1 | **on the bound** |
| 30 | 6/rung | 0.332 | −0.002 | 0.006 | −0.4 | on the bound |
| 45 | ideal grid, no bank | 0.549 | — | — | — | the bound |
| 45 | **12/rung** | **0.551** | +0.002 | 0.004 | 0.5 | **on the bound** |
| 45 | 6/rung | 0.529 | **−0.020** | 0.004 | **−4.6** | **off the bound** |
| 60 | ideal grid, no bank | 0.700 | — | — | — | the bound |
| 60 | **12/rung** | **0.697** | −0.003 | 0.005 | −0.6 | **on the bound** |
| 60 | 6/rung | 0.659 | **−0.041** | 0.006 | **−7.0** | **off the bound** |

And the mean posterior SE, which is the other half of A4:

| trials | ideal grid | **12/rung** | 6/rung | E-095 (floorless) |
| --- | --- | --- | --- | --- |
| 30 | 0.062 | **0.062** | 0.063 | 0.047 |
| 45 | 0.037 | **0.037** | 0.039 | 0.026 |
| 60 | 0.024 | **0.024** | 0.028 | 0.017 |

**The 6/rung rows reproduce what is already on record.**
`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §5 reading 2 reports the 6/rung bank falling behind the grid at
"0.529 vs 0.549 at 45, t = −4.6; 0.659 vs 0.700 at 60, t = −7.0". Every one of those four figures and
both t statistics come out identically here, which is the check that the two sides of this before/after
were measured with the same instrument. That section called the density explanation "a conjecture I did
not test" and proposed testing it by lowering the grid's density to 6; this work tests it the other way
round, by raising the bank's to 12, which needed no harness change.

---

## 3. The answer key is harder to predict, and the cost is named

### 3.1 What the invariant was, and why "0 determined items" was the wrong bar

The attack, stated exactly: a client holding `content` has the input figure, the badge chain and five
candidate outputs, but not the badge→operator mapping, which lives under `answer.system` and which
`servedItemSchema` omits wholesale. So it enumerates the mapping. Because the badges inside a chain
are distinct, guessing the mapping is exactly guessing an ordered selection of `depth` distinct
operators for the chain's positions — at most 6·5·4·3 = 360. Each relabelling produces one output
figure, and if that figure is on screen it **votes** for that option.

The first version of this generator asked only that the key not be the *only* option some relabelling
reaches. By that test the bank was clean, and still is: **0 of 234 then, 0 of 468 now.** But
determinacy is not the property that matters. A client does not stop when two options survive; it
counts the votes and plays a rank. Measured that way the same clean bank leaked 14 points.

### 3.2 The measurement, before and after, per difficulty slice

Slice edges are `QUANT-GLYPHNUM-01`'s, so the three Stage 2 types' tables are comparable without
re-deriving anybody's numbers. `uniform` is "delete what no relabelling reaches, guess among the
rest"; `modal` and `anti-modal` are the first and last of the five vote ranks. **`published metric`
is the maximum of those three slice means — the aggregation the sibling type used, and the one that
reproduces the two figures already published for this type.**

**Before — the 6/rung bank on `dev`:**

| slice | n | determined | mean survivors | uniform | modal | anti-modal | published metric | shape-conditional |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–5 | 50 | 0 | 4.70 / 5 | 21.6% | 21.6% | 21.6% | 21.6% | 21.6% |
| 5–10 | 60 | 0 | 4.23 / 5 | 24.8% | 27.1% | 28.7% | 28.7% | 37.1% |
| 10–15 | 61 | 0 | 4.30 / 5 | 23.9% | 30.5% | 20.4% | 30.5% | **38.2%** |
| 15–20 | 63 | 0 | 3.43 / 5 | 33.5% | 32.1% | 34.0% | **34.0%** | 34.0% |
| whole bank | 234 | 0 | 4.13 / 5 | 26.2% | 28.2% | 26.4% | **28.2%** | **32.9%** |

**After — the 12/rung bank:**

| slice | n | determined | mean survivors | uniform | modal | anti-modal | published metric | shape-conditional |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–5 | 102 | 0 | **5.00 / 5** | **20.0%** | 20.0% | 20.0% | **20.0%** | **20.0%** |
| 5–10 | 120 | 0 | **5.00 / 5** | **20.0%** | 18.1% | 22.1% | 22.1% | **23.4%** |
| 10–15 | 121 | 0 | **5.00 / 5** | **20.0%** | 22.4% | 15.7% | **22.4%** | 22.9% |
| 15–20 | 125 | 0 | **5.00 / 5** | **20.0%** | 20.0% | 20.0% | **20.0%** | **20.0%** |
| whole bank | 468 | 0 | **5.00 / 5** | **20.0%** | 20.1% | 19.4% | **20.1%** | **21.6%** |

Identical in both arms. Four things in those tables are worth reading rather than skimming.

- **The elimination attack is now exactly the chance floor, not near it.** All five options are
  relabelling-reachable on every item of both arms, so nothing can be deleted and `uniform` is
  20.0% in every slice. Before, a mean of 1.6 options per hardest-slice item could be proved not to
  be the key.
- **The hardest slice moved from 15–20 to 5–10, and stopped being the hardest by much.** On the
  published metric the worst slice is 22.4% against 34.0%; on the dominating attack 23.4% against
  38.2%. Both ends of the scale — where the young bands and the ceiling live — are at exactly 20.0%.
- **Zero items are certain, against 16 before.** An item on which some single rank strategy always
  wins is the per-item residue a slice mean averages away, and there are none left.
- **The published figure understated the leak.** 28.2% and 34.0% are correct for the three strategies
  they score. The shape-conditional attacker — group the slice by exact vote shape, then run whichever
  rank tier is the key most often for that shape — is available to any browser script, strictly
  dominates those three, and scored 32.9% / 38.2% on the same bank. **This report is the first place
  that number appears, and it applies only to this type**: the sibling types' published figures are
  quoted here as published, and re-measuring them under the stronger attack would mean touching their
  branches.

### 3.3 How it was done, and what it cost

Three changes, all in `chooseDistractors`, none of them touching chain depth.

1. **Every distractor must be relabelling-reachable** (was: at least one). An option no relabelling
   reaches is one the client can prove is not the key, so it is no longer admissible at all. This is
   `VER-MORPHO-01`'s invariant, applied per candidate rather than by excluding whole rule classes.
2. **The key's vote RANK is a round-robin lever**, `voteRankTarget`, allocated over the five ranks
   exactly as `keyPosition` is allocated over the five screen positions, and recorded in provenance so
   the checker re-derives it. This is the part that generalises: bounding "the key is never modal"
   leaves four other ranks open, and pushing the key away from modal is itself the pattern that hands
   the anti-modal attacker a certainty — which is where this type's 34.0% actually sat. If the key's
   rank is uniform, a tier of size *s* holds it on *s*/5 of items and guessing inside pays 1/*s*, so
   every rank strategy scores exactly 1/5 whatever the shape.
3. **Among slates the difficulty lever is indifferent between, the one whose five vote counts are
   most nearly equal is taken.** All five equal is a single tier spanning all five ranks: zero
   information. **420 of 468 items reach it.**

The two cursors are deliberately out of phase — `keyPosition = n mod 5` and
`voteRankTarget = ⌊n/5⌋ mod 5` — so the pair walks all 25 combinations every 25 items. Incrementing
both together would have made them equal on every item and handed a client "the key's screen slot
tells you its vote rank": a leak assembled out of two separate anti-leak measures.

**What it cost, stated as a number.** The reachability filter deletes rule classes at low depth: at
depth 1 the only reachable non-key figures are the five single-operator outputs, so every distractor
is necessarily a `wrong_operator`. So the within-rung positioner could no longer be rule-class
nearness — a lever that moves the stated difficulty without moving the item is the §1.1(d) labelling
error — and is now **figure distance from the key**, which exists for every candidate at every depth.
That is the same substitution `VER-MORPHO-01` made for the same reason. The visible cost is in the
strategy trace:

| | 6/rung, on `dev` | 12/rung |
| --- | --- | --- |
| items whose distractors carry a single rule label | 102 / 234 (43.6%) | **298 / 468 (63.7%)** |
| `wrong_operator` share of all distractors | 628 / 936 (67%) | **1580 / 1872 (84%)** |
| `order_error` share | 22 / 936 (2.4%) | **114 / 1872 (6.1%)** |
| `first_step_only` share | 33 / 936 (3.5%) | 2 / 1872 (0.1%) |

All six classes still appear and every distractor is still tagged with the incomplete rule it
encodes, so §4.6's per-trial strategy trace and the §4.1.4 Verdict-2 ordinal fallback both still
exist. But the distribution is more concentrated than it was, `first_step_only` has all but gone, and
`qa/audit_banks.mjs` flags the uniform-lure rate as an advisory. **This is a real reduction in the
diagnostic value of a wrong answer, and it was traded for 14 points of answer-key predictability.**
Worth noting in the other direction: `order_error` — the class that most directly evidences "the
child has not abstracted compose-in-badge-order" — is two and a half times more common than before,
because it is reachable by construction.

**The one constant that could have been tuned, and was not.** The anti-leak objective is only allowed
to choose among slates whose summed distance cost is within `DISTANCE_COST_TOLERANCE` of the best
available, so it cannot become the difficulty model. That budget buys the anti-leak figure directly:
**44 items in this bank could be driven to zero information by widening it, at a cost of between 0.6
and 3.9 extra distance units each.** It is set to 1.0 — 0.25 of one figure component per distractor,
which is the same per-distractor budget `VER-MORPHO-01` used — rather than to whatever minimises the
attacker, and the residue that leaves is reported above instead of removed.

### 3.4 What is left, and why it is not closed here

The 21.6% bank-wide residual is 48 items, in five vote shapes, and it has two distinct causes.

- **23 items are structurally stuck.** They are all depth-4, one-geometric-operator chains, where the
  candidate pool contains only two options sharing the key's vote count and none above it, so the key
  cannot be moved out of the top tier whatever slate is chosen. Closing these needs either a different
  stimulus-selection rule — selecting the input figure on its vote structure, which is a selection on
  the stimulus and would need its own argument — or a larger operator vocabulary.
- **25 items are budget-limited**, per the tolerance above.

**Chain depth was deliberately not touched.** Deeper chains would reopen the derivability exposure
this section is about: at depth 4 the relabelling space is already 360 and the vote structure is at
its most degenerate, which is exactly where the 23 structurally-stuck items live. The rebuild extends
by density only.

### 3.5 What the repo's own QA tools said

`qa/leak_scan.mjs`, `qa/audit_banks.mjs`, `qa/dupe_fingerprint.mjs` and `qa/density_check.mjs` were
run over all 50 banks.

- **`leak_scan.mjs`: clean.** No named leak, no computable leak, and unlike ten other banks
  `FLU-OPCHAIN-01` does not raise a NEEDS REVIEW flag.
- **`density_check.mjs`: OK, minimum window count 27** at the floor, against 6–9 for every other bank
  in the repo. That is the density change showing up in the repo's own instrument.
- **`dupe_fingerprint.mjs`: 0 redundant items.**
- **`audit_banks.mjs`: two advisories, and the second was a real defect that is now fixed.** The
  first is the uniform-lure rate in §3.3. The second was five items "near-identical once option
  ordering is normalised" — the same input, the same chain and the same five figures, with the key
  round-robined into a different slot. That is a repeat wearing a new label, and `learning-block.ts`
  forbids repeats because a re-served item measures recall of that item.

**Both duplicate classes are now closed by construction.** The bank builder carries an
arm-independent stimulus fingerprint of every item it has emitted and redraws on a collision,
carrying the redraw in the seed so items stay byte-reproducible from their own provenance. The
fingerprint names the operator chain rather than the badge chain — a badge-sensitive one would let
the two arms redraw at different points and therefore contain different items, breaking the equating
the gate rests on — and it normalises option order and identifies the answer by its figure rather
than its slot. Both arms are now **468 / 468 distinct stimuli**, and
`check-FLU-OPCHAIN-01.mjs` asserts it so the property cannot regress silently.

**The `dev` bank had four of these order-insensitive duplicates too**, so this is a pre-existing
defect found and fixed rather than one this work introduced. The first 12/rung draw had one exact
duplicate pair as well — same stimulus, priced at difficulty 1.09 and 1.80.

---

## 4. A1 fails, and the failure is bank-free — now localised to the guessing floor

λ_true = 0 for every child. Any fitted climb is manufactured by the pipeline.

| responder floor | pool | null λ̄ | ± SE | SEs from 0 | recovery r | A1 |
| --- | --- | --- | --- | --- | --- | --- |
| **0.20 — five options, exact for this bank** | **12/rung** | **0.0088** | 0.0010 | **8.5** | 0.335 | **fails** |
| 0.20 | 6/rung | 0.0097 | 0.0011 | 8.6 | 0.332 | fails |
| 0.20 | ideal grid, **no bank at all** | — | — | — | 0.334 | — |
| 0.20 | `FLU-MATRIX-01`, the wired bank | — | — | — | 0.285 | — |
| 0.25 — four options, the sibling types' floor | **12/rung** | **0.0167** | 0.0012 | 13.6 | 0.287 | fails |
| **0.00 — a floorless responder** | **12/rung** | **0.0025** | 0.0005 | 4.6 | **0.474** | **passes** |

Three readings, in descending order of importance.

1. **The floor is a property of the responder's guessing rate, not of the bank.** At the 0.25 floor
   the sibling types were measured at, this bank returns **0.0167** — within one Monte-Carlo SE of
   `VER-MORPHO-01`'s 0.0166 and `FLU-OPCHAIN-01`'s previously reported 0.0171 at the same setting,
   and of the 0.0176 an idealised grid with no bank returns. Three different banks and no bank land
   on the same number.
2. **At a zero floor A1 passes and recovery exceeds the published figure**: λ̄ = 0.0025 and
   **r = 0.474 against E-095's 0.448**. The defect is therefore specifically the estimator's
   guessing-floor handling, exactly as E-200 localised it. **A floorless responder is not a
   configuration to ship** — it claims a child who knows nothing scores zero on a five-option item,
   which is false — so this row is diagnostic, not a remedy.
3. **This is not fixed here.** Correcting the estimator is a change to `packages/exam-scoring`
   requiring its own decision, and D-200 is still Proposed.

**§9.4's stop rule was written on the premise that an A1 failure indicts the bank** — "a bank that
manufactures λ from a static child cannot be fixed downstream". That premise does not hold here: the
same failure occurs with no bank at all, so stopping this type's track would not address it. Whether
the stop rule should fire anyway is the owner's call. It is flagged rather than quietly worked
around, and the bank was not tuned until it passed.

**A1's per-seed condition passes on 2 of 8 single-seed cells**, because at 400 children the
Monte-Carlo SE is ~0.0032 and the check sits near its threshold. Over 3,200 children it is ~0.0010
and the answer is not close. The pooled verdict is the one reported; the per-seed flipping is
recorded here rather than hidden, because a per-seed vote would have let a check that fails by 8 SEs
read as "mixed".

---

## 5. Gate A — all four checks, both arms, at 30 trials

Mean of 8 seeds, five-option responder floor, the shipped estimator in both roles.

### `FLU-OPCHAIN-01.consistent` — 468 items, 39 rungs, difficulty 1.01–19.99

| check | verdict | observed |
| --- | --- | --- |
| **A1** static-child null | **FAIL** | fitted λ̄ = **0.0088 ± 0.0010**, 8.5 Monte-Carlo SEs from zero, for a cohort that learned nothing |
| **A2** false-positive rate | **PASS** | **15.0%** of static children read `above`, against a 30.9% nominal band rate |
| **A3** no saturation | **PASS** | fastest simulated learner (λ = 0.15), 100 children: **0** bank-limited, 12 scale-limited, **0** blocks exhausted |
| **A4** recovery sanity | **FAIL** | r = **0.335** against E-095's 0.448; mean posterior SE **0.062** against 0.047 |

Fitted-λ SD for U1's power script: **0.0654**.

### `FLU-OPCHAIN-01.perTrial` — 468 items, 39 rungs, difficulty 1.01–19.99

Every cell above reproduces on the scrambled arm: A1 **FAIL** at λ̄ = 0.0088 ± 0.0010, A2 **PASS** at
15.0%, A3 **PASS** at 0 bank-limited, A4 **FAIL** at r = 0.335 and SE 0.062. Fitted-λ SD 0.0653.

**A2 is the check to be least pleased about.** It passes, but a bank with a tighter posterior converts
`indeterminate` refusals into verdicts, and while the contamination floor is non-zero a share of those
verdicts are wrong. A2 passing is not evidence that 15% of real children would be misread; it is
evidence that the readout does not exceed its own nominal rate on a cohort the pipeline is already
manufacturing a climb for. Read A1 and A2 together: **roughly one static child in seven would be
called an above-average learner**, and A2's pass condition does not test that.

### 5.1 A3 in detail, including where it is slightly worse

The headroom sweep pins standing to integers (`--theta0-sd 0 --standing-noise 0`), which is the one
configuration in which the two arms diverge, for the reason
`STAGE2_BANK_RECOVERY_MEASUREMENT.md` §7 quantifies.

| standing | 12/rung bank-limited | 12/rung scale-limited | 6/rung bank-limited | 6/rung scale-limited |
| --- | --- | --- | --- | --- |
| 6–12 | 0 | 0 | 0 | 0 |
| 13 | 1 | 9 | 0 | 8 |
| 14 | 1 | 36 | 0 | 34 |
| 15 | 3 | 77 | 1 | 79 |
| 16 | 0 | 97 | 2 | 97 |
| 17 | 0 | 100 | 0 | 100 |

**A3's own pass condition is met with room** — at the realistic population the harness simulates, 0 of
100 fastest learners are bank-limited and no block exhausts, on both arms. But the integer-standing
sweep is marginally worse than the 6/rung bank at standings 13–15 (1, 1, 3 against 0, 0, 1) and better
at 16 (0 against 2), for a total of 5 against 3 across the sweep. **These are 1–3 counts per 100 in a
0.01-wide window**: the bank's top rung is 19.99 and the scale ceiling is 20.00, so any projection in
[19.99, 20.00) is recorded as bank-limited even though the shortfall is at most 0.01 scale points.
Reporting it as a density improvement would be overclaiming, and reporting it as a regression would
be too — it is noise in the degenerate tie regime, and it is stated rather than dropped.

**The ceiling itself is unchanged and is not a bank problem.** §1.1(c) needs the pool to reach
`standing + 7`, which on a bounded [1, 20] scale exists only for standing ≤ 13. Depth 4 already
reaches 19.99; a depth 5 would land above the scale, not above the ceiling. The remedy, if one is
wanted, is a scale or targeting-rule change. Neither is in scope.

### 5.2 The two arms

| quantity | mean \|Δ\| between arms | max \|Δ\| | for scale |
| --- | --- | --- | --- |
| null-cohort λ̄ | 0.00000 | 0.00005 | the pooled Monte-Carlo SE is 0.0010 |
| recovery r | 0.00012 | 0.00168 | seed-to-seed SD of `r` is ~0.03 |
| mean posterior SE | 0.00000 | 0.00002 | the SE itself is 0.024–0.062 |
| fitted-λ SD | 0.00001 | 0.00018 | the SD itself is ~0.065 |

Over 24 cells (3 lengths × 8 seeds) the largest between-arm difference in the manufactured λ̄ is a
twentieth of that cell's own Monte-Carlo SE. This is item-UUID noise reaching `selectNextNovelItem`'s
tie-break, not system persistence — the simulator has no hidden system to scramble.

**At Gate A the scrambled bank is not an independent check; it is arithmetically identical to A1.**
Its value is entirely at Gate B, with real children, where the two arms can finally differ in the
only way that matters. Building it now was still correct: §4.1.1's argument that a control from a
different code path would confound the contrast stands.

---

## 6. Nothing that previously held has regressed

Each row is re-derived by `check-FLU-OPCHAIN-01.mjs`, which re-implements the D4 algebra, the operator
semantics, the partial-rule taxonomy and the difficulty arithmetic from the documented model rather
than importing them, so a bug in the generator cannot validate itself.

| property that held on `dev` | now |
| --- | --- |
| items whose key is determined by `content` | 0 / 234 → **0 / 468** |
| both arms equated item-for-item, differing only in system persistence | holds — difficulty, key slot, age band, input, option figures and operator chain match positionally on all 468 |
| every distractor tagged with the incomplete rule it encodes | holds — all 468 × 4, every ruleId re-derived and its figure reproduced |
| difficulty monotone in every declared lever | holds — asserted on the model for depth, geometric count and distractor similarity at three similarity levels |
| the checker re-derives the key independently | holds — **100% of both arms**, 936 items |
| coverage: 1–20 at 0.5 grain, ≥5 items per rung | **12 per rung on all 39 rungs**, span 1.01–19.99 |
| key positions at the 5-option floor | A:94 B:94 C:94 D:93 E:93 — modal advantage **+0.1pt** over 20.0% |
| band ladder respected (§4.3 developmental floor) | holds — K-1:72, 2-3:96, 4-5:96, 6-8:204 |
| one hidden system in the live arm, one per item in the control | holds — 1 and 468 |
| the control arm is unservable | holds — `control-banks/`, and the `apps/web` suite asserts the loader, the sync script and the registry all refuse it |
| regeneration is deterministic | holds — SHA-256 identical across three consecutive runs |

Two properties are **new**: all five options relabelling-reachable on every item, and 468/468
distinct stimuli under an order-insensitive fingerprint. Both are asserted by the checker.

**The checker has teeth**, verified by injection rather than assumed. Three defects were introduced
into the shipped bank and all three were caught: one option's figure replaced with an unreachable one
(9 failures across four independent checks), the shipped per-item anti-leak audit tampered with while
the item was left intact (4 failures), and the `voteRankTarget` lever flattened to a single rank
(3 failures, including two reproducibility failures and the rank-balance check). The restored banks
pass.

**Verification run on this branch:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and
`pnpm test` (910 tests across 59 files, including the bank conformance suite and the 18-test
`stage2-opchain` suite that drives the renderer through the real embedding protocol) all pass.
`pnpm exam:sync:check` reports the demos and `registry.generated.ts` up to date; the registry entry
was regenerated by `scripts/sync-exam-demos.mjs` rather than hand-edited.

---

## 7. Boundaries, and what remains open

**What this report establishes.** The 12/rung bank sits on the bank-free recovery bound at 30, 45 and
60 trials where the 6/rung bank measurably did not at 45 and 60; the answer key is not derivable from
`content` at 0 determined items and a graded attacker of 23.4% in the worst slice against a 20.0%
floor, under an attack strictly stronger than the one previously published; the difficulty ladder is
monotone in every declared lever and does not saturate; and the pipeline's manufactured λ on this bank
is indistinguishable from what it manufactures with no bank at all.

**What it does not.**

- That the type measures learning in children. Gate B, ~128 children, and no synthetic run
  substitutes. Both banks ship `validated: false` and `syntheticOnly: true`.
- That 12/rung helps at 30 trials. It does not: +0.002, t = 0.7. The gain is at 45–60 trials, and is
  worth having only if a longer block is authorised.
- That the residual 0.0088 can be removed. §4 isolates it as an estimator property and costs no
  remedy.
- That the remaining 21.6% anti-leak residual is irreducible. §3.4 names both causes and what would
  close each.
- That the strategy-trace concentration in §3.3 is acceptable. That is a judgement about how much
  diagnostic value a wrong answer needs to carry, and it is the owner's.

**If the owner accepts these figures, the governance record would need** (all deferred to U9, per
§9.3's "last and once"): an E-family entry for the paired bank-free comparison and the measured
contamination floor of 0.0088 ± 0.0010 at 30 trials; the fitted-λ SD of **0.0654** for U1's power
script, in place of §4.1.3's 0.06 estimate; an amendment recording that the graded anti-leak figure
previously published for this type was measured against a strictly weaker attack family than the one
in §3.2; and a decision on whether §9.4's A1 stop rule fires when the failure is demonstrably not
attributable to the bank.

**No type is recorded as gate-passing.** Neither arm is wired into the live learning block as a
validated instrument, and Gate B has not run.
