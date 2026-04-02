import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { NPCSystem } from "../modules/npc/NPCSystem.js";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { WorldSystem } from "../modules/world/WorldSystem.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";
import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";
import { AREStateCompiler } from "../modules/world/AREStateCompiler.js";
import { cache } from "./Cache.js";
import fs from "fs";
import path from "path";

import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { GameConfig } from "../config/GameConfig.js";
import { SkillSystem } from "../modules/skill/SkillSystem.js";
import { randomUUID } from "node:crypto";

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
type AREMode = "off" | "cpu" | "shader";

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

function npcIsCombatThreat(npc: any): boolean {
  if (!npc || (npc.health ?? 0) <= 0) return false;
  if (npc.faction === "Hostile") return true;
  if (npc.role === "Enemy") return true;
  return false;
}

function npcIsCombatTarget(npc: any): boolean {
  if (!npc || (npc.health ?? 0) <= 0) return false;
  if (npc.id === "npc_dummy" || npc.role === "Training") return true;
  return npcIsCombatThreat(npc);
}

function npcWillCounterAttack(npc: any): boolean {
  if (!npc) return false;
  return npc.faction === "Hostile" || npc.role === "Enemy";
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
  public skillSystem: SkillSystem;
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  private assetPoolResolver: AssetPoolResolver;
  private areStateCompiler: AREStateCompiler;
  private lootEntities: Map<string, any> = new Map();
  private lastPlayerAttackAt: Map<string, number> = new Map();
  private lastNpcCounterAttackAt: Map<string, number> = new Map();

  private socketToPlayer: Map<string, string> = new Map(); // socketId -> characterName
  /** WASD held per player (uid) — movement applied each tick so hold-to-move works on mobile + desktop */
  private playerKeysDown: Map<string, Set<string>> = new Map();
  /** Last analog stick vector from move_intent (-1..1), cleared after each tick */
  private playerAnalogMove: Map<string, { dx: number; dy: number }> = new Map();
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
  private areMode: AREMode = "shader";
  private eventTemplates: GMTemplateDefinition[] = Object.values(GM_EVENT_TEMPLATES);
  private pendingTemplateSteps: ScheduledGMTemplateStep[] = [];
  /** Last dialogue state per player for dialogue_choice / quest accept */
  private dialogueContext: Map<
    string,
    { npcId: string; pendingQuestId: string | null; nodeId: string }
  > = new Map();

  private findNearestNpcForInteractWithDistance(player: any): { npc: any; d2: number } | null {
    const px = player.position.x;
    const py = player.position.y;
    const maxD = GameConfig.interactDistance;
    let best: { npc: any; d2: number } | null = null;
    for (const npc of this.npcSystem.getAllNPCs()) {
      const dx = npc.position.x - px;
      const dy = npc.position.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 <= maxD * maxD && (!best || d2 < best.d2)) {
        best = { npc, d2 };
      }
    }
    return best;
  }

  private findNearestNpcForInteract(player: any) {
    return this.findNearestNpcForInteractWithDistance(player)?.npc ?? null;
  }

  private sendDialogueToPlayer(
    socketId: string,
    playerId: string,
    interaction: {
      source: string;
      text: string;
      questId: string | null;
      choices: any[];
      npcId: string;
      nodeId: string;
    }
  ) {
    this.dialogueContext.set(playerId, {
      npcId: interaction.npcId,
      pendingQuestId: interaction.questId,
      nodeId: interaction.nodeId,
    });
    this.ws.sendToPlayer(socketId, {
      type: "dialogue",
      source: interaction.source,
      text: interaction.text,
      questId: interaction.questId,
      choices: interaction.choices || [],
      npcId: interaction.npcId,
      nodeId: interaction.nodeId,
    });
  }

  /** Keeps maxHealth/maxStamina in sync with level (XP) and clamps current pools when alive. */
  private ensurePlayerVitalityCaps(player: any) {
    this.skillSystem.checkPlayerLevel(player);
    if (!player.dead) {
      const mh = player.maxHealth ?? 100;
      const ms = player.maxStamina ?? 100;
      const mm = player.maxMana ?? 25;
      player.health = Math.min(Math.max(0, player.health ?? mh), mh);
      player.stamina = Math.min(Math.max(0, player.stamina ?? ms), ms);
      player.mana = Math.min(Math.max(0, player.mana ?? mm), mm);
    }
  }

  private pushPlayerStateSync(socketId: string, player: any) {
    this.ensurePlayerVitalityCaps(player);
    this.ws.sendToPlayer(socketId, {
      type: "stats_sync",
      gold: player.gold ?? 0,
      xp: player.xp ?? 0,
      level: player.level ?? 1,
      health: player.health ?? 100,
      maxHealth: player.maxHealth ?? 100,
      stamina: player.stamina ?? 100,
      maxStamina: player.maxStamina ?? 100,
      mana: player.mana ?? 25,
      maxMana: player.maxMana ?? 25,
      dead: Boolean(player.dead),
      deathAt: typeof player.deathAt === "number" ? player.deathAt : 0,
      respawnAvailableAt: player.dead
        ? (typeof player.deathAt === "number" ? player.deathAt : 0) + GameConfig.playerRespawnDelayMs
        : 0,
      quests: this.questSystem.getQuestSyncForClient(player),
      inventory: player.inventory || [],
      equipment: player.equipment || {},
    });
  }

  private killPlayer(socketId: string, player: any) {
    if (player.dead) return;
    player.dead = true;
    player.deathAt = Date.now();
    player.health = 0;
    this.playerKeysDown.delete(player.id);
    this.playerAnalogMove.delete(player.id);
    for (const npc of this.npcSystem.getAllNPCs()) {
      if (npc.aggroTargetId === player.id) {
        npc.aggroTargetId = null;
      }
    }
    this.ws.sendToPlayer(socketId, {
      type: "toast",
      text: "You were defeated. Tap Respawn when ready.",
    });
    this.pushPlayerStateSync(socketId, player);
  }

  private getEquippedWeaponStats(player: any): { damageBonus: number; attackRange: number | null } {
    const w = player?.equipment?.weapon;
    if (!w || typeof w.id !== "string") return { damageBonus: 0, attackRange: null };
    const def = ItemRegistry.hydrate(w);
    const damageBonus = typeof def.damage === "number" && def.damage > 0 ? def.damage : 0;
    const attackRange =
      typeof def.attackRange === "number" && def.attackRange > 0 ? def.attackRange : null;
    return { damageBonus, attackRange };
  }

  private dropLootFromNpc(npc: any) {
    const table = npc?.dropTable;
    if (!Array.isArray(table) || table.length === 0) return;
    const px = npc.position.x;
    const py = npc.position.y;
    for (const entry of table) {
      const chance = typeof entry.chance === "number" ? entry.chance : 0;
      if (chance <= 0 || Math.random() > chance) continue;

      const goldAmount =
        typeof entry.gold === "number" && entry.gold > 0
          ? Math.floor(entry.gold)
          : typeof entry.goldMin === "number" && typeof entry.goldMax === "number"
            ? Math.floor(entry.goldMin + Math.random() * (entry.goldMax - entry.goldMin + 1))
            : 0;

      const itemId = typeof entry.itemId === "string" ? entry.itemId : "";
      if (goldAmount > 0) {
        const id = `loot_${randomUUID()}`;
        this.lootEntities.set(id, {
          id,
          position: { x: px + (Math.random() - 0.5) * 1.2, y: py + (Math.random() - 0.5) * 1.2 },
          goldAmount,
          item: null,
          despawnAt: Date.now() + GameConfig.lootDespawnMs,
        });
      }

      if (itemId) {
        const inst = ItemRegistry.createInstance(itemId);
        if (!inst) continue;
        const id = `loot_${randomUUID()}`;
        this.lootEntities.set(id, {
          id,
          position: { x: px + (Math.random() - 0.5) * 1.2, y: py + (Math.random() - 0.5) * 1.2 },
          item: inst,
          despawnAt: Date.now() + GameConfig.lootDespawnMs,
        });
      }
    }
  }

  private findNearestLoot(player: any): { id: string; loot: any; d2: number } | null {
    const px = player.position.x;
    const py = player.position.y;
    const maxD = GameConfig.interactDistance;
    let best: { id: string; loot: any; d2: number } | null = null;
    for (const [id, loot] of this.lootEntities) {
      const lx = loot.position.x;
      const ly = loot.position.y;
      const dx = lx - px;
      const dy = ly - py;
      const d2 = dx * dx + dy * dy;
      if (d2 > maxD * maxD) continue;
      if (!best || d2 < best.d2) {
        best = { id, loot, d2 };
      }
    }
    return best;
  }

  private tryPickupLoot(socketId: string, player: any, entry: { id: string; loot: any }): boolean {
    const { id, loot } = entry;
    if (!this.lootEntities.has(id)) return false;
    const goldAmt = typeof loot.goldAmount === "number" ? loot.goldAmount : 0;
    if (goldAmt > 0) {
      player.gold = (player.gold ?? 0) + goldAmt;
      this.lootEntities.delete(id);
      this.ws.sendToPlayer(socketId, {
        type: "toast",
        text: `Picked up: ${goldAmt} gold`,
      });
      this.pushPlayerStateSync(socketId, player);
      return true;
    }
    const item = loot.item;
    if (!item?.id) {
      this.lootEntities.delete(id);
      return true;
    }
    this.inventorySystem.addItem(player, item);
    this.lootEntities.delete(id);
    this.ws.sendToPlayer(socketId, {
      type: "toast",
      text: `Picked up: ${item.name || item.id}`,
    });
    this.pushPlayerStateSync(socketId, player);
    return true;
  }

  private performNpcCounterAttack(npc: any, player: any, victimSocketId: string) {
    if (!npcWillCounterAttack(npc)) return;
    const px = player.position.x;
    const py = player.position.y;
    const dx = npc.position.x - px;
    const dy = npc.position.y - py;
    if (dx * dx + dy * dy > GameConfig.npcAttackDistance * GameConfig.npcAttackDistance) {
      return;
    }
    const now = Date.now();
    const last = this.lastNpcCounterAttackAt.get(npc.id) ?? 0;
    if (now - last < GameConfig.npcCounterAttackCooldownMs) {
      return;
    }
    this.lastNpcCounterAttackAt.set(npc.id, now);
    const outcome = this.combatSystem.attack(npc, player);
    if (outcome.hit) {
      this.ws.broadcast({
        type: "entity_action",
        entityId: player.id,
        action: "hit",
        damage: outcome.damage,
      });
    }
    this.pushPlayerStateSync(victimSocketId, player);
    if ((player.health ?? 0) <= 0 && !player.dead) {
      this.killPlayer(victimSocketId, player);
    }
  }

  private processHostileNpcAggroAndChase(onlinePlayers: any[]) {
    const rAggro = GameConfig.npcAggroRadius;
    const rLeash = GameConfig.npcAggroLeash;
    const speed = GameConfig.npcChaseSpeed;
    const rAtk = GameConfig.npcAttackDistance;

    for (const npc of this.npcSystem.getAllNPCs()) {
      if (!npcWillCounterAttack(npc)) continue;
      if ((npc.health ?? 0) <= 0) continue;

      let targetPlayer: any = null;
      let targetSocket: string | undefined;

      if (npc.aggroTargetId) {
        targetPlayer = this.playerSystem.getPlayer(npc.aggroTargetId);
        if (!targetPlayer || targetPlayer.isOffline || targetPlayer.dead) {
          npc.aggroTargetId = null;
          targetPlayer = null;
        } else {
          targetSocket = this.getSocketForPlayer(targetPlayer.id) || this.getSocketForPlayer(targetPlayer.name);
          const hx = npc.homePosition?.x ?? npc.position.x;
          const hy = npc.homePosition?.y ?? npc.position.y;
          const tdx = targetPlayer.position.x - hx;
          const tdy = targetPlayer.position.y - hy;
          if (tdx * tdx + tdy * tdy > rLeash * rLeash) {
            npc.aggroTargetId = null;
            targetPlayer = null;
          }
        }
      }

      if (!targetPlayer) {
        let best: { p: any; d2: number } | null = null;
        for (const p of onlinePlayers) {
          if (p.dead) continue;
          const dx = p.position.x - npc.position.x;
          const dy = p.position.y - npc.position.y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= rAggro * rAggro && (!best || d2 < best.d2)) {
            best = { p, d2 };
          }
        }
        if (best) {
          npc.aggroTargetId = best.p.id;
          targetPlayer = best.p;
          targetSocket = this.getSocketForPlayer(targetPlayer.id) || this.getSocketForPlayer(targetPlayer.name);
        }
      }

      if (!targetPlayer || !targetSocket) continue;

      const dx = targetPlayer.position.x - npc.position.x;
      const dy = targetPlayer.position.y - npc.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.05 && dist > rAtk * 0.95) {
        npc.position.x += (dx / dist) * speed;
        npc.position.y += (dy / dist) * speed;
      }

      if (dist <= rAtk && !targetPlayer.dead) {
        this.performNpcCounterAttack(npc, targetPlayer, targetSocket);
      }
    }
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

  private sendGMStatus(socketId: string, level: "info" | "error", message: string, extra: Record<string, any> = {}) {
    this.ws.sendToPlayer(socketId, { type: "gm_status", level, message, ...extra });
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
      return true;
    }

    if (t === "admin_glb_list") {
      this.ws.sendToPlayer(socketId, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
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
      this.sendGMStatus(socketId, "info", `Unlinked ${msg.targetType}:${msg.targetId}`);
      return true;
    }

    if (t === "admin_glb_pool_get") {
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
      return true;
    }

    if (t === "admin_glb_pool_set") {
      if (!isNonEmptyString(msg.category) || !isNonEmptyString(msg.key) || !isNonEmptyString(msg.path)) {
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
      this.sendGMStatus(socketId, "info", `Asset pool entry removed: ${msg.category}.${msg.key}`);
      return true;
    }

    if (t === "admin_glb_pool_set_default") {
      if (!isNonEmptyString(msg.category) || !isNonEmptyString(msg.path)) {
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
      this.sendGMStatus(socketId, "info", `Asset pool default removed: ${msg.category}`);
      return true;
    }

    if (t === "admin_glb_pool_reload") {
      this.assetPoolResolver.reload();
      this.ws.sendToPlayer(socketId, {
        type: "admin_glb_pool_result",
        pools: this.assetPoolResolver.getDocument(),
      });
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
      case "gm_are_mode_set": {
        const mode = normalizeAREMode(msg.mode);
        if (!mode) {
          this.sendGMStatus(socketId, "error", "Invalid ARE mode. Use off, cpu or shader.");
          return true;
        }
        this.areMode = mode;
        this.ws.sendToPlayer(socketId, { type: "gm_are_mode_result", mode: this.areMode });
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
      target.isDead = false;
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
    this.skillSystem = new SkillSystem();
    this.persistence = new PersistenceManager();
    this.worldSystem = new WorldSystem(this.persistence);
    this.glbRegistry = new GLBRegistry();
    this.assetPoolResolver = new AssetPoolResolver();
    this.areStateCompiler = new AREStateCompiler();

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
        this.playerKeysDown.delete(uid);
        this.playerAnalogMove.delete(uid);
        this.dialogueContext.delete(uid);
        await this.saveAll();
        console.log(`Player ${player.name} (Socket ${id}) disconnected. Character remains in world.`);
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
      if (msg.type === "login") {
        let charName = "Unknown";
        let uid = "";
        
        try {
          if (msg.token) {
            const decodedToken = await verifyFirebaseToken(msg.token);
            if (decodedToken) {
              uid = decodedToken.uid;
              charName = decodedToken.name || decodedToken.email || uid;
            }
          } else {
             // For testing/dev if token not provided, use a random ID
             uid = `dev_${id}`;
             charName = `DevPlayer_${id.substr(0,4)}`;
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
            if (player.dead) {
              player.dead = false;
              player.health = player.maxHealth ?? 100;
              player.stamina = player.maxStamina ?? 100;
              shouldApplySpawn = true;
            }
          }

          const requestedSceneId = isNonEmptyString(msg.sceneId) ? msg.sceneId.trim() : undefined;
          const requestedSpawnKey = isNonEmptyString(msg.spawnKey) ? msg.spawnKey.trim() : undefined;
          if (requestedSceneId || requestedSpawnKey) {
            shouldApplySpawn = true;
          }
          const spawn = shouldApplySpawn
            ? this.applySpawnToPlayer(player, requestedSceneId ?? player.sceneId, requestedSpawnKey ?? player.spawnKey)
            : this.resolveSpawn(player.sceneId, player.spawnKey);

          if (!player.equipment?.weapon) {
            if (!player.equipment) {
              player.equipment = { weapon: null, armor: null };
            }
            const bow = ItemRegistry.createInstance("training_shortbow");
            if (bow) {
              player.equipment.weapon = bow;
            }
          }

          this.socketToPlayer.set(id, uid);
          this.playerToSocket.set(uid, id);
          this.observerEngine.register(id, player.position);

          this.ws.sendToPlayer(id, {
            type: "welcome",
            playerId: uid,
            id: uid, // legacy support
            sceneId: spawn.sceneId,
            spawnKey: spawn.spawnKey,
            spawnPosition: spawn.spawnPoint,
            stats: {
              gold: player.gold,
              xp: player.xp,
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
              equipment: player.equipment,
            },
          });
          this.pushPlayerStateSync(id, player);
        } catch (err) {
          console.error("Login error:", err);
          this.ws.sendToPlayer(id, { type: "error", message: "Login failed" });
        }
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

      if (player.dead) {
        if (msg.type === "respawn") {
          const now = Date.now();
          const deathAt = typeof player.deathAt === "number" ? player.deathAt : 0;
          if (now - deathAt < GameConfig.playerRespawnDelayMs) {
            this.ws.sendToPlayer(id, { type: "toast", text: "Respawn is not ready yet." });
            this.pushPlayerStateSync(id, player);
            return;
          }
          player.dead = false;
          player.deathAt = 0;
          const spawn = this.applySpawnToPlayer(player, player.sceneId, player.spawnKey);
          player.health = player.maxHealth ?? 100;
          player.stamina = player.maxStamina ?? 100;
          this.observerEngine.updatePosition(id, player.position);
          this.ws.sendToPlayer(id, {
            type: "scene_changed",
            sceneId: spawn.sceneId,
            spawnKey: spawn.spawnKey,
            spawnPosition: spawn.spawnPoint,
            reason: "respawn",
          });
          this.pushPlayerStateSync(id, player);
          return;
        }
        if (msg.type === "quest_sync") {
          this.pushPlayerStateSync(id, player);
          return;
        }
        return;
      }

      if (msg.type === "pickup_loot") {
        const lid = typeof msg.lootId === "string" ? msg.lootId.trim() : "";
        const loot = lid ? this.lootEntities.get(lid) : undefined;
        if (!loot) {
          this.pushPlayerStateSync(id, player);
          return;
        }
        const px = player.position.x;
        const py = player.position.y;
        const dx = loot.position.x - px;
        const dy = loot.position.y - py;
        if (dx * dx + dy * dy > GameConfig.interactDistance * GameConfig.interactDistance) {
          this.pushPlayerStateSync(id, player);
          return;
        }
        this.tryPickupLoot(id, player, { id: lid, loot });
        return;
      }

      if (msg.type === "chat" && this.worldState.mutedPlayers.includes(player.id)) {
        this.sendGMStatus(id, "error", "You are muted.");
        return;
      }

      if (await this.handleAdminGlbCommand(id, player, msg)) {
        return;
      }

      if (await this.handleGMCommand(id, player, msg)) {
        return;
      }

      if (msg.type === "input") {
        const keyRaw = typeof msg.input?.key === "string" ? msg.input.key.toLowerCase() : "";
        const evType = msg.input?.type;
        if (["w", "a", "s", "d"].includes(keyRaw)) {
          let set = this.playerKeysDown.get(player.id);
          if (!set) {
            set = new Set();
            this.playerKeysDown.set(player.id, set);
          }
          if (evType === "keydown") {
            set.add(keyRaw);
          } else if (evType === "keyup") {
            set.delete(keyRaw);
          }
        }
      }

      if (msg.type === "move_intent") {
        const dx = Math.max(-1, Math.min(1, Number(msg.dx ?? 0)));
        const dy = Math.max(-1, Math.min(1, Number(msg.dy ?? 0)));
        if (dx !== 0 || dy !== 0) {
          this.playerAnalogMove.set(player.id, { dx, dy });
        }
      }

      if (msg.type === "attack") {
        const nowAtk = Date.now();
        const lastAtk = this.lastPlayerAttackAt.get(player.id) ?? 0;
        if (nowAtk - lastAtk < GameConfig.playerAttackCooldownMs) {
          return;
        }
        this.lastPlayerAttackAt.set(player.id, nowAtk);

        this.ws.broadcast({ type: "entity_action", entityId: player.id, action: "attack" });
        const px = player.position.x;
        const py = player.position.y;
        const { damageBonus: weaponBonus, attackRange: weaponRange } = this.getEquippedWeaponStats(player);
        const maxD = weaponRange ?? GameConfig.attackDistance;
        let bestThreat: { npc: any; d2: number } | null = null;
        let bestDummy: { npc: any; d2: number } | null = null;
        for (const npc of this.npcSystem.getAllNPCs()) {
          if (!npcIsCombatTarget(npc)) continue;
          const dx = npc.position.x - px;
          const dy = npc.position.y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 > maxD * maxD) continue;
          if (npcIsCombatThreat(npc)) {
            if (!bestThreat || d2 < bestThreat.d2) bestThreat = { npc, d2 };
          } else if (npc.id === "npc_dummy" || npc.role === "Training") {
            if (!bestDummy || d2 < bestDummy.d2) bestDummy = { npc, d2 };
          }
        }
        const best = bestThreat ?? bestDummy;
        if (!best) {
          const hint =
            weaponRange && weaponRange > GameConfig.attackDistance
              ? `No target within ${Math.round(weaponRange)}m — try the training dummy or a hostile.`
              : "No target in range — move closer to an enemy or the training dummy.";
          this.ws.sendToPlayer(id, {
            type: "toast",
            text: hint,
          });
          this.pushPlayerStateSync(id, player);
          return;
        }
        const target = best.npc;
        const outcome = this.combatSystem.attackWithWeapon(player, target, weaponBonus);
        if (outcome.hit) {
          this.ws.broadcast({
            type: "entity_action",
            entityId: target.id,
            action: "hit",
            damage: outcome.damage,
          });
        }
        this.performNpcCounterAttack(target, player, id);
        if ((target.health ?? 0) <= 0) {
          this.skillSystem.addXP(player, "combat", 25);
          const combatRewards = this.questSystem.updateCombatQuests(player, target.id, target.id);
          for (const r of combatRewards) {
            this.ws.sendToPlayer(id, {
              type: "toast",
              text: `Quest completed: ${r.quest.title || r.quest.id}`,
            });
          }
          if (target.id === "npc_dummy" || target.role === "Training") {
            target.health = target.maxHealth ?? 100;
          } else {
            this.dropLootFromNpc(target);
            this.npcSystem.removeNPC(target.id);
            this.lastNpcCounterAttackAt.delete(target.id);
          }
        }
        this.pushPlayerStateSync(id, player);
      }

      if (msg.type === "quest_sync") {
        this.pushPlayerStateSync(id, player);
        return;
      }

      if (msg.type === "interact") {
        if (!player.flags) player.flags = {};
        const lootEntry = this.findNearestLoot(player);
        const npcNear = this.findNearestNpcForInteractWithDistance(player);
        const lootD2 = lootEntry?.d2 ?? Number.POSITIVE_INFINITY;
        const npcD2 = npcNear?.d2 ?? Number.POSITIVE_INFINITY;
        if (lootEntry && lootD2 <= npcD2 && this.tryPickupLoot(id, player, lootEntry)) {
          return;
        }
        const npc = npcNear?.npc ?? null;
        if (!npc) {
          this.ws.sendToPlayer(id, {
            type: "dialogue",
            source: "…",
            text: "There is no one in range to talk to. Move closer to an NPC and try again.",
            questId: null,
            choices: [],
            npcId: "",
            nodeId: "root",
          });
          return;
        }
        const defs = this.questSystem.getQuestDefinitions();
        const interaction = this.npcSystem.handleInteraction(npc.id, player, defs);
        if (!interaction) return;

        let text = interaction.text;
        const talkRewards = this.questSystem.checkTalkToQuests(player, npc.id);
        for (const r of talkRewards) {
          text += `\n\nQuest completed: ${r.quest.title || r.quest.id}`;
        }
        const collectRewards = this.questSystem.checkCollectTurnInQuests(player, npc.id);
        for (const r of collectRewards) {
          text += `\n\nQuest completed: ${r.quest.title || r.quest.id}`;
        }

        this.sendDialogueToPlayer(id, player.id, {
          source: interaction.source,
          text,
          questId: interaction.questId,
          choices: interaction.choices || [],
          npcId: interaction.npcId,
          nodeId: interaction.nodeId || "root",
        });
        this.pushPlayerStateSync(id, player);
      }

      if (msg.type === "dialogue_choice" || msg.type === "quest_accept") {
        const ctx = this.dialogueContext.get(player.id);
        if (!ctx || !ctx.npcId) {
          return;
        }
        const choiceId =
          msg.type === "quest_accept" ? "sys_quest_accept" : String(msg.choiceId || "");
        const nodeId = isNonEmptyString(msg.nodeId) ? msg.nodeId.trim() : ctx.nodeId;

        const choice = this.npcSystem.handleChoice(
          ctx.npcId,
          nodeId,
          choiceId,
          player,
          ctx.pendingQuestId
        );
        if (!choice) {
          return;
        }

        if (choice.startQuestId) {
          this.questSystem.startQuest(player, choice.startQuestId);
        }

        let text = choice.text;
        const talkRewards = this.questSystem.checkTalkToQuests(player, ctx.npcId);
        for (const r of talkRewards) {
          text += `\n\nQuest completed: ${r.quest.title || r.quest.id}`;
        }
        const collectRewards = this.questSystem.checkCollectTurnInQuests(player, ctx.npcId);
        for (const r of collectRewards) {
          text += `\n\nQuest completed: ${r.quest.title || r.quest.id}`;
        }

        const nextPending =
          choiceId === "sys_quest_accept" || choiceId === "sys_quest_decline"
            ? null
            : choice.questId;

        this.sendDialogueToPlayer(id, player.id, {
          source: choice.source,
          text,
          questId: nextPending,
          choices: choice.choices || [],
          npcId: choice.npcId,
          nodeId: choice.nodeId || "root",
        });
        this.pushPlayerStateSync(id, player);
      }
    };
  }

  async init() {
    const connected = await this.persistence.testConnection();
    if (connected) {
      console.log("✅ Firestore connection verified.");
    }
    const savedData = await this.persistence.load();
    for (const id in savedData) {
      this.playerSystem.setPlayer(id, savedData[id]);
    }
    this.loadRuntimeEventTemplates();
    this.loadSceneLayouts();
    this.loadSpawns();
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
      const cwd = process.cwd();
      const candidates = [
        path.resolve(cwd, "game-data/spawns/npc-spawns.json"),
        path.resolve(cwd, "../game-data/spawns/npc-spawns.json"),
      ];
      const spawnsPath = candidates.find((p) => fs.existsSync(p));
      if (!spawnsPath) {
        return;
      }
      const spawnData = JSON.parse(fs.readFileSync(spawnsPath, "utf-8"));
      spawnData.forEach((region: any) => {
        region.spawns.forEach((spawn: any) => {
          this.npcSystem.createNPC(spawn.npcId, "", spawn.x, spawn.y);
        });
      });
      console.log(`[NPC Spawns] Loaded from ${spawnsPath}`);
    } catch (e) {
      console.warn("[NPC Spawns] Failed to load npc-spawns.json", e);
    }
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

    const moveSpeed = GameConfig.playerSpeed;
    const step = (moveSpeed * GameConfig.tickRateMs) / 1000;

    for (const player of onlinePlayers) {
      const socketId = this.playerToSocket.get(player.id);
      if (!socketId) {
        continue;
      }

      if (player.dead) {
        continue;
      }

      let mx = 0;
      let my = 0;
      const analog = this.playerAnalogMove.get(player.id);
      if (analog && (analog.dx !== 0 || analog.dy !== 0)) {
        mx = analog.dx;
        my = analog.dy;
      } else {
        const keys = this.playerKeysDown.get(player.id);
        if (keys) {
          if (keys.has("a")) mx -= 1;
          if (keys.has("d")) mx += 1;
          if (keys.has("w")) my -= 1;
          if (keys.has("s")) my += 1;
        }
      }

      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        const nx = mx / len;
        const ny = my / len;
        player.position.x += nx * step;
        player.position.y += ny * step;
        this.observerEngine.updatePosition(socketId, player.position);
        this.processSceneTriggers(socketId, player);
      }
    }
    this.playerAnalogMove.clear();

    this.processHostileNpcAggroAndChase(onlinePlayers);

    this.npcSystem.tick(onlinePlayers, this.worldSystem.worldTime);
    this.worldSystem.tick();

    const lootNow = Date.now();
    for (const [lid, loot] of this.lootEntities) {
      if (typeof loot.despawnAt === "number" && lootNow > loot.despawnAt) {
        this.lootEntities.delete(lid);
      }
    }

    if (this.tickCount % 600 === 0) this.saveAll();

    const broadcastEveryTicks = Math.max(
      1,
      Math.round(GameConfig.stateBroadcastIntervalMs / GameConfig.tickRateMs)
    );
    if (this.tickCount % broadcastEveryTicks === 0) {
      this.broadcastState();
    }
  }

  broadcastState() {
    const tickCount = this.tickCount;
    const entities: any[] = [
      ...this.playerSystem.getAllPlayers().map(p => ({
        id: p.id,
        type: 'player',
        position: { x: p.position.x, y: 0, z: p.position.y }, // Mapping y to z for 3D
        rotation: { x: 0, y: 0, z: 0 },
        name: p.name,
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
        health: n.health,
        maxHealth: n.maxHealth,
        combatThreat: npcIsCombatThreat(n),
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
        lootKind: typeof l.goldAmount === "number" && l.goldAmount > 0 ? "gold" : "item",
        goldAmount: typeof l.goldAmount === "number" ? l.goldAmount : undefined,
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
