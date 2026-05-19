#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${ARELORIAN_PUBLIC_DOMAIN:-arelorian.de}"
UPSTREAM="${ARELORIAN_UPSTREAM:-http://127.0.0.1:${ARELORIAN_PORT:-3001}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PUBLIC_NGINX_BIN="${PUBLIC_NGINX_BIN:-/usr/sbin/nginx}"
PUBLIC_NGINX_CONF="${PUBLIC_NGINX_CONF:-/etc/nginx/nginx.conf}"
PUBLIC_NGINX_ROOT="$(dirname "$PUBLIC_NGINX_CONF")"
INCLUDE_DIR="${PUBLIC_NGINX_ROOT}/conf.d"
MANAGED_FILE="${INCLUDE_DIR}/99-wasd-areloria.conf"
BACKUP_ROOT="${WASD_NGINX_BACKUP_ROOT:-/var/backups/wasd-nginx}"
BACKUP_DIR="${BACKUP_ROOT}/${STAMP}"
MIME_TYPES_FILE="${PUBLIC_NGINX_ROOT}/mime.types"
MODULES_ENABLED_DIR="${PUBLIC_NGINX_ROOT}/modules-enabled"

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

safe_backup_public_nginx() {
  run_root mkdir -p "$BACKUP_DIR"
  if dir_exists "$PUBLIC_NGINX_ROOT"; then
    run_root cp -a "$PUBLIC_NGINX_ROOT" "$BACKUP_DIR/nginx-root" 2>/dev/null || true
  fi
  if dir_exists "$BACKUP_DIR/nginx-root"; then
    echo "Backed up public nginx root to $BACKUP_DIR/nginx-root"
  else
    echo "WARN: No full public nginx root backup was created. Continuing with nginx -t validation."
  fi
}

restore_public_nginx_if_possible() {
  if dir_exists "$BACKUP_DIR/nginx-root"; then
    echo "Restoring public nginx root from $BACKUP_DIR/nginx-root"
    run_root rm -rf "$PUBLIC_NGINX_ROOT"
    run_root mkdir -p "$(dirname "$PUBLIC_NGINX_ROOT")"
    run_root cp -a "$BACKUP_DIR/nginx-root" "$PUBLIC_NGINX_ROOT"
  else
    echo "WARN: No backup exists to restore. Removing managed file only."
    run_root rm -f "$MANAGED_FILE" 2>/dev/null || true
  fi
}

ensure_public_nginx_support_files() {
  run_root mkdir -p "$PUBLIC_NGINX_ROOT" "$INCLUDE_DIR" "$BACKUP_ROOT" /var/log/nginx /var/lib/nginx/body /var/lib/nginx/proxy /run

  if ! file_exists "$MIME_TYPES_FILE"; then
    echo "WARN: $MIME_TYPES_FILE is missing. Creating minimal WASD mime.types fallback."
    cat <<'EOF' | write_root "$MIME_TYPES_FILE"
types {
    text/html html htm shtml;
    text/css css;
    text/plain txt log;
    application/javascript js mjs;
    application/json json map;
    application/xml xml;
    application/octet-stream bin exe dll;
    image/png png;
    image/jpeg jpeg jpg;
    image/gif gif;
    image/svg+xml svg svgz;
    image/webp webp;
    image/x-icon ico;
    font/woff woff;
    font/woff2 woff2;
    application/wasm wasm;
}
EOF
  fi
}

