/**
 * WorldTickThinShell - Phase 10: Extremely Slim World Brain Scheduler
 *
 * WorldTick wird zum extrem schlanken World Brain Scheduler.
 * TickSystems führen Fachlogik aus; der ThinShell koordiniert nur.
 *
 * ARE Determinism:
 * - WorldStateProvider registry with strict validation
 * - No EMPTY_WORLD_STATE fallback - MISSING_RUNTIME_SOURCE if no providers
 * - Stable merge order by provider ID
 */

import { tickSystemRegistry } from "./TickSystemRegistry.js";
import { createDefaultTickContext, type TickSystemContext } from "./TickSystem.js";
import { WorldBrainScheduler } from "./WorldBrainScheduler.js";
import { SnapshotComposer } from "./SnapshotComposer.js";
import { LayerPersistenceQueue, layerPersistenceQueue } from "./LayerPersistenceQueue.js";
import { registerOuroborosTickSystem } from "./OuroborosTickSystem.js";
import { registerOracleTickSystem } from "./OracleTickSystem.js";
import { sharedWorldEventBus } from "../../modules/ouroboros/sharedWorldEventBus.js";

/**
 * World state slice provided by a single provider.
 * All fields are optional to allow partial providers.
 */
export interface WorldStateProviderSlice {
  readonly npcs?: readonly unknown[];
  readonly players?: readonly unknown[];
  readonly loot?: readonly unknown[];
  readonly warfronts?: readonly unknown[];
  readonly economy?: readonly unknown[];
  readonly factions?: readonly unknown[];
  readonly quests?: readonly unknown[];
  readonly worldEvents?: readonly unknown[];
}

/**
 * Full world state merged from all providers.
 */
export interface TickContextWorldState extends WorldStateProviderSlice {}

/**
 * World state provider interface.
 * Each provider contributes a slice of world state.
 */
export interface WorldStateProvider {
  /** Stable, non-empty provider ID for deterministic ordering */
  readonly id: string;
  /** Get this provider's slice of world state for the given tick context */
  getWorldState(context: TickSystemContext): WorldStateProviderSlice;
}

export interface ThinShellWorldState {
  readonly npcs: readonly unknown[];
  readonly players: readonly unknown[];
  readonly loot: readonly unknown[];
}

export type ThinShellWorldStateProvider = () => ThinShellWorldState;

const EMPTY_WORLD_STATE: ThinShellWorldState = Object.freeze({
  npcs: Object.freeze([]),
  players: Object.freeze([]),
  loot: Object.freeze([]),
});

function normalizeWorldState(value: ThinShellWorldState | null | undefined): ThinShellWorldState {
  if (!value) return EMPTY_WORLD_STATE;
  return {
    npcs: Array.isArray(value.npcs) ? value.npcs : EMPTY_WORLD_STATE.npcs,
    players: Array.isArray(value.players) ? value.players : EMPTY_WORLD_STATE.players,
    loot: Array.isArray(value.loot) ? value.loot : EMPTY_WORLD_STATE.loot,
  };
}

/**
 * Stable entity key for deterministic sorting.
 */
function stableEntityKey(value: unknown): string {
  if (typeof value === "object" && value !== null && value !== undefined) {
    const record = value as Record<string, unknown>;
    if (typeof record.id === "string" && record.id.length > 0) {
      return record.id;
    }
  }
  // Fallback to string representation
  return String(value);
}

/**
 * Stable sort by entity key for deterministic ordering.
 */
function stableSort<T>(items: readonly T[]): readonly T[] {
  return [...items].sort((a, b) =>
    stableEntityKey(a).localeCompare(stableEntityKey(b)),
  );
}

/**
 * Append items from source to target, then stable-sort.
 */
function appendStable(target: unknown[], source: readonly unknown[] | undefined): void {
  if (!source || source.length === 0) return;
  for (const item of source) {
    target.push(item);
  }
}

export class WorldTickThinShell {
  private tickCount = 0;
  static readonly TICK_INTERVAL_MS = 100;

  private worldBrain: WorldBrainScheduler;
  private snapshotComposer: SnapshotComposer;
  private persistenceQueue: LayerPersistenceQueue;
  private isRunning = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** ARE-RUNTIME-TRUTH: Registry of world state providers - MUST have at least one */
  private worldStateProviders = new Map<string, WorldStateProvider>();

  constructor() {
    this.worldBrain = new WorldBrainScheduler();
    this.snapshotComposer = new SnapshotComposer();
    this.persistenceQueue = layerPersistenceQueue;

    registerOuroborosTickSystem({
      engineConfig: {
        tickInterval: 10,
        conflictCheckInterval: 100,
        enableNPCBrain: true,
        npcBrainInterval: 10,
      },
    });

    registerOracleTickSystem({
      tickInterval: 10,
      minRecordsForAnalysis: 6,
      maxStoredRecords: 240,
      eventBus: sharedWorldEventBus,
    });
  }

