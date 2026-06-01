import { PlaytesterConfig } from "../../config/PlaytesterConfig.js";
import { ItemRegistry } from "../inventory/ItemRegistry.js";
import { PlaytesterBrain } from "./PlaytesterBrain.js";
import { PlaytesterDebugLog } from "./PlaytesterDebugLog.js";
import { PlaytesterTelemetry } from "./PlaytesterTelemetry.js";
import type {
  PlaytesterAction,
  PlaytesterDebugLogEntry,
  PlaytesterMonitorChunk,
  PlaytesterMonitorEntity,
  PlaytesterMonitorRenderHints,
  PlaytesterMonitorUpdatePayload,
  PlaytesterStatus,
  Vec3,
} from "./playtesterTypes.js";

type PlaytesterDeps = {
  isSocketBound: (socketId: string) => boolean;
  bindSocketToPlayer: (socketId: string, playerId: string) => void;
  getOrCreatePlayer: (id: string, displayName: string) => any;
  ensurePlayerDefaults: (player: any) => void;
  applySpawnToPlayer: (player: any, sceneId?: string, spawnKey?: string) => { sceneId: string; spawnKey: string; spawnPoint: { x: number; y: number; z: number } };
  updateObserverPosition: (socketId: string, position: { x: number; y: number }) => void;
  processSceneTriggers: (socketId: string, player: any) => void;
  getChunkId: (x: number, y: number) => string;
  getAllNpcs: () => any[];
  getAllPlayers: () => any[];
  getLootEntities: () => Map<string, any>;
  getWorldObjects: () => any[];
  getQuestDefinitions: () => Map<string, any>;
  getQuestSyncForClient: (player: any) => any[];
  startQuest: (player: any, questId: string) => any | null;
  checkTalkToQuests: (player: any, npcId: string) => any[];
  checkCollectTurnInQuests: (player: any, npcId: string) => any[];
  updateCombatQuests: (player: any, npcId: string, npcInstanceId: string) => any[];
  sendToSyntheticSocket: (socketId: string, msg: Record<string, unknown>) => Promise<void>;
};

type InternalState = {
  tick: number;
  action: PlaytesterAction;
  lastAction: PlaytesterAction | null;
  goal: string;
  connected: boolean;
  stuckScore: number;
  lastPos: { x: number; y: number } | null;
};

type QuestNpcTarget = {
  questId: string | null;
  questStep: number | null;
  npcId: string;
  distance: number;
  score: number;
};

const MOVE_SPEED = 0.55;
const NPC_INTERACT_DISTANCE = 4.5;
const LOOT_INTERACT_DISTANCE = 4.5;
const ATTACK_DISTANCE = 8;
const NEARBY_SCAN_RADIUS = 28;
const CHUNK_SIZE = 64;

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}

function isEnemyNpc(npc: any): boolean {
  return npc?.faction === "Hostile" || npc?.role === "Enemy" || npc?.combatThreat === true;
}

function toChunkBounds(chunkX: number, chunkY: number) {
  const minX = chunkX * CHUNK_SIZE;
  const minY = chunkY * CHUNK_SIZE;
  return {
    minX,
    minY,
    maxX: minX + CHUNK_SIZE,
    maxY: minY + CHUNK_SIZE,
  };
}

export class AutonomousPlaytester {
  private readonly deps: PlaytesterDeps;
  private readonly brain = new PlaytesterBrain();
  private readonly telemetry = new PlaytesterTelemetry(PlaytesterConfig.maxEventsInMemory);
  private readonly debugLog = new PlaytesterDebugLog(
    PlaytesterConfig.debugLogPath,
    PlaytesterConfig.logEnabled,
  );
  private readonly state: InternalState = {
    tick: 0,
    action: "idle",
    lastAction: null,
    goal: "boot",
    connected: false,
    stuckScore: 0,
    lastPos: null,
  };

  constructor(deps: PlaytesterDeps) {
    this.deps = deps;
  }

  isEnabled(): boolean {
    return PlaytesterConfig.enabled;
  }

  getDebugLogPath(): string {
    return this.debugLog.getFilePath();
  }

