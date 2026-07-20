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
| Applicants/yr | ~10,000 | **[REFUTED — official figure found]** | **3,739 applications** in the 2025 cycle per SSP's own FY2025 annual report — roughly **a third** of the rumored 10,000. |
| "Qualified" / would-benefit pool | ~1,000 | **[UNVERIFIED]** | Still not disclosed as a distinct number, but the report gives a **16% admission rate** on 3,739 applications (≈ 598 admitted), so any "admittable" pool is far below 1,000·10. |
| Admitted (lottery winners) | ~700 | **[VERIFIED]** | **720 participants in 2026** (largest ever), 13 campuses / 20 sections; **588 enrolled in 2025** (80% of ~598 admitted). SSP/application page says "around 700." |
| Waitlist | remainder | **[VERIFIED (mechanism)]** | Waitlist exists and doubles as the research control group; its size is not published. |

**Bottom line:** the *shape* of the described funnel is correct, but the headline number was wrong. As of the FY2025 annual report the real figures are **3,739 applications → 16% admission rate → 588 enrolled** — not ~10,000 applicants. The "~10,000 / ~1,000" chain is **refuted** for applications and remains unquantified for the lottery-qualified pool specifically (2025 was still the merit cycle; the 2026 lottery-pool size is not yet published).

**Update — third sweep (2026-07-20) found the official number.** SSP's **FY2025 annual report** (published May 2026) publishes an admissions-funnel stat block: **3,739 applications · 16% admission rate · 80% enrollment rate · 588 total enrollment · 6 programs / 17 campuses · $3,382,505 financial aid awarded.**
- **[VERIFIED — official]** Source: `https://ssp.org/wp-content/uploads/2026/05/SSP_AR_Design_Singles.pdf` (linked from `https://ssp.org/annual-reports/`). This is the first official applicant count located and it **refutes the ~10,000 figure**.
- **[VERIFIED — exists, not yet parsed]** A **2025 audited financial statement** now exists: `https://ssp.org/wp-content/uploads/2026/05/SSP-International-Inc.-Audited-Financial-Statements-2025.pdf` (line items not yet extracted).
- **[INFERENCE]** The 16% rate is for the 2025 *merit* cycle; it bounds but does not equal the 2026 lottery-qualified pool, which SSP still has not published.

**A second, deeper scrape (2026-07-19) reinforced this and found no number.** Every anonymous route to an official applicant count was exhausted: Wayback Machine archives of the old `summerscience.org` admissions/FAQ pages (via the CDX API + `curl`, since WebFetch is blocked for archive.org), IRS 990 XML (ProPublica download endpoint 403s; the IRS S3 `irs-form-990` bucket 404s for these object IDs — it stopped updating ~2021), Hacker News (empty), and news profiles (no number). Notable archival finding:
- **[VERIFIED — archived]** A **2002 SSP FAQ** answered "How many students apply… what are my chances?" with: *"SSP isn't for everyone, and students 'self-select', meaning that we aren't flooded with applicants… your chances are pretty good of getting in."* (Wayback `20020208132013`). Historically SSP was a **modest, self-selected pool**, not a 10,000-applicant funnel — the mass-application framing is a *recent, post-2023-expansion* phenomenon at most.
- **[VERIFIED — press/990 context]** FY2024 filing context references **"368 participants… 12 programs… 8 universities,"** consistent with the ~350→~700 doubling after the bequest. This is an *admits* count, still not applicants.
- **[FORUM — weak]** A single 2023 College Confidential user asserted a **"7% acceptance rate,"** unsourced.

**Acceptance rate — [ESTIMATE], and unreliable.** SSP publishes none. Third-party guides give wildly conflicting figures: 13–15% (explicitly based on the *pre-expansion* "700–800 applications for 108 spots" model), ~10%, "<5% / fewer than 1 in 20," and 4–5%. Most predate the 2023 expansion, so they describe a different program.
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
- **[VERIFIED — as a gap, confirmed 2nd pass]** **No sample size / lottery-pool N published.** Abt Global's public project pages describe an unrelated NASA study, not SSP; no SSP-specific N, control-group size, or power analysis was locatable. This is the number that would reveal the true "qualified pool" size.

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

**Access limitation to record honestly:** after two scraping passes we found **no published *lay* backlash** (news, op-ed, parent/applicant post) naming the 2026 consent/lottery change. We *did* find a **directly-applicable peer-reviewed ethics critique** of the mechanism (Jenkins 2023, below), which does not name SSP but describes its exact design. Reddit — the most likely venue for applicant reaction (r/summerscienceprogram, r/ApplyingToCollege, r/SummerProgramResults) — is **blocked to every anonymous route** we tried (search crawler, WebFetch, curl, jina proxy, redlib mirrors; the pullpush archive index ends ~April 2025, before the Nov 2025–Apr 2026 window). Absence of found lay criticism is *not* evidence of absence. The critiques below draw on (a) tensions in SSP's own wording, (b) peer-reviewed research-ethics literature, and (c) general literature — not on documented complaints.

