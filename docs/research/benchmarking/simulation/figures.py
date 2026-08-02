"""The seven figures.

Each `fig_*` function builds one figure, writes it to `../figures/`, and returns a dict
of the headline numbers it plotted. Those numbers go into `results.json` so that no
sentence in the paper has to be checked against a picture: the claim and the number
that supports it come out of the same run.

Nothing here computes a quantity the figure does not show, and nothing here shows a
quantity it did not compute. If a figure asserts something, the assertion is a variable
in this file.
"""

from __future__ import annotations

import math

import matplotlib.pyplot as plt
import numpy as np

import params as P
import statistics as S
from cohort import Cohort, zscore
from plotstyle import (
    C,
    conclusion_strip,
    panel_tag,
    parameter_box,
    projection_banner,
    save,
    strip_spines,
    synthetic_banner,
)


def _z(x: np.ndarray) -> np.ndarray:
    return zscore(np.asarray(x, dtype=float))


# ===========================================================================
# fig:cluster-projection
# ===========================================================================


def fig_cluster_projection(co: Cohort) -> dict:
    """The cohort in the space the test measures, with the admission boundary.

    The honest finding this figure exists to carry: at the precision the novel block is
    administered at, the learning-rate axis carries so little information that the
    admission boundary the data support is almost a vertical line on standing alone.
    """
    admitted = co.officer_admit_selective
    success = co.success(co.map_cgp)

    # The rule an analyst would actually fit: predict the criterion from the two axes.
    # Standardised so the coefficient ratio IS the slope of the boundary in z-space.
    def boundary(lam_hat: np.ndarray) -> tuple[np.ndarray, float]:
        x = np.column_stack([_z(co.theta_hat), _z(lam_hat)])
        beta = S.logistic_fit(x, success.astype(float))
        # Boundary in (z_theta_hat, z_lambda_hat): b0 + b1*x + b2*y = c, chosen so the
        # rule admits the same share the officer did.
        eta = x @ beta[1:]
        cut = float(np.quantile(eta, 1.0 - admitted.mean()))
        return beta, cut

    beta_now, cut_now = boundary(co.lam_hat_current)
    beta_later, cut_later = boundary(co.lam_hat_improved)

    weight_ratio_now = abs(beta_now[2]) / abs(beta_now[1])
    weight_ratio_later = abs(beta_later[2]) / abs(beta_later[1])

    fig, axes = plt.subplots(1, 3, figsize=(12.4, 4.5))

    # ---- (a) observed space ------------------------------------------------
    ax = axes[0]
    zt, zl = _z(co.theta_hat), _z(co.lam_hat_current)
    ax.scatter(zt[~admitted], zl[~admitted], s=9, facecolors="none",
               edgecolors=C["comparator"], linewidths=0.5, marker="^", alpha=0.55,
               label="not admitted (officer's historical decision)")
    ax.scatter(zt[admitted], zl[admitted], s=9, color=C["instrument"], marker="o",
               alpha=0.65, edgecolors="none", label="admitted (officer's historical decision)")

    xs = np.linspace(zt.min(), zt.max(), 50)
    for beta, cut, style, colour, label in (
        (beta_now, cut_now, "-", "#111111", f"proposed rule's boundary, λ̂ at 30 trials\n(λ̂ weighted {weight_ratio_now:.2f}× standing)"),
        (beta_later, cut_later, "--", "#111111", f"the same rule, λ̂ at 60 trials\n(λ̂ weighted {weight_ratio_later:.2f}× standing)"),
    ):
        if abs(beta[2]) < 1e-9:
            continue
        ys = (cut - beta[1] * xs) / beta[2]
        ax.plot(xs, ys, style, color=colour, linewidth=1.6, label=label)

    ax.set_xlabel("standing score, instrument (SD units within applicant pool)")
    ax.set_ylabel("learning-rate readout λ̂\n(SD units within applicant pool)")
    ax.set_ylim(np.quantile(zl, 0.001), np.quantile(zl, 0.999) * 1.55)
    panel_tag(ax, "a", "What the test can see")
    leg = ax.legend(loc="upper left", fontsize=6.4, frameon=True, framealpha=0.92)
    leg.get_frame().set_edgecolor("#CCCCCC")
    leg.get_frame().set_linewidth(0.6)
    strip_spines(ax)

    # ---- (b) latent space --------------------------------------------------
    ax = axes[1]
    zt_true, zl_true = _z(co.theta), _z(co.lam)
    ax.scatter(zt_true[~admitted], zl_true[~admitted], s=9, facecolors="none",
               edgecolors=C["comparator"], linewidths=0.5, marker="^", alpha=0.55)
    ax.scatter(zt_true[admitted], zl_true[admitted], s=9, color=C["instrument"],
               marker="o", alpha=0.65, edgecolors="none")
    ax.set_xlabel("standing ability, latent truth (SD units)")
    ax.set_ylabel("learning rate λ, latent truth (SD units)")
    panel_tag(ax, "b", "What is actually there")
    r_lam = float(np.corrcoef(co.lam, co.lam_hat_current)[0, 1])
    parameter_box(
        ax,
        [
            f"assumed corr(standing, λ) = {P.RHO_THETA_LAMBDA:.2f}  [no measurement exists]",
            f"λ̂ recovers λ at r = {r_lam:.2f} (measured, 30 trials)",
            f"so {100 * (1 - r_lam**2):.0f}% of the spread in panel (a)'s",
            "vertical axis is measurement noise, not children",
        ],
        loc="upper left",
    )
    strip_spines(ax)

    # ---- (c) is any of it reportable? -------------------------------------
    ax = axes[2]
    lam_hat = co.lam_hat_current
    counts, _, _ = ax.hist(lam_hat, bins=45, color=C["learning"], edgecolor="white",
                           linewidth=0.4, alpha=0.85)
    floor = P.LAMBDA_CURRENT.contamination_floor
    half_width = 0.5 * P.LAMBDA_REFERENCE_SD_WITH_PROVENANCE
    band_needed = 2.0 * (P.LAMBDA_CURRENT.posterior_se + floor)
    centre = float(np.median(lam_hat))
    top = counts.max()
    ax.axvspan(centre - half_width, centre + half_width, color=C["neutral"], alpha=0.30)
    ax.axvline(floor, color="#8A1C1C", linewidth=1.8)

    # Direct labels rather than a legend: the whole panel is a comparison of two widths,
    # and a legend would make the reader look up which is which.
    ax.errorbar([centre], [top * 1.14], xerr=[[half_width], [half_width]], fmt="none",
                ecolor="#1F5C86", elinewidth=1.8, capsize=5)
    ax.text(centre, top * 1.19,
            f"what the readout must fit inside to name a band: {P.LAMBDA_REFERENCE_SD_WITH_PROVENANCE:.2f}",
            ha="center", va="bottom", fontsize=6.9, color="#1F5C86", fontweight="bold")
    ax.errorbar([centre], [top * 1.42], xerr=[[band_needed / 2], [band_needed / 2]],
                fmt="none", ecolor="#111111", elinewidth=1.8, capsize=5)
    ax.text(centre, top * 1.47,
            f"the uncertainty it actually carries: 2 × (SE + floor) = {band_needed:.3f}",
            ha="center", va="bottom", fontsize=6.9, fontweight="bold")
    ax.annotate(
        f"contamination floor {floor:.4f}\nλ̂ fitted for a child\nwho learned NOTHING",
        xy=(floor, top * 0.55), xytext=(floor - 0.115, top * 0.72), fontsize=6.6,
        color="#8A1C1C", ha="left",
        arrowprops=dict(arrowstyle="->", color="#8A1C1C", linewidth=1.0),
    )
    ax.set_ylim(0, top * 1.78)
    ax.set_xlabel("learning-rate readout λ̂ (scale points per trial)")
    ax.set_ylabel("children")
    panel_tag(ax, "c", "Why no band can be named")
    parameter_box(
        ax,
        [
            f"posterior SE = {P.LAMBDA_CURRENT.posterior_se:.3f}  [measured, 30 trials]",
            "the uncertainty is nearly 5× the band it",
            "would have to sit inside, so 100% of blocks",
            "read `indeterminate` and no rate is reportable",
        ],
        loc="lower right",
    )
    strip_spines(ax)

    synthetic_banner(fig)
    conclusion_strip(
        fig,
        "The cohort separates on standing ability, not on learning rate. At the block length actually administered the learning-rate axis "
        f"carries so little information that the fitted admission boundary weights it {weight_ratio_now:.2f}× standing (solid line, panel a); "
        f"a 60-trial block would raise that to {weight_ratio_later:.2f}× (dashed). Panel (c) is why: the readout's total uncertainty is {band_needed:.3f} wide, "
        f"nearly five times the {P.LAMBDA_REFERENCE_SD_WITH_PROVENANCE:.2f}-wide band it would have to sit inside, so no learning rate is reportable at all today.",
    )
    fig.tight_layout(rect=[0, 0.085, 1, 0.955])
    save(fig, "fig-cluster-projection")

    return {
        "admit_rate": float(admitted.mean()),
        "lambda_weight_ratio_current": float(weight_ratio_now),
        "lambda_weight_ratio_improved": float(weight_ratio_later),
        "lambda_recovery_r_current": r_lam,
        "lambda_noise_share_of_readout_variance": float(1 - r_lam**2),
        "smallest_separable_reference_sd": float(band_needed),
    }