  getStatus(): PlaytesterStatus {
    const player = this.getPlayer();
    const sceneId = typeof player?.sceneId === "string" ? player.sceneId : "didis_hub";
    const pos2 = this.getPosition2D(player);
    const pos3: Vec3 = { x: pos2.x, y: 0, z: pos2.y };
    const chunkId = this.deps.getChunkId(pos2.x, pos2.y);
    const activeQuest = this.getActiveQuest(player);
    const nearby = this.buildNearbySnapshot(player);
    return {
      id: PlaytesterConfig.id,
      displayName: PlaytesterConfig.displayName,
      socketId: PlaytesterConfig.syntheticSocketId,
      playerId: player?.id ?? null,
      tick: this.state.tick,
      connected: this.state.connected,
      action: this.state.action,
      lastAction: this.state.lastAction,
      goal: this.state.goal,
      sceneId,
      chunkId,
      position: pos3,
      activeQuestId: activeQuest?.id ?? null,
      activeQuestStep: activeQuest ? this.resolveQuestStep(activeQuest) : null,
      inventory: this.listInventoryIds(player),
      equipment: this.listEquipment(player),
      nearby,
      warnings: this.telemetry.getWarnings(),
      errors: this.telemetry.getErrors(),
      lastEvents: this.telemetry.getEvents(10),
    };
  }

  buildMonitorPayload(opts?: {
    performanceMode?: boolean;
    placeholderMode?: boolean;
    radiusChunks?: number;
  }): PlaytesterMonitorUpdatePayload {
    const status = this.getStatus();
    const perfMode = Boolean(opts?.performanceMode);
    const placeholderMode = Boolean(opts?.placeholderMode);
    const radiusChunks = Number.isFinite(Number(opts?.radiusChunks))
      ? Math.max(1, Math.floor(Number(opts?.radiusChunks)))
      : perfMode
        ? PlaytesterConfig.monitorPerformanceRadiusChunks
        : PlaytesterConfig.monitorDefaultRadiusChunks;
    const scene = this.buildMonitorScene(status, radiusChunks, placeholderMode);
    const cameraOffset: Vec3 = perfMode ? { x: 0, y: -14, z: 9 } : { x: 0, y: -18, z: 12 };
    const renderHints: PlaytesterMonitorRenderHints = {
      performanceMode: perfMode,
      placeholderMode,
      radiusChunks,
      shadowsEnabled: false,
      particlesEnabled: !perfMode,
    };
    return {
      type: "playtester_monitor_update",
      ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      tick: this.state.tick,
      playtester: status,
      camera: {
        mode: "third_person_follow",
        offset: cameraOffset,
        lookAt: status.position,
      },
      scene,
      overlay: {
        currentChunk: status.chunkId,
        action: status.action,
        goal: status.goal,
        questStep: status.activeQuestStep,
        nearbyInteractables: status.nearby.interactables,
        warnings: status.warnings,
        lastEvents: status.lastEvents,
      },
      renderHints,
    };
  }

  async tick(now: number): Promise<void> {
    if (!PlaytesterConfig.enabled) return;
    this.state.tick += 1;
    const player = this.ensureReadyPlayer();
    if (!player) {
      this.appendEvent("Playtester initialization failed", "error");
      return;
    }
    this.trackStuck(player);
    const nearby = this.buildNearbySnapshot(player);
    const activeQuest = this.getActiveQuest(player);
    const objectiveType = activeQuest ? this.resolveObjectiveType(activeQuest) : null;
    const decision = this.brain.decide({
      dead: Boolean(player.dead),
      questActive: Boolean(activeQuest),
      questObjectiveType: objectiveType,
      hasLootNearby: nearby.loot.length > 0,
      hasNpcNearby: nearby.npcs.length > 0,
      hasEnemyNearby: nearby.enemies.length > 0,
      hasInventoryWeapon: this.hasInventoryWeapon(player),
      hasWeaponEquipped: Boolean(player?.equipment?.weapon),
      stuckScore: this.state.stuckScore,
    });
    this.state.lastAction = this.state.action;
    this.state.action = decision.action;
    this.state.goal = decision.goal;
    await this.executeDecision(decision.action, now, player);
  }

