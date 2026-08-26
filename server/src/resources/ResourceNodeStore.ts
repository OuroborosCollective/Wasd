/**
 * RESOURCE NODE STORE
 *
 * Server-authoritative state for resource nodes.
 * Deterministic: No unseeded randomness or wall-clock gameplay state.
 * Respawn based on serverTick.
 *
 * Supports both static starter nodes loaded from game-data and procedural chunk-generated nodes.
 */

import {
  generateChunkResourceNodes,
  getVisibleChunkCoords,
  isStarterChunk,
  getChunkBiome,
  resolveChunkWorldSeed,
} from "./ChunkResourceGenerator.js";
import {
  loadGatheringMomentumRuleFromGameData,
  loadResourceNodeDefinitionsFromGameData,
} from "./ResourceGameData.js";
import type {
  GatherResourceResult,
  GatheringMomentumResult,
  GatheringMomentumRule,
  GatheringMomentumState,
  ResourceNodeDefinition,
  ResourceNodeRuntimeState,
  ResourceNodeSnapshot,
  ResourceNodeStatus,
} from "./ResourceTypes.js";

export interface GatherInput {
  playerId: string;
  nodeId: string;
  playerPosition: { x: number; y: number };
  currentTick: number;
  playerSkillLevel: number;
}

export interface ResourceGatherMutationSnapshot {
  readonly playerId: string;
  readonly nodeId: string;
  readonly nodeState: ResourceNodeRuntimeState | null;
  readonly momentumState: GatheringMomentumState | null;
}

interface ChunkNodeRegistry {
  registeredChunks: Map<string, Set<string>>;
  lastPlayerPosition: { x: number; y: number } | null;
}

function defaultRuntimeState(nodeId: string): ResourceNodeRuntimeState {
  return {
    nodeId,
    status: "available",
    depletedUntilTick: null,
    lastGatheredBy: null,
  };
}

export class ResourceNodeStore {
  private readonly definitions = new Map<string, ResourceNodeDefinition>();
  private readonly runtime = new Map<string, ResourceNodeRuntimeState>();
  private readonly gatheringMomentumByPlayer = new Map<string, GatheringMomentumState>();
  private readonly chunkRegistry: ChunkNodeRegistry = {
    registeredChunks: new Map(),
    lastPlayerPosition: null,
  };
  private readonly worldSeed: string;

  constructor(
    nodes: readonly ResourceNodeDefinition[] = loadResourceNodeDefinitionsFromGameData(),
    worldSeed?: string,
    private readonly gatheringMomentumRule: GatheringMomentumRule = loadGatheringMomentumRuleFromGameData(),
  ) {
    this.worldSeed = resolveChunkWorldSeed(worldSeed);
    for (const node of nodes) {
      this.definitions.set(node.id, node);
      this.runtime.set(node.id, defaultRuntimeState(node.id));
    }
  }

  registerVisibleChunks(playerPosition: { x: number; y: number }, worldSeed?: string): void {
    const seed = resolveChunkWorldSeed(worldSeed ?? this.worldSeed);
    const tileX = Math.floor(playerPosition.x / 1000);
    const tileZ = Math.floor(playerPosition.y / 1000);
    const visibleChunks = getVisibleChunkCoords(tileX, tileZ);

    for (const { chunkX, chunkZ } of visibleChunks) {
      const chunkKey = `${chunkX}:${chunkZ}`;
      if (this.chunkRegistry.registeredChunks.has(chunkKey)) continue;
      if (isStarterChunk(chunkX, chunkZ)) {
        this.chunkRegistry.registeredChunks.set(chunkKey, new Set());
        continue;
      }
      const biomeId = getChunkBiome(chunkX, chunkZ, seed);
      const nodes = generateChunkResourceNodes({ worldSeed: seed, chunkX, chunkZ, biomeId });
      const nodeIds = new Set<string>();
      for (const node of nodes) {
        this.definitions.set(node.id, node);
        this.runtime.set(node.id, defaultRuntimeState(node.id));
        nodeIds.add(node.id);
      }
      this.chunkRegistry.registeredChunks.set(chunkKey, nodeIds);
    }
    this.chunkRegistry.lastPlayerPosition = playerPosition;
  }

  getRegisteredChunks(): Array<{ chunkX: number; chunkZ: number }> {
    return Array.from(this.chunkRegistry.registeredChunks.keys()).map((key) => {
      const [cx, cz] = key.split(":").map(Number);
      return { chunkX: cx, chunkZ: cz };
    });
  }

