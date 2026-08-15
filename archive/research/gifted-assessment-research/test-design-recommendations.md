# Test Design Recommendations & Proposal Review (research-grounded, conditional)

**Date:** 2026-07-21
**Status:** Research-grounded design guidance derived from `brainlift-gifted-assessment-quality.md`. **This is NOT a scope approval.** Building a new test is a non-requirement per `PROJECT_CHARTER.md`; committing to build requires `DECISION_LOG.md` + `SCOPE_EXCEPTION_LOG.md` entries. Every claim below traces to a source already verified in `source-register-annotated.md`.
**Requirements touched:** R5 (capability), R6 (growth/ceiling), R7 (auditability), R9 (fairness), R10 (claim boundaries); H1 (breadth incl. spatial), H4 (access), H10 (gaming/burden).

---

## Part 1 — If GT builds a screen, what the evidence actually supports

| # | Design choice | Why (evidence) |
|---|---|---|
| 1 | **Adaptive (CAT or multistage), grade/age-anchored start** | CAT gives "equal precision at all trait levels" and needs ~half the items for equal reliability vs. fixed forms (Weiss, 1982). This is the single best-supported choice. |
| 2 | **High ceiling / above-level headroom in the item bank** | The whole job is measuring the tail; the bank must extend well above grade level or gifted kids ceiling out and become indistinguishable (above-level testing: Assouline & Lupkowski-Shoplik, 2012; Warne, 2014). |
| 3 | **Multi-domain coverage that adds spatial** | Verbal/quant screens miss **70% of the spatial top-1%** (Wai, Lubinski & Benbow, 2009). Adding spatial is the biggest genuine coverage upgrade over CogAT. |
| 4 | **Score as an IRT ability estimate (θ) with a conditional SEM — report a band, not a point** | Quality at the tail = conditional SEM + classification accuracy/consistency at the cut (Baker, 2001; Livingston & Lewis, 1995; *Standards* 2.14–2.16), not a raw "level reached." |
| 5 | **Compensatory / OR-pathway combination — never a conjunctive AND gate** | AND rules across measures **maximize false negatives**; a universal screen that gates loses students it can only lose (McBee, Peters & Waterman, 2014; McBee, Peters & Miller, 2016). |
| 6 | **Repeated / multi-occasion measurement** | A one-shot score is unstable at the tail — ~half of top-3% scorers are gone within a year (Lohman & Korb, 2006). Two occasions or a re-test window + a boundary policy. |
| 7 | **Fairness engineered in: DIF / measurement invariance by subgroup; equal practice; measure device/game familiarity** | "Culture-fair" nonverbal tests still show 0.5–0.67 SD ELL gaps (Lohman, Korb & Lakin, 2008); game familiarity predicts game-based scores but not ability (Ohlms et al., 2025); invariance is testable (Meredith, 1993). |
| 8 | **Learning-science engagement layer** | Control-mastery tutorial to cut extraneous load (Sweller); adaptive difficulty for flow (Csikszentmihalyi; Weiss, 1982); **feedback, not tangible rewards** (rewards crowd out motivation, worse in children — Deci, Koestner & Ryan, 1999); low-anxiety framing (von der Embse et al., 2018). |

---

## Part 2 — Multi-phased? And how long for K-8?

**Multi-phased: yes — but only in three *good* senses, and never as an elimination gate.**

