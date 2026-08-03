# Does the test bracket the score by presenting questions at the ends of the SE range?

**Status:** investigation and estimate only. Nothing here is implemented. No production code was
changed to produce it.

**Requirements:** R11 / TECH-004 (the adaptive screening instrument). TECH-004's own acceptance
evidence says the engine must serve "items by information-maximizing selection" — which turns out to
decide most of this question on its own.

**Evidence used:** E-095, E-200 (Phase 2 guessing-floor defect), D-023 (step schedule), D-024
(bracketing statistic), D-025 (age-band bias), D-030, D-200. One new born-synthetic measurement,
described in §4 and reproducible from the appendix.

---

## 1. The direct answer

**No.** Item selection never looks at the standard error. It aims every item at a single running
point estimate produced by an up/down staircase, and picks the unseen bank item whose difficulty is
closest to that point.

The standard error is real, it is correct, and it is computed by a completely different piece of
code (`abilityStandardError` in `packages/exam-scoring`) that runs **after** the fact, for reporting.
In the shipped default configuration it is not even computed during a session: the default policy
brackets on accuracy, not ability, so `abilityStandardError` is never called on the production path
at all. It appears in exactly two places — under the non-default `mode: 'ability'` policy, and in the
`?debug=1` panel, which is still on an unmerged branch.

So the debug panel is showing you two different things side by side, and it says so in its own
header comment: the staircase target (which drives selection) and the fitted interval (which does
not). The narrowing bracket you can watch on screen is a faithful picture of an estimator gaining
information. It is not the thing choosing the questions.

## 2. Recommendation

**Do not build endpoint targeting.** It is not a cheap feature that was overlooked; it is a change
that makes the estimate materially worse, and the measurement in §4 is not close. At an equal item
budget, aiming at the edges of the 95% interval roughly **triples** the error of the final estimate
(RMSE 0.79 → 2.12 scale points) and leaves the interval **3.7× wider** (mean SE 0.75 → 2.73). It
fails for a specific and unfixable reason explained in §4.3: the width you aim at is a function of
the information you have, so a wide interval makes you aim badly, which keeps the interval wide.

**The instinct behind the question is nevertheless correct, and it is pointing at a real defect.**
Something *is* mis-aimed. It is not the centre-versus-edges choice. It is that the number the test
reports as a child's standing level currently sits **above** their actual ability, for two separate
and independently fixable reasons:

1. **The standing estimator assumes nobody ever guesses**, while every wired item is five-option
   multiple choice. This is the same misspecification PR #22 / PR #24 / D-200 just fixed in the
   Phase 2 learning-curve fit, and it was never fixed in the Phase 1 standing fit. Measured cost:
   the fitted standing level comes back **+1.2 scale points too high** on average, and for a
   low-ability child seeded at a high grade band it comes back **+6.9 points too high**.
2. **The staircase's up-steps and down-steps are not the same size**, because `nearMissSoften`
   shrinks wrong-answer steps only. An asymmetric staircase settles where the child succeeds *less*
   than half the time, i.e. above their ability — analytically **+0.5 to +1.6 points**, and measured
   at **+1.44**.

Ranked by value per day of work:

| | Change | Effect measured here | Estimate |
| --- | --- | --- | --- |
| **1** | Give the standing fit a guessing floor (mirror D-200) | bias +1.20 → +0.62, RMSE 2.03 → 1.71, selection untouched | **2.5–5 days** |
| **2** | Ship the narrowing interval as a product surface | the visible converging bracket, for zero engine risk | **0.5–1.5 days** |
| **3** | Fix the staircase step asymmetry | staircase bias +1.44 → ~+0.5 (predicted, §4.5, not yet measured) | **1.5–3 days** |
| **4** | Target the fitted ability instead of the staircase | worst-case bias +6.89 → +4.14 | **5–10 days** |
| — | Endpoint / SE-edge targeting | RMSE 2–3× worse | **6–12 days, do not do** |

Items 1 and 2 are the answer to what the question is actually reaching for. Item 4 is defensible but
should not be started before item 1, because it would aim the engine at an estimate that is still
biased.

---

## 3. What the rule actually is today

### 3.1 Phase 1 (standing) — a Levitt/Kesten staircase on a point estimate

