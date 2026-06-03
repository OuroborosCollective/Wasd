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
---

## Phase 5: Server Gameplay Contract (Current Implementation)

### Architecture

```
GameBoot.tsx
    |
    +-- game/serverContract.ts   (requestId, ServerResultCode, isOkResult)
    +-- game/gameplayReducer.ts  (applyAuthoritativeGameplayEvent)
    +-- game/dialogue.ts         (DialogueState, openDialogue, closeDialogue)
    +-- game/loot.ts             (LootFeedStore)
    +-- game/combat.ts           (CombatLogStore)
    +-- world/chunkSnapshot.ts   (ChunkSnapshotStore)
    +-- net/protocol.ts          (Protocol v5)
    +-- net/networkClient.ts     (requestId tracking)

Server: server/src/gameplay/
    +-- protocol.ts             (ServerEnvelope, serverError)
    +-- gameplaySession.ts       (GameplaySession, applyInputFrame)
    
WorldTick.ts Integration:
    +-- client_hello handler
    +-- guest_login handler
    +-- input_frame handler
    +-- loot_pickup_request handler
    +-- npc_interact_request handler
    +-- chunk_observe handler
    +-- skill_cast handler

UI Components: NpcDialoguePanel, LootFeed, CombatLog
```

### New Files (Phase 5)

**Client Files (9 files):**

| File | Purpose |
|------|---------|
| `game/serverContract.ts` | Request/response contract with requestId, ServerResultCode types |
| `game/gameplayReducer.ts` | Authoritative event reducer for inventory/equipment/quest |
| `game/dialogue.ts` | NPC dialogue state management (DialogueState, openDialogue, closeDialogue) |
| `game/loot.ts` | Loot feed store (createLootFeedStore, LootFeedEntry) |
| `game/combat.ts` | Combat log store (createCombatLogStore, CombatLogEntry) |
| `world/chunkSnapshot.ts` | Chunk snapshot store (createChunkSnapshotStore, ChunkSnapshot) |
| `ui/NpcDialoguePanel.tsx` | NPC dialogue display panel |
| `ui/LootFeed.tsx` | Loot notification feed (left side) |
| `ui/CombatLog.tsx` | Combat log display (right side) |

**Server Files (2 files):**

| File | Purpose |
|------|---------|
| `server/src/gameplay/protocol.ts` | ServerEnvelope, serverError(), safeJsonParse(), getRequestId() |
| `server/src/gameplay/gameplaySession.ts` | GameplaySession, createGameplaySession, makeWelcome, makeWorldSnapshot, applyInputFrame |

**Server Integration (1 file, +372 lines):**

| File | Changes |
|------|---------|
| `server/src/core/WorldTick.ts` | Phase 5 imports, 7 new message handlers |

### Updated Files

| File | Changes |
|------|---------|
| `net/protocol.ts` | Protocol v5, ServerErrorPayload, updated SkillResultPayload, isServerErrorPayload, isChunkSnapshotPayload |
| `net/networkClient.ts` | requestId in all send methods, onServerError, onSkillResult, onChunkSnapshot handlers |
| `ui/GameBoot.tsx` | Phase 5 stores (dialogueState, lootFeedStore, combatLogStore, chunkSnapshotStore), UI components |
| `ui/DebugHud.tsx` | ARELORIA DEBUG [P5], CONTRACT section (dialogueOpen, combatLogCount, chunkSnapshotCount, stateVer) |

### Removed (Dead Code)

| Path | Reason |
|------|--------|
| `apps/server/` | Not built by Dockerfile.vps, removed to prevent confusion |

### Protocol v5 Message Handlers

| Message | Handler | Response |
|---------|---------|----------|
| `client_hello` | Validate protocol v5 | `welcome` |
| `guest_login` | Create session, send snapshot | `welcome` + `world_snapshot` |
| `input_frame` | Process deterministic movement | `world_snapshot` mit `acknowledgedInputSeq` |
| `loot_pickup_request` | Check distance (20 tiles), give loot | `loot_pickup_result` + `inventory_snapshot` |
| `npc_interact_request` | Check distance (20 tiles), get dialogue | `npc_dialogue` |
| `chunk_observe` | Generate tiles | `chunk_snapshot` |
| `skill_cast` | Check cooldown, apply damage | `skill_result` + `combat_result` |

### ServerResultCode Types

```typescript
type ServerResultCode =
  | "ok"
  | "invalid_payload"
  | "not_found"
  | "too_far"
  | "inventory_full"
  | "cooldown"
  | "not_allowed"
  | "server_error";
```

### Authoritative Gameplay Event Types

