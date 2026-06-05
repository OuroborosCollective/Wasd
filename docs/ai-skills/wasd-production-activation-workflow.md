# Production Activation Workflow

## Overview

Complete workflow for activating new features on VPS production. Covers code deployment, environment configuration, verification, and rollback.

## When to Use

Use this workflow when:
- A feature PR is merged and needs production activation
- Deploying new environment variables
- Running database migrations on production
- Verifying new functionality after deploy

## Workflow Stages

```
1. Code Deployment    → Git pull on VPS
2. Environment Setup   → Set env vars, update compose
3. Migration          → Run DB migrations (if any)
4. Container Restart  → Load new config
5. Verification       → Health checks, functional tests
6. Monitoring         → Logs, backup verification
```

## Stage 1: Code Deployment

```bash
# SSH to VPS
ssh root@46.202.154.25

# Navigate to app directory
cd /opt/areloria

# Fetch latest
git fetch origin main

# Reset to latest (keeps local config files)
git reset --hard origin/main

# Check current commit
git rev-parse --short HEAD
```

## Stage 2: Environment Setup

### Option A: Edit .env file

```bash
# Add or update variables
echo "QUEST_PERSISTENCE_DRIVER=postgres" >> /opt/areloria/.env
echo "QUEST_STATE_FILE=/app/data/quest-state.json" >> /opt/areloria/.env

# Verify
grep QUEST /opt/areloria/.env
```

### Option B: Update docker-compose.yml

```bash
# Add to environment section
sed -i '/SUPABASE_AUTH:/a\      QUEST_PERSISTENCE_DRIVER: "${QUEST_PERSISTENCE_DRIVER:-postgres}"' docker-compose.yml

# Verify
grep -A2 'QUEST_PERSISTENCE' docker-compose.yml
```

### Option C: Direct docker run

```bash
# Stop existing container
docker stop arelorian-engine
docker rm -f arelorian-engine

# Run with new env vars
docker run -d \
  --name arelorian-engine \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v /opt/areloria/data:/app/data \
  -e QUEST_PERSISTENCE_DRIVER=postgres \
  -e QUEST_STATE_FILE=/app/data/quest-state.json \
  areloria-arelorian-engine:latest
```

## Stage 3: Database Migration

```bash
# Run migration file
psql -d "$DATABASE_URL" -f server/migrations/XXX_migration.sql

# Or via Docker
docker exec -i arelorian-engine psql -d "$DATABASE_URL" -f /app/server/migrations/XXX_migration.sql

# Verify table exists
psql -d "$DATABASE_URL" -c "\d table_name"
```

**Migration rules**:
- Always use `IF NOT EXISTS` or `CREATE TABLE IF NOT EXISTS`
- Never drop tables in production
- Backup before migration if possible

## Stage 4: Container Restart

```bash
# Restart container
docker restart arelorian-engine

# Wait for startup (health check ready)
sleep 30

# Or wait for healthy status
for i in {1..30}; do
    if curl -s http://localhost:3001/health | grep -q '"status":"ok"'; then
        echo "Container is healthy"
        break
    fi
    echo "Waiting... ($i)"
    sleep 2
done
```

## Stage 5: Verification

### Automated Verification Script

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Production Verification ==="

# 1. Check container status
docker ps --filter 'name=arelorian' --format '{{.Names}} {{.Status}}'

# 2. Check health endpoint
curl -s http://localhost:3001/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Status: {d.get(\"status\")}')"

# 3. Check feature-specific health
curl -s http://localhost:3001/health/quest-persistence

# 4. Check logs for errors
docker logs --tail 20 arelorian-engine | grep -i error || echo "No errors in recent logs"

# 5. Check cron
crontab -l | grep backup-quest-state || echo "No backup cron"

echo "=== Verification Complete ==="
```

### Manual Verification

```bash
# Check container env
docker exec arelorian-engine sh -lc 'env | grep QUEST'

# Check file system
ls -la /opt/areloria/data/

# Check backup directory
ls -la /opt/areloria/data/backups/quest/

# Check backup log
tail -10 /opt/areloria/logs/quest-backup.log
```

## Stage 6: Monitoring

### Backup Monitoring

```bash
# Check backup cron is running
crontab -l | grep backup-quest-state

# Check latest backup
find /opt/areloria/data/backups/quest -name 'quest-state-*.json' -type f | sort | tail -1

# Verify backup integrity
scripts/restore-quest-state-dry-run.sh /opt/areloria/data/backups/quest/quest-state-YYYYMMDDTHHMMSSZ.json

# Check backup log
tail -f /opt/areloria/logs/quest-backup.log
```

### Log Monitoring

```bash
# Real-time logs
docker logs -f arelorian-engine

# Filter for specific feature
docker logs --tail 100 arelorian-engine | grep -i quest

# Error logs
docker logs --tail 100 arelorian-engine | grep -i error
```

## Rollback Procedure

### Option A: Revert to previous commit

```bash
cd /opt/areloria
git reset --hard HEAD~1
git push --force
docker-compose up -d --build
```

### Option B: Revert environment variables

```bash
# Remove from .env
sed -i '/QUEST_PERSISTENCE_DRIVER/d' /opt/areloria/.env

# Restart
docker restart arelorian-engine
```

### Option C: Fallback to JSON mode (Quest Persistence example)

```bash
# Set driver to json
echo "QUEST_PERSISTENCE_DRIVER=json" >> /opt/areloria/.env

# Restart
docker restart arelorian-engine

# Verify
curl -s http://localhost:3001/health/quest-persistence
```

## Security Rules

1. **No secrets in git**: Never commit `.env`, `.env.docker`, or real credentials
2. **No destructive operations**: Always use `IF NOT EXISTS`
3. **Backup before changes**: Run backup script before migrations
4. **Verify before rollback**: Always check health endpoint before assuming failure
5. **Graceful degradation**: Ensure fallback works when primary fails

## Pre-Flight Checklist

- [ ] Code is merged to main
- [ ] Migration files reviewed (no destructive ops)
- [ ] Environment variables identified
- [ ] Backup cron configured (if applicable)
- [ ] Verification script prepared
- [ ] Rollback procedure documented
- [ ] No secrets to commit

## Post-Activation Checklist

- [ ] Container is running
- [ ] Health endpoint returns 200
- [ ] Feature-specific health verified
- [ ] No errors in logs
- [ ] Backup cron working (if applicable)
- [ ] Backup logs show recent activity

## Related Skills

- `wasd-quest-persistence-ops.md` - Quest persistence specific
- `wasd-vps-paramiko-ssh.md` - SSH automation
- `wasd-health-endpoint-verification.md` - Health checks
- `wasd-docker-compose-troubleshooting.md` - Compose issues