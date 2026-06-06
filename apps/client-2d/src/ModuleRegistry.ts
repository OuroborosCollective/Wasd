/**
 * ARELORIA GLOBAL MODULE REGISTRY
 * 
 * Maschinenlesbare Registry aller Systeme im Areloria-Ökosystem.
 * Sortiert alphabetisch nach id.
 * 
 * Regeln:
 * - Kein Date.now() für Logik.
 * - Kein Math.random() für Entscheidungen.
 * - Preview-Panels als "preview" markieren, nicht als "active".
 * - 3D als "future" oder "partial" markieren, nicht als primär.
 */

export type RuntimeSurface =
  | "client-2d"
  | "client-3d"
  | "server"
  | "portal"
  | "engine"
  | "shared"
  | "tooling";

export type ModuleStatus =
  | "active"
  | "partial"
  | "preview"
  | "missing"
  | "legacy"
  | "future";

export interface AreloriaModuleRegistryEntry {
  id: string;
  title: string;
  runtimeSurface: RuntimeSurface;
  status: ModuleStatus;
  deterministic: boolean;
  serverAuthoritative: boolean;
  visibleInClient: boolean;
  hasE2ETest: boolean;
  entrypoints: string[];
  notes: string;
}

/**
 * Globale Module Registry - alphabetisch sortiert nach id
 */
