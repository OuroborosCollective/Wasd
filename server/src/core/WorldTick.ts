// Alias for backwards compatibility
import { WorldPlacementRuleEngine } from "../world/services/WorldPlacementRuleEngine.js";
const PlacementEngine = WorldPlacementRuleEngine;

import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { applyLegendaryPowersFromEquipment } from "../modules/items/legendaryPowers.js";
import { addGearToPlayer, ensureDualInventoryFields } from "../modules/items/dualInventoryTypes.js";
import { normalizeBoundItemMeta } from "../modules/items/itemBindingPolicy.js";
import { generateItem, rarityRoll } from "../modules/loot/diabloItemGen.js";
import { generatedItemToGearItem } from "../modules/loot/gearConvert.js";
import { pityBonus } from "../modules/loot/pity.js";
import { SAMPLE_DROP_AFFIXES, SAMPLE_DROP_BASES } from "../modules/loot/diabloSampleData.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { NPCSystem } from "../modules/npc/NPCSystem.js";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { QuestlineEngine } from "../modules/questline/questlineEngine.js";
import { enrichQuestlineContext } from "../modules/questline/questlineGenerator.js";
import {
  applyQuestCompletionToQuestline,
  registerProceduralQuestPack,
  registeredProceduralQuestIdsByQuestline,
  setPlayerQuestlineRuntime,
  tryCompleteQuestlineTalkAtNpc,
} from "../modules/questline/questlineBridge.js";
import { WorldSystem } from "../modules/world/WorldSystem.js";
import { WorldObject } from "../modules/world/WorldObjectSystem.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";
import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";
import { AREStateCompiler } from "../modules/world/AREStateCompiler.js";
import { RuntimeSettingsStore, type AREDeviceClass, type AREMode } from "../modules/world/RuntimeSettingsStore.js";
import { AREModeAuditTrail } from "../modules/world/AREModeAuditTrail.js";
import { cache } from "./Cache.js";
import fs from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { resolveLoginIdentity } from "../modules/auth/resolveLoginIdentity.js";
import { getSkillDefinition, buildSkillCooldownUntilPayload } from "../modules/skill/skillDefinitions.js";
import {
  IMPACT_BUSTER_COOLDOWN_KEY,
  IMPACT_BUSTER_SKILL_ID,
} from "../modules/skill/impactBusterConfig.js";
import { canUseImpactBuster, executeImpactBuster } from "./ImpactBusterHandler.js";
import {
  MEGA_IRON_FIST_ITEM_ID,
  WORLD_BOSS_DUNGEON_ID,
  WORLD_BOSS_SCENE_ID,
  WorldBossDungeonSystem,
} from "./WorldBossDungeonSystem.js";
import { WorldPlacementRuleEngine } from "../world/services/WorldPlacementRuleEngine.js";
import { WorldLayoutRuleEngine, createDefaultLayoutConfig } from "../world/layout/WorldLayoutRuleEngine.js";
import { ServerTerrainAdapter } from "../world/adapters/ExistingDynamicTerrainAdapter.js";
import { ExistingTreeGeneratorAdapter } from "../world/adapters/ExistingTreeGeneratorAdapter.js";
import { VoteSystem } from "../modules/vote/VoteSystem.js";
import { ensurePlayerVoteProgress } from "../modules/vote/playerVoteProgress.js";
import { WarfrontSystem } from "../modules/warfront/WarfrontSystem.js";
import { ensurePlayerWarfrontProgress } from "../modules/warfront/playerWarfrontProgress.js";
import type { WarfrontSectorKind } from "../modules/warfront/warfrontTypes.js";
import { PlaytesterConfig } from "../config/PlaytesterConfig.js";
import { AutonomousPlaytester } from "../modules/playtester/AutonomousPlaytester.js";
import type { PlaytesterMonitorUpdatePayload } from "../modules/playtester/playtesterTypes.js";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import {
  initRedisChatRelay,
  onRedisChatMessage,
  publishChatMessage,
  type ChatMessage as RelayedChatMessage,
  type ChatScope as RelayedChatScope,
  type PublishChatResult,
} from "../modules/chat/RedisChatRelay.js";
import { ChatChannelRouter, type ChatRecipient } from "../modules/chat/ChatChannelRouter.js";
import { StatusEmitter } from "../modules/chat/StatusEmitter.js";
import { NPCMemoryCache } from "../modules/npc/NPCMemoryCache.js";
import { setSupabaseClient, loadNpcMemory, flushDirtyEntries } from "../modules/npc/NPCMemoryPersistence.js";
import { tickNpcChat } from "../modules/npc/NPCChatAgent.js";
import { LOCAL_CHAT_RADIUS } from "../modules/chat/chatChannelTypes.js";
import { OuroborosEngine } from "../modules/ouroboros/OuroborosEngine.js";
import { NPCRelationshipSystem } from "../modules/npc/NPCRelationshipSystem.js";
import { GameplayFusionDirector } from "../modules/gameplay/GameplayFusionDirector.js";
import { buildAdminGlbModelNeeds } from "../modules/content/adminGlbModelNeeds.js";
import { loadObjectTypeChoicesForAdmin } from "../modules/content/adminContentChoices.js";
import { getContentDataRoot } from "../modules/content/contentDataRoot.js";
import { findRepoRootWithGameData } from "../modules/content/repoRoot.js";
import { auditContentModelPaths } from "../modules/content/auditContentModelPaths.js";

