# Category G — Motivation, Effort & Engagement Structure — Research Shard

**Wave 1 breadth shard.** Requirements served (as research): **R11** (tunable screener), R7
(auditable/reproducible), R9 (fairness/student protection), R10 (claim boundaries); H10
(minimize gaming/burden). Decisions inherited: **D-015** (automated/reproducible), **D-016**
(adaptive), **D-017** (text-only; reading-as-capability; non-readers screened out).

**What this shard adds (scope).** The companion `gifted-assessment-quality` brainlift already
covers the *measurement-quality* facts on anxiety (GA 13.1), flow (GA 13.2), reward crowding-out
(GA 13.3), and gamification-vs-validity (GA 13.5), and the existing test-structure brainlift
already seeds Insights on response-time-as-gated-collateral, response consistency, and
engagement-gating (GA 13.8–13.10 / 14.1). **This shard does not re-derive those.** It goes deeper
on the **structural design levers** — framing, timing/timers, adaptivity, response-time-effort
detection, effort-moderated scoring, reproducible thresholds, feedback, and rewards — that keep
effort/engagement from *leaking into the score* while staying reproducible (D-015). Every fact is
tiered (T1 peer/meta · T2 Standards/canonical · T3 proponent/vendor · T4 practitioner) and flagged
(`[COI]`, `[ADJACENT]`, `[UNVERIFIED]`, `[gap]`).

> **Cross-cutting adjacency (read once, applies throughout G.3–G.7):** almost the entire
> response-time-effort / rapid-guessing / effort-moderated literature was developed on **adult /
> higher-education low-stakes accountability tests** (or K–12 accountability via NWEA), **not on
> K–8 gifted upper-tail screening**. Treat magnitudes as design-relevant mechanisms, not as
> K–8-calibrated constants. `[ADJACENT]` `[gap]`

---

## DOK 1 — Facts

### G.1 — Test-anxiety magnitudes in K–8 (baseline anchor; cross-referenced, not re-derived)
- Test anxiety is negatively associated with achievement in the target age band: **Grades 1–5
  r ≈ −.22 (k = 9); Grades 6–8 r ≈ −.25 (k = 16)**, from a 238-study meta-analysis. *(von der
  Embse et al., 2018, *J. Affective Disorders*, 227, 483–493, DOI 10.1016/j.jad.2017.11.048 — T1;
  cross-ref **GA 13.1**.)*
- A 20-year meta-analysis of primary-school children (ages 5–12; **N ≈ 53,617** per GA 13.1)
  confirms the negative anxiety–achievement link in exactly this population. *(Robson et al., 2023,
  *J. School Psychology*, DOI 10.1016/j.jsp.2023.02.003 — T1; cross-ref **GA 13.1**.)*
- **Load-bearing implication (extracts identically):** anxiety is a *known downward bias* on the
  score, so structure that lowers it can raise measurement fidelity **without** making the test
  easier. Full treatment lives in **GA 13.1**; here it is only the anchor for the structural levers
  below.

### G.2 — Structural anxiety mitigation: framing, speededness, and the visible-vs-hidden-timer nuance
- **Time pressure is a documented anxiety amplifier**, and time-constrained assessment *without* a
  visible time cue produced higher evaluation anxiety and lower math scores in children ages 7–9.
  *(Hallez & Vallier, 2025, *Eur. J. Investig. Health Psychol. Educ.*, 15(12):243, DOI
  10.3390/ejihpe15120243 — T1, **small n = 44**, `[ADJACENT]` timed math, France.)*
- **The visible timer *reduced* anticipatory anxiety** (vs. no timer) and **reduced inattentive /
  motor-instability behavior** (most for higher-ADHD-risk children), **with no significant change
  in performance**; timer-checking was heterogeneous (25% checked >7×/5 min). Mechanism proposed:
  a visible timer *offloads* the cognitive load of internally tracking time. *(Hallez & Vallier,
  2025 — T1, small n, `[ADJACENT]`.)*
- **Direction-of-effect caveat (extracts identically):** this evidence *complicates* the intake
  hypothesis "no visible countdown timer." For young children the harmful element is **uncertain /
  hidden time pressure and speededness**, not the visibility of a calm timer per se. `[gap]` no
  study isolates *no timer + no time limit* (fully untimed) against *visible timer* for a gifted
  reasoning screen.
