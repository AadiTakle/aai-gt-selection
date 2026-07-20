# GT Admissions Application and Decision Support MVP PRD

**Status:** Approved for a synthetic four-week prototype, not live admissions

**Target versus implementation status:** Unless a paragraph is explicitly
dated, this document specifies approved target behavior rather than deployed
behavior. As of 2026-07-20, the current implementation is Milestone A: a local,
born-synthetic PostgreSQL/Supabase development stack with the B11B server-only
frontend adapter for profile and application setup. The exported `actions.ts`
path is exercised against local Auth through the Next cookie/server-client
boundary in CI; Next instrumentation fails startup when B11B is partially or
unsafely configured. Submitted-response completeness, uncapped profile lists,
directory-expiry idempotency, prohibited-field firewall commitments, and real
two-session save/submit races are covered. The later D-014 CogAT, routing,
review, supervisor, and final-decision stages remain target behavior, not
current implementation. The D-012
AWS/Cognito/Aurora/RDS Proxy/ECS design is the approved Milestone B target; it
is not deployed or provisioned by the current implementation, and this PRD
makes no claim that an AWS account or hosting route is available.

## Referenced Specifications and Identifier Registers

This PRD is the apex product specification. It states target behavior and scope;
it does not restate the schema, API signatures, or governance registers that
live in dedicated documents. Developers should treat the following as the
authoritative sources for the implementation detail this PRD references but does
not duplicate.

### Identifier registers

- **`D-###` decisions** — ratified design/scope decisions. Register:
  `docs/DECISION_LOG.md`. Load-bearing here: `D-012` (Supabase→AWS platform
  move, PostgreSQL retained), `D-013` (two-layer onboarding: reusable profile
  vs. immutable cycle application), `D-014` (six-stage family journey and four
  functional personas).
- **`E-###` evidence/assumptions** — evidence-and-assumption register with a
  class and status per entry. Register: `docs/ASSUMPTIONS_AND_EVIDENCE.md`.
- **`R#` / `H#` requirements** — core requirements (R1–R10) and
  hypothesis-level requirements (H1–H10). Register:
  `docs/project-requirements.md`; status summary in
  `docs/TRACEABILITY_MATRIX.md`.
- **`B-##` external blockers** — GT/privacy/testing/future-decision blockers,
  cataloged in the Blocker List in this document and tracked in
  `docs/FEATURE_TO_REQUIREMENT_MAP.md`.

### Developer specifications not duplicated in this PRD

- **Data model / schema** — entity overview in `docs/ARCHITECTURE_PLAN.md` §5;
  field-level tracked-data map and migration specs in
  `docs/ONBOARDING_OVERHAUL_TICKETS.md`; authoritative DDL in
  `supabase/migrations/*`.
- **API / frontend↔backend interface** — RPC catalog, request envelope, and
  status/error contract in `docs/ARCHITECTURE_PLAN.md` §4.3; the executable
  contract is the Zod schemas and inferred types in `packages/contracts/src/`
  and the server-only actions in `apps/web/src/lib/onboarding/actions.ts` (the
  "B11B" local synthetic adapter).
- **AuthN/AuthZ and RLS** — principal model, seven business roles, ownership
  predicates, and the "no RLS-bypass credential" invariant in
  `docs/ARCHITECTURE_PLAN.md` §7.
- **Versioning, hashing, and replay** — immutable successor versioning,
  hash-chained audit, canonicalization (`sha256+jcs-rfc8785+gt-v1`), and the
  `replay_decision` procedure in `docs/ARCHITECTURE_PLAN.md` §8.
- **Contributor workflow, branch tiers, and document precedence** — `AGENTS.md`
  and `PROJECT_CHARTER.md`.

Concrete contract values used across this document—workflow statuses, reason
codes, error codes, and the synthetic CogAT intake shape—are summarized in
"Workflow Status, Reason Codes, and Contract Summary" below and remain governed
by the code contracts above.

## MVP Definition

The target product is a role-based web application that guides families through
GT’s application, routes applicants after CogAT, supports independent Track B
review, and gives admissions staff an explainable decision record.

It does not administer CogAT, change Track A policy, allocate seats, operate financial aid, or measure program effect. It integrates those policy decisions as configured inputs or future downstream steps.

## MVP Personas and Functional Surfaces

The functional MVP has four role-specific experiences.

### Family / Guardian — Family Portal

- Create and reuse student/household profiles.
- Start, save, resume, review, sign, and submit a cycle application.
- Launch the external CogAT/admissions portal and return to view status.
- See the automatic routing result: Track A eligible, Track B Snapshot invited,
  or no current pathway.
- If invited, choose and complete the artifact or structured-narrative route.
- View pending actions, final eligibility, explanation, and factual/procedural
  correction status.
- Receive in-app task/status/deadline notifications. Synthetic email
  notifications are an extension after MVP.

### Admissions Operator — Admissions Operations Dashboard

- Review application completeness and request factual correction.
- Enter/import and validate synthetic CogAT results.
- Resolve pending evidence/accessibility work.
- Manage reviewer assignments and replacements.
- Correct factual/procedural errors and rerun the locked rule.
- Cannot directly override an eligibility outcome. Valid CogAT entry and the
  final required review automatically run routing/finalization and publish the
  applicant notice.

### Reviewer — Track B Reviewer Workspace

- View an assigned-case queue with status and deadlines.
- Open only the assigned blind artifact/narrative evidence, age/grade band,
  selected domain, and approved accommodation route—not diagnosis or the full
  application.
