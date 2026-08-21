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

import { tickSystemRegistry, type TickSystemRegistry } from "./TickSystemRegistry.js";
import { createDefaultTickContext, type TickSystemContext } from "./TickSystem.js";
import { SnapshotComposer } from "./SnapshotComposer.js";
import { LayerPersistenceQueue, layerPersistenceQueue } from "./LayerPersistenceQueue.js";
import { registerCoreTickSystems } from "./CoreTickSystemRegistration.js";
import { stableSort } from "./DeterministicEventFactory.js";
import { coerceChunkKey } from "./types.js";
import type { CanonicalLayerSeedResult } from "./CanonicalLayerSeed.js";
import {
  SnapshotComposerWorldBrainSink,
  registerWorldBrainTickSystem,
} from "./WorldBrainTickSystem.js";
import {
  LayerPersistenceWorldBrainReplaySink,
  RuntimeWorldBrainStatePort,
} from "./WorldBrainRuntimePort.js";
import {
  registerTickFailureFamilyProbeSystem,
  type FailureFamilyProbeRunStatus,
  type TickFailureFamilyProbeSystem,
} from "./TickFailureFamilyProbeSystem.js";
import type { TickFailureFamilySnapshot } from "./TickFailureFamilyRuntime.js";

/**
 * World state slice provided by a single provider.
 *
 * Every field is optional because a provider is allowed to expose only the
 * runtime source it owns. Missing fields are normalized to empty readonly arrays
 * after provider registration has already proved at least one real source exists.
 */
export interface WorldStateProviderSlice {
  readonly npcs?: readonly unknown[];
  readonly players?: readonly unknown[];
  readonly loot?: readonly unknown[];
  readonly inventory?: readonly unknown[];
  readonly equipment?: readonly unknown[];
  readonly resources?: readonly unknown[];
  readonly warfronts?: readonly unknown[];
  readonly economy?: readonly unknown[];
  readonly factions?: readonly unknown[];
  readonly quests?: readonly unknown[];
  readonly housing?: readonly unknown[];
  readonly kingdoms?: readonly unknown[];
  readonly population?: readonly unknown[];
  readonly help?: readonly unknown[];
  readonly worldEvents?: readonly unknown[];
}

/**
 * Full world state merged from all providers.
 */
export interface TickContextWorldState {
  readonly npcs: readonly unknown[];
  readonly players: readonly unknown[];
  readonly loot: readonly unknown[];
  readonly inventory: readonly unknown[];
  readonly equipment: readonly unknown[];
  readonly resources: readonly unknown[];
  readonly warfronts: readonly unknown[];
  readonly economy: readonly unknown[];
  readonly factions: readonly unknown[];
  readonly quests: readonly unknown[];
  readonly housing: readonly unknown[];
  readonly kingdoms: readonly unknown[];
  readonly population: readonly unknown[];
  readonly help: readonly unknown[];
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

export interface WorldTickThinShellOptions {
  readonly worldSeed?: string | number | null;
  readonly registry?: TickSystemRegistry;
}

class WorldStateProviderFailure extends Error {
  readonly code = 'WORLD_STATE_PROVIDER_FAILURE';
  readonly providerId: string;

  constructor(providerId: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause ?? 'unknown provider failure');
    super(`WorldStateProvider "${providerId}" failed: ${message}`, { cause });
    this.name = 'WorldStateProviderFailure';
    this.providerId = providerId;
  }
}

const EMPTY_WORLD_STATE: ThinShellWorldState = Object.freeze({
  npcs: Object.freeze([]),
  players: Object.freeze([]),
  loot: Object.freeze([]),
  inventory: Object.freeze([]),
  equipment: Object.freeze([]),
  resources: Object.freeze([]),
  warfronts: Object.freeze([]),
  economy: Object.freeze([]),
  factions: Object.freeze([]),
  quests: Object.freeze([]),
  housing: Object.freeze([]),
  kingdoms: Object.freeze([]),
  population: Object.freeze([]),
  help: Object.freeze([]),
  worldEvents: Object.freeze([]),
});

