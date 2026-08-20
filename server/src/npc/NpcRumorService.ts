/**
 * NPC RUMOR SERVICE
 *
 * Server-authoritative rumor propagation system.
 * Handles deterministic rumor creation and spreading between NPCs.
 *
 * Determinism rules:
 * - No Date.now() for gameplay state
 * - No Math.random() for rumor spread
 * - Rumors propagate only on explicit server tick/action processing
 * - All IDs are deterministic based on input values
 * - Rumor propagation is deterministic and idempotent
 */

import {
  type NpcRumor,
  type NpcRumorKind,
  type NpcRumorSnapshot,
  type MemoryResult,
  type NpcMemoryEvent,
  MemoryFailReasons,
  generateRumorId,
  getRumorKindAccent,
} from "./NpcRumorTypes.js";
import { npcMemoryStore } from "./NpcMemoryStore.js";
import { npcMemoryService } from "./NpcMemoryService.js";

/**
 * Rumor weight constants for deterministic calculation.
 */
const RUMOR_WEIGHTS: Record<NpcRumorKind, number> = {
  helped_village: 2,
  reliable_supplier: 2,
  trusted_worker: 3,
  troublemaker: -1,
  hostile_actor: -2,
};

/**
 * Rumor notes for each kind.
 */
const RUMOR_NOTES: Record<NpcRumorKind, string> = {
  helped_village: "A valued helper to the village community",
  reliable_supplier: "Consistent and trustworthy in trade",
  trusted_worker: "Proven reliable over time",
  troublemaker: "Has caused issues in interactions",
  hostile_actor: "Has shown hostile behavior",
};

/**
 * Rumor propagation result.
 */
export interface RumorPropagationResult {
  rumorId: string;
  sourceNpcId: string;
  targetNpcId: string;
  playerId: string;
  propagated: boolean;
}

/**
 * NPC Rumor Service - manages rumor records and propagation.
 * Singleton pattern with server-authoritative state.
 */
export class NpcRumorService {
  private readonly store: typeof npcMemoryStore;

  constructor(store: typeof npcMemoryStore = npcMemoryStore) {
    this.store = store;
  }

  /**
   * Create a rumor from a memory event.
   * Returns error if rumor already exists (duplicate rejection).
   */
  async createRumorFromMemory(
    playerId: string,
    sourceNpcId: string,
    sourceEventId: string,
    kind: NpcRumorKind,
  ): Promise<MemoryResult<NpcRumor>> {
    if (!playerId) {
      return { ok: false, reason: MemoryFailReasons.MISSING_PLAYER };
    }

    if (!sourceNpcId) {
      return { ok: false, reason: MemoryFailReasons.MISSING_NPC };
    }

    // Generate deterministic rumor ID
    const rumorId = generateRumorId(sourceNpcId, playerId, sourceEventId);

    // Check if already exists
    const exists = await this.store.hasRumor(rumorId, playerId);
    if (exists) {
      return { ok: false, reason: MemoryFailReasons.DUPLICATE_RUMOR };
    }

    // Get weight for this rumor kind
    const weight = RUMOR_WEIGHTS[kind] ?? 1;

    // Create rumor record
    const rumor: NpcRumor = {
      rumorId,
      sourceNpcId,
      playerId,
      sourceEventId,
      kind,
      weight,
      createdAtTick: 0, // Will be set during propagation
      heardByNpcIds: [sourceNpcId], // Source NPC knows the rumor initially
      note: RUMOR_NOTES[kind],
    };

    // Save rumor
    try {
      await this.store.saveRumor(rumor);
    } catch (error) {
      console.error("[NpcRumorService] Failed to save rumor:", error);
      return { ok: false, reason: MemoryFailReasons.PERSISTENCE_SAVE_FAILED };
    }

    // Update source NPC's known rumor IDs in their memory state
    const sourceState = await this.store.load(playerId, sourceNpcId);
    if (sourceState) {
      const updatedState = {
        ...sourceState,
        knownRumorIds: [...sourceState.knownRumorIds, rumorId],
      };
      await this.store.save(updatedState);
    }

    return { ok: true, result: rumor };
  }

