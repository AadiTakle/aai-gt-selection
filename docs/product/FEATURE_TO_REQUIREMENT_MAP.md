# Feature-to-Requirement Development Map

## Purpose

This living index gives contributors one development-facing map from every required product,
technical, governance, security, operations, and future-evaluation feature to the project
requirements it fulfills or advances. The current decomposition contains 124 mapped feature units.

It is derived from, and remains subordinate to, the canonical documents in `AGENTS.md` and
`PROJECT_CHARTER.md`. If this map conflicts with a higher-precedence document, follow the
higher-precedence document and update this map.

## How agents must use this map

Before implementing or materially changing a feature:

1. Find or add its feature ID below.
2. Cite the mapped R/H requirement IDs in the plan or handoff.
3. Confirm the scope and current-status label.
4. Read the listed source specification before changing behavior.
5. Define acceptance evidence that advances the feature beyond its current status.
6. Update this map when scope, status, blockers, or requirement coverage changes.

Do not interpret:

- `Contract/fixture ready` as database, RPC, or frontend implementation;
- `Scaffold only` as functional product behavior;
- `Specified/researched` as verified operation;
- a synthetic MVP result as live-policy validity or program-effect evidence; or
- an eligibility result as admission, an offer, funding, or allocation.

## Status and scope legend

### Current status

- **Governance verified** — the governance artifact exists and is approved for current use.
- **Implemented & verified** — runnable behavior exists with passing verification.
- **Built, not wired** — the code exists and its own tests pass, but no product surface reaches it,
  so no child or reviewer has ever exercised it.
- **Built, gate not cleared** — the behavior is implemented and passes its own tests, but the
  acceptance gate that would license what it outputs has not run or has not passed. This is **not**
  a synonym for verified, and a feature carrying it may not be reported as working.
- **Contract/fixture ready** — runtime schemas and fictional examples pass, but persistence,
  business logic, or UI may still be missing.
- **Scaffold only** — routes or infrastructure shells exist without functional behavior.
- **Specified/researched** — authoritative design or research exists; no complete executable cut.
- **Blocked** — external GT policy, authority, data, legal, staffing, or allocation input is needed.
- **Deferred** — explicitly outside the current MVP.

Where a feature's behavior rests on a decision that `docs/governance/DECISION_LOG.md` still records
as **Proposed**, the status cell names that decision and says so. Shipped code behind an unratified
decision is shipped code, but it is not a settled product direction, and the two must not be read as
the same thing.

### Scope

- **Governance** — contributor/process control rather than product runtime.
- **MVP** — required for the critic-ready synthetic product.
- **MVP-bounded** — demonstrated only with synthetic/stub behavior.
- **Future** — needed for full project or live-use requirements after the MVP.
- **Deferred** — explicitly excluded by a ratified scope decision.

## Requirement definitions and overall coverage

| ID | Requirement | Overall project status | Material gap |
|---|---|---|---|
| R1 | Support an actual student-selection decision with explicit population, inputs, rule, decision-maker, and output. | Specified; runtime incomplete | Routing/eligibility contracts exist; decision engine and database RPCs do not. |
| R2 | Create or preserve a credible counterfactual for selected students without GT. | Deferred | Requires randomized Track B offers or a defensible live quasi-experiment. |
| R3 | Define the causal question prospectively before observing outcomes. | Deferred | Requires a ratified preregistered protocol and independent evaluator. |
| R4 | Avoid circular selection and success measurement. | Partially specified | Admissions firewalls are specified; the future selection-to-outcome pipeline is not operational. |
| R5 | Preserve a defensible capability standard. | Specified pending validation | Synthetic thresholds and Snapshot anchors need GT confirmation and psychometric validation. |
| R6 | Measure growth without a gifted-student ceiling. | Deferred | MAP follow-up, upper-tail validation, attrition controls, and outcome collection are future work. |
| R7 | Make the process auditable and falsifiable. | Specified; runtime incomplete | Replay/audit contracts exist; canonicalization, storage, and executable replay do not. |
| R8 | Remain feasible under real GT constraints. | In progress | B-01–B-08 still gate policy, staffing, privacy, allocation, and evaluation feasibility. |
| R9 | Protect students and families. | Partially specified | Synthetic safeguards exist; legal consent, production data rights, and live controls do not. |
| R10 | Bound every conclusion. | Specified | End-to-end message and claim-register enforcement remain. |
| R11 | Provide a scalable, tunable, GT-validated screening instrument (giftedness + Timeback-fit). | Building (D-016); Stage 1 runnable end to end, Stage 2 playable but ungated | Born-synthetic two-phase instrument (AX-01–AX-22). Stage 1 serves, scores, persists, and replays a full battery; Stage 2 is playable and returns an honest ordinal readout that is `indeterminate` in practice. IRT parameters are synthetic/`validated=false`; no admit/defer/retry output exists (AX-06); Stage 2's acceptance gate has not run (AX-17); GT-data validation is RES-012. |
| H1 | Use broader, evidence-backed capability measures. | Specified pending validation | The Snapshot is specified; production anchors and validation are outstanding. |
| H2 | Separate capability from family advantage. | Specified | Database prohibited-field invariance and operational monitoring remain. |
| H3 | Prefer designs that address unobserved selection. | Deferred | No live offer randomization or quasi-experimental implementation exists. |
| H4 | Expand who can enter the candidate pool. | Specified | Functional accessible routes and live outreach are not implemented. |
| H5 | Use an independent evaluator. | Deferred | Auditor role/export design exists; no evaluator agreement or independence mechanism does. |
| H6 | Design for enough statistical information. | Deferred | Needs GT volume, a power plan, and a ratified cohort-pooling protocol. |
| H7 | Track equity and access as guardrails. | Partially specified | Metrics are researched; operational funnel and reviewer dashboards are absent. |
| H8 | Protect current high-performing students. | Not assessed | No approved guardrail, threshold, owner, or data-collection feature exists. |
| H9 | Make decisions explainable and contestable. | Specified; partial remedies | Correction contracts exist; explanation read RPC and substantive appeal do not. |
| H10 | Minimize gaming and family burden. | Specified | The 10–15 minute target still needs usability and burden testing. |

## Complete feature inventory

