"""Every assumed parameter in the benchmarking simulation, named and justified.

READ THIS FILE FIRST. It is the argument surface of the whole simulation. Nothing
in `cohort.py` or `figures.py` invents a number; every quantity either lives here
with a justification and a citation, or is derived in code from something that does.

Provenance labels used on every constant below:

  [MEASURED]    Measured inside this repository against born-synthetic data. The
                measurement is real; the thing measured is a simulation.
  [PUBLISHED]   Taken from an external published technical document, cited.
  [REPORTED]    Stated by GT staff in the recorded interview. A company claim.
  [DERIVED]     Computed in code from other constants. Not independently assumed.
  [ASSUMED]     Nobody has measured this. It is a stated position someone can argue
                with. Every one of these is listed in README.md §7 with the figures
                that depend on it.

NOTHING HERE IS EVIDENCE ABOUT A REAL CHILD. The cohort this file parameterises is
born-synthetic. See README.md §1.
"""

from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# 0. Reproducibility
# ---------------------------------------------------------------------------

#: Root seed. Every figure derives its stream from this by a fixed offset, so any
#: single figure regenerates identically whether or not the others are run.
#: 20260730 is the seed convention already used by `scripts/exam-learning-block-harness.ts`
#: and the Stage 2 measurements, so a reader comparing the two is comparing like with like.
ROOT_SEED = 20260730

#: Applicants in the primary synthetic cohort. Chosen to be large enough that the
#: Monte-Carlo error on an AUC is well below the differences the figures report
#: (~0.015 at N=4000), and small enough to run in seconds. This is NOT a claim about
#: GT's applicant volume: current cohorts are ~40-46 on-campus and ~300 virtual
#: (E-101, [REPORTED]). Figures that depend on real-world sample size say so.
N_APPLICANTS = 4000

#: Bootstrap resamples for every confidence interval reported on a figure.
N_BOOTSTRAP = 2000


# ---------------------------------------------------------------------------
# 1. The instrument's own scale — taken from the shipped code, not invented
# ---------------------------------------------------------------------------

#: The proficiency scale used everywhere in `packages/exam-scoring`
#: (`src/types.ts`: SCALE_MIN / SCALE_MAX). A float in [1, 20]. [MEASURED: source code]
SCALE_MIN = 1.0
SCALE_MAX = 20.0

#: Logistic discrimination per scale point in the 1PL/Rasch response model
#: (`DEFAULT_ABILITY_BRACKETING.slope` in `packages/exam-scoring/src/policy.ts`).
#: At slope 1.0 one scale point is one logit, which is why a lambda quoted in scale
#: points and one quoted in logits coincide. [MEASURED: source code]
RASCH_SLOPE = 1.0

#: Weakly-informative prior SD on the ability fit (`DEFAULT_ABILITY_BRACKETING.priorSd`).
#: Enters the Fisher information as 1/priorSd^2. [MEASURED: source code]
ABILITY_PRIOR_SD = 6.0

#: Scored items per area a converged battery serves. The engine's floor is
#: `minItemsPerArea: 6` (`packages/exam-engine/src/config.ts`); measured sessions run
#: 24-29 items in total across four areas (E-201, E-203), so 6-7 per area is the
#: measured operating point and 11 is optimistic. Set to the measured operating point.
#: [MEASURED: E-201/E-203 session lengths]
ITEMS_PER_AREA = 7

#: Number of scored reasoning domains (`DOMAINS` in `packages/exam-scoring/src/types.ts`).
#: [MEASURED: source code]
N_AREAS = 4

#: Standing measurement error the shipped Fisher-information formula does NOT capture.
#:
#: `abilityStandardError` returns the sampling error of the fit GIVEN that each item's
#: difficulty is correct. No bank item has a calibrated difficulty: every one is a
#: design estimate on a bank carrying `validated: false` and `syntheticOnly: true`
#: (claim boundary in `packages/exam-scoring/src/ability.ts`). Sweeping every integer
#: ability 2..19 through the real engine before D-024/D-025 breached a 1.5-point
#: tolerance at five of eighteen levels, worst case 2.67 scale points (DECISION_LOG,
#: D-024). After those fixes the standing assertion in `real-bank.test.ts` holds at a
#: 1.5-point tolerance. 1.0 is set so that total standing error lands just inside that
#: tolerance rather than at it.
#:
#: This term dominates: the Fisher SE at 7 items/area is ~0.3 scale points on the
#: composite and this is ~1.0. If the bank is ever calibrated this number should fall
#: and the instrument's curves in every figure improve. [ASSUMED — the single largest
#: assumption in the standing half of the model. Sensitivity swept in README §7.]
STANDING_CALIBRATION_ERROR_SD = 1.0


