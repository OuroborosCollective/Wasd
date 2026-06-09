# Client 2D Live Render Path Audit

> Audit Date: 2026-06-09
> Branch: `audit/client-2d-live-render-path`

## Real Render Entry Path

The real `/2d` render path follows this chain:

```
main.tsx (React entry)
  -> CyberZenLoginGate (login/character gate)
    -> DeterministicWorldIsoApp (world renderer + HUD shell)
      -> ArelorianStitchHud (main HUD with panels)
        -> GameplayWindowsLayer (registered panels via GameplayPanelRegistry)
        -> StitchPanel (HUD shortcut panels)
```

### Key Entry Files

| File | Purpose |
|------|---------|
| `apps/client-2d/src/main.tsx` | React DOM entry, global error handlers, UI overlay layer |
| `apps/client-2d/src/CyberZenLoginGate.tsx` | Login gate with character identity derivation |
| `apps/client-2d/src/DeterministicWorldIsoApp.tsx` | PixiJS world renderer, player movement, entity management |
| `apps/client-2d/src/ArelorianStitchHud.tsx` | Main HUD with vitals, chat, skills, panels, dock |
| `apps/client-2d/src/game/LiveGameplayNetworkBridge.tsx` | Network event handler for live gameplay snapshots |

## Active Root Components

### LIVE Components (Imported in Real Path)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| CyberZenLoginGate | `src/CyberZenLoginGate.tsx` | LIVE | Login gate, character identity |
| DeterministicWorldIsoApp | `src/DeterministicWorldIsoApp.tsx` | LIVE | PixiJS world renderer |
| ArelorianStitchHud | `src/ArelorianStitchHud.tsx` | LIVE | Main HUD shell |
| BootSurface | `src/ui/BootSurface.tsx` | LIVE | Boot state handling |
| LiveRealityBridge | `src/LiveRealityBridge.tsx` | LIVE | Live reality overlay |
| WorldHeartMonitor | `src/WorldHeartMonitor.tsx` | LIVE | World heartbeat monitoring |
| MobileMovePad | `src/MobileMovePad.tsx` | LIVE | Mobile controls |
| KenneyUiLiveSkinBadge | `src/KenneyUiLiveSkinBadge.tsx` | LIVE | UI skin badge |
| InteractionOverlayRoot | `src/ui/InteractionOverlayRoot.tsx` | LIVE | Interaction prompts |
| LootFeed | `src/ui/LootFeed.tsx` | LIVE | Loot notification feed |
| ToastStack | `src/ui/ToastStack.tsx` | LIVE | Toast notifications |
| NpcDialoguePanel | `src/ui/NpcDialoguePanel.tsx` | LIVE | NPC dialogue |
| InteractionPrompt | `src/ui/InteractionPrompt.tsx` | LIVE | Interaction prompts |
| DnDProvider | `src/ui/dnd/DnDContext.tsx` | LIVE | Drag and drop context |
| LiveGameplayNetworkBridge | `src/game/LiveGameplayNetworkBridge.tsx` | LIVE | Network snapshot bridge |

### HUD Panels (LIVE via ArelorianStitchHud)

| Panel | Path | Status | Notes |
|-------|------|--------|-------|
| InventoryPanel (root) | `src/ui/InventoryPanel.tsx` | LIVE | Inventory grid display |
| InventoryPanel (snapshot) | `src/ui/windows/InventoryPanel.tsx` | LIVE | Server snapshot inventory |
| EquipmentPanel | `src/ui/windows/EquipmentPanel.tsx` | LIVE | Equipment slots |
| QuestJournalPanel | `src/ui/windows/QuestJournalPanel.tsx` | LIVE | Quest journal |
| QuestPreviewPanel | `src/ui/windows/QuestPreviewPanel.tsx` | LIVE | Quest preview |
| GuildStatusPanel | `src/ui/windows/GuildStatusPanel.tsx` | LIVE | Guild status |
| FactionStandingPanel | `src/ui/windows/FactionStandingPanel.tsx` | LIVE | Faction reputation |
| MapStatusPanel | `src/ui/windows/MapStatusPanel.tsx` | LIVE | Map status |
| ResourceNodePanel | `src/ui/windows/ResourceNodePanel.tsx` | LIVE | Resource nodes |
| GameplayWindowDock | `src/ui/GameplayWindowDock.tsx` | LIVE | Window dock |
| GameplayWindowsLayer | `src/ui/GameplayWindowsLayer.tsx` | LIVE | Windows layer |
| useGameplayPanels | `src/ui/useGameplayPanels.ts` | LIVE | Panel state hook |

