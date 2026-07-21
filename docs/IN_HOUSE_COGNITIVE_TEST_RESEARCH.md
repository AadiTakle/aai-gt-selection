# In-House Cognitive / Giftedness Test — Research Aggregation

**Purpose:** Mentor-directed pivot. GT School / Alpha School currently screen K-8 applicants with the **CogAT** (and have looked at the **CCAT**), both third-party instruments that carry a **~$100 per-student fee** paid to the vendor (Riverside owns CogAT; the "CCAT" line is a separate publisher). We want to **build our own K-8 cognitive-ability / giftedness screener** that (a) removes the third-party fee, and (b) is **~2x better than CogAT** on the dimensions that matter (measurement accuracy, thoroughness of construct coverage, adaptivity, and fairness).

**This doc is the running aggregation** of a recurring background research loop. Each sweep appends findings under the matching research question. Do NOT duplicate prior findings. This is a raw, labeled evidence pile to curate — NOT a design decision or approval to deploy a live test.

**Owner:** Team. **Started:** 2026-07-21. **Related prior work:** `docs/COGAT_GAPS_AND_TEST_SUITE_REPORT.md` (which *external* tests to use), `docs/EVIDENCE_DOSSIER.md` (admissions-overhaul thesis), `docs/HOLISTIC_GIFTEDNESS_EVIDENCE_REPORT.md`.

> **CRITICAL LEGAL/IP NOTE (carry into every sweep):** CogAT, CCAT, NNAT, OLSAT, WISC, etc. are copyrighted. We can research *what constructs they measure and what psychometric properties make them defensible*, and build an original instrument on the same public science (item-response theory, reasoning constructs, norming). We must NOT copy items, item formats verbatim, or normed content. Flag any finding that edges toward copying.

> **Evidence labeling** (keep the discipline even in a fast scrape):
> **[VERIFIED]** peer-reviewed / official technical manual / publisher psychometric doc · **[PRESS]** reputable journalism · **[ESTIMATE]** vendor marketing / advocacy, weaker · **[INFERENCE]** our reasoning · **[UNVERIFIED]** claimed, source not yet confirmed.
> Reliability ≠ validity ≠ fairness. A number defends a claim only if it measures what the claim asserts. "2x better" must be defined on a specific, measurable axis — name it.

---

## The research questions (map every finding to one)

| # | Question | Why it matters for our build |
|---|----------|------------------------------|
| **Q1** | **What are CogAT and CCAT** — structure, subtests/batteries, constructs measured, format, admin, grade coverage? | Defines the baseline we must match then beat |
| **Q2** | **What makes them "accurate"** — reliability (internal/test-retest), validity (predictive/construct), norming samples, standard error, cut-score behavior? | These are the numbers our instrument must equal or exceed to be credible |
| **Q3** | **How do they gauge adaptability during the test** — adaptive/CAT mechanics, item difficulty routing, working within time limits, stopping rules? | The user specifically wants "adaptability while taking the test" understood and improved |
| **Q4** | **Difficulty level & construct calibration for K-8** — how items are pitched by grade band, verbal/quant/nonverbal balance, floor/ceiling by age? | Our population is K-8; item difficulty must be right per grade |
| **Q5** | **How to make ours 2x BETTER** — what to test (construct coverage: spatial, working memory, fluid reasoning, adaptivity) and how to test it (CAT, multi-session, process data) to beat CogAT on accuracy + thoroughness + fairness | The design thesis; must be measurable, not vibes |
| **Q6** | **Feasibility, cost, IP & operational** — cost of building/norming our own; legal boundaries vs. copyrighted items; platforms/IRT tooling; what "fee bypass" realistically requires (norming is the expensive part) | Reality-check the "bypass the $100 fee" goal |

---

## Q1 — What are CogAT and CCAT (structure & constructs)

