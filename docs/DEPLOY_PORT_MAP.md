# WASD/Areloria Deploy Port Map

This document prevents old 3000-era deployment references from being mistaken for the current production engine port.

## Current production shape

| Purpose | Host binding | Internal target | Notes |
|---|---:|---:|---|
| Areloria engine | `127.0.0.1:3001` | `arelorian-engine:3001` | Active production game/API server |
| Host Nginx gateway | `:80` / `:443` | `127.0.0.1:3001` | Public edge for `arelorian.de` |
| Supabase gateway/Kong | stack-owned | `supabase-kong:8000` | Do not replace with engine port |
| Supabase database | stack-owned | `supabase-db:5432` | Internal database target |
| Redis | stack-owned | `redis-comn-redis-1:6379` | Internal cache target |
| Soketi | stack-owned | `soketi-9eoa-soketi-1:6001` | Internal websocket/Pusher-compatible target |

## How to read port 3000 references

Port `3000` may still appear in this repository for legitimate reasons:

- local Vite/dev-server defaults,
- tests and CORS fixtures,
- older demo docs,
- legacy PM2/non-Docker deployment scripts,
- historical setup scripts.

These references are not automatically wrong. They are only wrong when a production VPS/Docker deploy path claims the Areloria engine should bind publicly or internally to port `3000`.

## Rule for new automation

New production automation should use:

```text
ARELORIAN_PORT=3001
ARELORIAN_CONTAINER_PORT=3001
ENGINE_URL=http://arelorian-engine:3001
```

Public traffic should go through host Nginx:

```text
arelorian.de -> Nginx -> 127.0.0.1:3001 -> arelorian-engine:3001
```

Do not add a Dockerized Nginx service to the WASD compose stack unless the architecture is intentionally changed in a dedicated PR.
