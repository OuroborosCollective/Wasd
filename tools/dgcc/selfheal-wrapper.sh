#!/usr/bin/env bash
set -euo pipefail

# Optional wrapper: run DGCC in a self-heal-friendly mode (fixes enabled by default).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

export DGCC_MODE="${DGCC_MODE:-extreme}"
export DGCC_FIX="${DGCC_FIX:-1}"

echo "[selfheal-wrapper] DGCC_MODE=${DGCC_MODE} DGCC_FIX=${DGCC_FIX}"
exec pnpm exec tsx "${ROOT}/tools/dgcc/run-dgcc.ts" "--mode=${DGCC_MODE}"
