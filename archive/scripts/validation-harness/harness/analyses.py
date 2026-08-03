"""Validation analyses composed from the psychometric primitives.

Every analysis consumes plain columns from a ``Dataset`` and returns a
JSON-serializable dict for the report. Nothing here assumes a test structure:
measures are referenced by column name, cuts by percentile/absolute threshold,
and item-level analyses simply use whatever ``<prefix>*`` item columns exist.

Analyses implemented
--------------------
concurrent_validity ..... correlations among measures (Pearson + Fisher CI, Spearman)
classification_agreement  agreement of selection decisions at each measure's cut
reliability ............. Cronbach alpha, split-half, SEM, decision consistency, item stats
ceiling_floor ........... distribution / ceiling / floor / gifted-tail compression
incremental_validity .... nested Delta R^2 F-test (does a secondary signal add value?)
dif ..................... Mantel-Haenszel + logistic-regression DIF (two-stage purified)
equity_funnel ........... subgroup selection rates + adverse-impact (4/5ths) ratios
differential_prediction . does subgroup add predictive value beyond the score?
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Sequence

from . import psychometrics as ps
from .dataio import Dataset


# ---------------------------------------------------------------------------
# Cut helpers
# ---------------------------------------------------------------------------

def resolve_threshold(values: Sequence[float], cut: Dict[str, Any]) -> float:
    ctype = cut.get("type", "percentile")
    val = float(cut.get("value"))
    if ctype == "percentile":
        return ps.quantile(list(values), val / 100.0)
    if ctype == "absolute":
        return val
    raise ValueError(f"unknown cut type: {ctype}")


def selected_mask(values: Sequence[float], threshold: float) -> List[bool]:
    return [v >= threshold for v in values]


# ---------------------------------------------------------------------------
# Concurrent validity
# ---------------------------------------------------------------------------

def concurrent_validity(ds: Dataset, pairs: List[List[str]]) -> Dict[str, Any]:
    rows = []
    for a, b in pairs:
        if not (ds.has(a) and ds.has(b)):
            continue
        xa, xb = ds.numeric(a), ds.numeric(b)
        r, n = ps.pearson(xa, xb)
        lo, hi = ps.fisher_ci(r, n)
        p = ps.pearson_p(r, n)
        rho, _ = ps.spearman(xa, xb)
        rows.append({
            "x": a, "y": b, "n": n,
            "pearson_r": r, "ci_lo": lo, "ci_hi": hi, "p_value": p,
            "spearman_rho": rho,
        })
    return {"pairs": rows}


# ---------------------------------------------------------------------------
# Classification agreement at the cut
# ---------------------------------------------------------------------------

def classification_agreement(ds: Dataset, pairs: List[List[str]],
                             cuts: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    rows = []
    for index_measure, reference_measure in pairs:
        if index_measure not in cuts or reference_measure not in cuts:
            continue
        vi = ds.numeric(index_measure)
        vr = ds.numeric(reference_measure)
        ti = resolve_threshold(vi, cuts[index_measure])
        tr = resolve_threshold(vr, cuts[reference_measure])
        si = selected_mask(vi, ti)
        sr = selected_mask(vr, tr)
        n = len(vi)
        both = sum(1 for i in range(n) if si[i] and sr[i])
        only_i = sum(1 for i in range(n) if si[i] and not sr[i])
        only_r = sum(1 for i in range(n) if not si[i] and sr[i])
        neither = sum(1 for i in range(n) if not si[i] and not sr[i])
        po = (both + neither) / n
        p_i = (both + only_i) / n
        p_r = (both + only_r) / n
        pe = p_i * p_r + (1 - p_i) * (1 - p_r)
        kappa = (po - pe) / (1 - pe) if (1 - pe) > 0 else float("nan")
        a, b_, c, d = both, only_i, only_r, neither
        denom = (a + b_) * (c + d) * (a + c) * (b_ + d)
        phi = (a * d - b_ * c) / math.sqrt(denom) if denom > 0 else float("nan")
        # sensitivity/specificity treat the REFERENCE measure as the standard
        sens = both / (both + only_r) if (both + only_r) > 0 else float("nan")
        spec = neither / (neither + only_i) if (neither + only_i) > 0 else float("nan")
        ppv = both / (both + only_i) if (both + only_i) > 0 else float("nan")
        npv = neither / (neither + only_r) if (neither + only_r) > 0 else float("nan")
        rows.append({
            "index_measure": index_measure,
            "reference_measure": reference_measure,
            "threshold_index": ti, "threshold_reference": tr,
            "n": n, "both": both, "only_index": only_i,
            "only_reference": only_r, "neither": neither,
            "n_selected_index": both + only_i,
            "n_selected_reference": both + only_r,
            "overall_agreement": po, "cohen_kappa": kappa, "phi": phi,
            "sensitivity_vs_reference": sens, "specificity_vs_reference": spec,
            "ppv": ppv, "npv": npv,
        })
    return {"pairs": rows}


# ---------------------------------------------------------------------------
# Reliability
# ---------------------------------------------------------------------------

def reliability(ds: Dataset, cfg: Dict[str, Any]) -> Dict[str, Any]:
    prefix = cfg.get("item_prefix", "nt_")
    matrix, item_cols = ds.item_matrix(prefix)
    if not item_cols:
        return {"available": False,
                "reason": f"no item columns with prefix '{prefix}'"}
    alpha = ps.cronbach_alpha(matrix)
    sh = ps.split_half(matrix)

    # item statistics: difficulty (p), corrected item-total correlation
    totals = [sum(row) for row in matrix]
    item_stats = []
    for j, col_name in enumerate(item_cols):
        item = [row[j] for row in matrix]
        p_correct = ps.mean(item)
        rest = [totals[i] - item[i] for i in range(len(item))]
        r_it, _ = ps.pearson(item, rest)
        flag = None
        if p_correct >= 0.95:
            flag = "very easy (ceiling risk)"
        elif p_correct <= 0.05:
            flag = "very hard (floor risk)"
        elif r_it == r_it and r_it < 0.10:
            flag = "low discrimination"
        item_stats.append({"item": col_name, "p_correct": p_correct,
                           "item_total_r": r_it, "flag": flag})

    # decision consistency near the cut using SEM
    score_col = cfg.get("score", "newtest_total")
    dec = {}
    if ds.has(score_col) and alpha.get("sem") == alpha.get("sem"):
        scores = ds.numeric(score_col)
        sem = alpha["sem"]
        thr = resolve_threshold(scores, cfg.get("decision_cut", {"type": "percentile", "value": 90}))
        band = 1.96 * sem
        n = len(scores)
        ambiguous = sum(1 for s in scores if abs(s - thr) <= band)
        within_1sem = sum(1 for s in scores if abs(s - thr) <= sem)
        dec = {
            "score": score_col,
            "cut_threshold": thr,
            "sem": sem,
            "band_95": band,
            "n": n,
            "ambiguous_within_1_96_sem": ambiguous,
            "ambiguous_pct": 100.0 * ambiguous / n,
            "within_1_sem": within_1sem,
            "confidently_classified_pct": 100.0 * (n - ambiguous) / n,
        }

    return {
        "available": True,
        "cronbach_alpha": alpha,
        "split_half": sh,
        "item_stats": item_stats,
        "decision_consistency": dec,
    }


# ---------------------------------------------------------------------------
# Ceiling / floor
# ---------------------------------------------------------------------------

def ceiling_floor(ds: Dataset, measures: List[str], item_prefix: str = "nt_") -> Dict[str, Any]:
    rows = []
    n_items = len(ds.item_columns(item_prefix))
    for m in measures:
        if not ds.has(m):
            continue
        vals = ds.numeric(m)
        desc = ps.describe(vals)
        vmax = max(vals)
        vmin = min(vals)
        at_max = sum(1 for v in vals if v >= vmax) / len(vals)
        at_min = sum(1 for v in vals if v <= vmin) / len(vals)
        perfect = None
        if m.endswith("total") and n_items > 0:
            perfect = sum(1 for v in vals if v >= n_items) / len(vals)
        # top-band compression: proportion in the top 10% of the *scale range*
        rng = vmax - vmin
        top_band = sum(1 for v in vals if rng > 0 and v >= vmax - 0.10 * rng) / len(vals)
        rows.append({
            "measure": m, **desc,
            "pct_at_observed_max": 100.0 * at_max,
            "pct_at_observed_min": 100.0 * at_min,
            "pct_perfect_score": (100.0 * perfect) if perfect is not None else None,
            "pct_top_10pct_of_range": 100.0 * top_band,
        })
    return {"measures": rows, "n_items_newtest": n_items}


# ---------------------------------------------------------------------------
# Incremental validity
# ---------------------------------------------------------------------------

def incremental_validity(ds: Dataset, specs: List[Dict[str, Any]]) -> Dict[str, Any]:
    results = []
    for spec in specs:
        outcome = spec["outcome"]
        base_names = spec["base"]
        added_names = spec["added"]
        if not ds.has(outcome):
            continue
        if not all(ds.has(c) for c in base_names + added_names):
            continue
        y = ds.numeric(outcome)
        base = [[ds.numeric(c)[i] for c in base_names] for i in range(ds.n)]
        added = [[ds.numeric(c)[i] for c in added_names] for i in range(ds.n)]
        res = ps.incremental_validity(y, base, added, base_names, added_names)
        # standardized betas of the added predictors in the full model
        full = res["full"]
        added_betas = []
        for name in added_names:
            idx = full["names"].index(name)
            added_betas.append({
                "name": name,
                "beta": full["beta"][idx],
                "std_beta": full["std_beta"][idx],
                "t": full["t"][idx],
                "p_value": full["p_values"][idx],
            })
        results.append({
            "outcome": outcome,
            "base": base_names,
            "added": added_names,
            "r2_base": res["base"]["r2"],
            "r2_full": res["full"]["r2"],
            "adj_r2_base": res["base"]["adj_r2"],
            "adj_r2_full": res["full"]["adj_r2"],
            "delta_r2": res["delta_r2"],
            "f": res["f"], "df1": res["df1"], "df2": res["df2"],
            "p_value": res["p_value"],
            "added_predictors": added_betas,
        })
    return {"specs": results}


# ---------------------------------------------------------------------------
# DIF (Mantel-Haenszel + logistic regression), two-stage purified
# ---------------------------------------------------------------------------

def _zscore(x: Sequence[float]) -> List[float]:
    m = ps.mean(x)
    sd = ps.stdev(x)
    if sd <= 0:
        return [0.0 for _ in x]
    return [(xi - m) / sd for xi in x]


def _logistic_dif_item(item: List[float], ability_z: List[float],
                       group: List[float]) -> Dict[str, Any]:
    p_correct = ps.mean(item)
    if p_correct <= 0.02 or p_correct >= 0.98:
        return {"available": False, "reason": "item near-degenerate (p<=.02 or >=.98)"}
    X0 = [[ability_z[i]] for i in range(len(item))]
    X1 = [[ability_z[i], group[i]] for i in range(len(item))]
    inter = [ability_z[i] * group[i] for i in range(len(item))]
    X2 = [[ability_z[i], group[i], inter[i]] for i in range(len(item))]
    m0 = ps.logistic_regression(item, X0, ["ability"])
    m1 = ps.logistic_regression(item, X1, ["ability", "group"])
    m2 = ps.logistic_regression(item, X2, ["ability", "group", "ability:group"])
    lr_uniform = ps.lr_test(m0["loglik"], m1["loglik"], 1)
    lr_nonuniform = ps.lr_test(m1["loglik"], m2["loglik"], 1)
    lr_combined = ps.lr_test(m0["loglik"], m2["loglik"], 2)
    r2_0 = ps.nagelkerke_r2(m0["loglik"], item)
    r2_2 = ps.nagelkerke_r2(m2["loglik"], item)
    d_r2 = r2_2 - r2_0
    # Zumbo-Thomas / Jodoin-Gierl effect-size bands on Delta Nagelkerke R^2
    if d_r2 < 0.035:
        cls = "A"
    elif d_r2 < 0.070:
        cls = "B"
    else:
        cls = "C"
    if lr_combined["p_value"] >= 0.05:
        cls = "A"  # not significant -> negligible regardless of effect size
    return {
        "available": True,
        "lr_uniform": lr_uniform,
        "lr_nonuniform": lr_nonuniform,
        "lr_combined": lr_combined,
        "delta_nagelkerke_r2": d_r2,
        "effect_class": cls,
        "beta_group": m1["beta"][m1["names"].index("group")],
    }


def dif(ds: Dataset, cfg: Dict[str, Any]) -> Dict[str, Any]:
    group_var = cfg.get("group_var", "subgroup_demo")
    focal = cfg.get("focal", "focal")
    reference = cfg.get("reference", "reference")
    prefix = cfg.get("item_prefix", "nt_")
    purify = bool(cfg.get("purify", True))
    min_stratum = int(cfg.get("min_stratum", 2))

    if not ds.has(group_var):
        return {"available": False, "reason": f"no group var '{group_var}'"}
    matrix, item_cols = ds.item_matrix(prefix)
    if not item_cols:
        return {"available": False, "reason": f"no item columns '{prefix}'"}

    groups = ds.categorical(group_var)
    keep = [i for i in range(ds.n) if groups[i] in (focal, reference)]
    focal_flags = [groups[i] == focal for i in keep]
    items = [[matrix[i][j] for i in keep] for j in range(len(item_cols))]
    n_focal = sum(1 for f in focal_flags if f)
    n_ref = len(keep) - n_focal

    def run_pass(matching_totals: List[float]) -> List[Dict[str, Any]]:
        match_int = [int(round(t)) for t in matching_totals]
        ability_z = _zscore(matching_totals)
        group_num = [1.0 if f else 0.0 for f in focal_flags]
        out = []
        for j, col in enumerate(item_cols):
            item = items[j]
            mh = ps.mantel_haenszel(item, focal_flags, match_int, min_stratum=min_stratum)
            lr = _logistic_dif_item(item, ability_z, group_num)
            out.append({"item": col, "mh": mh, "logistic": lr,
                        "p_correct": ps.mean(item)})
        return out

    totals = [sum(items[j][k] for j in range(len(item_cols))) for k in range(len(keep))]
    pass1 = run_pass(totals)

    purified_items: List[int] = []
    pass_final = pass1
    if purify:
        for j, res in enumerate(pass1):
            cls = res["mh"].get("ets_class")
            lcls = res["logistic"].get("effect_class") if res["logistic"].get("available") else "A"
            if cls in ("B", "C") or lcls in ("B", "C"):
                purified_items.append(j)
        if purified_items:
            keepset = set(purified_items)
            totals_pure = [
                sum(items[j][k] for j in range(len(item_cols)) if j not in keepset)
                for k in range(len(keep))
            ]
            pass_final = run_pass(totals_pure)

    # summaries
    def summarize(passres: List[Dict[str, Any]]) -> Dict[str, Any]:
        mh_class = {"A": 0, "B": 0, "C": 0, "NA": 0}
        log_class = {"A": 0, "B": 0, "C": 0, "NA": 0}
        flagged = []
        for res in passres:
            mh_class[res["mh"].get("ets_class", "NA")] += 1
            if res["logistic"].get("available"):
                log_class[res["logistic"]["effect_class"]] += 1
            else:
                log_class["NA"] += 1
            if res["mh"].get("ets_class") in ("B", "C") or \
               (res["logistic"].get("available") and res["logistic"]["effect_class"] in ("B", "C")):
                flagged.append(res["item"])
        return {"mh_class_counts": mh_class, "logistic_class_counts": log_class,
                "flagged_items": flagged}

    return {
        "available": True,
        "group_var": group_var, "focal": focal, "reference": reference,
        "n_focal": n_focal, "n_reference": n_ref,
        "purified": purify,
        "purified_out_items": [item_cols[j] for j in purified_items],
        "pass1": pass1,
        "final": pass_final,
        "summary_pass1": summarize(pass1),
        "summary_final": summarize(pass_final),
    }


# ---------------------------------------------------------------------------
# Subgroup equity funnel (adverse-impact / 4-5ths)
# ---------------------------------------------------------------------------

def equity_funnel(ds: Dataset, cfg: Dict[str, Any]) -> Dict[str, Any]:
    measure = cfg.get("selection_measure", "newtest_total")
    if not ds.has(measure):
        return {"available": False, "reason": f"no measure '{measure}'"}
    values = ds.numeric(measure)
    threshold = resolve_threshold(values, cfg.get("cut", {"type": "percentile", "value": 90}))
    sel = selected_mask(values, threshold)
    four_fifths = float(cfg.get("four_fifths", 0.80))

    groups_out = []
    for var in cfg.get("subgroups", []):
        if not ds.has(var):
            continue
        cats = ds.categorical(var)
        levels: Dict[str, Dict[str, Any]] = {}
        for i in range(ds.n):
            lv = cats[i]
            d = levels.setdefault(lv, {"n": 0, "selected": 0})
            d["n"] += 1
            if sel[i]:
                d["selected"] += 1
        for d in levels.values():
            d["selection_rate"] = d["selected"] / d["n"] if d["n"] else float("nan")
        max_rate = max((d["selection_rate"] for d in levels.values()
                        if d["selection_rate"] == d["selection_rate"]), default=float("nan"))
        rows = []
        for lv, d in sorted(levels.items()):
            air = (d["selection_rate"] / max_rate) if max_rate and max_rate > 0 else float("nan")
            rows.append({
                "level": lv, "n": d["n"], "selected": d["selected"],
                "selection_rate": d["selection_rate"],
                "adverse_impact_ratio": air,
                "flag_below_four_fifths": (air == air and air < four_fifths),
            })
        groups_out.append({"subgroup": var, "reference_rate": max_rate, "levels": rows})

    return {
        "available": True,
        "selection_measure": measure,
        "threshold": threshold,
        "n_selected": sum(1 for s in sel if s),
        "n": ds.n,
        "four_fifths_rule": four_fifths,
        "subgroups": groups_out,
    }


# ---------------------------------------------------------------------------
# Differential prediction (measurement invariance at the prediction level)
# ---------------------------------------------------------------------------

def differential_prediction(ds: Dataset, outcome: str, predictor: str,
                            group_var: str, focal: str, reference: str) -> Dict[str, Any]:
    if not (ds.has(outcome) and ds.has(predictor) and ds.has(group_var)):
        return {"available": False, "reason": "missing columns"}
    groups = ds.categorical(group_var)
    keep = [i for i in range(ds.n) if groups[i] in (focal, reference)]
    y = [ds.numeric(outcome)[i] for i in keep]
    x = [ds.numeric(predictor)[i] for i in keep]
    grp = [1.0 if groups[i] == focal else 0.0 for i in keep]
    base = [[x[k]] for k in range(len(keep))]
    added = [[grp[k], x[k] * grp[k]] for k in range(len(keep))]
    res = ps.incremental_validity(y, base, added, [predictor], ["group", "predictor:group"])
    return {
        "available": True,
        "outcome": outcome, "predictor": predictor, "group_var": group_var,
        "delta_r2": res["delta_r2"], "f": res["f"],
        "df1": res["df1"], "df2": res["df2"], "p_value": res["p_value"],
        "interpretation": ("A significant increment for group / interaction "
                            "suggests differential prediction (predictive bias) "
                            "across subgroups; non-significant supports predictive "
                            "invariance."),
    }


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run_all(ds: Dataset, cfg: Dict[str, Any]) -> Dict[str, Any]:
    a = cfg["analysis"]
    results: Dict[str, Any] = {}
    results["concurrent_validity"] = concurrent_validity(ds, a["correlation_pairs"])
    results["classification_agreement"] = classification_agreement(
        ds, a["agreement_pairs"], a["cuts"])
    results["reliability"] = reliability(ds, a["reliability"])
    results["ceiling_floor"] = ceiling_floor(
        ds, a["ceiling_floor"], a.get("newtest_item_prefix", "nt_"))
    results["incremental_validity"] = incremental_validity(ds, a["incremental_validity"])
    results["dif"] = dif(ds, a["dif"])
    results["equity_funnel"] = equity_funnel(ds, a["equity_funnel"])
    dcfg = a["dif"]
    results["differential_prediction"] = differential_prediction(
        ds, a.get("outcome", "criterion_eoy"),
        a["measures"].get("newtest", "newtest_total"),
        dcfg.get("group_var", "subgroup_demo"),
        dcfg.get("focal", "focal"), dcfg.get("reference", "reference"))
    return results
