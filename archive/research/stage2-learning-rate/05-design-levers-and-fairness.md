# Design levers and the fairness bar for an individual learning-rate claim (DOK 2)

Scope: what the retrieved literature establishes about (a) whether adaptive difficulty
targeting can destroy slope information, (b) the five-option guessing floor, (c) collateral
information (RT, polytomous scoring), (d) occasions vs. trials, (e) invariance/DIF for change
parameters and the Standards' bar for a novel construct, (f) cohort-only / "indeterminate"
reporting as a legitimate output.

## Sources

Numbers are stable identifiers used throughout, but entries are grouped by topic rather than listed in numeric
order (search by number). Sources 29-31 appear inline in Findings section 2.

1. **Mathew, T. & Sinha, B. K. (2001). "Optimal designs for binary data under logistic regression."** *Journal of Statistical Planning and Inference* 93(1-2), 295-307. https://www.sciencedirect.com/science/article/abs/pii/S0378375800001737 — Establishes that when the *slope* alone is the estimand, the relevant criterion is c-optimality, not D-optimality, and that optimal designs for estimating beta differ from those for estimating a level or a percentile. This is the formal reason "target the child's current level" is the wrong design for a rate.

2. **Stufken, J. & Yang, M. (2012). "Optimal Designs for Generalized Linear Models" (book chapter).** https://homepages.math.uic.edu/~minyang/research/Stufken%20Yang%20Chap%20Book.pdf — Traces the two-point D-optimal design result for the two-parameter logistic model (Abdelbasit & Plackett 1983; Minkin 1987; Ford, Torsney & Wu 1992) and the canonical support points at linear predictor +/-1.5434 (response probabilities ~0.176 and ~0.824). Also states the *local* optimality caveat: designs depend on a guessed parameter value, which is precisely the closed-loop dependency at issue here.

3. **van der Linden, W. J. (2007). "A Hierarchical Framework for Modeling Speed and Accuracy on Test Items."** *Psychometrika* 72(3), 287-308. https://link.springer.com/article/10.1007/s11336-006-1478-z — The standard joint response/response-time framework: separate person parameters for ability and speed, with a covariance structure at the second level, allowing RT to act as collateral information about the ability parameter.

4a. **Willett, J. B. (1989). "Some Results on Reliability for the Longitudinal Measurement of Change: Implications for the Design of Studies of Individual Growth."** *Educational and Psychological Measurement* 49(3), 587-602. DOI 10.1177/001316448904900309 (verified via secondary sources; I did not retrieve the SAGE full text). — Defines Growth Rate Reliability (GRR). Reliability of an individual slope rises with the number of *occasions* and with their temporal spread; "effective error" for a slope is a function of instrument reliability AND the temporal arrangement of occasions. Two waves cannot separate true individual change from measurement error.

4b. **Rast, P. & Hofer, S. M. — GRR and power for slope variance; and Brandmaier et al. / "Precision, Reliability, and Effect Size of Slope Variance in Latent Growth Curve Models."** *Frontiers in Psychology* 9:294 (2018). https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00294/full — Confirms GRR's role in power for detecting slope variance, and cautions that GRR can mislead because it stays constant across conditions that change actual power. Relevant to not over-trusting a single reliability-like number for lambda.

4c. **Haberman, S. J. (2008). "When Can Subscores Have Value?"** *JEBS* 33, 204-229; **Sinharay, S. (2010) "When Can Subscores Be Expected to Have Added Value?"** ETS RR, https://files.eric.ed.gov/fulltext/ED523969.pdf; **Sinharay, Haberman & Puhan (2007), "Subscores based on classical test theory: to report or not to report,"** *EM:IP* 26(4), 21-28; **Haberman, Sinharay & Puhan (2009), "Reporting subscores for institutions,"** *BJMSP* 62, 79-95, https://bpspsychub.onlinelibrary.wiley.com/doi/abs/10.1348/000711007X248875 — The PRMSE decision rule: a subscore is reportable only if it predicts its own true subscore better than the total score does. The 2009 institution paper is the direct precedent for *aggregate-level reporting of a component that fails the individual-level bar*.

24. **"On the Optimality of Tracking Fisher Information in Adaptive Testing with Stochastic Binary Responses" (2025).** https://arxiv.org/pdf/2510.07862 — Formalizes that maximum-Fisher-information item selection is asymptotically optimal *for estimating a static latent parameter*. This is the theorem the current targeting loop implicitly invokes — and it is a theorem about a **level**, not a rate.

25. **Ebenbeck, N. et al. (2024). "Duration versus accuracy - what matters for computerised adaptive testing in schools?"** *Journal of Computer Assisted Learning*. https://onlinelibrary.wiley.com/doi/full/10.1111/jcal.13074 — On the length/precision tradeoff in school CAT; different assessment purposes tolerate different accuracy loss. Relevant to costing the +15/+30 trial lever in child time.

