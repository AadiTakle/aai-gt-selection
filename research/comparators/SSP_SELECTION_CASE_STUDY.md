# Comparator Case Study — Summer Science Program (SSP International)

**Type:** External-program case study (prior art). Not GT policy, not an approved product direction.
**Why this is in the corpus:** SSP's 2026 admissions cycle is the closest real-world instance of the exact design pattern this project is built on — a contextual/holistic review that narrows a large pool to a *qualified* set, followed by a **randomized lottery among the qualified**, with the **waitlist used as a research control group** for an impact evaluation. It is simultaneously the best available proof-of-feasibility and the clearest cautionary tale for our consent/rights requirements.
**Serves (for reference use):** R2 (counterfactual), R3 (prospective causal question), R5 (capability standard), R8 (feasibility under real constraints), R9 (student protection), R10 (claim boundaries); H2, H3, H4, H7, H9, H10.
**Date compiled:** 2026-07-19.

> **Evidence labeling** (per `PROJECT_CHARTER.md` operating principle 1). Every claim below is tagged:
> **[VERIFIED]** = official (SSP.org or IRS Form 990) or reputable press; **[ESTIMATE]** = third-party/marketing-guide figure, unconfirmed; **[UNVERIFIED]** = asserted but not found in any source; **[INFERENCE]** = our reasoning from other numbers. Predictive validity is not program impact; before/after is not a counterfactual.

---

## 1. What SSP is

- **[VERIFIED]** Founded **1959** at The Thacher School (Ojai, CA) as a post-Sputnik response; historically a small residential summer research program for rising high-school seniors. (Wikipedia; ssp.org/mission-history)
- **[VERIFIED]** Research tracks: astrophysics, biochemistry (launched 2017), bacterial genomics (launched 2022), synthetic chemistry, and cell biology (new for 2026). (ssp.org)
- **[VERIFIED]** Structure: teams of 3; **36 students per campus**; residential, ~39 days. (ssp.org; Wikipedia)
- **[VERIFIED]** **Need-blind** admissions. Free for families earning **≤ $75,000**; discounts under **~$140,000**; select participants receive **$3,000 stipends**. (ssp.org/application)
- **[VERIFIED]** Underrepresented-in-STEM and prospective first-generation college students "especially encouraged" to apply. (ssp.org/application)

---

## 2. The selection funnel — original claim vs. verified numbers

The prompt that initiated this research described the funnel as: **~10,000 applicants → ~1,000 who would "benefit" → lottery ~700 seats → waitlist the rest.** How that holds up:

| Stage | Original claim | Status | What sources actually say |
|---|---|---|---|
| Applicants/yr | ~10,000 | **[UNVERIFIED]** | SSP says only "thousands of talented students apply." No official applicant count exists anywhere. |
| "Qualified" / would-benefit pool | ~1,000 | **[UNVERIFIED]** | Not disclosed. SSP identifies those "with the most to gain from and contribute to" the program but never publishes the pool size. |
| Admitted (lottery winners) | ~700 | **[VERIFIED]** | **720 participants in 2026** (largest ever), across **13 campuses / 20 sections**. SSP/application page says "around 700." |
| Waitlist | remainder | **[VERIFIED (mechanism)]** | Waitlist exists and doubles as the research control group; its size is not published. |

**Bottom line:** the *shape* of the described funnel is correct and matches SSP's own process description, but only the **~700 admits** figure is verifiable. The 10,000 and 1,000 numbers should be treated as illustrative placeholders, not facts.

**Acceptance rate — [ESTIMATE], and unreliable.** SSP publishes none. Third-party guides give wildly conflicting figures: 13–15% (based on the *pre-expansion* 108-seat model), ~10%, "<5% / fewer than 1 in 20," and 4–5%. Most predate the 2023 expansion, so they describe a different program.
- **[INFERENCE]** If 720 admits ≈ 4–5%, that implies ~14,000–18,000 applicants; if ≈ 10%, ~7,200. Both are arithmetic, not data. The true applicant count remains unknown.

---

## 3. The actual 2026 process (the significant change)

Historically SSP ran a straightforward competitive merit selection. **For 2026 it restructured admissions around a formal impact-evaluation study** with randomization. Four stages **[VERIFIED — ssp.org/2026evaluation]**:

1. **Apply** — free application; need-blind.
2. **Holistic / contextual review** — a committee of staff, volunteer alumni, and former faculty evaluates applications "holistically and in context," weighting **motivation, resources, and obstacles overcome**. Produces the set of students "who have the most to gain from and contribute to" the program.
3. **Parent permission + student assent** — advancing students need **both** parental consent and student assent to join the evaluation study.
4. **Lottery** — consenting qualified students are **randomized** into a program invitation or a **waitlist** (the research control group). Some waitlisted students are admitted if seats open.

