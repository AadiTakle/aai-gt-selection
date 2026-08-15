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


# --- adaptive sessions over the real banks --------------------------------------------------
print("")
print("Adaptive sessions on the real item banks")

bank = call("/bank")
check(bank["typeCount"] >= 50, f"{bank['typeCount']} bank types loaded")
check(bank["scorable"] > 3000, f"{bank['scorable']} of {bank['total']} records can be marked host-side")
check(len(bank["precisionSteps"]) == 5, "the test-length slider has five stops")
labels = [s["label"] for s in bank["precisionSteps"]]
check(labels == ["Taster", "Short", "Standard", "Careful", "Thorough"], f"stops are ordered: {labels}")
# Longer settings must demand more confidence, or the slider is decoration.
above = [s["confidenceAbove"] for s in bank["precisionSteps"]]
caps = [s["maxItems"] for s in bank["precisionSteps"]]
check(above == sorted(above) and caps == sorted(caps), "confidence and item cap both rise across the slider")
check(
    all(s["confidenceBelow"] > s["confidenceAbove"] for s in bank["precisionSteps"]),
    "every stop stays reluctant to rule a candidate out",
)


def run_bank_session(precision_index):
    started = call("/bank/sessions", {"precisionIndex": precision_index, "seed": 11})
    sid = started["sessionId"]
    served, keys_leaked = 0, 0
    while True:
        nxt = call(f"/bank/sessions/{sid}/next")
        if nxt.get("done"):
            break
        served += 1
        item = nxt["served"]
        # The key must never cross to the client. This is the assertion that matters most here.
        blob = json.dumps(item)
        if '"answer"' in blob or '"correctKey"' in blob or '"scoring"' in blob:
            keys_leaked += 1
        opts = (item.get("content") or {}).get("options") or []
        key = (opts[0] or {}).get("key") if opts else "A"
        call(f"/bank/sessions/{sid}/answer", {"response": {"key": key}, "latencyMs": 2500})
    return sid, served, keys_leaked


sid, served, leaked = run_bank_session(2)
check(leaked == 0, "the answer key never crosses to the client")
check(4 <= served <= 16, f"a Standard session ran {served} items inside its budget")

dbg = call(f"/bank/sessions/{sid}/debug")
check(dbg["state"]["stopReason"] is not None, f"session stopped: {dbg['state']['stopReason']}")
check(dbg["state"]["decision"] in ("recommend", "no-recommendation"), "a decision was reached")
check(
    all(a.get("selectionReason") for a in dbg["attempts"]),
    "every item records why the engine chose it",
)
check(
    all(isinstance(a["difficulty"], (int, float)) for a in dbg["attempts"]),
    "every item carries its bank difficulty",
)
check(
    dbg["poolSize"] > 3000 and dbg["poolUsed"] == served,
    f"pool accounting is consistent: {dbg['poolUsed']} of {dbg['poolSize']} used",
)
check(
    "not a calibration" in (dbg.get("difficultyMapping") or ""),
    "the debug payload states that the difficulty mapping is a rescaling, not a calibration",
)

# Asking for more confidence should cost more questions.
_, short_len, _ = run_bank_session(0)
_, long_len, _ = run_bank_session(4)
check(long_len > short_len, f"Thorough uses more questions than Taster ({long_len} vs {short_len})")


# --- practice over the banks, and the library studio listing them ----------------------------
print("")
print("Practice on the banks, and the studio listing them")

bp = call("/bank/practice", {"precisionIndex": 3, "seed": 5})
bpid = bp["sessionId"]
check(bp["poolSize"] > 3000, f"bank practice drew a pool of {bp['poolSize']}")

revealed, marked, served_bp = 0, 0, 0
for _ in range(30):
    nxt = call(f"/bank/practice/{bpid}/next")
    if nxt.get("done"):
        break
    served_bp += 1
    item = nxt["served"]
    blob = json.dumps(item)
    if '"answer"' in blob or '"correctKey"' in blob:
        marked = -999  # key leaked before the attempt, which must never happen
    opts = (item.get("content") or {}).get("options") or []
    key = (opts[0] or {}).get("key") if opts else "A"
    out = call(
        f"/bank/practice/{bpid}/answer",
        {"response": {"key": key}, "itemId": item["itemId"], "latencyMs": 2500},
    )
    if out.get("correctKey"):
        revealed += 1
    if out.get("correct") is not None:
        marked += 1

check(marked > 0, f"{marked} of {served_bp} practice answers were marked")
check(revealed == served_bp, f"the key was revealed after every attempt ({revealed}/{served_bp})")

# The screener must not reveal a key on the same banks. This is the contrast that matters.
scr = call("/bank/sessions", {"precisionIndex": 1, "seed": 5})
sn = call(f"/bank/sessions/{scr['sessionId']}/next")
opts = (sn["served"].get("content") or {}).get("options") or []
sa = call(
    f"/bank/sessions/{scr['sessionId']}/answer",
    {"response": {"key": (opts[0] or {}).get("key") if opts else "A"}, "latencyMs": 2000},
)
check("correctKey" not in sa, "the screener never reveals a key, on the same banks")

lib = call("/library")
check(
    lib.get("bankTotals", {}).get("types", 0) >= 50,
    f"the studio lists {lib.get('bankTotals', {}).get('types', 0)} bank types beside the generators",
)
check(
    all(t["rendererUrl"].startswith("/qbank/items/") for t in lib.get("bankTypes", [])),
    "every bank type in the studio links to its renderer",
)
check(
    any(t["scorable"] == 0 for t in lib.get("bankTypes", [])),
    "types this host cannot mark are listed rather than hidden",
)

sys.exit(1 if failed else 0)
