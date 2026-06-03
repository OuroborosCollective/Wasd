# Areloria Client-2D Boot Stack

## Overview

Der Areloria 2D MMORPG Client verwendet einen modularen Boot-Stack für deterministisches Laden, PWA-Installierbarkeit und Offline-Support.

## Boot Flow

```
Browser / Android / WebView
        ↓
index.html (Ultimate App-Shell)
        ↓
main.tsx (Error Handler + SW Registration)
        ↓
GameBoot.tsx (Boot State Machine)
        ↓
clientHealth.ts + BootOverlay.tsx
        ↓
PIXI Client + Logic Clock (10Hz)
        ↓
WebSocket Gateway (networkClient.ts)
        ↓
ARE / Ouroboros / Plexity Layer
```

## Boot Phases

| Phase | Beschreibung |
|-------|--------------|
| `BOOTING` | Initiale Client-Mount |
| `CHECKING_DEVICE` | WebGL + Browser-Check |
| `CHECKING_SERVER` | Server-Connection-Test |
| `LOADING_ASSETS` | Asset-Preload |
| `CONNECTING_WORLD` | WebSocket-Verbindung |
| `SYNCING_TICK` | Tick-Synchronisation |
| `READY` | Spiel bereit |
| `DEGRADED` | Reduzierter Modus |
| `OFFLINE` | Offline ohne Server |
| `FATAL` | Kritischer Fehler |

## Key Components

### 1. boot.config.ts

Zentrale Konfiguration für alle Client-Einstellungen:

```typescript
export const ARELORIA_BOOT_CONFIG: AreloriaBootConfig = {
  appName: "Areloria",
  clientId: "REAL_PIXI_CLIENT",
  engine: "PIXI_2D",
  logicHz: 10,
  renderMaxFps: 60,
  mode: "production",
  network: { wsUrl, healthUrl, reconnectMinMs, heartbeatMs },
  world: { chunkSize, observerRadiusChunks, interpolationMs },
  design: { theme: "cyber_zen", showDebugHud: true },
  are: { enabled: true, kappaInvariant: 1000, plexityGate: true }
};
```

### 2. logicClock.ts

Deterministische 10Hz-Logik-Loop:

```typescript
const clock = createLogicClock({
  hz: 10,
  onTick: (tick) => {
    // tick.tickId, tick.fixedDtMs, tick.fixedDtSec
  }
});
clock.start();
```

### 3. clientHealth.ts

Device-Diagnose für "Endlos-Lade-Screen"-Vermeidung:

- WebGL availability check
- Online/Offline detection
- Viewport minimum (320x240)
- WebGL renderer info

### 4. service-worker.js

Offline/Cache-Strategie:

- Cache-first für static assets
- Network-fallback bei API calls
- Automatische Cache-Cleanup

## PWA Setup

### manifest.webmanifest

```json
{
  "name": "Areloria",
  "short_name": "Areloria",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#070711",
  "theme_color": "#0f0f1a",
  "icons": [...]
}
```

### index.html Meta Tags

- `mobile-web-app-capable: yes`
- `apple-mobile-web-app-*` für iOS
- `theme-color: #0f0f1a`

## Environment Variables

```bash
VITE_ARELORIA_MODE=production
VITE_WS_URL=wss://domain.com/ws
VITE_HEALTH_URL=/health
```

## Docker Build

Der `Dockerfile.vps` buildet automatisch:

1. `pnpm --filter @wasd/client-2d build`
2. Kopiert `public/assets/` → `dist/assets/`
3. Kopiert `public/manifest.webmanifest` → `dist/`
4. Kopiert `public/service-worker.js` → `dist/`
5. Erstellt `build-stamp.json` mit commit-SHA

Validierung im Docker:
```bash
test -f /app/client/dist/2d/manifest.webmanifest
test -f /app/client/dist/2d/service-worker.js
```

## Deployment Workflow

