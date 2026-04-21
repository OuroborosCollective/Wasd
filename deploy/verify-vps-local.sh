#!/usr/bin/env bash
# Quick local checks on the VPS after deploy (run ON the server).
# Usage: bash deploy/verify-vps-local.sh [BASE_URL]
# Default BASE_URL: http://127.0.0.1:3000
set -euo pipefail
BASE="${1:-http://127.0.0.1:3000}"
BASE="${BASE%/}"

check() {
  local path="$1"
  local name="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 "${BASE}${path}" || true)"
  if [[ "$code" == "200" ]]; then
    echo "OK  $name  (${BASE}${path})"
  else
    echo "FAIL $name  (${BASE}${path})  HTTP $code"
    return 1
  fi
}

echo "Verifying ${BASE} ..."
check "/health" "Health"
check "/" "Client root"
check "/gm/" "GM console"
echo "All checks passed."
