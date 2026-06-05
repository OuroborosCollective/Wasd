# Quest Persistence Production Runbook

## Overview

This runbook covers the operational procedures for Quest Persistence on the VPS.
Quest state can be persisted either via JSON file or Postgres DB, with automatic fallback.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VPS Host                             │
│  /opt/areloria/                                            │
│  ├── data/                                                 │
│  │   ├── quest-state.json          # Active quest state    │
│  │   └── backups/quest/           # Timestamped backups   │
│  └── logs/                                                │
│      └── quest-backup.log         # Backup cron log       │
└─────────────────────────────────────────────────────────────┘
                            │
                     [Docker Volume Mount]
                            │
┌─────────────────────────────────────────────────────────────┐
│                   arelorian-engine Container               │
│  /app/data/                                               │
│  ├── quest-state.json            # Mirrored from host     │
│  └── (server process)            # Reads/writes quest     │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `QUEST_STATE_FILE` | `/app/data/quest-state.json` | Quest state file path |
| `QUEST_PERSISTENCE_DRIVER` | `json` | `json` or `postgres` |
| `DATABASE_URL` | (none) | Postgres connection string |
| `APP_DIR` | `/opt/areloria` | Host data directory base |

## Setup Procedures

### 1. Mount Verification

Before deploying quest persistence, verify the mount:

```bash
# SSH to VPS
ssh root@46.202.154.25

# Verify host directory
mkdir -p /opt/areloria/data
test -w /opt/areloria/data && echo "host-write-ok"

# Verify container mount
docker exec arelorian-engine sh -lc 'test -w /app/data && echo container-write-ok'

# Check container UID/GID (needed for secure permissions)
docker exec arelorian-engine sh -lc 'id -u && id -g'

# Check current permissions
stat -c '%a %U:%G' /opt/areloria/data

# Run full verification
bash scripts/verify-quest-persistence-production.sh
```

### 1b. Permission Hardening

After mount verification, apply secure permissions:

```bash
# Option 1: Use the fix script (recommended)
bash scripts/fix-quest-data-permissions.sh

# Option 2: Manual fix (if fix script unavailable)
# 1. Get container UID/GID
CONTAINER_UID=$(docker exec arelorian-engine sh -lc 'id -u')
CONTAINER_GID=$(docker exec arelorian-engine sh -lc 'id -g')

# 2. Set ownership to container user
chown -R ${CONTAINER_UID}:${CONTAINER_GID} /opt/areloria/data

# 3. Set secure mode (owner rw, group r-x, no world access)
chmod 750 /opt/areloria/data

# 4. Verify
stat -c '%a %U:%G' /opt/areloria/data
docker exec arelorian-engine sh -lc 'test -w /app/data && echo ok'
```

> **Warning: chmod 777 is a temporary emergency fix only**
>
> If the data directory is not writable and no other solution works:
> ```bash
> chmod 777 /opt/areloria/data  # TEMPORARY - fix properly ASAP!
> ```
> This allows any local process to write quest state. Replace with proper
> container-user ownership as soon as possible using the fix script above.

### 2. Postgres Table Setup (Production)

If using `QUEST_PERSISTENCE_DRIVER=postgres`, create the table:

```bash
# Via psql (requires DATABASE_URL)
psql -d "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS player_quest_state (
  player_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL DEFAULT 1,
  quests_json JSONB NOT NULL,
  updated_tick INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_quest_state_updated_at
ON player_quest_state(updated_at);
"

# Verify
psql -d "$DATABASE_URL" -c "\d player_quest_state"
```

Or via the server's built-in table creation (auto-runs on startup):

```bash
# Restart container - table auto-creates
docker restart arelorian-engine
docker logs --tail 20 arelorian-engine | grep player_quest_state
```

### 3. Cron Setup

Install backup cron for automatic backups:

```bash
# Create log directory
mkdir -p /opt/areloria/logs

# Add to crontab
crontab -l 2>/dev/null | grep -v 'backup-quest-state.sh' > /tmp/current-cron
echo '*/30 * * * * cd /opt/areloria && APP_DIR=/opt/areloria scripts/backup-quest-state.sh >> /opt/areloria/logs/quest-backup.log 2>&1' >> /tmp/current-cron
crontab /tmp/current-cron
rm /tmp/current-cron

# Verify
crontab -l | grep backup-quest-state
```