### Governance

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| GOV-01 | Canonical charter, requirements, and development rubric | R7, R8, R10 | Governance | Governance verified | Maintain document precedence when ratified decisions change. |
| GOV-02 | Traceability, assumptions, evidence, decisions, and scope-exception logs | R7, R8, R10, H9 | Governance | Governance verified | Synchronize implementation status as database and UI work lands. |
| GOV-03 | R1–R10 hard gates and H1–H10 concept scorecard | R1–R10, H1–H10 | Governance | Governance verified | Attach executable evidence to each gate before final approval. |
| GOV-04 | Adversarial critic-review protocol | R7, R10, H5, H9 | Governance | Governance verified | Run after end-to-end implementation and before merge readiness. |
| GOV-05 | Delivery roadmap, ownership, branches, and promotion rules | R7, R8, R10 | Governance | Governance verified | Preserve one-way promotion and contract-first coordination. |
| GOV-06 | External blocker and GT-information register | R8, R10 | Governance | Governance verified | GT owners must resolve B-01–B-08 for live claims. |
| GOV-07 | Versioned claim register | R7, R10, H5 | MVP-bounded | Specified/researched | Implement in the configuration/audit console and bind notices to claim versions. |
| GOV-08 | Acceptance-evidence matrix | R1, R4, R5, R7, R8, R9, R10, H1, H2, H4, H7, H9, H10 | MVP | Specified/researched | Implement the 25 critical tests and 12 end-to-end PRD acceptance checks. |

Canonical sources: `PROJECT_CHARTER.md`, `docs/product/project-requirements.md`,
`docs/governance/DEVELOPMENT_RUBRIC.md`, `docs/product/TRACEABILITY_MATRIX.md`,
`docs/research/ASSUMPTIONS_AND_EVIDENCE.md`, `docs/governance/DECISION_LOG.md`,
`docs/governance/SCOPE_EXCEPTION_LOG.md`, and `docs/governance/CRITIC_REVIEW_CHECKLIST.md`.

### Admissions product

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| F1.1 | Service and domain pathway registry | R1, R5, R8, R10, H1, H4, H7 | MVP-bounded | Specified/researched | Build registry tables/config UI; B-02 and B-04 block live domains and anchors. |
| F1.2 | Unsupported-domain and unavailable-service outcome | R5, R8, R10, H4 | MVP-bounded | Specified/researched | Add one synthetic unsupported domain and applicant-safe outcome. |
| F2.1 | Reusable student/household profile plus cycle application | R1, R7–R10, H2, H4, H7, H9, H10 | MVP | Backend implemented & verified | Build the family UI; B11A AWS/live binding remains Milestone B. |
| F2.2 | Accessible, multilingual, low-bandwidth, phone, and paper routes | R9, H4, H7, H10 | MVP | Intake backend implemented; UI/fulfillment pending | Support and language context round-trips privately; build accessible UI and operational fulfillment after B-06/WCAG decisions. |
| F2.3 | Applicant status, deadlines, and next steps | R9, R10, H9 | MVP | Backend and B11B implemented; UI pending | Full owner-only reload plus minimized status are callable through server actions; build the family status UI. |
| F2.4 | Versioned school directory and signed school snapshot | R7–R10, H2, H10 | MVP | Synthetic implementation verified; source blocked | Fictional active-list and immutable snapshot work; E-063 still blocks an authoritative GT directory. |
| F2.5 | Purpose-separated financial-aid intake | R7–R10, H2, H7, H9 | MVP (synthetic) | Synthetic implementation verified; policy blocked | Private income/count round-trip and noninterference are tested; B-08 blocks definitions, aid decisions, viewers, and proof. |
| F3.1 | Structured parent observable-evidence form | R5, R9, H1, H2, H9, H10 | MVP | Contract/fixture ready | Build the form and validate burden. |
| F3.2 | Bounded narrative fallback | R5, R9, H1, H2, H10 | MVP | Contract/fixture ready | Implement family UI and database fixture allowlisting. |
| F3.3 | Optional directly-observing adult evidence | R5, R9, H1, H2, H10 | MVP-bounded | Specified/researched | Clarify whether a separate recommender surface is needed. |
| F4.1 | Common direct-evidence and domain task hub | R5, H1, H4, H7, H10 | Deferred | Deferred | Explicitly disconnected from Track B eligibility in the four-week MVP. |
| F4.2 | Learning-response and transfer task measures | R5, H1, H4, H7 | Future | Specified/researched | Requires instrument design and validation. |
| F5.1 | Artifact provenance and assistance metadata | R5, R7, H2, H10 | MVP-bounded | Contract/fixture ready | Complete metadata UI and database storage. |
| F5.2 | Synthetic fixture evidence boundary | R7, R9, H10 | MVP | Contract/fixture ready | Enforce policy-bundle fixture allowlisting in the RPC. |
| F6.1 | Accommodation request, approval, and equivalent route | R5, R9, H4, H7, H9, H10 | MVP-bounded | Specified/researched | Implement private intake/fulfillment; B-06 remains. |
| F6.2 | Administration invalidation and protected recovery | R5, R9, H4, H7, H9 | MVP | Contract/fixture ready | Implement pending items, deadline pausing, and access-steward behavior. |
| F7.1 | Track A unchanged routing | R1, R4, R5, R7, R10 | MVP | Contract/fixture ready | Implement engine and TA-02/03/04/07 tests; B-01 blocks live policy. |
| F7.2 | Track B invitation rule | R1, R5, H1, H4 | MVP | Contract/fixture ready | Implement engine predicates/boundaries; B-03 blocks live thresholds. |
| F7.3 | Profile-preserving eligibility aggregation | R1, R5, R7, H1, H2 | MVP | Contract/fixture ready | Implement aggregation engine and final decision persistence. |
| F7.4 | Prohibited-input eligibility firewall | R4, R5, R7, H2, H10 | MVP | Specified/researched | Implement decision projection and PF-01 mutation-invariance tests. |
| F7.5 | Deterministic reasons and boundary uncertainty | R1, R5, R7, R10, H9 | MVP | Contract/fixture ready | Implement executable trace, canonical input, and decision persistence. |
| F7.6 | Eligibility-only `allocation_undecided` handoff | R10 | MVP | Specified/researched | Add downstream contract/persistence seam; B-08 blocks allocation. |
| F8.1 | Six-dimension anchored rubric and binary vote | R5, R7, H1, H2 | MVP | Contract/fixture ready | Implement rubric registry and review persistence; B-04 blocks live anchors. |
| F8.2 | Blind independent review and adjudication | R5, R7, H1, H2, H9 | MVP | Contract/fixture ready | Implement DB blindness, aggregation, and concurrency tests. |
| F8.3 | Reviewer calibration and severity monitoring | R5, R7, H1, H2 | MVP-bounded | Specified/researched | Synthetic demo only; production validation and B-05 remain. |
| F8.4 | Abstention and replacement workflow | R5, R7, R9, H9 | MVP | Contract/fixture ready | Implement atomic replacement and race tests. |
| F9.1 | Applicant decision explanation | R7, R9, R10, H9 | MVP | Specified/researched | Freeze explanation read contract, message catalog, and trace-clause tests. |
| F9.2 | Factual and provenance correction | R7, R9, H9 | MVP | Contract/fixture ready | Implement correction RPC, lineage constraints, and race tests. |
| F9.3 | Procedural cure | R7, R9, H9 | MVP | Contract/fixture ready | Implement conflict-cleared rerun/fresh-panel behavior and audit trace. |
| F9.4 | Substantive rubric appeal | R9, H9 | Deferred | Deferred | D-010 defers it; current contract returns `FEATURE_DISABLED`. |
| F9.5 | Retest and later-cycle re-entry | R5, R9, H4, H9 | Deferred | Deferred | Manual staff re-entry only; automation is deferred. |
| F10.1 | Consent and research-choice separation | R4, R7, R9, R10, H2, H7, H9, H10 | MVP-bounded | Specified/researched | Implement purpose-separated storage and noninterference tests. |
| F10.2 | Data-rights request intake | R9, H9 | MVP | Required by D-013 | Build B16/F9 synthetic access/correction/export/deletion workflow; B-06/E-038 still block legal/live claims. |
| F10.3 | Purpose limitation, retention, and disposition | R7, R9 | MVP-bounded | Required by D-013 | Implement synthetic field-purpose and deletion/disposition tests; production schedules remain blocked by B-06. |
| F11.1 | Admissions queues, deadlines, and SLA fail-safes | R7, R8, R9, H7, H9 | MVP-bounded | Specified/researched | Implement queue reads, deadline engine, and B-05 staffing rules. |
| F11.2 | Configuration and policy registry | R1, R7, R8, R10, H9 | MVP | Scaffold only | Build policy tables, seed, locking constraints, and UI. |
| F11.3 | Decision audit and replay console | R7, R10, H5, H9 | MVP | Contract/fixture ready | Implement executor, audit storage, read RPC, and console. |
| F11.4 | Compliance and evaluator exports | R7, R9, R10, H5 | Future | Specified/researched | Requires evaluator agreement and privacy review. |
| F11.5 | Incident, recovery, and correction propagation | R7, R8, R9, H9 | Future | Specified/researched | Production controls are outside the synthetic MVP. |