export const ARELORIA_MODULE_REGISTRY: readonly AreloriaModuleRegistryEntry[] = [
  {
    id: "are-heartbeat",
    title: "ARE Heartbeat Panel",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/api/are/heartbeat"],
    notes: "LIVE: AREHeartbeatPanel.tsx verbindet mit /api/are/heartbeat. Zeigt tickId, kappa=1000, observerCount, replayHash mit LIVE-Status.",
  },
  {
    id: "character-paperdoll",
    title: "Character Profile + Paperdoll",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [
      "/api/character/profile",
      "/api/character/create",
      "/api/gameplay/snapshot",
      "server/src/character/CharacterService.ts",
      "server/src/character/PaperdollTypes.ts",
      "apps/client-2d/src/ui/windows/PaperdollPanel.tsx",
      "apps/client-2d/src/ui/windows/CharacterSelectPanel.tsx",
    ],
    notes:
      "Persistent one-character profile and paperdoll snapshot for equipped gathering tools. MVP only; no roster, appearance editor, armor, combat weapons or drag/drop yet.",
  },
  {
    id: "client-2d",
    title: "2D Client (PixiJS + React)",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/2d/", "/2d/build-stamp.json"],
    notes: "REAL_PIXI_CLIENT - primärer Spiel-Client",
  },
  {
    id: "client-3d",
    title: "3D Client (Babylon.js)",
    runtimeSurface: "client-3d",
    status: "future",
    deterministic: false,
    serverAuthoritative: true,
    visibleInClient: false,
    hasE2ETest: false,
    entrypoints: ["/3d/"],
    notes: "Separater Pfad - nicht Hauptclient. 3D kommt später.",
  },
  {
    id: "crafting-system",
    title: "Crafting System",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [
      "/api/crafting/recipes",
      "/api/crafting/craft",
      "/api/gameplay/snapshot",
      "server/src/crafting/CraftingService.ts",
      "server/src/crafting/StarterRecipes.ts",
      "apps/client-2d/src/ui/windows/CraftingWindow.tsx",
    ],
    notes:
      "Deterministic starter recipe system consuming persistent inventory resources and granting crafting XP. MVP recipes only; crafting stations, tools, queueing, failure chances, economy and equipment outputs pending.",
  },
  {
    id: "deterministic-world-iso-app",
    title: "DeterministicWorldIsoApp",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "Haupt-App im 2D-Client mit PixiJS-Renderer",
  },
  {
    id: "equipment",
    title: "Equipment: Gathering Tools",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [
      "/api/equipment/state",
      "/api/equipment/equip",
      "/api/gameplay/snapshot",
      "server/src/equipment/EquipmentTypes.ts",
      "server/src/equipment/EquipmentStore.ts",
      "server/src/equipment/EquipmentService.ts",
      "server/src/equipment/EquipmentBonus.ts",
      "server/src/resources/GatheringService.ts",
      "apps/client-2d/src/ui/windows/InventoryPanel.tsx",
    ],
    notes:
      "Basic crafted gathering tools can be equipped from persistent inventory and affect gathering bonuses. Starter tools only (wooden_axe, copper_pickaxe, simple_fishing_rod); no durability, paperdoll, combat equipment or trading yet.",
  },
  {
    id: "faction-panel",
    title: "Faction Panel",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [],
    notes: "PARTIAL: FactionStandingPanel.tsx zeigt LiveGameplaySnapshot-Daten. Faction-System noch nicht vollständig mit Server verbunden. E2E beweist, dass Fake-Preview-Texte entfernt sind.",
  },
  {
    id: "guild-panel",
    title: "Guild Panel",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [],
    notes: "PARTIAL: GuildStatusPanel.tsx zeigt LiveGameplaySnapshot-Daten. Guild-System noch nicht vollständig mit Server verbunden. E2E beweist, dass Fake-Preview-Texte entfernt sind.",
  },
  {
    id: "inventory-persistence",
    title: "Inventory Persistence",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [
      "/api/inventory/state",
      "/api/gameplay/snapshot",
      "server/src/inventory/InventoryStore.ts",
      "server/src/inventory/InventoryService.ts",
      "server/src/resources/GatheringService.ts",
      "apps/client-2d/src/ui/windows/InventoryPanel.tsx",
    ],
    notes: "Server-authoritative inventory for gathered resource items. JSON/Postgres persistence path. MVP resources only (wood_log, copper_ore, raw_fish); equipment, trading, crafting consumption and full inventory UX pending. E2E tests verify gather tree → Wood Log in inventory snapshot.",
  },
  {
    id: "interaction-overlay",
    title: "Interaction Overlay",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "InteractionOverlayRoot + InteractionPrompt funktionieren",
  },
  {
    id: "loot-feed",
    title: "Loot Feed",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "LootFeed.tsx + createLootFeedStore funktionieren",
  },
  {
    id: "live-gameplay-snapshot",
    title: "Live Gameplay Snapshot System",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/api/gameplay/snapshot"],
    notes: "PARTIAL: LiveGameplaySnapshot + LiveGameplayStore + LiveGameplayNetworkBridge. Verbindet Quest/Guild/Faction/Map-Panels mit Server-Snapshots. WebSocket + HTTP-Fallback (5s polling).",
  },
  {
    id: "mobile-input",
    title: "Mobile Input System",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "MobileMovePad + InputBuffer vorhanden",
  },
  {
    id: "map-panel",
    title: "Map Panel",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [],
    notes: "PARTIAL: MapStatusPanel.tsx zeigt LiveGameplaySnapshot-Daten. Region/Chunk/Biome aus Server. Zeigt waiting wenn keine Chunk-Daten.",
  },
  {
    id: "network-client",
    title: "Network Client (WebSocket)",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "networkClient.ts + LocalNetworkClient mit wasd:network-packet",
  },
  {
    id: "npc-dialogue",
    title: "NPC Dialogue",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "NpcDialoguePanel.tsx existiert, Server-Daten teilweise verbunden",
  },
  {
    id: "pixi-module-inspector",
    title: "Pixi Module Inspector",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "Zeigt nur Pixi-Module (core/optional/avoid), keine globale Registry",
  },
  {
    id: "pixi-renderer",
    title: "PixiJS Renderer",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "PixiJS 7.x als autoritativer 2D-Renderer",
  },
  {
    id: "portal",
    title: "Portal",
    runtimeSurface: "portal",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/portal/", "/are-console.html", "/sovereign-truth.html"],
    notes: "Portal unter /portal/ - ARE Console, Status, Oracle, Governance",
  },
  {
    id: "quest-panel",
    title: "Quest Panel",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [],
    notes: "PARTIAL: QuestJournalPanel.tsx zeigt LiveGameplaySnapshot-Daten. Server-backed QuestProgressionStore feedt LiveGameplaySnapshot. Now backed by QuestPersistenceAdapter with JSON file MVP. Persistent across server restarts when QUEST_STATE_FILE points to durable storage.",
  },
  {
    id: "quest-persistence",
    title: "Quest Persistence",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/api/gameplay/snapshot", "/api/quest/event"],
    notes: "QuestProgressionStore persists player quest state via QuestPersistenceAdapter. JSON file MVP; DB-backed persistence pending.",
  },
  {
    id: "quest-progression",
    title: "Quest Progression Store",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/api/gameplay/snapshot", "/api/quest/event"],
    notes: "Quest progression accepts gameplay-facing NPC interaction and NPC kill events through QuestGameplayEventBridge. Now backed by QuestPersistenceAdapter for persistence across server restarts.",
  },
  {
    id: "quest-gameplay-hooks",
    title: "Quest Gameplay Hooks",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/api/gameplay/snapshot", "/api/quest/event"],
    notes: "NPC interaction (npc_interact_request) and NPC kill events are bridged into QuestProgressionStore via QuestGameplayEventBridge. Full direct world/combat hook coverage still pending if not all live paths are wired.",
  },
  {
    id: "selfheal-dashboard",
    title: "SelfHeal Dashboard",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: false,
    hasE2ETest: false,
    entrypoints: ["/api/self-healing/status"],
    notes: "Dashboard zeigt Status/Logs, fehlt Dry-Run, Risk-Level, PatchProposal, RollbackPlan",
  },
  {
    id: "selfheal-workshop",
    title: "SelfHeal Dry-Run Workshop",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: ["/api/self-healing"],
    notes: "Dry-run proposals with risk level and rollback plan. Apply is intentionally not implemented. Press S to open in 2D client.",
  },
  {
    id: "skill-progression",
    title: "Skill Progression",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [
      "/api/gameplay/snapshot",
      "/api/skill/event",
      "/api/skill/state",
      "server/src/skills/SkillProgressionStore.ts",
      "apps/client-2d/src/ui/windows/SkillProgressionPanel.tsx",
    ],
    notes: "Server-authoritative skill XP progression with LiveGameplaySnapshot visibility and persistence adapter support. MVP skills only; full resource/crafting hooks pending.",
  },
  {
    id: "resource-gathering",
    title: "Resource Gathering",
    runtimeSurface: "server",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: true,
    entrypoints: [
      "/api/resource/gather",
      "/api/resource/nodes",
      "/api/gameplay/snapshot",
      "server/src/resources/ResourceTypes.ts",
      "server/src/resources/ResourceNodeStore.ts",
      "server/src/resources/GatheringService.ts",
      "apps/client-2d/src/ui/windows/ResourceNodePanel.tsx",
    ],
    notes: "Deterministic starter resource nodes for woodcutting, mining and fishing. Server-authoritative gather action grants skill XP and persists item reward to player inventory. Connected to inventory-persistence module. Static MVP nodes only; procedural placement and crafting consumption pending.",
  },
  {
    id: "server-worldtick",
    title: "Server WorldTick (10Hz)",
    runtimeSurface: "server",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: false,
    hasE2ETest: true,
    entrypoints: [],
    notes: "WorldTick.ts mit 10Hz Logic Engine - Server bleibt autoritativ. Wird durch /api/are/heartbeat getestet.",
  },
  {
    id: "shared",
    title: "Shared Packages",
    runtimeSurface: "shared",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "@wasd/shared, @wasd/core-network, @wasd/core-logic",
  },
  {
    id: "snapshot-buffer",
    title: "Snapshot Buffer",
    runtimeSurface: "client-2d",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: false,
    hasE2ETest: false,
    entrypoints: [],
    notes: "Zwischenspeicher für Server-Snapshots",
  },
  {
    id: "watchdog",
    title: "Deterministic Watchdog",
    runtimeSurface: "server",
    status: "active",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: false,
    hasE2ETest: false,
    entrypoints: [],
    notes: "installDeterministicWatchdogRuntime + installWorldTickWatchdogBridge",
  },
  {
    id: "world-heart-monitor",
    title: "World Heart Monitor",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "Zeigt Entropy/Stability/NPC-Critical, aber ohne ARE-spezifische Werte",
  },
];

