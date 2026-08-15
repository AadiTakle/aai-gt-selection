#!/usr/bin/env bash
#
# The Gate A runs behind D-206, before and after, paired at matched seeds.
#
# No measurement logic lives here. Every figure is `pnpm exam:block-harness` with existing flags;
# this file exists so the table in the decision entry is a command rather than a paragraph, in the
# same way `stage2-bank-recovery-runs.sh` records the runs behind D-200's measurement report.
#
# The before/after arms are `--targeting projecting` and `--targeting level`, which are two rules
# inside ONE build of the harness. Running the two halves from two checkouts would confound the
# contrast with the harness version, which is the same argument §4.1.1 makes about the two bank arms.
#
# THREE OF THE FOUR BANKS ARE NOT ON THIS BRANCH. `SPA-XFORM-01`, `QUANT-GLYPHNUM-01` and
# `VER-MORPHO-01` are being built on `feat/stage2-spa-xform`, `feat/stage2-quant-glyphnum` and
# `feat/stage2-ver-morpho`. They are read out of those branches with `git show` into a scratch
# directory rather than copied onto this one: the banks belong to that work, and D-206 is a scoring
# change that must not carry someone else's artifact into its own diff.
#
# The responder floor is the bank's OWN option count, not one shared number:
#   FLU-OPCHAIN-01, SPA-XFORM-01, QUANT-GLYPHNUM-01   5 options -> 0.2
#   VER-MORPHO-01                                     4 options -> 0.25
# A1 asks whether the pipeline manufactures a climb with nothing left to blame, so it has to be
# asked at the floor the bank actually has.
#
# Usage: bash scripts/stage2-lambda-loop-runs.sh [output-dir]     # ~4 minutes
set -euo pipefail

OUT="${1:-/tmp/stage2-lambda-loop}"
SEEDS="20260730,11,22,33,44,55,66,77"
BANKS_TMP="$OUT/banks"
mkdir -p "$BANKS_TMP"

run() { # run <name> <args...>
  local name="$1"; shift
  echo "  $name"
  # The harness exits 1 whenever any Gate A check fails, which several of these deliberately do.
  pnpm exam:block-harness -- "$@" >"$OUT/$name.md" 2>&1 || true
}

echo "Extracting the three sibling banks (read-only, into $BANKS_TMP):"
for spec in \
  "feat/stage2-spa-xform:SPA-XFORM-01" \
  "feat/stage2-quant-glyphnum:QUANT-GLYPHNUM-01" \
  "feat/stage2-ver-morpho:VER-MORPHO-01"; do
  branch="${spec%%:*}"; bank="${spec##*:}"
  if git rev-parse --verify --quiet "$branch" >/dev/null; then
    git show "$branch:research/exam-question-types/banks/$bank.jsonl" >"$BANKS_TMP/$bank.jsonl"
    echo "  $bank <- $branch"
  else
    echo "  SKIP $bank — $branch is not in this repository"
  fi
done

echo "Gate A, before (projecting) and after (level), 8 seeds each:"
for rule in projecting level; do
  run "gateA-grid-$rule"          --gate-a --bank grid              --guessing 0.2  --targeting "$rule" --seeds "$SEEDS"
  run "gateA-opchain-$rule"       --gate-a --bank FLU-OPCHAIN-01    --guessing 0.2  --targeting "$rule" --seeds "$SEEDS"
  for spec in "SPA-XFORM-01:0.2" "QUANT-GLYPHNUM-01:0.2" "VER-MORPHO-01:0.25"; do
    bank="${spec%%:*}"; floor="${spec##*:}"
    [ -f "$BANKS_TMP/$bank.jsonl" ] || continue
    run "gateA-${bank}-$rule" --gate-a --bank "$BANKS_TMP/$bank.jsonl" \
      --guessing "$floor" --fit-guessing "$floor" --target-guessing "$floor" \
      --targeting "$rule" --seeds "$SEEDS"
  done
done

echo "The open-loop bound, for the row every arm is judged against:"
run "gateA-grid-frozen"    --gate-a --bank grid           --guessing 0.2 --targeting frozen --seeds "$SEEDS"
run "gateA-opchain-frozen" --gate-a --bank FLU-OPCHAIN-01 --guessing 0.2 --targeting frozen --seeds "$SEEDS"

echo "Every remedy costed side by side, on the bank the block runs on:"
run "fix-probe-opchain" --fix-probe --bank FLU-OPCHAIN-01

echo "Done. $OUT"
