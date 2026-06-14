/**
 * Route Registry - Machine-readable API route manifest
 * 
 * This file documents all API routes in the Areloria server.
 * It is the source of truth for route classification and health probes.
 * 
 * Classification Categories:
 * - active-truth-path: Routes affecting simulation state (tick-safe required)
 * - active-side-channel: Routes for observability/monitoring (non-gameplay)
 * - legacy: Routes with implementation but no active mount point
 * - duplicate: Routes superseded by other routes
 * - delete-candidate: Stubs or dead code with no real implementation
 * 
 * Run: node scripts/audit-route-registry.mjs --baseline --json
 */

export type RouteClassification =
  | "active-truth-path"
  | "active-side-channel"
  | "legacy"
  | "duplicate"
  | "delete-candidate";

export type MountStatus = "mounted" | "orphaned" | "not-imported";

export interface RouteEntry {
  /** Unique identifier for the route */
  id: string;
  /** HTTP method(s) or router type */
  methods: string[];
  /** Mount path in Express */
  path: string;
  /** Source file */
  sourceFile: string;
  /** Classification category */
  classification: RouteClassification;
  /** Mount status in ServerBootstrap.ts */
  mountStatus: MountStatus;
  /** Whether route affects gameplay state */
  gameplayAffecting: boolean;
  /** Whether route requires tick-context (deterministic) */
  requiresTickContext: boolean;
  /** Whether route has auth middleware */
  hasAuth: boolean;
  /** Client references pointing to this route */
  clientRefs?: Array<{ file: string; line: number }>;
  /** Notes about the route */
  notes?: string;
}

// ============================================================================
// MOUNTED ROUTES (Active in ServerBootstrap.ts)
// ============================================================================