Selection criteria that survive into the decision: demonstrated interest/motivation, academic preparation *read in context* (resources and obstacles, not raw prestige), and contribution to the cohort. Financial need is explicitly excluded from selection (need-blind).

---

## 4. The evaluation study

- **[VERIFIED]** **Design:** lottery-based randomization; **waitlist = control group** ("compare students who attend the program with those who do not").
- **[VERIFIED]** **Instruments:** a 60-minute online survey pre (April 2026) and post (end of summer), measuring **"scientific thinking and social-and-emotional skills"**; plus student writing, application/demographic data, program administrative data, and student-created work.
- **[VERIFIED]** **Who runs it:** conducted by **Abt Global** (external research firm); ethics oversight by **Abt Global's own IRB** (notably *not* a university IRB); SSPI sponsors. Data on Qualtrics/Embark/Canvas. Contact: reval@ssp.org.
- **[VERIFIED]** **Safeguards:** "minimal risk"; names used only to match pre/post then replaced with a code; group-level reporting only; **withdraw anytime without penalty** (and may remain in the program); students **paid** for survey time (amount unspecified).
- **[VERIFIED — as a gap]** **No public preregistration.** Searches of the AEA RCT Registry, OSF, and clinicaltrials.gov returned nothing for SSP or the Abt lottery study; no published protocol, sample-size target, or power analysis is available. (A registration could exist unindexed, but none was found.)

---

## 5. Organizational scale & the money (context for feasibility, R8)

The 2026 change did not happen in a vacuum — it followed a transformational windfall.