Each of the four areas carries one number, `state.areas[area].difficulty`, seeded from the requested
grade band: K-1 → 3, 2-3 → 7, 4-5 → 11, 6-8 → 15, above-level → 18.

**Selection** (`packages/exam-engine/src/selection.ts`): `nextType` picks an area (fewest items seen
first, then neediest on enforced metric coverage, then seeded jitter) and a type within it. Then
`nextItem` takes `target = state.areas[area].difficulty`, keeps only unseen items within
`±difficultyWindow` of it, and picks the one minimising

```
|item.difficulty - target| + (item is tagged for this grade band ? 0 : ageBandBias)
```

`difficultyWindow` is 3 by default and 4 as the web app configures it; `ageBandBias` is 0.5, priced
deliberately at half a difficulty point so the age band breaks ties but cannot buy a large targeting
error (D-025). Ties go to a seeded hash, then item id, so a session replays exactly.

**Update** (`packages/exam-engine/src/update.ts`): after each answer the area's number moves by

```
direction = correct ? up : down
magnitude = step(reversals) * (1 + surpriseGain * surprise)      // wrong answers then softened
step(m)   = clamp(minUpdate + (initialStep - minUpdate) / (1 + m)^stepDecayExponent, minUpdate, maxUpdate)
```

With the shipped defaults — `initialStep` 2.0, `minUpdate` 0.25, `maxUpdate` 3.0,
`stepDecayExponent` 1.0, `stepBurnInReversals` 0 — the step ladder is:

| reversals so far | 0 | 1 | 2 | 3 | 4 | 5 | 8 | 12 | → ∞ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| step (scale points) | 2.00 | 1.13 | 0.83 | 0.69 | 0.60 | 0.54 | 0.44 | 0.38 | 0.25 |

A **reversal** is simply a change of correctness from the previous item in that area, recounted from
the stored trace each time rather than held in a counter, and it includes the current answer, so the
step shrinks on the reversal that causes it rather than one item later. This is a Levitt staircase
with a Kesten-style accelerated gain: full step while responses are one-sided (still travelling),
decaying once they alternate (region found).

Two modifiers sit on top, and it is worth knowing how much they actually do:

- **`surpriseGain` 1.0** amplifies the step by `|served − target| / 19`. But the ±3-or-4 point
  selection window caps `|served − target|`, so in practice this is at most a **16–21% amplification**,
  not the 2× the formula's range suggests. It is close to inert.
- **`nearMissSoften` 0.5** shrinks *wrong-answer* steps toward the floor, by up to 50% of the
  above-floor portion, when `M-ERRTYPE` says the error was a systematic near-miss. This one matters
  a great deal, and §4.2 is about why.

**Stopping** (`done.ts`): an area is "settled" when the last `stabilityWindow` estimates have
SD ≤ `stabilitySd` and the drift between the older and newer halves is ≤ `stabilityDrift` (6 / 1.2 /
0.8 by default; 4 / 1.5 / 1.0 in the app). The session ends when every area is settled *and* metric
coverage is met, bounded by `hardItemCap` (60 default, 40 in the app).

### 3.2 The three jobs one number is doing

This is the load-bearing architectural fact for any change to the aim.
`state.areas[area].difficulty` is simultaneously:

1. the **selection target**;
2. the **stop-rule input** — its own history is the `estWindow` that `areaEstimateStable` reads, so
   the test for "have we converged" is a test of the staircase's own quietness; and
3. the **reported standing level** — read directly in the debug panel and in `exam-runner.tsx`.

Change what selection aims at and you change all three unless you first split them apart. That, and
not the arithmetic of choosing a target, is what makes options 3 and 4 in §2 cost days rather than
hours.

### 3.3 Phase 2 (learning block) — genuinely different, and already offset

Phase 2 does not use the staircase at all. `nextTargetTheta`
(`packages/exam-scoring/src/learning-curve.ts`) re-fits a two-parameter climb
`theta(t) = theta0 + lambda·t` from every trial so far and aims at

```
theta0 + lambda * nextTrialIndex + targetOffset
```

with `targetOffset = +1` (`LEARNING_BLOCK_TARGET_OFFSET` in `apps/web/src/lib/exam/phase2.ts`).
Before four trials it returns `standing + 1` unchanged. Item choice is nearest-difficulty over the
unseen pool, with the grade-band tie-break deliberately removed.