export const MOUNTED_ROUTES: RouteEntry[] = [
  // ---- Truth-Path Routes (Gameplay-Affecting) ----
  {
    id: "quest-event",
    methods: ["USE"],
    path: "/api/quest",
    sourceFile: "server/src/routes/questEventRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: false,
    notes: "Quest events modify game state - deterministic tick-safe required"
  },
  {
    id: "skill-event",
    methods: ["USE"],
    path: "/api/skill",
    sourceFile: "server/src/routes/skillEventRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: false,
    notes: "Skill events affect gameplay - deterministic tick-safe required"
  },
  {
    id: "resource-gather",
    methods: ["USE"],
    path: "/api/resource",
    sourceFile: "server/src/routes/resourceGatherRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: false,
    notes: "Resource gathering changes world state"
  },
  {
    id: "inventory",
    methods: ["USE"],
    path: "/api/inventory",
    sourceFile: "server/src/routes/inventoryRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: false,
    notes: "Inventory changes affect gameplay"
  },
  {
    id: "crafting",
    methods: ["USE"],
    path: "/api/crafting",
    sourceFile: "server/src/routes/craftingRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: false,
    notes: "Crafting modifies inventory state"
  },
  {
    id: "equipment",
    methods: ["USE"],
    path: "/api/equipment",
    sourceFile: "server/src/routes/equipmentRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: false,
    notes: "Equipment management affects character stats"
  },
  {
    id: "character",
    methods: ["USE"],
    path: "/api/character",
    sourceFile: "server/src/character/characterRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: false,
    hasAuth: true,
    notes: "Character management - DB-backed, no tick dependency"
  },
  {
    id: "onboarding",
    methods: ["USE"],
    path: "/api/onboarding",
    sourceFile: "server/src/routes/onboardingRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: false,
    notes: "Player onboarding flow"
  },
  {
    id: "economy",
    methods: ["USE"],
    path: "/api/economy",
    sourceFile: "server/src/economy/economyRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Economy system - market operations"
  },
  {
    id: "npc-vendor",
    methods: ["USE"],
    path: "/api/npc",
    sourceFile: "server/src/npc/VendorRoutes.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: false,
    hasAuth: false,
    notes: "NPC vendor interactions"
  },
  {
    id: "npc-camp",
    methods: ["USE"],
    path: "/api/npc",
    sourceFile: "server/src/npc/CampNpcRoutes.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Camp NPC interactions"
  },
  {
    id: "npc-quest",
    methods: ["USE"],
    path: "/api/npc",
    sourceFile: "server/src/npc/npcQuestRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: false,
    hasAuth: false,
    notes: "NPC quest interactions"
  },
  {
    id: "quests",
    methods: ["USE"],
    path: "/api/quests",
    sourceFile: "server/src/quests/npcQuestRoute.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Quest route (alias for npcQuestRouter)"
  },
  {
    id: "loot-routes",
    methods: ["USE"],
    path: "/api/admin/loot",
    sourceFile: "server/src/routes/lootRoutes.ts",
    classification: "active-truth-path",
    mountStatus: "mounted",
    gameplayAffecting: true,
    requiresTickContext: true,
    hasAuth: true,
    notes: "ARE Infinite Loot Machine - admin protected"
  },

  // ---- Side-Channel Routes (Non-Gameplay) ----
  {
    id: "are-heartbeat",
    methods: ["USE"],
    path: "/api/are",
    sourceFile: "server/src/routes/areHeartbeat.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: true,
    hasAuth: false,
    notes: "ARE telemetry heartbeat"
  },
  {
    id: "are-shadow",
    methods: ["USE"],
    path: "/api/are-shadow",
    sourceFile: "server/src/api/areShadowLogRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "ARE shadow logging"
  },
  {
    id: "are-validation",
    methods: ["USE"],
    path: "/api/are/validation",
    sourceFile: "server/src/api/areValidationRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "ARE validation endpoint"
  },
  {
    id: "are-replay",
    methods: ["USE"],
    path: "/api/are/replay",
    sourceFile: "server/src/api/areReplayRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "ARE replay system"
  },
  {
    id: "gameplay-snapshot",
    methods: ["USE"],
    path: "/api/gameplay",
    sourceFile: "server/src/routes/gameplaySnapshot.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Gameplay snapshot telemetry"
  },
  {
    id: "self-healing",
    methods: ["USE"],
    path: "/api/self-healing",
    sourceFile: "server/src/routes/selfHealWorkshopRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Self-healing dashboard"
  },
  {
    id: "manifest-resync",
    methods: ["USE"],
    path: "/api/manifest",
    sourceFile: "server/src/api/manifestResyncRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Manifest resync for client-server state"
  },
  {
    id: "leaderboard",
    methods: ["USE"],
    path: "/api/leaderboard",
    sourceFile: "server/src/api/leaderboardRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Leaderboard rankings (analytics)"
  },
  {
    id: "lore",
    methods: ["USE"],
    path: "/api/lore",
    sourceFile: "server/src/api/loreRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Lore content delivery"
  },
  {
    id: "questlines",
    methods: ["USE"],
    path: "/api/questlines",
    sourceFile: "server/src/api/questlineRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Questline content"
  },
  {
    id: "warfront",
    methods: ["USE"],
    path: "/api/v1/warfront",
    sourceFile: "server/src/api/warfrontRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Warfront combat API"
  },
  {
    id: "mcp",
    methods: ["USE"],
    path: "/api/mcp",
    sourceFile: "server/src/api/mcpRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "MCP protocol endpoint"
  },
  {
    id: "science-mascot",
    methods: ["USE"],
    path: "/api/v1",
    sourceFile: "server/src/api/scienceMascotRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Science mascot API"
  },
  {
    id: "vote",
    methods: ["USE"],
    path: "/api/vote",
    sourceFile: "server/src/api/voteRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Voting system"
  },

  // ---- Admin Routes (Auth-Protected) ----
  {
    id: "admin-content",
    methods: ["USE"],
    path: "/api/admin/content",
    sourceFile: "server/src/api/adminContentRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    notes: "Content admin panel - auth + rate limiter"
  },
  {
    id: "client2d-assets",
    methods: ["USE"],
    path: "/api/client2d-assets",
    sourceFile: "server/src/api/client2dAssetUploadRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    notes: "2D asset uploads - auth + rate limiter"
  },
  {
    id: "sovereign-deploy",
    methods: ["USE"],
    path: "/api/sovereign/deploy",
    sourceFile: "server/src/api/sovereignDeployRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    notes: "Sovereign deployment - admin auth + rate limiter"
  },
  {
    id: "finance",
    methods: ["USE"],
    path: "/api/finance",
    sourceFile: "server/src/api/financeRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Finance integration (PayPal)"
  },

  // ---- Health/System Routes ----
  {
    id: "health",
    methods: ["USE"],
    path: "/health",
    sourceFile: "server/src/api/healthRoutes.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Health probes"
  },
  {
    id: "agora",
    methods: ["USE"],
    path: "/agora",
    sourceFile: "server/src/api/agoraRoute.ts",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Agora video integration"
  },
  {
    id: "playtester-debug-log",
    methods: ["GET"],
    path: "/api/playtester/debug-log",
    sourceFile: "server/src/core/ServerBootstrap.ts (inline)",
    classification: "active-side-channel",
    mountStatus: "mounted",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    clientRefs: [
      { file: "client/src/playtesterMonitorViewerMain.ts", line: 284 },
      { file: "client/src/playtesterRenderPublisherMain.ts", line: 129 }
    ],
    notes: "Playtester debug endpoint - auth-protected inline route"
  }
];

