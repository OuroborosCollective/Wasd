# VPS Deployment Workflow Best Practices

## Overview

This document captures the best practices for deploying to VPS using Docker, GitHub Actions, and manual SSH verification.

## Deployment Pipeline

```
GitHub Push → PR Created → CI Checks → Auto-Merge → VPS Deploy → Verification
     │            │            │            │            │            │
     │            │            ↓            ↓            ↓            ↓
     │            │     [audit_logic]  [build]    [docker]      [paramiko]
     │            │     [arch-lint]   [test]     [compose]      [curl]
     │            ↓                                                    
     └───────────→ PR #1586 → draft? → ready-for-review → merge
```

## Key Principles

### 1. Dockerfile.vps is the Single Source of Truth

For VPS deployments:
- Use `Dockerfile.vps`, NOT `Dockerfile.prod`
- It builds all required packages: server, shared, core-logic, client, client-2d, portal
- Copy public assets AFTER Vite build

### 2. Public Assets Must Be Explicitly Copied

Vite does NOT automatically copy `public/` to `dist/`:

```dockerfile
# ✅ Correct
RUN mkdir -p apps/client-2d/dist/assets && \
    cp -a apps/client-2d/public/assets/. apps/client-2d/dist/assets/

# ❌ Wrong - will have missing assets
RUN pnpm --filter @wasd/client-2d build
# (missing copy step)
```

### 3. Nginx Configuration

For Node.js serving static files, Nginx should proxy to Node (NOT serve files directly):

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    # ... proxy headers ...
}
```

### 4. Container Path Structure

Inside the Docker container:
```
/app/server/              ← WORKDIR, node dist/index.js
  ├── dist/index.js       ← Server entry
  └── client/dist/        ← Static assets (copied from builder)
      ├── index.html      ← Root (/)
      ├── 2d/             ← /2d/
      │   ├── index.html
      │   └── assets/      ← /2d/assets/
      │       └── cozy-spring/
      ├── 3d/             ← /3d/
      └── portal/          ← /portal/
```

### 5. Docker Compose for VPS

```yaml
services:
  arelorian:
    build:
      context: .
      dockerfile: Dockerfile.vps
    container_name: arelorian-engine
    ports:
      - "127.0.0.1:3001:3001"
    environment:
      NODE_ENV: production
      GAME_ORIGIN: "https://arelorian.de"
```

## Deployment Checklist

### Before Push
- [ ] Dockerfile.vps updated with public asset copy
- [ ] AGENTS.md documented if new pattern/gotcha
- [ ] CI checks pass (or accept pre-existing failures)

### After Deploy
- [ ] Container running: `docker ps --filter name=arelorian-engine`
- [ ] Git commit matches: `cd /opt/areloria && git log -1 --format="%H"`
- [ ] Assets present: `test -f /app/server/client/dist/2d/assets/cozy-spring/manifest.index.json`
- [ ] HTTPS accessible: `curl -I https://arelorian.de/2d/assets/cozy-spring/manifest.index.json`

### Verification Commands

```bash
# Quick status
docker exec arelorian-engine sh -c "echo OK"

# Full verification
python3 << 'PYEOF'
import paramiko
import os

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    os.environ.get("VPS_HOST", "<VPS_HOST>"),
    22,
    os.environ.get("VPS_USER", "<SSH_USER>"),
    os.environ.get("VPS_PASS", ""),
    timeout=30
)
stdin, stdout, stderr = client.exec_command(
    'docker exec arelorian-engine sh -c "test -f /app/server/client/dist/2d/assets/cozy-spring/manifest.index.json && echo COZY_OK || echo COZY_MISSING"'
)
print(stdout.read().decode().strip())
client.close()
PYEOF
```

> **Security**: Use environment variables for credentials, never hardcode them.

## Common Gotchas

1. **Container naming**: May not be `areloria` - use `docker ps` to find
2. **TTY flag**: Never use `-it` via SSH - use `sh -c` instead
3. **Draft PRs**: Must convert to ready before merging via API
4. **Auto-merge**: Repository must have `allow_auto_merge: true` in settings

## Related Skills

- [VPS SSH Paramiko Patterns](./vps-ssh-paramiko-patterns.md)
- [Vite Public Assets Docker Fix](./vite-public-assets-docker-fix.md)
- [VPS Deploy Verification Tool](./vps-deploy-verification-tool.md)
- [GitHub PR Draft Workaround](./github-pr-draft-workaround.md)
- [GitHub Actions Repair](./wasd-github-actions-repair.md)