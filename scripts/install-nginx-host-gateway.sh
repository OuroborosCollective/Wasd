#!/usr/bin/env bash
# Install or update the host-level Nginx gateway for Areloria.
# This script is intended to run on the VPS, not inside Docker.
set -euo pipefail

DOMAIN="${ARELORIAN_DOMAIN:-arelorian.de}"
WWW_DOMAIN="${ARELORIAN_WWW_DOMAIN:-www.arelorian.de}"
ENGINE_HOST="${ARELORIAN_ENGINE_HOST:-127.0.0.1}"
ENGINE_PORT="${ARELORIAN_PORT:-3001}"
SITE_NAME="${ARELORIAN_NGINX_SITE_NAME:-arelorian-game}"
AVAILABLE_DIR="${NGINX_AVAILABLE_DIR:-/etc/nginx/sites-available}"
ENABLED_DIR="${NGINX_ENABLED_DIR:-/etc/nginx/sites-enabled}"
CONF_PATH="$AVAILABLE_DIR/$SITE_NAME"
ENABLED_PATH="$ENABLED_DIR/$SITE_NAME"
MAP_CONF_PATH="${NGINX_MAP_CONF_PATH:-/etc/nginx/conf.d/arelorian-websocket-map.conf}"
BACKUP_SUFFIX="$(date +%Y%m%d-%H%M%S)"

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "ERROR: run as root or with sudo."
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "Installing nginx ..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
  else
    echo "ERROR: nginx is missing and this script currently supports apt-based hosts only."
    exit 1
  fi
fi

mkdir -p "$AVAILABLE_DIR" "$ENABLED_DIR" "$(dirname "$MAP_CONF_PATH")"

if [ -f "$CONF_PATH" ]; then
  cp "$CONF_PATH" "$CONF_PATH.bak-$BACKUP_SUFFIX"
fi
if [ -f "$MAP_CONF_PATH" ]; then
  cp "$MAP_CONF_PATH" "$MAP_CONF_PATH.bak-$BACKUP_SUFFIX"
fi

cat > "$MAP_CONF_PATH" <<'EOF_MAP'
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}
EOF_MAP

cat > "$CONF_PATH" <<EOF_SITE
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN $WWW_DOMAIN;

  # GraphicRiver/Client2D private asset packs can be several hundred MB.
  client_max_body_size 1024m;
  client_body_timeout 600s;

  location / {
    proxy_pass http://$ENGINE_HOST:$ENGINE_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
  }

  location /api/client2d-assets/upload {
    proxy_pass http://$ENGINE_HOST:$ENGINE_PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_request_buffering off;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
  }

  location /ws {
    proxy_pass http://$ENGINE_HOST:$ENGINE_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
  }

  location /socket.io/ {
    proxy_pass http://$ENGINE_HOST:$ENGINE_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
  }

  location /2d/ {
    proxy_pass http://$ENGINE_HOST:$ENGINE_PORT/2d/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /3d/ {
    proxy_pass http://$ENGINE_HOST:$ENGINE_PORT/3d/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }

  location /portal/ {
    proxy_pass http://$ENGINE_HOST:$ENGINE_PORT/portal/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF_SITE

ln -sfn "$CONF_PATH" "$ENABLED_PATH"

if [ -L "$ENABLED_DIR/default" ]; then
  rm -f "$ENABLED_DIR/default"
fi

nginx -t
systemctl reload nginx 2>/dev/null || service nginx reload

echo "Nginx host gateway installed: $DOMAIN -> http://$ENGINE_HOST:$ENGINE_PORT"
