#!/usr/bin/env python3
"""North-star metric: how many top-GT qbank items are representable by >=3 question types.

A type REPRESENTS an item when: item.construct is in type.areas (for game_based items, the
target construct parsed from 'targetconstruct:technique'), item.subconstruct/technique matches
a token in type.topics_techniques_covered, and item.age_band is in type.age_bands.

Reads catalog/top_gt_items.jsonl + catalog/master_types.jsonl.
Writes catalog/COVERAGE_REPORT.md and prints a summary + the most under-covered cells.
"""
import json, os, re, sys
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, "catalog")
TARGET = 3
AREAS = {"fluid_reasoning", "verbal", "quantitative", "spatial",
         "working_memory", "processing_speed", "complementary"}


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def load(path):
    if not os.path.exists(path):
        return []
    return [json.loads(l) for l in open(path, encoding="utf-8") if l.strip()]


def tokens_match(item_sub, type_tokens):
    a = norm(item_sub)
    if not a:
        return False
    for t in type_tokens:
        b = norm(t)
        if not b:
            continue
        if a == b or a in b or b in a:
            return True
    return False


def area_and_sub(item):
    c = item["construct"]
    sub = item.get("subconstruct", "")
    if c == "game_based":
        # a game-based item can be represented by ANY question type covering its technique,
        # regardless of area; map "targetconstruct:technique" -> technique, drop the area gate
        tech = sub.split(":", 1)[1] if ":" in sub else sub
        return None, tech, True
    return c, sub, False


def main():
    items_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(CAT, "top_gt_items.jsonl")
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(CAT, "COVERAGE_REPORT.md")
    items = load(items_path)
    types = load(os.path.join(CAT, "master_types.jsonl"))

    per_item = []
    undercovered = Counter()
    for it in items:
        area, sub, is_game = area_and_sub(it)
        band = it.get("age_band", "")
        n = 0
        for t in types:
            # non-game items are area-gated; game-based items match on technique+band across any area
            if not is_game and area not in set(t.get("areas", [])):
                continue
            if not tokens_match(sub, t.get("topics_techniques_covered", [])):
                continue
            tb = set(t.get("age_bands", []))
            # "K-8" is a wildcard band on EITHER side: an item that spans all grades is
            # coverable by any correctly-scoped type, and a type marked K-8 covers any item.
            if band and band != "K-8" and band not in tb and "K-8" not in tb:
                continue
            n += 1
        per_item.append((it["item_id"], area or it["construct"], sub, band, n))
        if n < TARGET:
            undercovered[(area or it["construct"], sub)] += 1

    total = len(per_item)
    ge3 = sum(1 for *_, n in per_item if n >= TARGET)
    mid = sum(1 for *_, n in per_item if 1 <= n < TARGET)
    zero = sum(1 for *_, n in per_item if n == 0)
    pct = (100 * ge3 // total) if total else 0

    lines = ["# Coverage report — top-GT item -> question-type representation", "",
             f"**North star:** {ge3}/{total} top-GT items have >=%d representing types "
             f"(**{pct}%%**). types in catalog: {len(types)}." % TARGET, "",
             f"- >= {TARGET} types: {ge3}", f"- 1-{TARGET-1} types: {mid}", f"- 0 types: {zero}", "",
             "## Most under-covered (construct, subconstruct) cells — target these next", ""]
    for (a, s), c in undercovered.most_common(40):
        lines.append(f"- {a} / {s}: {c} top-GT item(s) still < {TARGET}")
    open(out_path, "w", encoding="utf-8").write("\n".join(lines) + "\n")

    print(f"top_gt={total} ge{TARGET}={ge3} ({pct}%) mid={mid} zero={zero} types={len(types)}")
    if undercovered:
        print("top under-covered cells:",
              ", ".join(f"{a}/{s}={c}" for (a, s), c in undercovered.most_common(10)))


if __name__ == "__main__":
    main()
