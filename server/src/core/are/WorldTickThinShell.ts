/**
 * WorldTickThinShell - Phase 10: Extremely Slim World Brain Scheduler
 *
 * WorldTick is the 10-Hz coordinator. TickSystems perform runtime logic.
 * WorldBrain runtime truth is wired through WorldBrainTickSystem ports.
 *
 * ARE Determinism:
 * - WorldStateProvider registry with strict validation
 * - No EMPTY_WORLD_STATE fallback - MISSING_RUNTIME_SOURCE if no providers
 * - Stable merge order by provider ID
 */

import { tickSystemRegistry } from "./TickSystemRegistry.js";
import { createDefaultTickContext, type TickSystemContext } from "./TickSystem.js";
import { SnapshotComposer } from "./SnapshotComposer.js";
import { LayerPersistenceQueue, layerPersistenceQueue } from "./LayerPersistenceQueue.js";
import { registerCoreTickSystems } from "./CoreTickSystemRegistration.js";
import { stableSort } from "./DeterministicEventFactory.js";
import {
  SnapshotComposerWorldBrainSink,
  WORLD_BRAIN_TICK_SYSTEM_NAME,
  registerWorldBrainTickSystem,
} from "./WorldBrainTickSystem.js";
import {
  LayerPersistenceWorldBrainReplaySink,
  RuntimeWorldBrainStatePort,
} from "./WorldBrainRuntimePort.js";

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
export interface TickContextWorldState {
  readonly npcs: readonly unknown[];
  readonly players: readonly unknown[];
  readonly loot: readonly unknown[];
  readonly warfronts: readonly unknown[];
  readonly economy: readonly unknown[];
  readonly factions: readonly unknown[];
  readonly quests: readonly unknown[];
  readonly worldEvents: readonly unknown[];
}

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

export interface ThinShellWorldState extends TickContextWorldState {}

export type ThinShellWorldStateProvider = () => WorldStateProviderSlice;

const EMPTY_WORLD_STATE: ThinShellWorldState = Object.freeze({
  npcs: Object.freeze([]),
  players: Object.freeze([]),
  loot: Object.freeze([]),
  warfronts: Object.freeze([]),
  economy: Object.freeze([]),
  factions: Object.freeze([]),
  quests: Object.freeze([]),
  worldEvents: Object.freeze([]),
});

function normalizeWorldState(value: WorldStateProviderSlice | null | undefined): ThinShellWorldState {
  if (!value) return EMPTY_WORLD_STATE;
  return {
    npcs: Array.isArray(value.npcs) ? value.npcs : EMPTY_WORLD_STATE.npcs,
    players: Array.isArray(value.players) ? value.players : EMPTY_WORLD_STATE.players,
    loot: Array.isArray(value.loot) ? value.loot : EMPTY_WORLD_STATE.loot,
    warfronts: Array.isArray(value.warfronts) ? value.warfronts : EMPTY_WORLD_STATE.warfronts,
    economy: Array.isArray(value.economy) ? value.economy : EMPTY_WORLD_STATE.economy,
    factions: Array.isArray(value.factions) ? value.factions : EMPTY_WORLD_STATE.factions,
    quests: Array.isArray(value.quests) ? value.quests : EMPTY_WORLD_STATE.quests,
    worldEvents: Array.isArray(value.worldEvents) ? value.worldEvents : EMPTY_WORLD_STATE.worldEvents,
  };
}

/**
 * Append items from source to target.
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

  private snapshotComposer: SnapshotComposer;
  private persistenceQueue: LayerPersistenceQueue;
  private worldBrainState: RuntimeWorldBrainStatePort;
  private isRunning = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** ARE-RUNTIME-TRUTH: Registry of world state providers - MUST have at least one */
  private worldStateProviders = new Map<string, WorldStateProvider>();

  constructor() {
    this.snapshotComposer = new SnapshotComposer();
    this.persistenceQueue = layerPersistenceQueue;
    this.worldBrainState = new RuntimeWorldBrainStatePort();

    registerCoreTickSystems();
    this.registerWorldBrainRuntimeSystem();
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
    this.finalizeWorldBrainSnapshot();
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
      const slice = normalizeWorldState(provider.getWorldState(context));

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
      warfronts: stableSort(merged.warfronts),
      economy: stableSort(merged.economy),
      factions: stableSort(merged.factions),
      quests: stableSort(merged.quests),
      worldEvents: stableSort(merged.worldEvents),
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

  registerChunk(chunkKey: string): void {
    this.worldBrainState.registerChunk(chunkKey as any);
  }

  unregisterChunk(chunkKey: string): void {
    this.worldBrainState.unregisterChunk(chunkKey as any);
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getWorldBrainSnapshot(): any {
    return this.worldBrainState.getSnapshot();
  }

  getPersistenceStats() {
    return this.persistenceQueue.getStats();
  }

  getSnapshotStats() {
    return {
      chunkCount: this.snapshotComposer.getChunkCount(),
    };
  }

  private registerWorldBrainRuntimeSystem(): void {
    if (tickSystemRegistry.has(WORLD_BRAIN_TICK_SYSTEM_NAME)) return;

    registerWorldBrainTickSystem({
      state: this.worldBrainState,
      snapshot: new SnapshotComposerWorldBrainSink(this.snapshotComposer),
      replay: new LayerPersistenceWorldBrainReplaySink(this.persistenceQueue),
    });
  }

  private finalizeWorldBrainSnapshot(): void {
    if (this.snapshotComposer.getChunkCount() > 0) {
      this.snapshotComposer.finalizeWorldSnapshot(this.tickCount as any);
    }
  }
}

export const worldTickThinShell = new WorldTickThinShell();

export function registerWorldTickThinShell(): WorldTickThinShell {
  return worldTickThinShell;
}
