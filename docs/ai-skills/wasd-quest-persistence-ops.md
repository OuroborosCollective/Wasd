# Quest Persistence Ops

## Overview

Skills for implementing and operating Quest Persistence on VPS. Covers the full stack from code implementation to production activation.

## Quest Persistence Stack (PRs #1697-#1701)

| PR | Feature | Status |
|----|---------|--------|
| #1697 | Mount/Volume Verification | ✅ merged |
| #1698 | Auth-bound playerId | ✅ merged |
| #1699 | DB-backed Persistence Adapter | ✅ merged |
| #1700 | Backup Policy | ✅ merged |
| #1701 | Production Verification Runbook | ✅ merged |

## Production Activation Checklist

### 1. VPS Mount Verification

```bash
# SSH to VPS
ssh root@46.202.154.25

# Verify host directory writable
mkdir -p /opt/areloria/data
test -w /opt/areloria/data && echo "host-write-ok"

# Verify container mount
docker exec arelorian-engine sh -lc 'test -w /app/data && echo container-write-ok'
```

### 2. Environment Variables

Add to `/opt/areloria/.env` (used by docker-compose):

```bash
QUEST_PERSISTENCE_DRIVER=postgres
QUEST_STATE_FILE=/app/data/quest-state.json
```

Or pass directly to docker run:

```bash
docker run -d \
  -e QUEST_PERSISTENCE_DRIVER=postgres \
  -e QUEST_STATE_FILE=/app/data/quest-state.json \
  areloria-arelorian-engine:latest
```

### 3. Docker Compose Environment Section

Add to `docker-compose.yml` under `services.arelorian-engine.environment`:

```yaml
environment:
  QUEST_PERSISTENCE_DRIVER: "${QUEST_PERSISTENCE_DRIVER:-postgres}"
  QUEST_STATE_FILE: "${QUEST_STATE_FILE:-/app/data/quest-state.json}"
```

**Important**: Do NOT add to `build.args` — only to `environment`.

### 4. Backup Cron Setup

```bash
# Create logs directory
mkdir -p /opt/areloria/logs

# Add to crontab
CRON_LINE='*/30 * * * * cd /opt/areloria && APP_DIR=/opt/areloria scripts/backup-quest-state.sh >> /opt/areloria/logs/quest-backup.log 2>&1'

( crontab -l 2>/dev/null | grep -v 'backup-quest-state.sh' ; echo "$CRON_LINE" ) | crontab -

# Verify
crontab -l | grep backup-quest-state
```

### 5. Permission Hardening

**⚠️ Important: Never leave chmod 777 as permanent state!**

Use the fix script (recommended):
```bash
# Fix permissions - sets ownership to container user
bash scripts/fix-quest-data-permissions.sh
```

The script:
1. Detects container UID/GID
2. Sets ownership to container user
3. Sets mode to 750 (no world-writable)
4. Verifies container can write

**Emergency workaround only (temporary):**
```bash
chmod 777 /opt/areloria/data  # TEMPORARY - fix with script ASAP!
```

### 6. Container Restart

```bash
# Restart to load new env vars
docker restart arelorian-engine

# Wait for startup
sleep 30

# Verify
curl http://localhost:3001/health/quest-persistence
```

## Verification Commands

```bash
# Full verification script
bash scripts/verify-quest-persistence-production.sh

# Check quest health
curl http://localhost:3001/health/quest-persistence
# Expected: {"ok": true, "writable": true, ...}

# Check container env
docker exec arelorian-engine sh -lc 'env | grep QUEST'

# Check backup cron
crontab -l | grep backup-quest-state

# Check backup logs
tail -f /opt/areloria/logs/quest-backup.log
```

## DB Migration

Run on VPS:

```bash
psql -d "$DATABASE_URL" -f server/migrations/005_player_quest_state.sql
```

Or let the server auto-create on startup via `ensurePlayerQuestStateTable()`.

## Rollback Procedure

If Postgres fails, fallback to JSON mode:

```bash
# Set env var
echo "QUEST_PERSISTENCE_DRIVER=json" >> /opt/areloria/.env

# Restart
docker restart arelorian-engine

# Verify health
curl http://localhost:3001/health/quest-persistence
```

## Common Issues

| Issue | Solution |
|-------|----------|
| `EACCES: permission denied` on `/app/data` | Run `scripts/fix-quest-data-permissions.sh` (or manual: `chown -R 100:101 /opt/areloria/data && chmod 750 /opt/areloria/data`) |
| chmod 777 warning in verify script | Run `scripts/fix-quest-data-permissions.sh` to set proper container-user ownership |
| Quest vars not loaded in container | Restart container or use `--force-recreate` |
| docker-compose.yml invalid | Check vars are in `environment` section, not `build` |
| Health returns `"writable": false` | Check permissions and mount path with verify script |

## Related Files

- `scripts/backup-quest-state.sh` - Backup script with rotation
- `scripts/restore-quest-state-dry-run.sh` - Dry-run restore validation
- `scripts/verify-quest-persistence-production.sh` - VPS verification (includes permission check)
- `scripts/fix-quest-data-permissions.sh` - Fix world-writable permissions
- `docs/QUEST_PERSISTENCE_PRODUCTION_RUNBOOK.md` - Complete operational guide
- `server/migrations/005_player_quest_state.sql` - DB migration
- `server/src/quests/PgQuestPersistenceAdapter.ts` - Postgres adapter
- `server/src/quests/JsonQuestPersistenceAdapter.ts` - JSON adapter
- `server/src/api/questPersistenceHealth.ts` - Health endpoint

## Security Rules

- ✅ No secrets committed to git
- ✅ No new DB provisioned (use existing)
- ✅ No destructive migrations (use `IF NOT EXISTS`)
- ✅ No backups in repo (in `.gitignore`)
- ✅ Graceful degradation if DB unreachable
- ⚠️ **Never use chmod 777 as permanent solution** - use fix script instead