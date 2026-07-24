# Decision Log

## Rules

Record decisions that change scope, requirements, evidence standards, product direction, or major trade-offs. Do not use this log for routine implementation choices.

Each decision must include the requirements served, alternatives considered, evidence, consequences, owner, and date. Reversals create a new entry; do not rewrite history.

## Decisions

### D-001 — Establish canonical project governance

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Use the charter, requirements, rubric, traceability matrix, evidence register, decision log, and scope-exception log as the canonical governance package.
- **Requirements served:** R7, R8, R10, H9
- **Alternatives considered:** Rely on the BrainLift alone; rely on a PRD alone.
- **Rationale:** Research does not define operating scope, and a PRD can prematurely lock a solution. Separate governance makes boundaries explicit and reviewable.
- **Consequence:** All contributors must use the canonical reading order in `PROJECT_CHARTER.md`.
- **Owner:** Team lead

### D-002 — Keep project requirements solution-agnostic

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Requirements define outcomes and evidence standards, not a lottery, specific assessment, workflow, or architecture.
- **Requirements served:** R1–R10
- **Alternatives considered:** Adopt the BrainLift's capability-gated lottery as the required solution.
- **Rationale:** The BrainLift is a core resource, but its proposed solution is not the capstone requirement.
- **Consequence:** Preferred mechanisms must be justified during concept selection rather than treated as fixed.
- **Owner:** Team lead

### D-003 — Require requirement-ID traceability

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Every substantive plan, feature, experiment, or technical work item must map to at least one R/H requirement.
- **Requirements served:** R7, R8, R10
- **Alternatives considered:** Informal alignment during review.
- **Rationale:** Explicit IDs make scope drift visible before implementation.
- **Consequence:** Unmapped work is rejected or requires an approved scope exception.
- **Owner:** Team lead

### D-004 — Treat previous PRD sprint outputs as historical exploration

- **Date:** 2026-07-17
- **Status:** Superseded by D-007
- **Decision:** Retain `docs/prd-sprint/` for research and design reference, but do not treat it as an approved product direction or binding PRD.
- **Requirements served:** R7, R8, R10
- **Alternatives considered:** Delete the files; adopt them as the current PRD.
- **Rationale:** The work contains useful analysis but was created before the team selected a product direction.
- **Consequence:** Canonical governance documents override any conflicting material in that folder.
- **Owner:** Team lead

### D-005 — No product concept is currently ratified

- **Date:** 2026-07-17
- **Status:** Superseded by D-008
- **Decision:** Product discovery remains open until the team evaluates concepts against the development rubric.
- **Requirements served:** R1–R10
- **Alternatives considered:** Ratify the integrated pilot from the historical PRD sprint.
- **Rationale:** The team must own concept selection and trade-offs.
- **Consequence:** Agents may analyze or prototype concepts but must not describe one as approved without a new decision entry.
- **Owner:** Team lead

### D-006 — Scope the capstone to two people and four weeks

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Target a critic-ready synthetic-data prototype and evaluation evidence pack within four weeks and 40 human person-days, using parallel AI factories.
- **Requirements served:** R1–R10, H1–H10
- **Alternatives considered:** Production-ready admissions system; live pilot; full academic-year impact evaluation.
- **Rationale:** AI can compress research, implementation, testing, and documentation, but cannot remove stakeholder, psychometric, ethical, or elapsed-time constraints.
- **Consequence:** Production launch, live student data, final external approvals, and measured program impact are explicitly out of scope. The prototype must distinguish proven, simulated, assumed, and future work.
- **Owner:** Team lead

