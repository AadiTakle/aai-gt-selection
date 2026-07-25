# Overnight Backend Build Log

## Run contract

- **Branch:** `feat/backend-admissions-core`
- **Target:** draft PR into `dev`
- **Cadence:** one bounded TDD slice every 30 minutes
- **Owned paths:** `packages/contracts/**`, `packages/db-types/**`,
  `packages/test-fixtures/**`, `supabase/**`, backend scripts, this log, and
  `docs/architecture/FRONTEND_ENABLEMENT_REPORT.md`
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

### Cycle 8 — Truthful decision replay contracts

- **Seam:** `replay_decision` requests and exact, reconstruction, digest, refusal, integrity-
  failure, and execution-mismatch responses.
- **Red:** replay tests failed before request/response schemas existed; fixture tests failed before
  exact and disposed-input examples existed. One intermediate failure exposed a missing test
  envelope `meta` field and was corrected before regression verification.
- **Green:** added strict replay modes/statuses, component-level verification states, failure-code
  vocabularies in documented precedence classes, network-disabled execution evidence, audit-event
  references, and exact stored/replayed decision and root equality.
- **Regression:** 32 contract tests, 13 fixture tests, and both package typechecks pass.
- `reexecuted_exact` is available only when canonical input, policy, executable/environment,
  outcome, ordered reasons, trace, root, and audit chain all verify and the full result reproduces.
- Reconstruction and digest verification explicitly set `exactReplayClaimed=false`. Missing
  executable/environment artifacts and disposed inputs truthfully refuse exact replay; integrity
  and execution mismatches remain distinct.
- Frontend enablement: canonical exact-replay and disposed-input refusal fixtures now support the
  configuration/audit surface without overstating retained evidence.
- **Loop stop:** no further cycle is scheduled, per user request. The next implementation phase is
  the private schema/RLS/RPC database slice using these frozen contracts.

## Pre-CogAT onboarding run — 2026-07-20

- **Branch:** `feat/onboarding-backend-core`
- **Requirements:** R1, R7–R10, H2, H9, H10
- **In scope:** synthetic create/save/resume/submit/status backend through
  `awaiting_assessment`
- **Out of scope:** CogAT, Track A/B routing, Snapshot/review, eligibility decisions,
  accessibility-route fulfillment, allocation, evaluation, uploads, and production deployment
- **Evidence/assumptions:** uses E-037, E-039–E-040, E-054–E-057 and D-012; introduces no new GT
  facts, product decision, evidence claim, or scope exception

### TDD slices completed

1. Synthetic cycle registry and fixture seed.
2. Per-actor/RPC idempotency registry.
3. Append-only application/application-version persistence with forced RLS.
4. Family ownership, direct-grant denial, and IDOR behavior.
5. `api.save_application_draft`, including typed/deep allowlists, optimistic concurrency,
   idempotent replay, and HTTP-mappable error SQLSTATEs.
6. `api.submit_application`, including completeness validation, immutable successor submission,
   `awaiting_assessment`, and submission lock.
7. `api.get_application_status`, exposing only the eight applicant-safe projection fields.
8. Regenerated exposed-`api` database types.

Each behavior was observed failing before its migration/function existed, then passing after the
minimum implementation. Final acceptance evidence is `pnpm db:reset`, 84 passing pgTAP
assertions, `pnpm db:lint`, and `pnpm db:types:check`; workspace verification is recorded on the
branch before handoff.

**Later scope clarification:** D-013 expanded account setup beyond this run's
field contract. These tests remain foundation evidence; the following
Milestone A run records the field-complete synthetic backend expansion.

## D-013 Milestone A expansion — 2026-07-20

- **Requirements:** R1, R7–R10; H2, H4, H7, H9, H10
- **Evidence/boundaries:** D-013; E-032–E-040, E-054–E-057, E-062–E-065;
  born-synthetic only; no live/COPPA, aid-decision, assessment, review, or
  allocation claim
- **Public seams:** exported Zod schemas/fixtures; explicit `api` RPCs; family
  server actions/local adapter

### Observed red → green

