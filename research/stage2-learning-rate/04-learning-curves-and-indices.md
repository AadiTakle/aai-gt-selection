# Learning Curves and Cheaper Learning Indices (DOK 2)

Research question set:
- Q1: Is a straight-line climb the right functional form for an individual over ~30 trials?
- Q2: What cheaper quantity could replace a fitted slope?

Status: IN PROGRESS — sources appended as retrieved.

## Sources

_(numbered; only verified retrievals. Where I could only verify the citation + abstract-level content
and not the full text, that is stated explicitly.)_

### Q1 — functional form of an individual learning curve

1. **Newell, A., & Rosenbloom, P. S. (1981).** "Mechanisms of skill acquisition and the law of
   practice." In J. R. Anderson (Ed.), *Cognitive Skills and Their Acquisition* (pp. 1–55). Hillsdale,
   NJ: Erlbaum.
   URL: https://www.semanticscholar.org/paper/8f410281861aae69abb29bda90497c86ca929823 (PDF mirror:
   https://www.researchgate.net/profile/Paul-Rosenbloom/publication/243783833_Mechanisms_of_skill_acquisition_and_the_law_of_practice/links/5461086e0cf2c1a63bff7b62/Mechanisms-of-skill-acquisition-and-the-law-of-practice.pdf)
   Establishes the canonical claim that a *single* law — the power law of practice (linear in
   log-log space) — describes essentially all practice data, and offers chunking theory as the
   mechanism. This is the source of the default assumption that practice curves are decelerating,
   not linear. Verified: citation, section structure, data sources (Snoddy mirror-tracing;
   Crossman 1959 cigar-rolling; Seibel choice-RT). I did **not** retrieve the full chapter text.

2. **Heathcote, A., Brown, S., & Mewhort, D. J. K. (2000).** "The power law repealed: The case for an
   exponential law of practice." *Psychonomic Bulletin & Review*, 7(2), 185–207. DOI:
   10.3758/BF03212979.
   URL: https://link.springer.com/article/10.3758/BF03212979 (PDF:
   https://users.cs.northwestern.edu/~paritosh/papers/KIP/power-law-repealed.pdf)
   Fit power and exponential functions to 40 data sets = **7,910 learning series from 475 subjects
   across 24 experiments**. The exponential beat the power function in **all unaveraged** data sets;
   averaging **produced a bias in favour of the power function**. Their preferred form is the
   exponential or the APEX (exponential + pre-experimental-practice) function.
   NOTE ON THE PROMPT: the third author is **Mewhort**, not "Mercer". Verified: citation, abstract-level
   findings, the four numbers above. The PDF at the Northwestern mirror is a scanned/compressed PDF I
   could not text-extract, so I have **not** verified the paper's internal statements about
   minimum series length.

3. **Myung, I. J., Kim, C., & Pitt, M. A. (2000).** "Toward an explanation of the power law artifact:
   Insights from response surface analysis." *Memory & Cognition*, 28(5), 832–840. DOI:
   10.3758/BF03198418. PMID 10983457.
   URL: https://link.springer.com/article/10.3758/BF03198418
   Two results that matter here. (a) The power-law "artifact" arises from the combination of
   arithmetic averaging + a nonlinear generating model + individual differences. (b) **Simple power
   functions almost always fit purely random data better than simple exponentials** — i.e. the
   winning functional form can be determined by the noise level rather than by the learning. The
   geometric explanation is that the power function's response surface sits nearer the centre of the
   unit square, hence nearer a larger volume of possible noisy data. Verified: citation, abstract,
   and the (b) result as restated by Brown & Heathcote (source 5).

4. **Anderson, R. B. (2001).** "The power law as an emergent property." *Memory & Cognition*, 29(7),
   1061–1068. PMID 11820749. DOI: 10.3758/BF03195767.
   URL: https://link.springer.com/article/10.3758/BF03195767 (PDF mirror:
   https://users.cs.northwestern.edu/~paritosh/papers/KIP/PowerLawAsAnEmergentProperty.pdf)
   Simulated 100 traces per run with component curves that were exponential, range-limited linear,
   range-limited logarithmic, **or power**. Fit to a power function improved as **inter-component
   slope variability** increased, *regardless of component-curve type*. Conclusion: the ubiquity of
   the power law may reflect pervasive slope variability, and power-curve emergence "may be a
   methodological artifact, an explanatory construct, or both." Verified: citation, PMID, abstract-level
   design and result.

5. **Brown, S. D., & Heathcote, A. (2003).** "Bias in exponential and power function fits due to
   noise: Comment on Myung, Kim, and Pitt." *Memory & Cognition*, 31(4), 656–661. DOI:
   10.3758/BF03196105. PMID 12872880.
   URL: https://link.springer.com/content/pdf/10.3758/BF03196105.pdf
   The single most directly relevant methodological source. Replicates Myung et al.'s random-data
   bias and **extends it to realistic sample sizes**, and shows the bias also occurs for data
   containing **both random and systematic components** — i.e. real data. Critically: the biases
   **disappear for two- or three-parameter functions that include linear parameters**, and they
   conclude that **linear parameters should be estimated rather than fixed** when comparing
   nonlinear fits on noisy data. Verified: citation, PMID, DOI, abstract-level claims.

6. **Evans, N. J., Brown, S. D., Mewhort, D. J. K., & Heathcote, A. (2018).** "Refining the law of
   practice." *Psychological Review*, 125(4), 592–605. DOI: 10.1037/rev0000105.
   URL: https://www.semanticscholar.org/paper/Refining-the-Law-of-Practice-Evans-Brown/be0b36a99f5bc29d91a47af27b52f857f4d6862b
   The current state of the art. Both power and exponential forms assume the rate of change is
   **monotonically decreasing**; the authors show there are clear exceptions, and propose a law with
   an **initial delay** producing a **slower–faster–slower** pattern (power and exponential are
   limiting cases). Most paradigms favoured a **"delayed exponential law."** Two method points that
   matter directly: they use **hierarchical Bayesian modelling to pool data while limiting averaging
   artifacts** (i.e. neither per-individual OLS nor group averaging), and they model practice effects
   on the **whole RT distribution**, not just the mean. Verified via Semantic Scholar API metadata +
   abstract; full text not retrieved.

7. **Donner, Y., & Hardy, J. L. (2015).** "Piecewise power laws in individual learning curves."
   *Psychonomic Bulletin & Review*, 22(5), 1308–1319. DOI: 10.3758/s13423-015-0811-x.
   URL: https://link.springer.com/article/10.3758/s13423-015-0811-x
   Examined **25,280 individual learning curves, each with 500 performance measurements**, across four
   cognitive tasks. A **piecewise** power law (several segments joined at transition points) fit
   individual curves better than a single power law *even after penalising complexity*. Transitions
   featured a **short dip in performance at the changeover**, with later segments outperforming
   earlier ones; transition rate was **negatively related to age**. Interpretation: two concurrent
   processes — gradual within-strategy improvement plus a **discrete sequence of strategy shifts**.
   The scale is the headline number for our purposes: **500 trials per person** was the observation
   density used to see this structure. Verified via Semantic Scholar API metadata + abstract.

