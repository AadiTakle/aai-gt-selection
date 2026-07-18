# GT School, Alpha, Timeback, and TEFA Public Facts

**As of:** 2026-07-18  
**Status:** Public-source research; not GT authorization or compliance finding

## GT School

### Confirmed

- One open physical campus: Georgetown, Texas
- Address: 2351 Westinghouse Rd, Georgetown, TX 78626
- Current grade span: K–8
- GT Anywhere launched in 2026
- Miami, New York, and Bay Area labeled “Coming soon”
- Public admissions entry collects parent name/email and routes to an account-gated portal
- Current independent June 2026 reporting describes CogAT screening around the 90th percentile
- Independent April 2026 reporting lists:
  - enrollment: 30
  - in-person tuition: $25,000/year
- Public admissions page says limited $10,000 founding-family scholarships are available

### Unverified

- Exact CogAT form/level/norm
- Official locked cutoff and battery/composite rule
- Retest and accommodation policy
- Full application fields and parent essay
- Fees and deadlines
- Current capacity
- Transportation
- Nursing/counseling/special-education/ELL services
- Current official tuition and aid formula

## Current GT Services

Public pages describe:

- adaptive/personalized math, reading, science, and social science;
- Guide coaching and emotional support;
- workshops in chess, debate, languages, piano/arts, entrepreneurship, robotics, and coding;
- competition teams in math, science, quiz bowl, debate, chess, writing, and robotics.

Public descriptions do not establish service quality, eligibility criteria, or causal effects.

## Timeback

Timeback is a beta platform coordinating:

- multiple learning applications;
- placement and test-out;
- course/skill sequencing and remediation;
- OneRoster, QTI, Caliper, LTI/OIDC, and related education standards;
- student dashboards, goals, XP, rewards, and monitoring;
- MAP profiles and progress analytics;
- Guide interventions and manual overrides.

Public package versions are pre-1.0 and Alpha says 2025–26 was its first fully transitioned Timeback year. A causal treatment definition therefore requires a dated version/configuration snapshot.

### Public adaptive logic examples

- Subject-specific placement
- MAP-based starting signal
- 90% placement/mastery gates in some workflows
- Near-pass hole filling
- Confidence reset
- Supporting-skill recommendations
- PowerPath score progression/difficulty changes
- Test-out and prerequisite verification
- Spaced repetition
- Manual Guide interventions

These are examples, not a complete disclosed algorithm.

### Treatment version fields

- Platform/SDK/service release
- App/vendor/version and integration level
- Course, item bank, standards, prerequisites
- Placement/norm/threshold configuration
- PowerPath mode/score trajectory
- Recommendation source and overrides
- MAP version/date/season/score/validity
- Time/XP/anti-pattern/reward logic
- Guide/staff interventions and ratio
- Scheduled/actual academic minutes
- Outages and extra work
- Workshops, peers, and site
- Monitoring/consent version
- Start/end, transfers, attrition, missing assessments

## Public Outcome Claims

### Company claims

- Alpha: average 2.6× MAP growth; best students up to 6.5×
- Alpha Anywhere: 2× overall and 3.5× among consistently engaged top two-thirds
- GT homepage: 3× median MAP growth, 1400+ SAT outcomes by eighth grade, and early AP 5s
- GT academics page frames 1400+ SAT/AP outcomes as targets/aims, creating wording inconsistency
- Unbound Arizona: 2.8× first-year claim without public cohort detail

### What MAP multiplier means

\[
\text{growth multiplier}
=
\frac{\text{observed RIT growth}}
{\text{projected RIT growth}}
\]

It is not:

- a causal effect;
- grade levels;
- twice the knowledge; or
- a standardized effect size.

NWEA warns the ratio can be skewed by outliers and small projected-growth denominators.

### Strongest public descriptive artifact

Official 2024–25 Alpha NWEA report:

- Fall–spring, weeks 1–29
- 2020 norms
- 154 matched PK–8 math growth events
- 148 math and 151 reading observations with usable projections
- Recalculated aggregate ratios approximately:
  - 1.69× math
  - 1.54× reading

Limitations:

- matched endpoint completers only;
- no entrant/leaver/attrition accounting;
- no campus/SES/accommodation breakdown;
- no untreated comparison;
- no independent analysis.

Future randomized Track B follow-up can decompose the public growth multiple:

- total observed multiple: offered growth / projected growth;
- counterfactual multiple: non-offered growth / projected growth; and
- attributable multiple: (offered − non-offered growth) / projected growth.

The adjusted score/SD difference remains the primary causal result because the
ratio depends on the projection/norm version and can be unstable when projected
growth is small.

No public independent peer-reviewed or credible quasi-experimental Timeback/Alpha/GT impact study was found.

