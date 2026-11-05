#!/usr/bin/env bash
# Every check: build, unit tests, then each browser flow against dist/ served on PORT.
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8811}
URL="http://localhost:$PORT/wrapped.html"
WORK=images
python3 build/build.py && python3 test/wrap.py || exit 1
node --test test/*.test.js 2>&1 | grep -E "^not ok|# (pass|fail)"
mkdir -p shots
python3 -m http.server "$PORT" --directory dist >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
# Playwright from this folder's node_modules, else a global install
export NODE_PATH="$PWD/node_modules:$(npm root -g)"
cd test
for run in \
  "smoke.mjs $URL ../shots $WORK/back2.webp" \
  "v2.mjs $URL ../shots" \
  "v3.mjs $URL ../shots $WORK/side.webp $WORK/back2.webp" \
  "v4.mjs $URL ../shots $WORK/side.webp $WORK/back2.webp" \
  "v5.mjs $URL ../shots $WORK/side.webp ../assets/pitch.png" \
  "views.mjs $URL ../shots" \
  "edges.mjs $URL $WORK/back2.webp" \
  "migrate.mjs $URL" \
  "migrate2.mjs $URL" \
  "review5.mjs $URL $WORK/side.webp ../assets/pitch.png" \
  "frames.mjs $URL $WORK/side.webp $WORK/back2.webp ../shots" \
  "frames-touch.mjs $URL" \
  "monkey.mjs $URL" \
  "monkey-phone.mjs $URL"; do
  result=$(timeout 600 node $run 2>&1 | grep -vE "^\s+at " | grep -iE "errors|error:|timeout|ERROR after|NOT OPENED" | tail -2)
  echo "${run%% *}: ${result:-no output}"
done
