# GT Admissions Application and Decision Support MVP PRD

**Status:** Approved for a synthetic four-week prototype, not live admissions

## MVP Definition

The product is a role-based web application that guides families through GT’s application, routes applicants after CogAT, supports independent Track B review, and gives admissions staff an explainable decision record.

It does not administer CogAT, change Track A policy, allocate seats, operate financial aid, or measure program effect. It integrates those policy decisions as configured inputs or future downstream steps.

### Product Surfaces

- **Family Application Portal**
  - Start, save, resume, and submit an application
  - Support screen-reader and translation accessibility features
  - View status, next steps, corrections, and decisions
  - Complete the Track B Talent Evidence Snapshot if/when invited
- **Admissions Operations Dashboard**
  - Review application completeness
  - Import or enter synthetic CogAT results
  - Route applicants to Track A or Track B
  - Manage pending evidence, factual/procedural corrections, and manual re-entry (substantive rubric appeal deferred beyond MVP)
- **Track B Reviewer Workspace**
  - Collect independent rubric classifications
  - Trigger blind third review when required
  - Prevent reviewers from seeing prior ratings
- **Configuration and Audit View**
  - Store versioned synthetic Track A and Track B rules; all prototype rules are fictional, versioned, tagged `synthetic_only=true`, and `validated=false`
  - Display decision reasons and workflow history
  - Replay decisions and inspect reviewer agreement
  - Enforce the boundary between eligibility, allocation, finance, and research



### Pipeline Integration

The product connects the admissions stages through one status-driven workflow:

1. Family submits the base application.
2. Admissions confirms completeness and the applicant completes CogAT outside the product.
3. CogAT results enter the product and the routing engine applies the configured rules.
4. Track A continues through GT’s unchanged existing process.
5. Eligible below-cutoff applicants receive a Track B Snapshot invitation.
6. The appropriate artifact or narrative review workflow runs.
7. The product records Track B eligibility, explanation, correction status, and audit history.
8. Any future seat allocation, financial aid, enrollment, longitudinal follow-up, or causal evaluation process receives the eligibility result downstream but remains outside this MVP. Allocation mechanics remain undecided pending GT staff clarification (see `B-08`).



### Base Application Information

- The Family Application Portal collects:
  - **Student information**
    - Synthetic student identifier
    - Date of birth or age
    - Current grade
    - Requested entry year and grade
  - **Educational background**
    - Current school or school type
    - Enrollment dates
    - Prior schools, if relevant
  - **Accessibility and language support**
    - Accommodation request
    - Learning or communication support needed to complete the application
    - Home-language and translated/assisted application route
    - Accommodation information is hidden from eligibility reviewers
  - **Parent/guardian information**
    - Relationship to child
    - Any relatives as part of GT program previous (Y/N)
    - Contact information
    - Primary address only if operationally required
  - **Financial aid**
    - Financial aid intake (household income, dependents, W-2/income documentation) is deferred beyond MVP persistence pending GT financial-aid policy and allocation design (`B-08`); the MVP does not collect or store these fields
  - **Final submission**
    - Required-step checklist
    - Optional evidence clearly labeled
    - Accuracy acknowledgement and signature
    - Referral source stored as operations-only and hidden from reviewers
- After submission:
  - Display:
    > Application received. This is not an eligibility or admission decision. Your status page lists required next steps, deadlines, available accommodations, and assistance routes.
  - Show CogAT as the next required admissions step.
  - Support save/resume (not a dedicated button, but auto-save and restore on return), correction, accessibility, and status tracking.
  - Retain a decision trace showing the rule version, evidence, reviewer classifications, reason codes, and timestamps.
- Prototype scope:
  - Uses synthetic applicants, CogAT profiles, artifacts, and narrative evidence.
  - Does not process live child data, financial documents, fees, or applications.



## Track A

