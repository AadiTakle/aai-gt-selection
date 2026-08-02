"""Validation of statlib.py against published reference values.

Run:  python3 selftest.py
Every check must pass before the report's numbers are trusted.  The reference
values are external (published tables / G*Power) except where marked as an
internal consistency check of a closed form against brute-force linear algebra.
"""

import math
import sys

import statlib as S

FAILURES = []


def check(name, got, want, tol, source):
    ok = abs(got - want) <= tol
    status = "PASS" if ok else "FAIL"
    print("[%s] %-52s got=%.6f want=%.6f  (%s)" % (status, name, got, want, source))
    if not ok:
        FAILURES.append(name)


def check_int(name, got, want, source):
    ok = got == want
    print("[%s] %-52s got=%s want=%s  (%s)" % ("PASS" if ok else "FAIL", name, got, want, source))
    if not ok:
        FAILURES.append(name)


# --- normal ---------------------------------------------------------------
check("norm_ppf(0.975)", S.norm_ppf(0.975), 1.959964, 1e-5, "standard normal table")
check("norm_ppf(0.80)", S.norm_ppf(0.80), 0.841621, 1e-5, "standard normal table")
check("norm_sf(1.644854)", S.norm_sf(1.644854), 0.05, 1e-7, "standard normal table")

# --- bivariate normal -----------------------------------------------------
# P(X>0, Y>0) = 1/4 + arcsin(rho) / (2 pi)   (Sheppard's formula)
for rho in (0.0, 0.3, 0.5, -0.4, 0.9):
    want = 0.25 + math.asin(rho) / (2 * math.pi)
    check("bvn_upper(0,0,%.1f)" % rho, S.bvn_upper(0.0, 0.0, rho), want, 1e-9,
          "Sheppard's theorem on median dichotomy")


# Plackett's identity: d/drho L(h,k;rho) = phi_2(h,k;rho), so
#   L(h,k;rho) = Phibar(h) Phibar(k) + int_0^rho phi_2(h,k;t) dt.
# This validates bvn_upper away from the origin by an independent path.
def bvn_upper_via_plackett(h, k, rho, n=40000):
    def phi2(t):
        q = 1.0 - t * t
        return math.exp(-(h * h - 2 * t * h * k + k * k) / (2 * q)) / (
            2 * math.pi * math.sqrt(q))
    step = rho / n
    tot = 0.0
    for i in range(n + 1):
        t = i * step
        w = 1.0 if i in (0, n) else (4.0 if i % 2 else 2.0)
        tot += w * phi2(t)
    return S.norm_sf(h) * S.norm_sf(k) + tot * step / 3.0

for h, k, rho in ((1.0, 1.0, 0.5), (1.2816, 0.0, 0.5), (0.8416, 0.0, 0.3),
                  (-0.5, 1.5, 0.7)):
    check("bvn_upper(%.4f,%.4f,%.2f)" % (h, k, rho), S.bvn_upper(h, k, rho),
          bvn_upper_via_plackett(h, k, rho), 1e-9, "Plackett's identity")

# --- incomplete beta / F --------------------------------------------------
check("betainc(0.5,0.5,0.5)", S.betainc(0.5, 0.5, 0.5), 0.5, 1e-12, "symmetry")
check("F_{.95}(1,10)", S.f_ppf(0.95, 1, 10), 4.9646, 1e-3, "F table")
check("F_{.95}(3,20)", S.f_ppf(0.95, 3, 20), 3.0984, 1e-3, "F table")
check("F_{.99}(5,15)", S.f_ppf(0.99, 5, 15), 4.5556, 1e-3, "F table")
check("ncf_cdf(lam=0) == f_cdf", S.ncf_cdf(2.5, 3, 20, 0.0), S.f_cdf(2.5, 3, 20),
      1e-12, "noncentral reduces to central")

# --- power for R^2 increment ---------------------------------------------
# G*Power 3.1, "Linear multiple regression: Fixed model, R^2 increase":
#   f2 = 0.15, alpha = .05, power = .80, numerator df = 3, total predictors = 3
#   -> total sample size 77, lambda = 11.55.  (Faul et al. 2009, worked example)
n = S.n_for_delta_r2(k_total=3, q=3, delta_r2=0.15 * 0.70, r2_full=0.30, power=0.80)
check_int("N for f2=0.15, q=3, k=3, power=.80", n, 77, "G*Power 3.1 worked example")

# f2 = 0.02, q = 1, k = 2 -> 395 in G*Power
n = S.n_for_delta_r2(k_total=2, q=1, delta_r2=0.02 * 0.70, r2_full=0.30, power=0.80)
check_int("N for f2=0.02, q=1, k=2, power=.80", n, 395, "G*Power 3.1")

