# Change psychometrics: is an individual learning slope estimable? (DOK 2)

Lane: independent psychometric check on the r ≈ 0.28 information-ceiling claim
derived elsewhere from Koedinger et al. (PNAS 2023).

## Sources

1. **Embretson, S. E. (1991).** "A Multidimensional Latent Trait Model for Measuring
   Learning and Change." *Psychometrika*, 56(3), 495–515. DOI 10.1007/BF02294487.
   https://www.cambridge.org/core/journals/psychometrika/article/abs/multidimensional-latent-trait-model-for-measuring-learning-and-change/CDD36047BA7725D21110BB84F4073BD1
   — The MRMLC. Establishes that individual change must be carried by *extra latent
   dimensions* ("modifiabilities") in a simplex structure, one per occasion after the
   first, with discriminations constrained equal within a measurement condition.
   Abstract-only (paywalled); reports "good recovery of item and ability parameters"
   with **no numeric SE/RMSE for the modifiability dimensions on the retrieved page.**

2. **Wang, W.-C., Wilson, M., & Adams, R. J. (1998).** "Measuring individual differences
   in change with multidimensional Rasch models." *Journal of Outcome Measurement*,
   2(3), 240–265. PMID 9711023. https://pubmed.ncbi.nlm.nih.gov/9711023/
   — Reviews Andersen (1985), Fischer, and Embretson (1991) side by side and adds the
   MRCML formulation. Confirms the class of models and their requirements; the retrieved
   abstract claims only "all the parameters were recovered very well" — **no precision
   numbers verifiable from the abstract.**

3. **Rogosa, D. R., Brandt, D., & Zimowski, M. (1982).** "A growth curve approach to the
   measurement of change." *Psychological Bulletin*, 92(3), 726–748.
   DOI 10.1037/0033-2909.92.3.726. https://psycnet.apa.org/record/1983-04708-001
   — Reframes change as an individual time path with a person-specific rate parameter,
   rather than a two-wave difference. Source of the position that the *slope*, not the
   gain score, is the estimand. Full text not retrieved; volume number is reported
   inconsistently across indexes (90 vs 92) — **92 with the DOI above is the one I could
   verify.**

