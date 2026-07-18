# Annotated Source Register

## Evidence Grades

- **A:** Peer-reviewed causal study, meta-analysis, or methods canon
- **B:** Strong working paper, technical report, or externally valid adjacent evidence
- **C:** Context, publisher, company, or transfer evidence

## Initial Anchor Sources

### Card & Giuliano (2016) — High-Achiever Tracking

- **Title:** Can Tracking Raise the Test Scores of High-Ability Minority Students?
- **Venue:** American Economic Review, 106(10)
- **DOI:** https://doi.org/10.1257/aer.20150484
- **Grade:** A
- **Method:** Regression discontinuity around prior-achievement rank.
- **Reported result:** Approximately 0.27–0.29 SD local fuzzy-RD effects for compliers near within-school cutoffs; larger local effects for Black and Hispanic high achievers.
- **Use:** Direct evidence that a differentiated program can create measurable effects beyond selection for underserved high achievers.
- **Limit:** One district/program; achievement cutoff and tracked classroom differ from GT.

### Bui, Craig, & Imberman (2014) — Gifted Program Null

- **Title:** Is Gifted Education a Bright Idea? Assessing the Impact of Gifted and Talented Programs on Students
- **Venue:** AEJ: Economic Policy, 6(3)
- **DOI:** https://doi.org/10.1257/pol.6.3.30
- **Grade:** A
- **Method:** Regression discontinuity plus magnet lottery.
- **Reported result:** Generally near-zero short-run math/reading gains; science benefit in the lottery setting.
- **Use:** Closest cautionary analogue; selective placement does not guarantee program effect.
- **Limit:** Local/marginal estimands and different intervention.

### Abdulkadiroğlu, Angrist, & Pathak (2014) — Elite Illusion

- **Title:** The Elite Illusion: Achievement Effects at Boston and New York Exam Schools
- **Venue:** Econometrica, 82(1)
- **DOI:** https://doi.org/10.3982/ECTA10266
- **Grade:** A
- **Method:** Fuzzy regression discontinuity at exam-school cutoffs.
- **Reported result:** Large peer-quality changes with little effect on test scores or college outcomes near the cutoff.
- **Use:** Demonstrates how observed elite-school outcomes can be dominated by selection.
- **Limit:** Exam schools and cutoff-local applicants.

### Dobbie & Fryer (2014) — High-Achieving Peers

- **Title:** The Impact of Attending a School with High-Achieving Peers
- **Venue:** AEJ: Applied Economics, 6(3)
- **DOI:** https://doi.org/10.1257/app.6.3.58
- **Grade:** A
- **Method:** Regression discontinuity.
- **Use:** Additional null evidence against attributing selective-school outcomes to peers/program without causal identification.

### Angrist, Imbens, & Rubin (1996) — Instrumental Variables

- **Title:** Identification of Causal Effects Using Instrumental Variables
- **Venue:** Journal of the American Statistical Association, 91(434)
- **DOI:** https://doi.org/10.1080/01621459.1996.10476902
- **Grade:** A
- **Method:** IV/LATE framework.
- **Use:** Formal basis for randomized-offer/complier-effect analysis.

### Abdulkadiroğlu, Angrist, Narita, & Pathak (2017) — Lottery Pooling

- **Title:** Research Design Meets Market Design
- **Venue:** Econometrica, 85(5)
- **DOI:** https://doi.org/10.3982/ECTA13925
- **Grade:** A
- **Method:** Centralized assignment lotteries and design-based propensity scores.
- **Use:** Shows how to pool assignment variation and improve precision in school-choice evaluations.

### McBee, Peters, & Waterman (2014) — Multiple-Criteria Rules

- **Title:** Combining Scores in Multiple-Criteria Assessment Systems
- **Venue:** Gifted Child Quarterly, 58(1)
- **DOI:** https://doi.org/10.1177/0016986213513794
- **Grade:** A
- **Method:** Psychometric simulation of AND, OR, and compensatory rules.
- **Use:** Direct support for testing Track B rule choices and false-negative trade-offs.

### Imbens & Lemieux (2008) — RD Practice

- **Title:** Regression Discontinuity Designs: A Guide to Practice
- **Venue:** Journal of Econometrics, 142(2)
- **DOI:** https://doi.org/10.1016/j.jeconom.2007.05.001
- **Grade:** A
- **Use:** RD assumptions, estimation, bandwidth, and diagnostics.

### McCrary (2008) — Manipulation Test

- **Title:** Manipulation of the Running Variable in the Regression Discontinuity Design
- **Venue:** Journal of Econometrics, 142(2)
- **DOI:** https://doi.org/10.1016/j.jeconom.2007.05.005
- **Grade:** A
- **Use:** Detect score manipulation around a protected threshold.

### Rosenbaum & Rubin (1983) — Propensity Scores

