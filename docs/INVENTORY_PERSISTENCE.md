# Inventory Persistence

## Status

**PARTIAL MVP**

Player inventory now persists gathered resource items from gathering activities.

## Current Items

| Item ID | Name | Category | Stackable | Max Stack |
|---------|------|----------|-----------|-----------|
| `wood_log` | Wood Log | resource | yes | 999 |
| `copper_ore` | Copper Ore | resource | yes | 999 |
| `raw_fish` | Raw Fish | resource | yes | 999 |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        VPS Host                             │
│  /opt/areloria/                                            │
│  ├── data/                                                 │
│  │   └── inventory-state.json    # Active inventory state  │
│  └── logs/                                                │
└─────────────────────────────────────────────────────────────┘
                            │
                     [Docker Volume Mount]
                            │
┌─────────────────────────────────────────────────────────────┐
│                   arelorian-engine Container               │
│  /app/data/                                               │
│  ├── inventory-state.json        # Mirrored from host     │
│  └── (server process)            # Reads/writes inventory  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Gather Resource
  → Server validates node/range/skill
  → Server grants skill XP
  → Server adds item to player inventory via InventoryService
  → Inventory persists via JSON or Postgres adapter
  → LiveGameplaySnapshot includes inventory
  → 2D Inventory Panel displays gathered items
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INVENTORY_STATE_FILE` | `/app/data/inventory-state.json` | Inventory state file path |
| `INVENTORY_PERSISTENCE_DRIVER` | `json` (falls back to `QUEST_PERSISTENCE_DRIVER`) | `json` or `postgres` |
| `DATABASE_URL` | (none) | Postgres connection string |

## Setup Procedures

### 1. Mount Verification

Before deploying inventory persistence, verify the mount:

```bash
# SSH to VPS
ssh root@46.202.154.25

# Verify host directory
mkdir -p /opt/areloria/data
test -w /opt/areloria/data && echo "host-write-ok"

# Verify container mount
docker exec arelorian-engine sh -lc 'test -w /app/data && echo container-write-ok'

# Check container UID/GID
docker exec arelorian-engine sh -lc 'id -u && id -g'

# Check current permissions
stat -c '%a %U:%G' /opt/areloria/data
```

### 2. Postgres Table Setup (Production)

If using `INVENTORY_PERSISTENCE_DRIVER=postgres`, apply the migration:

```bash
# Via psql (requires DATABASE_URL)
psql -d "$DATABASE_URL" -f server/migrations/007_player_inventory_state.sql

# Verify
psql -d "$DATABASE_URL" -c "\d player_inventory_state"
```

Expected output:
```
 Column      |           Type           | Nullable | Default
--------------+--------------------------+----------+----------------------------------
 player_id    | text                     | not null | 
 schema_version | integer                 | not null | 1
 inventory_json | jsonb                   | not null | 
 created_at   | timestamp with time zone | not null | now()
 updated_at   | timestamp with time zone | not null | now()

Indexes:
    "player_inventory_state_pkey" PRIMARY KEY
    "idx_player_inventory_state_updated_at" btree (updated_at)
```

### 3. Environment Configuration

Update `.env` on VPS:

```bash
# Edit on VPS
nano /opt/areloria/.env

# Recommended production config:
INVENTORY_STATE_FILE=/app/data/inventory-state.json
INVENTORY_PERSISTENCE_DRIVER=json  # or postgres
# DATABASE_URL= already present from previous setup

# Restart to apply
docker restart arelorian-engine
```

## Verification Procedures

### Check Health Endpoint

```bash
# Basic health
curl http://localhost:3000/health/inventory-persistence

# JSON output
curl -s http://localhost:3000/health/inventory-persistence | jq .
```

Expected response (JSON driver):
```json
{
  "ok": true,
  "persistence": {
    "ok": true,
    "filePath": "/app/data/inventory-state.json",
    "dir": "/app/data",
    "writable": true
  }
}
```

### Check Inventory State API

```bash
# Get inventory for a player
curl -s "http://localhost:3000/api/inventory/state?playerId=test-player" | jq .
```

Expected response:
```json
{
  "ok": true,
  "playerId": "test-player",
  "authenticated": false,
  "inventory": {
    "playerId": "test-player",
    "schemaVersion": 1,
    "slots": [],
    "capacity": 32
  }
}
```

### Check Gathering Adds to Inventory

```bash
# Gather from tree node
curl -X POST "http://localhost:3000/api/resource/gather?playerId=test-player" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"starter_tree_001","playerPosition":{"x":460,"y":500},"currentTick":1000}'

# Verify inventory now has Wood Log
curl -s "http://localhost:3000/api/inventory/state?playerId=test-player" | jq '.inventory.slots'
```

Expected:
```json
[
  {
    "slotId": "slot_wood_log",
    "itemId": "wood_log",
    "name": "Wood Log",
    "quantity": 1,
    "category": "resource",
    "stackable": true,
    "maxStack": 999
  }
]
```

### Check Gameplay Snapshot Includes Inventory

```bash
curl -s "http://localhost:3000/api/gameplay/snapshot?playerId=test-player" | jq '.snapshot.inventory'
```

## Backup Procedures

### Manual Backup

```bash
# Backup inventory state
cp /opt/areloria/data/inventory-state.json \
   /opt/areloria/data/backups/inventory/inventory-state-$(date +%Y%m%dT%H%M%SZ).json

# Verify backup
ls -la /opt/areloria/data/backups/inventory/
```

### Cron Setup for Inventory Backups

Add inventory backup to crontab (alongside quest backup):

```bash
# Create backup directory
mkdir -p /opt/areloria/data/backups/inventory

# Add to crontab
crontab -l 2>/dev/null | grep -v 'backup-inventory' > /tmp/current-cron
echo '*/30 * * * * cp /opt/areloria/data/inventory-state.json /opt/areloria/data/backups/inventory/inventory-state-$(date +\%Y\%m\%dT\%H\%M\%SZ).json 2>/dev/null || true' >> /tmp/current-cron
crontab /tmp/current-cron
rm /tmp/current-cron

# Verify
crontab -l | grep inventory
```

## Monitoring Checklist

- [ ] Host data directory writable
- [ ] Container mount verified
- [ ] Health endpoint returns `"ok": true`
- [ ] Gathering adds items to inventory
- [ ] Inventory appears in gameplay snapshot
- [ ] INVENTORY_PERSISTENCE_DRIVER set correctly
- [ ] DATABASE_URL reachable (if using postgres)

## Current Limits

- **Resource items only** - wood_log, copper_ore, raw_fish
- **No equipment slots** - equipment system pending
- **No trading** - trading system pending
- **No crafting consumption** - crafting system pending
- **No item drop randomization** - deterministic rewards only

## Determinism

- Stable item definitions (no runtime generation)
- Stable slot IDs by itemId
- Stable ordering by itemId (alphabetically sorted)
- Stackable resources are deterministic
- Client cannot set inventory directly
- No Math.random() for gameplay state
- No Date.now() for gameplay state

## Next Steps (Pending)

1. **Crafting System** - Consume gathered resources to craft items
2. **Equipment System** - Add equipment slots and item equipping
3. **Trading System** - Player-to-player item trading
4. **Shop System** - Buy/sell items with currency

---

**PARTIAL: gathered resource items are persisted and exposed in snapshot. Equipment, trading, crafting consumption and economy systems pending.**