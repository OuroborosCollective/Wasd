import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { applyLegendaryPowersFromEquipment } from "../modules/items/legendaryPowers.js";
import { addGearToPlayer, ensureDualInventoryFields } from "../modules/items/dualInventoryTypes.js";
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
import { resolveLoginIdentity } from "../modules/auth/resolveLoginIdentity.js";
import { getSkillDefinition, buildSkillCooldownUntilPayload } from "../modules/skill/skillDefinitions.js";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import {
  initRedisChatRelay,
  onRedisChatMessage,
  publishChatMessage,
  type ChatMessage as RelayedChatMessage,
  type ChatScope as RelayedChatScope,
} from "../modules/chat/RedisChatRelay.js";

import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { GameConfig } from "../config/GameConfig.js";

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
  targetSpawnKey: string;
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
  private readonly glbLinksStore: "file" | "spacetime";
  private runtimeSettings: RuntimeSettingsStore;
  private areModeAuditTrail: AREModeAuditTrail;
  private areStateCompiler: AREStateCompiler;
  private lootEntities: Map<string, any> = new Map();
  private housingObjects: Map<string, any> = new Map();
  private craftingSystem: any = null;
  private questlineEngine: QuestlineEngine;

  private socketToPlayer: Map<string, string> = new Map(); // socketId -> characterName
  private lastActionTimes: Map<string, number> = new Map(); // charName -> timestamp
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
  private readonly USE_ITEM_TOASTS: Record<string, string> = {
    minor_mana_draught: "You drink Minor Mana Draught (+mana).",
    health_potion: "You drink Health Potion (+hp).",
  };

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

      const spawn = this.applySpawnToPlayer(player, trigger.sceneId, trigger.targetSpawnKey);
      this.sceneTriggerCooldowns.set(player.id, now + SCENE_TRIGGER_COOLDOWN_MS);
      this.observerEngine.updatePosition(socketId, player.position);
      this.ws.sendToPlayer(socketId, {
        type: "scene_changed",
        sceneId: spawn.sceneId,
        spawnKey: spawn.spawnKey,
        spawnPosition: spawn.spawnPoint,
        via: "zone_trigger",
        triggerId: trigger.id,
      });
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
      combatTargetNpcId: player.combatTargetNpcId ?? null,
    });
  }

  private findTargetNpcForPlayer(player: any): any | null {
    const targetId = typeof player?.combatTargetNpcId === "string" ? player.combatTargetNpcId : "";
    if (targetId) {
      const explicit = this.npcSystem.getNPC(targetId);
      if (explicit && explicit.health > 0) return explicit;
    }
    let best: any | null = null;
    let bestDist = Infinity;
    for (const npc of this.npcSystem.getAllNPCs()) {
      if (!npc || npc.health <= 0) continue;
      const dist = Math.hypot((npc.position?.x ?? 0) - player.position.x, (npc.position?.y ?? 0) - player.position.y);
      if (dist < bestDist) {
        best = npc;
        bestDist = dist;
      }
    }
    return best;
  }

  private isWithinDistance(a: { x: number; y: number }, b: { x: number; y: number }, d: number): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) <= d;
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
    });
    this.persistence = new PersistenceManager();
    this.worldSystem = new WorldSystem(this.persistence);
    this.glbLinksStore = process.env.GLB_LINKS_STORE?.trim().toLowerCase() === "spacetime" ? "spacetime" : "file";
    this.glbRegistry = new GLBRegistry();
    this.assetPoolResolver = new AssetPoolResolver();
    this.runtimeSettings = new RuntimeSettingsStore();
    this.areModeAuditTrail = new AREModeAuditTrail();
    this.areStateCompiler = new AREStateCompiler();
    this.craftingSystem = new CraftingSystem();
    this.areMode = this.runtimeSettings.getAREMode();
    void initRedisChatRelay();
    this.chatUnsubscribe = onRedisChatMessage((chatMessage: RelayedChatMessage) => {
      this.broadcastChatMessage(chatMessage);
    });

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

    this.ws.onPlayerMessage = async (id, msg) => {
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
              combatTargetNpcId: player.combatTargetNpcId ?? null,
            };
            })(),
          });
          this.pushPlayerStateSync(id, player);
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
        return;
      }

      const playerUid = this.socketToPlayer.get(id);
      const player = playerUid ? this.playerSystem.getPlayer(playerUid) : null;

      if (!player) return;

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

      if (msg.type === "set_target") {
        const requested = typeof msg.npcId === "string" ? msg.npcId.trim() : "";
        player.combatTargetNpcId = requested.length > 0 ? requested : null;
        this.pushPlayerStateSync(id, player);
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
            this.spawnLootFromNpc(target, player.id);
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
          this.spawnLootFromNpc(target, player.id);
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
        const slot = def.type === "weapon" ? "weapon" : "armor";
        if (def.type === "armor" && def.slot !== "armor") {
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
        if (!player.equipment) player.equipment = { weapon: null, armor: null };
        (player.equipment as any)[slot] = equipRow;
        this.ws.sendToPlayer(id, { type: "toast", text: `Equipped ${equipRow.name}.` });
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "pickup_loot") {
        const lootId = typeof msg.lootId === "string" ? msg.lootId.trim() : "";
        if (!lootId) return;
        const bag = this.lootEntities.get(lootId);
        if (!bag) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Loot not found." });
          return;
        }
        if (bag.ownerId && bag.ownerId !== player.id && Date.now() < (bag.ownerExclusiveUntil ?? 0)) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Loot belongs to another player." });
          return;
        }
        const lootPos = bag.position ?? { x: bag.x ?? 0, y: bag.y ?? 0 };
        if (!this.isWithinDistance(player.position, lootPos, GameConfig.interactDistance)) {
          this.ws.sendToPlayer(id, { type: "toast", text: "Too far away." });
          return;
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
        this.lootEntities.delete(lootId);
        this.ws.broadcast({ type: "loot_despawned", lootId });
        this.ws.sendToPlayer(id, {
          type: "loot_picked",
          lootId,
          items: pickedItems,
          gear: pickedGear,
          gold,
        });
        if (gold > 0) {
          this.ws.sendToPlayer(id, { type: "fx", at: player.position, kind: "gold", n: gold });
        }
        this.ws.sendToPlayer(id, { type: "toast", text: `Beute eingesammelt${gold > 0 ? ` (+${gold} Gold)` : ""}.` });
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "craft") {
        const recipeId = typeof msg.recipeId === "string" ? msg.recipeId.trim() : "";
        if (!recipeId) return;
        const count = Math.max(1, Math.min(50, Math.floor(Number(msg.count) || 1)));
        let crafted = 0;
        let lastName = recipeId;
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
        }
        if (crafted > 0) {
          this.ws.sendToPlayer(id, { type: "toast", text: `Hergestellt: ${crafted}x ${lastName}` });
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
        const npcId =
          typeof msg.npcId === "string"
            ? msg.npcId.trim()
            : typeof msg.targetNpcId === "string"
              ? msg.targetNpcId.trim()
              : "";
        if (npcId) {
          const talkRewards = this.questSystem.checkTalkToQuests(player, npcId);
          const collectRewards = this.questSystem.checkCollectTurnInQuests(player, npcId);
          const qlDone = tryCompleteQuestlineTalkAtNpc(player, this.questSystem, npcId);
          if (talkRewards.length || collectRewards.length || qlDone.length) {
            this.pushPlayerStateSync(id, player);
          }
        }
        this.ws.sendToPlayer(id, { type: "dialogue", text: "Hello traveler!" });
        return;
      }
    };
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
      this.playerSystem.setPlayer(id, savedData[id]);
    }
    this.loadRuntimeEventTemplates();
    this.loadSceneLayouts();
    this.loadSpawns();
    if (this.craftingSystem?.loadRecipes) {
      this.craftingSystem.loadRecipes().catch(() => {});
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
    this.processTemplateQueue();
    const onlinePlayers = this.playerSystem.getAllPlayers().filter(p => !p.isOffline);
    this.npcSystem.tick(onlinePlayers, this.worldSystem.worldTime);
    this.worldSystem.tick();
    this.cleanupExpiredLoot();

    if (this.tickCount % 600 === 0) this.saveAll();

    this.broadcastState();
  }

  broadcastState() {
    const tickCount = this.tickCount;
    const entities = [
      ...this.playerSystem.getAllPlayers().map(p => ({
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
      })),
      ...this.npcSystem.getAllNPCs().map(n => ({
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
      })),
      ...Array.from(this.lootEntities.values()).map(l => ({
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
      }))
    ];

    // Include world objects if they exist
    if (this.worldSystem.objectSystem) {
      const worldObjects = this.worldSystem.objectSystem.getAllObjects().map(obj => ({
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
      }));
      entities.push(...worldObjects);
    }

    const chunks = []; // Simplified for now

    this.ws.broadcast({
      type: 'entity_sync',
      areMode: this.areMode,
      entities,
      chunks: [{ id: 'main', chunkX: 0, chunkY: 0, objects: [] }]
    });
  }

  public getWorld() {
    return {
       updateMonsters: () => {} // Shim for WebSocketServer compatibility if needed
    };
  }

  public getPersistenceStats() {
    return {
      driver: this.persistence.getDriverName(),
      glbLinksStore: this.glbLinksStore,
    };
  }

  private resolveNpcGlbPath(npc: any): string | undefined {
    const single = this.glbRegistry.getModelForTarget("npc_single", npc.id);
    if (single) return single;
    const byRole = this.glbRegistry.getModelForTarget("npc_group", String(npc.role || ""));
    if (byRole) return byRole;
    return this.resolveEntityGlbPath("npcs", npc.role || npc.name || npc.id, npc.id);
  }

  private resolveWorldObjectGlbPath(type: string | undefined, name: string | undefined, id: string): string | undefined {
    const single = this.glbRegistry.getModelForTarget("object_single", id);
    if (single) return single;
    const byType = type ? this.glbRegistry.getModelForTarget("object_group", type) : null;
    if (byType) return byType;
    return this.resolveEntityGlbPath("world_objects", type || name || id, id);
  }

  private resolveEntityGlbPath(category: string, key: string | undefined, seed: string): string | undefined {
    return this.assetPoolResolver.resolvePath(category, key, seed);
  }
}
