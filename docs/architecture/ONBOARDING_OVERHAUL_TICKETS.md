# Onboarding Overhaul — Ticket Backlog

## Scope

Everything before CogAT now has two layers under **D-013**:

1. **Account/profile setup** — reusable guardian-owned student and household
   facts.
2. **Cycle application** — an immutable snapshot of current grade, requested
   entry, school, private support/disclosure/financial context, and the signed
   submission.

The flow is:

**create account → set up student/household profile → start cycle application →
save/resume → review/sign/submit → `awaiting_assessment`**

### Delivery milestones

**Milestone A — frontend integration-ready synthetic backend (current target)**

- Final D-013 Zod contracts and fixtures
- Local synthetic profile/application persistence with forced RLS
- School-directory fixture and all private setup sections
- Family-owned read/save/submit/status APIs
- Server-only development adapter callable by the frontend
- Generated types, pgTAP, contract tests, and one end-to-end happy path

This milestone lets frontend development and real local hookup proceed. It does
not authorize live child data or claim legal compliance.

**Milestone B — live/production readiness (deferred)**

- Cognito/RDS Proxy/Aurora binding and infrastructure
- B-06 privacy/legal approval, production notices and retention schedules
- Full data-rights/disposition and operational support workflows
- B-08 aid policy and any post-admission proof-document process
- Production monitoring, incident response, and deployment validation

### Explicitly out of scope

- CogAT/assessment recording and Track A/B routing
- Snapshot evidence, review, adjudication, eligibility, allocation, or offers
- The two general application essays
- Current-school enrollment date and prior-school history
- W-2 or other financial proof during profile/application setup
- Financial-aid determination; a future post-admission proof workflow remains
  blocked by `B-08`
- Live child data or a claim of COPPA compliance; `B-06` remains a live-use gate

### Governance

- **Requirements:** R1, R7–R10, H2, H4, H7, H9, H10
- **Evidence/assumptions:** D-013; E-032–E-040 and E-054–E-057; the field
  vocabularies, requiredness, school-directory authority, financial
  definitions, retention, and legal applicability remain open
- **Smallest sufficient deliverable:** a born-synthetic account/profile and
  application snapshot that round-trips through save, resume, review, and
  submit while private fields provably cannot enter eligibility
- **Acceptance evidence:** strict contracts/fixtures; migration/RLS tests;
  save/resume/submit round-trip; conditional-field tests; mutation-invariance
  tests for prohibited eligibility fields; generated API types; CI
- **Causal risk:** none; no causal or assessment logic changes
- **Applicant/privacy risk:** high if fields are combined, over-retained, or
  exposed to reviewers; purpose-separated storage and `B-06` review are
  mandatory
- **Backend platform:** PostgreSQL/RLS/RPCs remain portable to Aurora under
  D-012; B11A still supplies the Cognito/`pg` request binding

## Canonical tracked-data map

| Storage boundary | Tracked fields | Purpose/classification | Eligibility use |
|---|---|---|---|
| Authenticated guardian account | Cognito subject; verified account contact retained by the identity provider | Identity/authentication | Never |
| Student profile | Synthetic student code, name, date of birth, gender | Restricted child identity/demographic data | Never |
| Household profile | Guardian relationship, primary address, prior-GT-relative flag and names, home/first/primary/additional languages | Restricted household/context data | Never |
| Versioned school directory | Directory ID/version, school name, type, normalized address, active dates/source | Operational reference data | Name/address/prestige never; type is context only |
| Cycle application core | Current grade, requested entry year/grade, selected school ID plus signed directory snapshot | Operational pathway/application data | Grade/year may select an available pathway; never giftedness evidence |
| Private support/disclosure version | Support-needed yes/no, accommodation codes, support-plan codes, `other`, bounded details, discipline and non-health-withdrawal flags, conditional explanation | Highly restricted access/support and student-welfare context | Never |
| Private financial-intake version | Annual household income, currency/tax-year or approved band, household-member count | Highly restricted financial-aid context | Never |
| Final submission version | Completed steps, acknowledgement text/version/time, referral source, signer user/name, signature-statement version, signed time | Audit/operations | Never |

