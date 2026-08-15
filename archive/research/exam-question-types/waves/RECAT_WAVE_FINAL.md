# Recat Finalize — build fleet complete + coverage re-baseline

**Branch:** `feat/qtype-recategorization` · **Work item:** RES-013 · D-015/D-016 · R5,R11,H1,H4,H10

## Waves run (this overnight session)
- **0** prune 251→54 keepers, collapse to 4 domains (`CATEGORY_MAP.md`).
- **1a** automated metric framework (`METRIC_FRAMEWORK.md`, `measurements.json`).
- **1b** PS/game-based warrant → **Rec B** (cut PS; speed = engagement-gated signal).
- **2** 12 greenfield quantitative specs.
- **3–11** demo build fleet: spatial 3D (cubes/views, fold/slice), spatial planning,
  visuospatial WM games, verbal A+B, fluid A+B, quant demos A.
- **12** quant demos B.
- **finalize** full-content-range topic re-tag (+23 tags) + `app.html` regen.

## Final catalog state
- **66 types** across the 4 domains: fluid_reasoning 15, verbal 16, quantitative 12,
  spatial 23. (`processing_speed`/`working_memory` are cross-cutting signals, not domains.)
- **63 measurements** (fully automated; no human-in-the-loop; no self-report).
- `build_types.py`: **0 errors, 0 warnings, 0 gaps**.
- **Breadth floor RESTORED**: every domain × age band ≥3 types (K-1: fluid 6 / verbal 8 /
  quant 6 / spatial 7; all higher bands ≥11).
- **66 demos present, 0 missing**; all rebuilt/new demos JS-syntax-validated (`node --check`).

## Coverage re-baseline (honest)
North-star item metric (`coverage_report.py`, top-GT items with ≥3 representing types):

- **Before recat:** 100% (251-type catalog, 7 areas).
- **After recat:** **52/160 = 32%** overall (66 types, 4 domains). Intentional drop.

Why the drop is by design (not a regression):
- **52 of 160 top-GT items have demoted/cut constructs** — `working_memory` (25),
  `complementary` (15), `processing_speed` (12) — which are no longer domain-targeted
  (WM is a cross-cutting signal; PS cut per the warrant; complementary folded/cut).
  Under the area-gated coverage matcher these items are, by design, no longer counted.
- Of the **108 coverable-domain items** (fluid/verbal/quant/spatial/game_based), **52
  reach ≥3 reps (48%)**; per construct: fluid 13/17, verbal 10/20, quant 14/21,
  spatial 9/21, game_based 6/29.
- Cells like `spatial/mental_rotation`, `verbal/antonyms_synonyms`, `fluid/odd_one_out`
  stay <3 because the recat deliberately CUT the redundant near-duplicate types that
  used to pad them (e.g. SPA-ROTATE/ROTPAIR/KOHS, VER-OPPOSITE/SHADES, FLU-ODDBALL).
  Reaching ≥3 there again would mean re-adding redundancy the recat exists to remove.

**Interpretation:** item-level triple-coverage was the *old* stretch north-star for a
breadth-maximizing catalog. Under D-015 the north-star is **Timeback-fit learning-rate
screening** with a curated, adaptive, fully-automated 4-domain catalog. The re-baselined
32% (48% of coverable items) reflects an intentional breadth→depth/curation trade, with
the breadth floor still guaranteed. Not a validity claim; a discovery-coverage figure.

## Not done / deferred (by design)
- New young-verbal types were NOT added: breadth floor already met at K-1/2-3 (verbal 8/14).
- PS types NOT restored (warrant Rec B).
- Governance: RES-013/D-015/D-016 are cited per the brief but not present on this base
  branch (`feat/exam-question-types`); the traceability matrix is out of edit scope and
  already carries the row on the canonical branch.