Primary sources: `docs/product/USER_STORY_FEATURE_MAP.md`,
`docs/product/GT_ADMISSIONS_APPLICATION_MVP_PRD.md`, and the backend research implementation contracts.

### User surfaces

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| UI-01 | Functional Family Portal: setup → CogAT handoff → routing → Snapshot → final result | R1, R5, R8–R10, H4, H7, H9, H10 | MVP | Backend integration ready; UI scaffold | B11B onboarding actions exist; build the six-stage page flow, in-app tasks/status, and Track A/Track B/final state views. The screener runner (AX-05) is playable and reachable from `/family/assessment`, but its result feeds no routing or eligibility decision. |
| UI-02 | Functional Admissions Operations Dashboard | R1, R5, R7–R9, H9 | MVP | Scaffold only | Build completeness/CogAT/pending/assignment queues and correction-rerun actions; no direct override or manual routing/release. |
| UI-03 | Functional blind Reviewer Workspace | R5, R7, H1, H2, H9 | MVP | Scaffold only | Build assigned queue/deadlines, blind evidence, rubric citations, draft/locked submit, abstain, and non-vote blocker actions. |
| UI-03S | Functional blind Review Supervisor Workspace | R5, R7, H1, H2, H9 | MVP | Scaffold only | Build slot-three queue and same blind rubric/submit controls; prohibit prior votes, override, calibration, and assignment management. |
| UI-04 | Configuration and Audit View | R7, R10, H5, H9 | Deferred functional UI | Placeholder only | D-014 defers this persona page; retain backend audit/replay controls and future feature-library scope. |
| UI-05 | Integration shell and persistent synthetic banner | R8, R9, R10 | MVP-bounded | Implemented & verified | Validate E-051/E-052 with the actual host; Mode A remains default. |

Primary sources: `apps/web/src/app/`, `apps/web/src/components/`, and
`docs/architecture/ARCHITECTURE_PLAN.md`.

### Backend and platform

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| BE-01 | Shared runtime-validated API contracts | R1, R5, R7, R9, R10, H9, H10 | MVP | Onboarding and screener contracts implemented & verified | Submitted responses require every D-013 section, all steps, coherent lineage, and exact safe status; profile lists have no invented cardinality cap. The adaptive-screener contracts are implemented and enforced against every shipped bank (AX-01). The Talent Evidence Snapshot and reviewer contracts remain fixture-only — do not read AX-01 as covering them. |
| BE-02 | Canonical synthetic fixture library | R7, R8, R10, H9 | MVP | Onboarding fixtures implemented & verified | Full, partial, `other`, multiple-profile, and response fixtures are ready for family UI tests. |
| BE-03 | Local Supabase/PostgreSQL environment | R7, R8, R9 | MVP | Milestone A implemented & verified | B11B exercises trusted local Auth → transaction-local GUC → RPC; AWS Aurora/Cognito remains Milestone B. |
| BE-04 | Private admissions/profile data model | R1, R4, R5, R7, R9, R10, H2, H9 | MVP | Onboarding and screener models implemented; review/decision/audit pending | Profile, directory, private context, and application snapshot storage exist, and so do the eight `app.exam_*` screener tables (AX-04). What remains is the Snapshot evidence, reviewer assignment, decision, correction, and audit storage — the term "assessment tables" previously used here meant those, and now reads as if the screener were unbuilt, so it is spelled out. |
| BE-05 | Hardened write RPCs | R1, R7, R9, R10, H9 | MVP | Milestone A writes implemented & verified | Profile save, application save, and submit are tested; later assessment/review/correction/replay writes remain. |
| BE-06 | Minimized read RPCs | R7, R9, R10, H9 | MVP | Milestone A reads implemented & verified | Profile read/list, school list, full application read, and status are tested; assigned-review and decision-explanation reads remain. |
| BE-07 | Locked synthetic policy bundle and typed rule AST | R1, R5, R7, R10 | MVP | Specified/researched | Create policy tables, seed, locking constraints, and read surface. |
| BE-08 | Pure deterministic decision engine | R1, R4, R5, R7, R10, H1, H2, H9 | MVP | Specified/researched | Implement offline engine plus unit/property tests. |
| BE-09 | Immutable successor versioning | R7, R9, H9 | MVP | Partially implemented | Application versions enforce append-only non-branching lineage; assessment, Snapshot, policy, and correction successors remain. |
| BE-10 | RFC 8785 canonicalization and SHA-256 commitments | R7, R10, H9 | MVP | Specified/researched | Implement canonical vectors and HASH-01 tests. |
| BE-11 | Truthful decision replay executor | R7, R10, H5, H9 | MVP | Contract/fixture ready | Implement retained-artifact loading, execution, comparison, and audit append. |
| BE-12 | Append-only hash-chained audit log | R7, R9 | MVP | Specified/researched | Implement append function, concurrency test, and tamper-limit disclosure. |
| BE-13 | Generated public database types | R7 | MVP | Implemented & verified | Types include the eight Milestone A RPCs and all ten `api.exam_*` RPCs; `pnpm db:types:check` compares generated output byte-for-byte against the committed file. Regenerate after every exposed API migration. |
| BE-14 | Applicant-safe status and message catalog | R10, H9 | MVP | Contract/fixture ready | Implement versioned templates and MSG-01/EX-02 mapping. |
| BE-15 | Decision projection allowlist | R4, R5, R7, R10, H2, H10 | MVP | Onboarding firewall seam verified; full engine pending | Exact grade-only keys plus projection commitment are invariant to all represented identity/household/language/school/support/disclosure/finance/referral/signature mutations. The deterministic result/hash probe is test-only; no eligibility result exists yet. |
| BE-16 | Frontend RPC adapters and server actions | R7, R9, R10 | MVP | B11B action path implemented & CI-verified | CI invokes all eight exported actions through local Auth, Next-compatible cookies, and the production server client; instrumentation validates B11B at bootstrap. B11A later swaps Cognito/Aurora binding without changing contracts. |