import { getPostHogClient } from "../services/posthog.js";
import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { GameConfig } from "../config/GameConfig.js";
import { LiveHealEngine, bootstrapLiveHeal, resolveLiveHealConfigFromEnv } from "./liveheal/index.js";
import type { AssetHealthConfig } from "../core/liveheal/LiveHealTypes.js";
import { AssetHealthService } from "../assets/AssetHealthService.js";
import type { HealthSnapshot, SubSystemAdapter } from "./liveheal/LiveHealTypes.js";

type SpawnPoint = { x: number; y: number; z: number };
type SceneProfile = {
  defaultSpawnKey: string;
  spawnPoints: Record<string, SpawnPoint>;
};
type SceneTriggerZone = {
  id: string;
  sceneId: string;
  x: number;
  y: number;
  radius: number;
  targetSceneId?: string;
  targetSpawnKey: string;
  triggerType?: string;
  dungeonId?: string;
  allowedSpawnKeys?: string[];
};
type GMWorldState = {
  weather: string;
  pvp: boolean;
  friendlyFire: boolean;
  infiniteWorld: boolean;
  economySim: boolean;
  npcAI: boolean;
  nations: any[];
  diplomacy: any[];
  territories: Record<string, string>;
  mutedPlayers: string[];
  bannedPlayers: string[];
  customDialogues: Record<string, any>;
};
type GMTemplateWave = {
  npcId: string;
  name?: string;
  count: number;
  spread?: number;
  hp?: number;
};
type GMTemplateStep = {
  delaySec: number;
  eventId?: string;
  title?: string;
  description?: string;
  broadcast?: string;
  weather?: string;
  time?: number;
  economyEvent?: { eventType: string; duration: number };
  spawnWaves?: GMTemplateWave[];
};
type GMTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  steps: GMTemplateStep[];
};
type ScheduledGMTemplateStep = {
  runId: string;
  templateId: string;
  executeAt: number;
  originX: number;
  originY: number;
  step: GMTemplateStep;
};
type WorldBossRankingSummary = {
  dungeonId: string;
  encounterId: string;
  top: Array<{
    playerId: string;
    playerName: string;
    rank: number;
    damage: number;
  }>;
};
const DEFAULT_SCENE_ID = "didis_hub";
const DEFAULT_SCENE_PROFILES: Record<string, SceneProfile> = {
  didis_hub: {
    defaultSpawnKey: "sp_player_default",
    spawnPoints: {
      sp_player_default: { x: 0, y: 0, z: 0 },
      sp_didi_01: { x: 18, y: 0, z: 6 },
      sp_didi_02: { x: -18, y: 0, z: 6 },
    },
  },
};
const SCENE_TRIGGER_COOLDOWN_MS = 2500;
const WARFRONT_FRONT_BOSS_BASE_NPC_ID = "npc_warfront_frontboss_herald";
const WARFRONT_STATUS_BROADCAST_TICK_INTERVAL = 20;
const DEFAULT_SCENE_TRIGGER_ZONES: SceneTriggerZone[] = [
  {
    id: "tr_to_didi_01",
    sceneId: "didis_hub",
    x: 8,
    y: 0,
    radius: 2.2,
    targetSpawnKey: "sp_didi_01",
    allowedSpawnKeys: ["sp_player_default", "sp_didi_02"],
  },
  {
    id: "tr_to_didi_02",
    sceneId: "didis_hub",
    x: -8,
    y: 0,
    radius: 2.2,
    targetSpawnKey: "sp_didi_02",
    allowedSpawnKeys: ["sp_player_default", "sp_didi_01"],
  },
  {
    id: "tr_to_hub_from_didi_01",
    sceneId: "didis_hub",
    x: 18,
    y: 14,
    radius: 2.2,
    targetSpawnKey: "sp_player_default",
    allowedSpawnKeys: ["sp_didi_01"],
  },
  {
    id: "tr_to_hub_from_didi_02",
    sceneId: "didis_hub",
    x: -18,
    y: 14,
    radius: 2.2,
    targetSpawnKey: "sp_player_default",
    allowedSpawnKeys: ["sp_didi_02"],
  },
];
const SCENE_LAYOUT_DIRECTORY = path.resolve(process.cwd(), "game-data/scenes");
const GM_EVENT_TEMPLATES: Record<string, GMTemplateDefinition> = {
  legion_invasion: {
    id: "legion_invasion",
    name: "Legion Invasion",
    description: "Three-stage invasion with weather change and elite waves.",
    steps: [
      {
        delaySec: 0,
        weather: "storm",
        eventId: "legion_invasion_started",
        title: "Legion Invasion",
        description: "Demonic portals open across the district.",
        broadcast: "Legion forces have breached the outer perimeter!",
      },
      {
        delaySec: 25,
        spawnWaves: [{ npcId: "legion_scout", name: "Legion Scout", count: 6, spread: 10, hp: 130 }],
        broadcast: "Wave 1: Legion Scouts are advancing!",
      },
      {
        delaySec: 50,
        spawnWaves: [{ npcId: "legion_brute", name: "Legion Brute", count: 4, spread: 8, hp: 220 }],
        broadcast: "Wave 2: Legion Brutes entered the battlefield!",
      },
      {
        delaySec: 90,
        spawnWaves: [{ npcId: "legion_overseer", name: "Legion Overseer", count: 1, spread: 4, hp: 800 }],
        eventId: "legion_boss_phase",
        title: "Overseer Arrived",
        description: "Eliminate the Overseer to end the invasion.",
        broadcast: "Final Wave: Legion Overseer is here!",
      },
    ],
  },
  city_defense: {
    id: "city_defense",
    name: "City Defense",
    description: "Defensive event around hub with support guards and raiders.",
    steps: [
      {
        delaySec: 0,
        weather: "fog",
        eventId: "city_defense_started",
        title: "City Defense Activated",
        description: "Barricades raised. Hold your positions.",
        broadcast: "Defensive protocol enabled. Raiders incoming.",
      },
      {
        delaySec: 30,
        spawnWaves: [{ npcId: "city_raider", name: "City Raider", count: 8, spread: 12, hp: 150 }],
        broadcast: "Raiders are attacking the main gate!",
      },
    ],
  },
};

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

