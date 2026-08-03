"""Standard-library-only statistical routines for the benchmarking design.

No third-party dependencies. Every routine here is used to generate a number
that appears in the report, so the report's arithmetic is reproducible on a
bare Python 3.8+ interpreter.

Routines are validated against published reference values in ``selftest.py``.
"""

import math

SQRT2 = math.sqrt(2.0)
SQRT2PI = math.sqrt(2.0 * math.pi)


# ---------------------------------------------------------------------------
# Normal distribution
# ---------------------------------------------------------------------------

def norm_pdf(z):
    return math.exp(-0.5 * z * z) / SQRT2PI


def norm_cdf(z):
    return 0.5 * math.erfc(-z / SQRT2)


def norm_sf(z):
    """Upper tail, computed without cancellation for large z."""
    return 0.5 * math.erfc(z / SQRT2)


def norm_ppf(p):
    """Inverse normal CDF by bisection on erfc (machine-precision, slow but exact
    enough; called only a few hundred times)."""
    if not 0.0 < p < 1.0:
        raise ValueError("norm_ppf requires 0 < p < 1, got %r" % (p,))
    lo, hi = -40.0, 40.0
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if norm_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


# ---------------------------------------------------------------------------
# Bivariate normal upper orthant probability
# ---------------------------------------------------------------------------

def _simpson(f, a, b, n):
    """Composite Simpson's rule with n (even) panels."""
    if b <= a:
        return 0.0
    if n % 2:
        n += 1
    step = (b - a) / n
    total = f(a) + f(b)
    for i in range(1, n):
        total += (4.0 if i % 2 else 2.0) * f(a + i * step)
    return total * step / 3.0


def bvn_upper(h, k, rho):
    """P(X > h, Y > k) for standard bivariate normal with correlation rho.

    Computed as the one-dimensional integral

        int_h^inf phi(x) * Phibar((k - rho x) / sqrt(1 - rho^2)) dx.

    The integrand is a Gaussian bell times a sigmoid whose transition has
    width s = sqrt(1 - rho^2) and is centred at x = k / rho.  As rho -> 1 that
    sigmoid becomes a step, so the range is split into a fine panel covering
    the transition and a coarse panel covering the Gaussian tail.  Truncating
    at h + 14 loses < 1e-40 because of the phi(x) factor.
    """
    if rho <= -1.0 + 1e-12:
        return max(0.0, norm_sf(h) - norm_cdf(k))
    if rho >= 1.0 - 1e-12:
        return norm_sf(max(h, k))
    s = math.sqrt(1.0 - rho * rho)

    def integrand(x):
        return norm_pdf(x) * norm_sf((k - rho * x) / s)

    lo = h
    hi = max(h + 14.0, 14.0)
    centre = k / rho if abs(rho) > 1e-9 else lo
    fine_lo = max(lo, centre - 20.0 * s)
    fine_hi = min(hi, max(centre + 20.0 * s, fine_lo))
    total = 0.0
    total += _simpson(integrand, lo, fine_lo, 8000)
    total += _simpson(integrand, fine_lo, fine_hi, 8000)
    total += _simpson(integrand, fine_hi, hi, 8000)
    return total


def bvn_both_below(h, k, rho):
    """P(X < h, Y < k)."""
    return 1.0 - norm_sf(h) - norm_sf(k) + bvn_upper(h, k, rho)


# ---------------------------------------------------------------------------
# Incomplete beta, F and noncentral F
# ---------------------------------------------------------------------------

def _betacf(a, b, x):
    """Continued fraction for the incomplete beta function (modified Lentz)."""
    tiny = 1e-300
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < tiny:
        d = tiny
    d = 1.0 / d
    h = d
    for m in range(1, 400):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < tiny:
            d = tiny
        c = 1.0 + aa / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < tiny:
            d = tiny
        c = 1.0 + aa / c
        if abs(c) < tiny:
            c = tiny
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < 3e-16:
            break
    return h