# ---------------------------------------------------------------------------
# 2. The latent population
# ---------------------------------------------------------------------------

#: Grade-matched national reference population of standing ability, on the [1, 20]
#: scale. theta ~ N(10.5, 3.0^2), clamped to the scale. These are the exact parameters
#: `scripts/exam-learning-block-harness.ts` uses and that E-095's reproduction path
#: records, so the simulated child here is the same simulated child the Stage 2
#: measurements were taken on. [MEASURED: E-095 reproduction parameters]
THETA_REFERENCE_MEAN = 10.5
THETA_REFERENCE_SD = 3.0

#: Reference population drawn before self-selection is applied, from which the applicant
#: pool is sampled. Large enough that the realised applicant moments are stable to three
#: decimals; reported in the run manifest rather than asserted here.
N_REFERENCE = 400_000

#: Self-selection into applying, as a probit coefficient on standardised standing
#: ability: P(applies) = Phi(c + tilt * z_theta), with c set to give the base rate below.
#: Families do not apply at random. Bui, Craig & Imberman's magnet applicants were
#: roughly 1 SD above the average ALREADY-GIFTED student; GT's pool is additionally
#: filtered by tuition and by parents who went looking for a gifted programme
#: (E-003, E-096). At tilt 0.8 and a 0.25 base rate the realised pool sits about
#: +0.79 SD above the national mean with about 0.84 of its spread — the narrowing is
#: what later makes range restriction bite, and it is produced by the model rather than
#: imposed. Realised values are recomputed and written to the manifest on every run.
#: [ASSUMED — order of magnitude from Bui et al. 2014; the exact tilt is a position.]
APPLICANT_SELF_SELECTION_TILT = 0.8
APPLICANT_BASE_APPLY_RATE = 0.25

#: Latent learning rate, in scale points per trial: how fast the difficulty a child has
#: an even chance on rises while they work. lambda ~ N(0.06, 0.03^2), the harness
#: default that E-095's reproduction path records. [MEASURED: E-095 reproduction parameters]
LAMBDA_MEAN = 0.06
LAMBDA_SD = 0.03

#: Correlation between latent standing ability and latent learning rate.
#:
#: THIS IS THE LOAD-BEARING ASSUMPTION OF THE WHOLE SIMULATION and there is no
#: measurement of it anywhere — not in this repository, not in the literature reviewed
#: in `docs/research/`. It is set to a modest positive value for three reasons, each
#: arguable:
#:
#:   1. GT states the two come apart in both directions: some children who are not
#:      conventionally gifted accelerate on the platform and "mimic giftedness", and
#:      some genuinely gifted children are not served by it (E-097, [REPORTED]). A
#:      correlation near 1 would contradict the programme's own account of itself, and
#:      would also make the second measurement axis pointless.
#:   2. GT separately describes the thing it values as the rate of absorbing new
#:      information, explicitly distinguished from general ability (E-098, [REPORTED]).
#:   3. Ability and learning rate share obvious common causes, so 0 is not credible either.
#:
#: EVERY FIGURE THAT SHOWS LEARNING RATE ADDING ANYTHING IS CONDITIONAL ON THIS NUMBER.
#: At rho = 0.9 the incremental-validity panel collapses to nothing. Swept in README §7.
#: [ASSUMED]
RHO_THETA_LAMBDA = 0.30

#: Family opportunity/resources: tutoring, test practice, a quiet room, an articulate
#: parent narrative. Correlated with standing ability because opportunity buys measured
#: ability (E-003, E-018). Used for two things only: the officer's construct-irrelevant
#: weight, and nothing in the criterion. [ASSUMED]
RHO_THETA_OPPORTUNITY = 0.35

#: How strongly the officer's construct-irrelevant impression tracks family opportunity
#: rather than the child. Near 1 by construction: that is what makes it irrelevant.
#: [ASSUMED]
RHO_IRRELEVANT_OPPORTUNITY = 0.90

