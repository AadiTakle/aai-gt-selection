# The residual learning rate is endogeneity, and removing it costs more than it buys

**Status:** Measurement report. It closes the question three Stage 2 Gate A reports left open — what the
residual A1 failure is, once the guessing floor is correct and the bank is ruled out — and prices the
only family of remedies that works. **The remedy is implemented behind an opt-in and is not adopted.**
D-206 is **Proposed**; `nextTargetTheta` remains the shipped default, nothing is wired into the live
learning block, and no user-facing surface reports anything differently.

**Requirements served:** R9, R10 (claim boundaries — the readout is shown about a child, and a
manufactured climb is a false claim about them however small), R7 (auditability — the cause, every
refuted candidate and every cost below is a command), R5, R6 (measure growth without a
gifted-student ceiling, which is what the remedy's cost threatens and why this is a decision rather
than a fix).

**Evidence used:** E-200 (the guessing-floor defect, the loop attribution, and the residual this
report explains), E-095 as amended (the recovery ladder A4 is judged against). **New:** E-205.
**New decision:** D-206, Proposed.

**In scope:** what causes the residual; whether conditioning on served difficulty removes it; what
does; and what that costs, measured as Gate A before and after on all four banks a Stage 2 track has
measured plus a bank-free grid. **Out of scope:** any change to a bank, generator or renderer; any
wiring into the live block; any change to what a user-facing surface reports; Gate B; and the
question of whether Stage 2's A1 stop rule should fire, which this report informs and does not
answer.

**Claim boundary, before any number.** Everything here is born-synthetic against banks carrying
`validated: false` and `syntheticOnly: true`. No output is evidence about a real child. Gate B has
not run, so nothing here licenses reporting an absolute learning rate for anybody. The attribution
below rests on a simulated responder whose true ability really is flat — which is exactly the
condition no real cohort can be known to satisfy.

---

## 1. The answer

**The residual is endogeneity of the adaptive design. Conditioning the fit on served difficulty was
the first hypothesis and it is refuted: it roughly doubles the artifact. Breaking the loop removes
it. The price is about a third more posterior width, which is worse for A4 and takes 12 to 16 points
off how often a band can be named at all — so on every pool whose guessing floor was already correct
the remedy costs more reportability than the bias it removes.**

Four independent measurements had localised the defect to the interaction between the guessing floor
and the adaptive targeting loop: three banks in three domains and a grid containing no items all
returned λ̄ ≈ +0.009 for a cohort that learned nothing, and freezing the served difficulty nearly
eliminated it. What that could not distinguish is *which part* of the loop. Freezing removes two
things at once — the difficulty stops rising, **and** it stops depending on the child's answers.

One contrast separates them. Replay each child's own adaptive difficulty path a second time against
an independent stream of answers. The path's shape, the child's ability and the standing handover are
all identical; the only thing cut is the dependence between the answers being fitted and the path
they were served at.

| pool | administration | null λ̄ | ± MC SE | difficulty climb across the block |
| --- | --- | --- | --- | --- |
| ideal grid, no bank | shipped adaptive loop | **+0.0085** | 0.0013 | 0.29 |
| ideal grid, no bank | **same paths, independent answers** | **−0.0039** | 0.0010 | **0.29** |
| `FLU-OPCHAIN-01` | shipped adaptive loop | **+0.0097** | 0.0011 | 0.35 |
| `FLU-OPCHAIN-01` | **same paths, independent answers** | **−0.0035** | 0.0012 | **0.35** |

**The rising ladder is innocent.** And the converse holds too: an exogenous schedule climbing 1.63
scale points across the block — four times as far as the adaptive rule's 0.39 — returns −0.0023. A
*steeper* climb manufactures *less*.

**The statistical name is endogeneity.** `nextTargetTheta` aims at `theta0 + lambda * nextIndex`, so
the difficulty path rises at whatever rate the running fit has estimated, and a flat accuracy series
over a path rising at rate λ̂ is exactly the signature of an ability rising at λ̂. The estimate is
written into the design and then read back out; early noise is not averaged away, it is served.

**Why that matters more than a label.** Endogeneity and an omitted covariate have opposite remedies,
and the project's pre-registered Gate B statistic conditions on `difficulty` — which is what makes
"condition on difficulty" the natural first hypothesis. It is the wrong one here, and measurably so.

---

## 2. What was run, and how to re-run it

