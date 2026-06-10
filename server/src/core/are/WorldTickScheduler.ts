/**
 * WorldTickScheduler
 *
 * Thin shell scheduler for deterministic 10Hz ARE ticks.
 *
 * Important:
 * - No domain imports.
 * - No WorldBrain ownership.
 * - No DB or file I/O.
 * - No Date.now().
 * - No setInterval().
 * - No performance.now().
 *
 * Runtime adapters may call step() every 100ms.
 * The scheduler itself never derives simulation truth from wall-clock time.
 */

import {
  TickSystemPriority,
  type TickSystem,
  type TickSystemContext,
} from "./TickSystem.js";
import {
  TickSystemRegistry,
  tickSystemRegistry,
} from "./TickSystemRegistry.js";
import {
  createTickId,
  incrementTickId,
  type TickId,
} from "./types.js";

export const ARE_TICK_RATE_HZ = 10 as const;
export const ARE_TICK_INTERVAL_MS = 100 as const;

export const WORLD_TICK_SCHEDULER_ORDER = [
  "input",
  "spatial-interest",
  "resource-economy",
  "npc-memory-rumor",
  "world-brain",
  "snapshot-composer",
] as const;

export type WorldTickSchedulerSystemName =
  typeof WORLD_TICK_SCHEDULER_ORDER[number];

export interface WorldTickSchedulerOptions {
  readonly registry?: TickSystemRegistry;
  readonly initialTick?: TickId;
  readonly strictOrder?: boolean;
}

export interface WorldTickStepResult {
  readonly tick: TickId;
  readonly executedSystems: readonly string[];
}

export class WorldTickScheduler {
  private readonly registry: TickSystemRegistry;
  private readonly strictOrder: boolean;
  private tickId: TickId;
  private running = false;

  constructor(options: WorldTickSchedulerOptions = {}) {
    this.registry = options.registry ?? tickSystemRegistry;
    this.tickId = options.initialTick ?? createTickId(0);
    this.strictOrder = options.strictOrder ?? true;
  }

  start(): void {
    if (this.running) return;

    this.running = true;
    this.registry.notifyStart();
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.registry.notifyShutdown();
  }

  /**
   * Execute exactly one deterministic scheduler tick.
   *
   * The caller owns real-time pacing. This method only advances logical time.
   */
  step(): WorldTickStepResult {
    if (!this.running) {
      this.start();
    }

    this.tickId = incrementTickId(this.tickId);

    const context: TickSystemContext = Object.freeze({
      tickCount: this.tickId,
      isHighFrequencyTick: true,
    });

    const systems = this.getEnabledSystemsInDeterministicOrder();

    if (this.strictOrder) {
      assertRequiredSystemOrder(systems.map((system) => system.name));
    }

    const executedSystems: string[] = [];

    for (const system of systems) {
      system.tick(context);
      executedSystems.push(system.name);
    }

    return Object.freeze({
      tick: this.tickId,
      executedSystems: Object.freeze(executedSystems),
    });
  }

  /**
   * Deterministically execute N ticks without wall-clock scheduling.
   *
   * Useful for tests, replay and local reconstruction.
   */
  runTicks(count: number): readonly WorldTickStepResult[] {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`[WorldTickScheduler] Invalid tick count: ${count}`);
    }

    const results: WorldTickStepResult[] = [];

    for (let index = 0; index < count; index += 1) {
      results.push(this.step());
    }

    return Object.freeze(results);
  }

  getCurrentTick(): TickId {
    return this.tickId;
  }

  isRunning(): boolean {
    return this.running;
  }

  private getEnabledSystemsInDeterministicOrder(): readonly TickSystem[] {
    const systems = this.registry
      .getAll()
      .filter((system) => system.enabled)
      .sort(compareTickSystems);

    return Object.freeze(systems);
  }
}

export function createWorldTickScheduler(
  options: WorldTickSchedulerOptions = {},
): WorldTickScheduler {
  return new WorldTickScheduler(options);
}

function compareTickSystems(a: TickSystem, b: TickSystem): number {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  return a.name.localeCompare(b.name, "en");
}

function assertRequiredSystemOrder(systemNames: readonly string[]): void {
  let lastIndex = -1;

  for (const requiredName of WORLD_TICK_SCHEDULER_ORDER) {
    const index = systemNames.indexOf(requiredName);

    if (index === -1) {
      throw new Error(
        `[WorldTickScheduler] Missing required tick system: ${requiredName}`,
      );
    }

    if (index <= lastIndex) {
      throw new Error(
        `[WorldTickScheduler] Invalid tick system order. Required order: ${WORLD_TICK_SCHEDULER_ORDER.join(" -> ")}`,
      );
    }

    lastIndex = index;
  }

  assertWorldBrainBetweenGameplayAndSnapshot(systemNames);
}

function assertWorldBrainBetweenGameplayAndSnapshot(
  systemNames: readonly string[],
): void {
  const brainIndex = systemNames.indexOf("world-brain");
  const snapshotIndex = systemNames.indexOf("snapshot-composer");

  if (brainIndex === -1 || snapshotIndex === -1) {
    return;
  }

  if (brainIndex >= snapshotIndex) {
    throw new Error(
      "[WorldTickScheduler] world-brain must execute before snapshot-composer",
    );
  }
}

/**
 * Recommended priority assignment for the required scheduler order.
 *
 * Existing TickSystemPriority only defines broad buckets, so WorldBrain uses
 * priority 25 to sit between GAMEPLAY(20) and BROADCAST(30).
 */
export const WORLD_TICK_RECOMMENDED_PRIORITIES = Object.freeze({
  input: TickSystemPriority.INFRASTRUCTURE,
  spatialInterest: 10 as TickSystemPriority,
  resourceEconomy: TickSystemPriority.GAMEPLAY,
  npcMemoryRumor: 21 as TickSystemPriority,
  worldBrain: 25 as TickSystemPriority,
  snapshotComposer: TickSystemPriority.BROADCAST,
});