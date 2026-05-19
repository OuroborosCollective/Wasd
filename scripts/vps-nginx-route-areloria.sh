#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${ARELORIAN_PUBLIC_DOMAIN:-arelorian.de}"
UPSTREAM="${ARELORIAN_UPSTREAM:-http://127.0.0.1:${ARELORIAN_PORT:-3001}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MANAGED_FILE="/etc/nginx/conf.d/99-wasd-areloria.conf"
ALT_MANAGED_FILE="/etc/nginx/sites-available/99-wasd-areloria.conf"
ALT_ENABLED_FILE="/etc/nginx/sites-enabled/99-wasd-areloria.conf"
BACKUP_DIR="/etc/nginx/wasd-backups/${STAMP}"

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

run_root mkdir -p "$BACKUP_DIR"
run_root cp -a /etc/nginx "$BACKUP_DIR/nginx" 2>/dev/null || true

echo "Backed up nginx config to $BACKUP_DIR"

echo "Existing server_name references for ${DOMAIN}:"
run_root sh -c "grep -RIn --include='*.conf' --include='*' 'server_name .*${DOMAIN}' /etc/nginx 2>/dev/null || true"

# Disable older WASD-managed files if they exist to avoid duplicate server_name conflicts.
run_root rm -f "$MANAGED_FILE" "$ALT_ENABLED_FILE" 2>/dev/null || true

CONFIG_PATH="$MANAGED_FILE"
if [ ! -d /etc/nginx/conf.d ]; then
  CONFIG_PATH="$ALT_MANAGED_FILE"
  run_root mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
fi

cat <<EOF | write_root "$CONFIG_PATH"
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

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${DOMAIN} www.${DOMAIN};

    # Reuse certbot/Let's Encrypt certs when they already exist on the VPS.
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

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

if [ "$CONFIG_PATH" = "$ALT_MANAGED_FILE" ]; then
  run_root ln -sf "$ALT_MANAGED_FILE" "$ALT_ENABLED_FILE"
fi

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] || [ ! -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
  echo "WARN: TLS certificate files for ${DOMAIN} were not found. Rewriting nginx config to HTTP-only to keep nginx valid."
  cat <<EOF | write_root "$CONFIG_PATH"
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

echo "Testing nginx config..."
if ! run_root nginx -t; then
  echo "ERROR: nginx -t failed. Restoring backup from $BACKUP_DIR/nginx"
  run_root rm -rf /etc/nginx
  run_root cp -a "$BACKUP_DIR/nginx" /etc/nginx
  run_root nginx -t || true
  exit 1
fi

echo "Reloading nginx..."
run_root nginx -s reload || run_root systemctl reload nginx || run_root service nginx reload

echo "Testing local nginx Host route..."
curl -ksSL --max-time 10 -H "Host: ${DOMAIN}" "https://127.0.0.1/runtime-build-info.json" | head -c 800 || true
echo
curl -sSL --max-time 10 -H "Host: ${DOMAIN}" "http://127.0.0.1/runtime-build-info.json" | head -c 800 || true
echo

echo "=== WASD nginx route installer done ==="