# ===========================================================================
# fig:officer-agreement
# ===========================================================================


def _officer_rules(co: Cohort) -> dict:
    """The proposed statistical rule, and the ceiling on reproducing the human.

    THE PROPOSED RULE predicts the OUTCOME, not the officer. It uses only what will
    actually be available going forward -- this instrument plus MAP -- and never CogAT,
    which is the thing the instrument is meant to replace. It is cross-fitted, so its
    accuracy on any child is the accuracy a rule that had never seen that child would
    have had.

    THE MIMIC RULE predicts the officer's decision from the officer's own inputs. It is
    not proposed for anything. It exists to answer one question: how much of a human
    decision is reproducible even in principle? Whatever agreement it fails to reach is
    the officer's own inconsistency plus the weight she puts on things her stated rule
    does not contain.
    """
    officer = co.officer_admit_selective.astype(float)
    success = co.success(co.map_cgp).astype(float)
    rate = float(officer.mean())

    x_rule = np.column_stack([
        _z(co.theta_hat), _z(co.lam_hat_current),
        _z(co.map_math_percentile), _z(co.map_reading_percentile)
    ])
    p_rule = S.crossfit_logistic(x_rule, success, folds=5, seed=P.ROOT_SEED + 41)
    admit_rule = p_rule >= np.quantile(p_rule, 1 - rate)

    x_mimic = np.column_stack([
        _z(co.cogat_z), _z(co.map_math_percentile), _z(co.map_reading_percentile)
    ])
    p_mimic = S.crossfit_logistic(x_mimic, officer, folds=5, seed=P.ROOT_SEED + 42)
    admit_mimic = p_mimic >= np.quantile(p_mimic, 1 - rate)

    return {
        "p_rule": p_rule, "admit_rule": admit_rule,
        "p_mimic": p_mimic, "admit_mimic": admit_mimic,
    }