- **[VERIFIED]** CogAT (Riverside Insights) is organized into three batteries — Verbal, Quantitative, Nonverbal — each with three subtests (nine total), using three different subtest formats per battery to increase fairness/validity. Subtests: Verbal = Verbal Classification, Sentence Completion, Verbal Analogies; Quantitative = Number Analogies, Number Series, Number Puzzles; Nonverbal = Figure Matrices, Paper Folding, Figure Classification. (Source: EBSCO Research Starters, "Cognitive Abilities Test (CogAT)" — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[VERIFIED]** CogAT Form 7 was introduced in 2011, Form 8 in 2017; the forms are parallel/equivalent (same item counts, timing, scoring) allowing immediate retesting by interchanging forms. The line descends from the 1954 Lorge-Thorndike Intelligence Tests. (Source: EBSCO Research Starters — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[VERIFIED]** CogAT spans ten levels covering K-12. A Primary Edition (K-grade 2, Levels 5/6-8) uses picture-based items for the verbal subtests (no reading required); a Multilevel Edition (Levels 9-17/18) uses text-based verbal items. (Source: EBSCO Research Starters — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[VERIFIED]** Total administration is ~140-170 min (Primary Edition) and ~145 min (Multilevel); CogAT is a "power" test with generous per-subtest limits rather than strict speeding. (Source: EBSCO Research Starters — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[PRESS]** At Level 10 (grade 4) and above, each of the nine subtests is allotted 10 minutes, so a full administration runs ~2.5-3 hours including setup. (Source: TestingMom, "CogAT Test" — https://www.testingmom.com/tests/cogat-test/)
- **[PRESS]** The CCAT (Canadian Cognitive Abilities Test, Form 7; publisher Nelson) is the Canadian counterpart to CogAT — same three batteries and nine subtests, normed on Canadian students; Primary Edition ~118 questions, Multilevel Edition ~170 (grade 3) to ~176 (grades 4+) items. (Source: TestingMom "CCAT Test" — https://www.testingmom.com/tests/ccat-test/ ; GiftedReady — https://www.giftedready.com/canadian-cognitive-abilities-test-ccat/)

## Q2 — What makes them "accurate" (reliability, validity, norming)

- **[VERIFIED]** The Standard Age Score (SAS) is a normalized standard score with mean = 100, SD = 16, reported per battery and for the composite; age norms cover ages 4 yr 11 mo to 21 yr 7 mo. (Source: EBSCO Research Starters — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[VERIFIED]** KR-20 internal-consistency reliabilities run in the high 0.90s for Verbal and Nonverbal and low 0.90s for Quantitative; across the standardization sample composite reliability estimates ranged .91-.95 (Verbal), .91-.94 (Nonverbal), .91-.94 (Quantitative). (Source: EBSCO Research Starters — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[VERIFIED]** CogAT Form 7 was co-normed with the Iowa Assessments (Form E) on the same population, enabling direct ability-achievement comparison; norms available for 2011 or 2017 norm year (2017 is scoring default). (Source: Riverside Insights, CogAT 7/8 Complete Norms & Score Conversions Guide — https://onlinehelp.riversideinsights.com/Help/Elevate/assets/docs/CogAT_78_COMP_NandSC_Guide_091820.pdf)
- **[VERIFIED]** Validity evidence includes confirmatory factor analysis plus convergent correlations with WISC-V and Woodcock-Johnson IV Cognitive (WJ-IV COG), and strong correlation with the co-normed Iowa achievement tests (ITBS/ITED). (Source: EBSCO Research Starters — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[UNVERIFIED]** Norming sample reported as 65,350 U.S. K-12 students (Form 7) in secondary/vendor-derived text; not confirmed against the Riverside R&D Guide — treat as approximate. (Source: search aggregation citing Dunbar et al. 2011/2015; primary manual not directly accessed)
- **[UNVERIFIED]** Exact SEM values, test-retest coefficients, per-subtest item counts, and the composite (VAI) weighting formula were NOT located in accessible sources; they reside in the CogAT Form 7 Research & Development Guide / technical manual (Riverside), which was not directly readable. CogAT report confidence intervals are explicitly built from the SEM. (Source: EBSCO Research Starters notes CI use of SEM — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat) — **GAP: pull the R&D Guide next sweep.**

## Q3 — How they gauge adaptability during the test (CAT / adaptive mechanics)

- **[VERIFIED]** The CAT cycle re-estimates ability (maximum likelihood or Bayesian) after each response and selects the next item via the IRT item information function — "maximum information" picks the item with maximum Fisher information at the current ability estimate; Bayesian selection minimizes expected posterior variance. (Source: Song, *Korean J Med Educ* review, 2017 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5676016/)
- **[VERIFIED]** CAT test length averages ~50% shorter than paper-and-pencil at equal precision; multidimensional CAT with content balancing achieves equal precision with 25-40% fewer items than unidimensional CAT. (Source: Song, PMC review, 2017 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5676016/)
- **[VERIFIED]** Stopping rules fall in two families: variable-length (terminate when the SE of the ability estimate / posterior variance drops below a threshold) and fixed-length/classification (continue until the ability CI clears a cut-score or max item count is hit). (Source: Song, PMC review, 2017 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5676016/)
- **[VERIFIED]** Exposure control (avoid overusing items) includes randomly selecting the first few items from a subset of the bank. (Source: Song, PMC review, 2017 — https://pmc.ncbi.nlm.nih.gov/articles/PMC5676016/)
- **[VERIFIED]** Response latency is modeled with van der Linden's lognormal response-time model (2006), enabling speededness control; in adaptive testing, shadow-test constraints kept total testing time within <10 seconds of a reference test across conditions. (Source: van der Linden & Xiong, *J Educ & Behav Stat* 38(4):418-438, 2013 — https://journals.sagepub.com/doi/10.3102/1076998612466143 ; van der Linden, JEBS 31:181-204, 2006)
- **[VERIFIED]** MAP Growth (NWEA) is built on the Rasch (1-parameter IRT) model and a vertical RIT scale (~100-350); it selects each item for maximum information, targeting the difficulty where the student has ~50% chance correct, re-adjusts after each response, and terminates when SE falls below a set value, final RIT via maximum-likelihood. (Source: NWEA MAP Growth Technical Report, 2019 — https://www.nwea.org/uploads/2021/11/MAP-Growth-Technical-Report-2019_NWEA.pdf ; NWEA RIT help — https://teach.mapnwea.org/impl/maphelp/Content/AboutMAP/WhatRITMeans.htm)
- **[INFERENCE]** The paper/standard CogAT is NOT adaptive — fixed forms by level/grade — whereas MAP Growth adapts item-by-item; the trade-off is that CAT reaches a target SE with far fewer items because every item is targeted near current ability rather than spread across a fixed difficulty range. **Design implication: an adaptive in-house test is the single biggest lever for beating CogAT on efficiency + precision simultaneously.**

## Q4 — Difficulty level & construct calibration for K-8

- **[VERIFIED]** CogAT Form 7 spans 10 levels across K-12, three batteries × three subtests; the K-2 primary edition is teacher-paced and orally administered, and Form 7 shifted the two verbal primary subtests to a picture-based format (Picture Analogies, Picture Classification) to remove the need to read words to young children. (Source: Riverside CogAT Form 7 Short Guide for Teachers — https://www.aacs.org/wp-content/uploads/2012/10/CogAT-A-Short-Guide-for-Teachers.pdf ; EBSCO Research Starters — https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **[VERIFIED]** The picture/oral-to-text transition occurs at Level 9 (grade 3): Level 9 moves from picture-based teacher-paced verbal/quant subtests to text/numeric timed subtests; Level 8 mixes some upper-level-format items. (Source: Riverside CogAT Form 7 Score Interpretation Guide — https://www.riversidedatamanager.com/BalancedManagement/DigitalResources/Baggage_Files/CogAT/CogAT_7_SIG_v.2-1_092220.pdf)
- **[VERIFIED]** CogAT scoring uses a Universal Scale Score (USS) converted to age/grade norms (e.g., USS 155 = 53rd grade percentile in fall of Grade 1); Form 8 raw scores cross-walk to Form 7 norms — evidence of a common vertical scale across grade bands. (Source: CogAT 7/8 Norms & Score Conversions Guide, Riverside — https://onlinehelp.riversideinsights.com/Help/Elevate/assets/docs/CogAT_78_COMP_NandSC_Guide_091820.pdf)
- **[VERIFIED]** Grade-level standardized tests produce ceiling effects for gifted students (max score = apparent 99th percentile while masking true level); the field remedy is above-level/out-of-level testing, which raises the ceiling, increases score variability, improves reliability, and reduces regression to the mean. (Source: Warne, "Using Above-Level Testing to Track Growth," *Gifted Child Quarterly*, 2014 — https://journals.sagepub.com/doi/abs/10.1177/0016986213513793)
- **[VERIFIED]** Above-level testing originated with SMPY (administered the SAT to students ≤13 to escape grade-level ceilings) and remains standard in talent searches (Belin-Blank Exceptional Student Talent Search). (Source: Belin-Blank / University of Iowa — https://iro.uiowa.edu/esploro ; Keating & Stanley 1972; Warne 2012)
- **[UNVERIFIED]** NWEA typical test length (~40-50 items) and specific SEM target, and CogAT's exact IRT b-parameter calibration values, could not be confirmed (technical PDFs returned as binary / R&D Guide not retrievable as text). **GAP: extract these from the primary technical manuals next sweep.**

## Q5 — How to make ours 2x better (what to test + how to test it)

_(findings appended by sweeps below)_

## Q6 — Feasibility, cost, IP & operational reality

_(findings appended by sweeps below)_

---

## Sweep log

_(one line per sweep — timestamp, questions touched, # new findings, notable gaps to chase next)_
