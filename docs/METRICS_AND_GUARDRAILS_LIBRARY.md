# Metrics and Guardrails Library

## Status

This is a solution-agnostic reference library, not an approved metric set. Select only metrics that serve the ratified concept and define their formulas, data sources, owners, thresholds, and claim implications before use.

Metrics do not create causal validity. The identification design determines what can be attributed to the program.

## Impact and measurement

| Candidate metric | Purpose | Required caution |
|---|---|---|
| Baseline-adjusted primary academic outcome | Estimate outcome difference relative to starting level | Requires a credible comparison and high-ceiling outcome |
| Minimum-detectable to meaningful-effect ratio | Test whether the design is informative enough | Meaningful effect must be justified independently |
| Overall and differential attrition | Detect missing-outcome threats | Report by assignment group and relevant subgroups |
| Outcome ceiling/compression rate | Detect inability to measure gifted growth | Maximum-score rate alone may miss upper-tail imprecision |
| Treatment uptake and crossover | Interpret assignment versus participation | Per-protocol comparisons can reintroduce selection |
| Spillover exposure | Detect contamination across groups | Keep descriptive unless interference is causally modeled |

## Selection reliability

| Candidate metric | Purpose | Required caution |
|---|---|---|
| Eligibility-result agreement | Test whether trained reviewers or repeated runs agree | Agreement does not prove construct validity |
| Selection process-error rate | Track incorrect inputs, rules, or outputs | Separate data errors from legitimate boundary uncertainty |
| Decision override count | Detect discretionary departures from the rule | Every permitted override needs a reason and audit trail |
| Decision replay error | Verify identical inputs and versions reproduce results | Include configuration, code, and data fingerprints |
| Selection-measure ceiling rate | Detect measures that fail to distinguish high capability | Also inspect precision and information at the top |
| Appeal error and completion rates | Test whether correction paths work | Appeals should not become a second subjective admissions route |

## Access and fairness

| Candidate metric | Purpose | Required caution |
|---|---|---|
| Outreach-to-application conversion | Identify who enters the candidate pool | Requires a credible reach denominator |
| Application completion rate | Detect process barriers | Report by access route and subgroup |
| Completion-time distribution | Measure burden | Include p50, p90, and p95, not only the mean |
| Accommodation fulfillment | Verify approved supports arrive before affected decisions | Track denials, delays, and equivalence |
| Eligibility-rate differences | Surface selection disparities | A gap is a diagnostic, not automatic proof of bias |
| Direct participant cost | Detect financial access barriers | Include deposits, technology, materials, and required travel |
| Disclosure completion | Verify families received required information | Receipt does not prove comprehension |

## Operations and integrity

| Candidate metric | Purpose | Required caution |
|---|---|---|
| Offer and notice delivery | Detect communication failures | Define successful delivery and unreachable-family handling |
| Capacity or waitlist rule breaches | Detect departure from the published lifecycle | Distinguish genuine capacity changes from withheld seats |
| Treatment-bundle fidelity | Track whether participants received the intended program | Document version changes and exceptions |
| Shared-capacity breaches | Protect workshops, guide time, and current students | Requires explicit service-level definitions |
| Highest-baseline-student guardrail | Detect harm to students already progressing fastest | Define the subgroup and noninferiority rationale prospectively |
| Required staff burden | Test operating feasibility | Include manual exception work and peak load |

## Rights, safety, and data

| Candidate metric | Purpose | Required caution |
|---|---|---|
| Research-independence violations | Detect admissions consequences from research choices | Target is zero; test adversarially |
| Unauthorized data-access events | Detect privacy/security failures | Define severity and response rules |
| Retention/deletion completion | Verify data lifecycle commitments | Include vendor copies and reasoned exceptions |
| Serious product-related harm | Trigger welfare review or stop conditions | Define severity, relatedness, and reporting path |
| Complaint and appeal service level | Test whether families receive timely remedies | Include late or accessibility-related filings |
| Consent and baseline yield | Assess evaluation feasibility | Must never change ordinary selection odds |

## Minimum metric specification

Before a metric can govern a decision, define:

1. exact numerator, denominator, unit, and population;
2. inclusion, exclusion, missingness, and timing rules;
3. source-of-truth fields and data lineage;
4. one accountable owner and named reviewers;
5. reporting horizon and subgroup breakdowns;
6. threshold or interpretation rule with rationale;
7. action when the metric fails;
8. whether it supports feasibility, reliability, access, measurement, or impact; and
9. language the result permits and prohibits.

## Four-week prototype minimum

The capstone prototype should demonstrate at least:

- one baseline-adjusted synthetic outcome;
- one power or precision scenario;
- eligibility agreement or deterministic replay;
- decision-trace and override integrity;
- application burden and accommodation handling;
- subgroup selection and attrition views;
- research-independence and data-access violation checks;
- a current-high-performer guardrail; and
- a claims map that keeps feasibility, selection reliability, access, and impact distinct.
