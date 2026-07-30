# Stage 2 — Is the 30-trial learning rate recoverable on a bank built for it?

**Status:** Measurement report. **Nothing was changed.** The estimator
(`packages/exam-scoring/src/learning-curve.ts`), the readout (`learning-rate-readout.ts`), the banks,
the generator and the harness (`scripts/exam-learning-block-harness.ts`) are byte-identical to their
state on the baseline described below. This work is additive only, and adds three files:

- this document;
- `scripts/stage2-bank-recovery-runs.sh` — a record of the 130 harness invocations behind every
  figure here. It contains no measurement logic; it calls `pnpm exam:block-harness` with existing
  flags and captures the output;
- `scripts/stage2-arm-equivalence-probe.ts` (`pnpm exam:arm-equivalence`) — the one measurement that
  is not a harness invocation, explaining §7's zero between-arm contrast. It reads the two bank
  files and replays the shipped administration path; it changes nothing and imports the same
  `nextTargetTheta` and `selectNextNovelItem` the harness drives.

**Baseline:** `origin/dev` @ `54bd736` with `feat/exam-guessing-floor` (PR #22, D-200 **Proposed**,
awaiting owner sign-off) merged in. PR #22's corrected estimator — `DEFAULT_GUESSING = 0.2` in both
the readout fit and `nextTargetTheta` — is the estimator throughout. PR #22 is **not** merged to
`dev` by this work.

**Requirements served:** R6 (measure growth without a gifted-student ceiling — this is the readout
that requirement rests on), R7 (auditable and falsifiable — every figure below is a command),
R10 (state the boundaries of every conclusion), H6 (design for enough statistical information).

**Evidence used:** E-095 (the recovery ladder by block length, which every table here is measured
against) and E-200 (the guessing-floor defect, the loop attribution, and the two contamination
floors this work compares against). Those are the only two this rests on, so they are the only two
cited. **No new E or D ID is claimed.** D-200 is still Proposed and §9.3 of
`STAGE2_QUESTION_DESIGN.md` puts the governance unit (U9) last and once; minting evidence IDs for a
measurement that may inform a decision the owner has not yet taken would pre-empt both. §10 lists
what would need to be recorded if the owner accepts these figures.

**In scope:** the five measurements named below, on `FLU-OPCHAIN-01.consistent` and
`.perTrial`, against the ideal grid and `FLU-MATRIX-01` at matched settings.
**Out of scope:** any change to the estimator, readout, banks, generator, harness, or served pool;
difficulty calibration; a reference distribution for λ; Gate B.

---

## 1. The answer

**No. A bank purpose-built for this measurement does not make the 30-trial learning rate
recoverable, and the reason is that the bank was never the binding constraint.**

`FLU-OPCHAIN-01.consistent` closes the *bank-attributable* part of the gap completely. At 30 trials
it is statistically indistinguishable from an idealised 0.5-point grid with no bank involved at all
(paired difference in recovery r over 8 seeds: **−0.002 ± 0.006, t = −0.36**), and it clearly beats
the wired bank `FLU-MATRIX-01` (**+0.047 ± 0.010, t = 4.8**). That is the whole of what a bank can
deliver, and the purpose-built bank delivers it.

It is not enough, and the ideal-grid row is what proves it cannot be. On that bank, with a correctly
specified five-option floor and no design defect left to fix:

- a cohort that **learned nothing at all** still fits **λ̄ = 0.0097 ± 0.0011**, which is **8.6
  Monte-Carlo SEs from zero** over 3,200 simulated children;
- recovery of an injected climb is **r = 0.332** against E-095's published 30-trial figure of
  **0.448**, and mean posterior SE is **0.063** against E-095's **0.047**;
- against the SD-0.03 reference — the only reference in this project with a stated provenance —
  **100% of blocks are `indeterminate` at 30, 45 and 60 trials**, exactly as on every previously
  tested arm.

The idealised grid is a bank-free lower bound: it is what the estimator does when the item pool is
perfect. It carries **λ̄ = 0.0085 ± 0.0013** and **r = 0.334** at the same settings. The
purpose-built bank has reached that bound. There is no bank on the other side of it, so **"build the
right bank" is now an answered question, and the answer did not move the measurement.**

