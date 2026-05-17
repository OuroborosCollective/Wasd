#!/usr/bin/env bash
set -Eeuo pipefail
trap 'rc=$?; echo "ERROR: VPS deploy helper failed at line $LINENO with rc=$rc"; echo "PWD=$(pwd 2>/dev/null || true)"; exit $rc' ERR

DEPLOY_PATH="${DEPLOY_PATH:-/opt/areloria}"
REPO_URL="${REPO_URL:-https://github.com/OuroborosCollective/Wasd.git}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
ARELORIAN_PORT="${ARELORIAN_PORT:-3001}"
ARELORIAN_DOCKER_NETWORK="${ARELORIAN_DOCKER_NETWORK:-areloria_arelorian-network}"
ARELORIAN_ENABLE_DOCKER_INGRESS="${ARELORIAN_ENABLE_DOCKER_INGRESS:-false}"
ARELORIAN_INGRESS_HTTP_BIND="${ARELORIAN_INGRESS_HTTP_BIND:-127.0.0.1}"
ARELORIAN_INGRESS_HTTP_PORT="${ARELORIAN_INGRESS_HTTP_PORT:-8080}"
ARELORIAN_ENV_FILE="${ARELORIAN_ENV_FILE:-.env.docker}"

run_sudo() {
  if command -v sudo >/dev/null 2>&1; then
    sudo -n "$@"
  else
    return 127
  fi
}

ensure_dir() {
  local dir="$1"
  if [ -d "$dir" ]; then
    return 0
  fi
  mkdir -p "$dir" 2>/dev/null || run_sudo mkdir -p "$dir" || {
    echo "ERROR: cannot create $dir"
    echo "Parent diagnostics:"
    ls -ld "$(dirname "$dir")" 2>/dev/null || true
    id || true
    exit 1
  }
}

choose_docker() {
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo docker
  elif command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
    echo 'sudo -n docker'
  else
    return 1
  fi
}

update_env_key() {
  local key="$1"
  local value="$2"
  local tmp_file="${ARELORIAN_ENV_FILE}.tmp"
  grep -v "^${key}=" "$ARELORIAN_ENV_FILE" > "$tmp_file" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp_file"
  mv "$tmp_file" "$ARELORIAN_ENV_FILE"
  chmod 600 "$ARELORIAN_ENV_FILE"
}

echo "=== WASD VPS Docker Deploy ==="
echo "Deploy path: $DEPLOY_PATH"
echo "Branch: $DEPLOY_BRANCH"
echo "Engine port: $ARELORIAN_PORT"
echo "--- VPS preflight ---"
echo "User: $(id -un)"
echo "Group: $(id -gn)"
echo "Shell: ${SHELL:-unknown}"
uname -a || true

command -v git >/dev/null 2>&1 || { echo "ERROR: git is required on the VPS."; exit 1; }
git --version || true

DOCKER="$(choose_docker)" || {
  echo "ERROR: Docker daemon is not reachable by this SSH user or passwordless sudo."
  command -v docker >/dev/null 2>&1 && docker --version || true
  command -v sudo >/dev/null 2>&1 && sudo -n docker --version || true
  exit 1
}
echo "Docker command: $DOCKER"
$DOCKER --version || true
if ! $DOCKER compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  echo "ERROR: Docker Compose is required on the VPS."
  exit 1
fi
$DOCKER compose version || docker-compose --version || true

echo "[0/5] Prepare deploy directory"
echo "Parent: $(dirname "$DEPLOY_PATH")"
ls -ld "$(dirname "$DEPLOY_PATH")" 2>/dev/null || true
if [ -e "$DEPLOY_PATH" ]; then
  ls -ld "$DEPLOY_PATH" 2>/dev/null || true
  ls -ld "$DEPLOY_PATH/.git" 2>/dev/null || true
fi
ensure_dir "$DEPLOY_PATH"

if [ ! -w "$DEPLOY_PATH" ]; then
  echo "Deploy path is not writable; trying ownership repair."
  run_sudo chown -R "$(id -un):$(id -gn)" "$DEPLOY_PATH" || true
fi
[ -w "$DEPLOY_PATH" ] || { echo "ERROR: $DEPLOY_PATH is not writable."; ls -ld "$DEPLOY_PATH" || true; exit 1; }

if [ -e "$DEPLOY_PATH" ] && [ ! -d "$DEPLOY_PATH/.git" ]; then
  first_entry="$(find "$DEPLOY_PATH" -mindepth 1 -maxdepth 1 2>/dev/null | head -n 1 || true)"
  if [ -n "$first_entry" ]; then
    backup="${DEPLOY_PATH}.backup.$(date +%Y%m%d%H%M%S)"
    echo "Existing non-git deploy dir found. Moving to $backup"
    mv "$DEPLOY_PATH" "$backup" 2>/dev/null || run_sudo mv "$DEPLOY_PATH" "$backup" || { echo "ERROR: cannot move non-git deploy dir"; exit 1; }
    ensure_dir "$DEPLOY_PATH"
    run_sudo chown -R "$(id -un):$(id -gn)" "$DEPLOY_PATH" || true
  fi