### Marker Layers (LIVE via DeterministicWorldIsoApp)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| ResourceNodeMarkerLayer | `src/ui/ResourceNodeMarkerLayer.tsx` | LIVE | Resource node markers |
| WorldPoiMarkerLayer | `src/ui/WorldPoiMarkerLayer.tsx` | LIVE | POI markers |
| CampNpcMarkerLayer | `src/ui/CampNpcMarkerLayer.tsx` | LIVE | Camp NPC markers |

### ARE Heartbeat (LIVE via ArelorianStitchHud)

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| AREHeartbeatPanel | `src/AREHeartbeatPanel.tsx` | LIVE | ARE tick/heartbeat display |

## UNUSED Components (Not in Real Render Path)

The following components exist but are NOT imported in the real render path:

### Legacy 3D Client

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| App | `src/App.tsx` | UNUSED | Legacy 3D Babylon.js client (separate entry) |

### Prototype Stitch Screens

These are design prototypes stored in `stitch-screens/` - they are NOT rendered:

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| ArelorianProjectBrief | `ui/stitch-screens/ArelorianProjectBrief.tsx` | PROTOTYPE | Design brief screen |
| AttributesMatrix | `ui/stitch-screens/AttributesMatrix.tsx` | PROTOTYPE | Attributes UI prototype |
| AuctionMarketWindow | `ui/stitch-screens/AuctionMarketWindow.tsx` | PROTOTYPE | Auction UI prototype |
| CharacterSelection | `ui/stitch-screens/CharacterSelection.tsx` | PROTOTYPE | Character select prototype |
| CraftingInterfaceRecipeManagement | `ui/stitch-screens/CraftingInterfaceRecipeManagement.tsx` | PROTOTYPE | Crafting prototype |
| DungeonRaidBrowser | `ui/stitch-screens/DungeonRaidBrowser.tsx` | PROTOTYPE | Dungeon browser prototype |
| FactionReputation | `ui/stitch-screens/FactionReputation.tsx` | PROTOTYPE | Faction UI prototype |
| GameplayHUDCollapsiblePanels | `ui/stitch-screens/GameplayHUDCollapsiblePanels.tsx` | PROTOTYPE | HUD prototype |
| GameplayHUDQuestTracker | `ui/stitch-screens/GameplayHUDQuestTracker.tsx` | PROTOTYPE | Quest tracker prototype |
| GatheringInterfaceResourceTracking | `ui/stitch-screens/GatheringInterfaceResourceTracking.tsx` | PROTOTYPE | Gathering prototype |
| GuildPanel | `ui/stitch-screens/GuildPanel.tsx` | PROTOTYPE | Guild UI prototype |
| IngameHud | `ui/stitch-screens/IngameHud.tsx` | PROTOTYPE | HUD prototype |
| IngameHudNewActionTriggers | `ui/stitch-screens/IngameHudNewActionTriggers.tsx` | PROTOTYPE | HUD prototype |
| InteractiveWorldAtlas | `ui/stitch-screens/InteractiveWorldAtlas.tsx` | PROTOTYPE | Atlas prototype |
| InteractiveWorldMap | `ui/stitch-screens/InteractiveWorldMap.tsx` | PROTOTYPE | Map prototype |
| InventoryMatrix30Slot | `ui/stitch-screens/InventoryMatrix30Slot.tsx` | PROTOTYPE | Inventory prototype |
| InventoryMatrixAnimated | `ui/stitch-screens/InventoryMatrixAnimated.tsx` | PROTOTYPE | Inventory prototype |
| LevelUpCelebration | `ui/stitch-screens/LevelUpCelebration.tsx` | PROTOTYPE | Celebration prototype |
| LoginScreenNewLogo | `ui/stitch-screens/LoginScreenNewLogo.tsx` | PROTOTYPE | Login prototype |
| MailInterfaceCommunications | `ui/stitch-screens/MailInterfaceCommunications.tsx` | PROTOTYPE | Mail prototype |
| ModularAxeDetail | `ui/stitch-screens/ModularAxeDetail.tsx` | PROTOTYPE | Item detail prototype |
| ModularDaggerDetail | `ui/stitch-screens/ModularDaggerDetail.tsx` | PROTOTYPE | Item detail prototype |
| ModularItemDetail3Part | `ui/stitch-screens/ModularItemDetail3Part.tsx` | PROTOTYPE | Item detail prototype |
| ModularItemDetailView | `ui/stitch-screens/ModularItemDetailView.tsx` | PROTOTYPE | Item detail prototype |
| ModularSpearDetail | `ui/stitch-screens/ModularSpearDetail.tsx` | PROTOTYPE | Item detail prototype |
| ModularStaffDetail | `ui/stitch-screens/ModularStaffDetail.tsx` | PROTOTYPE | Item detail prototype |
| ModularWeaponDetail3Part | `ui/stitch-screens/ModularWeaponDetail3Part.tsx` | PROTOTYPE | Item detail prototype |
| NpcDialogueOracleOfTides | `ui/stitch-screens/NpcDialogueOracleOfTides.tsx` | PROTOTYPE | Dialogue prototype |
| PartyRaidInterface | `ui/stitch-screens/PartyRaidInterface.tsx` | PROTOTYPE | Party prototype |
| PetMountInterface | `ui/stitch-screens/PetMountInterface.tsx` | PROTOTYPE | Pet prototype |
| QuestJournal | `ui/stitch-screens/QuestJournal.tsx` | PROTOTYPE | Quest prototype |
| QuestRewardPopup | `ui/stitch-screens/QuestRewardPopup.tsx` | PROTOTYPE | Quest reward prototype |
| RefinementFailed | `ui/stitch-screens/RefinementFailed.tsx` | PROTOTYPE | Refinement prototype |
| RefinementSuccess | `ui/stitch-screens/RefinementSuccess.tsx` | PROTOTYPE | Refinement prototype |
| SettingsMenuDiamondGlass | `ui/stitch-screens/SettingsMenuDiamondGlass.tsx` | PROTOTYPE | Settings prototype |
| SkillsMatrix | `ui/stitch-screens/SkillsMatrix.tsx` | PROTOTYPE | Skills prototype |
| SocialHubFriends | `ui/stitch-screens/SocialHubFriends.tsx` | PROTOTYPE | Social prototype |
| SupportTutorialsAchievements | `ui/stitch-screens/SupportTutorialsAchievements.tsx` | PROTOTYPE | Support prototype |
| TeleportTravelMenu | `ui/stitch-screens/TeleportTravelMenu.tsx` | PROTOTYPE | Teleport prototype |
| TradeWindowPlayerExchange | `ui/stitch-screens/TradeWindowPlayerExchange.tsx` | PROTOTYPE | Trade prototype |
| UpgradeCrystallineForge | `ui/stitch-screens/UpgradeCrystallineForge.tsx` | PROTOTYPE | Upgrade prototype |
| UpgradeDarkCyberZen | `ui/stitch-screens/UpgradeDarkCyberZen.tsx` | PROTOTYPE | Upgrade prototype |
| WarfrontDefeat | `ui/stitch-screens/WarfrontDefeat.tsx` | PROTOTYPE | Warfront prototype |
| WarfrontLeaderboard | `ui/stitch-screens/WarfrontLeaderboard.tsx` | PROTOTYPE | Warfront prototype |
| WarfrontRewards | `ui/stitch-screens/WarfrontRewards.tsx` | PROTOTYPE | Warfront prototype |
| WarfrontStrategicMap | `ui/stitch-screens/WarfrontStrategicMap.tsx` | PROTOTYPE | Warfront prototype |
| WarfrontVictory | `ui/stitch-screens/WarfrontVictory.tsx` | PROTOTYPE | Warfront prototype |
| WeatherOverlayElectronStorm | `ui/stitch-screens/WeatherOverlayElectronStorm.tsx` | PROTOTYPE | Weather prototype |
| WeatherOverlayRain | `ui/stitch-screens/WeatherOverlayRain.tsx` | PROTOTYPE | Weather prototype |
| WeatherOverlaySandstorm | `ui/stitch-screens/WeatherOverlaySandstorm.tsx` | PROTOTYPE | Weather prototype |
| WorldAtlasPathfinding | `ui/stitch-screens/WorldAtlasPathfinding.tsx` | PROTOTYPE | Atlas prototype |
| WorldAtlasTownZoom | `ui/stitch-screens/WorldAtlasTownZoom.tsx` | PROTOTYPE | Atlas prototype |
| WorldLoadingScreen10sTimer | `ui/stitch-screens/WorldLoadingScreen10sTimer.tsx` | PROTOTYPE | Loading prototype |
| WorldMiniMap | `ui/stitch-screens/WorldMiniMap.tsx` | PROTOTYPE | Minimap prototype |
| index | `ui/stitch-screens/index.ts` | PROTOTYPE | Export index |