- **Good phasing (a): multiple construct segments** (verbal, quantitative/nonverbal, spatial) combined *compensatorily*. This is coverage, and it's supported.
- **Good phasing (b): universal adaptive screen → targeted confirmation for near-cut/boundary cases only** (above-level or individual follow-up). Keeps burden low while protecting the boundary (COGAT report's screen→finalist pattern).
- **Good phasing (c): multiple occasions** to beat one-shot instability (Lohman & Korb, 2006).
- **Bad phasing to avoid: a conjunctive pipeline** where each phase can eliminate a student. That is the single fastest way to manufacture false negatives (McBee et al., 2014).

**Length — the honest answer is "set by a precision stopping rule, bounded by developmental attention," not a fixed clock.**

- The *right* stopping rule for an adaptive test is **information-based**: stop each segment when the conditional SEM at the intended cut is small enough (that is what adaptivity is *for*; Weiss, 1982; Baker, 2001). This naturally shortens the test for very high and very low scorers.
- **Bounded by K-8 attention/fatigue and anxiety:** long sessions raise test anxiety and fatigue, which add construct-irrelevant variance (von der Embse et al., 2018; cognitive load — Sweller).
- **Practitioner anchors from cited instruments** (indicative, not proven optima): CogAT full battery runs ~90 min across nine subtests at older levels; NWEA MAP runs ~45–60 min adaptively.
- **Reasonable design target:** per-segment ~15–25 min with a precision stopping cap; total ~45–60 min for grades 5–8; **break into shorter ~20–30 min sessions for K–2**, ideally across **≥2 sittings/days** (which doubles as a second measurement occasion). Treat any fixed total as a *maximum*, with the stopping rule ending early once tail precision is met.

---

## Part 3 — Gap analysis of your 3-segment proposal

**Your proposal, restated:** (1) adaptive verbal, grade-anchored start; (2) adaptive quantitative/nonverbal, grade-anchored start; (3) gamified 3D spatial optimization (packing), timed, no optimality feedback, student decides when to move on, difficulty adapts to packing efficiency. **Grading:** difficulty level reached by end of allotted time, factoring answer speed and quality.

**What the research backs (real strengths):**
- Adaptive + grade-anchored start (segments 1–2) — strongly supported (Weiss, 1982).
- Including a spatial segment — fixes CogAT's biggest construct gap (Wai et al., 2009).
- An interactive 3D spatial task is a plausible, engaging way to sample genuine spatial visualization, and gamification can raise engagement (Sailer & Homner, 2020).

**Gaps, in priority order:**

**Gap 1 — The grading model is the weakest link: "difficulty reached in fixed time + speed" conflates ability with processing speed.**
- Adaptive tests should report an **ability estimate θ with a conditional SEM**, not "how far you got before the clock ran out." "Level reached under time pressure" is a *speeded* score that confounds reasoning ability with speed, rewards fast guessing, and penalizes reflective solvers — the opposite of what giftedness screening wants.
- Speededness disproportionately harms younger children, twice-exceptional and slower-processing-speed students, and ELL/less test-familiar students → hits R5 (defensible capability) and R9 (fairness).
- Speed is not useless, but it must be **modeled separately** (a response-time signal, e.g., to flag rapid guessing), not added into the ability score; and response time alone is insufficient even to infer engagement (Bergner & von Davier, 2019).
- **Fix:** score θ + SEM per domain with an information-based stopping rule; keep speed/latency as a *separate, non-decisional* process variable.

**Gap 2 — Segment 3 as specified injects construct-irrelevant variance and can't be put on a defensible scale yet.**
- **"Student decides when to move on" + "no optimality feedback"** means the score depends on each child's metacognition, risk tolerance, and satisficing-vs-optimizing style — not just spatial ability. Two children with identical spatial skill get different scores based on *when they choose to stop*. That is a validity threat if the target is spatial reasoning. (It's only a feature if you explicitly *want* to measure persistence/metacognition — in which case measure them separately, don't let them contaminate the spatial θ.)
- **"Adapts to packing efficiency"** is a fine adaptive idea, but without **IRT-calibrated** 3D tasks you cannot place them on a θ scale or compute a conditional SEM — so segment 3 can't be scored to the same standard as segments 1–2.
- The gamified 3D format is exactly where the **fairness threats bite hardest**: enjoyment contaminates game-based spatial scores and there are documented gender-subgroup concerns (Kim et al., 2023); prior gaming/device experience predicts game scores but not ability (Ohlms et al., 2025). Timed play re-imports the Gap-1 speededness problem.
- **Fix:** calibrate the 3D tasks (large sample) *or* treat segment 3 as a **secondary/research signal, non-decisional until locally validated** (consistent with the holistic-giftedness architecture); isolate the spatial construct from "when to stop"; give **equal mandatory practice** to neutralize novelty; run **DIF by gamer/non-gamer, device, and gender**.

**Gap 3 — Single sitting only → one-shot instability.**
- Even a great battery in one administration is unstable at the tail (Lohman & Korb, 2006). **Fix:** add a re-test window/second occasion, report classification *consistency*, and use a confidence band + boundary/retest policy for near-cut cases.

**Gap 4 — Combination rule is unspecified (and the default is dangerous).**
- If a child must do well on all three segments (implicit AND), false negatives balloon (McBee et al., 2014). **Fix:** state a **compensatory or OR-pathway** rule explicitly; it dominates fairness more than any single segment.

**Gap 5 — Coverage: strong on reasoning, but note what's absent.**
- Three reasoning domains, but **no achievement/domain-readiness signal** — reasoning ≠ readiness, a known CogAT gap. Whether you need one depends on how GT defines "capability to benefit" (may warrant one MAP-like domain).

**Gap 6 — Feasibility/validation burden is real.**
- Adaptivity needs an IRT-calibrated bank (~500 per 2PL item, ~1,000 per 3PL; Hulin, Lissak & Drasgow, 1982); 3D tasks are costly to author and calibrate; standardized tests are ≥3-year, multi-$M builds (National Academies, 2022). Feasible only with a calibration/norming/DIF plan — and only after the scope-exception decision.

**Gap 7 — The metric doesn't optimize the thing that defines quality.**
- "Difficulty reached" is a proxy that doesn't directly minimize **conditional SEM at the cut** or maximize **classification consistency** — the actual quality targets (Livingston & Lewis, 1995; *Standards*). Score to those.

---

## Part 4 — Verdict: does the research back this system?

**The architecture is largely evidence-aligned; the scoring model is where the research pushes back hardest.**

- **Backed:** adaptive + grade-anchored start; multi-domain incl. spatial; a gamified spatial segment as an *engagement* vehicle.
- **Against, as currently specified:** (1) the speed-weighted "difficulty reached in fixed time" grade; (2) the uncalibrated, self-paced, timed 3D score used as a co-equal *decision* input; (3) single-sitting-only; (4) an unstated (likely conjunctive) combination.
- **The one change that matters most:** replace "**level reached under a clock**" with "**IRT ability estimate (θ) + conditional SEM, stopped when tail precision is met**," and demote speed and "when-to-stop" to *separate, non-decisional* process signals.

**Net:** the research **backs your instinct** (adaptive, broad, spatial, engaging) and **is against your grading method** (speeded "how far did you get"). Keep the shape; change how you score it; calibrate or quarantine the 3D segment; add a second occasion; and specify a compensatory/OR rule with DIF checks.

---

## Part 5 — What would still need local validation (before any high-stakes use)

- IRT calibration + norming for every segment (especially the 3D tasks).
- Conditional SEM and classification consistency at GT's intended cut.
- Incremental validity of the spatial segment beyond verbal/quant.
- DIF / measurement invariance by SES, ELL, disability, gender, device, and gaming experience.
- A defined "capability to benefit" criterion the battery is meant to predict — kept distinct from any program-impact outcome (R4/R10).