- **Title:** The Central Role of the Propensity Score in Observational Studies for Causal Effects
- **Venue:** Biometrika, 70(1)
- **DOI:** https://doi.org/10.1093/biomet/70.1.41
- **Grade:** A
- **Use:** Observed-covariate balancing baseline.
- **Limit:** Cannot remove unmeasured selection such as family motivation.

## Expansion Areas

- Policy learning and empirical welfare maximization
- Causal forests and heterogeneous treatment effects
- Doubly robust evaluation and off-policy learning
- Calibration and selective-label bias
- Algorithmic fairness in education admissions
- Measurement error and regression to mean
- Attrition, missing outcomes, and principal stratification
- Interference and peer effects
- Sequential and multi-year pooled designs
- Advanced STEM-readiness and above-level outcomes

## Policy Learning and Heterogeneous Effects

### Athey & Imbens (2016) — Honest Causal Trees

- **DOI:** https://doi.org/10.1073/pnas.1510489113
- **Grade:** A
- **Use:** Separates subgroup discovery from effect estimation.

### Wager & Athey (2018) — Causal Forests

- **DOI:** https://doi.org/10.1080/01621459.2017.1319839
- **Grade:** A
- **Use:** Honest CATE estimation and inference after identified treatment variation exists.
- **Limit:** Does not identify an individual treatment effect.

### Athey, Tibshirani, & Wager (2019) — Generalized Random Forests

- **DOI:** https://doi.org/10.1214/18-AOS1709
- **Grade:** A
- **Use:** Local-moment estimation, including instrumental forests.

### Kitagawa & Tetenov (2018) — Empirical Welfare Maximization

- **DOI:** https://doi.org/10.3982/ECTA13288
- **Grade:** A
- **Use:** Capacity-constrained policy choice over transparent policy classes.

### Athey & Wager (2021) — Doubly Robust Policy Learning

- **DOI:** https://doi.org/10.3982/ECTA15732
- **Grade:** A
- **Use:** Policy-value optimization with doubly robust scores and constrained policy classes.
- **Limit:** Observational use still requires no unmeasured confounding.

### Zhou, Athey, & Wager (2023) — Offline Multi-Action Policies

- **DOI:** https://doi.org/10.1287/opre.2022.2271
- **Grade:** A
- **Use:** Cross-fitted AIPW rewards and interpretable policy trees.

### Sverdrup et al. (2020) — Policy Trees

- **DOI:** https://doi.org/10.21105/joss.02232
- **Software:** https://grf-labs.github.io/policytree/
- **Grade:** B
- **Use:** Implementable shallow policy-tree optimization.

### Yadlowsky et al. (online 2024; issue 2025) — Ranking Evaluation

- **DOI:** https://doi.org/10.1080/01621459.2024.2393466
- **Issue:** Journal of the American Statistical Association, 120(549), 38–51
- **Grade:** A
- **Use:** Held-out RATE/AUTOC inference for treatment-benefit rankings.

### Lakkaraju et al. (2017) — Selective Labels

- **DOI:** https://doi.org/10.1145/3097983.3098066
- **Grade:** A
- **Use:** Explains why outcomes observed after human selection cannot directly train improved decision policies.

## Power, Missingness, and Interference

### Bruhn & McKenzie (2009) — Stratification

- **DOI:** https://doi.org/10.1257/app.1.4.200
- **Use:** Blocking and pair matching in small randomized experiments.

### Lin (2013) — Covariate Adjustment

- **DOI:** https://doi.org/10.1214/12-AOAS583
- **Use:** Robust regression adjustment with treatment–covariate interactions.

### Little et al. (2012) — Missing Data

- **DOI:** https://doi.org/10.1056/NEJMsr1203730
- **Use:** Missing-data prevention, reporting, and sensitivity.

### Lee (2009) — Attrition Bounds

- **DOI:** https://doi.org/10.1111/j.1467-937X.2009.00536.x
- **Use:** Monotonicity-based trimming bounds for selection/attrition.

### Hudgens & Halloran (2008) — Interference

- **DOI:** https://doi.org/10.1198/016214508000000292
- **Use:** Direct and spillover causal estimands under interference.

### Aronow & Samii (2017) — General Interference

- **DOI:** https://doi.org/10.1214/16-AOAS1005
- **Use:** Estimation under general exposure mappings.

### Cinelli & Hazlett (2020) — Omitted Confounding

- **DOI:** https://doi.org/10.1111/rssb.12348
- **Use:** Partial-\(R^2\) sensitivity analysis for unobserved confounding.

## Advanced STEM Readiness

### Lubinski & Benbow (2006) — SMPY Review

- **DOI:** https://doi.org/10.1111/j.1745-6916.2006.00019.x
- **Grade:** A
- **Use:** Longitudinal value of above-level reasoning in highly able populations.
- **Limit:** Selected historical cohorts; predictive, not causal.

