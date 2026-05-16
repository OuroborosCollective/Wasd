# Sovereign Ingress Pipeline

This document describes the optional Docker-based ingress overlay for Areloria/WASD.

## Why this exists

Host-level Nginx is useful, but manual server edits create hidden infrastructure state. The long-term direction is Infrastructure as Code: ingress routing should live in the repository, be reviewed through pull requests, and be deployed by automation.

However, the existing VPS deploy path is already hardened and currently binds the engine safely to:

```text
127.0.0.1:3001 -> arelorian-engine:3001
```

Therefore this PR does **not** delete the current deploy script and does **not** replace the root compose file. Instead it adds a safe, optional overlay.

## Files

```text
ops/nginx/default.conf
```

Nginx routing configuration stored in the repository.

```text
docker-compose.ingress.yml
```

Optional Compose overlay that starts `ingress-router` with the `ingress` profile.

```text
scripts/deploy-vps-docker.sh
```

Updated to support optional Docker ingress when explicitly enabled.

## Enable Docker ingress

Set this in the VPS deploy environment or GitHub Action runtime env file:

```text
ARELORIAN_ENABLE_DOCKER_INGRESS=true
ARELORIAN_INGRESS_HTTP_BIND=0.0.0.0
ARELORIAN_INGRESS_HTTP_PORT=80
```

Then run the existing deploy workflow/script.

The deploy script will use both compose files:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.ingress.yml \
  --profile ingress \
  up -d --remove-orphans arelorian-engine monitor-bridge ingress-router
```

## Default behavior

By default, Docker ingress is disabled:

```text
ARELORIAN_ENABLE_DOCKER_INGRESS=false
```

The current host-Nginx / localhost-engine model continues unchanged.

## Routing model

When enabled:

```text
public :80
  -> arelorian-ingress-router
  -> arelorian-engine:3001
```

The ingress router proxies:

```text
/
/health
/client-config.json
/ws
/socket.io/
/api/
/portal/
/2d/
/3d/
```

The engine remains the source of truth for serving the app shell and runtime endpoints. The ingress container is a deterministic routing layer, not a second application build system.

## Safety rules

- Do not delete `scripts/deploy-vps-docker.sh`.
- Do not replace the root `docker-compose.yml` for ingress experiments.
- Do not expose `arelorian-engine` directly on public `0.0.0.0` unless explicitly reviewed.
- Do not mix ingress migration with gameplay changes.
- Do not add TLS automation in the same PR. HTTPS/certbot/Caddy/Traefik migration must be a separate step.

## Migration path

1. Merge the optional overlay.
2. Deploy with Docker ingress disabled. Verify no behavior changed.
3. Enable Docker ingress on a staging VPS or alternative port, for example `8080`.
4. Verify `/health`, `/client-config.json`, `/`, `/ws`.
5. Move public port 80 only after host Nginx conflict/ownership is resolved.
6. Add HTTPS in a separate reviewed PR.

## Why not mount `portal/dist`, `2d/dist`, and `3d/dist` directly?

The current Docker image already packages and serves the browser shell from the engine runtime. Mounting separate host dist directories would create a second source of truth and can fail when CI builds but the VPS working tree does not contain fresh dist artifacts.

The ingress overlay keeps one truth:

```text
Docker image contains runtime client assets.
Nginx routes traffic to the engine.
```