### 4. Environment Configuration

Update `.env` on VPS:

```bash
# Edit on VPS
nano /opt/areloria/.env

# Recommended production config:
QUEST_STATE_FILE=/app/data/quest-state.json
QUEST_PERSISTENCE_DRIVER=postgres  # or json
# DATABASE_URL= already present from previous setup

# Restart to apply
docker restart arelorian-engine
```

## Verification Procedures

### Run Full Verification

```bash
# SSH to VPS
ssh vps

# Run verification script
bash scripts/verify-quest-persistence-production.sh
```

Expected output:
```
[quest-prod] ✓ Host data directory writable
[quest-prod] ✓ Container /app/data writable
[quest-prod] ✓ Quest state file exists
[quest-prod] ✓ Health endpoint reachable
[quest-prod] ✓ Backup directory exists
[quest-prod] ✓ Backup cron configured
[quest-prod] ✓ All checks passed!
```

### Check Health Endpoint

```bash
# Basic health
curl http://localhost:3000/health/quest-persistence

# JSON output
curl -s http://localhost:3000/health/quest-persistence | jq .
```

Expected response:
```json
{
  "ok": true,
  "filePath": "/app/data/quest-state.json",
  "dir": "/app/data",
  "writable": true
}
```

### Check Container Mount

```bash
# Verify container can write
docker exec arelorian-engine sh -lc 'test -w /app/data && echo ok'

# Verify file exists in container
docker exec arelorian-engine sh -lc 'cat /app/data/quest-state.json | head -c 200'
```

### Check Backup Status

```bash
# List recent backups
find /opt/areloria/data/backups/quest -name 'quest-state-*.json' -type f | sort | tail -5

# Check backup log
tail -20 /opt/areloria/logs/quest-backup.log

# Verify latest backup
LATEST=$(find /opt/areloria/data/backups/quest -name 'quest-state-*.json' -type f | sort | tail -n 1)
scripts/restore-quest-state-dry-run.sh "$LATEST"
```

## Backup Procedures

### Manual Backup

```bash
# Run backup script
APP_DIR=/opt/areloria scripts/backup-quest-state.sh

# Output
[quest-backup] 2026-06-05T16:30:00Z wrote backup: /opt/areloria/data/backups/quest/quest-state-20260605T163000Z.json
[quest-backup] 2026-06-05T16:30:00Z backup verified successfully
[quest-backup] 2026-06-05T16:30:00Z total backups: 25 (keeping newest 24)
```

### Restore from Backup

**Dry-run first:**

```bash
# Find latest backup
LATEST=$(find /opt/areloria/data/backups/quest -name 'quest-state-*.json' -type f | sort | tail -n 1)
echo "Latest: $LATEST"

# Validate backup
scripts/restore-quest-state-dry-run.sh "$LATEST"
```

**Actual restore (requires operator confirmation):**

```bash
# 1. Stop server to prevent write during restore
docker stop arelorian-engine

# 2. Copy backup to quest state file
cp /opt/areloria/data/backups/quest/quest-state-YYYYMMDDTHHMMSSZ.json \
   /opt/areloria/data/quest-state.json

# 3. Verify restored file
scripts/restore-quest-state-dry-run.sh /opt/areloria/data/quest-state.json

# 4. Start server
docker start arelorian-engine

# 5. Verify health
curl http://localhost:3000/health/quest-persistence
```

## Troubleshooting

### Quest State File Not Writable

**Symptom:** Health endpoint returns `"writable": false`

**Diagnosis:**
```bash
# Check current permissions
ls -la /opt/areloria/data/
stat -c '%a %U:%G' /opt/areloria/data

# Check container UID/GID
docker exec arelorian-engine sh -lc 'id -u && id -g'
```

**Fix (recommended - use fix script):**
```bash
# Run the fix script - sets ownership to container user
bash scripts/fix-quest-data-permissions.sh
```

**Fix (manual):**
```bash
# Get container UID/GID
CONTAINER_UID=$(docker exec arelorian-engine sh -lc 'id -u')
CONTAINER_GID=$(docker exec arelorian-engine sh -lc 'id -g')

# Set ownership
chown -R ${CONTAINER_UID}:${CONTAINER_GID} /opt/areloria/data

# Set secure mode
chmod 750 /opt/areloria/data

# Verify
docker exec arelorian-engine sh -lc 'test -w /app/data && echo ok'
```