Primary sources: `docs/architecture/ARCHITECTURE_PLAN.md`,
`research/backend-admissions/PROVISIONAL_IMPLEMENTATION_CONTRACT.md`,
`research/backend-admissions/MVP_DATA_CONTRACT.md`, and `packages/`.

### Security and operations

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| SEC-01 | Admin-controlled role claims and seven-role authorization | R7, R9, H7, H9 | MVP | Family local binding verified; remaining roles pending | B11B rejects user metadata and binds the verified local JWT subject/admin metadata to GUCs; B11A Cognito and later role surfaces remain. |
| SEC-02 | Forced RLS on every private object | R7, R9 | MVP | Partially implemented | All onboarding tables and all eight `app.exam_*` tables force RLS with safe grants and definer ownership, and the screener's verifier functions are revoked from every client role (AX-22); the review, decision, correction, and audit objects still need policies and RLS-01 coverage. |
| SEC-03 | Database-enforced reviewer blindness | R5, R7, R9, H2 | MVP | Specified/researched | Implement read policies and READ-01. |
| SEC-04 | Service-role and elevated-key elimination | R7, R9 | MVP | Implemented & verified | Keep provisioning separate and add SR-01/SR-02 integration tests. |
| SEC-05 | Born-synthetic loopback fail-closed boundary | R9, R10 | MVP | Local bootstrap guard implemented & verified | Next instrumentation fails when either B11B setting is partial/unsafe and leaves ordinary disabled builds unaffected; AWS account/tag startup guard remains Milestone B. |
| SEC-06 | Idempotency, serializable transitions, and race safety | R7, R8, R9 | MVP | Onboarding concurrency verified; later workflows pending | Exact retries survive school-directory expiry; two independent authenticated sessions race save/submit with one winner and deterministic `STALE_VERSION`/`SUBMISSION_LOCKED`. Later assignment/finalization races remain. |
| SEC-07 | Purpose-separated private fields and field registry | R4, R7, R9, R10, H2 | MVP | Onboarding separation implemented; full registry pending | Profile and private-context purposes are physical/tested; full field registry and later admissions projections remain. |
| SEC-08 | Threat model and minimum security gate | R7, R9 | MVP | Milestone A gate verified; screener suites added | 21 pgTAP files cover grants, forced RLS, IDOR, allowlists, idempotency after directory expiry, immutable submission, snapshots, every D-013 firewall class, and the screener's answer-key firewall, verifier dispatch, outcome ownership and scorer-input hash parity. The last executed assertion total on record is 465 across 20 files (2026-07-25); running the suite needs a local Supabase and it was not re-run for this refresh, so treat the total as dated and the file list as current. The full admissions manifest remains. |
| SEC-09 | Merge-blocking CI/CD quality, database, and web-smoke gates | R7, R8, R9, R10 | MVP | Onboarding action integration is merge-blocking | Web-smoke CI creates local users then runs the exported-action happy path and owner isolation before build/security/Playwright; later D-014 stages remain. |
| SEC-10 | Production privacy, legal consent, retention, and incident controls | R8, R9 | Future | Blocked | B16 specifies technical preparation; B-06/E-038 still block live child data and legal-compliance claims. |
| OPS-01 | pnpm monorepo and package ownership boundaries | R7, R8, R10 | MVP | Implemented & verified | Five packages (`contracts`, `db-types`, `exam-engine`, `exam-scoring`, `test-fixtures`) plus `apps/web`. `pnpm boundaries:check` enforces the two rules that matter — no package may import the web app, and `contracts` may not import Supabase — against the module specifiers TypeScript's scanner reports rather than against a substring search, so a comment naming a forbidden path is not treated as a dependency on it. |
| OPS-02 | Host integration modes and brand theming | R8, R9, R10 | MVP-bounded | Specified/researched | Validate E-051/E-052 with the actual host. |

Primary sources: `research/backend-admissions/RLS_AND_AUTH_BLUEPRINT.md`,
`research/backend-admissions/MVP_THREAT_MODEL.md`,
`research/backend-admissions/CHILD_DATA_PRIVACY_AND_RETENTION.md`, and
`.github/workflows/ci.yml`.

### Adaptive screening instrument (R11 / D-016)

This is the largest active workstream and the one whose status is easiest to overstate, so it is
decomposed finely and every row says what has and has not been demonstrated. Three cautions apply
across the whole section:

1. **Everything is born-synthetic.** Every bank ships `syntheticOnly: true` and `validated: false`.
   Every figure quoted below is recovery under a simulated responder on an uncalibrated bank. None
   of it is evidence about a real child's ability, about score validity, reliability, or fairness.
2. **Most of the instrument's behavior rests on decisions that are still `Proposed`.** D-017 and
   D-019 through D-031 are all awaiting team-lead ratification. D-200 through D-205 are Approved
   with recorded owner sign-off. A row whose behavior depends on a Proposed decision says so.
3. **No question type is recorded as gate-passing.** Stage 2's acceptance gate (D-S2-3) requires
   real children and has not run.

