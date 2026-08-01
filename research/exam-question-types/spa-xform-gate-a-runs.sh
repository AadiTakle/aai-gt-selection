#!/usr/bin/env bash
# Every harness invocation behind docs/product/STAGE2_SPA_XFORM_GATE_A.md (U5).
#
# Contains no measurement logic: it calls `pnpm exam:block-harness` with existing flags and captures
# the output. `spa-xform-gate-a-report.mjs` reads what these runs emit and prints the tables.
#
# Two conventions hold throughout and are what make the cells comparable.
#
#   * `--guessing 0.20` is the SIMULATED CHILD's floor, because SPA-XFORM-01 is 234/234 FIVE-option
#     (§3.4's tap-one-of-five, the same response grammar as SPA-ROLL-01 / SPA-FOLDNET-01 /
#     SPA-SHADOW-01). 0.20 is exact for it, and it is also the shipped `DEFAULT_GUESSING`, so on
#     THIS bank the estimator is CORRECTLY SPECIFIED in both roles. That is the material difference
#     from VER-MORPHO-01, whose four-option format left the shipped estimator wrong by 0.05.
#   * The 0.25 runs exist only so the cells line up with VER-MORPHO-01's published four-option
#     figures; the 0.00 run exists only so they line up with the floorless figures quoted in the
#     first type's own U2-U4 commit. Everything else is the harness default: 400 children per cell,
#     λ ~ N(0.06, 0.03²), θ0 ~ N(10.5, 3²), handover-noise SD 1.5, slope 1.0, target offset +1.
#
# Eight seeds everywhere it matters, because STAGE2_BANK_RECOVERY_MEASUREMENT §9 found the harness's
# default seed unrepresentative in both directions and single-seed cells carrying roughly ±0.04 of
# noise on `r` — larger than several of the differences reported here.
#
# The `--fix-probe` runs are the attribution and are the reason this script loops seeds over a probe
# the sibling runner called once: the bank-free ideal grid, this bank and the frozen-difficulty
# diagnostic all come out of ONE invocation, so looping it gives all three PAIRED on the same seed.
#
# Usage:  bash research/exam-question-types/spa-xform-gate-a-runs.sh [output-dir]
set -euo pipefail

OUT="${1:-/tmp/spa-xform-gate-a}"
mkdir -p "$OUT"
SEEDS=(20260730 11 22 33 44 55 66 77)

run() { # run <name> <args...>
  local name="$1"
  shift
  echo "  $name"
  pnpm --silent exam:block-harness -- "$@" >"$OUT/$name.txt" 2>&1 || true
}

echo "A1/A2/A3/A4 — primary: five-option responder floor, shipped estimator (correctly specified)"
for s in "${SEEDS[@]}"; do
  run "primary-seed$s" --gate-a --bank SPA-XFORM-01 --guessing 0.2 --seed "$s" --json
done

echo "THE ATTRIBUTION — bank-free ideal grid, this bank and frozen difficulty, paired per seed"
for s in "${SEEDS[@]}"; do
  run "fixprobe-seed$s" --fix-probe --bank SPA-XFORM-01 --guessing 0.2 --seed "$s"
done

echo "A1 attribution — FLU-OPCHAIN-01 at matched settings, same seeds"
for s in "${SEEDS[@]}"; do
  run "opchain-seed$s" --gate-a --bank FLU-OPCHAIN-01 --guessing 0.2 --seed "$s" --json
done

echo "A4 attribution — the bank-free ideal grid and the wired exemplar, same floor, same seeds"
for s in "${SEEDS[@]}"; do
  run "calib-seed$s" --calibrate --guessing 0.2 --seed "$s"
done

echo "Comparability — the four-option floor VER-MORPHO-01 published on, and the floorless default"
for s in "${SEEDS[@]}"; do
  run "floor0.25-seed$s" --gate-a --bank SPA-XFORM-01 --guessing 0.25 --seed "$s" --json
done
run "floor0.00-seed20260730" --gate-a --bank SPA-XFORM-01 --guessing 0 --json

echo "A4 — the recovery ladder by block length"
for n in 8 15 30 45 60; do
  for s in "${SEEDS[@]}"; do
    run "length$n-seed$s" --gate-a --bank SPA-XFORM-01 --guessing 0.2 --length "$n" --seed "$s" --json
  done
done

echo "A3 — the headroom sweep, with the population spread collapsed onto each standing"
for m in 6 8 10 11 12 13 14 15 16 17; do
  run "standing$m" --gate-a --bank SPA-XFORM-01 --guessing 0.2 \
    --theta0-mean "$m" --theta0-sd 0 --standing-noise 0 --children 100 --json
done

echo "done -> $OUT"
