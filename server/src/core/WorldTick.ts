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
        delaySec: 20,
        spawnWaves: [
          { npcId: "city_guard", name: "City Guard", count: 5, spread: 12, hp: 180 },
          { npcId: "raider", name: "Raider", count: 7, spread: 14, hp: 140 },
        ],
      },
      {
        delaySec: 60,
        economyEvent: { eventType: "trade_boom", duration: 180 },
        broadcast: "Supply lines are stable. Temporary trade bonus active.",
      },
    ],
  },
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAssetPoolEntry(value: unknown): value is string | string[] {
  if (isNonEmptyString(value)) {
    return true;
  }
  return Array.isArray(value) && value.some((item) => isNonEmptyString(item));
}

function normalizeAREMode(value: unknown): AREMode | null {
  if (!isNonEmptyString(value)) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "off") return "off";
  if (normalized === "cpu") return "cpu";
  if (normalized === "shader" || normalized === "on" || normalized === "true" || normalized === "are") {
    return "shader";
  }
  return null;
}

function resolveAREDeviceClass(rawClass: unknown, userAgentRaw: unknown): AREDeviceClass {
  const explicit = isNonEmptyString(rawClass) ? rawClass.trim().toLowerCase() : "";
  if (explicit === "low_end") return "low_end";
  if (explicit === "mobile") return "mobile";
  if (explicit === "desktop") return "desktop";

  const userAgent = isNonEmptyString(userAgentRaw) ? userAgentRaw.toLowerCase() : "";
  if (!userAgent) return "desktop";
  if (userAgent.includes("android") || userAgent.includes("iphone") || userAgent.includes("ipad")) {
    return "mobile";
  }
  return "desktop";
}

function normalizeAREDeviceClass(value: unknown): AREDeviceClass | null {
  if (!isNonEmptyString(value)) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "mobile") return "mobile";
  if (normalized === "low_end" || normalized === "lowend" || normalized === "low-end") return "low_end";
  if (normalized === "desktop") return "desktop";
  return null;
}