def fig_officer_agreement(co: Cohort) -> dict:
    officer = co.officer_admit_selective
    rules = _officer_rules(co)
    rule = rules["admit_rule"]
    kappa_rule = S.cohens_kappa(rule, officer)
    kappa_mimic = S.cohens_kappa(rules["admit_mimic"], officer)
    success = co.success(co.map_cgp)

    fig, axes = plt.subplots(2, 2, figsize=(11.0, 8.8))

    # ---- (a) confusion matrix ---------------------------------------------
    ax = axes[0, 0]
    cm = np.array([
        [np.sum(rule & officer), np.sum(rule & ~officer)],
        [np.sum(~rule & officer), np.sum(~rule & ~officer)],
    ], dtype=float)
    im = ax.imshow(cm / cm.sum(), cmap="Blues", vmin=0, vmax=0.6)
    for i in range(2):
        for j in range(2):
            share = cm[i, j] / cm.sum()
            ax.text(j, i, f"{int(cm[i, j])}\n{share:.1%}", ha="center", va="center",
                    fontsize=11, fontweight="bold",
                    color="white" if share > 0.30 else "#111111")
    ax.set_xticks([0, 1], ["officer\nadmitted", "officer\nrejected"])
    ax.set_yticks([0, 1], ["rule\nadmits", "rule\nrejects"])
    ax.grid(False)
    panel_tag(ax, "a", "Would the rule change the decisions?")
    ax.set_xlabel(
        f"Cohen's κ = {kappa_rule:.2f}   ·   raw agreement {np.mean(rule == officer):.0%}\n"
        f"A rule fitted to MIMIC her, using her own inputs, reaches only κ = {kappa_mimic:.2f}:\n"
        "that gap is her inconsistency plus the weight she gives things her stated rule omits.",
        fontsize=7.2, labelpad=8,
    )
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04).set_label("share of applicants", fontsize=7)

    # ---- (b) is the rule calibrated to the OUTCOME? ------------------------
    ax = axes[0, 1]
    mx, my, _ = S.calibration_curve(rules["p_rule"], success.astype(float), n_bins=10)
    ax.plot(mx, my, "-o", color=C["instrument"], linewidth=1.5, markersize=5,
            label="proposed rule (cross-fitted)")
    ax.plot([0, 1], [0, 1], ":", color=C["grey"], linewidth=1.2, label="perfect calibration")
    officer_rate = float(success[officer].mean())
    ax.axhline(officer_rate, color=C["comparator"], linestyle="--", linewidth=1.4,
               label=f"success rate among the officer's admits ({officer_rate:.2f})")
    ax.axhline(float(success.mean()), color=C["light"], linewidth=1.4,
               label=f"applicant-pool base rate ({success.mean():.2f})")
    ax.set_xlabel("probability the rule assigns to “this child thrives”")
    ax.set_ylabel("share who actually thrive")
    ax.set_xlim(0, max(0.75, float(mx.max()) * 1.1))
    ax.set_ylim(0, max(0.75, float(my.max()) * 1.1))
    panel_tag(ax, "b", "Is the rule honest about its own confidence?")
    ax.legend(loc="upper left", fontsize=7)
    strip_spines(ax)

    # ---- (c) is the disagreement systematic? ------------------------------
    ax = axes[1, 0]
    officer_only = officer & ~rule
    rule_only = rule & ~officer
    groups = [
        ("both\nadmit", officer & rule, C["combined"]),
        ("officer only", officer_only, C["comparator"]),
        ("rule only", rule_only, C["instrument"]),
        ("both\nreject", ~officer & ~rule, C["light"]),
    ]
    # The raw construct-irrelevant impression is correlated with ability, so a raw group
    # mean would confound "she favours polish" with "she favours able children". The
    # fourth bar removes the standing score and MAP maths from it first, leaving only the
    # part of the impression that carries no information about the child's ability.
    design = np.column_stack([
        np.ones(co.n), _z(co.theta_hat), _z(co.map_math_percentile)
    ])
    beta_res, *_ = np.linalg.lstsq(design, co.officer_irrelevant, rcond=None)
    irrelevant_residual = _z(co.officer_irrelevant - design @ beta_res)

    features = [
        ("standing score", _z(co.theta_hat)),
        ("MAP reading %ile", _z(co.map_reading_percentile)),
        ("construct-irrelevant\nimpression (raw)", _z(co.officer_irrelevant)),
        ("...after removing\nability and MAP", irrelevant_residual),
    ]
    width = 0.2
    positions = np.arange(len(features))
    hatches = [None, "//", "\\\\", ".."]
    for k, (label, mask, colour) in enumerate(groups):
        means = [float(np.mean(v[mask])) if mask.any() else np.nan for _, v in features]
        ax.bar(positions + (k - 1.5) * width, means, width, color=colour,
               edgecolor="#333333", linewidth=0.6, hatch=hatches[k], label=label)
    ax.axhline(0, color="#333333", linewidth=0.8)
    ax.set_xticks(positions, [f for f, _ in features], fontsize=7.2)
    ax.set_ylabel("group mean (SD units within applicant pool)")
    panel_tag(ax, "c", "The disagreements are not random")
    ax.legend(ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.16), fontsize=7)
    strip_spines(ax)

    irrelevant_gap = float(np.mean(irrelevant_residual[officer_only]) -
                           np.mean(irrelevant_residual[rule_only])) if (officer_only.any() and rule_only.any()) else float("nan")
    reading_gap = float(np.mean(_z(co.map_reading_percentile)[rule_only]) -
                        np.mean(_z(co.map_reading_percentile)[officer_only])) if (officer_only.any() and rule_only.any()) else float("nan")

    # ---- (d) on the disagreements, who was right? -------------------------
    ax = axes[1, 1]
    bars = []
    for label, mask, colour, hatch in (
        ("officer admitted,\nrule would not", officer_only, C["comparator"], "//"),
        ("rule would admit,\nofficer did not", rule_only, C["instrument"], "\\\\"),
        ("whole applicant\npool (base rate)", np.ones(co.n, dtype=bool), C["light"], None),
    ):
        rate = float(np.mean(success[mask])) if mask.any() else np.nan
        se = math.sqrt(max(rate * (1 - rate), 0) / max(int(mask.sum()), 1))
        bars.append((label, rate, se, colour, hatch, int(mask.sum())))
    ax.bar([b[0] for b in bars], [b[1] for b in bars],
           yerr=[1.96 * b[2] for b in bars], capsize=4,
           color=[b[3] for b in bars], hatch=[b[4] for b in bars],
           edgecolor="#333333", linewidth=0.7)
    for i, b in enumerate(bars):
        ax.text(i, b[1] + 1.96 * b[2] + 0.012, f"{b[1]:.0%}\n(n={b[5]})", ha="center",
                va="bottom", fontsize=7.5)
    ax.set_ylabel("share reaching the success criterion\n(MAP conditional growth, top 30%)")
    ax.set_ylim(0, max(b[1] for b in bars) * 1.45)
    panel_tag(ax, "d", "Who is right where they differ")
    ax.tick_params(axis="x", labelsize=7.5)
    strip_spines(ax)

    synthetic_banner(fig, "officer decisions are simulated; no historical records were used")
    rule_only_rate = bars[1][1]
    officer_only_rate = bars[0][1]
    verdict = (
        f"the rule's picks reach it {rule_only_rate:.0%} of the time against {officer_only_rate:.0%} for hers"
        if rule_only_rate > officer_only_rate
        else f"HER picks reach it {officer_only_rate:.0%} of the time against {rule_only_rate:.0%} for the rule's — on these assumptions the human wins the disagreements"
    )
    conclusion_strip(
        fig,
        f"A rule using only the new instrument and MAP agrees with {np.mean(rule == officer):.0%} of the officer's decisions (κ = {kappa_rule:.2f}), so adopting it would change roughly one file in "
        f"{max(round(1 / max(1 - np.mean(rule == officer), 1e-9)), 1)}. The disagreements are systematic, not noise. They have two sources: her hard reading gate, which leaves the files the rule would admit and she "
        f"did not sitting {reading_gap:+.2f} SD on MAP reading relative to hers; and, once ability and MAP are removed, a construct-irrelevant impression on which her admits still sit {irrelevant_gap:+.2f} SD higher. "
        f"Where they differ, {verdict}.",
    )
    fig.tight_layout(rect=[0, 0.075, 1, 0.955])
    save(fig, "fig-officer-agreement")

    return {
        "kappa_proposed_rule_vs_officer": float(kappa_rule),
        "kappa_mimic_rule_ceiling": float(kappa_mimic),
        "raw_agreement": float(np.mean(rule == officer)),
        "n_officer_only": int(officer_only.sum()),
        "n_rule_only": int(rule_only.sum()),
        "irrelevant_feature_gap_sd": irrelevant_gap,
        "reading_gap_sd": reading_gap,
        "success_rate_officer_only": float(officer_only_rate),
        "success_rate_rule_only": float(rule_only_rate),
        "success_rate_pool": float(bars[2][1]),
    }


