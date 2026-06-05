# Docker Compose Troubleshooting

## Overview

Common issues with docker-compose on VPS and workarounds.

## Common Errors

### KeyError: 'ContainerConfig'

```
docker-compose up -d
File "/usr/lib/python3/dist-packages/compose/service.py", line 1579, in get_container_data_volumes
    container.image_config['ContainerConfig'].get('Volumes') or {}
KeyError: 'ContainerConfig'
```

**Cause**: Compose version mismatch or corrupted image cache.

**Solutions**:

```bash
# Option 1: Remove old container first
docker rm -f arelorian-engine
docker-compose up -d

# Option 2: Build without cache
docker-compose build --no-cache
docker-compose up -d

# Option 3: Use docker run directly (bypass compose)
docker run -d \
  --name arelorian-engine \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v /opt/areloria/data:/app/data \
  -e QUEST_PERSISTENCE_DRIVER=postgres \
  areloria-arelorian-engine:latest
```

### Unsupported Option in Build

```
services.arelorian-engine.build contains unsupported option: 'QUEST_PERSISTENCE_DRIVER'
```

**Cause**: Added environment variable to `build` section instead of `environment`.

**Fix**:

```yaml
# WRONG - in build section
build:
  args:
    QUEST_PERSISTENCE_DRIVER: postgres  # ❌ Not valid here

# CORRECT - in environment section
services:
  arelorian-engine:
    build:
      context: .
      dockerfile: Dockerfile.vps
    environment:  # ✅ Correct location
      QUEST_PERSISTENCE_DRIVER: "${QUEST_PERSISTENCE_DRIVER:-postgres}"
      QUEST_STATE_FILE: "${QUEST_STATE_FILE:-/app/data/quest-state.json}"
```

### Orphan Containers

```
Found orphan containers (monitor-bridge) for this project.
```

**Cause**: Service removed from compose file but container still exists.

**Fix**:

```bash
# Remove orphan containers
docker-compose up -d --remove-orphans

# Or manually
docker rm -f monitor-bridge
```

### Volume Mount Issues

```
Error response from daemon: invalid mount config for type "bind": source path does not exist
```

**Fix**:

```bash
# Create directories first
mkdir -p /opt/areloria/data
mkdir -p /opt/areloria/logs

# Then run compose
docker-compose up -d
```

## Container Name Patterns

Docker Compose prefixes container names with project name:

| Compose | Actual Name |
|---------|-------------|
| `arelorian-engine` | `areloria_arelorian-engine_1` |
| `monitor-bridge` | `areloria_monitor-bridge_1` |

**Finding actual name**:

```bash
# List all containers
docker ps --format '{{.Names}}'

# Filter by pattern
docker ps --filter 'name=arelorian' --format '{{.Names}}'
```

## Using docker run as Alternative

When docker-compose fails, use `docker run` directly:

```bash
# Get image name
docker-compose config --images

# Run with env vars
docker run -d \
  --name arelorian-engine \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v /opt/areloria/data:/app/data \
  -v /opt/areloria/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e HOST=0.0.0.0 \
  -e QUEST_PERSISTENCE_DRIVER=postgres \
  -e QUEST_STATE_FILE=/app/data/quest-state.json \
  -e DATABASE_URL='postgresql://...' \
  areloria-arelorian-engine:latest
```

## Recreating Container with New Config

```bash
# Stop and remove
docker stop arelorian-engine
docker rm -f arelorian-engine

# Or force recreate with compose
docker-compose up -d --force-recreate

# Or rebuild
docker-compose up -d --build
```

## Checking Container Health

```bash
# Inside container
docker exec arelorian-engine sh -lc 'curl -s http://localhost:3001/health'

# From host
curl -s http://localhost:3001/health
curl -s http://localhost:3001/health/quest-persistence

# Via domain (through traefik)
curl -s https://arelorian.de/health
```

## Logs

```bash
# Container logs
docker logs --tail 100 arelorian-engine

# Follow mode
docker logs -f arelorian-engine

# Specific service logs (compose)
docker-compose logs --tail 100 arelorian-engine
```

## Environment Variables in Compose

### Loading from .env file

docker-compose automatically loads variables from `.env` in the project directory:

```bash
# Check what compose sees
docker-compose config

# Variables in .env
QUEST_PERSISTENCE_DRIVER=postgres
QUEST_STATE_FILE=/app/data/quest-state.json
```

### Overriding in command line

```bash
# Override at runtime
QUEST_PERSISTENCE_DRIVER=json docker-compose up -d

# Or use .env.docker for different environments
cp .env.example .env.docker
```

## Permissions

```bash
# Fix volume permissions
chmod 777 /opt/areloria/data
chmod 777 /opt/areloria/logs

# Check current ownership
ls -la /opt/areloria/data/
```

## Related Skills

- `wasd-vps-paramiko-ssh.md` - SSH patterns for VPS operations
- `wasd-quest-persistence-ops.md` - Quest persistence with compose
- `wasd-vps-deployment-troubleshooting.md` - General deployment issues