- Save a draft six-dimension rubric with evidence citations.
- Submit an irreversible binary classification.
- Abstain for conflict of interest or insufficient domain competence.
- Report a non-vote evidence/accessibility blocker that pauses the case and
  routes it to admissions/family.
- Cannot see peer ratings, vote direction/count, applicant identity, full
  application context, or completed-assignment history in this MVP.

### Review Supervisor — Blind Third-Review Workspace

- Receives slot-three assignments: after an artifact-route disagreement or from
  the start for every narrative case.
- Uses the same blind evidence view, six-dimension rubric, citation, draft, and
  locked-submit behavior as a reviewer.
- Cannot see prior votes, discuss the case in-product, manage assignments,
  calibrate raters, or override the majority classification.

Auditor/configuration, privacy-steward, accessibility-coordinator, and
school-leader role pages are not functional MVP surfaces. Their required
controls remain enforced through configuration, RLS, tests, and operational
work outside this page-level MVP; future dedicated surfaces remain in the
feature library.

The runtime authorization model defines seven business roles, of which only the
four personas above are functional MVP page surfaces. The full role vocabulary
(`packages/contracts/src/roles.ts`) is `family`, `admissions_operator`,
`reviewer`, `review_supervisor`, and three non-UI roles: `decision_service`
(the isolated engine principal that runs locked routing/finalization and
publishes decisions), `auditor`, and `privacy_steward`. The three non-UI roles
have no MVP page; their controls are enforced through RLS, `SECURITY DEFINER`
RPCs, configuration, and tests as noted above.

## End-to-End Page Workflow

### Stage 1 — Account Setup and Application

1. **Sign in / Student Selector**
   - Guardian enters the synthetic family portal.
   - Guardian creates or selects one of their student profiles.
2. **Student Information**
   - Name, date of birth, gender, current grade, requested entry year/grade.
3. **Educational Background**
   - Select current school from the versioned directory or use `other/not
     listed`; the page autofills the signed school name/type/address snapshot.
4. **Support, Plans, and Disclosures**
   - Accommodation/support-plan selections and conditional details.
   - Discipline/non-health withdrawal questions and conditional explanation.
5. **Family, Language, and Financial Intake**
   - Guardian relationship, household address, prior-GT relatives, home-language
     survey, synthetic household income, and household count.
6. **Review, Acknowledgements, Referral, and Signature**
   - Family reviews every persisted non-essay field, accepts the versioned
     statement, signs, and submits.
7. **Application Received**
   - Status becomes `awaiting_assessment`.
   - The page shows CogAT as the next required step.

### Stage 2 — External CogAT Handoff

1. **CogAT Launch**
   - MVP assumes a secure external admissions/testing portal opened from the
     family status page.
   - The actual GT portal, authentication, return URL, scheduling, and result
     exchange remain part of `B-01`; this assumption must change if the current
     GT workflow differs.
2. **Admissions CogAT Intake**
   - Admissions enters/imports and validates the synthetic result.
   - Missing/invalid results become pending correction, never a zero or
     negative eligibility result.
   - The result is recorded as an immutable, versioned assessment: instrument
     `COGAT_SYNTHETIC`; a composite score plus verbal, quantitative, and
     nonverbal battery scores (each `0–100` or null); and a `validity` of
     `pending`, `valid`, or `invalid`. Only a `valid` locked assessment drives
     routing; `pending`/`invalid` yield `assessment_needs_correction`. Battery
     and composite values are visibly synthetic and configurable (`B-01`,
     `B-03`).
3. **Automatic Routing**
   - A valid locked assessment automatically executes Track A and Track B
     invitation rules and immediately publishes the applicant-safe result.

### Stage 3 — Initial Routing Result

- **Track A eligible**
  - Family sees `track_a_eligible`, the applicable reason summary, and that
    eligibility is not admission or a guaranteed seat.
  - No Track B evidence is requested.
- **Track B Snapshot invited**
  - Family sees `track_b_snapshot_required`, why the invitation occurred, the
    deadline, and a choice of artifact or narrative route.
  - Invitation is not Track B eligibility or admission.
- **No current pathway**
  - Family sees an applicant-safe result and available factual/procedural
    correction or later-cycle re-entry information.

### Stage 4 — Track B Evidence Submission

1. **Route Choice**
   - Family selects existing artifact evidence or structured narrative fallback.
2. **Artifact Route**
   - Select domain(s), choose one or two fixed synthetic artifacts, and provide
     required provenance/assistance metadata.
3. **Narrative Route**
   - Select domain(s), one fixed synthetic narrative reference, and bounded
     observer context.
4. **Review and Submit**
   - Family reviews the Snapshot version and submits.
   - Status becomes `snapshot_under_review`.

Real artifact/narrative de-identification is deferred; the MVP uses
independently constructed synthetic fixtures. Any future live workflow must
meet `B-06`/`B-07`.

### Stage 5 — Blind Review and Supervisor Vote

1. Reviewers work independently from their assigned queues.
2. Artifact cases begin with two reviewer slots; agreement finalizes the
   classification, disagreement creates one blind supervisor slot.
3. Narrative cases create two reviewer slots and one blind supervisor slot from
   the start.
4. Abstention creates a same-slot replacement and never counts as a vote.
5. A reported evidence/accessibility blocker pauses aggregation and creates
   pending work rather than a negative vote.
