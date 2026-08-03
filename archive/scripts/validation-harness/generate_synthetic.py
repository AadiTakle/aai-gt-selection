#!/usr/bin/env python3
"""Generate ONLY the born-synthetic dataset (CSV + manifest); no analysis.

    python3 generate_synthetic.py [--config CONFIG.json] [--out OUT_DIR]
                                  [--seed N] [--n N] [--name NAME]
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import pipeline  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--config")
    ap.add_argument("--out", default=pipeline.DEFAULT_OUT)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--n", type=int)
    ap.add_argument("--name", default="synthetic_scores")
    args = ap.parse_args()

    cfg = pipeline.load_config(args.config)
    if args.seed is not None:
        cfg["seed"] = args.seed
    if args.n is not None:
        cfg["generation"]["n_students"] = args.n

    paths = pipeline.generate_dataset(cfg, out_dir=args.out, name=args.name)
    print("Born-synthetic dataset written (synthetic_only=true, validated=false):")
    print(f"  csv     : {paths['csv']}")
    print(f"  manifest: {paths['manifest']}")
    print(f"  sha256  : {paths['sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
