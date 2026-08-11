/**
 * UI Runtime Manifest
 *
 * Machine-readable classification of all UI components in client-2d.
 * Used for audit, testing, and documentation.
 *
 * Classification rules:
 * - LIVE: Imported in the real render path, visible in the real client, connected to real runtime state
 * - PARTIAL: Imported or visible, but still missing real data, full interaction, or server-backed behavior
 * - UNUSED: File exists but is not imported by the real runtime path
 * - LEGACY: Old implementation kept for reference or compatibility, not the current path
 * - PROTOTYPE: Experimental feature not yet connected to production gameplay
 */

export type UiRuntimeStatus =
  | "LIVE"
  | "PARTIAL"
  | "UNUSED"
  | "LEGACY"
  | "PROTOTYPE";

export interface UiRuntimeManifestEntry {
  id: string;
  path: string;
  status: UiRuntimeStatus;
  realRenderPath: boolean;
  notes: string;
  nextAction?: string;
}

export const uiRuntimeManifest: UiRuntimeManifestEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ROOT ENTRY & GATE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "main-tsx",
    path: "apps/client-2d/src/main.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "React DOM entry point. Mounts all children inside CyberZenLoginGate.",
  },
  {
    id: "cyber-zen-login-gate",
    path: "apps/client-2d/src/CyberZenLoginGate.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Login gate with deterministic character identity. Children render after enter.",
  },
  {
    id: "app-tsx",
    path: "apps/client-2d/src/App.tsx",
    status: "LEGACY",
    realRenderPath: false,
    notes: "Legacy 3D Babylon.js client. Not used in 2D path.",
    nextAction: "Deprecate or remove if 3D client uses separate entry",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD RENDERER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "deterministic-world-iso-app",
    path: "apps/client-2d/src/DeterministicWorldIsoApp.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "PixiJS world renderer. Manages entities, movement, camera, HUD shell.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HUD & OVERLAYS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "arelorian-stitch-hud",
    path: "apps/client-2d/src/ArelorianStitchHud.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Primary visible HUD shell in the live 2D path. Vitals, chat, skills, panels.",
  },
  {
    id: "live-reality-bridge",
    path: "apps/client-2d/src/LiveRealityBridge.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Live reality overlay component.",
  },
  {
    id: "world-heart-monitor",
    path: "apps/client-2d/src/WorldHeartMonitor.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "World heartbeat monitoring overlay.",
  },
  {
    id: "mobile-move-pad",
    path: "apps/client-2d/src/MobileMovePad.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Mobile joystick controls.",
  },
  {
    id: "kenney-ui-live-skin-badge",
    path: "apps/client-2d/src/KenneyUiLiveSkinBadge.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "UI skin badge component.",
  },
  {
    id: "are-heartbeat-panel",
    path: "apps/client-2d/src/AREHeartbeatPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "ARE tick/heartbeat display panel.",
  },
  {
    id: "pixi-module-inspector",
    path: "apps/client-2d/src/PixiModuleInspector.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Pixi module inspector for debugging.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UI OVERLAY LAYER (from main.tsx)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "interaction-overlay-root",
    path: "apps/client-2d/src/ui/InteractionOverlayRoot.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Root for interaction prompts and overlays.",
  },
  {
    id: "dnd-provider",
    path: "apps/client-2d/src/ui/dnd/DnDContext.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Drag and drop context provider for equipment UI.",
  },
  {
    id: "loot-feed",
    path: "apps/client-2d/src/ui/LootFeed.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Loot notification feed in UI overlay layer.",
  },
  {
    id: "toast-stack",
    path: "apps/client-2d/src/ui/ToastStack.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Toast notification stack.",
  },
  {
    id: "npc-dialogue-panel",
    path: "apps/client-2d/src/ui/NpcDialoguePanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "NPC dialogue panel.",
  },
  {
    id: "interaction-prompt",
    path: "apps/client-2d/src/ui/InteractionPrompt.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Interaction prompt component.",
  },
  {
    id: "stitch-asset-gallery-panel",
    path: "apps/client-2d/src/ui/StitchAssetGalleryPanel.tsx",
    status: "PARTIAL",
    realRenderPath: true,
    notes: "Stitch asset gallery. Rendered via 'A' key shortcut.",
    nextAction: "Ensure gallery loads real asset data",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MARKER LAYERS (from DeterministicWorldIsoApp)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "resource-node-marker-layer",
    path: "apps/client-2d/src/ui/ResourceNodeMarkerLayer.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Resource node markers on world. Mounted in UIOverlayLayer (main.tsx); driven by WorldOverlayModel + canonical iso projection.",
  },
  {
    id: "world-poi-marker-layer",
    path: "apps/client-2d/src/ui/WorldPoiMarkerLayer.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "World POI markers on world. Mounted in UIOverlayLayer (main.tsx); driven by WorldOverlayModel + canonical iso projection.",
  },
  {
    id: "camp-npc-marker-layer",
    path: "apps/client-2d/src/ui/CampNpcMarkerLayer.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Camp NPC markers on world. Mounted in UIOverlayLayer (main.tsx); driven by live snapshot + canonical iso projection.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOT & RECOVERY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "boot-surface",
    path: "apps/client-2d/src/ui/BootSurface.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Boot state handling with diagnostic fallback.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HUD PANELS (via ArelorianStitchHud StitchPanel)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "inventory-panel-root",
    path: "apps/client-2d/src/ui/InventoryPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Inventory grid display for gear and items.",
  },
  {
    id: "inventory-panel-snapshot",
    path: "apps/client-2d/src/ui/windows/InventoryPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Server-authoritative inventory from LiveGameplaySnapshot. Shows resources and tools.",
  },
  {
    id: "equipment-panel",
    path: "apps/client-2d/src/ui/windows/EquipmentPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Equipment paperdoll with drag-and-drop slots.",
  },
  {
    id: "quest-journal-panel",
    path: "apps/client-2d/src/ui/windows/QuestJournalPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Quest journal panel from snapshot.",
  },
  {
    id: "quest-preview-panel",
    path: "apps/client-2d/src/ui/windows/QuestPreviewPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Quest preview panel from snapshot.",
  },
  {
    id: "guild-status-panel",
    path: "apps/client-2d/src/ui/windows/GuildStatusPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Guild status panel from snapshot.",
  },
  {
    id: "faction-standing-panel",
    path: "apps/client-2d/src/ui/windows/FactionStandingPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Faction reputation panel from snapshot.",
  },
  {
    id: "map-status-panel",
    path: "apps/client-2d/src/ui/windows/MapStatusPanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Map status panel from snapshot.",
  },
  {
    id: "resource-node-panel",
    path: "apps/client-2d/src/ui/windows/ResourceNodePanel.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Resource node panel from snapshot.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GAMEPLAY WINDOWS LAYER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "gameplay-windows-layer",
    path: "apps/client-2d/src/ui/GameplayWindowsLayer.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Layer that renders registered gameplay windows.",
  },
  {
    id: "gameplay-window-dock",
    path: "apps/client-2d/src/ui/GameplayWindowDock.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Dock for gameplay windows.",
  },
  {
    id: "use-gameplay-panels",
    path: "apps/client-2d/src/ui/useGameplayPanels.ts",
    status: "LIVE",
    realRenderPath: true,
    notes: "Hook for managing open panels.",
  },
  {
    id: "gameplay-panel-registry",
    path: "apps/client-2d/src/ui/GameplayPanelRegistry.ts",
    status: "LIVE",
    realRenderPath: true,
    notes: "Registry of all gameplay panel IDs and metadata.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE GAMEPLAY STATE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "live-gameplay-network-bridge",
    path: "apps/client-2d/src/game/LiveGameplayNetworkBridge.tsx",
    status: "LIVE",
    realRenderPath: true,
    notes: "Bridge that updates LiveGameplayStore from network packets.",
  },
  {
    id: "live-gameplay-snapshot",
    path: "apps/client-2d/src/game/liveGameplaySnapshot.ts",
    status: "LIVE",
    realRenderPath: true,
    notes: "Types and normalizers for server-authoritative snapshots.",
  },
  {
    id: "live-gameplay-store",
    path: "apps/client-2d/src/game/liveGameplayStore.ts",
    status: "LIVE",
    realRenderPath: true,
    notes: "Store for live gameplay snapshot state.",
  },
  {
    id: "use-live-gameplay-snapshot",
    path: "apps/client-2d/src/game/useLiveGameplaySnapshot.ts",
    status: "LIVE",
    realRenderPath: true,
    notes: "Hook to subscribe to live gameplay snapshot.",
  },
  {
    id: "equipment-client",
    path: "apps/client-2d/src/game/equipment.ts",
    status: "LIVE",
    realRenderPath: true,
    notes: "Client-side equipment API (equipGatheringTool, fetchEquipmentState).",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARTIAL COMPONENTS (Imported but need work)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "crafting-window",
    path: "apps/client-2d/src/ui/windows/CraftingWindow.tsx",
    status: "PARTIAL",
    realRenderPath: true,
    notes: "Imported in GameplayWindowsLayer but crafting API may be incomplete.",
    nextAction: "Wire to server crafting API and verify full recipe flow",
  },
  {
    id: "skill-progression-panel",
    path: "apps/client-2d/src/ui/windows/SkillProgressionPanel.tsx",
    status: "PARTIAL",
    realRenderPath: true,
    notes: "Imported in GameplayWindowsLayer but skill data flow may be incomplete.",
    nextAction: "Verify skill data from LiveGameplaySnapshot",
  },
  {
    id: "module-registry-panel",
    path: "apps/client-2d/src/ModuleRegistryPanel.tsx",
    status: "PARTIAL",
    realRenderPath: true,
    notes: "Rendered via 'M' key. Functional but may need real module data.",
    nextAction: "Verify module data is real, not mock",
  },
  {
    id: "self-heal-workshop-panel",
    path: "apps/client-2d/src/SelfHealWorkshopPanel.tsx",
    status: "PARTIAL",
    realRenderPath: true,
    notes: "Rendered via 'S' key. Functional self-heal workshop.",
    nextAction: "Verify self-heal actions are server-validated",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNUSED COMPONENTS (Not in Real Path)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "inventory-grid",
    path: "apps/client-2d/src/ui/InventoryGrid.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or integrate into live path",
  },
  {
    id: "storage-overlay",
    path: "apps/client-2d/src/ui/StorageOverlay.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or integrate into live path",
  },
  {
    id: "trade-overlay",
    path: "apps/client-2d/src/ui/TradeOverlay.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or integrate into live path",
  },
  {
    id: "combat-log",
    path: "apps/client-2d/src/ui/CombatLog.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or integrate into live path",
  },
  {
    id: "network-quality-hud",
    path: "apps/client-2d/src/ui/NetworkQualityHud.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Consider adding to HUD",
  },
  {
    id: "version-overlay",
    path: "apps/client-2d/src/ui/VersionOverlay.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Consider adding to HUD footer",
  },
  {
    id: "boot-overlay",
    path: "apps/client-2d/src/ui/BootOverlay.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. BootSurface handles boot UI.",
    nextAction: "Deprecate in favor of BootSurface",
  },
  {
    id: "identity-debug-panel",
    path: "apps/client-2d/src/ui/IdentityDebugPanel.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or keep for debug builds only",
  },
  {
    id: "mobile-action-bar",
    path: "apps/client-2d/src/ui/MobileActionBar.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. MobileMovePad handles mobile controls.",
    nextAction: "Deprecate or consolidate with MobileMovePad",
  },
  {
    id: "quest-journal-root",
    path: "apps/client-2d/src/ui/QuestJournal.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. QuestJournalPanel in windows/ is used.",
    nextAction: "Deprecate in favor of windows/QuestJournalPanel",
  },
  {
    id: "ui-manager",
    path: "apps/client-2d/src/ui/UIManager.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Review if needed or deprecate",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNUSED WINDOWS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "camp-trade-panel",
    path: "apps/client-2d/src/ui/windows/CampTradePanel.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or wire to camp trading system",
  },
  {
    id: "character-paperdoll-root",
    path: "apps/client-2d/src/ui/windows/CharacterPaperdollRoot.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. Character info shown via EquipmentPanel.",
    nextAction: "Consider integrating into live HUD",
  },
  {
    id: "character-select-panel-window",
    path: "apps/client-2d/src/ui/windows/CharacterSelectPanel.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. CyberZenLoginGate handles character selection.",
    nextAction: "Deprecate or review if multi-character selection is needed",
  },
  {
    id: "character-window",
    path: "apps/client-2d/src/ui/windows/CharacterWindow.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or integrate",
  },
  {
    id: "crafting-panel",
    path: "apps/client-2d/src/ui/windows/CraftingPanel.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. CraftingWindow is used.",
    nextAction: "Deprecate in favor of CraftingWindow",
  },
  {
    id: "gathering-tools-panel",
    path: "apps/client-2d/src/ui/windows/GatheringToolsPanel.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path.",
    nextAction: "Deprecate or integrate into InventoryPanel",
  },
  {
    id: "guild-window",
    path: "apps/client-2d/src/ui/windows/GuildWindow.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. GuildStatusPanel is used.",
    nextAction: "Deprecate in favor of GuildStatusPanel",
  },
  {
    id: "paperdoll-panel",
    path: "apps/client-2d/src/ui/windows/PaperdollPanel.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. EquipmentPanel shows paperdoll.",
    nextAction: "Deprecate or review if separate paperdoll view is needed",
  },
  {
    id: "skill-window",
    path: "apps/client-2d/src/ui/windows/SkillWindow.tsx",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. SkillProgressionPanel is used.",
    nextAction: "Deprecate in favor of SkillProgressionPanel",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "arelorian-hud-legacy",
    path: "apps/client-2d/src/ui/ArelorianHud.ts",
    status: "LEGACY",
    realRenderPath: false,
    notes: "Old HUD implementation for 3D Babylon.js client. Not used in 2D path.",
    nextAction: "Deprecate or remove",
  },
  {
    id: "arelorian-hud-state-mapper",
    path: "apps/client-2d/src/ui/ArelorianHudStateMapper.ts",
    status: "LEGACY",
    realRenderPath: false,
    notes: "Old HUD state mapper. Still used by App.tsx (legacy 3D client).",
    nextAction: "Remove when App.tsx is deprecated",
  },
  {
    id: "arelorian-hud-theme",
    path: "apps/client-2d/src/ui/ArelorianHudTheme.ts",
    status: "LEGACY",
    realRenderPath: false,
    notes: "Old HUD theme. Still used by App.tsx (legacy 3D client).",
    nextAction: "Remove when App.tsx is deprecated",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNUSED DND UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "use-drag-source",
    path: "apps/client-2d/src/ui/dnd/useDragSource.ts",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. DnDContext handles drag source internally.",
    nextAction: "Deprecate or consolidate into DnDContext",
  },
  {
    id: "use-drop-target",
    path: "apps/client-2d/src/ui/dnd/useDropTarget.ts",
    status: "UNUSED",
    realRenderPath: false,
    notes: "Not imported in real render path. DnDContext handles drop target internally.",
    nextAction: "Deprecate or consolidate into DnDContext",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOTYPE STITCH SCREENS (Design Mockups)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "stitch-screen-areloria-project-brief",
    path: "apps/client-2d/src/ui/stitch-screens/ArelorianProjectBrief.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-attributes-matrix",
    path: "apps/client-2d/src/ui/stitch-screens/AttributesMatrix.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-auction-market",
    path: "apps/client-2d/src/ui/stitch-screens/AuctionMarketWindow.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-character-selection",
    path: "apps/client-2d/src/ui/stitch-screens/CharacterSelection.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-crafting-recipe-management",
    path: "apps/client-2d/src/ui/stitch-screens/CraftingInterfaceRecipeManagement.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-dungeon-raid-browser",
    path: "apps/client-2d/src/ui/stitch-screens/DungeonRaidBrowser.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-faction-reputation",
    path: "apps/client-2d/src/ui/stitch-screens/FactionReputation.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-gameplay-hud-collapsible-panels",
    path: "apps/client-2d/src/ui/stitch-screens/GameplayHUDCollapsiblePanels.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-gameplay-hud-quest-tracker",
    path: "apps/client-2d/src/ui/stitch-screens/GameplayHUDQuestTracker.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-gathering-resource-tracking",
    path: "apps/client-2d/src/ui/stitch-screens/GatheringInterfaceResourceTracking.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-guild-panel",
    path: "apps/client-2d/src/ui/stitch-screens/GuildPanel.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-ingame-hud",
    path: "apps/client-2d/src/ui/stitch-screens/IngameHud.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-ingame-hud-new-action-triggers",
    path: "apps/client-2d/src/ui/stitch-screens/IngameHudNewActionTriggers.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-interactive-world-atlas",
    path: "apps/client-2d/src/ui/stitch-screens/InteractiveWorldAtlas.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-interactive-world-map",
    path: "apps/client-2d/src/ui/stitch-screens/InteractiveWorldMap.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-inventory-matrix-30-slot",
    path: "apps/client-2d/src/ui/stitch-screens/InventoryMatrix30Slot.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-inventory-matrix-animated",
    path: "apps/client-2d/src/ui/stitch-screens/InventoryMatrixAnimated.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-level-up-celebration",
    path: "apps/client-2d/src/ui/stitch-screens/LevelUpCelebration.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-login-screen-new-logo",
    path: "apps/client-2d/src/ui/stitch-screens/LoginScreenNewLogo.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-mail-interface",
    path: "apps/client-2d/src/ui/stitch-screens/MailInterfaceCommunications.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-modular-axe-detail",
    path: "apps/client-2d/src/ui/stitch-screens/ModularAxeDetail.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-modular-dagger-detail",
    path: "apps/client-2d/src/ui/stitch-screens/ModularDaggerDetail.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-modular-item-detail-3part",
    path: "apps/client-2d/src/ui/stitch-screens/ModularItemDetail3Part.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-modular-item-detail-view",
    path: "apps/client-2d/src/ui/stitch-screens/ModularItemDetailView.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-modular-spear-detail",
    path: "apps/client-2d/src/ui/stitch-screens/ModularSpearDetail.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-modular-staff-detail",
    path: "apps/client-2d/src/ui/stitch-screens/ModularStaffDetail.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-modular-weapon-detail-3part",
    path: "apps/client-2d/src/ui/stitch-screens/ModularWeaponDetail3Part.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-npc-dialogue-oracle",
    path: "apps/client-2d/src/ui/stitch-screens/NpcDialogueOracleOfTides.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-party-raid-interface",
    path: "apps/client-2d/src/ui/stitch-screens/PartyRaidInterface.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-pet-mount-interface",
    path: "apps/client-2d/src/ui/stitch-screens/PetMountInterface.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-quest-journal",
    path: "apps/client-2d/src/ui/stitch-screens/QuestJournal.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-quest-reward-popup",
    path: "apps/client-2d/src/ui/stitch-screens/QuestRewardPopup.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-refinement-failed",
    path: "apps/client-2d/src/ui/stitch-screens/RefinementFailed.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-refinement-success",
    path: "apps/client-2d/src/ui/stitch-screens/RefinementSuccess.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-settings-menu",
    path: "apps/client-2d/src/ui/stitch-screens/SettingsMenuDiamondGlass.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-skills-matrix",
    path: "apps/client-2d/src/ui/stitch-screens/SkillsMatrix.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-social-hub-friends",
    path: "apps/client-2d/src/ui/stitch-screens/SocialHubFriends.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-support-tutorials-achievements",
    path: "apps/client-2d/src/ui/stitch-screens/SupportTutorialsAchievements.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-teleport-travel-menu",
    path: "apps/client-2d/src/ui/stitch-screens/TeleportTravelMenu.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-trade-window",
    path: "apps/client-2d/src/ui/stitch-screens/TradeWindowPlayerExchange.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-upgrade-crystalline-forge",
    path: "apps/client-2d/src/ui/stitch-screens/UpgradeCrystallineForge.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-upgrade-dark-cyberzen",
    path: "apps/client-2d/src/ui/stitch-screens/UpgradeDarkCyberZen.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-warfront-defeat",
    path: "apps/client-2d/src/ui/stitch-screens/WarfrontDefeat.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-warfront-leaderboard",
    path: "apps/client-2d/src/ui/stitch-screens/WarfrontLeaderboard.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-warfront-rewards",
    path: "apps/client-2d/src/ui/stitch-screens/WarfrontRewards.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-warfront-strategic-map",
    path: "apps/client-2d/src/ui/stitch-screens/WarfrontStrategicMap.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-warfront-victory",
    path: "apps/client-2d/src/ui/stitch-screens/WarfrontVictory.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-weather-electron-storm",
    path: "apps/client-2d/src/ui/stitch-screens/WeatherOverlayElectronStorm.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-weather-rain",
    path: "apps/client-2d/src/ui/stitch-screens/WeatherOverlayRain.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-weather-sandstorm",
    path: "apps/client-2d/src/ui/stitch-screens/WeatherOverlaySandstorm.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-world-atlas-pathfinding",
    path: "apps/client-2d/src/ui/stitch-screens/WorldAtlasPathfinding.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-world-atlas-town-zoom",
    path: "apps/client-2d/src/ui/stitch-screens/WorldAtlasTownZoom.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-world-loading-screen",
    path: "apps/client-2d/src/ui/stitch-screens/WorldLoadingScreen10sTimer.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screen-world-mini-map",
    path: "apps/client-2d/src/ui/stitch-screens/WorldMiniMap.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-screens-index",
    path: "apps/client-2d/src/ui/stitch-screens/index.ts",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Export index for prototype screens.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOTYPE STITCH WINDOWS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "stitch-window-manager",
    path: "apps/client-2d/src/ui/stitch-windows/StitchWindowManager.tsx",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Design prototype. Not connected to production gameplay.",
  },
  {
    id: "stitch-windows-index",
    path: "apps/client-2d/src/ui/stitch-windows/index.ts",
    status: "PROTOTYPE",
    realRenderPath: false,
    notes: "Export index for prototype windows.",
  },
];