// ============================================================================
// ORPHANED ROUTES (Not mounted in ServerBootstrap.ts)
// ============================================================================

export const ORPHANED_ROUTES: RouteEntry[] = [
  // ---- Legacy Routes (Real implementation, no mount point) ----
  {
    id: "ai-service",
    methods: ["router"],
    path: "/api/ai (internal)",
    sourceFile: "server/src/routes/AIService.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Core Ouroboros AI service - used by routes/api.ts internally"
  },
  {
    id: "llm-service",
    methods: ["router"],
    path: "/api/ai/llm (planned)",
    sourceFile: "server/src/routes/LLMService.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Standalone LLM wrapper - needs integration"
  },
  {
    id: "oracle-endpoint",
    methods: ["router"],
    path: "/api/oracle (internal)",
    sourceFile: "server/src/routes/OracleEndpoint.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Ouroboros sync endpoint - used by routes/api.ts internally"
  },
  {
    id: "pathfinding-system",
    methods: ["router"],
    path: "/api/pathfinding (planned)",
    sourceFile: "server/src/routes/PathfindingSystem.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Standalone pathfinding system - needs integration"
  },
  {
    id: "world-event-bus",
    methods: ["router"],
    path: "/api/events (internal)",
    sourceFile: "server/src/routes/WorldEventBus.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Event bus infrastructure - has tests and client refs"
  },
  {
    id: "are-oracle",
    methods: ["USE"],
    path: "/api/are/oracle",
    sourceFile: "server/src/api/areOracleRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "ARE oracle route - needs mount with WorldTick integration"
  },
  {
    id: "asset-brain",
    methods: ["USE"],
    path: "/api/asset-brain",
    sourceFile: "server/src/api/assetBrainRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    clientRefs: [
      { file: "client/src/ui/assetLibraryPanel.ts", line: 108 },
      { file: "client/src/ui/assetLibraryPanel.ts", line: 162 },
      { file: "client/src/ui/assetLibraryPanel.ts", line: 212 }
    ],
    notes: "Asset brain library - auth middleware present, client refs exist"
  },
  {
    id: "asset-pipeline",
    methods: ["USE"],
    path: "/api/asset-pipeline",
    sourceFile: "server/src/api/assetPipelineRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    notes: "3D asset pipeline - auth middleware present"
  },
  {
    id: "glb-upload",
    methods: ["USE"],
    path: "/api/glb",
    sourceFile: "server/src/api/glbUploadRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    clientRefs: [
      { file: "client/src/ui/glbManager.ts", line: 232 },
      { file: "client/src/ui/glbManager.ts", line: 275 },
      { file: "client/src/ui/glbManager.ts", line: 302 },
      { file: "client/src/ui/glbManager.ts", line: 396 },
      { file: "client/src/ui/glbManager.ts", line: 421 },
      { file: "client/src/ui/shopPanel.ts", line: 212 },
      { file: "client/src/ui/shopPanel.ts", line: 284 },
      { file: "client/src/ui/shopPanel.ts", line: 324 }
    ],
    notes: "GLB marketplace upload - auth middleware present, multiple client refs"
  },
  {
    id: "land-route",
    methods: ["USE"],
    path: "/api/land",
    sourceFile: "server/src/api/landRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    clientRefs: [
      { file: "client/src/ui/glbManager.ts", line: 350 },
      { file: "client/src/ui/glbManager.ts", line: 364 },
      { file: "client/src/ui/glbManager.ts", line: 468 },
      { file: "client/src/ui/glbManager.ts", line: 527 }
    ],
    notes: "Land ownership system - client refs exist"
  },
  {
    id: "world-routes",
    methods: ["USE"],
    path: "/api/world",
    sourceFile: "server/src/api/worldRoutes.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "World snapshot route - needs mount with snapshot provider"
  },
  {
    id: "chat",
    methods: ["USE"],
    path: "/api/chat",
    sourceFile: "server/src/api/chatRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Chat system - exported in api/index.ts but never imported"
  },
  {
    id: "collective-ingress",
    methods: ["USE"],
    path: "/api/collective/ingress",
    sourceFile: "server/src/api/collectiveIngressRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Sovereign identity ingress"
  },
  {
    id: "duden-report",
    methods: ["USE"],
    path: "/api/duden/report",
    sourceFile: "server/src/api/dudenReportRoute.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Duden telemetry endpoint"
  },
  {
    id: "sdk-billing",
    methods: ["USE"],
    path: "/api/sdk/billing",
    sourceFile: "server/src/api/sdkBillingRoute.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: true,
    notes: "Billing diagnostic - admin key check"
  },
  {
    id: "world-heart",
    methods: ["USE"],
    path: "/api/world/heart",
    sourceFile: "server/src/api/worldHeartRoute.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Shadow log adapter"
  },
  {
    id: "b2b-trading",
    methods: ["USE"],
    path: "/api/v1/b2b/trading",
    sourceFile: "server/src/api/v1/b2b/trading.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "B2B trading API"
  },
  {
    id: "paypal",
    methods: ["USE"],
    path: "/api/paypal",
    sourceFile: "server/src/api/paypalRoute.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    clientRefs: [
      { file: "client/src/ui/shopPanel.ts", line: 248 }
    ],
    notes: "PayPal integration - client ref exists but path differs from /api/finance/paypal/checkout"
  },

  // ---- Health Check Routes ----
  {
    id: "inventory-persistence-health",
    methods: ["GET"],
    path: "/api/health/inventory-persistence",
    sourceFile: "server/src/api/inventoryPersistenceHealth.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Health check for inventory persistence"
  },
  {
    id: "quest-persistence-health",
    methods: ["GET"],
    path: "/api/health/quest-persistence",
    sourceFile: "server/src/api/questPersistenceHealth.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Health check for quest persistence"
  },
  {
    id: "skill-persistence-health",
    methods: ["GET"],
    path: "/api/health/skill-persistence",
    sourceFile: "server/src/api/skillPersistenceHealth.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Health check for skill persistence"
  },

  // ---- Delete Candidates (Stubs or Dead Code) ----
  {
    id: "api-index",
    methods: ["router"],
    path: "N/A (dead bundle)",
    sourceFile: "server/src/api/index.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Dead bundle - exports routes never imported anywhere"
  },
  {
    id: "oracle-route",
    methods: ["router"],
    path: "N/A (stub)",
    sourceFile: "server/src/api/oracleRoute.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "STUB - Only returns {method, path}, no real implementation"
  },
  {
    id: "admin-editor-routes",
    methods: ["router"],
    path: "N/A (stub)",
    sourceFile: "server/src/api/admin/editorRoutes.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "STUB - Minimal class with no real implementation"
  },
  {
    id: "rest-player-routes",
    methods: ["router"],
    path: "N/A (stub)",
    sourceFile: "server/src/api/rest/playerRoutes.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "STUB - Minimal class, no real implementation"
  },
  {
    id: "rest-world-routes",
    methods: ["router"],
    path: "N/A (stub)",
    sourceFile: "server/src/api/rest/worldRoutes.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "STUB - Minimal class, no real implementation"
  },
  {
    id: "editor-routes",
    methods: ["router"],
    path: "N/A (stub wrapper)",
    sourceFile: "server/src/api/editorRoutes.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "STUB wrapper - Uses apiRouteKit but requires options (no defaults)"
  },
  {
    id: "auth-route",
    methods: ["router"],
    path: "N/A (dead export)",
    sourceFile: "server/src/api/authRoute.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Dead export - exported in api/index.ts but never imported"
  },
  {
    id: "auction-route",
    methods: ["router"],
    path: "N/A (dead export)",
    sourceFile: "server/src/api/auctionRoute.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Dead export - exported in api/index.ts but never imported"
  },
  {
    id: "mail-route",
    methods: ["router"],
    path: "N/A (dead export)",
    sourceFile: "server/src/api/mailRoute.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Dead export - exported in api/index.ts but never imported"
  },
  {
    id: "player-routes",
    methods: ["router"],
    path: "N/A (dead export)",
    sourceFile: "server/src/api/playerRoutes.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Dead export - exported in api/index.ts but never imported"
  },
  {
    id: "admin-route",
    methods: ["router"],
    path: "N/A (dead export)",
    sourceFile: "server/src/api/adminRoute.ts",
    classification: "delete-candidate",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Dead export - exported in api/index.ts but never imported"
  },

  // ---- Utility/API Foundation ----
  {
    id: "api-route-kit",
    methods: ["utilities"],
    path: "N/A (utility)",
    sourceFile: "server/src/api/apiRouteKit.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Core API utilities - may be used by other routes"
  },
  {
    id: "idempotency-handler",
    methods: ["middleware"],
    path: "N/A (middleware)",
    sourceFile: "server/src/api/middleware/IdempotencyHandler.ts",
    classification: "legacy",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "B2B idempotency middleware - unused"
  },
  {
    id: "are-heartbeat-utils",
    methods: ["utilities"],
    path: "N/A (utility)",
    sourceFile: "server/src/routes/areHeartbeatUtils.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Used by mounted areHeartbeat.ts - utility module"
  },
  {
    id: "gameplay-snapshot-utils",
    methods: ["utilities"],
    path: "N/A (utility)",
    sourceFile: "server/src/routes/gameplaySnapshotUtils.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Used by mounted gameplaySnapshot.ts - utility module"
  },
  {
    id: "api-route-oracle-endpoint",
    methods: ["router"],
    path: "N/A (internal)",
    sourceFile: "server/src/api/OracleEndpoint.ts",
    classification: "active-side-channel",
    mountStatus: "not-imported",
    gameplayAffecting: false,
    requiresTickContext: false,
    hasAuth: false,
    notes: "Ouroboros sync - internal use"
  }
];

