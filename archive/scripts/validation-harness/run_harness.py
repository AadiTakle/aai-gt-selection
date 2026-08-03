#!/usr/bin/env python3
"""Run the validation & psychometrics harness end-to-end on SYNTHETIC data.

    python3 run_harness.py [--config CONFIG.json] [--out OUT_DIR]
                           [--seed N] [--n N]

Generates a born-synthetic dataset, enforces the fail-closed synthetic guard,
runs the full psychometric battery, and writes a validation report (md + html)
plus a machine-readable results JSON. Zero third-party dependencies.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import pipeline  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--config", help="optional JSON config override")
    ap.add_argument("--out", default=pipeline.DEFAULT_OUT, help="output directory")
    ap.add_argument("--seed", type=int, help="override generation seed")
    ap.add_argument("--n", type=int, help="override number of synthetic students")
    args = ap.parse_args()

    cfg = pipeline.load_config(args.config)
    if args.seed is not None:
        cfg["seed"] = args.seed
    if args.n is not None:
        cfg["generation"]["n_students"] = args.n

    result = pipeline.run_end_to_end(cfg, out_dir=args.out)

    print("=" * 72)
    print("GT SELECTION - EXAM VALIDATION HARNESS (SYNTHETIC ONLY)")
    print("=" * 72)
    print(f"synthetic_only=true  validated=false  (D-006, R9)")
    for line in result["guard_audit"]:
        print(f"  guard: {line}")
    print("-" * 72)
    s = result["summary"]
    print(f"N students            : {s['n']}")
    print(f"Top correlation (r)   : {s['top_correlation']}")
    print(f"Cronbach alpha        : {s['cronbach_alpha']}")
    print("Incremental validity  :")
    for spec in s["incremental_specs"]:
        print(f"    + {spec['added']} over {spec['over']}: "
              f"dR2={spec['delta_r2']:.4f}  p={spec['p']}")
    print(f"DIF flagged (final)   : {s['dif_flagged_final']}")
    print(f"Equity 4/5ths flags   : {s['equity_flags'] or 'none'}")
    print("-" * 72)
    print("Artifacts:")
    print(f"    dataset : {result['dataset']['csv']}")
    print(f"    manifest: {result['dataset']['manifest']}")
    for fmt, path in result["reports"].items():
        print(f"    report ({fmt}): {path}")
    print("=" * 72)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