write_minimal_public_nginx_conf_if_missing() {
  if file_exists "$PUBLIC_NGINX_CONF"; then
    return 0
  fi

  echo "WARN: $PUBLIC_NGINX_CONF is missing, but public nginx owns 80/443. Creating minimal WASD public nginx.conf."
  ensure_public_nginx_support_files

  local module_include="# modules-enabled directory missing; module include disabled by WASD installer"
  if dir_exists "$MODULES_ENABLED_DIR"; then
    module_include="include ${MODULES_ENABLED_DIR}/*.conf;"
  fi

  cat <<EOF | write_root "$PUBLIC_NGINX_CONF"
user www-data;
worker_processes auto;
pid /run/nginx.pid;
${module_include}

events {
    worker_connections 1024;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    server_tokens off;

    include ${MIME_TYPES_FILE};
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;
    include ${INCLUDE_DIR}/*.conf;
}
EOF
}

ensure_public_nginx_conf_includes_conf_d() {
  local tmp
  if ! file_exists "$PUBLIC_NGINX_CONF"; then
    write_minimal_public_nginx_conf_if_missing
    return 0
  fi

  ensure_public_nginx_support_files

  if run_root sh -c "grep -Eq '^[[:space:]]*include[[:space:]]+${INCLUDE_DIR//\//\/}/\*\.conf[[:space:]]*;' '$PUBLIC_NGINX_CONF' || grep -Eq '^[[:space:]]*include[[:space:]]+/etc/nginx/conf\.d/\*\.conf[[:space:]]*;' '$PUBLIC_NGINX_CONF'"; then
    return 0
  fi

  echo "WARN: $PUBLIC_NGINX_CONF does not include ${INCLUDE_DIR}/*.conf. Injecting include into http{} block."
  tmp="$(mktemp)"
  run_root cat "$PUBLIC_NGINX_CONF" | awk -v include_line="    include ${INCLUDE_DIR}/*.conf;" '
    BEGIN { inserted=0 }
    /^[[:space:]]*http[[:space:]]*\{/ && inserted==0 { print; print include_line; inserted=1; next }
    { print }
    END { if (inserted==0) exit 42 }
  ' > "$tmp" || {
    rm -f "$tmp"
    echo "ERROR: Could not inject include because $PUBLIC_NGINX_CONF has no http{} block." >&2
    return 1
  }
  cat "$tmp" | write_root "$PUBLIC_NGINX_CONF"
  rm -f "$tmp"
}

write_route_conf() {
  local cert_file="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  local cert_key="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
  run_root mkdir -p "$INCLUDE_DIR"

  if file_exists "$cert_file" && file_exists "$cert_key"; then
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
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate ${cert_file};
    ssl_certificate_key ${cert_key};

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
    echo "WARN: TLS cert files for ${DOMAIN} were not found. Installing HTTP route and leaving existing HTTPS listener untouched if any."
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
}

public_nginx_test() {
  run_root "$PUBLIC_NGINX_BIN" -t -c "$PUBLIC_NGINX_CONF"
}

public_nginx_reload_or_restart() {
  if run_root "$PUBLIC_NGINX_BIN" -s reload -c "$PUBLIC_NGINX_CONF"; then
    return 0
  fi
  echo "WARN: nginx reload failed; trying systemctl/service restart for public nginx."
  run_root systemctl restart nginx || run_root service nginx restart || run_root "$PUBLIC_NGINX_BIN" -c "$PUBLIC_NGINX_CONF"
}

echo "=== WASD nginx public route installer ==="
echo "Domain: ${DOMAIN} www.${DOMAIN}"
echo "Upstream: ${UPSTREAM}"
echo "Public nginx binary: ${PUBLIC_NGINX_BIN}"
echo "Public nginx config: ${PUBLIC_NGINX_CONF}"

if [ ! -x "$PUBLIC_NGINX_BIN" ]; then
  echo "ERROR: public nginx binary $PUBLIC_NGINX_BIN not found/executable." >&2
  exit 1
fi

echo "nginx version/configure:"
"$PUBLIC_NGINX_BIN" -V 2>&1 | head -c 2000 || true
echo

echo "nginx master processes, for diagnostics only; Kong/OpenResty relative configs are ignored:"
ps -eo pid,args | grep '[n]ginx: master process' || true

echo "Public socket owners before route install:"
ss -ltnp 2>/dev/null | grep -E ':(80|443|3001)\b' || true

safe_backup_public_nginx
ensure_public_nginx_support_files
write_minimal_public_nginx_conf_if_missing
ensure_public_nginx_conf_includes_conf_d

run_root rm -f "$MANAGED_FILE" 2>/dev/null || true
write_route_conf

echo "Testing public nginx config..."
if ! public_nginx_test; then
  echo "ERROR: public nginx config test failed. Rolling back WASD-managed route."
  restore_public_nginx_if_possible
  public_nginx_test || true
  exit 1
fi

echo "Reloading/restarting public nginx..."
public_nginx_reload_or_restart

echo "Testing local nginx Host route after install..."
curl -ksSL --max-time 10 -H "Host: ${DOMAIN}" "https://127.0.0.1/runtime-build-info.json" | head -c 800 || true
echo
curl -sSL --max-time 10 -H "Host: ${DOMAIN}" "http://127.0.0.1/runtime-build-info.json" | head -c 800 || true
echo

echo "Public socket owners after route install:"
ss -ltnp 2>/dev/null | grep -E ':(80|443|3001)\b' || true

echo "=== WASD nginx route installer done ==="
