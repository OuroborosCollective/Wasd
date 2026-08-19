#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${ROOT_DIR}/server"
CLI_VERSION="${GENKIT_CLI_VERSION:-1.40.1}"
GENKIT_RUNTIME="src/devtools/genkit/runtime.ts"
GENKIT_DOCTOR="src/devtools/genkit/doctor.ts"
GENKIT_TEST="src/devtools/genkit/__tests__/contracts.test.ts"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[genkit] pnpm is required (repo package manager)." >&2
  exit 127
fi

run_genkit_cli() {
  if [[ -x "${SERVER_DIR}/node_modules/.bin/genkit" ]]; then
    exec "${SERVER_DIR}/node_modules/.bin/genkit" "$@"
  fi

  if [[ -x "${ROOT_DIR}/node_modules/.bin/genkit" ]]; then
    exec "${ROOT_DIR}/node_modules/.bin/genkit" "$@"
  fi

  if command -v genkit >/dev/null 2>&1; then
    exec genkit "$@"
  fi

  echo "[genkit] local/global CLI not found; using pinned genkit-cli@${CLI_VERSION} via pnpm dlx." >&2
  exec pnpm dlx "genkit-cli@${CLI_VERSION}" "$@"
}

command_name="${1:-help}"
if [[ $# -gt 0 ]]; then
  shift
fi

case "${command_name}" in
  mcp)
    cd "${SERVER_DIR}"
    run_genkit_cli mcp "$@"
    ;;
  dev)
    cd "${SERVER_DIR}"
    run_genkit_cli start -- pnpm exec tsx "${GENKIT_RUNTIME}" "$@"
    ;;
  runtime)
    cd "${SERVER_DIR}"
    exec pnpm exec tsx "${GENKIT_RUNTIME}" "$@"
    ;;
  doctor)
    cd "${SERVER_DIR}"
    exec pnpm exec tsx "${GENKIT_DOCTOR}" "$@"
    ;;
  test)
    cd "${SERVER_DIR}"
    exec pnpm exec vitest run "${GENKIT_TEST}" "$@"
    ;;
  flow)
    if [[ $# -lt 1 ]]; then
      echo "Usage: bash genkit.sh flow <flowName> [jsonInput]" >&2
      exit 64
    fi
    flow_name="$1"
    shift
    flow_input="${1:-{}}"
    cd "${SERVER_DIR}"
    run_genkit_cli flow:run "${flow_name}" "${flow_input}"
    ;;
  help|-h|--help)
    cat <<'EOF'
Areloria WASD Genkit development control plane

Usage:
  bash genkit.sh mcp                 Start the Genkit MCP server (stdio)
  bash genkit.sh dev                 Start Genkit Developer UI + isolated runtime
  bash genkit.sh runtime             Start only the isolated flow runtime
  bash genkit.sh doctor              Print readiness without exposing secrets
  bash genkit.sh doctor --require-provider
  bash genkit.sh test                Run Genkit contract tests
  bash genkit.sh flow <name> '<json>' Run a flow against an already running runtime

The Genkit lane is a non-authoritative development/content side-channel.
It never bypasses Areloria's server-authoritative tick/canonical-intent/hash path.
EOF
    ;;
  *)
    echo "Unknown command: ${command_name}" >&2
    echo "Run: bash genkit.sh help" >&2
    exit 64
    ;;
esac
