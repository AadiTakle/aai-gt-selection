# What Makes a Good Cognitive Assessment — Design Guide (Topics + HOW They're Administered)

**Purpose:** A practitioner-facing guide that answers two questions for GT School's in-house K-8 test effort:
1. **WHAT** are the necessary, key ingredients of a *good* cognitive assessment — grounded in the published statistics of real, reputable instruments (which ones are accurate, which skills actually prove giftedness, and what supplementary research backs each)?
2. **HOW** are those skills actually tested — the concrete item formats, administration mechanics, timing, scoring, and delivery that reputable tests use to measure each construct?

The emphasis is on **HOW** — for every construct we say "measure X," this doc must record the actual question format and administration method a real test uses to measure it.

**Relationship to other docs:** This is the *design guide* companion to `docs/IN_HOUSE_COGNITIVE_TEST_RESEARCH.md` (the raw Q1-Q7 evidence pile + synthesis). That doc gathers evidence; THIS doc organizes it into "good-test ingredients + how to administer them." Do NOT duplicate — cite/extend. Also related: `docs/COGAT_GAPS_AND_TEST_SUITE_REPORT.md`.

**Owner:** Team. **Started:** 2026-07-22 (overnight loop). **Status:** Running aggregation — raw, labeled, NOT a design decision.

> **Evidence labeling:** **[VERIFIED]** peer-reviewed / official technical manual · **[PRESS]** reputable journalism · **[ESTIMATE]** vendor/advocacy · **[INFERENCE]** our reasoning · **[UNVERIFIED]** claimed, source not confirmed.
> Every "HOW" bullet should name the real instrument, the item format, and the administration mechanic — with a source. No invented numbers or URLs.
> **IP note:** research WHAT constructs and HOW formats work; never copy copyrighted items verbatim.

---

## How to read this guide

Each construct gets a block with three parts:
- **WHY it belongs on a good test** — the statistical/validity case (which reputable tests include it, effect sizes, predictive validity for giftedness/achievement).
- **HOW reputable tests administer it** — concrete item format(s), stimulus type, timing, response mode, grade adaptations.
- **DESIGN NOTE** — implication for our K-8 build.

---

## PART 1 — The reputable instruments we're learning from (the benchmark set)

*The benchmark set below is what "reputable and accurate" looks like in numbers — these are the reliability/validity/norming bars our instrument must approach to be credible. All map onto the shared CHC framework (last two bullets).*