1. **GitHub Actions** (`vps-docker-deploy.yml`):
   - Build client-2d
   - Verify PWA files
   - Create `build-stamp.json`
   - Upload to VPS

2. **VPS Deploy Script** (`deploy-vps-docker.sh`):
   - Validate Dockerfile includes PWA
   - Build Docker image
   - Health check `/2d/build-stamp.json`

## Best Practices

1. **Never show black screen**: Boot-Phasen immer sichtbar
2. **Error boundaries**: Global Error Handler in `main.tsx`
3. **Deterministic timing**: 10Hz fixed timestep für Logik
4. **Offline-first**: Service Worker für Cache
5. **Version pinning**: `build-stamp.json` mit commit-SHA

## Related Files

- `apps/client-2d/index.html` - Ultimate App-Shell
- `apps/client-2d/src/main.tsx` - Entry mit Error Handling
- `apps/client-2d/src/ui/GameBoot.tsx` - Boot State Machine
- `apps/client-2d/src/boot/boot.config.ts` - Zentral Config
- `apps/client-2d/src/logic/logicClock.ts` - 10Hz Loop
- `apps/client-2d/src/system/clientHealth.ts` - Device Check
- `apps/client-2d/src/engine/pixiClient.ts` - PIXI Renderer
- `apps/client-2d/public/manifest.webmanifest` - PWA Manifest
- `apps/client-2d/public/service-worker.js` - Offline Cache
---

## Phase 2: Playable Client (Current Implementation)

### Architecture

```
GameBoot.tsx
    |
    +-- InputBuffer (WASD + Touch)
    +-- ClientWorld (Entity State)
    +-- SnapshotBuffer (Server Updates)
    +-- NetworkClient (WebSocket)
    +-- PixiClient (Renderer)
    +-- LogicClock (10Hz)

UI Overlays: MobileHud + DebugHud + VersionOverlay
```

### New Files (Phase 2)

| File | Purpose |
|------|---------|
| `net/protocol.ts` | Network message types |
| `net/networkClient.ts` | WebSocket with auto-reconnect |
| `net/snapshotBuffer.ts` | Server snapshot queue |
| `logic/inputBuffer.ts` | Deterministic input collector |
| `logic/playerController.ts` | Movement calculation |
| `logic/clientWorld.ts` | Entity state management |
| `world/entities.ts` | Entity types |
| `world/chunks.ts` | Chunk coordinate utilities |
| `ui/MobileHud.tsx` | Touch joystick + SKILL button |
| `ui/DebugHud.tsx` | Debug info overlay |
| `ui/VersionOverlay.tsx` | Version display |
| `system/clientVersion.ts` | Client version constants |

### Deterministic Rules

1. Logic remains fixed at 10Hz via `createLogicClock`
2. Input consumed per tick: `inputBuffer.consumeForTick(tickId)`
3. Renderer only renders `WorldViewState`
4. Network snapshots buffered before world application
5. Client renders without server (offline/degraded mode)
6. WebSocket failure is non-fatal (auto-reconnect)
7. All time uses tickId/fixedDtSec
8. Mobile controls use pointer events
9. Debug HUD configurable via `config.design.showDebugHud`

### Key Types

```typescript
interface EntityState {
  id: string;
  kind: "player" | "npc" | "loot" | "marker";
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp?: number;
  maxHp?: number;
  name?: string;
}

interface WorldViewState {
  tickId: number;
  localPlayerId: string;
  entities: EntityState[];
}

interface InputFrame {
  tickId: number;
  moveX: number;
  moveY: number;
  primary: boolean;
  skill1: boolean;
}

interface WorldSnapshot {
  serverTick: number;
  receivedAtMs: number;
  entities: EntityState[];
}
```

### Test Commands

```bash
pnpm --filter client-2d build
pnpm --filter client-2d typecheck  # if exists
npx tsc --noEmit --project apps/client-2d/tsconfig.json
npx eslint apps/client-2d/src/net apps/client-2d/src/logic apps/client-2d/src/ui/MobileHud.tsx apps/client-2d/src/ui/DebugHud.tsx apps/client-2d/src/engine/pixiClient.ts apps/client-2d/src/ui/GameBoot.tsx
```