26. **DIF and construct-irrelevant familiarity.** "How Differential Item Functioning Analysis (DIF) Can Increase Test Fairness" (ATP) https://www.testpublishers.org/assets/how%20differenctial%20item%20functioning.pdf; and **"Differential Item Functioning Due to Cultural Familiarity on a Large-Scale Reading Test: Does the Length of Residence Matter?"** *Language Assessment Quarterly* 22(1) (2025), https://www.tandfonline.com/doi/abs/10.1080/15434303.2025.2455196 — DIF grouping variables explicitly include **familiarity with technology** and first language. The grade-3 reading study found 3 of 5 hypothesized high-cultural-familiarity items showed DIF; the gap narrowed with exposure but **persisted even after 5+ years of residence**. This is the "familiarity accumulates but DIF does not fully vanish" result — a direct threat to reading a *rate* as ability rather than as familiarity acquisition.

27. **Age of first digital-device access and digital reading performance (2024).** *Humanities and Social Sciences Communications*. https://www.nature.com/articles/s41599-024-03292-y — n = 156,277 fifteen-year-olds, 18 OECD countries. Mechanism: early device users "were more adapted to the digital reading format and encountered fewer difficulties familiarizing with and processing" digital tasks. Establishes that interface familiarity is SES-correlated and outcome-relevant at scale.

28. **Counter-evidence on device familiarity.** "Digital Device Exposure and Cognition Levels of Children in Low- and Middle-Income Countries: Cross-sectional Study in Cambodia." https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9475408/ — Children 3-9 on a computerized cognitive battery: pretest digital-device experience and time on device during the test had **no significant impact**; cognition instead tracked educational spend, school location, family type, income. A null worth holding against #27.

20. **Bjermo, J. (2025). "Optimal Test Design for Estimation of Mean Ability Growth."** *Applied Psychological Measurement* 49(1-2), 29-49. doi:10.1177/01466216241291233. https://pmc.ncbi.nlm.nih.gov/articles/PMC11560061/ — **The most directly on-point design result retrieved.** Two 2PL tests linked by anchors (NEAT), estimand = mean growth d. Minimizing the asymptotic variance of the *growth* estimate yields, for a < 1.5, a **three-point design**: anchors near b = 0 and each occasion's unique items placed **symmetrically OFFSET on either side**, with the offset distance *growing as d grows*. For large d the anchors split into two groups, half near each occasion's items. Contrast with Berger (1998), who for a *single* test (level estimation) found difficulties belong near the ability mode. Also: the ordinary (non-Bayesian) design proved robust to uncertainty in d — an optimum-in-average design gave variance ratios "very close to 1." Item pool: 248 TIMSS grade-8 math 2PL items.

21. **Brandmaier, A. M., Lindenberger, U. & McCormick, E. M. (2024). "Optimal two-time point longitudinal models for estimating individual-level change: Asymptotic insights and practical implications."** *Developmental Cognitive Neuroscience* 70, 101450. https://pmc.ncbi.nlm.nih.gov/articles/PMC11470183/ — Responds to Parsons & McCormick (2024), who found poor individual-slope recovery with two waves. Establishes that **study SPAN, not the number of occasions, dominates precision** (span enters effective error quadratically); variance of time points is maximized by clustering observations at the two endpoints, e.g. a (0,0,0,3,3,3) schedule. Worked example: 3 waves, residual var 1, slope var .25 -> effective error .3125, effective curve reliability ~.44, true-vs-estimated slope correlation ~.66. Berlin Aging Study: a 6-wave/13-year design could drop to 5 waves at equal power by extending 12 days. Bottom line quoted: "linear change is measured best with two time points that are measured well." Caveat: quadratic/exponential change needs >= 4 occasions.

22. **Parsons, S. & McCormick, E. M. (2024)** — the target of #21; found two-wave growth models poorly suited to modelling individual differences in linear slopes in developmental studies and recommended restricting such models to group-level effects. **I did not retrieve this paper directly; it is characterized here only as described by Brandmaier et al. (2024).**

23. **Freise, F., Holling, H. & Schwabe, R. (2023). "Optimal Design for Estimating the Mean Ability over Time in Repeated Item Response Testing."** *Journal of Statistical Planning and Inference* 225, 266-282. Preprint: https://arxiv.org/abs/2203.14318 — D-optimal designs for estimating the mean response in repeated-measures growth-curve models, motivated by "planning a study in psychological item response testing with multiple retests to measure the improvement in ability." Includes nonlinear growth curves with an increasing mean ability plus a **saturation effect** — relevant because a within-session learning curve is unlikely to be linear. Note: this concerns the placement of *occasions in time*, not item difficulties; I could not extract the full text (PDF was binary), so treat the detail as unverified beyond the abstract.

