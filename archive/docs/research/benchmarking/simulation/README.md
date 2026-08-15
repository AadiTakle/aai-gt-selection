# Benchmarking figures: generative model, and how real data replaces it

This directory generates the seven figures in the benchmarking paper. It contains the
whole argument for why anyone should believe them, and the whole list of reasons they
might be wrong.

---

## 1. Claim boundary — read this before anything else

**Every number in every figure came out of a simulation. None of it is evidence about a
real child, a real admission decision, or the real validity of any instrument.**

The cohort is *born-synthetic*: no real record was read, sampled or transformed to make
it. What the figures show is what the world would look like **if** the parameters in
`params.py` were true. Their job is to make the design of a future study legible and
attackable before it is run, and to show what each figure would look like under
different assumptions so a reader can tell which conclusions are robust and which are
downstream of a number somebody chose.

Three specific things the figures **do not** establish:

- **They are not predictive validity.** Predictive validity would need real outcomes.
- **They are not programme impact.** Nothing here is a counterfactual. A child who
  "thrives" in this simulation thrives relative to other simulated children in the same
  simulated programme, not relative to the school they would otherwise have attended.
- **They are not a claim that the instrument works.** They are a claim about what would
  have to be true for it to work, and about how you would find out.

Every figure carries a red `SYNTHETIC DATA` banner burned into the image so it still
says this if it is lifted into a slide deck. Figures involving the CogAT comparator carry
a second, blue `PROJECTED STUDY DESIGN` banner.

---

## 2. Running it

From a clean checkout, with Python 3.9 or later:

```bash
cd docs/research/benchmarking/simulation
python3 -m pip install -r requirements.txt   # numpy + matplotlib only
python3 make_figures.py
```

That writes PDF and PNG for all seven figures to `../figures/`, plus:

- `results.json` — every number that appears on a figure, so a claim in the paper can be
  checked against the run that produced it rather than against a picture;
- `manifest.json` — SHA-256 of every output.

To verify reproducibility:

```bash
python3 make_figures.py --check
```

This regenerates everything from the seed and fails if any output differs from the
committed manifest. Runtime is about 12 seconds.

**Nothing was added to the repository's own dependency manifests.** This package is not
wired into `package.json`, `pnpm-workspace.yaml` or any lockfile.

One environment caveat, stated because it will otherwise look like a bug: numpy 2.0 built
against Apple's Accelerate BLAS leaves the floating-point status register dirty after a
matrix multiply, so correct results raise spurious "divide by zero" / "overflow" warnings.
`make_figures.py` verifies the arithmetic is correct on a known input and only then
suppresses those specific warnings. If arithmetic ever really breaks, the check fails and
the warnings return.

---

## 3. The generative model

Five layers. Every constant is in `params.py` with a provenance tag and a justification.

### 3.1 Latent traits

| Symbol | Meaning | Distribution | Provenance |
|---|---|---|---|
| `theta` | standing ability on the instrument's 1–20 scale | N(10.5, 3.0²) in the national reference population | the exact parameters the Stage 2 harness used, so the simulated child here is the same simulated child the measurements were taken on |
| `lambda` | learning rate, scale points per trial | N(0.06, 0.03²) | same harness |
| `opportunity` | family resources, tutoring, articulate advocacy | standard normal, corr 0.35 with `theta` | assumed |
| MAP maths / reading achievement | latent achievement | standard normal, corr 0.70 / 0.55 with `theta` | assumed |

`corr(theta, lambda) = 0.30` is **the single most load-bearing assumption in the whole
package** and nobody has measured it. See §7.

### 3.2 Who applies

Applying is not random: `P(applies) = Phi(c + 0.8 · z_theta)` with `c` set for a 25% base
apply rate. The realised pool sits **+0.81 SD** above the national mean with **0.85** of
its spread. The narrowing is produced by the model rather than imposed, and it is what
later makes range restriction bite.

### 3.3 What the instrument observes

**Standing score.** `theta_hat = theta + N(0, 1.068²)`, clamped to [1, 20]. That error has
two parts:

- the Fisher standard error of the shipped 1PL fit, reproduced from `ability.ts` at
  7 items per area across 4 areas with the prior — **0.375** scale points on the
  composite; and
