/**
 * RESOURCE NODE STORE
 *
 * Server-authoritative state for resource nodes.
 * Deterministic: No Math.random(), no Date.now() for gameplay state.
 * Respawn based on serverTick, not wall-clock time.
 *
 * Supports both static starter nodes and procedural chunk-generated nodes.
 */

import { STARTER_RESOURCE_NODES } from "./StarterResourceNodes.js";
import {
  generateChunkResourceNodes,
  getVisibleChunkCoords,
  isStarterChunk,
  getChunkBiome,
  CHUNK_RESOURCE_CONSTANTS,
  type ChunkBiomeId,
} from "./ChunkResourceGenerator.js";
import type {
  GatherResourceResult,
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

/**
 * Visible chunk tracking for procedural resource nodes.
 * Each entry is a Set of node IDs for that chunk.
 */
interface ChunkNodeRegistry {
  /** Chunks that have been registered as visible */
  registeredChunks: Map<string, Set<string>>;
  /** Player position used to determine visible chunks (kappa units) */
  lastPlayerPosition: { x: number; y: number } | null;
}

export class ResourceNodeStore {
  private readonly definitions = new Map<string, ResourceNodeDefinition>();
  private readonly runtime = new Map<string, ResourceNodeRuntimeState>();

  /** Registry for procedural chunk nodes */
  private readonly chunkRegistry: ChunkNodeRegistry = {
    registeredChunks: new Map(),
    lastPlayerPosition: null,
  };

  /** World seed for procedural generation */
  private readonly worldSeed: string;

  constructor(nodes: readonly ResourceNodeDefinition[] = STARTER_RESOURCE_NODES, worldSeed?: string) {
    this.worldSeed = worldSeed ?? CHUNK_RESOURCE_CONSTANTS.WORLD_SEED;

    // Initialize with starter nodes
    for (const node of nodes) {
      this.definitions.set(node.id, node);
      this.runtime.set(node.id, {
        nodeId: node.id,
        status: "available",
        depletedUntilTick: null,
        lastGatheredBy: null,
      });
    }
  }

  /**
   * Register visible chunks and their procedural resource nodes.
   * Call this when player position changes to register nearby chunks.
   *
   * @param playerPosition - Player position in kappa units { x, y }
   * @param worldSeed - Optional world seed override
   */
  registerVisibleChunks(playerPosition: { x: number; y: number }, worldSeed?: string): void {
    const seed = worldSeed ?? this.worldSeed;

    // Convert kappa position to tile coordinates
    // Kappa: 1 tile = 1000 kappa units
    const tileX = Math.floor(playerPosition.x / 1000);
    const tileZ = Math.floor(playerPosition.y / 1000);

    const visibleChunks = getVisibleChunkCoords(tileX, tileZ);

    for (const { chunkX, chunkZ } of visibleChunks) {
      const chunkKey = `${chunkX}:${chunkZ}`;

      // Skip if already registered
      if (this.chunkRegistry.registeredChunks.has(chunkKey)) {
        continue;
      }

      // Skip starter chunk - it uses STARTER_RESOURCE_NODES
      if (isStarterChunk(chunkX, chunkZ)) {
        // Mark as registered but don't add procedural nodes
        this.chunkRegistry.registeredChunks.set(chunkKey, new Set());
        continue;
      }

      // Generate procedural nodes for this chunk
      const biomeId = getChunkBiome(chunkX, chunkZ);
      const nodes = generateChunkResourceNodes({
        worldSeed: seed,
        chunkX,
        chunkZ,
        biomeId,
      });

      // Add nodes to definitions and runtime
      const nodeIds = new Set<string>();
      for (const node of nodes) {
        this.definitions.set(node.id, node);
        this.runtime.set(node.id, {
          nodeId: node.id,
          status: "available",
          depletedUntilTick: null,
          lastGatheredBy: null,
        });
        nodeIds.add(node.id);
      }

      this.chunkRegistry.registeredChunks.set(chunkKey, nodeIds);
    }

    this.chunkRegistry.lastPlayerPosition = playerPosition;
  }

  /**
   * Get all registered visible chunk coordinates.
   */
  getRegisteredChunks(): Array<{ chunkX: number; chunkZ: number }> {
    return Array.from(this.chunkRegistry.registeredChunks.keys()).map((key) => {
      const [cx, cz] = key.split(":").map(Number);
      return { chunkX: cx, chunkZ: cz };
    });
  }

  /**
   * Get the count of registered chunks.
   */
  getRegisteredChunkCount(): number {
    return this.chunkRegistry.registeredChunks.size;
  }

  /**
   * Get count of total registered node IDs (starter + procedural).
   */
  getTotalNodeCount(): number {
    return this.definitions.size;
  }

  /**
   * Clear all registered chunks and their procedural nodes.
   * Keeps starter nodes. Use for testing or world reset.
   */
  clearRegisteredChunks(): void {
    // Remove all non-starter nodes from definitions and runtime
    for (const [nodeId] of this.definitions) {
      if (!nodeId.startsWith("starter_")) {
        this.definitions.delete(nodeId);
        this.runtime.delete(nodeId);
      }
    }

    // Clear the registry
    this.chunkRegistry.registeredChunks.clear();
    this.chunkRegistry.lastPlayerPosition = null;
  }

  /**
   * List all resource node snapshots, sorted by ID for determinism.
   * Includes both starter nodes and registered procedural nodes.
   */
  listSnapshots(currentTick: number): ResourceNodeSnapshot[] {
    return [...this.definitions.values()]
      .map((definition) => this.getSnapshot(definition.id, currentTick))
      .filter((snapshot): snapshot is ResourceNodeSnapshot => Boolean(snapshot))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Get a single resource node snapshot by ID.
   */
  getSnapshot(nodeId: string, currentTick: number): ResourceNodeSnapshot | null {
    const definition = this.definitions.get(nodeId);
    const state = this.runtime.get(nodeId);

    if (!definition || !state) return null;

    const remainingTicks = Math.max(
      0,
      (state.depletedUntilTick ?? 0) - currentTick,
    );

    const status: ResourceNodeStatus = this.computeStatus(state, currentTick);

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

  /**
   * Attempt to gather from a resource node.
   * All checks are server-authoritative.
   */
  gather(input: GatherInput): GatherResourceResult {
    const { playerId, nodeId, playerPosition, currentTick, playerSkillLevel } = input;

    const definition = this.definitions.get(nodeId);
    if (!definition) {
      return { ok: false, playerId, nodeId, reason: "node_not_found" };
    }

    // Reject anonymous/invalid player IDs
    if (!playerId || playerId === "anonymous" || playerId === "unknown") {
      return { ok: false, playerId, nodeId, reason: "invalid_player" };
    }

    const state = this.runtime.get(nodeId);
    if (!state) {
      return { ok: false, playerId, nodeId, reason: "node_not_found" };
    }

    // Check if node is depleted
    if (this.computeStatus(state, currentTick) === "depleted") {
      const snapshot = this.getSnapshot(nodeId, currentTick);
      return { ok: false, playerId, nodeId, reason: "node_depleted", snapshot };
    }

    // Check distance (player must be within radius of node)
    const dist = Math.hypot(
      playerPosition.x - definition.position.x,
      playerPosition.y - definition.position.y,
    );

    if (dist > definition.radius) {
      const snapshot = this.getSnapshot(nodeId, currentTick);
      return { ok: false, playerId, nodeId, reason: "too_far", snapshot };
    }

    // Check skill level requirement
    if (playerSkillLevel < definition.requiredLevel) {
      const snapshot = this.getSnapshot(nodeId, currentTick);
      return { ok: false, playerId, nodeId, reason: "level_too_low", snapshot };
    }

    // All checks passed - mark node as depleted
    const depletedUntilTick = currentTick + definition.respawnTicks;
    this.runtime.set(nodeId, {
      nodeId,
      status: "depleted",
      depletedUntilTick,
      lastGatheredBy: playerId,
    });

    return {
      ok: true,
      playerId,
      nodeId,
      reason: "gathered",
      skillId: definition.skillId,
      xpReward: definition.xpReward,
      itemRewardId: definition.itemRewardId,
      itemRewardName: definition.itemRewardName,
      snapshot: this.getSnapshot(nodeId, currentTick),
    };
  }

  /**
   * Compute node status based on current tick and runtime state.
   */
  private computeStatus(state: ResourceNodeRuntimeState, currentTick: number): ResourceNodeStatus {
    if (state.depletedUntilTick !== null && state.depletedUntilTick > currentTick) {
      return "depleted";
    }
    return "available";
  }

  /**
   * Clear runtime state for testing only.
   */
  clearForTests(): void {
    this.runtime.clear();
    for (const node of this.definitions.values()) {
      this.runtime.set(node.id, {
        nodeId: node.id,
        status: "available",
        depletedUntilTick: null,
        lastGatheredBy: null,
      });
    }
  }
}

/**
 * Global singleton instance for production use.
 */
export const resourceNodeStore = new ResourceNodeStore();