# BrainLift: GT Admissions — Selecting Capability and Testing Program Effect

## Owners

- Aadi Takle

## Purpose

### Purpose
This BrainLift synthesizes research on K–8 gifted cognitive assessment, tail measurement quality, identification fairness and access, adaptive and game-based assessment evidence, and causal designs that separate program effect from selection effect. It is a standalone, source-traceable map of what the evidence does and does not support.

### In Scope
- What cognitive-ability and related instruments measure and miss at the gifted tail, including spatial breadth, rank instability, gatekeeping, and equity disparities.
- Psychometric standards and metrics for judging tail measurement quality (conditional SEM, decision accuracy, DIF/DTF, classification consistency, and related operating-point metrics).
- Maturity and limits of remediation methods: CAT/MST, above-level testing, repeated measurement, compensatory combination rules, and game-based child assessment evidence.
- Causal-identification designs (RD, lottery ITT, matched comparisons) and outcome-validity constraints for separating program effect from selection.
- GT School / Alpha and comparable programs as **case-study context** and clearly labeled **[COMPANY CLAIM]** / **[PRESS]** statements where relevant.

### Out of Scope
- Designing or implementing an admissions product, selecting vendors, or setting live admissions policy.
- Specifying operational workflows, software architecture, implementation roadmaps, or data systems.
- Treating predictive validity, access change, or selected-cohort growth as proof of program impact without an identified counterfactual design.

## DOK 4: Spiky Points of View (SPOVs)

**SPOV 1: A capability-gated admission lottery is a clean and feasible method of collecting causal evidence that can separate GT's program effect from its selection effect.**

- **Elaboration:** The core problem GT faces is that the current selection effect methodology of a high CogAT cutoff and private-school tuition rate results in a confirmation bias that renders it impossible to adequately measure program effect (Insight 1). However, the immediate fix of just lowering GT's CogAT cutoff reduces the programs effectiveness as a result (Insight 5). Thus, any solution that intends to separate program effect from selection effect needs to broaden program access without lowering the bar of admission. One way to do this is to identify a separate set of capable but underserved applicants who are gifted in metrics not covered by the CogAT (spatial reasoning, conscientiousness, demonstrated achievement, etc.) (Insight 2). By our existing knowledge of giftedness, these kids are classified as gifted and likely just as capable of succeeding in GT's program as any accepted GT applicant, yet they are denied by the current system. 

Since GT's program doesn't currently serve this group of applicants, it makes them prime candidates for demonstrating the program's effectiveness (Insight 3, 3.7). By separating and tracking the group of capable but underserved applicants who are offered a seat vs. not offered a seat into GT's next cohort, we can analyze their growth over the academic year (via MAP scores or another trusted metric) to determine if GT's program disproportionately benefits capable gifted students over traditional schooling. The selection of students into offered and not offerred groups should be done using a capability-gated lottery since research has shown these systems to boost accepted applicant performance and allow us to account for income/financial disparities between applicants gracefully (Insight 6, 3.9). Given GT's small size, this method will likely need to prove its worth over several years worth of cohorts to result in a counterfactual that is precise enough to truly be bulletproof (5.5, 3.9).

**SPOV 2: The same capability-gated admission lottery can help provide the program accessibility needed to begin briding the "excellence gap."**

- **Elaboration:** The current CogAT cutoff and high tuition combination that resulted in confirmation bias also excludes capable Black, Hispanic, low-income, and ELL students (Insight 4, 6). This means that the same methodology used to solve the confirmation bias as part of SPOV 1 will also help to bridge the excellence gap observed as a side effect.

**SPOV 3: If the lottery-offered students show a positive program effect and demonstrate capabilities closely resembling the students admitted above the CogAT cutoff, then there is enough supporting evidence to expand the GT admitted cohort and capability-based lottery to slowly work towards the 10K MIT ready kids by 8th grade goal.**

- **Elaboration:** For expansion to be a viable next step, the lottery-admitted students need to go beyond outpacing their non-offered peers (SPOV 1) and actually match the growth of their CogAT cutoff admitted peers in GT school (3.8). This will demonstrate that the lottery admissions can be accelerated at the same rate as the current GT admitted students and are not falling behind their peers in terms of acceleration. Additionally, before expansion of the GT program can begin, a set of guardrails need to be met for the cohort lottery expansion: current student scores cannot fall, the GT environment of high-velocity acceleration cannot be diluted or otherwised modified, and the MAP/knowledge gains achieved by the end of the academic year need to be retained through to the next academic year (3.8, 5.7). If these conditions are met, then the expansion of the GT school's admitted cohort and the lottery admission system will "broaden access without sacrificing the bar" (Insight 5). Luckily, GT's use of individualized learning and acceleration tools makes expansion of the program very viable at the moment. However, there are still a few aspects of GT school that would need to expand with the cohort size (Guides, workshops, admins, etc.) (Insight 5, 5.6). Still, expansion allows GT to work towards the 10K MIT ready kids by 8th grade marker through volume without compromising on program performance.

**SPOV 4: A cognitive assessment should treat speed as collateral evidence that sharpens the ability estimate, never outweighing speed over accuracy, and only after engagement with the test is independently verified and tail/subgroup bias is ruled out.**
- Elaboration: Assumably, a focused, quick child demonstrates giftedness with correct-and-fast answers. However, evidence shows that move is wrong even when focus is guaranteed because raw speed is ambiguous. Under speed-accuracy tradeoffs, it's only interpretable when time and accuracy are modeled together, emphasizing information-uptake over clock time (2.13.8). In fact, response *consistency* predicts ability better than peak speed, so a speed bonus can reward impulsivity and penalize high-level reflection (13.9). Although engagement is a valid precondition to improving validity against rapid-guessing (13.8), it's a measurement problem to solve rather than declare. Response time alone cannot establish engagement (14.1), and detecting it at scale requires off-task modeling (12.2). A perfectly engaged sample still leaves the fairness problem untouched since processing speed is the least general intelligence-loaded ability (15.1), depends on deliberately timed tasks (7.5), and has the highest motor/device/familiarity variance in K-4 children (13.4, 12.6, 9.11). Therefore, we must let response time supplement the ability estimate as jointly-modeled collateral data, gated behind verified engagement and tail-level subgroup checks (9.7, 9.11) and validated for this specific use (11.9) without a standalone speed score.

> **PROPOSED reframing note — AGENT-SUGGESTED for the RES-013 / D-015–D-016 re-orientation; the SPOVs above are YOURS. I have NOT edited your SPOV text — adopt, revise, or reject.**
>
> - **North-star figure (10K → 100K):** SPOV 3 (and its elaboration) references *"the 10K MIT ready kids by 8th grade goal"* twice. Per the re-orientation, that north-star has been **revised upward to ~100K MIT-ready** (a private [COMPANY CLAIM — verbal, Joe Liemandt], still unverified). *Proposed edit (yours to accept):* replace both "10K MIT ready kids by 8th grade" mentions with **"~100K MIT-ready north-star."** Direction of the SPOV is unchanged; the 10× scale simply makes the cohort-expansion logic more load-bearing and its guardrails (no score drop, no dilution, retained gains — 3.8, 5.7) more binding.
> - **SPOV 4 ↔ recat consistency (no change needed, just a pointer):** SPOV 4's "speed as engagement-gated collateral, never a standalone speed score" is exactly what the recategorized exam now implements — processing-speed cut as a domain and retained only as an engagement-gated measurement (see `PS_GAMEBASED_WARRANT.md`, Rec B; `METRIC_FRAMEWORK.md`). No SPOV edit implied; your DOK 4 already anticipates the build.

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

