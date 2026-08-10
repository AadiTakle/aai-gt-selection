#!/usr/bin/env bash
# DynamoDB Local for the store and handler integration tests.
#
# Port 8010, not 8000: qbank-library serves its static catalogue on 8000 and colliding with it
# would break the demo mid-test.
set -euo pipefail

NAME="gt-ddb-local"
PORT="8010"
IMAGE="amazon/dynamodb-local:latest"

case "${1:-start}" in
  start)
    if [ "$(docker ps -q -f "name=^${NAME}$")" ]; then
      echo "${NAME} already running on ${PORT}"
      exit 0
    fi
    if [ "$(docker ps -aq -f "name=^${NAME}$")" ]; then
      docker start "${NAME}" >/dev/null
    else
      docker run -d --name "${NAME}" -p "${PORT}:8000" "${IMAGE}" >/dev/null
    fi
    for _ in $(seq 1 30); do
      if curl -s -o /dev/null "http://localhost:${PORT}"; then
        echo "${NAME} ready on ${PORT}"
        exit 0
      fi
      sleep 0.5
    done
    echo "${NAME} did not become ready on ${PORT}" >&2
    exit 1
    ;;
  stop)
    docker rm -f "${NAME}" >/dev/null 2>&1 || true
    echo "${NAME} stopped"
    ;;
  *)
    echo "usage: $0 [start|stop]" >&2
    exit 2
    ;;
esac
