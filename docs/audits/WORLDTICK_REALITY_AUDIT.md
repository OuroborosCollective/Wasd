# WorldTick Reality Audit

**Date:** 2026-06-07  
**Auditor:** ARELORIA/WASD WorldTick-Reality-Audit-Agent  
**Repository:** OuroborosCollective/Wasd  
**Branch:** `audit/worldtick-reality-map`

---

## 1. Summary

This audit maps the live data flow for the `/2d/` client route and determines whether WorldTick is the active orchestrator or if the 2D client still uses demo/fallback/client-only data layers.

**Key Finding:** WorldTick exists as a real 10Hz server orchestrator, but the `/2d/` client exhibits partial integration with several features falling back to client-side or demo implementations.

---

## 2. Verdict

**Option B: WorldTick runs, but /2d/ uses it only partially.**

WorldTick is properly instantiated in `ServerBootstrap.ts:188` and runs at 10Hz (100ms interval) via `setInterval(() => this.tick(), 100)` in `WorldTick.ts:2157`. However, several `/2d/` client features show incomplete WorldTick integration with hardcoded fallbacks and client-side mutations.

---

## 3. Dataflow Map

### 3.1 Feature Status Table

| Visible Feature | Client Source | Server Entry | WorldTick Involved? | Persistence Involved? | Status |
|----------------|---------------|--------------|---------------------|----------------------|--------|
| boot /2d/ | `apps/client-2d/src/main.tsx` | `ServerBootstrap.ts:232-252` | ✅ REAL_WORLDTICK | ❌ | REAL_SERVER_NOT_WORLDTICK |
| player identity/name | `CyberZenLoginGate.tsx:132` | `identityService.ts` | ❌ CLIENT_ONLY | ❌ | CLIENT_ONLY |
| create character | `networkClient.ts:459` | `characterRouter.ts` | ⚠️ PARTIAL | ⚠️ PARTIAL | SERVER_FALLBACK |
| player movement | `App.tsx:222-225` | `WorldTick.ts:947` | ✅ REAL_WORLDTICK | ❌ | REAL_WORLDTICK |
| inventory display | `InventoryPanel.tsx` | `liveGameplaySnapshot.ts` | ✅ REAL_WORLDTICK | ⚠️ PARTIAL | REAL_WORLDTICK |
| inventory mutation | `dispatchGather()` | `gatheringService.gather()` | ⚠️ PARTIAL | ⚠️ PARTIAL | SERVER_FALLBACK |
| resource gather wood | `ResourceNodeMarkerLayer.tsx:138` | `gatheringService.gather()` | ⚠️ PARTIAL | ⚠️ PARTIAL | SERVER_FALLBACK |
| resource gather ore | `ResourceNodeMarkerLayer.tsx:138` | `gatheringService.gather()` | ⚠️ PARTIAL | ⚠️ PARTIAL | SERVER_FALLBACK |
| resource gather fish | `ResourceNodeMarkerLayer.tsx:138` | `gatheringService.gather()` | ⚠️ PARTIAL | ⚠️ PARTIAL | SERVER_FALLBACK |
| quest progress | `QuestJournalPanel.tsx` | `questEngine.ts` | ⚠️ PARTIAL | ⚠️ PARTIAL | SERVER_FALLBACK |
| NPC render | `DeterministicWorldIsoApp.tsx` | `WorldTick.ts:173-175` | ✅ REAL_WORLDTICK | ❌ | REAL_WORLDTICK |
| NPC interaction/dialogue | `NpcDialoguePanel.tsx` | `NPCSystem.handleInteraction()` | ⚠️ PARTIAL | ❌ | BROKEN |
| chunk/world generation | `ChunkSystem.ts` | `WorldTick.ts:169` | ✅ REAL_WORLDTICK | ❌ | UNKNOWN |
| world chat | `App.tsx:187` | `WorldTick.ts:948` | ✅ REAL_WORLDTICK | ❌ | REAL_WORLDTICK |
| modules panel | `ModuleRegistryPanel.tsx` | `moduleRegistry.ts` | ❌ CLIENT_ONLY | ❌ | CLIENT_ONLY |
| selfheal panel | `SelfHealWorkshopPanel.tsx` | `LiveHealIntegration.ts` | ✅ REAL_WORLDTICK | ❌ | REAL_WORLDTICK |
| ARE panel | `AREHeartbeatPanel.tsx` | `WorldTick.ts:183` | ✅ REAL_WORLDTICK | ❌ | REAL_WORLDTICK |

### 3.2 Legend

