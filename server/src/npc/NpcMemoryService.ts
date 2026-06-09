/**
 * NPC MEMORY SERVICE
 *
 * Server-authoritative NPC memory management.
 * Handles memory event recording, retrieval, and persistence.
 *
 * Determinism rules:
 * - No Date.now() for gameplay state
 * - No Math.random() for gameplay IDs
 * - All IDs are deterministic based on input values
 * - Memory events are immutable once recorded
 * - Client-authoritative memory writes are rejected
 */

import {
  type NpcMemoryEvent,
  type PersistedNpcMemoryState,
  type NpcMemorySnapshot,
  type NpcRumor,
  type NpcRumorKind,
  type MemoryResult,
  type NpcMemoryEventKind,
  MemoryFailReasons,
  generateMemoryEventId,
  reputationToTrustTier,
  calculateEffectiveReputation,
  getTrustTierCssClass,
} from "./NpcRumorTypes.js";
import { npcMemoryStore } from "./NpcMemoryStore.js";

/**
 * NPC definition with position for proximity checks.
 */
interface NpcDefinition {
  id: string;
  displayName: string;
  x: number;
  y: number;
  interactionRadius: number;
  /** Social links to other NPCs (for rumor propagation) */
  socialLinks?: readonly string[];
}

/**
 * NPC registry with known NPCs.
 */
const NPC_REGISTRY = new Map<string, NpcDefinition>([
  ["village_trader_001", {
    id: "village_trader_001",
    displayName: "Mira the Quartermaster",
    x: 462,
    y: 503,
    interactionRadius: 32,
    socialLinks: ["village_elder_001", "outpost_guard_001"],
  }],
  ["village_elder_001", {
    id: "village_elder_001",
    displayName: "Elder Thorne",
    x: 458,
    y: 498,
    interactionRadius: 28,
    socialLinks: ["village_trader_001", "outpost_guard_001"],
  }],
  ["outpost_guard_001", {
    id: "outpost_guard_001",
    displayName: "Captain Roderick",
    x: 520,
    y: 510,
    interactionRadius: 28,
    socialLinks: ["village_trader_001", "village_elder_001"],
  }],
]);

/**
 * Memory event counter for deterministic logical indices.
 * Key: `${playerId}:${npcId}`, Value: next logical index
 */
const memoryEventCounters = new Map<string, number>();

/**
 * Get next deterministic logical index for a player-NPC pair.
 */
function getNextLogicalIndex(playerId: string, npcId: string): number {
  const key = `${playerId}:${npcId}`;
  const current = memoryEventCounters.get(key) ?? 0;
  memoryEventCounters.set(key, current + 1);
  return current;
}

/**
 * Calculate distance between two points.
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * NPC Memory Service - manages memory events for all players.
 * Singleton pattern with server-authoritative state.
 */
export class NpcMemoryService {
  private readonly store: typeof npcMemoryStore;

  constructor(store: typeof npcMemoryStore = npcMemoryStore) {
    this.store = store;
  }

  /**
   * Get NPC definition by ID.
   */
  getNpcDefinition(npcId: string): NpcDefinition | undefined {
    return NPC_REGISTRY.get(npcId);
  }

  /**
   * Check if player is within interaction radius of NPC.
   */
  isPlayerNearNpc(playerX: number, playerY: number, npcId: string): boolean {
    const npc = NPC_REGISTRY.get(npcId);
    if (!npc) return false;

    const distance = calculateDistance(playerX, playerY, npc.x, npc.y);
    return distance <= npc.interactionRadius;
  }

  /**
   * Record a memory event for a player-NPC interaction.
   * Returns error if event already exists (duplicate rejection).
   */
  async recordMemoryEvent(
    playerId: string,
    npcId: string,
    kind: NpcMemoryEventKind,
    sourceId: string,
    reputationDelta: number,
    note: string,
  ): Promise<MemoryResult<NpcMemoryEvent>> {
    if (!playerId) {
      return { ok: false, reason: MemoryFailReasons.MISSING_PLAYER };
    }

    if (!npcId) {
      return { ok: false, reason: MemoryFailReasons.MISSING_NPC };
    }

    // Check if NPC exists
    if (!NPC_REGISTRY.has(npcId)) {
      return { ok: false, reason: MemoryFailReasons.MISSING_NPC };
    }

    // Get deterministic logical index
    const logicalIndex = getNextLogicalIndex(playerId, npcId);

    // Generate deterministic event ID
    const eventId = generateMemoryEventId(npcId, playerId, kind, logicalIndex, sourceId);

    // Check for duplicate
    const exists = await this.store.hasMemoryEvent(eventId, playerId, npcId);
    if (exists) {
      return { ok: false, reason: MemoryFailReasons.DUPLICATE_MEMORY_EVENT };
    }

    // Load current state or create new
    let state = await this.store.load(playerId, npcId);
    if (!state) {
      state = {
        schemaVersion: 1,
        playerId,
        npcId,
        reputation: 0,
        trustTier: "neutral",
        completedQuestIds: [],
        memoryEvents: [],
        knownRumorIds: [],
      };
    }

    // Create new event
    const event: NpcMemoryEvent = {
      eventId,
      npcId,
      playerId,
      kind,
      logicalIndex,
      sourceId,
      reputationDelta,
      note,
    };

    // Calculate new reputation
    const newReputation = state.reputation + reputationDelta;

    // Update state
    const updatedState: PersistedNpcMemoryState = {
      ...state,
      reputation: newReputation,
      trustTier: reputationToTrustTier(newReputation),
      memoryEvents: [...state.memoryEvents, event],
    };

    // Save atomically
    try {
      await this.store.save(updatedState);
    } catch (error) {
      console.error("[NpcMemoryService] Failed to save memory event:", error);
      return { ok: false, reason: MemoryFailReasons.PERSISTENCE_SAVE_FAILED };
    }

    return { ok: true, result: event };
  }

