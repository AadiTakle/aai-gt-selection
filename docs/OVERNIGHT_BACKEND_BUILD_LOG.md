# Overnight Backend Build Log

## Run contract

- **Branch:** `feat/backend-admissions-core`
- **Target:** draft PR into `dev`
- **Cadence:** one bounded TDD slice every 30 minutes
- **Owned paths:** `packages/contracts/**`, `packages/db-types/**`,
  `packages/test-fixtures/**`, `supabase/**`, backend scripts, this log, and
  `docs/FRONTEND_ENABLEMENT_REPORT.md`
- **Excluded:** frontend routes/components/styles, allocation, finance,
  evaluation, uploads, hosted Supabase, production deployment, and substantive appeals
- **Merge policy:** commit and push green slices; never merge overnight

## Public seams under test

1. Zod request/response schemas exported by `@gt-selection/contracts`
2. Explicit `api` RPC boundary and generated API-only database types
3. Deterministic synthetic fixtures exported by `@gt-selection/test-fixtures`
4. Database behavior through pgTAP and direct RPC/Auth tests
5. CI checks on the draft PR

## Mandatory TDD gate

Every implementation slice must record all four stages before it can be committed:

1. **Seam:** name the public contract, RPC, or database behavior being tested.
2. **Red:** add one focused acceptance test and run it before implementation; record the command
   and the expected failure.
3. **Green:** implement only enough behavior to satisfy that test; rerun the targeted test.
4. **Regression:** run the relevant package checks plus workspace lint, typecheck, and tests.

No implementation commit is allowed without observed red and green evidence. Documentation-only,
generated-file, or CI-maintenance changes must be labeled explicitly rather than presented as a
TDD implementation slice. Tests verify public behavior and may not assert private helpers,
duplicate implementation logic, or rely on snapshots that cannot independently fail.

## Ordered slices

- [ ] Shared write/read RPC schemas, workflow transitions, reasons, errors, and examples
- [ ] Immutable application, assessment, and synthetic policy versions
- [ ] Deterministic Track A and Track B invitation routing
- [ ] RLS ownership and role isolation
- [ ] Snapshot and blind reviewer workflow
- [ ] Pending items, final eligibility, and correction successors
- [ ] Canonical decision replay
- [ ] Critical-suite hardening and final adversarial review

## Cycle log

### Cycle 0 — Setup

- Created the dedicated backend branch.
- Confirmed accepted architecture and existing Phase B scaffold.
- Established path ownership and public test seams.
- Next slice: freeze the first write RPC contract (`save_application_draft`) through a failing
  contract test, then implement the minimum schema.

### Cycle 1 — Draft-save contract

- Added a strict `saveApplicationDraftRequestSchema` with application identity, expected
  version, idempotency key, correlation ID, and synthetic-only draft payload.
- Verified red first: the new contract test failed while the schema was absent.
- Verified green: 11 contract tests and contract typecheck pass.
- Confirmed unknown/private fields such as household income are rejected.
- Frontend enablement: the family application shell can now type and validate draft autosave
  payloads without importing Supabase or private database types.
- Next slice: freeze `submit_application` response/envelope and status projection examples,
  then continue through the remaining write/read RPC contracts.

### Cycle 2 — Submitted-application response

- **Seam:** `submit_application` public response envelope and frontend fixture.
- **Red:** contract test failed because `submitApplicationResponseSchema` was absent; fixture
  test failed because the submitted response example was absent.
- **Green:** added a strict v1 success envelope containing the immutable submitted application,
  applicant-safe `awaiting_assessment` projection, synthetic-only marker, and idempotency
  metadata; added the matching fictional frontend fixture.
- **Regression:** 12 contract tests, 6 fixture tests, and both package typechecks pass.
- Confirmed the response rejects prohibited workflow values such as `admitted`.
- Frontend enablement: the family portal can build submit-success and awaiting-assessment UI
  against one validated response object rather than maintaining a hand-written mock.
- Next slice: freeze assessment-recording/routing request and response contracts, including
  pending assessment outcomes and Track A/Track B reason ordering.

### Cycle 3 — Assessment recording and routing contracts

- **Seam:** `record_assessment_version` request/response, typed routing decisions, and canonical
  pending/invitation fixtures.
- **Red:** tests first exposed three absent or permissive boundaries: unversioned reasons were
  accepted, a Track A decision could carry a Track B outcome, and the assessment RPC
  request/response plus fixtures did not exist.
- **Green:** closed reasons to the versioned reason-code vocabulary; discriminated decision
  summaries by decision kind; added strict assessment input, immutable version, routing, and v1
  response schemas; added validated missing/invalid and dual-reason Track B fixtures.
- **Regression:** 15 contract tests, 8 fixture tests, and both package typechecks pass.
- Missing or invalid assessment data now resolves as a successful domain envelope with both
  routing decisions `pending`, never as an HTTP/transport failure or negative classification.
- The synthetic dual-reason fixture preserves canonical order:
  `TB_COMPOSITE_BAND`, then `TB_BATTERY_PROFILE`.
- Frontend enablement: admissions and family surfaces can independently implement assessment
  correction and Snapshot-invitation states against runtime-validated fixtures.
- Next slice: freeze `submit_snapshot_version` request/response contracts for artifact and
  narrative routes, including review-case creation and initial blind assignments.