---

## Phase 4: MMORPG Gameplay Layer (Current Implementation)

### Architecture

```
GameBoot.tsx
    |
    +-- game/items.ts         (Item definitions & rarities)
    +-- game/inventory.ts    (Inventory state & operations)
    +-- game/equipment.ts    (Equipment slots)
    +-- game/quests.ts       (Quest state & progress)
    +-- game/skills.ts       (Skill definitions & cooldowns)
    +-- game/gameplayEvents.ts (Event queue)
    +-- game/interactions.ts   (NPC/Loot interaction)
    +-- world/chunkObserver.ts (Chunk streaming)

UI Components: MobileActionBar, InventoryPanel, EquipmentPanel, QuestJournal, InteractionPrompt
```

### New Files (Phase 4)

| File | Purpose |
|------|---------|
| `game/items.ts` | Item definitions, rarities, stack types |
| `game/inventory.ts` | Inventory state, add/remove items |
| `game/equipment.ts` | Equipment slots (weapon/armor/trinket) |
| `game/quests.ts` | Quest state, objectives, tracking |
| `game/skills.ts` | Skill definitions, tick-based cooldowns |
| `game/gameplayEvents.ts` | Event queue for gameplay changes |
| `game/interactions.ts` | Find nearest NPC/Loot target |
| `world/chunkObserver.ts` | Deterministic chunk streaming |
| `ui/MobileActionBar.tsx` | Skill buttons with cooldown display |
| `ui/EquipmentPanel.tsx` | Equipment slot display |
| `ui/QuestJournal.tsx` | Quest list with tracking |
| `ui/InteractionPrompt.tsx` | Contextual interaction prompt |

### Updated Files

| File | Changes |
|------|---------|
| `net/protocol.ts` | Protocol v4: +8 client messages, +8 server messages |
| `net/networkClient.ts` | +7 send methods, +6 event handlers |
| `ui/GameBoot.tsx` | Phase 4 state, logic tick integration |
| `ui/DebugHud.tsx` | +4 gameplay display fields |
| `system/clientVersion.ts` | Phase marker updated to P4 |

### Protocol v4 Message Types

**Client → Server:**
- `loot_pickup_request` - Request loot from entity
- `npc_interact_request` - Request NPC interaction
- `inventory_action` - Inventory operations
- `equipment_action` - Equip/unequip items
- `quest_accept` - Accept a quest
- `quest_track` - Track a quest
- `chunk_observe` - Observe chunk boundaries

**Server → Client:**
- `inventory_snapshot` - Full inventory state
- `equipment_snapshot` - Full equipment state
- `quest_snapshot` - Full quest state
- `loot_pickup_result` - Pickup success/failure
- `npc_dialogue` - NPC dialogue text
- `skill_result` - Skill cast result
- `chunk_snapshot` - Chunk data
- `gameplay_event` - Generic gameplay event

### Deterministic Guarantees (Phase 4)

1. **Gameplay runs through 10Hz logic loop** - All skill cooldowns tick down deterministically
2. **UI does not own game rules** - React components only display state
3. **Renderer does not own game rules** - PIXI only renders WorldViewState
4. **Cooldowns are tick-based** - `tickSkillCooldowns()` called per tick, not setTimeout
5. **Event-driven state changes** - Inventory, equipment, quests via events
6. **Client playable without server** - Local state works offline
7. **Network failures non-fatal** - Handlers use defensive checks
8. **Chunk observe deterministic** - Only emits on chunk boundary change

### Test Commands (Phase 4)

```bash
pnpm --filter client-2d build
npx tsc --noEmit --project apps/client-2d/tsconfig.json
npx eslint apps/client-2d/src/game apps/client-2d/src/world/apps/client-2d/src/ui apps/client-2d/src/net apps/client-2d/src/logic apps/client-2d/src/engine
```
