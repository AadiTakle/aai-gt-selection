# Overnight wave protocol (for the orchestrator on each wake)

**North star (see `END_GOAL.md`):** drive every top-GT item in `catalog/top_gt_items.jsonl`
to >=3 representing question types. Breadth is the floor; item coverage is the goal.

The run self-perpetuates. On **every wake** — a subagent completion notification OR a
heartbeat tick — do this:

1. **Check the `RUN` sentinel.** If `research/exam-question-types/RUN` is gone → **STOP**:
   run a final `build_types.py`, commit, kill the heartbeat loop and await it, report. Do
   not launch new waves.
2. **If the current wave still has agents in flight**, do nothing but wait (avoid
   double-launching). Track in-flight/finished counts in `waves/WAVE_STATE.json`.
3. **When a wave's agents have all finished:**
   a. Run `python3 build_types.py` then `python3 coverage_report.py`.
   b. Commit: `research(qtypes): wave <N> — <k> new types, coverage <...>` (include specs,
      demos, catalog, measurements.json, MEASUREMENTS.md, waves/wave_<N>.md).
   c. Open `catalog/INDEX.md` → read the coverage matrix + GAPS.
4. **Pick the next wave:**
   - **Breadth/fill** — if any area x band cell has `<3` types, launch targeted fill agents
     for those cells.
   - **Coverage-driven** — once the breadth floor is met, read `catalog/COVERAGE_REPORT.md`
     and launch agents that invent NEW, VARIED types raising the most under-covered top-GT
     `(construct, subconstruct)` cells toward >=3 representing types (include cross-cutting
     game-based types that span constructs). **Dedupe** against existing `type_id`s/names in
     `catalog/master_types.jsonl`. Keep going for variety even after every cell reaches 3.
5. **Launch the next wave** (background), bump the wave counter in `WAVE_STATE.json`, re-arm
   the heartbeat, log `waves/wave_<N>.md`.

## Invariants every agent must honor

- Write ONLY your own `specs/types_<area>.jsonl` (append) and your `demos/<type_id>.html`
  files. Never edit shared files or another agent's shard. Never run git.
- Read `catalog/master_types.jsonl` first and DO NOT duplicate an existing `type_id`/name.
- Tag `topics_techniques_covered` using the EXACT subconstruct labels from `TOPICS_BY_AREA.md`
  so the item->type coverage mapping in `coverage_report.py` works.
- Every type: all schema fields (README) + a working self-contained demo with a live
  telemetry panel + >=2 referenced measurement IDs + >=1 learning-science principle with a
  real named source + honor the self-teach (<10s wordless demo + unscored warm-up) rule.
- Number `type_id`s continuing from the highest existing index for that area prefix.

## Stop

`RUN` present = keep going. Delete `RUN` (or user says "stop") = wind down cleanly at the
next wake. Heartbeat is a fallback; subagent-completion notifications are the primary wake.