// ============================================================================
// LEGACY/DEPRECATED CLIENT REFERENCES
// ============================================================================

export const DEPRECATED_CLIENT_REFS = [
  {
    file: "client/src/projects/art/SocketService.ts",
    line: 14,
    path: "/api/art/ws",
    status: "deprecated",
    action: "Mark as @deprecated - pixel art feature abandoned or not implemented",
    notes: "No server-side /api/art/ws endpoint exists"
  },
  {
    file: "client/src/ui/voteAdminPanel.ts",
    line: 190,
    path: "/api/check",
    status: "placeholder",
    action: "No changes needed - this is a placeholder URL for external vote providers",
    notes: "Not an actual API call"
  }
];

// ============================================================================
// SUMMARY STATISTICS
// ============================================================================

export function getRouteRegistrySummary() {
  const mountedTruthPath = MOUNTED_ROUTES.filter(r => r.classification === "active-truth-path").length;
  const mountedSideChannel = MOUNTED_ROUTES.filter(r => r.classification === "active-side-channel").length;
  const orphanedActive = ORPHANED_ROUTES.filter(r => r.classification === "active-truth-path" || r.classification === "active-side-channel").length;
  const orphanedLegacy = ORPHANED_ROUTES.filter(r => r.classification === "legacy").length;
  const deleteCandidates = ORPHANED_ROUTES.filter(r => r.classification === "delete-candidate").length;

  return {
    mounted: {
      total: MOUNTED_ROUTES.length,
      truthPath: mountedTruthPath,
      sideChannel: mountedSideChannel
    },
    orphaned: {
      total: ORPHANED_ROUTES.length,
      active: orphanedActive,
      legacy: orphanedLegacy,
      deleteCandidates
    },
    deprecatedClientRefs: DEPRECATED_CLIENT_REFS.length
  };
}

// Export for JSON serialization
export const ROUTE_REGISTRY_VERSION = "1.0.0";
export const ROUTE_REGISTRY_LAST_UPDATED = new Date().toISOString();