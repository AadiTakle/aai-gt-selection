"""End-to-end pipeline: generate (synthetic) -> guard+load -> analyze -> report.

Structure-agnostic and born-synthetic by construction. ``validate_dataset`` is
the reusable core that a future real-data adapter would call (post-consent) with
the SAME schema; ``generate_dataset`` is just one (synthetic) data source.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
from typing import Any, Dict, Optional

from . import analyses, config as config_mod, dataio, report, synth

HARNESS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT = os.path.join(HARNESS_DIR, "out")


def _utc() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_config(path: Optional[str]) -> Dict[str, Any]:
    cfg = config_mod.default_config()
    if path:
        with open(path, "r") as fh:
            override = json.load(fh)
        cfg = config_mod.merge(cfg, override)
    return cfg


def generate_dataset(cfg: Dict[str, Any], out_dir: str = DEFAULT_OUT,
                     name: str = "synthetic_scores") -> Dict[str, str]:
    columns, data, ground_truth = synth.generate(cfg)
    paths = dataio.write_dataset(out_dir, name, columns, data, cfg, ground_truth)
    return paths


def validate_dataset(csv_path: str, cfg: Dict[str, Any], out_dir: str = DEFAULT_OUT,
                     report_name: str = "validation_report",
                     verify_hash: bool = True) -> Dict[str, Any]:
    ds, guard_audit = dataio.load_dataset(csv_path, verify_hash=verify_hash)
    results = analyses.run_all(ds, cfg)

    ctx = {
        "title": cfg.get("report", {}).get("title", "Cognitive-Test Validation Report (SYNTHETIC)"),
        "generated_utc": _utc(),
        "manifest": ds.manifest,
        "config": cfg,
        "results": results,
        "guard_audit": guard_audit,
    }

    os.makedirs(out_dir, exist_ok=True)
    written = {}
    formats = cfg.get("report", {}).get("formats", ["md", "html"])
    for fmt in formats:
        text = report.render(ctx, fmt)
        path = os.path.join(out_dir, f"{report_name}.{fmt}")
        with open(path, "w") as fh:
            fh.write(text)
        written[fmt] = path

    results_path = os.path.join(out_dir, f"{report_name}.results.json")
    with open(results_path, "w") as fh:
        json.dump({"generated_utc": ctx["generated_utc"], "manifest_summary": {
            "synthetic_only": ds.manifest.get("synthetic_only"),
            "validated": ds.manifest.get("validated"),
            "seed": ds.manifest.get("seed"),
            "dataset_sha256": ds.manifest.get("dataset_sha256"),
            "n_rows": ds.manifest.get("n_rows"),
        }, "results": results}, fh, indent=2, default=str)
    written["results"] = results_path

    return {
        "reports": written,
        "guard_audit": guard_audit,
        "n": ds.n,
        "summary": _console_summary(results, ds),
    }


def run_end_to_end(cfg: Dict[str, Any], out_dir: str = DEFAULT_OUT) -> Dict[str, Any]:
    gen = generate_dataset(cfg, out_dir=out_dir)
    val = validate_dataset(gen["csv"], cfg, out_dir=out_dir)
    val["dataset"] = gen
    return val


def _console_summary(results: Dict[str, Any], ds) -> Dict[str, Any]:
    cv = results["concurrent_validity"]["pairs"]
    iv = results["incremental_validity"]["specs"]
    dif = results["dif"]
    ef = results["equity_funnel"]
    rel = results["reliability"]
    return {
        "n": ds.n,
        "top_correlation": (max((r["pearson_r"] for r in cv), default=None)),
        "cronbach_alpha": (rel.get("cronbach_alpha", {}).get("alpha") if rel.get("available") else None),
        "incremental_specs": [
            {"added": "+".join(s["added"]), "over": "+".join(s["base"]),
             "delta_r2": s["delta_r2"], "p": s["p_value"]}
            for s in iv],
        "dif_flagged_final": (dif.get("summary_final", {}).get("flagged_items")
                              if dif.get("available") else None),
        "equity_flags": ([
            f"{g['subgroup']}:{lv['level']}"
            for g in (ef.get("subgroups", []) if ef.get("available") else [])
            for lv in g["levels"] if lv["flag_below_four_fifths"]
        ]),
    }