4. **Willett, J. B. (1989).** "Some results on reliability for the longitudinal
   measurement of change: Implications for the design of studies of individual growth."
   *Educational and Psychological Measurement*, 49(3), 587–602.
   — Growth Rate Reliability (GRR). The single most load-bearing quantitative result in
   this lane: **GRR = σ²_slope / (σ²_slope + σ²_ε / SS_T)**, where
   SS_T = Σ(t_i − t̄)². Cited via secondary sources (see #5, #6); I did not retrieve the
   1989 primary text.

5. **Brandmaier, A. M., von Oertzen, T., Ghisletta, P., Lindenberger, U., & Hertzog, C.
   (2018).** "Precision, Reliability, and Effect Size of Slope Variance in Latent Growth
   Curve Models: Implications for Statistical Power Analysis." *Frontiers in Psychology*,
   9, 294. DOI 10.3389/fpsyg.2018.00294. PMCID PMC5932409. Open access, **full text
   retrieved.** https://pmc.ncbi.nlm.nih.gov/articles/PMC5932409/
   — Restates Willett's GRR as their Eq. 8 and generalises it to *effective error*
   σ²_eff = σ²_ε / (Σt_j² − η(Σt_j)²) and *effective curve reliability*
   ECR = σ²_S/(σ²_S + σ²_eff). Two facts matter here: (a) as intercept variance grows
   relative to residual variance, effective error *grows* — a large θ0 spread actively
   costs you slope precision; (b) empirically, across the real longitudinal studies
   catalogued by Rast & Hofer (2014), **GRR ranged 0.02–0.72 with median 0.36** and ECR
   0.03–0.76, median 0.40 — and those are multi-wave, multi-year designs.

6. **Rast, P., & Hofer, S. M. (2014).** "Longitudinal design considerations to optimize
   power to detect variances and covariances among rates of change." *Psychological
   Methods*, 19(1), 133–154. PMCID PMC4080819.
   https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4080819/
   — Source of the GRR distribution quoted above; establishes that power to detect
   *individual differences in rate* is the binding constraint in real designs, not power
   to detect average change. Cited via #5 plus the PMC landing page; I did not read the
   full text.

7. **Cronbach, L. J., & Furby, L. (1970).** "How we should measure 'change': Or should
   we?" *Psychological Bulletin*, 74(1), 68–80. Full-text PDF:
   https://gwern.net/doc/dual-n-back/1970-cronbach.pdf
   — The classical pessimism. Their operative recommendation is not "gain scores are
   noisy" but the stronger institutional one: solve research and *personnel-decision*
   problems **without estimating change scores for individuals**, and "frame their
   questions in other ways" (p. 80).

8. **Embretson, S. E. (1992).** "Measuring and validating cognitive modifiability as
   ability: A study in the spatial domain." *Journal of Educational Measurement*, 29(1),
   25–50. — Embretson's own empirical test of whether modifiability is a *usable ability
   construct*. Retrieved only as a citation-with-summary via search results (not full
   text): the reported outcome is that **spatial learning ability was strongly supported
   while the mathematical learning-ability findings were weaker.** Design used a pretest
   plus **two** posttests under conditions altering cognitive load (strategy training,
   cues). **I could not verify reliability coefficients for the modifiability dimension.**

9. **Embretson, S. E. (1995).** "A measurement model for linking individual learning to
   processes and knowledge: Application to mathematical reasoning." *Journal of
   Educational Measurement*, 32(3), 277. — Cited only; not retrieved.

10. **Riley, R. D. et al. (2025).** "A decomposition of Fisher's information to inform
    sample size for developing or updating fair and precise clinical prediction models for
    individual risk — part 1: binary outcomes." PMCID PMC12235806.
    https://pmc.ncbi.nlm.nih.gov/articles/PMC12235806/
    — The closest thing I found to an explicit modern treatment of *how much binary data
    an individual-level estimate needs*. It decomposes the variance of an individual's
    estimate into the unit information matrix, predictor values, and N. Note: it is about
    N *people*, not N *trials within* a person, so it is an analogy, not a direct answer.
    **I did not find a paper giving a trials-per-person requirement for a per-person
    logistic rate.** The textbook form of the slope information,
    I(β) = Σ x_i² π_i(1−π_i), is standard (e.g. Penn State STAT 504 Lesson 6,
    https://online.stat.psu.edu/stat504/Lesson06) and is what I use in the arithmetic
    below.

11. **Chen, J. (2024).** "Empirical Bayes When Estimation Precision Predicts Parameters."
    Yale working paper. https://economics.yale.edu/sites/default/files/2024-01/Chen%20Empirical%20Bayes.pdf
    — Retrieved as a search-result summary only. Load-bearing claim: when precision itself
    predicts the parameter, shrinkage **can make decisions worse than not shrinking at
    all.** Also relevant: *Empirical Bayes shrinkage (mostly) does not correct the
    measurement error in regression*, arXiv:2503.19095, https://arxiv.org/pdf/2503.19095
    — shrinkage on the left-hand side introduces *non-classical* measurement error.

12. **Value-added / accountability analogue.** Shrinkage of value-added estimates and
    threshold decisions: "An Evaluation of Empirical Bayes' Estimation of Value-Added"
    (CALDER Working Paper #31), https://files.eric.ed.gov/fulltext/ED558123.pdf
    — Retrieved as search summary: EB shrinkage performs well under random assignment,
    **degrades under non-random assignment, and does not itself substantially improve
    performance.** Differential shrinkage systematically changes who crosses a cut score.

## Findings

### F1. Embretson did not build a model that reads a slope off one continuous block

The highest-priority question resolves in a way that partly reframes the screener. MRMLC
(source 1) does not estimate a rate. It estimates θ1 (initial ability) plus a *discrete
set* of modifiability dimensions — one per measurement *condition* after the first, where
change from condition k−1 to k **is** the kth modifiability. The structural requirements
are explicit and all four are worth naming:

- **Distinct measurement conditions.** The design must contain identifiable occasions, and
  the occasions must differ by something the modeller controls — in Embretson's own
  applications, strategy training, cues, or manipulated cognitive load between blocks.
- **Equal discriminations within a condition** (this is what makes it Rasch-family); the
  2PL extension relaxes this at the cost of more parameters.
- **A simplex (Wiener) covariance structure**, i.e. the later occasion's proficiency is
  the *cumulative sum* θ1 + θ2 + ... + θk. Change is not a free per-occasion parameter;
  it is constrained to accumulate.
- **Non-repeated items across occasions.** This is MRMLC's advertised advantage over
  Andersen (1985) — it avoids practice/memory effects and local dependence.

Two things follow for this lane. First, the screener's design (novel items, no repeats,
single session) satisfies MRMLC's *item* requirement well. Second, it fails the
*condition* requirement: there is no intervention between blocks and no feedback, so there
is nothing for a modifiability dimension to be a response *to*. Embretson's construct is
modifiability-under-instruction; the screener measures drift-under-nothing.

### F2. The precision claim I was asked to find is, in the retrieved literature, absent

I could not verify a reported reliability or standard error for the change/modifiability
parameter in Embretson (1991), Embretson (1992), or Wang, Wilson & Adams (1998). All three
report qualitative recovery ("good recovery," "recovered very well") in the abstracts I
retrieved; none of the retrieved text attaches a number to the change dimension
specifically. **This is a verified gap in my retrieval, not a claim that the numbers do not
exist in the paywalled full texts.** The signal worth noting is directional: the strongest
empirical result Embretson reports (source 8) is that modifiability held up as a construct
in the spatial domain and **held up more weakly in the mathematical domain** — i.e. even
its author found it domain-fragile with a pretest plus *two* trained posttests.

### F3. The estimability question has a closed-form answer, and it is not about N

Willett's GRR (source 4, restated as Eq. 8 of source 5) is the answer to "what determines
whether an individual slope is estimable":

    GRR = σ²_slope / (σ²_slope + σ²_ε / SS_T),    SS_T = Σ(t_i − t̄)²

Three properties of this expression matter more than any single number:

1. **The numerator is between-person slope variance.** If people genuinely do not differ in
   rate, GRR → 0 *no matter how good the instrument or how many occasions*. Estimability of
   an individual slope is a property of the population, not of the test. This is the exact
   point at which the psychometrics lane meets the Koedinger lane: Koedinger supplies
   σ²_slope, Willett supplies what to do with it.
2. **Occasions enter only through SS_T, and only in the denominator's error term.** More
   trials buy precision *quadratically in spread* — SS_T for n equally spaced occasions is
   n(n²−1)/12 — which is why Willett concluded that with enough waves "the influence of
   fallible measurement rapidly dwindles to zero." But that limit is GRR → 1 *only if*
   σ²_slope > 0. With σ²_slope ≈ 0 the limit is 0/0-ish in practice: you converge on a
   precise estimate of a quantity that does not vary.
3. **Spacing is a free design lever, magnitude is not.** Source 5's Case 3 shows three
   5-occasion designs over the same interval with GRR 0.17 / 0.19 / 0.19 and power
   0.51 / 0.51 / 0.63 — the *arrangement* of occasions moved power by 12 points while GRR
   barely moved.

### F4. Brandmaier et al. add a result that is actively bad news for this screener

Source 5 generalises GRR to *effective error*:

    σ²_eff = σ²_ε / (Σt_j² − η·(Σt_j)²),    η = 1/(M + σ²_ε/σ²_I) = ICC2/M

The η term is the part with teeth. **Effective error grows with intercept variance σ²_I.**
A large spread in *initial* ability actively degrades the precision of the *slope*, because
the model must spend information separating "started higher" from "climbed faster." Source 5
states this directly: change sensitivity falls when intercept variance is large relative to
residual variance. Koedinger's reported ratio (intercept IQR 0.830 vs slope IQR 0.018) is
therefore not merely an unfavourable numerator — it is *also* an unfavourable denominator.

### F5. The empirical base rate for slope reliability in real designs is ~0.36

Via source 5's summary of Rast & Hofer's (source 6) catalogue of actual longitudinal
studies: **GRR 0.02–0.72, median 0.36; ECR 0.03–0.76, median 0.40.** These are multi-wave,
multi-year cognitive-aging designs with real between-person slope variance in a domain
(aging-related decline) where individual differences in rate are well established. Median
GRR 0.36 implies a slope-estimate/true-slope correlation of about √0.36 = 0.60 in the
*best-studied* case for individual growth. That is the ceiling the field actually operates
under — and it is not a per-child, single-session, 30-trial ceiling.

### F6. Cronbach & Furby's actual recommendation was institutional, not statistical

Worth flagging because it is usually miscited. Source 7 is remembered as "difference scores
are unreliable," and Rogosa and colleagues (source 3, plus Rogosa & Willett 1983) largely
won the technical argument that this is overstated. But Cronbach & Furby's *recommendation*
was narrower and survives the rebuttal: solve research and **personnel-decision** problems
without estimating change scores for individuals. The rehabilitation of change scores by
Rogosa et al. was a rehabilitation of *individual growth modelling for research*, and it
was purchased specifically by requiring multiwave data. It was not a licence to put an
individual change estimate behind a high-stakes cut score.

### F7. Shrinkage converts a precision problem into a fairness problem

For a cohort research claim, partial pooling is the right answer: shrink each child's λ
toward the cohort mean in proportion to its unreliability, and the set of estimates has
lower MSE. For an individual admissions decision it introduces three distinct problems
(sources 11, 12):

- **Degenerate ranking.** At GRR ≈ 0.07 (see next section), shrinkage pulls ~93% of the way
  to the mean. Every child's posterior λ is approximately the cohort mean. The ranking that
  survives is driven by whatever *is* well measured — which in this design is θ0, initial
  ability. The screener would be re-deriving a static ability ranking and labelling it
  "learning rate."
- **Differential shrinkage moves the cut score non-uniformly.** Children with fewer
  effective observations (early stops, off-target difficulty, more guessing) shrink harder
  and are systematically less likely to be flagged. In a threshold system this is a
  reproducible group-level disparity, not random noise.
- **MSE-optimal ≠ decision-optimal.** Source 11's result is that when estimation precision
  itself predicts the parameter, shrinkage-based decisions can underperform unshrunken ones.
  Admissions has asymmetric costs (missing a gifted child vs. admitting a non-gifted one),
  which is exactly the setting where minimising MSE is the wrong objective.

## What this means for a 30-trial block

**Everything in this section is my own arithmetic applied to sourced formulas. The GRR
formula is from sources 4/5; the item-information formula is textbook (source 10 note); the
slope-variance input is from the parallel Koedinger lane. No source states these results.**

Inputs. Occasions t = 1..30, equally spaced, contiguous. Then
SS_T = n(n²−1)/12 = 30·899/12 = **2247.5**.

Per-trial error variance on the logit scale is the reciprocal of the per-item Fisher
information. For a 1PL with a lower asymptote c = 0.2 and a = 1,
I(θ) = [dP/dθ]² / [P(1−P)] with P = c + (1−c)P*:

| where the item sits | P* | P | I per item | σ²_ε = 1/I |
|---|---|---|---|---|
| on target (max info) | ≈ 0.60 | 0.68 | 0.169 | 5.9 |
| moderately above level | 0.35 | 0.48 | 0.133 | 7.5 |
| clearly above level | 0.25 | 0.40 | 0.094 | 10.7 |

The guessing floor alone costs roughly a third of the information a clean 1PL item would
carry (0.169 vs 0.25 at a = 1), and serving *above* the child's measured level costs more
on top of that. This is the quantitative content of "the item bank is already at its
theoretical ceiling."

Numerator. Koedinger's slope IQR of 0.018 log-odds, treated as normal, gives
σ_slope = 0.018/1.349 = 0.0133, so **σ²_slope ≈ 1.78 × 10⁻⁴**. (GRR is invariant to a common
rescaling of the latent metric, so mixing "log-odds" with the 1–20 difficulty scale is safe
*provided* discrimination is ~1 logit per scale unit — if it is not, both terms rescale
together and GRR is unchanged.)

Result.

| σ²_ε | σ²_ε/SS_T | GRR | implied r = √GRR |
|---|---|---|---|
| 5.9 (on target) | 0.00263 | **0.063** | **0.25** |
| 7.5 | 0.00334 | 0.051 | 0.23 |
| 10.7 (above level) | 0.00476 | **0.036** | **0.19** |

**This independently reproduces the r ≈ 0.28 ceiling, and lands slightly below it.** Two
formulas that share no inputs beyond σ²_slope — an IRT-information argument and Willett's
1989 reliability-of-growth-rate identity — converge on r in the 0.19–0.25 band for a
30-trial contiguous block. The psychometrics side therefore **corroborates** the parallel
lane rather than contradicting it, and if anything is marginally more pessimistic because it
prices in the guessing floor and the above-level targeting that the pure slope-variance
argument does not.

Two loose ends in the measured numbers, stated as loose ends:

- **Measured recovery r = 0.33 exceeds this ceiling.** That is not necessarily a
  contradiction: the injected climb's magnitude was set by the experimenter, and if the
  injected σ_slope is larger than the naturally occurring 0.0133, recovery will beat the
  natural-population ceiling. Recovery of an *injected* signal answers "can the estimator
  see a climb this big," not "do children differ in rate by this much." **I did not find a
  source addressing this distinction; the injected magnitude needs to be checked against
  0.0133 before r = 0.33 can be compared to 0.28 at all.**
- **GRR theory assumes an unbiased slope estimator and says nothing about λ̄ = 0.0097.** A
  null cohort fitting 8.6 SEs above zero is a *bias* finding, not a *precision* finding.
  Nothing in sources 3–6 speaks to it. Willett's framework would treat that 0.0097 as
  contaminating the numerator: any between-child variation in the artifact itself enters
  σ²_slope as if it were true rate variance, which would inflate apparent GRR while
  measuring nothing.

## Productive tension

**T1. Willett says "add waves and error dwindles to zero." The item bank says you can't.**
Willett's optimistic conclusion — that fallible measurement stops mattering with enough
waves — is true and is also unreachable here. GRR rises toward 1 through SS_T, but SS_T for a
contiguous block grows as n³/12, and to move GRR from 0.06 to 0.50 you need σ²_ε/SS_T to fall
by a factor of ~16, i.e. SS_T ≈ 36,000, i.e. **n ≈ 76 trials** at on-target information — and
worse above level. The design constraint (one session, ~30 items, ceiling item bank) and the
statistical remedy point in opposite directions and the gap is not marginal.

**T2. But spacing is a lever the current design is throwing away.** Source 5's Case 3 shows
spacing moving power 12 points at constant GRR. For fixed n and fixed span, SS_T is *maximised*
by massing occasions at the ends, not by spreading them evenly: 15 trials at t≈1 and 15 at
t≈30 gives SS_T = 30·(14.5)² = **6307.5** versus 2247.5 for the even ramp — a 2.8× gain, which
takes GRR from 0.063 to **0.16** and r from 0.25 to **0.40** with the *same 30 items*. That is
a larger improvement than anything available from better items. The tension: this
"two-blocks-at-the-ends" design is *exactly MRMLC's two-condition structure* (source 1) — the
psychometrically efficient shape and the theoretically motivated shape coincide, and both
differ from the continuous-ramp shape currently fitted. But it buys precision on a *contrast*,
not on a rate, and it only means anything if something happens between the blocks.

**T3. Rogosa beat Cronbach & Furby, and it doesn't help.** The literature's arc looks like
vindication for slope-based measurement: Rogosa, Brandt & Zimowski (source 3) and successors
showed change scores are not inherently unreliable. But the vindication was conditional on
multiwave data with real between-person slope variance, and Cronbach & Furby's specific
carve-out for *personnel decisions* was never overturned. A screener can cite the modern
literature and still be doing the thing the classical literature warned against.

**T4. Modifiability is a validated construct and this is not a measurement of it.**
Embretson spent a decade establishing that cognitive modifiability is measurable as an
ability (sources 1, 8, 9) — and every instance required a *manipulation* between conditions
(training, cues, load), which is what makes the change dimension interpretable. The screener
has the IRT machinery without the manipulation. Whether "learning from novel items with no
feedback" is even the same construct is unresolved in what I retrieved.

**T5. Median GRR in the field is 0.36 — should that be reassuring or damning?** Reading A:
0.06 is far below what real longitudinal research achieves, so the screener is an outlier in
badness. Reading B: even *0.36* (r = 0.60) is nowhere near defensible for an individual
high-stakes decision, so the field's own best case would fail this bar too, and the screener's
problem is the use case rather than the design.

## Starter hypotheses (NOT conclusions)

These are candidate lines for the owner to test or discard. None is established by the
sources above.

- **H1.** The r ≈ 0.28 ceiling is not a property of the item bank, the estimator, or the trial
  count — it is σ²_slope. If so, no engineering change to the screener moves it, and the only
  levers are SS_T (T2) and finding a population or task where σ²_slope is genuinely larger.
  *Test:* recompute GRR with σ²_slope from a task with documented large rate differences.
- **H2.** The 15+15 massed design (T2) is the highest-yield available change, buying r ≈ 0.40
  from the same 30 items — but only if it is reframed from "rate" to "pre/post contrast," and
  only if something is inserted between the blocks to make the contrast mean anything.
  *Test:* simulate the massed design against the current ramp on the existing injected-climb
  recovery harness.
- **H3.** λ̄ = 0.0097 in a null cohort is a guessing-floor artifact interacting with the MAP
  prior, not a learning signal. The asymmetry of a 0.2 floor means early low-information
  responses and later ones are not exchangeable under the fitted model. *Test:* refit the
  null cohort with c = 0 and with c free; if λ̄ collapses toward zero, the floor is the source.
- **H4.** At GRR ≈ 0.06, the posterior λ ranking is a monotone function of θ0 plus noise. If
  true, the screener's λ output is a laundered ability score and adds no information over the
  measured level it was conditioned on. *Test:* correlate posterior λ with θ0 across the 3,200
  children; a high correlation is diagnostic.
- **H5.** Reporting an interval instead of a point estimate does not repair the decision.
  Under H4 nearly every child's 95% interval covers zero and covers every other child's
  estimate, so an honest interval is an admission that λ cannot rank. This is worth checking
  before treating "report uncertainty" as a fix.
- **H6.** The construct being sought may be better served by a *contrast under manipulation*
  (Embretson's modifiability) than by a *rate under no manipulation*, in which case the fix is
  a design change, not a statistical one. Wholly unresolved in what I retrieved.

## What this does NOT support

- **It does not establish an exact numeric ceiling.** My 0.19–0.25 band depends on assumed
  a = 1, assumed normality of the slope distribution, assumed comparability between the
  Koedinger log-odds metric and the 1–20 difficulty scale, and an assumed target P*. Any of
  these moving shifts the number. The *convergence* with 0.28 is the finding; the specific
  digits are not.
- **It does not show Embretson reports poor precision for modifiability.** I could not
  retrieve full text for Embretson (1991), (1992), or (1995), or for Wang, Wilson & Adams
  (1998). The retrieved abstracts claim *good* recovery. Absence of a verified number in my
  retrieval is not evidence of a bad number.
- **It does not verify Willett (1989) or Rast & Hofer (2014) from primary sources.** The GRR
  formula and the 0.02–0.72 / median 0.36 range both come to me through Brandmaier et al.
  (2018), which I did read in full. Willett's exact derivation, and Rogosa, Brandt & Zimowski
  (1982) in full, were not retrieved. The Rogosa et al. volume number is inconsistently
  indexed (90 vs 92).
- **It does not supply a trials-per-person requirement from the literature.** I found no paper
  stating how many binary trials are needed to estimate a per-person logistic rate. Source 10
  is about N *people*, not N *trials within* a person. The n ≈ 76 figure in T1 is my
  arithmetic on GRR, not a published threshold.
- **It does not adjudicate whether the r = 0.33 recovery is consistent with the ceiling.**
  That depends on the injected climb's magnitude relative to σ_slope = 0.0133, which I do not
  have.
- **It does not say the screener is invalid, or that λ should be dropped.** Those are
  decisions about a product with costs and alternatives I have not researched. It says only
  that individual-slope estimability is governed by GRR, that GRR here is small, and that the
  psychometrics literature agrees with the parallel lane's number.
- **No DOK-3 insight or DOK-4 position is offered here.** The tensions in T1–T5 are left
  unresolved deliberately.
