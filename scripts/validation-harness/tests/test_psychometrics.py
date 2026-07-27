"""Known-answer unit tests for the psychometric primitives.

Run from scripts/validation-harness/:
    python3 -m unittest discover -s tests -t .
"""

import math
import os
import random
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from harness import psychometrics as ps  # noqa: E402


class TestDescriptives(unittest.TestCase):
    def test_mean_variance(self):
        x = [1, 2, 3, 4, 5]
        self.assertAlmostEqual(ps.mean(x), 3.0)
        self.assertAlmostEqual(ps.variance(x), 2.5)  # sample variance
        self.assertAlmostEqual(ps.stdev(x), math.sqrt(2.5))

    def test_quantile(self):
        x = list(range(1, 101))  # 1..100
        self.assertAlmostEqual(ps.quantile(x, 0.5), 50.5)
        # 90th percentile of 1..100 (type-7) = 90.1
        self.assertAlmostEqual(ps.quantile(x, 0.90), 90.1, places=6)


class TestDistributions(unittest.TestCase):
    def test_norm_cdf(self):
        self.assertAlmostEqual(ps.norm_cdf(0.0), 0.5, places=6)
        self.assertAlmostEqual(ps.norm_cdf(1.96), 0.9750021, places=4)

    def test_norm_ppf(self):
        self.assertAlmostEqual(ps.norm_ppf(0.975), 1.959964, places=3)
        self.assertAlmostEqual(ps.norm_ppf(0.5), 0.0, places=6)

    def test_chi2_sf(self):
        # chi-square(1) critical value 3.8414588 has upper-tail prob 0.05
        self.assertAlmostEqual(ps.chi2_sf(3.8414588, 1), 0.05, places=4)
        # chi-square(2): value 5.991465 -> 0.05
        self.assertAlmostEqual(ps.chi2_sf(5.991465, 2), 0.05, places=4)

    def test_t_sf_symmetry(self):
        self.assertAlmostEqual(ps.t_two_sided_p(0.0, 30), 1.0, places=6)
        # t=2.042 with df=30 -> two-sided p ~ 0.05
        self.assertAlmostEqual(ps.t_two_sided_p(2.042272, 30), 0.05, places=3)

    def test_f_sf(self):
        # F(1, df) = t^2 relationship: F=4.170 df1=1 df2=30 ~ p .05
        self.assertAlmostEqual(ps.f_sf(4.170877, 1, 30), 0.05, places=3)
        self.assertTrue(0.0 <= ps.f_sf(2.0, 3, 100) <= 1.0)


class TestCorrelation(unittest.TestCase):
    def test_perfect_positive(self):
        x = [1, 2, 3, 4, 5]
        y = [2, 4, 6, 8, 10]
        r, n = ps.pearson(x, y)
        self.assertAlmostEqual(r, 1.0, places=9)
        self.assertEqual(n, 5)

    def test_perfect_negative(self):
        x = [1, 2, 3, 4, 5]
        y = [10, 8, 6, 4, 2]
        r, _ = ps.pearson(x, y)
        self.assertAlmostEqual(r, -1.0, places=9)

    def test_spearman_monotonic_nonlinear(self):
        x = [1, 2, 3, 4, 5]
        y = [1, 4, 9, 16, 25]  # monotonic but nonlinear
        rho, _ = ps.spearman(x, y)
        self.assertAlmostEqual(rho, 1.0, places=9)

    def test_fisher_ci_contains_r(self):
        rng = random.Random(1)
        x = [rng.gauss(0, 1) for _ in range(200)]
        y = [xi + rng.gauss(0, 1) for xi in x]
        r, n = ps.pearson(x, y)
        lo, hi = ps.fisher_ci(r, n)
        self.assertLess(lo, r)
        self.assertGreater(hi, r)


class TestReliability(unittest.TestCase):
    def test_identical_items_alpha_one(self):
        rng = random.Random(2)
        matrix = []
        for _ in range(100):
            v = rng.randint(0, 1)
            matrix.append([v, v, v])  # 3 identical items
        alpha = ps.cronbach_alpha(matrix)["alpha"]
        self.assertGreater(alpha, 0.999)

    def test_independent_items_alpha_low(self):
        rng = random.Random(3)
        matrix = [[rng.randint(0, 1) for _ in range(10)] for _ in range(300)]
        alpha = ps.cronbach_alpha(matrix)["alpha"]
        self.assertLess(alpha, 0.2)

    def test_split_half_spearman_brown(self):
        rng = random.Random(4)
        # correlated items -> decent split-half
        matrix = []
        for _ in range(300):
            theta = rng.gauss(0, 1)
            row = [1 if rng.random() < ps._sigmoid(theta) else 0 for _ in range(20)]
            matrix.append(row)
        sh = ps.split_half(matrix)
        self.assertGreater(sh["spearman_brown"], sh["r_halves"])  # SB inflates


