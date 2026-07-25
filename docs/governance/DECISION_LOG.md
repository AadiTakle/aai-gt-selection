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

### D-017 — Baseline reading literacy is a required capability for the in-house screener (reading barrier; no audio)

- **Date:** 2026-07-24
- **Status:** Proposed (awaiting team-lead ratification)
- **Decision:** Treat baseline reading literacy as part of the capability the in-house adaptive screener requires, not as construct-irrelevant variance to be mitigated. All question-type instructions and stimuli are delivered as on-screen TEXT only — **never audio** — and a child who cannot read/understand the grade-appropriate text is intentionally screened out, on the rationale that the target program (reading-based, self-paced Timeback) would not have worked for a non-reader. K-1 is retained wherever a task can be conveyed in very simple, high-frequency words a beginning reader can interpret; the K-1 band is removed from types whose K-1 access previously depended on audio narration of language the child must comprehend (CX-sjt-01, VER-CLOZE-01, VER-EVIDENCE-01, VER-POLYSEME-01 → floor raised to grade 2). The barrier is hard: no audio, ELL, or 2e/dyslexia accommodations within the screener.
- **Requirements served:** R5 (defensible capability-to-benefit standard), R11 (scalable/tunable screener).
- **In tension with:** H4 (broaden who can demonstrate ability) and the charter's "capability, not privilege" / rights-before-research principles — a reading gate has foreseeable disparate impact by reading ability, which correlates with ELL status, SES, age, and disability (2e/dyslexia). Acceptable only if literacy is genuinely required to benefit from the program; must be stated, monitored for adverse impact, and never conflated with general ability.
- **Alternatives considered:** (a) Keep the prior wordless/audio-supported design (reading as construct-irrelevant variance to minimize) — rejected per the reading-based-program rationale; (b) drop K-1 entirely — rejected in favor of retaining K-1 with very simple language where feasible; (c) provide audio/ELL/2e accommodations — rejected for the screener per the hard-barrier direction (accommodation/alternate-pathway deferred).
- **Evidence:** E-071 (Crystal Martel stakeholder claim that Timeback requires baseline literacy, from the 2026-07-23 interview per team direction; the interview summary is not yet transcribed into the repo, so this is her belief/claim pending verification). No independent evidence yet establishes the specific literacy floor or that a reading gate does not exclude capable non-readers who could benefit.
- **Consequences:** `research/exam-question-types/DEMO_REBUILD_GUIDE.md` §3/§3b updated (reading required, no audio); catalog specs updated (reading policy on all 66 types; K-1 removed from the 4 audio-dependent verbal-comprehension types); demos present instructions as text. Born-synthetic status unchanged (`synthetic_only=true`, `validated=false`). Does NOT establish a validated cut, an accommodations policy, or legal/fairness clearance; an adverse-impact/DIF review and an accommodations/alternate-pathway decision remain open follow-ups.
- **Owner:** Proposed by product direction (session 2026-07-24); requires team-lead ratification.
- **Governance note:** This log currently ends at D-014, but the exam workstream references D-015 (Timeback-fit target) and D-016 (adaptive screener) in `research/exam-question-types/METRIC_FRAMEWORK.md`; those entries are not yet transcribed here. This entry uses D-017 to avoid collision; transcribing D-015/D-016 and reconciling the canonical log are open governance tasks.

### D-018 — Interim hosted deploy on Supabase Cloud behind an explicit opt-in flag