export class WorldTick {
  private tickCount: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private playerToSocket: Map<string, string> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private sceneProfiles: Record<string, SceneProfile> = { ...DEFAULT_SCENE_PROFILES };
  private sceneTriggerZones: SceneTriggerZone[] = [...DEFAULT_SCENE_TRIGGER_ZONES];
  private playerSceneTriggerCooldowns: Map<string, number> = new Map();
  private lootEntities: Map<string, any> = new Map();
  private glbPathCache: Map<string, string> = new Map();
  private runtimeEventTemplates: Record<string, GMTemplateDefinition> = { ...GM_EVENT_TEMPLATES };
  private activeTemplateRuns: ScheduledGMTemplateStep[] = [];
  private worldBossRespawnAt: number = 0;
  private warfrontStatusBroadcastTick: number = 0;
  private playtesterStreamCounter: number = 0;
  private areMode: AREMode = "standard";

  constructor(
    private ws: GameWebSocketServer,
    private persistence: PersistenceManager,
    private playerSystem: PlayerSystem,
    private npcSystem: NPCSystem,
    private worldSystem: WorldSystem,
    private chunkSystem: ChunkSystem,
    private observerEngine: ObserverEngine,
    private combatSystem: CombatSystem,
    private guildSystem: GuildSystem,
    private economySystem: EconomySystem,
    private questEngine: QuestEngine,
    private questlineEngine: QuestlineEngine,
    private chatChannelRouter: ChatChannelRouter,
    private statusEmitter: StatusEmitter,
    private npcMemoryCache: NPCMemoryCache,
    private ouroborosEngine: OuroborosEngine,
    private npcRelationships: NPCRelationshipSystem,
    private worldBossDungeonSystem: WorldBossDungeonSystem,
    private warfrontSystem: WarfrontSystem,
    private runtimeSettings: RuntimeSettingsStore,
    private areModeAudit: AREModeAuditTrail,
    private playtester?: AutonomousPlaytester,
    private craftingSystem?: CraftingSystem,
    private liveHeal: LiveHealEngine = bootstrapLiveHeal(resolveLiveHealConfigFromEnv()),
    private assetHealth?: AssetHealthService;
    private areStateCompiler: AREStateCompiler = new AREStateCompiler(),
    private glbRegistry: GLBRegistry = new GLBRegistry(),
    private assetPoolResolver: AssetPoolResolver = new AssetPoolResolver(),
    private placementEngine: PlacementEngine = new PlacementEngine(),
  ) {
    this.ws.onPlayerConnected = (id, sid) => {
      this.playerToSocket.set(id, sid);
      this.socketToPlayer.set(sid, id);
      const p = this.playerSystem.getPlayer(id);
      if (p) {
        p.isOffline = false;
        this.ensurePlayerProgressDefaults(p);
        this.observerEngine.registerObserver(id, p.position.x, p.position.y);
      }
    };
    this.ws.onPlayerDisconnected = (sid) => {
      const id = this.socketToPlayer.get(sid);
      if (id) {
        this.playerToSocket.delete(id);
        this.socketToPlayer.delete(sid);
        const p = this.playerSystem.getPlayer(id);
        if (p) p.isOffline = true;
        this.observerEngine.unregisterObserver(id);
      }
    };

    const handlePlayerMessage = async (id: string, msg: any) => {
      const p = this.playerSystem.getPlayer(id);
      if (!p) return;

      if (msg.type === "move") {
        p.position.x = msg.x;
        p.position.y = msg.y;
        this.observerEngine.updateObserverPosition(id, p.position.x, p.position.y);
        this.checkSceneTriggers(p);
      } else if (msg.type === "chat") {
        const scope: RelayedChatScope = msg.scope || "local";
        const result: PublishChatResult = await publishChatMessage({
          senderId: p.id,
          senderName: p.name || p.id,
          text: msg.text,
          scope,
          position: scope === "local" ? { x: p.position.x, y: p.position.y } : undefined,
        });

        if (result.success) {
          const recipients = this.chatChannelRouter.route({
            id: randomUUID(),
            senderId: p.id,
            senderName: p.name || p.id,
            text: msg.text,
            scope,
            position: p.position,
            ts: Date.now(),
          });

          recipients.forEach((r) => {
            const sid = this.playerToSocket.get(r.id);
            if (sid) {
              this.ws.sendToPlayer(sid, {
                type: "chat",
                sender: p.name || p.id,
                text: msg.text,
                scope,
              });
            }
          });
        }
      } else if (msg.type === "use_skill") {
        const skillId = msg.skillId;
        if (skillId === IMPACT_BUSTER_SKILL_ID) {
          const canUse = canUseImpactBuster(p, cache);
          if (canUse.ok) {
            const result = executeImpactBuster(p, this.npcSystem.getAllNPCs(), cache);
            if (result.ok) {
              this.ws.sendToPlayer(this.playerToSocket.get(p.id)!, {
                type: "skill_success",
                skillId,
                cooldownUntil: result.cooldownUntil,
              });
              this.ws.broadcast({
                type: "skill_effect",
                skillId,
                originId: p.id,
                targets: result.targets,
              });
            }
          }
        }
      } else if (msg.type === "admin_set_are_mode") {
        const newMode = msg.mode as AREMode;
        const reason = msg.reason || "Admin request";
        this.areMode = newMode;
        this.runtimeSettings.setAREMode(newMode);
        this.areModeAudit.recordChange("admin", newMode, reason);
        this.ws.broadcast({ type: "are_mode_updated", mode: newMode });
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
      await handlePlayerMessage(id, msg);
    };
  }

  private getChatRecipients(onlinePlayers?: any[]): ChatRecipient[] {
    const source = onlinePlayers || this.playerSystem.getAllPlayers();
    const recipients: ChatRecipient[] = [];
    for (let i = 0; i < source.length; i++) {
      const p = source[i];
      if (p.isOffline) continue;
      const sid = this.playerToSocket.get(p.id);
      if (sid) {
        recipients.push({
          id: p.id,
          position: { x: p.position.x, y: p.position.y },
        });
      }
    }
    return recipients;
  }

  async init() {
    await this.persistence.init();
    const connected = await this.persistence.testConnection();
    if (connected) {
      console.log("✅ Persistence backend connection verified.");
    }
    this.areMode = this.runtimeSettings.getAREMode();
    const savedData = await this.persistence.load();
    for (const id in savedData) {
      this.ensurePlayerProgressDefaults(savedData[id]);
      this.playerSystem.setPlayer(id, savedData[id]);
    }
    this.loadRuntimeEventTemplates();
    this.loadSceneLayouts();
    this.worldBossDungeonSystem.ensureWorldBossPortalObject(this.worldSystem.objectSystem);
    this.warfrontSystem.initialize(Date.now());
    this.loadSpawns();
    if (this.craftingSystem?.loadRecipes) {
      this.craftingSystem.loadRecipes().catch(() => {});
    }

    for (const npc of this.npcSystem.getAllNPCs()) {
      void loadNpcMemory(this.npcMemoryCache, npc.id).catch(() => {});
    }
    this.initializePlaytesterBindings();
    if (PlaytesterConfig.enabled && this.playtester) {
      const debugLog = this.playtester.getDebugLogPath();
      console.log(
        `[Playtester] enabled id=${PlaytesterConfig.id} tickMs=${PlaytesterConfig.tickMs} log=${debugLog}`,
      );
    }
  }

  private loadSceneLayouts() {
    try {
      if (!fs.existsSync(SCENE_LAYOUT_DIRECTORY)) {
        return;
      }

      const files = fs
        .readdirSync(SCENE_LAYOUT_DIRECTORY)
        .filter((name) => name.toLowerCase().endsWith(".json"))
        .sort((a, b) => a.localeCompare(b));

      if (files.length === 0) {
        return;
      }

      const loadedProfiles: Record<string, SceneProfile> = {};
      const loadedTriggers: SceneTriggerZone[] = [];

      for (const fileName of files) {
        const absolutePath = path.join(SCENE_LAYOUT_DIRECTORY, fileName);
        const raw = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
        const sceneId = isNonEmptyString(raw?.sceneId) ? raw.sceneId.trim() : "";
        if (!sceneId) {
          continue;
        }

        const fallbackProfile = DEFAULT_SCENE_PROFILES[sceneId];
        const rawSpawnPoints = raw?.spawnPoints && typeof raw.spawnPoints === "object" ? raw.spawnPoints : {};
        const spawnPoints: Record<string, SpawnPoint> = {};
        for (const key of Object.keys(rawSpawnPoints)) {
          const entry = rawSpawnPoints[key];
          const x = Number(entry?.x ?? 0);
          const y = Number(entry?.y ?? 0);
          const z = Number(entry?.z ?? 0);
          if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            spawnPoints[key] = { x, y, z };
          }
        }

        const defaultSpawnKey = isNonEmptyString(raw?.defaultSpawnKey)
          ? raw.defaultSpawnKey.trim()
          : fallbackProfile?.defaultSpawnKey || "sp_player_default";

        const profileSpawnPoints = Object.keys(spawnPoints).length > 0 ? spawnPoints : fallbackProfile?.spawnPoints;
        if (!profileSpawnPoints || !profileSpawnPoints[defaultSpawnKey]) {
          continue;
        }

        loadedProfiles[sceneId] = {
          defaultSpawnKey,
          spawnPoints: profileSpawnPoints,
        };

        const rawTriggers = Array.isArray(raw?.triggerZones) ? raw.triggerZones : [];
        for (let i = 0; i < rawTriggers.length; i++) {
          const trigger = rawTriggers[i];
          const id = isNonEmptyString(trigger?.id) ? trigger.id.trim() : `${sceneId}_trigger_${i}`;
          const x = Number(trigger?.x ?? 0);
          const y = Number(trigger?.y ?? 0);
          const radius = Number(trigger?.radius ?? 0);
          const targetSpawnKey = isNonEmptyString(trigger?.targetSpawnKey)
            ? trigger.targetSpawnKey.trim()
            : "";
          if (!id || !targetSpawnKey || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) {
            continue;
          }
          if (!loadedProfiles[sceneId].spawnPoints[targetSpawnKey]) {
            continue;
          }
          const allowedSpawnKeys = Array.isArray(trigger?.allowedSpawnKeys)
            ? trigger.allowedSpawnKeys.filter((k: unknown) => isNonEmptyString(k)).map((k: string) => k.trim())
            : undefined;

          loadedTriggers.push({
            id,
            sceneId,
            x,
            y,
            radius: Math.max(0.25, radius),
            targetSpawnKey,
            allowedSpawnKeys: allowedSpawnKeys && allowedSpawnKeys.length > 0 ? allowedSpawnKeys : undefined,
          });
        }
      }

      if (Object.keys(loadedProfiles).length > 0) {
        this.sceneProfiles = loadedProfiles;
      }
      if (loadedTriggers.length > 0) {
        this.sceneTriggerZones = loadedTriggers;
      }
      this.sceneProfiles = this.worldBossDungeonSystem.buildSceneProfileOverrides(this.sceneProfiles);
      this.sceneTriggerZones = this.worldBossDungeonSystem.buildTriggerOverrides(this.sceneTriggerZones);

      console.log(
        `[SceneLayouts] Loaded ${Object.keys(this.sceneProfiles).length} profiles and ${this.sceneTriggerZones.length} trigger zones`
      );
    } catch (error) {
      console.error("[SceneLayouts] Failed to load scene layouts, using defaults", error);
      this.sceneProfiles = { ...DEFAULT_SCENE_PROFILES };
      this.sceneTriggerZones = [...DEFAULT_SCENE_TRIGGER_ZONES];
    }
  }

