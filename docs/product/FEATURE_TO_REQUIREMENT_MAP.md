# Feature-to-Requirement Development Map

## Purpose

This living index gives contributors one development-facing map from every required product,
technical, governance, security, operations, and future-evaluation feature to the project
requirements it fulfills or advances. The current decomposition contains 99 mapped feature units.

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
- **Contract/fixture ready** — runtime schemas and fictional examples pass, but persistence,
  business logic, or UI may still be missing.
- **Scaffold only** — routes or infrastructure shells exist without functional behavior.
- **Specified/researched** — authoritative design or research exists; no complete executable cut.
- **Blocked** — external GT policy, authority, data, legal, staffing, or allocation input is needed.
- **Deferred** — explicitly outside the current MVP.

### Scope

- **Governance** — contributor/process control rather than product runtime.
- **MVP** — required for the critic-ready synthetic product.
- **MVP-bounded** — demonstrated only with synthetic/stub behavior.
- **Future** — needed for full project or live-use requirements after the MVP.
- **Deferred** — explicitly excluded by a ratified scope decision.
- **Screener-supporting** — retained only to the extent the screener depends on it; further build-out beyond that need is out of scope (D-400).
- **Out of scope (D-400)** — no further investment authorized. Existing code is **not** deleted and keeps working; code removal would be a separate decision.

## Scope boundary under D-400

D-400 makes the screener the binding aim and stops the project building a complete
admissions application, because GT already operates one and asked for the test to be
integrated into it (E-401). A feature stays in scope only if the screener cannot be
delivered, validated, tuned, embedded, or defended without it — or if R9 or R10
require it regardless.

The per-row `Scope` column below is **deliberately not rewritten**; this section is
authoritative where the two disagree, and rewriting 99 rows during a governance
rescope would obscure the change rather than clarify it. Full reasoning and the
contested calls: `docs/governance/RESCOPE_ANALYSIS_2026-07-30.md` §8.

