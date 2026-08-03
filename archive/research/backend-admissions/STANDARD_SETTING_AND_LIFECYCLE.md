# Standard Setting, Decision Utility, and Lifecycle Validation

## 1. Track B Standard Setting

Recommended future method:

> Modified Dominant Profile Judgment plus independent complete-profile categorical review.

This is a reasoned transfer from complex-performance standard-setting literature, not a validated Track B method.

Track B has a multidimensional profile, not one total score. Angoff and Bookmark are poor fits because they assume item-level probabilities or a calibrated ordered item scale. Classical Body of Work is useful conceptually but normally locates cuts on a total-score continuum.

### Configural Boundary

```text
Track B invitation passes
AND domain evidence reaches exceptional anchor
AND at least one of:
    learning rate qualifies
    transfer qualifies
    abstraction qualifies
AND evidence specificity is sufficient
AND child contribution/provenance is sufficient
AND reviewer majority is obtained
```

### Study

1. Define performance-level descriptors and domain anchors.
2. Build balanced artifact/narrative profiles including difficult and privilege-confounded cases.
3. Obtain independent profile classifications before discussion.
4. Elicit explicit profile rules.
5. Repeat judgments after criterion-focused feedback.
6. Test rule on withheld profiles.
7. Replicate with an independent panel.
8. Do not average incompatible panel policies.
9. Freeze for shadow validation.

Suggested operational research heuristic: two independent panels of roughly 10–12 members, including domain, psychometric, accessibility/language, developmental, service, and applicant-rights expertise. Panel size must be justified through feasibility and panel-replication precision rather than treated as a universal standard.

### Synthetic Rule Representation

Use named nonoperational anchors:

```yaml
policy_id: SYN-TB-STD-001
status: synthetic_fixture
live_use_prohibited: true
validated: false
authority: none
unresolved_blocker: B-04
```

Never use realistic-looking numbers or “validated” labels in the prototype.

## 2. Decision Utility

Accuracy assumes equal error costs. Track B has distinct consequences:

- capable applicant missed;
- unnecessary family/reviewer burden;
- false qualification;
- false nonqualification;
- pending delay;
- accommodation/correction failure.

For action \(a\) and state \(y\):

\[
EU(a\mid p)=p\,u_{a1}+(1-p)u_{a0}
\]

For binary error costs:

\[
t^*=\frac{C_{FP}}{C_{FP}+C_{FN}}
\]

This threshold is valid only with a validated probability and agreed costs.

### Decision-Curve Net Benefit

\[
NB(t)=\frac{TP}{N}-\frac{FP}{N}\frac{t}{1-t}
\]

Use only across an approved threshold/cost range and with valid outcomes. DCA does not discover the right threshold.

### Pareto Comparison

Compare each rule on:

- expected utility;
- sensitivity/false-negative rate;
- false-positive rate;
- burden;
- worst subgroup disparity;
- pending/adjudication load;
- reviewer reliability;
- capacity use.

Remove rules failing hard gates, then remove dominated rules. Do not collapse invalidity or rights failures into a weighted average.

## 3. Transportability

A program effect belongs to a population, treatment version, comparison, outcome, and horizon—not “GT School” abstractly.

Define:

- source trial population;
- target future population;
- grades/sites/cycles;
- eligibility version;
- treatment package;
- comparison condition;
- effect scale; and
- baseline effect modifiers.

Transport requires:

- valid source experiment;
- stable treatment version;
- conditional transport exchangeability;
- sampling positivity;
- measured effect modifiers;
- no unrepresented interference change.

Weights:

Let \(S=1\) denote membership in the source randomized study and \(T=1\) denote the locked target frame.

For a trial sampled from a larger target frame that includes trial-eligible members:

\[
w_i\propto\frac{1}{P(S_i=1\mid X_i)}
\]

For separate, nonoverlapping source and target samples:

\[
w_i\propto
\frac{P(S_i=0\mid X_i)}{P(S_i=1\mid X_i)}
\]

combined with any target-frame sampling weights.

The protocol must state whether target members include the source trial, how weights are normalized, and whether trimming changes the target estimand.

Report:

- source/target distributions;
- pre/post weighting balance;
- weight tails;
- effective sample size;
- trimming sensitivity;
- unsupported target strata.

No source support means narrow the target, collect new data, or label the effect unidentified.

### Cohorts and Sites

- Treat each new cohort as temporal validation.
- Lock rules before cohort review.
- Report results by grade/site/route/program version.
- Use leave-one-context-out validation when possible.
- After rule changes, begin a new validation sequence.
- Distinguish pooled mean confidence interval from future-site prediction interval.

Repeated cohorts at one school improve temporal evidence, not geographic transport.

With enough contexts, use a hierarchical model such as:

\[
Y_{ic}
=
\alpha_c+\tau_c Z_{ic}+\beta X_{ic}+\epsilon_{ic},
\qquad
\tau_c\sim N(\mu_\tau,\sigma_\tau^2)
\]

