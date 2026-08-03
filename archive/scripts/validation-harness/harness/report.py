"""Render the validation results to Markdown and self-contained HTML.

The report leads with the born-synthetic banner and a global claim-boundary
note (R10), records run provenance (R7), presents every analysis with an
interpretation that states what the number does and does NOT establish, and
ends with requirement/evidence traceability and an audit-only ground-truth
recovery check.
"""

from __future__ import annotations

import html
import json
import math
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# number formatting
# ---------------------------------------------------------------------------

def _isnan(x: Any) -> bool:
    return isinstance(x, float) and math.isnan(x)


def f3(x: Any) -> str:
    if x is None or _isnan(x):
        return "n/a"
    if isinstance(x, float) and math.isinf(x):
        return "inf"
    return f"{x:.3f}"


def f2(x: Any) -> str:
    if x is None or _isnan(x):
        return "n/a"
    return f"{x:.2f}"


def pct(x: Any) -> str:
    if x is None or _isnan(x):
        return "n/a"
    return f"{x:.1f}%"


def fp(x: Any) -> str:
    if x is None or _isnan(x):
        return "n/a"
    if x < 0.001:
        return "<.001"
    return f"{x:.3f}"


# ---------------------------------------------------------------------------
# table helpers
# ---------------------------------------------------------------------------

def md_table(headers: List[str], rows: List[List[str]]) -> str:
    out = ["| " + " | ".join(headers) + " |",
           "| " + " | ".join("---" for _ in headers) + " |"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out)


def html_table(headers: List[str], rows: List[List[str]]) -> str:
    th = "".join(f"<th>{html.escape(str(h))}</th>" for h in headers)
    trs = []
    for r in rows:
        tds = "".join(f"<td>{html.escape(str(c))}</td>" for c in r)
        trs.append(f"<tr>{tds}</tr>")
    return f"<table><thead><tr>{th}</tr></thead><tbody>{''.join(trs)}</tbody></table>"


# ---------------------------------------------------------------------------
# section model: a list of blocks. Each block is a dict:
#   {"h2": str} | {"p": str} | {"note": str} | {"table": (headers, rows)}
#   | {"code": str}
# We build the block list once, then render to md or html.
# ---------------------------------------------------------------------------

