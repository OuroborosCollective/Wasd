#!/usr/bin/env bash
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
CLIENT_2D_MARKER="${CLIENT_2D_MARKER:-REAL_PIXI_CLIENT}"
CLIENT_2D_BUILD_SHA="${CLIENT_2D_BUILD_SHA:-}"
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"
export ARELORIAN_PORT ARELORIAN_DOCKER_NETWORK ARELORIAN_ENABLE_DOCKER_INGRESS ARELORIAN_INGRESS_HTTP_BIND ARELORIAN_INGRESS_HTTP_PORT CLIENT_2D_MARKER CLIENT_2D_BUILD_SHA NODE_OPTIONS
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

env_key_present() {
  local key="$1"
  local value="${!key-}"
  [ -n "$value" ] && return 0
  [ -f "$ARELORIAN_ENV_FILE" ] && grep -Eq "^${key}=.+" "$ARELORIAN_ENV_FILE" && return 0
  return 1
}

validate_required_runtime_env() {
  local missing=0
  echo "=== Runtime env preflight ==="
  if ! env_key_present DATABASE_URL; then
    echo "ERROR: DATABASE_URL is missing. Areloria Docker must receive the Supabase/Postgres URL before startup."
    missing=1
  fi
  if ! env_key_present API_KEY && ! env_key_present API_KEYS; then
    echo "ERROR: API_KEY or API_KEYS is missing. Production API hardening requires at least one runtime API key."
    missing=1
  fi
  if ! env_key_present ALLOWED_ORIGINS && ! env_key_present CORS_ORIGINS; then
    echo "ERROR: ALLOWED_ORIGINS or CORS_ORIGINS is missing. Production CORS must be explicit."
    missing=1
  fi
  if [ "$missing" != "0" ]; then
    echo "Runtime env source checked: $REPO_ROOT/$ARELORIAN_ENV_FILE plus current process env."
    exit 1
  fi
  echo "Runtime env OK: DATABASE_URL, API key and CORS origins are configured."
}

validate_client_2d_dockerfile_gate() {
  echo "=== Client-2D Dockerfile gate preflight ==="
  echo "Deploy HEAD: $(git rev-parse --short HEAD)"
  git status --short Dockerfile.vps docker-compose.yml apps/client-2d/index.html apps/client-2d/dist/build-stamp.json || true

  if [ ! -f Dockerfile.vps ]; then
    echo "ERROR: Dockerfile.vps is missing; VPS compose cannot prove the real 2D client build gate."
    exit 1
  fi

  echo "Dockerfile.vps client-2d block:"
  sed -n '80,115p' Dockerfile.vps || true

  if grep -Eq 'Arelorian 2D temporarily unavailable|build process exceeded available memory|pnpm --filter @wasd/client-2d --if-present build \|\|' Dockerfile.vps; then
    echo "ERROR: Dockerfile.vps still contains the old 2D placeholder/offline fallback path."
    echo "Refusing deploy before Docker can build a fake /2d/ client."
    exit 1
  fi

  if ! grep -q "$CLIENT_2D_MARKER" Dockerfile.vps; then
    echo "ERROR: Dockerfile.vps does not enforce ${CLIENT_2D_MARKER}."
    exit 1
  fi

  if ! grep -q "$CLIENT_2D_MARKER" apps/client-2d/index.html; then
    echo "ERROR: apps/client-2d/index.html is missing ${CLIENT_2D_MARKER}."
    exit 1
  fi

  if [ -n "$CLIENT_2D_BUILD_SHA" ]; then
    test -f apps/client-2d/dist/build-stamp.json || { echo "ERROR: prebuilt client-2d build-stamp.json missing before Docker build."; exit 1; }
    grep -q "$CLIENT_2D_BUILD_SHA" apps/client-2d/dist/build-stamp.json || { echo "ERROR: prebuilt client-2d build stamp does not match ${CLIENT_2D_BUILD_SHA}."; cat apps/client-2d/dist/build-stamp.json || true; exit 1; }
    echo "Client-2D build stamp preflight OK: ${CLIENT_2D_BUILD_SHA}"
  else
    echo "WARN: CLIENT_2D_BUILD_SHA is empty; deploy can only prove marker, not exact client bundle freshness."
  fi

  echo "Client-2D Dockerfile gate OK: ${CLIENT_2D_MARKER} enforced."
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
  for name in supabase-auth supabase-db supabase-kong supabase-rest supabase-realtime supabase-storage supabase-meta redis-comn-redis-1 soketi-9eoa-soketi-1; do
    connect_existing_container "$name"
  done
}