6. The final required locked vote automatically applies the majority rule and
   publishes the final Track B eligibility notice.

### Stage 6 — Final Family Decision

- **Track B eligible:** show the qualifying pathway, bounded reason summary,
  claim boundary, and correction route.
- **Does not currently qualify:** show non-stigmatizing reasons, uncertainty,
  factual/procedural correction, and later-cycle re-entry information.
- **Pending family/internal action:** show the required owner, next action, and
  paused/escalated deadline without implying rejection.
- Every result remains eligibility-only; allocation, admission, aid decisions,
  and seats are downstream and outside this MVP.

## Detailed Page and Decision Requirements

### Account Setup and Base Application Information

- The Family Application Portal separates reusable account/profile facts from
  the immutable snapshot signed for one application cycle.
- Submission binds the exact profile, private-context, school-directory, and
  final-submission versions used for that application. Later profile or
  configuration edits cannot rewrite the submitted application.
- Field vocabularies and requiredness remain versioned and configurable pending
  the authorities and validations identified in `B-06`, `B-08`, and
  E-063–E-065.
- **Reusable guardian-owned profile**
  - **Student identity**
    - Synthetic student identifier
    - Student name
    - Date of birth
    - Gender using a versioned configurable vocabulary; options and requiredness
      remain open
  - **Family/household**
    - Guardian relationship to child; guardian account identity comes from verified authentication
    - Primary household address
    - Whether relatives attend or attended GT School and, when yes, their names
  - **Home-language survey**
    - Language most often spoken at home
    - Language the child first learned
    - Language the child uses most often
    - Additional languages regularly spoken or understood
- **Cycle-specific application snapshot**
  - **Student/application**
    - Current grade
    - Requested school entry year and grade
  - **Educational background**
    - Current school chosen from a versioned directory
    - Directory school name, school type, and address copied into the signed snapshot
    - An explicit `other/not listed` route; directory source and maintenance owner remain open
    - Current-school enrollment date and prior-school history are not collected in this setup flow
  - **Special accommodations, learning plans, and disclosures**
    - Whether accommodations, learning plans, or other support are present
    - Versioned configurable multi-select accommodation and support-plan codes,
      with `other`
    - Bounded details about accommodations or challenges
    - Whether the student has been dismissed, suspended, placed on probation, or received another serious disciplinary sanction
    - Whether the student voluntarily withdrew for a non-health reason
    - A bounded explanation required when either disclosure is yes
    - This entire section is private operational context and hidden from
      eligibility reviewers; outside the guardian’s owner-scoped read, only
      explicitly authorized operational roles may read it, and those roles
      remain open under E-065
  - **Financial-aid intake**
    - Annual household income (exact amount versus configured band, currency, tax year, and requiredness remain open)
    - Number of people in the household (the household-count definition remains open)
    - No W-2 or proof document is requested or persisted during setup
    - Any future proof request occurs only after an authorized downstream admission/aid trigger and remains blocked by `B-08`
  - **Final submission**
    - Required-step checklist
    - Versioned acknowledgement text and acceptance timestamp:
      > I/We hereby state that the information contained herein is true and complete. I/We acknowledge that supplemental information may be required by the school and understand that our application will not be reviewed until supplement(s), if required, have been submitted.
    - Referral source, stored as operations-only and hidden from reviewers
    - Signature bound to the authenticated guardian, signed snapshot, statement version, and timestamp
    - The two general application essays are neither collected nor persisted
- **Purpose and eligibility firewall**
  - Outside a guardian’s owner-scoped access to their own records, private
    profile, support/disclosure, finance, referral, and signature context is
    readable only by explicitly authorized operational roles. Exact operational
    viewers remain open under `B-06`, `B-08`, E-064, and E-065.
  - Identity, gender, date of birth, household/address, relatives, language,
    accommodation/support, discipline/withdrawal, finance, referral, and
    signature fields are excluded from Track A/Track B eligibility inputs and
    decision hashes.
  - Every school-derived field—including directory ID, name, type, address,
    prestige, and `other/not listed` details—is excluded from eligibility.
    Only current/requested grade and entry year may control operational pathway
    availability; they cannot serve as capability evidence.
- After submission:
  - Display:
    > Application received. This is not an eligibility or admission decision. Your status page lists required next steps, deadlines, available accommodations, and assistance routes.
  - Show CogAT as the next required admissions step.
  - Target save/resume (auto-save and restore on return), correction,
    accessibility, and status tracking; accessible and translated routes still
    require `B-06` and E-024–E-027 validation.
  - Retain a decision trace showing the rule version, evidence, reviewer classifications, reason codes, and timestamps.
- Prototype scope:
  - Uses synthetic applicants, CogAT profiles, artifacts, and narrative evidence.
  - Stores only born-synthetic profile/application values and synthetic household-income/count fixtures.
  - Does not process live child data, W-2s/financial documents, fees, or real applications.
  - Targets COPPA-relevant minimization, parental-control, access, and deletion
    controls for validation. `B-06` and E-038 remain unresolved, so no COPPA or
    other legal-compliance claim is authorized.



## Track A

- The prototype preserves a locked, versioned, fictional Track A baseline.
- Enabling Track B must not change any result produced by that baseline.
- `B-01` remains unresolved. This PRD does not state GT’s current cutoff,
  CogAT form, workflow, retest rule, or correction process; all live values and
  process details remain open and configurable until authorized confirmation.



## Track B



### Invitation Rule