- **Retry-friendly / mastery framing** as an anxiety lever is asserted mainly in practitioner
  sources; its *psychometric* cost/benefit (practice effects, security, reliable change) is a
  **retake-policy** question owned by **Category C** — cross-ref, do not decide here. `[ADJACENT]`
  `[gap]` (no K–8 gifted-screen evidence that per-item retries lower anxiety without inflating
  scores).

### G.3 — The stakes/effort paradox (the central tension of Category G)
- **Lowering stakes lowers anxiety but also lowers effort.** A synthesis of 12 studies / 25
  comparisons found motivated examinees outscored less-motivated examinees by an **average
  d ≈ 0.6**, and low motivation "is associated with a substantial decrease in test performance"
  and threatens validity. *(Wise & DeMars, 2005, *Educational Assessment*, 10(1):1–17, DOI
  10.1207/s15326977ea1001_1 — T1, `[ADJACENT]` higher-ed.)*
- Unmotivated test-takers inject **construct-irrelevant variance (CIV)**; test-taking motivation is
  positively correlated with performance, and score interpretation is biased if motivation is
  ignored. *(Finn, 2015, *ETS Research Report Series*, 2015(2):1–17, DOI 10.1002/ets2.12067 — T3
  institutional, `[ADJACENT]` higher-ed/accountability.)*
- **CIV is a formal validity threat.** The Standards define construct-irrelevance as "the degree to
  which test scores are affected by processes that are extraneous to" the construct, and name it
  (with construct underrepresentation) as one of the two principal threats to validity. *(AERA,
  APA & NCME, 2014, *Standards for Educational and Psychological Testing*, AERA — T2.)*
- **Extracts identically:** you cannot buy engagement by simply "making it low-stakes." A calm,
  low-anxiety frame must be paired with a **structural effort guarantee** (G.4–G.6) or effort
  itself becomes the leak.

### G.4 — Rapid-guessing / disengagement detection: Response Time Effort (RTE)
- **RTE** operationalizes effort from behavior, not self-report: for each item *i* a threshold
  **Tᵢ** separates *rapid-guessing* (RTᵢⱼ < Tᵢ → solution-behavior indicator SBᵢⱼ = 0) from
  *solution behavior* (RTᵢⱼ ≥ Tᵢ → SBᵢⱼ = 1); an examinee's **RTE = mean(SBᵢⱼ) over k items**,
  ranging 0–1 (1 = full effort). In validation it showed internal consistency **α = .97**,
  converged with self-reported effort (**r = .25**) and person-fit (**r = −.42**), and was
  **near-zero correlated with SAT** (discriminant — effort ≠ ability). *(Wise & Kong, 2005,
  *Applied Measurement in Education*, 18(2):163–183, DOI 10.1207/s15324818ame1802_2 — T1,
  `[ADJACENT]` 80-item university test.)*
- **A rapid guess is a choice to "momentarily opt out of being measured,"** occurs in **both high-
  and low-stakes** contexts, "does not reflect what a test taker knows and can do," and therefore
  "tends to negatively distort scores and… diminish validity"; the author concludes it "makes
  little sense to include them in scoring." *(Wise, 2017, *Educational Measurement: Issues and
  Practice*, 36(4):52–61, DOI 10.1111/emip.12165 — T1, **`[COI]` author is NWEA**, a commercial
  adaptive-test vendor.)*

