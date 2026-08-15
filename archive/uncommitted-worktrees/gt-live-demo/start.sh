#!/usr/bin/env bash
# Start the pinned GT demo instance on port 4100, fully detached from the
# calling terminal (its own session, so closing the terminal or killing the
# parent shell's process group cannot take it down).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-4100}"
LOG="$ROOT/dev-server.log"
PIDFILE="$ROOT/dev-server.pid"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Already running (pid $(cat "$PIDFILE")) on port $PORT"
  exit 0
fi

# start_new_session detaches into a fresh process group + session; nohup alone
# only ignores SIGHUP and would still die with the parent's process group.
python3 - "$ROOT" "$PORT" "$LOG" "$PIDFILE" <<'PY'
import os, subprocess, sys

root, port, log, pidfile = sys.argv[1:5]
with open(log, "ab") as out:
    proc = subprocess.Popen(
        ["pnpm", "dev", "--port", port],
        cwd=os.path.join(root, "apps", "web"),
        stdout=out,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
    )
with open(pidfile, "w") as f:
    f.write(str(proc.pid))
print(f"started pid {proc.pid} on port {port}")
PY

echo "Log:  $LOG"
echo "URL:  http://127.0.0.1:$PORT"