### D-007 — Distill and remove the historical PRD sprint

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Preserve reusable concept, critic-review, metric, guardrail, and scoring material in solution-agnostic canonical references, then delete `docs/prd-sprint/`.
- **Requirements served:** R7, R8, R10, H5, H9
- **Alternatives considered:** Retain the folder indefinitely; delete it without preserving reusable material.
- **Evidence:** `CONCEPT_OPTIONS.md`, `CRITIC_REVIEW_CHECKLIST.md`, `METRICS_AND_GUARDRAILS_LIBRARY.md`, and the updated development rubric.
- **Rationale:** The folder contained valuable analysis but also a large unratified PRD that could mislead contributors into treating Concept C as approved.
- **Consequence:** The distilled references preserve useful options and test patterns without carrying forward a product decision.
- **Owner:** Team lead
- **Supersedes:** D-004

### D-008 — Ratify Track B Talent Evidence Snapshot prototype

- **Date:** 2026-07-17
- **Status:** Approved
- **Decision:** Preserve the authorized Track A CogAT admissions rule and add a profile-aware Track B invitation for promising below-cutoff CogAT applicants. Final Track B eligibility combines the CogAT gate with a 10–15 minute parent/guardian Talent Evidence Snapshot requiring no new child work.
- **Requirements served:** R1, R5, R7–R10, H1, H2, H4, H7, H9, H10
- **Evidence:** E-005 and E-006 support caution around a single hard screen while preserving capability; E-019 shows nominations provide limited complementary information; E-021 supports replacing unstructured recommendations with structured evidence while noting transfer limits; E-023 supports structured rules over freeform holistic judgment. None validates the Snapshot for live GT eligibility, so approval is restricted to the synthetic prototype.
- **Evidence routes:** Primary route uses one or two existing artifacts per selected domain. Applicants without artifacts may use a bounded structured narrative fallback completed by a parent/guardian or other directly observing adult.
- **Review:** Artifact route receives two independent reviews and a blind third review on disagreement. Narrative fallback receives three independent blind reviews from the start. Majority classification controls.
- **Domain rule:** Any demonstrable talent domain may contribute when evidence also shows learning rate, transfer, abstraction, or comparable capacity relevant to thriving in GT. Domain prestige cannot affect the decision.
- **Alternatives considered:** Keep the current parent essay; require new child performance tasks; restrict Track B to academic domains; make artifacts mandatory; use one reviewer; use automated scoring.
- **Rationale:** The selected workflow reduces parent-prose bias, preserves access for applicants without recorded artifacts, retains asynchronous/domain-specific talent, and fits the no-additional-child-work and four-week constraints.
- **Consequences:** The exact CogAT band, battery-profile rule, domain anchors, rubric thresholds, service catalog, and allocation/evaluation method remain configurable/open. Track B eligibility does not itself establish program effect or guarantee a seat.
- **Owner:** Team lead
- **Supersedes:** D-005

### D-009 — Use Supabase and PostgreSQL for the prototype backend

- **Date:** 2026-07-17
- **Status:** Superseded by D-012
- **Decision:** Use Next.js with the local Supabase development stack and PostgreSQL for the four-week synthetic prototype.
- **Requirements served:** R7, R8, R9
- **Alternatives considered:** Firebase Emulator Suite.
- **Rationale:** The team selected PostgreSQL and Supabase in a separate technical discussion.
- **Consequences:** PostgreSQL stores synthetic application and workflow data; Supabase provides local APIs, authentication, storage integration, and role-based access. No live child data or production Supabase project is authorized.
- **Owner:** Team lead
- **Superseded by:** D-012 (retain PostgreSQL, replace the Supabase platform with AWS managed services). PostgreSQL — and therefore the row-level-security, definer-RPC, immutable-versioning, and deterministic-replay design — is unchanged; only the platform bindings move.

### D-010 — Ratify future two-stage evaluation design, MAP outcome, and MVP remedy/consent boundaries