### G.5 — Effort-moderated scoring / response-time-effort filtering (keeping effort out of the score)
- **Effort-moderated IRT** models each response by its strategy: responses below Tᵢ (rapid guesses)
  get a **constant chance probability (gᵢ = 1/#options)** while responses at/above Tᵢ are modeled
  by the standard 3PL. With rapid-guessing present it produced **better model fit, more accurate
  item-parameter estimates, more accurate test information, and higher convergent validity** than
  the standard 3PL. *(Wise & DeMars, 2006, *Journal of Educational Measurement*, 43(1):19–38, DOI
  10.1111/j.1745-3984.2006.00002.x — T1, `[ADJACENT]`.)*
- **Motivation filtering** (excluding/deweighting low-effort responses) has been shown to **remove
  CIV caused by lack-of-effort behavior** and to align low-stakes scores more closely with an
  independent high-stakes ability estimate. *(Wise & DeMars, 2005/2006, above; Finn, 2015 — T1/T3,
  `[ADJACENT]`.)*
- An **effort-monitoring CBT** design uses response-time effort *during* delivery to identify and
  act on low-effort responding rather than only post-hoc. *(Wise, Bhola & Yang, 2006, *Educational
  Measurement: Issues and Practice*, 25(2):21–30, DOI 10.1111/j.1745-3992.2006.00054.x — T1,
  `[ADJACENT]`.)*

### G.6 — Reproducible thresholds (D-015) and structural correlates of disengagement (D-017)
- **Thresholds can be set reproducibly.** Four Tᵢ-setting methods — a **fixed** threshold, a
  **surface-feature** rule (amount of reading required), **visual inspection** of RT distributions,
  and a **two-state mixture model** — yielded **only minor differences** in the resulting effort
  scores. *(Kong, Wise & Bhola, 2007, *Educational and Psychological Measurement*, 67(4):606–619,
  DOI 10.1177/0013164406294779 — T1, `[ADJACENT]`.)* → For D-015, a **pre-registered, locked** Tᵢ
  rule makes effort detection deterministic and auditable (ties **R7**, cross-ref **Category I**).
- **Structural features predict disengagement.** Items with **more text** and items **later in the
  test** drew **more** rapid-guessing; items **with a graphic** drew **less**; the only significant
  *examinee* predictor was SAT total score. *(Wise, Pastor & Kong, 2009, *Applied Measurement in
  Education*, 22(2):185–205, DOI 10.1080/08957340902754650 — T1, `[ADJACENT]`.)*
- **Extracts identically / D-017 collision:** a **text-only** screener (no graphics, reading = the
  capability) sits on the two features that *raise* rapid-guessing (heavy text, and cumulative
  position). This is a first-order structural risk for this specific product and ties directly to
  **session design / fatigue (Category F)** and **cognitive load (Category E)**. `[gap]` unstudied
  for K–8 gifted upper-tail.

### G.7 — Flow / challenge–skill balance achieved through adaptivity (cross-referenced)
- Engagement peaks when **challenge matches skill**: challenge above skill breeds **anxiety**,
  below it breeds **boredom**. *(Csikszentmihalyi, 1990, *Flow* — T2; cross-ref **GA 13.2**.)*
- **Structural bridge (extracts identically):** an adaptive engine (D-016) that targets item
  difficulty near the examinee's provisional ability estimate (moderate success probability;
  exact target is model-dependent) is *the same mechanism* that maximizes measurement information
  (GA 10.1 / Category A) **and** sustains the challenge–skill balance that protects effort — i.e.,
  adaptivity is an **effort lever that does not touch the score construct**. Detailed CAT
  item-selection/stopping mechanics are owned by **Category A**; not re-derived here.

### G.8 — Feedback timing & type inside a scored test (a risk, not a freebie)
- **Feedback is not reliably positive.** In a meta-analysis of **607 effect sizes / 23,663
  observations**, feedback interventions raised performance on average (**d = .41**) but **over
  one-third *decreased* performance**; the drop was **not** explained by sampling error or feedback
  sign, and effectiveness fell as attention moved **from the task toward the self**. *(Kluger &
  DeNisi, 1996, *Psychological Bulletin*, 119(2):254–284, DOI 10.1037/0033-2909.119.2.254 — T1,
  `[ADJACENT]` learning/organizational, not scored screening.)*
- Feedback impact is **positive or negative depending on type/level**: **self-level praise is
  least effective**, while feedback about the **task, process, and self-regulation** (and the
  "where to next?" question) is most effective; **timing matters**. *(Hattie & Timperley, 2007,
  *Review of Educational Research*, 77(1):81–112, DOI 10.3102/003465430298487 — T1, `[ADJACENT]`
  learning context.)*
- **Extracts identically:** any within-test correctness/score feedback is a **live variable that
  can change subsequent effort and thereby leak into the ability estimate** — the opposite of a
  reproducible, effort-clean score.

### G.9 — Reward / points / badges crowding out intrinsic motivation (cross-referenced)
- **Tangible / performance-contingent rewards undermined free-choice intrinsic motivation
  (d ≈ −0.28 to −0.40) and were "more detrimental for children than college students," whereas
  positive *verbal/informational* feedback *enhanced* it (d ≈ 0.33).** *(Deci, Koestner & Ryan,
  1999, *Psychological Bulletin*, 125(6):627–668, DOI 10.1037/0033-2909.125.6.627 — T1; cross-ref
  **GA 13.3**.)*