#### Session structure and delivery

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| AX-01 | Assessment/session/telemetry contracts (`packages/contracts`) + demo `postMessage` embedding protocol | R11, R5, R7, R9, R10 | MVP-bounded | Implemented & verified | Zod schemas for bank/served/result items, sessions, telemetry, `SessionState`, `ExamPolicy` and the host↔demo message union; 153 contract tests. `bank-conformance.test.ts` parses every shipped bank against `bankItemSchema` on each run, which is what closed E-074's 0-of-63 backlog. Remaining: assessment-side contracts for the admissions Snapshot are separate and still fixture-only (BE-01). |
| AX-07 | Two-phase session structure: Phase 1 standing level, then Phase 2 novel learning block | R11, R5, R7, H6 | MVP-bounded | Implemented & verified; **D-030 is Proposed** | Every observation carries a server-added `stage: 'standing' \| 'learning'` that a client cannot set, so the learning fit reads block items only and every pre-existing trace stays valid. Both phases run in `apps/web/src/components/exam/exam-runner.tsx`: Phase 1 ends with its own result and hands over an explicit `pendingBlock` (settled standing plus items already served) that the family may start in a later sitting. Build plan §5.5 still says the block is unwired; that sentence is stale and should be corrected there. |
| AX-05 | Test-taker delivery surface (demo host + adaptive runner + results screen) | R11, R5, H4, H9 | MVP-bounded | Implemented & verified; **D-028 is Proposed** | Runner at `/family/exam` and `/dev/family-preview/exam` embeds 49 served demos over the AX-01 protocol; born-synthetic proctor-issued session, no PII. The per-child telemetry sidebar is hidden whenever a demo is framed (D-028, E-082), pinned by `telemetry-panel-gate.test.ts` against both source and published copies. Results screen shows per-area standing plus the Phase 2 ordinal band. `/family/exam` is behind the `family` role and is linked from `/family/assessment`; `/dev/family-preview/exam` is the unauthenticated equivalent. Remaining: the screener's result is stored and displayed but feeds nothing — no eligibility engine consumes it (F7.1–F7.3) and no decision output exists (AX-06). |

#### Stage 1 — locating a standing level per reasoning area

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| AX-02 | Adaptive engine (`packages/exam-engine`) — session state, area/type/item routing, update, stop rule | R11, R5, H6 | MVP-bounded | Implemented & verified | Per-area float difficulty on a 1–20 scale, variable-length battery, coverage- and stability-driven stop rule with a 40-item safety cap; 206 engine tests. D-016 named this one package `packages/cat-engine`; it is now `exam-engine` (routing) plus `exam-scoring` (scoring), which stay mutually independent. `apps/web/src/lib/exam/engine-config.ts` holds the browser's own configuration so offline verification runs the config the runner runs — before D-201 it did not, which is why bursting was demonstrated in simulation while never firing in a browser. |
| AX-08 | Live per-area belief + minimum-expected-posterior-variance item selection | R11, R4, R7, H3 | MVP-bounded | Implemented & verified; **D-204 Approved** | `posterior.ts` maintains a floor-aware 1PL belief on a quarter-point grid over the 1–20 scale, rebuilt from the stored trace on demand and never held in memory, so a session still replays exactly. `selectionRule` defaults to `mepv`; `mfi`, `cut` and `staircase` (the previous Levitt/Kesten rule, exactly) are retained as policy values. Measured over 60 sittings (E-204): reported standing bias +1.58 → +0.02, RMSE 2.35 → 1.25, sessions concluding on evidence 52/60 → 58/60. The cost is real and is not precision: mean final SE rises 1.235 → 1.286. |
| AX-09 | Uncertainty-ranked area choice and type-novelty preference | R4, R11, R7 | MVP-bounded | Implemented & verified; **D-204 Approved** | Among the areas tied for fewest items seen, the next item goes to the one whose belief is widest; `typeNoveltyBonus` is 0.5, paid out of slack rather than out of the estimate. `areaSpreadSlack` exists but ships at 0, so even spread is unchanged by construction. |
| AX-10 | Phase 1 chance-success floor on the standing fit | R5, R10, R11 | MVP-bounded | Implemented & verified; **D-204 Approved** | `AbilityFitOptions.guessing` / `AbilityBracketing.guessing` default to 0 for a caller that omits them and to 0.2 in `DEFAULT_ABILITY_BRACKETING`, so the shipped path is corrected while no existing caller moves silently. **Consequence that must travel with any exported number: every standing level produced before 2026-07-31 is inflated by roughly 1.5 scale points.** Levels either side of that date are not comparable and must not be pooled or trended. The floor is pinned in both directions — applied to a non-guessing child it attenuates them — because assuming it wrongly is harmful either way. |
| AX-11 | Burst delivery and the tracked-coverage cap | R11, R9, R10, R7 | MVP-bounded | Implemented & verified; **D-201 Approved** | Consecutive items within one type reuse a single instruction; eligibility is a claim about item shape (bounded option count, no pacing field) rather than about speed, because no per-type response-time data exists. Tracked-inert metric shortfalls are capped at `trackedCoverageCap`; enforced shortfalls still sum. `minTypesPerArea` (2) stops a burst handing an area to one type; `roundHeadroom` bounds burst length. Measured (E-201): 26.9 → 15.6 instruction screens per session, 42% fewer, with the session no longer than before (24.0 items against 26.9) and no child reaching the safety cap. The cost is the same coin: distinct types met falls 4.3 → 3.2 per area, so any research question needing tracked process metrics at volume now needs its own quota. |
| AX-12 | Per-session seed and randomesque exposure control | R11, R4, R7 | MVP-bounded | Implemented & verified; **D-202 and D-203 Approved** | The engine seed was the constant `0xc0ffee` and nothing overrode it, so every child replayed one sequence; the runner now draws a 32-bit seed per sitting from the platform CSPRNG and records it, so variety is across children and determinism is within one. Type and item choice draw from the near-optimal set (`typeSelectionTolerance` 0.5, which must stay strictly below `trackedCoverageCap`; `itemSelectionTolerance` 0.25, which must stay strictly below `ageBandBias`), plus a recency discount that does not apply while an area is still homing. **Open and unresolved:** the combination reaches the 40-item safety cap in 15 of 80 sittings against 10 for AX-11 alone (E-203). |
| AX-13 | Stage 1's objective is a locator, not a gate | R11, R5, R7, R10, H6 | MVP-bounded | Recorded objective; **D-205 Approved**; no code change | Stage 1 estimates ability per reasoning area so Stage 2 can be scaled from it, so selection optimises precision across the whole scale rather than speed to an above/below call: `selectionRule: 'mepv'` and `decisionCut: null`. `cut` selection is retained as a priced policy value, not deleted. **What this forecloses, stated plainly: the shorter test** — a gate reaches a call in ≈2.3 items per area against 3.0. Reverting needs a `decisionCut` set by someone with authority to set a threshold, and arrives with arm four's costs (estimate unusable away from the cut, exposure control down to about a fifth of the bank). |