Signature statement v1:

> I/We hereby state that the information contained herein is true and complete.
> I/We acknowledge that supplemental information may be required by the school
> and understand that our application will not be reviewed until supplement(s),
> if required, have been submitted.

### Conditional rules

- School selection copies the directory name/type/address into the signed
  application so later directory edits do not rewrite history.
- `other/not listed` school requires a bounded synthetic name/type/address.
- Support details are required when support-needed is yes or `other` is chosen.
- A bounded explanation is required when discipline or non-health withdrawal is
  yes.
- Prior-GT-relative names are required only when the flag is yes.
- Additional languages are collected only when the additional-language flag is
  yes.
- W-2 metadata/documents do not exist in setup storage; no “admitted” trigger is
  implemented in this slice.

### Open decisions that must stay configurable

- Gender options and whether the field is required
- School-directory source, update authority, and `other/not listed` policy
- Accommodation/support-plan code lists and operational viewers
- Exact income versus bands, currency/tax year, requiredness, and household
  membership definition
- Required acknowledgement/referral options and signature policy
- Notice, parental authority, consent, retention/deletion, export/correction,
  and security controls required for live child data

## Current implementation status

The working tree now contains the **Milestone A frontend-integration-ready
synthetic backend**: final D-013 contracts/fixtures, reusable profiles, a
fictional school directory, purpose-separated private context, family
read/save/list/submit/status RPCs, generated API types, and B11B server actions.
Independent hardening now exercises those exported actions through local Auth,
Next-compatible request cookies, and the production server client in CI;
validates B11B at instrumentation startup; and covers real two-session
save/submit races.
The family form UI, Cognito/Aurora binding, live privacy/legal controls, real
school data, aid policy, and all post-onboarding admissions features remain
outside this backend milestone.

---

## Backend tickets

### B1 — Expand the application draft/version contract to the full PRD field set

**Status:** Complete for Milestone A (2026-07-20). Strict exported schemas cover
the D-013 profile, school snapshot, application core, support/disclosure,
finance, and exact signed statement; submitted responses require every section,
all completed steps, coherent lineage, and exact safe status. Duplicate
relative/support codes and excluded fields are rejected.

**What:** Replace the single application-content shape with strict schemas for:

- reusable student and household profiles;
- the school-directory selection and immutable address/type snapshot;
- cycle application core fields;
- private support/plan/disclosure context;
- private financial intake; and
- versioned acknowledgements/referral/signature.

Remove enrollment-date and prior-school fields. Keep the two essays and W-2
documents outside every request/response schema.

**Files:** `packages/contracts/src/application.ts`,
`packages/contracts/src/contracts.test.ts`,
`packages/test-fixtures/src/index.ts`

**Acceptance criteria:**

- Every row in the canonical tracked-data map has one strict schema and purpose
- Conditional requirements fail with field-level errors
- Private schemas are not exported through reviewer/decision projections
- Fixtures cover full, partial autosave, `other`, and every conditional branch
- `pnpm --filter @gt-selection/contracts test` passes

**Requirements:** R1, R5, R9, H2, H10
**Depends on:** none
**Size:** S–M

---

### B2 — Define the missing read-RPC and draft-save-response contracts

**Status:** Complete for Milestone A (2026-07-20). Profile save/read/list,
active-school read, full application reload/review, save, submit, and status
request/response schemas are exported. Profile lists intentionally have no
invented cardinality cap; SQL and Zod parity is tested above 20 profiles.

**What:** Retain the save/status envelopes and add minimized family-only
contracts for:

- `get_account_setup` — reusable student/household profile plus current draft;
- profile/application upsert mutations with independent expected versions; and
- a review-page projection containing all signed non-essay fields and no
  internal IDs, reviewer data, or prohibited operational metadata.