### Prototype Stitch Windows

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| StitchWindowManager | `ui/stitch-windows/StitchWindowManager.tsx` | PROTOTYPE | Window manager prototype |
| index | `ui/stitch-windows/index.ts` | PROTOTYPE | Export index |

### Other Unused UI Components

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| InventoryGrid | `ui/InventoryGrid.tsx` | UNUSED | Not imported in real path |
| StorageOverlay | `ui/StorageOverlay.tsx` | UNUSED | Not imported in real path |
| TradeOverlay | `ui/TradeOverlay.tsx` | UNUSED | Not imported in real path |
| CombatLog | `ui/CombatLog.tsx` | UNUSED | Not imported in real path |
| NetworkQualityHud | `ui/NetworkQualityHud.tsx` | UNUSED | Not imported in real path |
| VersionOverlay | `src/ui/VersionOverlay.tsx` | UNUSED | Not imported in real path |
| BootOverlay | `ui/BootOverlay.tsx` | UNUSED | Not imported in real path |
| IdentityDebugPanel | `ui/IdentityDebugPanel.tsx` | UNUSED | Not imported in real path |
| MobileActionBar | `ui/MobileActionBar.tsx` | UNUSED | Not imported in real path |
| QuestJournal | `ui/QuestJournal.tsx` | UNUSED | Not imported in real path |
| UIManager | `ui/UIManager.tsx` | UNUSED | Not imported in real path |