  private loadSpawns() {
    try {
      const spawnsPath = path.resolve(process.cwd(), "game-data/spawns/npc-spawns.json");
      if (fs.existsSync(spawnsPath)) {
        const spawnData = JSON.parse(fs.readFileSync(spawnsPath, "utf-8"));
        spawnData.forEach((region: any) => {
          region.spawns.forEach((spawn: any) => {
            this.npcSystem.createNPC(spawn.npcId, "", spawn.x, spawn.y);
          });
        });
      }
      this.spawnWorldBossNow();
    } catch (e) {}
  }

  async saveAll() {
    const allPlayers = this.playerSystem.getAllPlayers();
    const data: any = {};
    for (const p of allPlayers) {
      if (p.id !== "dummy_player") data[p.id] = p;
    }
    await this.persistence.save(data);
  }

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  tick() {
    this.tickCount += 1;
    const now = Date.now();

    // ⚡ Bolt Optimization: Early observation gathering for spatial fast-paths
    const { ids: observedChunkIds, chunks: observedChunkObjects } = this.observerEngine.getObservedChunks();

    // ⚡ Bolt Optimization: Compute onlinePlayers from socket map to avoid O(N_total) scan
    const onlinePlayers: any[] = [];
    for (const pid of this.playerToSocket.keys()) {
      const p = this.playerSystem.getPlayer(pid);
      if (p) onlinePlayers.push(p);
    }

    this.tickFusionIntegrations(now, onlinePlayers);
    this.processTemplateQueue();
    void this.runPlaytesterTick(now);
    const warfrontTick = this.warfrontSystem.tick(now);
    if (warfrontTick.rotated) {
      this.ws.broadcast({
        type: "warfront_cycle_rotated",
        previousCycleId: warfrontTick.previousCycleId ?? null,
        cycleId: warfrontTick.nextCycleId ?? null,
      });
      this.pushAllWarfrontStatuses();
    }
    if (this.warfrontSystem.canSpawnFrontBoss(now).ok) {
      this.trySpawnWarfrontFrontBoss();
    }
    this.warfrontStatusBroadcastTick += 1;
    if (
      this.warfrontStatusBroadcastTick >= WARFRONT_STATUS_BROADCAST_TICK_INTERVAL
      && onlinePlayers.length > 0
    ) {
      this.warfrontStatusBroadcastTick = 0;
      this.pushAllWarfrontStatuses();
    }
    if (this.worldBossRespawnAt > 0 && now >= this.worldBossRespawnAt) {
      this.worldBossRespawnAt = 0;
      this.spawnWorldBossNow();
    }
    const currentBoss = this.npcSystem.getNPC(this.worldBossDungeonSystem.getCurrentBossNpcId());
    if (currentBoss && currentBoss.health > 0) {
      this.worldBossDungeonSystem.maybeStartEncounterIfMissing(currentBoss);
      if (this.worldBossDungeonSystem.shouldBroadcastEncounterPulse()) {
        this.ws.broadcast({
          type: "worldboss_encounter_update",
          dungeonId: WORLD_BOSS_DUNGEON_ID,
          sceneId: WORLD_BOSS_SCENE_ID,
          bossNpcId: currentBoss.id,
          bossName: currentBoss.name,
          hp: currentBoss.health,
          maxHp: currentBoss.maxHealth,
        });
      }
    }
    this.npcSystem.tick(onlinePlayers, this.worldSystem.worldTime);
    this.worldSystem.tick();
    this.cleanupExpiredLoot();
    if (this.playtester && PlaytesterConfig.streamEnabled) {
      this.playtesterStreamCounter += 1;
      if (this.playtesterStreamCounter >= 2) {
        this.playtesterStreamCounter = 0;
        this.ws.broadcast({
          type: "playtester_status",
          status: this.playtester.getStatus(),
        });
      }
    }

    if (this.tickCount % 600 === 0) {
      this.saveAll();
      this.glbPathCache.clear();
    }

    // Broadcast Chunk Resonance every 50 ticks (~5s)
    if (this.tickCount % 50 === 0) {
      this.ws.broadcast({
        t: "chunk_resonance",
        resonance: this.npcSystem.resonanceEngine.getAllResonance()
      } as any);
    }

    // Apply Genetic Echo Buffs to players based on chunk resonance
    if (this.tickCount % 20 === 0) {
      for (const player of onlinePlayers) {
        const chunkKey = this.npcSystem.resonanceEngine.getChunkKey(player.position.x, player.position.y);
        const res = this.npcSystem.resonanceEngine.getResonance(chunkKey);

        if (res.faith > 0.5) {
          // Faith Echo: Mana/Health Regen
          player.health = Math.min(player.maxHealth, player.health + 1);
        }
        if (res.aggression > 0.5) {
          // Aggression Echo: (Simulated) Physical damage bonus flag
          player.tempBuffs = { ...player.tempBuffs, aggressionEcho: true };
        }
        if (res.curiosity > 0.5) {
          // Curiosity Echo: XP multiplier flag
          player.tempBuffs = { ...player.tempBuffs, curiosityEcho: true };
        }
      }
    }

    // NPC chat agent and Ouroboros Engine every 10 ticks (~1s)
    if (this.tickCount % 10 === 0) {
      const recipients = this.getChatRecipients(onlinePlayers);

      if (onlinePlayers.length > 0) {
        const localChatRadiusSq = LOCAL_CHAT_RADIUS * LOCAL_CHAT_RADIUS;
        const allNpcs = this.npcSystem.getAllNPCs();

        // ⚡ Bolt Optimization: Spatial Partitioning for NPCs near players
        // Using a simple grid hash to reduce NPC-to-player proximity check from O(N*P) to O(N + P)
        const playerGrid = new Set<string>();
        for (let i = 0; i < onlinePlayers.length; i++) {
          const p = onlinePlayers[i];
          const gx = Math.floor(p.position.x / LOCAL_CHAT_RADIUS);
          const gy = Math.floor(p.position.y / LOCAL_CHAT_RADIUS);
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              playerGrid.add(`${gx + dx}:${gy + dy}`);
            }
          }
        }

        for (let i = 0; i < allNpcs.length; i++) {
          const npc = allNpcs[i];
          const nx = npc.position.x;
          const ny = npc.position.y;

          // ⚡ Bolt Optimization: Spatial fast-path for NPC proximity
          const chunkId = this.chunkSystem.getChunkId(nx, ny);
          if (!observedChunkIds.has(chunkId)) continue;

          // Quick grid check before doing precise distance calculation
          const ngx = Math.floor(nx / LOCAL_CHAT_RADIUS);
          const ngy = Math.floor(ny / LOCAL_CHAT_RADIUS);
          if (!playerGrid.has(`${ngx}:${ngy}`)) continue;

          let nearPlayer = false;
          for (let j = 0; j < onlinePlayers.length; j++) {
            const p = onlinePlayers[j];
            const pdx = p.position.x - nx;
            const pdy = p.position.y - ny;
            if (pdx * pdx + pdy * pdy <= localChatRadiusSq) {
              nearPlayer = true;
              break;
            }
          }
          if (!nearPlayer) continue;

          // Feed recent chat into NPC memory
          const recentChat = this.chatChannelRouter.getRecentForPosition(npc.position, 10);
          for (let k = 0; k < recentChat.length; k++) {
            const cm = recentChat[k];
            this.npcMemoryCache.recordChat(npc.id, {
              text: cm.text,
              sender: cm.senderName,
              channel: cm.channel,
              ts: cm.ts,
            });
          }

          tickNpcChat(
            npc,
            this.npcMemoryCache,
            this.chatChannelRouter,
            recipients,
            (sid, payload) => this.ws.sendToPlayer(sid, payload),
            (payload) => this.ws.broadcast(payload),
            (pid) => this.playerToSocket.get(pid),
          );
        }
      }