**Recommendation follows from that, and it is the narrower of the two on offer:** stop treating an
absolute learning-rate readout at 30 trials as something a bank can rescue. `learningRateCohortRank`
— ordinal, within a cohort measured the same way — remains the supported question, unchanged from
D-030 and PR #22.

**The one thing that did change, and it is worth having.** The bank buys *length-efficiency*, not
30-trial recoverability, and the effect is large and grows with length:

| paired r difference, 8 seeds | 30 trials | 45 trials | 60 trials |
| --- | --- | --- | --- |
| `FLU-OPCHAIN-01` − `FLU-MATRIX-01` | +0.047 (t = 4.8) | **+0.137** (t = 13.4) | **+0.240** (t = 17.5) |

`FLU-OPCHAIN-01` reaches E-095's published 30-trial recovery (0.448) at about 45 trials (0.529);
`FLU-MATRIX-01` does not reach it by 60 (0.419). So if the owner ever authorises a 45–60 trial
block, which bank it runs on matters a great deal. At 30 trials it does not.

---

## 2. What was run, and how to re-run it

```
bash scripts/stage2-bank-recovery-runs.sh [output-dir]   # ~2.5 minutes, 130 harness runs + the probe
```

Every figure in this document comes out of that script. All but one of its runs is
`pnpm exam:block-harness` with existing flags. Two conventions hold throughout and are what make
the pools comparable:

- **`--guessing 0.2` is the simulated child's floor** — a real five-option item. `FLU-OPCHAIN-01` is
  234/234 five-option, so 0.2 is exact for it. `FLU-MATRIX-01` is mixed (63 four-option, 27
  five-option, 30 six-option), so 0.2 is an approximation there — the same approximation PR #22
  made, kept deliberately so the cells line up. `--fix-probe` pins its own responder at 0.2.
- **everything else is the harness default**: 400 children per cell, λ ~ N(0.06, 0.03²),
  θ0 ~ N(10.5, 3²), handover-noise SD 1.5, slope 1.0, target offset +1, and PR #22's corrected
  estimator floor of 0.2 in both roles.

The baseline was verified before anything new was measured: `--fix-probe --bank FLU-MATRIX-01`
reproduces PR #22's `FLU-MATRIX-01` table cell-for-cell (λ̄ = 0.0183 ± 0.0035, 12.8% false `above`,
r = 0.249, mean SE = 0.072, 37.8% / 94.5% / 100% indeterminate), and `--calibrate --guessing 0.2`
reproduces its corrected E-095 ladder.

**No harness change was needed.** Two measurements that looked as though they might need one do not:
the ladder on a named bank comes from `--gate-a --length N` (whose A4 cohort is built by the same
`cohortOptionsFor` call at the same seed as `--calibrate`'s, so the cells are matched rather than
merely similar), and the headroom question comes from Gate A's A3 counts with the population spread
collapsed by `--theta0-sd 0 --standing-noise 0`.

---

## 3. The comparative table — three pools, matched settings

30 trials, responder floor 0.2, PR #22's corrected estimator in both roles, 400 children, seed
20260730. This is the `fit + targeting (c = 0.2)` row of `--fix-probe` for each pool, so it is
directly comparable to PR #22's own tables cell-for-cell.

| metric | ideal 0.5-point grid | `FLU-MATRIX-01` | `FLU-OPCHAIN-01.consistent` | `FLU-OPCHAIN-01.perTrial` |
| --- | --- | --- | --- | --- |
| null-cohort λ̄ (λ_true = 0) | 0.0098 | 0.0183 | **0.0096** | **0.0096** |
| ± Monte-Carlo SE | 0.0033 | 0.0035 | 0.0033 | 0.0033 |
| false `above` rate | 14.0% | 12.8% | **16.5%** | **16.5%** |
| recovery r | 0.254 | 0.249 | **0.275** | **0.275** |
| mean posterior SE | 0.062 | 0.072 | **0.063** | **0.063** |
| attenuation slope | 0.603 | 0.572 | 0.633 | 0.633 |
| `indeterminate`, SD 0.15, floor 0 | 7.8% | 37.8% | **8.8%** | **8.8%** |
| `indeterminate`, SD 0.15, **floor declared** | 32.0% | 94.5% | **32.8%** | **32.8%** |
| `indeterminate`, SD 0.03 | 100.0% | 100.0% | **100.0%** | **100.0%** |
| items / distinct 0.5-point rungs | 468 / 39 | 120 / 39 | 234 / 39 | 234 / 39 |
| option count | n/a | 4, 5 and 6 | 5 (all) | 5 (all) |