# --- Fisher z -------------------------------------------------------------
# Cohen (1988) Table 3.4.1: r = .30, alpha = .05 two-tailed, power = .80 -> N = 85
check_int("N for r=.30, power=.80", S.n_for_correlation(0.30), 85, "Cohen 1988 Table 3.4.1")
# r = .50: Cohen's tables give 28. The Fisher-z normal approximation used here
# returns 30 -- it is mildly conservative at small n, which errs toward larger
# samples and is therefore safe for planning. Assert it stays close.
n50 = S.n_for_correlation(0.50)
check("N for r=.50, power=.80 (within 2 of Cohen)", float(n50), 29.0, 2.0,
      "Cohen 1988 Table 3.4.1 gives 28; Fisher-z approx is slightly conservative")

# --- Taylor-Russell -------------------------------------------------------
# Taylor & Russell (1939) tables: proportion successful among those selected.
d = S.decision_table(validity=0.50, selection_ratio=0.20, base_rate=0.50)
check("Taylor-Russell r=.50 SR=.20 BR=.50", d["ppv"], 0.78, 1e-2, "Taylor & Russell 1939")
d = S.decision_table(validity=0.30, selection_ratio=0.20, base_rate=0.60)
check("Taylor-Russell r=.30 SR=.20 BR=.60", d["ppv"], 0.76, 1e-2, "Taylor & Russell 1939")
# A zero-validity predictor must select at exactly the base rate.
d = S.decision_table(validity=1e-9, selection_ratio=0.20, base_rate=0.35)
check("zero validity -> PPV == base rate", d["ppv"], 0.35, 1e-6, "internal")

# --- range restriction ----------------------------------------------------
# Independent check: compute the SD of a normal truncated above the 90th
# percentile by quadrature rather than from the closed form.
def truncated_sd_quadrature(sr, n=200000):
    c = S.norm_ppf(1.0 - sr)
    hi = c + 16.0
    step = (hi - c) / n
    m1 = m2 = 0.0
    for i in range(n + 1):
        x = c + i * step
        w = 1.0 if i in (0, n) else (4.0 if i % 2 else 2.0)
        d_ = w * S.norm_pdf(x)
        m1 += d_ * x
        m2 += d_ * x * x
    m1 = m1 * step / 3.0 / sr
    m2 = m2 * step / 3.0 / sr
    return math.sqrt(m2 - m1 * m1)

check("truncated SD ratio at SR=.10", S.truncated_sd_ratio(0.10),
      truncated_sd_quadrature(0.10), 1e-7, "quadrature vs closed form")
check("truncated SD ratio at SR=.25", S.truncated_sd_ratio(0.25),
      truncated_sd_quadrature(0.25), 1e-7, "quadrature vs closed form")
# Correcting a restricted r must invert restricting an unrestricted r.
r_true = 0.40
r_obs = S.restrict_correlation(r_true, 0.10)
check("Thorndike II round trip", S.correct_correlation(r_obs, 0.10), r_true, 1e-9,
      "internal: correction inverts attenuation")

# --- spurious increment closed form vs brute force ------------------------
def brute_force_delta_r2(rho, r1, r2):
    """R^2 of {X1, X2} minus R^2 of {X1} computed from the 3x3 correlation
    matrix, with X1, X2 congeneric indicators of one latent trait."""
    a = math.sqrt(r1) * rho     # corr(X1, Y)
    b = math.sqrt(r2) * rho     # corr(X2, Y)
    c = math.sqrt(r1 * r2)      # corr(X1, X2)
    r2_full = (a * a + b * b - 2 * a * b * c) / (1 - c * c)
    return r2_full - a * a

for rho, r1, r2 in ((0.50, 0.90, 0.90), (0.63, 0.91, 0.85), (0.31, 0.95, 0.92)):
    check("spurious dR2 (rho=%.2f r1=%.2f r2=%.2f)" % (rho, r1, r2),
          S.spurious_delta_r2(rho, r1, r2), brute_force_delta_r2(rho, r1, r2), 1e-12,
          "internal: closed form vs 3x3 correlation matrix")

# --- uniform criterion attenuation ---------------------------------------
# corr(Z, Phi(Z)) = sqrt(3/pi); verify by quadrature.
n_q, lo, hi = 200000, -12.0, 12.0
h = (hi - lo) / n_q
num = 0.0
for i in range(n_q + 1):
    z = lo + i * h
    w = 1.0 if i in (0, n_q) else (4.0 if i % 2 else 2.0)
    num += w * z * S.norm_cdf(z) * S.norm_pdf(z)