```
pnpm exam:block-harness -- --endogeneity-probe --bank FLU-OPCHAIN-01 --guessing 0.2   # §1, §3
pnpm exam:block-harness -- --gate-a --bank ideal-grid --guessing 0.2                  # the bound
pnpm exam:block-harness -- --gate-a --bank FLU-OPCHAIN-01 --guessing 0.2 --targeting scheduled
node research/exam-question-types/lambda-endogeneity-gate-a.mjs /tmp/gt-stage2-banks   # §4, §5
```

Three conventions, and one thing deliberately not touched.

- **The floor is correctly specified in every row of §1 and §3.** Responder floor and estimator floor
  are both 0.20, the five-option rate, in both estimator roles. Nothing in this report is the E-200
  misspecification; that defect is already corrected and this is what survived it. The one exception
  is `VER-MORPHO-01`, whose four-option items meet a five-option estimator — §6 uses that on purpose.
- **`--bank ideal-grid` is new, and it exists for a methodological reason.** All three published Gate
  A reports quote a bank-free bound computed by a *different* probe from the one that produced their
  bank rows. §4.1.1's argument for a single driver applies to that comparison too, so the grid now
  runs through the identical `gateA()` path as a bank and appears as one more pool.
- **Eight seeds, 400 children per cell, so 3,200 simulated children per number.** Everything else is
  the harness default: λ ~ N(0.06, 0.03²), θ0 ~ N(10.5, 3²), handover-noise SD 1.5, slope 1.0, target
  offset +1.
- **`--fix-probe` is byte-for-byte identical to `dev`, verified by diff.** Its table is cited by three
  published Gate A reports and by E-200; changing it would silently break their reproduction path.

**The three Stage 2 banks are not on this branch and were not copied onto it.** Each is owned by its
own track. They were extracted read-only with `git show <branch>:<path>`; the exact commands are in
the header of the runner.

**Two things are reported for A1, not one, and the difference matters.**

- **Per-cell A1** is the harness's own verdict: `|λ̄| ≤ 2 ×` the Monte-Carlo SE *within* one 400-child
  cell. It is what "does A1 pass" means operationally and it is what the sibling reports quote.
- **Pooled** is `|mean over 8 seeds| / SE of the eight seed means`, roughly √8 more powerful.

A remedy that widened its own error bar would pass the first and fail the second, and that failure
mode is exactly what the harness's own `--fix-probe` header warns about. Both are below.

---

## 3. Every candidate, costed on the same cohorts

Reproduced by `--endogeneity-probe`. Rows are grouped by what they change.

### Candidate fits — the family anyone would reach for first, and the answer is not here