Three differences from Phase 1 are worth naming, because they are all directly relevant:

- **Phase 2 already does offset targeting**, and its docblock justifies the offset on engagement
  grounds ("desirable difficulty"), explicitly not on statistical grounds.
- **Phase 2 already has a guessing floor** (`DEFAULT_GUESSING = 0.2`) and Phase 1 does not. The two
  phases no longer make the same response-model assumption, and `learning-curve.ts` says so.
- **Phase 2's closed loop is the mechanism E-200 caught.** Fit → aim → fit is exactly the
  self-confirming loop that manufactured a learning rate for children who did not learn. Any
  proposal to make Phase 1 aim at its own fitted estimate is proposing to build the same loop shape
  in Phase 1, which is a reason for care rather than a veto — but it needs the same class of null-cohort
  evidence E-200 produced.

### 3.4 Answers to the four specific questions

| Question | Answer |
| --- | --- |
| Is the next item targeted at the point estimate, the SE interval edges, or something else? | The point estimate — a staircase position, not a fitted ability. Perturbed by at most 0.5 points of age-band preference and by whatever the bank actually has within ±3–4 points. |
| Is the SE used in selection at all? | No. Reporting only, and in the shipped default policy it is not even computed. |
| What are the real step sizes and reversal rules? | `0.25 + 1.75/(1 + reversals)`, i.e. 2.00 → 1.13 → 0.83 → 0.69 → … → 0.25, where a reversal is any change of correctness within the area. Up steps and down steps are **not** symmetric: `nearMissSoften` 0.5 shrinks wrong-answer steps only. |
| How does Phase 1 differ from Phase 2? | Phase 1: staircase on a point estimate, aimed *at* it, no guessing floor, age-band preference on. Phase 2: MAP-fitted climb re-projected each trial, aimed **+1 above** it, guessing floor 0.2, age-band preference off. |

---

## 4. Would endpoint targeting be better? No — and here is why

### 4.1 The information argument holds, and it is the repo's own arithmetic

Under a one-parameter logistic where every item shares one slope, the Fisher information an item
carries about ability is `slope² · p · (1 − p)`. That is not a textbook quotation — it is literally
the per-item term inside `abilityStandardError`, so the estimator this test reports *is* the
estimator this claim is about. `p(1−p)` peaks at `p = 0.5`, which happens exactly where item
difficulty equals ability. Centre. The engine's own `learning-block.ts` already states the corollary:
with a common slope, "maximum-information selection and nearest-difficulty selection are the SAME
rule".

Aiming off-centre costs information at an accelerating rate:

| offset from ability | relative information | items needed for the same precision |
| --- | --- | --- |
| ±0.0 | 1.00 | 1.00× |
| ±0.5 | 0.94 | 1.06× |
| ±1.0 | 0.79 | 1.27× |
| ±2.0 | 0.42 | 2.38× |
| ±3.0 | 0.18 | 5.53× |
| ±4.0 | 0.07 | 14.2× |

### 4.2 One premise in the brief is inverted, and it matters

The brief suggested that a guessing floor moves the information-maximising difficulty *above* the
ability estimate. Computed against this repo's own floor-aware information function (the one inside
`estimateLearningCurve`), it moves it **below** — the optimal item is slightly *easier* than the
child:

| assumed guessing floor | info-maximising offset | P(correct) there |
| --- | --- | --- |
| 0 (what the standing fit assumes) | +0.00 | 0.500 |
| 1/6 (six-option) | −0.23 | 0.632 |
| 0.20 (five-option) | −0.27 | 0.653 |
| 0.25 (four-option) | −0.31 | 0.683 |

The intuition that trips people up is that the *success rate* at the optimum rises above 50% once
guessing is possible — which is true, P(correct) = 0.65 — but it rises because chance is supplying
part of it, and the item itself has to get *easier*, not harder, to sit there.

**And the size of the correction is negligible for targeting purposes.** Centre-targeting retains
**97.8%** of the maximum available information even against a real five-option floor. On a bank whose
difficulties are integers or half-integers and a selection window of ±3, a 0.27-point shift is below
the resolution of the item supply. So the guessing floor is a serious problem for the **estimator**
and a rounding error for the **aim**. Those are different fixes with very different costs, and it is
worth not conflating them.

### 4.3 Why endpoint targeting fails in practice, not just in theory