#: Correlation between latent standing (reasoning) ability and latent MAP mathematics
#: achievement. Reasoning and achievement are distinct but heavily overlapping; prior
#: ability and achievement both remain predictive including at high levels (E-006), and
#: CogAT does not directly measure achievement (E-015), which is the gap MAP fills.
#: [ASSUMED]
RHO_THETA_MAP_ACHIEVEMENT = 0.70

#: Correlation between latent standing ability and latent MAP reading achievement.
#: Lower than mathematics because the reading gate exists precisely because reading can
#: lag cognitive ability -- the documented waiver case is a 99th-percentile cognitive
#: child reading at the 70th-80th, "usually only for English-as-a-second-language
#: learners" (E-096, [REPORTED]). A high correlation here would make that case vanish
#: and the gate would stop doing anything. [ASSUMED]
RHO_THETA_MAP_READING = 0.55


# ---------------------------------------------------------------------------
# 3. The instrument's learning-rate readout — simulated at its MEASURED precision
# ---------------------------------------------------------------------------
#
# The brief for this simulation is explicit: simulate lambda with the error it has,
# not the error we wish it had. Everything in this block is [MEASURED] from
# `docs/product/STAGE2_BANK_RECOVERY_MEASUREMENT.md`, on `FLU-OPCHAIN-01`, the
# purpose-built bank, with PR #22's corrected 0.2 guessing floor in both roles, at
# 8 seeds x 400 children per cell. These are the best figures the project has.


@dataclass(frozen=True)
class LambdaPrecision:
    """One measured operating point of the learning-rate estimator."""

    trials: int
    #: Correlation between the fitted lambda and the injected truth.
    recovery_r: float
    #: Mean posterior SD of the fit, in scale points per trial.
    posterior_se: float
    #: Mean lambda fitted for a cohort that learned NOTHING (lambda_true = 0 for every
    #: child). A systematic, non-averaging bias produced by the closed adaptive loop,
    #: not by any child. D-200 requires a caller to declare it.
    contamination_floor: float
    #: Monte-Carlo SE of that floor over 8 seeds.
    contamination_floor_se: float
    #: Regression slope of fitted on true lambda. <1 means shrunk toward zero.
    attenuation_slope: float
    label: str


#: The block as administered today. 30 trials is the shipped `MIN_TRIALS_FOR_RATE`.
#: Source: STAGE2_BANK_RECOVERY_MEASUREMENT.md §3.1, §4, §5 (8-seed means).
#: The verdict recorded there is blunt and this simulation must not soften it: at this
#: precision, against the only reference distribution with a stated provenance
#: (SD 0.03), 100% of blocks read `indeterminate`. NO ABSOLUTE LEARNING RATE IS
#: REPORTABLE AT THIS LENGTH. [MEASURED]
LAMBDA_CURRENT = LambdaPrecision(
    trials=30,
    recovery_r=0.332,
    posterior_se=0.063,
    contamination_floor=0.0097,
    contamination_floor_se=0.0011,
    attenuation_slope=0.633,
    label="30 trials (as administered)",
)

#: The block at 60 trials, which nobody has authorised. Same bank, same estimator,
#: same source tables. Included because the brief asks what a longer block would buy,
#: and the answer has two halves that must be shown together:
#:   - random error more than halves, 0.063 -> 0.028;
#:   - THE CONTAMINATION FLOOR DOES NOT MOVE, 0.0097 -> 0.0094, inside its own SE.
#: Block length buys down the random error and leaves the systematic one where it is
#: (STAGE2_BANK_RECOVERY_MEASUREMENT.md §4). [MEASURED]
LAMBDA_IMPROVED = LambdaPrecision(
    trials=60,
    recovery_r=0.659,
    posterior_se=0.028,
    contamination_floor=0.0094,
    contamination_floor_se=0.0011,
    attenuation_slope=0.633,
    label="60 trials (hypothetical longer block)",
)

#: Smallest reference SD at which the shipped readout will name a band, derived in
#: `learning-rate-readout.ts` as 2 x (posterior SE + contamination floor). On
#: FLU-OPCHAIN-01 that is 0.145 at 30 trials and 0.075 at 60. The only reference SD
#: with a stated provenance anywhere in this project is 0.03. [MEASURED/DERIVED]
LAMBDA_REFERENCE_SD_WITH_PROVENANCE = 0.03


