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
  - Manage pending evidence, corrections, appeals, and re-entry
- **Track B Reviewer Workspace**
  - Collect independent rubric classifications
  - Trigger blind third review when required
  - Prevent reviewers from seeing prior ratings
- **Configuration and Audit View**
  - Store versioned synthetic Track A and Track B rules
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
7. The product records Track B eligibility, explanation, correction/appeal status, and audit history.
8. Any future seat allocation, financial aid, enrollment, or evaluation process receives the eligibility result downstream but remains outside this MVP.
  a. Here is the current idea for implementation: Financial aid resources are allocated to Track A students in a first pass, with remaining funds being reserved for Track B students. Based on the remaining aid resources and the income distribution of Track B eligible candidates, an algorithm programmatically determines the distribution of cohort seats across household income brackets (adjusted for household size). These seats are then assigned to the candidates through a lottery system in each bracket.

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
    - Household income
    - Number of dependents/household members
    - W2 & other forms only required on acceptance into program (FAFSA Style)
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

Domain expertise uses domain-specific anchors. The remaining dimensions use shared anchors across domains.

Construct-preserving accommodations and accessibility assistance never reduce independence. Independence refers only to authorship and substantive contribution.

No overall holistic giftedness score is created.

### Independent Review

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

- `qualifies`
- `does not currently qualify`
- `uninterpretable / pending correction`

Invalid, inaccessible, or uninterpretable evidence becomes pending rather than rejected.

### Final Track B Eligibility

Track B eligibility requires:

1. passing the profile-aware CogAT Track B invitation rule;
2. exceptional evidence in at least one demonstrable talent domain;
3. at least one qualifying example of learning rate, transfer, or abstraction;
4. sufficient evidence specificity and child contribution; and
5. the required reviewer majority.

Track B eligibility does not guarantee admission or a seat.

### Correction, Appeal, and Re-entry

- Parents may correct factual or provenance errors.
- Failed or unavailable accessibility routes receive an equivalent route or pending status.
- A rubric-application appeal uses the same submitted evidence and a new trained reviewer. Not in scope for MVP
- Applicants may re-enter a later cycle with genuinely new existing evidence.
- Correction, appeal, accommodation, research refusal, and re-entry cannot reduce future access.

### Allocation and Evaluation

- Track B seat allocation remains undecided and outside the MVP until GT staff clarification.
- Household income cannot affect Track A or Track B capability eligibility.
- No live ranking, or offer rule is assumed.
- Track B broadens the eligible pool but does not itself demonstrate program effect. It is the difference in performance between accepted students from Track A and B that will statistically demonstrate program effect.

### Prohibited Eligibility Inputs

- Prose quality
- Income, W-2s, aid status, or ZIP code
- School or recommender prestige
- Paid enrichment
- Awards or certificates
- Disability, diagnosis, or accommodation use
- Domain
- Parent advocacy
- Recommender access or absence
- Referral source
- Research-consent choices
- Demographic identity

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
- **Firebase Emulator Suite**
  - Stores synthetic applications, CogAT profiles, Snapshot metadata, reviewer classifications, workflow states, and audit events.
- **High-level product modules**
  - Base application
  - CogAT routing
  - Track B Snapshot
  - Independent review and adjudication
  - Decision explanation, correction, and appeal
  - Configuration and audit

These are implementation candidates for the synthetic prototype, not product requirements. The MVP uses no live child data or production Firebase project.