### Unused Windows

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| CampTradePanel | `ui/windows/CampTradePanel.tsx` | UNUSED | Not imported in real path |
| CharacterPaperdollRoot | `ui/windows/CharacterPaperdollRoot.tsx` | UNUSED | Not imported in real path |
| CharacterSelectPanel | `ui/windows/CharacterSelectPanel.tsx` | UNUSED | Not imported in real path |
| CharacterWindow | `ui/windows/CharacterWindow.tsx` | UNUSED | Not imported in real path |
| CraftingPanel | `ui/windows/CraftingPanel.tsx` | UNUSED | Not imported in real path |
| CraftingWindow | `ui/windows/CraftingWindow.tsx` | PARTIAL | Imported but not fully wired |
| GatheringToolsPanel | `ui/windows/GatheringToolsPanel.tsx` | UNUSED | Not imported in real path |
| GuildWindow | `ui/windows/GuildWindow.tsx` | UNUSED | Not imported in real path |
| PaperdollPanel | `ui/windows/PaperdollPanel.tsx` | UNUSED | Not imported in real path |
| SkillProgressionPanel | `ui/windows/SkillProgressionPanel.tsx` | PARTIAL | Imported in GameplayWindowsLayer |
| SkillWindow | `ui/windows/SkillWindow.tsx` | UNUSED | Not imported in real path |

### Unused Utilities

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| ArelorianHud | `ui/ArelorianHud.ts` | LEGACY | Old HUD implementation (3D client) |
| ArelorianHudStateMapper | `ui/ArelorianHudStateMapper.ts` | LEGACY | Old HUD state mapper |
| ArelorianHudTheme | `ui/ArelorianHudTheme.ts` | LEGACY | Old HUD theme |
| useDragSource | `ui/dnd/useDragSource.ts` | UNUSED | Not imported in real path |
| useDropTarget | `ui/dnd/useDropTarget.ts` | UNUSED | Not imported in real path |
| ModuleRegistryPanel | `src/ModuleRegistryPanel.tsx` | PARTIAL | Rendered via GameplayWindowsLayer |
| SelfHealWorkshopPanel | `src/SelfHealWorkshopPanel.tsx` | PARTIAL | Rendered via GameplayWindowsLayer |
| StitchAssetGalleryPanel | `src/ui/StitchAssetGalleryPanel.tsx` | PARTIAL | Rendered via UIOverlayLayer |

## Classification Summary

| Status | Count |
|--------|-------|
| LIVE | 25 |
| PARTIAL | 4 |
| UNUSED | 63 |
| PROTOTYPE | 52 |
| LEGACY | 3 |

## Next Actions

### Priority 1 (Live but PARTIAL)

1. **CraftingWindow** - Imported in GameplayWindowsLayer but may not be fully wired to server
   - Action: Wire to server crafting API

2. **SkillProgressionPanel** - Imported but data flow may be incomplete
   - Action: Verify skill data from LiveGameplaySnapshot

3. **ModuleRegistryPanel** - Rendered via keyboard shortcut 'M'
   - Action: Already functional

