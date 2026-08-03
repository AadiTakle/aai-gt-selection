"""Born-synthetic dataset generator (D-006, R9).

Generates a synthetic per-student score table whose *structure mirrors* a real
campus feed — an existing ability screen (CogAT), an existing achievement
measure (MAP), a new in-house cognitive test (item responses + total), a
downstream criterion outcome, and equity subgroups — WITHOUT using any real
student record. Every value is drawn from pseudo-random distributions seeded for
reproducibility.

The generative model is a simple, transparent latent-trait model:

    g ~ N(0,1)     general reasoning ability
    u ~ N(0,1)     a distinct capability the NEW test taps that CogAT under-measures
    a ~ N(0,1)     achievement-specific factor that MAP taps

    CogAT   loads on g
    MAP     loads on g and a
    NewTest loads on g and u  (item responses via a 2PL IRT model)
    Outcome loads on g, a, and u  -> so the new test can show INCREMENTAL
            validity over CogAT (because it carries u, which CogAT lacks).

Item bias (DIF) is injected on a few items so the DIF machinery has a known
signal to recover. Subgroup ability is EQUAL by default (a fair test), so the
equity funnel shows parity unless bias/impact is deliberately configured.

This file is the ONLY place that knows the latent truth. The analysis layer
never reads the ground truth; it is recorded in the manifest purely for audit
and an optional recovery footnote.
"""

from __future__ import annotations

import math
import random
from typing import Any, Dict, List, Tuple


def _sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    ez = math.exp(z)
    return ez / (1.0 + ez)


def _pick(rng: random.Random, p_true: float) -> bool:
    return rng.random() < p_true


