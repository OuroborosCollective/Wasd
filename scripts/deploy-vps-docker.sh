#!/usr/bin/env bash
# Run on the VPS inside the monorepo root (e.g. /opt/areloria).
# Pulls latest main, rebuilds Docker images, restarts stack, health-checks.
# Deploy trigger touch: keep this file in workflow path filters.
set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ARELORIAN_PORT="${ARELORIAN_PORT:-3001}"
CONTAINER_PORT="${ARELORIAN_CONTAINER_PORT:-3001}"
ARELORIAN_DOCKER_NETWORK="${ARELORIAN_DOCKER_NETWORK:-areloria_arelorian-network}"
export ARELORIAN_PORT ARELORIAN_DOCKER_NETWORK
cd "$REPO_ROOT"

LOCK_PATH="${DEPLOY_LOCK_PATH:-/tmp/wasd-vps-docker-deploy.lock}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_PATH"
  if ! flock -n 9; then echo "ERROR: another WASD deploy is already running on this VPS."; exit 1; fi
else
  LOCK_DIR="${LOCK_PATH}.d"
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then echo "ERROR: another WASD deploy is already running on this VPS."; exit 1; fi
  trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
fi

command -v git >/dev/null 2>&1 || { echo "ERROR: git is required."; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon not reachable. Is Docker installed and running?"; exit 1; }
if docker compose version >/dev/null 2>&1; then DC=(docker compose); elif command -v docker-compose >/dev/null 2>&1; then DC=(docker-compose); else echo "ERROR: Install Docker Compose v2 or docker-compose v1."; exit 1; fi

ensure_external_network() { docker network inspect "$ARELORIAN_DOCKER_NETWORK" >/dev/null 2>&1 && { echo "Docker network OK: $ARELORIAN_DOCKER_NETWORK"; return 0; }; echo "Creating Docker network: $ARELORIAN_DOCKER_NETWORK"; docker network create "$ARELORIAN_DOCKER_NETWORK" >/dev/null; }

free_engine_port() {
  local ids pids port="$ARELORIAN_PORT"
  ids="$(docker ps -a --format '{{.ID}} {{.Ports}}' | awk -v port="$port" '$0 ~ ":" port "->" || $0 ~ "0.0.0.0:" port "-" || $0 ~ ":::" port "-" {print $1}' | tr '\n' ' ')"
  if [ -n "${ids// }" ]; then echo "Removing Docker container(s) publishing port ${port}: $ids"; docker rm -f $ids >/dev/null 2>&1 || true; fi
  if command -v fuser >/dev/null 2>&1; then pids="$(fuser -n tcp "$port" 2>/dev/null || true)"; if [ -n "${pids// }" ]; then echo "Stopping host process(es) listening on port ${port}: $pids"; kill $pids >/dev/null 2>&1 || true; sleep 2; kill -9 $pids >/dev/null 2>&1 || true; fi
  elif command -v lsof >/dev/null 2>&1; then pids="$(lsof -ti tcp:"$port" 2>/dev/null | tr '\n' ' ')"; if [ -n "${pids// }" ]; then echo "Stopping host process(es) listening on port ${port}: $pids"; kill $pids >/dev/null 2>&1 || true; sleep 2; kill -9 $pids >/dev/null 2>&1 || true; fi; fi
}

ensure_swap_headroom() { local swap_mb mem_mb; swap_mb="$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"; mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"; echo "Memory headroom: RAM=${mem_mb}MB SWAP=${swap_mb}MB"; }
prune_docker_build_pressure() { echo "Reducing Docker build pressure before pnpm install ..."; docker builder prune -f --filter 'until=24h' >/dev/null 2>&1 || true; docker image prune -f >/dev/null 2>&1 || true; docker container prune -f >/dev/null 2>&1 || true; }
heal_stale_git_refs() { local remote_ref="refs/remotes/origin/${DEPLOY_BRANCH}"; echo "Healing stale git ref cache for origin/${DEPLOY_BRANCH} ..."; rm -f ".git/${remote_ref}.lock" ".git/logs/${remote_ref}.lock" ".git/${remote_ref}" ".git/logs/${remote_ref}" || true; git update-ref -d "$remote_ref" >/dev/null 2>&1 || true; git remote prune origin >/dev/null 2>&1 || true; }
fetch_and_reset() { local temp_ref="refs/wasd-deploy/${DEPLOY_BRANCH}"; echo "[1/4] git fetch + hard reset via temporary deploy ref"; git reset --hard >/dev/null 2>&1 || true; git clean -fd >/dev/null 2>&1 || true; git update-ref -d "$temp_ref" >/dev/null 2>&1 || true; if ! git -c remote.origin.fetch= fetch --no-tags origin "+refs/heads/${DEPLOY_BRANCH}:${temp_ref}"; then echo "WARN: fetch failed. Running remote-ref self-heal and retrying once."; heal_stale_git_refs; git -c remote.origin.fetch= fetch --no-tags origin "+refs/heads/${DEPLOY_BRANCH}:${temp_ref}"; fi; git reset --hard "$temp_ref"; git update-ref -d "$temp_ref" >/dev/null 2>&1 || true; }

container_http_ready() {
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/health').then(r=>process.exit((r.ok||r.status===503)?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && return 0
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/client-config.json').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && return 0
  return 1
}

host_http_ready() {
  curl -sS -m 4 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${ARELORIAN_PORT}/health" 2>/dev/null | grep -Eq '^(200|204|301|302|304|401|403|503)$' && return 0
  curl -sS -m 4 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${ARELORIAN_PORT}/client-config.json" 2>/dev/null | grep -Eq '^(200|204|301|302|304|401|403|503)$' && return 0
  return 1
}

echo "=== WASD monorepo deploy (Docker) ==="
echo "Repo: $REPO_ROOT"
echo "Branch: $DEPLOY_BRANCH"
echo "Engine host port: $ARELORIAN_PORT"
echo "Engine container port: $CONTAINER_PORT"
echo "Docker network: $ARELORIAN_DOCKER_NETWORK"

fetch_and_reset

echo "Deploy commit: $(git rev-parse --short HEAD)"

grep -n "container_http_ready" scripts/deploy-vps-docker.sh || true

export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export BUILDKIT_STEP_LOG_MAX_SIZE="${BUILDKIT_STEP_LOG_MAX_SIZE:-10485760}"
export BUILDKIT_STEP_LOG_MAX_SPEED="${BUILDKIT_STEP_LOG_MAX_SPEED:-1048576}"
export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"

ensure_external_network
ensure_swap_headroom
prune_docker_build_pressure

echo "[2/4] Build images (monorepo context, sequential to avoid OOM)"
"${DC[@]}" -f docker-compose.yml build --progress=plain arelorian-engine
"${DC[@]}" -f docker-compose.yml build --progress=plain monitor-bridge

echo "[3/4] Recreate containers"
"${DC[@]}" -f docker-compose.yml down --remove-orphans || true
free_engine_port
"${DC[@]}" -f docker-compose.yml up -d --remove-orphans arelorian-engine monitor-bridge

echo "[4/4] Health check (container:${CONTAINER_PORT}, host:${ARELORIAN_PORT})"
ok=0
for i in $(seq 1 36); do
  if container_http_ready; then
    echo "  container HTTP ready ($i/36)"
    if host_http_ready; then echo "  host HTTP mapping ready"; else echo "  WARN: container ready but host mapping not responding yet"; fi
    ok=1
    break
  fi
  echo "  waiting... ($i/36)"
  sleep 5
done

if [[ "$ok" != "1" ]]; then
  echo "ERROR: Container HTTP health failed. Showing diagnostics:"
  "${DC[@]}" -f docker-compose.yml ps || true
  docker inspect arelorian-engine --format 'Container={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} ExitCode={{.State.ExitCode}} Ports={{json .NetworkSettings.Ports}}' || true
  docker exec arelorian-engine sh -lc "node -v; printenv PORT GAME_PORT HOST NODE_ENV; ps aux | head -20" || true
  ss -ltnp "sport = :${ARELORIAN_PORT}" || true
  "${DC[@]}" -f docker-compose.yml logs --tail=160 arelorian-engine || true
  exit 1
fi

docker image prune -f >/dev/null 2>&1 || true
echo "=== Deploy OK ($(git rev-parse --short HEAD)) ==="
