/**
 * LiveHeal v2 - Strategy Registry
 *
 * Manages ordered healing strategies with metadata.
 * Provides selection based on error signature, learning scores, and policy.
 */

import { deterministicNow } from "../determinism/AREDeterminism.js";
import type {
  HealingStrategy,
  HealingResult,
  HealthSnapshot,
  ErrorSignature,
  SubSystemAdapter,
  SubSystemRecord,
} from "./LiveHealTypes.js";

interface StrategyEntry {
  strategy: HealingStrategy;
  /** Current attempt counts per subsystem (keyed by subsystem id) */
  attemptCounts: Map<string, number>;
  /** Last run timestamps per subsystem */
  lastRunAt: Map<string, number>;
}

export class LiveHealStrategyRegistry {
  private readonly strategies = new Map<string, StrategyEntry>();
  private logicalClock = deterministicNow("liveheal-strategy-registry:init");

  private now(seed: string): number {
    this.logicalClock += 1;
    return deterministicNow(`${seed}:${this.logicalClock}`);
  }

  register(strategy: HealingStrategy): void {
    if (this.strategies.has(strategy.name)) {
      throw new Error(`Strategy "${strategy.name}" is already registered.`);
    }
    this.strategies.set(strategy.name, {
      strategy,
      attemptCounts: new Map(),
      lastRunAt: new Map(),
    });
  }

  /**
   * Get all strategies that can handle the given subsystem,
   * ordered by risk level (lowest first).
   */
  getCandidates(subsystemId: string): HealingStrategy[] {
    const results: HealingStrategy[] = [];
    for (const entry of this.strategies.values()) {
      if (entry.strategy.subsystems.includes("*") || entry.strategy.subsystems.includes(subsystemId)) {
        results.push(entry.strategy);
      }
    }
    // Sort: low risk first, then by name for stability
    const riskOrder = { low: 0, medium: 1, high: 2 };
    results.sort((a, b) => {
      const rd = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      return rd !== 0 ? rd : (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
    return results;
  }

  /**
   * Check if a strategy can be run for a subsystem right now
   * (respects per-subsystem cooldown and max attempts).
   */
  canRun(strategy: HealingStrategy, subsystemId: string): { ok: boolean; reason: string } {
    const entry = this.strategies.get(strategy.name);
    if (!entry) {
      return { ok: false, reason: `Strategy "${strategy.name}" not registered.` };
    }

    const attempts = entry.attemptCounts.get(subsystemId) ?? 0;
    if (attempts >= strategy.maxAttempts) {
      return { ok: false, reason: `Max attempts (${strategy.maxAttempts}) reached for ${subsystemId}.` };
    }

    const lastRun = entry.lastRunAt.get(subsystemId) ?? 0;
    const elapsed = this.now(`${strategy.name}:${subsystemId}:can-run`) - lastRun;
    if (elapsed < strategy.cooldownMs) {
      return {
        ok: false,
        reason: `Cooldown active (${strategy.cooldownMs - elapsed}ms remaining).`,
      };
    }

    return { ok: true, reason: "" };
  }

  /**
   * Execute a strategy and track its attempt count.
   */
  async execute(
    strategy: HealingStrategy,
    subsystemId: string,
    snapshot: HealthSnapshot,
    signature: ErrorSignature
  ): Promise<HealingResult> {
    const entry = this.strategies.get(strategy.name);
    if (!entry) {
      return {
        success: false,
        strategyName: strategy.name,
        message: "Strategy not registered.",
        durationMs: 0,
        sideEffects: [],
        serviceable: false,
      };
    }

    const attempts = entry.attemptCounts.get(subsystemId) ?? 0;
    entry.attemptCounts.set(subsystemId, attempts + 1);
    entry.lastRunAt.set(subsystemId, this.now(`${strategy.name}:${subsystemId}:execute`));

    try {
      const result = await strategy.run(subsystemId, snapshot, signature);
      if (result.success) {
        // Reset attempt count on success
        entry.attemptCounts.set(subsystemId, 0);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        strategyName: strategy.name,
        message: `Strategy threw: ${(error as Error).message}`,
        durationMs: 0,
        sideEffects: ["strategy_exception"],
        serviceable: false,
      };
    }
  }

  /**
   * Reset attempt counts for a subsystem (e.g. after full recovery).
   */
  resetAttempts(subsystemId: string): void {
    for (const entry of this.strategies.values()) {
      entry.attemptCounts.set(subsystemId, 0);
    }
  }

  /**
   * Reset all attempt counts across all subsystems.
   */
  resetAllAttempts(): void {
    for (const entry of this.strategies.values()) {
      entry.attemptCounts.clear();
      entry.lastRunAt.clear();
    }
  }

  /**
   * Get a strategy by name.
   */
  get(name: string): HealingStrategy | undefined {
    return this.strategies.get(name)?.strategy;
  }

  /**
   * List all registered strategy names.
   */
  list(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get attempt count for a specific strategy+subsystem.
   */
  getAttemptCount(strategyName: string, subsystemId: string): number {
    return this.strategies.get(strategyName)?.attemptCounts.get(subsystemId) ?? 0;
  }
}