  private getPlayer(): any | null {
    const p = this.deps.getOrCreatePlayer(PlaytesterConfig.id, PlaytesterConfig.displayName);
    return p ?? null;
  }

  private ensureReadyPlayer(): any | null {
    const player = this.getPlayer();
    if (!player) return null;
    this.deps.ensurePlayerDefaults(player);
    if (!this.deps.isSocketBound(PlaytesterConfig.syntheticSocketId)) {
      this.deps.bindSocketToPlayer(PlaytesterConfig.syntheticSocketId, player.id);
      player.isOffline = false;
      const spawn = this.deps.applySpawnToPlayer(player, player.sceneId ?? "didis_hub", player.spawnKey ?? "sp_player_default");
      this.deps.updateObserverPosition(PlaytesterConfig.syntheticSocketId, {
        x: Number(spawn.spawnPoint.x) || 0,
        y: Number(spawn.spawnPoint.z) || 0,
      });
      this.state.connected = true;
      this.appendEvent(`Spawned playtester at ${spawn.sceneId}:${spawn.spawnKey}`);
      this.writeLog("idle", "spawned", player, null, null, null);
    }
    return player;
  }

  private async executeDecision(action: PlaytesterAction, now: number, player: any): Promise<void> {
    try {
      if (action === "respawn") {
        await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, { type: "respawn" });
        this.appendEvent("Respawn requested");
        this.writeLog(action, "respawn_requested", player, null, null, null);
        return;
      }
      if (action === "recover_from_stuck") {
        const jitter = ((this.state.tick % 2) * 2 - 1) * 1.8;
        await this.moveByVector(player, jitter, 0.8);
        this.state.stuckScore = 0;
        this.appendEvent("Recovered from stuck by side-step", "warn");
        this.writeLog(action, "stuck_recovery", player, null, null, null, "stuck detected");
        return;
      }
      if (action === "pickup_loot") {
        const target = this.findNearestLoot(player);
        if (!target) {
          this.writeLog(action, "no_loot_found", player, null, null, null);
          return;
        }
        const distance = dist2d(this.getPosition2D(player), target.position);
        if (distance > LOOT_INTERACT_DISTANCE) {
          await this.moveTowards(player, target.position, Math.min(MOVE_SPEED, distance));
          this.writeLog(action, "moving_to_loot", player, null, null, target.id);
          return;
        }
        await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, {
          type: "pickup_loot",
          lootId: target.id,
        });
        this.appendEvent(`Picked up loot ${target.id}`);
        this.writeLog(action, "loot_pickup_attempted", player, null, null, target.id);
        return;
      }
      if (action === "equip_best_weapon") {
        const invWeaponId = this.pickBestInventoryWeaponId(player);
        if (!invWeaponId) {
          this.writeLog(action, "no_inventory_weapon", player, null, null, null);
          return;
        }
        await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, {
          type: "equip_item",
          itemId: invWeaponId,
        });
        this.appendEvent(`Equipped weapon ${invWeaponId}`);
        this.writeLog(action, "equip_weapon_attempted", player, null, null, invWeaponId);
        return;
      }
      if (action === "start_available_quest") {
        const started = this.tryStartAnyAvailableQuest(player);
        if (started) {
          this.appendEvent(`Quest started ${started}`);
          this.writeLog(action, "quest_started", player, started, null, null);
          return;
        }
        const npc = this.findNearestNpc(player, false);
        if (npc) {
          const d = dist2d(this.getPosition2D(player), this.getNpcPos(npc));
          if (d > NPC_INTERACT_DISTANCE) {
            await this.moveTowards(player, this.getNpcPos(npc), Math.min(MOVE_SPEED, d));
            this.writeLog(action, "moving_to_npc", player, null, null, npc.id);
            return;
          }
          await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, {
            type: "interact",
            npcId: npc.id,
          });
          this.appendEvent(`Interacted with NPC ${npc.id}`);
          this.writeLog(action, "npc_interaction_attempted", player, null, null, npc.id);
          return;
        }
      }
      if (action === "return_to_quest_target" || action === "interact_with_npc" || action === "progress_active_quest") {
        const questTarget = this.resolveQuestNpcTarget(player, {
          includeTalkTo: true,
          includeCollectTurnIn: true,
        });
        const npc = questTarget
          ? this.deps.getAllNpcs().find((n) => String(n?.id) === questTarget.npcId)
          : this.findNearestNpc(player, false);
        if (!npc) {
          await this.exploreStep(player);
          this.writeLog(
            action,
            "no_npc_found_exploring",
            player,
            questTarget?.questId ?? this.getActiveQuest(player)?.id ?? null,
            questTarget?.questStep ?? this.resolveActiveQuestStep(player),
            null
          );
          return;
        }
        const d = dist2d(this.getPosition2D(player), this.getNpcPos(npc));
        if (d > NPC_INTERACT_DISTANCE) {
          await this.moveTowards(player, this.getNpcPos(npc), Math.min(MOVE_SPEED, d));
          this.writeLog(
            action,
            "moving_to_npc",
            player,
            questTarget?.questId ?? this.getActiveQuest(player)?.id ?? null,
            questTarget?.questStep ?? this.resolveActiveQuestStep(player),
            npc.id
          );
          return;
        }
        await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, { type: "interact", npcId: npc.id });
        this.deps.checkTalkToQuests(player, npc.id);
        this.deps.checkCollectTurnInQuests(player, npc.id);
        this.appendEvent(`Quest interaction with ${npc.id}`);
        this.writeLog(
          action,
          "quest_npc_interaction",
          player,
          questTarget?.questId ?? this.getActiveQuest(player)?.id ?? null,
          questTarget?.questStep ?? this.resolveActiveQuestStep(player),
          npc.id
        );
        return;
      }
      if (action === "collect_required_item") {
        const turnInTarget = this.resolveQuestNpcTarget(player, {
          includeTalkTo: false,
          includeCollectTurnIn: true,
        });
        if (turnInTarget) {
          const turnInNpc = this.deps.getAllNpcs().find((n) => String(n?.id) === turnInTarget.npcId);
          if (turnInNpc) {
            const distanceToTurnIn = dist2d(this.getPosition2D(player), this.getNpcPos(turnInNpc));
            if (distanceToTurnIn > NPC_INTERACT_DISTANCE) {
              await this.moveTowards(player, this.getNpcPos(turnInNpc), Math.min(MOVE_SPEED, distanceToTurnIn));
              this.writeLog(
                action,
                "moving_to_collect_turnin_npc",
                player,
                turnInTarget.questId,
                turnInTarget.questStep,
                turnInNpc.id
              );
              return;
            }
            await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, { type: "interact", npcId: turnInNpc.id });
            this.deps.checkCollectTurnInQuests(player, turnInNpc.id);
            this.appendEvent(`Turned in collect quest at ${turnInNpc.id}`);
            this.writeLog(
              action,
              "collect_turnin_interaction",
              player,
              turnInTarget.questId,
              turnInTarget.questStep,
              turnInNpc.id
            );
            return;
          }
        }
        const loot = this.findNearestLoot(player);
        if (loot) {
          const d = dist2d(this.getPosition2D(player), loot.position);
          if (d > LOOT_INTERACT_DISTANCE) {
            await this.moveTowards(player, loot.position, Math.min(MOVE_SPEED, d));
            this.writeLog(action, "moving_to_collect_loot", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), loot.id);
            return;
          }
          await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, { type: "pickup_loot", lootId: loot.id });
          this.appendEvent(`Collected loot for quest (${loot.id})`);
          this.writeLog(action, "collect_loot_attempted", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), loot.id);
          return;
        }
        await this.exploreStep(player);
        this.writeLog(action, "collect_explore_fallback", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), null);
        return;
      }
      if (action === "attack_training_target") {
        const enemy = this.findNearestNpc(player, true);
        if (!enemy) {
          await this.exploreStep(player);
          this.writeLog(action, "no_enemy_found", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), null);
          return;
        }
        const pos = this.getNpcPos(enemy);
        const d = dist2d(this.getPosition2D(player), pos);
        if (d > ATTACK_DISTANCE) {
          await this.moveTowards(player, pos, Math.min(MOVE_SPEED, d));
          this.writeLog(action, "moving_to_enemy", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), enemy.id);
          return;
        }
        await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, {
          type: "set_target",
          npcId: enemy.id,
        });
        await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, { type: "attack" });
        this.deps.updateCombatQuests(player, String(enemy.id), String(enemy.id));
        this.appendEvent(`Attacked enemy ${enemy.id}`);
        this.writeLog(action, "attack_sent", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), enemy.id);
        return;
      }
      if (action === "explore_nearby_chunk" || action === "find_nearest_npc") {
        await this.exploreStep(player);
        this.writeLog(action, "explore_step", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), null);
        return;
      }
      if (action === "move_to_target") {
        await this.exploreStep(player);
        this.writeLog(action, "move_generic", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), null);
        return;
      }
      this.writeLog(action, "idle", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), null);
    } catch (error: any) {
      const message = String(error?.message || error || "unknown");
      this.appendEvent(`Action ${action} failed: ${message}`, "error");
      this.writeLog(action, "error", player, this.getActiveQuest(player)?.id ?? null, this.resolveActiveQuestStep(player), null, undefined, message);
    }
  }

  private async exploreStep(player: any): Promise<void> {
    const angle = (this.state.tick % 36) * (Math.PI / 18);
    const dx = Math.cos(angle) * MOVE_SPEED;
    const dy = Math.sin(angle) * MOVE_SPEED;
    await this.moveByVector(player, dx, dy);
  }

  private async moveByVector(player: any, dx: number, dy: number): Promise<void> {
    await this.deps.sendToSyntheticSocket(PlaytesterConfig.syntheticSocketId, {
      type: "move_intent",
      dx,
      dy,
    });
    const pos = this.getPosition2D(player);
    this.deps.updateObserverPosition(PlaytesterConfig.syntheticSocketId, pos);
    this.deps.processSceneTriggers(PlaytesterConfig.syntheticSocketId, player);
  }

  private async moveTowards(player: any, target: { x: number; y: number }, speed: number): Promise<void> {
    const pos = this.getPosition2D(player);
    const deltaX = target.x - pos.x;
    const deltaY = target.y - pos.y;
    const len = Math.hypot(deltaX, deltaY) || 1;
    const dx = (deltaX / len) * Math.min(speed, MOVE_SPEED);
    const dy = (deltaY / len) * Math.min(speed, MOVE_SPEED);
    await this.moveByVector(player, dx, dy);
  }

  private findNearestNpc(player: any, enemyOnly: boolean): any | null {
    const pos = this.getPosition2D(player);
    let best: any | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const npc of this.deps.getAllNpcs()) {
      if (!npc || !npc.position) continue;
      if (enemyOnly && !isEnemyNpc(npc)) continue;
      const d = dist2d(pos, this.getNpcPos(npc));
      if (d < bestDist && d <= NEARBY_SCAN_RADIUS * 1.8) {
        bestDist = d;
        best = npc;
      }
    }
    return best;
  }

  private findNearestLoot(player: any): { id: string; position: { x: number; y: number } } | null {
    const pos = this.getPosition2D(player);
    let best: { id: string; position: { x: number; y: number } } | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const [id, bag] of this.deps.getLootEntities()) {
      const lootPos = {
        x: Number(bag?.position?.x ?? bag?.x ?? 0),
        y: Number(bag?.position?.y ?? bag?.y ?? 0),
      };
      const d = dist2d(pos, lootPos);
      if (d < bestDist && d <= NEARBY_SCAN_RADIUS * 2) {
        best = { id, position: lootPos };
        bestDist = d;
      }
    }
    return best;
  }

  private getNpcPos(npc: any): { x: number; y: number } {
    return {
      x: Number(npc?.position?.x) || 0,
      y: Number(npc?.position?.y) || 0,
    };
  }

  private getPosition2D(player: any): { x: number; y: number } {
    return {
      x: Number(player?.position?.x) || 0,
      y: Number(player?.position?.y) || 0,
    };
  }

  private buildNearbySnapshot(player: any) {
    const pos = this.getPosition2D(player);
    const npcs: string[] = [];
    const enemies: string[] = [];
    for (const npc of this.deps.getAllNpcs()) {
      if (!npc?.id || !npc?.position) continue;
      const d = dist2d(pos, this.getNpcPos(npc));
      if (d > NEARBY_SCAN_RADIUS) continue;
      npcs.push(String(npc.id));
      if (isEnemyNpc(npc)) enemies.push(String(npc.id));
    }
    const loot: string[] = [];
    for (const [id, bag] of this.deps.getLootEntities()) {
      const lootPos = {
        x: Number(bag?.position?.x ?? bag?.x ?? 0),
        y: Number(bag?.position?.y ?? bag?.y ?? 0),
      };
      if (dist2d(pos, lootPos) <= NEARBY_SCAN_RADIUS) {
        loot.push(id);
      }
    }
    return {
      npcs: npcs.slice(0, 12),
      enemies: enemies.slice(0, 12),
      loot: loot.slice(0, 12),
      interactables: [...npcs.slice(0, 6), ...loot.slice(0, 6)],
    };
  }

  private listInventoryIds(player: any): string[] {
    if (!Array.isArray(player?.inventory)) return [];
    return player.inventory
      .filter((it: any) => typeof it?.id === "string")
      .slice(0, 24)
      .map((it: any) => String(it.id));
  }

  private listEquipment(player: any): Record<string, string | null> {
    const eq = player?.equipment ?? {};
    const value = (v: any) => (typeof v?.id === "string" ? v.id : null);
    return {
      weapon: value(eq.weapon),
      armor: value(eq.armor),
      offHand: value(eq.offHand),
    };
  }

  private getActiveQuest(player: any): any | null {
    if (!player) return null;
    return this.getOpenQuests(player)[0] ?? null;
  }

  private getOpenQuests(player: any): any[] {
    if (!player) return [];
    const fromPlayer = Array.isArray(player?.quests) ? player.quests : [];
    if (fromPlayer.length > 0) {
      return fromPlayer.filter((q: any) => q && q.completed !== true);
    }
    const quests = this.deps.getQuestSyncForClient(player);
    return quests.filter((q: any) => q && q.completed !== true);
  }

  private resolveObjectiveType(quest: any): string | null {
    const raw = quest?.objectiveType ?? quest?.objective;
    if (typeof raw !== "string" || raw.trim().length === 0) return null;
    return raw.trim();
  }

  private resolveQuestStep(quest: any): number {
    const progress = Number(quest?.progress);
    if (Number.isFinite(progress)) return Math.max(0, Math.floor(progress));
    return 0;
  }

  private resolveActiveQuestStep(player: any): number | null {
    const active = this.getActiveQuest(player);
    return active ? this.resolveQuestStep(active) : null;
  }

  private resolveQuestTargetNpcId(player: any): string | null {
    return this.resolveQuestNpcTarget(player, {
      includeTalkTo: true,
      includeCollectTurnIn: true,
    })?.npcId ?? null;
  }

  private resolveQuestNpcTarget(
    player: any,
    opts: { includeTalkTo: boolean; includeCollectTurnIn: boolean }
  ): QuestNpcTarget | null {
    const position = this.getPosition2D(player);
    const npcById = new Map<string, any>();
    for (const npc of this.deps.getAllNpcs()) {
      const id = String(npc?.id ?? "").trim();
      if (!id) continue;
      npcById.set(id, npc);
    }
    const candidates: QuestNpcTarget[] = [];
    for (const quest of this.getOpenQuests(player)) {
      const objectiveType = this.resolveObjectiveType(quest);
      const questId = typeof quest?.id === "string" ? quest.id : null;
      if (opts.includeTalkTo && objectiveType === "talk_to") {
        const npcId = this.resolveQuestNpcIdForObjective(quest, false);
        if (!npcId) continue;
        const npc = npcById.get(npcId);
        if (!npc) continue;
        const distance = dist2d(position, this.getNpcPos(npc));
        candidates.push({
          questId,
          questStep: this.resolveQuestStep(quest),
          npcId,
          distance,
          score: 120 - Math.min(220, distance * 2),
        });
      }
      if (opts.includeCollectTurnIn && objectiveType === "collect") {
        const requiredItemId = typeof quest?.requiredItemId === "string" ? quest.requiredItemId : null;
        const requiredCount = Math.max(1, Number(quest?.requiredCount ?? 1) || 1);
        if (!requiredItemId || this.countInventoryItem(player, requiredItemId) < requiredCount) {
          continue;
        }
        const npcId = this.resolveQuestNpcIdForObjective(quest, true);
        if (!npcId) continue;
        const npc = npcById.get(npcId);
        if (!npc) continue;
        const distance = dist2d(position, this.getNpcPos(npc));
        candidates.push({
          questId,
          questStep: this.resolveQuestStep(quest),
          npcId,
          distance,
          score: 150 - Math.min(220, distance * 2),
        });
      }
    }
    if (candidates.length === 0) {
      return null;
    }
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.questId ?? "").localeCompare(String(b.questId ?? ""));
    });
    return candidates[0] ?? null;
  }

  private resolveQuestNpcIdForObjective(quest: any, allowGiverFallback: boolean): string | null {
    const rawCandidates = [
      quest?.targetNpcId,
      quest?.targetId,
      allowGiverFallback ? quest?.giverNpcId : null,
    ];
    for (const raw of rawCandidates) {
      if (typeof raw !== "string") continue;
      const id = raw.trim();
      if (id.length > 0) return id;
    }
    return null;
  }

  private countInventoryItem(player: any, itemId: string): number {
    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];
    let total = 0;
    for (const entry of inventory) {
      if (entry?.id !== itemId) continue;
      total += Math.max(1, Number(entry?.quantity ?? 1) || 1);
    }
    return total;
  }

  private hasInventoryWeapon(player: any): boolean {
    if (!Array.isArray(player?.inventory)) return false;
    return player.inventory.some((it: any) => {
      if (typeof it?.id !== "string") return false;
      const def = ItemRegistry.getItem(it.id);
      if (!def) return false;
      const type = typeof (def as any).type === "string" ? (def as any).type : "";
      return type === "weapon";
    });
  }

  private pickBestInventoryWeaponId(player: any): string | null {
    if (!Array.isArray(player?.inventory)) return null;
    for (const it of player.inventory) {
      if (typeof it?.id !== "string") continue;
      const def = ItemRegistry.getItem(it.id);
      if (!def) continue;
      if ((def as any).type === "weapon") return it.id;
    }
    return null;
  }

  private tryStartAnyAvailableQuest(player: any): string | null {
    const existing = new Set((Array.isArray(player?.quests) ? player.quests : []).map((q: any) => q?.id));
    for (const [questId] of this.deps.getQuestDefinitions()) {
      if (existing.has(questId)) continue;
      const started = this.deps.startQuest(player, questId);
      if (started?.id) {
        return String(started.id);
      }
    }
    return null;
  }

  private trackStuck(player: any): void {
    const pos = this.getPosition2D(player);
    if (!this.state.lastPos) {
      this.state.lastPos = pos;
      return;
    }
    const moved = dist2d(this.state.lastPos, pos);
    if (moved <= 0.05) {
      this.state.stuckScore += 1;
      if (this.state.stuckScore === 5) {
        this.appendEvent("Potential stuck state detected", "warn");
      }
    } else {
      this.state.stuckScore = Math.max(0, this.state.stuckScore - 1);
      this.state.lastPos = pos;
    }
  }

  private appendEvent(text: string, level: "info" | "warn" | "error" = "info"): void {
    this.telemetry.push(this.state.tick, text, level);
  }

  private writeLog(
    action: PlaytesterAction,
    result: string,
    player: any,
    questId: string | null,
    step: number | null,
    targetId: string | null,
    warning?: string,
    error?: string,
  ): void {
    const pos2 = this.getPosition2D(player);
    const entry: PlaytesterDebugLogEntry = {
      ts: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      tick: this.state.tick,
      playtesterId: PlaytesterConfig.id,
      action,
      result,
      goal: this.state.goal,
      questId,
      step,
      position: { x: pos2.x, y: 0, z: pos2.y },
      targetId,
      ...(warning ? { warning } : {}),
      ...(error ? { error } : {}),
    };
    this.debugLog.write(entry);
  }

  private buildMonitorScene(
    status: PlaytesterStatus,
    radiusChunks: number,
    placeholderMode: boolean,
  ): { chunks: PlaytesterMonitorChunk[]; entities: PlaytesterMonitorEntity[] } {
    const [chunkX, chunkY] = String(status.chunkId).split(":").map((v) => Number(v) || 0);
    const chunkAllow = new Set<string>();
    const chunks: PlaytesterMonitorChunk[] = [];
    for (let dx = -radiusChunks; dx <= radiusChunks; dx += 1) {
      for (let dy = -radiusChunks; dy <= radiusChunks; dy += 1) {
        const cx = chunkX + dx;
        const cy = chunkY + dy;
        const id = `${cx}:${cy}`;
        chunkAllow.add(id);
        chunks.push({
          id,
          chunkX: cx,
          chunkY: cy,
          bounds: toChunkBounds(cx, cy),
        });
      }
    }
    const entities: PlaytesterMonitorEntity[] = [];
    const pushEntity = (entity: PlaytesterMonitorEntity) => {
      if (entities.length >= 400) return;
      const cid = this.deps.getChunkId(entity.position.x, entity.position.z);
      if (!chunkAllow.has(cid)) return;
      entities.push(entity);
    };

    for (const p of this.deps.getAllPlayers()) {
      if (!p?.id || p?.isOffline) continue;
      const pos = this.getPosition2D(p);
      pushEntity({
        id: String(p.id),
        type: "player",
        name: String(p.name || p.id),
        position: { x: pos.x, y: 0, z: pos.y },
        health: Number(p.health) || 0,
        maxHealth: Number(p.maxHealth) || 0,
        assetId: placeholderMode ? "placeholder://player" : `player:${p.id}`,
        assetType: "player",
        glbPath: placeholderMode ? null : null,
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    for (const npc of this.deps.getAllNpcs()) {
      if (!npc?.id || !npc?.position) continue;
      const pos = this.getNpcPos(npc);
      pushEntity({
        id: String(npc.id),
        type: "npc",
        name: String(npc.name || npc.id),
        position: { x: pos.x, y: 0, z: pos.y },
        health: Number(npc.health) || 0,
        maxHealth: Number(npc.maxHealth) || 0,
        combatThreat: isEnemyNpc(npc),
        assetId: placeholderMode ? `placeholder://npc/${npc.role || "default"}` : null,
        assetType: "npc",
        glbPath: placeholderMode ? null : (typeof npc.glbPath === "string" ? npc.glbPath : null),
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    for (const [lootId, loot] of this.deps.getLootEntities()) {
      const pos = {
        x: Number(loot?.position?.x ?? loot?.x ?? 0),
        y: Number(loot?.position?.y ?? loot?.y ?? 0),
      };
      pushEntity({
        id: lootId,
        type: "loot",
        name: String(loot?.item?.id || lootId),
        position: { x: pos.x, y: 0, z: pos.y },
        assetId: placeholderMode ? "placeholder://loot/bag" : String(loot?.item?.id || lootId),
        assetType: "loot",
        glbPath: placeholderMode ? null : null,
        scale: { x: 0.8, y: 0.8, z: 0.8 },
      });
    }

    for (const obj of this.deps.getWorldObjects()) {
      if (!obj?.id || !obj?.position) continue;
      const pos = {
        x: Number(obj.position.x) || 0,
        y: Number(obj.position.y) || 0,
      };
      pushEntity({
        id: String(obj.id),
        type: String(obj.type || "world_object"),
        name: String(obj.name || obj.id),
        position: { x: pos.x, y: 0, z: pos.y },
        rotation: { x: 0, y: Number(obj.rotation) || 0, z: 0 },
        assetId: placeholderMode ? `placeholder://world/${obj.type || "object"}` : String(obj.type || obj.id),
        assetType: "world_object",
        glbPath: placeholderMode ? null : (typeof obj.glbPath === "string" ? obj.glbPath : null),
        scale: {
          x: Number(obj?.scale?.x) || 1,
          y: Number(obj?.scale?.y) || 1,
          z: Number(obj?.scale?.z) || 1,
        },
      });
    }

    return { chunks, entities };
  }
}