  getRegisteredChunkCount(): number {
    return this.chunkRegistry.registeredChunks.size;
  }

  getTotalNodeCount(): number {
    return this.definitions.size;
  }

  captureGatherMutationState(playerId: string, nodeId: string): ResourceGatherMutationSnapshot {
    const nodeState = this.runtime.get(nodeId);
    const momentumState = this.gatheringMomentumByPlayer.get(playerId);
    return Object.freeze({
      playerId,
      nodeId,
      nodeState: nodeState ? Object.freeze({ ...nodeState }) : null,
      momentumState: momentumState ? Object.freeze({ ...momentumState }) : null,
    });
  }

  restoreGatherMutationState(snapshot: ResourceGatherMutationSnapshot): void {
    if (snapshot.nodeState) this.runtime.set(snapshot.nodeId, { ...snapshot.nodeState });
    else this.runtime.delete(snapshot.nodeId);
    if (snapshot.momentumState) this.gatheringMomentumByPlayer.set(snapshot.playerId, { ...snapshot.momentumState });
    else this.gatheringMomentumByPlayer.delete(snapshot.playerId);
  }

  clearRegisteredChunks(): void {
    for (const [nodeId] of this.definitions) {
      if (!nodeId.startsWith("starter_")) {
        this.definitions.delete(nodeId);
        this.runtime.delete(nodeId);
      }
    }
    this.chunkRegistry.registeredChunks.clear();
    this.chunkRegistry.lastPlayerPosition = null;
  }

  listSnapshots(currentTick: number): ResourceNodeSnapshot[] {
    return [...this.definitions.values()]
      .map((definition) => this.getSnapshot(definition.id, currentTick))
      .filter((snapshot): snapshot is ResourceNodeSnapshot => Boolean(snapshot))
      // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  previewVisibleSnapshots(
    currentTick: number,
    playerPosition?: { x: number; y: number },
  ): ResourceNodeSnapshot[] {
    const projectedDefinitions = new Map(this.definitions);
    if (playerPosition) {
      const tileX = Math.floor(playerPosition.x / 1000);
      const tileZ = Math.floor(playerPosition.y / 1000);
      for (const { chunkX, chunkZ } of getVisibleChunkCoords(tileX, tileZ)) {
        if (isStarterChunk(chunkX, chunkZ)) continue;
        const biomeId = getChunkBiome(chunkX, chunkZ, this.worldSeed);
        for (const node of generateChunkResourceNodes({
          worldSeed: this.worldSeed,
          chunkX,
          chunkZ,
          biomeId,
        })) {
          if (!projectedDefinitions.has(node.id)) projectedDefinitions.set(node.id, node);
        }
      }
    }
    return [...projectedDefinitions.values()]
      .map((definition) => this.createSnapshot(
        definition,
        this.runtime.get(definition.id) ?? defaultRuntimeState(definition.id),
        currentTick,
      ))
      // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  getSnapshot(nodeId: string, currentTick: number): ResourceNodeSnapshot | null {
    const definition = this.definitions.get(nodeId);
    const state = this.runtime.get(nodeId);
    if (!definition || !state) return null;
    const status = this.computeStatus(state, currentTick);
    return this.createSnapshot(definition, this.runtime.get(nodeId) ?? state, currentTick, status);
  }

  gather(input: GatherInput): GatherResourceResult {
    const { playerId, nodeId, playerPosition, currentTick, playerSkillLevel } = input;
    const definition = this.definitions.get(nodeId);
    if (!definition) return { ok: false, playerId, nodeId, reason: "node_not_found" };
    if (!playerId || playerId === "anonymous" || playerId === "unknown") {
      return { ok: false, playerId, nodeId, reason: "invalid_player" };
    }
    const state = this.runtime.get(nodeId);
    if (!state) return { ok: false, playerId, nodeId, reason: "node_not_found" };
    if (this.computeStatus(state, currentTick) === "depleted") {
      return { ok: false, playerId, nodeId, reason: "node_depleted", snapshot: this.getSnapshot(nodeId, currentTick) };
    }
    const dist = Math.hypot(
      playerPosition.x - definition.position.x,
      playerPosition.y - definition.position.y,
    );
    if (dist > definition.radius) {
      return { ok: false, playerId, nodeId, reason: "too_far", snapshot: this.getSnapshot(nodeId, currentTick) };
    }
    if (playerSkillLevel < definition.requiredLevel) {
      return { ok: false, playerId, nodeId, reason: "level_too_low", snapshot: this.getSnapshot(nodeId, currentTick) };
    }

    const depletedUntilTick = currentTick + definition.respawnTicks;
    this.runtime.set(nodeId, {
      nodeId,
      status: "depleted",
      depletedUntilTick,
      lastGatheredBy: playerId,
    });
    const momentum = this.applyGatheringMomentum({
      playerId,
      skillId: definition.skillId,
      currentTick,
      xpBeforeMomentum: definition.xpReward,
    });
    return {
      ok: true,
      playerId,
      nodeId,
      reason: "gathered",
      skillId: definition.skillId,
      xpReward: momentum.xpReward,
      itemRewardId: definition.itemRewardId,
      itemRewardName: definition.itemRewardName,
      momentum: momentum.result,
      snapshot: this.getSnapshot(nodeId, currentTick),
    };
  }