### Cycle 4 — Snapshot submission contracts

- **Seam:** `submit_snapshot_version` artifact/narrative requests, immutable Snapshot versions,
  review-case creation, and initial blind assignments.
- **Red:** route tests failed before the request/response schemas existed; fixture tests failed
  before canonical response examples existed; follow-up tests showed domain/fixture mismatches
  and mismatched review-case version references were still accepted.
- **Green:** added strict discriminated artifact and narrative contracts, bounded synthetic
  narrative provenance, immutable version metadata, route-specific assignment tuples, applicant-
  safe under-review status, domain consistency checks, and review-case version consistency.
- **Regression:** 17 contract tests, 9 fixture tests, and both package typechecks pass.
- Artifact submissions accept one or two synthetic fixture references and create exactly two
  blind reviewer assignments. Narrative submissions require one fixture plus bounded provenance
  and create exactly two reviewer assignments plus one blind supervisor assignment. The future
  RPC/database seam must still enforce the policy-bundle fixture allowlist.
- URL, upload, media, and unknown fields fail at the strict contract boundary.
- Frontend enablement: both Snapshot routes now have runtime-valid submission response fixtures
  with no reviewer identity or prior-vote exposure.
- Next slice: freeze `submit_review` response and transition contracts, including artifact
  disagreement creating one blind-third assignment and narrative remaining open after two votes.

### Cycle 5 — Review submission transitions

- **Seam:** immutable review submission output plus awaiting, blind-third, and finalized
  `submit_review` response transitions.
- **Red:** response tests failed before `submitReviewResponseSchema` existed; fixture tests failed
  before canonical transition examples existed; a follow-up test showed mismatched submission and
  transition case references were accepted.
- **Green:** added reusable six-dimension rating validation, locked review submissions,
  route/count-specific transition schemas, one opaque blind supervisor assignment for artifact
  disagreement, final Track B decision/status coupling, and cross-object review-case binding.
- **Regression:** 21 contract tests, 10 fixture tests, and both package typechecks pass.
- Narrative finalization is impossible at two votes; its contract remains under review until all
  three classifications are locked. Matching artifact votes may finalize at two; conflicting
  artifact votes require exactly the slot-3 blind supervisor shape.
- Responses expose neither reviewer identity nor prior votes and retain the
  eligibility-not-admission boundary.
- Frontend enablement: canonical artifact-disagreement and narrative-two-vote responses are now
  available for pending/internal and still-under-review UI states.
- Next slice: freeze reviewer abstention/replacement and decision-critical evidence/access pending
  transitions before moving from public contracts into database implementation.

### Cycle 6 — Abstention, replacement, and pending blockers

- **Seam:** non-vote review actions, replacement work, evidence/access blockers, and owned pending
  items.
- **Red:** action tests failed before abstention and blocking-issue request/response schemas
  existed; fixture tests failed before canonical action responses existed; a follow-up test showed
  slot-3 replacement work could carry the wrong reviewer role.
- **Green:** added strict abstention reasons, bounded evidence/access issue codes, unified review
  action envelopes, replacement-assignment transitions, typed pending items with owner/deadline/
  route, family/internal status projections, deadline consistency, and slot-role preservation.
- **Regression:** 24 contract tests, 11 fixture tests, and both package typechecks pass.
- Conflict/competence abstention contains no classification or ratings, does not enter majority
  aggregation, and creates replacement work for the same case and assignment slot.
- Missing/materially incomplete/uninterpretable evidence pauses aggregation for family correction.
  A failed accessibility route pauses aggregation for the access steward; neither becomes a
  negative classification.
- Frontend enablement: canonical abstention, evidence-correction, and accessibility-pending
  response fixtures now cover reviewer, family, and internal pending surfaces.
- Next slice: freeze `apply_correction` successor request/response contracts, preserving immutable
  originals and triggering a fresh deterministic rerun without implementing substantive appeal.

### Cycle 7 — Immutable correction successors

- **Seam:** `apply_correction` requests, one-step successor lineage, decision-impact proof, and
  explicit disabled-scope responses.
- **Red:** contract tests failed before correction schemas existed; fixture tests failed before
  canonical correction examples existed; follow-up tests showed a decision-used correction could
  claim completion without new input/result commitments.
- **Green:** added bounded application, assessment, Snapshot-provenance, and procedural correction
  payloads; strict original/successor references; complete-manifest rerun evidence; decision-
  excluded hash invariance; and non-retryable `FEATURE_DISABLED` for substantive rubric appeal or
  new evidence.
- **Regression:** 28 contract tests, 12 fixture tests, and both package typechecks pass.
- Every applied correction preserves the original, creates exactly the next immutable version,
  and identifies whether a complete decision rerun occurred or invariance was verified.
- Snapshot correction may change bounded provenance for an existing fixture only; there is no
  payload for adding evidence. Procedural cures use a closed error/cure vocabulary.
- Frontend enablement: assessment-successor, decision-invariant, and disabled-appeal fixtures now
  cover corrected status and deferred-scope messaging without implying substantive review.
- Next slice: freeze `replay_decision` request/response contracts for exact re-execution,
  reconstruction/digest-only modes, and truthful refusal when artifacts or inputs are unavailable.