Measured on the real 5,758-item bank (49 wired types) with a stochastic 1PL responder, ability drawn
uniformly on [3, 17] independently per area, all seeded at grade band '4-5' (start 11). Every arm uses
the shipped `nextItem` and the shipped `update`; only the number handed to selection as the aim
differs. **A stochastic Phase 1 responder does not exist in the repo** — the shipped harness responder
is deterministic (`correct = difficulty <= theta`) — so this required a throwaway simulator, given in
the appendix.

At an equal item budget of 40 (120 children × 4 areas, stop rule disabled so session length cannot
confound the comparison):

| rule (floor = 0) | fitted bias | fitted RMSE | mean final SE |
| --- | --- | --- | --- |
| **centre (current)** | **+0.03** | **0.79** | **0.75** |
| alternating ±1.96 SE | +0.44 | 2.12 | 2.73 |
| upper edge only | +0.82 | 2.27 | 2.70 |
| centre − 0.27 (info-optimal under a floor) | −0.02 | 0.78 | 0.73 |

To reach the precision centre-targeting reaches in 40 items, endpoint targeting would need roughly
**13× the items** — `(2.73 / 0.75)²`. That is not a session you can administer to a nine-year-old.

The reason is a feedback loop running the wrong way, and it shows up cleanly in the trajectory. Here
is the fitted error and interval after each area's first *k* items:

| rule | RMSE @2 | @4 | @6 | @8 | @10 | SE @2 | @4 | @6 | @8 | @10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| centre | 1.88 | 1.40 | 1.13 | 0.89 | **0.79** | 2.39 | 1.45 | 1.03 | 0.85 | **0.74** |
| alternating ±1.96 SE | 2.50 | 2.45 | 2.37 | 2.18 | **2.12** | 3.24 | 3.13 | 3.01 | 2.84 | **2.73** |

Centre-targeting's interval falls by a factor of 3.2 over ten items. Endpoint targeting's falls by a
factor of 1.2 — it barely moves. The mechanism: **the width you aim at is a function of the
information you have.** Early on the SE is ~2.4, so ±1.96 SE means aiming ±4.7 points away from the
child, where an item carries about 5% of the information it would carry at centre. Little information
arrives, so the interval stays wide, so the next aim is just as bad. Centre-targeting has the same
loop running in the useful direction: better aim → more information → narrower interval → better aim.

This is why endpoint targeting is not merely less efficient. It is closer to self-defeating. The
narrowing bracket the owner wants to be able to show a parent is precisely the thing endpoint
targeting prevents.

### 4.4 The arguments FOR a non-centre rule, tested honestly

**Robustness when the starting prior is badly wrong.** This is the strongest argument and it deserved
a direct test, so every child was seeded at the wrong end of the scale:

| case (floor = 0) | rule | items | ended on cap | fitted bias | fitted RMSE |
| --- | --- | --- | --- | --- | --- |
| seeded 'K-1' (3), true 16–19 | centre | 40.0 | 100% | −0.24 | 1.11 |
| | alternating ±1.96 SE | 40.0 | 100% | −4.66 | 5.79 |
| | fitted-ability centre | 40.0 | 100% | −0.19 | **0.91** |
| seeded 'above-level' (18), true 2–5 | centre | 40.0 | 100% | +0.20 | 1.16 |
| | alternating ±1.96 SE | 33.2 | 6% | +4.36 | 5.54 |
| | fitted-ability centre | 39.9 | 94% | +0.15 | **0.89** |

Centre-targeting does **not** get stuck. A 2.0-point initial step crosses a 15-point seed error in
about eight items, which is what the step schedule was sized for (D-023). Endpoint targeting is five
times worse in exactly the scenario it was supposed to rescue — for the same reason as §4.3, made
worse by the fact that a badly-seeded child's interval starts even wider.

There *is* a real cost to a wrong seed, and it is visible in that table: **every** badly-seeded
session ran to the safety cap. That is a session-length problem, not an accuracy problem, and the
remedies are a better seed, a larger initial step, or an explicit routing pretest — none of which
involve the SE interval.

**The guessing floor.** Covered in §4.2: it moves the optimal aim by 0.27 points, which is below the
bank's resolution, and costs 2.2% of information if ignored. But it does serious damage to the
*estimate*:

This table is from the variable-length runs (the real stop rule, i.e. what actually ships), so it is
not directly comparable to §4.3's equal-budget figures. The last column re-scores the *same traces*
with a floor-corrected fit, holding the targeting rule fixed — so it isolates what fixing the
estimator alone would buy.

| rule (floor = 0.2, variable length) | fitted bias | fitted RMSE | floor-corrected fit: bias / RMSE |
| --- | --- | --- | --- |
| **centre (current)** | **+1.20** | **2.03** | **+0.62 / 1.71** |
| alternating ±1.96 SE | +2.21 | 3.23 | +0.70 / 2.18 |
| upper edge only | +5.02 | 6.01 | +1.43 / 3.27 |
| centre − 0.27 | +0.97 | 1.80 | +0.49 / 1.54 |

Three things to read off. First, **the misspecification costs more than any choice of aim**: centre
targeting goes from bias +0.06 to +1.20 purely by giving the simulated child a five-option floor.
Second, **correcting the estimator recovers about half of that and needs no change to selection at
all** — bias +1.20 → +0.62, RMSE 2.03 → 1.71, same traces, same aim. That is the cheapest real
improvement available and it is the basis for §2's ranking. Third, endpoint targeting is worse under a
floor too, and the upper-edge variant is a disaster: it serves items far above the child, chance
successes on those items are read as ability, and the estimate runs away to **+5.0 points**.

**Exposure control and content balance already perturb the aim.** True, and it bounds how much
precision a targeting change can buy. `ageBandBias` moves the aim by up to 0.5 points, and the bank's
own granularity moves the served difficulty by up to ±3–4. Against that, a 0.27-point theoretical
correction is not measurable in practice — consistent with `offset-minus` and `centre` differing by
about 0.01 RMSE at floor = 0.

**Explaining a narrowing bracket to a parent or a school.** This is a legitimate product goal and it
is the one place the owner's instinct converts directly into work worth doing — but it needs **no
change to selection whatsoever.** The interval already exists, is already computed by the estimator
the scorer uses, and is already rendered per item by the debug panel, which even keeps its own
`Z95 = 1.96` and a width series for animating the narrowing. Making it a family-facing surface is UI
work on data that is already there. Note also that centre-targeting produces the *most* visibly
converging bracket of any rule tested, by a factor of three. The product goal and the statistical
optimum agree here.

### 4.5 The finding that was not in the brief

Both halves of §2's defect list came out of this analysis rather than out of the question, and the
second one is not documented anywhere in the repo.

An up/down staircase settles where expected drift is zero, which is where the child succeeds with
probability `downStep / (upStep + downStep)`. Symmetric steps give P = 0.5, which under a floorless
model is exactly the child's ability — the design intent. But `nearMissSoften` 0.5 shrinks
**wrong-answer steps only**, by up to half of the above-floor portion. The equilibrium therefore sits
where the child succeeds *less* than half the time, i.e. above their ability:

| down/up step ratio | P(correct) at equilibrium | settled estimate offset, floor 0 | offset with a five-option floor |
| --- | --- | --- | --- |
| 1.00 (symmetric) | 0.500 | +0.00 | +0.51 |
| 0.75 | 0.429 | +0.29 | +0.92 |
| 0.50 (max softening) | 0.333 | +0.69 | +1.61 |

Measured on the real bank, the staircase standing level comes back **+0.45** above truth at floor 0
and **+1.44** at floor 0.2 — inside the range the algebra predicts. The two causes compound rather
than simply adding: maximal softening is worth ~0.7 points on its own, a five-option floor ~0.5 on its
own, and together they reach ~1.6.

This matters more than it looks because of §3.2. The staircase value is also the stop-rule input, so
a biased staircase is a stop rule converging on the wrong place; and it is displayed as the child's
standing level. It is also cheap to fix, which is why it is item 3 in §2 rather than a footnote.

---

## 5. Estimates

Ranges are wide on purpose. The dominant uncertainty is not the code — it is that **there is no
Phase 1 simulation instrument**, so any change to selection or to the standing estimator needs one
built before it can be trusted, and the first option to be scheduled pays for it.

### Shared prerequisite: a Phase 1 stochastic harness — 1.5–3 days

