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

## Next Research Clusters

1. Randomized/lottery and regression-discontinuity identification in selective education.
2. Gifted/high-achiever program-effect studies with positive and null findings.
3. Treatment-effect heterogeneity and policy-learning methods.
4. Transparent candidate-selection algorithms, calibration, uncertainty, and fairness.
5. Multiple-criteria decision rules for Track B evidence.
6. Power, attrition, noncompliance, interference, and sensitivity analysis.
7. Operational definition and measurement limits of “MIT-ready by eighth grade.”
8. Backend data model, audit/replay, and synthetic simulation requirements.