8. **Gallistel, C. R., Fairhurst, S., & Balsam, P. (2004).** "The learning curve: Implications of a
   quantitative analysis." *PNAS*, 101(36), 13124–13131. DOI: 10.1073/pnas.0404965101. PMID 15331782.
   URL: https://www.pnas.org/doi/abs/10.1073/pnas.0404965101 (PDF:
   https://www.pnas.org/content/101/36/13124.full.pdf)
   The strongest statement of the individual-vs-group problem. Across six paradigms (pigeon
   autoshaping, delay/trace eyeblink conditioning in rabbit and rat, autoshaped hopper entry, plus-maze,
   water maze) the **gradual negatively-accelerated curve is an artifact of group averaging**.
   Individual subjects show an **abrupt, step-like** rise from untrained to well-trained level — the
   transition occurring within roughly **1–10 trials**, "at least as abrupt as psychometric functions
   in stimulus detection." There are **large between-subject differences in onset latency and in
   asymptote that do not covary with each other**. They also argue that "stable asymptote" is illusory:
   performance shifts abruptly and unpredictably even hundreds of trials post-acquisition.
   **Directly relevant to Q2:** they propose replacing the fitted curve with **change-point summary
   statistics** — onset latency (trials to first change point), the *dynamic interval* and *first
   fraction* as abruptness measures, a notional asymptote, and a post-acquisition stability measure.
   Caveat noted in the citing literature: they did not offer a full quantitative model of individual
   curves, and the results may not generalise beyond animal conditioning. Verified: citation, PMID,
   DOI, page range, and the above findings at abstract/summary level; full text not extracted.

9. **Cronbach, L. J., & Furby, L. (1970).** "How we should measure 'change': Or should we?"
   *Psychological Bulletin*, 74(1), 68–80. DOI: 10.1037/h0029382.
   URL: https://gwern.net/doc/dual-n-back/1970-cronbach.pdf
   The classical case *against* individual change indices. Raw gain scores (post minus pre) "lead to
   fallacious conclusions, primarily because such scores are systematically related to random error of
   measurement." Their recommendation was to **reframe the research question so that no individual
   change score need be estimated**. This is the psychometric ancestor of the problem: an individual
   lambda is a gain score with extra steps. Verified: citation, volume/pages, DOI, and the core
   argument. Note that this paper is contested — see source 10.

### Q2 — psychometrics of individual change indices

10. **Rogosa, D. R., Brandt, D., & Zimowski, M. (1982).** "A growth curve approach to the measurement
    of change." *Psychological Bulletin*, 92(3), 726–748. DOI: 10.1037/0033-2909.92.3.726.
    URL: https://psycnet.apa.org/record/1983-04708-001
    The counter-camp to Cronbach & Furby. Change *is* measurable, but only from **individual time
    paths** with enough waves. Two waves are inadequate: with two points you **cannot separate error
    variance from genuine individual heterogeneity in change**, and you cannot know the shape of
    individual growth. They identify the **degenerate case**: when there are no true individual
    differences in change, the reliability of the difference score is necessarily **zero** — a
    difference score can be perfectly precise and still have zero reliability. Verified: citation,
    DOI, and the above characterisations from secondary literature (note: some sources list vol. 90;
    the DOI resolves to 92(3)). Full text not retrieved.

11. **Willett, J. B. (1988).** "Questions and answers in the measurement of change." *Review of
    Research in Education*, 15, 345–422. DOI: 10.3102/0091732X015001345.
    URL: https://doi.org/10.3102/0091732x015001345
    Companion: **Willett, J. B. (1989).** "Some results on reliability for the longitudinal
    measurement of change: Implications for the design of studies of individual growth."
    *Educational and Psychological Measurement*. (Cited by Rast & Hofer as the origin of **Growth Rate
    Reliability, GRR**.)
    Establishes that the precision *and* reliability of an individual OLS growth rate is a function of
    **the number of waves and their temporal spread**. I could **not** retrieve the full text, so I am
    flagging as unverified-from-source the specific sampling-variance expression
    σ²_ε / Σ(t_i − t̄)² that secondary sources and my own background attribute to this line of work.
    Treat the formula as a hypothesis to check against the primary text before citing it.

12. **Brandmaier, A. M., von Oertzen, T., Ghisletta, P., Lindenberger, U., & Hertzog, C. (2018).**
    "Precision, Reliability, and Effect Size of Slope Variance in Latent Growth Curve Models:
    Implications for Statistical Power Analysis." *Frontiers in Psychology*, 9, 294. DOI:
    10.3389/fpsyg.2018.00294.
    URL: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00294/full
    The modern quantitative treatment of "can I detect individual differences in slope?" Precision =
    inverse of **effective error**, which depends on instrument reliability, the **timing/spacing** of
    occasions, intercept variance, and intercept–slope covariance. They define **Effective Curve
    Reliability (ECR)** and show it tracks power where Willett's **GRR** does not (GRR "remains
    constant over conditions that alter statistical power" because it ignores intercept variance and
    intercept–slope covariance; GRR = ECR only when ICC2 = 1, ICC2 = 0, or time is centred so loadings
    sum to zero). Concrete numbers retrieved: with 5 occasions over 4 years, spacing {0,0.5,1,3,4} and
    {0,1,3,3.5,4} give the **same GRR (0.19)** but different ECR (0.28 vs 0.33) and different simulated
    power (0.51 vs 0.63). Effective error **decreases with the number of occasions M and decreases
    quadratically with the spread of measurement times**. Their noncentrality approximation is
    "dominated by a **quadratic** term of reliability and a **linear** term of sample size" — i.e.
    improving design reliability buys more than adding participants. They explicitly say raising N is
    "not the only, and not necessarily even the best way" to improve change sensitivity. Verified via
    full-text retrieval.
    **Bearing on our case:** ECR/GRR is the right currency for asking whether a 30-trial lambda can
    carry individual-difference information at all. Note they also warn analytic power values
    **overestimate** power and recommend a Monte Carlo check — which is what our simulation is.

