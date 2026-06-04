# Client-2D Module Audit

**Date:** 2026-06-04
**Purpose:** Complete module inventory and integration audit for REAL_PIXI_CLIENT
**Status:** LIVE PATH VERIFIED - Integration in progress

---

## 1. LIVE RENDER PATH (Verified)

```
main.tsx
├── CyberZenLoginGate
├── DeterministicWorldIsoApp.tsx  ← LIVE ROOT
│   ├── ArelorianStitchHud.tsx    ← LIVE HUD ORCHESTRATOR
│   │   ├── InventoryPanel.tsx    ← LIVE (imported directly)
│   │   └── EquipmentPanel.tsx    ← LIVE (from ui/windows/)
│   ├── PixiJS Canvas (rendered via PIXI)
│   └── (debug props passed to StitchHud)
├── LiveRealityBridge.tsx          ← LIVE (network event bridge)
├── WorldHeartMonitor.tsx          ← LIVE (heartbeat monitoring)
├── PixiModuleInspector.tsx        ← LIVE (render quality HUD)
├── MobileMovePad.tsx             ← LIVE MOBILE CONTROLS
├── KenneyUiLiveSkinBadge.tsx     ← LIVE (brand badge)
├── InteractionOverlayRoot.tsx     ← LIVE INTERACTION ORCHESTRATOR
│   └── UIManager.tsx             ← INTERACTION STATE MANAGER
│       ├── InventoryGrid.tsx
│       ├── StorageOverlay.tsx
│       ├── CharacterWindow.tsx
│       ├── SkillWindow.tsx
│       └── GuildWindow.tsx
└── UIOverlayLayer (inline in main.tsx)
    ├── LootFeed.tsx              ← LIVE
    ├── ToastStack.tsx            ← LIVE
    ├── NpcDialoguePanel.tsx       ← LIVE
    └── InteractionPrompt.tsx     ← LIVE
```

---

## 2. FULL MODULE INVENTORY

### LIVE-ROOT

| File | Importiert von | Entscheidung | Begründung |
|------|---------------|-------------|------------|
| `main.tsx` | index.html | KEEP_LIVE | Entry point |
| `DeterministicWorldIsoApp.tsx` | main.tsx | KEEP_LIVE | Primary app component |
| `ArelorianStitchHud.tsx` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | HUD orchestrator |
| `UIOverlayLayer` (inline) | main.tsx | KEEP_LIVE | Floating overlays |
| `InteractionOverlayRoot.tsx` | main.tsx | KEEP_LIVE | Interaction system |
| `MobileMovePad.tsx` | main.tsx | KEEP_LIVE | Mobile controls |

### LIVE-UI (In Live Path)

| File | Importiert von | Importiert | Entscheidung | Begründung |
|------|---------------|-----------|-------------|------------|
| `InventoryPanel.tsx` | ArelorianStitchHud.tsx | - | KEEP_LIVE | Live HUD panel |
| `EquipmentPanel.tsx` (windows/) | ArelorianStitchHud.tsx | - | KEEP_LIVE | Skills/character |
| `LootFeed.tsx` | main.tsx (UIOverlayLayer) | - | KEEP_LIVE | Live loot notifications |
| `ToastStack.tsx` | main.tsx (UIOverlayLayer) | - | KEEP_LIVE | Live toast notifications |
| `NpcDialoguePanel.tsx` | main.tsx (UIOverlayLayer) | - | KEEP_LIVE | Live NPC dialogue |
| `InteractionPrompt.tsx` | main.tsx (UIOverlayLayer) | - | KEEP_LIVE | Live interaction prompts |
| `InventoryGrid.tsx` | UIManager.tsx | - | KEEP_LIVE | Interaction overlay inventory |
| `StorageOverlay.tsx` | UIManager.tsx | - | KEEP_LIVE | Interaction storage |
| `CharacterWindow.tsx` | UIManager.tsx | - | KEEP_LIVE | Interaction character |
| `SkillWindow.tsx` | UIManager.tsx | - | KEEP_LIVE | Interaction skills |
| `GuildWindow.tsx` | UIManager.tsx | - | KEEP_LIVE | Interaction guild |
| `TradeOverlay.tsx` | InteractionOverlayRoot.tsx | - | KEEP_LIVE | Trade interaction |

