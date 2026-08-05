#!/usr/bin/env bash
# End-to-end smoke test. Starts the api, drives a full session over HTTP, exercises the
# library-safety guarantees, then shuts down. Self-contained so it can run in CI.
#
#   npm run smoke
set -uo pipefail
cd "$(dirname "$0")/.."

DATA_DIR="$(mktemp -d)"
export GT_SCREENER_DATA="$DATA_DIR"
PORT=5199
export PORT

npx tsx apps/api/src/server.ts > /tmp/gt-smoke-api.log 2>&1 &
API_PID=$!
cleanup() { kill "$API_PID" 2>/dev/null; rm -rf "$DATA_DIR"; }
trap cleanup EXIT

for _ in $(seq 1 40); do
  curl -sf "localhost:$PORT/api/config" > /dev/null 2>&1 && break
  sleep 0.5
done
if ! curl -sf "localhost:$PORT/api/config" > /dev/null 2>&1; then
  echo "FAIL: api never came up"; cat /tmp/gt-smoke-api.log; exit 1
fi

FAILED=0
check() { if [ "$1" = "PASS" ]; then echo "  pass  $2"; else echo "  FAIL  $2"; FAILED=1; fi; }

echo "Smoke test against localhost:$PORT"
echo "===================================================================="

echo ""
echo "Library"
check "$(curl -s "localhost:$PORT/api/library" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('PASS' if len(d['generators'])>=13 and len(d['snapshots'])>=1 else 'FAIL')")" \
  "library serves generators and at least one snapshot"

check "$(curl -s "localhost:$PORT/api/library/quant.series.arithmetic/1.0.0/preview?count=4" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d['items']
ok = len(items)==4 and d['validation']['publishable'] and len({json.dumps(i['stem']) for i in items})==4
print('PASS' if ok else 'FAIL')")" \
  "preview renders distinct items and reports validation"

echo ""
echo "Session over HTTP"
SID=$(curl -s -X POST "localhost:$PORT/api/sessions" -H 'content-type: application/json' \
  -d '{"ageBand":"3-5","surfaceId":"web-plain","seed":4242}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['sessionId'])")
check "$([ -n "$SID" ] && echo PASS || echo FAIL)" "session created ($SID)"

KEY_LEAKED=0
ITEMS=0
for _ in $(seq 1 20); do
  R=$(curl -s "localhost:$PORT/api/sessions/$SID/next")
  DONE=$(printf '%s' "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['done'])")
  [ "$DONE" = "True" ] && break
  printf '%s' "$R" | python3 -c "import sys,json;sys.exit(0 if 'correctOptionId' not in json.load(sys.stdin)['item'] else 1)" || KEY_LEAKED=1
  OPT=$(printf '%s' "$R" | python3 -c "import sys,json;print(json.load(sys.stdin)['item']['options'][0]['id'])")
  curl -s -X POST "localhost:$PORT/api/sessions/$SID/answer" -H 'content-type: application/json' \
    -d "{\"optionId\":\"$OPT\",\"latencyMs\":3200}" > /dev/null
  ITEMS=$((ITEMS+1))
done

check "$([ "$KEY_LEAKED" = "0" ] && echo PASS || echo FAIL)" "answer key never sent to the client"
check "$([ "$ITEMS" -ge 8 ] && [ "$ITEMS" -le 16 ] && echo PASS || echo FAIL)" "session ran $ITEMS items, inside the 8 to 16 budget"

check "$(curl -s "localhost:$PORT/api/sessions/$SID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ok = d['stopReason'] is not None and d['decision'] in ('recommend','no-recommendation') and len(d['responses'])>0
ok = ok and all('selectionReason' in r and 'pAboveBefore' in r for r in d['responses'])
print('PASS' if ok else 'FAIL')")" \
  "stored record carries a decision and a per-item audit trail"

echo ""
echo "Statistics"
check "$(curl -s "localhost:$PORT/api/stats" | python3 -c "
import sys,json
d=json.load(sys.stdin)
eff = d['surfaces'][0]['effectiveness']
# The point of this check: with no outcome attached these must be null, not zero.
print('PASS' if eff['outcomesKnown']==0 and eff['sensitivity'] is None else 'FAIL')")" \
  "effectiveness is unavailable, not zero, before any outcome exists"

curl -s -X POST "localhost:$PORT/api/sessions/$SID/outcome" -H 'content-type: application/json' \
  -d '{"clearedBar":true,"source":"smoke"}' > /dev/null
check "$(curl -s "localhost:$PORT/api/stats" | python3 -c "
import sys,json
d=json.load(sys.stdin)
eff = d['surfaces'][0]['effectiveness']
print('PASS' if eff['outcomesKnown']==1 else 'FAIL')")" \
  "attaching an outcome makes effectiveness computable"

check "$(curl -s "localhost:$PORT/api/stats" | python3 -c "
import sys,json
d=json.load(sys.stdin)
gens=d['generators']
ok = len(gens)>0 and all('@' not in g['generatorId'] and g['generatorVersion'] for g in gens)
print('PASS' if ok else 'FAIL')")" \
  "item statistics are keyed by generator version"

echo ""
echo "The guarantee the design exists for"
curl -s -X POST "localhost:$PORT/api/library/spatial.mirror/1.0.0/deprecate" -H 'content-type: application/json' \
  -d '{"note":"smoke test"}' > /dev/null
S2=$(curl -s -X POST "localhost:$PORT/api/sessions" -H 'content-type: application/json' \
  -d '{"ageBand":"3-5","surfaceId":"web-plain","snapshotId":"snap-0001","seed":77}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('sessionId',''))")
check "$([ -n "$S2" ] && echo PASS || echo FAIL)" "a session on the pre-existing snapshot still starts after a deprecation"

NEWSNAP=$(curl -s -X POST "localhost:$PORT/api/snapshots" -H 'content-type: application/json' \
  -d '{"label":"after deprecation","createdBy":"smoke"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
check "$(curl -s "localhost:$PORT/api/library" | python3 -c "
import sys,json
d=json.load(sys.stdin)
old = next(s for s in d['snapshots'] if s['id']=='snap-0001')
new = next(s for s in d['snapshots'] if s['id']=='$NEWSNAP')
had = any(e['generatorId']=='spatial.mirror' for e in old['entries'])
gone = not any(e['generatorId']=='spatial.mirror' for e in new['entries'])
print('PASS' if had and gone else 'FAIL')")" \
  "the deprecated type stays in the old snapshot and is absent from the new one"

echo ""



echo ""
echo "The second consumer, and the partition between them"
PRACTICE_OUT=$(python3 scripts/check-practice.py "$PORT")
echo "$PRACTICE_OUT"
echo "$PRACTICE_OUT" | grep -q FAIL && FAILED=1

echo "===================================================================="
if [ "$FAILED" = "0" ]; then echo "All smoke checks passed."; else echo "Some smoke checks FAILED."; fi
exit "$FAILED"
