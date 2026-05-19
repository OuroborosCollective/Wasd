#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${ARELORIAN_PUBLIC_DOMAIN:-arelorian.de}"
UPSTREAM="${ARELORIAN_UPSTREAM:-http://127.0.0.1:${ARELORIAN_PORT:-3001}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

run_root() {
  if [ "$(id -u)" = "0" ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "ERROR: root or sudo is required to modify nginx config." >&2
    return 1
  fi
}

write_root() {
  local path="$1"
  if [ "$(id -u)" = "0" ]; then
    cat > "$path"
  elif command -v sudo >/dev/null 2>&1; then
    sudo tee "$path" >/dev/null
  else
    echo "ERROR: root or sudo is required to write $path." >&2
    return 1
  fi
}

read_root() {
  local path="$1"
  if [ "$(id -u)" = "0" ]; then
    cat "$path"
  elif command -v sudo >/dev/null 2>&1; then
    sudo cat "$path"
  else
    cat "$path"
  fi
}

path_exists() {
  local path="$1"
  if [ "$(id -u)" = "0" ]; then
    [ -e "$path" ]
  elif command -v sudo >/dev/null 2>&1; then
    sudo test -e "$path"
  else
    [ -e "$path" ]
  fi
}

dir_exists() {
  local path="$1"
  if [ "$(id -u)" = "0" ]; then
    [ -d "$path" ]
  elif command -v sudo >/dev/null 2>&1; then
    sudo test -d "$path"
  else
    [ -d "$path" ]
  fi
}

file_exists() {
  local path="$1"
  if [ "$(id -u)" = "0" ]; then
    [ -f "$path" ]
  elif command -v sudo >/dev/null 2>&1; then
    sudo test -f "$path"
  else
    [ -f "$path" ]
  fi
}

nginx_main_config() {
  local from_proc from_v from_known
  from_proc="$(ps -eo args | awk '/[n]ginx: master process/ {for(i=1;i<=NF;i++){if($i=="-c"){print $(i+1); exit}}}')"
  if [ -n "$from_proc" ] && file_exists "$from_proc"; then
    echo "$from_proc"
    return 0
  fi

  from_v="$(nginx -V 2>&1 | sed -n 's/.*--conf-path=\([^ ]*\).*/\1/p' | tail -n 1)"
  if [ -n "$from_v" ] && file_exists "$from_v"; then
    echo "$from_v"
    return 0
  fi

  for from_known in \
    /etc/nginx/nginx.conf \
    /usr/local/nginx/conf/nginx.conf \
    /usr/local/lsws/conf/nginx.conf \
    /etc/openresty/nginx.conf \
    /usr/local/openresty/nginx/conf/nginx.conf \
    /var/lib/nginx/conf/nginx.conf \
    /etc/hpanel/nginx/nginx.conf \
    /opt/hostinger/nginx/conf/nginx.conf; do
    if file_exists "$from_known"; then
      echo "$from_known"
      return 0
    fi
  done

  return 1
}

choose_include_dir() {
  local main_conf="$1"
  local base_dir conf_text candidate
  base_dir="$(dirname "$main_conf")"
  conf_text="$(read_root "$main_conf" 2>/dev/null || true)"

  for candidate in \
    "$(echo "$conf_text" | sed -n 's/^[[:space:]]*include[[:space:]]\+\([^;]*conf\.d\/\*\.conf\)[[:space:]]*;.*/\1/p' | head -n 1)" \
    "$(echo "$conf_text" | sed -n 's/^[[:space:]]*include[[:space:]]\+\([^;]*sites-enabled\/\*\)[[:space:]]*;.*/\1/p' | head -n 1)" \
    "$base_dir/conf.d/*.conf" \
    "$base_dir/sites-enabled/*" \
    /etc/nginx/conf.d/*.conf \
    /etc/nginx/sites-enabled/*; do
    [ -n "$candidate" ] || continue
    case "$candidate" in
      /*) ;;
      *) candidate="$base_dir/$candidate" ;;
    esac
    candidate="${candidate%/*}"
    if dir_exists "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done

  # Last resort: create conf.d beside the active config. This only works when
  # the main config already includes it, so caller must inject include if needed.
  echo "$base_dir/conf.d"
}

ensure_include_present() {
  local main_conf="$1"
  local include_dir="$2"
  local include_pattern="$include_dir/*.conf"
  local conf_text tmp
  conf_text="$(read_root "$main_conf" 2>/dev/null || true)"

  if echo "$conf_text" | grep -Fq "$include_pattern"; then
    return 0
  fi
  if echo "$conf_text" | grep -Eq '^[[:space:]]*include[[:space:]]+[^;]*conf\.d/\*\.conf[[:space:]]*;'; then
    return 0
  fi
  if echo "$conf_text" | grep -Eq '^[[:space:]]*include[[:space:]]+[^;]*sites-enabled/\*[[:space:]]*;'; then
    return 0
  fi

  echo "WARN: Could not prove active nginx config includes $include_pattern. Injecting include into http{} block."
  tmp="$(mktemp)"
  awk -v inc="    include ${include_pattern};" '
    BEGIN { inserted=0; in_http=0 }
    /^[[:space:]]*http[[:space:]]*\{/ && inserted==0 { print; print inc; inserted=1; next }
    { print }
    END { if (inserted==0) exit 42 }
  ' <<< "$conf_text" > "$tmp" || {
    echo "ERROR: active nginx config has no editable http{} block; cannot install route safely." >&2
    rm -f "$tmp"
    return 1
  }
  cat "$tmp" | write_root "$main_conf"
  rm -f "$tmp"
}

nginx_test() {
  local main_conf="$1"
  if [ -n "$main_conf" ]; then
    run_root nginx -t -c "$main_conf"
  else
    run_root nginx -t
  fi
}

nginx_reload() {
  local main_conf="$1"
  run_root nginx -s reload -c "$main_conf" || run_root systemctl reload nginx || run_root service nginx reload
}

echo "=== WASD nginx public route installer ==="
echo "Domain: ${DOMAIN} www.${DOMAIN}"
echo "Upstream: ${UPSTREAM}"

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx binary not found. Skipping nginx route install."
  exit 0
fi

if ! pgrep -x nginx >/dev/null 2>&1; then
  echo "nginx is installed but not running. Skipping nginx route install."
  exit 0
fi

echo "nginx version/configure:"
nginx -V 2>&1 | head -c 2000 || true
echo

echo "nginx master process:"
ps -eo pid,args | grep '[n]ginx: master process' || true

MAIN_CONF="$(nginx_main_config || true)"
if [ -z "$MAIN_CONF" ]; then
  echo "ERROR: Could not discover active nginx.conf. Refusing to edit unknown nginx layout." >&2
  exit 1
fi

NGINX_ROOT="$(dirname "$MAIN_CONF")"
BACKUP_DIR="${NGINX_ROOT}/wasd-backups/${STAMP}"
INCLUDE_DIR="$(choose_include_dir "$MAIN_CONF")"
MANAGED_FILE="${INCLUDE_DIR}/99-wasd-areloria.conf"

echo "Active nginx.conf: $MAIN_CONF"
echo "Nginx config root: $NGINX_ROOT"
echo "Managed include dir: $INCLUDE_DIR"
echo "Managed route file: $MANAGED_FILE"

run_root mkdir -p "$BACKUP_DIR" "$INCLUDE_DIR"
if path_exists "$NGINX_ROOT"; then
  run_root cp -a "$NGINX_ROOT" "$BACKUP_DIR/nginx-root" 2>/dev/null || true
fi
if ! path_exists "$BACKUP_DIR/nginx-root"; then
  echo "WARN: Could not create full nginx backup at $BACKUP_DIR/nginx-root; continuing with validation/rollback guarded by nginx -t."
else
  echo "Backed up nginx config root to $BACKUP_DIR/nginx-root"
fi

echo "Existing server_name references for ${DOMAIN}:"
run_root sh -c "grep -RIn --include='*.conf' --include='*' 'server_name .*${DOMAIN}' '$(dirname "$NGINX_ROOT")' '$NGINX_ROOT' 2>/dev/null || true"

# Disable older WASD-managed files if they exist to avoid duplicate server_name conflicts.
run_root rm -f \
  /etc/nginx/conf.d/99-wasd-areloria.conf \
  /etc/nginx/sites-enabled/99-wasd-areloria.conf \
  /etc/nginx/sites-available/99-wasd-areloria.conf \
  "$MANAGED_FILE" 2>/dev/null || true

ensure_include_present "$MAIN_CONF" "$INCLUDE_DIR"

CERT_FILE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
CERT_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
HAS_CERT=false
if file_exists "$CERT_FILE" && file_exists "$CERT_KEY"; then
  HAS_CERT=true
fi

if [ "$HAS_CERT" = true ]; then
  cat <<EOF | write_root "$MANAGED_FILE"
# Managed by WASD deploy. Do not edit manually; update scripts/vps-nginx-route-areloria.sh instead.
# Generated: ${STAMP}
# Domain: ${DOMAIN}
# Upstream: ${UPSTREAM}

map \$http_upgrade \$wasd_connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate ${CERT_FILE};
    ssl_certificate_key ${CERT_KEY};

    location / {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$wasd_connection_upgrade;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }
}
EOF
else
  echo "WARN: TLS certificate files for ${DOMAIN} were not found. Installing HTTP-only nginx route."
  cat <<EOF | write_root "$MANAGED_FILE"
# Managed by WASD deploy. HTTP-only fallback because Let's Encrypt certs were not found.
# Generated: ${STAMP}
# Domain: ${DOMAIN}
# Upstream: ${UPSTREAM}

map \$http_upgrade \$wasd_connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$wasd_connection_upgrade;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }
}
EOF
fi

echo "Testing nginx config with active config path..."
if ! nginx_test "$MAIN_CONF"; then
  echo "ERROR: nginx config test failed. Removing managed file and attempting restore."
  run_root rm -f "$MANAGED_FILE" 2>/dev/null || true
  if path_exists "$BACKUP_DIR/nginx-root"; then
    echo "Restoring nginx config root from backup."
    run_root rm -rf "$NGINX_ROOT"
    run_root cp -a "$BACKUP_DIR/nginx-root" "$NGINX_ROOT"
  fi
  nginx_test "$MAIN_CONF" || true
  exit 1
fi

echo "Reloading nginx with active config path..."
nginx_reload "$MAIN_CONF"

echo "Testing local nginx Host route..."
curl -ksSL --max-time 10 -H "Host: ${DOMAIN}" "https://127.0.0.1/runtime-build-info.json" | head -c 800 || true
echo
curl -sSL --max-time 10 -H "Host: ${DOMAIN}" "http://127.0.0.1/runtime-build-info.json" | head -c 800 || true
echo

echo "=== WASD nginx route installer done ==="
