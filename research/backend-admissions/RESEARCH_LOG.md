# Overnight Backend and Admissions Research Log

## Scope

- Branch: `research/overnight-backend-selection`
- Track A: audit only; do not propose MVP policy changes
- Track B: research transparent candidate-selection and future allocation/evaluation methods
- Primary target: academic growth after admission
- Secondary target: operationalize “MIT-ready by eighth grade” as an advanced STEM-readiness construct, not an MIT admissions prediction
- Data: public research and synthetic examples only
- Deliverables: research report, annotated source register, and implementable algorithms/pseudocode

## Research Standards

- Prefer peer-reviewed causal studies, meta-analyses, technical standards, and reproducible methods.
- Label publisher, company, working-paper, and transfer evidence.
- Separate prediction of success from prediction of treatment benefit.
- Do not use protected traits as capability features.
- Do not turn exploratory models into live admissions rules.
- Record null and contradictory findings.

## Iteration Log

### Iteration 0 — 2026-07-18

- Created dedicated research branch.
- Installed Graphify 0.9.18 and Cursor project rule.
- Built initial project knowledge graph: 137 nodes, 131 edges, 26 communities.
- Graph health warning: one dangling endpoint edge; no missing endpoints, duplicate edges, or edge-collapse variants.
- Armed a 30-minute recurring research loop.
- Confirmed user scope and deliverables.

### Iteration 1 — 2026-07-18

- Ran six parallel research tracks:
  - causal selective-education designs;
  - policy learning and heterogeneous treatment effects;
  - power, attrition, clustering, and interference;
  - transparent/fair selection algorithms;
  - advanced STEM-readiness outcomes; and
  - Supabase/PostgreSQL audit architecture.
- Added 30+ source entries across direct education evidence, methods, policy learning, readiness, and backend standards.
- Added deep dives for Bui–Craig–Imberman (2014) and Card–Giuliano (2016).
- Added initial algorithms for Track A audit, Track B eligibility, randomized offers, RD, future modeling, and synthetic simulation.
- Recorded power illustrations showing why a single small cohort detects only very large effects.
- Recorded the critical correction that Track A versus Track B performance differences do not identify program effect.

### Iteration 2 — 2026-07-18

- Deepened selective-label research:
  - admitted-only outcomes are nonidentified for rejected-applicant success and treatment benefit;
  - reject inference and PU learning do not create missing counterfactual evidence;
  - Track A audit should map outcome availability, overlap, range restriction, and extrapolation optimism.
- Added held-out CATE/policy validation stack:
  - BLP, GATES, RATE/AUTOC or Qini, doubly robust policy value, and split/cohort stability.
- Specified why Track B changes the estimand at the Track A cutoff:
  - reduced-form RD becomes Track A-side policy versus Track B-available policy;
  - separate route effects are not identified from one discontinuity.
- Added a full synthetic simulation specification with 21 scenarios, oracle outcomes, reviewer models, causal estimators, and expected failure demonstrations.
- Added 15+ methods sources on selective labels, HTE calibration, complex/multivalued RD, and discrete scores.

### Iteration 3 — 2026-07-18

- Added reviewer reliability design:
  - weighted kappa, AC1/AC2, ordinal alpha, class-specific agreement, G-theory, MFRM, severity, and drift;
  - route-specific and pre-adjudication reporting;
  - staged sample planning from 30–50 development cases to 200+ validation cases.
- Added seven-stage rubric validation protocol covering content, response process, standard setting, rater/task structure, shadow validity, subgroup evidence, and consequences.
- Added fairness taxonomy separating outcome-free process audits from outcome-dependent error/calibration metrics.
- Added explicit fairness-impossibility and protected-trait audit boundaries.
- Added three-way pending/abstention state machine and separated test, reviewer, predictive, causal, and operational uncertainty.
- Added interpretable challenger ladder and strict promotion gates for any future model.
- Added 20+ sources on agreement, validation, fairness, contestability, interpretable models, and abstention.

### Iteration 4 — 2026-07-18

- Deepened constrained allocation research:
  - complete, blocked, matched-pair, rerandomized, and covariate-adaptive assignment;
  - recommended batch-based blocked lottery with immutable waitlist and initial-offer ITT.
- Added treatment-bundle analysis for scholarships, tuition, deposits, transportation, and technology.
- Specified separate capability, finance, allocation, and evaluation data planes.
- Added cryptographically auditable draw design using frozen signed rosters, future randomness, HMAC ranking, and append-only events.
- Added deep dives for Research Design Meets Market Design and policy-learning papers.
- Recorded Denver evidence that omitting assignment propensity attenuated estimated effects by roughly 44%–60%.
- Added future capacity-constrained policy-learning implications and the lottery-default rule when heterogeneity evidence is weak.
- Added 20+ allocation, aid, principal-stratification, and security sources.

### Iteration 5 — 2026-07-18

- Added concrete Supabase/PostgreSQL logical schema:
  - identity/privacy separation;
  - versioned applications, assessments, policies, evidence, reviews, and decisions;
  - append-only audit and consent firewall;
  - future isolated allocation/evaluation schemas;
  - RLS roles and replay contracts.
- Added read-only Track A audit plan with SQL/statistical query library and hard claim boundaries.
- Added high-ceiling outcome recommendation:
  - initial-offer ITT;
  - baseline-adjusted endpoint ANCOVA;
  - gain/SGP/value-added/route differences descriptive only.
- Added falsification and design-specific sensitivity register for lotteries, RD, matching, and phased rollout.
- Added reproducible evaluator export specification using snapshot consistency, pseudonyms, BagIt, signed manifests, provenance, environment locks, and offline replay.
- Added 20+ sources on growth models, negative controls, staggered DiD, sensitivity, de-identification, and reproducibility.

## Next Research Clusters

1. Randomized/lottery and regression-discontinuity identification in selective education.
2. Gifted/high-achiever program-effect studies with positive and null findings.
3. Treatment-effect heterogeneity and policy-learning methods.
4. Transparent candidate-selection algorithms, calibration, uncertainty, and fairness.
5. Multiple-criteria decision rules for Track B evidence.
6. Power, attrition, noncompliance, interference, and sensitivity analysis.
7. Operational definition and measurement limits of “MIT-ready by eighth grade.”
8. Backend data model, audit/replay, and synthetic simulation requirements.