neutralize_legacy_node_runtime() {
  echo "=== Neutralize legacy non-Docker runtime ==="

  if command -v pm2 >/dev/null 2>&1; then
    pm2 stop areloria >/dev/null 2>&1 || true
    pm2 delete areloria >/dev/null 2>&1 || true
    pm2 stop arelorian >/dev/null 2>&1 || true
    pm2 delete arelorian >/dev/null 2>&1 || true
    pm2 stop wasd >/dev/null 2>&1 || true
    pm2 delete wasd >/dev/null 2>&1 || true
    pm2 save --force >/dev/null 2>&1 || true
  fi

  for svc in areloria arelorian wasd wasd-server node-app pm2-root pm2-ubuntu; do
    sudo systemctl stop "${svc}.service" >/dev/null 2>&1 || true
    sudo systemctl disable "${svc}.service" >/dev/null 2>&1 || true
  done

  sudo pkill -f 'tsx.*server/src/index.ts' >/dev/null 2>&1 || true
  sudo pkill -f 'node.*server/src/index.ts' >/dev/null 2>&1 || true
  sudo pkill -f 'server/src/index.ts' >/dev/null 2>&1 || true
}

free_host_port_safely() {
  local port="$1"
  echo "=== Preflight: check host port ${port} ==="
  ss -ltnp "sport = :${port}" || true
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN -P -n || true
  fi
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN -P -n 2>/dev/null || true)"
  else
    pids="$(ss -ltnp "sport = :${port}" 2>/dev/null | sed -nE 's/.*pid=([0-9]+).*/\1/p' | sort -u || true)"
  fi
  [ -n "$pids" ] || { echo "Port ${port} is free."; return 0; }
  for pid in $pids; do
    local cmd=""
    cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    echo "Port ${port} owner PID ${pid}: ${cmd}"
    case "$cmd" in
      *areloria*|*arelorian*|*wasd*|*node*|*docker-proxy*)
        echo "Stopping stale app process ${pid}"
        kill "$pid" 2>/dev/null || sudo kill "$pid" 2>/dev/null || true
        sleep 2
        if ps -p "$pid" >/dev/null 2>&1; then
          echo "Force stopping stale app process ${pid}"
          kill -9 "$pid" 2>/dev/null || sudo kill -9 "$pid" 2>/dev/null || true
        fi
        ;;
      *)
        echo "ERROR: Refusing to kill unrelated process on port ${port}: ${cmd}"
        exit 1
        ;;
    esac
  done
  ss -ltnp "sport = :${port}" || true
}

assert_host_port_free_stable() {
  local port="$1"
  local rounds="${2:-5}"

  echo "=== Assert host port ${port} stays free ==="

  for i in $(seq 1 "$rounds"); do
    if ss -ltnp "sport = :${port}" | grep -q LISTEN; then
      echo "ERROR: Port ${port} is occupied on check ${i}/${rounds}."
      ss -ltnp "sport = :${port}" || true

      if command -v lsof >/dev/null 2>&1; then
        sudo lsof -iTCP:"${port}" -sTCP:LISTEN -P -n || true
        local pid=""
        pid="$(sudo lsof -tiTCP:"${port}" -sTCP:LISTEN | head -n1 || true)"
        if [ -n "${pid:-}" ]; then
          echo "=== Process tree for port owner ==="
          ps -fp "$pid" || true
          if command -v pstree >/dev/null 2>&1; then
            pstree -asp "$pid" || true
          fi
        fi
      fi

      exit 1
    fi

    sleep 1
  done

  echo "Port ${port} stayed free."
}

fetch_and_reset() {
  local temp_ref="refs/wasd-deploy/${DEPLOY_BRANCH}"
  echo "[1/4] git fetch + hard reset via temporary deploy ref"
  git reset --hard >/dev/null 2>&1 || true
  git clean -fd -e .env -e .env.local -e .env.docker -e data/ -e logs/ -e apps/client-2d/dist/ >/dev/null 2>&1 || true
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
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/').then(async r=>{const body=await r.text();process.exit(r.ok&&(body.includes('application-canvas')||body.includes('LIVE_ENTRYPOINTS')||body.includes('Cyber-Zen Landing'))?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
}

client_2d_shell_ready() {
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/2d/').then(async r=>{const body=await r.text();process.exit(r.ok&&body.includes(process.env.CLIENT_2D_MARKER||'REAL_PIXI_CLIENT')?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
}

client_2d_build_stamp_ready() {
  [ -n "$CLIENT_2D_BUILD_SHA" ] || return 0
  docker exec arelorian-engine sh -lc "test -f /app/server/client/dist/2d/build-stamp.json && grep -q '$CLIENT_2D_BUILD_SHA' /app/server/client/dist/2d/build-stamp.json" >/dev/null 2>&1 && return 0
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/2d/build-stamp.json').then(async r=>{const data=await r.json();process.exit(r.ok&&data.commit===process.env.CLIENT_2D_BUILD_SHA?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
}