### Angrist, Pathak, Imberman, Dobbie, Fryer, Card, Giuliano; Bui, Craig & Imberman
- **Who:** Causal-inference economists studying exam schools, gifted programs, lotteries, and screening reforms.
- **Focus:** Designs that separate program effect from selection — RD, lottery ITT, universal screening — and where effects are null or heterogeneous.
- **Why Follow:** They are the principal independent check on selected-cohort success stories.
- **Where:** [Abdulkadiroğlu, Angrist & Pathak (2014)](https://onlinelibrary.wiley.com/doi/abs/10.3982/ECTA10266) | [Bui, Craig & Imberman (2014)](https://www.aeaweb.org/articles?id=10.1257/pol.6.3.30) | [Card & Giuliano (2016)](https://www.pnas.org/doi/10.1073/pnas.1605043113)

### Duckworth, Dweck, Yeager; Credé, Sisk, Poropat, Mammadov, Guez
- **Who:** Noncognitive-trait and intervention researchers plus meta-analytic skeptics.
- **Focus:** Grit, mindset, and conscientiousness as predictors or interventions — and where evidence is weak or context-specific.
- **Why Follow:** They constrain any claim that motivation can replace or cleanly supplement ability screening at the gifted tail.
- **Where:** [Credé, Tynan & Harms (2017)](https://pubmed.ncbi.nlm.nih.gov/27845531/) | [Yeager et al. (2019)](https://www.nature.com/articles/s41586-019-1466-y)

## DOK 3: Insights

**Insight 1 - GT's selection process directly hinders measuring program effect**
- GT school admits kids in the top percentile of CogAT scores (5.3) and are willing to pay their $25K tuition fee (5.3, 6.3). Critics argue that this barrier makes measuring the program effect unreliable because naturally gifted students will likely excel, therefore skewing the data toward high-achieving scores. In turn, the results will have a confirmation bias (5.4). For example, if a student were to spend the same amount on tutoring services, it's possible their MAP score may outperform a GT School student.
**Insight 2 - CogAT's batteries are too narrow to identify the breadth of a gifted student's talents.**
- While the CogAT assesses verbal, nonverbal, and quantitative reasoning well, it lacks in other areas such as spatial reasoning (1.6), which may be key identifiers of giftedness. Thus, for qualities such as intrisic motivation and conscientiousness that cannot be measured with the CogAT (4.5), GT School's loses a substantial portion of admittable students from the selection effect.
**Insight 3 - The students right beneath the CogAT's minimum bar are the exact people who can help prove GT School's program effect.**
 - Studies support that individualized tutoring helps those falling behind the most (3.7, 4.4), but GT itself doesn't have the necessary control group (5.2, 5.4) to substantiate that claim GT says it helps capable but underserved students, but their statistics are supplemented by outside sourcing. They have not tested transfers to their gifted cohort (4.4), and the promise of GT's complete package (5.1) is hindered by screening out capable students through CogAT and tuition (5.3).
 **Insight 4 - GT’s extreme exclusivity is the driving force behind the “excellence gap” seen in so many G&T programs.**
- Studies show that tests like CogAT disproportionately select kids on race and class lines. Children’s test scores are closely and positively correlated to a family’s income starting as early as 2 years old (6.3) and even “culture-fair” tests fail to account for ELL/subgroup kids (6.2). Additionally, black and hispanic students have been selected less frequently by other GT programs despite demonstrating equivalent achievements and talents (6.1). As a result, the extremely restrictive CogAT cutoff and high tuition fee of GT school is likely to be driving the race/class gap come to be known as the “excellence gap" (5.4).
 **Insight 5 - Instead of diluting GT's edge by lowering the CogAT cutoff, GT School should utilize a capability-gated lottery system.**
 - While GT and Alpha School utilize the same timeback model (5.1), GT's uniqueness banks on its selective cohort of gifted students (5.6). Lowering the cutoff as suggested through local-norm/lower-threshold remedies (6.4) risks the marginal-admit pattern Bui found (3.7). A lottery bypasses this issue, broadening access without sacrificing the bar (5.1, 5.3).
**Insight 6 - A capability-based lottery will provide the necessary data to demonstrate GT's program effect separately from its selection effect.**
- By randomizing offers to a program, studies have shown that applicants balance both ability and motivation (3.9). On average, students perform ~0.35 SD/yr better, largest for those behind (3.9, 3.7). Critiques on the small cohorts can be solved through pooling data over the years, fitting the voucher ramp (5.5). This plans around ~0.10-0.20 SD effects (4.4, 3.7), with noninferiority as a separate test (3.8). The school's current "2.6x growth" claim recalculates to ~1.69x math/1.54x reading in comparison to public matched completers with no counterfactual (5.2).
**Insight 7 - SSP's 2026 lottery systems demonstrates the design is possible and why research consent must be prioritized.**
- Currently, SSP's selection process goes through a contextual review, qualified pool, randomized offers, and waitlist comparison (3.10). However, conditions lottery exploit research consent (ex: if students decline, they lose their spot on the program waitlist), which Jenkins (2023) calls coercive (3.10). The new proposed design must keep the two structurally separate, meaning refusing research does not affect the student's admission inputs/outputs.
**Insight 8 - Response time is a valid ability assessor only when engagement is verified, speed and accuracy are modeled jointly, and the measured metric is information comprehension rather than raw item time.**
- Raw speed isn't directly interpretable for three reasons. Firstly, disengaged children "rapid-guess," producing fast responses that carry no signal, so effort must be detected and filtered (13.8). Our DOK 2 Knowledge Tree says that response time alone cannot certify engagement (14.1), and catching it at scale requires off-task detection (12.2). Even for a focused child, a fast answer is ambiguous under the speed-accuracy trade-off, becoming a reliable metric only when time and accuracy are *both* taken into account (13.8). In examples where speed does carry ability signals, it lives in information-uptake efficiency rather than raw clock time.
**Insight 9 - Response consistency across similar questions is a broadly applicable indicator of ability at the tails, making it a strong measurement to track for gifted screen tests.**
- One of the most general measurements of cognitive ability is response consistency. The variability in a child's response times to similar difficulty questions is associated with higher measured ability across diverse tasks, ages, and samples (13.9). This method is also able to statistically remove "aberrant responses" to avoid biasing against distractions, boredom/disengagement, and potentiall even students with learning disabilities like ADHD (to be proven) (13.10). At the tail of the scores, fixed form accuracy measurements become worse abilities of measurement as they cluster against a ceiling or common-knowledge boundary (8.1, 9.1). In constrast, continuous signals like consistency provide far more variability between applicants, allowing for more granular distinctions to be made between candidates for scoring and admissions purposes (13.8, 14.1). Of course, this requires the kid to be engaging with the exam content to be an accurate measurement, which is why test design will play a big part in whether this metric performs well in measuring giftedness for the  K-8 target demographic (13.9).
**Insight 10 - Verifying engagement removes noise in reference to accuracy and timing, but it doesn't address bias. Thus, accounting for speed must also clear the same tail and subgroup fairness bar as the score itself.**
- Processing speed is the least general intelligence ability and is deliberately stripped from a g-composite, so speed doesn't mask reasoning (15.1). Timed tasks make speed the construct (7.5), with their motor, device, adn familiarity variance the highest among young children (13.4, 12.6). Because a 1-2% top percentile cutoff sits where biases are prominent, a speed component would need the same measurement invariance and subgroup error checks as the reasoning score (9.7, 9.11) and data validation for its use (11.9) before factoring into admission scores.

## DOK 2: Knowledge Tree

### Overall Summary

CogAT-class measures capture developed verbal, quantitative, and nonverbal reasoning and have meaningful predictive validity, but a one-shot fixed-form cut is a weak proxy for a stable, complete gifted-capability construct. The factual record shows tail error, rank instability, false negatives created by gates and combination rules, missed spatial talent, and unequal access; it also shows that universal, multiple-measure screening can improve identification without abandoning a capability standard. Any improvement claim must be tied to a defined operating point and metric—conditional SEM/reliability, relative efficiency at the cut, false-negative rate, classification consistency, PR-AUC/precision@k, and subgroup DTF/error rates—not a vague claim of “2× validity.” Those metrics are still invalid if the two tests lack a common calibration/comparison design or if "true gifted" labels are observed only for children the old screen selected.

The available technical remedies differ in maturity and risk. CAT/MST, above-level testing, repeated measurement, compensatory decision rules, spatial breadth, and DIF/DTF monitoring have plausible roles, but a CAT's real tail quality depends on its bank depth, estimator, exposure control, stopping rule, calibration uncertainty, and age-appropriate standardized delivery. Child game-assessment studies now show genuine but usually low-to-medium convergence with traditional tests; they still do not validate high-stakes K–8 gifted identification. Engagement can reduce burden or anxiety but is not validity, while gaming familiarity, device/motor access, rewards, interface load, and task misunderstanding can themselves become construct-irrelevant variance.

Selected-cohort outcomes cannot separate ability, family resources, applicant motivation, and program effect. SMPY establishes long-run predictive validity, not a program counterfactual; RD and lottery evidence shows selective programs can have null, positive, or heterogeneous effects depending on population, curriculum, comparison, and outcome. Card & Giuliano's positive achievement-rank RD alongside an essentially null IQ-threshold RD further shows that predicting high standing is not the same as identifying who benefits. A future capability-gated lottery may be a strong design only under genuine scarcity, independent oversight, preregistration, high-ceiling outcomes, adequate follow-up/power, and a firewall that keeps research choice from changing admission rights.



### Category 1: Why GT School's CogAT Screen May Be Too Strict — The False-Negative Problem in Cognitive Selection

*This category assembles the education-specific, statistical evidence that a single cognitive-ability screen (CogAT at ~90th percentile) systematically misses students who could reach elite achievement (1.1–1.4), the steelman counterargument for why cognitive screening is nonetheless defensible (1.5), and a further, purely ability-based false negative — the under-selection of spatial talent (1.6). The formal causal-inference machinery that justifies the design itself is in Category 3.6; the distributional consequences of the screen are in Category 6.*

- **Subcategory 1.1: Highly correlated tests identify different students — one screen misses most of the "best" kids**
  - **Source:** Lohman (2005); Lohman & Gambrell (2012)
    - **DOK 1 — Facts:**
      - Lohman, D. F. (2005), "An Aptitude Perspective on Talent: Implications for Identification of Academically Gifted Minority Students," *Journal for the Education of the Gifted*, 28(3/4), 333–360 — using the joint ITBS/CogAT national standardization (~14,000 students/grade, grades 3–6): of students in the **top 3% on ITBS Reading**, the **CogAT Composite identifies only 32%**, the CogAT Verbal battery 35%, and the **CogAT Nonverbal battery only 18%** (even the ITBS Composite catches just 54%).
      - Lohman (2005) states: "correlations generally imply far less agreement between scores than most people think, especially for extreme scores." (CogAT Composite ↔ ITBS Reading r = .79; CogAT Nonverbal ↔ Reading r = .62.)
      - Lohman, D. F., & Gambrell, J. L. (2012), "Using Nonverbal Tests to Help Identify Academically Talented Children," *Journal of Psychoeducational Assessment*, 30(1), 25–44 — "large discrepancies between even highly correlated abilities become increasingly common at the extremes"; CogAT Nonverbal SEM ≈ 3.7 (scale SD = 16), so a student's true-score band straddles any single cutoff.
    - **DOK 2 — Summary:** A single cognitive screen does not identify "the" able students; it identifies the subset that one test happens to rank highly, and at the extreme tail even tests correlated .6–.8 disagree sharply. On these numbers a CogAT-composite cutoff at the 90th percentile would pass over the majority of children who are genuinely top performers on an achievement criterion, and measurement error around the cutoff makes any single pass/fail line partly arbitrary.
    - **Link to source:** [https://files.eric.ed.gov/fulltext/EJ746059.pdf](https://files.eric.ed.gov/fulltext/EJ746059.pdf) | [https://library.scottbarrykaufman.com/uploads/2013/04/Lohman-Gambrell-2012.pdf](https://library.scottbarrykaufman.com/uploads/2013/04/Lohman-Gambrell-2012.pdf)
- **Subcategory 1.2: A one-time childhood score is a moving target — early rank does not predict later rank**
  - **Source:** Lohman & Korb (2006) / Martin (1985); Ramsden et al. (2011); Kelley's regression-to-the-mean (Maassen 2000)
    - **DOK 1 — Facts:**
      - Lohman, D. F., & Korb, K. A. (2006), "Gifted Today but Not Tomorrow? Longitudinal Changes in Ability and Achievement During Elementary School," *Journal for the Education of the Gifted*, 29(4), 451–484 — approximately **half** of students in the top 3% in one year do not remain there the next year; only **~35–40%** remain top-3% from grade 3 to grade 8 (about 60–65% fall out over that interval).
      - Ramsden, S., et al. (2011), "Verbal and non-verbal intelligence changes in the teenage brain," *Nature*, 479, 113–116 — individual IQ shifted by **−20 to +23 points (verbal)** and −18 to +21 (full-scale) over ~3.5 years; ~33% of teens changed full-scale IQ beyond the 90% confidence interval; 21% shifted verbal IQ ≥15 points (≥1 SD). The changes tracked structural brain changes (real, not measurement noise).
      - Regression to the mean: because any test has imperfect reliability, a group selected for extreme scores drifts toward the mean on retest by an amount proportional to (1 − reliability) — the statistical mechanism behind the fall-out above (Kelley's formula; verified anchor: Maassen, G. H. (2000), *Psychometrika*, 65(2), 187–197).
    - **DOK 2 — Summary:** The rank a child holds on a one-time test in early childhood is a weak guide to the rank they will hold years later — both because ability itself changes through adolescence and because extreme early scores partly reflect measurement luck that regresses. An admission screen applied once, at entry, locks in a snapshot that a large fraction of eventual high achievers would fail at that moment even if they would clear it later.
    - **Link to source:** [https://files.eric.ed.gov/fulltext/EJ746292.pdf](https://files.eric.ed.gov/fulltext/EJ746292.pdf) | [https://www.nature.com/articles/nature10514](https://www.nature.com/articles/nature10514) | [https://doi.org/10.1007/BF02294373](https://doi.org/10.1007/BF02294373)
- **Subcategory 1.3: The gatekeeping stage itself manufactures false negatives**
  - **Source:** McBee, Peters & Miller (2016); McBee, Peters & Waterman (2014); Peters et al. (2019)
    - **DOK 1 — Facts:**
      - McBee, M. T., Peters, S. J., & Miller, E. M. (2016), "The Impact of the Nomination Stage on Gifted Program Identification," *Gifted Child Quarterly*, 60(4), 258–278 — simulation shows that requiring a screening/nomination gate before testing means "a large proportion of gifted students being missed"; under commonly implemented conditions the **false-negative rate can easily exceed 60%**. A screening stage can only lose students, never recover them.
      - McBee, M. T., Peters, S. J., & Waterman, C. (2014), "Combining Scores in Multiple-Criteria Assessment Systems: The Impact of Combination Rule," *Gifted Child Quarterly*, 58(1), 69–89 — the combination rule drives who qualifies: an "and" (conjunctive) rule minimizes the identified pool and maximizes false negatives; the compensatory "mean" rule is the most accurate.
      - Peters, S. J., et al. (2019), "Effect of Local Norms on Racial and Ethnic Representation in Gifted Education," *AERA Open*, 5(2) — switching from a single national cutoff to local norms changes which students qualify.
    - **DOK 2 — Summary:** Even holding the test fixed, the *structure* of a selection process — a hard gate, a conjunctive "must clear the bar on this one test" rule, a single national cutoff — is itself a large source of false negatives, independent of any child's true ability. GT School's single-CogAT-cutoff gate is precisely the configuration this literature identifies as maximizing missed students.
    - **Link to source:** [https://journals.sagepub.com/doi/abs/10.1177/0016986216656256](https://journals.sagepub.com/doi/abs/10.1177/0016986216656256) | [https://journals.sagepub.com/doi/10.1177/0016986213513794](https://journals.sagepub.com/doi/10.1177/0016986213513794) | [https://journals.sagepub.com/doi/10.1177/2332858419848446](https://journals.sagepub.com/doi/10.1177/2332858419848446)
- **Subcategory 1.4: Documented talent loss — the pool feeding the screen is already leaking, hardest for the disadvantaged**
  - **Source:** Wyner, Bridgeland & DiIulio (2007), *Achievement Trap*; Plucker et al. (excellence gap)
    - **DOK 1 — Facts:**
      - Wyner, J. S., Bridgeland, J. M., & DiIulio, J. J. (2007), *Achievement Trap: How America Is Failing Millions of High-Achieving Students from Lower-Income Families*, Jack Kent Cooke Foundation & Civic Enterprises — "more than 3.4 million K-12 students achieving in the top quartile academically come from families earning less than the median income."
      - *Achievement Trap*: of lower-income students in the top reading quartile as first graders, only 56% remained in it by fifth grade (vs. 69% of higher-income) — i.e., ~44% fell out vs. ~31%.
      - *Achievement Trap*: among students *not* in the top quartile in first grade, only ~7% of lower-income students rose into it by fifth grade (math and reading), vs. 16–17% of higher-income students — lower-income high-potential students rarely rise in; the report attributes the loss to low-expectation school environments, not lack of ability.
      - Excellence-gap data (Plucker et al.): on NAEP Grade 4 math, roughly 3% of lunch-assistance students reached the "Advanced" tier vs. ~14% of others, a gap that has persisted across administrations.
    - **DOK 2 — Summary:** Before GT School ever applies its screen, the population of "already-demonstrated" high performers has been thinned by years of unequal environments — able students, disproportionately lower-income, fall out of or never enter the measured top tier, and the report ties this to opportunity, not ability. A screen that selects on demonstrated standing therefore inherits that prior loss, systematically excluding exactly the students whose ceiling was never fairly tested.
    - **Link to source:** [https://www.jkcf.org/research/achievement-trap-how-america-is-failing-millions-of-high-achieving-students-from-lower-income-families/](https://www.jkcf.org/research/achievement-trap-how-america-is-failing-millions-of-high-achieving-students-from-lower-income-families/) | [https://fordhaminstitute.org/national/commentary/achievement-trap-how-america-failing-millions-high-achieving-students-lower](https://fordhaminstitute.org/national/commentary/achievement-trap-how-america-failing-millions-high-achieving-students-lower)
- **Subcategory 1.5: Counterargument — the case FOR cognitive screening (steelman)**
  - **Source:** Deary et al. (2007); Card & Giuliano (2016); Grissom & Redding (2016); Lohman (2005); Makel et al. (2016); Hobart (in Segan / Reason 2026)
    - **DOK 1 — Facts:**
      - Deary, I. J., Strand, S., Smith, P., & Fernandes, C. (2007), "Intelligence and educational achievement," *Intelligence*, 35(1), 13–21 — in a prospective study of >70,000 children, a cognitive test (CogAT) at age 11 correlated **r ≈ .69 (observed; .81 latent)** with GCSE educational achievement at 16; *g* explained ~59% of variance in mathematics. Cognitive ability is among the strongest single early predictors of later achievement.
      - Card & Giuliano (2016, PNAS): replacing referral with **universal** cognitive screening raised gifted identification of disadvantaged students **+174%**, Hispanic **+118%**, Black **+74%** — an objective test, applied to everyone, surfaced far *more* underrepresented talent than human referral. (Same study appears in 3.3 and Category 6.)
      - Grissom, J. A., & Redding, C. (2016), "Discretion and Disproportionality," *AERA Open*, 2(1) — at identical achievement, Black students were assigned to gifted programs about *half* as often as White peers; a test-based rule removes some of that discretionary human bias.
      - Lohman (2005) is a *proponent* of aptitude testing done well — using local norms and multiple measures — not an opponent of testing per se.
      - Makel, M. C., Kell, H. J., Lubinski, D., Putallaz, M., & Benbow, C. P. (2016), "When Lightning Strikes Twice: Profoundly Gifted, Profoundly Accomplished," *Psychological Science*, 27(7), 1004–1018 — above-level ability testing at age 12 predicted exceptional attainment (doctorates, tenure, patents) by ~age 40, validating early aptitude identification.
      - GT School's documented position, via Pamela Hobart (in Segan, *Reason*, 2026): "the way you actually find very high-ability learners falling through the cracks is you just standardized-test everyone"; she argues moving to "multiple measures" risks omitting high-IQ students who don't display leadership or aren't nominated. *(No documented statement from Joe Liemandt or MacKenzie Price crediting CogAT specifically with a positive impact was located.)*
    - **DOK 2 — Summary:** The honest counterweight to 1.1–1.4 is that cognitive-ability testing is among the best-validated single predictors of achievement, and that a standardized test applied *universally* is more equitable than the subjective referral it replaces — the Card & Giuliano result shows the test *widened* access rather than narrowing it. Notably, the defensible pro-screening positions on record (Lohman; Hobart) do not defend a single fixed cutoff but rather universal testing combined with multiple measures — which locates the real disagreement at *single-cutoff gate vs. universal-screen-plus-multiple-measures*, not test vs. no test.
    - **Link to source:** [https://doi.org/10.1016/j.intell.2006.02.001](https://doi.org/10.1016/j.intell.2006.02.001) | [https://www.pnas.org/doi/10.1073/pnas.1605043113](https://www.pnas.org/doi/10.1073/pnas.1605043113) | [https://doi.org/10.1177/2332858415622175](https://doi.org/10.1177/2332858415622175) | [https://doi.org/10.1177/0956797616644735](https://doi.org/10.1177/0956797616644735)
- **Subcategory 1.6: The Screen Misses an Entire Ability Dimension — Spatial Talent**
  - **Source:** Wai, Lubinski & Benbow (2009); Kell & Lubinski (2014)
    - **DOK 1 — Facts:**
      - Wai, J., Lubinski, D., & Benbow, C. P. (2009), "Spatial Ability for STEM Domains: Aligning Over 50 Years of Cumulative Psychological Knowledge Solidifies Its Importance," *Journal of Educational Psychology*, 101(4), 817–835 — on Project Talent (**N > 400,000**, 11-year longitudinal tracking): spatial ability is a robust predictor of STEM achievement and attainment *over and above* math and verbal ability.
      - Talent identification restricted to math/verbal measures **misses roughly 50% of the top 1% in spatial ability**; approximately **70% of the spatial top 1% do not fall in the math or verbal top 1%** (Lubinski/Benbow analyses; corroborated in the SMPY top-0.01% sample).
      - Ability *level* predicts the *magnitude* of achievement; ability *pattern* (a spatial>verbal tilt plus math) predicts its *domain* (STEM).
    - **DOK 2 — Summary:** Even granting the case for cognitive screening (1.5), a verbal/quant-weighted composite systematically overlooks an entire, well-validated ability dimension: spatial reasoning. Because roughly half of the spatially most able students are invisible to math/verbal talent searches, a CogAT-style cutoff misses a large pool of exactly the profile most predictive of STEM attainment — a false negative that is about *ability breadth*, not motivation, and one a multi-measure screen (including spatial) would recover.
    - **Link to source:** [https://my.vanderbilt.edu/smpy/](https://my.vanderbilt.edu/smpy/) | [https://gwern.net/doc/iq/high/smpy/2014-kell.pdf](https://gwern.net/doc/iq/high/smpy/2014-kell.pdf)



### Category 2: SMPY as a Design (the anchor literature)

*General idea: SMPY (the Study of Mathematically Precocious Youth) is a 50-year longitudinal study that identified gifted 12–13-year-olds by "above-level" testing (giving them the SAT early) and tracked them for decades. It is the anchor evidence that **ability measured young really does predict later achievement** — the strongest case *against* the "screen too strict / selection ≠ program" thesis, so any counterfactual design must confront it rather than wish it away. It is also, by the authors' own admission, an *observational* design that cannot separate program from selection (2.4).*

- **Subcategory 2.1: The Selection Mechanism & Cohort Structure**
  - **Source:** Lubinski & Benbow (2006)
    - **DOK 1 — Facts:**
      - SMPY founded by Julian C. Stanley, Sept. 1, 1971, Johns Hopkins; selection via *above-level* testing — administering the SAT to 12–13-year-olds to discriminate "the able from the exceptionally able."
      - Five cohorts, >5,000 participants, identified 1972–1997; planned 50-year longitudinal design (follow-ups at ages 18, 23, 33, 50, 65). Now directed by David Lubinski & Camilla Benbow at Vanderbilt.
      - Cohort cutoffs (top-X-in-ability by age 13): Cohort 1 (1972–74) ≈ top 1% (SAT-M ≥ 390 or SAT-V ≥ 370); Cohort 2 ≈ top 0.5% (SAT-M ≥ 500 or SAT-V ≥ 430); Cohort 3 ≈ top 0.01% (SAT-M ≥ 700 or SAT-V ≥ 630); Cohort 4 ≈ top 3% screen; Cohort 5 = graduate students in top-15 STEM programs (not SAT-selected).
    - **DOK 2 — Summary:** SMPY's power comes from a sharp, quantified selection rule (a single above-level SAT at 12–13) applied to talent-search volunteers, producing cohorts stratified by ability level. The design is a prospective longitudinal tracking of a *selected* pool — the selection is transparent, but **participants first self-selected into talent searches**, so the sample is not a random draw of high-ability youth.
    - **Link to source:** [https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00019.x](https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00019.x) | [https://my.vanderbilt.edu/smpy/](https://my.vanderbilt.edu/smpy/)
- **Subcategory 2.2: Comparison-Group Sub-Analyses (SMPY's own counterfactual moves)**
  - **Source:** Swiatek & Benbow (1991); Lubinski & Benbow (2006) within-cohort analyses
    - **DOK 1 — Facts:**
      - Swiatek, M. A., & Benbow, C. P. (1991), "A ten-year longitudinal follow-up of ability-matched accelerated and unaccelerated gifted students," *Journal of Educational Psychology*, 83, 528–538 — an **ability-matched** accelerated-vs-non-accelerated comparison (quasi-experimental, not randomized).
      - Lubinski & Benbow (2006) report within-top-1% dose-response: splitting participants into top vs. bottom SAT-M quartiles yields divergent outcomes — ability differences *inside* the top 1% still predict divergence.
      - Reported gradient: ~30% doctorate attainment for those scoring ≥500 SAT-M at 13 vs. ~50% for those ≥700.
    - **DOK 2 — Summary:** SMPY never randomized anyone to "gifted" status or to acceleration; its comparisons rely on *matching* accelerated to non-accelerated students of equal measured ability. Matching controls measured ability but leaves motivation and family factors uncontrolled — the same limitation any matched GT School design will face.
    - **Link to source:** [https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00019.x](https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00019.x)
- **Subcategory 2.3: Predictive-Validity Findings (ability measured young)**
  - **Source:** Kell, Lubinski & Benbow (2013); Bernstein, Lubinski & Benbow (2019)
    - **DOK 1 — Facts:**
      - Kell, H. J., Lubinski, D., & Benbow, C. P. (2013), "Who Rises to the Top? Early Indicators," *Psychological Science*, 24(5), 648–659 — N=320 identified before age 13 in the top 0.01%, assessed by age 38: 44% held doctorates (vs. ~2% U.S. base rate), ~15% held ≥1 patent (vs. ~1%), >11% held university tenure.
      - Bernstein, B. O., Lubinski, D., & Benbow, C. P. (2019), "Psychological Constellations Assessed at Age 13 Predict Distinct Forms of Eminence 35 Years Later," *Psychological Science*, 30(3), 444–454 — ability/preference *profiles* at 13 predicted distinct forms of eminence at ~50.
    - **DOK 2 — Summary:** SMPY is the strongest evidence that a single ability measure taken young has real, long-range predictive validity, and that differences persist even within the extreme tail. This is the empirical case *against* this thesis — it indicates that admitting on ability really does forecast who succeeds — and any counterfactual design must confront it head-on rather than wish it away.
    - **Link to source:** [https://pubmed.ncbi.nlm.nih.gov/23531483/](https://pubmed.ncbi.nlm.nih.gov/23531483/) | [https://pmc.ncbi.nlm.nih.gov/articles/PMC6419263/](https://pmc.ncbi.nlm.nih.gov/articles/PMC6419263/)
- **Subcategory 2.4: SMPY's Own Selection-Bias Limitations (design honesty)**
  - **Source:** Lubinski & Benbow (2006), authors' own caveats
    - **DOK 1 — Facts:**
      - On an AP-participation finding, the authors state the effect could operate "through self-selection or something intrinsic to the AP program itself" — i.e., they explicitly cannot separate program from selection.
      - Identification rests on a single SAT administration at 12–13; no random assignment to gifted status or to acceleration.
      - Cohorts skew by geography (Maryland, mid-Atlantic, Midwest) and era (pre-recentered SAT), limiting representativeness.
    - **DOK 2 — Summary:** The authors of the anchor study concede its central limitation in print: an observational design that selects on ability and lets participants self-select into programs cannot cleanly attribute outcomes to the program. That admission is the seam a credible-counterfactual argument can pry open — a credible design should do the one thing SMPY could not. *(The studies that* do *attribute growth to a program net of selection — Card & Giuliano; Booij — are in 3.7; they are the causal move SMPY structurally cannot make.)*
    - **Link to source:** [https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00019.x](https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00019.x)



### Category 3: Quasi-Experimental Designs That Separate Program from Selection

- **Subcategory 3.1: Regression Discontinuity at Admission Cutoffs (the exam-school evidence)**
  - **Source:** Abdulkadiroğlu, Angrist & Pathak (2014); Dobbie & Fryer (2014); Bui, Craig & Imberman (2014)
    - **DOK 1 — Facts:**
      - Abdulkadiroğlu, A., Angrist, J., & Pathak, P. (2014), "The Elite Illusion: Achievement Effects at Boston and New York Exam Schools," *Econometrica*, 82(1), 137–196 — fuzzy RD at exam-school cutoffs; large peer-quality jumps at the cutoff have "little causal effect on test scores or college quality."
      - Dobbie, W., & Fryer, R. (2014), "The Impact of Attending a School with High-Achieving Peers: Evidence from the New York City Exam Schools," *AEJ: Applied Economics*, 6(3), 58–75 — just-eligible NYC applicants get peers 0.17–0.36 SD higher and 6.4–9.5 pp less likely to be Black/Hispanic, yet see little impact on achievement or college outcomes.
      - Bui, S., Craig, S., & Imberman, S. (2014), "Is Gifted Education a Bright Idea? Assessing the Impact of Gifted and Talented Programs on Students," *AEJ: Economic Policy*, 6(3), 30–62 — the final journal article combines a fuzzy RD around a multidimensional eligibility surface with a separate randomized magnet-school offer design. Eligibility had two routes through achievement, NNAT, grades, recommendations, and contextual points; the RD therefore reconstructed each student's distance to a three-dimensional qualification surface rather than using a final total alone.
      - Bui's RD treatment was not merely "better peers, same curriculum": crossing the eligibility boundary increased peer achievement by about 0.27–0.32 SD, added approximately 1.25 advanced Vanguard classes, and exposed students to a district-described deeper/project-based curriculum. After about 1.5 years, preferred controlled 2SLS estimates were −0.037 SD math, +0.049 reading, −0.015 language, +0.003 social studies, and −0.025 science (SEs about 0.07–0.08); the 95% intervals ruled out positive effects larger than roughly 0.11–0.18 SD by subject while still permitting small benefits or harms.
      - Splits by peer improvement, advanced-class exposure, gifted-class concentration, school type, and prior achievement produced no consistent positive pattern. These intensity analyses are suggestive rather than fully causal because the school attended can itself respond to eligibility.
      - Bui's magnet lottery asked a different question: 542 already-eligible applicants competed for two premier magnets; 394 were offered and 148 were not, while losers generally retained access to neighborhood gifted services. Lottery applicants were roughly 1 SD above the average gifted student and were less economically disadvantaged, showing that universal evaluation does not eliminate self-selection into an optional elite program. Preferred attendance-IV estimates were near zero in four subjects and +0.281 SD in science, but differential-attrition bounds included zero for science.
      - Crossing the ordinary gifted-eligibility boundary increased district retention by about 4.9 percentage points from a 76% baseline. That is a causal non-test-score outcome, not evidence of learning growth.
    - **DOK 2 — Summary:** The strongest causal studies reject a simple equation of selectivity with value added, but Bui sharpens the lesson: even a real shift into stronger peers, more advanced classes, and a reportedly differentiated curriculum produced no broad short-run standardized-test gain for marginally eligible students. The magnet design separately shows that universal screening can coexist with strong voluntary-application selection and that an elite-program comparison may estimate *intensity over ordinary gifted services*, not gifted education versus no gifted education. These local, short-run results do not establish that gifted services never work; they show that any causal claim must name the comparison, treatment package, follow-up population, and outcome.
    - **Link to source:** [https://onlinelibrary.wiley.com/doi/abs/10.3982/ECTA10266](https://onlinelibrary.wiley.com/doi/abs/10.3982/ECTA10266) | [https://www.aeaweb.org/articles?id=10.1257/app.6.3.58](https://www.aeaweb.org/articles?id=10.1257/app.6.3.58) | [https://www.aeaweb.org/articles?id=10.1257/pol.6.3.30](https://www.aeaweb.org/articles?id=10.1257/pol.6.3.30)
- **Subcategory 3.2: RD Identifies a *Local* Effect (the LATE limitation)**
  - **Source:** Imbens & Lemieux (2008); Lee & Lemieux (2010)
    - **DOK 1 — Facts:**
      - Imbens, G., & Lemieux, T. (2008), "Regression discontinuity designs: A guide to practice," *Journal of Econometrics*, 142(2), 615–635.
      - Lee, D., & Lemieux, T. (2010), "Regression Discontinuity Designs in Economics," *Journal of Economic Literature*, 48(2), 281–355.
      - RD estimates a Local Average Treatment Effect — the effect only for students *at the cutoff* — and is silent about *inframarginal* (well-above-cutoff) students.
    - **DOK 2 — Summary:** An RD around GT School's CogAT cutoff would answer "does GT School help the *marginal* admit?" — not "does it help its typical top student?" That distinction is decisive: a null at the margin (as the exam-school studies find) does not disprove an effect for the inframarginal, and an effect at the margin does not generalize upward. Whether RD is even the right primary design here hinges on which population we most care about.
    - **Link to source:** [https://doi.org/10.1016/j.jeconom.2007.05.001](https://doi.org/10.1016/j.jeconom.2007.05.001) | [https://www.aeaweb.org/articles?id=10.1257/jel.48.2.281](https://www.aeaweb.org/articles?id=10.1257/jel.48.2.281)
- **Subcategory 3.3: Universal Screening — Selection Is Too Restrictive**
  - **Source:** Card & Giuliano (2016)
    - **DOK 1 — Facts:**
      - Card, D., & Giuliano, L. (2016), "Universal screening increases the representation of low-income and minority students in gifted education," *PNAS*, 113(48), 13678–13683.
      - A large Florida district switched from referral-based to *universal* second-grade screening (NNAT); odds of gifted identification rose ~45% overall, with increases of ~+118% (Hispanic), +74% (Black), and +174% (disadvantaged, under a lower IQ ≥ 116 threshold) — with no change in eligibility standards.
      - Pre-program, 13 schools had zero gifted third-graders; post-program all 140 had ≥1.
      - Among disadvantaged students newly identified because of universal screening, **20% had IQ ≥ 130**; the newly surfaced group was not composed only of marginal scorers. Gifted enrollment also became much less concentrated: the share of schools containing half of all gifted students rose from **18% before screening to 57% after**.
    - **DOK 2 — Summary:** When the *filter* changed but the *bar* did not, the system found large numbers of qualified gifted students it had previously missed — disproportionately poor and minority. This is direct evidence that conventional gifted selection is systematically too narrow, and it supports the premise that GT School's ability screen may exclude admissible students who would succeed if let in.
    - **Link to source:** [https://www.pnas.org/doi/10.1073/pnas.1605043113](https://www.pnas.org/doi/10.1073/pnas.1605043113)
- **Subcategory 3.4: Matched-Comparison & Propensity-Score Designs (and their ceiling)**
  - **Source:** Rosenbaum & Rubin (1983); Steenbergen-Hu, Makel & Olszewski-Kubilius (2016); Cheung & Slavin (2016)
    - **DOK 1 — Facts:**
      - Rosenbaum, P., & Rubin, D. (1983), "The Central Role of the Propensity Score in Observational Studies for Causal Effects," *Biometrika*, 70(1), 41–55 — matching on the propensity score removes bias due to *observed* covariates; requires strong ignorability (no unmeasured confounding).
      - Steenbergen-Hu, S., Makel, M., & Olszewski-Kubilius, P. (2016), "What One Hundred Years of Research Says About the Effects of Ability Grouping and Acceleration...," *Review of Educational Research*, 86(4), 849–899 — acceleration vs. same-age non-accelerated peers g ≈ 0.70; vs. older non-accelerated peers g ≈ 0.09 (n.s.).
      - Across **645 education evaluations**, Cheung & Slavin (2016) found mean effects of **+0.23 SD in quasi-experiments versus +0.16 SD in randomized trials**. This average difference does not prove every observational result is inflated, but it quantifies the design-level risk. *(DOI 10.3102/0013189X16656615.)*
    - **DOK 2 — Summary:** Matching and propensity-score designs can build an ability-comparable control group, but they only balance what is *measured* — the unobserved drivers we most worry about (motivation, parenting, family investment) stay uncontrolled, which is exactly the "smart kids were already smart" residual. The acceleration meta-analysis also shows the comparison-group choice (same-age vs. older peers) swings the effect from large to null, underscoring how much the counterfactual definition drives the answer.
    - **Link to source:** [https://academic.oup.com/biomet/article-abstract/70/1/41/240879](https://academic.oup.com/biomet/article-abstract/70/1/41/240879) | [https://doi.org/10.3102/0034654316675417](https://doi.org/10.3102/0034654316675417) | [https://doi.org/10.3102/0013189X16656615](https://doi.org/10.3102/0013189X16656615)
- **Subcategory 3.6: The Formal Identification Problem the Design Must Solve (why a counterfactual is required at all)**
  - **Source:** Holland (1986); Rubin (1974); Heckman (1979); Campbell & Stanley (1963)
    - **DOK 1 — Facts:**
      - Holland, P. W. (1986), "Statistics and Causal Inference," *Journal of the American Statistical Association*, 81(396), 945–960 — the "Fundamental Problem of Causal Inference": for any single unit one can observe the outcome under treatment *or* control, never both; coined "Rubin causal model" and "no causation without manipulation."
      - Rubin, D. B. (1974), "Estimating Causal Effects of Treatments in Randomized and Nonrandomized Studies," *Journal of Educational Psychology*, 66(5), 688–701 — a causal effect is the difference between potential outcomes.
      - Heckman, J. J. (1979), "Sample Selection Bias as a Specification Error," *Econometrica*, 47(1), 153–161 — non-random selection into a group is an omitted-variable/specification error that biases estimates.
      - Campbell, D. T., & Stanley, J. C. (1963), *Experimental and Quasi-Experimental Designs for Research* — statistical regression and selection are named threats to internal validity; the one-group pretest–posttest design is explicitly vulnerable.
    - **DOK 2 — Summary:** This is the formal reason "smart kids were already smart" is not a rhetorical jab but a design requirement: one never observes what a GT School student *would have* achieved without GT School, so any single-group result confounds the program with whatever made those students selectable. Every design in this category (RD, lottery, matching) is an attempt to construct that missing counterfactual credibly; without one, selection on unobservables biases the estimate in an unknown direction.
    - **Link to source:** [https://www.jstor.org/stable/2289064](https://www.jstor.org/stable/2289064) | [https://eric.ed.gov/?id=EJ118470](https://eric.ed.gov/?id=EJ118470) | [https://www.jstor.org/stable/1912352](https://www.jstor.org/stable/1912352)
- **Subcategory 3.7: Program Effect Net of Selection — When a Gifted Program *Actually* Raises Achievement (and When It Doesn't)**
  - **Source:** Card & Giuliano (2016); Booij, Haan & Plug (2016, 2017); reconciled against the nulls in 3.1
    - **DOK 1 — Facts:**
      - **Positive results:**
      - Card, D., & Giuliano, L. (2016), "Can Tracking Raise the Test Scores of High-Ability Minority Students?", *American Economic Review*, 106(10), 2783–2816 (administrative data on 70,058 third-graders across 140 schools; main RD sample n=4,144) — rank-based **fuzzy RD** on a separate high-achiever classroom entered by *prior-achievement* rank: full sample **≈+0.27 SD combined (+0.29 reading / +0.34 math)**; Black & Hispanic compliers **≈+0.4–0.5 SD** (larger in additional analyses); white/advantaged students ≈ **0**; math gains persisted into fifth grade and science also improved; no negative spillovers on non-participants.
      - In Card & Giuliano's *AER* (2016) analysis, the separate **IQ-threshold RD was essentially null**. The contrast is important but local: an achievement-rank boundary marked a group that benefited in that district, while the formal IQ boundary did not. Measured ability level and program benefit are therefore distinct empirical questions, not interchangeable definitions. *(DOI 10.1257/aer.20150484.)*
      - Booij, A. S., Haan, F., & Plug, E. (2016), "Enriching Students Pays Off…" (IZA DP 9757) — **fuzzy RD** at a gifted-program aptitude cutoff (N=3,127, one selective Dutch school): GPA **+0.38 SD math / +0.30 language / +0.44 other**; persists into university field choice. Companion paper (2017, IZA DP 10836; ~2,400 students; DiD+RD): ~**+0.2 SD** near the cutoff, with gains *growing* further above it.
      - Both attribute gains to a genuinely **differentiated curriculum + higher expectations** for underserved high-achievers — not merely to better peers.
      - **Evidence limitations:**
      - Card & Giuliano identifies a **local** effect at the *achievement* cutoff (not GT School's IQ/CogAT margin); the treatment is a **separate tracked classroom**, not an individualized AI-mastery model; the effect is **~zero for white/advantaged students**, so it does not generalize to all high-ability kids; the district is anonymized (widely identified as Broward County, FL).
      - Booij (2016/2017) are **IZA working papers**, not confirmed peer-reviewed journal articles at that stage (verify final publication before load-bearing use); the 2016 result is a **single already-selective school** (external validity); fuzzy-RD depends on bandwidth/first-stage assumptions; the 2017 per-subject SEs were not independently verified.
      - Both are **RD/quasi-experimental, not RCTs**; both measure GPA/test scores, **not** "elite readiness"; **neither tests an intensive AI-tutoring/2-hour model** — so they establish that a program effect is *possible* for high-ability students, not that GT School's specific model produces one.
      - **Counter-evidence:**
      - The RD studies in 3.1 — Bui, Craig & Imberman (2014, gifted magnet ≈ 0), Abdulkadiroğlu, Angrist & Pathak (2014, "Elite Illusion" ≈ 0), Dobbie & Fryer (2014, NYC exam schools ≈ 0) — find that **selective admission alone raises nothing** despite large peer-quality jumps.
      - *Issues with the counter-evidence:* each identifies only a **Local Average Treatment Effect at the admission margin** and is silent on inframarginal (well-above-cutoff) students. The exam-school studies and Bui's magnet lottery largely test peer/program intensity, but Bui's ordinary-service RD also changed advanced-course exposure and reportedly deepened/projectized the curriculum. Its null therefore cannot be dismissed as a pure "same curriculum" test. These studies show that selection, stronger peers, and modest differentiation do not guarantee broad short-run achievement gains; they do not establish that every differentiated intervention fails.
      - *Weak-identification upper bound:* the acceleration g≈0.70 (Steenbergen-Hu et al. 2016, 3.4) is **matched/observational only** — selection-inflated, structurally as vulnerable to "already gifted" as SMPY. Treat it as a ceiling, not a program-effect estimate.
    - **DOK 2 — Summary:** Card and Giuliano and Booij do the one thing SMPY cannot — attribute achievement growth to a high-achiever/gifted program net of selection — but Bui shows that stronger peers, more advanced courses, and modest curriculum differentiation can still yield a well-bounded short-run null at the eligibility margin. Program effects are therefore possible, not universal, and cannot be inferred from the label "gifted," from peer composition, or from differentiation alone. Population, instructional targeting, comparison condition, exposure, and outcome all matter; neither the positive 0.3–0.5 SD findings nor Bui's null transfers automatically to another program.
    - **Link to source:** [https://www.aeaweb.org/articles?id=10.1257/aer.20150484](https://www.aeaweb.org/articles?id=10.1257/aer.20150484) | [https://www.iza.org/publications/dp/9757](https://www.iza.org/publications/dp/9757) | [https://ideas.repec.org/p/iza/izadps/dp10836.html](https://ideas.repec.org/p/iza/izadps/dp10836.html)
- **Subcategory 3.8: The Causal-Identification and Outcome-Validity Stack**
  - **Source:** Angrist, Imbens & Rubin (1996); McCrary (2008); Oster (2019); VanderWeele & Ding (2017); Chetty, Friedman & Rockoff (2014) w/ Rothstein (2017); Betebenner (2009); Assouline & Lupkowski-Shoplik (2012); Bui, Craig & Imberman (2014); Kulik & Fletcher (2016); Bailey et al. (2017); Bastani et al. (2025); WWC Handbook v5.0 (2022); Nosek et al. (2018)
    - **DOK 1 — Facts:**
      - **Design strength (ranked):** random assignment balances observed and unobserved applicant traits in expectation within the randomized pool (Angrist, Imbens & Rubin 1996, *JASA* — IV/LATE). **RD** can identify a credible local effect at a protected cutoff when continuity/no-manipulation assumptions hold (McCrary 2008); **DiD/CITS** require parallel trends; **matching/propensity** balance observed covariates only, leaving motivation confounded.
      - **Sensitivity bounds (when randomization is impossible):** report how strong an unmeasured "motivation" confounder must be to overturn the result — Rosenbaum Γ; Oster (2019) δ (δ≥1 = robust); VanderWeele & Ding (2017) E-value.
      - **Outcome metric:** condition on prior achievement (value-added — Chetty, Friedman & Rockoff 2014, contested by Rothstein 2017; or Student Growth Percentiles — Betebenner 2009, which are *descriptive not causal*); reference growth to the student's **own multi-year baseline, not the national median** (MDRC) — but single-school precision is poor (minimum detectable effect ≈ 0.57–0.80 SD).
      - **Upper-tail validation (gifted-specific):** grade-level tests can cap gifted growth, so outcome precision must be checked at the top of the observed range (Assouline & Lupkowski-Shoplik 2012; SMPY rationale). Bui et al. inspected raw-score distributions and documented substantial headroom (RD means 58%–77% of the maximum; even the stronger lottery sample remained below 90% by subject) instead of presuming the Stanford test was adequate. **High-ceiling adaptive outcomes such as NWEA MAP** require analogous checks of upper-tail variance, maximum-score frequency, conditional SEM/precision, and matched administration in the evaluated cohort.
      - **Outcome validity beyond precision:** Kulik & Fletcher's 50-evaluation ITS review reported a median effect of 0.66 SD, but average effects were about 0.73 on locally developed tests versus 0.13 on standardized tests. Bastani et al.'s randomized high-school math study found unrestricted GPT raised assisted-practice grades 48% but lowered later unaided grades 17%; a hint-based tutor mitigated the unaided harm. Bailey et al. document that early intervention effects often fade and distinguish skill-building, opportunity-opening, and sustaining-environment pathways to persistence. A causal MAP effect therefore identifies an effect on MAP; delayed retention, transfer to unfamiliar tasks, and unaided performance are separate outcomes and claims.
      - **Standards the design must clear:** WWC Handbook v5.0 — only a low-attrition **RCT** "meets standards without reservations"; quasi-experiments need **baseline equivalence** (≤0.05 SD no adjustment / 0.05–0.25 SD adjust / >0.25 SD fails); analyze **intent-to-treat**; **pre-register** the primary outcome and analysis (Nosek et al. 2018); run **placebo/falsification tests** for residual selection.
      - **Noninferiority ≠ nonsignificance:** any claim that one group or service route performs no worse than another must be pre-specified as a **noninferiority/equivalence** test against a smallest-effect-of-interest margin (Lakens, Scheel & Isager 2018) and powered *separately* from the main effect — an ordinary nonsignificant difference does **not** establish equivalence.
    - **DOK 2 — Summary:** Isolating a program effect requires both an identification stack and an outcome-validity stack: (1) randomization or a valid local quasi-experiment; (2) a high-ceiling common outcome; (3) growth referenced to baseline and a comparison group; (4) intent-to-treat, preregistration, attrition controls, and bounded claims; and (5) sensitivity analysis when randomization is unavailable. Even a flawless counterfactual answers only the outcome measured. A positive MAP ITT would establish a MAP effect for the randomized population; broader claims about durable knowledge, transfer, unaided performance, or educational quality require separate evidence.
    - **Link to source:** [https://www.tandfonline.com/doi/abs/10.1080/01621459.1996.10476902](https://www.tandfonline.com/doi/abs/10.1080/01621459.1996.10476902) | [https://ideas.repec.org/a/taf/jnlbes/v37y2019i2p187-204.html](https://ideas.repec.org/a/taf/jnlbes/v37y2019i2p187-204.html) | [https://www.acpjournals.org/doi/abs/10.7326/M16-2607](https://www.acpjournals.org/doi/abs/10.7326/M16-2607) | [https://doi.org/10.1257/pol.6.3.30](https://doi.org/10.1257/pol.6.3.30) | [https://doi.org/10.3102/0034654315581420](https://doi.org/10.3102/0034654315581420) | [https://doi.org/10.1080/19345747.2016.1232459](https://doi.org/10.1080/19345747.2016.1232459) | [https://doi.org/10.1073/pnas.2422633122](https://doi.org/10.1073/pnas.2422633122) | [https://ies.ed.gov/ncee/wwc/Docs/referenceresources/Final_WWC-HandbookVer5_0-0-508.pdf](https://ies.ed.gov/ncee/wwc/Docs/referenceresources/Final_WWC-HandbookVer5_0-0-508.pdf) | [https://doi.org/10.1177/2515245918770963](https://doi.org/10.1177/2515245918770963)
- **Subcategory 3.9: Admission Lotteries — The Cleanest Counterfactual, What They Find, and the Sparseness/Power Trade-off**
  - **Source:** Cullen, Jacob & Levitt (2006); Angrist et al. (KIPP, 2012); Abdulkadiroğlu, Angrist, Narita & Pathak (2017); Weiland et al. (2024)
    - **DOK 1 — Facts:**
      - **Feasible and internally valid:** Cullen, Jacob & Levitt (2006), *Econometrica* — 194 randomized lotteries across 19 oversubscribed Chicago high schools; because lottery winners and losers among applicants are equivalent on average, outcome differences are causally attributable to the school, using pre-existing records.
      - **KIPP design and sample:** Angrist, Dynarski, Kane, Pathak & Walters (2012), "Who Benefits from KIPP?", pooled four KIPP Academy Lynn lotteries (2005–2008). The final article reports 629 raw applicants and a 446-student matched randomized analysis sample; its preferred models use 833 stacked student-test observations, not 833 independent students. About 67.9% were offered and 52.5% attended.
      - **KIPP estimands:** a randomized offer increased cumulative KIPP exposure at the test date by about 1.22 years. Preferred offer ITT/reduced-form effects were about +0.430 SD math and +0.164 ELA; offer-instrumented attendance effects were +0.352 SD math and +0.133 ELA per KIPP year. The latter are local attendance effects under IV assumptions, not the primary offer effect and not a network-wide KIPP average.
      - **KIPP heterogeneity and transfer limit:** effects were larger for lower-baseline, LEP, and SPED applicants; the baseline-score interaction was −0.111 in math and −0.167 in ELA, and ELA gains concentrated in the lowest baseline quartile. KIPP studied a voluntary, low-income urban applicant pool and a complete "No Excuses" school package, not a gifted-school population or adaptive software alone. It supports the design and a benefit-heterogeneity hypothesis, not a transferable expected effect size.
      - **KIPP follow-up:** statewide administrative testing retained about 85% of expected non-offered scores; differential follow-up was small and sensitivity analysis could not explain the large math effect. Studies that must collect comparison-group outcomes separately face a harder attrition problem.
      - **Other lottery effects:** Denver charter estimates were about 0.35–0.42 SD math and 0.18–0.22 writing. These effects are context-specific and should not be used as generic power inputs.
      - **The power problem — and the fix:** single small-school lotteries are often underpowered (most KIPP schools lacked enough applicants; null results reflected underpowering, not zero effect). The remedy is **design-based propensity ("DA-type") pooling across lotteries/cohorts**, which grew Denver's usable sample ~5× (from 462 to ~2,300). Accumulating a small lottery across multiple years is a legitimate way to reach adequate power.
      - A federal charter-school lottery evaluation needed **2,330 applicants across 36 oversubscribed middle schools** for publishable achievement estimates, while only a minority of schools were oversubscribed enough to enter the design. This is feasibility evidence for pooled lotteries and a warning that genuine excess demand is a non-transferable prerequisite. *(Gleason et al., 2010, NCEE 2010-4029, ERIC ED510573.)*
      - **Power must use independent planning values:** statistical power rises with effect size, but a company's advertised multiplier is not an empirical effect-size input. Evaluation planning should retain the independently grounded ~0.10–0.20 SD broad-outcome range and report imprecision rather than lowering the meaningful-effect threshold to fit enrollment.
      - **The complier ceiling:** even a valid lottery identifies a Local Average Treatment Effect only for *applicants/compliers*, who are systematically more advantaged than the general population (Weiland et al. 2024: complier neighborhood income far exceeded the applicant average). Results speak to the applicant pool, not to non-applicants.
    - **DOK 2 — Summary:** An offer lottery among equally eligible applicants can separate package effect from selection on both measured and unmeasured traits. KIPP shows why offer ITT and attendance LATE must remain distinct, why a complete school-package effect cannot identify one mechanism, and why effects from one population cannot become another program's assumed effect size. Pooling comparable cohorts can increase precision, but only with prespecified weights and stable estimands. Attrition, crossover, outcome comparability, upper-tail precision, and treatment-version drift remain explicit limitations.
    - **Link to source:** [https://pricetheory.uchicago.edu/levitt/Papers/schoolchoicelottery.pdf](https://pricetheory.uchicago.edu/levitt/Papers/schoolchoicelottery.pdf) | [https://doi.org/10.1002/pam.21647](https://doi.org/10.1002/pam.21647) | [https://cowles.yale.edu/sites/default/files/2022-09/d2080.pdf](https://cowles.yale.edu/sites/default/files/2022-09/d2080.pdf) | [https://journals.sagepub.com/doi/10.1177/23328584241231933](https://journals.sagepub.com/doi/10.1177/23328584241231933)
- **Subcategory 3.10: SSP 2026 — Qualified-Pool Lottery Prior Art and Consent Warning**
  - **Source:** SSP International official evaluation/application materials (2026); Abt Global study description via SSP; Jenkins (2023); *The Opportunity Cost of Compulsory Research Participation* (2020)
    - **DOK 1 — Facts:**
      - SSP's official 2026 process is: free application; traditional holistic/contextual review identifying students "who have the most to gain from and contribute to" the program; parental permission plus student assent; then a lottery assigning consenting qualified applicants to a program invitation or waitlist. The waitlist is the comparison group, and some waitlisted students may later receive offers.
      - SSP reported **720 participants in 2026 across 13 campuses and 20 sections**. Its FY2025 annual report separately reports **3,739 applications, a 16% admission rate, and 588 enrolled students**. The 2026 qualified/lottery-pool size is still unpublished; the often-repeated ~10,000 applicants and ~1,000 qualified figures remain unverified and are not evidence.
      - Abt Global conducts the evaluation under Abt's own IRB. Offered and waitlisted students take the same 60-minute pre/post surveys on scientific thinking and social-emotional skills; students are paid for survey time and may withdraw after the study starts without losing a program seat.
      - Before randomization, however, participation is an admission condition: SSP states that applicants who decline the study are excluded from both the program and waitlist while also describing participation as "completely your choice." No public preregistration, protocol, power analysis, lottery-pool size, or control-group size was located.
      - Jenkins (2023), writing before and without naming SSP, argues that offering lottery entry as the gateway/incentive for research participation compromises coercion-free informed consent because applicants may not know their odds and the mechanism exploits difficulty reasoning about small probabilities. A 2020 compulsory-participant-pool analysis likewise characterizes costly refusal alternatives as objectively coercive.
      - SSP's ability to expand and fund an external evaluation followed a roughly $200 million 2023 bequest and genuine seat scarcity. This documents feasibility under SSP's conditions; it does not establish feasibility for differently resourced programs.
    - **DOK 2 — Summary:** SSP is a live precedent for the sequence "contextual review → qualified pool → randomized scarce offers → comparison arm." It is simultaneously a warning against copying the implementation: SSP conditions entry to the admissions lottery on research consent, does not publish the information needed to assess power or preregistration, and relies on a consent-selected waitlist population. Ethically sound implementations keep eligibility and ordinary admission rights independent of research choice and treat SSP's resources and oversubscription as nontransferable context.
    - **Link to source:** [https://ssp.org/2026evaluation/](https://ssp.org/2026evaluation/) | [https://ssp.org/news/the-summer-science-program-begins-its-biggest-summer-yet/](https://ssp.org/news/the-summer-science-program-begins-its-biggest-summer-yet/) | [https://onlinelibrary.wiley.com/doi/full/10.1002/eahr.500165](https://onlinelibrary.wiley.com/doi/full/10.1002/eahr.500165) | [https://link.springer.com/article/10.1007/s11948-020-00232-2](https://link.springer.com/article/10.1007/s11948-020-00232-2)



### Category 4: The Motivation Hypothesis — Can Admission Select on Drive Instead of Prior Achievement?

*General idea: if a narrow ability test misses talent, could "drive" — grit, growth mindset, or conscientiousness — be a fairer or additional admissions signal? This category weighs the evidence: prior ability still predicts strongly with no plateau at the top, self-reported grit is weak and largely a relabeling of conscientiousness, and conscientiousness/self-discipline is the best-validated ability-independent predictor in the cited literature.*

- **Subcategory 4.1: Grit as a Selection Signal — the case for**
  - **Source:** Duckworth et al. (2007)
    - **DOK 1 — Facts:**
      - Duckworth, A., Peterson, C., Matthews, M., & Kelly, D. (2007), "Grit: Perseverance and Passion for Long-Term Goals," *JPSP*, 92(6), 1087–1101.
      - Grit accounted for ~4% of variance in success outcomes; predicted West Point Beast Barracks retention (1 SD higher grit → OR ≈ 1.62) and Spelling Bee performance, over and above IQ/SAT.
      - Grit–SAT correlation was slightly *negative* (r ≈ −.20): higher-scoring students were marginally *less* gritty.
    - **DOK 2 — Summary:** Duckworth's case is that a non-cognitive trait predicts high-stakes achievement independently of ability — and that the very highest testers are not the grittiest. If true, motivation is a legitimate, ability-orthogonal admissions signal, which is the foundation this thesis needs.
    - **Link to source:** [https://pubmed.ncbi.nlm.nih.gov/17547490/](https://pubmed.ncbi.nlm.nih.gov/17547490/)
- **Subcategory 4.2: Grit — the skeptical counter-evidence**
  - **Source:** Credé, Tynan & Harms (2017)
    - **DOK 1 — Facts:**
      - Credé, M., Tynan, M., & Harms, P. (2017), "Much Ado About Grit: A Meta-Analytic Synthesis of the Grit Literature," *JPSP*, 113(3), 492–511 (584 effect sizes; 88 samples; ~66,807 individuals).
      - Grit–academic-performance ρ ≈ .18 (weak); grit–conscientiousness ρ ≈ .84 (grit is largely a relabeling of conscientiousness).
      - Only the *perseverance-of-effort* facet (ρ ≈ .26) predicted performance; *consistency-of-interest* (ρ ≈ .10) added little; grit interventions likely have only weak effects.
    - **DOK 2 — Summary:** The largest synthesis finds grit is a weak predictor and barely distinct from an existing personality trait, and that only its effort component carries signal. For a motivation-based admissions rule, this is the load-bearing warning: a self-reported grit score would likely be too unreliable and too collinear with conscientiousness to defend — revealed effort may be the only admissible version.
    - **Link to source:** [https://pubmed.ncbi.nlm.nih.gov/27845531/](https://pubmed.ncbi.nlm.nih.gov/27845531/)
- **Subcategory 4.3: Growth Mindset — the effect concentrates in the "behind" students**
  - **Source:** Dweck / Blackwell et al. (2007); Sisk et al. (2018); Yeager et al. (2019)
    - **DOK 1 — Facts:**
      - Blackwell, L., Trzesniewski, K., & Dweck, C. (2007), "Implicit Theories of Intelligence Predict Achievement Across an Adolescent Transition," *Child Development*, 78(1), 246–263 — growth theory predicted an upward math trajectory; an intervention reversed a control-group grade decline.
      - Sisk, V., et al. (2018), "To What Extent and Under Which Circumstances Are Growth Mind-Sets Important to Academic Achievement? Two Meta-Analyses," *Psychological Science*, 29(4), 549–571 — overall mindset–achievement r ≈ .10; intervention d ≈ 0.08; but low-SES students d ≈ 0.34 and academically high-risk students d ≈ 0.19.
      - Yeager, D., et al. (2019), "A national experiment reveals where a growth mindset improves achievement," *Nature*, 573, 364–369 (N=12,490; 65 schools) — lower-achieving students gained +0.10 GPA points (95% CI [0.04, 0.16]); higher achievers ~0; advanced-math enrollment rose ~3 pp.
    - **DOK 2 — Summary:** Even the skeptical meta-analysis and the large national trial converge on a pattern that cuts *in favor* of this thesis: motivation-relevant interventions do little for high achievers but meaningfully help lower-achieving and disadvantaged students. The population where the effect is real is precisely the "behind" population GT School's ability screen excludes.
    - **Link to source:** [https://doi.org/10.1111/j.1467-8624.2007.00995.x](https://doi.org/10.1111/j.1467-8624.2007.00995.x) | [https://pubmed.ncbi.nlm.nih.gov/29505339/](https://pubmed.ncbi.nlm.nih.gov/29505339/) | [https://www.nature.com/articles/s41586-019-1466-y](https://www.nature.com/articles/s41586-019-1466-y)
- **Subcategory 4.4: Ability's Predictive Validity & the Catch-Up Mechanism**
  - **Source:** Schmidt & Hunter (1998); Sackett, Zhang, Berry & Lievens (2022); Robertson et al. (2010); Bloom (1984); Kulik, Kulik & Bangert-Drowns (1990)
    - **DOK 1 — Facts:**
      - Schmidt, F., & Hunter, J. (1998), *Psychological Bulletin*, 124(2), 262–274 — general mental ability is among the strongest predictors of performance (validity ≈ .51).
      - **Contested correction:** Sackett, Zhang, Berry & Lievens (2022) argue the artifact-distribution range-restriction corrections behind the familiar .51 estimate systematically overcorrect; their revised operational validity for cognitive ability is nearer **.31**. The two values answer differently corrected questions and should be reported together rather than treating .51 as settled. *(DOI 10.1037/apl0000994.)*
      - Robertson, K., Smeets, S., Lubinski, D., & Benbow, C. (2010), "Beyond the Threshold Hypothesis," *Current Directions in Psychological Science*, 19(6), 346–351 — ability *and* motivation/commitment are both independently necessary; ability does not cease to matter above a threshold.
      - Bloom, B. (1984), "The 2 Sigma Problem," *Educational Researcher*, 13(6), 4–16 — one-to-one tutoring with mastery learning ≈ 2 SD above conventional instruction; group mastery learning alone ≈ 1 SD. **Caveat (important):** Bloom's 2-sigma figure has **never been replicated** — it rests on small dissertation studies; realistic causally-identified tutoring effects are ~**0.30–0.42 SD** (Nickow, Oreopoulos & Quan 2024, meta-analysis of 96 RCTs; Cohen, Kulik & Kulik 1982 ≈ 0.33 SD). Treat "2 sigma" as an aspirational ceiling, not an expected effect.
      - Kulik, Kulik & Bangert-Drowns (1990), "Effectiveness of Mastery Learning Programs: A Meta-Analysis," *Review of Educational Research*, 60(2), 265–299 — mastery learning raised exam scores ≈ 0.52 SD on average, with *stronger* effects for weaker students. (Note: mostly matched/observational, not RCTs — see the tutoring-RCT benchmark above for the causally-identified figure.)
    - **DOK 2 — Summary:** Two facts sit in tension: ability is a genuinely strong predictor (so a motivation-only bet is risky), yet intensive individualized instruction — the mechanism GT School actually uses — produces its largest gains for weaker students. **Aligned or intensive tutoring evidence is often around ~0.3–0.4 SD** (not Bloom's unreplicated 2 SD), but independent broad standardized outcomes are typically smaller; **~0.10–0.20 SD is the appropriate evaluation and power-planning range** for those outcomes. The RCT base is drawn mostly from *struggling* students, so either magnitude for high-ability learners is a transfer hypothesis rather than a tested GT result. The design question is whether GT School's program is the *kind* of treatment for which the behind-but-motivated student is the highest-return population — a question only a purpose-built evaluation can answer.
    - **Link to source:** [https://doi.org/10.1037/0033-2909.124.2.262](https://doi.org/10.1037/0033-2909.124.2.262) | [https://doi.org/10.1177/0963721410391442](https://doi.org/10.1177/0963721410391442) | [https://doi.org/10.3102/0013189X013006004](https://doi.org/10.3102/0013189X013006004) | [https://doi.org/10.3102/00346543060002265](https://doi.org/10.3102/00346543060002265)
- **Subcategory 4.5: If Not "Motivation," What *Does* Predict Growth? Prior Ability + Conscientiousness**
  - **Source:** Guez et al. (2018); McManus et al. (2013); Poropat (2009); Mammadov (2021); Duckworth & Seligman (2005); Meyer et al. (2024)
    - **DOK 1 — Facts:**
      - **Prior ability keeps predicting, with no ceiling at the top.** Guez, Peyre, Le Cam, Gauvrit & Ramus (2018), *Intelligence* — in a representative French sample (**N=30,489**), the grade-6-IQ→grade-9-achievement slope barely changes when restricted to the top 2% (β=.11) or top 5% (β=.15); the relationship is essentially *linear*, with no threshold. McManus et al. (2013), "The Academic Backbone," *BMC Medicine* — prior attainment is the dominant autoregressive predictor (within-school year-to-year correlations ~0.73–0.75). (Cf. SMPY's within-top-1% gradients in 2.3.)
      - **The measurable, ability-*independent* lever is conscientiousness/self-discipline — not grit or mindset.** Poropat (2009), *Psychological Bulletin* (k=138, N=70,926): conscientiousness is the strongest Big Five predictor of achievement (corrected r=.22), rising to partial r=.24 controlling for intelligence, and it adds prediction (partial r=.17) even *after* controlling for prior GPA. Mammadov (2021) (267 samples, N=413,074): conscientiousness corrected ρ=.27. Duckworth & Seligman (2005), *Psychological Science*: self-discipline accounted for **>2× the variance of IQ** in adolescents' grades, incrementally after prior grades, achievement tests, and IQ.
      - **Conscientiousness appears to *synergize* with ability at the high end** (Meyer et al. 2024, *European Journal of Personality*, N=18,637: small interaction *amplifying* the ability→achievement link) — though this literature is mixed (compensatory effects found elsewhere).
    - **DOK 2 — Summary:** Prior ability and achievement remain the dominant predictors and do not plateau at the top. Conscientiousness/self-discipline is the best-validated ability-independent predictor in this literature, while "grit" is largely a noisier proxy. The conscientiousness evidence comes from general or mixed-ability samples; whether it retains incremental validity within an already-top-percentile cohort under range restriction remains an open question.
    - **Link to source:** [http://www.lscp.net/persons/ramus/docs/INTELL18B.pdf](http://www.lscp.net/persons/ramus/docs/INTELL18B.pdf) | [https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3827330/](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3827330/) | [https://gwern.net/doc/psychology/personality/conscientiousness/2021-mammadov.pdf](https://gwern.net/doc/psychology/personality/conscientiousness/2021-mammadov.pdf) | [https://journals.sagepub.com/doi/abs/10.1111/j.1467-9280.2005.01641.x](https://journals.sagepub.com/doi/abs/10.1111/j.1467-9280.2005.01641.x)



### Category 5: GT School / Alpha — The Program and the Selection Critique

*General idea: GT School as a case study — the gifted branch of Alpha School, roughly 2 hours/day of adaptive "core" software plus adult "guides," admitting students through a ~90th-percentile CogAT cutoff **and** private-school tuition. Its headline growth claims (e.g., "2.6× faster") are self-reported, un-audited, and recalculate lower from the company's own public data; the double filter (ability + ability-to-pay) and the missing counterfactual illustrate the selection-vs-program evidence problem.*

- **Subcategory 5.1: What the Program Is**
  - **Source:** Alpha School / 2 Hour Learning marketing [COMPANY CLAIM]; Reason (Segan, 2026) [INDEPENDENT]
    - **DOK 1 — Facts:**
      - Model: ~2 hours/morning of app-based adaptive "core" academics; afternoons for life-skills workshops. Adults are "guides," reportedly prohibited from direct instruction. [COMPANY CLAIM / INDEPENDENT]
      - Founders acknowledge the "AI" is adaptive-learning software (IXL/Khan-style), not an LLM chatbot; the math engine has shifted (IXL → Math Academy/TimeBack). [INDEPENDENT]
      - **Alpha vs. GT School — same model, different audience:** Alpha serves a *broad* ability range (MacKenzie Price describes catching students up "no matter where they are… 10th percentile or 98th percentile"), whereas GT School is the *gifted-only* branch, screening applicants with the CogAT at ~90th percentile (5.3). Same 2-hour/Timeback platform, different admitted population — so GT School's differentiation from its own sister school is precisely its exclusive focus on the top tier. [INDEPENDENT / COMPANY interview]
    - **DOK 2 — Summary:** GT School runs a compressed, software-paced academic model, and its underlying technology is adaptive courseware rather than novel AI. Its distinction from sister school Alpha is audience, not method: Alpha spans a broad ability range while GT School admits only the gifted tier. Any measured effect would therefore apply to a compound package — software, Guides, peers, workshops, and associated supports — rather than to Timeback alone, and changing platform versions complicate comparisons across years.
    - **Link to source:** [https://reason.com/2026/06/24/g-t-schools-bet-on-gifted-ed-cash-rewards-2-hours-of-ai-tutoring-no-lectures/](https://reason.com/2026/06/24/g-t-schools-bet-on-gifted-ed-cash-rewards-2-hours-of-ai-tutoring-no-lectures/) | [https://alpha.school/the-program/](https://alpha.school/the-program/)
- **Subcategory 5.2: The Outcome Claims (self-reported)**
  - **Source:** Alpha School program page [COMPANY CLAIM]; Reason (Segan, 2026)
    - **DOK 1 — Facts:**
      - "On average, Alpha students grow 2.6 times faster than peers on nationally normed MAP tests"; "the majority of students consistently outperform national averages"; "best students achieve up to 6.5x growth." [COMPANY CLAIM]
      - Marketing invokes "top 1–2% nationally" and a comparison to the "top 0.1% of schools globally" (Exeter/Dalton/Trinity) — the latter generated by feeding a MAP dataset into LLMs, not an audit. [COMPANY CLAIM]
      - Benchmark is NWEA MAP Growth (3×/year), which Alpha describes as an independent third-party test.
      - **The growth multiplier = observed RIT growth / projected RIT growth** (NWEA) — *not* a causal effect, "grade levels," "twice the knowledge," or a standardized effect size; NWEA warns it is skewed by outliers and small projected-growth denominators. [INDEPENDENT method note]
      - The strongest *public* descriptive artifact — Alpha's official 2024–25 NWEA report (fall–spring, 2020 norms, ~148 math / 151 reading usable-projection observations) — **recalculates to roughly 1.69x math and 1.54x reading**, on **matched completers only, with no entrant/leaver/attrition accounting and no untreated comparison**. So "**2.6x**" (and "up to 6.5x") remains an unaudited **company claim**, not a verified figure. [INDEPENDENT recalculation]
    - **DOK 2 — Summary:** Every headline outcome claim is an *internal analysis* of MAP data; the test instrument is third-party but the analysis is not audited, and the flagship "elite" comparison is marketing-generated. The company's "2.6x" does not survive recalculation of its own public artifact, which lands nearer **1.69x math / 1.54x reading** and is matched-completer, no-counterfactual evidence. Growth multiples depend on projection and norm versions and become unstable when projected growth is small; adjusted scale-score or SD differences with confidence intervals are more interpretable in a causal study.
    - **Link to source:** [https://alpha.school/the-program/](https://alpha.school/the-program/) | [https://go.alpha.school/hubfs/MAP%20Results%20-%2024%2025/2025%20NWEA%20MAP%20results.pdf](https://go.alpha.school/hubfs/MAP%20Results%20-%2024%2025/2025%20NWEA%20MAP%20results.pdf) | [https://connection.nwea.org/s/article/overall-rit-explained](https://connection.nwea.org/s/article/overall-rit-explained) | [https://reason.com/2026/06/24/g-t-schools-bet-on-gifted-ed-cash-rewards-2-hours-of-ai-tutoring-no-lectures/](https://reason.com/2026/06/24/g-t-schools-bet-on-gifted-ed-cash-rewards-2-hours-of-ai-tutoring-no-lectures/)
- **Subcategory 5.3: Admissions / Selection (the crux)**
  - **Source:** Reason (Segan, 2026) [INDEPENDENT]; NEPC/First Fish (Cherkin & Champney, 2026) [INDEPENDENT, opinion]
    - **DOK 1 — Facts:**
      - GT School screens applicants with the **CogAT** aptitude test at roughly the **90th-percentile** cutoff — an explicit cognitive-ability admissions filter. [INDEPENDENT]
      - Tuition: in-person GT School ≈ $25,000/yr; remote "G.T. Anywhere" priced near the ~$10,000 Texas voucher. Alpha schools range ≈ $10,000–$75,000/yr (most ≈ $40,000). [INDEPENDENT]
      - As for-profit private schools they choose whom to admit; began serving mainly wealthier families, later expanded to some lower-income areas (e.g., Brownsville). [INDEPENDENT]
    - **DOK 2 — Summary:** GT School selects on measured aptitude *and* on families able to pay a substantial tuition — a double filter on exactly the variables (ability and family investment) that a skeptic would name as the source of any apparent effect. This documented CogAT cutoff is simultaneously the strongest evidence for the selection-effect worry and the natural running variable for a regression-discontinuity design.
    - **Link to source:** [https://reason.com/2026/06/24/g-t-schools-bet-on-gifted-ed-cash-rewards-2-hours-of-ai-tutoring-no-lectures/](https://reason.com/2026/06/24/g-t-schools-bet-on-gifted-ed-cash-rewards-2-hours-of-ai-tutoring-no-lectures/) | [https://nepc.colorado.edu/blog/fprice-kids-pay](https://nepc.colorado.edu/blog/fprice-kids-pay)
- **Subcategory 5.4: The Public Selection Critique & the Evidence Gap**
  - **Source:** Kane (2026) [INDEPENDENT]; Alexander/ACX [INDEPENDENT]; NEPC/First Fish (2026) [INDEPENDENT]
    - **DOK 1 — Facts:**
      - Dylan Kane (Feb 2026): Alpha should compare students "to their own students' learning before they join, not to the national median"; $40k-tuition families are "probably already learning faster than the median"; credits fast learning but attributes it to "motivation, not the technology."
      - Scott Alexander (ACX) frames the debate as "affluent, selection-effect-propped program" vs. "joyless speed-drilling," noting public evidence is "thin in both directions."
      - Consensus across independent commentators: the growth/percentile claims rest entirely on internal MAP analyses, have not been independently verified, and there is no peer-reviewed study, control group, or matched comparison. Pennsylvania rejected an affiliated charter as "untested."
    - **DOK 2 — Summary:** Independent observers converge on the same two gaps: GT School's results lack a credible counterfactual (no baseline-relative or matched comparison, no control group, no third-party evaluation), and the most compelling alternative explanation on offer is student motivation and family selection rather than the program. Closing that gap requires an identified counterfactual design, not stronger marketing of selected-cohort outcomes.
    - **Link to source:** [https://fivetwelvethirteen.substack.com/p/alpha-schools-secret-sauce](https://fivetwelvethirteen.substack.com/p/alpha-schools-secret-sauce) | [https://www.astralcodexten.com/p/your-review-alpha-school](https://www.astralcodexten.com/p/your-review-alpha-school) | [https://nepc.colorado.edu/blog/fprice-kids-pay](https://nepc.colorado.edu/blog/fprice-kids-pay)
- **Subcategory 5.5: Texas Education Freedom Accounts — Relevant but Unobserved Policy Context**
  - **Source:** Texas Education Freedom Accounts official funding/statute guidance; Reason (Segan, 2026)
    - **DOK 1 — Facts:**
      - Texas's Education Savings Account program is scheduled for the **2026–27 school year**, with a **$10,474 standard participating-private-school award** and a state lottery when demand exceeds capacity. It also requires annual nationally normed testing for participating private-school students in grades 3–12.
      - Whether GT School will participate at scale, or whether the policy will change its applicant pool, tuition barrier, or seat scarcity, remains unobserved.
    - **DOK 2 — Summary:** The policy could change access and oversubscription conditions, but no effect on GT School's selection process can be inferred before participation and applicant data exist. It would not itself remove the CogAT screen or self-selection into applying.
    - **Link to source:** [https://educationfreedom.texas.gov/newsupdates/funding-timelines-and-installments/](https://educationfreedom.texas.gov/newsupdates/funding-timelines-and-installments/) | [https://capitol.texas.gov/tlodocs/89R/billtext/html/SB00002F.htm](https://capitol.texas.gov/tlodocs/89R/billtext/html/SB00002F.htm)
- **Subcategory 5.6: Why the Curated Cohort Plausibly Matters — the Pace Mechanism (and where GT School's self-paced model already neutralizes it)**
  - **Source:** Reis et al. (1998); Kulik & Kulik (1992); Steenbergen-Hu et al. (2016); Duflo, Dupas & Kremer (2011); the elite-illusion/self-paced findings
    - **DOK 1 — Facts:**
      - **Gifted students waste large amounts of time on already-mastered content:** Reis, Westberg, Kulikowich & Purcell (1998), *Gifted Child Quarterly* — teachers eliminated **40–50% of the regular curriculum** for 336 high-ability students in mixed-ability classes with **no loss** in achievement (out-of-level tested to avoid ceilings).
      - **The gain comes from pace/level, not peer sorting:** between-class grouping with no curriculum change ≈ null (g≈0.04–0.06), but **acceleration ≈ g=0.70** vs. same-age peers (Steenbergen-Hu et al. 2016, in 3.4); Kulik & Kulik (1992) — effects scale with the amount of curriculum/pace adjustment (accelerated gifted ≈ ~1 grade-level gain).
      - **Cleanest causal support for the compromise-pace problem:** Duflo, Dupas & Kremer (2011), *AER*, randomized across **121 schools** — mixed-ability classes force a compromise pace; tracking by readiness let instruction run at the group's level and helped **both** ends (~+0.14–0.18 SD).
      - **But GT School's self-paced software largely neutralizes this at the academic core:** because adaptive/mastery software paces each student individually, a fast student's rate is largely insulated from peers (the elite-illusion nulls show near-zero peer-composition effect on achievement — 3.1). The pace mechanism therefore bites mainly in the **shared components** — group workshops (Duflo) and finite guide attention — not the software.
    - **DOK 2 — Summary:** Mixed-ability group instruction can force a compromise pace, while acceleration and curriculum compacting can benefit high-readiness students. GT School's self-paced software may reduce this mechanism in the academic core, but shared workshops and finite adult attention remain possible channels through which cohort composition could matter. The cited studies do not directly test that mechanism inside GT School.
    - **Link to source:** [https://journals.sagepub.com/doi/10.1177/001698629804200206](https://journals.sagepub.com/doi/10.1177/001698629804200206) | [https://journals.sagepub.com/doi/10.1177/001698629203600204](https://journals.sagepub.com/doi/10.1177/001698629203600204) | [https://www.aeaweb.org/articles?id=10.1257/aer.101.5.1739](https://www.aeaweb.org/articles?id=10.1257/aer.101.5.1739)
- **Subcategory 5.7: Efficiency Is Not Yet Durable Learning — Transfer, Retention, and Independent Performance**
  - **Source:** Kulik & Fletcher (2016); Bailey et al. (2017); Bastani et al. (2025)
    - **DOK 1 — Facts:**
      - Kulik & Fletcher's meta-analysis of 50 controlled intelligent-tutoring evaluations reported a median effect of 0.66 SD, with average effects around 0.73 on locally developed tests and 0.13 on standardized tests. Outcome alignment materially changes the apparent effect.
      - Bastani et al. randomized nearly 1,000 high-school math students to textbook control, unrestricted GPT Base, or a teacher-informed hint-based GPT Tutor. GPT Base raised assisted-practice grades 48% but lowered later unaided grades 17% relative to control; GPT Tutor raised assisted performance 127% and largely mitigated the unaided harm. Tool performance and independent learning can move in opposite directions.
      - Bailey, Duncan, Odgers & Yu (2017) review widespread intervention fadeout and identify three routes to persistence: building malleable/fundamental skills that would not otherwise develop, opening a timely opportunity, and sustaining the gain through later environments. An immediate effect does not establish persistence.
    - **DOK 2 — Summary:** A credible counterfactual solves only the attribution problem; it does not decide whether the measured outcome is sufficient evidence of learning. A positive MAP ITT would support the bounded claim that the complete package caused MAP growth for the randomized population. It would not by itself establish durable retention, far transfer, unaided performance after support disappears, broad educational quality, or an AI-specific mechanism.
    - **Link to source:** [https://doi.org/10.3102/0034654315581420](https://doi.org/10.3102/0034654315581420) | [https://doi.org/10.1080/19345747.2016.1232459](https://doi.org/10.1080/19345747.2016.1232459) | [https://doi.org/10.1073/pnas.2422633122](https://doi.org/10.1073/pnas.2422633122)



### Category 6: The Equity Blind Spot — How Aptitude Screening Encodes Cultural, Racial, and Class Disparity

*Where Category 1 asks "does the screen miss able kids?", this category asks "which kids, systematically, and why?" It connects to 1.5 and 3.3 (universal screening as a partial remedy). The tension is deliberate: the same objective test that is more equitable than biased referral (1.5) is also correlated with the very advantages it claims to look past.*

- **Subcategory 6.1: Racial/ethnic underrepresentation in ability-identified gifted programs**
  - **Source:** NAGC (federal OCR/CRDC data); Grissom & Redding (2016)
    - **DOK 1 — Facts:**
      - NAGC, citing 2017–18 federal Office for Civil Rights data: Black and Hispanic students are represented in gifted programs at only ~55% and ~77% of their share of the K–12 population, while Asian American and White students are at ~196% and ~108%; historically underrepresented groups are underserved "by at least 50%."
      - Education Next analysis of 2017–18 CRDC: ~6.9% of students are in gifted programs; 27.3% of gifted students are Black or Hispanic vs. 47.7% of overall enrollment.
      - Grissom, J. A., & Redding, C. (2016), "Discretion and Disproportionality," *AERA Open*, 2(1) — using ECLS-K (>10,000 students): at identical math/reading achievement, Black students were assigned to gifted programs about *half* as often as White peers; overall, Black students were 66% and Hispanic 47% less likely to be identified; Black students were ~3× more likely to be identified when taught by a Black teacher.
      - Access differs before identification as well: about **90% of White students versus 83% of Black students** attended a school offering gifted services in the same national dataset.
    - **DOK 2 — Summary:** Gifted programs identified through ability/achievement screening substantially under-enroll Black, Hispanic, and Native students relative to their population share, and the gap persists even among students with *identical* measured achievement. That residual indicates the disparity is not merely a difference in measured ability but in who gets identified and served.
    - **Link to source:** [https://www.nagc.org/identification](https://www.nagc.org/identification) | [https://journals.sagepub.com/doi/full/10.1177/2332858415622175](https://journals.sagepub.com/doi/full/10.1177/2332858415622175)
- **Subcategory 6.2: Cultural loading and the "culture-fair test" myth**
  - **Source:** Lohman (2005, *GCQ*); Lohman, Korb & Lakin (2008); historical origins of aptitude testing
    - **DOK 1 — Facts:**
      - Lohman, D. F. (2005), "The Role of Nonverbal Ability Tests in Identifying Academically Gifted Students," *Gifted Child Quarterly*, 49(2), 111–138 — nonverbal ("culture-fair") tests are "neither culture free nor culture fair"; selecting on them alone would exclude the majority of the most academically accomplished students in every ethnic group.
      - Lohman, D. F., Korb, K. A., & Lakin, J. M. (2008), *Gifted Child Quarterly*, 52(4), 275–296 — across the Raven, NNAT, and CogAT (1,198 children, ~40% ELL), ELL children scored ~0.5–0.67 SD (8–10 standard-score points) lower on all three *nonverbal* tests, and none predicted ELL achievement well — the "culture-fair" remedy did not close the gap.
      - Historical framing (contested): U.S. mass aptitude testing traces to the WWI Army tests and to figures (Terman 1916; Brigham 1923, who then developed the SAT) who explicitly tied testing to racial hierarchy. Brigham later repudiated that premise and the College Board has disavowed the legacy; critics nonetheless argue the instruments still encode dominant-culture norms.
    - **DOK 2 — Summary:** Even the tests marketed as bias-reducing leave large gaps for English-language learners and culturally diverse students, and the field's own leading psychometrician holds that no single test is culture-fair. The historical record shows aptitude testing was, at inception, entangled with claims of racial hierarchy — a contested but relevant backdrop to using such tests as gatekeepers.
    - **Link to source:** [https://journals.sagepub.com/doi/abs/10.1177/001698620504900203](https://journals.sagepub.com/doi/abs/10.1177/001698620504900203) | [https://journals.sagepub.com/doi/10.1177/0016986208321808](https://journals.sagepub.com/doi/10.1177/0016986208321808)
- **Subcategory 6.3: Class/socioeconomic disparity — and the compounding of test + tuition**
  - **Source:** SES–cognition literature (von Stumm et al.); Card & Giuliano (2016); reasoned synthesis
    - **DOK 1 — Facts:**
      - SES is among the most robust predictors of children's cognitive-test performance: highest- vs. lowest-SES children differ by ~6 IQ points at age 2, a gap that nearly triples by age 16 (von Stumm et al.); vocabulary shows the strongest SES association of any cognitive domain.
      - Card & Giuliano (2016): under the traditional referral system, only 28% of gifted 3rd-graders were Black or Hispanic vs. 60% of district enrollment; low-income and ELL students were systematically under-referred.
      - **Correction / honesty note:** the "test prep compounds the advantage" mechanism is **weaker than commonly assumed for SAT-style commercial coaching**: causally identified estimates are about **20 SAT points** after controlling for selection and ~**+9 percentile** in a federal review, and **no CogAT-specific coaching trial was located**. That does not make cognitive tests practice-proof. A meta-analysis of **174 samples / 153,185 people** found significant retest gains across cognitive tests, with form equivalence, interval, age, and prior exposures as moderators; identical forms produced larger gains. Raven-style matrices also improved across repeated untrained sittings through strategy learning. *(Scharfen, Peters & Holling, 2018, DOI 10.1016/j.intell.2018.01.003; Bors & Vigneau, 2003.)* The SES→score link is still chiefly developmental, while retest/form exposure is a separate validity and security threat.
      - *(Reasoned synthesis, not a single cited statistic)* Even setting coaching aside, when a program charges tuition (GT School ≈ $25k) or gates scholarships on the same aptitude test, the aptitude filter and the ability-to-pay filter — both correlated with SES — compound.
    - **DOK 2 — Summary:** Cognitive-test scores are strongly correlated with socioeconomic status from before school entry, so an aptitude cutoff functions partly as a proxy for family advantage. That association is chiefly developmental rather than explained by SAT-style commercial coaching, but cognitive tests are not practice-proof: retesting, form reuse, and learned strategies are separate score-validity and security threats. A program that also charges substantial tuition applies a second, SES-correlated filter, concentrating access among the already-advantaged unless the design deliberately counteracts it.
    - **Link to source:** [https://pmc.ncbi.nlm.nih.gov/articles/PMC4641149/](https://pmc.ncbi.nlm.nih.gov/articles/PMC4641149/) | [https://www.pnas.org/doi/10.1073/pnas.1605043113](https://www.pnas.org/doi/10.1073/pnas.1605043113) | [https://doi.org/10.1016/j.intell.2018.01.003](https://doi.org/10.1016/j.intell.2018.01.003)
- **Subcategory 6.4: Frameworks and remedies**
  - **Source:** NAGC equity position; Card & Giuliano (2016)
    - **DOK 1 — Facts:**
      - NAGC equity position ("Identifying and Serving Culturally and Linguistically Diverse Students"): "giftedness … is found among all racial, ethnic, and income groups"; "one test at a specific point in time should not dictate whether someone is identified"; recommends universal screening, multiple measures, local norms, and front-loading/talent development.
      - Card & Giuliano (2016) is the empirical proof-of-concept that a design change (universal screening) can materially reduce the disparity without lowering the eligibility bar.
    - **DOK 2 — Summary:** The equity literature converges on a prescription that mirrors the core identification-design question: single-point, single-test gatekeeping is the problem, and universal screening plus multiple measures and local norms is the evidence-based remedy. The disparity critique is therefore not an argument against selection but an argument for redesigning it.
    - **Link to source:** [https://www.nagc.org/equity](https://www.nagc.org/equity) | [https://www.pnas.org/doi/10.1073/pnas.1605043113](https://www.pnas.org/doi/10.1073/pnas.1605043113)



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