14. **Rogosa, D., Brandt, D. & Zimowski, M. (1982). "A growth curve approach to the measurement of change."** *Psychological Bulletin* 92(3), 726-748; and **Rogosa & Willett (1983), "Demonstrating the reliability of the difference score in the measurement of change,"** *JEM* 20, 335-343, https://onlinelibrary.wiley.com/doi/10.1111/j.1745-3984.1983.tb00211.x — Reliability of an individual growth-rate estimate is not an intrinsic property; it depends on **true between-person variance in rate** relative to error. Low observed reliability can mean "everyone grows at the same rate here," not "the instrument is bad" — a critical alternative reading of a low r. Also: residualized change scores are largely discredited as measures of individual change.

15. **"Review of Issues About Classical Change Scores: A Multilevel Modeling Perspective on Some Enduring Beliefs."** *Psychometrika* (2018). https://link.springer.com/article/10.1007/s11336-018-9611-3 — Modern consolidation of the change-score debate.

16. **Calero, M. D., García-Martín, M. B. & Robles, M. A. (2011). "Learning Potential in high IQ children: The contribution of dynamic assessment to the identification of gifted children."** *Learning and Individual Differences*. https://www.sciencedirect.com/science/article/abs/pii/S1041608010001676 — The closest existing analogue to the proposed construct. Tests the two premises directly: (1) that gifted children are those with the highest gain from training independent of IQ, and (2) that measured "learning capacity" is a global ability usable as a high-ability indicator. Classifies children as Non-gainers / Gainers / High Scorers. **Important sample limitation: children were NOT socially disadvantaged** — so the low-SES case, the one the equity argument rests on, is untested there.

17. **"The Identification of Giftedness in Children: A Systematic Review."** *Education Sciences* 15(8):1012 (2025). https://www.mdpi.com/2227-7102/15/8/1012 — Current field position: purely static psychometric identification is insufficient and can be discriminatory in high-diversity contexts; recommends balanced combination of standardized + dynamic assessment. Also catalogues the recurring failure mode: tools lacking sufficient validity/reliability being used in identification protocols.

18. **Walther, C. A. P., Bartsch, R. A. & Carman, C. A. (2026). "Equality Versus Equity in Multiple Measures: Gifted Identification Matrix Assessment Across Demographic Groups."** *Journal of Advanced Academics*. https://journals.sagepub.com/doi/10.1177/1932202X251409562 — On matrix/multiple-measures identification across demographic groups; raises that matrix components lacking established reliability and validity change WHO gets identified.

19. **Lidz, C. S. & Elliott, J. G. (2006). "Use of Dynamic Assessment with Gifted Students."** *Gifted Education International* 21(3). https://journals.sagepub.com/doi/10.1177/026142940602100307 — Defines DA by the inclusion of intervention and feedback during assessment. **Note the mismatch with the design under study: the screener gives NO feedback**, so it is not dynamic assessment in this sense; it is repeated static measurement under drifting difficulty.

10. **De Boeck, P. & Jeon, M. (2019). "An Overview of Models for Response Times and Processes in Cognitive Tests."** *Frontiers in Psychology* 10:102. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00102/full — Most recent review of the RT-model landscape. Key empirical fact for this design: conditional on the latent variables, the residual dependency between RT and accuracy is **negative** — faster-than-expected responses are MORE accurate (Bolsinova et al. 2017; Jeon & De Boeck 2018). Also distinguishes person-class models (regular problem-solving vs. rapid-guessing vs. automatic retrieval classes) — directly usable for detecting a child who has stopped engaging with above-level items.

11. **Bolsinova, M. & Molenaar, D. / Diffusion IRT with conditional dependence.** "Modeling Conditional Dependence of Response Accuracy and Response Time with the Diffusion Item Response Theory Model," *Psychometrika*. https://link.springer.com/article/10.1007/s11336-021-09819-5 — Confirms conditional dependence must be modelled, not assumed away; the van der Linden hierarchical model's conditional-independence assumption is empirically violated.

12. **Polytomous information.** "A Taxonomy of Polytomous Item Response Models" https://arxiv.org/pdf/2010.01382; "Optimal Designs for the Generalized Partial Credit Model" https://arxiv.org/pdf/1803.06517; Masters' Partial Credit Model chapter https://link.springer.com/chapter/10.1007/978-1-4757-2691-6_6; empirical comparison: "Scoring Multiple Choice Items: A Comparison of IRT and Classical Polytomous and Dichotomous Methods" https://commons.lib.jmu.edu/cgi/viewcontent.cgi?article=1029&context=gradpsych — Mechanism: each category contributes information, so a polytomous item's information function has multiple peaks spread over a wider theta range. **But** the empirical gain from polytomously scoring MC distractors was only *small* increases in reliability; the real benefit was **less bias at LOW scores** — which is exactly the above-level regime here. A large-scale CAT study found only a slight precision gain with minor practical impact on classification decisions.

13. **Comparison of dichotomous vs. polytomous growth measurement.** "Item-Weighted Likelihood Method for Measuring Growth in Longitudinal Study With Tests Composed of Both Dichotomous and Polytomous Items." https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8353132/ — Directly on mixed-format growth estimation; item weighting to reduce bias in growth estimates.