## Privacy and Data

### GT Privacy Policy — April 2026

Public GT materials describe:

- tests and academic records;
- browser/app activity;
- screenshots and continuous screen recording;
- mouse/keyboard activity;
- microphone/system audio;
- webcam recording;
- precise geolocation;
- analytics and broad learning-app data; and
- purpose-based retention language without category-specific durations.

### Alpha Privacy Policy — August 2025

Alpha's separate policy additionally describes:

- eye-contact/body-language/engagement analysis;
- RFID/Bluetooth tracking;
- possible biometric processing; and
- general graduation/disenrollment plus 4–5-year retention, with limited
  retention for extended-capability data.

These Alpha statements must not be attributed to GT without confirmation that
the relevant policy and processing apply.

Across the reviewed public pages, material gaps include:

- no posted complete subprocessor list;
- no public SOC 2 report;
- no penetration-test summary;
- no detailed DPA;
- no encryption-at-rest specification;
- no breach-notification SLA;
- no detailed role/access matrix;
- no complete category-by-category retention schedule; and
- no independent privacy/security audit.

Timeback’s public technical documentation does not expose a standalone privacy/terms framework.

This is not a legal-compliance conclusion.

## Texas TEFA

### Public 2026–27 facts

- Standard participating-private-school award: $10,474
- Disability/IEP formula can raise total award up to $30,000
- Homeschool/other setting maximum: $2,000
- Priority tiers by disability and federal-poverty levels
- Oversubscription lottery and waitlist
- Funding exhausted within Tier 2 in the inaugural year
- School participation and private-school admission are separate
- Families may pay tuition above award
- Schools cannot raise price solely because a student receives TEFA
- Annual nationally normed testing required for participating private-school students in grades 3–12

### GT-specific unknowns

- Exact approved GT legal entity/provider
- Whether Georgetown and GT Anywhere approvals differ
- Accreditation/provider status
- Tuition and aid interaction
- Whether award offsets GT aid
- Testing compliance
- Disability-service practice
- Applicant awareness and award status

TEFA may reduce price but does not alter GT admissions, guarantee a seat, or establish program effect.

## Charter and External Record

- Arizona Unbound approved in December 2024 and opened in 2025; no independent first-year outcome review found
- Utah proposal not advanced in August 2024
- North Carolina proposal denied September 2024
- Arkansas proposal denied October/November 2024
- Pennsylvania proposal denied January 2025 with broad readiness deficiencies
- Texas SBOE vetoed Valenta Academy in June 2025

These decisions concern charter/application readiness, not causal validation of Alpha’s private campuses.

## Highest-Priority Questions for GT

1. Current authorized Track A rule/form/cutoff
2. Actual application fields and essay use
3. Grades, capacity, reviewer staffing, and Track B authority
4. Current Timeback/app/configuration manifest
5. Exact tuition, scholarships, TEFA handling, deposits, and transportation
6. Artifact/privacy/storage/retention/subprocessor rules
7. Whether independent evaluation and null-result publication are permitted
8. Whether common outcomes can be followed for non-enrolled applicants
9. Current MAP outcome cohort and attrition data
10. Treatment-package and fidelity changes across cohorts

## Key Sources

- GT homepage: https://gt.school/
- GT admissions: https://gt.school/admissions/
- GT About: https://www.gt.school/about-us
- GT programs: https://www.gt.school/programs
- GT academics: https://www.gt.school/academics
- GT privacy: https://www.gt.school/privacy-policy
- GT terms: https://www.gt.school/terms-of-use
- Reason June 2026: https://reason.com/2026/06/24/g-t-schools-bet-on-gifted-ed-cash-rewards-2-hours-of-ai-tutoring-no-lectures/
- Community Impact April 2026: https://communityimpact.com/austin/georgetown/education/2026/04/24/15-private-and-charter-school-options-available-to-georgetown-area-families/
- Timeback architecture: https://docs.timeback.com/beta/about-timeback/how-it-works
- Timeback API overview: https://docs.timeback.com/beta/api-reference/overview
- Alpha program: https://alpha.school/the-program/
- Alpha privacy: https://alpha.school/privacy-policy/
- Alpha 2024–25 NWEA report: https://go.alpha.school/hubfs/MAP%20Results%20-%2024%2025/2025%20NWEA%20MAP%20results.pdf
- NWEA ratio guidance: https://connection.nwea.org/s/article/overall-rit-explained
- Texas TEFA statute: https://capitol.texas.gov/tlodocs/89R/billtext/html/SB00002F.htm
- TEFA funding: https://educationfreedom.texas.gov/newsupdates/funding-timelines-and-installments/
- TEFA lottery: https://educationfreedom.texas.gov/newsupdates/lottery-update/
