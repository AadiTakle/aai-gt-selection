# Cognitive-Test Validation Report (SYNTHETIC)

> **[!] SYNTHETIC DATA ONLY - NOT VALIDATED - NOT A LIVE ADMISSIONS RESULT. synthetic_only=true, validated=false (D-006, R9). No real or live student data was used anywhere in this run.**

**Generated:** 2026-07-27T07:01:33Z  |  **Seed:** 20260727  |  **Dataset SHA-256:** `10e7d97aa99e85f2...`  |  **N:** 600


## 0. What this report is - and is not

This harness evaluates the *measurement* properties of a cognitive test on **synthetic** data. It is STRUCTURE-AGNOSTIC: it consumes a per-student score table and does not assume the test is adaptive, two-stage, or fixed-form.

> Claim boundaries (R10): 
> - Concurrent correlation and classification agreement measure *convergence with existing measures*, NOT truth and NOT program impact (E-066, E-070).
> - Reliability and ceiling/floor describe *measurement quality*, not validity of the selection decision.
> - Incremental validity here predicts a *synthetic criterion*; it is not evidence that the test predicts real outcomes or who benefits (E-070, R4).
> - DIF flags identify items for *review*; a flag is not proof of unfairness and does not by itself justify item removal.
> - Everything is synthetic and `validated=false`; no number here is a live, GT-specific, or causal claim.


## 1. Run provenance and born-synthetic guard (R7, R9)

- Guard: synthetic_only=true confirmed

- Guard: validated=false confirmed

- Guard: contains_real_data=false confirmed

- Guard: source=born-synthetic confirmed

- Guard: dataset_sha256 integrity verified (10e7d97aa99e...)

- Generator: `scripts/validation-harness/harness/synth.py`  |  schema v1

- Source: `born-synthetic`  |  data_class: `synthetic`


## 2. Synthetic dataset overview

Columns (39): `student_id`, `grade`, `cogat_sas`, `map_rit`, `nt_01`, `nt_02`, ... , plus 31 item/other columns ... , `ell_status`, `ses_band`

Measures under analysis: `cogat` -> `cogat_sas`, `map` -> `map_rit`, `newtest` -> `newtest_total`; outcome `criterion_eoy`.


## 3. Concurrent validity - correlations (R5, H1)

| pair | n | Pearson r | 95% CI | p | Spearman rho |
| --- | --- | --- | --- | --- | --- |
| newtest_total x cogat_sas | 600 | 0.681 | [0.635, 0.722] | <.001 | 0.681 |
| newtest_total x map_rit | 600 | 0.493 | [0.430, 0.551] | <.001 | 0.481 |
| cogat_sas x map_rit | 600 | 0.630 | [0.579, 0.676] | <.001 | 0.617 |

> Interpretation: moderate-to-strong positive correlations indicate the new test converges with existing ability/achievement measures. Convergence supports shared-construct evidence (R5) but does not establish that the new test is *better*, nor that it measures capability rather than prior opportunity (E-018).


## 4. Classification agreement at the cut (R5, R7)

| index vs reference | n | sel(index) | sel(ref) | agreement | Cohen kappa | phi | sens vs ref | spec vs ref |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| newtest_total vs cogat_sas | 600 | 61 | 63 | 89.0% | 0.406 | 0.406 | 0.460 | 0.940 |

> Interpretation: agreement/kappa quantify how often the new-test cut and the existing-measure cut select the SAME students. Sensitivity/specificity treat the existing measure as a *reference of convenience*, NOT ground truth - a low agreement can mean the new test surfaces different (possibly under-served) students, which may be desirable (E-005, H4). This is not validity against a true capability criterion.


## 5. Reliability and decision consistency (R5, R6)

- Cronbach's alpha = **0.909** over 30 items (n=600); SD_total=6.167, SEM=1.860.

- Split-half r=0.856, Spearman-Brown=**0.922**.

