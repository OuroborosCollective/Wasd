#!/usr/bin/env bash
# Run on the VPS inside the monorepo root (e.g. /opt/areloria).
# Pulls latest main, rebuilds Docker images, restarts stack, health-checks.
# Deploy trigger touch: keep this file in workflow path filters.
set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

LOCK_PATH="${DEPLOY_LOCK_PATH:-/tmp/wasd-vps-docker-deploy.lock}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_PATH"
  if ! flock -n 9; then
    echo "ERROR: another WASD deploy is already running on this VPS."
    exit 1
  fi
else
  LOCK_DIR="${LOCK_PATH}.d"
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "ERROR: another WASD deploy is already running on this VPS."
    exit 1
  fi
  trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
fi

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

echo "[1/4] git fetch + hard reset via FETCH_HEAD"
# Fetch the branch directly into FETCH_HEAD instead of updating origin/main.
# This avoids remote-tracking-ref lock races when back-to-back deploys overlap.
git fetch --no-tags origin "refs/heads/${DEPLOY_BRANCH}"
git reset --hard FETCH_HEAD

echo "Deploy commit: $(git rev-parse --short HEAD)"

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