function normalizeWorldState(value: WorldStateProviderSlice | null | undefined): ThinShellWorldState {
  if (!value) return EMPTY_WORLD_STATE;
  return {
    npcs: Array.isArray(value.npcs) ? value.npcs : EMPTY_WORLD_STATE.npcs,
    players: Array.isArray(value.players) ? value.players : EMPTY_WORLD_STATE.players,
    loot: Array.isArray(value.loot) ? value.loot : EMPTY_WORLD_STATE.loot,
    inventory: Array.isArray(value.inventory) ? value.inventory : EMPTY_WORLD_STATE.inventory,
    equipment: Array.isArray(value.equipment) ? value.equipment : EMPTY_WORLD_STATE.equipment,
    resources: Array.isArray(value.resources) ? value.resources : EMPTY_WORLD_STATE.resources,
    warfronts: Array.isArray(value.warfronts) ? value.warfronts : EMPTY_WORLD_STATE.warfronts,
    economy: Array.isArray(value.economy) ? value.economy : EMPTY_WORLD_STATE.economy,
    factions: Array.isArray(value.factions) ? value.factions : EMPTY_WORLD_STATE.factions,
    quests: Array.isArray(value.quests) ? value.quests : EMPTY_WORLD_STATE.quests,
    housing: Array.isArray(value.housing) ? value.housing : EMPTY_WORLD_STATE.housing,
    kingdoms: Array.isArray(value.kingdoms) ? value.kingdoms : EMPTY_WORLD_STATE.kingdoms,
    population: Array.isArray(value.population) ? value.population : EMPTY_WORLD_STATE.population,
    help: Array.isArray(value.help) ? value.help : EMPTY_WORLD_STATE.help,
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

function missingRuntimeSourceError(): Error & { code: string } {
  const error = new Error(
    "MISSING_RUNTIME_SOURCE: no WorldStateProvider registered for ARE truth path. " +
    "Register at least one WorldStateProvider before ticking."
  ) as Error & { code: string };
  error.code = 'MISSING_RUNTIME_SOURCE';
  return error;
}

export class WorldTickThinShell {
  private tickCount = 0;
  static readonly TICK_INTERVAL_MS = 100;

  private snapshotComposer: SnapshotComposer;
  private persistenceQueue: LayerPersistenceQueue;
  private worldBrainState: RuntimeWorldBrainStatePort;
  private readonly registry: TickSystemRegistry;
  private readonly failureProbe: TickFailureFamilyProbeSystem;
  private isRunning = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** ARE-RUNTIME-TRUTH: Registry of world state providers - MUST have at least one */
  private worldStateProviders = new Map<string, WorldStateProvider>();

  constructor(options: WorldTickThinShellOptions = {}) {
    this.registry = options.registry ?? tickSystemRegistry;
    this.snapshotComposer = new SnapshotComposer();
    this.persistenceQueue = layerPersistenceQueue;
    this.worldBrainState = new RuntimeWorldBrainStatePort({ worldSeed: options.worldSeed });

    // Wire readback/rehydrate into the runtime world brain state (issue #2457):
    // the persistence queue's real adapter is the readback source. This only
    // takes effect once an adapter is set (via setAdapter / ensureAdapter),
    // so rehydrate stays fail-closed until a real backend is wired.
    this.worldBrainState.setReadbackProvider((chunkKey) => this.persistenceQueue.loadChunkState(chunkKey));

    registerCoreTickSystems({}, this.registry);
    this.failureProbe = registerTickFailureFamilyProbeSystem(this.registry);
    this.registerWorldBrainRuntimeSystem();
  }

  start(): void {
    if (this.isRunning) return;

    console.log("[WorldTickThinShell] Starting - 10-Hz brain tick");
    this.isRunning = true;
    this.registry.notifyStart();
    // Runtime scheduling catches boundary failures so one broken provider cannot
    // turn a structured 10Hz failure into an unhandled process exception. The
    // direct tick() API still throws and remains fail-hard for tests/operators.
    this.timer = setInterval(() => this.runScheduledTick(), WorldTickThinShell.TICK_INTERVAL_MS);
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
    this.registry.notifyShutdown();
  }

  tick(): void {
    this.tickCount++;
    const tick = this.tickCount;
    const context: TickSystemContext = createDefaultTickContext(tick);
    let worldState: ThinShellWorldState;

    try {
      worldState = this.getWorldStateForTick(context);
    } catch (error) {
      this.registry.getFailureRuntime().recordFailure({
        tick,
        stage: 'world_state',
        provider: (error as any)?.providerId ?? null,
        error,
      });
      throw error;
    }

    Object.defineProperty(context, "world", {
      value: worldState,
      writable: false,
      enumerable: true,
    });

    const execution = this.registry.executeAll(context);

    try {
      this.finalizeWorldBrainSnapshot();
    } catch (error) {
      this.registry.getFailureRuntime().recordFailure({
        tick,
        stage: 'snapshot_finalize',
        error,
      });
      throw error;
    }

    try {
      this.persistenceQueue.tick(tick as any);
    } catch (error) {
      this.registry.getFailureRuntime().recordFailure({
        tick,
        stage: 'persistence_tick',
        error,
      });
      throw error;
    }

    if (execution.failures.length === 0) {
      this.registry.getFailureRuntime().recordHealthyTick(tick);
    }
  }

  /**
   * Get merged world state from all registered providers.
   * Throws MISSING_RUNTIME_SOURCE if no providers are registered.
   */
  private getWorldStateForTick(context: TickSystemContext): ThinShellWorldState {
    // ARE-RUNTIME-TRUTH: Fail hard if no providers - no silent EMPTY_WORLD_STATE
    if (this.worldStateProviders.size === 0) {
      throw missingRuntimeSourceError();
    }

    // Stable sort providers by ID for deterministic merge order
    const providers = [...this.worldStateProviders.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    const merged: Record<keyof TickContextWorldState, unknown[]> = {
      npcs: [],
      players: [],
      loot: [],
      inventory: [],
      equipment: [],
      resources: [],
      warfronts: [],
      economy: [],
      factions: [],
      quests: [],
      housing: [],
      kingdoms: [],
      population: [],
      help: [],
      worldEvents: [],
    };

    for (const provider of providers) {
      let slice: ThinShellWorldState;
      try {
        slice = normalizeWorldState(provider.getWorldState(context));
      } catch (error) {
        throw new WorldStateProviderFailure(provider.id, error);
      }

      appendStable(merged.npcs, slice.npcs);
      appendStable(merged.players, slice.players);
      appendStable(merged.loot, slice.loot);
      appendStable(merged.inventory, slice.inventory);
      appendStable(merged.equipment, slice.equipment);
      appendStable(merged.resources, slice.resources);
      appendStable(merged.warfronts, slice.warfronts);
      appendStable(merged.economy, slice.economy);
      appendStable(merged.factions, slice.factions);
      appendStable(merged.quests, slice.quests);
      appendStable(merged.housing, slice.housing);
      appendStable(merged.kingdoms, slice.kingdoms);
      appendStable(merged.population, slice.population);
      appendStable(merged.help, slice.help);
      appendStable(merged.worldEvents, slice.worldEvents);
    }

    return Object.freeze({
      npcs: stableSort(merged.npcs),
      players: stableSort(merged.players),
      loot: stableSort(merged.loot),
      inventory: stableSort(merged.inventory),
      equipment: stableSort(merged.equipment),
      resources: stableSort(merged.resources),
      warfronts: stableSort(merged.warfronts),
      economy: stableSort(merged.economy),
      factions: stableSort(merged.factions),
      quests: stableSort(merged.quests),
      housing: stableSort(merged.housing),
      kingdoms: stableSort(merged.kingdoms),
      population: stableSort(merged.population),
      help: stableSort(merged.help),
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

  getFailureFamilyStatus(): TickFailureFamilySnapshot {
    return this.registry.getFailureRuntime().getSnapshot();
  }

  armFailureFamilyRun(requestedRunId?: string | null): FailureFamilyProbeRunStatus {
    return this.failureProbe.armFullRun({ requestedRunId, currentTick: this.tickCount });
  }

  getFailureFamilyProbeStatus(): FailureFamilyProbeRunStatus {
    return this.failureProbe.getStatus();
  }

  registerChunk(chunkKey: string): void {
    this.worldBrainState.registerChunk(coerceChunkKey(chunkKey));
  }

  unregisterChunk(chunkKey: string): void {
    this.worldBrainState.unregisterChunk(coerceChunkKey(chunkKey));
  }

  /**
   * Wire the authoritative actor (player) state into the canonical world hash
   * (AIM-104). The provider must return the live, tick-mutated players.
   */
  setActorStateProvider(provider: (() => readonly import('./WorldBrainRuntimePort.js').ActorHashEntry[]) | null): void {
    this.worldBrainState.setActorStateProvider(provider);
  }

  getWorldBrainSeedRecord(chunkKey: string): CanonicalLayerSeedResult | null {
    return this.worldBrainState.getCanonicalSeedRecord(coerceChunkKey(chunkKey));
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

  /**
   * Wire a real persistence adapter into the queue (issue #2457). Required for
   * the queue to count as non-degraded and for rehydrate to work.
   */
  setPersistenceAdapter(adapter: import('./LayerPersistencePort.js').LayerPersistenceAdapter): void {
    this.persistenceQueue.setAdapter(adapter);
  }

  /**
   * Lazily build the production persistence adapter via the async factory and
   * wire it into the queue. Safe to await during bootstrap.
   */
  async ensurePersistenceAdapter(
    factory: () => Promise<import('./LayerPersistencePort.js').LayerPersistenceAdapter>,
  ): Promise<void> {
    await this.persistenceQueue.ensureAdapter(factory);
  }

  /**
   * Rehydrate all chunk layer states from real persisted data (issue #2457).
   * Returns the number of chunks restored. No-op (0) when no adapter is wired.
   */
  async rehydrateAllChunkStates(): Promise<number> {
    const adapter = this.persistenceQueue.getAdapter();
    if (!adapter || !adapter.loadAllChunkStates) return 0;
    return this.worldBrainState.rehydrateAll(() => adapter.loadAllChunkStates!());
  }

  getSnapshotStats() {
    return {
      chunkCount: this.snapshotComposer.getChunkCount(),
    };
  }

  private runScheduledTick(): void {
    try {
      this.tick();
    } catch (error) {
      const snapshot = this.registry.getFailureRuntime().getSnapshot();
      if (snapshot.lastFailureTick !== this.tickCount) {
        this.registry.getFailureRuntime().recordFailure({
          tick: this.tickCount,
          stage: 'scheduled_tick',
          error,
        });
      }
      // No fake state and no retry of the full authoritative tick. A failed tick
      // remains failed/consumed; the scheduler proceeds to the next 100ms slot.
    }
  }

  private registerWorldBrainRuntimeSystem(): void {
    // Registry replacement is intentional here: each ThinShell owns its runtime
    // WorldBrain ports. Replacement keeps tests and isolated runtimes honest
    // without ever registering duplicate systems under the same name.
    registerWorldBrainTickSystem({
      state: this.worldBrainState,
      snapshot: new SnapshotComposerWorldBrainSink(this.snapshotComposer),
      replay: new LayerPersistenceWorldBrainReplaySink(this.persistenceQueue),
    }, this.registry);
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