  /**
   * Record a quest_accepted memory event.
   */
  async recordQuestAccepted(
    playerId: string,
    npcId: string,
    questId: string,
  ): Promise<MemoryResult<NpcMemoryEvent>> {
    return this.recordMemoryEvent(
      playerId,
      npcId,
      "quest_accepted",
      questId,
      0, // No reputation change for accepting
      `Accepted quest: ${questId}`,
    );
  }

  /**
   * Record a quest_completed memory event.
   * Also triggers helped_village rumor creation.
   */
  async recordQuestCompleted(
    playerId: string,
    npcId: string,
    questId: string,
    reputationDelta: number,
  ): Promise<MemoryResult<NpcMemoryEvent>> {
    const result = await this.recordMemoryEvent(
      playerId,
      npcId,
      "quest_completed",
      questId,
      reputationDelta,
      `Completed quest: ${questId}`,
    );

    // Trigger rumor creation if event was recorded
    if (result.ok && result.result) {
      // Queue rumor creation (will be processed by rumor service)
      const { npcRumorService } = await import("./NpcRumorService.js");
      await npcRumorService.createRumorFromMemory(playerId, npcId, result.result.eventId, "helped_village");
    }

    return result;
  }

  /**
   * Record a sell_completed memory event.
   * Tracks sell milestones for reliable_supplier rumor.
   */
  async recordSellCompleted(
    playerId: string,
    npcId: string,
    itemId: string,
    quantity: number,
  ): Promise<MemoryResult<NpcMemoryEvent>> {
    const result = await this.recordMemoryEvent(
      playerId,
      npcId,
      "sell_completed",
      itemId,
      0, // Small reputation from trades
      `Sold ${quantity}x ${itemId}`,
    );

    // Check sell milestone for rumor (5 valid sells = reliable_supplier)
    if (result.ok) {
      const state = await this.store.load(playerId, npcId);
      if (state) {
        const sellCount = state.memoryEvents.filter(
          (e) => e.kind === "sell_completed" && e.sourceId === itemId,
        ).length;

        // At milestone, create reliable_supplier rumor
        if (sellCount === 5) {
          const { npcRumorService } = await import("./NpcRumorService.js");
          await npcRumorService.createRumorFromMemory(playerId, npcId, result.result.eventId, "reliable_supplier");
        }
      }
    }

    return result;
  }

  /**
   * Record a hostile_action memory event.
   * Triggers hostile_actor rumor creation.
   */
  async recordHostileAction(
    playerId: string,
    npcId: string,
    sourceId: string,
  ): Promise<MemoryResult<NpcMemoryEvent>> {
    const result = await this.recordMemoryEvent(
      playerId,
      npcId,
      "hostile_action",
      sourceId,
      -2, // Reputation penalty
      `Hostile action: ${sourceId}`,
    );

    // Trigger hostile_actor rumor
    if (result.ok && result.result) {
      const { npcRumorService } = await import("./NpcRumorService.js");
      await npcRumorService.createRumorFromMemory(playerId, npcId, result.result.eventId, "hostile_actor");
    }

    return result;
  }

  /**
   * Record an interaction_failed memory event.
   * Triggers troublemaker rumor after repeated failures.
   */
  async recordInteractionFailed(
    playerId: string,
    npcId: string,
    action: string,
  ): Promise<MemoryResult<NpcMemoryEvent>> {
    const result = await this.recordMemoryEvent(
      playerId,
      npcId,
      "interaction_failed",
      action,
      -1, // Small reputation penalty
      `Failed interaction: ${action}`,
    );

    // Check for repeated failures (3+) for troublemaker rumor
    if (result.ok) {
      const state = await this.store.load(playerId, npcId);
      if (state) {
        const failCount = state.memoryEvents.filter((e) => e.kind === "interaction_failed").length;

        if (failCount >= 3) {
          const { npcRumorService } = await import("./NpcRumorService.js");
          await npcRumorService.createRumorFromMemory(playerId, npcId, result.result.eventId, "troublemaker");
        }
      }
    }

    return result;
  }