- **Extracts identically:** points/badges/leaderboards tied to performance are contraindicated in a
  children's screener; the *informational* half of the same literature is what G.8 says to keep —
  neutral, task-level, non-contingent framing. (Gamification's engagement≠validity distinction is
  owned by **GA 13.5**.)

---

## DOK 2 — Summary

Anxiety is a measurable downward bias on K–8 scores (G.1, GA 13.1), so structure that lowers threat
can improve *measurement*, not just comfort. But the defining tension of this category is that the
obvious anxiety fix — lowering the stakes — **also lowers effort**, costing roughly **d ≈ 0.6** in
performance and injecting construct-irrelevant variance (G.3), which the Standards name as a core
validity threat (G.3, T2). The resolution is **structural**: protect effort with mechanisms that do
not touch the score construct — **adaptive challenge–skill matching** (G.7, GA 13.2) to sustain
engagement, and **response-time-effort detection** (G.4) with **effort-moderated scoring or
filtering** (G.5) to keep disengaged "opt-out" responses from distorting ability estimates. These
effort rules can be made **deterministic and auditable** via a pre-registered response-time
threshold (G.6, D-015), but the same evidence warns that **heavy text and later item position drive
rapid-guessing** (G.6) — a direct collision with a text-only screener (D-017) and with session
design (Category F). Two engagement shortcuts are contraindicated: **within-test feedback**, which
*lowered* performance in over a third of studies and can leak into the score (G.8), and
**performance-contingent rewards**, which crowd out intrinsic motivation and are worse for children
(G.9, GA 13.3). Finally, the "hide the timer" intuition is only partly right: for ages 7–9 a
**visible** timer *reduced* anxiety and off-task behavior versus **hidden/uncertain** time pressure
(G.2) — the harmful element is speededness and time-uncertainty, not visibility. Almost all
effort/RTE evidence is adult/higher-ed and none is K–8 gifted-tail, so magnitudes are design
mechanisms, not calibrated constants (`[ADJACENT]` `[gap]`).

---

## Source register entries

Tiers: **T1** peer-reviewed empirical/meta · **T2** Standards/canonical · **T3** proponent/vendor/
institutional · **T4** practitioner. Flags: `[COI]`, `[ADJACENT]`, `[UNVERIFIED]`, `[gap]`.

