# Quest Persistence Backup Policy

## Overview

Quest state is persisted either to JSON file or Postgres DB. This document covers the backup strategy for both persistence modes.

## JSON Mode (Default)

### Quest State File Location

| Environment | Path |
|-------------|------|
| Container | `/app/data/quest-state.json` |
| VPS Host | `/opt/areloria/data/quest-state.json` |
| Custom ENV | `QUEST_STATE_FILE=/custom/path/quest-state.json` |

### Backup Script

```bash
# Run backup manually
APP_DIR=/opt/areloria scripts/backup-quest-state.sh

# Or with custom paths
QUEST_STATE_FILE=/opt/areloria/data/quest-state.json \
QUEST_BACKUP_DIR=/opt/areloria/data/backups/quest \
QUEST_BACKUP_KEEP=48 \
scripts/backup-quest-state.sh
```

### Verify Backup

```bash
# Run dry-run validation
scripts/restore-quest-state-dry-run.sh /opt/areloria/data/backups/quest/quest-state-YYYYMMDDTHHMMSSZ.json
```

### Cron Setup

Add to crontab for automatic backups:

```bash
# Every 30 minutes
*/30 * * * * cd /opt/areloria && APP_DIR=/opt/areloria scripts/backup-quest-state.sh >> /opt/areloria/logs/quest-backup.log 2>&1

# Every hour
0 * * * * cd /opt/areloria && APP_DIR=/opt/areloria scripts/backup-quest-state.sh >> /opt/areloria/logs/quest-backup.log 2>&1
```

## Postgres Mode

When `QUEST_PERSISTENCE_DRIVER=postgres`, quest state is stored in the `player_quest_state` table.

### Backup via pg_dump

```bash
# Backup entire quest state table
pg_dump -t player_quest_state -d "$DATABASE_URL" > quest-state-backup-$(date +%Y%m%dT%H%M%SZ).sql

# Restore (dry-run first)
psql -d "$DATABASE_URL" -c "SELECT COUNT(*) FROM player_quest_state"  # verify table exists
```

### Combined Strategy

For production, consider both:
1. JSON file backups (fast, local)
2. Database backups via pg_dump (durable, off-site)

## Backup Rules

1. **Never commit backups to git** - Add to `.gitignore`:
   ```
   data/
   *.backup
   *.bak
   ```

2. **Never restore destructively without confirmation** - Use dry-run validation first

3. **Keep at least 24 backups** - Default rotation keeps newest 24

4. **Verify sha256 before restore** - Every backup includes `.sha256` manifest

5. **Backups contain gameplay state, not secrets** - No auth tokens or passwords

## Restore Procedure

### JSON Mode

```bash
# 1. Validate backup
scripts/restore-quest-state-dry-run.sh /opt/areloria/data/backups/quest/quest-state-YYYYMMDDTHHMMSSZ.json

# 2. If validation passes, restore manually
#    (copy file to QUEST_STATE_FILE location with operator confirmation)
cp /opt/areloria/data/backups/quest/quest-state-YYYYMMDDTHHMMSSZ.json \
   /opt/areloria/data/quest-state.json

# 3. Verify restored file
scripts/restore-quest-state-dry-run.sh /opt/areloria/data/quest-state.json
```

### Postgres Mode

```bash
# 1. Verify backup exists
psql -d "$DATABASE_URL" -c "SELECT COUNT(*) FROM player_quest_state"

# 2. Restore from pg_dump (requires operator confirmation)
psql -d "$DATABASE_URL" < quest-state-backup-YYYYMMDDTHHMMSSZ.sql
```

## Monitoring

Check backup health via:

```bash
# Verify latest backup exists
ls -la /opt/areloria/data/backups/quest/ | tail -5

# Check backup log
tail -20 /opt/areloria/logs/quest-backup.log
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backup fails with permission error | Check `/opt/areloria/data` is writable by deploy user |
| Manifest file missing | Run backup script again to regenerate |
| sha256 mismatch | Backup may be corrupted; use previous backup |
| No backups in rotation | Check cron is running: `systemctl status cron` |