Within the synthetic prototype, an applicant below the configured fictional
Track A cutoff is invited to complete Track B when either:

- the CogAT composite falls within a predeclared promising band below the Track A cutoff; or
- at least one CogAT battery shows a predeclared strong domain profile despite the lower composite.

The invitation is not Track B eligibility or admission.

The prototype uses visibly synthetic values for:

- age/grade range;
- Track A cutoff;
- Track B promising band;
- battery-profile rule;
- example talent domains;
- reviewer anchors; and
- eligibility boundary.



### Talent Evidence Snapshot

The parent/guardian completes the Snapshot in 10–15 minutes.

- No new child testing, problem-solving, interview, or work is required.
- The parent selects 1–2 primary talent domains.
- Any demonstrable talent domain may contribute.
- Evidence must indicate exceptional domain talent plus learning rate, transfer, abstraction, or comparable capacity relevant to thriving in GT.



#### Route A — Primary Artifact Evidence

The parent provides one or two existing primary artifacts:

- video or audio;
- photo of original work or construction;
- writing, art, music, code, design, or project;
- existing schoolwork; or
- another child-produced artifact.

Required metadata:

- child’s age and artifact date;
- original task, prompt, or context;
- time spent;
- tools and materials;
- adult, teacher, peer, or AI assistance; and
- whether the behavior was repeated elsewhere.

Reviewers do not score production quality, equipment, formatting, awards, paid-program prestige, or access to expensive materials.

The prototype uses fixed synthetic artifact fixtures rather than real file uploads.

#### Route B — Bounded Structured Narrative Fallback

Used when the family has no existing artifact.

- A parent/guardian or other directly observing adult may submit the narrative.
- A third-party recommender is never required.
- Narrative body is limited to 400 words.
- Required factual header:
  - Relationship to child
  - Observation duration, frequency, and setting
  - Paid or unpaid relationship
  - Instruction or assistance provided
  - Opportunity context
  - Conflict of interest

Reviewers do not score writing quality, enthusiasm, superlatives, recommender prestige, paid enrichment, awards, or claims that the child is gifted.

The narrative route is testimonial evidence and receives no automatic point penalty.

### Review Rubric

Reviewers retain these dimensions separately:

- **Domain Expertise**
- **Learning rate**
- **Transfer or abstraction**
- **Independence**
- **Recurrence**
- **Evidence specificity**

The selected talent domain code determines which domain-specific anchors apply to the Domain Expertise dimension; domain identity or prestige is never itself a scored input. The remaining dimensions use shared anchors across domains.

Under the target rubric, use of an accommodation or accessibility assistance
never reduces independence; independence refers only to authorship and
substantive contribution. This scoring noninterference rule does not establish
construct preservation, equal access, or route equivalence, which remain
subject to `B-06` and E-024–E-027 validation.

No overall holistic giftedness score is created.

### Independent Review

The synthetic target workflow uses simulated reviewer and supervisor accounts;
it does not assert live GT staffing. For the synthetic prototype, the artifact
route starts with two blind independent reviews and adds a blind third review
on disagreement, while the narrative route uses three blind reviews from the
start. Reviewer qualifications, live role assignments, staffing levels,
training time, calibration corpus/cadence, and monitoring ownership remain open
until `B-05`. Benchmark calibration and reviewer-severity monitoring are target
controls, not current GT operations.


#### Artifact Route

- Reviewer 1 and Reviewer 2 score independently.
- They cannot see each other’s ratings.
- If they agree, the classification stands.
- If they disagree, a supervisor scores the application without seeing prior ratings.
- Majority classification controls.



#### Narrative Route

- Reviewer 1, Reviewer 2, and the supervisor score independently from the start.
- They cannot see each other’s ratings.
- Majority classification controls.



### Reviewer Outcomes

Reviewer votes are:

- `qualifies`
- `does not currently qualify`

`pending correction` is a workflow state, not a reviewer vote: invalid, inaccessible, or uninterpretable evidence is routed to pending rather than rejected or scored.

### Final Track B Eligibility

Track B eligibility requires:

1. passing the profile-aware CogAT Track B invitation rule;
2. exceptional evidence in at least one demonstrable talent domain;
3. at least one qualifying example of learning rate, transfer, or abstraction;
4. sufficient evidence specificity and child contribution; and
5. the required reviewer majority.

Track B eligibility does not guarantee admission or a seat.

### Correction, Appeal, and Re-entry

- The MVP supports factual or procedural correction only: parents may correct
  factual or provenance errors, and a failed or unavailable accessibility route
  receives an accessible alternative or pending status without a claim of route
  equivalence.
- Substantive rubric-application appeal is disabled and deferred beyond MVP
  scope. No future appeal mechanism or reviewer assignment—including a “new
  trained reviewer” mechanism—is approved; the appeal model remains an open
  policy decision.
- Applicants may re-enter a later cycle with genuinely new existing evidence; re-entry is a manual staff-initiated action in the MVP, not an automated system rule.
- Correction, accommodation, research refusal, and re-entry cannot reduce future access.



### Allocation and Evaluation

- Track B seat allocation remains undecided and outside the MVP until GT staff clarification.
- Household income cannot affect Track A or Track B capability eligibility.
- No live ranking, or offer rule is assumed.
- Track B broadens the eligible pool but eligibility alone does not demonstrate program effect. Any future evaluation is a two-stage design, not a single Track-A-vs.-Track-B comparison:
  1. Randomizing offer-versus-not-offered among equally eligible Track B candidates estimates the Track B initial-offer/package effect.
  2. Comparing treated Track B against treated Track A is a service-fit noninferiority comparison, not a randomized causal estimate.

  Together, these two stages may support a decision to expand Track B or revise the test-only cutoff, but they do not prove that Track A and Track B have equal route-specific causal effects.
