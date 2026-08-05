"""Smoke checks for the practice tool, the second consumer of the shared library.

Written in Python rather than inline bash because the checks need nested JSON in request
bodies, and quoting that through command substitution is where the bash version broke.
"""
import json
import sys
import urllib.request

PORT = sys.argv[1] if len(sys.argv) > 1 else "5199"
BASE = f"http://localhost:{PORT}/api"
failed = False


def call(path, body=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"content-type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def check(ok, label):
    global failed
    print(f"  {'pass' if ok else 'FAIL'}  {label}")
    if not ok:
        failed = True


avail = call("/practice/available?ageBand=3-5")
prac, scr = avail["practice"], avail["screening"]

check(
    len(prac) > 0 and len(scr) > len(prac),
    f"practice sees {len(prac)} families and screening sees {len(scr)}, so the partition is live",
)
check(
    all(f["usage"] in ("prep", "both") for f in prac),
    "no assessment-only family reaches the practice tool",
)

started = call("/practice/sessions", {"ageBand": "3-5", "seed": 7})
sid = started["sessionId"]
check(bool(sid), f"practice session created ({sid})")

nxt = call(f"/practice/sessions/{sid}/next")
item = nxt["item"]
check(
    "correctOptionId" not in item and "explanation" not in item,
    "key and explanation both withheld until the learner answers",
)

answered = call(
    f"/practice/sessions/{sid}/answer",
    {"optionId": item["options"][0]["id"], "latencyMs": 4000},
)
exp = answered.get("explanation") or {}
check(
    "correct" in answered and len(exp.get("rule", "")) > 10 and len(exp.get("working", "")) > 10,
    "answering returns a written rule and working",
)
# The working has to name this item's own numbers, or it is a template rather than an explanation.
check(
    any(ch.isdigit() for ch in exp.get("working", "")),
    "the working is specific to the item served, not a generic template",
)

# Run the session out and confirm every item carried an explanation.
seen_all = True
for _ in range(20):
    n = call(f"/practice/sessions/{sid}/next")
    if n.get("done"):
        break
    a = call(
        f"/practice/sessions/{sid}/answer",
        {"optionId": n["item"]["options"][0]["id"], "latencyMs": 3000},
    )
    if not (a.get("explanation") or {}).get("working"):
        seen_all = False
check(seen_all, "every item in a full session carried an explanation")

final = call(f"/practice/sessions/{sid}")
check(
    final["state"]["finished"] and final["state"]["served"] > 1,
    f"session finished after {final['state']['served']} questions",
)
check(
    "decision" not in final["state"] and "pAbove" not in final["state"],
    "practice state carries no decision and no threshold probability",
)


# --- the playable catalogue, served same-origin so the host can theme it ------------------
print("")
print("The playable catalogue")

cat = call("/qbank")
check(cat["count"] == 52, f"catalogue lists {cat['count']} items")

areas = {}
for i in cat["items"]:
    areas[i["area"]] = areas.get(i["area"], 0) + 1
check(
    areas == {"SPA": 14, "FLU": 11, "QUANT": 9, "VER": 8, "GB": 6, "WM": 3, "CX": 1},
    f"area counts match the catalogue: {areas}",
)
check(
    all(i["url"].startswith("/qbank/items/") and i["code"] and i["name"] for i in cat["items"]),
    "every item has a code, a name and a same-origin url",
)
check(
    sum(1 for i in cat["items"] if i["readingFree"]) == 17,
    "17 items are flagged as needing no reading",
)

# Fetch one item and confirm the two properties the integration depends on are really in the file.
import urllib.request as _u
with _u.urlopen(f"http://localhost:{PORT}/qbank/items/FLU-MATRIX-01.html", timeout=15) as r:
    html = r.read().decode("utf-8", "replace")
check(len(html) > 5000, f"an item is served over HTTP ({len(html) // 1024} kB)")
check(":root" in html, "the served item declares a :root palette, so it can be themed from the host")
check("postMessage" in html and "gt-exam-demo" in html, "the served item broadcasts to its parent")
# The host cannot score these, and asserting it stops anyone assuming otherwise later.
import re as _re
check(
    not _re.search(r"post\(\{[^}]*\b(correct|isCorrect|score)\s*:", html),
    "the served item reports no correctness flag, so scoring needs a host-side key",
)

sys.exit(1 if failed else 0)