### Wai, Lubinski, & Benbow (2009) — Spatial Ability

- **DOI:** https://doi.org/10.1037/a0016127
- **Grade:** A
- **Use:** Spatial ability adds information about later STEM pathways.

### Steenbergen-Hu & Moon (2011) — Acceleration

- **DOI:** https://doi.org/10.1177/0016986210383155
- **Grade:** B
- **Use:** Academic and social-emotional evidence on acceleration.
- **Limit:** Mostly nonrandom selection into acceleration.

### NWEA — MAP Growth Technical Report 2024–2025

- **URL:** https://www.nwea.org/uploads/MAP-Growth-Technical-Report-2025.pdf
- **Grade:** C
- **Use:** Current scale, reliability, conditional error, and upper-tail limits.

### MIT Admissions — Academic Foundations

- **URL:** https://mitadmissions.org/apply/prepare/foundations/
- **Grade:** C
- **Use:** Context for advanced STEM domains only.
- **Limit:** Does not define grade-8 readiness or predict admission.

## Backend, Audit, and Reproducibility

### W3C PROV Data Model

- **URL:** https://www.w3.org/TR/prov-dm/
- **Use:** Provenance entities, activities, and agents.

### PostgreSQL Row Security

- **URL:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Use:** Default-deny role and row isolation.

### Supabase Row-Level Security

- **URL:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **Use:** Prototype role/access implementation.

### RFC 8785 — JSON Canonicalization

- **URL:** https://www.rfc-editor.org/rfc/rfc8785.html
- **Use:** Stable policy, feature, and decision fingerprints.

### RFC 8493 — BagIt

- **URL:** https://www.rfc-editor.org/rfc/rfc8493.html
- **Use:** Checksum-verifiable evaluation export packages.

## Selective Labels and Missing Outcomes

### Heckman (1979) — Sample Selection

- **DOI:** https://doi.org/10.2307/1912352
- **Grade:** A
- **Use:** Structural selection correction and specification-error framing.
- **Limit:** Depends strongly on model form and a credible exclusion variable.

### Manski (1989) — Anatomy of Selection

- **DOI:** https://doi.org/10.2307/145818
- **Grade:** A
- **Use:** Partial-identification perspective when point identification is unjustified.

### Kleinberg et al. (2018) — Human Decisions and Machine Predictions

- **DOI:** https://doi.org/10.1093/qje/qjx032
- **Grade:** A
- **Use:** Decision-maker variation and algorithm evaluation under selective labels.

### Coston et al. (2020) — Counterfactual Risk

- **DOI:** https://doi.org/10.1145/3351095.3372851
- **Grade:** A
- **Use:** Fairness/evaluation when target outcomes depend on decisions.

### Wei (2021) — Decision-Making Under Selective Labels

- **URL:** https://proceedings.mlr.press/v139/wei21a.html
- **Grade:** A
- **Use:** Learning/decision limits under selective observation.

## CATE Calibration and Policy Evaluation

### Chernozhukov et al. (2025) — Generic HTE Inference

- **DOI:** https://doi.org/10.3982/ECTA19303
- **Grade:** A
- **Use:** BLP, GATES, and repeated-split inference.

### Imai & Li (2023) — Experimental Policy Evaluation

- **DOI:** https://doi.org/10.1080/01621459.2021.1923511
- **Grade:** A
- **Use:** PAPE/AUPEC and finite-sample randomized evaluation of treatment rules.

### Xu & Yadlowsky (2022) — CATE Calibration

- **URL:** https://proceedings.mlr.press/v151/xu22c/xu22c.pdf
- **Grade:** A
- **Use:** Robust calibration-error evaluation for heterogeneous-effect models.

### Lei & Candès (2021) — Conformal Counterfactuals

- **DOI:** https://doi.org/10.1111/rssb.12445
- **Grade:** A
- **Use:** Marginal counterfactual/ITE interval methods under randomized settings.
- **Limit:** Does not provide conditional individual-effect truth.

## Complex Regression Discontinuity

### Papay, Willett, & Murnane (2011) — Multiple Assignment Variables

- **DOI:** https://doi.org/10.1016/j.jeconom.2010.12.008
- **Grade:** A
- **Use:** RD when more than one assignment variable controls treatment.

### Reardon & Robinson (2012) — Multiple Rating Scores

- **DOI:** https://doi.org/10.1080/19345747.2011.609583
- **Grade:** A
- **Use:** Education-specific RD with multiple rating-score variables.

### Cattaneo et al. (2016) — Multiple Cutoffs

- **DOI:** https://doi.org/10.1086/686802
- **Grade:** A
- **Use:** Interpreting cutoff-specific and pooled RD effects.

