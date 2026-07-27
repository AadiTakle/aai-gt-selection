#!/usr/bin/env python3
"""Validate an EXISTING dataset (enforcing the born-synthetic guard) and report.

    python3 validate.py --data path/to/scores.csv [--config CONFIG.json]
                        [--out OUT_DIR] [--no-verify-hash]

The dataset MUST have a sibling ``<name>.manifest.json`` proving it is
born-synthetic (synthetic_only=true, validated=false). The harness refuses to
run otherwise. This is the same entry a future real-data adapter would call with
the identical schema (post-consent, once a live-data decision authorizes it).
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import dataio, pipeline  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--data", required=True, help="path to the dataset CSV")
    ap.add_argument("--config")
    ap.add_argument("--out", default=pipeline.DEFAULT_OUT)
    ap.add_argument("--no-verify-hash", action="store_true")
    args = ap.parse_args()

    cfg = pipeline.load_config(args.config)
    try:
        result = pipeline.validate_dataset(
            args.data, cfg, out_dir=args.out,
            verify_hash=not args.no_verify_hash)
    except dataio.BornSyntheticGuardError as exc:
        print("BORN-SYNTHETIC GUARD BLOCKED THIS RUN:\n", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 2

    print("Validation complete (synthetic_only=true, validated=false).")
    for line in result["guard_audit"]:
        print(f"  guard: {line}")
    for fmt, path in result["reports"].items():
        print(f"  report ({fmt}): {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
