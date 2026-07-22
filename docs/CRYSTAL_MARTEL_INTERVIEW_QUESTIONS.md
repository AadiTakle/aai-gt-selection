# Interview Questions — Crystal Martel, Director of Admissions, GT School

**Interview date:** 2026-07-23 (tomorrow). **Prepared:** 2026-07-22.

**Who she is / why she's the right person:** Crystal Martel is the **new Director of Admissions** for GT School — the single best source for the operational, policy, and data blockers our prototype currently fills with synthetic placeholders. This session is our chance to convert placeholders into facts.

**Purpose:** These questions are derived directly from the **External Blocker List (B-01 – B-08)** and open assumptions in `docs/GT_ADMISSIONS_APPLICATION_MVP_PRD.md` (§ Role Assignments, Milestones, and External Blockers). The priority — per the request — is **hard statistics and data**: the current CogAT cutoff and how it's applied, current-cohort score distributions, applicant/seat volumes, and the numbers that determine whether our routing engine and any future evaluation are even feasible.

**How to use:** Ask for *current reality*, not aspiration. Record every answer as **evidence, not decision** — after the interview, update the matching `B-0x` row in the PRD and log entries in `docs/ASSUMPTIONS_AND_EVIDENCE.md`. Label each answer: *verified fact* vs. *her belief/estimate* vs. *still open*.

> **Boundary (B-06/B-07):** We are building a *synthetic* prototype. Ask for policy, process, aggregate statistics, and de-identified distributions. **Do NOT request real individual child records, named applicant files, or raw student-level data.** Aggregate/summary numbers ("what's the median composite," "how many applied") are fine; a spreadsheet of named students is not.

---

## 0. Priority asks — if the meeting gets cut short, get these five

These are the highest-value, hardest-to-guess data points. Everything downstream (routing engine, Track B band, evaluation feasibility) depends on them.

1. **CogAT cutoff (B-01, B-03):** What is the exact current cutoff, which form/edition, and is it a single composite or do battery profiles matter?
2. **Current cohort score data (B-01, B-03):** Can you share the *distribution* of admitted students' CogAT scores (median, range, percentile band) — de-identified/aggregate?
3. **Applicant vs. seat volume (B-02, B-08):** How many apply per cycle, how many seats exist, and is the program genuinely oversubscribed?
4. **Who/what the current test misses (B-03, equity):** Which capable students does the single-cutoff process fail to catch today?
5. **Data & decision ownership (B-06, B-08):** Who owns child-data privacy, seat allocation, and financial-aid decisions?

---

## 1. CogAT cutoffs & scoring — the core data gap (B-01, B-03) `[GT INFO]` `[TESTING RULE]`

*This is the single most important section. Our entire Track A routing engine and Track B invitation rule are placeholders until we know these numbers.*

**The cutoff itself**
- Which **CogAT form/edition** do you currently use (Form 7? Form 8?), and which **levels** for which grades?
- What is the **exact cutoff score** for admission today? Is it expressed as a **Standard Age Score (SAS)**, a **percentile**, or a stanine?
- Is eligibility based on the **composite (VQN) score only**, or do the individual **Verbal / Quantitative / Nonverbal battery scores or profiles** matter? *(If profiles matter — what specific rule?)*
- Do you apply the cutoff as a **hard line**, or is there a **confidence band / SEM allowance** around it (e.g., accept within a few points)?
- Is there a **lower or alternate cutoff** for any subgroup (e.g., disadvantaged, ELL, or a "Plan B"-style threshold)?

**Current-cohort score data (aggregate / de-identified)**
- For the most recent admitted cohort, what is the **median and range** of CogAT composite scores? What percentile band do admitted students typically fall in?
- What does the **score distribution of *applicants*** (not just admits) look like — how many cluster right around the cutoff?
- How many students each cycle land in a **"near-miss" band** just below the cutoff? *(This is exactly the Track B promising-band population — B-03.)*
- Roughly what **percentage of applicants meet the cutoff**?
- Do you track how CogAT scores correlate with **later performance** in the program? Any data on that?

**Score handling & mechanics**
- How are scores **delivered to you** — through a testing portal/provider? Which one? Do you import, or hand-enter them?
- What is your **retest policy** — can a student retake, how often, and which score counts?
- If a score **arrives late, looks like an error, or a family disputes it**, how is that corrected today? Is there an appeal?

---

## 2. The current Track A process, end to end (B-01, B-02) `[GT INFO]`