- **[VERIFIED] Stanford-Binet 5 (SB5)** — Normed on 4,800 people ages 2-85+ (2000 Census-stratified); composite IQs (FSIQ/NVIQ/VIQ) reliabilities .95-.98, factor indexes .90-.92, subtests .84-.89; measures g via five factors (Fluid Reasoning, Knowledge, Quantitative Reasoning, Visual-Spatial, Working Memory) across Verbal/Nonverbal domains. Gold standard for wide-age-span + gifted ID (Extended IQ). (Source: Roid, 2003, SB5 Technical Manual/PRO-ED — https://www.proedinc.com/Products/13293E/sb5-virtual-technical-manual.aspx)
- **[VERIFIED] WISC-V** — Standardized on 2,200 children 6:0-16:11 (2012 Census); FSIQ split-half reliability .96, primary indexes .88-.93, subtests .80-.94; concurrent validity with WASI-II FSIQ r=.87; interscorer ICCs .97-.99. The gold-standard clinical child IQ battery (note: independent EFA, Canivez 2016, favors 4-factor over the published 5-factor model). (Source: Wechsler 2014, WISC-V Technical Manual, Pearson — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-tech-manual-supplement.pdf)
- **[VERIFIED] WPPSI-IV** — Normed on 1,700 children 2:6-7:7 (2010 Census); test-retest composite stability .86-.93; composite reliabilities .86-≥.90. Gold standard for preschool/early-primary cognition — directly relevant to our K-2 floor. (Source: Wechsler 2012, WPPSI-IV Technical Manual, Pearson — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wppsi-iv/wppsi-iv-technical-manual-supplement.pdf)
- **[VERIFIED] WJ-IV Cognitive** — Normed on 7,416 people ages 2-90+ (stratified age/sex/race/region/SES); GIA median reliability .97, Brief IA .94, broad CHC clusters median .86-.91. Most explicitly CHC-based battery; gold standard for co-normed cognitive-achievement discrepancy. Independent review: Gf-Gc reliability .94-.98 (median .96). (Source: McGrew, LaForte & Schrank 2014, WJ IV Technical Abstract — https://info.riversideinsights.com/hubfs/ASBs/WJIV_ASB_2_FINAL.pdf ; Canivez 2017 review — https://www.ux1.eiu.edu/~glcanivez/Adobe%20pdf/Publications-Papers/Canivez%20(2017)%20WJ%20IV%20Review.pdf)
- **[VERIFIED] KABC-II** — Normed on 3,025 children ages 3-18 (2001 Census; 2018 Normative Update); dual Luria (Mental Processing Index) and CHC (Fluid-Crystallized Index) models — excluding crystallized Knowledge in the Luria model is the lever for fair assessment of ELL/culturally-diverse learners. Gold standard for equitable/cross-cultural child assessment. Caveat: CHC factor scores add only 1-7% achievement variance beyond the global composite (McGill 2015). (Source: Kaufman & Kaufman 2004; APA 2018-36604-012 — https://psycnet.apa.org/record/2018-36604-012)
- **[VERIFIED] DAS-II** — Normed on 3,480 children 2:6-17:11 (2002 Census); General Conceptual Ability M=100 SD=15; CHC-aligned clusters (Gc/Gf/Gv/Gsm/Gs) plus a Special Nonverbal Composite for language-reduced assessment. Valued for cognitive strengths/weaknesses profiling. (Source: Elliott 2007, DAS-II Handbook — https://en.wikipedia.org/wiki/Differential_Ability_Scales)
- **[VERIFIED] Raven's 2 (Progressive Matrices, 2nd ed.)** — Nonverbal g/fluid reasoning; collapses classic CPM/SPM/APM into one adaptive system with Flynn-corrected norms. Gold standard for culture-fair, language-free Gf. Classic SPM correlated .74-.84 with WAIS-R Full Scale IQ (N=288), .81 with WAIS-III Matrix Reasoning. (Source: Pearson Raven's 2 — https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-&-Neuro/Raven's-Progressive-Matrices-Second-Edition-|-Raven's-2/p/100001960 ; APA 1973-05748-001)
- **[VERIFIED] RIAS-2** — Normed on 2,154 people ages 3-94 (RIAS-2 NU: 2,793 on 2023 Census); test-retest corrected stability .83-.99; measures g + verbal/nonverbal reasoning, memory, processing speed; not reading-dependent. Original RIAS index reliabilities .94-.96. Valued as time-efficient, full-battery-comparable. (Source: Reynolds & Kamphaus 2015, RIAS-2 Manual, WPS — https://www.wpspublish.com/rias-2-reynolds-intellectual-assessment-scales-second-edition.html)
- **[VERIFIED] CAS2 (PASS theory)** — Normed on 1,342 children 5:0-18:11 (Census-representative); 12-subtest Core Full Scale reliability .95, PASS scale reliabilities .86-.93; CFA supports the four-factor PASS model (Planning, Attention, Simultaneous, Successive). Gold-standard operationalization of PASS/Luria theory; used for ADHD/LD/executive profiling. (Source: Naglieri, Das & Goldstein 2014, CAS2 Manual, Pro-Ed; ERIC EJ1063651 — https://eric.ed.gov/?id=EJ1063651)
- **[VERIFIED] CHC (Cattell-Horn-Carroll) framework** — The shared theory behind nearly all modern IQ tests. Carroll's 1993 three-stratum model reanalyzed 461+ datasets into a hierarchy: g (Stratum III), ~8-16 broad abilities (Stratum II: **Gf** fluid, **Gc** crystallized, **Gv** visual-spatial, **Ga** auditory, **Gsm/Gwm** short-term/working memory, **Glr** long-term retrieval, **Gs** processing speed, **Gq** quantitative), ~70 narrow abilities (Stratum I). (Source: Carroll 1993, *Human Cognitive Abilities*, Cambridge — https://onlinelibrary.wiley.com/doi/full/10.1002/9781118660584.ese0431)
- **[VERIFIED] CHC — still the consensus** — A 30-year structural replication confirms Carroll's three-stratum model fits better than alternatives; McGrew (2023) frames CH (de-emphasizing g) and Carroll (apex g) as a *family* of correlated CHC theories. Implication: choosing which broad abilities to measure is a defensible, theory-grounded decision, not arbitrary. (Source: McGill, Dombrowski et al. 2023, *J Intelligence*, PMC9959556 — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9959556/)
- **[INFERENCE]** Benchmark takeaway: "reputable/accurate" means composite reliability **.95-.98** (individual IQ batteries) or **~.90+** (group screeners), norming samples of **1,300-7,400** stratified to Census, and validity anchored to g + achievement. These are the numbers to target — and CHC tells us WHICH abilities are worth measuring (Gf, Gc, Gv, Gwm, Gs are the recurring five).

## PART 2 — WHAT a good cognitive test measures + HOW each is administered

### Construct A — Fluid reasoning (Gf) / abstract reasoning
**WHY:** The non-negotiable g-loaded core of every reputable battery (SB5, WISC-V FRI, WJ-IV, DAS-II, Raven's). It's the strongest single predictor of achievement and the most culture-fair when delivered nonverbally.
**HOW reputable tests administer it:**
- **[VERIFIED] Matrix Reasoning (WISC-V)** — child views an incomplete matrix (grid of figures, one cell blank) and points to the missing piece from **5 options**; untimed, Stimulus Book, age-based start/reverse/discontinue. (Source: Pearson WISC-V — https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-&-Neuro/Wechsler-Intelligence-Scale-for-Children-|-Fifth-Edition-/p/100000771)
- **[VERIFIED] Raven's Standard Progressive Matrices** — abstract pattern with a missing piece; 60 items in 5 sets, choose from **6 options** (sets A-B) or **8** (sets C-E); nonverbal, self-paced; Coloured Progressive Matrices (ages ~5-11) uses colored stimuli for young children. (Source: https://en.wikipedia.org/wiki/Raven's_Progressive_Matrices)
- **[VERIFIED] Object Series/Matrices (SB5 nonverbal routing)** — 36 items; young children use colored plastic shapes/toys/blocks for series completion, progressing to matrix-analogy pictorial items; adaptive testlets set start difficulty. (Source: SB5 — https://proedinc.com/Downloads/14462%20SB-5_OSRS_UserGuide.pdf)
- **[VERIFIED] Concept Formation & Analysis-Synthesis (WJ-IV Gf)** — controlled-learning format: child derives a categorical rule with examiner feedback, or learns a symbolic-logic "key" then deduces novel solutions. (Source: SASC WJ IV guidance — https://www.sasc.org.uk/media/50wdefvf/woodcock-johnson-iv-tests-of-cog-abilties-_guidance-vs2-sasc-feb-2022.pdf)
- **[VERIFIED] WPPSI-IV (ages 2:6-7:7)** — Matrix Reasoning (pick 1 of 4 completing a pattern) and Picture Concepts (pick one picture per row sharing a characteristic) — the preschool pointing-response adaptation. (Source: Pearson WPPSI-IV — https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-&-Neuro/Wechsler-Preschool-and-Primary-Scale-of-Intelligence-|-Fourth-Edition/p/100000102)
**DESIGN NOTE:** Figural matrices (5-8 options, pointing/tap response) are the most buildable, language-free, K-8-scalable Gf format — and the one to deliver adaptively (ties to Part 3). Public-domain ICAR/Ch-ICAR matrices seed this without copying.

### Construct B — Verbal reasoning
**WHY:** Captures crystallized knowledge (Gc) + verbal analogical reasoning; strong achievement predictor but the most language/SES-loaded — the format to handle carefully for ELL/equity.
**HOW:**
- **[VERIFIED] Similarities & Vocabulary (WISC-V)** — Similarities: examiner reads two words aloud, child says how they're alike (scored 0/1/2); Vocabulary: name depicted objects (younger) or orally define read-aloud words (older). Fully oral; WISC-V Integrated offers multiple-choice/pictorial versions to remove the expressive-language demand. (Source: Pearson WISC-V interpretive report — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-interpretive-report.pdf)
- **[VERIFIED] WJ-IV Oral Vocabulary / Verbal Analogies** — Synonyms/Antonyms (say a synonym/antonym for a spoken or printed word); Verbal Analogies (orally complete "elephant is to big as mouse is to ___"); Picture Vocabulary (name pictured objects) is the picture-based format for nonreaders. (Source: Riverside WJ IV — https://info.riversideinsights.com/hubfs/WJ-IV_Test-Descriptions_Oral-Language.pdf)
- **[INFERENCE] Verbal Knowledge (SB5 verbal routing)** — Vocabulary is the verbal routing subtest; young children start on picture-based items (name/identify pictured objects) before oral definitions. (Source: derived from SB5 structure — https://www.stanfordbinettest.com/all-about-stanford-binet-test/stanford-binet-subtests)
**DESIGN NOTE:** For K-2, verbal reasoning must be picture-based + orally/audio-administered (no reading). Offer a multiple-choice/pictorial variant (WISC-V Integrated model) so expressive-language load doesn't confound the reasoning signal — an equity lever for ELL students.

### Construct C — Quantitative / numerical reasoning
**WHY:** Distinct achievement predictor (esp. math); appears in SB5 (QR factor), WISC-V (QRI), WJ-IV, DAS-II. Quantitative reasoning ≠ arithmetic knowledge — it's pattern/relationship reasoning over numbers.
**HOW:**
- **[VERIFIED] Figure Weights (WISC-V, QRI)** — child views 2-3 pictured balance scales, one side blank, and selects the weight combination that balances it; **20-30 sec per item**; quantitative + analogical reasoning. (Source: Pearson WISC-V scales — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-scales.pdf)
- **[VERIFIED] Number Series & Number Matrices (WJ-IV)** — identify the missing value in a numerical sequence; or solve for the missing number in a number grid. (Source: Riverside WJ IV — https://7083436.fs1.hubspotusercontent-na1.net/hubfs/7083436/WJ%20IV%20COG%20Test%20Descriptions%20Fixed%20Bullet%20Points%20(1)%20(1).pdf)
- **[VERIFIED] Quantitative Reasoning (SB5)** — Nonverbal QR uses visual number patterns + hands-on manipulatives (young-child adaptation); Verbal QR presents word problems. (Source: https://www.stanfordbinettest.com/all-about-stanford-binet-test/stanford-binet-subtests)
**DESIGN NOTE:** Prefer number-series / balance-scale / number-matrix formats (reasoning over relationships) rather than computation, so the construct is reasoning, not schooling. Balance-scale items are visual and low-language — good for K-8 breadth.

### Construct D — Spatial / visualization ability
**WHY:** The highest-value ADDITION most group screeners omit — predicts STEM beyond verbal+math (the SMPY "sleeping giant"). Present in WISC-V (Block Design), WJ-IV (Visualization), DAS-II, KABC-II.
**HOW:**
- **[VERIFIED] Block Design (WISC-V)** — child replicates 2-D geometric patterns using bicolor cubes; **stopwatch-timed**, hard items award time-bonus points (a no-time-bonus process score exists); early items are modeled by the examiner. (Source: Pearson support — https://support.pearson.com/usclinical/s/article/WISC-V-Block-Design-and-Scoring)
- **[VERIFIED] Spatial Relations & Block Rotation (WJ-IV Visualization)** — identify which 2-3 pieces (possibly flipped/rotated) combine into a target shape; select which rotated block pattern matches a target (mental rotation). (Source: SASC WJ IV — https://www.sasc.org.uk/media/50wdefvf/woodcock-johnson-iv-tests-of-cog-abilties-_guidance-vs2-sasc-feb-2022.pdf)
- **[VERIFIED] Pattern Construction (DAS-II) / Triangles (KABC-II)** — assemble wooden blocks or foam triangles to match a pictured model (manipulative block-design analogue, usable from age 3); timed with an untimed-scoring option. (Source: DAS-II — https://www.pearsonclinical.ca/store/en/p/P100008109.html ; KABC-II — https://www.pearsonassessments.com/professional-assessments/digital-solutions/telepractice/telepractice-and-the-kabc-ii-nu.html)
- **[PRESS] Paper folding & mental rotation** — mentally simulate fold-punch-unfold steps and predict the pattern (distinct from rotation); Shepard & Metzler (1971): rotation RT rises linearly with angular disparity. (Source: psychometric literature synthesis)
**DESIGN NOTE:** On-screen, spatial can be done with mental-folding and rotation items (tap response) — no physical blocks needed. This is our best lever to be "more thorough than CogAT." Untimed-scoring option keeps it a power (not motor-speed) measure.

### Construct E — Working memory / executive function
**WHY:** Adds unique achievement variance beyond IQ; the construct the validated children's *games* measure best. In WISC-V (WMI), SB5, CAS2, NIH Toolbox.
**HOW:**
- **[VERIFIED] Digit Span (WISC-V)** — auditory: Forward (repeat in order), Backward (reverse), Sequencing (reorder smallest-to-largest); span grows across trials; discontinue after failing all trials at a span. (Source: Pearson WISC-V interpretive report — link above)
- **[VERIFIED] Picture Span (WISC-V, visual WM)** — child views pictures ~5 sec, then selects them in order from a larger array with distractors; target count increases. (Source: Pearson WISC-V telepractice table — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/wisc-v/wisc-v-telepractice-table-2.pdf)
- **[VERIFIED] Letter-Number Sequencing (WISC-V)** — examiner reads mixed letters+digits (length 2-8); child repeats digits ascending then letters alphabetical (dual manipulation). (Source: Pearson WISC-V interpretive report — link above)
- **[VERIFIED] Corsi Block-Tapping (spatial span)** — examiner taps a subset of 9 blocks; child reproduces order forward/backward; length grows to failure. (Source: Corsi review, NSF PAR — https://par.nsf.gov/servlets/purl/10292489)
- **[VERIFIED] List Sorting WM (NIH Toolbox, ages 7+)** — stimuli (foods/animals, visual+audio) recalled re-sequenced by size/category; iPad-administered. (Source: NIH Toolbox — https://nihtoolbox.org/domain/cognition/)
**DESIGN NOTE:** Picture Span and Corsi are the most gamifiable/self-administrable WM tasks (visual, tap-response, audio-capable) — ideal for a digital K-8 test. Backward/sequencing conditions capture manipulation (true WM) vs. simple storage.

### Construct F — Processing speed
**WHY:** A CHC broad ability (Gs); speed IS the construct here (mental efficiency, not "thinking power"). In WISC-V (PSI), NIH Toolbox, CAS2 Planning.
**HOW:**
- **[VERIFIED] Coding (WISC-V)** — copy symbols paired to numbers/shapes using a key, as fast as possible for **120 sec**; younger form uses shapes. (Source: EdPsyched/Pearson — https://edpsyched.com/blog/processing-speed)
- **[VERIFIED] Symbol Search (WISC-V)** — mark whether a target symbol appears in a search group; **~120 sec**. (Source: Pearson support — https://support.pearson.com/usclinical/s/article/WISC-V-Symbol-Search-A-Measure-of-Processing-Speed)
- **[VERIFIED] Cancellation (WISC-V)** — scan a page of scattered/structured pictures and cross out only the animals; **~45 sec/page**; correct minus errors. (Source: https://en.wikipedia.org/wiki/Wechsler_Intelligence_Scale_for_Children)
- **[VERIFIED] Pattern Comparison (NIH Toolbox, ages 5+; Speeded Matching ages 4-6)** — judge whether two side-by-side pictures are same/different; number correct in **90 sec**; items deliberately easy to isolate speed. (Source: NIH Toolbox — https://nihtoolbox.org/test/pattern-comparison-processing-speed/)
**DESIGN NOTE:** Keep speed items strictly timed, easy, and SEPARATE from power (reasoning) blocks. Caveat: PSI is confounded by fine-motor "access skills" — on a touchscreen, calibrate for motor/device differences (ties to gaming-familiarity/motor confounds in the companion dossier). Weight Gs lightly for a *gifted* screen (it's the least g-loaded).

### Construct G — Complementary signals (creativity, task commitment, motivation)
**WHY:** Makes identification more thorough than reasoning-only (Renzulli three-ring); creativity correlates only ~r.17 with IQ (genuinely new info), conscientiousness predicts achievement IQ-independently. See companion dossier Q5 for effect sizes.
**HOW (from the reputable/validated set):**
- **[VERIFIED] Divergent-thinking / creativity** — TTCT-style figural tasks (generate multiple uses/completions), scored for fluency/originality/flexibility. Administer as open-ended generation, not multiple choice.
- **[VERIFIED] Teacher behavioral rating** — HOPE Scale (11-13 items, DIF-clean by income/ethnicity) or SRBCSS; a structured checklist, not a test the child sits.
- **[INFERENCE] Dynamic assessment** — test-teach-retest to reveal learning potential (built-in "teaching items" with feedback, as WJ-IV's controlled-learning Gf tasks already do).
**DESIGN NOTE:** Use these as INCLUSIONARY supplements (catch students the ability test misses), never as exclusionary gates — self/teacher-report is fakeable/rater-biased. Performance-based (divergent-thinking, dynamic) beats questionnaires for defensibility.

## PART 3 — HOW good tests are DELIVERED (administration mechanics that cut across constructs)

*These are the delivery choices that separate an accurate test from an inaccurate one, independent of which constructs you measure.*

**Tailoring difficulty to the child (basal/ceiling & routing):**
- **[VERIFIED] Reverse rule / basal (WISC-V)** — if a child doesn't get a perfect score on either of the first two items at the age-based start, the examiner gives easier items in reverse until **two consecutive perfect scores** set the basal; all items below are credited without administration. (Source: Cogn-IQ, WISC-V A&S Manual summary, 2023 — https://www.cogn-iq.org/learn/theory/basal-ceiling/)
- **[VERIFIED] Discontinue/ceiling (WISC-V)** — a subtest stops after a set number of consecutive zero-scored items; nothing above the ceiling is counted. Purpose: cut items that are too easy/hard, reducing time and fatigue. (Source: Cogn-IQ Discontinue Rule, 2023 — https://www.cogn-iq.org/learn/theory/discontinue-rule/ ; Springer Encyclopedia of Clinical Neuropsychology, 2018 — https://link.springer.com/rwe/10.1007/978-3-319-56782-2_9055-2)
- **[VERIFIED] Routing (SB5)** — two routing subtests (Object Series/Matrices, Vocabulary) set the start level for the other eight; together they also yield the Abbreviated Battery IQ. Testlet rule: <3 points on a testlet triggers drop-back (basal), ≤2 points triggers discontinue (ceiling). (Source: ACIS/SB5 overview + Cogn-IQ, 2024 — https://www.cogn-iq.org/learn/tests/stanford-binet/)

**Adaptive (CAT) delivery — the scalable equivalent:**
- **[VERIFIED] MAP Growth** — computer-adaptive: correct → harder, incorrect → easier; IRT engine picks items matching estimated ability, targeting ~50% correct while honoring the content blueprint. Items + students share one equal-interval, grade-independent RIT scale (a 10-pt gain means the same anywhere), enabling routing + cross-year growth. (Source: NWEA Technical Report 2024-25 — https://www.nwea.org/uploads/MAP-Growth-Technical-Report-2025.pdf)
- **[VERIFIED] Raven's 2 digital** — draws each examinee's items from a bank to limit overlap (security + reduced practice effects); consequently the raw score is NOT comparable across examinees — interpretation uses derived standard score / percentile / CI. (Source: Pearson Raven's 2 digital report — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/ravens-2/ravens-2-sample-score-report-digital-form.pdf)

**Power vs. speed:**
- **[VERIFIED]** WISC-V Processing Speed (Coding, Symbol Search) are the ONLY strictly-timed subtests (120 sec) — where timing IS the construct — but are confounded by fine-motor "access skills," a known limitation. Reasoning subtests are power (generous/untimed). (Source: Rutgers thesis + Pearson Q-interactive PSI tech report — https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/q-interactive/002-Qi-Processing-Speed-Tech-Report_FNL2.pdf)

**Scoring, scales & confidence intervals:**
- **[VERIFIED]** Modern tests use deviation IQ (fixed mean/SD), not ratio IQ: Wechsler mean 100 **SD 15**; SB5 uses SD 15 since 2003 (older L-M forms used SD 16). Same number = different percentile by SD (IQ 130 = 98th on SD-15 vs ~97th on SD-16). (Source: Cogn-IQ, 2024 — https://www.cogn-iq.org/blog/standard-deviation-iq/)
- **[VERIFIED]** Confidence bands come from **SEM = SD × √(1 − reliability)**; SD 15 & reliability .96 → SEM = 3, so a 95% band (±1.96 SEM) around IQ 100 is ~94-106. Composites' CIs are typically ±3-5 points, so 127 and 131 can reflect identical ability. (Source: Cogn-IQ SEM, 2024 — https://www.cogn-iq.org/learn/theory/standard-error-of-measurement/)

**Teaching items & session length for young children:**
- **[VERIFIED]** WISC-V builds in demonstration/sample/teaching items so the child understands the task before scored items — added from input across thousands of standardization children incl. special needs. (Source: WISC-V A&S Manual p.47 via ESC training — https://apps.esc1.net/ProfessionalDevelopment/uploads/WKDocs/55586/4%20WISC%20V.pdf)
- **[ESTIMATE]** Child single-task attention ≈ 2-5 min per year of age (~10-18 min at 5-6, ~16-20 min at 8); programs split assessments over ~25-min sessions with breaks ~every 20 min for screen tasks. (Source: attention-span guides + NIH protocols NCT02462733/NCT01952093 — https://www.brainbalancecenters.com/blog/normal-attention-span-expectations-by-age)

**Standardization & the human-examiner error problem:**
- **[VERIFIED]** Standardized administration is a precondition of validity — norms assume a fixed, scripted, distraction-free protocol; departures can invalidate the norms (AERA/APA/NCME Standards). (Source: National Academies, "Overview of Psychological Testing" — https://www.ncbi.nlm.nih.gov/books/NBK305233/)
- **[VERIFIED]** Even trained examiners err: scoring/clerical errors on **38% of WISC-R and 42% of WISC-III** protocols; only 4-24% of grad programs require a competency check before testing real children. Human administration is itself an error source at scale. (Source: National Academies — https://www.ncbi.nlm.nih.gov/books/NBK305233/)

**Implications for our K-8 build:**
- **[INFERENCE]** A full CAT (MAP/Raven's-2 style) reproduces basal/ceiling's fatigue- and floor/ceiling-avoidance benefits WITHOUT a trained examiner per child — it administers only items near each student's ability, eliminates the documented human scoring-error rates, and removes raw-score-comparability problems by reporting derived ability estimates. This is the strongest argument for building adaptive + digital.
- **[INFERENCE]** Separate power (untimed adaptive reasoning) from speed (strictly-timed easy items where latency is the measure); keep each block within the age-scaled attention envelope (~2-5 min × age, capped ~20-25 min with breaks); and gate scored items behind demonstration/practice trials with mastery checks — mirroring WISC-V teaching items so task comprehension isn't confounded with ability, especially in K-2.

---

## Sweep log

_(one line per sweep — timestamp, sections touched, # new findings, gaps to chase next)_
- **Sweep 1** — 2026-07-22; filled Part 1 (11 reputable instruments incl. SB5/WISC-V/WPPSI-IV/WJ-IV/KABC-II/DAS-II/Raven's 2/RIAS-2/CAS2 + CHC framework), Part 2 (all 7 constructs with concrete HOW-administered formats from named tests), Part 3 (basal/ceiling, routing, CAT, power-vs-speed, deviation-IQ scales, SEM confidence bands, teaching items, attention-span limits, examiner-error rates). **~40 sourced findings.** Key numbers: reputable reliability .95-.98 (individual) / ~.90+ (group); Census-stratified norming N=1,300-7,400; SEM=SD√(1−r); human examiners err on 38-42% of protocols → argues for adaptive/digital. GAPS to chase next: (a) exact per-item counts/time limits are copyrighted (flagged [PRESS]); (b) how digital/game-based tests specifically administer each construct (cross-ref companion dossier Q7); (c) a concrete item-format spec + blueprint (# items/construct, adaptive routing rules) as a synthesis; (d) reading-free instruction/audio delivery standards for K-2.