4. **SelfHealWorkshopPanel** - Rendered via keyboard shortcut 'S'
   - Action: Already functional

5. **StitchAssetGalleryPanel** - Rendered via keyboard shortcut 'A'
   - Action: Already functional

### Priority 2 (Not in Render Path but Important)

1. **CharacterPaperdollRoot** - Character/paperdoll UI not in live path
   - Action: Integrate into live HUD or GameplayWindowsLayer

2. **PaperdollPanel** - Paperdoll view not in live path
   - Action: Connect to server-backed paperdoll snapshot

3. **InventoryGrid** - Alternative inventory view
   - Action: Consider if needed or deprecate

### Priority 3 (Prototype Cleanup)

1. All `stitch-screens/` and `stitch-windows/` are PROTOTYPE
   - Action: Keep for design reference, do not wire to production

## Key Rules

1. **A component is LIVE only if imported in the real render path**
2. **A component is PARTIAL if imported but missing real data or server backing**
3. **A component is UNUSED if not imported anywhere in the real path**
4. **A component is PROTOTYPE if it's a design mockup not connected to production**
5. **A component is LEGACY if it's an old implementation kept for compatibility**

## Verification

Run the manifest test to verify all entries have valid status:

```bash
pnpm --filter @wasd/client-2d test -- --run uiRuntimeManifest
```

## Machine-Readable Manifest

The `uiRuntimeManifest.ts` file provides a machine-readable version of this audit.

See: `apps/client-2d/src/ui/uiRuntimeManifest.ts`

## Update (2026-06-09): NPC Dialogue Panel Cyber-Zen Update

The `NpcDialoguePanel` component has been updated with full Cyber-Zen styling:

### Component Status

| Component | Path | Status | Notes |
|-----------|------|--------|-------|
| NpcDialoguePanel | `src/ui/windows/NpcDialoguePanel.tsx` | LIVE | Cyber-Zen styled, NPC memory/reputation |

### Cyber-Zen Features Added

1. **NPC Memory Block** - Shows NPC identity, trust tier badge, reputation value, and deterministic memory note
2. **Trust Tier Badges** - Visual states for hostile/cold/neutral/trusted/honored based on reputation
3. **Dialogue State Indicator** - Shows current dialogue state in monospace format
4. **Quest Tracker** - Cyber-Zen styled with emerald checkmarks for completed objectives
5. **Action Buttons** - Accept (cyan), Complete (green), Talk (gold) styled consistently

### Test IDs Added

| Test ID | Element |
|---------|---------|
| `npc-memory-village_trader_001` | NPC memory block |
| `npc-trust-tier-village_trader_001` | Trust tier badge |
| `npc-reputation-village_trader_001` | Reputation value |
| `npc-memory-note-village_trader_001` | Memory/lore text |
| `npc-dialogue-memory-state-village_trader_001` | Dialogue state indicator |

### CSS Classes

New Cyber-Zen classes in `theme.css`:

| Class | Purpose |
|-------|---------|
| `.cz-npc-panel` | Main NPC dialogue panel |
| `.cz-npc-memory` | NPC memory block |
| `.cz-trust-badge` | Trust tier badge |
| `.trust-tier--honored` | Honored tier (violet) |
| `.trust-tier--trusted` | Trusted tier (green) |
| `.trust-tier--neutral` | Neutral tier (cyan) |
| `.trust-tier--cold` | Cold tier (grey-blue) |
| `.trust-tier--hostile` | Hostile tier (ruby) |
| `.cz-npc-rep-value` | Reputation number display |
| `.cz-npc-memory-note` | Deterministic memory text |
| `.cz-action-btn` | Action buttons |

### Visual Design Source

Cyber-Zen design vocabulary from `theme.css`:

```css
--cz-bg: #05060b
--cz-panel: rgba(13, 17, 28, 0.86)
--cz-cyan / --st-aether: #00e5ff
--cz-green / --st-emerald: #39ff14
--cz-gold / --st-gold: #ffd76a
--st-ruby: #ff3f6f
--st-violet: #8b5cf6
```

### Data Source

All NPC memory/reputation values come from `LiveGameplaySnapshot`:

- `snapshot.npcDialogues[]` - NPC dialogue state and line
- `snapshot.npcReputations[]` - NPC reputation and completed quests
- `snapshot.activeQuests[]` - Active quest with objectives
- `snapshot.availableQuests[]` - Available quests
- `snapshot.completedQuestIds[]` - Completed quest IDs