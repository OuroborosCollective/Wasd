/**
 * WorldTickThinShell - Phase 10: Extremely Slim World Brain Scheduler
 *
 * WorldTick wird zum extrem schlanken World Brain Scheduler.
 * TickSystems führen Fachlogik aus; der ThinShell koordiniert nur.
 */

import { tickSystemRegistry } from "./TickSystemRegistry.js";
import { createDefaultTickContext, type TickSystemContext } from "./TickSystem.js";
import { WorldBrainScheduler } from "./WorldBrainScheduler.js";
import { SnapshotComposer } from "./SnapshotComposer.js";
import { LayerPersistenceQueue, layerPersistenceQueue } from "./LayerPersistenceQueue.js";
import { registerOuroborosTickSystem } from "./OuroborosTickSystem.js";
import { registerOracleTickSystem } from "./OracleTickSystem.js";
import { sharedWorldEventBus } from "../../modules/ouroboros/sharedWorldEventBus.js";

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

export class WorldTickThinShell {
  private tickCount = 0;
  static readonly TICK_INTERVAL_MS = 100;

  private worldBrain: WorldBrainScheduler;
  private snapshotComposer: SnapshotComposer;
  private persistenceQueue: LayerPersistenceQueue;
  private isRunning = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private worldStateProvider: ThinShellWorldStateProvider | null = null;

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
    const worldState = this.getWorldStateForTick();

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

  private getWorldStateForTick(): ThinShellWorldState {
    if (!this.worldStateProvider) return EMPTY_WORLD_STATE;

    try {
      return normalizeWorldState(this.worldStateProvider());
    } catch (error) {
      console.warn("[WorldTickThinShell] World state provider failed", error);
      return EMPTY_WORLD_STATE;
    }
  }

  registerWorldStateProvider(provider: ThinShellWorldStateProvider): () => void {
    this.worldStateProvider = provider;
    console.log("[WorldTickThinShell] World state provider registered");

    return () => {
      if (this.worldStateProvider === provider) {
        this.worldStateProvider = null;
        console.log("[WorldTickThinShell] World state provider unregistered");
      }
    };
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