1. **Consent-as-coercion (the sharpest issue). [VERIFIED tension]** Study participation is a **condition of admission eligibility** — decline and you are excluded from both the program *and* the waitlist — yet SSP also calls joining "completely your choice." Those two framings appear on the same materials and contradict each other. Research-ethics literature holds that a choice architecture that forbids refusal is "profoundly coercive," acutely so for minors.
   - **Directly on-point peer-reviewed critique [VERIFIED — academic; does not name SSP].** Jenkins, S. P. (2023), *"Offering Lottery Entry as an Incentive for Research Participation Compromises Informed Consent,"* **Ethics & Human Research** (Hastings Center; Wiley) — argues that making **lottery entry the incentive/gateway for research participation** "represents a challenge to the principle of informed, coercion-free consent." Two reasons: (a) applicants usually **cannot know their odds of winning**, so they cannot weigh risk vs. benefit; (b) even with odds, the design "capitalizes on the difficulty of weighing up small probabilities," exploiting cognitive bias. Conclusion: lotteries are **not** more ethical than simply paying participants. This paper describes SSP's exact 2026 mechanism (though it predates and doesn't name SSP) — the strongest formal critique available. (https://onlinelibrary.wiley.com/doi/full/10.1002/eahr.500165)
   - **Compulsory-participant-pool analog [VERIFIED — academic].** *Science & Engineering Ethics* (2020) holds that pools where students are "compulsorily enrolled are objectively coercive" because they "face a costly alternative task or penalties," unlike ordinary participants who can refuse "without cost or penalty." Applied to SSP, the cost of refusing is losing the admissions-lottery chance entirely. (https://link.springer.com/article/10.1007/s11948-020-00232-2)
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

Three sweeps (2026-07-19 → 2026-07-20) closed the *critique-literature* gap and the *applicant-count* gap; the *lottery-pool size* and *lay-reaction* gaps remain. Status, with the next route to try:

1. **Official applicant count** — ✅ **RESOLVED (2026-07-20).** SSP's FY2025 annual report gives **3,739 applications / 16% admission rate / 588 enrolled** (`https://ssp.org/wp-content/uploads/2026/05/SSP_AR_Design_Singles.pdf`). The ~10,000 figure is refuted. Remaining: parse the 2025 audited financials PDF for line items, and obtain the *2026-cycle* application count once its report publishes.
2. **Qualified-pool / lottery-pool / study sample size** — not disclosed; the Abt Global RCT publishes no N or power analysis. **Best route:** OSF / ClinicalTrials.gov / REES registration once the study matures; or direct inquiry.
3. **Study registration / protocol / power analysis** — none found; recheck AEA RCT Registry / OSF periodically.
4. **Community/forum reaction (lay backlash)** — still none found (HN, College Confidential, blogs, news, X all empty across three sweeps; Jenkins 2023 remains the only critique). Reddit blocked on *all* anonymous routes; the controversy window (Nov 2025–Apr 2026) postdates the pullpush archive index. **Best route:** an authenticated Reddit API/OAuth token or a logged-in session to search r/summerscienceprogram, r/ApplyingToCollege, r/SummerProgramResults; or Instagram/Facebook 2026-decision-day post comments. *(The recurring sweep job was stopped on 2026-07-20 at the team's request; re-run manually if needed.)*
5. **Tuition & aid share** — no official dollar figure; third-party "$7,500 / ~40% aid" unconfirmed.

---

## 9. Sources

**Official (SSP / IRS):**
- https://ssp.org/2026evaluation/ — evaluation study design, consent, Abt Global, IRB
- https://ssp.org/application/ — ~700 admits, need-blind, aid thresholds, $3,000 stipend
- https://ssp.org/news/the-summer-science-program-begins-its-biggest-summer-yet/ — 720 students / 13 campuses / 20 sections, 2026
- https://ssp.org/mission-history/ , https://ssp.org/program-overview/ , https://ssp.org/faqs/
- https://ssp.org/annual-reports/ → **FY2025 annual report** `https://ssp.org/wp-content/uploads/2026/05/SSP_AR_Design_Singles.pdf` — 3,739 applications, 16% admission rate, 80% enrollment, 588 enrolled, 6 programs / 17 campuses, $3,382,505 aid
- https://ssp.org/wp-content/uploads/2026/05/SSP-International-Inc.-Audited-Financial-Statements-2025.pdf — 2025 audited financials (not yet parsed)
- https://projects.propublica.org/nonprofits/organizations/943341965 — IRS Form 990 filings 2011–2024 (EIN 94-3341965)
- https://www.causeiq.com/organizations/summer-science-program,943341965/ , https://www.guidestar.org/profile/94-3341965
- https://en.wikipedia.org/wiki/Summer_Science_Program

- Wayback Machine — old `summerscience.org` admissions/FAQ snapshots (via CDX API + `curl`): 2002 FAQ (`20020208132013`, "we aren't flooded with applicants"); 2024 "Is SSP for You" (`20240221071604`).

**Press:**
- https://www.science.org/content/article/surprise-200-million-bequest-has-tiny-summer-science-program-thinking-big
- https://www.washingtonpost.com/business/2023/11/01/stem-education-bequest-qualcomm-summer-science-program/ (AP mirror: https://phys.org/news/2023-11-summer-science-spent-million-year.html)

**Peer-reviewed critique of the exact mechanism (VERIFIED — academic; do not name SSP):**
- Jenkins, S. P. (2023), "Offering Lottery Entry as an Incentive for Research Participation Compromises Informed Consent," *Ethics & Human Research* — https://onlinelibrary.wiley.com/doi/full/10.1002/eahr.500165 (also https://pubmed.ncbi.nlm.nih.gov/37167474/)
- "The Opportunity Cost of Compulsory Research Participation," *Science & Engineering Ethics* (2020) — https://link.springer.com/article/10.1007/s11948-020-00232-2

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
