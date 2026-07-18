# Outcome Modeling and Causal Falsification Plan

## Primary Outcome Recommendation

Use a blocked randomized-offer ITT with baseline-adjusted endpoint ANCOVA on one validated high-ceiling scale score.

\[
Y_T=\alpha+\tau Z+\lambda_{block}+\beta X+\delta Z(X-\bar X)+\epsilon
\]

Where:

- \(Z\): initial randomized offer;
- \(Y_T\): fixed-horizon endpoint;
- \(X\): prespecified same-domain baseline;
- \(\lambda_{block}\): randomization block effects;
- \(\tau\): offer ITT.

Report:

- original score units;
- standardized effect using pooled pre-randomization SD;
- 95% interval;
- full randomized denominator;
- attrition by assignment;
- null/harmful/inconclusive interpretation.

Use HC2/HC3 plus design-matched randomization inference.

## Why ANCOVA

- Usually more precise than gain scores.
- Handles chance baseline imbalance.
- Gain scores contain error from both occasions.
- Baseline-adjusted gain analysis is algebraically endpoint ANCOVA.
- In nonrandom comparisons, neither ANCOVA nor gain scores creates causal identification.

Gain and Student Growth Percentile results remain descriptive.

## Reject as Primary

- Repeated-measures ANOVA
- Percentile change
- Student growth percentile
- Value-added model in one selected school
- Track A-versus-Track B route difference
- Compensatory “MIT readiness” composite

## Multiple Pretests

If available:

- `pre_0`: closest valid pre-randomization score
- `pre_1`: earlier comparable score

Use `pre_0` as required baseline. Add `pre_1`/pretrend only if prespecified and consistently available.

Multiple pretests improve precision and expose regression to mean. They do not remove observational confounding.

## High-Ceiling Gate

Require:

- conditional SEM/test information in target upper tail;
- limited HOSS/ceiling truncation;
- adequate top-tail variance;
- stable vertical linking and form calibration;
- practice/retest evidence;
- accommodated-mode comparability;
- item/calibration drift monitoring.

Monitor:

- maximum/HOSS rate;
- within-one-CSEM-of-HOSS rate;
- upper-tail CSEM/information;
- score variance;
- bunching/truncation;
- highest-baseline subgroup effects.

MAP Growth Math 6+ remains a conditional candidate, not a ratified outcome.

## Falsification Register

Every diagnostic records:

- variable/test;
- expected null;
- threat detected;
- method;
- power/precision;
- multiplicity;
- response to failure.

Passing a diagnostic supports plausibility; it does not prove causality.

## By Design

### Randomized offers

Use:

- assignment replay;
- descriptive balance;
- pretreatment placebo outcomes;
- negative controls as integrity checks;
- attrition diagnostics/bounds;
- first-stage/compliance audit;
- specification curve for analysis/missingness choices.

Do not use hidden-confounding metrics as the main randomization diagnostic.

### Regression discontinuity

Use:

- treatment first stage;
- running-variable density/manipulation;
- predetermined covariate continuity;
- pretreatment outcomes;
- placebo cutoffs;
- bandwidth/kernel/donut/mass-point sensitivity;
- robust bias-corrected inference.

Track B changes the below-cutoff policy, so the estimand may be A-side policy versus B-available policy.

### Matched comparison

Use:

- DAG-based covariate selection;
- overlap and distribution balance;
- pretreatment outcome histories;
- negative-control outcomes/exposures;
- matching/weighting specification curve;
- Rosenbaum gamma;
- robustness value/partial-\(R^2\);
- E-value or Oster delta only where their scale/assumptions fit.

Observed balance does not establish no hidden confounding.

### Phased rollout

Randomized rollout:

- analyze as cluster-randomized timing;
- model calendar time, clustering, duration, and sequence.

Nonrandom rollout:

- use modern staggered-DiD estimators;
- event-study pretrends/anticipation;
- placebo adoption dates;
- timing-predictor balance;
- negative controls;
- HonestDiD sensitivity bounds.

No significant pretrend is not proof of parallel trends.

## Causal DAG Minimum

Include:

- baseline capability/readiness;
- opportunity/resources;
- eligibility;
- offer;
- aid/package;
- enrollment/exposure;
- peer/staff interference;
- outcome;
- measurement error/ceiling;
- attrition/missingness.

Mark mediators and colliders to avoid invalid adjustment.

## Sensitivity Tools

- Lee bounds: treatment-induced attrition under monotonicity
- Rosenbaum gamma: hidden bias in matched sets
- E-value: risk-ratio-scale confounding strength
- Oster delta: proportional-selection linear-model sensitivity
- Robustness value/sensemakr: omitted-confounder partial-\(R^2\)
- HonestDiD: deviations from parallel trends
- Specification curve: all preregistered estimand-preserving alternatives

## Backend Fields

### Assignment

- protocol/version/hash
- eligible roster snapshot
- block and probability
- initial offer
- later waitlist offer
- enrollment/exposure
- treatment-package version

### Assessment event

- student/study ID
- occasion and planned horizon
- administration date
- subject/domain
- instrument/form/item-pool/calibration/scale/norm versions
- raw and scale scores
- theta/SEM/CSEM
- min/max/HOSS/LOSS
- ceiling flags
- mode/accommodation/validity
- retest/practice
- source checksum

### Missingness

- outcome expected/observed
- timing window
- reason
- withdrawal type
- follow-up attempts
- last contact

### Governance

- protocol and SAP versions
- preregistration
- code commit
- analysis snapshot and hash
- data provenance and corrections
- access/consent class

## Sources

- Vickers & Altman ANCOVA: https://doi.org/10.1136/bmj.323.7321.1123
- Lin adjustment: https://doi.org/10.1214/12-AOAS583
- Lord’s paradox: https://doi.org/10.1037/h0025105
- Barnett regression to mean: https://doi.org/10.1093/ije/dyh299
- Betebenner SGP: https://doi.org/10.1111/j.1745-3992.2009.00161.x
- Rothstein value-added critique: https://doi.org/10.1162/qjec.2010.125.1.175
- NWEA technical report: https://www.nwea.org/uploads/MAP-Growth-Technical-Report-2025.pdf
- Negative controls: https://doi.org/10.1097/EDE.0b013e3181d61eeb
- McCrary density: https://doi.org/10.1016/j.jeconom.2007.05.005
- Callaway–Sant’Anna: https://doi.org/10.1016/j.jeconom.2020.12.001
- Sun–Abraham: https://doi.org/10.1016/j.jeconom.2020.09.006
- HonestDiD: https://doi.org/10.1093/restud/rdad018
- Cinelli–Hazlett: https://doi.org/10.1111/rssb.12348
- Rosenbaum hidden bias: https://doi.org/10.1093/biomet/74.1.13
- Lee attrition bounds: https://doi.org/10.1111/j.1467-937X.2009.00536.x