- **Date:** 2026-07-24
- **Status:** Proposed (awaiting team-lead ratification) — records an interim divergence from D-012's end-state, not a replacement for it.
- **Decision:** To get a working hosted deployment sooner than the full D-012 rebind allows, permit running the Next.js portal against **Supabase Cloud** (auth + Postgres RPC) in production, gated behind an explicit **`GT_DEPLOY_MODE=hosted`** runtime flag. Default behavior is unchanged and remains fail-closed (loopback-only Supabase, `NODE_ENV` dev/test, local synthetic adapter pinned to `:65421`). Hosted mode only relaxes the non-loopback URL guard (requiring https) and widens CSP `connect-src` to the Supabase origin; it does **not** relax the ban on service-role/secret keys in the app runtime. Hosting target remains ECS Fargate per D-012 (`apps/web/Dockerfile`, `infra/`, `.github/workflows/deploy.yml`).
- **Requirements served:** operational (get a reviewable live environment); does not alter any product requirement.
- **In tension with:** D-012, which ratifies the end-state as `pg`/Aurora + Cognito (not Supabase). This is an explicitly-temporary bridge; the Supabase→pg/Cognito rebind remains the tracked follow-up and is NOT superseded.
- **Alternatives considered:** (a) block all deploy until the full D-012 rebind lands — rejected as too slow for MVP demonstration; (b) silently loosen the env guards — rejected (safety-critical guards must stay default-on and opt-in must be explicit and logged).
- **Consequences:** `apps/web/src/lib/env.ts` gains `isHostedDeploy` + hosted branch (with tests); `next.config.ts` CSP `connect-src` is hosted-aware; `docs/DEPLOYMENT_RUNBOOK.md` and `infra/README.md` updated; `.github/workflows/deploy.yml` added (dormant until deploy secrets exist). Data remains born-synthetic until a separate decision authorizes real applicant data. No production account is authorized by this entry alone.
- **Owner:** Proposed by product direction (session 2026-07-24); requires team-lead ratification before pointing hosted mode at a real project.

### D-019 — One source of truth for screener selection and scoring: the database stores, the TypeScript packages decide