- **Date:** 2026-07-18
- **Status:** Approved
- **Decision:** Ratify the following governance-sync clarifications, restoring the BrainLift's intended two-stage evaluation interpretation and aligning MVP scope with the RES-008/RES-009 findings: (1) any future evaluation of Track B is a two-stage design, not a single Track-A-vs-Track-B comparison — stage one randomizes offer-versus-not-offered among equally eligible Track B candidates to estimate the Track B initial-offer/package effect, and stage two compares treated Track B against treated Track A as a service-fit noninferiority comparison; neither stage, nor their combination, supports a claim that Track A and Track B have equal route-specific causal effects without a Track A counterfactual. (2) MAP is ratified as the selected common future outcome measure for this design, verified only with lightweight upper-tail and administration-consistency checks, never scored or used for eligibility. (3) The proposed non-offered-candidate follow-up is a fall/winter/spring MAP testing schedule, a proposed next-cycle application-fee waiver of about $100 for submitting all three MAP results, and a 2–3 minute structured questionnaire per MAP submission covering schooling, tutoring, adaptive software, enrichment, and MAP prep since the prior test. (4) The questionnaire is hidden from admissions and cannot affect eligibility or re-entry; the questionnaire and other post-assignment resource data are descriptive mechanism/substitution information for a future evaluator, not primary intent-to-treat controls. (5) Sufficient Track B applicant volume/oversubscription (needed for randomized offer-versus-not-offered) is treated as an external go-to-market assumption, not a product blocker. (6) Pooling cohorts across cycles and handling rule/rubric/rater version drift are future analyst responsibilities using existing operational metadata; the MVP adds no new applicant-facing fields to support this. (7) MVP decision remedies are limited to explanation and factual/procedural correction; a substantive rubric-application appeal and automated re-entry are deferred beyond MVP scope, though manual staff-initiated re-entry may remain. (8) All prototype Track A/Track B rules remain fictional, versioned, and tagged `synthetic_only=true` and `validated=false`. (9) Any future seat allocation and the future evaluation design described above remain strictly downstream of this MVP and outside its scope.
- **Requirements served:** R2, R3, R4, R6, R7, R8, R9, R10, H3, H5, H6, H8, H9
- **Evidence:** RES-008 (two-stage estimand correction), RES-009 (cohort pooling and version-drift analysis), RES-004 (explanation/correction/appeal boundary), RES-005 (privacy/consent separation for research fields)
- **Alternatives considered:** Ratifying a single Track-A-vs-Track-B comparison as an equal-effect causal claim; collecting the resource questionnaire as a decision-used or admissions-visible field; adding new MVP persistence fields for cohort pooling or version tracking now; implementing substantive rubric appeal and automated re-entry within the four-week MVP; leaving prototype rules unmarked or implicitly authoritative.
- **Rationale:** RES-008 confirms the BrainLift intended two distinct comparisons — a randomized intent-to-treat estimate and a non-randomized service-fit comparison — while the prior PRD wording collapsed them into one equal-effect causal claim; separating them preserves a valid future identification strategy without overstating what either stage can show. Treating MAP, the fee waiver, and the questionnaire as proposed and hidden from admissions keeps the eligibility product from being contaminated by future-outcome incentives while still recording enough design intent that a future evaluator is not foreclosed. Deferring substantive appeal, automated re-entry, and cohort-pooling fields keeps the four-week MVP scoped to explainable eligibility and correction rather than adjudication or longitudinal-analysis capacity the team cannot build or validate in the available time.
- **Consequences:** The PRD's "Allocation and Evaluation," "Future Evaluation Handoff," and "Correction, Appeal, and Re-entry" sections, and `B-08`, must state these boundaries; no claim of Track A/Track B causal equivalence, live allocation, or implemented substantive appeal/automated re-entry is authorized. Applicant-volume risk is explicitly not a reason to block MVP delivery. All prototype rules remain fictional/versioned/`synthetic_only=true`/`validated=false` until superseded by a live-validation decision.
- **Owner:** Team lead
- **Relationship to prior decisions:** Builds on D-008 (Track A/Track B prototype ratification) and D-009 (Supabase/PostgreSQL backend) by fixing the future evaluation and remedy boundaries those decisions left open; does not supersede either.

### D-011 — Approve the synthetic web application architecture and integration boundary

