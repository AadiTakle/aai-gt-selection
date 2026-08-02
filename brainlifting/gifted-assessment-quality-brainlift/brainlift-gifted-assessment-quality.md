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
- GT School / Alpha and comparable programs as **case-study context** and company claim statements where relevant.

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
- Elaboration: Each leading test does one thing well and misses what GT needs. CogAT measures verbal, quantitative, and nonverbal reasoning and predicts achievement (7.1, 7.2). However, it's nonadaptive, inprecise at its publisher-controlled cutoff (8.6), and operates its cutoff on a scale GT does not own (Insight 4). NNAT3 and Raven's are nonverbal-only, which carries roughly twice the standard error of a multi-format battery and still leaves 0.5–0.67 SD English-learner gaps (8.4, 15.2), and NNAT3 reuses prior items. MAP is adaptive and high-ceiling (10.1) but was not built as a gifted gate, and its cut-specific precision is unknown. WISC-V and SB5 are individually-administered, high-quality tests, but they're not scalable as a universal screen and have thin gifted-tail validation (15.1). No single off-the-shelf test is all encompassing: adaptive, high-ceiling, spatial-inclusive, scalable, and cut-controllable. Only a custom adaptive screen lets GT concentrate item information at its own cut, add the spatial dimension that fixes CogAT's biggest coverage gap (8.5, 10.7), run a rotating bank with never-reused forms to blunt wealth-linked coaching, which averages about 5 IQ points and is not defeated by "culture-fair" matrices (Scharfen et al., 2018; Bors & Vigneau, 2003), enforce a compensatory rule with DIF at the cut (SPOV 5), and own the auditable decision record. Feasibility beats the multi-year, multi-million-dollar bohemeths with copyright restrictions. An open-source stack (mirt/mirtCAT, Concerto) and calibrated public-domain seed items (ICAR, mental-folding, Corsi, n-back) exist (15.5), and building-level local norms plus a staged pilot of ~100–200 per grade lower entry cost. Building in-house inherits the full validity and legal burden the vendor fee currently absorbs (Larry P.; COPPA/FERPA), calibration still needs thousands of responses, and a great instrument behind a bad cut or rule gains nothing (Insigh 4–5). "Adopt-and-adapt" (CogAT plus one MAP domain plus a compensatory rule and local norms) is the alternative a custom build must beat.

## Experts

### David Lohman (with Korb, Gambrell, Lakin); McBee, Peters, Waterman; Warne
- **Who:** Gifted-identification and psychometric measurement researchers; Lohman co-authored the CogAT.
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

**Insight 1 - Response time is a valid ability assessor only when engagement is verified, speed and accuracy are modeled jointly, and the measured metric is information comprehension rather than raw item time.**
- Raw speed isn't directly interpretable for three reasons. Firstly, disengaged children "rapid-guess," producing fast responses that carry no signal, so effort must be detected and filtered (13.8). Our DOK 2 Knowledge Tree says that response time alone cannot certify engagement (14.1), and catching it at scale requires off-task detection (12.2). Even for a focused child, a fast answer is ambiguous under the speed-accuracy trade-off, becoming a reliable metric only when time and accuracy are *both* taken into account (13.8). In examples where speed does carry ability signals, it lives in information-uptake efficiency rather than raw clock time.
**Insight 2 - Response consistency across similar questions is a broadly applicable indicator of ability at the tails, making it a strong measurement to track for gifted screen tests.**
- One of the most general measurements of cognitive ability is response consistency. The variability in a child's response times to similar difficulty questions is associated with higher measured ability across diverse tasks, ages, and samples (13.9). This method is also able to statistically remove "aberrant responses" to avoid biasing against distractions, boredom/disengagement, and potentiall even students with learning disabilities like ADHD (to be proven) (13.10). At the tail of the scores, fixed form accuracy measurements become worse abilities of measurement as they cluster against a ceiling or common-knowledge boundary (8.1, 9.1). In constrast, continuous signals like consistency provide far more variability between applicants, allowing for more granular distinctions to be made between candidates for scoring and admissions purposes (13.8, 14.1). Of course, this requires the kid to be engaging with the exam content to be an accurate measurement, which is why test design will play a big part in whether this metric performs well in measuring giftedness for the  K-8 target demographic (13.9).
**Insight 3 - Verifying engagement removes noise in reference to accuracy and timing, but it doesn't address bias. Thus, accounting for speed must also clear the same tail and subgroup fairness bar as the score itself.**
- Processing speed is the least general intelligence ability and is deliberately stripped from a g-composite, so speed doesn't mask reasoning (15.1). Timed tasks make speed the construct (7.5), with their motor, device, adn familiarity variance the highest among young children (13.4, 12.6). Because a 1-2% top percentile cutoff sits where biases are prominent, a speed component would need the same measurement invariance and subgroup error checks as the reasoning score (9.7, 9.11) and data validation for its use (11.9) before factoring into admission scores.
**Insight 4 - At GT's operating point, the cutoff score is a bigger error source than the choice of test.**
- The top 1–2% decision is made exactly where a fixed-form test carries the least information (8.1) and where CogAT's own upper-tail precision is publisher-controlled (8.6). Three cut-specific errors compound it, none about which reasoning test is chosen. A standard-setting method is only as good as its recovery of the intended cut, and the gifted cut sits where information is lowest (Reckase, 2006). "IQ 130" is the 98th percentile on an SD-15 scale but roughly the 97th on CogAT's SD-16 scale, so a cutoff is not portable across instruments (Cogn-IQ, 2024), and the 99th-percentile norm rests on very few cases. Percentile ranks jump in large steps the father we stray from the median (Warne, 2012). Regression to the mean then pulls a borderline observed 130 toward a true score near 127 (8.2, 8.7). The highest-leverage design object is therefore not the item set but an auditable cut expressed as a θ-band with a documented standard-setting method, a local-norm reference, and a boundary/retest policy (9.13). The Track B camp counters that the bigger miss is coverage, the spatially gifted a verbal/quant screen never sees (8.5).
**Insight 5 - Adaptivity buys precision, but only the combination rule and pool size account for fairness.**
- A computer-adaptive engine delivers near-equal precision at every ability level (10.1), yet that precision behind the wrong decision architecture recovers almost nothing. A nomination or screening gate placed before testing can only lose students. System sensitivity collapses to roughly 0.28 vs. 0.84 with no gate, about 72% of gifted children missed. A conjunctive "AND" rule across measures caps sensitivity near .53–.76 at the 99th percentile even for near-perfect tests, while a compensatory or mean rule actually gains as measures are added, reaching the high-0.70s to low-0.80s for three to four tests (McBee, Peters & Miller, 2016; McBee, Peters & Waterman, 2014). On real CogAT data, the diversity effect of AND/OR/mean rules came mostly from the size of the tested pool, not the rule label. An "OR" rule does not manufacture diversity without lowering the bar (Lakin, 2018). The single highest-leverage lever against false negatives is universal intake feeding a compensatory aggregation, not a more precise instrument. Measurement realists counter that one-shot instability is the dominant error (8.2).
**Insight 6 - Engagement levers access-and-missingness, not validity, which is why it helps the tail.**
- Gamification's replicated effect is on engagement, participation, and anxiety (13.5, 13.1), and game-familiarity predicts game scores without predicting ability, which is construct-irrelevant variance (12.6). Because tail accuracy is biased by *who is missing* from the data (9.12) and gamified, low-anxiety formats measurably reduce missing data and dropout in young children, engagement improves the tail estimate *indirectly* through completeness, even though it adds nothing to validity per item. A game therefore belongs as an engagement layer on top of a psychometrically validated adaptive engine, with mandatory equal practice and DIF by device and gaming experience (Insights 1–3). Stealth-assessment proponents counter that process data captures extra constructs such as persistence and strategy that justify scoring the play itself.
**Insight 7 - "Scores high," "predicts achievement," and "predicts benefit from GT" are three different claims. The screen only has evidence for the first two.**
- A gifted screen validated against achievement is not validated for who will *benefit* from GT's program. The two are distinct claims, and the benefit slope may be minimal even where the achievement-prediction slope is steep. CogAT-to-achievement validity is moderate (7.2) and predicts later achievement (7.3), but Sackett and colleagues (2022) recently revised cognitive-ability *operational* validity downward (from roughly .51 to .31) after showing the standard range-restriction corrections overcorrected. Even the achievement claim is smaller than usually advertised. Because operational data carry a "truth" label only for the children who were admitted (9.12), a program never sees the counterfactual that would test the benefit claim on its own applicants. The implication is that the exam's output is a *capability/readiness* estimate, never a "will-benefit" prediction. This is the measurement-side half of a bridge whose causal half lives in the counterfactual BrainLift. The SMPY camp counters that ability keeps predicting attainment with no ceiling, even within the top 1%.
**Insight 8 - The per-applicant signals worth recording are the ones that widen the decision, not a single score.**
- To improve the *decision* rather than merely rank children, the exam should give each child an IRT ability estimate with its conditional SEM as a *band*, so borderline cases are flagged rather than forced across a line (9.1, 9.3, Insight 4). A classification-consistency or retest flag for near-cut children, given one-shot instability (8.2) should be taken into account. It should also measure esponse consistency across equal-difficulty items as a tail signal (Insight 2), jointly-modeled response time (Insight 1, SPOV 4), an engagement filter, a compensatory cross-domain aggregate rather than a minimum across segments (Insight 5), and DIF at the cut kept as a standing monitor (9.7). Everything that is *not* capability, including accommodation, device, provenance, and prior gaming exposure, is recorded but kept out of the score. Every added signal multiplies the surfaces for construct-irrelevant variance, so each must clear incremental validity (9.6) and DIF (9.7) before it is allowed to move a decision.

## DOK 2: Knowledge Tree

### Overall Summary

CogAT-class measures capture developed verbal, quantitative, and nonverbal reasoning and have meaningful predictive validity, but a single, fixed cut is a weak proxy for a stable, complete gifted evaluation and selection. This brainlift demonstrates tail error, rank instability, false negatives created by gates and combination rules, missed spatial talent, and unequal access. It also shows that a universal, multi-stage screen can improve identification without abandoning a capability standard. Any improvement claim must be tied to a defined and proven metric—conditional like SEM/reliability, relative efficiency at the cut, false-negative rate, classification consistency, PR-AUC/precision@k, and subgroup DTF/error rates, not a vague claim of “2x validity.” Those metrics are still invalid if the two stages lack a common calibration/comparison design or if "true gifted" labels are observed only for children the old screen selected.

The available technical remedies differ in risk and real-world testing. CAT/MST, above-level testing, repeated measurement, compensatory decision rules, spatial breadth, and DIF/DTF monitoring have plausible roles, but a CAT's real tail quality depends on its bank depth, estimator, exposure control, stopping rule, calibration uncertainty, and age-appropriate standardized delivery. Child game-assessment studies now show low-to-medium convergence with traditional tests; they still do not validate high-stakes K–8 gifted identification. Engagement can reduce burden or anxiety but is not validity, while gaming familiarity, device/motor access, rewards, interface load, and task misunderstanding can themselves become construct-irrelevant variance.