  start(): void {
    if (this.isRunning) return;

    console.log("[WorldTickThinShell] Starting - 10-Hz brain tick");
    this.isRunning = true;
    tickSystemRegistry.notifyStart();
    this.timer = setInterval(() => this.tick(), WorldTickThinShell.TICK_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log("[WorldTickThinShell] Stopping");
    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.worldBrain.onShutdown();
    await this.persistenceQueue.shutdown();
    tickSystemRegistry.notifyShutdown();
  }

  tick(): void {
    this.tickCount++;

    const context: TickSystemContext = createDefaultTickContext(this.tickCount);
    const worldState = this.getWorldStateForTick(context);

    Object.defineProperty(context, "world", {
      value: worldState,
      writable: false,
      enumerable: true,
    });

    tickSystemRegistry.executeAll(context);
    this.worldBrain.tick(context);
    this.composeWorldSnapshot();
    this.queuePersistenceEvents();
    this.persistenceQueue.tick(this.tickCount as any);
  }

  /**
   * Get merged world state from all registered providers.
   * Throws MISSING_RUNTIME_SOURCE if no providers are registered.
   */
  private getWorldStateForTick(context: TickSystemContext): ThinShellWorldState {
    // ARE-RUNTIME-TRUTH: Fail hard if no providers - no silent EMPTY_WORLD_STATE
    if (this.worldStateProviders.size === 0) {
      throw new Error(
        "MISSING_RUNTIME_SOURCE: no WorldStateProvider registered for ARE truth path. " +
        "Register at least one WorldStateProvider before ticking."
      );
    }

    // Stable sort providers by ID for deterministic merge order
    const providers = [...this.worldStateProviders.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    const merged: {
      npcs: unknown[];
      players: unknown[];
      loot: unknown[];
      warfronts: unknown[];
      economy: unknown[];
      factions: unknown[];
      quests: unknown[];
      worldEvents: unknown[];
    } = {
      npcs: [],
      players: [],
      loot: [],
      warfronts: [],
      economy: [],
      factions: [],
      quests: [],
      worldEvents: [],
    };

    for (const provider of providers) {
      const slice = provider.getWorldState(context);

      appendStable(merged.npcs, slice.npcs);
      appendStable(merged.players, slice.players);
      appendStable(merged.loot, slice.loot);
      appendStable(merged.warfronts, slice.warfronts);
      appendStable(merged.economy, slice.economy);
      appendStable(merged.factions, slice.factions);
      appendStable(merged.quests, slice.quests);
      appendStable(merged.worldEvents, slice.worldEvents);
    }

    return Object.freeze({
      npcs: stableSort(merged.npcs),
      players: stableSort(merged.players),
      loot: stableSort(merged.loot),
    });
  }

  /**
   * Register a WorldStateProvider for ARE truth path.
   * Validates provider ID uniqueness and non-empty ID.
   *
   * @throws Error if provider ID is empty or duplicate
   */
  registerWorldStateProvider(provider: WorldStateProvider): () => void {
    if (!provider.id || provider.id.trim().length === 0) {
      throw new Error("WorldStateProvider requires a stable non-empty id");
    }

    if (this.worldStateProviders.has(provider.id)) {
      throw new Error(`Duplicate WorldStateProvider id: ${provider.id}`);
    }

    this.worldStateProviders.set(provider.id, provider);
    console.log(`[WorldTickThinShell] WorldStateProvider registered: ${provider.id}`);

    return () => {
      if (this.worldStateProviders.has(provider.id)) {
        this.worldStateProviders.delete(provider.id);
        console.log(`[WorldTickThinShell] WorldStateProvider unregistered: ${provider.id}`);
      }
    };
  }

  /**
   * Get count of registered providers (for testing/debugging)
   */
  getProviderCount(): number {
    return this.worldStateProviders.size;
  }

  /**
   * Check if any providers are registered
   */
  hasProviders(): boolean {
    return this.worldStateProviders.size > 0;
  }

  private composeWorldSnapshot(): void {
    const snapshot = this.worldBrain.getSnapshot();

    for (const chunkKey of snapshot.active_chunks) {
      const layerState = this.worldBrain.getChunkLayerState(chunkKey);
      if (layerState) {
        const iareLayers = this.convertToIARELayers(layerState);
        this.snapshotComposer.addChunk(
          chunkKey,
          this.tickCount as any,
          [],
          iareLayers,
        );
      }
    }

    if (this.snapshotComposer.getChunkCount() > 0) {
      this.snapshotComposer.finalizeWorldSnapshot(this.tickCount as any);
    }
  }

  private convertToIARELayers(chunkLayerState: any): any {
    return {
      ecology: chunkLayerState.ecology,
      market: chunkLayerState.economy,
      physiology: chunkLayerState.npc_vitality,
      trade: chunkLayerState.trade,
      memory: chunkLayerState.social_memory,
      politics: chunkLayerState.politics,
      conflict: chunkLayerState.aggression,
      economy: chunkLayerState.conjuncture,
      kingdoms: chunkLayerState.kingdom,
      faith: chunkLayerState.faith,
      dungeon: chunkLayerState.dungeon,
      fear: chunkLayerState.fear,
      cycles: chunkLayerState.resurrection,
    };
  }

  private queuePersistenceEvents(): void {
    const snapshot = this.worldBrain.getSnapshot();

    for (const chunkKey of snapshot.active_chunks) {
      const layerState = this.worldBrain.getChunkLayerState(chunkKey);
      if (layerState) {
        const iareLayers = this.convertToIARELayers(layerState);
        const event = {
          chunkKey,
          tick: this.tickCount as any,
          layerSnapshot: iareLayers,
          deltaHash: snapshot.world_hash,
          timestamp: this.tickCount,
        };

        this.persistenceQueue.enqueue(event);
      }
    }
  }

  registerChunk(chunkKey: string): void {
    this.worldBrain.registerChunk(chunkKey as any);
  }

  unregisterChunk(chunkKey: string): void {
    this.worldBrain.unregisterChunk(chunkKey as any);
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getWorldBrainSnapshot(): any {
    return this.worldBrain.getSnapshot();
  }

  getPersistenceStats() {
    return this.persistenceQueue.getStats();
  }

  getSnapshotStats() {
    return {
      chunkCount: this.snapshotComposer.getChunkCount(),
    };
  }
}

export const worldTickThinShell = new WorldTickThinShell();

export function registerWorldTickThinShell(): WorldTickThinShell {
  return worldTickThinShell;
}
