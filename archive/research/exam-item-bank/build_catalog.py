#!/usr/bin/env python3
"""Validate per-construct JSONL shards and merge them into master.jsonl / master.csv / CATALOG.md.

Run from anywhere:  python3 build_catalog.py
Reads   shards/*.jsonl   and   notes/*.md
Writes  catalog/master.jsonl, catalog/master.csv, catalog/CATALOG.md
"""
import csv
import json
import glob
import os
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SHARDS = os.path.join(HERE, "shards")
NOTES = os.path.join(HERE, "notes")
CATALOG = os.path.join(HERE, "catalog")

KEYS = ["item_id", "construct", "subconstruct", "item_format", "age_band", "entry_kind",
        "stimulus_modality", "cognitive_process", "response_format", "engagement_affordance",
        "adaptivity_fit", "tail_discrimination", "coachability_bias_risk", "advantage_vs_cogat",
        "source_name", "source_url", "ip_status", "reuse_note"]

ENUMS = {
    "construct": {"fluid_reasoning", "verbal", "quantitative", "spatial", "working_memory",
                  "processing_speed", "complementary", "game_based"},
    "age_band": {"K-1", "2-3", "4-5", "6-8", "K-8"},
    "entry_kind": {"example_item", "item_type"},
    "stimulus_modality": {"verbal", "pictorial", "figural", "numeric", "audio", "interactive", "mixed"},
    "response_format": {"mcq", "drag_drop", "constructed", "timed_tap", "spoken", "sequence_recall", "other"},
    "ip_status": {"public_domain", "open_license", "gov_released", "publisher_sample_describe_only",
                  "proprietary_describe_only", "research_described"},
}
NONEMPTY = ["engagement_affordance", "advantage_vs_cogat", "ip_status", "reuse_note"]


def main():
    os.makedirs(CATALOG, exist_ok=True)
    rows, errors, warnings = [], [], []
    seen_ids = set()
    per_shard = {}

    for path in sorted(glob.glob(os.path.join(SHARDS, "*.jsonl"))):
        name = os.path.basename(path)
        ok = 0
        for i, line in enumerate(open(path, encoding="utf-8"), 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception as e:
                errors.append(f"{name}:{i} JSON parse error: {e}")
                continue
            missing = [k for k in KEYS if k not in obj]
            extra = [k for k in obj if k not in KEYS]
            if missing:
                errors.append(f"{name}:{i} missing keys {missing}")
                continue
            if extra:
                warnings.append(f"{name}:{i} extra keys {extra}")
            for k, allowed in ENUMS.items():
                if str(obj.get(k)) not in allowed:
                    warnings.append(f"{name}:{i} {k}={obj.get(k)!r} not in enum")
            for k in NONEMPTY:
                if not str(obj.get(k, "")).strip():
                    warnings.append(f"{name}:{i} empty {k}")
            if str(obj.get("ip_status")) == "proprietary_describe_only":
                if obj.get("entry_kind") != "item_type" or not str(obj.get("reuse_note", "")).startswith("describe_only"):
                    warnings.append(f"{name}:{i} proprietary row should be item_type + reuse_note=describe_only")
            iid = obj.get("item_id")
            if iid in seen_ids:
                warnings.append(f"{name}:{i} duplicate item_id {iid}")
            seen_ids.add(iid)
            rows.append({k: obj.get(k, "") for k in KEYS})
            ok += 1
        per_shard[name] = ok

    # master.jsonl
    with open(os.path.join(CATALOG, "master.jsonl"), "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    # master.csv
    with open(os.path.join(CATALOG, "master.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=KEYS, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)

    by_construct = Counter(r["construct"] for r in rows)
    by_age = Counter(r["age_band"] for r in rows)
    by_ip = Counter(r["ip_status"] for r in rows)
    by_kind = Counter(r["entry_kind"] for r in rows)

    lines = ["# Exam Item-Bank Catalog — summary", "",
             f"**Total rows:** {len(rows)}  |  **shards:** {len(per_shard)}  |  "
             f"**parse errors:** {len(errors)}  |  **warnings:** {len(warnings)}", ""]
    lines.append("## Rows per construct")
    for k, v in by_construct.most_common():
        lines.append(f"- {k}: {v}")
    lines.append("\n## Rows per age band")
    for k in ["K-1", "2-3", "4-5", "6-8", "K-8"]:
        lines.append(f"- {k}: {by_age.get(k, 0)}")
    lines.append("\n## Rows per IP status")
    for k, v in by_ip.most_common():
        lines.append(f"- {k}: {v}")
    lines.append("\n## Entry kind")
    for k, v in by_kind.most_common():
        lines.append(f"- {k}: {v}")

    note_files = sorted(glob.glob(os.path.join(NOTES, "*.md")))
    if note_files:
        lines.append("\n## Per-construct notes")
        for nf in note_files:
            lines.append(f"\n### {os.path.basename(nf)}\n")
            lines.append(open(nf, encoding="utf-8").read().strip())

    if errors:
        lines.append("\n## PARSE ERRORS (fix these)")
        lines += [f"- {e}" for e in errors[:200]]
    if warnings:
        lines.append("\n## Warnings")
        lines += [f"- {w}" for w in warnings[:200]]

    with open(os.path.join(CATALOG, "CATALOG.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"rows={len(rows)} shards={len(per_shard)} errors={len(errors)} warnings={len(warnings)}")
    for k, v in per_shard.items():
        print(f"  {k}: {v}")
    if errors:
        print("FIRST ERRORS:")
        for e in errors[:10]:
            print("  " + e)


if __name__ == "__main__":
    main()
