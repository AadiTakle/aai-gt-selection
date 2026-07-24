#!/usr/bin/env python3
"""Validate + merge question-type spec shards, merge proposed measurements, and
regenerate MEASUREMENTS.md, catalog/master_types.jsonl, catalog/INDEX.md (with the
area x band coverage matrix + gap report), and demos/index.html.

Run:  python3 build_types.py
"""
import csv, json, glob, os
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SPECS = os.path.join(HERE, "specs")
DEMOS = os.path.join(HERE, "demos")
CAT = os.path.join(HERE, "catalog")
MEAS_JSON = os.path.join(HERE, "measurements.json")

# Four testable domains only. working_memory + processing_speed are now
# cross-cutting MEASUREMENT tags, not areas (dedicated WM games live under
# spatial). See CATEGORY_MAP.md. processing_speed is pending PS_GAMEBASED_WARRANT.md.
AREAS = ["fluid_reasoning", "verbal", "quantitative", "spatial"]
BANDS = ["K-1", "2-3", "4-5", "6-8"]
REQ = ["type_id", "name", "areas", "topics_techniques_covered", "one_liner", "interaction",
       "self_teach", "learning_science", "measurements", "tail_precision_rationale",
       "age_bands", "age_rationale", "adaptive", "demo_path", "engagement_hook",
       "construct_irrelevant_risks"]
MIN_PER_CELL = 3


def load_measurements():
    return json.load(open(MEAS_JSON, encoding="utf-8"))