- Live allocation, longitudinal follow-up, and causal analysis are downstream of this MVP; the MVP's role is limited to producing the Track A/Track B eligibility determination that a future evaluation would consume.

#### Future Evaluation Handoff

The following describes a possible future evaluation design outside MVP scope, recorded here only so the eligibility product does not foreclose it:

- Sufficient Track B demand/oversubscription (needed for randomized offer-versus-not-offered) is an external go-to-market (GTM) assumption, not a product blocker.
- Offered and non-offered Track B candidates would follow the same fall/winter/spring MAP testing schedule. MAP is the selected common future outcome measure, checked only with lightweight upper-tail and administration-consistency checks, not scored or used for eligibility.
- Non-offered candidates who submit all three MAP results would receive a proposed next-cycle application-fee waiver of about $100.
- Each MAP score submission would include a 2-3 minute structured questionnaire on schooling, tutoring, adaptive software, enrichment, and MAP prep since the prior test.
- Questionnaire responses are hidden from admissions and cannot affect eligibility or re-entry.
- These post-assignment resources/questionnaire responses are descriptive mechanism/substitution information for a future evaluator, not primary intent-to-treat controls.
- Pooling cohorts across cycles and handling drift belong to future analysts using existing operational metadata; the MVP does not add new applicant-facing fields to support this.
- Any future change to the Track B eligibility boundary (cutoff or promising band) would apply between admissions cycles only, never mid-cycle; would leave Track A unchanged; and would require both a positive Track B offer effect (stage 1) and A/B service-fit noninferiority (stage 2), plus capacity and applicant-wellbeing guardrails, before being adopted.



### Prohibited Eligibility Inputs

- Prose quality
- Income, household size, W-2s, aid status, address, or ZIP code
- School or recommender prestige
- Paid enrichment
- Awards or certificates
- Name, date of birth, gender, language, family structure, or prior-GT relatives
- Disability, diagnosis, accommodation/support-plan use, disciplinary history, or withdrawal history
- Domain prestige (domain code only selects rubric anchors and never scores)
- Parent advocacy
- Recommender access or absence
- Referral source
- Research-consent choices
- Demographic identity



## Role Assignments, Milestones, and External Blockers

The owner names below are role assignments, not claims about completed work,
live GT staffing, or current deployment.

### Tiffany — Product and Frontend

Owns:

- Family application and status pages
- Track B Snapshot experience
- Accessibility and applicant-facing language
- Correction and pending-state screens
- Synthetic applicant examples
- Documentation and demo story

### Aadi — Backend and Admissions Logic

Owns:

- Milestone A local synthetic backend and the Milestone B AWS target binding
- Track A/Track B routing
- Reviewer and third-review workflow
- Eligibility decisions and reason codes
- Audit history and replay
- Automated tests and demo setup

### Shared Work

The team shares the PRD, contracts, frontend/backend interface, acceptance
checks, and demo story.

### Delivery References

- **Milestone A (current implementation as of 2026-07-20):** local
  born-synthetic D-013 profile/application persistence, contracts, family RPCs,
  generated types, tests, and B11B server actions. See
  `docs/ONBOARDING_OVERHAUL_TICKETS.md` and
  `docs/FEATURE_TO_REQUIREMENT_MAP.md`.
- **Milestone B (approved target, deferred):** Cognito/RDS Proxy/Aurora
  binding and infrastructure, `B-06` live-use controls, `B-08` finance/proof
  policy, and production operations. See `docs/ARCHITECTURE_PLAN.md`.
- Assessment/routing, Snapshot, review, decision/replay, and role-scoped
  frontend surfaces remain target work outside the completed Milestone A
  onboarding slice.
- Repository ownership, branch hierarchy, merge, and verification rules are
  maintained in [`AGENTS.md`](../AGENTS.md) and are not duplicated here.



### Blocker Labels

- `[GT INFO]` — We need GT policy, workflow, staffing, or data.
- `[TESTING RULE]` — We need a decision or expert input about CogAT or the Snapshot rubric.
- `[PRIVACY]` — We need approval before using real child data or uploads.
- `[FUTURE DECISION]` — We have intentionally left this outside the MVP.

These items do not stop the synthetic prototype when a placeholder is listed. They do stop live use or claims that the prototype matches real GT policy.

### Open Assumptions and Configurable Inputs

- Host-site linking/proxy support and brand assets remain open under E-051 and
  E-052.
- AWS account, resource-tag, DNS, CloudFront, and hosting-route facts remain
  open under E-057 and E-058; the architecture is a target, not evidence of
  deployment.
- School-directory source and `other/not listed` policy remain open under
  E-063.
- Finance definitions, requiredness, authorized viewers, and any future proof
  trigger remain open under E-064 and `B-08`.
- Intake vocabularies/requiredness, live languages and accessible routes,
  operational viewers, response obligations, and retention remain configurable
  under E-065 and `B-06`.
- Admissions dates and current Track A process remain open under `B-01`/`B-02`;
  live reviewer staffing and calibration remain open under `B-05`; and no
  substantive appeal model has been approved.

### Blocker List


