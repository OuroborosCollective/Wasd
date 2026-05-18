#!/usr/bin/env bash
# Run on the VPS inside the monorepo root, for example /opt/areloria.
# Pulls latest main, rebuilds Docker images, restarts stack, then checks readiness.
set -euo pipefail

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ARELORIAN_PORT="${ARELORIAN_PORT:-3001}"
CONTAINER_PORT="${ARELORIAN_CONTAINER_PORT:-3001}"
ARELORIAN_DOCKER_NETWORK="${ARELORIAN_DOCKER_NETWORK:-areloria_arelorian-network}"
ARELORIAN_ENV_FILE="${ARELORIAN_ENV_FILE:-.env.docker}"
ARELORIAN_ENABLE_DOCKER_INGRESS="${ARELORIAN_ENABLE_DOCKER_INGRESS:-false}"
ARELORIAN_INGRESS_HTTP_BIND="${ARELORIAN_INGRESS_HTTP_BIND:-0.0.0.0}"
ARELORIAN_INGRESS_HTTP_PORT="${ARELORIAN_INGRESS_HTTP_PORT:-80}"
export ARELORIAN_PORT ARELORIAN_DOCKER_NETWORK ARELORIAN_ENABLE_DOCKER_INGRESS ARELORIAN_INGRESS_HTTP_BIND ARELORIAN_INGRESS_HTTP_PORT
cd "$REPO_ROOT"

LOCK_PATH="${DEPLOY_LOCK_PATH:-/tmp/wasd-vps-docker-deploy.lock}"
DEPLOY_LOCK_WAIT_SECONDS="${DEPLOY_LOCK_WAIT_SECONDS:-1800}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_PATH"
  echo "Acquiring VPS deploy lock: $LOCK_PATH (wait ${DEPLOY_LOCK_WAIT_SECONDS}s)"
  if ! flock -w "$DEPLOY_LOCK_WAIT_SECONDS" 9; then
    echo "ERROR: another WASD deploy is still running on this VPS after ${DEPLOY_LOCK_WAIT_SECONDS}s."
    echo "Check with: ps aux | grep -E 'deploy-vps-docker|docker compose|pnpm|vite'"
    exit 1
  fi
fi

command -v git >/dev/null 2>&1 || { echo "ERROR: git is required."; exit 1; }
docker info >/dev/null 2>&1 || { echo "ERROR: Docker daemon not reachable."; exit 1; }
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  echo "ERROR: Install Docker Compose v2 or docker-compose v1."
  exit 1
fi

compose_cmd() {
  local files=(-f docker-compose.yml)
  if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
    files+=(-f docker-compose.ingress.yml --profile ingress)
  fi
  if [ -f "$ARELORIAN_ENV_FILE" ]; then
    "${DC[@]}" --env-file "$ARELORIAN_ENV_FILE" "${files[@]}" "$@"
  else
    "${DC[@]}" "${files[@]}" "$@"
  fi
}

ensure_external_network() {
  if docker network inspect "$ARELORIAN_DOCKER_NETWORK" >/dev/null 2>&1; then
    echo "Docker network OK: $ARELORIAN_DOCKER_NETWORK"
    return 0
  fi
  echo "Creating Docker network: $ARELORIAN_DOCKER_NETWORK"
  docker network create "$ARELORIAN_DOCKER_NETWORK" >/dev/null
}

connect_existing_container() {
  local name="$1"
  if ! docker ps -a --format '{{.Names}}' | grep -Fxq "$name"; then
    return 0
  fi
  if docker inspect "$name" --format '{{json .NetworkSettings.Networks}}' | grep -q "\"$ARELORIAN_DOCKER_NETWORK\""; then
    return 0
  fi
  echo "Connecting $name -> $ARELORIAN_DOCKER_NETWORK"
  docker network connect "$ARELORIAN_DOCKER_NETWORK" "$name" >/dev/null 2>&1 || true
}

connect_known_service_containers() {
  for name in supabase-auth supabase-db supabase-kong supabase-rest redis-comn-redis-1 soketi-9eoa-soketi-1; do
    connect_existing_container "$name"
  done
}

fetch_and_reset() {
  local temp_ref="refs/wasd-deploy/${DEPLOY_BRANCH}"
  echo "[1/4] git fetch + hard reset via temporary deploy ref"
  git reset --hard >/dev/null 2>&1 || true
  git clean -fd -e .env -e .env.local -e .env.docker -e data/ -e logs/ >/dev/null 2>&1 || true
  git update-ref -d "$temp_ref" >/dev/null 2>&1 || true
  if ! git -c remote.origin.fetch= fetch --no-tags origin "+refs/heads/${DEPLOY_BRANCH}:${temp_ref}"; then
    echo "WARN: fetch failed; healing stale origin ref and retrying once."
    git update-ref -d "refs/remotes/origin/${DEPLOY_BRANCH}" >/dev/null 2>&1 || true
    git remote prune origin >/dev/null 2>&1 || true
    git -c remote.origin.fetch= fetch --no-tags origin "+refs/heads/${DEPLOY_BRANCH}:${temp_ref}"
  fi
  git reset --hard "$temp_ref"
  git update-ref -d "$temp_ref" >/dev/null 2>&1 || true
}

container_http_ready() {
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/health').then(r=>process.exit((r.ok||r.status===503)?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && return 0
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/client-config.json').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && return 0
  return 1
}

