# End goal (stretch) — item-level triple coverage

**By end of project (~2.5 weeks): every top-GT-identifying qbank item can be transferred /
represented by at least 3 different question types.**

This is the north-star the overnight fleet works toward. Breadth (>=3 types per area per age
band) is the floor; this item-level goal is the ceiling.

## Target set

`catalog/top_gt_items.jsonl` — the "top GT-identifying" subset of the committed qbank.

**Selection rule (adjustable):** an item is "top-GT" if its `tail_discrimination` mentions
`high` (i.e., it is among the best at separating the gifted tail). The sponsor can widen or
tighten this (e.g., add strong `advantage_vs_cogat`, or restrict by construct) in the morning;
`build`/coverage tooling will recompute automatically.

## Coverage metric (north star)

`coverage_report.py` computes, for each top-GT item, how many catalogued question types can
**represent** it — where a type represents an item if the item's `construct` is in the type's
`areas`, the item's `subconstruct` is among the type's `topics_techniques_covered`, and the
item's `age_band` is in the type's `age_bands`. Progress = **% of top-GT items with >=3
representing types**. Output: `catalog/COVERAGE_REPORT.md`, plus the ranked list of
under-covered `(construct, subconstruct)` cells that later waves should target.

## How waves pursue it

1. Wave 1 = breadth floor (>=3 types per area x age band).
2. After that, waves are **coverage-driven**: prioritize new/varied types that raise
   under-covered top-GT items toward >=3 representing types (per `COVERAGE_REPORT.md`), rather
   than undirected novelty. To make the mapping work, every type must tag
   `topics_techniques_covered` using the **exact subconstruct labels from `TOPICS_BY_AREA.md`**.
