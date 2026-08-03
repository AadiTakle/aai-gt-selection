# GT Stakeholder Interview & Knowledge-Gap Guide

**Purpose:** Turn our documented gaps into concrete questions for someone with real GT knowledge (admissions staff, program leadership, current students/families, or a domain/assessment expert). It exists so that when an interview opportunity arises, we can capture the highest-value facts quickly and convert placeholders into evidence.

**Status:** Working reference, not a canonical governance doc. It draws entirely from gaps already recorded in `docs/product/GT_ADMISSIONS_APPLICATION_MVP_PRD.md` (§ Blocker List, B-01–B-08) and `docs/research/ASSUMPTIONS_AND_EVIDENCE.md` (open/unverified entries). Answers feed back into those files.

**Owner:** Team. **Date:** 2026-07-20.

---

## How to use this

1. **Every prototype value that is fictional is a question here.** The prototype runs on synthetic placeholders; each placeholder maps to a blocker (`B-0x`) or open assumption (`E-0xx`). This guide asks the question whose answer would replace the placeholder with a fact.
2. **Match the section to the interviewee.** Don't ask a 14-year-old student about CogAT cutoff governance; don't ask an IT reviewer about a child's lived experience. § 3 groups questions by who can answer them.
3. **Record answers as evidence, not decisions.** After an interview, log each answer in `ASSUMPTIONS_AND_EVIDENCE.md` (update the E-ID status), update the relevant `B-0x` row in the PRD, and open a `DECISION_LOG.md` entry only if a requirement or scope changes. Label everything: verified fact vs. one person's belief vs. still open.
4. **Respect the boundaries.** We are building a *synthetic prototype*. Do not solicit real child data, real applicant records, or anything that would make the prototype look like live admissions. Questions about policy and process are fine; requests for live data are not (see B-06/B-07).

> **Interview-ethics note (mirrors our own R9 design):** if talking to students or families, get informed consent, explain it's for a synthetic capstone (not a real admissions decision), keep it optional, and don't tie any benefit to participation. This is exactly the SSP failure mode our consent firewall avoids (see `research/comparators/SSP_SELECTION_CASE_STUDY.md`).

---

## 1. Gap inventory (what we don't know, and why it matters)

Each row is an existing, documented gap. "Prototype placeholder" is what we currently assume; "If wrong" is the risk the interview reduces.

| Gap ID | The unknown | Prototype placeholder | Serves | If wrong |
|---|---|---|---|---|
| **B-01** | Current Track A workflow & CogAT: form/edition, cutoff value, battery/profile reading, retest policy, score-correction handling, base application flow | Fictional Track A rule, CogAT form, cutoff, retest, correction handling | R1, R5, R8 | Routing engine and "Track A unchanged" claim don't match reality |
| **B-02** | Actual ages, grades, and services offered | Grades 3–8, accelerated interdisciplinary program | R1, R8 | Target population / eligibility framing is off |
| **B-03** | Track B promising-band + battery-profile rule | Fictional CogAT band (composite 70–<90) / any battery ≥90 | R5, H1 | The invitation rule invites the wrong students |
| **B-04** | Talent domains, rubric anchors, passing rules | Math/STEM + music example anchors | R5, H1, H10 | Rubric may not measure capability defensibly |
| **B-05** | Number of reviewers & available training time | Simulated reviewer accounts | R8 | Blind-review workflow (2+1 / 3) may be unstaffable |
| **B-06** | Rules for child data, accessibility, consent, storage, security | Synthetic records, fixed artifacts | R9 | Privacy/consent design may violate real duties (E-038) |
| **B-07** | Allowed artifact types, file limits, storage, deletion | Fixed synthetic artifact fixtures; no uploads | R9, H10 | Artifact route can't go live as designed |
| **B-08** | Track B seats, seat scarcity, financial aid, MAP follow-up logistics, fee-waiver terms, evaluator data access, evaluation method | `allocation_undecided` status only | R2, R3, R8, H3, H6 | The whole future evaluation design may be infeasible |
| **E-010** | Applicant volume vs. constrained seats (funnel/capacity/yield) | Assumed sufficient | R8, H6 | Randomized/causal design may be underpowered |
| **E-011** | Will GT permit independent evaluation, preregistration, data access, null-result publication? | Assumed yes | R7, H5 | Credible causal evaluation may be impossible |
| **E-012** | Is a high-ceiling outcome instrument available & feasible? (MAP is the candidate) | Assumed MAP works | R6 | Growth may be unmeasurable for gifted range |
| **E-013** | Can the process run within GT's calendar & staffing? | Assumed operable | R8 | Concept may need narrowing |
| **E-014** | Can broader access be added without harming current high performers? | Assumed yes | H8 | Cohort/shared-program design may need protection |
| **E-026** | Do artifact vs. narrative routes have equivalent decision validity? | Assumed "no penalty" | R5 | "No penalty" could be a hidden bias |
| **E-027** | Can we meet WCAG 2.2 AA + construct-preserving accessible routes? | Assumed achievable | R9, H7 | Accessibility claims incomplete |
| **E-038** | COPPA/FERPA/PPRA/Texas privacy applicability to GT | Unresolved; synthetic-only | R9 | Could overclaim compliance or miss duties |
| **E-051/E-052** | Can the GT website link/host our app; can GT supply brand tokens? | Mode A + neutral theme | R8, R9 | Integration mode may change |