def betainc(a, b, x):
    """Regularised incomplete beta I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
    front = math.exp(lbeta + a * math.log(x) + b * math.log1p(-x))
    if x < (a + 1.0) / (a + b + 2.0):
        return front * _betacf(a, b, x) / a
    return 1.0 - math.exp(
        lbeta + b * math.log1p(-x) + a * math.log(x)
    ) * _betacf(b, a, 1.0 - x) / b


def f_cdf(x, d1, d2):
    """CDF of the central F distribution."""
    if x <= 0.0:
        return 0.0
    return betainc(d1 / 2.0, d2 / 2.0, d1 * x / (d1 * x + d2))


def ncf_cdf(x, d1, d2, lam):
    """CDF of the noncentral F distribution with noncentrality lam.

    Poisson mixture of central beta CDFs:
        F(x) = sum_j exp(-lam/2) (lam/2)^j / j!  *  I_y(d1/2 + j, d2/2)
    with y = d1 x / (d1 x + d2).  Summation starts at the Poisson mode and
    walks outward so that no term underflows before the mass is collected.
    """
    if x <= 0.0:
        return 0.0
    if lam < 1e-12:
        return f_cdf(x, d1, d2)
    y = d1 * x / (d1 * x + d2)
    half = lam / 2.0
    mode = int(half)
    total = 0.0
    # upward from the mode
    log_w = -half + mode * math.log(half) - math.lgamma(mode + 1.0)
    w = math.exp(log_w)
    j = mode
    while j < mode + 100000:
        term = w * betainc(d1 / 2.0 + j, d2 / 2.0, y)
        total += term
        if w < 1e-18 and j > mode:
            break
        j += 1
        w *= half / j
    # downward from the mode
    w = math.exp(log_w)
    j = mode
    while j > 0:
        w *= j / half
        j -= 1
        term = w * betainc(d1 / 2.0 + j, d2 / 2.0, y)
        total += term
        if w < 1e-18:
            break
    return min(1.0, total)


def _invert_cdf(cdf, p, lo=1e-9, hi=1e6):
    for _ in range(300):
        mid = 0.5 * (lo + hi)
        if cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def f_ppf(p, d1, d2):
    return _invert_cdf(lambda x: f_cdf(x, d1, d2), p)


def ncf_ppf(p, d1, d2, lam):
    return _invert_cdf(lambda x: ncf_cdf(x, d1, d2, lam), p)


# ---------------------------------------------------------------------------
# Power for an R-squared increment (hierarchical regression)
# ---------------------------------------------------------------------------

def f2_from_increment(delta_r2, r2_full):
    """Cohen's f-squared for an increment: f2 = dR2 / (1 - R2_full)."""
    if not 0.0 <= r2_full < 1.0:
        raise ValueError("r2_full must be in [0, 1)")
    return delta_r2 / (1.0 - r2_full)


def power_delta_r2(n, k_total, q, delta_r2, r2_full, alpha=0.05, f2_null=0.0):
    """Power of the F-test for an R-squared increment.

    n         total sample size
    k_total   number of predictors in the FULL model
    q         number of predictors added at the tested step
    delta_r2  population increment to be detected
    r2_full   population R-squared of the full model
    alpha     one-sided type I error for the F-test
    f2_null   f-squared under the null (0 for the conventional test; set > 0
              to test against a non-zero floor such as the reliability-induced
              spurious increment)

    Noncentrality follows Cohen (1988): lambda = f2 * n.
    """
    d1 = float(q)
    d2 = float(n - k_total - 1)
    if d2 <= 0:
        return 0.0
    f2_alt = f2_from_increment(delta_r2, r2_full)
    lam_null = f2_null * n
    lam_alt = f2_alt * n
    if lam_null <= 0.0:
        crit = f_ppf(1.0 - alpha, d1, d2)
    else:
        crit = ncf_ppf(1.0 - alpha, d1, d2, lam_null)
    return 1.0 - ncf_cdf(crit, d1, d2, lam_alt)


def n_for_delta_r2(k_total, q, delta_r2, r2_full, power=0.80, alpha=0.05,
                   f2_null=0.0, n_max=200000):
    """Smallest n reaching the target power. Returns None if n_max is exceeded."""
    lo, hi = k_total + 2, k_total + 2
    while hi < n_max:
        if power_delta_r2(hi, k_total, q, delta_r2, r2_full, alpha, f2_null) >= power:
            break
        lo = hi
        hi = max(hi + 1, int(hi * 1.6))
    else:
        return None
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if power_delta_r2(mid, k_total, q, delta_r2, r2_full, alpha, f2_null) >= power:
            hi = mid
        else:
            lo = mid
    return hi


# ---------------------------------------------------------------------------
# Correlations: Fisher z power, precision, minimum detectable effect
# ---------------------------------------------------------------------------

def fisher_z(r):
    return math.atanh(r)


