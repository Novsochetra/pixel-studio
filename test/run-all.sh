#!/usr/bin/env bash
# Everything `npm run check` runs: lint, format, the unit and regression tests, the build, then
# every browser flow against the built page served on PORT. Names given run only those flows.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=${PORT:-8811}
eslint .
prettier --check . >/dev/null
node --test test/unit/*.test.js test/regression/*.test.js tools/*/test/*.test.js 2>&1 | grep -E "^not ok|^# (pass|fail)"
python3 build/build.py
python3 test/wrap.py
python3 -m http.server "$PORT" --directory dist >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
# Playwright from this folder's node_modules, else a global install
export NODE_PATH="$PWD/node_modules:$(npm root -g)"
node test/integration/run.mjs "http://localhost:$PORT/wrapped.html" test/images shots "$@"