13. **Grigorenko, E. L., & Sternberg, R. J. (1998).** "Dynamic testing." *Psychological Bulletin*,
    124(1), 75–111. And the book-length treatment: **Sternberg, R. J., & Grigorenko, E. L. (2002).**
    *Dynamic Testing: The Nature and Measurement of Learning Potential.* Cambridge University Press.
    URL: https://www.cambridge.org/us/academic/subjects/psychology/educational-psychology/dynamic-testing-nature-and-measurement-learning-potential
    (secondary review used: https://sajip.co.za/index.php/sajip/article/download/245/242)
    The field that has already tried to do what our screener is doing — measure learning potential
    rather than accumulated learning. The relevant verdict for us: **because of the methodological
    difficulties with difference (gain) scores, the field recommends using post-test performance as
    the indicator (Guthke, 1982) rather than a gain**; alternatives in use are (a) the **inverse of the
    minimal number of hints/prompts required, summed across stages**, and (b) **categorical
    classification** into Non-gainers / Gainers / High Scorers (Budoff). They also note limited
    empirical research and loosely standardised instruction phases as sources of unreliability.
    Verified: citation of the 1998 *Psych Bulletin* article and the 2002 book, plus these scoring
    recommendations, via the Cambridge page and a peer-reviewed secondary review. I did **not**
    retrieve the 1998 article's full text; page range 75–111 is from background knowledge and should
    be checked.

14. **Calero, M. D., García-Martín, M. B., & Robles, M. A. (2011).** "Learning potential in high IQ
    children: The contribution of dynamic assessment to the identification of gifted children."
    *Learning and Individual Differences*, 21(2), 176–181.
    URL: https://www.sciencedirect.com/science/article/abs/pii/S1041608010001676
    The most consequential empirical result for this product. Tested the premise that gifted children
    are those who gain most from training. Finding as reported: **gifted children were more accurate
    than average-ability agemates at BOTH pre-test and post-test, but showed SIMILAR levels of
    improvement — while needing FEWER instructions during training.** In other words the *gain* did
    not discriminate; the *number of prompts needed to reach criterion* did. Verified: citation and
    this finding at abstract/secondary-review level; full text is paywalled and I did **not** retrieve
    it. **This is a single study and needs direct verification of the exact contrast before it is
    load-bearing.**

    > **VERIFICATION NOTE — added 2026-07-31 by the aggregating session. The "gain did not
    > discriminate" reading is NOT confirmed, and the abstract points the other way.**
    > Checked against the ERIC record ([EJ917073](https://eric.ed.gov/?id=EJ917073)) and the
    > available secondary reception. What is confirmed: the sample is **127 Spanish urban
    > middle-class children aged 6–11 (64 high-IQ, 63 average-IQ)**, assessed with several dynamic
    > tests; the study tested the assumptions that Learning Potential differs between gifted and
    > average-IQ children, that the difference holds across diverse tasks, and that Learning
    > Potential predicts high/average status; and the reported result is *"Significant intergroup
    > differences were obtained and the tests were shown to have high predictive power."*
    > What is **NOT** in the abstract: any separate report of pre-test score, post-test score, or
    > gain. The abstract never decomposes "Learning Potential" into level versus change, and that
    > construct is operationalised inconsistently across this literature (raw post-test,
    > residualised gain, or a simple difference score), so which comparison drove the significance
    > cannot be determined from the abstract. Secondary reviews group this paper with studies that
    > **found** significant gifted/non-gifted differences on a dynamic test — i.e. it is cited in
    > the field as *supporting* dynamic testing for gifted identification, which is close to the
    > opposite of the use made of it below.
    > **Consequence: every downstream claim resting on "gifted children gained similarly" is
    > UNSUPPORTED pending the full text** (the record notes 3 tables and 1 figure, which should
    > carry the pre/post means). Rows 1 and 2 of the ranked table and the corresponding starter
    > hypotheses are annotated accordingly. Retrieve
    > doi:10.1016/j.lindif.2010.11.025 before this claim is used in any decision or presentation.

15. **Siegler, R. S., & Crowley, K. (1991).** "The microgenetic method: A direct means for studying
    cognitive development." *American Psychologist*, 46(6), 606–620. PMID 1952421.
    URL: https://pubmed.ncbi.nlm.nih.gov/1952421/ (accessible copy:
    https://canvas.northwestern.edu/courses/93054/files/6764696/download)
    Also: **Siegler, R. S. (2006).** "Microgenetic analyses of learning." In *Handbook of Child
    Psychology*, Vol. 2 (6th ed., pp. 464–510); **Siegler, R. S. (1996).** *Emerging Minds*, OUP;
    **Kuhn, D. (1995).** "Microgenetic study of change: What has it told us?" *Psychological Science*,
    6, 133–139.
    The three defining criteria: (a) observations of individual children **throughout the period of
    change**; (b) **density of observations high relative to the rate of change** of the phenomenon;
    (c) **trial-by-trial analysis** to infer the process. Two things matter for us. First, **density is
    defined relationally, not as an absolute trial count** — there is no "N trials is enough" answer;
    the requirement is indexed to how fast the competence is changing, and the observation window must
    *begin before* rapid change and continue until the competence is relatively stable. Second, in one
    variant Siegler **manipulates** density (presenting an unusually high density of experience to
    speed up development), which raises the question of whether the accelerated trajectory matches the
    natural one. The method's distinctive yield is exactly what pre/post designs cannot see:
    **short-lived transition strategies, sudden jumps, regressions, and plateaus** — a direct rebuttal
    to smooth monotonic acquisition. Siegler & Crowley are explicit that the cost in time and effort is
    high. A standing practical worry in this literature: repeated dense testing of children produces
    **boredom**, putting the density requirement in tension with data quality over long sessions.
    Verified: citation, PMID, the three criteria, and the variants/caveats above.

16. **Nelson, T. O. (1985).** "Ebbinghaus's contribution to the measurement of retention: Savings
    during relearning." *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 11(3),
    472–478.
    URL: https://www.semanticscholar.org/paper/a21403d941cb285f6deb345dd1b9759ea4a61388
    Also: **Murre, J. M. J., & Dros, J. (2022/2023)**, "Why Ebbinghaus' savings method from 1885 is a
    very 'pure' measure of memory performance" — URL: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9971077/
    (I verified the title and PMC location; I did not confirm the exact author list or year, so cite
    with care.)
    Savings Q(t) = (L − L_t)/L, where L = trials/time to criterion initially and L_t = trials/time to
    relearn to the same criterion. Savings is more sensitive than recall or recognition because it
    measures **"how much / how fast" rather than correct-vs-incorrect**, and can detect traces below
    the threshold for conscious retrieval.
    **The disqualifying caveat for our use case, and it is Nelson's own:** savings "can only be
    interpreted on an **interval scale** if the underlying learning process proceeds **linearly** with
    trials or time; otherwise comparing different magnitudes of savings is problematic, and fitting a
    forgetting curve to savings data becomes meaningless." That is the *same* linearity assumption our
    lambda makes — savings does not escape it, it inherits it. Savings also structurally requires a
    **retention interval and a second session**, which a single-session screener does not have.
    Verified: citation, formula, sensitivity claim, and the interval-scale caveat.

### Is within-session improvement even expected? (desirable difficulties / no feedback)

17. **Soderstrom, N. C., & Bjork, R. A. (2015).** "Learning versus performance: An integrative review."
    *Perspectives on Psychological Science*, 10(2), 176–199. DOI: 10.1177/1745691615569000.
    URL: https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/11/soderstorm_ra_learningvsperformance.pdf
    Companion: **Bjork, E. L., & Bjork, R. A. (2011).** "Making Things Hard on Yourself, But in a Good
    Way: Creating Desirable Difficulties to Enhance Learning." In *Psychology and the Real World*,
    59–68.
    The single most important conceptual source against a within-session performance slope as a learning
    measure. What is observable during acquisition is **performance**, "often an unreliable index of
    whether long-term changes have actually occurred." Both directions of the dissociation are
    established: **learning can occur with no discernible change in performance**, and **improvements
    in performance can fail to yield learning**; learning and performance "can in fact be inversely
    related." *Desirable difficulties* are, by definition, manipulations that **depress performance
    during acquisition** while enhancing retention and transfer. Theoretical framing: storage strength
    (learning) vs retrieval strength (performance), per Bjork & Bjork's new theory of disuse. Verified:
    citation, DOI, and these claims.
    **Bearing on our case:** serving items **above the child's measured level** is a textbook desirable
    difficulty. If it is working as intended, the expected within-session accuracy trajectory is
    **flat or depressed**, not climbing. A positive lambda is therefore not the prediction the design
    itself implies.

18. **Retrieval practice without feedback — what magnitude to expect.** Sources retrieved:
    (a) **Fazio, L. K., & Marsh, E. J. (2018/2019).** "A (Preliminary) Recipe for Obtaining a Testing
    Effect in Preschool Children: Two Critical Ingredients." *Frontiers in Psychology* — URL:
    https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6110808/ (author attribution NOT verified; I verified
    only the title and PMC id. Cite the PMC id, not the authors, until checked.)
    (b) **Karpicke, J. D., et al. (2013/2014).** "Retrieval Practice, with or without Mind Mapping,
    Boosts Fact Learning in Primary School Children." *PLOS ONE* — URL:
    https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3827082/ (same caveat on authors.)
    (c) "The magnitude of the testing effect is independent of retrieval practice performance" (2024),
    PMID 38695796 — URL: https://pubmed.ncbi.nlm.nih.gov/38695796/
    Established: the testing effect **does** occur without feedback (Spitzer's classic result), but
    without feedback, testing **"can only facilitate memories that were correctly retrieval
    practiced"** — if practice accuracy is too low the effect shrinks, because unretrieved items are
    not improved. In preschoolers a reliable testing effect required **cued-recall format at both
    practice and test**, and its magnitude was "dramatically enhanced" by **immediate feedback**. In
    primary-schoolers (8–12), no-feedback retrieval benefits appear at **4-day, 1-week and 5-week**
    delays — i.e. the measured outcome is *delayed retention*, not within-session accuracy.
    **Bearing on our case:** above-level items give low retrieval success, which is precisely the
    condition under which the no-feedback benefit is smallest. And the benefit, when it exists, shows
    up on a **later** test — outside a single session.

### Artifacts that manufacture an apparent climb with no learning

19. **Retest / practice-effect literature (multiple retrieved sources).**
    (a) "Predictors of retest effects in a longitudinal study of cognitive aging in a diverse
    community-based sample" — URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC4783169/
    (b) "Correction for retest effects across repeated measures of cognitive functioning" (2018),
    *BMC Medical Research Methodology* — URL:
    https://bmcmedresmethodol.biomedcentral.com/articles/10.1186/s12874-018-0530-x
    (c) "Practice Effects Associated with the Repeated Assessment of Cognitive Function Using the
    CogState Battery at 10-minute, One Week and One Month Test-retest Intervals" — URL:
    https://www.researchgate.net/publication/6945939
    (d) "Plateau of practice effects and noise with repeat SDMT testing in multiple sclerosis" — URL:
    https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12357967/
    (e) "Accounting for retest effects in cognitive testing with the Bayesian double exponential model
    via intensive measurement burst designs" — URL: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9549774/
    I verified titles, venues and URLs for these; I did **not** verify individual author lists, so cite
    by title/URL until checked.
    Established facts relevant to us:
    - Retest gains are **ubiquitous** on repeated cognitive testing and there is **no consensus** on how
      to correct for them; they are "extremely difficult to disentangle" from true change.
    - Magnitude: in one community cohort with a **two-year** interval, the retest gain averaged **more
      than ten times the annual rate of subsequent cognitive decline**. Practice effects are that large
      relative to the signal people care about.
    - **The regression-to-the-mean signature is the same signature.** Participants in the **lowest
      baseline quartile experienced the greatest boost from repeated testing** — "probably attributable
      to regression." Larger practice effects also for worse initial performers generally. So an
      estimated lambda will be **systematically largest for the lowest-scoring children**, and that
      pattern is indistinguishable from regression without a design that separates them.
    - Practice effects are **task-dependent**: they "did not occur on simple tasks, but rather on tasks
      that were most difficult to perform (e.g., associate learning)" — i.e. *harder* items produce
      *larger* practice artifacts, which is our above-level condition.
    - **Warm-up within a block is a distinct effect from retest gains across blocks**, and requires a
      model that has both (source (e) uses a Bayesian double-exponential with a within-burst warm-up
      term plus a between-burst retest term).
    - Plateau timing: on the SDMT, the practice-effect plateau was reached only after **18
      repetitions**, and a **≥7-point** change was needed to detect decline with 90% confidence.
    - **Mitigation with a real evidence base: the dual baseline** — treat the first assessment as
      practice and exclude it, which maximises test–retest reliability of later occasions and minimises
      regression to the mean. Also: **passive control groups** / non-treated comparison groups to
      estimate the pure practice component.

### K-8 specifics

20. **Godwin, K. E., Almeda, M. V., Seltman, H., Kai, S., Skerbetz, M. D., Baker, R. S., & Fisher, A. V.
    (2016).** "Off-task behavior in elementary school children." *Learning and Instruction*, 44, 128–143.
    URL: https://www.sciencedirect.com/science/article/abs/pii/S0959475216300275 (open copy:
    https://learninganalytics.upenn.edu/ryanbaker/Godwin-LI.pdf ; ERIC: ED568936)
    The strongest ecological evidence on within-session attention in our age band. K–4 students, 22
    classrooms (Study 1) + 30 more diverse classrooms (Study 2). **On-task behaviour declined as
    instructional duration increased from 10 to 30 minutes**; lowest on-task rates in whole-group
    formats; girls more on-task than boys. They cite lab findings that focused-attention duration rises
    from ~4 min at ages 2–3 to >9 min at ages 5–6, and note the lack of evidence-based guidelines for
    real settings. Verified: study design, sample, the 10→30 min result, and the venue. Author list is
    from the search result and page range should be double-checked.

21. **Sustained attention / vigilance decrement in young children.**
    (a) "Pupillometry as a Window into Young Children's Sustained Attention" — URL:
    https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9680391/ — children aged **5–7 (N = 41)** on a
    psychomotor vigilance task showed a "stereotypical vigilance decrement in response times": RT
    **increased** with time on task, and **task-evoked pupil size decreased** while baseline pupil size
    did not.
    (b) "A vigilance decrement comes along with an executive control decrement: Testing the
    resource-control theory," *Psychonomic Bulletin & Review* — URL:
    https://link.springer.com/article/10.3758/s13423-022-02089-x — attributes the decrement to declining
    executive control and increasing mind-wandering with time on task.
    Titles/URLs verified; author lists not verified.
    **Bearing on our case:** in K-8 children over a 30-item block, the *default* expectation for RT is
    that it gets **slower** late in the block from fatigue, at the same time as practice would make it
    **faster**. Any RT-based index in a single block confounds these two with opposite signs.

### Q2 candidates — RT/accuracy joint change, and transfer

22. **Dutilh, G., Vandekerckhove, J., Tuerlinckx, F., & Wagenmakers, E.-J. (2009).** "A diffusion model
    decomposition of the practice effect." *Psychonomic Bulletin & Review*, 16(6), 1026–1036. DOI:
    10.3758/16.6.1026. PMID 19966251.
    URL: https://ppw.kuleuven.be/okp/_pdf/Dutilh2009ADMDO.pdf
    Follow-up: **Dutilh, G., Krypotos, A.-M., & Wagenmakers, E.-J. (2011).** "Task-related versus
    stimulus-specific practice: A diffusion model account." *Experimental Psychology*, 58(6), 434–442.
    DOI: 10.1027/1618-3169/a000111. URL: https://econtent.hogrefe.com/doi/10.1027/1618-3169/a000111
    (Note: my prompt's "Dutilh, Krypotos & Wagenmakers 2009" conflates these two papers; the 2009
    decomposition paper's authors are Dutilh, Vandekerckhove, Tuerlinckx & Wagenmakers.)
    The definitive answer to "should I use an RT slope?" On a **10,000-trial** lexical decision task,
    practice changed **four** things at once: **drift rate** (speed of information processing) up,
    **boundary separation** (response caution) down, **response bias** adjusted, and — unexpectedly
    strongly — **nondecision time** (peripheral processing) down. Their explicit conclusion: the
    practice effect "consists of multiple subcomponents," and **"abstracting their interactive
    combination into a single output measure may be hazardous."** The 2011 transfer experiment
    (alternating repeated vs new stimulus sets) found drift-rate and nondecision-time practice effects
    are **partly task-related and partly stimulus-specific**, while caution and bias effects are
    task-related. Verified: citations, DOIs, PMID, and the above findings.
    **Bearing on our case:** an RT slope over 30 trials cannot distinguish "got better at reasoning"
    from "got less cautious" or "got faster at clicking the interface" — and the 2011 result says the
    *interface/task-general* component is real and separable only with a designed transfer
    manipulation. A shrinking RT with flat accuracy is the signature of dropping caution, not learning.

23. **Transfer as an index — the reliability ceiling.** Sources retrieved:
    (a) **Melby-Lervåg, M., Redick, T. S., & Hulme, C. (2016).** "Working Memory Training Does Not
    Improve Performance on Measures of Intelligence or Other Measures of 'Far Transfer': Evidence From
    a Meta-Analytic Review." *Perspectives on Psychological Science*, 11(4). URL:
    https://journals.sagepub.com/doi/10.1177/1745691616635612
    (b) **Sala, G., et al. (2019).** "Near and Far Transfer in Cognitive Training: A Second-Order
    Meta-Analysis." *Collabra: Psychology*, 5(1), 18. URL:
    https://online.ucpress.edu/collabra/article/5/1/18/113004/Near-and-Far-Transfer-in-Cognitive-Training-A
    (c) "Reliable gains? Evidence for substantially underpowered designs in studies of working memory
    training transfer to fluid intelligence" — URL: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4302828/
    (d) **Draheim, C., et al.** "Improving the reliability of cognitive task measures: A narrative
    review." URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC10440239/
    (e) "A measure of reliability convergence to select and optimize cognitive tasks for individual
    differences research." *Communications Psychology* (2024). URL:
    https://www.nature.com/articles/s44271-024-00114-4
    Author lists verified for (a) and (b); (c)–(e) verified by title/venue/URL only.
    Established: **near transfer** is reliably obtainable; **far transfer** is small or null, and when
    placebo effects and publication bias are controlled, "the overall effect size and true variance
    equaled zero." The mechanism-level constraint that matters most: **reliability places a hard ceiling
    on any observable transfer correlation** — "the lower the reliability, the lower the chances for
    transfer." Jaeggi et al. document this in their own data: verbal transfer tasks averaged **r = .45**
    vs visuospatial **r = .68**, and they note "very few fluid reasoning measures come with reliable
    parallel test versions." Design remedies with evidence: **multiple indicators / latent variables
    rather than a single task**, **more trials** (reliability rises with trial count), and **combining
    across sessions** to reach trait-like stability. A definitional caveat: there is no agreed measure
    of structural similarity between trained and transfer tasks, so "near vs far" is not a
    well-operationalised dial.

### Q2 candidates — self-correction and response consistency

24. **Post-error slowing / error-correction as an individual index.** Sources retrieved:
    (a) "Trial and error: A hierarchical modeling approach to test-retest reliability" — URL:
    https://pmc.ncbi.nlm.nih.gov/articles/PMC10241320/
    (b) "Unbiased post-error slowing in interference tasks: A confound and a simple solution" — URL:
    https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9170639/
    (c) **Dutilh, G., et al.** "How to measure post-error slowing: A confound and a simple solution" —
    URL: https://www.researchgate.net/publication/256761440
    (d) "Testing theories of post-error slowing" — URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC3283767/
    (e) "A measure of reliability convergence to select and optimize cognitive tasks for individual
    differences research," *Communications Psychology* (2024) — URL:
    https://www.nature.com/articles/s44271-024-00114-4 (>250 participants, multi-day battery)
    Titles/venues/URLs verified; author lists not verified except where named.
    Established: reliability rises with trial count, and hierarchical modelling work concludes that
    because cross-trial variability is large, **">100 trials may be required to achieve precise
    reliability estimates."** Test–retest reliability for most cognitive tasks is **modest at best
    (~0.6)**. PES has a specific structural problem that maps directly onto our concern: **error trials
    are scarce and non-randomly distributed in time**, so with a drifting baseline "most post-error
    trials may come from the last part of an experiment when RTs are slower overall, whereas most
    post-correct trials come from earlier, faster phases — which inflates PES." Trial-type imbalance
    inflated traditional PES by **37% (9 ms)** and robust PES by **42% (16 ms)** on participant means
    (40% / 50% with medians). Verified quantities as stated.
    **Bearing on our case:** in a 30-item above-level block, a child may produce only a handful of
    *correct* trials; conversely, self-correction requires errors *and* subsequent recovery, and both
    tails are sparse at 30 trials. The temporal-confound mechanism for PES is the same mechanism that
    makes our lambda positive with no learning.

25. **Response consistency / intraindividual variability (IIV) as an index.** Sources retrieved:
    (a) "Attentiveness Modulates Reaction-Time Variability: Findings From a Population-Based Sample of
    1032 Children" (ages ~5.5–13.5), *Collabra: Psychology*, 10(1) — URL:
    https://online.ucpress.edu/collabra/article/10/1/122517/203205/
    (b) **Perquin, M., & Bompas, A.** "Reliability and correlates of intraindividual variability in the
    oculomotor system" — URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC7962678/
    (c) "Age Differences in Intra-Individual Variability in Simple and Choice Reaction Time: Systematic
    Review and Meta-Analysis," *PLOS ONE* — URL:
    https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0045759
    (d) "Behavioral Correlates of Reaction Time Variability in Children With and Without ADHD" — URL:
    https://pmc.ncbi.nlm.nih.gov/articles/PMC3620696/
    (e) "Change in intraindividual variability over time as a key metric for defining performance-based
    cognitive fatigability" — URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC3980793/
    Titles/venues/URLs verified; author lists verified only where named.
    Established, and this is the crucial point: **the child study (N = 1032) warns that the
    intraindividual SD — used in 63 of 71 studies in a prior meta-analysis — "can conflate multiple
    sources of variance such as systematic changes in reaction time," explicitly naming longer trial
    counts and adaptive difficulty as confounds.** The standard remedy in this literature is to
    **residualise RT for systematic across-trial change (practice/learning) before computing the
    ISD** — i.e. the variability index and the learning slope are *defined against each other*, and
    you must choose one as signal and the other as nuisance. CV (SD/mean) is preferred to raw SD
    because it removes the effect of response speed. IIV appears **trait-like** (high-variability
    participants are high in all sessions). Trial-count anchor: one fatigability study used
    **~190 trials per 30-minute block** to allow reliable measurement of accuracy, mean RT, SD RT and
    CV RT. Trimming extreme responses improves IIV reliability.

## Findings

1. **No camp in this literature proposes a linear form.** The two contenders are the power law
   (source 1) and the exponential (source 2), and the current refinement adds an initial delay for a
   slower–faster–slower shape (source 6). All three are *monotonically decelerating* over the bulk of
   practice; source 6's contribution is to show even that assumption has exceptions. A straight line
   is not a simplification anyone in this field defends — it is outside the candidate set.
2. **The linear form is nonetheless the *safest* thing to fit on noisy data — for a reason that
   undercuts using it as a measurement.** Sources 3 and 5 show power functions fit *purely random*
   data better than exponentials, and source 5 extends the bias to realistic sample sizes and to data
   with both random and systematic components. Their remedy is that **linear parameters should be
   estimated rather than fixed**. So linearity earns its place as a nuisance-absorbing term inside a
   comparison, not as the thing being reported.
3. **Our "cohort that learned nothing still fits a positive lambda" is a documented, named
   phenomenon, not a quirk of our simulator.** Source 3 attributes the winning-form artifact to
   averaging + nonlinearity + individual differences; source 4 shows fit-to-power improves purely as
   **inter-component slope variability** rises, *regardless of the true component-curve type*. Both
   say: the recovered curve shape can be produced by heterogeneity and noise alone.
4. **At the individual level the best-evidenced shape is discontinuous.** Source 8 finds the smooth
   negatively-accelerated curve is an artifact of group averaging; individuals show an abrupt,
   step-like transition within roughly **1–10 trials**, with large uncorrelated between-subject
   differences in onset latency and asymptote. Source 7, on **25,280 individual curves of 500 trials
   each**, finds a *piecewise* power law beats a single power law even after complexity penalties,
   with brief performance dips at segment changeovers. Source 15's microgenetic yield is the same:
   short-lived transition strategies, sudden jumps, regressions, plateaus. A single slope over one
   window cannot represent any of these; if the true process is a step, lambda mostly encodes *where
   in the window the step fell*, which source 8 says is a separate trait from the asymptote.
5. **Trial-count requirements from the sources are one to two orders of magnitude above 30.** Source
   7 used 500 trials/person to see individual structure; source 22 used a 10,000-trial task; source
   25's fatigability anchor was ~190 trials per 30-minute block just to measure SD-RT and CV-RT
   reliably; source 24's hierarchical work concludes **>100 trials may be needed for precise
   reliability estimates** and that test–retest for most cognitive tasks is modest (~0.6). Source 15
   is the honest framing: density is defined *relative to the rate of change*, so there is no
   absolute threshold — but the window must begin before rapid change and run until stability, which
   a fixed 30-item block cannot guarantee.
6. **The design-reliability question has a precise currency, and it is not r.** Sources 11 and 12
   give GRR and ECR. Source 12 shows effective error falls with the number of occasions and
   **quadratically with the temporal spread** of measurements, and that power is dominated by a
   *quadratic* term in reliability against a *linear* term in sample size — improving design buys
   more than adding children. It also warns analytic power **overestimates** true power and
   recommends exactly the Monte Carlo check our r = 0.33 came from.
7. **Zero true individual differences in learning forces zero reliability, however precise the
   estimate.** Source 10's degenerate case. This is the interpretive trap for a positive-lambda
   cohort: precision and reliability come apart, and a screener needs the latter.
8. **A within-session climb is not what our own design predicts.** Source 17: what is visible during
   acquisition is *performance*, an unreliable index of learning; desirable difficulties **depress**
   acquisition performance by definition. Serving items above the child's level is a textbook
   desirable difficulty, so the design-implied trajectory is flat or falling. Source 18 adds that
   no-feedback retrieval benefits accrue only to *correctly retrieved* items — worst case at
   above-level difficulty — and show up on a **delayed** test, outside a single session.
9. **Two artifacts generate our exact signature.** Source 19: retest gains are ubiquitous with no
   consensus correction, are **largest for the lowest-baseline quartile** ("probably attributable to
   regression"), and are **larger on harder tasks**. So lambda will be biggest for the weakest
   children — the opposite of what a gifted screener wants — and is confounded with regression to the
   mean. Sources 20 and 21 supply the countervailing artifact: on-task behaviour declines from 10 to
   30 minutes in K–4 classrooms, and 5–7-year-olds show a stereotypical vigilance decrement. Fatigue
   pushes late-block performance down while practice pushes it up; a single slope sums them.
10. **The field that already tried this abandoned the gain score.** Source 13: dynamic testing
    recommends **post-test performance** as the indicator rather than a gain, with the inverse of
    hints-to-criterion and categorical Gainer/Non-gainer classification as the working alternatives.
    Source 14 is the direct test on our population: gifted children were more accurate at pre- *and*
    post-test but improved by **similar amounts**, while needing **fewer instructions** — the gain did
    not discriminate; the prompts-to-criterion did. Source 9 is the psychometric ancestor: an
    individual lambda is a gain score with extra steps.
11. **Every cheap RT-based substitute is confounded at 30 trials.** Source 22 decomposes the practice
    effect into drift rate, boundary separation, bias, and nondecision time changing at once and
    concludes that collapsing them into one output measure "may be hazardous"; shrinking RT with flat
    accuracy is the signature of *dropping caution*, not learning. Source 24: post-error slowing needs
    errors *and* recoveries, both sparse at 30 trials, and is itself inflated by drifting baselines
    (37–50% inflation measured) — the same temporal confound that makes our lambda positive. Source
    25: the intraindividual SD "can conflate ... systematic changes in reaction time," and the
    standard remedy is to **residualise out the learning trend before computing IIV** — meaning the
    slope and the variability index are defined against each other and only one can be the signal.
12. **Transfer as an index is capped by reliability, not by effect.** Source 23: near transfer is
    obtainable, far transfer is small-to-null with true variance at zero once placebo and publication
    bias are controlled, and reliability places a **hard ceiling** on any transfer correlation
    (Jaeggi's own verbal r = .45 vs visuospatial r = .68). Remedies are multiple indicators, more
    trials, and combining across sessions — all of which our single 30-item session forecloses.
13. **Savings does not escape the assumption; it inherits it.** Source 16: savings is interpretable on
    an interval scale *only if learning proceeds linearly with trials* — Nelson's own caveat — and it
    structurally requires a retention interval and a second session.
14. **There is one mitigation in these sources with a real evidence base for our format.** Source 19's
    **dual baseline**: treat the first assessment (or first block) as practice and exclude it, which
    maximises test–retest reliability of later occasions and minimises regression to the mean. Paired
    with passive/non-treated comparison groups to estimate the pure practice component.

## Candidate quantities, ranked

Ranked best-first **for our constraints**: ~30 novel five-option MC items, above level, one session,
no feedback, K-8. "Survives a no-feedback block?" means: is the quantity still defined and
interpretable when the child is never told whether they were right?

| # | Quantity | What it needs | Evidence on reliability | Trials required | Survives a no-feedback block? |
|---|---|---|---|---|---|
| 1 | **Above-level total score (post-test-style performance)**, no growth term | Nothing beyond current items | The field that tried growth scoring fell back to this (13); gifted children separated at pre- *and* post-test on level, not gain (14 — **UNVERIFIED, see verification note on source 14; the abstract reports significant intergroup differences in Learning Potential and does not decompose level vs gain**); reliability rises with trial count (23, 24) | ~30 is workable; more is monotonically better | **Yes** — needs no feedback, no second occasion, no shape assumption |
| 2 | **Hints/prompts-to-criterion, inverted and summed across stages** | A graded hint ladder per item; changes the instrument | The only quantity in these sources that empirically discriminated gifted children when gain did not (13, 14 — **the 14 half is UNVERIFIED; see verification note on source 14**) | Fewer items, because each item yields a graded score rather than 0/1 | **No, as specified** — a hint is feedback. Requires deliberately adding a scaffold phase, i.e. a different product |
| 3 | **Categorical classification (Non-gainer / Gainer / High Scorer)** | A defensible cut rule; tolerates a noisy underlying gain | Budoff's scheme, endorsed in 13 as a gain-score workaround; coarsening is robust to the slope-estimation noise in 5, 10, 12 | ~30 may support 3 bins; not more | Partly — the High Scorer bin survives; the Gainer bins inherit every problem in Findings 3, 9 |
| 4 | **Dual-baseline design: drop block 1, score block 2** (a level, not a slope) | Splitting 30 items into 2 blocks, or adding items | The one mitigation in these sources with a real evidence base — maximises later-occasion test–retest reliability and minimises regression to the mean (19) | Doubles the item budget for the same reported precision | **Yes** |
| 5 | **Change-point / onset-latency summaries** (trials to first change point, dynamic interval, first fraction) | Enough trials to locate a change point; a fitted breakpoint | Individual transitions occur within ~1–10 trials (8), and onset latency and asymptote are *separate uncorrelated traits* (8) — genuinely more faithful to individual data than a slope | 500/person was the density used to see piecewise structure (7); 30 cannot locate a breakpoint | Yes in principle, but not estimable at 30 |
| 6 | **Fitted lambda from theta(t) = theta0 + lambda·t** (status quo) | Nothing new | r = 0.33 recovery at 30 trials in our own sim; degenerate-case zero reliability if true slope variance is zero (10); ECR/GRR say effective error falls only quadratically in *temporal spread*, which a single block cannot extend (11, 12); positive lambda without learning is expected (3, 4, 9, 19) | 100+ for precise reliability estimates generally (24); 500 for individual structure (7) | Yes (it is defined) — but it is largest for the weakest children (19), so it survives without being useful |
| 7 | **Response-consistency / IIV (CV-RT)** | Clean RT logging; trimming | Trait-like across sessions (25), which is attractive — but the ISD "conflates systematic changes in RT" and must be residualised *against the learning trend* (25), so it and #6 cannot both be signal | ~190 trials per block was the working anchor (25) | Yes, but 5-option MC accuracy items give few clean RTs, and vigilance decrement (21) contaminates them |
| 8 | **RT slope over the block** | Clean RT logging | Practice moves drift rate, caution, bias, **and** nondecision time simultaneously; collapsing them "may be hazardous" (22); falling RT with flat accuracy = dropping caution, not learning | 10,000-trial task to decompose (22) | Yes, and it is the worst offender: fatigue slows late RTs (20, 21) while practice speeds them, summing to ~0 |
| 9 | **Post-error slowing / self-correction rate** | Errors *and* subsequent recoveries | Structurally inflated 37–50% by drifting baselines and non-random error timing (24) — the same mechanism as our false lambda | >100 trials (24); both tails are sparse at 30 | Nominally yes, but "error" is unmarked without feedback, so the child has no post-error state to enter |
| 10 | **Savings (Ebbinghaus)** | A retention interval and a second session | Sensitive, but interval-scale interpretation requires the learning process be **linear in trials** — Nelson's own caveat (16) | n/a | **No** — structurally impossible in one session |
| 11 | **Transfer to a held-out task** | A second, structurally related task | Far transfer small-to-null with true variance zero (23); reliability hard-caps the observable correlation; "very few fluid reasoning measures come with reliable parallel test versions" (23) | Needs multiple indicators and multiple sessions (23) | Yes, but unaffordable within 30 items |

The practical reading of this table: **the top four are all levels, coarse categories, or design
changes — none of them is a slope.** Every quantity that is a rate of change sits at #5 or below, and
each is below the line for a reason traceable to a specific source, not to taste.

## Productive tension

**T1. Power law vs exponential vs neither.** *Newell & Rosenbloom (1)*: one law covers essentially all
practice data; the power law is a substantive regularity with a mechanism (chunking), and its
ubiquity across wildly different tasks is the evidence. *Heathcote, Brown & Mewhort (2)*: the
ubiquity is an averaging illusion — across 7,910 unaveraged series the exponential won every time,
and averaging *created* the power-law advantage. *Evans et al. (6)*: both poles are wrong to assume
monotonically decreasing rate of change; a delayed exponential fits most paradigms. Why it matters to
us: T1 is not our fight, but the *reason* the camps disagree is our fight — the disagreement exists
because the recovered form depends on aggregation and noise, and that dependence is exactly what a
30-trial per-child fit is maximally exposed to.

**T2. Is any recovered curve shape real, or is it the noise?** *Myung, Kim & Pitt (3)* and *Brown &
Heathcote (5)*: form selection is partly determined by noise level; power beats exponential on random
data, at realistic sample sizes, and on data with mixed random and systematic components. *Anderson
(4)*: it may not even be noise — slope *heterogeneity* alone produces power-law fits regardless of
the true individual form. The fair opposing pole: none of these authors concludes that learning
curves are unmeasurable; source 5's constructive answer is to include and *estimate* linear
parameters rather than fix them, and source 6's is hierarchical Bayesian pooling that borrows
strength across children while limiting averaging artifacts. So "the fit is noise" and "fit it
better" are both live positions.

**T3. Gradual continuous improvement vs abrupt individual transitions.** *The curve-fitting
tradition (1, 2, 6, 7-in-part)*: performance improves continuously and a smooth function is the right
description. *Gallistel, Fairhurst & Balsam (8)*: for individuals the transition is step-like within
1–10 trials, "stable asymptote" is illusory, and the gradual curve exists only in the average.
*Donner & Hardy (7)* occupy the middle honestly — *both* processes: gradual within-segment
improvement plus a discrete sequence of strategy shifts. *Siegler & Crowley (15)* side with
discontinuity on developmental data. Fair statement of the continuity pole: source 8's evidence is
animal conditioning and the citing literature notes it offers no full quantitative model of
individual curves, so generalisation to K-8 reasoning is an inference, not a finding.

**T4. Can individual change be measured at all?** *Cronbach & Furby (9)*: individual change scores
are systematically contaminated by measurement error; the right move is to reframe the question so no
individual change score is needed. *Rogosa, Brandt & Zimowski (10)*: change *is* measurable — from
individual time paths with enough waves; the failure was two-wave designs, not the concept. Note both
poles indict us: we are nominally many-wave (30 items) but single-occasion with no temporal spread,
which sources 11 and 12 say is the variable that matters quadratically. The tension is productive
because it identifies the fix as *design* (spread, occasions, dual baseline) rather than *estimator*.

**T5. GRR vs ECR — which reliability are we even asking about?** *Willett (11)*: growth-rate
reliability from waves and temporal spread. *Brandmaier et al. (12)*: GRR tracks power *only* in
special cases (ICC2 = 1, ICC2 = 0, or centred time) because it ignores intercept variance and
intercept–slope covariance; ECR tracks it. Their worked example — identical GRR of 0.19 with ECR 0.28
vs 0.33 and simulated power 0.51 vs 0.63 — is the concrete stake. For us this decides whether "r =
0.33" is the number to report at all.

**T6. Should within-session improvement be expected here?** *Retrieval-practice and retest camps (18,
19)*: repeated testing produces real, large, ubiquitous gains — retest gain exceeded ten times the
annual decline rate in one cohort — so a climb is the default expectation. *Soderstrom & Bjork (17)*:
what climbs is *performance*, which can be inversely related to learning, and above-level items are a
desirable difficulty whose intended signature is *depressed* acquisition performance. Both poles
predict our positive lambda is not learning: one calls it practice/regression artifact, the other
calls it the wrong construct.

**T7. Density vs data quality in children.** *Microgenetic method (15)*: density must be high relative
to the rate of change, and Siegler manipulates density upward to catch transitions. *Attention
literature (20, 21)* and Siegler's own caveat: on-task behaviour falls from 10 to 30 minutes in K–4,
vigilance decrements are stereotypical at 5–7, and dense repeated testing bores children. More trials
is the remedy every reliability source recommends (23, 24, 25) and the one thing our population
tolerates least.

**T8. Slope as signal vs slope as nuisance.** *Growth-curve camp*: the trend is the construct. *IIV
camp (25)*: the trend is a confound to be residualised out before computing the variability index.
*Diffusion camp (22)*: neither — the trend is an interactive sum of four latent components and
abstracting it into one measure is hazardous. Three literatures, three incompatible jobs for the same
number.

## Starter hypotheses (NOT conclusions)

**Method note.** These are DOK-2 *candidates* offered to the human owner. Under the BrainLift method,
DOK-3 insights and DOK-4 SPOVs are the owner's to author — nothing below should be promoted to an
insight or a point of view by an agent. Each is stated so it can be *killed*: the falsifier is named.

- **H1 (form).** For a K-8 child over ~30 above-level items, no monotonic learning curve is
  identifiable, and the linear fit is best understood as a nuisance-absorbing term (5) rather than an
  estimate of a rate. *Falsifier:* a within-child model comparison on real pilot data in which a
  nonlinear form beats linear-plus-noise by a margin that survives the source-3/5 random-data bias
  check.
- **H2 (what lambda encodes).** Our fitted lambda is dominated by three quantities that are not
  learning: regression from a low first-block baseline (19), warm-up (19e), and the fatigue/vigilance
  decrement acting with opposite sign late in the block (20, 21). *Falsifier:* lambda estimated with
  block 1 excluded (dual baseline) and with a time-on-task covariate retains most of its variance and
  its rank-order.
- **H3 (direction of bias, the product-critical one).** Because retest gains are largest for the
  lowest-baseline quartile and larger on harder tasks (19), lambda will correlate *negatively* with
  giftedness in our sample — i.e. it actively mis-ranks. *Falsifier:* in pilot data, lambda's
  correlation with an external gifted criterion is positive and non-trivial.
- **H4 (the substitution).** Replacing lambda with **above-level total score** loses no valid
  individual-difference information, because the discriminating signal in dynamic-assessment studies
  of gifted children was level, not gain (13, 14). *Falsifier:* lambda adds incremental validity over
  total score against an external criterion — the only test that matters, and one we have not run.
- **H5 (the affordable upgrade).** If the owner wants a *learning* construct rather than a level, the
  cheapest defensible route in these sources is not a better estimator but a changed instrument:
  hints-to-criterion, inverted and summed (13, 14). *Falsifier:* a hint ladder proves unreliable in
  K-8 self-administered format, or the required feedback breaks the no-feedback constraint the
  screener needs for security/fairness reasons.
- **H6 (if a growth term must be kept).** Then the reportable quantity is not a per-child OLS slope
  but a **partially pooled** estimate (6's hierarchical Bayesian pooling), evaluated by **ECR rather
  than GRR** (12), with the item ordering deliberately spaced to widen temporal spread, since
  effective error falls quadratically in spread (12). *Falsifier:* ECR under any achievable 30-item
  design stays below the threshold the owner sets for reporting an individual score — in which case H6
  self-destructs and H4 stands.
- **H7 (a categorical fallback).** A coarse three-way classification (13) may retain usable signal at
  30 trials where a continuous slope does not, because coarsening is comparatively robust to
  slope-estimation noise. *Falsifier:* simulated classification agreement across parallel forms is no
  better than the r = 0.33 continuous recovery once the bins are set.
- **H8 (construct-level, the most consequential and least tested).** The design may be internally
  self-defeating: above-level items are a desirable difficulty (17), whose intended signature is
  *depressed* within-session performance, so a screener that rewards a within-session climb rewards
  the absence of the difficulty it deliberately introduced. *Falsifier:* a plausible mechanism by
  which within-session accuracy gain on unfamiliar above-level content indexes storage strength rather
  than retrieval strength — none is present in these sources.
- **H9 (what would settle it, stated as a design not a belief).** The discriminating study is a
  **passive-control / non-treated comparison** arm (19) plus a **parallel-form retest**: it separates
  practice from learning, and gives the test–retest reliability of whatever index is chosen. Nothing
  in this register can substitute for it.

## What this does NOT support

**Verification gaps inside the register itself.** Several sources are verified only at
citation/abstract level and are flagged as such above: 1 (full chapter not retrieved), 2 (scanned PDF;
its internal statements about minimum series length are **unverified** — do not cite a minimum trial
count to Heathcote et al.), 6, 7, 10, 11, 13, 14, 16. Source 11's sampling-variance expression
σ²_ε / Σ(t_i − t̄)² is **explicitly flagged as unverified from the primary text** and must not be used
as a formula. Author lists are unverified for sources 18, 19, 21, and parts of 23, 24, 25 — cite those
by title and URL. **Source 14 is the single most load-bearing empirical claim in the whole register
and it is paywalled and unverified beyond abstract level.** H4 and H5 rest on it. It needs direct
retrieval before any product decision is made on it.

**Claims these sources do not license.**

1. **They do not establish that a linear fit is wrong for our data.** They establish that no camp
   proposes it, that decelerating forms are the candidate set (1, 2, 6), and that form recovery is
   noise- and heterogeneity-dependent (3, 4, 5). "Not defensible as a measurement of an individual
   rate" is a much weaker claim than "the true curve is not linear," and only the weaker claim is
   supported.
2. **They give no threshold trial count for K-8 multiple-choice accuracy.** The numbers quoted (500,
   190, >100, 10,000) come from RT tasks, cognitive-training batteries, and lexical decision — not
   from above-level reasoning items in children. Source 15 is explicit that density is *relational*,
   which means no source here can be quoted as "30 is too few" in the abstract. Our r = 0.33 is the
   only quantity in this document that is actually about our design, and it came from our own
   simulation.
3. **Source 8's step-like individual acquisition is animal conditioning.** Pigeon autoshaping and
   rabbit eyeblink do not straightforwardly transfer to a child solving novel reasoning items, and the
   citing literature's own caveat (no full quantitative model of individual curves) is recorded above.
   Treat "individual learning is abrupt" as a strong hypothesis, not an established fact for our
   population.
4. **Nothing here shows that total score has *higher* validity than lambda against a gifted
   criterion.** Source 13 is a field-level recommendation and source 14 is one study. We have run no
   incremental-validity comparison. H4 is a hypothesis precisely because this evidence is absent.
5. **Nothing here shows lambda has *zero* information.** Source 10's degenerate case is conditional —
   reliability is zero *if* there are no true individual differences in change. Whether true
   lambda-variance is zero in K-8 gifted screening is an open empirical question this register does not
   answer.
6. **The retest and practice-effect magnitudes are from the wrong timescale.** Source 19's headline
   comparison is a two-year interval, and the SDMT plateau at 18 repetitions concerns repeated whole
   administrations. Neither quantifies *within-block* warm-up on 30 novel items — source 19(e) is
   explicit that within-burst warm-up and between-burst retest gain are **distinct effects requiring
   separate terms**. So the direction of the artifact is supported; the magnitude is not.
7. **The attention evidence is about classrooms and vigilance tasks, not our screener.** Source 20 is
   instructional duration in K–4 classrooms; source 21 is a psychomotor vigilance task at ages 5–7.
   That a 30-item screener produces a measurable decrement in our format is an extrapolation.
8. **We cannot yet rank the two competing artifacts.** Practice/regression pushes lambda up (19);
   fatigue pushes it down (20, 21). No source here gives the relative magnitudes in our format, so we
   cannot predict the *sign* of the net bias for any individual child — only that both mechanisms are
   present and neither is learning.
9. **No source here endorses a within-session performance slope as a learning measure.** But note the
   converse limit too: source 17 does not say within-session gains are *never* informative; it says
   performance is an unreliable index of learning and can dissociate in both directions. The absence of
   an endorsement is not a refutation.
10. **Nothing here addresses fairness, adverse impact, or defensibility to parents and districts** for
    either lambda or total score — the criteria a gifted-admissions instrument is ultimately judged
    against. That is out of scope for this document and unaddressed by every source in it.