- **Date:** 2026-07-18
- **Status:** Approved
- **Decision:** Approve `docs/architecture/ARCHITECTURE_PLAN.md` as the technical architecture for the synthetic prototype: one Next.js App Router sub-application in a pnpm monorepo, local Supabase/PostgreSQL, framework-independent Zod contracts, generated API-only database types, fixed synthetic fixtures, forced-RLS database boundaries, deterministic replay seams, and no ORM. Use Mode A (a linked sub-application on its own origin) for the prototype integration default; retain Mode B (a reverse-proxy path mount) as the future production-shaped option. The synthetic application owns its own local authentication and does not share or infer a live host-site session.
- **Requirements served:** R1, R5, R7, R8, R9, R10, H1, H2, H4, H7, H9, H10
- **Evidence:** D-008, D-009, D-010; E-034, E-037, E-039–E-045; `PROVISIONAL_IMPLEMENTATION_CONTRACT.md`; `RLS_AND_AUTH_BLUEPRINT.md`; `CANONICALIZATION_AND_REPLAY_BLUEPRINT.md`
- **Alternatives considered:** Rewriting or absorbing the pre-existing GT website into the application; embedding authenticated flows in the host DOM; using a shared live-site SSO session in the MVP; adding a separate API service or ORM; linking a hosted Supabase project.
- **Rationale:** A bounded sub-application preserves the synthetic/privacy boundary while still allowing brand-compatible navigation from a pre-existing host site. The monorepo packages keep shared contracts and generated types independent of Next.js, while local Supabase exercises the real Auth/PostgREST/PostgreSQL boundary without authorizing live data or deployment.
- **Consequences:** Phase B may scaffold the application, package, database, test, and CI boundaries but may not implement admissions business logic, real uploads/data, hosted Supabase, live host integration, production deployment, allocation, or evaluator systems. Host-link capability, brand tokens, and any future SSO remain assumptions until confirmed by GT IT.
- **Owner:** Team lead
- **Relationship to prior decisions:** Implements D-009 and the MVP boundaries in D-008/D-010; does not supersede them. Its PostgreSQL/RLS/replay design is unchanged by D-012; only the platform bindings named in D-009 move to AWS.

### D-012 — Move the prototype backend platform from Supabase to AWS (retain PostgreSQL)

- **Date:** 2026-07-19
- **Status:** Approved
- **Decision:** Replace the Supabase development platform with AWS managed services for the synthetic prototype, **keeping PostgreSQL as the database engine**. The row-level-security firewall, `SECURITY DEFINER` RPC write surface, immutable successor versioning, hash-chained audit, reason-code explanations, and deterministic canonical replay are retained unchanged; only the platform bindings move. The canonical Supabase→AWS mapping is:

  | Concern | Supabase (D-009) | AWS (D-012) |
  |---|---|---|
  | Database engine | Supabase-hosted PostgreSQL | **Amazon Aurora Serverless v2 (PostgreSQL-compatible)** — same SQL, RLS, RPCs, replay |
  | Auth / identity | Supabase Auth (GoTrue) JWT | **Amazon Cognito** user pool; JWT carries a `custom:user_role` claim; identity is `sub` |
  | RLS principal binding | `auth.uid()`, `auth.jwt()->>'user_role'` | App verifies the Cognito JWT and sets request-scoped session GUCs (`SET LOCAL app.user_id`, `app.user_role`); RLS predicates read `current_setting(...)` |
  | DB client | `@supabase/ssr` request-scoped client | **`pg` (node-postgres)** via **Amazon RDS Proxy**, one transaction per request, connecting as a non-`BYPASSRLS` role |
  | Write/read API surface | PostgREST-exposed `api` RPCs | Same `api` schema `SECURITY DEFINER` RPCs, invoked over `pg` from Next.js Server Actions/route handlers |
  | Object storage | Supabase Storage | **Amazon S3** (private buckets, pre-signed URLs; no public objects) |
  | Compute / hosting | Supabase-adjacent / local | **Next.js container on Amazon ECS Fargate**, fronted by **CloudFront + ALB** |
  | Secrets / elevated access | service-role key | **AWS Secrets Manager** + IAM database authentication; no RLS-bypassing credential in the app runtime (the "by construction" control is retained) |
  | Infrastructure as code | Supabase CLI/config | **Terraform** (cloud-portable) |
  | Synthetic/dev safety | local-only, loopback fail-closed | **dedicated dev AWS account, synthetic-only, resource-tag/account-id fail-closed guard** (replaces the loopback guard) |
  | Website integration | own origin | **own CloudFront origin** (subdomain, or a path behavior on the host distribution) |