The shipped Phase 1 harness responder is `correct = served.difficulty <= theta`: deterministic, no
noise, no guessing floor. Under it a staircase behaves like a bisection search, every arm in §4 looks
roughly equivalent, and none of the effects above are visible at all. Phase 2 has the right kind of
instrument (`scripts/exam-learning-block-harness.ts`, with separate responder / readout / targeting
floors — the design to copy); Phase 1 has nothing.

What it needs: a 1PL-plus-floor responder, a cohort driver, bias / RMSE / SE / length reporting, and
a null-style control arm. The appendix script is a working prototype at roughly a third of the rigour
a committed harness would need. This is the single highest-leverage item in the whole list, because
it is the thing that turns every subsequent claim from an argument into a measurement.

### Option 1 — Guessing floor in the standing fit (recommended first) — 2.5–5 days

*Includes the harness above.*

- `packages/exam-scoring/src/ability.ts`: add `guessing` to `AbilityFitOptions`; change the score
  function and the information term to the floor-aware forms. Both already exist, tested, thirty
  lines away in `learning-curve.ts` — this is a port, not a derivation. **~½ day.**
- `packages/exam-scoring/src/policy.ts`: `AbilityBracketing` gains a floor;
  `DEFAULT_ABILITY_BRACKETING` gets a documented default. Decide whether 0.2 is the default or
  whether it must be passed explicitly. **~½ day.**
- Tests: `ability.test.ts`, `scorer-ability.test.ts`. Follow D-200's pattern of a **matched pair** —
  one test asserting the corrected floor keeps a null cohort clean *and* one asserting a zero floor
  does not — so the guard cannot pass vacuously. **~1 day.**
- Evidence: a new register entry, the Phase 1 sibling of E-200. Cohort runs at floors 0 / 0.2 / 0.25,
  bias and RMSE before and after, plus the asymmetric-harm check E-200 flagged (assuming a floor that
  is not there attenuates a genuinely low-ability child). **~1–2 days.**
- Governance: D-200 extended or a sibling decision; E-095 already carries a floor caveat.

**Interaction with the open guessing work, and it is a strong one.** PR #22 / #24 / D-200 fixed the
floor in Phase 2 only. Phase 2 receives its `standing` from Phase 1 as
`areaScore.abilityEstimate ?? areaScore.proficiency`, so **the corrected Phase 2 fit is currently
anchored on an uncorrected Phase 1 estimate.** E-200 measured that a wrong standing handover is one
of the things that manufactures λ. These should be one decision with one constant and one claim
boundary, not two. If the floor is going to be revisited at all, doing Phase 1 in the same pass is
strictly cheaper than doing it later.

**Risk:** the fix changes reported scores. `ABILITY_BRACKET_POLICY` is not the shipped default
(D-024 is undecided), so on the current production path this changes the Phase 2 handoff and the
debug panel but not the family-facing composite — which makes it a good time to do it, before the
ability policy is ratified and the number becomes load-bearing.

### Option 2 — Ship the narrowing interval — 0.5–1.5 days

Depends on whether `feat/exam-debug-converge-burst` lands. If it does, the interval, the width
series, and the per-item log all exist already and this is presentation work plus wording. If it does
not, `debug-view.ts`'s `fitInterval` is ~15 lines to lift.

- No engine change. No new statistics. `apps/web` only.
- The claim boundary has to travel with it, and `debug-view.ts` already drafts it: this is the
  conditional SE of a fit that (today) assumes no guessing, so it is sampling error under a
  misspecified model, **not** "we are 95% sure your child is in this band". Do Option 1 first if the
  band is going to be shown to a family.
- No new simulation evidence needed — this changes what is displayed, not what is computed.

### Option 3 — Fix the staircase step asymmetry — 1.5–3 days

*Assumes the harness already exists; add 1.5–3 days if not.*

- `update.ts`: either apply the near-miss softening symmetrically, or drop it, or keep it and
  re-centre the equilibrium explicitly. The third is more honest and needs a paragraph of
  justification rather than a constant.
- `config.ts` + D-023 amendment: `nearMissSoften` was chosen on the reasoning that a systematic
  near-miss is weaker evidence of inability. That reasoning is sound and the *side effect* on the
  equilibrium was simply not noticed; the decision record should say so rather than pretend the knob
  was wrong.