**Files:** `packages/contracts/src/application.ts` (or a new
`packages/contracts/src/status.ts`), `packages/contracts/src/index.ts`,
fixtures/tests

**Acceptance criteria:**

- Family can round-trip every tracked setup field after a reload
- Read projections expose only the caller's own profile/application
- Status remains a separate eight-field minimized projection

**Requirements:** R7, R10, H9
**Depends on:** B1 (for the version shape it wraps)
**Size:** S

---

### B3 — Migration: `app.application` and `app.application_version` tables

**Status:** Complete for Milestone A (2026-07-20). `student_profile` and its
versions group student/household/language content; `school_directory_version`
and `application_private_context_version` keep the remaining purposes
separate; application versions bind exact references and signed snapshots.

**What:** First real data migration. Add the two core tables from
`MVP_DATA_CONTRACT.md`: `app.application` (owner, synthetic code, cycle,
timestamps) and `app.application_version` (immutable submitted versions,
successor lineage, `content_hash`, `state` enum matching
`applicationStateSchema`). Columns should mirror the B1-expanded contract
fields (flattened or as one `content jsonb` column — pick one and document
why in the migration comment).

**Files:** new file in `supabase/migrations/`

**Acceptance criteria:**

- `pnpm db:reset` applies cleanly
- Submitted versions have no `UPDATE`/`DELETE` grant path for any role
  (immutability enforced at the grant level, not just app logic)
- `pnpm db:lint` passes

**Requirements:** R7, R9
**Depends on:** B1 (field list)
**Size:** M

---

### B4 — Migration: minimal synthetic `cycle` table + seed row

**Status:** Complete (2026-07-20).

**What:** Add the `cycle(cycle_id, cycle_code, data_class, opens_at,
closes_at)` table from `BACKEND_DATA_MODEL.md` (minimal columns only — no
policy bundle reference needed for this slice) and seed exactly one synthetic
cycle so local dev has something to attach applications to.

**Files:** new migration file, `supabase/seed.sql`

**Acceptance criteria:**

- One `synthetic_only=true` cycle row exists after `pnpm db:reset`
- Cycle code is clearly fictional (e.g., `CYCLE-SYN-01`)

**Requirements:** R8, R9
**Depends on:** none (can run before or parallel to B3)
**Size:** S

---

### B5 — Migration: idempotency-key table

**Status:** Complete (2026-07-20).

**What:** Add the shared idempotency dedupe table referenced by every write
RPC in the provisional contract (`(actor_id, rpc_name, idempotency_key)`
unique constraint, per `PROVISIONAL_IMPLEMENTATION_CONTRACT.md` request
contract). This is shared infrastructure other backend work will also need,
but only `save_application_draft`/`submit_application` will use it in this
slice.

**Files:** new migration file

**Acceptance criteria:**

- Unique constraint on `(actor_id, rpc_name, idempotency_key)`
- Reused key with a different payload hash is detectable (store a payload
  hash column for the RPC layer to check)

**Requirements:** R7
**Depends on:** none
**Size:** S

---

### B6 — RLS policies for `app.application` / `app.application_version`

**Status:** Complete for all Milestone A tables (2026-07-20). Every private
table has enabled and forced RLS, no direct authenticated grant, owner-scoped
family policies, and the D-012 GUC principal contract.

**What:** Force RLS on both tables, revoke all direct grants from
`authenticated`, and add the ownership policy from
`RLS_AND_AUTH_BLUEPRINT.md`: `application.owner_user_id =
current_setting('app.user_id')::uuid`. No other role needs access in this
slice (admissions operator doesn't touch base applications yet — that starts
at assessment recording, which is out of scope).

**Files:** same migration as B3, or a follow-up migration

**Acceptance criteria:**