- an uncalibrated-difficulty term of **1.0** scale points, which dominates. No bank item
  has a calibrated difficulty; every one is a design estimate on a bank carrying
  `validated: false`. Sweeping every integer ability through the real engine before
  D-024/D-025 breached a 1.5-point tolerance at five of eighteen levels, worst case 2.67.

Total: standing reliability **0.82** within the applicant pool. If the bank is ever
calibrated this number rises and every instrument curve in the paper improves.

**Learning-rate readout.** Simulated at its *measured* precision, from
`docs/product/STAGE2_BANK_RECOVERY_MEASUREMENT.md` on `FLU-OPCHAIN-01`:

```
E[lambda_hat | lambda] = contamination_floor + attenuation · lambda
```

|  | 30 trials (as administered) | 60 trials (hypothetical) |
|---|---|---|
| recovery correlation with truth | 0.332 | 0.659 |
| mean posterior SE | 0.063 | 0.028 |
| contamination floor | 0.0097 | **0.0094** |
| attenuation slope | 0.633 | 0.633 |

The floor is the mean `lambda_hat` fitted for a cohort that learned *nothing* — a
systematic bias produced by the closed adaptive loop, not by any child. **Doubling the
block halves the random error and does not move the floor.** The simulation reproduces
both halves.

The recovery correlation drives the noise, not the posterior SE, because the correlation
is what determines whether a cohort can be ordered. The implied noise SD is 0.054 at 30
trials against a reported posterior SE of 0.063, so the reported posterior SE is mildly
conservative. Both are in `results.json`.

### 3.4 The two criteria

**Mastery pace** (primary, platform-internal, **endogenous**):

```
z_mastery = 0.35·z_theta + 0.40·z_lambda + 0.30·z_routing + residual
z_routing = rho_route·z_theta + sqrt(1-rho_route²)·xi
```

The child-level paths are identical whatever `rho_route` is. Only how strongly the
platform's routing tracks ability moves. Any change in estimated validity across that
sweep is endogeneity in the criterion, not a change in the instrument or the child.

**MAP conditional growth percentile** (external anchor, **exogenous**). This is the only
part of the model resting on external published psychometrics, and all four constants are
cited:

| Constant | Value | Source |
|---|---|---|
| CSEM of one MAP Growth event | 3.3 RIT (design target 3.5; Maths grades 3–8 observed 3.22–3.34) | NWEA, *MAP Growth Technical Report 2024–2025*, §7.5.1 and Table 7.5 |
| SD of normative fall→spring growth, Mathematics | 8 RIT (grades 3–6; 8–9 for 7–8) | NWEA, *2025 MAP Growth norms quick reference*, mathematics student growth norms |
| Mean normative fall→spring growth, grade 5 Maths | 10 RIT | same |
| Expected growth per RIT of starting score | −0.10 | NWEA blog, *To measure a year's growth, begin with the student* (2025); the worked example is grade 1, so the sign and magnitude transfer is flagged |

Growth is generated, measured twice with CSEM error, and converted exactly the way NWEA
does it: `CGI = (observed growth − projected growth) / SD_growth`, `CGP = 100·Phi(CGI)`.

**The derived number that matters most.** The published growth SD of 8 RIT is an
*observed* spread and already contains the error of two test events, `sqrt(2)·3.3 = 4.67`
RIT. So true-growth SD is `sqrt(8² − 4.67²) = 6.50` RIT, and **the reliability of a single
fall→spring conditional growth index is 0.66.** The external anchor is immune to routing
*and* noisy. Both halves are true and the figures state both. This is the standard
unreliability-of-difference-scores result (Rogosa, Brandt & Zimowski 1982; Willett 1988).

Routing loading on MAP growth is **zero by construction and by argument**: MAP is
administered outside the platform against a national scale. The honest caveat, because a
reviewer will raise it: routing could still affect MAP growth *indirectly*, by changing
what the child actually learns. That is a real effect of the programme rather than a
measurement artifact, and it is exactly the distinction the dual criterion draws.

### 3.5 The admission officer

A caricature of one person's judgement, built from what she said her rule is plus two
documented ways human review departs from any rule:

```
utility = 1.00·z_cogat + 0.70·z_map_maths + 0.25·z_irrelevant + N(0, 0.45²)
admit   = passes_reading_gate AND utility in the top 55% of gate-passers
```