1. **Contracts:** `onboarding-contract.test.ts` first ran with 8 of 9 tests
   failing because the D-013 schemas/constants did not exist. After the
   profile, school, support, finance, final-signature, and family API schemas
   landed, the focused suite passed 9/9 and the full contract suite passed
   42/42.
2. **Fixtures:** the focused fixture test first failed 4/4 because multiple
   profiles, active schools, full/partial/`other`, and reload/review fixtures
   were absent. It then passed 4/4; the full fixture suite passed 18/18.
3. **PostgreSQL boundary:** the Milestone A schema/security test first failed on
   missing profile, directory, private-context, reference columns, and RPCs.
   After the three migrations, it passed 35/35. Round-trip/firewall hardening
   then exposed and corrected test-path assumptions before passing 36/36; the
   complete pgTAP suite passes 173 assertions.
4. **B11B adapter:** focused web tests first failed because the environment
   guard and local adapter did not exist. They then passed 11/11, and the full
   web unit suite passed 15/15. A real local Auth/PostgREST integration test
   signs in two fictional families and verifies profile → school → draft →
   reload → submit → status plus wrong-owner not-found through the same typed
   adapter surface.

No new product decision or scope exception was introduced. The grouped
profile JSONB and grouped private-context JSONB are the minimum implementation
of D-013's already approved small-boundary direction; E-063–E-065 remain
visible blockers for real vocabularies, authorities, and requiredness.

### Initial Milestone A verification

On Node `v24.18.0`, `pnpm verify` passed end to end: formatting, lint,
typecheck, 42 contract tests, 18 fixture tests, 15 web unit tests, workspace
boundaries, clean database reset/lint, 173 pgTAP assertions, generated-type
drift, seven fictional Auth users, the live local-adapter integration test,
production build, elevated-key scan, and three existing Playwright shell tests.
Graphify was refreshed for the material code-topology change.

## Independent-review hardening — 2026-07-20

This follow-up preserves D-014's six-stage/four-persona target while hardening
the implemented D-013 onboarding seam.

### Observed red → green

1. **Submitted contracts/cardinality/uniqueness:** the focused contract run
   failed five review cases: duplicate relative/support codes were accepted,
   profile lists rejected item 21, and impossible submitted responses parsed.
   Submitted-specific schemas, uniqueness refinements, and uncapped list
   responses turned the focused suite green at 14/14 and the full contract
   suite green at 47/47.
2. **Frontend-exported actions/startup:** the new action integration test first
   failed because no Next request-cookie harness existed. A Next-compatible
   cookie store then let local Auth populate the production server client and
   all eight `actions.ts` exports execute. The startup test first failed because
   no instrumentation module existed; the actual `register()` hook now fails
   partial/unsafe B11B configuration while leaving disabled builds alone.
3. **Expiry-safe idempotency:** an exact draft retry failed
   `VALIDATION_FAILED` after its selected school expired. Moving actor-scoped
   replay lookup before active-directory validation made the three-assertion
   regression green without weakening first-write validation.
4. **Firewall/concurrency:** the expanded firewall test first failed because no
   projection commitment existed. It now asserts the exact grade-only
   allowlist and mutates identity, household, language, school, support,
   disclosure, finance, referral, and signature classes through unchanged
   projection, deterministic test-probe result, and probe-result hash. A real
   two-client integration race verifies one save/submit winner and deterministic
   `STALE_VERSION`/`SUBMISSION_LOCKED` loser outcomes.

The probe result/hash is test-only evidence for structural noninterference; no
eligibility engine or decision-result hash is implemented or claimed.

### Independent-review final verification

On Node `v24.18.0`, `pnpm verify` passed with 47 contract tests, 18 fixture
tests, 22 web unit/startup tests, 204 pgTAP assertions, three live integration
tests, a clean database reset/lint/type-drift check, production build,
security/boundary scans, and three Playwright shell tests. The separate
CI-equivalent `pnpm test:coverage` command also passed. The live integration
suite was additionally repeated three times without a race-ordering failure.
Graphify was refreshed for the new instrumentation/action topology; its
optional SQL parser remains unavailable, so SQL evidence comes from reset,
lint, and pgTAP rather than the code graph.