**In scope — the instrument.** `AX-01`–`AX-06`; `GOV-01`–`GOV-08`; `UI-05`
(the integration seam into GT's portal, now one of the more important surfaces);
`BE-09`–`BE-13` (versioning, canonicalization, replay, audit chain, generated types
— these are R7, and a screener whose scoring cannot be reconstructed cannot be
defended to GT); `SEC-01`–`SEC-09`; `OPS-01`.

**Screener-supporting — retained, scoped to what the instrument needs.** `UI-01`
(get a child into a session and return a result; **not** the six-stage D-014
journey); `UI-02` (parameter/cut tuning and the validation view — the "let your
admissions team tune the parameters" deliverable; **not** completeness, assignment,
or correction-rerun queues); `F7.1` and `F7.5` (the screener's own admit / defer /
retry output and its reasons; **not** dual-track eligibility aggregation); `F6.1`
and `F6.2` (test accommodations and invalid-administration recovery — R9 is Required
and the admissions director raised the noisy-testing-room case herself); `F9.1` and
`F9.2` (explaining and correcting a **screener result**); `F10.1` and `F10.3`
(consent separation and retention for screener data); `F11.2` and `F11.3` (screener
parameter versioning, cut locking, session replay); `BE-01`–`BE-08` and
`BE-14`–`BE-16` (the screener-serving subset only).

**Out of scope (D-400) — the application GT already has.** `F2.1`–`F2.5`;
`F3.1`–`F3.3`; `F4.1`, `F4.2`; `F5.1`, `F5.2`; `F7.2`, `F7.3`, `F7.4`, `F7.6`;
`F8.1`–`F8.4`; `F9.3`, `F9.4`, `F9.5`; `F10.2`; `F11.1`, `F11.4`, `F11.5`;
`UI-03`, `UI-03S`, `UI-04`; `OPS-02`; and `EV-01`–`EV-21`, the whole evaluation
block, which now sits under the non-binding arm. `EV-13` (Track A cutoff
regression-discontinuity audit) is the most promising survivor there, because the
screener's own locked cut supplies the discontinuity it needs.

Four of these are genuine judgement calls rather than mechanical consequences and
are flagged for owner review: the `F8.x` reviewer-panel removal, the `F7.2` Track B
treatment, the `F2.5`/`F10.2` finance and data-rights split, and whether `UI-01`
should be screener-supporting or out of scope. See the analysis §8.4.

## Requirement definitions and overall coverage

| ID | Requirement | Overall project status | Material gap |
|---|---|---|---|
| R1 | Support an actual student-selection decision with explicit population, inputs, rule, decision-maker, and output. | Specified; runtime incomplete | Routing/eligibility contracts exist; decision engine and database RPCs do not. |
| R2 | Create or preserve a credible counterfactual for selected students without GT. | Non-binding (D-400) | Randomized Track B offers need seat scarcity GT does not currently have (E-400). The regression-discontinuity route, EV-13, is the open one. |
| R3 | Define the causal question prospectively before observing outcomes. | Non-binding (D-400) | No protocol is owed unless a program-effect claim is contemplated; it must then precede any observed result. |
| R4 | Avoid circular selection and success measurement. | Partially specified | Admissions firewalls are specified; the future selection-to-outcome pipeline is not operational. |
| R5 | Preserve a defensible capability standard. | Specified pending validation | Synthetic thresholds and Snapshot anchors need GT confirmation and psychometric validation. |
| R6 | Measure growth without a gifted-student ceiling. | Non-binding (D-400) | No outcome window exists inside the capstone (E-403). The ceiling concern itself transfers to the screener, where R11 and H1 carry it. |
| R7 | Make the process auditable and falsifiable. | Specified; runtime incomplete | Replay/audit contracts exist; canonicalization, storage, and executable replay do not. |
| R8 | Remain feasible under real GT constraints. | In progress | B-01–B-08 still gate policy, staffing, privacy, allocation, and evaluation feasibility. |
| R9 | Protect students and families. | Partially specified | Synthetic safeguards exist; legal consent, production data rights, and live controls do not. |
| R10 | Bound every conclusion. | Specified | End-to-end message and claim-register enforcement remain. |
| R11 | Provide a scalable, tunable, GT-validated screening instrument (giftedness + Timeback-fit). | Building (D-016) | Born-synthetic adaptive test instrument under construction (AX-01–AX-06); IRT params synthetic/`validated=false`; GT-data validation is RES-012. |
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
| UI-01 | Functional Family Portal: setup → CogAT handoff → routing → Snapshot → final result | R1, R5, R8–R10, H4, H7, H9, H10 | MVP | Backend integration ready; UI scaffold | B11B onboarding actions exist; build the six-stage page flow, in-app tasks/status, and Track A/Track B/final state views. |
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
| BE-01 | Shared runtime-validated API contracts | R1, R5, R7, R9, R10, H9, H10 | MVP | Onboarding contracts implemented & verified | Submitted responses require every D-013 section, all steps, coherent lineage, and exact safe status; profile lists have no invented cardinality cap. Assessment/review contracts remain fixture-only. |
| BE-02 | Canonical synthetic fixture library | R7, R8, R10, H9 | MVP | Onboarding fixtures implemented & verified | Full, partial, `other`, multiple-profile, and response fixtures are ready for family UI tests. |
| BE-03 | Local Supabase/PostgreSQL environment | R7, R8, R9 | MVP | Milestone A implemented & verified | B11B exercises trusted local Auth → transaction-local GUC → RPC; AWS Aurora/Cognito remains Milestone B. |
| BE-04 | Private admissions/profile data model | R1, R4, R5, R7, R9, R10, H2, H9 | MVP | Onboarding model implemented; later admissions pending | Profile, directory, private context, and application snapshot storage exist; assessment through audit tables remain. |
| BE-05 | Hardened write RPCs | R1, R7, R9, R10, H9 | MVP | Milestone A writes implemented & verified | Profile save, application save, and submit are tested; later assessment/review/correction/replay writes remain. |
| BE-06 | Minimized read RPCs | R7, R9, R10, H9 | MVP | Milestone A reads implemented & verified | Profile read/list, school list, full application read, and status are tested; assigned-review and decision-explanation reads remain. |
| BE-07 | Locked synthetic policy bundle and typed rule AST | R1, R5, R7, R10 | MVP | Specified/researched | Create policy tables, seed, locking constraints, and read surface. |
| BE-08 | Pure deterministic decision engine | R1, R4, R5, R7, R10, H1, H2, H9 | MVP | Specified/researched | Implement offline engine plus unit/property tests. |
| BE-09 | Immutable successor versioning | R7, R9, H9 | MVP | Partially implemented | Application versions enforce append-only non-branching lineage; assessment, Snapshot, policy, and correction successors remain. |
| BE-10 | RFC 8785 canonicalization and SHA-256 commitments | R7, R10, H9 | MVP | Specified/researched | Implement canonical vectors and HASH-01 tests. |
| BE-11 | Truthful decision replay executor | R7, R10, H5, H9 | MVP | Contract/fixture ready | Implement retained-artifact loading, execution, comparison, and audit append. |
| BE-12 | Append-only hash-chained audit log | R7, R9 | MVP | Specified/researched | Implement append function, concurrency test, and tamper-limit disclosure. |
| BE-13 | Generated public database types | R7 | MVP | Implemented & verified | Types include all eight Milestone A RPCs; regenerate after every exposed API migration. |
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
| SEC-02 | Forced RLS on every private object | R7, R9 | MVP | Partially implemented | All onboarding tables force RLS with safe grants/definer ownership; future private objects still need policies and RLS-01 coverage. |
| SEC-03 | Database-enforced reviewer blindness | R5, R7, R9, H2 | MVP | Specified/researched | Implement read policies and READ-01. |
| SEC-04 | Service-role and elevated-key elimination | R7, R9 | MVP | Implemented & verified | Keep provisioning separate and add SR-01/SR-02 integration tests. |
| SEC-05 | Born-synthetic loopback fail-closed boundary | R9, R10 | MVP | Local bootstrap guard implemented & verified | Next instrumentation fails when either B11B setting is partial/unsafe and leaves ordinary disabled builds unaffected; AWS account/tag startup guard remains Milestone B. |
| SEC-06 | Idempotency, serializable transitions, and race safety | R7, R8, R9 | MVP | Onboarding concurrency verified; later workflows pending | Exact retries survive school-directory expiry; two independent authenticated sessions race save/submit with one winner and deterministic `STALE_VERSION`/`SUBMISSION_LOCKED`. Later assignment/finalization races remain. |
| SEC-07 | Purpose-separated private fields and field registry | R4, R7, R9, R10, H2 | MVP | Onboarding separation implemented; full registry pending | Profile and private-context purposes are physical/tested; full field registry and later admissions projections remain. |
| SEC-08 | Threat model and minimum security gate | R7, R9 | MVP | Milestone A gate verified | 204 pgTAP assertions cover grants, forced RLS, IDOR, allowlists, idempotency after directory expiry, immutable submission, snapshots, and every D-013 firewall class; the full admissions manifest remains. |
| SEC-09 | Merge-blocking CI/CD quality, database, and web-smoke gates | R7, R8, R9, R10 | MVP | Onboarding action integration is merge-blocking | Web-smoke CI creates local users then runs the exported-action happy path and owner isolation before build/security/Playwright; later D-014 stages remain. |
| SEC-10 | Production privacy, legal consent, retention, and incident controls | R8, R9 | Future | Blocked | B16 specifies technical preparation; B-06/E-038 still block live child data and legal-compliance claims. |
| OPS-01 | pnpm monorepo and package ownership boundaries | R7, R8, R10 | MVP | Implemented & verified | Preserve boundaries as engine and RPC modules are added. |
| OPS-02 | Host integration modes and brand theming | R8, R9, R10 | MVP-bounded | Specified/researched | Validate E-051/E-052 with the actual host. |

Primary sources: `research/backend-admissions/RLS_AND_AUTH_BLUEPRINT.md`,
`research/backend-admissions/MVP_THREAT_MODEL.md`,
`research/backend-admissions/CHILD_DATA_PRIVACY_AND_RETENTION.md`, and
`.github/workflows/ci.yml`.

### Adaptive screening instrument (R11 / D-016)

| ID | Feature | Requirements | Scope | Current status | Remaining work / dependency |
|---|---|---|---|---|---|
| AX-01 | Assessment/session/telemetry contracts (`packages/contracts`) + demo `postMessage` embedding protocol | R11, R5, R7, R9, R10 | MVP-bounded | In progress | Zod schemas for items, sessions, responses, telemetry events, and per-domain metrics; versioned and `synthetic_only`. |
| AX-02 | IRT/CAT adaptive engine (`packages/exam-engine`) + deterministic scoring (`packages/exam-scoring`) | R11, R5, H6 | MVP-bounded | In progress | Item information, theta estimation, max-information selection, engagement gate, SE/max-item stop, exposure control; unit-tested; params synthetic/`validated=false`. D-016 named this one package `packages/cat-engine`; it is now these two. |
| AX-03 | Item bank seeded from the question-type catalog with versioned IRT parameters | R11, R5, H1, H10 | MVP-bounded | In progress | `app.*` type/item tables; synthetic difficulty ladder per domain; catalog re-orientation is RES-013. |
| AX-04 | Session/response/telemetry/metric data model + `api.*` RPCs + forced RLS | R11, R7, R9 | MVP-bounded | In progress | start/next/submit/finalize RPCs; append-only telemetry; derived per-domain θ/SE; pgTAP; regenerate db-types. Per-item correctness is the database's authority per D-027. |
| AX-05 | Test-taker delivery surface (demo host + adaptive session runner + results) | R11, R5, H4, H9 | MVP-bounded | In progress | Next.js route embedding demos via the AX-01 contract; born-synthetic proctor-issued session tokens; no PII. |
| AX-06 | Screener decision output (admit / defer / retry) with tunable cut and claim boundary | R11, R1, R5, R10 | MVP-bounded | In progress | Tunable GT-owned cut over per-domain θ + fit index; R10 boundary (screening ≠ program impact); validation is RES-012. |

Primary sources: `docs/governance/DECISION_LOG.md` (D-016, D-027), `research/exam-question-types/`,
`docs/architecture/EXAM_ITEM_SCHEMA_SPEC.md`, and the `packages/exam-engine` + `packages/exam-scoring` +
`supabase/migrations` implementation.

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

As of 2026-07-20 on `feat/onboarding-backend-core`:

- governance, PRD, architecture, and research specifications are present;
- the eight Milestone A family API contracts, generated types, and B11B actions are implemented;
- 47 contract tests, 18 fixture tests, 22 web/unit tests, 204 pgTAP assertions,
  and three live integration tests (exported actions, owner isolation, and a
  real two-session race) pass;
- reusable profiles, fictional school versions, private support/disclosure and
  finance context, immutable application snapshots, owner-only reload,
  save/submit/status, and forced-RLS isolation are implemented;
- the remaining assessment/review/decision tables and RPCs, AWS request binding, decision engine,
  RFC 8785 canonicalization, and replay executor are not implemented;
- the D-014 family/admissions/reviewer/supervisor functional surfaces remain
  unimplemented or placeholder-only;
- the critical 25-test manifest and PRD end-to-end acceptance checks are not yet executable; and
- causal/evaluation requirements R2, R3, R6, H3, H5, H6, and H8 remain future/deferred work.

## Maintenance rules

Update this file when:

- a feature changes status;
- a requirement mapping changes;
- a blocker is resolved or added;
- a feature moves into or out of scope;
- acceptance evidence becomes executable; or
- a ratified decision changes the product or evaluation design.

Do not add an implementation feature without at least one R/H requirement mapping. If work cannot
map to a requirement, stop under the `AGENTS.md` workflow and ask for direction.
