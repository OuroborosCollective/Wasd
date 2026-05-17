# Areloria Notification Layer V1: Novu

This layer adds an asynchronous notification bridge for Areloria/WASD.

It is intentionally outside the deterministic 10Hz game loop. WorldTick, LiveHeal, asset validation, beta marketing, admin tools, and future gameplay systems can emit important events into this layer without coupling combat, movement, or NPC simulation to an external provider.

## Runtime env

```bash
NOVU_ENABLED=false
NOVU_DRY_RUN=true
NOVU_API_KEY=
NOVU_API_URL=https://api.novu.co
NOVU_WORKFLOW_PREFIX=areloria
NOVU_ADMIN_SUBSCRIBER_ID=areloria-admin
NOVU_ADMIN_EMAIL=
NOTIFICATION_ADMIN_TOKEN=
```

Recommended production setup:

```bash
NOVU_ENABLED=true
NOVU_DRY_RUN=false
NOVU_API_KEY=<Novu API key>
NOVU_WORKFLOW_PREFIX=areloria
NOTIFICATION_ADMIN_TOKEN=<long random token>
```

`NOTIFICATION_ADMIN_TOKEN` can fall back to `ADMIN_DEPLOY_TOKEN` or `SOVEREIGN_LAUNCH_KEY`, but a dedicated token is cleaner.

## Workflow naming

The service maps topics to Novu workflow names using:

```txt
<workflowPrefix>.<topic>
```

Examples:

```txt
areloria.city_under_attack
areloria.guild_invite
areloria.market_sale
areloria.dungeon_raid_starting
areloria.liveheal_anomaly
areloria.glb_asset_quarantined
areloria.deploy_failed
areloria.beta_key_invite
areloria.maintenance_notice
```

Create matching workflows in Novu.

## API

### Status

```bash
curl http://localhost:3000/api/notifications/status
```

### Trigger player notification

```bash
curl -X POST http://localhost:3000/api/notifications/trigger \
  -H 'content-type: application/json' \
  -H 'x-notification-admin-token: <token>' \
  -d '{
    "topic": "city_under_attack",
    "subscriber": {
      "id": "player-123",
      "email": "player@example.com",
      "firstName": "Rune"
    },
    "payload": {
      "cityName": "Lorienfurt",
      "attackerGuild": "Black Banner",
      "startsAt": "2026-05-17T21:00:00Z"
    }
  }'
```

### Trigger admin alert

```bash
curl -X POST http://localhost:3000/api/notifications/admin-alert \
  -H 'content-type: application/json' \
  -H 'x-notification-admin-token: <token>' \
  -d '{
    "topic": "liveheal_anomaly",
    "payload": {
      "severity": "critical",
      "subsystem": "asset-firewall",
      "message": "GLB quarantine spike detected"
    }
  }'
```

## Design rules

Use Novu for slow, meaningful, persistent events:

- city attack alerts
- guild invites
- market sales
- dungeon countdowns
- LiveHeal anomalies
- GLB quarantine events
- deployment failures
- beta-key invites
- maintenance windows

Do not use Novu for high-frequency deterministic events:

- movement
- combat damage ticks
- NPC micro-decisions
- physics
- per-frame state

Those remain WebSocket/EventBus/WorldTick responsibilities.

## Implementation files

```txt
server/src/services/NovuNotificationService.ts
server/src/api/notificationRoute.ts
server/src/core/ServerBootstrap.ts
```

The adapter uses `fetch` directly instead of adding a new SDK dependency. This avoids lockfile churn and keeps the monorepo deploy stable.
