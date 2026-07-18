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
  - BLP, GATES, RATE/AUTOC, doubly robust policy value, and split/cohort stability.
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

### Iteration 6 — 2026-07-18

- Researched randomized tutoring and realistic scaled implementation effects.
- Separated human tutoring, ITS/adaptive software, mastery, compacting, acceleration, grouping, and self-paced instruction evidence.
- Recorded realistic independent broad-outcome benchmarks of roughly 0.10–0.20 SD and the strong-result range around 0.20–0.30 SD.
- Added direct cautions that high-ability-specific RCT evidence is sparse and that GT’s bundled two-hour model differs from tutoring/adaptive studies.
- Identified domain-specific baseline knowledge/instructional mismatch as the strongest plausible confirmatory benefit moderator.
- Kept SES, ELL, disability/2e as equity analyses and broad ability, motivation, conscientiousness, and age as exploratory moderators.
- Added fastest-student and wellbeing guardrails.
- Added a provisional future MME framework: +0.10 SD at 12 months, +0.05 persistence, and −0.05 high-performer noninferiority.
- Added 15+ mechanism, moderator, persistence, and benchmark sources.

### Iteration 7 — 2026-07-18

- Added modified Dominant Profile Judgment and complete-profile standard-setting design for multidimensional Track B evidence.
- Added expected-utility, decision-curve, cost-sensitive, capacity, and Pareto-frontier rule comparison.
- Added source-to-target transportability, sampling/transport weights, positivity, context-specific effects, and prediction intervals.
- Added deterministic-rule and learned-model drift taxonomy, monitoring cadence, alert responses, offline update ladder, shadow validation, and rollback.
- Added treatment-package, fidelity, implementation, mediation, principal-stratification, and economic-evaluation framework.
- Added backend fields for target frames, contexts, program versions, fidelity, costs, monitoring, and model updates.
- Added 15+ sources on standard setting, utility, transportability, drift, fidelity, and education economics.

### Iteration 8 — 2026-07-18

- Ran five adversarial package reviews:
  - causal-method correctness;
  - quantitative source/version audit;
  - backend/governance consistency;
  - selection/rubric methodology;
  - morning executive synthesis.
- Corrected one critical fuzzy-RD estimand error and eight important causal-design ambiguities.
- Corrected Bui working-paper/journal estimate mixing and Card–Giuliano sample/effect labels.
- Corrected market-design simulation/sample descriptions and separated two ASSISTments trials.
- Added missing tutoring, ITS, gifted-course, and standards citations.
- Added explicit missing-outcome schedule, clustered/interference simulation, and policy-value comparator.
- Normalized source grades and removed duplicate source entry.
- Added morning handoff and adversarial-corrections register.
- Preserved unresolved canonical PRD/feature-map conflicts for explicit team decisions rather than silently editing product policy.

### Iteration 9 — 2026-07-18

- Audited education, causal-methods, fairness/selection, backend standards, and 2024–2026 literature.
- Corrected randomized-waitlist DOI, Card–Giuliano sample/effect labels, policy-value formula, and RD implementation wording.
- Tightened reviewer-metric citations and separated Gwet AC1 from AC2.
- Added source and limitation labels for standard-setting heuristics, drift controls, and black-box promotion policy.
- Fixed RO-Crate URL/version, NIST monitoring scope, cryptographic encoding/KDF details, and WWC citation.
- Added recent gifted long-run, GenAI learning, scaled tutoring, selective-label, constrained-policy, weighted-lottery, and fairness-monitoring evidence.
- Recorded that long-run attainment can move even when short-run standardized tests do not.
- Added guardrail finding that unrestricted AI can raise assisted practice while harming independent performance.

### Iteration 10 — 2026-07-18

- Verified current public GT School campus, grades, Georgetown address, admissions entry, reported tuition/enrollment, scholarships, services, and remaining unknowns.
- Confirmed current independent CogAT-around-90th-percentile reporting while leaving exact official rule/form unverified.
- Built Timeback product/architecture/treatment-version inventory from public beta/API/support documentation.
- Audited public Alpha/GT outcome claims, including the 154-student 2024–25 NWEA artifact and recalculated ~1.69× math/~1.54× reading aggregate ratios.
- Documented current absence of independent peer-reviewed/causal Timeback/GT evaluation.
- Verified Texas TEFA 2026–27 awards, priorities, lottery, school/testing requirements, tuition rules, and GT-specific unknowns.
- Audited public GT/Alpha/Timeback privacy, monitoring, retention, vendor, consent, and public assurance gaps.
- Added GT public facts dossier and current official/independent sources.

### Iteration 11 — 2026-07-18

- Distilled the research schema into a minimum synthetic MVP data contract.
- Created a two-week backend implementation backlog with ownership and merge boundaries.
- Created deterministic routing, review, pending, correction, replay, concurrency,
  prohibited-field, accessibility, and RLS fixture matrices.
- Added a bounded local Supabase/PostgreSQL threat model and minimum security gate.
- Separated build-now admissions workflow from future allocation, evaluation, outcome,
  finance, export, differential-privacy, and ML infrastructure.
- Added a Day-0 contradiction gate before implementation.

### Iteration 12 — 2026-07-18

- Researched measurement invariance, DIF, accommodation validity, translation,
  cultural adaptation, multilingual rater effects, and small-sample abstention.
- Verified foundational standards and peer-reviewed methods, including
  AERA/APA/NCME, ITC, Meredith, Wu–Estabrook, Sireci, Abedi, and CogAT-adjacent
  Lakin/Lohman evidence.
- Separated interface accessibility, accommodation-use noninterference,
  construct preservation, and empirical route equivalence.
- Corrected the unreachable accessibility-pending branch.
- Renamed the synthetic accommodation invariant to noninterference rather than
  unsupported equivalence.
- Added private synthetic access-route records and removed access details from
  decision-visible assistance data.
- Added language/translation/interpreter invariance fixtures and a measurement
  fairness research specification.

## Implementation Transition

The broad research clusters are covered. Next actions:

1. Resolve the seven Day-0 PRD/governance decisions.
2. Freeze synthetic policy values and reason codes.
3. Add implementation work items to traceability.
4. Scaffold local Supabase and implement the minimum data contract.
5. Turn the fixture matrix into executable tests.