| Source (as written) | DOI/URL | Tier | Flags | One-line fact (extracts identically) |
|---|---|---|---|---|
| von der Embse, N. P., Jester, D., Roy, D., & Post, J. (2018). Test anxiety effects, predictors, and correlates: A 30-year meta-analytic review. *J. Affective Disorders*, 227, 483–493. | 10.1016/j.jad.2017.11.048 | T1 | cross-ref GA 13.1 | Test anxiety ↔ achievement: Grades 1–5 r ≈ −.22 (k=9), Grades 6–8 r ≈ −.25 (k=16). |
| Robson, D. A., et al. (2023). Test anxiety in primary school children: A 20-year systematic review and meta-analysis. *J. School Psychology*. | 10.1016/j.jsp.2023.02.003 | T1 | cross-ref GA 13.1 | Confirms negative anxiety–achievement link in children aged 5–12 (N ≈ 53,617 per GA 13.1). |
| Hallez, Q., & Vallier, V. (2025). Time on Their Side: How Visual Timers Affect Anticipatory Anxiety, Performance, and On-Task Behavior in Elementary Math Assessments. *Eur. J. Investig. Health Psychol. Educ.*, 15(12):243. | 10.3390/ejihpe15120243 | T1 | `[ADJACENT]` (timed math, France), small n=44 | A visible timer lowered anticipatory anxiety and off-task behavior vs. no timer, with no performance change (ages 7–9). |
| Wise, S. L., & DeMars, C. E. (2005). Low examinee effort in low-stakes assessment: Problems and potential solutions. *Educational Assessment*, 10(1):1–17. | 10.1207/s15326977ea1001_1 | T1 | `[ADJACENT]` higher-ed | Motivated > less-motivated examinees by average d ≈ 0.6; low motivation substantially depresses scores/validity. |
| Finn, B. (2015). Measuring Motivation in Low-Stakes Assessments. *ETS Research Report Series*, 2015(2):1–17. | 10.1002/ets2.12067 | T3 | institutional (ETS), `[ADJACENT]` | Test-taking motivation is positively correlated with performance; unmotivated examinees inject construct-irrelevant variance. |
| AERA, APA & NCME (2014). *Standards for Educational and Psychological Testing.* Washington, DC: AERA. | testingstandards.net (2014 ed.) | T2 | — | Construct-irrelevant variance and construct underrepresentation are the two principal threats to validity. |
| Wise, S. L., & Kong, X. (2005). Response time effort: A new measure of examinee motivation in computer-based tests. *Applied Measurement in Education*, 18(2):163–183. | 10.1207/s15324818ame1802_2 | T1 | `[ADJACENT]` university test | RTE = proportion of items answered above a per-item time threshold Tᵢ; α=.97, converges with effort (r=.25), discriminant from SAT (~0). |
| Wise, S. L. (2017). Rapid-guessing behavior: Its identification, interpretation, and implications. *Educational Measurement: Issues and Practice*, 36(4):52–61. | 10.1111/emip.12165 | T1 | **`[COI]` NWEA**, `[ADJACENT]` | A rapid guess = "opting out of being measured"; distorts scores, so it "makes little sense to include them in scoring." |
| Wise, S. L., & DeMars, C. E. (2006). An application of item response time: The effort-moderated IRT model. *Journal of Educational Measurement*, 43(1):19–38. | 10.1111/j.1745-3984.2006.00002.x | T1 | `[ADJACENT]` | Scoring rapid guesses at chance and solution responses via 3PL improved fit, parameter accuracy, and convergent validity. |
| Wise, S. L., Bhola, D. S., & Yang, S.-T. (2006). Taking the time to improve the validity of low-stakes tests: The effort-monitoring CBT. *Educational Measurement: Issues and Practice*, 25(2):21–30. | 10.1111/j.1745-3992.2006.00054.x | T1 | `[ADJACENT]` | An effort-monitoring CBT uses response-time effort during delivery to detect/act on low-effort responding. |
| Kong, X. J., Wise, S. L., & Bhola, D. S. (2007). Setting the response time threshold parameter to differentiate solution behavior from rapid-guessing behavior. *Educational and Psychological Measurement*, 67(4):606–619. | 10.1177/0013164406294779 | T1 | `[ADJACENT]` | Four threshold-setting methods (fixed/surface-feature/visual/mixture) gave only minor differences → thresholds can be locked reproducibly. |
| Wise, S. L., Pastor, D. A., & Kong, X. J. (2009). Correlates of rapid-guessing behavior in low-stakes testing. *Applied Measurement in Education*, 22(2):185–205. | 10.1080/08957340902754650 | T1 | `[ADJACENT]` | More text and later position → more rapid-guessing; a graphic → less; sole examinee predictor was SAT total. |
| Kluger, A. N., & DeNisi, A. (1996). The effects of feedback interventions on performance… *Psychological Bulletin*, 119(2):254–284. | 10.1037/0033-2909.119.2.254 | T1 | `[ADJACENT]` learning/org | 607 ES/23,663 obs: mean d=.41, but over 1/3 of feedback interventions *decreased* performance. |
| Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research*, 77(1):81–112. | 10.3102/003465430298487 | T1 | `[ADJACENT]` learning | Feedback is positive or negative by type; self-level praise least effective; task/process/self-regulation most effective; timing matters. |
| Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6):627–668. | 10.1037/0033-2909.125.6.627 | T1 | cross-ref GA 13.3 | Tangible/performance rewards undermined intrinsic motivation (d ≈ −0.28 to −0.40), worse for children; positive verbal feedback enhanced it (d ≈ 0.33). |
| Csikszentmihalyi, M. (1990). *Flow: The Psychology of Optimal Experience.* Harper & Row. | worldcat.org/title/20392741 | T2 | cross-ref GA 13.2 | Challenge above skill → anxiety; below skill → boredom; matching sustains engagement. |

---

## Cross-references (cite, do not duplicate)

- **GA 13.1** (test anxiety depresses scores/adds noise in K–8) — this shard's G.1 anchor;
  von der Embse (2018) & Robson (2023) magnitudes live there. G.2–G.3 add the *structural* mitigation
  and the effort trade-off.
- **GA 13.2** (flow requires challenge–skill balance) — this shard's G.7 uses it as the bridge to
  **adaptivity (D-016 / GA 10.1 / Category A)** as an effort lever.
- **GA 13.3** (extrinsic rewards crowd out intrinsic motivation, worse for children) — this shard's
  G.9; Deci, Koestner & Ryan (1999) verified there.