  /**
   * Record a rumor_heard memory event.
   */
  async recordRumorHeard(
    playerId: string,
    npcId: string,
    sourceNpcId: string,
    rumorId: string,
  ): Promise<MemoryResult<NpcMemoryEvent>> {
    return this.recordMemoryEvent(
      playerId,
      npcId,
      "rumor_heard",
      rumorId,
      0, // No direct reputation change from hearing rumors
      `Heard rumor from ${sourceNpcId}: ${rumorId}`,
    );
  }

  /**
   * Get memory snapshot for a player-NPC pair.
   */
  async getMemorySnapshot(playerId: string, npcId: string): Promise<NpcMemorySnapshot | null> {
    const state = await this.store.load(playerId, npcId);
    if (!state) return null;

    // Get recent memory notes (last 5)
    const recentEvents = [...state.memoryEvents]
      .sort((a, b) => b.logicalIndex - a.logicalIndex)
      .slice(0, 5);

    const recentMemoryNotes = recentEvents.map((e) => e.note);

    // Get rumor count
    const rumors = await this.store.getRumorsForNpc(npcId, playerId);

    return {
      npcId,
      playerId,
      reputation: state.reputation,
      trustTier: state.trustTier,
      memoryEventCount: state.memoryEvents.length,
      recentMemoryNotes: Object.freeze(recentMemoryNotes),
      knownRumorCount: rumors.length,
    };
  }

  /**
   * Get all memory snapshots for a player.
   */
  async getAllMemorySnapshots(playerId: string): Promise<readonly NpcMemorySnapshot[]> {
    const states = await this.store.listForPlayer(playerId);
    const snapshots: NpcMemorySnapshot[] = [];

    for (const state of states) {
      const snapshot = await this.getMemorySnapshot(state.playerId, state.npcId);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return Object.freeze(snapshots.sort((a, b) => a.npcId.localeCompare(b.npcId)));
  }

  /**
   * Get persisted memory state for a player-NPC pair.
   */
  async getMemoryState(playerId: string, npcId: string): Promise<PersistedNpcMemoryState | null> {
    return this.store.load(playerId, npcId);
  }

  /**
   * Get effective trust calculation for a player-NPC pair.
   * Combines direct reputation with rumor influence.
   */
  async getEffectiveTrust(playerId: string, npcId: string): Promise<{
    directReputation: number;
    rumorBonus: number;
    effectiveReputation: number;
    trustTier: string;
  } | null> {
    const state = await this.store.load(playerId, npcId);
    if (!state) {
      return {
        directReputation: 0,
        rumorBonus: 0,
        effectiveReputation: 0,
        trustTier: "neutral",
      };
    }

    // Calculate rumor bonus from known rumors
    const rumors = await this.store.getRumorsForNpc(npcId, playerId);
    const totalRumorWeight = rumors.reduce((sum, r) => sum + r.weight, 0);
    const rumorBonus = Math.trunc(totalRumorWeight / 2);
    const effectiveReputation = calculateEffectiveReputation(state.reputation, totalRumorWeight);

    return {
      directReputation: state.reputation,
      rumorBonus,
      effectiveReputation,
      trustTier: reputationToTrustTier(effectiveReputation),
    };
  }

  /**
   * Get eligible NPCs for rumor propagation.
   * Uses deterministic rules: same settlement, social edge, or vendor/quest NPC.
   */
  getEligibleRumorTargets(sourceNpcId: string): readonly string[] {
    const sourceNpc = NPC_REGISTRY.get(sourceNpcId);
    if (!sourceNpc) return [];

    // Collect eligible targets
    const eligible = new Set<string>();

    // 1. Same settlement - check by proximity to village center
    const villageCenterX = 462;
    const villageCenterY = 503;
    const settlementRadius = 80;

    for (const [npcId, npc] of NPC_REGISTRY) {
      if (npcId === sourceNpcId) continue;

      const distance = calculateDistance(npc.x, npc.y, villageCenterX, villageCenterY);
      if (distance <= settlementRadius) {
        eligible.add(npcId);
      }
    }

    // 2. Social links
    if (sourceNpc.socialLinks) {
      for (const linkedNpcId of sourceNpc.socialLinks) {
        eligible.add(linkedNpcId);
      }
    }

    // 3. Vendor/quest NPCs in the same village
    for (const [npcId, npc] of NPC_REGISTRY) {
      if (npcId === sourceNpcId) continue;

      // Check if within same village (within 100 units of village center)
      const distance = calculateDistance(npc.x, npc.y, villageCenterX, villageCenterY);
      if (distance <= 100) {
        eligible.add(npcId);
      }
    }

    return Object.freeze([...eligible].sort());
  }

  /**
   * Reset memory for a player (for testing).
   */
  async resetPlayerMemory(playerId: string): Promise<void> {
    const states = await this.store.listForPlayer(playerId);
    for (const state of states) {
      const resetState: PersistedNpcMemoryState = {
        ...state,
        reputation: 0,
        trustTier: "neutral",
        memoryEvents: [],
        knownRumorIds: [],
      };
      await this.store.save(resetState);
    }
  }
}

/**
 * Global singleton instance.
 */
export const npcMemoryService = new NpcMemoryService();