- **REAL_WORLDTICK**: Fully server-authoritative via WorldTick at 10Hz
- **REAL_SERVER_NOT_WORLDTICK**: Server-authoritative but not via WorldTick tick loop
- **SERVER_FALLBACK**: Works but with incomplete integration or missing persistence
- **CLIENT_ONLY**: Client-side only, no server involvement
- **HARDCODED**: Hardcoded values, no server data
- **BROKEN**: Feature exists but doesn't work properly
- **UNKNOWN**: Unable to verify
- **PARTIAL**: Partially implemented, needs work

---

## 4. WorldTick Runtime Findings

### 4.1 WorldTick is Properly Instantiated

**File:** `server/src/core/ServerBootstrap.ts`
**Line:** 188

```typescript
const tick = new WorldTick(ws);
```

**Finding:** WorldTick is instantiated with the WebSocket server and stored for use by API routes.

### 4.2 WorldTick.tick() Runs at 10Hz

**File:** `server/src/core/WorldTick.ts`
**Line:** 2157

```typescript
start() { this.timer = setInterval(() => this.tick(), 100); }
```

**Finding:** WorldTick tick loop runs at 100ms intervals (10Hz), matching the architecture spec.

### 4.3 WorldTick Broadcasts Spatial world_snapshot

**File:** `server/src/core/WorldTick.ts`
**Lines:** 612, 1657

```typescript
type: "world_snapshot",
// ...
type: "world_tick",
```

**Finding:** WorldTick broadcasts both `world_snapshot` (per-client spatial) and `world_tick` (global) events.

### 4.4 Client Receives world_tick Events

**File:** `apps/client-2d/src/LiveRealityBridge.tsx`
**Lines:** 81-82

```typescript
client.on("world_tick" as any, (event: any) => ingest(event, "world_tick"));
client.on("WORLD_TICK" as any, (event: any) => ingest(event, "world_tick"));
```

**Finding:** Client listens for `world_tick` and `WORLD_TICK` events.

### 4.5 WorldTick Handles Starter Resource Actions

**File:** `server/src/core/WorldTick.ts`
**Lines:** 2040-2093

```typescript
const starterQueue = this.pendingStarterResourceActions.splice(0, ...);
for (const request of starterQueue) {
  // ...
  gatheringService.gather({...}).then((result) => {
    this.ws.sendToPlayer(request.socketId, {
      type: "RESOURCE_GATHER_RESULT",
      payload: result,
    });
  });
}
```

**Finding:** WorldTick processes pending starter resource actions asynchronously.

---

## 5. Client-only/Fallback Findings

### 5.1 Player Name "Thomas" Default

**File:** `apps/client-2d/src/CyberZenLoginGate.tsx`
**Line:** 132

```typescript
const [name, setName] = useState(() => localStorage.getItem("wasd:2d:name") ?? "Thomas");
```

**Finding:** Client has hardcoded "Thomas" as default name when localStorage is empty. The name entered in the login gate is stored locally but the server may ignore it and use "thomas" internally.

**Severity:** WARNING  
**Impact:** Character names created in `/2d/` may be overridden by server defaults.

**Recommended PR:** #1775 Character Persistence + Name Contract

### 5.2 CyberZenLoginGate Identity Derivation

**File:** `apps/client-2d/src/CyberZenLoginGate.tsx`
**Lines:** 98-121

```typescript
function deriveIdentity(handleRaw: string): GateIdentity {
  const handle = (handleRaw || "architect").trim()...
  // Deterministic identity based on tick phase
  const role = ROLES[hashInt(identityHash, 0, ROLES.length)];
  // ...
}
```