### Caetano, Caetano, & Escanciano (2023) — Multivalued Treatment RD

- **DOI:** https://doi.org/10.1002/jae.2982
- **Grade:** A
- **Use:** RD with multiple treatment states such as none/Track A/Track B.

### Kolesár & Rothe (2018) — Discrete Running Variable

- **DOI:** https://doi.org/10.1257/aer.20160945
- **Grade:** A
- **Use:** Inference when scores are coarse, rounded, or heavily tied.

### Abdulkadiroğlu et al. (2022) — Breaking Ties

- **DOI:** https://doi.org/10.3982/ECTA17125
- **Grade:** A
- **Use:** Randomized tie-breakers and local assignment propensities.

## Reviewer Reliability and Rubric Validation

### Cohen (1960, 1968) — Kappa

- **DOI:** https://doi.org/10.1177/001316446002000104
- **Weighted kappa DOI:** https://doi.org/10.1037/h0026256
- **Use:** Nominal and ordinal pairwise agreement.

### Gwet (2008) — Agreement Under Prevalence Imbalance

- **DOI:** https://doi.org/10.1348/000711006X126600
- **Use:** AC1 as a complement when kappa is prevalence-sensitive.

### Gwet (2014) — AC2

- **Source:** Handbook of Inter-Rater Reliability, 4th ed., ISBN 9780970806284
- **Use:** Weighted AC2 for ordinal agreement.

### Fleiss (1971) — Many-Rater Kappa

- **DOI:** https://doi.org/10.1037/h0031619
- **Use:** Nominal agreement among exchangeable raters.

### Conger (1980) — Generalized Kappa

- **DOI:** https://doi.org/10.1037/0033-2909.88.2.322
- **Use:** Multiple named raters with differing marginals.

### Krippendorff (2004) — Alpha

- **DOI:** https://doi.org/10.1093/hcr/30.3.411
- **Use:** Agreement with missing ratings or variable reviewer counts.

### Brennan (2001) — Generalizability Theory

- **DOI:** https://doi.org/10.1007/978-1-4757-3456-0
- **Use:** Rater, task, occasion, and interaction variance.

### Myford & Wolfe (2003) — Rater Effects

- **URL:** https://pubmed.ncbi.nlm.nih.gov/14523257/
- **Use:** Many-facet Rasch background and reviewer-effect framing.

### Myford & Wolfe (2004) — Rater Diagnostics

- **URL:** https://pubmed.ncbi.nlm.nih.gov/15064538/
- **Use:** Severity, halo, randomness, and differential-severity diagnostics.

### Mislevy, Steinberg, & Almond (2003) — Evidence-Centered Design

- **DOI:** https://doi.org/10.1207/S15366359MEA0101_02
- **Use:** Student, evidence, task, scoring, and decision models.

### Kane (2013) — Argument-Based Validation

- **DOI:** https://doi.org/10.1111/jedm.12000
- **Use:** Use-specific interpretation, warrants, assumptions, and rebuttals.

## Fairness and Contestability

### Hardt, Price, & Srebro (2016) — Equalized Odds

- **URL:** https://proceedings.neurips.cc/paper_files/paper/2016/file/6a9659feb1216f14f7384ba499518b38-Paper.pdf
- **Use:** Equalized odds and equal opportunity after valid labels exist.

### Kleinberg, Mullainathan, & Raghavan (2017) — Fairness Trade-offs

- **DOI:** https://doi.org/10.4230/LIPIcs.ITCS.2017.43
- **Use:** Incompatibility among calibration and error-rate criteria.

### Chouldechova (2017) — Calibration and Error Balance

- **DOI:** https://doi.org/10.1089/big.2016.0047
- **Use:** Predictive-parity/error-rate trade-offs.

### Cherian & Candès (2024) — Fairness Auditing Inference

- **URL:** https://www.jmlr.org/papers/v25/23-0739.html
- **Use:** Simultaneous statistical inference across subgroup audits.

### Jacobs & Wallach (2021) — Measurement and Fairness

- **DOI:** https://doi.org/10.1145/3442188.3445901
- **Use:** Construct validity as a prerequisite for fairness claims.

### Kuncel et al. (2013) — Mechanical Combination

- **DOI:** https://doi.org/10.1037/a0034156
- **Use:** Mechanical combination generally outperforms freeform holistic judgment.

### Rudin (2019) — Interpretable High-Stakes Models

- **DOI:** https://doi.org/10.1038/s42256-019-0048-x
- **Use:** Prefer intrinsically interpretable models over post-hoc explanation in high-stakes settings.

## Uncertainty and Abstention

### Chow (1970) — Reject Option

- **DOI:** https://doi.org/10.1109/TIT.1970.1054406
- **Use:** Decision-theoretic abstention when error and deferral costs are known.