/**
 * Get all entries with a specific status.
 */
export function getEntriesByStatus(status: UiRuntimeStatus): UiRuntimeManifestEntry[] {
  return uiRuntimeManifest.filter((entry) => entry.status === status);
}

/**
 * Get all LIVE entries.
 */
export function getLiveEntries(): UiRuntimeManifestEntry[] {
  return getEntriesByStatus("LIVE");
}

/**
 * Get all PARTIAL entries.
 */
export function getPartialEntries(): UiRuntimeManifestEntry[] {
  return getEntriesByStatus("PARTIAL");
}

/**
 * Get all UNUSED entries.
 */
export function getUnusedEntries(): UiRuntimeManifestEntry[] {
  return getEntriesByStatus("UNUSED");
}

/**
 * Get all PROTOTYPE entries.
 */
export function getPrototypeEntries(): UiRuntimeManifestEntry[] {
  return getEntriesByStatus("PROTOTYPE");
}

/**
 * Get all LEGACY entries.
 */
export function getLegacyEntries(): UiRuntimeManifestEntry[] {
  return getEntriesByStatus("LEGACY");
}

/**
 * Get entry by ID.
 */
export function getEntryById(id: string): UiRuntimeManifestEntry | undefined {
  return uiRuntimeManifest.find((entry) => entry.id === id);
}

/**
 * Get count of entries by status.
 */
export function getStatusCounts(): Record<UiRuntimeStatus, number> {
  const counts: Record<UiRuntimeStatus, number> = {
    LIVE: 0,
    PARTIAL: 0,
    UNUSED: 0,
    LEGACY: 0,
    PROTOTYPE: 0,
  };

  for (const entry of uiRuntimeManifest) {
    counts[entry.status]++;
  }

  return counts;
}