- Decision consistency at the cut (threshold=19.000): 82.0% of students are classified outside the +/-1.96xSEM band; 18.0% fall in the ambiguous band near the cut.

| item | p correct | item-total r | flag |
| --- | --- | --- | --- |
| nt_26 | 0.042 | 0.381 | very hard (floor risk) |
| nt_27 | 0.032 | 0.284 | very hard (floor risk) |
| nt_28 | 0.022 | 0.267 | very hard (floor risk) |
| nt_29 | 0.023 | 0.255 | very hard (floor risk) |
| nt_30 | 0.035 | 0.267 | very hard (floor risk) |

> Interpretation: alpha/split-half index internal consistency; SEM and the ambiguous band show how many near-cut decisions are unstable given measurement error (R5 error handling). High reliability is necessary but not sufficient for a defensible cut; tail precision (Section 6) matters more for a gifted screen (E-066, E-067).


## 6. Ceiling / floor and gifted-tail precision (R6)

| measure | n | mean | sd | min | max | skew | % at max | % perfect | % top-10% range |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cogat_sas | 600 | 100.67 | 15.89 | 55.00 | 149.00 | 0.009 | 0.2% | - | 0.5% |
| map_rit | 600 | 203.66 | 16.92 | 144.00 | 248.00 | -0.092 | 0.3% | - | 1.8% |
| newtest_total | 600 | 10.13 | 6.17 | 0.00 | 30.00 | 0.525 | 0.2% | 0.2% | 0.5% |

> Interpretation: for a gifted screen the upper tail must stay informative (R6). A high `% perfect` or heavy left skew signals ceiling compression that would blur separation among the highest scorers; above-level items keep the ceiling open (E-066, E-067). Ceiling/floor here is descriptive of the synthetic score distribution only.


## 7. Incremental validity - does a secondary signal add value? (H1, R5)