- **Date:** 2026-07-25
- **Status:** Proposed (awaiting team-lead ratification)
- **Decision:** Split ownership of the adaptive screener along the line `docs/architecture/EXAM_ADAPTIVE_BUILD_PLAN.md` already draws. The **database keeps** answer keys, per-item answer verification against the server-only key (`app.exam_score_response`), the full trace (responses, metrics, telemetry), and outcome **storage**. The database **stops being an authority** on item selection, on the battery stop rule, and on the final score. `api.exam_submit_response` no longer auto-computes an outcome; outcomes now arrive through a new `api.exam_record_outcome`, which stores the `packages/exam-scoring` output **verbatim** together with the audit inputs needed to recompute it (scoring policy id, scorer version, and a database-derived sha256 of the canonical scorer input drawn from the stored trace). `app.exam_compute_outcome` and the difficulty-stepping logic are **demoted, not deleted**: both remain callable, only the automatic call site and the convergence branch are removed. The database retains a **hard safety cap** on item count (`hardItemCap`, seeded at 120) as a runaway guard that sits above the engine's own cap of 60, so it can never truncate a legitimate battery; it is explicitly not the stop rule.
- **Requirements served:** R7 (auditability and reproducible replay), R8 (feasibility — one tested implementation rather than two), R10 (claim boundaries), R11 (scalable, tunable in-house screener)
- **Why the contract already allocates it this way:** BUILD_PLAN **§3** assigns `startState/nextType/nextItem/update/isDone` to `packages/exam-engine` and specifies a stop rule keyed on core-metric coverage, even area spread, and estimate stability. BUILD_PLAN **§5** assigns the score to `packages/exam-scoring` and specifies *accuracy sets the bracket, metrics position within the bracket*. BUILD_PLAN **§6** scopes `supabase/` to storage tables plus RPCs and never grants the database scoring authority. This decision does not create a new allocation; it removes database behaviour that contradicted the existing one.
- **Defects this resolves (both independently verified against the running local stack):** (1) *Duplicate, disagreeing scoring* — `app.exam_compute_outcome` reported per-area proficiency as simply the final adaptive difficulty, while `packages/exam-scoring/src/scorer.ts` implements the §5 bracket-then-position contract, so one trace could yield two competing scores and reproducibility was not well defined. (2) *A broken stop rule in the wrong place* — the rule `attempts >= minItemsPerArea and (attempts >= maxItemsPerArea or abs(delta) <= stableDelta)` with seeded `stepSize = 0.8` and `stableDelta = 0.5` could effectively never take its convergence branch (`abs(delta)` is 0.8 on a correct answer and 0.8 on a wrong one, 0.4 only on a near miss), so every area ran to `maxItemsPerArea`, silently converting the REQUIRED variable-length battery of BUILD_PLAN §0 into a fixed-length one.
- **Alternatives considered:** (a) *Make the database the scoring authority* — port the §5 bracket-then-position pipeline into plpgsql, retire the TypeScript scorer's authority, and fix `stableDelta` so it exceeds `stepSize`. Rejected: it rewrites roughly 3,000 tested TypeScript lines into a language with weaker test ergonomics to obtain a number already computed correctly, it puts the admin-tunable policy behind migrations, and it still leaves selection split. It is a coherent choice and remains available (see reversal). (b) *Retune `stableDelta` and leave both scorers live* — rejected: it fixes the battery length but leaves the two-competing-scores defect untouched. (c) *Move answer verification into the application tier too* — rejected: the answer-key firewall is only meaningful because key comparison happens inside a schema no client role can reach.
- **Evidence/assumptions:** `supabase/EXAM_BACKEND_STATUS.md` §2/§4/§6 and unreconciled item 4 (the prior agent's executed verification: 274/274 pgTAP, the three-way answer-key firewall proof, and the recommendation this decision acts on); BUILD_PLAN §0/§3/§5/§6; `packages/exam-engine/src/done.ts` and `src/config.ts` (the §3 stop rule as implemented); `packages/exam-scoring/src/scorer.ts` (the §5 score as implemented). Fresh evidence from this change: `supabase/tests/122_exam_outcome_ownership.test.sql` (30 assertions) plus the amended `120` (46), 306/306 pgTAP across 15 files, `db lint` clean. **Open assumption:** no engine-versus-database convergence simulation has been run against the real banks, so the claim that an engine-driven battery finishes well under the 120-item guard is a design expectation, not a measured result. Everything remains born-synthetic (`synthetic_only = true`, `validated = false`); nothing here establishes predictive validity or authorizes an admissions decision.
- **Rationale:** Reproducibility does not require in-database computation — it requires a frozen trace plus a frozen policy, both of which this schema stores. `scoreExam` is pure in `(items, policy)`, so it reproduces wherever it runs. Key custody, by contrast, genuinely requires the database. Splitting on that line keeps the security property that must be in Postgres in Postgres, and puts the psychometric logic where it is specified, tested, and cheap to tune.
- **Consequences:** The database now stores a score it did not compute and cannot independently re-derive. That risk is mitigated in the same change rather than deferred: `app.exam_scorer_input_json` exposes the canonical scorer input from the stored trace, `app.exam_scorer_input_hash` hashes it server-side at record time, and both are stored on the outcome, so any recorded score can be recomputed from the trace and checked. `api.exam_submit_response` keeps its signature but its payload changes (`done` and `outcome` are replaced by `itemsAdministered`, `hardItemCap`, `hardCapReached`, and `stopRuleOwner`), and it no longer closes a session except at the safety cap — the application must now drive the stop through the engine and end the session by recording an outcome. `api.exam_get_next_item` becomes a fallback selection path that must not be mixed with engine-driven selection in one session. The dead policy knobs `minItemsPerArea`, `maxItemsPerArea`, and `stableDelta` are removed from the shipped policy; `stepSize` stays because it still drives the fallback difficulty bookkeeping. Two RPCs are added to the `api` surface, so `packages/db-types` regenerates additively. `apps/web` must be wired to the new flow before an end-to-end battery can complete.
- **Reversal:** Nothing was dropped, so reverting is additive. To restore database scoring authority: (1) re-add `if v_hard_cap_reached then v_outcome := app.exam_compute_outcome(p_session_id); end if;` to `api.exam_submit_response` (or restore the original `v_session_done` variable and its stop rule); (2) restore `minItemsPerArea`, `maxItemsPerArea`, and `stableDelta` to `app.exam_policy.config`, setting `stableDelta` **above** `stepSize` so the convergence branch is reachable at all; (3) optionally revoke `api.exam_record_outcome`. Reverting migration `supabase/migrations/20260725050000_exam_outcome_ownership.sql` wholesale also works, at the cost of the outcome audit columns. `app.exam_compute_outcome` was left intact and carries a `DEMOTED` comment naming the exact call site to restore.
- **Owner:** Proposed by the backend workstream (session 2026-07-25); requires team-lead ratification.
- **Relationship to prior decisions:** Implements the ownership already stated in BUILD_PLAN §3/§5/§6 and acts on the recommendation recorded in `supabase/EXAM_BACKEND_STATUS.md` §6. Does not supersede D-017 or any prior decision, and does not change the platform bindings ratified in D-012.

### D-020 — Reconcile the question banks with the canonical item contract; lure taxonomy becomes two fields

- **Date:** 2026-07-25
- **Status:** Proposed
- **Decision:** Where the 63 generated banks and `packages/contracts` disagreed on item shape, the contract is widened when the banks' convention is better and the banks are migrated when they are wrong. Specifically: (a) `questionTypeCodeSchema` accepts a mixed-case middle segment; (b) `answer.distractorRationales` becomes a record keyed by the selectable element's own id, not an array aligned to option order; (c) the lure taxonomy is split into a **required coarse `lureClass`** drawn from the existing nine-value enum and an **optional free-form `lureDetail`** carrying the type's own label; (d) `answer`, `scoring`, and `provenance` accept type-specific fields instead of being closed objects. A permanent conformance test (`packages/contracts/src/bank-conformance.test.ts`) parses every bank on every `pnpm -r test` run.
- **Requirements served:** R5, R7, R10
- **Alternatives considered:** (1) Migrate all banks to the contract's array-of-enum rationales — rejected: several types have selectable elements that are not positional options at all (`VER-EVIDENCE-01` keys passage sentences, `WM-bubble-01` keys per-lane n-back steps), and server-side M-ERRTYPE must look up a chosen lure by key once options are shuffled. (2) Widen `lureClassSchema` to admit all 219 domain labels — rejected: M-ERRTYPE and M-LURETYPE are counts over buckets and become uncomputable with an open vocabulary. (3) Keep only the coarse enum and discard the domain labels — rejected: it throws away the diagnosis the labels exist to carry. (4) Rename the 11 mixed-case catalog types — rejected as churn against the established vocabulary in specs, demos, banks, and docs.
- **Evidence:** E-074 (0/63 `bankItemSchema`, 14/63 `servedItemSchema`, measured 2026-07-25).
- **Rationale:** The banks encoded a de-facto schema that was, on the contested fields, better designed than the contract; the contract encoded assumptions no generator followed. Neither side was automatically right, so each field was decided on its merits. The two-field lure model is the only resolution that keeps the metrics computable and the diagnosis intact at the same time.
- **Consequences:** All 63 banks were regenerated as a pure shape migration — item counts, difficulties, content, and correct answers are byte-identical. `answer`, `scoring`, and `provenance` are now open objects; this does not weaken the security boundary, because `servedItemSchema` omits all three wholesale, and a test asserts it. Nine labels have no honest coarse home and are recorded as `distractor_other` with the gap named explicitly in `NO_HONEST_COARSE_CLASS`: non-responses (`abandoned`, `empty_response`, `no_response`, `guess`), conforming foils in find-the-odd-one-out tasks (`correct_placement`, `shared_pair`, `sound_given`, `sound_step`), and one developmental representation bias (`representation`). A further family — correct-but-inefficient responses (`complete_detour`, `solved_verbose`, …) — is bucketed as `local_fit` on the reading "planned locally rather than globally", which is defensible but is not what the enum was written for.
- **Owner:** Proposed by the contracts workstream (session 2026-07-25); requires team-lead ratification.

### D-021 — `demoPath` is a required bank field and an optional contract field

- **Date:** 2026-07-25
- **Status:** Proposed
- **Decision:** `demoPath` is added to `bankItemSchema` as **optional** and is now present on every item in every bank; `EXAM_ITEM_SCHEMA_SPEC.md` §6.1 continues to require it, and `audit_banks.mjs` moves it from `OPTIONAL_ITEM_KEYS` to `REQUIRED_ITEM_KEYS`.
- **Requirements served:** R7, R8
- **Alternatives considered:** Drop `demoPath` from the spec and the banks, and let each host resolve `typeCode` to a renderer. Rejected: 38 demo pages already embed served-item samples carrying it, and `apps/web`'s hand-maintained eight-type `typeCode -> path` map is evidence of what that costs at 66 types, not evidence the field is unnecessary.
- **Evidence:** E-074 (49 banks carried it, 14 did not; `.strict()` rejected all 49).
- **Rationale:** This resolves the three-way conflict the auditor documented and explicitly left to a governance decision. Optional in the contract because a host may legitimately override the path — `apps/web` serves from `/exam-demos/` — and because engine- and test-constructed items should not have to invent one. Required in the banks because a generated item with no renderer is incomplete.
- **Consequences:** 14 generators now emit `demos/<typeCode>.html`. The value is bank-relative and advisory; hosts that resolve their own path are unaffected. Since the value is fully derivable from `typeCode`, it carries no independent information today — its purpose is to let a future item version point at a different renderer without a client-side registry change.
- **Owner:** Proposed by the contracts workstream (session 2026-07-25); requires team-lead ratification.

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
