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
- **Reported result:** Approximately 0.28–0.29 SD full-sample gains; substantially larger effects for Black and Hispanic high achievers in the studied program.
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

### Yadlowsky et al. (2024) — Ranking Evaluation

- **DOI:** https://doi.org/10.1080/01621459.2024.2393466
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
- **Grade:** A−
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

### Lakkaraju et al. (2017) — Selective Labels

- **DOI:** https://doi.org/10.1145/3097983.3098066
- **Grade:** A
- **Use:** Shows why selectively observed outcomes undermine model evaluation and decision support.

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

- **URL:** https://imai.fas.harvard.edu/research/indtreat/
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