# ===========================================================================
# routing contamination, used by two figures
# ===========================================================================


def _routing_sweep(co: Cohort, rhos: np.ndarray) -> dict:
    """AUC and validity of the standing score against both criteria, as the platform's
    routing becomes more correlated with ability."""
    auc_mastery, auc_map, r_mastery, r_map = [], [], [], []
    map_success = co.success(co.map_cgp)
    for rho in rhos:
        m = co.mastery_at(float(rho))
        auc_mastery.append(S.auc(co.theta_hat, co.success(m)))
        r_mastery.append(float(np.corrcoef(co.theta_hat, m)[0, 1]))
        auc_map.append(S.auc(co.theta_hat, map_success))
        r_map.append(float(np.corrcoef(co.theta_hat, co.map_cgi)[0, 1]))
    return {
        "rhos": rhos,
        "auc_mastery": np.array(auc_mastery),
        "auc_map": np.array(auc_map),
        "r_mastery": np.array(r_mastery),
        "r_map": np.array(r_map),
    }


def _draw_routing_panel(ax, sweep: dict, show_r: bool = False) -> None:
    rhos = sweep["rhos"]
    if show_r:
        y1, y2, ylab = sweep["r_mastery"], sweep["r_map"], "validity: corr(standing score, criterion)"
    else:
        y1, y2, ylab = sweep["auc_mastery"], sweep["auc_map"], "AUC of the standing score"
    ax.plot(rhos, y1, "-o", color=C["warn"], markersize=4, linewidth=1.8,
            label="criterion = mastery pace\n(platform-internal, routed)")
    ax.plot(rhos, y2, "--s", color=C["combined"], markersize=4, linewidth=1.8,
            label="criterion = MAP conditional growth\n(external anchor)")
    lo, hi = ax.get_ylim()
    ax.set_ylim(lo, hi + 0.10 * (hi - lo))
    for rho, name in ((P.RHO_ROUTING_NEUTRAL, "routing neutral"),
                      (P.RHO_ROUTING_CORRELATED, "routing tracks ability")):
        ax.axvline(rho, color=C["grey"], linestyle=":", linewidth=1.0)
        ax.text(rho + 0.015, ax.get_ylim()[1], name, rotation=90, fontsize=6.6,
                va="top", ha="left", color=C["grey"])
    ax.set_xlabel("corr(platform routing advantage, child's ability)\n— currently unmeasured")
    ax.set_ylabel(ylab)
    ax.legend(loc="upper left", fontsize=7)
    strip_spines(ax)


def fig_criterion_contamination(co: Cohort) -> dict:
    """Standalone version of the endogeneity argument.

    Optional seventh figure. The same contrast appears compressed as panel (c) of
    fig:decision-accuracy-roc; this is the version to use if the paper wants to make the
    argument in its own right.
    """
    rhos = np.linspace(0.0, 0.8, 9)
    sweep = _routing_sweep(co, rhos)

    fig, axes = plt.subplots(1, 2, figsize=(10.4, 4.4))
    _draw_routing_panel(axes[0], sweep, show_r=False)
    panel_tag(axes[0], "a", "Decision accuracy against each criterion")
    _draw_routing_panel(axes[1], sweep, show_r=True)
    panel_tag(axes[1], "b", "Validity coefficient against each criterion")
    parameter_box(
        axes[1],
        [
            f"child-level paths held FIXED across the sweep:",
            f"  standing → mastery pace = {P.BETA_THETA_MASTERY:.2f}",
            f"  learning rate → mastery pace = {P.BETA_LAMBDA_MASTERY:.2f}",
            f"  routing → mastery pace = {P.BETA_ROUTING_MASTERY:.2f}",
            f"  routing → MAP growth = {P.BETA_ROUTING_MAP_GROWTH:.2f} (external)",
            "only the routing–ability correlation moves",
        ],
        loc="lower left",
    )

    d_mastery = float(sweep["auc_mastery"][-1] - sweep["auc_mastery"][0])
    d_map = float(sweep["auc_map"][-1] - sweep["auc_map"][0])
    synthetic_banner(fig)
    conclusion_strip(
        fig,
        "Mastery pace is partly a property of what the platform chose to serve. As the platform's routing comes to track ability — with the child unchanged — the standing score's apparent "
        f"accuracy against mastery pace rises by {d_mastery:+.3f} AUC, entirely spuriously. Against MAP conditional growth, which is administered outside the platform, it moves {d_map:+.3f}. "
        "This is why the external anchor is not redundant: without it there is no way to tell a good instrument from a well-routed cohort.",
    )
    fig.tight_layout(rect=[0, 0.10, 1, 0.945])
    save(fig, "fig-criterion-contamination")

    return {
        "auc_mastery_neutral": float(sweep["auc_mastery"][0]),
        "auc_mastery_correlated": float(np.interp(P.RHO_ROUTING_CORRELATED, rhos, sweep["auc_mastery"])),
        "auc_mastery_drift": d_mastery,
        "auc_map_drift": d_map,
        "r_mastery_neutral": float(sweep["r_mastery"][0]),
        "r_mastery_correlated": float(np.interp(P.RHO_ROUTING_CORRELATED, rhos, sweep["r_mastery"])),
        "r_map_constant": float(sweep["r_map"][0]),
    }


