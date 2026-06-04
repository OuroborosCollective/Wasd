# Live Render Path - REAL_PIXI_CLIENT

> **PFLICHT**: Keine Datei gilt als Feature, nur weil sie existiert.
> Sie gilt erst als Feature, wenn sie live gerendert wird.

## Official Live Render Path

```
main.tsx
├── DeterministicWorldIsoApp.tsx
│   └── ArelorianStitchHud.tsx          ← LIVE HUD ORCHESTRATOR
│       ├── stitch-chat (inline chat)
│       ├── stitch-skillbar
│       ├── stitch-side-menu (panels)
│       └── stitch-debug (live state)
├── LiveRealityBridge.tsx               ← LIVE REALITY OVERLAY
├── WorldHeartMonitor.tsx               ← WORLD HEARTBEAT OVERLAY
├── PixiModuleInspector.tsx             ← PIXI DEBUG
├── MobileMovePad.tsx                   ← LIVE MOBILE CONTROL SYSTEM
├── KenneyUiLiveSkinBadge.tsx           ← SKIN BADGE
├── InteractionOverlayRoot.tsx          ← LIVE INTERACTION ORCHESTRATOR
│   └── UIManager.tsx                   ← UIManager is LIVE (not legacy)
│       ├── TRADE overlay
│       ├── CRAFT overlay
│       └── DIALOGUE overlay
└── UIOverlayLayer.tsx                  ← LIVE OVERLAY COMPONENTS
    ├── LootFeed.tsx                    ← LIVE LOOT FEED
    ├── ToastStack.tsx                  ← LIVE TOAST NOTIFICATIONS
    ├── NpcDialoguePanel.tsx            ← LIVE NPC DIALOGUE
    └── InteractionPrompt.tsx           ← LIVE INTERACTION PROMPT
```

## Official Live UI Components

| Component | Status | Path |
|-----------|--------|------|
| ArelorianStitchHud | LIVE | DeterministicWorldIsoApp.tsx |
| InteractionOverlayRoot | LIVE | main.tsx |
| UIManager | LIVE | InteractionOverlayRoot.tsx |
| MobileMovePad | LIVE | main.tsx |
| LootFeed | LIVE | UIOverlayLayer.tsx |
| ToastStack | LIVE | UIOverlayLayer.tsx |
| NpcDialoguePanel | LIVE | UIOverlayLayer.tsx |
| InteractionPrompt | LIVE | UIOverlayLayer.tsx |
| InventoryPanel | LIVE | ArelorianStitchHud.tsx (StitchPanel) |
| EquipmentPanel | LIVE | ArelorianStitchHud.tsx (StitchPanel) |

## Legacy/Unused Components

| Component | Status | Reason |
|-----------|--------|--------|
| GameBoot.tsx | LEGACY | NOT IMPORTED in production |
| DebugHud.tsx | LEGACY | NOT IMPORTED (StitchHud has debug panel) |
| ChatMiniPanel.tsx | LEGACY | NOT IMPORTED (ArelorianStitchHud has inline chat) |
| MobileHud.tsx | LEGACY | NOT IMPORTED |
| UIManager (inventory/character windows) | PARTIAL | Only TRADE/CRAFT/DIALOGUE are live; inventory/character via StitchPanel |

## UI System Architecture

### Decision: No Parallel UI Ambiguity

There are two UI systems, but they serve different purposes:

1. **ArelorianStitchHud** (LIVE)
   - HUD orchestrator
   - Skill bar, chat, side menu, debug panel
   - Opens panels: inventory, character, combat, map, guild, factions, quests
   - EquipmentPanel integration via StitchPanel

2. **InteractionOverlayRoot + UIManager** (LIVE)
   - Interaction orchestrator
   - TRADE, CRAFT, DIALOGUE overlays
   - Opened by server events (INTERACTION_ACCEPTED)

### Chat System

- **Official Live Chat**: Inline chat in `ArelorianStitchHud.tsx` (className="stitch-chat")
- **Legacy**: `ChatMiniPanel.tsx` - NOT IMPORTED

### Mobile System

- **Official Live Mobile Controls**: `MobileMovePad.tsx` - rendered in main.tsx
- **Legacy**: `MobileHud.tsx` - NOT IMPORTED

## Debug Panel (Live State)

Located in `ArelorianStitchHud.tsx` (className="stitch-debug"):

| Field | Live Values |
|-------|-------------|
| Heartbeat | OK / waiting |
| Initialized | YES / waiting |
| Player Pos | `{x}, {z}` / waiting |
| Chunk Coords | `{chunkX}, {chunkZ}` / waiting |
| Visible Chunks | number / waiting |
| Network | connected / disconnected / waiting |
| Server Tick | number / waiting |
| Ack Seq | number / waiting |
| Identity | `{id.slice(0,8)}...` / waiting |
| Character | `{characterId}` / waiting |

## Adding Features to Live Path

When adding a new component:
1. Import it in the appropriate live path location
2. Document the import path in this file
3. Ensure it receives real server events, not mock data

## Build Verification

```bash
pnpm --filter @wasd/client-2d build
```

The dist must include all live path components.

---

Last verified: 2026-06-04 (PR #1656 completion)