export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;
  
  public chunkSystem: ChunkSystem;
  public observerEngine: ObserverEngine;
  public playerSystem: PlayerSystem;
  public combatSystem: CombatSystem;
  public inventorySystem: InventorySystem;
  public npcSystem: NPCSystem;
  public guildSystem: GuildSystem;
  public economySystem: EconomySystem;
  public questSystem: QuestEngine;
  public worldSystem: WorldSystem;
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  public assetPoolResolver: AssetPoolResolver;
  private readonly glbLinksStore: "file";
  private runtimeSettings: RuntimeSettingsStore;
  private areModeAuditTrail: AREModeAuditTrail;
  private areStateCompiler: AREStateCompiler;
  private lootEntities: Map<string, any> = new Map();
  private housingObjects: Map<string, any> = new Map();
  private craftingSystem: any = null;
  private questlineEngine: QuestlineEngine;
  public readonly liveHeal: LiveHealEngine;
  public readonly assetHealthService: AssetHealthService;

  // World generation / placement pipeline
  public readonly placementEngine: WorldPlacementRuleEngine;
  public readonly terrainAdapter: ServerTerrainAdapter;
  public readonly treeAdapter: ExistingTreeGeneratorAdapter;

  private socketToPlayer: Map<string, string> = new Map(); // socketId -> characterName
  private lastActionTimes: Map<string, number> = new Map(); // charName -> timestamp
  private glbPathCache: Map<string, string | undefined> = new Map();
  private sceneTriggerCooldowns: Map<string, number> = new Map();
  private sceneProfiles: Record<string, SceneProfile> = { ...DEFAULT_SCENE_PROFILES };
  private sceneTriggerZones: SceneTriggerZone[] = [...DEFAULT_SCENE_TRIGGER_ZONES];
  private playerToSocket: Map<string, string> = new Map();
  private worldState: GMWorldState = {
    weather: "clear",
    pvp: true,
    friendlyFire: false,
    infiniteWorld: true,
    economySim: true,
    npcAI: true,
    nations: [],
    diplomacy: [],
    territories: {},
    mutedPlayers: [],
    bannedPlayers: [],
    customDialogues: {},
  };
  private areMode: AREMode = "off";
  private readonly socketAREModeOverride = new Map<string, AREMode>();
  private eventTemplates: GMTemplateDefinition[] = Object.values(GM_EVENT_TEMPLATES);
  private pendingTemplateSteps: ScheduledGMTemplateStep[] = [];
  private chatUnsubscribe: (() => void) | null = null;
  public chatChannelRouter: ChatChannelRouter;
  public statusEmitter!: StatusEmitter;
  public npcMemoryCache: NPCMemoryCache;
  public ouroborosEngine: OuroborosEngine;
  public npcRelationships: NPCRelationshipSystem;
  private worldBossDungeonSystem: WorldBossDungeonSystem;
  private voteSystem: VoteSystem;
  private warfrontSystem: WarfrontSystem;
  private playtester: AutonomousPlaytester | null = null;
  private warfrontStatusBroadcastTick = 0;
  private playtesterLastTickAt = 0;
  private playtesterTickAccumulatorMs = 0;
  private playtesterStreamCounter = 0;
  private worldBossRespawnAt = 0;
  private worldBossEncounterSummaries: any[] = [];
  private readonly gameplayFusionDirector: GameplayFusionDirector;
  private readonly USE_ITEM_TOASTS: Record<string, string> = {
    minor_mana_draught: "You drink Minor Mana Draught (+mana).",
    health_potion: "You drink Health Potion (+hp).",
  };

  private ensurePlayerProgressDefaults(player: any): void {
    this.worldBossDungeonSystem.ensurePlayerProgressFields(player);
    ensurePlayerVoteProgress(player);
    ensurePlayerWarfrontProgress(player);
    if (!player.equipment || typeof player.equipment !== "object") {
      player.equipment = { weapon: null, armor: null, offHand: null };
      return;
    }
    if (!("weapon" in player.equipment)) player.equipment.weapon = null;
    if (!("armor" in player.equipment)) player.equipment.armor = null;
    if (!("offHand" in player.equipment)) player.equipment.offHand = null;
  }

  private grantWorldBossWeaponReward(player: any): boolean {
    this.ensurePlayerProgressDefaults(player);
    const rewardHistory = player.worldBossProgress.rewardHistory as string[];
    if (rewardHistory.includes(MEGA_IRON_FIST_ITEM_ID)) {
      return false;
    }
    ensureDualInventoryFields(player);
    const hasInGear = Array.isArray(player.gearInventory)
      && player.gearInventory.some((g: any) => g?.baseId === MEGA_IRON_FIST_ITEM_ID);
    const hasEquipped = player.equipment?.offHand?.id === MEGA_IRON_FIST_ITEM_ID;
    if (hasInGear || hasEquipped) {
      rewardHistory.push(MEGA_IRON_FIST_ITEM_ID);
      return false;
    }
    const gear = normalizeBoundItemMeta({
      uid: `wb_${randomUUID()}`,
      baseId: MEGA_IRON_FIST_ITEM_ID,
      name: "Mega-Iron-Fist-Frustinator",
      rarity: "legendary",
      ilvl: Math.max(1, Number(player.level) || 1),
      stats: {
        dmgMin: 14,
        dmgMax: 26,
        staminaBonus: 22,
        impactBusterBonus: 12,
      },
    });
    addGearToPlayer(player, gear as any);
    rewardHistory.push(MEGA_IRON_FIST_ITEM_ID);
    return true;
  }

  private grantImpactBusterUnlock(player: any): boolean {
    this.ensurePlayerProgressDefaults(player);
    if (player.impactBusterUnlocked) return false;
    player.impactBusterUnlocked = true;
    return true;
  }

  private deliverQueuedRewards(socketId: string, player: any): void {
    this.ensurePlayerProgressDefaults(player);
    if (!Array.isArray(player.pendingRewards) || player.pendingRewards.length === 0) {
      return;
    }
    const queue = [...player.pendingRewards];
    player.pendingRewards = [];
    for (const reward of queue) {
      if (reward?.type === "gear" && reward?.item) {
        addGearToPlayer(player, normalizeBoundItemMeta(reward.item));
      } else {
        player.pendingRewards.push(reward);
      }
    }
    if (queue.length > 0) {
      this.ws.sendToPlayer(socketId, {
        type: "toast",
        kind: "ok",
        text: `Claimed ${queue.length} queued Worldboss reward(s).`,
      });
      this.pushPlayerStateSync(socketId, player);
    }
  }

  private getVoteCallbackBaseUrl(): string {
    const wsUrl = process.env.PUBLIC_WEBSOCKET_URL?.trim();
    if (wsUrl && /^wss?:\/\//i.test(wsUrl)) {
      return wsUrl.replace(/^ws/i, "http").replace(/\/ws\/?$/i, "");
    }
    const gameOrigin = process.env.GAME_ORIGIN?.trim() || process.env.APP_ORIGIN?.trim();
    if (gameOrigin && /^https?:\/\//i.test(gameOrigin)) {
      return gameOrigin.replace(/\/+$/, "");
    }
    const port = Number(process.env.PORT || 3000);
    return `http://localhost:${Number.isFinite(port) ? port : 3000}`;
  }

  private getVoteXpMultiplier(player: any): number {
    this.ensurePlayerProgressDefaults(player);
    return this.voteSystem.getXpMultiplier(player, Date.now());
  }

  private applyXpGainWithVoteBuff(
    player: any,
    baseXp: number,
    source: string,
  ): { baseXp: number; finalXp: number; multiplier: number } {
    const normalizedBase = Math.max(0, Math.floor(Number(baseXp) || 0));
    if (normalizedBase <= 0) return { baseXp: 0, finalXp: 0, multiplier: 1 };
    const multiplier = this.getVoteXpMultiplier(player);
    const finalXp = Math.max(
      normalizedBase,
      Math.floor(normalizedBase * Math.max(1, multiplier)),
    );
    player.xp = (player.xp || 0) + finalXp;
    if (multiplier > 1) {
      const progress = ensurePlayerVoteProgress(player);
      progress.auditLog.push({
        at: Date.now(),
        action: "xp_boost_applied",
        detail: `${source}:${normalizedBase}->${finalXp}`,
      });
      if (progress.auditLog.length > 250) {
        progress.auditLog = progress.auditLog.slice(-250);
      }
    }
    return { baseXp: normalizedBase, finalXp, multiplier };
  }

  private tryHandleWorldBossDefeat(killer: any, target: any): boolean {
    if (this.tryHandleWarfrontFrontBossDefeat(killer, target)) return true;
    if (!this.worldBossDungeonSystem.isWorldBossNpc(target)) return false;
    const playersById = new Map<string, any>();
    for (const p of this.playerSystem.getAllPlayers()) {
      playersById.set(p.id, p);
    }
    const summary = this.worldBossDungeonSystem.finalizeBossDefeat({
      bossNpc: target,
      playersById,
      grantWeaponReward: (player) => this.grantWorldBossWeaponReward(player),
      grantUnlock: (player) => this.grantImpactBusterUnlock(player),
    });
    if (!summary) return true;
    this.worldBossEncounterSummaries.push(summary);
    if (this.worldBossEncounterSummaries.length > 15) {
      this.worldBossEncounterSummaries = this.worldBossEncounterSummaries.slice(-15);
    }
    for (const reward of summary.topRewards) {
      const socketId = this.getSocketForPlayer(reward.playerId);
      if (!socketId) continue;
      if (reward.weaponGranted) {
        this.ws.sendToPlayer(socketId, {
          type: "toast",
          kind: "ok",
          text: `Worldboss Reward: Mega-Iron-Fist-Frustinator (Rank ${reward.rank}).`,
        });
      }
      if (reward.unlockGranted) {
        this.ws.sendToPlayer(socketId, {
          type: "toast",
          kind: "ok",
          text: "Impact Buster unlocked permanently!",
        });
      }
      const p = this.playerSystem.getPlayer(reward.playerId);
      if (p) this.pushPlayerStateSync(socketId, p);
    }
    this.ws.broadcast({
      type: "worldboss_defeated",
      dungeonId: summary.dungeonId,
      encounterId: summary.encounterId,
      bossNpcId: summary.bossNpcId,
      defeatedAt: summary.defeatedAt,
      top: summary.topRewards.map((r) => ({
        playerId: r.playerId,
        playerName: r.playerName,
        rank: r.rank,
        damage: r.damage,
      })),
    });
    this.worldBossRespawnAt = Date.now() + this.worldBossDungeonSystem.getPrimaryDefinition().respawnMs;
    this.worldBossDungeonSystem.prepareNextBossInstance();
    return true;
  }

  private spawnWorldBossNow(): void {
    const cfg = this.worldBossDungeonSystem.prepareNextBossInstance();
    const boss = this.npcSystem.createNPC(cfg.npcId, cfg.name, cfg.position.x, cfg.position.y) as any;
    boss.role = cfg.role;
    boss.faction = cfg.faction;
    boss.position.z = cfg.position.z;
    boss.health = cfg.stats.health;
    boss.maxHealth = cfg.stats.maxHealth;
    if (!boss.skills || typeof boss.skills !== "object") boss.skills = {};
    if (!boss.skills.combat || typeof boss.skills.combat !== "object") {
      boss.skills.combat = { level: cfg.stats.combatLevel };
    } else {
      boss.skills.combat.level = cfg.stats.combatLevel;
    }
    boss.dropTable = cfg.dropTable;
    boss.worldBoss = true;
    boss.worldBossMeta = cfg.worldBossMeta;
    boss.damageMultiplier = cfg.stats.damageMultiplier;
    this.worldBossDungeonSystem.maybeStartEncounterIfMissing(boss);
    this.ws.broadcast({
      type: "worldboss_spawned",
      dungeonId: cfg.worldBossMeta.dungeonId,
      bossNpcId: boss.id,
      sceneId: WORLD_BOSS_SCENE_ID,
      name: boss.name,
    });
  }

  private handleWorldBossDamageAttribution(player: any, npc: any, damage: number): void {
    if (!player || !npc) return;
    if (!this.worldBossDungeonSystem.isWorldBossNpc(npc)) return;
    if (!Number.isFinite(damage) || damage <= 0) return;
    this.worldBossDungeonSystem.noteEncounterDamage(player, npc, Math.floor(damage));
  }

  private getVoteBuffState(player: any): ReturnType<VoteSystem["getBuffState"]> {
    this.ensurePlayerProgressDefaults(player);
    return this.voteSystem.getBuffState(player, Date.now());
  }

  private grantPlayerXpWithVoteBuff(
    player: any,
    baseXp: number,
    _source: "quest" | "crafting" | "gathering" | "combat" | "other" = "other",
  ): number {
    const base = Math.max(0, Math.floor(Number(baseXp) || 0));
    if (base <= 0) return 0;
    this.ensurePlayerProgressDefaults(player);
    const multiplier = this.voteSystem.getXpMultiplier(player, Date.now());
    const finalXp = Math.max(0, Math.floor(base * multiplier));
    player.xp = Math.max(0, Math.floor(Number(player.xp) || 0) + finalXp);
    return finalXp;
  }

  private grantCraftXpIfAny(socketId: string, player: any, baseXp: number): number {
    const gained = this.grantPlayerXpWithVoteBuff(player, baseXp, "crafting");
    if (gained > 0) {
      this.ws.sendToPlayer(socketId, {
        type: "toast",
        kind: "ok",
        text: `Craft XP +${gained}`,
      });
      this.ws.broadcast({
        type: "fx",
        at: { x: player.position.x, y: player.position.y },
        kind: "xp",
        n: gained,
      });
    }
    return gained;
  }

  private pushWarfrontStatus(socketId: string, player: any): void {
    const status = this.warfrontSystem.getStatusForPlayer(player, Date.now());
    this.ws.sendToPlayer(socketId, {
      type: "warfront_status",
      status,
    });
  }

  private pushAllWarfrontStatuses(): void {
    for (const player of this.playerSystem.getAllPlayers()) {
      const socketId = this.getSocketForPlayer(player.id);
      if (!socketId) continue;
      this.pushWarfrontStatus(socketId, player);
    }
  }

  private applyWarfrontContribution(
    player: any,
    socketId: string | null,
    kind: WarfrontSectorKind,
    amount: number,
    source: string,
  ): void {
    const result = this.warfrontSystem.registerContribution(player, kind, amount, Date.now());
    if (!result.accepted) return;
    const resolvedSocket = socketId ?? this.getSocketForPlayer(player.id) ?? null;
    if (resolvedSocket) {
      this.ws.sendToPlayer(resolvedSocket, {
        type: "toast",
        kind: "ok",
        text: `Warfront +${Math.max(0, Math.floor(amount))} (${source})`,
      });
      this.pushWarfrontStatus(resolvedSocket, player);
    }
    if (result.becameBossReady) {
      this.ws.broadcast({
        type: "warfront_frontboss_ready",
        cycleId: this.warfrontSystem.getCycleSnapshot().cycleId,
      });
      this.trySpawnWarfrontFrontBoss();
      this.pushAllWarfrontStatuses();
    }
  }

  private trySpawnWarfrontFrontBoss(): boolean {
    const allowed = this.warfrontSystem.canSpawnFrontBoss(Date.now());
    if (!allowed.ok) return false;
    const point = this.warfrontSystem.getFrontBossSpawnPoint();
    const npcId = `${WARFRONT_FRONT_BOSS_BASE_NPC_ID}_${randomUUID().slice(0, 8)}`;
    const boss = this.npcSystem.createNPC(npcId, "Warfront Herald", point.x, point.y) as any;
    boss.role = "Warfront Boss";
    boss.faction = "Hostile";
    boss.health = 14_000;
    boss.maxHealth = 14_000;
    if (!boss.skills || typeof boss.skills !== "object") boss.skills = {};
    if (!boss.skills.combat || typeof boss.skills.combat !== "object") {
      boss.skills.combat = { level: 52 };
    } else {
      boss.skills.combat.level = 52;
    }
    boss.worldBoss = true;
    boss.worldBossMeta = { dungeonId: "warfront_frontboss", tier: "warfront" };
    boss.dropTable = [{ itemId: "warfront_core", chance: 1.0 }];
    this.warfrontSystem.markFrontBossSpawned(boss.id, Date.now());
    this.ws.broadcast({
      type: "warfront_frontboss_spawned",
      bossNpcId: boss.id,
      name: boss.name,
      mutator: this.warfrontSystem.getActiveFrontBossMutator(),
    });
    this.pushAllWarfrontStatuses();
    return true;
  }

  private tryHandleWarfrontFrontBossDefeat(killer: any, target: any): boolean {
    if (!target || !this.warfrontSystem.isFrontBossNpc(target.id)) return false;
    const mutator = this.warfrontSystem.getActiveFrontBossMutator();
    for (const player of this.playerSystem.getAllPlayers()) {
      if (player.isOffline) continue;
      const socketId = this.getSocketForPlayer(player.id);
      this.applyWarfrontContribution(player, socketId ?? null, "combat", 30, "frontboss_defeat");
    }
    this.warfrontSystem.markFrontBossDefeated(Date.now());
    this.warfrontSystem.markFrontBossDespawned(Date.now());
    this.spawnLootFromNpc(target, killer?.id ?? "");
    this.ws.broadcast({
      type: "warfront_frontboss_defeated",
      bossNpcId: target.id,
      mutator,
      byPlayerId: killer?.id ?? null,
    });
    this.pushAllWarfrontStatuses();
    return true;
  }

  private resolvePublicBaseUrl(): string {
    const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/+$/, "");
    const gameOrigin = process.env.GAME_ORIGIN?.trim() || process.env.APP_ORIGIN?.trim();
    if (gameOrigin) return gameOrigin.replace(/\/+$/, "");
    const port = Number(process.env.PORT || 3000);
    return `http://localhost:${Number.isFinite(port) ? port : 3000}`;
  }

  private pushVoteStatus(socketId: string, player: any): void {
    const status = this.voteSystem.getPlayerVoteStatus(player);
    this.ws.sendToPlayer(socketId, {
      type: "vote_status",
      buff: status.buff,
      banners: status.banners,
    });
  }

  public getPublicVoteBanners() {
    return this.voteSystem.listActiveBannersPublic();
  }

  public getAdminVoteBanners() {
    return this.voteSystem.listAdminBanners();
  }

  public upsertVoteBanner(input: {
    internalId?: string;
    providerKey: string;
    displayName: string;
    bannerImage: string;
    targetUrl: string;
    description?: string;
    isActive?: boolean;
    sortOrder?: number;
    voteWindowHours?: number;
    cooldownHours?: number;
    buffHours?: number;
    verificationMode?: "api_poll" | "callback_token";
    providerConfig?: Record<string, unknown>;
    claimInstructions?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.voteSystem.upsertBanner(input);
  }

  public deleteVoteBanner(internalId: string): boolean {
    return this.voteSystem.deleteBanner(internalId);
  }

  public setVoteBannerOrder(idsInOrder: string[]) {
    return this.voteSystem.setBannerOrder(idsInOrder);
  }

  public getVoteAdminDiagnostics(limit = 120) {
    return this.voteSystem.getAdminDiagnostics(this.playerSystem.getAllPlayers(), limit);
  }

  public handleVoteProviderCallback(payload: {
    sessionId: string;
    callbackToken: string;
    providerKey?: string;
    bannerId?: string;
    providerVoteId?: string;
    evidence?: Record<string, unknown>;
  }): {
    ok: boolean;
    reason?: string;
    playerId?: string;
    bannerId?: string;
    sessionId?: string;
  } {
    const result = this.voteSystem.markCallbackVerified(
      this.playerSystem.getAllPlayers(),
      payload,
    );
    if (result.ok && result.playerId) {
      const socketId = this.getSocketForPlayer(result.playerId);
      const player = this.playerSystem.getPlayer(result.playerId);
      if (socketId && player) {
        this.ws.sendToPlayer(socketId, {
          type: "toast",
          kind: "ok",
          text: "Vote verification callback received. Claim your reward in the vote menu.",
        });
        this.pushVoteStatus(socketId, player);
      }
    }
    return result;
  }

  private getSceneProfile(sceneId: string | undefined): { sceneId: string; profile: SceneProfile } {
    const resolvedSceneId = sceneId && this.sceneProfiles[sceneId] ? sceneId : DEFAULT_SCENE_ID;
    return { sceneId: resolvedSceneId, profile: this.sceneProfiles[resolvedSceneId] };
  }

  private resolveSpawn(sceneId: string | undefined, spawnKey: string | undefined) {
    const { sceneId: resolvedSceneId, profile } = this.getSceneProfile(sceneId);
    const resolvedSpawnKey = spawnKey && profile.spawnPoints[spawnKey] ? spawnKey : profile.defaultSpawnKey;
    const spawnPoint = profile.spawnPoints[resolvedSpawnKey];
    return { sceneId: resolvedSceneId, spawnKey: resolvedSpawnKey, spawnPoint };
  }

  private applySpawnToPlayer(player: any, sceneId: string | undefined, spawnKey: string | undefined) {
    const spawn = this.resolveSpawn(sceneId, spawnKey);
    player.sceneId = spawn.sceneId;
    player.spawnKey = spawn.spawnKey;
    player.position = player.position || { x: 0, y: 0, z: 0 };
    player.position.x = spawn.spawnPoint.x;
    // The gameplay simulation uses x/y plane and maps y -> z for rendering.
    player.position.y = spawn.spawnPoint.z;
    player.position.z = spawn.spawnPoint.y;
    return spawn;
  }

  private processSceneTriggers(socketId: string, player: any) {
    const now = Date.now();
    const cooldownUntil = this.sceneTriggerCooldowns.get(player.id) || 0;
    if (now < cooldownUntil) {
      return;
    }

    const currentSceneId = isNonEmptyString(player.sceneId) ? player.sceneId : DEFAULT_SCENE_ID;
    const currentSpawnKey = isNonEmptyString(player.spawnKey) ? player.spawnKey : "";
    for (const trigger of this.sceneTriggerZones) {
      if (trigger.sceneId !== currentSceneId) {
        continue;
      }
      if (trigger.allowedSpawnKeys && !trigger.allowedSpawnKeys.includes(currentSpawnKey)) {
        continue;
      }

      const dx = player.position.x - trigger.x;
      const dy = player.position.y - trigger.y;
      if (dx * dx + dy * dy > trigger.radius * trigger.radius) {
        continue;
      }

      if (trigger.dungeonId === WORLD_BOSS_DUNGEON_ID) {
        const entryCheck = this.worldBossDungeonSystem.canEnterWorldBossDungeon(player);
        if (!entryCheck.ok) {
          this.ws.sendToPlayer(socketId, {
            type: "toast",
            kind: "warn",
            text: entryCheck.reason ?? "You cannot enter this dungeon now.",
          });
          return;
        }
      }
      const targetSceneId = trigger.targetSceneId || trigger.sceneId;
      const spawn = this.applySpawnToPlayer(player, targetSceneId, trigger.targetSpawnKey);
      this.sceneTriggerCooldowns.set(player.id, now + SCENE_TRIGGER_COOLDOWN_MS);
      this.observerEngine.updatePosition(socketId, player.position);
      this.ws.sendToPlayer(socketId, {
        type: "scene_changed",
        sceneId: spawn.sceneId,
        spawnKey: spawn.spawnKey,
        spawnPosition: spawn.spawnPoint,
        via: "zone_trigger",
        triggerId: trigger.id,
        dungeonId: trigger.dungeonId,
      });
      if (trigger.dungeonId === WORLD_BOSS_DUNGEON_ID) {
        this.ws.sendToPlayer(socketId, {
          type: "worldboss_entered",
          dungeonId: WORLD_BOSS_DUNGEON_ID,
          sceneId: WORLD_BOSS_SCENE_ID,
        });
      }
      return;
    }
  }

  private pushPlayerStateSync(socketId: string, player: any) {
    const invSummary = this.inventorySystem.getInventorySummary(player);
    this.ws.sendToPlayer(socketId, {
      type: "stats_sync",
      gold: player.gold,
      xp: player.xp,
      kills: Number(player.kills) || 0,
      deaths: Number(player.deaths) || 0,
      level: player.level ?? 1,
      health: player.health,
      maxHealth: player.maxHealth ?? 100,
      stamina: player.stamina,
      maxStamina: player.maxStamina ?? 100,
      mana: player.mana ?? 25,
      maxMana: player.maxMana ?? 25,
      dead: Boolean(player.dead),
      deathAt: typeof player.deathAt === "number" ? player.deathAt : 0,
      respawnAvailableAt: player.dead
        ? (typeof player.deathAt === "number" ? player.deathAt : 0) + GameConfig.playerRespawnDelayMs
        : 0,
      quests: this.questSystem.getQuestSyncForClient(player),
      inventory: player.inventory,
      gear: invSummary.gear ?? player.gearInventory ?? [],
      equipment: player.equipment,
      maxWeight: invSummary.maxWeight,
      inventoryWeight: invSummary.weight,
      skillCooldownUntil: buildSkillCooldownUntilPayload(player, Date.now()),
      impactBusterUnlocked: Boolean(player.impactBusterUnlocked),
      combatTargetNpcId: player.combatTargetNpcId ?? null,
      attributes: player.attributes,
      voteBuffState: this.getVoteBuffState(player),
    });
  }

  private findTargetNpcForPlayer(player: any): any | null {
    const targetId = typeof player?.combatTargetNpcId === "string" ? player.combatTargetNpcId : "";
    if (targetId) {
      const explicit = this.npcSystem.getNPC(targetId);
      if (explicit && explicit.health > 0) return explicit;
    }
    let best: any | null = null;
    let bestDistSq = Infinity;
    for (const npc of this.npcSystem.getAllNPCs()) {
      if (!npc || npc.health <= 0) continue;
      const dx = (npc.position?.x ?? 0) - player.position.x;
      const dy = (npc.position?.y ?? 0) - player.position.y;
      // ⚡ Bolt Optimization: Use squared distance to avoid Math.hypot()
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        best = npc;
        bestDistSq = distSq;
      }
    }
    return best;
  }

  private isWithinDistance(a: { x: number; y: number }, b: { x: number; y: number }, d: number): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    // ⚡ Bolt Optimization: Use squared distance to avoid Math.hypot()
    return dx * dx + dy * dy <= d * d;
  }

  /** True only when the bag existed, was allowed, in range, and contents were granted. */
  private tryPickupLoot(socketId: string, player: any, lootId: string): boolean {
    const trimmed = typeof lootId === "string" ? lootId.trim() : "";
    if (!trimmed) return false;
    const bag = this.lootEntities.get(trimmed);
    if (!bag) {
      this.ws.sendToPlayer(socketId, { type: "toast", text: "Loot not found." });
      return false;
    }
    if (bag.ownerId && bag.ownerId !== player.id && Date.now() < (bag.ownerExclusiveUntil ?? 0)) {
      this.ws.sendToPlayer(socketId, { type: "toast", text: "Loot belongs to another player." });
      return false;
    }
    const lootPos = bag.position ?? { x: bag.x ?? 0, y: bag.y ?? 0 };
    if (!this.isWithinDistance(player.position, lootPos, GameConfig.interactDistance)) {
      this.ws.sendToPlayer(socketId, { type: "toast", text: "Too far away." });
      return false;
    }
    ensureDualInventoryFields(player);
    const pickedItems: { itemId: string; qty: number; name?: string }[] = [];
    const pickedGear: any[] = [];
    if (Array.isArray(bag.items)) {
      for (const it of bag.items) {
        if (!it?.id) continue;
        const qty = Math.max(1, Number(it.quantity) || 1);
        this.inventorySystem.addItem(player, { id: it.id, quantity: qty });
        const def = ItemRegistry.getItem(it.id);
        pickedItems.push({ itemId: it.id, qty, name: def?.name });
      }
    }
    if (Array.isArray(bag.gear)) {
      for (const g of bag.gear) {
        if (!g || typeof g.uid !== "string") continue;
        addGearToPlayer(player, g);
        pickedGear.push({
          uid: g.uid,
          baseId: g.baseId,
          name: g.name,
          rarity: g.rarity,
          ilvl: g.ilvl,
        });
      }
    }
    const gold = typeof bag.gold === "number" ? bag.gold : 0;
    if (gold > 0) player.gold = (player.gold ?? 0) + gold;
    this.lootEntities.delete(trimmed);
    this.ws.broadcast({ type: "loot_despawned", lootId: trimmed });
    this.ws.sendToPlayer(socketId, {
      type: "loot_picked",
      lootId: trimmed,
      items: pickedItems,
      gear: pickedGear,
      gold,
    });
    if (gold > 0) {
      this.ws.sendToPlayer(socketId, { type: "fx", at: player.position, kind: "gold", n: gold });
    }
    this.ws.sendToPlayer(socketId, { type: "toast", text: `Beute eingesammelt${gold > 0 ? ` (+${gold} Gold)` : ""}.` });
    this.pushPlayerStateSync(socketId, player);
    return true;
  }

  private loadRuntimeEventTemplates() {
    const templatesPath = path.resolve(process.cwd(), "game-data/gm/event-templates.json");
    if (!fs.existsSync(templatesPath)) {
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(templatesPath, "utf-8"));
      if (!Array.isArray(parsed)) {
        return;
      }
      const runtimeTemplates: GMTemplateDefinition[] = [];
      for (const raw of parsed) {
        if (!isNonEmptyString(raw?.id) || !isNonEmptyString(raw?.name) || !Array.isArray(raw?.steps)) {
          continue;
        }
        const steps: GMTemplateStep[] = raw.steps
          .map((step: any) => ({
            delaySec: Number(step?.delaySec) || 0,
            eventId: isNonEmptyString(step?.eventId) ? step.eventId.trim() : undefined,
            title: isNonEmptyString(step?.title) ? step.title.trim() : undefined,
            description: isNonEmptyString(step?.description) ? step.description.trim() : undefined,
            broadcast: isNonEmptyString(step?.broadcast) ? step.broadcast.trim() : undefined,
            weather: isNonEmptyString(step?.weather) ? step.weather.trim() : undefined,
            time: Number.isFinite(Number(step?.time)) ? Number(step.time) : undefined,
            economyEvent:
              step?.economyEvent && isNonEmptyString(step.economyEvent.eventType)
                ? {
                    eventType: step.economyEvent.eventType.trim(),
                    duration: Number(step.economyEvent.duration) || 300,
                  }
                : undefined,
            spawnWaves: Array.isArray(step?.spawnWaves)
              ? step.spawnWaves
                  .filter((w: any) => isNonEmptyString(w?.npcId))
                  .map((w: any) => ({
                    npcId: w.npcId.trim(),
                    name: isNonEmptyString(w?.name) ? w.name.trim() : undefined,
                    count: Math.max(1, Number(w?.count) || 1),
                    spread: Math.max(0.5, Number(w?.spread) || 6),
                    hp: Number.isFinite(Number(w?.hp)) ? Number(w.hp) : undefined,
                  }))
              : undefined,
          }))
          .filter((step: GMTemplateStep) => Number.isFinite(step.delaySec));

        if (steps.length === 0) {
          continue;
        }
        runtimeTemplates.push({
          id: raw.id.trim(),
          name: raw.name.trim(),
          description: isNonEmptyString(raw?.description) ? raw.description.trim() : "",
          steps,
        });
      }
      if (runtimeTemplates.length > 0) {
        this.eventTemplates = runtimeTemplates;
      }
    } catch (error) {
      console.error("[GM Templates] Failed to parse runtime templates", error);
    }
  }

  private runEventTemplate(template: GMTemplateDefinition, socketId: string, caller: any) {
    const now = Date.now();
    const runId = `${template.id}_${now}`;
    const originX = Number(caller?.position?.x) || 0;
    const originY = Number(caller?.position?.y) || 0;
    for (const step of template.steps) {
      this.pendingTemplateSteps.push({
        runId,
        templateId: template.id,
        executeAt: now + Math.max(0, Number(step.delaySec) || 0) * 1000,
        originX,
        originY,
        step,
      });
    }
    this.pendingTemplateSteps.sort((a, b) => a.executeAt - b.executeAt);
    this.sendGMStatus(socketId, "info", `Template queued: ${template.name} (${template.steps.length} steps)`, { runId });
  }

  private executeTemplateStep(job: ScheduledGMTemplateStep) {
    const step = job.step;
    if (isNonEmptyString(step.weather)) {
      this.worldState.weather = step.weather;
      this.ws.broadcast({ type: "world_event", event: "weather_change", weather: step.weather });
    }
    if (Number.isFinite(step.time as number)) {
      this.worldSystem.worldTime = (((step.time as number) % 24) + 24) % 24;
      this.ws.broadcast({ type: "world_event", event: "time_change", time: this.worldSystem.worldTime });
    }
    if (step.eventId || step.title || step.description) {
      this.ws.broadcast({
        type: "world_event",
        event: step.eventId || "template_event",
        title: step.title || "Template Event",
        description: step.description || "",
        templateId: job.templateId,
        runId: job.runId,
      });
    }
    if (isNonEmptyString(step.broadcast)) {
      this.ws.broadcast({
        type: "chat_message",
        channel: "system",
        sender: "[EVENT]",
        text: step.broadcast,
        timestamp: Date.now(),
      });
    }
    if (step.economyEvent) {
      this.ws.broadcast({
        type: "world_event",
        event: "economy_event",
        eventType: step.economyEvent.eventType,
        duration: step.economyEvent.duration,
      });
    }
    if (Array.isArray(step.spawnWaves)) {
      for (const wave of step.spawnWaves) {
        for (let i = 0; i < wave.count; i++) {
          const angle = (Math.PI * 2 * i) / wave.count;
          const spread = wave.spread || 6;
          const spawnX = job.originX + Math.cos(angle) * spread;
          const spawnY = job.originY + Math.sin(angle) * spread;
          const npcUid = `${wave.npcId}_${job.runId}_${i}`;
          const npc = this.npcSystem.createNPC(npcUid, wave.name || wave.npcId, spawnX, spawnY);
          if (Number.isFinite(wave.hp as number)) {
            npc.health = wave.hp as number;
            npc.maxHealth = Math.max(npc.maxHealth || 1, npc.health);
          }
        }
      }
    }
  }

  private processTemplateQueue() {
    if (this.pendingTemplateSteps.length === 0) {
      return;
    }
    const now = Date.now();
    while (this.pendingTemplateSteps.length > 0 && this.pendingTemplateSteps[0].executeAt <= now) {
      const step = this.pendingTemplateSteps.shift()!;
      this.executeTemplateStep(step);
    }
  }

  private findNearbyFusionContracts(
    x: number,
    y: number,
    radius: number,
  ): string[] {
    const available = this.gameplayFusionDirector
      .getConstructionContracts()
      .filter((row) => row.status === "available");
    const radiusSq = radius * radius;
    const inRadius = available
      .filter((row) => {
        const px = Number(row?.position?.x ?? 0);
        const py = Number(row?.position?.y ?? 0);
        const dx = px - x;
        const dy = py - y;
        // ⚡ Bolt Optimization: Use squared distance to avoid Math.hypot()
        return dx * dx + dy * dy <= radiusSq;
      })
      .map((row) => row.id);
    if (inRadius.length > 0) return inRadius;
    return available.slice(0, 3).map((row) => row.id);
  }

  private async runFusionContractsForNpc(npc: any): Promise<void> {
    const role = String(npc?.role || "").toLowerCase();
    if (
      !role.includes("contractor")
      && !role.includes("builder")
      && !role.includes("repair")
      && !role.includes("designer")
      && !role.includes("engineer")
    ) {
      return;
    }
    const near = this.findNearbyFusionContracts(
      Number(npc?.position?.x ?? 0),
      Number(npc?.position?.y ?? 0),
      40,
    );
    if (near.length === 0) return;
    const claim = near[0];
    if (!claim) return;
    const assigned = this.gameplayFusionDirector.assignContractToNpc(
      claim,
      String(npc.id),
    );
    if (!assigned) return;
    this.statusEmitter.emitNpcThinking(
      String(npc?.name || npc?.id || "NPC"),
      `[contract_assigned] ${claim}`,
      npc.position || { x: 0, y: 0, z: 0 },
    );
    await this.gameplayFusionDirector.completeContract(claim, {
      completedByNpcId: String(npc.id),
      worldObjectSystem: this.worldSystem.objectSystem,
    });
  }

  private tickFusionIntegrations(now: number): void {
    if (this.tickCount % 50 === 0) {
      const contentRoot = getContentDataRoot();
      const repoRoot = findRepoRootWithGameData() ?? path.resolve(process.cwd(), "..");
      const audit = auditContentModelPaths(contentRoot, repoRoot);
      const needs = buildAdminGlbModelNeeds({
        missingModels: audit.missing,
        modelUrls: this.glbRegistry.scanModels(),
        links: this.glbRegistry.getLinks(),
        pools: this.assetPoolResolver.getDocument(),
        objectTypes: loadObjectTypeChoicesForAdmin(),
      });
      this.gameplayFusionDirector.syncModelNeeds(needs.needs, needs.satisfied, now);
    }

    const onlinePlayers = this.playerSystem.getAllPlayers().filter((p: any) => !p.isOffline);
    const npcs = this.npcSystem.getAllNPCs();
    this.gameplayFusionDirector.tick({
      now,
      npcs,
      players: onlinePlayers,
      getQuestSyncForClient: (player: any) => this.questSystem.getQuestSyncForClient(player),
      npcMemoryCache: this.npcMemoryCache,
      emitNpcThinking: (npcName, thought, position) =>
        this.statusEmitter.emitNpcThinking(npcName, thought, { x: position.x, y: position.y, z: 0 }),
    });

    void this.npcSystem.runFusionHeuristics(
      {
        worldTime: this.worldSystem.worldTime,
        notifyNpcThinking: (npcName, thought, position) =>
          this.statusEmitter.emitNpcThinking(npcName, thought, position),
        onClaimContract: async (contractId, npc) => {
          this.gameplayFusionDirector.assignContractToNpc(
            contractId,
            String(npc?.id || "npc"),
          );
          await this.gameplayFusionDirector.completeContract(contractId, {
            completedByNpcId: String(npc?.id || "npc"),
            worldObjectSystem: this.worldSystem.objectSystem,
          });
        },
        findNearbyConstructionContracts: (x, y, radius) =>
          this.findNearbyFusionContracts(x, y, radius),
        placeEchoBeacon: async (key, npc, kind, ttlMs) => {
          const target = this.npcSystem.getNPC(String(npc?.id || ""));
          if (!target?.position) return;
          const beacons = this.gameplayFusionDirector.getQuestEchoBeacons(now);
          const hasBeacon = beacons.some((b) => b.npcId === String(target.id));
          if (!hasBeacon) return;
          this.statusEmitter.emitNpcThinking(
            String(target.name || target.id),
            `[echo_beacon:${kind}] ${key}`,
            { x: Number(target.position.x) || 0, y: Number(target.position.y) || 0, z: 0 },
          );
          void ttlMs;
        },
        evaluateAdaptiveProfileForNpc: (npc) => {
          const adaptive = this.gameplayFusionDirector.resolveNpcGlbOverride(npc, now);
          npc.fusionAdaptiveGlbPath = adaptive ?? null;
          npc.fusionProfileTag = adaptive ? "adaptive" : "default";
        },
      },
      npcs,
    );

    for (const npc of npcs) {
      void this.runFusionContractsForNpc(npc);
    }
  }

  private buildFusionQuestEchoProvider(): ((npc: any) => { x: number; y: number } | null) {
    return (_npc: any) => {
      const beacons = this.gameplayFusionDirector.getQuestEchoBeacons(Date.now());
      const first = beacons[0];
      if (!first) return null;
      return {
        x: Number(first.position?.x ?? 0) || 0,
        y: Number(first.position?.y ?? 0) || 0,
      };
    };
  }

  private getSocketForPlayer(playerNameOrId: string): string | undefined {
    const socketById = this.playerToSocket.get(playerNameOrId);
    if (socketById) return socketById;
    for (const p of this.playerSystem.getAllPlayers()) {
      if (p.name === playerNameOrId) {
        return this.playerToSocket.get(p.id);
      }
    }
    return undefined;
  }

  private isSocketBound(socketId: string): boolean {
    return this.socketToPlayer.has(socketId);
  }

  public bindSyntheticSocketToPlayer(socketId: string, playerId: string): void {
    this.socketToPlayer.set(socketId, playerId);
    this.playerToSocket.set(playerId, socketId);
    this.observerEngine.register(socketId, {
      x: Number(this.playerSystem.getPlayer(playerId)?.position?.x) || 0,
      y: Number(this.playerSystem.getPlayer(playerId)?.position?.y) || 0,
    });
  }

  public getOrCreatePlayerForAutomation(id: string, displayName: string): any {
    let player = this.playerSystem.getPlayer(id);
    if (!player) {
      player = this.playerSystem.createPlayer(id, displayName);
      this.ensurePlayerProgressDefaults(player);
      player.isOffline = false;
    }
    return player;
  }

  public getLootEntitiesForAutomation(): Map<string, any> {
    return this.lootEntities;
  }

  public getWorldObjectsForAutomation(): any[] {
    const map = this.worldSystem.objectSystem?.getObjectsMap?.();
    if (map && typeof map.values === "function") {
      return Array.from(map.values());
    }
    return [];
  }

  public async handleSyntheticMessage(socketId: string, msg: Record<string, unknown>): Promise<void> {
    const messageType = typeof msg?.type === "string" ? msg.type : "";
    if (messageType === "ping") return;
    if (messageType === "login") return;
    const uid = this.socketToPlayer.get(socketId);
    if (!uid) {
      this.bindSyntheticSocketToPlayer(socketId, PlaytesterConfig.id);
    }
    const handler = this.ws.onPlayerMessage;
    if (!handler) return;
    await handler(socketId, msg);
  }

  private async runPlaytesterTick(now: number): Promise<void> {
    if (!this.playtester || !PlaytesterConfig.enabled) return;
    const elapsed = this.playtesterLastTickAt > 0 ? now - this.playtesterLastTickAt : PlaytesterConfig.tickMs;
    this.playtesterLastTickAt = now;
    this.playtesterTickAccumulatorMs += Math.max(0, elapsed);
    if (this.playtesterTickAccumulatorMs < PlaytesterConfig.tickMs) {
      return;
    }
    this.playtesterTickAccumulatorMs = 0;
    await this.playtester.tick(now);
  }

  private initializePlaytesterBindings(): void {
    if (!PlaytesterConfig.enabled || !this.playtester) return;
    this.bindSyntheticSocketToPlayer(PlaytesterConfig.syntheticSocketId, PlaytesterConfig.id);
    const player = this.getOrCreatePlayerForAutomation(PlaytesterConfig.id, PlaytesterConfig.displayName);
    this.ensurePlayerProgressDefaults(player);
    player.isOffline = false;
    this.observerEngine.updatePosition(PlaytesterConfig.syntheticSocketId, {
      x: Number(player.position?.x) || 0,
      y: Number(player.position?.y) || 0,
    });
  }

  public buildPlaytesterMonitorPayload(opts?: {
    performanceMode?: boolean;
    placeholderMode?: boolean;
    radiusChunks?: number;
  }): PlaytesterMonitorUpdatePayload | null {
    if (!this.playtester || !PlaytesterConfig.enabled || !PlaytesterConfig.streamEnabled) {
      return null;
    }
    return this.playtester.buildMonitorPayload(opts);
  }

  public getPlaytesterDebugLogPath(): string | null {
    return this.playtester ? this.playtester.getDebugLogPath() : null;
  }

  private getPlayerByNameOrId(playerNameOrId: string) {
    const byId = this.playerSystem.getPlayer(playerNameOrId);
    if (byId) return byId;
    return this.playerSystem.getAllPlayers().find((p: any) => p.name === playerNameOrId) || null;
  }

  private resolveWeaponDamageBonus(player: any, weaponRow: any): number {
    let bonus = Number(weaponRow?.damage) || 0;
    const uid = typeof weaponRow?.uid === "string" ? weaponRow.uid.trim() : "";
    if (!uid || !Array.isArray(player.gearInventory)) return bonus;
    const g = player.gearInventory.find((x: any) => x && x.uid === uid);
    if (!g?.stats || typeof g.stats !== "object") return bonus;
    const dMin = Number(g.stats.dmgMin);
    const dMax = Number(g.stats.dmgMax);
    if (Number.isFinite(dMin) && Number.isFinite(dMax)) {
      bonus += Math.floor((dMin + dMax) / 2);
    } else if (Number.isFinite(dMax)) {
      bonus += Math.floor(dMax);
    } else if (Number.isFinite(dMin)) {
      bonus += Math.floor(dMin);
    }
    return bonus;
  }

  private spawnLootFromNpc(npc: any, killerId: string): void {
    let items: any[] = [];
    let gold = Math.floor(Math.random() * 5) + 1;
    try {
      const { LootSystem } = require("../modules/loot/LootSystem.js");
      const ls = new LootSystem();
      const roll = ls.rollLoot(npc.lootTableId ?? npc.id);
      if (roll) {
        if (Array.isArray(roll.items) && roll.items.length > 0) items = roll.items;
        if (typeof roll.gold === "number" && roll.gold > 0) gold = roll.gold;
      }
    } catch {
      /* LootSystem load may fail if loot-tables.json not configured */
    }

    const killer = this.playerSystem.getPlayer(killerId);
    if (killer) {
      ensureDualInventoryFields(killer);
      killer.lootPity.killsSinceLegendary += 1;
      killer.lootPity.killsSinceSet += 1;
    }

    const gearPieces: any[] = [];
    const base = SAMPLE_DROP_BASES["rusted_blade"];
    if (base && killer) {
      const mf =
        pityBonus(killer.lootPity.killsSinceLegendary) + pityBonus(killer.lootPity.killsSinceSet, 0.002, 0.06);
      const rarity = rarityRoll(mf);
      const ilvl = Math.max(1, Math.floor(Number(killer.level) || 1));
      const gen = generateItem({
        base,
        ilvl,
        rarity,
        affixes: SAMPLE_DROP_AFFIXES,
        mf,
        legendaryPowerId: rarity === "legendary" ? "lp_vampiric" : undefined,
      });
      gearPieces.push(generatedItemToGearItem(gen));
      if (rarity === "legendary") killer.lootPity.killsSinceLegendary = 0;
      if (rarity === "set") killer.lootPity.killsSinceSet = 0;
    }

    const id = `loot_${Date.now()}_${npc.id}`;
    const bag: any = {
      id,
      position: { x: npc.position?.x ?? 0, y: npc.position?.y ?? 0 },
      items: items.map((it: any) => ({
        id: it.id ?? it.itemId,
        quantity: it.quantity ?? it.qty ?? 1,
      })),
      gear: gearPieces,
      gold,
      ownerId: killerId,
      ownerExclusiveUntil: Date.now() + 30_000,
      despawnAt: Date.now() + GameConfig.lootDespawnMs,
    };
    this.lootEntities.set(id, bag);
    this.ws.broadcast({
      type: "loot_spawned",
      loot: {
        id,
        x: bag.position.x,
        y: bag.position.y,
        items: bag.items.map((it: any) => ({ itemId: it.id, qty: it.quantity })),
        gear: Array.isArray(bag.gear)
          ? bag.gear.map((g: any) => ({
              uid: g.uid,
              baseId: g.baseId,
              name: g.name,
              rarity: g.rarity,
              ilvl: g.ilvl,
            }))
          : [],
        gold: bag.gold,
        ownerId: killerId,
        despawnAt: bag.despawnAt,
      },
    });
  }

  private cleanupExpiredLoot(): void {
    if (this.tickCount % 10 !== 0) return;
    const now = Date.now();
    for (const [id, bag] of this.lootEntities) {
      if (typeof bag.despawnAt === "number" && bag.despawnAt <= now) {
        this.lootEntities.delete(id);
        this.ws.broadcast({ type: "loot_despawned", lootId: id });
      }
    }
  }

  private resolvePlayerRespawnPoint(player: any): { x: number; z: number; label?: string } {
    const profiles = this.sceneProfiles;
    const sceneId = player.sceneId ?? player.currentZone ?? "didis_hub";
    const profile = profiles?.[sceneId];
    const defaultSp = profile?.spawnPoints?.["sp_player_default"];
    if (defaultSp) return { x: defaultSp.x, z: defaultSp.z ?? defaultSp.y ?? 0, label: sceneId };
    return { x: 0, z: 0, label: "Hub" };
  }

  private async broadcastPartySyncForParty(partyId: string): Promise<void> {
    const { getPartyById } = await import("../modules/party/partySystem.js");
    const party = getPartyById(partyId);
    if (!party) return;

    const membersPayload = [...party.members].map((mid) => {
      const p = this.playerSystem.getPlayer(mid);
      return {
        id: mid,
        name: p?.name ?? mid,
        health: p?.health ?? 0,
        maxHealth: p?.maxHealth ?? 100,
        level: p?.level ?? 1,
        isLeader: mid === party.leaderId,
      };
    });

    for (const mid of party.members) {
      const sock = this.getSocketForPlayer(mid);
      if (sock) {
        this.ws.sendToPlayer(sock, {
          type: "party_sync",
          partyId: party.id,
          members: membersPayload,
        });
      }
    }
  }

  private sendGMStatus(socketId: string, level: "info" | "error", message: string, extra: Record<string, any> = {}) {
    this.ws.sendToPlayer(socketId, { type: "gm_status", level, message, ...extra });
  }

  private resolveChatScope(value: unknown): RelayedChatScope {
    if (!isNonEmptyString(value)) return "global";
    const normalized = value.trim().toLowerCase();
    if (normalized === "zone") return "zone";
    if (normalized === "party") return "party";
    return "global";
  }

  private resolvePlayerZoneId(player: any): string | undefined {
    return isNonEmptyString(player?.sceneId) ? player.sceneId.trim() : undefined;
  }

  private resolvePlayerPartyId(player: any): string | undefined {
    return isNonEmptyString(player?.partyId) ? player.partyId.trim() : undefined;
  }

  private broadcastChatMessage(msg: RelayedChatMessage): void {
    const payload = {
      type: "chat_message",
      payload: msg,
      scope: msg.scope,
      channel: msg.scope,
      sender: msg.senderName,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.text,
      zoneId: msg.zoneId,
      partyId: msg.partyId,
      ts: msg.ts,
      timestamp: msg.ts,
    };

    if (msg.scope === "global") {
      this.ws.broadcast(payload);
      return;
    }

    for (const player of this.playerSystem.getAllPlayers()) {
      const socketId = this.playerToSocket.get(player.id);
      if (!socketId) continue;

      if (msg.scope === "zone") {
        const zoneId = this.resolvePlayerZoneId(player);
        if (!zoneId || zoneId !== msg.zoneId) continue;
      } else if (msg.scope === "party") {
        const partyId = this.resolvePlayerPartyId(player);
        if (!partyId || partyId !== msg.partyId) continue;
      }

      this.ws.sendToPlayer(socketId, payload);
    }
  }

  private sendGMPreviewSnapshot(socketId: string) {
    const players = this.playerSystem.getAllPlayers().map((p: any) => ({
      id: p.id,
      name: p.name,
      x: p.position?.x ?? 0,
      y: p.position?.y ?? 0,
      hp: p.health ?? 100,
      role: p.role || "player",
      online: !p.isOffline,
    }));
    const npcs = this.npcSystem.getAllNPCs().slice(0, 120).map((n: any) => ({
      id: n.id,
      name: n.name,
      x: n.position?.x ?? 0,
      y: n.position?.y ?? 0,
      hp: n.health ?? 100,
    }));
    this.ws.sendToPlayer(socketId, {
      type: "gm_preview_snapshot",
      world: {
        weather: this.worldState.weather,
        time: this.worldSystem.getFormattedTime(),
        areMode: this.areMode,
      },
      players,
      npcs,
    });
  }

  private sendAdminGlbOpsStatus(socketId: string) {
    const pools = this.assetPoolResolver.getDocument();
    const poolCategories = Object.keys(pools.pools ?? {});
    const poolEntryCount = poolCategories.reduce(
      (total, category) => total + Object.keys((pools.pools ?? {})[category] ?? {}).length,
      0
    );
    const poolDefaultCount = Object.keys(pools.defaults ?? {}).length;
    const models = this.glbRegistry.scanModels();
    const links = this.glbRegistry.getLinks();
    const snapshots = this.assetPoolResolver.listSnapshots(10);

    this.ws.sendToPlayer(socketId, {
      type: "admin_glb_ops_status_result",
      status: {
        modelCount: models.length,
        linkCount: links.length,
        poolCategoryCount: poolCategories.length,
        poolEntryCount,
        poolDefaultCount,
        snapshotCount: snapshots.length,
        lastSnapshotAt: snapshots[0]?.createdAtIso ?? null,
        areMode: this.areMode,
      },
    });
  }

  private hasGMTokenOverride(msg: any) {
    const configuredToken = process.env.GM_PANEL_TOKEN?.trim();
    if (!configuredToken) return false;
    const incoming = isNonEmptyString(msg?.gmToken) ? msg.gmToken.trim() : "";
    return incoming.length > 0 && incoming === configuredToken;
  }

  private async handleAdminGlbCommand(socketId: string, caller: any, msg: any) {
    const t = msg?.type;
    if (typeof t !== "string" || !t.startsWith("admin_glb_")) return false;
    const isAdmin = caller?.role === "admin" || caller?.role === "gm" || this.hasGMTokenOverride(msg);
    if (!isAdmin) {
      this.sendGMStatus(socketId, "error", "Missing GM permissions.");
      return true;
    }

    if (t === "admin_glb_scan") {
      this.ws.sendToPlayer(socketId, { type: "admin_glb_scan_result", models: this.glbRegistry.scanModels() });
      this.sendAdminGlbOpsStatus(socketId);
      return true;
    }

    if (t === "admin_glb_list") {
      this.ws.sendToPlayer(socketId, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
      this.sendAdminGlbOpsStatus(socketId);
      return true;
    }

    if (t === "admin_glb_ops_status") {
      this.sendAdminGlbOpsStatus(socketId);
      return true;
    }

    if (t === "admin_glb_link") {
      if (!isNonEmptyString(msg.glbPath) || !isNonEmptyString(msg.targetType) || !isNonEmptyString(msg.targetId)) {
        this.sendGMStatus(socketId, "error", "glbPath, targetType and targetId are required.");
        return true;
      }
      this.clearGlbPathCache();
      this.glbRegistry.addLink({
        glbPath: msg.glbPath,
        targetType: msg.targetType,
        targetId: msg.targetId,
      } as any);
      this.ws.sendToPlayer(socketId, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Linked ${msg.glbPath} to ${msg.targetType}:${msg.targetId}`);
      return true;
    }

    if (t === "admin_glb_unlink") {
      if (!isNonEmptyString(msg.targetType) || !isNonEmptyString(msg.targetId)) {
        this.sendGMStatus(socketId, "error", "targetType and targetId are required.");
        return true;
      }
      this.clearGlbPathCache();
      this.glbRegistry.removeLink(msg.targetType, msg.targetId);
      this.ws.sendToPlayer(socketId, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Unlinked ${msg.targetType}:${msg.targetId}`);
      return true;
    }

    if (t === "admin_glb_pool_get") {
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      this.sendAdminGlbOpsStatus(socketId);
      return true;
    }

    if (t === "admin_glb_pool_snapshot") {
      const snapshot = this.assetPoolResolver.createSnapshot(isNonEmptyString(msg.label) ? msg.label : undefined);
      if (!snapshot) {
        this.sendGMStatus(socketId, "error", "Failed to create asset-pool snapshot.");
        return true;
      }
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_snapshot_result",
        snapshot,
      });
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_snapshots_result",
        snapshots: this.assetPoolResolver.listSnapshots(50),
      });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Asset pool snapshot created: ${snapshot.fileName}`);
      return true;
    }

    if (t === "admin_glb_pool_snapshots_list") {
      const requestedLimit = Number(msg.limit);
      const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 50;
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_snapshots_result",
        snapshots: this.assetPoolResolver.listSnapshots(limit),
      });
      this.sendAdminGlbOpsStatus(socketId);
      return true;
    }

    if (t === "admin_glb_pool_restore") {
      const snapshotId = isNonEmptyString(msg.snapshotId) ? msg.snapshotId.trim() : "";
      if (!snapshotId) {
        this.sendGMStatus(socketId, "error", "snapshotId is required.");
        return true;
      }
      const restored = this.assetPoolResolver.restoreSnapshot(snapshotId);
      if (!restored.ok) {
        this.sendGMStatus(socketId, "error", restored.error || "Failed to restore asset-pool snapshot.");
        return true;
      }
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_restore_result",
        snapshot: restored.snapshot,
      });
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_snapshots_result",
        snapshots: this.assetPoolResolver.listSnapshots(50),
      });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Asset pool restored from snapshot: ${snapshotId}`);
      return true;
    }

    if (t === "admin_glb_pool_set") {
      if (!isNonEmptyString(msg.category) || !isNonEmptyString(msg.key) || !hasAssetPoolEntry(msg.path)) {
        this.sendGMStatus(socketId, "error", "category, key and path are required.");
        return true;
      }
      const saved = this.assetPoolResolver.setEntry(msg.category, msg.key, msg.path);
      if (!saved) {
        this.sendGMStatus(socketId, "error", "Failed to save asset pool entry.");
        return true;
      }
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Asset pool updated: ${msg.category}.${msg.key}`);
      return true;
    }

    if (t === "admin_glb_pool_remove") {
      if (!isNonEmptyString(msg.category) || !isNonEmptyString(msg.key)) {
        this.sendGMStatus(socketId, "error", "category and key are required.");
        return true;
      }
      const removed = this.assetPoolResolver.removeEntry(msg.category, msg.key);
      if (!removed) {
        this.sendGMStatus(socketId, "error", `Asset pool entry not found: ${msg.category}.${msg.key}`);
        return true;
      }
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Asset pool entry removed: ${msg.category}.${msg.key}`);
      return true;
    }

    if (t === "admin_glb_pool_set_default") {
      if (!isNonEmptyString(msg.category) || !hasAssetPoolEntry(msg.path)) {
        this.sendGMStatus(socketId, "error", "category and path are required.");
        return true;
      }
      const saved = this.assetPoolResolver.setDefault(msg.category, msg.path);
      if (!saved) {
        this.sendGMStatus(socketId, "error", "Failed to save default asset pool entry.");
        return true;
      }
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Asset pool default updated: ${msg.category}`);
      return true;
    }

    if (t === "admin_glb_pool_remove_default") {
      if (!isNonEmptyString(msg.category)) {
        this.sendGMStatus(socketId, "error", "category is required.");
        return true;
      }
      const removed = this.assetPoolResolver.removeDefault(msg.category);
      if (!removed) {
        this.sendGMStatus(socketId, "error", `Asset pool default not found: ${msg.category}`);
        return true;
      }
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", `Asset pool default removed: ${msg.category}`);
      return true;
    }

    if (t === "admin_glb_pool_reload") {
      this.assetPoolResolver.reload();
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      this.sendAdminGlbOpsStatus(socketId);
      this.sendGMStatus(socketId, "info", "Asset pools reloaded from disk.");
      return true;
    }

    return false;
  }

  private async handleGMCommand(socketId: string, caller: any, msg: any) {
    const t = msg.type;
    if (typeof t !== "string" || !t.startsWith("gm_")) return false;

    const isAdmin = caller?.role === "admin" || caller?.role === "gm" || this.hasGMTokenOverride(msg);
    if (!isAdmin) {
      this.sendGMStatus(socketId, "error", "Missing GM permissions.");
      return true;
    }

    switch (t) {
      case "gm_set_weather": {
        const weather = isNonEmptyString(msg.weather) ? msg.weather.trim() : "clear";
        this.worldState.weather = weather;
        this.ws.broadcast({ type: "world_event", event: "weather_change", weather });
        this.sendGMStatus(socketId, "info", `Weather set to ${weather}`);
        return true;
      }
      case "gm_set_time": {
        const time = Number(msg.time);
        if (Number.isFinite(time)) {
          this.worldSystem.worldTime = ((time % 24) + 24) % 24;
        }
        this.ws.broadcast({ type: "world_event", event: "time_change", time: this.worldSystem.worldTime });
        this.sendGMStatus(socketId, "info", `Time set to ${this.worldSystem.getFormattedTime()}`);
        return true;
      }
      case "gm_world_settings": {
        if (msg.settings && typeof msg.settings === "object") {
          this.worldState = { ...this.worldState, ...msg.settings };
        }
        this.sendGMStatus(socketId, "info", "World settings updated.");
        return true;
      }
      case "gm_are_mode_get": {
        this.ws.sendToPlayer(socketId, { type: "gm_are_mode_result", mode: this.areMode });
        return true;
      }
      case "gm_are_mode_audit_get": {
        const requestedLimit = Number(msg.limit);
        const limit = Number.isFinite(requestedLimit) ? requestedLimit : 50;
        const entries = this.areModeAuditTrail.getRecent(limit);
        this.ws.sendToPlayer(socketId, {
          type: "gm_are_mode_audit_result",
          entries,
        });
        this.sendGMStatus(socketId, "info", `Loaded ${entries.length} ARE audit entries.`);
        return true;
      }
      case "gm_are_mode_set": {
        const mode = normalizeAREMode(msg.mode);
        if (!mode) {
          this.sendGMStatus(socketId, "error", "Invalid ARE mode. Use off, cpu or shader.");
          return true;
        }
        const oldMode = this.areMode;
        this.areMode = mode;
        this.runtimeSettings.setAREMode(mode);
        const entry = this.areModeAuditTrail.logModeChange({
          oldMode,
          newMode: mode,
          source: "gm_command",
          actorId: caller?.id,
          actorName: caller?.name,
          actorRole: caller?.role,
          socketId,
          reason: isNonEmptyString(msg.reason) ? msg.reason : "gm_are_mode_set",
        });
        this.ws.sendToPlayer(socketId, { type: "gm_are_mode_result", mode: this.areMode });
        this.ws.sendToPlayer(socketId, { type: "gm_are_mode_audit_append", entry });
        this.ws.broadcast({ type: "world_event", event: "are_mode_changed", mode: this.areMode });
        this.sendGMStatus(socketId, "info", `ARE mode set to ${this.areMode}`);
        return true;
      }
      case "gm_world_event": {
        const eventId = isNonEmptyString(msg.eventId) ? msg.eventId.trim() : "custom_event";
        const title = isNonEmptyString(msg.title) ? msg.title.trim() : "World Event";
        const description = isNonEmptyString(msg.description) ? msg.description.trim() : "";
        this.ws.broadcast({ type: "world_event", event: eventId, title, description });
        this.ws.broadcast({
          type: "chat_message",
          channel: "system",
          sender: "[WORLD EVENT]",
          text: `${title}${description ? ` - ${description}` : ""}`,
          timestamp: Date.now(),
        });
        this.sendGMStatus(socketId, "info", `World event triggered: ${title}`);
        return true;
      }
      case "gm_run_event_template": {
        const templateId = isNonEmptyString(msg.templateId) ? msg.templateId.trim() : "";
        if (!templateId) {
          this.sendGMStatus(socketId, "error", "templateId is required.");
          return true;
        }
        const template = this.eventTemplates.find((t) => t.id === templateId);
        if (!template) {
          this.sendGMStatus(socketId, "error", `Event template not found: ${templateId}`);
          return true;
        }
        this.runEventTemplate(template, socketId, caller);
        this.sendGMStatus(socketId, "info", `Started event template: ${template.name || template.id}`);
        return true;
      }
      case "gm_place_object": {
        const objectType = isNonEmptyString(msg.objectType) ? msg.objectType.trim() : "object";
        const x = Number.isFinite(Number(msg.x)) ? Number(msg.x) : caller.position.x;
        const y = Number.isFinite(Number(msg.y)) ? Number(msg.y) : caller.position.y;
        const objectId = `${objectType}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await this.worldSystem.objectSystem.addObject({
          id: objectId,
          type: objectType,
          name: objectType,
          position: { x, y },
          rotation: 0,
          scale: 1,
        });
        this.sendGMStatus(socketId, "info", `Placed ${objectType} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        this.sendGMPreviewSnapshot(socketId);
        return true;
      }
      case "gm_spawn_npc": {
        const npcId = isNonEmptyString(msg.npcId) ? msg.npcId.trim() : `npc_${Date.now()}`;
        const name = isNonEmptyString(msg.name) ? msg.name.trim() : npcId;
        const x = Number(msg.x);
        const y = Number(msg.y);
        const npc = this.npcSystem.createNPC(
          npcId,
          name,
          Number.isFinite(x) ? x : caller.position.x + 5,
          Number.isFinite(y) ? y : caller.position.y + 5
        );
        if (Number.isFinite(Number(msg.hp))) {
          npc.health = Number(msg.hp);
          npc.maxHealth = Math.max(npc.maxHealth || 1, npc.health);
        }
        this.sendGMStatus(socketId, "info", `Spawned NPC ${npc.name} (${npc.id})`);
        this.sendGMPreviewSnapshot(socketId);
        return true;
      }
      case "gm_spawn_worldboss": {
        this.worldBossRespawnAt = 0;
        this.spawnWorldBossNow();
        this.sendGMStatus(socketId, "info", "Worldboss spawned.");
        this.sendGMPreviewSnapshot(socketId);
        return true;
      }
      case "gm_spawn_warfront_boss": {
        const spawned = this.trySpawnWarfrontFrontBoss();
        this.sendGMStatus(
          socketId,
          spawned ? "info" : "error",
          spawned ? "Warfront front boss spawned." : "Warfront front boss not ready.",
        );
        this.sendGMPreviewSnapshot(socketId);
        return true;
      }
      case "gm_spawn_npc_at_self": {
        const npcId = isNonEmptyString(msg.npcId) ? msg.npcId.trim() : `npc_${Date.now()}`;
        const name = isNonEmptyString(msg.name) ? msg.name.trim() : npcId;
        this.npcSystem.createNPC(npcId, name, caller.position.x + 4, caller.position.y + 4);
        this.sendGMStatus(socketId, "info", `Spawned NPC ${name} near you.`);
        this.sendGMPreviewSnapshot(socketId);
        return true;
      }
      case "gm_remove_npc": {
        const npcId = isNonEmptyString(msg.npcId) ? msg.npcId.trim() : "";
        if (!npcId) {
          this.sendGMStatus(socketId, "error", "npcId is required.");
          return true;
        }
        const removed = this.npcSystem.removeNPC(npcId);
        this.sendGMStatus(socketId, removed ? "info" : "error", removed ? `Removed NPC ${npcId}` : `NPC ${npcId} not found`);
        this.sendGMPreviewSnapshot(socketId);
        return true;
      }
      case "gm_save_dialogue": {
        const npcId = isNonEmptyString(msg.npcId) ? msg.npcId.trim() : "";
        const text = isNonEmptyString(msg.text) ? msg.text : "";
        if (!npcId || !text) {
          this.sendGMStatus(socketId, "error", "npcId and text are required.");
          return true;
        }
        const ok = this.npcSystem.setRuntimeDialogue(npcId, text, Array.isArray(msg.choices) ? msg.choices : []);
        if (ok) {
          this.worldState.customDialogues[npcId] = { text, choices: Array.isArray(msg.choices) ? msg.choices : [] };
        }
        this.sendGMStatus(socketId, ok ? "info" : "error", ok ? `Dialogue saved for ${npcId}` : `NPC ${npcId} not found`);
        return true;
      }
      case "gm_create_quest": {
        if (!isNonEmptyString(msg.questId) || !isNonEmptyString(msg.title)) {
          this.sendGMStatus(socketId, "error", "questId and title are required.");
          return true;
        }
        this.questSystem.addQuest({
          id: msg.questId,
          title: msg.title,
          description: msg.description || "",
          category: msg.category || "side",
          level: Number.isFinite(Number(msg.level)) ? Number(msg.level) : 1,
          repeatable: Boolean(msg.repeatable),
          giverNpcId: msg.giverNpc || undefined,
          reward: msg.rewards || { xp: 100, gold: 50 },
          objectiveType: "custom",
        });
        this.sendGMStatus(socketId, "info", `Quest created: ${msg.title}`);
        return true;
      }
      case "gm_register_glb": {
        if (!isNonEmptyString(msg.path) || !isNonEmptyString(msg.name)) {
          this.sendGMStatus(socketId, "error", "path and name are required.");
          return true;
        }
        const category = isNonEmptyString(msg.category) ? msg.category.trim() : "npc";
        const targetType =
          category === "monster" ? "monster_group" :
          category === "object" || category === "building" || category === "item" ? "object_group" :
          "npc_group";
      this.clearGlbPathCache();
      this.glbRegistry.addLink({
          glbPath: msg.path,
          targetType: targetType as any,
          targetId: msg.name,
        });
        this.sendGMStatus(socketId, "info", `GLB linked for ${category}:${msg.name}`);
        return true;
      }
      case "gm_set_price": {
        if (!isNonEmptyString(msg.itemId)) {
          this.sendGMStatus(socketId, "error", "itemId is required.");
          return true;
        }
        const buy = Number(msg.buy);
        if (Number.isFinite(buy)) {
          this.economySystem.setPrice(msg.itemId, buy);
        }
        this.sendGMStatus(socketId, "info", `Price updated for ${msg.itemId}`);
        return true;
      }
      case "gm_reset_prices": {
        this.economySystem.resetPrices();
        this.sendGMStatus(socketId, "info", "Economy prices reset.");
        return true;
      }
      case "gm_economy_event": {
        this.ws.broadcast({
          type: "world_event",
          event: "economy_event",
          eventType: msg.eventType || "generic",
          duration: Number(msg.duration) || 300,
        });
        this.sendGMStatus(socketId, "info", `Economy event triggered: ${msg.eventType || "generic"}`);
        return true;
      }
      case "gm_give_item":
      case "gm_take_item": {
        const targetName = isNonEmptyString(msg.player) ? msg.player.trim() : "";
        if (!targetName || !isNonEmptyString(msg.item)) {
          this.sendGMStatus(socketId, "error", "player and item are required.");
          return true;
        }
        const target = this.getPlayerByNameOrId(targetName);
        if (!target) {
          this.sendGMStatus(socketId, "error", `Player ${targetName} not found.`);
          return true;
        }
        const amount = Math.max(1, Number(msg.amount) || 1);
        if (msg.item === "gold") {
          if (t === "gm_give_item") {
            this.economySystem.addGold(target, amount);
          } else {
            this.economySystem.removeGold(target, amount);
          }
        } else if (t === "gm_give_item") {
          for (let i = 0; i < amount; i++) {
            this.inventorySystem.addItem(target, { id: msg.item, name: msg.item });
          }
        } else {
          for (let i = 0; i < amount; i++) {
            this.inventorySystem.removeItem(target, msg.item);
          }
        }
        this.sendGMStatus(socketId, "info", `${t === "gm_give_item" ? "Gave" : "Removed"} ${amount}x ${msg.item} ${t === "gm_give_item" ? "to" : "from"} ${target.name}`);
        return true;
      }
      case "gm_create_nation": {
        if (!isNonEmptyString(msg.name)) {
          this.sendGMStatus(socketId, "error", "Nation name required.");
          return true;
        }
        this.worldState.nations.push({
          name: msg.name,
          leader: msg.leader || "Unknown",
          capitalX: Number(msg.capitalX) || 0,
          capitalY: Number(msg.capitalY) || 0,
          radius: Number(msg.radius) || 200,
        });
        this.sendGMStatus(socketId, "info", `Nation created: ${msg.name}`);
        return true;
      }
      case "gm_diplomacy": {
        if (!isNonEmptyString(msg.nationA) || !isNonEmptyString(msg.nationB)) {
          this.sendGMStatus(socketId, "error", "nationA and nationB required.");
          return true;
        }
        this.worldState.diplomacy = this.worldState.diplomacy.filter(
          (d) => !((d.a === msg.nationA && d.b === msg.nationB) || (d.a === msg.nationB && d.b === msg.nationA))
        );
        this.worldState.diplomacy.push({ a: msg.nationA, b: msg.nationB, relation: msg.relation || "neutral" });
        this.sendGMStatus(socketId, "info", `Diplomacy set: ${msg.nationA} ↔ ${msg.nationB} (${msg.relation || "neutral"})`);
        return true;
      }
      case "gm_claim_territory": {
        if (!isNonEmptyString(msg.region)) {
          this.sendGMStatus(socketId, "error", "region is required.");
          return true;
        }
        this.worldState.territories[msg.region] = isNonEmptyString(msg.owner) ? msg.owner : "unclaimed";
        this.sendGMStatus(socketId, "info", `Territory ${msg.region} claimed by ${this.worldState.territories[msg.region]}`);
        return true;
      }
      case "gm_broadcast": {
        const text = isNonEmptyString(msg.message) ? msg.message.trim() : "";
        if (!text) {
          this.sendGMStatus(socketId, "error", "message is required.");
          return true;
        }
        this.ws.broadcast({
          type: "chat_message",
          channel: msg.channel || "system",
          sender: "[GM]",
          text,
          color: msg.color || "#ffd700",
          timestamp: Date.now(),
        });
        this.sendGMStatus(socketId, "info", "Broadcast sent.");
        return true;
      }
      case "gm_preview_request": {
        this.sendGMPreviewSnapshot(socketId);
        return true;
      }
      case "gm_kick":
      case "gm_ban":
      case "gm_mute":
      case "gm_unmute":
      case "gm_unban":
      case "gm_promote":
      case "gm_revive":
      case "gm_edit_player":
      case "gm_teleport":
      case "gm_get_players": {
        return this.handleGMPlayerAdmin(socketId, caller, msg);
      }
      default:
        this.sendGMStatus(socketId, "error", `Unsupported GM command: ${t}`);
        return true;
    }
  }

  private handleGMPlayerAdmin(socketId: string, caller: any, msg: any) {
    const t = msg.type;
    if (t === "gm_get_players") {
      const list = this.playerSystem.getAllPlayers().map((p: any) => ({
        id: p.id,
        name: p.name,
        level: p.level || 1,
        hp: p.health ?? 100,
        gold: p.gold || 0,
        x: p.position?.x ?? 0,
        y: p.position?.y ?? 0,
        online: !p.isOffline,
        role: p.role || "player",
      }));
      this.ws.sendToPlayer(socketId, { type: "gm_player_list", players: list });
      this.sendGMPreviewSnapshot(socketId);
      return true;
    }

    const targetName = isNonEmptyString(msg.player) ? msg.player.trim() : "";
    if (!targetName) {
      this.sendGMStatus(socketId, "error", "player is required.");
      return true;
    }

    const target = this.getPlayerByNameOrId(targetName);
    if (!target) {
      this.sendGMStatus(socketId, "error", `Player ${targetName} not found.`);
      return true;
    }

    if (t === "gm_kick") {
      const targetSocket = this.getSocketForPlayer(target.id) || this.getSocketForPlayer(target.name);
      if (targetSocket) {
        this.ws.sendToPlayer(targetSocket, { type: "kick", reason: "Kicked by GM" });
      }
      this.sendGMStatus(socketId, "info", `Kick signal sent for ${target.name}`);
      return true;
    }
    if (t === "gm_ban") {
      if (!this.worldState.bannedPlayers.includes(target.id)) {
        this.worldState.bannedPlayers.push(target.id);
      }
      const targetSocket = this.getSocketForPlayer(target.id) || this.getSocketForPlayer(target.name);
      if (targetSocket) {
        this.ws.sendToPlayer(targetSocket, { type: "kick", reason: "Banned by GM" });
      }
      this.sendGMStatus(socketId, "info", `${target.name} banned`);
      return true;
    }
    if (t === "gm_mute") {
      if (!this.worldState.mutedPlayers.includes(target.id)) {
        this.worldState.mutedPlayers.push(target.id);
      }
      this.sendGMStatus(socketId, "info", `${target.name} muted`);
      return true;
    }
    if (t === "gm_unmute") {
      this.worldState.mutedPlayers = this.worldState.mutedPlayers.filter((id) => id !== target.id);
      this.sendGMStatus(socketId, "info", `${target.name} unmuted`);
      return true;
    }
    if (t === "gm_unban") {
      this.worldState.bannedPlayers = this.worldState.bannedPlayers.filter((id) => id !== target.id);
      this.sendGMStatus(socketId, "info", `${target.name} unbanned`);
      return true;
    }
    if (t === "gm_promote") {
      target.role = "gm";
      this.sendGMStatus(socketId, "info", `${target.name} promoted to GM`);
      return true;
    }
    if (t === "gm_revive") {
      target.health = target.maxHealth || 100;
      target.dead = false;
      target.deathAt = 0;
      this.sendGMStatus(socketId, "info", `${target.name} revived`);
      return true;
    }
    if (t === "gm_edit_player") {
      if (Number.isFinite(Number(msg.hp))) target.health = Number(msg.hp);
      if (Number.isFinite(Number(msg.gold))) target.gold = Number(msg.gold);
      if (Number.isFinite(Number(msg.xp))) target.xp = Number(msg.xp);
      this.sendGMStatus(socketId, "info", `${target.name} updated`);
      return true;
    }
    if (t === "gm_teleport") {
      const x = Number(msg.x);
      const y = Number(msg.y);
      target.position.x = Number.isFinite(x) ? x : caller.position.x;
      target.position.y = Number.isFinite(y) ? y : caller.position.y;
      const targetSocket = this.getSocketForPlayer(target.id) || this.getSocketForPlayer(target.name);
      if (targetSocket) {
        this.observerEngine.updatePosition(targetSocket, target.position);
        this.ws.sendToPlayer(targetSocket, {
          type: "teleport",
          x: target.position.x,
          y: target.position.y,
          z: 0,
        });
      }
      this.sendGMStatus(socketId, "info", `${target.name} teleported`);
      return true;
    }
    return false;
  }

  constructor(private ws: GameWebSocketServer) {
    this.chunkSystem = new ChunkSystem(64);
    this.observerEngine = new ObserverEngine();
    this.playerSystem = new PlayerSystem();
    this.combatSystem = new CombatSystem();
    this.inventorySystem = new InventorySystem();
    this.npcSystem = new NPCSystem();
    this.guildSystem = new GuildSystem();
    this.economySystem = new EconomySystem();
    this.questSystem = new QuestEngine();
    this.questlineEngine = new QuestlineEngine();
    for (const seed of this.questlineEngine.listSeeds()) {
      const ctx = enrichQuestlineContext(seed);
      if (ctx.questPack) {
        registerProceduralQuestPack(this.questSystem, ctx.questPack, seed.id);
      }
    }
    this.questSystem.setOnQuestCompleted((player, row, def) => {
      const unlocked = applyQuestCompletionToQuestline(player, row, def, this.questSystem);
      if (unlocked.length) {
        const sock = this.getSocketForPlayer(player.id);
        if (sock) {
          this.ws.sendToPlayer(sock, {
            type: "questline_features",
            unlocked: unlocked,
            questlineId: def?.questlineId,
          });
        }
      }
      const socketId = this.getSocketForPlayer(player.id);
      this.applyWarfrontContribution(player, socketId ?? null, "scouting", 12, "quest_clear");
    });
    this.questSystem.setXpRewardApplier((player, baseXp) =>
      this.grantPlayerXpWithVoteBuff(player, baseXp, "quest")
    );
    this.persistence = new PersistenceManager();
    this.worldSystem = new WorldSystem(this.persistence);
    this.glbLinksStore = "file";
    this.glbRegistry = new GLBRegistry();
    this.assetPoolResolver = new AssetPoolResolver();
    this.runtimeSettings = new RuntimeSettingsStore();
    this.areModeAuditTrail = new AREModeAuditTrail();
    this.areStateCompiler = new AREStateCompiler();
    this.craftingSystem = new CraftingSystem();
    this.areMode = this.runtimeSettings.getAREMode();

    // Initialize LiveHeal v2 resilience engine (WorldTick-only scheduling)
    this.liveHeal = bootstrapLiveHeal(resolveLiveHealConfigFromEnv());
    this.assetHealthService = new AssetHealthService(this.liveHeal.config.assetValidation);
    this.registerLiveHealSubsystems();

    void initRedisChatRelay();
    this.chatUnsubscribe = onRedisChatMessage((chatMessage: RelayedChatMessage) => {
      this.broadcastChatMessage(chatMessage);
    });

    this.chatChannelRouter = new ChatChannelRouter();
    this.npcMemoryCache = new NPCMemoryCache();
    this.ouroborosEngine = new OuroborosEngine();
    this.npcRelationships = new NPCRelationshipSystem();
    this.worldBossDungeonSystem = new WorldBossDungeonSystem();
    this.voteSystem = new VoteSystem();
    this.warfrontSystem = new WarfrontSystem();
    if (PlaytesterConfig.enabled) {
      this.playtester = new AutonomousPlaytester({
        isSocketBound: (socketId) => this.isSocketBound(socketId),
        bindSocketToPlayer: (socketId, playerId) => this.bindSyntheticSocketToPlayer(socketId, playerId),
        getOrCreatePlayer: (id, displayName) => this.getOrCreatePlayerForAutomation(id, displayName),
        ensurePlayerDefaults: (player) => this.ensurePlayerProgressDefaults(player),
        applySpawnToPlayer: (player, sceneId, spawnKey) => this.applySpawnToPlayer(player, sceneId, spawnKey),
        updateObserverPosition: (socketId, position) => this.observerEngine.updatePosition(socketId, position),
        processSceneTriggers: (socketId, player) => this.processSceneTriggers(socketId, player),
        getChunkId: (x, y) => this.chunkSystem.getChunkId(x, y),
        getAllNpcs: () => this.npcSystem.getAllNPCs(),
        getAllPlayers: () => this.playerSystem.getAllPlayers(),
        getLootEntities: () => this.getLootEntitiesForAutomation(),
        getWorldObjects: () => this.getWorldObjectsForAutomation(),
        getQuestDefinitions: () => this.questSystem.getQuestDefinitions(),
        getQuestSyncForClient: (player) => this.questSystem.getQuestSyncForClient(player),
        startQuest: (player, questId) => this.questSystem.startQuest(player, questId),
        checkTalkToQuests: (player, npcId) => this.questSystem.checkTalkToQuests(player, npcId),
        checkCollectTurnInQuests: (player, npcId) => this.questSystem.checkCollectTurnInQuests(player, npcId),
        updateCombatQuests: (player, npcId, npcInstanceId) =>
          this.questSystem.updateCombatQuests(player, npcId, npcInstanceId),
        sendToSyntheticSocket: async (socketId, msg) => this.handleSyntheticMessage(socketId, msg),
      });
    }
    this.worldBossRespawnAt = Date.now() + 1000;

    // World generation / placement pipeline
    this.terrainAdapter = new ServerTerrainAdapter();
    // Wire TerrainGenerator as heightmap data source for placement validation
    this.terrainAdapter.setDataSource(this.worldSystem.terrainGenerator);
    this.treeAdapter = new ExistingTreeGeneratorAdapter();
    const layoutEngine = new WorldLayoutRuleEngine(createDefaultLayoutConfig("/tmp/world-layout"));
    this.placementEngine = new WorldPlacementRuleEngine(layoutEngine);
    this.placementEngine.setTerrainAdapter(this.terrainAdapter);
    this.placementEngine.setVegetationAdapter(this.treeAdapter);
    console.log("[WorldTick] Placement engine initialized with terrain + vegetation adapters.");
    this.worldBossDungeonSystem.ensureWorldBossPortalObject(this.worldSystem.objectSystem);
    this.statusEmitter = new StatusEmitter(
      this.chatChannelRouter,
      () => this.getChatRecipients(),
      (sid, payload) => this.ws.sendToPlayer(sid, payload),
      (pid) => this.playerToSocket.get(pid),
    );
    this.gameplayFusionDirector = new GameplayFusionDirector(
      (category, key, seed) => this.resolveEntityGlbPath(category, key, seed),
    );
    this.npcSystem.setQuestEchoProvider(this.buildFusionQuestEchoProvider());
    this.npcSystem.setProfileResolver((npc: any) => {
      const adaptive = this.gameplayFusionDirector.resolveNpcGlbOverride(npc, Date.now());
      return {
        profileTag: adaptive ? "adaptive_fusion_profile" : "default_profile",
        adaptiveGlbPath: adaptive ?? null,
      };
    });

    try {
      const { getSupabaseAdmin } = require("../lib/supabaseAdmin.js");
      const sb = getSupabaseAdmin();
      setSupabaseClient(sb);
    } catch {
      setSupabaseClient(null);
    }

    this.worldBossDungeonSystem.ensureWorldBossPortalObject(this.worldSystem.objectSystem);

    // Create a dummy player in a distant chunk to prove multi-observer union
    const dummyPlayer = this.playerSystem.createPlayer("dummy_player", "Dummy Player");
    dummyPlayer.position.x = 500;
    dummyPlayer.position.y = 500;
    this.observerEngine.register("dummy_player", { x: 500, y: 500 });

    this.ws.onPlayerConnect = (id) => {
      console.log(`Socket ${id} connected. Waiting for login...`);
    };

    this.ws.onPlayerDisconnect = async (id) => {
      const uid = this.socketToPlayer.get(id);
      if (uid) {
        const player = this.playerSystem.getPlayer(uid);
        if (player) {
          player.isOffline = true;
          player.state = "idle";
          player.stateTimer = Date.now() + 5000;
        }
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        this.playerToSocket.delete(uid);
        await this.saveAll();
        console.log(`Player ${player.name} (Socket ${id}) disconnected. Character remains in world.`);
      }
    };

    const handlePlayerMessage = async (id: string, msg: any) => {
      // Heartbeat: respond to ping with pong

      if (msg.type === "update_attributes") {
        const uid = this.socketToPlayer.get(id);
        if (uid) {
          const player = this.playerSystem.getPlayer(uid);
          if (player && player.attributes) {
            const requested = msg.payload || msg;
            const totalRequested = (requested.str || 0) + (requested.dex || 0) + (requested.int || 0) + (requested.sta || 0) + (requested.wis || 0);
            const totalCurrent = (player.attributes.str || 0) + (player.attributes.dex || 0) + (player.attributes.sta || 0) + (player.attributes.int || 0) + (player.attributes.wis || 0) + (player.attributes.availablePoints || 0);
            
            if (totalRequested <= totalCurrent) {
              player.attributes.str = requested.str || 10;
              player.attributes.dex = requested.dex || 10;
              player.attributes.int = requested.int || 10;
              player.attributes.sta = requested.sta || 10;
              player.attributes.wis = requested.wis || 10;
              player.attributes.availablePoints = totalCurrent - totalRequested;
              
              player.maxHealth = 100 + (player.attributes.sta * 5);
              player.maxMana = 25 + (player.attributes.int * 2);
              player.maxStamina = 100 + (player.attributes.dex * 2);
              
              this.ws.sendToPlayer(id, { type: "toast", kind: "ok", text: "Attributes updated!" });
            }
          }
        }
        return;
      }
      if (msg.type === "ping") {
        this.ws.sendToPlayer(id, { type: "pong" });
        return;
      }

      if (msg.type === "login") {
        let charName = "Unknown";
        let uid = "";

        try {
          const identity = await resolveLoginIdentity(id, msg ?? {});
          if ("error" in identity) {
            this.ws.sendToPlayer(id, { type: "error", message: identity.error, code: identity.code });
            return;
          }
          uid = identity.uid;
          charName = identity.charName;

          const ph = getPostHogClient();
          if (ph) {
            ph.identify({
              distinctId: uid,
              properties: {
                charName: charName,
                userAgent: msg?.userAgent,
                areDeviceClass: msg?.areDeviceClass
              }
            });
            ph.capture({
              distinctId: uid,
              event: "player_login",
              properties: {
                charName: charName,
                sceneId: msg?.sceneId,
                spawnKey: msg?.spawnKey
              }
            });
          }

          let player = this.playerSystem.getPlayer(uid);
          let shouldApplySpawn = false;
          if (!player) {
            player = this.playerSystem.createPlayer(uid, charName);
            console.log(`Created new player: ${charName} (${uid})`);
            shouldApplySpawn = true;
          } else {
            player.isOffline = false;
            console.log(`Player ${charName} reconnected.`);
            shouldApplySpawn = !isNonEmptyString(player.sceneId) || !isNonEmptyString(player.spawnKey);
          }
          this.ensurePlayerProgressDefaults(player);
          this.deliverQueuedRewards(id, player);

          const requestedSceneId = isNonEmptyString(msg.sceneId) ? msg.sceneId.trim() : undefined;
          const requestedSpawnKey = isNonEmptyString(msg.spawnKey) ? msg.spawnKey.trim() : undefined;
          if (requestedSceneId || requestedSpawnKey) {
            shouldApplySpawn = true;
          }
          const spawn = shouldApplySpawn
            ? this.applySpawnToPlayer(player, requestedSceneId ?? player.sceneId, requestedSpawnKey ?? player.spawnKey)
            : this.resolveSpawn(player.sceneId, player.spawnKey);

          this.socketToPlayer.set(id, uid);
          this.playerToSocket.set(uid, id);
          this.observerEngine.register(id, player.position);
          this.ws.resolveSocketToPlayerUid = (socketId: string) => this.socketToPlayer.get(socketId) ?? null;

          const hints = msg?.clientHints && typeof msg.clientHints === "object" ? msg.clientHints : undefined;
          const mobileMs = GameConfig.stateBroadcastIntervalMobileMs;
          this.ws.setEntitySyncIntervalForSocket(
            id,
            hints?.lowBandwidth ? mobileMs : GameConfig.stateBroadcastIntervalMs
          );

          const requestedDeviceClass = resolveAREDeviceClass(msg.areDeviceClass, msg.userAgent);
          const recommendedMode = this.runtimeSettings.getAREModeForDeviceClass(requestedDeviceClass);
          this.ws.sendToPlayer(id, {
            type: "welcome",
            playerId: uid,
            id: uid, // legacy support
            sceneId: spawn.sceneId,
            spawnKey: spawn.spawnKey,
            spawnPosition: spawn.spawnPoint,
            areDeviceClass: requestedDeviceClass,
            areMode: this.areMode,
            recommendedAreMode: recommendedMode,
            stats: (() => {
              const invWelcome = this.inventorySystem.getInventorySummary(player);
              return {
              gold: player.gold,
              xp: player.xp,
              kills: Number(player.kills) || 0,
              deaths: Number(player.deaths) || 0,
              level: player.level ?? 1,
              health: player.health,
              maxHealth: player.maxHealth ?? 100,
              stamina: player.stamina,
              maxStamina: player.maxStamina ?? 100,
              mana: player.mana ?? 25,
              maxMana: player.maxMana ?? 25,
              dead: Boolean(player.dead),
              deathAt: typeof player.deathAt === "number" ? player.deathAt : 0,
              respawnAvailableAt: player.dead
                ? (typeof player.deathAt === "number" ? player.deathAt : 0) + GameConfig.playerRespawnDelayMs
                : 0,
              quests: player.quests,
              inventory: player.inventory,
              gear: invWelcome.gear ?? player.gearInventory ?? [],
              equipment: player.equipment,
              maxWeight: invWelcome.maxWeight,
              inventoryWeight: invWelcome.weight,
              skillCooldownUntil: buildSkillCooldownUntilPayload(player, Date.now()),
              impactBusterUnlocked: Boolean(player.impactBusterUnlocked),
              combatTargetNpcId: player.combatTargetNpcId ?? null,
      attributes: player.attributes,
              voteBuffState: this.getVoteBuffState(player),
            };
            })(),
          });
          this.pushPlayerStateSync(id, player);
          this.pushVoteStatus(id, player);
          this.pushWarfrontStatus(id, player);
        } catch (err) {
          console.error("Login error:", err);
          this.ws.sendToPlayer(id, { type: "error", message: "Login failed" });
        }
        return;
      }

      if (msg.type === "quest_sync") {
        const playerUid = this.socketToPlayer.get(id);
        const player = playerUid ? this.playerSystem.getPlayer(playerUid) : null;
        if (!player) return;
        const questlineId =
          typeof msg.questlineId === "string" && msg.questlineId.trim()
            ? msg.questlineId.trim()
            : "mainline_awakening";
        const state = this.questlineEngine.startQuestline(questlineId);
        if (!state) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Questline not found." });
          return;
        }
        state.proceduralQuestIds = registeredProceduralQuestIdsByQuestline.get(questlineId) ?? [];
        const first = `ql_${questlineId}_step_0`;
        if (this.questSystem.getQuestDefinitions().has(first)) {
          this.questSystem.startQuest(player, first);
        }
        setPlayerQuestlineRuntime(player, state);
        this.ws.sendToPlayer(id, {
          type: "questline_state",
          questlineId,
          currentNode: state.currentNode,
          unlockedFeatures: state.unlockedFeatures,
          featureSchedule: state.featureSchedule,
        });
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "scene_change") {
        const playerUid = this.socketToPlayer.get(id);
        const player = playerUid ? this.playerSystem.getPlayer(playerUid) : null;
        if (!player) {
          return;
        }
        if (msg.sceneId === WORLD_BOSS_SCENE_ID) {
          const entryCheck = this.worldBossDungeonSystem.canEnterWorldBossDungeon(player);
          if (!entryCheck.ok) {
            this.ws.sendToPlayer(id, {
              type: "toast",
              kind: "warn",
              text: entryCheck.reason ?? "You cannot enter this dungeon now.",
            });
            return;
          }
        }

        const requestedSceneId = isNonEmptyString(msg.sceneId) ? msg.sceneId.trim() : undefined;
        const requestedSpawnKey = isNonEmptyString(msg.spawnKey) ? msg.spawnKey.trim() : undefined;
        const spawn = this.applySpawnToPlayer(player, requestedSceneId ?? player.sceneId, requestedSpawnKey ?? player.spawnKey);
        this.observerEngine.updatePosition(id, player.position);

        this.ws.sendToPlayer(id, {
          type: "scene_changed",
          sceneId: spawn.sceneId,
          spawnKey: spawn.spawnKey,
          spawnPosition: spawn.spawnPoint,
        });
        if (spawn.sceneId === WORLD_BOSS_SCENE_ID) {
          this.ws.sendToPlayer(id, {
            type: "worldboss_entered",
            dungeonId: WORLD_BOSS_DUNGEON_ID,
            sceneId: WORLD_BOSS_SCENE_ID,
          });
        }
        return;
      }

      if (msg.type === "worldboss_info_request") {
        const now = Date.now();
        const latestSummary =
          this.worldBossEncounterSummaries.length > 0
            ? this.worldBossEncounterSummaries[this.worldBossEncounterSummaries.length - 1]
            : null;
        this.ws.sendToPlayer(id, {
          type: "worldboss_status",
          dungeonId: WORLD_BOSS_DUNGEON_ID,
          sceneId: WORLD_BOSS_SCENE_ID,
          respawnAt: this.worldBossRespawnAt,
          respawnRemainingMs: Math.max(0, this.worldBossRespawnAt - now),
          top: latestSummary?.topRewards ?? [],
        });
        return;
      }

      const playerUid = this.socketToPlayer.get(id);
      const player = playerUid ? this.playerSystem.getPlayer(playerUid) : null;

      if (!player) return;
      this.ensurePlayerProgressDefaults(player);

      if (this.worldState.bannedPlayers.includes(player.id)) {
        this.ws.sendToPlayer(id, { type: "kick", reason: "Banned player" });
        return;
      }

      const isChatSend = msg.type === "chat_send" || msg.type === "chat" || msg.type === "chat_message";
      if (isChatSend && this.worldState.mutedPlayers.includes(player.id)) {
        this.sendGMStatus(id, "error", "You are muted.");
        return;
      }

      if (await this.handleAdminGlbCommand(id, player, msg)) {
        return;
      }

      if (await this.handleGMCommand(id, player, msg)) {
        return;
      }

      if (isChatSend) {
        const text = typeof msg.text === "string" ? msg.text : "";
        if (!text.trim()) {
          return;
        }

        // Route through 3-channel system (local/global/status)
        const rawChannel = typeof msg.channel === "string" ? msg.channel.trim().toLowerCase() : (typeof msg.scope === "string" ? msg.scope.trim().toLowerCase() : "");
        if (rawChannel === "local" || rawChannel === "global") {
          const sent = this.chatChannelRouter.publish(
            {
              channel: rawChannel as "local" | "global",
              senderType: "player",
              senderId: String(player.id),
              senderName: isNonEmptyString(player.name) ? player.name : String(player.id),
              text,
              position: { x: player.position.x, y: player.position.y },
            },
            this.getChatRecipients(),
            (sid, payload) => this.ws.sendToPlayer(sid, payload),
            (payload) => this.ws.broadcast(payload),
            (pid) => this.playerToSocket.get(pid),
          );
          if (!sent) {
            this.ws.sendToPlayer(id, { type: "toast", text: "Chat cooldown active." });
          }
          return;
        }

        // Legacy path: global/zone/party via Redis relay
        const requestedScope = this.resolveChatScope(msg.scope ?? msg.channel);
        const zoneId = this.resolvePlayerZoneId(player);
        const partyId = this.resolvePlayerPartyId(player);
        const effectiveScope: RelayedChatScope =
          requestedScope === "zone" && !zoneId
            ? "global"
            : requestedScope === "party" && !partyId
              ? "global"
              : requestedScope;
        const chatResult = await publishChatMessage({
          scope: effectiveScope,
          senderId: String(player.id),
          senderName: isNonEmptyString(player.name) ? player.name : String(player.id),
          text,
          zoneId,
          partyId,
          ts: Date.now(),
        });
        if (!chatResult.ok && chatResult.reason === "rate_limited") {
          const waitSeconds = Math.max(0.1, Number(chatResult.retryAfterMs ?? 500) / 1000);
          this.ws.sendToPlayer(id, {
            type: "toast",
            text: `Chat cooldown active (${waitSeconds.toFixed(1)}s).`,
          });
        }
        return;
      }

      if (msg.type === "input" || msg.type === "move_intent") {
        const dx = msg.input?.key === 'a' ? -1 : msg.input?.key === 'd' ? 1 : msg.dx || 0;
        const dy = msg.input?.key === 'w' ? -1 : msg.input?.key === 's' ? 1 : msg.dy || 0;

        if (dx !== 0 || dy !== 0) {
          const speed = 0.5;
          player.position.x += dx * speed;
          player.position.y += dy * speed;
          this.observerEngine.updatePosition(id, player.position);
          this.processSceneTriggers(id, player);
        }
      }

      if (msg.type === "vote_banners") {
        this.ws.sendToPlayer(id, {
          type: "vote_banners",
          banners: this.getPublicVoteBanners(),
        });
        this.pushVoteStatus(id, player);
        this.pushWarfrontStatus(id, player);
        return;
      }

      if (msg.type === "set_target") {
        const requested = typeof msg.npcId === "string" ? msg.npcId.trim() : "";
        if (requested && this.worldBossDungeonSystem.isWorldBossNpc(this.npcSystem.getNPC(requested))) {
          this.worldBossDungeonSystem.maybeStartEncounterIfMissing(this.npcSystem.getNPC(requested));
        }
        player.combatTargetNpcId = requested.length > 0 ? requested : null;
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "worldboss_status") {
        const boss = this.npcSystem.getNPC(this.worldBossDungeonSystem.getCurrentBossNpcId());
        const respawnRemainingMs = this.worldBossRespawnAt > 0 ? Math.max(0, this.worldBossRespawnAt - Date.now()) : 0;
        this.ws.sendToPlayer(id, {
          type: "worldboss_status",
          dungeonId: WORLD_BOSS_DUNGEON_ID,
          sceneId: WORLD_BOSS_SCENE_ID,
          bossNpcId: boss?.id ?? null,
          bossName: boss?.name ?? "Frustinator Prime",
          bossHp: boss?.health ?? 0,
          bossHpMax: boss?.maxHealth ?? 0,
          respawnRemainingMs,
        });
        return;
      }

      if (msg.type === "vote_status" || msg.type === "vote_info_request") {
        this.pushVoteStatus(id, player);
        return;
      }

      if (msg.type === "warfront_status" || msg.type === "warfront_info_request") {
        this.pushWarfrontStatus(id, player);
        return;
      }

      if (msg.type === "warfront_claim_rewards") {
        const claimed = this.warfrontSystem.claimSeasonRewards(player, Date.now());
        if (!claimed.ok) {
          this.ws.sendToPlayer(id, {
            type: "toast",
            kind: "warn",
            text: claimed.reason ?? "No warfront rewards available.",
          });
          this.pushWarfrontStatus(id, player);
          return;
        }
        const gainedXp = this.grantPlayerXpWithVoteBuff(player, claimed.totalXp ?? 0, "other");
        this.ws.sendToPlayer(id, {
          type: "toast",
          kind: "ok",
          text: `Warfront rewards claimed (+${claimed.totalGold ?? 0} Gold, +${gainedXp} XP).`,
        });
        this.ws.broadcast({
          type: "fx",
          at: { x: player.position.x, y: player.position.y },
          kind: "xp",
          n: gainedXp,
        });
        this.pushPlayerStateSync(id, player);
        this.pushWarfrontStatus(id, player);
        return;
      }

      if (msg.type === "vote_open") {
        const bannerId = typeof msg.bannerId === "string" ? msg.bannerId.trim() : "";
        if (!bannerId) {
          this.ws.sendToPlayer(id, { type: "toast", kind: "warn", text: "Vote banner is missing." });
          return;
        }
        const created = this.voteSystem.createVoteSession(
          player,
          bannerId,
          this.resolvePublicBaseUrl(),
        );
        if (!created.ok || !created.session || !created.status) {
          this.ws.sendToPlayer(id, {
            type: "toast",
            kind: "warn",
            text: created.reason ?? "Unable to start vote session.",
          });
          this.pushVoteStatus(id, player);
          return;
        }
        this.ws.sendToPlayer(id, {
          type: "vote_session_opened",
          bannerId,
          session: {
            id: created.session.id,
            status: created.session.status,
            expiresAt: created.session.expiresAt,
            voteUrl: created.session.voteUrl,
          },
          status: created.status,
        });
        this.pushVoteStatus(id, player);
        return;
      }

      if (msg.type === "vote_verify") {
        const sessionId = typeof msg.sessionId === "string" ? msg.sessionId.trim() : "";
        if (!sessionId) {
          this.ws.sendToPlayer(id, { type: "toast", kind: "warn", text: "Vote session is missing." });
          return;
        }
        const verified = await this.voteSystem.verifySession(player, sessionId);
        if (!verified.ok) {
          this.ws.sendToPlayer(id, {
            type: "vote_verify_result",
            ok: false,
            verified: false,
            sessionId,
            reason: verified.reason,
            retryAfterMs: verified.retryAfterMs,
            status: verified.status,
          });
          this.ws.sendToPlayer(id, {
            type: "toast",
            kind: "warn",
            text: verified.reason ?? "Vote verification failed.",
          });
          this.pushVoteStatus(id, player);
          return;
        }
        this.ws.sendToPlayer(id, {
          type: "vote_verify_result",
          ok: true,
          verified: true,
          sessionId,
          status: verified.status,
        });
        this.ws.sendToPlayer(id, {
          type: "toast",
          kind: "ok",
          text: "Vote verified. Claim your reward.",
        });
        this.pushVoteStatus(id, player);
        return;
      }

      if (msg.type === "vote_claim") {
        const sessionId = typeof msg.sessionId === "string" ? msg.sessionId.trim() : "";
        if (!sessionId) {
          this.ws.sendToPlayer(id, { type: "toast", kind: "warn", text: "Vote session is missing." });
          return;
        }
        const claimed = this.voteSystem.claimSession(player, sessionId);
        if (!claimed.ok) {
          this.ws.sendToPlayer(id, {
            type: "vote_claim_result",
            ok: false,
            sessionId,
            reason: claimed.reason,
            status: claimed.status,
          });
          this.ws.sendToPlayer(id, {
            type: "toast",
            kind: "warn",
            text: claimed.reason ?? "Vote claim failed.",
          });
          this.pushVoteStatus(id, player);
          return;
        }
        this.ws.sendToPlayer(id, {
          type: "vote_claim_result",
          ok: true,
          sessionId,
          gainedMs: claimed.gainedMs ?? 0,
          status: claimed.status,
        });
        this.ws.sendToPlayer(id, {
          type: "toast",
          kind: "ok",
          text: `Vote reward claimed (+${Math.round((claimed.gainedMs ?? 0) / 3_600_000)}h XP buff).`,
        });
        this.pushPlayerStateSync(id, player);
        this.pushVoteStatus(id, player);
        return;
      }

      if (msg.type === "use_item") {
        const itemId = typeof msg.itemId === "string" ? msg.itemId.trim() : "";
        if (!itemId) return;
        const take = this.inventorySystem.takeOneFromBag(player, itemId);
        if (!take) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Item not found in inventory." });
          return;
        }
        const def = ItemRegistry.getItem(itemId);
        if (def?.healAmount) {
          player.health = Math.min(player.maxHealth ?? 100, (player.health ?? 0) + def.healAmount);
        }
        if (def?.restoreMana) {
          player.mana = Math.min(player.maxMana ?? 25, (player.mana ?? 0) + def.restoreMana);
        }
        this.pushPlayerStateSync(id, player);
        const toast = this.USE_ITEM_TOASTS[itemId];
        if (toast) {
          this.ws.sendToPlayer(id, { type: "toast", text: toast });
        }
        return;
      }

      if (msg.type === "use_skill") {
        const skillId = typeof msg.skillId === "string" ? msg.skillId.trim() : "";
        if (skillId === IMPACT_BUSTER_SKILL_ID) {
          const now = Date.now();
          const eligibility = canUseImpactBuster(player, now);
          if (!eligibility.ok) {
            this.ws.sendToPlayer(id, {
              type: "toast",
              kind: eligibility.reason === "locked" ? "warn" : "info",
              text: eligibility.toast,
            });
            return;
          }
          const impact = executeImpactBuster(player, this.npcSystem.getAllNPCs(), now);
          player.skillCooldowns[IMPACT_BUSTER_COOLDOWN_KEY] = impact.cooldownUntil;
          this.ws.broadcast({
            type: "impact_buster_fx",
            casterId: player.id,
            at: { x: player.position.x, y: player.position.y },
            radius: 5.5,
          });
          this.ws.sendToPlayer(id, {
            type: "toast",
            kind: "ok",
            text:
              impact.hits.length > 0
                ? `Impact Buster hits ${impact.hits.length} target(s) for ${impact.totalDamage}.`
                : "Impact Buster unleashed, but nothing was in range.",
          });
          for (const hit of impact.hits) {
            const target = this.npcSystem.getNPC(hit.npcId);
            if (!target) continue;
            this.handleWorldBossDamageAttribution(player, target, hit.damage);
            this.ws.broadcast({
              type: "combat_result",
              attackerId: player.id,
              targetId: hit.npcId,
              damage: hit.damage,
              crit: false,
              hit: true,
              targetHp: hit.healthAfter,
              targetHpMax: target.maxHealth ?? target.health,
              killed: hit.killed,
            });
            this.ws.broadcast({
              type: "fx",
              at: { x: target.position.x, y: target.position.y },
              kind: "hit",
              n: hit.damage,
            });
            if (hit.killed && target.health <= 0) {
              target.health = 0;
              target.aggroTargetId = null;
              player.kills = Math.max(0, Number(player.kills) || 0) + 1;
              this.applyWarfrontContribution(player, id, "combat", 8, "combat_kill");
              const handledBossDefeat = this.tryHandleWorldBossDefeat(player, target);
              if (!handledBossDefeat) {
                this.spawnLootFromNpc(target, player.id);
              }
              this.questSystem.updateCombatQuests(player, target.id ?? target.name, target.id);
            }
          }
          this.pushPlayerStateSync(id, player);
          return;
        }
        const skill = getSkillDefinition(skillId);
        if (!skill) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Unknown skill." });
          return;
        }
        const now = Date.now();
        if (!player.skillCooldowns || typeof player.skillCooldowns !== "object") {
          player.skillCooldowns = {};
        }
        const until = Number(player.skillCooldowns[skill.id] ?? 0);
        if (Number.isFinite(until) && until > now) {
          this.ws.sendToPlayer(id, { type: "toast", text: `${skill.name} is not ready yet.` });
          return;
        }
        const mana = Number(player.mana ?? 0);
        if (!Number.isFinite(mana) || mana < skill.manaCost) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Not enough mana." });
          return;
        }

        if (skill.kind === "offensive") {
          const target = this.findTargetNpcForPlayer(player);
          if (!target || !this.isWithinDistance(player.position, target.position, skill.range)) {
            this.ws.sendToPlayer(id, { type: "toast", text: "No target in range." });
            return;
          }
          player.mana = mana - skill.manaCost;
          player.skillCooldowns[skill.id] = now + skill.cooldownMs;
          const hit = this.combatSystem.spellStrike(player, target, skill.spellPower);
          this.ws.broadcast({ type: "entity_action", entityId: player.id, action: "attack" });
          if (hit.fx) {
            this.ws.broadcast({
              type: "fx",
              at: { x: target.position.x, y: target.position.y },
              kind: hit.fx.kind,
              n: hit.fx.n,
            });
          }
          if (hit.hit) {
            this.handleWorldBossDamageAttribution(player, target, hit.damage);
            this.ws.broadcast({
              type: "combat_result",
              attackerId: player.id,
              targetId: target.id,
              damage: hit.damage,
              crit: hit.crit ?? false,
              hit: true,
              targetHp: target.health,
              targetHpMax: target.maxHealth ?? target.health,
              killed: hit.killed ?? false,
            });
          }
          this.ws.sendToPlayer(id, {
            type: "toast",
            text: hit.hit ? `${skill.name} hits for ${hit.damage}${hit.crit ? " (CRIT!)" : ""}.` : `${skill.name} missed.`,
          });
          if (hit.killed && target.health <= 0) {
            target.aggroTargetId = null;
            player.kills = Math.max(0, Number(player.kills) || 0) + 1;
            this.applyWarfrontContribution(player, id, "combat", 8, "combat_kill");
            const handledBossDefeat = this.tryHandleWorldBossDefeat(player, target);
            if (!handledBossDefeat) {
              this.spawnLootFromNpc(target, player.id);
            }
            this.questSystem.updateCombatQuests(player, target.id ?? target.name, target.id);
          }
          this.pushPlayerStateSync(id, player);
          return;
        }

        // self skill
        player.mana = mana - skill.manaCost;
        player.skillCooldowns[skill.id] = now + skill.cooldownMs;
        if (skill.healAmount && skill.healAmount > 0) {
          player.health = Math.min(player.maxHealth ?? 100, (player.health ?? 0) + skill.healAmount);
        }
        this.ws.sendToPlayer(id, { type: "toast", text: `${skill.name} activated.` });
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "attack") {
        if (player.dead) {
          this.ws.sendToPlayer(id, { type: "toast", text: "You are defeated." });
          return;
        }
        const weapon = player.equipment?.weapon || null;
        const weaponRangeRaw = Number(weapon?.attackRange);
        const weaponRange =
          Number.isFinite(weaponRangeRaw) && weaponRangeRaw > 0 ? weaponRangeRaw : GameConfig.attackDistance;
        const weaponManaRaw = Number(weapon?.manaCost);
        const manaCost = Number.isFinite(weaponManaRaw) && weaponManaRaw >= 0 ? weaponManaRaw : 5;
        if ((player.mana ?? 0) < manaCost) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Not enough mana." });
          return;
        }

        const target = this.findTargetNpcForPlayer(player);
        if (!target || !this.isWithinDistance(player.position, target.position, weaponRange)) {
          this.ws.sendToPlayer(id, { type: "toast", text: "No target in range." });
          return;
        }

        player.mana = Math.max(0, (player.mana ?? 0) - manaCost);
        const weaponBonus = this.resolveWeaponDamageBonus(player, weapon);
        const atkResult = this.combatSystem.attackWithWeapon(player, target, weaponBonus);
        let reportedDamage = atkResult.damage;
        if (atkResult.hit) {
          const proc = applyLegendaryPowersFromEquipment(
            player.equipment ?? {},
            {
              attacker: {
                health: player.health ?? 0,
                maxHealth: player.maxHealth ?? 100,
              },
              target: {
                health: target.health ?? 0,
                maxHealth: target.maxHealth ?? target.health ?? 100,
              },
              dmg: atkResult.damage,
              crit: atkResult.crit ?? false,
            },
            player.gearInventory
          );
          if (proc.extraDmg > 0) {
            target.health = Math.max(0, (target.health ?? 0) - proc.extraDmg);
            reportedDamage += proc.extraDmg;
          }
          if (proc.heal > 0) {
            const mh = player.maxHealth ?? 100;
            player.health = Math.min(mh, (player.health ?? 0) + proc.heal);
          }
        }
        this.ws.broadcast({ type: "entity_action", entityId: player.id, action: "attack" });
        if (atkResult.fx) {
          this.ws.broadcast({
            type: "fx",
            at: { x: target.position.x, y: target.position.y },
            kind: atkResult.fx.kind,
            n: atkResult.fx.n,
          });
        }
        if (atkResult.hit) {
          this.handleWorldBossDamageAttribution(player, target, reportedDamage);
          const killed = (target.health ?? 0) <= 0;
          if (killed) target.health = 0;
          this.ws.broadcast({
            type: "combat_result",
            attackerId: player.id,
            targetId: target.id,
            damage: reportedDamage,
            crit: atkResult.crit ?? false,
            hit: true,
            targetHp: target.health,
            targetHpMax: target.maxHealth ?? target.health,
            killed,
          });
        }
        this.pushPlayerStateSync(id, player);
        if ((target.health ?? 0) <= 0) {
          target.health = 0;
          target.aggroTargetId = null;
          player.kills = Math.max(0, Number(player.kills) || 0) + 1;
          this.applyWarfrontContribution(player, id, "combat", 8, "combat_kill");
          const handledBossDefeat = this.tryHandleWorldBossDefeat(player, target);
          if (!handledBossDefeat) {
            this.spawnLootFromNpc(target, player.id);
          }
          this.questSystem.updateCombatQuests(player, target.id ?? target.name, target.id);
          this.pushPlayerStateSync(id, player);
        }
        return;
      }

      if (msg.type === "respawn") {
        if (!player.dead) return;
        const now = Date.now();
        const respawnAt = (typeof player.deathAt === "number" ? player.deathAt : 0) + GameConfig.playerRespawnDelayMs;
        if (now < respawnAt) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Respawn not yet available." });
          return;
        }
        const spawnPoint = this.resolvePlayerRespawnPoint(player);
        player.dead = false;
        player.health = Math.floor((player.maxHealth ?? 100) * 0.3);
        player.mana = Math.floor((player.maxMana ?? 25) * 0.3);
        player.position.x = spawnPoint.x;
        player.position.y = spawnPoint.z;
        player.deathAt = 0;
        this.ws.sendToPlayer(id, {
          type: "player_respawned",
          x: spawnPoint.x,
          z: spawnPoint.z,
          health: player.health,
          mana: player.mana,
          label: spawnPoint.label ?? "Hub",
        });
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "party_create") {
        const { createParty, getPartyForPlayer } = await import("../modules/party/partySystem.js");
        const party = createParty(player.id);
        this.broadcastPartySyncForParty(party.id);
        this.ws.sendToPlayer(id, { type: "toast", text: "Party created!" });
        return;
      }

      if (msg.type === "party_invite") {
        const targetName = typeof msg.targetName === "string" ? msg.targetName.trim() : "";
        if (!targetName) return;
        const { inviteToParty, getPartyForPlayer } = await import("../modules/party/partySystem.js");
        const target = this.playerSystem.getAllPlayers().find((p) => p.name === targetName && !p.isOffline);
        if (!target) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Player not found." });
          return;
        }
        const result = inviteToParty(player.id, target.id);
        if (!result.ok) {
          const reasons: Record<string, string> = {
            not_in_party: "Create a party first.",
            not_leader: "Only the leader can invite.",
            party_full: "Party is full (max 4).",
            target_in_party: "Player is already in a party.",
          };
          this.ws.sendToPlayer(id, { type: "toast", text: reasons[result.reason ?? ""] ?? "Cannot invite." });
          return;
        }
        const party = getPartyForPlayer(player.id);
        if (party) this.broadcastPartySyncForParty(party.id);
        const targetSocket = this.getSocketForPlayer(target.id);
        if (targetSocket) {
          this.ws.sendToPlayer(targetSocket, { type: "toast", text: `You joined ${player.name}'s party!` });
        }
        this.ws.sendToPlayer(id, { type: "toast", text: `${target.name} joined the party!` });
        return;
      }

      if (msg.type === "party_leave") {
        const { leaveParty, getPartyForPlayer } = await import("../modules/party/partySystem.js");
        const oldParty = getPartyForPlayer(player.id);
        const oldPartyId = oldParty?.id;
        leaveParty(player.id);
        this.ws.sendToPlayer(id, { type: "party_sync", partyId: null, members: [] });
        this.ws.sendToPlayer(id, { type: "toast", text: "You left the party." });
        if (oldPartyId) this.broadcastPartySyncForParty(oldPartyId);
        return;
      }

      if (msg.type === "equip_gear") {
        const itemUid = typeof msg.itemUid === "string" ? msg.itemUid.trim() : "";
        if (!itemUid) return;
        ensureDualInventoryFields(player);
        const idx = player.gearInventory.findIndex((x: any) => x && x.uid === itemUid);
        if (idx < 0) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Gear not found." });
          return;
        }
        const g = player.gearInventory[idx];
        const def = ItemRegistry.getItem(g.baseId);
        if (!def || (def.type !== "weapon" && def.type !== "armor")) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Cannot equip this gear type yet." });
          return;
        }
        const slot = def.type === "weapon" ? "weapon" : def.slot === "offHand" ? "offHand" : "armor";
        if (def.type === "armor" && def.slot !== "armor" && def.slot !== "offHand") {
          this.ws.sendToPlayer(id, { type: "toast", text: "Armor slot not supported for this item." });
          return;
        }
        const equipRow = {
          ...def,
          id: g.baseId,
          uid: g.uid,
          name: typeof g.name === "string" ? g.name : def.name,
          rarity: g.rarity ?? "magic",
          ilvl: typeof g.ilvl === "number" ? g.ilvl : player.level ?? 1,
          stats: g.stats && typeof g.stats === "object" ? g.stats : {},
          ...(typeof g.legendaryPowerId === "string" ? { legendaryPowerId: g.legendaryPowerId } : {}),
          ...(Array.isArray(g.socketed) ? { socketed: g.socketed } : {}),
        };
        const prev = player.equipment?.[slot] ?? null;
        if (prev) {
          if (typeof prev.uid === "string" && prev.uid) {
            player.gearInventory.push({
              uid: prev.uid,
              baseId: prev.id,
              name: typeof prev.name === "string" ? prev.name : prev.id,
              rarity: prev.rarity ?? "magic",
              ilvl: typeof prev.ilvl === "number" ? prev.ilvl : player.level ?? 1,
              stats: prev.stats && typeof prev.stats === "object" ? prev.stats : {},
              ...(typeof prev.legendaryPowerId === "string" ? { legendaryPowerId: prev.legendaryPowerId } : {}),
              ...(Array.isArray(prev.socketed) ? { socketed: prev.socketed } : {}),
            });
          } else {
            this.inventorySystem.addItem(player, { id: prev.id, quantity: prev.quantity ?? 1 });
          }
        }
        player.gearInventory.splice(idx, 1);
        if (!player.equipment) player.equipment = { weapon: null, armor: null, offHand: null };
        (player.equipment as any)[slot] = equipRow;
        this.ws.sendToPlayer(id, { type: "toast", text: `Equipped ${equipRow.name}.` });
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "equip_item") {
        const itemId = typeof msg.itemId === "string" ? msg.itemId.trim() : "";
        if (!itemId) return;
        const equipment = this.inventorySystem.equipItem(player, itemId);
        if (equipment) {
          this.ws.sendToPlayer(id, { type: "toast", text: `Equipped item.` });
          this.pushPlayerStateSync(id, player);
        }
        return;
      }

      if (msg.type === "unequip_item") {
        const slot = typeof msg.slot === "string" ? msg.slot.trim() : "";
        if (!slot || (slot !== "weapon" && slot !== "armor" && slot !== "offHand")) return;
        const equipment = this.inventorySystem.unequipItem(player, slot);
        if (equipment) {
          this.ws.sendToPlayer(id, { type: "toast", text: `Unequipped ${slot}.` });
          this.pushPlayerStateSync(id, player);
        } else {
          this.ws.sendToPlayer(id, {
            type: "toast",
            kind: "warn",
            text: "This bound item cannot be unequipped via transfer slots.",
          });
        }
        return;
      }

      if (msg.type === "pickup_loot") {
        const lootId = typeof msg.lootId === "string" ? msg.lootId.trim() : "";
        if (!this.tryPickupLoot(id, player, lootId)) return;
        return;
      }

      if (msg.type === "craft") {
        const recipeId = typeof msg.recipeId === "string" ? msg.recipeId.trim() : "";
        if (!recipeId) return;
        const count = Math.max(1, Math.min(50, Math.floor(Number(msg.count) || 1)));
        let crafted = 0;
        let lastName = recipeId;
        let totalCraftXp = 0;
        for (let i = 0; i < count; i++) {
          const result = this.craftingSystem?.craft(player, recipeId);
          if (!result || !result.success) {
            if (crafted === 0) {
              this.ws.sendToPlayer(id, { type: "toast", text: result?.reason ?? "Crafting failed." });
            }
            break;
          }
          crafted++;
          if (result.itemId) lastName = result.itemId;
          totalCraftXp += Math.max(0, Number(result.xp) || 0);
        }
        if (crafted > 0) {
          this.ws.sendToPlayer(id, { type: "toast", text: `Hergestellt: ${crafted}x ${lastName}` });
          this.grantCraftXpIfAny(id, player, totalCraftXp);
          this.applyWarfrontContribution(player, id, "crafting", crafted * 2, "craft_batch");
        }
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "house_place") {
        const itemId = typeof msg.itemId === "string" ? msg.itemId.trim() : "";
        const hx = Number(msg.x);
        const hy = Number(msg.y);
        const hr = Number(msg.r) || 0;
        if (!itemId || !Number.isFinite(hx) || !Number.isFinite(hy)) return;
        const taken = this.inventorySystem.takeOneFromBag(player, itemId);
        if (!taken) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Item not in inventory." });
          return;
        }
        this.housingObjects.set(`ho_${Date.now()}_${player.id}`, {
          id: `ho_${Date.now()}_${player.id}`,
          ownerId: player.id,
          itemId,
          x: hx,
          y: hy,
          r: hr,
        });
        this.ws.sendToPlayer(id, { type: "toast", text: "Platziert." });
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "interact") {
        const lootId = typeof msg.lootId === "string" ? msg.lootId.trim() : "";
        const didLoot = lootId ? this.tryPickupLoot(id, player, lootId) : false;
        const npcId =
          typeof msg.npcId === "string"
            ? msg.npcId.trim()
            : typeof msg.targetNpcId === "string"
              ? msg.targetNpcId.trim()
              : "";
        let didNpc = false;
        if (npcId) {
          const talkRewards = this.questSystem.checkTalkToQuests(player, npcId);
          const collectRewards = this.questSystem.checkCollectTurnInQuests(player, npcId);
          const qlDone = tryCompleteQuestlineTalkAtNpc(player, this.questSystem, npcId);
          if (talkRewards.length || collectRewards.length || qlDone.length) {
            this.pushPlayerStateSync(id, player);
          }
          didNpc = true;
        }
        if (didNpc && !didLoot) {
          this.ws.sendToPlayer(id, { type: "dialogue", text: "Hello traveler!" });
        }
        return;
      }
    };
    this.ws.onPlayerMessage = async (id, msg) => {
      await handlePlayerMessage(id, msg);
    };
  }

  private getChatRecipients(): ChatRecipient[] {
    return this.playerSystem.getAllPlayers()
      .filter((p: any) => !p.isOffline && this.playerToSocket.has(p.id))
      .map((p: any) => ({ id: p.id, position: { x: p.position.x, y: p.position.y } }));
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
    this.tickFusionIntegrations(now);
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
    const onlinePlayers = this.playerSystem.getAllPlayers().filter(p => !p.isOffline);
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

    if (this.tickCount % 600 === 0) this.saveAll();

    const recipients = this.getChatRecipients();

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

    // NPC chat agent: every 10 ticks (~1s) let NPCs near players chat
    if (this.tickCount % 10 === 0 && onlinePlayers.length > 0) {
      const localChatRadiusSq = LOCAL_CHAT_RADIUS * LOCAL_CHAT_RADIUS;
      for (const npc of this.npcSystem.getAllNPCs()) {
        const nx = npc.position.x;
        const ny = npc.position.y;
        const nearPlayer = onlinePlayers.some((p: any) => {
          const dx = p.position.x - nx;
          const dy = p.position.y - ny;
          // ⚡ Bolt Optimization: Use squared distance to avoid Math.hypot()
          return dx * dx + dy * dy <= localChatRadiusSq;
        });
        if (!nearPlayer) continue;

        // Feed recent chat into NPC memory
        const recentChat = this.chatChannelRouter.getRecentForPosition(npc.position, 10);
        for (const cm of recentChat) {
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

    // Flush dirty NPC memory to Supabase every 300 ticks (~30s)
    if (this.tickCount % 300 === 0) {
      void flushDirtyEntries(this.npcMemoryCache).catch(() => {});
    }

    // LiveHeal v2: run health checks via WorldTick (no duplicate scheduling)
    if (this.tickCount % 10 === 0) {
      void this.liveHeal.onTick().catch(() => { /* never crash the tick */ });
    }

    this.broadcastState();
  }

  public clearGlbPathCache() {
    this.glbPathCache.clear();
  }

  broadcastState() {
    const tickCount = this.tickCount;
    const entities: any[] = [];

    // Optimize: Zero-allocation iteration using internal Maps and for...of
    const playersMap = this.playerSystem.getPlayersMap();
    for (const p of playersMap.values()) {
      entities.push({
        id: p.id,
        type: 'player',
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
        visible: true
      });
    }

    const npcsMap = this.npcSystem.getNPCsMap();
    for (const n of npcsMap.values()) {
      entities.push({
        id: n.id,
        type: 'npc',
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
        visible: true
      });
    }

    for (const l of this.lootEntities.values()) {
      entities.push({
        id: l.id,
        type: 'loot',
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
        visible: true
      });
    }

    const chunks: Array<{ id: string; chunkX: number; chunkY: number; objects: any[] }> = [];
    const chunkObjects = new Map<string, any[]>();

    // Include world objects if they exist
    if (this.worldSystem.objectSystem) {
      const objectsMap = this.worldSystem.objectSystem.getObjectsMap();
      for (const obj of objectsMap.values()) {
        entities.push({
          id: obj.id,
          type: obj.type || 'object',
          position: { x: obj.position.x, y: 0, z: obj.position.y },
          rotation: { x: 0, y: obj.rotation || 0, z: 0 },
          glbPath: obj.glbPath || this.resolveWorldObjectGlbPath(obj.type, obj.name || obj.id, obj.id),
          are: this.areStateCompiler.compileEntity(
            {
              id: obj.id,
              type: obj.type || "object",
              position: { x: obj.position.x, y: 0, z: obj.position.y },
              visible: true,
            },
            tickCount
          ),
          visible: true
        });
      }

      // Build real chunks from chunkSystem — include world objects per chunk
      for (const obj of objectsMap.values()) {
        const chunkId = this.chunkSystem.getChunkId(obj.position.x, obj.position.y);
        let cObjs = chunkObjects.get(chunkId);
        if (!cObjs) {
          cObjs = [];
          chunkObjects.set(chunkId, cObjs);
        }
        cObjs.push({
          id: obj.id,
          type: obj.type || "object",
          glbPath: obj.glbPath || this.resolveWorldObjectGlbPath(obj.type, obj.name || obj.id, obj.id),
          position: { x: obj.position.x, y: 0, z: obj.position.y },
          rotation: obj.rotation || 0,
        });
      }

      for (const [chunkId, objects] of chunkObjects) {
        const [cx, cy] = chunkId.split(":").map(Number);
        chunks.push({ id: chunkId, chunkX: cx, chunkY: cy, objects });
      }
    }

    // Also include chunks that have entities (players, NPCs)
    // ⚡ Bolt Optimization: Use chunkObjects keys directly to avoid redundant map/re-iteration
    const existingChunkIds = new Set(chunkObjects.keys());
    for (const player of playersMap.values()) {
      const chunkId = this.chunkSystem.getChunkId(player.position.x, player.position.y);
      if (!existingChunkIds.has(chunkId)) {
        existingChunkIds.add(chunkId);
        const [cx, cy] = chunkId.split(":").map(Number);
        chunks.push({ id: chunkId, chunkX: cx, chunkY: cy, objects: [] });
      }
    }
    for (const npc of npcsMap.values()) {
      const chunkId = this.chunkSystem.getChunkId(npc.position.x, npc.position.y);
      if (!existingChunkIds.has(chunkId)) {
        existingChunkIds.add(chunkId);
        const [cx, cy] = chunkId.split(":").map(Number);
        chunks.push({ id: chunkId, chunkX: cx, chunkY: cy, objects: [] });
      }
    }

    // Ensure at least one chunk exists
    if (chunks.length === 0) {
      chunks.push({ id: "0:0", chunkX: 0, chunkY: 0, objects: [] });
    }

    this.ws.broadcast({
      type: 'entity_sync',
      areMode: this.areMode,
      entities,
      chunks,
    });

    if (this.worldBossEncounterSummaries.length > 0 && this.tickCount % 25 === 0) {
      const latest = this.worldBossEncounterSummaries[this.worldBossEncounterSummaries.length - 1];
      this.ws.broadcast({
        type: "worldboss_ranking",
        dungeonId: latest.dungeonId,
        encounterId: latest.encounterId,
        top: latest.topRewards.map((row: any) => ({
          playerId: row.playerId,
          playerName: row.playerName,
          rank: row.rank,
          damage: row.damage,
        })),
      });
    }
  }

  private registerLiveHealSubsystems(): void {
    const lh = this.liveHeal;

    // Register core subsystems with health adapters
    lh.registerSubsystem({
      id: "worldtick",
      getHealthSnapshot: (): HealthSnapshot => {
        const tickMs = 100; // fixed interval
        return {
          ok: true,
          status: "healthy",
          score: 100,
          symptomTags: [],
          metrics: { tickDurationMs: tickMs, uptimeMs: Date.now() % 1e9 },
          canServeReadOnly: true,
        };
      },
      getProtectedFeatures: () => ["core-worldtick"],
    });

    lh.registerSubsystem({
      id: "player-system",
      getHealthSnapshot: (): HealthSnapshot => {
        const players = this.playerSystem.getAllPlayers();
        const online = players.filter(p => !p.isOffline).length;
        return {
          ok: true,
          status: "healthy",
          score: 100,
          symptomTags: [],
          metrics: { activeConnections: online, queueDepth: players.length },
          canServeReadOnly: true,
        };
      },
      getDependencies: () => ["worldtick"],
      getProtectedFeatures: () => ["core-worldtick", "player-persistence"],
    });

    lh.registerSubsystem({
      id: "npc-system",
      getHealthSnapshot: (): HealthSnapshot => {
        const npcs = this.npcSystem.getAllNPCs();
        return {
          ok: true,
          status: "healthy",
          score: 100,
          symptomTags: [],
          metrics: { queueDepth: npcs.length },
          canServeReadOnly: true,
        };
      },
      getDependencies: () => ["worldtick"],
    });

    lh.registerSubsystem({
      id: "combat-system",
      getHealthSnapshot: (): HealthSnapshot => ({
        ok: true,
        status: "healthy",
        score: 100,
        symptomTags: [],
        metrics: {},
        canServeReadOnly: false,
      }),
      getDependencies: () => ["player-system", "npc-system"],
      getProtectedFeatures: () => ["combat-system"],
    });

    lh.registerSubsystem({
      id: "asset-health",
      getHealthSnapshot: () => this.assetHealthService.getHealthSnapshot(),
      getProtectedFeatures: () => [],
    });

    // Register dependencies
    lh.registerDependencies([
      { from: "player-system", to: "worldtick" },
      { from: "npc-system", to: "worldtick" },
      { from: "combat-system", to: "player-system" },
      { from: "combat-system", to: "npc-system" },
    ]);

    // Register adaptive strategies
    const assetHealthSvc = this.assetHealthService;
    lh.registerStrategy({
      name: "asset_rescan",
      subsystems: ["asset-health"],
      riskLevel: "low",
      cooldownMs: 30000,
      maxAttempts: 2,
      mayTouchState: false,
      mayDropQueue: false,
      preservesFeatures: true,
      async run(subsystemId: string): Promise<import("./liveheal/LiveHealTypes.js").HealingResult> {
        const start = Date.now();
        await assetHealthSvc.incrementalScan();
        return {
          success: true,
          strategyName: "asset_rescan",
          message: `Asset incremental rescan completed in ${Date.now() - start}ms.`,
          durationMs: Date.now() - start,
          sideEffects: [],
          serviceable: true,
        };
      },
    });

    // Trigger startup asset scan (non-blocking)
    void this.assetHealthService.startupScan().catch(() => { /* best effort */ });
  }

  getWorld() {
    return {
       updateMonsters: () => {} // Shim for WebSocketServer compatibility if needed
    };
  }

  public getPersistenceStats() {
    return {
      driver: this.persistence.getDriverName(),
      glbLinksStore: this.glbLinksStore,
      ouroboros: this.ouroborosEngine.getStats(),
    };
  }

  public listActiveVoteBanners() {
    return this.getPublicVoteBanners();
  }

  private resolveNpcGlbPath(npc: any): string | undefined {
    const cacheKey = `npc:${npc.id}:${npc.role}`;
    if (this.glbPathCache.has(cacheKey)) return this.glbPathCache.get(cacheKey);

    const fusionOverride = this.gameplayFusionDirector.resolveNpcGlbOverride(npc);
    if (fusionOverride) {
      this.glbPathCache.set(cacheKey, fusionOverride);
      return fusionOverride;
    }

    const single = this.glbRegistry.getModelForTarget("npc_single", npc.id);
    if (single) {
      this.glbPathCache.set(cacheKey, single);
      return single;
    }
    const byRole = this.glbRegistry.getModelForTarget("npc_group", String(npc.role || ""));
    if (byRole) {
      this.glbPathCache.set(cacheKey, byRole);
      return byRole;
    }
    const path = this.resolveEntityGlbPath("npcs", npc.role || npc.name || npc.id, npc.id);
    this.glbPathCache.set(cacheKey, path);
    return path;
  }

  private resolveWorldObjectGlbPath(type: string | undefined, name: string | undefined, id: string): string | undefined {
    const cacheKey = `obj:${id}:${type}`;
    if (this.glbPathCache.has(cacheKey)) return this.glbPathCache.get(cacheKey);

    const fusionOverride = this.gameplayFusionDirector.resolveWorldObjectGlbOverride(type);
    if (fusionOverride) {
      this.glbPathCache.set(cacheKey, fusionOverride);
      return fusionOverride;
    }

    const single = this.glbRegistry.getModelForTarget("object_single", id);
    if (single) {
      this.glbPathCache.set(cacheKey, single);
      return single;
    }
    const byType = type ? this.glbRegistry.getModelForTarget("object_group", type) : null;
    if (byType) {
      this.glbPathCache.set(cacheKey, byType);
      return byType;
    }
    const path = this.resolveEntityGlbPath("world_objects", type || name || id, id);
    this.glbPathCache.set(cacheKey, path);
    return path;
  }

  private resolveEntityGlbPath(category: string, key: string | undefined, seed: string): string | undefined {
    return this.assetPoolResolver.resolvePath(category, key, seed);
  }

}