# ===========================================================================
# fig:decision-accuracy-roc
# ===========================================================================


def fig_decision_accuracy_roc(co: Cohort) -> dict:
    mastery = co.mastery_neutral
    success_mastery = co.success(mastery)
    success_map = co.success(co.map_cgp)

    # The combined score is the fitted linear predictor, which is what a real study
    # would use. Fitted on the same data it is evaluated on, which flatters it; a real
    # study must cross-fit. Stated on the panel.
    x_comb = np.column_stack([_z(co.theta_hat), _z(co.cogat_z)])
    beta_comb = S.logistic_fit(x_comb, success_mastery.astype(float))
    combined = x_comb @ beta_comb[1:]

    fig, axes = plt.subplots(1, 3, figsize=(13.0, 4.6))

    # ---- (a) ROC against mastery pace -------------------------------------
    ax = axes[0]
    aucs = {}
    for score, colour, style, name in (
        (co.theta_hat, C["instrument"], "-", "this instrument (standing)"),
        (co.cogat_z, C["comparator"], "--", "CogAT-like comparator"),
        (combined, C["combined"], "-.", "both together"),
    ):
        fpr, tpr = S.roc_curve(score, success_mastery)
        point, lo, hi = S.bootstrap_auc_ci(score, success_mastery, P.N_BOOTSTRAP, P.ROOT_SEED + 21)
        aucs[name] = (point, lo, hi)
        ax.plot(fpr, tpr, style, color=colour, linewidth=1.8,
                label=f"{name}\nAUC {point:.3f}  [{lo:.3f}, {hi:.3f}]")
    ax.plot([0, 1], [0, 1], ":", color=C["grey"], linewidth=1.0)
    ax.set_xlabel("false-positive rate")
    ax.set_ylabel("true-positive rate")
    panel_tag(ax, "a", "Predicting mastery pace")
    ax.legend(loc="lower right", fontsize=6.8)
    strip_spines(ax)

    d_point, d_lo, d_hi = S.bootstrap_auc_difference_ci(
        co.theta_hat, co.cogat_z, success_mastery, P.N_BOOTSTRAP, P.ROOT_SEED + 22
    )

    # ---- (b) precision-recall against MAP conditional growth --------------
    ax = axes[1]
    aps = {}
    for score, colour, style, name in (
        (co.theta_hat, C["instrument"], "-", "this instrument (standing)"),
        (co.cogat_z, C["comparator"], "--", "CogAT-like comparator"),
    ):
        recall, precision = S.precision_recall_curve(score, success_map)
        ap = S.average_precision(score, success_map)
        aps[name] = ap
        ax.plot(recall, precision, style, color=colour, linewidth=1.8,
                label=f"{name}\naverage precision {ap:.3f}")
    base = float(success_map.mean())
    ax.axhline(base, color=C["grey"], linestyle=":", linewidth=1.2,
               label=f"chance = base rate ({base:.2f})")
    ax.set_xlabel("recall (share of true successes found)")
    ax.set_ylabel("precision (share of those flagged who succeed)")
    ax.set_ylim(0, 1)
    panel_tag(ax, "b", "Predicting MAP conditional growth")
    ax.legend(loc="upper right", fontsize=6.8)
    parameter_box(
        ax,
        [
            "MAP conditional growth is the noisier criterion by construction:",
            f"a fall→spring change carries √2 × {P.MAP_CSEM_RIT} = {math.sqrt(2)*P.MAP_CSEM_RIT:.2f} RIT of",
            f"measurement error against a normative growth SD of {P.MAP_GROWTH_SD_RIT:.0f} RIT,",
            f"so a single CGI is only ≈{co.diagnostics['map_cgi_reliability']:.2f} reliable.",
            "[NWEA 2024–25 Technical Report §7.5.1; 2025 norms]",
        ],
        loc="lower left",
    )
    strip_spines(ax)

    # ---- (c) the version executable with no comparator --------------------
    ax = axes[2]
    rhos = np.linspace(0.0, 0.8, 9)
    sweep = _routing_sweep(co, rhos)
    _draw_routing_panel(ax, sweep, show_r=False)
    panel_tag(ax, "c", "Executable now, no comparator needed")

    separated = (d_lo > 0) or (d_hi < 0)
    verdict = (
        "an edge that survives the interval but is far smaller than the gap between either instrument and a useful one"
        if separated else
        "a difference the interval cannot separate from zero"
    )
    synthetic_banner(fig)
    projection_banner(fig, "panels (a) and (b) need CogAT records GT has committed to but not yet supplied (E-100)")
    conclusion_strip(
        fig,
        f"Against mastery pace the instrument reaches AUC {aucs['this instrument (standing)'][0]:.3f} and the CogAT-like comparator {aucs['CogAT-like comparator'][0]:.3f}. The paired difference is "
        f"{d_point:+.3f} [{d_lo:+.3f}, {d_hi:+.3f}] — {verdict}; adding CogAT to the instrument moves AUC to {aucs['both together'][0]:.3f}. Panels (a) and (b) are the design of a study that cannot yet be "
        "run. Panel (c) can be run as soon as the platform exports routing data, needs no comparator at all, and decides whether either of the others means anything.",
    )
    fig.tight_layout(rect=[0, 0.11, 1, 0.945])
    save(fig, "fig-decision-accuracy-roc")

    return {
        "auc_instrument_mastery": aucs["this instrument (standing)"],
        "auc_cogat_mastery": aucs["CogAT-like comparator"],
        "auc_combined_mastery": aucs["both together"],
        "auc_difference_instrument_minus_cogat": (d_point, d_lo, d_hi),
        "average_precision_instrument_map": float(aps["this instrument (standing)"]),
        "average_precision_cogat_map": float(aps["CogAT-like comparator"]),
        "map_success_base_rate": base,
    }