| ID   | Label                        | What we need                                                        | Who provides it                          | What we use for the prototype         | What cannot be finalized                   |
| ---- | ---------------------------- | ------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------ |
| B-01 | `[GT INFO]`                  | Current Track A/CogAT workflow: testing portal/provider, launch/authentication, scheduling, return URL/status, result exchange/import, form/edition, cutoff, battery/profile interpretation, retest policy, score correction, and surrounding base-application process | GT admissions/IT | Fictional external-portal handoff, Track A rule, CogAT form/cutoff, retest, and correction handling | Claim that the prototype matches GT policy or portal integration |
| B-02 | `[GT INFO]`                  | Actual ages, grades, and services                                   | GT leadership/admissions                 | Grades 3–8 interdisciplinary example  | Live pathway setup                         |
| B-03 | `[GT INFO]` `[TESTING RULE]` | Track B promising band and battery-profile rule                     | GT and assessment expert                 | Fictional CogAT band/profile          | Live Track B invitations                   |
| B-04 | `[GT INFO]` `[TESTING RULE]` | Talent domains, rubric anchors, and passing rules                   | GT, domain experts, evaluator            | Math/STEM and music examples          | Live Snapshot eligibility                  |
| B-05 | `[GT INFO]`                  | Number of reviewers and available training time                     | GT admissions                            | Simulated reviewer accounts           | Staffing claims                            |
| B-06 | `[PRIVACY]`                  | Rules for child data, accessibility, consent, storage, and security | GT privacy/legal/accessibility reviewers | Synthetic records and fixed artifacts | Live data use and deployment               |
| B-07 | `[GT INFO]` `[PRIVACY]`      | Allowed artifact types, file limits, storage, and deletion          | GT IT/privacy                            | Fixed synthetic artifact examples     | Real artifact uploads                      |
| B-08 | `[FUTURE DECISION]` `[PRIVACY]` | Track B seats and future genuine seat scarcity; financial-aid eligibility rules, household-income/count definitions, post-admission proof trigger, W-2 authority/retention, and separation from admissions; MAP follow-up logistics; fee-waiver terms; evaluator access to operational metadata; and evaluation method. Applicant volume is not treated as a blocker. | GT leadership, financial owner, privacy/legal reviewer, and evaluator | Synthetic income/count fixtures; no proof documents; `allocation undecided` | Aid decisions, W-2 collection, offers, and program-effect claims |




## Functional MVP Personas and Core User Stories

### Family / Guardian

- As a guardian, I want to reuse my child/household profile, complete one
  cycle-specific application across multiple pages, and resume after leaving so
  I do not repeatedly enter sensitive information.
- As a guardian, I want a clear external CogAT handoff and return status so I
  know what happens after application submission.
- As a guardian, I want Track A eligibility, Track B invitation, and no-current-
  pathway results clearly distinguished from admission or a guaranteed seat.
- As a Track B-invited guardian, I want to choose artifact or narrative evidence
  and review exactly what will be submitted.
- As a guardian, I want pending actions and final reasons stated without
  labeling my child “not gifted,” and I want factual/procedural errors corrected
  through a traceable rerun.

### Admissions Operator

- As an admissions operator, I want a completeness queue and factual-correction
  requests so missing data is not treated as low capability.
- As an admissions operator, I want to enter/import and validate CogAT results
  so the locked routing rules run automatically from a valid assessment.
- As an admissions operator, I want to resolve pending evidence/accessibility
  work and manage reviewer replacements without seeing or changing blind votes.
- As an admissions operator, I want to correct factual/procedural errors and
  rerun the same locked rule rather than override an eligibility outcome.

### Reviewer

- As a reviewer, I want an assigned queue, deadlines, blind evidence, anchored
  dimensions, and evidence citations so I can make a constrained,
  domain-relevant classification.
- As a reviewer, I want to save a draft, submit an irreversible final vote,
  abstain for conflict/competence, or report a non-vote blocker without seeing
  any peer vote.

### Review Supervisor

- As a supervisor, I want only the blind slot-three cases assigned by the
  artifact-disagreement or narrative workflow so my classification remains
  independent.
- As a supervisor, I want the same rubric and locked-submit controls as a
  reviewer without prior-vote access or override authority.

The synthetic prototype uses configurable grade/service fixtures that are not
confirmed GT policy. The broader regression and future-persona libraries remain
in:

- `USER_STORIES.md`
- `USER_STORY_FEATURE_MAP.md`

Those libraries do not authorize additional functional MVP pages beyond the
four personas above.



## MVP Acceptance Checks

- Locked fictional Track A baseline results remain identical when Track B is enabled.
- A promising below-cutoff CogAT profile creates a Track B invitation, not immediate eligibility.
- Track B eligibility requires the CogAT gate and Snapshot reviewer majority.
- The Snapshot is completable in 10–15 minutes without new child work.
- Lack of artifacts routes to the narrative fallback without penalty.
- Artifact disagreement always triggers a blind supervisor review.
- Every narrative fallback receives three blind reviews.
- Invalid evidence becomes pending with a correction route.
- Prohibited fields cannot enter eligibility.
- Accommodation use and research refusal have no effect on routing or eligibility.
- Every synthetic decision can be replayed from retained inputs and versions.
- Applicant messages do not imply admission, “not gifted” status, or program effect.
- The family can traverse every page stage from profile selection through
  application, external CogAT handoff, routing result, Track B evidence when
  invited, and final eligibility without encountering a role-inappropriate
  surface.