def build_blocks(ctx: Dict[str, Any]) -> List[Dict[str, Any]]:
    manifest = ctx["manifest"]
    cfg = ctx["config"]
    results = ctx["results"]
    blocks: List[Dict[str, Any]] = []

    def h2(t): blocks.append({"h2": t})
    def p(t): blocks.append({"p": t})
    def note(t): blocks.append({"note": t})
    def table(h, r): blocks.append({"table": (h, r)})
    def code(t): blocks.append({"code": t})

    # -- banner / title --------------------------------------------------
    blocks.append({"banner": (
        "SYNTHETIC DATA ONLY - NOT VALIDATED - NOT A LIVE ADMISSIONS RESULT. "
        "synthetic_only=true, validated=false (D-006, R9). "
        "No real or live student data was used anywhere in this run.")})
    p(f"**Generated:** {ctx['generated_utc']}  |  **Seed:** {manifest.get('seed')}  |  "
      f"**Dataset SHA-256:** `{manifest.get('dataset_sha256','')[:16]}...`  |  "
      f"**N:** {manifest.get('n_rows')}")

    # -- what this is / isn't (global claim boundaries R10) --------------
    h2("0. What this report is - and is not")
    p("This harness evaluates the *measurement* properties of a cognitive test on "
      "**synthetic** data. It is STRUCTURE-AGNOSTIC: it consumes a per-student score "
      "table and does not assume the test is adaptive, two-stage, or fixed-form.")
    note(
        "Claim boundaries (R10): \n"
        "- Concurrent correlation and classification agreement measure *convergence "
        "with existing measures*, NOT truth and NOT program impact (E-066, E-070).\n"
        "- Reliability and ceiling/floor describe *measurement quality*, not validity "
        "of the selection decision.\n"
        "- Incremental validity here predicts a *synthetic criterion*; it is not "
        "evidence that the test predicts real outcomes or who benefits (E-070, R4).\n"
        "- DIF flags identify items for *review*; a flag is not proof of unfairness and "
        "does not by itself justify item removal.\n"
        "- Everything is synthetic and `validated=false`; no number here is a live, "
        "GT-specific, or causal claim.")

    # -- provenance (R7) -------------------------------------------------
    h2("1. Run provenance and born-synthetic guard (R7, R9)")
    for line in ctx.get("guard_audit", []):
        p(f"- Guard: {line}")
    p(f"- Generator: `{manifest.get('generator')}`  |  schema v{manifest.get('schema_version')}")
    p(f"- Source: `{manifest.get('source')}`  |  data_class: `{manifest.get('data_class')}`")

    # -- dataset overview ------------------------------------------------
    h2("2. Synthetic dataset overview")
    cols = manifest.get("columns", [])
    p(f"Columns ({len(cols)}): " + ", ".join(f"`{c}`" for c in cols[:6]) +
      (f", ... , plus {len(cols)-8} item/other columns ... , " if len(cols) > 8 else "") +
      (", ".join(f"`{c}`" for c in cols[-2:]) if len(cols) > 8 else ""))
    p("Measures under analysis: "
      + ", ".join(f"`{k}` -> `{v}`" for k, v in cfg["analysis"]["measures"].items())
      + f"; outcome `{cfg['analysis'].get('outcome')}`.")

    # -- concurrent validity --------------------------------------------
    h2("3. Concurrent validity - correlations (R5, H1)")
    cv = results["concurrent_validity"]["pairs"]
    rows = [[f"{r['x']} x {r['y']}", r["n"], f3(r["pearson_r"]),
             f"[{f3(r['ci_lo'])}, {f3(r['ci_hi'])}]", fp(r["p_value"]),
             f3(r["spearman_rho"])] for r in cv]
    table(["pair", "n", "Pearson r", "95% CI", "p", "Spearman rho"], rows)
    note("Interpretation: moderate-to-strong positive correlations indicate the new "
         "test converges with existing ability/achievement measures. Convergence supports "
         "shared-construct evidence (R5) but does not establish that the new test is "
         "*better*, nor that it measures capability rather than prior opportunity (E-018).")

    # -- classification agreement ---------------------------------------
    h2("4. Classification agreement at the cut (R5, R7)")
    ca = results["classification_agreement"]["pairs"]
    rows = []
    for r in ca:
        rows.append([
            f"{r['index_measure']} vs {r['reference_measure']}",
            r["n"], r["n_selected_index"], r["n_selected_reference"],
            pct(100 * r["overall_agreement"]), f3(r["cohen_kappa"]), f3(r["phi"]),
            f3(r["sensitivity_vs_reference"]), f3(r["specificity_vs_reference"]),
        ])
    table(["index vs reference", "n", "sel(index)", "sel(ref)", "agreement",
           "Cohen kappa", "phi", "sens vs ref", "spec vs ref"], rows)
    note("Interpretation: agreement/kappa quantify how often the new-test cut and the "
         "existing-measure cut select the SAME students. Sensitivity/specificity treat "
         "the existing measure as a *reference of convenience*, NOT ground truth - a low "
         "agreement can mean the new test surfaces different (possibly under-served) "
         "students, which may be desirable (E-005, H4). This is not validity against a "
         "true capability criterion.")

    # -- reliability -----------------------------------------------------
    h2("5. Reliability and decision consistency (R5, R6)")
    rel = results["reliability"]
    if rel.get("available"):
        a = rel["cronbach_alpha"]
        sh = rel["split_half"]
        p(f"- Cronbach's alpha = **{f3(a.get('alpha'))}** over {a.get('k_items')} items "
          f"(n={a.get('n_persons')}); SD_total={f3(a.get('sd_total'))}, "
          f"SEM={f3(a.get('sem'))}.")
        p(f"- Split-half r={f3(sh.get('r_halves'))}, Spearman-Brown="
          f"**{f3(sh.get('spearman_brown'))}**.")
        dc = rel.get("decision_consistency", {})
        if dc:
            p(f"- Decision consistency at the cut (threshold={f3(dc.get('cut_threshold'))}): "
              f"{pct(dc.get('confidently_classified_pct'))} of students are classified "
              f"outside the +/-1.96xSEM band; {pct(dc.get('ambiguous_pct'))} fall in the "
              f"ambiguous band near the cut.")
        # a few weakest items
        weak = [it for it in rel["item_stats"] if it["flag"]]
        if weak:
            rows = [[it["item"], f3(it["p_correct"]), f3(it["item_total_r"]), it["flag"]]
                    for it in weak]
            table(["item", "p correct", "item-total r", "flag"], rows)
        note("Interpretation: alpha/split-half index internal consistency; SEM and the "
             "ambiguous band show how many near-cut decisions are unstable given "
             "measurement error (R5 error handling). High reliability is necessary but "
             "not sufficient for a defensible cut; tail precision (Section 6) matters more "
             "for a gifted screen (E-066, E-067).")
    else:
        p(f"Reliability unavailable: {rel.get('reason')}")

    # -- ceiling / floor -------------------------------------------------
    h2("6. Ceiling / floor and gifted-tail precision (R6)")
    cf = results["ceiling_floor"]
    rows = []
    for m in cf["measures"]:
        rows.append([m["measure"], m["n"], f2(m["mean"]), f2(m["sd"]),
                     f2(m["min"]), f2(m["max"]), f3(m["skew"]),
                     pct(m["pct_at_observed_max"]),
                     (pct(m["pct_perfect_score"]) if m["pct_perfect_score"] is not None else "-"),
                     pct(m["pct_top_10pct_of_range"])])
    table(["measure", "n", "mean", "sd", "min", "max", "skew", "% at max",
           "% perfect", "% top-10% range"], rows)
    note("Interpretation: for a gifted screen the upper tail must stay informative "
         "(R6). A high `% perfect` or heavy left skew signals ceiling compression that "
         "would blur separation among the highest scorers; above-level items keep the "
         "ceiling open (E-066, E-067). Ceiling/floor here is descriptive of the "
         "synthetic score distribution only.")

    # -- incremental validity -------------------------------------------
    h2("7. Incremental validity - does a secondary signal add value? (H1, R5)")
    iv = results["incremental_validity"]["specs"]
    rows = []
    for s in iv:
        added_desc = "; ".join(
            f"{ap['name']} std-beta={f3(ap['std_beta'])} (p={fp(ap['p_value'])})"
            for ap in s["added_predictors"])
        rows.append([
            s["outcome"], "+".join(s["base"]), "+".join(s["added"]),
            f3(s["r2_base"]), f3(s["r2_full"]), f3(s["delta_r2"]),
            f2(s["f"]), f"{s['df1']},{s['df2']}", fp(s["p_value"]), added_desc])
    table(["outcome", "base", "added", "R2 base", "R2 full", "dR2", "F",
           "df", "p", "added predictor(s)"], rows)
    note("Interpretation: a significant Delta-R-squared means the added signal predicts "
         "the (synthetic) criterion *beyond* the base measure(s) - the core test for "
         "whether a second measure earns its place (H1: each added signal must contribute "
         "distinct, validated information). A NON-significant increment is a valid, "
         "reportable result (do not add a measure that adds nothing). This uses a "
         "synthetic criterion and is NOT evidence of real-world or benefit prediction "
         "(E-070, R4).")

    # -- DIF -------------------------------------------------------------
    h2("8. DIF / measurement invariance at the item level (H7, H2)")
    d = results["dif"]
    if d.get("available"):
        p(f"Group: `{d['group_var']}` (focal=`{d['focal']}` n={d['n_focal']}, "
          f"reference=`{d['reference']}` n={d['n_reference']}). "
          f"Two-stage purification: {'on' if d['purified'] else 'off'}.")
        s1 = d["summary_pass1"]
        sf = d["summary_final"]
        table(["pass", "MH A", "MH B", "MH C", "logistic A", "logistic B",
               "logistic C", "flagged items"],
              [["pass 1 (unpurified)", s1["mh_class_counts"]["A"],
                s1["mh_class_counts"]["B"], s1["mh_class_counts"]["C"],
                s1["logistic_class_counts"]["A"], s1["logistic_class_counts"]["B"],
                s1["logistic_class_counts"]["C"],
                ", ".join(s1["flagged_items"]) or "none"],
               ["final (purified)", sf["mh_class_counts"]["A"],
                sf["mh_class_counts"]["B"], sf["mh_class_counts"]["C"],
                sf["logistic_class_counts"]["A"], sf["logistic_class_counts"]["B"],
                sf["logistic_class_counts"]["C"],
                ", ".join(sf["flagged_items"]) or "none"]])
        # detail rows for flagged items (final pass)
        flagged_set = set(sf["flagged_items"])
        detail = [r for r in d["final"] if r["item"] in flagged_set]
        if detail:
            rows = []
            for r in detail:
                mh = r["mh"]
                lg = r["logistic"]
                rows.append([
                    r["item"], f3(r["p_correct"]),
                    f3(mh.get("alpha_mh")), f3(mh.get("delta")),
                    fp(mh.get("p_value")), mh.get("ets_class"),
                    (fp(lg["lr_uniform"]["p_value"]) if lg.get("available") else "n/a"),
                    (fp(lg["lr_nonuniform"]["p_value"]) if lg.get("available") else "n/a"),
                    (f3(lg["delta_nagelkerke_r2"]) if lg.get("available") else "n/a"),
                    (lg["effect_class"] if lg.get("available") else "n/a"),
                ])
            table(["item", "p", "MH alpha", "MH Delta", "MH p", "ETS",
                   "logit uniform p", "logit nonunif p", "logit dR2", "logit class"], rows)
        else:
            p("No items flagged B/C on the final (purified) pass.")
        note("Interpretation: Mantel-Haenszel and logistic-regression DIF ask whether, "
             "*conditional on ability*, focal and reference groups have different odds of "
             "success on an item. MH conditions on the matched total (so a group ability "
             "difference alone is NOT DIF); logistic separates uniform (main-effect) from "
             "nonuniform (interaction) DIF. Two-stage purification removes flagged items "
             "from the matching criterion and re-tests. A flag targets an item for content "
             "review (H2, H7); it is not automatic proof of bias or grounds for removal. "
             "This directly provides the adverse-impact / DIF review that D-017 lists as an "
             "open follow-up - on synthetic data.")
    else:
        p(f"DIF unavailable: {d.get('reason')}")

    # -- equity funnel ---------------------------------------------------
    h2("9. Subgroup equity funnel at the cut (H7, EV-11)")
    ef = results["equity_funnel"]
    if ef.get("available"):
        p(f"Selection measure `{ef['selection_measure']}` at threshold "
          f"{f3(ef['threshold'])}; {ef['n_selected']}/{ef['n']} selected "
          f"({pct(100*ef['n_selected']/ef['n'])}). 4/5ths rule = {ef['four_fifths_rule']}.")
        for grp in ef["subgroups"]:
            rows = []
            for lv in grp["levels"]:
                rows.append([lv["level"], lv["n"], lv["selected"],
                             pct(100 * lv["selection_rate"]),
                             f3(lv["adverse_impact_ratio"]),
                             "FLAG <4/5" if lv["flag_below_four_fifths"] else "ok"])
            blocks.append({"h3": f"Subgroup: {grp['subgroup']}"})
            table(["level", "n", "selected", "selection rate", "adverse-impact ratio",
                   "4/5ths"], rows)
        note("Interpretation: the funnel monitors *who passes the cut* by subgroup as an "
             "equity guardrail (H7). An adverse-impact ratio below 0.80 (4/5ths rule) "
             "flags a group for review. Subgroup identity is a GUARDRAIL, never a measure "
             "of capability (charter: capability, not privilege; H2). A disparity may "
             "reflect item bias (Section 8), true differences in the synthetic ability "
             "generator, or the cut - the funnel localizes where to look; it does not "
             "assign cause.")
    else:
        p(f"Equity funnel unavailable: {ef.get('reason')}")

    # -- differential prediction ----------------------------------------
    h2("10. Differential prediction across subgroups (R5, H7)")
    dp = results["differential_prediction"]
    if dp.get("available"):
        p(f"Regressing `{dp['outcome']}` on `{dp['predictor']}` + `{dp['group_var']}` + "
          f"interaction: Delta-R2={f3(dp['delta_r2'])}, F({dp['df1']},{dp['df2']})="
          f"{f2(dp['f'])}, p={fp(dp['p_value'])}.")
        note("Interpretation: this tests measurement invariance at the *prediction* level "
             "(Cleary model). A significant increment for the group / interaction terms "
             "indicates the score predicts the criterion differently across subgroups "
             "(predictive bias); a non-significant result supports predictive invariance. "
             "Structure-agnostic: it needs only a score, an outcome, and a group.")
    else:
        p(f"Differential prediction unavailable: {dp.get('reason')}")

    # -- ground-truth recovery (audit only) ------------------------------
    gt = manifest.get("synthetic_ground_truth", {})
    if gt and gt.get("injected_dif"):
        h2("11. Synthetic ground-truth recovery (audit only)")
        inj = gt["injected_dif"]
        injected = [f"nt_{i:02d}" for i in inj.get("uniform_items_1based", [])]
        injected += [f"nt_{i:02d}" for i in inj.get("nonuniform_items_1based", [])]
        flagged = results["dif"].get("summary_pass1", {}).get("flagged_items", []) \
            if results["dif"].get("available") else []
        p(f"- Injected DIF items (uniform + nonuniform): {', '.join(sorted(set(injected))) or 'none'}")
        p(f"- Harness-flagged (pass 1): {', '.join(flagged) or 'none'}")
        p(f"- Incremental-signal weight u in criterion: {gt.get('incremental_signal_u_weight')} "
          f"(0 would imply the new test should show NO incremental validity).")
        note("This section exists only to sanity-check the harness against the known "
             "synthetic truth. On real data there is no ground truth; this section would "
             "be absent. It is NOT a validity claim.")

    # -- traceability ----------------------------------------------------
    h2("12. Requirement traceability, evidence, and limitations")
    table(["requirement", "how this harness serves it"],
          [["R5 capability standard", "concurrent + incremental validity, reliability, SEM, decision consistency"],
           ["R6 growth without ceiling", "ceiling/floor + gifted-tail precision checks"],
           ["R7 auditable/falsifiable", "seeded run, SHA-256 commitment, config logged, null results reportable"],
           ["R9 protect students", "fail-closed born-synthetic guard; no real data; synthetic_only=true"],
           ["R10 claim boundaries", "explicit per-section boundaries; agreement != truth != impact"],
           ["H1 broader measures", "incremental-validity test for each added signal"],
           ["H2 capability != privilege", "DIF + funnel treat subgroup as guardrail, never capability"],
           ["H7 equity guardrails", "MH + logistic DIF, subgroup funnel, differential prediction"]])
    p("Evidence touchpoints: E-066 (evaluate at the operational tail/decision point), "
      "E-067 (nominal 'adaptive' precision is not validation), E-070 (predicting "
      "achievement != predicting who benefits), E-005/E-006 (single-screen false "
      "negatives; prior ability predictive), E-016/E-018 (MAP incremental value and ELL/"
      "SES caveats). Governance: D-006 (born-synthetic), D-017 (adverse-impact/DIF review "
      "is an open follow-up this tooling supports).")
    note("Limitations: (1) all data is synthetic; NO result is a validated or GT-specific "
         "claim (validated=false). (2) The criterion is generated, so incremental/"
         "differential-prediction results demonstrate the *method*, not real predictive "
         "validity. (3) DIF power depends on subgroup n and strata; small cells reduce "
         "sensitivity, and with many items expect occasional false-positive flags "
         "(multiple comparisons) - confirm with effect sizes, purification, and content "
         "review. (4) Pooling across grades mixes a vertically-scaled MAP; within-grade "
         "analysis is recommended on real data. (5) Real use requires consent, "
         "privacy/legal review (B-06), and psychometric validation before any live claim.")

    # -- appendix: config ------------------------------------------------
    h2("Appendix A. Full run configuration")
    code(json.dumps(cfg, indent=2))

    return blocks