#### Stage 2 — the novel learning block

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| AX-14 | Novel-block administration, learning-curve estimator, and ordinal readout | R6, R11, R7, R10, H6 | MVP-bounded | Implemented & verified as code; **D-030 is Proposed** | Administration in `packages/exam-engine/src/learning-block.ts`, estimation in `packages/exam-scoring/src/learning-curve.ts`, readout in `learning-rate-readout.ts`, all wired through `apps/web/src/lib/exam/phase2.ts` into the runner. One area for every child (fluid reasoning), one type, ~30 items Phase 1 never served. The readout returns `below \| typical \| above \| indeterminate`; the results screen renders `indeterminate` as "Not enough to tell yet". **`indeterminate` is the expected answer, not a defect** — see AX-15 for why. Neither figure enters `scoreExam`. |
| AX-15 | Phase 2 chance-success floor and the required contamination floor | R9, R10, R7 | MVP-bounded | Implemented & verified; **D-200 Approved** | `estimateLearningCurve` defaults its lower asymptote to 0.2 rather than 0, correcting the reported fit and the difficulty targeting together, and `LearningRateReference.contaminationFloor` is a required field tested against posterior SE plus that floor. **The headline is a negative result and must not be read as a fix that restored the measurement:** before the correction a cohort that learned nothing fitted λ̄ = 0.0398 and was called `above` average pace 32.8% of the time. After it, a 30-item block on the wired bank is `indeterminate` for 94.5% of children against the widest reference anyone has proposed, and 100% against the SD-0.03 reference this project's own synthetic work used, at every length from 30 to 60 (E-200). **No absolute learning rate is reportable.** `learningRateCohortRank` — ordinal, within a cohort measured the same way — is the supported question. |
| AX-16 | `FLU-OPCHAIN-01` — the purpose-built Stage 2 type | R6, R5, R11, H1 | MVP-bounded | **Built, gate not cleared** | Spec, generator with a `systemPersistence: 'consistent' \| 'perTrial'` mode, independent checker, renderer, app-tier verifier and plpgsql twin are all on `dev` (STAGE2_QUESTION_DESIGN §9.2 units U2–U7), so the block is playable end to end. One renderer serves both arms, with no arm branch in it. The scrambled control bank lives outside the served directory and both the sync script and the bank loader refuse a copy that lands back in it. Two defects were found by verifying rather than assuming and fixed here: the key was recoverable from `content` alone on 11 of 234 items, and the interface gate handed over to the scored trial without repainting. **Playable is not shippable — see AX-17.** |
| AX-17 | The scrambled-system control: Gate A and Gate B | R6, R5, R7, R10, R9 | MVP-bounded | **Built, gate not cleared**; **D-S2-3 has no `DECISION_LOG` entry** | D-S2-3 makes beating the type's own scrambled control a binding acceptance criterion. **Gate A's A1 static-child null check FAILS on `FLU-OPCHAIN-01` in both modes at 30 trials** (λ̄ = 0.0096 ± 0.0033 against a condition of \|λ̄\| ≤ 2 SE). It fails identically on `FLU-MATRIX-01` and on a bank-free ideal grid, so it indicts the estimator-plus-loop rather than the bank — but §9.4's stop rule was written assuming A1 failure indicts the bank, and whether it should fire anyway is an unresolved owner call. **Gate B has not run and there is no route to running it:** it needs ≈128 children (64/arm), U1's pre-registration artifact and U8's readiness pack are not built, and NQ-1/NQ-2 (what consent, and whether an ungated type may be served to collect the data) are open. |
| AX-18 | Stage 2 types 2–4 — `QUANT-GLYPHNUM-01`, `VER-MORPHO-01`, `SPA-XFORM-01` | R6, R5, H1 | MVP-bounded | Specified/researched | Designed in STAGE2_QUESTION_DESIGN §3.2–§3.4; nothing is built on `dev`. Under §7's stop rule they do not start until `FLU-OPCHAIN-01` reaches U8, and do not start at all if Gate B returns Verdict 3 or 4 — replicating a broken schema three times buys nothing. D-S2-1 locked the block to fluid reasoning, so these are coverage, insurance, and the instrument for the domain-generality question rather than operationally urgent. |

#### Item bank and question types

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| AX-03 | Question-type banks, generators, checkers, and renderer demos | R11, R5, H1, H10 | MVP-bounded | Implemented & verified | 50 banks totalling 5,992 items on disk; **49 types wired and served** (fluid reasoning 12, quantitative 8, spatial 18, verbal 11). `scripts/sync-exam-demos.mjs` generates `registry.generated.ts`, the single source for the served pool, the submit dispatch and the runner's metadata. Two independent gates decide servability and must stay independent: a type needs a verifier **and** must be absent from `qa/NOT_SERVABLE.json`; `CX-achieve-02` stays blocked on a proven response-model leak (E-076). Known gap, pinned by a test so it cannot widen silently: no wired spatial bank targets K-1. Catalog re-orientation toward the Timeback-fit target is RES-013. |
| AX-19 | Retirement of 17 question types, and its metric-supply consequences | R5, R7, R8, R10 | MVP-bounded | Implemented & verified; **D-031 is Proposed** | `QUESTION_IMPROVEMENT_PLAN.md` §5 retires 17 types on construct grounds; 15 were live removals, since `CX-diverge-01` and `CX-figural-01` were never banked. Migration `20260729190000_exam_verify_retire_types.sql` deleted the eight stale verifier-registry rows whose `ported_from` named app-tier code that no longer exists. **The consequence is a real reduction and should be read as one:** the retired banks were quantitative's only suppliers of `M-PAE` and `M-REV`, and an enforced metric with no supplier can never reach `minSamples`, so it pinned every battery to the safety cap. Both are now `enforced: false` in quantitative (D-031), which means quantitative coverage is checked against a smaller enforced set. Spatial lost both its Stage 2 types. Re-enforcement triggers are named in `config.ts`. |

#### Scoring

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| AX-20 | Deterministic scorer, metric registry, and tunable policy (`packages/exam-scoring`) | R11, R5, R7, R10 | MVP-bounded | Implemented & verified; **D-022, D-024 and D-029 are Proposed** | Accuracy sets the bracket, metrics position within it, output is per-area θ on the 1–20 scale plus a composite and a profile, with **no decision label** and every weight in a tunable `ExamPolicy`; 130 tests. **Open product defect, unresolved:** bracketing on accuracy does not separate ability, because a converged adaptive battery holds every child near the same accuracy by construction — the information is in the difficulty reached and the scorer discards it. D-024 offers a difficulty-adjusted bracket driver as a non-default policy mode so nothing is ratified silently; the default is unchanged and the owner decision is outstanding. |
| AX-21 | Scoring as a standalone function + canonical scorer-input hash | R7, R10, H5, R11 | MVP-bounded | Built, not wired; **D-019 is Proposed** | `packages/exam-scoring/src/lambda/` holds a handler that validates, scores, and returns a fingerprint of exactly what was scored, and deliberately does not read the database — which items are authoritative is the caller's already-made decision. Hash parity with Postgres is pinned by pgTAP `140_exam_scorer_input_hash_parity`. `infra/lambda.tf` exists; nothing is deployed, and deployment sits behind Milestone B alongside B11A. |