- Walk me through **what happens today** from a family starting an application to a final admission decision — who touches it, in what order?
- Which **ages, grades, and program(s)** does this apply to right now? *(Our prototype assumes grades 3–8 interdisciplinary — is that right?)*
- What **base application** does a family complete before/around the CogAT step (fields, documents, household info)?
- Is there an **external testing-portal handoff** (family leaves your site to schedule/take CogAT and returns)? What does that flow look like?
- How **long does a full cycle take**, and what are the **hard calendar deadlines** (application open/close, testing windows, decision dates)?
- Where does the current process feel **most strained or manual** — what would break first if applications doubled?

---

## 3. Volume, seats & scarcity — feasibility data (B-02, B-08, E-010) `[GT INFO]` `[FUTURE DECISION]`

*These numbers determine whether a future randomized/lottery evaluation is even statistically feasible.*

- About how many **applications per cycle**, and how many students can you actually **admit and serve** (seats)?
- Is the program **oversubscribed** — more qualified applicants than seats? By roughly how much (e.g., 2 applicants per seat)?
- How are **seats allocated** today when qualified applicants exceed seats — first-come, score rank, rolling, waitlist?
- Is there a **waitlist**, and how large is it typically? *(A waitlist is a natural comparison group for evaluation.)*
- Are seat counts **stable year to year**, or growing/shrinking?

---

## 4. Track B / broadened access & what the test misses (B-03, B-04) `[GT INFO]` `[TESTING RULE]`

- Do you already have any pathway for **promising students who don't clear the CogAT cutoff**? If so, how does it work?
- In your experience, **which capable students does the single-test process miss** — and can you characterize them (background, grade, profile)?
- If GT wanted to evaluate students on **talent domains** (e.g., math/STEM, music, writing) beyond CogAT, what domains matter most for your program?
- Who would be the **domain experts / evaluators** GT would trust to judge non-test evidence (work samples, portfolios)?
- What would make you **confident vs. skeptical** that an alternative-evidence route is fair and rigorous?

---

## 5. Reviewers & staffing (B-05, E-013) `[GT INFO]`

- How many people **review applications** today? What are their roles/qualifications?
- Could reviewers take on **structured, calibrated blind review** (e.g., 2 independent reviews + a tiebreaker)? How much **training time** is realistic during a cycle?
- Where are reviewers **most time-constrained**?

---

## 6. Financial aid, fees & equity levers (B-08) `[FUTURE DECISION]` `[PRIVACY]`

- Is there a **financial-aid budget**, and how is aid decided? Does **ability to pay ever influence admission**?
- What **household-income / household-count definitions** do you use for any aid or fee decisions?
- Is there an **application or testing fee**? A **fee-waiver** program? What are the terms?
- *(Future evaluation:)* Could **non-offered applicants be tracked over time**, and would a fee-waiver or similar incentive be feasible to support that?

---

## 7. Data privacy, consent & ownership (B-06, B-07) `[PRIVACY]` `[GT INFO]`

- Who at GT **owns decisions** about student-data collection, consent, storage, retention, and deletion?
- Are you subject to **FERPA / COPPA / PPRA or Texas student-privacy** rules? Who has ruled on that? *(We currently treat this as unresolved — E-038.)*
- What **consent** do families sign today, and what does it cover?
- If families uploaded **work samples** (video, writing, images), what file types/sizes would be allowed, where stored, and what deletion policy?

---

## 8. Evaluation appetite — the project's core question (E-011, B-08) `[FUTURE DECISION]`

*Ask if leadership-level appetite is in scope for her role; otherwise flag for a leadership follow-up.*

- Would GT be open to an **independent evaluator** helping design and approve the outcome measure and analysis?
- Could selection rules and the analysis plan be **locked/pre-registered before results are seen**?
- Would GT be willing to **publish a result showing no effect or a negative effect**?
- Under what conditions (if any) would GT consider **randomizing offers among equally qualified applicants** when there are more qualified applicants than seats?
- Do you use **MAP (or another high-ceiling growth test)** on a reliable schedule that could serve as an outcome measure?

---

## 9. Open door — her perspective

- As the **new** director, what would you **change** about the current admissions process if you could?
- What do you think GT admissions does **well** today that we should be careful not to break?
- What haven't we asked that we should have?

---

## Post-interview checklist

- [ ] Update `B-01`–`B-08` rows in `docs/GT_ADMISSIONS_APPLICATION_MVP_PRD.md` with each answer, labeled verified / belief / open.
- [ ] Log evidence entries in `docs/ASSUMPTIONS_AND_EVIDENCE.md` (update E-IDs, esp. E-010, E-011, E-012, E-038).
- [ ] Open a `docs/DECISION_LOG.md` entry only if an answer changes a requirement or scope.
- [ ] Do NOT paste any real student-level data into the repo — record only aggregate figures and policy facts.
