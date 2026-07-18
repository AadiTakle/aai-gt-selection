# Day-0 Team Decision Brief

## Decision Request

Ratify the seven coding-gate defaults before contract/scaffold work.

D-008 and D-009 remain approved. This brief does not silently modify the PRD,
feature map, or GT policy.

## 1. Program-Effect Claim

**Recommended default:** Adopt the BrainLift's two-stage claim:

1. randomized Track B offered-versus-not-offered outcomes estimate the Track B
   initial-offer program/package effect; and
2. treated Track B versus treated Track A is a prespecified
   service-fit/noninferiority analysis.

**Why:** The Track B lottery supplies the untreated counterfactual. The Track
A/Track B comparison then tests whether causally benefiting Track B students
keep pace under GT. It does not establish equal Track A and Track B causal
effects without a Track A counterfactual.

**Changes after ratification:** PRD estimands, allocation/evaluation boundary,
outcome follow-up, notices, acceptance tests, and claims register.

**Owner/deadline:** Team lead, reviewed by evaluation owner; before coding.

**Next flaw after ratification:** pooling improves precision only when cohorts
estimate a sufficiently stable target. If Timeback, staffing, eligibility,
outcomes, or norms change, a single pooled number can become a precise average
of different treatments. Version-specific effects and heterogeneity must remain
visible.

## 2. Allocation and Aid

**Recommended default:** Quarantine Track-A-first aid, income-stratified
lotteries, offers, and waitlists as future research. Store only
`allocation_undecided`.

**Why:** Seats, aid, authority, scarcity, and evaluation design are unknown.

**Changes:** Remove the concept from MVP scope and runtime schemas.

**Owner/deadline:** Team lead; Day 0.

## 3. Domain Semantics

**Recommended default:** `domain_code` selects the applicable rubric anchors.
Domain prestige, unsupported domain advantage, and direct domain points are
prohibited.

**Alternatives:** Prohibit domain entirely; permit weighted domains.

**Why:** Evidence needs domain-specific interpretation without prestige
reward.

**Owner/deadline:** Selection owner and team lead; Day 0.

## 4. Pending and Reviewer Aggregation

**Recommended default:**

- `pending` is a case/workflow state, never a reviewer vote;
- evidence/access defects resolve before aggregation;
- reviewer conflict/competence abstention creates a replacement;
- reviewer classifications are binary;
- artifact: two reviewers plus third on disagreement;
- narrative: three reviewers from the start.

**Why:** Three-class voting creates ambiguous and contradictory outcomes.

**Owner/deadline:** Team lead and selection owner; before contract freeze.

## 5. Appeal Boundary

**Recommended default:** Implement:

- faithful explanation;
- factual/provenance correction;
- access protection;
- procedural cure.

Specify but disable substantive rubric appeal. New evidence becomes later-cycle
re-entry.

**Why:** Appeal authority, staffing, deadlines, and standard of review are
unknown. Correction remains necessary.

**Owner/deadline:** Team lead and student/family advocate; Day 0.

## 6. Finance Persistence

**Recommended default:** Omit income, aid, W-2, household, and other finance
fields from the MVP.

**Why:** They have no authorized eligibility purpose and add sensitive scope.

**Owner/deadline:** Team lead and technical owner; Day 0.

## 7. Synthetic Policy Status

**Recommended default:** Every threshold, SLA, policy, and test duration is:

- fictional;
- versioned;
- `synthetic_only=true`;
- `validated=false`; and
- visibly non-authoritative.

Use `PB-SYN-01` and `RB-SYN-01` only as test fixtures.

**Why:** Unset rules prevent testing; invented values cannot be represented as
GT policy.

**Owner/deadline:** Team lead/selection owner; technical owner enforces before
scaffolding.

## Live-Use Gates

These do not block the synthetic backend:

1. **Track A authority:** cutoff, form, retest, correction.
2. **Track B policy:** band, battery profile, domains, anchors, standard.
3. **Operations:** grades, services, capacity, reviewers.
4. **Rights/data:** privacy, accessibility, artifacts, retention, legal status.
5. **Allocation/evaluation:** seats, aid, outcomes, comparison, power,
   high-performer protections, independent evaluation.

## Two-Week Backend Cut

Build:

- project/local Supabase/test scaffold;
- shared types, reasons, roles, and RPC examples;
- one private application schema plus exposed API schema;
- application/assessment versions;
- locked synthetic policy;
- Track A/Track B invitation routing;
- fixed Snapshot fixture references;
- blind review and atomic third assignment;
- pending work items;
- final eligibility;
- immutable decision/reason trace;
- factual/procedural correction successor;
- replay, minimized audit, RLS, concurrency, and critical invariance tests;
- reset/seed/demo command.

Defer:

- field registry and retention/disposition engine;
- legally effective consent;
- uploads/storage;
- substantive appeal/remand;
- full re-entry workflow;
- finance/allocation;
- evaluator exports/DP;
- causal/RD/ANCOVA/CATE implementation;
- production security/privacy.

Target approximately 20–25 critical executable tests, not the full research
fixture library.

## Implementation Status

No application or backend has been scaffolded. There is no package manifest,
lockfile, `supabase/`, `src/`, or executable test suite. The research package is
an evidence/design library, not implemented software.

Baseline for this consolidation: branch
`research/overnight-backend-selection`, commit `1c404a7`.

## Ratification Effect

After decisions 1–7:

1. Add one decision-log entry.
2. Align PRD and feature map.
3. Update PRD-001/H9 traceability.
4. Freeze shared contracts and critical fixture IDs.
5. Start the two-week backend backlog.

No scope exception is required.

After ratification, use:

- `PROVISIONAL_IMPLEMENTATION_CONTRACT.md`
- `CRITICAL_TEST_MANIFEST.md`
