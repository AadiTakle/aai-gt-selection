"""Statistics used by the figures, implemented in numpy only.

No scipy, statsmodels or scikit-learn. Every estimator here is short enough to read,
which is the point: a reviewer who distrusts a number on a figure can check the
arithmetic that produced it without trusting a third-party implementation as well.

Contents:
  - ROC, AUC, and a paired bootstrap confidence interval for an AUC and for an AUC
    difference (paired because the same children are scored by both instruments)
  - precision-recall and average precision
  - logistic regression by iteratively reweighted least squares, with ridge
  - ordinary least squares R^2 and incremental R^2
  - Cohen's kappa, and a calibration curve
  - the Thorndike Case II range-restriction correction, and its documented failure mode
  - positive predictive value as a function of base rate
"""

from __future__ import annotations

import math

import numpy as np


# ---------------------------------------------------------------------------
# ROC / AUC
# ---------------------------------------------------------------------------


def roc_curve(score: np.ndarray, positive: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """False-positive and true-positive rates over every distinct threshold."""
    score = np.asarray(score, dtype=float)
    positive = np.asarray(positive, dtype=bool)
    order = np.argsort(-score, kind="stable")
    y = positive[order]
    tps = np.cumsum(y)
    fps = np.cumsum(~y)
    n_pos, n_neg = tps[-1], fps[-1]
    if n_pos == 0 or n_neg == 0:
        raise ValueError("ROC needs both classes present")
    # Collapse tied scores onto a single operating point.
    s = score[order]
    keep = np.r_[np.diff(s) != 0, True]
    tpr = np.r_[0.0, tps[keep] / n_pos]
    fpr = np.r_[0.0, fps[keep] / n_neg]
    return fpr, tpr


def auc(score: np.ndarray, positive: np.ndarray) -> float:
    """Area under the ROC curve, as the Mann-Whitney U statistic with tie correction.

    Equivalent to P(score of a random positive > score of a random negative) plus half
    the probability of a tie, which is the interpretation the figures state.
    """
    score = np.asarray(score, dtype=float)
    positive = np.asarray(positive, dtype=bool)
    ranks = _average_ranks(score)
    n_pos = int(positive.sum())
    n_neg = int((~positive).sum())
    if n_pos == 0 or n_neg == 0:
        raise ValueError("AUC needs both classes present")
    return (ranks[positive].sum() - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg)


def _average_ranks(x: np.ndarray) -> np.ndarray:
    """Ranks with ties averaged, vectorised (called inside every bootstrap loop)."""
    n = len(x)
    order = np.argsort(x, kind="stable")
    sorted_x = x[order]
    starts = np.r_[0, np.flatnonzero(np.diff(sorted_x) != 0) + 1]
    ends = np.r_[starts[1:], n]
    group_mean_rank = (starts + ends + 1) / 2.0
    ranks_sorted = np.repeat(group_mean_rank, ends - starts)
    ranks = np.empty(n, dtype=float)
    ranks[order] = ranks_sorted
    return ranks


def bootstrap_auc_ci(
    score: np.ndarray,
    positive: np.ndarray,
    n_boot: int,
    seed: int,
    alpha: float = 0.05,
) -> tuple[float, float, float]:
    """Percentile bootstrap CI for one AUC. Returns (auc, lo, hi)."""
    rng = np.random.default_rng(seed)
    n = len(score)
    point = auc(score, positive)
    draws = np.empty(n_boot)
    for b in range(n_boot):
        idx = rng.integers(0, n, n)
        p = positive[idx]
        if p.all() or not p.any():
            draws[b] = np.nan
            continue
        draws[b] = auc(score[idx], p)
    draws = draws[~np.isnan(draws)]
    return point, float(np.quantile(draws, alpha / 2)), float(np.quantile(draws, 1 - alpha / 2))


def bootstrap_auc_difference_ci(
    score_a: np.ndarray,
    score_b: np.ndarray,
    positive: np.ndarray,
    n_boot: int,
    seed: int,
    alpha: float = 0.05,
) -> tuple[float, float, float]:
    """PAIRED percentile bootstrap CI for AUC(a) - AUC(b).

    Paired because both instruments score the same children, so the two AUCs are
    correlated and an unpaired interval would be far too wide. This is the resampling
    analogue of DeLong's test.
    """
    rng = np.random.default_rng(seed)
    n = len(score_a)
    point = auc(score_a, positive) - auc(score_b, positive)
    draws = np.empty(n_boot)
    for b in range(n_boot):
        idx = rng.integers(0, n, n)
        p = positive[idx]
        if p.all() or not p.any():
            draws[b] = np.nan
            continue
        draws[b] = auc(score_a[idx], p) - auc(score_b[idx], p)
    draws = draws[~np.isnan(draws)]
    return point, float(np.quantile(draws, alpha / 2)), float(np.quantile(draws, 1 - alpha / 2))


def precision_recall_curve(score: np.ndarray, positive: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    order = np.argsort(-np.asarray(score, dtype=float), kind="stable")
    y = np.asarray(positive, dtype=bool)[order]
    tps = np.cumsum(y)
    k = np.arange(1, len(y) + 1)
    precision = tps / k
    recall = tps / max(int(y.sum()), 1)
    return recall, precision


def average_precision(score: np.ndarray, positive: np.ndarray) -> float:
    """Average precision: sum over recall steps of precision at that step.

    Not a trapezoid over the PR curve; PR curves are non-monotone and linear
    interpolation between their points is invalid.
    """
    recall, precision = precision_recall_curve(score, positive)
    d_recall = np.diff(np.r_[0.0, recall])
    return float(np.sum(d_recall * precision))


# ---------------------------------------------------------------------------
# Regression
# ---------------------------------------------------------------------------


def ols_r2(x: np.ndarray, y: np.ndarray) -> float:
    """R^2 of `y` regressed on the columns of `x` (intercept added automatically)."""
    x = np.atleast_2d(np.asarray(x, dtype=float))
    if x.shape[0] != len(y):
        x = x.T
    design = np.column_stack([np.ones(len(y)), x])
    beta, *_ = np.linalg.lstsq(design, y, rcond=None)
    resid = y - design @ beta
    ss_res = float(resid @ resid)
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    return 1.0 - ss_res / ss_tot


def bootstrap_r2_ci(
    x: np.ndarray, y: np.ndarray, n_boot: int, seed: int, alpha: float = 0.05
) -> tuple[float, float, float]:
    rng = np.random.default_rng(seed)
    x = np.atleast_2d(np.asarray(x, dtype=float))
    if x.shape[0] != len(y):
        x = x.T
    n = len(y)
    point = ols_r2(x, y)
    draws = np.empty(n_boot)
    for b in range(n_boot):
        idx = rng.integers(0, n, n)
        draws[b] = ols_r2(x[idx], y[idx])
    return point, float(np.quantile(draws, alpha / 2)), float(np.quantile(draws, 1 - alpha / 2))


def logistic_fit(x: np.ndarray, y: np.ndarray, ridge: float = 1e-4, iterations: int = 60) -> np.ndarray:
    """Logistic regression by iteratively reweighted least squares.

    A small ridge penalty is always on. It exists to keep the fit finite when a
    predictor separates the outcome perfectly -- which happens here, because the
    officer's reading gate is a hard rule and any rule that includes reading percentile
    can reproduce part of it exactly. Without the penalty those coefficients diverge and
    the fitted probabilities become uninterpretable rather than merely confident.
    """
    x = np.atleast_2d(np.asarray(x, dtype=float))
    if x.shape[0] != len(y):
        x = x.T
    design = np.column_stack([np.ones(len(y)), x])
    y = np.asarray(y, dtype=float)
    beta = np.zeros(design.shape[1])
    penalty = ridge * np.eye(design.shape[1])
    penalty[0, 0] = 0.0  # never penalise the intercept
    for _ in range(iterations):
        eta = design @ beta
        p = 1.0 / (1.0 + np.exp(-np.clip(eta, -30, 30)))
        w = np.clip(p * (1 - p), 1e-8, None)
        gradient = design.T @ (y - p) - penalty @ beta
        hessian = design.T @ (design * w[:, None]) + penalty
        step = np.linalg.solve(hessian, gradient)
        beta = beta + step
        if np.max(np.abs(step)) < 1e-10:
            break
    return beta


def crossfit_logistic(x: np.ndarray, y: np.ndarray, folds: int = 5, seed: int = 0) -> np.ndarray:
    """Out-of-fold predicted probabilities.

    A rule scored on the same children it was fitted to will always look better than it
    is. Every rule in these figures that is EVALUATED against an outcome is cross-fitted,
    so the number on the panel is the number a held-out child would have seen.
    """
    x = np.atleast_2d(np.asarray(x, dtype=float))
    if x.shape[0] != len(y):
        x = x.T
    rng = np.random.default_rng(seed)
    assignment = rng.permutation(np.arange(len(y)) % folds)
    out = np.empty(len(y), dtype=float)
    for f in range(folds):
        test = assignment == f
        beta = logistic_fit(x[~test], y[~test])
        out[test] = logistic_predict(beta, x[test])
    return out


def logistic_predict(beta: np.ndarray, x: np.ndarray) -> np.ndarray:
    x = np.atleast_2d(np.asarray(x, dtype=float))
    if x.shape[1] != beta.shape[0] - 1:
        x = x.T
    design = np.column_stack([np.ones(x.shape[0]), x])
    return 1.0 / (1.0 + np.exp(-np.clip(design @ beta, -30, 30)))


# ---------------------------------------------------------------------------
# Agreement and calibration
# ---------------------------------------------------------------------------


def cohens_kappa(a: np.ndarray, b: np.ndarray) -> float:
    """Cohen's kappa for two binary decisions on the same cases.

    Reported instead of raw agreement because raw agreement is inflated whenever the
    admit rate is far from 50%: a rule that admitted nobody would agree with an officer
    who admits 15% on 85% of files.
    """
    a = np.asarray(a, dtype=bool)
    b = np.asarray(b, dtype=bool)
    observed = float(np.mean(a == b))
    pa, pb = float(a.mean()), float(b.mean())
    expected = pa * pb + (1 - pa) * (1 - pb)
    return (observed - expected) / (1 - expected)


def calibration_curve(
    predicted: np.ndarray, observed: np.ndarray, n_bins: int = 10
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Equal-count bins. Returns (mean predicted, observed rate, bin count)."""
    predicted = np.asarray(predicted, dtype=float)
    observed = np.asarray(observed, dtype=float)
    order = np.argsort(predicted, kind="stable")
    chunks = np.array_split(order, n_bins)
    mx = np.array([predicted[c].mean() for c in chunks])
    my = np.array([observed[c].mean() for c in chunks])
    counts = np.array([len(c) for c in chunks], dtype=float)
    return mx, my, counts


# ---------------------------------------------------------------------------
# Range restriction
# ---------------------------------------------------------------------------


def thorndike_case_two(r_restricted: float, sd_restricted: float, sd_unrestricted: float) -> float:
    """Thorndike (1949) Case II correction for direct range restriction on the predictor.

        r_unrestricted = r_x / sqrt(r_x^2 + (sd_u/sd_r)^2 * (1 - r_x^2))

    Assumes selection was on the predictor being corrected, that the predictor-criterion
    relationship is linear and homoscedastic across the full range, and that the
    unrestricted SD is known. When selection was really on something else -- a composite,
    a human judgement, a reading gate -- the correction is applied to the wrong variable
    and OVERCORRECTS. That is not a hypothetical: Sackett et al. (2022) revised the
    operational validity of cognitive ability downward from roughly .51 to .31 by showing
    exactly this overcorrection in the personnel-selection literature
    (DOI 10.1037/apl0000994). The range-restriction figure shows both the corrected and
    the uncorrected estimate for that reason, and never the corrected one alone.
    """
    u = sd_unrestricted / sd_restricted
    r2 = r_restricted * r_restricted
    return (u * r_restricted) / math.sqrt(1.0 + r2 * (u * u - 1.0))


# ---------------------------------------------------------------------------
# Decision arithmetic
# ---------------------------------------------------------------------------


def sensitivity_specificity(score: np.ndarray, positive: np.ndarray, threshold: float) -> tuple[float, float]:
    flagged = np.asarray(score) >= threshold
    positive = np.asarray(positive, dtype=bool)
    sens = float(flagged[positive].mean())
    spec = float((~flagged[~positive]).mean())
    return sens, spec


def ppv_at_base_rate(sensitivity: float, specificity: float, base_rate: np.ndarray) -> np.ndarray:
    """Bayes: PPV = sens*pi / (sens*pi + (1-spec)*(1-pi)).

    Sensitivity and specificity are properties of the instrument at a threshold; the
    base rate is a property of the population. This is why the same instrument produces
    a usable PPV in one setting and mostly false positives in another, with nothing
    about the instrument having changed.
    """
    pi = np.asarray(base_rate, dtype=float)
    tp = sensitivity * pi
    fp = (1.0 - specificity) * (1.0 - pi)
    return tp / np.clip(tp + fp, 1e-12, None)