**Finding:** Identity is derived deterministically client-side using tick phase. This is not a bug per se (it's a deterministic gate), but the server may not honor this identity.

**Severity:** INFO  
**Recommended PR:** #1775 Character Persistence + Name Contract

### 5.3 LiveGameplaySnapshot Uses HTTP Fallback

**File:** `apps/client-2d/src/game/liveGameplayStore.ts`
**Lines:** 196-219

```typescript
// HTTP fallback fetch for when WebSocket hasn't delivered data yet.
export async function fetchGameplaySnapshot(
  playerId: string = DEFAULT_GAMEPLAY_PLAYER_ID
): Promise<LiveGameplaySnapshot | null> {
  const response = await fetch(
    `/api/gameplay/snapshot?playerId=${encodedPlayerId}`,
    { cache: "no-store", ... }
  );
  // ...
}
```

**Finding:** Client uses HTTP polling fallback to `/api/gameplay/snapshot` when WebSocket data is not yet available.

**Severity:** INFO (this is a valid fallback pattern)

### 5.4 Starter Resource Node Hardcoding

**File:** `server/src/core/WorldTick.ts`
**Lines:** 951-955

```typescript
else if (actionPayload?.nodeId && ["starter_tree_001", "starter_ore_001", "starter_fish_001"].includes(actionPayload.nodeId)) {
  this.pendingStarterResourceActions.push({ socketId: id, playerId, input: actionPayload });
}
```

**Finding:** Only 3 hardcoded starter resource node IDs are recognized. This limits gathering to the village starter area.

**Severity:** WARNING  
**Impact:** Gathering outside the starter area won't work because the server only recognizes `starter_tree_001`, `starter_ore_001`, `starter_fish_001`.

**Recommended PR:** #1776 Server-authoritative Resource Gather Contract

### 5.5 Gather Dispatch Without Proximity Check

**File:** `apps/client-2d/src/game/gameplayActions.ts`
**Lines:** 29-69

```typescript
export async function dispatchGather(input: {
  playerId?: string;
  nodeId: string;
  currentTick: number;
  playerPosition?: GameplayWorldPosition;
}): Promise<ActionResult> {
  const response = await fetch("/api/resource/gather", {
    method: "POST",
    // playerPosition sent but not validated client-side
  });
  // ...
}
```

**Finding:** `dispatchGather` sends player position but doesn't validate proximity client-side. The server should validate this.

**Severity:** WARNING  
**Recommended PR:** #1776 Server-authoritative Resource Gather Contract

### 5.6 NPC Interaction Works But UI May Not Display

**File:** `server/src/core/WorldTick.ts`
**Lines:** 2129-2131

```typescript
private handleInteract(id: string, player: any, msg: any) {
  const targetId = msg.targetId;
  const npc = this.npcSystem.getNPC(targetId);
  const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
  if (dist < 20) {
    const interaction = this.npcSystem.handleInteraction(targetId, player, ...);
    if (interaction) this.ws.sendToPlayer(id, {
      type: "dialogue",
      source: interaction.source,
      text: interaction.text,
      choices: interaction.choices,
      npcId: interaction.npcId
    });
  }
}
```

**Finding:** Server-side NPC interaction works with 20-tile proximity check and sends dialogue packets. However, the client may not be rendering the dialogue panel correctly.

**Severity:** WARNING  
**Impact:** NPCs may not respond to player interaction on mobile.

**Recommended PR:** #1777 Mobile World Chat + NPC Interaction Hook

### 5.7 World Chat Missing Mobile UI

**File:** `apps/client-2d/src/App.tsx`
**Line:** 187

```typescript
client.on("CHAT_MSG", (e: any) => addChatMsg(e.payload?.ch || "local", e.payload?.from || "?", e.payload?.txt || ""));
```

**Finding:** Chat handler exists but the mobile UI for chat is not visible based on observation. The desktop chat panel exists but mobile uses bottom nav without chat button.

**Severity:** WARNING  
**Impact:** Mobile players cannot access world chat.

**Recommended PR:** #1777 Mobile World Chat + NPC Interaction Hook

---

## 6. Hardcoded Gameplay Findings

### 6.1 Item Names (Production Data, Not Bugs)

**Files:**
- `server/src/resources/StarterResourceNodes.ts:30,43,56`
- `server/src/inventory/InventoryTypes.ts:67,74,81`

```typescript
itemRewardName: "Wood Log",
itemRewardName: "Copper Ore",
itemRewardName: "Raw Fish",
```

**Finding:** These are production item names, not hardcoded demo values. They are correct for the MVP resource gathering system.

**Status:** HARDCODED (intentional MVP scope)

### 6.2 Starter Quest Descriptions (Production Data)

**File:** `server/src/character/StartPathQuestLine.ts:43,63,83`

```typescript
label: "Sammle 3 Wood Logs",
label: "Sammle 3 Copper Ore",
label: "Sammle 3 Raw Fish",
```

**Finding:** Quest objectives reference production items. This is correct for MVP.

**Status:** HARDCODED (intentional MVP scope)

### 6.3 Stitch-Screen Demo Content

**Files:**
- `apps/client-2d/src/ui/stitch-screens/*.tsx`

**Finding:** These files contain hardcoded demo content for UI design previews. They are not used in production rendering.

**Status:** HARDCODED (design preview only, not executed)

---

## 7. Risk Ranking

| Risk | Feature | Impact | Likelihood | Owner |
|------|---------|--------|------------|-------|
| HIGH | Resource gather limited to starter nodes | Players cannot gather resources outside village | HIGH | Server Team |
| HIGH | Character name not persisted | Names reset on reload | HIGH | Backend Team |
| MEDIUM | NPC interaction may not display | NPCs appear but don't respond | MEDIUM | UI Team |
| MEDIUM | Mobile chat UI missing | Mobile players isolated | MEDIUM | UI Team |
| LOW | World chunk generation unknown | May not render world outside village | LOW | Rendering Team |
| LOW | ARE panel debug info exposed | Minor info disclosure | LOW | Dev Team |

---

## 8. Recommended PR Plan

### PR #1775: Character Persistence + Name Contract
**Priority:** HIGH  
**Files:**
- `apps/client-2d/src/CyberZenLoginGate.tsx`
- `server/src/gameplay/identity/identityService.ts`
- `server/src/character/characterRouter.ts`

**Changes:**
1. Remove hardcoded "Thomas" default; use server-provided name
2. Implement character name persistence via Supabase/file
3. Add name validation contract between client and server

---

### PR #1776: Server-authoritative Resource Gather Contract
**Priority:** HIGH  
**Files:**
- `server/src/core/WorldTick.ts`
- `server/src/resources/GatheringService.ts`
- `server/src/modules/resource/forestResourceCheck.ts`

**Changes:**
1. Remove hardcoded `starter_tree_001`, `starter_ore_001`, `starter_fish_001` whitelist
2. Implement dynamic resource node discovery from ChunkSystem
3. Add server-side proximity validation for gather actions
4. Implement tool level requirements for gather success

---

### PR #1777: Mobile World Chat + NPC Interaction Hook
**Priority:** MEDIUM  
**Files:**
- `apps/client-2d/src/App.tsx`
- `apps/client-2d/src/ui/GameplayWindowsLayer.tsx`
- `apps/client-2d/src/ui/NpcDialoguePanel.tsx`

**Changes:**
1. Add chat button to mobile bottom nav
2. Implement mobile chat panel overlay
3. Wire up NPC dialogue panel to receive server dialogue packets
4. Add interaction target highlighting on mobile

---

### PR #1778: World Chunk Generation/Render Flow Guard
**Priority:** LOW  
**Files:**
- `server/src/modules/world/ChunkSystem.ts`
- `apps/client-2d/src/world/ChunkRenderer.ts`

**Changes:**
1. Add logging for chunk generation events
2. Verify client receives and renders chunk data
3. Add debug HUD toggle for chunk visibility

---

### PR #1779: WorldTick Runtime Telemetry Endpoint
**Priority:** LOW  
**Files:**
- `server/src/core/WorldTick.ts`
- `server/src/core/ServerBootstrap.ts`

**Changes:**
1. Add `/api/admin/worldtick-status` endpoint
2. Expose tick count, active players, pending actions queue depth
3. Add to health endpoint

---

## 9. Test Commands

### Run Static Audit
```bash
node scripts/audit-live-worldtick-contract.mjs [--verbose]
```

### Run E2E Tests
```bash
pnpm run test:e2e
```

### Verify WorldTick 10Hz
```bash
# In browser console
setInterval(() => console.log(Date.now()), 100);
// Compare with server world_tick timestamps
```

---

## 10. Appendix: File Locations

### Server Files
| File | Purpose |
|------|---------|
| `server/src/core/WorldTick.ts` | Main game loop orchestrator |
| `server/src/core/ServerBootstrap.ts` | Server startup, WorldTick instantiation |
| `server/src/gameplay/gameplaySession.ts` | makeWorldSnapshot function |
| `server/src/resources/GatheringService.ts` | Resource gathering logic |
| `server/src/routes/gameplaySnapshot.ts` | HTTP snapshot endpoint |
| `server/src/modules/npc/NPCSystem.ts` | NPC state and interaction |

### Client Files
| File | Purpose |
|------|---------|
| `apps/client-2d/src/main.tsx` | Entry point |
| `apps/client-2d/src/App.tsx` | Main game app with WebSocket client |
| `apps/client-2d/src/CyberZenLoginGate.tsx` | Login gate with hardcoded "Thomas" |
| `apps/client-2d/src/game/liveGameplayStore.ts` | Server snapshot store |
| `apps/client-2d/src/game/gameplayActions.ts` | dispatchGather and other actions |
| `apps/client-2d/src/net/networkClient.ts` | WebSocket client |
| `apps/client-2d/src/ui/ResourceNodeMarkerLayer.tsx` | Resource node markers |
| `apps/client-2d/src/ui/NpcDialoguePanel.tsx` | NPC dialogue UI |

---

**Audit Complete**