# ---------------------------------------------------------------------------
# renderers
# ---------------------------------------------------------------------------

def render_markdown(ctx: Dict[str, Any]) -> str:
    blocks = build_blocks(ctx)
    out: List[str] = [f"# {ctx['title']}", ""]
    for b in blocks:
        if "banner" in b:
            out.append(f"> **[!] {b['banner']}**\n")
        elif "h2" in b:
            out.append(f"\n## {b['h2']}\n")
        elif "h3" in b:
            out.append(f"\n### {b['h3']}\n")
        elif "p" in b:
            out.append(b["p"] + "\n")
        elif "note" in b:
            note_md = "\n".join("> " + ln for ln in b["note"].split("\n"))
            out.append(note_md + "\n")
        elif "table" in b:
            headers, rows = b["table"]
            out.append(md_table(headers, rows) + "\n")
        elif "code" in b:
            out.append("```json\n" + b["code"] + "\n```\n")
    return "\n".join(out)


_HTML_CSS = """
body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
 max-width:1000px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;line-height:1.5}
h1{font-size:1.6rem} h2{margin-top:2rem;border-bottom:1px solid #ddd;padding-bottom:.25rem}
h3{margin-top:1rem;color:#333}
.banner{background:#7a0012;color:#fff;padding:.9rem 1rem;border-radius:6px;
 font-weight:700;margin:1rem 0}
.note{background:#f4f6f8;border-left:4px solid #4a6da7;padding:.6rem .9rem;
 margin:.6rem 0;white-space:pre-wrap;font-size:.92rem;color:#333}
table{border-collapse:collapse;margin:.6rem 0;font-size:.88rem;width:100%}
th,td{border:1px solid #ccc;padding:.32rem .5rem;text-align:left}
th{background:#eef2f7} tr:nth-child(even) td{background:#fafbfc}
code,pre{background:#f4f4f4;border-radius:4px} pre{padding:.8rem;overflow:auto;font-size:.8rem}
"""