# ---------------------------------------------------------------------------
# 4. The CogAT-like comparator — DOES NOT EXIST YET
# ---------------------------------------------------------------------------
#
# GT has committed to supplying CogAT and MAP screeners for its ~46 on-campus students
# (E-100, [REPORTED]) and historical CogAT distributions from Riverside. None of it is
# in hand. Every figure involving this comparator is a PROJECTION OF A FUTURE STUDY and
# is labelled as such on the figure itself.

#: Reliability of the CogAT-like composite.
#:
#: DELIBERATELY NOT ASSERTED AS A PUBLISHED FACT. This repository already tried to verify
#: CogAT Form 7/8 battery reliabilities and could not: the Form 7/8 Research and
#: Development Guide was not accessible, and a secondary source's "high .90s for verbal
#: and nonverbal, low .90s for quantitative" was explicitly NOT asserted for that reason
#: (test-evaluation BrainLift, "Could not verify"). Repeating a number that our own
#: evidence review refused to repeat would be worse than assuming one openly.
#:
#: 0.94 is used as the headline and swept over {0.88, 0.94, 0.97}, a range that spans
#: the secondary claim and the general run of group-administered ability composites.
#: The comparator is favoured rather than handicapped by this choice: a HIGHER assumed
#: comparator reliability makes our instrument look worse, so this is the conservative
#: direction. [ASSUMED — and unverifiable from any source this project can currently reach]
COGAT_RELIABILITY = 0.94
COGAT_RELIABILITY_SWEEP = (0.88, 0.94, 0.97)

#: Correlation between the CogAT-like latent composite and the latent standing ability
#: our instrument targets. Two group-administered reasoning composites over overlapping
#: constructs. CogAT Form 8 measures verbal, quantitative and nonverbal reasoning and
#: does not directly measure achievement or dedicated spatial, working-memory or
#: processing-speed constructs (E-015); our instrument scores four areas including
#: spatial. So the two overlap heavily but not completely. [ASSUMED]
RHO_COGAT_THETA = 0.85

#: Direct loading of the CogAT-like composite on the latent LEARNING RATE, over and
#: above what it inherits through standing ability. Set to zero: a fixed-form reasoning
#: battery administered once has no within-session novel-task block and therefore no
#: channel through which a learning rate could enter.
#:
#: This is the assumption that MAKES the incremental-validity figure. If CogAT in fact
#: carries learning-rate signal indirectly, the incremental column shrinks. Stated here
#: rather than buried so that a reviewer can attack it directly. [ASSUMED]
COGAT_LAMBDA_LOADING = 0.0


# ---------------------------------------------------------------------------
# 5. The criterion, part 1 — mastery pace (primary, and endogenous)
# ---------------------------------------------------------------------------

#: Standardised effect of latent standing ability on true mastery pace.
#: Cognitive ability's operational validity against academic outcomes was revised
#: DOWNWARD by Sackett et al. (2022) from roughly .51 to .31 after they showed the
#: standard range-restriction corrections overcorrected. Within an already-selected
#: high-ability applicant pool the honest figure is at the low end. 0.35 is set as the
#: TRUE latent path coefficient, which is not the same thing as an observed validity:
#: the observed correlation will be lower once measurement error and range restriction
#: are applied, and reproducing that gap is part of what the figures show.
#: [ASSUMED — anchored on Sackett et al. 2022, DOI 10.1037/apl0000994]
BETA_THETA_MASTERY = 0.35

#: Standardised effect of latent learning rate on true mastery pace. Set slightly
#: ABOVE the standing path because the programme's own account of what it selects for
#: is the rate of absorbing and adapting to new information rather than giftedness
#: alone (E-097, E-098, [REPORTED]) -- and because a personalised-mastery platform
#: paces itself to the child, which is close to a definition of measuring learning rate.
#: If this is wrong the entire case for a second measurement axis is wrong, which is
#: why it is a named constant. [ASSUMED]
BETA_LAMBDA_MASTERY = 0.40

