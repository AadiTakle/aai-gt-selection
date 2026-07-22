# BrainLift: Measuring Gifted Talent in K–8 — What Cognitive Tests Like CogAT Capture, Miss, and What a Better Test Would Have to Beat

**Date:** 2026-07-21
**Status:** DOK 1–2 research complete (AI-assisted, citation-verified). **DOK 3–4 are the author's to own** — this document supplies provocation questions and clearly-labeled *starter* hypotheses only, never a finished stance.
**Author (owns DOK 3–4):** _[you]_
**Companion:** `source-register-annotated.md` (full tiered source audit).
**Builds on (does not duplicate):** `docs/research/COGAT_GAPS_AND_TEST_SUITE_REPORT.md`, `docs/research/HOLISTIC_GIFTEDNESS_EVIDENCE_REPORT.md`, `docs/research/METRICS_AND_GUARDRAILS_LIBRARY.md`, and the annotated register of `gt-school-counterfactual-brainlift/`. Also incorporates the **measurement-quality subset** of `docs/research/EVIDENCE_DOSSIER.md` (origin/dev — an explicitly *unvetted* overnight research scrape); see source-register **Section 11**. Its selection/lottery/counterfactual findings (C1, C4–C7) belong to the counterfactual BrainLift, not here.

---

## Scope & governance note (read this first)

This is a **thinking/research artifact**. It does **not** ratify building a new test.

