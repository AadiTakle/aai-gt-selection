#!/bin/zsh
# Double-click to boot the public screener with the debug UI on, or run it from a terminal.
# Leave the window open while you demo. Ctrl-C stops the server.
#
# Port 3100 so it can run beside the CogAT prep tool on 3000.

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 24 >/dev/null 2>&1

cd "$(dirname "$0")/apps/web" || exit 1

URL="http://127.0.0.1:3100/screener?debug=1"
echo "Starting the public screener..."
echo "  screener + debug UI : $URL"
echo "  admissions battery  : http://127.0.0.1:3100/dev/family-preview/exam?debug=1"
echo ""

(
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null --max-time 5 "http://127.0.0.1:3100/screener"; then
      open "$URL"
      break
    fi
    sleep 2
  done
) &

exec npx next dev --hostname 127.0.0.1 --port 3100