fi

if [ ! -d "$DEPLOY_PATH/.git" ]; then
  echo "[1/5] Clone repo into $DEPLOY_PATH"
  git clone --branch "$DEPLOY_BRANCH" --depth 1 "$REPO_URL" "$DEPLOY_PATH"
else
  echo "[1/5] Existing repo found"
  cd "$DEPLOY_PATH"
  git remote set-url origin "$REPO_URL" || true
  git fetch --no-tags origin "$DEPLOY_BRANCH"
  git reset --hard "origin/$DEPLOY_BRANCH"
  git clean -fd -e .env -e .env.local -e .env.docker -e data/ -e logs/ || true
fi

cd "$DEPLOY_PATH"
[ -f scripts/deploy-vps-docker.sh ] || { echo "ERROR: Missing scripts/deploy-vps-docker.sh after clone/fetch."; exit 1; }

echo "[2/5] Preserve and refresh VPS runtime env"
umask 077
[ ! -f "$ARELORIAN_ENV_FILE" ] || cp "$ARELORIAN_ENV_FILE" "${ARELORIAN_ENV_FILE}.backup.$(date +%Y%m%d%H%M%S)" || true
touch "$ARELORIAN_ENV_FILE"
chmod 600 "$ARELORIAN_ENV_FILE"
update_env_key ARELORIAN_PORT "$ARELORIAN_PORT"
update_env_key ARELORIAN_DOCKER_NETWORK "$ARELORIAN_DOCKER_NETWORK"
update_env_key ARELORIAN_ENABLE_DOCKER_INGRESS "$ARELORIAN_ENABLE_DOCKER_INGRESS"
update_env_key ARELORIAN_INGRESS_HTTP_BIND "$ARELORIAN_INGRESS_HTTP_BIND"
update_env_key ARELORIAN_INGRESS_HTTP_PORT "$ARELORIAN_INGRESS_HTTP_PORT"
echo "Runtime env file preserved/refreshed: $DEPLOY_PATH/$ARELORIAN_ENV_FILE"
grep -E '^[A-Z0-9_]+=' "$ARELORIAN_ENV_FILE" | cut -d= -f1 | sed 's/^/  - /'

echo "[3/5] Free engine port $ARELORIAN_PORT"
pm2 stop areloria >/dev/null 2>&1 || true
pm2 delete areloria >/dev/null 2>&1 || true
$DOCKER rm -f arelorian-engine monitor-bridge arelorian-ingress-router >/dev/null 2>&1 || true
if command -v fuser >/dev/null 2>&1; then
  PIDS="$(fuser -n tcp "$ARELORIAN_PORT" 2>/dev/null || true)"
  if [ -n "${PIDS// }" ]; then kill $PIDS >/dev/null 2>&1 || true; sleep 2; kill -9 $PIDS >/dev/null 2>&1 || true; fi
fi
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -ti tcp:"$ARELORIAN_PORT" 2>/dev/null | tr '\n' ' ' || true)"
  if [ -n "${PIDS// }" ]; then kill $PIDS >/dev/null 2>&1 || true; sleep 2; kill -9 $PIDS >/dev/null 2>&1 || true; fi
fi

echo "[4/5] Run Docker deploy script"
chmod +x scripts/deploy-vps-docker.sh 2>/dev/null || true
if [ "$DOCKER" = 'sudo -n docker' ]; then
  sudo -n env ARELORIAN_PORT="$ARELORIAN_PORT" ARELORIAN_DOCKER_NETWORK="$ARELORIAN_DOCKER_NETWORK" ARELORIAN_ENABLE_DOCKER_INGRESS="$ARELORIAN_ENABLE_DOCKER_INGRESS" ARELORIAN_INGRESS_HTTP_BIND="$ARELORIAN_INGRESS_HTTP_BIND" ARELORIAN_INGRESS_HTTP_PORT="$ARELORIAN_INGRESS_HTTP_PORT" ARELORIAN_ENV_FILE="$ARELORIAN_ENV_FILE" DEPLOY_BRANCH="$DEPLOY_BRANCH" bash scripts/deploy-vps-docker.sh
else
  ARELORIAN_PORT="$ARELORIAN_PORT" ARELORIAN_DOCKER_NETWORK="$ARELORIAN_DOCKER_NETWORK" ARELORIAN_ENABLE_DOCKER_INGRESS="$ARELORIAN_ENABLE_DOCKER_INGRESS" ARELORIAN_INGRESS_HTTP_BIND="$ARELORIAN_INGRESS_HTTP_BIND" ARELORIAN_INGRESS_HTTP_PORT="$ARELORIAN_INGRESS_HTTP_PORT" ARELORIAN_ENV_FILE="$ARELORIAN_ENV_FILE" DEPLOY_BRANCH="$DEPLOY_BRANCH" bash scripts/deploy-vps-docker.sh
fi

echo "[5/5] Deploy workflow finished"