The **reading gate** is documented, not invented: at least the 85th-percentile fall MAP
Reading for the entering grade regardless of CogAT, waived only for a 99th-percentile
cognitive child reading at the 70th–80th, "usually only for English-as-a-second-language
learners" (E-096). In this cohort **27%** of applicants clear the gate and the officer
admits **14.8%** of the pool.

The **construct-irrelevant weight** is not a slur on the officer; it is the documented
behaviour of unstructured review. Unstructured recommendations encode advocacy and
prestige (E-021), freeform holistic review is less reproducible than structured pathways
with mechanical combination (E-023), and a substantial share of gifted-rating variance is
attributable to the rater rather than the student (E-020).

The **open-enrolment regime** applies no gate and admits 97%. "Frankly, for GT Anywhere
right now, they just let everybody in" (E-101 context, Crystal Martel interview).

---

## 4. How each synthetic quantity is replaced by real data

This is the operative section. Each row is a field in the generator, the real source that
replaces it, what the analysis needs from that source, and how it can go wrong.

### 4.1 Confirmed data element

**The three-times-yearly MAP administration is the one confirmed element.** Everything
else in this table is provisional and marked so in §5.

| Synthetic field | Real replacement | What the analysis needs | Quality problems to expect |
|---|---|---|---|
| `map_fall_rit`, `map_cgi`, `map_cgp` | NWEA MAP Growth student-level export, fall and spring, one predeclared subject | student ID, term, subject, RIT, achievement percentile, **CGI and CGP as reported by NWEA** (do not recompute), test duration, rapid-guessing flag | (1) Do **not** recompute CGI from rounded report values — NWEA's own guidance says the report figure is more precise because it uses your customised weeks of instruction. (2) Disengaged rapid-guessing inflates error and is not missing-at-random. (3) Students who leave before spring are missing **non-randomly**; a growth analysis on completers only is a second selection problem on top of admissions. (4) Grade and subject must be fixed in advance: choosing the subject after seeing results is a garden of forking paths. |

### 4.2 The instrument (exists, in this repository)

| Synthetic field | Real replacement | What the analysis needs | Quality problems to expect |
|---|---|---|---|
| `theta_hat` | `ExamScore.composite` from `packages/exam-scoring` | per-area proficiency, composite, item count per area, the policy hash, bank version | The composite's error is dominated by uncalibrated item difficulties, not by the Fisher SE. Until the bank is calibrated against real responses, `theta_hat` carries roughly 1 scale point of error that the shipped SE does not report. Any real study must record the bank version, because a bank change moves the scale. |
| `lam_hat_current` | `estimateLearningCurve` output: `lambda`, `lambdaSe`, `trials` | the fitted lambda, its posterior SD, the trial count, the block's item IDs, and the **declared contamination floor for that bank** | **The readout is currently not reportable.** D-200 requires a caller to declare a contamination floor, and against the only reference SD with a stated provenance (0.03) every block reads `indeterminate`. A real study can still *store* lambda and use it as a covariate; it cannot report a child's rate. |
| `theta`, `lam` (latent truth) | **Never observable.** | — | Any real analysis works with the observed scores only. Every latent-space panel in these figures (panel b of `fig:cluster-projection`) becomes impossible with real data and must be dropped, not approximated. |

### 4.3 Mastery pace (assumed to exist — confirm before designing around it)

| Synthetic field | Real replacement | What the analysis needs | Quality problems to expect |
|---|---|---|---|
| `mastery_neutral` / `mastery_correlated` | platform mastery event log | student ID, objective/lesson ID, mastery timestamp, minutes of active time, **and the routing decision that placed the child on that objective** | The routing field is the one that matters and the one most likely to be absent. Without it, `rho_route` is unidentifiable and `fig:criterion-contamination` cannot be estimated — only assumed. Also: mastery events are not comparable across subjects or difficulty tiers without a normalisation the platform may not expose; "active time" is usually a heuristic; and a child who masters objectives quickly *because the platform served easy ones* is indistinguishable from a fast learner in a log that omits routing. |
| `routing_xi`, `rho_route` | the platform's placement/recommendation log | for each objective served: the child's state at the time, the candidate set, and which was chosen | If placement is a black-box model, record its inputs and output score. If it is a human decision, record who. If neither is recorded, say so in the paper and treat the mastery-pace validity estimate as an upper bound. |