6. **Kim, E. S. & Willson, V. L. (2014). "Testing Measurement Invariance Across Groups in Longitudinal Data: Multigroup Second-Order Latent Growth Model."** *Structural Equation Modeling* 21(4). https://www.tandfonline.com/doi/full/10.1080/10705511.2014.919821 — **The single most decision-relevant fairness result retrieved.** Their simulations separate the two failure modes: *intercept* noninvariance biases the group effect on BASELINE, while **factor-loading noninvariance biases the GROWTH RATE** specifically, with Type I error inflation growing with the size of the noninvariance. Slope comparisons therefore need a stronger invariance condition than level comparisons — an invariance check on theta0 does not license lambda.

7. **Liu, Y. et al. (2021). "Adjusting for Measurement Noninvariance with Alignment in Growth Modeling."** *Multivariate Behavioral Research*. https://www.tandfonline.com/doi/full/10.1080/00273171.2021.1941730 — Alignment-within-CFA extended to growth models substantially reduces bias in growth parameters without needing a priori knowledge of which items are noninvariant. A candidate remedy if lambda is retained.

8. **Longitudinal IRT noninvariance across time AND group.** *Asia Pacific Education Review* (2023). https://link.springer.com/article/10.1007/s12564-023-09907-4 — Item-level treatment: models noninvariance of item parameters between subgroups and across time inside a latent growth curve. Establishes that with novel items, item-parameter drift and subgroup DIF both propagate into the slope.

9. **AERA, APA & NCME (2014). *Standards for Educational and Psychological Testing*, 7th ed.** https://www.aera.net/publications/books/standards-for-educational-psychological-testing-2014-edition (ERIC record: https://eric.ed.gov/?id=ED565876) — Validity attaches to *interpretations for proposed uses*, not to tests. Five required evidence sources: content, response processes, internal structure, relations to other variables, consequences. **If a test is used in a way that has not been validated, the burden is on the user to justify the new use and gather new evidence.** Standard 11.2 requires an explicit definition of the content domain. Note: sponsors announced a revision in 2024; the 2014 edition remains current as retrieved.

5. **Ranger, J. & Ortner, T. (2013). "A Note on the Hierarchical Model for Responses and Response Times in Tests of van der Linden (2007)."** *Psychometrika*. https://link.springer.com/article/10.1007/s11336-013-9324-6 — Critical quantitative bound: response times *do* increase test information, but their contribution is **bounded** with a simple limit. This caps how much the RT lever can buy.

## Findings

### 1. Adaptive targeting and slope information

No retrieved paper is titled "adaptive targeting destroys slope information," but the two halves that compose that
claim are both in the literature, and they compose cleanly.

**(a) The estimand determines the design, and level-optimal is not slope-optimal.** Mathew & Sinha [1] establish
that in the two-parameter logistic model, optimal designs for estimating beta (the slope) differ from designs
optimal for a level or a percentile; the slope is a c-optimality problem, not the D-optimality problem adaptive
targeting solves. Source [24] shows max-Fisher-information selection is asymptotically optimal — for a *static*
parameter. The targeting rule here is provably optimal for the wrong estimand.

**(b) Slope-optimal designs put items AWAY from the current level, on both sides.** Two independent results:
- Classical two-point logistic D-optimality places support at response probabilities ~0.176 and ~0.824, i.e. linear
  predictor +/-1.5434 [2] — deliberately off the 50% point, spread symmetrically.
- Bjermo [20], solving the growth problem directly, gets anchors at the centre and each occasion's unique items
  **symmetrically offset on either side**, with the offset widening as true growth d increases. Berger's
  single-test (level) result put difficulties at the ability mode; the growth problem does not.

Serving "standing + 1" every trial concentrates all design mass at a single moving point — close to the worst
structure for a slope, since one design point cannot identify a two-parameter model without leaning on the walk of
the point itself.

**(c) Local optimality is the formal name for the closed loop.** [2] states these designs are only *locally*
optimal — they depend on a guessed parameter value. When the guess is the running estimate the design is meant to
inform, the design is endogenous. The internal result (null-cohort fit 0.0398 -> 0.0018 on freezing served
difficulty) is a demonstration of that endogeneity, not an implementation bug.

### 2. The five-option guessing floor

The 3PL information function is I(theta) = a^2 * Q(theta) * [P(theta) - c]^2 / [P(theta) * (1-c)^2]. Three
consequences established across [29]-[31] below:
- c reduces information at **all** ability levels, with the **largest reduction at the low end** of the continuum.
- Effective discrimination is attenuated: the ICC slope at theta = b is a(1-c)/4 rather than a/4. For a five-option
  item, c ~ 0.20, so the effective slope is ~80% of nominal, and information (which goes as the square) drops
  further.
- The information peak **shifts above b**, because guessing inflates P for low-ability examinees.