#: THE CONTAMINATION TERM. In a personalised-mastery platform, "objectives mastered per
#: week" is partly a property of what the platform chose to serve. If routing correlates
#: with anything the admission signal also correlates with, mastery pace is endogenous
#: and a validity coefficient estimated against it is inflated by the routing, not by
#: the child.
#:
#: Modelled as a routing-advantage variable entering mastery pace with this weight,
#: whose correlation with standing ability is the sweep parameter below.
#: [ASSUMED — the mechanism is a certainty; the magnitude is a position]
BETA_ROUTING_MASTERY = 0.30

#: Correlation between the platform's routing advantage and latent standing ability.
#: Two regimes are simulated and contrasted:
#:   neutral    - routing is orthogonal to ability (the assumption a naive validity
#:                study makes without checking);
#:   correlated - the platform places abler children on faster tracks, so routing and
#:                ability share variance.
#: Nobody has measured which regime the real platform is in. That is the point of the
#: figure. [ASSUMED — both values]
RHO_ROUTING_NEUTRAL = 0.0
RHO_ROUTING_CORRELATED = 0.60

#: Fraction of true mastery-pace variance that is neither trait nor routing: illness,
#: engagement, a bad month, family disruption. Residual, derived to make the variance
#: sum to one. [DERIVED in code]


# ---------------------------------------------------------------------------
# 6. The criterion, part 2 — MAP conditional growth (external anchor)
# ---------------------------------------------------------------------------
#
# The one confirmed data element. The programme administers MAP three times a year
# (fall, winter, spring). MAP is external to the platform's routing, which is exactly
# why it anchors the criterion: no routing decision can inflate it.
#
# All four constants below are PUBLISHED and cited. They are the only external
# psychometric facts this simulation rests on.

#: Conditional standard error of measurement of a single MAP Growth test event, in RIT
#: points. NWEA designs each event to a target CSEM of about 3.5 RIT; the observed
#: values for Mathematics grades 3-8 sit at 3.22-3.34 in the middle decile and
#: 3.25-3.34 at the extremes, close to constant across the ability range as expected of
#: an adaptive test. 3.3 is the grades 3-8 Mathematics middle-decile value.
#: [PUBLISHED: NWEA, MAP Growth Technical Report 2024-2025, §7.5.1 and Table 7.5]
MAP_CSEM_RIT = 3.3

#: Standard deviation of the normative fall-to-spring growth distribution for
#: Mathematics, in RIT points. The 2025 norms give SD = 8 for grades 3, 4, 5 and 6
#: (means 15, 13, 10, 10) and SD = 8 and 9 for grades 7 and 8. 8 is used throughout;
#: the figures are in standardised CGI units so the exact grade matters only for the
#: mean, which cancels.
#: [PUBLISHED: NWEA, 2025 MAP Growth norms quick reference, mathematics student growth norms]
MAP_GROWTH_SD_RIT = 8.0

#: Mean normative fall-to-spring growth for grade 5 Mathematics, in RIT points.
#: Used only to locate the projected-growth intercept; no figure depends on it.
#: [PUBLISHED: same source]
MAP_GROWTH_MEAN_RIT = 10.0

#: Slope of expected fall-to-spring growth on starting RIT: children who start higher
#: are normatively expected to grow less. NWEA's own worked example gives grade-1
#: Mathematics fall RIT 130 -> mean growth 19 and fall RIT 180 -> mean growth 14, i.e.
#: -0.10 RIT of expected growth per RIT of starting score. Taken as the order of
#: magnitude and the sign; the grade-1 example is not a grade-5 coefficient and the
#: transfer is flagged.
#: [PUBLISHED, with a grade-transfer caveat: NWEA blog, "To measure a year's growth,
#:  begin with the student" (2025)]
MAP_CONDITIONAL_GROWTH_SLOPE_PER_RIT = -0.10

#: Fall RIT distribution used to locate children on the achievement scale. The location
#: constant is arbitrary and no figure depends on it; the SD sets how much the
#: conditioning slope above can move an individual's projection.
#: [ASSUMED — location arbitrary, spread a conventional grade-5 mathematics value]
MAP_FALL_RIT_MEAN = 210.0
MAP_FALL_RIT_SD = 15.0