- Track A preserves GT’s current CogAT cutoff and base admissions rule unchanged.
- Enabling Track B must not change any Track A result.
- Actual cutoff values and policies remain configurable until confirmed by authorized GT staff.



## Track B



### Invitation Rule

A below-cutoff applicant is invited to complete Track B when either:

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
- The parent selects 1-2 primary talent domain.
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

Construct-preserving accommodations and accessibility assistance never reduce independence. Independence refers only to authorship and substantive contribution.

No overall holistic giftedness score is created.

### Independent Review

Reviewers are GT admissions officers using the anchored rubric above. The artifact route starts with two blind independent reviews and adds a third reviewer on disagreement; the narrative route uses three blind reviewers from the start. Reviewers complete benchmark-set calibration before live review, and reviewer-severity is monitored on an ongoing basis against the benchmark and peer reviewers.


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

- The MVP supports factual or procedural correction only: parents may correct factual or provenance errors, and failed or unavailable accessibility routes receive an equivalent route or pending status.
- A substantive rubric-application appeal (re-scoring the same evidence for a disputed rubric judgment) uses a new trained reviewer but is deferred beyond MVP scope.
- Applicants may re-enter a later cycle with genuinely new existing evidence; re-entry is a manual staff-initiated action in the MVP, not an automated system rule.
- Correction, appeal, accommodation, research refusal, and re-entry cannot reduce future access.



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
- Income, W-2s, aid status, or ZIP code
- School or recommender prestige
- Paid enrichment
- Awards or certificates
- Disability, diagnosis, or accommodation use
- Domain prestige (domain code only selects rubric anchors and never scores)
- Parent advocacy
- Recommender access or absence
- Referral source
- Research-consent choices
- Demographic identity



## Division of Labor, Timeline, and External Blockers



### Tiffany — Product and Frontend

Owns:

- Family application and status pages
- Track B Snapshot experience
- Accessibility and applicant-facing language
- Correction and pending-state screens
- Synthetic applicant examples
- Documentation and demo story

Their agents help with UI, accessibility, content, user scenarios, and documentation review.

### Aadi — Backend and Admissions Logic

Owns:

- Local Supabase stack and synthetic PostgreSQL records
- Track A/Track B routing
- Reviewer and third-review workflow
- Eligibility decisions and reason codes
- Audit history and replay
- Automated tests and demo setup

Their agents help with data design, backend logic, automated tests, and integration checks.

### Shared Work

The team shares the PRD, data format, frontend/backend interface, test-case list, and demo script.

Only one person edits a shared file at a time. Member A owns applicant-facing fields and copy. Member B owns routing and workflow interfaces.

### Four-Week Timeline


| Week                 | Tiffany                                                                                            | Aadi                                                                                   | End-of-week goal                                                          | Blockers                    |
| -------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------- |
| 1 — Plan             | Finalize application flow, Snapshot fields, accessibility states, and synthetic applicant examples | Define the data format, workflow states, routing interface, and synthetic rules        | Agree on fields, interfaces, test cases, and file ownership before coding | `B-01`–`B-04`               |
| 2 — Build            | Build the Family Portal, status flow, artifact route, and narrative fallback                       | Build the local Supabase/PostgreSQL data layer, CogAT routing, reviewer workflow, and eligibility logic | Frontend and backend work independently against the agreed interface      | `B-05`, `B-07`              |
| 3 — Connect and test | Add accessibility, corrections, pending states, and applicant explanations                         | Connect modules and add audit history, rule checks, and automated tests                | Complete the main Track A and Track B demo flows                          | `B-06` blocks live use only |
| 4 — Finalize         | Run usability checks and finish documentation and presentation                                     | Run regression tests, fix bugs, and prepare the demo environment                       | Complete critic review, final fixes, and rehearsal                        | `B-08` remains undecided    |




### Merge Rules

1. Use a separate branch for each task.
2. Each person and their agents edit only their assigned files.
3. Do not have two agents edit the same file at the same time.
4. Agree on shared data and interfaces before building against them.
5. Merge and test together once per day.
6. When external information is missing, use the listed placeholder and keep the blocker ID visible.



