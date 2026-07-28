# BrainLift: How Ability Tests Are Measured, and the Statistical Methodology for Proving a New Screener Beats the Incumbent

## Owners

- Aadi Takle

## Purpose

### Purpose

Gifted identification runs on instruments whose statistical properties are published, contested, and frequently misunderstood — standardised score scales, norm samples that thin out precisely in the tail where identification happens, and reliability coefficients that describe the average test-taker rather than the one standing at the cut score. This BrainLift has two jobs. First, establish how such tests are actually built, scaled, and evaluated. Second, and primarily: assemble the **statistical methodology and named tooling** by which a *new* screener could be shown to outperform an established instrument — deliberately **criterion-agnostic**, because the outcome variable that matters in any real deployment is likely to be proprietary or institution-specific. The methods must therefore hold for whatever criterion is eventually chosen. The through-line is that an identification screener makes a **decision**, so it must be judged with decision statistics rather than correlations, and that predicting an outcome is not the same as causing one. It argues from external evidence and general principles only, and is written to be read with no knowledge of any specific product or codebase. *(DOK 1–2 are AI-assisted and citation-verified; DOK 3–4 are the author's to own. Companion: `source-register-annotated.md`.)*

### In Scope

- **How ability tests are constructed, scaled, and reported** — standardisation and norming, IRT and vertical scaling, standard scores, conditional standard error of measurement, ceiling/floor and the thin-tail problem, norm obsolescence and the Flynn effect, and the published technical characteristics of the instruments actually used in gifted identification.
- **What validity formally means** — the unified construct-validity conception, the professional testing standards and their sources of validity evidence, argument-based validation, validity for an *intended use*, and the live dispute over consequential validity.
- **Reliability and precision methodology** — internal consistency and its documented misuse, test–retest and practice effects, generalizability theory and D-studies, conditional SEM and information functions, decision consistency and decision accuracy, and the reliability of change.
- **Decision and classification evaluation** — sensitivity, specificity, predictive values, the base-rate problem for a rare classification, ROC/AUC and its limits at a fixed threshold, formal tests for comparing two instruments' discrimination, decision-curve/net-benefit analysis, selection-utility models, and standard setting.
- **Head-to-head comparison against an incumbent** — correlation versus agreement, classification-agreement statistics and their paradoxes, the formal distinction between equating, calibration, concordance and moderation, incremental validity and the methodological critiques that make such claims fragile, honest out-of-sample performance estimation, and correction for range restriction and selection effects.
- **Fairness methodology** — differential item functioning, measurement invariance and what each level licenses, differential prediction, the formal impossibility results for simultaneous fairness criteria, and construct-irrelevant variance.
- **The claim boundary** — why predictive validity is not program impact, and which designs (regression discontinuity at a cut score, matched comparisons, randomisation) can support a causal claim.
- **Named, implementable tooling** — the specific public statistical packages that compute each method.

### Out of Scope

- **Which individual signals to collect** — the incremental validity of response time, telemetry, confidence, error type, or learning rate is owned by the companion `metric-evidence` BrainLift. This BrainLift evaluates *instruments*; that one evaluates *signals*.
- **The structure and delivered experience of the test** — adaptive routing, ordering, session design, and retakes are owned by the companion `test-structure` BrainLift.
- **Substantive conclusions about instrument quality and tail metrics** — owned by the companion `gifted-assessment-quality` BrainLift; this BrainLift supplies methodology rather than re-deriving those verdicts.
- **Full causal identification of a program's effect** — owned by the companion `gt-school-counterfactual` BrainLift. This BrainLift marks the boundary where prediction stops and causal inference begins, and hands off.
- **Choosing or defining the criterion itself.** Deliberately excluded: the outcome variable is treated as an unspecified input, because a real criterion is likely proprietary. Only methods that are agnostic to the choice belong here.
- **Any mapping of these methods onto a specific build, validation schedule, dataset, or roadmap** — belongs in a separate product/design document, not this BrainLift.

---

## DOK 4: Spiky Points of View (SPOVs)

> **To be authored by the owner.** Per the BrainLift method, DOK 4 is the author's stance and
> cannot be delegated. Drafts offered during assembly are explicitly labelled starting points
> to be interrogated, rewritten, and owned — not finished positions.

---

## Experts

> Chosen for productive tension — the disagreements between these camps are where the DOK 3
> insights come from.

---

## DOK 3: Insights

> **To be authored by the owner.** Candidate cross-source connections surfaced during research
> are collected as *starter hypotheses* only; an insight becomes a DOK 3 insight when the author
> has interrogated it and can defend it.

---

## DOK 2: Knowledge Tree
