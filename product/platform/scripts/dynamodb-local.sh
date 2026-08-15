#!/usr/bin/env bash
# DynamoDB Local for the store and handler integration tests.
#
# Port 8456, and the specific number matters more than it looks. 8000 is taken by qbank-library's
# static catalogue server. 8010 was the first choice and turned out to be contested on a real
# developer machine by an ssh port-forward and a stray Python server, so a client connecting to
# 127.0.0.1:8010 reached the Python server and got a bare "Method Not Allowed" that looked like a
# DynamoDB fault. Readiness is therefore checked with an actual DynamoDB ListTables call rather than
# with any HTTP response at all, because "something answered" is not the same as "DynamoDB answered".
set -euo pipefail

NAME="gt-ddb-local"
PORT="${GT_DDB_PORT:-8456}"
IMAGE="amazon/dynamodb-local:latest"

probe() {
  local body
  body=$(curl -s --max-time 3 -X POST "http://127.0.0.1:${PORT}/" \
    -H 'Content-Type: application/x-amz-json-1.0' \
    -H 'X-Amz-Target: DynamoDB_20120810.ListTables' \
    -H 'Authorization: AWS4-HMAC-SHA256 Credential=local/20260101/us-east-1/dynamodb/aws4_request, SignedHeaders=host, Signature=x' \
    -d '{}' 2>/dev/null || true)
  [[ "$body" == *"TableNames"* ]]
}

case "${1:-start}" in
  start)
    if probe; then
      echo "dynamodb-local already answering on ${PORT}"
      exit 0
    fi
    if [ "$(docker ps -aq -f "name=^${NAME}$")" ]; then
      docker rm -f "${NAME}" >/dev/null 2>&1 || true
    fi
    if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "port ${PORT} is already bound by something that is not dynamodb-local:" >&2
      lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >&2
      echo "set GT_DDB_PORT to a free port and retry" >&2
      exit 1
    fi
    docker run -d --name "${NAME}" -p "127.0.0.1:${PORT}:8000" "${IMAGE}" >/dev/null
    for _ in $(seq 1 40); do
      if probe; then
        echo "dynamodb-local ready on ${PORT}"
        exit 0
      fi
      sleep 0.5
    done
    echo "dynamodb-local did not answer a ListTables call on ${PORT}" >&2
    docker logs "${NAME}" 2>&1 | tail -20 >&2
    exit 1
    ;;
  stop)
    docker rm -f "${NAME}" >/dev/null 2>&1 || true
    echo "dynamodb-local stopped"
    ;;
  probe)
    if probe; then echo "ok"; else echo "not answering"; exit 1; fi
    ;;
  *)
    echo "usage: $0 [start|stop|probe]" >&2
    exit 2
    ;;
esac
