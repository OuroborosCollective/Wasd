#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/areloria}"
DOMAIN="${DOMAIN:-arelorian.de}"
WWW_DOMAIN="${WWW_DOMAIN:-www.${DOMAIN}}"
GAME_PORT="${GAME_PORT:-3001}"
WEBROOT="${WEBROOT:-${APP_DIR}/client/dist}"
SITE_NAME="${SITE_NAME:-arelorian}"
CONF="/etc/nginx/sites-available/${SITE_NAME}"
ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"
ENABLE_HTTPS="${ENABLE_HTTPS:-0}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

log(){ echo "$*"; }
warn(){ echo "WARNING: $*" >&2; }
run_root(){
  if [ "$(id -u)" -eq 0 ]; then "$@"; return $?; fi
  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then sudo "$@"; return $?; fi
  return 77
}

log "=== Areloria nginx repair ==="
log "domain=${DOMAIN} ${WWW_DOMAIN}"
log "webroot=${WEBROOT}"
log "game_port=${GAME_PORT}"

command -v nginx >/dev/null 2>&1 || { warn "nginx not installed"; exit 0; }
[ -d "$APP_DIR" ] || { warn "APP_DIR missing: $APP_DIR"; exit 0; }
[ -f "$WEBROOT/index.html" ] || warn "$WEBROOT/index.html missing; domain may still return 403/404 until frontend build exists"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
cat > "$TMP" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    root ${WEBROOT};
    index index.html;

    location ^~ /api/ { proxy_pass http://127.0.0.1:${GAME_PORT}; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
    location ^~ /auth/ { proxy_pass http://127.0.0.1:${GAME_PORT}; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
    location ^~ /health { proxy_pass http://127.0.0.1:${GAME_PORT}; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
    location ^~ /client-config.json { proxy_pass http://127.0.0.1:${GAME_PORT}; proxy_http_version 1.1; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme; }
    location ^~ /ws { proxy_pass http://127.0.0.1:${GAME_PORT}; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host \$host; proxy_read_timeout 86400; }

    location / { try_files \$uri \$uri/ /index.html; }
}
EOF

if ! run_root install -m 0644 "$TMP" "$CONF"; then
  warn "No root/sudo permission for nginx config. Run manually: cd $APP_DIR && APP_DIR=$APP_DIR GAME_PORT=$GAME_PORT DOMAIN=$DOMAIN bash deploy/repair-nginx.sh"
  exit 0
fi

run_root ln -sf "$CONF" "$ENABLED"
[ ! -e /etc/nginx/sites-enabled/default ] || run_root rm -f /etc/nginx/sites-enabled/default || true
run_root nginx -t
run_root systemctl reload nginx || run_root service nginx reload
log "nginx repaired: ${DOMAIN} serves ${WEBROOT}; proxy -> 127.0.0.1:${GAME_PORT}"

if [ "$ENABLE_HTTPS" = "1" ]; then
  if ! command -v certbot >/dev/null 2>&1; then warn "certbot missing; install certbot python3-certbot-nginx"; exit 0; fi
  if [ -n "$CERTBOT_EMAIL" ]; then
    run_root certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL" --redirect
  else
    run_root certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
  fi
  run_root nginx -t
  run_root systemctl reload nginx || run_root service nginx reload
fi
