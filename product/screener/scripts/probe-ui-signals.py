#!/usr/bin/env python3
"""What can be derived about a type's UI needs from its bank alone?

Run once while authoring `packages/ui-contract/src/requirements.ts`, to see which capabilities are
inferable from content signals and which have to be declared by hand. Output is a per-type signal
table, not the final requirement set.
"""
import glob
import json
import os
from collections import defaultdict

BANKS = os.environ.get(
    "GT_QBANK_BANKS",
    os.path.join(os.path.dirname(__file__), "..", "..", "qbank-library", "banks"),
)

# Content fields that imply the response is paced or time-bounded rather than a settled choice.
PACED = {
    "timeBudgetSec", "paceMs", "responseWindowMs", "streamLength", "responseUntimed",
    "instructionSet", "exposureMs", "leadInMs", "flashDurationMs", "recallOpensAtMs",
    "presentationEndMs", "retentionDelayMs", "phaseMs", "planWindowMs", "encodeMsPerItem",
    "timeLimitSec", "glowMs",
}
SPATIAL = {"grid", "rows", "cols", "cells", "gridSize", "matrix", "walls", "R", "C", "coords"}
TEXTUAL = {"storyText", "storySentences", "sentenceFrame", "question", "prompt", "scenario",
           "text", "words", "readingLoad", "instructions", "conclusion", "howto"}
THREE_D = {"net", "faces", "solid", "slice", "plane", "cube", "blocks", "shadow", "views"}


def walk(obj, out, depth=0):
    """Collect every field name anywhere inside content."""
    if depth > 6:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            out.add(k)
            walk(v, out, depth + 1)
    elif isinstance(obj, list):
        for v in obj[:8]:
            walk(v, out, depth + 1)


rows = []
for path in sorted(glob.glob(os.path.join(BANKS, "*.jsonl"))):
    code = os.path.basename(path)[: -len(".jsonl")]
    fields, option_counts, formats, n = set(), [], set(), 0
    for line in open(path, encoding="utf8"):
        line = line.strip()
        if not line:
            continue
        n += 1
        item = json.loads(line)
        content = item.get("content", {})
        walk(content, fields)
        opts = content.get("options")
        if isinstance(opts, list):
            option_counts.append(len(opts))
        rf = content.get("responseFormat")
        if isinstance(rf, str):
            formats.add(rf)
        if n >= 40:
            break

    rows.append({
        "type": code,
        "items": n,
        "maxOptions": max(option_counts) if option_counts else 0,
        "formats": ",".join(sorted(formats)) or "-",
        "paced": sorted(fields & PACED),
        "spatial": bool(fields & SPATIAL),
        "text": bool(fields & TEXTUAL),
        "threeD": bool(fields & THREE_D),
    })

print(f"{'type':24} {'opts':>4} {'sp':>3} {'tx':>3} {'3d':>3}  {'format':22} paced")
print("-" * 108)
for r in rows:
    print(
        f"{r['type']:24} {r['maxOptions']:>4} "
        f"{'Y' if r['spatial'] else '.':>3} {'Y' if r['text'] else '.':>3} "
        f"{'Y' if r['threeD'] else '.':>3}  {r['formats']:22} "
        f"{','.join(r['paced'])[:44]}"
    )

print()
buckets = defaultdict(list)
for r in rows:
    buckets["paced" if r["paced"] else "unpaced"].append(r["type"])
    if r["maxOptions"] == 0:
        buckets["no option list (constructed response)"].append(r["type"])
for name in ("paced", "no option list (constructed response)"):
    print(f"{name}: {len(buckets[name])} types")
    print("  " + ", ".join(buckets[name]))
