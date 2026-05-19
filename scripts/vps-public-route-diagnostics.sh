#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${ARELORIAN_PUBLIC_DOMAIN:-arelorian.de}"
PORT="${ARELORIAN_PORT:-3001}"
NETWORK="${ARELORIAN_DOCKER_NETWORK:-areloria_arelorian-network}"

echo "=== VPS PUBLIC ROUTE DIAGNOSTICS ==="
echo "Domain: $DOMAIN"
echo "Engine host port: $PORT"
echo "Docker network: $NETWORK"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "--- Listening sockets 80/443/$PORT ---"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | grep -E ":(80|443|${PORT})\b" || true
else
  netstat -ltnp 2>/dev/null | grep -E ":(80|443|${PORT})\b" || true
fi

echo "--- Docker containers: names / image / ports / networks ---"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Networks}}' || true

echo "--- Candidate public routers/proxies ---"
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Networks}}' | grep -Ei 'traefik|nginx|caddy|proxy|router|ingress|cloudflare|tunnel|web' || true

echo "--- arelorian-engine labels ---"
docker inspect arelorian-engine --format '{{json .Config.Labels}}' 2>/dev/null || true

echo "--- Containers with traefik/router labels ---"
for id in $(docker ps -q); do
  name="$(docker inspect "$id" --format '{{.Name}}' 2>/dev/null | sed 's#^/##' || true)"
  labels="$(docker inspect "$id" --format '{{json .Config.Labels}}' 2>/dev/null || true)"
  if echo "$labels" | grep -Eiq 'traefik|Host\(|arelorian\.de|websecure|certresolver'; then
    echo "[$name] $labels"
  fi
done

echo "--- Network membership: $NETWORK ---"
docker network inspect "$NETWORK" --format '{{range $id, $c := .Containers}}{{println $c.Name $c.IPv4Address}}{{end}}' 2>/dev/null || true

echo "--- Direct engine container HTTP: /runtime-build-info.json ---"
docker exec arelorian-engine node -e "fetch('http://127.0.0.1:3001/runtime-build-info.json').then(async r=>{console.log('status='+r.status); console.log((await r.text()).slice(0,600));}).catch(e=>{console.error(e); process.exit(1);})" 2>&1 || true

echo "--- Host localhost:$PORT HTTP: /runtime-build-info.json ---"
curl -fsSL --max-time 8 "http://127.0.0.1:${PORT}/runtime-build-info.json" 2>&1 | head -c 1200 || true
echo

echo "--- Local HTTP route with Host header: http://127.0.0.1/runtime-build-info.json ---"
curl -sSL --max-time 8 -H "Host: ${DOMAIN}" "http://127.0.0.1/runtime-build-info.json" 2>&1 | head -c 1200 || true
echo

echo "--- Local HTTPS route with Host header: https://127.0.0.1/runtime-build-info.json ---"
curl -ksSL --max-time 8 -H "Host: ${DOMAIN}" "https://127.0.0.1/runtime-build-info.json" 2>&1 | head -c 1200 || true
echo

echo "--- Public DNS route from VPS: https://$DOMAIN/runtime-build-info.json ---"
curl -ksSL --max-time 12 "https://${DOMAIN}/runtime-build-info.json" 2>&1 | head -c 1200 || true
echo

echo "--- Public root from VPS first bytes ---"
curl -ksSL --max-time 12 "https://${DOMAIN}/" 2>&1 | head -c 1200 || true
echo

echo "=== END VPS PUBLIC ROUTE DIAGNOSTICS ==="