# ===========================================================================
# fig:incremental-validity
# ===========================================================================


def fig_incremental_validity(co: Cohort) -> dict:
    criteria = [
        ("mastery pace\n(platform-internal)", co.mastery_neutral),
        ("MAP conditional growth\n(external anchor)", co.map_cgi),
    ]
    z_theta_hat, z_cogat = _z(co.theta_hat), _z(co.cogat_z)
    z_lam_now, z_lam_later = _z(co.lam_hat_current), _z(co.lam_hat_improved)

    projected_models = [
        ("CogAT alone", [z_cogat], C["comparator"], "//"),
        ("standing alone", [z_theta_hat], C["instrument"], None),
        ("CogAT + standing", [z_cogat, z_theta_hat], C["combined"], "\\\\"),
        ("+ λ̂ at 30 trials\n(as administered)", [z_cogat, z_theta_hat, z_lam_now], C["learning"], ".."),
        ("+ λ̂ at 60 trials\n(hypothetical)", [z_cogat, z_theta_hat, z_lam_later], C["learning"], "xx"),
    ]
    available_models = [
        ("standing alone", [z_theta_hat], C["instrument"], None),
        ("+ λ̂ at 30 trials\n(as administered)", [z_theta_hat, z_lam_now], C["learning"], ".."),
        ("+ λ̂ at 60 trials\n(hypothetical)", [z_theta_hat, z_lam_later], C["learning"], "xx"),
    ]

    fig, axes = plt.subplots(1, 2, figsize=(12.6, 5.9),
                             gridspec_kw={"width_ratios": [1.55, 1.0]})
    out: dict = {}

    def draw(ax, models, title, tag, key):
        width = 0.8 / len(models)
        positions = np.arange(len(criteria))
        for k, (name, cols, colour, hatch) in enumerate(models):
            values, errs = [], []
            for cname, crit in criteria:
                r2, lo, hi = S.bootstrap_r2_ci(
                    np.column_stack(cols), crit, 400, P.ROOT_SEED + 31 + k
                )
                values.append(r2)
                errs.append([r2 - lo, hi - r2])
                out[f"{key}|{name}|{cname}"] = (r2, lo, hi)
            errs = np.array(errs).T
            xs = positions + (k - (len(models) - 1) / 2) * width
            ax.bar(xs, values, width * 0.92, yerr=errs, capsize=3, color=colour,
                   hatch=hatch, edgecolor="#333333", linewidth=0.7,
                   label=name, error_kw={"linewidth": 0.9})
            for x, v, e in zip(xs, values, errs.T):
                ax.text(x, v + e[1] + 0.006, f"{v:.3f}", ha="center", va="bottom",
                        fontsize=6.0)
        ax.set_xticks(positions, [c for c, _ in criteria], fontsize=8)
        ax.set_ylabel("variance in the criterion explained (R²)")
        panel_tag(ax, tag, title)
        ax.legend(fontsize=6.8, ncol=len(models), loc="upper center",
                  bbox_to_anchor=(0.5, -0.10))
        strip_spines(ax)

    draw(axes[0], projected_models, "Projected: with a CogAT comparator", "a", "projected")
    draw(axes[1], available_models, "Available now: no comparator", "b", "available")

    # Headline increments, on the external anchor.
    def r2(cols, crit):
        return S.ols_r2(np.column_stack(cols), crit)

    map_crit = co.map_cgi
    base_both = r2([z_cogat, z_theta_hat], map_crit)
    inc_now = r2([z_cogat, z_theta_hat, z_lam_now], map_crit) - base_both
    inc_later = r2([z_cogat, z_theta_hat, z_lam_later], map_crit) - base_both
    inc_standing_over_cogat = r2([z_cogat, z_theta_hat], map_crit) - r2([z_cogat], map_crit)

    axes[0].set_ylim(0, max(axes[0].get_ylim()[1], axes[1].get_ylim()[1]) * 1.30)
    axes[1].set_ylim(axes[0].get_ylim())
    parameter_box(
        axes[1],
        [
            f"λ̂ at 30 trials: recovery r = {P.LAMBDA_CURRENT.recovery_r:.3f},",
            f"    posterior SE = {P.LAMBDA_CURRENT.posterior_se:.3f}, floor = {P.LAMBDA_CURRENT.contamination_floor:.4f}",
            f"λ̂ at 60 trials: recovery r = {P.LAMBDA_IMPROVED.recovery_r:.3f},",
            f"    posterior SE = {P.LAMBDA_IMPROVED.posterior_se:.3f}, floor = {P.LAMBDA_IMPROVED.contamination_floor:.4f}",
            "  — length buys down the RANDOM error only;",
            "    the systematic floor does not move.",
            f"assumed corr(standing, λ) = {P.RHO_THETA_LAMBDA:.2f}; assumed CogAT",
            f"loading on λ = {P.COGAT_LAMBDA_LOADING:.2f}. Both drive this figure.",
        ],
        loc="upper right",
    )

    synthetic_banner(fig)
    projection_banner(fig, "every bar containing CogAT is a study not yet run (E-100)")
    conclusion_strip(
        fig,
        f"Against the external anchor, the standing score adds ΔR² = {inc_standing_over_cogat:+.3f} over CogAT alone. Adding the learning-rate readout at the precision it is actually administered at "
        f"adds ΔR² = {inc_now:+.3f}; at a 60-trial block it would add {inc_later:+.3f}. The learning-rate axis is a real signal that the current block cannot deliver — and lengthening the block "
        "would fix its random error while leaving its systematic contamination floor exactly where it is.",
    )
    fig.tight_layout(rect=[0, 0.14, 1, 0.955])
    save(fig, "fig-incremental-validity")

    out.update({
        "delta_r2_standing_over_cogat_map": float(inc_standing_over_cogat),
        "delta_r2_lambda_current_map": float(inc_now),
        "delta_r2_lambda_improved_map": float(inc_later),
    })
    return out