client_shell_ready() {
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/').then(async r=>{const body=await r.text();process.exit(r.ok&&body.includes('application-canvas')?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
}

host_http_ready() {
  curl -sS -m 4 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${ARELORIAN_PORT}/health" 2>/dev/null | grep -Eq '^(200|204|301|302|304|401|403|503)$' && return 0
  curl -sS -m 4 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${ARELORIAN_PORT}/client-config.json" 2>/dev/null | grep -Eq '^(200|204|301|302|304|401|403|503)$' && return 0
  return 1
}

ingress_http_ready() {
  [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ] || return 0
  curl -sS -m 4 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${ARELORIAN_INGRESS_HTTP_PORT}/health" 2>/dev/null | grep -Eq '^(200|204|301|302|304|401|403|503)$'
}

runtime_activity_ready() {
  local state exit_code
  state="$(docker inspect arelorian-engine --format '{{.State.Status}}' 2>/dev/null || true)"
  exit_code="$(docker inspect arelorian-engine --format '{{.State.ExitCode}}' 2>/dev/null || echo 1)"
  [ "$state" = "running" ] || return 1
  [ "$exit_code" = "0" ] || return 1
  docker exec arelorian-engine sh -lc "ps aux | grep -q '[n]ode dist/index.js'" >/dev/null 2>&1 || return 1
  compose_cmd logs --tail=240 arelorian-engine 2>/dev/null | grep -Eq 'Arelorian server listening|WorldEventBus|warfront_combat|tick' && return 0
  return 1
}

echo "=== WASD monorepo deploy (Docker) ==="
echo "Repo: $REPO_ROOT"
echo "Branch: $DEPLOY_BRANCH"
echo "Engine host port: $ARELORIAN_PORT"
echo "Engine container port: $CONTAINER_PORT"
echo "Docker network: $ARELORIAN_DOCKER_NETWORK"
echo "Runtime env file: $ARELORIAN_ENV_FILE"
echo "Docker ingress enabled: $ARELORIAN_ENABLE_DOCKER_INGRESS"
if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
  echo "Ingress bind: ${ARELORIAN_INGRESS_HTTP_BIND}:${ARELORIAN_INGRESS_HTTP_PORT}"
fi

fetch_and_reset

echo "Deploy commit: $(git rev-parse --short HEAD)"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export COMPOSE_PARALLEL_LIMIT="${COMPOSE_PARALLEL_LIMIT:-1}"

ensure_external_network
connect_known_service_containers

echo "Memory headroom: RAM=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)MB SWAP=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)MB"
echo "Reducing Docker build pressure before pnpm install ..."
docker builder prune -f --filter 'until=24h' >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

echo "[2/4] Build images (monorepo context, sequential to avoid OOM)"
compose_cmd build --progress=plain arelorian-engine
compose_cmd build --progress=plain monitor-bridge

echo "[3/4] Recreate containers"
compose_cmd down --remove-orphans || true
docker rm -f arelorian-engine monitor-bridge arelorian-ingress-router >/dev/null 2>&1 || true
compose_cmd up -d --remove-orphans arelorian-engine monitor-bridge
if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
  compose_cmd up -d --remove-orphans ingress-router
fi

echo "[4/4] Health check (container:${CONTAINER_PORT}, host:${ARELORIAN_PORT})"
ok=0
for i in $(seq 1 36); do
  if container_http_ready; then
    echo "  container HTTP ready ($i/36)"
    if client_shell_ready; then
      echo "  client shell ready"
      if host_http_ready; then echo "  host HTTP mapping ready"; else echo "  WARN: host mapping not responding yet"; fi
      if ingress_http_ready; then echo "  ingress HTTP ready"; else echo "  WARN: ingress HTTP not responding yet"; fi
      ok=1
      break
    fi
    echo "  waiting for client shell... ($i/36)"
  fi
  if [ "$i" -ge 12 ] && runtime_activity_ready; then
    echo "  runtime activity ready ($i/36): node process and world events detected"
    if client_shell_ready; then
      echo "  client shell ready"
      if ingress_http_ready; then echo "  ingress HTTP ready"; else echo "  WARN: ingress HTTP not responding yet"; fi
      ok=1
      break
    fi
    echo "  waiting for client shell... ($i/36)"
  fi
  echo "  waiting... ($i/36)"
  sleep 5
done

if [[ "$ok" != "1" ]]; then
  echo "ERROR: Container health failed. Showing diagnostics:"
  compose_cmd ps || true
  docker inspect arelorian-engine --format 'Container={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} ExitCode={{.State.ExitCode}} Ports={{json .NetworkSettings.Ports}}' || true
  if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
    docker inspect arelorian-ingress-router --format 'Ingress={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} ExitCode={{.State.ExitCode}} Ports={{json .NetworkSettings.Ports}}' || true
  fi
  docker exec arelorian-engine sh -lc "node -v; printenv PORT GAME_PORT HOST NODE_ENV; ps aux | head -20" || true
  ss -ltnp "sport = :${ARELORIAN_PORT}" || true
  compose_cmd logs --tail=160 arelorian-engine || true
  if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
    compose_cmd logs --tail=160 ingress-router || true
  fi
  exit 1
fi

docker image prune -f >/dev/null 2>&1 || true
echo "=== Deploy OK ($(git rev-parse --short HEAD)) ==="