- `alter table ... force row level security` present for both tables
- `revoke all ... from public, authenticated` present before any grant
- No role except the family owner can select/insert their own rows even with
  direct table access (tested in B7)

**Requirements:** R7, R9
**Depends on:** B3
**Size:** S

---

### B7 — pgTAP tests: ownership isolation for application tables

**Status:** Complete for Milestone A (2026-07-20). The pgTAP suite covers every
new storage boundary, hard direct-table denial, family isolation, definer
metadata, signed-snapshot immutability, directory-expiry replay, and all
represented D-013 prohibited-field classes. The suite now contains 204
assertions.

**What:** Extend `supabase/tests/` with a new test file covering: anon denied,
one family cannot read/write another family's application, and the
`authenticated` role has zero direct table grants (must go through RPCs).
This is the `RLS-01`/`AUTH-01`/`IDOR-01` subset from
`CRITICAL_TEST_MANIFEST.md` scoped to just these two tables.

**Files:** new file in `supabase/tests/`

**Acceptance criteria:**

- `pnpm db:test` passes with the new file
- Test explicitly asserts cross-owner row access fails (not just "no rows
  returned" — check for a denial, not an empty result, per IDOR-01 intent)

**Requirements:** R7, R9, H7
**Depends on:** B6
**Size:** S–M

---

### B8 — Implement `api.save_application_draft`

**Status:** Complete for Milestone A (2026-07-20). Draft save atomically appends
the core application and private-context versions, binds an owned profile
version, validates directory snapshots and all conditional branches, and
retains stale/idempotency protections. Actor-scoped idempotency replay is
resolved before mutable directory-active checks, so exact retries survive later
directory expiry.

**What:** The first write RPC. `SECURITY DEFINER`, owned by `api_executor`,
re-verifies the Cognito-bound session GUC identity/role, ownership,
`expected_version`, idempotency key, and typed/allowlisted JSON content before
appending a new `application_version` row.
Returns the new version + content hash per B2's response schema.

**Files:** new migration (RPC function), integration test

**Acceptance criteria:**

- Matches the request/response contracts from B1/B2 exactly
- Stale `expected_version` returns `409 STALE_VERSION`
- Reused idempotency key with a different payload returns
  `409 IDEMPOTENCY_KEY_REUSED`
- Non-owner call returns the same not-found response as a missing application
  (per the blueprint's "wrong-owner = not-found" rule)

**Requirements:** R1, R7, R9, H9, H10
**Depends on:** B1, B2, B3, B5, B6
**Size:** M

---

### B9 — Implement `api.submit_application`

**Status:** Complete for Milestone A (2026-07-20). Submission requires every
D-013 section, appends an immutable successor, binds the trusted signer, and
preserves exact profile/private/school/final references.

**What:** Locks the current draft into a `submitted` state (immutable from
this point), and returns the frontend `statusProjection` with
`workflowStatus: awaiting_assessment`.

**Files:** same migration file as B8 or a follow-up, integration test

**Acceptance criteria:**

- Submitted version becomes immutable (verified in test: a later draft save
  or submission cannot alter or append to that application)
- Returned status projection matches `statusProjectionSchema` exactly,
  including `claimBoundaryCode: 'ELIGIBILITY_NOT_ADMISSION'`
- Double-submit returns `409 SUBMISSION_LOCKED`

**Requirements:** R1, R7, R9, R10, H9
**Depends on:** B8
**Size:** M

---

### B10 — Implement `api.get_application_status` (read RPC)

**Status:** Complete for Milestone A (2026-07-20). Status remains the separate
eight-field projection; `api.get_application` supplies the full owner-only
reload/review projection.

**What:** Family-only read RPC (or `security_invoker=true` view) returning the
current status projection for the caller's own application. For this slice,
the projection logic is a pure function of `application_version.state`
(draft → `application_draft`; submitted → `awaiting_assessment`) — no policy
bundle or routing engine needed.

**Files:** new migration (RPC/view), integration test

**Acceptance criteria:**

- Returns `application_draft` before submission, `awaiting_assessment` after
- Never exposes raw table columns beyond the projection fields
- Cross-owner read denied (same test pattern as B7)

**Requirements:** R7, R9, R10, H9
**Depends on:** B3, B6, B9
**Size:** S–M

---

### B11 — Regenerate and commit `packages/db-types`

**Status:** Complete for the eight Milestone A RPCs (2026-07-20); regenerate
after every exposed API migration.

**What:** Run `pnpm db:types` after B3–B5 land so generated types reflect the
new tables, and fix `scripts/check-generated-types.ts` drift if any.

**Files:** `packages/db-types/src/database.generated.ts`

**Acceptance criteria:**

- `pnpm db:types:check` passes on a clean Node 24 run

**Requirements:** R7
**Depends on:** B3, B4, B5
**Size:** S (mechanical)

---

### B11A — Implement the Cognito/`pg` request adapter

**Status:** Milestone B. Not required for local synthetic frontend integration;
required before AWS/live deployment.

**What:** Add a server-only Next.js adapter that verifies the Cognito JWT,
extracts `sub` and the admin-controlled `custom:user_role`, opens one `pg`
transaction, sets `SET LOCAL app.user_id` and `app.user_role`, invokes the
eight Milestone A family `api` functions, maps `PT4xx` SQLSTATEs to typed HTTP
errors, and commits
or rolls back. This is the D-012 replacement for browser/PostgREST
`supabase.rpc(...)`; no database credential or role claim may enter browser
code.

**Files:** server-only database/auth modules and Server Actions or route
handlers under `apps/web/src/`; AWS client configuration owned by the AWS
binding workstream

**Acceptance criteria:**

- Forged, missing, or user-editable roles cannot set either PostgreSQL GUC
- Each request uses one transaction and clears identity automatically at its
  end
- All family actions parse requests/responses through `@gt-selection/contracts`
- `PT400/401/403/404/409` map to the documented typed error envelope
- Integration tests prove family ownership and cross-owner not-found behavior
  through the adapter, not only direct SQL
- No browser bundle or ordinary app runtime contains an RLS-bypassing
  credential

**Requirements:** R7, R8, R9, R10, H9
**Depends on:** B8–B11 and the D-012 AWS binding foundation
**Size:** M–L

---

### B11B — Server-only local synthetic integration adapter

**Status:** Complete for local born-synthetic integration and merge-blocking CI
(2026-07-20). The exported `actions.ts` path executes through local Auth,
Next-compatible cookies, and the production server client; instrumentation
fails unsafe/partial B11B bootstrap; separate sessions verify save/submit races.

**What:** Expose the same typed frontend actions as B11A against the local
synthetic stack. Resolve the current synthetic family session server-side,
bind its trusted user/role into one database transaction, invoke the API
functions, and parse every response. Fail closed outside the designated local
synthetic environment.

This is a development adapter, not a second product API. B11A later replaces
its auth/connection binding without changing frontend contracts.

**Acceptance criteria:**

- Frontend can create/read/save/submit one synthetic account setup end to end
- No elevated key or database credential reaches the browser bundle
- Identity/role cannot come from request payloads or user-editable attributes
- Wrong-owner access returns the same not-found response as an absent record
- Startup fails outside the approved local synthetic project/environment
- Integration tests use the same Zod actions the frontend imports

**Requirements:** R7–R10, H9
**Depends on:** B1–B15 as each action becomes available
**Size:** M

---

### B12 — Private support-plan and disclosure versions

**Status:** Complete for family save/reload in Milestone A (2026-07-20).
Future operational viewer roles and response obligations remain blocked by
E-065/B-06.

**What:** Add a private, immutable section version for accommodation/support
codes, `other`, bounded details, disciplinary-sanction flag, non-health
withdrawal flag, and conditional explanation. Keep operational access separate
from eligibility/reviewer access.

**Files:** new contracts, migrations, family/admissions read projections, and
RLS/noninterference tests

**Acceptance criteria:**

- Conditional detail/explanation rules are database enforced
- Family can save/resume its own values
- Only approved operational roles can read private context
- Changing any field changes zero eligibility inputs, results, or hashes
- No value appears in reviewer or applicant status projections

**Requirements:** R9, H4, H7, H10
**Depends on:** B3, B6
**Size:** M–L

---

### B13 — Versioned school directory and signed school snapshot

**Status:** Complete with fictional versioned fixtures for Milestone A
(2026-07-20); the authoritative GT source/owner remains blocked by E-063.

**What:** Add a versioned school directory read surface with stable ID, name,
type, normalized address, source/version, and active dates. Selecting a school
copies the displayed name/type/address into the application version. Support a
bounded `other/not listed` route.

**Acceptance criteria:**

- Directory changes never rewrite a submitted application
- Family role receives only active display fields
- Selection persists both directory reference and immutable snapshot
- School name/address/prestige is absent from eligibility projections

**Requirements:** R7–R10, H2, H10
**Depends on:** approved directory source and update owner
**Size:** M

---

### B14 — Reusable student and household profiles

**Status:** Complete for Milestone A (2026-07-20). One guardian can own multiple
profile roots; each append-only version groups the student, household/address,
relative, and language purposes without adding speculative tables.

**What:** Add guardian-owned student profile, household profile, and
guardian/student relationship versions. Track student name/DOB/gender,
guardian relationship, address, prior-GT relatives/names, and the home-language
survey. Snapshot the referenced versions when an application is submitted.

**Acceptance criteria:**

- One guardian account can own multiple synthetic student profiles
- Save/resume works independently from a cycle application
- A submitted application retains exact profile-version references
- Cross-household IDOR tests fail closed
- Identity/demographic/household/language fields never enter eligibility

**Requirements:** R1, R7–R10, H2, H4, H7, H9, H10
**Depends on:** B1, B2, B6 and approved field vocabularies/retention
**Size:** L

---

### B15 — Private financial-aid intake

**Status:** Complete for born-synthetic intake in Milestone A (2026-07-20).
Definitions, authorized financial viewers, aid decisions, and proof remain
blocked by E-064/B-08.

**What:** Add a private version containing household income and household
member count with configurable currency/tax-year/band semantics. Do not add
W-2 fields, upload metadata, or an aid decision.

**Acceptance criteria:**

- Only family and a future explicitly authorized financial role can read it
- Income/count cannot affect eligibility, reviewer queues, or decision hashes
- No W-2/document column, API field, bucket, or upload route exists
- Submitted application binds the exact financial-intake version

**Requirements:** R7–R10, H2, H7, H9
**Depends on:** B-08 definitions and B6
**Size:** M

---

### B16 — Child-privacy lifecycle and verified guardian control

**Status:** Required before live data; blocked by B-06 legal/privacy decisions.

**What:** Implement the technical controls needed to support a
guardian-directed child profile: versioned notice/consent records, verified
guardian authority, purpose/field metadata, access/export/correction/deletion
requests, retention/disposition, private audit logging, and log redaction.
Encrypt data in transit/at rest through the approved AWS services.

**Acceptance criteria:**

- Research/optional consent remains separate from ordinary application rights
- Families can access and correct their own profile/application data
- Retention/deletion tests cover payloads, idempotency copies, and audit limits
- Logs and errors contain no names, DOBs, addresses, support details, or income
- A privacy/legal reviewer approves the actual operator/data-flow obligations
  before any “COPPA compliant” or live-use claim

**Requirements:** R7–R10, H2, H7, H9, H10
**Depends on:** B-06, B6, B11A, and all private storage tickets
**Size:** L plus external legal/privacy review

---

## Frontend tickets

### F1 — Typed RPC wrapper layer

**What:** `apps/web/src/lib/rpc/` — transport-neutral typed clients for
`saveApplicationDraft`, `submitApplication`, and `getApplicationStatus`.
Components call Server Actions, never `supabase.rpc(...)` or PostgreSQL
directly. The interface can be built and unit-tested against
`packages/test-fixtures` before B11A provides the live Cognito/`pg` adapter.

**Files:** new files under `apps/web/src/lib/rpc/`

**Acceptance criteria:**

- One wrapper per RPC (`saveApplicationDraft`, `submitApplication`,
  `getApplicationStatus`), each parsing the response with the matching Zod
  schema and throwing a typed error on parse failure
- Unit tests use fixtures, not a live database

**Requirements:** R7, R10
**Depends on:** B1/B2 for fixtures; B11B for local integration; B11A for AWS/live calls
**Size:** S–M

---

### F2 — Account setup and application stepper

**What:** Replace the family placeholder with two connected surfaces:

- `/family/setup` for reusable student/household profile steps; and
- `/family/apply` for one cycle's school, support/disclosure, finance, and
  signed-submission snapshot.

Use this visible step order:

1. Student information
2. Educational background
3. Special accommodations, learning plans, and disclosures
4. Family information and home-language survey
5. Financial-aid intake
6. Review, acknowledgements, referral, and signature

**Files:** family setup/apply routes and shared stepper/form components

**Acceptance criteria:**

- Every canonical tracked field appears exactly once in the correct layer
- School selection autofills type/address and clearly supports `other`
- Conditional sections appear and validate only when triggered
- Private/financial copy explains purpose and never implies eligibility use
- The two essays and all W-2/document inputs are absent
- Review page mirrors the signed non-essay snapshot

**Requirements:** R1, R7–R10, H2, H4, H7, H9, H10
**Depends on:** B1, F1 (or fixtures, to unblock in parallel)
**Size:** L

---

### F3 — Autosave and resume

**What:** Debounced, version-aware autosave for both `/family/setup` and
`/family/apply`, plus restore-on-return through B2's minimized account-setup
read. Do not rely on the last mutation response as the only copy of the draft.

**Files:** `apps/web/src/app/(embed)/family/apply/` (hook/component),
`apps/web/src/lib/rpc/`

**Acceptance criteria:**

- Reloading either surface restores every profile/application section
- Switching among multiple student profiles restores the correct owner-bound data
- Concurrent-edit conflict (stale `expectedVersion`) shows a clear "someone
  else changed this" message, not a silent overwrite

**Requirements:** R9, H9, H10
**Depends on:** F1, F2, B2, B8, B12–B15, B11B for local integration
**Size:** M

---

### F4 — Submission flow

**What:** Final review screen showing the required-step checklist and
accuracy acknowledgement, wired to `submitApplication`. Handles
`SUBMISSION_LOCKED`/`STALE_VERSION` error codes with applicant-safe messages.

**Files:** `apps/web/src/app/(embed)/family/apply/` (review step)

**Acceptance criteria:**

- Submission is blocked client-side until the checklist is complete
- The review payload includes every tracked non-essay field and no W-2/document field
- Post-submit, user is redirected to `/family/status`
- Error codes map to the applicant-safe copy from the PRD's error contract,
  never a raw error code or stack trace

**Requirements:** R1, R9, R10, H9
**Depends on:** F3, B9, B12–B15, B11B
**Size:** M

---

### F5 — Family status page

**What:** Build `/family/status` to render only the `statusProjection` enum
fields — never raw scores, reviewer identity, or audit data (this is a hard
rule from the architecture plan). Shows the PRD's required post-submission
copy verbatim: *"Application received. This is not an eligibility or
admission decision..."*, CogAT as next step, deadline, and next-action code.

**Files:** `apps/web/src/app/(embed)/family/status/page.tsx`

**Acceptance criteria:**

- Displays `workflowStatus`, `nextActionCode`, `deadline`,
  `claimBoundaryCode` copy exactly as specified
- Renders correctly for both `application_draft` and `awaiting_assessment`
  states
- No component in this page can render a field outside
  `statusProjectionSchema`

**Requirements:** R9, R10, H9
**Depends on:** B10, B11B, F1
**Size:** S–M

---

### F6 — Required private support/language/disclosure UI

**What:** Implement steps 3–4 from F2 using the private B12/B14 contracts:
versioned selections, `other`, bounded details, conditional disclosure
explanation, and home-language fields.

**Files:** new route/component

**Acceptance criteria:**

- Saves through private family-owned RPCs; never through the general decision
  payload
- Meets keyboard/screen-reader requirements and retains an assisted-route path
- Shows no immediate eligibility consequence or fit determination
- Conditional details restore correctly after reload

**Requirements:** R9, H4, H7, H10
**Depends on:** B12, B14
**Size:** M–L

---

### F7 — Shared error-code → message mapping

**What:** One shared module mapping API error codes (`VALIDATION_FAILED`,
`STALE_VERSION`, `SUBMISSION_LOCKED`, etc.) to applicant-safe copy, used by
F2/F3/F4 so error handling isn't duplicated per form.

**Files:** `apps/web/src/lib/errors.ts` (or similar)

**Acceptance criteria:**

- One function `mapErrorCode(code) => string` covering every code in the
  provisional contract's error list that's reachable from these RPCs
- Never leaks raw codes/messages to the UI

**Requirements:** R9, R10, H9
**Depends on:** none (can be built anytime, wired into F3/F4)
**Size:** S

---

### F8 — End-to-end test: full onboarding happy path

**What:** Playwright tests: log in as a fictional guardian, create/select a
student profile, complete all six setup/application steps, exercise triggered
conditional fields, reload mid-way, review the non-essay snapshot, submit, and
confirm `awaiting_assessment`.

**Files:** `apps/web/e2e/`

**Acceptance criteria:**

- Runs in CI via existing `pnpm test:e2e` / verify pipeline
- Covers autosave-then-reload explicitly (not just happy-path submit)
- Covers `other` school/support, prior-GT-relative, additional-language, and
  discipline/withdrawal explanation branches
- Asserts essays and W-2 inputs do not exist

**Requirements:** R1, R7, R9
**Depends on:** F2, F3, F4, F5 all complete
**Size:** M

---

### F9 — Guardian privacy notice and data-rights surface

**What:** Add the B16-approved notice/consent presentation and family controls
for access, correction, export, and deletion requests. Keep optional/research
choices separate from application submission.

**Acceptance criteria:**

- Notice text/version and guardian action are captured accessibly
- Declining optional/research use does not block or alter ordinary eligibility
- Rights requests have clear status and applicant-safe explanations
- No legal-compliance badge or claim appears before B-06 approval

**Requirements:** R9, R10, H4, H9, H10
**Depends on:** B16 and approved privacy copy
**Size:** M

---

## Suggested order

```
Contracts: B1 → B2
Storage:   B3/B6 foundation → B13 school directory
                            → B14 profiles/households
                            → B12 support/disclosures
                            → B15 financial intake
RPC/test:  B7 → B8/B9/B10 → B11 generated types → B11B local adapter
Frontend:  F1 + F7 immediately against fixtures
           F2 stepper after B1
           F3/F4/F5/F6 local wiring after matching backend slices + B11B
           F8 integration tests; F9 after B16/privacy copy
Milestone B: B11A AWS adapter + B16/F9 live privacy controls
```

Backend and frontend can run in parallel almost immediately: your teammate
can build the **F2** stepper and sections once B1 fixtures land, using
`packages/test-fixtures` to mock RPC responses via **F1** until the database
sections/RPCs and request adapter are ready.

Milestone A ends when F8 passes against B11B. Milestone B work does not block
frontend development or local synthetic hookup.