def generate(cfg: Dict[str, Any]) -> Tuple[List[str], Dict[str, list], Dict[str, Any]]:
    """Return (columns, data, ground_truth_meta)."""
    gen = cfg["generation"]
    seed = int(cfg.get("seed", 0))
    rng = random.Random(seed)

    n = int(gen["n_students"])
    grades = list(gen["grades"])
    k_items = int(gen["n_items"])
    incr = float(gen["incremental_signal"])
    impact = float(gen["impact_delta"])
    props = gen["subgroup_props"]
    dif = gen["dif"]

    # configurable latent-factor loadings (defaults reproduce the canonical demo)
    L = gen.get("loadings", {})
    cogat_g = float(L.get("cogat_g", 0.90))
    cogat_noise = float(L.get("cogat_noise", 0.44))
    map_g = float(L.get("map_g", 0.82))
    map_a = float(L.get("map_a", 0.38))
    map_noise = float(L.get("map_noise", 0.40))
    nt_g = float(L.get("newtest_g", 0.80))
    nt_u = float(L.get("newtest_u", 0.55))
    nt_noise = float(L.get("newtest_noise", 0.24))
    crit_g = float(L.get("criterion_g", 0.55))
    crit_a = float(L.get("criterion_a", 0.35))
    crit_noise = float(L.get("criterion_noise", 0.55))

    # --- item parameters (2PL). Difficulties extend high to keep a gifted
    #     tail (above-level items) and avoid ceiling (R6). -------------------
    b_params: List[float] = []
    a_params: List[float] = []
    for j in range(k_items):
        # difficulty spread from -1.2 to +2.6 (above-level tail included)
        b = -1.2 + (3.8) * (j / max(1, k_items - 1))
        b += rng.uniform(-0.15, 0.15)
        a = rng.uniform(0.75, 1.85)
        b_params.append(b)
        a_params.append(a)

    uniform_items = set(int(i) for i in dif.get("uniform_items", []))
    nonuniform_items = set(int(i) for i in dif.get("nonuniform_items", []))
    uniform_shift = float(dif.get("uniform_shift", 0.0))
    nonuniform_factor = float(dif.get("nonuniform_factor", 1.0))

    # --- MAP RIT: modest vertical-scale grade effect (RIT grows with grade) --
    grade_base = {g: 190.0 + (g - 3) * 5.0 for g in grades}

    columns: List[str] = ["student_id", "grade", "cogat_sas", "map_rit"]
    item_cols = [f"nt_{j+1:02d}" for j in range(k_items)]
    columns += item_cols
    columns += ["newtest_total", "criterion_eoy",
                "subgroup_demo", "ell_status", "ses_band"]

    data: Dict[str, list] = {c: [] for c in columns}

    for i in range(n):
        # subgroup assignment (independent of ability by default)
        is_focal = _pick(rng, float(props.get("focal", 0.45)))
        is_ell = _pick(rng, float(props.get("ELL", 0.22)))
        is_lower = _pick(rng, float(props.get("lower_income", 0.40)))

        # latent factors; optional focal ability shift (stress test only)
        shift = impact if is_focal else 0.0
        g = rng.gauss(0.0 + shift, 1.0)
        u = rng.gauss(0.0, 1.0)
        a = rng.gauss(0.0, 1.0)

        grade = rng.choice(grades)

        # CogAT standard age score: mean 100, sd 16, reliability ~ 0.81
        cogat_true = cogat_g * g
        cogat_sas = 100.0 + 16.0 * (cogat_true + cogat_noise * rng.gauss(0, 1))
        cogat_sas = int(round(min(160.0, max(55.0, cogat_sas))))

        # MAP RIT: loads on g and achievement a, plus grade base + noise
        map_std = map_g * g + map_a * a
        map_rit = grade_base[grade] + 15.0 * (map_std + map_noise * rng.gauss(0, 1))
        map_rit = int(round(min(300.0, max(120.0, map_rit))))

        # New test latent ability: loads on g and the unique component u
        theta = nt_g * g + nt_u * u + nt_noise * rng.gauss(0, 1)

        # 2PL item responses (item bias applied only for focal group)
        responses: List[int] = []
        for j in range(k_items):
            b = b_params[j]
            a_disc = a_params[j]
            if is_focal and j in uniform_items:
                b = b + uniform_shift  # uniform DIF: item is harder for focal
            if is_focal and j in nonuniform_items:
                a_disc = a_disc * nonuniform_factor  # nonuniform DIF
            p = _sigmoid(1.7 * a_disc * (theta - b))
            responses.append(1 if rng.random() < p else 0)
        newtest_total = sum(responses)

        # Criterion outcome: g, a, and (the harness-relevant) u, plus noise.
        criterion = (crit_g * g + crit_a * a + incr * u + crit_noise * rng.gauss(0, 1))
        criterion = round(50.0 + 10.0 * criterion, 2)

        data["student_id"].append(f"SYNTH-{i+1:06d}")
        data["grade"].append(grade)
        data["cogat_sas"].append(cogat_sas)
        data["map_rit"].append(map_rit)
        for j, col in enumerate(item_cols):
            data[col].append(responses[j])
        data["newtest_total"].append(newtest_total)
        data["criterion_eoy"].append(criterion)
        data["subgroup_demo"].append("focal" if is_focal else "reference")
        data["ell_status"].append("ELL" if is_ell else "non-ELL")
        data["ses_band"].append("lower-income" if is_lower else "higher-income")

    ground_truth = {
        "model": "2PL IRT for new test; linear factor model for CogAT/MAP/criterion",
        "latent_factors": ["g (general reasoning)", "u (new-test-unique capability)",
                            "a (achievement-specific)"],
        "n_items": k_items,
        "item_difficulties_b": [round(b, 3) for b in b_params],
        "item_discriminations_a": [round(a, 3) for a in a_params],
        "injected_dif": {
            "uniform_items_0based": sorted(uniform_items),
            "uniform_items_1based": sorted(i + 1 for i in uniform_items),
            "uniform_shift_logits": uniform_shift,
            "nonuniform_items_0based": sorted(nonuniform_items),
            "nonuniform_items_1based": sorted(i + 1 for i in nonuniform_items),
            "nonuniform_factor": nonuniform_factor,
            "direction": "focal group disadvantaged on injected items",
        },
        "impact_delta_focal": impact,
        "incremental_signal_u_weight": incr,
        "notes": ("Ground truth is recorded for audit and an optional recovery "
                  "check only. The analysis layer never reads it."),
    }
    return columns, data, ground_truth