#### Storage, integrity, and output

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| AX-04 | Session/response/telemetry/outcome data model + `api.exam_*` RPCs + forced RLS | R11, R7, R9 | MVP-bounded | Implemented & verified; **D-026 is Proposed** | Eight `app.exam_*` tables (policy, question type, item, participant, session, item response, telemetry event, session outcome) with forced RLS, server-only answer keys, structured metric maps and an append-only telemetry trace, behind ten `api.exam_*` SECURITY DEFINER RPCs. Served bank items are registered on demand, because the seed migration's placeholders were disjoint from the real banks. Persistence is opt-in per environment and every write is best-effort, so an unreachable database degrades to in-memory rather than failing a child's exam. |
| AX-22 | Answer-key firewall and the database-as-correctness-authority | R7, R9, R5, R10 | MVP-bounded | Implemented & verified; **D-027 is Proposed** | Four independent layers. (1) `ServedItem` is `BankItem` minus `answer`/`scoring`/`provenance`/`demoPath`; `served-boundary.test.ts` asserts it at the loader and across every published demo file. (2) The database owns per-item correctness — `app.exam_verify_response` dispatches to a per-type plpgsql verifier, and every verifier function is revoked from `public`, `anon`, `authenticated` and `service_role` and granted only to `api_executor`, because any role that can call a verifier can walk the key out one query at a time. (3) `pnpm exam:verify:diff` runs the cross-tier differential and marks an unported type PENDING rather than passing it. (4) `pnpm exam:reconcile` re-verifies, re-hashes and re-scores a persisted session, and exits non-zero when a recorded score cannot be derived from the evidence stored beside it — the gate installed after `/api/exam-results` was found scoring the trace the *client* posted (E-084). pgTAP `121_exam_answer_key_firewall` was validated against a deliberate leak. |
| AX-06 | Screener decision output (admit / defer / retry) with a tunable cut | R11, R1, R5, R10 | MVP-bounded | Specified/researched — **not implemented** | `scoreExam` emits no decision label, deliberately and by test: `scorer.test.ts` and `scorer-ability.test.ts` both assert the string does not appear anywhere in the output. A tunable GT-owned cut over per-domain θ plus a fit index has been specified and not built. D-205 confirms this cut is a different thing from Stage 1's selection target and stays GT's to set; R10's boundary (screening is not program impact) holds; validation against GT data is RES-012 and is blocked on data delivery. |

Primary sources: `docs/governance/DECISION_LOG.md` (D-016, D-019, D-022–D-031, D-200–D-205),
`docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md`, `docs/architecture/EXAM_ADAPTIVE_STATUS.md`,
`docs/product/STAGE2_QUESTION_DESIGN.md`, `docs/product/STAGE2_BANK_RECOVERY_MEASUREMENT.md`,
`docs/product/EXAM_BURST_INSTRUCTION_COST.md`, `docs/product/EXAM_SELECTION_INTEGRATION.md`,
`docs/product/QUESTION_IMPROVEMENT_PLAN.md`, `research/exam-question-types/`, and the
`packages/exam-engine` + `packages/exam-scoring` + `apps/web/src/lib/exam` + `supabase/migrations`
implementation.

**Governance debt carried by this section.** STAGE2_QUESTION_DESIGN §9.3's unit U9 is outstanding:
D-S2-1 through D-S2-4 are recorded as owner decisions in that document's §10.1 but have **no
`DECISION_LOG.md` entry**, and the Gate A measurements in `STAGE2_BANK_RECOVERY_MEASUREMENT.md`
deliberately mint no `E-` ID pending the owner's response. Assumptions A-S2-1 through A-S2-6 are
listed in that document rather than in `ASSUMPTIONS_AND_EVIDENCE.md`. Until U9 lands, the canonical
registers under-describe Stage 2.

### Evaluation and future live-use features

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| EV-01 | Randomized Track B offer allocation | R2, R3, R8, R9, R10, H3, H6 | Future | Blocked | B-08, real scarcity, allocation authority, and oversight are required. |
| EV-02 | Prospective preregistered causal protocol | R3, R7, R10, H5 | Future | Deferred | Requires independent evaluator approval and GT operational details. |
| EV-03 | Three-wave high-ceiling MAP outcome pipeline | R4, R6, R8, R9, H6 | Future | Blocked | B-08 logistics, upper-tail checks, consistency, and missingness plan. |
| EV-04 | Non-offered participant fee-waiver incentive | R8, R9, H4, H10 | Future | Blocked | B-08 must define amount, eligibility, communication, and burden. |
| EV-05 | Post-assignment resource-use questionnaire | R4, R6, R9, H2, H3, H10 | Future | Deferred | Specify a 2–3 minute instrument and evaluator-only storage. |
| EV-06 | Multi-cohort pooling and sequential precision | R2, R3, R6, R7, R10, H5, H6 | Future | Specified/researched | Define target weights, drift rules, and analyst protocol. |
| EV-07 | Track A/Track B service-fit noninferiority | R4, R5, R6, R10, H6, H8 | Future | Specified/researched | Prespecify margin, power, outcome, and guardrails. |
| EV-08 | Independent evaluator agreement | R2, R3, R7, R10, H5 | Future | Blocked | Resolve E-011 and grant protocol/data/publication independence. |
| EV-09 | Evaluator export packages | R7, R9, R10, H5 | Future | Specified/researched | Implement after evaluator and privacy governance are approved. |
| EV-10 | Power and precision planning | R2, R3, R6, R8, R10, H6 | Future | Blocked | Requires applicant/offer volume and finalized assignment assumptions. |
| EV-11 | Equity and access funnel monitoring | R5, R8, R9, H2, H4, H7 | Future | Specified/researched | Define data, denominators, privacy, thresholds, and owners. |
| EV-12 | Current high-performer harm guardrails | R6, R8, R9, R10, H8 | Future | Blocked | H8 needs metrics, thresholds, owners, and stop rules. |
| EV-13 | Track A cutoff regression-discontinuity audit | R2, R3, R7, R10, H3 | Future | Specified/researched | Requires live policy and validity diagnostics. |
| EV-14 | Production rubric and rater validation | R5, R7, H1, H2, H7 | Future | Blocked | B-04/B-05 and adequate validation samples are required. |
| EV-15 | Artifact/narrative route-equivalence validation | R5, R7, R9, H1, H2, H7 | Future | Blocked | E-026 needs matched cases and sufficient samples. |
| EV-16 | Seat allocation, offers, waitlist, and ranking policy | R1, R8, R9, R10, H2, H4 | Future | Blocked | B-08 is unresolved; MVP remains `allocation_undecided`. |
| EV-17 | Financial-aid intake and policy | R8, R9, H2, H4 | Future | Blocked | B-08 blocks aid fields, documents, and policy. |
| EV-18 | Real artifact upload and storage | R8, R9, H10 | Future | Blocked | B-07; MVP accepts only synthetic references. |
| EV-19 | Production live-data deployment | R8, R9, R10 | Future | Blocked | Outside the capstone unless separately approved; B-06 remains. |
| EV-20 | Program drift, fidelity, mechanism, and economic evaluation | R2, R6, R7, R8, R10, H5, H6, H8 | Future | Specified/researched | Requires analyst protocol and longitudinal operational metadata. |
| EV-21 | Program-effect and 2.6x growth-multiple reporting | R2, R3, R4, R6, R7, R10, H3, H5, H6 | Future | Specified/researched | Report only after credible Stage 1 causal evidence; MVP proves no effect. |

