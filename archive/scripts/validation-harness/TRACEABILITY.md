# Traceability & Handoff — Exam Validation & Psychometrics Harness

Co-located traceability for this deliverable (per `AGENTS.md` required plan /
handoff format). It is kept with the feature to avoid editing shared canonical
governance files on a non-mergeable feature branch. If this harness is promoted
toward `dev`, add a `FEATURE_TO_REQUIREMENT_MAP.md` entry (a tooling / EV-style
ID) and, if warranted, an `ASSUMPTIONS_AND_EVIDENCE.md` entry, through the normal
governance flow.

## Requirements served

- **R5** (defensible capability standard): concurrent + incremental validity,
  reliability, SEM, near-cut decision consistency, item statistics.
- **R6** (growth without a gifted ceiling): ceiling/floor and gifted-tail
  precision checks.
- **R7** (auditable / falsifiable): seeded deterministic runs, SHA-256 dataset
  commitment, full config logged into the report, null results reportable.
- **R9** (protect students): fail-closed born-synthetic guard; no real data;
  `synthetic_only=true`, `validated=false` on every artifact.
- **R10** (claim boundaries): explicit per-section boundaries; agreement ≠ truth
  ≠ program impact.
- **H1** (broader, evidence-backed measures): incremental-validity test so each
  added signal must earn its place.
- **H2** (capability ≠ privilege): DIF + funnel treat subgroup identity as a
  guardrail, never as capability.
- **H7** (equity/access guardrails): Mantel-Haenszel + logistic DIF, subgroup
  equity funnel, differential prediction.

Also directly supports the **D-017** open follow-up ("an adverse-impact/DIF
review … remain open follow-ups") and the future **EV-11** (equity funnel) and
**EV-14/EV-15** (rubric/rater and route validation) evaluation features — on
synthetic data only.

## Evidence / assumptions

- Evidence touchpoints (interpretation framing, not new findings): **E-066**
  (evaluate at the operational tail/decision point; head-to-head needs a common
  metric), **E-067** (nominal "adaptive" precision is not validation), **E-070**
  (predicting achievement ≠ predicting who benefits), **E-005/E-006**
  (single-screen false negatives; prior ability predictive), **E-016/E-018**
  (MAP incremental value and ELL/SES caveats).
- New assumption introduced (tooling, not a GT claim): a pure-stdlib psychometric
  battery is sufficient to run the validation on synthetic data end-to-end
  without numpy/scipy. Verified by the passing test suite.
- No GT-specific fact, threshold, authority, capacity, or data source is
  invented. Cuts and item parameters are fictional/synthetic and configurable.

## In scope (smallest sufficient deliverable)

- A structure-agnostic, born-synthetic pipeline that generates a CogAT + MAP +
  new-test dataset, computes the full validity/reliability/ceiling/incremental/
  DIF/equity battery, and emits a Markdown + HTML report from the synthetic run.
- A fail-closed born-synthetic guard and reproducibility (seed + SHA-256).
- Unit + smoke + guard tests.

## Out of scope (explicit exclusions)

- Any use of real/live student data (blocked by the guard; gated by `B-06`).
- Any validated, GT-specific, or causal claim (`validated=false`).
- Live allocation, offers, program-effect estimation, or an evaluator pipeline
  (R2/R3/R6 causal work remains future/deferred, e.g., EV-01/EV-02/EV-03).
- Editing shared canonical governance documents (this branch is not merged).
- IRT parameter *calibration*/equating and standard setting (the harness assumes
  a scored total/columns; calibration is a separate workstream).

## Acceptance evidence (verified this run)

- Pipeline runs end-to-end on synthetic data: `python3 run_harness.py` exits 0
  and writes `out/validation_report.{md,html}` + manifest + results JSON.
- Every artifact carries `synthetic_only=true`, `validated=false`; no real data.
- Guard fails closed: a non-synthetic manifest is refused with exit code 2.
- Determinism: regenerating from the seed reproduces an identical dataset
  SHA-256 (`10e7d97aa99e…`).
- 29/29 tests pass (`python3 -m unittest discover -s tests -t .`), including
  known-answer distribution/correlation/reliability/regression/logistic checks,
  Mantel-Haenszel DIF detection, DIF recovery of injected items, and all five
  guard scenarios.
- Method sanity on the default synthetic run: recovered all injected uniform-DIF
  items (ETS class C); incremental ΔR² significant; α = 0.91; equity funnel shows
  parity under the fair-test default.

## Risks

- **Causal/validity:** results use a synthetic criterion; they show method
  behavior, not real predictive validity. Report states this in every section.
- **Applicant:** none in this run (no real data); the guard prevents real-data
  use. Subgroup identity is never treated as capability.
- **Operational:** DIF power depends on subgroup n / strata; multiple
  comparisons across many items can yield occasional false positives (mitigated
  by effect sizes + two-stage purification + content review).
- **Privacy:** born-synthetic only; real use requires `B-06` approvals and a
  formal decision to change the guard.

## Governance updates

- None to shared canonical files on this branch (not merged). This file is the
  co-located traceability record. On promotion, add the feature-map/evidence
  entries via the normal flow.