| candidate | null λ̄ (grid) | null λ̄ (`FLU-OPCHAIN-01`) | verdict |
| --- | --- | --- | --- |
| shipped fit, for reference | +0.0085 | +0.0097 | the residual being explained |
| **free coefficient on served difficulty** (Gate B's shape) | **+0.0167** | **+0.0172** | **refuted — roughly doubles it** |
| Jeffreys/Firth penalty | +0.0120 | +0.0129 | refuted |
| delete-one jackknife | +0.0122 | +0.0131 | refuted |

**The first hypothesis fails, and the reason generalises.** Conditioning on a covariate removes the
bias an *omitted* covariate causes. Served difficulty is not omitted from this fit — it is already
there as a known offset with its coefficient pinned to the discrimination — it is *endogenous*, and
freeing its coefficient does not make it exogenous. Worse, under adaptive targeting the served
difficulty is very nearly a linear function of the trial index, so the free coefficient and `lambda`
are close to collinear and the extra freedom is spent absorbing the signal being measured. The
posterior SE widens as well (0.062 → 0.076), so the arm is worse on both axes.

**Both standard bias corrections were the right things to try and both fail in the wrong direction.**
The Jeffreys/Firth penalty is the canonical removal of a likelihood estimator's leading finite-sample
bias and is the generalisation of Warm's weighted likelihood estimator, which exists *precisely*
because adaptive testing biases ML ability estimates; it is parameter-free, so there is nothing in it
to tune. It pushes the climb **up**, and under an exogenous schedule it is catastrophic
(−0.0019 → +0.0314). The mechanism is legible: the penalty rewards parameter values carrying more
Fisher information, and on a rising difficulty path a larger `lambda` is what keeps the response
probability off the chance floor. The delete-one jackknife is the non-parametric counterpart, resting
on different assumptions, and it agrees. **Two independent corrections agreeing is the measurement
that says the residual is not the ordinary finite-sample bias of a likelihood estimator.**

**Two candidates were not implemented, and the reasons are statements rather than measurements.**

- *A conditional or profile likelihood accounting for the selection rule.* There is nothing to
  condition on. A sequential rule that depends only on the observed past is **ignorable**: the
  likelihood already factorises correctly and carries no term for the rule. The shipped likelihood is
  the right likelihood. The bias is that the estimator is a nonlinear function of data whose
  information matrix and score vector are both functions of the same answers, so the expectation of
  `H⁻¹g` is not zero even though the expectation of `g` is.
- *Correcting the floor inside the likelihood rather than as a lower asymptote.*
  `P(correct) = c + (1 − c)σ` **is** the marginal likelihood of the latent guess-or-know mixture, so an
  EM formulation maximises the identical function and cannot give a different answer.

### Candidate designs — the family that works, priced

| design | null λ̄ (grid) | pooled SEs from 0 | r | mean SE | λ = 0.15 learner's accuracy |
| --- | --- | --- | --- | --- | --- |
| shipped adaptive loop | +0.0085 | 6.5 | 0.334 | 0.062 | **0.50** |
| cross-fit (odd drives targeting, even fitted) | −0.0041 | 2.9 | 0.271 | 0.090 | 0.49 |
| exogenous schedule, rate 0.00 (= frozen) | −0.0027 | 5.1 | **0.365** | 0.071 | **0.73** |
| **exogenous schedule, rate 0.06** | **−0.0033** | **3.1** | 0.332 | 0.079 | 0.63 |
| exogenous schedule, rate 0.15 | +0.0007 | 0.7 | 0.225 | 0.105 | 0.47 |

**Cross-fitting works and is rejected on cost.** Driving the targeting rule from the odd trials makes
the difficulty served on an even trial a function of answers independent of the ones being fitted, so
it lands within error of the replay diagnostic — which is a satisfying confirmation of §1 by a second
route. It spends half the block's information on the design, and both `r` and the posterior SE come
out worse than the schedule. It needs no package change (a caller passes a filtered trial list), so
it remains available at zero cost if the trade ever looks different.

**The schedule's rate is not a knob tuned until A1 passed, and the sweep is the proof.**

| rate | 0.00 | 0.03 | 0.06 | 0.09 | 0.12 | 0.15 | 0.30 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| null λ̄ (grid) | −0.0027 | −0.0034 | −0.0033 | −0.0015 | −0.0003 | +0.0007 | +0.0016 |
| per-cell A1 | 8/8 | 7/8 | 7/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| r | 0.365 | 0.354 | 0.332 | 0.306 | 0.263 | 0.225 | 0.094 |
| mean SE | 0.071 | 0.075 | 0.079 | 0.087 | 0.096 | 0.105 | 0.133 |

**A1's cell is flat across a ten-fold change in the rate while recovery falls monotonically and the
posterior widens monotonically.** There is no rate that passes A1 and none that fails it, so there was
nothing to tune: the rate buys nothing on A1 and costs on everything else. It is set to the population
λ mean the harness already defaults to (`--lambda-mean`, 0.06), which is a stated design assumption
with a provenance rather than a value chosen here.

**What the rate does govern is who the block is aimed at, and there is no right answer.** At 0.00 the
schedule has the best average recovery of any exogenous arm and a λ = 0.15 learner works the block at
**73% correct** — well above the p ≈ 0.5 §4.5 asks for, which means the fastest children spend it on
items below their level. At 0.15 that learner is tracked properly and average recovery collapses to
0.225. A schedule pitched at one rate is wrong for every child away from it.

---

## 4. Gate A on all four banks and the grid, before and after

`before` is `--targeting adaptive`, the shipped loop. `after` is `--targeting scheduled` at rate 0.06.
One flag differs.

### A1 — a cohort that learned nothing

| pool | before | after | pooled SEs from 0, before → after | per-cell A1, before → after |
| --- | --- | --- | --- | --- |
| ideal grid, no bank | 0.0085 ± 0.0013 | **−0.0033 ± 0.0011** | 6.5 → 3.1 | 3/8 → 7/8 |
| `FLU-OPCHAIN-01` | 0.0097 ± 0.0011 | **−0.0019 ± 0.0008** | 8.6 → 2.5 | 2/8 → **8/8 PASS** |
| `SPA-XFORM-01` | 0.0092 ± 0.0010 | **−0.0021 ± 0.0009** | 9.4 → 2.5 | 2/8 → **8/8 PASS** |
| `QUANT-GLYPHNUM-01` | 0.0087 ± 0.0010 | **−0.0027 ± 0.0009** | 9.0 → 2.9 | 2/8 → 7/8 |
| `VER-MORPHO-01` | 0.0166 ± 0.0012 | 0.0063 ± 0.0008 | 14.0 → 8.0 | 0/8 → 3/8 |

The `before` column reproduces all four published figures exactly — 0.0085, 0.0097, 0.0092 and
0.0166 — which is the check that this is the same measurement and not a new one.

**The change is a near-constant −0.011 on every pool: −0.0118, −0.0116, −0.0113, −0.0114, −0.0104.**
That is what a single shared cause looks like, and it is the strongest single line of evidence that
the attribution in §1 is right: a bank-specific or floor-specific effect would not subtract the same
amount from a lattice-permutation task, a morphology task, an arithmetic task and a grid with no items
in it.

**So: does A1 now pass? On the harness's own per-cell rule, yes on two of the four banks and 7 of 8
seeds on two more. On the more powerful pooled test, no — the remaining −0.002 to −0.003 is still
about 2.5 SEs from zero, now on the conservative side.** Both are reported because reporting only the
first would be passing a check by widening an error bar.

### A4 — recovery and precision, which is what it costs

| pool | r, before → after | mean posterior SE, before → after | per-cell A4 | per-cell A3 |
| --- | --- | --- | --- | --- |
| ideal grid, no bank | 0.334 → 0.332 | 0.062 → **0.079** | 2/8 → **0/8** | 1/8 → 5/8 |
| `FLU-OPCHAIN-01` | 0.332 → 0.307 | 0.063 → **0.085** | 0/8 → 0/8 | 6/8 → 2/8 |
| `SPA-XFORM-01` | 0.329 → 0.306 | 0.063 → **0.085** | 0/8 → 0/8 | 5/8 → 2/8 |
| `QUANT-GLYPHNUM-01` | 0.334 → 0.333 | 0.062 → **0.079** | 0/8 → 0/8 | 5/8 → 8/8 |
| `VER-MORPHO-01` | 0.287 → 0.310 | 0.062 → 0.073 | 0/8 → 0/8 | 8/8 → 8/8 |

**A4 gets worse, not better.** It was already failing on the SE criterion everywhere except two seeds
on the grid, and after the remedy it fails everywhere: 0.079–0.085 against E-095's 0.047, where the
tolerance is ±0.015. Recovery itself is nearly untouched on the grid and on `QUANT-GLYPHNUM-01`
(−0.003, −0.002) and falls about 0.023 on the two banks with sparser grids. At a wider assumed true
spread the loss grows — at λ SD 0.10 the grid goes 0.778 → 0.694 — so the cost is largest for exactly
the heterogeneous cohort the metric exists to order.

**A3's verdict flips against the remedy for a reason that is not a regression, and it should not be
read as one.** The schedule stops asking for off-scale difficulties, so a child pinned at a pool
maximum is no longer sitting at the 20-point scale clamp, and A3 charges only *bank*-limited pins. On
`FLU-OPCHAIN-01` at seed 11 the loop produces 20 pins, all 20 charged to the scale, and passes; the
schedule produces **10** pins — half as much saturation — one of them charged to the bank, and fails.
A3's attribution rule is what moved, not the bank and not the amount of saturation.

---

## 5. The cost that A1 and A4 cannot see, and it is the decisive one

D-200 part 2 made a band nameable only when the posterior SE **plus** a declared contamination floor
is narrower than the band half-width. The remedy lowers the floor and widens the SE, so this can move
against the remedy even where A1 improves. It does. The SD-0.15 reference — the widest anyone has
proposed, and the only one at which bands separate at all at 30 trials — has a half-width of 0.075.

| pool | SE + declared floor, before → after | reportable at SD 0.15 | reportable with the floor declared |
| --- | --- | --- | --- |
| ideal grid, no bank | 0.071 → **0.079** | 92.7% → 58.7% | 71.6% → **58.2%** |
| `FLU-OPCHAIN-01` | 0.073 → **0.085** | 92.2% → 51.8% | 64.0% → **51.6%** |
| `SPA-XFORM-01` | 0.072 → **0.085** | 91.8% → 52.0% | 67.6% → **51.8%** |
| `QUANT-GLYPHNUM-01` | 0.071 → **0.079** | 92.5% → 58.4% | 71.3% → **58.1%** |
| `VER-MORPHO-01` | 0.079 → 0.079 | 92.8% → 66.0% | 36.3% → **58.5%** |

**On every pool whose guessing floor was already correct, the remedy takes the total error budget from
just inside the band half-width to outside it, and 12 to 16 points off how often a rate can be
reported at all.** Only `VER-MORPHO-01` gains, and only because its 0.0166 contamination floor was
costing more than the widening does.

**This is the trade, stated plainly and not buried.** A1 exists so a child who learned nothing is not
told they learned quickly. The reportability column exists so a number too imprecise to mean anything
is not reported at all. This remedy trades the first against the second, and D-200 already found the
second nearly exhausted. **Removing the bias makes the estimator honest about a rate it can no longer
report.** That may well be the right choice — an unbiased-and-silent estimator is defensible and a
biased-and-talkative one is not — but it is a decision about what the product claims, and D-206 leaves
it to the owner rather than taking it.

Against the SD-0.03 reference the project's own synthetic work used, every arm at every length is
100% indeterminate, before and after. That was already true and is unchanged.

---

## 6. The two defects are separable, and that makes a deferred follow-up worth more

`VER-MORPHO-01` is the only pool still failing A1 after the remedy. It is also the only pool whose
items are four-option while the shipped estimator assumes five — an E-200 floor misspecification
sitting on top of the endogeneity. If the two are separate defects, correcting the floor as well
should land it where the others land.

| `VER-MORPHO-01`, floor corrected to 0.25 | null λ̄ | pooled SEs from 0 | per-cell A1 | r | mean SE |
| --- | --- | --- | --- | --- | --- |
| before (adaptive) | 0.0113 ± 0.0010 | 11.2 | 0/8 | 0.303 | 0.066 |
| after (scheduled) | **−0.0024 ± 0.0009** | 2.6 | **7/8** | 0.325 | 0.082 |

It does, to three decimal places of the other four pools. **The floor defect and the design defect are
separate and additive**, and D-200's deferred follow-up — a per-item floor derived from the served
option count, which is feasible because the option array reaches the client — is worth more than it
looked: on a four-option bank it is worth about 0.010 on A1 by itself, comparable to the whole
endogeneity effect.

---

## 7. Boundaries, and what remains open

**What this report establishes.** The residual A1 failure that survives a correct guessing floor is
endogeneity of the adaptive design, established by holding the difficulty path fixed and cutting only
its dependence on the child's answers. No change to the fit removes it, and the natural first
hypothesis — conditioning on served difficulty, the shape of the pre-registered Gate B statistic —
makes it about twice as bad. An exogenous schedule removes it on all four banks and the bank-free
grid, at a near-constant −0.011, and costs about a third of the posterior precision, A4, and 12 to 16
points of reportability.

**What it does not.**

- That the block measures learning in children. Gate B, and no synthetic run substitutes.
- That the remedy should be adopted. On these figures it is a net loss wherever the floor was already
  right, which is why D-206 is Proposed and part 3 of it is the owner's.
- **That the remaining −0.002 to −0.003 is understood.** It is not. It is present under every
  exogenous arm including a frozen one, it is in the conservative direction, and it is reported rather
  than attributed. The two bias corrections that would be the obvious explanation both move the
  estimate the wrong way, so it is not the ordinary finite-sample bias of a likelihood estimator
  either.
- That a schedule is safe when the standing handover is wrong. It is not, and this is the remedy's
  structural weakness rather than a tuning detail: the adaptive rule's one real virtue is that it
  recovers from a bad handover, and a fixed schedule has no mechanism to notice. D-205 makes the
  handover's accuracy a premise; this remedy leans on that premise harder than the shipped loop does.
- That Stage 2's A1 stop rule should or should not fire. `STAGE2_SPA_XFORM_GATE_A.md` §10 puts that to
  the owner. This report changes one input to it — A1 *is* passable, and not by building banks — and
  adds a second — passing it costs reportability the programme may not have to spend.

**Nothing is wired and no type is recorded as gate-passing.** All four banks ship `validated: false`
and `syntheticOnly: true`, none is administered from `scheduledTargetTheta`, and Gate B has not run.
**Learning-rate figures produced before this report remain comparable to figures produced after it**,
because the shipped default is unchanged: any figure quoted from `--targeting adaptive` is the same
figure it was. A figure produced under `--targeting scheduled` is **not** comparable to one produced
before — the estimator is the same but the administration is not, so the two answer different
questions and every table above labels which arm produced it.
