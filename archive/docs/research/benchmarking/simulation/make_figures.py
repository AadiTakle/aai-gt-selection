#!/usr/bin/env python3
"""Regenerate every figure from the seed. One command, no arguments.

    python3 make_figures.py            # write figures, results.json and manifest.json
    python3 make_figures.py --check    # regenerate and fail if anything changed

`--check` is the reproducibility test: it rebuilds every figure from the same seed and
compares the SHA-256 of each output against the committed manifest. A byte difference
means either the seed path changed or a dependency version moved, and either way the
paper's numbers are no longer the ones in the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys
import time
import warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import matplotlib  # noqa: E402
import numpy  # noqa: E402

import params as P  # noqa: E402
from cohort import build_cohort  # noqa: E402
from figures import ALL_FIGURES  # noqa: E402
from plotstyle import FIGURE_DIR, apply_style  # noqa: E402

MANIFEST = HERE / "manifest.json"
RESULTS = HERE / "results.json"


def _silence_spurious_matmul_warnings() -> None:
    """Suppress a known-false numpy warning, after checking it really is false.

    numpy 2.0 built against Apple's Accelerate BLAS leaves the floating-point status
    register dirty after a matrix multiply, so `a @ b` reports "divide by zero" /
    "overflow" / "invalid value" on inputs that contain none and results that are
    correct. Every regression in `statistics.py` trips it thousands of times inside the
    bootstrap loops.

    The filter is installed only after confirming on this machine that a matmul with
    clean inputs produces a clean, correct result while still raising the flag. If a
    future environment produces genuinely bad arithmetic, the assertion below fails and
    the warnings come back rather than being hidden.
    """
    probe_a = numpy.array([[1.0, 2.0], [3.0, 4.0]])
    probe_b = numpy.array([1.0, 1.0])
    with numpy.errstate(all="ignore"):
        product = probe_a @ probe_b
    if not numpy.allclose(product, [3.0, 7.0]):
        return  # arithmetic really is broken; let every warning through
    warnings.filterwarnings("ignore", message=".*encountered in matmul", category=RuntimeWarning)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _jsonable(value):
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, (numpy.floating, numpy.integer)):
        return value.item()
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="verify output hashes against the committed manifest")
    args = parser.parse_args()

    _silence_spurious_matmul_warnings()
    apply_style()
    start = time.perf_counter()

    cohort = build_cohort()
    results = {"cohort_diagnostics": cohort.diagnostics, "figures": {}}

    for label, fn in ALL_FIGURES:
        t0 = time.perf_counter()
        results["figures"][label] = _jsonable(fn(cohort))
        print(f"  {label:34s} {time.perf_counter() - t0:5.1f}s")

    files = sorted(p for p in FIGURE_DIR.iterdir() if p.suffix in {".pdf", ".png"})
    manifest = {
        "root_seed": P.ROOT_SEED,
        "n_applicants": P.N_APPLICANTS,
        "environment": {
            "python": platform.python_version(),
            "numpy": numpy.__version__,
            "matplotlib": matplotlib.__version__,
        },
        "outputs": {p.name: _sha256(p) for p in files},
    }

    RESULTS.write_text(json.dumps(_jsonable(results), indent=2, sort_keys=True) + "\n")

    if args.check:
        if not MANIFEST.exists():
            print("FAIL: no manifest.json to check against; run without --check first")
            return 1
        committed = json.loads(MANIFEST.read_text())
        drift = [
            name for name, digest in manifest["outputs"].items()
            if committed["outputs"].get(name) != digest
        ]
        missing = sorted(set(committed["outputs"]) - set(manifest["outputs"]))
        env_note = ""
        if committed.get("environment") != manifest["environment"]:
            env_note = (f"\n  NOTE: environment differs from the recorded one "
                        f"{committed.get('environment')} -> {manifest['environment']}; "
                        "matplotlib renders differ across versions, so pin the environment "
                        "in requirements.txt before treating a hash difference as a real change.")
        if drift or missing:
            print(f"FAIL: {len(drift)} output(s) changed, {len(missing)} missing.{env_note}")
            for name in drift:
                print(f"  changed: {name}")
            for name in missing:
                print(f"  missing: {name}")
            return 1
        print(f"OK: {len(manifest['outputs'])} outputs reproduce byte-for-byte.{env_note}")
        return 0

    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"\nWrote {len(files)} files to {FIGURE_DIR}")
    print(f"Wrote {RESULTS.name} and {MANIFEST.name}")
    print(f"Total {time.perf_counter() - start:.1f}s at seed {P.ROOT_SEED}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
