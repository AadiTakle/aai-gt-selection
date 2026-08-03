# Recat Wave 00 — prune + recategorize to 4 domains

**Branch:** `feat/qtype-recategorization` (off `feat/exam-question-types` 2e041bf)
**Work item:** RES-013 · D-015/D-016 · serves R5, R11, H1, H4, H10

## What ran
- Wrote `CATEGORY_MAP.md` (full keep/cut/merge + per-type change-specs + 4-domain scheme).
- Collapsed `build_types.py` + `coverage_report.py` `AREAS` 7 → 4
  (`fluid_reasoning`, `verbal`, `quantitative`, `spatial`).
- Updated `README.md` areas section + prefix legend.
- Migration: pruned **251 → 54** kept types, retagged `areas` to the target
  domain, rebuilt the 4 domain shards (quant left empty for greenfield), deleted
  **197** cut demos.

## Result
- `build_types.py`: **types=54, errors=0, warnings=0**, gaps = quantitative
  (0 all bands — greenfield, expected).
- Domain counts: fluid=15, verbal=16, spatial=23, quantitative=0.
- Coverage re-baseline (`coverage_report.py`): **38/160 top-GT ≥3 types (23%)**,
  down from the pre-cut 100% — an intentional drop. Recovery path: greenfield
  quant + re-tagging kept types' `topics_techniques_covered` to full range in
  finalize. WM/PS/complementary items are now cross-cutting and not separately
  targeted.

## Next
- Wave 01a: metric framework redesign (`METRIC_FRAMEWORK.md` + `measurements.json`).
- Wave 01b: PS/game-based warrant memo (`PS_GAMEBASED_WARRANT.md`) → PS decision.
- Wave 01c: greenfield quant specs.
- Wave 02+: build fleet (demo rebuilds by domain, 3D spatial wave, new quant demos).