#: DERIVED, AND THE MOST IMPORTANT NUMBER IN THIS BLOCK. A fall-to-spring change score
#: carries the measurement error of BOTH events: SD = sqrt(2) x 3.3 = 4.67 RIT. Against
#: a normative conditional growth SD of 8.0 RIT, measurement error is (4.67/8.0)^2 = 34%
#: of the observed conditional growth variance, so the reliability of a single
#: fall-to-spring CGI as a measure of a child's true growth is about 0.66.
#:
#: The external anchor is unbiased by platform routing and NOISY. Both halves are true
#: and the figures state both. This is the standard unreliability-of-difference-scores
#: result; see the gain-score literature (Rogosa, Brandt & Zimowski 1982; Willett 1988).
#: Computed in `cohort.py`, not hard-coded. [DERIVED from two PUBLISHED constants]

#: Standardised path coefficients into TRUE fall-to-spring growth. The learning-rate
#: path is set lower than for mastery pace: MAP measures grade-level achievement growth
#: on a nationally-normed scale, which is a coarser and more distant consequence of a
#: within-session learning rate than the platform's own objective counter is.
#: [ASSUMED]
BETA_THETA_MAP_GROWTH = 0.30
BETA_LAMBDA_MAP_GROWTH = 0.28

#: Routing loading on MAP growth. ZERO BY CONSTRUCTION AND BY ARGUMENT: MAP is
#: administered outside the platform, its items are selected by NWEA's own adaptive
#: algorithm against a national scale, and no routing decision inside the programme can
#: change the normative comparison. This is the whole reason the external anchor exists.
#:
#: The honest caveat, stated here because a hostile reviewer will raise it: routing
#: could still affect MAP growth INDIRECTLY, by changing what the child actually learns.
#: That is a real effect of the programme rather than a measurement artifact, which is
#: the distinction the dual criterion is drawing. [ASSUMED, with argument]
BETA_ROUTING_MAP_GROWTH = 0.0

#: Programme-wide mean shift in conditional growth index, in CGI units. Set to ZERO.
#:
#: GT and Alpha publish growth multiples — "average 2.6x MAP growth", "3x median MAP
#: growth" (E-004, a company claim under test; the public-facts dossier separately
#: records NWEA's own warning that the ratio is skewed by small projected-growth
#: denominators). Those are claims to be tested, not inputs to a simulation. Zero keeps
#: a contested marketing figure out of every figure in this paper, and it costs nothing:
#: a constant shift moves every child's CGP together and changes no correlation, no AUC
#: and no R^2. Not one figure here would look different at 0.8. [ASSUMED = 0, deliberately]
MAP_PROGRAMME_CGI_SHIFT = 0.0


# ---------------------------------------------------------------------------
# 7. Success, and its base rate
# ---------------------------------------------------------------------------

#: "Success" is a threshold on the continuous criterion. Dichotomising a continuous
#: outcome loses information and is done here only because ROC, PPV and confusion
#: matrices require it; the incremental-validity figure works on the continuous
#: criterion and should be read as the more informative of the two.
#:
#: The operating base rate is the fraction of the APPLICANT POOL who would succeed. It
#: is unknown for GT and it is the single parameter the PPV figure exists to show the
#: sensitivity to, so it is swept across the whole plausible range there and only fixed
#: here for the ROC and confusion figures. [ASSUMED]
SUCCESS_BASE_RATE = 0.30

#: Base rates marked on the PPV figure. 0.02 is roughly the top-2% prevalence at which
#: conventional gifted identification operates; 0.30 is this simulation's operating
#: assumption for "thrives on the platform" within a self-selected applicant pool; 0.60
#: is what the rate would be if GT's own account of its current admits is right.
PPV_BASE_RATES_MARKED = (0.02, 0.30, 0.60)


# ---------------------------------------------------------------------------
# 8. The admission officer — a real human, modelled as imperfect on purpose
# ---------------------------------------------------------------------------
#
# GT's admissions director is currently the sole reviewer (E-096 context, [REPORTED]).
# The rule below is a caricature of one person's judgement built from what she said the
# rule is, plus two documented ways human review departs from any rule. The imperfection
# is the point: a statistical rule that reproduced a perfect officer would prove nothing.