def n_for_correlation(r, power=0.80, alpha=0.05):
    """Sample size to reject H0: rho = 0 (two-sided) via the Fisher z test."""
    za = norm_ppf(1.0 - alpha / 2.0)
    zb = norm_ppf(power)
    return math.ceil(((za + zb) / fisher_z(r)) ** 2 + 3)


def power_correlation(n, r, alpha=0.05):
    if n <= 3:
        return 0.0
    za = norm_ppf(1.0 - alpha / 2.0)
    se = 1.0 / math.sqrt(n - 3)
    return norm_sf(za - fisher_z(r) / se) + norm_cdf(-za - fisher_z(r) / se)


def mde_correlation(n, power=0.80, alpha=0.05):
    """Minimum correlation detectable at the given n and power."""
    za = norm_ppf(1.0 - alpha / 2.0)
    zb = norm_ppf(power)
    return math.tanh((za + zb) / math.sqrt(n - 3))


def ci_correlation(r, n, level=0.95):
    """Fisher-z confidence interval for a correlation."""
    z = fisher_z(r)
    se = 1.0 / math.sqrt(n - 3)
    zc = norm_ppf(0.5 + level / 2.0)
    return math.tanh(z - zc * se), math.tanh(z + zc * se)


def n_for_ci_halfwidth(r, halfwidth, level=0.95):
    """Smallest n whose CI half-width around r is at most `halfwidth`."""
    n = 5
    while n < 500000:
        lo, hi = ci_correlation(r, n, level)
        if (hi - lo) / 2.0 <= halfwidth:
            return n
        n += 1
    return None


# ---------------------------------------------------------------------------
# Decision accuracy: Taylor-Russell style 2x2 from validity, cut, base rate
# ---------------------------------------------------------------------------

def decision_table(validity, selection_ratio, base_rate):
    """2x2 outcome table under a bivariate-normal predictor/criterion model.

    Returns dict with true/false positive/negative rates (proportions of the
    whole applicant pool), plus sensitivity, specificity, PPV, NPV.
    """
    zx = norm_ppf(1.0 - selection_ratio)   # predictor cut
    zy = norm_ppf(1.0 - base_rate)         # criterion cut ("excels")
    tp = bvn_upper(zx, zy, validity)
    fp = selection_ratio - tp
    fn = base_rate - tp
    tn = 1.0 - selection_ratio - fn
    return {
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "sensitivity": tp / base_rate,
        "specificity": tn / (1.0 - base_rate),
        "ppv": tp / selection_ratio,
        "npv": tn / (1.0 - selection_ratio),
        "base_rate": base_rate,
        "selection_ratio": selection_ratio,
        "validity": validity,
    }


def ppv_from_se_sp(sensitivity, specificity, prevalence):
    num = prevalence * sensitivity
    den = num + (1.0 - prevalence) * (1.0 - specificity)
    return num / den


def npv_from_se_sp(sensitivity, specificity, prevalence):
    num = (1.0 - prevalence) * specificity
    den = num + prevalence * (1.0 - sensitivity)
    return num / den


def specificity_for_target_ppv(target_ppv, sensitivity, prevalence):
    """Specificity required to reach a target PPV. May exceed 1 (impossible)."""
    return 1.0 - (prevalence * sensitivity * (1.0 - target_ppv)) / (
        (1.0 - prevalence) * target_ppv
    )


# ---------------------------------------------------------------------------
# Decision consistency and decision accuracy under a normal true-score model
# ---------------------------------------------------------------------------

def decision_consistency(reliability, selection_ratio):
    """P(two parallel administrations place the child on the same side of the cut).

    Observed scores standardised: X1, X2 ~ N(0,1) with corr = reliability.
    """
    c = norm_ppf(1.0 - selection_ratio)
    both_above = bvn_upper(c, c, reliability)
    both_below = bvn_both_below(c, c, reliability)
    return both_above + both_below


def decision_accuracy(reliability, selection_ratio):
    """P(observed classification == true-score classification) at the same raw cut.

    X = T + E with Var(X)=1, Var(T)=reliability; corr(X, T) = sqrt(reliability).
    The cut c applies to the raw scale, so on the standardised true score it
    sits at c / sqrt(reliability).
    """
    r = reliability
    c = norm_ppf(1.0 - selection_ratio)
    ct = c / math.sqrt(r)
    rho = math.sqrt(r)
    both_above = bvn_upper(c, ct, rho)
    both_below = bvn_both_below(c, ct, rho)
    return both_above + both_below


# ---------------------------------------------------------------------------
# Range restriction (Thorndike Case II) under top-fraction selection
# ---------------------------------------------------------------------------