```typescript
type AuthoritativeGameplayEvent =
  | InventoryEvent    // inventory_set, inventory_add, inventory_remove
  | EquipmentEvent   // equipment_set, equipment_equip, equipment_unequip
  | QuestEvent;       // quest_snapshot, quest_accept, quest_progress, quest_complete, quest_track
```

### Deterministic Guarantees (Phase 5)

1. **Server is authoritative** - Client requests only, server confirms/rejects
2. **Client coordinates not trusted blindly** - Only via `input_frame` with sequenceId
3. **input_frame contains only movement intent** - Server calculates final position
4. **Server updates position deterministically** - Via KappaPosGrid
5. **Loot Pickup checks distance** - 20 tile radius, fails gracefully with `too_far`
6. **NPC Interaction checks distance** - 20 tile radius, fails gracefully
7. **Skill Cast validates cooldown** - Tick-based cooldown, not time-based
8. **Invalid payloads return server_error** - No throws, no crashes
9. **No unseeded random decisions** - All randomness seeded/deterministic

### Docker Build Verification

Dockerfile.vps builds:
- `apps/client-2d/src/` → `@wasd/client-2d` ✅
- `server/src/gameplay/` → `@wasd/server` ✅
- `server/src/core/WorldTick.ts` → `@wasd/server` ✅

### Testing Checklist (Phase 5)

When deployed, verify in client:
- [ ] Debug HUD: network **connected**?
- [ ] **welcome** received (protocolVersion: 5)?
- [ ] **world_snapshot** received with entities?
- [ ] Player moves → **acknowledgedInputSeq** increases?
- [ ] NPC Prompt → **npc_dialogue** received?
- [ ] Loot Prompt → **loot_pickup_result** + **inventory_snapshot**?
- [ ] **chunk_observe** → **chunk_snapshot**?
- [ ] **skill_cast** → **skill_result** + **combat_result**?

### Test Commands (Phase 5)

```bash
pnpm --filter client-2d build
pnpm --filter @wasd/server build
npx tsc --noEmit --project apps/client-2d/tsconfig.json
npx tsc --noEmit --project server/tsconfig.json
npx eslint apps/client-2d/src/game apps/client-2d/src/world apps/client-2d/src/ui apps/client-2d/src/net apps/client-2d/src/logic apps/client-2d/src/engine
```

### Related Files (Phase 5)

**Client:**
- `apps/client-2d/src/game/serverContract.ts` - Request/response contract
- `apps/client-2d/src/game/gameplayReducer.ts` - Event reducer
- `apps/client-2d/src/game/dialogue.ts` - Dialogue state
- `apps/client-2d/src/game/loot.ts` - Loot store
- `apps/client-2d/src/game/combat.ts` - Combat log
- `apps/client-2d/src/world/chunkSnapshot.ts` - Chunk store
- `apps/client-2d/src/ui/NpcDialoguePanel.tsx` - Dialogue UI
- `apps/client-2d/src/ui/LootFeed.tsx` - Loot UI
- `apps/client-2d/src/ui/CombatLog.tsx` - Combat UI

**Server:**
- `server/src/gameplay/protocol.ts` - Server protocol
- `server/src/gameplay/gameplaySession.ts` - Session management
- `server/src/core/WorldTick.ts` - Message handlers

---

**Phase 5 = Areloria is now a real multiplayer MMORPG server.** 🚀

---

## Phase 7: Identity, Auth Binding & Stable Player Ownership (Current Implementation)

### Architecture

```
Client: apps/client-2d/src/
    +-- identity/clientIdentity.ts       (stable guest ID)
    +-- identity/sessionToken.ts        (session persistence)
    +-- identity/characterSelection.ts   (character state)
    +-- ui/IdentityDebugPanel.tsx        (debug UI)
    +-- ui/CharacterSelectPanel.tsx      (character select UI)
    +-- net/protocol.ts                  (Protocol v7)
    +-- net/networkClient.ts             (identity fields)
    +-- ui/GameBoot.tsx                  (identity integration)
    +-- ui/DebugHud.tsx                  (identity display)

Server: server/src/gameplay/identity/
    +-- types.ts                        (identity types)
    +-- identityRepository.ts           (memory storage)
    +-- sessionTokenService.ts          (token management)
    +-- characterService.ts             (character CRUD)
    +-- ownershipService.ts             (ownership checks)
    +-- identityService.ts              (identity resolution)
    
WorldTick.ts Integration:
    +-- client_hello handler (identity resolution)
    +-- guest_login handler (identity fields)
    +-- identity_resume handler
    +-- character_list_request handler
    +-- character_create handler
    +-- character_select handler
```

### New Files (Phase 7)

**Client Files (5 files):**