Read across the row rather than down the column: on every metric except false `above`,
`FLU-OPCHAIN-01` sits on the **ideal-grid** value, not the `FLU-MATRIX-01` value. The bank has
stopped being the problem.

**The false-`above` row is the one to be suspicious about, and it is not a rounding artifact.** The
purpose-built bank manufactures *less* λ than `FLU-MATRIX-01` (0.0096 vs 0.0183) and yet issues
*more* wrong `above` verdicts (16.5% vs 12.8%). The mechanism is visible two rows down: the wider
posterior on `FLU-MATRIX-01` sends 37.8% of blocks to `indeterminate`, and a block that refuses to
name a band cannot name a wrong one. Tightening the posterior converts refusals into verdicts, and
while the floor is non-zero a share of those verdicts are wrong. **Better precision on a
contaminated estimate produces more false positives, not fewer** — which is worth stating plainly
because "the purpose-built bank has a smaller floor and a tighter posterior" reads like unambiguous
good news and is not.

### 3.1 Which of these differences survive replication

The seed matters more than it should, so every load-bearing cell was re-measured at 8 seeds
(3,200 children per cell). Differences are paired — the same seed builds the same simulated
children for every pool — so they are tighter than the columns suggest.

| quantity, 30 trials | ideal grid | `FLU-MATRIX-01` | `FLU-OPCHAIN-01` (both arms) |
| --- | --- | --- | --- |
| null λ̄, mean of 8 seeds | 0.0085 | 0.0162 | 0.0097 |
| ± SE of that mean | 0.0013 | 0.0011 | 0.0011 |
| **SEs from zero** | **6.5** | **14.8** | **8.6** |
| recovery r, mean of 8 seeds | 0.334 | 0.285 | 0.332 |
| ± SE / [min, max] | 0.014 / [0.254, 0.385] | 0.014 / [0.211, 0.337] | 0.010 / [0.275, 0.370] |
| mean posterior SE | 0.063 | 0.072 | 0.063 |
| fitted-λ SD (for U1's power script) | — | 0.0652 | 0.0652 |

| paired contrast, 30 trials | mean | SE | t | verdict |
| --- | --- | --- | --- | --- |
| null λ̄: `FLU-MATRIX-01` − `FLU-OPCHAIN-01` | +0.0065 | 0.0008 | 8.0 | real — the new bank halves the old bank's excess |
| null λ̄: `FLU-OPCHAIN-01` − ideal grid | +0.0012 | 0.0006 | 2.1 | marginal — at or just above the bank-free bound |
| r: `FLU-OPCHAIN-01` − `FLU-MATRIX-01` | +0.047 | 0.010 | 4.8 | real, and small |
| r: `FLU-OPCHAIN-01` − ideal grid | −0.002 | 0.006 | −0.4 | **no difference** |

The decisive line is the last one at 30 trials paired with the third line of the table above:
`FLU-OPCHAIN-01` has arrived at the ideal grid, and the ideal grid is **6.5 Monte-Carlo SEs from
zero** on a cohort that did not learn.

---

## 4. Null-cohort contamination, by length

λ_true = 0 for every child, real five-option floor, corrected estimator. Mean of 8 seeds; the
`SEs from 0` column is the honest test of "is this floor real".

| pool | 8 | 15 | 30 | 45 | 60 |
| --- | --- | --- | --- | --- | --- |
| `FLU-MATRIX-01` λ̄ | 0.0081 | 0.0123 | 0.0162 | 0.0192 | 0.0157 |
| `FLU-OPCHAIN-01` λ̄ (both arms) | 0.0083 | 0.0117 | **0.0097** | **0.0093** | **0.0094** |
| `FLU-OPCHAIN-01` SEs from zero | 14.1 | 16.9 | 8.6 | 17.0 | 13.4 |
| `FLU-OPCHAIN-01` false `above` | 0.0% | 0.0% | 13.4% | 7.1% | 3.3% |
| `FLU-OPCHAIN-01` mean posterior SE | 0.144 | 0.118 | 0.063 | 0.039 | 0.028 |

**The floor does not fall with block length, and the posterior SE does.** On the purpose-built bank
the manufactured rate is flat from 30 to 60 trials — 0.0097, 0.0093, 0.0094, all inside each other's
standard errors — while the posterior SE more than halves, 0.063 → 0.028. So the systematic term
roughly doubles as a fraction of the random one over that range (0.15 → 0.34 of the posterior SE).
**Block length buys down the random error and leaves the systematic one where it is.** That is the
same conclusion PR #22 reached from a different direction, now measured on a bank with nothing left
to blame.

The 0% false-`above` cells at 8 and 15 trials are not a good result — at those lengths the posterior
is so wide that no block is separable at all, so every one reads `indeterminate`.

---

## 5. The recovery ladder, against the corrected E-095 ladder

Mean r over 8 seeds. E-095's published column was measured against a child with **no** guessing
floor; nothing in any bank is a constructed-response item, so it is a ceiling, not a target.

| trials | ideal grid | `FLU-MATRIX-01` | `FLU-OPCHAIN-01` (both arms) | E-095 (floorless) |
| --- | --- | --- | --- | --- |
| 8 | 0.046 | 0.048 | 0.056 | 0.066 |
| 15 | 0.179 | 0.180 | 0.182 | 0.183 |
| **30** | **0.334** | **0.285** | **0.332** | **0.448** |
| 45 | 0.549 | 0.392 | 0.529 | 0.746 |
| 60 | 0.700 | 0.419 | 0.659 | 0.862 |

| mean posterior SE | ideal grid | `FLU-MATRIX-01` | `FLU-OPCHAIN-01` | E-095 |
| --- | --- | --- | --- | --- |
| 8 | 0.144 | 0.144 | 0.144 | 0.138 |
| 15 | 0.118 | 0.119 | 0.118 | 0.101 |
| **30** | **0.063** | **0.072** | **0.063** | **0.047** |
| 45 | 0.037 | 0.054 | 0.039 | 0.026 |
| 60 | 0.024 | 0.047 | 0.028 | 0.017 |

Three readings, in descending order of importance.

1. **No pool reaches the published 30-trial recovery at 30 trials.** The best available is 0.334,
   against 0.448. That gap is the five-option floor, and it is not a bank property: the ideal grid
   carries it too.
2. **`FLU-OPCHAIN-01` tracks the ideal grid up to about 45 trials and then falls slightly behind**
   (0.529 vs 0.549 at 45, t = −4.6; 0.659 vs 0.700 at 60, t = −7.0). The most likely reason is pool
   depth per rung — the harness's ideal grid carries 12 items per 0.5-point rung and
   `FLU-OPCHAIN-01` carries 6, and a 60-trial block visiting a narrow band of rungs will exhaust the
   good ones sooner. **This is a conjecture I did not test**; a decisive version would re-run the
   grid at `perRung = 6`, which is a one-line change to a hard-wired constant in the harness and
   therefore out of scope here. It matters only if a 45–60 trial block is ever authorised.
3. **`FLU-MATRIX-01` stops improving after 45 trials** (0.392 → 0.419) while both other pools keep
   climbing. Its 120 items across 39 rungs is roughly 3 per rung, and PR #22's finding that 60
   trials never reach the published 30-trial figure on that bank reproduces here.

---

## 6. Indeterminate rate under the required contamination floor

D-200 makes `LearningRateReference.contaminationFloor` required with no default, and tests
separability against posterior SE **plus** that floor. The `floor declared` column below is each
arm's *own* measured null-cohort λ̄, which is what D-200 asks a caller to supply.

| reference | ideal grid | `FLU-MATRIX-01` | `FLU-OPCHAIN-01` (both arms) |
| --- | --- | --- | --- |
| SD 0.15, floor 0 — 30 trials | 7.8% | 37.8% | 8.8% |
| SD 0.15, **floor declared** — 30 trials | **32.0%** | **94.5%** | **32.8%** |
| SD 0.15, floor declared — 45 trials | 0.5% | 51.5% | 0.8% |
| SD 0.15, floor declared — 60 trials | 0.5% | 19.3% | 0.5% |
| **SD 0.03 — 30, 45 and 60 trials** | **100.0%** | **100.0%** | **100.0%** |

The improvement in the middle row is real and large: **94.5% → 32.8%** indeterminate at 30 trials
under the bar PR #22 makes required. It is also the least useful large number in this document,
because it exists only against the SD-0.15 reference, which the harness's own source calls "not an
honest reference" and `exam-phase2-demo.ts` flags as "not a claim about children". It is the widest
spread anyone has proposed and it was chosen because it is the smallest at which bands separate at
all at this length — not because anyone believes children are spread that way.

Against the SD-0.03 reference the project's own synthetic work used, **nothing moved**: 100%
indeterminate on every pool at 30, 45 and 60 trials — the three lengths `--fix-probe` reports —
before and after the purpose-built bank, exactly as PR #22 reported. The 8- and 15-trial cells were
not measured against that reference and do not need to be: the posterior SE alone is 0.144 and
0.118 there, against a band half-width of 0.015.

**The derived figure that makes this concrete.** The readout names a band only when
`lambdaSe + contaminationFloor < 0.5 × sd`. Rearranged, the smallest reference SD at which any band
can be named is `2 × (mean posterior SE + floor)`. This is arithmetic on the measured cells above,
not a separate measurement:

| pool | 30 trials | 45 trials | 60 trials |
| --- | --- | --- | --- |
| ideal grid | 0.143 | — | — |
| `FLU-MATRIX-01` | 0.176 | 0.146 | 0.125 |
| `FLU-OPCHAIN-01` | **0.145** | **0.097** | **0.075** |

On the purpose-built bank, **no block length up to 60 trials brings the required reference SD below
0.075**, and the only reference with a stated provenance is 0.03. A reference distribution remains
necessary and is still nowhere near sufficient.

---

## 7. The scrambled control (D-S2-3), and what it can and cannot show

**Result: in every measurement configuration in this document, the between-arm contrast is exactly
zero — every cell, every length, every seed.**

| contrast, `perTrial` − `consistent` | 8 | 15 | 30 | 45 | 60 |
| --- | --- | --- | --- | --- | --- |
| null-cohort λ̄ | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| recovery r | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |

That is not a rounding statement. The complete `--fix-probe` output for the two arms — 9 arms × 9
metrics — is identical line-for-line once the bank name is normalised, and all **40** Gate A report
pairs (8 seeds × 5 lengths) match in every cell.

**Why, exactly.** PR #20 built the two banks to be equated item-for-item on every scored property,
differing only in whether the hidden operator vocabulary persists across trials. Verified here:
the two files carry **identical difficulty vectors, 234/234 positionally**, and differ only in their
item UUIDs. The harness's simulated child responds to `difficulty` and nothing else — there is no
hidden system in the simulator to persist or scramble. `itemId` enters only as a tie-break in
`selectNextNovelItem`, and only when two candidates are *exactly* equidistant from the target, which
for the continuous targets `nextTargetTheta` produces is a measure-zero event. Replaying the
administration path for 400 blocks of 60 trials confirms it:

| standings used | blocks whose served-difficulty sequence differs between arms |
| --- | --- |
| continuous, as the harness draws them | **0 of 400** |
| exactly integer, which manufactures exact ties | 280 of 400 |

**The one place the arms do differ, and how big it is.** The §8 headroom sweep pins standing to
integers by construction (`--theta0-sd 0 --standing-noise 0 --theta0-mean N`), so it sits in the
degenerate row of that table and the two arms diverge — not only in A3's saturation counts but in
all four checks. Across the ten swept standings the divergence is:

| quantity | mean \|Δ\| between arms | max | for scale |
| --- | --- | --- | --- |
| null-cohort λ̄ | 0.0007 | 0.0016 | Monte-Carlo SE is 0.0030 |
| recovery r | 0.011 | 0.030 | seed-to-seed SD is 0.029 |
| false `above` | 0.8 pp | 2.0 pp | — |

This is item-UUID noise, not system persistence, and it is worth having as a number rather than a
caveat: **it bounds the artifact floor of any future between-arm λ contrast at ≈0.0016 even under
maximal tie pressure** — about a sixth of the contamination floor itself, and well inside
Monte-Carlo error. A real between-arm difference would have to clear that, and it is not the
constraint that will bind.

**What this establishes, stated at its real strength: the pipeline does not manufacture a
between-arm difference out of the arm label.** That is a genuine check and it passes. It is the
converse direction §4.1.2 of `STAGE2_QUESTION_DESIGN.md` says Gate A is for, and nothing more.

**What it does not establish, and the framing matters more than the number.** With simulated
children this is a pipeline check, not evidence the type measures learning. A simulator's climb is
written by the simulator: the harness models no difference in child behaviour between arms, so
recovering one would have been a bug. The result cannot distinguish "the two banks are equated"
from "the type works", because the same zero is what both would produce here.

**Two consequences the owner should have.**

1. **The contamination floor for this type, which D-S2-3 defines as "any λ recovered on the
   scrambled arm", is `λ̄ = 0.0097 ± 0.0011` at 30 trials — 8.6 SEs from zero.** It is non-zero, it
   is measured, and it is the number D-200 requires a caller to declare. It is also, necessarily,
   identical to the consistent arm's own null-cohort figure.
2. **At Gate A the scrambled bank is not an independent check — it is arithmetically identical to
   A1.** Running it adds no information the static-child null cohort did not already give, and this
   is a property of synthetic children rather than a defect in the bank or the gate. The `perTrial`
   bank's value is entirely at Gate B, with real children, where the two arms can finally differ in
   the only way that matters. Building it before the renderer was still correct — §4.1.1's argument
   that a control produced by a different generator would confound the contrast stands — but nobody
   should read a Gate A pass on the scrambled arm as the gate D-S2-3 made binding.

---

## 8. Headroom — does the purpose-built grid deliver §1.1(c)?

§1.1(c) asks for ≥6 scale points of usable headroom above `standing + 1`, at ≈0.5 granularity, for
every standing a real child can arrive with. Gate A's A3 separates the two reasons a child pins at
the top of the pool: the **bank** stopping below what the targeting rule asked for, which is the
§1.1(c) defect, and `nextTargetTheta` clamping the projection to the 20-point scale, which no bank
can fix. Sweep of the fastest simulated learner (λ = 0.15, 30 trials, 100 children per cell) with
the population spread collapsed so `standing` is exactly the swept value:

| standing | `FLU-OPCHAIN-01` bank-limited | `FLU-OPCHAIN-01` scale-limited | `FLU-MATRIX-01` bank-limited | `FLU-MATRIX-01` scale-limited |
| --- | --- | --- | --- | --- |
| 6 | 0 | 0 | 0 | 0 |
| 8 | 0 | 0 | 0 | 0 |
| 10 | 0 | 0 | 0 | 0 |
| 11 | 0 | 0 | 0 | 0 |
| 12 | 0 | **1** | 0 | 0 |
| 13 | 0 | **8** | 1 | 5 |
| 14 | 0 | **34** | 7 | 31 |
| 15 | 1 | **79** | 10 | 77 |
| 16 | 2 | **97** | 7 | 93 |
| 17 | 0 | **100** | 0 | 100 |

`FLU-OPCHAIN-01` columns are the `consistent` arm; the `perTrial` arm's counts differ by at most 1
per cell, for the reason §7 quantifies.

**Where truncation begins: standing 12, and it is a scale-ceiling effect, not a bank defect.** The
first truncated child appears at standing 12 (1 in 100); it is 8% at standing 13, 34% at 14, 79% at
15, and total at 17. That is exactly where the geometry predicts — §1.1(c) needs the pool to reach
`standing + 7`, which on a bounded [1, 20] scale is available only for standing ≤ 13. **PR #20's
finding that §1.1(c) is unachievable as written above standing 13 is confirmed and now located.**

**The purpose-built grid delivers everything a bank can deliver.** Bank-limited truncation is 0 at
every standing from 6 to 14, against `FLU-MATRIX-01`'s 1, 7, 10 and 7 at standings 13–16. The 1–2
per 100 at standings 15 and 16 are not a headroom shortfall in any meaningful sense: the bank's top
rung is 19.98 and the scale ceiling is 20.00, so a projection anywhere in [19.98, 20.00) is recorded
as bank-limited even though the shortfall is at most **0.02 scale points**. They also differ by 1
between the two arms, which is the integer-standing tie-break quantified in §7 — this sweep is the
one configuration in this document where the two arms are not identical, and the reason is the
integer standings it pins, not the persistence mode.

At the realistic population the harness simulates (θ0 ~ N(10.5, 3²)), **12 of 100** fastest learners
truncate on `FLU-OPCHAIN-01` and all 12 are scale-limited; on `FLU-MATRIX-01` it is 14 scale-limited
plus 1 bank-limited, which is why A3 passes on the new bank and fails on the old one.

**So the headroom answer is split.** The bank requirement in §1.1(c) is met as fully as a bank can
meet it. The requirement as *written* — "for every standing value a real child can arrive with" — is
not met and cannot be, and the residue lands on roughly an eighth of the fastest learners in a
realistic cohort. That is a truncation of the top of the λ distribution exactly where §1.1(c)
warned, and the remedy, if one is wanted, is a scale change or a targeting-rule change rather than a
bank change. Neither is in scope here.

---

## 9. Two things that change how earlier numbers should be read

Both were found while checking this work's own figures. Neither changes any conclusion in PR #20 or
PR #22; both mean specific quoted numbers should not be read to three decimals.

**1. The harness's default seed is unrepresentative, in both directions.** Seed 20260730 returns the
**lowest** 30-trial recovery and the **highest** 15-trial recovery of the eight seeds sampled:

| ideal grid, r | 8 | 15 | 30 | 45 | 60 |
| --- | --- | --- | --- | --- | --- |
| seed 20260730 (the default) | 0.054 | **0.297** | **0.254** | 0.532 | 0.680 |
| mean of 8 seeds | 0.046 | 0.179 | 0.334 | 0.549 | 0.700 |
| [min, max] over 8 seeds | [−0.030, 0.119] | [0.130, 0.297] | [0.254, 0.385] | [0.521, 0.617] | [0.658, 0.758] |

At the default seed the 15-trial cell (0.297) exceeds the 30-trial cell (0.254), which reads as a
non-monotone ladder and is not one — across seeds the ladder is properly monotone. PR #22's quoted
`r = 0.254` (grid) and `0.249` (`FLU-MATRIX-01`) at 30 trials are single-seed draws at the bottom of
that spread; the 8-seed means are 0.334 and 0.285. **This does not change PR #22's conclusion** —
0.334 is still far below 0.448, and its λ̄ figures move the same way and stay far from zero
(grid 0.0098 → 0.0085; `FLU-MATRIX-01` 0.0183 → 0.0162). It does mean single-seed cells from this
harness carry roughly ±0.04 of seed noise on `r`, which is larger than several of the differences
this document reports, and is why §3.1 exists.

**2. The 30-trial cell is sensitive to a parameter E-095 never recorded.** `--noise-sweep` already
showed this for the ideal grid; the same sweep on the purpose-built bank behaves the same way
(30 trials, seed 20260730):

| handover-noise SD | 0 | 0.5 | 1.0 | **1.5 (default)** | 2.0 | 3.0 |
| --- | --- | --- | --- | --- | --- | --- |
| ideal grid r | 0.374 | 0.348 | 0.446 | **0.254** | 0.313 | 0.260 |
| `FLU-OPCHAIN-01` r | 0.380 | 0.326 | 0.408 | **0.275** | 0.299 | 0.275 |
| `FLU-OPCHAIN-01` null λ̄ | 0.0142 | 0.0144 | 0.0120 | **0.0096** | 0.0104 | 0.0057 |

Neither the θ0 distribution nor the handover-noise SD that produced E-095 is in the register, so the
absolute level of every `r` in this document carries an unquantified systematic uncertainty on top
of the seed noise. The between-pool contrasts do not: they are paired at the same noise setting and
the same children. **Read the contrasts as measured and the absolute levels as approximate** — which
cuts in the same direction as the headline, since it is the absolute levels that a reportable rate
would depend on.

---

## 10. Boundaries, and what remains open

**Claim boundary.** Everything here is born-synthetic against banks carrying `validated: false` and
`syntheticOnly: true`. No output is evidence about a real child. Passing Gate A is not passing the
gate D-S2-3 made binding (§4.1.5). Nothing here says the block measures learning; it says what the
pipeline does to a bank, which is the converse and the only non-circular thing a harness can say.

**What this does not answer.**

- Whether `FLU-OPCHAIN-01` measures learning in children. That is Gate B, needs ~128 children, and
  no overnight loop produces those.
- Whether the residual 0.0097 can be removed at all. This work isolates it as an estimator-plus-loop
  property rather than a bank property; it does not cost a remedy. PR #22 costed the remedies that
  exist and rejected an estimated 3PL floor as unidentifiable from 30 dichotomous responses.
- Whether a graded response model would narrow `lambdaSe` enough to matter. §1.1(e) says partial
  credit under the current Bernoulli information calculation will not, and that is unchanged and
  untested here.
- Whether the §5 pool-depth conjecture (6 vs 12 items per rung at 45–60 trials) is right.

**If the owner accepts these figures, the governance record would need** (all deferred to U9, none
done here, per §9.3's "last and once"): an E-family entry for the three-pool comparison and the
measured contamination floor of 0.0097 ± 0.0011 for `FLU-OPCHAIN-01` at 30 trials; the fitted-λ SD
of **0.0652**, which §4.1.3 requires U1's power script to use in place of the document's 0.06
estimate; an amendment to E-095 recording the seed sensitivity in §9; and, if the recommendation in
§1 is taken, a decision entry retiring the absolute learning-rate readout as a target.

**A1 status, recorded plainly.** Gate A's A1 check **fails** on `FLU-OPCHAIN-01` in both modes at
30 trials (λ̄ = 0.0096 ± 0.0033, condition |λ̄| ≤ 2 SE), as it does on `FLU-MATRIX-01` and on the
ideal grid. Under §9.4's stop rule an A1 failure stops a type's track at U5. **That stop rule was
written on the assumption that A1 failure indicts the bank** — "a bank that manufactures λ from a
static child cannot be fixed downstream". These measurements show the assumption does not hold in
this case: the same failure occurs with no bank at all, so it is not `FLU-OPCHAIN-01`'s defect and
stopping its track would not address it. Whether the stop rule should fire anyway is the owner's
call and is not resolved here; it is flagged rather than quietly worked around.

---

## Appendix — command index

| § | figures | command |
| --- | --- | --- |
| 2 | baseline reproduction of PR #22 | `pnpm exam:block-harness -- --fix-probe --bank FLU-MATRIX-01` |
| 3, 6 | comparative table, indeterminate rates | `pnpm exam:block-harness -- --fix-probe --bank FLU-OPCHAIN-01.consistent` |
| 3, 7 | scrambled arm | `pnpm exam:block-harness -- --fix-probe --bank FLU-OPCHAIN-01.perTrial` |
| 5, 9 | ladder, ideal grid and `FLU-MATRIX-01` | `pnpm exam:block-harness -- --calibrate --guessing 0.2` |
| 4, 5 | ladder and null cohort, `FLU-OPCHAIN-01` | `pnpm exam:block-harness -- --gate-a --bank FLU-OPCHAIN-01 --guessing 0.2 --length {8,15,30,45,60}` |
| 8 | headroom sweep | `pnpm exam:block-harness -- --gate-a --bank FLU-OPCHAIN-01 --guessing 0.2 --theta0-mean N --theta0-sd 0 --standing-noise 0` |
| 9 | noise sensitivity | `pnpm exam:block-harness -- --noise-sweep --guessing 0.2` and `-- --gate-a --bank FLU-OPCHAIN-01 --guessing 0.2 --standing-noise N` |
| 3.1, 9 | seed replication | the same commands with `--seed {20260730,11,22,33,44,55,66,77}` |
| 7 | why the arms are identical | `pnpm exam:arm-equivalence` |
| all | everything above, in order | `bash scripts/stage2-bank-recovery-runs.sh` |