and standardize to one locked target population. Report each \(\tau_c\), pooled \(\mu_\tau\), heterogeneity \(\sigma_\tau\), and a prediction interval for a future comparable context. With only a few cohorts/sites, heterogeneity and prediction intervals remain weakly identified.

## 4. Monitoring and Drift

Do not permit automatic continual learning.

### Drift Types

- Data-quality/schema drift
- Covariate shift
- Label shift
- Concept/outcome drift
- Calibration drift
- Policy-induced feedback
- Selective labels
- Training/model instability

### Monitoring Schedule

Every record/decision:

- schema, range, units, freshness, missingness, provenance;
- prohibited-input/privacy checks;
- replay and configuration integrity.

Every batch:

- applicant/route/score/threshold distributions;
- pending, correction, appeal, accommodation;
- reviewer disagreement/severity;
- subgroup/access patterns.

Each active cycle:

- operational complaints and changes;
- CUSUM/EWMA or other prespecified persistent-shift alerts;
- false-alarm control across metrics.

When outcomes mature:

- label coverage and attrition;
- calibration intercept/slope;
- Brier/log loss;
- decision utility;
- temporal/subgroup performance;
- selective-label analysis.

### Alert Response

- **Green:** continue.
- **Amber:** investigate lineage, operations, case mix, labels, and subgroup effects.
- **Red:** suspend affected decision path and use approved fallback.

Data failure is repaired without retraining. Recalibration or model changes require new versions, untouched temporal validation, shadow testing, approval, and rollback.

## 5. Fidelity and Package Effects

Primary effect remains initial-offer ITT for the package as delivered.

Do not adjust the primary model for post-treatment:

- enrollment;
- dose;
- fidelity;
- engagement;
- later aid; or
- persistence.

Measure separately:

- adherence;
- dose delivered;
- dose received;
- reach;
- quality;
- responsiveness;
- differentiation from comparison;
- adaptations;
- staffing/context;
- treatment contrast.

Implementation–outcome associations are descriptive unless implementation support or dosage is separately randomized.

CACE, dosage IV, mediation, and principal-stratification analyses remain secondary and assumption-heavy.

## 6. Economic Evaluation

Ingredients-based costing:

\[
C_j=q_jp_j
\]

Include:

- personnel and training;
- facilities;
- technology/software;
- materials;
- student/family time;
- donated resources;
- overhead;
- displaced instruction;
- implementation/fidelity monitoring.

Separate startup, recurring, and research-only costs.

Randomized cost-effectiveness:

\[
\Delta C=E[C\mid Z=1]-E[C\mid Z=0]
\]

\[
\Delta E=E[Y\mid Z=1]-E[Y\mid Z=0]
\]

\[
ICER=\frac{\Delta C}{\Delta E}
\]

Also report net monetary benefit:

\[
NMB(\lambda)=\lambda\Delta E-\Delta C
\]

When effectiveness is null/negative, do not report ICER alone. Use cost-effectiveness planes and uncertainty.

Long-run earnings/elite-attainment monetization is scenario analysis only until independently justified.

## 7. Backend Fields

### Target/context

- target/source population version
- cycle, site, grade, service area
- selection/rubric/treatment/comparator versions
- staffing, schedule, capacity, peers
- target estimand and effect scale

### Monitoring

- data-quality checks
- distribution summaries
- reviewer/boundary metrics
- outcome label coverage
- calibration/utility
- alert level, owner, disposition
- rule/model version and rollback

### Fidelity

- package/component version
- schedule, minutes, reach, adherence
- quality/responsiveness
- adaptations and context
- provider/site/week

### Cost

- costing protocol and perspective
- resource ingredient
- quantity/unit price/source
- startup/recurring/research-only
- treatment/comparator allocation
- analysis snapshot and uncertainty

## 8. Sources

- Plake, Hambleton, & Jaeger: https://doi.org/10.1177/0013164497057003002
- Plake & Hambleton: https://doi.org/10.1207/s15326977ea0603_2
- Livingston & Zieky: https://www.ets.org/Media/Research/pdf/passing_scores.pdf
- Vickers & Elkin decision curves: https://doi.org/10.1177/0272989X06295361
- Tipton transportability: https://doi.org/10.3102/1076998612441947
- Pearl & Bareinboim: https://doi.org/10.1214/14-STS486
- Dahabreh & Hernán: https://doi.org/10.1007/s10654-019-00533-2
- Perdomo et al. performative prediction: https://proceedings.mlr.press/v119/perdomo20a.html
- NIST AI 800-4: https://doi.org/10.6028/NIST.AI.800-4
- Carroll et al. fidelity: https://doi.org/10.1186/1748-5908-2-40
- Imai, Keele, & Yamamoto mediation: https://doi.org/10.1214/10-STS321
- IES economic-evaluation standards: https://ies.ed.gov/sites/default/files/ies/document/2024/10/Standards%20for%20the%20Economic%20Evaluation%20of%20Educational%20and%20Social%20Programs.pdf