The regime this screener operates in is the worst case for this: items above the child's measured level, so
P(theta) is near the chance floor, precisely where 3PL information is most degraded and where the standard error
rises steeply. Constructed response has c ~ 0, so the (1-c) attenuation vanishes and the peak sits at b — a CR item
with identical a and b yields strictly more information than its five-option MC counterpart. I did **not** retrieve
Lord (1980)'s specific MC-vs-free-response relative-efficiency numbers; secondary sources point to that treatment
but I could not verify the figures, so no efficiency ratio should be quoted.

Additional sources for this section:

29. **"Three-Parameter Logistic Model (3PL) — the IRT Formula, Guessing & Item Information."** Cogn-IQ Encyclopedia. https://www.cogn-iq.org/learn/theory/three-parameter-logistic-model/ — Secondary/tertiary reference (not peer-reviewed) giving the 3PL information function, the a(1-c)/4 slope attenuation, and the information-peak shift. Traces the model to Birnbaum in Lord & Novick, *Statistical Theories of Mental Test Scores*.
30. **"The IRT Item Pseudo-guessing c Parameter."** Assessment Systems. https://assess.com/irt-item-pseudo-guessing-parameter/ — Practitioner reference: c ~ 0.20 for five-option, ~0.25 for four-option, often lower in practice because distractors are not equally attractive; stable estimation of c typically wants 500-1000+ examinees.
31. **Lord, F. M. (1980). *Applications of Item Response Theory to Practical Testing Problems*.** Referenced by [29]-[30] as the canonical treatment of MC vs. free-response relative efficiency. **NOT RETRIEVED — cited here only as a pointer; do not attribute specific numbers to it from this document.**

### 3. Collateral information: response time and polytomous scoring

**RT is real but capped.** van der Linden's hierarchical framework [3] gives the standard machinery: separate ability
and speed person parameters with a second-level covariance, so RT informs the ability parameter through that
covariance. Ranger & Ortner [5] then supply the decisive quantitative caveat: RT does increase test information, but
its contribution is **bounded, with a simple limit**. So RT cannot substitute for missing accuracy information — it
can only add a bounded increment.

**Two RT facts that matter more than the information gain here.** De Boeck & Jeon [10] report that conditional on
the latent variables, the residual RT-accuracy dependency is **negative**: faster-than-expected responses are more
accurate. And the review's person-class models (regular problem-solving vs. rapid-guessing vs. automatic-retrieval
classes) are directly usable to *detect disengagement* on above-level items. In a no-feedback, above-level, 30-trial
block, the most plausible high-value use of RT is not as extra theta information but as a **validity filter**:
distinguishing a child solving from a child rapid-guessing. That distinction is also the guessing-floor problem's
main confound. [11] adds that the conditional independence assumption in [3] is empirically violated and the
dependency must be modelled.

**Polytomous scoring: mechanism strong, empirical gain modest, but biased in the right direction.** Each response
category contributes information, so a polytomous item's information function has multiple peaks spread over a wider
theta range [12] — the theoretical case for partial credit or differentially-weighted distractors. But the empirical
record is thin: scoring MC distractors polytomously produced only *small* reliability increases over dichotomous;
and a large-scale CAT study found only a slight precision gain with minor practical impact on classification
decisions. The one finding that does bear on this design: polytomous IRT estimates were **less biased than
dichotomous at LOW scores** [12] — the exact regime of above-level testing. Gains also depend on categories being
properly ordered and used; disordered or sparse categories erode the advantage entirely.

### 4. More occasions vs. more trials — and the surprise result

This is where the retrieved literature most sharply contradicts the "lengthen the block" instinct.

**Willett's GRR [4a]** makes slope reliability a function of the number of occasions *and their temporal spread*;
"effective error" for a slope depends on instrument reliability AND the temporal arrangement of occasions.

**Brandmaier, Lindenberger & McCormick [21]** then decompose that and find **span dominates count**. Span enters the
effective-error expression quadratically, so adding equally spaced waves inside a fixed window barely helps; the
variance of the time points is maximized by **clustering observations at the two endpoints** (their (0,0,0,3,3,3)
schedule, which reduces to a two-wave latent change score model with multiple indicators). Their summary: "linear
change is measured best with two time points that are measured well," and "waiting longer may beat measuring more
often." Their worked example gives a true-vs-estimated slope correlation of ~.66 at effective curve reliability .44 —
a useful reference point against the r = 0.33 at 30 trials.

**Implication for this screener.** Adding 15 or 30 trials inside one session adds *count* within an essentially
fixed span. That is the lever [21] says buys the least. The r gains reported internally (+0.137 at 45, +0.240 at 60)
are consistent with a design paying quadratic-span costs to buy linear-count benefit. Two blocks separated by days or
weeks, each measured well, is the design [21] and [20] both point to. Note that [20]'s offset structure and [21]'s
endpoint-clustering structure are the *same shape*: mass at two separated points, not one moving point.