---

## 2. Priorities for a *first* conversation

If you only get 20–30 minutes, ask these — they unblock the most downstream work and are the hardest to guess:

1. **B-01 / B-03:** What is the current CogAT cutoff and how is it applied today (composite only? battery profiles? retests?)? *(Everything in routing hangs on this.)*
2. **B-08 / E-010:** How many students apply, how many seats exist, and is the program genuinely oversubscribed? *(Determines whether a lottery/randomized evaluation is even feasible — see the SSP comparator.)*
3. **E-011:** Would GT allow an independent evaluator, a pre-registered design, and publication of a null or negative result? *(If no, the causal-credibility core of the project is blocked.)*
4. **B-05 / E-013:** How many admissions reviewers are there, and how much time can they give to training + blind review during the cycle?
5. **B-06:** Who owns child-data privacy/consent decisions at GT, and what are the current rules? *(Gates any move beyond synthetic.)*

---

## 3. Question bank by interviewee

Questions are phrased to elicit *current reality*, not to lead. Each is tagged with the gap it closes. Follow-ups in italics.

### 3A. GT Admissions staff / operations (B-01, B-02, B-03, B-05, B-06, E-013)

**Current Track A process (B-01, B-02)**
- Walk me through what happens today from application to admission decision. Who touches it, and in what order?
- Which CogAT form/edition do you use, and what is the current cutoff? Is it a single composite score, or do battery/subscore profiles matter?
- *How do you handle retests, or a score that arrives late or looks like an error?*
- What ages/grades and which program(s) does this apply to right now?
- Roughly how long does a cycle take end to end, and what are the hard calendar deadlines?

**Volume, capacity, staffing (B-05, E-010, E-013)**
- About how many applications do you receive per cycle, and how many students can you actually admit/serve?
- Is the program oversubscribed — more qualified applicants than seats? By roughly how much?
- How many people review applications? Could they take on structured, calibrated blind review, and how much training time is realistic?
- Where does the current process feel most strained — what would break first if volume doubled?

**Corrections & fairness (B-01, R9)**
- Today, if a family says a fact or score is wrong, how do they fix it? Is there any appeal?
- What kinds of applicants do you feel the current single-test process *misses*?

### 3B. GT program leadership / evaluation sponsor (B-08, E-010, E-011, E-012, E-014, H-series)

**Evaluation appetite (E-011, R7, H5)** — the most important area for the project's core goal.
- Would GT be open to an *independent* evaluator designing and approving the outcome measure and analysis?
- Could selection rules and the analysis plan be locked/pre-registered *before* results are seen?
- Critically: would GT be willing to publish a result that shows **no effect or a negative effect**?
- Under what conditions (if any) would GT consider randomizing offers among equally qualified applicants — e.g., when there are genuinely more qualified applicants than seats? *(This is the SSP model; see the comparator doc.)*