- **Requirements served:** R7 (auditability/replay preserved), R8 (feasibility/portability), R9 (student protection — synthetic-only, least-privilege, no RLS-bypass credential), R10 (claim boundaries unchanged)
- **Evidence:** D-009 (prior platform), D-011 (architecture it revises); `docs/architecture/ARCHITECTURE_PLAN.md`; `RLS_AND_AUTH_BLUEPRINT.md`; `PROVISIONAL_IMPLEMENTATION_CONTRACT.md`; `CANONICALIZATION_AND_REPLAY_BLUEPRINT.md`
- **Alternatives considered:** (a) DynamoDB + Lambda + Cognito (fully serverless/NoSQL) — rejected because it discards PostgreSQL RLS, forcing a full rewrite of the data model, auth firewall, and canonical replay, and reduces portability. (b) RDS Postgres + API Gateway/Lambda for the RPC layer — deferred; retained as a possible future refactor, but keeping the definer-RPC surface in-database minimizes churn now. (c) Staying on Supabase — overridden by the team's platform decision.
- **Rationale:** Keeping PostgreSQL preserves the security and replay invariants that most of the corpus depends on, so the migration is a binding swap rather than a redesign. Standard PostgreSQL + a container + Terraform keeps the system portable across clouds or self-hosting and cleanly attachable to a pre-existing website via a CloudFront origin, satisfying the "easy to migrate / move across platforms / hook up to an existing site" objective.
- **Consequences:** Documentation and stack descriptions across the canonical, active-contract, and code layers are updated to the AWS mapping. The **functional code migration** (replacing `@supabase/ssr`/`@supabase/supabase-js` with `pg` + Cognito verification and session GUCs, replacing the Supabase CLI dev loop, and adding Terraform) is a **tracked follow-up**, not completed by this decision; the existing Supabase prototype code remains runnable until that migration lands (see `ASSUMPTIONS_AND_EVIDENCE.md` A-AWS-1..3 and the backend backlog). Development uses a dev AWS account with synthetic data only; no live child data, production account, or public endpoint is authorized.
- **Owner:** Team lead
- **Supersedes:** D-009

### D-013 — Separate reusable account profiles from cycle applications and expand onboarding intake