**Caveats.** [21] warns that long gaps risk missing nonlinearity, and that quadratic or exponential change needs at
least four occasions — and a within-session learning curve with saturation [23] is exactly nonlinear. [22]
(Parsons & McCormick, not retrieved directly) took the opposite position, that two-wave models should be restricted
to group-level effects; [21] is a rebuttal to it, so this is a live disagreement, not settled ground. Rogosa's
program [14][15] is the third position: individual change *is* measurable, difference scores are not intrinsically
unreliable, and low observed reliability of a rate can mean **there is little true between-person variance in rate**
rather than that the instrument is bad. That reading has to be ruled out before r = 0.33 is attributed to design.

## Levers, ranked by expected payoff

Ranking reflects strength of the retrieved evidence for the *mechanism*, not measured effect on this system. No
retrieved source reports a recoverability figure for this exact design; all "expected effect" entries are inferences
from mechanism and must be simulated before being believed.

| Lever | Mechanism (source) | Expected effect on recoverability | Cost: child time / build effort | Risk |
|---|---|---|---|---|
| **1. Open the loop: fix the served-difficulty schedule in advance, offset symmetrically around standing** | Slope-optimal designs place mass at two separated points offset from centre, widening with true growth [20]; classical 2PL slope design at p ~ .18/.82 [2]; local-optimality endogeneity [2] | Largest. Removes the identified contamination source (null fit 0.0398 -> 0.0018 internally). Should convert a biased lambda into an unbiased but noisy one | Zero extra child time. Low build: replace selection rule with a fixed ladder | Loses level-targeting efficiency for theta0; more off-target items means more floor/ceiling responses; ladder must be pre-registered per standing level |
| **2. Two separated occasions instead of a longer single block** | Span dominates wave count, quadratically [21]; GRR depends on temporal spread [4a] | Large, and cheaper per unit than lengthening. [21] worked example reaches slope r ~ .66 | Same or less total child time, split across sittings. High operational cost: scheduling, attrition, retest logistics | Practice/memory effects across occasions; attrition is non-random and SES-correlated; changes "one session" product premise; [22] disputes two-wave individual claims |
| **3. RT as a rapid-guessing / disengagement filter (not as extra theta information)** | Person-class RT models separate problem-solving from rapid-guessing [10]; negative conditional RT-accuracy dependency [10][11] | Moderate and indirect: removes non-informative trials that currently masquerade as chance-level performance near the floor | Zero extra child time (RT already collectable). Moderate build: joint model + class assignment | Conditional independence violated, so the model must be specified carefully [11]; RT is itself device- and familiarity-sensitive, importing a new DIF vector [26][27] |
| **4. Polytomous / partial-credit or distractor-weighted scoring** | Category-level information spreads across theta [12]; **less bias at low scores** [12] | Small on reliability; potentially meaningful on *bias* in exactly the above-level regime | Zero extra child time. High build: distractor calibration needs large samples; category ordering must be verified | Empirical gains were "small"/"slight" [12]; disordered or sparse categories erase the gain; needs recalibration of a 7,900-item bank |
| **5. Reduce the guessing floor: fewer, better distractors or constructed response** | c ~ 0.20 attenuates effective slope to a(1-c)/4 and cuts information most at low theta [29][30]; CR has c ~ 0 | Moderate in principle — but unquantified here, since Lord (1980)'s efficiency ratios were not retrieved [31] | CR costs substantial child time and scoring build; distractor pruning is cheap but raises c | CR introduces writing/language load — a major new SES and ELL confound; auto-scoring CR is its own validity problem |
| **6. Lengthen the block to 45 or 60 trials** | Internally measured: +0.137 at 45, +0.240 at 60 | Known and positive, but it is *count within fixed span* — the lever [21] identifies as least efficient. It also does nothing about contamination | Direct: +50% to +100% child time. Near-zero build | Fatigue and disengagement in K-8, worst for the youngest and for children already at the floor [25]; buys precision on a possibly biased estimand |
| **7. Abandon the individual-level claim; report cohort-level only** | PRMSE added-value rule [4c]; institution-level subscore reporting as precedent [4c]; group-level restriction for two-wave designs [22] | Not a recoverability lever — it changes the claim to one the current evidence can support | Zero child time. Low build (reporting layer + suppression rules) | Product/positioning cost; requires a defensible "indeterminate" output; risk of downstream users reconstructing per-child inferences anyway |

## The fairness bar

**A. Invariance for a slope is a strictly harder condition than invariance for a level.** The single most
consequential retrieved fact. Kim & Willson [6] separate the two failure modes: **intercept** noninvariance biases
the group effect on *baseline*, while **factor-loading noninvariance biases the GROWTH RATE**, with Type I error
inflation growing as noninvariance grows. The same asymmetry holds for noninvariance across *time*. Consequence: a
clean DIF screen on theta0 licenses nothing about lambda. Loading-level (metric) invariance across every reported
subgroup — and across trial position within the session — is the minimum, tested on the loadings, not the intercepts.
[8] adds that with novel items, both subgroup DIF and item-parameter drift propagate into the slope. Remedies exist:
second-order latent growth models [6] and alignment-within-CFA extended to growth models [7], which reduce
growth-parameter bias without a priori knowledge of which items are noninvariant.