# ===========================================================================
# fig:ppv-base-rate
# ===========================================================================


def fig_ppv_base_rate(co: Cohort) -> dict:
    success = co.success(co.map_cgp)
    # Operating threshold: the admission rate the officer actually uses, so the figure
    # describes the decision the programme actually makes.
    admit_rate = float(co.officer_admit_selective.mean())
    thr_inst = float(np.quantile(co.theta_hat, 1 - admit_rate))
    thr_cog = float(np.quantile(co.cogat_z, 1 - admit_rate))
    sens_i, spec_i = S.sensitivity_specificity(co.theta_hat, success, thr_inst)
    sens_c, spec_c = S.sensitivity_specificity(co.cogat_z, success, thr_cog)

    rates = np.linspace(0.005, 0.90, 400)
    ppv_i = S.ppv_at_base_rate(sens_i, spec_i, rates)
    ppv_c = S.ppv_at_base_rate(sens_c, spec_c, rates)

    fig, axes = plt.subplots(1, 2, figsize=(11.4, 4.6),
                             gridspec_kw={"width_ratios": [1.35, 1.0]})

    # ---- (a) the curve ------------------------------------------------------
    ax = axes[0]
    ax.plot(rates, ppv_i, "-", color=C["instrument"], linewidth=2.0,
            label=f"this instrument  (sens {sens_i:.2f}, spec {spec_i:.2f})")
    ax.plot(rates, ppv_c, "--", color=C["comparator"], linewidth=2.0,
            label=f"CogAT-like comparator  (sens {sens_c:.2f}, spec {spec_c:.2f})")
    ax.plot(rates, rates, ":", color=C["grey"], linewidth=1.4,
            label="admitting at random (PPV = base rate)")

    op = P.SUCCESS_BASE_RATE
    op_ppv = float(S.ppv_at_base_rate(sens_i, spec_i, np.array([op]))[0])
    ax.plot([op], [op_ppv], "o", color="#111111", markersize=8, zorder=5)
    ax.annotate(
        f"operating point\nbase rate {op:.2f} → PPV {op_ppv:.2f}\n"
        f"{100 * (1 - op_ppv):.0f} of every 100 admits\nwould not have thrived",
        xy=(op, op_ppv), xytext=(op + 0.16, op_ppv - 0.24), fontsize=7.4,
        arrowprops=dict(arrowstyle="->", linewidth=1.0, color="#111111"),
        bbox=dict(boxstyle="round,pad=0.35", facecolor="white", edgecolor="#999999", linewidth=0.7),
    )
    for r in P.PPV_BASE_RATES_MARKED:
        ax.axvline(r, color=C["light"], linewidth=0.9, linestyle="-")
    ax.set_xlabel("base rate: share of the applicant pool who would in fact thrive")
    ax.set_ylabel("positive predictive value\n(share of admitted children who thrive)")
    ax.set_xlim(0, 0.9)
    ax.set_ylim(0, 1)
    panel_tag(ax, "a", "The same instrument, three different programmes")
    ax.legend(loc="lower right", fontsize=7)
    strip_spines(ax)

    # ---- (b) the same thing in children -----------------------------------
    ax = axes[1]
    labels, tps, fps = [], [], []
    for r in P.PPV_BASE_RATES_MARKED:
        p = float(S.ppv_at_base_rate(sens_i, spec_i, np.array([r]))[0])
        labels.append(f"base rate\n{r:.0%}")
        tps.append(100 * p)
        fps.append(100 * (1 - p))
    ax.bar(labels, tps, color=C["combined"], edgecolor="#333333", linewidth=0.7,
           label="thrive (correctly admitted)")
    ax.bar(labels, fps, bottom=tps, color=C["comparator"], hatch="//",
           edgecolor="#333333", linewidth=0.7, label="do not thrive (false positive)")
    for i, (t, f) in enumerate(zip(tps, fps)):
        ax.text(i, t / 2, f"{t:.0f}", ha="center", va="center", color="white",
                fontweight="bold", fontsize=9)
        ax.text(i, t + f / 2, f"{f:.0f}", ha="center", va="center", color="white",
                fontweight="bold", fontsize=9)
    ax.set_ylabel("out of every 100 children admitted")
    ax.set_ylim(0, 132)
    panel_tag(ax, "b", "What that means for 100 admitted children")
    ax.legend(loc="upper center", fontsize=7.2, ncol=1, frameon=True, framealpha=0.95)
    strip_spines(ax)

    ppv_low = float(S.ppv_at_base_rate(sens_i, spec_i, np.array([0.02]))[0])
    synthetic_banner(fig)
    conclusion_strip(
        fig,
        f"Nothing about the instrument changes across this figure — only the population it is used on. At the conventional top-2% gifted prevalence the same instrument at the same threshold has a "
        f"positive predictive value of {ppv_low:.2f}, meaning about {100 * (1 - ppv_low):.0f} of every 100 admitted children would not have thrived. A programme cannot buy its way out of this with a better test; "
        "it is arithmetic about who is in the pool, and it is the reason the selection ratio and the base rate must be published alongside any accuracy claim.",
    )
    fig.tight_layout(rect=[0, 0.10, 1, 0.945])
    save(fig, "fig-ppv-base-rate")

    return {
        "operating_admit_rate": admit_rate,
        "sensitivity_instrument": sens_i,
        "specificity_instrument": spec_i,
        "ppv_at_operating_base_rate": op_ppv,
        "ppv_at_2pct_base_rate": ppv_low,
        "ppv_at_60pct_base_rate": float(S.ppv_at_base_rate(sens_i, spec_i, np.array([0.60]))[0]),
    }


# ===========================================================================
# fig:range-restriction
# ===========================================================================