**Seats, scarcity, money (B-08, E-010)**
- How are seats allocated today, and is there real scarcity?
- Is there a financial-aid budget, and how is aid decided? Does ability to pay ever influence admission?
- *For a future evaluation: could non-offered applicants be tracked over time, and would a fee-waiver incentive be feasible?*

**Outcomes & protection (E-012, E-014, H8)**
- What outcome would GT consider meaningful evidence that the program worked? Over what time horizon?
- Do you use MAP (or another high-ceiling test)? Is it administered on a schedule we could rely on?
- What's your concern about broadening access — could it affect students already thriving here?

### 3C. GT privacy / legal / IT (B-06, B-07, E-038, E-051, E-052, E-057, E-058)

**Data & consent (B-06, E-038)**
- Who at GT owns decisions about student-data collection, consent, storage, retention, and deletion?
- Are you subject to FERPA/COPPA/PPRA or Texas student-privacy rules? Who has ruled on that? *(We treat this as unresolved — E-038.)*
- What consent do families currently sign, and what does it cover?

**Artifacts & storage (B-07)**
- If families uploaded work samples (video, writing, images), what file types/sizes would be allowed, where would they be stored, and what's the deletion policy?

**Website & hosting integration (E-051, E-052, E-058)**
- What platform is the current GT website on, and could it link to — or embed — a separate application at its own subdomain?
- Could your team provide brand assets (colors, fonts, logo) as reusable tokens?
- Any constraints we should know about hosting on AWS (accounts, DNS, security review)?

### 3D. Current students / recent families (B-02, E-026, E-027, H9, H10, applicant experience)

*(Optional, consent-gated, synthetic-capstone framing — see interview-ethics note.)*
- What was the application like? What was confusing, burdensome, or unclear?
- Did you feel you had a fair chance to show what the student is capable of?
- *For families without a tidy "portfolio":* would describing the child's work in your own words feel doable? What would make that hard?
- Did anything about the process feel like it favored families with more time, money, or coaching?
- Were accommodations or language support available and easy to use?

### 3E. Domain / assessment expert (B-03, B-04, E-012, E-026)

- For CogAT, is a "promising band" just below the cutoff — or a strong single-battery profile — a defensible signal of capability? Where would you set it?
- For a talent-evidence rubric (domain expertise, learning rate, transfer, independence, recurrence, specificity): are these the right dimensions? What anchors distinguish a "2" from a "1"?
- Can artifact evidence and a structured narrative be scored equivalently, or does one systematically advantage some families (E-026)?
- Is MAP a valid high-ceiling growth measure for this population, and what are its ceiling/practice-effect limits (E-012)?

---

## 4. After the interview — closing the loop

For each answer captured:

1. **Update `docs/research/ASSUMPTIONS_AND_EVIDENCE.md`** — change the E-ID status (Unverified → Supported/Refuted), add the source (person/role + date), and note if a new assumption appeared.
2. **Update the PRD `B-0x` row** — replace the placeholder with the confirmed fact, or note it's still open.
3. **Add a `DECISION_LOG.md` entry** only if an answer changes a requirement, scope, or a locked synthetic value.
4. **Keep the label discipline:** one person's recollection is *company claim / independent context*, not a verified fact, until corroborated. A single staffer's memory of the cutoff is not the same as written policy.
5. **Never let an interview answer silently promote a synthetic value to "real"** without recording the source and its confidence.

---

## 5. What NOT to ask / collect

- No real applicant records, child data, scores, or uploads (B-06/B-07 keep us synthetic).
- Don't ask anyone to commit GT to a policy, seat count, or evaluation on the spot — we're gathering facts, not negotiating.
- Don't present the prototype as GT-endorsed or as a live system.
- Don't tie any student/family benefit to being interviewed.
