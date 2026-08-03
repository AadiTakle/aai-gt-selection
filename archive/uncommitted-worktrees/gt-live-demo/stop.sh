#!/usr/bin/env bash
# Stop the GT demo instance started by ./start.sh.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-4100}"
PIDFILE="$ROOT/dev-server.pid"

if [ -f "$PIDFILE" ]; then
  PID="$(cat "$PIDFILE")"
  # Negative PID targets the whole process group start.sh created, so the
  # pnpm wrapper and the next-server child both go down.
  kill -TERM -"$PID" 2>/dev/null || kill -TERM "$PID" 2>/dev/null || true
  sleep 2
  kill -KILL -"$PID" 2>/dev/null || true
  rm -f "$PIDFILE"
  echo "stopped pid $PID"
fi

# Belt and braces: anything still holding the port.
LEFT="$(lsof -ti :"$PORT" 2>/dev/null || true)"
if [ -n "$LEFT" ]; then
  echo "$LEFT" | xargs kill -KILL 2>/dev/null || true
  echo "freed port $PORT"
fi

echo "done"