### 4.4 CogAT (does not exist yet)

| Synthetic field | Real replacement | What the analysis needs | Quality problems to expect |
|---|---|---|---|
| `cogat_z`, `cogat_percentile` | CogAT Form 8 score reports; GT has committed to supplying these for its ~46 on-campus students, plus historical distributions from Riverside (E-100) | age-based standard age scores for Verbal, Quantitative and Nonverbal, the composite, the **form and norm year**, and the test date | (1) Norm year matters and is often omitted from a school's records. (2) Scores gathered across several years under different forms are not directly comparable. (3) ~46 students is too few to estimate an AUC difference. Subsampling this cohort to n = 46 gives a median 95% CI half-width on a *single* AUC of **0.169** — five times the +0.034 difference the figure reports. **`fig:decision-accuracy-roc` and `fig:incremental-validity` are not runnable at GT's current on-campus scale**; they need the ~300-student virtual cohort or several years of records. |

### 4.5 Historical admission decisions (exist, not in hand)

`fig:officer-agreement` is **fully synthetic and stays synthetic** until real decision
records arrive. The minimum record format that would replace it:

| Field | Type | Why the analysis needs it | Required? |
|---|---|---|---|
| `applicant_id` | pseudonymous, stable | joins the decision to scores and outcomes | **required** |
| `decision_date` | date | rules drift; a rule fitted across a policy change fits neither side | **required** |
| `decision` | enum: admit / decline / waitlist / withdrew / no-decision | withdrawals and waitlists are **not** declines and must not be collapsed into them | **required** |
| `programme` | enum: on-campus / virtual | the two have completely different selection ratios and cannot be pooled | **required** |
| `entering_grade` | integer | the reading gate is grade-referenced | **required** |
| `reviewer_id` | pseudonymous | without it, rater variance is silently attributed to the applicant | **required** if more than one reviewer ever decided |
| every score in front of the reviewer at decision time | numeric + instrument + form + norm year | a rule cannot be compared to a human on information the human did not have | **required** |
| `score_available_at_decision` | bool per score | scores added to a file afterwards must be excluded from the rule | **required** |
| `gate_outcome` | enum: passed / failed / waived | separates the documented hard rule from discretionary judgement, which is the whole of panel (c) | strongly wanted |
| `decision_rationale` | free text or coded reason | the only way to check whether disagreements track a stated reason or an unstated one | strongly wanted |
| `capacity_constrained` | bool | a decline for lack of a seat is not a judgement about the child and must not be modelled as one | strongly wanted |
| `shadow_day_completed` | bool | on-campus decisions follow a shadow day; virtual ones do not | wanted |

Two things the analysis needs that are *not* fields:

1. **Declines as well as admits.** A file of admitted students only cannot estimate a
   decision rule at all. If declined applications were not retained, say so; the figure
   then becomes permanently unrunnable rather than pending.
2. **The stated rule as written at the time**, so that departures from it can be measured
   against what was actually in force rather than against current practice.

### 4.6 Everything else

| Synthetic field | Real replacement | Note |
|---|---|---|
| `opportunity`, `officer_irrelevant` | **no real replacement, and none should be built** | These exist to make the officer imperfect in a documented way. Constructing a real "narrative polish" score for real applicants would be building the discriminatory instrument the paper warns about. In a real study the residual disagreement is simply *unexplained*, and panel (c) of `fig:officer-agreement` becomes "disagreements are/are not predicted by observables", which is a weaker but honest claim. |
| `success` (binary) | a predeclared threshold on the continuous criterion | Dichotomising loses information and is done only because ROC, PPV and confusion matrices require it. Predeclare the threshold; choosing it after seeing outcomes invalidates every interval on every figure. |

---

## 5. Data elements this model assumes exist — confirm before relying on them

Per the owner's instruction: **only the three-times-yearly MAP administration is
confirmed.** Everything below is an assumption to confirm, not an established fact.

