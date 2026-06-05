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
    title: "Equipment Panel",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "EquipmentPanel.tsx existiert, aber nicht vollständig mit Server-Daten verbunden",
  },
  {
    id: "faction-panel",
    title: "Faction Panel",
    runtimeSurface: "client-2d",
    status: "preview",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "PREVIEW: FactionsPreview() zeigt statische Placeholder-Texte",
  },
  {
    id: "guild-panel",
    title: "Guild Panel",
    runtimeSurface: "client-2d",
    status: "preview",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "PREVIEW: GuildPreview() zeigt statische Placeholder-Texte",
  },
  {
    id: "inventory",
    title: "Inventory System",
    runtimeSurface: "client-2d",
    status: "partial",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "InventoryPanel.tsx existiert, Server-Daten teilweise verbunden",
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
    status: "preview",
    deterministic: true,
    serverAuthoritative: true,
    visibleInClient: true,
    hasE2ETest: false,
    entrypoints: [],
    notes: "PREVIEW: QuestPreview() zeigt statische Placeholder-Texte",
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