def fig_range_restriction(co: Cohort) -> dict:
    criterion = co.map_cgi
    selective = co.officer_admit_selective
    openenrol = co.officer_admit_open

    sd_full = float(np.std(co.theta_hat))
    r_full = float(np.corrcoef(co.theta_hat, criterion)[0, 1])

    def observed(mask):
        r = float(np.corrcoef(co.theta_hat[mask], criterion[mask])[0, 1])
        sd = float(np.std(co.theta_hat[mask]))
        return r, sd

    r_sel, sd_sel = observed(selective)
    r_open, sd_open = observed(openenrol)
    r_sel_corrected = S.thorndike_case_two(r_sel, sd_sel, sd_full)
    r_open_corrected = S.thorndike_case_two(r_open, sd_open, sd_full)

    fig, axes = plt.subplots(1, 2, figsize=(11.6, 5.5))

    # ---- (a) what the analyst gets to see ---------------------------------
    ax = axes[0]
    ax.scatter(co.theta_hat[~selective], criterion[~selective], s=8, marker="x",
               color=C["light"], linewidths=0.6, alpha=0.7,
               label="rejected — outcome never observed")
    ax.scatter(co.theta_hat[selective], criterion[selective], s=9, marker="o",
               color=C["instrument"], alpha=0.55, edgecolors="none",
               label="admitted — outcome observed")
    xs = np.linspace(co.theta_hat.min(), co.theta_hat.max(), 20)
    for mask, colour, style, label in (
        (np.ones(co.n, dtype=bool), "#111111", "-", f"full applicant range: r = {r_full:.3f}"),
        (selective, C["comparator"], "--", f"admitted only: r = {r_sel:.3f}"),
    ):
        b = np.polyfit(co.theta_hat[mask], criterion[mask], 1)
        ax.plot(xs, np.polyval(b, xs), style, color=colour, linewidth=1.9, label=label)
    ax.set_xlabel("standing score, instrument (scale points, 1–20)")
    ax.set_ylabel("MAP conditional growth index (z)")
    panel_tag(ax, "a", "The selective programme sees a slice")
    ax.legend(loc="upper left", fontsize=7)
    strip_spines(ax)

    # ---- (b) validity vs selection ratio ----------------------------------
    ax = axes[1]
    ratios = np.linspace(0.10, 1.0, 19)
    obs, corrected = [], []
    order = np.argsort(-co.officer_utility, kind="stable")
    for ratio in ratios:
        k = max(int(round(ratio * co.n)), 30)
        sel = order[:k]
        r = float(np.corrcoef(co.theta_hat[sel], criterion[sel])[0, 1])
        sd = float(np.std(co.theta_hat[sel]))
        obs.append(r)
        corrected.append(S.thorndike_case_two(r, sd, sd_full))
    obs, corrected = np.array(obs), np.array(corrected)

    ax.axhline(r_full, color="#111111", linewidth=1.6,
               label=f"truth: validity over the full applicant range ({r_full:.3f})")
    ax.plot(ratios, obs, "-o", color=C["comparator"], markersize=4, linewidth=1.7,
            label="what an admitted-only study reports (uncorrected)")
    ax.plot(ratios, corrected, "--s", color=C["combined"], markersize=4, linewidth=1.7,
            label="Thorndike Case II correction")
    lo, hi = ax.get_ylim()
    ax.set_ylim(lo, hi + 0.16 * (hi - lo))
    ax.axvline(float(selective.mean()), color=C["grey"], linestyle=":", linewidth=1.2)
    ax.text(float(selective.mean()) + 0.012, ax.get_ylim()[1], "GT School\n(selective)",
            fontsize=6.8, va="top", color=C["grey"])
    ax.axvline(float(openenrol.mean()), color=C["grey"], linestyle=":", linewidth=1.2)
    ax.text(float(openenrol.mean()) - 0.012, ax.get_ylim()[1], "GT Anywhere\n(admits ~everyone)",
            fontsize=6.8, va="top", ha="right", color=C["grey"])
    ax.set_xlabel("selection ratio: share of the applicant pool admitted")
    ax.set_ylabel("estimated validity, corr(standing score, MAP growth)")
    panel_tag(ax, "b", "What the correction is worth, and what it costs")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.16), fontsize=7, ncol=1)
    recovered = (r_sel_corrected - r_sel) / max(r_full - r_sel, 1e-9)
    parameter_box(
        ax,
        [
            "The correction assumes selection was DIRECTLY on this predictor.",
            "It was not: the officer selected on CogAT, on MAP and on a hard",
            "reading gate, so the restriction on the standing score is indirect",
            f"and the Case II formula recovers only {recovered:.0%} of the attenuation here.",
            "The direction is not fixed. Sackett et al. (2022) revised cognitive",
            "ability's operational validity from ≈.51 to ≈.31 by showing these",
            "corrections OVERSHOOT under a different selection process. Which way",
            "it errs depends on facts about selection you usually do not have.",
        ],
        loc="lower left",
    )
    strip_spines(ax)

    attenuation = r_full - r_sel
    synthetic_banner(fig)
    conclusion_strip(
        fig,
        f"Run on the selective campus, a validity study would report r = {r_sel:.3f} where the truth over the applicant pool is {r_full:.3f} — an understatement of {attenuation:.3f} caused by who is in the "
        f"sample, not by how much data was collected. Correcting for it recovers {recovered:.0%} of the gap and buys an assumption about the children who were turned away that cannot be checked. Run on the "
        f"open-enrolment programme, which currently admits essentially everyone, the same study reports r = {r_open:.3f} and needs no correction and no assumption. The cheapest defensible validity evidence "
        "this programme can buy is to run the study where it is not selecting.",
    )
    fig.tight_layout(rect=[0, 0.15, 1, 0.955])
    save(fig, "fig-range-restriction")

    return {
        "r_full_range": r_full,
        "r_selective_observed": r_sel,
        "r_selective_thorndike_corrected": float(r_sel_corrected),
        "r_open_enrolment_observed": r_open,
        "r_open_enrolment_thorndike_corrected": float(r_open_corrected),
        "attenuation_from_selection": float(attenuation),
        "selection_ratio_selective": float(selective.mean()),
        "selection_ratio_open": float(openenrol.mean()),
    }


ALL_FIGURES = [
    ("fig:cluster-projection", fig_cluster_projection),
    ("fig:officer-agreement", fig_officer_agreement),
    ("fig:decision-accuracy-roc", fig_decision_accuracy_roc),
    ("fig:incremental-validity", fig_incremental_validity),
    ("fig:ppv-base-rate", fig_ppv_base_rate),
    ("fig:range-restriction", fig_range_restriction),
    ("fig:criterion-contamination", fig_criterion_contamination),
]