| Assumed element | Status | Consequence if it does not exist |
|---|---|---|
| MAP administered 3×/year, fall/winter/spring | **CONFIRMED** | — |
| Student-level MAP export including CGI/CGP, not just school reports | assumed | Growth analysis falls back to raw RIT change, losing the conditioning on starting RIT — the property that makes MAP a fair growth measure for high starters. Serious loss. |
| Platform logs objective-level mastery events with timestamps | assumed | The primary criterion disappears. The paper falls back to MAP alone, and every "mastery pace" panel is dropped. |
| Platform logs the routing decision behind each objective | assumed, **least likely to exist** | `fig:criterion-contamination` becomes unestimable. The endogeneity argument survives as an argument; the figure becomes an illustration of a risk rather than a measurement of one. |
| Active-time or engagement duration per session | assumed | "Objectives per unit time" becomes "objectives per calendar week", which confounds pace with attendance. |
| Declined applications retained with scores | assumed | `fig:officer-agreement` and `fig:range-restriction` both become unrunnable. |
| CogAT records recoverable for past cohorts | committed but not delivered (E-100) | Two figures stay projections indefinitely. The no-comparator versions in panel (b) of `fig:incremental-validity` and panel (c) of `fig:decision-accuracy-roc` are unaffected — they were built for exactly this case. |

---

## 6. Which figures are load-bearing on contestable assumptions

Ranked by how much a reasonable sceptic could move them.

| Figure | Load-bearing on | How much it moves | Verdict |
|---|---|---|---|
| `fig:incremental-validity` | `corr(theta, lambda) = 0.30`; `CogAT loading on lambda = 0` | **Very high.** At corr 0.9 the incremental columns collapse to near zero. If CogAT carries indirect learning-rate signal, the CogAT bar rises and the increment shrinks. | **Most contestable figure in the set.** Do not quote its increments without the correlation. |
| `fig:cluster-projection` | same correlation; plus that a second axis exists at all | **High** for panel (a)'s tilt; **low** for the headline. The finding that the boundary is nearly vertical at current precision is driven by *measured* recovery (r = 0.33), not by the assumed correlation, and survives any value of it. | Headline robust, tilt contestable. |
| `fig:officer-agreement` | the officer's weights, her noise SD, her irrelevant weight — all assumed | **High** in level, **low** in structure. κ moves a lot with her noise SD. The *pattern* — reading gate on one side, construct-irrelevant impression on the other — is built into the model and would be reproduced by any officer model with a hard gate and an irrelevant weight. | The figure demonstrates a method, not a result. It is labelled pending real records. |
| `fig:decision-accuracy-roc` panels (a), (b) | CogAT reliability (0.94, unverifiable — see below) and its 0.85 correlation with `theta` | **High.** Raising the assumed comparator reliability closes the gap; lowering it opens one. | Projection only. Sweep the reliability before quoting. |
| `fig:decision-accuracy-roc` panel (c) / `fig:criterion-contamination` | that routing affects mastery pace at all | **Low for the direction, high for the magnitude.** The mechanism is close to a certainty in a personalised-mastery platform. The slope depends on `BETA_ROUTING_MASTERY = 0.30`. | **Most robust qualitative claim in the set.** The MAP line is flat *by construction*, and that construction is the argument, not a result. |
| `fig:ppv-base-rate` | almost nothing | **Very low.** It is Bayes' theorem with sensitivity and specificity read off the simulated instrument. Change the instrument and the curves shift; the shape and the conclusion do not. | **Most robust figure in the set.** It would be true of any instrument. |
| `fig:range-restriction` | the officer's selection rule (which sets *how* indirect the restriction is) | **Low for the headline, moderate for the correction.** That a selective study understates validity is arithmetic. That Case II recovers only 37% here depends on selection being indirect in this particular way. | Headline robust; treat the 37% as illustrative. |

**A note on the CogAT reliability.** It is set to 0.94 and swept, and it is *not* asserted
as a published fact. This repository already tried to verify CogAT Form 7/8 battery
reliabilities and could not: the Research and Development Guide was inaccessible, and a
secondary source's "high .90s for verbal and nonverbal, low .90s for quantitative" was
explicitly not asserted for that reason. Repeating a figure our own evidence review
refused to repeat would be worse than assuming one openly. The choice is conservative in
the sense that a *higher* assumed comparator reliability makes our instrument look worse.

---

## 7. What the figures would look like if reality differed