### Category 7: What Cognitive-Ability Tests Like CogAT Actually Measure

- **Subcategory 7.1: CogAT measures developed reasoning in three domains — it is not "just verbal/math"**
  - **Source:** Riverside Insights CogAT test descriptions
    - **DOK 1 — Facts:**
      - The CogAT Complete Battery contains a **Verbal** battery (analogies, sentence completion, classification), a **Quantitative** battery (number analogies/puzzles/series), and a **Nonverbal/Figural** battery (figure matrices, **Paper Folding**, figure classification).
    - **DOK 2 — Summary:** Establishes the construct CogAT actually samples; the "what it misses" case (Category 8) is about *degree and tail precision*, not a claim that CogAT measures nothing spatial.
    - **Link to source:** [Riverside Insights CogAT Test Descriptions](https://info.riversideinsights.com/datamanager-onlinehelp/cogat-test-descriptions?hsLang=en-us)
- **Subcategory 7.2: CogAT predicts achievement moderately-to-strongly**
  - **Source:** Ozen, Pereira, Karatas, Castillo-Hermosilla & Maeda (online 2024; print 2025)
    - **DOK 1 — Facts:**
      - "Predictive validity" is how well a test's scores forecast a later outcome (here, school achievement); it is reported as a correlation *r* from 0 (no relationship) to 1 (perfect).
      - A meta-analysis reports a mean CogAT to achievement validity of **r = .63, 95% CI [.57, .69]**. **Conflict of Interest:** the meta-analysis itself flags author-of-test effects on reported validity.*
    - **DOK 2 — Summary:** A solid but not overwhelming correlation so CogAT is a good-not-perfect proxy for the achievement it is used to forecast. Very important to note that **this analysis does not mention what age/grade range the CogAT's validity rating is applicable/tested on**, so universal applicability cannot be assumed for K-8. Also the COI potentially degrades this source's integrity.
    - **Link to source:** [https://doi.org/10.1177/00169862241285593](https://doi.org/10.1177/00169862241285593)
- **Subcategory 7.3: Cognitive ability is a strong *early* predictor of later achievement**
  - **Source:** Deary, Strand, Smith & Fernandes (2007)
    - **DOK 1 — Facts:**
      - In >70,000 English children, a cognitive test at age 11 correlated **r ≈ .69 (observed) / .81 (latent)** with national exams at 16.
    - **DOK 2 — Summary:** A very large study testing whether one ability test in childhood forecasts exam results years later. This is the strongest single-number case *for* ability screening (it recurs as the steelman in Categories 1.5 and 4.4); any argument to broaden the screen must contend with it rather than wish it away.
    - **Link to source:** [https://doi.org/10.1016/j.intell.2006.02.001](https://doi.org/10.1016/j.intell.2006.02.001)
- **Subcategory 7.4: CogAT changes its administration for young children**
  - **Source:** Riverside CogAT Form 7 short guide; EBSCO CogAT overview
    - **DOK 1 — Facts:**
      - CogAT spans ten levels across K–12. Its K–2 Primary Edition is **teacher-paced and orally administered**, and its verbal tasks use pictures so reading is not required; the multilevel edition shifts to text-based verbal items. The full battery is a multi-session **power test** with generous limits rather than a pure speed test.
    - **DOK 2 — Summary:** A K–2 child should not be failed because they cannot yet read the instructions or operate an adult-style test. CogAT itself changes format by age to reduce those extra demands. Developmentally appropriate delivery is part of measurement validity, not cosmetic UX; it reduces reading and instruction-following as construct-irrelevant barriers.
    - **Link to source:** [Riverside Form 7 short guide](https://www.aacs.org/wp-content/uploads/2012/10/CogAT-A-Short-Guide-for-Teachers.pdf) | [EBSCO CogAT overview](https://www.ebsco.com/research-starters/health-and-medicine/cognitive-abilities-test-cogat)
- **Subcategory 7.5: Reputable batteries measure different constructs with different task mechanics**
  - **Source:** WISC-V/WPPSI-IV, WJ-IV, SB5, and NIH Toolbox administration materials
    - **DOK 1 — Facts:**
      - **Fluid reasoning** is commonly measured with incomplete visual matrices (choose the missing piece); preschool versions use fewer choices and pointing responses. **Quantitative reasoning** uses number series/matrices or balance-scale "Figure Weights," rather than routine arithmetic. **Spatial ability** uses mental rotation/folding or block-pattern construction. **Working memory** uses increasing spans and reordering tasks (Digit/Picture Span, Corsi, List Sorting). **Processing speed** uses deliberately easy matching/search tasks under strict time limits because speed—not reasoning depth—is the construct.
      - WISC-V keeps its reasoning tasks as power measures while strictly timing processing-speed tasks; mixing those mechanics would turn a reasoning score into a motor/reading-speed score.
    - **DOK 2 — Summary:** "A cognitive test" is not one generic question type. Each target ability needs a task whose rules isolate that ability rather than reading, schooling, memory, motor speed, or device skill. This is the concrete "HOW" layer missing from a construct-only discussion. Reusing a task format is not the same as reusing copyrighted items or transferring the original test's validity.
    - **Link to source:** [WISC-V](https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-&-Neuro/Wechsler-Intelligence-Scale-for-Children-|-Fifth-Edition-/p/100000771) | [NIH Toolbox Cognition](https://nihtoolbox.org/domain/cognition/)



### Category 8: What These Tests Miss — Especially at the Gifted "Tail"

- **Subcategory 8.1: Fixed-form tests are *least* precise exactly where the gifted decision is made**
  - **Source:** Baker (2001); Lord (1980)
    - **DOK 1 — Facts:**
      - Every score carries an error bar, and its width changes depending on where the child scores: it is narrowest where the test has the most questions of about that difficulty, which is the middle of the range.
      - In the standard scoring math — item response theory, which places children and questions on one shared difficulty scale — that error bar equals `1 ÷ √information`, and "information" peaks where the questions cluster. Where questions are sparse, information collapses and the error bar balloons.
    - **DOK 2 — Summary:** A test measures the middle of the ability range best and the extremes worst, which is the opposite of what a top-1% cutoff needs. This is the mathematical reason a single fixed-form cut is weakest exactly at the gifted threshold, and it is the seed of the "adaptive testing can do 2× better *at the tail*" argument (Categories 10–11).
    - **Link to source:** [https://files.eric.ed.gov/fulltext/ED458219.pdf](https://files.eric.ed.gov/fulltext/ED458219.pdf)
- **Subcategory 8.2: A one-shot score is a moving target**
  - **Source:** Lohman & Korb (2006); Warne (2012)
    - **DOK 1 — Facts:**
      - "Regression to the mean" is the tendency of an unusually high or low score to land closer to average the next time it is measured, because part of any extreme score reflects a good or bad day rather than lasting ability.
      - "Approximately half of the students who score in the top 3% … in 1 year will not fall in the top 3% … in the next year," and only **~35–40% remain top-3% from grade 3 to grade 8** (roughly 60–65% fall out over that interval). This is regression to the mean plus real developmental change, not merely measurement error.
    - **DOK 2 — Summary:** Because a top score partly reflects a good day, many top scorers drop out of the top tier on a later test without having actually changed. A screen applied once, at entry, locks in a snapshot that a large fraction of eventual high achievers would fail *at that moment* even though they would clear it later.
    - **Link to source:** [https://files.eric.ed.gov/fulltext/EJ746292.pdf](https://files.eric.ed.gov/fulltext/EJ746292.pdf) | [https://doi.org/10.1080/02783193.2012.686425](https://doi.org/10.1080/02783193.2012.686425)
- **Subcategory 8.3: One test barely reproduces another's "top" list**
  - **Source:** Lohman (2005)
    - **DOK 1 — Facts:**
      - Of students in the top 3% on an achievement measure, the CogAT Composite captured only **~32%** of the top readers, and the CogAT Nonverbal battery only **~18%**.
    - **DOK 2 — Summary:** Even two tests that correlate highly disagree sharply about *who* sits in the top few percent, so "the gifted kids" really means "the kids this particular test ranked highly." This is the measurement fact; its selection consequence — that a single screen misses most of the strongest children — is developed in the companion counterfactual BrainLift.
    - **Link to source:** [https://doi.org/10.1177/001698620504900203](https://doi.org/10.1177/001698620504900203)
- **Subcategory 8.4: "Culture-fair" nonverbal tests do not erase opportunity gaps**
  - **Source:** Lohman, Korb & Lakin (2008)
    - **DOK 1 — Facts:**
      - A "standard deviation" is the typical spread of scores across the whole population, so a gap of half a standard deviation is a large gap, not a rounding difference.
      - English-language learners scored **0.5–0.67 standard deviations lower** on Raven's, the NNAT, and CogAT-Nonverbal — all three of which use pictures and shapes rather than words.
    - **DOK 2 — Summary:** Switching to a picture- or shape-based "nonverbal" test is often sold as an equity fix, but the independent data show it still leaves large gaps for children still learning English. The full instrument-by-instrument version of this argument is in Category 15.2.
    - **Link to source:** [https://doi.org/10.1177/0016986208321808](https://doi.org/10.1177/0016986208321808)
- **Subcategory 8.5: Spatial talent is systematically under-selected**
  - **Source:** Wai, Lubinski & Benbow (2009)
    - **DOK 1 — Facts:**
      - "Spatial ability" is the capacity to picture, rotate, and fold objects in your head — the reasoning behind engineering, architecture, surgery, and design.
      - **70% of the top 1% in spatial ability did not make the top-1% cut on either the math or the verbal composite**, measured on a large stratified sample plus Project TALENT (~400,000 students, followed 11 years). Spatial ability adds only about 4% of extra explained variance on average, but at the tail that translates into a large absolute number of children. **Conflict of Interest:** the authors are spatial-ability proponents, partly offset by the independent Project TALENT data.
    - **DOK 2 — Summary:** Spatial ability predicts success in science and engineering yet is barely used in selection, so a verbal/math cutoff is blind to an entire class of talent. The remedy — an already-validated spatial battery — is in Category 10.7.
    - **Link to source:** [https://doi.org/10.1037/a0016127](https://doi.org/10.1037/a0016127)
- **Subcategory 8.6: CogAT's precision at the very top is publisher-controlled and cannot be checked independently**
  - **Source:** Riverside Insights CogAT 7/8 norms and evidence guides
    - **DOK 1 — Facts:**
      - Riverside's public CogAT 7/8 norms guide provides score-conversion tables, but the tables needed to audit precision at the gifted tail — the error bar at each ability level, or the information function behind it — were not found in the public materials reviewed, so the claim remains **unverified**.
    - **DOK 2 — Summary:** We cannot independently confirm how precise CogAT is at the very top, because the necessary technical tables are proprietary. This is a material evidence gap: several tail claims in this tree cannot be pinned to CogAT's *current* form without them.
    - **Link to source:** [CogAT 7/8 Norms & Score Conversions Guide](https://onlinehelp.riversideinsights.com/Help/Elevate/assets/docs/CogAT_78_COMP_NandSC_Guide_091820.pdf) | [Research-Based Evidence Supporting CogAT Use Cases](https://riversideinsights.com/hubfs/CitC/Evidence_supporting_CogAT_use_claims.pdf?hsLang=en)
- **Subcategory 8.7: A hard cutoff misclassifies boundary cases *asymmetrically***
  - **Source:** AERA/APA/NCME (2014) Standards 2.14–2.16; Lohman & Korb (2006)
    - **DOK 1 — Facts:**
      - A score is a confidence band rather than a point; best practice reports a 95% band, which is roughly the score plus or minus two error bars.
      - At a high cutoff, regression to the mean pulls true scores *below* the threshold, so a child scoring exactly at the line is more likely to be a false positive, while a truly gifted child is easily pushed just under it. Reliability is **lowest in young children**, which is exactly when screening happens.
    - **DOK 2 — Summary:** A score is a fuzzy band, not a line, and the errors on either side of a high cut are not symmetric. This turns "the cutoff is arbitrary" from rhetoric into measurement theory; the decision-level version — how often the pass/fail call is actually right — is in Category 9.3.
    - **Link to source:** [AERA/APA/NCME (2014), *Standards for Educational and Psychological Testing*](https://www.testingstandards.net/)
- **Subcategory 8.8: A single test *plus referral* tracks family and social advantage, not just ability**
  - **Source:** Grissom & Redding (2016)
    - **DOK 1 — Facts:**
      - At equal measured achievement, Black students are less likely to be identified as gifted; high-achieving Black students were only about one-third as likely to be identified when taught by a non-Black teacher.
    - **DOK 2 — Summary:** Who gets *referred* for testing is itself biased, so the pipeline encodes advantage before the test is ever scored. "The test" is never used alone, and the referral stage is part of the instrument's real-world behavior.
    - **Link to source:** [https://doi.org/10.1177/2332858415622175](https://doi.org/10.1177/2332858415622175)
- **Subcategory 8.9: Test scores rise steadily with family income**
  - **Source:** College Board (2023)
    - **DOK 1 — Facts:**
      - On the SAT, the mean total climbed from **891 for students in the lowest-income fifth of neighborhoods to 1148 for the highest** — a 257-point gap — and the share meeting both college-readiness benchmarks rose from 15% to 63%.
    - **DOK 2 — Summary:** The higher a family's income, the higher the average score, so a score cutoff partly sorts on money. The SAT is an achievement test rather than an ability screen, so this is included as an illustration of the pattern rather than as direct evidence about CogAT.
    - **Link to source:** [College Board (2023), Total Group SAT Suite Annual Report](https://reports.collegeboard.org/media/pdf/2023-total-group-sat-suite-of-assessments-annual-report%20ADA.pdf)



### Category 9: How to Measure a Test's Quality *at the Tail* — the Metrics That Answer "How Well Does It Capture Gifted Kids by Score?"

- **Subcategory 9.1: Precision depends on where a child scores, not on one reliability number**
  - **Source:** Baker (2001); Embretson & Reise (2000); Green, Bock, Humphreys, Linn & Reckase (1984)
    - **DOK 1 — Facts:**
      - "Reliability" is normally reported as one number for the whole test, averaged over everyone who took it. That average can look excellent while the test is weak at the top, because most test-takers sit in the middle.
      - The **test information function** reports precision separately at each ability level, where the error bar at that level equals `1 ÷ √information`. A test can be sharp mid-range and blurry at the top.
      - Restricting that error average to children at or above the actual cutoff produces a tail-focused version of reliability. This is a **reasoned extension** of the published definition, not something the source states directly. On the standard ability scale, reliability at a given level equals `information ÷ (information + 1)`, so information of 9 and 19 corresponds to about .90 and .95 at that level.
    - **DOK 2 — Summary:** The right question is not "how reliable is the test?" but "how precise is it *at the score that decides admission*?" The error bar measured at the cut is the honest replacement for a single reliability coefficient, and it is the organizing metric for this whole category.
    - **Link to source:** [https://files.eric.ed.gov/fulltext/ED458219.pdf](https://files.eric.ed.gov/fulltext/ED458219.pdf)
- **Subcategory 9.2: Profile and difference scores are noisier than the scores they come from**
  - **Source:** Lord & Novick (1968); Trafimow (2015)
    - **DOK 1 — Facts:**
      - A "difference score" is what you get by subtracting one score from another — spatial minus verbal, for instance — to describe a child's tilt toward one ability.
      - For two equally variable measures, the reliability of their difference is `(r_XX + r_YY − 2r_XY) ÷ (2 − 2r_XY)`. Subtracting two highly correlated scores strips out most of what they genuinely share while keeping both scores' errors, so a "spatial minus verbal" tilt can be far less reliable than either score alone.
    - **DOK 2 — Summary:** A "he's more spatial than verbal" tilt is less trustworthy than either underlying score, so any decision built on a profile shape carries extra error. This is a caution for any profile-based gifted rule, and for the multi-ability models in Category 10.6.
    - **Link to source:** [https://doi.org/10.1080/23311835.2015.1064626](https://doi.org/10.1080/23311835.2015.1064626)
- **Subcategory 9.3: Accuracy and consistency of the *decision* are what matter, not of the score**
  - **Source:** Livingston & Lewis (1995); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - From a single test form you can estimate two things: the percentage of children whose pass/fail call is correct (**accuracy**), and the percentage who would receive the same call on an equivalent second form (**consistency**).
      - The professional testing standards tie classification error directly to the width of the error bar near the cutoff.
    - **DOK 2 — Summary:** What a gifted program cares about is not the score but the decision: how often the pass/fail call is right, and how often the same child would get the same call on a parallel form. These are the metrics any "half as many misclassifications at the cut" claim would have to use (Category 11.5).
    - **Link to source:** [https://doi.org/10.1111/j.1745-3984.1995.tb00462.x](https://doi.org/10.1111/j.1745-3984.1995.tb00462.x)
- **Subcategory 9.4: How rare giftedness is dominates how well the test performs**
  - **Source:** Meehl & Rosen (1955)
    - **DOK 1 — Facts:**
      - "Sensitivity" is the share of truly gifted children a test catches; "specificity" is the share of non-gifted children it correctly passes over; the "false-negative rate" is the share of gifted children it misses.
      - A "base rate" is how common the thing you are looking for actually is. Because giftedness is rare, the chance that a child who clears the cut really is gifted — the **positive predictive value** — is fragile: even an accurate test produces many wrong calls near a stringent cut.
    - **DOK 2 — Summary:** Because "gifted" is rare, even a good test produces a lot of wrong calls near the cut. This is the counterintuitive but decisive statistical reason a stringent cut with high specificity still misses many able children, and why a "2×" claim must be stated at the cut (Category 11).
    - **Link to source:** [https://doi.org/10.1037/h0048070](https://doi.org/10.1037/h0048070)
- **Subcategory 9.5: One curve summarizes the trade-off between catching and over-flagging**
  - **Source:** Hanley & McNeil (1982)
    - **DOK 1 — Facts:**
      - An **ROC curve** plots, for every possible cutoff, how many truly gifted children the test catches against how many non-gifted children it wrongly flags. The **area under that curve** condenses the whole picture into a single number, where .50 means no better than a coin flip and 1.0 means perfect separation.
    - **DOK 2 — Summary:** A convenient single number for comparing instruments, but it is a whole-range summary. For a top-1% decision, the tail portion of the curve matters far more than the overall area.
    - **Link to source:** [https://doi.org/10.1148/radiology.143.1.7063747](https://doi.org/10.1148/radiology.143.1.7063747)
- **Subcategory 9.6: A second measure has to add prediction, not just correlate**
  - **Source:** Hunsley & Meyer (2003)
    - **DOK 1 — Facts:**
      - "Incremental validity" asks whether a second measure predicts the outcome *beyond* what the first measure already predicts.
      - A second measure must add predictive information on top of the first, not merely correlate with the outcome on its own.
    - **DOK 2 — Summary:** Adding a new test — a spatial battery, a motivation measure — is only worth it if it improves prediction over CogAT, not if it simply points at the same thing twice. This is the formal test any "multiple measures" expansion must pass.
    - **Link to source:** [https://doi.org/10.1037/1040-3590.15.4.446](https://doi.org/10.1037/1040-3590.15.4.446)
- **Subcategory 9.7: Fairness is measurable at the level of individual questions**
  - **Source:** Meredith (1993); Holland & Wainer (1993)
    - **DOK 1 — Facts:**
      - **Differential item functioning** is the statistical check for whether a specific question is harder for one group than another *among children of equal ability*. **Measurement invariance** asks the same question of the whole test rather than one item.
      - Real audits pair statistical significance with effect size. The Educational Testing Service's long-standing convention flags an item **A** (negligible) below 1.0, **B** (moderate) from 1.0 to 1.5, and **C** (large) at 1.5 or above when the result is also significant. A regression-based version can additionally catch items where the gap widens or narrows with ability, using effect-size bands of below .035, .035–.070, and .070 or above. These are review conventions, not universal laws.
    - **DOK 2 — Summary:** You can directly test whether a question behaves differently for one group at equal ability, which makes bias a measurable property rather than an accusation. This is the measurement-side fairness tool, distinct from equity data about who ends up admitted, and a new test would have to clear this bar.
    - **Link to source:** [https://doi.org/10.1007/BF02294825](https://doi.org/10.1007/BF02294825)
- **Subcategory 9.8: The rulebook — the *Standards for Educational and Psychological Testing***
  - **Source:** AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - Everything above is governed by the *Standards for Educational and Psychological Testing*, the joint manual issued by the three main professional bodies in American educational measurement.
    - **DOK 2 — Summary:** This is the profession's governing manual for what counts as a valid, fair, and defensible test — the authority every other metric here answers to, and the neutral rulebook cited throughout this tree.
    - **Link to source:** [AERA/APA/NCME (2014), *Standards for Educational and Psychological Testing*](https://www.testingstandards.net/)
- **Subcategory 9.9: Some quality numbers have hard ceilings, so they cannot be doubled**
  - **Source:** Spearman (1904); Lord & Novick (1968)
    - **DOK 1 — Facts:**
      - Reliability cannot exceed 1.0, and good tests already sit in the .90s.
      - A measured validity correlation cannot exceed the square root of the two reliabilities multiplied together (`√(r_xx · r_yy)`), because a test cannot predict an outcome more accurately than either side is measured.
    - **DOK 2 — Summary:** You literally cannot double a number that is already capped and nearly maxed out, which disciplines the "2× better than CogAT" goal. A defensible doubling claim has to live on uncapped, tail-specific measures such as information at the cut or the false-negative rate — see Category 11.
    - **Link to source:** [https://doi.org/10.2307/1412159](https://doi.org/10.2307/1412159)
- **Subcategory 9.10: When the target is rare and seats are limited, judge the top of the ranking**
  - **Source:** Saito & Rehmsmeier (2015); Manning, Raghavan & Schütze (2008)
    - **DOK 1 — Facts:**
      - A **precision–recall curve** asks a different question from the ROC curve: of the children the test flags, what share are truly gifted? For a random classifier, the area under this curve equals how common giftedness actually is, whereas the ROC baseline stays at .50 no matter how rare the target. Precision–recall curves therefore expose weak performance that ROC curves can make look strong when giftedness is rare.
      - **Precision at k** is the proportion of truly gifted children among the top *k* ranked applicants; **recall at k** is the share of all gifted children captured in that same top *k*. When the number of seats is known, these describe the fixed-seat decision directly and do not change if scores are rescaled. GT's actual seat count remains an open fact, so this is a candidate metric rather than an allocation decision.
    - **DOK 2 — Summary:** ROC-based numbers average across cutoffs GT will never use. When only 1–2% of children are the target, or only a fixed number of seats exists, the useful question is whether the top of the ranking contains the right children. Pair these with sensitivity, specificity, and precision at the cut; none of them solves the problem of not having a trustworthy outcome to check against.
    - **Link to source:** [https://doi.org/10.1371/journal.pone.0118432](https://doi.org/10.1371/journal.pone.0118432)
- **Subcategory 9.11: "The test is fair" is three separate claims, and they can conflict**
  - **Source:** Raju, van der Linden & Fleer (1995); Millsap (1997); Kleinberg, Mullainathan & Raghavan (2017)
    - **DOK 1 — Facts:**
      - Item-level bias can accumulate into a shift in the *total* score at equal ability, or it can cancel out. Several biased items pointing in opposite directions cancel; several pointing the same way can move the cutoff materially.
      - Millsap (1997) proves that, under realistic conditions, a test cannot simultaneously satisfy strict item-level fairness and strict fairness of prediction. Passing an item-bias audit therefore does not prove equal prediction, and vice versa.
      - Being equally well calibrated within each group, having equal false-positive rates, and having equal false-negative rates cannot all hold at once unless prediction is perfect or the groups are equally likely to be gifted to begin with.
    - **DOK 2 — Summary:** Items can be unbiased while predictions still differ, biased items can cancel inside a total score, and subgroup admission rates raise a third question again. Report item bias, prediction bias, and admitted-group representation separately — including false-negative rates by subgroup near the cut — and treat the choice of fairness criterion as an explicit policy judgment rather than a statistical one.
    - **Link to source:** [https://doi.org/10.1177/014662169501900405](https://doi.org/10.1177/014662169501900405) | [https://doi.org/10.1037/1082-989X.2.3.248](https://doi.org/10.1037/1082-989X.2.3.248)
- **Subcategory 9.12: Accuracy figures break when only admitted children are ever checked**
  - **Source:** Begg & Greenes (1983); Ransohoff & Feinstein (1978); Rubin (1976)
    - **DOK 1 — Facts:**
      - **Verification bias** occurs when only some children receive the definitive follow-up evaluation and who receives it depends on the screening result itself.
      - **Spectrum bias** means a test's hit rate and false-alarm rate change with the mix of children it sees. A test validated on clearly gifted versus clearly average children looks much better than it performs among borderline applicants.
      - Standard corrections for missing data give a single answer only under assumptions such as the data being missing at random. Whether the missingness depends on the very thing that was never observed cannot be established from the observed data alone.
    - **DOK 2 — Summary:** If only children who already scored high receive a full evaluation or a later outcome label, the test is being graded mostly on cases it selected itself, and that circular sample distorts its apparent accuracy. A small representative audit sample that includes screened-out children is the cleanest fix; otherwise report a range rather than a falsely precise number.
    - **Link to source:** [https://doi.org/10.2307/2530820](https://doi.org/10.2307/2530820) | [https://doi.org/10.1093/biomet/63.3.581](https://doi.org/10.1093/biomet/63.3.581)
- **Subcategory 9.13: The cutoff itself needs evidence, separately from the test**
  - **Source:** Kane (1994); Brennan & Lockwood (1980); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - "Standard setting" is the formal process of deciding where a cutoff goes. No statistical law uniquely produces "the gifted cutoff"; it is a judgment made by a panel following a documented method.
      - Kane's framework grades a cutoff on three kinds of evidence: **procedural** (a documented method and a qualified panel), **internal** (whether the same process reproduces the same line, and how much error it carries), and **external** (whether it agrees with independent measures).
      - The cutoff's uncertainty includes both disagreement among the panel and the test's own error. Decision accuracy and consistency must be reported for the specific cutoff in use, especially where thin data at the top make percentile steps coarse.
    - **DOK 2 — Summary:** Even with a good test, the line is a policy decision carrying its own rater, method, and measurement uncertainty. A confidence band around a child's score does not by itself validate the policy line: the score, the cutoff, and the decision rule each need their own evidence.
    - **Link to source:** [https://doi.org/10.3102/00346543064003425](https://doi.org/10.3102/00346543064003425)



### Category 10: How the Gaps *Can Be Patched* — Methods and Their Maturity

- **Subcategory 10.1: Adaptive testing — *mature***
  - **Source:** Weiss (1982); Weiss & Kingsbury (1984); Thompson & Weiss (2011); van der Linden & Glas (2010); Wainer et al. (2000)
    - **DOK 1 — Facts:**
      - A **computer-adaptive test** chooses each next question based on how the child has answered so far, so it spends its questions where they reveal the most instead of giving everyone the same fixed set.
      - Live testing data showed adaptive tests needed **half the questions for equal reliability and about one-third for equal validity**, produced **"measurements of equal precision at all trait levels,"** and gave **more accurate classification** than fixed forms. **Conflict of Interest:** Weiss is a principal in a commercial adaptive-testing company.
      - Adaptive testing requires a **large bank of questions whose difficulty has already been measured**, plus controls that stop the same questions being over-used and leaking.
    - **DOK 2 — Summary:** Because it can concentrate questions at the very top, adaptive testing attacks the tail-imprecision problem of Category 8.1 head-on. It is the single most important patch here and the concrete mechanism behind a defensible "better at the tail" claim (Category 11.6), though its efficiency numbers come from a vendor source and should be read with that conflict of interest in mind.
    - **Link to source:** [https://doi.org/10.1177/014662168200600408](https://doi.org/10.1177/014662168200600408) | [https://doi.org/10.7275/wqzt-9427](https://doi.org/10.7275/wqzt-9427)
- **Subcategory 10.2: Multistage testing — *mature***
  - **Source:** Yan, von Davier & Lewis (2014)
    - **DOK 1 — Facts:**
      - A **multistage test** is a modular cousin of adaptive testing: it adapts in blocks of questions rather than after every single question.
      - Block-based adaptivity keeps most of the precision of full adaptive testing while letting children review their answers and making question over-exposure easier to control.
    - **DOK 2 — Summary:** A practical middle ground for a young-child gifted screen, where re-deciding after every single question is operationally hard.
    - **Link to source:** [Yan, von Davier & Lewis (2014), *Computerized Multistage Testing*](https://doi.org/10.1201/b16858)
- **Subcategory 10.3: Above-level testing — *established practice, but flagged***
  - **Source:** Assouline & Lupkowski-Shoplik (2012); Warne (2014)
    - **DOK 1 — Facts:**
      - "Above-level testing" means giving a child questions written for an older grade, so the test has headroom and their true level can show.
      - Older-level questions raise the ceiling so gifted growth becomes visible, and the talent-search model is fundamentally above-level.
      - **But** the practice "has not been subject to careful psychometric scrutiny," in the words of one of its own reviewers.
    - **DOK 2 — Summary:** A strong track record for identification, but the technical validation behind it is thinner than its popularity implies.
    - **Link to source:** [https://doi.org/10.1177/0734282911433946](https://doi.org/10.1177/0734282911433946) | [https://doi.org/10.1177/0016986213513793](https://doi.org/10.1177/0016986213513793)
- **Subcategory 10.4: A high ceiling captures real tail variation that a grade-level ceiling flattens**
  - **Source:** Kell, Lubinski & Benbow (2013); Lubinski (2016)
    - **DOK 1 — Facts:**
      - A test's "ceiling" is the highest score it can register. When many children hit it, the real differences among them vanish into a single number.
      - Youth identified before age 13 as top-1-in-10,000 on an above-level SAT reached striking outcomes by age 38 — **44% earned doctorates**, against roughly 2% of the general population — and accomplishment keeps climbing *within* the top 1%.
    - **DOK 2 — Summary:** Differences inside the top 1% are real and predictive, so a test that tops out is discarding meaningful signal. This is the evidentiary case for building in a high ceiling.
    - **Link to source:** [https://doi.org/10.1177/0956797612457784](https://doi.org/10.1177/0956797612457784)
- **Subcategory 10.5: Putting grades on one yardstick — *necessary but assumption-laden***
  - **Source:** Tong & Kolen (2007)
    - **DOK 1 — Facts:**
      - "Vertical scaling" places different grade levels on one common yardstick, which is what you need in order to track growth across years.
      - The choice of scaling method changes the apparent growth pattern of high scorers.
    - **DOK 2 — Summary:** Putting grades on one ruler involves modeling choices that can themselves change how much growth high scorers appear to make. That is a hidden degree of freedom behind any growth claim, and it matters directly for the MAP-growth question in Category 11.7.
    - **Link to source:** [https://doi.org/10.1080/08957340701301207](https://doi.org/10.1080/08957340701301207)
- **Subcategory 10.6: Models that score several abilities at once — *mature theory, with pitfalls***
  - **Source:** Reckase (2009); Rupp, Templin & Henson (2010)
    - **DOK 1 — Facts:**
      - Multidimensional models score **several abilities at once** as a profile, rather than collapsing everything into one number.
      - These models, and the related diagnostic classification models, are mature theory for profiles, with documented pitfalls that the authors themselves flag.
    - **DOK 2 — Summary:** This is the technical basis for a gifted profile that reports spatial, verbal, and quantitative ability separately. But the extra noise in difference scores (9.2) caps how far such a profile can be trusted for an individual decision.
    - **Link to source:** [https://doi.org/10.1007/978-0-387-89976-3](https://doi.org/10.1007/978-0-387-89976-3)
- **Subcategory 10.7: A spatial patch already exists**
  - **Source:** Stumpf, Mills, Brody & Baxley (2013)
    - **DOK 1 — Facts:**
      - The Center for Talented Youth built a **Spatial Test Battery** specifically to supplement math and verbal talent searches. **Conflict of Interest:** the authors are its developers.
    - **DOK 2 — Summary:** Spatial measurement does not have to be invented from scratch — a validated battery already exists. It is the concrete remedy for the spatial gap in Category 8.5, and it is an add-on rather than a reason to rebuild CogAT.
    - **Link to source:** [https://doi.org/10.1080/02783193.2013.829548](https://doi.org/10.1080/02783193.2013.829548)
- **Subcategory 10.8: Measuring how fast a child learns — *promising, unproven for this use***
  - **Source:** Sternberg & Grigorenko (2002)
    - **DOK 1 — Facts:**
      - "Dynamic assessment" tests how quickly a child *learns* when taught, rather than what they already know, aiming at potential rather than prior advantage.
      - **No meta-analysis establishing that it predicts anything useful for K–8 gifted identification specifically was located.**
    - **DOK 2 — Summary:** Conceptually attractive for equity, but not validated as a gate — treat it as a research signal rather than a decision rule.
    - **Link to source:** [Sternberg & Grigorenko, *Dynamic Testing*](https://books.google.com/books/about/Dynamic_Testing.html?id=pj9kQgAACAAJ)
- **Subcategory 10.9: Scoring how a child plays rather than what they answer — *emerging, limited evidence***
  - **Source:** Shute & Ventura (2013); Shute & Moore
    - **DOK 1 — Facts:**
      - "Stealth assessment" embeds the measurement inside a game or task and scores *how* the child plays, not just the final answer.
      - The promise is capturing skills that are hard to test directly. The measured overlap with established tests was **modest — correlations of about 0.22 to 0.41** — on small samples, and every one of those studies was run by proponents of the method. **Conflict of Interest:** the researchers originated the approach.
    - **DOK 2 — Summary:** Included here as a candidate patch. Its promise, its evidence ceiling, and the fairness threats it introduces are examined in depth in Category 12.
    - **Link to source:** [Shute & Ventura (2013), *Stealth Assessment*](https://doi.org/10.7551/mitpress/9589.001.0001)
- **Subcategory 10.10: An adaptive test's real tail precision depends on the whole operating system**
  - **Source:** Reckase (2010); Belov & Armstrong (2005); Warm (1989); Bock & Mislevy (1982); Stocking & Lewis (1998); Eggen & Straetmans (2000)
    - **DOK 1 — Facts:**
      - A **bank audit** must check both the total information available and the number of usable, highly informative questions near the actual cutoff. Exposure and content rules mean the pool's headline information is only a ceiling, not what gets delivered.
      - Scoring at the extremes is directional. The simplest estimator pushes extreme scores further out and breaks down entirely for a child who answers everything correctly, which creates false positives. Estimators that blend in a prior expectation pull extreme scores inward instead, which creates false negatives. A third option removes most of the outward bias while still producing a usable number.
      - For a pass/fail decision, an adaptive test can keep going while the child's confidence band still straddles the cutoff and stop once the band sits entirely above or below it. Three-way versions (clearly below, borderline, clearly above) have saved **22% or more of test length** in published simulations.
    - **DOK 2 — Summary:** Adaptivity cannot conjure hard questions that are absent from the bank, and a scoring or security choice can erase the precision the selection algorithm promised. Certify the actual bank together with the chosen scoring method, exposure control, and stopping rule; "it's adaptive" is not acceptance evidence.
    - **Link to source:** [https://doi.org/10.1177/0146621605275413](https://doi.org/10.1177/0146621605275413) | [https://doi.org/10.1007/BF02294627](https://doi.org/10.1007/BF02294627)



### Category 11: Feasibility of a "Better" Test — and What "2×" *Can* and *Cannot* Mean

- **Subcategory 11.1: Building a standardized test is a multi-year, validation-heavy program**
  - **Source:** AERA/APA/NCME (2014), Standards ch. 4–5
    - **DOK 1 — Facts:**
      - Reviewing questions, trying them out on representative samples, and screening them for bias are required steps, not optional ones. Adaptive designs additionally require large live question pools and explicit rules for when to stop testing.
    - **DOK 2 — Summary:** A defensible test is not just a set of good questions; it needs reviews, tryouts, and bias screening, all of which take years. Custom test development is a multi-year commitment rather than a sprint, and Category 15 surveys the instruments that already exist.
    - **Link to source:** [AERA/APA/NCME (2014), *Standards*, ch. 4–5](https://www.testingstandards.net/)
- **Subcategory 11.2: How many children it takes to calibrate a question bank**
  - **Source:** Hulin, Lissak & Drasgow (1982); de Ayala (2009); Linacre; Oosterhuis, van der Ark & Sijtsma (2016)
    - **DOK 1 — Facts:**
      - To "calibrate" a question is to estimate how hard it is and how sharply it separates stronger children from weaker ones, which requires a sample of real test-takers.
      - Rules of thumb run to about **500 test-takers** for a model that estimates each question's difficulty and its sharpness, and about **1,000** for one that also estimates the effect of guessing. De Ayala's honest answer is that it depends on the model, the questions, and the sample.
      - The simplest model, which estimates difficulty alone, needs less — roughly **200–250 valid responses per question** for common precision targets — but slipping trial questions into live tests can make the total sample much larger. Separately, fitting a smooth curve across ages to build norms, instead of splitting children into age bins, can require **2.5 to 5.5 times fewer cases per age group** for comparable precision.
    - **DOK 2 — Summary:** Calibration is a concrete, unavoidable data requirement for any new adaptive bank, and a nontrivial one at a small school.
    - **Link to source:** [https://doi.org/10.1177/014662168200600301](https://doi.org/10.1177/014662168200600301)
- **Subcategory 11.3: Time and cost, indicatively**
  - **Source:** Center for Assessment (expert blog); National Academies (2022)
    - **DOK 1 — Facts:**
      - Three years or more is a common rule of thumb for a large-scale test; writing a single question costs roughly $1,000–$20,000; the national NAEP assessment spends about $16.3M a year on question development alone. The blog source is expert commentary rather than peer-reviewed work.
    - **DOK 2 — Summary:** These are rough industry figures for what a serious test costs and how long it takes. They come from large-scale achievement testing, so treat them as a scale check rather than a GT budget.
    - **Link to source:** [National Academies (2022), *A Pragmatic Future for NAEP*](https://doi.org/10.17226/26427)
- **Subcategory 11.4: The capped measures — where "2×" is impossible**
  - **Source:** AERA/APA/NCME (2014) Standards ch. 2; Spearman (1904)
    - **DOK 1 — Facts:**
      - Reliability already sits in the .90s for good tests and is capped at 1.0, so it cannot be doubled.
      - Measured validity against an outcome is capped at the square root of the two reliabilities multiplied together, so it cannot be doubled either.
    - **DOK 2 — Summary:** "Twice the validity" is not merely ambitious, it is mathematically impossible on these measures. Any comparison against CogAT has to be made on the tail-specific measures in 11.5.
    - **Link to source:** [AERA/APA/NCME (2014), *Standards*](https://www.testingstandards.net/) | [Spearman (1904)](https://doi.org/10.2307/1412159)
- **Subcategory 11.5: The uncapped, tail-specific measures — where "2×" *is* coherent**
  - **Source:** Lord (1980); van der Linden (1984); Baker (2001); Livingston & Lewis (1995); AERA/APA/NCME (2014)
    - **DOK 1 — Facts:**
      - **Relative efficiency at the cut** compares how much information each test carries at the same ability level. A value of 2 means the older test would need roughly twice as many comparable questions to match the new test's precision at that point. Both tests have to be placed on a common scale first.
      - **Information at high ability levels** adds up and has no ceiling — but **halving the error bar requires about four times the information, not twice**, because the error bar shrinks with the square root. Doubling information shrinks the error bar to about 0.707 of its former width, a reduction of roughly 29%.
      - The **share of gifted children the test misses at the cut** is a proportion nowhere near a ceiling, so going from 20% to 10% is arithmetically real.
      - **Consistency of the pass/fail call** at the cut can rise materially.
    - **DOK 2 — Summary:** Some quality measures are not capped and live exactly at the tail: you can genuinely double the test's information at the cut, or halve how many gifted children it misses. A defensible "roughly 2×" claim uses one of those, not a vague "2× validity" headline.
    - **Link to source:** [Lord (1980)](https://doi.org/10.4324/9780203056615) | [Livingston & Lewis (1995)](https://doi.org/10.1111/j.1745-3984.1995.tb00462.x)
- **Subcategory 11.6: Precedent that adaptivity moves exactly these measures**
  - **Source:** Weiss (1982)
    - **DOK 1 — Facts:**
      - Equal precision at all ability levels, fewer questions, and better classification.
    - **DOK 2 — Summary:** That result from Category 10.1 is precisely the kind of tail improvement 11.5 says is achievable, which ties the feasibility argument to a real published mechanism rather than a hope.
    - **Link to source:** [https://doi.org/10.1177/014662168200600408](https://doi.org/10.1177/014662168200600408)
- **Subcategory 11.7: A cautionary real-world case — NWEA MAP**
  - **Source:** NWEA MAP Growth technical and norms documentation (publisher-produced)
    - **DOK 1 — Facts:**
      - NWEA MAP is adaptive and reports smaller error bars than fixed forms plus a "very high ceiling," yet its own documents show the error bar rising near the top of a level's range.
      - Its 2025 norms draw on about 13.8M students, but expected growth *compresses* in the upper grades — roughly 6 scale points in grades 5–6 against about 4 in grades 7–8 — so raw gain understates gifted growth, and growth percentiles are the appropriate high-ceiling measure.
      - **Conflict of Interest:** these are the publisher's own documents, and a specific numeric "effective ceiling" figure remains **unverified**.
    - **DOK 2 — Summary:** Even a real adaptive test used by millions still loses precision near the top and compresses gifted growth — a reality check that "adaptive" is not magic. MAP is also a candidate high-ceiling outcome measure for evaluating GT itself, which makes its tail behaviour doubly relevant.
    - **Link to source:** [NWEA MAP Growth Technical Report (2025)](https://www.nwea.org/uploads/MAP-Growth-Technical-Report-2025.pdf)
- **Subcategory 11.8: No head-to-head "2×" claim is valid without a common comparison design**
  - **Source:** Kolen & Brennan (2014); Linn (1993); DeLong, DeLong & Clarke-Pearson (1988)
    - **DOK 1 — Facts:**
      - "Equating" means putting two tests on genuinely the same scale. It requires that both measure the same thing and satisfy strong conditions about symmetry and independence from the population tested. Weaker links — calibration, concordance, and simple prediction — each license a correspondingly weaker claim. Equating at the tail is especially uncertain because so few cases anchor the top.
      - If full equating is not defensible, give both tests to the **same students** and compare them against a single outcome measured independently of either test. Paired statistical methods test whether the difference in accuracy is real while accounting for the fact that the same children took both. Report that difference with a confidence interval, rather than reporting one test as significant and the other as not.
    - **DOK 2 — Summary:** Two test scales are not automatically the same ruler, so a bigger number on one cannot simply be divided by the other. Doubling information at the cut is a measurement claim that needs a shared scale; halving false negatives is a decision claim that needs a shared outcome label. Neither one is a claim that the program helps children.
    - **Link to source:** [https://doi.org/10.1007/978-1-4939-0317-7](https://doi.org/10.1007/978-1-4939-0317-7) | [https://doi.org/10.2307/2531595](https://doi.org/10.2307/2531595)
- **Subcategory 11.9: Validity belongs to the proposed use, not to a test's name**
  - **Source:** AERA/APA/NCME (2014); APA Ethics Code
    - **DOK 1 — Facts:**
      - The professional standards define validity as the degree to which evidence and theory support a score interpretation **for a specific proposed use**, and they organize that evidence around content, response processes, internal structure, relationships to other variables, and consequences. The APA ethics code likewise limits use to the purposes and populations the evidence actually supports.
      - Rebuilding, recombining, digitizing, or gamifying a task creates a new validity argument. A publisher's validity evidence and norms do not transfer automatically.
    - **DOK 2 — Summary:** A validated question or instrument does not automatically validate a new K–8 gifted-admissions use, scoring rule, delivery mode, or composite. A new instrument cannot support high-stakes decisions until evidence validates its specific use on its specific population.
    - **Link to source:** [AERA Standards](https://www.aera.net/publications/books/standards-for-educational-psychological-testing-2014-edition) | [APA Ethics Code](https://www.apa.org/ethics/code)



### Category 12: Game-Based / "Gamified" Assessment (the Roblox-Style Option) — Promise, Evidence Ceiling, and Fairness Threats

- **Subcategory 12.1: Game-based, or "stealth," assessment is a real method**
  - **Source:** Shute & Ventura (2013); Mislevy, Steinberg & Almond (2003)
    - **DOK 1 — Facts:**
      - Instead of asking questions, **game-based assessment** embeds a task inside a game and infers ability from the running record of how the player acts, often called process data or telemetry.
      - The scoring framework behind it is **evidence-centered design**, which works backwards from the claim you want to make to the observable behaviours that would justify it, paired with statistical networks that update a belief about the player as evidence accumulates.
    - **DOK 2 — Summary:** This establishes game-based assessment as a legitimate measurement method rather than a gimmick. The open question is whether it works for a *high-stakes K–8 gifted decision*, which the rest of the category probes.
    - **Link to source:** [https://doi.org/10.7551/mitpress/9589.001.0001](https://doi.org/10.7551/mitpress/9589.001.0001) | [https://doi.org/10.1207/s15366359mea0101_02](https://doi.org/10.1207/s15366359mea0101_02)
- **Subcategory 12.2: Roblox is a working proof-of-concept — for *adults*, not children**
  - **Source:** EDM 2024 proceedings; Roblox Newsroom (2025), a company claim
    - **DOK 1 — Facts:**
      - Since 2021 Roblox has run a **game-based hiring assessment** measuring "cognitive skills such as creative problem-solving and systems thinking" for entry-level engineers and product managers, with a practice game called "Kaiju Cats."
      - Roblox calls it "standardized, scientifically validated," which is a **company claim** rather than independent peer review. The population is adult job candidates; it is **not** a child or gifted instrument.
    - **DOK 2 — Summary:** Roblox really does use a game to screen job candidates, which proves the idea can be operationalized at scale. But the population gap between adult engineers and K–8 children is exactly the untested leap for high-stakes gifted identification.
    - **Link to source:** [EDM 2024 proceedings](https://educationaldatamining.org/edm2024/proceedings/2024.EDM-posters.96/index.html) | [Roblox Newsroom (2025), "Fair Play"](https://about.roblox.com/newsroom/2025/07/fair-play-robloxs-game-based-talent-assessment)
- **Subcategory 12.3: Single-game results look encouraging, but come from the games' own creators**
  - **Source:** Shute & Moore (2017); Shute, Ventura & Ke (2015)
    - **DOK 1 — Facts:**
      - "Convergent validity" here means how strongly the game score correlates with an established test of the same thing.
      - Physics Playground reported internal consistency of about 0.87 and correlations of **about 0.22 to 0.41** with an external physics test.
      - Portal 2 against Lumosity produced effect sizes of about 0.59 for problem-solving, 0.64 for spatial ability, and 0.42 for persistence — differences expressed in standard-deviation units — but on **77 adults**.
    - **DOK 2 — Summary:** The tests of these games were run by the games' own creators on small adult samples, so the encouraging numbers still need independent replication. A correlation near 0.3 is modest, and small proponent-run samples cap how much weight it can bear.
    - **Link to source:** [https://doi.org/10.1016/j.compedu.2014.08.013](https://doi.org/10.1016/j.compedu.2014.08.013)
- **Subcategory 12.4: The independent evidence is usually moderate, and child evidence is emerging**
  - **Source:** Bipp et al. (2024); Aneni et al. (2023); Song et al. (2020)
    - **DOK 1 — Facts:**
      - An adult meta-analysis (52 samples, more than 6,100 people) puts the observed correlation between game-based assessment and traditional cognitive-ability tests at **about .30**, or roughly .45 after statistical correction, with wide variation running from negative to strongly positive.
      - A systematic review of children and adolescents covered **19 articles, 20 studies, 18 games, and 378 correlations**. 75% of the game-to-traditional-test correlations were statistically significant, and 80% of those significant results were in the low-to-medium range.
      - In the CoCon mobile game, the working-memory score correlated about **.45** with both the WISC Digit Span subtest and the Working Memory Index; the processing-speed and verbal relationships were smaller.
    - **DOK 2 — Summary:** Pooling studies of adults and children, game scores usually overlap with established cognitive tests without being interchangeable with them. The child evidence corrects the older "adults only" framing, but it supports a narrow conclusion: a single game gives partial, ability-specific signal rather than a replacement for a validated battery.
    - **Link to source:** [https://doi.org/10.3390/jintelligence12120129](https://doi.org/10.3390/jintelligence12120129) | [https://doi.org/10.1016/bs.pbr.2023.02.002](https://doi.org/10.1016/bs.pbr.2023.02.002) | [https://doi.org/10.1371/journal.pone.0230498](https://doi.org/10.1371/journal.pone.0230498)
- **Subcategory 12.5: The field designs these for low-stakes use; the high-stakes K–8 use has no evidence**
  - **Source:** Shute & Sun (2020); Gomez, Ruipérez-Valiente & García Clemente (2023)
    - **DOK 1 — Facts:**
      - Game-based assessment is positioned by its own field as a formative, low-stakes tool.
      - **No study validates it for high-stakes K–8 gifted identification.**
    - **DOK 2 — Summary:** The people who build these tools frame them as learning instruments, not admissions instruments. That is the single most important limit on adopting game-based assessment *as the score*: the exact use GT would need is the one with no evidence behind it.
    - **Link to source:** [https://doi.org/10.1109/TLT.2022.3226661](https://doi.org/10.1109/TLT.2022.3226661)
- **Subcategory 12.6: The fairness threat is empirically documented, not hypothetical**
  - **Source:** Ohlms, Hohner & Melchers (2025); Kim et al. (2023)
    - **DOK 1 — Facts:**
      - "Construct-irrelevant variance" is score movement caused by something other than the ability you meant to measure — measurement noise that behaves like bias.
      - Video-game experience **predicts game-based-assessment scores without predicting academic performance**, which is precisely that kind of bias.
      - In one spatial game-based assessment, "enjoyment significantly affects one key feature," with explicit concerns about differences between boys and girls.
    - **DOK 2 — Summary:** Children who play more video games score higher on the game without being more able. Familiarity and enjoyment leaking into the score would violate the fairness bar in Category 9.7 and the professional fairness standards.
    - **Link to source:** [https://doi.org/10.1111/apps.70038](https://doi.org/10.1111/apps.70038) | [https://doi.org/10.1111/bjet.13286](https://doi.org/10.1111/bjet.13286)
- **Subcategory 12.7: Commercial "games measure cognition" claims are mostly unvalidated marketing**
  - **Source:** Wilson et al. (2021); Simons et al. (2016); FTC (2016); Kollins et al. (2020)
    - **DOK 1 — Facts:**
      - The one independent audit of the pymetrics hiring games checked only that the de-biasing *code* met the four-fifths rule, a US employment-law benchmark for adverse impact, and **explicitly did not test whether the games measure ability or predict performance**.
      - Evidence that brain-training transfers to general ability is weak, and the Federal Trade Commission extracted a $2M settlement from Lumosity in 2016 over its claims.
      - The one rigorously validated game, Akili's **EndeavorRx** (cleared by the FDA in 2020), is a narrow ADHD **treatment**, not an ability test.
    - **DOK 2 — Summary:** Most "brain games" that claim to measure or boost ability have never demonstrated that they do. This separates the hype from the evidence and cautions against importing a vendor's validity claims wholesale.
    - **Link to source:** [https://doi.org/10.1177/1529100616661983](https://doi.org/10.1177/1529100616661983) | [https://doi.org/10.1016/S2589-7500(20)30017-0](https://doi.org/10.1016/S2589-7500(20)30017-0)
- **Subcategory 12.8: The most rigorous game trial (Minecraft) found nothing**
  - **Source:** *Computers & Education* (2024); Slattery et al. (2025)
    - **DOK 1 — Facts:**
      - A randomized trial run across whole classrooms (885 children) found no overall effect on spatial thinking.
      - A systematic review flags medium-to-high risk of bias across the wider body of studies.
    - **DOK 2 — Summary:** The best-designed test of a popular "educational" game found no real effect, and the surrounding literature is at high risk of bias. This reinforces that game-based cognitive claims often evaporate under rigorous testing.
    - **Link to source:** [https://doi.org/10.1002/rev3.70035](https://doi.org/10.1002/rev3.70035)



### Category 13: The Learning Science of Eliciting a Child's *Best* Performance (and Whether "Fun" Helps *Measurement*)

- **Subcategory 13.1: Test anxiety depresses scores and adds noise, measurably, in K–8**
  - **Source:** von der Embse et al. (2018); Robson et al. (2023); Hembree (1988)
    - **DOK 1 — Facts:**
      - Across grades 1–5 the correlation between test anxiety and achievement is **about −.22**, and across grades 6–8 **about −.25**; the minus sign means more anxiety goes with lower scores.
      - A 20-year meta-analysis of **53,617 children aged 5–12** confirms the negative link.
    - **DOK 2 — Summary:** Anxiety makes children underperform, so a stressful test understates true ability and manufactures false negatives. This is the strongest reason a lower-anxiety, playful delivery could improve *measurement* — by removing a known downward bias, not by making the test easier.
    - **Link to source:** [https://doi.org/10.1016/j.jad.2017.11.048](https://doi.org/10.1016/j.jad.2017.11.048) | [https://doi.org/10.1016/j.jsp.2023.02.003](https://doi.org/10.1016/j.jsp.2023.02.003)
- **Subcategory 13.2: Engagement requires difficulty to match skill**
  - **Source:** Csikszentmihalyi (1990)
    - **DOK 1 — Facts:**
      - "Flow" is the absorbed state people reach when a task's difficulty matches their skill.
      - Challenge above skill breeds anxiety and challenge below it breeds boredom, so matching difficulty to the person is the mechanism that sustains engagement.
    - **DOK 2 — Summary:** People engage best when difficulty matches skill, which is exactly what adaptive difficulty does (Category 10.1). It is the theoretical bridge between engagement and adaptive testing: the same difficulty-matching that improves measurement also sustains motivation.
    - **Link to source:** [Csikszentmihalyi (1990), *Flow*](https://search.worldcat.org/title/20392741)
- **Subcategory 13.3: Rewards can *crowd out* genuine interest, and it is worse for children**
  - **Source:** Deci, Koestner & Ryan (1999); Ryan & Deci (2000)
    - **DOK 1 — Facts:**
      - Tangible and performance-contingent rewards *reduced* children's freely chosen interest in a task, by about **0.28 to 0.40 standard deviations**, and were "more detrimental for children than college students."
      - Positive *feedback*, by contrast, increased that interest, by about **0.33 standard deviations**.
    - **DOK 2 — Summary:** Paying or badging children for performance can reduce their real interest in the task, which is a caution against reward mechanics in a measurement setting. This bears directly on GT School's cash-reward framing and on any point or badge system inside a gifted screen.
    - **Link to source:** [https://doi.org/10.1037/0033-2909.125.6.627](https://doi.org/10.1037/0033-2909.125.6.627) | [https://doi.org/10.1037/0003-066X.55.1.68](https://doi.org/10.1037/0003-066X.55.1.68)
- **Subcategory 13.4: Game interfaces can add mental effort that has nothing to do with reasoning**
  - **Source:** Sweller (1988); Sweller, van Merriënboer & Paas (1998/2019)
    - **DOK 1 — Facts:**
      - "Cognitive load" is the mental effort a task demands, and working memory is the limited pool it draws on.
      - Working memory spent decoding controls and graphics is unavailable for the reasoning the test is trying to measure.
    - **DOK 2 — Summary:** Effort spent figuring out the interface is effort not spent on the reasoning you meant to measure. This is the mechanism by which a "richer" game can *lower* measurement quality, and it bites hardest with the youngest children.
    - **Link to source:** [https://doi.org/10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4) | [https://doi.org/10.1007/s10648-019-09465-5](https://doi.org/10.1007/s10648-019-09465-5)
- **Subcategory 13.5: Gamification's measured benefit is real but modest, and it is about engagement rather than accuracy**
  - **Source:** Sailer & Homner (2020); Hamari et al. (2014); Bai, Hew & Huang (2020)
    - **DOK 1 — Facts:**
      - Gamification's measured effects are **0.49 on learning, 0.36 on motivation, and 0.25 on behaviour**, with the latter two less stable.
      - Effects depend on context and user, with an explicit **novelty** caveat: shorter interventions show larger effects, consistent with the benefit fading once the novelty wears off. Some learners also report anxiety and jealousy.
    - **DOK 2 — Summary:** Adding game elements helps engagement and learning somewhat, but that is a different claim from "the game measures ability accurately." The load-bearing distinction is that **engagement is not accuracy**: gamification can aid learning without improving measurement, or while actively harming it.
    - **Link to source:** [https://doi.org/10.1007/s10648-019-09498-w](https://doi.org/10.1007/s10648-019-09498-w) | [https://doi.org/10.1016/j.edurev.2020.100322](https://doi.org/10.1016/j.edurev.2020.100322)
- **Subcategory 13.6: Stereotype threat is a *possible*, not settled, performance factor**
  - **Source:** Steele & Aronson (1995); Shewach, Sackett & Quint (2019); Flore & Wicherts (2015)
    - **DOK 1 — Facts:**
      - "Stereotype threat" is the proposal that reminding students of a negative stereotype about their group depresses their scores.
      - The original demonstration shrinks to negligible-or-small under real testing conditions, to about **−.14 standard deviations**, with signs that studies finding no effect went unpublished.
    - **DOK 2 — Summary:** The original effect looks much smaller under operational testing conditions than in the laboratory. Treat it as a candidate factor rather than a settled one — flagged honestly rather than assumed.
    - **Link to source:** [https://doi.org/10.1037/apl0000420](https://doi.org/10.1037/apl0000420)
- **Subcategory 13.7: Understanding the task, the device, and consistent delivery are part of the measurement**
  - **Source:** WISC-V administration materials; National Academies; child tablet/touchscreen studies
    - **DOK 1 — Facts:**
      - The WISC-V includes demonstration, sample, and teaching items before any scored item, so an unfamiliar task format is not mistaken for low ability. **Conflict of Interest:** these are publisher materials.
      - Group tablet self-administration has been demonstrated from about age 7 in a 12-task child battery, and preschool studies find touchscreen selection easier than mouse use. These results support validating the interface for each age group; they do not prove that scores are equivalent across devices.
      - Consistent delivery is not trivial: reviews summarized by the National Academies found scoring or clerical errors in **38% of WISC-R and 42% of WISC-III protocols** despite trained examiners. Digital administration removes some clerical variation but introduces device, latency, accessibility, and software risks of its own.
    - **DOK 2 — Summary:** Especially for K–4, a wrong answer can mean "did not understand the task or the controls" rather than "could not reason," which is why good tests teach the format before scoring anything. The acceptance question is not "paper or digital?" but whether each mode preserves the task, instructions, timing, accommodations, and score meaning for each age group.
    - **Link to source:** [National Academies overview](https://www.ncbi.nlm.nih.gov/books/NBK305233/) | [PMC7710155](https://pmc.ncbi.nlm.nih.gov/articles/PMC7710155/).



### Category 14: Migrating Game-Development Practice to Test Design — What Transfers, and What Doesn't

- **Subcategory 14.1: Ten mappings from game development to assessment engineering**
  - **Source:** Leighton (2017); Seif El-Nasr, Drachen & Canossa (2013); Bergner & von Davier (2019); van der Linden & Glas (2010); Bock, Muraki & Pfeiffenberger (1988); Kohavi, Tang & Xu (2020); Gierl, Lai & Turner (2012); Corbett & Anderson (1994); Piech et al. (2015); Swink (2009); Thompson, Johnstone & Thurlow (2002); Sympson & Hetter (1985)
    - **DOK 1 — Facts:**
      - **Playtesting becomes the "cognitive lab."** Studios watch players to see whether a level works; test developers run think-aloud sessions to verify that a question triggers the reasoning it was written to trigger.
      - **Game telemetry becomes question analytics.** The same logging that tells a studio where players quit tells a test developer how each question is behaving — though the researchers note that response time alone cannot even establish whether a child is engaged.
      - **Level design and difficulty curves become question sequencing and adaptive routing.**
      - **Live balancing becomes ongoing monitoring of question behaviour.** A question's difficulty *drifts* over time and has to be re-checked, much as a weapon's balance drifts across patches.
      - **A/B testing becomes controlled experimentation on questions**, complete with guardrail metrics and care to keep novelty and carryover effects from contaminating the result.
      - **Procedural content generation becomes automatic question generation** — one template produced **1,248** questions in a professional-licensure example.
      - **Player modelling becomes ability estimation and knowledge tracing** — the statistical machinery that infers what a player knows from what they have already done, including neural-network versions.
      - **"Juice" and game feel become feedback design** — but inside a scored segment, feedback must stay neutral and process-focused, and **over-juicing measurably lowers performance** (Category 13).
      - **Game accessibility becomes universal design for assessment**, plus accommodations that support the child without changing what is being measured.
      - **Anti-cheat becomes test security and question-exposure control.**
    - **DOK 2 — Summary:** Familiar studio practices — playtesting, telemetry, difficulty curves, live tuning, content generation, player modelling, game feel, accessibility, anti-cheat — each have an established counterpart in assessment engineering. Each counterpart still requires its own validation for the intended use.
    - **Link to source:** [https://doi.org/10.1111/j.1365-2923.2012.04289.x](https://doi.org/10.1111/j.1365-2923.2012.04289.x) | [https://doi.org/10.3102/1076998618784700](https://doi.org/10.3102/1076998618784700)
- **Subcategory 14.2: The hard limit — this transfers *engineering*, not *accuracy***
  - **Source:** Haladyna & Downing (2004)
    - **DOK 1 — Facts:**
      - Anything a game adds that moves scores but is not the ability you meant to measure is **construct-irrelevant variance**, a named and well-documented threat to a test's validity.
      - Every mapping in 14.1 still has to clear the measurement bar set out in Category 9.
    - **DOK 2 — Summary:** No matter how good the engineering, borrowing a studio practice does not import evidence that the resulting test measures the right thing. Engagement and access gains do not substitute for measurement quality at the gifted tail.
    - **Link to source:** [https://doi.org/10.1111/j.1745-3992.2004.tb00149.x](https://doi.org/10.1111/j.1745-3992.2004.tb00149.x)



### Category 15: The Gifted-Measurement Toolbox *Beyond* CogAT — Instruments and Their Evidence

> **A practicality note that applies to all of 15.1:** these batteries are administered by one trained examiner to one child at a time, take 40–90+ minutes, require a graduate-trained administrator, and cost roughly $800–$1,600+ per kit. They are **confirmatory tools, not scalable universal screens.**

- **Subcategory 15.1: One-child-at-a-time IQ batteries (confirmatory, not screens)**
  - **Source:** Wechsler (WISC-V, WPPSI-IV); Roid (SB5); McGrew/Mather/LaForte (WJ V); Elliott (DAS-II); Kaufman (KABC-II); Reynolds/Kamphaus (RIAS-2) — with independent reviews
    - **DOK 1 — Facts:**
      - **WISC-V** (ages 6–16): 10 core plus 6 optional subtests producing five index scores, a Full Scale IQ, and a General Ability Index. The Full Scale IQ is highly consistent (about .96). **Extended norms** push composite scores toward about 210 for the profoundly gifted, and the General Ability Index deliberately drops working memory and processing speed so that slower recall does not mask reasoning. Independent analyses find the **publisher's five-factor structure does not hold** — a model dominated by one general ability fits better — and the group index scores are "of questionable interpretive value independent of" that general factor. **Conflict of Interest:** the technical reports are the publisher's own. *Worth borrowing:* the extended-norm concept and a reasoning-only composite. *Not supported:* reading the five index scores for selection, or using a one-child-at-a-time clinician test as a first-stage screen.
      - **WPPSI-IV** (ages 2½–7): age-banded preschool subtests producing five indices and a Full Scale IQ. A sound early-childhood battery, but with a **lower ceiling than the WISC-V**, and preschool scores are inherently unstable. **Conflict of Interest:** publisher-authored. *Worth borrowing:* developmentally appropriate, low-language question formats. *Not supported:* any single early-childhood IQ used as a gate.
      - **Stanford-Binet 5** (ages 2 to 85+): subtests that route each child to an appropriate starting difficulty, producing full-scale, nonverbal, and verbal IQs plus five factor scores. It markets an extended IQ up to 225, but **independent data show it compresses the gifted tail** — gifted children scored significantly lower than on the WISC-III, and their rank order was not preserved — and its norms date from 2003. **Conflict of Interest:** publisher-authored. *Worth borrowing:* the parallel verbal and nonverbal routing design. *Not supported:* its stale norms and extrapolated high end, which cause it to **under-identify** gifted children.
      - **WJ V (2025) and WJ IV Cognitive:** built on the Cattell–Horn–Carroll model of intelligence, producing a general-ability score, a reasoning-plus-knowledge composite, and broad ability clusters. It scores on a continuous scale rather than in bands, WJ V is fully digital, and its norms are **current and post-pandemic (about 5,837 cases)**. An independent review calls the psychometrics "robust" but "less convincing under six," and notes there are **no dedicated gifted extended norms**. **Conflict of Interest:** publisher-authored. *Worth borrowing:* the digital-native, continuously-scored, currently-normed architecture. *Not supported:* treating it as a high-end gifted differentiator, or ignoring the hardware barrier it creates.
      - **DAS-II** (ages 2½–17): 20 subtests producing a General Conceptual Ability score, a Special Nonverbal Composite, and clusters. Its headline score is a clean reasoning measure that excludes working memory, processing speed, and acquired knowledge, but its **gifted-range and early-years norms still date from 2007**. **Conflict of Interest:** publisher-authored. *Worth borrowing:* the reasoning-first composite and its nonverbal counterpart. *Not supported:* relying on 2007 norms at the high end.
      - **KABC-II** (ages 3–18): two interchangeable scoring models — one that deliberately excludes acquired knowledge, one that includes it — plus a nonverbal index. Dropping acquired knowledge and language yields **smaller Black–White gaps** and *over-predicts* minority achievement, which is why it is recommended for capturing potential. But its ceiling stops at 160, and its 2018 re-norming sample is small (700 children). **Conflict of Interest:** publisher-authored. *Worth borrowing:* the reduced-cultural-loading design and the potential-versus-attainment framing. *Not supported:* the 160 ceiling, and expecting a knowledge-free index to predict *current* achievement.
      - **RIAS-2** (ages 3–94): 8 subtests producing composite, verbal, and nonverbal intelligence scores alongside co-normed memory and speed measures. It is brief (25–45 minutes), light on motor and reading demands, with indices above .90 — but independent work finds it is **essentially one general-ability factor**, so its sub-scores add little on their own. **Conflict of Interest:** publisher-authored. *Worth borrowing:* an efficient, low-load general-ability estimate for a confirmatory second stage. *Not supported:* interpreting its sub-scores as distinct abilities, or using it alone for a high-stakes decision.
    - **DOK 2 — Summary:** These are the gold-standard IQ tests a psychologist administers one child at a time — precise and high-ceilinged, but far too slow and costly to screen everyone. Across all of them a single dominant general-ability factor keeps reappearing, several carry stale or compressed high-end norms, and their one-at-a-time delivery makes them confirmatory second-stage tools rather than universal screens.
    - **Link to source:** the instrument sources cited above; key independent reviews: [https://doi.org/10.1037/pas0000358](https://doi.org/10.1037/pas0000358) | [https://doi.org/10.1177/1073191115624545](https://doi.org/10.1177/1073191115624545)
- **Subcategory 15.2: Group and nonverbal "culture-reduced" screens, and the culture-fair myth**
  - **Source:** OLSAT 8; NNAT3; Raven's 2; InView; UNIT-2; Leiter-3; CTONI-2 — with independent reviews; Lohman; Giessman et al.; Carman et al.
    - **DOK 1 — Facts:**
      - **OLSAT 8** (group-administered): verbal and nonverbal clusters producing a School Ability Index. Scalable and CogAT-like, but **its precision at the top and its current subgroup evidence are not independently published**, and its verbal load reintroduces language dependence. **Conflict of Interest:** publisher-authored, and the independent review was written by Lohman, who co-authored the competing CogAT, so it carries the opposite bias. The available predictive-bias study uses an older form. *Worth borrowing:* a proven scalable group format — but obtain the technical manual first.
      - **NNAT3** (group, nonverbal): geometric matrix puzzles producing a Naglieri Ability Index. Reliabilities run **.80–.90 and are weakest in K–3, with an error bar of about 5–7 points, meaning a ±10–13 point band around each score**. **Independent data contradict the culture-fair claim:** English learners scored about 9.5 points lower, and it did not identify more underrepresented students than CogAT-Nonverbal. **Conflict of Interest:** publisher- and author-produced. *Not supported:* using it as a universal equity add-on. *Worth borrowing:* possibly as a narrow language-reduced alternate route.
      - **Raven's 2** (individual, paper or adaptive digital): nonverbal matrix reasoning producing a single derived score. Normed with modern methods and adjusted for the long-run rise in raw scores across generations, but **not validated as a universal gifted screen**, and English learners still scored about 7.5 points lower. In the adaptive digital form children receive different questions, so raw totals are not comparable and interpretation requires the derived standard score, percentile, and confidence band. **Conflict of Interest:** publisher-authored. *Not supported:* universal screening without use-specific validation; suited to individual follow-up only.
      - **InView** (group): five subtests producing verbal, nonverbal, and total scores plus a Cognitive Skills Index. Used in some states for gifted identification but with **essentially no independent psychometric evidence** — all claims come from the publisher. *Not supported:* there is not enough independent evidence to rely on it.
      - **UNIT-2** (individual, entirely nonverbal in both instructions and response): six subtests producing a Full Scale score plus factors. Useful for follow-up with deaf children, English learners, and twice-exceptional children, but independent analysis shows it is **primarily one general factor**, its factor scores carry no unique information, and it does not measure the same way across age, gender, and race. **Conflict of Interest:** publisher-authored. *Worth borrowing:* individual language-free follow-up on the full-scale score only. *Not supported:* scaling it up as a group screen.
      - **Leiter-3** (individual, fully nonverbal): four cognitive subtests producing a nonverbal IQ. A reliable global score for nonverbal and hearing-impaired follow-up, but it **cannot separate fluid reasoning from visual-spatial ability**, and its criterion samples are small. **Conflict of Interest:** publisher-authored. *Worth borrowing:* individual nonverbal follow-up only.
      - **CTONI-2** (individual): six nonverbal reasoning subtests producing a full-scale nonverbal IQ. Independent evidence shows a **ceiling problem** — its questions are "too low to capture individual differences" among higher-ability examinees. **Conflict of Interest:** publisher-authored. *Not supported:* it compresses scores exactly where gifted selection operates.
      - **Across all of them:** nonverbal tests are "**neither culture free nor culture fair**"; English learners scored **about 0.5–0.67 standard deviations lower** across Raven's, CogAT-Nonverbal, and the NNAT; and both the NNAT2 and CogAT-Nonverbal under-identify underrepresented groups depending on the norms and cutoff used. **"Switch to a nonverbal test for equity" is not supported by the independent data.**
    - **DOK 2 — Summary:** These scalable group tests, and the language-free individual ones, are frequently adopted as an equity fix. This subcategory is the direct answer to that tempting move: the independent evidence says the culture-fair promise does not deliver the equity it advertises.
    - **Link to source:** the instrument sources cited above; [https://doi.org/10.1177/0016986213477190](https://doi.org/10.1177/0016986213477190) | [https://doi.org/10.1177/0016986217752097](https://doi.org/10.1177/0016986217752097)
- **Subcategory 15.3: Rating scales, creativity, above-level, and learning-based measures**
  - **Source:** GRS-2/SRBCSS/GATES-2/HOPE; TTCT; SMPY talent-search; dynamic-assessment literature
    - **DOK 1 — Facts:**
      - **Teacher and parent rating scales (GRS-2, SRBCSS/Renzulli, GATES-2, HOPE):** structured ratings across several domains. They share a **halo problem**, where a rater's overall impression bleeds into every subscale; **10–25% of the variation comes from which rater a child happened to get**; and their validity evidence is largely produced by their own developers. **HOPE** is the standout, built for low-income and diverse students with no race or income bias at the item level — though it does show gender bias, and income bias appears in its *national* norms, so **use local norms**. *Worth borrowing:* structured multi-domain signals and HOPE's correctable equity design, **as information only, never as a decision**. *Not supported:* any rating subscale as a standalone gate.
      - **Creativity — the Torrance Tests of Creative Thinking:** a timed test of how many and how varied a child's ideas are. It **predicts *personal* creative achievement (about .31) far better than *public* achievement (below .05)**, its scoring is subjective and coachable, and its validity chain was built by proponents. *Not supported:* it is weak as a gate. *Worth borrowing:* a non-decisional signal about the creative domain only.
      - **Above-level testing (the talent-search model):** gives younger students off-the-shelf tests written for older grades, to create ceiling headroom. It has the **strongest long-term evidence base in gifted identification**, rank-ordering children even *within* the top 1%. Some conflict of interest exists. *Worth borrowing:* the above-level principle, paired with universal screening and local norms to offset access bias. (See also Category 10.3.)
      - **Dynamic assessment (test, teach, re-test):** scores how much a child gains and how much prompting they need, rather than a fixed level. It surfaces underserved and twice-exceptional learners but depends heavily on the examiner and has **no validated admissions use**. *Worth borrowing:* a research or process signal. *Not supported:* a high-stakes gate, consistent with Category 10.8.
    - **DOK 2 — Summary:** These are non-test signals — teacher and parent ratings, creativity tasks, above-level testing, and learning-potential measures. The theme is "supplement, don't gate": they widen the lens for equity and breadth but lack the measurement standing to be a standalone decision rule.
    - **Link to source:** the instrument sources cited above; [https://doi.org/10.1177/0016986210378332](https://doi.org/10.1177/0016986210378332)
- **Subcategory 15.4: Whole identification *systems* — the highest-leverage and least conflicted evidence**
  - **Source:** NAGC (2019); Peters et al. (2019); Card & Giuliano (2016); McBee, Peters & Waterman (2014); Lakin (2018)
    - **DOK 1 — Facts:**
      - The National Association for Gifted Children's **2019 Standard 2** requires multiple, technically defensible, purpose-valid, unbiased measures with local norms. It is a **design checklist, not evidence that any of it works.**
      - **Local norms:** comparing children against their own school rather than against the nation raised Black representation by about **238–300%** and Hispanic/Latinx representation by about **157–170%**, though both remained below proportional. The study was preregistered. *Worth borrowing:* a low-cost, evidence-backed equity lever.
      - **Universal screening:** testing every student, rather than waiting for referrals, sharply raised identification of Black, Hispanic, low-income, and English-learner students. This is an **access** finding, not a measurement one. *Worth borrowing:* the strongest referral-stage equity move in the cited evidence.
      - **How scores are combined:** averaging across measures produces the **most reliable composite**; requiring a child to clear *every* measure maximizes the number of gifted children missed; and the apparent advantage of admitting a child who clears *any* measure is an artifact of testing a larger pool, not of the rule itself. *Worth borrowing:* averaging. *Not supported:* "any measure" rules as a diversity fix.
    - **DOK 2 — Summary:** How you *combine* measures and *whom you test* often matters more than which single test you pick. These system-level moves are the best-evidenced and least conflicted findings in the whole toolbox, and they connect the measurement half of this tree back to the selection question.
    - **Link to source:** the instrument sources cited above; [https://doi.org/10.1177/2332858419848446](https://doi.org/10.1177/2332858419848446) | [https://doi.org/10.1177/0016986217752099](https://doi.org/10.1177/0016986217752099)
- **Subcategory 15.5: Public-domain tasks support independent research, not operational validity**
  - **Source:** Condon & Revelle (2014); child working-memory and spatial-task literature
    - **DOK 1 — Facts:**
      - The **International Cognitive Ability Resource** is a public-domain question bank containing matrix and 3-D rotation tasks. Its internal consistency is about **.79** for the matrix set and **.93** for 3-D rotation, and the full bank correlated about **.75** (after correction) with Raven's Advanced Progressive Matrices.
    - **DOK 2 — Summary:** Some task formats and question banks are freely reusable, which lowers the barrier to replication and early research. That does not transfer norms, cut scores, or validity to a new test: a battery built from them still needs its own calibration and validation.
    - **Link to source:** [ICAR project](https://icar-project.com/)