/**
 * Hilfsfunktion: Module nach Surface filtern
 */
export function getModulesBySurface(surface: RuntimeSurface): readonly AreloriaModuleRegistryEntry[] {
  return ARELORIA_MODULE_REGISTRY.filter(m => m.runtimeSurface === surface);
}

/**
 * Hilfsfunktion: Module nach Status filtern
 */
export function getModulesByStatus(status: ModuleStatus): readonly AreloriaModuleRegistryEntry[] {
  return ARELORIA_MODULE_REGISTRY.filter(m => m.status === status);
}

/**
 * Hilfsfunktion: Fehlende Module
 */
export function getMissingModules(): readonly AreloriaModuleRegistryEntry[] {
  return getModulesByStatus("missing");
}

/**
 * Hilfsfunktion: Preview-Module (nicht produktionsreif)
 */
export function getPreviewModules(): readonly AreloriaModuleRegistryEntry[] {
  return getModulesByStatus("preview");
}

/**
 * Hilfsfunktion: Module ohne E2E-Test
 */
export function getModulesWithoutE2ETest(): readonly AreloriaModuleRegistryEntry[] {
  return ARELORIA_MODULE_REGISTRY.filter(m => !m.hasE2ETest);
}

/**
 * Statistiken für Dashboard
 */
export interface ModuleRegistryStats {
  total: number;
  bySurface: Record<RuntimeSurface, number>;
  byStatus: Record<ModuleStatus, number>;
  missing: number;
  preview: number;
  withoutE2E: number;
}

export function getModuleRegistryStats(): ModuleRegistryStats {
  const stats: ModuleRegistryStats = {
    total: ARELORIA_MODULE_REGISTRY.length,
    bySurface: {
      "client-2d": 0,
      "client-3d": 0,
      "server": 0,
      "portal": 0,
      "engine": 0,
      "shared": 0,
      "tooling": 0,
    },
    byStatus: {
      "active": 0,
      "partial": 0,
      "preview": 0,
      "missing": 0,
      "legacy": 0,
      "future": 0,
    },
    missing: 0,
    preview: 0,
    withoutE2E: 0,
  };

  for (const module of ARELORIA_MODULE_REGISTRY) {
    stats.bySurface[module.runtimeSurface]++;
    stats.byStatus[module.status]++;
    if (module.status === "missing") stats.missing++;
    if (module.status === "preview") stats.preview++;
    if (!module.hasE2ETest) stats.withoutE2E++;
  }

  return stats;
}