Primary sources: D-010, `docs/product/GT_ADMISSIONS_APPLICATION_MVP_PRD.md` § Future Evaluation
Handoff, `research/backend-admissions/OUTCOME_AND_FALSIFICATION_PLAN.md`,
`research/backend-admissions/SIMULATION_SPECIFICATION.md`, and the BrainLift.

## External blockers for live use

| ID | GT/external input needed | Blocks | Synthetic placeholder |
|---|---|---|---|
| B-01 | Current Track A workflow, CogAT form/cutoff, retest, and correction policy | Track A live-policy claims | Fictional versioned Track A rule |
| B-02 | Actual ages, grades, services, and pathway constraints | Live pathway registry | Grades 3–8 synthetic example |
| B-03 | Track B promising band and battery-profile rule | Live Track B invitation | Fictional band/profile |
| B-04 | Talent domains, rubric anchors, and passing rules | Live Snapshot eligibility | Math/STEM and music fixtures |
| B-05 | Reviewer staffing and training capacity | Production review operations and SLA | Simulated reviewer accounts |
| B-06 | Privacy, consent, data rights, and deployment rules | Live child data or production use | Born-synthetic local-only mode |
| B-07 | Real artifact upload/storage policy | File uploads | Fixed synthetic fixture references |
| B-08 | Allocation; financial definitions/authority, aid separation, and post-admission W-2 trigger/retention; MAP logistics; fee waiver; evaluator access | Aid decisions/proof, offers, and program-effect evaluation | Synthetic household income/count only; no documents; `allocation_undecided` |

## Current implementation snapshot

As of 2026-08-02 on `dev` @ `f1fe857`.

**Admissions onboarding (Milestone A).** The eight family API contracts, generated types, and B11B
server actions are implemented. Reusable profiles, fictional school versions, private
support/disclosure and finance context, immutable application snapshots, owner-only reload,
save/submit/status, and forced-RLS isolation all work and are tested.

**Adaptive screener (R11).** This is where nearly all work since 2026-07-20 has gone, and the
honest summary is *runnable, not validated*:

- **Stage 1 runs end to end.** A child gets a variable-length adaptive battery drawn per session
  from 49 wired question types, selected on a live per-area belief with a chance-success floor
  (D-204/D-205, both Approved), persisted through ten `api.exam_*` RPCs, verified by the database,
  and re-derivable from the stored trace by `pnpm exam:reconcile`.
- **Stage 2 is playable and has not cleared its acceptance gate.** The block administers, fits, and
  reports; Gate A's static-child null check fails on the type it would serve, and Gate B needs
  ≈128 real children the project has no route to. **No question type is gate-passing.**
- **The learning-rate readout returns `indeterminate` in practice, and that is correct behavior.**
  With the guessing floor corrected and the residual contamination declared, a 30-item block does
  not support a reportable rate on the bank it would run on.
- **No admit/defer/retry output exists** and none is planned before RES-012.
- Every standing level produced before 2026-07-31 is inflated by ≈1.5 scale points and is not
  comparable with anything produced after.

**Verification passing at this refresh:** 919 unit tests — 153 contracts, 206 exam-engine, 130
exam-scoring, 18 fixtures, 404 web, 8 root scripts — plus `format:check`, `lint`, `typecheck`,
`boundaries:check` and `governance:ids --strict`. The pgTAP suite, the live integration tests, and
Playwright need a local Supabase and were not re-run for this refresh; the last recorded pgTAP
result is 465 assertions across 20 files on 2026-07-25, and there are now 21 files.

**Not implemented.** The Snapshot evidence, reviewer, decision, correction, and audit tables and
RPCs; AWS request binding; the deterministic decision engine; RFC 8785 canonicalization; the replay
executor; the D-014 family/admissions/reviewer/supervisor functional surfaces; the critical 25-test
manifest and the PRD end-to-end acceptance checks.

**Still future or deferred.** Causal and evaluation requirements R2, R3, R6, H3, H5, H6, and H8.

**Governance state to be aware of.** D-200 through D-205 are Approved with recorded owner sign-off.
D-017 and D-019 through D-031 — which between them authorise the bank contract, the metric registry,
the bracketing schedule, persistence, database correctness authority, the telemetry gate, the
two-phase structure, and the quantitative metric enforcement — are all still **Proposed**.
Substantial shipped behavior therefore rests on unratified decisions, and STAGE2_QUESTION_DESIGN's
D-S2-1 through D-S2-4 have no `DECISION_LOG.md` entry at all.

## Maintenance rules

**How this file is kept current: the pull request that changes the behavior updates the row, in the
same pull request.** This index went eleven days and roughly forty merges without an update, during
which it went on describing the screener's storage as unbuilt and gave the largest workstream in the
repository six rows. It rotted because updating it was nobody's step. It is now the last item of the
`AGENTS.md` completion handoff: before claiming a substantive change complete, re-read the rows it
touches and correct them against the code, not against what another document says. A reviewer should
treat an unchanged status field on a behavior-changing pull request as an incomplete change, and the
`Current implementation snapshot` above must be re-dated whenever it is re-checked.

Update a row when:

- a feature changes status — including when it becomes built but unwired, or built but ungated;
- a requirement mapping changes;
- a blocker is resolved or added;
- a feature moves into or out of scope;
- acceptance evidence becomes executable, or an acceptance gate is run and its verdict is known;
- a decision this file cites moves between `Proposed` and `Approved`; or
- a ratified decision changes the product or evaluation design.

Verify a status against the code before writing it. Every wrong status in the 2026-07-20 revision
was wrong in the generous direction, and the failure mode is always the same: a field copied forward
because nobody re-checked it.

Do not add an implementation feature without at least one R/H requirement mapping. If work cannot
map to a requirement, stop under the `AGENTS.md` workflow and ask for direction.