portal_shell_ready() {
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/portal/').then(async r=>{const body=await r.text();process.exit(r.ok&&body.includes('PORTAL ONLINE')?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1
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
echo "NODE_OPTIONS: $NODE_OPTIONS"
echo "Client-2D marker: $CLIENT_2D_MARKER"
echo "Client-2D build sha: ${CLIENT_2D_BUILD_SHA:-none}"
if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
  echo "Ingress bind: ${ARELORIAN_INGRESS_HTTP_BIND}:${ARELORIAN_INGRESS_HTTP_PORT}"
fi

fetch_and_reset
validate_client_2d_dockerfile_gate
validate_required_runtime_env

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
compose_cmd --progress plain build arelorian-engine
compose_cmd --progress plain build monitor-bridge

echo "[3/4] Recreate containers"
compose_cmd down --remove-orphans || true
docker rm -f arelorian-engine monitor-bridge arelorian-ingress-router >/dev/null 2>&1 || true
neutralize_legacy_node_runtime
free_host_port_safely "$ARELORIAN_PORT"
assert_host_port_free_stable "$ARELORIAN_PORT" 5
compose_cmd up -d --remove-orphans arelorian-engine monitor-bridge
if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
  compose_cmd up -d --remove-orphans ingress-router
fi

ok=0
for i in $(seq 1 36); do
  if container_http_ready; then
    echo "  container HTTP ready ($i/36)"
    if client_shell_ready && client_2d_shell_ready && client_2d_build_stamp_ready && portal_shell_ready; then
      echo "  client shell ready"
      echo "  client-2d shell ready (${CLIENT_2D_MARKER})"
      echo "  client-2d build stamp ready (${CLIENT_2D_BUILD_SHA:-not-required})"
      echo "  portal shell ready"
      if host_http_ready; then echo "  host HTTP mapping ready"; else echo "  WARN: host mapping not responding yet"; fi
      if ingress_http_ready; then echo "  ingress HTTP ready"; else echo "  WARN: ingress HTTP not responding yet"; fi
      ok=1
      break
    fi
    echo "  waiting for client/2d/portal shell/build stamp... ($i/36)"
  fi
  if [ "$i" -ge 12 ] && runtime_activity_ready; then
    echo "  runtime activity ready ($i/36): node process and world events detected"
    if client_shell_ready && client_2d_shell_ready && client_2d_build_stamp_ready && portal_shell_ready; then
      echo "  client shell ready"
      echo "  client-2d shell ready (${CLIENT_2D_MARKER})"
      echo "  client-2d build stamp ready (${CLIENT_2D_BUILD_SHA:-not-required})"
      echo "  portal shell ready"
      if ingress_http_ready; then echo "  ingress HTTP ready"; else echo "  WARN: ingress HTTP not responding yet"; fi
      ok=1
      break
    fi
    echo "  waiting for client/2d/portal shell/build stamp... ($i/36)"
  fi
  echo "  waiting... ($i/36)"
  sleep 5
done

if [[ "$ok" != "1" ]]; then
  echo "ERROR: Container health failed. Showing diagnostics:"
  compose_cmd ps || true
  docker inspect arelorian-engine --format 'Container={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} ExitCode={{.State.ExitCode}} Ports={{json .NetworkSettings.Ports}}' || true
  if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
    docker inspect arelorian-ingress-router --format 'Ingress={{.State.Status}} Health={{if .State.Health}}{{else}}n/a{{end}} ExitCode={{.State.ExitCode}} Ports={{json .NetworkSettings.Ports}}' || true
  fi
  docker exec arelorian-engine sh -lc "node -v; printenv PORT GAME_PORT HOST NODE_ENV NODE_OPTIONS CLIENT_2D_MARKER CLIENT_2D_BUILD_SHA; ps aux | head -20; ls -lah /app/server/client/dist/2d; cat /app/server/client/dist/2d/build-stamp.json 2>/dev/null || true" || true
  docker exec arelorian-engine node -e "fetch('http://127.0.0.1:${CONTAINER_PORT}/2d/').then(async r=>{console.log('2d status',r.status); console.log((await r.text()).slice(0,800));}).catch(e=>{console.error(e); process.exit(1)})" || true
  ss -ltnp "sport = :${ARELORIAN_PORT}" || true
  compose_cmd logs --tail=160 arelorian-engine || true
  if [ "$ARELORIAN_ENABLE_DOCKER_INGRESS" = "true" ]; then
    compose_cmd logs --tail=160 ingress-router || true
  fi
  exit 1
fi

docker image prune -f >/dev/null 2>&1 || true
echo "=== Deploy OK ($(git rev-parse --short HEAD)) ==="