def truncated_sd_ratio(selection_ratio):
    """s/S: SD of X among the top `selection_ratio` fraction, over the
    unrestricted SD.  For a normal X truncated above c:
        Var = 1 + lambda*c - lambda^2,  lambda = phi(c) / p.
    """
    c = norm_ppf(1.0 - selection_ratio)
    lam = norm_pdf(c) / selection_ratio
    var = 1.0 + lam * c - lam * lam
    return math.sqrt(var)


def restrict_correlation(rho_unrestricted, selection_ratio):
    """Observed (attenuated) correlation in a top-fraction-selected sample."""
    u = 1.0 / truncated_sd_ratio(selection_ratio)   # U = S/s > 1
    r = rho_unrestricted
    num = r / u
    den = math.sqrt(1.0 - r * r + (r * r) / (u * u))
    return num / den


def correct_correlation(r_restricted, selection_ratio):
    """Thorndike Case II correction back to the unrestricted correlation."""
    u = 1.0 / truncated_sd_ratio(selection_ratio)
    r = r_restricted
    num = r * u
    den = math.sqrt(1.0 - r * r + (r * r) * (u * u))
    return num / den


# ---------------------------------------------------------------------------
# Reliability-induced spurious increment (Westfall & Yarkoni, derived)
# ---------------------------------------------------------------------------

def spurious_delta_r2(rho_latent, rel_incumbent, rel_challenger):
    """Expected DeltaR^2 when the challenger measures NOTHING the incumbent
    does not already measure.

    Both instruments are congeneric indicators of one latent trait T with
    corr(T, criterion) = rho_latent, reliabilities r1 and r2.  Then

        DeltaR^2 = rho^2 * r2 * (1 - r1)^2 / (1 - r1 r2)

    (derivation in the report appendix).
    """
    r1, r2 = rel_incumbent, rel_challenger
    return (rho_latent ** 2) * r2 * (1.0 - r1) ** 2 / (1.0 - r1 * r2)


# ---------------------------------------------------------------------------
# Criterion-scale attenuation from using a percentile rank
# ---------------------------------------------------------------------------

def uniform_criterion_attenuation():
    """Max correlation between a normal latent criterion and its own percentile
    rank: r = sqrt(3/pi).  Using percentiles instead of normalised scores
    multiplies the attainable R^2 by 3/pi.
    """
    return math.sqrt(3.0 / math.pi)


# ---------------------------------------------------------------------------
# ROC / AUC
# ---------------------------------------------------------------------------

def auc_se_hanley(auc, n_pos, n_neg):
    """Standard error of a single AUC (Hanley & McNeil, 1982).

        Q1 = A / (2 - A),   Q2 = 2A^2 / (1 + A)
        SE = sqrt{ [A(1-A) + (n_pos-1)(Q1 - A^2) + (n_neg-1)(Q2 - A^2)]
                   / (n_pos n_neg) }
    """
    a = auc
    q1 = a / (2.0 - a)
    q2 = 2.0 * a * a / (1.0 + a)
    num = (a * (1.0 - a)
           + (n_pos - 1.0) * (q1 - a * a)
           + (n_neg - 1.0) * (q2 - a * a))
    return math.sqrt(max(num, 0.0) / (n_pos * n_neg))


def auc_ci_halfwidth(auc, n, base_rate, level=0.95):
    """Half-width of a Wald interval on a single AUC for a cohort of size n
    with the given proportion of positives."""
    n_pos = n * base_rate
    n_neg = n - n_pos
    z = norm_ppf(0.5 + level / 2.0)
    return z * auc_se_hanley(auc, n_pos, n_neg)


def se_paired_auc_diff(auc1, auc2, n, base_rate, r_auc):
    """SE of the difference between two AUCs measured on the same children.

    SE_diff = sqrt(SE1^2 + SE2^2 - 2 r SE1 SE2), where r is the correlation
    induced between the two AUC estimates by the correlation between the two
    instruments' scores (Hanley & McNeil, 1983).  r is large when the two
    instruments measure overlapping constructs, which makes the paired test far
    more efficient than comparing two independent intervals.
    """
    n_pos = n * base_rate
    n_neg = n - n_pos
    se1 = auc_se_hanley(auc1, n_pos, n_neg)
    se2 = auc_se_hanley(auc2, n_pos, n_neg)
    return math.sqrt(max(se1 * se1 + se2 * se2 - 2.0 * r_auc * se1 * se2, 0.0))