  /**
   * Propagate a rumor to eligible NPCs.
   * Deterministic: uses explicit tick processing, not random spread.
   */
  async propagateRumor(
    playerId: string,
    rumorId: string,
    currentTick: number,
  ): Promise<MemoryResult<RumorPropagationResult[]>> {
    if (!playerId) {
      return { ok: false, reason: MemoryFailReasons.MISSING_PLAYER };
    }

    if (!rumorId) {
      return { ok: false, reason: MemoryFailReasons.MISSING_RUMOR };
    }

    // Get all rumors for player
    const rumors = await this.store.loadRumorsForPlayer(playerId);
    const rumor = rumors.find((r) => r.rumorId === rumorId);

    if (!rumor) {
      return { ok: false, reason: MemoryFailReasons.MISSING_RUMOR };
    }

    // Get eligible targets
    const eligibleTargets = npcMemoryService.getEligibleRumorTargets(rumor.sourceNpcId);

    // Filter out already-aware NPCs
    const newTargets = eligibleTargets.filter(
      (targetId) => !rumor.heardByNpcIds.includes(targetId),
    );

    if (newTargets.length === 0) {
      // No new targets, rumor is fully propagated
      return {
        ok: true,
        result: [{
          rumorId,
          sourceNpcId: rumor.sourceNpcId,
          targetNpcId: rumor.sourceNpcId,
          playerId,
          propagated: false,
        }],
      };
    }

    // Update rumor with new listeners
    const updatedRumor: NpcRumor = {
      ...rumor,
      createdAtTick: currentTick,
      heardByNpcIds: [...rumor.heardByNpcIds, ...newTargets],
    };

    // Save updated rumor
    try {
      await this.store.saveRumor(updatedRumor);
    } catch (error) {
      console.error("[NpcRumorService] Failed to propagate rumor:", error);
      return { ok: false, reason: MemoryFailReasons.PERSISTENCE_SAVE_FAILED };
    }

    // Record rumor_heard memory events for each new target
    for (const targetNpcId of newTargets) {
      await npcMemoryService.recordRumorHeard(playerId, targetNpcId, rumor.sourceNpcId, rumorId);

      // Update target NPC's known rumor IDs
      const targetState = await this.store.load(playerId, targetNpcId);
      if (targetState) {
        const updatedTargetState = {
          ...targetState,
          knownRumorIds: [...targetState.knownRumorIds, rumorId],
        };
        await this.store.save(updatedTargetState);
      }
    }

    const results: RumorPropagationResult[] = newTargets.map((targetNpcId) => ({
      rumorId,
      sourceNpcId: rumor.sourceNpcId,
      targetNpcId,
      playerId,
      propagated: true,
    }));

    return { ok: true, result: results };
  }

  /**
   * Get all rumors for a player.
   */
  async getRumorsForPlayer(playerId: string): Promise<readonly NpcRumor[]> {
    return this.store.loadRumorsForPlayer(playerId);
  }

  /**
   * Get rumors known by a specific NPC.
   */
  async getRumorsForNpc(npcId: string, playerId: string): Promise<readonly NpcRumor[]> {
    return this.store.getRumorsForNpc(npcId, playerId);
  }

  /**
   * Get rumor snapshots for display.
   */
  async getRumorSnapshots(playerId: string): Promise<readonly NpcRumorSnapshot[]> {
    const rumors = await this.store.loadRumorsForPlayer(playerId);

    return rumors.map((rumor) => ({
      rumorId: rumor.rumorId,
      npcId: rumor.sourceNpcId,
      playerId: rumor.playerId,
      kind: rumor.kind,
      weight: rumor.weight,
      note: rumor.note,
      sourceNpcId: rumor.sourceNpcId,
    }))
    // Bolt: Optimization - Direct string comparison is significantly faster than localeCompare
    .sort((a, b) => (a.rumorId < b.rumorId ? -1 : a.rumorId > b.rumorId ? 1 : 0));
  }

  /**
   * Get rumors for a specific NPC that affect the player's reputation.
   */
  async getNpcRumorInfluence(npcId: string, playerId: string): Promise<{
    totalWeight: number;
    rumors: readonly NpcRumorSnapshot[];
  }> {
    const rumors = await this.getRumorsForNpc(npcId, playerId);
    const totalWeight = rumors.reduce((sum, r) => sum + r.weight, 0);

    const snapshots: NpcRumorSnapshot[] = rumors.map((r) => ({
      rumorId: r.rumorId,
      npcId: r.sourceNpcId,
      playerId: r.playerId,
      kind: r.kind,
      weight: r.weight,
      note: r.note,
      sourceNpcId: r.sourceNpcId,
    }));

    return {
      totalWeight,
      rumors: Object.freeze(snapshots),
    };
  }

  /**
   * Check if a rumor exists.
   */
  async hasRumor(rumorId: string, playerId: string): Promise<boolean> {
    return this.store.hasRumor(rumorId, playerId);
  }

  /**
   * Process all pending rumors for a player.
   * Call this on server tick or action processing.
   */
  async processPendingRumors(playerId: string, currentTick: number): Promise<{
    processedCount: number;
    propagationResults: RumorPropagationResult[];
  }> {
    const rumors = await this.store.loadRumorsForPlayer(playerId);
    const results: RumorPropagationResult[] = [];
    let processedCount = 0;

    for (const rumor of rumors) {
      // Only process if not fully propagated (has new targets)
      const eligibleTargets = npcMemoryService.getEligibleRumorTargets(rumor.sourceNpcId);
      const newTargets = eligibleTargets.filter(
        (targetId) => !rumor.heardByNpcIds.includes(targetId),
      );

      if (newTargets.length > 0) {
        const propagationResult = await this.propagateRumor(playerId, rumor.rumorId, currentTick);
        if (propagationResult.ok) {
          results.push(...propagationResult.result);
          processedCount++;
        }
      }
    }

    return { processedCount, propagationResults: results };
  }

  /**
   * Reset rumors for a player (for testing).
   */
  async resetPlayerRumors(playerId: string): Promise<void> {
    // Rumors are stored in the memory store, reset happens at store level
    // This method is here for API completeness
  }
}

/**
 * Global singleton instance.
 */
export const npcRumorService = new NpcRumorService();