  /** Reset mutable node and player momentum state for isolated deterministic tests. */
  clearForTests(): void {
    for (const nodeId of this.definitions.keys()) {
      this.runtime.set(nodeId, defaultRuntimeState(nodeId));
    }
    this.gatheringMomentumByPlayer.clear();
  }

  private createSnapshot(
    definition: ResourceNodeDefinition,
    state: ResourceNodeRuntimeState,
    currentTick: number,
    forcedStatus?: ResourceNodeStatus,
  ): ResourceNodeSnapshot {
    const status = forcedStatus ?? this.projectStatus(state, currentTick);
    const remainingTicks = status === "depleted"
      ? Math.max(0, (state.depletedUntilTick ?? 0) - currentTick)
      : 0;
    return {
      id: definition.id,
      kind: definition.kind,
      title: definition.title,
      skillId: definition.skillId,
      requiredLevel: definition.requiredLevel,
      xpReward: definition.xpReward,
      itemRewardId: definition.itemRewardId,
      itemRewardName: definition.itemRewardName,
      position: definition.position,
      radius: definition.radius,
      status,
      depletedUntilTick: status === "depleted" ? state.depletedUntilTick : null,
      remainingTicks,
      requiredTool: definition.requiredTool,
    };
  }

  private applyGatheringMomentum(input: {
    playerId: string;
    skillId: ResourceNodeDefinition["skillId"];
    currentTick: number;
    xpBeforeMomentum: number;
  }): { xpReward: number; result?: GatheringMomentumResult } {
    const { playerId, skillId, currentTick, xpBeforeMomentum } = input;
    const rule = this.gatheringMomentumRule;
    if (!rule.enabled || !rule.appliesToSkillIds.includes(skillId)) return { xpReward: xpBeforeMomentum };
    const previous = this.gatheringMomentumByPlayer.get(playerId);
    const sameSkillWithinWindow = Boolean(
      previous &&
      previous.lastSkillId === skillId &&
      currentTick >= previous.lastGatherTick &&
      currentTick - previous.lastGatherTick <= rule.windowTicks,
    );
    const streak = sameSkillWithinWindow ? Math.min((previous?.streak ?? 1) + 1, rule.maxStreak) : 1;
    const bonusPermille = Math.max(0, (streak - 1) * rule.streakBonusPermille);
    const xpReward = Math.floor((xpBeforeMomentum * (1000 + bonusPermille)) / 1000);
    this.gatheringMomentumByPlayer.set(playerId, {
      playerId,
      lastSkillId: skillId,
      lastGatherTick: currentTick,
      streak,
    });
    return {
      xpReward,
      result: {
        ruleId: rule.id,
        truthStatus: rule.truthStatus,
        skillId,
        streak,
        bonusPermille,
        maxBonusPermille: Math.max(0, (rule.maxStreak - 1) * rule.streakBonusPermille),
        windowTicks: rule.windowTicks,
        xpBeforeMomentum,
        xpReward,
        expiresAtTick: currentTick + rule.windowTicks,
      },
    };
  }

  private projectStatus(state: ResourceNodeRuntimeState, currentTick: number): ResourceNodeStatus {
    if (state.status === "depleted" && state.depletedUntilTick !== null && currentTick >= state.depletedUntilTick) {
      return "available";
    }
    return state.status;
  }

  private computeStatus(state: ResourceNodeRuntimeState, currentTick: number): ResourceNodeStatus {
    const status = this.projectStatus(state, currentTick);
    if (status === "available" && state.status === "depleted") {
      this.runtime.set(state.nodeId, {
        nodeId: state.nodeId,
        status: "available",
        depletedUntilTick: null,
        lastGatheredBy: state.lastGatheredBy,
      });
    }
    return status;
  }
}

export const resourceNodeStore = new ResourceNodeStore();