**B. The specific subgroup threats have empirical support, and one has a null.** DIF grouping variables explicitly
include **familiarity with technology** and first language [26]. Strongest analogue: on a grade-3 reading test, 3 of
5 items hypothesized to demand cultural familiarity showed DIF; the gap narrowed with exposure but **persisted past
5 years of residence** [26]. Familiarity accumulates *over time* — structurally hard to distinguish from a learning
rate. At scale, age of first device access predicts digital reading performance (n = 156,277, 18 countries) via a
familiarity-adaptation mechanism [27]. Counter-evidence: in Cambodian children aged 3-9, prior device experience and
in-test device time had no significant effect on a computerized cognitive battery; income, school location and
educational spend did [28]. So interface familiarity is a live but not universal threat, and the confound it creates
is with *SES itself*, not merely with device use.

**C. The dynamic-assessment precedent does not clear the bar either.** Calero et al. [16] tested the two premises
this construct rests on — that gifted children are the highest gainers independent of IQ, and that "learning
capacity" is a global usable ability indicator — in children who were **not** socially disadvantaged. The low-SES
case, on which the equity argument for this construct depends, was not tested. A 2E pilot (n = 30) reported high
pre-post variance and *no relation to static assessment*: incremental information and questionable convergent
validity are the same finding. The 2025 systematic review [17] names the recurring failure mode as tools lacking
sufficient validity/reliability entering identification protocols, and [18] shows matrix components lacking
established reliability change *who gets identified*. Also [19]: dynamic assessment is defined by intervention and
feedback during assessment. **This screener gives no feedback**, so it is not dynamic assessment — it is repeated
static measurement under drifting difficulty, and cannot borrow DA's validity literature.

**D. What the Standards require.** Under AERA/APA/NCME (2014) [9]: validity attaches to *interpretations for proposed
uses*, not to instruments. Five evidence sources are required — content, response processes, internal structure,
relations to other variables, and **consequences**. The decisive clause: **if a test is used in a way that has not
been validated, the burden falls on the user to justify the new use and collect new evidence.** A learning-rate
parameter informing a top-1-2% admissions decision is a new use of a novel construct; Standard 11.2 additionally
requires an explicit definition of the content domain. Nothing retrieved supports deploying an unvalidated slope in a
high-stakes decision on face plausibility, and the consequences strand makes the *outcome* of using lambda (who gets
in, by subgroup) required evidence rather than an afterthought.

**E. A concrete bar, assembled from the above.** Before lambda informs any individual decision: (i) the null cohort
fits lambda ~ 0 under the *deployed* design, not a frozen counterfactual; (ii) metric (loading-level) invariance for
the growth parameter across SES, ELL, and interface-familiarity subgroups, per [6]; (iii) lambda shows added value
over theta0 by a PRMSE-type criterion [4c]; (iv) individual-level test-retest recovery of lambda across occasions;
(v) consequences reported by subgroup. Failing any of these, [4c]'s institution-level precedent and [22]'s
group-level restriction both point to cohort-only reporting.

## Productive tension

1. **Is r = 0.33 a design failure or a true-variance finding?** Rogosa/Willett [14][15] insist reliability of a rate
   is not intrinsic: it is true between-person variance in rate over error. If K-8 children in one reasoning area
   over 30 trials genuinely differ little in within-session rate, then no design lever raises r, and the correct
   conclusion is that the construct has little variance to measure — not that the instrument is weak. The optimal
   design literature [1][2][20] assumes a real slope to recover and says nothing about whether one exists here.

2. **Two waves: sufficient or forbidden?** [22] concludes two-time-point designs should be restricted to group-level
   effects. [21] rebuts this directly, arguing the earlier result confounded wave count with study span, and that
   two well-measured points suffice for individual claims. This is unsettled, and the answer determines whether
   lever 2 rescues the individual claim or merely relocates it.

3. **Contamination vs. efficiency.** Opening the loop removes the bias but discards the efficiency that made a
   30-item session viable for estimating theta0 at all [24]. The design cannot be simultaneously optimal for level
   and for rate [1]; a screener that reports both is buying two estimands from one budget.

4. **Guessing floor vs. fairness.** Constructed response removes the c ~ 0.20 attenuation [29][30] but adds a
   language-production load — plausibly a larger SES/ELL confound than the one being fixed. Reducing the guessing
   floor may worsen the fairness position.

5. **RT helps and hurts.** RT adds bounded information [5] and enables disengagement detection [10], but it is
   plausibly the most device- and familiarity-sensitive signal available [26][27] — though [28] found no such effect
   in young children. Adding RT may import DIF into the very parameter the fairness bar is hardest on.