- **[VERIFIED — press, AP/WaPo]** In **2023 SSP received a ~$200M bequest** from the estate of **Franklin Antonio** (SSP alum '69, Qualcomm co-founder) — ~20% of an estate "well north of $960M"; a first payment of $65M was unrestricted. Pre-bequest annual budget was **~$2M**.
- **[VERIFIED — IRS Form 990 via ProPublica, EIN 94-3341965]** Revenue / expenses / assets by fiscal year:

| FY | Revenue | Expenses | Assets |
|---|---|---|---|
| 2011 | $373K | $379K | $2.48M |
| 2015 | $617K | $637K | $3.35M |
| 2018 | $1.48M | $892K | $4.64M |
| 2021 | $1.61M | $820K | $6.77M |
| 2022 | $2.21M | $1.87M | $5.85M |
| **2023** | **$198.9M** | $3.31M | $202.1M |
| Sept 2024 | $9.25M | $8.21M | $205.0M |
| Dec 2024 | $963K | $1.07M | $203.3M |

- **[VERIFIED]** Growth trajectory: ~204 students served ~2022 → post-bequest expansion → **720 in 2026** (largest class). Alumni total **4,300+**.
- **[ESTIMATE]** SSP does not publish a tuition figure; one third-party guide cites "$7,500 / six weeks," "~$8,800 per participant," "~40% receive aid" — unconfirmed.

**Why this matters for us:** SSP could adopt a randomized-lottery evaluation partly *because it is now richly endowed and oversubscribed* — genuine seat scarcity plus resources for an external evaluator. That maps directly to our **R8 feasibility** dependencies and the PRD's note (B-08) that "sufficient Track B demand/oversubscription… is an external GTM assumption." SSP is an existence proof that the design is operable — under those specific conditions.

---

## 6. Critiques, tensions, and open questions

**Access limitation to record honestly:** we found **no published, attributable backlash** (news, op-ed, or blog) naming the 2026 consent/lottery change. Reddit — the most likely venue (r/ApplyingToCollege, r/SummerProgramResults) — is **blocked to our search crawler**, so community reaction could not be captured. Absence of found criticism is *not* evidence of absence. The critiques below are therefore drawn from (a) tensions visible in SSP's own wording and (b) the general research-ethics literature, not from documented complaints.

1. **Consent-as-coercion (the sharpest issue). [VERIFIED tension]** Study participation is a **condition of admission eligibility** — decline and you are excluded from both the program *and* the waitlist — yet SSP also calls joining "completely your choice." Those two framings appear on the same materials and contradict each other. Research-ethics literature holds that a choice architecture that forbids refusal is "profoundly coercive," acutely so for minors.
2. **Equipoise. [INFERENCE]** Randomizing seats is ethically clean only under genuine uncertainty that the program helps. A program that markets itself as transformative sits awkwardly beside "we're evaluating whether it works via a denied-access control group."
3. **IRB independence. [VERIFIED, flagged]** Oversight is by the *research contractor's own* IRB rather than an independent/university IRB — a structural conflict worth noting, though contractor IRBs are legal and common.
4. **Lottery fairness to vulnerable applicants. [INFERENCE / literature]** A pure lottery can disadvantage already-disadvantaged applicants who clear the bar but lose the draw; the literature suggests weighted assignment as a mitigation SSP does not appear to use.
5. **Waitlist-control validity threats. [literature]** Contamination, compensatory rivalry, and "resentful demoralization" of waitlisted students are known internal-validity problems.
6. **Selection-into-study bias. [INFERENCE]** Because only consent-willing students enter the lottery, the analyzed population is self-selected on consent-willingness — which can bias the very impact estimate the randomization is meant to produce cleanly.
7. **No preregistration. [VERIFIED gap]** Without a public protocol/power analysis, the study's falsifiability and claim discipline cannot be independently checked (our R7/R10 concern).

---

## 7. Direct relevance to the GT project

SSP 2026 is close to a natural template *and* a cautionary tale for our MVP:

| SSP feature | GT project parallel |
|---|---|
| Contextual review → identify "would benefit" → **randomize among qualified** → waitlist-as-control | Our **R2/R3/H3** design and the PRD two-stage evaluation (offer-vs-not-offered among equally eligible Track B candidates). |
| Separates *qualified* from *admitted-by-lottery* | Our **eligibility ≠ allocation** split and the `allocation_undecided` seam (B-08). |
| **Tied research consent to admission eligibility** (the coercion problem) | Exactly what our design **forbids**: **R9** ("research refusal does not secretly reduce ordinary admission rights") and the **consent firewall** (`synthetic_choice_event`) where grant/refusal/withdrawal alter *zero* admissions inputs. **Our design is the ethically corrected version of SSP's.** |
| Waitlist as comparison group | Matches PRD "non-offered candidates… comparison group," with MAP as the future common outcome. |
| Contractor IRB, no preregistration | Reinforces our **R7 preregistration / R10 claim-boundary** requirements and **H5 independent evaluator**. |
| Oversubscription enabled by ~$200M endowment | Concretizes our **R8 feasibility** dependency and the B-08 "demand/oversubscription is a GTM assumption" note. |

**Usable takeaway:** cite SSP as prior art that the randomized-among-qualified design is *operable in the real world*, while citing its consent-eligibility coupling as the concrete failure mode our consent firewall exists to prevent.

---

## 8. Open data gaps (for anyone extending this)

1. **Official applicant count** — unknown for any year; the ~10,000 figure is unverified. Would require SSP disclosure, a detailed 990 schedule, or press reporting.
2. **Qualified-pool / lottery-pool size** — not disclosed; needed to compute the true lottery odds.
3. **Study registration / protocol / power analysis** — none found; check AEA RCT Registry / OSF periodically as the study matures.
4. **Community/forum reaction** — Reddit is crawler-blocked; capturing r/ApplyingToCollege and r/SummerProgramResults threads needs manual browsing.
5. **Tuition & aid share** — no official dollar figure; third-party "$7,500 / ~40% aid" unconfirmed.

---

## 9. Sources

**Official (SSP / IRS):**
- https://ssp.org/2026evaluation/ — evaluation study design, consent, Abt Global, IRB
- https://ssp.org/application/ — ~700 admits, need-blind, aid thresholds, $3,000 stipend
- https://ssp.org/news/the-summer-science-program-begins-its-biggest-summer-yet/ — 720 students / 13 campuses / 20 sections, 2026
- https://ssp.org/mission-history/ , https://ssp.org/program-overview/ , https://ssp.org/faqs/
- https://projects.propublica.org/nonprofits/organizations/943341965 — IRS Form 990 filings 2011–2024 (EIN 94-3341965)
- https://www.causeiq.com/organizations/summer-science-program,943341965/ , https://www.guidestar.org/profile/94-3341965
- https://en.wikipedia.org/wiki/Summer_Science_Program

**Press:**
- https://www.science.org/content/article/surprise-200-million-bequest-has-tiny-summer-science-program-thinking-big
- https://www.washingtonpost.com/business/2023/11/01/stem-education-bequest-qualcomm-summer-science-program/ (AP mirror: https://phys.org/news/2023-11-summer-science-spent-million-year.html)

**Third-party estimates (UNVERIFIED — cite with caution):**
- https://www.collegebase.org/blog/summer-science-program-ssp-college-admissions
- https://pioneeracademics.com/news/guide-to-summer-science-program-for-high-school-students/
- https://riseglobaleducation.com/blogs/summer-science-program-ssp-hardest-to-get-into
- https://orieladmissions.com/how-to-get-into-ssp/
- https://www.inspiritai.com/blogs/ai-student-blog/how-ssp-acceptance-rate-can-affect-your-summer-science-program-experience

**Research-ethics literature (general, for §6):**
- Coercion, Consent, and Participation (arXiv 1907.13061)
- Ethical Considerations: Waitlist Controls (SAGE, 2020) — gibsonresearchinstitute.org
- J-PAL — Ethical conduct of randomized evaluations
- IES — Lottery-based evaluation of public school choice
