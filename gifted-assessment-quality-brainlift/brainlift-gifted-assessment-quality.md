# BrainLift: Identifying Giftedness Through Testing — What Cognitive Tests Capture, Miss, and How to Measure Quality at the Tail

## Owners

- Aadi Takle
- Tiffany Lam

## Purpose

### Purpose
This BrainLift synthesizes research on **identifying giftedness through testing**: what cognitive-ability instruments like CogAT capture and miss at the gifted tail, the psychometric standards and metrics that judge measurement quality at the cut, the maturity and limits of remediation methods (adaptive, above-level, repeated, and compensatory testing plus game-based assessment), and the learning-science and game-design considerations for eliciting a child's best performance. It is a standalone, source-traceable map of what the evidence does and does not support.

### In Scope
- What cognitive-ability and related instruments measure and miss at the gifted tail, including spatial breadth, rank instability, gatekeeping, and equity disparities.
- Psychometric standards and metrics for judging tail measurement quality (conditional SEM, decision accuracy, DIF/DTF, classification consistency, and related operating-point metrics).
- Maturity and limits of remediation methods: CAT/MST, above-level testing, repeated measurement, compensatory combination rules, and game-based child assessment evidence.
- GT School / Alpha and comparable programs as **case-study context** and clearly labeled **[COMPANY CLAIM]** / **[PRESS]** statements where relevant.

### Out of Scope
- Designing or implementing an admissions product, selecting vendors, or setting live admissions policy.
- Specifying operational workflows, software architecture, implementation roadmaps, or data systems.
- Treating predictive validity, access change, or selected-cohort growth as proof of program impact without an identified counterfactual design.

## DOK 4: Spiky Points of View (SPOVs)

**SPOV 1: A cognitive assessment should treat speed as collateral evidence that sharpens the ability estimate, never outweighing speed over accuracy, and only after engagement with the test is independently verified and tail/subgroup bias is ruled out.**
- Elaboration: Assumably, a focused, quick child demonstrates giftedness with correct-and-fast answers. However, evidence shows that move is wrong even when focus is guaranteed because raw speed is ambiguous. Under speed-accuracy tradeoffs, it's only interpretable when time and accuracy are modeled together, emphasizing information-uptake over clock time (13.8). In fact, response *consistency* predicts ability better than peak speed, so a speed bonus can reward impulsivity and penalize high-level reflection (13.9). Although engagement is a valid precondition to improving validity against rapid-guessing (13.8), it's a measurement problem to solve rather than declare. Response time alone cannot establish engagement (14.1), and detecting it at scale requires off-task modeling (12.2). A perfectly engaged sample still leaves the fairness problem untouched since processing speed is the least general intelligence-loaded ability (15.1), depends on deliberately timed tasks (7.5), and has the highest motor/device/familiarity variance in K-4 children (13.4, 12.6, 9.11). Therefore, we must let response time supplement the ability estimate as jointly-modeled collateral data, gated behind verified engagement and tail-level subgroup checks (9.7, 9.11) and validated for this specific use (11.9) without a standalone speed score.