- A valid CogAT result automatically runs routing and publishes the Track A,
  Track B invitation, or no-current-pathway notice; Track A eligibility never
  requests a Snapshot.
- Reviewer queues expose only assigned blind cases and deadlines; draft work is
  editable, final submission is locked, abstention creates replacement work,
  and blocker reporting creates pending work without a vote.
- Supervisors receive only blind slot-three work, cannot see prior votes, and
  cannot override the majority.
- Admissions can correct/rerun but cannot directly override eligibility or edit
  a locked vote.
- In-app status/task/deadline notifications are present; email notifications are
  explicitly an extension after MVP.

### D-013 / Milestone A Onboarding Checks

- A guardian can reuse a profile for a cycle application; profile edits append
  successor versions, and submission binds the exact profile and private
  versions without rewriting prior submissions.
- Every tracked D-013 setup field round-trips through save, reload, review, and
  submit.
- Versioned directory selection and `other/not listed` entry both produce an
  exact school snapshot that survives later directory changes.
- Support, accommodation, discipline, and withdrawal branches enforce their
  conditional detail and explanation rules.
- Synthetic financial intake remains purpose-separated and private; it can be
  reloaded by its owner but cannot enter eligibility.
- Contracts and persistence reject the two general essays,
  current-school-enrollment/prior-school history, and W-2 or other proof
  documents.
- B11B server-only actions complete the local born-synthetic
  create/read/save/submit path without accepting identity or role from the
  request payload or exposing elevated credentials.
- Mutating profile, school-derived, support/disclosure, finance, referral, or
  signature fields changes zero eligibility inputs, results, or hashes; only
  current/requested grade and entry year may affect operational pathway
  availability.

## Workflow Status, Reason Codes, and Contract Summary

These values are the current Milestone A code contracts
(`packages/contracts/src/`), reproduced so this document's prose stages map to
concrete states. The code remains authoritative; if it diverges from this
summary, the code wins and this section is the bug.

### Application version state

An application progresses through an immutable, versioned lifecycle:
`draft` → `submitted` → `superseded`. Each save writes a new version with a
`sha256:` content hash and a `supersedes` pointer; a submitted version is locked
and can only be superseded through a traceable correction rerun, never rewritten
in place.

### Family-facing workflow status

The status projection exposes exactly one `workflowStatus` at a time, plus a
`phase` (`application`, `assessment`, `snapshot`, `review`, `decision`), a
`familyActionRequired` flag, an optional `nextActionCode` and `deadline`, an
optional `pendingReason`, and the fixed `claimBoundaryCode`
`ELIGIBILITY_NOT_ADMISSION`. The twelve statuses and the stage each maps to:

| Status | Stage / meaning |
| --- | --- |
| `application_draft` | Stage 1 — application being completed/saved |
| `awaiting_assessment` | Stage 1→2 — submitted, external CogAT pending |
| `assessment_needs_correction` | Stage 2 — CogAT missing/invalid, pending correction |
| `track_a_eligible` | Stage 3 — Track A eligible (no Snapshot requested) |
| `track_b_snapshot_required` | Stage 3 — Track B Snapshot invited |
| `no_current_pathway` | Stage 3 — below cutoff and not invited |
| `snapshot_under_review` | Stage 4→5 — Snapshot submitted, blind review in progress |
| `review_pending_family_action` | Stage 5 — paused; family owes an action |
| `review_pending_internal_action` | Stage 5 — paused; admissions/access owes an action |
| `track_b_eligible` | Stage 6 — final: qualifies |
| `track_b_does_not_currently_qualify` | Stage 6 — final: does not currently qualify |
| `policy_configuration_pending` | Any — blocked on an unresolved configuration input |

### Pending work

A pause never becomes a negative vote. Pending work carries a `pendingReason`
(`pending_assessment_correction`, `pending_evidence_correction`,
`pending_additional_blind_review`, `pending_accessibility_route`,
`pending_policy_configuration`), an owner role (`family`, `admissions`,
`access_steward`, `decision_service`), a route code, a deadline, and a state of
`open`, `escalated`, or `resolved`.

### Review states and outcomes

Snapshot route is `artifact` or `narrative`. Reviewer/supervisor slots are 1 and
2 (`reviewer`) and 3 (`supervisor`); the rubric is version `RB-SYN-01` with six
dimension codes: `DE` (Domain Expertise), `LR` (Learning rate), `TA` (Transfer
or abstraction), `IN` (Independence), `RE` (Recurrence), and `SP` (Evidence
specificity). A reviewer classification is `qualifies` or
`does_not_currently_qualify`; drafts are editable, final submission is locked,
and peer votes are never exposed.

### Decision reason codes

Every routing and eligibility decision carries an ordered, non-empty list of
reason codes (`packages/contracts/src/reason-codes.ts`), a result hash, and a
policy-bundle id. The thirteen codes:

| Reason code | Applies to |
| --- | --- |
| `TA_MET_CONFIGURED_BOUNDARY` | Track A eligible |
| `TA_BELOW_CONFIGURED_BOUNDARY` | Below the Track A cutoff |
| `TB_COMPOSITE_BAND` | Track B invited via promising composite band |
| `TB_BATTERY_PROFILE` | Track B invited via strong battery profile |
| `TB_OUTSIDE_CONFIGURED_RULE` | Not invited to Track B |
| `ASSESSMENT_MISSING_OR_INVALID` | CogAT pending correction |
| `SNAPSHOT_REQUIRED` | Snapshot evidence requested |
| `REVIEW_MAJORITY_QUALIFIES` | Track B eligible by reviewer majority |
| `REVIEW_MAJORITY_DOES_NOT_CURRENTLY_QUALIFY` | Track B does not currently qualify |
| `EVIDENCE_NEEDS_CORRECTION` | Evidence routed to pending correction |
| `ADDITIONAL_BLIND_REVIEW_REQUIRED` | Artifact disagreement adds slot three |
| `ACCESSIBILITY_ROUTE_REQUIRED` | Accessible alternative / pending route |
| `POLICY_CONFIGURATION_PENDING` | Blocked on an unresolved configuration input |

Decision outcomes are enumerated per kind: Track A (`eligible`, `not_eligible`,
`pending`), Track B invitation (`invited`, `not_invited`, `not_applicable`,
`pending`), and Track B eligibility (`qualifies`, `does_not_currently_qualify`,
`pending`).

### Concurrency, idempotency, and error contract

Every mutating call carries an `idempotencyKey`, an `expectedVersion` for
optimistic concurrency, and a `correlationId`. This is the mechanism behind the
save/resume and two-session save/submit guarantees noted in the status block at
the top of this document: a stale write fails with `STALE_VERSION`, a replayed
key with `IDEMPOTENCY_KEY_REUSED`, and a second submit with `SUBMISSION_LOCKED`.
The error envelope returns a machine `code`, a `retryable` flag, the
`correlationId`, the `currentState`, and field-level errors. The seventeen error
codes (`packages/contracts/src/errors.ts`) are `VALIDATION_FAILED`,
`AUTH_REQUIRED`, `ROLE_FORBIDDEN`, `RESOURCE_NOT_FOUND`, `STALE_VERSION`,
`INVALID_STATE_TRANSITION`, `SUBMISSION_LOCKED`, `ASSIGNMENT_CONFLICT`,
`NOT_INVITED`, `IDEMPOTENCY_KEY_REUSED`, `INPUT_HASH_MISMATCH`,
`POLICY_HASH_MISMATCH`, `CODE_VERSION_UNAVAILABLE`, `FIXTURE_NOT_ALLOWLISTED`,
`NON_SYNTHETIC_INPUT`, `FEATURE_DISABLED`, and `SERIALIZATION_RETRY_EXHAUSTED`.

## Non-Functional Requirements and Notifications

These are the dev-actionable baselines for the synthetic prototype. Items marked
proposed are engineering baselines, not ratified decisions; live-use targets
remain blocked by `B-06` and E-024–E-027 and are not claimed here.

- **Accessibility** — applicant-facing surfaces target WCAG 2.2 AA (proposed
  baseline, not yet a ratified decision) with an accessible alternative for
  every evidence route. Formal conformance and any accessible-route equivalence
  claim remain subject to `B-06`/E-024–E-027.
- **Internationalization** — applicant-facing language and translated routes are
  target behavior; the live language set and translation mechanism remain
  configurable under E-065/E-024–E-027 and are not finalized.
- **Data minimization and retention** — the prototype stores only born-synthetic
  values; live retention/deletion windows for support, discipline, and finance
  context remain open under E-064/E-065 and `B-06`.
- **Platform/runtime** — the current implementation is a local, single-node
  Supabase/PostgreSQL stack; performance budgets, availability targets, and a
  supported-browser matrix are Milestone B concerns and are not specified for
  the synthetic prototype.
- **Notifications** — the MVP delivers in-app task, status, and deadline
  notifications derived from the workflow status projection and pending-item
  owner/deadline fields; Milestone A adds no separate notification store or
  trigger language. Synthetic email notifications are an explicit post-MVP
  extension.

## Target Tech Stack (Milestone B)

- **Next.js**
  - Provides the Family Portal, Admissions Dashboard, Reviewer Workspace, and
    blind Supervisor Workspace. Configuration/audit remains a future or
    non-functional demonstration surface, not a fifth functional MVP persona.
  - Targets container deployment on **Amazon ECS Fargate**, fronted by **Amazon CloudFront + ALB**.
- **AWS with PostgreSQL (Amazon Aurora Serverless v2, PostgreSQL-compatible)**
  - The target PostgreSQL deployment stores synthetic applications, CogAT profiles, Snapshot metadata, reviewer classifications, workflow states, and audit events. Row-level security, `SECURITY DEFINER` RPCs, immutable versioning, hash-chained audit, and deterministic replay are retained from the PostgreSQL design.
  - The target **Amazon Cognito** binding provides authentication; the JWT carries an admin-controlled `custom:user_role` claim, and the application sets request-scoped PostgreSQL session settings that RLS policies read.
  - Target services include private **Amazon S3** object storage, **RDS Proxy**, **AWS Secrets Manager**, and IAM database authentication, with no row-level-security-bypassing credential in the application runtime.
- **High-level product modules**
  - Base application
  - CogAT routing
  - Track B Snapshot
  - Independent review and adjudication
  - Decision explanation, correction, and re-entry (substantive rubric appeal deferred beyond MVP)
  - Configuration and audit

D-012 approves this Milestone B platform target but does not establish that an
AWS account, resources, DNS, or endpoint currently exists. The current
Milestone A implementation remains local and born-synthetic; live child data
and production/public deployment are unauthorized. See
`docs/ARCHITECTURE_PLAN.md` and E-057/E-058.