### Bartlett & Wegkamp (2008) — Classification with Reject Option

- **URL:** https://www.jmlr.org/papers/v9/bartlett08a.html
- **Use:** Consistent reject-option learning under valid labels.

### Bates et al. (2021) — Risk-Controlling Prediction Sets

- **DOI:** https://doi.org/10.1145/3478535
- **Use:** Finite-sample risk control with representative calibration data.

### Mozannar & Sontag (2020) — Learning to Defer

- **URL:** https://proceedings.mlr.press/v119/mozannar20b.html
- **Use:** Model/expert routing after expert behavior and ground truth exist.

## Randomized Allocation and Aid

### Morgan & Rubin (2012) — Rerandomization

- **DOI:** https://doi.org/10.1214/12-AOS1008
- **Grade:** A
- **Use:** Prespecified covariate-balance constraints and resulting inference.

### Bugni, Canay, & Shaikh (2018) — Covariate-Adaptive Randomization

- **DOI:** https://doi.org/10.1080/01621459.2017.1375934
- **Grade:** A
- **Use:** Valid inference under adaptive/stratified assignment.

### de Chaisemartin & Behaghel (2020) — Randomized Waiting Lists

- **DOI:** https://doi.org/10.3982/ECTA16032
- **Grade:** A
- **Use:** Treatment-effect estimation with randomized waitlist mechanisms.

### Frangakis & Rubin (2002) — Principal Stratification

- **DOI:** https://doi.org/10.1111/j.0006-341X.2002.00021.x
- **Grade:** A
- **Use:** Post-assignment compliance and latent principal strata.

### Hernán & VanderWeele (2011) — Compound Treatments

- **DOI:** https://doi.org/10.1097/EDE.0b013e3182109296
- **Grade:** A
- **Use:** Clarifies that different aid/support packages define different treatments.

### Dynarski et al. (2021) — HAIL Aid Guarantee

- **DOI:** https://doi.org/10.1257/aer.20200451
- **Grade:** A
- **Use:** Evidence that aid certainty and communication alter enrollment behavior.

### Bettinger et al. (2012) — FAFSA Assistance

- **DOI:** https://doi.org/10.1093/qje/qjs017
- **Grade:** A
- **Use:** Administrative aid support can itself change enrollment.

### Fairlie & Robinson (2013) — Technology Access

- **DOI:** https://doi.org/10.1257/app.5.3.211
- **Grade:** A
- **Use:** Technology provision is a treatment component and is not automatically an academic benefit.

## Auditable Randomness and Allocation Security

### NIST SP 800-90A/B/C — Random Number Generation

- **URLs:** https://csrc.nist.gov/pubs/sp/800/90/a/r1/final, https://csrc.nist.gov/pubs/sp/800/90/b/final, https://csrc.nist.gov/pubs/sp/800/90/c/final
- **Use:** CSPRNG and entropy-source standards.

### RFC 2104 / RFC 4231 — HMAC

- **URLs:** https://www.rfc-editor.org/rfc/rfc2104 and https://www.rfc-editor.org/rfc/rfc4231
- **Use:** Domain-separated deterministic ranking and test vectors.

### RFC 5869 — HKDF

- **URL:** https://www.rfc-editor.org/rfc/rfc5869
- **Use:** Derive assignment key from frozen manifest and randomness.

### RFC 8032 — Ed25519

- **URL:** https://www.rfc-editor.org/rfc/rfc8032
- **Use:** Signed freeze and result manifests.

### drand Protocol

- **URL:** https://docs.drand.love/developer/
- **Use:** Publicly verifiable future randomness beacon.

### SPIRIT and CONSORT 2025

- **SPIRIT DOI:** https://doi.org/10.1038/s41591-025-03668-w
- **CONSORT DOI:** https://doi.org/10.1038/s41591-025-03635-5
- **Use:** Prespecified allocation, concealment, protocol, and reporting.

### What Works Clearinghouse Handbook 5.0

- **URL:** https://ies.ed.gov/ncee/WWC/handbooks
- **Version:** Procedures and Standards Handbook 5.0, August 2022; revised December 2022, with Study Review Protocol 5.1
- **Use:** Education-study design, attrition, baseline, and evidence standards.
- **Limit:** Reporting/standards guidance does not establish GT-specific causal validity.

## Growth Outcomes and Falsification

### Vickers & Altman (2001) — ANCOVA

- **DOI:** https://doi.org/10.1136/bmj.323.7321.1123
- **Use:** Baseline-adjusted endpoint analysis over simple change scores.

### Lord (1967) — Gain/Adjustment Paradox

- **DOI:** https://doi.org/10.1037/h0025105
- **Use:** Shows nonrandom gain and adjusted comparisons can answer different questions.

### Betebenner (2009) — Student Growth Percentiles