| If it turned out that... | Then... |
|---|---|
| `corr(theta, lambda)` is near 0.9 rather than 0.3 | `fig:incremental-validity`'s learning-rate columns flatten to the standing bar; `fig:cluster-projection` becomes a diagonal sausage with no second dimension; the case for a two-axis instrument largely dissolves. **This is the finding that would most damage the project, and it is cheap to check** — it needs only the instrument's own two scores on one cohort, no criterion at all. |
| routing is genuinely neutral (`rho_route ≈ 0`) | The two lines in `fig:criterion-contamination` become parallel, MAP is redundant as a *bias check* (though still useful as a second, external measure), and mastery-pace validity can be taken at face value. |
| routing tracks ability more strongly than 0.6 | Mastery-pace validity is inflated by more than the +0.098 AUC shown, and any published validity figure computed against platform outcomes alone is wrong by an amount nobody can bound without the routing log. |
| the item bank gets calibrated | Standing error falls from ~1.07 toward the Fisher value of 0.375, pool reliability rises from 0.82 toward 0.98, and every instrument curve improves. This is the highest-leverage engineering change available. |
| the learning block is lengthened to 60 trials | Exactly what panel (b) of `fig:incremental-validity` shows: ΔR² against MAP growth roughly doubles from +0.007 to +0.015, and the boundary tilt in `fig:cluster-projection` doubles from 0.33× to 0.69×. **The contamination floor does not move**, so the readout still may not be reportable as an absolute rate. |
| the true base rate is 60% rather than 30% | `fig:ppv-base-rate` says it directly: PPV rises from 0.44 to 0.73. If GT's current admits really do nearly all thrive, the selection problem is much easier than this paper assumes — and the instrument has correspondingly less to add. |
| the programme really admits everyone | Then `fig:range-restriction` is the *good* news: r = 0.222 against a truth of 0.239, needing no correction. Open enrolment is a methodological asset. |

---

## 8. Figure inventory

| LaTeX label | File | Panels | Banners |
|---|---|---|---|
| `fig:cluster-projection` | `fig-cluster-projection.{pdf,png}` | observed space with boundary · latent truth · why no band is reportable | synthetic |
| `fig:officer-agreement` | `fig-officer-agreement.{pdf,png}` | confusion + κ · calibration to outcome · structure of disagreement · who is right | synthetic, pending real records |
| `fig:decision-accuracy-roc` | `fig-decision-accuracy-roc.{pdf,png}` | ROC vs mastery pace · PR vs MAP growth · routing sweep (no comparator) | synthetic + projected |
| `fig:incremental-validity` | `fig-incremental-validity.{pdf,png}` | projected with CogAT · available now without | synthetic + projected |
| `fig:ppv-base-rate` | `fig-ppv-base-rate.{pdf,png}` | PPV curve · 100-children breakdown | synthetic |
| `fig:range-restriction` | `fig-range-restriction.{pdf,png}` | observed slice · validity vs selection ratio | synthetic |
| `fig:criterion-contamination` | `fig-criterion-contamination.{pdf,png}` | AUC sweep · validity sweep | synthetic |

`fig:criterion-contamination` is an **optional seventh figure**. The same contrast appears
compressed as panel (c) of `fig:decision-accuracy-roc`, so the paper can use either. The
standalone version exists because the endogeneity argument is the one most likely to be
attacked and may deserve its own float.

Include in LaTeX as:

```latex
\includegraphics[width=\textwidth]{figures/fig-cluster-projection.pdf}
```

Every figure prints its own conclusion in a strip beneath the panels. The LaTeX caption
should say the same thing; the strip exists so the figure cannot be reused without it.

---

## 9. Files

| File | Contents |
|---|---|
| `params.py` | **Read first.** Every assumed constant, with a provenance tag and a justification. |
| `cohort.py` | The generative model. Wires parameters together; invents nothing. |
| `statistics.py` | ROC/AUC with paired bootstrap CIs, precision-recall, logistic IRLS with cross-fitting, OLS R², Cohen's κ, calibration, Thorndike Case II, PPV. numpy only. |
| `plotstyle.py` | Okabe-Ito palette, greyscale-safe encodings, the mandatory banners, deterministic output metadata. |
| `figures.py` | One function per figure. Returns the numbers it plotted. |
| `make_figures.py` | Entry point and reproducibility check. |
| `results.json` | Every number on every figure. |
| `manifest.json` | SHA-256 of every output, plus the environment it was produced in. |

Colour never carries information alone: every series is separated by marker, hatch or
line style as well, so the figures survive greyscale printing and colour-vision
deficiency.
