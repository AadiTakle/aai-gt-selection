#!/usr/bin/env bash
# Every harness invocation behind docs/product/STAGE2_VER_MORPHO_GATE_A.md (U5).
#
# Contains no measurement logic: it calls `pnpm exam:block-harness` with existing flags and captures
# the output. `ver-morpho-gate-a-report.mjs` reads the JSON these runs emit and prints the tables.
#
# Two conventions hold throughout and are what make the cells comparable.
#
#   * `--guessing 0.25` is the SIMULATED CHILD's floor, because VER-MORPHO-01 is 468/468 four-option
#     (§3.3's tap-one-of-four, borrowed from VER-CLOZE-01 / VER-RELPAIR-01). 0.25 is exact for it.
#     The 0.20 runs exist only so the cells line up with FLU-OPCHAIN-01's published figures, where a
#     five-option floor is exact; the 0.00 run exists only so they line up with the figures quoted in
#     that type's own U2-U4 commit.
#   * everything else is the harness default: 400 children per cell, λ ~ N(0.06, 0.03²),
#     θ0 ~ N(10.5, 3²), handover-noise SD 1.5, slope 1.0, target offset +1, and the shipped
#     `DEFAULT_GUESSING = 0.2` in both estimator roles.
#
# Eight seeds everywhere it matters, because STAGE2_BANK_RECOVERY_MEASUREMENT §9 found the harness's
# default seed unrepresentative in both directions and single-seed cells carrying roughly ±0.04 of
# noise on `r` — larger than several of the differences reported here.
#
# Usage:  bash research/exam-question-types/ver-morpho-gate-a-runs.sh [output-dir]
set -euo pipefail

OUT="${1:-/tmp/ver-morpho-gate-a}"
mkdir -p "$OUT"
SEEDS=(20260730 11 22 33 44 55 66 77)

run() { # run <name> <args...>
  local name="$1"
  shift
  echo "  $name"
  pnpm --silent exam:block-harness -- "$@" >"$OUT/$name.txt" 2>&1 || true
}

echo "A1/A2/A3/A4 — primary: four-option responder floor, shipped estimator"
for s in "${SEEDS[@]}"; do
  run "primary-seed$s" --gate-a --bank VER-MORPHO-01 --guessing 0.25 --seed "$s" --json
done

echo "A1 attribution — the same cohort with a correctly specified floor"
for s in "${SEEDS[@]}"; do
  run "specified-seed$s" --gate-a --bank VER-MORPHO-01 --guessing 0.25 \
    --fit-guessing 0.25 --target-guessing 0.25 --seed "$s" --json
done

echo "A1 attribution — the bank-free ideal grid and FLU-OPCHAIN-01 at matched settings"
run "fixprobe-0.25" --fix-probe --bank VER-MORPHO-01 --guessing 0.25
for s in "${SEEDS[@]}"; do
  run "opchain-seed$s" --gate-a --bank FLU-OPCHAIN-01 --guessing 0.25 --seed "$s" --json
done

echo "A4 attribution — the bank-free ideal grid and the wired exemplar, same floor, same seeds"
for s in "${SEEDS[@]}"; do
  run "calib-seed$s" --calibrate --guessing 0.25 --seed "$s"
done

echo "Comparability — five-option floor, and the floorless default"
for s in "${SEEDS[@]}"; do
  run "floor0.20-seed$s" --gate-a --bank VER-MORPHO-01 --guessing 0.2 --seed "$s" --json
done
run "floor0.00-seed20260730" --gate-a --bank VER-MORPHO-01 --guessing 0 --json

echo "A4 — the recovery ladder by block length"
for n in 8 15 30 45 60; do
  for s in "${SEEDS[@]}"; do
    run "length$n-seed$s" --gate-a --bank VER-MORPHO-01 --guessing 0.25 --length "$n" --seed "$s" --json
  done
done

echo "A3 — the headroom sweep, with the population spread collapsed onto each standing"
for m in 6 8 10 11 12 13 14 15 16 17; do
  run "standing$m" --gate-a --bank VER-MORPHO-01 --guessing 0.25 \
    --theta0-mean "$m" --theta0-sd 0 --standing-noise 0 --children 100 --json
done

echo "done -> $OUT"