6. **Above-level testing is where MC is weakest and where the construct claims to live.** The 3PL loses the most
   information at low theta [29], and "above the child's measured level" places every response there. The design's
   central premise sits on its weakest measurement regime.

7. **Field pressure runs toward this construct, not away.** [17] argues static psychometric identification alone is
   insufficient and can be discriminatory. The equity case for measuring learning rate is real, which is precisely
   why deploying an unvalidated version of it is dangerous — an equity-motivated instrument with loading
   noninvariance [6] would produce inequitable results while carrying an equity rationale.

## Starter hypotheses (NOT conclusions)

Each is testable by simulation against the existing harness; none is established by the retrieved literature.

- **H1.** A pre-registered, difficulty-frozen ladder that places items *symmetrically offset* around standing rather
  than at standing + 1 will recover lambda better than either the current adaptive loop or a flat "standing + 1"
  freeze — because [20] and [2] both give two-sided offset structures, and a one-sided freeze still has all mass at
  one point. Test: compare recovery under (a) adaptive, (b) frozen one-sided, (c) frozen two-sided offset, with the
  offset scaled to the expected lambda per [20].
- **H2.** Two 20-trial blocks separated by days will beat one 60-trial block at equal or lower total child time,
  because span enters effective error quadratically [21] while count enters linearly. The internal 45/60-trial gains
  set the benchmark to beat.
- **H3.** Much of the residual noise at 30 trials is rapid-guessing near the floor, not estimation error. An RT-based
  person-class filter [10] applied before fitting will raise r more per unit of build effort than any scoring change.
- **H4.** Because polytomous scoring's documented benefit is *reduced bias at low scores* [12], partial-credit or
  distractor-weighted scoring will improve lambda's *bias* more than its variance — a different and possibly more
  valuable win than the small reliability gain the literature reports.
- **H5.** lambda will fail a PRMSE-style added-value test against theta0 [4c] at 30 trials. If so, the honest output
  is a total score plus an explicit "learning-rate indeterminate" flag, on the [4c] institution-reporting precedent.
- **H6.** Loading-level invariance for lambda will fail across an interface-familiarity proxy before it fails across
  SES directly [6][26][27] — i.e. the mechanism of any SES bias in lambda will be interface familiarity, making it
  partially remediable by a practice block rather than requiring the construct's abandonment. [28] is the null that
  would falsify this.
- **H7.** A within-session learning curve saturates rather than being linear [23]. If so, a linear
  theta(t) = theta0 + lambda*t is misspecified, and part of the null-cohort positive lambda may be misspecification
  absorbing the difficulty walk. Test: fit a saturating form and re-run the null cohort.

## What this does NOT support

- **No retrieved source states that adaptive difficulty targeting destroys slope information.** That claim is an
  inference from [1] (slope needs c-optimality, not D-optimality), [2] (two-point offset structure; local
  optimality), [20] (growth-optimal designs are offset, not matched), and [24] (Fisher-tracking optimality is for a
  *static* parameter). The composition is sound but it is not a cited finding.
- **No quantitative MC-vs-constructed-response efficiency ratio is established here.** Lord (1980) [31] was NOT
  retrieved. The (1-c) slope attenuation and low-theta information loss ARE established [29][30], but those are
  practitioner/tertiary sources, not the primary derivation. Do not cite a numeric efficiency loss from this document.
- **No source gives a recoverability figure for this design.** Every "expected effect" in the levers table is a
  mechanism-based inference. The internal numbers (0.0398/0.0018; r = 0.33; +0.137; +0.240) come from the team's own
  work, not from the literature.
- **No source establishes a minimum number of occasions for an individual growth claim in children.** [21] and [22]
  disagree; [4a] gives a framework, not a threshold. Anyone quoting "you need N occasions" is over-reading.
- **No retrieved study tests DIF on a growth/slope parameter for ELL or device-familiarity subgroups.** [6] gives the
  loading-vs-intercept asymmetry from *simulation*; [26][27] give familiarity DIF *cross-sectionally* or on
  achievement without item-level invariance testing. The specific study this project needs does not appear to exist —
  which means the fairness evidence would have to be generated in-house, not cited.
- **No source blesses cohort-only reporting for a learning-rate measure.** [4c] establishes the PRMSE rule and an
  institution-level reporting precedent for *subscores*; extending that to a growth parameter is an analogy, not a
  citation. I found no retrieved treatment of "indeterminate" as a formally legitimate score output; that concept is
  asserted here without a source and needs its own search.
- **Nothing here evaluates whether the construct is worth measuring at all.** [16] tested the two premises and did so
  on a non-disadvantaged sample; [17] argues for dynamic assessment in principle. Neither validates a
  no-feedback, single-session, above-level slope as a gifted-identification signal.
- **No DOK-3 insight or DOK-4 SPOV is offered.** The ranking in the levers table is an evidence-strength ordering,
  not a recommendation, and the decision about whether to keep the individual-level claim is not made here.
