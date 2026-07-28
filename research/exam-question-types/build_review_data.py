#!/usr/bin/env python3
"""Assemble the per-type review dataset for review.html.

Joins the per-domain type specs (specs/types_*.jsonl) with the metric registry
(measurements.json) and the Stage-1/Stage-2 classification (see
../test-structure-research/STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md), and writes
review-data.json. Regenerate after editing any spec or the classification.
"""
import json
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# Stage classification (from STAGE_CLASSIFICATION_AND_METRIC_AUDIT.md).
# S1 = standing/accuracy (feeds theta); S2 = learning-rate/effort (feeds
# Timeback-fit); DUAL = clean key/ceiling AND rich process/growth telemetry.
STAGE = {
    # ---- Stage 1: standing / accuracy ----
    "FLU-MATRIX-01": "S1", "FLU-CARPET-01": "S1", "FLU-STACK-01": "S1",
    "FLU-ANALOGY-01": "S1", "FLU-ODDPAIR-01": "S1", "FLU-VENN-01": "S1",
    "VER-CLOZE-01": "S1", "VER-POLYSEME-01": "S1", "VER-RELPAIR-01": "S1",
    "VER-WORDTRAIN-01": "S1", "WM-bubble-01": "S1",
    "SPA-HIDDENCUBE-01": "S1", "SPA-ROLL-01": "S1", "SPA-FOLDNET-01": "S1",
    "SPA-PICKFOLD-01": "S1", "SPA-PUNCH-01": "S1", "SPA-SHADOW-01": "S1",
    "SPA-VIEW-01": "S1", "SPA-SCENE-01": "S1", "SPA-XSCAN-01": "S1",
    "WM-corsi-01": "S1", "WM-bind-01": "S1", "WM-gridflash-01": "S1",
    "WM-gate-01": "S1", "GB-FILTER-01": "S1", "GB-TRACK-01": "S1",
    "QUANT-DOTS-01": "S1",
    # ---- Dual: usable in either stage by configuration ----
    "FLU-MATRIXBUILD-01": "DUAL", "FLU-GRIDCOPY-01": "DUAL",
    "FLU-DEDUCE-01": "DUAL", "FLU-LADDER-01": "DUAL",
    "VER-EVIDENCE-01": "DUAL", "VER-SENSE-01": "DUAL",
    "VER-SEQUENCE-01": "DUAL", "VER-BUILDIT-01": "DUAL",
    "GB-DEBATE-01": "DUAL", "GB-FLAWFINDER-01": "DUAL",
    "SPA-XPLANE-01": "DUAL", "SPA-MAZE-01": "DUAL", "SPA-PIPES-01": "DUAL",
    "SPA-TANGRAM-01": "DUAL", "GB-EXPLORE-01": "DUAL",
    "QUANT-SERIES-01": "DUAL", "QUANT-MATRIX-01": "DUAL",
    "QUANT-FUNC-01": "DUAL", "QUANT-NUMLINE-01": "DUAL",
    "QUANT-EQUAL-01": "DUAL",
    # ---- Stage 2: learning-rate / effort / creativity / process ----
    "FLU-CONCEPT-01": "S2", "CX-achieve-02": "S2", "CX-diverge-01": "S2",
    "CX-figural-01": "S2", "CX-check-01": "S2", "VER-SORTBOT-01": "S2",
    "CX-curious-02": "S2", "CX-sjt-01": "S2", "GB-WORDFORGE-01": "S2",
    "GB-WORDLADDER-01": "S2", "GB-PATHFORGE-01": "S2", "GB-ROBOPATH-01": "S2",
    "GB-SHAPEFIT-01": "S2", "QUANT-BALANCE-01": "S2", "QUANT-MOBILE-01": "S2",
    "QUANT-GRAPH-01": "S2", "QUANT-MIX-01": "S2", "QUANT-BUILD-01": "S2",
    "QUANT-WORD-01": "S2",
}

STAGE_LABEL = {
    "S1": "Stage 1 - Standing (accuracy -> theta)",
    "S2": "Stage 2 - Learning-rate / effort (-> Timeback-fit)",
    "DUAL": "Dual - usable in either stage",
}


def load_measurements():
    with open(os.path.join(HERE, "measurements.json")) as fh:
        arr = json.load(fh)
    return {m["id"]: m for m in arr}


def main():
    metrics = load_measurements()
    out = []
    missing_stage = []
    for spec in sorted(glob.glob(os.path.join(HERE, "specs", "types_*.jsonl"))):
        with open(spec) as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                d = json.loads(line)
                tid = d.get("type_id", "")
                area = (d.get("areas") or ["?"])[0]
                adaptive = d.get("adaptive") or {}
                stage = STAGE.get(tid)
                if stage is None:
                    missing_stage.append(tid)
                    stage = "DUAL"
                resolved_metrics = []
                for mid in d.get("measurements", []):
                    m = metrics.get(mid, {})
                    resolved_metrics.append({
                        "id": mid,
                        "name": m.get("name", mid),
                        "what": m.get("what", ""),
                        "how_to_collect": m.get("how_to_collect", ""),
                        "usefulness_tail": m.get("usefulness_tail", ""),
                    })
                demo_rel = "demos/%s.html" % tid
                demo_exists = os.path.exists(os.path.join(HERE, demo_rel))
                out.append({
                    "type_id": tid,
                    "name": d.get("name", tid),
                    "domain": area,
                    "stage": stage,
                    "stage_label": STAGE_LABEL[stage],
                    "works_well": adaptive.get("works_well", "?"),
                    "age_bands": d.get("age_bands", []),
                    "content_range": adaptive.get("content_range", ""),
                    "difficulty_levers": adaptive.get("difficulty_levers", ""),
                    "one_liner": d.get("one_liner", ""),
                    "interaction": d.get("interaction", ""),
                    "self_teach": d.get("self_teach", ""),
                    "engagement_hook": d.get("engagement_hook", ""),
                    "tail_precision_rationale": d.get("tail_precision_rationale", ""),
                    "construct_irrelevant_risks": d.get("construct_irrelevant_risks", ""),
                    "demo": demo_rel if demo_exists else None,
                    "metrics": resolved_metrics,
                })
    # domain then stage(S1,DUAL,S2) then id
    stage_order = {"S1": 0, "DUAL": 1, "S2": 2}
    out.sort(key=lambda r: (r["domain"], stage_order.get(r["stage"], 9), r["type_id"]))
    with open(os.path.join(HERE, "review-data.json"), "w") as fh:
        json.dump(out, fh, indent=2)
    counts = {}
    for r in out:
        counts[r["stage"]] = counts.get(r["stage"], 0) + 1
    print("wrote review-data.json:", len(out), "types", counts)
    if missing_stage:
        print("WARNING unclassified (defaulted DUAL):", missing_stage)


if __name__ == "__main__":
    main()
