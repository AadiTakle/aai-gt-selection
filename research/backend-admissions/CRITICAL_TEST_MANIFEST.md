# Critical 25-Test Backend Manifest

## Status

Provisional executable cut. No tests exist or have run yet. Activate only after
Day-0 ratification.

## Routing

| ID | Layer | Expected |
|---|---|---|
| TA-02 | Unit | Exact synthetic Track A boundary is inclusive |
| TA-03 | Unit | 89.5 is not rounded to Track A; Track B invited |
| TA-04 | Integration | Track B toggle changes no Track A result/reason |
| TA-07 | Integration | Score correction creates successor; original unchanged |
| TB-01 | Unit | Exact lower composite boundary invites |
| TB-03 | Unit | Battery-profile rule invites |
| TB-05 | Unit | Outside both rules does not invite |
| TB-07 | Integration | Invitation requires Snapshot; never implies eligibility |

## Review

| ID | Layer | Expected |
|---|---|---|
| AR-01 | Integration | Artifact Q/Q qualifies; no third assignment |
| AR-03 | Integration | Artifact Q/N creates pending blind-third work |
| NR-01 | Integration | Narrative Q/Q/N qualifies without route penalty |
| NR-04 | Database | Narrative cannot finalize after two votes |
| AR-07 | Integration | Missing provenance becomes pending, never negative |

## Pending, Access, and Field Firewall

| ID | Layer | Expected |
|---|---|---|
| PN-01 | Database | Pending requires owner, reason, deadline, and route |
| PN-02 | Integration | Deadline escalates; never converts to rejection |
| AC-01 | Integration | Access metadata leaves decision/reasons/hash identical |
| AC-03 | Integration | Failed route becomes `pending_accessibility_route` |
| PF-01 | Parameterized integration | Every prohibited-field mutation is decision-invariant |

## Explanation, Replay, Concurrency, and Security

| ID | Layer | Expected |
|---|---|---|
| MSG-01 | Unit | Notice contains no “not gifted,” seat, or causal claim |
| EX-02 | Unit | Every public explanation clause maps to trace |
| RP-01 | Integration | Replay exactly reproduces outcome/reasons/hashes |
| CC-02 | Concurrency | Simultaneous Q/N creates exactly one third assignment |
| RLS-01 | Database/direct API | Role/ownership/assignment matrix allows and denies correctly |
| BD-01 | Database/startup | Non-synthetic configuration or row fails closed |
| SR-02 | Integration | Ordinary runtime service-role execution fails |

`RLS-01` is one parameterized suite and must include:

- `AUTH-01`: user-metadata role forgery has no effect;
- `AUTH-02`: forged/expired/wrong-audience tokens fail;
- `IDOR-01`: cross-owner/assignment IDs do not leak existence;
- `GRANT-01`: catalog/default privileges match declaration;
- `DEF-01`: definer owner/search-path/execute grants are safe;
- `READ-01`: read RPCs expose no forbidden row/column; and
- `NEW-OBJECT`: undeclared table/view/function security posture fails CI.

## Coverage

Requirements:

- R1, R4, R5, R7–R10
- H1, H2, H4, H7, H9, H10

Claims covered:

- deterministic routing;
- unchanged Track A implementation;
- invitation/eligibility separation;
- blind independent review;
- pending protection;
- access/prohibited-field noninterference;
- immutable correction;
- faithful explanation;
- exact replay;
- concurrency;
- RLS; and
- born-synthetic/runtime privilege boundaries.

## Execution Gate

Pass only when one clean command sequence:

1. installs locked dependencies;
2. starts local Supabase;
3. resets and seeds deterministic fixtures;
4. runs all 25 tests;
5. type-checks, lints, and builds; and
6. stops local Supabase without preserving demo data.

## Deferred Tests

- Full routing/review permutations
- Full remedy/appeal/re-entry
- Translation and empirical route equivalence
- Retention/holds/deletion/backups/exports
- Evaluator/causal/outcome infrastructure
- Production privacy/security

Deferred cases remain in `SYNTHETIC_FIXTURE_MATRIX.md` as research design
inventory, not sprint acceptance.