def render_html(ctx: Dict[str, Any]) -> str:
    blocks = build_blocks(ctx)
    body: List[str] = [f"<h1>{html.escape(ctx['title'])}</h1>"]
    for b in blocks:
        if "banner" in b:
            body.append(f'<div class="banner">{html.escape(b["banner"])}</div>')
        elif "h2" in b:
            body.append(f"<h2>{html.escape(b['h2'])}</h2>")
        elif "h3" in b:
            body.append(f"<h3>{html.escape(b['h3'])}</h3>")
        elif "p" in b:
            body.append(f"<p>{_inline_html(b['p'])}</p>")
        elif "note" in b:
            body.append(f'<div class="note">{html.escape(b["note"])}</div>')
        elif "table" in b:
            headers, rows = b["table"]
            body.append(html_table(headers, rows))
        elif "code" in b:
            body.append(f"<pre>{html.escape(b['code'])}</pre>")
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            f"<title>{html.escape(ctx['title'])}</title>"
            f"<style>{_HTML_CSS}</style></head><body>"
            + "".join(body) + "</body></html>")


def _inline_html(text: str) -> str:
    """Escape, then re-apply a tiny subset of markdown (** bold **, ` code `)."""
    import re
    escaped = html.escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"`(.+?)`", r"<code>\1</code>", escaped)
    return escaped


def render(ctx: Dict[str, Any], fmt: str) -> str:
    if fmt == "md":
        return render_markdown(ctx)
    if fmt == "html":
        return render_html(ctx)
    raise ValueError(f"unknown report format: {fmt}")