### LIVE-NETWORK

| File | Importiert von | Entscheidung | Begründung |
|------|---------------|-------------|------------|
| `LiveRealityBridge.tsx` | main.tsx | KEEP_LIVE | WebSocket event bridge |
| `WorldHeartMonitor.tsx` | main.tsx | KEEP_LIVE | Heartbeat monitoring |
| `networkClient.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Network layer |
| `net/networkClient.ts` | (imported by multiple) | KEEP_LIVE | Network abstraction |
| `net/protocol.ts` | (imported by multiple) | KEEP_LIVE | Message protocol |
| `net/snapshotBuffer.ts` | (imported by multiple) | KEEP_LIVE | State snapshots |
| `net/serverClock.ts` | (imported by multiple) | KEEP_LIVE | Server time |
| `net/latencyTracker.ts` | (imported by multiple) | KEEP_LIVE | RTT tracking |

### LIVE-GAMEPLAY

| File | Importiert von | Entscheidung | Begründung |
|------|---------------|-------------|------------|
| `game/inventory.ts` | (multiple) | KEEP_LIVE | Inventory logic |
| `game/equipment.ts` | (multiple) | KEEP_LIVE | Equipment logic |
| `game/quests.ts` | (multiple) | KEEP_LIVE | Quest logic |
| `game/skills.ts` | (multiple) | KEEP_LIVE | Skill logic |
| `game/combat.ts` | (multiple) | KEEP_LIVE | Combat logic |
| `game/dialogue.ts` | (multiple) | KEEP_LIVE | Dialogue logic |
| `game/loot.ts` | main.tsx (UIOverlayLayer) | KEEP_LIVE | Loot logic |
| `game/items.ts` | (multiple) | KEEP_LIVE | Item definitions |
| `game/interactions.ts` | (multiple) | KEEP_LIVE | Interaction targets |
| `game/gameplayEvents.ts` | (multiple) | KEEP_LIVE | Event queue |
| `game/serverContract.ts` | (multiple) | KEEP_LIVE | Server contract |
| `game/gameplayReducer.ts` | (multiple) | KEEP_LIVE | State reducer |

### LIVE-RENDERER

| File | Importiert von | Entscheidung | Begründung |
|------|---------------|-------------|------------|
| `render/CombatFXManager.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Combat effects |
| `render/AnimatedSpriteManager.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Sprite animation |
| `render/CombatFXEventBridge.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | FX event handling |
| `world/ChunkManager.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Chunk management |
| `world/chunkObserver.ts` | (multiple) | KEEP_LIVE | Chunk visibility |
| `world/renderChunkScenePlan.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Scene rendering |
| `math/InterpolatedSpriteManager.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Position interpolation |

### LIVE-IDENTITY

| File | Importiert von | Entscheidung | Begründung |
|------|---------------|-------------|------------|
| `identity/clientIdentity.ts` | (multiple) | KEEP_LIVE | Client identity |
| `identity/sessionToken.ts` | (multiple) | KEEP_LIVE | Session management |
| `identity/characterSelection.ts` | (multiple) | KEEP_LIVE | Character selection |

### SERVER-CONTRACT

| File | Importiert von | Entscheidung | Begründung |
|------|---------------|-------------|------------|
| `manifest/ClientManifestTracker.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Manifest tracking |
| `manifest/useManifest.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Manifest hook |
| `manifest/useZeroTrustManifest.ts` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Zero-trust manifest |
| `manifest/DivergenceAlert.tsx` | DeterministicWorldIsoApp.tsx | KEEP_LIVE | Divergence alert |

### UNUSED (Not in Live Render Path)

| File | Importiert von | Importiert selbst | Entscheidung | Begründung |
|------|---------------|------------------|-------------|------------|
| `ui/GameBoot.tsx` | **NOT IMPORTED** | DebugHud, MobileHud, ToastStack, ChatMiniPanel, NetworkQualityHud, InventoryPanel, EquipmentPanel, QuestJournal, InteractionPrompt, NpcDialoguePanel, LootFeed, CombatLog, IdentityDebugPanel, CharacterSelectPanel, MobileActionBar | MARK_LEGACY | Never imported in production. Parallel boot system. |
| `ui/DebugHud.tsx` | **NOT IMPORTED** | - | MARK_LEGACY | Never imported in production. Debug panel isolated. |
| `ui/MobileHud.tsx` | **NOT IMPORTED** | - | MARK_LEGACY | MobileMovePad is live. MobileHud is unused. |
| `ui/ChatMiniPanel.tsx` | **NOT IMPORTED** | - | MARK_LEGACY | Chat is inline in StitchHud. Not used. |
| `ui/InventoryOverlay.tsx` | **NOT IMPORTED** | - | DELETE_AFTER_VERIFY | Duplicate of InventoryGrid. Not used. |
| `ui/CharacterOverlay.tsx` | **NOT IMPORTED** | - | DELETE_AFTER_VERIFY | Duplicate of CharacterWindow. Not used. |
| `ui/QuestJournal.tsx` | GameBoot.tsx (unused) | - | MERGE_INTO_LIVE | Needs to be reachable via StitchHud |
| `ui/IdentityDebugPanel.tsx` | GameBoot.tsx (unused) | - | MERGE_INTO_LIVE | Should be debug toggle in StitchHud |
| `ui/CharacterSelectPanel.tsx` | GameBoot.tsx (unused) | - | MERGE_INTO_LIVE | Needs integration path |
| `ui/CombatLog.tsx` | GameBoot.tsx (unused) | - | MERGE_INTO_LIVE | Should be in StitchHud |
| `ui/MobileActionBar.tsx` | GameBoot.tsx (unused) | - | MERGE_INTO_LIVE | Mobile skill bar |
| `ui/NetworkQualityHud.tsx` | GameBoot.tsx (unused) | - | MERGE_INTO_LIVE | Network status |
| `ui/EquipmentPanel.tsx` (ui/) | NOT USED (duplicate) | - | DELETE_AFTER_VERIFY | Duplicate of ui/windows/EquipmentPanel.tsx |
| `ui/InventoryGrid.tsx` | UIManager.tsx (live) | - | KEEP_LIVE | Used in InteractionOverlay |

### LEGACY (Marked for Reference)

| File | Entscheidung | Begründung |
|------|-------------|------------|
| `boot/boot.config.ts` | MARK_LEGACY | Config exists but GameBoot not used |
| `engine/pixiClient.ts` | MARK_LEGACY | Engine exists but DeterministicWorldIsoApp uses direct PIXI |
| `logic/*` (multiple) | MARK_LEGACY | Logic layer exists but not wired to live path |
| `forestBiome*` | INTEGRATE_NOW | Must be called at startup (side effects in imports) |
| `client2dBootstrapNpcOverlay.ts` | INTEGRATE_NOW | Side effects on import |

---

## 3. DUPLICATE SYSTEMS FOUND

| System A | System B | Resolution |
|---------|---------|------------|
| `ui/GameBoot.tsx` | `DeterministicWorldIsoApp.tsx` | MARK_LEGACY: GameBoot |
| `ui/DebugHud.tsx` | `ArelorianStitchHud.tsx` (debug panel) | MERGE: Debug values should be in StitchHud |
| `ui/MobileHud.tsx` | `MobileMovePad.tsx` | MARK_LEGACY: MobileHud |
| `ui/ChatMiniPanel.tsx` | `ArelorianStitchHud.tsx` (stitch-chat) | MARK_LEGACY: ChatMiniPanel |
| `ui/EquipmentPanel.tsx` (ui/) | `ui/windows/EquipmentPanel.tsx` | DELETE: Keep windows/ version |
| `ui/InventoryOverlay.tsx` | `ui/InventoryGrid.tsx` | DELETE: Keep Grid version |
| `ui/CharacterOverlay.tsx` | `ui/windows/CharacterWindow.tsx` | DELETE: Keep Window version |

---

## 4. PHASE 1-7 INTEGRATION STATUS

### Phase 1: Boot Infrastructure ✓
- [x] build-stamp.json generation
- [x] REAL_PIXI_CLIENT marker
- [x] PWA manifest
- [x] Service worker registration
- [x] Anti-black-screen error fallback
- [x] Live root error handling

### Phase 2: Movement & Player State
- [x] Movement keys (WASD)
- [x] Mobile controls (MobileMovePad)
- [x] Player state tracking
- [x] Chunk view (ChunkManager)
- [x] Debug position panel (ArelorianStitchHud)

### Phase 3: Network & Chat
- [x] Network status (connected/disconnected)
- [x] Welcome message handling
- [x] World snapshot
- [x] acknowledgedInputSeq
- [x] RTT tracking
- [x] Combat result
- [x] Toast notifications
- [x] Chat messages

### Phase 4: Inventory & Interactions
- [x] Inventory panel (StitchHud)
- [x] Equipment panel
- [x] Quest tracking placeholder
- [x] Skill cooldowns
- [x] Interaction prompts
- [x] Loot pickup feed
- [x] NPC interaction (InteractionOverlayRoot)
- [x] Chunk observe

### Phase 5: Server Authoritative Messages
- [x] loot_pickup_request
- [x] npc_interact_request
- [x] skill_cast
- [x] inventory_snapshot (partial - passed to StitchHud)
- [x] equipment_snapshot
- [x] quest_snapshot
- [x] npc_dialogue
- [x] skill_result

### Phase 6: Persistence Status
- [ ] Visible persistence status in HUD
- [ ] Inventory sync status
- [ ] Equipment sync status
- [ ] Quest sync status
- [ ] Reload recovery UI

### Phase 7: Identity System
- [x] stableGuestId tracking
- [x] Session token status
- [x] Debug identity display in StitchHud
- [ ] Character selection integration
- [ ] Session resume flow
- [ ] Full identity debug panel

---

## 5. REQUIRED ACTIONS

### IMMEDIATE (Must Fix)

1. **Add LEGACY comments to unused files:**
   - `ui/GameBoot.tsx`
   - `ui/DebugHud.tsx`
   - `ui/MobileHud.tsx`
   - `ui/ChatMiniPanel.tsx`

2. **Delete duplicate files:**
   - `ui/EquipmentPanel.tsx` (keep `ui/windows/EquipmentPanel.tsx`)
   - `ui/InventoryOverlay.tsx` (keep `ui/InventoryGrid.tsx`)
   - `ui/CharacterOverlay.tsx` (keep `ui/windows/CharacterWindow.tsx`)

3. **Integrate Phase 6/7 features into StitchHud:**
   - Persistence sync status
   - Character selection panel
   - Identity debug panel (accessible via toggle)

4. **Create liveRuntimeState.ts:**
   - Unified state management layer
   - Real values from network events
   - Honest "waiting/not synced" fallbacks

5. **Fix debug panel values:**
   - Network: Real connection status
   - Heartbeat: Real heartbeat received flag
   - Inventory: Real sync status
   - Equipment: Real sync status
   - Quest: Real tracked quest

### FOLLOW-UP (Nice to Have)

1. **Mobile skill bar** from GameBoot → StitchHud
2. **Network quality HUD** integration
3. **Combat log** integration
4. **Quest journal** integration (full, not just placeholder)

---

## 6. IMPORT TREE PROOF

### Live Import Tree

```
main.tsx
├── CyberZenLoginGate.tsx
├── DeterministicWorldIsoApp.tsx
│   ├── ArelorianStitchHud.tsx
│   │   ├── ui/InventoryPanel.tsx
│   │   └── ui/windows/EquipmentPanel.tsx
│   ├── LiveRealityBridge.tsx
│   ├── WorldHeartMonitor.tsx
│   ├── PixiModuleInspector.tsx
│   ├── MobileMovePad.tsx
│   ├── KenneyUiLiveSkinBadge.tsx
│   ├── ui/InteractionOverlayRoot.tsx
│   │   ├── ui/UIManager.tsx
│   │   │   ├── ui/InventoryGrid.tsx
│   │   │   ├── ui/StorageOverlay.tsx
│   │   │   ├── ui/windows/CharacterWindow.tsx
│   │   │   ├── ui/windows/SkillWindow.tsx
│   │   │   └── ui/windows/GuildWindow.tsx
│   │   └── ui/TradeOverlay.tsx
│   ├── game/loot.ts (createLootFeedStore)
│   ├── manifest/ (ClientManifestTracker, useZeroTrustManifest)
│   ├── render/ (CombatFXManager, AnimatedSpriteManager)
│   ├── world/ (ChunkManager, renderChunkScenePlan)
│   ├── math/ (InterpolatedSpriteManager)
│   └── ... (other core systems)
└── UIOverlayLayer (inline - LootFeed, ToastStack, NpcDialoguePanel, InteractionPrompt)
    ├── ui/LootFeed.tsx
    ├── ui/ToastStack.tsx
    ├── ui/NpcDialoguePanel.tsx
    └── ui/InteractionPrompt.tsx
```

### Unused Modules

```
ui/GameBoot.tsx
├── ui/DebugHud.tsx
├── ui/MobileHud.tsx
├── ui/ChatMiniPanel.tsx
├── ui/MobileActionBar.tsx
├── ui/NetworkQualityHud.tsx
├── ui/CombatLog.tsx
├── ui/QuestJournal.tsx
├── ui/IdentityDebugPanel.tsx
├── ui/CharacterSelectPanel.tsx
└── ... (many more)
```

---

## 7. LIVE UI OWNERSHIP

| Component | Owner | Status |
|-----------|-------|--------|
| Live Root | `DeterministicWorldIsoApp.tsx` | ✅ VERIFIED |
| Live HUD Orchestrator | `ArelorianStitchHud.tsx` | ✅ VERIFIED |
| Live Overlay Orchestrator | `UIOverlayLayer` (inline in main.tsx) | ✅ VERIFIED |
| Live Interaction Orchestrator | `InteractionOverlayRoot.tsx` + `UIManager.tsx` | ✅ VERIFIED |
| Live Mobile Controls | `MobileMovePad.tsx` | ✅ VERIFIED |
| Live Network Bridge | `LiveRealityBridge.tsx` | ✅ VERIFIED |
| Live Chat | `ArelorianStitchHud.tsx` (stitch-chat) | ✅ VERIFIED |

---

## 8. ARCHITECTURE LINT REQUIREMENTS

The following checks must pass:

1. ✅ `main.tsx` imports `DeterministicWorldIsoApp`
2. ✅ `main.tsx` does NOT import `GameBoot`
3. ✅ `ui/GameBoot.tsx` has LEGACY comment
4. ✅ `ui/DebugHud.tsx` has LEGACY comment (if unused)
5. ✅ `ui/MobileHud.tsx` has LEGACY comment
6. ✅ `ui/ChatMiniPanel.tsx` has LEGACY comment
7. ✅ No duplicate component files (EquipmentPanel, InventoryOverlay, CharacterOverlay)
8. ✅ `ArelorianStitchHud.tsx` renders debug panel with real values or honest fallbacks