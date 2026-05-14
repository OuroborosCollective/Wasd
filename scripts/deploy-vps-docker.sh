#!/usr/bin/env bash
# Run on the VPS inside the monorepo root (e.g. /opt/areloria).
# Pulls latest main, rebuilds Docker images, restarts stack, health-checks.
set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon not reachable. Is Docker installed and running?"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "ERROR: Install Docker Compose v2 (docker compose) or docker-compose v1."
  exit 1
fi

echo "=== WASD monorepo deploy (Docker) ==="
echo "Repo: $REPO_ROOT"
echo "Branch: $DEPLOY_BRANCH"

echo "[1/4] git fetch + hard reset to origin/${DEPLOY_BRANCH}"
git fetch origin "$DEPLOY_BRANCH"
git reset --hard "origin/${DEPLOY_BRANCH}"

export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"

echo "[2/4] Build images (monorepo context)"
"${DC[@]}" -f docker-compose.yml build arelorian-engine monitor-bridge

echo "[3/4] Recreate containers"
"${DC[@]}" -f docker-compose.yml up -d arelorian-engine monitor-bridge

echo "[4/4] Health check (engine :3000)"
ok=0
for i in $(seq 1 24); do
  if curl -sf "http://127.0.0.1:3000/health" >/dev/null; then
    ok=1
    break
  fi
  echo "  waiting... ($i/24)"
  sleep 5
done

if [[ "$ok" != "1" ]]; then
  echo "ERROR: Health check failed. Showing last logs:"
  "${DC[@]}" -f docker-compose.yml logs --tail=80 arelorian-engine || true
  exit 1
fi

docker image prune -f >/dev/null 2>&1 || true
echo "=== Deploy OK ($(git rev-parse --short HEAD)) ==="