def power_paired_auc_diff(n, auc1, auc2, base_rate, r_auc, alpha=0.05):
    se = se_paired_auc_diff(auc1, auc2, n, base_rate, r_auc)
    if se <= 0.0:
        return 1.0
    delta = abs(auc1 - auc2) / se
    za = norm_ppf(1.0 - alpha / 2.0)
    return norm_sf(za - delta) + norm_cdf(-za - delta)


def n_for_paired_auc_diff(auc1, auc2, base_rate, r_auc, power=0.80, alpha=0.05,
                          n_max=2000000):
    """Cohort size needed to detect a paired AUC difference."""
    lo, hi = 10, 20
    while hi < n_max:
        if power_paired_auc_diff(hi, auc1, auc2, base_rate, r_auc, alpha) >= power:
            break
        lo = hi
        hi = int(hi * 1.6) + 1
    else:
        return None
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if power_paired_auc_diff(mid, auc1, auc2, base_rate, r_auc, alpha) >= power:
            hi = mid
        else:
            lo = mid
    return hi


# ---------------------------------------------------------------------------
# Bridge between the AUC frame and the correlation / R^2 frame
# ---------------------------------------------------------------------------

def rho_to_auc(rho, base_rate, n_grid=20000, span=9.0):
    """AUC of a continuous predictor X against a criterion dichotomised at the
    given base rate, when X and the latent criterion are bivariate normal with
    correlation rho.

    AUC = int f_pos(x) F_neg(x) dx, with
        f_pos(x) = phi(x) Phibar((c - rho x)/s) / p
        f_neg(x) = phi(x) Phi((c - rho x)/s) / (1 - p)
    evaluated on a common grid with F_neg accumulated by the trapezoid rule.
    """
    if abs(rho) < 1e-12:
        return 0.5
    p = base_rate
    c = norm_ppf(1.0 - p)
    s = math.sqrt(1.0 - rho * rho)
    step = 2.0 * span / n_grid
    f_pos = [0.0] * (n_grid + 1)
    f_neg = [0.0] * (n_grid + 1)
    for i in range(n_grid + 1):
        x = -span + i * step
        base = norm_pdf(x)
        tail = norm_sf((c - rho * x) / s)
        f_pos[i] = base * tail / p
        f_neg[i] = base * (1.0 - tail) / (1.0 - p)
    total = 0.0
    cum = 0.0            # F_neg accumulated to the current grid point
    prev_neg = f_neg[0]
    prev_term = 0.0
    for i in range(1, n_grid + 1):
        cum += 0.5 * (prev_neg + f_neg[i]) * step
        prev_neg = f_neg[i]
        term = f_pos[i] * cum
        total += 0.5 * (prev_term + term) * step
        prev_term = term
    return total


def auc_to_rho(auc, base_rate):
    """Invert rho_to_auc by bisection."""
    if auc <= 0.5:
        return 0.0
    lo, hi = 0.0, 0.999999
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if rho_to_auc(mid, base_rate) < auc:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def point_biserial(rho, base_rate):
    """Correlation with the criterion after dichotomising it at base_rate.

        r_pb = rho * phi(c) / sqrt(p(1-p))

    The factor is at most sqrt(2/pi) = 0.798, at a median split.
    """
    c = norm_ppf(1.0 - base_rate)
    return rho * norm_pdf(c) / math.sqrt(base_rate * (1.0 - base_rate))


# ---------------------------------------------------------------------------
# Comparing two dependent correlations that share one variable
# (Meng, Rosenthal & Rubin, 1992, Psychological Bulletin 111, 172-175)
# ---------------------------------------------------------------------------

def mrr_h(r1, r2, r_yz):
    """The h correction factor in the Meng-Rosenthal-Rubin z test."""
    rbar2 = (r1 * r1 + r2 * r2) / 2.0
    f = (1.0 - r_yz) / (2.0 * (1.0 - rbar2))
    f = min(f, 1.0)
    return (1.0 - f * rbar2) / (1.0 - rbar2)


def mrr_power(n, r1, r2, r_yz, alpha=0.05):
    """Power to detect a difference between two dependent correlations
    r1 = corr(X, Y) and r2 = corr(X, Z), where corr(Y, Z) = r_yz."""
    if n <= 3:
        return 0.0
    h = mrr_h(r1, r2, r_yz)
    se = math.sqrt(2.0 * (1.0 - r_yz) * h / (n - 3))
    delta = (fisher_z(r1) - fisher_z(r2)) / se
    za = norm_ppf(1.0 - alpha / 2.0)
    return norm_sf(za - delta) + norm_cdf(-za - delta)