class TestRegression(unittest.TestCase):
    def test_ols_recovers_line(self):
        x = [[float(i)] for i in range(1, 21)]
        y = [3.0 + 2.0 * i for i in range(1, 21)]
        fit = ps.ols(y, x, ["x"])
        self.assertAlmostEqual(fit["beta"][0], 3.0, places=6)
        self.assertAlmostEqual(fit["beta"][1], 2.0, places=6)
        self.assertAlmostEqual(fit["r2"], 1.0, places=9)

    def test_incremental_validity_detects_signal(self):
        rng = random.Random(5)
        n = 400
        x1 = [rng.gauss(0, 1) for _ in range(n)]
        x2 = [rng.gauss(0, 1) for _ in range(n)]
        y = [1.0 * x1[i] + 0.8 * x2[i] + rng.gauss(0, 1) for i in range(n)]
        base = [[x1[i]] for i in range(n)]
        added = [[x2[i]] for i in range(n)]
        res = ps.incremental_validity(y, base, added, ["x1"], ["x2"])
        self.assertGreater(res["delta_r2"], 0.10)
        self.assertLess(res["p_value"], 1e-6)

    def test_incremental_validity_null(self):
        rng = random.Random(6)
        n = 400
        x1 = [rng.gauss(0, 1) for _ in range(n)]
        noise_pred = [rng.gauss(0, 1) for _ in range(n)]  # unrelated to y
        y = [1.0 * x1[i] + rng.gauss(0, 1) for i in range(n)]
        base = [[x1[i]] for i in range(n)]
        added = [[noise_pred[i]] for i in range(n)]
        res = ps.incremental_validity(y, base, added, ["x1"], ["noise"])
        self.assertLess(res["delta_r2"], 0.02)
        self.assertGreater(res["p_value"], 0.05)  # correctly non-significant


class TestLogistic(unittest.TestCase):
    def test_recovers_positive_slope(self):
        rng = random.Random(7)
        n = 800
        x = [rng.gauss(0, 1) for _ in range(n)]
        y = [1.0 if rng.random() < ps._sigmoid(1.5 * xi) else 0.0 for xi in x]
        fit = ps.logistic_regression(y, [[xi] for xi in x], ["x"])
        self.assertTrue(fit["converged"])
        self.assertGreater(fit["beta"][1], 0.8)  # true slope 1.5
        self.assertLess(fit["p_values"][1], 1e-3)

    def test_nagelkerke_in_unit_interval(self):
        rng = random.Random(8)
        n = 400
        x = [rng.gauss(0, 1) for _ in range(n)]
        y = [1.0 if rng.random() < ps._sigmoid(1.0 * xi) else 0.0 for xi in x]
        fit = ps.logistic_regression(y, [[xi] for xi in x], ["x"])
        r2 = ps.nagelkerke_r2(fit["loglik"], y)
        self.assertTrue(0.0 <= r2 <= 1.0)


class TestMantelHaenszel(unittest.TestCase):
    def _make(self, dif_shift):
        rng = random.Random(99)
        n = 700
        item = []
        focal = []
        match = []
        for _ in range(n):
            is_focal = rng.random() < 0.5
            ability = rng.randint(0, 10)
            base = ps._sigmoid(0.6 * (ability - 5))
            if is_focal:
                base = ps._sigmoid(0.6 * (ability - 5) - dif_shift)
            item.append(1.0 if rng.random() < base else 0.0)
            focal.append(is_focal)
            match.append(ability)
        return item, focal, match

    def test_detects_uniform_dif(self):
        item, focal, match = self._make(dif_shift=2.0)
        res = ps.mantel_haenszel(item, focal, match)
        self.assertLess(res["alpha_mh"], 0.7)   # focal disadvantaged
        self.assertEqual(res["ets_class"], "C")
        self.assertLess(res["p_value"], 0.01)

    def test_no_dif_is_class_a(self):
        item, focal, match = self._make(dif_shift=0.0)
        res = ps.mantel_haenszel(item, focal, match)
        self.assertEqual(res["ets_class"], "A")


if __name__ == "__main__":
    unittest.main()