**Emergency Fix (temporary only):**
```bash
chmod 777 /opt/areloria/data  # WARNING: security risk - fix properly ASAP!
```
> Only use 777 as a last resort. Replace with proper ownership using the fix script.

### No Backups in Directory

**Symptom:** `find` shows no backup files

**Fix:**
```bash
# Check cron is running
crontab -l | grep backup-quest-state

# If not, add cron (see Setup Procedures > Cron Setup)

# Run backup manually
APP_DIR=/opt/areloria scripts/backup-quest-state.sh

# Verify
find /opt/areloria/data/backups/quest -name 'quest-state-*.json' -type f
```

### Postgres Adapter Fails

**Symptom:** `health()` returns `{ ok: false, driver: "postgres", error: "..." }`

**Fix:**
```bash
# Check DATABASE_URL is set
grep DATABASE_URL /opt/areloria/.env

# Test connection
psql -d "$DATABASE_URL" -c "SELECT 1"

# If DB is unreachable, fallback to JSON:
# Set in .env:
QUEST_PERSISTENCE_DRIVER=json

# Restart
docker restart arelorian-engine
```

### Backup Script Fails

**Symptom:** Cron emails or errors in log

**Fix:**
```bash
# Check log
cat /opt/areloria/logs/quest-backup.log

# Common issues:
# - QUEST_STATE_FILE doesn't exist: normal on first run
# - Permission denied: check /opt/areloria/data/ permissions
# - Disk full: check df -h
```

## Rollback Procedures

### Fallback to JSON Mode

If Postgres persistence fails in production:

```bash
# 1. Set env var
echo "QUEST_PERSISTENCE_DRIVER=json" >> /opt/areloria/.env

# 2. Restart
docker restart arelorian-engine

# 3. Verify
curl http://localhost:3000/health/quest-persistence

# 4. Check server logs
docker logs --tail 50 arelorian-engine | grep -i quest
```

### Restore from JSON Backup to Postgres

If you need to migrate JSON state to Postgres:

```bash
# 1. Verify JSON backup
LATEST=$(find /opt/areloria/data/backups/quest -name 'quest-state-*.json' -type f | sort | tail -n 1)
scripts/restore-quest-state-dry-run.sh "$LATEST"

# 2. Switch to postgres driver
sed -i 's/QUEST_PERSISTENCE_DRIVER=.*/QUEST_PERSISTENCE_DRIVER=postgres/' /opt/areloria/.env

# 3. Restart - server will load JSON file and persist to Postgres
docker restart arelorian-engine

# 4. Verify
psql -d "$DATABASE_URL" -c "SELECT COUNT(*) FROM player_quest_state"
```

## Monitoring Checklist

- [ ] Host data directory writable
- [ ] Container mount verified
- [ ] Health endpoint returns `"ok": true`
- [ ] Backup cron running
- [ ] Backup log shows recent activity
- [ ] Latest backup sha256 verified
- [ ] QUEST_PERSISTENCE_DRIVER set correctly
- [ ] DATABASE_URL reachable (if using postgres)

## Security Notes

- **Never commit backups to git** - already in `.gitignore`
- **Never log secrets** - health endpoint masks sensitive data
- **Verify sha256 before restore** - prevents corrupted data
- **No destructive operations** - restore requires operator confirmation

## Related Persistence Systems

The `/opt/areloria/data` directory may now contain multiple state files:

| File | Description | Migration |
|------|-------------|-----------|
| `quest-state.json` | Active quest state | 005_player_quest_state.sql |
| `skill-state.json` | Player skill progression | 006_player_skill_state.sql |
| `inventory-state.json` | Player gathered items | 007_player_inventory_state.sql |

Backup policy should cover all `*-state.json` files.

## Emergency Contacts

If production issues persist after following this runbook:

1. Check server logs: `docker logs --tail 100 arelorian-engine`
2. Check system logs: `journalctl -u docker --no-pager`
3. Check disk space: `df -h`
4. Consider restart: `docker restart arelorian-engine`