| outcome | base | added | R2 base | R2 full | dR2 | F | df | p | added predictor(s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| criterion_eoy | cogat_sas | newtest_total | 0.296 | 0.422 | 0.125 | 129.33 | 1,597 | <.001 | newtest_total std-beta=0.483 (p=<.001) |
| criterion_eoy | cogat_sas+map_rit | newtest_total | 0.370 | 0.476 | 0.106 | 120.43 | 1,596 | <.001 | newtest_total std-beta=0.447 (p=<.001) |

> Interpretation: a significant Delta-R-squared means the added signal predicts the (synthetic) criterion *beyond* the base measure(s) - the core test for whether a second measure earns its place (H1: each added signal must contribute distinct, validated information). A NON-significant increment is a valid, reportable result (do not add a measure that adds nothing). This uses a synthetic criterion and is NOT evidence of real-world or benefit prediction (E-070, R4).


## 8. DIF / measurement invariance at the item level (H7, H2)

Group: `subgroup_demo` (focal=`focal` n=262, reference=`reference` n=338). Two-stage purification: on.

| pass | MH A | MH B | MH C | logistic A | logistic B | logistic C | flagged items |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pass 1 (unpurified) | 25 | 1 | 4 | 28 | 2 | 0 | nt_08, nt_12, nt_15, nt_16, nt_23 |
| final (purified) | 27 | 0 | 3 | 28 | 2 | 0 | nt_08, nt_16, nt_23 |

| item | p | MH alpha | MH Delta | MH p | ETS | logit uniform p | logit nonunif p | logit dR2 | logit class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nt_08 | 0.510 | 0.169 | 4.173 | <.001 | C | <.001 | 0.041 | 0.068 | B |
| nt_16 | 0.270 | 0.272 | 3.061 | <.001 | C | <.001 | 0.041 | 0.055 | B |
| nt_23 | 0.092 | 0.339 | 2.543 | 0.005 | C | 0.004 | 0.649 | 0.028 | A |

> Interpretation: Mantel-Haenszel and logistic-regression DIF ask whether, *conditional on ability*, focal and reference groups have different odds of success on an item. MH conditions on the matched total (so a group ability difference alone is NOT DIF); logistic separates uniform (main-effect) from nonuniform (interaction) DIF. Two-stage purification removes flagged items from the matching criterion and re-tests. A flag targets an item for content review (H2, H7); it is not automatic proof of bias or grounds for removal. This directly provides the adverse-impact / DIF review that D-017 lists as an open follow-up - on synthetic data.


## 9. Subgroup equity funnel at the cut (H7, EV-11)

Selection measure `newtest_total` at threshold 19.000; 61/600 selected (10.2%). 4/5ths rule = 0.8.


### Subgroup: subgroup_demo

| level | n | selected | selection rate | adverse-impact ratio | 4/5ths |
| --- | --- | --- | --- | --- | --- |
| focal | 262 | 26 | 9.9% | 0.958 | ok |
| reference | 338 | 35 | 10.4% | 1.000 | ok |


### Subgroup: ell_status

| level | n | selected | selection rate | adverse-impact ratio | 4/5ths |
| --- | --- | --- | --- | --- | --- |
| ELL | 134 | 15 | 11.2% | 1.000 | ok |
| non-ELL | 466 | 46 | 9.9% | 0.882 | ok |


### Subgroup: ses_band

| level | n | selected | selection rate | adverse-impact ratio | 4/5ths |
| --- | --- | --- | --- | --- | --- |
| higher-income | 351 | 35 | 10.0% | 0.955 | ok |
| lower-income | 249 | 26 | 10.4% | 1.000 | ok |

> Interpretation: the funnel monitors *who passes the cut* by subgroup as an equity guardrail (H7). An adverse-impact ratio below 0.80 (4/5ths rule) flags a group for review. Subgroup identity is a GUARDRAIL, never a measure of capability (charter: capability, not privilege; H2). A disparity may reflect item bias (Section 8), true differences in the synthetic ability generator, or the cut - the funnel localizes where to look; it does not assign cause.


## 10. Differential prediction across subgroups (R5, H7)

Regressing `criterion_eoy` on `newtest_total` + `subgroup_demo` + interaction: Delta-R2=0.003, F(2,596)=1.44, p=0.237.

> Interpretation: this tests measurement invariance at the *prediction* level (Cleary model). A significant increment for the group / interaction terms indicates the score predicts the criterion differently across subgroups (predictive bias); a non-significant result supports predictive invariance. Structure-agnostic: it needs only a score, an outcome, and a group.


## 11. Synthetic ground-truth recovery (audit only)

- Injected DIF items (uniform + nonuniform): nt_08, nt_12, nt_16, nt_23

- Harness-flagged (pass 1): nt_08, nt_12, nt_15, nt_16, nt_23

- Incremental-signal weight u in criterion: 0.3 (0 would imply the new test should show NO incremental validity).

> This section exists only to sanity-check the harness against the known synthetic truth. On real data there is no ground truth; this section would be absent. It is NOT a validity claim.


## 12. Requirement traceability, evidence, and limitations

| requirement | how this harness serves it |
| --- | --- |
| R5 capability standard | concurrent + incremental validity, reliability, SEM, decision consistency |
| R6 growth without ceiling | ceiling/floor + gifted-tail precision checks |
| R7 auditable/falsifiable | seeded run, SHA-256 commitment, config logged, null results reportable |
| R9 protect students | fail-closed born-synthetic guard; no real data; synthetic_only=true |
| R10 claim boundaries | explicit per-section boundaries; agreement != truth != impact |
| H1 broader measures | incremental-validity test for each added signal |
| H2 capability != privilege | DIF + funnel treat subgroup as guardrail, never capability |
| H7 equity guardrails | MH + logistic DIF, subgroup funnel, differential prediction |

Evidence touchpoints: E-066 (evaluate at the operational tail/decision point), E-067 (nominal 'adaptive' precision is not validation), E-070 (predicting achievement != predicting who benefits), E-005/E-006 (single-screen false negatives; prior ability predictive), E-016/E-018 (MAP incremental value and ELL/SES caveats). Governance: D-006 (born-synthetic), D-017 (adverse-impact/DIF review is an open follow-up this tooling supports).

> Limitations: (1) all data is synthetic; NO result is a validated or GT-specific claim (validated=false). (2) The criterion is generated, so incremental/differential-prediction results demonstrate the *method*, not real predictive validity. (3) DIF power depends on subgroup n and strata; small cells reduce sensitivity, and with many items expect occasional false-positive flags (multiple comparisons) - confirm with effect sizes, purification, and content review. (4) Pooling across grades mixes a vertically-scaled MAP; within-grade analysis is recommended on real data. (5) Real use requires consent, privacy/legal review (B-06), and psychometric validation before any live claim.


## Appendix A. Full run configuration

```json
{
  "seed": 20260727,
  "generation": {
    "n_students": 600,
    "grades": [
      3,
      4,
      5,
      6,
      7,
      8
    ],
    "n_items": 30,
    "incremental_signal": 0.3,
    "impact_delta": 0.0,
    "loadings": {
      "cogat_g": 0.9,
      "cogat_noise": 0.44,
      "map_g": 0.82,
      "map_a": 0.38,
      "map_noise": 0.4,
      "newtest_g": 0.8,
      "newtest_u": 0.55,
      "newtest_noise": 0.24,
      "criterion_g": 0.55,
      "criterion_a": 0.35,
      "criterion_noise": 0.55
    },
    "dif": {
      "uniform_items": [
        7,
        15,
        22
      ],
      "uniform_shift": 0.85,
      "nonuniform_items": [
        11
      ],
      "nonuniform_factor": 0.45
    },
    "subgroup_props": {
      "focal": 0.45,
      "ELL": 0.22,
      "lower_income": 0.4
    }
  },
  "analysis": {
    "measures": {
      "cogat": "cogat_sas",
      "map": "map_rit",
      "newtest": "newtest_total"
    },
    "newtest_item_prefix": "nt_",
    "outcome": "criterion_eoy",
    "cuts": {
      "newtest_total": {
        "type": "percentile",
        "value": 90
      },
      "cogat_sas": {
        "type": "percentile",
        "value": 90
      }
    },
    "correlation_pairs": [
      [
        "newtest_total",
        "cogat_sas"
      ],
      [
        "newtest_total",
        "map_rit"
      ],
      [
        "cogat_sas",
        "map_rit"
      ]
    ],
    "agreement_pairs": [
      [
        "newtest_total",
        "cogat_sas"
      ]
    ],
    "incremental_validity": [
      {
        "outcome": "criterion_eoy",
        "base": [
          "cogat_sas"
        ],
        "added": [
          "newtest_total"
        ]
      },
      {
        "outcome": "criterion_eoy",
        "base": [
          "cogat_sas",
          "map_rit"
        ],
        "added": [
          "newtest_total"
        ]
      }
    ],
    "reliability": {
      "item_prefix": "nt_",
      "score": "newtest_total",
      "decision_cut": {
        "type": "percentile",
        "value": 90
      }
    },
    "ceiling_floor": [
      "cogat_sas",
      "map_rit",
      "newtest_total"
    ],
    "dif": {
      "group_var": "subgroup_demo",
      "focal": "focal",
      "reference": "reference",
      "item_prefix": "nt_",
      "purify": true,
      "min_stratum": 2
    },
    "equity_funnel": {
      "selection_measure": "newtest_total",
      "cut": {
        "type": "percentile",
        "value": 90
      },
      "subgroups": [
        "subgroup_demo",
        "ell_status",
        "ses_band"
      ],
      "four_fifths": 0.8
    }
  },
  "report": {
    "title": "Cognitive-Test Validation Report (SYNTHETIC)",
    "formats": [
      "md",
      "html"
    ]
  }
}
```