def n_for_dependent_correlation_diff(r1, r2, r_yz, power=0.80, alpha=0.05):
    """Sample size to detect r1 != r2 for two dependent correlations."""
    h = mrr_h(r1, r2, r_yz)
    za = norm_ppf(1.0 - alpha / 2.0)
    zb = norm_ppf(power)
    dz = abs(fisher_z(r1) - fisher_z(r2))
    if dz < 1e-12:
        return None
    return math.ceil(2.0 * (1.0 - r_yz) * h * ((za + zb) / dz) ** 2 + 3)


# ---------------------------------------------------------------------------
# Haberman's subscore-value criterion (PRMSE)
# ---------------------------------------------------------------------------

def haberman_max_overlap(rel_subscore, rel_total):
    """Largest true-score correlation between a subscore and the total score at
    which the subscore still earns separate reporting.

    Haberman (2008): report the subscore only when PRMSE(subscore) exceeds
    PRMSE(total), i.e. when  rel_subscore > rho_ts^2 * rel_total.  Solving for
    rho_ts gives the ceiling returned here (capped at 1).
    """
    if rel_total <= 0.0:
        return 1.0
    val = rel_subscore / rel_total
    return 1.0 if val >= 1.0 else math.sqrt(val)


def haberman_incremental_ceiling(rel_sub, rel_total, rho_true):
    """Hard upper bound on the incremental validity a subscore can have.

    Haberman (2008): the incremental validity of a subscore over the total
    score -- the difference in R^2 between predicting from total-plus-subscore
    and from total alone -- "is no greater than the reliability of the residual
    from linear prediction of the subscore by the total score."

    With S and X standardised, reliabilities rel_sub and rel_total, and true
    scores correlating rho_true, that residual reliability is

        rel_sub * (1 - rho^2 * rel_total * (2 - rel_total))
        -------------------------------------------------- .
                  1 - rho^2 * rel_sub * rel_total

    At rho = 0 it reduces to rel_sub: an orthogonal subscore can add at most
    its own reliability.
    """
    r_s, r_x, rho = rel_sub, rel_total, rho_true
    numer = r_s * (1.0 - rho * rho * r_x * (2.0 - r_x))
    denom = 1.0 - rho * rho * r_s * r_x
    return numer / denom


def attenuated_increment(true_delta_r2, rel_predictor):
    """A true R^2 increment shrinks in proportion to the added predictor's
    reliability: DeltaR^2_observed = rel * DeltaR^2_true."""
    return rel_predictor * true_delta_r2


# ---------------------------------------------------------------------------
# Confounding sensitivity (E-value style) for criterion contamination
# ---------------------------------------------------------------------------

def confound_symmetric_threshold(observed_r):
    """If a confounder C inflates corr(X, Y) by rho_xc * rho_cy, the symmetric
    value rho_xc = rho_cy that would explain the whole observed correlation."""
    return math.sqrt(abs(observed_r))


def confound_required_path(observed_r, rho_xc):
    """Given rho_xc, the rho_cy needed to explain the whole observed r."""
    if rho_xc <= 0.0:
        return float("inf")
    return observed_r / rho_xc


# ---------------------------------------------------------------------------
# Comparing two independent proportions
# ---------------------------------------------------------------------------

def n_for_two_proportions(p1, p2, power=0.80, alpha=0.05):
    """Per-group sample size to detect a difference between two independent
    proportions (normal approximation with a pooled null variance):

        n = [ z_a sqrt(2 pbar qbar) + z_b sqrt(p1 q1 + p2 q2) ]^2 / (p1 - p2)^2
    """
    if abs(p1 - p2) < 1e-12:
        return None
    pbar = (p1 + p2) / 2.0
    za = norm_ppf(1.0 - alpha / 2.0)
    zb = norm_ppf(power)
    a = za * math.sqrt(2.0 * pbar * (1.0 - pbar))
    b = zb * math.sqrt(p1 * (1.0 - p1) + p2 * (1.0 - p2))
    return int(math.ceil((a + b) ** 2 / (p1 - p2) ** 2))


# ---------------------------------------------------------------------------
# Clustering
# ---------------------------------------------------------------------------

def design_effect(cluster_size, icc):
    return 1.0 + (cluster_size - 1.0) * icc


def effective_n(n, cluster_size, icc):
    return n / design_effect(cluster_size, icc)