- Also adjacent: **GA 13.4/13.5** (extraneous load / gamification-vs-validity), **GA 13.8–13.10 &
  14.1** (response time, consistency, engagement as a precondition) — this shard supplies the
  *structural* controls (RTE detection, effort-moderated scoring, locked thresholds) those Insights
  presuppose. In-repo: **Category A** (routing/stopping), **Category E** (cognitive load),
  **Category F** (session length/fatigue), **Category C** (retakes), **Category I** (determinism/audit).

---

## Product linkage (R11 screener)

1. **Capture response time and gate the score on effort, deterministically.** Log per-item RT,
   apply a **pre-registered, locked per-item threshold Tᵢ** (Kong, Wise & Bhola 2007) to flag
   rapid-guessing (Wise & Kong 2005; Wise 2017), and **effort-moderate or filter** flagged
   responses in scoring (Wise & DeMars 2006) so disengagement is removed as CIV *without* leaking
   into the ability estimate — and so the rule is reproducible/auditable (**D-015, R7, Category I**).
2. **Protect effort through adaptivity, not stakes or rewards.** Use challenge–skill matching
   (D-016 / GA 13.2 / GA 10.1) as the engagement mechanism; **do not** add points/badges/
   leaderboards tied to performance (Deci et al. 1999 / GA 13.3), and **do not** show within-test
   correctness/score feedback (Kluger & DeNisi 1996; Hattie & Timperley 2007) — both alter effort
   and can leak into the score.
3. **Design the text-only format against disengagement (D-017 collision).** Because heavy per-item
   text and later position drive rapid-guessing (Wise, Pastor & Kong 2009) and the screener is
   text-only, **cap per-item reading load**, monitor position/fatigue, and treat rising
   rapid-guessing late in a session as a **stop/segment** signal (cross-ref **Category F / E**).
4. **Frame low-threat without inviting disengagement.** Use non-punitive, low-stakes framing and
   avoid hidden/uncertain time pressure; if any pacing is displayed, prefer a **calm visible timer**
   over a hidden countdown (Hallez & Vallier 2025) — but **pair** the low-anxiety frame with the
   effort monitoring in (1) to defuse the stakes/effort paradox (Wise & DeMars 2005).

---

## Tensions / disagreements (DOK 3 seeds — no insights/stances written)

- **Anxiety ↓ vs. effort ↓ (core paradox).** Lowering stakes reduces anxiety (GA 13.1) but reduces
  motivation/effort by ~d 0.6 and invites rapid-guessing (Wise & DeMars 2005). The structure must
  achieve *both* — an unresolved design optimization, not a settled recommendation.
- **"Hide the timer" vs. the child timer evidence.** The intake hypothesis ("no visible countdown
  timer") conflicts with ages-7–9 findings that a *visible* timer lowers anxiety and off-task
  behavior versus *hidden* time pressure (Hallez & Vallier 2025). Open: is *fully untimed* better
  than *visible-timed*, or does untimed low-stakes invite disengagement? `[gap]`
- **Effort filtering vs. fairness.** Excluding/deweighting rapid responses removes CIV (Wise 2017)
  but assumes *fast = disengaged*; for young children this could misclassify slow readers,
  motor-limited children, or ADHD profiles as "disengaged" (note Hallez & Vallier's ADHD-related
  timer effects), a fairness risk owned by **Category H**. `[ADJACENT]` `[gap]`
- **Effort-moderated scoring vs. reproducibility/comparability.** A model that switches response
  functions per strategy (Wise & DeMars 2006) improves validity but makes the score depend on a
  behavioral classification — does that strengthen or complicate deterministic, comparable scoring
  (**D-015 / Category I**)? Unresolved.
- **Feedback: engagement vs. clean measurement.** Some feedback raises effort (which we want), yet
  over a third of feedback interventions lowered performance (Kluger & DeNisi 1996) and any
  performance-contingent feedback risks crowd-out (Deci et al. 1999) and score leakage — a direct
  conflict between "engaging" and "measuring."
- **External validity.** Nearly all RTE/effort/feedback magnitudes are adult / higher-ed / K–12
  accountability, not K–8 **gifted upper-tail** screening; whether thresholds, effects, and the
  rapid=disengaged assumption transfer to this population is unverified. `[ADJACENT]` `[gap]`
