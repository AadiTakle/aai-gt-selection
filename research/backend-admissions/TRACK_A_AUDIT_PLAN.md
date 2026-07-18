# Track A Read-Only Audit Plan

## Status

Audit-only. Track A policy remains unchanged.

## Audit Goals

1. Verify exact implementation of the frozen Track A rule.
2. Demonstrate that enabling Track B changes zero Track A results.
3. Map score quality, missingness, retesting, corrections, and cutoff behavior.
4. Describe access and subgroup funnel differences without claiming fairness.
5. Expose range restriction and selective-label limitations.
6. Prevent unsupported calibration or program-effect claims.

## Safety

- Synthetic/public data only
- Read-only database role
- `SET TRANSACTION READ ONLY`
- Audit outputs stored outside decision schemas
- Decision-table hash checked before and after
- Audit traits kept outside eligibility views
- No audit output feeds routing

## Execution Sequence

1. Freeze synthetic policy, engine, score, and decision snapshots.
2. Validate lineage and source class.
3. Run invariance, replay, boundary, and prohibited-input tests.
4. Produce score-quality/distribution diagnostics.
5. Produce funnel/opportunity diagnostics.
6. Quantify range restriction and selective-label support.
7. Run calibration only if an independent valid outcome gate passes.
8. Generate a claim-bounded report.

## Core Queries

### Track B Toggle Invariance

```sql
with inputs as (
  select applicant_id, input_snapshot, policy_version
  from audit_decision
),
paired as (
  select
    applicant_id,
    routing_eval(input_snapshot, policy_version, false) baseline,
    routing_eval(input_snapshot, policy_version, true) enabled
  from inputs
)
select count(*) filter (
  where baseline->>'track_a_result'
        is distinct from enabled->>'track_a_result'
     or baseline->>'track_a_reason'
        is distinct from enabled->>'track_a_reason'
) as differences
from paired;
```

Acceptance: zero.

### Historical Replay

```sql
select count(*) filter (
  where recorded_result is distinct from reproduced_result
     or recorded_reason is distinct from reproduced_reason
) as mismatches
from replayed_track_a_decisions;
```

Acceptance: zero, including result, reason, policy hash, input hash, and engine version.

### Boundary and Cutoff Distance

Report:

- exact cutoff;
- nearest supported scores below/above;
- ties and rounding;
- each norm/score version;
- missing/invalid/corrected/retested profiles;
- first, decision-used, and final scores.

Do not subtract a standard error from a percentile rank or compare distances across incompatible scales.

### Score Distributions

By cycle, grade, form, scale, and norm:

- count and missing count;
- mean/SD;
- 5th, 25th, 50th, 75th, 95th percentiles;
- battery means/distributions;
- ECDF/histogram;
- top-end bunching/ceiling;
- profile gaps.

Report effect sizes and distribution distances, not p-values alone.

### Retests and Corrections

Report:

- missing and invalid scores;
- retest/correction counts;
- score changes;
- eligibility flips after correction versus new test;
- retest probability by initial cutoff distance;
- time between administrations;
- bunching near cutoff;
- lineage completeness.

Never silently replace first or decision-used scores with latest scores.

### Funnel

Stages:

1. eligible population, if a valid denominator exists;
2. application started;
3. submitted;
4. score received;
5. valid score;
6. Track A eligible.

Report counts, denominators, Wilson intervals, rate differences, and ratios by authorized audit group and intersection.

If reach/eligibility denominator is unavailable, label findings applicant-conditional.

### Range Restriction

Compare:

- score SD/IQR before and after selection;
- variance ratio;
- correlations in all scored applicants versus selected applicants;
- common-outcome support.

A weak selected-only correlation does not prove a score lacks validity.

### Selective Labels

Map outcome availability by:

- decision;
- cutoff distance;
- grade/cohort;
- route;
- subgroup;
- outcome/horizon.

Report:

- overlap/support;
- zero-observation regions;
- effective sample size;
- worst/best bounds where useful.

Admitted-only outcomes do not reveal rejected applicants’ GT outcomes or admitted applicants’ no-GT outcomes.

## Calibration Gate

Calibration is allowed only when:

1. a prospectively defined prediction exists;
2. target is construct-valid and defined under an explicit treatment regime or
   potential outcome, not admission/reviewer decision;
3. outcome is measured comparably across the target population and is not
   treated as neutral ground truth when admission can change it;
4. support/missingness are adequate;
5. predictions are out-of-sample or temporal holdout;
6. sample supports overall/subgroup estimates; and
7. claim is predictive, not causal benefit.

Otherwise report: `calibration not identifiable`.

## Acceptance Tests

1. Track B toggle changes zero Track A results/reasons.
2. Prohibited/audit fields change zero Track A results.
3. Every decision replays.
4. All supported boundary scores match frozen expectations.
5. Missing, invalid, correction, retest, tie, and rounding fixtures match frozen policy.
6. Corrections preserve lineage.
7. Audit changes no decision-table hash.
8. No non-synthetic/non-public records are accessible.
9. Calculation fixtures match known hand results.
10. Admitted-only fixture fails selective-label/calibration gates.
11. Null, harmful, and inconclusive outcomes generate bounded language.

## Permitted Claims

- The synthetic rule was reproduced.
- Track B enablement did not change Track A.
- A subgroup had an observed funnel difference.
- The selected sample showed range restriction.
- Outcome labels were insufficient for a requested analysis.

## Prohibited Claims

- Prototype matches current GT policy before B-01/E-002 resolution.
- Track A is fair from selection-rate parity.
- CogAT is locally valid from synthetic/public aggregates.
- A calibrated model identifies who benefits.
- Track A-versus-Track B outcomes alone demonstrate program effect or equal
  route-specific treatment effects.

## Sources

- Thorndike/range restriction overview: https://doi.org/10.1037/0021-9010.85.1.112
- Lakkaraju selective labels: https://doi.org/10.1145/3097983.3098066
- Wilson intervals: https://doi.org/10.1080/01621459.1927.10502953
- AERA/APA/NCME Standards: https://www.testingstandards.net/
