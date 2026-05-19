#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${ARELORIAN_PUBLIC_DOMAIN:-arelorian.de}"
PUBLIC_NGINX_BIN="${PUBLIC_NGINX_BIN:-/usr/sbin/nginx}"
PUBLIC_NGINX_CONF="${PUBLIC_NGINX_CONF:-/etc/nginx/nginx.conf}"
PUBLIC_NGINX_ROOT="$(dirname "$PUBLIC_NGINX_CONF")"
MANAGED_FILE="${PUBLIC_NGINX_ROOT}/conf.d/00-wasd-areloria.conf"

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

echo "=== WASD nginx root hotfix ==="
echo "Domain: ${DOMAIN} www.${DOMAIN}"
echo "Managed config: ${MANAGED_FILE}"

run_root test -f "$MANAGED_FILE"
tmp="$(mktemp)"
run_root cat "$MANAGED_FILE" > "$tmp"

python3 - "$tmp" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
root_block = "    location = / {\n        return 302 /portal/;\n    }\n\n"
needle = "    location = /2d {\n"
if root_block not in text:
    if needle not in text:
        raise SystemExit("missing /2d anchor")
    text = text.replace(needle, root_block + needle, 1)
    path.write_text(text)
    print("Inserted root redirect to /portal/.")
else:
    print("Root redirect already present.")
PY

cat "$tmp" | write_root "$MANAGED_FILE"
rm -f "$tmp"

run_root "$PUBLIC_NGINX_BIN" -t -c "$PUBLIC_NGINX_CONF"
run_root "$PUBLIC_NGINX_BIN" -s reload -c "$PUBLIC_NGINX_CONF" || run_root systemctl restart nginx || run_root service nginx restart

for host in "$DOMAIN" "www.$DOMAIN"; do
  echo "--- root check: https://${host}/ ---"
  curl -ksSI --max-time 10 -H "Host: ${host}" "https://127.0.0.1/" | head -n 12 || true
  echo "--- portal check: https://${host}/portal/ ---"
  curl -ksSI --max-time 10 -H "Host: ${host}" "https://127.0.0.1/portal/" | head -n 12 || true
  echo
done

echo "=== WASD nginx root hotfix done ==="