- **Date:** 2026-07-20
- **Status:** Approved
- **Decision:** Structure pre-CogAT onboarding as (1) reusable, guardian-owned student/household profiles and (2) an immutable cycle-specific application snapshot. The synthetic MVP field set includes: student name, date of birth, gender, and current grade; requested entry year/grade; a versioned current-school directory selection with name/address autofill and school type; accommodation/support-plan selections and bounded details; disciplinary-sanction and non-health withdrawal disclosures with a conditional explanation; guardian relationship, primary household address, prior-GT relatives and names, and a home-language survey; household income and number of household members for financial-aid intake; and versioned acknowledgements, referral source, and signature. Current-school enrollment date and prior-school history are removed from this setup flow. The two general application essays are not collected or persisted.
- **Privacy/use boundary:** Identity, demographic, household, language, accommodation/support, discipline, finance, referral, and signature fields are purpose-separated private context. They are excluded from Track A/Track B eligibility inputs and hashes, hidden from eligibility reviewers, and available only to explicitly authorized operational roles. Household income and household size may support a future financial-aid process but cannot affect capability or eligibility. The setup flow does not collect W-2s or other proof documents; any future proof request occurs only after an authorized downstream admission/aid trigger and remains blocked by `B-08`.
- **Live-use boundary:** The prototype remains born-synthetic. “COPPA compliant” or equivalent legal-compliance language is not authorized; `B-06` still requires GT privacy/legal approval of notice, parental authority, consent, access, retention, deletion, security, and operator/data-flow facts before live child data.
- **Requirements served:** R1, R7, R8, R9, R10, H2, H4, H7, H9, H10
- **Evidence/assumptions:** Team-lead field direction dated 2026-07-20; E-032–E-040 and E-054–E-057. School-directory authority, field requiredness/vocabularies, financial definitions, retention, and live legal applicability remain open assumptions.
- **Alternatives considered:** Keep all setup data in one application JSON document; keep accommodation/language and financial intake deferred; collect W-2 proof during setup; treat every setup field as durable account data; or let contextual fields enter eligibility review.
- **Rationale:** Separating reusable profile facts from cycle-specific assertions reduces repeat burden while preserving the exact application snapshot that was signed. Purpose-separated storage makes the “store it but never use it for eligibility” boundary testable and avoids turning family resources, disability context, language, or advocacy into capability evidence. Deferring proof documents avoids collecting the highest-risk financial data before there is an authorized need.
- **Consequences:** The PRD, feature map, onboarding backlog, traceability matrix, and assumptions register must reflect the expanded synthetic field set. The current onboarding backend remains a verified create/save/submit/status foundation, not field-complete account setup. New profile/private-context storage, contracts, draft-read projection, RLS, and noninterference tests are required. B11B enables local synthetic frontend integration; B11A remains required only for AWS/live wiring.
- **Owner:** Team lead
- **Relationship to prior decisions:** Narrows and extends D-010/D-011/D-012 without changing their causal, allocation, or platform decisions. It supersedes only the prior PRD/D-010-derived statement that no household-income or household-size fields are persisted in the MVP; it does not authorize financial-aid decisions, admission/offer logic, W-2 collection, or live child data.

### D-014 — Organize the MVP around a six-stage family journey and four functional personas

- **Date:** 2026-07-20
- **Status:** Approved
- **Decision:** Make the PRD page-oriented around the family journey: account/application setup; external CogAT handoff; automatic initial routing; Track B artifact/narrative submission when invited; blind reviewer/supervisor workflow; and final eligibility/explanation/correction. The only functional MVP personas are family/guardian, admissions operator, reviewer, and blind review supervisor. Track A displays `eligible`, never accepted/admitted. A valid CogAT result and the final required review automatically execute the locked rule and publish the applicant-safe notice.
- **Reviewer/supervisor boundary:** Reviewers receive assigned queues/deadlines, blind evidence, the six-dimension rubric with citations, draft/locked submit, abstention, and a non-vote blocker action. Live artifact/narrative de-identification is deferred; fixed synthetic evidence remains the MVP boundary. Supervisors act only as blind slot-three voters under the artifact-disagreement/narrative rules, with no prior-vote access, assignment management, calibration authority, discussion, or override.
- **Admissions boundary:** Admissions checks completeness, enters/imports CogAT, resolves pending work, manages assignments/replacements, and applies factual/procedural corrections followed by a locked rerun. Admissions cannot directly override eligibility. In-app notifications are MVP; email notifications are an extension.
- **CogAT boundary:** The MVP assumes an external portal handoff. Portal/provider, authentication, scheduling, return/status, and result-exchange details remain part of `B-01` and must follow the confirmed current GT workflow.
- **Requirements served:** R1, R5, R7–R10, H1, H2, H4, H7, H9, H10
- **Evidence/assumptions:** Team-lead workflow decisions dated 2026-07-20; D-008/D-010/D-013; current contract blindness, abstention, blocker, and majority invariants. B-01/B-05/B-06/B-07 remain open for live operation.
- **Alternatives considered:** Topic-only PRD organization; embedded CogAT; manual routing/release; direct admissions override; supervisor adjudication/override; full applicant context for reviewers; functional auditor/privacy/accessibility/leader pages; MVP email notifications.
- **Rationale:** Page and persona boundaries give frontend/backend contributors one navigable workflow, while automatic locked transitions and blind role limits preserve reproducibility, applicant rights, and reviewer independence.
- **Consequences:** The PRD, feature map, architecture surface map, and traceability must show the six stages and four functional personas. Auditor/configuration, privacy-steward, accessibility-coordinator, and school-leader pages are deferred as functional UI, without removing their required backend/security controls or future feature-library stories.
- **Owner:** Team lead
- **Relationship to prior decisions:** Operationalizes D-008’s review mechanics, D-010’s claim/remedy boundaries, and D-013’s account/application lifecycle; it does not change Track A policy, allocation, causal evaluation, or production authorization.