- **DOI:** https://doi.org/10.1111/j.1745-3992.2009.00161.x
- **Use:** Defines descriptive conditional growth, not causal value added.

### Lipsitch, Tchetgen Tchetgen, & Cohen (2010) — Negative Controls

- **DOI:** https://doi.org/10.1097/EDE.0b013e3181d61eeb
- **Use:** Negative-control outcomes/exposures as bias diagnostics.

### Callaway & Sant’Anna (2021) — Staggered DiD

- **DOI:** https://doi.org/10.1016/j.jeconom.2020.12.001
- **Use:** Cohort/time ATT under staggered adoption.

### Sun & Abraham (2021) — Event Studies

- **DOI:** https://doi.org/10.1016/j.jeconom.2020.09.006
- **Use:** Avoid contaminated TWFE event-study coefficients.

### Rambachan & Roth (2023) — HonestDiD

- **DOI:** https://doi.org/10.1093/restud/rdad018
- **Use:** Sensitivity to deviations from parallel trends.

### Simonsohn, Simmons, & Nelson (2020) — Specification Curves

- **DOI:** https://doi.org/10.1038/s41562-020-0912-z
- **Use:** Display preregistered estimand-preserving analysis choices.

### VanderWeele & Ding (2017) — E-Value

- **DOI:** https://doi.org/10.7326/M16-2607
- **Use:** Risk-ratio-scale unmeasured-confounding sensitivity.

### Oster (2019) — Coefficient Stability

- **DOI:** https://doi.org/10.1080/07350015.2016.1227711
- **Use:** Proportional-selection sensitivity with explicit \(R_{max}\).

## Reproducible Evaluator Exports

### NIST SP 800-188 — De-Identification

- **URL:** https://csrc.nist.gov/pubs/sp/800/188/final
- **Use:** Disclosure-risk and de-identification process.

### NIST SP 800-226 — Differential Privacy

- **URL:** https://csrc.nist.gov/pubs/sp/800/226/final
- **Use:** Evaluate DP guarantees and limitations.

### RO-Crate

- **URL:** https://www.researchobject.org/ro-crate/specification/1.3/index.html
- **Version:** 1.3.0, June 2026
- **Use:** Package data, code, metadata, and provenance.

### DDI Lifecycle

- **URL:** https://ddialliance.org/ddi-lifecycle
- **Use:** Variable-level data-dictionary model.

### OCI Image Specification

- **URL:** https://github.com/opencontainers/image-spec/blob/v1.1.1/descriptor.md
- **Use:** Immutable environment digests.

### National Academies (2019) — Reproducibility

- **URL:** https://www.nationalacademies.org/read/25303/chapter/2
- **Use:** Reproducibility/replicability definitions and practices.

## Tutoring, Adaptive Software, and Program Mechanisms

### Nickow, Oreopoulos, & Quan (2024) — Tutoring Meta-Analysis

- **DOI:** https://doi.org/10.3102/00028312231208687
- **Grade:** A
- **Use:** Pooled human-tutoring benchmark of approximately 0.288 SD.
- **Limit:** Primarily mainstream/struggling students, not gifted software-led replacement instruction.

### Kraft, Schueler, & Falken (2026) — Tutoring at Scale

- **DOI:** https://doi.org/10.3102/00346543261446660
- **Grade:** A
- **Use:** Distinguishes full-sample tutoring effects from large-scale independent standardized-outcome effects around 0.16–0.22 SD.

### Guryan et al. (2023) — High-Dosage Math Tutoring

- **DOI:** https://doi.org/10.1257/aer.20210434
- **Grade:** A
- **Use:** Large secondary-math RCT with pooled roughly 0.28-SD participant effect and persistence evidence.

### Steenbergen-Hu & Cooper (2013) — K–12 ITS Math

- **DOI:** https://doi.org/10.1037/a0032447
- **Grade:** A
- **Use:** Direct K–12 ITS synthesis; adjusted average near zero.

### Ma et al. (2014) — ITS Meta-Analysis

- **DOI:** https://doi.org/10.1037/a0037123
- **Grade:** A
- **Use:** Broad ITS effect by counterfactual, grade, and prior knowledge.
- **Limit:** Mixed levels/designs and high heterogeneity.

### Kulik & Fletcher (2016) — Intelligent Tutoring Review

- **DOI:** https://doi.org/10.3102/0034654315581420
- **Grade:** A
- **Use:** Shows large gap between local/aligned and standardized outcomes.

### Roschelle et al. (2016) — ASSISTments RCT

- **DOI:** https://doi.org/10.1177/2332858416673968
- **Grade:** A
- **Use:** Independent cluster RCT with approximately 0.18-SD initial effect.

### Cognitive Tutor Algebra I Trial