def render_measurements_md(meas):
    lines = ["# Measurement Registry", "",
             f"{len(meas)} measurements. Canonical source of truth is `measurements.json`; "
             "this file is generated. Each question type references these IDs and may propose "
             "additions (merged here).", "",
             "| ID | Name | What | Tail-precision usefulness | How to collect | How much |",
             "|---|---|---|---|---|---|"]
    for m in meas:
        lines.append("| {id} | {name} | {what} | {usefulness_tail} | {how_to_collect} | {how_much_to_collect} |".format(
            id=m.get("id", ""), name=m.get("name", ""), what=m.get("what", "").replace("|", "/"),
            usefulness_tail=m.get("usefulness_tail", "").replace("|", "/"),
            how_to_collect=m.get("how_to_collect", "").replace("|", "/"),
            how_much_to_collect=m.get("how_much_to_collect", "").replace("|", "/")))
    open(os.path.join(HERE, "MEASUREMENTS.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")


def main():
    os.makedirs(CAT, exist_ok=True)
    meas = load_measurements()
    meas_ids = {m["id"] for m in meas}
    meas_names = {m["name"].lower() for m in meas}

    rows, errors, warnings, seen_ids = [], [], [], set()
    new_meas_added = 0

    for path in sorted(glob.glob(os.path.join(SPECS, "*.jsonl"))):
        name = os.path.basename(path)
        for i, line in enumerate(open(path, encoding="utf-8"), 1):
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except Exception as e:
                errors.append(f"{name}:{i} JSON parse error: {e}")
                continue
            missing = [k for k in REQ if k not in o]
            if missing:
                errors.append(f"{name}:{i} missing {missing}")
                continue
            if o["type_id"] in seen_ids:
                warnings.append(f"{name}:{i} duplicate type_id {o['type_id']}")
            seen_ids.add(o["type_id"])
            if not set(o["areas"]) <= set(AREAS):
                warnings.append(f"{name}:{i} {o['type_id']} bad areas {o['areas']}")
            if not set(o["age_bands"]) <= (set(BANDS) | {"K-8"}):
                warnings.append(f"{name}:{i} {o['type_id']} bad age_bands {o['age_bands']}")
            dp = os.path.join(HERE, o["demo_path"])
            if not os.path.exists(dp):
                warnings.append(f"{name}:{i} {o['type_id']} demo missing: {o['demo_path']}")
            for nm in o.get("new_measurements_proposed", []) or []:
                if not isinstance(nm, dict) or "id" not in nm:
                    continue
                if nm["id"] in meas_ids or nm.get("name", "").lower() in meas_names:
                    continue
                meas.append({"id": nm["id"], "name": nm.get("name", ""),
                             "what": nm.get("what", nm.get("name", "")),
                             "usefulness_tail": nm.get("usefulness_tail", ""),
                             "how_to_collect": nm.get("how_to_collect", ""),
                             "how_much_to_collect": nm.get("how_much_to_collect", "")})
                meas_ids.add(nm["id"]); meas_names.add(nm.get("name", "").lower()); new_meas_added += 1
            rows.append(o)

    # validate measurement references AFTER all proposals are merged (two-pass; avoids
    # false "unknown" warnings for measurements a type proposes and uses on the same line)
    for r in rows:
        for mid in r.get("measurements", []):
            if mid not in meas_ids:
                warnings.append(f"{r['type_id']} references unknown measurement {mid}")

    json.dump(meas, open(MEAS_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    render_measurements_md(meas)

    with open(os.path.join(CAT, "master_types.jsonl"), "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    # coverage matrix
    cell = {(a, b): 0 for a in AREAS for b in BANDS}
    for r in rows:
        rb = set(r["age_bands"])
        if "K-8" in rb:
            rb |= set(BANDS)  # a K-8 type applies to every band
        for a in r["areas"]:
            for b in rb:
                if (a, b) in cell:
                    cell[(a, b)] += 1
    gaps = [(a, b, cell[(a, b)]) for a in AREAS for b in BANDS if cell[(a, b)] < MIN_PER_CELL]

    idx = ["# Question-Type Catalog — INDEX", "",
           f"**{len(rows)} types** across {len({a for r in rows for a in r['areas']})} areas. "
           f"Measurements in registry: {len(meas)}.", "",
           "## Coverage matrix (types applicable per area x band; target >=%d)" % MIN_PER_CELL, "",
           "| area | " + " | ".join(BANDS) + " |", "|---|" + "---|" * len(BANDS)]
    for a in AREAS:
        idx.append("| " + a + " | " + " | ".join(
            ("**%d**" % cell[(a, b)] if cell[(a, b)] < MIN_PER_CELL else str(cell[(a, b)])) for b in BANDS) + " |")
    idx.append("")
    if gaps:
        idx.append("## GAPS (need more types) — target for next wave")
        for a, b, n in gaps:
            idx.append(f"- {a} / {b}: {n} (need {MIN_PER_CELL - n} more)")
    else:
        idx.append("## Coverage complete: every area x band has >=%d types." % MIN_PER_CELL)
    idx.append("\n## Types by area\n")
    byarea = defaultdict(list)
    for r in rows:
        for a in r["areas"]:
            byarea[a].append(r)
    for a in AREAS:
        if not byarea.get(a):
            continue
        idx.append(f"### {a} ({len(byarea[a])})")
        for r in sorted(byarea[a], key=lambda x: x["type_id"]):
            idx.append(f"- **{r['type_id']} — {r['name']}** [{','.join(r['age_bands'])}] "
                       f"· meas: {','.join(r.get('measurements', []))} · "
                       f"[demo]({r['demo_path']})<br>{r['one_liner']}")
        idx.append("")
    open(os.path.join(CAT, "INDEX.md"), "w", encoding="utf-8").write("\n".join(idx) + "\n")

    # demo gallery
    g = ["<!doctype html><meta charset=utf-8><title>Question-type demos</title>",
         "<style>body{font:15px system-ui;margin:2rem;max-width:60rem}h2{margin-top:1.5rem}"
         "a{display:block;padding:.3rem 0}code{color:#666}</style>",
         f"<h1>Question-type demos ({len(rows)})</h1>"]
    for a in AREAS:
        if not byarea.get(a):
            continue
        g.append(f"<h2>{a}</h2>")
        for r in sorted(byarea[a], key=lambda x: x["type_id"]):
            fn = os.path.basename(r["demo_path"])
            g.append(f'<a href="{fn}">{r["type_id"]} — {r["name"]} '
                     f'<code>[{",".join(r["age_bands"])}]</code></a>')
    open(os.path.join(DEMOS, "index.html"), "w", encoding="utf-8").write("\n".join(g) + "\n")

    print(f"types={len(rows)} measurements={len(meas)} (+{new_meas_added} new) "
          f"errors={len(errors)} warnings={len(warnings)} gaps={len(gaps)}")
    if gaps:
        print("GAPS:", ", ".join(f"{a}/{b}={n}" for a, b, n in gaps))
    for e in errors[:15]:
        print("ERR", e)
    for w in warnings[:15]:
        print("WARN", w)


if __name__ == "__main__":
    main()