#: Weight the officer places on the CogAT-like composite. She calls CogAT "the only
#: truly fairly accurate measurement" she has seen and reads it as accurate even when
#: MAP disagrees (E-099, [REPORTED]). So it dominates. [ASSUMED — magnitude]
OFFICER_WEIGHT_COGAT = 1.00

#: Weight on the MAP achievement screeners. The documented rubric admits on two MAP
#: screeners above the 95th percentile even at ~90th CogAT, so MAP is a genuine second
#: path rather than a tiebreak (E-096, [REPORTED]). [ASSUMED — magnitude]
OFFICER_WEIGHT_MAP = 0.70

#: Weight on a CONSTRUCT-IRRELEVANT feature: narrative polish, prior-school prestige, an
#: articulate parent, a warm shadow-day impression. Correlated with family opportunity,
#: not with the child's ability.
#:
#: Not a slur on the officer — it is the documented behaviour of unstructured review in
#: general. Unstructured recommendations are weak incremental predictors that encode
#: advocacy, prestige and demographic language differences (E-021); freeform holistic
#: review is less reproducible than structured pathways with mechanical combination
#: (E-023); and a substantial share of gifted-rating variance is attributable to the
#: rater rather than the student (E-020, McCoach et al. 2024).
#: 0.25 makes it a quarter of the CogAT weight. [ASSUMED]
OFFICER_WEIGHT_IRRELEVANT = 0.25

#: Officer inconsistency: the same file on a different day. In the same standardised
#: units as the weights above. Implies a decision that a re-review would overturn for a
#: minority of borderline files; the implied re-decision agreement is computed and
#: printed by the officer-agreement figure rather than assumed as an output.
#: [ASSUMED — the existence is documented (E-020, E-023); the size is a position]
OFFICER_NOISE_SD = 0.45

#: The hard reading gate, applied by the officer and by nobody else. Every student needs
#: at least the 85th-percentile fall MAP Reading score for the grade they are entering,
#: regardless of CogAT -- with one exception, a 99th-percentile cognitive child whose
#: reading is 70th-80th, "usually only for English-as-a-second-language learners".
#: Rationale given: a child who cannot read cannot keep up on a self-paced,
#: reading-heavy platform. [REPORTED — E-096, and quoted almost verbatim from the
#: interview record]
OFFICER_READING_GATE_PERCENTILE = 85.0
OFFICER_READING_GATE_WAIVER_COGAT_PERCENTILE = 99.0
OFFICER_READING_GATE_WAIVER_FLOOR_PERCENTILE = 70.0

#: Share of GATE-PASSING files the officer admits in the SELECTIVE regime (the physical
#: GT School, where she and the guides decide together after a shadow day). Expressed
#: relative to gate-passers rather than to the whole pool because the gate is a hard
#: prior filter, not a weighted input. The resulting share of the WHOLE pool is an
#: output of the model and is written to the run manifest. Unknown. Swept in README §7.
#: [ASSUMED]
OFFICER_ADMIT_RATE_SELECTIVE = 0.55

#: Share of the WHOLE pool admitted in the OPEN-ENROLMENT regime, with no reading gate
#: applied at all. "Frankly, for GT Anywhere right now, they just let everybody in —
#: I'm the first admissions person to be like, whoa, whoa, wait a second." That is the
#: documented state of the larger of the two programmes (~300 students against ~40-46
#: on campus, E-101).
#:
#: This is what makes the range-restriction figure worth drawing: an open-enrolment
#: programme observes outcomes across the FULL applicant range, so a validity study run
#: there needs no range-restriction correction and no untestable assumption about the
#: children who were turned away. [REPORTED — Crystal Martel interview, 2026-07-23, pt.2]
OFFICER_ADMIT_RATE_OPEN = 0.97


# ---------------------------------------------------------------------------
# 9. Presentation
# ---------------------------------------------------------------------------

#: Okabe-Ito, the standard colourblind-safe qualitative palette. Every figure also
#: separates its series by marker, hatch or line style so that it survives greyscale.
PALETTE = {
    "instrument": "#0072B2",  # blue
    "comparator": "#D55E00",  # vermillion
    "combined": "#009E73",  # bluish green
    "learning": "#CC79A7",  # reddish purple
    "neutral": "#56B4E9",  # sky blue
    "warn": "#E69F00",  # orange
    "grey": "#666666",
    "light": "#BBBBBB",
}