### D-015 — Reframe the selection target to Timeback-fit (giftedness core) and adopt a scalable, tunable, GT-validated screener

- **Date:** 2026-07-24
- **Status:** Approved
- **Decision:** Reframe the selection target from "identify giftedness" to "identify applicants who are gifted *and* able to thrive and accelerate on the Timeback platform," with giftedness a necessary but not sufficient component. Adopt a scalable, tunable, GT-validated screener as a first-class deliverable (new R11) and reframe R5 to a capability-and-fit standard. Retain the counterfactual/lottery design (R2; D-010) unchanged as the program-effect evaluation arm — the screener defines the capable/fit pool, the lottery measures program effect. Record GT's current operational anchors — the multi-path admission rubric (high CogAT; or two MAP screeners above the 95th percentile; or a blended CogAT+MAP aggregate above the 90th percentile; or a 99th-percentile composite waiver) and the 85th-percentile fall MAP reading gate with an ESL/exceptional-cognitive exception — as documented validation references, not a locked cut. The screener must run algorithmically at applicant volumes in the thousands (GT Anywhere at scale), with a human shadow-day retained for behavioral fit. North-star context: the "MIT-ready by 8th grade, ~100,000 students" leadership goal (expansion-dependent; current cohorts ~40-46 physical + ~300 virtual).
- **Requirements served:** R1, R5, R8, R11; complements R2–R4, R6, R7, R9, R10; H1, H4, H10
- **Alternatives considered:** Keep the giftedness-only target; target Timeback-fit only (dropping giftedness); keep the charter counterfactual-only and treat the screener as "not predetermined."
- **Evidence:** E-071–E-077 (GT admissions-director interview, Crystal Martel, 2026-07-23, Otter transcripts pt.1/pt.2)
- **Rationale:** The GT admissions director specified that the platform serves a specific learner profile: some gifted students do not thrive on Timeback (twice-exceptional, ESL, heavy-repetition needs, non-academic prodigies), while some students who are not conventionally "gifted" accelerate on it. Optimizing the screener for platform fit (with giftedness necessary) matches what GT actually selects for and what its data can validate, while the retained counterfactual keeps program-effect claims honest and non-circular (R4, R10).
- **Consequences:** `PROJECT_CHARTER.md` (mission, goals, non-goals) and `docs/product/project-requirements.md` (core success, R5, new R11, non-requirements) are updated. Deferred, tracked follow-ups (not this pass): reframing the two brainlifts toward the Timeback-fit target (counterfactual brainlift 10K→100K figure and a forward note; reconciling the assessment-quality brainlift's Insight 14 "never a will-benefit prediction" — proposed to the author, not rewritten); designing the GT-data validation study (new-test vs CogAT/MAP overlap; Timeback-acceleration criterion); re-orienting the question-type catalog toward the Timeback-fit / learning-rate construct. Tracked as RES-012 and RES-013. Does not supersede D-008 (Track A/B), D-010 (two-stage evaluation), D-012 (platform), or D-014 (personas/journey).
- **Owner:** Team lead
- **Relationship to prior decisions:** Refines the charter mission and R5; retains D-008's Track A/Track B and D-010's evaluation design; does not change platform (D-012) or MVP persona/journey (D-014) decisions.

### D-016 — Build the R11 screener as a born-synthetic adaptive test sub-application

- **Date:** 2026-07-24
- **Status:** Approved
- **Decision:** Build the R11 screening instrument as a bounded, born-synthetic adaptive test sub-application inside the existing pnpm monorepo (Mode A per D-011), on the runnable local Supabase/PostgreSQL stack (D-012 keeps this code runnable until the AWS binding migration). Scope: (1) an item bank of interactive question types drawn from the `research/exam-question-types` catalog, each item carrying versioned IRT parameters; (2) an in-stack TypeScript IRT/CAT engine (`packages/cat-engine`) that estimates per-domain ability (theta), selects each next item by maximizing item information, applies an engagement gate and consistency weighting, and stops on a target standard error or item cap with exposure control; (3) private `app.*` tables + `api.*` `SECURITY DEFINER` RPCs + forced RLS for participants, sessions, item responses, raw telemetry events, and derived per-domain metrics, exposed only through RPCs and generated `api` types; (4) a Next.js test-taking surface that embeds the existing self-contained demos through a `postMessage` telemetry contract and drives the adaptive loop. All item parameters, stopping rules, and cut scores are versioned synthetic policy (`synthetic_only=true`, `validated=false`), tunable and owned by GT (R11).
- **Reconciliation with D-014:** This instrument is GT's own screening tool — **not** embedded CogAT and **not** a live testing integration. The D-014 external-CogAT handoff and the `api.record_assessment_version` import path are unchanged; CogAT remains GT's trusted signal and a validation anchor (E-074). The screener is a parallel R11 capability whose outputs feed the capability-and-fit decision only after GT-data validation (RES-012). It does not supersede D-014.
- **Requirements served:** R11 (primary), R5, R8; bounded by R7, R9, R10; advances H1, H4, H6, H10; complements R1.
- **Alternatives considered:** Embedded CogAT (rejected in D-014); a separate off-stack FastAPI/Python service (rejected — breaks the RLS/definer-RPC firewall, generated-type discipline, and D-012 portability); a client-only prototype with no backend (rejected — cannot persist metrics server-side or run server-side adaptive selection); deferring the build (rejected — R11/D-015 make the screener a first-class deliverable).
- **Evidence:** D-015 (R11 adoption), E-071/E-075 (GT validation data), `research/exam-question-types/` catalog + `measurements.json`; D-011 (Mode A architecture), D-012 (portable PostgreSQL design). No item parameters are empirically calibrated; initial IRT parameters are assumed/synthetic pending GT data (validated=false).
- **Consequences:** Remains born-synthetic per D-006/D-011/D-013 — no live child data, no production deployment, loopback-only, no service-role/elevated key in app runtime. The "production-oriented" build follows the repo's production-shaped RLS/definer-RPC/immutable-versioning design, portable to the D-012 AWS target; per-app containerization/Terraform is not added now. Pseudonymous test-takers use a proctor/admin-authenticated session-token pattern with no PII (participant records store only a synthetic pseudonym code). Adds feature IDs AX-01–AX-06 and traceability work item TECH-004; the question-type catalog re-orientation remains RES-013 and the validation study RES-012. Does not supersede D-014 (external CogAT), D-011/D-012 (architecture/platform), or D-006 (synthetic scope).
- **Owner:** Team lead
- **Relationship to prior decisions:** Implements R11/D-015; extends D-011's Mode A sub-application and D-012's portable PostgreSQL design; reconciles with D-014 without superseding it.

## Entry template

### D-XXX — Decision title

- **Date:** YYYY-MM-DD
- **Status:** Proposed / Approved / Superseded / Rejected
- **Decision:** Concise statement
- **Requirements served:** R/H IDs
- **Alternatives considered:** Options evaluated
- **Evidence:** Register IDs or source links
- **Rationale:** Why this choice best serves the requirements
- **Consequences:** Scope, risks, and follow-up work
- **Owner:** Named decision-maker
- **Supersedes:** Prior decision ID, if applicable
