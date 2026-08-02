"""The generative model: one seeded, deterministic synthetic applicant cohort.

Every number this module uses comes from `params.py`. Nothing is invented here; this
file only wires the parameters together and applies the measurement models.

The generated cohort is BORN-SYNTHETIC. No real child's record was read, transformed
or sampled to produce it. Nothing it outputs is evidence about a real child, a real
admission decision, or the real instrument's validity. See README.md §1 and §6.

Structure of the model, in the order it is built:

    latent traits          theta (standing), lambda (learning rate), opportunity,
                           MAP maths achievement, MAP reading achievement
        |
    self-selection         who applies at all -> the applicant pool
        |
    measurements           instrument standing score (Rasch/1PL Fisher SE + an
                           uncalibrated-difficulty term), instrument learning-rate
                           readout at two MEASURED precisions, a CogAT-like composite,
                           MAP fall RIT
        |
    criteria               mastery pace (endogenous to platform routing, two routing
                           regimes) and MAP conditional growth percentile (external)
        |
    decisions              the historical admission officer, in a selective regime and
                           in an open-enrolment regime
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

import params as P


# ---------------------------------------------------------------------------
# Small numeric helpers (no scipy dependency anywhere in this package)
# ---------------------------------------------------------------------------


def normal_cdf(x: np.ndarray | float) -> np.ndarray | float:
    """Standard normal CDF via the error function."""
    return 0.5 * (1.0 + np.vectorize(math.erf)(np.asarray(x, dtype=float) / math.sqrt(2.0)))


def normal_ppf(p: np.ndarray | float) -> np.ndarray | float:
    """Standard normal quantile function.

    Acklam's rational approximation, refined by one Halley step against `normal_cdf`,
    giving ~1e-15 absolute accuracy. Written out rather than imported so the package
    needs only numpy and matplotlib.
    """
    scalar = np.isscalar(p) or (isinstance(p, np.ndarray) and p.ndim == 0)
    p = np.atleast_1d(np.asarray(p, dtype=float))
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    plow, phigh = 0.02425, 1 - 0.02425
    x = np.zeros_like(p)

    lo = p < plow
    if np.any(lo):
        q = np.sqrt(-2 * np.log(p[lo]))
        x[lo] = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
                ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    hi = p > phigh
    if np.any(hi):
        q = np.sqrt(-2 * np.log(1 - p[hi]))
        x[hi] = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
                 ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    mid = ~lo & ~hi
    if np.any(mid):
        q = p[mid] - 0.5
        r = q * q
        x[mid] = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / \
                 (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)

    e = normal_cdf(x) - p
    u = e * math.sqrt(2 * math.pi) * np.exp(x * x / 2)
    out = x - u / (1 + x * u / 2)
    return float(out[0]) if scalar else out


def zscore(x: np.ndarray, mean: float | None = None, sd: float | None = None) -> np.ndarray:
    mean = float(np.mean(x)) if mean is None else mean
    sd = float(np.std(x)) if sd is None else sd
    return (x - mean) / sd


def _unit_variance_mix(components: list[tuple[float, np.ndarray]], rng: np.random.Generator) -> np.ndarray:
    """Combine standardised components with the given weights, then add independent
    residual noise so the result has unit variance. Returns the standardised mix.

    Raises if the named weights already explain more than all the variance, which would
    mean the parameter file is internally inconsistent rather than merely arguable.
    """
    total = np.zeros(len(components[0][1]))
    explained = 0.0
    for weight, series in components:
        total = total + weight * series
        explained += weight * weight
    # Cross-covariance between components is real (they are correlated by design), so
    # measure the achieved variance rather than assuming the weights are orthogonal.
    achieved = float(np.var(total))
    if achieved >= 1.0:
        raise ValueError(
            f"named paths already explain {achieved:.3f} of unit criterion variance; "
            "the path coefficients in params.py are jointly impossible"
        )
    residual_sd = math.sqrt(1.0 - achieved)
    return total + residual_sd * rng.standard_normal(len(total))


# ---------------------------------------------------------------------------
# The instrument's own measurement precision, derived from the shipped formula
# ---------------------------------------------------------------------------


def instrument_standing_se() -> tuple[float, float, float]:
    """Standard error of the composite standing estimate, in scale points.

    Reproduces `abilityStandardError` from `packages/exam-scoring/src/ability.ts`:
    each item contributes Fisher information `slope^2 * p * (1 - p)`, and a finite prior
    adds `1 / priorSd^2`. A converged adaptive battery serves items the child has about
    an even chance on, so `p * (1 - p)` is taken at its maximum of 0.25 -- the most
    favourable assumption available to the instrument, and therefore the conservative
    one for any claim that the instrument is good.

    Returns (per-area SE, composite Fisher SE, total SE including the uncalibrated-
    difficulty term).
    """
    info_per_area = P.ITEMS_PER_AREA * P.RASCH_SLOPE**2 * 0.25 + 1.0 / P.ABILITY_PRIOR_SD**2
    se_area = 1.0 / math.sqrt(info_per_area)
    # The composite is a weighted mean of the four area proficiencies (`scorer.ts`).
    # Treating the four area errors as independent is a simplification that FAVOURS the
    # instrument; correlated errors would give a larger composite SE. Flagged in README §7.
    se_composite_fisher = se_area / math.sqrt(P.N_AREAS)
    se_total = math.sqrt(se_composite_fisher**2 + P.STANDING_CALIBRATION_ERROR_SD**2)
    return se_area, se_composite_fisher, se_total


def lambda_readout_noise_sd(precision: P.LambdaPrecision) -> float:
    """Noise SD implied by a MEASURED recovery correlation.

    The measurements in `STAGE2_BANK_RECOVERY_MEASUREMENT.md` report both a recovery
    correlation r and a mean posterior SE. They are not quite consistent with each other
    under a linear model, and the honest thing is to say which one drives the simulation
    and by how much they differ. The recovery correlation is used, because it is the
    quantity that determines how well a cohort can actually be ordered, and the implied
    noise is reported alongside the posterior SE in the run manifest.
    """
    signal_sd = precision.attenuation_slope * P.LAMBDA_SD
    r = precision.recovery_r
    return signal_sd * math.sqrt(1.0 / (r * r) - 1.0)


# ---------------------------------------------------------------------------
# The cohort
# ---------------------------------------------------------------------------


@dataclass
class Cohort:
    """One seeded synthetic applicant pool. All arrays are length `n`."""

    n: int

    # --- latent truth (never observable in real life) -----------------------
    theta: np.ndarray                 # standing ability, [1, 20] scale
    z_theta: np.ndarray               # ... standardised against the REFERENCE population
    lam: np.ndarray                   # learning rate, scale points per trial
    z_lambda: np.ndarray
    opportunity: np.ndarray           # family resources, standardised
    z_map_math_true: np.ndarray
    z_map_reading_true: np.ndarray

    # --- what the instrument observes --------------------------------------
    theta_hat: np.ndarray             # standing score, [1, 20] scale
    lam_hat_current: np.ndarray       # learning-rate readout at 30 trials (as administered)
    lam_hat_improved: np.ndarray      # ... at 60 trials (hypothetical)

    # --- what the comparator would observe, IF IT EXISTED ------------------
    cogat_z: np.ndarray
    cogat_percentile: np.ndarray

    # --- MAP -----------------------------------------------------------------
    map_fall_rit: np.ndarray
    map_math_percentile: np.ndarray
    map_reading_percentile: np.ndarray

    # --- criteria -------------------------------------------------------------
    routing_xi: np.ndarray            # the routing draw, kept so the regime can be swept
    seed: int
    mastery_neutral: np.ndarray       # mastery pace, routing orthogonal to ability
    mastery_correlated: np.ndarray    # mastery pace, routing correlated with ability
    map_cgi: np.ndarray               # conditional growth index (z)
    map_cgp: np.ndarray               # conditional growth percentile, 1-99

    # --- historical decisions --------------------------------------------------
    officer_admit_selective: np.ndarray   # bool
    officer_admit_open: np.ndarray        # bool
    officer_utility: np.ndarray
    officer_gate_pass: np.ndarray         # bool
    officer_irrelevant: np.ndarray        # the construct-irrelevant impression, z

    diagnostics: dict = field(default_factory=dict)

    def success(self, criterion: np.ndarray, base_rate: float | None = None) -> np.ndarray:
        """Dichotomise a continuous criterion at the operating base rate."""
        rate = P.SUCCESS_BASE_RATE if base_rate is None else base_rate
        cut = float(np.quantile(criterion, 1.0 - rate))
        return criterion >= cut

    def mastery_at(self, rho_route: float) -> np.ndarray:
        """Mastery pace under an arbitrary routing-ability correlation.

        The child-level paths are unchanged; only how strongly the platform's routing
        tracks ability moves. Any change in estimated validity across this sweep is
        endogeneity in the criterion, not a change in the instrument or the child.
        """
        z_route = rho_route * self.z_theta + math.sqrt(1.0 - rho_route**2) * self.routing_xi
        return _unit_variance_mix(
            [
                (P.BETA_THETA_MASTERY, self.z_theta),
                (P.BETA_LAMBDA_MASTERY, self.z_lambda),
                (P.BETA_ROUTING_MASTERY, z_route),
            ],
            np.random.default_rng(self.seed + 7),
        )


def build_cohort(seed: int | None = None, n: int | None = None) -> Cohort:
    """Generate the primary synthetic cohort. Deterministic in `seed`."""
    seed = P.ROOT_SEED if seed is None else seed
    n = P.N_APPLICANTS if n is None else n
    rng = np.random.default_rng(seed)

    # --- 1. Reference population, before anyone decides to apply ------------
    m = P.N_REFERENCE
    z_theta_ref = rng.standard_normal(m)

    # Self-selection into applying: P(apply) = Phi(c + tilt * z_theta).
    tilt = P.APPLICANT_SELF_SELECTION_TILT
    c = float(normal_ppf(P.APPLICANT_BASE_APPLY_RATE)) * math.sqrt(1.0 + tilt * tilt)
    p_apply = normal_cdf(c + tilt * z_theta_ref)
    applies = rng.random(m) < p_apply
    idx = np.flatnonzero(applies)
    if idx.size < n:
        raise RuntimeError(
            f"reference pool of {m} produced only {idx.size} applicants; raise N_REFERENCE"
        )
    idx = idx[:n]
    z_theta = z_theta_ref[idx]

    # Everything below is generated for applicants only, using a fresh stream so the
    # applicant traits do not depend on how many reference children were drawn.
    rng = np.random.default_rng(seed + 1)

    theta = np.clip(
        P.THETA_REFERENCE_MEAN + P.THETA_REFERENCE_SD * z_theta, P.SCALE_MIN, P.SCALE_MAX
    )

    # --- 2. The other latent traits, correlated with standing ability -------
    def correlated_with_theta(rho: float) -> np.ndarray:
        return rho * z_theta + math.sqrt(1.0 - rho * rho) * rng.standard_normal(n)

    z_lambda = correlated_with_theta(P.RHO_THETA_LAMBDA)
    lam = P.LAMBDA_MEAN + P.LAMBDA_SD * z_lambda
    opportunity = correlated_with_theta(P.RHO_THETA_OPPORTUNITY)
    z_map_math_true = correlated_with_theta(P.RHO_THETA_MAP_ACHIEVEMENT)
    z_map_reading_true = correlated_with_theta(P.RHO_THETA_MAP_READING)

    # --- 3. The instrument's standing score ---------------------------------
    _, se_fisher, se_standing = instrument_standing_se()
    theta_hat = np.clip(
        theta + se_standing * rng.standard_normal(n), P.SCALE_MIN, P.SCALE_MAX
    )

    # --- 4. The instrument's learning-rate readout, at MEASURED precision ---
    # E[lambda_hat | lambda] = contamination_floor + attenuation * lambda.
    # The floor is a systematic, non-averaging positive bias produced by the closed
    # adaptive loop for a child who learned nothing at all. It does not shrink with
    # block length: 0.0097 at 30 trials, 0.0094 at 60.
    def readout(precision: P.LambdaPrecision) -> np.ndarray:
        noise = lambda_readout_noise_sd(precision)
        floor = precision.contamination_floor + precision.contamination_floor_se * rng.standard_normal(n)
        return floor + precision.attenuation_slope * lam + noise * rng.standard_normal(n)

    lam_hat_current = readout(P.LAMBDA_CURRENT)
    lam_hat_improved = readout(P.LAMBDA_IMPROVED)

    # --- 5. The CogAT-like comparator (DOES NOT EXIST YET) ------------------
    cogat_true = P.RHO_COGAT_THETA * z_theta + \
        math.sqrt(1.0 - P.RHO_COGAT_THETA**2) * rng.standard_normal(n)
    if P.COGAT_LAMBDA_LOADING:
        cogat_true = cogat_true + P.COGAT_LAMBDA_LOADING * z_lambda
    # Reliability model from research/backend-admissions/SIMULATION_SPECIFICATION.md:
    # C = sqrt(r_C) * C* + sqrt(1 - r_C) * epsilon, so C is standard normal in the
    # reference population and its correlation with C* is sqrt(r_C).
    r_c = P.COGAT_RELIABILITY
    cogat_z = math.sqrt(r_c) * cogat_true + math.sqrt(1.0 - r_c) * rng.standard_normal(n)
    cogat_percentile = 100.0 * normal_cdf(cogat_z)

    # --- 6. MAP achievement, fall ------------------------------------------
    # Reliability derived, not assumed: a CSEM of 3.3 RIT against a grade SD of 15 RIT
    # implies reliability 1 - (3.3/15)^2 = 0.952 in the national grade population.
    map_reliability = 1.0 - (P.MAP_CSEM_RIT / P.MAP_FALL_RIT_SD) ** 2
    map_math_obs_z = math.sqrt(map_reliability) * z_map_math_true + \
        math.sqrt(1.0 - map_reliability) * rng.standard_normal(n)
    map_reading_obs_z = math.sqrt(map_reliability) * z_map_reading_true + \
        math.sqrt(1.0 - map_reliability) * rng.standard_normal(n)
    map_fall_rit = P.MAP_FALL_RIT_MEAN + P.MAP_FALL_RIT_SD * map_math_obs_z
    map_math_percentile = 100.0 * normal_cdf(map_math_obs_z)
    map_reading_percentile = 100.0 * normal_cdf(map_reading_obs_z)

    # --- 7. Criterion 1: mastery pace, under two routing regimes ------------
    # The routing advantage is what the PLATFORM chose to serve. Under the neutral
    # regime it is orthogonal to the child's ability; under the correlated regime the
    # platform places abler children on faster tracks. The child-level paths
    # (BETA_THETA_MASTERY, BETA_LAMBDA_MASTERY) are IDENTICAL in both regimes -- only
    # the routing correlation changes -- so any difference in estimated validity between
    # the two is endogeneity and nothing else.
    xi = rng.standard_normal(n)

    def mastery(rho_route: float) -> np.ndarray:
        z_route = rho_route * z_theta + math.sqrt(1.0 - rho_route**2) * xi
        return _unit_variance_mix(
            [
                (P.BETA_THETA_MASTERY, z_theta),
                (P.BETA_LAMBDA_MASTERY, z_lambda),
                (P.BETA_ROUTING_MASTERY, z_route),
            ],
            np.random.default_rng(seed + 7),  # same residual draw in both regimes
        )

    mastery_neutral = mastery(P.RHO_ROUTING_NEUTRAL)
    mastery_correlated = mastery(P.RHO_ROUTING_CORRELATED)

    # --- 8. Criterion 2: MAP conditional growth (the external anchor) -------
    # True fall-to-spring growth, in RIT, expressed as a deviation from the child's
    # normative projection. Its SD is DERIVED: the published conditional growth SD of
    # 8.0 RIT is an OBSERVED spread and already contains the measurement error of two
    # test events, so the true-growth SD is sqrt(8.0^2 - 2 * 3.3^2) = 6.50 RIT.
    growth_error_sd = math.sqrt(2.0) * P.MAP_CSEM_RIT
    true_growth_sd = math.sqrt(P.MAP_GROWTH_SD_RIT**2 - growth_error_sd**2)

    z_growth_true = _unit_variance_mix(
        [
            (P.BETA_THETA_MAP_GROWTH, z_theta),
            (P.BETA_LAMBDA_MAP_GROWTH, z_lambda),
            (P.BETA_ROUTING_MAP_GROWTH, xi),  # weight is 0: MAP is external to routing
        ],
        np.random.default_rng(seed + 8),
    )
    true_growth_index = true_growth_sd * (z_growth_true + P.MAP_PROGRAMME_CGI_SHIFT)
    observed_growth_index = true_growth_index + growth_error_sd * rng.standard_normal(n)
    map_cgi = observed_growth_index / P.MAP_GROWTH_SD_RIT
    map_cgp = np.clip(100.0 * normal_cdf(map_cgi), 1.0, 99.0)

    # --- 9. The historical admission officer --------------------------------
    officer_irrelevant = P.RHO_IRRELEVANT_OPPORTUNITY * opportunity + \
        math.sqrt(1.0 - P.RHO_IRRELEVANT_OPPORTUNITY**2) * rng.standard_normal(n)

    officer_utility = (
        P.OFFICER_WEIGHT_COGAT * cogat_z
        + P.OFFICER_WEIGHT_MAP * map_math_obs_z
        + P.OFFICER_WEIGHT_IRRELEVANT * officer_irrelevant
        + P.OFFICER_NOISE_SD * rng.standard_normal(n)
    )

    # The documented hard reading gate, with its documented waiver.
    gate_pass = (map_reading_percentile >= P.OFFICER_READING_GATE_PERCENTILE) | (
        (cogat_percentile >= P.OFFICER_READING_GATE_WAIVER_COGAT_PERCENTILE)
        & (map_reading_percentile >= P.OFFICER_READING_GATE_WAIVER_FLOOR_PERCENTILE)
    )

    def officer_decision(rate: float, apply_gate: bool) -> np.ndarray:
        """Admit the top-utility share of the eligible files.

        In the SELECTIVE regime the reading gate is applied first and `rate` is the
        share of GATE-PASSING files admitted. In the OPEN-ENROLMENT regime no gate is
        applied and `rate` is the share of the whole pool admitted -- which is what
        "they just let everybody in" means operationally.
        """
        eligible = np.flatnonzero(gate_pass) if apply_gate else np.arange(n)
        k = int(round(rate * eligible.size))
        admit = np.zeros(n, dtype=bool)
        if k <= 0:
            return admit
        if k >= eligible.size:
            admit[eligible] = True
            return admit
        order = eligible[np.argsort(-officer_utility[eligible], kind="stable")]
        admit[order[:k]] = True
        return admit

    officer_admit_selective = officer_decision(P.OFFICER_ADMIT_RATE_SELECTIVE, apply_gate=True)
    officer_admit_open = officer_decision(P.OFFICER_ADMIT_RATE_OPEN, apply_gate=False)

    diagnostics = {
        "seed": seed,
        "n_applicants": int(n),
        "applicant_theta_z_mean": float(np.mean(z_theta)),
        "applicant_theta_z_sd": float(np.std(z_theta)),
        "instrument_standing_se_fisher": float(se_fisher),
        "instrument_standing_se_total": float(se_standing),
        "instrument_standing_reliability_in_pool": float(
            1.0 - se_standing**2 / np.var(theta)
        ),
        "lambda_noise_sd_current": float(lambda_readout_noise_sd(P.LAMBDA_CURRENT)),
        "lambda_noise_sd_improved": float(lambda_readout_noise_sd(P.LAMBDA_IMPROVED)),
        "lambda_recovery_r_realised_current": float(np.corrcoef(lam, lam_hat_current)[0, 1]),
        "lambda_recovery_r_realised_improved": float(np.corrcoef(lam, lam_hat_improved)[0, 1]),
        "map_reliability_level": float(map_reliability),
        "map_growth_error_sd_rit": float(growth_error_sd),
        "map_true_growth_sd_rit": float(true_growth_sd),
        "map_cgi_reliability": float(true_growth_sd**2 / P.MAP_GROWTH_SD_RIT**2),
        "officer_gate_pass_rate": float(np.mean(gate_pass)),
        "officer_admit_rate_selective": float(np.mean(officer_admit_selective)),
        "officer_admit_rate_open": float(np.mean(officer_admit_open)),
    }

    return Cohort(
        n=n,
        theta=theta,
        z_theta=z_theta,
        lam=lam,
        z_lambda=z_lambda,
        opportunity=opportunity,
        z_map_math_true=z_map_math_true,
        z_map_reading_true=z_map_reading_true,
        theta_hat=theta_hat,
        lam_hat_current=lam_hat_current,
        lam_hat_improved=lam_hat_improved,
        cogat_z=cogat_z,
        cogat_percentile=cogat_percentile,
        map_fall_rit=map_fall_rit,
        map_math_percentile=map_math_percentile,
        map_reading_percentile=map_reading_percentile,
        routing_xi=xi,
        seed=seed,
        mastery_neutral=mastery_neutral,
        mastery_correlated=mastery_correlated,
        map_cgi=map_cgi,
        map_cgp=map_cgp,
        officer_admit_selective=officer_admit_selective,
        officer_admit_open=officer_admit_open,
        officer_utility=officer_utility,
        officer_gate_pass=gate_pass,
        officer_irrelevant=officer_irrelevant,
        diagnostics=diagnostics,
    )
