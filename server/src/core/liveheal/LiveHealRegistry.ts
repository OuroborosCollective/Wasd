// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
/**
 * LiveHeal v2 - Subsystem Registry
 *
 * Central registry of all monitored subsystems.
 * Provides adapter registration, health snapshot collection,
 * and state machine management per subsystem.
 */

import type {
  SubSystemAdapter,
  SubSystemRecord,
  HealthSnapshot,
  SubSystemState,
} from "./LiveHealTypes.js";
import {
  createStateMachine,
  type SubSystemStateMachine,
} from "./LiveHealStateMachine.js";

export class LiveHealRegistry {
  private readonly adapters = new Map<string, SubSystemAdapter>();
  private readonly stateMachines = new Map<string, SubSystemStateMachine>();
  private readonly records = new Map<string, SubSystemRecord>();

  /**
   * Register a subsystem adapter for monitoring.
   */
  register(adapter: SubSystemAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Subsystem "${adapter.id}" is already registered.`);
    }
    this.adapters.set(adapter.id, adapter);
    this.stateMachines.set(adapter.id, createStateMachine(adapter.id));
    this.records.set(adapter.id, this.createRecord(adapter.id));
  }

  /**
   * Unregister a subsystem.
   */
  unregister(id: string): void {
    this.adapters.delete(id);
    this.stateMachines.delete(id);
    this.records.delete(id);
  }

  /**
   * Get adapter by id.
   */
  getAdapter(id: string): SubSystemAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * Get state machine by id.
   */
  getStateMachine(id: string): SubSystemStateMachine | undefined {
    return this.stateMachines.get(id);
  }

  /**
   * Get record by id.
   */
  getRecord(id: string): SubSystemRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Get all registered subsystem ids.
   */
  getIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all adapters.
   */
  getAllAdapters(): SubSystemAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all records.
   */
  getAllRecords(): Map<string, SubSystemRecord> {
    return new Map(this.records);
  }

  /**
   * Collect health snapshots from all adapters.
   * Returns a map of subsystem id -> snapshot.
   */
  async collectAllSnapshots(): Promise<Map<string, HealthSnapshot>> {
    const results = new Map<string, HealthSnapshot>();
    const promises = Array.from(this.adapters.entries()).map(async ([id, adapter]) => {
      try {
        const snapshot = await adapter.getHealthSnapshot();
        results.set(id, snapshot);
      } catch (error) {
        // If the adapter itself throws, create a critical snapshot
        results.set(id, {
          ok: false,
          status: "critical",
          score: 0,
          errorCode: "adapter_error",
          symptomTags: ["adapter_exception"],
          metrics: {},
          details: { error: (error as Error).message },
          canServeReadOnly: false,
        });
      }
    });
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Update the record for a subsystem after a health check.
   */
  updateRecord(
    id: string,
    updates: Partial<Omit<SubSystemRecord, "id">>
  ): void {
    const record = this.records.get(id);
    if (!record) return;
    Object.assign(record, updates);
  }

  /**
   * Update the state in the record (synced from state machine).
   */
  syncRecordState(id: string): void {
    const sm = this.stateMachines.get(id);
    const record = this.records.get(id);
    if (!sm || !record) return;
    record.state = sm.state;
    record.previousState = sm.previousState;
    record.lastStateChangeAt = sm.lastTransitionAt;
  }

  /**
   * Check if a subsystem exists.
   */
  has(id: string): boolean {
    return this.adapters.has(id);
  }

  /**
   * Get the count of registered subsystems.
   */
  get size(): number {
    return this.adapters.size;
  }

  private createRecord(id: string): SubSystemRecord {
    return {
      id,
      state: "healthy",
      previousState: "healthy",
      lastSnapshot: null,
      lastStateChangeAt: Date.now(),
      healingAttempts: 0,
      lastHealingStartedAt: 0,
      lastHealingCompletedAt: 0,
      cooldownUntil: 0,
      consecutiveFailures: 0,
      totalFailures: 0,
      totalHeals: 0,
      lastError: null,
    };
  }
}