- Tests at risk: `update`'s own tests, `phase1-homing.test.ts` (asserts recovery within ±2.5 — a
  0.5–1.5 point bias shift moves that margin), `engine.test.ts`, `simulation.test.ts`,
  `real-bank.test.ts`.
- Evidence needed: the staircase's settled offset before and after, **and** that the stop rule still
  terminates. A symmetric staircase reverses more often, the step decays faster, and
  `areaEstimateStable` could be satisfied earlier and on less information — a session that ends
  sooner with a wider true error would be a regression dressed as an improvement. That check is most
  of the estimate.

### Option 4 — Target the fitted ability instead of the staircase — 5–10 days

Worth understanding, not worth starting yet. Measured benefit is real but narrow: at equal budget it
is indistinguishable from the current rule for a well-seeded child (RMSE 0.78 vs 0.79), and its value
is confined to badly-seeded children, where it cut worst-case bias from **+6.89 to +4.14** — most of
which Option 1 also addresses, more cheaply.

The cost is architectural, not arithmetic.

- **The engine cannot currently see the fit.** `exam-engine` has zero runtime dependencies, and both
  packages document their independence as deliberate. Three ways out, all with a real price:
  depend on `exam-scoring` (breaks the stated independence); reimplement the fit inside the engine
  (`debug-view.ts` names this "the exact class of bug this repository has been bitten by twice");
  or extract the fit into a third shared package (cleanest, most work).
- **`areas[].difficulty`'s three roles must be split** (§3.2) into a selection target, a
  convergence-tracking series, and a reported standing level. This is the bulk of the work.
- **Files:** engine `types.ts`, `selection.ts`, `update.ts`, `done.ts`, `state.ts`; plus the nine
  test and harness files that read `areas[].difficulty` (`engine.test.ts` and `real-bank.test.ts`
  reference it ~11 times each); plus `exam-runner.tsx` and the Phase 2 handoff; plus the unmerged
  debug branch, which replays `difficultyDelta` to reconstruct the target and would need rewriting.
- **Evidence needed:** everything in Option 1, plus a null-cohort guard against the E-200 failure
  mode. Aiming at your own fit is the closed loop that manufactured a learning rate in Phase 2. It is
  less dangerous here (no rate is being estimated, and the loop is what every operational CAT does)
  but "less dangerous" is a claim that needs a measurement, and E-200 exists because the intuition
  went the wrong way last time.

### Option 5 — Endpoint / SE-edge targeting — 6–12 days, not recommended

Option 4's cost plus the edge rule and a decision about which edge, in exchange for an estimate
2–3× less accurate and an interval 2–4× wider. Costed only so the comparison is on the record.

---

## 6. What this analysis does not establish

- **Everything here is born-synthetic.** The responder is a 1PL with an assumed slope of 1.0 against
  a bank where every difficulty is a design estimate (`syntheticOnly: true`, `validated: false`).
  These are *recovery* results — can the machinery read back an ability the trace encodes — and say
  nothing about validity, about real children, or about giftedness.
- **The comparison is generous to endpoint targeting in one respect and harsh in another.** Generous:
  it uses the same slope in the responder and the estimator, so no slope misspecification. Harsh: it
  runs at the app's 40-item cap, and a much longer session would narrow the gap in §4.3 — though not
  close it, since the trajectory table shows endpoint targeting's interval is still 3.7× wider at
  ten items per area and falling far more slowly.
- **The 0.2 floor is itself an assumption.** E-200 makes this point and it applies here: a plausible
  distractor set effectively raises the option count and a disengaged child lowers it. `FLU-MATRIX-01`
  alone is 63 four-option, 27 five-option and 30 six-option items. Assuming a floor that is not there
  is harmful too, and asymmetrically so.
- **Sample sizes are modest** — 150 children × 4 areas for the main tables, 120 for the trajectory,
  100 for the robustness cases, one seed each. The effects being reported are large multiples rather
  than marginal differences, so they survive that; nothing here supports a precise claim about, say,
  whether `offset-minus` beats `centre` by 0.01 RMSE.
- **Nothing here re-opens D-024.** Whether the bracket should be driven by accuracy or by fitted
  ability is a separate, already-documented decision. This analysis assumes only that the fitted
  ability and its SE are the quantities of interest, which the debug panel and the Phase 2 handoff
  already treat as true.

---

## Appendix — reproducing the measurement

