"""Dependency-free psychometric primitives (Python 3.9+ stdlib only).

This module implements the statistical machinery the validation harness needs
without any third-party dependency (no numpy / scipy / pandas), so the pipeline
runs end-to-end anywhere Python 3 is installed. Every routine is written to be
STRUCTURE-AGNOSTIC: it operates on plain numeric vectors / matrices and never
assumes anything about how a test was administered (adaptive, fixed-form,
two-stage, etc.).

Nothing here touches real data. All inputs are supplied by the caller; the
born-synthetic guarantee is enforced upstream in ``dataio``.

Contents
--------
- Descriptive stats: mean / variance / stdev / skew / quantile / describe
- Distributions: normal CDF/PPF, chi-square SF, Student-t SF, F SF
  (via the regularized incomplete gamma and incomplete beta functions)
- Correlation: Pearson (+ Fisher-z CI), Spearman
- Reliability: Cronbach's alpha, split-half (Spearman-Brown), SEM
- Regression: OLS (with std. errors + standardized betas) and nested-model
  incremental validity (Delta R-squared F-test)
- Logistic regression (IRLS) with likelihood-ratio machinery
- Mantel-Haenszel DIF (common odds ratio, chi-square, ETS Delta classification)
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence, Tuple

Number = float
Vector = Sequence[float]
Matrix = Sequence[Sequence[float]]


# ---------------------------------------------------------------------------
# Descriptive statistics
# ---------------------------------------------------------------------------

def mean(x: Vector) -> float:
    n = len(x)
    if n == 0:
        raise ValueError("mean() of empty sequence")
    return sum(x) / n


def variance(x: Vector, ddof: int = 1) -> float:
    n = len(x)
    if n - ddof <= 0:
        return float("nan")
    m = mean(x)
    return sum((xi - m) ** 2 for xi in x) / (n - ddof)


def stdev(x: Vector, ddof: int = 1) -> float:
    v = variance(x, ddof)
    return math.sqrt(v) if v == v and v >= 0 else float("nan")


def skewness(x: Vector) -> float:
    """Fisher-Pearson sample skewness (population-moment form)."""
    n = len(x)
    if n < 3:
        return float("nan")
    m = mean(x)
    m2 = sum((xi - m) ** 2 for xi in x) / n
    m3 = sum((xi - m) ** 3 for xi in x) / n
    if m2 <= 0:
        return 0.0
    return m3 / (m2 ** 1.5)


def quantile(x: Vector, q: float) -> float:
    """Linear-interpolation quantile (same convention as numpy default, type 7).

    ``q`` is a proportion in [0, 1].
    """
    if not x:
        raise ValueError("quantile() of empty sequence")
    if q <= 0:
        return float(min(x))
    if q >= 1:
        return float(max(x))
    s = sorted(x)
    idx = q * (len(s) - 1)
    lo = int(math.floor(idx))
    hi = int(math.ceil(idx))
    if lo == hi:
        return float(s[lo])
    frac = idx - lo
    return float(s[lo] * (1 - frac) + s[hi] * frac)


def percentile_of(x: Vector, value: float) -> float:
    """Percentile rank (0-100) of ``value`` within ``x`` (<= convention)."""
    if not x:
        return float("nan")
    below = sum(1 for xi in x if xi <= value)
    return 100.0 * below / len(x)


def describe(x: Vector) -> Dict[str, float]:
    s = sorted(x)
    return {
        "n": len(x),
        "mean": mean(x),
        "sd": stdev(x),
        "min": float(s[0]),
        "p25": quantile(s, 0.25),
        "median": quantile(s, 0.50),
        "p75": quantile(s, 0.75),
        "max": float(s[-1]),
        "skew": skewness(x),
    }


# ---------------------------------------------------------------------------
# Special functions (regularized incomplete gamma / beta) -> distributions
# ---------------------------------------------------------------------------

_ITMAX = 300
_EPS = 3.0e-12
_FPMIN = 1.0e-300


def _gammp(a: float, x: float) -> float:
    """Regularized lower incomplete gamma P(a, x)."""
    if x < 0 or a <= 0:
        raise ValueError("invalid arguments to _gammp")
    if x == 0:
        return 0.0
    if x < a + 1.0:
        # series representation
        ap = a
        total = 1.0 / a
        delta = total
        for _ in range(_ITMAX):
            ap += 1.0
            delta *= x / ap
            total += delta
            if abs(delta) < abs(total) * _EPS:
                break
        return total * math.exp(-x + a * math.log(x) - math.lgamma(a))
    # continued fraction for Q, then P = 1 - Q
    return 1.0 - _gammq(a, x)


def _gammq(a: float, x: float) -> float:
    """Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x)."""
    if x < 0 or a <= 0:
        raise ValueError("invalid arguments to _gammq")
    if x == 0:
        return 1.0
    if x < a + 1.0:
        return 1.0 - _gammp(a, x)
    # Lentz's continued fraction
    b = x + 1.0 - a
    c = 1.0 / _FPMIN
    d = 1.0 / b
    h = d
    for i in range(1, _ITMAX + 1):
        an = -i * (i - a)
        b += 2.0
        d = an * d + b
        if abs(d) < _FPMIN:
            d = _FPMIN
        c = b + an / c
        if abs(c) < _FPMIN:
            c = _FPMIN
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < _EPS:
            break
    return math.exp(-x + a * math.log(x) - math.lgamma(a)) * h


def _betacf(a: float, b: float, x: float) -> float:
    qab = a + b
    qap = a + 1.0
    qam = a - 1.0
    c = 1.0
    d = 1.0 - qab * x / qap
    if abs(d) < _FPMIN:
        d = _FPMIN
    d = 1.0 / d
    h = d
    for m in range(1, _ITMAX + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        if abs(d) < _FPMIN:
            d = _FPMIN
        c = 1.0 + aa / c
        if abs(c) < _FPMIN:
            c = _FPMIN
        d = 1.0 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        if abs(d) < _FPMIN:
            d = _FPMIN
        c = 1.0 + aa / c
        if abs(c) < _FPMIN:
            c = _FPMIN
        d = 1.0 / d
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < _EPS:
            break
    return h


def _betai(a: float, b: float, x: float) -> float:
    """Regularized incomplete beta I_x(a, b)."""
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0
    lbeta = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
    bt = math.exp(lbeta + a * math.log(x) + b * math.log(1.0 - x))
    if x < (a + 1.0) / (a + b + 2.0):
        return bt * _betacf(a, b, x) / a
    return 1.0 - bt * _betacf(b, a, 1.0 - x) / b


def norm_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def norm_ppf(p: float) -> float:
    """Inverse standard-normal CDF (Acklam's rational approximation)."""
    if p <= 0.0:
        return float("-inf")
    if p >= 1.0:
        return float("inf")
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    plow = 0.02425
    phigh = 1 - plow
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
               ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    if p <= phigh:
        q = p - 0.5
        r = q * q
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / \
               (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    q = math.sqrt(-2 * math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / \
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)


def chi2_sf(x: float, df: int) -> float:
    """Upper-tail (survival) probability of the chi-square distribution."""
    if x <= 0:
        return 1.0
    return _gammq(df / 2.0, x / 2.0)


def t_sf(t: float, df: float) -> float:
    """Upper-tail probability P(T > t) for Student's t."""
    x = df / (df + t * t)
    ib = 0.5 * _betai(df / 2.0, 0.5, x)
    return ib if t > 0 else 1.0 - ib


def t_two_sided_p(t: float, df: float) -> float:
    return 2.0 * t_sf(abs(t), df)


def f_sf(f: float, df1: float, df2: float) -> float:
    """Upper-tail probability P(F > f)."""
    if f <= 0:
        return 1.0
    x = df2 / (df2 + df1 * f)
    return _betai(df2 / 2.0, df1 / 2.0, x)


# ---------------------------------------------------------------------------
# Correlation
# ---------------------------------------------------------------------------

def pearson(x: Vector, y: Vector) -> Tuple[float, int]:
    if len(x) != len(y):
        raise ValueError("pearson: length mismatch")
    n = len(x)
    if n < 2:
        return float("nan"), n
    mx, my = mean(x), mean(y)
    sxy = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
    sxx = sum((xi - mx) ** 2 for xi in x)
    syy = sum((yi - my) ** 2 for yi in y)
    if sxx <= 0 or syy <= 0:
        return float("nan"), n
    return sxy / math.sqrt(sxx * syy), n


def pearson_p(r: float, n: int) -> float:
    if n < 3 or r != r or abs(r) >= 1.0:
        return float("nan")
    t = r * math.sqrt((n - 2) / (1.0 - r * r))
    return t_two_sided_p(t, n - 2)


def fisher_ci(r: float, n: int, alpha: float = 0.05) -> Tuple[float, float]:
    if n < 4 or r != r or abs(r) >= 1.0:
        return float("nan"), float("nan")
    z = 0.5 * math.log((1 + r) / (1 - r))
    se = 1.0 / math.sqrt(n - 3)
    crit = norm_ppf(1 - alpha / 2.0)
    lo, hi = z - crit * se, z + crit * se
    return math.tanh(lo), math.tanh(hi)


def rankdata(x: Vector) -> List[float]:
    """Average ranks (ties get the mean of the ranks they span)."""
    order = sorted(range(len(x)), key=lambda i: x[i])
    ranks = [0.0] * len(x)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and x[order[j + 1]] == x[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0  # 1-based average rank
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def spearman(x: Vector, y: Vector) -> Tuple[float, int]:
    return pearson(rankdata(x), rankdata(y))


# ---------------------------------------------------------------------------
# Reliability
# ---------------------------------------------------------------------------

def cronbach_alpha(item_matrix: Matrix) -> Dict[str, float]:
    """Cronbach's alpha for an (n_persons x k_items) score matrix."""
    n = len(item_matrix)
    if n < 2:
        return {"alpha": float("nan"), "k_items": 0, "n_persons": n}
    k = len(item_matrix[0])
    if k < 2:
        return {"alpha": float("nan"), "k_items": k, "n_persons": n}
    columns = list(zip(*item_matrix))
    item_var_sum = sum(variance(col) for col in columns)
    totals = [sum(row) for row in item_matrix]
    total_var = variance(totals)
    if total_var <= 0:
        return {"alpha": float("nan"), "k_items": k, "n_persons": n,
                "total_var": total_var, "item_var_sum": item_var_sum}
    alpha = (k / (k - 1.0)) * (1.0 - item_var_sum / total_var)
    return {
        "alpha": alpha,
        "k_items": k,
        "n_persons": n,
        "total_var": total_var,
        "item_var_sum": item_var_sum,
        "sd_total": math.sqrt(total_var),
        "sem": math.sqrt(total_var) * math.sqrt(max(0.0, 1.0 - alpha)),
    }


def split_half(item_matrix: Matrix) -> Dict[str, float]:
    """Odd/even split-half reliability with Spearman-Brown correction."""
    n = len(item_matrix)
    if n < 2 or len(item_matrix[0]) < 2:
        return {"r_halves": float("nan"), "spearman_brown": float("nan")}
    odd = [sum(row[0::2]) for row in item_matrix]
    even = [sum(row[1::2]) for row in item_matrix]
    r, _ = pearson(odd, even)
    if r != r or (1 + r) == 0:
        return {"r_halves": r, "spearman_brown": float("nan")}
    sb = (2 * r) / (1 + r)
    return {"r_halves": r, "spearman_brown": sb}


# ---------------------------------------------------------------------------
# Linear algebra helpers (small dense matrices)
# ---------------------------------------------------------------------------

def _matmul(A: Matrix, B: Matrix) -> List[List[float]]:
    bt = list(zip(*B))
    return [[sum(a * b for a, b in zip(row, col)) for col in bt] for row in A]


def _matvec(A: Matrix, v: Vector) -> List[float]:
    return [sum(a * vi for a, vi in zip(row, v)) for row in A]


def _transpose(A: Matrix) -> List[List[float]]:
    return [list(col) for col in zip(*A)]


def _inverse(A: Matrix) -> List[List[float]]:
    """Gauss-Jordan inverse with partial pivoting."""
    n = len(A)
    M = [list(map(float, row)) + [1.0 if i == j else 0.0 for j in range(n)]
         for i, row in enumerate(A)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(M[r][col]))
        if abs(M[pivot][col]) < 1e-15:
            raise ValueError("singular matrix")
        M[col], M[pivot] = M[pivot], M[col]
        piv = M[col][col]
        M[col] = [v / piv for v in M[col]]
        for r in range(n):
            if r != col and M[r][col] != 0.0:
                factor = M[r][col]
                M[r] = [a - factor * b for a, b in zip(M[r], M[col])]
    return [row[n:] for row in M]


def _solve(A: Matrix, b: Vector) -> List[float]:
    return _matvec(_inverse(A), b)


# ---------------------------------------------------------------------------
# Ordinary least squares regression
# ---------------------------------------------------------------------------

def ols(y: Vector, X: Matrix, predictor_names: Optional[List[str]] = None) -> Dict:
    """Ordinary least squares with an added intercept.

    ``X`` rows are predictor vectors WITHOUT an intercept column (added here).
    Returns coefficients, std errors, t/p, R^2, adjusted R^2, and standardized
    betas for the (non-intercept) predictors.
    """
    n = len(y)
    kx = len(X[0]) if X and X[0] else 0
    Xd = [[1.0] + list(row) for row in X]  # design matrix with intercept
    p = kx + 1
    if n <= p:
        raise ValueError("ols: not enough observations for the model")
    Xt = _transpose(Xd)
    XtX = _matmul(Xt, Xd)
    XtX_inv = _inverse(XtX)
    Xty = _matvec(Xt, y)
    beta = _matvec(XtX_inv, Xty)
    fitted = _matvec(Xd, beta)
    resid = [yi - fi for yi, fi in zip(y, fitted)]
    rss = sum(e * e for e in resid)
    my = mean(y)
    tss = sum((yi - my) ** 2 for yi in y)
    r2 = 1.0 - rss / tss if tss > 0 else float("nan")
    adj_r2 = 1.0 - (rss / (n - p)) / (tss / (n - 1)) if tss > 0 else float("nan")
    sigma2 = rss / (n - p)
    se = [math.sqrt(max(0.0, sigma2 * XtX_inv[i][i])) for i in range(p)]
    tvals = [beta[i] / se[i] if se[i] > 0 else float("nan") for i in range(p)]
    pvals = [t_two_sided_p(tvals[i], n - p) if tvals[i] == tvals[i] else float("nan")
             for i in range(p)]
    sd_y = stdev(y)
    std_beta = [float("nan")]
    for j in range(kx):
        col = [row[j] for row in X]
        sdx = stdev(col)
        std_beta.append(beta[j + 1] * sdx / sd_y if sd_y > 0 else float("nan"))
    names = ["(intercept)"] + (predictor_names or [f"x{j+1}" for j in range(kx)])
    return {
        "n": n,
        "p": p,
        "names": names,
        "beta": beta,
        "se": se,
        "t": tvals,
        "p_values": pvals,
        "std_beta": std_beta,
        "r2": r2,
        "adj_r2": adj_r2,
        "rss": rss,
        "tss": tss,
        "sigma2": sigma2,
    }


def incremental_validity(y: Vector, base: Matrix, added: Matrix,
                         base_names: Optional[List[str]] = None,
                         added_names: Optional[List[str]] = None) -> Dict:
    """Hierarchical Delta R-squared test: does ``added`` improve prediction of
    ``y`` beyond ``base``?  Returns both model fits and the nested F-test.
    """
    full = [list(b) + list(a) for b, a in zip(base, added)]
    base_fit = ols(y, base, base_names)
    full_fit = ols(y, full, (base_names or []) + (added_names or []))
    q = len(added[0]) if added and added[0] else 0
    n = len(y)
    df2 = n - full_fit["p"]
    dr2 = full_fit["r2"] - base_fit["r2"]
    if q == 0 or df2 <= 0 or (1.0 - full_fit["r2"]) <= 0:
        f_stat = float("nan")
        p_val = float("nan")
    else:
        f_stat = (dr2 / q) / ((1.0 - full_fit["r2"]) / df2)
        p_val = f_sf(f_stat, q, df2)
    return {
        "base": base_fit,
        "full": full_fit,
        "delta_r2": dr2,
        "df1": q,
        "df2": df2,
        "f": f_stat,
        "p_value": p_val,
        "added_names": added_names or [],
    }


# ---------------------------------------------------------------------------
# Logistic regression (IRLS / Fisher scoring)
# ---------------------------------------------------------------------------

def _sigmoid(z: float) -> float:
    if z >= 0:
        ez = math.exp(-z)
        return 1.0 / (1.0 + ez)
    ez = math.exp(z)
    return ez / (1.0 + ez)


def logistic_regression(y: Vector, X: Matrix,
                        predictor_names: Optional[List[str]] = None,
                        max_iter: int = 50, tol: float = 1e-8,
                        ridge: float = 1e-8) -> Dict:
    """Binary logistic regression via iteratively reweighted least squares.

    ``X`` rows are predictor vectors WITHOUT an intercept (added here). A tiny
    ridge term stabilizes the Hessian against separation/collinearity.
    """
    n = len(y)
    kx = len(X[0]) if X and X[0] else 0
    Xd = [[1.0] + list(row) for row in X]
    p = kx + 1
    beta = [0.0] * p
    converged = False
    iters = 0
    for iters in range(1, max_iter + 1):
        eta = _matvec(Xd, beta)
        mu = [_sigmoid(e) for e in eta]
        w = [max(mi * (1.0 - mi), 1e-9) for mi in mu]
        # Build X' W X (+ ridge) and X' (y - mu)
        XtWX = [[0.0] * p for _ in range(p)]
        grad = [0.0] * p
        for i in range(n):
            xi = Xd[i]
            wi = w[i]
            resid = y[i] - mu[i]
            for a in range(p):
                grad[a] += xi[a] * resid
                xa_w = xi[a] * wi
                for b in range(a, p):
                    XtWX[a][b] += xa_w * xi[b]
        for a in range(p):
            for b in range(a + 1, p):
                XtWX[b][a] = XtWX[a][b]
            XtWX[a][a] += ridge
        try:
            delta = _solve(XtWX, grad)
        except ValueError:
            break
        beta = [beta[a] + delta[a] for a in range(p)]
        if max(abs(d) for d in delta) < tol:
            converged = True
            break
    eta = _matvec(Xd, beta)
    mu = [min(max(_sigmoid(e), 1e-12), 1 - 1e-12) for e in eta]
    loglik = sum(y[i] * math.log(mu[i]) + (1 - y[i]) * math.log(1 - mu[i])
                 for i in range(n))
    # covariance = inverse of X' W X at the solution
    w = [max(mi * (1.0 - mi), 1e-9) for mi in mu]
    XtWX = [[0.0] * p for _ in range(p)]
    for i in range(n):
        xi = Xd[i]
        wi = w[i]
        for a in range(p):
            xa_w = xi[a] * wi
            for b in range(p):
                XtWX[a][b] += xa_w * xi[b]
    for a in range(p):
        XtWX[a][a] += ridge
    try:
        cov = _inverse(XtWX)
        se = [math.sqrt(max(0.0, cov[i][i])) for i in range(p)]
    except ValueError:
        se = [float("nan")] * p
    zvals = [beta[i] / se[i] if se[i] and se[i] > 0 else float("nan") for i in range(p)]
    pvals = [2.0 * (1.0 - norm_cdf(abs(z))) if z == z else float("nan") for z in zvals]
    names = ["(intercept)"] + (predictor_names or [f"x{j+1}" for j in range(kx)])
    return {
        "n": n,
        "p": p,
        "names": names,
        "beta": beta,
        "se": se,
        "z": zvals,
        "p_values": pvals,
        "loglik": loglik,
        "converged": converged,
        "iterations": iters,
    }


def _null_loglik(y: Vector) -> float:
    n = len(y)
    p1 = min(max(mean(y), 1e-12), 1 - 1e-12)
    k1 = sum(y)
    return k1 * math.log(p1) + (n - k1) * math.log(1 - p1)


def nagelkerke_r2(ll_full: float, y: Vector) -> float:
    n = len(y)
    ll0 = _null_loglik(y)
    cox_snell = 1.0 - math.exp((2.0 / n) * (ll0 - ll_full))
    denom = 1.0 - math.exp((2.0 / n) * ll0)
    return cox_snell / denom if denom > 0 else float("nan")


def lr_test(ll_restricted: float, ll_full: float, df: int) -> Dict[str, float]:
    stat = 2.0 * (ll_full - ll_restricted)
    stat = max(stat, 0.0)
    return {"chi2": stat, "df": df, "p_value": chi2_sf(stat, df)}


# ---------------------------------------------------------------------------
# Mantel-Haenszel DIF
# ---------------------------------------------------------------------------

def mantel_haenszel(item: Vector, focal: Sequence[bool], match: Vector,
                    min_stratum: int = 2) -> Dict:
    """Mantel-Haenszel DIF statistic for one item.

    Parameters
    ----------
    item   : 0/1 item responses.
    focal  : True for focal group, False for reference group.
    match  : matching variable (typically total score); observations are
             stratified on its exact integer value.
    """
    strata: Dict[float, List[int]] = {}
    for i in range(len(item)):
        strata.setdefault(match[i], []).append(i)

    sum_r = 0.0
    sum_s = 0.0
    sum_a = 0.0
    sum_ea = 0.0
    sum_va = 0.0
    strata_used = 0
    n_used = 0
    for _key, idxs in strata.items():
        a = b = c = d = 0
        for i in idxs:
            correct = item[i] >= 0.5
            if focal[i]:
                if correct:
                    a += 1
                else:
                    b += 1
            else:
                if correct:
                    c += 1
                else:
                    d += 1
        nk = a + b + c + d
        if nk < min_stratum or nk < 2:
            continue
        row1 = a + b
        row2 = c + d
        col1 = a + c
        col2 = b + d
        if row1 == 0 or row2 == 0 or col1 == 0 or col2 == 0:
            # no information from this stratum for the association
            continue
        strata_used += 1
        n_used += nk
        sum_r += (a * d) / nk
        sum_s += (b * c) / nk
        sum_a += a
        sum_ea += row1 * col1 / nk
        sum_va += (row1 * row2 * col1 * col2) / (nk * nk * (nk - 1))

    if sum_s <= 0 or sum_va <= 0:
        return {
            "alpha_mh": float("nan"),
            "log_alpha": float("nan"),
            "chi2": float("nan"),
            "p_value": float("nan"),
            "delta": float("nan"),
            "ets_class": "NA",
            "strata_used": strata_used,
            "n_used": n_used,
        }
    alpha_mh = sum_r / sum_s
    chi2 = (abs(sum_a - sum_ea) - 0.5) ** 2 / sum_va
    chi2 = max(chi2, 0.0)
    p_value = chi2_sf(chi2, 1)
    delta = -2.35 * math.log(alpha_mh) if alpha_mh > 0 else float("nan")
    ets = _ets_class(delta, p_value)
    return {
        "alpha_mh": alpha_mh,
        "log_alpha": math.log(alpha_mh) if alpha_mh > 0 else float("nan"),
        "chi2": chi2,
        "p_value": p_value,
        "delta": delta,
        "ets_class": ets,
        "strata_used": strata_used,
        "n_used": n_used,
    }


def _ets_class(delta: float, p_value: float) -> str:
    """ETS A/B/C DIF classification.

    A = negligible; B = moderate; C = large. Convention: an item is 'A' when the
    MH test is non-significant OR |Delta| < 1.0; 'C' when |Delta| >= 1.5 and
    significant; otherwise 'B'.
    """
    if delta != delta:
        return "NA"
    sig = p_value < 0.05
    if (not sig) or abs(delta) < 1.0:
        return "A"
    if abs(delta) >= 1.5 and sig:
        return "C"
    return "B"