- **Requirements served (as research):** R5 (defensible capability standard), R6 (growth without a ceiling), R7 (auditable measures), R9 (fairness / student protection), R10 (claim boundaries); H1 (broader ability, incl. spatial), H4 (broaden access & engagement), H10 (gaming/burden minimized).
- **Two flags the charter forces me to raise, not bury:**
  1. **"Build our own test" is a solution being treated as a requirement.** `PROJECT_CHARTER.md` and `docs/product/project-requirements.md` list "a specific test" as an explicit *non-requirement*, and `docs/research/COGAT_GAPS_AND_TEST_SUITE_REPORT.md` deliberately recommends staying **test-agnostic** (CogAT + one MAP domain). Committing to *build* a test would need a `SCOPE_EXCEPTION_LOG.md` + `DECISION_LOG.md` entry. Developing and defending the *idea* in a BrainLift is fine; that is what a Spiky Point of View is for.
  2. **"~2× better across the best metrics" is only honest on some axes.** Reliability is capped at 1.0 (good ability tests already sit in the .90s) and an observed validity correlation is capped at `√(r_xx · r_yy)` (Spearman's correction for attenuation). **You cannot double a 0.90 reliability or a 0.65 validity.** "2×" is coherent only on **unbounded, tail-specific** axes: the false-negative rate at the cut, test information at high θ, and classification consistency. Defining which one you mean *is* the sharpest question in this BrainLift.

---

## Experts (Sources) — deliberately chosen to disagree

The tension between these camps is where the DOK 3 insights live. COIs are named on purpose.

1. **The adaptive-precision camp — David J. Weiss; van der Linden & Glas.** Claim: adaptive measurement can deliver *equal precision at every trait level* and slash items/false-negatives. **COI:** Weiss is "the father of CAT" and co-founded a commercial CAT vendor.
2. **The gifted-ID measurement realists — David Lohman; Russell Warne.** Claim: one-shot childhood scores are *unstable* and regress to the mean; above-level testing is "widely accepted" yet "not subject to careful psychometric scrutiny." **COI:** Lohman co-authored CogAT — yet criticizes single-cutoff misuse, which cuts against interest.
3. **The decision-rule camp — McBee, Peters & Waterman.** Claim: the *combination rule* (AND/OR/mean), not the test, manufactures most false negatives; adding a second test can make identification *worse*. Implication: a "better test" may be the wrong lever.
4. **The construct-breadth camp — Wai, Lubinski & Benbow.** Claim: verbal/quant screens miss **70% of the spatial top-1%** — a coverage failure, not a precision failure.
5. **The standards & psychometric canon — AERA/APA/NCME (2014) *Standards*; Lord (1980); Livingston & Lewis (1995); Meehl & Rosen (1955).** The rulebook for what "quality" even means at a cut score.
6. **The publisher/vendor evidence — NWEA MAP; Ozen et al. (2024) meta-analysis.** Best available technical numbers, but publisher-produced or author-of-test stakes.
7. **The game-based-assessment proponents — Shute & Ventura (stealth assessment); Mislevy (evidence-centered design); Roblox's own hiring assessment.** Claim: embed measurement in play to capture higher-order cognition and lift engagement. **COI:** the most favorable validity evidence is proponent- or vendor-generated.
8. **The independent GBA / fairness skeptics — the *Journal of Intelligence* (2024) meta-analysis; Ohlms, Hohner & Melchers (2025).** Claim: game scores correlate only *moderately* (r ≈ .30) with cognitive ability, GBA is validated only for low-stakes/adult use, and prior gaming experience injects test bias.

---

## DOK 1: Facts

> Litmus test applied: every item below is something two engineers reading the same source would extract the same way. Each cites a specific source; interpretation is deferred to DOK 3. `[UNVERIFIED]` and COI flags are kept honest.

### 1.1 — What CogAT-class tests *capture well*

- **CogAT measures developed reasoning in three domains.** The Complete Battery contains Verbal (analogies, sentence completion, classification), Quantitative (number analogies/puzzles/series), and Nonverbal/Figural (figure matrices, **Paper Folding**, figure classification). It is not "just verbal/math," and it is not devoid of spatial content. *(Riverside CogAT test descriptions; synthesized in `docs/research/COGAT_GAPS_AND_TEST_SUITE_REPORT.md`.)*
- **CogAT predicts achievement moderately-to-strongly.** A meta-analysis reports a mean CogAT↔achievement validity of **r = .63, 95% CI [.57, .69]**. *(Ozen, Pereira, Karatas, Castillo-Hermosilla & Maeda, 2024, *Gifted Child Quarterly*, DOI 10.1177/00169862241285593. COI: the meta-analysis itself flags author-of-test effects on reported validity.)*
- **Cognitive ability is a strong early predictor of later achievement.** In >70,000 English children, a cognitive test at age 11 correlated **r ≈ .69 (observed) / .81 (latent)** with national exams at 16. *(Deary, Strand, Smith & Fernandes, 2007, *Intelligence*, DOI 10.1016/j.intell.2006.02.001.)*

### 1.2 — What they *miss*, especially at the gifted tail

- **Fixed-form tests are *least* precise exactly where the gifted decision is made.** In IRT, the conditional standard error is `SE(θ) = 1/√I(θ)`, and information peaks where items cluster (the middle). In sparse tails, information collapses and the standard error "balloons." *(Baker, 2001, *The Basics of Item Response Theory*, 2nd ed., ERIC ED458219, ch. 6; Lord, 1980, *Applications of IRT*.)*
- **A one-shot score is a moving target.** "Approximately half of the students who score in the top 3% … in 1 year will not fall in the top 3% … in the next year," and only **~35–40% remain top-3% from grade 3 to grade 8** — regression to the mean, not merely measurement error. *(Lohman & Korb, 2006, *Journal for the Education of the Gifted*, DOI 10.4219/jeg-2006-245; corroborated by Warne, 2012, *Roeper Review*, DOI 10.1080/02783193.2012.686425.)* **Correction to the existing project register:** its "~70% not top-3% by grade 8 / ~40% one year later" phrasing overstates the fall-out; the primary source says ~half fall out in *one year* and ~60–65% over five years.
- **One test barely reproduces another's "top" list.** CogAT Composite captured only **~32%** of the top-3% readers; Nonverbal only **~18%**. *(Lohman, 2005, *Journal for the Education of the Gifted*, DOI 10.1177/001698620504900203.)*
- **"Culture-fair" nonverbal tests do not erase opportunity gaps.** English-language learners scored **0.5–0.67 SD lower** on Raven's, NNAT, and CogAT-Nonverbal. *(Lohman, Korb & Lakin, 2008, *Gifted Child Quarterly*, DOI 10.1177/0016986208321808.)*
- **Spatial talent is systematically under-selected.** **70% of the top 1% in spatial ability did not make the top-1% cut on either the math or the verbal composite.** *(Wai, Lubinski & Benbow, 2009, *Journal of Educational Psychology*, DOI 10.1037/a0016127, p. 825; large stratified sample + Project TALENT, ~400,000, 11-yr longitudinal; incremental variance from spatial ≈ 4% on average but large in absolute tail counts. COI: authors are spatial-ability proponents, mitigated by the independent Project TALENT data.)*
- **CogAT's exact upper-tail reliability, conditional error, and ceiling for the current form/norm are `[UNVERIFIED]`** — they are largely publisher-controlled; the project should obtain the technical tables before any high-stakes use. *(Flagged by research threads B and D; consistent with `docs/research/COGAT_GAPS_AND_TEST_SUITE_REPORT.md`.)*
- **A hard cutoff misclassifies boundary cases *asymmetrically*.** A score is a confidence band, not a point (best practice is a 95% CI, ±2 SEM); at a high cut, regression to the mean pulls true scores *below* the threshold, so a child scoring exactly at the cut is more likely a false positive while a truly gifted child is easily pushed just under — and reliability is **lowest in young children**, exactly when screening happens. *(Standard measurement theory — AERA/APA/NCME 2014, Standards 2.14–2.16; regression: Lohman & Korb, 2006. The concrete "±3–5 IQ-point band / asymmetric error at a 130 cut" illustration is compiled in `docs/research/EVIDENCE_DOSSIER.md` from a secondary summary — treat as illustrative.)*
- **A single test *plus referral* tracks family/social advantage, not just ability.** At equal measured achievement, Black students are less likely to be identified as gifted; high-achieving Black students were only ~one-third as likely to be identified when taught by a non-Black teacher. *(Grissom & Redding, 2016, *AERA Open*, DOI 10.1177/2332858415622175; via `docs/research/EVIDENCE_DOSSIER.md`.)*
- **Test scores rise monotonically with family income.** On the SAT, mean total climbed from **891 (lowest census-tract income quintile) to 1148 (highest)** — a 257-point gap — with "met both benchmarks" rising 15% → 63%. *(College Board, 2023 Total Group SAT Suite Annual Report — primary; via `docs/research/EVIDENCE_DOSSIER.md`. Note: the SAT is an achievement test, not an ability screen — cited as illustration that scores track family advantage, relevant to H2.)*

### 1.3 — How to *measure a test's quality at the tail* (the metrics that answer "how well does it capture gifted kids by score?")

- **Precision is conditional, not a single reliability number.** The Test Information Function reports precision at each θ; `SE(θ) = 1/√I(θ)`. A test can be sharp mid-range and weak at the top. *(Baker, 2001, ch. 6; Embretson & Reise, 2000.)*
- **Profile/difference scores are noisier than their parts.** Reliability of a difference (e.g., "spatial minus verbal" tilt) is lower than the reliabilities of the components — relevant to any multi-domain profile decision. *(Green, Bock, Humphreys, Linn & Reckase, 1984, *Journal of Educational Measurement*; classical difference-score result.)*
- **Classification accuracy and consistency are the decision-level metrics.** From a single form you can estimate the % correctly classified (accuracy) and the % who would be classified the same on a parallel form (consistency). *(Livingston & Lewis, 1995, *Journal of Educational Measurement*, 32(2):179–197, DOI 10.1111/j.1745-3984.1995.tb00462.x.)* The *Standards* tie classification error directly to the **conditional SEM near the cut**. *(AERA/APA/NCME, 2014, Standards 2.14–2.16.)*
- **Sensitivity, specificity, false-negative rate — and base rates dominate.** Because "gifted" is a low-base-rate category, positive predictive value is fragile: even an accurate test yields many misclassifications near a stringent cut. *(Meehl & Rosen, 1955, *Psychological Bulletin*, DOI 10.1037/h0048070.)*
- **ROC / AUC** summarizes sensitivity–specificity trade-offs across all cut points. *(Hanley & McNeil, 1982, *Radiology*, DOI 10.1148/radiology.143.1.7063747.)*
- **Incremental validity** is the bar a *second* measure must clear: it must add predictive information beyond the first, not just correlate with the outcome. *(Hunsley & Meyer, 2003, *Psychological Assessment*, DOI 10.1037/1040-3590.15.4.446.)*
- **Fairness is measurable:** measurement invariance / Differential Item Functioning tests whether items behave the same across subgroups at equal ability. *(Meredith, 1993, *Psychometrika*, DOI 10.1007/BF02294825; Holland & Wainer, 1993, *Differential Item Functioning*.)*
- **The rulebook:** all of the above is governed by the *Standards for Educational and Psychological Testing*. *(AERA/APA/NCME, 2014.)*
- **The bounds that cap "2×":** reliability ≤ 1.0; an observed validity correlation ≤ `√(r_xx · r_yy)`. *(Spearman, 1904, *American Journal of Psychology*, DOI 10.2307/1412159; Lord & Novick, 1968, *Statistical Theories of Mental Test Scores*.)*

### 1.4 — How the holes *can be patched* (methods, with honest maturity flags)

- **Adaptive testing (CAT) — mature.** Live-testing data showed adaptive tests needed **half the items for equal reliability and ~one-third for equal validity**, produced **"measurements of equal precision at all trait levels,"** and gave **more accurate classification** than fixed forms. *(Weiss, 1982, *Applied Psychological Measurement*, DOI 10.1177/014662168200600408; Weiss & Kingsbury, 1984, DOI 10.1111/j.1745-3984.1984.tb01040.x. COI: Weiss is a commercial CAT vendor principal.)* Requires a **large IRT-calibrated item bank** + item-exposure/security controls. *(Thompson & Weiss, 2011, "A Framework for the Development of CAT," *PARE*, DOI 10.7275/wqzt-9427; van der Linden & Glas, 2010, *Elements of Adaptive Testing*, DOI 10.1007/978-0-387-85461-8; Wainer et al., 2000.)*
- **Multistage testing (MST) — mature.** Module-based adaptivity keeps most CAT precision while allowing answer review and simpler exposure control. *(Yan, von Davier & Lewis, 2014, *Computerized Multistage Testing*.)*
- **Above-level testing — established practice, but flagged.** Giving older-level items raises the ceiling so gifted growth is visible; the Talent Search model is fundamentally above-level. *(Assouline & Lupkowski-Shoplik, 2012, *Journal of Psychoeducational Assessment*, DOI 10.1177/0734282911433946.)* **But** it "has not been subject to careful psychometric scrutiny." *(Warne, 2014, *Gifted Child Quarterly*, DOI 10.1177/0016986213513793 — the author's own words.)*
- **A high ceiling captures real tail variation a grade-level ceiling flattens.** Youth identified before age 13 as top-1-in-10,000 via *above-level* SAT reached striking outcomes by age 38 (**44% earned doctorates** vs. ~2% of the population), and accomplishment keeps climbing *within* the top 1% — so a ceiling that compresses the tail discards meaningful, predictive signal. *(Kell, Lubinski & Benbow, 2013, *Psychological Science*, 24(5):648–659, DOI 10.1177/0956797612457784; within-top-1% gradient: Lubinski, 2016, "From Terman to Today." Via `docs/research/EVIDENCE_DOSSIER.md` — which mis-dated this to 2014; corrected here.)*
- **Vertical scaling — necessary but assumption-laden.** Scaling-method choices change the apparent growth pattern of high scorers. *(Tong & Kolen, 2007, *Applied Measurement in Education*, DOI 10.1080/08957340701301207.)*
- **Multidimensional IRT / diagnostic models — mature theory for *profiles*, with pitfalls.** *(Reckase, 2009, *Multidimensional IRT*, DOI 10.1007/978-0-387-89976-3; Rupp, Templin & Henson, 2010, *Diagnostic Measurement* — the authors themselves flag limitations.)*
- **A spatial patch already exists.** CTY built a Spatial Test Battery to supplement math/verbal talent searches. *(Stumpf, Mills, Brody & Baxley, 2013, *Roeper Review*, DOI 10.1080/02783193.2013.829548. COI: authors are the developers.)*
- **Dynamic assessment / repeated measurement — promising, unproven for this use.** It measures *learning potential* rather than prior accomplishment. *(Sternberg & Grigorenko, 2002, *Dynamic Testing*.)* **No meta-analysis establishing predictive validity for K-8 gifted identification specifically was located `[gap]`.**
- **Stealth / game-based / process-data assessment — emerging, limited evidence.** Promise: embed measurement in tasks to capture hard-to-test skills; measured convergent correlations were **modest (r ≈ 0.22–0.41)** on small samples, all proponent-generated. *(Shute & Ventura, 2013, *Stealth Assessment*; Shute & Moore validation. COI: originators.)*

### 1.5 — Feasibility of a *new* test, and what "2×" can and cannot mean

- **Building a standardized test is a multi-year, validation-heavy program.** Item review + tryouts on representative samples + DIF screening are required, not optional; adaptive designs additionally require large operational item pools and stopping rules. *(AERA/APA/NCME, 2014, Standards ch. 4–5.)*
- **Calibration samples:** rules of thumb ≈ **500 for 2PL, ≈1,000 for 3PL** item calibration; de Ayala's honest answer is "it depends" on model, items, and sample. *(Hulin, Lissak & Drasgow, 1982, *Applied Psychological Measurement*, DOI 10.1177/014662168200600301; de Ayala, 2009, *The Theory and Practice of IRT*.)*
- **Time/cost (indicative, from achievement-testing context):** ≥3 years is a common rule of thumb for a large-scale test; item creation ~$1,000–$20,000 per item; NAEP item development ≈ $16.3M/yr. *(Center for Assessment [expert blog, not peer-reviewed]; National Academies, 2022, *A Pragmatic Future for NAEP*.)*
- **BOUNDED axes — cannot 2×:** reliability (already ~.90s, capped at 1.0) and observed criterion validity (capped at `√(r_xx · r_yy)`). *(Standards ch. 2; Spearman, 1904.)*
- **UNBOUNDED / tail-specific axes — 2× is coherent:**
  - **Test information at high θ** is additive and uncapped — but **halving the conditional SEM requires ~4× the information, not 2×** (since `SEM ∝ 1/√I`; doubling information cuts SEM to ≈0.707, a ~29% reduction). *(Lord, 1980; Baker, 2001.)*
  - **False-negative rate at the cut** is a proportion in [0,1] not pinned near a ceiling, so 20% → 10% is arithmetically real. *(Standards 2.14–2.16; Livingston & Lewis, 1995.)*
  - **Classification consistency** at the cut can rise materially. *(Livingston & Lewis, 1995.)*
- **Precedent that adaptivity moves exactly these axes:** equal precision at all trait levels, fewer items, better classification. *(Weiss, 1982.)*
- **A cautionary real-world case:** NWEA MAP is adaptive and reports lower SEM than fixed forms and a "very high ceiling," yet its own documents show SEM rising near the top of a level's range — adaptivity helps but does not make the tail free. Its 2025 norms draw on ~13.8M students, but expected RIT growth *compresses* in upper grades (≈6 RIT in grades 5–6 vs. ≈4 in 7–8), so raw gain understates gifted growth and conditional growth percentiles are the appropriate high-ceiling metric. *(NWEA technical documents — publisher COI; a specific numeric "effective RIT ceiling" is `[UNVERIFIED]`; RIT-compression detail via `docs/research/EVIDENCE_DOSSIER.md`.)*

### 1.6 — Game-based / "gamified" assessment (the Roblox-style option): promise, evidence ceiling, and fairness threats

- **Game-based assessment (GBA) / "stealth assessment" is a real paradigm:** embed performance tasks in a game and score process/telemetry data using evidence-centered design + Bayesian networks. *(Shute & Ventura, 2013, *Stealth Assessment*, MIT Press, DOI 10.7551/mitpress/9589.001.0001; Mislevy, Steinberg & Almond, 2003, *Measurement*, DOI 10.1207/s15366359mea0101_02.)*
- **Roblox is a working proof-of-concept — for adults, not children.** Since 2021 Roblox has operationalized a **game-based hiring assessment** to measure "cognitive skills such as creative problem-solving and systems thinking" for entry-level engineers/PMs (practice game "Kaiju Cats"). *(EDM 2024 proceedings poster, "Identifying Off-Task Users in a Large-Scale, Game-Based Practice Assessment.")* Roblox calls it "standardized, scientifically validated" — a **`[COMPANY CLAIM]`**, not independent peer review *(Roblox Newsroom, 2025, "Fair Play")*. Population = adult job candidates; **not** a child/gifted instrument.
- **Single-game validity looks encouraging but is proponent-generated and small-sample.** Physics Playground reported internal consistency α ≈ 0.87 and convergent r ≈ 0.22–0.41 with an external physics test *(Shute & Moore, 2017)*; Portal 2 vs. Lumosity gave problem-solving d ≈ 0.59, spatial d ≈ 0.64, persistence d ≈ 0.42 — but **adults, n = 77** *(Shute, Ventura & Ke, 2015, *Computers & Education*, DOI 10.1016/j.compedu.2014.08.013)*.
- **The independent evidence is only moderate — and in adults.** A 2024 meta-analysis (52 samples, >6,100 people) puts the correlation between game-based assessment and traditional cognitive-ability tests at **r ≈ 0.30 (corrected ≈ 0.45), ranging −0.35 to +0.75**. *(*Journal of Intelligence*, 12(12):129, DOI 10.3390/jintelligence12120129.)*
- **GBA is positioned as *formative/low-stakes*; high-stakes use is an open question, and no study validates it for high-stakes K-8 gifted identification (`[gap]`).** *(Shute & Sun, 2020, *Handbook of Game-Based Learning*; systematic review: Gomez, Ruipérez-Valiente & García Clemente, 2023, *IEEE Trans. Learning Technologies*, DOI 10.1109/TLT.2022.3226661.)*
- **The fairness threat is empirically documented, not hypothetical.** Video-game experience **predicts game-based-assessment scores but not academic performance — i.e., test bias / criterion-irrelevant variance.** *(Ohlms, Hohner & Melchers, 2025, *Applied Psychology*, DOI 10.1111/apps.70038.)* In a spatial GBA, "enjoyment significantly affects one key feature," with explicit gender-subgroup concerns *(Kim et al., 2023, *BJET*, DOI 10.1111/bjet.13286)*.
- **Commercial "games measure cognition" claims are mostly unvalidated marketing.** The one independent pymetrics audit checked only that the de-biasing *code* met the four-fifths rule and **explicitly did not test whether the games measure ability or predict performance** *(Wilson et al., 2021, ACM FAccT)*; brain-training far-transfer is weak *(Simons et al., 2016, *Psych. Science in the Public Interest*, DOI 10.1177/1529100616661983; FTC Lumosity $2M settlement, 2016)*. The one rigorously validated game — Akili's **EndeavorRx** (FDA De Novo, 2020; Kollins et al., 2020, *Lancet Digital Health*, DOI 10.1016/S2589-7500(20)30017-0) — is a narrow ADHD **treatment**, not an ability test.
- **Minecraft's most rigorous trial was null:** a cluster RCT (N = 885) found no overall effect on spatial thinking, and a systematic review flags medium/high risk of bias across studies. *(*Computers & Education*, 2024; Slattery et al., 2025, *Review of Education*, DOI 10.1002/rev3.70035.)*

### 1.7 — Learning science of eliciting a child's best performance (and whether "fun" helps *measurement*)

- **Test anxiety depresses scores and adds construct-irrelevant variance — measurably, in K-8.** Achievement correlations: grades 1–5 r ≈ −.22, grades 6–8 r ≈ −.25 *(von der Embse et al., 2018, *J. Affective Disorders*, DOI 10.1016/j.jad.2017.11.048)*; a 20-year meta-analysis of **53,617 children aged 5–12** confirms the negative link *(Robson et al., 2023, *J. School Psychology*, DOI 10.1016/j.jsp.2023.02.003)*; foundational: Hembree, 1988, *Review of Educational Research*, DOI 10.3102/00346543058001047.
- **Flow requires a challenge–skill balance:** challenge above skill breeds anxiety, below it breeds boredom — adaptive difficulty-matching is the mechanism that sustains engagement. *(Csikszentmihalyi, 1990, *Flow*.)*
- **Extrinsic rewards can *crowd out* intrinsic motivation — and it is worse for children.** Tangible/performance rewards undermined free-choice intrinsic motivation (d ≈ −0.28 to −0.40) and were "more detrimental for children than college students"; positive *feedback* enhanced it (d ≈ 0.33). *(Deci, Koestner & Ryan, 1999, *Psychological Bulletin*, DOI 10.1037/0033-2909.125.6.627; framework: Ryan & Deci, 2000, *American Psychologist*, DOI 10.1037/0003-066X.55.1.68.)*
- **Game interfaces can inject *extraneous* cognitive load** — working memory spent decoding controls/graphics is unavailable for the reasoning being measured. *(Sweller, 1988, DOI 10.1207/s15516709cog1202_4; Sweller, van Merriënboer & Paas, 1998/2019, DOIs 10.1023/A:1022193728205, 10.1007/s10648-019-09465-5.)*
- **Gamification's measured benefit is real but modest and about *learning/engagement*, not measurement validity.** Cognitive g = 0.49, motivational g = 0.36, behavioral g = 0.25 (the latter two less stable) *(Sailer & Homner, 2020, *Educational Psychology Review*, DOI 10.1007/s10648-019-09498-w)*; effects are context/user-dependent with an explicit **novelty-effect** caveat *(Hamari et al., 2014, HICSS, DOI 10.1109/HICSS.2014.377)*; shorter interventions show larger effects (consistent with novelty) and some learners report anxiety/jealousy *(Bai, Hew & Huang, 2020, *Educational Research Review*, DOI 10.1016/j.edurev.2020.100322)*.
- **Stereotype threat (contested):** the original demonstration *(Steele & Aronson, 1995, DOI 10.1037/0022-3514.69.5.797)* attenuates to negligible-to-small under operational conditions, with publication-bias signs (d ≈ −.14) *(Shewach, Sackett & Quint, 2019, DOI 10.1037/apl0000420; Flore & Wicherts, 2015)*. Treat as a **possible**, not settled, performance factor.

### 1.8 — Game design/development practices migrated to test design (what transfers, and what doesn't)

- **Playtesting → cognitive labs / response-process validity.** Studios playtest before ship; test developers run think-aloud "cognitive labs" to verify items elicit the intended reasoning (response-process validity). *(Leighton, 2017, *Using Think-Aloud Interviews and Cognitive Labs in Educational Research*, Oxford, DOI 10.1093/acprof:oso/9780199372904.001.0001; AERA/APA/NCME, 2014, ch. 1; game-side analog — Drachen, Mirza-Babaei & Nacke, 2018, *Games User Research*, Oxford.)*
- **Game telemetry/analytics → process/log-data & item analytics.** Mining player telemetry maps onto assessment log/process data and item analytics. *(Seif El-Nasr, Drachen & Canossa, 2013, *Game Analytics*, Springer, DOI 10.1007/978-1-4471-4769-5; assessment side — Bergner & von Davier, 2019, *J. Educational and Behavioral Statistics*, DOI 10.3102/1076998618784700, who note response time alone can't even establish engagement.)*
- **Level design / difficulty curves → item-difficulty sequencing & adaptive routing.** A tuned difficulty curve is formally an item-difficulty sequence; the psychometric version is adaptive routing on θ (CAT/MST). *(van der Linden & Glas, 2010; Weiss, 1982 — §1.4.)*
- **Game balancing / live-ops tuning → equating, DIF & item-parameter-drift monitoring.** Continuously "balancing" a live game maps to ongoing calibration: item parameters *drift* over time and must be monitored, and fairness requires DIF/invariance checks. *(Bock, Muraki & Pfeiffenberger, 1988, *J. Educational Measurement*, 25(4):275–285, DOI 10.1111/j.1745-3984.1988.tb00308.x; Meredith, 1993 — §1.3.)*
- **Live-ops A/B testing → continuous, trustworthy experimentation on items.** Disciplined online experimentation (guardrail metrics; avoiding carryover/novelty confounds) is the model for *ongoing* item tryout rather than one-shot norming. *(Kohavi, Tang & Xu, 2020, *Trustworthy Online Controlled Experiments*, Cambridge, ISBN 9781108724265.)*
- **Procedural content generation → Automatic Item Generation (AIG).** PCG's assessment cousin generates many calibrated items from cognitive "item models" — one model produced **1,248** items in a licensure example — feeding an adaptive bank and easing exposure. *(Gierl, Lai & Turner, 2012, *Medical Education*, 46(8):757–765, DOI 10.1111/j.1365-2923.2012.04289.x; Gierl & Haladyna, 2012, *Automatic Item Generation*, Routledge, DOI 10.4324/9780203803912.)*
- **Player/difficulty modeling → IRT, knowledge tracing, and CAT.** Games model a player's latent skill to pick the next challenge; assessment's equivalents are IRT/CAT and **knowledge tracing** (Bayesian, and neural "Deep Knowledge Tracing"). *(Corbett & Anderson, 1994/95, *User Modeling and User-Adapted Interaction*, 4(4):253–278, DOI 10.1007/BF01099821; Piech et al., 2015, *Deep Knowledge Tracing*, NeurIPS, arXiv 1506.05908; CAT — §1.4.)*
- **"Juice" / game feel → feedback design.** The craft of responsive feedback ("game feel") maps to assessment feedback — but in a scored segment feedback must be neutral/process-focused, and **over-juicing measurably lowers performance** (§1.7). *(Swink, 2009, *Game Feel*, Morgan Kaufmann, ISBN 978-0-12-374328-2; Kao, 2020 — §1.7.)*
- **Accessibility in games → Universal Design for Assessment & accommodations.** Design accessibility in from the start: the seven elements of Universal Design for Assessment + construct-preserving accommodations. *(Thompson, Johnstone & Thurlow, 2002, NCEO Synthesis Report 44, ERIC ED467721; AERA/APA/NCME, 2014, ch. 3.)*
- **Anti-cheat / exposure → test security & item-exposure control.** Games fight exploits; adaptive tests fight over-exposure of their best items with exposure-control algorithms + secure delivery. *(Sympson & Hetter, 1985, Proc. 27th Military Testing Association, pp. 973–977; van der Linden & Glas, 2010 — §1.4.)*
- **The migration has a hard limit — it transfers *engineering*, not *validity*.** Anything a game adds that moves scores but isn't the target construct is **construct-irrelevant variance**, a defined validity threat; every mapping above still has to clear the §1.3 psychometric bar. *(Haladyna & Downing, 2004, *Educational Measurement: Issues and Practice*, 23(1):17–27, DOI 10.1111/j.1745-3992.2004.tb00149.x.)*

---

## DOK 2: Summary (compression — traceable to DOK 1)

Cognitive screens like CogAT do one thing well and cheaply: they measure developed verbal/quantitative/nonverbal reasoning that predicts achievement at roughly r ≈ .6 (1.1). Their failures cluster not in *what* they measure but in *where and when* they measure it: fixed-form tests are least precise in the gifted tail exactly where the cut sits (1.2, 1.3), a single childhood score regresses so hard that roughly half of top-3% scorers are gone within a year (1.2), one screen reproduces only about a third of another's "top" list (1.2), nonverbal "fairness" fixes do not close opportunity gaps (1.2), and verbal/quant composites miss most of the spatially gifted (1.2). The field already has metrics that expose these failures precisely — conditional SEM, classification accuracy/consistency, false-negative rate, base-rate-aware PPV, incremental validity, and DIF (1.3) — and mature methods that attack them — adaptivity, above-level items, vertical scaling, multidimensional profiles, and (less proven) dynamic and process-based assessment (1.4). Crucially, the arithmetic caps what "better" can mean: reliability and validity coefficients are bounded and cannot double, so any honest "2×" claim must live on the unbounded tail axes — halving the false-negative rate at the cut, multiplying information at high θ (≈4× to halve the SEM), and raising classification consistency (1.5).

Game-based ("gamified") assessment extends this picture more than it overturns it. It is a real paradigm with a working *adult* proof-of-concept — Roblox's own hiring assessment measures higher-order cognition through play (1.6) — and learning science says a well-built game can lower test anxiety, hold a child in flow, and elicit genuine effort (1.7). But the independent correlation between game scores and cognitive ability is only moderate (r ≈ .30, and measured in adults), no study has validated game-based assessment for high-stakes K-8 identification, and prior gaming experience injects documented test bias (1.6). Learning science adds two cautions: extrinsic game rewards can *crowd out* the motivation they intend to boost — more so for children — and game interfaces can pile on construct-irrelevant cognitive load (1.7). The honest read: gamification most reliably improves *engagement and access*; its effect on *measurement validity* for gifted identification is unproven and double-edged.

Zooming out, most of what makes a good game is *engineering* that migrates cleanly to assessment — playtesting→cognitive labs, telemetry→process data, difficulty curves→adaptive routing, procedural content→automatic item generation, player-modeling→IRT/knowledge tracing, live-ops→continuous calibration/DIF, accessibility→universal design, anti-cheat→exposure control (1.8) — yet none of it transfers *validity*. So the corrected design the facts support scores an ability estimate θ + conditional SEM (not "level reached under a clock"), combines segments compensatorily, measures on ≥2 occasions, and calibrates-or-quarantines the gamified 3D segment with DIF checks (see `test-design-recommendations.md`).

---

## Learning Science Rationale (applied design layer — reference, not an approved build)

**Goal & learner:** K-8 applicants (ages ~5–13; wide reading, attention, and device range) must show their *true* reasoning under low-anxiety, engaging conditions — without the game mechanics becoming what gets measured. Each principle below is a *design consideration*, not a committed feature.

| Principle | Why it applies here | Concrete design decision | Source |
|---|---|---|---|
| Cognitive load — cut extraneous | Controls/graphics consume working memory needed for reasoning | Untimed tutorial to automate controls; minimal UI; scoring starts only after a control-mastery check | Sweller, van Merriënboer & Paas (1998/2019) |
| Flow / desirable difficulty | Best effort needs challenge ≈ skill | Adaptive item selection holds success ~50–70%; no dead-end frustration or trivial boredom | Csikszentmihalyi (1990); Weiss (1982) |
| Rewards crowd out intrinsic motivation (worse for kids) | Points/badges can distort effort and the score | Task-focused *feedback*, not performance-contingent tangible rewards; no selection-context leaderboards | Deci, Koestner & Ryan (1999) |
| Test anxiety adds construct-irrelevant variance | Anxiety lowers K-8 scores (r ≈ −.22 to −.25) | Low-stakes framing, a practice run, no visible countdown, retry-friendly | von der Embse et al. (2018); Robson et al. (2023) |
| Feedback is double-edged | ~1/3 of feedback interventions *lower* performance | Feedback is process/strategy-focused, never ego/praise or normative rank | Kluger & DeNisi (1996); Hattie & Timperley (2007) |
| Novelty / familiarity bias | Gaming experience predicts GBA scores but not ability (test bias) | Equal mandatory practice for all; measure self-rated game experience; run DIF by gamer/non-gamer and device | Hamari et al. (2014); Ohlms et al. (2025) |

**Tradeoffs / failure modes to watch:** the very mechanics that raise engagement (rewards, competition, rich graphics) are the ones most likely to *distort* or *bias* the score; "fun" that lifts motivation can simultaneously add extraneous load and advantage experienced gamers. Any gamified score must clear the *same* tail-quality and DIF bar as a conventional test (§1.3) before it earns a high-stakes role — **engagement is not evidence of validity.**

---

## Game Design Rationale (applied design layer — reference, not an approved build)

**Goal & learner:** keep K-8 (especially K-4) producing their *true* best-effort reasoning in a game format, without game craft becoming what gets measured. Design *considerations*, not committed features.

| Game-design principle | Why it applies | Concrete assessment-design decision | Source |
|---|---|---|---|
| Intuitive controls → competence/autonomy | Clumsy controls suppress effort and leak into the score | Unscored onboarding to a control-mastery check before scoring; "invisible" 3D controls | Ryan, Rigby & Przybylski (2006); Sweetser & Wyeth (2005) |
| Tutorials scale with mechanic complexity | Tutorials help most for complex/novel mechanics | Heaviest onboarding for the 3D spatial task; lightest for tap-to-answer items | Andersen et al. (2012) |
| Flow zone + *invisible* dynamic difficulty | Challenge ≈ skill sustains effort; visible "adjustment" feels unfair | Adapt difficulty between items/modules (MST-style), never announced | Chen (2007); Hunicke (2005); Weiss (1982) |
| Intrinsic integration (not "chocolate-covered broccoli") | If the mechanic ≠ the construct, you measure game skill | The spatial mechanic *is* the reasoning act; no unrelated reward mini-games | Habgood & Ainsworth (2011); Malone (1981); Bruckman (1999) |
| Medium "juice," not maximal | Over-juicing lowers performance & splits attention | Tune feedback to medium; ban extreme celebration effects in scored blocks | Kao (2020); Swink (2009) |
| Failure-friendly design | Excess failure-pain makes kids quit (signal lost) | Retries, no "game over," no streak penalties, soft transitions past hard items | Juul (2013) |
| Engagement across four modes, not points | Points/badges risk reward-crowding (§1.7) | Design cognitive/affective/behavioral/social engagement; avoid tangible rewards | Plass, Homer & Kinzer (2015) |

**K-4 row-set (ages ~5–9 — hardest to engage):**

| K-4 constraint (evidence) | Concrete decision | Source |
|---|---|---|
| Weak fine-motor/pointing; larger targets help | Prefer touch (tap/swipe); large hit-areas; avoid precision-drag in scored items | Hourcade et al. (2004); NN/g [practitioner] |
| Pre-/early readers can't carry text | Audio + visual/animated instructions; icons over words; worked demo per task | Hourcade (2008); NN/g [practitioner] |
| Sustained attention still developing 5–9; worse under load | Short segmented sessions, variety, breaks; brief scored blocks | Betts et al. (2006) |
| 2-year bands differ; young need concrete framing + constant feedback | Age-band configs (5–6 / 7–8 / 9); concrete/narrative framing; no visible timers/fail/scores | NN/g [practitioner]; Malone (1981) |
| Involve the target children | Pilot with 5–9-year-olds as testers/informants before operational use | Druin (2002); Hourcade (2008) |

**Tradeoffs / failure modes:** the mechanics that raise engagement (rewards, competition, rich graphics, heavy juice) are the ones most likely to *distort or bias* the score — **construct-irrelevant variance** (Haladyna & Downing, 2004). Intrinsic integration is double-edged: imperfect integration measures *dexterity/game skill*, worst for K-4 (motor limits). Prior gaming/device familiarity is a documented fairness threat (Ohlms et al., 2025, §1.6). **Engagement is never evidence of validity** — a gamified score must clear the same tail-quality + DIF bar as any test (§1.3).

---

## Design implications if GT builds (conditional — full detail in `test-design-recommendations.md`)

*Not a scope approval; building a test remains a charter non-requirement pending `DECISION_LOG.md` + `SCOPE_EXCEPTION_LOG.md` entries.* The corrected design the facts support:

- **Score θ + conditional SEM, not "level reached under a clock."** The proposal's speed-weighted "difficulty reached" conflates reasoning with processing speed (R5/R9); keep speed/latency as a *separate, non-decisional* signal. *(§1.3; Bergner & von Davier, 2019.)*
- **Combine segments compensatorily / OR-pathways — never a conjunctive AND gate** (AND maximizes false negatives — McBee, Peters & Waterman, 2014).
- **Measure on ≥2 occasions** (one-shot instability — §1.2).
- **Calibrate the gamified 3D segment (IRT) or quarantine it as non-decisional** until locally validated; isolate spatial ability from "when to stop"; equal mandatory practice; **DIF by device / gaming experience / gender** (§1.6, §1.8).
- **Length by a precision stopping rule, bounded by K-4 attention** — not a fixed clock (§1.7).

---

## DOK 3: Insights — **YOURS to write** (I only ask questions and offer labeled starters)

> **Hard rule of this method:** I did not write your insight. Below are provocation questions plus 2–3 *clearly-labeled starter hypotheses* you must interrogate, revise, or reject. A DOK 3 insight is a connection **no single source states** — you earn it by bridging the facts above.

**Provocation questions:**
1. Facts 1.2 (fixed-form tests are weakest at the tail) + 1.2 (one-shot scores regress ~50%/yr) + 1.4 (CAT gives equal precision at all θ) — *what do these three imply together that none says alone about whether the gifted-ID problem is a **construct** problem or a **precision-and-stability** problem?*
2. Fact 1.5 says reliability/validity can't double but false-negative-rate/information/classification-consistency can. *If the only honest "2×" is on the tail axes, does "build a better test" even name the right intervention — or is the highest-leverage move an **adaptive, high-ceiling, repeated administration** of measures we already trust?*
3. Fact 1.2 (spatial misses 70% of the top-1%) is a *coverage* failure; Fact 1.2 (tail imprecision) is a *precision* failure. *Which failure is bigger for GT's actual applicant pool, and can one test fix both without becoming two tests?*
4. McBee/Peters/Waterman (Experts #3) say the **rule** drives false negatives, not the test. *If true, what best practice does that break for a "2× better test" project?*

**Starter insight candidates — scaffolding only; make them yours or discard them:**
- *(Starter A — interrogate me)* "Gifted-ID's dominant error is not narrow constructs but **imprecise, one-shot measurement at the tail**; therefore the metric that defines test quality should be **conditional SEM and classification consistency at the cut**, not headline reliability/validity."
- *(Starter B — interrogate me)* "Because the only unbounded improvement axis is false-negative reduction at the cut, an **adaptive + above-level + re-test** design of existing constructs can plausibly halve false negatives — a bigger, cheaper win than inventing a new construct."
- *(Starter C — interrogate me)* "Adding spatial (fixing the 70% miss) and fixing the *combination rule* are **separable** from building a new instrument — so 'build our own test' may be conflating three different interventions."

**Added provocations (game-based / gamified testing):**
5. Fact 1.6 says game scores correlate only r ≈ .30 with cognitive ability (in adults) and 1.7 says gamification's proven effect is on *engagement*, not validity. *If a game raises engagement but not measurement precision, is it solving the gifted-ID problem (1.2/1.3) — or a different, still-valuable problem (access and participation)?*
6. Fact 1.6 (gaming experience predicts GBA scores but not ability = test bias) sits directly against the hypothesis that games "check the boxes current tests miss." *Does gamification patch the opportunity/ELL gap (1.2) — or merely move it from a language advantage to a screen-time/device advantage?*
7. Roblox's proof-of-concept works for *adult hiring* and even they engineer against the novelty effect (1.6). *What would have to be true for that to transfer to a high-stakes K-8 gifted decision — and is that mainly a measurement question or a fairness question?*

**Starter insight candidate — scaffolding only:**
- *(Starter D — interrogate me)* "Gamification's real, evidence-backed contribution to gifted ID is **engagement and access** — getting more kids, especially anxious or disengaged ones, to show their best — *not* measurement precision; so a game should sit on top of a psychometrically validated adaptive engine, never replace it."

**Candidate DOK 3 insights (drafts for you to interrogate, revise, or own — NOT final, NOT my verdict).** Each bridges facts no single source states together and names its counter-view. Per this method's hard rule, these are scaffolding; the insight only counts once *you* interrogate and own it.

- *(DOK3-a — Intrinsic integration is the make-or-break variable.)* Whether a game *measures reasoning* or *measures dexterity* is decided almost entirely by **intrinsic integration**: when the core mechanic **is** the construct (Habgood & Ainsworth, 2011) the telemetry becomes evidence; when it isn't, motor/control load (Hourcade et al., 2004) and enjoyment (Kim et al., 2023) become the score — i.e., construct-irrelevant variance (Haladyna & Downing, 2004). *Bridges 1.6 + 1.7 + 1.8.* **Counter-view:** stealth-assessment proponents argue process data captures *extra* constructs (persistence, strategy) that justify the mechanic even under loose integration.
- *(DOK3-b — Engagement and validity are orthogonal axes.)* Gamification reliably moves *engagement/learning* (Sailer & Homner, 2020) while the independent ability correlation stays only moderate and adult (r≈.30; *J. Intelligence*, 2024) — so "fun" can rise while measurement quality falls; engagement is an *access* lever, validity a *psychometric* one, and they must be evaluated separately. **Counter-view:** if disengagement is itself a main source of missed talent, raising engagement could raise validity for exactly the under-identified kids.
- *(DOK3-c — The transferable game-dev superpower is live-ops, not the 3D graphics.)* The highest-value migration isn't the interactive world; it's the *operational discipline* — continuous A/B experimentation (Kohavi et al., 2020) + item-parameter-drift monitoring (Bock et al., 1988) + DIF (Meredith, 1993) — turning one-shot norming into always-on calibration. *Bridges 1.8.* **Counter-view:** continuous re-calibration fights auditability/pre-registration (R7) — a moving scale is harder to defend than a frozen one.
- *(DOK3-d — Telemetry-as-evidence is double-edged.)* The same rich process data that lets a game infer skill (knowledge tracing — Corbett & Anderson, 1995; Piech et al., 2015; *Game Analytics*, 2013) multiplies the surfaces where construct-irrelevant variance enters (device, dexterity, familiarity — Ohlms et al., 2025): more signal ≠ more validity. **Counter-view:** with enough calibrated data, DIF/invariance tooling may *detect and remove* nuisance dimensions better than a sparse fixed test can.
- *(DOK3-e — The "decide-when-to-stop" mechanic measures a different construct.)* A self-paced/timed optimization game (the proposal's segment 3) scores metacognition, risk tolerance, and satisficing style as much as spatial ability — so "difficulty reached" is a *speed × personality × ability* composite, not a spatial θ. *Bridges the proposal + 1.3 + `test-design-recommendations.md`.* **Counter-view:** if GT explicitly wants to value persistence/metacognition, that's a feature — but it must then be scored and validated as its *own* construct, not folded into spatial ability.
- *(DOK3-f — For K-4, onboarding load can silently convert a spatial test into a dexterity/speed test.)* Below ~age 9, motor/pointing limits (Hourcade et al., 2004) + still-developing sustained attention (Betts et al., 2006) mean the interface itself consumes the working memory meant for reasoning (Sweller) — so a "spatial game" can measure fine-motor control and speed unless controls are automated to mastery first. **Counter-view:** touch-native, heavily-onboarded design may neutralize this — but that is an empirical claim requiring per-age-band DIF, not an assumption.

---

## DOK 4: SPOV — **YOURS to write** (spikiness test + labeled candidate drafts)

> **Spikiness test:** if 20 experts would *not* argue about it, it isn't spiky enough. It must be prescriptive, debatable, evidence-backed, and actionable. The key question: *if your DOK 3 insight is true, what common practice is WRONG, and what new rule must we follow?*

**Candidate SPOV drafts — starters you must revise and own (do not ship as-is):**
- *(Candidate 1)* "Stop grading gifted tests by reliability and validity. **A gifted test's quality is its conditional standard error and classification consistency at the cut** — and by that standard, a single fixed-form CogAT administration is the wrong instrument. GT should target a **2× reduction in false negatives at the cut** via adaptive, high-ceiling, repeated measurement, and refuse any 'accuracy' claim not stated as a tail metric."
- *(Candidate 2, spikier)* "**Building 'our own test' is the wrong goal.** The evidence says the leverage is in the *administration design and decision rule*, not a new item set. GT should build an **adaptive delivery + compensatory rule + spatial pathway** on validated items and prove a halved false-negative rate — and treat 'invent a new normed test' as scope creep that fails R8 feasibility."

**Push-back you should expect (this is what makes it spiky):** a Weiss-camp psychometrician will say adaptivity + a real item bank genuinely *can* be a "new test" worth building; a Lohman-camp realist will say no design fixes one-shot instability without repeated measurement; a McBee-camp modeler will say you're overrating the instrument vs. the rule. If your SPOV doesn't make at least one of them want to argue, sharpen it.

**Candidate SPOV draft on gamified testing — starter you must revise and own:**
- *(Candidate 3)* "Gamified assessment should be adopted for **engagement and access, not as the measurement**: the score must still come from a psychometrically validated adaptive engine held to conditional-SEM and DIF standards (§1.3). A gifted screen that trades measurement validity for 'fun,' or that lets game-familiarity leak into the score (1.6), fails R5/R9 no matter how many kids enjoy it."

**Push-back you should expect:** a stealth-assessment proponent (Shute camp) will argue process data captures constructs CogAT *can't* (persistence, systems thinking), so the game *is* the better measurement; an engagement advocate will argue broader participation is itself a fairness win worth a small validity cost. Decide where you land — and defend it.

---

## Purpose (focus — one paragraph, yours to finalize)

**Why now:** GT is choosing how to identify capability, and the default (a single national-cutoff screen) fails hardest exactly at the gifted tail it is meant to find. **Who acts:** the GT selection/measurement owner and the independent evaluator — not "everyone." **What changes tomorrow:** measurement quality is reported as *tail metrics* (conditional SEM and classification consistency at the cut, subgroup false-negative rates), any "2× better" claim is pinned to an unbounded axis with a defined estimator, and a decision to build vs. adopt-and-adapt is made explicitly through the decision/scope logs rather than assumed.

---

## Open assumptions & verification gaps (kept honest)

- CogAT's current-form upper-tail reliability, conditional error, and ceiling are `[UNVERIFIED]` (publisher-controlled).
- No located meta-analysis validates **dynamic assessment** or **stealth/process-data** assessment for K-8 gifted identification specifically.
- Time/cost figures (1.5) come from K-12 achievement testing, not a cognitive-ability battery — indicative, not exact.
- The "2×" target is only defined once you pick the axis (false-negative rate vs. information vs. classification consistency); these are not interchangeable.
- Vendor/author COIs are attached to several "pro" facts (Weiss/CAT, NWEA, CTY-STB, Ozen author-of-test effect); each is paired with an independent source in the register.
- **No study validates game-based / gamified assessment for high-stakes K-8 gifted identification** — GBA validity evidence is adult and/or low-stakes/formative, and the independent ability correlation is only moderate (r ≈ .30).
- **Game-familiarity / device access is a documented construct-irrelevant advantage** (Ohlms et al., 2025); a gamified screen must prove it does not swap a language/opportunity bias for a screen-time bias.
- The feedback-principle citations (Kluger & DeNisi, 1996; Hattie & Timperley, 2007) are drawn from the learning-science canon and were not independently DOI-verified this session.
- **Game-dev practices migrate the *engineering*, not the *validity* (1.8)** — every mapping (playtesting→cognitive labs, telemetry→process data, PCG→AIG, etc.) still has to clear the psychometric bar; the migration itself proves nothing about whether a gamified score is valid.
- The **"attention span ≈ age in minutes" rule is `[UNVERIFIED]` / likely a myth** — developmental attention evidence (Betts et al., 2006) supports "shorter, varied blocks for K-4" but licenses **no** specific minute figure; set length by the precision stopping rule (`test-design-recommendations.md`).
- Several game-design sources are **not peer-reviewed measurement evidence**: NN/g children's-UX guidance is *practitioner*; Chen (2007, CACM) is an *editorial Viewpoint*; Bruckman (1999) is a *GDC talk*; Vatavu et al. (2015) touchscreen DOI is `[UNVERIFIED]`. Use as design heuristics to validate, not as validity claims.
