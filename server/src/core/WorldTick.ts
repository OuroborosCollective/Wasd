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
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  private assetPoolResolver: AssetPoolResolver;
  private areStateCompiler: AREStateCompiler;
  private lootEntities: Map<string, any> = new Map();

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
  private areMode: AREMode = "shader";
  private eventTemplates: GMTemplateDefinition[] = Object.values(GM_EVENT_TEMPLATES);
  private pendingTemplateSteps: ScheduledGMTemplateStep[] = [];

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
              quests: player.quests,
              inventory: player.inventory,
              equipment: player.equipment
            }
          });
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

      if (msg.type === "attack") {
        // PlayCanvas attack animation trigger
        this.ws.broadcast({ type: 'entity_action', entityId: player.id, action: 'attack' });
        // Combat logic here...
      }

      if (msg.type === "interact") {
        // Interaction logic...
        this.ws.sendToPlayer(id, { type: 'dialogue', text: "Hello traveler!" });
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
    const entities = [
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