```
pnpm tsx docs/architecture/bracketing-analysis.throwaway.ts     # ~2.5 minutes
```

`docs/architecture/bracketing-analysis.throwaway.ts` is committed alongside this document. It is
**not** production code and deliberately **not** under `scripts/`, so it sits outside
`scripts/tsconfig.json` and `pnpm verify` neither typechecks nor lints it. It imports only from
`packages/exam-engine/src` and `packages/exam-scoring/src`, and mutates nothing.

It is committed at all because of a lesson this repo already paid for: E-095's figures could not be
regenerated by anyone, since the sweep that produced them was never committed and its parameters were
never recorded, and correcting that took a separate piece of work. A second set of unreproducible
numbers in the register would repeat the mistake.

If any of these options is commissioned, this file should be **replaced** — not extended — by the
committed Phase 1 harness described in §5, built the way `scripts/exam-learning-block-harness.ts` is
built: separate responder / readout / targeting parameters, a cohort driver, and a null control arm.

### What it does

| section | question | method |
| --- | --- | --- |
| A | where is information maximised | evaluates `abilityStandardError`'s and `estimateLearningCurve`'s own per-item information terms over a difficulty grid |
| B | where does the staircase settle | solves the zero-drift condition analytically for a range of down/up step ratios and guessing floors |
| C | rule comparison, variable length | real bank, real `nextType`/`nextItem`/`update`, stochastic responder, app engine config |
| D | rule comparison, fixed 40-item budget | as C with the stop rule made unsatisfiable (`minItemsPerArea` unreachable), so efficiency is not confounded with session length |
| E | convergence trajectory | fitted error and SE after each area's first *k* items |
| F | robustness to a wrong seed | every child seeded at the opposite end of the scale from their true ability |

### Parameters

150 children in C, 120 in D and E, 100 per case in F. Ability drawn U(3, 17) independently
per area (F: U(16, 19) or U(2, 5)). Responder is 1PL, slope 1.0, guessing floor 0 or 0.2. Fit is
`DEFAULT_ABILITY_BRACKETING` — slope 1.0, priorSd 6.0 — on [1, 20]. Engine config is the web app's
`EXAM_ENGINE_OVERRIDES` (`minItemsPerArea` 4, `stabilityWindow` 4, `stabilitySd` 1.5,
`stabilityDrift` 1.0, `difficultyWindow` 4, `hardItemCap` 40). Bank is whatever
`loadRealBanks()` finds — 49 wired types, 5,758 items at the time of measurement. Seeded RNG
(mulberry32, cohort seed 4242, per-child 1000 + 7919·i), so runs are repeatable.

### Method note

Alternative aims are applied by handing `nextItem` a shallow-cloned state whose
`areas[area].difficulty` is the alternative target, while the real `update` runs against the real
state. That keeps the shipped selection and update functions on the path unmodified — the only thing
that varies between arms is the number selection is aimed at. It also means the `staircase bias`
column is only interpretable for the `centre` arm: for every other arm the staircase is no longer
being driven by items aimed at itself, and its drift is itself a demonstration of §3.2 — change the
aim without splitting the three roles and the engine's own reported standing level stops meaning
anything.

### Map of the script

| function | what it is |
| --- | --- |
| `info1PL` / `infoWithFloor` | the two per-item information terms, lifted verbatim from `abilityStandardError` and `estimateLearningCurve` — so §4.1 is measuring the shipped estimators, not a restatement of them |
| `argmaxOffset(c)` | grid search for the information-maximising offset (§4.1, §4.2) |
| `equilibriumOffset(up, down, c)` | zero-drift solve for where a staircase settles (§4.5) |
| `respond(...)` | stochastic 1PL-plus-floor responder; metric bag mirrors `respondFromRealBank` so the stop rule behaves as it does in production |
| `aimFor(rule, ...)` | the six targeting rules: `centre`, `endpoint-alt`, `endpoint-upper`, `offset-minus`, `fit-centre`, `fit-centre-c` |
| `fitWithFloor(items, c)` | a floor-aware 1PL location fit — a prototype of exactly what Option 1 would add to `ability.ts`, used here only to size the benefit |
| `runChild` / `runChildFixed` | one session, variable-length or fixed-budget |
| `traceChild` | fixed-budget session returning per-area traces, for the trajectory table |