      // Ouroboros engine: perceive → evaluate → act → remember → update
      // ⚡ Bolt Optimization: Defer expensive entity mapping until AI tick
      this.ouroborosEngine.tick(
        this.tickCount,
        this.npcSystem.getAllNPCs().map((n: any) => ({ id: n.id, name: n.name, position: { x: n.position.x, y: n.position.y }, faction: n.faction })),
        onlinePlayers.map((p: any) => ({ id: p.id, name: p.name || p.id, position: { x: p.position.x, y: p.position.y } })),
        this.npcMemoryCache,
        this.npcRelationships,
        this.worldSystem.worldTime,
        this.chatChannelRouter,
        this.statusEmitter,
        recipients,
        (sid: string, payload: unknown) => this.ws.sendToPlayer(sid, payload),
        (payload: unknown) => this.ws.broadcast(payload),
        (pid: string) => this.playerToSocket.get(pid),
      );
    }

    // Flush dirty NPC memory to Supabase every 300 ticks (~30s)
    if (this.tickCount % 300 === 0) {
      void flushDirtyEntries(this.npcMemoryCache).catch(() => {});
    }

    // LiveHeal v2: run health checks via WorldTick (no duplicate scheduling)
    if (this.tickCount % 10 === 0) {
      void this.liveHeal.onTick().catch(() => { /* never crash the tick */ });
    }

    this.broadcastState(onlinePlayers, observedChunkIds, observedChunkObjects);
  }

  public clearGlbPathCache() {
    this.glbPathCache.clear();
  }

  broadcastState(onlinePlayers: any[], observedChunkIds?: Set<string>, observedChunkObjects?: Array<{ id: string; chunkX: number; chunkY: number }>) {
    const tickCount = this.tickCount;
    const entities: any[] = [];
    const chunks: Array<{ id: string; chunkX: number; chunkY: number; objects: any[] }> = [];
    const chunkObjects = new Map<string, any[]>();

    // ⚡ Bolt Optimization: Iterate only over online players for state sync
    for (let i = 0; i < onlinePlayers.length; i++) {
      const p = onlinePlayers[i];
      const chunkId = this.chunkSystem.getChunkId(p.position.x, p.position.y);
      if (observedChunkIds && !observedChunkIds.has(chunkId)) continue;

      entities.push({
        id: p.id,
        type: "player",
        position: { x: p.position.x, y: 0, z: p.position.y }, // Mapping y to z for 3D
        rotation: { x: 0, y: 0, z: 0 },
        name: p.name,
        level: p.level ?? 1,
        glbPath: this.resolveEntityGlbPath("players", p.name || p.id, p.id),
        are: this.areStateCompiler.compileEntity(
          {
            id: p.id,
            type: "player",
            position: { x: p.position.x, y: 0, z: p.position.y },
            health: p.health,
            maxHealth: p.maxHealth,
            visible: true,
          },
          tickCount
        ),
        visible: true,
      });
    }

    const npcsMap = this.npcSystem.getNPCsMap();
    for (const n of npcsMap.values()) {
      const chunkId = this.chunkSystem.getChunkId(n.position.x, n.position.y);
      if (observedChunkIds && !observedChunkIds.has(chunkId)) continue;

      entities.push({
        id: n.id,
        type: "npc",
        position: { x: n.position.x, y: 0, z: n.position.y },
        rotation: { x: 0, y: 0, z: 0 },
        name: n.name,
        level: typeof n?.skills?.combat?.level === "number" ? n.skills.combat.level : 1,
        health: n.health,
        maxHealth: n.maxHealth,
        role: n.role,
        faction: n.faction,
        worldBoss: Boolean(n.worldBoss),
        worldBossDungeonId: n.worldBossMeta?.dungeonId ?? null,
        combatNpcId: n.id,
        combatThreat: n.faction === "Hostile" || n.role === "Enemy",
        glbPath: this.resolveNpcGlbPath(n),
        are: this.areStateCompiler.compileEntity(
          {
            id: n.id,
            type: "npc",
            position: { x: n.position.x, y: 0, z: n.position.y },
            health: n.health,
            maxHealth: n.maxHealth,
            visible: true,
          },
          tickCount
        ),
        visible: true,
      });
    }

    for (const l of this.lootEntities.values()) {
      const chunkId = this.chunkSystem.getChunkId(l.position.x, l.position.y);
      if (observedChunkIds && !observedChunkIds.has(chunkId)) continue;

      entities.push({
        id: l.id,
        type: "loot",
        position: { x: l.position.x, y: 0, z: l.position.y },
        rotation: { x: 0, y: 0, z: 0 },
        glbPath: this.resolveEntityGlbPath("loot", l.item?.id || l.id, l.id),
        are: this.areStateCompiler.compileEntity(
          {
            id: l.id,
            type: "loot",
            position: { x: l.position.x, y: 0, z: l.position.y },
            visible: true,
          },
          tickCount
        ),
        visible: true,
      });
    }

    if (observedChunkObjects) {
      for (const chunk of observedChunkObjects) {
        const objects = this.worldSystem.objectSystem.getObjectsInChunk(chunk.id);
        if (objects.length > 0) {
          chunks.push({
            id: chunk.id,
            chunkX: chunk.chunkX,
            chunkY: chunk.chunkY,
            objects: objects.map((o: WorldObject) => ({
              id: o.id,
              type: o.type,
              position: { x: o.position.x, y: o.position.y, z: o.position.z },
              rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
              scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
              glbPath: this.resolveEntityGlbPath("objects", o.type, o.id),
              are: this.areStateCompiler.compileEntity(
                {
                  id: o.id,
                  type: "object",
                  position: { x: o.position.x, y: o.position.y, z: o.position.z },
                  visible: true,
                },
                tickCount
              ),
            })),
          });
        }
      }
    }

    this.ws.broadcast({
      type: "state",
      tick: tickCount,
      time: this.worldSystem.worldTime,
      entities,
      chunks,
    });
  }

  private resolveEntityGlbPath(category: string, type: string, id: string): string {
    const cacheKey = `${category}:${type}`;
    if (this.glbPathCache.has(cacheKey)) {
      return this.glbPathCache.get(cacheKey)!;
    }

    const path = GLBRegistry.resolvePath(category, type);
    this.glbPathCache.set(cacheKey, path);
    return path;
  }

  private resolveNpcGlbPath(npc: any): string {
    const category = "npcs";
    const type = npc.role || "default";
    const cacheKey = `${category}:${type}`;
    if (this.glbPathCache.has(cacheKey)) {
      return this.glbPathCache.get(cacheKey)!;
    }

    const path = GLBRegistry.resolvePath(category, type);
    this.glbPathCache.set(cacheKey, path);
    return path;
  }

  private checkSceneTriggers(player: any) {
    const now = Date.now();
    const cooldown = this.playerSceneTriggerCooldowns.get(player.id) || 0;
    if (now < cooldown) return;

    for (const zone of this.sceneTriggerZones) {
      if (zone.sceneId !== DEFAULT_SCENE_ID) continue;
      if (zone.allowedSpawnKeys && !zone.allowedSpawnKeys.includes(player.spawnKey || "sp_player_default")) {
        continue;
      }

      const dx = player.position.x - zone.x;
      const dy = player.position.y - zone.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= zone.radius * zone.radius) {
        this.playerSceneTriggerCooldowns.set(player.id, now + SCENE_TRIGGER_COOLDOWN_MS);
        this.teleportPlayer(player, zone.targetSpawnKey);
        break;
      }
    }
  }

  private teleportPlayer(player: any, spawnKey: string) {
    const profile = this.sceneProfiles[DEFAULT_SCENE_ID];
    const spawn = profile.spawnPoints[spawnKey] || profile.spawnPoints[profile.defaultSpawnKey];
    player.position.x = spawn.x;
    player.position.y = spawn.z; // Mapping z back to y
    player.spawnKey = spawnKey;

    const sid = this.playerToSocket.get(player.id);
    if (sid) {
      this.ws.sendToPlayer(sid, {
        type: "teleport",
        x: spawn.x,
        y: spawn.z,
        sceneId: DEFAULT_SCENE_ID,
      });
    }
  }

  private ensurePlayerProgressDefaults(p: any) {
    if (!p.progress) p.progress = {};
    if (typeof p.level !== "number") p.level = 1;
    if (typeof p.xp !== "number") p.xp = 0;
    if (typeof p.health !== "number") p.health = 100;
    if (typeof p.maxHealth !== "number") p.maxHealth = 100;
    ensureDualInventoryFields(p);
  }

  private loadRuntimeEventTemplates() {
    // In a real scenario, this might load from a database or external file
  }

  private processTemplateQueue() {
    const now = Date.now();
    const remaining = [];
    for (const run of this.activeTemplateRuns) {
      if (now >= run.executeAt) {
        this.executeTemplateStep(run);
      } else {
        remaining.push(run);
      }
    }
    this.activeTemplateRuns = remaining;
  }

  private executeTemplateStep(run: ScheduledGMTemplateStep) {
    const step = run.step;
    if (step.broadcast) {
      this.ws.broadcast({ type: "announcement", text: step.broadcast });
    }
    if (step.weather) {
      this.worldSystem.setWeather(step.weather);
    }
    if (step.spawnWaves) {
      step.spawnWaves.forEach((wave) => {
        for (let i = 0; i < wave.count; i++) {
          const rx = (Math.random() - 0.5) * (wave.spread || 5);
          const ry = (Math.random() - 0.5) * (wave.spread || 5);
          const npc = this.npcSystem.createNPC(wave.npcId, wave.name || "", run.originX + rx, run.originY + ry);
          if (wave.hp) {
            npc.health = wave.hp;
            npc.maxHealth = wave.hp;
          }
        }
      });
    }
    if (step.eventId) {
      // Trigger custom logic for specific events
    }
  }

  private spawnWorldBossNow() {
    const bossId = this.worldBossDungeonSystem.getCurrentBossNpcId();
    const spawn = this.worldBossDungeonSystem.getBossSpawnPoint();
    this.npcSystem.createNPC(bossId, "World Boss", spawn.x, spawn.y);
    this.ws.broadcast({ type: "announcement", text: "A World Boss has appeared!" });
  }

  private trySpawnWarfrontFrontBoss() {
    const spawn = this.warfrontSystem.getFrontBossSpawnPoint();
    this.npcSystem.createNPC(WARFRONT_FRONT_BOSS_BASE_NPC_ID, "Warfront General", spawn.x, spawn.y);
    this.ws.broadcast({ type: "announcement", text: "A Warfront General has arrived at the front lines!" });
  }

  private pushAllWarfrontStatuses() {
    const status = this.warfrontSystem.getGlobalStatus();
    this.ws.broadcast({ type: "warfront_status_update", status });
  }

  private cleanupExpiredLoot() {
    const now = Date.now();
    for (const [id, loot] of this.lootEntities.entries()) {
      if (loot.expiresAt && now >= loot.expiresAt) {
        this.lootEntities.delete(id);
      }
    }
  }

  private tickFusionIntegrations(now: number, onlinePlayers: any[]) {
    // Integration point for GameplayFusionDirector
  }

  private async runPlaytesterTick(now: number) {
    if (this.playtester) {
      await this.playtester.tick(now, this.playerSystem.getAllPlayers());
    }
  }

  private initializePlaytesterBindings() {
    if (this.playtester) {
      this.playtester.onAction = (action) => {
        // Handle playtester actions
      };
    }
  }
}