- **DOI:** https://doi.org/10.3102/0162373713507480
- **Grade:** A
- **Use:** Null first-year and approximately +0.20 second-year high-school effect; demonstrates implementation learning.

### Reasoning Mind Randomized Trial

- **DOI:** https://doi.org/10.1177/2332858419850482
- **Grade:** A
- **Use:** Full-year school-randomized null/slightly negative evidence despite earlier positive quasi-experiments.

### Agarwal & Gaule (2026) — Developing Math Talent Worldwide

- **URL:** https://docs.iza.org/dp18381.pdf
- **Grade:** B
- **Use:** Preliminary gifted/Olympiad advanced-course RCT with approximately +0.165-SD ITT.
- **Limit:** Working paper, author-linked nonprofit implementation, 15% full engagement, stronger-assumption IV estimate.

### Muralidharan, Singh, & Ganimian (2019) — Mindspark

- **DOI:** https://doi.org/10.1257/aer.20171112
- **Grade:** A
- **Use:** Adaptive software field RCT and baseline-achievement analysis.

### Reis et al. (1998) — Curriculum Compacting

- **DOI:** https://doi.org/10.1177/001698629804200206
- **Grade:** B
- **Use:** Randomized district-training study showing 40%–50% compacting without broad achievement loss.

### Duflo, Dupas, & Kremer (2011) — Tracking

- **DOI:** https://doi.org/10.1257/aer.101.5.1739
- **Grade:** A
- **Use:** Randomized grouping evidence supporting readiness-targeted instruction rather than peer sorting alone.

### Kulik, Kulik, & Bangert-Drowns (1990) — Mastery Learning

- **DOI:** https://doi.org/10.3102/00346543060002265
- **Grade:** B
- **Use:** Mastery effect synthesis and completion/moderator cautions.

### Tetzlaff et al. (2025) — Expertise Reversal

- **DOI:** https://doi.org/10.1016/j.learninstruc.2025.102142
- **Grade:** A
- **Use:** Meta-analytic evidence that assistance × prior-knowledge fit matters.

## Effect-Size and Meaningful-Effect Benchmarks

### Kraft (2020) — Education Effect-Size Benchmarks

- **DOI:** https://doi.org/10.3102/0013189X20912798
- **Grade:** A
- **Use:** Empirical distribution of causal standardized achievement effects.
- **Limit:** Descriptive benchmark, not a universal MME.

### Hill et al. (2008) — Empirical Benchmarks

- **DOI:** https://doi.org/10.1111/j.1750-8606.2008.00061.x
- **Grade:** A
- **Use:** Compare effect sizes with grade/subject growth and similar interventions.

### Lakens, Scheel, & Isager (2018) — Equivalence Testing

- **DOI:** https://doi.org/10.1177/2515245918770963
- **Grade:** A
- **Use:** Equivalence tests with preregistered smallest effect size of interest.

### Bailey et al. (2017) — Persistence and Fadeout

- **DOI:** https://doi.org/10.1080/19345747.2016.1232459
- **Grade:** A
- **Use:** Framework for persistence and fadeout of educational intervention effects.

## Recent 2024–2026 Evidence

### Card, Chyn, & Giuliano (revised 2026) — Long-Run Gifted Effects

- **DOI:** https://doi.org/10.3386/w33282
- **Grade:** B
- **Status:** NBER working paper, revised May 2026, forthcoming JPE
- **Use:** Null short-run tests but large local on-time college-entry effect for disadvantaged marginally eligible boys.
- **Limit:** Donut fuzzy RD, local subgroup/compliers, attrition/data restrictions, noncognitive mechanism inferred.

### Bastani et al. (2025) — GenAI Learning Harm

- **DOI:** https://doi.org/10.1073/pnas.2422633122
- **Grade:** A
- **Use:** Unrestricted GPT assistance improved practice while harming unassisted performance; guardrailed hints avoided harm.

### De Simone et al. (2025) — Teacher-Guided GenAI

- **DOI:** https://doi.org/10.1596/1813-9450-11125
- **Grade:** B
- **Use:** Six-week Nigeria package with positive English/composite effects.
- **Limit:** Working paper, complete package, local outcomes, substantial analysis attrition.

### Bhatt et al. (2024) — Hybrid Tutoring and CAL

- **DOI:** https://doi.org/10.3386/w32510
- **Grade:** B
- **Use:** Human/software hybrid tutoring with positive standardized math effects and lower costs.

### Kraft, Edwards, & Cannata (2024) — District Tutoring at Scale

- **DOI:** https://doi.org/10.26300/zcw7-4547
- **Grade:** B
- **Use:** Large district program showing modest reading and null average math/course-grade effects.

### Chen, Li, & Mao (2025) — Selective Labels with Multiple Decision-Makers