**SPOV 2: A gifted exam's quality must be judged by its evaluation of outlier metrics, such as conditional error and classification consistency. It should never evaluate headline reliability or validity.**
- Elaboration: Reliability is capped at 1.0 and an observed validity coefficient at √(r_xx·r_yy). Both are normally reported for the whole scale and averaged where the gifted decision is *not* made (9.9). The metrics that grade a gifted exam are all conditional on the cutoff. Conditional SEM/test information at the cutoff (9.1), classification accuracy and consistency (9.3), the subgroup false-negative rate with base-rate-aware PPV (9.4, 9.11), partial-AUC over the tail region rather than whole-curve AUC, and DIF read at the cutoff rather than the mean (Raju, 1988). The goal of being "2× better than CogAT" is valid only regarding relative efficiency ≥2 at the cutoff plus roughly half the false negatives (the number-needed-to-screen, 1/Youden's J) at matched specificity (Lord, 1980; Youden, 1950), not as a doubled reliability or validity coefficient (9.9). Every one of these needs a "truth" label that operational data only holds for admitted children (9.12), so a false-negative rate requires a small random, fully-assessed audit sample that includes rejected applicants. We should expect push-back that, without equating a new test to CogAT, Linn's linking ladder caps the comparison at speculation. Even a clean tail-metric win may not license a strict "beats CogAT" claim (Linn, 1993).

**SPOV 3: No leading instrument gives GT the combination it needs, so building a custom adaptive screen is GT's best option, provided it funds calibration and owns the cut.**
- Elaboration: Each leading test does one thing well and misses what GT needs. CogAT measures verbal, quantitative, and nonverbal reasoning and predicts achievement (7.1, 7.2). However, it's nonadaptive, inprecise at its publisher-controlled cutoff (8.6), and operates its cutoff on a scale GT does not own (Insight 11). NNAT3 and Raven's are nonverbal-only, which carries roughly twice the standard error of a multi-format battery and still leaves 0.5–0.67 SD English-learner gaps (8.4, 15.2), and NNAT3 reuses prior items. MAP is adaptive and high-ceiling (10.1) but was not built as a gifted gate, and its cut-specific precision is unknown. WISC-V and SB5 are individually-administered, high-quality tests, but they're not scalable as a universal screen and have thin gifted-tail validation (15.1). No single off-the-shelf test is all encompassing: adaptive, high-ceiling, spatial-inclusive, scalable, and cut-controllable. Only a custom adaptive screen lets GT concentrate item information at its own cut, add the spatial dimension that fixes CogAT's biggest coverage gap (8.5, 10.7), run a rotating bank with never-reused forms to blunt wealth-linked coaching, which averages about 5 IQ points and is not defeated by "culture-fair" matrices (Scharfen et al., 2018; Bors & Vigneau, 2003), enforce a compensatory rule with DIF at the cut (SPOV 5), and own the auditable decision record. Feasibility beats the multi-year, multi-million-dollar bohemeths with copyright restrictions. An open-source stack (mirt/mirtCAT, Concerto) and calibrated public-domain seed items (ICAR, mental-folding, Corsi, n-back) exist (15.5), and building-level local norms plus a staged pilot of ~100–200 per grade lower entry cost. Building in-house inherits the full validity and legal burden the vendor fee currently absorbs (Larry P.; COPPA/FERPA), calibration still needs thousands of responses, and a great instrument behind a bad cut or rule gains nothing (Insights 11–12). "Adopt-and-adapt" (CogAT plus one MAP domain plus a compensatory rule and local norms) is the alternative a custom build must beat.

## Experts

### David Lohman (with Korb, Gambrell, Lakin); McBee, Peters, Waterman; Warne
- **Who:** Gifted-identification and psychometric measurement researchers; Lohman co-authored CogAT.
- **Focus:** Single-cutoff screens, nomination gates, nonverbal substitution, above-level testing, and the limits of each fix.
- **Why Follow:** They supply the core false-negative and combination-rule evidence that one test rarely identifies "the" gifted students.
- **Where:** [Lohman (2005)](https://files.eric.ed.gov/fulltext/EJ746059.pdf) | [Lohman & Gambrell (2012)](https://library.scottbarrykaufman.com/uploads/2013/04/Lohman-Gambrell-2012.pdf) | [McBee, Peters & Miller (2016)](https://journals.sagepub.com/doi/abs/10.1177/0016986216656256)

### Baker; Lord; Livingston & Lewis; AERA/APA/NCME; Weiss; van der Linden; Thompson
- **Who:** Psychometricians and standards bodies defining test quality, IRT/CAT, and fairness metrics.
- **Focus:** Information/conditional error, decision accuracy, DIF/DTF, calibrated item banks, CAT/MST, and security.
- **Why Follow:** They define what "tail measurement quality" means and how to evaluate it rigorously.
- **Where:** [AERA/APA/NCME Standards (2014)](https://www.testingstandards.net/) | [Weiss & Kingsbury (1984)](https://doi.org/10.1111/j.1745-3984.1984.tb01040.x)

### Wai, Lubinski, Benbow; Deary
- **Who:** Longitudinal ability researchers (SMPY/Project TALENT) and cognitive-prediction counterweights.
- **Focus:** Construct breadth (spatial vs. math/verbal talent search) versus strong predictive validity of general ability.
- **Why Follow:** They disagree on whether narrow screens miss talent or whether ability measured young predicts attainment — the central tension for selection design.
- **Where:** [SMPY](https://my.vanderbilt.edu/smpy/) | [Wai, Lubinski & Benbow (2009)](https://doi.org/10.1037/a0016127) | [Deary et al. (2007)](https://doi.org/10.1016/j.intell.2006.02.001)

### Shute, Ventura, Mislevy; Bipp et al.; Aneni et al.; Gomez et al.; Ohlms et al.
- **Who:** Evidence-centered and game-based assessment researchers plus independent convergence/fairness studies.
- **Focus:** Whether process data in playful tasks can measure ability and where child game-assessment evidence still falls short for high-stakes gifted ID.
- **Why Follow:** They supply both the promise and the ceiling for adaptive/game-based K–8 assessment claims.
- **Where:** [Mislevy, Steinberg & Almond (2003)](https://doi.org/10.1207/S15366359MEA0101_02) | [Shute & Ventura (2013), *Stealth Assessment*](https://doi.org/10.7551/mitpress/9589.001.0001)

## DOK 3: Insights

**Insight 8 - Response time is a valid ability assessor only when engagement is verified, speed and accuracy are modeled jointly, and the measured metric is information comprehension rather than raw item time.**
- Raw speed isn't directly interpretable for three reasons. Firstly, disengaged children "rapid-guess," producing fast responses that carry no signal, so effort must be detected and filtered (13.8). Our DOK 2 Knowledge Tree says that response time alone cannot certify engagement (14.1), and catching it at scale requires off-task detection (12.2). Even for a focused child, a fast answer is ambiguous under the speed-accuracy trade-off, becoming a reliable metric only when time and accuracy are *both* taken into account (13.8). In examples where speed does carry ability signals, it lives in information-uptake efficiency rather than raw clock time.
**Insight 9 - Response consistency across similar questions is a broadly applicable indicator of ability at the tails, making it a strong measurement to track for gifted screen tests.**
- One of the most general measurements of cognitive ability is response consistency. The variability in a child's response times to similar difficulty questions is associated with higher measured ability across diverse tasks, ages, and samples (13.9). This method is also able to statistically remove "aberrant responses" to avoid biasing against distractions, boredom/disengagement, and potentiall even students with learning disabilities like ADHD (to be proven) (13.10). At the tail of the scores, fixed form accuracy measurements become worse abilities of measurement as they cluster against a ceiling or common-knowledge boundary (8.1, 9.1). In constrast, continuous signals like consistency provide far more variability between applicants, allowing for more granular distinctions to be made between candidates for scoring and admissions purposes (13.8, 14.1). Of course, this requires the kid to be engaging with the exam content to be an accurate measurement, which is why test design will play a big part in whether this metric performs well in measuring giftedness for the  K-8 target demographic (13.9).
**Insight 10 - Verifying engagement removes noise in reference to accuracy and timing, but it doesn't address bias. Thus, accounting for speed must also clear the same tail and subgroup fairness bar as the score itself.**
- Processing speed is the least general intelligence ability and is deliberately stripped from a g-composite, so speed doesn't mask reasoning (15.1). Timed tasks make speed the construct (7.5), with their motor, device, adn familiarity variance the highest among young children (13.4, 12.6). Because a 1-2% top percentile cutoff sits where biases are prominent, a speed component would need the same measurement invariance and subgroup error checks as the reasoning score (9.7, 9.11) and data validation for its use (11.9) before factoring into admission scores.
**Insight 11 - At GT's operating point, the cutoff score is a bigger error source than the choice of test.**
- The top 1–2% decision is made exactly where a fixed-form test carries the least information (8.1) and where CogAT's own upper-tail precision is publisher-controlled (8.6). Three cut-specific errors compound it, none about which reasoning test is chosen. A standard-setting method is only as good as its recovery of the intended cut, and the gifted cut sits where information is lowest (Reckase, 2006). "IQ 130" is the 98th percentile on an SD-15 scale but roughly the 97th on CogAT's SD-16 scale, so a cutoff is not portable across instruments (Cogn-IQ, 2024), and the 99th-percentile norm rests on very few cases. Percentile ranks jump in large steps the father we stray from the median (Warne, 2012). Regression to the mean then pulls a borderline observed 130 toward a true score near 127 (8.2, 8.7). The highest-leverage design object is therefore not the item set but an auditable cut expressed as a θ-band with a documented standard-setting method, a local-norm reference, and a boundary/retest policy (9.13). The Track B camp counters that the bigger miss is coverage, the spatially gifted a verbal/quant screen never sees (8.5).
**Insight 12 - Adaptivity buys precision, but only the combination rule and pool size account for fairness.**
- A computer-adaptive engine delivers near-equal precision at every ability level (10.1), yet that precision behind the wrong decision architecture recovers almost nothing. A nomination or screening gate placed before testing can only lose students. System sensitivity collapses to roughly 0.28 vs. 0.84 with no gate, about 72% of gifted children missed. A conjunctive "AND" rule across measures caps sensitivity near .53–.76 at the 99th percentile even for near-perfect tests, while a compensatory or mean rule actually gains as measures are added, reaching the high-0.70s to low-0.80s for three to four tests (McBee, Peters & Miller, 2016; McBee, Peters & Waterman, 2014). On real CogAT data, the diversity effect of AND/OR/mean rules came mostly from the size of the tested pool, not the rule label. An "OR" rule does not manufacture diversity without lowering the bar (Lakin, 2018). The single highest-leverage lever against false negatives is universal intake feeding a compensatory aggregation, not a more precise instrument. Measurement realists counter that one-shot instability is the dominant error (8.2).
**Insight 13 - Engagement levers access-and-missingness, not validity, which is why it helps the tail.**
- Gamification's replicated effect is on engagement, participation, and anxiety (13.5, 13.1), and game-familiarity predicts game scores without predicting ability, which is construct-irrelevant variance (12.6). Because tail accuracy is biased by *who is missing* from the data (9.12) and gamified, low-anxiety formats measurably reduce missing data and dropout in young children, engagement improves the tail estimate *indirectly* through completeness, even though it adds nothing to validity per item. A game therefore belongs as an engagement layer on top of a psychometrically validated adaptive engine, with mandatory equal practice and DIF by device and gaming experience (Insights 8–10). Stealth-assessment proponents counter that process data captures extra constructs such as persistence and strategy that justify scoring the play itself.
**Insight 14 - "Scores high," "predicts achievement," and "predicts benefit from GT" are three different claims. The screen only has evidence for the first two.**
- A gifted screen validated against achievement is not validated for who will *benefit* from GT's program. The two are distinct claims, and the benefit slope may be minimal even where the achievement-prediction slope is steep. CogAT-to-achievement validity is moderate (7.2) and predicts later achievement (7.3), but Sackett and colleagues (2022) recently revised cognitive-ability *operational* validity downward (from roughly .51 to .31) after showing the standard range-restriction corrections overcorrected. Even the achievement claim is smaller than usually advertised. Because operational data carry a "truth" label only for the children who were admitted (9.12), a program never sees the counterfactual that would test the benefit claim on its own applicants. The implication is that the exam's output is a *capability/readiness* estimate, never a "will-benefit" prediction. This is the measurement-side half of a bridge whose causal half lives in the counterfactual BrainLift. The SMPY camp counters that ability keeps predicting attainment with no ceiling, even within the top 1%.
**Insight 15 - The per-applicant signals worth recording are the ones that widen the decision, not a single score.**
- To improve the *decision* rather than merely rank children, the exam should give each child an IRT ability estimate with its conditional SEM as a *band*, so borderline cases are flagged rather than forced across a line (9.1, 9.3, Insight 11). A classification-consistency or retest flag for near-cut children, given one-shot instability (8.2) should be taken into account. It should also measure esponse consistency across equal-difficulty items as a tail signal (Insight 9), jointly-modeled response time (Insight 8, SPOV 4), an engagement filter, a compensatory cross-domain aggregate rather than a minimum across segments (Insight 12), and DIF at the cut kept as a standing monitor (9.7). Everything that is *not* capability, including accommodation, device, provenance, and prior gaming exposure, is recorded but kept out of the score. Every added signal multiplies the surfaces for construct-irrelevant variance, so each must clear incremental validity (9.6) and DIF (9.7) before it is allowed to move a decision.

## DOK 2: Knowledge Tree

### Overall Summary

CogAT-class measures capture developed verbal, quantitative, and nonverbal reasoning and have meaningful predictive validity, but a one-shot fixed-form cut is a weak proxy for a stable, complete gifted-capability construct. The factual record shows tail error, rank instability, false negatives created by gates and combination rules, missed spatial talent, and unequal access; it also shows that universal, multiple-measure screening can improve identification without abandoning a capability standard. Any improvement claim must be tied to a defined operating point and metric—conditional SEM/reliability, relative efficiency at the cut, false-negative rate, classification consistency, PR-AUC/precision@k, and subgroup DTF/error rates—not a vague claim of “2× validity.” Those metrics are still invalid if the two tests lack a common calibration/comparison design or if "true gifted" labels are observed only for children the old screen selected.

The available technical remedies differ in maturity and risk. CAT/MST, above-level testing, repeated measurement, compensatory decision rules, spatial breadth, and DIF/DTF monitoring have plausible roles, but a CAT's real tail quality depends on its bank depth, estimator, exposure control, stopping rule, calibration uncertainty, and age-appropriate standardized delivery. Child game-assessment studies now show genuine but usually low-to-medium convergence with traditional tests; they still do not validate high-stakes K–8 gifted identification. Engagement can reduce burden or anxiety but is not validity, while gaming familiarity, device/motor access, rewards, interface load, and task misunderstanding can themselves become construct-irrelevant variance.

### Category 7: What Cognitive-Ability Tests Like CogAT Actually Measure

*General idea: before critiquing the screen, be fair to it. CogAT-class tests measure real, developed reasoning and do predict school achievement moderately well — this is the steelman for the **instrument** (the steelman for cognitive **selection** is in Category 1.5). Categories 8–11 then show where the instrument breaks down at the gifted tail.*

- **Subcategory 7.1: CogAT measures developed reasoning in three domains — it is not "just verbal/math"**
  - **Source:** Riverside Insights CogAT test descriptions
    - **Plain-language idea:** CogAT is a group-administered reasoning test split into three "batteries." Knowing what is actually on it prevents both over-claiming and under-claiming what a cutoff captures.
    - **DOK 1 — Facts:**
      - The CogAT Complete Battery contains a **Verbal** battery (analogies, sentence completion, classification), a **Quantitative** battery (number analogies/puzzles/series), and a **Nonverbal/Figural** battery (figure matrices, **Paper Folding**, figure classification). It is not "just verbal/math," and it is not devoid of spatial content.
    - **DOK 2 — Summary:** Establishes the construct CogAT actually samples; the "what it misses" case (Category 8) is about *degree and tail precision*, not a claim that CogAT measures nothing spatial.
    - **Link to source:** [Riverside Insights CogAT Test Descriptions](https://info.riversideinsights.com/datamanager-onlinehelp/cogat-test-descriptions?hsLang=en-us)
- **Subcategory 7.2: CogAT predicts achievement moderately-to-strongly**
  - **Source:** Ozen, Pereira, Karatas, Castillo-Hermosilla & Maeda (online 2024; print 2025)
    - **Plain-language idea:** "Predictive validity" is how well a test's scores forecast a later outcome (here, school achievement); it is reported as a correlation *r* from 0 (no relationship) to 1 (perfect).
    - **DOK 1 — Facts:**
      - A meta-analysis reports a mean CogAT↔achievement validity of **r = .63, 95% CI [.57, .69]**. *(Ozen, Pereira, Karatas, Castillo-Hermosilla & Maeda, first online 2024, print issue 2025, *Gifted Child Quarterly*, DOI 10.1177/00169862241285593. **COI:** the meta-analysis itself flags author-of-test effects on reported validity.)*
    - **DOK 2 — Summary:** A solid but not overwhelming correlation — and partly inflated where test authors report it — so CogAT is a good-not-perfect proxy for the achievement it is used to forecast.
    - **Link to source:** [https://doi.org/10.1177/00169862241285593](https://doi.org/10.1177/00169862241285593)
- **Subcategory 7.3: Cognitive ability is a strong *early* predictor of later achievement**
  - **Source:** Deary, Strand, Smith & Fernandes (2007)
    - **Plain-language idea:** a very large study testing whether one ability test in childhood forecasts exam results years later — the core evidence that "ability measured young" carries real signal.
    - **DOK 1 — Facts:**
      - In >70,000 English children, a cognitive test at age 11 correlated **r ≈ .69 (observed) / .81 (latent)** with national exams at 16. *(Deary, Strand, Smith & Fernandes, 2007, *Intelligence*, DOI 10.1016/j.intell.2006.02.001.)*
    - **DOK 2 — Summary:** The strongest single-number case *for* ability screening (it recurs as the steelman in Categories 1.5 and 4.4); any argument to broaden the screen must contend with it rather than wish it away.
    - **Link to source:** [https://doi.org/10.1016/j.intell.2006.02.001](https://doi.org/10.1016/j.intell.2006.02.001)
- **Subcategory 7.4: CogAT changes its administration for young children**
  - **Source:** Riverside CogAT Form 7 short guide; EBSCO CogAT overview
    - **Plain-language idea:** a K–2 child should not be failed because they cannot yet read the instructions or operate an adult-style test. CogAT itself changes format by age to reduce those extra demands.
    - **DOK 1 — Facts:**
      - CogAT spans ten levels across K–12. Its K–2 Primary Edition is **teacher-paced and orally administered**, and its verbal tasks use pictures so reading is not required; the multilevel edition shifts to text-based verbal items. The full battery is a multi-session **power test** with generous limits rather than a pure speed test. *([VERIFIED secondary/official-guide synthesis] Riverside CogAT Form 7 Short Guide; EBSCO Research Starters, "Cognitive Abilities Test.")*
    - **DOK 2 — Summary:** Developmentally appropriate delivery is part of measurement validity, not cosmetic UX; it reduces reading and instruction-following as construct-irrelevant barriers.
    - **Link to source:** [Riverside Form 7 short guide](https://www.aacs.org/wp-content/uploads/2012/10/CogAT-A-Short-Guide-for-Teachers.pdf) | [EBSCO CogAT overview](https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **Subcategory 7.5: Reputable batteries measure different constructs with different task mechanics**
  - **Source:** WISC-V/WPPSI-IV, WJ-IV, SB5, and NIH Toolbox administration materials
    - **Plain-language idea:** "a cognitive test" is not one generic question type. Each target ability needs a task whose rules isolate that ability rather than reading, schooling, memory, motor speed, or device skill.
    - **DOK 1 — Facts:**
      - **Fluid reasoning** is commonly measured with incomplete visual matrices (choose the missing piece); preschool versions use fewer choices and pointing responses. **Quantitative reasoning** uses number series/matrices or balance-scale "Figure Weights," rather than routine arithmetic. **Spatial ability** uses mental rotation/folding or block-pattern construction. **Working memory** uses increasing spans and reordering tasks (Digit/Picture Span, Corsi, List Sorting). **Processing speed** uses deliberately easy matching/search tasks under strict time limits because speed—not reasoning depth—is the construct. *(Official publisher and NIH administration materials; mostly **publisher-COI**.)*
      - WISC-V keeps its reasoning tasks as power measures while strictly timing processing-speed tasks; mixing those mechanics would turn a reasoning score into a motor/reading-speed score.
    - **DOK 2 — Summary:** This is the concrete "HOW" layer missing from a construct-only discussion. Reusing a task format is not the same as reusing copyrighted items or transferring the original test's validity.
    - **Link to source:** [WISC-V](https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-&-Neuro/Wechsler-Intelligence-Scale-for-Children-|-Fifth-Edition-/p/100000771) | [NIH Toolbox Cognition](https://nihtoolbox.org/domain/cognition/)



### Category 8: What These Tests Miss — Especially at the Gifted "Tail"

*General idea: the same test that predicts achievement on average becomes imprecise and incomplete exactly at the top ~1–2%, where gifted decisions are made. Category 1 details the false-negative consequence for **selection**; Category 6 details **who** is missed by race/class; this category is the **measurement** root cause.*

- **Subcategory 8.1: Fixed-form tests are *least* precise exactly where the gifted decision is made**
  - **Source:** Baker (2001); Lord (1980)
    - **Plain-language idea:** every test measures the middle of the ability range best (most items sit there); at the extremes it has few items, so its "error bar" balloons — the opposite of what a top-1% cutoff needs.
    - **DOK 1 — Facts:**
      - In IRT, the conditional standard error is **`SE(θ) = 1/√I(θ)`**, and information *I(θ)* peaks where items cluster (the middle). In sparse tails, information collapses and the standard error balloons. *(Baker, 2001, *The Basics of Item Response Theory*, 2nd ed., ERIC ED458219, ch. 6; Lord, 1980, *Applications of IRT to Practical Testing Problems*.)*
    - **DOK 2 — Summary:** This is the mathematical reason a single fixed-form cut is weakest exactly at the gifted threshold — and the seed of the "adaptive testing can do 2× better *at the tail*" argument (Categories 10–11).
    - **Link to source:** [https://files.eric.ed.gov/fulltext/ED458219.pdf](https://files.eric.ed.gov/fulltext/ED458219.pdf)
- **Subcategory 8.2: A one-shot score is a moving target (regression to the mean + real change)**
  - **Source:** Lohman & Korb (2006); Warne (2012)
    - **Plain-language idea:** because a top score partly reflects a good day, many top scorers "fall out" of the top tier on a later test — not because they changed, but because extreme scores drift back toward average.
    - **DOK 1 — Facts:**
      - "Approximately half of the students who score in the top 3% … in 1 year will not fall in the top 3% … in the next year," and only **~35–40% remain top-3% from grade 3 to grade 8** (≈60–65% fall out over that interval) — regression to the mean plus real developmental change, not merely measurement error. *(Lohman & Korb, 2006, *Journal for the Education of the Gifted*, DOI 10.4219/jeg-2006-245; corroborated by Warne, 2012, *Roeper Review*, DOI 10.1080/02783193.2012.686425.)*
    - **DOK 2 — Summary:** A screen applied once, at entry, locks in a snapshot that a large fraction of eventual high achievers would fail *at that moment* even if they would clear it later — the instability that Category 1.2 turns into a selection critique.
    - **Link to source:** [https://files.eric.ed.gov/fulltext/EJ746292.pdf](https://files.eric.ed.gov/fulltext/EJ746292.pdf) | [https://doi.org/10.1080/02783193.2012.686425](https://doi.org/10.1080/02783193.2012.686425)
- **Subcategory 8.3: One test barely reproduces another's "top" list**
  - **Source:** Lohman (2005)
    - **Plain-language idea:** even two tests that correlate highly disagree sharply about *who* is in the top few percent — so "the gifted kids" is really "the kids this one test ranked highly."
    - **DOK 1 — Facts:**
      - Of students in the top 3% on an achievement criterion, CogAT Composite captured only **~32%** of the top readers; CogAT Nonverbal only **~18%**. *(Lohman, 2005, *Journal for the Education of the Gifted*, DOI 10.1177/001698620504900203.)*
    - **DOK 2 — Summary:** Detailed with the underlying identification tables in Category 1.1; here it is the *measurement* fact (tests disagree at extremes), there it is the *selection* consequence (a single screen misses most "best" kids).
    - **Link to source:** [https://doi.org/10.1177/001698620504900203](https://doi.org/10.1177/001698620504900203)
- **Subcategory 8.4: "Culture-fair" nonverbal tests do not erase opportunity gaps**
  - **Source:** Lohman, Korb & Lakin (2008)
    - **Plain-language idea:** switching to a picture/shape-based "nonverbal" test is often sold as an equity fix; the data say it still leaves large gaps for English-language learners.
    - **DOK 1 — Facts:**
      - English-language learners scored **0.5–0.67 SD lower** on Raven's, NNAT, and CogAT-Nonverbal. *(Lohman, Korb & Lakin, 2008, *Gifted Child Quarterly*, DOI 10.1177/0016986208321808.)*
    - **DOK 2 — Summary:** The "switch to nonverbal for equity" move is not supported by the independent data — expanded in Categories 6.2 and 15.2.
    - **Link to source:** [https://doi.org/10.1177/0016986208321808](https://doi.org/10.1177/0016986208321808)
- **Subcategory 8.5: Spatial talent is systematically under-selected**
  - **Source:** Wai, Lubinski & Benbow (2009)
    - **Plain-language idea:** "spatial ability" (mentally rotating/visualizing objects) predicts STEM success but is barely used in selection — so a verbal/math cutoff is blind to a whole class of talent.
    - **DOK 1 — Facts:**
      - **70% of the top 1% in spatial ability did not make the top-1% cut on either the math or the verbal composite.** *(Wai, Lubinski & Benbow, 2009, *Journal of Educational Psychology*, DOI 10.1037/a0016127, p. 825; large stratified sample + Project TALENT, ~400,000, 11-yr longitudinal; incremental variance from spatial ≈ 4% on average but large in absolute tail counts. **COI:** authors are spatial-ability proponents, mitigated by the independent Project TALENT data.)*
    - **DOK 2 — Summary:** The same finding anchors the "screen misses an entire ability dimension" argument in Category 1.6; the *patch* (a validated spatial battery) is in Category 10.7.
    - **Link to source:** [https://doi.org/10.1037/a0016127](https://doi.org/10.1037/a0016127)
- **Subcategory 8.6: CogAT's exact upper-tail precision is publisher-controlled and `[UNVERIFIED]`**
  - **Source:** Riverside Insights CogAT 7/8 norms and evidence guides
    - **Plain-language idea:** we cannot independently confirm how precise CogAT is at the very top because the needed technical tables are proprietary.
    - **DOK 1 — Facts:**
      - Riverside's public CogAT 7/8 norms guide provides score-conversion tables, but the current-form conditional SEM or test-information function needed to audit precision at the gifted tail was not located in the public materials reviewed **`[UNVERIFIED]`**.
    - **DOK 2 — Summary:** A material evidence gap: several tail claims in this tree cannot be pinned to CogAT's *current* form without these tables.
    - **Link to source:** [CogAT 7/8 Norms & Score Conversions Guide](https://onlinehelp.riversideinsights.com/Help/Elevate/assets/docs/CogAT_78_COMP_NandSC_Guide_091820.pdf) | [Research-Based Evidence Supporting CogAT Use Cases](https://riversideinsights.com/hubfs/CitC/Evidence_supporting_CogAT_use_claims.pdf?hsLang=en)
- **Subcategory 8.7: A hard cutoff misclassifies boundary cases *asymmetrically***
  - **Source:** AERA/APA/NCME (2014) Standards 2.14–2.16; Lohman & Korb (2006)
    - **Plain-language idea:** a score is a fuzzy band, not a point; right at a high cut, statistical drift makes a child *at* the line more likely a false positive and a truly gifted child easily pushed just under — and tests are least reliable in the youngest children, exactly when screening happens.
    - **DOK 1 — Facts:**
      - A score is a confidence band, not a point (best practice ≈ a 95% CI, ±2 SEM); at a high cut, regression to the mean pulls true scores *below* the threshold, so a child scoring exactly at the cut is more likely a false positive while a truly gifted child is easily pushed just under — and reliability is **lowest in young children**. *(Standard measurement theory — AERA/APA/NCME, 2014, Standards 2.14–2.16; regression: Lohman & Korb, 2006.)*
    - **DOK 2 — Summary:** Turns "the cutoff is arbitrary" from rhetoric into measurement theory; the decision-metric version (classification accuracy/consistency at the cut) is in Category 9.3.
    - **Link to source:** [AERA/APA/NCME (2014), *Standards for Educational and Psychological Testing*](https://www.testingstandards.net/)
- **Subcategory 8.8: A single test *plus referral* tracks family/social advantage, not just ability**
  - **Source:** Grissom & Redding (2016)
    - **Plain-language idea:** who gets *referred* for testing is itself biased, so the pipeline encodes advantage before the test is even scored.
    - **DOK 1 — Facts:**
      - At equal measured achievement, Black students are less likely to be identified as gifted; high-achieving Black students were only ~one-third as likely to be identified when taught by a non-Black teacher. *(Grissom & Redding, 2016, *AERA Open*, DOI 10.1177/2332858415622175; via .)*
    - **DOK 2 — Summary:** Fully developed in Categories 1.5 and 6.1; here it flags that "the test" is never used alone — the referral stage is part of the instrument's real-world behavior.
    - **Link to source:** [https://doi.org/10.1177/2332858415622175](https://doi.org/10.1177/2332858415622175)
- **Subcategory 8.9: Test scores rise monotonically with family income**
  - **Source:** College Board (2023)
    - **Plain-language idea:** the higher a family's income, the higher the average score — so a score cutoff partly sorts on money.
    - **DOK 1 — Facts:**
      - On the SAT, mean total climbed from **891 (lowest census-tract income quintile) to 1148 (highest)** — a 257-point gap — with "met both benchmarks" rising 15% → 63%. *(College Board, 2023 Total Group SAT Suite Annual Report — primary; via .)*
    - **DOK 2 — Summary:** The SAT is an achievement test, not an ability screen — cited as illustration that scores track family advantage; the developmental mechanism (not test-prep) is detailed in Category 6.3.
    - **Link to source:** [College Board (2023), Total Group SAT Suite Annual Report](https://reports.collegeboard.org/media/pdf/2023-total-group-sat-suite-of-assessments-annual-report%20ADA.pdf)



### Category 9: How to Measure a Test's Quality *at the Tail* — the Metrics That Answer "How Well Does It Capture Gifted Kids by Score?"

*General idea: "reliability" and "validity" as single numbers are not enough for a top-1% decision. This category is the toolbox of metrics that judge a test **at the cut** — and it defines the yardsticks any "2× better" claim (Category 11) must use.*

- **Subcategory 9.1: Precision is *conditional*, not one reliability number**
  - **Source:** Baker (2001); Embretson & Reise (2000); Green, Bock, Humphreys, Linn & Reckase (1984)
    - **Plain-language idea:** the right question is not "how reliable is the test?" but "how precise is it *at the score that matters*?" — a test can be sharp in the middle and blurry at the top.
    - **DOK 1 — Facts:**
      - The **Test Information Function** reports precision at each ability level θ, with `SE(θ) = 1/√I(θ)`; a test can be precise mid-range and weak at the top. *(Baker, 2001, ch. 6; Embretson & Reise, 2000, *Item Response Theory for Psychologists*.)*
      - A whole-test **marginal reliability** averages error across the tested population and can therefore hide a weak gifted tail. Green et al. (1984) define marginal/empirical IRT reliability; restricting that error average to θ at or above the operational cut is a **tail-focused analogue `[INFERENCE]`**. Under a unit-variance θ scale, conditional reliability can be written `ρ(θ)=I(θ)/(I(θ)+1)`, so information of 9 and 19 corresponds algebraically to about .90 and .95 at that θ. *(Green, Bock, Humphreys, Linn & Reckase, 1984, DOI 10.1111/j.1745-3984.1984.tb01039.x; Baker & Kim, 2017.)*
    - **DOK 2 — Summary:** The organizing metric for the whole category; "conditional SEM at the cut" is the honest replacement for a single reliability coefficient.
    - **Link to source:** [https://files.eric.ed.gov/fulltext/ED458219.pdf](https://files.eric.ed.gov/fulltext/ED458219.pdf)
- **Subcategory 9.2: Profile/difference scores are noisier than their parts**
  - **Source:** Lord & Novick (1968); Trafimow (2015)
    - **Plain-language idea:** a "he's more spatial than verbal" tilt score is less reliable than either score alone — so multi-domain profile decisions carry extra error.
    - **DOK 1 — Facts:**
      - For equal-variance measures, difference-score reliability is `r_DD=(r_XX+r_YY−2r_XY)/(2−2r_XY)`. Subtracting two highly correlated domain scores removes much of their shared true variance while retaining both errors, so a "spatial minus verbal" tilt can be far less reliable than either component. *(Lord & Novick, 1968; Trafimow, 2015, DOI 10.1080/23311835.2015.1064626.)*
    - **DOK 2 — Summary:** A caution for any profile-based gifted rule (and for the multidimensional models in Category 10.6).
    - **Link to source:** [https://doi.org/10.1080/23311835.2015.1064626](https://doi.org/10.1080/23311835.2015.1064626)
- **Subcategory 9.3: Classification accuracy and consistency are the *decision-level* metrics**
  - **Source:** Livingston & Lewis (1995); AERA/APA/NCME (2014)
    - **Plain-language idea:** what a gifted program cares about is not the score but the *decision* — "how often is the pass/fail call correct (accuracy) and how often would the same child get the same call on a parallel form (consistency)?"
    - **DOK 1 — Facts:**
      - From a single form you can estimate the % correctly classified (**accuracy**) and the % who would be classified the same on a parallel form (**consistency**). *(Livingston & Lewis, 1995, *Journal of Educational Measurement*, 32(2):179–197, DOI 10.1111/j.1745-3984.1995.tb00462.x.)*
      - The *Standards* tie classification error directly to the **conditional SEM near the cut**. *(AERA/APA/NCME, 2014, Standards 2.14–2.16.)*
    - **DOK 2 — Summary:** These are the metrics a "2× fewer misclassifications at the cut" claim would use (Category 11.5).
    - **Link to source:** [https://doi.org/10.1111/j.1745-3984.1995.tb00462.x](https://doi.org/10.1111/j.1745-3984.1995.tb00462.x)
- **Subcategory 9.4: Sensitivity, specificity, false-negative rate — and base rates dominate**
  - **Source:** Meehl & Rosen (1955)
    - **Plain-language idea:** because "gifted" is rare, even a good test produces lots of wrong calls near the cut — a counterintuitive but decisive statistical fact.
    - **DOK 1 — Facts:**
      - Because "gifted" is a low-base-rate category, **positive predictive value is fragile**: even an accurate test yields many misclassifications near a stringent cut. *(Meehl & Rosen, 1955, *Psychological Bulletin*, DOI 10.1037/h0048070.)*
    - **DOK 2 — Summary:** The base-rate reality behind why a stringent cut with high specificity still misses many able children (and why a "2×" claim must be stated at the cut, Category 11).
    - **Link to source:** [https://doi.org/10.1037/h0048070](https://doi.org/10.1037/h0048070)
- **Subcategory 9.5: ROC / AUC summarizes the sensitivity–specificity trade-off**
  - **Source:** Hanley & McNeil (1982)
    - **Plain-language idea:** a single curve/number describing how well a test separates two groups across *every* possible cut point.
    - **DOK 1 — Facts:**
      - **ROC / AUC** summarizes sensitivity–specificity trade-offs across all cut points. *(Hanley & McNeil, 1982, *Radiology*, DOI 10.1148/radiology.143.1.7063747.)*
    - **DOK 2 — Summary:** Useful for comparing instruments, but it is a *whole-range* summary — for a top-1% decision the *tail* portion of the curve matters more than the overall area.
    - **Link to source:** [https://doi.org/10.1148/radiology.143.1.7063747](https://doi.org/10.1148/radiology.143.1.7063747)
- **Subcategory 9.6: Incremental validity is the bar a *second* measure must clear**
  - **Source:** Hunsley & Meyer (2003)
    - **Plain-language idea:** adding a new test (say, a spatial or motivation measure) is only worth it if it predicts the outcome *beyond* what CogAT already predicts — not just correlates with it.
    - **DOK 1 — Facts:**
      - A second measure must **add predictive information beyond the first**, not merely correlate with the outcome. *(Hunsley & Meyer, 2003, *Psychological Assessment*, DOI 10.1037/1040-3590.15.4.446.)*
    - **DOK 2 — Summary:** The formal test any "multiple-measures" expansion (spatial, conscientiousness) must pass; recurs in Category 4.5's caution about range restriction.
    - **Link to source:** [https://doi.org/10.1037/1040-3590.15.4.446](https://doi.org/10.1037/1040-3590.15.4.446)
- **Subcategory 9.7: Fairness is measurable — DIF / measurement invariance**
  - **Source:** Meredith (1993); Holland & Wainer (1993)
    - **Plain-language idea:** you can statistically test whether a test item is "harder" for one group than another *at equal ability* — a direct bias check.
    - **DOK 1 — Facts:**
      - **Measurement invariance / Differential Item Functioning (DIF)** tests whether items behave the same across subgroups at equal ability. *(Meredith, 1993, *Psychometrika*, DOI 10.1007/BF02294825; Holland & Wainer, 1993, *Differential Item Functioning*.)*
      - Operational DIF audits pair significance with effect size. ETS Mantel–Haenszel flags are conventionally **A** when `|ΔMH|<1.0`, **B** at 1.0–1.5, and **C** at ≥1.5 (with significance); logistic-regression DIF can additionally detect group×ability interactions, using ΔR² bands of **<.035 / .035–.070 / ≥.070**. These are review conventions, not universal laws. *(Dorans & Holland, 1993; Swaminathan & Rogers, 1990, DOI 10.1111/j.1745-3984.1990.tb00754.x; Jodoin & Gierl, 2001, DOI 10.1207/s15324818ame1404_2.)*
    - **DOK 2 — Summary:** The measurement-side fairness tool (distinct from the *impact*-side equity data in Category 6); a new test would have to clear this bar.
    - **Link to source:** [https://doi.org/10.1007/BF02294825](https://doi.org/10.1007/BF02294825)
- **Subcategory 9.8: The rulebook — the *Standards for Educational and Psychological Testing***
  - **Source:** AERA/APA/NCME (2014)
    - **Plain-language idea:** the profession's governing manual for what counts as a valid, fair, defensible test — the authority every other metric here answers to.
    - **DOK 1 — Facts:**
      - All of the above is governed by the *Standards for Educational and Psychological Testing*. *(AERA/APA/NCME, 2014.)*
    - **DOK 2 — Summary:** Cited throughout the tree (Categories 9, 11, and the cut-score/validity arguments) as the neutral rulebook.
    - **Link to source:** [AERA/APA/NCME (2014), *Standards for Educational and Psychological Testing*](https://www.testingstandards.net/)
- **Subcategory 9.9: The bounds that *cap* "2×"**
  - **Source:** Spearman (1904); Lord & Novick (1968)
    - **Plain-language idea:** some quality numbers have hard ceilings (reliability can't exceed 1.0; an observed validity can't exceed the square root of the two reliabilities), so you literally *cannot* double them — a fact that disciplines the "2× better" goal.
    - **DOK 1 — Facts:**
      - Reliability ≤ 1.0; an observed validity correlation ≤ **`√(r_xx · r_yy)`**. *(Spearman, 1904, *American Journal of Psychology*, DOI 10.2307/1412159; Lord & Novick, 1968, *Statistical Theories of Mental Test Scores*.)*
    - **DOK 2 — Summary:** The mathematical reason a "2× better test" must be defined on *unbounded, tail-specific* axes (information, false-negative rate) — see Category 11.
    - **Link to source:** [https://doi.org/10.2307/1412159](https://doi.org/10.2307/1412159)
- **Subcategory 9.10: Low-base-rate and fixed-capacity decisions need tail-ranking metrics**
  - **Source:** Saito & Rehmsmeier (2015); Manning, Raghavan & Schütze (2008)
    - **Plain-language idea:** ROC-AUC averages across thresholds that GT will never use. When only 1–2% of children are the target—or only *k* seats exist—the useful question is whether the top of the ranking contains the right children.
    - **DOK 1 — Facts:**
      - A random classifier's **precision–recall AUC baseline equals the positive-class prevalence `π`**, whereas ROC-AUC's baseline stays .50 regardless of prevalence. Precision–recall curves therefore expose poor performance that ROC curves can make look strong when giftedness is rare. *(Saito & Rehmsmeier, 2015, DOI 10.1371/journal.pone.0118432.)*
      - **Precision@k** is the proportion of true positives among the top *k* ranked applicants; recall@k is the share of all true positives captured there. If capacity *k* is known, these describe the fixed-seat decision directly and are invariant to monotone rescaling of scores. *(Manning, Raghavan & Schütze, 2008, *Introduction to Information Retrieval*.)* GT's actual *k* remains an open fact, so this is a candidate metric, not an allocation decision.
    - **DOK 2 — Summary:** Pair PR-AUC/precision@k with sensitivity, specificity, and conditional precision; none solves the external-criterion problem.
    - **Link to source:** [https://doi.org/10.1371/journal.pone.0118432](https://doi.org/10.1371/journal.pone.0118432)
- **Subcategory 9.11: Item fairness, predictive fairness, and outcome parity are different tests**
  - **Source:** Raju, van der Linden & Fleer (1995); Millsap (1997); Kleinberg, Mullainathan & Raghavan (2017)
    - **Plain-language idea:** "the test is fair" is not one claim. Items can be unbiased while predictions differ, or biased items can cancel in the total score; subgroup selection rates add a third question.
    - **DOK 1 — Facts:**
      - **Differential Test Functioning (DTF)** asks whether item-level DIF accumulates into a total-score shift at equal ability; several DIF items can cancel, while same-direction DIF can move the cut materially. *(Raju, van der Linden & Fleer, 1995, DOI 10.1177/014662169501900405.)*
      - Millsap (1997) proves that, under realistic linear-model conditions, strict measurement invariance and Cleary-style predictive invariance generally cannot both hold. Passing a DIF/invariance audit therefore does not prove equal prediction, and vice versa. *(DOI 10.1037/1082-989X.2.3.248.)*
      - Calibration within groups, equal false-positive rates, and equal false-negative rates cannot all be guaranteed simultaneously unless prediction is perfect or relevant base rates are equal. *(Kleinberg, Mullainathan & Raghavan, 2017, DOI 10.4230/LIPIcs.ITCS.2017.43; Chouldechova, 2017.)*
    - **DOK 2 — Summary:** Report measurement bias (DIF/DTF), prediction bias, and impact/representation separately, including near-cut false-negative rates by subgroup; choosing a fairness criterion is an explicit policy judgment.
    - **Link to source:** [https://doi.org/10.1177/014662169501900405](https://doi.org/10.1177/014662169501900405) | [https://doi.org/10.1037/1082-989X.2.3.248](https://doi.org/10.1037/1082-989X.2.3.248)
- **Subcategory 9.12: Accuracy metrics break when only screened-in children receive the "truth" label**
  - **Source:** Begg & Greenes (1983); Ransohoff & Feinstein (1978); Rubin (1976)
    - **Plain-language idea:** if only children who already scored high receive a full evaluation or later outcome label, the test is being judged mostly on cases it selected itself. That circular sample inflates or distorts accuracy.
    - **DOK 1 — Facts:**
      - **Verification/work-up bias** occurs when reference-standard status is observed selectively based on the screening result; **spectrum bias** means sensitivity and specificity change with the case mix. A test validated on clearly gifted versus average children can look much better than it performs among borderline applicants. *(Begg & Greenes, 1983, DOI 10.2307/2530820; Ransohoff & Feinstein, 1978, DOI 10.1056/NEJM197810262991705.)*
      - Under Rubin's framework, ordinary missing-data corrections are point-identifying only under assumptions such as MAR; whether labels are MNAR cannot be established from the observed data alone. *(Rubin, 1976, DOI 10.1093/biomet/63.3.581.)*
    - **DOK 2 — Summary:** A representative audit sample that includes screened-out children is the cleanest way to test tail accuracy without withholding services; otherwise report sensitivity analyses or bounds rather than a false point estimate.
    - **Link to source:** [https://doi.org/10.2307/2530820](https://doi.org/10.2307/2530820) | [https://doi.org/10.1093/biomet/63.3.581](https://doi.org/10.1093/biomet/63.3.581)
- **Subcategory 9.13: The cut score itself needs validity and uncertainty evidence**
  - **Source:** Kane (1994); Brennan & Lockwood (1980); AERA/APA/NCME (2014)
    - **Plain-language idea:** even with a good test, no statistical law uniquely produces "the gifted cutoff." The line is a standard-setting decision with rater, method, and measurement uncertainty of its own.
    - **DOK 1 — Facts:**
      - Kane's framework evaluates a cut with **procedural** evidence (documented method and qualified panel), **internal** evidence (replicability, consistency, standard error), and **external** evidence (agreement with independent criteria). *(Kane, 1994, DOI 10.3102/00346543064003425.)*
      - The cut's uncertainty includes panel/rater variation and test error; decision accuracy and consistency must be reported for the specific cut, especially where thin tail norms make percentile steps coarse. *(Brennan & Lockwood, 1980, DOI 10.1177/014662168000400209; AERA/APA/NCME, 2014, ch. 5.)*
    - **DOK 2 — Summary:** A confidence band around child scores does not by itself validate the policy line; the score, cut, and decision rule each require evidence.
    - **Link to source:** [https://doi.org/10.3102/00346543064003425](https://doi.org/10.3102/00346543064003425)



### Category 10: How the Gaps *Can Be Patched* — Methods and Their Maturity

*General idea: most weaknesses in Categories 8–9 have known fixes, but the fixes differ sharply in how well-validated they are. Each item is flagged **mature**, **established-but-flagged**, or **emerging/unproven** so readers should not treat a promising idea as a proven one.*

- **Subcategory 10.1: Adaptive testing (CAT) — *mature***
  - **Source:** Weiss (1982); Weiss & Kingsbury (1984); Thompson & Weiss (2011); van der Linden & Glas (2010); Wainer et al. (2000)
    - **Plain-language idea:** a computer-adaptive test picks each next question based on how you have answered so far, so it can measure the very top precisely with fewer items — directly attacking the tail-imprecision problem of Category 8.1.
    - **DOK 1 — Facts:**
      - Live-testing data showed adaptive tests needed **half the items for equal reliability and ~one-third for equal validity**, produced **"measurements of equal precision at all trait levels,"** and gave **more accurate classification** than fixed forms. *(Weiss, 1982, *Applied Psychological Measurement*, DOI 10.1177/014662168200600408; Weiss & Kingsbury, 1984, DOI 10.1111/j.1745-3984.1984.tb01040.x. **COI:** Weiss is a commercial CAT vendor principal.)*
      - Requires a **large IRT-calibrated item bank** + item-exposure/security controls. *(Thompson & Weiss, 2011, "A Framework for the Development of CAT," *PARE*, DOI 10.7275/wqzt-9427; van der Linden & Glas, 2010, *Elements of Adaptive Testing*, DOI 10.1007/978-0-387-85461-8; Wainer et al., 2000.)*
    - **DOK 2 — Summary:** The single most important patch — and the concrete mechanism behind a defensible "better at the tail" claim (Category 11.6) — but its vendor-sourced efficiency numbers should be read with the COI in mind.
    - **Link to source:** [https://doi.org/10.1177/014662168200600408](https://doi.org/10.1177/014662168200600408) | [https://doi.org/10.7275/wqzt-9427](https://doi.org/10.7275/wqzt-9427)
- **Subcategory 10.2: Multistage testing (MST) — *mature***
  - **Source:** Yan, von Davier & Lewis (2014)
    - **Plain-language idea:** a "modular" cousin of CAT that adapts in blocks of items rather than one at a time — keeping most of the precision while allowing answer review and simpler security.
    - **DOK 1 — Facts:**
      - Module-based adaptivity keeps most CAT precision while allowing answer review and simpler exposure control. *(Yan, von Davier & Lewis, 2014, *Computerized Multistage Testing*.)*
    - **DOK 2 — Summary:** A practical middle ground for a young-child gifted screen where fully item-by-item adaptivity is operationally hard.
    - **Link to source:** [Yan, von Davier & Lewis (2014), *Computerized Multistage Testing*](https://doi.org/10.1201/b16858)
- **Subcategory 10.3: Above-level testing — *established practice, but flagged***
  - **Source:** Assouline & Lupkowski-Shoplik (2012); Warne (2014)
    - **Plain-language idea:** give gifted kids *older-grade* items so the test has "headroom" and their true level shows — the core trick of talent searches like SMPY.
    - **DOK 1 — Facts:**
      - Giving older-level items raises the ceiling so gifted growth is visible; the Talent Search model is fundamentally above-level. *(Assouline & Lupkowski-Shoplik, 2012, *Journal of Psychoeducational Assessment*, DOI 10.1177/0734282911433946.)*
      - **But** it "has not been subject to careful psychometric scrutiny." *(Warne, 2014, *Gifted Child Quarterly*, DOI 10.1177/0016986213513793 — the author's own words.)*
    - **DOK 2 — Summary:** Strong track record for identification (Category 2/SMPY), but the *psychometric* validation is thinner than its popularity implies.
    - **Link to source:** [https://doi.org/10.1177/0734282911433946](https://doi.org/10.1177/0734282911433946) | [https://doi.org/10.1177/0016986213513793](https://doi.org/10.1177/0016986213513793)
- **Subcategory 10.4: A high ceiling captures real tail variation a grade-level ceiling flattens**
  - **Source:** Kell, Lubinski & Benbow (2013); Lubinski (2016)
    - **Plain-language idea:** differences *within* the top 1% are real and predictive, so a test that "tops out" throws away meaningful signal.
    - **DOK 1 — Facts:**
      - Youth identified before age 13 as top-1-in-10,000 via *above-level* SAT reached striking outcomes by age 38 (**44% earned doctorates** vs. ~2% of the population), and accomplishment keeps climbing *within* the top 1%. *(Kell, Lubinski & Benbow, 2013, *Psychological Science*, 24(5):648–659, DOI 10.1177/0956797612457784; within-top-1% gradient: Lubinski, 2016, "From Terman to Today." Via , which mis-dated this to 2014; corrected here.)*
    - **DOK 2 — Summary:** The evidentiary case for a high ceiling; the same SMPY finding is the "ability predicts attainment" steelman in Category 2.3.
    - **Link to source:** [https://doi.org/10.1177/0956797612457784](https://doi.org/10.1177/0956797612457784)
- **Subcategory 10.5: Vertical scaling — *necessary but assumption-laden***
  - **Source:** Tong & Kolen (2007)
    - **Plain-language idea:** putting different grade levels on one common yardstick (needed to track growth) involves modeling choices that can themselves change the apparent growth of high scorers.
    - **DOK 1 — Facts:**
      - Scaling-method choices change the apparent growth pattern of high scorers. *(Tong & Kolen, 2007, *Applied Measurement in Education*, DOI 10.1080/08957340701301207.)*
    - **DOK 2 — Summary:** A hidden degree of freedom behind any "growth" claim (relevant to the MAP-growth outcome debated in Categories 5.2 and 11.7).
    - **Link to source:** [https://doi.org/10.1080/08957340701301207](https://doi.org/10.1080/08957340701301207)
- **Subcategory 10.6: Multidimensional IRT / diagnostic models — *mature theory for profiles, with pitfalls***
  - **Source:** Reckase (2009); Rupp, Templin & Henson (2010)
    - **Plain-language idea:** models that score *several* abilities at once (a profile) rather than one number — useful for capturing spatial+verbal+quant, but harder to keep reliable (see Category 9.2).
    - **DOK 1 — Facts:**
      - Multidimensional IRT and diagnostic classification models are mature theory for *profiles*, with documented pitfalls the authors themselves flag. *(Reckase, 2009, *Multidimensional IRT*, DOI 10.1007/978-0-387-89976-3; Rupp, Templin & Henson, 2010, *Diagnostic Measurement*.)*
    - **DOK 2 — Summary:** The technical basis for a multi-domain gifted profile — but difference-score noise (9.2) caps how much a profile can be trusted for individual decisions.
    - **Link to source:** [https://doi.org/10.1007/978-0-387-89976-3](https://doi.org/10.1007/978-0-387-89976-3)
- **Subcategory 10.7: A spatial patch already exists**
  - **Source:** Stumpf, Mills, Brody & Baxley (2013)
    - **Plain-language idea:** you don't have to invent spatial measurement — a validated spatial battery was already built to supplement math/verbal talent searches.
    - **DOK 1 — Facts:**
      - CTY built a **Spatial Test Battery** to supplement math/verbal talent searches. *(Stumpf, Mills, Brody & Baxley, 2013, *Roeper Review*, DOI 10.1080/02783193.2013.829548. **COI:** authors are the developers.)*
    - **DOK 2 — Summary:** The concrete remedy for the spatial gap of Categories 8.5 / 1.6 — an add-on, not a reason to rebuild CogAT.
    - **Link to source:** [https://doi.org/10.1080/02783193.2013.829548](https://doi.org/10.1080/02783193.2013.829548)
- **Subcategory 10.8: Dynamic assessment / repeated measurement — *promising, unproven for this use***
  - **Source:** Sternberg & Grigorenko (2002)
    - **Plain-language idea:** instead of testing what a child already knows, test how quickly they *learn* when taught — capturing "potential" rather than prior advantage.
    - **DOK 1 — Facts:**
      - It measures *learning potential* rather than prior accomplishment. *(Sternberg & Grigorenko, 2002, *Dynamic Testing*.)* **No meta-analysis establishing predictive validity for K-8 gifted identification specifically was located `[gap]`.**
    - **DOK 2 — Summary:** Conceptually attractive for equity (Category 15.3), but not validated as a gate — treat as a research signal.
    - **Link to source:** [Sternberg & Grigorenko, *Dynamic Testing*](https://books.google.com/books/about/Dynamic_Testing.html?id=pj9kQgAACAAJ)
- **Subcategory 10.9: Stealth / game-based / process-data assessment — *emerging, limited evidence***
  - **Source:** Shute & Ventura (2013); Shute & Moore
    - **Plain-language idea:** embed the measurement inside a task/game and score the *process* (how the child plays), not just the answer — the bridge to Category 12.
    - **DOK 1 — Facts:**
      - Promise: embed measurement in tasks to capture hard-to-test skills; measured convergent correlations were **modest (r ≈ 0.22–0.41)** on small samples, all proponent-generated. *(Shute & Ventura, 2013, *Stealth Assessment*; Shute & Moore validation. **COI:** originators.)*
    - **DOK 2 — Summary:** Included here as a *candidate patch*; its promise, evidence ceiling, and fairness threats are examined in depth in Category 12.
    - **Link to source:** [Shute & Ventura (2013), *Stealth Assessment*](https://doi.org/10.7551/mitpress/9589.001.0001)
- **Subcategory 10.10: A CAT's delivered tail precision depends on the whole operating system**
  - **Source:** Reckase (2010); Belov & Armstrong (2005); Warm (1989); Bock & Mislevy (1982); Stocking & Lewis (1998); Eggen & Straetmans (2000)
    - **Plain-language idea:** adaptivity cannot create hard questions that are absent from the bank, and a scoring or security choice can erase the precision gain promised by the item-selection algorithm.
    - **DOK 1 — Facts:**
      - A **bank-information audit** must check both total information and the number of usable high-information items near `θ_cut`; exposure/content constraints mean the full pool's nominal information is only a ceiling. *(Reckase, 2010; Belov & Armstrong, 2005, DOI 10.1177/0146621605275413.)*
      - Tail scoring is directional: uncorrected MLE is outward-biased and non-finite for all-correct patterns, which can create false positives; EAP/MAP priors shrink extreme scores inward, which can create false negatives; Warm's WLE removes first-order MLE bias and remains finite. *(Warm, 1989, DOI 10.1007/BF02294627; Bock & Mislevy, 1982, DOI 10.1177/014662168200600405.)*
      - For a pass/fail decision, classification CAT can continue while the confidence interval crosses the cut and stop once it lies wholly above or below; three-category variants (below/borderline/above) have achieved ≥22% length savings in published simulations. *(Eggen & Straetmans, 2000, DOI 10.1177/00131640021970862.)*
    - **DOK 2 — Summary:** Certify the actual bank with the chosen estimator, exposure control, stopping rule, and calibration-error perturbation; "adaptive" alone is not acceptance evidence.
    - **Link to source:** [https://doi.org/10.1177/0146621605275413](https://doi.org/10.1177/0146621605275413) | [https://doi.org/10.1007/BF02294627](https://doi.org/10.1007/BF02294627)



### Category 11: Feasibility of a "Better" Test — and What "2×" *Can* and *Cannot* Mean

*General idea: this category examines the claim that a replacement test could be "~2× better than CogAT." It separates the cost of building a validated test from the mathematical question of which quality axes can even be doubled; a defensible "2×" claim needs a tail-specific, unbounded metric, not "2× validity."*

- **Subcategory 11.1: Building a standardized test is a multi-year, validation-heavy program**
  - **Source:** AERA/APA/NCME (2014), Standards ch. 4–5
    - **Plain-language idea:** a defensible test isn't just good questions — it requires reviews, tryouts on representative samples, and bias screening, all of which take years.
    - **DOK 1 — Facts:**
      - Item review + tryouts on representative samples + DIF screening are required, not optional; adaptive designs additionally require large operational item pools and stopping rules. *(AERA/APA/NCME, 2014, Standards ch. 4–5.)*
    - **DOK 2 — Summary:** Custom test development is a multi-year commitment, not a sprint (Category 15 surveys existing instruments).
    - **Link to source:** [AERA/APA/NCME (2014), *Standards*, ch. 4–5](https://www.testingstandards.net/)
- **Subcategory 11.2: Calibration samples**
  - **Source:** Hulin, Lissak & Drasgow (1982); de Ayala (2009); Linacre; Oosterhuis, van der Ark & Sijtsma (2016)
    - **Plain-language idea:** to "calibrate" each item (estimate its difficulty/discrimination) you need enough test-takers — hundreds to thousands, depending on the model.
    - **DOK 1 — Facts:**
      - Rules of thumb ≈ **500 for 2PL, ≈1,000 for 3PL** item calibration; de Ayala's honest answer is "it depends" on model, items, and sample. *(Hulin, Lissak & Drasgow, 1982, *Applied Psychological Measurement*, DOI 10.1177/014662168200600301; de Ayala, 2009, *The Theory and Practice of IRT*.)*
      - Rasch/1PL rules of thumb are lower (roughly **200–250 valid responses per item** for common precision targets), but field-test seeding can make the total required sample much larger. Separately, regression-based **continuous norming** can require **2.5–5.5× fewer cases per age subgroup** than binned norms for comparable precision. *(Linacre, *Rasch Measurement Transactions*; Oosterhuis, van der Ark & Sijtsma, 2016, DOI 10.1177/1073191115580638.)*
    - **DOK 2 — Summary:** A concrete data requirement for any new adaptive bank — nontrivial at a small school.
    - **Link to source:** [https://doi.org/10.1177/014662168200600301](https://doi.org/10.1177/014662168200600301)
- **Subcategory 11.3: Time / cost (indicative)**
  - **Source:** Center for Assessment (expert blog); National Academies (2022)
    - **Plain-language idea:** rough industry figures for what a serious test costs and how long it takes.
    - **DOK 1 — Facts:**
      - ≥3 years is a common rule of thumb for a large-scale test; item creation ~$1,000–$20,000 per item; NAEP item development ≈ $16.3M/yr. *(Center for Assessment [expert blog, not peer-reviewed]; National Academies, 2022, *A Pragmatic Future for NAEP*.)*
    - **DOK 2 — Summary:** Indicative, drawn from large-scale achievement testing — a scale check, not a precise GT budget.
    - **Link to source:** [National Academies (2022), *A Pragmatic Future for NAEP*](https://doi.org/10.17226/26427)
- **Subcategory 11.4: BOUNDED axes — you *cannot* 2×**
  - **Source:** AERA/APA/NCME (2014) Standards ch. 2; Spearman (1904)
    - **Plain-language idea:** reliability and observed validity are already high and capped, so "2× the validity" is not even mathematically possible.
    - **DOK 1 — Facts:**
      - Reliability (already ~.90s, capped at 1.0) and observed criterion validity (capped at `√(r_xx · r_yy)`) cannot be doubled. *(Standards ch. 2; Spearman, 1904.)*
    - **DOK 2 — Summary:** Reliability and observed validity cannot support a literal "2×" claim; the comparison must use the tail-specific axes in 11.5.
    - **Link to source:** [AERA/APA/NCME (2014), *Standards*](https://www.testingstandards.net/) | [Spearman (1904)](https://doi.org/10.2307/1412159)
- **Subcategory 11.5: UNBOUNDED / tail-specific axes — where "2×" *is* coherent**
  - **Source:** Lord (1980); van der Linden (1984); Baker (2001); Livingston & Lewis (1995); AERA/APA/NCME (2014)
    - **Plain-language idea:** some quality measures *aren't* capped and live exactly at the tail — you can genuinely double the test's information at the cut, or halve how many gifted kids it misses.
    - **DOK 1 — Facts:**
      - **Relative efficiency at the cut** is `RE(θ_cut)=I_new(θ_cut)/I_reference(θ_cut)`. `RE=2` means the reference test needs about twice the exchangeable items to match the candidate's precision at that same θ; equivalently, the ratio of squared conditional SEMs is 2. Both tests must be placed on a common IRT metric. *(Lord, 1980; van der Linden, 1984, DOI 10.1111/j.1467-9574.1984.tb01101.x.)*
      - **Test information at high θ** is additive and uncapped — but **halving the conditional SEM requires ~4× the information, not 2×** (since `SEM ∝ 1/√I`; doubling information cuts SEM to ≈0.707, a ~29% reduction). *(Lord, 1980; Baker, 2001.)*
      - **False-negative rate at the cut** is a proportion in [0,1] not pinned near a ceiling, so 20% → 10% is arithmetically real. *(Standards 2.14–2.16; Livingston & Lewis, 1995.)*
      - **Classification consistency** at the cut can rise materially. *(Livingston & Lewis, 1995.)*
    - **DOK 2 — Summary:** A defensible "~2×" claim uses a tail-specific, unbounded metric such as relative information or false-negative reduction at the cut, not a vague "2× validity" headline.
    - **Link to source:** [Lord (1980)](https://doi.org/10.4324/9780203056615) | [Livingston & Lewis (1995)](https://doi.org/10.1111/j.1745-3984.1995.tb00462.x)
- **Subcategory 11.6: Precedent that adaptivity moves exactly these axes**
  - **Source:** Weiss (1982)
    - **Plain-language idea:** the "equal precision at all levels + fewer items + better classification" result (Category 10.1) is precisely the tail-axis improvement 11.5 says is possible.
    - **DOK 1 — Facts:**
      - Equal precision at all trait levels, fewer items, better classification. *(Weiss, 1982.)*
    - **DOK 2 — Summary:** Ties the feasibility argument back to a real, published mechanism (CAT), not a hope.
    - **Link to source:** [https://doi.org/10.1177/014662168200600408](https://doi.org/10.1177/014662168200600408)
- **Subcategory 11.7: A cautionary real-world case — NWEA MAP**
  - **Source:** NWEA MAP Growth technical and norms documentation [publisher COI]
    - **Plain-language idea:** even a real adaptive test used by millions still loses precision near the top and compresses gifted growth — a reality check that "adaptive" is not magic.
    - **DOK 1 — Facts:**
      - NWEA MAP is adaptive and reports lower SEM than fixed forms and a "very high ceiling," yet its own documents show SEM rising near the top of a level's range. Its 2025 norms draw on ~13.8M students, but expected RIT growth *compresses* in upper grades (≈6 RIT in grades 5–6 vs. ≈4 in 7–8), so raw gain understates gifted growth and conditional growth percentiles are the appropriate high-ceiling metric. *(NWEA technical and norms documentation — **publisher COI**; a specific numeric "effective RIT ceiling" is `[UNVERIFIED]`.)*
    - **DOK 2 — Summary:** MAP is examined in Categories 3.8 and 5.2 as a possible high-ceiling outcome, so its tail behavior is doubly relevant: adaptivity helps but does not make upper-range precision automatic.
    - **Link to source:** [NWEA MAP Growth Technical Report (2025)](https://www.nwea.org/uploads/MAP-Growth-Technical-Report-2025.pdf)
- **Subcategory 11.8: No head-to-head "2×" claim is valid without a common comparison design**
  - **Source:** Kolen & Brennan (2014); Linn (1993); DeLong, DeLong & Clarke-Pearson (1988)
    - **Plain-language idea:** two test scales are not automatically the same ruler. A larger number or information value on one scale cannot be divided by the other until the scales or outcomes are made comparable.
    - **DOK 1 — Facts:**
      - Equating requires the same construct and strong symmetry/population-invariance conditions; weaker links include calibration, concordance, and prediction, each licensing a weaker claim. Tail equating is especially uncertain because few cases anchor the top. *(Kolen & Brennan, 2014, DOI 10.1007/978-1-4939-0317-7; Linn, 1993, DOI 10.1207/s15324818ame0601_5.)*
      - If full equating is not defensible, administer both tests to the **same students** and compare them against one construct-distinct external criterion. Paired methods such as DeLong test the difference in AUC while preserving within-student covariance; report differences with confidence intervals, not two separate significant/non-significant results. *(DeLong et al., 1988, DOI 10.2307/2531595.)*
    - **DOK 2 — Summary:** `RE(θ_cut)≥2` is a measurement claim requiring shared calibration; halving false negatives is a decision claim requiring a shared external label. Neither is a program-impact claim.
    - **Link to source:** [https://doi.org/10.1007/978-1-4939-0317-7](https://doi.org/10.1007/978-1-4939-0317-7) | [https://doi.org/10.2307/2531595](https://doi.org/10.2307/2531595)
- **Subcategory 11.9: Validity belongs to the proposed use, not to a test name**
  - **Source:** AERA/APA/NCME (2014); APA Ethics Code
    - **Plain-language idea:** a validated item or instrument does not automatically validate a new K–8 gifted-admissions use, scoring rule, delivery mode, or composite.
    - **DOK 1 — Facts:**
      - The *Standards* define validity as the degree to which evidence and theory support score interpretations **for proposed uses** and organize evidence around content, response processes, internal structure, relations to other variables, and consequences. APA Ethics Code 9.02 likewise limits use to purposes/populations supported by validity and reliability evidence. *(AERA/APA/NCME, 2014; APA Ethics Code.)*
      - Rebuilding, recombining, digitizing, or gamifying tasks creates a new validity argument; publisher validity and norms do not transfer automatically.
    - **DOK 2 — Summary:** A new instrument cannot support high-stakes decisions until evidence validates its specific use and target population.
    - **Link to source:** [AERA Standards](https://www.aera.net/publications/books/standards-for-educational-psychological-testing-2014-edition) | [APA Ethics Code](https://www.apa.org/ethics/code)



### Category 12: Game-Based / "Gamified" Assessment (the Roblox-Style Option) — Promise, Evidence Ceiling, and Fairness Threats

*General idea: could a fun game measure gifted reasoning while feeling like play? "Game-based assessment" (GBA) / "stealth assessment" scores how a child plays, not just their answers. The paradigm is real, and child studies now exist, but convergence with traditional tests is usually modest and no study validates a game for high-stakes K–8 gifted identification. Games also introduce their own familiarity, device, motor, and engagement biases.*

- **Subcategory 12.1: GBA / "stealth assessment" is a real paradigm**
  - **Source:** Shute & Ventura (2013); Mislevy, Steinberg & Almond (2003)
    - **Plain-language idea:** instead of asking questions, you embed a task in a game and infer ability from the *process data* (the "telemetry" of how the player acts), using a scoring framework called **evidence-centered design**.
    - **DOK 1 — Facts:**
      - Embed performance tasks in a game and score process/telemetry data using **evidence-centered design + Bayesian networks**. *(Shute & Ventura, 2013, *Stealth Assessment*, MIT Press, DOI 10.7551/mitpress/9589.001.0001; Mislevy, Steinberg & Almond, 2003, *Measurement*, DOI 10.1207/s15366359mea0101_02.)*
    - **DOK 2 — Summary:** Establishes GBA as a legitimate measurement method (not a gimmick) — the question is whether it works for *high-stakes K–8 gifted ID*, which the rest of the category probes.
    - **Link to source:** [https://doi.org/10.7551/mitpress/9589.001.0001](https://doi.org/10.7551/mitpress/9589.001.0001) | [https://doi.org/10.1207/s15366359mea0101_02](https://doi.org/10.1207/s15366359mea0101_02)
- **Subcategory 12.2: Roblox is a working proof-of-concept — for *adults*, not children**
  - **Source:** EDM 2024 proceedings; Roblox Newsroom (2025) [COMPANY CLAIM]
    - **Plain-language idea:** Roblox actually uses a game to screen adult job candidates — proof the idea can be operationalized, but on a very different population than K–8 kids.
    - **DOK 1 — Facts:**
      - Since 2021 Roblox has operationalized a **game-based hiring assessment** to measure "cognitive skills such as creative problem-solving and systems thinking" for entry-level engineers/PMs (practice game "Kaiju Cats"). *(EDM 2024 proceedings poster, "Identifying Off-Task Users in a Large-Scale, Game-Based Practice Assessment.")* Roblox calls it "standardized, scientifically validated" — a **`[COMPANY CLAIM]`**, not independent peer review *(Roblox Newsroom, 2025, "Fair Play")*. Population = adult job candidates; **not** a child/gifted instrument.
    - **DOK 2 — Summary:** The strongest "it can be done at scale" evidence, but the population gap (adults → K–8) is exactly the untested leap for high-stakes gifted identification.
    - **Link to source:** [EDM 2024 proceedings](https://educationaldatamining.org/edm2024/proceedings/2024.EDM-posters.96/index.html) | [Roblox Newsroom (2025), "Fair Play"](https://about.roblox.com/newsroom/2025/07/fair-play-robloxs-game-based-talent-assessment)
- **Subcategory 12.3: Single-game validity looks encouraging — but proponent-generated and small-sample**
  - **Source:** Shute & Moore (2017); Shute, Ventura & Ke (2015)
    - **Plain-language idea:** the tests-of-the-tests were run by the games' own creators on small adult samples, so the encouraging numbers need independent replication.
    - **DOK 1 — Facts:**
      - Physics Playground reported internal consistency α ≈ 0.87 and convergent **r ≈ 0.22–0.41** with an external physics test *(Shute & Moore, 2017)*; Portal 2 vs. Lumosity gave problem-solving d ≈ 0.59, spatial d ≈ 0.64, persistence d ≈ 0.42 — but **adults, n = 77** *(Shute, Ventura & Ke, 2015, *Computers & Education*, DOI 10.1016/j.compedu.2014.08.013)*.
    - **DOK 2 — Summary:** "Convergent validity" here means the game correlates with an established test; r ≈ 0.3 is modest, and small proponent samples cap how much weight it can bear.
    - **Link to source:** [https://doi.org/10.1016/j.compedu.2014.08.013](https://doi.org/10.1016/j.compedu.2014.08.013)
- **Subcategory 12.4: The independent evidence is usually moderate; child evidence is emerging**
  - **Source:** Bipp et al. (2024); Aneni et al. (2023); Song et al. (2020)
    - **Plain-language idea:** pooling studies in adults and children, game scores usually overlap with established cognitive tests but are not interchangeable with them.
    - **DOK 1 — Facts:**
      - An adult meta-analysis (52 samples, >6,100 people) puts the observed correlation between game-related assessment and traditional cognitive-ability tests at **r ≈ .30** (corrected ≈ .45), with substantial heterogeneity and a range from negative to strongly positive. *(Bipp et al., 2024, *Journal of Intelligence*, DOI 10.3390/jintelligence12120129.)*
      - A child/adolescent systematic review and meta-analysis covered **19 articles, 20 studies, 18 games, and 378 correlations**; 75% of game–traditional-test correlations were significant, and 80% of those significant results were in the low-to-medium range. *(Aneni, de la Vega, Jiao, Funaro & Fiellin, 2023, *Progress in Brain Research*, DOI 10.1016/bs.pbr.2023.02.002.)*
      - In the CoCon mobile game, the working-memory score correlated about **r=.45** with both WISC Digit Span and the Working Memory Index; processing-speed and verbal relations were smaller. *(Song, Yi & Park, 2020, *PLOS ONE*, DOI 10.1371/journal.pone.0230498.)*
    - **DOK 2 — Summary:** Child evidence corrects the older "adult-only" framing, but it strengthens a narrow conclusion: single games usually provide partial, construct-specific signal rather than a replacement for a validated battery.
    - **Link to source:** [https://doi.org/10.3390/jintelligence12120129](https://doi.org/10.3390/jintelligence12120129) | [https://doi.org/10.1016/bs.pbr.2023.02.002](https://doi.org/10.1016/bs.pbr.2023.02.002) | [https://doi.org/10.1371/journal.pone.0230498](https://doi.org/10.1371/journal.pone.0230498)
- **Subcategory 12.5: GBA is positioned as *formative/low-stakes*; high-stakes K–8 gifted use is unvalidated `[gap]`**
  - **Source:** Shute & Sun (2020); Gomez, Ruipérez-Valiente & García Clemente (2023)
    - **Plain-language idea:** the field itself frames GBA as a *learning/low-stakes* tool; no study validates it for a high-stakes gifted-admissions decision on children.
    - **DOK 1 — Facts:**
      - GBA is positioned as formative/low-stakes; **no study validates it for high-stakes K-8 gifted identification (`[gap]`).** *(Shute & Sun, 2020, *Handbook of Game-Based Learning*; systematic review: Gomez, Ruipérez-Valiente & García Clemente, 2023, *IEEE Trans. Learning Technologies*, DOI 10.1109/TLT.2022.3226661.)*
    - **DOK 2 — Summary:** The single most important limit for adopting GBA *as the score*: the exact high-stakes K–8 gifted-identification use is the one with no evidence.
    - **Link to source:** [https://doi.org/10.1109/TLT.2022.3226661](https://doi.org/10.1109/TLT.2022.3226661)
- **Subcategory 12.6: The fairness threat is empirically documented, not hypothetical**
  - **Source:** Ohlms, Hohner & Melchers (2025); Kim et al. (2023)
    - **Plain-language idea:** kids who play more video games score higher on the *game* without being more able — that extra bit is "construct-irrelevant variance" (measurement noise unrelated to what you meant to measure), i.e., bias.
    - **DOK 1 — Facts:**
      - Video-game experience **predicts game-based-assessment scores but not academic performance — i.e., test bias / criterion-irrelevant variance.** *(Ohlms, Hohner & Melchers, 2025, *Applied Psychology*, DOI 10.1111/apps.70038.)* In a spatial GBA, "enjoyment significantly affects one key feature," with explicit gender-subgroup concerns *(Kim et al., 2023, *BJET*, DOI 10.1111/bjet.13286)*.
    - **DOK 2 — Summary:** Game-familiarity and enjoyment leaking into the score would violate the fairness bar (Category 9.7) and fairness standards.
    - **Link to source:** [https://doi.org/10.1111/apps.70038](https://doi.org/10.1111/apps.70038) | [https://doi.org/10.1111/bjet.13286](https://doi.org/10.1111/bjet.13286)
- **Subcategory 12.7: Commercial "games measure cognition" claims are mostly unvalidated marketing**
  - **Source:** Wilson et al. (2021); Simons et al. (2016); FTC (2016); Kollins et al. (2020)
    - **Plain-language idea:** most "brain games" that claim to measure or boost ability have not shown they actually do; the one FDA-cleared game is a narrow ADHD *treatment*, not an ability test.
    - **DOK 1 — Facts:**
      - The one independent pymetrics audit checked only that the de-biasing *code* met the four-fifths rule and **explicitly did not test whether the games measure ability or predict performance** *(Wilson et al., 2021, ACM FAccT)*; brain-training far-transfer is weak *(Simons et al., 2016, *Psych. Science in the Public Interest*, DOI 10.1177/1529100616661983; FTC Lumosity $2M settlement, 2016)*. The one rigorously validated game — Akili's **EndeavorRx** (FDA De Novo, 2020; Kollins et al., 2020, *Lancet Digital Health*, DOI 10.1016/S2589-7500(20)30017-0) — is a narrow ADHD **treatment**, not an ability test.
    - **DOK 2 — Summary:** Separates the hype from the evidence; a caution against importing vendor validity claims.
    - **Link to source:** [https://doi.org/10.1177/1529100616661983](https://doi.org/10.1177/1529100616661983) | [https://doi.org/10.1016/S2589-7500(20)30017-0](https://doi.org/10.1016/S2589-7500(20)30017-0)
- **Subcategory 12.8: The most rigorous game trial (Minecraft) was null**
  - **Source:** *Computers & Education* (2024); Slattery et al. (2025)
    - **Plain-language idea:** the best-designed test of a popular "educational" game found no real effect — and the wider literature is at high risk of bias.
    - **DOK 1 — Facts:**
      - A cluster RCT (N = 885) found no overall effect on spatial thinking, and a systematic review flags medium/high risk of bias across studies. *(*Computers & Education*, 2024; Slattery et al., 2025, *Review of Education*, DOI 10.1002/rev3.70035.)*
    - **DOK 2 — Summary:** Reinforces that game "cognitive" claims often evaporate under rigorous testing.
    - **Link to source:** [https://doi.org/10.1002/rev3.70035](https://doi.org/10.1002/rev3.70035)



### Category 13: The Learning Science of Eliciting a Child's *Best* Performance (and Whether "Fun" Helps *Measurement*)

*General idea: a screen only measures well if the child performs near their true ability. This category covers what raises or lowers a child's demonstrated performance — and the crucial distinction that engagement can rise while measurement quality falls.*

- **Subcategory 13.1: Test anxiety depresses scores and adds noise — measurably, in K–8**
  - **Source:** von der Embse et al. (2018); Robson et al. (2023); Hembree (1988)
    - **Plain-language idea:** anxiety makes kids underperform, so a stressful test *underestimates* true ability — a real source of false negatives.
    - **DOK 1 — Facts:**
      - Achievement correlations: grades 1–5 **r ≈ −.22**, grades 6–8 **r ≈ −.25** *(von der Embse et al., 2018, *J. Affective Disorders*, DOI 10.1016/j.jad.2017.11.048)*; a 20-year meta-analysis of **53,617 children aged 5–12** confirms the negative link *(Robson et al., 2023, *J. School Psychology*, DOI 10.1016/j.jsp.2023.02.003)*; foundational: Hembree, 1988, *Review of Educational Research*, DOI 10.3102/00346543058001047.
    - **DOK 2 — Summary:** The strongest reason a *lower-anxiety* (e.g., playful) delivery could improve *measurement* — by removing a known downward bias, not by making the test "easier."
    - **Link to source:** [https://doi.org/10.1016/j.jad.2017.11.048](https://doi.org/10.1016/j.jad.2017.11.048) | [https://doi.org/10.1016/j.jsp.2023.02.003](https://doi.org/10.1016/j.jsp.2023.02.003)
- **Subcategory 13.2: "Flow" requires a challenge–skill balance**
  - **Source:** Csikszentmihalyi (1990)
    - **Plain-language idea:** people engage best when difficulty matches skill — too hard breeds anxiety, too easy breeds boredom. This is exactly what adaptive difficulty (Category 10.1) does.
    - **DOK 1 — Facts:**
      - Challenge above skill breeds anxiety, below it breeds boredom — adaptive difficulty-matching is the mechanism that sustains engagement. *(Csikszentmihalyi, 1990, *Flow*.)*
    - **DOK 2 — Summary:** A theoretical bridge between engagement and adaptive testing — the same difficulty-matching that aids measurement also sustains motivation.
    - **Link to source:** [Csikszentmihalyi (1990), *Flow*](https://search.worldcat.org/title/20392741)
- **Subcategory 13.3: Extrinsic rewards can *crowd out* intrinsic motivation — and it is worse for children**
  - **Source:** Deci, Koestner & Ryan (1999); Ryan & Deci (2000)
    - **Plain-language idea:** paying/badging kids for performance can *reduce* their genuine interest — a caution against "gamified" reward mechanics in a measurement setting.
    - **DOK 1 — Facts:**
      - Tangible/performance rewards undermined free-choice intrinsic motivation (d ≈ −0.28 to −0.40) and were "more detrimental for children than college students"; positive *feedback* enhanced it (d ≈ 0.33). *(Deci, Koestner & Ryan, 1999, *Psychological Bulletin*, DOI 10.1037/0033-2909.125.6.627; framework: Ryan & Deci, 2000, *American Psychologist*, DOI 10.1037/0003-066X.55.1.68.)*
    - **DOK 2 — Summary:** Directly relevant to GT School's "cash rewards" framing and to any point/badge system in a gifted screen.
    - **Link to source:** [https://doi.org/10.1037/0033-2909.125.6.627](https://doi.org/10.1037/0033-2909.125.6.627) | [https://doi.org/10.1037/0003-066X.55.1.68](https://doi.org/10.1037/0003-066X.55.1.68)
- **Subcategory 13.4: Game interfaces can inject *extraneous* cognitive load**
  - **Source:** Sweller (1988); Sweller, van Merriënboer & Paas (1998/2019)
    - **Plain-language idea:** "cognitive load" is the mental effort a task demands; effort spent decoding controls/graphics is effort *not* spent on the reasoning you meant to measure.
    - **DOK 1 — Facts:**
      - Working memory spent decoding controls/graphics is unavailable for the reasoning being measured. *(Sweller, 1988, DOI 10.1207/s15516709cog1202_4; Sweller, van Merriënboer & Paas, 1998/2019, DOIs 10.1023/A:1022193728205, 10.1007/s10648-019-09465-5.)*
    - **DOK 2 — Summary:** The mechanism by which a "richer" game can *lower* measurement quality — especially for young children (Category 13's link to K-4 motor/onboarding load).
    - **Link to source:** [https://doi.org/10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4) | [https://doi.org/10.1007/s10648-019-09465-5](https://doi.org/10.1007/s10648-019-09465-5)
- **Subcategory 13.5: Gamification's measured benefit is real but modest — and about *learning/engagement*, not measurement validity**
  - **Source:** Sailer & Homner (2020); Hamari et al. (2014); Bai, Hew & Huang (2020)
    - **Plain-language idea:** adding game elements helps engagement/learning a little, but that is a different claim from "the game measures ability accurately," and the benefit fades as novelty wears off.
    - **DOK 1 — Facts:**
      - Cognitive g = 0.49, motivational g = 0.36, behavioral g = 0.25 (the latter two less stable) *(Sailer & Homner, 2020, *Educational Psychology Review*, DOI 10.1007/s10648-019-09498-w)*; effects are context/user-dependent with an explicit **novelty-effect** caveat *(Hamari et al., 2014, HICSS, DOI 10.1109/HICSS.2014.377)*; shorter interventions show larger effects (consistent with novelty), and some learners report anxiety/jealousy *(Bai, Hew & Huang, 2020, *Educational Research Review*, DOI 10.1016/j.edurev.2020.100322)*.
    - **DOK 2 — Summary:** The load-bearing distinction: **engagement ≠ validity**. Gamification can aid learning without improving (or while harming) measurement.
    - **Link to source:** [https://doi.org/10.1007/s10648-019-09498-w](https://doi.org/10.1007/s10648-019-09498-w) | [https://doi.org/10.1016/j.edurev.2020.100322](https://doi.org/10.1016/j.edurev.2020.100322)
- **Subcategory 13.6: Stereotype threat — a *possible*, not settled, performance factor (contested)**
  - **Source:** Steele & Aronson (1995); Shewach, Sackett & Quint (2019); Flore & Wicherts (2015)
    - **Plain-language idea:** the idea that reminding students of a negative group stereotype depresses their scores; the original effect looks much smaller under real testing conditions.
    - **DOK 1 — Facts:**
      - The original demonstration *(Steele & Aronson, 1995, DOI 10.1037/0022-3514.69.5.797)* attenuates to negligible-to-small under operational conditions, with publication-bias signs (d ≈ −.14) *(Shewach, Sackett & Quint, 2019, DOI 10.1037/apl0000420; Flore & Wicherts, 2015)*.
    - **DOK 2 — Summary:** Treat as a candidate, not settled, factor — flagged honestly rather than assumed.
    - **Link to source:** [https://doi.org/10.1037/apl0000420](https://doi.org/10.1037/apl0000420)
- **Subcategory 13.7: Task comprehension, device choice, and standardized delivery are part of the measurement**
  - **Source:** WISC-V administration materials; National Academies; child tablet/touchscreen studies
    - **Plain-language idea:** especially for K–4, a wrong answer can mean "did not understand the task or controls" rather than "could not reason." Good tests teach the format before scoring and hold administration constant.
    - **DOK 1 — Facts:**
      - WISC-V includes demonstration, sample, and teaching items before scored items so unfamiliar task rules are not treated as low ability. *(WISC-V Administration and Scoring Manual materials, **publisher-COI**.)*
      - Group tablet self-administration has been demonstrated from about age 7 in a 12-task child battery, while preschool studies find touchscreen selection/manipulation easier than mouse use. These results support age-specific interface validation; they do not prove score equivalence across devices. *("Collecting big data with small screens," 2020, PMC7710155; touchscreen child-interface research.)*
      - Standardization is not trivial: reviews summarized by the National Academies found scoring or clerical errors in **38% of WISC-R and 42% of WISC-III protocols** despite trained examiners. Digital administration can remove some clerical variation but introduces device, latency, accessibility, and software risks of its own.
    - **DOK 2 — Summary:** The acceptance question is not "paper or digital?" but whether each mode preserves the construct, instructions, timing, accommodations, and score interpretation for each age group.
    - **Link to source:** [National Academies overview](https://www.ncbi.nlm.nih.gov/books/NBK305233/) | [PMC7710155](https://pmc.ncbi.nlm.nih.gov/articles/PMC7710155/).



### Category 14: Migrating Game-Development Practice to Test Design — What Transfers, and What Doesn't

*General idea: even if a game should not itself define the score (Category 12), several game-development practices map onto established psychometric practice. The limit (14.2) is that engineering methods do not transfer validity automatically.*

- **Subcategory 14.1: Ten mappings from game development to assessment engineering**
  - **Source:** Leighton (2017); Seif El-Nasr, Drachen & Canossa (2013); Bergner & von Davier (2019); van der Linden & Glas (2010); Bock, Muraki & Pfeiffenberger (1988); Kohavi, Tang & Xu (2020); Gierl, Lai & Turner (2012); Corbett & Anderson (1994); Piech et al. (2015); Swink (2009); Thompson, Johnstone & Thurlow (2002); Sympson & Hetter (1985)
    - **Plain-language idea:** familiar studio practices (playtesting, telemetry, difficulty curves, live tuning, content generation, player modeling, "juice," accessibility, anti-cheat) each have an established psychometric counterpart.
    - **DOK 1 — Facts:**
      - **Playtesting → cognitive labs / response-process validity:** studios playtest; test developers run think-aloud "cognitive labs" to verify items elicit the intended reasoning. *(Leighton, 2017, Oxford, DOI 10.1093/acprof:oso/9780199372904.001.0001; AERA/APA/NCME, 2014, ch. 1; game-side — Drachen, Mirza-Babaei & Nacke, 2018, *Games User Research*.)*
      - **Game telemetry/analytics → process/log-data & item analytics.** *(Seif El-Nasr, Drachen & Canossa, 2013, *Game Analytics*, DOI 10.1007/978-1-4471-4769-5; Bergner & von Davier, 2019, *JEBS*, DOI 10.3102/1076998618784700, who note response time alone can't even establish engagement.)*
      - **Level design / difficulty curves → item-difficulty sequencing & adaptive routing (CAT/MST).** *(van der Linden & Glas, 2010; Weiss, 1982 — Category 10.1.)*
      - **Game balancing / live-ops tuning → equating, DIF & item-parameter-drift monitoring** (item parameters *drift* and must be monitored). *(Bock, Muraki & Pfeiffenberger, 1988, *JEM*, DOI 10.1111/j.1745-3984.1988.tb00308.x; Meredith, 1993 — Category 9.7.)*
      - **Live-ops A/B testing → continuous, trustworthy experimentation on items** (guardrail metrics; avoiding carryover/novelty confounds). *(Kohavi, Tang & Xu, 2020, *Trustworthy Online Controlled Experiments*.)*
      - **Procedural content generation → Automatic Item Generation (AIG)** — one model produced **1,248** items in a licensure example. *(Gierl, Lai & Turner, 2012, *Medical Education*, DOI 10.1111/j.1365-2923.2012.04289.x; Gierl & Haladyna, 2012, *Automatic Item Generation*.)*
      - **Player/difficulty modeling → IRT, knowledge tracing, and CAT** (incl. "Deep Knowledge Tracing"). *(Corbett & Anderson, 1994/95, DOI 10.1007/BF01099821; Piech et al., 2015, NeurIPS, arXiv 1506.05908.)*
      - **"Juice" / game feel → feedback design** — but in a *scored* segment feedback must be neutral/process-focused, and **over-juicing measurably lowers performance** (Category 13). *(Swink, 2009, *Game Feel*; Kao, 2020.)*
      - **Accessibility in games → Universal Design for Assessment + construct-preserving accommodations.** *(Thompson, Johnstone & Thurlow, 2002, NCEO Synthesis Report 44, ERIC ED467721; AERA/APA/NCME, 2014, ch. 3.)*
      - **Anti-cheat / exposure → test security & item-exposure control.** *(Sympson & Hetter, 1985, Proc. 27th Military Testing Association; van der Linden & Glas, 2010.)*
    - **DOK 2 — Summary:** Game-development practices have clear assessment-engineering analogues, but each analogue still requires psychometric validation for its intended use.
    - **Link to source:** [https://doi.org/10.1111/j.1365-2923.2012.04289.x](https://doi.org/10.1111/j.1365-2923.2012.04289.x) | [https://doi.org/10.3102/1076998618784700](https://doi.org/10.3102/1076998618784700)
- **Subcategory 14.2: The migration's hard limit — it transfers *engineering*, not *validity***
  - **Source:** Haladyna & Downing (2004)
    - **Plain-language idea:** anything a game adds that moves scores but isn't the ability you meant to measure is *construct-irrelevant variance* — a named validity threat, no matter how good the engineering.
    - **DOK 1 — Facts:**
      - Anything a game adds that moves scores but isn't the target construct is **construct-irrelevant variance**, a defined validity threat; every mapping above still has to clear the Category 9 psychometric bar. *(Haladyna & Downing, 2004, *Educational Measurement: Issues and Practice*, DOI 10.1111/j.1745-3992.2004.tb00149.x.)*
    - **DOK 2 — Summary:** Engagement and access gains do not substitute for psychometric validity at the gifted tail.
    - **Link to source:** [https://doi.org/10.1111/j.1745-3992.2004.tb00149.x](https://doi.org/10.1111/j.1745-3992.2004.tb00149.x)



### Category 15: The Gifted-Measurement Toolbox *Beyond* CogAT — Instruments and Their Evidence

*General idea: A large catalog of validated instruments already exists beyond CogAT. This category surveys them by class with each entry's evidence, strengths, and limitations.*

> **Cross-cutting practicality fact:** the individually-administered batteries in 15.1 are **Level-C, one-examiner-one-child** instruments (40–90+ min, graduate-trained administrator, ~$800–$1,600+ kits) — **confirmatory/diagnostic tools, not scalable universal screens.**

- **Subcategory 15.1: Individually-administered IQ batteries (confirmatory, not screens)**
  - **Source:** Wechsler (WISC-V, WPPSI-IV); Roid (SB5); McGrew/Mather/LaForte (WJ V); Elliott (DAS-II); Kaufman (KABC-II); Reynolds/Kamphaus (RIAS-2) — with independent reviews
    - **Plain-language idea:** these are the gold-standard "IQ tests" a psychologist gives one child at a time; they are precise and high-ceiling but far too costly/slow to screen everyone — a *second-stage confirmatory* tool.
    - **DOK 1 — Facts:**
      - **WISC-V** (6:0–16:11): 10 primary + 6 secondary subtests → five indices + FSIQ + General Ability Index (GAI); FSIQ internal consistency ~.96; **Extended Norms** push composites toward ~210 for the profoundly gifted; the **GAI** strips Working Memory + Processing Speed so speed/memory don't mask reasoning. Independent CFAs show the **publisher's five-factor model fails; a bifactor with dominant *g* fits best**, and the group indices are "of questionable interpretive value independent of *g*." *(Wechsler, 2014, Pearson; TR#5/#6 [PUBLISHER-COI]; Canivez, Watkins & Dombrowski, 2017, *Psychological Assessment*, DOI 10.1037/pas0000358 [independent].)* *Evidence strength:* the extended-norm concept + a *g*-loaded reasoning composite (GAI) without WM/PS. *Evidence limitation:* interpreting the five index scores for selection; a 1:1 clinician test as a first-stage screen.
      - **WPPSI-IV** (2:6–7:7): age-banded preschool subtests → five indices + FSIQ; a sound early-childhood battery but a **lower ceiling than WISC-V** and preschool scores are inherently unstable. *(Wechsler, 2012, Pearson [COI]; Syeda & Climie, 2014, *JPA*.)* *Evidence strength:* developmentally appropriate low-language item formats. *Evidence limitation:* any single early-childhood IQ as a gate.
      - **Stanford-Binet 5** (2–85+): routing/adaptive-start subtests → FSIQ/NVIQ/VIQ + five factors; markets an Extended IQ to 225 but **independent data show it *compresses* the gifted tail** (gifted children scored significantly lower than on WISC-III; rank order not preserved), plus **stale 2003 norms**. *(Roid, 2003 [COI]; Minton & Pratt, 2006, *Roeper Review*, DOI 10.1080/02783190609554369 [independent].)* *Evidence strength:* the verbal + nonverbal parallel-routing design. *Evidence limitation:* SB5's stale norms + extrapolated high end — it *under-identifies* the gifted.
      - **WJ V (2025) / WJ IV Cognitive**: CHC-based → GIA (*g*), Gf-Gc composite, broad CHC clusters; continuous W-score (Rasch) scoring, WJ V fully digital, **current post-pandemic norms (~5,837)**; independent review calls the psychometrics "robust" but "less convincing under six," with **no dedicated gifted extended norms**. *(McGrew, Mather & LaForte, 2025, Riverside [COI]; *JPA* Test Review, 2025, DOI 10.1177/07342829251395781 [independent].)* *Evidence strength:* the digital-native, continuously-scored, currently-normed architecture + a parsimonious Gf-Gc *g*. *Evidence limitation:* treating it as a high-end gifted differentiator; ignoring the hardware/access barrier.
      - **DAS-II** (2:6–17:11): 20 subtests → General Conceptual Ability (GCA) + Special Nonverbal Composite + clusters; a clean **GCA (g without WM/PS/knowledge dilution)**, but **extended/gifted and early-years norms are still 2007**. *(Elliott, 2007 / NU 2023, Pearson [COI].)* *Evidence strength:* the reasoning-first GCA + SNC template. *Evidence limitation:* reliance on stale 2007 extended/early-years norms at the high end.
      - **KABC-II** (3:0–18:11): dual-model engine — Luria MPI (excludes acquired knowledge) vs. CHC FCI — plus a Nonverbal Index; **MPI/NVI deliberately drop acquired-knowledge/language**, yielding smaller Black–White gaps and *over-predicting* minority achievement (recommended to capture *potential*), but the ceiling tops at 160 and the 2018 renorm sample is small (N=700). *(Kaufman & Kaufman, 2004 / NU 2018 [COI]; Scheiber, 2016, *Assessment*, DOI 10.1177/1073191115624545 [independent].)* *Evidence strength:* reduced-cultural-loading + potential-vs-attainment framing for equity. *Evidence limitation:* the 160 ceiling; expecting low-Gc indices to predict *current* achievement.
      - **RIAS-2** (3–94): 8 subtests → Composite Intelligence (CIX), Verbal (VIX), Nonverbal (NIX) + co-normed memory/speed; brief (~25–45 min), low motor/reading load, indices >.90 — but independent work finds it is **essentially one *g* factor** (sub-indices of limited standalone value). *(Reynolds & Kamphaus, 2015, PAR [COI]; Nelson & Canivez, 2012, *Psychological Assessment*, DOI 10.1037/a0024878 [independent].)* *Evidence strength:* an efficient, low-load *g* estimate for a confirmatory second stage. *Evidence limitation:* interpreting its sub-indices as distinct abilities; sole high-stakes use.
    - **DOK 2 — Summary:** Across these batteries, a dominant *g* factor is common, several instruments have stale or compressed high-end norms, and individual administration makes them more suitable for confirmatory assessment than universal screening.
    - **Link to source:** the instrument sources cited above; key independent reviews: [https://doi.org/10.1037/pas0000358](https://doi.org/10.1037/pas0000358) | [https://doi.org/10.1177/1073191115624545](https://doi.org/10.1177/1073191115624545)
- **Subcategory 15.2: Group ability & nonverbal / "culture-reduced" screens (and the culture-fair myth)**
  - **Source:** OLSAT 8; NNAT3; Raven's 2; InView; UNIT-2; Leiter-3; CTONI-2 — with independent reviews; Lohman; Giessman et al.; Carman et al.
    - **Plain-language idea:** these are scalable *group* tests (or language-free individual ones) often adopted as an "equity" fix; the independent evidence says the "culture-fair" promise does not hold.
    - **DOK 1 — Facts:**
      - **OLSAT 8** (group; SAI): verbal + nonverbal clusters → School Ability Index; scalable and CogAT-like, but **Form-8 upper-tail precision and current subgroup evidence aren't independently published**, and its verbal load reintroduces language dependence. *(Pearson, 2003 [COI]; Buros review by Lohman [reverse-COI]; OLSAT/WISC-R predictive-bias study, ERIC ED286883 [OLDER-FORM].)* *Evidence strength:* a proven scalable group format — but obtain the technical manual first.
      - **NNAT3** (group nonverbal; NAI): geometric progressive matrices → Naglieri Ability Index; **reliabilities ~.80–.90 (weakest at K–3; SEM ≈ 5–7 → ±10–13 band)**, and **independent data contradict the culture-fair claim** (ELL ~9.5 NAI points lower; did not identify more underrepresented students than CogAT-Nonverbal). *(NNAT3 manuals, 2018 [COI]; Naglieri & Ford, 2003 [author-COI]; Lohman, Korb & Lakin, 2008; Giessman, Gambrell & Stebbins, 2013, DOI 10.1177/0016986213477190 [independent].)* *Evidence limitation:* unsupported as a universal equity add-on. *Evidence strength:* may serve as a narrow language-reduced alternate route.
      - **Raven's 2** (individual paper or adaptive-digital): nonverbal matrix-reasoning → single derived score; IRT-normed and Flynn-corrected, but **not validated here as a universal gifted screen** and ELL still scored ~7.5 points lower. In the adaptive-digital form, examinees receive different items, so raw totals are not comparable; interpretation requires the derived standard score/percentile/CI. *(Raven, Rust, Chan & Zhou, 2018, Pearson [COI]; McLeod & McCrimmon, 2021, *JPA*, DOI 10.1177/0734282920958220 [independent]; Lohman, Korb & Lakin, 2008.)* *Evidence limitation:* not validated for universal screening without use-specific validation; suited to individual follow-up only.
      - **InView** (group; CSI): five subtests → Verbal/Nonverbal/Total + Cognitive Skills Index; used in some states for gifted ID but with **essentially no independent psychometrics** (all publisher claims). *(DRC/TerraNova [COI]; Ohio DOE approved-test list [verified use].)* *Evidence limitation:* insufficient independent psychometric evidence.
      - **UNIT-2** (individual, 100% nonverbal admin *and* response): six subtests → Full Scale + factors; useful for deaf/ELL/2e follow-up, but independent CFA shows it is **primarily *g*, factor indices lack unique variance, non-invariant across age/gender/race.** *(Bracken & McCallum, PRO-ED [COI]; Benson, Kranzler & Floyd, 2020, *Assessment*, DOI 10.1177/1073191118786584 [independent].)* *Evidence strength:* individual language-free 2e/ELL follow-up (Full-Scale *g* only). *Evidence limitation:* not scalable as a group screen.
      - **Leiter-3** (individual, fully nonverbal): four Cognitive subtests → Nonverbal IQ; reliable global NVIQ for nonverbal/hearing-impaired follow-up, but **no separable fluid vs. visual-spatial indices** and small criterion samples. *(Roid, Miller, Pomplun & Koch, 2013, Stoelting [COI]; Buros/Wiese, 2014 [independent].)* *Evidence strength:* individual nonverbal follow-up only.
      - **CTONI-2** (individual): six nonverbal reasoning subtests → Full-Scale nonverbal IQ; independent evidence shows a **high-end ceiling — items "too low to capture individual differences" in higher-ability examinees.** *(Hammill, Pearson & Wiederholt, 2009, PRO-ED [COI]; Parkin et al., 2018, *JPA*, DOI 10.1177/0734282916688792 [independent].)* *Evidence limitation:* high-end ceiling compression exactly where gifted selection operates.
      - **Cross-cutting (verified):** nonverbal tests are "**neither culture free nor culture fair**" (Lohman, 2005); ELL scored **~0.5–0.67 SD lower** across Raven/CogAT-NV/NNAT (Lohman, Korb & Lakin, 2008); NNAT2 and CogAT-Nonverbal both under-identify underrepresented groups depending on norms/cutoff (Giessman et al., 2013; Carman, Walther & Bartsch, 2018, DOI 10.1177/0016986217752097). **"Switch to a nonverbal test for equity" is not supported by the independent data.**
    - **DOK 2 — Summary:** Directly answers the tempting "just use a culture-fair nonverbal test" move (also raised in Categories 6.2 and 8.4) — the data say it does not deliver the promised equity.
    - **Link to source:** the instrument sources cited above; [https://doi.org/10.1177/0016986213477190](https://doi.org/10.1177/0016986213477190) | [https://doi.org/10.1177/0016986217752097](https://doi.org/10.1177/0016986217752097)
- **Subcategory 15.3: Rating scales, creativity, above-level, and dynamic assessment**
  - **Source:** GRS-2/SRBCSS/GATES-2/HOPE; TTCT; SMPY talent-search; dynamic-assessment literature
    - **Plain-language idea:** non-test signals (teacher/parent ratings, creativity tasks, above-level testing, "test-teach-retest" learning-potential measures) — useful as *supplements*, dangerous as *gates*.
    - **DOK 1 — Facts:**
      - **Teacher/parent rating scales (GRS-2, SRBCSS/Renzulli, GATES-2, HOPE):** structured multi-domain ratings, but they share a **halo / general-factor problem**, carry **teacher-rater variance (10–25%)**, and their validity is largely developer-produced (COI). **HOPE** is the standout — built for low-income/diverse students, no race/income DIF (but gender DIF; income bias in *national* norms → **use local norms**). *(GRS-2, MHS [COI]; Jabůrek et al., 2021, DOI 10.1177/0734282920970718 [halo]; McCoach et al., 2024, DOI 10.1177/00144029241247035 [rater variance]; Peters & Gentry, 2010, DOI 10.1177/0016986210378332 [HOPE].)* *Evidence strength:* structured multi-domain signals + HOPE's correctable equity design — **non-decisional only.** *Evidence limitation:* any rating subscale as a standalone gate; GATES-2 as decisional.
      - **Creativity — TTCT:** timed divergent-thinking test; **predicts *personal* creative achievement (r ≈ .31) far better than *public* achievement (r < .05)**, scoring is subjective/coachable, validity chain proponent-run. *(Kim, 2006, *Creativity Research Journal*, DOI 10.1207/s15326934crj1801_2 [independent review]; Torrance [COI].)* *Evidence limitation:* weak gate validity. *Evidence strength:* non-decisional creative-domain signal only.
      - **Above-level testing (SMPY / talent-search model):** administers *older-grade* off-the-shelf tests to younger students for ceiling headroom — the **strongest longitudinal validity base in gifted ID** (rank-orders even *within* the top 1%). *(Lubinski & Benbow, 2006, DOI 10.1111/j.1745-6916.2006.00019.x; 2021, DOI 10.1177/0016986220925447; some COI.)* *Evidence strength:* above-level testing principle, paired with universal screening/local norms to offset access bias. *(Cross-ref Categories 2 and 10.3.)*
      - **Dynamic assessment (test–teach–retest):** scores learning gain/prompt-dependence rather than a static level; surfaces underserved/2e learners but is examiner-dependent with **no validated GT-admissions use.** *(Kirschenbaum, 1998, DOI 10.1177/001698629804200302; Dumas, McNeish & Greene, 2020, DOI 10.1080/00461520.2020.1744150.)* *Evidence strength:* research/process signal. *Evidence limitation:* not validated as a high-stakes gate (consistent with Category 10.8).
    - **DOK 2 — Summary:** The theme is "supplement, don't gate": these widen the lens for equity and breadth but lack the psychometric standing to be a standalone decision rule.
    - **Link to source:** the instrument sources cited above; [https://doi.org/10.1177/0016986210378332](https://doi.org/10.1177/0016986210378332)
- **Subcategory 15.4: Multi-criteria identification *systems* (the highest-leverage, lowest-COI evidence)**
  - **Source:** NAGC (2019); Peters et al. (2019); Card & Giuliano (2016); McBee, Peters & Waterman (2014); Lakin (2018)
    - **Plain-language idea:** how you *combine* measures and *whom you test* often matters more than which single test you pick — and these are the best-evidenced, least-conflicted levers.
    - **DOK 1 — Facts:**
      - **NAGC 2019 Standard 2:** multiple, technically-defensible, valid-for-purpose, non-biased measures with local norms — a **design checklist, not validity evidence.** *(NAGC, 2019.)*
      - **Local norms:** building-level norms raised Black representation ~238–300% and Hispanic/Latinx ~157–170% vs. national norms (still under-proportional); **preregistered.** *(Peters, Rambo-Hernandez, Makel, Matthews & Plucker, 2019, *AERA Open*, DOI 10.1177/2332858419848446.)* *Evidence strength:* low-cost, evidence-backed equity lever. *(Also in Categories 1.3 and 6.4.)*
      - **Universal screening:** testing all students (vs. referral) sharply raised identification of Black, Hispanic, FRL, and ELL students — an **access** finding. *(Card & Giuliano, 2016, *PNAS*, DOI 10.1073/pnas.1605043113.)* *Evidence strength:* strongest referral-stage equity move in the cited evidence. *(Detailed in Categories 1.5, 3.3, 6.)*
      - **Combination rules:** **MEAN/compensatory** yields the highest composite reliability; the **AND** rule maximizes false negatives; the apparent "**OR** = more diverse" advantage is a **pool-size artifact**. *(McBee, Peters & Waterman, 2014, DOI 10.1177/0016986213513794; Lakin, 2018, *GCQ*, DOI 10.1177/0016986217752099 [GCQ Paper of the Year].)* *Evidence strength:* MEAN/compensatory combination logic. *Evidence limitation:* OR rules do not reliably fix diversity (pool-size artifact). *(Also in Categories 1.3 and 6.4.)*
    - **DOK 2 — Summary:** These *system-level* moves (who is tested, how scores combine, which norms) are the highest-leverage, lowest-COI findings in the whole toolbox — and they connect the measurement half of the tree back to the selection half (Categories 1, 3, 6).
    - **Link to source:** the instrument sources cited above; [https://doi.org/10.1177/2332858419848446](https://doi.org/10.1177/2332858419848446) | [https://doi.org/10.1177/0016986217752099](https://doi.org/10.1177/0016986217752099)
- **Subcategory 15.5: Public-domain task precedents can support independent research, not operational validity**
  - **Source:** Condon & Revelle (2014); child working-memory and spatial-task literature
    - **Plain-language idea:** some task methods and item banks are publicly reusable, which supports independent replication; this does not transfer norms, cut scores, or validity to a new test.
    - **DOK 1 — Facts:**
      - The **International Cognitive Ability Resource (ICAR)** is a public-domain bank with matrix and 3-D rotation tasks; reported reliabilities include about **α=.79** for its matrix set and **α=.93** for 3-D rotation, and the full ICAR correlated about **r=.75 corrected** with Raven's APM. *(Condon & Revelle, 2014, *Intelligence*, 43:52–64.)*
    - **DOK 2 — Summary:** Public-domain tasks lower barriers to replication and early research, but they do not establish that a resulting battery measures giftedness without independent calibration and validation.
    - **Link to source:** [ICAR project](https://icar-project.com/)