### Blocker Labels

- `[GT INFO]` — We need GT policy, workflow, staffing, or data.
- `[TESTING RULE]` — We need a decision or expert input about CogAT or the Snapshot rubric.
- `[PRIVACY]` — We need approval before using real child data or uploads.
- `[FUTURE DECISION]` — We have intentionally left this outside the MVP.

These items do not stop the synthetic prototype when a placeholder is listed. They do stop live use or claims that the prototype matches real GT policy.

### Blocker List


| ID   | Label                        | What we need                                                        | Who provides it                          | What we use for the prototype         | What cannot be finalized                   |
| ---- | ---------------------------- | ------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------ |
| B-01 | `[GT INFO]`                  | Current Track A workflow and cutoff, including current CogAT form/edition, cutoff value, battery/profile interpretation, retest policy, score-correction handling, and the base application workflow around it | GT admissions | Fictional Track A rule, CogAT form, cutoff, retest, and correction handling | Claim that the prototype matches GT policy |
| B-02 | `[GT INFO]`                  | Actual ages, grades, and services                                   | GT leadership/admissions                 | Grades 3–8 interdisciplinary example  | Live pathway setup                         |
| B-03 | `[GT INFO]` `[TESTING RULE]` | Track B promising band and battery-profile rule                     | GT and assessment expert                 | Fictional CogAT band/profile          | Live Track B invitations                   |
| B-04 | `[GT INFO]` `[TESTING RULE]` | Talent domains, rubric anchors, and passing rules                   | GT, domain experts, evaluator            | Math/STEM and music examples          | Live Snapshot eligibility                  |
| B-05 | `[GT INFO]`                  | Number of reviewers and available training time                     | GT admissions                            | Simulated reviewer accounts           | Staffing claims                            |
| B-06 | `[PRIVACY]`                  | Rules for child data, accessibility, consent, storage, and security | GT privacy/legal/accessibility reviewers | Synthetic records and fixed artifacts | Live data use and deployment               |
| B-07 | `[GT INFO]` `[PRIVACY]`      | Allowed artifact types, file limits, storage, and deletion          | GT IT/privacy                            | Fixed synthetic artifact examples     | Real artifact uploads                      |
| B-08 | `[FUTURE DECISION]`          | Track B seats and future genuine seat scarcity, financial aid, MAP follow-up logistics (schedule, submission tracking), fee-waiver terms (amount, eligibility, timing), evaluator access to operational metadata, and evaluation method. Applicant volume is not treated as a blocker. | GT leadership and evaluator | `allocation undecided` status | Offers and program-effect claims |




## User Persona

Parents or guardians applying for a child within the configured age/grade and service area who believe the child may qualify through Track A or the supplemental Track B pathway.

The synthetic prototype uses grades 3–8 and an accelerated interdisciplinary academic program as test fixtures. These are not confirmed GT policy.

## User Stories

See:

- `USER_STORIES.md`
- `USER_STORY_FEATURE_MAP.md`



## MVP Acceptance Checks

- Track A results remain identical when Track B is enabled.
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



## Tech Stack

- **Next.js**
  - Provides the Family Portal, Admissions Dashboard, Reviewer Workspace, and Configuration/Audit views.
- **Supabase with PostgreSQL**
  - PostgreSQL stores synthetic applications, CogAT profiles, Snapshot metadata, reviewer classifications, workflow states, and audit events.
  - Supabase provides the local database API, authentication, storage integration, and role-based access layer.
- **High-level product modules**
  - Base application
  - CogAT routing
  - Track B Snapshot
  - Independent review and adjudication
  - Decision explanation, correction, and re-entry (substantive rubric appeal deferred beyond MVP)
  - Configuration and audit

The MVP uses the local Supabase development stack with synthetic data only. It does not use live child data or a production Supabase project.