- **URL:** https://proceedings.mlr.press/v267/chen25al.html
- **Grade:** A
- **Use:** Point/partial identification using decision-maker variation under strong assumptions.

### Sun (2026) — Constrained Welfare Maximization

- **DOI:** https://doi.org/10.1016/j.jeconom.2025.106169
- **Grade:** A
- **Use:** Welfare/feasibility trade-offs when costs or take-up must be estimated.

### Abdulkadiroğlu & Back (2024) — Weighted Lotteries

- **DOI:** https://doi.org/10.1257/pandp.20241135
- **Grade:** B
- **Use:** Assignment-based research design with weighted school-choice lottery tie-breakers.

### Simson, Pfisterer, & Kern (2024) — Fairness Metric Fragility

- **DOI:** https://doi.org/10.1145/3630106.3658974
- **Grade:** A
- **Use:** Evaluation choices can dramatically alter fairness scores; metrics/denominators require locking.

## Standard Setting and Decision Utility

### Plake, Hambleton, & Jaeger (1997) — Dominant Profiles

- **DOI:** https://doi.org/10.1177/0013164497057003002
- **Use:** Configural standard setting for multidimensional profiles.

### Plake & Hambleton (2000) — Categorical Assignment

- **DOI:** https://doi.org/10.1207/s15326977ea0603_2
- **Use:** Direct complete-profile classification.

### Vickers & Elkin (2006) — Decision Curve Analysis

- **DOI:** https://doi.org/10.1177/0272989X06295361
- **Use:** Net benefit across threshold/cost assumptions.

### Drummond & Holte (2006) — Cost Curves

- **DOI:** https://doi.org/10.1007/s10994-006-8199-5
- **Use:** Classifier cost/prevalence trade-offs without one fixed cost.

## Transportability and External Validity

### Stuart et al. (2011) — Trial Generalizability

- **DOI:** https://doi.org/10.1111/j.1467-985X.2010.00673.x
- **Use:** Sampling weights from randomized trial to target population.

### Tipton (2013) — Generalizing Experiments

- **DOI:** https://doi.org/10.3102/1076998612441947
- **Use:** Generalization weights and target-population diagnostics.

### Pearl & Bareinboim (2014) — External Validity

- **DOI:** https://doi.org/10.1214/14-STS486
- **Use:** Formal transportability and selection diagrams.

### Dahabreh & Hernán (2019) — Trial Transport

- **DOI:** https://doi.org/10.1007/s10654-019-00533-2
- **Use:** Identification conditions for transporting randomized effects.

### Debray et al. (2013) — Internal-External Validation

- **DOI:** https://doi.org/10.1002/sim.5732
- **Use:** Leave-one-context-out prediction-rule validation.

## Monitoring and Drift

### NIST AI 800-4 (2026) — Deployed AI Monitoring

- **DOI:** https://doi.org/10.6028/NIST.AI.800-4
- **Use:** Final March 2026 report cataloging monitoring categories, gaps, barriers, and open questions.
- **Limit:** It does not validate this package’s proposed cadence, statistical alarms, or response rules.

### Gama et al. (2014) — Concept Drift

- **DOI:** https://doi.org/10.1145/2523813
- **Use:** Drift taxonomy and adaptation review.

### Perdomo et al. (2020) — Performative Prediction

- **URL:** https://proceedings.mlr.press/v119/perdomo20a.html
- **Use:** Policies alter future data and outcome relationships.

### Steyerberg et al. (2004) — Model Updating

- **DOI:** https://doi.org/10.1002/sim.1844
- **Use:** Validation, recalibration, and model revision ladder.

### Mitchell et al. (2019) — Model Cards

- **DOI:** https://doi.org/10.1145/3287560.3287596
- **Use:** Document model purpose, performance, limitations, and groups.

## Fidelity and Economic Evaluation

### Carroll et al. (2007) — Fidelity Framework

- **DOI:** https://doi.org/10.1186/1748-5908-2-40
- **Use:** Adherence and moderating implementation factors.

### O’Donnell (2008) — K–12 Fidelity Review

- **DOI:** https://doi.org/10.3102/0034654307313793
- **Use:** Fidelity measurement in educational interventions.

### Moore et al. (2015) — Process Evaluation

- **DOI:** https://doi.org/10.1136/bmj.h1258
- **Use:** Implementation, mechanisms, and context alongside outcomes.

### Imai, Keele, & Yamamoto (2010) — Causal Mediation

- **DOI:** https://doi.org/10.1214/10-STS321
- **Use:** Mediation identification and sensitivity.

### IES Economic Evaluation Standards

- **URL:** https://ies.ed.gov/sites/default/files/ies/document/2024/10/Standards%20for%20the%20Economic%20Evaluation%20of%20Educational%20and%20Social%20Programs.pdf
- **Use:** Ingredients-based costing and education economic evaluation.
