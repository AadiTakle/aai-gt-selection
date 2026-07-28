"""Default configuration for the validation harness.

The configuration is a plain (JSON-serializable) dict so it can be logged into
the report verbatim for auditability (R7). ``default_config`` documents every
knob; ``merge`` applies a user override file on top of the defaults.

STRUCTURE-AGNOSTIC: the ``analysis`` block references measures purely by column
name and applies cuts by percentile or absolute threshold. To point the harness
at a *different* test, or later at real (post-consent) data, you only change the
column names / cut values here — no analysis code changes are required.
"""

from __future__ import annotations

import copy
from typing import Any, Dict


def default_config() -> Dict[str, Any]:
    return {
        "seed": 20260727,
        # ---- synthetic data generation -------------------------------------
        "generation": {
            "n_students": 600,
            "grades": [3, 4, 5, 6, 7, 8],
            "n_items": 30,
            # Weight of the *unique* capability the new test taps (beyond CogAT)
            # in the criterion outcome. Set to 0.0 to produce a valid NULL
            # (new test adds no incremental value) — null results are reportable.
            "incremental_signal": 0.30,
            # Group ability shift for the focal subgroup, in latent SD units.
            # DEFAULT 0.0 -> the synthetic test is FAIR (equal ability by group),
            # so any DIF flags come only from injected item bias, and the equity
            # funnel shows parity. This is a statistical stress-test knob only;
            # it does NOT encode any claim that a real group differs in ability.
            "impact_delta": 0.0,
            # Latent-factor loadings of each measure (defaults reproduce the
            # canonical demo). g = general reasoning, u = the new-test-unique
            # capability, a = achievement-specific. A second strong indicator of
            # the same trait (high newtest_g) still adds a small increment even
            # when incremental_signal=0, because it refines the measurement of g;
            # to see a CLEAN null, lower newtest_g and raise newtest_u.
            "loadings": {
                "cogat_g": 0.90, "cogat_noise": 0.44,
                "map_g": 0.82, "map_a": 0.38, "map_noise": 0.40,
                "newtest_g": 0.80, "newtest_u": 0.55, "newtest_noise": 0.24,
                "criterion_g": 0.55, "criterion_a": 0.35, "criterion_noise": 0.55,
            },
            # Injected item bias so the DIF machinery has something to detect.
            "dif": {
                "uniform_items": [7, 15, 22],   # 0-based item indices (harder for focal)
                "uniform_shift": 0.85,           # logit difficulty shift for focal
                "nonuniform_items": [11],        # interaction (lower discrimination for focal)
                "nonuniform_factor": 0.45,
            },
            "subgroup_props": {
                # focal share for the DIF reference/focal split
                "focal": 0.45,
                "ELL": 0.22,
                "lower_income": 0.40,
            },
        },
        # ---- analysis ------------------------------------------------------
        "analysis": {
            "measures": {
                "cogat": "cogat_sas",
                "map": "map_rit",
                "newtest": "newtest_total",
            },
            "newtest_item_prefix": "nt_",
            "outcome": "criterion_eoy",
            # Operational cuts. type = "percentile" (0-100 on the column) or
            # "absolute" (raw threshold). selected := value >= threshold.
            "cuts": {
                "newtest_total": {"type": "percentile", "value": 90},
                "cogat_sas": {"type": "percentile", "value": 90},
            },
            "correlation_pairs": [
                ["newtest_total", "cogat_sas"],
                ["newtest_total", "map_rit"],
                ["cogat_sas", "map_rit"],
            ],
            # classification agreement between selection by each measure's cut
            "agreement_pairs": [
                ["newtest_total", "cogat_sas"],
            ],
            # incremental validity: does 'added' improve prediction of 'outcome'
            # beyond 'base'?
            "incremental_validity": [
                {"outcome": "criterion_eoy", "base": ["cogat_sas"], "added": ["newtest_total"]},
                {"outcome": "criterion_eoy", "base": ["cogat_sas", "map_rit"], "added": ["newtest_total"]},
            ],
            "reliability": {
                "item_prefix": "nt_",
                "score": "newtest_total",
                "decision_cut": {"type": "percentile", "value": 90},
            },
            "ceiling_floor": ["cogat_sas", "map_rit", "newtest_total"],
            "dif": {
                "group_var": "subgroup_demo",
                "focal": "focal",
                "reference": "reference",
                "item_prefix": "nt_",
                "purify": True,
                "min_stratum": 2,
            },
            # subgroup equity funnel at the newtest operational cut
            "equity_funnel": {
                "selection_measure": "newtest_total",
                "cut": {"type": "percentile", "value": 90},
                "subgroups": ["subgroup_demo", "ell_status", "ses_band"],
                "four_fifths": 0.80,
            },
        },
        "report": {
            "title": "Cognitive-Test Validation Report (SYNTHETIC)",
            "formats": ["md", "html"],
        },
    }


def merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Deep-merge ``override`` onto a copy of ``base``."""
    out = copy.deepcopy(base)

    def _rec(dst: Dict[str, Any], src: Dict[str, Any]) -> None:
        for k, v in src.items():
            if isinstance(v, dict) and isinstance(dst.get(k), dict):
                _rec(dst[k], v)
            else:
                dst[k] = copy.deepcopy(v)

    _rec(out, override)
    return out