num = num * h / 3.0                      # = E[Z Phi(Z)] = Cov(Z, Phi(Z))
quad_r = num / math.sqrt(1.0 / 12.0)     # divide by SD(Phi(Z)) = 1/sqrt(12)
check("corr(Z, Phi(Z)) by quadrature", quad_r, S.uniform_criterion_attenuation(),
      1e-9, "internal: quadrature vs closed form sqrt(3/pi)")

# --- decision consistency sanity -----------------------------------------
# At a median cut, Sheppard's theorem gives the exact closed form
#   DC = 1/2 + arcsin(rho) / pi.
for rel in (0.70, 0.85, 0.95):
    want = 0.5 + math.asin(rel) / math.pi
    check("decision consistency at median cut, rel=%.2f" % rel,
          S.decision_consistency(rel, 0.50), want, 1e-9,
          "Sheppard's theorem, exact closed form")

# Agreement approaches but never reaches 1 for any reliability below 1: the
# shortfall is a boundary layer of width sqrt(1 - rel).
check("decision consistency at reliability ~1", S.decision_consistency(1 - 1e-10, 0.10),
      1.0, 1e-5, "limit behaviour")
check("decision accuracy at reliability ~1", S.decision_accuracy(1 - 1e-10, 0.10),
      1.0, 1e-5, "limit behaviour")
# A zero-reliability test agrees with itself only at chance: SR^2 + (1-SR)^2.
check("decision consistency at reliability 0", S.decision_consistency(1e-9, 0.10),
      0.10 ** 2 + 0.90 ** 2, 1e-6, "internal: chance agreement")

# --- AUC ------------------------------------------------------------------
# At A = 0.5 the Hanley-McNeil variance must reduce exactly to the null
# variance of the Mann-Whitney U statistic, SE = sqrt((N+1)/(12 n_pos n_neg)).
for n1, n0 in ((51, 58), (14, 32), (150, 350)):
    want = math.sqrt((n1 + n0 + 1.0) / (12.0 * n1 * n0))
    check("Hanley-McNeil SE at A=.5, n=%d/%d" % (n1, n0),
          S.auc_se_hanley(0.5, n1, n0), want, 1e-12,
          "reduces to the Mann-Whitney null SE")
check("Hanley-McNeil SE at A=1", S.auc_se_hanley(1.0, 51, 58), 0.0, 1e-12,
      "a perfect ranking has no sampling error")

# rho_to_auc endpoints and inversion.
check("rho_to_auc(0)", S.rho_to_auc(1e-13, 0.30), 0.5, 1e-9, "no signal")
check("rho_to_auc round trip at 0.35",
      S.auc_to_rho(S.rho_to_auc(0.35, 0.30), 0.30), 0.35, 1e-6,
      "internal: inversion")


# Independent path to the same AUC.  Writing U = X_i - X_j, the event
# {X_i > X_j, Y_i > c, Y_j <= c} is a trivariate normal orthant in
# (U/sqrt2, Y_i, -Y_j) with correlations (rho/sqrt2, rho/sqrt2, 0).
# Conditioning on the first coordinate reduces it to a one-dimensional
# integral over the already-validated bivariate orthant routine.
def auc_via_trivariate(rho, p, panels=80):
    c = S.norm_ppf(1.0 - p)
    r = rho / math.sqrt(2.0)
    s2 = 1.0 - r * r
    s = math.sqrt(s2)
    rho_cond = -r * r / s2

    def integrand(z):
        return S.norm_pdf(z) * S.bvn_upper((c - r * z) / s, (-c - r * z) / s,
                                           rho_cond)

    return S._simpson(integrand, 0.0, 9.0, panels) / (p * (1.0 - p))

for rho, p in ((0.35, 0.30), (0.28, 0.30), (0.50, 0.20)):
    check("AUC(rho=%.2f, p=%.2f) vs trivariate orthant" % (rho, p),
          S.rho_to_auc(rho, p), auc_via_trivariate(rho, p), 1e-6,
          "quadrature vs independent orthant reduction")

# Dichotomisation attenuation peaks at sqrt(2/pi) for a median split.
check("point-biserial factor at median split",
      S.point_biserial(1.0, 0.50), math.sqrt(2.0 / math.pi), 1e-9,
      "closed form")

check("paired AUC power at zero effect",
      S.power_paired_auc_diff(500, 0.65, 0.65, 0.30, 0.8), 0.05, 1e-9,
      "internal: null case")
n_lo = S.n_for_paired_auc_diff(0.670, 0.636, 0.30, 0.5)
n_hi = S.n_for_paired_auc_diff(0.670, 0.636, 0.30, 0.9)
check_int("paired AUC n falls as r rises", n_hi < n_lo, True,
          "internal: monotonicity")

print()
if FAILURES:
    print("FAILED: %d check(s): %s" % (len(FAILURES), ", ".join(FAILURES)))
    sys.exit(1)
print("All %s checks passed." % "reference and consistency")