| File | Purpose |
|------|---------|
| `identity/clientIdentity.ts` | Stable guest ID generation and persistence |
| `identity/sessionToken.ts` | Client-side session token storage |
| `identity/characterSelection.ts` | Selected character persistence |
| `ui/IdentityDebugPanel.tsx` | Debug panel for identity state |
| `ui/CharacterSelectPanel.tsx` | Character selection UI |

**Server Files (5 files):**

| File | Purpose |
|------|---------|
| `gameplay/identity/types.ts` | Identity, Character, SessionToken types |
| `gameplay/identity/identityRepository.ts` | In-memory identity storage |
| `gameplay/identity/sessionTokenService.ts` | Token creation and verification |
| `gameplay/identity/characterService.ts` | Character management |
| `gameplay/identity/identityService.ts` | Main identity resolution service |

### Updated Files

| File | Changes |
|------|---------|
| `net/protocol.ts` | Protocol v7, identity fields, new messages |
| `net/networkClient.ts` | Identity fields, new events/methods |
| `ui/GameBoot.tsx` | Identity state, handlers, UI panels |
| `ui/DebugHud.tsx` | Identity display and debug buttons |
| `system/clientVersion.ts` | Phase 7 constant |
| `gameplay/protocol.ts` | Server protocol v7 |
| `gameplay/gameplaySession.ts` | Identity fields on session |
| `gameplay/persistence/types.ts` | PersistedIdentity, PersistedCharacter |
| `core/WorldTick.ts` | Identity handlers, character management |

### Protocol v7 Messages

**New Client Messages:**
- `identity_resume` - Resume session with session token
- `character_list_request` - Get character list
- `character_select` - Select existing character
- `character_create` - Create new character

**New Server Messages:**
- `identity_resume_result` - Resume confirmation
- `character_list` - List of characters
- `character_select_result` - Selection confirmation
- `character_create_result` - Creation confirmation
- `ownership_error` - Ownership violation

### Deterministic Guarantees (Phase 7)

1. **StableGuestId is NOT a security proof** - Only a recognition hint
2. **Server creates authoritative playerId** - Client cannot choose
3. **Server creates sessionToken** - Client receives, cannot forge
4. **Identity Resolution is server-side** - Only server decides ownership
5. **Reconnect with valid token resumes same player** - Same character state
6. **Duplicate login replaces old session** - No double players in world
7. **Character ownership validated** - Only owned characters selectable
8. **All identity decisions logged/warned server-side** - Audit trail
9. **Fallback to guest if identity fails** - Degrades gracefully

### Key Types

```typescript
// Identity fields in client_hello/guest_login
interface IdentityClientFields {
  stableGuestId?: string;      // Client-generated, server validates
  sessionToken?: string;       // Server-issued, client stores
  accountId?: string;         // For future account binding
  selectedCharacterId?: string; // Last selected character
}

// Welcome with identity info
interface WelcomePayload {
  playerId: string;
  sessionToken?: string;      // New session token for client
  identityId?: string;
  characterId?: string;
  characterName?: string;
  resumed?: boolean;
}

// Character data
interface CharacterSummaryPayload {
  id: string;
  name: string;
  sceneId: string;
  level?: number;
  updatedAtMs?: number;
}
```

### Testing Checklist (Phase 7)

When deployed, verify in client:
- [ ] Debug HUD shows stableGuestId (truncated)
- [ ] Debug HUD shows identity status
- [ ] Debug HUD shows character ID
- [ ] "Characters" button opens character select
- [ ] "Identity" button opens identity debug
- [ ] Page reload preserves stableGuestId
- [ ] Page reload sends sessionToken
- [ ] Server resumes same playerId after reload
- [ ] Character list populated on connect
- [ ] Can create new character
- [ ] Can select existing character

### Test Commands (Phase 7)

```bash
pnpm --filter @wasd/client-2d build
pnpm --filter @wasd/server build
npx tsc --noEmit --project apps/client-2d/tsconfig.json
npx tsc --noEmit --project server/tsconfig.json
```

### Related Files (Phase 7)

**Client:**
- `apps/client-2d/src/identity/` - Identity modules
- `apps/client-2d/src/ui/IdentityDebugPanel.tsx` - Debug UI
- `apps/client-2d/src/ui/CharacterSelectPanel.tsx` - Character UI
- `apps/client-2d/src/net/protocol.ts` - Protocol v7
- `apps/client-2d/src/ui/GameBoot.tsx` - Identity integration

**Server:**
- `server/src/gameplay/identity/` - Server identity services
- `server/src/gameplay/protocol.ts` - Server protocol v7
- `server/src/core/WorldTick.ts` - Identity handlers

---

**Phase 7 = Persistence is now tied to stable identity/character ownership.** 🧠⚔️
